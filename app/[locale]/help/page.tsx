import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon, JsonLd, PageHead } from '@/components/ui';
import { BUSINESS, getFaqs } from '@/lib/catalog';
import { LOCALE_TAGS, localePath } from '@/lib/i18n';
import { resolveLocale, type LocaleParams } from '@/lib/locale-params';
import { languageAlternates } from '@/lib/seo';

export async function generateMetadata(props: LocaleParams): Promise<Metadata> {
  const { locale, t } = await resolveLocale(props);
  return { title: t.help.crumb, description: t.help.desc, alternates: languageAlternates(locale, '/help') };
}

export default async function HelpPage(props: LocaleParams) {
  const { locale, t } = await resolveLocale(props);
  const h = t.help;
  const faqs = getFaqs(locale);
  const tiles = [
    { href: '/quote', icon: 'clipboard', title: h.t1, body: h.t1b, cta: h.t1c },
    { href: '/finder', icon: 'search', title: h.t2, body: h.t2b, cta: h.t2c },
    { href: '/policies/shipping', icon: 'truck', title: h.t3, body: h.t3b, cta: h.t3c },
    { href: '/guides', icon: 'guide', title: h.t4, body: h.t4b, cta: h.t4c },
  ];
  return (
    <main id="main-content">
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'FAQPage', inLanguage: LOCALE_TAGS[locale], mainEntity: faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }} />
      <PageHead locale={locale} title={h.title} desc={h.desc} crumbs={h.crumb} />
      <section className="section">
        <div className="container">
          <div className="section-top"><div><div className="eyebrow">{h.eyebrow}</div><h2 className="section-title">{h.h2}</h2></div></div>
          <div className="info-grid">
            {tiles.map((tile) => (
              <Link href={localePath(locale, tile.href)} className="info-tile" key={tile.href}>
                <Icon name={tile.icon} size="lg" /><h3>{tile.title}</h3><p>{tile.body}</p>
                <span className="text-link" style={{ marginTop: 16 }}>{tile.cta} <Icon name="arrow" size="sm" /></span>
              </Link>
            ))}
          </div>
          <div className="contact-direct" aria-label={h.contactLabel}>
            <div className="contact-direct-icon"><Icon name="mail" size="lg" /></div>
            <div>
              <div className="eyebrow">{h.directEyebrow}</div>
              <h3>{h.directTitle}</h3>
              <p>{h.directText}</p>
              <a className="contact-email-inline" href={`mailto:${BUSINESS.contactEmail}`}>{BUSINESS.contactEmail}</a>
            </div>
            <a className="btn btn-light" href={`mailto:${BUSINESS.contactEmail}?subject=${encodeURIComponent(h.subject)}`}>{h.directBtn} <Icon name="arrow" size="sm" /></a>
          </div>
          <div style={{ marginTop: 66, maxWidth: 760 }}>
            <div className="eyebrow">{h.faqEyebrow}</div>
            <h2 style={{ fontSize: 35, margin: '9px 0 23px' }}>{h.faqTitle}</h2>
            {faqs.map(([q, a]) => <details className="faq" key={q}><summary>{q} <Icon name="plus" size="sm" /></summary><p>{a}</p></details>)}
          </div>
        </div>
      </section>
    </main>
  );
}
