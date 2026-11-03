import type { Metadata } from 'next';
import { QuoteView } from '@/components/account-views';
import { PageHead } from '@/components/ui';
import { resolveLocale, type LocaleParams } from '@/lib/locale-params';
import { languageAlternates } from '@/lib/seo';

export async function generateMetadata(props: LocaleParams): Promise<Metadata> {
  const { locale, t } = await resolveLocale(props);
  return { title: t.quote.crumb, description: t.meta.quoteDesc, alternates: languageAlternates(locale, '/quote') };
}

export default async function QuotePage(props: LocaleParams) {
  const { locale, t } = await resolveLocale(props);
  return (
    <main id="main-content">
      <PageHead locale={locale} title={t.quote.title} desc={t.quote.desc} crumbs={t.quote.crumb} />
      <QuoteView />
    </main>
  );
}
