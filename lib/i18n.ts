export const LOCALES = ['en', 'es'] as const;
export type Locale = (typeof LOCALES)[number];
export const LOCALE_TAGS: Record<Locale, string> = { en: 'en-US', es: 'es-US' };

export const isLocale = (v: string): v is Locale => (LOCALES as readonly string[]).includes(v);

// English lives at the root and Spanish under /es, so the English URLs never change.
export const localePath = (locale: Locale, path: string) => {
  if (locale === 'en') return path;
  return path === '/' ? '/es' : `/es${path}`;
};

export const stripLocale = (pathname: string) => {
  if (pathname === '/es') return '/';
  return pathname.startsWith('/es/') ? pathname.slice(3) : pathname;
};

export const localeOf = (pathname: string): Locale => (pathname === '/es' || pathname.startsWith('/es/') ? 'es' : 'en');
