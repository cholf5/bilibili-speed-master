# Live Page Support Evaluation (D-13)

Research and decision document for whether/how the extension should support
`live.bilibili.com`. **No implementation is proposed here** — the maintainer
picks an option first; the chosen option gets its own implementation card
(D-13 Subtask 3).

Evidence is graded into three confidence tiers, used throughout:

- **[Code]** — evidence in this repository (file:line). Deterministic.
- **[Public]** — second-hand public sources (search results, project docs,
  fetched pages). A URL is given; reliability varies as noted.
- **[Inference]** — reasoning from the two tiers above or general engineering
  knowledge. Not verified; always paired with a concrete verification path
  where one exists. Items with no verification path are marked **未验证**.

## 中文结论摘要

- 直播页今天已被 content script 覆盖注入（`matches: *://*.bilibili.com/*`），
  manifest 无需任何改动；挡住直播页的只有 `isManagedVideoPage` 一个布尔门
  和挂在这个门上的十几处判定（`entrypoints/content.ts`）。
- 直播**正播**：官方播放器无倍速入口（二手资料，中高置信）；对实时流倍速
  会造成缓冲/追赶对抗，且本扩展的「节省时间」统计对直播语义不成立。建议
  **维持不支持**。
- 直播**回放**：`live.bilibili.com/record/<id>` 是真实存在的回放页路由
  （直接抓取验证：返回「哔哩哔哩直播回放」标题页，对照不存在路径返回 404）。
  回放是点播性质内容，倍速价值真实；另一部分回放由主播投稿成普通
  `/video/BV…` 页，天然已被本扩展管理。回放页支持是**唯一建议考虑实现**的
  方向，工作量 M（主要成本是未验证的回放页 DOM/频道识别）。
- 「仅快捷键子集」（音量/全屏/画中画）价值偏低：B 站直播播放器自带音量/
  全屏控制，且其自带快捷键行为未验证——若自带，第三方快捷键只剩冲突风险。
- 拍板所需的关键未验证项集中在 3 个 DevTools 检查（见文末开放问题），
  每个都可 10 分钟内完成。

## 1. Current State and Problem Definition

`isManagedVideoPage` gates the whole pipeline to VOD pages only:

```ts
// entrypoints/content.ts:69-72
const isManagedVideoPage = (): boolean => {
  const path = location.pathname;
  return path.includes('/video/') || path.includes('/bangumi/play/');
};
```

Consequences on `live.bilibili.com/<roomid>` pages today:

- The content script **is injected** — `matches: ['*://*.bilibili.com/*']`
  (entrypoints/content.ts:233) and
  `host_permissions: ['*://*.bilibili.com/*']` (wxt.config.ts:12) both already
  cover `live.bilibili.com` (and every other bilibili subdomain). **No
  manifest change is needed for any option below.** [Code]
- The video element is never attached: `syncManagedVideo` detaches when the
  page gate fails (entrypoints/content.ts:938-945). No speed application, no
  channel record, no widget, no stats.
- Shortcuts are fully inactive: `handleKeydown` returns early on
  `!isManagedVideoPage()` (entrypoints/content.ts:1263). Live pages get zero
  extension hotkeys today. [Code]
- The rest of the wiring (MutationObserver, URL poller, history hooks) runs
  but no-ops against the same gate. [Code]

The question is therefore purely: which parts of the pipeline to open on which
live-page types, at what risk.

## 2. Code-Side Facts (what reuses cleanly, what breaks)

### 2.1 Reusable as-is [Code]

| Pipeline piece | Location | Reuse on live pages |
| --- | --- | --- |
| Video discovery | `findVideo`, content.ts:227-230 (`document.querySelector('video')`) | Finds any `<video>`; MSE-based live players render one [Inference, see 3.1] |
| Rate application mechanics | `applyPlaybackRate`, content.ts:139-149 (`playbackRate` + `defaultPlaybackRate`) | Element-level; works mechanically on any media element |
| Programmatic-rate marker / player-init grace | content.ts:275-286, 39 (`PLAYER_INIT_GRACE_MS = 6000`) | Same anti-noise machinery applies |
| Keyboard infra | `handleKeydown` capture-phase + `matchShortcut` (src/shared/shortcuts.ts:86+) | Focus/IME/widget exemptions are page-agnostic; only the action semantics differ |
| Config cache / storage write queue | src/shared/config-cache.ts, config.ts | Page-agnostic |
| Widget DOM/CSS | content.ts:564-752 | Styles and buttons are player-agnostic, **but** the mount selector is not (see 2.2) |

