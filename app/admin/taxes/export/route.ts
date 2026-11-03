import { requireAdmin } from '@/lib/server/admin-auth';
import { taxReport } from '@/lib/server/analytics';
import { csvResponse } from '@/lib/server/csv';
import { getStore } from '@/lib/server/store';

export async function GET(req: Request) {
  await requireAdmin();
  const asked = Number(new URL(req.url).searchParams.get('year'));
  const year = Number.isInteger(asked) && asked > 2000 ? asked : new Date().getUTCFullYear();
  const orders = (await getStore()?.listOrders()) ?? [];
  return csvResponse(`agrotires-tax-${year}.csv`, [
    ['month', 'state', 'orders', 'sales_usd', 'tax_usd'],
    ...taxReport(orders, year).map((r) => [r.month, r.state, r.orders, (r.salesCents / 100).toFixed(2), (r.taxCents / 100).toFixed(2)]),
  ]);
}
