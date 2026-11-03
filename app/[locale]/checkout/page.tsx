import type { Metadata } from 'next';
import { CheckoutView } from '@/components/account-views';
import { resolveLocale, type LocaleParams } from '@/lib/locale-params';
import { paymentsEnabled } from '@/lib/server/paypal';
import { getStore } from '@/lib/server/store';

export async function generateMetadata(props: LocaleParams): Promise<Metadata> {
  const { t } = await resolveLocale(props);
  return { title: t.checkout.metaTitle, robots: { index: false, follow: false } };
}

export default async function CheckoutPage() {
  // The client id is public; only it reaches the browser. Changing these settings takes a new deployment.
  const paypal = paymentsEnabled() && getStore() ? { clientId: process.env.PAYPAL_CLIENT_ID!, sandbox: process.env.PAYPAL_ENV !== 'live' } : undefined;
  // Only for the preview: the server calculates the tax again when the order is created.
  const rates = paypal ? await getStore()!.listTaxRates().catch(() => []) : [];
  return <CheckoutView paypal={paypal} taxRates={Object.fromEntries(rates.filter((r) => r.active).map((r) => [r.state, r.rateBps]))} />;
}
