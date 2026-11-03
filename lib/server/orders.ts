import { notifyPaid, notifyRefund, notifyReview, orderRef } from './email';
import { applySale } from './operations';
import { valueToCents } from './pricing';
import { PayPalError, refundPayPalCapture, type PayPalCapture, type PayPalRefund } from './paypal';
import type { Order, Store } from './store';

export const refundableCents = (order: Order) => (order.status === 'paid' || order.status === 'fulfilled' ? order.totalCents - (order.refundedCents ?? 0) : 0);

// PayPal's running total, so a repeated notification cannot count the same refund twice.
export const refundedTotalCents = (refund: PayPalRefund) => {
  const value = refund.seller_payable_breakdown?.total_refunded_amount?.value;
  return value === undefined ? NaN : valueToCents(value);
};

// Used by the panel and the webhook, in whichever order they arrive.
export async function recordRefund(store: Store, stale: Order, totalRefundedCents: number) {
  const order = (await store.getOrder(stale.id)) ?? stale;
  const before = order.refundedCents ?? 0;
  if (!(totalRefundedCents > before)) return order;
  const refundedCents = Math.min(totalRefundedCents, order.totalCents);
  const updated = await store.updateOrder(order.id, { refundedCents, ...(refundedCents === order.totalCents ? { status: 'refunded' as const } : {}) });
  await notifyRefund(updated, refundedCents - before);
  return updated;
}

const REFUND_REFUSALS: Record<string, string> = {
  CAPTURE_FULLY_REFUNDED: 'PayPal says this payment has already been fully refunded. Check it in PayPal.',
  REFUND_AMOUNT_EXCEEDED: 'PayPal says this is more than what is left to refund. Check the payment in PayPal.',
  REFUND_TIME_LIMIT_EXCEEDED: 'PayPal no longer allows refunding this payment because too much time has passed.',
  INSUFFICIENT_FUNDS: 'The PayPal account does not have enough funds for this refund.',
  TRANSACTION_REFUSED: 'PayPal refused this refund. Check the payment in PayPal.',
};

export type RefundResult = { ok: true; order: Order; pending: boolean } | { ok: false; error: string; unknown?: boolean };

export async function issueRefund(store: Store, stale: Order, cents: number): Promise<RefundResult> {
  const order = (await store.getOrder(stale.id)) ?? stale;
  // The admin decided from what their page showed; if that changed, they must look again.
  if ((stale.refundedCents ?? 0) !== (order.refundedCents ?? 0)) return { ok: false, error: 'This order changed since you opened it. Review it and try again.' };
  const left = refundableCents(order);
  if (!order.paypalCaptureId || left <= 0) return { ok: false, error: 'This order has nothing left to refund.' };
  if (!Number.isInteger(cents) || cents <= 0 || cents > left) return { ok: false, error: `Enter an amount between $0.01 and $${(left / 100).toFixed(2)}.` };

  // Same order, same point and same amount give the same id, so PayPal treats a retry as the first request.
  const requestId = `refund-${order.id}-${order.refundedCents ?? 0}-${cents}`;
  let refund: PayPalRefund;
  try {
    // Fails first if the database cannot record it, before any money moves.
    await store.updateOrder(order.id, { refundedCents: order.refundedCents ?? 0 });
    refund = await refundPayPalCapture(order.paypalCaptureId, cents, requestId);
  } catch (e) {
    if (e instanceof PayPalError && e.status >= 400 && e.status < 500) {
      console.error(`Refund refused for order ${order.id}`, e.issue ?? e.status);
      return { ok: false, error: (e.issue && REFUND_REFUSALS[e.issue]) || 'PayPal refused this refund. Check the payment in PayPal.' };
    }
    console.error(`Refund not confirmed for order ${order.id}`, e);
    return { ok: false, unknown: true, error: 'The refund could not be confirmed. Check the payment in PayPal; trying again with the same amount will not pay twice.' };
  }
  if (refund.status !== 'COMPLETED' && refund.status !== 'PENDING') return { ok: false, error: `PayPal answered that the refund is ${refund.status}. Nothing was recorded.` };

  try {
    const total = refundedTotalCents(refund);
    const updated = await recordRefund(store, order, Number.isNaN(total) ? (order.refundedCents ?? 0) + cents : total);
    return { ok: true, order: updated, pending: refund.status === 'PENDING' };
  } catch (e) {
    console.error(`Order ${order.id} was refunded in PayPal but could not be updated`, e);
    return { ok: false, unknown: true, error: 'PayPal accepted the refund, but it could not be saved here. Try again with the same amount: it will not pay twice.' };
  }
}

// Used by both the capture route and the webhook, in whichever order they arrive.
export async function settleCapture(store: Store, stale: Order, capture: PayPalCapture) {
  // Capturing takes seconds and the webhook can land meanwhile, so never decide from the earlier read.
  const order = (await store.getOrder(stale.id)) ?? stale;
  // The address given at checkout was locked for PayPal; older orders take the one PayPal returns.
  const shippingAddress = order.shippingAddress ?? capture.shipping;
  if (order.status === 'paid' || order.status === 'fulfilled' || order.status === 'refunded') {
    return shippingAddress && !order.shippingAddress ? store.updateOrder(order.id, { shippingAddress }) : order;
  }
  const amountMatches = capture.amount.currency_code === order.currency && valueToCents(capture.amount.value) === order.totalCents;
  if (capture.status === 'COMPLETED' && amountMatches) {
    await applySale(store, order.items, orderRef(order.id));
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
