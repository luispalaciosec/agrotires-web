import { Icon } from '@/components/ui';
import { money } from '@/lib/catalog';
import { requireAdmin } from '@/lib/server/admin-auth';
import { lowStock } from '@/lib/server/operations';
import { getStore } from '@/lib/server/store';
import { receivePurchaseOrderAction } from '../actions';
import { AddWarehouseForm, PurchaseOrderForm, StockAdjustForm } from '../ops-forms';

export default async function InventoryPage() {
  await requireAdmin();
  const store = getStore();
  if (!store) return null;
  const [products, warehouses, levels, movements, settings, purchases] = await Promise.all([
    store.listProducts(),
    store.listWarehouses().catch(() => undefined),
    store.listStockLevels().catch(() => []),
    store.listMovements(40).catch(() => []),
    store.listInventorySettings().catch(() => []),
    store.listPurchaseOrders().catch(() => []),
  ]);
  const low = new Set(lowStock(products, settings).map((p) => p.id));
  const level = (productId: string, warehouseId: string) => levels.find((l) => l.productId === productId && l.warehouseId === warehouseId)?.quantity ?? 0;
  const nameOf = (id?: string) => warehouses?.find((w) => w.id === id)?.name ?? '—';
  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Inventory</h1>
          <p className="admin-sub">Every change is recorded. A sale takes stock from the warehouse holding the most.</p>
        </div>
      </div>
      {warehouses === undefined ? <div className="notice" style={{ marginBottom: 18 }}><Icon name="info" size="sm" /> Run the migration 0011_operations.sql in Supabase to use this section.</div> : null}
      <div className="kpis">
        <div className="kpi"><span>Warehouses</span><strong>{warehouses?.length ?? 0}</strong></div>
        <div className="kpi"><span>Low on stock</span><strong>{low.size}</strong></div>
        <div className="kpi"><span>Open supplier orders</span><strong>{purchases.filter((p) => p.status === 'open').length}</strong></div>
      </div>
      <section className="admin-card">
        <h2>Stock</h2>
        <div className="admin-scroll">
          <table className="admin-table">
            <thead><tr><th>Product</th><th>SKU</th><th>Total</th>{warehouses?.map((w) => <th key={w.id}>{w.name}</th>)}<th>Alert at</th><th>Supplier</th></tr></thead>
            <tbody>
              {products.map((p) => {
                const s = settings.find((x) => x.productId === p.id);
                return (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.sku}</td>
                    <td>{p.stockQty ?? 'Not tracked'} {low.has(p.id) ? <span className="admin-pill warn">Low</span> : null}</td>
                    {warehouses?.map((w) => <td key={w.id}>{level(p.id, w.id)}</td>)}
                    <td>{s?.reorderPoint ?? 'Default'}</td>
                    <td>{s?.supplier ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <div className="admin-grid two">
        <section className="admin-card">
          <h2>Adjust stock</h2>
          <StockAdjustForm products={products.map((p) => ({ id: p.id, label: `${p.name} (${p.sku})` }))} warehouses={warehouses ?? []} />
        </section>
        <section className="admin-card">
          <h2>Warehouses</h2>
          <ul className="plain-list">{warehouses?.map((w) => <li key={w.id}>{w.name}</li>)}</ul>
          <AddWarehouseForm />
        </section>
        <section className="admin-card">
          <h2>New supplier order</h2>
          <PurchaseOrderForm warehouses={warehouses ?? []} />
        </section>
        <section className="admin-card">
          <h2>Supplier orders</h2>
          <div className="admin-scroll">
            <table className="admin-table">
              <thead><tr><th>Order</th><th>Supplier</th><th>Items</th><th>Cost</th><th>Status</th><th /></tr></thead>
              <tbody>
                {purchases.map((po) => (
                  <tr key={po.id}>
                    <td>{po.id.slice(0, 8).toUpperCase()}</td>
                    <td>{po.supplier}</td>
                    <td>{po.items.map((i) => `${i.quantity} x ${i.sku}`).join(', ')}</td>
                    <td>{money(po.items.reduce((n, i) => n + i.quantity * i.unitCostCents, 0) / 100)}</td>
                    <td><span className={`admin-pill ${po.status === 'open' ? 'warn' : 'off'}`}>{po.status}</span></td>
                    <td>{po.status === 'open' ? <form action={receivePurchaseOrderAction.bind(null, po.id)}><button className="btn btn-light">Receive</button></form> : null}</td>
                  </tr>
                ))}
                {purchases.length ? null : <tr><td colSpan={6} className="muted">No supplier orders yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <section className="admin-card" style={{ marginTop: 18 }}>
        <h2>Recent movements</h2>
        <div className="admin-scroll">
          <table className="admin-table">
            <thead><tr><th>When</th><th>Product</th><th>Change</th><th>Warehouse</th><th>Why</th><th>By</th></tr></thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id}>
                  <td>{new Date(m.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td>{m.productId}</td>
                  <td>{m.delta > 0 ? `+${m.delta}` : m.delta}</td>
                  <td>{nameOf(m.warehouseId)}</td>
                  <td>{m.reason.replace('_', ' ')}{m.note ? ` · ${m.note}` : ''}</td>
                  <td>{m.actor ?? 'Store'}</td>
                </tr>
              ))}
              {movements.length ? null : <tr><td colSpan={6} className="muted">No movements yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
