import { BUSINESS } from './catalog';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
// Stays false until the owners approve launch; the prototype was deliberately noindex too.
export const INDEXABLE = process.env.NEXT_PUBLIC_SITE_INDEXABLE === 'true';
export const SITE_DESCRIPTION = 'AGROTIRES — Instant Solution. Explore a next-generation agricultural shopping experience for tires, machinery parts, equipment and more. Website demonstration.';

export const absolute = (path: string) => SITE_URL + path;

export const organizationLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: BUSINESS.name,
  slogan: 'Instant Solution',
  url: SITE_URL,
  email: BUSINESS.contactEmail,
  logo: absolute('/assets/agrotires-logo.png'),
};

export const websiteLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: BUSINESS.name,
  url: SITE_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: absolute('/shop?search={search_term_string}') },
    'query-input': 'required name=search_term_string',
  },
};

export const breadcrumbLd = (items: [string, string][]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: absolute(path) })),
});
