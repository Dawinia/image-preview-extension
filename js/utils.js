// 将十六进制颜色转换为rgba
export function hexToRgba(hex, opacity) {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// 获取元素的当前变换值
export function getTransformValues(element) {
    return {
        translateX: parseFloat(element.dataset.translateX) || 0,
        translateY: parseFloat(element.dataset.translateY) || 0,
        scale: parseFloat(element.dataset.scale) || 1
    };
}

// 防抖函数
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 限制数值在指定范围内
export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
