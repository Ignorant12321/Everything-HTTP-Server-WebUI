// 检查 index.html 中的本地 CSS/JS 引用在 / 和 /config/index.html 下都能解析。
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const htmlPath = path.join(ROOT, 'config', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const refs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)]
  .map((match) => match[1])
  .filter((ref) => !/^https?:\/\//.test(ref));

const serveRoots = ['/', '/config/index.html'];
const missing = [];

for (const pageUrl of serveRoots) {
  for (const ref of refs) {
    const urlPath = new URL(ref, `http://localhost:11080${pageUrl}`).pathname;
    const file = path.join(ROOT, urlPath.replace(/^\//, ''));
    if (!fs.existsSync(file)) missing.push({ pageUrl, ref, urlPath });
  }
}

if (missing.length) {
  console.error('Missing local references:');
  for (const item of missing) console.error(`${item.pageUrl} -> ${item.ref} resolves ${item.urlPath}`);
  process.exit(1);
}

console.log('All local static references exist.');
