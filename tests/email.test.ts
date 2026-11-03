import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as quotes } from '@/app/api/quotes/route';
import { orderCustomerMail, orderRef, orderTeamMail, quoteTeamMail } from '@/lib/server/email';
import { settleCapture } from '@/lib/server/orders';
import { getStore, type Order } from '@/lib/server/store';

const { sendMail } = vi.hoisted(() => ({ sendMail: vi.fn(async () => ({})) }));
vi.mock('nodemailer', () => ({ default: { createTransport: () => ({ sendMail, close: () => {} }) } }));

const SMTP = { SMTP_USER: 'contact@agrotiresusa.com', SMTP_PASS: 'x' };
let ip = 100;
const post = (body: unknown) => new Request('http://localhost:3000/api/quotes', {
  method: 'POST',
  body: JSON.stringify(body),
  headers: { host: 'localhost:3000', origin: 'http://localhost:3000', 'x-forwarded-for': `10.0.1.${++ip}` },
});
const quote = { name: 'Ana', email: 'ana@example.test', topic: 'Bulk order', message: 'Hola' };
const item = { productId: 'tire-r1', sku: 'S1', name: 'Tire', unitPriceCents: 68900, quantity: 2 };
const newOrder = (locale: 'en' | 'es' = 'en') => getStore()!.createOrder({ email: 'ana@example.test', items: [item], subtotalCents: 137800, shippingCents: 0, taxCents: 0, totalCents: 137800, currency: 'USD', locale });
const completed = (id: string) => ({ id, status: 'COMPLETED', amount: { currency_code: 'USD', value: '1378.00' } });

beforeAll(() => {
  process.env.STORE_DRIVER = 'local';
  process.env.STORE_FILE = path.join(mkdtempSync(path.join(tmpdir(), 'agrotires-mail-')), 'store.json');
});
beforeEach(() => {
  sendMail.mockClear();
  sendMail.mockImplementation(async () => ({}));
  Object.assign(process.env, SMTP);
});
afterEach(() => {
  for (const k of [...Object.keys(SMTP), 'PAYPAL_ENV']) delete process.env[k];
});

const sentTo = () => (sendMail.mock.calls as unknown as [{ to: string; subject: string }][]).map(([m]) => m);

describe('email', () => {
  it('tells the team about a quote and keeps the customer as reply-to', async () => {
    expect((await quotes(post(quote))).status).toBe(201);
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail.mock.calls[0]).toEqual([expect.objectContaining({ to: 'contact@agrotiresusa.com', replyTo: 'ana@example.test', subject: 'New quote request: Bulk order' })]);
  });

  it('saves the quote even when the mail server fails or is not set up', async () => {
    sendMail.mockRejectedValueOnce(new Error('down'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await quotes(post(quote))).status).toBe(201);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
    delete process.env.SMTP_PASS;
    sendMail.mockClear();
    expect((await quotes(post(quote))).status).toBe(201);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('bots caught by the trap send nothing', async () => {
    await quotes(post({ ...quote, website: 'spam' }));
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('emails customer and team once when an order becomes paid', async () => {
    const order = await newOrder();
    const store = getStore()!;
    const paid = await settleCapture(store, order, completed('M1'));
    expect(paid.status).toBe('paid');
    expect(sentTo().map((m) => m.to).sort()).toEqual(['ana@example.test', 'contact@agrotiresusa.com']);
    await settleCapture(store, order, completed('M1'));
    expect(sendMail).toHaveBeenCalledTimes(2);
  });

  it('a pending capture tells nobody, and a mismatch only alerts the team', async () => {
    const store = getStore()!;
    const pending = await newOrder();
    await settleCapture(store, pending, { ...completed('M2'), status: 'PENDING' });
    expect(sendMail).not.toHaveBeenCalled();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const wrong = await newOrder();
    await settleCapture(store, wrong, { ...completed('M3'), amount: { currency_code: 'USD', value: '1.00' } });
    spy.mockRestore();
    expect(sentTo().map((m) => m.to)).toEqual(['contact@agrotiresusa.com']);
    expect(sentTo()[0].subject).toContain('needs review');
  });

  it('writes to the customer in their language and marks sandbox orders', () => {
    const order = { id: 'abcdef12-0000', email: 'a@b.test', status: 'paid', items: [item], subtotalCents: 137800, shippingCents: 0, taxCents: 0, totalCents: 137800, currency: 'USD', createdAt: 'now', shippingAddress: { name: 'Ana', line1: '1 Farm Rd', city: 'Ames', state: 'IA', postalCode: '50010', country: 'US' } } satisfies Order;
    const es = orderCustomerMail({ ...order, locale: 'es' });
    expect(es.subject).toBe('[TEST] Recibimos tu pago: ABCDEF12');
    expect(es.text).toContain('Total pagado: $1,378.00 USD');
    expect(es.text).toContain('Ames, IA 50010');
    process.env.PAYPAL_ENV = 'live';
    expect(orderCustomerMail({ ...order, locale: 'en' }).subject).toBe(`We received your payment: ${orderRef(order.id)}`);
    expect(orderTeamMail(order).text).toContain('/admin/orders/abcdef12-0000');
  });

  it('keeps a typed line break out of the subject', () => {
    const mail = quoteTeamMail({ id: 'q', name: 'A', email: 'a@b.test', topic: 'Bulk order', message: 'x', status: 'new', createdAt: 'now' });
    expect(mail.subject).not.toMatch(/[\r\n]/);
  });
});
