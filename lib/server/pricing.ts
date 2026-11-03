import { z } from 'zod';
import type { OrderItem, StoredProduct } from './store';

export const cartSchema = z.array(z.object({
  id: z.string().min(1).max(100),
  quantity: z.number().int().min(1).max(99),
})).min(1).max(50);

export class CartError extends Error {
  constructor(message: string, public code: 'unknown' | 'stock' | 'freight' | 'quantity') {
    super(message);
  }
}

// Prices always come from the catalog; the browser only says what and how many.
export function priceCart(cart: z.infer<typeof cartSchema>, catalog: StoredProduct[]): { items: OrderItem[]; subtotalCents: number } {
  const merged = new Map<string, number>();
  for (const line of cart) merged.set(line.id, (merged.get(line.id) || 0) + line.quantity);
  const items = [...merged].map(([id, quantity]): OrderItem => {
    const p = catalog.find((x) => x.id === id);
    if (!p || !p.active || p.price === null) throw new CartError(`Unknown product: ${id}`, 'unknown');
    // Freight has no real rates yet, so it goes through a quote instead of being charged as free.
    if (p.shippingClass === 'freight_quote') throw new CartError(`Needs a freight quote: ${p.name}`, 'freight');
    if (p.stockQty !== null && quantity > p.stockQty) throw new CartError(`Not enough stock: ${p.name}`, 'stock');
    if (quantity > 99) throw new CartError(`Quantity too high: ${id}`, 'quantity');
    return { productId: p.id, sku: p.sku, name: p.name, unitPriceCents: Math.round(p.price * 100), quantity };
  });
  return { items, subtotalCents: items.reduce((n, i) => n + i.unitPriceCents * i.quantity, 0) };
}

export const centsToValue = (cents: number) => (cents / 100).toFixed(2);
export const valueToCents = (value: string) => {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return NaN;
  const [whole, frac = ''] = value.split('.');
  return Number(whole) * 100 + Number(frac.padEnd(2, '0'));
};
