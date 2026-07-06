(function initImagePreviewExtension(global) {
  const SETTINGS_SCHEMA_VERSION = 1;
  const WHEEL_DELTA_UNIT = 100;
  const MIN_WHEEL_SCALE_STEP = 0.035;
  const MAX_WHEEL_SCALE_STEP = 0.12;

  const SETTINGS_LIMITS = Object.freeze({
    backgroundOpacity: { min: 0, max: 1 },
    maxScale: { min: 1, max: 20 },
    minimumImageSize: { min: 16, max: 256 },
    minScale: { min: 0.1, max: 1 },
    scaleSpeed: { min: 1.01, max: 1.5 }
  });

  const DEFAULT_SETTINGS = Object.freeze({
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    backgroundColor: '#000000',
    backgroundOpacity: 0.8,
    enablePreview: true,
    enableKeyboardShortcuts: true,
    enableDoubleClickReset: true,
    requireModifierKey: false,
    minimumImageSize: 64,
    maxScale: 10,
    scaleSpeed: 1.1
  });

  const CLASSES = Object.freeze({
    HOST: 'ipe-shadow-host',
    MODAL: 'ipe-modal',
    PREVIEW_IMAGE: 'ipe-preview-image',
    LOADER: 'ipe-loader',
    ERROR_MESSAGE: 'ipe-error-message',
    BODY_LOCK: 'ipe-preview-open',
    LOADED: 'is-loaded'
  });

  const MESSAGES = Object.freeze({
    SETTINGS_UPDATED: 'settingsUpdated',
    TOGGLE_LAST_PREVIEW: 'toggleLastPreview'
  });

  const PREVIEW_STYLES = `
:host {
  position: fixed !important;
  inset: 0 !important;
  z-index: 2147483647 !important;
  display: block;
}

:host,
:host * {
  box-sizing: border-box;
}

.ipe-modal {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 24px;
  border: 0;
  cursor: zoom-out;
  user-select: none;
  touch-action: none;
}

.ipe-preview-image {
  max-width: 92vw;
  max-height: 92vh;
  width: auto;
  height: auto;
  margin: 0;
  border: 0;
  object-fit: contain;
  opacity: 0;
  cursor: grab;
  transform-origin: center center;
  transition: opacity 120ms ease-out, transform 80ms ease-out;
  will-change: transform;
  user-select: none;
  -webkit-user-drag: none;
}

.ipe-preview-image.is-loaded {
  opacity: 1;
}

.ipe-preview-image.is-dragging {
  cursor: grabbing;
  transition: opacity 120ms ease-out;
}

.ipe-loader {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(255, 255, 255, 0.32);
  border-top-color: #ffffff;
  border-radius: 999px;
  animation: ipe-spin 800ms linear infinite;
}

.ipe-error-message {
  max-width: min(420px, 80vw);
  color: #ffffff;
  font: 14px/1.5 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  text-align: center;
}

@keyframes ipe-spin {
  to {
    transform: rotate(360deg);
  }
}
`.trim();

  const KEYBOARD = Object.freeze({
    CLOSE: 'Escape',
    RESET: '0',
    ZOOM_IN: '+',
    ZOOM_IN_ALT: '=',
    ZOOM_OUT: '-',
    MOVE_LEFT: 'ArrowLeft',
    MOVE_RIGHT: 'ArrowRight',
    MOVE_UP: 'ArrowUp',
    MOVE_DOWN: 'ArrowDown'
  });

  const MOVE_STEP = 32;

  function clamp(value, min, max) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return min;
    }
    return Math.min(Math.max(numericValue, min), max);
  }

  function isHexColor(value) {
    return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
  }

  function normalizeBoolean(value, fallback) {
    return typeof value === 'boolean' ? value : fallback;
  }

  function normalizeNumber(value, fallback, limit) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return fallback;
    }
    return clamp(numericValue, limit.min, limit.max);
  }

  function round(value, precision = 2) {
    const factor = 10 ** precision;
    return Math.round(value * factor) / factor;
  }

  function normalizeSettings(candidate) {
    const source = candidate || {};

    return {
      schemaVersion: SETTINGS_SCHEMA_VERSION,
      backgroundColor: isHexColor(source.backgroundColor)
        ? source.backgroundColor.toLowerCase()
        : DEFAULT_SETTINGS.backgroundColor,
      backgroundOpacity: round(
        normalizeNumber(
          source.backgroundOpacity,
          DEFAULT_SETTINGS.backgroundOpacity,
          SETTINGS_LIMITS.backgroundOpacity
        ),
        2
      ),
      enablePreview: normalizeBoolean(source.enablePreview, DEFAULT_SETTINGS.enablePreview),
      enableKeyboardShortcuts: normalizeBoolean(
        source.enableKeyboardShortcuts,
        DEFAULT_SETTINGS.enableKeyboardShortcuts
      ),
      enableDoubleClickReset: normalizeBoolean(
        source.enableDoubleClickReset,
        DEFAULT_SETTINGS.enableDoubleClickReset
      ),
      requireModifierKey: normalizeBoolean(
        source.requireModifierKey,
        DEFAULT_SETTINGS.requireModifierKey
      ),
      minimumImageSize: round(
        normalizeNumber(
          source.minimumImageSize,
          DEFAULT_SETTINGS.minimumImageSize,
          SETTINGS_LIMITS.minimumImageSize
        ),
        0
      ),
      maxScale: round(
        normalizeNumber(source.maxScale, DEFAULT_SETTINGS.maxScale, SETTINGS_LIMITS.maxScale),
        2
      ),
      scaleSpeed: round(
        normalizeNumber(source.scaleSpeed, DEFAULT_SETTINGS.scaleSpeed, SETTINGS_LIMITS.scaleSpeed),
        2
      )
    };
  }

  function mergeSettings(currentSettings, updates) {
    return normalizeSettings({
      ...DEFAULT_SETTINGS,
      ...(currentSettings || {}),
      ...(updates || {})
    });
  }

  function getChromeApi(chromeApi) {
    return chromeApi || global.chrome;
  }

  function readSettings(chromeApi) {
    const runtime = getChromeApi(chromeApi);
    if (!runtime?.storage?.sync) {
      return Promise.resolve(normalizeSettings(DEFAULT_SETTINGS));
    }

    return new Promise((resolve, reject) => {
      runtime.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
        const error = runtime.runtime?.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }

        resolve(normalizeSettings(settings));
      });
    });
  }

  async function writeSettings(updates, chromeApi) {
    const runtime = getChromeApi(chromeApi);
    if (!runtime?.storage?.sync) {
      return mergeSettings(DEFAULT_SETTINGS, updates);
    }

    const nextSettings = mergeSettings(await readSettings(runtime), updates);

    return new Promise((resolve, reject) => {
      runtime.storage.sync.set(nextSettings, () => {
        const error = runtime.runtime?.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }

        resolve(nextSettings);
      });
    });
  }

  function hexToRgba(hex, opacity) {
    const color = isHexColor(hex)
      ? hex.replace('#', '')
      : DEFAULT_SETTINGS.backgroundColor.replace('#', '');
    const safeOpacity = clamp(opacity, 0, 1);
    const red = parseInt(color.slice(0, 2), 16);
    const green = parseInt(color.slice(2, 4), 16);
    const blue = parseInt(color.slice(4, 6), 16);

    return `rgba(${red}, ${green}, ${blue}, ${safeOpacity})`;
  }

  function getTransformState(element) {
    return {
      translateX: Number.parseFloat(element?.dataset?.translateX) || 0,
      translateY: Number.parseFloat(element?.dataset?.translateY) || 0,
      scale: Number.parseFloat(element?.dataset?.scale) || 1
    };
  }

  function buildTransform(state) {
    return `translate(${state.translateX}px, ${state.translateY}px) scale(${state.scale})`;
  }

  function setTransformState(element, state) {
    const nextState = {
      translateX: Number(state.translateX) || 0,
      translateY: Number(state.translateY) || 0,
      scale: Number(state.scale) || 1
    };

    element.dataset.translateX = String(nextState.translateX);
    element.dataset.translateY = String(nextState.translateY);
    element.dataset.scale = String(nextState.scale);
    element.style.transform = buildTransform(nextState);

    return nextState;
  }

  function computeWheelScale(currentScale, deltaY, settings = DEFAULT_SETTINGS) {
    const normalizedSettings = normalizeSettings(settings);
    const direction = deltaY < 0 ? 1 : -1;
    const normalizedDelta = Math.min(Math.abs(deltaY) / WHEEL_DELTA_UNIT, 1);
    const configuredStep = Math.max(normalizedSettings.scaleSpeed - 1, 0.01);
    const scaledStep = configuredStep * normalizedDelta;
    const step = clamp(scaledStep, MIN_WHEEL_SCALE_STEP, MAX_WHEEL_SCALE_STEP);
    const multiplier = direction > 0 ? 1 + step : 1 / (1 + step);

    return clamp(
      currentScale * multiplier,
      SETTINGS_LIMITS.minScale.min,
      normalizedSettings.maxScale
    );
  }

  function getImageDimension(image, dimension) {
    const naturalDimension = dimension === 'width' ? image?.naturalWidth : image?.naturalHeight;
    const layoutDimension = dimension === 'width' ? image?.width : image?.height;

    if (typeof image?.getBoundingClientRect === 'function') {
      const rect = image.getBoundingClientRect();
      const renderedDimension = dimension === 'width' ? rect.width : rect.height;
      if (Number.isFinite(renderedDimension) && renderedDimension > 0) {
        return renderedDimension;
      }
    }

    if (Number.isFinite(layoutDimension) && layoutDimension > 0) {
      return layoutDimension;
    }

    if (Number.isFinite(naturalDimension) && naturalDimension > 0) {
      return naturalDimension;
    }

    return 0;
  }

  function shouldPreviewImage(image, event = {}, settings = DEFAULT_SETTINGS) {
    const normalizedSettings = normalizeSettings(settings);
    const imageUrl = image?.currentSrc || image?.src;

    if (!image || imageUrl === '' || typeof imageUrl !== 'string') {
      return false;
    }

    if (normalizedSettings.requireModifierKey && !event.altKey) {
      return false;
    }

    const interactiveAncestor = image.closest?.(
      'a, button, input, textarea, select, [role="button"], [role="link"]'
    );
    if (interactiveAncestor && !event.altKey) {
      return false;
    }

    const width = getImageDimension(image, 'width');
    const height = getImageDimension(image, 'height');
    return Math.max(width, height) >= normalizedSettings.minimumImageSize;
  }

  function getMessage(key, fallback = '', chromeApi) {
    const runtime = getChromeApi(chromeApi);
    const message = runtime?.i18n?.getMessage?.(key);
    return message || fallback;
  }

  function applyI18n(root, chromeApi) {
    const container = root || global.document;
    if (!container?.querySelectorAll) {
      return;
    }

    container.querySelectorAll('[data-i18n]').forEach((element) => {
      const key = element.dataset.i18n;
      element.textContent = getMessage(key, element.textContent, chromeApi);
    });

    container.querySelectorAll('[data-i18n-attr]').forEach((element) => {
      element.dataset.i18nAttr.split(',').forEach((entry) => {
        const [attribute, key] = entry.split(':').map((value) => value.trim());
        if (!attribute || !key) {
          return;
        }
        element.setAttribute(
          attribute,
          getMessage(key, element.getAttribute(attribute) || '', chromeApi)
        );
      });
    });
  }

  function sendMessageToActiveTab(message, chromeApi) {
    const runtime = getChromeApi(chromeApi);
    if (!runtime?.tabs?.query || !runtime?.tabs?.sendMessage) {
      return Promise.resolve(false);
    }

    return new Promise((resolve) => {
      runtime.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs?.[0];
        if (!activeTab?.id) {
          resolve(false);
          return;
        }

        runtime.tabs.sendMessage(activeTab.id, message, () => {
          resolve(!runtime.runtime?.lastError);
        });
      });
    });
  }

  global.ImagePreviewExtension = Object.freeze({
    CLASSES,
    DEFAULT_SETTINGS,
    KEYBOARD,
    MESSAGES,
    MOVE_STEP,
    PREVIEW_STYLES,
    SETTINGS_SCHEMA_VERSION,
    SETTINGS_LIMITS,
    applyI18n,
    buildTransform,
    clamp,
    computeWheelScale,
    getMessage,
    getTransformState,
    hexToRgba,
    mergeSettings,
    normalizeSettings,
    readSettings,
    sendMessageToActiveTab,
    setTransformState,
    shouldPreviewImage,
    writeSettings
  });
})(globalThis);
