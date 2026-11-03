import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { TemplateKey } from '../email-templates';
import type { Fitment } from '../fitment';
import type { Locale } from '../i18n';
import type { ShipmentStatus } from '../shipping';
import { PHOTO_EXTENSIONS, type PhotoType } from './photo-upload';
import type { ContentPage, SavedMachine, Subscriber, AuditEntry, InventorySetting, PurchaseOrder, ReturnRequest, ReturnStatus, StockLevel, StockMovement, StoreEvent, TeamMember, Warehouse, B2bAccount, Review, ReviewStatus, SalesRule, Address, ProductFitment, ShippingZone, TaxZipRate, Shipment, ShipmentEvent, StoredTemplate, TaxRate, ShippingAddress, Order, OrderItem, OrderPatch, Quote, QuoteStatus, ShippingClass, Store, StoredProduct } from './store';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FALLBACK_IMAGE = 'agro-tires.webp';
const PHOTO_BUCKET = 'product-photos';
const PAGE = 1000;

export const supabaseConfigured = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);

export type ProductRow = {
  id?: string;
  slug: string;
  sku: string;
  name: string;
  name_es: string | null;
  category_id: string;
  brand: string | null;
  description: string;
  description_es: string | null;
  price_cents: number | null;
  stock_qty: number | null;
  weight_lb: number | string | null;
  length_in: number | string | null;
  width_in: number | string | null;
  height_in: number | string | null;
  tire_size: string | null;
  equipment_make: string | null;
  equipment_model: string | null;
  compatibility_verified: boolean;
  shipping_class: ShippingClass;
  active: boolean;
  tags: string[];
  product_images?: { path: string; sort_order: number }[];
};

const num = (v: number | string | null) => (v === null ? undefined : Number(v));

export function productFromRow(r: ProductRow): StoredProduct {
  const images = (r.product_images ?? []).slice().sort((a, b) => a.sort_order - b.sort_order);
  return {
    id: r.slug,
    cat: r.category_id,
    name: r.name,
    nameEs: r.name_es ?? undefined,
    sku: r.sku,
    desc: r.description,
    descEs: r.description_es ?? undefined,
    price: r.price_cents === null ? null : r.price_cents / 100,
    img: images[0]?.path ?? FALLBACK_IMAGE,
    gallery: images.length > 1 ? images.slice(1).map((i) => i.path) : undefined,
    tags: r.tags,
    brand: r.brand ?? undefined,
    tireSize: r.tire_size ?? undefined,
    equipmentMake: r.equipment_make ?? undefined,
    equipmentModel: r.equipment_model ?? undefined,
    stockQty: r.stock_qty,
    active: r.active,
    shippingClass: r.shipping_class,
    compatibilityVerified: r.compatibility_verified,
    weightLb: num(r.weight_lb),
    lengthIn: num(r.length_in),
    widthIn: num(r.width_in),
    heightIn: num(r.height_in),
  };
}

export function productToRow(p: StoredProduct): ProductRow {
  return {
    slug: p.id,
    sku: p.sku,
    name: p.name,
    name_es: p.nameEs ?? null,
    category_id: p.cat,
    brand: p.brand ?? null,
    description: p.desc,
    description_es: p.descEs ?? null,
    price_cents: p.price === null ? null : Math.round(p.price * 100),
    stock_qty: p.stockQty,
    weight_lb: p.weightLb ?? null,
    length_in: p.lengthIn ?? null,
    width_in: p.widthIn ?? null,
    height_in: p.heightIn ?? null,
    tire_size: p.tireSize ?? null,
    equipment_make: p.equipmentMake ?? null,
    equipment_model: p.equipmentModel ?? null,
    compatibility_verified: p.compatibilityVerified,
    shipping_class: p.shippingClass,
    active: p.active,
    tags: p.tags,
  };
}

type ItemRow = { sku: string; name: string; unit_price_cents: number; quantity: number; products: { slug: string } | null };
type OrderRow = {
  id: string; email: string; status: Order['status']; subtotal_cents: number; shipping_cents: number; tax_cents: number; total_cents: number;
  locale: Locale; shipping_address?: ShippingAddress | null; refunded_cents?: number; quote_id?: string | null; pay_token?: string | null; pay_expires_at?: string | null; invoice_due_at?: string | null; invoice_paid_at?: string | null; profile_id?: string | null; restocked?: Record<string, number> | null; paypal_order_id: string | null; paypal_capture_id: string | null; created_at: string; order_items?: ItemRow[];
};
type QuoteRow = {
  id: string; name: string; email: string; phone: string | null; delivery_zip: string | null; topic: string; product_name: string | null;
  message: string; status: QuoteStatus; locale: Locale; created_at: string;
};

export function orderFromRow(r: OrderRow): Order {
  return {
    id: r.id,
    email: r.email,
    status: r.status,
    items: (r.order_items ?? []).map((i): OrderItem => ({ productId: i.products?.slug ?? '', sku: i.sku, name: i.name, unitPriceCents: i.unit_price_cents, quantity: i.quantity })),
    subtotalCents: r.subtotal_cents,
    shippingCents: r.shipping_cents,
    taxCents: r.tax_cents,
    totalCents: r.total_cents,
    currency: 'USD',
    locale: r.locale,
    shippingAddress: r.shipping_address ?? undefined,
    refundedCents: r.refunded_cents ?? 0,
    profileId: r.profile_id ?? undefined,
    quoteId: r.quote_id ?? undefined,
    payToken: r.pay_token ?? undefined,
    payExpiresAt: r.pay_expires_at ?? undefined,
    invoiceDueAt: r.invoice_due_at ?? undefined,
    invoicePaidAt: r.invoice_paid_at ?? undefined,
    restocked: r.restocked ?? undefined,
    paypalOrderId: r.paypal_order_id ?? undefined,
    paypalCaptureId: r.paypal_capture_id ?? undefined,
    createdAt: r.created_at,
  };
}

