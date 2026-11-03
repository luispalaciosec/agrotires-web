import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Icon } from '@/components/ui';
import { templateDef } from '@/lib/email-templates';
import { requireAdmin } from '@/lib/server/admin-auth';
import { emailEnabled } from '@/lib/server/email';
import { getStore } from '@/lib/server/store';
import { EmailEditor } from '../../tools-forms';

export default async function EmailPage({ params }: { params: Promise<{ key: string }> }) {
  await requireAdmin();
  const { key } = await params;
  const def = templateDef(key);
  if (!def) notFound();
  const saved = (await getStore()?.listEmailTemplates().catch(() => undefined))?.find((t) => t.key === def.key);
  return (
    <>
      <div className="admin-head">
        <div>
          <Link className="admin-back" href="/admin/emails"><Icon name="right" size="xs" /> All emails</Link>
          <h1>{def.name}</h1>
          <p className="admin-sub">Sent when: {def.when.toLowerCase()}. {def.audience === 'team' ? 'Goes to the AGROTIRES team.' : 'Goes to the customer, in the language they used.'}</p>
        </div>
      </div>
      {def.pendingNote ? <div className="notice" style={{ marginBottom: 18 }}><Icon name="info" size="sm" /> {def.pendingNote}</div> : null}
      <EmailEditor key={def.key} def={def} saved={saved} canSend={emailEnabled()} />
    </>
  );
}
