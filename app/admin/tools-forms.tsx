'use client';

import { startTransition, useActionState, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { defaultContent, fillTemplate, templateProblem, type EmailLocale, type TemplateContent, type TemplateDef } from '@/lib/email-templates';
import { CARRIERS, SHIPMENT_STAGES, SHIPMENT_STATUSES, STATUS_LABELS, type ShipmentStatus } from '@/lib/shipping';
import { bpsToPercent, US_STATES } from '@/lib/tax';
import type { Shipment, TaxRate } from '@/lib/server/store';
import { addShipmentEventAction, createShipmentAction, resetEmailTemplateAction, saveEmailTemplateAction, saveTaxRatesAction, sendTestEmailAction, type FormState } from './actions';
import { Messages } from './forms';

const empty: FormState = {};

// Submitted by hand because <form action> clears every field, even when validation fails.
const submitWith = (action: (data: FormData) => void) => (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const data = new FormData(e.currentTarget);
  startTransition(() => action(data));
};

export function TaxForm({ rates }: { rates: TaxRate[] }) {
  const [state, action, pending] = useActionState(saveTaxRatesAction, empty);
  const [filter, setFilter] = useState('');
  const term = filter.trim().toLowerCase();
  const byState = useMemo(() => new Map(rates.map((r) => [r.state, r])), [rates]);
  return (
    <form onSubmit={submitWith(action)}>
      <Messages state={state} />
      <input className="text-input" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Find a state" aria-label="Find a state" style={{ marginBottom: 12 }} />
      <div className="tax-list">
        {US_STATES.map(([code, name]) => {
          const rate = byState.get(code);
          const hidden = term && !name.toLowerCase().includes(term) && !code.toLowerCase().includes(term);
          // Hidden rows stay in the form, so filtering never loses a rate.
          return (
            <div className="tax-row" key={code} hidden={Boolean(hidden)}>
              <label htmlFor={`rate_${code}`}><strong>{code}</strong> {name}</label>
              <div className="tax-input">
                <input className="text-input" id={`rate_${code}`} name={`rate_${code}`} inputMode="decimal" defaultValue={rate ? bpsToPercent(rate.rateBps) : ''} placeholder="No tax" aria-label={`${name} tax rate in percent`} />
                <span aria-hidden="true">%</span>
              </div>
              <label className="admin-check"><input type="checkbox" name={`active_${code}`} defaultChecked={rate ? rate.active : true} /> Active</label>
            </div>
          );
        })}
      </div>
      <div className="admin-actions" style={{ marginTop: 16 }}><button className="btn" disabled={pending}>{pending ? 'Saving…' : 'Save rates'}</button></div>
    </form>
  );
}

export function EmailEditor({ def, saved, canSend }: { def: TemplateDef; saved?: TemplateContent; canSend: boolean }) {
  const initial = saved ?? defaultContent(def);
  const [content, setContent] = useState<TemplateContent>(initial);
  const languages: EmailLocale[] = def.audience === 'team' ? ['en'] : ['en', 'es'];
  const [lang, setLang] = useState<EmailLocale>('en');
  const [state, action, pending] = useActionState(saveEmailTemplateAction.bind(null, def.key), empty);
  const [testState, testAction, testing] = useActionState(sendTestEmailAction.bind(null, def.key), empty);
  const [resetState, resetAction, resetting] = useActionState(resetEmailTemplateAction.bind(null, def.key), empty);
  const body = useRef<HTMLTextAreaElement>(null);
  const subjectKey = `subject_${lang}` as const;
  const bodyKey = `body_${lang}` as const;
  const problem = templateProblem(def, content);
  const set = (key: keyof TemplateContent, value: string | boolean) => setContent((c) => ({ ...c, [key]: value }));

  const insert = (name: string) => {
    const el = body.current;
    const tag = `{{${name}}}`;
    const text = content[bodyKey];
    if (!el) return set(bodyKey, text + tag);
    const at = el.selectionStart ?? text.length;
    set(bodyKey, text.slice(0, at) + tag + text.slice(el.selectionEnd ?? at));
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = at + tag.length;
    });
  };
  const fields = (data: FormData) => {
    data.set('enabled', content.enabled ? 'on' : '');
    for (const key of ['subject_en', 'body_en', 'subject_es', 'body_es'] as const) data.set(key, content[key]);
    return data;
  };

  return (
    <div className="email-editor">
      <section className="admin-card">
        <form onSubmit={(e) => { e.preventDefault(); const data = fields(new FormData()); startTransition(() => action(data)); }}>
          <Messages state={state.error || state.notice ? state : resetState} />
          <label className="admin-check"><input type="checkbox" checked={content.enabled} onChange={(e) => set('enabled', e.target.checked)} /> Send this email</label>
          {languages.length > 1 ? (
            <div className="admin-range" role="tablist" aria-label="Language" style={{ margin: '10px 0 14px' }}>
              {languages.map((l) => <button type="button" key={l} role="tab" aria-selected={l === lang} className={l === lang ? 'current' : undefined} onClick={() => setLang(l)}>{l === 'en' ? 'English' : 'Spanish'}</button>)}
            </div>
          ) : null}
          <div className="field">
            <label className="field-label" htmlFor="email-subject">Subject</label>
            <input className="text-input" id="email-subject" value={content[subjectKey]} onChange={(e) => set(subjectKey, e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="email-body">Message</label>
            <textarea ref={body} className="textarea email-body" id="email-body" rows={13} value={content[bodyKey]} onChange={(e) => set(bodyKey, e.target.value)} />
          </div>
          <p className="field-label" style={{ marginBottom: 6 }}>Insert into the message</p>
          <div className="var-chips">
            {Object.entries(def.variables).map(([name, help]) => <button type="button" key={name} title={help} onClick={() => insert(name)}>{`{{${name}}}`}</button>)}
          </div>
          {problem ? <div className="admin-error" role="alert" style={{ marginTop: 12 }}>{problem}</div> : null}
          <div className="admin-actions" style={{ marginTop: 16 }}>
            <button className="btn" disabled={pending || Boolean(problem)}>{pending ? 'Saving…' : 'Save email'}</button>
            <button
              type="button"
              className="btn btn-light"
              disabled={resetting}
              onClick={() => {
                if (!confirm('Go back to the original text of this email?')) return;
                setContent(defaultContent(def));
                startTransition(() => resetAction());
              }}
            >
              Restore original
            </button>
          </div>
        </form>
      </section>

      <section className="admin-card email-preview-card">
        <h2>Preview <small className="muted">with sample data</small></h2>
        <div className="email-preview">
          <div className="email-meta"><strong>{fillTemplate(content[subjectKey], def.sample)}</strong><small>From AGROTIRES &lt;contact@agrotiresusa.com&gt;</small></div>
          <div className="email-frame">
            <div className="email-brand">AGROTIRES <span>INSTANT SOLUTION</span></div>
            <p>{fillTemplate(content[bodyKey], def.sample)}</p>
          </div>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); const data = fields(new FormData(e.currentTarget)); data.set('lang', lang); startTransition(() => testAction(data)); }} style={{ marginTop: 16 }}>
          <Messages state={testState} />
          <label className="field-label" htmlFor="test-to">Send a test of this version</label>
          <div className="track-row">
            <input className="text-input" id="test-to" name="to" type="email" placeholder="you@example.com" required disabled={!canSend} />
            <button className="btn btn-light" disabled={!canSend || testing || Boolean(problem)}>{testing ? 'Sending…' : 'Send test'}</button>
          </div>
          {canSend ? null : <p className="mini muted" style={{ marginTop: 8 }}>Available once the mailbox app password is set in Vercel.</p>}
        </form>
      </section>
    </div>
  );
}

