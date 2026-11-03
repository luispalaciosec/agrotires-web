import { Icon } from '@/components/ui';
import { money } from '@/lib/catalog';
import { requireFullAdmin } from '@/lib/server/admin-auth';
import { accountingSummary } from '@/lib/server/operations';
import { getStore } from '@/lib/server/store';

const pad = (n: number) => String(n).padStart(2, '0');

export default async function AccountingPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  await requireFullAdmin();
  const now = new Date();
  const asked = await searchParams;
  const valid = (d?: string) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : undefined);
  const from = valid(asked.from) ?? `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-01`;
  const to = valid(asked.to) ?? now.toISOString().slice(0, 10);
  const s = accountingSummary((await getStore()?.listOrders()) ?? [], from, to);
  const usd = (c: number) => money(c / 100);
  const range = `from=${from}&to=${to}`;
  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Accounting</h1>
          <p className="admin-sub">Files to bring your sales into Zoho Books or send to your accountant.</p>
        </div>
      </div>
      <div className="notice" style={{ marginBottom: 18 }}>
        <Icon name="info" size="sm" /> In Zoho Books, import the invoice file and assign each column in the Map Fields step. Try it first with a few orders. Sales tax comes as its own line, so totals match what was charged; your accountant may prefer Zoho tax rates. A direct connection needs access to your Zoho Books organization.
      </div>
      <form className="admin-card accounting-range">
        <div className="field"><label className="field-label" htmlFor="from">From</label><input className="text-input" id="from" name="from" type="date" defaultValue={from} /></div>
        <div className="field"><label className="field-label" htmlFor="to">To</label><input className="text-input" id="to" name="to" type="date" defaultValue={to} /></div>
        <button className="btn btn-light">Apply</button>
      </form>
      <div className="kpis">
        <div className="kpi"><span>Orders</span><strong>{s.orders}</strong></div>
        <div className="kpi"><span>Product sales</span><strong>{usd(s.salesCents)}</strong></div>
        <div className="kpi"><span>Shipping charged</span><strong>{usd(s.shippingCents)}</strong></div>
        <div className="kpi"><span>Sales tax</span><strong>{usd(s.taxCents)}</strong></div>
        <div className="kpi"><span>Refunded</span><strong>{usd(s.refundedCents)}</strong></div>
        <div className="kpi"><span>Unpaid invoices, all dates</span><strong>{usd(s.receivableCents)}</strong></div>
      </div>
      <section className="admin-card">
        <h2>Download</h2>
        <div className="admin-actions">
          <a className="btn" href={`/admin/accounting/export?kind=invoices&${range}`}>Zoho Books invoices (CSV)</a>
          <a className="btn btn-light" href={`/admin/accounting/export?kind=refunds&${range}`}>Refunds (CSV)</a>
          <a className="btn btn-light" href={`/admin/taxes/export?year=${from.slice(0, 4)}`}>Sales tax by state (CSV)</a>
        </div>
      </section>
    </>
  );
}
