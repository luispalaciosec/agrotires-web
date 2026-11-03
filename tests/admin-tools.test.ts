import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as checkout } from '@/app/api/checkout/route';
import { POST as track } from '@/app/api/track/route';
import { EMAIL_TEMPLATES, defaultContent, fillTemplate, templateDef, templateProblem } from '@/lib/email-templates';
import { carrierLink } from '@/lib/shipping';
import { bpsToPercent, percentToBps, taxCents } from '@/lib/tax';
import { change, customerReport, priorities, salesReport, taxReport } from '@/lib/server/analytics';
import { toCsv } from '@/lib/server/csv';
import { brandedHtml, orderCustomerMail } from '@/lib/server/email';
import { newShipmentCode, publicShipment, SHIPMENT_CODE, shipOrder, updateShipment } from '@/lib/server/shipments';
import { getStore, type Order, type StoredProduct } from '@/lib/server/store';

const { sendMail } = vi.hoisted(() => ({ sendMail: vi.fn(async () => ({})) }));
vi.mock('nodemailer', () => ({ default: { createTransport: () => ({ sendMail, close: () => {} }) } }));

const NOW = Date.UTC(2026, 10, 15, 12);
const daysAgo = (n: number) => new Date(NOW - n * 86_400_000).toISOString();
const address = { name: 'Ana', line1: '1 Farm Rd', city: 'Ames', state: 'IA', postalCode: '50010', country: 'US' };
const order = (over: Partial<Order> = {}): Order => ({
  id: crypto.randomUUID(), email: 'ana@example.test', status: 'paid', currency: 'USD', createdAt: daysAgo(1), subtotalCents: 10000, shippingCents: 0, taxCents: 600, totalCents: 10600, shippingAddress: address,
  items: [{ productId: 'p', sku: 'S1', name: 'Tire', unitPriceCents: 5000, quantity: 2 }], ...over,
});
let ip = 200;
const post = (url: string, body: unknown) => new Request(`http://localhost:3000${url}`, { method: 'POST', body: JSON.stringify(body), headers: { host: 'localhost:3000', origin: 'http://localhost:3000', 'x-forwarded-for': `10.0.2.${++ip}` } });

beforeAll(() => {
  process.env.STORE_DRIVER = 'local';
  process.env.STORE_FILE = path.join(mkdtempSync(path.join(tmpdir(), 'agrotires-tools-')), 'store.json');
});
beforeEach(() => {
  sendMail.mockClear();
  Object.assign(process.env, { SMTP_USER: 'contact@agrotiresusa.com', SMTP_PASS: 'x' });
});
afterEach(() => {
  vi.unstubAllGlobals();
  for (const k of ['SMTP_USER', 'SMTP_PASS', 'PAYMENTS_ENABLED', 'PAYPAL_ENV', 'PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET']) delete process.env[k];
});

describe('sales report', () => {
  it('counts only sales, net of refunds, inside the period', () => {
    const r = salesReport([
      order(),
      order({ status: 'fulfilled', refundedCents: 600 }),
      order({ status: 'pending_payment' }),
      order({ status: 'cancelled' }),
      order({ createdAt: daysAgo(40) }),
    ], 30, NOW);
    expect(r.current).toMatchObject({ orders: 2, netCents: 20600, refundedCents: 600, taxCents: 1200, averageCents: 10600 });
    expect(r.previous.orders).toBe(1);
    expect(r.daily).toHaveLength(30);
    expect(r.daily.reduce((n, d) => n + d.cents, 0)).toBe(20600);
    expect(r.topProducts[0]).toMatchObject({ sku: 'S1', units: 4, cents: 20000 });
    expect(r.topStates[0]).toEqual({ state: 'IA', cents: 20600 });
  });

  it('compares only when there is something to compare with', () => {
    expect(change(150, 100)).toBe(0.5);
    expect(change(100, 0)).toBeUndefined();
  });

  it('lists what needs attention, and nothing when all is well', () => {
    const product = { active: true, stockQty: 0 } as StoredProduct;
    const paid = order();
    const list = priorities([paid, order({ status: 'payment_failed', paypalCaptureId: 'C' })], [], [product], []);
    expect(list.map((p) => [p.count, p.tone])).toEqual([[1, 'bad'], [1, 'warn'], [1, 'warn']]);
    const shipped = { orderId: paid.id, status: 'in_transit' } as never;
    expect(priorities([paid], [], [], [shipped])).toEqual([]);
  });

  it('groups customers by email regardless of case', () => {
    const list = customerReport([order({ email: 'A@b.test' }), order({ email: 'a@B.test' }), order({ status: 'cancelled', email: 'x@y.test' })]);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ orders: 2, spentCents: 21200, state: 'IA' });
  });
});

