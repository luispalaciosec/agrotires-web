import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { catHref, imageSrc, isUploadedImage, type Category, type Guide } from '@/lib/catalog';
import { localePath, type Locale } from '@/lib/i18n';
import { messages } from '@/lib/messages';

const svgPaths: Record<string, string> = {
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.4-4.4"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  cart: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.8 14h12.4L23 5H6"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 1 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 22v-2a8 8 0 0 1 16 0v2"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
  bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a2 2 0 0 0 3.4 0"/>',
  camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"/>',
  truck: '<path d="M1 5h14v12H1zM15 9h4l4 4v4h-8z"/><circle cx="5.5" cy="18.5" r="2"/><circle cx="18.5" cy="18.5" r="2"/>',
  bolt: '<path d="m13 2-9 12h7l-1 8 10-12h-7V2z"/>',
  filter: '<path d="M4 7h16M7 12h10M10 17h4"/>',
  wrench: '<path d="M14.7 6.3a6 6 0 0 0-7.8 7.8L2 19l3 3 4.9-4.9a6 6 0 0 0 7.8-7.8L14 13l-3-3 3.7-3.7Z"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 6 10 7L22 6"/>',
  box: '<path d="m12 2 9 5-9 5-9-5 9-5Zm-9 5v10l9 5 9-5V7M12 12v10"/>',
  compass: '<circle cx="12" cy="12" r="10"/><path d="m16.2 7.8-2.7 5.7-5.7 2.7 2.7-5.7 5.7-2.7Z"/>',
  settings: '<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/><path d="M19.4 15a8 8 0 0 0 .1-6l2-1-2-3.4-2.2 1a8 8 0 0 0-5.1-3L12 1l-4 1-.2 1.6a8 8 0 0 0-5.1 3l-2.2-1-2 3.4 2 1a8 8 0 0 0 0 6l-2 1 2 3.4 2.2-1a8 8 0 0 0 5.1 3L8 23l4 1 4-1 .2-1.6a8 8 0 0 0 5.1-3l2.2 1 2-3.4-2-1Z"/>',
  spark: '<path d="m12 2 1.7 7.3L21 11l-7.3 1.7L12 20l-1.7-7.3L3 11l7.3-1.7L12 2Z"/><path d="m19 18 1 2m-2-1 2 1"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  file: '<path d="M6 2h9l5 5v15H6zM15 2v5h5M9 12h8M9 16h8"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 11v6m0-10h.01"/>',
  guide: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14ZM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
  lock: '<rect x="4" y="10" width="16" height="12" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  clipboard: '<rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 4a3 3 0 0 1 6 0m-6 7h6m-6 4h6"/>',
};

export function Icon({ name, size = '' }: { name: string; size?: string }) {
  return <svg className={`icon ${size}`} viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svgPaths[name] || svgPaths.box }} />;
}

const ASSET_SIZES: Record<string, [number, number]> = {
  'agro-drive-belt.webp': [718, 724],
  'agro-fieldwork.webp': [506, 506],
  'agro-gauge-wheel.webp': [718, 724],
  'agro-harvest.webp': [506, 506],
  'agro-hydraulics.webp': [500, 506],
  'agro-maintenance.webp': [506, 506],
  'agro-precision.webp': [500, 506],
  'agro-tires.webp': [506, 506],
  'agro-toolkit.webp': [712, 724],
  'agrotires-farm-hero.webp': [1942, 809],
  'agrotires-logo-web.webp': [460, 460],
  'farm-hero.svg': [1480, 900],
};

// Uploaded photos come in any shape, and uploaded-photo shows the whole product instead of cropping it.
const UPLOADED_SIZE = [1600, 1200];

export function Asset({ name, alt, sizes, className, preload }: { name: string; alt: string; sizes: string; className?: string; preload?: boolean }) {
  const [width, height] = ASSET_SIZES[name] ?? UPLOADED_SIZE;
  return <Image src={imageSrc(name)} alt={alt} width={width} height={height} sizes={sizes} className={isUploadedImage(name) ? `${className ?? ''} uploaded-photo`.trim() : className} preload={preload} unoptimized={name.endsWith('.svg')} />;
}

export function PageHead({ locale, title, desc, crumbs }: { locale: Locale; title: ReactNode; desc: ReactNode; crumbs?: string }) {
  return (
    <div className="page-head">
      <div className="container">
        <div className="breadcrumb">
          <Link href={localePath(locale, '/')}>{messages[locale].common.home}</Link>
          {crumbs ? <> <Icon name="right" size="xs" /> {crumbs}</> : null}
        </div>
        <h1>{title}</h1>
        <p>{desc}</p>
      </div>
    </div>
  );
}

export function EmptyState({ locale, title, body, btn, link = '/shop' }: { locale: Locale; title: string; body: string; btn?: string; link?: string }) {
  return (
    <div className="empty-state">
      <Icon name="search" size="xl" />
      <h3>{title}</h3>
      <p>{body}</p>
      <Link className="btn" href={localePath(locale, link)}>{btn ?? messages[locale].common.explore} <Icon name="arrow" size="sm" /></Link>
    </div>
  );
}

export function CategoryCard({ category: c, locale }: { category: Category; locale: Locale }) {
  return (
    <Link className="category-card category-photo" href={localePath(locale, c.id === 'machine' ? '/finder?tab=machine' : catHref(c.id))}>
      <Asset className="cat-img" name={c.img} alt={messages[locale].home.catAlt(c.name)} sizes="(max-width: 720px) 50vw, 400px" />
      <div className="cat-copy">
        <div className="cat-kicker">{c.tag}</div>
        <h3>{c.name}</h3>
        <span className="cat-arrow"><Icon name="arrow" size="sm" /></span>
      </div>
    </Link>
  );
}

export function GuideCard({ guide: g, locale }: { guide: Guide; locale: Locale }) {
  return (
    <article className="guide-card">
      <div className="guide-icon"><Icon name={g.icon} /></div>
      <h3>{g.title}</h3>
      <p>{g.subtitle}</p>
      <Link className="text-link" href={localePath(locale, `/guide/${g.id}`)}>{messages[locale].common.readGuide} <Icon name="arrow" size="sm" /></Link>
    </article>
  );
}

export function JsonLd({ data }: { data: object }) {
  // Escaped so catalog text can never close the script tag.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}

export const eyebrowYellow: CSSProperties = { color: 'var(--yellow)' };
