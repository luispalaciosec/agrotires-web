import { afterEach, describe, expect, it, vi } from 'vitest';
import { products as demoProducts } from '@/lib/catalog';
import { getPublicProducts } from '@/lib/products';
import type { StoredProduct } from '@/lib/server/store';
import { orderFromRow, productFromRow, productToRow, quoteFromRow, type ProductRow } from '@/lib/server/supabase-store';

const product: StoredProduct = {
  id: 'field-tire', cat: 'tires', name: 'Field Tire', sku: 'FT-1', desc: 'Desc', price: 19.99, img: 'agro-toolkit.webp', tags: ['Tractor'],
  brand: 'Acme', tireSize: '18.4-38', stockQty: 4, active: true, shippingClass: 'freight_quote', compatibilityVerified: true, weightLb: 12.5,
};

describe('database mapping', () => {
  it('round-trips a product without losing fields', () => {
    const row = productToRow(product);
    expect(row).toMatchObject({ slug: 'field-tire', category_id: 'tires', price_cents: 1999, stock_qty: 4, tire_size: '18.4-38', weight_lb: 12.5 });
    expect(productFromRow({ ...row, product_images: [{ path: 'agro-toolkit.webp', sort_order: 0 }] })).toEqual({
      ...product, equipmentMake: undefined, equipmentModel: undefined, lengthIn: undefined, widthIn: undefined, heightIn: undefined,
    });
  });
  it('avoids floating point errors in cents', () => {
    expect(productToRow({ ...product, price: 1.15 }).price_cents).toBe(115);
    expect(productToRow({ ...product, price: 4.35 }).price_cents).toBe(435);
  });
  it('keeps an unpriced product and untracked stock as null', () => {
    const row = productToRow({ ...product, price: null, stockQty: null, active: false });
    expect(row).toMatchObject({ price_cents: null, stock_qty: null });
    expect(productFromRow(row)).toMatchObject({ price: null, stockQty: null });
  });
  it('reads numeric columns returned as text and picks the first image', () => {
    const row: ProductRow = { ...productToRow(product), weight_lb: '12.50', product_images: [{ path: 'b.webp', sort_order: 1 }, { path: 'a.webp', sort_order: 0 }] };
    expect(productFromRow(row)).toMatchObject({ weightLb: 12.5, img: 'a.webp' });
  });
  it('maps orders and quotes', () => {
    expect(orderFromRow({
      id: 'o', email: 'a@b.test', status: 'paid', subtotal_cents: 100, shipping_cents: 0, tax_cents: 0, total_cents: 100, paypal_order_id: 'P', paypal_capture_id: null, created_at: 'now',
      order_items: [{ sku: 'S', name: 'N', unit_price_cents: 100, quantity: 1, products: { slug: 'x' } }, { sku: 'T', name: 'Gone', unit_price_cents: 1, quantity: 1, products: null }],
    })).toMatchObject({ totalCents: 100, paypalOrderId: 'P', paypalCaptureId: undefined, items: [{ productId: 'x' }, { productId: '' }] });
    expect(quoteFromRow({ id: 'q', name: 'A', email: 'a@b.test', phone: null, delivery_zip: '50301', topic: 'T', product_name: 'P', message: 'M', status: 'new', created_at: 'now' }))
      .toMatchObject({ deliveryZip: '50301', product: 'P', phone: undefined });
  });
});

describe('storefront catalog', () => {
  afterEach(() => {
    delete process.env.STORE_DRIVER;
    delete process.env.STORE_FILE;
    vi.restoreAllMocks();
  });
  it('shows the sample catalog when no storage is configured', async () => {
    expect(await getPublicProducts()).toEqual(demoProducts);
  });
});
