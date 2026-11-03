import Link from 'next/link';
import { requireAdmin } from '@/lib/server/admin-auth';
import { getStore } from '@/lib/server/store';
import { paginate, Pager, TableFilters } from '../table-tools';

export default async function QuotesPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  await requireAdmin();
  const { q = '', status = 'all', page } = await searchParams;
  const term = q.trim().toLowerCase();
  const quotes = ((await getStore()?.listQuotes()) ?? [])
    .filter((x) => status === 'all' || x.status === status)
    .filter((x) => !term || [x.name, x.email, x.topic].join(' ').toLowerCase().includes(term));
  const result = paginate(quotes, page);
  return (
    <>
      <div className="admin-head"><h1>Quote requests</h1></div>
      <div className="admin-card">
        <TableFilters base="/admin/quotes" fields={[
          { name: 'q', label: 'Search', value: q, placeholder: 'Search by name, email or topic' },
          { name: 'status', label: 'Status', value: status, options: [['all', 'All'], ['new', 'new'], ['in_progress', 'in progress'], ['answered', 'answered'], ['closed', 'closed']] },
        ]} />
        <div className="admin-scroll">
          <table className="admin-table">
            <thead><tr><th>Date</th><th>Name</th><th>Topic</th><th>Status</th></tr></thead>
            <tbody>
              {result.rows.map((q) => (
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
        <Pager base="/admin/quotes" params={{ q, status }} result={result} />
      </div>
    </>
  );
}
