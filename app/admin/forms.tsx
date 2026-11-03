'use client';

import { startTransition, useActionState, useState, type FormEvent } from 'react';
import { PRODUCT_IMAGES, categories, imageSrc, isUploadedImage } from '@/lib/catalog';
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

export function ProductForm({ product }: { product?: StoredProduct }) {
  const [preview, setPreview] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [preparing, setPreparing] = useState(false);
  const hasPhoto = Boolean(product && isUploadedImage(product.img));
  const [state, action, pending] = useActionState(saveProductAction.bind(null, product?.id), empty);
  // Submitted by hand because <form action> clears every field, even when validation fails.
  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const photo = data.get('photo');
    setPhotoError('');
    if (photo instanceof File && photo.size) {
      setPreparing(true);
      try {
        data.set('photo', await shrinkPhoto(photo));
      } catch {
        setPhotoError('This photo could not be read. Use a JPG, PNG or WebP file.');
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
            <label className="field-label" htmlFor="img">{hasPhoto ? 'Image *' : 'Sample image, if there is no photo *'}</label>
            <select className="select-input" id="img" name="img" defaultValue={product?.img} required>
              {hasPhoto ? <option value={product!.img}>Current photo</option> : null}
              {PRODUCT_IMAGES.map((i) => <option key={i}>{i}</option>)}
            </select>
          </div>
          <div className="field full-width">
            <label className="field-label" htmlFor="photo">Product photo</label>
            {preview || product ? (
              // eslint-disable-next-line @next/next/no-img-element -- a local preview or the admin's own photo, not worth optimizing
              <img className="admin-photo" src={preview || imageSrc(product!.img)} alt="" />
            ) : null}
            <input
              className="text-input"
              id="photo"
              name="photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                setPhotoError('');
                setPreview((old) => {
                  if (old) URL.revokeObjectURL(old);
                  return file ? URL.createObjectURL(file) : '';
                });
              }}
            />
            <small className="muted">JPG, PNG or WebP. Use only photos you have the right to publish. A new photo replaces the current one when you save.</small>
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
