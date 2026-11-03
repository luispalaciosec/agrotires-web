import { LOW_STOCK } from './analytics';
import { notifyLowStock, notifyReturnRequested, notifyReturnUpdate, publicSite } from './email';
import { sign } from './signed';
import type { InventorySetting, Order, OrderItem, PurchaseOrder, ReturnItem, ReturnRequest, ReturnStatus, Store, StoredProduct } from './store';

// Keeps selling even if the inventory migration has not run: the total still goes down.
export async function applySale(store: Store, items: OrderItem[], reference: string) {
  try {
    await store.recordSale(items, reference);
  } catch (e) {
    console.error('Could not record the sale in inventory', e);
    await store.reduceStock(items);
  }
}

export const lowStock = (products: StoredProduct[], settings: InventorySetting[]) => products.filter((p) => {
  if (!p.active || p.stockQty === null) return false;
  return p.stockQty <= (settings.find((s) => s.productId === p.id)?.reorderPoint ?? LOW_STOCK);
});

// Panel format, one per line: SKU | Quantity | Unit cost
export function parsePurchaseLines(text: string, products: StoredProduct[]): { ok: true; items: PurchaseOrder['items'] } | { ok: false; error: string } {
  const items: PurchaseOrder['items'] = [];
  const rows = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const [i, row] of rows.entries()) {
    const [sku, qty, cost] = row.split('|').map((p) => p.trim());
    const product = products.find((p) => p.sku.toLowerCase() === sku?.toLowerCase());
    const quantity = Number(qty);
    const unitCostCents = /^\d{1,7}(\.\d{1,2})?$/.test(cost ?? '') ? Math.round(Number(cost) * 100) : NaN;
    if (!product) return { ok: false, error: `Line ${i + 1}: no product has the SKU ${sku || '(empty)'}.` };
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100000 || Number.isNaN(unitCostCents)) return { ok: false, error: `Line ${i + 1}: use SKU | Quantity | Unit cost, such as AG-1 | 20 | 410.00.` };
    items.push({ productId: product.id, sku: product.sku, name: product.name, quantity, unitCostCents });
  }
  if (!items.length) return { ok: false, error: 'Add at least one line.' };
  return { ok: true, items };
}

// The store marks it received first, so receiving twice cannot add the stock twice.
export async function receivePurchaseOrder(store: Store, id: string, actor: string) {
  const po = await store.markPurchaseOrderReceived(id);
  if (!po) return false;
  for (const item of po.items) await store.adjustStock({ productId: item.productId, warehouseId: po.warehouseId, delta: item.quantity, reason: 'purchase_order', note: `PO ${id.slice(0, 8).toUpperCase()} from ${po.supplier}`, actor });
  return true;
}

const OPEN: ReturnStatus[] = ['requested', 'approved', 'received'];
export const RETURN_FLOW: Partial<Record<ReturnStatus, ReturnStatus[]>> = { requested: ['approved', 'rejected'], approved: ['received', 'rejected'], received: ['closed'] };

export const returnLink = (locale: string | undefined, orderId: string) => `${publicSite()}${locale === 'es' ? '/es' : ''}/returns?order=${orderId}&sig=${sign('return', orderId)}`;

export const returnable = (order: Order) => ['paid', 'fulfilled', 'on_terms'].includes(order.status);

export async function requestReturn(store: Store, order: Order, input: { items: ReturnItem[]; reason: string; note?: string }) {
  if (!returnable(order)) return { ok: false as const, error: 'closed' as const };
  const open = (await store.listReturnsForOrder(order.id)).some((r) => OPEN.includes(r.status));
  if (open) return { ok: false as const, error: 'open' as const };
  for (const item of input.items) {
    const bought = order.items.find((i) => i.sku === item.sku);
    if (!bought || item.quantity < 1 || item.quantity > bought.quantity) return { ok: false as const, error: 'invalid' as const };
  }
  if (!input.items.length) return { ok: false as const, error: 'invalid' as const };
  const created = await store.createReturn({ orderId: order.id, ...input });
  await notifyReturnRequested(order, created);
  return { ok: true as const, request: created };
}

export async function changeReturnStatus(store: Store, request: ReturnRequest, order: Order, status: ReturnStatus, teamNote?: string) {
  if (!RETURN_FLOW[request.status]?.includes(status)) return false;
  await store.updateReturn(request.id, status, teamNote);
  if (status === 'approved' || status === 'rejected' || status === 'received') await notifyReturnUpdate(order, status, teamNote);
  return true;
}

// The daily job: one stock alert a day at most, and old analytics removed.
export async function runDailyChecks(store: Store, now = Date.now()) {
  const [products, settings] = await Promise.all([store.listProducts(), store.listInventorySettings().catch(() => [])]);
  const low = lowStock(products, settings);
  let alerted = false;
  if (low.length && (await store.claimReminder(`low-stock:${new Date(now).toISOString().slice(0, 10)}`))) {
    await notifyLowStock(low);
    alerted = true;
  }
  await store.purgeEvents(new Date(now - 180 * 86_400_000).toISOString()).catch((e) => console.error('Could not purge analytics', e));
  return { lowStock: low.length, alerted };
}

