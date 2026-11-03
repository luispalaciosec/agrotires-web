import { notFound } from 'next/navigation';
import { money } from '@/lib/catalog';
import { isFullAdmin, requireAdmin } from '@/lib/server/admin-auth';
import { orderRef } from '@/lib/server/email';
import { remainingToRestock } from '@/lib/server/operations';
import { refundableCents } from '@/lib/server/orders';
import { carrierLink, STATUS_LABELS } from '@/lib/shipping';
import { paymentsEnabled } from '@/lib/server/paypal';
import { getStore } from '@/lib/server/store';
import { markInvoicePaidAction, updateOrderStatusAction } from '../../actions';
import { RefundForm } from '../../forms';
import { CreateShipmentForm, ShipmentUpdateForm } from '../../tools-forms';

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const order = await getStore()?.getOrder(id);
  if (!order) notFound();
  const shipment = await getStore()?.getShipmentByOrder(order.id).catch(() => undefined);
  const site = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
  const carrierUrl = shipment ? carrierLink(shipment.carrier, shipment.trackingNumber) : undefined;
  return (
    <>
      <div className="admin-head"><h1>Order {orderRef(order.id)}</h1><span className="admin-pill">{order.status.replace('_', ' ')}</span></div>
      <div className="admin-card">
        <h2>Items</h2>
        <div className="admin-scroll">
          <table className="admin-table">
            <thead><tr><th>Product</th><th>SKU</th><th>Qty</th><th>Price</th></tr></thead>
            <tbody>
              {order.items.map((i) => <tr key={i.sku}><td>{i.name}</td><td>{i.sku}</td><td>{i.quantity}</td><td>{money(i.unitPriceCents / 100)}</td></tr>)}
              {order.taxCents ? <tr><td colSpan={3}>Sales tax{order.shippingAddress ? ` (${order.shippingAddress.state})` : ''}</td><td>{money(order.taxCents / 100)}</td></tr> : null}
              <tr><td colSpan={3}><strong>Total</strong></td><td><strong>{money(order.totalCents / 100)}</strong></td></tr>
              {order.refundedCents ? <tr><td colSpan={3}>Refunded</td><td>−{money(order.refundedCents / 100)}</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
      <div className="admin-card">
        <h2>Customer and payment</h2>
        <p style={{ fontSize: 13, margin: 0 }}>{order.email}<br />PayPal order: {order.paypalOrderId ?? '—'}<br />PayPal capture: {order.paypalCaptureId ?? '—'}</p>
        {order.shippingAddress ? (
          <p style={{ fontSize: 13, margin: '14px 0 0' }}>
            <strong>Ship to</strong><br />{order.shippingAddress.name}<br />{order.shippingAddress.line1}{order.shippingAddress.line2 ? <><br />{order.shippingAddress.line2}</> : null}<br />{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}<br />{order.shippingAddress.country}
          </p>
        ) : null}
        <div className="admin-actions" style={{ marginTop: 16 }}>
          {order.status === 'paid' ? <form action={updateOrderStatusAction.bind(null, order.id, 'fulfilled')}><button className="btn btn-light">Complete without shipping (pickup)</button></form> : null}
          {order.status === 'pending_payment' ? <form action={updateOrderStatusAction.bind(null, order.id, 'cancelled')}><button className="btn btn-danger">Cancel order</button></form> : null}
        </div>
      </div>
      {order.invoiceDueAt ? (
        <div className="admin-card">
          <h2>Invoice on terms</h2>
          <p style={{ fontSize: 13, margin: 0 }}>{order.invoicePaidAt ? <>Paid on {new Date(order.invoicePaidAt).toLocaleDateString('en-US', { dateStyle: 'medium' })}.</> : <>Due {new Date(order.invoiceDueAt).toLocaleDateString('en-US', { dateStyle: 'medium' })}. Not paid yet.</>}</p>
          {order.invoicePaidAt ? null : <form action={markInvoicePaidAction.bind(null, order.id)} style={{ marginTop: 12 }}><button className="btn btn-light">Mark as paid</button></form>}
        </div>
      ) : null}
      {shipment || order.status === 'paid' || order.status === 'on_terms' ? (
        <div className="admin-card">
          <h2>Shipment</h2>
          {shipment ? (
            <>
              <div className="shipment-summary">
                <span className={`admin-pill ${shipment.status === 'exception' ? 'bad' : ''}`}>{STATUS_LABELS[shipment.status]}</span>
                <span>{shipment.carrier}{shipment.trackingNumber ? ` · ${shipment.trackingNumber}` : ''}</span>
                {carrierUrl ? <a className="text-link" href={carrierUrl} target="_blank" rel="noopener noreferrer">Carrier page</a> : null}
                <a className="text-link" href={`${site}${order.locale === 'es' ? '/es' : ''}/track?code=${shipment.code}`} target="_blank" rel="noopener noreferrer">Customer tracking page</a>
              </div>
              <ol className="shipment-timeline">
                {shipment.events.slice().reverse().map((e) => (
                  <li key={e.id}>
                    <strong>{STATUS_LABELS[e.status]}</strong>
                    <small>{new Date(e.occurredAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}{e.location ? ` · ${e.location}` : ''}</small>
                    {e.note ? <span>{e.note}</span> : null}
                  </li>
                ))}
              </ol>
              <ShipmentUpdateForm orderId={order.id} shipment={shipment} />
            </>
          ) : <CreateShipmentForm orderId={order.id} />}
        </div>
      ) : null}
      {order.paypalCaptureId && (order.status === 'paid' || order.status === 'fulfilled' || order.status === 'refunded') ? (
        <div className="admin-card">
          <h2>Refund</h2>
          {!(await isFullAdmin()) ? <p className="muted" style={{ margin: 0 }}>Only an administrator can issue refunds.</p> : paymentsEnabled() ? <RefundForm orderId={order.id} refundableCents={refundableCents(order)} refundedCents={order.refundedCents ?? 0} items={order.items.map((i) => ({ sku: i.sku, name: i.name, left: remainingToRestock(order, i.sku) }))} /> : <p className="muted" style={{ margin: 0 }}>Refunds are available once PayPal is connected.</p>}
        </div>
      ) : null}
    </>
  );
}
