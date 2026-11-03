import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Asset, Icon } from '@/components/ui';
import { isAdmin } from '@/lib/server/admin-auth';
import { getStore } from '@/lib/server/store';
import { logoutAction } from './actions';
import './admin.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: ReactNode }) {
  if (!(await isAdmin())) return <>{children}</>;
  return (
    <div className="admin">
      <aside className="admin-side">
        <div className="admin-brand"><Asset name="agrotires-logo-web.webp" alt="" sizes="40px" /> AGROTIRES</div>
        <Link href="/admin"><Icon name="box" size="sm" /> Overview</Link>
        <Link href="/admin/products"><Icon name="clipboard" size="sm" /> Products</Link>
        <Link href="/admin/orders"><Icon name="file" size="sm" /> Orders</Link>
        <Link href="/admin/quotes"><Icon name="mail" size="sm" /> Quote requests</Link>
        <Link href="/" target="_blank"><Icon name="arrow" size="sm" /> View store</Link>
        <form action={logoutAction}><button type="submit"><Icon name="close" size="sm" /> Sign out</button></form>
      </aside>
      <main className="admin-main" id="main-content">
        {getStore() ? children : <div className="notice"><Icon name="info" size="sm" /> Storage is not configured. Set STORE_DRIVER to use the panel.</div>}
      </main>
    </div>
  );
}
