'use client';

import { startTransition, useActionState, useState, type FormEvent } from 'react';
import { panelText } from '@/lib/admin-i18n';
import { PRODUCT_IMAGES, categories, imageSrc, isUploadedImage, productImages } from '@/lib/catalog';
import type { StoredProduct } from '@/lib/server/store';
import { deleteProductAction, importProductsAction, loginAction, refundOrderAction, saveProductAction, type FormState } from './actions';

const empty: FormState = {};

export function Messages({ state }: { state: FormState }) {
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

const MAX_NEW_PHOTOS = 8;
// Together the photos must fit under the 4 MB limit of a single save.
const MAX_UPLOAD_BYTES = 3_800_000;

// Shrinks in the browser so large phone photos fit the upload limit. Redrawing also drops
// hidden data such as GPS location, and fills transparency with white for JPEG.
async function shrinkPhoto(file: File, maxSide = 1600) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  if (!blob) throw new Error('Could not read the photo');
  return new File([blob], 'photo.jpg', { type: 'image/jpeg' });
}

export function ProductForm({ product, fitmentText = '', volumeText = '', reorderDays }: { product?: StoredProduct; fitmentText?: string; volumeText?: string; reorderDays?: number }) {
  const [kept, setKept] = useState<string[]>(() => (product ? productImages(product).filter(isUploadedImage) : []));
  const [previews, setPreviews] = useState<string[]>([]);
  const [photoError, setPhotoError] = useState('');
  const [preparing, setPreparing] = useState(false);
  const [state, action, pending] = useActionState(saveProductAction.bind(null, product?.id), empty);
  // Submitted by hand because <form action> clears every field, even when validation fails.
  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const files = data.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0);
    data.delete('photos');
    setPhotoError('');
    if (kept.length + files.length > MAX_NEW_PHOTOS) {
      setPhotoError(`A product can have up to ${MAX_NEW_PHOTOS} photos.`);
      return;
    }
    if (files.length) {
      setPreparing(true);
      try {
        const shrunk = await Promise.all(files.map((file) => shrinkPhoto(file)));
        if (shrunk.reduce((n, f) => n + f.size, 0) > MAX_UPLOAD_BYTES) {
          setPhotoError('These photos are too large to send together. Upload fewer at a time.');
          return;
        }
        shrunk.forEach((f) => data.append('photos', f));
      } catch {
        setPhotoError('One of these photos could not be read. Use JPG, PNG or WebP files.');
        return;
      } finally {
        setPreparing(false);
      }
    }
    startTransition(() => action(data));
  };
  return (
    <form onSubmit={onSubmit}>
      <Messages state={state} />
      <div className="admin-card form-card" style={{ padding: 22, boxShadow: 'none' }}>
        <h2>Basics</h2>
        <div className="form-grid">
          <Text full name="name" label="Name in English *" value={product?.name} required />
          <Text full name="nameEs" label="Name in Spanish" value={product?.nameEs} />
          <Text name="sku" label="SKU / part number *" value={product?.sku} required />
          <Text name="brand" label="Brand" value={product?.brand} />
          <div className="field">
            <label className="field-label" htmlFor="cat">Category *</label>
            <select className="select-input" id="cat" name="cat" defaultValue={product?.cat} required>
              {categories.filter((c) => c.id !== 'machine').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="img">Sample image, if there are no photos *</label>
            <select className="select-input" id="img" name="img" defaultValue={product && !isUploadedImage(product.img) ? product.img : undefined} required>
              {PRODUCT_IMAGES.map((i) => <option key={i}>{i}</option>)}
            </select>
          </div>
          <div className="field full-width">
            <label className="field-label" htmlFor="photos">Product photos</label>
            <input type="hidden" name="keep" value={JSON.stringify(kept)} />
            {kept.length || previews.length ? (
              <div className="admin-photos">
                {kept.map((img, i) => (
                  <div className="admin-photo-item" key={img}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- the admin's own photo, not worth optimizing */}
                    <img className="admin-photo" src={imageSrc(img)} alt={`Photo ${i + 1}`} />
                    {i === 0 ? <span className="admin-pill">Main</span> : <button className="text-link" type="button" onClick={() => setKept([img, ...kept.filter((x) => x !== img)])}>Make main</button>}
                    <button className="text-link" type="button" onClick={() => setKept(kept.filter((x) => x !== img))}>Remove</button>
                  </div>
                ))}
                {previews.map((url) => (
                  <div className="admin-photo-item" key={url}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- a local preview */}
                    <img className="admin-photo" src={url} alt="New photo" />
                    <span className="admin-pill warn">New</span>
                  </div>
                ))}
              </div>
            ) : null}
            <input
              className="text-input"
              id="photos"
              name="photos"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const files = [...(e.target.files ?? [])];
                setPhotoError('');
                setPreviews((old) => {
                  old.forEach((url) => URL.revokeObjectURL(url));
                  return files.map((file) => URL.createObjectURL(file));
                });
              }}
            />
            <small className="muted">Up to {MAX_NEW_PHOTOS} photos in JPG, PNG or WebP. New photos are added after the current ones when you save. Use only photos you have the right to publish.</small>
            {photoError ? <p className="admin-error" role="alert">{photoError}</p> : null}
          </div>
          <div className="field full-width">
            <label className="field-label" htmlFor="desc">Description in English</label>
            <textarea className="textarea" id="desc" name="desc" rows={5} defaultValue={product?.desc} />
          </div>
          <div className="field full-width">
            <label className="field-label" htmlFor="descEs">Description in Spanish</label>
            <textarea className="textarea" id="descEs" name="descEs" rows={5} defaultValue={product?.descEs} />
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
        <div className="field" style={{ marginTop: 10 }}>
          <label className="field-label" htmlFor="volume">Volume prices, one per line: Quantity | Price each</label>
          <textarea className="textarea" id="volume" name="volume" rows={2} defaultValue={volumeText} placeholder="5 | 650.00" />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="reorderDays">Reorder reminder after (days), for wear parts</label>
          <input className="text-input" id="reorderDays" name="reorderDays" inputMode="numeric" defaultValue={reorderDays ?? ''} />
        </div>
        <div className="field" style={{ marginTop: 10 }}>
          <label className="field-label" htmlFor="fitment">Machines it fits, one per line: Make | Model | Years</label>
          <textarea className="textarea" id="fitment" name="fitment" rows={4} defaultValue={fitmentText} placeholder={'John Deere | 6120M | 2015-2020\nCase IH | Puma 150 | 2012'} />
          <small className="muted">Customers see these, and can search by machine, only when the box above is checked.</small>
        </div>
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
      <div className="admin-actions"><button className="btn" disabled={pending || preparing}>Save product</button></div>
    </form>
  );
}

