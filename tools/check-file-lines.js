// 检查源码文件行数，避免重构后再次形成巨型文件。
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const MAX_LINES = 300;
const CHECK_DIRS = ['config', 'tools'];
const CHECK_EXTS = new Set(['.html', '.css', '.js', '.json']);
const IGNORE = new Set(['config/vendor/jsmediatags.min.js']);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return full;
  });
}

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

const tooLarge = CHECK_DIRS
  .flatMap((dir) => walk(path.join(ROOT, dir)))
  .filter((file) => CHECK_EXTS.has(path.extname(file)))
  .filter((file) => !IGNORE.has(rel(file)))
  .map((file) => ({ file: rel(file), lines: fs.readFileSync(file, 'utf8').split(/\r?\n/).length }))
  .filter((item) => item.lines > MAX_LINES);

if (tooLarge.length) {
  console.error('Files exceed 300 lines:');
  for (const item of tooLarge) console.error(`${item.file}: ${item.lines}`);
  process.exit(1);
}

console.log('All checked source files are within 300 lines.');
