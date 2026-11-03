'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { isUploadedImage, productImages } from '@/lib/catalog';
import { adminConfigured, logIn, logOut, requireAdmin } from '@/lib/server/admin-auth';
import { importProducts } from '@/lib/server/csv-import';
import { rateLimited } from '@/lib/server/http';
import { issueRefund, refundableCents } from '@/lib/server/orders';
import { paymentsEnabled } from '@/lib/server/paypal';
import { checkPhoto, keptPhotos } from '@/lib/server/photo-upload';
import { valueToCents } from '@/lib/server/pricing';
import { parseProduct, type ProductInput } from '@/lib/server/product-input';
import { getStore, type OrderStatus, type QuoteStatus, type ShippingClass, type Store } from '@/lib/server/store';

export type FormState = { error?: string; errors?: string[]; notice?: string };

const requireStore = () => {
  const store = getStore();
  if (!store) throw new Error('STORE_DRIVER is not configured');
  return store;
};
// Storefront pages stay static and fast; this rebuilds them after an edit.
const refreshStorefront = () => revalidatePath('/', 'layout');

// A leftover file costs little, so a failed cleanup never blocks the edit that triggered it.
async function removePhoto(store: Store, img: string) {
  try {
    if (isUploadedImage(img)) await store.deleteImage(img);
  } catch (e) {
    console.error('Could not remove old photo', e);
  }
}

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  if (!adminConfigured()) return { error: 'The admin panel is not configured yet.' };
  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  if (rateLimited(`login:${ip}`, 5, 15 * 60_000)) return { error: 'Too many attempts. Try again in 15 minutes.' };
  if (!(await logIn(String(form.get('email') || ''), String(form.get('password') || '')))) return { error: 'Incorrect email or password.' };
  redirect('/admin');
}

export async function logoutAction() {
  await logOut();
  redirect('/admin/login');
}

export async function saveProductAction(id: string | undefined, _: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const store = requireStore();
  const text = (name: string) => String(form.get(name) || '');
  const input: ProductInput = {
    sku: text('sku'), name: text('name'), nameEs: text('nameEs'), cat: text('cat'), brand: text('brand'), desc: text('desc'), descEs: text('descEs'),
    price: text('price'), stockQty: text('stockQty'), img: text('img'), tags: text('tags'),
    tireSize: text('tireSize'), equipmentMake: text('equipmentMake'), equipmentModel: text('equipmentModel'),
    shippingClass: text('shippingClass') as ShippingClass,
    weightLb: text('weightLb'), lengthIn: text('lengthIn'), widthIn: text('widthIn'), heightIn: text('heightIn'),
    compatibilityVerified: form.get('compatibilityVerified') === 'on',
    active: form.get('active') === 'on',
  };
  const result = parseProduct(input, await store.listProducts(), id);
  if (!result.ok) return { error: result.error };
  const current = id ? (await store.listProducts()).find((p) => p.id === id) : undefined;
  const owned = current ? productImages(current).filter(isUploadedImage) : [];
  const files = form.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0);
  const kept = keptPhotos(text('keep'), owned, files.length);
  if (!kept.ok) return { error: kept.error };
  // Every file is checked before any is stored, so a bad one leaves nothing behind.
  const uploads = [];
  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const check = checkPhoto(bytes);
    if (!check.ok) return { error: check.error };
    uploads.push({ bytes, type: check.type });
  }
  const added: string[] = [];
  try {
    for (const { bytes, type } of uploads) added.push(await store.uploadImage(bytes, type));
  } catch (e) {
    console.error('Photo upload failed', e);
    await Promise.all(added.map((img) => removePhoto(store, img)));
    return { error: 'The photos could not be saved. Nothing was changed; please try again.' };
  }
  const photos = [...kept.keep, ...added];
  if (photos.length) result.product.img = photos[0];
  result.product.gallery = photos.slice(1);
  await store.saveProducts([result.product]);
  // After the save, so a failure can never leave a product pointing at a deleted photo.
  await Promise.all(owned.filter((img) => !photos.includes(img)).map((img) => removePhoto(store, img)));
  refreshStorefront();
  redirect('/admin/products');
}

export async function deleteProductAction(id: string) {
  await requireAdmin();
  const store = requireStore();
  const product = (await store.listProducts()).find((p) => p.id === id);
  await store.deleteProduct(id);
  if (product) await Promise.all(productImages(product).map((img) => removePhoto(store, img)));
  refreshStorefront();
  redirect('/admin/products');
}

export async function importProductsAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const store = requireStore();
  const file = form.get('file');
  if (!(file instanceof File) || !file.size) return { error: 'Choose a CSV file.' };
  if (file.size > 5_000_000) return { error: 'The file is larger than 5 MB.' };
  const result = importProducts(await file.text(), await store.listProducts());
  if (!result.ok) return { errors: result.errors };
  await store.saveProducts(result.products);
  refreshStorefront();
  return { notice: `Import complete: ${result.created} created, ${result.updated} updated.` };
}

export async function refundOrderAction(id: string, _: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const store = requireStore();
  if (!paymentsEnabled()) return { error: 'PayPal is not connected, so refunds are not available.' };
  const order = await store.getOrder(id);
  if (!order) return { error: 'Order not found.' };
  const cents = valueToCents(String(form.get('amount') || '').trim());
  const restock = form.get('restock') === 'on';
  if (restock && cents !== refundableCents(order) && Number(form.get('expected')) === (order.refundedCents ?? 0)) return { error: 'Items can return to stock only when refunding everything that is left.' };
  const result = await issueRefund(store, { ...order, refundedCents: Number(form.get('expected')) }, cents);
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath('/admin/orders');
  if (!result.ok) return { error: result.error };
  if (restock) {
    await store.restock(order.items);
    refreshStorefront();
  }
  const amount = (cents / 100).toFixed(2);
  return { notice: result.pending ? `PayPal is processing the $${amount} refund.` : `Refunded $${amount}.${restock ? ' Items returned to stock.' : ''}` };
}

const ORDER_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  pending_payment: ['cancelled'],
  paid: ['fulfilled'],
};

export async function updateOrderStatusAction(id: string, status: OrderStatus) {
  await requireAdmin();
  const store = requireStore();
  const order = await store.getOrder(id);
  if (!order || !ORDER_TRANSITIONS[order.status]?.includes(status)) throw new Error('That status change is not allowed');
  await store.updateOrder(id, { status });
  revalidatePath(`/admin/orders/${id}`);
}

export async function updateQuoteStatusAction(id: string, status: QuoteStatus) {
  await requireAdmin();
  await requireStore().updateQuoteStatus(id, status);
  revalidatePath(`/admin/quotes/${id}`);
}
