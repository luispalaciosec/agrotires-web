import type { Product } from './catalog';

const SYNONYMS: Record<string, string[]> = {
  tire: ['llanta', 'neumatico', 'goma', 'wheel'],
  llanta: ['tire', 'neumatico', 'goma'],
  neumatico: ['tire', 'llanta'],
  goma: ['tire', 'llanta'],
  hose: ['manguera'],
  manguera: ['hose'],
  belt: ['correa', 'banda'],
  correa: ['belt'],
  banda: ['belt'],
  filter: ['filtro'],
  filtro: ['filter'],
  tractor: ['tractor'],
};

const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const words = (text: string) => normalize(text).split(/[^a-z0-9.\-/]+/).filter(Boolean);
// So 18.4-38, 18.4/38 and 18438 are the same size, and DEMO-TIR-001 the same as demotir001.
const compact = (text: string) => normalize(text).replace(/[^a-z0-9]/g, '');

function distance(a: string, b: string, limit: number) {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) next[j] = Math.min(next[j - 1] + 1, row[j] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    row = next;
  }
  return row[b.length];
}

// Short terms must match closely, or a part number would match half the catalog.
const allowedTypos = (term: string) => (term.length >= 8 ? 2 : term.length >= 4 ? 1 : 0);

function scoreTerm(term: string, fields: { text: string[]; weight: number }[], codes: string[]) {
  const code = compact(term);
  if (code.length >= 3 && codes.some((c) => c === code)) return 30;
  if (code.length >= 3 && codes.some((c) => c.includes(code))) return 20;
  let best = 0;
  for (const field of fields) {
    for (const word of field.text) {
      if (word === term) best = Math.max(best, 10 * field.weight);
      else if (term.length >= 2 && word.startsWith(term)) best = Math.max(best, 7 * field.weight);
      else if (term.length >= 3 && word.includes(term)) best = Math.max(best, 4 * field.weight);
      else {
        const typos = allowedTypos(term);
        if (typos && distance(term, word, typos) <= typos) best = Math.max(best, 3 * field.weight);
      }
    }
  }
  return best;
}

export function searchScore(p: Product, query: string) {
  const terms = words(query);
  if (!terms.length) return 1;
  const fit = (p.fitment ?? []).flatMap((f) => [f.make, f.model]);
  const fields = [
    { text: words(`${p.name} ${p.alt ?? ''}`), weight: 3 },
    { text: words([p.brand, p.equipmentMake, p.equipmentModel, ...fit].filter(Boolean).join(' ')), weight: 2 },
    { text: words(`${p.tags.join(' ')} ${p.desc} ${p.cat}`), weight: 1 },
  ];
  const codes = [p.sku, p.tireSize ?? ''].filter(Boolean).map(compact);
  let total = 0;
  // Every term must match something, so more words narrow the results.
  for (const term of terms) {
    const options = [term, ...(SYNONYMS[term] ?? [])];
    const score = Math.max(...options.map((o) => scoreTerm(o, fields, codes)));
    if (!score) return 0;
    total += score;
  }
  return total;
}

export function searchProducts<T extends Product>(products: T[], query: string): T[] {
  return products
    .map((product, index) => ({ product, index, score: searchScore(product, query) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((r) => r.product);
}
