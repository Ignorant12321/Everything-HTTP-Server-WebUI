# 静态模块化重构设计

## 背景

当前项目是无构建步骤的 Everything HTTP Server WebUI，核心运行文件位于 `config/` 目录：

- `config/index.html`：页面结构、SVG 图标和少量内联脚本。
- `config/index.css`：完整界面样式，约 1874 行。
- `config/index.js`：完整应用逻辑，约 1998 行。
- `config/jsmediatags.min.js`：第三方音频标签解析库，约 102 行。

用户要求保留静态部署方式，并让每个文件各司其职、单文件不超过 300 行。测试地址为 `localhost:11080`。

## 目标

1. 保持当前功能和部署方式不变，可继续放在 Everything HTTP 的 `config` 目录使用。
2. 拆分 HTML、CSS、JavaScript，让每个源码文件不超过 300 行。
3. 每个文件职责清晰，文件名能表达对应功能区域。
4. 给对应功能添加简短中文注释，重点解释模块职责、关键数据流、Everything HTTP API 约定和复杂交互。
5. 保留当前未提交文案调整：“点击属性复制”。
6. 新增 `config/app-config.json`，专门配置 `defaultPath`。

## 非目标

1. 不引入 Vite、Webpack、npm 构建或 TypeScript。
2. 不重新设计 UI 视觉风格。
3. 不改变 Everything HTTP 查询接口。
4. 不把第三方压缩库强行拆分或改写。

## 目录结构

计划改为：

```text
config/
  index.html
  app-config.json
  css/
    base.css
    header.css
    layout.css
    sidebar.css
    file-list.css
    details.css
    viewer.css
    audio-player.css
    utilities.css
    responsive.css
  js/
    app.js
    config.js
    state.js
    dom.js
    api.js
    navigation.js
    render-list.js
    details.js
    favorites.js
    viewer.js
    audio-player.js
    subtitles.js
    interactions.js
    format.js
    icons.js
  vendor/
    jsmediatags.min.js
tools/
  check-file-lines.js
```

如果某个模块超过 300 行，将按更小职责继续拆分，例如把 `audio-player.js` 拆为播放器模板、歌词、封面和可视化模块。

## JavaScript 设计

使用浏览器原生 ES Module，不需要构建工具。`config/index.html` 通过 `<script type="module" src="./js/app.js"></script>` 启动应用。

`app.js` 负责组合模块并导出全局 `window.app`。这样现有 `onclick="app.xxx()"` 可以继续工作，降低第一次重构的风险。

主要模块职责：

- `config.js`：读取 `app-config.json`、合并默认配置、提供分页数量和存储键名等配置。
- `state.js`：集中创建和初始化应用状态。
- `dom.js`：集中查询 DOM 节点，避免散落的重复查询。
- `api.js`：封装 Everything HTTP 查询、根磁盘加载和文件 URL 构造。
- `navigation.js`：路径跳转、历史记录、分页和排序。
- `render-list.js`：文件列表、表头和空状态渲染。
- `details.js`：详情面板、复制属性和下载按钮。
- `favorites.js`：收藏状态、收藏列表和收藏按钮状态。
- `viewer.js`：预览弹窗、任务栏、多文件预览、图片缩放。
- `audio-player.js`：音频播放器模板、控制、封面、歌词和可视化。
- `subtitles.js`：本地字幕加载、SRT 转 VTT、字幕切换。
- `interactions.js`：拖拽、侧边栏滑动、菜单展开收起、清空输入动画。
- `format.js`：文件大小、日期、类型、时间等格式化工具。
- `icons.js`：当前内联 SVG 常量。

## CSS 设计

CSS 按界面区域拆分，通过多个 `<link rel="stylesheet">` 引入。拆分后保留原有选择器，减少 JS 和 HTML 侧改动。

主要文件职责：

- `base.css`：主题变量、全局 reset、滚动条和基础元素。
- `layout.css`：主布局、内容区、状态栏和任务栏基础布局。
- `header.css`：顶部导航、地址栏、菜单按钮。
- `sidebar.css`：侧边栏、磁盘树、收藏列表、移动端遮罩。
- `file-list.css`：文件列表、网格视图、列表表头、分页。
- `details.css`：详情面板、预览框、属性行和操作按钮。
- `viewer.css`：预览弹窗、文本/图片/视频/PDF 预览。
- `audio-player.css`：音乐播放器、歌词、音量、循环和固定模式。
- `utilities.css`：toast、动画、通用工具类。
- `responsive.css`：移动端和横屏适配规则。

## 配置设计

新增 `config/app-config.json`，作为用户修改默认路径的唯一文件：

```json
{
  "defaultPath": "D:\\Data\\Share"
}
```

`config/js/config.js` 会通过 `fetch('../app-config.json')` 读取配置，并与内置默认配置合并；读取失败或 JSON 格式错误时回退到内置默认路径，并在控制台给出提示。

## HTML 设计

`config/index.html` 保留页面骨架和必要的 `onclick` 入口。SVG symbol 继续放在 HTML 中，避免额外请求导致图标闪烁。

内联 JavaScript 中的大段 SVG 字符串会迁移到 `config/js/icons.js`。样式和脚本引用改为相对 `config/index.html` 的 `./css/...`、`./js/...` 和 `./vendor/...`。

## 注释规范

注释使用简短中文，按功能添加：

- 文件顶部写模块职责。
- 复杂函数前说明输入、输出或关键约束。
- Everything HTTP 请求参数旁说明查询语义。
- 拖拽、播放器、字幕、歌词同步等复杂交互保留必要步骤说明。

不写逐行解释式注释，不重复代码已经表达清楚的内容。

## 测试与验收

新增 `tools/check-file-lines.js`，用于检查源码文件行数上限和关键引用存在。重构完成后执行：

```bash
node tools/check-file-lines.js
```

浏览器验收使用 `localhost:11080`：

1. 页面可加载，无控制台模块加载错误。
2. 默认路径可打开，磁盘列表可加载。
3. 文件列表、排序、分页、详情面板可用。
4. 收藏、复制属性、下载、预览弹窗可用。
5. 图片、文本、PDF、音频、视频预览不回退。
6. 移动端侧边栏和详情面板交互可用。

## 风险与缓解

ES Module 的加载路径是主要风险。缓解方式是使用相对 `config/index.html` 的 `./` 前缀，并在 `localhost:11080` 上实际加载验证。

`app-config.json` 的路径和 JSON 格式是主要配置风险。缓解方式是在 `config/js/config.js` 中提供内置默认值、错误提示，并在 README 中说明反斜杠需要写成 `\\`。

拆分大文件可能遗漏全局变量。缓解方式是第一阶段继续暴露 `window.app`，并将 SVG 常量集中迁移到 `icons.js`。

音频播放器逻辑较长。缓解方式是先按功能拆分模板、事件绑定、歌词和可视化，必要时继续拆小文件以满足 300 行限制。
