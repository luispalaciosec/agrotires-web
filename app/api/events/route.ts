import { z } from 'zod';
import { LOCALES } from '@/lib/i18n';
import { clientIp, json, rateLimited, readJson, sameOrigin } from '@/lib/server/http';
import { cleanQuery } from '@/lib/server/operations';
import { getStore } from '@/lib/server/store';

const schema = z.object({
  name: z.enum(['view_product', 'add_to_cart', 'begin_checkout', 'purchase', 'search']),
  session: z.string().regex(/^[a-z0-9]{8,40}$/),
  productSlug: z.string().max(100).optional(),
  query: z.string().max(200).optional(),
  results: z.number().int().min(0).max(100000).optional(),
  locale: z.enum(LOCALES).optional(),
});

// Losing an event never matters to the customer, so this always answers quickly and quietly.
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: 'Forbidden' }, 403);
  if (await rateLimited(`events:${clientIp(req)}`, 120)) return json({ ok: false }, 429);
  const body = await readJson(req);
  if (!body.ok) return body.response;
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return json({ ok: false }, 400);
  await getStore()?.addEvent({ ...parsed.data, query: cleanQuery(parsed.data.query) }).catch((e) => console.error('Could not save event', e));
  return json({ ok: true });
}
