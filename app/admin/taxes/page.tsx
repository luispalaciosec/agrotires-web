import { Icon } from '@/components/ui';
import { money } from '@/lib/catalog';
import { requireAdmin } from '@/lib/server/admin-auth';
import { isSale, taxReport } from '@/lib/server/analytics';
import { getStore } from '@/lib/server/store';
import { TaxForm } from '../tools-forms';

export default async function TaxesPage() {
  await requireAdmin();
  const store = getStore();
  if (!store) return null;
  const [rates, orders] = await Promise.all([store.listTaxRates().catch(() => undefined), store.listOrders()]);
  const year = new Date().getUTCFullYear();
  const report = taxReport(orders, year);
  const usd = (cents: number) => money(cents / 100);
  const month = new Date().toISOString().slice(0, 7);
  const thisYear = report.reduce((n, r) => n + r.taxCents, 0);
  const thisMonth = report.filter((r) => r.month === month).reduce((n, r) => n + r.taxCents, 0);
  const noTax = orders.filter((o) => isSale(o) && !o.taxCents && o.createdAt.startsWith(String(year))).length;

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Taxes</h1>
          <p className="admin-sub">The rate you enter here is charged at checkout, based on the delivery state.</p>
        </div>
        <a className="btn btn-light" href={`/admin/taxes/export?year=${year}`}>Export {year} CSV</a>
      </div>

      {rates === undefined ? <div className="notice"><Icon name="info" size="sm" /> Run the migration 0008_admin_tools.sql in Supabase to use this section.</div> : null}

      <div className="kpis">
        <div className="kpi"><span>Collected this month</span><strong>{usd(thisMonth)}</strong></div>
        <div className="kpi"><span>Collected in {year}</span><strong>{usd(thisYear)}</strong></div>
        <div className="kpi"><span>States with a rate</span><strong>{rates?.filter((r) => r.active).length ?? 0}</strong></div>
        <div className="kpi"><span>Sales without tax in {year}</span><strong>{noTax}</strong></div>
      </div>

      <div className="notice" style={{ marginBottom: 18 }}>
        <Icon name="info" size="sm" /> Have your accountant confirm where you must collect and at what rate. This applies one rate per state; many states add county and city taxes, and some products may be exempt. A state with no rate charges no tax.
      </div>

      <div className="admin-grid two">
        <section className="admin-card">
          <h2>Rates by state</h2>
          {rates ? <TaxForm rates={rates} /> : null}
        </section>
        <section className="admin-card">
          <h2>Collected by month and state</h2>
          <div className="admin-scroll">
            <table className="admin-table">
              <thead><tr><th>Month</th><th>State</th><th>Orders</th><th>Sales</th><th>Tax</th></tr></thead>
              <tbody>
                {report.map((r) => <tr key={`${r.month}-${r.state}`}><td>{r.month}</td><td>{r.state}</td><td>{r.orders}</td><td>{usd(r.salesCents)}</td><td>{usd(r.taxCents)}</td></tr>)}
                {report.length ? null : <tr><td colSpan={5} className="muted">No sales in {year} yet.</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="mini muted" style={{ marginTop: 12 }}>Amounts as charged. Partial refunds are not split out of the tax, so review refunded orders before filing.</p>
        </section>
      </div>
    </>
  );
}
