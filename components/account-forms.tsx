'use client';

import { startTransition, useActionState, useState, type FormEvent } from 'react';
import { saveMachineAction, applyB2bAction, changePasswordAction, forgotPasswordAction, saveAddressAction, signInAction, signUpAction, type AccountState } from '@/app/[locale]/account/actions';
import { US_STATES } from '@/lib/tax';
import { useStore } from './store';
import { Icon } from './ui';

const empty: AccountState = {};

const submitWith = (action: (data: FormData) => void) => (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const data = new FormData(e.currentTarget);
  startTransition(() => action(data));
};

function Feedback({ state }: { state: AccountState }) {
  const a = useStore().t.auth;
  if (state.error) return <div className="notice" role="alert"><Icon name="info" size="sm" /> {a.errors[state.error]}</div>;
  if (state.notice) return <div className="notice notice-ok" role="status"><Icon name="check" size="sm" /> {a.notices[state.notice]}</div>;
  return null;
}

function Field({ id, name, label, ...rest }: { id: string; name: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>{label}</label>
      <input className="text-input" id={id} name={name} {...rest} />
    </div>
  );
}

export function AuthForms() {
  const { t, locale } = useStore();
  const a = t.auth;
  const [mode, setMode] = useState<'in' | 'up' | 'forgot'>('in');
  const [inState, inAction, inPending] = useActionState(signInAction.bind(null, locale), empty);
  const [upState, upAction, upPending] = useActionState(signUpAction.bind(null, locale), empty);
  const [resetState, resetAction, resetPending] = useActionState(forgotPasswordAction.bind(null, locale), empty);
  return (
    <div className="form-card auth-card">
      {mode !== 'forgot' ? (
        <div className="tabs" role="tablist" aria-label={a.title}>
          <button type="button" role="tab" aria-selected={mode === 'in'} className={`tab ${mode === 'in' ? 'active' : ''}`} onClick={() => setMode('in')}>{a.signIn}</button>
          <button type="button" role="tab" aria-selected={mode === 'up'} className={`tab ${mode === 'up' ? 'active' : ''}`} onClick={() => setMode('up')}>{a.signUp}</button>
        </div>
      ) : null}
      {mode === 'in' ? (
        <form onSubmit={submitWith(inAction)}>
          <Feedback state={inState} />
          <Field id="in-email" name="email" type="email" label={a.email} autoComplete="email" required />
          <Field id="in-password" name="password" type="password" label={a.password} autoComplete="current-password" required />
          <button className="btn btn-block" disabled={inPending}>{inPending ? a.working : a.signIn} <Icon name="arrow" size="sm" /></button>
          <button className="text-link auth-link" type="button" onClick={() => setMode('forgot')}>{a.forgot}</button>
        </form>
      ) : null}
      {mode === 'up' ? (
        <form onSubmit={submitWith(upAction)}>
          <Feedback state={upState} />
          <Field id="up-name" name="name" label={a.name} autoComplete="name" maxLength={120} required />
          <Field id="up-email" name="email" type="email" label={a.email} autoComplete="email" required />
          <Field id="up-password" name="password" type="password" label={a.newPassword} autoComplete="new-password" minLength={10} required />
          <button className="btn btn-block" disabled={upPending}>{upPending ? a.working : a.signUp} <Icon name="arrow" size="sm" /></button>
          <p className="fine-print">{a.signUpFine}</p>
        </form>
      ) : null}
      {mode === 'forgot' ? (
        <form onSubmit={submitWith(resetAction)}>
          <h2>{a.forgot}</h2>
          <Feedback state={resetState} />
          <Field id="reset-email" name="email" type="email" label={a.email} autoComplete="email" required />
          <button className="btn btn-block" disabled={resetPending}>{resetPending ? a.working : a.sendReset}</button>
          <button className="text-link auth-link" type="button" onClick={() => setMode('in')}>{a.back}</button>
        </form>
      ) : null}
    </div>
  );
}

