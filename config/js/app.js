// 应用入口：组合各功能模块，并继续暴露 window.app 兼容 HTML 内联事件。
import './svg-symbols.js';
import { loadAppConfig } from './config.js';
import { createState } from './state.js';
import { queryDom } from './dom.js';
import { attachFormatMethods } from './format.js';
import { attachApiMethods } from './api.js';
import { attachNavigationMethods } from './navigation.js';
import { attachRenderListMethods } from './render-list.js';
import { attachDetailsMethods } from './details.js';
import { attachFavoriteMethods } from './favorites.js';
import { attachViewerMethods } from './viewer.js';
import { attachAudioLyricsMethods } from './audio-lyrics.js';
import { attachAudioInitMethods } from './audio-init.js';
import { attachAudioMethods } from './audio-player.js';
import { attachSubtitleMethods } from './subtitles.js';
import { attachInteractionMethods } from './interactions.js';
import { attachDragMethods } from './drag.js';
import { attachLifecycleMethods } from './lifecycle.js';

const config = await loadAppConfig();
const app = { config, state: createState(), dom: {} };
app.state.count = config.pageSize;

[
  attachFormatMethods,
  attachApiMethods,
  attachNavigationMethods,
  attachRenderListMethods,
  attachDetailsMethods,
  attachFavoriteMethods,
  attachViewerMethods,
  attachAudioLyricsMethods,
  attachAudioInitMethods,
  attachAudioMethods,
  attachSubtitleMethods,
  attachInteractionMethods,
  attachDragMethods,
  attachLifecycleMethods,
].forEach((attach) => attach(app));

const originalInit = app.init;
app.init = function init() {
  this.dom = queryDom();
  originalInit.call(this);
};

window.app = app;
document.addEventListener('DOMContentLoaded', () => app.init());
