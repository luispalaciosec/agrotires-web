import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { orderShippedMail } from '@/lib/server/email';
import { rateLimited } from '@/lib/server/http';
import type { Order } from '@/lib/server/store';

const SUPABASE = { NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'p', SUPABASE_SECRET_KEY: 's' };
let n = 0;

describe('shared rate limit', () => {
  beforeEach(() => {
    Object.assign(process.env, SUPABASE);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    for (const k of Object.keys(SUPABASE)) delete process.env[k];
  });

  it('asks the database, with the address hashed', async () => {
    const calls: { url: string; body: { p_key: string; p_limit: number; p_window_ms: number } }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url: String(url), body: JSON.parse(String(init.body)) });
      return Response.json(true);
    }));
    expect(await rateLimited('quote:10.1.2.3', 5, 1000)).toBe(true);
    expect(calls[0].url).toContain('/rpc/hit_rate_limit');
    expect(calls[0].body).toMatchObject({ p_limit: 5, p_window_ms: 1000 });
    expect(calls[0].body.p_key).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(calls[0])).not.toContain('10.1.2.3');
  });

  it('keeps limiting on this server if the database cannot answer', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ message: 'function not found' }, { status: 404 })));
    const key = `quote:fallback-${++n}`;
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await rateLimited(key, 2));
    spy.mockRestore();
    expect(results).toEqual([false, false, true, true]);
  });
});

describe('shipped email', () => {
  const order = { id: 'abcdef12-0', email: 'a@b.test', status: 'fulfilled', items: [{ productId: 'p', sku: 'S', name: 'Tire', unitPriceCents: 100, quantity: 2 }], subtotalCents: 200, shippingCents: 0, taxCents: 0, totalCents: 200, currency: 'USD', createdAt: 'now', locale: 'es' } satisfies Order;

  it('tells the customer in their language, promising no date', () => {
    const es = orderShippedMail(order);
    expect(es).toMatchObject({ to: 'a@b.test', subject: '[TEST] Tu pedido fue despachado: ABCDEF12' });
    expect(es.text).toContain('2 x Tire');
    expect(orderShippedMail({ ...order, locale: 'en' }).subject).toBe('[TEST] Your order has been dispatched: ABCDEF12');
  });
});
