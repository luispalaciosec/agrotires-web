import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PasswordForm } from '@/components/account-forms';
import { PageHead } from '@/components/ui';
import { localePath } from '@/lib/i18n';
import { resolveLocale, type LocaleParams } from '@/lib/locale-params';
import { getCustomer } from '@/lib/server/customer';

export const dynamic = 'force-dynamic';

export async function generateMetadata(props: LocaleParams): Promise<Metadata> {
  const { t } = await resolveLocale(props);
  return { title: t.auth.changePassword, robots: { index: false, follow: false } };
}

export default async function PasswordPage(props: LocaleParams) {
  const { locale, t } = await resolveLocale(props);
  if (!(await getCustomer())) redirect(localePath(locale, '/account'));
  return (
    <main id="main-content">
      <PageHead locale={locale} title={t.auth.changePassword} desc={t.auth.changeDesc} crumbs={t.account.crumb} />
      <div className="content-narrow auth-page"><PasswordForm /></div>
    </main>
  );
}
