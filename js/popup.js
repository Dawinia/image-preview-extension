// 默认设置
const defaultSettings = {
  enablePreview: true,
  enableKeyboardShortcuts: true,
  enableDoubleClickReset: true,
  backgroundColor: '#000000',
  backgroundOpacity: 0.8,
  maxScale: 10,
  scaleSpeed: 1.1,
  enableEscClose: true
};

// 加载设置
function loadSettings() {
  chrome.storage.sync.get(defaultSettings, (settings) => {
    document.getElementById('enablePreview').checked = settings.enablePreview;
    document.getElementById('enableKeyboardShortcuts').checked = settings.enableKeyboardShortcuts;
    document.getElementById('enableDoubleClickReset').checked = settings.enableDoubleClickReset;
  });
}

// 保存设置
function saveSettings() {
  const settings = {
    enablePreview: document.getElementById('enablePreview').checked,
    enableKeyboardShortcuts: document.getElementById('enableKeyboardShortcuts').checked,
    enableDoubleClickReset: document.getElementById('enableDoubleClickReset').checked
  };
  
  chrome.storage.sync.set(settings, () => {
    // 通知内容脚本设置已更改
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'settingsUpdated'
        });
      }
    });
  });
}

// 打开选项页面
document.getElementById('openOptions').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

// 监听设置变化
document.getElementById('enablePreview').addEventListener('change', saveSettings);
document.getElementById('enableKeyboardShortcuts').addEventListener('change', saveSettings);
document.getElementById('enableDoubleClickReset').addEventListener('change', saveSettings);

// 初始化
document.addEventListener('DOMContentLoaded', loadSettings);