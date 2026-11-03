import Link from 'next/link';
import { Icon } from '@/components/ui';
import { DEMO_CATALOG, money } from '@/lib/catalog';
import { requireAdmin } from '@/lib/server/admin-auth';
import { change, orderRoute, priorities, salesReport } from '@/lib/server/analytics';
import { emailEnabled } from '@/lib/server/email';
import { paymentsEnabled } from '@/lib/server/paypal';
import { getStore } from '@/lib/server/store';
import { SalesChart } from './charts';

const RANGES = [7, 30, 90];
const usd = (cents: number) => money(cents / 100);

function Delta({ now, before, days }: { now: number; before: number; days: number }) {
  const value = change(now, before);
  if (value === undefined) return <small className="kpi-delta muted">Nothing to compare yet</small>;
  return <small className="kpi-delta">{value >= 0 ? '▲' : '▼'} {Math.abs(Math.round(value * 100))}% vs previous {days}d</small>;
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

function RouteNode({ icon, label, count, href }: { icon: string; label: string; count: number; href: string }) {
  return (
    <Link className="route-node" href={href}>
      <strong><Icon name={icon} size="xs" /> {label}</strong>
      <span><b>{count}</b> {count === 1 ? 'order' : 'orders'}</span>
    </Link>
  );
}

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await requireAdmin();
  const store = getStore();
  if (!store) return null;
  const { days: asked } = await searchParams;
  const days = RANGES.includes(Number(asked)) ? Number(asked) : 30;
  const [products, orders, quotes, shipments, rates, zones] = await Promise.all([
    store.listProducts(),
    store.listOrders(),
    store.listQuotes(),
    store.listShipments().catch(() => []),
    store.listTaxRates().catch(() => []),
    store.listShippingZones().catch(() => []),
  ]);
  const report = salesReport(orders, days);
  const { current, previous } = report;
  const route = orderRoute(orders, shipments, days);
  const todo = priorities(orders, quotes, products, shipments);
  const testing = process.env.PAYPAL_ENV !== 'live';
  const netChange = change(current.netCents, previous.netCents);

  const readiness: [boolean, string, string][] = [
    [paymentsEnabled(), 'PayPal connected', 'Add the PayPal credentials in Vercel'],
    [emailEnabled(), 'Email connected', 'Add the mailbox app password in Vercel'],
    [zones.some((z) => z.active), 'Shipping rates set', 'Add the zones you deliver to'],
    [rates.some((r) => r.active), 'Tax rates set', 'Enter the states where you collect tax'],
    [!DEMO_CATALOG, 'Real catalog live', 'Replace the sample catalog and demo notices'],
    [process.env.PAYPAL_ENV === 'live', 'Live payments', 'Only after sandbox tests and owner approval'],
    [process.env.NEXT_PUBLIC_SITE_INDEXABLE === 'true', 'Open to search engines', 'Turn on at launch'],
  ];

  return (
    <>
      <div className="admin-head">
        <h1>Dashboard</h1>
      </div>
      <div className="dash">
        <aside className="dash-panel">
          <div className="dash-intro">Sales in: <span className="dash-chip">{days} days</span></div>
          <p>{testing ? 'Test mode: orders here come from PayPal sandbox, not real sales.' : 'Money collected and what needs your attention.'}</p>

          <div className="kpi-main"><div><strong>{usd(current.netCents)}</strong><span>Collected, after refunds</span></div><Delta now={current.netCents} before={previous.netCents} days={days} /></div>
          <div className="kpi-main"><div><strong>{current.orders}</strong><span>Orders</span></div><Delta now={current.orders} before={previous.orders} days={days} /></div>
          <div className="kpi-main"><div><strong>{usd(current.averageCents)}</strong><span>Average order</span></div><Delta now={current.averageCents} before={previous.averageCents} days={days} /></div>
          <div className="kpi-main"><div><strong>{usd(current.refundedCents)}</strong><span>Refunded</span></div><small className="kpi-delta muted">Tax: {usd(current.taxCents)}</small></div>

          <section className="dash-block">
            <h2>Needs attention</h2>
            {todo.length ? (
              <ul className="todo-list">
                {todo.map((t) => <li key={t.label} className={t.tone}><Link className="todo-item" href={t.href}><span>{t.label}</span><strong>{t.count}</strong></Link></li>)}
              </ul>
            ) : <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>All clear for now.</p>}
          </section>

          <section className="dash-block">
            <h2>Launch readiness <small>{readiness.filter(([done]) => done).length} of {readiness.length}</small></h2>
            <ul className="readiness">
              {readiness.map(([done, label, next]) => (
                <li key={label} className={done ? 'done' : ''}>
                  <Icon name={done ? 'check' : 'clock'} size="sm" />
                  <span><strong>{label}</strong>{done ? null : <small>{next}</small>}</span>
                </li>
              ))}
            </ul>
          </section>

          <Link className="btn dash-cta" href="/admin/orders?status=paid">Go to orders to ship</Link>
        </aside>

        <div className="dash-main">
          <section>
            <div className="chart-head">
              <div>
                <div className="chart-title"><h2>Daily sales</h2><span className="chart-value">{usd(current.netCents)}</span></div>
                <div className="chart-sub">
                  {netChange === undefined ? null : <em>{netChange >= 0 ? '+' : '−'}{Math.abs(Math.round(netChange * 100))}%</em>}
                  <span>Past {days} days</span>
                </div>
              </div>
              <div className="admin-range" role="group" aria-label="Period">
                {RANGES.map((d) => <Link key={d} href={`/admin?days=${d}`} className={d === days ? 'current' : undefined} aria-current={d === days ? 'true' : undefined}>{d}D</Link>)}
              </div>
            </div>
            {current.orders ? <SalesChart daily={report.daily} /> : <p className="muted admin-empty">No sales in the last {days} days. The chart fills in with the first paid order.</p>}
          </section>

          <section className="route">
            <h2>Your order route</h2>
            <div className="route-head"><strong>{route.total} {route.total === 1 ? 'order' : 'orders'} sold</strong><strong>{route.delivered + route.pickup} completed</strong></div>
            <div className="route-map">
              <div className="route-lane">
                <span className="route-share">{route.shippedShare}%</span>
                <div className="route-nodes">
                  <span className="route-link" />
                  <RouteNode icon="box" label="To ship" count={route.toShip} href="/admin/orders?status=paid" />
                  <span className="route-link" />
                  <RouteNode icon="truck" label="On the way" count={route.onTheWay} href="/admin/shipments" />
                  <span className="route-link" />
                  <RouteNode icon="check" label="Delivered" count={route.delivered} href="/admin/shipments?status=delivered" />
                  <span className="route-link" />
                </div>
              </div>
              <div className="route-lane">
                <span className="route-share">{route.otherShare}%</span>
                <div className="route-nodes">
                  <span className="route-link" />
                  <RouteNode icon="user" label="Pickup" count={route.pickup} href="/admin/orders?status=fulfilled" />
                  <span className="route-link" />
                  <RouteNode icon="clock" label="Refunded" count={route.refunded} href="/admin/orders?status=refunded" />
                  <span className="route-link" />
                </div>
              </div>
            </div>
          </section>

          <div className="dash-more">
            <section className="admin-card">
              <h2>Top products</h2>
              {report.topProducts.length ? <RankedBars rows={report.topProducts.map((p) => ({ label: p.name, detail: `${p.units} sold`, cents: p.cents }))} /> : <p className="muted admin-empty">No sales yet.</p>}
            </section>
            <section className="admin-card">
              <h2>Top states</h2>
              {report.topStates.length ? <RankedBars rows={report.topStates.map((s) => ({ label: s.state, cents: s.cents }))} /> : <p className="muted admin-empty">No sales yet.</p>}
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
