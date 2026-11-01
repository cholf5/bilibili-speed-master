#!/usr/bin/env node
// F-2: Chrome Web Store submission — zero-dependency REST client.
//
// Requires a Web Store OAuth refresh token (see store-assets/SOP.md §2.1):
//   CWS_CLIENT_ID, CWS_CLIENT_SECRET, CWS_REFRESH_TOKEN, CWS_ITEM_ID
//
// Usage:
//   node submit-chrome.mjs status                 # item review status
//   node submit-chrome.mjs upload [zipPath]       # upload package (default .output/bilibili-speed-master-<ver>-chrome.zip)
//   node submit-chrome.mjs publish [public|testers]  # submit for review (testers = trusted testers only)
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

const CLIENT_ID = process.env.CWS_CLIENT_ID;
const CLIENT_SECRET = process.env.CWS_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.CWS_REFRESH_TOKEN;
const ITEM_ID = process.env.CWS_ITEM_ID;

const API = 'https://www.googleapis.com';
const SCOPE = 'https://www.googleapis.com/auth/chromewebstore';

const fail = (msg) => {
  console.error('ERROR:', msg);
  process.exit(1);
};

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN || !ITEM_ID) {
  fail('set CWS_CLIENT_ID / CWS_CLIENT_SECRET / CWS_REFRESH_TOKEN / CWS_ITEM_ID (see SOP §2.1)');
}

// googleapis.com is unreachable from CN networks without a proxy; Node ≥24
// honors NODE_USE_ENV_PROXY=1 + HTTPS_PROXY for native fetch.
if (!process.env.HTTPS_PROXY && !process.env.https_proxy) {
  console.warn(
    'WARN: HTTPS_PROXY not set. If googleapis.com is blocked on this network, run:\n' +
      '  NODE_USE_ENV_PROXY=1 HTTPS_PROXY=http://127.0.0.1:<port> node ' +
      process.argv[1],
  );
}

const accessToken = async () => {
  const res = await fetch(`${API}/oauth2/v4/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
      grant_type: 'refresh_token',
      scope: SCOPE,
    }),
  });
  const json = await res.json();
  if (!json.access_token) fail('token refresh failed: ' + JSON.stringify(json));
  return json.access_token;
};

const cmd = process.argv[2] ?? 'status';

if (cmd === 'status') {
  const token = await accessToken();
  const res = await fetch(`${API}/chromewebstore/v1.1/items/${ITEM_ID}`, {
    headers: { authorization: `Bearer ${token}`, 'x-goog-api-version': '2' },
  });
  console.log(JSON.stringify(await res.json(), null, 2));
} else if (cmd === 'upload') {
  const zipPath = process.argv[3] ?? '.output/bilibili-speed-master-0.1.0-chrome.zip';
  const zip = readFileSync(zipPath);
  const token = await accessToken();
  const res = await fetch(
    `${API}/upload/chromewebstore/v1.1/items/${ITEM_ID}?uploadType=media`,
    {
      method: 'PUT',
      headers: {
        authorization: `Bearer ${token}`,
        'x-goog-api-version': '2',
        'x-goog-upload-file-name': basename(zipPath),
        'content-type': 'application/zip',
      },
      body: zip,
    },
  );
  console.log(JSON.stringify(await res.json(), null, 2));
} else if (cmd === 'publish') {
  const target = process.argv[3] ?? 'testers'; // default: not public, safety first
  const token = await accessToken();
  const res = await fetch(`${API}/chromewebstore/v1.1/items/${ITEM_ID}/publish`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'x-goog-api-version': '2',
      'content-length': 0,
    },
    body: new URLSearchParams({ publishTarget: target === 'public' ? 'public' : 'trustedTesters' }),
  });
  console.log(JSON.stringify(await res.json(), null, 2));
} else {
  fail(`unknown command: ${cmd}`);
}
