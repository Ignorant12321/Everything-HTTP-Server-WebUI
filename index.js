

/* ##########
// 变量定义
########## */

const app = {
    config: {
        // 默认路径 Defaulut Path
        defaultPath: 'D:\\Data\\Share',
    },
    // 应用核心状态管理：存储页面所有动态数据和配置项
    state: {
        currentPath: '',               // 当前浏览的文件路径
        items: [],                     // 当前路径下的文件/文件夹列表数据
        selectedItem: null,            // 当前选中的文件/文件夹项
        targetFile: null,              // 目标操作文件（如预览、下载的文件）
        offset: 0,                     // 分页偏移量（用于加载更多数据）
        count: 100,                    // 每页加载的文件数量
        sortCol: 'name',               // 当前排序的列名（name/type/size/date）
        sortAsc: 1,                    // 排序方向：1=升序，-1=降序
        total: 0,                      // 当前路径下的文件总数（用于分页计算）
        history: [],                   // 浏览历史路径列表
        historyIndex: -1,              // 浏览历史当前索引（用于前进/后退）
        isPinned: false,                 // 是否锁定。不允许拖动播放器
        viewMode: localStorage.getItem('viewMode') || 'list', // 视图模式：list(列表)/grid(网格)，优先读取本地存储
        showHidden: localStorage.getItem('showHidden') === 'true', // 是否显示隐藏文件/文件夹
        enableCopy: localStorage.getItem('enableCopy') !== 'false', // 是否启用文件复制功能
        openMethod: localStorage.getItem('openMethod') || 'overlay', // 文件打开方式：overlay(浮层)/newtab(新标签)
        theme: localStorage.getItem('theme') || 'light', // 主题模式：light(亮色)/dark(暗色)
        isNavigatingHistory: false,    // 是否正在执行历史记录导航（前进/后退），用于防止重复操作
        imageZoom: 1,                  // 图片预览的缩放比例（1=100%）
        imagePos: { x: 0, y: 0 },      // 图片预览的拖拽偏移位置（x/y轴）
        columns: [                     // 文件列表的列配置（表格视图）
            { id: 'icon', width: 40, label: '', resize: false },    // 图标列：宽度40px，不可调整
            { id: 'name', width: 300, label: '名称', resize: true, grow: true }, // 名称列：宽度300px，可调整、可自适应拉伸
            { id: 'type', width: 100, label: '类型', resize: true }, // 类型列：宽度100px，可调整
            { id: 'size', width: 100, label: '大小', resize: true }, // 大小列：宽度100px，可调整
            { id: 'date', width: 160, label: '修改日期', resize: true } // 修改日期列：宽度160px，可调整
        ],
        openFiles: [],                 // 已打开的文件列表（多文件预览）
        activeFileIndex: -1,           // 当前激活的预览文件索引（-1表示无激活）
        drag: {                        // 拖拽相关状态（如侧边栏/面板拖拽调整大小）
            active: false,             // 是否处于拖拽状态
            startPos: 0,               // 拖拽起始位置
            currentTranslate: 0        // 当前拖拽偏移量
        },
        favorites: JSON.parse(localStorage.getItem('favorites') || '[]'), // 收藏的文件/文件夹列表，本地存储持久化
        loopMode: 'none'               // 图片预览循环模式：none(无循环)/one(单张循环)
    },

    // DOM 元素缓存：提前获取页面核心元素，避免重复DOM查询，提升性能
    dom: {
        address: document.getElementById('addressInput'),       // 地址栏输入框
        list: document.getElementById('fileList'),             // 文件列表容器
        header: document.getElementById('colHeader'),          // 文件列表：列标题容器
        details: document.getElementById('detailsPane'),       // 详情面板
        driveList: document.getElementById('driveList'),       // 磁盘列表容器
        favList: document.getElementById('favList'),           // 收藏列表容器
        previewBox: document.getElementById('previewBox'),     // 文件预览容器
        detailIcon: document.getElementById('detailIcon'),     // 详情面板中的文件图标容器
        pageInput: document.getElementById('pageInput'),       // 分页页码输入框
        totalPages: document.getElementById('totalPages'),     // 总页数显示元素
        btnRefresh: document.getElementById('btnRefresh'),       // 刷新按钮
        themeToggleIcon: document.getElementById('themeToggleIcon'), // 主题切换图标
        viewMenu: document.getElementById('viewMenu'),         // 视图模式菜单容器
        settingsMenu: document.getElementById('settingsMenu'), // 设置菜单容器
        viewerModal: document.getElementById('viewerModal'),   // 文件预览弹窗：浮层
        viewerContent: document.getElementById('viewerContent'), // 预览弹窗：内容区域
        viewerTitle: document.getElementById('viewerTitle'),   // 预览弹窗：标题
        viewerDownloadBtn: document.getElementById('viewerDownloadBtn'), // 预览弹窗：下载按钮
        viewerOpenBtn: document.getElementById('viewerOpenBtn'), // 预览弹窗：打开按钮
        viewerSubBtn: document.getElementById('viewerSubBtn'),  // 预览弹窗：字幕加载按钮
        subtitleInput: document.getElementById('subtitleInput'), // 字幕文件输入
        viewerFavBtn: document.getElementById('viewerFavBtn'), // 预览弹窗：收藏按钮
        sidebar: document.getElementById('sidebar'),           // 左侧：侧边栏容器
        statusLeft: document.getElementById('statusLeft'),     // 左侧状态栏（显示文件数量等）
        toast: document.getElementById('copyToast'),           // 复制成功提示框
        taskBar: document.getElementById('taskBar'),           // 任务栏容器
        clearBtn: document.getElementById('clearSearchBtn'),    // 搜索/地址栏清除按钮
    },

    // 初始化应用核心UI和功能（启动时执行）
    init() {
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
    },
    initSubtitleHandler() {
        // 绑定文件选择变化事件
        this.dom.subtitleInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleSubtitleFile(file);
            }
            // 重置 input 允许重复选择同一文件
            e.target.value = '';
        });
    },
    // --- 新增：清除文字动画 ---
    animateClear() {
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
    },
    triggerSubtitleLoad() {
        this.dom.subtitleInput.click();
    },

    handleSubtitleFile(file) {
        if (this.state.activeFileIndex === -1) return;
        const currentViewerFile = this.state.openFiles[this.state.activeFileIndex];

        // 简单判断后缀
        const name = file.name.toLowerCase();
        const type = name.endsWith('.srt') ? 'srt' : 'vtt';
        const objectUrl = URL.createObjectURL(file);

        // 调用加载逻辑
        // 构造一个模拟的 select option 结构或直接调用加载
        const fakeSelect = {
            value: objectUrl,
            options: [{ dataset: { type: type }, selectedIndex: 0 }],
            selectedIndex: 0
        };

        // 直接复用 logic
        this.changeSubtitle({ value: objectUrl, dataset: { type: type } }, currentViewerFile.uniqueId, true);
        this.showToast(`已加载字幕: ${file.name}`);
    },

    // --- 侧边栏/详情页拖拽逻辑 ---
    initDragHandles() {
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
    // --- 【新增】侧边栏左滑关闭逻辑 ---
    initSidebarSwipe() {
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
    },

    startDrag(e, mode) {
        this.state.drag.active = true;
        this.state.drag.startPos = mode === 'desk' ? e.clientX : e.clientY;
        this.dom.details.style.transition = 'none'; // 拖动时移除过渡
    },

    onDragMove(e, mode) {
        if (!this.state.drag.active) return;
        const current = mode === 'desk' ? e.clientX : e.clientY;
        const delta = current - this.state.drag.startPos;

        // 限制只能向关闭方向拖动
        if (delta < 0) return;

        this.state.drag.currentTranslate = delta;
        const transform = mode === 'desk' ? `translateX(${delta}px)` : `translateY(${delta}px)`;
        this.dom.details.style.transform = transform;
    },

    endDrag(mode) {
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

    // --- 菜单和侧边栏切换 ---
    toggleViewMenu(e) {
        e.stopPropagation();
        this.dom.settingsMenu.classList.remove('show');
        this.dom.viewMenu.classList.toggle('show');
    },
    toggleSettingsMenu(e) {
        e.stopPropagation();
        this.dom.viewMenu.classList.remove('show');
        this.dom.settingsMenu.classList.toggle('show');
    },
    toggleSidebar() {
        this.dom.sidebar.classList.toggle('show-mobile');
    },

    /* ##########
    // 收藏功能
    ########## */

    // 渲染收藏列表
    renderFavorites() {
        const list = this.dom.favList; // 获取侧边栏收藏列表容器
        // 无收藏项时显示空状态提示
        if (this.state.favorites.length === 0) {
            list.innerHTML = `<div style="padding:4px 12px; color:var(--text-secondary); font-size:12px">暂无收藏文件</div>`;
            return;
        }
        let html = '';
        // 遍历所有收藏项，生成单个收藏项DOM
        this.state.favorites.forEach(fav => {
            // 兼容旧数据：获取是否为文件夹（旧收藏项无isFolder则默认false）
            const isFolder = fav.isFolder || false;
            let path = fav.path || '';
            if (!path && isFolder && fav.url) {
                // url路径格式转换：移除开头/，将/替换为\（适配本地路径格式）
                path = fav.url.replace(/^\//, '').replace(/\//g, '\\');
            }
            // 根据类型（文件/文件夹）获取对应图标
            const icon = this.getFileIcon(fav.name, isFolder);
            // 安全处理：转义特殊字符（反斜杠/单引号），防止HTML注入和字符串解析错误
            const safeUrl = fav.url.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            const safeName = fav.name.replace(/'/g, "\\'");
            const safePath = path.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            // 拼接收藏项
            html += `<div class="sidebar-item" onclick="app.openFavorite('${safeUrl}', '${safeName}', ${isFolder}, '${safePath}')">
                <span class="file-icon" style="font-size:16px">${icon}</span> ${fav.name}
            </div>`;
        });
        // 将拼接好的HTML渲染到收藏列表容器
        list.innerHTML = html;
    },

    // 打开收藏的文件/文件夹
    /**
     * @param {string} url - 收藏项的访问地址（安全处理后）
     * @param {string} name - 收藏项名称（安全处理后）
     * @param {boolean} isFolder - 是否为文件夹（true/false）
     * @param {string} path - 文件夹物理路径
     * 核心逻辑：文件夹跳转路径，文件执行打开操作
     */
    openFavorite(url, name, isFolder, path) {
        if (isFolder) {
            // 确定文件夹目标路径：优先取传入的path，无则从url转换
            let targetPath = path;
            if (!targetPath && url) {
                targetPath = url.replace(/^\//, '').replace(/\//g, '\\');
            }

            // 有有效路径时，跳转到该文件夹路径
            if (targetPath) {
                this.navigateTo(targetPath, true);
            }
        } else {
            // 文件类型：调用通用打开逻辑，传入名称和fakeUrl
            this.handleOpenAction({ name: name, path: '', fakeUrl: url });
        }
    },

    // 切换当前预览文件的收藏状态（预览弹窗中触发）
    // 注：当前预览默认按文件处理（isFolder=false）/
    toggleFavoriteCurrent() {
        // 无激活的预览文件时，直接返回（避免空操作）
        if (this.state.activeFileIndex === -1) return;
        // 获取当前激活的预览文件
        const file = this.state.openFiles[this.state.activeFileIndex];
        // 判断该文件是否已收藏（通过url唯一标识）
        const exists = this.state.favorites.some(f => f.url === file.url);
        if (exists) {
            this.state.favorites = this.state.favorites.filter(f => f.url !== file.url);
        } else {
            this.state.favorites.push({
                name: file.name,
                url: file.url,
                isFolder: false
            });
        }
        // 保存收藏列表到本地存储
        localStorage.setItem('favorites', JSON.stringify(this.state.favorites));
        this.renderFavorites();
        this.updateViewerFavIcon();
    },
    // 从详情面板切换文件/文件夹的收藏状态
    toggleFavoriteFromDetail() {
        if (!this.state.selectedItem) return;
        const item = this.state.selectedItem;
        // 获取选中项的访问地址（优先取fakeUrl，无则调用getFileUrl生成）
        const url = item.fakeUrl || this.getFileUrl(item);
        // 判断该项是否已收藏（通过url唯一标识）
        const exists = this.state.favorites.some(f => f.url === url);

        if (exists) {
            this.state.favorites = this.state.favorites.filter(f => f.url !== url);
        } else {
            // 判断是否为文件夹：
            // - 无size且size≠0（文件夹无大小） 或 type=folder 则判定为文件夹
            const isDir = (!item.size && item.size !== 0) || item.type === 'folder';
            // 拼接文件夹完整物理路径：path + 名称（文件则仅保存名称）
            const fullPath = item.path ? `${item.path}\\${item.name}` : item.name;
            // 未收藏：添加到收藏列表（保存名称、地址、物理路径、类型）
            this.state.favorites.push({
                name: item.name,
                url: url,
                path: fullPath, // 保存物理路径，用于打开时跳转
                isFolder: isDir // 保存类型标识，区分文件/文件夹
            });
        }
        // 保存收藏列表到本地存储
        localStorage.setItem('favorites', JSON.stringify(this.state.favorites));
        this.renderFavorites();
        this.renderDetails(item);
    },
    // 更新预览弹窗中的收藏图标样式
    updateViewerFavIcon() {
        if (this.state.activeFileIndex === -1) return;
        const file = this.state.openFiles[this.state.activeFileIndex]; // 获取当前预览文件
        const exists = this.state.favorites.some(f => f.url === file.url); // 判断是否已收藏
        const btn = this.dom.viewerFavBtn; // 获取预览弹窗收藏按钮
        if (exists) {
            btn.innerHTML = svg_favorite_filled;
        } else {
            btn.innerHTML = svg_favorite_outline;
        }
    },



    /* ##########
    // 设置选项
    ########## */

    // 设置文件列表视图模式（列表/网格）
    setView(mode) {
        this.state.viewMode = mode;                  // 更新内存中的视图模式状态
        localStorage.setItem('viewMode', mode);      // 保存到本地存储（刷新后保留设置）
        this.updateMenusUI();                        // 同步视图菜单的选中状态
        this.renderList();                           // 重新渲染文件列表（应用新视图样式）
    },

    // 切换主题模式（亮色/暗色）
    toggleTheme() {
        this.state.theme = this.state.theme === 'dark' ? 'light' : 'dark';
        themeToggleIcon.innerText = this.state.theme === 'dark' ? '🌙' : '☀';
        themeToggleIcon.classList.add('anim-rotate');
        localStorage.setItem('theme', this.state.theme);
        this.applyTheme();
        setTimeout(() => {
            themeToggleIcon.classList.remove('anim-rotate');
        }, 500);
    },

    // 切换是否显示隐藏文件/文件夹
    toggleHidden() {
        this.state.showHidden = !this.state.showHidden;
        localStorage.setItem('showHidden', this.state.showHidden);
        this.updateMenusUI();
        this.fetchData();   // 重新请求文件数据（生效隐藏文件筛选）
    },

    // 切换是否启用文件信息复制功能
    toggleCopyInfo() {
        this.state.enableCopy = !this.state.enableCopy;
        localStorage.setItem('enableCopy', this.state.enableCopy);
        this.updateMenusUI();
        if (this.state.selectedItem) this.renderDetails(this.state.selectedItem);             // 如果有选中的文件项，重新渲染详情面板（让复制按钮状态同步）
    },

    // 设置文件打开方式（浮层/新窗口）
    setOpenMethod(mode) {
        this.state.openMethod = mode;
        localStorage.setItem('openMethod', mode);
        this.updateMenusUI();
    },
    // 全屏切换
    toggleFullScreen(uid) {
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
    // CSS中可通过[data-theme="light"]/[data-theme="dark"]匹配不同主题样式
    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.state.theme);
    },

    /* 更新菜单UI状态（同步视图/设置相关的选中状态、样式）*/
    updateMenusUI() {
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

    // --- 列宽调整逻辑 ---
    initResize() { this.renderHeader(); },
    renderHeader() {
        this.dom.header.innerHTML = '';
        this.state.columns.forEach((col, idx) => {
            const cell = document.createElement('div');
            cell.className = 'header-cell';
            cell.style.width = col.width + 'px';
            if (col.grow) cell.style.flex = '1';

            const span = document.createElement('span');
            span.textContent = col.label;
            cell.appendChild(span);

            if (col.id !== 'icon') {
                cell.onclick = () => app.sort(col.id === 'type' ? 'extension' : (col.id === 'date' ? 'date_modified' : col.id));
            }

            if (col.resize) {
                const handle = document.createElement('div');
                handle.className = 'resize-handle';
                handle.onmousedown = (e) => { e.stopPropagation(); this.startResize(e, idx); };
                handle.onclick = (e) => e.stopPropagation();
                cell.appendChild(handle);
            }
            this.dom.header.appendChild(cell);
        });
    },
    startResize(e, colIndex) {
        e.preventDefault();
        const startX = e.pageX;
        const startWidth = this.state.columns[colIndex].width;
        if (this.state.columns[colIndex].grow) {
            const cell = this.dom.header.children[colIndex];
            const rect = cell.getBoundingClientRect();
            this.state.columns[colIndex].grow = false;
            this.state.columns[colIndex].width = rect.width;
        }
        document.body.style.cursor = 'col-resize';
        const onMove = (moveEvent) => {
            const diff = moveEvent.pageX - startX;
            const newWidth = Math.max(50, startWidth + diff);
            this.state.columns[colIndex].width = newWidth;
            this.renderHeader();
            this.renderList();
        };
        const onUp = () => {
            document.body.style.cursor = '';
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    },

    // --- 核心导航逻辑 ---
    navigateTo(path, isExplicitFolder = false) {
        path = path ? path.replace(/^"|"$/g, '').trim() : '';

        if (path === '') {
            this.state.currentPath = this.config.defaultPath;
            path = this.config.defaultPath;
        }

        if (!this.state.isNavigatingHistory) {
            if (this.state.historyIndex < this.state.history.length - 1) {
                this.state.history = this.state.history.slice(0, this.state.historyIndex + 1);
            }
            if (this.state.history[this.state.historyIndex] !== path) {
                this.state.history.push(path);
                this.state.historyIndex++;
            }
        }

        this.state.currentPath = path;
        this.state.offset = 0;
        this.dom.address.value = path;
        this.state.selectedItem = null;
        this.renderDetails(null);
        document.getElementById('btnBack').disabled = this.state.historyIndex <= 0;
        document.getElementById('btnForward').disabled = this.state.historyIndex >= this.state.history.length - 1;

        this.fetchData(isExplicitFolder);
        this.state.isNavigatingHistory = false;
    },
    goBack() {
        if (this.state.historyIndex > 0) {
            this.state.historyIndex--;
            this.state.isNavigatingHistory = true;
            this.navigateTo(this.state.history[this.state.historyIndex], true);
        }
    },
    goForward() {
        if (this.state.historyIndex < this.state.history.length - 1) {
            this.state.historyIndex++;
            this.state.isNavigatingHistory = true;
            this.navigateTo(this.state.history[this.state.historyIndex], true);
        }
    },
    goUp() {
        if (!this.state.currentPath || !/^[a-zA-Z]:\\|^\\\\/.test(this.state.currentPath)) {
            this.navigateTo(''); return;
        }
        const parts = this.state.currentPath.split('\\');
        while (parts.length && !parts[parts.length - 1]) parts.pop();
        parts.pop();
        if (parts.length === 0) { this.navigateTo(''); return; }
        let parent = parts.join('\\');
        if (/^[a-zA-Z]:$/.test(parent)) parent += '\\';
        this.navigateTo(parent, true); // 向上一定是进入文件夹
    },
    refresh() {
        btnRefresh.classList.add('anim-rotate');
        setTimeout(() => {
            btnRefresh.classList.remove('anim-rotate');
        }, 500);
        this.fetchData();
    },

    /* 异步加载系统驱动器/磁盘列表（核心功能：获取可访问的磁盘分区并渲染到侧边栏）*/
    //   1. 非本地/Blob协议下，通过接口请求真实磁盘列表；
    //   2. 本地/Blob协议（如本地调试）或请求失败时，渲染默认的C盘作为演示；
    //   3. 渲染后的磁盘项支持点击跳转对应路径。
    async loadDrives() {
        try {
            // 本地文件协议(file:)或Blob协议下，直接抛出DEMO异常（避免接口请求）
            if (window.location.protocol === 'file:' || window.location.protocol === 'blob:') throw new Error('DEMO');

            // 异步请求后端接口，获取根目录（磁盘列表）数据
            // 请求参数：search=root: 表示查询根驱动器，json=1 返回JSON格式，count=100 限制返回数量
            const res = await fetch(`/?search=root:&json=1&count=100`);
            const data = await res.json(); // 解析接口返回的JSON数据

            // 拼接磁盘列表的HTML字符串
            let html = '';
            // 遍历磁盘列表（兼容无数据的情况：data.results为空则遍历空数组）
            (data.results || []).forEach(d => {
                // 处理磁盘路径：盘符结尾加反斜杠（如C: → C:\），非盘符保持原路径
                const path = d.name.endsWith(':') ? d.name + '\\' : d.name;
                // 处理磁盘显示标签：盘符显示为「Disk: 盘符」（如C: → Disk: C），非盘符显示原名
                const label = d.name.endsWith(':') ? `Disk: ${d.name.charAt(0)}` : d.name;
                // 拼接单个磁盘项的HTML：
                html += `<div class="sidebar-item" onclick="app.navigateTo('${path.replace(/\\/g, '\\\\')}', true)"><span class="file-icon" style="font-size:16px">${svg_disk}</span> ${label}</div>`;
            });
            // 将拼接好的HTML渲染到侧边栏磁盘列表容器
            this.dom.driveList.innerHTML = html;
        } catch (e) {
            // 异常处理：仅当不是DEMO异常时打印错误（避免本地调试时的无用报错）
            if (e.message !== 'DEMO') console.error(e);
            // 渲染默认的C盘项（本地调试/请求失败时的兜底方案）
            this.dom.driveList.innerHTML = `<div class="sidebar-item" onclick="app.navigateTo('C:\\\\', true)"><span class="file-icon">${svg_disk}</span> Disk: C</div>`;
        }
    },

    toggleTree(el) {
        const child = el.parentElement.nextElementSibling;
        child.classList.toggle('open');
        el.classList.toggle('rotated');
    },

    async fetchData(isExplicitFolder) {
        this.dom.list.innerHTML = `<div class="center-msg">⏳ 加载中...</div>`;
        try {
            if (window.location.protocol === 'file:' || window.location.protocol === 'blob:') throw new Error('DEMO');

            let query = this.state.currentPath;

            if (query === 'root:') {
            } else if (isExplicitFolder) {
                query = `parent:"${query}"`;
            } else {
                if (/^[a-zA-Z]:\\|^\\\\/.test(query)) {
                    const knownExts = ['exe', 'jpg', 'png', 'txt', 'mp3', 'mp4', 'pdf', 'doc', 'docx', 'zip', 'rar', 'lrc'];
                    const ext = query.split('.').pop().toLowerCase();
                    if (knownExts.includes(ext) && query.split('\\').pop().includes('.')) {
                        query = `"${query}"`;
                    } else {
                        query = `parent:"${query}"`;
                    }
                }
            }

            if (!this.state.showHidden) query += ' !attrib:H';

            const params = new URLSearchParams({
                search: query,
                offset: this.state.offset,
                count: this.state.count,
                sort: this.state.sortCol,
                ascending: this.state.sortAsc,
                json: 1,
                path_column: 1,
                size_column: 1,
                date_modified_column: 1
            });

            const res = await fetch(`/?${params}`);
            const data = await res.json();
            this.state.items = data.results || [];
            this.state.total = parseInt(data.totalResults) || 0;
            this.renderList();
            this.updatePagination();
        } catch (e) {
            if (e.message === 'DEMO') this.mockData();
            else this.dom.list.innerHTML = `<div class="center-msg" style="color:red">连接失败</div>`;
        }
    },

    renderList() {
        const list = this.dom.list;
        list.innerHTML = '';
        if (this.state.items.length === 0) {
            list.innerHTML = `<div class="center-msg">无结果</div>`;
            return;
        }

        const isGrid = this.state.viewMode === 'grid';
        let targetEl = null;

        this.state.items.forEach((item, index) => {
            const isDir = (!item.size && item.size !== 0) || item.type === 'folder';

            const div = document.createElement('div');
            div.className = 'file-row anim-entry'; // 添加 anim-entry 类
            // 核心优化：根据 index 设置延迟，最大延迟 0.2s 避免太慢
            div.style.animationDelay = `${Math.min(index * 0.03, 0.2)}s`;
            if (this.state.selectedItem === item) div.classList.add('selected');

            if (this.state.targetFile && item.name === this.state.targetFile) {
                div.classList.add('selected');
                this.state.selectedItem = item;
                this.renderDetails(item);
                targetEl = div;
            }
            // 核心交互逻辑更新
            let longPressTimer;
            const startLongPress = () => {
                longPressTimer = setTimeout(() => {
                    // 长按逻辑：显示详情
                    this.selectItem(index);
                    this.dom.details.classList.add('active'); // 强制呼出详情
                    // 可能需要震动反馈 navigator.vibrate(50)
                }, 500);
            };
            const clearLongPress = () => {
                if (longPressTimer) clearTimeout(longPressTimer);
            };

            // 绑定触摸事件
            div.addEventListener('touchstart', (e) => {
                // 不阻止默认，否则无法滚动
                startLongPress();
            }, { passive: true });

            div.addEventListener('touchend', clearLongPress);
            div.addEventListener('touchmove', clearLongPress);


            div.onclick = (e) => {
                e.stopPropagation();

                if (window.innerWidth <= 768) {
                    // 移动端逻辑
                    if (isDir) {
                        // 单击文件夹：打开
                        const next = item.path ? `${item.path}\\${item.name}` : item.name;
                        this.navigateTo(next, true);
                    } else {
                        // 单击文件：仅选中，不操作，不自动弹出详情（长按才弹出）
                        this.selectItem(index);
                    }
                } else {
                    // PC端逻辑 (保持原样: 单击选中+详情)
                    this.selectItem(index);
                    // PC端详情面板是常驻或跟随的，不需要特殊 toggle
                    if (this.state.viewMode === 'list') {
                        // this.dom.details.classList.add('active');
                    }
                }
            };

            div.ondblclick = (e) => {
                e.stopPropagation();
                if (isDir) {
                    const next = item.path ? `${item.path}\\${item.name}` : item.name;
                    this.navigateTo(next, true);
                } else {
                    this.handleOpenAction(item);
                }
            };

            const icon = this.getFileIcon(item.name, isDir);
            const sizeStr = isDir ? '' : this.formatSize(item.size);
            const dateVal = item.date_modified || item.dm || item.dateModified;
            const dateStr = this.parseDate(dateVal);
            const ext = isDir ? '文件夹' : (item.name.split('.').pop().toUpperCase() + ' 文件');

            if (isGrid) {
                div.innerHTML = `<div class="cell-icon">${icon}</div><div class="cell-name" title="${item.name}">${item.name}</div>`;
            } else {
                div.innerHTML = `
                            <div class="cell" style="width:${this.state.columns[0].width}px"><span class="cell-icon" style="font-size:18px">${icon}</span></div>
                            <div class="cell cell-name" style="width:${this.state.columns[1].width}px; ${this.state.columns[1].grow ? 'flex:1' : ''}">${item.name}</div>
                            <div class="cell cell-type" style="width:${this.state.columns[2].width}px">${ext}</div>
                            <div class="cell cell-meta" style="width:${this.state.columns[3].width}px">${sizeStr}</div>
                            <div class="cell cell-meta" style="width:${this.state.columns[4].width}px">${dateStr}</div>
                        `;
            }
            list.appendChild(div);
        });

        if (targetEl) {
            targetEl.scrollIntoView({ block: 'center' });
            this.state.targetFile = null;
        }
    },

    getFileIcon(name, isDir) {
        if (isDir) return '📁';
        const ext = name.split('.').pop().toLowerCase();
        const map = {
            '🖼️': ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'],
            '🎵': ['mp3', 'wav', 'ogg', 'm4a', 'flac'],
            '🎬': ['mp4', 'webm', 'ogv', 'mov', 'mkv', 'avi'],
            '📦': ['zip', 'rar', '7z', 'tar', 'gz', 'iso'],
            '📝': ['txt', 'md', 'js', 'css', 'html', 'json', 'xml', 'log', 'c', 'cpp', 'h', 'java', 'py', 'rs', 'go', 'ts', 'tsx', 'ini', 'bat', 'sh', 'lrc', 'srt', 'vtt'],
            '📙': ['pdf'],
            '🚀': ['exe', 'msi']
        };
        for (let icon in map) {
            if (map[icon].includes(ext)) return icon;
        }
        return '📄';
    },

    formatSize(bytes) {
        if (bytes === undefined) return '';
        const k = 1024, sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    },

    parseDate(ts) {
        if (!ts) return '-';
        let d;
        let numTs = ts;
        if (typeof ts === 'string') {
            if (ts.includes('T')) {
                d = new Date(ts);
                if (!isNaN(d.getTime())) return this.formatDateObj(d);
            }
            if (/^\d+$/.test(ts)) {
                numTs = parseInt(ts, 10);
            }
        }
        if (typeof numTs === 'number') {
            if (numTs > 10000000000000000) {
                d = new Date((numTs / 10000) - 11644473600000);
            }
            else if (numTs > 1000000000000) {
                d = new Date(numTs);
            }
            else if (numTs > 0) {
                d = new Date(numTs * 1000);
            }
        }
        if (!d || isNaN(d.getTime()) || d.getFullYear() < 1970) return '-';
        return this.formatDateObj(d);
    },

    formatDateObj(d) {
        const pad = (n) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    },

    selectItem(index) {
        const rows = this.dom.list.children;
        for (let row of rows) row.classList.remove('selected');
        if (index !== null && rows[index]) {
            rows[index].classList.add('selected');
            const item = this.state.items[index];
            this.state.selectedItem = item;
            this.renderDetails(item);
        } else {
            this.state.selectedItem = null;
            this.renderDetails(null);
            if (window.innerWidth <= 768) this.closeDetails();
        }
    },
    bgClick(e) { if (e.target === this.dom.list) this.selectItem(null); },

    renderDetails(item) {
        const pane = this.dom.details;
        if (!item) { pane.classList.remove('active'); pane.style.transform = ''; return; }

        if (window.innerWidth > 768) {
            pane.classList.add('active');
        } else {
            // 移动端保持原状，除非手动激活
            // pane.classList.add('active');
            // pane.style.transform = '';
        }

        const isDir = (!item.size && item.size !== 0);
        const icon = this.getFileIcon(item.name, isDir);
        const fakeUrl = item.fakeUrl || this.getFileUrl(item); // Support favorites
        const ext = item.name.split('.').pop().toLowerCase();
        const imgs = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];

        if (!isDir && imgs.includes(ext)) {
            this.dom.previewBox.innerHTML = `<img src="${fakeUrl}" class="preview-img">`;
            this.dom.detailIcon.innerHTML = `<img src="${fakeUrl}">`;
        } else {
            this.dom.previewBox.innerHTML = icon;
            this.dom.detailIcon.innerHTML = icon;
            this.dom.detailIcon.style.display = 'flex';
            this.dom.detailIcon.style.alignItems = 'center';
            this.dom.detailIcon.style.justifyContent = 'center';
            this.dom.detailIcon.style.fontSize = '18px';
        }
        if (window.innerWidth > 768) {
            this.dom.detailIcon.innerHTML = icon;
            this.dom.detailIcon.style.display = 'flex';
            this.dom.detailIcon.style.alignItems = 'center';
            this.dom.detailIcon.style.justifyContent = 'center';
            this.dom.detailIcon.style.fontSize = '18px';
        }

        document.getElementById('detailName').textContent = item.name;

        // 更新详情页心形图标状态
        const favBtn = document.getElementById('detailFavBtn');
        const isFav = this.state.favorites.some(f => f.url === fakeUrl);
        if (isFav) {
            favBtn.innerHTML = svg_favorite_filled;
        } else {
            favBtn.innerHTML = svg_favorite_outline;
        }


        const renderValue = (id, val) => {
            const el = document.getElementById(id);
            el.textContent = val;
            if (this.state.enableCopy) {
                el.classList.add('copyable');
                el.onclick = () => this.copyText(val);
                el.title = "点击复制";
            } else {
                el.classList.remove('copyable');
                el.onclick = null;
                el.title = "";
            }
        };

        // 分离位置和完整路径
        const locationPath = item.path || 'Root';
        const fullPath = item.path ? `${item.path}\\${item.name}` : item.name;

        renderValue('detailLocation', locationPath);
        renderValue('detailPath', fullPath);
        renderValue('detailType', isDir ? '文件夹' : (ext.toUpperCase() + ' 文件'));

        const dateVal = item.date_modified || item.dm || item.dateModified;
        renderValue('detailDate', this.parseDate(dateVal));

        renderValue('detailSize', isDir ? '-' : this.formatSize(item.size));
    },

    closeDetails() {
        this.dom.details.classList.remove('active');
        this.dom.details.style.transform = '';
    },

    copyText(text) {
        // 优先使用 Clipboard API
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                this.showToast('已复制内容');
            }).catch(() => {
                this.fallbackCopyText(text); // 失败时回退
            });
        } else {
            this.fallbackCopyText(text);
        }
    },

    fallbackCopyText(text) {
        // 回退方案：创建隐藏输入框选中文本执行 copy 命令
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";  // 避免滚动
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            this.showToast('已复制内容');
        } catch (err) {
            this.showToast('复制失败');
        }
        document.body.removeChild(textArea);
    },

    showToast(msg) {
        const t = this.dom.toast;
        t.textContent = msg;
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 2000);
    },

    handleOpenAction(item) {
        const url = item.fakeUrl || this.getFileUrl(item);
        if (this.state.openMethod === 'newWindow') {
            window.open(url, '_blank');
        } else {
            this.openOverlay(item);
        }
    },
    triggerDownload(item) {
        const link = document.createElement('a');
        link.href = item.fakeUrl || this.getFileUrl(item);
        link.download = item.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    // --- 预览窗口逻辑 ---
    async openOverlay(item) {
        const url = item.fakeUrl || this.getFileUrl(item);
        const ext = item.name.split('.').pop().toLowerCase();

        const existingIndex = this.state.openFiles.findIndex(f => f.url === url);
        if (existingIndex !== -1) {
            this.activateFile(existingIndex);
            return;
        }

        const newFile = {
            name: item.name,
            url: url,
            ext: ext,
            type: this.getFileType(ext),
            content: null,
            uniqueId: 'file-' + Date.now()
        };

        this.state.openFiles.push(newFile);
        this.activateFile(this.state.openFiles.length - 1);
    },

    getFileType(ext) {
        const types = {
            img: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'],
            audio: ['mp3', 'wav', 'ogg', 'm4a', 'flac'],
            video: ['mp4', 'webm', 'ogv', 'mov', 'mkv', 'avi'],
            txt: ['txt', 'md', 'js', 'css', 'html', 'json', 'log', 'ini', 'bat', 'sh', 'c', 'cpp', 'h', 'java', 'py', 'rs', 'go', 'ts', 'tsx', 'lrc', 'srt', 'vtt', 'xml', 'yaml'],
            pdf: ['pdf']
        };
        for (const t in types) if (types[t].includes(ext)) return t;
        return 'unknown';
    },

    async activateFile(index) {
        this.state.activeFileIndex = index;
        this.renderTaskBar();
        this.updateViewerFavIcon(); // Update favorite icon state

        const file = this.state.openFiles[index];
        const modal = this.dom.viewerModal;
        const contentContainer = this.dom.viewerContent;
        // --- 音乐模式逻辑 ---
        if (file.type === 'audio') {
            modal.classList.add('music-mode');
        } else {
            modal.classList.remove('music-mode');
        }
        // --- 视频类型显示字幕按钮 ---
        if (file.type === 'video') {
            this.dom.viewerSubBtn.style.display = 'flex';
        } else {
            this.dom.viewerSubBtn.style.display = 'none';
        }

        this.state.imageZoom = 1; this.state.imagePos = { x: 0, y: 0 };
        this.dom.viewerTitle.textContent = file.name;
        this.dom.viewerDownloadBtn.href = file.url;
        this.dom.viewerDownloadBtn.download = file.name;
        this.dom.viewerOpenBtn.href = file.url;

        modal.classList.remove('minimized');
        modal.classList.add('open');

        const allFiles = contentContainer.querySelectorAll('.file-container');
        allFiles.forEach(el => el.classList.remove('active'));

        let currentFileContainer = document.getElementById(file.uniqueId);

        if (currentFileContainer) {
            currentFileContainer.classList.add('active');
            return;
        }

        const newContainer = document.createElement('div');
        newContainer.id = file.uniqueId;
        newContainer.className = 'file-container active';
        contentContainer.appendChild(newContainer);

        newContainer.innerHTML = '<div style="color:white">加载中...</div>';

        try {
            if (file.type === 'img') {
                newContainer.innerHTML = `
                            <div class="image-viewer-container" onwheel="app.zoomImage(event)" onmousedown="app.startDragImage(event)">
                                <img id="viewerImage-${file.uniqueId}" src="${file.url}" style="transform: translate(0px, 0px) scale(1);">
                            </div>
                        `;
            } else if (file.type === 'audio') {
                // --- 核心更新：构建增强型音频播放器 ---
                newContainer.innerHTML = this.buildAudioPlayerHTML(file);
                this.initAudioPlayer(newContainer, file);

            } else if (file.type === 'video') {
                // HEVC 检测提示逻辑
                let hevcWarning = '';
                if (file.ext === 'mkv' || file.ext === 'mp4') {
                    // hevcWarning = `<div style="padding:10px; color:#aaa; font-size:12px; text-align:center;">
                    //         如果播放失败(只有声音无画面)，可能是 HEVC(H.265) 编码。
                    //         Windows Edge/Chrome 默认不支持硬件解码 HEVC。
                    //         建议使用 <a href="${file.url}" target="_blank" style="color:#4cc2ff">外部播放器</a> 或手机访问。
                    //      </div>`;
                }

                newContainer.innerHTML = `
    <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; width:100%; height:100%; position:relative;">
        <video id="video-${file.uniqueId}" controls autoplay crossorigin="anonymous" src="${file.url}" style="width:100%;height:auto;max-height:85vh; outline:none; background:black;">
        </video>
        ${hevcWarning}
    </div>`;

                // 尝试加载字幕
                this.findAndLoadSubtitles(file, newContainer);

            } else if (file.type === 'txt') {
                if (!file.content) {
                    const res = await fetch(file.url);
                    file.content = await res.text();
                }
                newContainer.innerHTML = `<div class="viewer-text">${file.content.replace(/</g, '&lt;')}</div>`;
            } else if (file.type === 'pdf') {
                newContainer.innerHTML = `<iframe src="${file.url}" class="viewer-iframe"></iframe>`;
            } else {
                newContainer.innerHTML = `
                            <div class="fallback-msg">
                                <div style="font-size:48px;margin-bottom:10px">📄</div>
                                <div>此文件类型 (${file.ext}) 不支持预览</div>
                                <a class="fallback-link" href="${file.url}" target="_blank">在新窗口打开</a>
                            </div>`;
            }
        } catch (e) { newContainer.innerHTML = `<div style="color:red">加载失败: ${e.message}</div>`; }
    },

    // --- 视频字幕加载逻辑 ---
    async findAndLoadSubtitles(file, container) {
        if (!file || !file.url) return;

        // 获取基础路径
        const lastDotIndex = file.url.lastIndexOf('.');
        if (lastDotIndex === -1) return;
        const baseUrl = file.url.substring(0, lastDotIndex);

        const candidates = [
            { label: '默认 (.vtt)', url: `${baseUrl}.vtt`, type: 'vtt' },
            { label: '默认 (.srt)', url: `${baseUrl}.srt`, type: 'srt' },
            { label: '中文 (.zh.vtt)', url: `${baseUrl}.zh.vtt`, type: 'vtt' },
            { label: '中文 (.zh.srt)', url: `${baseUrl}.zh.srt`, type: 'srt' }
        ];

        for (let sub of candidates) {
            try {
                // 使用 GET 请求，避免部分服务器不支持 HEAD 导致的 400/405 错误
                const res = await fetch(sub.url, { method: 'GET' });
                if (res.ok) {
                    console.log(`Auto-loaded subtitle: ${sub.url}`);
                    // 找到后直接加载
                    this.changeSubtitle({
                        value: sub.url,
                        dataset: { type: sub.type }
                    }, file.uniqueId);
                    break;
                }
            } catch (e) {
                // 忽略网络错误，继续尝试下一个
            }
        }
    },

    // --- 核心修改：合并逻辑并处理内存 ---
    async changeSubtitle(sourceObj, uid) {
        const videoEl = document.getElementById(`video-${uid}`);
        if (!videoEl) return;

        const url = sourceObj.value;
        if (!url) return;

        // 1. 清理旧轨道和内存
        // 这一点很重要：防止之前生成的 Blob URL 堆积导致内存泄漏
        const oldTrack = videoEl.querySelector('track');
        if (oldTrack) {
            if (oldTrack.src.startsWith('blob:')) {
                URL.revokeObjectURL(oldTrack.src); // 释放旧的 Blob 内存
            }
            oldTrack.remove();
        }
        // 额外清理：确保 textTracks 列表也干净
        Array.from(videoEl.querySelectorAll('track')).forEach(t => t.remove());

        const type = sourceObj.dataset.type;
        let finalUrl = url;

        try {
            // 2. 如果是 SRT (无论本地还是远程)，都需要转换
            if (type === 'srt') {
                console.log("Converting SRT to VTT...");
                // fetch 支持 http:// 也支持 blob: (本地文件)，所以不需要区分 isLocal
                const res = await fetch(url);
                const srtText = await res.text();

                // 转换核心
                const vttText = this.srt2webvtt(srtText);

                // 生成 Blob
                const blob = new Blob([vttText], { type: 'text/vtt' });
                finalUrl = URL.createObjectURL(blob);
            }
        } catch (e) {
            console.error('Subtitle conversion failed:', e);
            return;
        }

        // 3. 创建并挂载新轨道
        const track = document.createElement('track');
        track.kind = 'subtitles';
        track.label = '';
        track.srclang = 'zh';
        track.src = finalUrl;
        track.default = true;

        videoEl.appendChild(track);

        // 4. 激活显示 (兼容性处理)
        // 某些移动端浏览器需要一点点延迟来识别新加入的 track
        setTimeout(() => {
            if (videoEl.textTracks && videoEl.textTracks.length > 0) {
                const t = videoEl.textTracks[videoEl.textTracks.length - 1];
                t.mode = 'showing'; // 强制显示
            }
        }, 100);
    },

    // --- 增强版转换器 ---
    srt2webvtt(data) {
        // 1. 统一换行符 (防止 Windows \r\n 造成干扰)
        let srt = data.replace(/\r\n|\r/g, '\n');

        // 2. 移除空行或修剪首尾
        srt = srt.trim();

        // 3. 核心替换：将逗号时间戳 (00:00:00,000) 改为点 (00:00:00.000)
        // 这是一个非常经典的 SRT->VTT 正则
        const vttBody = srt.replace(
            /(\d{2}:\d{2}:\d{2}),(\d{3})/g,
            '$1.$2'
        );

        // 4. 拼接头部
        return "WEBVTT\n\n" + vttBody;
    },

    // --- 音频播放器核心逻辑 ---
    buildAudioPlayerHTML(file) {
        const volumeHtml = `
            <div class="volume-wrapper" id="volumeControlArea-${file.uniqueId}">
                <div class="volume-popup" id="volumePopupPanel-${file.uniqueId}">
                    <div class="volume-text-display" id="volumePercent-${file.uniqueId}" style="text-align:center; color:white; font-size:12px; margin-bottom:6px;">100%</div>
                    
                    <input type="range" class="volume-slider-vertical" id="volumeRangeInput-${file.uniqueId}" 
                        min="0" max="1" step="0.01" value="1">
                </div>
                <button class="icon-btn" id="volumeToggleBtn-${file.uniqueId}" title="音量" style="color:inherit;opacity:0.8">
                    ${svg_volume}
                </button>
            </div>
        `;
        return `
        <div class="audio-player-container" id="audioContainer-${file.uniqueId}">
            <div class="audio-bg-layer" id="audioBg-${file.uniqueId}"></div>
            <canvas class="audio-visualizer" id="visualizer-${file.uniqueId}"></canvas>

            <div class="audio-section-info">
                <img src="" id="audioCover-${file.uniqueId}" class="audio-cover-img" style="opacity:0" crossorigin="anonymous">
                <div id="audioPlaceholder-${file.uniqueId}" class="audio-cover-placeholder">🎵</div>
                <div class="audio-meta">
                    <div class="audio-title" id="audioTitle-${file.uniqueId}">${file.name}</div>
                    <div class="audio-artist" id="audioArtist-${file.uniqueId}">Unknown Artist</div>
                </div>
            </div>

            <div class="audio-section-lyrics" id="lyricsBox-${file.uniqueId}">
                <div style="margin-top:50%;">正在搜索歌词...</div>
            </div>

            <div class="audio-section-controls">
                <div class="audio-progress-row">
                    <span class="audio-time" id="curTime-${file.uniqueId}">00:00</span>
                    <div class="audio-progress-container" id="audioProgressArea-${file.uniqueId}">
                        <div class="audio-progress-bar" id="audioProgress-${file.uniqueId}"></div>
                    </div>
                    <span class="audio-time" id="durTime-${file.uniqueId}">00:00</span>
                </div>

                <div class="audio-btn-row">
                    <button class="icon-btn" onclick="app.toggleFullScreen('${file.uniqueId}')" id="fsBtn-${file.uniqueId}" title="全屏" style="color:inherit;opacity:0.8">${svg_fullscreen}</button>
                    <button class="icon-btn" onclick="app.toggleLoop('${file.uniqueId}')" id="loopBtn-${file.uniqueId}" title="切换循环模式" style="color:inherit;opacity:0.8">${svg_loop_single}</button>
                    <button class="icon-btn play-btn" id="playBtn-${file.uniqueId}">${svg_play}</button>
                    
                    ${volumeHtml} <button class="icon-btn" onclick="app.togglePin('${file.uniqueId}')" id="pinBtn-${file.uniqueId}" title="固定并穿透" style="color:inherit;opacity:0.8;width:30px;">
                    <svg width="18" height="18" fill="currentColor"><use href="#icon-pin-off"></use></svg>
                    </button>
                </div>
            </div>
        </div>
        <audio id="audioEl-${file.uniqueId}" src="${file.url}" crossorigin="anonymous" style="display:none"></audio>
        `;
    },

    // --- 在 app 对象中替换此方法 ---
    // --- 修改 initAudioPlayer ---
    async initAudioPlayer(container, file) {
        const audio = container.querySelector('audio');
        const playBtn = document.getElementById(`playBtn-${file.uniqueId}`);
        const progress = document.getElementById(`audioProgress-${file.uniqueId}`);
        const progressArea = document.getElementById(`audioProgressArea-${file.uniqueId}`);
        const curTimeEl = document.getElementById(`curTime-${file.uniqueId}`);
        const durTimeEl = document.getElementById(`durTime-${file.uniqueId}`);
        const lyricsBox = document.getElementById(`lyricsBox-${file.uniqueId}`);
        const titleEl = document.getElementById(`audioTitle-${file.uniqueId}`);
        const artistEl = document.getElementById(`audioArtist-${file.uniqueId}`);
        const coverImg = document.getElementById(`audioCover-${file.uniqueId}`);
        const coverPh = document.getElementById(`audioPlaceholder-${file.uniqueId}`);
        const loopBtn = document.getElementById(`loopBtn-${file.uniqueId}`);
        const volumePopupPanel = document.getElementById(`volumePopupPanel-${file.uniqueId}`);
        const volumeRangeInput = document.getElementById(`volumeRangeInput-${file.uniqueId}`);
        const volumeToggleBtn = document.getElementById(`volumeToggleBtn-${file.uniqueId}`);
        const volumePercentText = document.getElementById(`volumePercent-${file.uniqueId}`);

        // 新增：背景层和容器
        const bgLayer = document.getElementById(`audioBg-${file.uniqueId}`);
        const playerContainer = document.getElementById(`audioContainer-${file.uniqueId}`);
        const canvas = document.getElementById(`visualizer-${file.uniqueId}`);

        this.updateLoopBtnUI(loopBtn);

        let lyricsData = [];
        let isDragging = false;
        let audioContext, analyser, dataArray, source;
        let animationId;

        // --- 1. 颜色自适应逻辑 ---
        const applyAdaptiveTheme = (img) => {
            // 提取颜色
            const rgb = this.getAverageRGB(img);
            const { r, g, b } = rgb;
            const isLight = this.isLightColor(r, g, b);

            // 设置背景 (渐变色：从提取色到深一点的同色系)
            bgLayer.style.background = `linear-gradient(135deg, rgb(${r},${g},${b}), rgb(${r * 0.6},${g * 0.6},${b * 0.6}))`;

            // 设置文字颜色 (深底白字，浅底黑字)
            const textColor = isLight ? '#202020' : '#ffffff';
            const subColor = isLight ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)';

            playerContainer.style.color = textColor;

            // 更新特定元素样式
            titleEl.style.color = textColor;
            artistEl.style.color = subColor;
            curTimeEl.style.color = subColor;
            durTimeEl.style.color = subColor;

            // 歌词普通行颜色
            lyricsBox.style.color = subColor;

            // 更新按钮颜色 (inherit 会继承 container 的颜色)
            const btns = container.querySelectorAll('.icon-btn:not(.play-btn)');
            btns.forEach(btn => btn.style.color = textColor);
        };

        // 监听图片加载完成，提取颜色
        coverImg.onload = () => {
            applyAdaptiveTheme(coverImg);
        };

        // --- 2. 频谱可视化逻辑 (Visualizer) ---
        const initVisualizer = () => {
            if (audioContext) return; // 避免重复初始化

            // 创建 AudioContext
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioContext = new AudioContext();

            // 连接音频源
            source = audioContext.createMediaElementSource(audio);
            analyser = audioContext.createAnalyser();

            source.connect(analyser);
            analyser.connect(audioContext.destination);

            analyser.fftSize = 256; // 决定条的数量 (值越大条越细)
            const bufferLength = analyser.frequencyBinCount;
            dataArray = new Uint8Array(bufferLength);

            const ctx = canvas.getContext('2d');

            const draw = () => {
                animationId = requestAnimationFrame(draw);

                // 适配 Canvas 尺寸
                canvas.width = canvas.offsetWidth;
                canvas.height = canvas.offsetHeight;
                const width = canvas.width;
                const height = canvas.height;

                analyser.getByteFrequencyData(dataArray);

                ctx.clearRect(0, 0, width, height);

                const barWidth = (width / bufferLength) * 2.5;
                let barHeight;
                let x = 0;

                for (let i = 0; i < bufferLength; i++) {
                    barHeight = dataArray[i] / 2; // 调整高度比例

                    // 颜色根据背景色或者固定一个好看的颜色
                    // 这里做一个白色透明渐变，比较百搭
                    const fillStyle = playerContainer.style.color === 'rgb(32, 32, 32)'
                        ? `rgba(0,0,0, ${barHeight / 200})`
                        : `rgba(255,255,255, ${barHeight / 200})`;

                    ctx.fillStyle = fillStyle;

                    // 绘制条形 (底部对齐)
                    // 稍微圆角处理看起来更现代
                    ctx.fillRect(x, height - barHeight, barWidth, barHeight);

                    x += barWidth + 1;
                }
            };

            draw();
        };

        // --- ID3 加载 (保持不变) ---
        if (window.jsmediatags) {
            fetch(file.url).then(r => r.blob()).then(blob => {
                window.jsmediatags.read(blob, {
                    onSuccess: (tag) => {
                        const tags = tag.tags;
                        if (tags.title) titleEl.textContent = tags.title;
                        if (tags.artist) artistEl.textContent = tags.artist;
                        if (tags.picture) {
                            const { data, format } = tags.picture;
                            let base64String = "";
                            for (let i = 0; i < data.length; i++) base64String += String.fromCharCode(data[i]);
                            coverImg.src = `data:${format};base64,${window.btoa(base64String)}`;
                            coverImg.style.opacity = 1;
                            coverPh.style.display = 'none';
                            // 注意：onload 会触发颜色提取
                        }
                    },
                    onError: (error) => { console.log('Tags read error', error); }
                });
            });
        }

        // --- 歌词加载 (保持不变) ---
        const lrcUrl = file.url.replace(/\.[^.]+$/, '.lrc');
        fetch(lrcUrl).then(r => { if (r.ok) return r.text(); throw new Error(); })
            .then(text => {
                lyricsData = this.parseLrc(text);
                this.renderLyrics(lyricsBox, lyricsData, file.uniqueId);
            }).catch(() => { lyricsBox.innerHTML = '<div style="margin-top:50%;">暂无歌词</div>'; });

        // ##########
        // 新增：音量控制逻辑
        // ##########
        // 初始化音量
        audio.volume = 1;
        let lastVolume = 1; // 用于静音恢复
        // 辅助函数：更新图标和文字
        const updateVolumeUI = () => {
            const vol = audio.volume;
            volumeRangeInput.value = vol;
            if (volumePercentText) {
                volumePercentText.textContent = Math.round(vol * 100) + '%';
            }
            if (vol === 0) {
                volumeToggleBtn.innerHTML = svg_volume_mute;
                volumeToggleBtn.style.opacity = 0.5;
            } else {
                volumeToggleBtn.innerHTML = svg_volume;
                volumeToggleBtn.style.opacity = 0.8;
            }
        };
        volumeToggleBtn.onclick = (e) => {
            e.stopPropagation();
            if (audio.volume > 0) {
                lastVolume = audio.volume;
                audio.volume = 0;
            } else {
                audio.volume = lastVolume > 0 ? lastVolume : 1;
            }
            updateVolumeUI();
        };
        volumeRangeInput.oninput = (e) => {
            e.stopPropagation(); // 关键：防止拖动时触发外部点击事件
            audio.volume = parseFloat(e.target.value);
            updateVolumeUI();
        };
        // 防止点击弹窗内部导致弹窗关闭
        volumePopupPanel.onclick = (e) => {
            e.stopPropagation();
        };
        updateVolumeUI();
        const closeVolPopup = () => {
            if (volumePopupPanel.classList.contains('show')) {
                volumePopupPanel.classList.remove('show');
            }
        };
        playerContainer.addEventListener('click', closeVolPopup);
        const updateVolIcon = () => {
            if (audio.volume === 0) {
                volumeToggleBtn.innerHTML = svg_volume_mute;
                volumeToggleBtn.style.opacity = 0.5;
            } else {
                volumeToggleBtn.innerHTML = svg_volume;
                volumeToggleBtn.style.opacity = 0.8;
            }
        };

        // 点击图标静音/恢复
        let lastVol = 1;
        volumeToggleBtn.onclick = () => {
            if (audio.volume > 0) {
                lastVol = audio.volume;
                audio.volume = 0;
                volumeRangeInput.value = 0;
            } else {
                audio.volume = lastVol > 0 ? lastVol : 0.5;
                volumeRangeInput.value = audio.volume;
            }
            updateVolIcon();
        };

        // --- 播放控制逻辑 ---
        playBtn.onclick = () => {
            // 浏览器策略：AudioContext 必须在用户交互后才能 resume
            if (!audioContext) initVisualizer();
            if (audioContext && audioContext.state === 'suspended') audioContext.resume();

            if (audio.paused) {
                audio.play();
                playBtn.innerHTML = svg_pause;
                coverImg.classList.add('playing');
            } else {
                audio.pause();
                playBtn.innerHTML = svg_play;
                coverImg.classList.remove('playing');
            }
        };

        // --- 进度条、拖拽等逻辑 (保持你之前修改的) ---
        audio.addEventListener('timeupdate', () => {
            if (!isDragging) {
                const percent = (audio.currentTime / audio.duration) * 100;
                progress.style.width = `${percent}%`;
                curTimeEl.textContent = this.formatTime(audio.currentTime);
            }
            if (lyricsData.length > 0) this.syncLyrics(lyricsBox, lyricsData, audio.currentTime, file.uniqueId);
        });

        audio.addEventListener('loadedmetadata', () => {
            durTimeEl.textContent = this.formatTime(audio.duration);
            // 尝试自动播放时也需要初始化
            // 注意：自动播放可能被拦截，导致 audioContext 无法自动启动
            audio.play().catch(() => { }).then(() => {
                if (!audioContext) initVisualizer();
            });
            playBtn.innerHTML = svg_pause;
            coverImg.classList.add('playing');
        });

        audio.addEventListener('ended', () => {
            // 模式 1: 单曲循环
            if (this.state.loopMode === 'one') {
                audio.currentTime = 0;
                audio.play();
            }
            // 模式 2 & 3: 收藏列表循环 / 随机播放
            else if (this.state.loopMode === 'list' || this.state.loopMode === 'shuffle') {
                this.playNextInFavorites(file, this.state.loopMode === 'shuffle');
            }
            // 模式 0: 无循环 (停止)
            else {
                playBtn.innerHTML = svg_play;
                coverImg.classList.remove('playing');
                progress.style.width = '0%';
            }
        });

        // 拖拽逻辑 (保持你之前的代码)
        const handleDrag = (clientX) => {
            const rect = progressArea.getBoundingClientRect();
            let percent = (clientX - rect.left) / rect.width;
            percent = Math.max(0, Math.min(1, percent));
            progress.style.width = `${percent * 100}%`;
            const dragTime = percent * audio.duration;
            curTimeEl.textContent = this.formatTime(dragTime);
            return dragTime;
        };
        const startDrag = (clientX) => { isDragging = true; handleDrag(clientX); };
        const doDrag = (clientX) => { if (isDragging) handleDrag(clientX); };
        const endDrag = (clientX) => {
            if (isDragging) {
                audio.currentTime = handleDrag(clientX);
                isDragging = false;
            }
        };

        progressArea.addEventListener('mousedown', (e) => {
            startDrag(e.clientX);
            const onMove = (ev) => doDrag(ev.clientX);
            const onUp = (ev) => { endDrag(ev.clientX); document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
            document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
        });
        progressArea.addEventListener('touchstart', (e) => {
            startDrag(e.touches[0].clientX);
            const onMove = (ev) => { ev.preventDefault(); doDrag(ev.touches[0].clientX); };
            const onUp = (ev) => { endDrag(ev.changedTouches[0].clientX); document.removeEventListener('touchmove', onMove); document.removeEventListener('touchend', onUp); };
            document.addEventListener('touchmove', onMove, { passive: false }); document.addEventListener('touchend', onUp);
        }, { passive: false });

        const makeDraggable = (el) => {
            let isDraggingPlayer = false;
            let startX, startY, initialLeft, initialTop;

            const onMouseDown = (e) => {
                // 1. 定义不触发拖拽的“白名单”选择器
                // 技巧：.audio-section-info 会自动涵盖它内部的 img 和 text，所以不需要单独写 img
                const noDragSelector = [
                    'button',
                    '.audio-progress-container',
                    '.audio-section-lyrics',
                    '.cc-btn',
                    '.icon-btn',
                    '.volume-wrapper',
                    '.audio-section-info img',
                    '.audio-meta'
                ].join(','); // 将数组合并成 "button, .class1, .class2..." 的字符串

                // 2. 单次检测 + 设置光标
                if (e.target.closest(noDragSelector)) {
                    // 设置光标为默认箭头
                    // 注意：通常这里设为 'default' 或 'auto'，具体取决于你希望它恢复成什么样
                    // 如果 el 是你的播放器容器：
                    el.style.cursor = 'default';
                    return;
                }

                // 仅限左键点击
                if (e.button !== 0) return;
                if (this.state.isPinned) return;//钉住状态
                isDraggingPlayer = true;
                startX = e.clientX;
                startY = e.clientY;

                // 2. 获取当前的 left/top 值
                // getBoundingClientRect 获取的是视口坐标，我们需要将其转换为相对于父容器的 style.left/top
                // 或者是更简单的方法：首次拖拽时，移除 transform (-50%, -50%)，转为绝对像素坐标

                const rect = el.getBoundingClientRect();
                const parentRect = el.parentElement.getBoundingClientRect();

                // 计算当前元素相对于父容器的偏移量
                initialLeft = rect.left - parentRect.left;
                initialTop = rect.top - parentRect.top;

                // 关键：移除 CSS 中的 transform: translate(-50%, -50%)，防止计算冲突
                // 设置为当前的绝对像素位置
                el.style.transform = 'none';
                el.style.left = `${initialLeft}px`;
                el.style.top = `${initialTop}px`;

                // 改变鼠标样式
                el.style.cursor = 'grabbing';

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            };

            const onMouseMove = (e) => {
                if (!isDraggingPlayer) return;
                e.preventDefault(); // 防止选中文字

                const dx = e.clientX - startX;
                const dy = e.clientY - startY;

                el.style.left = `${initialLeft + dx}px`;
                el.style.top = `${initialTop + dy}px`;
            };

            const onMouseUp = () => {
                isDraggingPlayer = false;
                el.style.cursor = 'move';
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            // 绑定事件 (只在 PC 端启用拖拽，移动端通常全屏不需要)
            if (window.innerWidth > 768) {
                el.addEventListener('mousedown', onMouseDown);
            }
        };

        // 启动拖拽功能，传入播放器容器
        makeDraggable(playerContainer);

        // --- 销毁清理逻辑 ---
        // 将 audioContext 和 animationId 绑定到 file 对象，以便在 closeFile 时关闭
        file._audioContext = {
            audio,
            ctx: audioContext, // Web Audio Context
            close: () => {
                if (animationId) cancelAnimationFrame(animationId);
                if (audioContext) audioContext.close();
            }
        };
    },

    // --- 新增：核心辅助函数：从收藏夹播放下一首 ---
    playNextInFavorites(currentFile, isShuffle) {
        // 1. 获取所有收藏项
        const allFavs = this.state.favorites;
        if (!allFavs || allFavs.length === 0) return;

        // 2. 过滤出音频文件 (排除文件夹、图片等)
        // 简单判断：扩展名在 audio 列表里
        const audioFavs = allFavs.filter(f => {
            if (f.isFolder) return false;
            // url 可能是 /path/to/song.mp3，提取后缀
            const ext = f.url.split('.').pop().toLowerCase();
            return this.getFileType(ext) === 'audio';
        });

        if (audioFavs.length === 0) return;

        // 3. 找到当前歌曲在列表中的位置
        // 此时比较的是 url
        const currentIndex = audioFavs.findIndex(f => f.url === currentFile.url);

        let nextIndex = 0;

        if (isShuffle) {
            // 随机模式：随机取一个下标 (尽量不重复播放当前这首，除非只有一首)
            if (audioFavs.length > 1) {
                do {
                    nextIndex = Math.floor(Math.random() * audioFavs.length);
                } while (nextIndex === currentIndex);
            }
        } else {
            // 列表循环模式：下一首，到底部回到顶部
            if (currentIndex !== -1) {
                nextIndex = (currentIndex + 1) % audioFavs.length;
            }
        }

        const nextFav = audioFavs[nextIndex];

        // 4. 播放下一首
        // 构造一个 item 对象传给 handleOpenAction
        const nextItem = {
            name: nextFav.name,
            fakeUrl: nextFav.url,
            // 这里不需要 path，因为 fakeUrl 已经有了
        };

        this.showToast(isShuffle ? `随机播放: ${nextItem.name}` : `播放下一首: ${nextItem.name}`);

        // 调用打开逻辑 (会替换当前预览或打开新文件)
        this.handleOpenAction(nextItem);
    },

    toggleLoop(uid) {
        const btn = document.getElementById(`loopBtn-${uid}`);

        // 状态轮转: none -> list(收藏循环) -> shuffle(随机) -> one(单曲) -> none
        if (this.state.loopMode === 'none') {
            this.state.loopMode = 'list';
            this.showToast("模式: 收藏列表循环");
        } else if (this.state.loopMode === 'list') {
            this.state.loopMode = 'shuffle';
            this.showToast("模式: 收藏列表随机");
        } else if (this.state.loopMode === 'shuffle') {
            this.state.loopMode = 'one';
            this.showToast("模式: 单曲循环");
        } else {
            this.state.loopMode = 'none';
            this.showToast("模式: 不循环");
        }
        this.updateLoopBtnUI(btn);
    },
    togglePin(uid) {
        const container = document.getElementById(`audioContainer-${uid}`);
        const btn = document.getElementById(`pinBtn-${uid}`);
        if (!container || !btn) return;

        // 切换 class
        const isPinned = container.classList.toggle('pinned');
        this.state.isPinned = !this.state.isPinned;

        // 更新图标和提示
        if (isPinned) {
            // 锁定状态：实心图钉，提示“已锁定”
            btn.innerHTML = `<svg width="18" height="18" fill="currentColor"><use href="#icon-pin-on"></use></svg>`;
            btn.title = "解锁窗口 (允许拖动)";
            btn.style.opacity = "1";
            btn.style.color = "var(--accent-color)"; // 高亮显示
            this.showToast("窗口已固定，背景可穿透");
        } else {
            // 解锁状态：空心图钉
            btn.innerHTML = `<svg width="18" height="18" fill="currentColor"><use href="#icon-pin-off"></use></svg>`;
            btn.title = "固定窗口 (鼠标穿透)";
            btn.style.opacity = "0.8";
            btn.style.color = "inherit";
            this.showToast("窗口已解锁");
        }
    },

    updateLoopBtnUI(btn) {
        if (!btn) return;
        // 根据状态设置图标和样式
        if (this.state.loopMode === 'one') {
            btn.innerHTML = svg_loop_single;
            btn.title = "单曲循环";
        } else if (this.state.loopMode === 'list') {
            btn.innerHTML = svg_loop_list; // 列表循环图标
            btn.title = "收藏列表循环";
        } else if (this.state.loopMode === 'shuffle') {
            btn.innerHTML = svg_shuffle_list; // 随机图标
            btn.title = "收藏列表随机";
        } else {
            btn.innerHTML = svg_loop_none; // 不循环图标
            btn.title = "不循环";
        }
    },

    parseLrc(text) {
        const lines = text.split('\n');
        let result = [];
        const timeExp = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;

        for (let line of lines) {
            // 支持一行多个时间标签 [00:01.00][00:10.00]Lyric
            let matches;
            // 保存该行的内容 (去掉所有时间标签)
            const content = line.replace(/\[(\d{2}):(\d{2})\.(\d{2,3})\]/g, '').trim();
            if (!content) continue;

            while ((matches = timeExp.exec(line)) !== null) {
                const min = parseInt(matches[1]);
                const sec = parseInt(matches[2]);
                const ms = parseInt(matches[3].padEnd(3, '0'));
                const time = min * 60 + sec + ms / 1000;
                result.push({ time, content });
            }
        }

        // 按时间排序
        result.sort((a, b) => a.time - b.time);

        // 合并相同时间的歌词 (例如翻译)
        // 允许0.1秒的误差
        const merged = [];
        if (result.length > 0) {
            let current = result[0];
            for (let i = 1; i < result.length; i++) {
                if (Math.abs(result[i].time - current.time) < 0.2) {
                    current.content += '\n' + result[i].content; // 合并内容
                } else {
                    merged.push(current);
                    current = result[i];
                }
            }
            merged.push(current);
        }

        return merged;
    },
    renderLyrics(container, data, uid) {
        let html = '<div style="height:50%"></div>'; // Padding top
        data.forEach((line, i) => {
            // Unique ID for each lyric line: lyric-UID-INDEX
            html += `<div class="lyric-line" id="lyric-${uid}-${i}" onclick="app.seekToLyric(${line.time}, '${uid}')">${line.content}</div>`;
        });
        html += '<div style="height:50%"></div>'; // Padding bottom
        container.innerHTML = html;
    },

    // 在 app 对象中微调 syncLyrics
    syncLyrics(container, data, time, uid) {
        let activeIndex = -1;
        for (let i = 0; i < data.length; i++) {
            if (time >= data[i].time) activeIndex = i;
            else break;
        }

        if (activeIndex !== -1) {
            const lines = container.querySelectorAll('.lyric-line');
            // 仅当行号改变时才操作 DOM，提升性能
            const currentActive = container.querySelector('.lyric-line.active');
            const newActive = document.getElementById(`lyric-${uid}-${activeIndex}`);

            if (currentActive !== newActive) {
                if (currentActive) currentActive.classList.remove('active');
                if (newActive) {
                    newActive.classList.add('active');
                    // block: 'center' 确保高亮行始终在歌词区域中间
                    newActive.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }
    },

    seekToLyric(time, uid) {
        const audio = document.getElementById(`audioEl-${uid}`);
        if (audio) audio.currentTime = time;
    },

    formatTime(s) {
        if (!s || isNaN(s)) return '00:00';
        const m = Math.floor(s / 60).toString().padStart(2, '0');
        const sec = Math.floor(s % 60).toString().padStart(2, '0');
        return `${m}:${sec}`;
    },

    minimizeViewer() {
        this.dom.viewerModal.classList.add('minimized');
    },

    // 修改后的隐藏 Viewer 方法，不关闭文件，只隐藏界面
    hideViewer() {
        this.dom.viewerModal.classList.remove('open');
        this.dom.viewerModal.classList.remove('minimized');
        this.dom.viewerModal.classList.remove('music-mode');
    },

    closeViewer() {
        // 此方法保留给单个关闭逻辑如果需要，但右上角X现在使用 hideViewer
        this.hideViewer();
    },

    // --- 修改 closeFile ---
    closeFile(index, e) {
        if (e) e.stopPropagation();

        const fileToRemove = this.state.openFiles[index];

        // 停止音频播放并清理 Web Audio Context
        if (fileToRemove._audioContext) {
            if (fileToRemove._audioContext.audio) {
                fileToRemove._audioContext.audio.pause();
                fileToRemove._audioContext.audio.src = "";
            }
            // 调用我们刚才定义的清理函数
            if (fileToRemove._audioContext.close) {
                fileToRemove._audioContext.close();
            }
        }

        // ... 原有的 UI 清理代码 ...
        const containerToRemove = document.getElementById(fileToRemove.uniqueId);
        if (containerToRemove) containerToRemove.remove();

        this.state.openFiles.splice(index, 1);

        // ... 后续逻辑保持不变 ...
        if (this.state.openFiles.length > 0) {
            if (index === this.state.activeFileIndex) {
                const newIndex = Math.max(0, index - 1);
                this.activateFile(newIndex);
            } else if (index < this.state.activeFileIndex) {
                this.state.activeFileIndex--;
                this.renderTaskBar();
            } else {
                this.renderTaskBar();
            }
            this.hideViewer();
        } else {
            this.state.activeFileIndex = -1;
            this.renderTaskBar();
            this.hideViewer();
        }
    },

    renderTaskBar() {
        const bar = this.dom.taskBar;
        if (this.state.openFiles.length === 0) {
            bar.style.display = 'none';
            return;
        }
        bar.style.display = 'flex';

        let html = '';
        this.state.openFiles.forEach((file, idx) => {
            const activeClass = idx === this.state.activeFileIndex ? 'active' : '';
            html += `
                        <div class="task-item ${activeClass}" onclick="app.activateFile(${idx})" title="${file.name}">
                            <div class="task-name">${file.name}</div>
                            <div class="task-close" onclick="app.closeFile(${idx}, event)">${svg_close}</div>
                        </div>
                    `;
        });
        bar.innerHTML = html;
    },

    zoomImage(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        this.state.imageZoom *= delta;
        this.updateImageTransform();
    },
    startDragImage(e) {
        e.preventDefault();
        const startX = e.clientX - this.state.imagePos.x;
        const startY = e.clientY - this.state.imagePos.y;
        const onMove = (moveEvent) => {
            this.state.imagePos.x = moveEvent.clientX - startX;
            this.state.imagePos.y = moveEvent.clientY - startY;
            this.updateImageTransform();
        };
        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    },
    updateImageTransform() {
        if (this.state.activeFileIndex === -1) return;
        const file = this.state.openFiles[this.state.activeFileIndex];
        const img = document.getElementById(`viewerImage-${file.uniqueId}`);
        if (img) img.style.transform = `translate(${this.state.imagePos.x}px, ${this.state.imagePos.y}px) scale(${this.state.imageZoom})`;
    },

    updatePagination() {
        const { offset, count, total, items } = this.state;
        const currentPage = Math.floor(offset / count) + 1;
        const totalPages = Math.ceil(total / count) || 1;
        this.dom.pageInput.value = currentPage;
        this.dom.pageInput.max = totalPages;
        this.dom.totalPages.textContent = `/ ${totalPages} 页`;

        const currentCount = items.length;
        let statusText = `共 ${total} 个项目`;
        if (total > count) {
            statusText += ` (本页 ${currentCount} 个)`;
        }
        this.dom.statusLeft.textContent = statusText;
    },
    prevPage() { if (this.state.offset > 0) { this.state.offset -= this.state.count; this.fetchData(); } },
    nextPage() { if (this.state.offset + this.state.count < this.state.total) { this.state.offset += this.state.count; this.fetchData(); } },
    jumpToPage(page) {
        page = parseInt(page);
        const totalPages = Math.ceil(this.state.total / this.state.count);
        if (page === -1) page = totalPages;

        if (page < 1) page = 1;
        if (page > totalPages) page = totalPages;
        this.state.offset = (page - 1) * this.state.count;
        this.fetchData();
    },
    sort(col) {
        if (this.state.sortCol === col) this.state.sortAsc = this.state.sortAsc ? 0 : 1;
        else { this.state.sortCol = col; this.state.sortAsc = 1; }
        this.fetchData();
    },
    getFileUrl(item) {
        const full = item.path ? `${item.path}\\${item.name}` : item.name;
        return `/${full.replace(/\\/g, '/')}`;
    },

    mockData() {
        this.state.items = [
            { name: 'C:', type: 'folder', path: '', size: undefined, date_modified: undefined },
            { name: 'Photo.jpg', path: 'D:\\Data', size: 2500000, date_modified: '133494000000000000' },
            { name: 'Song.lrc', path: 'D:\\Music', size: 1024, date_modified: 1672531200000 },
            { name: 'Example Song.mp3', path: 'D:\\Music', size: 5242880, date_modified: 1672531200000 },
            { name: 'MyVideo.mp4', path: 'D:\\Videos', size: 124288022, date_modified: 1672531200000 },
            { name: 'MyVideo.vtt', path: 'D:\\Videos', size: 1024, date_modified: 1672531200000 }
        ];
        this.state.total = 6;
        this.renderList();
        this.updatePagination();
    },

    // --- 【新增】辅助：获取图片平均色 ---
    getAverageRGB(imgEl) {
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

    // --- 【新增】辅助：判断颜色深浅 (YIQ算法) ---
    isLightColor(r, g, b) {
        // 返回 true 代表背景是亮色，文字需要黑色
        // 返回 false 代表背景是暗色，文字需要白色
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return yiq >= 128;
    },
};

document.addEventListener('DOMContentLoaded', () => app.init());


// // 全局点击调试器：显示鼠标到底点在了哪个元素上
// document.addEventListener('click', (e) => {
//     console.group("🖱️ 点击调试报告");

//     // 1. 打印被点击的具体元素（最顶层的那个）
//     console.log("🎯 目标元素 (Target):", e.target);

//     // 2. 打印元素的类名和ID，方便确认身份
//     console.log("🏷️ 类名 (Class):", e.target.className);
//     console.log("🆔 ID:", e.target.id);

//     // 3. 检查是否在播放器内部
//     const player = e.target.closest('.audio-player-container');
//     if (player) {
//         console.log("📦 所属区域: 🎵 音频播放器");
//         if (player.classList.contains('pinned')) {
//             console.log("📌 播放器状态: 已锁定 (Pinned)");
//             // 如果是锁定状态，理论上 e.target 应该是按钮或进度条。
//             // 如果 e.target 是 audio-bg-layer 或 container 本身，说明穿透失败。
//         }
//     } else {
//         console.log("📂 所属区域: 外部 (文件列表/背景)");
//     }

//     console.groupEnd();
// }, true); // 使用捕获模式 (true)，确保即使事件冒泡被阻止也能捕捉到