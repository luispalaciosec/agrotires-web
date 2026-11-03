import type { Metadata } from 'next';
import Link from 'next/link';
import { AddressForm, AuthForms, BuyAgain } from '@/components/account-forms';
import { Icon, PageHead } from '@/components/ui';
import { money } from '@/lib/catalog';
import { LOCALE_TAGS, localePath } from '@/lib/i18n';
import { resolveLocale, type LocaleParams } from '@/lib/locale-params';
import { accountsEnabled, getCustomer } from '@/lib/server/customer';
import { orderRef } from '@/lib/server/email';
import { getStore } from '@/lib/server/store';
import { deleteAddressAction, signOutAction } from './actions';

export const dynamic = 'force-dynamic';

export async function generateMetadata(props: LocaleParams): Promise<Metadata> {
  const { t } = await resolveLocale(props);
  return { title: t.account.crumb, robots: { index: false, follow: true } };
}

export default async function AccountPage(props: LocaleParams & { searchParams: Promise<{ auth?: string }> }) {
  const { locale, t } = await resolveLocale(props);
  const a = t.account;
  const u = t.auth;
  const customer = await getCustomer();

  if (!customer && !accountsEnabled()) {
    return (
      <main id="main-content">
        <PageHead locale={locale} title={a.title} desc={a.desc} crumbs={a.crumb} />
        <div className="content-narrow">
          <div className="notice"><Icon name="lock" size="sm" /> {a.notice}</div>
          <div className="simple-cards">
            <div className="simple-card"><Icon name="box" size="lg" /><h3>{a.c1}</h3><p>{a.c1b}</p></div>
            <div className="simple-card"><Icon name="heart" size="lg" /><h3>{a.c2}</h3><p>{a.c2b}</p><Link href={localePath(locale, '/wishlist')} className="text-link">{a.c2c} <Icon name="arrow" size="sm" /></Link></div>
            <div className="simple-card"><Icon name="settings" size="lg" /><h3>{a.c3}</h3><p>{a.c3b}</p></div>
          </div>
          <div style={{ marginTop: 29 }}><Link className="btn" href={localePath(locale, '/setup')}>{a.btn} <Icon name="arrow" size="sm" /></Link></div>
        </div>
      </main>
    );
  }

  if (!customer) {
    const { auth } = await props.searchParams;
    return (
      <main id="main-content">
        <PageHead locale={locale} title={u.title} desc={u.desc} crumbs={a.crumb} />
        <div className="content-narrow auth-page">
          {auth === 'failed' ? <div className="notice" role="alert"><Icon name="info" size="sm" /> {u.linkFailed}</div> : null}
          <AuthForms />
          <p className="fine-print">{u.guestNote}</p>
        </div>
      </main>
    );
  }

  const store = getStore();
  const [orders, addresses] = await Promise.all([
    store?.listCustomerOrders(customer.id, customer.emailConfirmed ? customer.email : undefined).catch(() => []) ?? [],
    store?.listAddresses(customer.id).catch(() => []) ?? [],
  ]);
  const shipments = await Promise.all(orders.map((o) => store?.getShipmentByOrder(o.id).catch(() => undefined)));
  const date = (iso: string) => new Date(iso).toLocaleDateString(LOCALE_TAGS[locale], { dateStyle: 'medium' });

  return (
    <main id="main-content">
      <PageHead locale={locale} title={u.hello(customer.name || customer.email)} desc={customer.email} crumbs={a.crumb} />
      <div className="content-narrow account-page">
        <section className="form-card">
          <h2>{u.ordersTitle}</h2>
          {orders.length ? (
            <ul className="account-orders">
              {orders.map((o, i) => {
                const shipment = shipments[i];
                return (
                  <li key={o.id}>
                    <div className="account-order-head">
                      <strong>{orderRef(o.id)}</strong>
                      <span>{date(o.createdAt)}</span>
                      <span className="account-status">{u.statuses[o.status]}</span>
                      <strong>{money(o.totalCents / 100)}</strong>
                    </div>
                    <p>{o.items.map((item) => `${item.quantity} x ${item.name}`).join(', ')}</p>
                    <div className="account-order-actions">
                      {shipment ? <Link className="btn btn-light" href={`${localePath(locale, '/track')}?code=${shipment.code}`}>{u.track} <Icon name="truck" size="sm" /></Link> : null}
                      <BuyAgain items={o.items.map((item) => ({ id: item.productId, quantity: item.quantity }))} />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : <p>{u.noOrders}</p>}
        </section>

        <section className="form-card">
          <h2>{u.addressesTitle}</h2>
          {addresses.length ? (
            <ul className="account-addresses">
              {addresses.map((ad) => (
                <li key={ad.id}>
                  <address>{ad.recipient}<br />{ad.line1}{ad.line2 ? <><br />{ad.line2}</> : null}<br />{ad.city}, {ad.state} {ad.postalCode}</address>
                  <form action={deleteAddressAction.bind(null, locale, ad.id)}><button className="text-link" type="submit">{u.remove}</button></form>
                </li>
              ))}
            </ul>
          ) : <p>{u.noAddresses}</p>}
          <AddressForm />
        </section>

        <form action={signOutAction.bind(null, locale)}><button className="btn btn-light" type="submit">{u.signOut}</button></form>
      </div>
    </main>
  );
}
