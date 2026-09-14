export default defineBackground(() => {
  // Content scripts cannot call runtime.openOptionsPage (not exposed to them),
  // so the widget's gear button relays through here. openOptionsPage also
  // respects options_ui.open_in_tab, which WXT drops from the manifest —
  // opening the page in a tab directly is deterministic instead.
  browser.runtime.onMessage.addListener((message: { type?: string }) => {
    if (message?.type === 'speed-master:open-options') {
      void browser.tabs.create({ url: browser.runtime.getURL('/options.html') });
    }
  });
});
