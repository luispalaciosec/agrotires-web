import { createServerClient } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createToken, verifyPassword, verifyToken } from './password';

// Personal Supabase accounts with the staff or admin role. The shared password
// remains only for running the panel on a computer without Supabase.
const COOKIE = 'agrotires_admin';

export const usesSupabaseAuth = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
const passwordConfigured = () => Boolean(process.env.ADMIN_PASSWORD_HASH && (process.env.ADMIN_SESSION_SECRET || '').length >= 32);
export const adminConfigured = () => usesSupabaseAuth() || passwordConfigured();

async function authClient() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(list) {
        // Server components cannot set cookies; proxy.ts refreshes the session for them.
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {}
      },
    },
  });
}

async function hasStaffRole(client: Awaited<ReturnType<typeof authClient>>, userId: string) {
  const { data } = await client.from('profiles').select('role').eq('id', userId).maybeSingle();
  return data?.role === 'staff' || data?.role === 'admin';
}

export async function isAdmin() {
  if (usesSupabaseAuth()) {
    const client = await authClient();
    // getUser checks with Supabase; the cookie alone could be forged.
    const { data } = await client.auth.getUser();
    return data.user ? hasStaffRole(client, data.user.id) : false;
  }
  if (!passwordConfigured()) return false;
  return verifyToken((await cookies()).get(COOKIE)?.value, process.env.ADMIN_SESSION_SECRET!);
}

// Must run in every admin page and server action: layouts do not protect actions.
export async function requireAdmin() {
  if (!(await isAdmin())) redirect('/admin/login');
}

export async function logIn(email: string, password: string) {
  if (usesSupabaseAuth()) {
    const client = await authClient();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error || !data.user) return false;
    if (await hasStaffRole(client, data.user.id)) return true;
    await client.auth.signOut();
    return false;
  }
  if (!passwordConfigured() || !verifyPassword(password, process.env.ADMIN_PASSWORD_HASH!)) return false;
  const https = (await headers()).get('x-forwarded-proto') === 'https';
  (await cookies()).set(COOKIE, createToken(process.env.ADMIN_SESSION_SECRET!), { httpOnly: true, sameSite: 'strict', secure: https, path: '/', maxAge: 8 * 60 * 60 });
  return true;
}

export async function logOut() {
  if (usesSupabaseAuth()) await (await authClient()).auth.signOut();
  else (await cookies()).delete(COOKIE);
}
