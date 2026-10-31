// F-2: mock chrome.* layer for rendering the REAL popup bundle on a plain
// http page (the extension popup auto-dismisses under CDP, so the store
// screenshot is produced from the actual built popup code + mocked data).
// Loaded before the popup bundle; mirrors the API surface App.tsx uses:
// storage.sync/local (callback style), tabs.query/sendMessage/connect,
// runtime.getManifest/onConnect. navigator.language is pinned to zh-CN
// before the bundle imports src/shared/i18n.ts.

(() => {
  // instance-level shadow: prototype redefinition may be rejected
  Object.defineProperty(navigator, 'language', { get: () => 'zh-CN', configurable: true });
  Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh'], configurable: true });

  const GLOBAL_KEY = 'bilibiliSpeedMasterGlobal';
  const CHANNELS_KEY = 'bilibiliSpeedMasterChannels';
  const STATS_KEY = 'bilibiliSpeedMasterStats';

  const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();
  const channels = {
    '946974': { channelId: '946974', channelName: '影视飓风', speed: 1.5, lastVisit: daysAgo(0) },
    '546195': { channelId: '546195', channelName: '老番茄', speed: 1.25, lastVisit: daysAgo(1) },
    '378148': { channelId: '378148', channelName: '罗翔说刑法', speed: 1.75, lastVisit: daysAgo(2) },
    '8047632': { channelId: '8047632', channelName: '哔哩哔哩纪录片', speed: 1, lastVisit: daysAgo(3) },
    '5219': { channelId: '5219', channelName: '敖厂长', speed: 1.5, lastVisit: daysAgo(4) },
    '258150656': { channelId: '258150656', channelName: '技术蛋老师', speed: 2, lastVisit: daysAgo(5) },
    '436399183': { channelId: '436399183', channelName: '硬件茶谈', speed: 1.25, lastVisit: daysAgo(6) },
  };

  const syncStore = {
    [GLOBAL_KEY]: {
      version: 1,
      global: {
        defaultSpeed: 1.5,
        preferredQuality: 'auto',
        showVideoWidget: true,
        videoWidgetPosition: 'topLeft',
        shortcuts: {},
      },
    },
    [CHANNELS_KEY]: { version: 1, channels },
  };
  const localStore = { [STATS_KEY]: { timeSavedSeconds: 147000 } };

  const currentChannel = {
    channelId: '946974',
    channelName: '影视飓风',
    avatarUrl: '',
  };
  const currentSpeed = 1.5;

  const respond = (message) => {
    if (message?.type === 'speed-master:get-current-channel') {
      return { channel: currentChannel };
    }
    if (message?.type === 'speed-master:get-current-speed') {
      return { speed: currentSpeed };
    }
    return {};
  };

  window.chrome = {
    runtime: {
      id: 'mock-extension-id',
      getManifest: () => ({ manifest_version: 3, name: 'Bilibili Speed Master', version: '0.1.0' }),
      onConnect: { addListener() {} },
      onMessage: { addListener() {} },
      lastError: null,
    },
    storage: {
      sync: {
        get(keys, cb) {
          const out = {};
          const list = keys == null ? Object.keys(syncStore) : [].concat(keys);
          for (const k of list) if (k in syncStore) out[k] = syncStore[k];
          setTimeout(() => cb(out), 10);
        },
        set(items, cb) {
          Object.assign(syncStore, items);
          setTimeout(cb, 10);
        },
      },
      local: {
        get(keys, cb) {
          const out = {};
          const list = keys == null ? Object.keys(localStore) : [].concat(keys);
          for (const k of list) if (k in localStore) out[k] = localStore[k];
          setTimeout(() => cb(out), 10);
        },
        set(items, cb) {
          Object.assign(localStore, items);
          setTimeout(cb, 10);
        },
      },
    },
    tabs: {
      query(_info, cbOrOpts) {
        const tabs = [{ id: 1, url: 'https://www.bilibili.com/video/BV1GJ411x7h7' }];
        // MV3 Chrome returns Promises when no callback is passed; App.tsx
        // awaits tabs.query, so both calling conventions must work.
        if (typeof cbOrOpts === 'function') {
          setTimeout(() => cbOrOpts(tabs), 10);
          return;
        }
        return Promise.resolve(tabs);
      },
      sendMessage(_tabId, message, cbOrOpts) {
        const reply = respond(message);
        if (typeof cbOrOpts === 'function') {
          setTimeout(() => cbOrOpts(reply), 30);
          return;
        }
        return Promise.resolve(reply);
      },
      connect(_tabId, _opts) {
        const listeners = new Set();
        return {
          onMessage: { addListener(fn) { listeners.add(fn); } },
          onDisconnect: { addListener() {} },
          postMessage(message) {
            if (message?.type === 'speed-master:request-current-speed') {
              setTimeout(() => {
                for (const fn of listeners) fn({ type: 'speed-master:current-speed', speed: currentSpeed });
              }, 60);
            }
          },
        };
      },
    },
  };
})();
