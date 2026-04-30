// 应用入口：组合各功能模块，并继续暴露 window.app 兼容 HTML 内联事件。
(async function bootstrapApp() {
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
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}
})();
