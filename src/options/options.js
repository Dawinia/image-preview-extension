(function initOptions(global) {
  const app = global.ImagePreviewExtension;

  function getElement(id) {
    return document.getElementById(id);
  }

  function applySettings(settings) {
    getElement('backgroundColor').value = settings.backgroundColor;
    getElement('colorPreview').style.backgroundColor = settings.backgroundColor;
    getElement('backgroundOpacity').value = settings.backgroundOpacity;
    getElement('opacityValue').textContent = settings.backgroundOpacity.toFixed(1);
    getElement('enableKeyboardShortcuts').checked = settings.enableKeyboardShortcuts;
    getElement('enableDoubleClickReset').checked = settings.enableDoubleClickReset;
    getElement('requireModifierKey').checked = settings.requireModifierKey;
    getElement('minimumImageSize').value = settings.minimumImageSize;
    getElement('minimumImageSizeValue').textContent = String(settings.minimumImageSize);
    getElement('maxScale').value = settings.maxScale;
    getElement('maxScaleValue').textContent = String(settings.maxScale);
    getElement('scaleSpeed').value = settings.scaleSpeed;
    getElement('scaleSpeedValue').textContent = settings.scaleSpeed.toFixed(2);
  }

  function collectSettings() {
    return {
      backgroundColor: getElement('backgroundColor').value,
      backgroundOpacity: Number.parseFloat(getElement('backgroundOpacity').value),
      enableKeyboardShortcuts: getElement('enableKeyboardShortcuts').checked,
      enableDoubleClickReset: getElement('enableDoubleClickReset').checked,
      requireModifierKey: getElement('requireModifierKey').checked,
      minimumImageSize: Number.parseFloat(getElement('minimumImageSize').value),
      maxScale: Number.parseFloat(getElement('maxScale').value),
      scaleSpeed: Number.parseFloat(getElement('scaleSpeed').value)
    };
  }

  function updatePreviewValues() {
    const settings = app.mergeSettings(app.DEFAULT_SETTINGS, collectSettings());
    getElement('colorPreview').style.backgroundColor = settings.backgroundColor;
    getElement('opacityValue').textContent = settings.backgroundOpacity.toFixed(1);
    getElement('maxScaleValue').textContent = String(settings.maxScale);
    getElement('minimumImageSizeValue').textContent = String(settings.minimumImageSize);
    getElement('scaleSpeedValue').textContent = settings.scaleSpeed.toFixed(2);
  }

  function showStatus(message, type) {
    const status = getElement('status');
    status.textContent = message;
    status.className = type;
    status.hidden = false;

    global.setTimeout(() => {
      status.hidden = true;
    }, 3000);
  }

  async function saveOptions() {
    const settings = await app.writeSettings(collectSettings(), global.chrome);
    applySettings(settings);
    showStatus(app.getMessage('settingsSaved', 'Settings saved.', global.chrome), 'success');
  }

  async function restoreDefaults() {
    const settings = await app.writeSettings(app.DEFAULT_SETTINGS, global.chrome);
    applySettings(settings);
    showStatus(
      app.getMessage('settingsRestored', 'Default settings restored.', global.chrome),
      'success'
    );
  }

  async function loadOptions() {
    applySettings(await app.readSettings(global.chrome));
  }

  function bindEvents() {
    getElement('save').addEventListener('click', () => {
      saveOptions().catch((error) => {
        console.error('[Enhanced Image Previewer] Failed to save options:', error);
        showStatus(app.getMessage('settingsSaveFailed', 'Save failed.', global.chrome), 'error');
      });
    });

    getElement('reset').addEventListener('click', () => {
      restoreDefaults().catch((error) => {
        console.error('[Enhanced Image Previewer] Failed to restore defaults:', error);
        showStatus(
          app.getMessage('settingsRestoreFailed', 'Restore failed.', global.chrome),
          'error'
        );
      });
    });

    for (const id of [
      'backgroundColor',
      'backgroundOpacity',
      'minimumImageSize',
      'maxScale',
      'scaleSpeed'
    ]) {
      getElement(id).addEventListener('input', updatePreviewValues);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    app.applyI18n(document, global.chrome);
    bindEvents();
    loadOptions().catch((error) => {
      console.error('[Enhanced Image Previewer] Failed to load options:', error);
      showStatus(app.getMessage('settingsLoadFailed', 'Load failed.', global.chrome), 'error');
    });
  });
})(globalThis);
