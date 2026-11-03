import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Icon, JsonLd, PageHead } from '@/components/ui';
import { getGuide, guides } from '@/lib/catalog';
import { LOCALE_TAGS, localePath } from '@/lib/i18n';
import { resolveLocale } from '@/lib/locale-params';
import { absolute, breadcrumbLd, languageAlternates, organizationLd } from '@/lib/seo';

type Props = { params: Promise<{ locale: string; id: string }> };

export const generateStaticParams = () => guides.map((g) => ({ id: g.id }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await resolveLocale({ params });
  const g = getGuide((await params).id, locale);
  if (!g) return {};
  return { title: g.title, description: g.subtitle, alternates: languageAlternates(locale, `/guide/${g.id}`) };
}

export default async function GuidePage({ params }: Props) {
  const { locale, t } = await resolveLocale({ params });
  const g = getGuide((await params).id, locale);
  if (!g) notFound();
  const href = (p: string) => localePath(locale, p);
  return (
    <main id="main-content">
      <JsonLd data={breadcrumbLd([[t.common.home, href('/')], [t.guides.crumb, href('/guides')], [g.title, href(`/guide/${g.id}`)]])} />
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'Article', headline: g.title, description: g.subtitle, articleBody: g.body, inLanguage: LOCALE_TAGS[locale], url: absolute(href(`/guide/${g.id}`)), publisher: { '@type': 'Organization', name: organizationLd.name, url: organizationLd.url } }} />
      <PageHead locale={locale} title={g.title} desc={g.subtitle} crumbs={t.guides.crumb} />
      <article className="content-narrow">
        <span className="tag"><Icon name="guide" size="sm" /> {t.guides.tag}</span>
        <h2>{t.guides.know}</h2>
        <p>{g.body}</p>
        <p>{t.guides.extra}</p>
        <Link className="btn" href={href('/finder')}>{t.guides.btn} <Icon name="arrow" size="sm" /></Link>
      </article>
    </main>
  );
}
