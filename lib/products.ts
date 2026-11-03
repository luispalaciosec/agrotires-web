import { products as demoProducts, type Product } from './catalog';
import { getStore } from './server/store';

// Everything the storefront shows comes from here: only active, priced products.
// The list is sent to the browser for the cart, which works for a small catalog;
// a large one should fetch only the products in the cart.
export async function getPublicProducts(): Promise<Product[]> {
  const store = getStore();
  if (!store) return demoProducts;
  const list = await store.listProducts();
  return list.flatMap((p) => (p.active && p.price !== null
    ? [{ id: p.id, cat: p.cat, name: p.name, sku: p.sku, price: p.price, img: p.img, tags: p.tags, desc: p.desc, brand: p.brand, tireSize: p.tireSize, equipmentMake: p.equipmentMake, equipmentModel: p.equipmentModel }]
    : []));
}
