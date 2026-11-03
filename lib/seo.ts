import type { Metadata } from 'next';
import { BUSINESS } from './catalog';
import { LOCALE_TAGS, localePath, type Locale } from './i18n';
import { messages } from './messages';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
// Stays false until the owners approve launch; the prototype was deliberately noindex too.
export const INDEXABLE = process.env.NEXT_PUBLIC_SITE_INDEXABLE === 'true';

export const absolute = (path: string) => SITE_URL + path;

// Canonical plus hreflang, so search engines treat the two languages as one page in two versions.
export const languageAlternates = (locale: Locale, path: string): Metadata['alternates'] => ({
  canonical: localePath(locale, path),
  languages: { en: path, es: localePath('es', path), 'x-default': path },
});

export function baseMetadata(locale: Locale): Metadata {
  const description = messages[locale].meta.description;
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: messages[locale].meta.homeTitle, template: '%s | AGROTIRES' },
    description,
    robots: INDEXABLE ? undefined : { index: false, follow: false },
    openGraph: { siteName: 'AGROTIRES', type: 'website', locale: LOCALE_TAGS[locale].replace('-', '_'), description, images: ['/assets/agrotires-farm-hero.webp'] },
  };
}

export const organizationLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: BUSINESS.name,
  slogan: 'Instant Solution',
  url: SITE_URL,
  email: BUSINESS.contactEmail,
  logo: absolute('/assets/agrotires-logo.png'),
};

export const websiteLd = (locale: Locale) => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: BUSINESS.name,
  url: absolute(localePath(locale, '/')),
  inLanguage: LOCALE_TAGS[locale],
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: absolute(localePath(locale, '/shop?search={search_term_string}')) },
    'query-input': 'required name=search_term_string',
  },
});

export const breadcrumbLd = (items: [string, string][]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: absolute(path) })),
});
