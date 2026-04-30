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

const originalWarn = console.warn;
console.warn = () => {};
const fallback = await loadAppConfig(badFetch);
console.warn = originalWarn;
assert.equal(fallback.defaultPath, DEFAULT_CONFIG.defaultPath);

console.log('config loader test passed');
