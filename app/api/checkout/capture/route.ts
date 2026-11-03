import { z } from 'zod';
import { clientIp, json, rateLimited, readJson, sameOrigin } from '@/lib/server/http';
import { settleCapture } from '@/lib/server/orders';
import { capturePayPalOrder, paymentsEnabled } from '@/lib/server/paypal';
import { getStore } from '@/lib/server/store';

const schema = z.object({ paypalOrderId: z.string().regex(/^[A-Za-z0-9-]{1,64}$/) });

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: 'Forbidden' }, 403);
  if (rateLimited(`capture:${clientIp(req)}`, 10)) return json({ error: 'Too many requests' }, 429);
  const store = getStore();
  if (!store || !paymentsEnabled()) return json({ error: 'Payments are not available yet' }, 503);

  const body = await readJson(req);
  if (!body.ok) return body.response;
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return json({ error: 'Invalid request' }, 400);

  const order = await store.getOrderByPayPalId(parsed.data.paypalOrderId);
  if (!order) return json({ error: 'Order not found' }, 404);
  if (order.status === 'paid') return json({ orderId: order.id, status: order.status });

  try {
    const capture = await capturePayPalOrder(parsed.data.paypalOrderId, order.id);
    const settled = await settleCapture(store, order, capture);
    return json({ orderId: settled.id, status: settled.status });
  } catch (e) {
    console.error('Capture failed', e);
    return json({ error: 'Payment could not be completed' }, 502);
  }
}
