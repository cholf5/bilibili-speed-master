// Copyright (c) 2026 cholf5
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
type Messages = Record<string, string>;

const en: Messages = {
  appTitle: 'Bilibili Speed Master',
  madeBy: 'Made by cholf5',
  currentSpeed: 'Current Speed',
  defaultSpeed: 'Global Speed',
  preferredQuality: 'Preferred Quality',
  totalTimeSaved: 'Total time saved',
  hours: 'hours',
  moreOptions: 'More Options',
  rateMe: 'Rate me',
  channel: 'Channel',
  lastVisit: 'Last Visit',
  speed: 'Speed',
  noOverrides: 'No channel overrides yet.',
  export: 'Export Settings',
  import: 'Import Settings',
  showVideoWidget: 'Show speed widget on video',
  widgetPosition: 'Widget position',
  widgetOpenSettings: 'Open settings',
  widgetDecreaseSpeed: 'Decrease speed',
  widgetIncreaseSpeed: 'Increase speed',
  currentChannel: 'This channel',
  channelOverride: 'Override',
  followingGlobal: 'Following global',
  followGlobal: 'Follow global',
  searchPlaceholder: 'Search channels',
  noSearchResults: 'No channels match your search.',
  optionsShortcuts: 'Keyboard Shortcuts',
  shortcutsRestoreDefaults: 'Restore Defaults',
  shortcutsRestoreConfirm: 'Restore all shortcuts to their defaults?',
  shortcutsRecordHint: 'Press a key… (Esc to cancel)',
  shortcutsGroupPlayback: 'Playback',
  shortcutsGroupSeeking: 'Seeking',
  shortcutsGroupVolume: 'Volume',
  shortcutsGroupSpeed: 'Speed',
  shortcutsGroupView: 'Player & navigation',
  shortcutsGroupPercent: 'Jump to percent',
  shortcutsGroupMedia: 'Media keys',
  shortcutsConflictWith: 'Already used by "{action}"',
  shortcutsSwap: 'Swap',
  shortcutsCancel: 'Cancel',
  shortcutsChange: 'Change',
  shortcutsDisable: 'Disable',
  shortcutsDisabled: 'Disabled',
  actionTogglePlay: 'Play / Pause',
  actionToggleMute: 'Mute / Unmute',
  actionSeekBackwardLarge: 'Seek back 10 seconds',
  actionSeekForwardLarge: 'Seek forward 10 seconds',
  actionSeekBackwardSmall: 'Seek back 5 seconds',
  actionSeekForwardSmall: 'Seek forward 5 seconds',
  actionVolumeUp: 'Volume up',
  actionVolumeDown: 'Volume down',
  actionSeekToStart: 'Seek to beginning',
  actionSeekToEnd: 'Seek to end',
  actionStepForward: 'Next frame (when paused)',
  actionStepBackward: 'Previous frame (when paused)',
  actionSpeedUp: 'Speed up',
  actionSlowDown: 'Slow down',
  actionToggleFullscreen: 'Toggle fullscreen',
  actionToggleCaptions: 'Toggle captions',
  actionToggleMiniPlayer: 'Toggle miniplayer',
  actionNextVideo: 'Next video',
  actionPrevVideo: 'Previous video',
  actionFocusSearch: 'Focus search box',
  actionSeekPercent: 'Seek to {n}% of the video',
  actionMediaPlayPause: 'Media key: Play / Pause',
  actionMediaStop: 'Media key: Stop',
  actionMediaTrackNext: 'Media key: Next track',
  openSourceTitle: 'Open Source',
  openSourceRepo: 'Source Code',
  openSourceFeedback: 'Feedback & Issues',
  openSourceLicense: 'License',
  channelDeleteConfirm: 'Remove the speed override for this channel?',
  uiLanguage: 'Language',
  uiLanguageAuto: 'Auto (browser language)',
  uiLanguageEn: 'English',
  uiLanguageZhCn: '简体中文',
  uiLanguageZhTw: '繁體中文',
};

// UI-facing key type: t() accepts exactly the keys of the en dictionary.
export type MessageKey = keyof typeof en;

