# Static Module Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the static Everything HTTP Server WebUI under `config/` into focused files under 300 lines, while moving `defaultPath` into `config/app-config.json`.

**Architecture:** Keep the app as a no-build static browser application. Use classic deferred scripts under `config/js/` because Everything HTTP serves `.js` as `application/octet-stream`, split CSS by UI area under `config/css/`, keep `window.app` as the compatibility surface for existing inline handlers, and load user configuration from JSON.

**Tech Stack:** Plain HTML, CSS, browser ES modules, Everything HTTP JSON API, Node.js built-in tooling for structural checks.

---

## File Structure

Runtime files live under `config/`:

- `config/index.html`: page shell, SVG symbol sprite, stylesheet/script references.
- `config/app-config.json`: user-editable settings, currently only `defaultPath`.
- `config/css/*.css`: focused style modules; each file under 300 lines.
- `config/js/*.js`: focused JavaScript modules; each file under 300 lines.
- `config/vendor/jsmediatags.min.js`: unchanged third-party library.

Tooling lives under `tools/`:

- `tools/check-file-lines.js`: fails if source files exceed 300 lines.
- `tools/check-static-references.js`: fails if HTML references missing CSS/JS/vendor files.

Do not move files back to the repository root. The current user move to `config/` is the baseline.

### Task 1: Add Structural Checks

**Files:**
- Create: `tools/check-file-lines.js`
- Create: `tools/check-static-references.js`
- Modify: none

- [ ] **Step 1: Write the failing line-limit check**

Create `tools/check-file-lines.js` with this content:

```js
// 检查源码文件行数，避免重构后再次形成巨型文件。
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const MAX_LINES = 300;
const CHECK_DIRS = ['config', 'tools'];
const CHECK_EXTS = new Set(['.html', '.css', '.js', '.json']);
const IGNORE = new Set(['config/vendor/jsmediatags.min.js']);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return full;
  });
}

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

const tooLarge = CHECK_DIRS
  .flatMap((dir) => walk(path.join(ROOT, dir)))
  .filter((file) => CHECK_EXTS.has(path.extname(file)))
  .filter((file) => !IGNORE.has(rel(file)))
  .map((file) => ({ file: rel(file), lines: fs.readFileSync(file, 'utf8').split(/\r?\n/).length }))
  .filter((item) => item.lines > MAX_LINES);

if (tooLarge.length) {
  console.error('Files exceed 300 lines:');
  for (const item of tooLarge) console.error(`${item.file}: ${item.lines}`);
  process.exit(1);
}

console.log('All checked source files are within 300 lines.');
```

- [ ] **Step 2: Run the check and verify it fails on current files**

Run:

```bash
node tools/check-file-lines.js
```

Expected: FAIL listing `config/index.html`, `config/index.css`, and `config/index.js`.

- [ ] **Step 3: Write the static reference check**

Create `tools/check-static-references.js` with this content:

```js
// 检查 index.html 中的本地 CSS/JS 引用是否存在。
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const htmlPath = path.join(ROOT, 'config', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const refs = [...html.matchAll(/(?:href|src)="(\.\/[^"]+)"/g)].map((match) => match[1]);
const missing = refs
  .map((ref) => ({ ref, file: path.resolve(path.dirname(htmlPath), ref) }))
  .filter((item) => !fs.existsSync(item.file));

if (missing.length) {
  console.error('Missing local references:');
  for (const item of missing) console.error(item.ref);
  process.exit(1);
}

console.log('All local static references exist.');
```

- [ ] **Step 4: Run the reference check and record current expected failure**

Run:

```bash
node tools/check-static-references.js
```

Expected before HTML rewrite: PASS if old `../config/...` references are still present but not matched by the new checker. After HTML rewrite in Task 4, this command must actively check all `./` references.

- [ ] **Step 5: Commit**

```bash
git add tools/check-file-lines.js tools/check-static-references.js
git commit -m "test: add static structure checks"
```

### Task 2: Add JSON Configuration

