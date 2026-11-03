'use client';

import { useStore } from '@/components/store';
import { EmptyState, PageHead } from '@/components/ui';

export default function NotFound() {
  const { t, locale } = useStore();
  const n = t.notFound;
  return (
    <main id="main-content">
      <PageHead locale={locale} title={n.title} desc={n.desc} crumbs={n.crumb} />
      <div className="content-narrow"><EmptyState locale={locale} title={n.emptyTitle} body={n.emptyBody} /></div>
    </main>
  );
}
