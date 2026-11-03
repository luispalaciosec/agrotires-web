import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as reviews } from '@/app/api/reviews/route';
import { GET as cron } from '@/app/api/cron/reminders/route';
import { POST as unsubscribe } from '@/app/api/unsubscribe/route';
import { POST as pay } from '@/app/api/pay/[token]/route';
import { searchProducts, searchScore } from '@/lib/search';
import { products as demo, type Product } from '@/lib/catalog';
import { priceCart } from '@/lib/server/pricing';
import { runReminders } from '@/lib/server/reminders';
import { boughtTogether, createPayLink, parseQuoteLines, payLinkProblem, placeOnTerms, reviewLink } from '@/lib/server/sales';
import { sign, verify } from '@/lib/server/signed';
import { getStore, type B2bAccount, type Order, type StoredProduct } from '@/lib/server/store';
import { isSale, salesReport } from '@/lib/server/analytics';

const { sendMail } = vi.hoisted(() => ({ sendMail: vi.fn(async () => ({})) }));
vi.mock('nodemailer', () => ({ default: { createTransport: () => ({ sendMail, close: () => {} }) } }));

let ip = 80;
const post = (url: string, body: unknown, headers: Record<string, string> = {}) => new Request(`http://localhost:3000${url}`, { method: 'POST', body: JSON.stringify(body), headers: { host: 'localhost:3000', origin: 'http://localhost:3000', 'content-type': 'application/json', 'x-forwarded-for': `10.0.4.${++ip}`, ...headers } });
const DAY = 86_400_000;
const address = { name: 'Ana', line1: '1 Farm', city: 'Ames', state: 'IA', postalCode: '50010' };
const mails = () => (sendMail.mock.calls as unknown as [{ to: string; subject: string; text: string; headers?: Record<string, string> }][]).map(([m]) => m);
const base = { items: [{ productId: 'tire-r1', sku: 'S', name: 'Tire', unitPriceCents: 1000, quantity: 1 }], subtotalCents: 1000, shippingCents: 0, taxCents: 0, totalCents: 1000, currency: 'USD' as const };

beforeAll(() => {
  Object.assign(process.env, { STORE_DRIVER: 'local', LINK_SECRET: 'test-secret', STORE_FILE: path.join(mkdtempSync(path.join(tmpdir(), 'agrotires-two-')), 'store.json') });
});
beforeEach(() => {
  sendMail.mockClear();
  Object.assign(process.env, { SMTP_USER: 'contact@agrotiresusa.com', SMTP_PASS: 'x' });
});
afterEach(() => {
  vi.unstubAllGlobals();
  for (const k of ['SMTP_USER', 'SMTP_PASS', 'REMINDERS_ENABLED', 'BUSINESS_POSTAL_ADDRESS', 'CRON_SECRET', 'PAYMENTS_ENABLED', 'PAYPAL_ENV', 'PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET']) delete process.env[k];
});

