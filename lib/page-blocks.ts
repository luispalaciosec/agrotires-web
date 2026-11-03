import { z } from 'zod';
import { PRODUCT_IMAGES } from './catalog';

export const BLOCK_TYPES = ['heading', 'text', 'image', 'cards', 'faq', 'cta'] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

export const BLOCK_LABELS: Record<BlockType, string> = { heading: 'Heading', text: 'Text', image: 'Image', cards: 'Cards', faq: 'Questions', cta: 'Call to action' };

const copy = z.object({ title: z.string().max(200), text: z.string().max(8000), label: z.string().max(80) });

// Plain text only: pages never hold HTML, so nothing typed here can run in a visitor's browser.
const block = z.object({
  id: z.string().min(1).max(60),
  type: z.enum(BLOCK_TYPES),
  en: copy,
  es: copy,
  image: z.string().refine((v) => PRODUCT_IMAGES.includes(v)).optional(),
  href: z.string().max(300).regex(/^(\/(?!\/)|https:\/\/)[^\s]*$/, 'link').or(z.literal('')).optional(),
});

export const blocksSchema = z.array(block).max(60);
export type PageBlock = z.infer<typeof block>;
export type BlockCopy = z.infer<typeof copy>;

export const newBlock = (type: BlockType, id: string): PageBlock => ({
  id,
  type,
  en: { title: '', text: '', label: '' },
  es: { title: '', text: '', label: '' },
  ...(type === 'image' ? { image: PRODUCT_IMAGES[0] } : {}),
  ...(type === 'cta' ? { href: '/quote' } : {}),
});

export const validSlug = (slug: string) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) && slug.length <= 80;

// Spanish falls back to English, field by field, until someone writes it.
export const blockCopy = (b: PageBlock, locale: string): BlockCopy => (locale === 'es' ? { title: b.es.title || b.en.title, text: b.es.text || b.en.text, label: b.es.label || b.en.label } : b.en);

export const splitLines = (text: string) => text.split('\n').map((line) => line.split('|').map((part) => part.trim())).filter((parts) => parts[0]);
