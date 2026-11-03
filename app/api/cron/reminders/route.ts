import { timingSafeEqual } from 'node:crypto';
import { json } from '@/lib/server/http';
import { runReminders } from '@/lib/server/reminders';
import { getStore } from '@/lib/server/store';

// Called once a day by Vercel, which sends the secret set in CRON_SECRET.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const got = Buffer.from(req.headers.get('authorization') ?? '');
  const want = Buffer.from(`Bearer ${secret}`);
  if (!secret || got.length !== want.length || !timingSafeEqual(got, want)) return json({ error: 'Forbidden' }, 403);
  const store = getStore();
  if (!store) return json({ error: 'Not available' }, 503);
  try {
    return json(await runReminders(store));
  } catch (e) {
    console.error('Reminders failed', e);
    return json({ error: 'Reminders failed' }, 500);
  }
}
