import type { Metadata } from 'next';
import Link from 'next/link';
import { Asset, Icon, PageHead } from '@/components/ui';
import { localePath } from '@/lib/i18n';
import { resolveLocale, type LocaleParams } from '@/lib/locale-params';
import { languageAlternates } from '@/lib/seo';

export async function generateMetadata(props: LocaleParams): Promise<Metadata> {
  const { locale, t } = await resolveLocale(props);
  return { title: t.about.metaTitle, description: t.about.desc, alternates: languageAlternates(locale, '/about') };
}

export default async function AboutPage(props: LocaleParams) {
  const { locale, t } = await resolveLocale(props);
  const a = t.about;
  return (
    <main id="main-content">
      <PageHead locale={locale} title={a.title} desc={a.desc} crumbs={a.crumb} />
      <section className="section">
        <div className="container">
          <div className="editorial">
            <div className="editorial-media"><Asset name="farm-hero.svg" alt={a.imgAlt} sizes="(max-width: 720px) 100vw, 680px" /></div>
            <div className="editorial-content">
              <div className="eyebrow">{a.eyebrow}</div>
              <h2>{a.h2a}<br />{a.h2b}</h2>
              <p>{a.text}</p>
              <Link href={localePath(locale, '/shop')} className="btn">{a.btn} <Icon name="arrow" size="sm" /></Link>
            </div>
          </div>
          <div className="simple-cards">
            <div className="simple-card"><Icon name="search" size="lg" /><h3>{a.c1}</h3><p>{a.c1b}</p></div>
            <div className="simple-card"><Icon name="bolt" size="lg" /><h3>{a.c2}</h3><p>{a.c2b}</p></div>
            <div className="simple-card"><Icon name="shield" size="lg" /><h3>{a.c3}</h3><p>{a.c3b}</p></div>
          </div>
          <p style={{ margin: '26px 0 0', fontSize: 12 }}>{a.note}</p>
        </div>
      </section>
    </main>
  );
}
