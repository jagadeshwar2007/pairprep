import { describe, expect, it } from 'vitest';
import { SUBJECTS } from '@/data/academicData';
import { DEMO_RESOURCES } from '@/data/resourcesData';
import {
  EMPTY_FILTERS,
  getRecentRealResources,
  hasActiveFilters,
  parseFilters,
  searchResources,
  searchSubjects,
  serializeFilters,
  type LibraryFilters,
} from '@/lib/library';

const f = (over: Partial<LibraryFilters> = {}): LibraryFilters => ({ ...EMPTY_FILTERS, ...over });

describe('filter <-> URL round trip', () => {
  it('serializes only non-default values', () => {
    expect(serializeFilters(f())).toBe('');
    expect(serializeFilters(f({ q: 'trees', branch: 'cse' }))).toBe('q=trees&branch=cse');
  });

  it('parses what it serializes', () => {
    const filters = f({ q: 'os', branch: 'cse', year: 'second-year', semester: '4', type: 'notes', sort: 'title' });
    const parsed = parseFilters(new URLSearchParams(serializeFilters(filters)));
    expect(parsed).toEqual(filters);
  });

  it('sanitizes junk: bad sort, bad semester, overlong query', () => {
    const parsed = parseFilters(new URLSearchParams({ sort: 'DROP', semester: '99', q: 'x'.repeat(500) }));
    expect(parsed.sort).toBe('relevance');
    expect(parsed.semester).toBe('');
    expect(parsed.q).toHaveLength(120);
  });

  it('knows when filters are active (sort alone is not a filter)', () => {
    expect(hasActiveFilters(f())).toBe(false);
    expect(hasActiveFilters(f({ sort: 'title' }))).toBe(false);
    expect(hasActiveFilters(f({ semester: '3' }))).toBe(true);
  });
});

describe('searchSubjects', () => {
  it('returns all 446 subjects with no filters', () => {
    expect(searchSubjects(SUBJECTS, DEMO_RESOURCES, f())).toHaveLength(446);
  });

  it('filters by branch, semester and exact subject', () => {
    const cseSem3 = searchSubjects(SUBJECTS, DEMO_RESOURCES, f({ branch: 'cse', semester: '3' }));
    expect(cseSem3.length).toBeGreaterThan(0);
    expect(cseSem3.every((r) => r.subject.branchId === 'cse' && r.subject.semester === 3)).toBe(true);

    const one = searchSubjects(SUBJECTS, DEMO_RESOURCES, f({ subject: 'cse-sem2-ord4-csn12401' }));
    expect(one.map((r) => r.subject.id)).toEqual(['cse-sem2-ord4-csn12401']);
  });

  it('filters by year', () => {
    const second = searchSubjects(SUBJECTS, DEMO_RESOURCES, f({ year: 'second-year' }));
    expect(second.every((r) => r.subject.yearId === 'second-year')).toBe(true);
  });

  it('matches by title and by course code, case-insensitively', () => {
    const byTitle = searchSubjects(SUBJECTS, DEMO_RESOURCES, f({ q: 'data structures', branch: 'cse' }));
    expect(byTitle.map((r) => r.subject.id)).toContain('cse-sem2-ord4-csn12401');
    const byCode = searchSubjects(SUBJECTS, DEMO_RESOURCES, f({ q: 'csn14401' }));
    expect(byCode.map((r) => r.subject.id)).toContain('cse-sem4-ord2-csn14401');
  });

  it('requires every query word to match', () => {
    expect(searchSubjects(SUBJECTS, DEMO_RESOURCES, f({ q: 'data zzzznotaword' }))).toEqual([]);
  });

  it('attaches resource counts that agree with the resource list', () => {
    const r = searchSubjects(SUBJECTS, DEMO_RESOURCES, f({ subject: 'cse-sem2-ord4-csn12401' }))[0];
    expect(r.resourceCount).toBe(DEMO_RESOURCES.filter((x) => x.subjectId === r.subject.id).length);
    expect(r.resourceCount).toBeGreaterThan(0);
  });

  it('with a resource type selected, keeps only subjects that have that type', () => {
    const results = searchSubjects(SUBJECTS, DEMO_RESOURCES, f({ type: 'midsem' }));
    expect(results.length).toBeGreaterThan(0);
    for (const { subject, resourceCount } of results) {
      expect(resourceCount).toBeGreaterThan(0);
      expect(DEMO_RESOURCES.some((x) => x.subjectId === subject.id && x.category === 'midsem')).toBe(true);
    }
  });

  it('sorts by catalog order by default and by title on request', () => {
    const def = searchSubjects(SUBJECTS, DEMO_RESOURCES, f({ branch: 'cse' }));
    const sems = def.map((r) => r.subject.semester);
    expect(sems).toEqual([...sems].sort((a, b) => a - b));

    const byTitle = searchSubjects(SUBJECTS, DEMO_RESOURCES, f({ branch: 'cse', sort: 'title' }));
    const titles = byTitle.map((r) => r.subject.title ?? r.subject.name);
    expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b)));
  });
});

