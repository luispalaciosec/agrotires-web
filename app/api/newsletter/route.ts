import { z } from 'zod';
import { LOCALES } from '@/lib/i18n';
import { clientIp, json, rateLimited, readJson, sameOrigin } from '@/lib/server/http';
import { getStore } from '@/lib/server/store';

const schema = z.object({ email: z.string().trim().email().max(200), locale: z.enum(LOCALES).optional(), website: z.string().optional() });

// Nothing proves who typed the address, so an earlier opt out always stays in force.
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: 'Forbidden' }, 403);
  if (await rateLimited(`newsletter:${clientIp(req)}`, 5)) return json({ error: 'Too many requests' }, 429);
  const store = getStore();
  if (!store) return json({ error: 'Not available yet' }, 503);
  const body = await readJson(req);
  if (!body.ok) return body.response;
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return json({ error: 'Invalid email' }, 400);
  // Filled in only by bots. They get the same answer, and nothing is stored.
  if (parsed.data.website) return json({ ok: true }, 201);
  try {
    await store.addSubscriber(parsed.data.email, parsed.data.locale ?? 'en');
    return json({ ok: true }, 201);
  } catch (e) {
    console.error('Newsletter signup failed', e);
    return json({ error: 'Could not save' }, 502);
  }
}
