'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, ExternalLink, FileText, Link2, Loader2, ShieldCheck, Upload, X,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { ACADEMIC_YEARS, BRANCHES, SUBJECTS } from '@/data/academicData';
import { CATEGORY_LABELS } from '@/data/resourcesData';
import type { ResourceCategory } from '@/types';
import { useAuth } from '@/components/auth/AuthProvider';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { getBrowserClient } from '@/lib/supabase/client';
import {
  DEFAULT_ALLOWED_KINDS, DEFAULT_MAX_UPLOAD_BYTES, FILE_KIND_INFO, formatBytes, isFileKind, kindFromFileName,
  newUploadPath, type FileKind,
} from '@/lib/files/registry';
import { describeExternalHost, parseSafeHttpsUrl } from '@/lib/files/urls';
import { finalizeUpload } from '@/actions/uploads';
import { resubmitContribution, submitContribution } from '@/actions/contributions';

export interface ContributionInitial {
  subjectSlug?: string;
  title?: string;
  description?: string;
  category?: ResourceCategory;
  credit?: string;
  /** Resubmission only: what is currently attached. */
  current?: { kind: 'file'; fileName: string } | { kind: 'link'; url: string } | { kind: 'removed' };
}

interface ContributionFormProps {
  mode?: 'new' | 'resubmit';
  contributionId?: string;
  initial?: ContributionInitial;
}

type Limits = { kinds: FileKind[]; maxBytes: number };
type SourceChoice = 'keep' | 'file' | 'link';
type Stage = 'idle' | 'uploading' | 'verifying' | 'submitting';

const STAGE_TEXT: Record<Exclude<Stage, 'idle'>, string> = {
  uploading: 'Uploading your file…',
  verifying: 'Checking the file…',
  submitting: 'Submitting for review…',
};

function labelClass() {
  return 'block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5';
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1 flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400">
      <AlertCircle className="h-3 w-3 shrink-0" /> {message}
    </p>
  );
}

function storageErrorMessage(message: string): string {
  if (/row-level security|unauthorized|not allowed/i.test(message)) return 'You are not allowed to upload right now. Is your account active?';
  if (/exceeded|too large|payload/i.test(message)) return 'That file is too large.';
  if (/mime|not supported|invalid/i.test(message)) return 'That file type is not accepted.';
  if (/duplicate|already exists/i.test(message)) return 'That upload already exists. Please try again.';
  return 'The upload failed. Check your connection and try again.';
}