type EventRow = { id: string; status: ShipmentStatus; location: string | null; note: string | null; occurred_at: string };
type ShipmentRow = { id: string; order_id: string; code: string; carrier: string; tracking_number: string | null; status: ShipmentStatus; created_at: string; shipment_events?: EventRow[] };

export function shipmentFromRow(r: ShipmentRow): Shipment {
  return {
    id: r.id,
    orderId: r.order_id,
    code: r.code,
    carrier: r.carrier,
    trackingNumber: r.tracking_number ?? undefined,
    status: r.status,
    createdAt: r.created_at,
    events: (r.shipment_events ?? []).slice().sort((a, b) => a.occurred_at.localeCompare(b.occurred_at)).map((e): ShipmentEvent => ({ id: e.id, status: e.status, location: e.location ?? undefined, note: e.note ?? undefined, occurredAt: e.occurred_at })),
  };
}
const SHIPMENT_SELECT = '*, shipment_events(id, status, location, note, occurred_at)';

type B2bRow = { profile_id: string; email: string; company: string; tax_id: string | null; note: string | null; status: B2bAccount['status']; discount_bps: number; terms_days: number; created_at: string; locale?: string };
const b2bFromRow = (r: B2bRow): B2bAccount => ({ profileId: r.profile_id, email: r.email, company: r.company, taxId: r.tax_id ?? undefined, note: r.note ?? undefined, status: r.status, discountBps: r.discount_bps, termsDays: r.terms_days, createdAt: r.created_at, locale: r.locale });
type ReviewRow = { id: string; order_id: string; rating: number; author: string; body: string; locale: string; status: ReviewStatus; created_at: string; products: { slug: string } | null };
const reviewFromRow = (r: ReviewRow): Review[] => (r.products ? [{ id: r.id, productId: r.products.slug, orderId: r.order_id, rating: r.rating, author: r.author, body: r.body, locale: r.locale, status: r.status, createdAt: r.created_at }] : []);

type PageRow = { id: string; slug: string; title_en: string; title_es: string; desc_en: string; desc_es: string; blocks: ContentPage['blocks']; published: boolean; updated_at: string };
const pageFromRow = (r: PageRow): ContentPage => ({ id: r.id, slug: r.slug, titleEn: r.title_en, titleEs: r.title_es, descEn: r.desc_en, descEs: r.desc_es, blocks: r.blocks ?? [], published: r.published, updatedAt: r.updated_at });
type PoRow = { supplier_email?: string | null; sent_at?: string | null; id: string; supplier: string; warehouse_id: string | null; status: PurchaseOrder['status']; note: string | null; items: PurchaseOrder['items']; created_at: string; received_at: string | null };
const poFromRow = (r: PoRow): PurchaseOrder => ({ supplierEmail: r.supplier_email ?? undefined, sentAt: r.sent_at ?? undefined, id: r.id, supplier: r.supplier, warehouseId: r.warehouse_id ?? undefined, status: r.status, note: r.note ?? undefined, items: r.items, createdAt: r.created_at, receivedAt: r.received_at ?? undefined });
type ReturnRow = { id: string; order_id: string; items: ReturnRequest['items']; reason: string; note: string | null; status: ReturnStatus; team_note: string | null; created_at: string };
const returnFromRow = (r: ReturnRow): ReturnRequest => ({ id: r.id, orderId: r.order_id, items: r.items, reason: r.reason, note: r.note ?? undefined, status: r.status, teamNote: r.team_note ?? undefined, createdAt: r.created_at });

export function quoteFromRow(r: QuoteRow): Quote {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone ?? undefined,
    deliveryZip: r.delivery_zip ?? undefined,
    topic: r.topic,
    product: r.product_name ?? undefined,
    message: r.message,
    status: r.status,
    locale: r.locale,
    createdAt: r.created_at,
  };
}

const ORDER_SELECT = '*, order_items(sku, name, unit_price_cents, quantity, products(slug))';

function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(`Database error: ${error.message}`);
  return data as T;
}

let limiter: SupabaseClient | undefined;

export async function hitSharedRateLimit(key: string, limit: number, windowMs: number) {
  limiter ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await limiter.rpc('hit_rate_limit', { p_key: key, p_limit: limit, p_window_ms: windowMs }).abortSignal(AbortSignal.timeout(1500));
  if (error) throw new Error(error.message);
  return data === true;
}

// Uses the secret key, so row level security does not apply here. Server code must never
// pass browser input to it unchecked, and this module must never reach the browser.
export class SupabaseStore implements Store {
  private db: SupabaseClient;

  constructor() {
    this.db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  }

  async saveQuote(q: Omit<Quote, 'id' | 'status' | 'createdAt'>) {
    const row = unwrap<QuoteRow>(await this.db.from('quote_requests').insert({
      name: q.name, email: q.email, phone: q.phone || null, delivery_zip: q.deliveryZip || null, topic: q.topic, product_name: q.product || null, message: q.message, locale: q.locale ?? 'en',
    }).select().single());
    return quoteFromRow(row);
  }

