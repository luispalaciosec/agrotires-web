import { emailEnabled } from '@/lib/server/email';
import { json } from '@/lib/server/http';
import { paymentsEnabled } from '@/lib/server/paypal';
import { SupabaseStore, supabaseConfigured } from '@/lib/server/supabase-store';

export const dynamic = 'force-dynamic';

// Reports only whether the setup works: no keys, no customer data, no error details.
export async function GET() {
  const services = { email: emailEnabled(), payments: paymentsEnabled() };
  if (!supabaseConfigured()) return json({ database: 'not_configured', ...services });
  try {
    return json({ ...(await new SupabaseStore().check()), ...services });
  } catch {
    return json({ database: 'error', ...services });
  }
}
