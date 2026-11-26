import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import {
  DEFAULT_PREFERENCES,
  PREFERENCES_KEY,
  decodePreferences,
  readPreferences,
  resolvedTheme,
} from '../src/features/preferences/lib/preferences';
import { translate, locale } from '../src/features/preferences/lib/i18n';
import { english } from '../src/features/preferences/lib/messages/en';
import {
  initializePreferences,
  getPreferences,
  setPreferences,
  subscribePreferences,
} from '../src/features/preferences/preferences-store';

test('preferences default to French and system theme and recover from corrupt or unavailable storage', () => {
  assert.deepEqual(decodePreferences(null), DEFAULT_PREFERENCES);
  assert.deepEqual(decodePreferences({ language: 'de', theme: 'blue' }), DEFAULT_PREFERENCES);
  assert.deepEqual(decodePreferences({ language: 'en', theme: 'dark' }), {
    language: 'en',
    theme: 'dark',
  });
  assert.deepEqual(readPreferences({ getItem: () => '{bad' }), DEFAULT_PREFERENCES);
  assert.deepEqual(
    readPreferences({
      getItem() {
        throw new Error('blocked');
      },
    }),
    DEFAULT_PREFERENCES,
  );
  assert.deepEqual(
    readPreferences({ getItem: () => JSON.stringify({ language: 'en', theme: 'light' }) }),
    { language: 'en', theme: 'light' },
  );
  assert.equal(resolvedTheme('system', true), 'dark');
  assert.equal(resolvedTheme('system', false), 'light');
  assert.equal(resolvedTheme('light', true), 'light');
  assert.equal(resolvedTheme('dark', false), 'dark');
});
test('translations preserve user-supplied names and use only defined interpolation parameters', () => {
  assert.equal(translate('fr', 'Retirer {0} de {1}', 'Vent', 'Commun'), 'Retirer Vent de Commun');
  assert.equal(translate('en', 'Retirer {0} de {1}', 'Vent', 'Commun'), 'Remove Vent from Commun');
  assert.equal(translate('en', 'Unknown catalogue name'), 'Unknown catalogue name');
  assert.equal(translate('en', 'constructor'), 'constructor');
  assert.equal(translate('en', '__proto__'), '__proto__');
  assert.equal(
    translate('en', 'Ajouter un personnage : {0}', '<script>literal</script>'),
    'Add a character: <script>literal</script>',
  );
  for (const [source, target] of Object.entries(english)) {
    for (const parameter of target.matchAll(/\{\d+\}/g))
      assert(source.includes(parameter[0]), source);
  }
});
test('the early bootstrap applies saved choices before rendering and respects French as the first language', async () => {
  const script = await readFile(new URL('../public/preferences.js', import.meta.url), 'utf8');
  for (const [saved, systemDark, expectedLanguage, expectedTheme] of [
    [null, false, 'fr', 'light'],
    [null, true, 'fr', 'dark'],
    [{ language: 'en', theme: 'light' }, true, 'en', 'light'],
    [{ language: 'fr', theme: 'dark' }, false, 'fr', 'dark'],
    [{ language: 'xx', theme: 'invalid' }, true, 'fr', 'dark'],
  ] as const) {
    const root = {
      lang: '',
      dataset: {} as Record<string, string>,
      style: {} as Record<string, string>,
    };
    const meta: Record<string, string> = {};
    runInNewContext(script, {
      localStorage: { getItem: () => JSON.stringify(saved) },
      matchMedia: () => ({ matches: systemDark }),
      document: {
        documentElement: root,
        querySelector: () => ({
          setAttribute: (name: string, value: string) => {
            meta[name] = value;
          },
        }),
      },
      navigator: { language: 'en-US' },
    });
    assert.equal(root.lang, expectedLanguage);
    assert.equal(root.dataset.theme, expectedTheme);
    assert.equal(root.style.colorScheme, expectedTheme);
    assert.equal(meta.content, expectedTheme === 'dark' ? '#14222e' : '#087b9c');
  }
});
test('live preferences persist, follow system changes and synchronize across tabs without depending on storage writes', () => {
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const oldDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const events = new EventTarget();
  const media = Object.assign(new EventTarget(), { matches: false });
  const data = new Map<string, string>();
  let blocked = false;
  const root = {
    lang: '',
    dataset: {} as Record<string, string>,
    style: {} as Record<string, string>,
  };
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem(key: string, value: string) {
      if (blocked) throw new Error('blocked');
      data.set(key, value);
    },
  };
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      localStorage: storage,
      matchMedia: () => media,
      addEventListener: events.addEventListener.bind(events),
    },
  });
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { documentElement: root, querySelector: () => null },
  });
  let updates = 0;
  const unsubscribe = subscribePreferences(() => updates++);
  try {
    initializePreferences();
    assert.equal(root.lang, 'fr');
    setPreferences({ language: 'en', theme: 'dark' });
    assert.deepEqual(JSON.parse(data.get(PREFERENCES_KEY)!), { language: 'en', theme: 'dark' });
    assert.equal(locale(), 'en-GB');
    assert.equal(root.dataset.theme, 'dark');
    media.matches = false;
    media.dispatchEvent(new Event('change'));
    assert.equal(root.dataset.theme, 'dark');
    setPreferences({ theme: 'system' });
    assert.equal(root.dataset.theme, 'light');
    media.matches = true;
    media.dispatchEvent(new Event('change'));
    assert.equal(root.dataset.theme, 'dark');
    data.set(PREFERENCES_KEY, JSON.stringify({ language: 'fr', theme: 'light' }));
    events.dispatchEvent(Object.assign(new Event('storage'), { key: PREFERENCES_KEY }));
    assert.deepEqual(getPreferences(), { language: 'fr', theme: 'light' });
    assert.equal(locale(), 'fr-FR');
    blocked = true;
    assert.doesNotThrow(() => setPreferences({ theme: 'dark' }));
    assert.equal(root.dataset.theme, 'dark');
    assert(updates >= 4);
    setPreferences({ language: 'fr', theme: 'system' });
  } finally {
    unsubscribe();
    if (oldWindow) Object.defineProperty(globalThis, 'window', oldWindow);
    else Reflect.deleteProperty(globalThis, 'window');
    if (oldDocument) Object.defineProperty(globalThis, 'document', oldDocument);
    else Reflect.deleteProperty(globalThis, 'document');
  }
});