### 2.2 Breaks or needs rework [Code + Inference]

1. **Channel identity is AV/BV-semantics.** `getVideoIdFromUrl` matches only
   `/video/<id>` (src/shared/video.ts:11-19), so on live pages
   `getAuthoritativeChannel()` is always null and `ensureChannelResolved`
   early-returns (content.ts:360-364) — the authoritative resolve tier never
   engages. `resolveChannel` queries the VOD view API with bvid/aid
   (content.ts:296-338, `VIEW_API_URL` content.ts:45); a roomid is neither.
   What remains is the DOM fallback tier (`getChannelInfo`, content.ts:74-128):
   `__INITIAL_STATE__.videoData.owner` does not exist on live pages; the
   `a[href*="space.bilibili.com/"]` fallback would probably match the anchor's
   space link somewhere in the room info panel, but live rooms contain many
   space links (fans, guards, moderators) and DOM order is **未验证**.
   For a proper room→anchor mapping a live API would be needed (see 3.4).
   [Code for the mechanism, 未验证 for live DOM]
2. **Widget mount selector is VOD-only.** `PLAYER_CONTAINER_SELECTOR =
   '.bpx-player-container, .bilibili-player'` (content.ts:35) is the VOD
   player container. The live player container class differs (未验证) — the
   widget would not mount even if the page gate were opened, until the
   selector grows a live form. Same for `toggleFullscreen`'s
   `closest('.bpx-player-container, .bilibili-player-video')`
   (content.ts:180-182): on live it falls back to fullscreening the raw
   `<video>` element — works but loses the player chrome. [Code]
3. **Rate persistence can mis-learn from player resets.** `handleRateChange`
   (content.ts:433-489) persists any unexplained rate change outside the 6s
   player-init window (content.ts:39, 481-485) as a channel override. On VOD
   this is safe because Bilibili's own resets happen at video start. A live
   player reconnecting after a network blip or switching quality mid-stream
   can plausibly reset `playbackRate` hours into the session — outside the
   grace window, no user-intent flag — and would overwrite the channel
   override with 1x. Live needs either a stricter persistence policy or a
   longer/recurring guard. Behavior 未验证; the risk is structural. [Code for
   the mechanism; live reset behavior Inference, see 3.3]
4. **Seek semantics on live streams.** MSE live streams typically report
   `duration === Infinity` [Inference]. Then: `seekToPercent` no-ops safely
   (content.ts:162-167), `seekToEnd` no-ops safely (content.ts:1168-1171),
   but `seekBy` (content.ts:156-160) clamps against `duration || Infinity`
   and will happily set `currentTime` past the live edge (j/l/←/→), and
   `seekToStart` sets `currentTime = 0` unconditionally (content.ts:1165-1167)
   — on a live stream both likely stall the player or force a reconnect.
   Frame stepping (`.`/`,`) is `pausedOnly` so it only fires while paused.
   [Code for the code paths; live player reaction Inference/未验证]
5. **Time-saved stats are semantically wrong for live.** `handleTimeUpdate`
   accumulates `(delta × (rate−1)) / rate` whenever `rate > 1`
   (content.ts:866-901, src/shared/video.ts:26-27). For a VOD that equals
   wall-clock time not spent watching. A live stream never ends; running it
   faster than real time just drains the buffer until it stalls, and the
   media time "saved" is content the viewer skipped entirely, not time
   compressed. If live pages ever attach the video, `handleTimeUpdate` must
   be excluded per page kind. [Code for the mechanism; the semantic argument
   is analysis]
6. **Quality preference is VOD-shaped.** Menu selectors
   (`.bpx-player-ctrl-quality-menu-item`, content.ts:797-801) and
   `QUALITY_CODES` (content.ts:777-782) are VOD player artifacts; the live
   quality menu differs (未验证). Live pages should skip
   `applyPreferredQuality` or grow their own mapping. [Code]

### 2.3 Shortcuts on live pages, per action [Code + Inference]

