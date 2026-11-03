import type { Metadata } from 'next';
import { CheckoutView } from '@/components/account-views';

export const metadata: Metadata = { title: 'Checkout', robots: { index: false, follow: false } };

export default function CheckoutPage() {
  return <CheckoutView />;
}
