import { json } from '@/lib/server/http';
import { SupabaseStore, supabaseConfigured } from '@/lib/server/supabase-store';

export const dynamic = 'force-dynamic';

// Reports only whether the setup works: no keys, no customer data, no error details.
export async function GET() {
  if (!supabaseConfigured()) return json({ database: 'not_configured' });
  try {
    return json(await new SupabaseStore().check());
  } catch {
    return json({ database: 'error' });
  }
}
