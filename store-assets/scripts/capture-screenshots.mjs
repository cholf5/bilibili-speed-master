#!/usr/bin/env node
// F-2: store-screenshot pipeline — zero-dependency CDP driver.
//
// Three capture routes:
//   A. popup → the REAL built popup bundle rendered on http with a mock
//      chrome.* layer (the true extension popup auto-dismisses under CDP),
//      framed on a branded board (popup-board.html) — 1280x800
//   B. options (+ shortcuts card) → REAL extension tab with seeded storage
//   C. video page with corner widget → REAL extension on a real Bilibili video
//
// Raw 2x PNGs land in store-assets/screenshots/raw/; store-size derivatives
// are produced afterwards via imaging.py compose.

import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const ROOT = '/Users/theo/dev/cholf5/bilibili-speed-master';
const EXT_DIR = `${ROOT}/.output/chrome-mv3`;
const OUT = `${ROOT}/store-assets/screenshots/raw`;
const DEBUG_PORT = 9222;
const HTTP_PORT = 4519;

const CHROME = process.env.CHROME_BIN;
const VIDEO_URL = process.env.VIDEO_URL || 'https://www.bilibili.com/video/BV1GJ411x7h7';

if (!CHROME) {
  console.error('CHROME_BIN not set (Chrome for Testing binary path)');
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });

// ---------------- CDP plumbing (Node native WebSocket) ----------------

class CDP {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
    this.open = new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', () => reject(new Error(`ws error: ${wsUrl}`)), { once: true });
    });
    this.ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      }
    });
  }
  async send(method, params = {}) {
    await this.open;
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`CDP timeout: ${method}`));
        }
      }, 30000);
    });
  }
  close() {
    try {
      this.ws.close();
    } catch {}
  }
}