**Files:**
- Create: `config/app-config.json`
- Create: `config/js/config.js`
- Create: `tools/test-config-loader.mjs`

- [ ] **Step 1: Write the failing config-loader test**

Create `tools/test-config-loader.mjs` with this content:

```js
import assert from 'node:assert/strict';
import { loadAppConfig, DEFAULT_CONFIG } from '../config/js/config.js';

const okFetch = async () => ({
  ok: true,
  async json() {
    return { defaultPath: 'E:\\Share' };
  },
});

const badFetch = async () => {
  throw new Error('network');
};

const loaded = await loadAppConfig(okFetch);
assert.equal(loaded.defaultPath, 'E:\\Share');
assert.equal(loaded.pageSize, DEFAULT_CONFIG.pageSize);

const fallback = await loadAppConfig(badFetch);
assert.equal(fallback.defaultPath, DEFAULT_CONFIG.defaultPath);

console.log('config loader test passed');
```

- [ ] **Step 2: Run the test and verify it fails because `config/js/config.js` does not exist**

Run:

```bash
node tools/test-config-loader.mjs
```

Expected: FAIL with module not found for `config/js/config.js`.

- [ ] **Step 3: Add the user-editable config file**

Create `config/app-config.json`:

```json
{
  "defaultPath": "D:\\Data\\Github\\Everything-HTTP-Server-WebUI"
}
```

- [ ] **Step 4: Implement the minimal config loader**

Create `config/js/config.js`:

```js
// 应用配置：读取用户可编辑的 app-config.json，并提供安全回退值。
export const DEFAULT_CONFIG = Object.freeze({
  defaultPath: 'D:\\Data\\Share',
  pageSize: 100,
});

export async function loadAppConfig(fetchImpl = fetch) {
  try {
    const url = new URL('../app-config.json', import.meta.url);
    const response = await fetchImpl(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const userConfig = await response.json();
    return {
      ...DEFAULT_CONFIG,
      ...userConfig,
      defaultPath: String(userConfig.defaultPath || DEFAULT_CONFIG.defaultPath),
    };
  } catch (error) {
    console.warn('读取 app-config.json 失败，已使用内置默认配置。', error);
    return { ...DEFAULT_CONFIG };
  }
}
```

- [ ] **Step 5: Run the config-loader test and verify it passes**

Run:

```bash
node tools/test-config-loader.mjs
```

Expected: PASS with `config loader test passed`.

- [ ] **Step 6: Commit**

```bash
git add config/app-config.json config/js/config.js tools/test-config-loader.mjs
git commit -m "feat: load default path from json config"
```

### Task 3: Split CSS By Responsibility

**Files:**
- Create: `config/css/base.css`
- Create: `config/css/header.css`
- Create: `config/css/sidebar.css`
- Create: `config/css/layout.css`
- Create: `config/css/file-list.css`
- Create: `config/css/details.css`
- Create: `config/css/viewer.css`
- Create: `config/css/audio-player.css`
- Create: `config/css/utilities.css`
- Create: `config/css/responsive.css`
- Delete after verification: `config/index.css`

- [ ] **Step 1: Move base and theme styles**

Move root variables, `[data-theme="dark"]`, global reset, body, transitions, and scrollbar styles from `config/index.css` into `config/css/base.css`.

Add this file header:

```css
/* 基础样式：主题变量、全局 reset、滚动条和页面字体。 */
```

- [ ] **Step 2: Move header styles**

Move `.app-header`, `.nav-controls`, `.icon-btn`, `.address-container`, `.address-input`, `.clear-btn`, `.flyout-menu`, and related menu styles into `config/css/header.css`.

Add this file header:

```css
/* 顶部栏：地址栏、导航按钮、视图菜单和设置菜单。 */
```

- [ ] **Step 3: Move sidebar styles**

Move `.sidebar-mask`, `.sidebar`, `.sidebar-group-title`, `.sidebar-item`, `.tree-*`, and favorite list sidebar styles into `config/css/sidebar.css`.

