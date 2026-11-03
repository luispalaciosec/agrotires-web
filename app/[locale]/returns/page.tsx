import type { Metadata } from 'next';
import { ReturnForm } from '@/components/return-form';
import { PageHead } from '@/components/ui';
import { resolveLocale, type LocaleParams } from '@/lib/locale-params';
import { orderRef } from '@/lib/server/email';
import { returnable } from '@/lib/server/operations';
import { verify } from '@/lib/server/signed';
import { getStore } from '@/lib/server/store';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function ReturnsPage(props: LocaleParams & { searchParams: Promise<{ order?: string; sig?: string }> }) {
  const { locale, t } = await resolveLocale(props);
  const { order: orderId = '', sig = '' } = await props.searchParams;
  const r = t.returns;
  const store = getStore();
  const order = verify(sig, 'return', orderId) ? await store?.getOrder(orderId).catch(() => undefined) : undefined;
  const existing = order ? await store?.listReturnsForOrder(order.id).catch(() => []) ?? [] : [];
  return (
    <main id="main-content">
      <PageHead locale={locale} title={r.title} desc={order ? `${t.sales.payRef}: ${orderRef(order.id)}` : ''} crumbs={r.title} />
      <div className="content-narrow auth-page">
        {!order ? <div className="notice" role="alert">{r.badLink}</div> : null}
        {existing.map((e) => <div className="notice" key={e.id} role="status">{r.statusLine(r.statuses[e.status])}{e.teamNote ? ` ${e.teamNote}` : ''}</div>)}
        {order && returnable(order) ? <ReturnForm order={orderId} sig={sig} items={order.items.map((i) => ({ sku: i.sku, name: i.name, quantity: i.quantity }))} /> : null}
        {order && !returnable(order) ? <div className="notice" role="status">{r.errClosed}</div> : null}
      </div>
    </main>
  );
}