If only the shortcut layer were opened (Option B), with `activeVideo` attached
but speed left untouched:

| Action group | Verdict on live | Basis |
| --- | --- | --- |
| `volumeUp`/`volumeDown` (↑/↓), `toggleMute` (m) | Meaningful, element-level, safe | [Code] `video.volume`/`muted` are element props |
| `toggleFullscreen` (f) | Works, degraded (raw `<video>` fullscreen, no player chrome) | [Code] content.ts:180-182 fallback |
| `toggleMiniPlayer` (i) | Works via `requestPictureInPicture` fallback; VOD button selectors will miss | [Code] content.ts:1194-1205 |
| `togglePlay`/Space/k | Pausing a live stream is meaningful (B站 allows it); resume re-enters at live edge | [Inference] 未验证 |
| `toggleCaptions` (c) | Safe no-op (live streams rarely carry TextTracks) | [Code] guards at content.ts:196-205 |
| `nextVideo`/`prevVideo`, `focusSearch` | Harmless at worst; selectors VOD-shaped | [Code] |
| j/l/←/→ seek | **Harmful**: seeks past the live edge / into the buffer (2.2-4) | [Code + Inference] |
| Home (`seekToStart`) | **Harmful**: `currentTime = 0` on a live stream | [Code] |
| Digits 0-9, End | Safe no-ops (`duration === Infinity` guards) | [Code] |
| `>`/`<` speed | This IS Option D's speed feature — excluded by definition in Option B | — |

Value assessment for Option B: Bilibili's own live player already ships
volume/fullscreen controls in its UI, and very likely handles at least some
hotkeys natively (未验证 — open question Q3). If it does, the marginal value
of the extension's volume/fullscreen subset is near zero and the only
outcome is key conflict risk.

## 3. Live-Page Technical Facts (public research)

### 3.1 Player kernel and `<video>` element

- Bilibili open-sourced flv.js, an MSE-based FLV player used for HTTP-FLV
  live playback; MSE-based players feed a native `<video>` element.
  [Public] — https://github.com/bilibili/flv.js (project docs, general
  reliability high). That *bilibili.com's own live page* currently uses this
  kernel in this exact form is [Inference] from the same ecosystem plus
  stream-grabbing write-ups (CSDN articles on capturing live HLS/FLV streams
  from bilibili rooms); the actual DOM on today's live page is **未验证**.
- The Edge extension 哔哩哔哩倍速助手 advertises speed control for live
  streams on www.bilibili.com, which is only implementable by setting
  `playbackRate` on a `<video>` element — i.e. third parties do manipulate a
  native video element on live pages successfully. [Public, medium
  confidence] — Microsoft Edge Add-ons listing (via search).
- Concrete live-player selectors (container class, whether the video element
  is stable across quality switches / reconnects): **未验证**. Verification:
  open a live room in DevTools, run `document.querySelector('video')` and
  inspect the player's container classes.

### 3.2 Replays and their URL shape

Two distinct "replay" forms exist:

1. **In-house replay pages.** `live.bilibili.com/record/<id>` is a real
   route: fetching it returns a page titled 「哔哩哔哩直播回放」 (direct
   fetch, this research), while a nonsense path returns HTTP 404 (direct
   fetch, control test) — so it is not an SPA catch-all. [Public — direct
   page fetch, high confidence for the route's existence; the page is
   client-rendered, so its player DOM/channel UI is **未验证**]
2. **Anchor-published replays** become ordinary VOD pages
   (`www.bilibili.com/video/BV…`) and are already managed by the extension
   with zero work. [Public, medium confidence — Bilibili's 直播回放功能规则
   说明: replays are retained 14 days and must be published/downloaded by the
   anchor to persist; via search summary of the official rule page]

Implication: a meaningful share of "live replay" viewing already lands on
`/video/` pages and is covered today. Option C only covers form 1.

### 3.3 Official speed support and rate-reset behavior on live

