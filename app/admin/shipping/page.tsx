import { Icon } from '@/components/ui';
import { money } from '@/lib/catalog';
import { US_STATES } from '@/lib/tax';
import { requireAdmin } from '@/lib/server/admin-auth';
import { getStore } from '@/lib/server/store';
import { deleteShippingZoneAction } from '../actions';
import { ShippingZoneForm } from '../tools-forms';

export default async function ShippingPage() {
  await requireAdmin();
  const zones = await getStore()?.listShippingZones().catch(() => undefined);
  const covered = new Set(zones?.filter((z) => z.active).flatMap((z) => z.states));
  const missing = US_STATES.filter(([code]) => !covered.has(code)).map(([code]) => code);
  const usd = (cents: number) => money(cents / 100);
  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Shipping rates</h1>
          <p className="admin-sub">The rate for the delivery state is added at checkout: a base fee plus a price per pound.</p>
        </div>
      </div>
      {zones === undefined ? <div className="notice" style={{ marginBottom: 18 }}><Icon name="info" size="sm" /> Run the migration 0009_shipping_fitment_accounts.sql in Supabase to use this section.</div> : null}
      <div className="notice" style={{ marginBottom: 18 }}>
        <Icon name="info" size="sm" /> These are your own rates. Live UPS or FedEx prices need a carrier account or a service such as EasyPost. Freight products ask for a quote instead of a rate, and products with no weight only pay the base fee.
      </div>
      {zones?.length && missing.length ? <div className="notice" style={{ marginBottom: 18 }}><Icon name="info" size="sm" /> Customers in these states cannot check out and are sent to request a quote: {missing.join(', ')}.</div> : null}
      <div className="admin-grid two">
        <section className="admin-card">
          <h2>Zones</h2>
          <div className="admin-scroll">
            <table className="admin-table">
              <thead><tr><th>Zone</th><th>States</th><th>Base</th><th>Per lb</th><th>Free over</th><th /></tr></thead>
              <tbody>
                {zones?.map((z) => (
                  <tr key={z.id}>
                    <td>{z.name}{z.active ? null : <> <span className="admin-pill off">Off</span></>}</td>
                    <td>{z.states.join(', ')}</td>
                    <td>{usd(z.baseCents)}</td>
                    <td>{usd(z.perLbCents)}</td>
                    <td>{z.freeOverCents === undefined ? '—' : usd(z.freeOverCents)}</td>
                    <td><form action={deleteShippingZoneAction.bind(null, z.id)}><button className="text-link" type="submit">Delete</button></form></td>
                  </tr>
                ))}
                {zones?.length ? null : <tr><td colSpan={6} className="muted">No zones yet. While there are none, test checkouts add no shipping, and live payments are refused.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
        <section className="admin-card">
          <h2>Add a zone</h2>
          <ShippingZoneForm />
        </section>
      </div>
    </>
  );
}
