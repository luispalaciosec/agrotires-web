import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { fontClasses } from '@/lib/fonts';
import { Icon } from '@/components/ui';
import { currentAdmin, isAdmin } from '@/lib/server/admin-auth';
import { priorities } from '@/lib/server/analytics';
import { getStore } from '@/lib/server/store';
import { logoutAction } from './actions';
import { AdminNav } from './nav';
import '../globals.css';
import './admin.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } };

const poppins = Poppins({ subsets: ['latin'], variable: '--font-admin', weight: ['400', '500', '600'], display: 'swap' });

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const signedIn = await isAdmin();
  return (
    <html lang="en" className={`${fontClasses} ${poppins.variable}`}>
      <body>{signedIn ? <AdminShell>{children}</AdminShell> : children}</body>
    </html>
  );
}

// The shell must keep working even if a list cannot load, so the page below can show its own error.
async function loadAlerts() {
  const store = getStore();
  if (!store) return { alerts: [], newQuotes: 0 };
  try {
    const [orders, quotes, products, shipments] = await Promise.all([store.listOrders(), store.listQuotes(), store.listProducts(), store.listShipments().catch(() => [])]);
    return { alerts: priorities(orders, quotes, products, shipments), newQuotes: quotes.filter((q) => q.status === 'new').length };
  } catch (e) {
    console.error('Could not load admin alerts', e);
    return { alerts: [], newQuotes: 0 };
  }
}

async function AdminShell({ children }: { children: ReactNode }) {
  const [{ alerts, newQuotes }, user] = await Promise.all([loadAlerts(), currentAdmin()]);
  const pending = alerts.reduce((n, a) => n + a.count, 0);
  return (
    <div className="admin">
      <header className="admin-top">
        <Link className="admin-logo" href="/admin" aria-label="AGROTIRES dashboard">
          {/* eslint-disable-next-line @next/next/no-img-element -- small fixed logo */}
          <img src="/assets/agrotires-logo-web.webp" alt="" width={44} height={44} />
        </Link>
        <form className="admin-search-top" action="/admin/search" role="search">
          <Icon name="search" size="sm" />
          <input name="q" placeholder="Search orders, products, customers…" aria-label="Search the panel" autoComplete="off" />
        </form>
        <div className="admin-top-tools">
          <details className="admin-menu">
            <summary className="admin-icon-btn" aria-label={`${pending} items need attention`}>
              <Icon name="bell" size="sm" />
              {pending ? <span className="admin-badge">{pending > 99 ? '99+' : pending}</span> : null}
            </summary>
            <div className="admin-menu-panel">
              <h3>Needs attention</h3>
              {alerts.length ? alerts.map((a) => <Link key={a.label} href={a.href}><strong>{a.count}</strong> {a.label}</Link>) : <p>All clear for now.</p>}
            </div>
          </details>
          <Link className="admin-icon-btn" href="/admin/quotes" aria-label={`${newQuotes} new quote requests`}>
            <Icon name="mail" size="sm" />
            {newQuotes ? <span className="admin-badge">{newQuotes > 99 ? '99+' : newQuotes}</span> : null}
          </Link>
          <details className="admin-menu">
            <summary className="admin-user" aria-label="Account menu">
              <span className="admin-avatar" aria-hidden="true">{user.name.slice(0, 1)}</span>
              <span className="admin-user-text"><strong>{user.name}</strong><small>{user.role}</small></span>
            </summary>
            <div className="admin-menu-panel">
              <Link href="/" target="_blank"><Icon name="arrow" size="sm" /> View store</Link>
              <form action={logoutAction}><button type="submit"><Icon name="close" size="sm" /> Sign out</button></form>
            </div>
          </details>
        </div>
      </header>
      <aside className="admin-side"><AdminNav /></aside>
      <main className="admin-main" id="main-content">
        {getStore() ? children : <div className="notice"><Icon name="info" size="sm" /> Storage is not configured. Set STORE_DRIVER to use the panel.</div>}
      </main>
    </div>
  );
}
