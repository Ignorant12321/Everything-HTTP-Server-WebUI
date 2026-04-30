import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const configSource = fs.readFileSync(new URL('../config/js/config.js', import.meta.url), 'utf8');
const { loadAppConfig, DEFAULT_CONFIG } = vm.runInNewContext(
  `${configSource};({ loadAppConfig, DEFAULT_CONFIG });`,
  { console, URL },
);

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

const originalWarn = console.warn;
console.warn = () => {};
const fallback = await loadAppConfig(badFetch);
console.warn = originalWarn;
assert.equal(fallback.defaultPath, DEFAULT_CONFIG.defaultPath);

console.log('config loader test passed');
