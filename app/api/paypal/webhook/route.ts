import { json, readJson } from '@/lib/server/http';
import { settleCapture } from '@/lib/server/orders';
import { paymentsEnabled, verifyWebhook, type PayPalCapture } from '@/lib/server/paypal';
import { valueToCents } from '@/lib/server/pricing';
import { getStore } from '@/lib/server/store';

type Resource = PayPalCapture & { custom_id?: string };

export async function POST(req: Request) {
  const store = getStore();
  if (!store || !paymentsEnabled()) return json({ error: 'Payments are not available yet' }, 503);

  const body = await readJson(req);
  if (!body.ok) return body.response;
  try {
    if (!(await verifyWebhook(req.headers, body.data))) return json({ error: 'Invalid signature' }, 401);
  } catch (e) {
    console.error('Webhook verification failed', e);
    return json({ error: 'Could not verify' }, 502); // PayPal retries on errors
  }

  const event = body.data as { event_type?: string; resource?: Resource };
  const resource = event.resource;
  const order = resource?.custom_id ? await store.getOrder(resource.custom_id) : undefined;
  if (!resource || !order) return json({ ok: true });

  if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
    await settleCapture(store, order, resource);
  } else if (event.event_type === 'PAYMENT.CAPTURE.DENIED' && order.status === 'pending_payment') {
    await store.updateOrder(order.id, { status: 'payment_failed' });
  } else if (event.event_type === 'PAYMENT.CAPTURE.REFUNDED' && valueToCents(resource.amount.value) === order.totalCents) {
    // Partial refunds keep the order as paid; staff handles those by hand.
    await store.updateOrder(order.id, { status: 'refunded' });
  }
  return json({ ok: true });
}
