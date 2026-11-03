import { supabaseAuthClient, usesSupabaseAuth } from './admin-auth';

export type Customer = { id: string; email: string; name?: string; emailConfirmed: boolean };

// getUser checks with Supabase; the cookie alone could be forged. Undefined means signed out.
export async function getCustomer(): Promise<Customer | undefined> {
  if (!usesSupabaseAuth()) return undefined;
  try {
    const client = await supabaseAuthClient();
    const { data } = await client.auth.getUser();
    if (!data.user?.email) return undefined;
    return { id: data.user.id, email: data.user.email, name: data.user.user_metadata?.full_name, emailConfirmed: Boolean(data.user.email_confirmed_at) };
  } catch (e) {
    console.error('Could not read the customer session', e);
    return undefined;
  }
}

export const accountsEnabled = usesSupabaseAuth;
