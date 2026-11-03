import { cookies } from 'next/headers';
import { requireFullAdmin } from '@/lib/server/admin-auth';
import { emailEnabled } from '@/lib/server/email';
import { paymentsEnabled } from '@/lib/server/paypal';
import { remindersEnabled } from '@/lib/server/reminders';
import { DocsLibrary } from './library';

export default async function DocsPage() {
  await requireFullAdmin();
  const lang = (await cookies()).get('admin-lang')?.value === 'en' ? 'en' : 'es';
  const es = lang === 'es';
  const status: [string, boolean][] = [
    [es ? 'Pagos con PayPal' : 'PayPal payments', paymentsEnabled()],
    [es ? 'Correo' : 'Email', emailEnabled()],
    [es ? 'Recordatorios' : 'Reminders', remindersEnabled()],
  ];
  return (
    <div data-raw>
      <div className="admin-head">
        <div>
          <h1>{es ? 'Documentación' : 'Docs'}</h1>
          <p className="admin-sub">{es ? 'Todo lo construido en la tienda y cómo usarlo. Solo para administradores.' : 'Everything built in the store and how to use it. Administrators only.'}</p>
        </div>
      </div>
      <div className="docs-status">
        {status.map(([label, on]) => <span key={label} className={`admin-pill ${on ? '' : 'off'}`}>{label}: {on ? (es ? 'encendido' : 'on') : (es ? 'apagado' : 'off')}</span>)}
      </div>
      <DocsLibrary lang={lang} />
    </div>
  );
}
