import Link from 'next/link';
import { Bell, Bookmark, FileCheck2, Upload } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { LocalDate } from '@/components/ui/LocalDate';
import { ErrorState, SetupNotice } from '@/components/ui/PageStates';
import { StatusBadge } from '@/components/contribute/StatusBadge';
import { CATEGORY_LABELS } from '@/data/resourcesData';
import { requireUser } from '@/lib/auth/session';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';
import { landingPath, isStaff } from '@/lib/auth/permissions';
import { CONTRIBUTION_SELECT, type ContributionRow, type NotificationRow } from '@/types/backend';

export default async function AccountOverviewPage() {
  if (!isSupabaseConfigured()) return <SetupNotice />;
  const access = await requireUser('/account');
  const supabase = await createClient();

  const [contributions, notifications, bookmarks, profile] = await Promise.all([
    supabase.from('contributions').select(CONTRIBUTION_SELECT).order('created_at', { ascending: false }).limit(200),
    supabase.from('notifications').select('id, type, title, message, link, read_at, created_at').order('created_at', { ascending: false }).limit(5),
    supabase.from('bookmarks').select('resource_id', { count: 'exact', head: true }),
    supabase.from('profiles').select('created_at').eq('id', access.userId).maybeSingle(),
  ]);
  if (contributions.error || notifications.error) {
    console.error('[account] overview load failed:', contributions.error?.message ?? notifications.error?.message);
    return <ErrorState title="We couldn't load your dashboard" />;
  }

  const rows = (contributions.data ?? []) as unknown as ContributionRow[];
  const count = (...statuses: string[]) => rows.filter((r) => statuses.includes(r.status)).length;
  const stats = [
    { label: 'Awaiting review', value: count('pending', 'in_review'), tone: 'text-amber-600' },
    { label: 'Need your changes', value: count('changes_requested'), tone: 'text-orange-600' },
    { label: 'Published', value: count('approved'), tone: 'text-emerald-600' },
    { label: 'Not accepted', value: count('rejected'), tone: 'text-rose-600' },
  ];
  const needsAction = rows.filter((r) => r.status === 'changes_requested');

  return (
    <div className="space-y-6">
      <Card className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={access.fullName} email={access.email} src={access.avatarUrl} className="h-16 w-16 text-lg" />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {access.fullName ?? 'Student'}
            </h1>
            <p className="truncate text-sm text-slate-500">{access.email}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <Badge variant={isStaff(access) ? 'primary' : 'neutral'} size="sm">{access.roleName}</Badge>
              {profile.data?.created_at && (
                <span>
                  Member since <LocalDate iso={profile.data.created_at as string} />
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {isStaff(access) && (
            <Link href={landingPath(access)} className="rounded-xl border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 dark:border-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-950/50">
              Open admin panel
            </Link>
          )}
          <Link href="/submit" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700">
            <Upload className="h-4 w-4" /> Contribute a resource
          </Link>
        </div>
      </Card>

      {access.status === 'suspended' && (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
          Your account is suspended. You can still browse resources, but contributing and saving data is disabled. Contact the Pairprep admins to appeal.
        </div>
      )}
      {access.status === 'active' && !access.loginAllowed && (
        <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          Your email domain is not permitted for student accounts, so contributing is disabled.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <span className="block text-[11px] font-semibold uppercase text-slate-400">{s.label}</span>
            <span className={`mt-1 block text-3xl font-black ${s.tone}`}>{s.value}</span>
          </Card>
        ))}
      </div>

      {needsAction.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/60 dark:border-orange-900/60 dark:bg-orange-950/20">
          <h2 className="mb-3 text-sm font-bold text-orange-900 dark:text-orange-200">Moderators asked for changes</h2>
          <ul className="space-y-2">
            {needsAction.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-medium text-slate-900 dark:text-white">{c.title}</span>
                <Link href={`/account/contributions/${c.id}`} className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
                  See feedback &amp; resubmit
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <FileCheck2 className="h-4 w-4 text-indigo-500" /> Recent contributions
            </h2>
            <Link href="/account/contributions" className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400">View all</Link>
          </div>
          {rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              You haven&apos;t contributed yet. <Link href="/submit" className="font-semibold text-indigo-600 hover:underline">Share your first resource.</Link>
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.slice(0, 5).map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link href={`/account/contributions/${c.id}`} className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-900 hover:text-indigo-600 dark:text-white">{c.title}</span>
                    <span className="text-xs text-slate-500">
                      {c.subjects?.code} • {CATEGORY_LABELS[c.resource_type]?.label}
                    </span>
                  </Link>
                  <StatusBadge status={c.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <Bell className="h-4 w-4 text-indigo-500" /> Latest notifications
            </h2>
            <Link href="/account/notifications" className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400">View all</Link>
          </div>
          {((notifications.data ?? []) as NotificationRow[]).length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">Nothing yet. You&apos;ll hear from us when a moderator reviews your work.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {((notifications.data ?? []) as NotificationRow[]).map((n) => (
                <li key={n.id} className="py-2.5">
                  <p className={`text-sm ${n.read_at ? 'text-slate-600 dark:text-slate-300' : 'font-semibold text-slate-900 dark:text-white'}`}>{n.title}</p>
                  <p className="line-clamp-2 text-xs text-slate-500">{n.message}</p>
                  <LocalDate iso={n.created_at} withTime className="text-[11px] text-slate-400" />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <Bookmark className="h-4 w-4 text-indigo-500" />
          {bookmarks.count ?? 0} saved {bookmarks.count === 1 ? 'resource' : 'resources'}
        </span>
        <Link href="/account/bookmarks" className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400">Open bookmarks</Link>
      </Card>
    </div>
  );
}