export function PasswordForm() {
  const a = useStore().t.auth;
  const [state, action, pending] = useActionState(changePasswordAction, empty);
  return (
    <form className="form-card auth-card" onSubmit={submitWith(action)}>
      <h2>{a.changePassword}</h2>
      <Feedback state={state} />
      <Field id="new-password" name="password" type="password" label={a.newPassword} autoComplete="new-password" minLength={10} required />
      <Field id="confirm-password" name="confirm" type="password" label={a.confirmPassword} autoComplete="new-password" minLength={10} required />
      <button className="btn btn-block" disabled={pending}>{pending ? a.working : a.changePassword}</button>
    </form>
  );
}

export function AddressForm() {
  const { t, locale } = useStore();
  const a = t.auth;
  const [state, action, pending] = useActionState(saveAddressAction.bind(null, locale), empty);
  return (
    <details className="account-add">
      <summary className="text-link">{a.addAddress}</summary>
      <form onSubmit={submitWith(action)}>
        <Feedback state={state} />
        <div className="form-grid">
          <div className="full-width"><Field id="ad-recipient" name="recipient" label={a.recipient} autoComplete="name" required /></div>
          <div className="full-width"><Field id="ad-line1" name="line1" label={t.checkout.live.line1} autoComplete="address-line1" required /></div>
          <div className="full-width"><Field id="ad-line2" name="line2" label={t.checkout.live.line2} autoComplete="address-line2" /></div>
          <Field id="ad-city" name="city" label={t.checkout.live.city} autoComplete="address-level2" required />
          <div className="field">
            <label className="field-label" htmlFor="ad-state">{t.checkout.live.state}</label>
            <select id="ad-state" className="select-input" name="state" required defaultValue="">
              <option value="" disabled>{t.checkout.live.chooseState}</option>
              {US_STATES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
            </select>
          </div>
          <Field id="ad-zip" name="postalCode" label={t.checkout.live.zip} autoComplete="postal-code" inputMode="numeric" pattern="[0-9]{5}(-[0-9]{4})?" required />
          <Field id="ad-phone" name="phone" type="tel" label={t.quote.phone} autoComplete="tel" />
        </div>
        <button className="btn" disabled={pending}>{pending ? a.working : a.saveAddress}</button>
      </form>
    </details>
  );
}

export function MachineForm() {
  const { t, locale } = useStore();
  const m = t.extras;
  const [state, action, pending] = useActionState(saveMachineAction.bind(null, locale), empty);
  return (
    <details className="account-add">
      <summary className="text-link">{m.addMachine}</summary>
      <form key={state.notice} onSubmit={submitWith(action)}>
        <Feedback state={state} />
        <div className="form-grid">
          <Field id="m-make" name="make" label={m.make} maxLength={80} required />
          <Field id="m-model" name="model" label={m.model} maxLength={80} required />
          <Field id="m-year" name="year" label={m.year} inputMode="numeric" maxLength={4} />
        </div>
        <button className="btn" disabled={pending}>{pending ? t.auth.working : m.saveMachine}</button>
      </form>
    </details>
  );
}

export function B2bForm() {
  const { t, locale } = useStore();
  const s = t.sales;
  const [state, action, pending] = useActionState(applyB2bAction.bind(null, locale), empty);
  if (state.notice) return <div className="notice notice-ok" role="status"><Icon name="check" size="sm" /> {s.b2bSent}</div>;
  return (
    <form onSubmit={submitWith(action)}>
      <Feedback state={state} />
      <Field id="b2b-company" name="company" label={s.b2bCompany} autoComplete="organization" maxLength={160} required />
      <Field id="b2b-tax" name="taxId" label={s.b2bTaxId} maxLength={60} />
      <div className="field"><label className="field-label" htmlFor="b2b-note">{s.b2bNote}</label><textarea className="textarea" id="b2b-note" name="note" rows={3} maxLength={1000} /></div>
      <button className="btn" disabled={pending}>{pending ? t.auth.working : s.b2bApply}</button>
    </form>
  );
}

export function BuyAgain({ items }: { items: { id: string; quantity: number }[] }) {
  const { addToCart, getProduct, setCartOpen, t } = useStore();
  const available = items.filter((i) => getProduct(i.id));
  if (!available.length) return null;
  return (
    <button
      className="btn btn-light"
      type="button"
      onClick={() => {
        available.forEach((i) => addToCart(i.id, i.quantity));
        setCartOpen(true);
      }}
    >
      {t.auth.buyAgain} <Icon name="cart" size="sm" />
    </button>
  );
}
