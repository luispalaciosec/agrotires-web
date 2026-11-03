import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon, PageHead } from '@/components/ui';

export const metadata: Metadata = { title: 'My account', robots: { index: false, follow: true } };

export default function AccountPage() {
  return (
    <main id="main-content">
      <PageHead title="Your AGROTIRES account." desc="The future customer dashboard will keep orders, addresses, equipment profiles, and favorites in one easy place." crumbs="My account" />
      <div className="content-narrow">
        <div className="notice"><Icon name="lock" size="sm" /> Account sign-in is not enabled in this static preview. No passwords or personal data should be entered.</div>
        <div className="simple-cards">
          <div className="simple-card"><Icon name="box" size="lg" /><h3>Order history</h3><p>Review purchases and fulfillment once a commerce backend is connected.</p></div>
          <div className="simple-card"><Icon name="heart" size="lg" /><h3>Saved products</h3><p>Build your shortlist of farm essentials with the demo wishlist.</p><Link href="/wishlist" className="text-link">View wishlist <Icon name="arrow" size="sm" /></Link></div>
          <div className="simple-card"><Icon name="settings" size="lg" /><h3>Saved equipment</h3><p>Keep machinery details ready for more accurate part discovery after launch.</p></div>
        </div>
        <div style={{ marginTop: 29 }}><Link className="btn" href="/setup">See what is needed for launch <Icon name="arrow" size="sm" /></Link></div>
      </div>
    </main>
  );
}
