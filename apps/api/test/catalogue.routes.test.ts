import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../src/app.js';
import type { CatalogueRepository } from '../src/catalogue/repository.js';
import type { PlayerQuery } from '../../../shared/catalogue.js';

function repository(overrides: Partial<CatalogueRepository> = {}): CatalogueRepository {
  return {
    async filters() {
      return { works: [], rarities: [], counts: { players: 0, techniques: 0, appearances: 0 } };
    },
    async players(query) {
      return { items: [], total: 0, page: query.page ?? 1, limit: query.limit ?? 24, pages: 0 };
    },
    async player() {
      return null;
    },
    async techniques(query) {
      return { items: [], total: 0, page: query.page ?? 1, limit: query.limit ?? 24, pages: 0 };
    },
    async technique() {
      return null;
    },
    ...overrides,
  };
}

test('catalogue routes validate filters, coerce pagination and supply bounded defaults', async () => {
  let actual: PlayerQuery | undefined;
  const app = buildApp({
    catalogue: repository({
      async players(query) {
        actual = query;
        return { items: [], total: 0, pages: 0, page: query.page!, limit: query.limit! };
      },
    }),
  });
  try {
    const response = await app.inject(
      '/api/players?q=Byron&work=IE3&position=MF&element=forest&gender=male&style=justice&page=2',
    );
    assert.equal(response.statusCode, 200);
    assert.equal(response.headers['cache-control'], 'no-store');
    assert.deepEqual(
      { ...actual },
      {
        q: 'Byron',
        work: 'IE3',
        position: 'MF',
        element: 'forest',
        gender: 'male',
        style: 'justice',
        page: 2,
        limit: 24,
        sort: 'number',
      },
    );
    for (const query of [
      'limit=49',
      'page=0',
      'page=1.5',
      'position=FAKE',
      'element=ice',
      'gender=unknown',
      'style=invalid',
      'unexpected=true',
      'q=a&q=b',
      `q=${'x'.repeat(101)}`,
      'work=IE3%27%20OR%201=1',
    ]) {
      const invalid = await app.inject(`/api/players?${query}`);
      assert.equal(invalid.statusCode, 400, query);
      assert.equal(invalid.json().error, 'INVALID_REQUEST');
    }
    assert.equal((await app.inject('/api/techniques?category=fake')).statusCode, 400);
    assert.equal(
      (await app.inject('/api/techniques?category=unknown&element=void')).statusCode,
      200,
    );
  } finally {
    await app.close();
  }
});

test('detail routes distinguish an invalid ID from an absent or quarantined record', async () => {
  const app = buildApp({ catalogue: repository() });
  try {
    for (const root of ['players', 'techniques']) {
      assert.equal((await app.inject(`/api/${root}/0`)).statusCode, 400);
      assert.equal((await app.inject(`/api/${root}/not-a-number`)).statusCode, 400);
      const missing = await app.inject(`/api/${root}/123`);
      assert.equal(missing.statusCode, 404);
      assert.match(missing.json().message, /introuvable/);
    }
  } finally {
    await app.close();
  }
});

test('catalogue failures return a recoverable error without SQL or credentials', async () => {
  const app = buildApp({
    catalogue: repository({
      async filters() {
        throw new Error('private mysql://secret:password@server:3306/database SELECT payload');
      },
    }),
  });
  try {
    const response = await app.inject('/api/catalogue');
    assert.equal(response.statusCode, 503);
    assert.equal(response.json().error, 'CATALOGUE_UNAVAILABLE');
    assert.doesNotMatch(response.body, /private|mysql|password|SELECT/);
  } finally {
    await app.close();
  }
});

test('an unconfigured catalogue stays unavailable while health and unknown routes remain correct', async () => {
  const app = buildApp();
  try {
    assert.equal((await app.inject('/api/health')).statusCode, 200);
    assert.equal((await app.inject('/api/players')).statusCode, 503);
    assert.equal((await app.inject('/api/catalogue')).statusCode, 503);
    assert.equal((await app.inject('/api/unknown')).statusCode, 404);
  } finally {
    await app.close();
  }
});

test('equipment and tactic routes validate categories and pagination independently', async () => {
  const app = buildApp({
    catalogue: repository({
      async items(section, query) {
        return { items: [], total: 0, pages: 0, page: query.page ?? 1, limit: query.limit ?? 24 };
      },
      async item() {
        return null;
      },
    }),
  });
  try {
    assert.equal((await app.inject('/api/equipment?slot=boots&page=2')).statusCode, 200);
    assert.equal((await app.inject('/api/equipment?slot=invalid')).statusCode, 400);
    assert.equal((await app.inject('/api/tactics?slot=boots')).statusCode, 400);
    assert.equal((await app.inject('/api/tactics?limit=49')).statusCode, 400);
    assert.equal((await app.inject('/api/equipment/0')).statusCode, 400);
    assert.equal((await app.inject('/api/equipment/99')).statusCode, 404);
    assert.equal((await app.inject('/api/tactics/99')).statusCode, 404);
  } finally {
    await app.close();
  }
});
