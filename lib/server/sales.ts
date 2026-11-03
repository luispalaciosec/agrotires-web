import { getCustomer } from './customer';
import { applySale } from './operations';
import { dollarsToCents } from './rates-input';
import { newToken, sign } from './signed';
import { notifyPayLink, notifyTerms } from './email';
import { taxFor } from './checkout';
import type { B2bAccount, Order, Quote, ShippingAddress, Store } from './store';

const DAY = 86_400_000;
export const PAY_LINK_DAYS = 14;

export type QuoteLine = { description: string; quantity: number; unitPriceCents: number };

// Panel format, one per line: 2 | Rear tractor tire | 689.00
export function parseQuoteLines(text: string): { ok: true; lines: QuoteLine[] } | { ok: false; error: string } {
  const lines: QuoteLine[] = [];
  const rows = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const [i, row] of rows.entries()) {
    const parts = row.split('|').map((p) => p.trim());
    const quantity = Number(parts[0]);
    const unitPriceCents = parts[2] ? dollarsToCents(parts[2]) : NaN;
    if (parts.length !== 3 || !Number.isInteger(quantity) || quantity < 1 || quantity > 9999 || !parts[1] || Number.isNaN(unitPriceCents)) return { ok: false, error: `Line ${i + 1}: use Quantity | Description | Price, such as 2 | Rear tire | 689.00.` };
    lines.push({ description: parts[1].slice(0, 200), quantity, unitPriceCents });
  }
  if (!lines.length) return { ok: false, error: 'Add at least one line.' };
  return { ok: true, lines };
}

export async function createPayLink(store: Store, quote: Quote, input: { lines: QuoteLine[]; freightCents: number; address: Omit<ShippingAddress, 'country'> }, now = Date.now()) {
  const subtotalCents = input.lines.reduce((n, l) => n + l.unitPriceCents * l.quantity, 0);
  const taxCents = await taxFor(store, input.address.state, input.address.postalCode, subtotalCents, input.freightCents);
  const order = await store.createOrder({
    email: quote.email,
    items: input.lines.map((l, i) => ({ productId: '', sku: `QUOTE-${i + 1}`, name: l.description, unitPriceCents: l.unitPriceCents, quantity: l.quantity })),
    subtotalCents,
    shippingCents: input.freightCents,
    taxCents,
    totalCents: subtotalCents + input.freightCents + taxCents,
    currency: 'USD',
    locale: quote.locale,
    shippingAddress: { ...input.address, country: 'US' },
    quoteId: quote.id,
    payToken: newToken(),
    payExpiresAt: new Date(now + PAY_LINK_DAYS * DAY).toISOString(),
  });
  await store.updateQuoteStatus(quote.id, 'answered');
  await notifyPayLink(order);
  return order;
}

export const payLinkProblem = (order: Order, now = Date.now()): 'paid' | 'expired' | 'closed' | undefined => {
  if (order.status !== 'pending_payment') return order.status === 'paid' || order.status === 'fulfilled' ? 'paid' : 'closed';
  if (order.payExpiresAt && new Date(order.payExpiresAt).getTime() < now) return 'expired';
  return undefined;
};

export async function approvedAccount(store: Store): Promise<B2bAccount | undefined> {
  const customer = await getCustomer();
  if (!customer) return undefined;
  const account = await store.getB2bAccount(customer.id).catch(() => undefined);
  return account?.status === 'approved' ? account : undefined;
}

export async function placeOnTerms(store: Store, order: Order, account: B2bAccount, now = Date.now()) {
  await applySale(store, order.items, order.id.slice(0, 8).toUpperCase());
  const updated = await store.updateOrder(order.id, { status: 'on_terms', invoiceDueAt: new Date(now + account.termsDays * DAY).toISOString() });
  await notifyTerms(updated, account);
  return updated;
}

export const reviewLink = (site: string, locale: string | undefined, orderId: string, productId: string) => `${site}${locale === 'es' ? '/es' : ''}/review?order=${orderId}&product=${encodeURIComponent(productId)}&sig=${sign('review', orderId, productId)}`;

// Products bought in the same orders, from at least two real orders, so one purchase says nothing.
export function boughtTogether(orders: Order[], productId: string, limit = 4) {
  const counts = new Map<string, number>();
  for (const o of orders) {
    if (!['paid', 'fulfilled', 'on_terms'].includes(o.status) || !o.items.some((i) => i.productId === productId)) continue;
    for (const i of o.items) if (i.productId && i.productId !== productId) counts.set(i.productId, (counts.get(i.productId) ?? 0) + 1);
  }
  return [...counts].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([id]) => id);
}
