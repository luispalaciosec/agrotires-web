import { z } from 'zod';
import { LOCALES } from '@/lib/i18n';
import { isUsState } from '@/lib/tax';
import { quoteOrder } from '@/lib/server/checkout';
import { getCustomer } from '@/lib/server/customer';
import { clientIp, json, rateLimited, readJson, sameOrigin } from '@/lib/server/http';
import { createPayPalOrder, paymentsEnabled } from '@/lib/server/paypal';
import { CartError, cartSchema } from '@/lib/server/pricing';
import { getStore } from '@/lib/server/store';

const address = z.object({
  name: z.string().trim().min(1).max(120),
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).optional().transform((v) => v || undefined),
  city: z.string().trim().min(1).max(120),
  state: z.string().refine(isUsState),
  postalCode: z.string().trim().regex(/^\d{5}(-\d{4})?$/),
});
const schema = z.object({ email: z.string().trim().email().max(200), address, items: cartSchema, locale: z.enum(LOCALES).optional(), saveAddress: z.boolean().optional() });

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
    const { address: a } = parsed.data;
    const q = await quoteOrder(store, parsed.data.items, { state: a.state, zip: a.postalCode });
    // The account comes from the session, never from the request.
    const customer = await getCustomer();
    const order = await store.createOrder({ email: parsed.data.email, items: q.items, subtotalCents: q.subtotalCents, shippingCents: q.shippingCents, taxCents: q.taxCents, totalCents: q.totalCents, currency: 'USD', locale: parsed.data.locale, shippingAddress: { ...a, country: 'US' }, profileId: customer?.id });
    if (customer && parsed.data.saveAddress) await store.saveAddress(customer.id, { recipient: a.name, line1: a.line1, line2: a.line2, city: a.city, state: a.state, postalCode: a.postalCode }).catch((e) => console.error('Could not save the address', e));
    const paypalOrderId = await createPayPalOrder(order);
    await store.updateOrder(order.id, { paypalOrderId });
    return json({ orderId: order.id, paypalOrderId }, 201);
  } catch (e) {
    if (e instanceof CartError) return json({ error: e.message, code: e.code }, 400);
    console.error('Checkout failed', e);
    return json({ error: 'Could not start payment' }, 502);
  }
}