export function CreateShipmentForm({ orderId }: { orderId: string }) {
  const [state, action, pending] = useActionState(createShipmentAction.bind(null, orderId), empty);
  return (
    <form onSubmit={submitWith(action)}>
      <Messages state={state} />
      <div className="form-grid">
        <div className="field">
          <label className="field-label" htmlFor="carrier">Carrier *</label>
          <select className="select-input" id="carrier" name="carrier" required defaultValue="">
            <option value="" disabled>Choose a carrier</option>
            {CARRIERS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="trackingNumber">Tracking number (guía)</label>
          <input className="text-input" id="trackingNumber" name="trackingNumber" maxLength={80} autoComplete="off" />
        </div>
      </div>
      <label className="admin-check"><input type="checkbox" name="notify" defaultChecked /> Email the customer the tracking link</label>
      <div className="admin-actions" style={{ marginTop: 12 }}><button className="btn" disabled={pending}>{pending ? 'Creating…' : 'Create shipment'}</button></div>
    </form>
  );
}

export function ShipmentUpdateForm({ orderId, shipment }: { orderId: string; shipment: Shipment }) {
  const [state, action, pending] = useActionState(addShipmentEventAction.bind(null, orderId, shipment.id), empty);
  const at = SHIPMENT_STAGES.indexOf(shipment.status);
  const next: ShipmentStatus = at >= 0 && at < SHIPMENT_STAGES.length - 1 ? SHIPMENT_STAGES[at + 1] : shipment.status === 'exception' ? 'in_transit' : shipment.status;
  const [status, setStatus] = useState<ShipmentStatus>(next);
  // After each update, suggest the following step.
  useEffect(() => setStatus(next), [next]);
  const emails = status === 'out_for_delivery' || status === 'delivered';
  return (
    <form key={shipment.events.length} onSubmit={submitWith(action)} className="shipment-update">
      <Messages state={state} />
      <div className="form-grid">
        <div className="field">
          <label className="field-label" htmlFor="status">New status *</label>
          <select className="select-input" id="status" name="status" value={status} onChange={(e) => setStatus(e.target.value as ShipmentStatus)}>
            {SHIPMENT_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="location">Where is it now?</label>
          <input className="text-input" id="location" name="location" maxLength={120} placeholder="Des Moines, IA" />
        </div>
        <div className="field full-width">
          <label className="field-label" htmlFor="note">Note, visible to the customer</label>
          <input className="text-input" id="note" name="note" maxLength={300} />
        </div>
      </div>
      {emails ? <label className="admin-check"><input type="checkbox" name="notify" defaultChecked /> Email the customer about this update</label> : null}
      <div className="admin-actions" style={{ marginTop: 12 }}><button className="btn" disabled={pending}>{pending ? 'Saving…' : 'Add update'}</button></div>
    </form>
  );
}
