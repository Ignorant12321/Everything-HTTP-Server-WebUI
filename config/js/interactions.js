// 交互模块：菜单、主题、视图设置和清空输入动画。
export function attachInteractionMethods(app) {
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

            // ##########
            // 修改点 1：方向改为从右往左
            // 最后一个字 (index = totalChars-1) 延迟为 0，最先飞
            // 第一个字 (index = 0) 延迟最大，最后飞
            // ##########
            const reverseIndex = totalChars - 1 - index;
            span.style.animationDelay = `${reverseIndex * 0.03}s`;

            overlay.appendChild(span);
        });

        document.body.appendChild(overlay);

        // ##########
        // 修改点 2：添加类名，隐藏 input 的 placeholder，防止文字重叠
        // ##########
        input.classList.add('input-animating');

        input.value = '';
        input.focus();

        const totalTime = (chars.length * 30) + 600;

        setTimeout(() => {
            overlay.remove();
            // 动画结束，移除隐藏类，恢复显示 placeholder
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
    },

    /* ##########
    // 收藏功能
    ########## */

    // 渲染收藏列表;

  app.setView = function setView(mode) {
        this.state.viewMode = mode;                  // 更新内存中的视图模式状态
        localStorage.setItem('viewMode', mode);      // 保存到本地存储（刷新后保留设置）
        this.updateMenusUI();                        // 同步视图菜单的选中状态
        this.renderList();                           // 重新渲染文件列表（应用新视图样式）
    },

    // 切换主题模式（亮色/暗色）;

  app.toggleTheme = function toggleTheme() {
        this.state.theme = this.state.theme === 'dark' ? 'light' : 'dark';
        themeToggleIcon.innerText = this.state.theme === 'dark' ? '🌙' : '☀';
        themeToggleIcon.classList.add('anim-rotate');
        localStorage.setItem('theme', this.state.theme);
        this.applyTheme();
        setTimeout(() => {
            themeToggleIcon.classList.remove('anim-rotate');
        }, 500);
    },

    // 切换是否显示隐藏文件/文件夹;

  app.toggleHidden = function toggleHidden() {
        this.state.showHidden = !this.state.showHidden;
        localStorage.setItem('showHidden', this.state.showHidden);
        this.updateMenusUI();
        this.fetchData();   // 重新请求文件数据（生效隐藏文件筛选）
    },

    // 切换是否启用文件信息复制功能;

  app.toggleCopyInfo = function toggleCopyInfo() {
        this.state.enableCopy = !this.state.enableCopy;
        localStorage.setItem('enableCopy', this.state.enableCopy);
        this.updateMenusUI();
        if (this.state.selectedItem) this.renderDetails(this.state.selectedItem);             // 如果有选中的文件项，重新渲染详情面板（让复制按钮状态同步）
    },

    // 设置文件打开方式（浮层/新窗口）;

  app.setOpenMethod = function setOpenMethod(mode) {
        this.state.openMethod = mode;
        localStorage.setItem('openMethod', mode);
        this.updateMenusUI();
    },
    // 全屏切换;

  app.toggleFullScreen = function toggleFullScreen(uid) {
        const container = document.getElementById(`audioContainer-${uid}`);
        if (!document.fullscreenElement) {
            // 进入全屏
            if (container.requestFullscreen) {
                container.requestFullscreen();
            } else if (container.webkitRequestFullscreen) { /* Safari */
                container.webkitRequestFullscreen();
            } else if (container.msRequestFullscreen) { /* IE11 */
                container.msRequestFullscreen();
            }
        } else {
            // 退出全屏
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        }
    },


    /* 应用主题样式（亮色/暗色主题切换核心方法）*/
    // 给文档根元素（<html>）设置data-theme属性，值为当前state中的theme（light/dark）
    // CSS中可通过[data-theme="light"]/[data-theme="dark"]匹配不同主题样式;

  app.applyTheme = function applyTheme() {
        document.documentElement.setAttribute('data-theme', this.state.theme);
    },

    /* 更新菜单UI状态（同步视图/设置相关的选中状态、样式）*/;

  app.updateMenusUI = function updateMenusUI() {
        // 1. 视图模式菜单选中状态（网格/列表）：通过透明度区分选中项（1=选中，0=未选中）
        document.getElementById('checkGrid').style.opacity = this.state.viewMode === 'grid' ? 1 : 0; // 网格视图选中态
        document.getElementById('checkList').style.opacity = this.state.viewMode === 'list' ? 1 : 0;  // 列表视图选中态
        // 2. 设置项激活状态（显示隐藏文件/复制功能）：通过active类切换选中样式
        document.getElementById('optShowHidden').classList.toggle('active', this.state.showHidden); // 显示隐藏文件选项
        document.getElementById('optCopyInfo').classList.toggle('active', this.state.enableCopy);   // 启用复制功能选项
        // 3. 文件打开方式选中状态（浮层/新窗口）：通过透明度区分选中项
        document.getElementById('checkOverlay').style.opacity = this.state.openMethod === 'overlay' ? 1 : 0;    // 浮层打开选中态
        document.getElementById('checkNewWin').style.opacity = this.state.openMethod === 'newWindow' ? 1 : 0; // 新窗口打开选中态
        // 4. 切换文件列表容器的视图样式（网格/列表）
        this.dom.list.className = this.state.viewMode === 'grid' ? 'view-grid' : '';
        // 5. 列表视图时显示列标题，网格视图时隐藏列标题
        this.dom.header.style.display = this.state.viewMode === 'grid' ? 'none' : 'flex';
        // 6. 列表视图下重新渲染列标题（保证列宽/排序状态同步）
        if (this.state.viewMode === 'list') this.renderHeader();
    },

    // --- 列宽调整逻辑 ---;

  app.initResize = function initResize() { this.renderHeader(); };

  app.toggleTree = function toggleTree(el) {
        const child = el.parentElement.nextElementSibling;
        child.classList.toggle('open');
        el.classList.toggle('rotated');
    };
}
