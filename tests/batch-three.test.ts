import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as events } from '@/app/api/events/route';
import { POST as returns } from '@/app/api/returns/route';
import { toCsv } from '@/lib/server/csv';
import { accountingSummary, applySale, changeReturnStatus, cleanQuery, conversionReport, lowStock, parsePurchaseLines, zohoBooksInvoices, receivePurchaseOrder, refundRows, requestReturn, returnLink, runDailyChecks } from '@/lib/server/operations';
import { sign } from '@/lib/server/signed';
import { getStore, type Order, type StoredProduct } from '@/lib/server/store';

const { sendMail } = vi.hoisted(() => ({ sendMail: vi.fn(async () => ({})) }));
vi.mock('nodemailer', () => ({ default: { createTransport: () => ({ sendMail, close: () => {} }) } }));

let ip = 90;
const post = (url: string, body: unknown) => new Request(`http://localhost:3000${url}`, { method: 'POST', body: JSON.stringify(body), headers: { host: 'localhost:3000', origin: 'http://localhost:3000', 'x-forwarded-for': `10.0.5.${++ip}` } });
const item = { productId: 'tire-r1', sku: 'S1', name: 'Tire', unitPriceCents: 1000, quantity: 3 };
const base = { items: [item], subtotalCents: 3000, shippingCents: 500, taxCents: 210, totalCents: 3710, currency: 'USD' as const };
const mails = () => (sendMail.mock.calls as unknown as [{ to: string; subject: string; text: string }][]).map(([m]) => m);

beforeAll(() => {
  Object.assign(process.env, { STORE_DRIVER: 'local', LINK_SECRET: 'test', STORE_FILE: path.join(mkdtempSync(path.join(tmpdir(), 'agrotires-three-')), 'store.json') });
});
beforeEach(() => {
  sendMail.mockClear();
  Object.assign(process.env, { SMTP_USER: 'contact@agrotiresusa.com', SMTP_PASS: 'x' });
});
afterEach(() => {
  for (const k of ['SMTP_USER', 'SMTP_PASS']) delete process.env[k];
});

const tracked = async (id: string, stockQty: number) => {
  const store = getStore()!;
  const list = await store.listProducts();
  await store.saveProducts(list.map((p) => (p.id === id ? { ...p, stockQty } : p)));
  return store;
};
const stock = async (id: string) => (await getStore()!.listProducts()).find((p) => p.id === id)!.stockQty;

