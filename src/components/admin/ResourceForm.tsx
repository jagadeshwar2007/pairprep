'use client';

import React, { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, ExternalLink, FileText, Link2, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ACADEMIC_YEARS, BRANCHES, SUBJECTS } from '@/data/academicData';
import { CATEGORY_LABELS } from '@/data/resourcesData';
import type { ResourceCategory } from '@/types';
import { getBrowserClient } from '@/lib/supabase/client';
import { FILE_KIND_INFO, formatBytes, kindFromFileName, newUploadPath, DEFAULT_ALLOWED_KINDS, DEFAULT_MAX_UPLOAD_BYTES } from '@/lib/files/registry';
import { parseSafeHttpsUrl } from '@/lib/files/urls';
import { finalizeUpload } from '@/actions/uploads';
import { createResource, updateResource } from '@/actions/resources';

export interface ResourceFormInitial {
  id: string;
  title: string;
  description: string;
  subjectSlug: string;
  category: ResourceCategory;
  tags: string[];
  credit: string;
  verified: boolean;
  status: 'draft' | 'published' | 'archived';
  current: { kind: 'file'; fileName: string | null } | { kind: 'link'; url: string };
}

type SourceChoice = 'keep' | 'file' | 'link';
const label = 'block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5';

interface Props {
  mode: 'create' | 'edit';
  userId: string;
  canPublish: boolean;
  initial?: ResourceFormInitial;
}