- Bilibili's official live player has **no speed control**; official speed
  menus exist only on VOD players (web + mobile). [Public, medium-high
  confidence — consistent across multiple secondary sources and general
  product knowledge; not verified against today's live UI first-hand]
- Because there is no official speed path on live, there is no documented
  behavior for how the live player treats a foreign `playbackRate` set on its
  video element. Plausible reset triggers (reconnect after network error,
  quality switch, source recreation on room state change) would each fire
  `ratechange`/`emptied` — events the extension's guard machinery
  (2.2-3) would have to survive. **未验证**; verification: set
  `playbackRate = 2` in DevTools on a live room, wait through a quality
  switch and a network blip, observe whether it sticks and whether the
  player stalls as the buffer drains (live streams cannot sustain >1x
  indefinitely without falling behind the real-time edge — [Inference]).
- Even VOD playback buffers at high rates (Bilibili-Evolved issue report of
  constant buffering at ≥2.5x). [Public, medium confidence] —
  https://github.com (the1812/Bilibili-Evolved issue #1809, via search). Live
  is strictly worse: the "buffer" is bounded by real time.

### 3.4 Room → anchor identification (for any live option)

- Room URL form is `live.bilibili.com/<roomid>` [Public — direct fetch of
  live.bilibili.com/1 returned a live room page]. A legacy `/h5/<roomid>`
  form is sometimes cited [Public, low confidence, 未验证].
- roomid and the anchor's user id (mid) are different identifiers. A robust
  mapping needs a live API; the commonly used one is
  `api.live.bilibili.com/xlive/web-room/v1/index/getInfoByRoom?room_id=<rid>`
  returning anchor `uid`/`uname`/`face` [Inference from ecosystem knowledge —
  **未验证**; verification: watch the network tab in DevTools when opening a
  room]. Keying live channels by the anchor's **mid** (not roomid) would make
  one UP主's live and VOD speeds share a channel record, consistent with
  current VOD semantics (channelId = owner.mid, content.ts:317). [Code for
  the VOD side; the unification is design analysis]
- The DOM fallback (`a[href*="space.bilibili.com/"]`) may incidentally
  resolve the anchor on live rooms, but link ordering there is **未验证**
  and this tier is exactly the one that produced the B-2/B-3
  contamination bugs on VOD (docs/player-detection.md). Not recommended as
  the authoritative source for live.

## 4. Options

### Option A — Keep live unsupported (status quo)

- **Scope**: none. Document the decision (spec/README note: live pages are
  out of scope; replay-as-VOD pages remain covered via `/video/`).
- **When this is right**: if official replays largely get published as VOD
  pages anyway (3.2-2), the official player has no speed UI (3.3), and
  shortcuts-on-live add little (2.3) — then every live-page change buys
  little and carries regression risk against a 200-test green suite.
- **Effort**: S (documentation only). No code, no new selectors, no risk.

### Option B — Shortcuts subset only (volume/mute/fullscreen/PiP; no seek, no speed)

- **Scope**: introduce a page-kind concept (`video` / `live` /
  `live-replay`) instead of the single boolean; attach the video on live but
  skip `applySpeedForVideo`, rate persistence, stats counting, and quality;
  restrict the action table on live (drop seek/speed/step actions per 2.3).
- **Effort**: M. The boolean `isManagedVideoPage` fans out to at least six
  call sites that need per-kind answers (syncManagedVideo content.ts:938,
  ensureSpeedWidget content.ts:737, applyPreferredQuality content.ts:786,
  handleRateChange content.ts:458, recordChannelVisit content.ts:492,
  handleKeydown content.ts:1263), plus a live-allowed action filter and
  shortcut-table unit tests. Widget: omit on live (it is speed-centric).
- **Risks**: key conflicts with the live player's own hotkeys (未验证, Q3);
  speed must be genuinely inert or `handleRateChange` starts persisting on
  live; regression surface is the hot path every VOD user runs daily.
- **Value**: low (2.3) — duplicates controls the live player already has.

### Option C — Full support for replay pages (`/record/`)

- **Scope**: add `/record/` to the managed-page check; treat replays as VOD.
  Reuse the whole speed/persistence/widget pipeline; keep the 6s grace
  window; verify duration is finite (then seek/percent shortcuts work
  unchanged).
- **Effort**: M — mechanics are mostly reuse (2.1), but: channel identity
  needs a room/record→anchor source (3.4; the record page has no `/video/`
  id, so the DOM fallback or a live API must be wired — the same
  infrastructure Option D would need); widget container selector needs the
  record player's container class (未验证, DevTools check); stats stay
  meaningful (replays are bounded content) but must confirm
  `duration` finiteness for the seek-proportion rule (src/shared/stats.ts).
- **Risks**: unverified record-page DOM (selectors may need one DevTools
  session to pin down); if the record player resets rate like the live
  player, the 2.2-3 persistence hazard applies here too.
- **Value**: highest of the four — replay is long-form VOD-like content, the
  classic speed-use case, and部分回放 already flowing to `/video/` shows the
  demand shape.

### Option D — Also open speed on live rooms (正播倍速)

- **Scope**: everything in C, plus speed application and channel overrides
  on `live.bilibili.com/<roomid>`.
- **Effort**: L. Adds: live room→mid channel mapping (3.4), a live-specific
  persistence policy for `handleRateChange` (2.2-3 — reconnect/quality
  resets must not overwrite overrides), exclusion of live media time from
  time-saved stats (2.2-5), live-aware shortcut gating (2.3: Home/j/l are
  harmful), and an arms race with the player's rate handling that must be
  characterized first (3.3).
- **Risks**: speeding up a real-time stream drains the buffer and stalls or
  fights the player for hours-long sessions; per-channel semantics get
  odd (a "live speed" override is really a per-UP preference the player
  fights); stats mislead if not excluded; highest regression risk against
  VOD behavior via shared code paths.
- **Value**: questionable — the official player ships no speed control on
  live (3.3), suggesting Bilibili considers it unnatural for live content.

### Option matrix

| | A status quo | B shortcuts subset | C replay support | D live-room speed |
| --- | --- | --- | --- | --- |
| Effort | S | M | M | L |
| Manifest changes | none | none | none | none |
| Main touched areas | docs | page-kind gate, keydown action filter, attach w/o speed | `isManagedVideoPage`, channel resolve for record pages, widget selector | all of C + rate-persist policy, stats exclusion, live channel API, shortcut gating |
| User value | — | low | high | questionable |
| Regression risk | none | medium (hot path) | low-medium (new page type) | high (shared paths + adversarial player) |
| Blocked on unverified facts | none | Q3 | Q1, Q2 | Q1-Q4 |

## 5. Recommendation (PM lean — decision belongs to the maintainer)

**Lean: A for live rooms now + C as the only implementation worth doing,
sequenced.** Concretely:

1. Close 正播 as "not supported" with a documented rationale (official
   player has no speed UI; real-time streams fight speed-up; stats and seek
   semantics break). This is Option A's scope applied to live rooms.
2. If any implementation is wanted, pick C (replay pages) — the only option
   where speed is the natural product fit. Gate it on a 10-minute DevTools
   session answering Q1/Q2 below.
3. Skip B: its value duplicates the live player's own controls, and its
   main outcome is hot-path churn and key-conflict risk. Revisit only if
   users actually ask (the card is P3; there is currently no user-request
   trail in the issue).
4. D only if a maintainer personally wants live speed and has verified the
   player tolerates a foreign rate (3.3 verification recipe). The extension
   has no rate-reset countermeasure proven against the live player today.

This mirrors the card's own framing (replay/quality/shortcut value was
always the interesting part; live-stream speed was always doubtful).

## 6. Open Questions for the Maintainer

- **Q1 (C/D blocker, ~10 min)**: On `live.bilibili.com/record/<id>` in
  DevTools — does `document.querySelector('video')` find the player, is
  `video.duration` finite, and what container class wraps the player
  (needed for the widget mount selector and fullscreen closest)?
- **Q2 (C, ~10 min)**: On a record page, is there a reliable room/anchor
  element (or does the network tab show a room-info API response with the
  anchor mid)? Decides DOM fallback vs. live API for channel identity.
- **Q3 (B killer, ~5 min)**: On `live.bilibili.com/<roomid>`, which keys does
  the live player handle natively (Space, f, m, arrows)? If most of B's
  subset is already native, B is dead.
- **Q4 (D blocker, ~15 min)**: On a live room, set
  `document.querySelector('video').playbackRate = 2` in DevTools — does it
  stick across a quality switch and a reconnect, does the stream stall, and
  does the player ever reset it on its own?
- **Q5 (product)**: Do we have any user signal (issue/星级评价/评论) asking
  for live support at all? If none, A alone is a defensible close for the
  whole card.