describe('searchResources', () => {
  it('returns every resource with no filters', () => {
    expect(searchResources(DEMO_RESOURCES, f())).toHaveLength(DEMO_RESOURCES.length);
  });

  it('filters by type, branch, semester and subject', () => {
    expect(searchResources(DEMO_RESOURCES, f({ type: 'notes' })).every((r) => r.category === 'notes')).toBe(true);
    expect(searchResources(DEMO_RESOURCES, f({ branch: 'me' })).every((r) => r.branchId === 'me')).toBe(true);
    expect(searchResources(DEMO_RESOURCES, f({ semester: '4' })).every((r) => r.semester === 4)).toBe(true);
    const bySubject = searchResources(DEMO_RESOURCES, f({ subject: 'cse-sem4-ord2-csn14401' }));
    expect(bySubject.length).toBeGreaterThan(0);
    expect(bySubject.every((r) => r.subjectId === 'cse-sem4-ord2-csn14401')).toBe(true);
  });

  it('searches titles, tags and subject names', () => {
    expect(searchResources(DEMO_RESOURCES, f({ q: 'thermodynamics' })).length).toBeGreaterThan(0);
    expect(searchResources(DEMO_RESOURCES, f({ q: 'nonexistentxyz' }))).toEqual([]);
  });

  it('ranks a title match above a description-only match', () => {
    const fake = (id: string, title: string, description: string) => ({ ...DEMO_RESOURCES[0], id, title, description, tags: [] });
    const results = searchResources([fake('b', 'Other', 'mentions graphs here'), fake('a', 'Graphs primer', 'x')], f({ q: 'graphs' }));
    expect(results.map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('sorts newest first and by title', () => {
    const newest = searchResources(DEMO_RESOURCES, f({ sort: 'newest' })).map((r) => r.uploadedAt);
    expect(newest).toEqual([...newest].sort().reverse());
    const titles = searchResources(DEMO_RESOURCES, f({ sort: 'title' })).map((r) => r.title);
    expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b)));
  });

  it('combines filters', () => {
    const r = searchResources(DEMO_RESOURCES, f({ branch: 'cse', type: 'midsem', q: 'operating' }));
    expect(r.every((x) => x.branchId === 'cse' && x.category === 'midsem')).toBe(true);
  });
});

describe('getRecentRealResources', () => {
  it('is empty while every resource is a demo placeholder, so the home page never presents demos as recent uploads', () => {
    expect(DEMO_RESOURCES.every((r) => r.isDemo)).toBe(true);
    expect(getRecentRealResources(DEMO_RESOURCES, 4)).toEqual([]);
  });

  it('returns non-demo resources newest first, up to the limit', () => {
    const real = (id: string, date: string) => ({ ...DEMO_RESOURCES[0], id, isDemo: false, uploadedAt: date });
    const out = getRecentRealResources([real('a', '2026-01-01'), real('b', '2026-03-01'), real('c', '2026-02-01')], 2);
    expect(out.map((r) => r.id)).toEqual(['b', 'c']);
  });
});
