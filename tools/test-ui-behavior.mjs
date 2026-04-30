import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../config/index.html', import.meta.url), 'utf8');
const interactions = fs.readFileSync(new URL('../config/js/interactions.js', import.meta.url), 'utf8');
const renderList = fs.readFileSync(new URL('../config/js/render-list.js', import.meta.url), 'utf8');
const viewer = fs.readFileSync(new URL('../config/js/viewer.js', import.meta.url), 'utf8');
const details = fs.readFileSync(new URL('../config/js/details.js', import.meta.url), 'utf8');
const detailsCss = fs.readFileSync(new URL('../config/css/details.css', import.meta.url), 'utf8');
const baseCss = fs.readFileSync(new URL('../config/css/base.css', import.meta.url), 'utf8');
const fileListCss = fs.readFileSync(new URL('../config/css/file-list.css', import.meta.url), 'utf8');
const layoutCss = fs.readFileSync(new URL('../config/css/layout.css', import.meta.url), 'utf8');
const sidebarCss = fs.readFileSync(new URL('../config/css/sidebar.css', import.meta.url), 'utf8');
const audioCss = fs.readFileSync(new URL('../config/css/audio-player.css', import.meta.url), 'utf8');
const responsiveAudioCss = fs.readFileSync(new URL('../config/css/responsive-audio.css', import.meta.url), 'utf8');
const utilitiesCss = fs.readFileSync(new URL('../config/css/utilities.css', import.meta.url), 'utf8');

const headerMatch = html.match(/<header class="app-header">([\s\S]*?)<\/header>/);
const localRefs = [...html.matchAll(/(?:href|src)="(\.\.\/config\/[^"]+)"/g)].map((match) => match[1]);
assert.ok(localRefs.length > 0, 'local static references exist');
assert.ok(localRefs.every((ref) => ref.includes('?v=20260430-ui7')), 'all local static references use the current cache-busting version');

