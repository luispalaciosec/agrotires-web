'use client';

import { startTransition, useActionState, useState } from 'react';
import { PageBlocks } from '@/components/page-blocks';
import { Icon } from '@/components/ui';
import { panelText } from '@/lib/admin-i18n';
import { PRODUCT_IMAGES } from '@/lib/catalog';
import type { Locale } from '@/lib/i18n';
import { BLOCK_LABELS, BLOCK_TYPES, newBlock, type BlockType, type PageBlock } from '@/lib/page-blocks';
import type { ContentPage } from '@/lib/server/store';
import { deletePageAction, savePageAction, type FormState } from './actions';
import { Messages } from './forms';

const empty: FormState = {};

const HINTS: Partial<Record<BlockType, string>> = {
  cards: 'One card per line: Title | Text',
  faq: 'One question per line: Question | Answer',
  text: 'Leave a blank line between paragraphs.',
};
const TITLE_LABEL: Partial<Record<BlockType, string>> = { image: 'Image description', heading: 'Heading' };
const TEXT_LABEL: Partial<Record<BlockType, string>> = { heading: 'Small text above', image: 'Caption' };

function CopyFields({ block, lang, change }: { block: PageBlock; lang: 'en' | 'es'; change: (b: PageBlock) => void }) {
  const copy = block[lang];
  const set = (field: 'title' | 'text' | 'label', value: string) => change({ ...block, [lang]: { ...copy, [field]: value } });
  const long = block.type !== 'heading' && block.type !== 'image';
  return (
    <div>
      <strong className="mini">{lang === 'en' ? 'English' : 'Spanish'}</strong>
      <div className="field"><label className="field-label">{TITLE_LABEL[block.type] ?? 'Title'}</label><input className="text-input" value={copy.title} maxLength={200} onChange={(e) => set('title', e.target.value)} /></div>
      <div className="field">
        <label className="field-label">{TEXT_LABEL[block.type] ?? 'Text'}</label>
        {long ? <textarea className="textarea" rows={4} value={copy.text} maxLength={8000} onChange={(e) => set('text', e.target.value)} /> : <input className="text-input" value={copy.text} maxLength={300} onChange={(e) => set('text', e.target.value)} />}
      </div>
      {block.type === 'cta' ? <div className="field"><label className="field-label">Button text</label><input className="text-input" value={copy.label} maxLength={80} onChange={(e) => set('label', e.target.value)} /></div> : null}
    </div>
  );
}

