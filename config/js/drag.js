// 拖拽模块：详情面板拖拽、侧边栏滑动和图片取色。
export function attachDragMethods(app) {
  app.initDragHandles = function initDragHandles() {
        const deskHandle_detail = document.getElementById('dragHandleDesk_detail');
        const mobileHandle_detail = document.getElementById('dragHandleMobile_detail');

        // 桌面端拖拽
        deskHandle_detail.addEventListener('mousedown', (e) => this.startDrag(e, 'desk'));
        // 移动端拖拽
        mobileHandle_detail.addEventListener('touchstart', (e) => this.startDrag(e.touches[0], 'mobile'), { passive: false });

        // 统一的移动和结束事件绑定在 document
        document.addEventListener('mousemove', (e) => this.onDragMove(e, 'desk'));
        document.addEventListener('touchmove', (e) => {
            if (this.state.drag.active) e.preventDefault();
            this.onDragMove(e.touches[0], 'mobile');
        }, { passive: false });

        document.addEventListener('mouseup', () => this.endDrag('desk'));
        document.addEventListener('touchend', () => this.endDrag('mobile'));
    },
    // --- 【新增】侧边栏左滑关闭逻辑 ---;

  app.initSidebarSwipe = function initSidebarSwipe() {
        const sidebar = this.dom.sidebar;
        let startX = 0;
        let startY = 0;
        let isSwiping = false;

        // 1. 触摸开始
        sidebar.addEventListener('touchstart', (e) => {
            // 只有在移动端且侧边栏打开时才触发
            if (!sidebar.classList.contains('show-mobile')) return;

            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            isSwiping = false;

            // 移除过渡效果，实现手指跟随
            sidebar.style.transition = 'none';
        }, { passive: true });

        // 2. 触摸移动
        sidebar.addEventListener('touchmove', (e) => {
            if (!sidebar.classList.contains('show-mobile')) return;

            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;
            const deltaX = currentX - startX;
            const deltaY = currentY - startY;

            // 核心逻辑：判断意图
            // 如果是向左滑 (deltaX < 0) 且 水平距离 > 垂直距离，则判定为关闭操作
            if (deltaX < 0 && Math.abs(deltaX) > Math.abs(deltaY)) {
                isSwiping = true;
                e.preventDefault(); // 阻止浏览器默认行为（如滚动）
                sidebar.style.transform = `translateX(${deltaX}px)`;
            }
        }, { passive: false }); // 注意：这里必须是 false 才能调用 preventDefault

        // 3. 触摸结束
        sidebar.addEventListener('touchend', (e) => {
            if (!sidebar.classList.contains('show-mobile')) return;

            // 恢复 CSS 过渡效果，产生平滑回弹或关闭动画
            sidebar.style.transition = '';

            const deltaX = e.changedTouches[0].clientX - startX;

            // 阈值判断：如果向左滑动超过 80px，则关闭
            if (isSwiping && deltaX < -80) {
                // 关闭侧边栏
                this.toggleSidebar();
                // 这里为了防止 toggle 逻辑覆盖 transform，手动重置一下
                setTimeout(() => {
                    sidebar.style.transform = '';
                }, 300);
            } else {
                // 否则回弹复位
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

        // 限制只能向关闭方向拖动
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
            // 弹回
            this.dom.details.style.transform = '';
        }
        this.state.drag.currentTranslate = 0;
    },

    // --- 菜单和侧边栏切换 ---;

  app.getAverageRGB = function getAverageRGB(imgEl) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext && canvas.getContext('2d');
        if (!context) return { r: 0, g: 0, b: 0 };

        const height = canvas.height = imgEl.naturalHeight || imgEl.offsetHeight || 100;
        const width = canvas.width = imgEl.naturalWidth || imgEl.offsetWidth || 100;

        context.drawImage(imgEl, 0, 0);

        try {
            // 读取图片数据
            const data = context.getImageData(0, 0, width, height);
            const length = data.data.length;
            let i = -4, count = 0;
            let R = 0, G = 0, B = 0;

            // 每隔 50 个像素采样一次，节省性能
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
            // 跨域图片可能报错，返回默认深灰
            return { r: 50, g: 50, b: 50 };
        }
    },

    // --- 【新增】辅助：判断颜色深浅 (YIQ算法) ---;

  app.isLightColor = function isLightColor(r, g, b) {
        // 返回 true 代表背景是亮色，文字需要黑色
        // 返回 false 代表背景是暗色，文字需要白色
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return yiq >= 128;
    };

}
}
