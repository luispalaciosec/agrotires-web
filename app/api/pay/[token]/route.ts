import { clientIp, json, rateLimited, sameOrigin } from '@/lib/server/http';
import { createPayPalOrder, paymentsEnabled } from '@/lib/server/paypal';
import { payLinkProblem } from '@/lib/server/sales';
import { getStore } from '@/lib/server/store';

// Starts PayPal for an order made from a payment link. The amount was fixed when the link was created.
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!sameOrigin(req)) return json({ error: 'Forbidden' }, 403);
  if (await rateLimited(`pay:${clientIp(req)}`, 20)) return json({ error: 'Too many requests' }, 429);
  const store = getStore();
  if (!store || !paymentsEnabled()) return json({ error: 'Payments are not available yet' }, 503);
  const order = await store.getOrderByPayToken((await params).token);
  if (!order) return json({ error: 'Not found' }, 404);
  const problem = payLinkProblem(order);
  if (problem) return json({ error: problem }, 409);
  try {
    const paypalOrderId = await createPayPalOrder(order);
    await store.updateOrder(order.id, { paypalOrderId });
    return json({ orderId: order.id, paypalOrderId }, 201);
  } catch (e) {
    console.error('Payment link failed', e);
    return json({ error: 'Could not start payment' }, 502);
  }
}
