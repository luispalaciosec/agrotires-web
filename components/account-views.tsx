'use client';

import Link from 'next/link';
import { BUSINESS, money } from '@/lib/catalog';
import { ProductCard } from './product';
import { useStore } from './store';
import { EmptyState, Icon, PageHead } from './ui';

export function WishlistItems() {
  const { wishlist, hydrated, products } = useStore();
  if (!hydrated) return null;
  const list = products.filter((p) => wishlist.includes(p.id));
  return list.length
    ? <div className="products-grid">{list.map((p) => <ProductCard key={p.id} product={p} />)}</div>
    : <EmptyState title="Nothing saved yet" body="Tap the heart on any product to add it here." />;
}

export function CheckoutView() {
  const { cart, total, hydrated, getProduct } = useStore();
  const items = Object.entries(cart).filter(([id]) => getProduct(id));
  if (!hydrated) return <main id="main-content"><PageHead title="Checkout preview." desc="Review the intended customer checkout experience. Real payment collection is disabled in this prototype." crumbs="Demo checkout" /></main>;
  if (!items.length) {
    return (
      <main id="main-content">
        <PageHead title="Demo checkout" desc="Your cart is empty." crumbs="Checkout" />
        <div className="content-narrow"><EmptyState title="Your cart is empty" body="Browse sample products and add a few to your cart." /></div>
      </main>
    );
  }
  return (
    <main id="main-content">
      <PageHead title="Checkout preview." desc="Review the intended customer checkout experience. Real payment collection is disabled in this prototype." crumbs="Demo checkout" />
      <div className="container checkout-grid">
        <div className="form-card">
          <div className="notice"><Icon name="lock" size="sm" /> <strong>Safe demo mode:</strong> This form does not accept or process payment. Please do not enter real personal or payment information.</div>
          <h2 style={{ marginTop: 25 }}>How checkout will work</h2>
          <p style={{ fontSize: 13 }}>In the production store, customers will be able to continue as guests, select available shipping methods, see calculated tax, and pay through a secure provider.</p>
          <div className="setup-checks">
            <div className="setup-check"><Icon name="check" /> Product selection and cart calculations <strong>Demo working</strong></div>
            <div className="setup-check pending"><Icon name="clock" /> Secure customer address capture <strong>Not connected</strong></div>
            <div className="setup-check pending"><Icon name="clock" /> Real parcel and freight shipping rates <strong>Not connected</strong></div>
            <div className="setup-check pending"><Icon name="clock" /> Tax and secure payment processing <strong>Not connected</strong></div>
          </div>
          <div className="demo-checkout-actions">
            <Link className="btn" href="/setup">View launch requirements <Icon name="arrow" size="sm" /></Link>
            <Link className="btn btn-light" href="/shop">Keep exploring <Icon name="arrow" size="sm" /></Link>
          </div>
        </div>
        <aside className="checkout-summary">
          <h3>Demo order summary</h3>
          {items.map(([id, qty]) => {
            const p = getProduct(id)!;
            return <div className="checkout-line" key={id}><span>{p.name} <span className="muted">× {qty}</span></span><strong>{money(p.price * qty)}</strong></div>;
          })}
          <div className="checkout-total"><span>Sample subtotal</span><span>{money(total)}</span></div>
          <p className="mini muted">Shipping and tax not calculated. No order will be placed.</p>
          <div className="notice"><Icon name="shield" size="sm" /> Payment functionality will be enabled only after verified merchant, tax and delivery configuration.</div>
        </aside>
      </div>
    </main>
  );
}

