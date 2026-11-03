'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { adminConfigured, logIn, logOut, requireAdmin } from '@/lib/server/admin-auth';
import { importProducts } from '@/lib/server/csv-import';
import { rateLimited } from '@/lib/server/http';
import { parseProduct, type ProductInput } from '@/lib/server/product-input';
import { getStore, type OrderStatus, type QuoteStatus, type ShippingClass } from '@/lib/server/store';

export type FormState = { error?: string; errors?: string[]; notice?: string };

const requireStore = () => {
  const store = getStore();
  if (!store) throw new Error('STORE_DRIVER is not configured');
  return store;
};
// Storefront pages stay static and fast; this rebuilds them after an edit.
const refreshStorefront = () => revalidatePath('/', 'layout');

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  if (!adminConfigured()) return { error: 'The admin panel is not configured yet.' };
  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  if (rateLimited(`login:${ip}`, 5, 15 * 60_000)) return { error: 'Too many attempts. Try again in 15 minutes.' };
  if (!(await logIn(String(form.get('password') || '')))) return { error: 'Incorrect password.' };
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
    sku: text('sku'), name: text('name'), cat: text('cat'), brand: text('brand'), desc: text('desc'),
    price: text('price'), stockQty: text('stockQty'), img: text('img'), tags: text('tags'),
    tireSize: text('tireSize'), equipmentMake: text('equipmentMake'), equipmentModel: text('equipmentModel'),
    shippingClass: text('shippingClass') as ShippingClass,
    weightLb: text('weightLb'), lengthIn: text('lengthIn'), widthIn: text('widthIn'), heightIn: text('heightIn'),
    compatibilityVerified: form.get('compatibilityVerified') === 'on',
    active: form.get('active') === 'on',
  };
  const result = parseProduct(input, await store.listProducts(), id);
  if (!result.ok) return { error: result.error };
  await store.saveProducts([result.product]);
  refreshStorefront();
  redirect('/admin/products');
}

export async function deleteProductAction(id: string) {
  await requireAdmin();
  await requireStore().deleteProduct(id);
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
