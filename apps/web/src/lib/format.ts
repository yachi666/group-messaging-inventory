import type { Locale } from '../i18n/LanguageProvider';

export function formatVolume(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale, {
    notation: value >= 1_000_000 ? 'compact' : 'standard',
    maximumFractionDigits: value >= 1_000_000 ? 1 : 0,
  }).format(value);
}

export function formatPercentage(value: number) {
  return `${value}%`;
}
