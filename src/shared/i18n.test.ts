// Copyright (c) 2026 cholf5
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
import { describe, expect, it } from 'vitest';
import { messagesByLocale } from '@/src/shared/i18n';

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
