import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon, JsonLd, PageHead } from '@/components/ui';
import { BUSINESS, faqs } from '@/lib/catalog';

const desc = 'Welcome to the Instant Solution Center—your starting point for product questions, shipping information, and agricultural buying guidance.';
export const metadata: Metadata = { title: 'Instant Solution Center', description: desc, alternates: { canonical: '/help' } };

const tiles = [
  { href: '/quote', icon: 'clipboard', title: 'Request a quote', body: 'Prepare an inquiry for a product or oversized agricultural freight shipment.', cta: 'Get started' },
  { href: '/finder', icon: 'search', title: 'Product finder', body: 'Search sample agricultural tires, equipment types, and part categories.', cta: 'Find a product' },
  { href: '/policies/shipping', icon: 'truck', title: 'Shipping & freight', body: 'See what shipping information still needs configuring for launch.', cta: 'Learn more' },
  { href: '/guides', icon: 'guide', title: 'Buying guides', body: 'Read about tire specifications and identifying replacement parts.', cta: 'Explore guides' },
];

export default function HelpPage() {
  return (
    <main id="main-content">
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }} />
      <PageHead title="How can we help?" desc={desc} crumbs="Instant Solution Center" />
      <section className="section">
        <div className="container">
          <div className="section-top"><div><div className="eyebrow">SUPPORT MADE SIMPLE</div><h2 className="section-title">Find the help you need.</h2></div></div>
          <div className="info-grid">
            {tiles.map((t) => (
              <Link href={t.href} className="info-tile" key={t.href}>
                <Icon name={t.icon} size="lg" /><h3>{t.title}</h3><p>{t.body}</p>
                <span className="text-link" style={{ marginTop: 16 }}>{t.cta} <Icon name="arrow" size="sm" /></span>
              </Link>
            ))}
          </div>
          <div className="contact-direct" aria-label="Email AGROTIRES">
            <div className="contact-direct-icon"><Icon name="mail" size="lg" /></div>
            <div>
              <div className="eyebrow">DIRECT EMAIL SUPPORT</div>
              <h3>Talk to AGROTIRES</h3>
              <p>Have a question about agricultural tires, parts, or a freight quote? You can contact us by email.</p>
              <a className="contact-email-inline" href={`mailto:${BUSINESS.contactEmail}`}>{BUSINESS.contactEmail}</a>
            </div>
            <a className="btn btn-light" href={`mailto:${BUSINESS.contactEmail}?subject=AGROTIRES%20Product%20Inquiry`}>Write an email <Icon name="arrow" size="sm" /></a>
          </div>
          <div style={{ marginTop: 66, maxWidth: 760 }}>
            <div className="eyebrow">COMMON QUESTIONS</div>
            <h2 style={{ fontSize: 35, margin: '9px 0 23px' }}>Frequently asked questions</h2>
            {faqs.map(([q, a]) => <details className="faq" key={q}><summary>{q} <Icon name="plus" size="sm" /></summary><p>{a}</p></details>)}
          </div>
        </div>
      </section>
    </main>
  );
}