describe('taxes', () => {
  it('reads percentages exactly', () => {
    expect(percentToBps('6.25')).toBe(625);
    expect(percentToBps('')).toBe(0);
    expect(percentToBps('7.125')).toBe(713);
    expect(percentToBps('21')).toBeNaN();
    expect(percentToBps('abc')).toBeNaN();
    expect(percentToBps('-1')).toBeNaN();
    expect(bpsToPercent(625)).toBe('6.25');
    expect(bpsToPercent(700)).toBe('7');
    expect(bpsToPercent(0)).toBe('0');
  });

  it('rounds to the cent', () => {
    expect(taxCents(10000, 625)).toBe(625);
    expect(taxCents(999, 725)).toBe(72);
    expect(taxCents(10000, 0)).toBe(0);
  });

  it('reports by month and state for the year', () => {
    const rows = taxReport([order({ createdAt: '2026-03-02T00:00:00Z' }), order({ createdAt: '2026-03-09T00:00:00Z' }), order({ createdAt: '2025-03-02T00:00:00Z' })], 2026);
    expect(rows).toEqual([{ month: '2026-03', state: 'IA', orders: 2, taxCents: 1200, salesCents: 20000 }]);
  });

  it('charges the rate of the delivery state, on the server', async () => {
    Object.assign(process.env, { PAYMENTS_ENABLED: 'true', PAYPAL_ENV: 'sandbox', PAYPAL_CLIENT_ID: 'id', PAYPAL_CLIENT_SECRET: 's' });
    const bodies: { purchase_units: { amount: { value: string; breakdown: { tax_total: { value: string } } }; shipping: { address: { admin_area_1: string } } }[]; payment_source: { paypal: { experience_context: { shipping_preference: string } } } }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
      if (url.endsWith('/oauth2/token')) return Response.json({ access_token: 'T' });
      bodies.push(JSON.parse(String(init.body)));
      return Response.json({ id: `PP-TAX-${bodies.length}` }, { status: 201 });
    }));
    const store = getStore()!;
    await store.saveTaxRates([{ state: 'IA', rateBps: 600, active: true }, { state: 'TX', rateBps: 625, active: false }]);
    const buy = (state: string, extra = {}) => checkout(post('/api/checkout', { email: 'a@b.test', address: { name: 'A', line1: 'L', city: 'C', state, postalCode: '50010' }, items: [{ id: 'tire-r1', quantity: 1 }], ...extra }));

    const taxed = await (await buy('IA', { taxCents: 0, total: 1 })).json();
    const saved = (await store.getOrder(taxed.orderId))!;
    expect(saved).toMatchObject({ subtotalCents: 68900, taxCents: 4134, totalCents: 73034 });
    expect(saved.shippingAddress).toMatchObject({ state: 'IA', country: 'US' });
    expect(bodies[0].purchase_units[0].amount.value).toBe('730.34');
    expect(bodies[0].purchase_units[0].amount.breakdown.tax_total.value).toBe('41.34');
    expect(bodies[0].purchase_units[0].shipping.address.admin_area_1).toBe('IA');
    expect(bodies[0].payment_source.paypal.experience_context.shipping_preference).toBe('SET_PROVIDED_ADDRESS');

    expect((await store.getOrder((await (await buy('TX')).json()).orderId))!.taxCents).toBe(0); // rate turned off
    expect((await store.getOrder((await (await buy('NY')).json()).orderId))!.taxCents).toBe(0); // no rate
    expect((await buy('XX')).status).toBe(400);
    expect((await checkout(post('/api/checkout', { email: 'a@b.test', items: [{ id: 'tire-r1', quantity: 1 }] }))).status).toBe(400);
    await store.saveTaxRates([]);
  });
});

describe('email templates', () => {
  it('every default is valid and uses only its own variables', () => {
    for (const def of EMAIL_TEMPLATES) expect(templateProblem(def, defaultContent(def)), def.key).toBeUndefined();
    expect(EMAIL_TEMPLATES.every((d) => Object.keys(d.variables).every((v) => d.sample[v]))).toBe(true);
  });

  it('refuses broken edits', () => {
    const def = templateDef('order_paid')!;
    const base = defaultContent(def);
    expect(templateProblem(def, { ...base, subject_es: '' })).toContain('Spanish subject');
    expect(templateProblem(def, { ...base, body_en: '' })).toContain('English message');
    expect(templateProblem(def, { ...base, subject_en: 'a\nb' })).toContain('one line');
    expect(templateProblem(def, { ...base, body_en: 'Hi {{password}}' })).toContain('{{password}}');
  });

  it('what a customer typed cannot act as a variable or markup', () => {
    expect(fillTemplate('{{message}} {{name}}', { message: '{{name}}', name: 'Ana' })).toBe('{{name}} Ana');
    const html = brandedHtml('<script>alert(1)</script>\nhttps://agrotiresusa.com/track?code=A&b=1');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('<br><a href="https://agrotiresusa.com/track?code=A&amp;b=1"');
  });

  it('sends the saved text, and nothing when turned off', async () => {
    const store = getStore()!;
    const def = templateDef('order_paid')!;
    expect(orderCustomerMail(order(), { ...defaultContent(def), subject_en: 'Hello {{order_ref}}' }).subject).toMatch(/^\[TEST\] Hello /);
    await store.saveEmailTemplate({ key: 'quote_team', ...defaultContent(templateDef('quote_team')!), enabled: false });
    const { notifyQuote } = await import('@/lib/server/email');
    await notifyQuote({ id: 'q', name: 'A', email: 'a@b.test', topic: 'T', message: 'M', status: 'new', createdAt: 'now' });
    expect(sendMail).not.toHaveBeenCalled();
    await store.deleteEmailTemplate('quote_team');
    await notifyQuote({ id: 'q', name: 'A', email: 'a@b.test', topic: 'T', message: 'M', status: 'new', createdAt: 'now' });
    expect(sendMail).toHaveBeenCalledTimes(1);
  });
});

