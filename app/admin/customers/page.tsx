import { money } from '@/lib/catalog';
import { requireAdmin } from '@/lib/server/admin-auth';
import { customerReport } from '@/lib/server/analytics';
import { getStore } from '@/lib/server/store';

export default async function CustomersPage() {
  await requireAdmin();
  const customers = customerReport((await getStore()?.listOrders()) ?? []);
  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Customers</h1>
          <p className="admin-sub">Built from paid orders, since the store has no customer accounts yet.</p>
        </div>
      </div>
      <div className="admin-card">
        <div className="admin-scroll">
          <table className="admin-table">
            <thead><tr><th>Email</th><th>Orders</th><th>Spent</th><th>Last order</th><th>State</th></tr></thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.email}>
                  <td><a href={`/admin/orders?q=${encodeURIComponent(c.email)}`}>{c.email}</a></td>
                  <td>{c.orders}</td>
                  <td>{money(c.spentCents / 100)}</td>
                  <td>{new Date(c.lastOrder).toLocaleDateString('en-US', { dateStyle: 'medium' })}</td>
                  <td>{c.state ?? '—'}</td>
                </tr>
              ))}
              {customers.length ? null : <tr><td colSpan={5} className="muted">No customers yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
