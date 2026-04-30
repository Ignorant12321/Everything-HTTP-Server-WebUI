// 拖拽模块：详情面板拖拽、侧边栏滑动和图片取色。
function attachDragMethods(app) {
  app.initDragHandles = function initDragHandles() {
        const deskHandle_detail = document.getElementById('dragHandleDesk_detail');
        const mobileHandle_detail = document.getElementById('dragHandleMobile_detail');

        deskHandle_detail.addEventListener('mousedown', (e) => this.startDrag(e, 'desk'));
        mobileHandle_detail.addEventListener('touchstart', (e) => this.startDrag(e.touches[0], 'mobile'), { passive: false });

        document.addEventListener('mousemove', (e) => this.onDragMove(e, 'desk'));
        document.addEventListener('touchmove', (e) => {
            if (this.state.drag.active) e.preventDefault();
            this.onDragMove(e.touches[0], 'mobile');
        }, { passive: false });

        document.addEventListener('mouseup', () => this.endDrag('desk'));
        document.addEventListener('touchend', () => this.endDrag('mobile'));
  };

  app.initSidebarSwipe = function initSidebarSwipe() {
        const sidebar = this.dom.sidebar;
        let startX = 0;
        let startY = 0;
        let isSwiping = false;

        sidebar.addEventListener('touchstart', (e) => {
            if (!sidebar.classList.contains('show-mobile')) return;

            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            isSwiping = false;

            sidebar.style.transition = 'none';
        }, { passive: true });

        sidebar.addEventListener('touchmove', (e) => {
            if (!sidebar.classList.contains('show-mobile')) return;

            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;
            const deltaX = currentX - startX;
            const deltaY = currentY - startY;

            if (deltaX < 0 && Math.abs(deltaX) > Math.abs(deltaY)) {
                isSwiping = true;
                e.preventDefault(); // 阻止浏览器默认行为（如滚动）
                sidebar.style.transform = `translateX(${deltaX}px)`;
            }
        }, { passive: false }); // 注意：这里必须是 false 才能调用 preventDefault

        sidebar.addEventListener('touchend', (e) => {
            if (!sidebar.classList.contains('show-mobile')) return;

            sidebar.style.transition = '';

            const deltaX = e.changedTouches[0].clientX - startX;

            if (isSwiping && deltaX < -80) {
                this.toggleSidebar();
                setTimeout(() => {
                    sidebar.style.transform = '';
                }, 300);
            } else {
                sidebar.style.transform = '';
            }
            isSwiping = false;
        });
    };

  app.startDrag = function startDrag(e, mode) {
        this.state.drag.active = true;
        this.state.drag.startPos = mode === 'desk' ? e.clientX : e.clientY;
        this.dom.details.style.transition = 'none'; // 拖动时移除过渡
    };

  app.onDragMove = function onDragMove(e, mode) {
        if (!this.state.drag.active) return;
        const current = mode === 'desk' ? e.clientX : e.clientY;
        const delta = current - this.state.drag.startPos;

        if (delta < 0) return;

        this.state.drag.currentTranslate = delta;
        const transform = mode === 'desk' ? `translateX(${delta}px)` : `translateY(${delta}px)`;
        this.dom.details.style.transform = transform;
    };

  app.endDrag = function endDrag(mode) {
        if (!this.state.drag.active) return;
        this.state.drag.active = false;
        this.dom.details.style.transition = ''; // 恢复过渡效果

        const threshold = mode === 'desk' ? 100 : 150; // 触发关闭的阈值

        if (this.state.drag.currentTranslate > threshold) {
            this.closeDetails();
        } else {
            this.dom.details.style.transform = '';
        }
        this.state.drag.currentTranslate = 0;
  };

  app.getAverageRGB = function getAverageRGB(imgEl) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext && canvas.getContext('2d');
        if (!context) return { r: 0, g: 0, b: 0 };

        const height = canvas.height = imgEl.naturalHeight || imgEl.offsetHeight || 100;
        const width = canvas.width = imgEl.naturalWidth || imgEl.offsetWidth || 100;

        context.drawImage(imgEl, 0, 0);

        try {
            const data = context.getImageData(0, 0, width, height);
            const length = data.data.length;
            let i = -4, count = 0;
            let R = 0, G = 0, B = 0;

            while ((i += 50 * 4) < length) {
                ++count;
                R += data.data[i];
                G += data.data[i + 1];
                B += data.data[i + 2];
            }

            return {
                r: Math.floor(R / count),
                g: Math.floor(G / count),
                b: Math.floor(B / count)
            };
        } catch (e) {
            return { r: 50, g: 50, b: 50 };
        }
  };

  app.isLightColor = function isLightColor(r, g, b) {
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return yiq >= 128;
    };

}
