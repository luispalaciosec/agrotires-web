import { Icon } from '@/components/ui';
import { requireFullAdmin } from '@/lib/server/admin-auth';
import { getStore } from '@/lib/server/store';

export default async function ActivityPage() {
  await requireFullAdmin();
  const entries = await getStore()?.listAudit(200).catch(() => undefined);
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
        <div className="admin-scroll">
          <table className="admin-table">
            <thead><tr><th>When</th><th>Who</th><th>What</th><th>On</th><th>Detail</th></tr></thead>
            <tbody>
              {entries?.map((e) => (
                <tr key={e.id}>
                  <td>{new Date(e.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td>{e.actor}</td>
                  <td>{e.action}</td>
                  <td>{e.target ?? '—'}</td>
                  <td>{e.detail ?? '—'}</td>
                </tr>
              ))}
              {entries?.length ? null : <tr><td colSpan={5} className="muted">Nothing recorded yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
