import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Order, OrderItem, Quote, QuoteStatus, ShippingClass, Store, StoredProduct } from './store';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FALLBACK_IMAGE = 'agro-tires.webp';
const PAGE = 1000;

export const supabaseConfigured = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);

export type ProductRow = {
  id?: string;
  slug: string;
  sku: string;
  name: string;
  category_id: string;
  brand: string | null;
  description: string;
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
    sku: r.sku,
    desc: r.description,
    price: r.price_cents === null ? null : r.price_cents / 100,
    img: images[0]?.path ?? FALLBACK_IMAGE,
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
    category_id: p.cat,
    brand: p.brand ?? null,
    description: p.desc,
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
  paypal_order_id: string | null; paypal_capture_id: string | null; created_at: string; order_items?: ItemRow[];
};
type QuoteRow = {
  id: string; name: string; email: string; phone: string | null; delivery_zip: string | null; topic: string; product_name: string | null;
  message: string; status: QuoteStatus; created_at: string;
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
    paypalOrderId: r.paypal_order_id ?? undefined,
    paypalCaptureId: r.paypal_capture_id ?? undefined,
    createdAt: r.created_at,
  };
}

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
    createdAt: r.created_at,
  };
}

const ORDER_SELECT = '*, order_items(sku, name, unit_price_cents, quantity, products(slug))';

function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(`Database error: ${error.message}`);
  return data as T;
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
      name: q.name, email: q.email, phone: q.phone || null, delivery_zip: q.deliveryZip || null, topic: q.topic, product_name: q.product || null, message: q.message,
    }).select().single());
    return quoteFromRow(row);
  }

  async createOrder(o: Omit<Order, 'id' | 'status' | 'createdAt'>) {
    const order = unwrap<OrderRow>(await this.db.from('orders').insert({
      email: o.email, subtotal_cents: o.subtotalCents, shipping_cents: o.shippingCents, tax_cents: o.taxCents, total_cents: o.totalCents, currency: o.currency,
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

  async updateOrder(id: string, patch: Partial<Pick<Order, 'status' | 'paypalOrderId' | 'paypalCaptureId'>>) {
    const row = unwrap<OrderRow>(await this.db.from('orders').update({
      updated_at: new Date().toISOString(),
      ...(patch.status ? { status: patch.status } : {}),
      ...(patch.paypalOrderId ? { paypal_order_id: patch.paypalOrderId } : {}),
      ...(patch.paypalCaptureId ? { paypal_capture_id: patch.paypalCaptureId } : {}),
    }).eq('id', id).select(ORDER_SELECT).single());
    return orderFromRow(row);
  }

  async listOrders() {
    return unwrap<OrderRow[]>(await this.db.from('orders').select(ORDER_SELECT).order('created_at', { ascending: false }).limit(500)).map(orderFromRow);
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
    unwrap(await this.db.from('product_images').insert(list.map((p) => ({ product_id: saved.find((s) => s.slug === p.id)!.id, path: p.img, alt: p.name, sort_order: 0 }))));
  }

  async deleteProduct(id: string) {
    unwrap(await this.db.from('products').delete().eq('slug', id));
  }

  async reduceStock(items: OrderItem[]) {
    unwrap(await this.db.rpc('reduce_stock', { items: items.map((i) => ({ slug: i.productId, quantity: i.quantity })) }));
  }

  // For /api/health: confirms the connection and migrations without exposing data.
  async check() {
    const categories = await this.db.from('categories').select('id', { count: 'exact', head: true });
    if (categories.error) return { database: 'error' as const };
    const tags = await this.db.from('products').select('tags', { head: true });
    const stock = await this.db.rpc('reduce_stock', { items: [] });
    return { database: 'connected' as const, categories: categories.count ?? 0, migration0002: !tags.error, migration0003: !stock.error };
  }
}
