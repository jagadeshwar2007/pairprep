'use client';

import React, { useState } from 'react';
import { FolderInput } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api/client';
import { DEPARTMENTS, RESOURCE_TYPE_INFO, SEMESTERS } from '@/lib/resources/constants';
import { RESOURCE_TYPES } from '@/lib/resources/types';

interface ReportItem {
  driveFileId: string;
  name: string;
  path: string;
  resourceId?: string;
  reason?: string;
  inferred?: { semester: number; resourceType: string; subject: string; academicYear: string | null };
}
interface ImportReport {
  scanned: number;
  truncated: boolean;
  dryRun: boolean;
  created: ReportItem[];
  duplicates: ReportItem[];
  unsupported: ReportItem[];
  failed: ReportItem[];
  folderErrors: string[];
}

function ReportList({ title, items, tone, detail }: { title: string; items: ReportItem[]; tone: 'success' | 'neutral' | 'warning' | 'danger'; detail(i: ReportItem): string }) {
  if (items.length === 0) return null;
  return (
    <details className="rounded-xl border border-slate-200 dark:border-slate-800" open={tone === 'danger' || items.length <= 10}>
      <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium flex items-center gap-2">
        {title} <Badge size="sm" variant={tone}>{items.length}</Badge>
      </summary>
      <ul className="px-4 pb-3 space-y-1.5 max-h-72 overflow-y-auto text-xs">
        {items.map((i) => (
          <li key={i.driveFileId + title}>
            <span className="font-medium text-slate-800 dark:text-slate-200">{i.path ? `${i.path} / ` : ''}{i.name}</span>
            <span className="text-slate-500"> · {detail(i)}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

export function ImportPanel() {
  const toast = useToast();
  const [folderRef, setFolderRef] = useState('https://drive.google.com/drive/folders/16g1SvodQLuXZknBlNXjVJXmBMUkcmZ8V');
  const [department, setDepartment] = useState('common');
  const [semester, setSemester] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [subject, setSubject] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [recursive, setRecursive] = useState(true);
  const [busy, setBusy] = useState<'dry' | 'run' | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (dryRun: boolean) => {
    setBusy(dryRun ? 'dry' : 'run');
    setError(null);
    try {
      const r = await api<ImportReport>('/api/admin/import', {
        body: {
          folderRef,
          recursive,
          dryRun,
          defaults: {
            department,
            semester: semester ? Number(semester) : undefined,
            resourceType: resourceType || undefined,
            subject: subject.trim() || undefined,
            academicYear: academicYear.trim() || undefined,
          },
        },
      });
      setReport(r);
      if (!dryRun) toast(`Imported ${r.created.length} files as pending`, 'success');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setBusy(null);
    }
  };

  const describe = (i: ReportItem) =>
    i.inferred ? `Sem ${i.inferred.semester}, ${RESOURCE_TYPE_INFO[i.inferred.resourceType as keyof typeof RESOURCE_TYPE_INFO]?.shortLabel ?? i.inferred.resourceType}, ${i.inferred.subject}${i.inferred.academicYear ? `, ${i.inferred.academicYear}` : ''}` : '';

  return (
    <Card className="p-5 sm:p-6 space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2"><FolderInput className="h-5 w-5 text-indigo-600" /> Import a Drive folder</h2>
        <p className="text-sm text-slate-500">
          Registers every supported file in the folder (and sub-folders) as <strong>pending</strong>. Nothing is published automatically and files already in PairPrep are skipped.
          Semester, type and subject are guessed from folder names such as “1st Sem / Physics / Notes”; the defaults below fill the gaps.
        </p>
      </div>

      <Field label="Folder link or ID" htmlFor="imp-folder" required>
        <Input id="imp-folder" value={folderRef} onChange={(e) => setFolderRef(e.target.value)} />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <Field label="Department" htmlFor="imp-dept" required>
          <Select id="imp-dept" value={department} onChange={(e) => setDepartment(e.target.value)}>
            {DEPARTMENTS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </Field>
        <Field label="Default semester" htmlFor="imp-sem">
          <Select id="imp-sem" value={semester} onChange={(e) => setSemester(e.target.value)}>
            <option value="">From folder names</option>
            {SEMESTERS.map((s) => <option key={s} value={s}>Semester {s}</option>)}
          </Select>
        </Field>
        <Field label="Default type" htmlFor="imp-type">
          <Select id="imp-type" value={resourceType} onChange={(e) => setResourceType(e.target.value)}>
            <option value="">From names (else Other)</option>
            {RESOURCE_TYPES.map((t) => <option key={t} value={t}>{RESOURCE_TYPE_INFO[t].label}</option>)}
          </Select>
        </Field>
        <Field label="Subject (all files)" htmlFor="imp-subj">
          <Input id="imp-subj" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="From folder names" />
        </Field>
        <Field label="Default year" htmlFor="imp-year">
          <Input id="imp-year" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} placeholder="e.g. 2024-25" />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
        <input type="checkbox" checked={recursive} onChange={(e) => setRecursive(e.target.checked)} className="rounded border-slate-300" />
        Include sub-folders (up to 5 levels, 500 files per run)
      </label>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" isLoading={busy === 'dry'} disabled={busy !== null} onClick={() => run(true)}>Preview (dry run)</Button>
        <Button variant="primary" isLoading={busy === 'run'} disabled={busy !== null} onClick={() => run(false)}>Import as pending</Button>
      </div>

      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}

      {report && (
        <div className="space-y-3">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {report.dryRun ? 'Preview: ' : ''}Scanned {report.scanned} files.{' '}
            {report.dryRun ? `${report.created.length} would be imported.` : `${report.created.length} imported as pending.`}
            {report.truncated && ' The folder has more files than one run handles; run the import again to continue.'}
          </p>
          {report.folderErrors.map((e) => <p key={e} className="text-xs text-rose-600">{e}</p>)}
          <ReportList title={report.dryRun ? 'Would import' : 'Imported'} items={report.created} tone="success" detail={describe} />
          <ReportList title="Already registered" items={report.duplicates} tone="neutral" detail={(i) => i.reason ?? ''} />
          <ReportList title="Unsupported file types" items={report.unsupported} tone="warning" detail={(i) => i.reason ?? ''} />
          <ReportList title="Errors" items={report.failed} tone="danger" detail={(i) => i.reason ?? ''} />
        </div>
      )}
    </Card>
  );
}
