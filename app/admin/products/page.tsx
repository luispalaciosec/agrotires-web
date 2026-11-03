import Link from 'next/link';
import { getCategory, money } from '@/lib/catalog';
import { requireAdmin } from '@/lib/server/admin-auth';
import { getStore } from '@/lib/server/store';

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const store = getStore();
  if (!store) return null;
  const { q = '' } = await searchParams;
  const term = q.trim().toLowerCase();
  const list = (await store.listProducts()).filter((p) => !term || [p.name, p.sku, p.brand, p.tireSize].join(' ').toLowerCase().includes(term));
  return (
    <>
      <div className="admin-head">
        <h1>Products</h1>
        <div className="admin-actions" style={{ marginTop: 0 }}>
          <Link className="btn btn-light" href="/admin/products/import">Import CSV</Link>
          <Link className="btn" href="/admin/products/new">Add product</Link>
        </div>
      </div>
      <div className="admin-card">
        <form style={{ marginBottom: 16 }}><input className="text-input" name="q" defaultValue={q} placeholder="Search by name, SKU, brand or size" aria-label="Search products" /></form>
        <div className="admin-scroll">
          <table className="admin-table">
            <thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th></tr></thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id}>
                  <td><Link href={`/admin/products/${encodeURIComponent(p.id)}`}>{p.name}</Link></td>
                  <td>{p.sku}</td>
                  <td>{getCategory(p.cat)?.name}</td>
                  <td>{p.price === null ? <span className="admin-pill warn">No price</span> : money(p.price)}</td>
                  <td>{p.stockQty === null ? <span className="muted">Not tracked</span> : p.stockQty === 0 ? <span className="admin-pill bad">Out of stock</span> : p.stockQty}</td>
                  <td><span className={`admin-pill ${p.active ? '' : 'off'}`}>{p.active ? 'Visible' : 'Hidden'}</span></td>
                </tr>
              ))}
              {list.length ? null : <tr><td colSpan={6} className="muted">No products found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
