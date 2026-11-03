import Link from 'next/link';

export const PAGE_SIZE = 25;

export function paginate<T>(list: T[], pageText: string | undefined, size = PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(list.length / size));
  const page = Math.min(pages, Math.max(1, Math.floor(Number(pageText)) || 1));
  return { rows: list.slice((page - 1) * size, page * size), page, pages, total: list.length, from: list.length ? (page - 1) * size + 1 : 0, to: Math.min(page * size, list.length) };
}

type Params = Record<string, string | undefined>;

const withParams = (base: string, params: Params) => {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v && v !== 'all') q.set(k, v);
  const text = q.toString();
  return text ? `${base}?${text}` : base;
};

export function Pager({ base, params, result, pageKey = 'page' }: { base: string; params: Params; result: { page: number; pages: number; total: number; from: number; to: number }; pageKey?: string }) {
  if (!result.total) return null;
  const go = (page: number) => withParams(base, { ...params, [pageKey]: page > 1 ? String(page) : undefined });
  return (
    <nav className="admin-pager" aria-label="Pages">
      <span>{`Showing ${result.from}–${result.to} of ${result.total}`}</span>
      {result.pages > 1 ? (
        <span className="admin-pager-links">
          {result.page > 1 ? <Link className="btn btn-light" href={go(result.page - 1)}>Previous</Link> : null}
          <span>{`Page ${result.page} of ${result.pages}`}</span>
          {result.page < result.pages ? <Link className="btn btn-light" href={go(result.page + 1)}>Next</Link> : null}
        </span>
      ) : null}
    </nav>
  );
}

export type FilterField = { name: string; label: string; value?: string; options?: [string, string][]; type?: 'search' | 'date'; placeholder?: string };

// A plain form: filters live in the address, so a view can be shared or reloaded.
export function TableFilters({ base, fields, keep }: { base: string; fields: FilterField[]; keep?: Params }) {
  const active = fields.some((f) => f.value && f.value !== 'all');
  return (
    <form className="admin-filters" role="search">
      {Object.entries(keep ?? {}).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      {fields.map((f) => (
        <label key={f.name} className={f.options ? undefined : f.type === 'date' ? undefined : 'admin-filter-grow'}>
          <span className="field-label">{f.label}</span>
          {f.options ? (
            <select className="select-input" name={f.name} defaultValue={f.value ?? 'all'}>{f.options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          ) : (
            <input className="text-input" type={f.type ?? 'search'} name={f.name} defaultValue={f.value} placeholder={f.placeholder} />
          )}
        </label>
      ))}
      <button className="btn btn-light">Apply</button>
      {active ? <Link className="text-link" href={withParams(base, keep ?? {})}>Clear</Link> : null}
    </form>
  );
}
