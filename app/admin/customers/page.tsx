import { money } from '@/lib/catalog';
import { requireAdmin } from '@/lib/server/admin-auth';
import { customerReport } from '@/lib/server/analytics';
import { getStore } from '@/lib/server/store';
import { paginate, Pager, TableFilters } from '../table-tools';
import { B2bDecisionForm } from '../tools-forms';

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; state?: string; b2b?: string; page?: string }> }) {
  await requireAdmin();
  const { q = '', state = 'all', b2b = 'all', page } = await searchParams;
  const buyers = customerReport((await getStore()?.listOrders()) ?? []);
  const term = q.trim().toLowerCase();
  const customers = buyers.filter((c) => !term || c.email.toLowerCase().includes(term)).filter((c) => state === 'all' || c.state === state);
  const result = paginate(customers, page);
  const states = [...new Set(buyers.map((c) => c.state).filter((s): s is string => Boolean(s)))].sort();
  const allAccounts = await getStore()?.listB2bAccounts().catch(() => undefined);
  const accounts = allAccounts?.filter((a) => b2b === 'all' || a.status === b2b);
  const subscribers = await getStore()?.listSubscribers().catch(() => []) ?? [];
  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Customers</h1>
          <p className="admin-sub">Business applications and everyone who has bought, with or without an account.</p>
        </div>
      </div>
      <div className="admin-card">
        <h2>Business accounts</h2>
        {allAccounts?.length ? <TableFilters base="/admin/customers" keep={{ q, state }} fields={[{ name: 'b2b', label: 'Status', value: b2b, options: [['all', 'All'], ['pending', 'pending'], ['approved', 'approved'], ['rejected', 'rejected']] }]} /> : null}
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
        <h2>Newsletter</h2>
        <p style={{ fontSize: 13, margin: '0 0 6px' }}><strong>{subscribers.length}</strong> people signed up. People who opted out are not included.</p>
        <p className="mini muted">The store collects these sign-ups but sends no campaigns.</p>
        <a className="btn btn-light" href="/admin/customers/subscribers">Download list (CSV)</a>
      </div>
      <div className="admin-card">
        <h2>Buyers</h2>
        <TableFilters base="/admin/customers" keep={{ b2b }} fields={[
          { name: 'q', label: 'Search', value: q, placeholder: 'Search by email' },
          { name: 'state', label: 'State', value: state, options: [['all', 'All'], ...states.map((s): [string, string] => [s, s])] },
        ]} />
        <div className="admin-scroll">
          <table className="admin-table">
            <thead><tr><th>Email</th><th>Orders</th><th>Spent</th><th>Last order</th><th>State</th></tr></thead>
            <tbody>
              {result.rows.map((c) => (
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
        <Pager base="/admin/customers" params={{ q, state, b2b }} result={result} />
      </div>
    </>
  );
}
