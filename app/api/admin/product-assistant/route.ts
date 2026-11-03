import { z } from 'zod';
import { isAdmin } from '@/lib/server/admin-auth';
import { clientIp, json, rateLimited, sameOrigin } from '@/lib/server/http';
import { detectPhotoType } from '@/lib/server/photo-upload';
import { askAssistant, assistantEnabled } from '@/lib/server/product-assistant';

// Shrunk in the browser first; a photo stays well under this.
const MAX_BODY = 4_000_000;

const schema = z.object({
  turns: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(6000) })).min(1).max(60),
  draft: z.record(z.string(), z.string().max(8000)),
  lang: z.enum(['es', 'en']),
  image: z.string().max(MAX_BODY).optional(),
});

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: 'Forbidden' }, 403);
  if (!(await isAdmin())) return json({ error: 'Sign in first' }, 401);
  if (!assistantEnabled()) return json({ error: 'off' }, 503);
  if (await rateLimited(`assistant:${clientIp(req)}`, 60, 60 * 60_000)) return json({ error: 'busy' }, 429);
  const raw = await req.text();
  if (raw.length > MAX_BODY) return json({ error: 'too_large' }, 413);
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: 'failed' }, 400);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success || parsed.data.turns.at(-1)?.role !== 'user') return json({ error: 'failed' }, 400);
  let image;
  if (parsed.data.image) {
    // Decided from the bytes themselves, as with product photos.
    const mediaType = detectPhotoType(new Uint8Array(Buffer.from(parsed.data.image, 'base64')));
    if (!mediaType) return json({ error: 'bad_image' }, 400);
    image = { mediaType, data: parsed.data.image };
  }
  const result = await askAssistant(parsed.data.turns, parsed.data.draft, parsed.data.lang, image);
  return result.ok ? json({ reply: result.reply, fields: result.fields }) : json({ error: result.error }, result.error === 'busy' ? 429 : 502);
}