const zhCN: Messages = {
  appTitle: '哔哩哔哩倍速大师',
  madeBy: '作者：cholf5',
  currentSpeed: '当前倍速',
  defaultSpeed: '全局倍速',
  preferredQuality: '首选画质',
  totalTimeSaved: '节省的总时间',
  hours: '小时',
  moreOptions: '更多选项',
  rateMe: '给我评分',
  channel: '频道',
  lastVisit: '上次访问',
  speed: '倍速',
  noOverrides: '暂无频道覆盖设置。',
  export: '导出设置',
  import: '导入设置',
  showVideoWidget: '在视频上显示倍速控件',
  widgetPosition: '控件位置',
  widgetOpenSettings: '打开设置',
  widgetDecreaseSpeed: '降低倍速',
  widgetIncreaseSpeed: '提高倍速',
  currentChannel: '当前频道',
  channelOverride: '覆盖',
  followingGlobal: '跟随全局',
  followGlobal: '跟随全局',
  searchPlaceholder: '搜索频道',
  noSearchResults: '没有符合搜索条件的频道。',
  optionsShortcuts: '快捷键',
  shortcutsRestoreDefaults: '恢复默认',
  shortcutsRestoreConfirm: '确定将全部快捷键恢复为默认吗？',
  shortcutsRecordHint: '请按下新的按键…（按 Esc 取消）',
  shortcutsGroupPlayback: '播放',
  shortcutsGroupSeeking: '进度跳转',
  shortcutsGroupVolume: '音量',
  shortcutsGroupSpeed: '倍速',
  shortcutsGroupView: '播放器与页面',
  shortcutsGroupPercent: '跳转到指定进度',
  shortcutsGroupMedia: '媒体键',
  shortcutsConflictWith: '与「{action}」冲突',
  shortcutsSwap: '交换',
  shortcutsCancel: '取消',
  shortcutsChange: '修改',
  shortcutsDisable: '禁用',
  shortcutsDisabled: '已禁用',
  actionTogglePlay: '播放 / 暂停',
  actionToggleMute: '静音 / 取消静音',
  actionSeekBackwardLarge: '后退 10 秒',
  actionSeekForwardLarge: '快进 10 秒',
  actionSeekBackwardSmall: '后退 5 秒',
  actionSeekForwardSmall: '快进 5 秒',
  actionVolumeUp: '增大音量',
  actionVolumeDown: '减小音量',
  actionSeekToStart: '跳转到开头',
  actionSeekToEnd: '跳转到结尾',
  actionStepForward: '下一帧（暂停时）',
  actionStepBackward: '上一帧（暂停时）',
  actionSpeedUp: '加速播放',
  actionSlowDown: '减速播放',
  actionToggleFullscreen: '切换全屏',
  actionToggleCaptions: '切换字幕',
  actionToggleMiniPlayer: '切换小窗播放',
  actionNextVideo: '下一个视频',
  actionPrevVideo: '上一个视频',
  actionFocusSearch: '聚焦搜索框',
  actionSeekPercent: '跳转到视频 {n}% 处',
  actionMediaPlayPause: '媒体键：播放 / 暂停',
  actionMediaStop: '媒体键：停止',
  actionMediaTrackNext: '媒体键：下一曲',
  openSourceTitle: '开源',
  openSourceRepo: '源代码',
  openSourceFeedback: '反馈与问题',
  openSourceLicense: '许可证',
  channelDeleteConfirm: '确定移除该频道的倍速覆盖设置吗？',
  uiLanguage: '界面语言',
  uiLanguageAuto: '自动（跟随浏览器）',
  uiLanguageEn: 'English',
  uiLanguageZhCn: '简体中文',
  uiLanguageZhTw: '繁體中文',
};

