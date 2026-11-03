import { describe, expect, it } from 'vitest';
import { imageSrc, isUploadedImage, productImages } from '@/lib/catalog';
import { importProducts } from '@/lib/server/csv-import';
import { checkPhoto, keptPhotos, MAX_PHOTO_BYTES } from '@/lib/server/photo-upload';
import { parseProduct, type ProductInput } from '@/lib/server/product-input';
import type { StoredProduct } from '@/lib/server/store';
import { productFromRow, type ProductRow } from '@/lib/server/supabase-store';

const bytes = (...start: number[]) => new Uint8Array([...start, ...new Array(20).fill(0)]);
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));
const PHOTO = 'https://x.supabase.co/storage/v1/object/public/product-photos/a.jpg';

const input: ProductInput = {
  sku: 'S1', name: 'Tire', nameEs: '', cat: 'tires', brand: '', desc: '', descEs: '', price: '10', stockQty: '', img: 'agro-tires.webp', tags: '',
  tireSize: '', equipmentMake: '', equipmentModel: '', shippingClass: 'parcel', weightLb: '', lengthIn: '', widthIn: '', heightIn: '', compatibilityVerified: false, active: true,
};
const saved: StoredProduct = { id: 'tire', cat: 'tires', name: 'Tire', sku: 'S1', price: 10, img: PHOTO, tags: [], desc: '', stockQty: null, active: true, shippingClass: 'parcel', compatibilityVerified: false };

describe('photo checks', () => {
  it('accepts real photos by their bytes', () => {
    expect(checkPhoto(bytes(0xff, 0xd8, 0xff))).toEqual({ ok: true, type: 'image/jpeg' });
    expect(checkPhoto(bytes(0x89, ...ascii('PNG')))).toEqual({ ok: true, type: 'image/png' });
    expect(checkPhoto(bytes(...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WEBP')))).toEqual({ ok: true, type: 'image/webp' });
  });

  it('refuses files that can carry scripts, and oversized ones', () => {
    expect(checkPhoto(bytes(...ascii('<svg onload="alert(1)">'))).ok).toBe(false);
    expect(checkPhoto(bytes(...ascii('<html>'))).ok).toBe(false);
    expect(checkPhoto(new Uint8Array(0)).ok).toBe(false);
    const big = new Uint8Array(MAX_PHOTO_BYTES + 1);
    big.set([0xff, 0xd8, 0xff]);
    expect(checkPhoto(big)).toEqual({ ok: false, error: 'The photo is larger than 4 MB.' });
  });
});

describe('product image rules', () => {
  it('resolves bundled images and uploaded photos', () => {
    expect(imageSrc('agro-tires.webp')).toBe('/assets/agro-tires.webp');
    expect(imageSrc(PHOTO)).toBe(PHOTO);
    expect(isUploadedImage('agro-tires.webp')).toBe(false);
  });

  it('keeps a product\'s own photo but refuses any other address sent by the form', () => {
    expect(parseProduct({ ...input, img: PHOTO }, [saved], 'tire').ok).toBe(true);
    expect(parseProduct({ ...input, img: 'https://evil.test/x.jpg' }, [saved], 'tire').ok).toBe(false);
    expect(parseProduct({ ...input, sku: 'S2', img: PHOTO }, [saved]).ok).toBe(false);
  });

  it('a CSV update with no image keeps the uploaded photo', () => {
    const csv = 'sku,name,category,brand,description,price_usd,currency,stock_qty,weight_lb,length_in,width_in,height_in,tire_size,equipment_make,equipment_model,compatibility_verified,image_filename,shipping_class,active\nS1,Tire,tires,,,12,USD,,,,,,,,,,,parcel,true';
    const r = importProducts(csv, [saved]);
    expect(r.ok && r.products[0].img).toBe(PHOTO);
  });
});

describe('language rewrite', () => {
  it('leaves the panel and the API out, so their detail pages keep working', async () => {
    const { default: config } = await import('../next.config');
    const rewrites = await config.rewrites!();
    const source = (rewrites as { afterFiles: { source: string }[] }).afterFiles[1].source;
    const pattern = new RegExp(`^/${source.slice('/:path('.length, -1)}$`);
    for (const path of ['/admin/products/tire', '/admin/orders/1', '/admin/quotes/1', '/admin', '/api/health', '/es/shop']) expect(pattern.test(path), path).toBe(false);
    for (const path of ['/shop', '/product/tire', '/administrator', '/espresso']) expect(pattern.test(path), path).toBe(true);
  });
});

describe('several photos', () => {
  const A = 'https://x.supabase.co/storage/v1/object/public/product-photos/a.jpg';
  const B = 'https://x.supabase.co/storage/v1/object/public/product-photos/b.jpg';

  it('keeps only photos the product owns, in the chosen order', () => {
    expect(keptPhotos(JSON.stringify([B, A]), [A, B], 0)).toEqual({ ok: true, keep: [B, A] });
    expect(keptPhotos(JSON.stringify([A, A]), [A, B], 0)).toEqual({ ok: true, keep: [A] });
    expect(keptPhotos('', [A], 0)).toEqual({ ok: true, keep: [] });
    expect(keptPhotos(JSON.stringify(['https://evil.test/x.jpg']), [A], 0).ok).toBe(false);
    expect(keptPhotos('{"a":1}', [A], 0).ok).toBe(false);
    expect(keptPhotos('not json', [A], 0).ok).toBe(false);
  });

  it('limits a product to eight photos', () => {
    expect(keptPhotos(JSON.stringify([A, B]), [A, B], 6).ok).toBe(true);
    expect(keptPhotos(JSON.stringify([A, B]), [A, B], 7)).toEqual({ ok: false, error: 'A product can have up to 8 photos.' });
  });

  it('reads and writes them in order, and edits keep the extra photos', () => {
    const r = parseProduct({ ...input, img: PHOTO }, [{ ...saved, gallery: [B] }], 'tire');
    expect(r.ok && r.product.gallery).toEqual([B]);
    expect(productImages({ img: A, gallery: [B] })).toEqual([A, B]);
    expect(productImages({ img: A })).toEqual([A]);
    const row = productFromRow({ slug: 's', category_id: 'tires', name: 'n', name_es: null, sku: 'k', description: '', description_es: null, price_cents: 100, tags: [], brand: null, tire_size: null, equipment_make: null, equipment_model: null, stock_qty: 1, active: true, shipping_class: 'parcel', compatibility_verified: false, weight_lb: null, length_in: null, width_in: null, height_in: null, product_images: [{ path: B, sort_order: 1 }, { path: A, sort_order: 0 }] } as unknown as ProductRow);
    expect(row.img).toBe(A);
    expect(row.gallery).toEqual([B]);
  });
});
