import Link from 'next/link';
import { requireAdmin } from '@/lib/server/admin-auth';
import { getStore } from '@/lib/server/store';
import { supabaseConfigured } from '@/lib/server/supabase-store';

export default async function AdminHome() {
  await requireAdmin();
  const store = getStore();
  if (!store) return null;
  const [products, orders, quotes] = await Promise.all([store.listProducts(), store.listOrders(), store.listQuotes()]);
  const stats: [number, string, string][] = [
    [products.filter((p) => p.active).length, 'Products in the store', '/admin/products'],
    [products.filter((p) => p.stockQty === 0).length, 'Out of stock', '/admin/products'],
    [orders.filter((o) => o.status === 'paid').length, 'Orders to fulfill', '/admin/orders'],
    [quotes.filter((q) => q.status === 'new').length, 'New quote requests', '/admin/quotes'],
  ];
  return (
    <>
      <div className="admin-head"><h1>Overview</h1></div>
      <div className="admin-stats">
        {stats.map(([n, label, href]) => <Link className="admin-stat" href={href} key={label}><strong>{n}</strong><span>{label}</span></Link>)}
      </div>
      <div className="notice">Testing stage: payments are not live{supabaseConfigured() ? '.' : ' and data is stored in a local file.'}</div>
    </>
  );
}
