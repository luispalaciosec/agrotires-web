'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ADMIN_DOCS, DOC_GROUPS, type DocLang } from '@/lib/admin-docs';

const fold = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function DocsLibrary({ lang }: { lang: DocLang }) {
  const [query, setQuery] = useState('');
  const wanted = fold(query.trim());
  const found = ADMIN_DOCS.filter((d) => !wanted || fold(JSON.stringify(d[lang])).includes(wanted));
  return (
    <>
      <input className="text-input docs-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={lang === 'es' ? 'Buscar en la documentación…' : 'Search the docs…'} aria-label={lang === 'es' ? 'Buscar en la documentación' : 'Search the docs'} />
      {Object.entries(DOC_GROUPS).map(([key, group]) => {
        const docs = found.filter((d) => d.group === key);
        if (!docs.length) return null;
        return (
          <section key={key} className="docs-group">
            <h2>{group[lang]}</h2>
            <div className="docs-grid">
              {docs.map((d) => <Link key={d.slug} className="docs-card" href={`/admin/docs/${d.slug}`}><strong>{d[lang].title}</strong><span>{d[lang].summary}</span></Link>)}
            </div>
          </section>
        );
      })}
      {found.length ? null : <p className="muted">{lang === 'es' ? 'No hay resultados.' : 'No results.'}</p>}
    </>
  );
}
