import { DEMO_CATALOG } from '../catalog';
import { centsToValue } from './pricing';
import type { Order } from './store';

const BASES = { sandbox: 'https://api-m.sandbox.paypal.com', live: 'https://api-m.paypal.com' };
const baseUrl = () => (process.env.PAYPAL_ENV === 'live' ? BASES.live : BASES.sandbox);

// Off unless explicitly enabled, and fictional products can never be charged for real.
export function paymentsEnabled() {
  if (process.env.PAYMENTS_ENABLED !== 'true') return false;
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) return false;
  return !(process.env.PAYPAL_ENV === 'live' && DEMO_CATALOG);
}

export class PayPalError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function call<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(baseUrl() + path, { ...init, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new PayPalError(`PayPal ${path} answered ${res.status}`, res.status);
  return res.json() as Promise<T>;
}

async function accessToken() {
  const basic = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
  const { access_token } = await call<{ access_token: string }>('/v1/oauth2/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  return access_token;
}

async function authed<T>(path: string, body: unknown, requestId?: string) {
  return call<T>(path, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      'Content-Type': 'application/json',
      ...(requestId ? { 'PayPal-Request-Id': requestId } : {}),
    },
    body: JSON.stringify(body),
  });
}

export async function createPayPalOrder(order: Order) {
  const { id } = await authed<{ id: string }>('/v2/checkout/orders', {
    intent: 'CAPTURE',
    purchase_units: [{
      custom_id: order.id,
      amount: { currency_code: order.currency, value: centsToValue(order.totalCents) },
    }],
  }, `create-${order.id}`);
  return id;
}

export type PayPalCapture = { id: string; status: string; amount: { currency_code: string; value: string } };

export async function capturePayPalOrder(paypalOrderId: string, ourOrderId: string) {
  const res = await authed<{ purchase_units: { payments: { captures: PayPalCapture[] } }[] }>(
    `/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {}, `capture-${ourOrderId}`);
  const capture = res.purchase_units?.[0]?.payments?.captures?.[0];
  if (!capture) throw new PayPalError('PayPal capture response had no capture', 502);
  return capture;
}

export async function verifyWebhook(headers: Headers, event: unknown) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return false;
  const { verification_status } = await authed<{ verification_status: string }>('/v1/notifications/verify-webhook-signature', {
    auth_algo: headers.get('paypal-auth-algo'),
    cert_url: headers.get('paypal-cert-url'),
    transmission_id: headers.get('paypal-transmission-id'),
    transmission_sig: headers.get('paypal-transmission-sig'),
    transmission_time: headers.get('paypal-transmission-time'),
    webhook_id: webhookId,
    webhook_event: event,
  });
  return verification_status === 'SUCCESS';
}
