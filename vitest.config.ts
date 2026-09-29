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
