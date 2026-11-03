import { z } from 'zod';
import { clientIp, json, rateLimited, readJson, sameOrigin } from '@/lib/server/http';
import { requestReturn } from '@/lib/server/operations';
import { verify } from '@/lib/server/signed';
import { getStore } from '@/lib/server/store';

const schema = z.object({
  order: z.string().min(1).max(64),
  sig: z.string().min(1).max(100),
  items: z.array(z.object({ sku: z.string().min(1).max(100), quantity: z.number().int().min(1).max(9999) })).min(1).max(50),
  reason: z.enum(['damaged', 'wrong_item', 'not_compatible', 'not_needed', 'other']),
  note: z.string().trim().max(2000).optional(),
});

// The signed link is what proves this is the buyer, with or without an account.
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: 'Forbidden' }, 403);
  if (await rateLimited(`returns:${clientIp(req)}`, 10)) return json({ error: 'Too many requests' }, 429);
  const store = getStore();
  if (!store) return json({ error: 'Not available' }, 503);
  const body = await readJson(req);
  if (!body.ok) return body.response;
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return json({ error: 'invalid' }, 400);
  const { order: orderId, sig, ...input } = parsed.data;
  if (!verify(sig, 'return', orderId)) return json({ error: 'Invalid link' }, 403);
  const order = await store.getOrder(orderId);
  if (!order) return json({ error: 'Invalid link' }, 403);
  try {
    const result = await requestReturn(store, order, input);
    return result.ok ? json({ ok: true }, 201) : json({ error: result.error }, result.error === 'invalid' ? 400 : 409);
  } catch (e) {
    console.error('Return request failed', e);
    return json({ error: 'failed' }, 502);
  }
}
