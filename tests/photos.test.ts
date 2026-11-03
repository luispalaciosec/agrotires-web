import { describe, expect, it } from 'vitest';
import { imageSrc, isUploadedImage } from '@/lib/catalog';
import { importProducts } from '@/lib/server/csv-import';
import { checkPhoto, MAX_PHOTO_BYTES } from '@/lib/server/photo-upload';
import { parseProduct, type ProductInput } from '@/lib/server/product-input';
import type { StoredProduct } from '@/lib/server/store';

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
