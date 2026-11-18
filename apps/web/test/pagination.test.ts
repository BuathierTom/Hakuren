import assert from 'node:assert/strict';
import test from 'node:test';
import { paginationEntries } from '../src/features/catalogue/lib/pagination.js';

test('short catalogues show every page and large catalogues retain both ends', () => {
  assert.deepEqual(paginationEntries(1, 0), []);
  assert.deepEqual(paginationEntries(1, 1), [1]);
  assert.deepEqual(paginationEntries(2, 3), [1, 2, 3]);
  assert.deepEqual(paginationEntries(1, 5), [1, 2, 3, 4, 5]);
  assert.deepEqual(paginationEntries(1, 228), [1, 2, 'end-gap', 227, 228]);
  assert.deepEqual(paginationEntries(114, 228), [1, 'start-gap', 114, 'end-gap', 228]);
  assert.deepEqual(paginationEntries(228, 228), [1, 2, 'end-gap', 227, 228]);
});

test('every page is reachable in a maximum of five slots without losing the current page', () => {
  for (let pages = 1; pages <= 250; pages++) {
    for (let page = 1; page <= pages; page++) {
      const entries = paginationEntries(page, pages);
      const numbers = entries.filter((entry) => typeof entry === 'number');
      assert(entries.length <= 5);
      assert(numbers.includes(page));
      assert.equal(numbers[0], 1);
      assert.equal(numbers.at(-1), pages);
      assert.deepEqual(
        numbers,
        [...new Set(numbers)].sort((a, b) => a - b),
      );
      for (const [index, entry] of entries.entries()) {
        if (typeof entry === 'number') continue;
        assert(Number(entries[index + 1]) - Number(entries[index - 1]) > 1);
      }
    }
  }
});
