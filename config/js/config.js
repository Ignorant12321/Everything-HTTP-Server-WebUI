// 应用配置：读取用户可编辑的 app-config.json，并提供安全回退值。
const CONFIG_URL = typeof document !== 'undefined' && document.currentScript
  ? new URL('../app-config.json', document.currentScript.src).href
  : '../config/app-config.json';

const DEFAULT_CONFIG = Object.freeze({
  defaultPath: 'D:\\Data\\Share',
  pageSize: 100,
});

async function loadAppConfig(fetchImpl = fetch) {
  try {
    const response = await fetchImpl(CONFIG_URL);
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

if (typeof window !== 'undefined') window.AppConfig = { DEFAULT_CONFIG, loadAppConfig };
