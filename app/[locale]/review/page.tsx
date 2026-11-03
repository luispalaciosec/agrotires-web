import type { Metadata } from 'next';
import { ReviewForm } from '@/components/sales-views';
import { PageHead } from '@/components/ui';
import { resolveLocale, type LocaleParams } from '@/lib/locale-params';
import { verify } from '@/lib/server/signed';
import { getStore } from '@/lib/server/store';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function ReviewPage(props: LocaleParams & { searchParams: Promise<{ order?: string; product?: string; sig?: string }> }) {
  const { locale, t } = await resolveLocale(props);
  const { order: orderId = '', product = '', sig = '' } = await props.searchParams;
  const s = t.sales;
  const order = verify(sig, 'review', orderId, product) ? await getStore()?.getOrder(orderId).catch(() => undefined) : undefined;
  const item = order?.items.find((i) => i.productId === product);
  return (
    <main id="main-content">
      <PageHead locale={locale} title={s.reviewTitle} desc={item?.name ?? ''} crumbs={s.reviewTitle} />
      <div className="content-narrow auth-page">
        {item ? <ReviewForm order={orderId} product={product} sig={sig} /> : <div className="notice" role="alert">{s.reviewBadLink}</div>}
      </div>
    </main>
  );
}
