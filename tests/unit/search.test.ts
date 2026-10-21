import { describe, expect, it } from 'vitest';
import { buildSearchText, computeFacets, matchesQuery, searchResources } from '@/lib/resources/search';
import type { Resource } from '@/lib/resources/types';

let n = 0;
function make(overrides: Partial<Resource>): Resource {
  n += 1;
  const base = {
    id: `r${n}`,
    title: `Resource ${n}`,
    description: '',
    department: 'cse',
    semester: 3,
    subject: 'Data Structures',
    subjectCode: 'CS13101',
    academicYear: '2024-25',
    resourceType: 'notes' as const,
    unit: null,
    keywords: [],
    driveFileId: `file${n}xxxxxxxxxxxx`,
    mimeType: 'application/pdf',
    fileName: `file${n}.pdf`,
    fileSizeBytes: 1000,
    downloadAllowed: true,
    verificationStatus: 'approved' as const,
    publicationStatus: 'published' as const,
    source: 'admin' as const,
    uploadedBy: 'u1',
    uploaderName: 'Admin',
    contributorNote: null,
    approval: null,
    rejectionReason: null,
    createdAt: new Date(2026, 0, n).toISOString(),
    updatedAt: new Date(2026, 0, n).toISOString(),
    publishedAt: new Date(2026, 0, n).toISOString(),
    searchText: '',
    ...overrides,
  };
  return { ...base, searchText: buildSearchText(base) };
}

describe('metadata search', () => {
  const data = [
    make({ title: 'Endsem 2023 paper', resourceType: 'pyq', subject: 'Operating Systems', subjectCode: 'CS15101', semester: 5 }),
    make({ title: 'Trees and graphs notes', unit: '3', subject: 'Data Structures' }),
    make({ title: 'Thermodynamics midsem', resourceType: 'pyq', department: 'me', subject: 'Thermodynamics', subjectCode: 'ME13101', academicYear: '2023-24' }),
    make({ title: 'DSA lab manual', resourceType: 'lab_manual' }),
  ];

  it('finds by subject even without the exact file name', () => {
    expect(searchResources(data, { q: 'operating' }).items.map((r) => r.title)).toEqual(['Endsem 2023 paper']);
  });
  it('matches prefixes, subject codes, units and type synonyms', () => {
    expect(matchesQuery(data[1].searchText, 'unit 3')).toBe(true);
    expect(searchResources(data, { q: 'cs151' }).total).toBe(1);
    expect(searchResources(data, { q: 'previous year thermo' }).total).toBe(1);
  });
  it('requires every query word to match', () => {
    expect(searchResources(data, { q: 'trees thermodynamics' }).total).toBe(0);
  });
  it('applies filters together', () => {
    expect(searchResources(data, { department: 'cse', resourceType: 'pyq' }).total).toBe(1);
    expect(searchResources(data, { academicYear: '2023-24' }).total).toBe(1);
    expect(searchResources(data, { subject: 'cs13101' }).total).toBe(2);
    expect(searchResources(data, { semester: 5 }).total).toBe(1);
  });
  it('sorts by newest and by title', () => {
    expect(searchResources(data, { sort: 'newest' }).items[0].title).toBe('DSA lab manual');
    expect(searchResources(data, { sort: 'title' }).items.map((r) => r.title)).toEqual([
      'DSA lab manual',
      'Endsem 2023 paper',
      'Thermodynamics midsem',
      'Trees and graphs notes',
    ]);
  });
  it('paginates and clamps bad page values', () => {
    const p1 = searchResources(data, { pageSize: 3, page: 1 });
    const p2 = searchResources(data, { pageSize: 3, page: 2 });
    expect(p1.items).toHaveLength(3);
    expect(p2.items).toHaveLength(1);
    expect(p1.totalPages).toBe(2);
    expect(searchResources(data, { pageSize: 10_000, page: -4 }).pageSize).toBe(48);
    expect(searchResources(data, { page: -4 }).page).toBe(1);
  });
  it('offers only facets present in the data', () => {
    const f = computeFacets(data);
    expect(f.resourceTypes).toEqual(['pyq', 'notes', 'lab_manual']);
    expect(f.departments).toEqual(['cse', 'me']);
    expect(f.academicYears).toEqual(['2024-25', '2023-24']);
  });
});
