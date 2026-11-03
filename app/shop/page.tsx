import type { Metadata } from 'next';
import { ShopView } from '@/components/shop-view';
import { JsonLd } from '@/components/ui';
import { getCategory } from '@/lib/catalog';
import { breadcrumbLd } from '@/lib/seo';

type Props = { searchParams: Promise<{ category?: string; search?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { category = '', search = '' } = await searchParams;
  const curr = getCategory(category);
  if (search) return { title: 'Search the catalog', robots: { index: false, follow: true } };
  return {
    title: curr ? curr.name : 'Shop All',
    description: curr ? `${curr.name}: ${curr.desc}` : 'Discover agricultural tires, parts, equipment, technology, and maintenance essentials.',
    alternates: { canonical: curr ? `/shop?category=${curr.id}` : '/shop' },
  };
}

export default async function ShopPage({ searchParams }: Props) {
  const { category = '', search = '' } = await searchParams;
  return (
    <>
      <JsonLd data={breadcrumbLd([['Home', '/'], ['Shop', '/shop']])} />
      <ShopView key={`${category}|${search}`} category={category} search={search} />
    </>
  );
}
