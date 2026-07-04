(function initPopup(global) {
  const app = global.ImagePreviewExtension;

  function getElement(id) {
    return document.getElementById(id);
  }

  function applySettings(settings) {
    getElement('enablePreview').checked = settings.enablePreview;
    getElement('enableKeyboardShortcuts').checked = settings.enableKeyboardShortcuts;
    getElement('enableDoubleClickReset').checked = settings.enableDoubleClickReset;
  }

  function collectToggleSettings() {
    return {
      enablePreview: getElement('enablePreview').checked,
      enableKeyboardShortcuts: getElement('enableKeyboardShortcuts').checked,
      enableDoubleClickReset: getElement('enableDoubleClickReset').checked
    };
  }

  async function loadSettings() {
    applySettings(await app.readSettings(global.chrome));
  }

  async function saveSettings() {
    await app.writeSettings(collectToggleSettings(), global.chrome);
  }

  function bindEvents() {
    getElement('openOptions').addEventListener('click', (event) => {
      event.preventDefault();
      chrome.runtime.openOptionsPage();
    });

    for (const id of ['enablePreview', 'enableKeyboardShortcuts', 'enableDoubleClickReset']) {
      getElement(id).addEventListener('change', () => {
        saveSettings().catch((error) => {
          console.error('[Enhanced Image Previewer] Failed to save popup settings:', error);
        });
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    app.applyI18n(document, global.chrome);
    bindEvents();
    loadSettings().catch((error) => {
      console.error('[Enhanced Image Previewer] Failed to load popup settings:', error);
    });
  });
})(globalThis);
