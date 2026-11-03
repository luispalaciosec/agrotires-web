import { clientIp, json, rateLimited, readJson } from '@/lib/server/http';
import { verify } from '@/lib/server/signed';
import { getStore } from '@/lib/server/store';

// Also receives one-click requests from mail apps, which send a form instead of JSON and no Origin.
export async function POST(req: Request) {
  if (await rateLimited(`unsubscribe:${clientIp(req)}`, 30)) return json({ error: 'Too many requests' }, 429);
  const url = new URL(req.url);
  let email = url.searchParams.get('e');
  let sig = url.searchParams.get('s');
  if (!email && req.headers.get('content-type')?.includes('json')) {
    const body = await readJson(req);
    if (!body.ok) return body.response;
    ({ e: email, s: sig } = body.data as { e?: string; s?: string } as { e: string | null; s: string | null });
  }
  if (!email || !verify(sig, 'unsubscribe', email.toLowerCase())) return json({ error: 'Invalid link' }, 400);
  const store = getStore();
  if (!store) return json({ error: 'Not available' }, 503);
  await store.optOut(email);
  return json({ ok: true });
}
