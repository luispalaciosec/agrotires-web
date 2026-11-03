import { valueToCents } from './pricing';
import type { PayPalCapture } from './paypal';
import type { Order, Store } from './store';

// Used by both the capture route and the webhook, in whichever order they arrive.
export async function settleCapture(store: Store, order: Order, capture: PayPalCapture) {
  if (order.status === 'paid' || order.status === 'fulfilled' || order.status === 'refunded') return order;
  const amountMatches = capture.amount.currency_code === order.currency && valueToCents(capture.amount.value) === order.totalCents;
  if (capture.status === 'COMPLETED' && amountMatches) {
    await store.reduceStock(order.items);
    return store.updateOrder(order.id, { status: 'paid', paypalCaptureId: capture.id });
  }
  if (capture.status === 'PENDING' && amountMatches) {
    return store.updateOrder(order.id, { paypalCaptureId: capture.id });
  }
  console.error(`Order ${order.id} needs review: capture ${capture.id} is ${capture.status} for ${capture.amount.value} ${capture.amount.currency_code}`);
  return store.updateOrder(order.id, { status: 'payment_failed', paypalCaptureId: capture.id });
}
