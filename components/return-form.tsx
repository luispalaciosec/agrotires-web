'use client';

import { useState, type FormEvent } from 'react';
import { useStore } from './store';
import { Icon } from './ui';

export function ReturnForm({ order, sig, items }: { order: string; sig: string; items: { sku: string; name: string; quantity: number }[] }) {
  const { t } = useStore();
  const r = t.returns;
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'open' | 'closed' | 'error' | 'none'>('idle');
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const chosen = items.flatMap((i) => {
      const quantity = Number(d.get(`qty_${i.sku}`) ?? 0);
      return quantity > 0 ? [{ sku: i.sku, quantity }] : [];
    });
    if (!chosen.length) return setState('none');
    setState('sending');
    try {
      const res = await fetch('/api/returns', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ order, sig, items: chosen, reason: d.get('reason'), note: d.get('note') || undefined }) });
      const body = await res.json().catch(() => undefined);
      setState(res.ok ? 'done' : body?.error === 'open' ? 'open' : body?.error === 'closed' ? 'closed' : 'error');
    } catch {
      setState('error');
    }
  };
  if (state === 'done') return <div className="notice notice-ok" role="status"><Icon name="check" size="sm" /> {r.sent}</div>;
  const problem = state === 'open' ? r.errOpen : state === 'closed' ? r.errClosed : state === 'error' ? r.errFailed : state === 'none' ? r.errNone : '';
  return (
    <form className="form-card" onSubmit={submit}>
      {problem ? <div className="notice" role="alert"><Icon name="info" size="sm" /> {problem}</div> : null}
      <h2>{r.which}</h2>
      {items.map((i) => (
        <div className="field" key={i.sku}>
          <label className="field-label" htmlFor={`qty_${i.sku}`}>{i.name}</label>
          <select className="select-input" id={`qty_${i.sku}`} name={`qty_${i.sku}`} defaultValue="0">
            {Array.from({ length: Math.min(i.quantity, 50) + 1 }, (_, n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      ))}
      <div className="field">
        <label className="field-label" htmlFor="return-reason">{r.reason}</label>
        <select className="select-input" id="return-reason" name="reason" required defaultValue="">
          <option value="" disabled>{r.choose}</option>
          {Object.entries(r.reasons).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      <div className="field"><label className="field-label" htmlFor="return-note">{r.note}</label><textarea className="textarea" id="return-note" name="note" rows={4} maxLength={2000} /></div>
      <button className="btn" disabled={state === 'sending'}>{state === 'sending' ? t.auth.working : r.send}</button>
      <p className="fine-print">{r.fine}</p>
    </form>
  );
}
