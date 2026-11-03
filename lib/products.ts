import { DEMO_CATALOG, localizeProduct, products as demoProducts, type Product } from './catalog';
import type { Locale } from './i18n';
import { getStore } from './server/store';

// Everything the storefront shows comes from here: only active, priced products, in the page's language.
// The list is sent to the browser for the cart, which works for a small catalog;
// a large one should fetch only the products in the cart.
export async function getPublicProducts(locale: Locale = 'en'): Promise<Product[]> {
  const demo = () => demoProducts.map((p) => localizeProduct(p, locale));
  const store = getStore();
  if (!store) return demo();
  try {
    const [list, fitment, rules] = await Promise.all([store.listProducts(), store.listFitment().catch(() => []), store.listSalesRules().catch(() => [])]);
    const visible = list.flatMap((p) => (p.active && p.price !== null
      ? [localizeProduct({ id: p.id, cat: p.cat, name: p.name, nameEs: p.nameEs, sku: p.sku, price: p.price, img: p.img, gallery: p.gallery, volume: rules.find((r) => r.productId === p.id)?.volume.map((v) => ({ minQty: v.minQty, price: v.priceCents / 100 })), fitment: p.compatibilityVerified ? fitment.filter((f) => f.productId === p.id).map(({ make, model, yearFrom, yearTo }) => ({ make, model, yearFrom, yearTo })) : undefined, tags: p.tags, desc: p.desc, descEs: p.descEs, brand: p.brand, tireSize: p.tireSize, equipmentMake: p.equipmentMake, equipmentModel: p.equipmentModel }, locale)]
      : []));
    // While testing, an empty database keeps the sample catalog so the store is never blank.
    return visible.length || !DEMO_CATALOG ? visible : demo();
  } catch (e) {
    console.error('Could not load products', e);
    if (DEMO_CATALOG) return demo();
    throw e;
  }
}
