import { Icon } from '@/components/ui';
import { requireFullAdmin } from '@/lib/server/admin-auth';
import { getStore } from '@/lib/server/store';
import { paginate, Pager, TableFilters } from '../table-tools';

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireFullAdmin();
  const { q = '', page } = await searchParams;
  const term = q.trim().toLowerCase();
  const entries = await getStore()?.listAudit(2000).catch(() => undefined);
  const result = paginate(entries?.filter((e) => !term || [e.actor, e.action, e.target, e.detail].join(' ').toLowerCase().includes(term)) ?? [], page);
  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Activity</h1>
          <p className="admin-sub">Who changed what in the panel, latest first.</p>
        </div>
      </div>
      {entries === undefined ? <div className="notice"><Icon name="info" size="sm" /> Run the migration 0011_operations.sql in Supabase to use this section.</div> : null}
      <div className="admin-card">
        <TableFilters base="/admin/activity" fields={[{ name: 'q', label: 'Search', value: q, placeholder: 'Search by person, action or detail' }]} />
        <div className="admin-scroll">
          <table className="admin-table">
            <thead><tr><th>When</th><th>Who</th><th>What</th><th>On</th><th>Detail</th></tr></thead>
            <tbody>
              {result.rows.map((e) => (
                <tr key={e.id}>
                  <td>{new Date(e.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td>{e.actor}</td>
                  <td>{e.action}</td>
                  <td>{e.target ?? '—'}</td>
                  <td>{e.detail ?? '—'}</td>
                </tr>
              ))}
              {result.total ? null : <tr><td colSpan={5} className="muted">Nothing recorded yet.</td></tr>}
            </tbody>
          </table>
        </div>
        <Pager base="/admin/activity" params={{ q }} result={result} />
      </div>
    </>
  );
}
