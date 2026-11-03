import { z } from 'zod';
import { LOCALES } from '@/lib/i18n';
import { clientIp, json, rateLimited, readJson, sameOrigin } from '@/lib/server/http';
import { verify } from '@/lib/server/signed';
import { getStore } from '@/lib/server/store';

const schema = z.object({
  order: z.string().min(1).max(64),
  product: z.string().min(1).max(100),
  sig: z.string().min(1).max(100),
  rating: z.number().int().min(1).max(5),
  author: z.string().trim().min(1).max(60),
  body: z.string().trim().min(10).max(2000),
  locale: z.enum(LOCALES).optional(),
});

// Only a link signed for a product of a real sold order gets here, and reviews wait for moderation.
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: 'Forbidden' }, 403);
  if (await rateLimited(`review:${clientIp(req)}`, 10)) return json({ error: 'Too many requests' }, 429);
  const store = getStore();
  if (!store) return json({ error: 'Not available' }, 503);
  const body = await readJson(req);
  if (!body.ok) return body.response;
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return json({ error: 'Invalid review' }, 400);
  const { order: orderId, product, sig, ...review } = parsed.data;
  if (!verify(sig, 'review', orderId, product)) return json({ error: 'Invalid link' }, 403);
  const order = await store.getOrder(orderId);
  if (!order || !['paid', 'fulfilled', 'on_terms'].includes(order.status) || !order.items.some((i) => i.productId === product)) return json({ error: 'Invalid link' }, 403);
  try {
    await store.saveReview({ ...review, orderId, productId: product });
  } catch {
    return json({ error: 'Already reviewed' }, 409);
  }
  return json({ ok: true }, 201);
}
