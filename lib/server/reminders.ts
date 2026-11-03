import { notifyCommercial, orderRef, publicSite, type CommercialKey } from './email';
import { reviewLink } from './sales';
import { newToken } from './signed';
import type { Store } from './store';

const DAY = 86_400_000;

// Commercial email needs a way to opt out and the sender's postal address (CAN-SPAM),
// so nothing goes out until the business turns this on and provides the address.
export const remindersEnabled = () => process.env.REMINDERS_ENABLED === 'true' && Boolean(process.env.BUSINESS_POSTAL_ADDRESS?.trim());

export async function runReminders(store: Store, now = Date.now()) {
  const result = { carts: 0, reorders: 0, reviews: 0 };
  if (!remindersEnabled()) return result;
  const site = publicSite();
  const age = (iso: string) => (now - new Date(iso).getTime()) / DAY;
  const [orders, rules, shipments] = await Promise.all([store.listOrders(), store.listSalesRules(), store.listShipments()]);
  const sold = orders.filter((o) => ['paid', 'fulfilled', 'on_terms'].includes(o.status));
  const once = async (key: string, kind: CommercialKey, to: string, locale: string | undefined, vars: Record<string, string>) => {
    if (await store.isOptedOut(to)) return false;
    if (!(await store.claimReminder(key))) return false;
    await notifyCommercial(kind, to, locale, vars);
    return true;
  };

  // Started paying a day or more ago, and has not bought since.
  for (const o of orders) {
    if (o.status !== 'pending_payment' || o.quoteId || age(o.createdAt) < 1 || age(o.createdAt) > 3) continue;
    if (sold.some((s) => s.email.toLowerCase() === o.email.toLowerCase() && s.createdAt > o.createdAt)) continue;
    const token = o.payToken ?? newToken();
    if (!o.payToken) await store.updateOrder(o.id, { payToken: token, payExpiresAt: new Date(now + 7 * DAY).toISOString() });
    const sent = await once(`cart:${o.email.toLowerCase()}:${Math.floor(now / (7 * DAY))}`, 'cart_reminder', o.email, o.locale, { items: o.items.map((i) => `${i.quantity} x ${i.name}`).join('\n'), pay_url: `${site}${o.locale === 'es' ? '/es' : ''}/pay/${token}` });
    if (sent) result.carts += 1;
  }

  // Wear parts: the business sets after how many days a product usually needs replacing.
  for (const o of sold) {
    for (const item of o.items) {
      const days = rules.find((r) => r.productId === item.productId)?.reorderDays;
      if (!days || age(o.createdAt) < days || age(o.createdAt) > days + 7) continue;
      const later = sold.some((s) => s.createdAt > o.createdAt && s.email.toLowerCase() === o.email.toLowerCase() && s.items.some((i) => i.productId === item.productId));
      if (later) continue;
      const sent = await once(`reorder:${o.id}:${item.productId}`, 'reorder_reminder', o.email, o.locale, { product: item.name, product_url: `${site}${o.locale === 'es' ? '/es' : ''}/product/${encodeURIComponent(item.productId)}` });
      if (sent) result.reorders += 1;
    }
  }

  // Delivered a few days ago, so the buyer has had time to use the product.
  for (const s of shipments) {
    const delivered = s.events.find((e) => e.status === 'delivered');
    if (!delivered || age(delivered.occurredAt) < 5 || age(delivered.occurredAt) > 30) continue;
    const o = orders.find((x) => x.id === s.orderId);
    const items = o?.items.filter((i) => i.productId) ?? [];
    if (!o || !items.length) continue;
    const links = items.map((i) => `${i.name}: ${reviewLink(site, o.locale, o.id, i.productId)}`).join('\n');
    const sent = await once(`review:${o.id}`, 'review_request', o.email, o.locale, { order_ref: orderRef(o.id), review_links: links });
    if (sent) result.reviews += 1;
  }
  return result;
}
