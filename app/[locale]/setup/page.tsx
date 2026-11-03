import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon, PageHead } from '@/components/ui';
import { DEMO_CATALOG } from '@/lib/catalog';
import { localePath } from '@/lib/i18n';
import { resolveLocale, type LocaleParams } from '@/lib/locale-params';
import { accountsEnabled } from '@/lib/server/customer';
import { emailEnabled } from '@/lib/server/email';
import { paymentsEnabled } from '@/lib/server/paypal';
import { getStore } from '@/lib/server/store';

// Reads the store's real state on each visit, so nothing here can go stale.
export const dynamic = 'force-dynamic';

export async function generateMetadata(props: LocaleParams): Promise<Metadata> {
  const { t } = await resolveLocale(props);
  return { title: t.setup.crumb, robots: { index: false, follow: false } };
}

export default async function SetupPage(props: LocaleParams) {
  const { locale, t } = await resolveLocale(props);
  const s = t.setup;
  const store = getStore();
  const [rates, zones] = await Promise.all([store?.listTaxRates().catch(() => []) ?? [], store?.listShippingZones().catch(() => []) ?? []]);
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? '';

  // done: finished. built: works, and waits for the data or access listed. pending: not started.
  const status: Record<string, 'done' | 'built' | 'pending'> = {
    brand: 'done',
    store: 'done',
    cart: 'done',
    finder: store ? 'done' : 'built',
    catalog: DEMO_CATALOG ? 'pending' : 'done',
    accounts: accountsEnabled() ? 'built' : 'pending',
    payments: paymentsEnabled() && process.env.PAYPAL_ENV === 'live' ? 'done' : 'built',
    tax: rates.some((r) => r.active) ? 'built' : 'pending',
    shipping: zones.some((z) => z.active) ? 'built' : 'pending',
    email: emailEnabled() ? 'done' : 'built',
    domain: site.includes('agrotiresusa.com') ? 'done' : 'pending',
    legal: process.env.BUSINESS_POSTAL_ADDRESS?.trim() ? 'built' : 'pending',
    tests: 'pending',
  };
  const labels = { done: s.ready, built: s.built, pending: s.required };

  return (
    <main id="main-content">
      <PageHead locale={locale} title={s.title} desc={s.desc} crumbs={s.crumb} />
      <div className="content-narrow">
        <div className="notice"><Icon name="info" size="sm" /> {s.notice}</div>
        <div className="setup-checks">
          {s.items.map(({ id, label, needs }) => (
            <div className={`setup-check ${status[id] === 'done' ? '' : 'pending'}`} key={id}>
              <Icon name={status[id] === 'done' ? 'check' : 'clock'} />
              <span>{label}{needs && status[id] !== 'done' ? <small className="setup-needs">{needs}</small> : null}</span>
              <strong>{labels[status[id]]}</strong>
            </div>
          ))}
        </div>
        <h2>{s.arch}</h2>
        <p><strong>{s.a1}</strong>{s.a1b}</p>
        <p><strong>{s.a2}</strong>{s.a2b}</p>
        <p><strong>{s.a3}</strong>{s.a3b}<strong>{s.a4}</strong>{s.a4b}<strong>{s.a5}</strong>{s.a5b}</p>
        <Link href={localePath(locale, '/shop')} className="btn">{s.btn} <Icon name="arrow" size="sm" /></Link>
      </div>
    </main>
  );
}
