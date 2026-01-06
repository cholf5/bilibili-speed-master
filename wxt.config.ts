import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'bilibili Speed Master',
    description: 'Set a global default speed for Bilibili videos with per-channel overrides.',
    permissions: ['storage', 'tabs'],
    host_permissions: ['*://*.bilibili.com/*'],
    options_ui: {
      page: 'options.html',
      open_in_tab: true,
    },
    action: {
      default_title: 'bilibili Speed Master',
    },
  },
});
