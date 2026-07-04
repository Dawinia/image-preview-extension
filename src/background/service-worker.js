importScripts('../shared/core.js');

const app = globalThis.ImagePreviewExtension;

chrome.runtime.onInstalled.addListener(() => {
  app.writeSettings({}, chrome).catch((error) => {
    console.error('[Enhanced Image Previewer] Failed to initialize settings:', error);
  });
});

chrome.commands.onCommand.addListener((command) => {
  if (command !== 'toggle_last_preview') {
    return;
  }

  app
    .sendMessageToActiveTab({ action: app.MESSAGES.TOGGLE_LAST_PREVIEW }, chrome)
    .catch((error) => {
      console.error('[Enhanced Image Previewer] Failed to toggle preview:', error);
    });
});
