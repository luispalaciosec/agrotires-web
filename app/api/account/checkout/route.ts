import { getCustomer } from '@/lib/server/customer';
import { json } from '@/lib/server/http';
import { getStore } from '@/lib/server/store';

// Prefills the checkout for a signed-in customer. Only their own data, and never cached.
export async function GET() {
  const customer = await getCustomer();
  if (!customer) return json({ signedIn: false });
  const addresses = await getStore()?.listAddresses(customer.id).catch(() => []);
  return json({ signedIn: true, email: customer.email, name: customer.name, addresses: addresses ?? [] });
}
