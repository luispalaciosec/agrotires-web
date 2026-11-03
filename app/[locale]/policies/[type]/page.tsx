import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon, PageHead } from '@/components/ui';
import { localePath } from '@/lib/i18n';
import { resolveLocale } from '@/lib/locale-params';
import { languageAlternates } from '@/lib/seo';

type Props = { params: Promise<{ locale: string; type: string }> };

export const generateStaticParams = () => ['shipping', 'returns', 'privacy', 'terms'].map((type) => ({ type }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, t } = await resolveLocale({ params });
  const { type } = await params;
  const [title] = t.policies.items[type] || t.policies.items.terms;
  return { title, alternates: languageAlternates(locale, `/policies/${type}`) };
}

export default async function PolicyPage({ params }: Props) {
  const { locale, t } = await resolveLocale({ params });
  const { type } = await params;
  const p = t.policies;
  const [title, txt] = p.items[type] || p.items.terms;
  return (
    <main id="main-content">
      <PageHead locale={locale} title={title} desc={txt} crumbs={p.crumb} />
      <div className="content-narrow">
        <div className="notice"><Icon name="info" size="sm" /> {p.draft}</div>
        <h2>{p.before}</h2>
        <p>{txt}</p>
        <p>{p.demo}</p>
        <Link className="btn" href={localePath(locale, '/setup')}>{p.btn} <Icon name="arrow" size="sm" /></Link>
      </div>
    </main>
  );
}
