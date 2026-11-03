import { Icon } from '@/components/ui';
import { requireAdmin } from '@/lib/server/admin-auth';
import { getStore } from '@/lib/server/store';
import { moderateReviewAction } from '../actions';
import { paginate, Pager, TableFilters } from '../table-tools';

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  await requireAdmin();
  const store = getStore();
  const reviews = await store?.listReviews().catch(() => undefined);
  const products = await store?.listProducts().catch(() => []);
  const { status = 'all', page } = await searchParams;
  const result = paginate(reviews?.filter((r) => status === 'all' || r.status === status) ?? [], page);
  const nameOf = (id: string) => products?.find((p) => p.id === id)?.name ?? id;
  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Reviews</h1>
          <p className="admin-sub">Only buyers can write one, through a signed link. Nothing appears in the store until you approve it.</p>
        </div>
      </div>
      {reviews === undefined ? <div className="notice"><Icon name="info" size="sm" /> Run the migration 0010_sales_tools.sql in Supabase to use this section.</div> : null}
      <div className="admin-card">
        <TableFilters base="/admin/reviews" fields={[{ name: 'status', label: 'Status', value: status, options: [['all', 'All'], ['pending', 'pending'], ['approved', 'approved'], ['rejected', 'rejected']] }]} />
        <div className="admin-scroll">
          <table className="admin-table">
            <thead><tr><th>Product</th><th>Rating</th><th>Review</th><th>By</th><th>Status</th><th /></tr></thead>
            <tbody>
              {result.rows.map((r) => (
                <tr key={r.id}>
                  <td>{nameOf(r.productId)}</td>
                  <td>{r.rating} / 5</td>
                  <td style={{ maxWidth: 420, whiteSpace: 'pre-wrap' }}>{r.body}</td>
                  <td>{r.author}</td>
                  <td><span className={`admin-pill ${r.status === 'pending' ? 'warn' : r.status === 'rejected' ? 'off' : ''}`}>{r.status}</span></td>
                  <td>
                    <div className="admin-actions" style={{ margin: 0 }}>
                      {r.status !== 'approved' ? <form action={moderateReviewAction.bind(null, r.id, 'approved')}><button className="btn btn-light">Approve</button></form> : null}
                      {r.status !== 'rejected' ? <form action={moderateReviewAction.bind(null, r.id, 'rejected')}><button className="btn btn-light">Reject</button></form> : null}
                    </div>
                  </td>
                </tr>
              ))}
              {result.total ? null : <tr><td colSpan={6} className="muted">No reviews yet.</td></tr>}
            </tbody>
          </table>
        </div>
        <Pager base="/admin/reviews" params={{ status }} result={result} />
      </div>
    </>
  );
}
