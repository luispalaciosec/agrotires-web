import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon, PageHead } from '@/components/ui';
import { localePath } from '@/lib/i18n';
import { resolveLocale, type LocaleParams } from '@/lib/locale-params';

export async function generateMetadata(props: LocaleParams): Promise<Metadata> {
  const { t } = await resolveLocale(props);
  return { title: t.setup.crumb, robots: { index: false, follow: false } };
}

const READY = [true, true, true, true, false, false, false, false, true, false, false];

export default async function SetupPage(props: LocaleParams) {
  const { locale, t } = await resolveLocale(props);
  const s = t.setup;
  return (
    <main id="main-content">
      <PageHead locale={locale} title={s.title} desc={s.desc} crumbs={s.crumb} />
      <div className="content-narrow">
        <div className="notice"><Icon name="info" size="sm" /> {s.notice}</div>
        <div className="setup-checks">
          {s.steps.map((x, i) => (
            <div className={`setup-check ${READY[i] ? '' : 'pending'}`} key={x}><Icon name={READY[i] ? 'check' : 'clock'} /><span>{x}</span><strong>{READY[i] ? s.ready : s.required}</strong></div>
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
