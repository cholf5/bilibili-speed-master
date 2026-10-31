// Copyright (c) 2026 cholf5
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
import { afterEach, describe, expect, it } from 'vitest';
import {
  FEEDBACK_URL,
  LICENSE_NAME,
  LICENSE_URL,
  SOURCE_REPO_URL,
  getAppVersion,
} from '@/src/shared/about';

const root = globalThis as typeof globalThis & { browser?: any; chrome?: any };

afterEach(() => {
  delete root.browser;
  delete root.chrome;
});

describe('about constants', () => {
  it('points at the canonical repo and its issue tracker', () => {
    expect(SOURCE_REPO_URL).toBe('https://github.com/cholf5/bilibili-speed-master');
    expect(FEEDBACK_URL).toBe(`${SOURCE_REPO_URL}/issues`);
  });

  it('links the MPL-2.0 license text', () => {
    expect(LICENSE_NAME).toBe('MPL-2.0');
    expect(LICENSE_URL).toBe('https://www.mozilla.org/en-US/MPL/2.0/');
  });
});

describe('getAppVersion', () => {
  it('reads the version from the browser runtime manifest', () => {
    root.browser = { runtime: { getManifest: () => ({ version: '1.2.3' }) } };
    expect(getAppVersion()).toBe('1.2.3');
  });

  it('falls back to the chrome namespace', () => {
    root.chrome = { runtime: { getManifest: () => ({ version: '2.0.0' }) } };
    expect(getAppVersion()).toBe('2.0.0');
  });

  it('returns null when no extension runtime is available', () => {
    expect(getAppVersion()).toBeNull();
  });

  it('returns null when the manifest shape is unexpected', () => {
    root.browser = { runtime: { getManifest: () => ({}) } };
    expect(getAppVersion()).toBeNull();
    root.browser = { runtime: {} };
    expect(getAppVersion()).toBeNull();
  });
});