Add this file header:

```css
/* 侧边栏：快速访问、磁盘树、收藏列表和移动端遮罩。 */
```

- [ ] **Step 4: Move layout, list, details, viewer, audio, utility, responsive styles**

Split remaining selectors by file responsibility:

```text
layout.css: .layout-container, .file-pane base sizing, .status-bar, .task-bar, .task-item
file-list.css: .grid-header, .file-row, .file-card, list/grid mode selectors, pagination
details.css: .details-pane, .preview-box, .preview-row, .info-group, .action-btn
viewer.css: .viewer-modal, .viewer-toolbar, .viewer-content, .viewer-text, .viewer-iframe, image/video preview
audio-player.css: .audio-player-container, .audio-* selectors, lyrics, volume, fullscreen, pinned mode
utilities.css: .toast, .flying-text-overlay, .flying-char, generic animations
responsive.css: every @media block
```

Each file must begin with a one-line Chinese responsibility comment.

- [ ] **Step 5: Run the line check**

Run:

```bash
node tools/check-file-lines.js
```

Expected at this point: FAIL only if `config/index.html` or `config/index.js` remain over 300 lines. No `config/css/*.css` file may be listed.

- [ ] **Step 6: Commit CSS split**

```bash
git add config/css config/index.css tools/check-file-lines.js
git commit -m "refactor: split css by ui area"
```

### Task 4: Rewrite HTML References And Move Vendor File

**Files:**
- Modify: `config/index.html`
- Create: `config/vendor/jsmediatags.min.js`
- Delete after verification: `config/jsmediatags.min.js`

- [ ] **Step 1: Replace old stylesheet and script references**

In `config/index.html`, replace the old head references with:

```html
    <link rel="stylesheet" href="./css/base.css">
    <link rel="stylesheet" href="./css/layout.css">
    <link rel="stylesheet" href="./css/header.css">
    <link rel="stylesheet" href="./css/sidebar.css">
    <link rel="stylesheet" href="./css/file-list.css">
    <link rel="stylesheet" href="./css/details.css">
    <link rel="stylesheet" href="./css/viewer.css">
    <link rel="stylesheet" href="./css/audio-player.css">
    <link rel="stylesheet" href="./css/utilities.css">
    <link rel="stylesheet" href="./css/responsive.css">

    <script defer src="./vendor/jsmediatags.min.js"></script>
    <script type="module" src="./js/app.js"></script>
```

- [ ] **Step 2: Move vendor library without editing its contents**

Run:

```bash
New-Item -ItemType Directory -Force config/vendor | Out-Null
Move-Item -LiteralPath config/jsmediatags.min.js -Destination config/vendor/jsmediatags.min.js
```

- [ ] **Step 3: Move inline SVG constants into `config/js/icons.js`**

Remove the trailing inline `<script>` from `config/index.html` that defines `svg_disk`, `svg_favorite_filled`, `svg_play`, and related constants. Create `config/js/icons.js` by copying those constant assignments unchanged and replacing each `const` with `export const`.

The first line of `config/js/icons.js` must be:

```js
// 图标常量：供列表、收藏和播放器动态模板复用。
```

- [ ] **Step 4: Run reference check and line check**

Run:

```bash
node tools/check-static-references.js
node tools/check-file-lines.js
```

Expected: reference check PASS; line check may still FAIL for `config/index.js` only.

- [ ] **Step 5: Commit HTML/vendor changes**

```bash
git add config/index.html config/js/icons.js config/vendor config/jsmediatags.min.js
git commit -m "refactor: update static html references"
```

### Task 5: Split JavaScript Into Modules