describe('inventory', () => {
  it('a sale takes from the warehouse with the most, and keeps a record', async () => {
    const store = await tracked('tire-r1', 10);
    const a = await store.addWarehouse('Iowa');
    const b = await store.addWarehouse('Texas');
    await store.adjustStock({ productId: 'tire-r1', warehouseId: a.id, delta: 2, reason: 'count', actor: 'Ana' });
    await store.adjustStock({ productId: 'tire-r1', warehouseId: b.id, delta: 8, reason: 'count', actor: 'Ana' });
    expect(await stock('tire-r1')).toBe(20);
    await applySale(store, [{ ...item, quantity: 5 }], 'ORDER1');
    expect(await stock('tire-r1')).toBe(15);
    const levels = await store.listStockLevels();
    expect(levels.find((l) => l.warehouseId === b.id)!.quantity).toBe(3);
    expect(levels.find((l) => l.warehouseId === a.id)!.quantity).toBe(2);
    expect((await store.listMovements(1))[0]).toMatchObject({ delta: -5, reason: 'sale', note: 'ORDER1' });
  });

  it('stock never goes below zero, and untracked products stay untracked on sale', async () => {
    const store = await tracked('tire-r1', 1);
    await store.adjustStock({ productId: 'tire-r1', delta: -5, reason: 'damaged', actor: 'Ana' });
    expect(await stock('tire-r1')).toBe(0);
    const list = await store.listProducts();
    await store.saveProducts(list.map((p) => (p.id === 'tire-r1' ? { ...p, stockQty: null } : p)));
    await applySale(store, [item], 'ORDER2');
    expect(await stock('tire-r1')).toBeNull();
  });

  it('if the inventory tables are missing, a sale still reduces the total', async () => {
    const store = await tracked('tire-r1', 10);
    const record = vi.spyOn(store, 'recordSale').mockRejectedValueOnce(new Error('missing'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await applySale(store, [{ ...item, quantity: 2 }], 'X');
    record.mockRestore();
    spy.mockRestore();
    expect(await stock('tire-r1')).toBe(8);
  });

  it('low stock uses the product alert, or the default', () => {
    const p = (id: string, stockQty: number | null, active = true) => ({ id, stockQty, active }) as StoredProduct;
    const low = lowStock([p('a', 5), p('b', 6), p('c', 6), p('d', 0, false), p('e', null)], [{ productId: 'c', reorderPoint: 10 }]);
    expect(low.map((x) => x.id)).toEqual(['a', 'c']);
  });

  it('supplier lines need a known SKU', () => {
    const products = [{ id: 'a', sku: 'AG-1', name: 'A' }] as StoredProduct[];
    expect(parsePurchaseLines('ag-1 | 20 | 410.00', products)).toEqual({ ok: true, items: [{ productId: 'a', sku: 'AG-1', name: 'A', quantity: 20, unitCostCents: 41000 }] });
    expect(parsePurchaseLines('NOPE | 1 | 1', products).ok).toBe(false);
    expect(parsePurchaseLines('AG-1 | x | 1', products).ok).toBe(false);
    expect(parsePurchaseLines('', products).ok).toBe(false);
  });

  it('receiving a supplier order adds stock once', async () => {
    const store = await tracked('tire-r1', 1);
    const w = await store.addWarehouse('Main');
    const po = await store.createPurchaseOrder({ supplier: 'Acme', warehouseId: w.id, items: [{ productId: 'tire-r1', sku: 'S', name: 'T', quantity: 4, unitCostCents: 100 }] });
    expect(await receivePurchaseOrder(store, po.id, 'Ana')).toBe(true);
    expect(await receivePurchaseOrder(store, po.id, 'Ana')).toBe(false);
    expect(await stock('tire-r1')).toBe(5);
  });

  it('the stock alert goes to the team once a day', async () => {
    const store = await tracked('tire-r1', 0);
    const day = Date.UTC(2031, 0, 1);
    expect((await runDailyChecks(store, day)).alerted).toBe(true);
    expect(mails().filter((m) => m.subject.includes('stock'))).toHaveLength(1);
    expect((await runDailyChecks(store, day)).alerted).toBe(false);
    expect((await runDailyChecks(store, day + 86_400_000)).alerted).toBe(true);
  });
});

describe('returns', () => {
  const sold = async (status: Order['status'] = 'fulfilled') => {
    const store = getStore()!;
    const o = await store.createOrder({ ...base, email: 'buyer@example.test', locale: 'es' });
    return store.updateOrder(o.id, { status });
  };

  it('the buyer requests one open return, and only what they bought', async () => {
    const store = getStore()!;
    const o = await sold();
    expect((await requestReturn(store, o, { items: [{ sku: 'S1', quantity: 4 }], reason: 'damaged' })).ok).toBe(false);
    expect((await requestReturn(store, o, { items: [{ sku: 'NOPE', quantity: 1 }], reason: 'damaged' })).ok).toBe(false);
    const first = await requestReturn(store, o, { items: [{ sku: 'S1', quantity: 1 }], reason: 'damaged', note: 'Roto' });
    expect(first.ok).toBe(true);
    expect(mails().map((m) => m.to).sort()).toEqual(['buyer@example.test', 'contact@agrotiresusa.com']);
    expect(await requestReturn(store, o, { items: [{ sku: 'S1', quantity: 1 }], reason: 'damaged' })).toEqual({ ok: false, error: 'open' });
  });

  it('follows the steps, and tells the customer in their language', async () => {
    const store = getStore()!;
    const o = await sold();
    const made = await requestReturn(store, o, { items: [{ sku: 'S1', quantity: 1 }], reason: 'other' });
    if (!made.ok) throw new Error('not created');
    sendMail.mockClear();
    expect(await changeReturnStatus(store, made.request, o, 'closed')).toBe(false);
    expect(await changeReturnStatus(store, made.request, o, 'approved', 'Envíala a la bodega')).toBe(true);
    expect(mails()[0].subject).toContain('Actualización de tu devolución');
    expect(mails()[0].text).toContain('Envíala a la bodega');
    const [updated] = await store.listReturnsForOrder(o.id);
    expect(updated.status).toBe('approved');
    expect(await changeReturnStatus(store, updated, o, 'received')).toBe(true);
  });

  it('the public route needs a signed link and a sold order', async () => {
    const o = await sold();
    const pending = await sold('pending_payment');
    const body = { items: [{ sku: 'S1', quantity: 1 }], reason: 'damaged' };
    expect((await returns(post('/api/returns', { order: o.id, sig: 'bad', ...body }))).status).toBe(403);
    expect((await returns(post('/api/returns', { order: pending.id, sig: sign('return', pending.id), ...body }))).status).toBe(409);
    expect((await returns(post('/api/returns', { order: o.id, sig: sign('return', o.id), ...body, reason: 'x' }))).status).toBe(400);
    expect((await returns(post('/api/returns', { order: o.id, sig: sign('return', o.id), ...body }))).status).toBe(201);
    expect(returnLink('es', o.id)).toContain(`/es/returns?order=${o.id}&sig=`);
  });
});

describe('accounting', () => {
  const o = (over: Partial<Order>): Order => ({ ...base, id: 'abcdef12-1', email: 'a@b.test', status: 'paid', createdAt: '2026-03-10T10:00:00Z', ...over });

  it('writes invoices with product, shipping and tax lines, in the period', () => {
    const rows = zohoBooksInvoices([o({ paypalCaptureId: 'CAP', shippingAddress: { name: 'Ana', line1: '', city: '', state: 'IA', postalCode: '', country: 'US' } }), o({ id: 'zzzzzzzz', createdAt: '2026-05-01T00:00:00Z' }), o({ id: 'pending1', status: 'pending_payment' })], '2026-03-01', '2026-03-31');
    expect(rows).toHaveLength(4);
    expect(rows[0].slice(0, 5)).toEqual(['Invoice Number', 'Invoice Date', 'Due Date', 'Invoice Status', 'Customer Name']);
    expect(rows[1]).toEqual(['ABCDEF12', '2026-03-10', '2026-03-10', 'Paid', 'Ana', 'a@b.test', 'PayPal CAP', 'S1', 'Tire', 3, '10.00', '30.00']);
    expect(rows[2].slice(7)).toEqual(['Shipping', 'Shipping', 1, '5.00', '5.00']);
    expect(rows[3].slice(7)).toEqual(['Sales tax', 'IA', 1, '2.10', '2.10']);
  });

  it('terms invoices carry the due date, and customer text cannot run as a formula', () => {
    const rows = zohoBooksInvoices([o({ invoiceDueAt: '2026-04-09T00:00:00Z', status: 'on_terms', email: '=cmd()' })], '2026-01-01', '2026-12-31');
    expect(rows[1].slice(2, 4)).toEqual(['2026-04-09', 'Sent']);
    expect(toCsv(rows)).toContain(`'=cmd()`);
  });

  it('adds up the period, and unpaid invoices from any date', () => {
    const s = accountingSummary([o({ refundedCents: 100 }), o({ createdAt: '2020-01-01T00:00:00Z', invoiceDueAt: 'x', status: 'on_terms' })], '2026-03-01', '2026-03-31');
    expect(s).toEqual({ orders: 1, salesCents: 3000, shippingCents: 500, taxCents: 210, refundedCents: 100, receivableCents: 3710 });
    expect(refundRows([o({ refundedCents: 100 })], '2026-01-01', '2026-12-31')[1][4]).toBe('1.00');
  });
});

describe('analytics', () => {
  const e = (name: string, session: string, extra = {}) => ({ name, session, ...extra });

  it('counts sessions at each step, not clicks', () => {
    const r = conversionReport([e('view_product', 'a', { productSlug: 'p' }), e('view_product', 'a', { productSlug: 'p' }), e('view_product', 'b', { productSlug: 'q' }), e('add_to_cart', 'a'), e('add_to_cart', 'a'), e('begin_checkout', 'a'), e('purchase', 'a'), e('search', 'c', { query: 'tire', results: 3 }), e('search', 'c', { query: 'zzz', results: 0 })]);
    expect(r.visitors).toBe(3);
    expect(r.steps.map((s) => s.count)).toEqual([2, 1, 1, 1]);
    expect(r.conversion).toBeCloseTo(1 / 3);
    expect(r.noResults).toEqual([{ value: 'zzz', count: 1 }]);
    expect(r.topProducts[0]).toEqual({ value: 'p', count: 2 });
  });

  it('never keeps an email or phone typed into search', () => {
    expect(cleanQuery('Ana@Example.com')).toBeUndefined();
    expect(cleanQuery('515 555 0100')).toBeUndefined();
    expect(cleanQuery(' Tire 18.4-38 ')).toBe('tire 18.4-38');
  });

  it('the endpoint validates what it stores', async () => {
    const store = getStore()!;
    expect((await events(post('/api/events', { name: 'hack', session: 'abcdefgh1' }))).status).toBe(400);
    expect((await events(post('/api/events', { name: 'search', session: 'bad session!' }))).status).toBe(400);
    expect((await events(post('/api/events', { name: 'search', session: 'abcdefgh1', query: 'a@b.com', results: 0 }))).status).toBe(200);
    const [last] = (await store.listEvents('2000-01-01')).slice(-1);
    expect(last.query).toBeUndefined();
    await store.purgeEvents('2999-01-01');
    expect(await store.listEvents('2000-01-01')).toEqual([]);
  });
});

describe('activity log', () => {
  it('records who did what, latest first', async () => {
    const store = getStore()!;
    await store.addAudit({ actor: 'Ana', action: 'First', target: 'x' });
    await store.addAudit({ actor: 'Ana', action: 'Second' });
    const [latest] = await store.listAudit(1);
    expect(latest.action).toBe('Second');
  });
});
