import Link from 'next/link';
import { categories, getCategory, money } from '@/lib/catalog';
import { requireAdmin } from '@/lib/server/admin-auth';
import { getStore } from '@/lib/server/store';
import { DeleteProductButton } from '../forms';
import { paginate, Pager, TableFilters } from '../table-tools';

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; cat?: string; status?: string; stock?: string; missing?: string; page?: string }> }) {
  await requireAdmin();
  const store = getStore();
  if (!store) return null;
  const { q = '', cat = 'all', status = 'all', stock = 'all', missing = 'all', page } = await searchParams;
  const term = q.trim().toLowerCase();
  const list = (await store.listProducts())
    .filter((p) => !term || [p.name, p.nameEs, p.sku, p.brand, p.tireSize].join(' ').toLowerCase().includes(term))
    .filter((p) => cat === 'all' || p.cat === cat)
    .filter((p) => status === 'all' || (status === 'visible') === p.active)
    .filter((p) => stock === 'all' || (stock === 'out' ? p.stockQty === 0 : stock === 'in' ? (p.stockQty ?? 0) > 0 : p.stockQty === null))
    .filter((p) => missing === 'all' || (missing === 'price' ? p.price === null : missing === 'spanish' ? !p.nameEs : missing === 'description' ? !p.desc : !p.weightLb));
  const filtered = Boolean(term) || [cat, status, stock, missing].some((v) => v !== 'all');
  const result = paginate(list, page);
  const params = { q, cat, status, stock, missing };
  return (
    <>
      <div className="admin-head">
        <h1>Products</h1>
        <div className="admin-actions" style={{ marginTop: 0 }}>
          <Link className="btn btn-light" href="/admin/products/import">Import CSV</Link>
          <Link className="btn" href="/admin/products/new">Add product</Link>
        </div>
      </div>
      {list.length || filtered ? null : <div className="notice" style={{ marginBottom: 18 }}>No products yet. The store shows its sample catalog until you add the first visible product, which replaces it.</div>}
      <div className="admin-card">
        <TableFilters base="/admin/products" fields={[
          { name: 'q', label: 'Search', value: q, placeholder: 'Search by name, SKU, brand or size' },
          { name: 'cat', label: 'Category', value: cat, options: [['all', 'All'], ...categories.filter((c) => c.id !== 'machine').map((c): [string, string] => [c.id, c.name])] },
          { name: 'status', label: 'Status', value: status, options: [['all', 'All'], ['visible', 'Visible'], ['hidden', 'Hidden']] },
          { name: 'stock', label: 'Stock', value: stock, options: [['all', 'All'], ['in', 'In stock'], ['out', 'Out of stock'], ['untracked', 'Not tracked']] },
          { name: 'missing', label: 'Missing', value: missing, options: [['all', 'Nothing in particular'], ['price', 'No price'], ['spanish', 'No Spanish'], ['description', 'No description'], ['weight', 'No weight']] },
        ]} />
        <div className="admin-scroll">
          <table className="admin-table">
            <thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {result.rows.map((p) => (
                <tr key={p.id}>
                  <td><Link href={`/admin/products/${encodeURIComponent(p.id)}`}>{p.name}</Link>{p.nameEs ? null : <> <span className="admin-pill warn">No Spanish</span></>}</td>
                  <td>{p.sku}</td>
                  <td>{getCategory(p.cat)?.name}</td>
                  <td>{p.price === null ? <span className="admin-pill warn">No price</span> : money(p.price)}</td>
                  <td>{p.stockQty === null ? <span className="muted">Not tracked</span> : p.stockQty === 0 ? <span className="admin-pill bad">Out of stock</span> : p.stockQty}</td>
                  <td><span className={`admin-pill ${p.active ? '' : 'off'}`}>{p.active ? 'Visible' : 'Hidden'}</span></td>
                  <td><div className="admin-row-actions"><Link className="btn btn-light" href={`/admin/products/${encodeURIComponent(p.id)}`}>Edit</Link><DeleteProductButton id={p.id} name={p.name} label="Delete" /></div></td>
                </tr>
              ))}
              {list.length ? null : <tr><td colSpan={7} className="muted">No products found.</td></tr>}
            </tbody>
          </table>
        </div>
        <Pager base="/admin/products" params={params} result={result} />
      </div>
    </>
  );
}
