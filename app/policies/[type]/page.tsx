import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon, PageHead } from '@/components/ui';

const lookup: Record<string, [string, string]> = {
  shipping: ['Shipping & Freight', 'Shipping origins, delivery service areas, carrier accounts, fulfillment times and freight rates have not yet been provided. The production store should show actual services and prices only after they have been configured and tested.'],
  returns: ['Returns & Warranties', 'AGROTIRES has not supplied an approved returns, refunds or warranty policy. This section is reserved for the official company policy, including conditions, timelines, exclusions and applicable consumer rights.'],
  privacy: ['Privacy Overview', 'A final privacy policy requires review of the selected commerce platform, analytics, contact forms, cookies, payment processor and legal obligations. In this prototype, wishlist, cart and demo inquiry drafts are stored only in this browser using localStorage.'],
  terms: ['Terms & Conditions', 'Commercial terms, legal entity details, permitted use, shipping, payment obligations and dispute information must be provided or reviewed by qualified company advisors before accepting real orders.'],
};

type Props = { params: Promise<{ type: string }> };

export const generateStaticParams = () => Object.keys(lookup).map((type) => ({ type }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [title] = lookup[(await params).type] || lookup.terms;
  return { title };
}

export default async function PolicyPage({ params }: Props) {
  const [title, txt] = lookup[(await params).type] || lookup.terms;
  return (
    <main id="main-content">
      <PageHead title={title} desc={txt} crumbs="Information" />
      <div className="content-narrow">
        <div className="notice"><Icon name="info" size="sm" /> Draft placeholder for business review. Not an approved company policy.</div>
        <h2>Before launch</h2>
        <p>{txt}</p>
        <p>The current AGROTIRES site is an interactive design demonstration. Sample products are not listed for sale and no real payments are processed.</p>
        <Link className="btn" href="/setup">View launch checklist <Icon name="arrow" size="sm" /></Link>
      </div>
    </main>
  );
}
