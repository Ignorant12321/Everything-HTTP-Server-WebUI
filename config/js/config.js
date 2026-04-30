// 应用配置：读取用户可编辑的 config.ini，并提供安全回退值。
const CONFIG_URL = typeof document !== 'undefined' && document.currentScript
  ? new URL('../config.ini', document.currentScript.src).href
  : '../config/config.ini';

const DEFAULT_CONFIG = Object.freeze({
  defaultPath: 'D:\\Data\\Share',
  pageSize: 100,
});

function parseAppConfigText(text) {
  const config = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    if (key !== 'defaultPath') continue;
    config.defaultPath = trimmed.slice(separatorIndex + 1).trim();
  }
  return config;
}

async function loadAppConfig(fetchImpl = fetch) {
  try {
    const response = await fetchImpl(CONFIG_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const userConfig = parseAppConfigText(await response.text());
    return {
      ...DEFAULT_CONFIG,
      defaultPath: String(userConfig.defaultPath || DEFAULT_CONFIG.defaultPath),
    };
  } catch (error) {
    console.warn('读取 config.ini 失败，已使用内置默认配置。', error);
    return { ...DEFAULT_CONFIG };
  }
}

if (typeof window !== 'undefined') window.AppConfig = { DEFAULT_CONFIG, loadAppConfig, parseAppConfigText };
