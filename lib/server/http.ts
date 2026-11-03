import { createHash } from 'node:crypto';
import { hitSharedRateLimit, supabaseConfigured } from './supabase-store';

const MAX_BODY = 20_000;
const hits = new Map<string, { count: number; reset: number }>();

export const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export const clientIp = (req: Request) => req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';

let sharedLimitWarned = false;

// Counted in the database so every server instance sees the same attempts. If it cannot answer,
// each instance still limits on its own rather than leaving the forms open or blocking customers.
export async function rateLimited(key: string, limit: number, windowMs = 60_000) {
  if (supabaseConfigured()) {
    try {
      return await hitSharedRateLimit(createHash('sha256').update(key).digest('hex'), limit, windowMs);
    } catch (e) {
      if (!sharedLimitWarned) console.error('Shared rate limit unavailable', e);
      sharedLimitWarned = true;
    }
  }
  return localRateLimited(key, limit, windowMs);
}

function localRateLimited(key: string, limit: number, windowMs: number) {
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
