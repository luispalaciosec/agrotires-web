import type { Metadata } from 'next';
import { CheckoutView } from '@/components/account-views';
import { resolveLocale, type LocaleParams } from '@/lib/locale-params';

export async function generateMetadata(props: LocaleParams): Promise<Metadata> {
  const { t } = await resolveLocale(props);
  return { title: t.checkout.metaTitle, robots: { index: false, follow: false } };
}

export default function CheckoutPage() {
  return <CheckoutView />;
}
