import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageBlocks } from '@/components/page-blocks';
import { resolveLocale } from '@/lib/locale-params';
import { languageAlternates } from '@/lib/seo';
import { PageHead } from '@/components/ui';
import { getStore } from '@/lib/server/store';
import type { Locale } from '@/lib/i18n';

// Publishing or hiding a page takes effect at once.
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ locale: string; slug: string }> };

const findPage = async (slug: string) => {
  const page = await getStore()?.getPageBySlug(slug).catch(() => undefined);
  return page?.published ? page : undefined;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale } = await resolveLocale(props);
  const { slug } = await props.params;
  const page = await findPage(slug);
  if (!page) return {};
  return {
    title: (locale === 'es' && page.titleEs) || page.titleEn,
    description: (locale === 'es' && page.descEs) || page.descEn || undefined,
    alternates: languageAlternates(locale, `/p/${slug}`),
  };
}

export default async function ContentPage(props: Props) {
  const { locale } = await resolveLocale(props);
  const { slug } = await props.params;
  const page = await findPage(slug);
  if (!page) notFound();
  const title = (locale === 'es' && page.titleEs) || page.titleEn;
  return (
    <main id="main-content">
      <PageHead locale={locale as Locale} title={title} desc={(locale === 'es' && page.descEs) || page.descEn} crumbs={title} />
      <section className="section">
        <div className="container">
          <PageBlocks blocks={page.blocks} locale={locale as Locale} />
        </div>
      </section>
    </main>
  );
}
