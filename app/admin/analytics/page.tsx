import Link from 'next/link';
import { Icon } from '@/components/ui';
import { requireAdmin } from '@/lib/server/admin-auth';
import { conversionReport } from '@/lib/server/operations';
import { getStore } from '@/lib/server/store';

const RANGES = [7, 30, 90];

function Counted({ rows, empty }: { rows: { value: string; count: number }[]; empty: string }) {
  if (!rows.length) return <p className="muted admin-empty">{empty}</p>;
  return <ul className="count-list">{rows.map((r) => <li key={r.value}><span>{r.value}</span><strong>{r.count}</strong></li>)}</ul>;
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await requireAdmin();
  const { days: asked } = await searchParams;
  const days = RANGES.includes(Number(asked)) ? Number(asked) : 30;
  const events = await getStore()?.listEvents(new Date(Date.now() - days * 86_400_000).toISOString()).catch(() => undefined);
  const r = conversionReport(events ?? []);
  const top = Math.max(r.visitors, ...r.steps.map((s) => s.count), 1);
  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Analytics</h1>
          <p className="admin-sub">Counted by browser session, with no cookies and no personal data. Visitors asking not to be tracked are left out.</p>
        </div>
        <div className="admin-range" role="group" aria-label="Period">
          {RANGES.map((d) => <Link key={d} href={`/admin/analytics?days=${d}`} className={d === days ? 'current' : undefined}>{d}D</Link>)}
        </div>
      </div>
      {events === undefined ? <div className="notice" style={{ marginBottom: 18 }}><Icon name="info" size="sm" /> Run the migration 0011_operations.sql in Supabase to use this section.</div> : null}
      <div className="kpis">
        <div className="kpi"><span>Sessions</span><strong>{r.visitors}</strong></div>
        <div className="kpi"><span>Purchases</span><strong>{r.steps[3].count}</strong></div>
        <div className="kpi"><span>Conversion</span><strong>{(r.conversion * 100).toFixed(1)}%</strong></div>
      </div>
      <section className="admin-card">
        <h2>Purchase funnel</h2>
        <ul className="ranked">
          {r.steps.map((s, i) => {
            const before = i ? r.steps[i - 1].count : r.visitors;
            return (
              <li key={s.label}>
                <div className="ranked-text"><span>{s.label}{before ? <small> · {Math.round((s.count / before) * 100)}% of the previous step</small> : null}</span><strong>{s.count}</strong></div>
                <div className="ranked-track"><span style={{ width: `${(s.count / top) * 100}%` }} /></div>
              </li>
            );
          })}
        </ul>
      </section>
      <div className="admin-grid two">
        <section className="admin-card"><h2>Searches with no results</h2><p className="mini muted">What customers want and did not find.</p><Counted rows={r.noResults} empty="None yet." /></section>
        <section className="admin-card"><h2>Top searches</h2><Counted rows={r.topSearches} empty="None yet." /></section>
        <section className="admin-card"><h2>Most viewed products</h2><Counted rows={r.topProducts} empty="None yet." /></section>
      </div>
    </>
  );
}
