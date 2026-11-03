'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { categories, getCategory, money } from '@/lib/catalog';
import { ProductCard } from './product';
import { useStore } from './store';
import { EmptyState, Icon, PageHead } from './ui';

const MACHINES = ['Tractor', 'Combine', 'Sprayer', 'Planter', 'Implement'];

// Remounted (via key) whenever category or search changes, which resets the
// sort and refinement filters exactly like the prototype.
export function ShopView({ category, search }: { category: string; search: string }) {
  const router = useRouter();
  const { products } = useStore();
  const [sort, setSort] = useState('featured');
  const [machine, setMachine] = useState('');
  const [max, setMax] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const curr = getCategory(category);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const list = products.filter((p) =>
      (!category || p.cat === category) &&
      (!q || [p.name, p.sku, p.cat, p.desc, p.brand, p.tireSize, p.equipmentMake, p.equipmentModel, ...p.tags].join(' ').toLowerCase().includes(q)) &&
      (!machine || p.tags.includes(machine)) &&
      (max === 'all' || p.price <= Number(max)));
    if (sort === 'priceasc') list.sort((a, b) => a.price - b.price);
    else if (sort === 'pricedesc') list.sort((a, b) => b.price - a.price);
    else if (sort === 'az') list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [products, category, search, sort, machine, max]);

  const clear = () => {
    setMachine('');
    setMax('all');
    router.push('/shop');
  };

  return (
    <>
      <PageHead
        title={curr ? curr.name : search ? 'Search the catalog' : 'Shop all products'}
        desc={curr ? 'Explore this collection through our illustrative AGROTIRES catalog.' : 'Discover agricultural tires, parts, equipment, technology, and maintenance essentials.'}
        crumbs="Shop"
      />
      <main id="main-content" className="container">
        <div className="shop-layout">
          <aside className={`filter-panel ${filterOpen ? 'visible' : ''}`} aria-label="Product filters">
            <div className="filter-heading">
              <h3>Refine results</h3>
              <button type="button" className="text-link" style={{ border: 0, background: 'none' }} onClick={clear}>Clear all</button>
            </div>
            <div className="filter-block">
              <h4>CATEGORIES</h4>
              <label className="filter-check"><input type="radio" name="filter-category" checked={!category} onChange={() => router.push('/shop')} /> All products</label>
              {categories.filter((c) => c.id !== 'machine').map((c) => (
                <label className="filter-check" key={c.id}><input type="radio" name="filter-category" checked={category === c.id} onChange={() => router.push('/shop?category=' + encodeURIComponent(c.id))} /> {c.name}</label>
              ))}
            </div>
            <div className="filter-block">
              <h4>EQUIPMENT TYPE <small style={{ color: 'var(--muted)', fontWeight: 500 }}>(demo tags)</small></h4>
              <label className="filter-check"><input type="radio" name="filter-machine" checked={!machine} onChange={() => setMachine('')} /> All equipment</label>
              {MACHINES.map((m) => (
                <label className="filter-check" key={m}><input type="radio" name="filter-machine" checked={machine === m} onChange={() => setMachine(m)} /> {m}</label>
              ))}
            </div>
            <div className="filter-block">
              <h4>ILLUSTRATIVE PRICE</h4>
              <label className="filter-check"><input type="radio" name="filter-max" checked={max === 'all'} onChange={() => setMax('all')} /> Any price</label>
              {[100, 300, 700].map((n) => (
                <label className="filter-check" key={n}><input type="radio" name="filter-max" checked={max === String(n)} onChange={() => setMax(String(n))} /> Under {money(n)}</label>
              ))}
            </div>
            <div className="notice"><Icon name="info" size="sm" /> Products, prices and equipment tags are placeholders, not real stock or guaranteed fitment.</div>
          </aside>
          <div className="shop-main">
            <div className="shop-toolbar">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button className="btn btn-light btn-sm filter-mobile-btn" onClick={() => setFilterOpen(!filterOpen)}><Icon name="filter" size="sm" /> Filters</button>
                <p><strong>{filtered.length}</strong> demo {filtered.length === 1 ? 'product' : 'products'}{search ? ` matching “${search}”` : ''}</p>
              </div>
              <select className="select-input" style={{ height: 41 }} id="sort-products" aria-label="Sort products" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="featured">Featured</option>
                <option value="priceasc">Price: low to high</option>
                <option value="pricedesc">Price: high to low</option>
                <option value="az">Name: A to Z</option>
              </select>
            </div>
            {filtered.length ? (
              <div className="products-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,200px),1fr))' }}>
                {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            ) : <EmptyState title="No sample products found" body="Try another category, search term, or price filter." btn="Browse all" />}
          </div>
        </div>
      </main>
    </>
  );
}
