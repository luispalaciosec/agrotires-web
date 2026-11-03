import Link from 'next/link';
import { Icon } from '@/components/ui';
import { SHIPMENT_STATUSES, STATUS_LABELS, type ShipmentStatus } from '@/lib/shipping';
import { requireAdmin } from '@/lib/server/admin-auth';
import { orderRef } from '@/lib/server/email';
import { getStore } from '@/lib/server/store';
import { paginate, Pager, TableFilters } from '../table-tools';

const TONE: Partial<Record<ShipmentStatus, string>> = { exception: 'bad', delivered: 'off', label_created: 'warn' };

export default async function ShipmentsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  await requireAdmin();
  const { status = 'all', q = '', page } = await searchParams;
  const term = q.trim().toLowerCase();
  const all = await getStore()?.listShipments().catch(() => undefined);
  const shipments = all?.filter((s) => status === 'all' || s.status === status).filter((s) => !term || [orderRef(s.orderId), s.carrier, s.trackingNumber].join(' ').toLowerCase().includes(term)) ?? [];
  const result = paginate(shipments, page);
  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Shipments</h1>
          <p className="admin-sub">Create a shipment from a paid order. Each one gets a tracking page for the customer.</p>
        </div>
      </div>
      {all === undefined ? <div className="notice" style={{ marginBottom: 18 }}><Icon name="info" size="sm" /> Run the migration 0008_admin_tools.sql in Supabase to use this section.</div> : null}
      <div className="admin-toolbar">
        <div className="admin-range" role="group" aria-label="Filter by status">
          <Link href="/admin/shipments" className={status === 'all' ? 'current' : undefined}>All <small>{all?.length ?? 0}</small></Link>
          {SHIPMENT_STATUSES.map((s) => <Link key={s} href={`/admin/shipments?status=${s}`} className={status === s ? 'current' : undefined}>{STATUS_LABELS[s]} <small>{all?.filter((x) => x.status === s).length ?? 0}</small></Link>)}
        </div>
      </div>
      <TableFilters base="/admin/shipments" keep={{ status }} fields={[{ name: 'q', label: 'Search', value: q, placeholder: 'Search order, carrier or tracking number' }]} />
      <div className="admin-card">
        <div className="admin-scroll">
          <table className="admin-table">
            <thead><tr><th>Order</th><th>Carrier</th><th>Tracking number</th><th>Last location</th><th>Updated</th><th>Status</th></tr></thead>
            <tbody>
              {result.rows.map((s) => {
                const last = s.events.at(-1);
                return (
                  <tr key={s.id}>
                    <td><Link href={`/admin/orders/${s.orderId}`}>{orderRef(s.orderId)}</Link></td>
                    <td>{s.carrier}</td>
                    <td>{s.trackingNumber || '—'}</td>
                    <td>{s.events.slice().reverse().find((e) => e.location)?.location ?? '—'}</td>
                    <td>{last ? new Date(last.occurredAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</td>
                    <td><span className={`admin-pill ${TONE[s.status] ?? ''}`}>{STATUS_LABELS[s.status]}</span></td>
                  </tr>
                );
              })}
              {shipments.length ? null : <tr><td colSpan={6} className="muted">No shipments here yet.</td></tr>}
            </tbody>
          </table>
        </div>
        <Pager base="/admin/shipments" params={{ status, q }} result={result} />
      </div>
    </>
  );
}
