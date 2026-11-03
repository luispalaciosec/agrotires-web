import Link from 'next/link';
import { Icon } from '@/components/ui';
import { EMAIL_TEMPLATES } from '@/lib/email-templates';
import { requireAdmin } from '@/lib/server/admin-auth';
import { emailEnabled } from '@/lib/server/email';
import { getStore } from '@/lib/server/store';

const STAGES = [...new Set(EMAIL_TEMPLATES.map((t) => t.stage))];

export default async function EmailsPage() {
  await requireAdmin();
  const saved = await getStore()?.listEmailTemplates().catch(() => undefined);
  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Emails</h1>
          <p className="admin-sub">Every message the store sends, in the order a customer meets them.</p>
        </div>
        <span className={`admin-pill ${emailEnabled() ? '' : 'warn'}`}>{emailEnabled() ? 'Sending is on' : 'Sending is off: mailbox not connected'}</span>
      </div>
      {saved === undefined ? <div className="notice" style={{ marginBottom: 18 }}><Icon name="info" size="sm" /> Run the migration 0008_admin_tools.sql in Supabase to save changes. The original texts keep working meanwhile.</div> : null}
      <div className="journey">
        {STAGES.map((stage) => (
          <section className="journey-stage" key={stage}>
            <h2>{stage}</h2>
            <div className="journey-cards">
              {EMAIL_TEMPLATES.filter((t) => t.stage === stage).map((t) => {
                const edit = saved?.find((s) => s.key === t.key);
                const state = t.pendingNote ? ['Not sent yet', 'off'] : edit && !edit.enabled ? ['Turned off', 'bad'] : edit ? ['Edited', ''] : ['Original text', 'off'];
                return (
                  <Link className="journey-card" href={`/admin/emails/${t.key}`} key={t.key}>
                    <span className="journey-icon"><Icon name={t.audience === 'team' ? 'user' : 'mail'} size="sm" /></span>
                    <strong>{t.name}</strong>
                    <small>{t.when}</small>
                    <span className="journey-foot"><span className={`admin-pill ${state[1]}`}>{state[0]}</span><small>{t.audience === 'team' ? 'To the team' : 'To the customer'}</small></span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