describe('shipments', () => {
  const paidOrder = async () => {
    const store = getStore()!;
    const created = await store.createOrder({ email: 'ana@example.test', items: order().items, subtotalCents: 10000, shippingCents: 0, taxCents: 0, totalCents: 10000, currency: 'USD', locale: 'es', shippingAddress: address });
    return store.updateOrder(created.id, { status: 'paid' });
  };

  it('codes are long, readable and unique', () => {
    const codes = new Set(Array.from({ length: 500 }, newShipmentCode));
    expect(codes.size).toBe(500);
    expect([...codes].every((c) => SHIPMENT_CODE.test(c) && !/[01ILO]/.test(c))).toBe(true);
  });

  it('shipping marks the order fulfilled, emails the link and allows one shipment', async () => {
    const store = getStore()!;
    const o = await paidOrder();
    const s = await shipOrder(store, o, { carrier: 'UPS', trackingNumber: '1Z999' }, true);
    expect((await store.getOrder(o.id))!.status).toBe('fulfilled');
    expect(s.events.map((e) => e.status)).toEqual(['label_created']);
    const mail = (sendMail.mock.calls as unknown as [{ to: string; subject: string; text: string }][])[0][0];
    expect(mail.to).toBe('ana@example.test');
    expect(mail.subject).toContain('Tu pedido fue despachado');
    expect(mail.text).toContain(`/es/track?code=${s.code}`);
    expect(mail.text).toContain('1Z999');
    await expect(shipOrder(store, o, { carrier: 'UPS' }, false)).rejects.toThrow();
  });

  it('updates email only on arrival at a new milestone', async () => {
    const store = getStore()!;
    const o = await paidOrder();
    let s = await shipOrder(store, o, { carrier: 'Freight carrier' }, false);
    expect(sendMail).not.toHaveBeenCalled();
    s = await updateShipment(store, o, s, { status: 'in_transit', location: 'Omaha, NE' }, true);
    expect(sendMail).not.toHaveBeenCalled();
    s = await updateShipment(store, o, s, { status: 'out_for_delivery', location: 'Ames, IA' }, true);
    expect(sendMail).toHaveBeenCalledTimes(1);
    s = await updateShipment(store, o, s, { status: 'out_for_delivery', location: 'Ames, IA 2' }, true);
    expect(sendMail).toHaveBeenCalledTimes(1);
    s = await updateShipment(store, o, s, { status: 'delivered' }, true);
    expect(sendMail).toHaveBeenCalledTimes(2);
    expect(s.status).toBe('delivered');
    expect(s.events).toHaveLength(5);
  });

  it('the public page gets the journey but no personal data', async () => {
    const store = getStore()!;
    const o = await paidOrder();
    const s = await shipOrder(store, o, { carrier: 'UPS', trackingNumber: '1Z 9/9' }, false);
    await updateShipment(store, o, s, { status: 'in_transit', location: 'Omaha, NE', note: 'On the way' }, false);
    const res = await track(post('/api/track', { code: s.code.toLowerCase() }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('in_transit');
    expect(body.carrierUrl).toBe('https://www.ups.com/track?tracknum=1Z%209%2F9');
    expect(body.events.at(-1)).toMatchObject({ location: 'Omaha, NE', note: 'On the way' });
    const text = JSON.stringify(body);
    for (const secret of ['ana@example.test', '1 Farm Rd', o.id, s.id]) expect(text).not.toContain(secret);
    expect(Object.keys(publicShipment(s))).not.toContain('orderId');
  });

  it('unknown or malformed codes answer the same', async () => {
    for (const code of ['AG2222222222', 'nope', "AG' or 1=1", '']) expect((await track(post('/api/track', { code }))).status).toBe(404);
    expect((await track(new Request('http://localhost:3000/api/track', { method: 'POST', body: '{"code":"AG2222222222"}', headers: { host: 'localhost:3000', origin: 'https://evil.test' } }))).status).toBe(403);
  });

  it('only known carriers get a link', () => {
    expect(carrierLink('Freight carrier', 'PRO1')).toBeUndefined();
    expect(carrierLink('UPS')).toBeUndefined();
  });
});

describe('exports', () => {
  it('neutralizes spreadsheet formulas and quotes properly', () => {
    expect(toCsv([['=HYPERLINK("x")', '@a', 'plain', 'a,b', 5]])).toBe(`"'=HYPERLINK(""x"")",'@a,plain,"a,b",5`);
  });
});
