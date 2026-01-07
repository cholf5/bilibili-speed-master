type Messages = Record<string, string>;

const en: Messages = {
  appTitle: 'Bilibili Speed Master',
  madeBy: 'Made by cholf5',
  donate: 'Donate',
  currentSpeed: 'Current Speed',
  defaultSpeed: 'Default Speed',
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
};

const zhCN: Messages = {
  appTitle: '哔哩哔哩倍速大师',
  madeBy: '作者：cholf5',
  donate: '赞助',
  currentSpeed: '当前倍速',
  defaultSpeed: '默认倍速',
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
};

const zhTW: Messages = {
  appTitle: '嗶哩嗶哩倍速大师',
  madeBy: '作者：cholf5',
  donate: '贊助',
  currentSpeed: '目前倍速',
  defaultSpeed: '預設倍速',
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
};

type Locale = 'en' | 'zh-CN' | 'zh-TW';

const messagesByLocale: Record<Locale, Messages> = {
  en,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
};

const getBrowserLocale = (): Locale => {
  const fallback: Locale = 'en';
  const lang =
    (globalThis as typeof globalThis & { navigator?: Navigator }).navigator?.language ??
    'en';
  if (lang.startsWith('en')) {
    return 'en';
  }
  if (lang.startsWith('zh-TW') || lang.startsWith('zh-HK') || lang.startsWith('zh-Hant')) {
    return 'zh-TW';
  }
  if (lang.startsWith('zh')) {
    return 'zh-CN';
  }
  return fallback;
};

export const t = (key: keyof typeof en): string => {
  const locale = getBrowserLocale();
  const messages = messagesByLocale[locale] ?? en;
  return messages[key] ?? en[key] ?? key;
};
