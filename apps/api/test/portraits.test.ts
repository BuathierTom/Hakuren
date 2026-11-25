import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import { loadPortrait } from '../src/catalogue/portrait.js';
import { registerPortraitRoutes } from '../src/catalogue/portrait-routes.js';

const source = 'https://dxi4wb638ujep.cloudfront.net/1/player.webp';
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==',
  'base64',
);

test('portrait loading accepts the public image host and falls back from WebP to PNG', async () => {
  const requests: string[] = [];
  const image = await loadPortrait(source, async (input, options) => {
    const url = String(input);
    requests.push(url);
    assert.equal(options?.redirect, 'error');
    assert(options?.signal);
    return url.endsWith('.webp') ? new Response(null, { status: 404 }) : new Response(png);
  });
  assert.deepEqual(requests, [source, source.replace('.webp', '.png')]);
  assert.equal(image.contentType, 'image/png');
  assert.deepEqual(image.data, png);
});

test('portrait loading refuses arbitrary hosts, protocols, credentials and ports without requesting them', async () => {
  let requests = 0;
  const fetcher: typeof fetch = async () => {
    requests++;
    return new Response(png);
  };
  for (const url of [
    'http://127.0.0.1/private.png',
    'https://example.test/player.png',
    source.replace('https://', 'http://'),
    source.replace('https://', 'https://secret@'),
    source.replace('.net/', '.net:8443/'),
    source.replace('.webp', '.svg'),
    source.replace('.net', '.net.evil.test'),
  ])
    await assert.rejects(loadPortrait(url, fetcher));
  assert.equal(requests, 0);
});

test('portrait loading rejects redirects, non-image content and oversized bodies', async () => {
  for (const fetcher of [
    async () =>
      new Response(null, { status: 302, headers: { Location: 'http://127.0.0.1/private' } }),
    async () => new Response('<svg>not a raster portrait</svg>'),
    async () => new Response(png, { headers: { 'Content-Length': '2000000' } }),
    async () => new Response(new Uint8Array(1_048_577)),
  ])
    await assert.rejects(loadPortrait(source, fetcher));
});

test('portrait route uses the player identifier, returns binary images and caches successful loads', async () => {
  const app = Fastify();
  const ids: number[] = [];
  let requests = 0;
  registerPortraitRoutes(
    app,
    {
      portrait: async (id) => {
        ids.push(id);
        return source;
      },
    },
    async (url) => {
      assert.equal(url, source);
      requests++;
      return { data: png, contentType: 'image/png' };
    },
  );
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await app.inject(
        '/api/players/42/portrait?url=https://example.test/private',
      );
      assert.equal(response.statusCode, 200);
      assert.match(response.headers['content-type'] ?? '', /^image\/png/);
      assert.deepEqual(response.rawPayload, png);
    }
    assert.deepEqual(ids, [42, 42]);
    assert.equal(requests, 1);
    assert.equal((await app.inject('/api/players/0/portrait')).statusCode, 400);
    assert.equal((await app.inject('/api/players/not-a-player/portrait')).statusCode, 400);
  } finally {
    await app.close();
  }
});

test('portrait route reports absent and unavailable images without exposing upstream errors', async () => {
  for (const mode of ['absent', 'missing', 'unavailable'] as const) {
    const app = Fastify();
    registerPortraitRoutes(
      app,
      mode === 'absent'
        ? undefined
        : { portrait: async () => (mode === 'missing' ? null : source) },
      async () => {
        throw new Error('private upstream credentials');
      },
    );
    try {
      const response = await app.inject('/api/players/1/portrait');
      assert.equal(response.statusCode, mode === 'missing' ? 404 : 503);
      assert(!response.body.includes('credentials'));
    } finally {
      await app.close();
    }
  }
});