export function RefundForm({ orderId, refundableCents, refundedCents, items }: { orderId: string; refundableCents: number; refundedCents: number; items: { sku: string; name: string; left: number }[] }) {
  const [state, action, pending] = useActionState(refundOrderAction.bind(null, orderId), empty);
  const left = (refundableCents / 100).toFixed(2);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    if (!confirm(panelText(`Refund $${String(data.get('amount')).trim()} to the customer through PayPal? This cannot be undone.`))) return;
    startTransition(() => action(data));
  };
  return (
    <form onSubmit={onSubmit}>
      <Messages state={state} />
      {refundableCents > 0 ? (
        <>
          <input key={refundedCents} type="hidden" name="expected" value={refundedCents} />
          <div className="field">
            <label className="field-label" htmlFor="amount">Amount to refund (USD), up to ${left}</label>
            <input key={left} className="text-input" id="amount" name="amount" inputMode="decimal" pattern="[0-9]+([.][0-9]{1,2})?" defaultValue={left} required />
          </div>
          {items.some((i) => i.left > 0) ? (
            <fieldset className="restock-lines">
              <legend className="field-label">How many units come back into stock?</legend>
              {items.filter((i) => i.left > 0).map((i) => (
                <label key={`${i.sku}-${i.left}`}><span data-raw>{i.name}</span><input className="text-input" type="number" name={`restock_${i.sku}`} min={0} max={i.left} defaultValue={0} /></label>
              ))}
            </fieldset>
          ) : null}
          <div className="admin-actions" style={{ marginTop: 16 }}><button className="btn btn-danger" disabled={pending}>{pending ? 'Refunding…' : 'Refund through PayPal'}</button></div>
        </>
      ) : <p className="muted" style={{ margin: 0 }}>This order has been fully refunded.</p>}
    </form>
  );
}

export function DeleteProductButton({ id, name }: { id: string; name: string }) {
  return (
    <form action={deleteProductAction.bind(null, id)} onSubmit={(e) => { if (!confirm(panelText(`Delete ${name}? This cannot be undone.`))) e.preventDefault(); }}>
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
