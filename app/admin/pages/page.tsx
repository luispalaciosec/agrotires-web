import Link from 'next/link';
import { cookies } from 'next/headers';
import { Icon } from '@/components/ui';
import { categories, catHref, guides } from '@/lib/catalog';
import { localePath } from '@/lib/i18n';
import { requireAdmin } from '@/lib/server/admin-auth';
import { getStore } from '@/lib/server/store';

// Built into the code: the panel lists them so the whole site is visible in one place.
const STORE_PAGES: [string, string][] = [
  ['Home', '/'],
  ['Shop', '/shop'],
  ['Find a part', '/finder'],
  ['About us', '/about'],
  ['Guides', '/guides'],
  ['Help center', '/help'],
  ['Request a quote', '/quote'],
  ['My account', '/account'],
  ['Wishlist', '/wishlist'],
  ['Checkout', '/checkout'],
  ['Launch checklist', '/setup'],
  ['Shipping policy', '/policies/shipping'],
  ['Returns policy', '/policies/returns'],
  ['Privacy policy', '/policies/privacy'],
];

export default async function PagesPage() {
  await requireAdmin();
  const pages = await getStore()?.listPages().catch(() => undefined);
  const locale = (await cookies()).get('admin-lang')?.value === 'en' ? 'en' : 'es';
  const fixed: [string, string][] = [
    ...STORE_PAGES,
    ...categories.filter((c) => c.id !== 'machine').map((c): [string, string] => [c.name, catHref(c.id)]),
    ...guides.map((g): [string, string] => [g.title, `/guide/${g.id}`]),
  ];
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
        <h2>Pages built with blocks</h2>
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
      <div className="admin-card" style={{ marginTop: 18 }}>
        <h2>Store pages</h2>
        <p className="mini muted">These are part of the store’s code. You can view them here, but their text is not edited from the panel yet.</p>
        <div className="admin-scroll">
          <table className="admin-table">
            <thead><tr><th>Title</th><th>Address</th><th>Status</th><th /></tr></thead>
            <tbody>
              {fixed.map(([title, href]) => (
                <tr key={href}>
                  <td>{title}</td>
                  <td data-raw>{href}</td>
                  <td><span className="admin-pill off">Fixed</span></td>
                  <td><a className="text-link" href={localePath(locale, href)} target="_blank" rel="noreferrer">View page</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
