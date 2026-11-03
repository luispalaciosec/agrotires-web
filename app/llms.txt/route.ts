import { BUSINESS, catHref, getCategories, getGuides } from '@/lib/catalog';
import { localePath, type Locale } from '@/lib/i18n';
import { messages } from '@/lib/messages';
import { absolute } from '@/lib/seo';

export const dynamic = 'force-static';

const section = (locale: Locale, titles: [string, string, string]) => {
  const url = (p: string) => absolute(localePath(locale, p));
  const f = messages[locale].footer;
  return [
    `## ${titles[0]}`,
    ...getCategories(locale).filter((c) => c.id !== 'machine').map((c) => `- [${c.name}](${url(catHref(c.id))}): ${c.desc}`),
    '',
    `## ${titles[1]}`,
    ...getGuides(locale).map((g) => `- [${g.title}](${url(`/guide/${g.id}`)}): ${g.subtitle}`),
    '',
    `## ${titles[2]}`,
    `- [${f.center}](${url('/help')})`,
    `- [${f.quote}](${url('/quote')})`,
    '',
  ];
};

// Plain-text site summary for AI assistants. It only states facts the business confirmed.
export function GET() {
  const body = [
    `# ${BUSINESS.name}`,
    '',
    '> Instant Solution. Agricultural tires, machinery parts, equipment and farm essentials for the United States, priced in USD. Available in English and Spanish.',
    '> Instant Solution. Llantas agrícolas, piezas de maquinaria, equipos y esenciales para la granja en Estados Unidos, con precios en USD. Disponible en inglés y español.',
    '',
    `Contact / Contacto: ${BUSINESS.contactEmail}`,
    '',
    ...section('en', ['Departments', 'Guides', 'Support']),
    ...section('es', ['Departamentos', 'Guías', 'Ayuda']),
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
