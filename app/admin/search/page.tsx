import Link from 'next/link';
import { money } from '@/lib/catalog';
import { requireAdmin } from '@/lib/server/admin-auth';
import { orderRef } from '@/lib/server/email';
import { getStore } from '@/lib/server/store';

const LIMIT = 10;

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const store = getStore();
  if (!store) return null;
  const { q = '' } = await searchParams;
  const term = q.trim().toLowerCase();
  const has = (...fields: (string | undefined)[]) => fields.some((f) => f?.toLowerCase().includes(term));
  const [orders, products, quotes, shipments] = term
    ? await Promise.all([store.listOrders(), store.listProducts(), store.listQuotes(), store.listShipments().catch(() => [])])
    : [[], [], [], []];
  const foundOrders = orders.filter((o) => has(orderRef(o.id), o.email, o.shippingAddress?.name, o.paypalCaptureId));
  const foundProducts = products.filter((p) => has(p.name, p.nameEs, p.sku, p.brand, p.tireSize));
  const foundQuotes = quotes.filter((r) => has(r.name, r.email, r.topic, r.product));
  const foundShipments = shipments.filter((s) => has(s.code, s.trackingNumber, s.carrier));
  const total = foundOrders.length + foundProducts.length + foundQuotes.length + foundShipments.length;

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Search</h1>
          <p className="admin-sub">{term ? `${total} ${total === 1 ? 'result' : 'results'} for “${q.trim()}”` : 'Type in the bar above to search orders, products, quotes and shipments.'}</p>
        </div>
      </div>

      {foundOrders.length ? (
        <section className="admin-card search-group">
          <h2>Orders <small className="muted">{foundOrders.length}</small></h2>
          <div className="admin-scroll"><table className="admin-table"><tbody>
            {foundOrders.slice(0, LIMIT).map((o) => <tr key={o.id}><td><Link href={`/admin/orders/${o.id}`}>{orderRef(o.id)}</Link></td><td>{o.email}</td><td>{money(o.totalCents / 100)}</td><td><span className="admin-pill">{o.status.replace('_', ' ')}</span></td></tr>)}
          </tbody></table></div>
        </section>
      ) : null}
      {foundProducts.length ? (
        <section className="admin-card search-group">
          <h2>Products <small className="muted">{foundProducts.length}</small></h2>
          <div className="admin-scroll"><table className="admin-table"><tbody>
            {foundProducts.slice(0, LIMIT).map((p) => <tr key={p.id}><td><Link href={`/admin/products/${encodeURIComponent(p.id)}`}>{p.name}</Link></td><td>{p.sku}</td><td>{p.price === null ? '—' : money(p.price)}</td><td><span className={`admin-pill ${p.active ? '' : 'off'}`}>{p.active ? 'Visible' : 'Hidden'}</span></td></tr>)}
          </tbody></table></div>
        </section>
      ) : null}
      {foundQuotes.length ? (
        <section className="admin-card search-group">
          <h2>Quote requests <small className="muted">{foundQuotes.length}</small></h2>
          <div className="admin-scroll"><table className="admin-table"><tbody>
            {foundQuotes.slice(0, LIMIT).map((r) => <tr key={r.id}><td><Link href={`/admin/quotes/${r.id}`}>{r.name}</Link></td><td>{r.email}</td><td>{r.topic}</td></tr>)}
          </tbody></table></div>
        </section>
      ) : null}
      {foundShipments.length ? (
        <section className="admin-card search-group">
          <h2>Shipments <small className="muted">{foundShipments.length}</small></h2>
          <div className="admin-scroll"><table className="admin-table"><tbody>
            {foundShipments.slice(0, LIMIT).map((s) => <tr key={s.id}><td><Link href={`/admin/orders/${s.orderId}`}>{orderRef(s.orderId)}</Link></td><td>{s.carrier}</td><td>{s.trackingNumber || '—'}</td></tr>)}
          </tbody></table></div>
        </section>
      ) : null}
    </>
  );
}
