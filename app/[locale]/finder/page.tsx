import type { Metadata } from 'next';
import Link from 'next/link';
import { FinderFromUrl } from '@/components/finder';
import { Icon, PageHead } from '@/components/ui';
import { BUSINESS } from '@/lib/catalog';
import { localePath } from '@/lib/i18n';
import { resolveLocale, type LocaleParams } from '@/lib/locale-params';
import { languageAlternates } from '@/lib/seo';

type Props = LocaleParams;

// The server HTML depends on ?tab=.
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, t } = await resolveLocale({ params });
  return { title: t.finder.crumb, description: t.meta.finderDesc, alternates: languageAlternates(locale, '/finder') };
}

export default async function FinderPage({ params }: Props) {
  const { locale, t } = await resolveLocale({ params });
  const f = t.finder;
  return (
    <main id="main-content">
      <PageHead locale={locale} title={f.pageTitle} desc={f.pageDesc} crumbs={f.crumb} />
      <FinderFromUrl />
      <section className="section">
        <div className="container">
          <div className="section-top">
            <div>
              <div className="eyebrow">{f.handEyebrow}</div>
              <h2 className="section-title">{f.handTitle}</h2>
              <p className="section-caption">{f.handA}<a className="contact-email-inline" href={`mailto:${BUSINESS.contactEmail}`}>{BUSINESS.contactEmail}</a>{f.handB}</p>
            </div>
            <Link href={localePath(locale, '/quote')} className="btn">{f.handBtn} <Icon name="arrow" size="sm" /></Link>
          </div>
        </div>
      </section>
    </main>
  );
}
