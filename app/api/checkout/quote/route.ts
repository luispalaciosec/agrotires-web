import { z } from 'zod';
import { isUsState } from '@/lib/tax';
import { quoteOrder } from '@/lib/server/checkout';
import { clientIp, json, rateLimited, readJson, sameOrigin } from '@/lib/server/http';
import { CartError, cartSchema } from '@/lib/server/pricing';
import { approvedAccount } from '@/lib/server/sales';
import { getStore } from '@/lib/server/store';

const schema = z.object({ items: cartSchema, state: z.string().refine(isUsState), zip: z.string().trim().regex(/^\d{5}(-\d{4})?$/).optional().or(z.literal('')) });

// What the customer would pay for this cart and destination, before creating anything.
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: 'Forbidden' }, 403);
  if (await rateLimited(`quote-total:${clientIp(req)}`, 60)) return json({ error: 'Too many requests' }, 429);
  const store = getStore();
  if (!store) return json({ error: 'Not available yet' }, 503);
  const body = await readJson(req);
  if (!body.ok) return body.response;
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return json({ error: 'Invalid request' }, 400);
  try {
    const q = await quoteOrder(store, parsed.data.items, { state: parsed.data.state, zip: parsed.data.zip || undefined }, await approvedAccount(store));
    return json({ subtotalCents: q.subtotalCents, shippingCents: q.shippingCents, taxCents: q.taxCents, totalCents: q.totalCents });
  } catch (e) {
    if (e instanceof CartError) return json({ error: e.message, code: e.code }, 400);
    console.error('Checkout quote failed', e);
    return json({ error: 'Could not calculate' }, 502);
  }
}
