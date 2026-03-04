import en from './en.json';
import ru from './ru.json';
import kk from './kk.json';

export const locales = ['en', 'ru', 'kk'] as const;
export type Locale = (typeof locales)[number];

const translations: Record<Locale, typeof en> = { en, ru, kk };

export function getTranslations(locale: Locale) {
  return translations[locale] || translations.en;
}

export function getNestedValue(obj: any, path: string): string {
  return path.split('.').reduce((acc, part) => acc?.[part], obj) || path;
}

export const localeNames: Record<Locale, string> = {
  en: 'English',
  ru: 'Русский',
  kk: 'Қазақша',
};
