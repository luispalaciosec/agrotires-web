import { requireFullAdmin } from '@/lib/server/admin-auth';
import { isCatalogMode } from '@/lib/server/store-mode';
import { StoreModeForm } from '../tools-forms';

export default async function StoreModePage() {
  await requireFullAdmin();
  const catalog = await isCatalogMode();
  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Store mode</h1>
          <p className="admin-sub">Choose whether the website only shows products or also sells them.</p>
        </div>
      </div>
      <section className="admin-card">
        <h2>{catalog ? 'Catalog mode is on' : 'Online store is on'}</h2>
        <ul className="plain-list" style={{ fontSize: 13, lineHeight: 1.7 }}>
          <li>Catalog: products, categories, guides, search and the quote form. No prices, cart, checkout, customer accounts, favorites, order tracking or returns.</li>
          <li>Online store: everything, including prices and payments. Turn it on only when PayPal, shipping, taxes and the real catalog are ready.</li>
        </ul>
        <StoreModeForm catalog={catalog} />
      </section>
    </>
  );
}
