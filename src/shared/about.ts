// Copyright (c) 2026 cholf5
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Single source for the open-source identity shown in the popup and options
// about sections — repo, feedback channel, license — so the UI never drifts
// from the README/manifest.

export const SOURCE_REPO_URL = 'https://github.com/cholf5/bilibili-speed-master';
export const FEEDBACK_URL = `${SOURCE_REPO_URL}/issues`;
export const LICENSE_NAME = 'MPL-2.0';
export const LICENSE_URL = 'https://www.mozilla.org/en-US/MPL/2.0/';

/**
 * Store listing for the "rate me" link. Null until the extension is actually
 * published (the README install badges are placeholders); consumers render
 * nothing while this is null instead of linking to a dead page. Fill the
 * Chrome Web Store URL (and switch to a browser-detected store if Firefox
 * ships) at release time.
 */
export const RATE_URL: string | null = null;

// Reads the packaged manifest version at runtime (browser/chrome namespaces,
// same dual-namespace pattern as the UI entrypoints). Null outside a real
// extension runtime (tests, plain tabs) so callers can omit the version chip.
export const getAppVersion = (): string | null => {
  const root = globalThis as typeof globalThis & { browser?: any; chrome?: any };
  const getManifest = root.browser?.runtime?.getManifest ?? root.chrome?.runtime?.getManifest;
  if (typeof getManifest !== 'function') {
    return null;
  }
  try {
    const version = getManifest().version;
    return typeof version === 'string' && version !== '' ? version : null;
  } catch {
    return null;
  }
};
