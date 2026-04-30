// 检查 index.html 中的本地 CSS/JS 引用是否存在。
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const htmlPath = path.join(ROOT, 'config', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const refs = [...html.matchAll(/(?:href|src)="(\.\/[^"]+)"/g)].map((match) => match[1]);
const missing = refs
  .map((ref) => ({ ref, file: path.resolve(path.dirname(htmlPath), ref) }))
  .filter((item) => !fs.existsSync(item.file));

if (missing.length) {
  console.error('Missing local references:');
  for (const item of missing) console.error(item.ref);
  process.exit(1);
}

console.log('All local static references exist.');
