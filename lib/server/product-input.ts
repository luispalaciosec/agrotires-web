import { z } from 'zod';
import { PRODUCT_IMAGES, categories } from '../catalog';
import type { StoredProduct } from './store';

const CATEGORY_IDS = categories.filter((c) => c.id !== 'machine').map((c) => c.id);
const optionalText = (max: number) => z.string().trim().max(max).transform((v) => v || undefined);
const optionalNumber = z.string().trim().transform((v, ctx) => {
  if (!v) return undefined;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) {
    ctx.addIssue({ code: 'custom', message: 'must be a positive number' });
    return z.NEVER;
  }
  return n;
});

const schema = z.object({
  sku: z.string().trim().min(1, 'SKU is required').max(80),
  name: z.string().trim().min(1, 'Name is required').max(200),
  cat: z.string().refine((v) => CATEGORY_IDS.includes(v), 'Choose a valid category'),
  brand: optionalText(120),
  desc: z.string().trim().max(5000),
  price: optionalNumber,
  stockQty: optionalNumber,
  img: z.string().refine((v) => PRODUCT_IMAGES.includes(v), 'Choose an available image'),
  tags: z.string().max(300),
  tireSize: optionalText(80),
  equipmentMake: optionalText(120),
  equipmentModel: optionalText(120),
  shippingClass: z.enum(['parcel', 'freight_quote', 'pickup']),
  weightLb: optionalNumber,
  lengthIn: optionalNumber,
  widthIn: optionalNumber,
  heightIn: optionalNumber,
  compatibilityVerified: z.boolean(),
  active: z.boolean(),
}).refine((p) => !p.active || p.price !== undefined, { message: 'A product needs a price before it can be active', path: ['price'] })
  .refine((p) => p.stockQty === undefined || Number.isInteger(p.stockQty), { message: 'Stock must be a whole number', path: ['stockQty'] });

export type ProductInput = z.input<typeof schema>;

export const slugify = (name: string) => name.normalize('NFKD').replace(/[^\w\s-]/g, '').trim().toLowerCase().replace(/[\s_]+/g, '-').slice(0, 80) || 'product';

export function uniqueId(name: string, taken: Set<string>) {
  const base = slugify(name);
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  return id;
}

// Validates one product against the rest of the catalog. id is the product being edited, if any.
export function parseProduct(input: ProductInput, catalog: StoredProduct[], id?: string): { ok: true; product: StoredProduct } | { ok: false; error: string } {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const v = parsed.data;
  const duplicate = catalog.find((p) => p.sku.toLowerCase() === v.sku.toLowerCase() && p.id !== id);
  if (duplicate) return { ok: false, error: `SKU ${v.sku} is already used by ${duplicate.name}` };
  return {
    ok: true,
    product: {
      ...v,
      id: id ?? uniqueId(v.name, new Set(catalog.map((p) => p.id))),
      price: v.price ?? null,
      stockQty: v.stockQty ?? null,
      tags: v.tags.split(',').map((t) => t.trim()).filter(Boolean),
    },
  };
}
