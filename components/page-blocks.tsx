import Link from 'next/link';
import { localePath, type Locale } from '@/lib/i18n';
import { blockCopy, splitLines, type PageBlock } from '@/lib/page-blocks';
import { Asset } from './ui';

function Block({ block, locale }: { block: PageBlock; locale: Locale }) {
  const c = blockCopy(block, locale);
  switch (block.type) {
    case 'heading':
      return <div>{c.text ? <div className="eyebrow">{c.text}</div> : null}<h2 className="section-title">{c.title}</h2></div>;
    case 'text':
      return <div className="page-text">{c.title ? <h3>{c.title}</h3> : null}{c.text.split(/\n\s*\n/).filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}</div>;
    case 'image':
      return <figure className="page-image">{block.image ? <Asset name={block.image} alt={c.title} sizes="(max-width: 900px) 100vw, 860px" /> : null}{c.text ? <figcaption>{c.text}</figcaption> : null}</figure>;
    case 'cards':
      return <div>{c.title ? <h3>{c.title}</h3> : null}<div className="info-grid">{splitLines(c.text).map(([title, body], i) => <div className="info-tile" key={i}><h3>{title}</h3>{body ? <p>{body}</p> : null}</div>)}</div></div>;
    case 'faq':
      return <div className="page-faq">{c.title ? <h3>{c.title}</h3> : null}{splitLines(c.text).map(([q, a], i) => <details key={i}><summary>{q}</summary>{a ? <p>{a}</p> : null}</details>)}</div>;
    case 'cta': {
      const href = block.href || '/quote';
      return (
        <div className="page-cta">
          <div>{c.title ? <h3>{c.title}</h3> : null}{c.text ? <p>{c.text}</p> : null}</div>
          {c.label ? (href.startsWith('/') ? <Link className="btn" href={localePath(locale, href)}>{c.label}</Link> : <a className="btn" href={href} rel="noopener noreferrer">{c.label}</a>) : null}
        </div>
      );
    }
  }
}

export function PageBlocks({ blocks, locale }: { blocks: PageBlock[]; locale: Locale }) {
  return <div className="page-blocks">{blocks.map((b) => <Block key={b.id} block={b} locale={locale} />)}</div>;
}
