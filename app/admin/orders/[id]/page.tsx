import { notFound } from 'next/navigation';
import { money } from '@/lib/catalog';
import { requireAdmin } from '@/lib/server/admin-auth';
import { getStore } from '@/lib/server/store';
import { updateOrderStatusAction } from '../../actions';

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const order = await getStore()?.getOrder(id);
  if (!order) notFound();
  return (
    <>
      <div className="admin-head"><h1>Order {order.id.slice(0, 8).toUpperCase()}</h1><span className="admin-pill">{order.status.replace('_', ' ')}</span></div>
      <div className="admin-card">
        <h2>Items</h2>
        <div className="admin-scroll">
          <table className="admin-table">
            <thead><tr><th>Product</th><th>SKU</th><th>Qty</th><th>Price</th></tr></thead>
            <tbody>
              {order.items.map((i) => <tr key={i.sku}><td>{i.name}</td><td>{i.sku}</td><td>{i.quantity}</td><td>{money(i.unitPriceCents / 100)}</td></tr>)}
              <tr><td colSpan={3}><strong>Total</strong></td><td><strong>{money(order.totalCents / 100)}</strong></td></tr>
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
          {order.status === 'paid' ? <form action={updateOrderStatusAction.bind(null, order.id, 'fulfilled')}><button className="btn">Mark as fulfilled</button></form> : null}
          {order.status === 'pending_payment' ? <form action={updateOrderStatusAction.bind(null, order.id, 'cancelled')}><button className="btn btn-danger">Cancel order</button></form> : null}
        </div>
      </div>
    </>
  );
}