export function ResourceForm({ mode, userId, canPublish, initial }: Props) {
  const router = useRouter();
  const editing = mode === 'edit' && initial;
  const initialSubject = SUBJECTS.find((s) => s.id === initial?.subjectSlug);

  const [yearId, setYearId] = useState(initialSubject?.yearId ?? 'second-year');
  const [branchId, setBranchId] = useState(initialSubject?.branchId ?? 'cse');
  const [semester, setSemester] = useState(String(initialSubject?.semester ?? 3));
  const [subjectSlug, setSubjectSlug] = useState(initial?.subjectSlug ?? '');
  const [category, setCategory] = useState<ResourceCategory>(initial?.category ?? 'notes');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [tags, setTags] = useState((initial?.tags ?? []).join(', '));
  const [credit, setCredit] = useState(initial?.credit ?? '');
  const [verified, setVerified] = useState(initial?.verified ?? true);
  const [source, setSource] = useState<SourceChoice>(editing ? 'keep' : 'link');
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [stage, setStage] = useState<'idle' | 'uploading' | 'verifying' | 'saving'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const verifiedUpload = useRef<{ key: string; path: string } | null>(null);

  const year = ACADEMIC_YEARS.find((y) => y.id === yearId) ?? ACADEMIC_YEARS[0];
  const available = useMemo(
    () => SUBJECTS.filter((s) => s.semester === Number(semester) && (s.branchId === branchId || s.yearId === 'first-year')),
    [semester, branchId],
  );
  const subject = available.find((s) => s.id === subjectSlug) ?? available[0];
  const parsedUrl = parseSafeHttpsUrl(url);
  const busy = stage !== 'idle';

  const submit = async (publish: boolean) => {
    setError(null);
    setSaved(null);
    if (title.trim().length < 5) return setError('Title must be at least 5 characters.');
    if (!subject) return setError('No subjects are catalogued for this branch and semester.');
    if (source === 'link' && !parsedUrl) return setError('Enter a public https:// link.');
    if (source === 'file' && !file) return setError('Choose a file to upload.');

    try {
      let sourceInput: { mode: 'file'; path: string; originalName: string } | { mode: 'link'; url: string } | { mode: 'keep' };
      if (source === 'keep') sourceInput = { mode: 'keep' };
      else if (source === 'link') sourceInput = { mode: 'link', url: parsedUrl as string };
      else {
        const picked = file as File;
        const kind = kindFromFileName(picked.name);
        if (!kind) throw new Error('Unsupported file type. Use PDF, PNG, JPEG, DOCX or PPTX.');
        if (picked.size > DEFAULT_MAX_UPLOAD_BYTES * 2) throw new Error(`That file is too large (${formatBytes(picked.size)}).`);
        const key = `${picked.name}:${picked.size}:${picked.lastModified}`;
        let path = verifiedUpload.current?.key === key ? verifiedUpload.current.path : null;
        if (!path) {
          setStage('uploading');
          const newPath = newUploadPath('resources-published', userId, kind);
          const { error: uploadError } = await getBrowserClient()
            .storage.from('resources-published')
            .upload(newPath, picked, { contentType: FILE_KIND_INFO[kind].mime, upsert: false, cacheControl: '3600' });
          if (uploadError) throw new Error('The upload was refused. Check your permissions and the file type.');
          setStage('verifying');
          const checked = await finalizeUpload({ bucket: 'resources-published', path: newPath, originalName: picked.name });
          if (!checked.ok) throw new Error(checked.error);
          verifiedUpload.current = { key, path: newPath };
          path = newPath;
        }
        sourceInput = { mode: 'file', path, originalName: picked.name };
      }

      setStage('saving');
      const payload = {
        subjectSlug: subject.id,
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        credit: credit.trim() || undefined,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        source: sourceInput,
      };
      if (editing) {
        const result = await updateResource({ ...payload, id: initial.id, verified });
        if (!result.ok) throw new Error(result.error);
        setSaved('Changes saved.');
        setFile(null);
        setSource('keep');
        router.refresh();
      } else {
        const result = await createResource({ ...payload, publish });
        if (!result.ok) throw new Error(result.error);
        router.push(`/admin/resources/${(result.data as { id: string }).id}`);
      }
    } catch (e) {
      setError((e as Error).message || 'Something went wrong.');
    } finally {
      setStage('idle');
    }
  };

  return (
    <div className="space-y-6">
      <Card className="space-y-5">
        <div>
          <label htmlFor="r-title" className={label}>Title</label>
          <Input id="r-title" value={title} maxLength={160} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="r-branch" className={label}>Branch</label>
            <Select id="r-branch" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              {BRANCHES.map((b) => <option key={b.id} value={b.id}>{b.code} - {b.name}</option>)}
            </Select>
          </div>
          <div>
            <label htmlFor="r-year" className={label}>Academic year</label>
            <Select id="r-year" value={yearId} onChange={(e) => { setYearId(e.target.value as typeof yearId); setSemester(String(ACADEMIC_YEARS.find((y) => y.id === e.target.value)?.semesters[0] ?? 3)); }}>
              {ACADEMIC_YEARS.map((y) => <option key={y.id} value={y.id}>{y.title}</option>)}
            </Select>
          </div>
          <div>
            <label htmlFor="r-sem" className={label}>Semester</label>
            <Select id="r-sem" value={semester} onChange={(e) => setSemester(e.target.value)}>
              {year.semesters.map((n) => <option key={n} value={n}>Semester {n}</option>)}
            </Select>
          </div>
          <div>
            <label htmlFor="r-cat" className={label}>Type</label>
            <Select id="r-cat" value={category} onChange={(e) => setCategory(e.target.value as ResourceCategory)}>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
          </div>
        </div>

        <div>
          <label htmlFor="r-subject" className={label}>Subject</label>
          {available.length ? (
            <Select id="r-subject" value={subject?.id ?? ''} onChange={(e) => setSubjectSlug(e.target.value)}>
              {available.map((s) => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
            </Select>
          ) : (
            <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">No subjects are catalogued for this selection.</p>
          )}
        </div>

        <div>
          <label htmlFor="r-desc" className={label}>Description</label>
          <textarea id="r-desc" rows={3} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="r-tags" className={label}>Tags (comma separated)</label>
            <Input id="r-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="trees, graphs, 2024" />
          </div>
          <div>
            <label htmlFor="r-credit" className={label}>Public credit (optional)</label>
            <Input id="r-credit" value={credit} maxLength={120} onChange={(e) => setCredit(e.target.value)} />
          </div>
        </div>

        {editing && (
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
            <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
            Show the &ldquo;verified&rdquo; check mark
          </label>
        )}
      </Card>

      <Card className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">File or link</h3>
        {editing && (
          <p className="rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/50">
            <span className="font-semibold">Current: </span>
            {initial.current.kind === 'file' ? `hosted file ${initial.current.fileName ?? ''}` : initial.current.url}
          </p>
        )}
        <div role="radiogroup" aria-label="Source" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {([...(editing ? [['keep', 'Keep current', FileText]] : []), ['file', 'Upload a file', Upload], ['link', 'External link', Link2]] as [SourceChoice, string, React.ComponentType<{ className?: string }>][]).map(([id, text, Icon]) => (
            <button key={id} type="button" role="radio" aria-checked={source === id} onClick={() => setSource(id)}
              className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium cursor-pointer ${source === id ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300' : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300'}`}>
              <Icon className="h-4 w-4" /> {text}
            </button>
          ))}
        </div>
        {source === 'file' && (
          <div>
            <input type="file" accept={DEFAULT_ALLOWED_KINDS.concat(['pptx']).map((k) => `.${FILE_KIND_INFO[k].ext}`).join(',')} onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-sm" aria-label="Choose a file" />
            <p className="mt-1 text-[11px] text-slate-400">Checked by content on the server; types and size follow the limits in Settings.</p>
          </div>
        )}
        {source === 'link' && (
          <div>
            <Input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" aria-label="External link" icon={<ExternalLink className="h-4 w-4" />} />
          </div>
        )}
      </Card>

      {error && <p role="alert" className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}
      {saved && <p role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"><CheckCircle2 className="h-4 w-4" />{saved}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/resources"><Button type="button" variant="outline">Back to resources</Button></Link>
        <div className="flex gap-2">
          {busy && <span className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />{stage === 'uploading' ? 'Uploading…' : stage === 'verifying' ? 'Checking file…' : 'Saving…'}</span>}
          <Button type="button" variant={editing ? 'primary' : 'outline'} onClick={() => submit(false)} disabled={busy}>
            {editing ? 'Save changes' : 'Save as draft'}
          </Button>
          {!editing && canPublish && (
            <Button type="button" variant="primary" onClick={() => submit(true)} disabled={busy}>Save &amp; publish</Button>
          )}
        </div>
      </div>
    </div>
  );
}
