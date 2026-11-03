'use client';

import Link from 'next/link';
import { BUSINESS, money } from '@/lib/catalog';
import { LOCALE_TAGS } from '@/lib/i18n';
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

export function CheckoutView() {
  const { cart, total, hydrated, getProduct, t, href, locale } = useStore();
  const c = t.checkout;
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
          {items.map(([id, qty]) => {
            const p = getProduct(id)!;
            return <div className="checkout-line" key={id}><span>{p.name} <span className="muted">× {qty}</span></span><strong>{money(p.price * qty)}</strong></div>;
          })}
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
  const { quotes, hydrated, saveQuote, toast, products, t, href, locale } = useStore();
  const q = t.quote;

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
          <h3><Icon name="info" size="sm" /> {q.previewTitle}</h3>
          <p>{q.previewA}<strong>{q.previewStrong}</strong>{q.previewB(BUSINESS.contactEmail)}</p>
          <a className="contact-email-inline" href={`mailto:${BUSINESS.contactEmail}`}>{BUSINESS.contactEmail}</a>
          <Link className="text-link" href={href('/setup')}>{q.launch} <Icon name="arrow" size="sm" /></Link>
        </div>
        {hydrated && quotes.length ? (
          <div className="quote-list">
            <h3 style={{ fontSize: 17, margin: '20px 0 0' }}>{q.savedTitle}</h3>
            {quotes.slice().reverse().slice(0, 4).map((saved, i) => (
              <div className="quote-card" key={i}><strong>{q.topics[saved.topic] || saved.topic}</strong><small>{saved.date} · {q.savedNote}</small></div>
            ))}
          </div>
        ) : null}
      </div>
      <div className="form-card">
        <h2>{q.formTitle}</h2>
        <p style={{ fontSize: 12 }}>{q.required}</p>
        <form id="quote-form" onSubmit={(e) => {
          e.preventDefault();
          const d = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;
          saveQuote({ date: new Date().toLocaleString(LOCALE_TAGS[locale]), topic: d.topic, name: d.name, email: d.email, phone: d.phone, zip: d.zip, product: d.product, message: d.message });
          toast(q.toast);
          e.currentTarget.reset();
        }}>
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
            <button className="btn btn-block" type="button" onClick={(e) => composeEmail(e.currentTarget.form)}>{q.compose} <Icon name="mail" size="sm" /></button>
            <button className="btn btn-light btn-block" type="submit">{q.draft} <Icon name="file" size="sm" /></button>
          </div>
          <p className="fine-print">{q.fine}</p>
        </form>
      </div>
    </div>
  );
}
