import type { Metadata } from 'next';
import { GuideCard, PageHead } from '@/components/ui';
import { guides } from '@/lib/catalog';

const desc = 'Useful buying basics for equipment owners, farm managers, and the next generation of agricultural professionals.';
export const metadata: Metadata = { title: 'Knowledge Hub', description: desc, alternates: { canonical: '/guides' } };

export default function GuidesPage() {
  return (
    <main id="main-content">
      <PageHead title="The AGROTIRES Knowledge Hub" desc={desc} crumbs="Knowledge Hub" />
      <section className="section"><div className="container"><div className="guide-grid">{guides.map((g) => <GuideCard key={g.id} guide={g} />)}</div></div></section>
    </main>
  );
}
