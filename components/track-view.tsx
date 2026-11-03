'use client';

import { useCallback, useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { BUSINESS } from '@/lib/catalog';
import { LOCALE_TAGS } from '@/lib/i18n';
import { SHIPMENT_STAGES, type ShipmentStatus } from '@/lib/shipping';
import { useStore } from './store';
import { Icon } from './ui';

type TrackResult = {
  status: ShipmentStatus;
  carrier: string;
  trackingNumber?: string;
  carrierUrl?: string;
  events: { status: ShipmentStatus; location?: string; note?: string; occurredAt: string }[];
};

export function TrackView() {
  const { t, locale } = useStore();
  const k = t.track;
  const [code, setCode] = useState('');
  const [result, setResult] = useState<TrackResult>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const lookUp = useCallback(async (value: string) => {
    setLoading(true);
    setError('');
    setResult(undefined);
    try {
      const res = await fetch('/api/track', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: value }) });
      if (res.ok) setResult(await res.json());
      else setError(res.status === 404 ? k.errNotFound : res.status === 429 ? k.errBusy : k.errDown(BUSINESS.contactEmail));
    } catch {
      setError(k.errDown(BUSINESS.contactEmail));
    } finally {
      setLoading(false);
    }
  }, [k]);

  // The link in the dispatch email carries the code.
  useEffect(() => {
    const fromLink = new URLSearchParams(window.location.search).get('code');
    if (!fromLink) return;
    setCode(fromLink);
    void lookUp(fromLink);
  }, [lookUp]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void lookUp(code);
  };
  const date = (iso: string) => new Date(iso).toLocaleString(LOCALE_TAGS[locale], { dateStyle: 'medium', timeStyle: 'short' });

  // Where the shipment is on its normal path; a reported problem keeps the last stage it reached.
  const reached = result ? Math.max(...result.events.map((e) => SHIPMENT_STAGES.indexOf(e.status)), 0) : 0;
  const last = result?.events.at(-1);
  const place = result?.events.slice().reverse().find((e) => e.location)?.location;

  return (
    <div className="content-narrow track">
      <form className="form-card track-form" onSubmit={submit}>
        <label className="field-label" htmlFor="track-code">{k.label}</label>
        <div className="track-row">
          <input id="track-code" className="text-input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="AG7K2M9QX4PT" autoComplete="off" maxLength={20} required />
          <button className="btn" disabled={loading}>{loading ? k.searching : k.search} <Icon name="search" size="sm" /></button>
        </div>
        <p className="fine-print">{k.help}</p>
      </form>

      {error ? <div className="notice" role="alert"><Icon name="info" size="sm" /> {error}</div> : null}

      {result ? (
        <section className="form-card track-result" aria-live="polite">
          <div className="eyebrow">{k.current}</div>
          <h2>{k.stages[result.status]}</h2>
          {place ? <p className="track-place"><Icon name="compass" size="sm" /> {k.lastLocation}: <strong>{place}</strong></p> : null}
          {last ? <p className="mini muted">{k.updated} {date(last.occurredAt)}</p> : null}

          {result.status === 'exception' ? <div className="notice" role="alert"><Icon name="info" size="sm" /> {k.problem(BUSINESS.contactEmail)}</div> : null}

          <ol className="track-steps" style={{ '--track-progress': `${(reached / (SHIPMENT_STAGES.length - 1)) * 100}%` } as CSSProperties}>
            {SHIPMENT_STAGES.map((stage, i) => (
              <li key={stage} className={i <= reached ? (i === reached ? 'current' : 'done') : ''} aria-current={i === reached ? 'step' : undefined}>
                <span className="track-dot"><Icon name={i === reached ? 'truck' : i < reached ? 'check' : 'clock'} size="xs" /></span>
                <span className="track-step-label">{k.stages[stage]}</span>
              </li>
            ))}
          </ol>

          <dl className="track-facts">
            <div><dt>{k.carrier}</dt><dd>{result.carrier}</dd></div>
            <div><dt>{k.number}</dt><dd>{result.trackingNumber || '—'}</dd></div>
          </dl>
          {result.carrierUrl ? <a className="text-link" href={result.carrierUrl} target="_blank" rel="noopener noreferrer">{k.carrierLink(result.carrier)} <Icon name="arrow" size="sm" /></a> : null}

          <h3 className="track-history">{k.history}</h3>
          <ul className="track-events">
            {result.events.slice().reverse().map((e, i) => (
              <li key={`${e.occurredAt}-${i}`}>
                <strong>{k.stages[e.status]}</strong>
                <small>{date(e.occurredAt)}{e.location ? ` · ${e.location}` : ''}</small>
                {e.note ? <span>{e.note}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
