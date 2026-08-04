import uz from './uz';
import en from './en';
import ru from './ru';
import type { Dictionary, Locale } from './types';
import { defaultLocale, locales } from './types';

export * from './types';

const dictionaries: Record<Locale, Dictionary> = { uz, en, ru };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[defaultLocale];
}

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function getLocaleFromUrl(url: URL): Locale {
  const [, maybeLocale] = url.pathname.split('/');
  if (maybeLocale && isLocale(maybeLocale)) {
    return maybeLocale;
  }
  return defaultLocale;
}
