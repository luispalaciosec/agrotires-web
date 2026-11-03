import { BUSINESS, catHref, categories, guides } from '@/lib/catalog';
import { absolute } from '@/lib/seo';

export const dynamic = 'force-static';

// Plain-text site summary for AI assistants. It only states facts the business confirmed.
export function GET() {
  const body = [
    `# ${BUSINESS.name}`,
    '',
    `> Instant Solution. Agricultural tires, machinery parts, equipment and farm essentials for the United States, priced in USD.`,
    '',
    `Contact: ${BUSINESS.contactEmail}`,
    '',
    '## Departments',
    ...categories.filter((c) => c.id !== 'machine').map((c) => `- [${c.name}](${absolute(catHref(c.id))}): ${c.desc}`),
    '',
    '## Guides',
    ...guides.map((g) => `- [${g.title}](${absolute(`/guide/${g.id}`)}): ${g.subtitle}`),
    '',
    '## Support',
    `- [Instant Solution Center](${absolute('/help')})`,
    `- [Request a quote](${absolute('/quote')})`,
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
