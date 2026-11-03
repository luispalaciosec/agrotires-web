import { z } from 'zod';
import { LOCALES } from '@/lib/i18n';
import { isUsState } from '@/lib/tax';
import { quoteOrder } from '@/lib/server/checkout';
import { clientIp, json, rateLimited, readJson, sameOrigin } from '@/lib/server/http';
import { CartError, cartSchema } from '@/lib/server/pricing';
import { approvedAccount, placeOnTerms } from '@/lib/server/sales';
import { getStore } from '@/lib/server/store';
import { getCustomer } from '@/lib/server/customer';

const schema = z.object({
  email: z.string().trim().email().max(200),
  address: z.object({ name: z.string().trim().min(1).max(120), line1: z.string().trim().min(1).max(200), line2: z.string().trim().max(200).optional().transform((v) => v || undefined), city: z.string().trim().min(1).max(120), state: z.string().refine(isUsState), postalCode: z.string().trim().regex(/^\d{5}(-\d{4})?$/) }),
  items: cartSchema,
  locale: z.enum(LOCALES).optional(),
});

// Net terms are only for accounts the business approved, decided here from the session.
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: 'Forbidden' }, 403);
  if (await rateLimited(`terms:${clientIp(req)}`, 10)) return json({ error: 'Too many requests' }, 429);
  const store = getStore();
  if (!store) return json({ error: 'Not available yet' }, 503);
  const account = await approvedAccount(store);
  if (!account || account.termsDays <= 0) return json({ error: 'Forbidden' }, 403);
  const body = await readJson(req);
  if (!body.ok) return body.response;
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return json({ error: 'Invalid order' }, 400);
  const { address: a } = parsed.data;
  try {
    const q = await quoteOrder(store, parsed.data.items, { state: a.state, zip: a.postalCode }, account);
    const customer = await getCustomer();
    const order = await store.createOrder({ email: parsed.data.email, items: q.items, subtotalCents: q.subtotalCents, shippingCents: q.shippingCents, taxCents: q.taxCents, totalCents: q.totalCents, currency: 'USD', locale: parsed.data.locale, shippingAddress: { ...a, country: 'US' }, profileId: customer?.id });
    const placed = await placeOnTerms(store, order, account);
    return json({ orderId: placed.id, status: placed.status }, 201);
  } catch (e) {
    if (e instanceof CartError) return json({ error: e.message, code: e.code }, 400);
    console.error('Order on terms failed', e);
    return json({ error: 'Could not place the order' }, 502);
  }
}
