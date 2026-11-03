'use client';

import { trackEvent } from '@/lib/events';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, useRef } from 'react';
import { getCategories, getCategory, money } from '@/lib/catalog';
import { ProductCard } from './product';
import { searchProducts } from '@/lib/search';
import { useStore } from './store';
import { EmptyState, Icon, PageHead } from './ui';

const MACHINES = ['Tractor', 'Combine', 'Sprayer', 'Planter', 'Implement'];

// Reads the browser URL because the rewrite that serves English from the root drops the
// query from the router's cache key, so moving between /shop?category=... never refetches.
export function ShopFromUrl() {
  const params = useSearchParams();
  const { t, locale } = useStore();
  const category = params.get('category') || '';
  const search = params.get('search') || '';
  useEffect(() => {
    const curr = getCategory(category, locale);
    document.title = `${curr ? curr.name : search ? t.shop.titleSearch : t.meta.shopAll} | AGROTIRES`;
  }, [category, search, locale, t]);
  return <ShopView key={`${category}|${search}`} category={category} search={search} />;
}

// Remounted (via key) whenever category or search changes, which resets the
// sort and refinement filters exactly like the prototype.
function ShopView({ category, search }: { category: string; search: string }) {
  const router = useRouter();
  const { products, t, href, locale } = useStore();
  const [sort, setSort] = useState('featured');
  const [machine, setMachine] = useState('');
  const [max, setMax] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const curr = getCategory(category, locale);
  const s = t.shop;

  const filtered = useMemo(() => {
    const list = (search ? searchProducts(products, search) : products).filter((p) =>
      (!category || p.cat === category) &&
      (!machine || p.tags.includes(machine)) &&
      (max === 'all' || p.price <= Number(max)));
    if (sort === 'priceasc') list.sort((a, b) => a.price - b.price);
    else if (sort === 'pricedesc') list.sort((a, b) => b.price - a.price);
    else if (sort === 'az') list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [products, category, search, sort, machine, max]);

  const searched = useRef('');
  useEffect(() => {
    if (!search || searched.current === search) return;
    searched.current = search;
    trackEvent('search', { query: search, results: filtered.length, locale });
  }, [search, filtered.length, locale]);

  const clear = () => {
    setMachine('');
    setMax('all');
    router.push(href('/shop'));
  };

  return (
    <>
      <PageHead locale={locale} title={curr ? curr.name : search ? s.titleSearch : s.titleAll} desc={curr ? s.descCat : s.descAll} crumbs={s.crumb} />
      <main id="main-content" className="container">
        <div className="shop-layout">
          <aside className={`filter-panel ${filterOpen ? 'visible' : ''}`} aria-label={s.filters}>
            <div className="filter-heading">
              <h3>{s.refine}</h3>
              <button type="button" className="text-link" style={{ border: 0, background: 'none' }} onClick={clear}>{s.clear}</button>
            </div>
            <div className="filter-block">
              <h4>{s.categories}</h4>
              <label className="filter-check"><input type="radio" name="filter-category" checked={!category} onChange={() => router.push(href('/shop'))} /> {s.allProducts}</label>
              {getCategories(locale).filter((c) => c.id !== 'machine').map((c) => (
                <label className="filter-check" key={c.id}><input type="radio" name="filter-category" checked={category === c.id} onChange={() => router.push(href('/shop?category=' + encodeURIComponent(c.id)))} /> {c.name}</label>
              ))}
            </div>
            <div className="filter-block">
              <h4>{s.equipmentType} <small style={{ color: 'var(--muted)', fontWeight: 500 }}>{s.demoTags}</small></h4>
              <label className="filter-check"><input type="radio" name="filter-machine" checked={!machine} onChange={() => setMachine('')} /> {s.allEquipment}</label>
              {MACHINES.map((m) => (
                <label className="filter-check" key={m}><input type="radio" name="filter-machine" checked={machine === m} onChange={() => setMachine(m)} /> {s.machines[m]}</label>
              ))}
            </div>
            <div className="filter-block">
              <h4>{s.priceTitle}</h4>
              <label className="filter-check"><input type="radio" name="filter-max" checked={max === 'all'} onChange={() => setMax('all')} /> {s.anyPrice}</label>
              {[100, 300, 700].map((n) => (
                <label className="filter-check" key={n}><input type="radio" name="filter-max" checked={max === String(n)} onChange={() => setMax(String(n))} /> {s.under(money(n))}</label>
              ))}
            </div>
            <div className="notice"><Icon name="info" size="sm" /> {s.notice}</div>
          </aside>
          <div className="shop-main">
            <div className="shop-toolbar">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button className="btn btn-light btn-sm filter-mobile-btn" onClick={() => setFilterOpen(!filterOpen)}><Icon name="filter" size="sm" /> {s.filtersBtn}</button>
                <p><strong>{filtered.length}</strong> {s.count(filtered.length)}{search ? s.matching(search) : ''}</p>
              </div>
              <select className="select-input" style={{ height: 41 }} id="sort-products" aria-label={s.sortLabel} value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="featured">{s.featured}</option>
                <option value="priceasc">{s.priceAsc}</option>
                <option value="pricedesc">{s.priceDesc}</option>
                <option value="az">{s.az}</option>
              </select>
            </div>
            {filtered.length ? (
              <div className="products-grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,200px),1fr))' }}>
                {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            ) : <EmptyState locale={locale} title={s.emptyTitle} body={s.emptyBody} btn={s.emptyBtn} />}
          </div>
        </div>
      </main>
    </>
  );
}
