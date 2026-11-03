import Link from 'next/link';
import { requireAdmin } from '@/lib/server/admin-auth';
import { getStore } from '@/lib/server/store';

export default async function QuotesPage() {
  await requireAdmin();
  const quotes = (await getStore()?.listQuotes()) ?? [];
  return (
    <>
      <div className="admin-head"><h1>Quote requests</h1></div>
      <div className="admin-card">
        <div className="admin-scroll">
          <table className="admin-table">
            <thead><tr><th>Date</th><th>Name</th><th>Topic</th><th>Status</th></tr></thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id}>
                  <td><Link href={`/admin/quotes/${q.id}`}>{new Date(q.createdAt).toLocaleString('en-US')}</Link></td>
                  <td>{q.name}</td>
                  <td>{q.topic}</td>
                  <td><span className={`admin-pill ${q.status === 'new' ? 'warn' : q.status === 'closed' ? 'off' : ''}`}>{q.status.replace('_', ' ')}</span></td>
                </tr>
              ))}
              {quotes.length ? null : <tr><td colSpan={4} className="muted">No quote requests yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
