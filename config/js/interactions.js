// 交互模块：菜单、主题、视图设置和清空输入动画。
function attachInteractionMethods(app) {
  const viewToggleIcons = {
        grid: '<path d="M2 2.5A1.5 1.5 0 0 1 3.5 1h3A1.5 1.5 0 0 1 8 2.5v3A1.5 1.5 0 0 1 6.5 7h-3A1.5 1.5 0 0 1 2 5.5v-3zM3.5 2a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zM9 2.5A1.5 1.5 0 0 1 10.5 1h2A1.5 1.5 0 0 1 14 2.5v3A1.5 1.5 0 0 1 12.5 7h-2A1.5 1.5 0 0 1 9 5.5v-3zM10.5 2a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h2a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-2zM2 10.5A1.5 1.5 0 0 1 3.5 9h3A1.5 1.5 0 0 1 8 10.5v3A1.5 1.5 0 0 1 6.5 15h-3A1.5 1.5 0 0 1 2 13.5v-3zM3.5 10a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zM9 10.5A1.5 1.5 0 0 1 10.5 9h2a1.5 1.5 0 0 1 1.5 1.5v3A1.5 1.5 0 0 1 12.5 15h-2A1.5 1.5 0 0 1 9 13.5v-3zM10.5 10a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h2a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-2z"></path>',
        list: '<path d="M2.5 3A1.5 1.5 0 1 0 2.5 6 1.5 1.5 0 0 0 2.5 3zM6 3.5a.5.5 0 0 0 0 1h7.5a.5.5 0 0 0 0-1H6zM6 5.5a.5.5 0 0 0 0 1h5.5a.5.5 0 0 0 0-1H6zM2.5 8A1.5 1.5 0 1 0 2.5 11 1.5 1.5 0 0 0 2.5 8zM6 8.5a.5.5 0 0 0 0 1h7.5a.5.5 0 0 0 0-1H6zM6 10.5a.5.5 0 0 0 0 1h5.5a.5.5 0 0 0 0-1H6z"></path>'
  };

  app.animateClear = function animateClear() {
        const input = this.dom.address;
        const text = input.value;
        if (!text) return;

        this.cancelAddressFx();

        // 先 focus：若输入框原本未聚焦，focus 会在动画状态挂上之前同步触发
        // finishPathRestore → endAddressFx；放到 setup 之前可避免拆掉刚建好的动画，
        // 否则 220ms 定时器会二次触发 endAddressFx，placeholder 从 1 掉回 0 再淡入一次（闪烁）
        input.focus();

        const rect = input.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(input);
        const addressContainer = input.closest('.address-container');

        const overlay = document.createElement('div');
        overlay.className = 'flying-text-overlay';

        overlay.style.left = rect.left + 'px';
        overlay.style.top = rect.top + 'px';
        overlay.style.width = rect.width + 'px';
        overlay.style.height = rect.height + 'px';
        overlay.style.fontFamily = computedStyle.fontFamily;
        overlay.style.fontSize = computedStyle.fontSize;
        overlay.style.paddingLeft = computedStyle.paddingLeft;
        overlay.style.color = computedStyle.color;
        overlay.textContent = text;

        document.body.appendChild(overlay);

        input.classList.add('input-animating');
        if (addressContainer) addressContainer.classList.add('is-clearing');

        input.value = '';

        this._addrClearOverlay = overlay;
        this._addrClearContainer = addressContainer;
        clearTimeout(this._addrClearTimer);
        this._addrClearTimer = setTimeout(() => this.endAddressFx(), 220);
    };

  app.animatePathRestore = function animatePathRestore() {
        const input = this.dom.address;
        if (!input || input.value) return;
        const path = this.state.currentPath;
        if (!path) return;

        this.cancelAddressFx();

        const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduced) {
            input.value = path;
            return;
        }

        const rect = input.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(input);
        const addressContainer = input.closest('.address-container');

        const overlay = document.createElement('div');
        overlay.className = 'flying-text-overlay path-restore-overlay';
        overlay.style.left = rect.left + 'px';
        overlay.style.top = rect.top + 'px';
        overlay.style.width = rect.width + 'px';
        overlay.style.height = rect.height + 'px';
        overlay.style.fontFamily = computedStyle.fontFamily;
        overlay.style.fontSize = computedStyle.fontSize;
        overlay.style.paddingLeft = computedStyle.paddingLeft;
        overlay.style.color = computedStyle.color;
        overlay.textContent = path;
        document.body.appendChild(overlay);

        input.classList.add('input-animating');
        if (addressContainer) addressContainer.classList.add('is-restoring');
        input.value = path;

        this._addrClearOverlay = overlay;
        this._addrClearContainer = addressContainer;
        clearTimeout(this._addrClearTimer);
        this._addrClearTimer = setTimeout(() => this.endAddressFx(), 260);
    };

  app.endAddressFx = function endAddressFx() {
        clearTimeout(this._addrClearTimer);
        this._addrClearTimer = null;

        const input = this.dom.address;
        const container = this._addrClearContainer || (input && input.closest('.address-container'));
        const overlay = this._addrClearOverlay;
        this._addrClearOverlay = null;
        this._addrClearContainer = null;
        this._pathRestoreOverlay = null;
        this._pathRestoreContainer = null;

        if (overlay) overlay.remove();
        if (container) {
            container.classList.remove('is-clearing');
            container.classList.remove('is-restoring');
        }
        if (input) {
            // 关掉 color/opacity 过渡，避免摘掉 input-animating 后文字从透明渐变回来闪一下
            const revealPlaceholder = !input.value;
            input.style.transition = 'none';
            input.classList.remove('input-animating');
            if (revealPlaceholder) {
                input.classList.remove('placeholder-reveal');
                void input.offsetWidth;
                input.classList.add('placeholder-reveal');
                clearTimeout(this._placeholderRevealTimer);
                this._placeholderRevealTimer = setTimeout(() => {
                    input.classList.remove('placeholder-reveal');
                }, 200);
            }
            void input.offsetWidth;
            input.style.transition = '';
        }
    };

  app.cancelAddressFx = function cancelAddressFx() {
        this.endAddressFx();
        // 清掉可能残留的其它 flying overlay（历史竞态）
        document.querySelectorAll('.flying-text-overlay').forEach((el) => el.remove());
        const input = this.dom.address;
        if (input) {
            clearTimeout(this._placeholderRevealTimer);
            input.classList.remove('placeholder-reveal');
            input.classList.remove('input-animating');
            const container = input.closest('.address-container');
            if (container) {
                container.classList.remove('is-clearing');
                container.classList.remove('is-restoring');
            }
        }
    };

  app.finishPathRestore = function finishPathRestore() {
        this.endAddressFx();
    };

  app.toggleViewMenu = function toggleViewMenu(e) {
        if (e) e.stopPropagation();
        this.dom.settingsMenu.classList.remove('show');
        this.dom.viewMenu.classList.remove('show');
        this.setView(this.state.viewMode === 'grid' ? 'list' : 'grid');
    };

  app.toggleSettingsMenu = function toggleSettingsMenu(e) {
        e.stopPropagation();
        this.dom.viewMenu.classList.remove('show');
        this.dom.settingsMenu.classList.toggle('show');
    };

  app.toggleSidebar = function toggleSidebar() {
        this.dom.sidebar.classList.toggle('show-mobile');
  };


  app.setView = function setView(mode) {
        this.state.viewMode = mode;                  // 更新内存中的视图模式状态
        localStorage.setItem('viewMode', mode);      // 保存到本地存储（刷新后保留设置）
        this.dom.viewMenu.classList.remove('show');
        this.updateMenusUI();                        // 同步视图菜单的选中状态
        this.renderList();                           // 重新渲染文件列表（应用新视图样式）
        this.animateViewToggle();
  };

  app.animateViewToggle = function animateViewToggle() {
        const icon = document.getElementById('viewToggleIcon');
        if (!icon) return;
        icon.getAnimations().forEach((a) => a.cancel());
        icon.classList.remove('anim-swap');
        void icon.getBoundingClientRect();
        icon.classList.add('anim-swap');
    };

  app.toggleTheme = function toggleTheme(event) {
        const iconEl = this.dom.themeToggleIcon;
        const btn = (event && event.currentTarget) || (iconEl && iconEl.closest('.icon-btn'));
        const rect = btn ? btn.getBoundingClientRect() : null;
        const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
        const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
        const dx = Math.max(x, window.innerWidth - x);
        const dy = Math.max(y, window.innerHeight - y);
        const radius = Math.ceil(Math.hypot(dx, dy));
        const nextTheme = this.state.theme === 'dark' ? 'light' : 'dark';

        const root = document.documentElement;
        root.style.setProperty('--theme-reveal-x', `${x}px`);
        root.style.setProperty('--theme-reveal-y', `${y}px`);
        root.style.setProperty('--theme-reveal-r', `${radius}px`);

        let applied = false;
        const applyUpdate = () => {
            applied = true;
            this.state.theme = nextTheme;
            localStorage.setItem('theme', nextTheme);
            this.applyTheme();
        };

        const startRotateFallback = () => {
            if (iconEl) {
                iconEl.classList.add('anim-rotate');
                setTimeout(() => iconEl.classList.remove('anim-rotate'), 500);
            }
        };

        const fallbackApply = () => {
            startRotateFallback();
            applyUpdate();
        };

        if (typeof document.startViewTransition === 'function') {
            if (app._themeTransition) {
                try { app._themeTransition.skipTransition(); } catch (err) { /* noop */ }
                app._themeTransition = null;
            }
            root.classList.add('theme-no-transition');
            try {
                const transition = document.startViewTransition(applyUpdate);
                app._themeTransition = transition;
                const settle = () => {
                    if (app._themeTransition === transition) app._themeTransition = null;
                    try {
                        root.classList.remove('theme-no-transition');
                        if (!applied) fallbackApply();
                    } catch (err) { /* noop */ }
                };
                transition.finished.then(settle, settle);
                if (transition.ready) transition.ready.catch(() => {});
                if (transition.updateCallbackDone) transition.updateCallbackDone.catch(() => {});
                if (transition.skipped) transition.skipped.catch(() => {});
                return;
            } catch (err) {
                root.classList.remove('theme-no-transition');
            }
        }

        fallbackApply();
  };

  app.toggleHidden = function toggleHidden() {
        this.state.showHidden = !this.state.showHidden;
        localStorage.setItem('showHidden', this.state.showHidden);
        this.updateMenusUI();
        this.fetchData();   // 重新请求文件数据（生效隐藏文件筛选）
  };

  app.toggleCopyInfo = function toggleCopyInfo() {
        this.state.enableCopy = !this.state.enableCopy;
        localStorage.setItem('enableCopy', this.state.enableCopy);
        this.updateMenusUI();
        if (this.state.selectedItem) this.renderDetails(this.state.selectedItem);             // 如果有选中的文件项，重新渲染详情面板（让复制按钮状态同步）
  };

  app.setOpenMethod = function setOpenMethod(mode) {
        this.state.openMethod = mode;
        localStorage.setItem('openMethod', mode);
        this.updateMenusUI();
  };

  app.toggleFullScreen = async function toggleFullScreen(uid) {
        const container = document.getElementById(`audioContainer-${uid}`);
        if (!container) return;

        const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const entering = !document.fullscreenElement;

        const requestFs = () => {
            if (entering) {
                if (container.requestFullscreen) return container.requestFullscreen();
                if (container.webkitRequestFullscreen) {
                    container.webkitRequestFullscreen();
                    return Promise.resolve();
                }
                if (container.msRequestFullscreen) {
                    container.msRequestFullscreen();
                    return Promise.resolve();
                }
                return Promise.reject(new Error('fullscreen unsupported'));
            }
            if (document.exitFullscreen) return document.exitFullscreen();
            if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
                return Promise.resolve();
            }
            return Promise.reject(new Error('exitFullscreen unsupported'));
        };

        if (reduced) {
            try { await requestFs(); } catch (_) { /* 忽略用户取消/不支持 */ }
            this.updateFullScreenBtn(uid, entering);
            return;
        }

        const first = container.getBoundingClientRect();
        try {
            await requestFs();
        } catch (_) {
            this.updateFullScreenBtn(uid, false);
            return;
        }
        const last = container.getBoundingClientRect();

        if (last.width > 0 && last.height > 0 && Math.abs(last.width - first.width) > 1) {
            // 结束帧必须保留退出后的 CSS transform（如 translate(-50%,-50%)），
            // 否则动画一结束会从错误位置跳回居中
            const cssTransform = getComputedStyle(container).transform;
            const endTransform = (!cssTransform || cssTransform === 'none') ? 'none' : cssTransform;
            let tx = 0;
            let ty = 0;
            if (endTransform !== 'none') {
                try {
                    const m = new DOMMatrix(endTransform);
                    tx = m.m41;
                    ty = m.m42;
                } catch (_) { /* 非矩阵则按无平移处理 */ }
            }
            const dx = first.left - last.left;
            const dy = first.top - last.top;
            const sx = first.width / last.width;
            const sy = first.height / last.height;
            try {
                await container.animate([
                    {
                        transformOrigin: 'top left',
                        transform: `translate(${dx + tx}px, ${dy + ty}px) scale(${sx}, ${sy})`
                    },
                    {
                        transformOrigin: 'top left',
                        transform: endTransform
                    }
                ], {
                    duration: entering ? 420 : 360,
                    easing: entering
                        ? 'cubic-bezier(0.19, 1, 0.22, 1)'
                        : 'cubic-bezier(0.4, 0, 0.2, 1)'
                }).finished;
            } catch (_) { /* 动画可能被新 FS 状态打断 */ }
        }

        this.updateFullScreenBtn(uid, entering);
    };

  app.updateFullScreenBtn = function updateFullScreenBtn(uid, isFull) {
        const btn = document.getElementById(`fsBtn-${uid}`);
        if (!btn) return;
        btn.title = isFull ? '退出全屏' : '全屏';
        btn.setAttribute('aria-pressed', isFull ? 'true' : 'false');
    };

  app.applyTheme = function applyTheme() {
        document.documentElement.setAttribute('data-theme', this.state.theme);
        const iconEl = this.dom.themeToggleIcon;
        if (iconEl) {
            iconEl.innerHTML = this.state.theme === 'dark'
                ? '<svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><use href="#icon-moon"></use></svg>'
                : '<svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><use href="#icon-sun"></use></svg>';
        }
  };

  app.updateMenusUI = function updateMenusUI() {
        document.getElementById('checkGrid').style.opacity = this.state.viewMode === 'grid' ? 1 : 0; // 网格视图选中态
        document.getElementById('checkList').style.opacity = this.state.viewMode === 'list' ? 1 : 0;  // 列表视图选中态
        const nextView = this.state.viewMode === 'grid' ? 'list' : 'grid';
        const viewToggleIcon = document.getElementById('viewToggleIcon');
        const viewToggleBtn = document.getElementById('viewToggleBtn');
        if (viewToggleIcon) viewToggleIcon.innerHTML = viewToggleIcons[nextView];
        if (viewToggleBtn) viewToggleBtn.title = nextView === 'grid' ? '切换到大图标视图' : '切换到详细列表视图';
        document.getElementById('optShowHidden').classList.toggle('active', this.state.showHidden); // 显示隐藏文件选项
        document.getElementById('optCopyInfo').classList.toggle('active', this.state.enableCopy);   // 启用复制功能选项
        document.getElementById('checkOverlay').style.opacity = this.state.openMethod === 'overlay' ? 1 : 0;    // 浮层打开选中态
        document.getElementById('checkNewWin').style.opacity = this.state.openMethod === 'newWindow' ? 1 : 0; // 新窗口打开选中态
        this.dom.list.className = this.state.viewMode === 'grid' ? 'view-grid' : '';
        this.dom.header.style.display = this.state.viewMode === 'grid' ? 'none' : '';
        if (this.state.viewMode === 'list') this.renderHeader();
  };

  app.initResize = function initResize() { this.renderHeader(); };

  app.toggleTree = function toggleTree(el) {
        const child = el.parentElement.nextElementSibling;
        child.classList.toggle('open');
        el.classList.toggle('rotated');
    };

  app.isTextEditingTarget = function isTextEditingTarget(target) {
        if (!target) return false;
        if (target.isContentEditable) return true;
        const tagName = (target.tagName || '').toUpperCase();
        return ['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName);
  };

  app.handleGlobalKeydown = function handleGlobalKeydown(e) {
        if (this.isTextEditingTarget(e.target)) return;

        if (e.key === ' ' || e.key === 'Spacebar') {
            const viewerClassList = this.dom.viewerModal && this.dom.viewerModal.classList;
            if (viewerClassList && viewerClassList.contains('open') && !viewerClassList.contains('minimized')) {
                e.preventDefault();
                this.closeFile(this.state.activeFileIndex);
                return;
            }
            if (!this.state.selectedItem) return;
            e.preventDefault();
            this.handleOpenAction(this.state.selectedItem);
            return;
        }

        if (e.key === 'Escape') {
            const viewerClassList = this.dom.viewerModal && this.dom.viewerModal.classList;
            const viewerOpen = viewerClassList && viewerClassList.contains('open');
            const viewerMinimized = viewerClassList && viewerClassList.contains('minimized');

            e.preventDefault();
            if (viewerOpen && !viewerMinimized) {
                this.minimizeViewer();
                return;
            }

            this.dom.viewMenu.classList.remove('show');
            this.dom.settingsMenu.classList.remove('show');
            this.dom.sidebar.classList.remove('show-mobile');
            this.closeDetails();
        }
  };

  app.initKeyboardShortcuts = function initKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => this.handleGlobalKeydown(e));
  };
}
