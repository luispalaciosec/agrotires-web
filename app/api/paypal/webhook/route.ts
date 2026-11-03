import { json, readJson } from '@/lib/server/http';
import { recordRefund, refundedTotalCents, settleCapture } from '@/lib/server/orders';
import { paymentsEnabled, verifyWebhook, type PayPalCapture, type PayPalRefund } from '@/lib/server/paypal';
import { valueToCents } from '@/lib/server/pricing';
import { getStore } from '@/lib/server/store';

type Resource = PayPalCapture & PayPalRefund;

// A refund made inside PayPal may not carry our order id, but it always links to its capture.
const captureIdOf = (r: Resource) => r.links?.find((l) => l.rel === 'up')?.href.match(/\/captures\/([^/?]+)/)?.[1];

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
  let order = resource?.custom_id ? await store.getOrder(resource.custom_id) : undefined;
  const captureId = resource && captureIdOf(resource);
  if (!order && captureId) order = await store.getOrderByCaptureId(captureId);
  if (!resource || !order) return json({ ok: true });

  if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
    await settleCapture(store, order, resource);
  } else if (event.event_type === 'PAYMENT.CAPTURE.DENIED' && order.status === 'pending_payment') {
    await store.updateOrder(order.id, { status: 'payment_failed' });
  } else if (event.event_type === 'PAYMENT.CAPTURE.REFUNDED') {
    const total = refundedTotalCents(resource);
    if (!Number.isNaN(total)) await recordRefund(store, order, total);
    // Without PayPal's running total, only a refund of the whole order is certain.
    else if (valueToCents(resource.amount.value) === order.totalCents) await recordRefund(store, order, order.totalCents);
  }
  return json({ ok: true });
}
