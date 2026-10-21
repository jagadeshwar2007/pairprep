import { AccessDenied, ErrorState, SetupNotice } from '@/components/ui/PageStates';
import { SettingsForms, TransferOwnership, type SettingsValues } from '@/components/admin/SettingsForms';
import { gate } from '@/lib/auth/session';
import { can } from '@/lib/auth/permissions';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';
import { DEFAULT_ALLOWED_KINDS, DEFAULT_MAX_UPLOAD_BYTES, isFileKind } from '@/lib/files/registry';

export default function SettingsPage() {
  return <Settings />;
}

async function Settings() {
  if (!isSupabaseConfigured()) return <SetupNotice />;
  const { allowed, access } = await gate('/admin/settings', ['settings.manage', 'roles.manage']);
  if (!allowed) return <AccessDenied />;

  const supabase = await createClient();
  const { data, error } = await supabase.from('app_settings').select('key, value');
  if (error) {
    console.error('[admin] settings failed:', error.message);
    return <ErrorState title="We couldn't load settings" />;
  }
  const map = new Map((data ?? []).map((r) => [r.key as string, r.value as unknown]));
  const num = (key: string, fallback: number) => (typeof map.get(key) === 'number' ? (map.get(key) as number) : fallback);
  const kinds = map.get('allowed_file_types');
  const domains = map.get('allowed_email_domains');

  const values: SettingsValues = {
    domains: Array.isArray(domains) ? (domains as string[]) : [],
    maxUploadBytes: num('max_upload_bytes', DEFAULT_MAX_UPLOAD_BYTES),
    fileTypes: Array.isArray(kinds) ? kinds.filter(isFileKind) : DEFAULT_ALLOWED_KINDS,
    maxOpen: num('max_open_contributions', 10),
    retentionDays: num('rejected_file_retention_days', 30),
    abandonedHours: num('abandoned_upload_hours', 24),
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Settings</h2>
        <p className="text-sm text-slate-500">Application-wide configuration. Every change is recorded in the audit log.</p>
      </div>
      {can(access, 'settings.manage') ? <SettingsForms values={values} /> : <AccessDenied title="You can't change settings" />}
      {can(access, 'roles.manage') && <TransferOwnership />}
    </div>
  );
}