// For the Zoho Books invoice import, whose Map Fields step assigns each column. One row per line;
// rows of an invoice share its number. Tax goes as its own line so totals match what was charged.
export function zohoBooksInvoices(orders: Order[], from: string, to: string) {
  const header = ['Invoice Number', 'Invoice Date', 'Due Date', 'Invoice Status', 'Customer Name', 'Email', 'Notes', 'Item Name', 'Item Desc', 'Quantity', 'Item Price', 'Item Total'];
  const usd = (cents: number) => (cents / 100).toFixed(2);
  const rows: (string | number)[][] = [header];
  const sold = orders.filter((o) => ['paid', 'fulfilled', 'refunded', 'on_terms'].includes(o.status) && o.createdAt.slice(0, 10) >= from && o.createdAt.slice(0, 10) <= to);
  for (const o of sold.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    const date = o.createdAt.slice(0, 10);
    const unpaid = Boolean(o.invoiceDueAt && !o.invoicePaidAt);
    const base = [o.id.slice(0, 8).toUpperCase(), date, o.invoiceDueAt?.slice(0, 10) ?? date, unpaid ? 'Sent' : 'Paid', o.shippingAddress?.name || o.email, o.email, o.paypalCaptureId ? `PayPal ${o.paypalCaptureId}` : ''];
    for (const i of o.items) rows.push([...base, i.sku, i.name, i.quantity, usd(i.unitPriceCents), usd(i.unitPriceCents * i.quantity)]);
    if (o.shippingCents) rows.push([...base, 'Shipping', 'Shipping', 1, usd(o.shippingCents), usd(o.shippingCents)]);
    if (o.taxCents) rows.push([...base, 'Sales tax', o.shippingAddress?.state ?? '', 1, usd(o.taxCents), usd(o.taxCents)]);
  }
  return rows;
}

export const refundRows = (orders: Order[], from: string, to: string) => [
  ['order', 'order_date', 'customer', 'order_total_usd', 'refunded_usd', 'paypal_capture'],
  ...orders.filter((o) => (o.refundedCents ?? 0) > 0 && o.createdAt.slice(0, 10) >= from && o.createdAt.slice(0, 10) <= to).map((o) => [o.id.slice(0, 8).toUpperCase(), o.createdAt.slice(0, 10), o.email, (o.totalCents / 100).toFixed(2), ((o.refundedCents ?? 0) / 100).toFixed(2), o.paypalCaptureId ?? '']),
];

export function accountingSummary(orders: Order[], from: string, to: string) {
  const inRange = orders.filter((o) => ['paid', 'fulfilled', 'refunded', 'on_terms'].includes(o.status) && o.createdAt.slice(0, 10) >= from && o.createdAt.slice(0, 10) <= to);
  const sum = (f: (o: Order) => number) => inRange.reduce((n, o) => n + f(o), 0);
  return {
    orders: inRange.length,
    salesCents: sum((o) => o.subtotalCents),
    shippingCents: sum((o) => o.shippingCents),
    taxCents: sum((o) => o.taxCents),
    refundedCents: sum((o) => o.refundedCents ?? 0),
    // Across all time: an old unpaid invoice still counts today.
    receivableCents: orders.filter((o) => o.invoiceDueAt && !o.invoicePaidAt).reduce((n, o) => n + o.totalCents, 0),
  };
}

// Sessions at each step, so one person viewing ten products counts once.
export function conversionReport(events: { name: string; session: string; productSlug?: string; query?: string; results?: number }[]) {
  const sessions = (name: string) => new Set(events.filter((e) => e.name === name).map((e) => e.session)).size;
  const visitors = new Set(events.map((e) => e.session)).size;
  const steps = [['Viewed a product', 'view_product'], ['Added to cart', 'add_to_cart'], ['Started checkout', 'begin_checkout'], ['Purchased', 'purchase']].map(([label, name]) => ({ label, count: sessions(name) }));
  const top = (list: string[], limit = 10) => [...list.reduce((m, v) => m.set(v, (m.get(v) ?? 0) + 1), new Map<string, number>())].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([value, count]) => ({ value, count }));
  const searches = events.filter((e) => e.name === 'search' && e.query);
  return {
    visitors,
    steps,
    conversion: visitors ? sessions('purchase') / visitors : 0,
    topSearches: top(searches.map((e) => e.query!)),
    noResults: top(searches.filter((e) => e.results === 0).map((e) => e.query!)),
    topProducts: top(events.filter((e) => e.name === 'view_product' && e.productSlug).map((e) => e.productSlug!)),
  };
}

// A search box can receive an email or phone number by mistake; those are never kept.
export const cleanQuery = (q: string | undefined) => {
  const text = q?.trim().toLowerCase().slice(0, 80);
  if (!text || text.includes('@') || /\d{7,}/.test(text.replace(/[\s()-]/g, ''))) return undefined;
  return text;
};
