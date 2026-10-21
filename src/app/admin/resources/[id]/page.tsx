import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LocalDate } from '@/components/ui/LocalDate';
import { AccessDenied, ErrorState, SetupNotice } from '@/components/ui/PageStates';
import { ResourceForm, type ResourceFormInitial } from '@/components/admin/ResourceForm';
import { ResourceRowActions } from '@/components/admin/ResourceRowActions';
import { ReportActions } from '@/components/admin/ReportActions';
import { gate } from '@/lib/auth/session';
import { can } from '@/lib/auth/permissions';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';
import { RESOURCE_SELECT } from '@/lib/data/resource-mapper';
import type { ResourceCategory } from '@/types';

type Params = Promise<{ id: string }>;

export default function EditResourcePage({ params }: { params: Params }) {
  return <EditResource params={params} />;
}

interface Row {
  id: string;
  title: string;
  description: string | null;
  resource_type: ResourceCategory;
  external_url: string | null;
  file_name: string | null;
  tags: string[] | null;
  credit: string | null;
  verified: boolean;
  downloads_count: number;
  status: 'draft' | 'published' | 'archived';
  updated_at: string;
  subjects: { slug: string };
}

async function EditResource({ params }: { params: Params }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  if (!isSupabaseConfigured()) return <SetupNotice />;
  const { allowed, access } = await gate(`/admin/resources/${id}`, ['resources.edit']);
  if (!allowed) return <AccessDenied title="You can't edit resources" />;

  const supabase = await createClient();
  const [resource, reports] = await Promise.all([
    supabase.from('resources').select(`${RESOURCE_SELECT}, status, updated_at`).eq('id', id).maybeSingle(),
    supabase.from('resource_reports').select('id, reason, details, status, created_at').eq('resource_id', id).order('created_at', { ascending: false }).limit(20),
  ]);
  if (resource.error || reports.error) {
    console.error('[admin] resource load failed:', resource.error?.message ?? reports.error?.message);
    return <ErrorState title="We couldn't load this resource" />;
  }
  if (!resource.data) notFound();
  const r = resource.data as unknown as Row;

  const initial: ResourceFormInitial = {
    id: r.id,
    title: r.title,
    description: r.description ?? '',
    subjectSlug: r.subjects.slug,
    category: r.resource_type,
    tags: r.tags ?? [],
    credit: r.credit ?? '',
    verified: r.verified,
    status: r.status,
    current: r.external_url ? { kind: 'link', url: r.external_url } : { kind: 'file', fileName: r.file_name },
  };
  const reportRows = (reports.data ?? []) as { id: string; reason: string; details: string | null; status: string; created_at: string }[];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/admin/resources" className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400">← Resources</Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{r.title}</h2>
          <p className="text-xs text-slate-500">{r.downloads_count} downloads • edited <LocalDate iso={r.updated_at} withTime /></p>
        </div>
        <Badge variant={r.status === 'published' ? 'success' : r.status === 'draft' ? 'warning' : 'neutral'}>{r.status}</Badge>
      </div>

      <Card>
        <ResourceRowActions
          id={r.id}
          status={r.status}
          size="md"
          can={{ publish: can(access, 'resources.publish'), archive: can(access, 'resources.archive'), delete: can(access, 'resources.delete') }}
        />
      </Card>

      <ResourceForm mode="edit" userId={access.userId} canPublish={can(access, 'resources.publish')} initial={initial} />

      <Card className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Reports about this resource</h3>
        {reportRows.length === 0 ? (
          <p className="text-sm text-slate-500">No reports.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {reportRows.map((rep) => (
              <li key={rep.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0 text-sm">
                  <p className="font-medium text-slate-900 dark:text-white">{rep.reason.replace(/-/g, ' ')} <Badge size="sm" variant={rep.status === 'open' ? 'warning' : 'neutral'}>{rep.status}</Badge></p>
                  {rep.details && <p className="mt-0.5 whitespace-pre-line text-xs text-slate-500">{rep.details}</p>}
                  <LocalDate iso={rep.created_at} withTime className="text-xs text-slate-400" />
                </div>
                {rep.status === 'open' && <ReportActions id={rep.id} />}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