  async createOrder(o: Omit<Order, 'id' | 'status' | 'createdAt'>) {
    const order = unwrap<OrderRow>(await this.db.from('orders').insert({
      email: o.email, subtotal_cents: o.subtotalCents, shipping_cents: o.shippingCents, tax_cents: o.taxCents, total_cents: o.totalCents, currency: o.currency, locale: o.locale ?? 'en', shipping_address: o.shippingAddress ?? null, ...(o.profileId ? { profile_id: o.profileId } : {}), ...(o.quoteId ? { quote_id: o.quoteId } : {}), ...(o.payToken ? { pay_token: o.payToken, pay_expires_at: o.payExpiresAt } : {}),
    }).select().single());
    const ids = unwrap<{ id: string; slug: string }[]>(await this.db.from('products').select('id, slug').in('slug', o.items.map((i) => i.productId)));
    const { error } = await this.db.from('order_items').insert(o.items.map((i) => ({
      order_id: order.id, product_id: ids.find((x) => x.slug === i.productId)?.id ?? null, sku: i.sku, name: i.name, unit_price_cents: i.unitPriceCents, quantity: i.quantity,
    })));
    if (error) {
      await this.db.from('orders').delete().eq('id', order.id);
      throw new Error(`Database error: ${error.message}`);
    }
    return { ...orderFromRow(order), items: o.items };
  }

  async getOrder(id: string) {
    if (!UUID.test(id)) return undefined;
    const row = unwrap<OrderRow | null>(await this.db.from('orders').select(ORDER_SELECT).eq('id', id).maybeSingle());
    return row ? orderFromRow(row) : undefined;
  }

  async getOrderByPayPalId(paypalOrderId: string) {
    const row = unwrap<OrderRow | null>(await this.db.from('orders').select(ORDER_SELECT).eq('paypal_order_id', paypalOrderId).maybeSingle());
    return row ? orderFromRow(row) : undefined;
  }

  async getOrderByCaptureId(captureId: string) {
    const row = unwrap<OrderRow | null>(await this.db.from('orders').select(ORDER_SELECT).eq('paypal_capture_id', captureId).maybeSingle());
    return row ? orderFromRow(row) : undefined;
  }

  async recordSale(items: OrderItem[], reference: string) {
    unwrap(await this.db.rpc('apply_sale', { items: items.map((i) => ({ slug: i.productId, quantity: i.quantity })), reference }));
  }

  async adjustStock(c: { productId: string; warehouseId?: string; delta: number; reason: string; note?: string; actor?: string }) {
    unwrap(await this.db.rpc('adjust_stock', { p_slug: c.productId, p_warehouse: c.warehouseId ?? null, p_delta: c.delta, p_reason: c.reason, p_note: c.note ?? null, p_actor: c.actor ?? null }));
  }

  async listWarehouses() {
    return unwrap<Warehouse[]>(await this.db.from('warehouses').select('id, name, active').order('created_at'));
  }

  async addWarehouse(name: string) {
    return unwrap<Warehouse>(await this.db.from('warehouses').insert({ name }).select('id, name, active').single());
  }

  async listStockLevels() {
    type Row = { warehouse_id: string; quantity: number; products: { slug: string } | null };
    return (unwrap<unknown[]>(await this.db.from('stock_levels').select('warehouse_id, quantity, products(slug)')) as Row[]).flatMap((r): StockLevel[] => (r.products ? [{ productId: r.products.slug, warehouseId: r.warehouse_id, quantity: r.quantity }] : []));
  }

  async listMovements(limit: number) {
    type Row = { id: string; product_slug: string; warehouse_id: string | null; delta: number; reason: string; note: string | null; actor: string | null; created_at: string };
    return unwrap<Row[]>(await this.db.from('stock_movements').select().order('created_at', { ascending: false }).limit(limit)).map((m): StockMovement => ({ id: m.id, productId: m.product_slug, warehouseId: m.warehouse_id ?? undefined, delta: m.delta, reason: m.reason, note: m.note ?? undefined, actor: m.actor ?? undefined, createdAt: m.created_at }));
  }

  async listInventorySettings() {
    type Row = { reorder_point: number | null; supplier: string | null; products: { slug: string } | null };
    return (unwrap<unknown[]>(await this.db.from('inventory_settings').select('reorder_point, supplier, products(slug)')) as Row[]).flatMap((r): InventorySetting[] => (r.products ? [{ productId: r.products.slug, reorderPoint: r.reorder_point ?? undefined, supplier: r.supplier ?? undefined }] : []));
  }

  async saveInventorySetting(s: InventorySetting) {
    const product = unwrap<{ id: string }>(await this.db.from('products').select('id').eq('slug', s.productId).single());
    unwrap(await this.db.from('inventory_settings').upsert({ product_id: product.id, reorder_point: s.reorderPoint ?? null, supplier: s.supplier ?? null }).select('product_id'));
  }

  async listPurchaseOrders() {
    return unwrap<PoRow[]>(await this.db.from('purchase_orders').select().order('created_at', { ascending: false }).limit(200)).map(poFromRow);
  }

  async markPurchaseOrderSent(id: string) {
    unwrap(await this.db.from('purchase_orders').update({ sent_at: new Date().toISOString() }).eq('id', id).select('id'));
  }

  async listPages() {
    return unwrap<PageRow[]>(await this.db.from('pages').select().order('created_at', { ascending: false }).limit(500)).map(pageFromRow);
  }

  async getPage(id: string) {
    if (!UUID.test(id)) return undefined;
    const row = unwrap<PageRow | null>(await this.db.from('pages').select().eq('id', id).maybeSingle());
    return row ? pageFromRow(row) : undefined;
  }

