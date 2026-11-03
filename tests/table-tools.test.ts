import { describe, expect, it } from 'vitest';
import { paginate } from '@/app/admin/table-tools';
import { toSpanish } from '@/lib/admin-i18n';

describe('table pages', () => {
  const list = Array.from({ length: 60 }, (_, i) => i);

  it('cuts the list and reports where it is', () => {
    expect(paginate(list, '2')).toMatchObject({ page: 2, pages: 3, total: 60, from: 26, to: 50 });
    expect(paginate(list, '2').rows[0]).toBe(25);
  });

  it('a strange page number lands on a real page', () => {
    expect(paginate(list, 'abc').page).toBe(1);
    expect(paginate(list, '-4').page).toBe(1);
    expect(paginate(list, '999').page).toBe(3);
    expect(paginate([], '2')).toMatchObject({ page: 1, pages: 1, from: 0, to: 0 });
  });

  it('speaks Spanish', () => {
    expect(toSpanish('Showing 1–25 of 60')).toBe('Mostrando 1–25 de 60');
    expect(toSpanish('Page 2 of 3')).toBe('Página 2 de 3');
  });
});
