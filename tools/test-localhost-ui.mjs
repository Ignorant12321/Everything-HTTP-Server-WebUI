import assert from 'node:assert/strict';
import http from 'node:http';

const BASE_URL = process.env.UI_BASE_URL || 'http://localhost:11080';

function fetchText(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const req = http.get(url, { timeout: 10000 }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
          url: url.toString(),
        });
      });
    });
    req.on('timeout', () => {
      req.destroy(new Error(`Timed out fetching ${url}`));
    });
    req.on('error', reject);
  });
}

async function ok(path) {
  const response = await fetchText(path);
  assert.equal(response.statusCode, 200, `${response.url} returns HTTP 200`);
  return response;
}

const home = await ok('/');
assert.match(home.body, /20260430-ui7/, 'localhost root serves current cache-busted HTML');
assert.doesNotMatch(home.body, /id="detailIcon"/, 'localhost root does not serve the removed detail icon slot');
assert.match(home.body, /<div class="preview-row">\s*<div class="large-name"/, 'localhost root preview row starts directly with the filename');

const detailsCss = await ok('/config/css/details.css?v=20260430-ui7');
assert.match(detailsCss.body, /font-size:\s*76px;/, 'localhost details CSS serves enlarged preview icon size');
assert.match(detailsCss.body, /width:\s*96px;/, 'localhost details CSS serves enlarged SVG icon width');
assert.doesNotMatch(detailsCss.body, /\.preview-icon/, 'localhost details CSS no longer reserves preview-row icon space');

const viewerJs = await ok('/config/js/viewer.js?v=20260430-ui7');
assert.match(viewerJs.body, /<div class="fallback-actions">[\s\S]*fallback-download[\s\S]*fallback-open[\s\S]*fallback-cancel[\s\S]*<\/div>/, 'localhost viewer JS serves same-row fallback actions with cancel');

const utilitiesCss = await ok('/config/css/utilities.css?v=20260430-ui7');
assert.match(utilitiesCss.body, /\.fallback-msg \.file-type-icon\s*{[\s\S]*width:\s*144px;[\s\S]*height:\s*144px;/, 'localhost utilities CSS serves enlarged file-container fallback icon');
assert.match(utilitiesCss.body, /\.fallback-actions\s*{[\s\S]*flex-wrap:\s*nowrap;/, 'localhost utilities CSS keeps fallback actions on one line');

console.log(`localhost ui test passed for ${BASE_URL}`);
