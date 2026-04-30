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
        input.focus();

        setTimeout(() => {
            overlay.remove();
            input.classList.remove('input-animating');
            if (addressContainer) addressContainer.classList.remove('is-clearing');
        }, 220);
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
  };

  app.toggleTheme = function toggleTheme() {
        this.state.theme = this.state.theme === 'dark' ? 'light' : 'dark';
        themeToggleIcon.innerText = this.state.theme === 'dark' ? '🌙' : '☀';
        themeToggleIcon.classList.add('anim-rotate');
        localStorage.setItem('theme', this.state.theme);
        this.applyTheme();
        setTimeout(() => {
            themeToggleIcon.classList.remove('anim-rotate');
        }, 500);
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

  app.toggleFullScreen = function toggleFullScreen(uid) {
        const container = document.getElementById(`audioContainer-${uid}`);
        if (!document.fullscreenElement) {
            if (container.requestFullscreen) {
                container.requestFullscreen();
            } else if (container.webkitRequestFullscreen) { /* Safari */
                container.webkitRequestFullscreen();
            } else if (container.msRequestFullscreen) { /* IE11 */
                container.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        }
  };

  app.applyTheme = function applyTheme() {
        document.documentElement.setAttribute('data-theme', this.state.theme);
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
        this.dom.header.style.display = this.state.viewMode === 'grid' ? 'none' : 'flex';
        if (this.state.viewMode === 'list') this.renderHeader();
  };

  app.initResize = function initResize() { this.renderHeader(); };

  app.toggleTree = function toggleTree(el) {
        const child = el.parentElement.nextElementSibling;
        child.classList.toggle('open');
        el.classList.toggle('rotated');
    };
}
