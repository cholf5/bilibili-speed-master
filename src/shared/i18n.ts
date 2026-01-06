type Messages = Record<string, string>;

const en: Messages = {
  appTitle: 'bilibili Speed Master',
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
};

type Locale = 'en';

const messagesByLocale: Record<Locale, Messages> = {
  en,
};

const getBrowserLocale = (): Locale => {
  const fallback: Locale = 'en';
  const lang =
    (globalThis as typeof globalThis & { navigator?: Navigator }).navigator?.language ??
    'en';
  return lang.startsWith('en') ? 'en' : fallback;
};

export const t = (key: keyof typeof en): string => {
  const locale = getBrowserLocale();
  const messages = messagesByLocale[locale] ?? en;
  return messages[key] ?? en[key] ?? key;
};
