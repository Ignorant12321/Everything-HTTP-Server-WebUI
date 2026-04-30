// 生命周期模块：初始化主题、菜单、事件和默认路径。



export function attachLifecycleMethods(app) {

  app.init = function init() {
        this.applyTheme();          // 应用主题样式（亮色/深色主题）
        this.updateMenusUI();       // 更新菜单UI状态（如视图菜单、设置菜单的选中状态）
        this.loadDrives();          // 加载系统驱动器/磁盘列表（如C盘、D盘、E盘等）
        this.renderFavorites();     // 渲染收藏列表（从本地存储读取并展示收藏的文件/文件夹）
        this.initResize();          // 初始化元素大小调整功能（如列表列宽、面板尺寸调整）
        this.initDragHandles();     // 初始化拖拽手柄（如侧边栏、预览面板的拖拽调整手柄）
        this.initSidebarSwipe();    // 初始化侧边栏滑动功能（如侧边栏的左滑关闭）
        this.initSubtitleHandler(); // 初始化字幕处理逻辑（用于视频字幕加载）

        // 绑定回车搜索
        this.dom.address.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.navigateTo(this.dom.address.value.trim());
        });

        // 绑定清除按钮
        this.dom.clearBtn.addEventListener('click', () => {
            this.animateClear();
        });


        document.getElementById('btnPreview').addEventListener('click', () => {
            if (this.state.selectedItem) this.handleOpenAction(this.state.selectedItem);
        });
        document.getElementById('btnDownload').addEventListener('click', () => {
            if (this.state.selectedItem) this.triggerDownload(this.state.selectedItem);
        });

        // 点击外部关闭菜单
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.flyout-menu') && !e.target.closest('.icon-btn')) {
                this.dom.viewMenu.classList.remove('show');
                this.dom.settingsMenu.classList.remove('show');
                if (window.innerWidth <= 768 &&
                    !e.target.closest('.sidebar') &&
                    !e.target.closest('#mobileMenuBtn')) {
                    this.dom.sidebar.classList.remove('show-mobile');
                }
            }
        });

        // 默认加载路径
        this.navigateTo(this.config.defaultPath);
    };

}
