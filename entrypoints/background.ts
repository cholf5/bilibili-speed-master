export default defineBackground(() => {
  // Content scripts cannot call runtime.openOptionsPage (not exposed to them),
  // so the widget's gear button relays through here. Opening the page in a
  // tab directly is deterministic (D-17: options_ui declares open_in_tab via
  // the entrypoint meta; tabs.create matches it unconditionally).
  browser.runtime.onMessage.addListener((message: { type?: string }) => {
    if (message?.type === 'speed-master:open-options') {
      void browser.tabs.create({ url: browser.runtime.getURL('/options.html') });
    }
  });
});
