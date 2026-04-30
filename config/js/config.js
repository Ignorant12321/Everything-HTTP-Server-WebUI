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
