#!/usr/bin/env node
// F-2: tiny static server for the popup store-shot.
//   /__mock/chrome.js  → store-assets/scripts/popup-mock.js
//   /popup-shot.html   → store-assets/scripts/popup-shot.html
//   /board.html        → store-assets/scripts/popup-board.html
//   /*                 → .output/chrome-mv3 (real popup bundle + css + fonts)
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = '/Users/theo/dev/cholf5/bilibili-speed-master';
const BUILD = `${ROOT}/.output/chrome-mv3`;
const SCRIPTS = `${ROOT}/store-assets/scripts`;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
};

const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = null;
  if (path === '/__mock/chrome.js') file = join(SCRIPTS, 'popup-mock.js');
  else if (path === '/board.html') file = join(SCRIPTS, 'popup-board.html');
  else if (path === '/popup-shot.html') {
    // the REAL built popup.html with the mock layer injected before its bundle
    const html = readFileSync(join(BUILD, 'popup.html'), 'utf8');
    const injected = html.replace(
      /<head([^>]*)>/,
      '<head$1><script src="/__mock/chrome.js"></script>',
    );
    res.writeHead(200, { 'content-type': MIME['.html'] });
    res.end(injected);
    return;
  } else {
    const candidate = join(BUILD, path === '/' ? 'index.html' : path);
    if (existsSync(candidate)) file = candidate;
  }
  if (!file) {
    res.writeHead(404).end('not found');
    return;
  }
  res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
});

server.listen(4519, '127.0.0.1', () => console.log('ready on 4519'));
