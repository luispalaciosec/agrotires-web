import type { MetadataRoute } from 'next';
import { DEMO_CATALOG, catHref, categories, guides, productHref } from '@/lib/catalog';
import { getPublicProducts } from '@/lib/products';
import { INDEXABLE, absolute } from '@/lib/seo';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!INDEXABLE) return [];
  const paths = [
    '/', '/shop', '/finder', '/about', '/guides', '/help', '/quote',
    ...categories.filter((c) => c.id !== 'machine').map((c) => catHref(c.id)),
    ...guides.map((g) => `/guide/${g.id}`),
    ...(DEMO_CATALOG ? [] : (await getPublicProducts()).map((p) => productHref(p.id))),
  ];
  return paths.map((p) => ({ url: absolute(p) }));
}
