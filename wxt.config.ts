// Copyright (c) 2026 cholf5
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  zip: {
    // Local design assets (icon candidates, preview pages) and store listing
    // material (screenshots, capture scripts) must not leak into the AMO
    // source submission.
    excludeSources: ['design/**', 'store-assets/**'],
  },
  // D-8: manifest is a function so Firefox-only fields (gecko id for AMO)
  // never leak into the Chrome build.
  manifest: ({ browser }) => ({
    name: 'Bilibili Speed Master',
    description: 'Set a global default speed for Bilibili videos with per-channel overrides.',
    permissions: ['storage'],
    host_permissions: ['*://*.bilibili.com/*'],
    // D-17: WXT regenerates options_ui from the options entrypoint, so any
    // options_ui block here is silently dropped. The open-in-tab behavior is
    // controlled by <meta name="manifest.open_in_tab"> in
    // entrypoints/options/index.html (open in its own tab: true).
    action: {
      default_title: 'Bilibili Speed Master',
    },
    ...(browser === 'firefox'
      ? {
          browser_specific_settings: {
            gecko: {
              id: '{B079DA6F-03A0-4B61-82D3-89260E308CB6}',
              strict_min_version: '109.0',
              // AMO data-collection policy: this extension gathers nothing.
              data_collection_permissions: { required: ['none'] },
            },
          },
        }
      : {}),
  }),
});
