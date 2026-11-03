'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { BUSINESS, money } from '@/lib/catalog';
import { taxCents } from '@/lib/tax';
import { PayPalCheckout, type PaidOrder, type PayPalConfig } from './paypal-checkout';
import { ProductCard } from './product';
import { useStore } from './store';
import { EmptyState, Icon, PageHead } from './ui';

export function WishlistItems() {
  const { wishlist, hydrated, products, t, locale } = useStore();
  if (!hydrated) return null;
  const list = products.filter((p) => wishlist.includes(p.id));
  return list.length
    ? <div className="products-grid">{list.map((p) => <ProductCard key={p.id} product={p} />)}</div>
    : <EmptyState locale={locale} title={t.wishlist.emptyTitle} body={t.wishlist.emptyBody} />;
}

export function CheckoutView({ paypal, taxRates = {} }: { paypal?: PayPalConfig; taxRates?: Record<string, number> }) {
  const { cart, total, hydrated, getProduct, t, href, locale, clearCart } = useStore();
  const c = t.checkout;
  const l = c.live;
  const [paid, setPaid] = useState<PaidOrder>();
  const [taxState, setTaxState] = useState('');
  if (paid) {
    return (
      <main id="main-content">
        <PageHead locale={locale} title={paid.status === 'paid' ? l.doneTitle : l.pendingTitle} desc={paid.status === 'paid' ? l.doneDesc : l.pendingDesc} crumbs={l.crumb} />
        <div className="content-narrow">
          <div className="form-card" role="status">
            <h2>{l.doneRef}: {paid.orderId.slice(0, 8).toUpperCase()}</h2>
            <p>{l.doneBody(paid.email)}</p>
            <Link className="btn" href={href('/shop')}>{c.keep} <Icon name="arrow" size="sm" /></Link>
          </div>
        </div>
      </main>
    );
  }
  const items = Object.entries(cart).filter(([id]) => getProduct(id));
  if (!hydrated) return <main id="main-content"><PageHead locale={locale} title={c.title} desc={c.desc} crumbs={c.crumb} /></main>;
  if (!items.length) {
    return (
      <main id="main-content">
        <PageHead locale={locale} title={c.emptyPage} desc={c.emptyDesc} crumbs={c.emptyCrumb} />
        <div className="content-narrow"><EmptyState locale={locale} title={c.emptyTitle} body={c.emptyBody} /></div>
      </main>
    );
  }
  const lines = items.map(([id, qty]) => {
    const p = getProduct(id)!;
    return <div className="checkout-line" key={id}><span>{p.name} <span className="muted">× {qty}</span></span><strong>{money(p.price * qty)}</strong></div>;
  });
  if (paypal) {
    const tax = taxCents(Math.round(total * 100), taxRates[taxState] ?? 0) / 100;
    return (
      <main id="main-content">
        <PageHead locale={locale} title={l.title} desc={l.desc} crumbs={l.crumb} />
        <div className="container checkout-grid">
          <div className="form-card">
            <PayPalCheckout config={paypal} onStateChange={setTaxState} onDone={(order) => { setPaid(order); clearCart(); }} />
          </div>
          <aside className="checkout-summary">
            <h3>{l.summary}</h3>
            {lines}
            <div className="checkout-line"><span>{l.tax}</span><strong>{taxState ? money(tax) : '—'}</strong></div>
            <div className="checkout-total"><span>{l.total}</span><span>{money(total + tax)}</span></div>
            {taxState ? null : <p className="mini muted">{l.taxHint}</p>}
            {paypal.sandbox ? <p className="mini muted">{l.noExtras}</p> : null}
          </aside>
        </div>
      </main>
    );
  }
  return (
    <main id="main-content">
      <PageHead locale={locale} title={c.title} desc={c.desc} crumbs={c.crumb} />
      <div className="container checkout-grid">
        <div className="form-card">
          <div className="notice"><Icon name="lock" size="sm" /> <strong>{c.safeStrong}</strong>{c.safe}</div>
          <h2 style={{ marginTop: 25 }}>{c.how}</h2>
          <p style={{ fontSize: 13 }}>{c.howText}</p>
          <div className="setup-checks">
            <div className="setup-check"><Icon name="check" /> {c.s1} <strong>{c.working}</strong></div>
            <div className="setup-check pending"><Icon name="clock" /> {c.s2} <strong>{c.notConnected}</strong></div>
            <div className="setup-check pending"><Icon name="clock" /> {c.s3} <strong>{c.notConnected}</strong></div>
            <div className="setup-check pending"><Icon name="clock" /> {c.s4} <strong>{c.notConnected}</strong></div>
          </div>
          <div className="demo-checkout-actions">
            <Link className="btn" href={href('/setup')}>{c.requirements} <Icon name="arrow" size="sm" /></Link>
            <Link className="btn btn-light" href={href('/shop')}>{c.keep} <Icon name="arrow" size="sm" /></Link>
          </div>
        </div>
        <aside className="checkout-summary">
          <h3>{c.summary}</h3>
          {lines}
          <div className="checkout-total"><span>{c.subtotal}</span><span>{money(total)}</span></div>
          <p className="mini muted">{c.noOrder}</p>
          <div className="notice"><Icon name="shield" size="sm" /> {c.paymentNote}</div>
        </aside>
      </div>
    </main>
  );
}

