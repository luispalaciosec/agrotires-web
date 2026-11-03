import Link from 'next/link';
import { Icon } from '@/components/ui';
import { requireAdmin } from '@/lib/server/admin-auth';
import { getStore } from '@/lib/server/store';

export default async function PagesPage() {
  await requireAdmin();
  const pages = await getStore()?.listPages().catch(() => undefined);
  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Pages</h1>
          <p className="admin-sub">Build new pages for the store from blocks, in both languages.</p>
        </div>
        <Link className="btn" href="/admin/pages/new">New page</Link>
      </div>
      {pages === undefined ? <div className="notice" style={{ marginBottom: 18 }}><Icon name="info" size="sm" /> Run the migration 0013_pages.sql in Supabase to use this section.</div> : null}
      <div className="admin-card">
        <div className="admin-scroll">
          <table className="admin-table">
            <thead><tr><th>Title</th><th>Address</th><th>Blocks</th><th>Status</th></tr></thead>
            <tbody>
              {pages?.map((p) => (
                <tr key={p.id}>
                  <td><Link href={`/admin/pages/${p.id}`}>{p.titleEn}</Link></td>
                  <td data-raw>/p/{p.slug}</td>
                  <td>{p.blocks.length}</td>
                  <td><span className={`admin-pill ${p.published ? '' : 'off'}`}>{p.published ? 'Published' : 'Draft'}</span></td>
                </tr>
              ))}
              {pages?.length ? null : <tr><td colSpan={4} className="muted">No pages yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
