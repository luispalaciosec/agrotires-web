import type { Order, Quote, Shipment, StoredProduct } from './store';

const SOLD: Order['status'][] = ['paid', 'fulfilled', 'refunded'];
const DAY = 86_400_000;
export const isSale = (o: Order) => SOLD.includes(o.status);

const netCents = (o: Order) => o.totalCents - (o.refundedCents ?? 0);
const sum = <T>(list: T[], value: (x: T) => number) => list.reduce((n, x) => n + value(x), 0);
const dayKey = (time: number) => new Date(time).toISOString().slice(0, 10);

type Period = { netCents: number; orders: number; averageCents: number; refundedCents: number; taxCents: number };
const period = (orders: Order[]): Period => ({
  netCents: sum(orders, netCents),
  orders: orders.length,
  averageCents: orders.length ? Math.round(sum(orders, (o) => o.totalCents) / orders.length) : 0,
  refundedCents: sum(orders, (o) => o.refundedCents ?? 0),
  taxCents: sum(orders, (o) => o.taxCents),
});

// Change against the previous period of the same length; undefined when there is nothing to compare.
export const change = (now: number, before: number) => (before > 0 ? (now - before) / before : undefined);

// All days in UTC, so the same order never lands on two different days.
export function salesReport(allOrders: Order[], days: number, now = Date.now()) {
  const sold = allOrders.filter(isSale);
  const from = now - days * DAY;
  const inRange = sold.filter((o) => new Date(o.createdAt).getTime() > from && new Date(o.createdAt).getTime() <= now);
  const before = sold.filter((o) => new Date(o.createdAt).getTime() > from - days * DAY && new Date(o.createdAt).getTime() <= from);

  const byDay = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) byDay.set(dayKey(now - i * DAY), 0);
  for (const o of inRange) {
    const key = dayKey(new Date(o.createdAt).getTime());
    if (byDay.has(key)) byDay.set(key, byDay.get(key)! + netCents(o));
  }

  const products = new Map<string, { name: string; units: number; cents: number }>();
  for (const o of inRange) {
    for (const i of o.items) {
      const row = products.get(i.sku) ?? { name: i.name, units: 0, cents: 0 };
      row.units += i.quantity;
      row.cents += i.unitPriceCents * i.quantity;
      products.set(i.sku, row);
    }
  }

  const states = new Map<string, number>();
  for (const o of inRange) {
    const state = o.shippingAddress?.state || 'Unknown';
    states.set(state, (states.get(state) ?? 0) + netCents(o));
  }

  return {
    current: period(inRange),
    previous: period(before),
    daily: [...byDay].map(([date, cents]) => ({ date, cents })),
    topProducts: [...products].map(([sku, p]) => ({ sku, ...p })).sort((a, b) => b.cents - a.cents).slice(0, 5),
    topStates: [...states].map(([state, cents]) => ({ state, cents })).sort((a, b) => b.cents - a.cents).slice(0, 5),
  };
}

// What needs someone's attention right now, most urgent first.
export function priorities(orders: Order[], quotes: Quote[], products: StoredProduct[], shipments: Shipment[]) {
  const shipped = new Set(shipments.map((s) => s.orderId));
  const list: { count: number; label: string; href: string; tone: 'bad' | 'warn' | 'ok' }[] = [
    { count: orders.filter((o) => o.status === 'payment_failed' && o.paypalCaptureId).length, label: 'payments need review', href: '/admin/orders?status=payment_failed', tone: 'bad' },
    { count: shipments.filter((s) => s.status === 'exception').length, label: 'shipments with a problem', href: '/admin/shipments?status=exception', tone: 'bad' },
    { count: orders.filter((o) => o.status === 'paid' && !shipped.has(o.id)).length, label: 'orders to ship', href: '/admin/orders?status=paid', tone: 'warn' },
    { count: quotes.filter((q) => q.status === 'new').length, label: 'new quote requests', href: '/admin/quotes', tone: 'warn' },
    { count: products.filter((p) => p.active && p.stockQty === 0).length, label: 'visible products out of stock', href: '/admin/products', tone: 'warn' },
    { count: products.filter((p) => p.active && p.stockQty !== null && p.stockQty > 0 && p.stockQty <= LOW_STOCK).length, label: `products with ${LOW_STOCK} or fewer left`, href: '/admin/products', tone: 'ok' },
  ];
  return list.filter((p) => p.count > 0);
}
export const LOW_STOCK = 5;

// Customers come from orders, since the store has no accounts yet.
export function customerReport(orders: Order[]) {
  const map = new Map<string, { email: string; orders: number; spentCents: number; lastOrder: string; state?: string }>();
  for (const o of orders.filter(isSale)) {
    const key = o.email.toLowerCase();
    const row = map.get(key) ?? { email: o.email, orders: 0, spentCents: 0, lastOrder: o.createdAt };
    row.orders += 1;
    row.spentCents += netCents(o);
    if (o.createdAt >= row.lastOrder) {
      row.lastOrder = o.createdAt;
      row.state = o.shippingAddress?.state ?? row.state;
    }
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => b.spentCents - a.spentCents);
}

// Tax collected per state and month, for filing. Refunds are not split out of the tax amount.
export function taxReport(orders: Order[], year: number) {
  const rows = new Map<string, { state: string; month: string; orders: number; taxCents: number; salesCents: number }>();
  for (const o of orders.filter(isSale)) {
    if (!o.createdAt.startsWith(String(year))) continue;
    const state = o.shippingAddress?.state || 'Unknown';
    const month = o.createdAt.slice(0, 7);
    const key = `${month}-${state}`;
    const row = rows.get(key) ?? { state, month, orders: 0, taxCents: 0, salesCents: 0 };
    row.orders += 1;
    row.taxCents += o.taxCents;
    row.salesCents += o.subtotalCents;
    rows.set(key, row);
  }
  return [...rows.values()].sort((a, b) => b.month.localeCompare(a.month) || a.state.localeCompare(b.state));
}
