import { parseProduct } from './product-input';
import type { ShippingClass, StoredProduct } from './store';

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}

const REQUIRED = ['sku', 'name', 'category', 'brand', 'description', 'price_usd', 'currency', 'stock_qty', 'weight_lb', 'length_in', 'width_in', 'height_in', 'tire_size', 'equipment_make', 'equipment_model', 'compatibility_verified', 'image_filename', 'shipping_class', 'active'];
const isTrue = (v: string) => ['true', 'yes', '1', 'si', 'sí'].includes(v.trim().toLowerCase());

export type ImportResult = { ok: true; products: StoredProduct[]; created: number; updated: number } | { ok: false; errors: string[] };

// All or nothing: a half-imported catalog is harder to fix than a rejected file.
export function importProducts(text: string, catalog: StoredProduct[]): ImportResult {
  const [header, ...rows] = parseCsv(text);
  if (!header) return { ok: false, errors: ['The file is empty'] };
  const columns = header.map((h) => h.trim().toLowerCase());
  const missing = REQUIRED.filter((c) => !columns.includes(c));
  if (missing.length) return { ok: false, errors: [`Missing columns: ${missing.join(', ')}`] };
  if (!rows.length) return { ok: false, errors: ['The file has no products'] };

  const errors: string[] = [];
  const working = catalog.slice();
  const products: StoredProduct[] = [];
  let created = 0;
  rows.forEach((cells, index) => {
    const get = (name: string) => (cells[columns.indexOf(name)] ?? '').trim();
    const line = index + 2;
    if (get('currency') && get('currency').toUpperCase() !== 'USD') {
      errors.push(`Line ${line}: only USD is supported`);
      return;
    }
    const existing = working.find((p) => p.sku.toLowerCase() === get('sku').toLowerCase());
    const result = parseProduct({
      sku: get('sku'),
      name: get('name'),
      nameEs: get('name_es') || existing?.nameEs || '',
      cat: get('category'),
      brand: get('brand'),
      desc: get('description'),
      descEs: get('description_es') || existing?.descEs || '',
      price: get('price_usd'),
      stockQty: get('stock_qty'),
      img: get('image_filename'),
      tags: existing?.tags.join(', ') ?? '',
      tireSize: get('tire_size'),
      equipmentMake: get('equipment_make'),
      equipmentModel: get('equipment_model'),
      shippingClass: (get('shipping_class') || 'parcel') as ShippingClass,
      weightLb: get('weight_lb'),
      lengthIn: get('length_in'),
      widthIn: get('width_in'),
      heightIn: get('height_in'),
      compatibilityVerified: isTrue(get('compatibility_verified')),
      active: isTrue(get('active')),
    }, working, existing?.id);
    if (!result.ok) {
      errors.push(`Line ${line}: ${result.error}`);
      return;
    }
    if (existing) working[working.indexOf(existing)] = result.product;
    else { working.push(result.product); created++; }
    products.push(result.product);
  });
  if (errors.length) return { ok: false, errors };
  return { ok: true, products, created, updated: products.length - created };
}