  async getPageBySlug(slug: string) {
    const row = unwrap<PageRow | null>(await this.db.from('pages').select().eq('slug', slug).maybeSingle());
    return row ? pageFromRow(row) : undefined;
  }

  async savePage(id: string | null, p: Omit<ContentPage, 'id' | 'updatedAt'>) {
    const values = { slug: p.slug, title_en: p.titleEn, title_es: p.titleEs, desc_en: p.descEn, desc_es: p.descEs, blocks: p.blocks, published: p.published, updated_at: new Date().toISOString() };
    const query = id ? this.db.from('pages').update(values).eq('id', id) : this.db.from('pages').insert(values);
    return pageFromRow(unwrap<PageRow>(await query.select().single()));
  }

  async deletePage(id: string) {
    if (!UUID.test(id)) return;
    unwrap(await this.db.from('pages').delete().eq('id', id).select('id'));
  }

  async addSubscriber(email: string, locale: string) {
    const lower = email.toLowerCase();
    unwrap(await this.db.from('newsletter_subscribers').upsert({ email: lower, locale }, { onConflict: 'email', ignoreDuplicates: true }).select('email'));
  }

  async listSubscribers() {
    type Row = { email: string; locale: string; created_at: string };
    const [rows, out] = await Promise.all([this.db.from('newsletter_subscribers').select().order('created_at', { ascending: false }).limit(50000), this.db.from('email_optouts').select('email').limit(50000)]);
    const opted = new Set(unwrap<{ email: string }[]>(out).map((o) => o.email));
    return unwrap<Row[]>(rows).filter((r) => !opted.has(r.email)).map((r): Subscriber => ({ email: r.email, locale: r.locale, createdAt: r.created_at }));
  }

  async getWishlist(profileId: string) {
    return unwrap<{ product_slug: string }[]>(await this.db.from('wishlists').select('product_slug').eq('profile_id', profileId).order('created_at')).map((r) => r.product_slug);
  }

  async setWishlist(profileId: string, items: string[]) {
    const unique = [...new Set(items)];
    unwrap(await this.db.from('wishlists').delete().eq('profile_id', profileId).select('product_slug'));
    if (unique.length) unwrap(await this.db.from('wishlists').insert(unique.map((product_slug) => ({ profile_id: profileId, product_slug }))).select('product_slug'));
  }

  async listMachines(profileId: string) {
    type Row = { id: string; make: string; model: string; year: number | null };
    return unwrap<Row[]>(await this.db.from('saved_machines').select('id, make, model, year').eq('profile_id', profileId).order('created_at')).map((m): SavedMachine => ({ id: m.id, make: m.make, model: m.model, year: m.year ?? undefined }));
  }

  async saveMachine(profileId: string, m: Omit<SavedMachine, 'id'>) {
    const row = unwrap<{ id: string }>(await this.db.from('saved_machines').insert({ profile_id: profileId, make: m.make, model: m.model, year: m.year ?? null }).select('id').single());
    return { ...m, id: row.id };
  }

  async deleteMachine(profileId: string, id: string) {
    if (!UUID.test(id)) return;
    unwrap(await this.db.from('saved_machines').delete().eq('id', id).eq('profile_id', profileId).select('id'));
  }

  async createPurchaseOrder(po: Pick<PurchaseOrder, 'supplier' | 'supplierEmail' | 'warehouseId' | 'note' | 'items'>) {
    return poFromRow(unwrap<PoRow>(await this.db.from('purchase_orders').insert({ supplier_email: po.supplierEmail ?? null, supplier: po.supplier, warehouse_id: po.warehouseId ?? null, note: po.note ?? null, items: po.items }).select().single()));
  }

  async markPurchaseOrderReceived(id: string) {
    if (!UUID.test(id)) return undefined;
    // Only an open order changes, so two clicks cannot receive it twice.
    const rows = unwrap<PoRow[]>(await this.db.from('purchase_orders').update({ status: 'received', received_at: new Date().toISOString() }).eq('id', id).eq('status', 'open').select());
    return rows[0] ? poFromRow(rows[0]) : undefined;
  }

  async createReturn(r: Pick<ReturnRequest, 'orderId' | 'items' | 'reason' | 'note'>) {
    return returnFromRow(unwrap<ReturnRow>(await this.db.from('return_requests').insert({ order_id: r.orderId, items: r.items, reason: r.reason, note: r.note ?? null }).select().single()));
  }

  async listReturns() {
    return unwrap<ReturnRow[]>(await this.db.from('return_requests').select().order('created_at', { ascending: false }).limit(300)).map(returnFromRow);
  }

  async listReturnsForOrder(orderId: string) {
    if (!UUID.test(orderId)) return [];
    return unwrap<ReturnRow[]>(await this.db.from('return_requests').select().eq('order_id', orderId).order('created_at')).map(returnFromRow);
  }

  async getReturn(id: string) {
    if (!UUID.test(id)) return undefined;
    const row = unwrap<ReturnRow | null>(await this.db.from('return_requests').select().eq('id', id).maybeSingle());
    return row ? returnFromRow(row) : undefined;
  }

  async updateReturn(id: string, status: ReturnStatus, teamNote?: string) {
    unwrap(await this.db.from('return_requests').update({ status, ...(teamNote ? { team_note: teamNote } : {}) }).eq('id', id).select('id'));
  }

