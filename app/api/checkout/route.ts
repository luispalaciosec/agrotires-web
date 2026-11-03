import { z } from 'zod';
import { clientIp, json, rateLimited, readJson, sameOrigin } from '@/lib/server/http';
import { createPayPalOrder, paymentsEnabled } from '@/lib/server/paypal';
import { CartError, cartSchema, priceCart } from '@/lib/server/pricing';
import { getStore } from '@/lib/server/store';

const schema = z.object({ email: z.string().trim().email().max(200), items: cartSchema });

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: 'Forbidden' }, 403);
  if (rateLimited(`checkout:${clientIp(req)}`, 10)) return json({ error: 'Too many requests' }, 429);
  const store = getStore();
  if (!store || !paymentsEnabled()) return json({ error: 'Payments are not available yet' }, 503);

  const body = await readJson(req);
  if (!body.ok) return body.response;
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return json({ error: 'Invalid order' }, 400);

  try {
    const { items, subtotalCents } = priceCart(parsed.data.items, await store.listProducts());
    // Shipping and tax stay at zero until real rules exist; PAYPAL_ENV=live is blocked meanwhile by the demo catalog.
    const order = await store.createOrder({ email: parsed.data.email, items, subtotalCents, shippingCents: 0, taxCents: 0, totalCents: subtotalCents, currency: 'USD' });
    const paypalOrderId = await createPayPalOrder(order);
    await store.updateOrder(order.id, { paypalOrderId });
    return json({ orderId: order.id, paypalOrderId }, 201);
  } catch (e) {
    if (e instanceof CartError) return json({ error: e.message }, 400);
    console.error('Checkout failed', e);
    return json({ error: 'Could not start payment' }, 502);
  }
}