describe('payment links', () => {
  const quote = { name: 'Ana', email: 'ana@example.test', topic: 'Freight shipping', message: 'Hola', locale: 'es' as const };

  it('reads lines and explains mistakes', () => {
    expect(parseQuoteLines('2 | Rear tire | 689.00\n1|Hose|10')).toEqual({ ok: true, lines: [{ quantity: 2, description: 'Rear tire', unitPriceCents: 68900 }, { quantity: 1, description: 'Hose', unitPriceCents: 1000 }] });
    expect(parseQuoteLines('Rear tire 689').ok).toBe(false);
    expect(parseQuoteLines('0 | x | 1').ok).toBe(false);
    expect(parseQuoteLines('').ok).toBe(false);
  });

  it('fixes the amount with tax and freight, answers the quote and emails the link', async () => {
    const store = getStore()!;
    await store.saveTaxRates([{ state: 'IA', rateBps: 600, active: true, taxShipping: false }]);
    const q = await store.saveQuote(quote);
    const order = await createPayLink(store, q, { lines: [{ description: 'Tire', quantity: 2, unitPriceCents: 10000 }], freightCents: 5000, address });
    expect(order).toMatchObject({ subtotalCents: 20000, shippingCents: 5000, taxCents: 1200, totalCents: 26200, quoteId: q.id });
    expect(order.payToken!.length).toBeGreaterThan(20);
    expect((await store.getQuote(q.id))!.status).toBe('answered');
    expect(mails()[0].to).toBe('ana@example.test');
    expect(mails()[0].text).toContain(`/es/pay/${order.payToken}`);
    await store.saveTaxRates([]);
  });

  it('a paid, cancelled or expired link cannot be paid', () => {
    const now = Date.now();
    const open = { ...base, id: 'x', email: 'a', status: 'pending_payment', createdAt: '', payExpiresAt: new Date(now + DAY).toISOString() } as Order;
    expect(payLinkProblem(open, now)).toBeUndefined();
    expect(payLinkProblem({ ...open, payExpiresAt: new Date(now - 1).toISOString() }, now)).toBe('expired');
    expect(payLinkProblem({ ...open, status: 'paid' }, now)).toBe('paid');
    expect(payLinkProblem({ ...open, status: 'cancelled' }, now)).toBe('closed');
  });

  it('an unknown token finds nothing, and PayPal gets the fixed amount', async () => {
    Object.assign(process.env, { PAYMENTS_ENABLED: 'true', PAYPAL_ENV: 'sandbox', PAYPAL_CLIENT_ID: 'i', PAYPAL_CLIENT_SECRET: 's' });
    const bodies: { purchase_units: { amount: { value: string } }[] }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
      if (String(url).endsWith('/oauth2/token')) return Response.json({ access_token: 'T' });
      bodies.push(JSON.parse(String(init.body)));
      return Response.json({ id: 'PP-LINK' }, { status: 201 });
    }));
    const store = getStore()!;
    const res = await pay(post('/api/pay/nope', {}), { params: Promise.resolve({ token: 'nope' }) });
    expect(res.status).toBe(404);
    const order = await store.createOrder({ ...base, email: 'a@b.test', payToken: 'tok123' });
    const ok = await pay(post('/api/pay/tok123', {}), { params: Promise.resolve({ token: 'tok123' }) });
    expect(ok.status).toBe(201);
    expect(bodies[0].purchase_units[0].amount.value).toBe('10.00');
    expect((await store.getOrder(order.id))!.paypalOrderId).toBe('PP-LINK');
  });
});

describe('business prices', () => {
  const catalog = [{ id: 'a', sku: 'A', name: 'A', price: 100, active: true, stockQty: null, shippingClass: 'parcel' } as StoredProduct];
  const rules = [{ productId: 'a', volume: [{ minQty: 5, priceCents: 9000 }, { minQty: 10, priceCents: 8000 }] }];
  const unit = (quantity: number, discountBps = 0) => priceCart([{ id: 'a', quantity }], catalog, { rules, discountBps }).items[0].unitPriceCents;

  it('uses the best tier reached, and the lower of tier and account discount', () => {
    expect(unit(4)).toBe(10000);
    expect(unit(5)).toBe(9000);
    expect(unit(12)).toBe(8000);
    expect(unit(1, 1500)).toBe(8500);
    expect(unit(5, 500)).toBe(9000);
    expect(unit(12, 3000)).toBe(7000);
    expect(priceCart([{ id: 'a', quantity: 1 }], catalog).items[0].unitPriceCents).toBe(10000);
  });

  it('adds up merged lines before choosing the tier', () => {
    expect(priceCart([{ id: 'a', quantity: 3 }, { id: 'a', quantity: 2 }], catalog, { rules }).items[0].unitPriceCents).toBe(9000);
  });

  it('terms orders reduce stock, set the due date and count as money only once paid', async () => {
    const store = getStore()!;
    const account: B2bAccount = { profileId: 'p', email: 'buyer@example.test', company: 'Farm Co', status: 'approved', discountBps: 0, termsDays: 30, createdAt: 'now' };
    const reduce = vi.spyOn(store, 'recordSale');
    const order = await store.createOrder({ ...base, email: 'buyer@example.test' });
    const now = Date.now();
    const placed = await placeOnTerms(store, order, account, now);
    expect(reduce).toHaveBeenCalledOnce();
    reduce.mockRestore();
    expect(placed.status).toBe('on_terms');
    expect(new Date(placed.invoiceDueAt!).getTime()).toBe(now + 30 * DAY);
    expect(mails().map((m) => m.to).sort()).toEqual(['buyer@example.test', 'contact@agrotiresusa.com']);
    expect(isSale(placed)).toBe(true);
    expect(salesReport([placed], 30).current.netCents).toBe(0);
    expect(salesReport([{ ...placed, invoicePaidAt: 'now' }], 30).current.netCents).toBe(1000);
  });

  it('accounts stay private to their profile', async () => {
    const store = getStore()!;
    await store.saveB2bAccount({ profileId: 'u1', email: 'a@b.test', company: 'Co', status: 'pending', discountBps: 0, termsDays: 0, createdAt: 'now' });
    expect(await store.getB2bAccount('u2')).toBeUndefined();
    expect((await store.getB2bAccount('u1'))!.company).toBe('Co');
  });
});

