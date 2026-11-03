import Link from 'next/link';
import { Icon } from '@/components/ui';
import { DEMO_CATALOG, money } from '@/lib/catalog';
import { requireAdmin } from '@/lib/server/admin-auth';
import { change, priorities, salesReport } from '@/lib/server/analytics';
import { emailEnabled } from '@/lib/server/email';
import { paymentsEnabled } from '@/lib/server/paypal';
import { getStore } from '@/lib/server/store';
import { SalesChart } from './charts';

const RANGES = [7, 30, 90];
const usd = (cents: number) => money(cents / 100);

function Delta({ now, before, days }: { now: number; before: number; days: number }) {
  const value = change(now, before);
  if (value === undefined) return <small className="kpi-delta muted">No earlier sales to compare</small>;
  const up = value >= 0;
  return <small className="kpi-delta">{up ? '▲' : '▼'} {Math.abs(Math.round(value * 100))}% vs previous {days} days</small>;
}

function RankedBars({ rows }: { rows: { label: string; detail?: string; cents: number }[] }) {
  const max = Math.max(...rows.map((r) => r.cents), 1);
  return (
    <ul className="ranked">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="ranked-text"><span>{r.label}{r.detail ? <small> · {r.detail}</small> : null}</span><strong>{usd(r.cents)}</strong></div>
          <div className="ranked-track"><span style={{ width: `${(r.cents / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await requireAdmin();
  const store = getStore();
  if (!store) return null;
  const { days: asked } = await searchParams;
  const days = RANGES.includes(Number(asked)) ? Number(asked) : 30;
  const [products, orders, quotes, shipments, rates] = await Promise.all([
    store.listProducts(),
    store.listOrders(),
    store.listQuotes(),
    store.listShipments().catch(() => []),
    store.listTaxRates().catch(() => []),
  ]);
  const report = salesReport(orders, days);
  const { current, previous } = report;
  const todo = priorities(orders, quotes, products, shipments);
  const testing = process.env.PAYPAL_ENV !== 'live';

  const readiness: [boolean, string, string][] = [
    [paymentsEnabled(), 'PayPal connected', 'Add the PayPal credentials in Vercel'],
    [emailEnabled(), 'Email connected', 'Add the mailbox app password in Vercel'],
    [rates.some((r) => r.active), 'Tax rates set', 'Enter the states where you collect tax'],
    [!DEMO_CATALOG, 'Real catalog live', 'Replace the sample catalog and demo notices'],
    [process.env.PAYPAL_ENV === 'live', 'Live payments', 'Switch only after sandbox tests and owner approval'],
    [process.env.NEXT_PUBLIC_SITE_INDEXABLE === 'true', 'Open to search engines', 'Turn on at launch'],
  ];
  const ready = readiness.filter(([done]) => done).length;

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Dashboard</h1>
          {testing ? <p className="admin-sub"><Icon name="info" size="xs" /> Test mode: any order shown here comes from PayPal sandbox, not real sales.</p> : null}
        </div>
        <div className="admin-range" role="group" aria-label="Period">
          {RANGES.map((d) => <Link key={d} href={`/admin?days=${d}`} className={d === days ? 'current' : undefined} aria-current={d === days ? 'true' : undefined}>{d} days</Link>)}
        </div>
      </div>

      {todo.length ? (
        <section className="admin-todo" aria-label="Needs attention">
          {todo.map((t) => <Link key={t.label} href={t.href} className={`todo-item ${t.tone}`}><strong>{t.count}</strong> {t.label} <Icon name="arrow" size="xs" /></Link>)}
        </section>
      ) : null}

      <div className="kpis">
        <div className="kpi kpi-main"><span>Collected, after refunds</span><strong>{usd(current.netCents)}</strong><Delta now={current.netCents} before={previous.netCents} days={days} /></div>
        <div className="kpi"><span>Orders</span><strong>{current.orders}</strong><Delta now={current.orders} before={previous.orders} days={days} /></div>
        <div className="kpi"><span>Average order</span><strong>{usd(current.averageCents)}</strong><Delta now={current.averageCents} before={previous.averageCents} days={days} /></div>
        <div className="kpi"><span>Refunded</span><strong>{usd(current.refundedCents)}</strong><small className="kpi-delta muted">Sales tax collected: {usd(current.taxCents)}</small></div>
      </div>

      <div className="admin-grid">
        <section className="admin-card span-2">
          <h2>Daily sales</h2>
          {current.orders ? <SalesChart daily={report.daily} /> : <p className="muted admin-empty">No sales in the last {days} days. The chart fills in with the first paid order.</p>}
        </section>
        <section className="admin-card">
          <h2>Launch readiness <small className="muted">{ready} of {readiness.length}</small></h2>
          <ul className="readiness">
            {readiness.map(([done, label, next]) => (
              <li key={label} className={done ? 'done' : ''}>
                <Icon name={done ? 'check' : 'clock'} size="sm" />
                <span><strong>{label}</strong>{done ? null : <small>{next}</small>}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="admin-card">
          <h2>Top products</h2>
          {report.topProducts.length ? <RankedBars rows={report.topProducts.map((p) => ({ label: p.name, detail: `${p.units} sold`, cents: p.cents }))} /> : <p className="muted admin-empty">No sales yet.</p>}
        </section>
        <section className="admin-card">
          <h2>Top states</h2>
          {report.topStates.length ? <RankedBars rows={report.topStates.map((s) => ({ label: s.state, cents: s.cents }))} /> : <p className="muted admin-empty">No sales yet.</p>}
        </section>
        <section className="admin-card">
          <h2>Store at a glance</h2>
          <ul className="glance">
            <li><Link href="/admin/products"><strong>{products.filter((p) => p.active).length}</strong> visible products</Link></li>
            <li><Link href="/admin/shipments"><strong>{shipments.filter((s) => s.status !== 'delivered').length}</strong> shipments on the way</Link></li>
            <li><Link href="/admin/quotes"><strong>{quotes.filter((q) => q.status === 'new' || q.status === 'in_progress').length}</strong> open quote requests</Link></li>
          </ul>
        </section>
      </div>
    </>
  );
}
