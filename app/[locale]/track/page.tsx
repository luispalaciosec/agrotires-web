import type { Metadata } from 'next';
import { TrackView } from '@/components/track-view';
import { PageHead } from '@/components/ui';
import { resolveLocale, type LocaleParams } from '@/lib/locale-params';
import { languageAlternates } from '@/lib/seo';

export async function generateMetadata(props: LocaleParams): Promise<Metadata> {
  const { locale, t } = await resolveLocale(props);
  return { title: t.track.crumb, description: t.track.desc, alternates: languageAlternates(locale, '/track'), robots: { index: false, follow: true } };
}

export default async function TrackPage(props: LocaleParams) {
  const { locale, t } = await resolveLocale(props);
  return (
    <main id="main-content">
      <PageHead locale={locale} title={t.track.title} desc={t.track.desc} crumbs={t.track.crumb} />
      <TrackView />
    </main>
  );
}
