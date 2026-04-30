// 交互模块：菜单、主题、视图设置和清空输入动画。
function attachInteractionMethods(app) {
  app.animateClear = function animateClear() {
        const input = this.dom.address;
        const text = input.value;
        if (!text) return;

        const rect = input.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(input);

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

        const chars = text.split('');
        const totalChars = chars.length;

        chars.forEach((char, index) => {
            const span = document.createElement('span');
            span.textContent = char;
            span.className = 'flying-char';

            const reverseIndex = totalChars - 1 - index;
            span.style.animationDelay = `${reverseIndex * 0.03}s`;

            overlay.appendChild(span);
        });

        document.body.appendChild(overlay);

        input.classList.add('input-animating');

        input.value = '';
        input.focus();

        const totalTime = (chars.length * 30) + 600;

        setTimeout(() => {
            overlay.remove();
            input.classList.remove('input-animating');
        }, totalTime);
    };

  app.toggleViewMenu = function toggleViewMenu(e) {
        e.stopPropagation();
        this.dom.settingsMenu.classList.remove('show');
        this.dom.viewMenu.classList.toggle('show');
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
