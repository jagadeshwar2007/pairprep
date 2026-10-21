import { describe, expect, it } from 'vitest';
import { likePattern, oneOf, pageRange, parsePage, queryString, sanitizeSearch } from '@/lib/admin/query';

describe('admin query helpers', () => {
  it('strips everything that could alter a PostgREST filter', () => {
    for (const attack of [
      'a,id.eq.00000000-0000-0000-0000-000000000000',
      'x),role_id.eq.super_admin,(y',
      'foo"bar',
      "o'brien; drop table profiles",
      '*',
      'a\\b',
      '%',
    ]) {
      const clean = sanitizeSearch(attack);
      expect(clean, attack).not.toMatch(/[,()"'*;\\%]/);
    }
    expect(sanitizeSearch('Asha Rao')).toBe('Asha Rao');
    expect(sanitizeSearch('  asha.rao+test@college.edu ')).toBe('asha.rao+test@college.edu');
    expect(sanitizeSearch('x'.repeat(500)).length).toBe(60);
    expect(sanitizeSearch(undefined)).toBe('');
  });

  it('turns search text into a literal LIKE pattern', () => {
    expect(likePattern('data_structures')).toBe('%data\\_structures%');
    expect(likePattern('50%')).toBe('%50%');
    expect(likePattern('   ')).toBeNull();
    expect(likePattern(',,,')).toBeNull();
  });

  it('parses pages defensively', () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage('3')).toBe(3);
    for (const bad of ['0', '-4', 'abc', '1e9', '99999999', '']) expect(parsePage(bad), bad).toBe(1);
    expect(pageRange(1)).toEqual([0, 19]);
    expect(pageRange(3, 10)).toEqual([20, 29]);
  });

  it('only accepts known enum values', () => {
    expect(oneOf('pending', ['pending', 'approved'] as const, 'approved')).toBe('pending');
    expect(oneOf("pending'; --", ['pending', 'approved'] as const, 'approved')).toBe('approved');
    expect(oneOf(undefined, ['a'] as const, 'a')).toBe('a');
  });

  it('builds query strings without empty values', () => {
    expect(queryString({ q: 'x y', page: 2, status: '', sort: undefined })).toBe('?q=x+y&page=2');
    expect(queryString({})).toBe('');
  });
});
