// 状态模块：创建一次应用运行期状态，避免散落的全局变量。
export function createState() {
  return {
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

    // DOM 元素缓存：提前获取页面核心元素，避免重复DOM查询，提升性能;
}
