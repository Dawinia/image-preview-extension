class ImagePreviewer {
    constructor() {
        // 默认设置
        this.settings = {
            backgroundColor: '#000000',
            backgroundOpacity: 0.8,
            enableKeyboardShortcuts: true,
            enableDoubleClickReset: true,
            maxScale: 10,
            scaleSpeed: 1.1,
            enablePreview: true
        };

        // 保存最后预览的图片URL
        this.lastPreviewedImageUrl = null;

        // 加载用户设置
        this.loadSettings();

        // 监听设置变化
        chrome.storage.onChanged.addListener(this.onSettingsChanged.bind(this));

        // 监听来自popup或background的消息
        chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
    }

    // 加载用户设置
    loadSettings() {
        chrome.storage.sync.get(this.settings, (settings) => {
            this.settings = settings;
            this.setupImageClickListener();
        });
    }

    // 设置图片点击监听器
    setupImageClickListener() {
        // 移除现有的监听器（如果有）
        document.querySelectorAll('img').forEach(img => {
            img.removeEventListener('click', this.handleImageClick, true);
        });

        // 使用 MutationObserver 监听新添加的图片
        if (this.observer) {
            this.observer.disconnect();
        }

        // 如果启用了预览，添加监听器
        if (this.settings.enablePreview) {
            this.handleImageClick = this.onImageClick.bind(this);

            // 为现有的图片添加事件监听器
            document.querySelectorAll('img').forEach(img => {
                img.addEventListener('click', this.handleImageClick, true);
            });

            // 创建 MutationObserver 来监听新添加的图片
            this.observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) { // 元素节点
                            if (node.tagName === 'IMG') {
                                node.addEventListener('click', this.handleImageClick, true);
                            }
                            // 检查新添加元素内的所有图片
                            node.querySelectorAll('img').forEach(img => {
                                img.addEventListener('click', this.handleImageClick, true);
                            });
                        }
                    });
                });
            });

            // 开始观察
            this.observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    }

    // 处理设置变化
    onSettingsChanged(changes) {
        let settingsChanged = false;

        for (let key in changes) {
            if (key in this.settings) {
                this.settings[key] = changes[key].newValue;
                settingsChanged = true;
            }
        }

        if (settingsChanged && 'enablePreview' in changes) {
            this.setupImageClickListener();
        }
    }

    // 处理来自popup或background的消息
    handleMessage(message, sender, sendResponse) {
        if (message.action === 'settingsUpdated') {
            this.loadSettings();
        } else if (message.action === 'toggleLastPreview') {
            this.toggleLastPreview();
        }
    }

    // 切换最后预览的图片
    toggleLastPreview() {
        if (this.lastPreviewedImageUrl) {
            const modal = document.querySelector('.image-modal');
            if (modal) {
                // 如果模态框已存在，关闭它
                modal.remove();
            } else {
                // 否则，显示最后预览的图片
                this.showPreview(this.lastPreviewedImageUrl);
            }
        }
    }

    // 图片点击事件处理
    onImageClick(event) {
        const target = event.target;

        // 检查点击的是否为图片，且不在预览模态框内
        if (target.tagName === 'IMG' && !target.closest('.image-modal')) {
            // 阻止默认行为和事件冒泡
            event.preventDefault();
            event.stopPropagation();

            // 获取图片URL
            const imageUrl = target.src;

            // 显示预览
            this.showPreview(imageUrl);
        }
    }

    // 显示图片预览
    showPreview(imageUrl) {
        // 保存最后预览的图片URL
        this.lastPreviewedImageUrl = imageUrl;

        // 创建模态框
        const modal = this.createModal();
        document.body.appendChild(modal);

        // 创建图片元素
        const img = document.createElement('img');
        img.src = imageUrl;
        img.className = 'preview-image';
        modal.appendChild(img);

        // 设置图片加载事件
        img.onload = () => {
            // 初始化图片位置和缩放
            this.initializeImagePosition(img);

            // 设置事件监听器
            this.setupEventListeners(modal, img);
        };
    }

    // 创建模态框
    createModal() {
        const modal = document.createElement('div');
        modal.className = 'image-modal';

        // 应用用户设置的背景颜色和不透明度
        const backgroundColor = this.hexToRgba(this.settings.backgroundColor, this.settings.backgroundOpacity);
        modal.style.backgroundColor = backgroundColor;

        return modal;
    }

    // 将十六进制颜色转换为rgba
    hexToRgba(hex, opacity) {
        hex = hex.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }

    // 初始化图片位置
    initializeImagePosition(img) {
        // 重置变换
        img.style.transform = 'translate(0, 0) scale(1)';

        // 初始化数据属性
        img.dataset.translateX = 0;
        img.dataset.translateY = 0;
        img.dataset.scale = 1;
    }

    // 设置事件监听器
    setupEventListeners(modal, img) {
        // 关闭按钮点击事件
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        // 图片拖动
        let isDragging = false;
        let lastX, lastY;
        let moveHandler, upHandler;

        // 确保图片初始状态为可抓取
        img.style.cursor = 'grab';

        // 鼠标按下时的处理
        const handleMouseDown = (e) => {
            if (e.button !== 0) return; // 只响应左键
            isDragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
            img.style.cursor = 'grabbing';
            e.preventDefault(); // 防止选中文本等默认行为

            // 动态创建移动和松开事件的处理器
            moveHandler = (moveEvent) => {
                if (!isDragging) return;

                const deltaX = moveEvent.clientX - lastX;
                const deltaY = moveEvent.clientY - lastY;
                lastX = moveEvent.clientX;
                lastY = moveEvent.clientY;

                const currentX = parseFloat(img.dataset.translateX) || 0;
                const currentY = parseFloat(img.dataset.translateY) || 0;

                img.dataset.translateX = currentX + deltaX;
                img.dataset.translateY = currentY + deltaY;

                this.updateImageTransform(img);
                moveEvent.preventDefault(); // 防止拖拽过程中选中其他元素
            };

            upHandler = () => {
                if (!isDragging) return;
                isDragging = false;
                img.style.cursor = 'grab';

                // 移除临时事件监听器
                modal.removeEventListener('mousemove', moveHandler);
                modal.removeEventListener('mouseup', upHandler);
                modal.removeEventListener('mouseleave', upHandler);
            };

            // 在模态框上添加临时事件监听器
            modal.addEventListener('mousemove', moveHandler);
            modal.addEventListener('mouseup', upHandler);
            modal.addEventListener('mouseleave', upHandler); // 鼠标离开模态框时也结束拖拽
        };

        // 添加鼠标按下事件监听器
        img.addEventListener('mousedown', handleMouseDown);

        // 图片缩放
        modal.addEventListener('wheel', (e) => {
            e.preventDefault();

            const currentScale = parseFloat(img.dataset.scale) || 1;
            let newScale;

            if (e.deltaY < 0) {
                // 放大，但不超过最大缩放比例
                newScale = Math.min(currentScale * this.settings.scaleSpeed, this.settings.maxScale);
            } else {
                // 缩小，但不小于0.1
                newScale = Math.max(currentScale / this.settings.scaleSpeed, 0.1);
            }

            img.dataset.scale = newScale;
            this.updateImageTransform(img);
        });

        // 如果启用了键盘快捷键
        if (this.settings.enableKeyboardShortcuts) {
            document.addEventListener('keydown', (e) => {
                // 只有当模态框存在时才处理键盘事件
                if (!document.querySelector('.image-preview-modal')) return;

                switch (e.key) {
                    case 'Escape':
                        // ESC键关闭预览
                        modal.remove();
                        break;
                    case '+':
                    case '=':
                        // +键放大
                        e.preventDefault();
                        const currentScalePlus = parseFloat(img.dataset.scale) || 1;
                        img.dataset.scale = Math.min(currentScalePlus * this.settings.scaleSpeed, this.settings.maxScale);
                        this.updateImageTransform(img);
                        break;
                    case '-':
                        // -键缩小
                        e.preventDefault();
                        const currentScaleMinus = parseFloat(img.dataset.scale) || 1;
                        img.dataset.scale = Math.max(currentScaleMinus / this.settings.scaleSpeed, 0.1);
                        this.updateImageTransform(img);
                        break;
                    case '0':
                        // 0键重置缩放
                        e.preventDefault();
                        this.initializeImagePosition(img);
                        break;
                    case 'ArrowLeft':
                        // 左箭头移动图片
                        e.preventDefault();
                        img.dataset.translateX = (parseFloat(img.dataset.translateX) || 0) - 20;
                        this.updateImageTransform(img);
                        break;
                    case 'ArrowRight':
                        // 右箭头移动图片
                        e.preventDefault();
                        img.dataset.translateX = (parseFloat(img.dataset.translateX) || 0) + 20;
                        this.updateImageTransform(img);
                        break;
                    case 'ArrowUp':
                        // 上箭头移动图片
                        e.preventDefault();
                        img.dataset.translateY = (parseFloat(img.dataset.translateY) || 0) - 20;
                        this.updateImageTransform(img);
                        break;
                    case 'ArrowDown':
                        // 下箭头移动图片
                        e.preventDefault();
                        img.dataset.translateY = (parseFloat(img.dataset.translateY) || 0) + 20;
                        this.updateImageTransform(img);
                        break;
                }
            });
        }

        // 如果启用了双击重置
        if (this.settings.enableDoubleClickReset) {
            img.addEventListener('dblclick', (e) => {
                e.preventDefault();
                this.initializeImagePosition(img);
            });
        }
    }

    // 更新图片变换
    updateImageTransform(img) {
        const translateX = parseFloat(img.dataset.translateX) || 0;
        const translateY = parseFloat(img.dataset.translateY) || 0;
        const scale = parseFloat(img.dataset.scale) || 1;

        img.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    }
}

// 初始化预览器
const previewer = new ImagePreviewer();