export function PageEditor({ page }: { page?: ContentPage }) {
  const [state, action, pending] = useActionState(savePageAction.bind(null, page?.id ?? null), empty);
  const [blocks, setBlocks] = useState<PageBlock[]>(page?.blocks ?? []);
  const [preview, setPreview] = useState<Locale>('en');
  const [adding, setAdding] = useState<BlockType>('text');
  const change = (b: PageBlock) => setBlocks((list) => list.map((x) => (x.id === b.id ? b : x)));
  const move = (i: number, by: number) => setBlocks((list) => {
    const next = [...list];
    const [one] = next.splice(i, 1);
    next.splice(i + by, 0, one);
    return next;
  });
  return (
    <form onSubmit={(e) => { e.preventDefault(); const data = new FormData(e.currentTarget); data.set('blocks', JSON.stringify(blocks)); startTransition(() => action(data)); }}>
      <Messages state={state} />
      <div className="admin-grid two">
        <div>
          <section className="admin-card">
            <h2>Page</h2>
            <div className="form-grid">
              <div className="field"><label className="field-label" htmlFor="titleEn">Title in English *</label><input className="text-input" id="titleEn" name="titleEn" defaultValue={page?.titleEn} maxLength={200} required /></div>
              <div className="field"><label className="field-label" htmlFor="titleEs">Title in Spanish</label><input className="text-input" id="titleEs" name="titleEs" defaultValue={page?.titleEs} maxLength={200} /></div>
              <div className="field"><label className="field-label" htmlFor="descEn">Summary in English</label><input className="text-input" id="descEn" name="descEn" defaultValue={page?.descEn} maxLength={300} /></div>
              <div className="field"><label className="field-label" htmlFor="descEs">Summary in Spanish</label><input className="text-input" id="descEs" name="descEs" defaultValue={page?.descEs} maxLength={300} /></div>
              <div className="field full-width"><label className="field-label" htmlFor="slug">Address: /p/… *</label><input className="text-input" id="slug" name="slug" defaultValue={page?.slug} maxLength={80} placeholder="financing" pattern="[a-z0-9\-]+" required /></div>
            </div>
            <label className="admin-check"><input type="checkbox" name="published" defaultChecked={page?.published} /> Published</label>
            <div className="admin-actions">
              <button className="btn" disabled={pending}>{pending ? 'Saving…' : 'Save page'}</button>
              {page?.published ? <a className="btn btn-light" href={`/p/${page.slug}`} target="_blank" rel="noreferrer">View page</a> : null}
            </div>
          </section>
          <section className="admin-card" style={{ marginTop: 18 }}>
            <h2>Blocks</h2>
            {blocks.map((b, i) => (
              <div className="block-card" key={b.id}>
                <div className="block-head">
                  <strong>{BLOCK_LABELS[b.type]}</strong>
                  <span className="admin-actions" style={{ margin: 0 }}>
                    <button type="button" className="btn btn-light" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">↑</button>
                    <button type="button" className="btn btn-light" disabled={i === blocks.length - 1} onClick={() => move(i, 1)} aria-label="Move down">↓</button>
                    <button type="button" className="btn btn-light" onClick={() => setBlocks((list) => list.filter((x) => x.id !== b.id))}>Remove</button>
                  </span>
                </div>
                {HINTS[b.type] ? <p className="mini muted">{HINTS[b.type]}</p> : null}
                {b.type === 'image' ? (
                  <div className="field"><label className="field-label">Image</label><select className="select-input" value={b.image} onChange={(e) => change({ ...b, image: e.target.value })}>{PRODUCT_IMAGES.map((img) => <option key={img} value={img}>{img}</option>)}</select></div>
                ) : null}
                {b.type === 'cta' ? (
                  <div className="field"><label className="field-label">Button link, such as /quote or https://…</label><input className="text-input" value={b.href ?? ''} maxLength={300} onChange={(e) => change({ ...b, href: e.target.value })} /></div>
                ) : null}
                <div className="block-langs">
                  <CopyFields block={b} lang="en" change={change} />
                  <CopyFields block={b} lang="es" change={change} />
                </div>
              </div>
            ))}
            {blocks.length ? null : <p className="muted">No blocks yet. Add the first one.</p>}
            <div className="track-row" style={{ marginTop: 12 }}>
              <select className="select-input" aria-label="Block type" value={adding} onChange={(e) => setAdding(e.target.value as BlockType)}>{BLOCK_TYPES.map((t) => <option key={t} value={t}>{BLOCK_LABELS[t]}</option>)}</select>
              <button type="button" className="btn btn-light" onClick={() => setBlocks((list) => [...list, newBlock(adding, crypto.randomUUID())])}><Icon name="plus" size="sm" /> Add block</button>
            </div>
          </section>
        </div>
        <section className="admin-card block-preview">
          <div className="block-head">
            <h2 style={{ margin: 0 }}>Preview</h2>
            <span className="admin-actions" style={{ margin: 0 }}>
              <button type="button" className={`btn ${preview === 'en' ? '' : 'btn-light'}`} onClick={() => setPreview('en')}>EN</button>
              <button type="button" className={`btn ${preview === 'es' ? '' : 'btn-light'}`} onClick={() => setPreview('es')}>ES</button>
            </span>
          </div>
          <div data-raw><PageBlocks blocks={blocks} locale={preview} /></div>
        </section>
      </div>
    </form>
  );
}

export function DeletePageButton({ id, title }: { id: string; title: string }) {
  return (
    <form action={deletePageAction.bind(null, id)} onSubmit={(e) => { if (!confirm(panelText(`Delete ${title}? This cannot be undone.`))) e.preventDefault(); }}>
      <button className="btn btn-danger">Delete page</button>
    </form>
  );
}