const TOPICS = ['Product question', 'Freight shipping', 'Equipment compatibility', 'Bulk order', 'Something else'];

export function QuoteView() {
  const { toast, products, t, locale } = useStore();
  const q = t.quote;
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState('');
  const [error, setError] = useState('');

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sending) return;
    const form = e.currentTarget;
    const d = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
    setSending(true);
    setError('');
    setSentTo('');
    try {
      const res = await fetch('/api/quotes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...d, locale }) });
      if (res.ok) {
        form.reset();
        setSentTo(d.email);
        toast(q.toast);
      } else {
        setError(res.status === 429 ? q.errBusy : res.status === 400 ? q.errInvalid : q.errDown(BUSINESS.contactEmail));
      }
    } catch {
      setError(q.errDown(BUSINESS.contactEmail));
    } finally {
      setSending(false);
    }
  };

  const composeEmail = (f: HTMLFormElement | null) => {
    if (!f || !f.reportValidity()) return;
    const d = Object.fromEntries(new FormData(f).entries()) as Record<string, string>;
    const m = q.mail;
    const topic = q.topics[d.topic] || d.topic;
    const subject = 'AGROTIRES — ' + (topic || m.subjectFallback);
    const body = [`${m.name}: ${d.name || ''}`, `${m.reply}: ${d.email || ''}`, `${m.phone}: ${d.phone || m.none}`, `${m.zip}: ${d.zip || m.none}`, `${m.type}: ${topic || ''}`, `${m.product}: ${d.product || m.notSpecified}`, '', `${m.message}:`, d.message || ''].join('\n');
    window.location.href = 'mailto:' + BUSINESS.contactEmail + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  };

  return (
    <div className="container contact-grid">
      <div>
        <div className="eyebrow">{q.eyebrow}</div>
        <h2 style={{ margin: '10px 0 18px' }}>{q.h2a}<br />{q.h2b}</h2>
        <p>{q.intro}</p>
        <div className="contact-card">
          <h3><Icon name="info" size="sm" /> {q.howTitle}</h3>
          <p>{q.howText}</p>
          <a className="contact-email-inline" href={`mailto:${BUSINESS.contactEmail}`}>{BUSINESS.contactEmail}</a>
        </div>
      </div>
      <div className="form-card">
        <h2>{q.formTitle}</h2>
        <p style={{ fontSize: 12 }}>{q.required}</p>
        <form id="quote-form" onSubmit={submit}>
          <input name="website" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1 }} />
          <div className="form-grid">
            <div className="field"><label className="field-label" htmlFor="quote-name">{q.name}</label><input id="quote-name" className="text-input" name="name" required autoComplete="name" /></div>
            <div className="field"><label className="field-label" htmlFor="quote-email">{q.email}</label><input id="quote-email" className="text-input" name="email" type="email" autoComplete="email" required /></div>
            <div className="field"><label className="field-label" htmlFor="quote-phone">{q.phone}</label><input id="quote-phone" className="text-input" name="phone" type="tel" autoComplete="tel" /></div>
            <div className="field"><label className="field-label" htmlFor="quote-zip">{q.zip}</label><input id="quote-zip" className="text-input" name="zip" inputMode="numeric" pattern="[0-9]{5}(-[0-9]{4})?" placeholder={q.zipPh} /></div>
            <div className="field full-width">
              <label className="field-label" htmlFor="quote-topic">{q.need}</label>
              <select className="select-input" id="quote-topic" name="topic" required defaultValue="">
                <option value="">{q.choose}</option>
                {TOPICS.map((topic) => <option key={topic} value={topic}>{q.topics[topic]}</option>)}
              </select>
            </div>
            <div className="field full-width">
              <label className="field-label" htmlFor="quote-product">{q.product}</label>
              <select className="select-input" name="product" id="quote-product" defaultValue="">
                <option value="">{q.selectProduct}</option>
                {products.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>
            <div className="field full-width"><label className="field-label" htmlFor="quote-message">{q.more}</label><textarea className="textarea" id="quote-message" name="message" rows={5} required placeholder={q.morePh} /></div>
          </div>
          <div className="quote-actions">
            <button className="btn btn-block" type="submit" disabled={sending} aria-busy={sending}>{sending ? q.sending : q.send} <Icon name="arrow" size="sm" /></button>
            <button className="btn btn-light btn-block" type="button" onClick={(e) => composeEmail(e.currentTarget.form)}>{q.compose} <Icon name="mail" size="sm" /></button>
          </div>
          {error ? <div className="notice" role="alert" style={{ marginTop: 14 }}><Icon name="info" size="sm" /> {error}</div> : null}
          {sentTo ? <div className="quote-card" role="status" style={{ marginTop: 14 }}><strong>{q.sentTitle}</strong><small>{q.sentBody(sentTo)}</small></div> : null}
          <p className="fine-print">{q.fine}</p>
        </form>
      </div>
    </div>
  );
}
