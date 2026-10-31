// Copyright (c) 2026 cholf5
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
import { defineConfig } from 'vitest/config';

// Keep in sync with the WXT path aliases (.wxt/tsconfig.json): `@/` resolves
// to the repository root, matching how sources import shared modules. Typed
// via vite/client (referenced from .wxt/wxt.d.ts), so no node type imports
// are needed here.
const root = decodeURIComponent(new URL('.', import.meta.url).pathname);

export default defineConfig({
  resolve: {
    alias: {
      '@': root,
    },
  },
  test: {
    // Default node environment; the suite covers pure logic only (no DOM).
  },
});
