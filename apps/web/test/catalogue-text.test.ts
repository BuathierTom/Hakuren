import assert from 'node:assert/strict';
import test from 'node:test';
import {
  catalogueName,
  catalogueDescription,
} from '../src/features/catalogue/lib/catalogue-text.ts';

test('catalogue text follows the chosen language without changing source values', () => {
  const entry = {
    name: 'Instant céleste',
    description: 'Texte français.',
    translations: {
      fr: { name: 'Instant céleste', description: 'Un texte\nfrançais.' },
      en: { name: "Heaven's Time", description: 'An English\\ndescription.' },
    },
  };
  assert.equal(catalogueName(entry, 'fr'), 'Instant céleste');
  assert.equal(catalogueName(entry, 'en'), "Heaven's Time");
  assert.equal(catalogueDescription(entry, 'fr'), 'Un texte français.');
  assert.equal(catalogueDescription(entry, 'en'), 'An English description.');
  assert.equal(entry.name, 'Instant céleste');
});
test('legacy entries and saved bilingual snapshots retain useful text', () => {
  assert.equal(catalogueName({ name: 'Mark Evans' }, 'en'), 'Mark Evans');
  assert.equal(catalogueDescription({ description: null }, 'en'), null);
  assert.equal(
    catalogueName({ name: 'Legacy name', names: { en: 'English name' } }, 'en'),
    'English name',
  );
  assert.equal(
    catalogueDescription({ description: 'Text\nwith   unnecessary whitespace.' }, 'en'),
    'Text with unnecessary whitespace.',
  );
});
