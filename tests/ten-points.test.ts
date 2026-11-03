import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as newsletter } from '@/app/api/newsletter/route';
import { toSpanish } from '@/lib/admin-i18n';
import { browserProducts } from '@/lib/products';
import { purchaseOrderMail, send } from '@/lib/server/email';
import { settleCapture } from '@/lib/server/orders';
import type { PayPalCapture } from '@/lib/server/paypal';
import { remainingToRestock, restockItems } from '@/lib/server/operations';
import { getStore, type Order, type PurchaseOrder } from '@/lib/server/store';

const { sendMail } = vi.hoisted(() => ({ sendMail: vi.fn(async () => ({})) }));
vi.mock('nodemailer', () => ({ default: { createTransport: () => ({ sendMail, close: () => {} }) } }));

let ip = 120;
const post = (body: unknown) => new Request('http://localhost:3000/api/newsletter', { method: 'POST', body: JSON.stringify(body), headers: { host: 'localhost:3000', origin: 'http://localhost:3000', 'x-forwarded-for': `10.0.6.${++ip}` } });

beforeAll(() => {
  Object.assign(process.env, { STORE_DRIVER: 'local', LINK_SECRET: 't', STORE_FILE: path.join(mkdtempSync(path.join(tmpdir(), 'agrotires-ten-')), 'store.json') });
});
beforeEach(() => sendMail.mockClear());
afterEach(() => {
  for (const k of ['SMTP_USER', 'SMTP_PASS']) delete process.env[k];
});

describe('newsletter', () => {
  it('saves valid sign-ups once, and ignores bots', async () => {
    const store = getStore()!;
    expect((await newsletter(post({ email: 'nope' }))).status).toBe(400);
    expect((await newsletter(post({ email: 'bot@example.test', website: 'x' }))).status).toBe(201);
    expect((await newsletter(post({ email: 'Ana@Example.test', locale: 'es' }))).status).toBe(201);
    expect((await newsletter(post({ email: 'ana@example.test' }))).status).toBe(201);
    const list = await store.listSubscribers();
    expect(list.map((s) => s.email)).toEqual(['ana@example.test']);
    expect(list[0].locale).toBe('es');
  });

  it('opted-out people leave the list, and a sign-up by anyone cannot bring them back', async () => {
    const store = getStore()!;
    await store.optOut('ana@example.test');
    expect(await store.listSubscribers()).toEqual([]);
    await newsletter(post({ email: 'ana@example.test' }));
    expect(await store.isOptedOut('ana@example.test')).toBe(true);
    expect(await store.listSubscribers()).toEqual([]);
  });
});

describe('account lists', () => {
  it('favorites belong to one account, without repeats', async () => {
    const store = getStore()!;
    await store.setWishlist('u1', ['a', 'b', 'a']);
    await store.setWishlist('u2', ['c']);
    expect((await store.getWishlist('u1')).sort()).toEqual(['a', 'b']);
    await store.setWishlist('u1', ['b']);
    expect(await store.getWishlist('u1')).toEqual(['b']);
    expect(await store.getWishlist('u2')).toEqual(['c']);
  });

  it('machines belong to one account', async () => {
    const store = getStore()!;
    const m = await store.saveMachine('u1', { make: 'John Deere', model: '6120M', year: 2018 });
    await store.deleteMachine('u2', m.id);
    expect(await store.listMachines('u1')).toHaveLength(1);
    expect(await store.listMachines('u2')).toEqual([]);
    await store.deleteMachine('u1', m.id);
    expect(await store.listMachines('u1')).toEqual([]);
  });
});

describe('partial restock', () => {
  const item = { productId: 'tire-r1', sku: 'S1', name: 'Tire', unitPriceCents: 100, quantity: 5 };
  const setup = async (stockQty: number | null) => {
    const store = getStore()!;
    await store.saveProducts((await store.listProducts()).map((p) => (p.id === 'tire-r1' ? { ...p, stockQty } : p)));
    const order = await store.createOrder({ items: [item], email: 'a@b.test', subtotalCents: 500, shippingCents: 0, taxCents: 0, totalCents: 500, currency: 'USD' });
    return { store, order };
  };
  const stock = async () => (await getStore()!.listProducts()).find((p) => p.id === 'tire-r1')!.stockQty;

  it('returns what was asked, across several refunds, never more than was bought', async () => {
    const { store, order } = await setup(10);
    expect(await restockItems(store, order, [{ sku: 'S1', quantity: 2 }], 'Ana')).toEqual({ ok: true, units: 2 });
    expect(await stock()).toBe(12);
    const after = (await store.getOrder(order.id))!;
    expect(remainingToRestock(after, 'S1')).toBe(3);
    expect(await restockItems(store, after, [{ sku: 'S1', quantity: 4 }], 'Ana')).toEqual({ ok: false });
    expect(await stock()).toBe(12);
    expect(await restockItems(store, after, [{ sku: 'S1', quantity: 3 }], 'Ana')).toEqual({ ok: true, units: 3 });
    expect(await stock()).toBe(15);
    expect((await store.listMovements(1))[0]).toMatchObject({ reason: 'return', delta: 3, actor: 'Ana' });
  });

  it('a product without stock control stays that way', async () => {
    const { store, order } = await setup(null);
    expect((await restockItems(store, order, [{ sku: 'S1', quantity: 1 }], 'Ana')).ok).toBe(true);
    expect(await stock()).toBeNull();
  });

  it('refuses a SKU from another order, and does nothing with no units', async () => {
    const { store, order } = await setup(1);
    expect((await restockItems(store, order, [{ sku: 'OTHER', quantity: 1 }], 'Ana')).ok).toBe(false);
    expect(await restockItems(store, order, [], 'Ana')).toEqual({ ok: true, units: 0 });
  });

  it('a quote line with no product only updates the record', async () => {
    const store = getStore()!;
    const order = await store.createOrder({ items: [{ ...item, productId: '', sku: 'QUOTE-1' }], email: 'a@b.test', subtotalCents: 500, shippingCents: 0, taxCents: 0, totalCents: 500, currency: 'USD' });
    expect((await restockItems(store, order, [{ sku: 'QUOTE-1', quantity: 1 }], 'Ana')).ok).toBe(true);
  });
});

