// Copyright (c) 2026 cholf5
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
import { describe, expect, it, vi } from 'vitest';
import { messagesByLocale, setUiLocale, t, UI_LANGUAGE_VALUES } from '@/src/shared/i18n';

const referenceLocale = 'en';
const referenceKeys = Object.keys(messagesByLocale[referenceLocale]).sort();

describe('i18n messages', () => {
  it('exposes en as the reference locale with a non-empty key set', () => {
    expect(referenceKeys.length).toBeGreaterThan(0);
  });

  it.each(
    Object.keys(messagesByLocale).filter((locale) => locale !== referenceLocale),
  )('locale %s defines exactly the same message keys as en', (locale) => {
    const keys = Object.keys(messagesByLocale[locale as keyof typeof messagesByLocale]).sort();
    expect(keys).toEqual(referenceKeys);
  });

  it('has a non-empty string value for every key in every locale', () => {
    for (const [locale, messages] of Object.entries(messagesByLocale)) {
      for (const [key, value] of Object.entries(messages)) {
        expect(typeof value, `${locale}/${key}`).toBe('string');
        expect(value.length, `${locale}/${key}`).toBeGreaterThan(0);
      }
    }
  });
});

describe('ui language override', () => {
  it('exposes the auto sentinel plus every supported locale', () => {
    expect(UI_LANGUAGE_VALUES).toEqual(['auto', 'en', 'zh-CN', 'zh-TW']);
    expect(Object.keys(messagesByLocale).sort()).toEqual(['en', 'zh-CN', 'zh-TW']);
  });

  it('renders the explicitly selected locale regardless of the browser language', () => {
    vi.stubGlobal('navigator', { language: 'en-US' });
    try {
      setUiLocale('zh-CN');
      expect(t('appTitle')).toBe(messagesByLocale['zh-CN'].appTitle);
      setUiLocale('zh-TW');
      expect(t('appTitle')).toBe(messagesByLocale['zh-TW'].appTitle);
      setUiLocale('en');
      expect(t('appTitle')).toBe(messagesByLocale.en.appTitle);
    } finally {
      setUiLocale('auto');
      vi.unstubAllGlobals();
    }
  });

  it('auto follows the browser language again after an override', () => {
    vi.stubGlobal('navigator', { language: 'zh-TW' });
    try {
      setUiLocale('en');
      expect(t('appTitle')).toBe(messagesByLocale.en.appTitle);
      setUiLocale('auto');
      expect(t('appTitle')).toBe(messagesByLocale['zh-TW'].appTitle);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('ignores unknown language values and keeps the previous selection', () => {
    setUiLocale('zh-CN');
    try {
      setUiLocale('fr' as never);
      expect(t('appTitle')).toBe(messagesByLocale['zh-CN'].appTitle);
    } finally {
      setUiLocale('auto');
    }
  });
});
