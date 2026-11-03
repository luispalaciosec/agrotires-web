'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { isUploadedImage, productImages } from '@/lib/catalog';
import { blocksSchema, validSlug } from '@/lib/page-blocks';
import { adminConfigured, currentAdmin, isFullAdmin, logIn, logOut, requireAdmin, supabaseAuthClient, usesSupabaseAuth } from '@/lib/server/admin-auth';
import { brandedHtml, emailEnabled, send, sendPurchaseOrder } from '@/lib/server/email';
import { shipOrder, updateShipment } from '@/lib/server/shipments';
import { fillTemplate, templateDef, templateProblem, type EmailLocale } from '@/lib/email-templates';
import { CARRIERS, SHIPMENT_STATUSES, type ShipmentStatus } from '@/lib/shipping';
import { parseFitmentText } from '@/lib/fitment';
import { createPayLink, parseQuoteLines } from '@/lib/server/sales';
import { changeReturnStatus, parsePurchaseLines, receivePurchaseOrder, remainingToRestock, restockItems } from '@/lib/server/operations';
import { notifyB2bApproved } from '@/lib/server/email';
import { isUsState } from '@/lib/tax';
import { percentToBps, US_STATES } from '@/lib/tax';
import { dollarsToCents, parseZipRates, shippingStates } from '@/lib/server/rates-input';
import { randomUUID } from 'node:crypto';
import { importProducts } from '@/lib/server/csv-import';
import { rateLimited } from '@/lib/server/http';
import { issueRefund, refundableCents } from '@/lib/server/orders';
import { paymentsEnabled } from '@/lib/server/paypal';
import { checkPhoto, keptPhotos } from '@/lib/server/photo-upload';
import { valueToCents } from '@/lib/server/pricing';
import { parseProduct, type ProductInput } from '@/lib/server/product-input';
import { getStore, type OrderStatus, type QuoteStatus, type ReturnStatus, type ShippingClass, type Store } from '@/lib/server/store';

// A failure to record never blocks the change itself, but it is logged.
async function audit(action: string, target?: string, detail?: string) {
  try {
    const { name } = await currentAdmin();
    await getStore()?.addAudit({ actor: name, action, target, detail });
  } catch (e) {
    console.error('Could not record activity', action, e);
  }
}

export type FormState = { error?: string; errors?: string[]; notice?: string };

// Panel format, one per line: 5 | 650.00 means 5 or more at that price each.
function parseVolumeText(text: string): { ok: true; volume: { minQty: number; priceCents: number }[] } | { ok: false; error: string } {
  const volume = [];
  for (const [i, line] of text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).entries()) {
    const [qty, price] = line.split('|').map((p) => p.trim());
    const minQty = Number(qty);
    const priceCents = price ? dollarsToCents(price) : NaN;
    if (!Number.isInteger(minQty) || minQty < 2 || Number.isNaN(priceCents)) return { ok: false, error: `Volume line ${i + 1}: use Quantity | Price, such as 5 | 650.00.` };
    volume.push({ minQty, priceCents });
  }
  return { ok: true, volume };
}

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
  if (await rateLimited(`login:${ip}`, 5, 15 * 60_000)) return { error: 'Too many attempts. Try again in 15 minutes.' };
  if (!(await logIn(String(form.get('email') || ''), String(form.get('password') || '')))) return { error: 'Incorrect email or password.' };
  redirect('/admin');
}

