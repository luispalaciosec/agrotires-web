'use client';

import Script from 'next/script';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { BUSINESS, money } from '@/lib/catalog';
import type { PayPalConfig } from './paypal-checkout';
import { useStore } from './store';
import { Icon } from './ui';

export function PayLinkButtons({ token, config }: { token: string; config: PayPalConfig }) {
  const { t, locale } = useStore();
  const s = t.sales;
  const l = t.checkout.live;
  const holder = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<string>();

  useEffect(() => {
    if (!ready || !holder.current || !window.paypal) return;
    const buttons = window.paypal.Buttons({
      style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' },
      onClick: (_d, actions) => { setError(''); actions.resolve(); },
      async createOrder() {
        const res = await fetch(`/api/pay/${encodeURIComponent(token)}`, { method: 'POST' });
        const body = await res.json().catch(() => undefined);
        if (res.ok && body?.paypalOrderId) return body.paypalOrderId as string;
        setError(l.errStart);
        throw new Error('Could not start payment');
      },
      async onApprove({ orderID }) {
        const res = await fetch('/api/checkout/capture', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ paypalOrderId: orderID }) }).catch(() => undefined);
        const body = await res?.json().catch(() => undefined);
        if (res?.ok && (body?.status === 'paid' || body?.status === 'pending_payment')) setDone(body.status);
        else setError(body?.declined ? l.errDeclined : l.errCapture(BUSINESS.contactEmail));
      },
      onCancel: () => setError(l.cancelled),
      onError: () => setError((shown) => shown || l.errStart),
    });
    buttons.render(holder.current).catch(() => {});
    return () => { buttons.close().catch(() => {}); };
  }, [ready, token, l]);

  if (done) return <div className="notice notice-ok" role="status"><Icon name="check" size="sm" /> {done === 'paid' ? s.payDone : l.pendingDesc}</div>;
  const sdk = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(config.clientId)}&currency=USD&intent=capture&components=buttons&locale=${locale === 'es' ? 'es_US' : 'en_US'}`;
  return (
    <>
      <Script src={sdk} onReady={() => setReady(true)} onError={() => setError(l.errScript)} />
      {config.sandbox ? <div className="notice"><Icon name="lock" size="sm" /> <strong>{l.testStrong}</strong>{l.test}</div> : null}
      {error ? <div className="notice" role="alert"><Icon name="info" size="sm" /> {error}</div> : null}
      <div id="paypal-buttons" ref={holder} />
    </>
  );
}

export function ReviewForm({ order, product, sig }: { order: string; product: string; sig: string }) {
  const { t, locale } = useStore();
  const s = t.sales;
  const [rating, setRating] = useState(5);
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'duplicate' | 'error'>('idle');
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    setState('sending');
    try {
      const res = await fetch('/api/reviews', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ order, product, sig, rating, author: d.get('author'), body: d.get('body'), locale }) });
      setState(res.ok ? 'done' : res.status === 409 ? 'duplicate' : 'error');
    } catch {
      setState('error');
    }
  };
  if (state === 'done') return <div className="notice notice-ok" role="status"><Icon name="check" size="sm" /> {s.reviewThanks}</div>;
  return (
    <form className="form-card" onSubmit={submit}>
      {state === 'duplicate' ? <div className="notice" role="alert"><Icon name="info" size="sm" /> {s.reviewDuplicate}</div> : null}
      {state === 'error' ? <div className="notice" role="alert"><Icon name="info" size="sm" /> {s.reviewError}</div> : null}
      <fieldset className="stars-input">
        <legend className="field-label">{s.reviewRating}</legend>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className={n <= rating ? 'on' : ''}>
            <input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} />
            <span aria-hidden="true">★</span><span className="sr-only">{n}</span>
          </label>
        ))}
      </fieldset>
      <div className="field"><label className="field-label" htmlFor="review-author">{s.reviewName}</label><input className="text-input" id="review-author" name="author" maxLength={60} required /></div>
      <div className="field"><label className="field-label" htmlFor="review-body">{s.reviewBody}</label><textarea className="textarea" id="review-body" name="body" rows={5} minLength={10} maxLength={2000} required /></div>
      <button className="btn" disabled={state === 'sending'}>{state === 'sending' ? t.auth.working : s.reviewSend}</button>
      <p className="fine-print">{s.reviewFine}</p>
    </form>
  );
}

export function UnsubscribeButton({ email, sig }: { email: string; sig: string }) {
  const s = useStore().t.sales;
  const [state, setState] = useState<'idle' | 'done' | 'error'>('idle');
  if (state === 'done') return <div className="notice notice-ok" role="status"><Icon name="check" size="sm" /> {s.unsubDone}</div>;
  return (
    <>
      {state === 'error' ? <div className="notice" role="alert"><Icon name="info" size="sm" /> {s.unsubError}</div> : null}
      <button
        className="btn"
        type="button"
        onClick={async () => {
          const res = await fetch('/api/unsubscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ e: email, s: sig }) }).catch(() => undefined);
          setState(res?.ok ? 'done' : 'error');
        }}
      >
        {s.unsubButton}
      </button>
    </>
  );
}

export function VolumePrices({ tiers }: { tiers: { minQty: number; price: number }[] }) {
  const s = useStore().t.sales;
  return <ul className="volume-prices" aria-label={s.volumeTitle}>{tiers.map((v) => <li key={v.minQty}>{s.volumeTier(v.minQty, money(v.price))}</li>)}</ul>;
}
