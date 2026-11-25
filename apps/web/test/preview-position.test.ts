import assert from 'node:assert/strict';
import test from 'node:test';
import { popoverPosition } from '../src/components/ui/popover/popover-position.js';
import { previewPosition } from '../src/features/catalogue/lib/preview-position.js';

test('desktop previews sit beside the technique without covering the double-click target', () => {
  const size = { width: 360, height: 290 };
  const viewport = { width: 1280, height: 900 };
  assert.deepEqual(
    previewPosition({ left: 660, right: 1140, top: 450, bottom: 500 }, size, viewport),
    { left: 288, top: 330, side: 'left', arrowOffset: 145 },
  );
  assert.deepEqual(
    previewPosition({ left: 100, right: 300, top: 450, bottom: 500 }, size, viewport),
    { left: 312, top: 330, side: 'right', arrowOffset: 145 },
  );
});

test('mobile previews move above the row when there is insufficient space below', () => {
  const size = { width: 296, height: 260 };
  const viewport = { width: 320, height: 780 };
  assert.deepEqual(
    previewPosition({ left: 25, right: 295, top: 200, bottom: 250 }, size, viewport),
    { left: 12, top: 262, side: 'bottom', arrowOffset: 148 },
  );
  assert.deepEqual(
    previewPosition({ left: 25, right: 295, top: 680, bottom: 734 }, size, viewport),
    { left: 12, top: 408, side: 'top', arrowOffset: 148 },
  );
});

test('previews stay inside the viewport at every edge and screen size', () => {
  for (const width of [320, 390, 768, 1280]) {
    for (const height of [240, 480, 780, 1000]) {
      const size = { width: Math.min(360, width - 24), height: Math.min(300, height - 24) };
      const rowWidth = Math.min(200, width - 24);
      for (const left of [12, (width - rowWidth) / 2, width - rowWidth - 12]) {
        for (const top of [12, (height - 54) / 2, height - 66]) {
          const result = previewPosition(
            { left, right: left + rowWidth, top, bottom: top + 54 },
            size,
            { width, height },
          );
          const edgeLength =
            result.side === 'left' || result.side === 'right' ? size.height : size.width;
          assert(result.arrowOffset >= Math.min(18, edgeLength / 2));
          assert(result.arrowOffset <= edgeLength - Math.min(18, edgeLength / 2));
          assert(result.left >= 12);
          assert(result.top >= 12);
          assert(result.left + size.width <= width - 12);
          assert(result.top + size.height <= height - 12);
        }
      }
    }
  }
});

test('saved team menus open below their button even when there is space at either side', () => {
  const anchor = { left: 800, right: 940, top: 180, bottom: 220 };
  const result = popoverPosition(
    anchor,
    { width: 420, height: 300 },
    { width: 1440, height: 900 },
    'bottom',
  );
  assert.equal(result.side, 'bottom');
  assert.equal(result.top, 232);
  assert.equal(result.left, 800);
  assert(result.arrowOffset > 0 && result.arrowOffset < 420);
});

test('downward menus remain inside the viewport near the right edge and on mobile', () => {
  for (const width of [320, 390, 1366, 1920]) {
    const size = { width: Math.min(420, width - 24), height: 240 };
    const anchor = { left: width - 160, right: width - 20, top: 200, bottom: 240 };
    const result = popoverPosition(anchor, size, { width, height: 844 }, 'bottom');
    assert.equal(result.side, 'bottom');
    assert(result.top >= anchor.bottom);
    assert(result.left >= 12);
    assert(result.left + size.width <= width - 12);
  }
});
