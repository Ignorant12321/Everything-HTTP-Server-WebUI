// DOM 模块：集中查询页面节点，减少重复选择器和拼写错误。
function queryDom() {
  return {
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
  };

}
