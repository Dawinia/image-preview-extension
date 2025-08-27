// 默认设置
const defaultSettings = {
  backgroundColor: '#000000',
  backgroundOpacity: 0.8,
  enableKeyboardShortcuts: true,
  enableDoubleClickReset: true,
  maxScale: 10,
  scaleSpeed: 1.1
};

// 保存设置
function saveOptions() {
  const settings = {
    backgroundColor: document.getElementById('backgroundColor').value,
    backgroundOpacity: parseFloat(document.getElementById('backgroundOpacity').value),
    enableKeyboardShortcuts: document.getElementById('enableKeyboardShortcuts').checked,
    enableDoubleClickReset: document.getElementById('enableDoubleClickReset').checked,
    maxScale: parseInt(document.getElementById('maxScale').value),
    scaleSpeed: parseFloat(document.getElementById('scaleSpeed').value)
  };
  
  chrome.storage.sync.set(settings, () => {
    showStatus('设置已保存', 'success');
  });
}

// 恢复默认设置
function restoreDefaults() {
  chrome.storage.sync.set(defaultSettings, () => {
    loadOptions();
    showStatus('已恢复默认设置', 'success');
  });
}

// 加载设置
function loadOptions() {
  chrome.storage.sync.get(defaultSettings, (settings) => {
    document.getElementById('backgroundColor').value = settings.backgroundColor;
    document.getElementById('colorPreview').style.backgroundColor = settings.backgroundColor;
    document.getElementById('backgroundOpacity').value = settings.backgroundOpacity;
    document.getElementById('opacityValue').textContent = settings.backgroundOpacity;
    document.getElementById('enableKeyboardShortcuts').checked = settings.enableKeyboardShortcuts;
    document.getElementById('enableDoubleClickReset').checked = settings.enableDoubleClickReset;
    document.getElementById('maxScale').value = settings.maxScale;
    document.getElementById('maxScaleValue').textContent = settings.maxScale;
    document.getElementById('scaleSpeed').value = settings.scaleSpeed;
    document.getElementById('scaleSpeedValue').textContent = settings.scaleSpeed.toFixed(2);
  });
}

// 显示状态消息
function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = type;
  status.style.display = 'block';
  
  setTimeout(() => {
    status.style.display = 'none';
  }, 3000);
}

// 更新UI元素
function updateUI() {
  // 更新颜色预览
  document.getElementById('colorPreview').style.backgroundColor = document.getElementById('backgroundColor').value;
  
  // 更新不透明度值显示
  document.getElementById('opacityValue').textContent = document.getElementById('backgroundOpacity').value;
  
  // 更新最大缩放比例值显示
  document.getElementById('maxScaleValue').textContent = document.getElementById('maxScale').value;
  
  // 更新缩放速度值显示
  const scaleSpeed = parseFloat(document.getElementById('scaleSpeed').value);
  document.getElementById('scaleSpeedValue').textContent = scaleSpeed.toFixed(2);
}

// 事件监听器
document.addEventListener('DOMContentLoaded', loadOptions);
document.getElementById('save').addEventListener('click', saveOptions);
document.getElementById('reset').addEventListener('click', restoreDefaults);

// 实时更新UI
document.getElementById('backgroundColor').addEventListener('input', updateUI);
document.getElementById('backgroundOpacity').addEventListener('input', updateUI);
document.getElementById('maxScale').addEventListener('input', updateUI);
document.getElementById('scaleSpeed').addEventListener('input', updateUI);