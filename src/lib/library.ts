import type { ResourceCategory, ResourceItem, Subject } from '@/types';

/**
 * Pure search / filter / sort logic for the resource library.
 * Kept separate from the UI so it is unit tested and reusable when resources come from a backend.
 */

export type LibrarySort = 'relevance' | 'newest' | 'title';

export interface LibraryFilters {
  q: string;
  branch: string; // branchId or ''
  year: string; // yearId or ''
  semester: string; // '1'..'8' or ''
  subject: string; // subject id or ''
  type: string; // ResourceCategory or ''
  sort: LibrarySort;
}

export const EMPTY_FILTERS: LibraryFilters = {
  q: '',
  branch: '',
  year: '',
  semester: '',
  subject: '',
  type: '',
  sort: 'relevance',
};

export const SORT_OPTIONS: Array<{ value: LibrarySort; label: string }> = [
  { value: 'relevance', label: 'Best match' },
  { value: 'newest', label: 'Newest first' },
  { value: 'title', label: 'Title A to Z' },
];

const VALID_SORTS = new Set<string>(SORT_OPTIONS.map((s) => s.value));

export function parseFilters(params: { get(name: string): string | null }): LibraryFilters {
  const sort = params.get('sort') ?? '';
  return {
    q: (params.get('q') ?? '').slice(0, 120),
    branch: params.get('branch') ?? '',
    year: params.get('year') ?? '',
    semester: /^[1-8]$/.test(params.get('semester') ?? '') ? (params.get('semester') as string) : '',
    subject: params.get('subject') ?? '',
    type: params.get('type') ?? '',
    sort: VALID_SORTS.has(sort) ? (sort as LibrarySort) : 'relevance',
  };
}

/** Only non-default values are written, so URLs stay short and shareable. */
export function serializeFilters(filters: LibraryFilters): string {
  const p = new URLSearchParams();
  (Object.keys(EMPTY_FILTERS) as Array<keyof LibraryFilters>).forEach((key) => {
    if (filters[key] !== EMPTY_FILTERS[key]) p.set(key, filters[key]);
  });
  return p.toString();
}

export function hasActiveFilters(filters: LibraryFilters): boolean {
  return (['q', 'branch', 'year', 'semester', 'subject', 'type'] as const).some((k) => filters[k] !== '');
}

function tokens(q: string): string[] {
  return q.toLowerCase().split(/\s+/).filter(Boolean);
}

/** Every query token must appear somewhere in the haystack. Returns a score (0 = no match). */
function score(queryTokens: string[], primary: string, secondary: string): number {
  if (queryTokens.length === 0) return 1;
  const p = primary.toLowerCase();
  const s = secondary.toLowerCase();
  let total = 0;
  for (const t of queryTokens) {
    if (p.includes(t)) total += p.startsWith(t) ? 4 : 3;
    else if (s.includes(t)) total += 1;
    else return 0;
  }
  return total;
}

export interface SubjectResult {
  subject: Subject;
  resourceCount: number;
}

function subjectMatchesStructure(s: Subject, f: LibraryFilters): boolean {
  if (f.branch && s.branchId !== f.branch) return false;
  if (f.year && s.yearId !== f.year) return false;
  if (f.semester && String(s.semester) !== f.semester) return false;
  if (f.subject && s.id !== f.subject) return false;
  return true;
}

export function searchSubjects(subjects: Subject[], resources: ResourceItem[], f: LibraryFilters): SubjectResult[] {
  const qt = tokens(f.q);
  const counts = new Map<string, number>();
  for (const r of resources) {
    if (f.type && r.category !== f.type) continue;
    counts.set(r.subjectId, (counts.get(r.subjectId) ?? 0) + 1);
  }

  const scored: Array<SubjectResult & { score: number }> = [];
  for (const s of subjects) {
    if (!subjectMatchesStructure(s, f)) continue;
    const resourceCount = counts.get(s.id) ?? 0;
    // Filtering by resource type means "subjects that have that type of resource".
    if (f.type && resourceCount === 0) continue;
    const primary = `${s.title ?? s.name} ${s.courseCode || s.code || ''}`;
    const secondary = `${s.branch ?? ''} ${s.branchId} ${s.topics?.join(' ') ?? ''} ${s.note ?? ''}`;
    const sc = score(qt, primary, secondary);
    if (sc > 0) scored.push({ subject: s, resourceCount, score: sc });
  }

  const byStructure = (a: SubjectResult, b: SubjectResult) =>
    a.subject.semester - b.subject.semester ||
    (a.subject.order ?? 0) - (b.subject.order ?? 0) ||
    a.subject.id.localeCompare(b.subject.id);

  scored.sort((a, b) => {
    if (f.sort === 'title') {
      return (a.subject.title ?? a.subject.name).localeCompare(b.subject.title ?? b.subject.name) || byStructure(a, b);
    }
    // 'relevance' and 'newest' (subjects have no date): query score first, then catalog order.
    return b.score - a.score || byStructure(a, b);
  });

  return scored.map(({ subject, resourceCount }) => ({ subject, resourceCount }));
}

export function searchResources(resources: ResourceItem[], f: LibraryFilters): ResourceItem[] {
  const qt = tokens(f.q);
  const scored: Array<{ resource: ResourceItem; score: number }> = [];

  for (const r of resources) {
    if (f.branch && r.branchId !== f.branch) continue;
    if (f.year && r.yearId !== f.year) continue;
    if (f.semester && String(r.semester) !== f.semester) continue;
    if (f.subject && r.subjectId !== f.subject) continue;
    if (f.type && r.category !== f.type) continue;
    const primary = r.title;
    const secondary = `${r.subjectName} ${r.subjectCode} ${r.description ?? ''} ${(r.tags ?? []).join(' ')} ${r.category}`;
    const sc = score(qt, primary, secondary);
    if (sc > 0) scored.push({ resource: r, score: sc });
  }

  scored.sort((a, b) => {
    if (f.sort === 'newest') return b.resource.uploadedAt.localeCompare(a.resource.uploadedAt) || a.resource.id.localeCompare(b.resource.id);
    if (f.sort === 'title') return a.resource.title.localeCompare(b.resource.title);
    return b.score - a.score || a.resource.id.localeCompare(b.resource.id);
  });

  return scored.map((s) => s.resource);
}

export type { ResourceCategory };

/** Non-demo resources, newest first. Empty until real resources exist. */
export function getRecentRealResources(resources: ResourceItem[], limit: number): ResourceItem[] {
  return resources
    .filter((r) => !r.isDemo)
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
    .slice(0, limit);
}
