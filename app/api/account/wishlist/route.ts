import { z } from 'zod';
import { getCustomer } from '@/lib/server/customer';
import { json, readJson, sameOrigin } from '@/lib/server/http';
import { getStore } from '@/lib/server/store';

const schema = z.object({ items: z.array(z.string().min(1).max(100)).max(200) });

// The account comes from the session, so nobody can read or change another person's list.
export async function GET() {
  const customer = await getCustomer();
  if (!customer) return json({ signedIn: false });
  const items = await getStore()?.getWishlist(customer.id).catch(() => undefined);
  return json({ signedIn: true, items: items ?? [] });
}

export async function PUT(req: Request) {
  if (!sameOrigin(req)) return json({ error: 'Forbidden' }, 403);
  const customer = await getCustomer();
  if (!customer) return json({ error: 'Sign in first' }, 401);
  const body = await readJson(req);
  if (!body.ok) return body.response;
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return json({ error: 'Invalid list' }, 400);
  try {
    await getStore()?.setWishlist(customer.id, parsed.data.items);
    return json({ ok: true });
  } catch (e) {
    console.error('Could not save the wishlist', e);
    return json({ error: 'Could not save' }, 502);
  }
}
