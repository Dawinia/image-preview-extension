import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const sharedSource = fs.readFileSync(new URL('../src/shared/core.js', import.meta.url), 'utf8');

const sandbox = {
  globalThis: {},
  console
};
sandbox.globalThis = sandbox;

vm.runInNewContext(sharedSource, sandbox, { filename: 'src/shared/core.js' });

const app = sandbox.ImagePreviewExtension;

assert.ok(app, 'shared core should expose ImagePreviewExtension');
assert.equal(app.MESSAGES.TOGGLE_LAST_PREVIEW, 'toggleLastPreview');
assert.equal(app.CLASSES.MODAL, 'ipe-modal');

assert.equal(app.hexToRgba('#336699', 0.5), 'rgba(51, 102, 153, 0.5)');
assert.equal(app.hexToRgba('bad-input', 0.5), 'rgba(0, 0, 0, 0.5)');

assert.equal(app.clamp(20, 1, 10), 10);
assert.equal(app.clamp(-1, 1, 10), 1);
assert.equal(app.clamp(5, 1, 10), 5);

assert.deepEqual(
  JSON.parse(
    JSON.stringify(
      app.normalizeSettings({
        backgroundColor: 'not-a-color',
        backgroundOpacity: 2,
        enablePreview: 'yes',
        enableKeyboardShortcuts: false,
        enableDoubleClickReset: undefined,
        maxScale: 999,
        scaleSpeed: 0.5
      })
    )
  ),
  {
    schemaVersion: 1,
    backgroundColor: '#000000',
    backgroundOpacity: 1,
    enablePreview: true,
    enableKeyboardShortcuts: false,
    enableDoubleClickReset: true,
    requireModifierKey: false,
    minimumImageSize: 64,
    maxScale: 20,
    scaleSpeed: 1.01
  }
);

assert.equal(
  app.buildTransform({ translateX: 12, translateY: -4, scale: 1.5 }),
  'translate(12px, -4px) scale(1.5)'
);
assert.equal(app.computeWheelScale(1, -2, { scaleSpeed: 1.5, maxScale: 20 }), 1.035);
assert.equal(app.computeWheelScale(1, -500, { scaleSpeed: 1.5, maxScale: 20 }), 1.12);
assert.equal(app.computeWheelScale(1, 500, { scaleSpeed: 1.5, maxScale: 20 }), 0.8928571428571428);
assert.equal(app.computeWheelScale(19.8, -500, { scaleSpeed: 1.5, maxScale: 20 }), 20);

assert.equal(
  app.mergeSettings({ ...app.DEFAULT_SETTINGS, enablePreview: false }, { maxScale: 8 })
    .enablePreview,
  false
);

assert.equal(app.normalizeSettings({}).schemaVersion, app.SETTINGS_SCHEMA_VERSION);
assert.equal(
  app.mergeSettings(
    { ...app.DEFAULT_SETTINGS, schemaVersion: 0, enablePreview: false },
    { maxScale: 8 }
  ).enablePreview,
  false
);

function createFakeImage({
  width = 120,
  height = 80,
  source = 'https://example.com/image.png',
  containerTag = null,
  role = null
} = {}) {
  const container = containerTag
    ? {
        tagName: containerTag.toUpperCase(),
        getAttribute(name) {
          return name === 'role' ? role : null;
        },
        closest() {
          return null;
        }
      }
    : null;

  return {
    tagName: 'IMG',
    naturalWidth: width,
    naturalHeight: height,
    currentSrc: source,
    src: source,
    closest(selector) {
      if (selector === 'a, button, input, textarea, select, [role="button"], [role="link"]') {
        return container;
      }
      return null;
    }
  };
}

assert.equal(app.shouldPreviewImage(createFakeImage(), { altKey: true }), true);
assert.equal(
  app.shouldPreviewImage(createFakeImage({ width: 24, height: 24 }), { altKey: true }),
  false
);
assert.equal(
  app.shouldPreviewImage(createFakeImage({ containerTag: 'a' }), { altKey: false }),
  true
);
assert.equal(
  app.shouldPreviewImage(createFakeImage({ containerTag: 'a' }), { altKey: true }),
  true
);
assert.equal(app.shouldPreviewImage(createFakeImage(), { altKey: false }), true);
assert.equal(
  app.shouldPreviewImage(createFakeImage(), { altKey: false }, { requireModifierKey: true }),
  false
);

console.log('unit tests passed');