export function ContributionForm({ mode = 'new', contributionId, initial }: ContributionFormProps) {
  const { status, access } = useAuth();
  const resubmitting = mode === 'resubmit';
  // "Submit notes for this course" links here with ?subject=<slug>.
  const presetSlug = useSearchParams().get('subject');
  const initialSubject = SUBJECTS.find((s) => s.id === (initial?.subjectSlug ?? presetSlug));

  const [step, setStep] = useState(1);
  const [yearId, setYearId] = useState(initialSubject?.yearId ?? 'second-year');
  const [branchId, setBranchId] = useState(initialSubject?.branchId ?? 'cse');
  const [semester, setSemester] = useState(String(initialSubject?.semester ?? 3));
  const [subjectSlug, setSubjectSlug] = useState(initialSubject?.id ?? '');
  const [category, setCategory] = useState<ResourceCategory>(initial?.category ?? 'notes');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [credit, setCredit] = useState(initial?.credit ?? '');
  const [source, setSource] = useState<SourceChoice>(resubmitting && initial?.current?.kind !== 'removed' ? 'keep' : 'file');
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [agreed, setAgreed] = useState(false);

  const [limits, setLimits] = useState<Limits>({ kinds: DEFAULT_ALLOWED_KINDS, maxBytes: DEFAULT_MAX_UPLOAD_BYTES });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [stage, setStage] = useState<Stage>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState<{ id: string } | null>(null);
  // A file that was uploaded and verified stays reusable if the final submit step fails.
  const verified = useRef<{ fileKey: string; path: string } | null>(null);
  const dropRef = useRef<HTMLInputElement>(null);

  // Allowed file types / size limit are public settings, managed by the super admin.
  useEffect(() => {
    let cancelled = false;
    void getBrowserClient()
      .from('app_settings')
      .select('key, value')
      .in('key', ['allowed_file_types', 'max_upload_bytes'])
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        const map = new Map(data.map((r) => [r.key as string, r.value]));
        const kinds = map.get('allowed_file_types');
        const max = map.get('max_upload_bytes');
        setLimits({
          kinds: Array.isArray(kinds) ? (kinds.filter(isFileKind) as FileKind[]) : DEFAULT_ALLOWED_KINDS,
          maxBytes: typeof max === 'number' ? max : DEFAULT_MAX_UPLOAD_BYTES,
        });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Pre-fill branch / year / semester from the student's saved preferences (never overrides a chosen subject).
  const userId = access?.userId;
  const prefsApplied = useRef(false);
  useEffect(() => {
    if (!userId || resubmitting || initialSubject || prefsApplied.current) return;
    prefsApplied.current = true;
    const supabase = getBrowserClient();
    void Promise.all([
      supabase.from('user_preferences').select('default_branch_id, default_academic_year, default_semester').eq('user_id', userId).maybeSingle(),
      supabase.from('branches').select('id, slug'),
    ]).then(([prefs, branches]) => {
      const p = prefs.data;
      if (prefs.error || branches.error || !p) return;
      const slug = (branches.data ?? []).find((b) => b.id === p.default_branch_id)?.slug as string | undefined;
      if (slug && BRANCHES.some((b) => b.id === slug)) setBranchId(slug);
      const y = ACADEMIC_YEARS.find((yr) => yr.id === p.default_academic_year);
      if (y) {
        setYearId(y.id);
        const sem = Number(p.default_semester);
        setSemester(String(y.semesters.includes(sem) ? sem : y.semesters[0]));
      }
    });
  }, [userId, resubmitting, initialSubject]);

  const year = ACADEMIC_YEARS.find((y) => y.id === yearId) ?? ACADEMIC_YEARS[0];
  const semesterNumber = Number(semester);
  const availableSubjects = useMemo(
    () => SUBJECTS.filter((s) => s.semester === semesterNumber && (s.branchId === branchId || s.yearId === 'first-year')),
    [semesterNumber, branchId],
  );
  // Keep the subject valid when branch / semester change.
  const effectiveSubject = availableSubjects.find((s) => s.id === subjectSlug) ?? availableSubjects[0];
  const accept = limits.kinds.map((k) => `.${FILE_KIND_INFO[k].ext}${k === 'jpg' ? ',.jpeg' : ''}`).join(',');
  const parsedUrl = parseSafeHttpsUrl(url);

  const onYearChange = (id: string) => {
    setYearId(id as typeof yearId);
    const first = ACADEMIC_YEARS.find((y) => y.id === id)?.semesters[0] ?? 3;
    setSemester(String(first));
  };

  const pickFile = (picked: File | undefined | null) => {
    if (!picked) return;
    const kind = kindFromFileName(picked.name);
    if (!kind || !limits.kinds.includes(kind)) {
      setErrors((e) => ({ ...e, source: `Accepted file types: ${limits.kinds.map((k) => FILE_KIND_INFO[k].label).join(', ')}.` }));
      return;
    }
    if (picked.size > limits.maxBytes) {
      setErrors((e) => ({ ...e, source: `That file is ${formatBytes(picked.size)}. The limit is ${formatBytes(limits.maxBytes)}.` }));
      return;
    }
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([key]) => key !== 'source')));
    setFile(picked);
  };

  const validateStep = (target: number): boolean => {
    const next: Record<string, string> = {};
    if (target >= 1) {
      if (title.trim().length < 5) next.title = 'Title must be at least 5 characters.';
      if (title.trim().length > 160) next.title = 'Title must be at most 160 characters.';
      if (!effectiveSubject) next.subject = 'No subjects are catalogued for this branch and semester yet.';
    }
    if (target >= 2) {
      if (source === 'file' && !file) next.source = 'Choose a file to upload.';
      if (source === 'link') {
        if (!url.trim()) next.source = 'Paste the link to your file.';
        else if (!parsedUrl) next.source = 'Enter a public https:// link (no localhost, IP addresses or logins in the URL).';
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const goNext = () => {
    if (validateStep(step)) setStep((s) => Math.min(3, s + 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(2) || !effectiveSubject || !access) return;
    setSubmitError(null);

    try {
      let sourceInput: { mode: 'file'; path: string; originalName: string } | { mode: 'link'; url: string } | { mode: 'keep' };

      if (source === 'keep') {
        sourceInput = { mode: 'keep' };
      } else if (source === 'link') {
        sourceInput = { mode: 'link', url: parsedUrl as string };
      } else {
        const picked = file as File;
        const kind = kindFromFileName(picked.name) as FileKind;
        const fileKey = `${picked.name}:${picked.size}:${picked.lastModified}`;
        let path = verified.current?.fileKey === fileKey ? verified.current.path : null;

        if (!path) {
          setStage('uploading');
          const newPath = newUploadPath('contributions-private', access.userId, kind);
          const { error: uploadError } = await getBrowserClient()
            .storage.from('contributions-private')
            .upload(newPath, picked, { contentType: FILE_KIND_INFO[kind].mime, upsert: false, cacheControl: '3600' });
          if (uploadError) throw new Error(storageErrorMessage(uploadError.message));

          setStage('verifying');
          const checked = await finalizeUpload({ bucket: 'contributions-private', path: newPath, originalName: picked.name });
          if (!checked.ok) throw new Error(checked.error);
          verified.current = { fileKey, path: newPath };
          path = newPath;
        }
        sourceInput = { mode: 'file', path, originalName: picked.name };
      }

      setStage('submitting');
      const payload = {
        subjectSlug: effectiveSubject.id,
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        credit: credit.trim() || undefined,
        source: sourceInput,
      };
      const result = resubmitting
        ? await resubmitContribution({ ...payload, contributionId })
        : await submitContribution(payload);
      if (!result.ok) throw new Error(result.error);
      setDone({ id: resubmitting ? (contributionId as string) : (result.data as { id: string }).id });
    } catch (error) {
      setSubmitError((error as Error).message || 'Something went wrong. Please try again.');
    } finally {
      setStage('idle');
    }
  };

  // ---------------------------------------------------------------- gates
  if (status === 'loading') {
    return <div className="h-96 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800/50" aria-busy="true" />;
  }
  if (status === 'unconfigured') {
    return (
      <Card className="p-8 text-center text-sm text-slate-600 dark:text-slate-300">
        Contributions are unavailable because the backend is not configured for this deployment.
      </Card>
    );
  }
  if (status !== 'signed_in' || !access) {
    return (
      <Card className="mx-auto max-w-md space-y-4 p-8 text-center">
        <ShieldCheck className="mx-auto h-9 w-9 text-indigo-500" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Sign in to contribute</h2>
        <p className="text-sm text-slate-500">
          Contributions are tied to your account so moderators can follow up and you can track the review.
        </p>
        <GoogleSignInButton next="/submit" />
      </Card>
    );
  }
  if (!access.loginAllowed) {
    return (
      <Card className="mx-auto max-w-md space-y-2 p-8 text-center">
        <AlertCircle className="mx-auto h-9 w-9 text-rose-500" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Contributing is unavailable</h2>
        <p className="text-sm text-slate-500">
          {access.status === 'suspended'
            ? 'Your account is suspended. Contact the Pairprep admins if you think this is a mistake.'
            : 'Your account is not permitted to contribute (check the allowed email domain).'}
        </p>
      </Card>
    );
  }

  if (done) {
    return (
      <Card className="text-center p-8 sm:p-12 space-y-5 border-emerald-200 dark:border-emerald-900/60">
        <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {resubmitting ? 'Resubmitted for review' : 'Submitted for review'}
          </h2>
          <p className="mx-auto max-w-md text-sm text-slate-600 dark:text-slate-400">
            &ldquo;<strong>{title}</strong>&rdquo; is now private and waiting for a moderator. You&apos;ll get a notification when
            it&apos;s approved, rejected, or if changes are needed.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Link href={`/account/contributions/${done.id}`}>
            <Button variant="primary">Track this contribution</Button>
          </Link>
          {!resubmitting && (
            <Button
              variant="outline"
              onClick={() => {
                setDone(null);
                setStep(1);
                setTitle('');
                setDescription('');
                setFile(null);
                setUrl('');
                setAgreed(false);
                verified.current = null;
              }}
            >
              Submit another
            </Button>
          )}
        </div>
      </Card>
    );
  }

  const busy = stage !== 'idle';
  const steps = ['Details', 'File or link', 'Review'];

  // ---------------------------------------------------------------- form
  return (
    <div className="space-y-6">
      <ol className="flex items-center gap-2 text-xs font-semibold" aria-label="Progress">
        {steps.map((label, i) => {
          const n = i + 1;
          const active = step === n;
          return (
            <li key={label} className="flex flex-1 items-center gap-2" aria-current={active ? 'step' : undefined}>
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] ${
                  step > n ? 'bg-emerald-500 text-white' : active ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500 dark:bg-slate-800'
                }`}
              >
                {step > n ? '✓' : n}
              </span>
              <span className={active ? 'text-slate-900 dark:text-white' : 'text-slate-400'}>{label}</span>
              {n < steps.length && <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />}
            </li>
          );
        })}
      </ol>

      {/* ---------------- Step 1: details ---------------- */}
      {step === 1 && (
        <Card className="space-y-6 p-6 sm:p-8">
          <div>
            <label htmlFor="c-title" className={labelClass()}>Resource title <span className="text-rose-500">*</span></label>
            <Input
              id="c-title"
              value={title}
              maxLength={160}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 2024 Endsem solved paper or Module 2 Trees notes"
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? 'c-title-err' : undefined}
              className={errors.title ? 'border-rose-500' : ''}
            />
            <FieldError id="c-title-err" message={errors.title} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="c-branch" className={labelClass()}>Branch</label>
              <Select id="c-branch" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                {BRANCHES.map((b) => (
                  <option key={b.id} value={b.id}>{b.code} - {b.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <label htmlFor="c-year" className={labelClass()}>Academic year</label>
              <Select id="c-year" value={yearId} onChange={(e) => onYearChange(e.target.value)}>
                {ACADEMIC_YEARS.map((y) => (
                  <option key={y.id} value={y.id}>{y.title} ({y.badge})</option>
                ))}
              </Select>
            </div>
            <div>
              <label htmlFor="c-sem" className={labelClass()}>Semester</label>
              <Select id="c-sem" value={semester} onChange={(e) => setSemester(e.target.value)}>
                {year.semesters.map((n) => (
                  <option key={n} value={n}>Semester {n}</option>
                ))}
              </Select>
            </div>
            <div>
              <label htmlFor="c-cat" className={labelClass()}>Category</label>
              <Select id="c-cat" value={category} onChange={(e) => setCategory(e.target.value as ResourceCategory)}>
                {Object.entries(CATEGORY_LABELS).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <label htmlFor="c-subject" className={labelClass()}>Subject <span className="text-rose-500">*</span></label>
            {availableSubjects.length > 0 ? (
              <Select id="c-subject" value={effectiveSubject?.id ?? ''} onChange={(e) => setSubjectSlug(e.target.value)}>
                {availableSubjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                ))}
              </Select>
            ) : (
              <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                No subjects are catalogued for this branch and semester yet. Pick another semester, or ask an admin to add the course.
              </p>
            )}
            <FieldError id="c-subject-err" message={errors.subject} />
          </div>

          <div>
            <label htmlFor="c-desc" className={labelClass()}>Description (optional)</label>
            <textarea
              id="c-desc"
              rows={3}
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does it cover? Which exam or year is it from?"
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900"
            />
          </div>

          <div>
            <label htmlFor="c-credit" className={labelClass()}>Public credit (optional)</label>
            <Input
              id="c-credit"
              value={credit}
              maxLength={120}
              onChange={(e) => setCredit(e.target.value)}
              placeholder="e.g. Aakash V., CSE 2027. Leave empty to stay anonymous."
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Your name and email are never shown publicly unless you type them here.
            </p>
          </div>
        </Card>
      )}

      {/* ---------------- Step 2: source ---------------- */}
      {step === 2 && (
        <Card className="space-y-5 p-6 sm:p-8">
          {resubmitting && initial?.current && initial.current.kind !== 'removed' && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-900/60">
              <span className="font-semibold">Currently attached: </span>
              {initial.current.kind === 'file' ? initial.current.fileName : initial.current.url}
            </div>
          )}
          {resubmitting && initial?.current?.kind === 'removed' && (
            <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              The previous file was removed after the retention period. Please attach it again.
            </p>
          )}

          <div role="radiogroup" aria-label="How do you want to share it?" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {([
              ...(resubmitting && initial?.current?.kind !== 'removed' ? [['keep', 'Keep current', FileText]] : []),
              ['file', 'Upload a file', Upload],
              ['link', 'Share a link', Link2],
            ] as [SourceChoice, string, React.ComponentType<{ className?: string }>][]).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={source === id}
                onClick={() => {
                  setSource(id);
                  setErrors({});
                }}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium cursor-pointer transition-colors ${
                  source === id
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>

          {source === 'file' && (
            <div className="space-y-2">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  pickFile(e.dataTransfer.files?.[0]);
                }}
                className="rounded-2xl border-2 border-dashed border-slate-300 p-6 text-center transition-colors hover:border-indigo-500 dark:border-slate-700"
              >
                <input
                  ref={dropRef}
                  id="c-file"
                  type="file"
                  className="sr-only"
                  accept={accept}
                  onChange={(e) => pickFile(e.target.files?.[0])}
                />
                {file ? (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50/70 p-3 text-left dark:border-indigo-800 dark:bg-indigo-950/50">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
                        <FileText className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">{file.name}</div>
                        <div className="text-xs text-slate-500">{formatBytes(file.size)}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label="Remove file"
                      onClick={() => {
                        setFile(null);
                        if (dropRef.current) dropRef.current.value = '';
                      }}
                      className="rounded-lg p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ) : (
                  <label htmlFor="c-file" className="flex cursor-pointer flex-col items-center gap-2 py-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                      <Upload className="h-6 w-6" />
                    </span>
                    <span className="text-sm">
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">Click to choose a file</span>{' '}
                      <span className="text-slate-500">or drag and drop</span>
                    </span>
                    <span className="text-xs text-slate-400">
                      {limits.kinds.map((k) => FILE_KIND_INFO[k].ext.toUpperCase()).join(', ')} up to {formatBytes(limits.maxBytes)}
                    </span>
                  </label>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Files are checked on our servers by their actual contents, not just the name, and stay private until a moderator approves them.
              </p>
            </div>
          )}

          {source === 'link' && (
            <div>
              <label htmlFor="c-url" className={labelClass()}>Link to the file</label>
              <Input
                id="c-url"
                type="url"
                inputMode="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://drive.google.com/file/d/…"
                icon={<Link2 className="h-4 w-4" />}
                aria-invalid={Boolean(errors.source)}
              />
              {parsedUrl && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
                  <ExternalLink className="h-3 w-3" /> Opens on <strong>{describeExternalHost(parsedUrl).label}</strong>
                  {describeExternalHost(parsedUrl).mayNeedAccess && ' (make sure the sharing setting is "Anyone with the link")'}
                </p>
              )}
            </div>
          )}

          <FieldError id="c-source-err" message={errors.source} />
        </Card>
      )}

      {/* ---------------- Step 3: review ---------------- */}
      {step === 3 && (
        <Card className="space-y-5 p-6 sm:p-8">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Check your submission</h3>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            {[
              ['Title', title.trim()],
              ['Category', CATEGORY_LABELS[category].label],
              ['Subject', effectiveSubject ? `${effectiveSubject.code} - ${effectiveSubject.name}` : '-'],
              ['Branch / semester', `${BRANCHES.find((b) => b.id === branchId)?.code} • Semester ${semester}`],
              [
                'Attachment',
                source === 'keep'
                  ? 'Keep the current attachment'
                  : source === 'file'
                    ? `${file?.name} (${file ? formatBytes(file.size) : ''})`
                    : (parsedUrl ?? ''),
              ],
              ['Public credit', credit.trim() || 'Anonymous'],
            ].map(([k, v]) => (
              <div key={k} className="min-w-0">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{k}</dt>
                <dd className="truncate text-slate-800 dark:text-slate-100" title={v}>{v}</dd>
              </div>
            ))}
            {description.trim() && (
              <div className="sm:col-span-2">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Description</dt>
                <dd className="whitespace-pre-line text-slate-800 dark:text-slate-100">{description.trim()}</dd>
              </div>
            )}
          </dl>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-slate-50 p-3 text-xs text-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>
              I made this material or have the right to share it, and it contains no private information about other
              people. I understand a moderator will review it before it is published.
            </span>
          </label>

          {submitError && (
            <p role="alert" className="flex items-start gap-1.5 rounded-xl bg-rose-50 p-3 text-xs text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {submitError}
            </p>
          )}
        </Card>
      )}

      <div className="flex items-center justify-between gap-3">
        {step > 1 ? (
          <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)} disabled={busy}>
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
          </Button>
        ) : (
          <Link href={resubmitting ? `/account/contributions/${contributionId}` : '/resources'}>
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
        )}

        {step < 3 ? (
          <Button type="button" variant="primary" onClick={goNext}>
            Continue <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" variant="primary" size="lg" onClick={handleSubmit} disabled={!agreed || busy}>
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {STAGE_TEXT[stage as Exclude<Stage, 'idle'>]}
              </>
            ) : resubmitting ? (
              'Resubmit for review'
            ) : (
              'Submit for review'
            )}
          </Button>
        )}
      </div>
      <div className="sr-only" role="status" aria-live="polite">{busy ? STAGE_TEXT[stage as Exclude<Stage, 'idle'>] : ''}</div>
    </div>
  );
}