describe('reminders', () => {
  const on = () => Object.assign(process.env, { REMINDERS_ENABLED: 'true', BUSINESS_POSTAL_ADDRESS: '1 Main St, Ames, IA' });
  const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString();
  const seed = async (over: Partial<Order>) => {
    const store = getStore()!;
    const o = await store.createOrder({ ...base, email: 'r@example.test', locale: 'es' });
    const patched = await store.updateOrder(o.id, { status: over.status ?? 'pending_payment' });
    (patched as Order).createdAt = over.createdAt ?? o.createdAt;
    return patched;
  };

  it('send nothing until turned on with a postal address', async () => {
    const store = getStore()!;
    await seed({});
    expect(await runReminders(store, Date.now() + 2 * DAY)).toEqual({ carts: 0, reorders: 0, reviews: 0 });
    process.env.REMINDERS_ENABLED = 'true';
    expect((await runReminders(store, Date.now() + 2 * DAY)).carts).toBe(0);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('the abandoned cart email goes once, with opt out and address, and respects opting out', async () => {
    on();
    const store = getStore()!;
    const before = (await store.listOrders()).length;
    const later = Date.now() + 2 * DAY;
    const first = await runReminders(store, later);
    expect(first.carts).toBeGreaterThan(0);
    const mail = mails().find((m) => m.to === 'r@example.test')!;
    expect(mail.subject).toContain('[TEST]');
    expect(mail.text).toContain('/es/pay/');
    expect(mail.text).toContain('/es/unsubscribe?e=');
    expect(mail.text).toContain('1 Main St, Ames, IA');
    expect(mail.headers?.['List-Unsubscribe']).toContain('/api/unsubscribe');
    sendMail.mockClear();
    expect((await runReminders(store, later)).carts).toBe(0);
    expect(sendMail).not.toHaveBeenCalled();
    expect((await store.listOrders()).length).toBe(before);

    const o = await store.createOrder({ ...base, email: 'gone@example.test' });
    await store.optOut('GONE@example.test');
    await runReminders(store, later);
    expect(mails().some((m) => m.to === 'gone@example.test')).toBe(false);
    expect(await store.isOptedOut('gone@example.test')).toBe(true);
    expect(o.id).toBeTruthy();
  });

  it('wear parts remind after the set days, unless already bought again', async () => {
    on();
    const store = getStore()!;
    await store.saveSalesRule({ productId: 'filter-x', reorderDays: 30, volume: [] });
    const item = { productId: 'filter-x', sku: 'F', name: 'Filter', unitPriceCents: 100, quantity: 1 };
    const a = await store.createOrder({ ...base, items: [item], email: 'wear@example.test' });
    await store.updateOrder(a.id, { status: 'paid' });
    expect((await runReminders(store, Date.now() + 10 * DAY)).reorders).toBe(0);
    sendMail.mockClear();
    expect((await runReminders(store, Date.now() + 31 * DAY)).reorders).toBe(1);
    expect(mails().find((m) => m.to === 'wear@example.test')!.text).toContain('Filter');
    expect((await runReminders(store, Date.now() + 32 * DAY)).reorders).toBe(0);
  });

  it('the daily job needs its secret', async () => {
    const call = (auth?: string) => cron(new Request('http://localhost:3000/api/cron/reminders', { headers: auth ? { authorization: auth } : {} }));
    expect((await call('Bearer x')).status).toBe(403);
    process.env.CRON_SECRET = 'secret-value';
    expect((await call()).status).toBe(403);
    expect((await call('Bearer wrong-value')).status).toBe(403);
    expect((await call('Bearer secret-value')).status).toBe(200);
  });

  it('opting out needs a valid signature', async () => {
    const store = getStore()!;
    expect((await unsubscribe(post('/api/unsubscribe', { e: 'x@example.test', s: 'bad' }))).status).toBe(400);
    expect(await store.isOptedOut('x@example.test')).toBe(false);
    expect((await unsubscribe(post('/api/unsubscribe', { e: 'x@example.test', s: sign('unsubscribe', 'x@example.test') }))).status).toBe(200);
    expect(await store.isOptedOut('x@example.test')).toBe(true);
  });
});

describe('reviews', () => {
  const body = { rating: 5, author: 'Ana', body: 'Muy buena llanta, llegó bien.' };
  const sold = async (status: Order['status'] = 'paid') => {
    const store = getStore()!;
    const o = await store.createOrder({ ...base, email: 'v@example.test' });
    return store.updateOrder(o.id, { status });
  };
  const link = (id: string) => new URL(reviewLink('https://x.test', 'es', id, 'tire-r1'));

  it('only a real buyer, with a valid link, once, and pending until approved', async () => {
    const store = getStore()!;
    const o = await sold();
    const sig = link(o.id).searchParams.get('sig')!;
    expect(verify(sig, 'review', o.id, 'tire-r1')).toBe(true);
    const send = (extra = {}) => reviews(post('/api/reviews', { order: o.id, product: 'tire-r1', sig, ...body, ...extra }));
    expect((await send({ sig: 'forged' })).status).toBe(403);
    expect((await send({ product: 'other', sig: sign('review', o.id, 'other') })).status).toBe(403);
    expect((await send({ rating: 9 })).status).toBe(400);
    expect((await send()).status).toBe(201);
    expect((await send()).status).toBe(409);
    const [saved] = (await store.listReviews()).filter((r) => r.orderId === o.id);
    expect(saved).toMatchObject({ status: 'pending', rating: 5 });
    expect(await store.listApprovedReviews('tire-r1')).toEqual([]);
    await store.moderateReview(saved.id, 'approved');
    expect(await store.listApprovedReviews('tire-r1')).toHaveLength(1);
  });

  it('an unpaid order cannot review', async () => {
    const o = await sold('pending_payment');
    const res = await reviews(post('/api/reviews', { order: o.id, product: 'tire-r1', sig: sign('review', o.id, 'tire-r1'), ...body }));
    expect(res.status).toBe(403);
  });
});

describe('search', () => {
  const list = demo as unknown as Product[];
  const ids = (q: string) => searchProducts(list, q).map((p) => p.id);

  it('survives typos, accents and other languages', () => {
    expect(ids('tractr')).toContain('tire-r1');
    expect(ids('hidraulico').length + ids('hydralic').length).toBeGreaterThan(0);
    expect(ids('hydralic hose')[0]).toBe(searchProducts(list, 'hydraulic hose')[0].id);
    expect(ids('llanta')).toEqual(expect.arrayContaining(ids('tire').slice(0, 1)));
  });

  it('finds SKU and sizes however they are typed', () => {
    const product = { ...list[0], id: 'sized', sku: 'AG-184-38', tireSize: '18.4-38' } as Product;
    for (const q of ['AG18438', 'ag-184-38', '18.4-38', '18.4/38', '18438']) expect(searchScore(product, q), q).toBeGreaterThan(0);
    expect(searchScore(product, '18439')).toBe(0);
  });

  it('every word must match, and exact names rank first', () => {
    expect(searchProducts(list, 'filter zzzzzz')).toEqual([]);
    expect(searchProducts(list, '')).toHaveLength(list.length);
    expect(searchProducts(list, 'Hydraulic Filter')[0].name).toContain('Hydraulic Filter');
  });

  it('short codes do not match by typo', () => {
    expect(searchScore({ ...list[0], name: 'Filter', tags: [], desc: '', sku: 'ZZ', alt: '' } as Product, 'h7')).toBe(0);
  });
});

describe('bought together', () => {
  const o = (ids: string[], status: Order['status'] = 'paid') => ({ ...base, id: ids.join(), email: 'a', status, createdAt: '', items: ids.map((productId) => ({ productId, sku: productId, name: productId, unitPriceCents: 1, quantity: 1 })) }) as Order;

  it('needs at least two real orders together', () => {
    expect(boughtTogether([o(['a', 'b'])], 'a')).toEqual([]);
    expect(boughtTogether([o(['a', 'b']), o(['a', 'b', 'c']), o(['a', 'c'], 'cancelled')], 'a')).toEqual(['b']);
  });
});
