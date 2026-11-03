import { describe, expect, it } from 'vitest';
import { ADMIN_DOCS, DOC_GROUPS } from '@/lib/admin-docs';
import { EMAIL_TEMPLATES } from '@/lib/email-templates';

describe('admin docs', () => {
  it('every doc has a unique address, a known group and both languages with the same shape', () => {
    expect(new Set(ADMIN_DOCS.map((d) => d.slug)).size).toBe(ADMIN_DOCS.length);
    for (const d of ADMIN_DOCS) {
      expect(DOC_GROUPS[d.group]).toBeTruthy();
      expect(d.es.sections.map(([, items]) => items.length)).toEqual(d.en.sections.map(([, items]) => items.length));
    }
  });

  it('names variables but never holds a value', () => {
    expect(JSON.stringify(ADMIN_DOCS)).not.toMatch(/sb_secret|service_role|eyJ[A-Za-z0-9_-]{10}|[A-Z_]+=\S/);
  });

  it('counts the emails correctly', () => {
    expect(EMAIL_TEMPLATES).toHaveLength(21);
  });
});
