import { cookies } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { findDoc } from '@/lib/admin-docs';
import { requireFullAdmin } from '@/lib/server/admin-auth';

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireFullAdmin();
  const doc = findDoc((await params).slug);
  if (!doc) notFound();
  const lang = (await cookies()).get('admin-lang')?.value === 'en' ? 'en' : 'es';
  const copy = doc[lang];
  return (
    <div data-raw className="docs-page">
      <Link className="text-link" href="/admin/docs">{lang === 'es' ? '← Toda la documentación' : '← All docs'}</Link>
      <div className="admin-head" style={{ marginTop: 12 }}>
        <div><h1>{copy.title}</h1><p className="admin-sub">{copy.summary}</p></div>
      </div>
      {copy.sections.map(([heading, items]) => (
        <section className="admin-card" key={heading}>
          <h2>{heading}</h2>
          <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
      ))}
    </div>
  );
}
