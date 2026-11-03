'use client';

import Link from 'next/link';
import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';
import { BUSINESS } from '@/lib/catalog';
import { US_STATES } from '@/lib/tax';
import { useStore } from './store';
import { Icon } from './ui';

export type PayPalConfig = { clientId: string; sandbox: boolean };
type SavedAddress = { id: string; recipient: string; line1: string; line2?: string; city: string; state: string; postalCode: string };
export type PaidOrder = { orderId: string; status: string; email: string };

type PayPalButtons = { render: (el: HTMLElement) => Promise<void>; close: () => Promise<void> };
type ButtonOptions = {
  style: Record<string, string>;
  onClick: (data: unknown, actions: { resolve: () => void; reject: () => void }) => void;
  createOrder: () => Promise<string>;
  onApprove: (data: { orderID: string }) => Promise<void>;
  onCancel: () => void;
  onError: () => void;
};
declare global {
  interface Window {
    paypal?: { Buttons: (options: ButtonOptions) => PayPalButtons };
  }
}

// Stops PayPal's own error handling once this screen has already told the customer what happened.
class Reported extends Error {}

export function PayPalCheckout({ config, onDone, onDestination }: { config: PayPalConfig; onDone: (order: PaidOrder) => void; onDestination: (d: { state: string; zip: string }) => void }) {
  const { cart, t, locale, href } = useStore();
  const l = t.checkout.live;
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [freight, setFreight] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const [account, setAccount] = useState<{ signedIn: boolean; email?: string; name?: string; addresses?: SavedAddress[]; termsDays?: number }>({ signedIn: false });
  const [placing, setPlacing] = useState(false);
  const { t: messages } = useStore();
  const placeOnTerms = async () => {
    const f = form.current;
    if (!f?.reportValidity()) return;
    const d = Object.fromEntries(new FormData(f).entries()) as Record<string, string>;
    setPlacing(true);
    setError('');
    const res = await fetch('/api/checkout/terms', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: d.email, locale, items: Object.entries(cart).map(([id, quantity]) => ({ id, quantity })), address: { name: d.name, line1: d.line1, line2: d.line2, city: d.city, state: d.state, postalCode: d.postalCode } }) }).catch(() => undefined);
    const body = await res?.json().catch(() => undefined);
    setPlacing(false);
    if (res?.ok) onDone({ orderId: body.orderId, status: body.status, email: d.email });
    else setError(body?.code === 'no_shipping' ? l.errNoShip : l.errStart);
  };
  const reportDestination = () => {
    const f = form.current;
    if (f) onDestination({ state: (f.elements.namedItem('state') as HTMLSelectElement).value, zip: (f.elements.namedItem('postalCode') as HTMLInputElement).value.trim() });
  };
  // A signed-in customer starts with their details filled in.
  useEffect(() => {
    let current = true;
    fetch('/api/account/checkout').then((r) => r.json()).then((body) => {
      if (!current || !body?.signedIn) return;
      setAccount(body);
      const f = form.current;
      if (!f) return;
      const set = (name: string, value?: string) => { const el = f.elements.namedItem(name) as HTMLInputElement | null; if (el && !el.value && value) el.value = value; };
      set('email', body.email);
      set('name', body.name);
    }).catch(() => {});
    return () => { current = false; };
  }, []);
  const useAddress = (id: string) => {
    const a = account.addresses?.find((x) => x.id === id);
    const f = form.current;
    if (!a || !f) return;
    const values: Record<string, string> = { name: a.recipient, line1: a.line1, line2: a.line2 ?? '', city: a.city, state: a.state, postalCode: a.postalCode };
    for (const [name, value] of Object.entries(values)) (f.elements.namedItem(name) as HTMLInputElement).value = value;
    reportDestination();
  };
  const holder = useRef<HTMLDivElement>(null);
  // The buttons render once, so their callbacks read the latest values from here.
  const latest = useRef({ cart, l, locale, onDone });
  useEffect(() => {
    latest.current = { cart, l, locale, onDone };
  });

  useEffect(() => {
    if (!ready || !holder.current || !window.paypal) return;
    const customer = () => {
      const d = Object.fromEntries(new FormData(form.current!).entries()) as Record<string, string>;
      return { email: d.email, saveAddress: d.saveAddress === 'on', address: { name: d.name, line1: d.line1, line2: d.line2, city: d.city, state: d.state, postalCode: d.postalCode } };
    };
    const fail = (message: string, isFreight = false): never => {
      setError(message);
      setFreight(isFreight);
      throw new Reported();
    };
    const buttons = window.paypal.Buttons({
      style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' },
      onClick(_data, actions) {
        setError('');
        setFreight(false);
        if (form.current?.reportValidity()) actions.resolve();
        else actions.reject();
      },
      async createOrder() {
        const { cart: items, l: text, locale: lang } = latest.current;
        const res = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ...customer(), locale: lang, items: Object.entries(items).map(([id, quantity]) => ({ id, quantity })) }),
        }).catch(() => undefined);
        const body = await res?.json().catch(() => undefined);
        if (res?.ok && body?.paypalOrderId) return body.paypalOrderId as string;
        if (res?.status === 429) return fail(text.errBusy);
        if (body?.code === 'freight') return fail(text.errFreight, true);
        if (body?.code === 'no_shipping') return fail(text.errNoShip, true);
        if (body?.code === 'stock') return fail(text.errStock);
        if (body?.code === 'unknown') return fail(text.errUnknown);
        return fail(text.errStart);
      },
      async onApprove({ orderID }) {
        const { l: text, onDone: done } = latest.current;
        const res = await fetch('/api/checkout/capture', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ paypalOrderId: orderID }),
        }).catch(() => undefined);
        const body = await res?.json().catch(() => undefined);
        if (res?.ok && (body?.status === 'paid' || body?.status === 'pending_payment')) {
          done({ orderId: body.orderId, status: body.status, email: customer().email });
          return;
        }
        // Only a decline is certain to be uncharged; anything else may have gone through.
        setError(body?.declined ? text.errDeclined : text.errCapture(BUSINESS.contactEmail));
      },
      onCancel() {
        setError(latest.current.l.cancelled);
      },
      onError() {
        setError((shown) => shown || latest.current.l.errStart);
      },
    });
    buttons.render(holder.current).catch(() => {});
    return () => {
      buttons.close().catch(() => {});
    };
  }, [ready]);

  const sdk = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(config.clientId)}&currency=USD&intent=capture&components=buttons&locale=${locale === 'es' ? 'es_US' : 'en_US'}`;
  return (
    <>
      <Script src={sdk} onReady={() => setReady(true)} onError={() => setError(l.errScript)} />
      {config.sandbox ? <div className="notice"><Icon name="lock" size="sm" /> <strong>{l.testStrong}</strong>{l.test}</div> : null}
      <h2 style={{ marginTop: 25 }}>{l.contactTitle}</h2>
      <form ref={form} onSubmit={(e) => e.preventDefault()}>
        <div className="field">
          <label className="field-label" htmlFor="checkout-email">{l.email}</label>
          <input id="checkout-email" className="text-input" name="email" type="email" autoComplete="email" maxLength={200} required />
        </div>
        <p style={{ fontSize: 13 }}>{l.emailHelp}</p>
        <h2 style={{ marginTop: 25 }}>{l.addressTitle}</h2>
        {account.addresses?.length ? (
          <div className="field">
            <label className="field-label" htmlFor="checkout-saved">{l.savedAddress}</label>
            <select id="checkout-saved" className="select-input" defaultValue="" onChange={(e) => useAddress(e.target.value)}>
              <option value="" disabled>{l.chooseAddress}</option>
              {account.addresses.map((a) => <option key={a.id} value={a.id}>{a.recipient}, {a.line1}, {a.city}</option>)}
            </select>
          </div>
        ) : null}
        <div className="form-grid">
          <div className="field full-width"><label className="field-label" htmlFor="checkout-name">{l.fullName}</label><input id="checkout-name" className="text-input" name="name" autoComplete="name" maxLength={120} required /></div>
          <div className="field full-width"><label className="field-label" htmlFor="checkout-line1">{l.line1}</label><input id="checkout-line1" className="text-input" name="line1" autoComplete="address-line1" maxLength={200} required /></div>
          <div className="field full-width"><label className="field-label" htmlFor="checkout-line2">{l.line2}</label><input id="checkout-line2" className="text-input" name="line2" autoComplete="address-line2" maxLength={200} /></div>
          <div className="field full-width"><label className="field-label" htmlFor="checkout-city">{l.city}</label><input id="checkout-city" className="text-input" name="city" autoComplete="address-level2" maxLength={120} required /></div>
          <div className="field">
            <label className="field-label" htmlFor="checkout-state">{l.state}</label>
            <select id="checkout-state" className="select-input" name="state" autoComplete="address-level1" required defaultValue="" onChange={reportDestination}>
              <option value="" disabled>{l.chooseState}</option>
              {US_STATES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
            </select>
          </div>
          <div className="field"><label className="field-label" htmlFor="checkout-zip">{l.zip}</label><input id="checkout-zip" className="text-input" name="postalCode" autoComplete="postal-code" inputMode="numeric" pattern="[0-9]{5}(-[0-9]{4})?" required onChange={reportDestination} /></div>
        </div>
        {account.signedIn ? <label className="check-line"><input type="checkbox" name="saveAddress" /> {l.saveAddress}</label> : null}
      </form>
      <h2 style={{ marginTop: 25 }}>{l.payTitle}</h2>
      <p style={{ fontSize: 13 }}>{l.payHelp}</p>
      {error ? (
        <div className="notice" role="alert" style={{ marginBottom: 14 }}>
          <Icon name="info" size="sm" /> {error}
          {freight ? <> <Link className="text-link" href={href('/quote')}>{l.freightLink} <Icon name="arrow" size="sm" /></Link></> : null}
        </div>
      ) : null}
      <div id="paypal-buttons" ref={holder} />
      {account.termsDays ? <button className="btn btn-light btn-block" type="button" style={{ marginTop: 12 }} disabled={placing} onClick={placeOnTerms}>{messages.sales.payOnTerms(account.termsDays)}</button> : null}
    </>
  );
}