export function QuoteView() {
  const { quotes, hydrated, saveQuote, toast, products } = useStore();

  const composeEmail = (f: HTMLFormElement | null) => {
    if (!f || !f.reportValidity()) return;
    const d = Object.fromEntries(new FormData(f).entries()) as Record<string, string>;
    const subject = 'AGROTIRES — ' + (d.topic || 'Product inquiry');
    const body = [`Name: ${d.name || ''}`, `Reply email: ${d.email || ''}`, `Phone: ${d.phone || 'Not provided'}`, `Delivery ZIP: ${d.zip || 'Not provided'}`, `Inquiry type: ${d.topic || ''}`, `Product: ${d.product || 'Not specified'}`, '', 'Message:', d.message || ''].join('\n');
    window.location.href = 'mailto:' + BUSINESS.contactEmail + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  };

  return (
    <div className="container contact-grid">
      <div>
        <div className="eyebrow">LET&apos;S MAKE IT EASY</div>
        <h2 style={{ margin: '10px 0 18px' }}>Big question?<br />Start right here.</h2>
        <p>Tell us a little about what you need. Create an email to the AGROTIRES team with the information needed to discuss a product or freight request.</p>
        <div className="contact-card">
          <h3><Icon name="info" size="sm" /> Preview mode is active</h3>
          <p>Save a local demo draft or choose <strong>Compose email to AGROTIRES</strong> to open your email application with a prefilled message addressed to {BUSINESS.contactEmail}. You must review it and press Send yourself. No website backend sends emails automatically.</p>
          <a className="contact-email-inline" href={`mailto:${BUSINESS.contactEmail}`}>{BUSINESS.contactEmail}</a>
          <Link className="text-link" href="/setup">See what launch requires <Icon name="arrow" size="sm" /></Link>
        </div>
        {hydrated && quotes.length ? (
          <div className="quote-list">
            <h3 style={{ fontSize: 17, margin: '20px 0 0' }}>Your locally saved demo inquiries</h3>
            {quotes.slice().reverse().slice(0, 4).map((q, i) => (
              <div className="quote-card" key={i}><strong>{q.topic}</strong><small>{q.date} · Stored only on this device</small></div>
            ))}
          </div>
        ) : null}
      </div>
      <div className="form-card">
        <h2>Prepare an inquiry</h2>
        <p style={{ fontSize: 12 }}>Fields marked * are required.</p>
        <form id="quote-form" onSubmit={(e) => {
          e.preventDefault();
          const d = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;
          saveQuote({ date: new Date().toLocaleString('en-US'), topic: d.topic, name: d.name, email: d.email, phone: d.phone, zip: d.zip, product: d.product, message: d.message });
          toast('Demo inquiry saved locally — not sent');
          e.currentTarget.reset();
        }}>
          <div className="form-grid">
            <div className="field"><label className="field-label" htmlFor="quote-name">Full name *</label><input id="quote-name" className="text-input" name="name" required autoComplete="name" /></div>
            <div className="field"><label className="field-label" htmlFor="quote-email">Email address *</label><input id="quote-email" className="text-input" name="email" type="email" autoComplete="email" required /></div>
            <div className="field"><label className="field-label" htmlFor="quote-phone">Phone number</label><input id="quote-phone" className="text-input" name="phone" type="tel" autoComplete="tel" /></div>
            <div className="field"><label className="field-label" htmlFor="quote-zip">Delivery ZIP code</label><input id="quote-zip" className="text-input" name="zip" inputMode="numeric" pattern="[0-9]{5}(-[0-9]{4})?" placeholder="e.g. 50301" /></div>
            <div className="field full-width">
              <label className="field-label" htmlFor="quote-topic">What do you need? *</label>
              <select className="select-input" id="quote-topic" name="topic" required defaultValue="">
                <option value="">Choose an inquiry type</option>
                <option>Product question</option><option>Freight shipping</option><option>Equipment compatibility</option><option>Bulk order</option><option>Something else</option>
              </select>
            </div>
            <div className="field full-width">
              <label className="field-label" htmlFor="quote-product">Product of interest</label>
              <select className="select-input" name="product" id="quote-product" defaultValue="">
                <option value="">Select a sample product (optional)</option>
                {products.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>
            <div className="field full-width"><label className="field-label" htmlFor="quote-message">Tell us more *</label><textarea className="textarea" id="quote-message" name="message" rows={5} required placeholder="Part number, product requirements, equipment details, or freight questions..." /></div>
          </div>
          <div className="quote-actions">
            <button className="btn btn-block" type="button" onClick={(e) => composeEmail(e.currentTarget.form)}>Compose email to AGROTIRES <Icon name="mail" size="sm" /></button>
            <button className="btn btn-light btn-block" type="submit">Save demo draft locally <Icon name="file" size="sm" /></button>
          </div>
          <p className="fine-print">The email button opens your mail app; you must click Send there. The draft button stores details only on this device. Avoid submitting payment or sensitive personal information.</p>
        </form>
      </div>
    </div>
  );
}
