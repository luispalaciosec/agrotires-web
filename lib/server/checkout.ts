import { taxCents } from '../tax';
import { CartError, priceCart, type CartInput } from './pricing';
import type { ShippingZone, Store, StoredProduct } from './store';

// Weight-based rate for the delivery state. A zone must cover the state, or the store does not ship there.
export function shippingCents(lines: { product: StoredProduct; quantity: number }[], subtotalCents: number, state: string, zones: ShippingZone[]) {
  const active = zones.filter((z) => z.active);
  // Only while setting up: live payments refuse this in quoteOrder.
  if (!zones.length) return 0;
  const zone = active.find((z) => z.states.includes(state));
  if (!zone) return undefined;
  const parcels = lines.filter((l) => l.product.shippingClass !== 'pickup');
  if (!parcels.length) return 0;
  if (zone.freeOverCents !== undefined && subtotalCents >= zone.freeOverCents) return 0;
  const pounds = parcels.reduce((n, l) => n + (l.product.weightLb ?? 0) * l.quantity, 0);
  return zone.baseCents + Math.ceil(pounds) * zone.perLbCents;
}

// The single calculation behind the checkout summary and the amount charged.
export async function quoteOrder(store: Store, cart: CartInput, destination: { state: string; zip?: string }) {
  const catalog = await store.listProducts();
  const { items, subtotalCents } = priceCart(cart, catalog);
  const lines = items.map((i) => ({ product: catalog.find((p) => p.id === i.productId)!, quantity: i.quantity }));

  const zones = await store.listShippingZones();
  if (!zones.length && process.env.PAYPAL_ENV === 'live') throw new CartError('Shipping rates are not set up', 'no_shipping');
  const shipping = shippingCents(lines, subtotalCents, destination.state, zones);
  if (shipping === undefined) throw new CartError(`No shipping to ${destination.state}`, 'no_shipping');

  const zipRate = destination.zip ? await store.getTaxZipRate(destination.zip.slice(0, 5)) : undefined;
  const stateRate = (await store.listTaxRates()).find((r) => r.state === destination.state);
  const activeState = stateRate?.active ? stateRate : undefined;
  const rateBps = zipRate?.rateBps ?? activeState?.rateBps ?? 0;
  const taxable = subtotalCents + (stateRate?.taxShipping ? shipping : 0);
  const tax = taxCents(taxable, rateBps);
  return { items, subtotalCents, shippingCents: shipping, taxCents: tax, totalCents: subtotalCents + shipping + tax };
}
