import Link from 'next/link';
import { money } from '@/lib/catalog';
import { requireAdmin } from '@/lib/server/admin-auth';
import { orderRef } from '@/lib/server/email';
import { getStore, type OrderStatus } from '@/lib/server/store';

const FILTERS: [OrderStatus | 'all', string][] = [['all', 'All'], ['paid', 'To ship'], ['fulfilled', 'Shipped'], ['pending_payment', 'Awaiting payment'], ['refunded', 'Refunded'], ['payment_failed', 'Failed'], ['cancelled', 'Cancelled']];
const TONE: Partial<Record<OrderStatus, string>> = { pending_payment: 'off', cancelled: 'off', paid: 'warn', payment_failed: 'bad', refunded: 'off' };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  await requireAdmin();
  const { status = 'all', q = '' } = await searchParams;
  const all = (await getStore()?.listOrders()) ?? [];
  const term = q.trim().toLowerCase();
  const orders = all
    .filter((o) => status === 'all' || o.status === status)
    .filter((o) => !term || o.email.toLowerCase().includes(term) || orderRef(o.id).toLowerCase().includes(term));
  return (
    <>
      <div className="admin-head">
        <h1>Orders</h1>
        <a className="btn btn-light" href="/admin/orders/export">Export CSV</a>
      </div>
      <div className="admin-toolbar">
        <div className="admin-range" role="group" aria-label="Filter by status">
          {FILTERS.map(([value, label]) => {
            const count = value === 'all' ? all.length : all.filter((o) => o.status === value).length;
            return <Link key={value} href={`/admin/orders?status=${value}`} className={status === value ? 'current' : undefined}>{label} <small>{count}</small></Link>;
          })}
        </div>
        <form className="admin-search" role="search">
          <input type="hidden" name="status" value={status} />
          <input className="text-input" name="q" defaultValue={q} placeholder="Search reference or email" aria-label="Search orders" />
        </form>
      </div>
      <div className="admin-card">
        <div className="admin-scroll">
          <table className="admin-table">
            <thead><tr><th>Reference</th><th>Date</th><th>Customer</th><th>Ship to</th><th>Items</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td><Link href={`/admin/orders/${o.id}`}>{orderRef(o.id)}</Link></td>
                  <td>{new Date(o.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' })}</td>
                  <td>{o.email}</td>
                  <td>{o.shippingAddress ? `${o.shippingAddress.city}, ${o.shippingAddress.state}` : '—'}</td>
                  <td>{o.items.reduce((n, i) => n + i.quantity, 0)}</td>
                  <td>{money(o.totalCents / 100)}</td>
                  <td><span className={`admin-pill ${TONE[o.status] ?? ''}`}>{o.status.replace('_', ' ')}</span></td>
                </tr>
              ))}
              {orders.length ? null : <tr><td colSpan={7} className="muted">{all.length ? 'No orders match this view.' : 'No orders yet.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
