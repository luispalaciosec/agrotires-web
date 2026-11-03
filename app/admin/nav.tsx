'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui';

const GROUPS: { title: string; links: { href: string; label: string; icon: string }[] }[] = [
  { title: 'Sell', links: [
    { href: '/admin', label: 'Dashboard', icon: 'spark' },
    { href: '/admin/orders', label: 'Orders', icon: 'file' },
    { href: '/admin/shipments', label: 'Shipments', icon: 'truck' },
    { href: '/admin/quotes', label: 'Quote requests', icon: 'clipboard' },
    { href: '/admin/customers', label: 'Customers', icon: 'user' },
  ] },
  { title: 'Catalog', links: [{ href: '/admin/products', label: 'Products', icon: 'box' }] },
  { title: 'Settings', links: [
    { href: '/admin/taxes', label: 'Taxes', icon: 'shield' },
    { href: '/admin/emails', label: 'Emails', icon: 'mail' },
  ] },
];

export function AdminNav() {
  const path = usePathname();
  const current = (href: string) => (href === '/admin' ? path === href : path === href || path.startsWith(`${href}/`));
  return (
    <nav className="admin-nav" aria-label="Admin">
      {GROUPS.map((g) => (
        <div className="admin-nav-group" key={g.title}>
          <span className="admin-nav-title">{g.title}</span>
          {g.links.map((l) => (
            <Link key={l.href} href={l.href} className={current(l.href) ? 'current' : undefined} aria-current={current(l.href) ? 'page' : undefined}>
              <Icon name={l.icon} size="sm" /> {l.label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
