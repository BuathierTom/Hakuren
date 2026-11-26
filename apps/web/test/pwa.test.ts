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