const httpGetJson = (url) => fetch(url).then((r) => r.json());
const targetList = () => httpGetJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`);

async function evalInPage(cdp, expression) {
  const res = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (res.exceptionDetails) {
    throw new Error('page eval failed: ' + JSON.stringify(res.exceptionDetails).slice(0, 500));
  }
  return res.result?.value;
}

async function shoot(cdp, path, clip) {
  const params = { format: 'png' };
  if (clip) params.clip = { ...clip, scale: 1 };
  const shot = await cdp.send('Page.captureScreenshot', params);
  writeFileSync(path, Buffer.from(shot.data, 'base64'));
  console.log('captured', path.split('/').pop());
}

// ---------------- main ----------------

const main = async () => {
  // A) http server for the popup board (mock route)
  const server = spawn(process.execPath, [`${ROOT}/store-assets/scripts/serve-store-assets.mjs`], {
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  await sleep(800);

  const profile = '/tmp/bilibili-speed-master-store-profile';
  rmSync(profile, { recursive: true, force: true });

  const chrome = spawn(
    CHROME,
    [
      `--user-data-dir=${profile}`,
      `--load-extension=${EXT_DIR}`,
      `--disable-extensions-except=${EXT_DIR}`,
      `--remote-debugging-port=${DEBUG_PORT}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-sync',
      '--disable-background-networking',
      '--disable-component-update',
      '--disable-features=Translate,MediaRouter',
      '--mute-audio',
      '--window-size=1920,1200',
      '--window-position=0,0',
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  );
  let stderr = '';
  chrome.stderr.on('data', (d) => (stderr += d));

  const cleanup = () => {
    chrome.kill('SIGTERM');
    server.kill('SIGTERM');
  };

  try {
    // 1) extension service worker (exact match — Chrome component SWs exist too)
    let swWs = null;
    let extId = null;
    for (let i = 0; i < 60; i++) {
      try {
        const sw = (await targetList()).find(
          (t) => t.type === 'service_worker' && t.url.endsWith('/background.js'),
        );
        if (sw) {
          swWs = sw.webSocketDebuggerUrl;
          extId = new URL(sw.url).host;
          break;
        }
      } catch {}
      await sleep(500);
    }
    if (!swWs) {
      throw new Error('extension service worker not found; chrome stderr:\n' + stderr.slice(-2000));
    }
    const swCdp = new CDP(swWs);
    await swCdp.open;

    // 2) seed chrome.storage from the extension context
    const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();
    const seedChannels = {
      '946974': { channelId: '946974', channelName: '影视飓风', speed: 1.5, lastVisit: daysAgo(0) },
      '546195': { channelId: '546195', channelName: '老番茄', speed: 1.25, lastVisit: daysAgo(1) },
      '378148': { channelId: '378148', channelName: '罗翔说刑法', speed: 1.75, lastVisit: daysAgo(2) },
      '8047632': { channelId: '8047632', channelName: '哔哩哔哩纪录片', speed: 1, lastVisit: daysAgo(3) },
      '5219': { channelId: '5219', channelName: '敖厂长', speed: 1.5, lastVisit: daysAgo(4) },
      '258150656': { channelId: '258150656', channelName: '技术蛋老师', speed: 2, lastVisit: daysAgo(5) },
      '436399183': { channelId: '436399183', channelName: '硬件茶谈', speed: 1.25, lastVisit: daysAgo(6) },
    };
    await evalInPage(
      swCdp,
      `new Promise((resolve, reject) => {
        const globalPart = {
          version: 1,
          global: {
            defaultSpeed: 1.5,
            preferredQuality: 'auto',
            showVideoWidget: true,
            videoWidgetPosition: 'topLeft',
            shortcuts: {},
          },
        };
        const channelsPart = ${JSON.stringify({ version: 1, channels: seedChannels })};
        chrome.storage.sync.set(
          { bilibiliSpeedMasterGlobal: globalPart, bilibiliSpeedMasterChannels: channelsPart },
          () => (chrome.runtime.lastError ? reject(new Error(chrome.runtime.lastError.message)) : resolve())
        );
      })`,
    );
    await evalInPage(
      swCdp,
      `new Promise((resolve, reject) => {
        chrome.storage.local.set(
          { bilibiliSpeedMasterStats: { timeSavedSeconds: 147000 } },
          () => (chrome.runtime.lastError ? reject(new Error(chrome.runtime.lastError.message)) : resolve())
        );
      })`,
    );
    console.log('storage seeded');

    const version = await httpGetJson(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
    const browserCdp = new CDP(version.webSocketDebuggerUrl);
    await browserCdp.open;

    // 3) route A: popup board on http (mock chrome layer + real popup bundle)
    const { targetId: boardTarget } = await browserCdp.send('Target.createTarget', {
      url: `http://127.0.0.1:${HTTP_PORT}/board.html`,
    });
    await sleep(3500);
    const boardCdp = new CDP((await targetList()).find((t) => t.id === boardTarget).webSocketDebuggerUrl);
    await boardCdp.open;
    await boardCdp.send('Page.enable');
    await boardCdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 800,
      deviceScaleFactor: 2,
      mobile: false,
    });
    await sleep(1200);
    const frameOk = await evalInPage(
      boardCdp,
      `(() => {
        const f = document.querySelector('iframe');
        return f && f.contentDocument?.querySelector('#root')?.childElementCount > 0
          ? 'popup rendered: ' + f.contentDocument.querySelector('#root').childElementCount + ' nodes'
          : 'popup NOT rendered';
      })()`,
    );
    console.log('board:', frameOk);
    if (!frameOk.includes('popup rendered')) throw new Error('popup mock render failed');
    await shoot(boardCdp, `${OUT}/popup-board-2x.png`);

    // 4) route B: options page (real extension, seeded storage)
    const { targetId: optTarget } = await browserCdp.send('Target.createTarget', {
      url: `chrome-extension://${extId}/options.html`,
    });
    await sleep(2500);
    const optCdp = new CDP((await targetList()).find((t) => t.id === optTarget).webSocketDebuggerUrl);
    await optCdp.open;
    await optCdp.send('Page.enable');
    await optCdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 960,
      deviceScaleFactor: 2,
      mobile: false,
    });
    await sleep(1200);
    await shoot(optCdp, `${OUT}/options-2x.png`);

    console.log('shortcuts:', await evalInPage(optCdp, `(() => {
      const el = document.querySelector('[class*="shortcut"]');
      if (el) el.scrollIntoView({ block: 'start' });
      return el ? 'scrolled' : 'not found';
    })()`));
    await sleep(800);
    await shoot(optCdp, `${OUT}/options-shortcuts-2x.png`);

    // 5) route C: real video page with the corner widget visible
    const { targetId } = await browserCdp.send('Target.createTarget', { url: VIDEO_URL });
    await sleep(12000);
    const pageCdp = new CDP((await targetList()).find((t) => t.id === targetId).webSocketDebuggerUrl);
    await pageCdp.open;
    await pageCdp.send('Page.enable');
    await pageCdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1920,
      height: 1200,
      deviceScaleFactor: 2,
      mobile: false,
    });
    await sleep(2500);

    console.log('video:', await evalInPage(pageCdp, `(() => {
      const v = document.querySelector('video');
      if (!v) return 'no video';
      v.currentTime = Math.min(600, (v.duration || 1200) * 0.35);
      v.pause();
      return 'ready';
    })()`));

    // de-noise: danmaku off, login banner closed, controls forced visible
    console.log('denoise:', await evalInPage(pageCdp, `(() => {
      const out = [];
      const dm = document.querySelector('.bpx-player-dm-switch input, .bui-danmaku-switch-input');
      if (dm && dm.checked) { dm.click(); out.push('danmaku off'); }
      const close = document.querySelector('.bpx-player-video-info-close, [class*="video-info"] .close, .bpx-player-block-warning-close');
      if (close) { close.click(); out.push('banner closed'); }
      return out.join(', ') || 'nothing to close';
    })()`));

    console.log('widget:', await evalInPage(pageCdp, `(() => {
      const c = document.querySelector('.bpx-player-container, .bilibili-player');
      if (!c) return 'no container';
      c.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
      c.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      return 'shown';
    })()`));
    await sleep(1200);
    await shoot(pageCdp, `${OUT}/video-2x.png`);

    await browserCdp.send('Browser.close').catch(() => {});
    cleanup();
    console.log('DONE');
  } catch (err) {
    console.error('FAILED:', err.message);
    cleanup();
    process.exitCode = 1;
  }
};

await main();
