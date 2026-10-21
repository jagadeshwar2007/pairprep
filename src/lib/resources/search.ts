// Metadata search over resources. Pure functions so the same logic is used by the API
// and tests. The `ResourceSearchIndex` interface is the seam for a later phase: a
// document-content or vector index can implement it without touching the library UI.

import { RESOURCE_TYPE_INFO, departmentLabel, departmentName } from './constants';
import type {
  Paginated,
  Resource,
  ResourceFacets,
  ResourceSearchQuery,
  ResourceType,
} from './types';

export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 48;

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function tokenize(value: string): string[] {
  const n = normalizeText(value);
  return n ? n.split(' ') : [];
}

const ORDINALS: Record<number, string> = {
  1: 'first 1st',
  2: 'second 2nd',
  3: 'third 3rd',
  4: 'fourth 4th',
  5: 'fifth 5th',
  6: 'sixth 6th',
  7: 'seventh 7th',
  8: 'eighth 8th',
};

/** Builds the denormalised text that is stored on each resource and matched against. */
export function buildSearchText(
  r: Pick<
    Resource,
    | 'title'
    | 'description'
    | 'subject'
    | 'subjectCode'
    | 'unit'
    | 'keywords'
    | 'department'
    | 'semester'
    | 'academicYear'
    | 'resourceType'
    | 'fileName'
  >
): string {
  const typeInfo = RESOURCE_TYPE_INFO[r.resourceType];
  const parts = [
    r.title,
    r.description,
    r.subject,
    r.subjectCode ?? '',
    r.unit ? `unit ${r.unit}` : '',
    r.keywords.join(' '),
    departmentLabel(r.department),
    departmentName(r.department),
    `sem ${r.semester} semester ${r.semester} ${ORDINALS[r.semester] ?? ''}`,
    r.academicYear ?? '',
    typeInfo ? `${typeInfo.label} ${typeInfo.shortLabel}` : '',
    r.resourceType === 'pyq' ? 'previous year question paper exam midsem endsem' : '',
    r.fileName.replace(/\.[a-z0-9]+$/i, ''),
  ];
  return normalizeText(parts.join(' '));
}

/** Every query token must prefix-match some word in the resource's search text. */
export function matchesQuery(searchText: string, q: string): boolean {
  const queryTokens = tokenize(q);
  if (queryTokens.length === 0) return true;
  const words = searchText.split(' ');
  return queryTokens.every((t) => words.some((w) => w.startsWith(t)));
}

function scoreResource(r: Resource, q: string): number {
  const tokens = tokenize(q);
  if (tokens.length === 0) return 0;
  const title = normalizeText(r.title);
  const subject = normalizeText(`${r.subject} ${r.subjectCode ?? ''}`);
  let score = 0;
  for (const t of tokens) {
    if (title.split(' ').some((w) => w.startsWith(t))) score += 3;
    if (subject.split(' ').some((w) => w.startsWith(t))) score += 2;
  }
  return score;
}

function matchesSubject(r: Resource, subject: string): boolean {
  const s = subject.trim().toLowerCase();
  return r.subject.toLowerCase() === s || (r.subjectCode ?? '').toLowerCase() === s;
}

export function clampPage(page: number | undefined, pageSize: number | undefined) {
  const size = Math.min(Math.max(Math.trunc(pageSize ?? DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  const p = Math.max(Math.trunc(page ?? 1) || 1, 1);
  return { page: p, pageSize: size };
}

export function searchResources(
  resources: Resource[],
  query: ResourceSearchQuery
): Paginated<Resource> {
  const q = query.q?.trim() ?? '';
  const filtered = resources.filter(
    (r) =>
      (!query.department || r.department === query.department) &&
      (!query.semester || r.semester === query.semester) &&
      (!query.subject || matchesSubject(r, query.subject)) &&
      (!query.resourceType || r.resourceType === query.resourceType) &&
      (!query.academicYear || r.academicYear === query.academicYear) &&
      matchesQuery(r.searchText, q)
  );

  const sort = query.sort ?? 'newest';
  filtered.sort((a, b) => {
    if (q && sort === 'newest') {
      const diff = scoreResource(b, q) - scoreResource(a, q);
      if (diff !== 0) return diff;
    }
    if (sort === 'title') return a.title.localeCompare(b.title, 'en', { sensitivity: 'base' });
    return (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt);
  });

  const { page, pageSize } = clampPage(query.page, query.pageSize);
  const total = filtered.length;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const start = (page - 1) * pageSize;
  return { items: filtered.slice(start, start + pageSize), total, page, pageSize, totalPages };
}

/** Filter values that actually exist in the data, so the UI never offers empty categories. */
export function computeFacets(resources: Resource[]): ResourceFacets {
  const departments = new Set<string>();
  const semesters = new Set<number>();
  const subjects = new Set<string>();
  const types = new Set<ResourceType>();
  const years = new Set<string>();
  for (const r of resources) {
    departments.add(r.department);
    semesters.add(r.semester);
    subjects.add(r.subject);
    types.add(r.resourceType);
    if (r.academicYear) years.add(r.academicYear);
  }
  const typeOrder = Object.keys(RESOURCE_TYPE_INFO) as ResourceType[];
  return {
    departments: [...departments].sort(),
    semesters: [...semesters].sort((a, b) => a - b),
    subjects: [...subjects].sort((a, b) => a.localeCompare(b)),
    resourceTypes: typeOrder.filter((t) => types.has(t)),
    academicYears: [...years].sort().reverse(),
  };
}

export interface ResourceSearchIndex {
  search(query: ResourceSearchQuery): Promise<Paginated<Resource>>;
  facets(): Promise<ResourceFacets>;
}
