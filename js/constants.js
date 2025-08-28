// 默认设置
export const DEFAULT_SETTINGS = {
  backgroundColor: '#000000',
  backgroundOpacity: 0.8,
  enableKeyboardShortcuts: true,
  enableDoubleClickReset: true,
  maxScale: 10,
  scaleSpeed: 1.1,
  enablePreview: true,
  enableEscClose: true
};

// 键盘快捷键配置
export const KEYBOARD_SHORTCUTS = {
  CLOSE: 'Escape',
  ZOOM_IN: '+',
  ZOOM_OUT: '-',
  MOVE_LEFT: 'ArrowLeft',
  MOVE_RIGHT: 'ArrowRight',
  MOVE_UP: 'ArrowUp',
  MOVE_DOWN: 'ArrowDown'
};

// CSS 类名常量
export const CLASS_NAMES = {
  MODAL: 'image-modal',
  PREVIEW_IMAGE: 'preview-image',
  LOADER: 'image-loader',
  ERROR_MESSAGE: 'error-message'
};

// 其他常量
export const CONSTANTS = {
  MIN_SCALE: 0.1,
  MOVE_STEP: 50,  // 键盘移动步长
  Z_INDEX: 2147483647  // 最高层级
};
