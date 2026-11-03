export type Fitment = { make: string; model: string; yearFrom: number; yearTo: number };

// Panel format, one machine per line: John Deere | 6120M | 2015-2020 (or a single year).
export function parseFitmentText(text: string, thisYear = new Date().getUTCFullYear()): { ok: true; fitment: Fitment[] } | { ok: false; error: string } {
  const fitment: Fitment[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const [i, line] of lines.entries()) {
    const parts = line.split('|').map((p) => p.trim());
    const years = parts[2]?.match(/^(\d{4})(?:\s*-\s*(\d{4}))?$/);
    if (parts.length !== 3 || !parts[0] || !parts[1] || !years) return { ok: false, error: `Machine line ${i + 1}: use Make | Model | 2015-2020.` };
    const yearFrom = Number(years[1]);
    const yearTo = Number(years[2] ?? years[1]);
    if (yearFrom < 1900 || yearTo > thisYear + 1 || yearFrom > yearTo) return { ok: false, error: `Machine line ${i + 1}: check the years.` };
    if (parts[0].length > 80 || parts[1].length > 80) return { ok: false, error: `Machine line ${i + 1}: the name is too long.` };
    fitment.push({ make: parts[0], model: parts[1], yearFrom, yearTo });
  }
  if (fitment.length > 200) return { ok: false, error: 'A product can list up to 200 machines.' };
  return { ok: true, fitment };
}

export const fitmentToText = (list: Fitment[]) => list.map((f) => `${f.make} | ${f.model} | ${f.yearFrom === f.yearTo ? f.yearFrom : `${f.yearFrom}-${f.yearTo}`}`).join('\n');

export const fitmentLabel = (f: Fitment) => `${f.make} ${f.model} (${f.yearFrom === f.yearTo ? f.yearFrom : `${f.yearFrom}–${f.yearTo}`})`;

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
export const fits = (list: Fitment[] | undefined, make: string, model?: string, year?: number) => (list ?? []).some((f) => same(f.make, make) && (!model || same(f.model, model)) && (!year || (f.yearFrom <= year && year <= f.yearTo)));

const unique = (values: string[]) => [...new Map(values.map((v) => [v.toLowerCase(), v])).values()].sort((a, b) => a.localeCompare(b));
export const fitmentMakes = (all: Fitment[]) => unique(all.map((f) => f.make));
export const fitmentModels = (all: Fitment[], make: string) => unique(all.filter((f) => same(f.make, make)).map((f) => f.model));
export const fitmentYears = (all: Fitment[], make: string, model: string) => {
  const years = new Set<number>();
  for (const f of all) if (same(f.make, make) && same(f.model, model)) for (let y = f.yearFrom; y <= f.yearTo; y++) years.add(y);
  return [...years].sort((a, b) => b - a);
};
