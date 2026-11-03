import type { Metadata } from 'next';
import { WishlistItems } from '@/components/account-views';
import { PageHead } from '@/components/ui';

export const metadata: Metadata = { title: 'Wishlist', robots: { index: false, follow: true } };

export default function WishlistPage() {
  return (
    <main id="main-content">
      <PageHead title="Your saved products." desc="Keep interesting items close as you explore our demonstration catalog." crumbs="Wishlist" />
      <div className="container section"><WishlistItems /></div>
    </main>
  );
}
