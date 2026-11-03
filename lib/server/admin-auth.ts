import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createToken, verifyPassword, verifyToken } from './password';

// One shared admin login for the testing stage. Personal accounts and roles
// (staff / admin) replace it when the database is connected.
const COOKIE = 'agrotires_admin';

export const adminConfigured = () => Boolean(process.env.ADMIN_PASSWORD_HASH && (process.env.ADMIN_SESSION_SECRET || '').length >= 32);

export async function isAdmin() {
  if (!adminConfigured()) return false;
  return verifyToken((await cookies()).get(COOKIE)?.value, process.env.ADMIN_SESSION_SECRET!);
}

// Must run in every admin page and server action: layouts do not protect actions.
export async function requireAdmin() {
  if (!(await isAdmin())) redirect('/admin/login');
}

export async function logIn(password: string) {
  if (!adminConfigured() || !verifyPassword(password, process.env.ADMIN_PASSWORD_HASH!)) return false;
  const https = (await headers()).get('x-forwarded-proto') === 'https';
  (await cookies()).set(COOKIE, createToken(process.env.ADMIN_SESSION_SECRET!), { httpOnly: true, sameSite: 'strict', secure: https, path: '/', maxAge: 8 * 60 * 60 });
  return true;
}

export async function logOut() {
  (await cookies()).delete(COOKIE);
}
