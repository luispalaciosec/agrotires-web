import { requireFullAdmin } from '@/lib/server/admin-auth';
import { csvResponse } from '@/lib/server/csv';
import { orderRef } from '@/lib/server/email';
import { getStore } from '@/lib/server/store';

export async function GET() {
  await requireFullAdmin();
  const orders = (await getStore()?.listOrders()) ?? [];
  const usd = (cents: number) => (cents / 100).toFixed(2);
  return csvResponse('agrotires-orders.csv', [
    ['reference', 'date', 'status', 'email', 'state', 'subtotal_usd', 'tax_usd', 'total_usd', 'refunded_usd', 'paypal_capture'],
    ...orders.map((o) => [orderRef(o.id), o.createdAt, o.status, o.email, o.shippingAddress?.state ?? '', usd(o.subtotalCents), usd(o.taxCents), usd(o.totalCents), usd(o.refundedCents ?? 0), o.paypalCaptureId ?? '']),
  ]);
}
