import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as webhook } from '@/app/api/paypal/webhook/route';
import { orderRefundMail } from '@/lib/server/email';
import { issueRefund, refundableCents } from '@/lib/server/orders';
import { getStore, type Order } from '@/lib/server/store';

const { sendMail } = vi.hoisted(() => ({ sendMail: vi.fn(async () => ({})) }));
vi.mock('nodemailer', () => ({ default: { createTransport: () => ({ sendMail, close: () => {} }) } }));

const item = { productId: 'tire-r1', sku: 'S1', name: 'Tire', unitPriceCents: 5000, quantity: 2 };
let captures = 0;

async function paidOrder() {
  const store = getStore()!;
  const order = await store.createOrder({ email: 'ana@example.test', items: [item], subtotalCents: 10000, shippingCents: 0, taxCents: 0, totalCents: 10000, currency: 'USD', locale: 'es' });
  return store.updateOrder(order.id, { status: 'paid', paypalCaptureId: `CAP${++captures}` });
}

// PayPal stand-in that remembers repeated requests, as the real API does with PayPal-Request-Id.
function mockPayPal(answer?: () => Response) {
  const seen = new Map<string, unknown>();
  const refunds: { url: string; requestId: string; cents: number }[] = [];
  let total = 0;
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith('/v1/oauth2/token')) return Response.json({ access_token: 'T' });
    if (url.endsWith('/verify-webhook-signature')) return Response.json({ verification_status: 'SUCCESS' });
    if (!url.endsWith('/refund')) return new Response('not found', { status: 404 });
    if (answer) return answer();
    const requestId = (init!.headers as Record<string, string>)['PayPal-Request-Id'];
    if (seen.has(requestId)) return Response.json(seen.get(requestId), { status: 201 });
    const cents = Math.round(Number(JSON.parse(String(init!.body)).amount.value) * 100);
    refunds.push({ url, requestId, cents });
    total += cents;
    const body = { id: `R${refunds.length}`, status: 'COMPLETED', seller_payable_breakdown: { total_refunded_amount: { value: (total / 100).toFixed(2) } } };
    seen.set(requestId, body);
    return Response.json(body, { status: 201 });
  }));
  return refunds;
}

