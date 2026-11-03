import { requireFullAdmin } from '@/lib/server/admin-auth';
import { csvResponse } from '@/lib/server/csv';
import { getStore } from '@/lib/server/store';

// People who opted out are left out, so a campaign tool never receives them.
export async function GET() {
  await requireFullAdmin();
  const list = (await getStore()?.listSubscribers()) ?? [];
  return csvResponse('agrotires-newsletter.csv', [['email', 'language', 'signed_up'], ...list.map((s) => [s.email, s.locale, s.createdAt])]);
}
