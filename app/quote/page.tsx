import type { Metadata } from 'next';
import { QuoteView } from '@/components/account-views';
import { PageHead } from '@/components/ui';

export const metadata: Metadata = { title: 'Request a quote', description: 'Prepare a product question or freight inquiry.', alternates: { canonical: '/quote' } };

export default function QuotePage() {
  return (
    <main id="main-content">
      <PageHead title="Let’s find your solution." desc="Prepare a product question or freight inquiry. This demo stores submissions locally in your browser only." crumbs="Request a quote" />
      <QuoteView />
    </main>
  );
}
