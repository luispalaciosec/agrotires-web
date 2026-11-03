import { NextResponse } from 'next/server';
import { supabaseAuthClient, usesSupabaseAuth } from '@/lib/server/admin-auth';
import { greetOnce } from '@/lib/server/account';

const SAFE_NEXT = /^\/(es\/)?account(\/password)?$/;

// Where Supabase's confirmation and password emails land. Only known pages can be the destination.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const asked = url.searchParams.get('next') ?? '/account';
  const next = SAFE_NEXT.test(asked) ? asked : '/account';
  const code = url.searchParams.get('code');
  if (code && usesSupabaseAuth()) {
    const client = await supabaseAuthClient();
    const { data, error } = await client.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      await greetOnce(data.user, next.startsWith('/es') ? 'es' : 'en');
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }
  return NextResponse.redirect(new URL(`${next.startsWith('/es') ? '/es' : ''}/account?auth=failed`, url.origin));
}
