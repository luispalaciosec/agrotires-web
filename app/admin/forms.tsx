'use client';

import { startTransition, useActionState, type FormEvent } from 'react';
import { PRODUCT_IMAGES, categories } from '@/lib/catalog';
import type { StoredProduct } from '@/lib/server/store';
import { deleteProductAction, importProductsAction, loginAction, saveProductAction, type FormState } from './actions';

const empty: FormState = {};

function Messages({ state }: { state: FormState }) {
  return (
    <>
      {state.error ? <div className="admin-error" role="alert">{state.error}</div> : null}
      {state.errors ? <div className="admin-error" role="alert"><ul>{state.errors.map((e) => <li key={e}>{e}</li>)}</ul></div> : null}
      {state.notice ? <div className="admin-ok" role="status">{state.notice}</div> : null}
    </>
  );
}

export function LoginForm({ withEmail }: { withEmail: boolean }) {
  const [state, action, pending] = useActionState(loginAction, empty);
  return (
    <form action={action}>
      <Messages state={state} />
      {withEmail ? (
        <div className="field">
          <label className="field-label" htmlFor="email">Email</label>
          <input className="text-input" id="email" name="email" type="email" autoComplete="username" required autoFocus />
        </div>
      ) : null}
      <div className="field">
        <label className="field-label" htmlFor="password">Password</label>
        <input className="text-input" id="password" name="password" type="password" autoComplete="current-password" required autoFocus={!withEmail} />
      </div>
      <button className="btn btn-block" disabled={pending}>Sign in</button>
    </form>
  );
}

function Text({ name, label, value, type = 'text', full, ...rest }: { name: string; label: string; value?: string | number | null; type?: string; full?: boolean; required?: boolean; step?: string; min?: string }) {
  return (
    <div className={`field ${full ? 'full-width' : ''}`}>
      <label className="field-label" htmlFor={name}>{label}</label>
      <input className="text-input" id={name} name={name} type={type} defaultValue={value ?? ''} {...rest} />
    </div>
  );
}

export function ProductForm({ product }: { product?: StoredProduct }) {
  const [state, action, pending] = useActionState(saveProductAction.bind(null, product?.id), empty);
  // Submitted by hand because <form action> clears every field, even when validation fails.
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => action(data));
  };
  return (
    <form onSubmit={onSubmit}>
      <Messages state={state} />
      <div className="admin-card form-card" style={{ padding: 22, boxShadow: 'none' }}>
        <h2>Basics</h2>
        <div className="form-grid">
          <Text full name="name" label="Name *" value={product?.name} required />
          <Text name="sku" label="SKU / part number *" value={product?.sku} required />
          <Text name="brand" label="Brand" value={product?.brand} />
          <div className="field">
            <label className="field-label" htmlFor="cat">Category *</label>
            <select className="select-input" id="cat" name="cat" defaultValue={product?.cat} required>
              {categories.filter((c) => c.id !== 'machine').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="img">Image *</label>
            <select className="select-input" id="img" name="img" defaultValue={product?.img} required>
              {PRODUCT_IMAGES.map((i) => <option key={i}>{i}</option>)}
            </select>
          </div>
          <div className="field full-width">
            <label className="field-label" htmlFor="desc">Description</label>
            <textarea className="textarea" id="desc" name="desc" rows={5} defaultValue={product?.desc} />
          </div>
        </div>
      </div>
      <div className="admin-card form-card" style={{ padding: 22, boxShadow: 'none' }}>
        <h2>Price and stock</h2>
        <div className="form-grid">
          <Text name="price" label="Price (USD)" type="number" step="0.01" min="0" value={product?.price} />
          <Text name="stockQty" label="Stock (blank = not tracked)" type="number" step="1" min="0" value={product?.stockQty} />
        </div>
        <label className="admin-check"><input type="checkbox" name="active" defaultChecked={product?.active} /> Visible in the store</label>
      </div>
      <div className="admin-card form-card" style={{ padding: 22, boxShadow: 'none' }}>
        <h2>Search and compatibility</h2>
        <div className="form-grid">
          <Text name="tireSize" label="Tire size" value={product?.tireSize} />
          <Text name="tags" label="Equipment tags (comma separated)" value={product?.tags.join(', ')} />
          <Text name="equipmentMake" label="Equipment make" value={product?.equipmentMake} />
          <Text name="equipmentModel" label="Equipment model" value={product?.equipmentModel} />
        </div>
        <label className="admin-check"><input type="checkbox" name="compatibilityVerified" defaultChecked={product?.compatibilityVerified} /> Compatibility verified with supplier data</label>
      </div>
      <div className="admin-card form-card" style={{ padding: 22, boxShadow: 'none' }}>
        <h2>Shipping</h2>
        <div className="form-grid">
          <div className="field full-width">
            <label className="field-label" htmlFor="shippingClass">Shipping class</label>
            <select className="select-input" id="shippingClass" name="shippingClass" defaultValue={product?.shippingClass ?? 'parcel'}>
              <option value="parcel">Parcel</option>
              <option value="freight_quote">Freight (quote required)</option>
              <option value="pickup">Pickup</option>
            </select>
          </div>
          <Text name="weightLb" label="Weight (lb)" type="number" step="0.01" min="0" value={product?.weightLb} />
          <Text name="lengthIn" label="Length (in)" type="number" step="0.01" min="0" value={product?.lengthIn} />
          <Text name="widthIn" label="Width (in)" type="number" step="0.01" min="0" value={product?.widthIn} />
          <Text name="heightIn" label="Height (in)" type="number" step="0.01" min="0" value={product?.heightIn} />
        </div>
      </div>
      <div className="admin-actions"><button className="btn" disabled={pending}>Save product</button></div>
    </form>
  );
}

export function DeleteProductButton({ id, name }: { id: string; name: string }) {
  return (
    <form action={deleteProductAction.bind(null, id)} onSubmit={(e) => { if (!confirm(`Delete ${name}? This cannot be undone.`)) e.preventDefault(); }}>
      <button className="btn btn-danger">Delete product</button>
    </form>
  );
}

export function ImportForm() {
  const [state, action, pending] = useActionState(importProductsAction, empty);
  return (
    <form action={action}>
      <Messages state={state} />
      <div className="field">
        <label className="field-label" htmlFor="file">CSV file</label>
        <input className="text-input" style={{ paddingTop: 11 }} id="file" name="file" type="file" accept=".csv,text/csv" required />
      </div>
      <button className="btn" disabled={pending}>Import products</button>
    </form>
  );
}
