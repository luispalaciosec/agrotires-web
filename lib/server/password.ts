import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

const sign = (expires: string, secret: string) => createHmac('sha256', secret).update(expires).digest('hex');

export const createToken = (secret: string, now = Date.now(), ttlMs = 8 * 60 * 60 * 1000) => {
  const expires = String(now + ttlMs);
  return `${expires}.${sign(expires, secret)}`;
};

export function verifyToken(token: string | undefined, secret: string, now = Date.now()) {
  if (!token) return false;
  const [expires, signature] = token.split('.');
  if (!expires || !signature || Number(expires) < now) return false;
  const expected = Buffer.from(sign(expires, secret));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
