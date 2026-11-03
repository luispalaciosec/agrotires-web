import Link from 'next/link';
import { Icon } from '@/components/ui';
import { requireAdmin } from '@/lib/server/admin-auth';
import { orderRef } from '@/lib/server/email';
import { RETURN_FLOW } from '@/lib/server/operations';
import { getStore } from '@/lib/server/store';
import { ReturnStatusForm } from '../ops-forms';

const REASONS: Record<string, string> = { damaged: 'Arrived damaged', wrong_item: 'Wrong item', not_compatible: 'Does not fit', not_needed: 'No longer needed', other: 'Other' };

export default async function ReturnsPage() {
  await requireAdmin();
  const returns = await getStore()?.listReturns().catch(() => undefined);
  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Returns</h1>
          <p className="admin-sub">Customers request them from a signed link. Refund from the order once you have the goods.</p>
        </div>
      </div>
      {returns === undefined ? <div className="notice"><Icon name="info" size="sm" /> Run the migration 0011_operations.sql in Supabase to use this section.</div> : null}
      <div className="admin-card">
        <div className="admin-scroll">
          <table className="admin-table">
            <thead><tr><th>Order</th><th>Date</th><th>Items</th><th>Reason</th><th>Status</th><th>Next step</th></tr></thead>
            <tbody>
              {returns?.map((r) => (
                <tr key={r.id}>
                  <td><Link href={`/admin/orders/${r.orderId}`}>{orderRef(r.orderId)}</Link></td>
                  <td>{new Date(r.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' })}</td>
                  <td>{r.items.map((i) => `${i.quantity} x ${i.sku}`).join(', ')}</td>
                  <td style={{ maxWidth: 260, whiteSpace: 'pre-wrap' }}>{REASONS[r.reason] ?? r.reason}{r.note ? `\n${r.note}` : ''}</td>
                  <td><span className={`admin-pill ${r.status === 'requested' ? 'warn' : r.status === 'rejected' || r.status === 'closed' ? 'off' : ''}`}>{r.status}</span></td>
                  <td><ReturnStatusForm id={r.id} next={RETURN_FLOW[r.status] ?? []} /></td>
                </tr>
              ))}
              {returns?.length ? null : <tr><td colSpan={6} className="muted">No returns yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
