import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { POST as capture } from '@/app/api/checkout/capture/route';
import { POST as checkout } from '@/app/api/checkout/route';
import { POST as webhook } from '@/app/api/paypal/webhook/route';
import { POST as quotes } from '@/app/api/quotes/route';
import { settleCapture } from '@/lib/server/orders';
import { paymentsEnabled } from '@/lib/server/paypal';
import { priceCart, valueToCents } from '@/lib/server/pricing';
import { products as demoProducts } from '@/lib/catalog';
import { getStore, type StoredProduct } from '@/lib/server/store';

const file = path.join(mkdtempSync(path.join(tmpdir(), 'agrotires-')), 'store.json');
let ip = 0;
let paypalIds = 0;

const post = (url: string, body: unknown, headers: Record<string, string> = {}) => new Request(`http://localhost:3000${url}`, {
  method: 'POST',
  body: typeof body === 'string' ? body : JSON.stringify(body),
  headers: { host: 'localhost:3000', origin: 'http://localhost:3000', 'x-forwarded-for': `10.0.0.${++ip}`, ...headers },
});

// PayPal stand-in: answers by path, records calls, and never touches the network.
function mockPayPal(captureBody: unknown = { purchase_units: [{ payments: { captures: [{ id: 'CAP1', status: 'COMPLETED', amount: { currency_code: 'USD', value: '1378.00' } }] } }] }) {
  const calls: { url: string; init?: RequestInit }[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    if (url.endsWith('/v1/oauth2/token')) return Response.json({ access_token: 'T' });
    if (url.endsWith('/v2/checkout/orders')) return Response.json({ id: `PP${++paypalIds}` }, { status: 201 });
    if (url.endsWith('/capture')) return Response.json(captureBody, { status: 201 });
    if (url.endsWith('/verify-webhook-signature')) return Response.json({ verification_status: 'SUCCESS' });
    return new Response('not found', { status: 404 });
  }));
  return calls;
}

beforeAll(() => {
  process.env.STORE_DRIVER = 'local';
  process.env.STORE_FILE = file;
});

