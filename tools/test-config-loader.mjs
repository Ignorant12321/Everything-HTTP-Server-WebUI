import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const configSource = fs.readFileSync(new URL('../config/js/config.js', import.meta.url), 'utf8');
const { loadAppConfig, DEFAULT_CONFIG, parseAppConfigText } = vm.runInNewContext(
  `${configSource};({ loadAppConfig, DEFAULT_CONFIG, parseAppConfigText });`,
  { console, URL },
);

let requestedUrl = '';

const okFetch = async (url) => ({
  ok: true,
  async text() {
    requestedUrl = String(url);
    return String.raw`defaultPath=E:\Share`;
  },
});

const spacedFetch = async () => ({
  ok: true,
  async text() {
    return String.raw`
# 默认打开目录
defaultPath = F:\Media
`;
  },
});

const badFetch = async () => {
  throw new Error('network');
};

const loaded = await loadAppConfig(okFetch);
assert.equal(loaded.defaultPath, 'E:\\Share');
assert.equal(loaded.pageSize, DEFAULT_CONFIG.pageSize);
assert.match(requestedUrl, /config\.ini$/);

const spaced = await loadAppConfig(spacedFetch);
assert.equal(spaced.defaultPath, 'F:\\Media');

assert.equal(parseAppConfigText('defaultPath=').defaultPath, '');

const originalWarn = console.warn;
console.warn = () => {};
const fallback = await loadAppConfig(badFetch);
console.warn = originalWarn;
assert.equal(fallback.defaultPath, DEFAULT_CONFIG.defaultPath);

console.log('config loader test passed');
