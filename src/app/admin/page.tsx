import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { LocalDate } from '@/components/ui/LocalDate';
import { AccessDenied, ErrorState, SetupNotice } from '@/components/ui/PageStates';
import { requireUser } from '@/lib/auth/session';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';
import { can, isStaff, landingPath, visibleAdminSections } from '@/lib/auth/permissions';
import type { AuditRow } from '@/types/backend';

export default function AdminOverviewPage() {
  return <Overview />;
}

async function Overview() {
  if (!isSupabaseConfigured()) return <SetupNotice />;
  const access = await requireUser('/admin');
  if (!isStaff(access)) return <AccessDenied />;

  // Moderators go straight to their queue and content admins to resources; the full
  // overview is the super admin's landing page.
  const landing = landingPath(access);
  if (landing !== '/admin') redirect(landing);

  const supabase = await createClient();
  const head = (table: string, filter?: (q: any) => any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const q = supabase.from(table).select('*', { count: 'exact', head: true });
    return filter ? filter(q) : q;
  };

  const [pending, inReview, changes, approved, rejected, published, drafts, archived, reports, users, suspended, audit] = await Promise.all([
    can(access, 'contributions.read') ? head('contributions', (q) => q.eq('status', 'pending')) : null,
    can(access, 'contributions.read') ? head('contributions', (q) => q.eq('status', 'in_review')) : null,
    can(access, 'contributions.read') ? head('contributions', (q) => q.eq('status', 'changes_requested')) : null,
    can(access, 'contributions.read') ? head('contributions', (q) => q.eq('status', 'approved')) : null,
    can(access, 'contributions.read') ? head('contributions', (q) => q.eq('status', 'rejected')) : null,
    head('resources', (q) => q.eq('status', 'published')),
    can(access, 'resources.edit') || can(access, 'resources.create') ? head('resources', (q) => q.eq('status', 'draft')) : null,
    can(access, 'resources.edit') || can(access, 'resources.create') ? head('resources', (q) => q.eq('status', 'archived')) : null,
    can(access, 'resources.edit') ? head('resource_reports', (q) => q.eq('status', 'open')) : null,
    can(access, 'users.read') ? head('profiles') : null,
    can(access, 'users.read') ? head('profiles', (q) => q.eq('account_status', 'suspended')) : null,
    can(access, 'audit.read')
      ? supabase.from('audit_logs').select('id, actor_id, action, target_type, target_id, metadata, created_at').order('created_at', { ascending: false }).limit(10)
      : null,
  ]);

  const failed = [pending, inReview, changes, approved, rejected, published, drafts, archived, reports, users, suspended, audit].find((r) => r?.error);
  if (failed?.error) {
    console.error('[admin] overview failed:', failed.error.message);
    return <ErrorState title="We couldn't load the overview" />;
  }

  const stat = (label: string, r: { count: number | null } | null, href: string, tone = 'text-slate-900 dark:text-white') =>
    r ? { label, value: r.count ?? 0, href, tone } : null;
  const cards = [
    stat('Pending review', pending, '/admin/moderation?status=pending', 'text-amber-600'),
    stat('In review', inReview, '/admin/moderation?status=in_review', 'text-indigo-600'),
    stat('Changes requested', changes, '/admin/moderation?status=changes_requested', 'text-orange-600'),
    stat('Approved', approved, '/admin/moderation?status=approved', 'text-emerald-600'),
    stat('Rejected', rejected, '/admin/moderation?status=rejected', 'text-rose-600'),
    stat('Published resources', published, '/admin/resources?status=published'),
    stat('Draft resources', drafts, '/admin/resources?status=draft'),
    stat('Archived resources', archived, '/admin/resources?status=archived'),
    stat('Open reports', reports, '/admin/reports', 'text-amber-600'),
    stat('Accounts', users, '/admin/users'),
    stat('Suspended accounts', suspended, '/admin/users?status=suspended', 'text-rose-600'),
  ].filter((c): c is NonNullable<typeof c> => c !== null);

  const activity = ((audit?.data ?? []) as AuditRow[]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Overview</h2>
        <p className="text-sm text-slate-500">Everything that needs attention across Pairprep.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href}>
            <Card hoverEffect className="p-4">
              <span className="block text-[11px] font-semibold uppercase text-slate-400">{c.label}</span>
              <span className={`mt-1 block text-3xl font-black ${c.tone}`}>{c.value}</span>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent activity</h3>
            {can(access, 'audit.read') && <Link href="/admin/audit" className="text-xs font-semibold text-indigo-600 hover:underline">Full audit log</Link>}
          </div>
          {activity.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No activity recorded yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {activity.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <span>
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">{a.action}</code>{' '}
                    <span className="text-slate-500">{a.target_type}{a.target_id ? ` ${a.target_id.slice(0, 8)}…` : ''}</span>
                  </span>
                  <LocalDate iso={a.created_at} withTime className="text-xs text-slate-400" />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-white">Jump to</h3>
          <ul className="space-y-2">
            {visibleAdminSections(access).map((s) => (
              <li key={s.href}>
                <Link href={s.href} className="block rounded-xl p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <span className="block text-sm font-semibold text-slate-900 dark:text-white">{s.label}</span>
                  <span className="text-xs text-slate-500">{s.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
