// D-14: the single config write helper shared by speed-core (debounced channel
// override persistence) and channel-detect (visit records). Logic verbatim
// from entrypoints/content.ts.

import { updateConfig, type SpeedMasterConfig } from '@/src/shared/config';

// D-2: the read-modify-write runs as ONE unit inside config.ts's write queue,
// so a concurrent update in this context cannot interleave between the read
// and the write. The reference-equality short-circuit (the updater returned
// the config it read → storage already holds that state → no write) lives in
// the queued updateConfig, keeping no-op calls from touching storage.
export const updateConfigIfChanged = (
  updater: (current: SpeedMasterConfig) => SpeedMasterConfig,
) => updateConfig(updater);
