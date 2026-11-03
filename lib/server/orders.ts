import { notifyPaid, notifyReview } from './email';
import { valueToCents } from './pricing';
import type { PayPalCapture } from './paypal';
import type { Order, Store } from './store';

// Used by both the capture route and the webhook, in whichever order they arrive.
export async function settleCapture(store: Store, stale: Order, capture: PayPalCapture) {
  // Capturing takes seconds and the webhook can land meanwhile, so never decide from the earlier read.
  const order = (await store.getOrder(stale.id)) ?? stale;
  const shippingAddress = capture.shipping;
  if (order.status === 'paid' || order.status === 'fulfilled' || order.status === 'refunded') {
    return shippingAddress && !order.shippingAddress ? store.updateOrder(order.id, { shippingAddress }) : order;
  }
  const amountMatches = capture.amount.currency_code === order.currency && valueToCents(capture.amount.value) === order.totalCents;
  if (capture.status === 'COMPLETED' && amountMatches) {
    await store.reduceStock(order.items);
    const paid = await store.updateOrder(order.id, { status: 'paid', paypalCaptureId: capture.id, shippingAddress });
    await notifyPaid(paid);
    return paid;
  }
  if (capture.status === 'PENDING' && amountMatches) {
    return store.updateOrder(order.id, { paypalCaptureId: capture.id, shippingAddress });
  }
  console.error(`Order ${order.id} needs review: capture ${capture.id} is ${capture.status} for ${capture.amount.value} ${capture.amount.currency_code}`);
  const failed = await store.updateOrder(order.id, { status: 'payment_failed', paypalCaptureId: capture.id });
  await notifyReview(failed, `capture ${capture.id} is ${capture.status} for ${capture.amount.value} ${capture.amount.currency_code}`);
  return failed;
}