assert.ok(headerMatch, 'header exists');
const header = headerMatch[1];
const addressStart = header.indexOf('<div class="address-container">');
const navStart = header.indexOf('<div class="nav-controls">');
const inputStart = header.indexOf('<input type="text" id="addressInput"');
assert.ok(navStart > addressStart && navStart < inputStart, 'navigation controls render inside the address bar before the search input');
assert.equal((header.match(/<div class="nav-controls">/g) || []).length, 1, 'only one navigation control group is rendered');
assert.doesNotMatch(html, /id="detailIcon"/, 'details preview row no longer renders a duplicate icon slot');
assert.doesNotMatch(details, /detailIcon/, 'details rendering no longer writes to a removed icon slot');
assert.doesNotMatch(detailsCss, /\.preview-icon/, 'details CSS no longer reserves preview-row icon space');
assert.match(baseCss, /--bg-pane:/, 'theme defines a dedicated file pane background token');
assert.match(baseCss, /--theme-transition:/, 'theme defines one shared transition timing token');
assert.match(baseCss, /--static-hairline:/, 'theme defines a static hairline color for non-theming guide lines');
assert.match(fileListCss, /\.file-pane\s*{[\s\S]*background-color:\s*var\(--bg-pane\)/, 'file pane uses the dedicated theme background');
assert.match(fileListCss, /#fileList\s*{[\s\S]*background-color:\s*var\(--bg-pane\)/, 'file list canvas uses the dedicated theme background');
assert.match(fileListCss, /\.file-row:hover\s*{[\s\S]*background-color:\s*var\(--row-hover\)/, 'file row hover uses a theme row token');
assert.match(fileListCss, /\.file-row\.selected\s*{[\s\S]*background-color:\s*var\(--row-selected\)/, 'file row selection uses a theme row token');
assert.match(layoutCss, /\.status-bar\s*{[\s\S]*background-color:\s*var\(--bg-mica\)/, 'status bar follows the outer chrome theme');
assert.match(fileListCss, /\.header-cell:not\(:last-child\)::after\s*{[\s\S]*background-color:\s*var\(--static-hairline\)/, 'column resize guide line keeps a static color');
assert.match(sidebarCss, /\.tree-children\s*{[\s\S]*border-left:\s*1px solid var\(--static-hairline\)/, 'tree children guide line keeps a static color');
const themeTransitionRule = utilitiesCss.match(/\/\* 统一主题切换节奏[\s\S]*?\}\n/);
assert.ok(themeTransitionRule, 'utilities defines a shared theme transition rule');
for (const selector of ['.app-header', '.sidebar', '.file-pane', '#fileList', '.file-row', '.status-bar', '.page-input']) {
  assert.ok(themeTransitionRule[0].includes(selector), `${selector} participates in the shared theme transition`);
}
assert.match(themeTransitionRule[0], /background-color var\(--theme-transition\)[\s\S]*color var\(--theme-transition\)[\s\S]*border-color var\(--theme-transition\)/, 'theme surfaces share the same color transition timing');

const interactionContext = {
  console,
  localStorage: { setItem() {}, getItem() { return null; } },
  document: { getElementById: () => ({ style: {}, classList: { toggle() {}, remove() {} } }) },
};
vm.createContext(interactionContext);
vm.runInContext(`${interactions}; this.attachInteractionMethods = attachInteractionMethods;`, interactionContext);
const classList = {
  values: new Set(['show']),
  add(name) { this.values.add(name); },
  remove(name) { this.values.delete(name); },
  toggle(name) { this.values.has(name) ? this.values.delete(name) : this.values.add(name); },
  contains(name) { return this.values.has(name); },
};
const app = {
  state: { viewMode: 'list' },
  dom: {
    settingsMenu: { classList: { remove() {} } },
    viewMenu: { classList },
    list: { className: '' },
    header: { style: {} },
  },
  renderListCalled: false,
  updateMenusUICalled: false,
  renderHeader() {},
  renderList() { this.renderListCalled = true; },
  updateMenusUI() { this.updateMenusUICalled = true; },
};
interactionContext.attachInteractionMethods(app);
app.toggleViewMenu({ stopPropagation() {} });
assert.equal(app.state.viewMode, 'grid', 'view button switches from list to grid on click');
assert.equal(classList.contains('show'), false, 'view button does not open the old view menu');
assert.equal(app.renderListCalled, true, 'view switch re-renders the file list');

assert.ok(!interactions.includes('chars.forEach'), 'clear animation avoids per-character DOM animation');
assert.ok(!interactions.includes('filter: blur'), 'clear animation avoids expensive blur work in JS-controlled effects');
assert.ok(interactions.includes('addressContainer.classList.add'), 'clear animation also marks the address container for the refined sweep effect');

const renderContext = { console, window: {} };
vm.createContext(renderContext);
vm.runInContext(`${renderList}; this.attachRenderListMethods = attachRenderListMethods;`, renderContext);
const iconApp = {};
renderContext.attachRenderListMethods(iconApp);
for (const [name, kind] of [
  ['holiday.png', 'image'],
  ['setup.exe', 'program'],
  ['archive.7z', 'archive'],
  ['notes.md', 'code'],
]) {
  const icon = iconApp.getFileIcon(name, false);
  assert.match(icon, /file-type-icon/, `${name} uses the modern SVG icon shell`);
  assert.match(icon, new RegExp(`file-icon-${kind}`), `${name} uses ${kind} styling`);
}
assert.match(iconApp.getFileIcon('Music', true), /file-icon-folder/, 'folders use the folder SVG style');

const fallbackDownloadIndex = viewer.indexOf('fallback-download');
const fallbackOpenIndex = viewer.indexOf('fallback-open');
const fallbackCancelIndex = viewer.indexOf('fallback-cancel');
assert.ok(fallbackDownloadIndex !== -1, 'unsupported preview fallback includes an immediate download action');
assert.ok(fallbackOpenIndex !== -1, 'unsupported preview fallback includes an open in new window action');
assert.ok(fallbackCancelIndex !== -1, 'unsupported preview fallback includes a cancel action');
assert.match(viewer, /<div class="fallback-actions">[\s\S]*fallback-download[\s\S]*fallback-open[\s\S]*fallback-cancel[\s\S]*<\/div>/, 'fallback actions share one row container');
assert.match(utilitiesCss, /\.fallback-actions\s*{[\s\S]*display:\s*flex;[\s\S]*align-items:\s*center;[\s\S]*justify-content:\s*center;/, 'fallback actions are laid out in one centered flex row');
assert.match(utilitiesCss, /\.fallback-msg \.file-type-icon\s*{[\s\S]*width:\s*144px;[\s\S]*height:\s*144px;/, 'file-container fallback icon is enlarged');
assert.match(utilitiesCss, /\.fallback-actions\s*{[\s\S]*flex-wrap:\s*nowrap;/, 'fallback actions stay on one line');
assert.ok(fallbackDownloadIndex < fallbackOpenIndex, 'download action appears before open in new window');
assert.ok(fallbackOpenIndex < fallbackCancelIndex, 'cancel action appears after open in new window');

assert.match(audioCss, /--audio-cover-lift-desktop/, 'desktop audio cover lift is defined');
assert.match(responsiveAudioCss, /--audio-cover-lift-mobile/, 'mobile audio cover lift is defined separately');

console.log('ui behavior test passed');
