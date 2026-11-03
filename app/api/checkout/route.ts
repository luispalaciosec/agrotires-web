import { z } from 'zod';
import { LOCALES } from '@/lib/i18n';
import { isUsState, taxCents } from '@/lib/tax';
import { clientIp, json, rateLimited, readJson, sameOrigin } from '@/lib/server/http';
import { createPayPalOrder, paymentsEnabled } from '@/lib/server/paypal';
import { CartError, cartSchema, priceCart } from '@/lib/server/pricing';
import { getStore } from '@/lib/server/store';

const address = z.object({
  name: z.string().trim().min(1).max(120),
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).optional().transform((v) => v || undefined),
  city: z.string().trim().min(1).max(120),
  state: z.string().refine(isUsState),
  postalCode: z.string().trim().regex(/^\d{5}(-\d{4})?$/),
});
const schema = z.object({ email: z.string().trim().email().max(200), address, items: cartSchema, locale: z.enum(LOCALES).optional() });

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: 'Forbidden' }, 403);
  if (await rateLimited(`checkout:${clientIp(req)}`, 10)) return json({ error: 'Too many requests' }, 429);
  const store = getStore();
  if (!store || !paymentsEnabled()) return json({ error: 'Payments are not available yet' }, 503);

  const body = await readJson(req);
  if (!body.ok) return body.response;
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return json({ error: 'Invalid order' }, 400);

  try {
    const { items, subtotalCents } = priceCart(parsed.data.items, await store.listProducts());
    const rate = (await store.listTaxRates()).find((r) => r.state === parsed.data.address.state && r.active);
    const tax = taxCents(subtotalCents, rate?.rateBps ?? 0);
    // Shipping stays at zero until real rules exist; PAYPAL_ENV=live is blocked meanwhile by the demo catalog.
    const order = await store.createOrder({ email: parsed.data.email, items, subtotalCents, shippingCents: 0, taxCents: tax, totalCents: subtotalCents + tax, currency: 'USD', locale: parsed.data.locale, shippingAddress: { ...parsed.data.address, country: 'US' } });
    const paypalOrderId = await createPayPalOrder(order);
    await store.updateOrder(order.id, { paypalOrderId });
    return json({ orderId: order.id, paypalOrderId }, 201);
  } catch (e) {
    if (e instanceof CartError) return json({ error: e.message, code: e.code }, 400);
    console.error('Checkout failed', e);
    return json({ error: 'Could not start payment' }, 502);
  }
}
