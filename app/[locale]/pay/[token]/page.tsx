import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PayLinkButtons } from '@/components/sales-views';
import { PageHead } from '@/components/ui';
import { money } from '@/lib/catalog';
import { resolveLocale, type LocaleParams } from '@/lib/locale-params';
import { orderRef } from '@/lib/server/email';
import { paymentsEnabled } from '@/lib/server/paypal';
import { payLinkProblem } from '@/lib/server/sales';
import { getStore } from '@/lib/server/store';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function PayPage(props: LocaleParams & { params: Promise<{ token: string; locale: string }> }) {
  const { locale, t } = await resolveLocale(props);
  const { token } = await props.params;
  const order = await getStore()?.getOrderByPayToken(token).catch(() => undefined);
  if (!order) notFound();
  const s = t.sales;
  const l = t.checkout.live;
  const usd = (cents: number) => money(cents / 100);
  const problem = payLinkProblem(order);
  const a = order.shippingAddress;
  return (
    <main id="main-content">
      <PageHead locale={locale} title={s.payTitle} desc={`${s.payRef}: ${orderRef(order.id)}`} crumbs={s.payCrumb} />
      <div className="container checkout-grid">
        <div className="form-card">
          {problem ? <div className="notice" role="status">{s.payProblems[problem]}</div> : paymentsEnabled() ? (
            <PayLinkButtons token={token} config={{ clientId: process.env.PAYPAL_CLIENT_ID!, sandbox: process.env.PAYPAL_ENV !== 'live' }} />
          ) : <div className="notice" role="status">{s.payOff}</div>}
          {a ? <p style={{ fontSize: 13, marginTop: 16 }}><strong>{l.addressTitle}</strong><br />{a.name}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ''}<br />{a.city}, {a.state} {a.postalCode}</p> : null}
        </div>
        <aside className="checkout-summary">
          <h3>{l.summary}</h3>
          {order.items.map((i) => <div className="checkout-line" key={i.sku}><span>{i.name} <span className="muted">× {i.quantity}</span></span><strong>{usd(i.unitPriceCents * i.quantity)}</strong></div>)}
          <div className="checkout-line"><span>{l.shipping}</span><strong>{usd(order.shippingCents)}</strong></div>
          <div className="checkout-line"><span>{l.tax}</span><strong>{usd(order.taxCents)}</strong></div>
          <div className="checkout-total"><span>{l.total}</span><span>{usd(order.totalCents)}</span></div>
        </aside>
      </div>
    </main>
  );
}
