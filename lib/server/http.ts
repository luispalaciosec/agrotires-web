const MAX_BODY = 20_000;
const hits = new Map<string, { count: number; reset: number }>();

export const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export const clientIp = (req: Request) => req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';

// Per server instance only; a shared limiter is needed once this runs on several instances.
export function rateLimited(key: string, limit: number, windowMs = 60_000) {
  const now = Date.now();
  const hit = hits.get(key);
  if (!hit || hit.reset < now) {
    hits.set(key, { count: 1, reset: now + windowMs });
    return false;
  }
  hit.count += 1;
  return hit.count > limit;
}

export function sameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).host === req.headers.get('host');
  } catch {
    return false;
  }
}

export async function readJson(req: Request): Promise<{ ok: true; data: unknown; raw: string } | { ok: false; response: Response }> {
  const raw = await req.text();
  if (raw.length > MAX_BODY) return { ok: false, response: json({ error: 'Request too large' }, 413) };
  try {
    return { ok: true, data: JSON.parse(raw), raw };
  } catch {
    return { ok: false, response: json({ error: 'Invalid JSON' }, 400) };
  }
}