afterEach(() => {
  vi.unstubAllGlobals();
  for (const k of ['PAYMENTS_ENABLED', 'PAYPAL_ENV', 'PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'PAYPAL_WEBHOOK_ID']) delete process.env[k];
});

const enablePayments = () => Object.assign(process.env, { PAYMENTS_ENABLED: 'true', PAYPAL_ENV: 'sandbox', PAYPAL_CLIENT_ID: 'id', PAYPAL_CLIENT_SECRET: 'secret', PAYPAL_WEBHOOK_ID: 'wh' });
const validQuote = { name: 'Ana', email: 'ana@example.test', topic: 'Bulk order', message: 'Hola', zip: '50301' };

const catalog: StoredProduct[] = demoProducts.map((p) => ({ ...p, stockQty: null, active: true, shippingClass: 'parcel', compatibilityVerified: false }));

describe('pricing', () => {
  it('uses catalog prices and merges repeated lines', () => {
    const { items, subtotalCents } = priceCart([{ id: 'tire-r1', quantity: 1 }, { id: 'tire-r1', quantity: 1 }], catalog);
    expect(items).toHaveLength(1);
    expect(subtotalCents).toBe(137800);
  });
  it('rejects unknown products', () => {
    expect(() => priceCart([{ id: 'nope', quantity: 1 }], catalog)).toThrow('Unknown product');
  });
  it('parses money without float errors', () => {
    expect(valueToCents('1378.00')).toBe(137800);
    expect(valueToCents('0.29')).toBe(29);
    expect(valueToCents('abc')).toBeNaN();
  });
});

describe('payments switch', () => {
  it('is off by default', () => expect(paymentsEnabled()).toBe(false));
  it('never allows live payments on the demo catalog', () => {
    enablePayments();
    expect(paymentsEnabled()).toBe(true);
    process.env.PAYPAL_ENV = 'live';
    expect(paymentsEnabled()).toBe(false);
  });
});

describe('POST /api/quotes', () => {
  it('stores a valid request', async () => {
    const res = await quotes(post('/api/quotes', validQuote));
    expect(res.status).toBe(201);
    expect(JSON.parse(readFileSync(file, 'utf8')).quotes[0]).toMatchObject({ name: 'Ana', deliveryZip: '50301', status: 'new' });
  });
  it('rejects bad data, foreign origins and oversized bodies', async () => {
    expect((await quotes(post('/api/quotes', { ...validQuote, email: 'x' }))).status).toBe(400);
    expect((await quotes(post('/api/quotes', validQuote, { origin: 'https://evil.test' }))).status).toBe(403);
    expect((await quotes(post('/api/quotes', { ...validQuote, message: 'x'.repeat(30000) }))).status).toBe(413);
  });
  it('accepts but discards honeypot submissions', async () => {
    const res = await quotes(post('/api/quotes', { ...validQuote, name: 'Bot', website: 'spam' }));
    expect(res.status).toBe(201);
    expect(JSON.parse(readFileSync(file, 'utf8')).quotes.some((q: { name: string }) => q.name === 'Bot')).toBe(false);
  });
  it('rate limits by address', async () => {
    const ipHeader = { 'x-forwarded-for': '10.9.9.9' };
    const codes = [];
    for (let i = 0; i < 6; i++) codes.push((await quotes(post('/api/quotes', validQuote, ipHeader))).status);
    expect(codes.at(-1)).toBe(429);
  });
});

describe('checkout', () => {
  it('answers 503 while payments are off', async () => {
    expect((await checkout(post('/api/checkout', { email: 'a@b.test', items: [{ id: 'tire-r1', quantity: 1 }] }))).status).toBe(503);
  });

  it('ignores any price sent by the browser', async () => {
    enablePayments();
    const calls = mockPayPal();
    const res = await checkout(post('/api/checkout', { email: 'a@b.test', items: [{ id: 'tire-r1', quantity: 2, price: 1 }] }));
    expect(res.status).toBe(201);
    const sent = JSON.parse(String(calls.find((c) => c.url.endsWith('/v2/checkout/orders'))!.init!.body));
    expect(sent.purchase_units[0].amount).toEqual({ currency_code: 'USD', value: '1378.00' });
  });

  it('marks the order paid once, and a repeat does not charge again', async () => {
    enablePayments();
    const calls = mockPayPal();
    const { paypalOrderId, orderId } = await (await checkout(post('/api/checkout', { email: 'a@b.test', items: [{ id: 'tire-r1', quantity: 2 }] }))).json();
    const first = await (await capture(post('/api/checkout/capture', { paypalOrderId }))).json();
    expect(first).toEqual({ orderId, status: 'paid' });
    const captures = () => calls.filter((c) => c.url.endsWith('/capture')).length;
    expect(captures()).toBe(1);
    await capture(post('/api/checkout/capture', { paypalOrderId }));
    expect(captures()).toBe(1);
  });

  it('does not mark paid when the captured amount differs', async () => {
    enablePayments();
    mockPayPal({ purchase_units: [{ payments: { captures: [{ id: 'CAP2', status: 'COMPLETED', amount: { currency_code: 'USD', value: '1.00' } }] } }] });
    const { paypalOrderId } = await (await checkout(post('/api/checkout', { email: 'a@b.test', items: [{ id: 'tire-r1', quantity: 2 }] }))).json();
    expect((await (await capture(post('/api/checkout/capture', { paypalOrderId }))).json()).status).toBe('payment_failed');
  });

  it('saves the address PayPal returns, and a decline fails the order without a charge', async () => {
    enablePayments();
    const shipping = { name: { full_name: 'Ana Ruiz' }, address: { address_line_1: '1 Farm Rd', admin_area_2: 'Ames', admin_area_1: 'IA', postal_code: '50010', country_code: 'US' } };
    mockPayPal({ purchase_units: [{ shipping, payments: { captures: [{ id: 'CAP4', status: 'COMPLETED', amount: { currency_code: 'USD', value: '1378.00' } }] } }] });
    const ok = await (await checkout(post('/api/checkout', { email: 'a@b.test', items: [{ id: 'tire-r1', quantity: 2 }] }))).json();
    await capture(post('/api/checkout/capture', { paypalOrderId: ok.paypalOrderId }));
    expect((await getStore()!.getOrder(ok.orderId))!.shippingAddress).toEqual({ name: 'Ana Ruiz', line1: '1 Farm Rd', city: 'Ames', state: 'IA', postalCode: '50010', country: 'US' });

    mockPayPal();
    const declined = await (await checkout(post('/api/checkout', { email: 'a@b.test', items: [{ id: 'tire-r1', quantity: 1 }] }))).json();
    const base = vi.mocked(fetch).getMockImplementation()!;
    vi.mocked(fetch).mockImplementation(async (url, init) => (String(url).endsWith('/capture') ? Response.json({ details: [{ issue: 'INSTRUMENT_DECLINED' }] }, { status: 422 }) : base(url, init)));
    const res = await capture(post('/api/checkout/capture', { paypalOrderId: declined.paypalOrderId }));
    expect(res.status).toBe(402);
    expect((await res.json()).declined).toBe(true);
    expect((await getStore()!.getOrder(declined.orderId))!.status).toBe('payment_failed');
  });

  it('does not reduce stock twice when the webhook lands during capture', async () => {
    enablePayments();
    const store = getStore()!;
    const before = await store.listProducts();
    await store.saveProducts(before.map((p) => (p.id === 'tire-r1' ? { ...p, stockQty: 10 } : p)));
    mockPayPal();
    const { paypalOrderId, orderId } = await (await checkout(post('/api/checkout', { email: 'a@b.test', items: [{ id: 'tire-r1', quantity: 2 }] }))).json();
    const stale = (await store.getOrder(orderId))!;
    const resource = { id: 'CAP5', status: 'COMPLETED', custom_id: orderId, amount: { currency_code: 'USD', value: '1378.00' } };
    await webhook(post('/api/paypal/webhook', { event_type: 'PAYMENT.CAPTURE.COMPLETED', resource }));
    await settleCapture(store, stale, resource);
    expect((await store.listProducts()).find((p) => p.id === 'tire-r1')!.stockQty).toBe(8);
    expect(paypalOrderId).toBeTruthy();
    await store.saveProducts(before);
  });

  it('sends freight items to a quote instead of charging them as free', async () => {
    enablePayments();
    const store = getStore()!;
    const before = await store.listProducts();
    await store.saveProducts(before.map((p) => (p.id === 'tire-r1' ? { ...p, shippingClass: 'freight_quote' as const } : p)));
    const calls = mockPayPal();
    const res = await checkout(post('/api/checkout', { email: 'a@b.test', items: [{ id: 'tire-r1', quantity: 1 }] }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('freight');
    expect(calls.length).toBe(0);
    await store.saveProducts(before);
  });

  it('webhook settles a pending order and handles full refunds', async () => {
    enablePayments();
    mockPayPal();
    const { orderId } = await (await checkout(post('/api/checkout', { email: 'a@b.test', items: [{ id: 'tire-r1', quantity: 2 }] }))).json();
    const resource = { id: 'CAP3', status: 'COMPLETED', custom_id: orderId, amount: { currency_code: 'USD', value: '1378.00' } };
    await webhook(post('/api/paypal/webhook', { event_type: 'PAYMENT.CAPTURE.COMPLETED', resource }));
    expect((await getStore()!.getOrder(orderId))!.status).toBe('paid');
    await webhook(post('/api/paypal/webhook', { event_type: 'PAYMENT.CAPTURE.REFUNDED', resource: { ...resource, amount: { currency_code: 'USD', value: '10.00' } } }));
    expect((await getStore()!.getOrder(orderId))!.status).toBe('paid');
    await webhook(post('/api/paypal/webhook', { event_type: 'PAYMENT.CAPTURE.REFUNDED', resource }));
    expect((await getStore()!.getOrder(orderId))!.status).toBe('refunded');
  });

  it('webhook rejects a bad signature', async () => {
    enablePayments();
    vi.stubGlobal('fetch', vi.fn(async (url: string) => url.endsWith('/v1/oauth2/token') ? Response.json({ access_token: 'T' }) : Response.json({ verification_status: 'FAILURE' })));
    expect((await webhook(post('/api/paypal/webhook', { event_type: 'PAYMENT.CAPTURE.COMPLETED' }))).status).toBe(401);
  });
});
