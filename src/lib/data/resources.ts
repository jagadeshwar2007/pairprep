import 'server-only';
import { createPublicClient } from '@/lib/supabase/public';
import { RESOURCE_SELECT, toResourceItem } from './resource-mapper';
import type { ResourceItem } from '@/types';

/** Published resources for one subject (by catalog slug). Throws on failure so callers show an error state. */
export async function getSubjectResources(subjectSlug: string): Promise<ResourceItem[]> {
  const { data, error } = await createPublicClient()
    .from('resources')
    .select(RESOURCE_SELECT)
    .eq('status', 'published')
    .eq('subjects.slug', subjectSlug)
    .order('published_at', { ascending: false })
    .limit(200);
  if (error) throw new Error(`getSubjectResources: ${error.message}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row) => toResourceItem(row as any));
}

/** Number of published resources per subject slug, for the semester overview cards. */
export async function getResourceCounts(subjectSlugs: string[]): Promise<Record<string, number>> {
  if (subjectSlugs.length === 0) return {};
  const { data, error } = await createPublicClient()
    .from('resources')
    .select('subjects!inner(slug)')
    .eq('status', 'published')
    .in('subjects.slug', subjectSlugs)
    .limit(5000);
  if (error) throw new Error(`getResourceCounts: ${error.message}`);
  const counts: Record<string, number> = {};
  for (const row of (data ?? []) as unknown as { subjects: { slug: string } }[]) {
    counts[row.subjects.slug] = (counts[row.subjects.slug] ?? 0) + 1;
  }
  return counts;
}
