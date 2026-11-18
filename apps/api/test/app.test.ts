import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../src/app.js';
import { getConfig } from '../src/config.js';

test('the API stays alive while MySQL is not configured', async () => {
  const app = buildApp();
  try {
    const health = await app.inject({ method: 'GET', url: '/api/health' });
    assert.equal(health.statusCode, 200);
    assert.deepEqual(health.json(), { status: 'ok', service: 'hakuren-api' });
    const ready = await app.inject({ method: 'GET', url: '/api/ready' });
    assert.equal(ready.statusCode, 503);
    assert.equal(ready.json().database, 'not-configured');
  } finally {
    await app.close();
  }
});

test('readiness reports a database outage without leaking the connection error', async () => {
  let closed = false;
  const app = buildApp({
    database: {
      async check() {
        throw new Error('private connection detail');
      },
      async close() {
        closed = true;
      },
    },
  });
  try {
    const response = await app.inject({ method: 'GET', url: '/api/ready' });
    assert.equal(response.statusCode, 503);
    assert.deepEqual(response.json(), { status: 'not-ready', database: 'unavailable' });
    assert.doesNotMatch(response.body, /private/);
  } finally {
    await app.close();
  }
  assert.equal(closed, true);
});

test('readiness succeeds when MySQL responds', async () => {
  const app = buildApp({ database: { async check() {}, async close() {} } });
  try {
    const response = await app.inject({ method: 'GET', url: '/api/ready' });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { status: 'ready', database: 'connected' });
  } finally {
    await app.close();
  }
});

test('configuration requires a MySQL database and valid API port', () => {
  assert.throws(() => getConfig({ API_PORT: '-1' }), /API_PORT/);
  assert.throws(() => getConfig({ API_PORT: '3001.5' }), /API_PORT/);
  assert.throws(() => getConfig({ DATABASE_URL: 'https://example.com' }), /DATABASE_URL/);
  assert.throws(
    () => getConfig({ DATABASE_URL: 'postgresql://user:password@localhost:5432/hakuren' }),
    /mysql:\/\//,
  );
  assert.throws(() => getConfig({ DATABASE_URL: 'mysql://localhost' }), /base MySQL/);
  assert.equal(
    getConfig({ DATABASE_URL: 'mysql://user:password@localhost:3306/hakuren' }).databaseUrl,
    'mysql://user:password@localhost:3306/hakuren',
  );
  assert.equal(getConfig({}).port, 3001);
  assert.equal(getConfig({ FRONT_PORT: '5174', API_PORT: '3002' }).port, 3002);
});
