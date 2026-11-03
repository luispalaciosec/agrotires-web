import type { Metadata } from 'next';
import { ShopFromUrl } from '@/components/shop-view';
import { JsonLd } from '@/components/ui';
import { catHref, getCategory } from '@/lib/catalog';
import { localePath } from '@/lib/i18n';
import { resolveLocale, type LocaleParams } from '@/lib/locale-params';
import { breadcrumbLd, languageAlternates } from '@/lib/seo';

type Props = LocaleParams & { searchParams: Promise<{ category?: string; search?: string }> };

// The server HTML depends on ?category= and ?search=.
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale, t } = await resolveLocale({ params });
  const { category = '', search = '' } = await searchParams;
  const curr = getCategory(category, locale);
  if (search) return { title: t.shop.titleSearch, robots: { index: false, follow: true } };
  return {
    title: curr ? curr.name : t.meta.shopAll,
    description: curr ? `${curr.name}: ${curr.desc}` : t.meta.shopDesc,
    alternates: languageAlternates(locale, curr ? catHref(curr.id) : '/shop'),
  };
}

export default async function ShopPage({ params }: Props) {
  const { locale, t } = await resolveLocale({ params });
  return (
    <>
      <JsonLd data={breadcrumbLd([[t.common.home, localePath(locale, '/')], [t.shop.crumb, localePath(locale, '/shop')]])} />
      <ShopFromUrl />
    </>
  );
}
