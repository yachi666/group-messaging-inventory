import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { enMessages, type MessageKey, zhMessages } from './messages';

export type Locale = 'en' | 'zh-CN';

type StoredLocale = {
  version: 1;
  locale: Locale;
};

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey) => string;
};

const LOCALE_STORAGE_KEY = 'gmi.locale.v1';
const messagesByLocale = {
  en: enMessages,
  'zh-CN': zhMessages,
} satisfies Record<Locale, Record<MessageKey, string>>;

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readStoredLocale(): Locale {
  const fallbackLocale: Locale = 'en';

  try {
    const rawValue = window.localStorage.getItem(LOCALE_STORAGE_KEY);

    if (!rawValue) {
      return fallbackLocale;
    }

    const parsed = JSON.parse(rawValue) as Partial<StoredLocale>;
    return parsed.version === 1 && parsed.locale === 'zh-CN'
      ? parsed.locale
      : fallbackLocale;
  } catch {
    return fallbackLocale;
  }
}

function persistLocale(locale: Locale) {
  const storedValue: StoredLocale = {
    version: 1,
    locale,
  };

  window.localStorage.setItem(LOCALE_STORAGE_KEY, JSON.stringify(storedValue));
}

type LanguageProviderProps = {
  children: ReactNode;
};

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(() => readStoredLocale());

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    persistLocale(nextLocale);
  }, []);

  const value = useMemo<LanguageContextValue>(() => {
    const messages = messagesByLocale[locale];

    return {
      locale,
      setLocale,
      t: (key) => messages[key],
    };
  }, [locale, setLocale]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error('useI18n must be used inside LanguageProvider');
  }

  return context;
}
