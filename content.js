// 图片预览器类
class ImagePreviewer {
    constructor() {
        this.init();
    }

    init() {
        document.addEventListener('click', (e) => {
            if (e.target.tagName.toLowerCase() === 'img') {
                // 阻止默认行为和事件冒泡，屏蔽原有的点击行为
                e.preventDefault();
                e.stopPropagation();
                this.showPreview(e);
            }
        }, true); // 使用捕获阶段，确保在其他事件处理器之前执行
    }

    showPreview(e) {
        e.preventDefault();
        e.stopPropagation();

        // 防止重复创建
        if (document.querySelector('.image-modal')) return;

        // 创建预览容器
        const modal = this.createModal();
        const loader = this.createLoader();
        const image = this.createImage();

        // 状态变量
        let scale = 1;
        let initialX = 0, initialY = 0;
        let currentX = 0, currentY = 0;
        let isDragging = false;
        let startX, startY;

        // 预加载图片
        this.preloadImage(e.target.src, image, loader, modal);

        // 添加事件监听
        this.setupEventListeners(modal, image, {
            scale, initialX, initialY, currentX, currentY,
            isDragging, startX, startY
        });

        // 添加到页面
        modal.appendChild(loader);
        modal.appendChild(image);
        document.body.appendChild(modal);
    }

    createModal() {
        const modal = document.createElement('div');
        modal.classList.add('image-modal');
        return modal;
    }

    createLoader() {
        const loader = document.createElement('div');
        loader.classList.add('image-loader');
        return loader;
    }

    createImage() {
        const image = document.createElement('img');
        image.style.opacity = '0';
        image.style.transition = 'opacity 0.3s ease';
        return image;
    }

    preloadImage(src, image, loader, modal) {
        const tempImg = new Image();
        tempImg.onload = () => {
            image.src = tempImg.src;
            image.style.opacity = '1';
            loader.style.display = 'none';
        };
        tempImg.onerror = () => {
            loader.style.display = 'none';
            const errorMsg = document.createElement('div');
            errorMsg.classList.add('error-message');
            errorMsg.textContent = '图片加载失败';
            modal.appendChild(errorMsg);
        };
        tempImg.src = src;
    }

    setupEventListeners(modal, image, state) {
        // 缩放事件 - 应用到整个模态窗口，防止页面滚动
        modal.addEventListener('wheel', (event) => {
            event.preventDefault();
            event.stopPropagation();
            const maxScale = 10;
            const minScale = 0.1;

            if (event.deltaY < 0) {
                state.scale = Math.min(maxScale, state.scale * 1.1);
            } else {
                state.scale = Math.max(minScale, state.scale / 1.1);
            }

            this.updateImageTransform(image, state);
        }, { passive: false }); // 明确指定非被动模式，确保preventDefault生效

        // 拖拽开始
        image.addEventListener('mousedown', (e) => {
            state.isDragging = true;
            state.startX = e.clientX;
            state.startY = e.clientY;

            const transform = window.getComputedStyle(image).transform;
            const matrix = new DOMMatrix(transform);
            state.initialX = matrix.m41;
            state.initialY = matrix.m42;

            modal.style.cursor = 'grabbing';
            e.preventDefault();
        });

        // 拖拽中
        document.addEventListener('mousemove', (e) => {
            if (!state.isDragging) return;

            const moveX = e.clientX - state.startX;
            const moveY = e.clientY - state.startY;

            state.currentX = state.initialX + moveX;
            state.currentY = state.initialY + moveY;

            // 边界检查
            const modalRect = modal.getBoundingClientRect();
            const imageRect = image.getBoundingClientRect();

            if (imageRect.width > modalRect.width) {
                const minX = -(imageRect.width - 20);
                const maxX = modalRect.width - 20;
                state.currentX = Math.max(minX, Math.min(maxX, state.currentX));
            }

            if (imageRect.height > modalRect.height) {
                const minY = -(imageRect.height - 20);
                const maxY = modalRect.height - 20;
                state.currentY = Math.max(minY, Math.min(maxY, state.currentY));
            }

            this.updateImageTransform(image, state);
        });

        // 拖拽结束
        document.addEventListener('mouseup', () => {
            if (state.isDragging) {
                state.isDragging = false;
                modal.style.cursor = 'pointer';
            }
        });

        // 点击关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    updateImageTransform(image, state) {
        image.style.transform = `translate3d(${state.currentX}px, ${state.currentY}px, 0) scale(${state.scale})`;
    }
}

// 初始化预览器
new ImagePreviewer();
