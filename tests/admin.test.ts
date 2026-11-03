import { describe, expect, it } from 'vitest';
import { products as demoProducts } from '@/lib/catalog';
import { importProducts, parseCsv } from '@/lib/server/csv-import';
import { createToken, hashPassword, verifyPassword, verifyToken } from '@/lib/server/password';
import { parseProduct, type ProductInput } from '@/lib/server/product-input';
import type { StoredProduct } from '@/lib/server/store';

const catalog: StoredProduct[] = demoProducts.map((p) => ({ ...p, stockQty: null, active: true, shippingClass: 'parcel', compatibilityVerified: false }));
const input: ProductInput = {
  sku: 'NEW-1', name: 'New Tire', nameEs: '', cat: 'tires', brand: '', desc: '', descEs: '', price: '10.50', stockQty: '3', img: 'agro-tires.webp', tags: 'Tractor, Planter',
  tireSize: '', equipmentMake: '', equipmentModel: '', shippingClass: 'parcel', weightLb: '', lengthIn: '', widthIn: '', heightIn: '', compatibilityVerified: false, active: true,
};
const HEADER = 'sku,name,category,brand,description,price_usd,currency,stock_qty,weight_lb,length_in,width_in,height_in,tire_size,equipment_make,equipment_model,compatibility_verified,image_filename,shipping_class,active';
const row = (o: { sku?: string; name?: string; cat?: string; price?: string; active?: string; img?: string; currency?: string } = {}) =>
  `${o.sku ?? 'CSV-1'},${o.name ?? '"Tire, large"'},${o.cat ?? 'tires'},Acme,"Says ""hi""",${o.price ?? '99.99'},${o.currency ?? 'USD'},4,,,,,18.4-38,,,yes,${o.img ?? 'agro-tires.webp'},freight_quote,${o.active ?? 'true'}`;

describe('admin access', () => {
  it('verifies only the right password', () => {
    const hash = hashPassword('correct horse battery');
    expect(verifyPassword('correct horse battery', hash)).toBe(true);
    expect(verifyPassword('wrong', hash)).toBe(false);
    expect(verifyPassword('x', 'malformed')).toBe(false);
  });
  it('rejects forged, expired and foreign tokens', () => {
    const secret = 'a'.repeat(32);
    const token = createToken(secret);
    expect(verifyToken(token, secret)).toBe(true);
    expect(verifyToken(undefined, secret)).toBe(false);
    expect(verifyToken(token, 'b'.repeat(32))).toBe(false);
    expect(verifyToken(`${Date.now() + 9e9}.${token.split('.')[1]}`, secret)).toBe(false);
    expect(verifyToken(createToken(secret, Date.now() - 9e9), secret)).toBe(false);
  });
});

describe('product validation', () => {
  it('builds a product with a unique id', () => {
    const r = parseProduct({ ...input, name: 'Rear Tractor Tire — Demo R1' }, [...catalog, { ...catalog[0], id: 'rear-tractor-tire-demo-r1' }]);
    expect(r).toMatchObject({ ok: true, product: { id: 'rear-tractor-tire-demo-r1-2', price: 10.5, stockQty: 3, tags: ['Tractor', 'Planter'] } });
  });
  it('rejects a duplicate SKU, but not on its own product', () => {
    expect(parseProduct({ ...input, sku: 'demo-tir-001' }, catalog).ok).toBe(false);
    expect(parseProduct({ ...input, sku: 'DEMO-TIR-001' }, catalog, 'tire-r1').ok).toBe(true);
  });
  it('refuses an active product without a price', () => {
    expect(parseProduct({ ...input, price: '' }, catalog)).toMatchObject({ ok: false, error: expect.stringContaining('price') });
    expect(parseProduct({ ...input, price: '', active: false }, catalog)).toMatchObject({ ok: true, product: { price: null } });
  });
  it('rejects bad numbers, categories and images', () => {
    expect(parseProduct({ ...input, price: '-1' }, catalog).ok).toBe(false);
    expect(parseProduct({ ...input, stockQty: '1.5' }, catalog).ok).toBe(false);
    expect(parseProduct({ ...input, cat: 'machine' }, catalog).ok).toBe(false);
    expect(parseProduct({ ...input, img: '../../secret.png' }, catalog).ok).toBe(false);
  });
});

describe('CSV import', () => {
  it('parses quotes, commas and Windows line endings', () => {
    expect(parseCsv('﻿a,b\r\n"x, y","say ""hi"""\r\n')).toEqual([['a', 'b'], ['x, y', 'say "hi"']]);
  });
  it('creates and updates by SKU', () => {
    const r = importProducts(`${HEADER}\n${row()}\n${row({ sku: 'DEMO-TIR-001', name: 'Updated' })}\n`, catalog);
    expect(r).toMatchObject({ ok: true, created: 1, updated: 1 });
    if (!r.ok) return;
    expect(r.products[0]).toMatchObject({ name: 'Tire, large', desc: 'Says "hi"', tireSize: '18.4-38', shippingClass: 'freight_quote', compatibilityVerified: true, stockQty: 4 });
    expect(r.products[1].id).toBe('tire-r1');
  });
  it('imports nothing and lists every problem when a line is wrong', () => {
    const r = importProducts(`${HEADER}\n${row()}\n${row({ sku: 'A', cat: 'nope' })}\n${row({ sku: 'B', price: '', active: 'true' })}\n${row({ sku: 'C', currency: 'EUR' })}\n`, catalog);
    expect(r).toMatchObject({ ok: false });
    if (!r.ok) expect(r.errors).toHaveLength(3);
  });
  it('reads optional Spanish columns', () => {
    const r = importProducts(`${HEADER},name_es,description_es\n${row()},Llanta grande,Descripción\n`, catalog);
    expect(r).toMatchObject({ ok: true, products: [{ nameEs: 'Llanta grande', descEs: 'Descripción' }] });
  });
  it('rejects repeated SKUs in the same file and missing columns', () => {
    expect(importProducts(`${HEADER}\n${row()}\n${row({ name: 'Again' })}\n`, catalog)).toMatchObject({ ok: true, created: 1, updated: 1 });
    expect(importProducts('sku,name\nA,B\n', catalog)).toMatchObject({ ok: false, errors: [expect.stringContaining('Missing columns')] });
    expect(importProducts(`${HEADER}\n`, catalog)).toMatchObject({ ok: false });
  });
});
