import { money } from '@/lib/catalog';
import { requireAdmin } from '@/lib/server/admin-auth';
import { customerReport } from '@/lib/server/analytics';
import { getStore } from '@/lib/server/store';
import { B2bDecisionForm } from '../tools-forms';

export default async function CustomersPage() {
  await requireAdmin();
  const customers = customerReport((await getStore()?.listOrders()) ?? []);
  const accounts = await getStore()?.listB2bAccounts().catch(() => undefined);
  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Customers</h1>
          <p className="admin-sub">Built from paid orders, since the store has no customer accounts yet.</p>
        </div>
      </div>
      <div className="admin-card">
        <h2>Business accounts</h2>
        {accounts === undefined ? <p className="muted">Run the migration 0010_sales_tools.sql in Supabase to use this section.</p> : accounts.length ? (
          <ul className="b2b-list">
            {accounts.map((a) => (
              <li key={a.profileId}>
                <div><strong>{a.company}</strong> <span className={`admin-pill ${a.status === 'pending' ? 'warn' : a.status === 'rejected' ? 'off' : ''}`}>{a.status}</span><br /><small className="muted">{a.email}{a.taxId ? ` · Tax ID: ${a.taxId}` : ''}{a.note ? ` · ${a.note}` : ''}</small></div>
                <B2bDecisionForm profileId={a.profileId} discount={a.discountBps} terms={a.termsDays} status={a.status} />
              </li>
            ))}
          </ul>
        ) : <p className="muted">No applications yet. Customers apply from their account.</p>}
      </div>
      <div className="admin-card">
        <h2>Buyers</h2>
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