**Files:**
- Create/modify: `config/js/app.js`
- Create/modify: `config/js/state.js`
- Create/modify: `config/js/dom.js`
- Create/modify: `config/js/api.js`
- Create/modify: `config/js/navigation.js`
- Create/modify: `config/js/render-list.js`
- Create/modify: `config/js/details.js`
- Create/modify: `config/js/favorites.js`
- Create/modify: `config/js/viewer.js`
- Create/modify: `config/js/audio-player.js`
- Create/modify: `config/js/audio-lyrics.js`
- Create/modify: `config/js/audio-visualizer.js`
- Create/modify: `config/js/subtitles.js`
- Create/modify: `config/js/interactions.js`
- Create/modify: `config/js/format.js`
- Delete after verification: `config/index.js`

- [ ] **Step 1: Create the compatibility app entry**

Create `config/js/app.js` with imports from the split modules and this startup shape:

```js
// 应用入口：组合各功能模块，并继续暴露 window.app 兼容 HTML 内联事件。
import { loadAppConfig } from './config.js';
import { createState } from './state.js';
import { queryDom } from './dom.js';
import { attachApiMethods } from './api.js';
import { attachNavigationMethods } from './navigation.js';
import { attachRenderListMethods } from './render-list.js';
import { attachDetailsMethods } from './details.js';
import { attachFavoriteMethods } from './favorites.js';
import { attachViewerMethods } from './viewer.js';
import { attachAudioMethods } from './audio-player.js';
import { attachSubtitleMethods } from './subtitles.js';
import { attachInteractionMethods } from './interactions.js';
import { attachFormatMethods } from './format.js';

const app = {
  config: await loadAppConfig(),
  state: createState(),
  dom: {},
};

[
  attachFormatMethods,
  attachApiMethods,
  attachNavigationMethods,
  attachRenderListMethods,
  attachDetailsMethods,
  attachFavoriteMethods,
  attachViewerMethods,
  attachAudioMethods,
  attachSubtitleMethods,
  attachInteractionMethods,
].forEach((attach) => attach(app));

app.init = function init() {
  this.dom = queryDom();
  this.applyTheme();
  this.updateMenusUI();
  this.loadDrives();
  this.renderFavorites();
  this.initResize();
  this.initDragHandles();
  this.initSidebarSwipe();
  this.initSubtitleHandler();
  this.bindGlobalEvents();
  this.navigateTo(this.config.defaultPath);
};

window.app = app;
document.addEventListener('DOMContentLoaded', () => app.init());
```

- [ ] **Step 2: Extract state and DOM modules**

Move the current `state` object body into `createState()` in `config/js/state.js`. Move the current `dom` object body into `queryDom()` in `config/js/dom.js`.

Each module must start with:

```js
// 状态模块：创建一次应用运行期状态，避免散落的全局变量。
```

or:

```js
// DOM 模块：集中查询页面节点，减少重复选择器和拼写错误。
```

- [ ] **Step 3: Extract API and navigation methods**

Move methods related to Everything HTTP API and path movement:

```text
api.js: loadDrives, fetchData, getFileUrl, mockData
navigation.js: navigateTo, goBack, goForward, goUp, refresh, updatePagination, prevPage, nextPage, jumpToPage, sort
```

Each file exports one `attach*Methods(app)` function that assigns methods to `app`:

```js
// 导航模块：维护路径、历史记录、分页和排序。
export function attachNavigationMethods(app) {
  app.navigateTo = navigateTo;
  app.goBack = goBack;
  app.goForward = goForward;
  app.goUp = goUp;
  app.refresh = refresh;
  app.updatePagination = updatePagination;
  app.prevPage = prevPage;
  app.nextPage = nextPage;
  app.jumpToPage = jumpToPage;
  app.sort = sort;
}
```

- [ ] **Step 4: Extract list, details, favorites, viewer, audio, subtitle and interaction modules**

Move methods by responsibility:

