import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { fontClasses } from '@/lib/fonts';
import { Asset, Icon } from '@/components/ui';
import { isAdmin } from '@/lib/server/admin-auth';
import { getStore } from '@/lib/server/store';
import { logoutAction } from './actions';
import { AdminNav } from './nav';
import '../globals.css';
import './admin.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const signedIn = await isAdmin();
  return (
    <html lang="en" className={fontClasses}>
      <body>{signedIn ? <AdminShell>{children}</AdminShell> : children}</body>
    </html>
  );
}

function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="admin">
      <aside className="admin-side">
        <div className="admin-brand"><Asset name="agrotires-logo-web.webp" alt="" sizes="40px" /> AGROTIRES</div>
        <AdminNav />
        <div className="admin-side-foot">
          <Link href="/" target="_blank"><Icon name="arrow" size="sm" /> View store</Link>
          <form action={logoutAction}><button type="submit"><Icon name="close" size="sm" /> Sign out</button></form>
        </div>
      </aside>
      <main className="admin-main" id="main-content">
        {getStore() ? children : <div className="notice"><Icon name="info" size="sm" /> Storage is not configured. Set STORE_DRIVER to use the panel.</div>}
      </main>
    </div>
  );
}
