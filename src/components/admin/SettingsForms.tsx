'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { updateSetting } from '@/actions/settings';
import { transferSuperAdmin } from '@/actions/users';
import { getBrowserClient } from '@/lib/supabase/client';
import { escapeLike } from '@/lib/data/resource-mapper';
import { sanitizeSearch } from '@/lib/admin/query';
import { FILE_KINDS, FILE_KIND_INFO, type FileKind } from '@/lib/files/registry';
import { ROLE_LABELS } from '@/lib/auth/permissions';

type Notice = { ok: boolean; text: string } | null;

function NoticeLine({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return (
    <p role={notice.ok ? 'status' : 'alert'} className={`flex items-start gap-2 text-sm ${notice.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
      {notice.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
      {notice.text}
    </p>
  );
}

function useSave() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [notice, setNotice] = useState<Notice>(null);
  const save = (task: () => Promise<{ ok: boolean; message?: string; error?: string }>, onDone?: () => void) =>
    start(async () => {
      setNotice(null);
      const result = await task();
      setNotice({ ok: result.ok, text: (result.ok ? result.message : result.error) ?? (result.ok ? 'Saved.' : 'Something went wrong.') });
      if (result.ok) {
        router.refresh();
        onDone?.();
      }
    });
  return { pending, notice, save };
}

const lbl = 'mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300';

export interface SettingsValues {
  domains: string[];
  maxUploadBytes: number;
  fileTypes: FileKind[];
  maxOpen: number;
  retentionDays: number;
  abandonedHours: number;
}

export function SettingsForms({ values }: { values: SettingsValues }) {
  const domains = useSave();
  const uploads = useSave();
  const limits = useSave();
  const [domainText, setDomainText] = useState(values.domains.join('\n'));
  const [maxMb, setMaxMb] = useState(String(Math.round(values.maxUploadBytes / (1024 * 1024))));
  const [types, setTypes] = useState<FileKind[]>(values.fileTypes);
  const [maxOpen, setMaxOpen] = useState(String(values.maxOpen));
  const [retention, setRetention] = useState(String(values.retentionDays));
  const [abandoned, setAbandoned] = useState(String(values.abandonedHours));

  return (
    <div className="space-y-6">
      <Card>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const list = domainText.split(/[\s,;]+/).map((d) => d.trim().toLowerCase().replace(/^@/, '')).filter(Boolean);
            domains.save(() => updateSetting({ key: 'allowed_email_domains', value: list }));
          }}
        >
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">College email domain</h3>
            <p className="text-xs text-slate-500">
              Leave empty while developing to allow any Google account. When set, only these domains can register or contribute
              (one per line, e.g. <code>college.edu</code>). Staff accounts are exempt so you can never lock yourself out. Enforced by the
              database and, if enabled, the Supabase Auth &ldquo;Before User Created&rdquo; hook.
            </p>
          </div>
          <div>
            <label htmlFor="domains" className={lbl}>Allowed domains</label>
            <textarea id="domains" rows={3} value={domainText} onChange={(e) => setDomainText(e.target.value)} placeholder="Not restricted"
              className="w-full rounded-xl border border-slate-200 bg-white p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900" />
          </div>
          <NoticeLine notice={domains.notice} />
          <Button type="submit" isLoading={domains.pending}>Save domains</Button>
        </form>
      </Card>

      <Card>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            uploads.save(async () => {
              const first = await updateSetting({ key: 'max_upload_bytes', value: Math.round(Number(maxMb) * 1024 * 1024) });
              if (!first.ok) return first;
              return updateSetting({ key: 'allowed_file_types', value: types });
            });
          }}
        >
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Uploads</h3>
            <p className="text-xs text-slate-500">Applies to new uploads. The platform hard cap is 50 MB. Files are always verified by content, never by name.</p>
          </div>
          <div className="max-w-xs">
            <label htmlFor="max-mb" className={lbl}>Maximum file size (MB)</label>
            <Input id="max-mb" type="number" min={1} max={50} value={maxMb} onChange={(e) => setMaxMb(e.target.value)} />
          </div>
          <fieldset>
            <legend className={lbl}>Accepted file types</legend>
            <div className="flex flex-wrap gap-3">
              {FILE_KINDS.map((k) => (
                <label key={k} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input type="checkbox" checked={types.includes(k)} className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                    onChange={(e) => setTypes((t) => (e.target.checked ? [...t, k] : t.filter((x) => x !== k)))} />
                  {FILE_KIND_INFO[k].label}
                </label>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">Other formats (for example ZIP or video) are not supported.</p>
          </fieldset>
          <NoticeLine notice={uploads.notice} />
          <Button type="submit" isLoading={uploads.pending} disabled={types.length === 0}>Save upload settings</Button>
        </form>
      </Card>

      <Card>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            limits.save(async () => {
              for (const [key, value] of [['max_open_contributions', maxOpen], ['rejected_file_retention_days', retention], ['abandoned_upload_hours', abandoned]] as const) {
                const r = await updateSetting({ key, value: Number(value) });
                if (!r.ok) return r;
              }
              return { ok: true, message: 'Limits saved.' };
            });
          }}
        >
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Limits &amp; retention</h3>
            <p className="text-xs text-slate-500">The retention job (daily cron) deletes files of rejected submissions and abandoned uploads after these periods.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="max-open" className={lbl}>Open submissions per student</label>
              <Input id="max-open" type="number" min={1} max={50} value={maxOpen} onChange={(e) => setMaxOpen(e.target.value)} />
            </div>
            <div>
              <label htmlFor="retention" className={lbl}>Keep rejected files (days)</label>
              <Input id="retention" type="number" min={7} max={365} value={retention} onChange={(e) => setRetention(e.target.value)} />
            </div>
            <div>
              <label htmlFor="abandoned" className={lbl}>Purge unused uploads after (hours)</label>
              <Input id="abandoned" type="number" min={1} max={168} value={abandoned} onChange={(e) => setAbandoned(e.target.value)} />
            </div>
          </div>
          <NoticeLine notice={limits.notice} />
          <Button type="submit" isLoading={limits.pending}>Save limits</Button>
        </form>
      </Card>
    </div>
  );
}

interface Candidate {
  id: string;
  full_name: string | null;
  email: string;
  account_status: string;
}

export function TransferOwnership() {
  const router = useRouter();
  const { pending, notice, save } = useSave();
  const [email, setEmail] = useState('');
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [demoteTo, setDemoteTo] = useState<'student' | 'file_moderator' | 'content_admin'>('content_admin');
  const [confirmation, setConfirmation] = useState('');

  const lookup = async () => {
    setLookupError(null);
    setCandidate(null);
    const clean = sanitizeSearch(email).toLowerCase();
    if (!clean.includes('@')) return setLookupError('Enter the full email address of the new owner.');
    const { data, error } = await getBrowserClient()
      .from('profiles')
      .select('id, full_name, email, account_status')
      .ilike('email', escapeLike(clean))
      .maybeSingle();
    if (error) return setLookupError('Lookup failed. Please try again.');
    if (!data) return setLookupError('No account with that email. They must sign in with Google once first.');
    setCandidate(data as Candidate);
  };

  return (
    <Card className="space-y-4 border-rose-200 dark:border-rose-900/60">
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Transfer ownership</h3>
        <p className="text-xs text-slate-500">
          There is exactly one super admin. Transferring makes someone else the owner and demotes you, in a single atomic, audited step.
          This cannot be undone by you afterwards.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor="new-owner" className={lbl}>New owner&apos;s email</label>
          <Input id="new-owner" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@college.edu" icon={<Search className="h-4 w-4" />} />
        </div>
        <Button type="button" variant="outline" onClick={() => void lookup()}>Find account</Button>
      </div>
      {lookupError && <p role="alert" className="text-sm text-rose-600">{lookupError}</p>}

      {candidate && (
        <div className="space-y-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <p className="text-sm text-slate-700 dark:text-slate-200">
            Make <strong>{candidate.full_name ?? candidate.email}</strong> ({candidate.email}) the super admin?
            {candidate.account_status !== 'active' && <span className="block text-rose-600">This account is suspended and can&apos;t become the owner.</span>}
          </p>
          <div className="max-w-xs">
            <label htmlFor="demote" className={lbl}>Your role afterwards</label>
            <Select id="demote" value={demoteTo} onChange={(e) => setDemoteTo(e.target.value as typeof demoteTo)}>
              {(['content_admin', 'file_moderator', 'student'] as const).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </Select>
          </div>
          <div className="max-w-sm">
            <label htmlFor="confirm" className={lbl}>Type TRANSFER SUPER ADMIN to confirm</label>
            <Input id="confirm" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} autoComplete="off" />
          </div>
          <Button
            variant="danger"
            isLoading={pending}
            disabled={confirmation !== 'TRANSFER SUPER ADMIN' || candidate.account_status !== 'active'}
            onClick={() => save(() => transferSuperAdmin({ newOwner: candidate.id, demoteTo, confirmation }), () => router.push('/account'))}
          >
            Transfer ownership
          </Button>
        </div>
      )}
      <NoticeLine notice={notice} />
    </Card>
  );
}