export async function adminForgotPasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  if (await rateLimited(`admin-reset:${ip}`, 5, 60 * 60_000)) return { error: 'Too many attempts. Try again in 15 minutes.' };
  const email = String(form.get('email') || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Enter a valid email address.' };
  if (usesSupabaseAuth()) {
    const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('host')}`;
    const client = await supabaseAuthClient();
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: `${site}/auth/callback?next=/es/account/password` });
    if (error) console.error('Admin password reset failed', error.message);
  }
  // The same answer either way, so this form cannot reveal who has an account.
  return { notice: 'If that email has an account, the link is on its way. Check your inbox.' };
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
  const volume = parseVolumeText(text('volume'));
  if (!volume.ok) {
    await Promise.all(added.map((img) => removePhoto(store, img)));
    return { error: volume.error };
  }
  const reorderText = text('reorderDays').trim();
  const reorderDays = reorderText ? Number(reorderText) : undefined;
  if (reorderDays !== undefined && (!Number.isInteger(reorderDays) || reorderDays < 1 || reorderDays > 3650)) return { error: 'Reorder days must be a whole number of days.' };
  const fitment = parseFitmentText(text('fitment'));
  if (!fitment.ok) {
    await Promise.all(added.map((img) => removePhoto(store, img)));
    return { error: fitment.error };
  }
  await store.saveProducts([result.product]);
  try {
    await store.saveFitment(result.product.id, fitment.fitment);
    await store.saveSalesRule({ productId: result.product.id, reorderDays, volume: volume.volume });
  } catch (e) {
    console.error('Could not save fitment', e);
    return { error: 'The product was saved, but not its machines or sales rules. Run the migrations 0009 and 0010 and save again.' };
  }
  await audit(id ? 'Edited product' : 'Created product', result.product.sku, result.product.price === null ? undefined : `Price $${result.product.price}, ${result.product.active ? "visible" : "hidden"}`);
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
  await audit('Deleted product', product?.sku ?? id);
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
  await audit('Imported products', `${result.created} created, ${result.updated} updated`);
  return { notice: `Import complete: ${result.created} created, ${result.updated} updated.` };
}

export async function refundOrderAction(id: string, _: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  if (!(await isFullAdmin())) return { error: 'Only an administrator can issue refunds.' };
  const store = requireStore();
  if (!paymentsEnabled()) return { error: 'PayPal is not connected, so refunds are not available.' };
  const order = await store.getOrder(id);
  if (!order) return { error: 'Order not found.' };
  const cents = valueToCents(String(form.get('amount') || '').trim());
  const picks = order.items.map((i) => ({ sku: i.sku, quantity: Number(form.get(`restock_${i.sku}`) || 0) }));
  // Checked before any money moves.
  if (picks.some((p) => !Number.isInteger(p.quantity) || p.quantity < 0 || p.quantity > remainingToRestock(order, p.sku))) return { error: 'Too many units for one of the products.' };
  const result = await issueRefund(store, { ...order, refundedCents: Number(form.get('expected')) }, cents);
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath('/admin/orders');
  if (!result.ok) return { error: result.error };
  await audit('Refunded order', order.id.slice(0, 8).toUpperCase(), `$${(cents / 100).toFixed(2)}`);
  const { name } = await currentAdmin();
  const back = await restockItems(store, result.order, picks, name);
  const restocked = back.ok && back.units > 0;
  if (restocked) refreshStorefront();
  const amount = (cents / 100).toFixed(2);
  return { notice: result.pending ? `PayPal is processing the $${amount} refund.` : `Refunded $${amount}.${restocked ? ' Items returned to stock.' : ''}` };
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
  await audit('Changed order status', id.slice(0, 8).toUpperCase(), status);
  revalidatePath(`/admin/orders/${id}`);
}

export async function saveTaxRatesAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const store = requireStore();
  const rates = [];
  for (const [state, name] of US_STATES) {
    const text = String(form.get(`rate_${state}`) ?? '').trim();
    if (!text) continue;
    const rateBps = percentToBps(text);
    if (Number.isNaN(rateBps)) return { error: `${name}: enter a percentage from 0 to 20, such as 6.25.` };
    rates.push({ state, rateBps, active: form.get(`active_${state}`) === 'on', taxShipping: form.get(`ship_${state}`) === 'on' });
  }
  await store.saveTaxRates(rates);
  await audit('Saved tax rates', `${rates.length} states`);
  revalidatePath('/admin/taxes');
  refreshStorefront();
  return { notice: `Saved. ${rates.filter((r) => r.active).length} states charge tax at checkout.` };
}

export async function createPayLinkAction(quoteId: string, _: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  if (!(await isFullAdmin())) return { error: 'Only an administrator can do this.' };
  const store = requireStore();
  const quote = await store.getQuote(quoteId);
  if (!quote) return { error: 'Quote not found.' };
  const v = (name: string) => String(form.get(name) ?? '').trim();
  const lines = parseQuoteLines(v('lines'));
  if (!lines.ok) return { error: lines.error };
  const freightCents = v('freight') ? dollarsToCents(v('freight')) : 0;
  if (Number.isNaN(freightCents)) return { error: 'Enter the freight in dollars, such as 450 or 450.00.' };
  if (!v('name') || !v('line1') || !v('city') || !isUsState(v('state')) || !/^\d{5}(-\d{4})?$/.test(v('postalCode'))) return { error: 'Complete the delivery address.' };
  try {
    const order = await createPayLink(store, quote, { lines: lines.lines, freightCents, address: { name: v('name'), line1: v('line1'), line2: v('line2') || undefined, city: v('city'), state: v('state'), postalCode: v('postalCode') } });
    await audit('Created payment link', order.id.slice(0, 8).toUpperCase(), `$${(order.totalCents / 100).toFixed(2)}`);
    revalidatePath(`/admin/quotes/${quoteId}`);
    return { notice: `LINK:${order.payToken}` };
  } catch (e) {
    console.error('Could not create payment link', e);
    return { error: 'The link could not be created. If you have not yet, run the migration 0010_sales_tools.sql.' };
  }
}

export async function saveB2bDecisionAction(profileId: string, _: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  if (!(await isFullAdmin())) return { error: 'Only an administrator can decide business accounts.' };
  const store = requireStore();
  const account = await store.getB2bAccount(profileId);
  if (!account) return { error: 'Account not found.' };
  if (form.get('decision') === 'reject') {
    await store.saveB2bAccount({ ...account, status: 'rejected', discountBps: 0, termsDays: 0 });
    await audit('Rejected business account', account.company);
    revalidatePath('/admin/customers');
    return { notice: 'Application rejected.' };
  }
  const discountBps = percentToBps(String(form.get('discount') ?? ''));
  const termsDays = Number(String(form.get('terms') ?? '0') || 0);
  if (Number.isNaN(discountBps)) return { error: 'Enter a discount from 0 to 20 percent.' };
  if (!Number.isInteger(termsDays) || termsDays < 0 || termsDays > 180) return { error: 'Enter the days to pay, from 0 to 180.' };
  const updated = { ...account, status: 'approved' as const, discountBps, termsDays };
  await store.saveB2bAccount(updated);
  await audit('Approved business account', account.company, `${discountBps / 100}% off, ${termsDays} days`);
  if (account.status !== 'approved') await notifyB2bApproved(updated, account.locale === 'es' ? 'es' : 'en');
  revalidatePath('/admin/customers');
  return { notice: `${account.company} approved.` };
}

export async function markInvoicePaidAction(orderId: string) {
  await requireAdmin();
  if (!(await isFullAdmin())) return;
  const store = requireStore();
  const order = await store.getOrder(orderId);
  if (!order?.invoiceDueAt || order.invoicePaidAt) return;
  await store.updateOrder(orderId, { invoicePaidAt: new Date().toISOString(), ...(order.status === 'on_terms' ? { status: 'paid' as const } : {}) });
  await audit('Marked invoice paid', orderId.slice(0, 8).toUpperCase());
  revalidatePath(`/admin/orders/${orderId}`);
}

export async function moderateReviewAction(id: string, status: 'approved' | 'rejected') {
  await requireAdmin();
  await requireStore().moderateReview(id, status);
  await audit('Moderated review', id.slice(0, 8), status);
  revalidatePath('/admin/reviews');
  refreshStorefront();
}

export async function importZipRatesAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const store = requireStore();
  const file = form.get('file');
  if (!(file instanceof File) || !file.size) return { error: 'Choose a CSV file.' };
  if (file.size > 3_500_000) return { error: 'The file is larger than 3.5 MB.' };
  const parsed = parseZipRates(await file.text());
  if (!parsed.ok) return { error: parsed.error };
  try {
    await store.replaceTaxZipRates(parsed.rates);
  } catch (e) {
    console.error('Could not import ZIP rates', e);
    return { error: 'The rates could not be saved. Run the migration 0009_shipping_fitment_accounts.sql first.' };
  }
  revalidatePath('/admin/taxes');
  await audit('Imported ZIP tax rates', `${parsed.rates.length} ZIP codes`);
  return { notice: `Imported ${parsed.rates.length} ZIP codes. They replace the previous list.` };
}

export async function addShippingZoneAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const store = requireStore();
  const name = String(form.get('name') ?? '').trim().slice(0, 80);
  const states = shippingStates(String(form.get('states') ?? ''));
  const baseCents = dollarsToCents(String(form.get('base') ?? ''));
  const perLbCents = dollarsToCents(String(form.get('perLb') ?? '0') || '0');
  const free = String(form.get('freeOver') ?? '').trim();
  const freeOverCents = free ? dollarsToCents(free) : undefined;
  if (!name) return { error: 'Name the zone.' };
  if (!states) return { error: 'List the states with their two letters, such as IA, NE, KS.' };
  if (Number.isNaN(baseCents) || Number.isNaN(perLbCents) || (freeOverCents !== undefined && Number.isNaN(freeOverCents))) return { error: 'Enter the amounts in dollars, such as 15 or 0.50.' };
  try {
    const zones = await store.listShippingZones();
    const taken = states.find((s) => zones.some((z) => z.active && z.states.includes(s)));
    if (taken) return { error: `${taken} is already in another zone.` };
    await store.saveShippingZones([...zones, { id: randomUUID(), name, states, baseCents, perLbCents, freeOverCents, active: true }]);
  } catch (e) {
    console.error('Could not save shipping zone', e);
    return { error: 'The zone could not be saved. Run the migration 0009_shipping_fitment_accounts.sql first.' };
  }
  revalidatePath('/admin/shipping');
  await audit('Added shipping zone', name, states.join(", "));
  return { notice: 'Zone added. Checkout uses it now.' };
}

export async function deleteShippingZoneAction(id: string) {
  await requireAdmin();
  const store = requireStore();
  await store.saveShippingZones((await store.listShippingZones()).filter((z) => z.id !== id));
  await audit('Deleted shipping zone', id.slice(0, 8));
  revalidatePath('/admin/shipping');
}

const templateFields = (form: FormData) => ({
  subject_en: String(form.get('subject_en') ?? ''),
  body_en: String(form.get('body_en') ?? ''),
  subject_es: String(form.get('subject_es') ?? ''),
  body_es: String(form.get('body_es') ?? ''),
});

export async function saveEmailTemplateAction(key: string, _: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  if (!(await isFullAdmin())) return { error: 'Only an administrator can do this.' };
  const def = templateDef(key);
  if (!def) return { error: 'Unknown email.' };
  const fields = templateFields(form);
  const problem = templateProblem(def, fields);
  if (problem) return { error: problem };
  try {
    await requireStore().saveEmailTemplate({ key: def.key, enabled: form.get('enabled') === 'on', ...fields });
  } catch (e) {
    console.error('Could not save email template', e);
    return { error: 'The email could not be saved. If you have not yet, run the migration 0008_admin_tools.sql.' };
  }
  revalidatePath('/admin/emails');
  await audit('Edited email', def.name);
  return { notice: 'Email saved. The next one sent uses this text.' };
}

export async function resetEmailTemplateAction(key: string): Promise<FormState> {
  await requireAdmin();
  if (!(await isFullAdmin())) return { error: 'Only an administrator can do this.' };
  const def = templateDef(key);
  if (!def) return { error: 'Unknown email.' };
  try {
    await requireStore().deleteEmailTemplate(def.key);
  } catch (e) {
    console.error('Could not reset email template', e);
    return { error: 'The email could not be restored. Please try again.' };
  }
  revalidatePath('/admin/emails');
  await audit('Restored email', def.name);
  return { notice: 'Original text restored.' };
}

export async function sendTestEmailAction(key: string, _: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  if (!(await isFullAdmin())) return { error: 'Only an administrator can do this.' };
  const def = templateDef(key);
  if (!def) return { error: 'Unknown email.' };
  if (!emailEnabled()) return { error: 'The mailbox is not connected yet.' };
  const to = String(form.get('to') ?? '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return { error: 'Enter a valid email address.' };
  if (await rateLimited('email-test', 10)) return { error: 'Too many test emails. Try again in a minute.' };
  const fields = templateFields(form);
  const problem = templateProblem(def, fields);
  if (problem) return { error: problem };
  const lang: EmailLocale = form.get('lang') === 'es' ? 'es' : 'en';
  const text = fillTemplate(fields[`body_${lang}`], def.sample);
  const { sent } = await send([{ to, subject: `[TEST] ${fillTemplate(fields[`subject_${lang}`], def.sample)}`, text, html: brandedHtml(text) }]);
  if (sent) await audit('Sent test email', key, to);
  return sent ? { notice: `Test sent to ${to}.` } : { error: 'The test could not be sent. Check the mailbox settings.' };
}

const clean = (form: FormData, name: string, max: number) => String(form.get(name) ?? '').trim().slice(0, max) || undefined;

export async function createShipmentAction(orderId: string, _: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const store = requireStore();
  const order = await store.getOrder(orderId);
  if (!order || (order.status !== 'paid' && order.status !== 'on_terms')) return { error: 'Only a paid order or one on terms can be shipped.' };
  const carrier = String(form.get('carrier') ?? '');
  if (!CARRIERS.includes(carrier)) return { error: 'Choose a carrier.' };
  try {
    await shipOrder(store, order, { carrier, trackingNumber: clean(form, 'trackingNumber', 80) }, form.get('notify') === 'on');
  } catch (e) {
    console.error('Could not create shipment', e);
    return { error: 'The shipment could not be created. If you have not yet, run the migration 0008_admin_tools.sql.' };
  }
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/admin/shipments');
  await audit('Created shipment', orderId.slice(0, 8).toUpperCase(), carrier);
  return { notice: 'Shipment created.' };
}

export async function addShipmentEventAction(orderId: string, shipmentId: string, _: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const store = requireStore();
  const [order, shipment] = await Promise.all([store.getOrder(orderId), store.getShipmentByOrder(orderId)]);
  if (!order || !shipment || shipment.id !== shipmentId) return { error: 'Shipment not found.' };
  const status = String(form.get('status') ?? '') as ShipmentStatus;
  if (!SHIPMENT_STATUSES.includes(status)) return { error: 'Choose a status.' };
  await updateShipment(store, order, shipment, { status, location: clean(form, 'location', 120), note: clean(form, 'note', 300) }, form.get('notify') === 'on');
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/admin/shipments');
  await audit('Updated shipment', orderId.slice(0, 8).toUpperCase(), status);
  return { notice: 'Update added. The tracking page shows it now.' };
}

export async function addWarehouseAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const name = String(form.get('name') ?? '').trim().slice(0, 80);
  if (!name) return { error: 'Name the warehouse.' };
  try {
    await requireStore().addWarehouse(name);
  } catch (e) {
    console.error('Could not add warehouse', e);
    return { error: 'It could not be saved. Run the migration 0011_operations.sql first.' };
  }
  await audit('Added warehouse', name);
  revalidatePath('/admin/inventory');
  return { notice: 'Warehouse added.' };
}

export async function adjustStockAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const store = requireStore();
  const v = (name: string) => String(form.get(name) ?? '').trim();
  const productId = v('product');
  const delta = Number(v('delta'));
  if (!(await store.listProducts()).some((p) => p.id === productId)) return { error: 'Choose a product.' };
  if (!Number.isInteger(delta) || Math.abs(delta) > 100000) return { error: 'Enter a whole number, such as 10 or -3.' };
  const reorder = v('reorderPoint');
  const reorderPoint = reorder ? Number(reorder) : undefined;
  if (reorderPoint !== undefined && (!Number.isInteger(reorderPoint) || reorderPoint < 0)) return { error: 'The alert must be a whole number.' };
  try {
    const { name } = await currentAdmin();
    if (delta) await store.adjustStock({ productId, warehouseId: v('warehouse') || undefined, delta, reason: v('reason') || 'other', note: v('note').slice(0, 200) || undefined, actor: name });
    if (reorderPoint !== undefined || v('supplier')) {
      const current = (await store.listInventorySettings()).find((s) => s.productId === productId);
      await store.saveInventorySetting({ productId, reorderPoint: reorderPoint ?? current?.reorderPoint, supplier: v('supplier').slice(0, 120) || current?.supplier });
    }
  } catch (e) {
    console.error('Could not adjust stock', e);
    return { error: 'It could not be saved. Run the migration 0011_operations.sql first.' };
  }
  await audit('Adjusted stock', productId, `${delta > 0 ? '+' : ''}${delta}`);
  revalidatePath('/admin/inventory');
  refreshStorefront();
  return { notice: 'Saved.' };
}

export async function createPurchaseOrderAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const store = requireStore();
  const v = (name: string) => String(form.get(name) ?? '').trim();
  if (!v('supplier')) return { error: 'Name the supplier.' };
  const parsed = parsePurchaseLines(v('lines'), await store.listProducts());
  if (!parsed.ok) return { error: parsed.error };
  try {
    const supplierEmail = v('supplierEmail').slice(0, 200) || undefined;
    if (supplierEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supplierEmail)) return { error: 'Enter a valid email address.' };
    const po = await store.createPurchaseOrder({ supplierEmail, supplier: v('supplier').slice(0, 120), warehouseId: v('warehouse') || undefined, note: v('note').slice(0, 300) || undefined, items: parsed.items });
    await audit('Created supplier order', po.id.slice(0, 8).toUpperCase(), po.supplier);
  } catch (e) {
    console.error('Could not create supplier order', e);
    return { error: 'It could not be saved. Run the migration 0011_operations.sql first.' };
  }
  revalidatePath('/admin/inventory');
  return { notice: 'Supplier order created. Receive it when the goods arrive.' };
}

export async function sendPurchaseOrderAction(id: string, _: FormState): Promise<FormState> {
  await requireAdmin();
  const store = requireStore();
  const po = (await store.listPurchaseOrders()).find((p) => p.id === id);
  if (!po?.supplierEmail) return { error: 'This order has no supplier email.' };
  if (!emailEnabled()) return { error: 'The mailbox is not connected yet.' };
  const { sent } = await sendPurchaseOrder(po);
  if (!sent) return { error: 'The test could not be sent. Check the mailbox settings.' };
  await store.markPurchaseOrderSent(id);
  await audit('Sent supplier order', id.slice(0, 8).toUpperCase(), po.supplierEmail);
  revalidatePath('/admin/inventory');
  return { notice: 'Sent to supplier.' };
}

export async function savePageAction(id: string | null, _: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  if (!(await isFullAdmin())) return { error: 'Only an administrator can do this.' };
  const store = requireStore();
  const v = (name: string, max: number) => String(form.get(name) ?? '').trim().slice(0, max);
  const slug = v('slug', 80);
  if (!validSlug(slug)) return { error: 'Use only lowercase letters, numbers and hyphens in the address.' };
  if (!v('titleEn', 200)) return { error: 'Add a title in English.' };
  let raw: unknown;
  try {
    raw = JSON.parse(String(form.get('blocks') ?? '[]'));
  } catch {
    raw = undefined;
  }
  const blocks = blocksSchema.safeParse(raw);
  if (!blocks.success) return { error: blocks.error.issues.some((i) => i.message === 'link') ? 'A button link must start with / or https://.' : 'The blocks could not be read. Reload the page and try again.' };
  let saved;
  try {
    const taken = await store.getPageBySlug(slug);
    if (taken && taken.id !== id) return { error: 'Another page already uses that address.' };
    saved = await store.savePage(id, { slug, titleEn: v('titleEn', 200), titleEs: v('titleEs', 200), descEn: v('descEn', 300), descEs: v('descEs', 300), blocks: blocks.data, published: form.get('published') === 'on' });
  } catch (e) {
    console.error('Could not save the page', e);
    return { error: 'The page could not be saved. Run the migration 0013_pages.sql first.' };
  }
  await audit(id ? 'Edited page' : 'Created page', slug, saved.published ? 'published' : 'draft');
  revalidatePath('/admin/pages');
  if (!id) redirect(`/admin/pages/${saved.id}`);
  revalidatePath(`/admin/pages/${id}`);
  return { notice: 'Page saved.' };
}

export async function deletePageAction(id: string) {
  await requireAdmin();
  if (!(await isFullAdmin())) return;
  const store = requireStore();
  await store.deletePage(id);
  await audit('Deleted page', id.slice(0, 8).toUpperCase());
  revalidatePath('/admin/pages');
  redirect('/admin/pages');
}

export async function receivePurchaseOrderAction(id: string) {
  await requireAdmin();
  const { name } = await currentAdmin();
  if (await receivePurchaseOrder(requireStore(), id, name)) await audit('Received supplier order', id.slice(0, 8).toUpperCase());
  revalidatePath('/admin/inventory');
  refreshStorefront();
}

export async function updateReturnAction(id: string, _: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const store = requireStore();
  const request = await store.getReturn(id);
  const order = request ? await store.getOrder(request.orderId) : undefined;
  if (!request || !order) return { error: 'Return not found.' };
  const status = String(form.get('status') ?? '') as ReturnStatus;
  const note = String(form.get('teamNote') ?? '').trim().slice(0, 500) || undefined;
  if (!(await changeReturnStatus(store, request, order, status, note))) return { error: 'That step is not available now.' };
  await audit('Updated return', order.id.slice(0, 8).toUpperCase(), status);
  revalidatePath('/admin/returns');
  return { notice: 'Saved.' };
}

export async function setRoleAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  if (!(await isFullAdmin())) return { error: 'Only an administrator can change roles.' };
  const store = requireStore();
  const email = String(form.get('email') ?? '').trim();
  const role = String(form.get('role') ?? '') as 'customer' | 'staff' | 'admin';
  if (!['customer', 'staff', 'admin'].includes(role)) return { error: 'Choose a role.' };
  const team = await store.listTeam();
  const admins = team.filter((m) => m.role === 'admin');
  if (role !== 'admin' && admins.length === 1 && admins[0].email.toLowerCase() === email.toLowerCase()) return { error: 'This is the only administrator. Name another one first.' };
  if (!(await store.setRole(email, role))) return { error: 'No account has that email. The person must create one in the store first.' };
  await audit('Changed role', email, role);
  revalidatePath('/admin/team');
  return { notice: `${email} is now ${role}.` };
}

export async function updateQuoteStatusAction(id: string, status: QuoteStatus) {
  await requireAdmin();
  await requireStore().updateQuoteStatus(id, status);
  revalidatePath(`/admin/quotes/${id}`);
}
