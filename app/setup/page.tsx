import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon, PageHead } from '@/components/ui';

export const metadata: Metadata = { title: 'Launch checklist', robots: { index: false, follow: false } };

const steps: [string, 'Ready' | 'Required'][] = [
  ['Official AGROTIRES branding', 'Ready'],
  ['Responsive homepage & catalog preview', 'Ready'],
  ['Interactive sample cart & wishlist', 'Ready'],
  ['Product finder and demo quote form', 'Ready'],
  ['Actual product feed, specifications, prices & stock', 'Required'],
  ['Secure commerce backend & customer accounts', 'Required'],
  ['Merchant payments and U.S. tax calculation', 'Required'],
  ['Shipping origin, carrier quotes and freight rules', 'Required'],
  ['Official email and website domain', 'Ready'],
  ['Business address, other contact details and verified policies', 'Required'],
  ['Real transaction & security acceptance tests', 'Required'],
];

export default function SetupPage() {
  return (
    <main id="main-content">
      <PageHead title="From prototype to real store." desc="Your storefront preview is ready. These production connections and business decisions are still needed before publishing an operating e-commerce website." crumbs="Launch checklist" />
      <div className="content-narrow">
        <div className="notice"><Icon name="info" size="sm" /> The prototype is not a production e-commerce platform. It contains no live inventory, checkout, authentication, or order processing.</div>
        <div className="setup-checks">
          {steps.map(([x, status]) => (
            <div className={`setup-check ${status === 'Required' ? 'pending' : ''}`} key={x}><Icon name={status === 'Ready' ? 'check' : 'clock'} /><span>{x}</span><strong>{status}</strong></div>
          ))}
        </div>
        <h2>Suggested live architecture</h2>
        <p><strong>Storefront:</strong> Lovable React + TypeScript UI, or an equivalent maintainable frontend.</p>
        <p><strong>Backend:</strong> Lovable Cloud / Supabase or an established commerce platform with authenticated customer management, inventory and orders.</p>
        <p><strong>Payments:</strong> A configured PCI-compliant provider. <strong>Tax:</strong> Validated U.S. sales tax rules. <strong>Shipping:</strong> Real parcel and freight integrations.</p>
        <Link href="/shop" className="btn">Back to demo store <Icon name="arrow" size="sm" /></Link>
      </div>
    </main>
  );
}
