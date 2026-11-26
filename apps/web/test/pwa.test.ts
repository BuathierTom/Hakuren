import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('the install manifest provides real PNG icons at the required sizes and starts in standalone mode', async () => {
  const manifest = JSON.parse(
    await readFile(new URL('../public/manifest.json', import.meta.url), 'utf8'),
  );
  assert.equal(manifest.name, 'Hakuren');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.scope, '/');
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.prefer_related_applications, false);
  for (const size of [192, 512]) {
    const icon = manifest.icons.find(
      (icon: { sizes: string; purpose: string }) =>
        icon.sizes === `${size}x${size}` && icon.purpose === 'any',
    );
    assert(icon);
    const data = await readFile(new URL('../public' + icon.src, import.meta.url));
    assert.equal(data.readUInt32BE(16), size);
    assert.equal(data.readUInt32BE(20), size);
  }
  const apple = await readFile(new URL('../public/icons/apple-touch-icon.png', import.meta.url));
  assert.equal(apple.readUInt32BE(16), 180);
});
test('installation supports Android prompts, iOS instructions and hides itself in standalone mode', async (t) => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  t.after(() => {
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else delete (globalThis as Record<string, unknown>).window;
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
  });
  for (const platform of ['android', 'ios', 'standalone']) {
    const media = Object.assign(new EventTarget(), { matches: platform === 'standalone' });
    const browser = Object.assign(new EventTarget(), { matchMedia: () => media });
    Object.defineProperty(globalThis, 'window', { configurable: true, value: browser });
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        userAgent: platform === 'ios' ? 'iPhone' : 'Android',
        platform: '',
        maxTouchPoints: 1,
      },
    });
    const api = await import(`../src/features/pwa/lib/installation.ts?platform=${platform}`);
    api.initializeInstallation();
    assert.equal(api.installationSnapshot().installed, platform === 'standalone');
    assert.equal(api.installationSnapshot().available, platform === 'ios');
    if (platform !== 'android') continue;
    let prompted = 0;
    const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt: async () => {
        prompted++;
      },
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    });
    browser.dispatchEvent(event);
    assert(event.defaultPrevented);
    assert(api.installationSnapshot().available);
    await api.installApp();
    assert.equal(prompted, 1);
    assert(api.installationSnapshot().installed);
    assert(!api.installationSnapshot().available);
    assert(!api.installationSnapshot().pending);
  }
});
