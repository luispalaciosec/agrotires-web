import { requireFullAdmin } from '@/lib/server/admin-auth';
import { csvResponse } from '@/lib/server/csv';
import { refundRows, zohoBooksInvoices } from '@/lib/server/operations';
import { getStore } from '@/lib/server/store';

export async function GET(req: Request) {
  await requireFullAdmin();
  const params = new URL(req.url).searchParams;
  const valid = (d: string | null, fallback: string) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : fallback);
  const from = valid(params.get('from'), '2000-01-01');
  const to = valid(params.get('to'), '2999-12-31');
  const orders = (await getStore()?.listOrders()) ?? [];
  return params.get('kind') === 'refunds'
    ? csvResponse(`agrotires-refunds-${from}-${to}.csv`, refundRows(orders, from, to))
    : csvResponse(`agrotires-zoho-books-${from}-${to}.csv`, zohoBooksInvoices(orders, from, to));
}
