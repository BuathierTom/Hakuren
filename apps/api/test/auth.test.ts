import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../src/app.js';
import { getAuthConfig } from '../src/auth/config.js';
import { createDiscordClient, discordProfile } from '../src/auth/discord.js';
import { challenge, hash, token, returnPath } from '../src/auth/security.js';
import { authConfig, cookieHeader, discordUser, memoryAuth } from './helpers/auth.js';

test('Discord login uses identify, a browser-bound one-use state and S256 PKCE', async () => {
  const memory = memoryAuth();
  let calls = 0;
  const app = buildApp({
    auth: {
      config: authConfig,
      repository: memory.repository,
      discord: {
        async identify(code, verifier) {
          calls++;
          assert.equal(code, 'discord-code');
          assert.equal(challenge(verifier), authorization.searchParams.get('code_challenge'));
          return discordUser;
        },
      },
    },
  });
  let authorization: URL;
  try {
    const start = await app.inject(
      '/api/auth/discord?returnTo=%2Fequipes%3Fpage%3D2%26detail%3D13',
    );
    assert.equal(start.statusCode, 302);
    authorization = new URL(String(start.headers.location));
    assert.equal(authorization.origin, 'https://discord.com');
    assert.equal(authorization.searchParams.get('scope'), 'identify');
    assert.equal(authorization.searchParams.get('code_challenge_method'), 'S256');
    assert.equal(
      authorization.searchParams.get('redirect_uri'),
      'http://localhost:5177/api/auth/discord/callback',
    );
    assert.doesNotMatch(String(start.headers.location), /secret|code_verifier/);
    const state = authorization.searchParams.get('state')!;
    assert(memory.states.has(hash(state)));
    assert(!memory.states.has(state));
    const binding = cookieHeader(start, 'hakuren_oauth');
    assert(binding);
    assert.match(String(start.headers['set-cookie']), /HttpOnly/);
    assert.match(String(start.headers['set-cookie']), /SameSite=Lax/);
    const path = `/api/auth/discord/callback?state=${state}&code=discord-code&iss=https%3A%2F%2Fdiscord.com`;
    const callback = await app.inject({ url: path, headers: { cookie: binding } });
    assert.equal(callback.statusCode, 302);
    assert.equal(callback.headers.location, 'http://localhost:5177/equipes?page=2&detail=13');
    const session = cookieHeader(callback, 'hakuren_session');
    assert(session);
    const raw = session.split('=')[1]!;
    assert(memory.sessions.has(hash(raw)));
    assert(!memory.sessions.has(raw));
    assert.equal(memory.states.size, 0);
    const me = await app.inject({ url: '/api/auth/session', headers: { cookie: session } });
    assert.equal(me.statusCode, 200);
    assert.deepEqual(me.json().user, { id: 1, ...discordUser });
    assert.equal(me.headers['cache-control'], 'no-store');
    assert.equal(me.json().configured, true);
    assert.doesNotMatch(me.body, /server-only|token|verifier/);
    const replay = await app.inject({ url: path, headers: { cookie: binding } });
    assert.match(String(replay.headers.location), /auth_error=expired/);
    assert.equal(calls, 1);
  } finally {
    await app.close();
  }
});
test('a callback from a different browser cannot consume the state or create a session', async () => {
  const memory = memoryAuth();
  let calls = 0;
  const app = buildApp({
    auth: {
      config: authConfig,
      repository: memory.repository,
      discord: {
        async identify() {
          calls++;
          return discordUser;
        },
      },
    },
  });
  try {
    const start = await app.inject('/api/auth/discord');
    const state = new URL(String(start.headers.location)).searchParams.get('state');
    const path = `/api/auth/discord/callback?code=test&state=${state}`;
    const rejected = await app.inject({
      url: path,
      headers: { cookie: `hakuren_oauth=${token()}` },
    });
    assert.match(String(rejected.headers.location), /auth_error=expired/);
    assert.equal(calls, 0);
    assert.equal(memory.sessions.size, 0);
    assert.equal(memory.states.size, 1);
    const accepted = await app.inject({
      url: path,
      headers: { cookie: cookieHeader(start, 'hakuren_oauth') },
    });
    assert(cookieHeader(accepted, 'hakuren_session'));
    assert.equal(calls, 1);
  } finally {
    await app.close();
  }
});
test('Discord cancellation and issuer mismatch keep account creation disabled and expose no provider details', async () => {
  const memory = memoryAuth();
  let calls = 0;
  const app = buildApp({
    auth: {
      config: authConfig,
      repository: memory.repository,
      discord: {
        async identify() {
          calls++;
          return discordUser;
        },
      },
    },
  });
  try {
    for (const query of [
      'error=access_denied&error_description=private-detail',
      'code=secret-code&iss=https%3A%2F%2Fevil.test',
    ]) {
      const start = await app.inject('/api/auth/discord?returnTo=%2Fjoueurs%3Fq%3DEvans');
      const state = new URL(String(start.headers.location)).searchParams.get('state');
      const response = await app.inject({
        url: `/api/auth/discord/callback?state=${state}&${query}`,
        headers: { cookie: cookieHeader(start, 'hakuren_oauth') },
      });
      assert.equal(response.statusCode, 302);
      assert.equal(new URL(String(response.headers.location)).pathname, '/joueurs');
      assert.doesNotMatch(String(response.headers.location), /private-detail|secret-code|evil/);
    }
    assert.equal(calls, 0);
    assert.equal(memory.users.size, 0);
  } finally {
    await app.close();
  }
});
test('unconfigured login and upstream errors provide recoverable first-party feedback', async () => {
  const absent = buildApp();
  const memory = memoryAuth();
  const failed = buildApp({
    auth: {
      config: authConfig,
      repository: memory.repository,
      discord: {
        async identify() {
          throw new Error('private token=server-only-test-secret');
        },
      },
    },
  });
  try {
    const status = await absent.inject('/api/auth/session');
    assert.equal(status.statusCode, 200);
    assert.equal(status.json().configured, false);
    assert.equal(status.json().user, null);
    const disabled = await absent.inject('/api/auth/discord');
    assert.match(String(disabled.headers.location), /auth_error=unconfigured/);
    const start = await failed.inject('/api/auth/discord');
    const state = new URL(String(start.headers.location)).searchParams.get('state');
    const callback = await failed.inject({
      url: `/api/auth/discord/callback?code=x&state=${state}`,
      headers: { cookie: cookieHeader(start, 'hakuren_oauth') },
    });
    assert.match(String(callback.headers.location), /auth_error=failed/);
    assert.doesNotMatch(
      callback.body + JSON.stringify(callback.headers),
      /server-only|private|token=/,
    );
    assert.equal(memory.users.size, 0);
  } finally {
    await absent.close();
    await failed.close();
  }
});
test('logout requires the application origin and revokes the server-side session', async () => {
  const memory = memoryAuth();
  const raw = token();
  await memory.repository.signIn(discordUser, hash(raw));
  const app = buildApp({ auth: { config: authConfig, repository: memory.repository } });
  try {
    for (const origin of [undefined, 'https://evil.test', 'null']) {
      const headers: Record<string, string> = { cookie: `hakuren_session=${raw}` };
      if (origin) headers.origin = origin;
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
        headers,
        payload: {},
      });
      assert.equal(response.statusCode, 403);
      assert(memory.sessions.has(hash(raw)));
    }
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { cookie: `hakuren_session=${raw}`, origin: authConfig.appUrl },
      payload: {},
    });
    assert.equal(response.statusCode, 204);
    assert.equal(memory.sessions.size, 0);
    assert.match(String(response.headers['set-cookie']), /Max-Age=0/);
    const me = await app.inject({
      url: '/api/auth/session',
      headers: { cookie: `hakuren_session=${raw}` },
    });
    assert.equal(me.json().user, null);
  } finally {
    await app.close();
  }
});
test('production cookies use Secure, HttpOnly and host-only cookie names', async () => {
  const config = getAuthConfig({
    NODE_ENV: 'production',
    APP_URL: 'https://hakuren.test',
    DISCORD_CLIENT_ID: authConfig.discord!.clientId,
    DISCORD_CLIENT_SECRET: 'production-test-secret',
  });
  const memory = memoryAuth();
  const app = buildApp({
    auth: {
      config,
      repository: memory.repository,
      discord: {
        async identify() {
          return discordUser;
        },
      },
    },
  });
  try {
    const start = await app.inject('/api/auth/discord');
    assert.match(String(start.headers['set-cookie']), /__Host-hakuren_oauth=/);
    assert.match(String(start.headers['set-cookie']), /Secure/);
    assert.doesNotMatch(String(start.headers['set-cookie']), /Domain=/);
    const state = new URL(String(start.headers.location)).searchParams.get('state');
    const response = await app.inject({
      url: `/api/auth/discord/callback?state=${state}&code=test`,
      headers: { cookie: cookieHeader(start, '__Host-hakuren_oauth') },
    });
    assert(cookieHeader(response, '__Host-hakuren_session'));
    assert.match(String(response.headers['set-cookie']), /HttpOnly/);
    assert.match(String(response.headers['set-cookie']), /Secure/);
  } finally {
    await app.close();
  }
});
test('Discord code exchange stays server-side and validates the identify response', async () => {
  const requests: { url: string; init: RequestInit | undefined }[] = [];
  const client = createDiscordClient(authConfig, async (input, init) => {
    requests.push({ url: String(input), init });
    return requests.length === 1
      ? Response.json({
          access_token: 'temporary-discord-token',
          token_type: 'Bearer',
          scope: 'identify',
          refresh_token: 'not-retained',
        })
      : Response.json({
          id: discordUser.discordId,
          username: 'Tester',
          global_name: discordUser.displayName,
          avatar: 'a_0123456789abcdef0123456789abcdef',
        });
  });
  const verifier = token();
  const profile = await client.identify('authorization-code', verifier);
  assert.equal(requests[0]?.url, 'https://discord.com/api/oauth2/token');
  const body = requests[0]!.init!.body as URLSearchParams;
  assert.equal(body.get('client_secret'), authConfig.discord!.clientSecret);
  assert.equal(body.get('code_verifier'), verifier);
  assert.equal(body.get('grant_type'), 'authorization_code');
  assert.equal(requests[0]!.init!.redirect, 'error');
  assert.equal(requests[1]?.url, 'https://discord.com/api/v10/users/@me');
  assert.equal(
    (requests[1]!.init!.headers as Record<string, string>).Authorization,
    'Bearer temporary-discord-token',
  );
  assert.equal(
    profile.avatarUrl,
    `https://cdn.discordapp.com/avatars/${discordUser.discordId}/a_0123456789abcdef0123456789abcdef.png?size=64`,
  );
  assert(!('access_token' in profile));
  assert.equal(
    discordProfile({
      id: discordUser.discordId,
      username: 'Tester',
      global_name: null,
      avatar: 'https://evil.test/avatar',
    }).avatarUrl,
    null,
  );
  for (const invalid of [
    null,
    { id: 1, username: 'Test' },
    { id: discordUser.discordId, username: 'Bot', bot: true },
  ])
    assert.throws(() => discordProfile(invalid));
});
test('unsafe return destinations and invalid deployment origins are rejected', () => {
  for (const value of [
    'https://evil.test',
    '//evil.test',
    '/\\evil.test',
    '/api/auth/discord',
    '/x\nheader',
  ])
    assert.equal(returnPath(value, authConfig.appUrl), '/');
  assert.equal(
    returnPath('/equipes?page=2&auth_error=failed#roster', authConfig.appUrl),
    '/equipes?page=2#roster',
  );
  assert.throws(() => getAuthConfig({ APP_URL: 'http://public.test' }), /HTTPS/);
  assert.throws(
    () => getAuthConfig({ NODE_ENV: 'production', APP_URL: 'http://localhost:5173' }),
    /HTTPS/,
  );
  assert.throws(() => getAuthConfig({ APP_URL: 'https://user:password@hakuren.test' }), /APP_URL/);
  assert.throws(() => getAuthConfig({ DISCORD_CLIENT_ID: 'not-an-id' }), /DISCORD_CLIENT_ID/);
});
