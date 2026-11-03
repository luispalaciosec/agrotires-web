import { requireFullAdmin, usesSupabaseAuth } from '@/lib/server/admin-auth';
import { getStore } from '@/lib/server/store';
import { RoleForm } from '../ops-forms';

export default async function TeamPage() {
  await requireFullAdmin();
  const team = await getStore()?.listTeam().catch(() => []);
  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Team</h1>
          <p className="admin-sub">Who can enter the panel. The person must create an account in the store first.</p>
        </div>
      </div>
      {usesSupabaseAuth() ? null : <div className="notice" style={{ marginBottom: 18 }}>Roles need Supabase; this computer uses a shared password.</div>}
      <section className="admin-card">
        <h2>People with access</h2>
        <div className="admin-scroll">
          <table className="admin-table">
            <thead><tr><th>Email</th><th>Role</th></tr></thead>
            <tbody>
              {team?.map((m) => <tr key={m.email}><td>{m.email}</td><td><span className="admin-pill">{m.role}</span></td></tr>)}
              {team?.length ? null : <tr><td colSpan={2} className="muted">Nobody listed.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <section className="admin-card">
        <h2>Change a role</h2>
        <RoleForm />
      </section>
    </>
  );
}
