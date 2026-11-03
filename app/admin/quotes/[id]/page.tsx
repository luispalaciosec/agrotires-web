import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/server/admin-auth';
import { getStore, type QuoteStatus } from '@/lib/server/store';
import { updateQuoteStatusAction } from '../../actions';
import { PayLinkForm } from '../../tools-forms';

const STATUSES: [QuoteStatus, string][] = [['in_progress', 'Mark in progress'], ['answered', 'Mark answered'], ['closed', 'Close']];

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const quote = await getStore()?.getQuote(id);
  if (!quote) notFound();
  return (
    <>
      <div className="admin-head"><h1>{quote.topic}</h1><span className="admin-pill">{quote.status.replace('_', ' ')}</span></div>
      <div className="admin-card">
        <h2>{quote.name}</h2>
        <p style={{ fontSize: 13 }}>
          <a className="contact-email-inline" href={`mailto:${quote.email}`}>{quote.email}</a><br />
          Phone: {quote.phone || '—'}<br />
          Delivery ZIP: {quote.deliveryZip || '—'}<br />
          Product: {quote.product || '—'}
        </p>
        <p className="admin-pre">{quote.message}</p>
        <div className="admin-actions" style={{ marginTop: 18 }}>
          {STATUSES.filter(([s]) => s !== quote.status).map(([s, label]) => (
            <form action={updateQuoteStatusAction.bind(null, quote.id, s)} key={s}><button className="btn btn-light">{label}</button></form>
          ))}
        </div>
      </div>
      <div className="admin-card">
        <h2>Send a payment link</h2>
        <p className="mini muted">Set the agreed price and freight. The customer gets a link valid for 14 days, with tax calculated for the delivery address.</p>
        <PayLinkForm quoteId={quote.id} zip={quote.deliveryZip} name={quote.name} site={(process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '')} locale={quote.locale} />
      </div>
    </>
  );
}
