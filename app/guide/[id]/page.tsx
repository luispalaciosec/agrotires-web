import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Icon, JsonLd, PageHead } from '@/components/ui';
import { getGuide, guides } from '@/lib/catalog';
import { absolute, breadcrumbLd, organizationLd } from '@/lib/seo';

type Props = { params: Promise<{ id: string }> };

export const dynamicParams = false;
export const generateStaticParams = () => guides.map((g) => ({ id: g.id }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const g = getGuide((await params).id);
  if (!g) return {};
  return { title: g.title, description: g.subtitle, alternates: { canonical: `/guide/${g.id}` } };
}

export default async function GuidePage({ params }: Props) {
  const g = getGuide((await params).id);
  if (!g) notFound();
  return (
    <main id="main-content">
      <JsonLd data={breadcrumbLd([['Home', '/'], ['Knowledge Hub', '/guides'], [g.title, `/guide/${g.id}`]])} />
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'Article', headline: g.title, description: g.subtitle, articleBody: g.body, url: absolute(`/guide/${g.id}`), publisher: { '@type': 'Organization', name: organizationLd.name, url: organizationLd.url } }} />
      <PageHead title={g.title} desc={g.subtitle} crumbs="Knowledge Hub" />
      <article className="content-narrow">
        <span className="tag"><Icon name="guide" size="sm" /> EDUCATIONAL RESOURCE</span>
        <h2>What to know</h2>
        <p>{g.body}</p>
        <p>For a real purchase, refer to actual product data and qualified supplier guidance. Compatibility and safety specifications should not be inferred from general descriptions.</p>
        <Link className="btn" href="/finder">Explore our product finder <Icon name="arrow" size="sm" /></Link>
      </article>
    </main>
  );
}
