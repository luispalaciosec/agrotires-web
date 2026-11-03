import type { Metadata } from 'next';
import { UnsubscribeButton } from '@/components/sales-views';
import { PageHead } from '@/components/ui';
import { resolveLocale, type LocaleParams } from '@/lib/locale-params';
import { verify } from '@/lib/server/signed';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

// Asks for a click, because mail scanners open every link in a message.
export default async function UnsubscribePage(props: LocaleParams & { searchParams: Promise<{ e?: string; s?: string }> }) {
  const { locale, t } = await resolveLocale(props);
  const { e = '', s: sig = '' } = await props.searchParams;
  const s = t.sales;
  const valid = verify(sig, 'unsubscribe', e.toLowerCase());
  return (
    <main id="main-content">
      <PageHead locale={locale} title={s.unsubTitle} desc={valid ? s.unsubDesc(e) : ''} crumbs={s.unsubTitle} />
      <div className="content-narrow auth-page">{valid ? <UnsubscribeButton email={e} sig={sig} /> : <div className="notice" role="alert">{s.unsubError}</div>}</div>
    </main>
  );
}
