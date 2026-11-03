import type { Metadata } from 'next';
import { GuideCard, PageHead } from '@/components/ui';
import { getGuides } from '@/lib/catalog';
import { resolveLocale, type LocaleParams } from '@/lib/locale-params';
import { languageAlternates } from '@/lib/seo';

export async function generateMetadata(props: LocaleParams): Promise<Metadata> {
  const { locale, t } = await resolveLocale(props);
  return { title: t.guides.crumb, description: t.guides.desc, alternates: languageAlternates(locale, '/guides') };
}

export default async function GuidesPage(props: LocaleParams) {
  const { locale, t } = await resolveLocale(props);
  return (
    <main id="main-content">
      <PageHead locale={locale} title={t.guides.title} desc={t.guides.desc} crumbs={t.guides.crumb} />
      <section className="section"><div className="container"><div className="guide-grid">{getGuides(locale).map((g) => <GuideCard key={g.id} guide={g} locale={locale} />)}</div></div></section>
    </main>
  );
}