const zhTW: Messages = {
  appTitle: '嗶哩嗶哩倍速大師',
  madeBy: '作者：cholf5',
  currentSpeed: '目前倍速',
  defaultSpeed: '全域倍速',
  preferredQuality: '偏好畫質',
  totalTimeSaved: '節省的總時間',
  hours: '小時',
  moreOptions: '更多選項',
  rateMe: '給我評分',
  channel: '頻道',
  lastVisit: '上次造訪',
  speed: '倍速',
  noOverrides: '尚無頻道覆寫設定。',
  export: '匯出設定',
  import: '匯入設定',
  showVideoWidget: '在影片上顯示倍速控件',
  widgetPosition: '控件位置',
  widgetOpenSettings: '開啟設定',
  widgetDecreaseSpeed: '降低倍速',
  widgetIncreaseSpeed: '提高倍速',
  currentChannel: '目前頻道',
  channelOverride: '覆寫',
  followingGlobal: '跟隨全域',
  followGlobal: '跟隨全域',
  searchPlaceholder: '搜尋頻道',
  noSearchResults: '沒有符合搜尋條件的頻道。',
  optionsShortcuts: '快捷鍵',
  shortcutsRestoreDefaults: '還原預設',
  shortcutsRestoreConfirm: '確定要將全部快捷鍵還原為預設嗎？',
  shortcutsRecordHint: '請按下新的按鍵…（按 Esc 取消）',
  shortcutsGroupPlayback: '播放',
  shortcutsGroupSeeking: '進度跳轉',
  shortcutsGroupVolume: '音量',
  shortcutsGroupSpeed: '倍速',
  shortcutsGroupView: '播放器與頁面',
  shortcutsGroupPercent: '跳至指定進度',
  shortcutsGroupMedia: '媒體鍵',
  shortcutsConflictWith: '與「{action}」衝突',
  shortcutsSwap: '交換',
  shortcutsCancel: '取消',
  shortcutsChange: '修改',
  shortcutsDisable: '停用',
  shortcutsDisabled: '已停用',
  actionTogglePlay: '播放 / 暫停',
  actionToggleMute: '靜音 / 取消靜音',
  actionSeekBackwardLarge: '後退 10 秒',
  actionSeekForwardLarge: '快轉 10 秒',
  actionSeekBackwardSmall: '後退 5 秒',
  actionSeekForwardSmall: '快轉 5 秒',
  actionVolumeUp: '提高音量',
  actionVolumeDown: '降低音量',
  actionSeekToStart: '跳至開頭',
  actionSeekToEnd: '跳至結尾',
  actionStepForward: '下一格畫面（暫停時）',
  actionStepBackward: '上一格畫面（暫停時）',
  actionSpeedUp: '加速播放',
  actionSlowDown: '減速播放',
  actionToggleFullscreen: '切換全螢幕',
  actionToggleCaptions: '切換字幕',
  actionToggleMiniPlayer: '切換迷你播放器',
  actionNextVideo: '下一部影片',
  actionPrevVideo: '上一部影片',
  actionFocusSearch: '聚焦搜尋框',
  actionSeekPercent: '跳至影片 {n}% 處',
  actionMediaPlayPause: '媒體鍵：播放 / 暫停',
  actionMediaStop: '媒體鍵：停止',
  actionMediaTrackNext: '媒體鍵：下一曲',
  openSourceTitle: '開源',
  openSourceRepo: '原始碼',
  openSourceFeedback: '回報與問題',
  openSourceLicense: '授權條款',
  channelDeleteConfirm: '確定要移除該頻道的倍速覆寫設定嗎？',
  uiLanguage: '介面語言',
  uiLanguageAuto: '自動（跟隨瀏覽器）',
  uiLanguageEn: 'English',
  uiLanguageZhCn: '简体中文',
  uiLanguageZhTw: '繁體中文',
};

type Locale = 'en' | 'zh-CN' | 'zh-TW';

// Exported for the locale key-set consistency test (D-15) and for the options
// language selector; `t` remains the only consumer at runtime.
export const messagesByLocale: Record<Locale, Messages> = {
  en,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
};

// D-18: 'auto' is the sentinel stored in global.uiLanguage meaning "resolve
// from navigator.language" (the pre-D-18 behavior). An explicit value pins
// the UI language for every surface — popup, options and the video widget —
// regardless of the browser setting.
export type UiLanguage = 'auto' | Locale;
export const UI_LANGUAGE_VALUES: readonly UiLanguage[] = ['auto', 'en', 'zh-CN', 'zh-TW'];

const getBrowserLocale = (): Locale => {
  const lang =
    (globalThis as typeof globalThis & { navigator?: Navigator }).navigator?.language?.toLowerCase() ??
    'en';

  if (lang.startsWith('zh-tw') || lang.startsWith('zh-hk') || lang.startsWith('zh-hant')) {
    return 'zh-TW';
  }
  if (lang.startsWith('zh')) {
    return 'zh-CN';
  }
  return 'en';
};

// Module-level override, kept in sync with global.uiLanguage by the UI
// entrypoints (popup/options hydrate it after getConfig; the content script
// mirrors it in applyWidgetSettings alongside the widget's own settings).
let uiLocaleOverride: UiLanguage = 'auto';

export const setUiLocale = (language: UiLanguage): void => {
  if (UI_LANGUAGE_VALUES.includes(language)) {
    uiLocaleOverride = language;
  }
};

export const t = (key: keyof typeof en): string => {
  const locale = uiLocaleOverride === 'auto' ? getBrowserLocale() : uiLocaleOverride;
  const messages = messagesByLocale[locale] ?? en;
  return messages[key] ?? en[key] ?? key;
};