```text
render-list.js: renderHeader, startResize, renderList, getFileIcon, selectItem, bgClick
details.js: renderDetails, closeDetails, copyText, fallbackCopyText, showToast, handleOpenAction, triggerDownload, getFileType
favorites.js: renderFavorites, openFavorite, toggleFavoriteCurrent, toggleFavoriteFromDetail, updateViewerFavIcon
viewer.js: minimizeViewer, hideViewer, closeViewer, closeFile, renderTaskBar, zoomImage, startDragImage, updateImageTransform
audio-player.js: buildAudioPlayerHTML, playNextInFavorites, toggleLoop, togglePin, updateLoopBtnUI
audio-lyrics.js: parseLrc, renderLyrics, syncLyrics, seekToLyric, formatTime
subtitles.js: initSubtitleHandler, triggerSubtitleLoad, handleSubtitleFile, changeSubtitle, srt2webvtt
interactions.js: bindGlobalEvents, animateClear, initDragHandles, initSidebarSwipe, startDrag, onDragMove, endDrag, toggleViewMenu, toggleSettingsMenu, toggleSidebar, setView, toggleTheme, toggleHidden, toggleCopyInfo, setOpenMethod, toggleFullScreen, applyTheme, updateMenusUI, initResize, toggleTree, getAverageRGB, isLightColor
format.js: formatSize, parseDate, formatDateObj
```

If any target file exceeds 300 lines, split it again by the smallest responsibility listed above.

- [ ] **Step 5: Import icon constants where dynamic templates need them**

Replace global icon variables in JS modules with imports from `./icons.js`, for example:

```js
import { svg_disk, svg_favorite_filled, svg_favorite_outline } from './icons.js';
```

- [ ] **Step 6: Run checks**

Run:

```bash
node tools/test-config-loader.mjs
node tools/check-static-references.js
node tools/check-file-lines.js
```

Expected: all PASS.

- [ ] **Step 7: Commit JS split**

```bash
git add config/js config/index.js
git commit -m "refactor: split javascript modules"
```

### Task 6: Update Documentation

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update config instructions**

Replace the old instruction that tells users to edit `index.js` with:

```md
2. 本地化
打开 `config/app-config.json`，修改 `defaultPath`：

```json
{
  "defaultPath": "D:\\Data\\Share"
}
```

注意：JSON 字符串中的反斜杠需要写成 `\\`，例如 `D:\Data\Share` 应写为 `D:\\Data\\Share`。
```

- [ ] **Step 2: Update directory description**

Show the expected runtime layout:

```text
config/
  index.html
  app-config.json
  css/
  js/
  vendor/
```

- [ ] **Step 3: Run checks**

Run:

```bash
node tools/check-file-lines.js
node tools/check-static-references.js
node tools/test-config-loader.mjs
```

Expected: all PASS.

- [ ] **Step 4: Commit docs**

```bash
git add README.md
git commit -m "docs: document json default path config"
```

### Task 7: Browser Verification On localhost:11080

**Files:**
- Verify: `config/index.html`
- Verify: `config/app-config.json`
- Verify: `config/css/*.css`
- Verify: `config/js/*.js`

- [ ] **Step 1: Open the app at the configured test port**

Use a browser to open:

```text
http://localhost:11080/config/index.html
```

If Everything serves `config/index.html` as the root page, also test:

```text
http://localhost:11080/
```

- [ ] **Step 2: Verify the console**

Expected: no module load errors, no missing CSS/JS/vendor files, and no JSON config parse errors.

- [ ] **Step 3: Verify core flows**

Check these flows:

```text
默认路径加载
磁盘列表加载
文件夹导航、后退、前进、上一级、刷新
列表/网格切换
排序和分页
详情面板、复制属性、下载
收藏添加/取消和收藏列表
文本、图片、PDF、音频、视频预览
移动端侧边栏和详情面板拖拽
```

- [ ] **Step 4: Fix any defects with failing checks first**

For a module/config defect, add or update the relevant Node check before fixing. For browser-only rendering defects, reproduce in the browser, fix the smallest affected module, then rerun:

```bash
node tools/check-file-lines.js
node tools/check-static-references.js
node tools/test-config-loader.mjs
```

- [ ] **Step 5: Final commit**

```bash
git status --short
git add config README.md tools
git commit -m "refactor: modularize static webui"
```

Skip this commit if all prior task commits already contain every change and `git status --short` shows no remaining refactor files.
