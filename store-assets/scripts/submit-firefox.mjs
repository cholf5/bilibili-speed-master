#!/usr/bin/env node
// F-2: Firefox Add-ons (AMO) submission — zero-dependency REST client.
//
// Requires an AMO API key pair (see store-assets/SOP.md §2.2):
//   AMO_API_KEY, AMO_API_SECRET
//   AMO_ADDON_SLUG (only needed for updates; first submission finishes listing in the dashboard)
//   AMO_CHANNEL (optional: listed|unlisted, default listed)
//
// Usage:
//   node submit-firefox.mjs upload [extZip] [sourcesZip]
//     defaults: .output/*-firefox.zip + *-sources.zip (both required by AMO for minified builds)
import { createHmac, randomBytes } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { basename } from 'node:path';

const API_KEY = process.env.AMO_API_KEY;
const API_SECRET = process.env.AMO_API_SECRET;
const SLUG = process.env.AMO_ADDON_SLUG;
const CHANNEL = process.env.AMO_CHANNEL ?? 'listed';

const AMO = 'https://addons.mozilla.org/api/v5';

const fail = (msg) => {
  console.error('ERROR:', msg);
  process.exit(1);
};

if (!API_KEY || !API_SECRET) {
  fail('set AMO_API_KEY / AMO_API_SECRET (see SOP §2.2)');
}

// AMO auth: JWT signed HS256, ≤60s lifetime
const jwt = () => {
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const header = b64({ alg: 'HS256', typ: 'JWT' });
  const claim = b64({ iss: API_KEY, jti: randomBytes(12).toString('hex'), iat: now - 5, exp: now + 55 });
  const sig = createHmac('sha256', API_SECRET).update(`${header}.${claim}`).digest('base64url');
  return `${header}.${claim}.${sig}`;
};

const authHeaders = () => ({ authorization: `JWT ${jwt()}` });

const pollUpload = async (uploadPk) => {
  for (let i = 0; i < 120; i++) {
    const res = await fetch(`${AMO}/addons/upload/${uploadPk}/`, { headers: authHeaders() });
    const json = await res.json();
    if (json.processed) return json;
    await new Promise((r) => setTimeout(r, 3000));
  }
  fail('validation polling timed out (check dashboard)');
};

const cmd = process.argv[2] ?? 'upload';

if (cmd === 'upload') {
  const extZip = process.argv[3] ?? '.output/bilibili-speed-master-0.1.0-firefox.zip';
  const sourcesZip = process.argv[4] ?? '.output/bilibili-speed-master-0.1.0-sources.zip';
  if (!existsSync(extZip)) fail(`extension zip not found: ${extZip}`);
  if (!existsSync(sourcesZip)) fail(`sources zip not found (AMO requires source for minified builds): ${sourcesZip}`);

  const form = new FormData();
  form.append('channel', CHANNEL);
  form.append('upload', new Blob([readFileSync(extZip)], { type: 'application/zip' }), basename(extZip));
  form.append('sources', new Blob([readFileSync(sourcesZip)], { type: 'application/zip' }), basename(sourcesZip));

  const res = await fetch(`${AMO}/addons/upload/`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  const json = await res.json();
  if (!res.ok) fail('upload failed: ' + JSON.stringify(json));

  console.log('uploaded, pk:', json.pk ?? json.guid, '— validating…');
  const result = await pollUpload(json.pk ?? json.guid);
  const valid = result.validation?.valid;
  console.log('validation:', valid ? 'PASS' : 'FAIL');
  if (result.validation?.messages) {
    for (const m of result.validation.messages.slice(0, 20)) {
      console.log(`  [${m.type}] ${m.message}`);
    }
  }
  if (!valid) process.exit(1);

  if (SLUG) {
    const attach = await fetch(`${AMO}/addons/addon/${SLUG}/versions/`, {
      method: 'POST',
      headers: { ...authHeaders(), 'content-type': 'application/json' },
      body: JSON.stringify({ upload: json.pk, approval_notes: readFileSync('store-assets/listing/review-notes.md', 'utf8') }),
    });
    console.log('version attach:', attach.status, attach.ok ? 'OK' : await attach.text());
    console.log('done — review continues in: https://addons.mozilla.org/developers/addon/' + SLUG);
  } else {
    console.log('first submission: finish the listing in the dashboard:');
    console.log('  https://addons.mozilla.org/developers/addons/ (upload pk ' + (json.pk ?? '') + ')');
  }
} else {
  fail(`unknown command: ${cmd}`);
}
