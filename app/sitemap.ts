import type { MetadataRoute } from 'next';
import { DEMO_CATALOG, catHref, categories, guides, productHref } from '@/lib/catalog';
import { localePath } from '@/lib/i18n';
import { getPublicProducts } from '@/lib/products';
import { INDEXABLE, absolute } from '@/lib/seo';
import { getStore } from '@/lib/server/store';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!INDEXABLE) return [];
  const paths = [
    '/', '/shop', '/finder', '/about', '/guides', '/help', '/quote',
    ...categories.filter((c) => c.id !== 'machine').map((c) => catHref(c.id)),
    ...guides.map((g) => `/guide/${g.id}`),
    ...((await getStore()?.listPages().catch(() => [])) ?? []).filter((p) => p.published).map((p) => `/p/${p.slug}`),
    ...(DEMO_CATALOG ? [] : (await getPublicProducts()).map((p) => productHref(p.id))),
  ];
  return paths.flatMap((p) => {
    const alternates = { languages: { en: absolute(p), es: absolute(localePath('es', p)) } };
    return [{ url: absolute(p), alternates }, { url: absolute(localePath('es', p)), alternates }];
  });
}
