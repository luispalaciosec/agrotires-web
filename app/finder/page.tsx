import type { Metadata } from 'next';
import Link from 'next/link';
import { FinderSection, type FinderTab } from '@/components/finder';
import { Icon, PageHead } from '@/components/ui';
import { BUSINESS } from '@/lib/catalog';

export const metadata: Metadata = { title: 'Product finder', description: 'Search by tire, part type, or equipment category.', alternates: { canonical: '/finder' } };

export default async function FinderPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const initialTab = (['tire', 'part', 'machine'].includes(tab || '') ? tab : 'tire') as FinderTab;
  return (
    <main id="main-content">
      <PageHead title="Find your next solution." desc="Search the illustrative catalog by tire, part type, or equipment category. Verified compatibility requires supplier information." crumbs="Product finder" />
      <FinderSection initialTab={initialTab} />
      <section className="section">
        <div className="container">
          <div className="section-top">
            <div>
              <div className="eyebrow">NEED A HAND?</div>
              <h2 className="section-title">Not sure what to search for?</h2>
              <p className="section-caption">Need more help? Email AGROTIRES directly at <a className="contact-email-inline" href={`mailto:${BUSINESS.contactEmail}`}>{BUSINESS.contactEmail}</a>, or prepare an inquiry below.</p>
            </div>
            <Link href="/quote" className="btn">Prepare an inquiry <Icon name="arrow" size="sm" /></Link>
          </div>
        </div>
      </section>
    </main>
  );
}
