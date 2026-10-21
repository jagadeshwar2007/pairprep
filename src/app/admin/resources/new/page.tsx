import Link from 'next/link';
import { AccessDenied, SetupNotice } from '@/components/ui/PageStates';
import { ResourceForm } from '@/components/admin/ResourceForm';
import { gate } from '@/lib/auth/session';
import { can } from '@/lib/auth/permissions';
import { isSupabaseConfigured } from '@/lib/supabase/env';

export default function NewResourcePage() {
  return <NewResource />;
}

async function NewResource() {
  if (!isSupabaseConfigured()) return <SetupNotice />;
  const { allowed, access } = await gate('/admin/resources/new', ['resources.create']);
  if (!allowed) return <AccessDenied />;
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/admin/resources" className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400">← Resources</Link>
      <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">New resource</h2>
      <ResourceForm mode="create" userId={access.userId} canPublish={can(access, 'resources.publish')} />
    </div>
  );
}
