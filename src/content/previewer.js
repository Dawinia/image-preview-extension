(function initPreviewer(global) {
  const app = global.ImagePreviewExtension;

  if (!app || global.__imagePreviewerController) {
    return;
  }

  class ImagePreviewController {
    constructor({ chromeApi = global.chrome, documentRef = global.document } = {}) {
      this.chrome = chromeApi;
      this.document = documentRef;
      this.settings = app.normalizeSettings(app.DEFAULT_SETTINGS);
      this.lastPreviewedImageUrl = null;
      this.currentPreview = null;
      this.isInitialized = false;
      this.previousBodyOverflow = null;

      this.handleClick = this.handleClick.bind(this);
      this.handleMessage = this.handleMessage.bind(this);
      this.handleStorageChanged = this.handleStorageChanged.bind(this);
    }

    async init() {
      if (this.isInitialized || !this.document?.addEventListener) {
        return;
      }

      this.settings = await app.readSettings(this.chrome);
      this.document.addEventListener('click', this.handleClick, true);
      this.chrome?.runtime?.onMessage?.addListener(this.handleMessage);
      this.chrome?.storage?.onChanged?.addListener(this.handleStorageChanged);
      this.isInitialized = true;
    }

    destroy() {
      this.closePreview();
      this.document.removeEventListener('click', this.handleClick, true);
      this.chrome?.runtime?.onMessage?.removeListener(this.handleMessage);
      this.chrome?.storage?.onChanged?.removeListener(this.handleStorageChanged);
      this.isInitialized = false;
    }

    async reloadSettings() {
      this.settings = await app.readSettings(this.chrome);
      if (!this.settings.enablePreview) {
        this.closePreview();
      }
      return this.settings;
    }

    handleStorageChanged(changes, areaName) {
      if (areaName !== 'sync') {
        return;
      }

      const changedSettings = Object.keys(changes).reduce((nextSettings, key) => {
        if (key in app.DEFAULT_SETTINGS) {
          nextSettings[key] = changes[key].newValue;
        }
        return nextSettings;
      }, {});

      if (Object.keys(changedSettings).length === 0) {
        return;
      }

      this.settings = app.mergeSettings(this.settings, changedSettings);
      if (!this.settings.enablePreview) {
        this.closePreview();
      } else if (this.currentPreview?.modal) {
        this.currentPreview.modal.style.backgroundColor = app.hexToRgba(
          this.settings.backgroundColor,
          this.settings.backgroundOpacity
        );
      }
    }

    handleMessage(message, _sender, sendResponse) {
      if (message?.action === app.MESSAGES.SETTINGS_UPDATED) {
        this.reloadSettings()
          .then((settings) => sendResponse?.({ ok: true, settings }))
          .catch((error) => sendResponse?.({ ok: false, error: error.message }));
        return true;
      }

      if (message?.action === app.MESSAGES.TOGGLE_LAST_PREVIEW) {
        const opened = this.toggleLastPreview();
        sendResponse?.({ ok: true, opened });
        return false;
      }

      return false;
    }

    handleClick(event) {
      if (!this.settings.enablePreview) {
        return;
      }

      const target = event.target;
      const image = target?.closest?.('img');
      if (!app.shouldPreviewImage(image, event, this.settings)) {
        return;
      }

      const imageUrl = image.currentSrc || image.src;
      if (!imageUrl) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      this.openPreview(
        imageUrl,
        image.alt || app.getMessage('imagePreviewLabel', 'Image preview', this.chrome)
      );
    }

    toggleLastPreview() {
      if (this.currentPreview) {
        this.closePreview();
        return false;
      }

      if (!this.lastPreviewedImageUrl || !this.settings.enablePreview) {
        return false;
      }

      this.openPreview(
        this.lastPreviewedImageUrl,
        app.getMessage('imagePreviewLabel', 'Image preview', this.chrome)
      );
      return true;
    }

    openPreview(imageUrl, label) {
      this.closePreview();
      this.lastPreviewedImageUrl = imageUrl;

      const modalAbort = new AbortController();
      const { host, shadowRoot, modal } = this.createPreviewShell(label);
      const loader = this.createLoader();
      const image = this.createImage(label);

      modal.append(loader, image);
      shadowRoot.appendChild(modal);
      this.getMountNode().appendChild(host);
      this.lockPageScroll();

      this.currentPreview = {
        host,
        shadowRoot,
        modal,
        image,
        modalAbort,
        previouslyFocusedElement: this.document.activeElement
      };
      this.attachModalEvents(modal, image, modalAbort.signal);

      image.addEventListener(
        'load',
        () => {
          loader.remove();
          image.classList.add(app.CLASSES.LOADED);
          app.setTransformState(image, { translateX: 0, translateY: 0, scale: 1 });
          modal.focus({ preventScroll: true });
        },
        { once: true, signal: modalAbort.signal }
      );

      image.addEventListener(
        'error',
        () => {
          loader.remove();
          image.remove();
          modal.appendChild(this.createErrorMessage());
        },
        { once: true, signal: modalAbort.signal }
      );

      image.src = imageUrl;
    }

    closePreview() {
      if (!this.currentPreview) {
        return;
      }

      this.currentPreview.modalAbort.abort();
      this.currentPreview.host.remove();
      this.restorePageScroll();
      this.currentPreview.previouslyFocusedElement?.focus?.({ preventScroll: true });
      this.currentPreview = null;
    }

    createPreviewShell(label) {
      const host = this.document.createElement('div');
      host.className = app.CLASSES.HOST;
      this.applyHostStyles(host);
      const shadowRoot = host.attachShadow({ mode: 'open' });

      this.attachPreviewStyles(shadowRoot);

      const modal = this.document.createElement('div');
      modal.className = app.CLASSES.MODAL;
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-label', label);
      modal.tabIndex = -1;
      modal.style.backgroundColor = app.hexToRgba(
        this.settings.backgroundColor,
        this.settings.backgroundOpacity
      );
      return { host, shadowRoot, modal };
    }

    attachPreviewStyles(shadowRoot) {
      if ('adoptedStyleSheets' in shadowRoot && global.CSSStyleSheet) {
        try {
          const stylesheet = new global.CSSStyleSheet();
          stylesheet.replaceSync(app.PREVIEW_STYLES);
          shadowRoot.adoptedStyleSheets = [stylesheet];
          return;
        } catch (error) {
          console.warn('[Enhanced Image Previewer] Falling back to inline shadow styles:', error);
        }
      }

      const style = this.document.createElement('style');
      style.textContent = app.PREVIEW_STYLES;
      shadowRoot.appendChild(style);
    }

    applyHostStyles(host) {
      const styles = {
        position: 'fixed',
        inset: '0',
        zIndex: '2147483647',
        display: 'block',
        width: '100vw',
        height: '100vh',
        margin: '0',
        padding: '0',
        border: '0'
      };

      Object.entries(styles).forEach(([property, value]) => {
        host.style.setProperty(property, value, 'important');
      });
    }

    createLoader() {
      const loader = this.document.createElement('div');
      loader.className = app.CLASSES.LOADER;
      loader.setAttribute('aria-hidden', 'true');
      return loader;
    }

    createImage(label) {
      const image = this.document.createElement('img');
      image.className = app.CLASSES.PREVIEW_IMAGE;
      image.alt = label;
      image.decoding = 'async';
      image.draggable = false;
      return image;
    }

    createErrorMessage() {
      const error = this.document.createElement('div');
      error.className = app.CLASSES.ERROR_MESSAGE;
      error.textContent = app.getMessage('imageLoadError', 'Image failed to load.', this.chrome);
      return error;
    }

    attachModalEvents(modal, image, signal) {
      modal.addEventListener(
        'click',
        (event) => {
          if (event.target === modal) {
            this.closePreview();
          }
        },
        { signal }
      );

      modal.addEventListener(
        'wheel',
        (event) => {
          event.preventDefault();
          this.zoomImageByWheel(image, event.deltaY);
        },
        { passive: false, signal }
      );

      image.addEventListener(
        'dblclick',
        (event) => {
          if (!this.settings.enableDoubleClickReset) {
            return;
          }

          event.preventDefault();
          app.setTransformState(image, { translateX: 0, translateY: 0, scale: 1 });
        },
        { signal }
      );

      this.attachDragEvents(image, signal);

      this.document.addEventListener(
        'keydown',
        (event) => {
          if (this.currentPreview?.modal !== modal) {
            return;
          }

          if (event.key === 'Tab') {
            this.trapFocus(event);
            return;
          }

          if (!this.settings.enableKeyboardShortcuts) {
            return;
          }

          this.handleKeyboard(event, image);
        },
        { capture: true, signal }
      );
    }

    attachDragEvents(image, signal) {
      let isDragging = false;
      let lastX = 0;
      let lastY = 0;

      image.addEventListener(
        'pointerdown',
        (event) => {
          if (event.button !== 0) {
            return;
          }

          isDragging = true;
          lastX = event.clientX;
          lastY = event.clientY;
          image.classList.add('is-dragging');
          image.setPointerCapture?.(event.pointerId);
          event.preventDefault();
        },
        { signal }
      );

      image.addEventListener(
        'pointermove',
        (event) => {
          if (!isDragging) {
            return;
          }

          const state = app.getTransformState(image);
          app.setTransformState(image, {
            ...state,
            translateX: state.translateX + event.clientX - lastX,
            translateY: state.translateY + event.clientY - lastY
          });

          lastX = event.clientX;
          lastY = event.clientY;
          event.preventDefault();
        },
        { signal }
      );

      const endDrag = (event) => {
        if (!isDragging) {
          return;
        }

        isDragging = false;
        image.classList.remove('is-dragging');
        image.releasePointerCapture?.(event.pointerId);
      };

      image.addEventListener('pointerup', endDrag, { signal });
      image.addEventListener('pointercancel', endDrag, { signal });
    }

    handleKeyboard(event, image) {
      switch (event.key) {
        case app.KEYBOARD.CLOSE:
          this.closePreview();
          break;
        case app.KEYBOARD.ZOOM_IN:
        case app.KEYBOARD.ZOOM_IN_ALT:
          this.zoomImage(image, 1);
          break;
        case app.KEYBOARD.ZOOM_OUT:
          this.zoomImage(image, -1);
          break;
        case app.KEYBOARD.RESET:
          app.setTransformState(image, { translateX: 0, translateY: 0, scale: 1 });
          break;
        case app.KEYBOARD.MOVE_LEFT:
          this.moveImage(image, -app.MOVE_STEP, 0);
          break;
        case app.KEYBOARD.MOVE_RIGHT:
          this.moveImage(image, app.MOVE_STEP, 0);
          break;
        case app.KEYBOARD.MOVE_UP:
          this.moveImage(image, 0, -app.MOVE_STEP);
          break;
        case app.KEYBOARD.MOVE_DOWN:
          this.moveImage(image, 0, app.MOVE_STEP);
          break;
        default:
          return;
      }

      event.preventDefault();
      event.stopPropagation();
    }

    trapFocus(event) {
      const modal = this.currentPreview?.modal;
      if (!modal) {
        return;
      }

      const focusable = [
        ...modal.querySelectorAll(
          'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
        )
      ].filter((element) => !element.disabled && element.offsetParent !== null);

      if (focusable.length === 0) {
        event.preventDefault();
        modal.focus({ preventScroll: true });
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = this.currentPreview.shadowRoot.activeElement;

      if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    lockPageScroll() {
      const body = this.document.body;
      if (!body || this.previousBodyOverflow !== null) {
        return;
      }

      this.previousBodyOverflow = body.style.overflow;
      body.style.overflow = 'hidden';
      body.classList.add(app.CLASSES.BODY_LOCK);
    }

    restorePageScroll() {
      const body = this.document.body;
      if (!body) {
        return;
      }

      body.style.overflow = this.previousBodyOverflow || '';
      body.classList.remove(app.CLASSES.BODY_LOCK);
      this.previousBodyOverflow = null;
    }

    zoomImage(image, direction) {
      const state = app.getTransformState(image);
      const nextScale =
        direction > 0
          ? state.scale * this.settings.scaleSpeed
          : state.scale / this.settings.scaleSpeed;

      app.setTransformState(image, {
        ...state,
        scale: app.clamp(nextScale, app.SETTINGS_LIMITS.minScale.min, this.settings.maxScale)
      });
    }

    zoomImageByWheel(image, deltaY) {
      const state = app.getTransformState(image);
      app.setTransformState(image, {
        ...state,
        scale: app.computeWheelScale(state.scale, deltaY, this.settings)
      });
    }

    moveImage(image, deltaX, deltaY) {
      const state = app.getTransformState(image);
      app.setTransformState(image, {
        ...state,
        translateX: state.translateX + deltaX,
        translateY: state.translateY + deltaY
      });
    }

    getMountNode() {
      return this.document.body || this.document.documentElement;
    }
  }

  const controller = new ImagePreviewController();
  global.__imagePreviewerController = controller;
  controller.init().catch((error) => {
    console.error('[Enhanced Image Previewer] Failed to initialize content script:', error);
  });
})(globalThis);