beforeAll(() => {
  process.env.STORE_DRIVER = 'local';
  process.env.STORE_FILE = path.join(mkdtempSync(path.join(tmpdir(), 'agrotires-refund-')), 'store.json');
});
beforeEach(() => {
  sendMail.mockClear();
  Object.assign(process.env, { SMTP_USER: 'contact@agrotiresusa.com', SMTP_PASS: 'x', PAYMENTS_ENABLED: 'true', PAYPAL_ENV: 'sandbox', PAYPAL_CLIENT_ID: 'id', PAYPAL_CLIENT_SECRET: 'secret', PAYPAL_WEBHOOK_ID: 'wh' });
});
afterEach(() => {
  vi.unstubAllGlobals();
  for (const k of ['SMTP_USER', 'SMTP_PASS', 'PAYMENTS_ENABLED', 'PAYPAL_ENV', 'PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'PAYPAL_WEBHOOK_ID']) delete process.env[k];
});

describe('refunds', () => {
  it('a partial refund keeps the order paid, and the rest completes it', async () => {
    const store = getStore()!;
    const refunds = mockPayPal();
    const order = await paidOrder();
    const first = await issueRefund(store, order, 2500);
    expect(first).toMatchObject({ ok: true, order: { status: 'paid', refundedCents: 2500 } });
    expect(refundableCents((await store.getOrder(order.id))!)).toBe(7500);
    const second = await issueRefund(store, (await store.getOrder(order.id))!, 7500);
    expect(second).toMatchObject({ ok: true, order: { status: 'refunded', refundedCents: 10000 } });
    expect(refunds.map((r) => r.cents)).toEqual([2500, 7500]);
    expect(refunds[0].url).toContain(`/v2/payments/captures/${order.paypalCaptureId}/refund`);
  });

  it('never returns more than what is left, and refuses unpaid orders', async () => {
    const store = getStore()!;
    const refunds = mockPayPal();
    const order = await paidOrder();
    for (const cents of [0, -5, 10001, 12.5, NaN]) expect((await issueRefund(store, order, cents)).ok).toBe(false);
    const unpaid = await store.createOrder({ email: 'a@b.test', items: [item], subtotalCents: 10000, shippingCents: 0, taxCents: 0, totalCents: 10000, currency: 'USD' });
    expect((await issueRefund(store, unpaid, 100)).ok).toBe(false);
    expect(refunds).toEqual([]);
  });

  it('a double click refunds once, from a stale page too', async () => {
    const store = getStore()!;
    const refunds = mockPayPal();
    const order = await paidOrder();
    await issueRefund(store, order, 4000);
    const again = await issueRefund(store, order, 4000);
    expect(refunds.length).toBe(1);
    expect(again.ok).toBe(false);
    expect((await store.getOrder(order.id))!.refundedCents).toBe(4000);
  });

  it('retrying after a lost answer uses the same request, so PayPal does not pay twice', async () => {
    const store = getStore()!;
    const refunds = mockPayPal();
    const order = await paidOrder();
    const update = vi.spyOn(store, 'updateOrder').mockRejectedValueOnce(new Error('database down'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const lost = await issueRefund(store, order, 3000);
    expect(lost).toMatchObject({ ok: false, unknown: true });
    update.mockRestore();
    const retry = await issueRefund(store, (await store.getOrder(order.id))!, 3000);
    spy.mockRestore();
    expect(retry).toMatchObject({ ok: true, order: { refundedCents: 3000 } });
    expect(refunds.length).toBe(1);
  });

  it('explains PayPal refusals without recording anything', async () => {
    const store = getStore()!;
    mockPayPal(() => Response.json({ details: [{ issue: 'CAPTURE_FULLY_REFUNDED' }] }, { status: 422 }));
    const order = await paidOrder();
    const r = await issueRefund(store, order, 1000);
    expect(r).toMatchObject({ ok: false, error: expect.stringContaining('already been fully refunded') });
    expect((await store.getOrder(order.id))!.refundedCents ?? 0).toBe(0);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('a failed PayPal refund is not recorded', async () => {
    const store = getStore()!;
    mockPayPal(() => Response.json({ id: 'R', status: 'FAILED' }, { status: 201 }));
    const order = await paidOrder();
    expect((await issueRefund(store, order, 1000)).ok).toBe(false);
    expect((await store.getOrder(order.id))!.status).toBe('paid');
  });

  it('tells the customer once, and the webhook echo adds nothing', async () => {
    const store = getStore()!;
    mockPayPal();
    const order = await paidOrder();
    await issueRefund(store, order, 2500);
    expect(sendMail).toHaveBeenCalledTimes(1);
    const resource = { id: 'R1', status: 'COMPLETED', custom_id: order.id, amount: { currency_code: 'USD', value: '25.00' }, seller_payable_breakdown: { total_refunded_amount: { value: '25.00' } } };
    const post = () => new Request('http://localhost:3000/api/paypal/webhook', { method: 'POST', body: JSON.stringify({ event_type: 'PAYMENT.CAPTURE.REFUNDED', resource }) });
    await webhook(post());
    await webhook(post());
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect((await store.getOrder(order.id))!.refundedCents).toBe(2500);
  });

  it('records a refund made directly in PayPal, found through its capture', async () => {
    const store = getStore()!;
    mockPayPal();
    const order = await paidOrder();
    const resource = {
      id: 'R9', status: 'COMPLETED', amount: { currency_code: 'USD', value: '100.00' }, seller_payable_breakdown: { total_refunded_amount: { value: '100.00' } },
      links: [{ rel: 'self', href: 'https://api.paypal.com/v2/payments/refunds/R9' }, { rel: 'up', href: `https://api.paypal.com/v2/payments/captures/${order.paypalCaptureId}` }],
    };
    await webhook(new Request('http://localhost:3000/api/paypal/webhook', { method: 'POST', body: JSON.stringify({ event_type: 'PAYMENT.CAPTURE.REFUNDED', resource }) }));
    expect(await store.getOrder(order.id)).toMatchObject({ status: 'refunded', refundedCents: 10000 });
    expect(sendMail).toHaveBeenCalledTimes(1);
  });

  it('returns items to stock only when asked', async () => {
    const store = getStore()!;
    const before = await store.listProducts();
    await store.saveProducts(before.map((p) => (p.id === 'tire-r1' ? { ...p, stockQty: 5 } : p)));
    await store.restock([item]);
    expect((await store.listProducts()).find((p) => p.id === 'tire-r1')!.stockQty).toBe(7);
    await store.saveProducts(before);
  });

  it('writes the refund email in the customer language', () => {
    const order = { id: 'abcdef12-0', email: 'a@b.test', status: 'paid', items: [item], subtotalCents: 10000, shippingCents: 0, taxCents: 0, totalCents: 10000, currency: 'USD', createdAt: 'now', locale: 'es', refundedCents: 2500 } satisfies Order;
    const mail = orderRefundMail(order, 2500);
    expect(mail.subject).toBe('[TEST] Reembolso de tu pedido: ABCDEF12');
    expect(mail.text).toContain('Monto reembolsado: $25.00 USD');
    expect(mail.text).toContain('Total reembolsado del pedido: $25.00 de $100.00 USD');
    expect(orderRefundMail({ ...order, locale: 'en' }, 2500).subject).toBe('[TEST] Refund for your order: ABCDEF12');
  });
});
