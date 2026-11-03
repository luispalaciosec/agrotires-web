import { isUsState, percentToBps } from '../tax';
import type { TaxZipRate } from './store';

export function shippingStates(text: string) {
  const states = [...new Set(text.toUpperCase().split(/[\s,;]+/).filter(Boolean))];
  return states.length && states.every(isUsState) ? states : undefined;
}

export const dollarsToCents = (text: string) => {
  const value = text.trim();
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(value)) return NaN;
  return Math.round(Number(value) * 100);
};

// File with columns zip, rate (percent) and optionally region. The header row is optional.
export function parseZipRates(text: string): { ok: true; rates: TaxZipRate[] } | { ok: false; error: string } {
  const rates: TaxZipRate[] = [];
  const seen = new Set<string>();
  const lines = text.split(/\r?\n/);
  for (const [i, raw] of lines.entries()) {
    const cells = raw.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    if (!raw.trim() || (i === 0 && cells[0].toLowerCase() === 'zip')) continue;
    if (!/^\d{5}$/.test(cells[0])) return { ok: false, error: `Line ${i + 1}: the ZIP code must have 5 digits.` };
    const rateBps = percentToBps(cells[1] ?? '');
    if (!cells[1] || Number.isNaN(rateBps)) return { ok: false, error: `Line ${i + 1}: enter a rate from 0 to 20.` };
    if (seen.has(cells[0])) return { ok: false, error: `Line ${i + 1}: ${cells[0]} appears twice.` };
    seen.add(cells[0]);
    rates.push({ zip: cells[0], rateBps, region: cells[2] || undefined });
  }
  if (rates.length > 50_000) return { ok: false, error: 'The file has more than 50,000 ZIP codes.' };
  return { ok: true, rates };
}
