import Link from 'next/link';
import { money } from '@/lib/catalog';
import { requireAdmin } from '@/lib/server/admin-auth';
import { getStore } from '@/lib/server/store';

export default async function OrdersPage() {
  await requireAdmin();
  const orders = (await getStore()?.listOrders()) ?? [];
  return (
    <>
      <div className="admin-head"><h1>Orders</h1></div>
      <div className="admin-card">
        <div className="admin-scroll">
          <table className="admin-table">
            <thead><tr><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td><Link href={`/admin/orders/${o.id}`}>{new Date(o.createdAt).toLocaleString('en-US')}</Link></td>
                  <td>{o.email}</td>
                  <td>{o.items.reduce((n, i) => n + i.quantity, 0)}</td>
                  <td>{money(o.totalCents / 100)}</td>
                  <td><span className="admin-pill">{o.status.replace('_', ' ')}</span></td>
                </tr>
              ))}
              {orders.length ? null : <tr><td colSpan={5} className="muted">No orders yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
