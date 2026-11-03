import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

// Links in emails prove themselves with a signature, so they need no login and cannot be guessed.
const key = () => {
  const secret = process.env.LINK_SECRET || process.env.SUPABASE_SECRET_KEY || process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error('No secret available to sign links');
  return createHmac('sha256', secret).update('agrotires-links').digest();
};

export const sign = (...parts: string[]) => createHmac('sha256', key()).update(parts.join('\n')).digest('base64url');

export function verify(signature: string | undefined | null, ...parts: string[]) {
  if (!signature) return false;
  const a = Buffer.from(signature);
  const b = Buffer.from(sign(...parts));
  return a.length === b.length && timingSafeEqual(a, b);
}

export const newToken = () => randomBytes(24).toString('base64url');
