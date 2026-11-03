import { z } from 'zod';
import { LOCALES } from '@/lib/i18n';
import { clientIp, json, rateLimited, readJson, sameOrigin } from '@/lib/server/http';
import { getStore } from '@/lib/server/store';

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional(),
  zip: z.string().trim().regex(/^\d{5}(-\d{4})?$/).optional().or(z.literal('')),
  topic: z.enum(['Product question', 'Freight shipping', 'Equipment compatibility', 'Bulk order', 'Something else']),
  product: z.string().trim().max(200).optional(),
  message: z.string().trim().min(1).max(5000),
  locale: z.enum(LOCALES).optional(),
  website: z.string().optional(), // honeypot: hidden from people, filled in by bots
});

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: 'Forbidden' }, 403);
  if (rateLimited(`quote:${clientIp(req)}`, 5)) return json({ error: 'Too many requests' }, 429);
  const store = getStore();
  if (!store) return json({ error: 'Quote requests are not available yet' }, 503);

  const body = await readJson(req);
  if (!body.ok) return body.response;
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return json({ error: 'Please check the form fields' }, 400);
  const { website, zip, ...quote } = parsed.data;
  if (website) return json({ ok: true }, 201);

  const saved = await store.saveQuote({ ...quote, deliveryZip: zip || undefined });
  return json({ ok: true, id: saved.id }, 201);
}
