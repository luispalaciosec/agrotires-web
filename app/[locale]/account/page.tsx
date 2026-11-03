import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon, PageHead } from '@/components/ui';
import { localePath } from '@/lib/i18n';
import { resolveLocale, type LocaleParams } from '@/lib/locale-params';

export async function generateMetadata(props: LocaleParams): Promise<Metadata> {
  const { t } = await resolveLocale(props);
  return { title: t.account.crumb, robots: { index: false, follow: true } };
}

export default async function AccountPage(props: LocaleParams) {
  const { locale, t } = await resolveLocale(props);
  const a = t.account;
  return (
    <main id="main-content">
      <PageHead locale={locale} title={a.title} desc={a.desc} crumbs={a.crumb} />
      <div className="content-narrow">
        <div className="notice"><Icon name="lock" size="sm" /> {a.notice}</div>
        <div className="simple-cards">
          <div className="simple-card"><Icon name="box" size="lg" /><h3>{a.c1}</h3><p>{a.c1b}</p></div>
          <div className="simple-card"><Icon name="heart" size="lg" /><h3>{a.c2}</h3><p>{a.c2b}</p><Link href={localePath(locale, '/wishlist')} className="text-link">{a.c2c} <Icon name="arrow" size="sm" /></Link></div>
          <div className="simple-card"><Icon name="settings" size="lg" /><h3>{a.c3}</h3><p>{a.c3b}</p></div>
        </div>
        <div style={{ marginTop: 29 }}><Link className="btn" href={localePath(locale, '/setup')}>{a.btn} <Icon name="arrow" size="sm" /></Link></div>
      </div>
    </main>
  );
}
