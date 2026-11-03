import type { Metadata } from 'next';
import { WishlistItems } from '@/components/account-views';
import { PageHead } from '@/components/ui';
import { resolveLocale, type LocaleParams } from '@/lib/locale-params';

export async function generateMetadata(props: LocaleParams): Promise<Metadata> {
  const { t } = await resolveLocale(props);
  return { title: t.wishlist.crumb, robots: { index: false, follow: true } };
}

export default async function WishlistPage(props: LocaleParams) {
  const { locale, t } = await resolveLocale(props);
  return (
    <main id="main-content">
      <PageHead locale={locale} title={t.wishlist.title} desc={t.wishlist.desc} crumbs={t.wishlist.crumb} />
      <div className="container section"><WishlistItems /></div>
    </main>
  );
}
