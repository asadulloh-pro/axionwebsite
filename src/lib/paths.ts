import { defaultLocale, type Locale, locales } from '../i18n/types';

const pagePaths = ['', 'about', 'solutions', 'technologies', 'contact'] as const;
export type PagePath = (typeof pagePaths)[number];

export function localizePath(path: string, locale: Locale): string {
  const clean = path.replace(/^\/+/, '').replace(/\/+$/, '');
  if (locale === defaultLocale) {
    return clean ? `/${clean}` : '/';
  }
  return clean ? `/${locale}/${clean}` : `/${locale}`;
}

export function switchLocalePath(currentPath: string, targetLocale: Locale): string {
  const segments = currentPath.split('/').filter(Boolean);
  const hasLocalePrefix = segments[0] && locales.includes(segments[0] as Locale);
  const rest = hasLocalePrefix ? segments.slice(1) : segments;
  const pathWithoutLocale = rest.join('/');
  return localizePath(pathWithoutLocale, targetLocale);
}

export function getAlternateUrls(path: string, site = 'https://axionlab.uz') {
  const segments = path.split('/').filter(Boolean);
  const hasLocalePrefix = segments[0] && locales.includes(segments[0] as Locale);
  const rest = hasLocalePrefix ? segments.slice(1) : segments;
  const bare = rest.join('/');

  return locales.map((locale) => ({
    locale,
    href: `${site}${localizePath(bare, locale)}`,
  }));
}
