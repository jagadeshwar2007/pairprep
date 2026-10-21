import type { SupabaseClient } from '@supabase/supabase-js';
import type { AcademicYearId, ResourceCategory, ResourceItem } from '@/types';
import { formatBytes } from '@/lib/files/registry';

/**
 * Columns anonymous visitors may read from public.resources (column-level grants hide who created
 * or published a resource) joined with the catalog. Works with any Supabase client; RLS decides rows.
 */
export const RESOURCE_SELECT =
  'id, title, description, resource_type, external_url, file_name, file_size, mime_type, tags, credit, verified, downloads_count, published_at, ' +
  'subjects!inner(slug, code, name, semester, academic_year, branches!inner(slug, code))';

interface ResourceRow {
  id: string;
  title: string;
  description: string | null;
  resource_type: ResourceCategory;
  external_url: string | null;
  file_size: number | null;
  mime_type: string | null;
  tags: string[] | null;
  credit: string | null;
  verified: boolean;
  downloads_count: number;
  published_at: string | null;
  subjects: {
    slug: string;
    code: string;
    name: string;
    semester: number;
    academic_year: AcademicYearId;
    branches: { slug: string; code: string };
  };
}

function fileTypeOf(row: ResourceRow): ResourceItem['fileType'] {
  if (row.external_url) return 'link';
  if (row.mime_type === 'application/pdf') return 'pdf';
  if (row.mime_type?.startsWith('image/')) return 'image';
  return 'doc';
}

export function toResourceItem(row: ResourceRow): ResourceItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    subjectId: row.subjects.slug,
    subjectName: row.subjects.name,
    subjectCode: row.subjects.code,
    // Keep the real slug: it is part of the route. First-year subjects are common to every branch
    // (the catalog files them under CSE), so only the DISPLAYED code says "All".
    branchId: row.subjects.branches.slug,
    branchCode: row.subjects.academic_year === 'first-year' ? 'All' : row.subjects.branches.code,
    semester: row.subjects.semester,
    yearId: row.subjects.academic_year,
    category: row.resource_type,
    fileType: fileTypeOf(row),
    fileSize: row.file_size ? formatBytes(row.file_size) : undefined,
    hosted: !row.external_url,
    externalUrl: row.external_url ?? undefined,
    author: row.credit ?? undefined,
    uploadedAt: row.published_at ?? new Date(0).toISOString(),
    downloadsCount: row.downloads_count,
    verified: row.verified,
    tags: row.tags ?? [],
  };
}

/** Escapes LIKE wildcards so user input is matched literally. */
export function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export async function fetchLatestResources(client: SupabaseClient, limit = 24): Promise<ResourceItem[]> {
  const { data, error } = await client
    .from('resources')
    .select(RESOURCE_SELECT)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as ResourceRow[]).map(toResourceItem);
}

export async function searchResources(client: SupabaseClient, query: string, limit = 5): Promise<ResourceItem[]> {
  const q = query.trim().slice(0, 80);
  if (q.length < 2) return [];
  const pattern = `%${escapeLike(q)}%`;
  const { data, error } = await client
    .from('resources')
    .select(RESOURCE_SELECT)
    .eq('status', 'published')
    .ilike('title', pattern)
    .order('published_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as ResourceRow[]).map(toResourceItem);
}