describe('supplier orders', () => {
  const po: PurchaseOrder = { id: 'abcdef12-0', supplier: 'Acme', supplierEmail: 'ventas@acme.test', status: 'open', createdAt: 'now', note: 'Urgente', items: [{ productId: 'a', sku: 'AG-1', name: 'Tire', quantity: 2, unitCostCents: 41000 }] };

  it('the email lists lines and total, and never prices for customers', () => {
    const mail = purchaseOrderMail(po);
    expect(mail.to).toBe('ventas@acme.test');
    expect(mail.subject).toContain('ABCDEF12');
    expect(mail.text).toContain('2 x AG-1 Tire @ $410.00');
    expect(mail.text).toContain('$820.00');
    expect(mail.text).toContain('Urgente');
  });

  it('remembers when it was sent', async () => {
    const store = getStore()!;
    const saved = await store.createPurchaseOrder({ supplier: 'Acme', supplierEmail: 'v@a.test', items: po.items });
    await store.markPurchaseOrderSent(saved.id);
    expect((await store.listPurchaseOrders()).find((p) => p.id === saved.id)!.sentAt).toBeTruthy();
  });

  it('sends through the same mailbox', async () => {
    Object.assign(process.env, { SMTP_USER: 'contact@agrotiresusa.com', SMTP_PASS: 'x' });
    expect((await send([purchaseOrderMail(po)])).sent).toBe(1);
  });
});

describe('settling a payment', () => {
  const capture = (total: string) => ({ id: 'C1', status: 'COMPLETED', amount: { currency_code: 'USD', value: total } }) as PayPalCapture;
  const item = { productId: 'tire-r1', sku: 'S1', name: 'Tire', unitPriceCents: 100, quantity: 1 };
  const stock = async () => (await getStore()!.listProducts()).find((p) => p.id === 'tire-r1')!.stockQty;
  const order = async () => getStore()!.createOrder({ items: [item], email: 'a@b.test', subtotalCents: 100, shippingCents: 0, taxCents: 0, totalCents: 100, currency: 'USD' });

  it('takes stock once, however many arrive at the same time', async () => {
    const store = getStore()!;
    await store.saveProducts((await store.listProducts()).map((p) => (p.id === 'tire-r1' ? { ...p, stockQty: 10 } : p)));
    const o = await order();
    await Promise.all(Array.from({ length: 5 }, () => settleCapture(store, o, capture('1.00'))));
    expect(await stock()).toBe(9);
    expect((await store.getOrder(o.id))!.status).toBe('paid');
  });

  it('a cancelled order does not become paid', async () => {
    const store = getStore()!;
    const o = await order();
    await store.updateOrder(o.id, { status: 'cancelled' });
    const before = await stock();
    expect((await settleCapture(store, o, capture('1.00'))).status).toBe('cancelled');
    expect(await stock()).toBe(before);
  });
});

describe('business account language', () => {
  it('remembers the language of the application', async () => {
    const store = getStore()!;
    await store.saveB2bAccount({ profileId: 'p1', email: 'a@b.test', company: 'Co', status: 'pending', discountBps: 0, termsDays: 0, createdAt: 'now', locale: 'es' });
    expect((await store.getB2bAccount('p1'))!.locale).toBe('es');
  });
});

describe('panel in Spanish', () => {
  it('translates whole strings and patterns only', () => {
    expect(toSpanish('Orders')).toBe('Pedidos');
    expect(toSpanish('Refunded $10.00.')).toBe('Se reembolsaron $10.00.');
    expect(toSpanish('2 of 6')).toBe('2 de 6');
    expect(toSpanish('Line 3: no product has the SKU X-1.')).toBe('Línea 3: ningún producto tiene el SKU X-1.');
  });

  it('leaves everything else alone, such as a name containing a known word', () => {
    expect(toSpanish('Orders Ltd')).toBe('Orders Ltd');
    expect(toSpanish('John Deere 6120M')).toBe('John Deere 6120M');
  });
});

describe('catalog sent to the browser', () => {
  it('drops what only product pages use', () => {
    const [p] = browserProducts([{ id: 'a', cat: 'c', name: 'n', sku: 's', price: 1, img: 'i', gallery: ['x'], tags: [], desc: 'y'.repeat(1000) }]);
    expect(p.desc.length).toBeLessThanOrEqual(200);
    expect(p.gallery).toBeUndefined();
  });
});

const _order: Order | undefined = undefined;
void _order;