  async addAudit(e: Pick<AuditEntry, 'actor' | 'action' | 'target' | 'detail'>) {
    unwrap(await this.db.from('audit_log').insert({ actor: e.actor, action: e.action, target: e.target ?? null, detail: e.detail ?? null }).select('id'));
  }

  async listAudit(limit: number) {
    type Row = { id: string; actor: string; action: string; target: string | null; detail: string | null; created_at: string };
    return unwrap<Row[]>(await this.db.from('audit_log').select().order('created_at', { ascending: false }).limit(limit)).map((a): AuditEntry => ({ id: a.id, actor: a.actor, action: a.action, target: a.target ?? undefined, detail: a.detail ?? undefined, createdAt: a.created_at }));
  }

  private async emailsById() {
    const map = new Map<string, string>();
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await this.db.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw new Error(error.message);
      data.users.forEach((u) => u.email && map.set(u.id, u.email));
      if (data.users.length < 1000) break;
    }
    return map;
  }

  async listTeam() {
    const rows = unwrap<{ id: string; role: string }[]>(await this.db.from('profiles').select('id, role').in('role', ['staff', 'admin']));
    const emails = await this.emailsById();
    return rows.map((r): TeamMember => ({ email: emails.get(r.id) ?? r.id, role: r.role }));
  }

  async setRole(email: string, role: 'customer' | 'staff' | 'admin') {
    const emails = await this.emailsById();
    const id = [...emails].find(([, e]) => e.toLowerCase() === email.toLowerCase())?.[0];
    if (!id) return false;
    unwrap(await this.db.from('profiles').update({ role }).eq('id', id).select('id'));
    return true;
  }

  async addEvent(e: StoreEvent) {
    const { error } = await this.db.from('analytics_events').insert({ name: e.name, session: e.session, product_slug: e.productSlug ?? null, query: e.query ?? null, results: e.results ?? null, locale: e.locale ?? null });
    if (error) throw new Error(error.message);
  }

  async listEvents(since: string) {
    type Row = { name: string; session: string; product_slug: string | null; query: string | null; results: number | null; locale: string | null; created_at: string };
    return unwrap<Row[]>(await this.db.from('analytics_events').select('name, session, product_slug, query, results, locale, created_at').gte('created_at', since).order('created_at', { ascending: false }).limit(50000)).map((e): StoreEvent => ({ name: e.name, session: e.session, productSlug: e.product_slug ?? undefined, query: e.query ?? undefined, results: e.results ?? undefined, locale: e.locale ?? undefined, createdAt: e.created_at }));
  }

  async purgeEvents(before: string) {
    const { error } = await this.db.from('analytics_events').delete().lt('created_at', before);
    if (error) throw new Error(error.message);
  }

  async getOrderByPayToken(token: string) {
    const row = unwrap<OrderRow | null>(await this.db.from('orders').select(ORDER_SELECT).eq('pay_token', token).maybeSingle());
    return row ? orderFromRow(row) : undefined;
  }

  async listSalesRules() {
    type Row = { reorder_days: number | null; volume: SalesRule['volume']; products: { slug: string } | null };
    return (unwrap<unknown[]>(await this.db.from('product_sales_rules').select('reorder_days, volume, products(slug)')) as Row[]).flatMap((r): SalesRule[] => (r.products ? [{ productId: r.products.slug, reorderDays: r.reorder_days ?? undefined, volume: r.volume ?? [] }] : []));
  }

  async saveSalesRule(rule: SalesRule) {
    const product = unwrap<{ id: string }>(await this.db.from('products').select('id').eq('slug', rule.productId).single());
    unwrap(await this.db.from('product_sales_rules').upsert({ product_id: product.id, reorder_days: rule.reorderDays ?? null, volume: rule.volume }).select('product_id'));
  }

  async getB2bAccount(profileId: string) {
    const row = unwrap<B2bRow | null>(await this.db.from('b2b_accounts').select().eq('profile_id', profileId).maybeSingle());
    return row ? b2bFromRow(row) : undefined;
  }

  async listB2bAccounts() {
    return unwrap<B2bRow[]>(await this.db.from('b2b_accounts').select().order('created_at', { ascending: false })).map(b2bFromRow);
  }

  async saveB2bAccount(a: B2bAccount) {
    unwrap(await this.db.from('b2b_accounts').upsert({ profile_id: a.profileId, email: a.email, company: a.company, tax_id: a.taxId ?? null, note: a.note ?? null, status: a.status, discount_bps: a.discountBps, terms_days: a.termsDays, ...(a.locale ? { locale: a.locale } : {}) }).select('profile_id'));
  }

  async listReviews() {
    return (unwrap<unknown[]>(await this.db.from('reviews').select('*, products(slug)').order('created_at', { ascending: false }).limit(500)) as ReviewRow[]).flatMap(reviewFromRow);
  }

  async listApprovedReviews(productId: string) {
    const product = unwrap<{ id: string } | null>(await this.db.from('products').select('id').eq('slug', productId).maybeSingle());
    if (!product) return [];
    return (unwrap<unknown[]>(await this.db.from('reviews').select('*, products(slug)').eq('product_id', product.id).eq('status', 'approved').order('created_at', { ascending: false }).limit(100)) as ReviewRow[]).flatMap(reviewFromRow);
  }

  async saveReview(r: Pick<Review, 'productId' | 'orderId' | 'rating' | 'author' | 'body' | 'locale'>) {
    const product = unwrap<{ id: string }>(await this.db.from('products').select('id').eq('slug', r.productId).single());
    unwrap(await this.db.from('reviews').insert({ product_id: product.id, order_id: r.orderId, rating: r.rating, author: r.author, body: r.body, locale: r.locale ?? 'en' }).select('id'));
  }

  async moderateReview(id: string, status: ReviewStatus) {
    if (!UUID.test(id)) return;
    unwrap(await this.db.from('reviews').update({ status }).eq('id', id).select('id'));
  }

  async isOptedOut(email: string) {
    return Boolean(unwrap<{ email: string } | null>(await this.db.from('email_optouts').select('email').eq('email', email.toLowerCase()).maybeSingle()));
  }

  async optOut(email: string) {
    unwrap(await this.db.from('email_optouts').upsert({ email: email.toLowerCase() }).select('email'));
  }

  async claimReminder(key: string) {
    // The primary key decides: of two runs at once, only one insert succeeds.
    const rows = unwrap<{ key: string }[]>(await this.db.from('email_reminders').upsert({ key }, { onConflict: 'key', ignoreDuplicates: true }).select('key'));
    return rows.length > 0;
  }

  async listShippingZones() {
    type Row = { id: string; name: string; states: string[]; base_cents: number; per_lb_cents: number; free_over_cents: number | null; active: boolean };
    return unwrap<Row[]>(await this.db.from('shipping_zones').select().order('created_at')).map((z): ShippingZone => ({ id: z.id, name: z.name, states: z.states, baseCents: z.base_cents, perLbCents: z.per_lb_cents, freeOverCents: z.free_over_cents ?? undefined, active: z.active }));
  }

  async saveShippingZones(zones: ShippingZone[]) {
    const keep = zones.map((z) => z.id);
    const old = unwrap<{ id: string }[]>(await this.db.from('shipping_zones').select('id')).map((z) => z.id).filter((id) => !keep.includes(id));
    if (old.length) unwrap(await this.db.from('shipping_zones').delete().in('id', old).select('id'));
    if (zones.length) unwrap(await this.db.from('shipping_zones').upsert(zones.map((z) => ({ id: z.id, name: z.name, states: z.states, base_cents: z.baseCents, per_lb_cents: z.perLbCents, free_over_cents: z.freeOverCents ?? null, active: z.active }))).select('id'));
  }

  async getTaxZipRate(zip: string) {
    const row = unwrap<{ zip: string; rate_bps: number; region: string | null } | null>(await this.db.from('tax_zip_rates').select().eq('zip', zip).maybeSingle());
    return row ? { zip: row.zip, rateBps: row.rate_bps, region: row.region ?? undefined } : undefined;
  }

  async countTaxZipRates() {
    const { count, error } = await this.db.from('tax_zip_rates').select('zip', { count: 'exact' }).limit(1);
    if (error) throw new Error(error.message);
    return count ?? 0;
  }

  async replaceTaxZipRates(rates: TaxZipRate[]) {
    unwrap(await this.db.from('tax_zip_rates').delete().neq('zip', '').select('zip'));
    for (let i = 0; i < rates.length; i += 1000) {
      unwrap(await this.db.from('tax_zip_rates').insert(rates.slice(i, i + 1000).map((r) => ({ zip: r.zip, rate_bps: r.rateBps, region: r.region ?? null }))).select('zip'));
    }
  }

  async listFitment() {
    type Row = { make: string; model: string; year_from: number; year_to: number; products: { slug: string } | null };
    return (unwrap<unknown[]>(await this.db.from('product_fitment').select('make, model, year_from, year_to, products(slug)').limit(20000)) as Row[]).flatMap((r): ProductFitment[] => (r.products ? [{ productId: r.products.slug, make: r.make, model: r.model, yearFrom: r.year_from, yearTo: r.year_to }] : []));
  }

  async saveFitment(productId: string, fitment: Fitment[]) {
    const product = unwrap<{ id: string }>(await this.db.from('products').select('id').eq('slug', productId).single());
    unwrap(await this.db.from('product_fitment').delete().eq('product_id', product.id).select('id'));
    if (fitment.length) unwrap(await this.db.from('product_fitment').insert(fitment.map((f) => ({ product_id: product.id, make: f.make, model: f.model, year_from: f.yearFrom, year_to: f.yearTo }))).select('id'));
  }

  async listAddresses(profileId: string) {
    type Row = { id: string; recipient: string; line1: string; line2: string | null; city: string; state: string; postal_code: string; phone: string | null };
    return unwrap<Row[]>(await this.db.from('addresses').select('id, recipient, line1, line2, city, state, postal_code, phone').eq('profile_id', profileId).order('created_at')).map((a): Address => ({ id: a.id, recipient: a.recipient, line1: a.line1, line2: a.line2 ?? undefined, city: a.city, state: a.state, postalCode: a.postal_code, phone: a.phone ?? undefined }));
  }

  async saveAddress(profileId: string, a: Omit<Address, 'id'>) {
    const row = unwrap<{ id: string }>(await this.db.from('addresses').insert({ profile_id: profileId, recipient: a.recipient, line1: a.line1, line2: a.line2 ?? null, city: a.city, state: a.state, postal_code: a.postalCode, phone: a.phone ?? null }).select('id').single());
    return { ...a, id: row.id };
  }

  async deleteAddress(profileId: string, id: string) {
    if (!UUID.test(id)) return;
    unwrap(await this.db.from('addresses').delete().eq('id', id).eq('profile_id', profileId).select('id'));
  }

  async listCustomerOrders(profileId: string, email?: string) {
    const mine = unwrap<OrderRow[]>(await this.db.from('orders').select(ORDER_SELECT).eq('profile_id', profileId).order('created_at', { ascending: false }).limit(100));
    const guest = email ? unwrap<OrderRow[]>(await this.db.from('orders').select(ORDER_SELECT).is('profile_id', null).ilike('email', email.replace(/[\\%_]/g, '\\$&')).order('created_at', { ascending: false }).limit(100)) : [];
    return [...mine, ...guest].sort((a, b) => b.created_at.localeCompare(a.created_at)).map(orderFromRow);
  }

  async markWelcomed(profileId: string) {
    // Only the first caller changes a row, so two logins at once cannot greet twice.
    const rows = unwrap<{ id: string }[]>(await this.db.from('profiles').update({ welcomed_at: new Date().toISOString() }).eq('id', profileId).is('welcomed_at', null).select('id'));
    return rows.length > 0;
  }

  async listTaxRates() {
    return unwrap<{ state: string; rate_bps: number; active: boolean; tax_shipping?: boolean }[]>(await this.db.from('tax_rates').select().order('state')).map((r): TaxRate => ({ state: r.state, rateBps: r.rate_bps, active: r.active, taxShipping: r.tax_shipping ?? false }));
  }

  async saveTaxRates(rates: TaxRate[]) {
    const keep = rates.map((r) => r.state);
    if (rates.length) unwrap(await this.db.from('tax_rates').upsert(rates.map((r) => ({ state: r.state, rate_bps: r.rateBps, active: r.active, tax_shipping: r.taxShipping ?? false, updated_at: new Date().toISOString() }))).select('state'));
    const stale = unwrap<{ state: string }[]>(await this.db.from('tax_rates').select('state')).map((r) => r.state).filter((s) => !keep.includes(s));
    if (stale.length) unwrap(await this.db.from('tax_rates').delete().in('state', stale).select('state'));
  }

  async listEmailTemplates() {
    return unwrap<(Omit<StoredTemplate, 'updatedAt'> & { updated_at: string })[]>(await this.db.from('email_templates').select()).map(({ updated_at, ...t }): StoredTemplate => ({ ...t, updatedAt: updated_at }));
  }

  async saveEmailTemplate({ updatedAt: _, ...t }: StoredTemplate) {
    unwrap(await this.db.from('email_templates').upsert({ ...t, updated_at: new Date().toISOString() }).select('key'));
  }

  async deleteEmailTemplate(key: TemplateKey) {
    unwrap(await this.db.from('email_templates').delete().eq('key', key).select('key'));
  }

  async listShipments() {
    return unwrap<ShipmentRow[]>(await this.db.from('shipments').select(SHIPMENT_SELECT).order('created_at', { ascending: false }).limit(500)).map(shipmentFromRow);
  }

  async getShipmentByOrder(orderId: string) {
    const row = unwrap<ShipmentRow | null>(await this.db.from('shipments').select(SHIPMENT_SELECT).eq('order_id', orderId).maybeSingle());
    return row ? shipmentFromRow(row) : undefined;
  }

  async getShipmentByCode(code: string) {
    const row = unwrap<ShipmentRow | null>(await this.db.from('shipments').select(SHIPMENT_SELECT).eq('code', code).maybeSingle());
    return row ? shipmentFromRow(row) : undefined;
  }

  async createShipment(s: { orderId: string; code: string; carrier: string; trackingNumber?: string }) {
    const row = unwrap<ShipmentRow>(await this.db.from('shipments').insert({ order_id: s.orderId, code: s.code, carrier: s.carrier, tracking_number: s.trackingNumber ?? null }).select().single());
    unwrap(await this.db.from('shipment_events').insert({ shipment_id: row.id, status: 'label_created' }).select('id'));
    return (await this.getShipmentByCode(s.code))!;
  }

  async addShipmentEvent(shipmentId: string, e: { status: ShipmentStatus; location?: string; note?: string }) {
    unwrap(await this.db.from('shipment_events').insert({ shipment_id: shipmentId, status: e.status, location: e.location ?? null, note: e.note ?? null }).select('id'));
    const row = unwrap<ShipmentRow>(await this.db.from('shipments').update({ status: e.status }).eq('id', shipmentId).select(SHIPMENT_SELECT).single());
    return shipmentFromRow(row);
  }

  async restock(items: OrderItem[]) {
    unwrap(await this.db.rpc('restock', { items: items.map((i) => ({ slug: i.productId, quantity: i.quantity })) }));
  }

  async updateOrder(id: string, patch: OrderPatch) {
    const row = unwrap<OrderRow>(await this.db.from('orders').update({
      updated_at: new Date().toISOString(),
      ...(patch.status ? { status: patch.status } : {}),
      ...(patch.paypalOrderId ? { paypal_order_id: patch.paypalOrderId } : {}),
      ...(patch.paypalCaptureId ? { paypal_capture_id: patch.paypalCaptureId } : {}),
      ...(patch.shippingAddress ? { shipping_address: patch.shippingAddress } : {}),
      ...(patch.refundedCents !== undefined ? { refunded_cents: patch.refundedCents } : {}),
      ...(patch.payToken ? { pay_token: patch.payToken, pay_expires_at: patch.payExpiresAt } : {}),
      ...(patch.invoiceDueAt ? { invoice_due_at: patch.invoiceDueAt } : {}),
      ...(patch.invoicePaidAt ? { invoice_paid_at: patch.invoicePaidAt } : {}),
      ...(patch.restocked ? { restocked: patch.restocked } : {}),
    }).eq('id', id).select(ORDER_SELECT).single());
    return orderFromRow(row);
  }

  async claimOrderPaid(id: string, patch: OrderPatch) {
    // Only an unpaid order changes, so parallel captures and webhooks settle it once.
    const rows = unwrap<OrderRow[]>(await this.db.from('orders').update({
      updated_at: new Date().toISOString(),
      status: 'paid',
      ...(patch.paypalCaptureId ? { paypal_capture_id: patch.paypalCaptureId } : {}),
      ...(patch.shippingAddress ? { shipping_address: patch.shippingAddress } : {}),
    }).eq('id', id).in('status', ['pending_payment', 'payment_failed']).select(ORDER_SELECT));
    return rows[0] ? orderFromRow(rows[0]) : undefined;
  }

  async listOrders() {
    // Page by page, so reports and accounting see every order, up to a safe limit.
    const rows: OrderRow[] = [];
    for (let from = 0; from < 50_000; from += 1000) {
      const page = unwrap<OrderRow[]>(await this.db.from('orders').select(ORDER_SELECT).order('created_at', { ascending: false }).range(from, from + 999));
      rows.push(...page);
      if (page.length < 1000) break;
    }
    return rows.map(orderFromRow);
  }

  async listQuotes() {
    return unwrap<QuoteRow[]>(await this.db.from('quote_requests').select().order('created_at', { ascending: false }).limit(500)).map(quoteFromRow);
  }

  async getQuote(id: string) {
    if (!UUID.test(id)) return undefined;
    const row = unwrap<QuoteRow | null>(await this.db.from('quote_requests').select().eq('id', id).maybeSingle());
    return row ? quoteFromRow(row) : undefined;
  }

  async updateQuoteStatus(id: string, status: QuoteStatus) {
    return quoteFromRow(unwrap<QuoteRow>(await this.db.from('quote_requests').update({ status }).eq('id', id).select().single()));
  }

  async listProducts() {
    const rows: ProductRow[] = [];
    for (let from = 0; ; from += PAGE) {
      const page = unwrap<ProductRow[]>(await this.db.from('products').select('*, product_images(path, sort_order)').order('created_at').order('slug').range(from, from + PAGE - 1));
      rows.push(...page);
      if (page.length < PAGE) return rows.map(productFromRow);
    }
  }

  async saveProducts(list: StoredProduct[]) {
    const saved = unwrap<{ id: string; slug: string }[]>(await this.db.from('products')
      .upsert(list.map((p) => ({ ...productToRow(p), updated_at: new Date().toISOString() })), { onConflict: 'slug' }).select('id, slug'));
    const ids = saved.map((s) => s.id);
    unwrap(await this.db.from('product_images').delete().in('product_id', ids));
    unwrap(await this.db.from('product_images').insert(list.flatMap((p) => [p.img, ...(p.gallery ?? [])].map((path, i) => ({ product_id: saved.find((s) => s.slug === p.id)!.id, path, alt: p.name, sort_order: i })))));
  }

  async deleteProduct(id: string) {
    unwrap(await this.db.from('products').delete().eq('slug', id));
  }

  async reduceStock(items: OrderItem[]) {
    unwrap(await this.db.rpc('reduce_stock', { items: items.map((i) => ({ slug: i.productId, quantity: i.quantity })) }));
  }

  async uploadImage(bytes: Uint8Array, type: PhotoType) {
    const bucket = this.db.storage.from(PHOTO_BUCKET);
    const name = `${randomUUID()}.${PHOTO_EXTENSIONS[type]}`;
    const { error } = await bucket.upload(name, bytes, { contentType: type, cacheControl: '31536000' });
    if (error) throw new Error(error.message);
    return bucket.getPublicUrl(name).data.publicUrl;
  }

  async deleteImage(img: string) {
    const prefix = this.db.storage.from(PHOTO_BUCKET).getPublicUrl('').data.publicUrl;
    if (!img.startsWith(prefix)) return;
    const { error } = await this.db.storage.from(PHOTO_BUCKET).remove([img.slice(prefix.length)]);
    if (error) throw new Error(error.message);
  }

  // For /api/health: confirms the connection and migrations without exposing data.
  async check() {
    const categories = await this.db.from('categories').select('id', { count: 'exact', head: true });
    if (categories.error) return { database: 'error' as const };
    const tags = await this.db.from('products').select('tags', { head: true });
    const stock = await this.db.rpc('reduce_stock', { items: [] });
    const languages = await this.db.from('products').select('name_es', { head: true });
    const photos = await this.db.storage.getBucket(PHOTO_BUCKET);
    const refunds = await this.db.from('orders').select('refunded_cents', { head: true });
    // A real read: a head request on a missing table comes back without an error.
    const tools = await this.db.from('shipments').select('id').limit(1);
    const rates = await this.db.from('shipping_zones').select('id').limit(1);
    const sales = await this.db.from('reviews').select('id').limit(1);
    const ops = await this.db.from('audit_log').select('id').limit(1);
    const extras = await this.db.from('wishlists').select('product_slug').limit(1);
    const pages = await this.db.from('pages').select('id').limit(1);
    const limits = await this.db.rpc('hit_rate_limit', { p_key: 'health-check', p_limit: 1000000, p_window_ms: 1000 });
    return { database: 'connected' as const, categories: categories.count ?? 0, migration0002: !tags.error, migration0003: !stock.error, migration0004: !languages.error, migration0005: !photos.error, migration0006: !refunds.error, migration0007: !limits.error, migration0008: !tools.error, migration0009: !rates.error, migration0010: !sales.error, migration0011: !ops.error, migration0012: !extras.error, migration0013: !pages.error };
  }
}
