'use client';

import React, { useMemo, useState } from 'react';
import { Link2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { SUBJECTS } from '@/data/academicData';
import { DEPARTMENTS, RESOURCE_TYPE_INFO, SEMESTERS } from '@/lib/resources/constants';
import { RESOURCE_TYPES, type Resource, type ResourceType } from '@/lib/resources/types';

export interface ResourceFormValues {
  driveRef: string;
  title: string;
  description: string;
  department: string;
  semester: number;
  subject: string;
  subjectCode: string;
  academicYear: string;
  resourceType: ResourceType;
  unit: string;
  keywords: string;
  contributorNote: string;
}

export function valuesFromResource(r: Resource): ResourceFormValues {
  return {
    driveRef: r.driveFileId,
    title: r.title,
    description: r.description,
    department: r.department,
    semester: r.semester,
    subject: r.subject,
    subjectCode: r.subjectCode ?? '',
    academicYear: r.academicYear ?? '',
    resourceType: r.resourceType,
    unit: r.unit ?? '',
    keywords: r.keywords.join(', '),
    contributorNote: r.contributorNote ?? '',
  };
}

const EMPTY: ResourceFormValues = {
  driveRef: '',
  title: '',
  description: '',
  department: 'common',
  semester: 1,
  subject: '',
  subjectCode: '',
  academicYear: '',
  resourceType: 'pyq',
  unit: '',
  keywords: '',
  contributorNote: '',
};

/** Converts form values to the API payload (the API validates everything again). */
export function toPayload(v: ResourceFormValues, mode: 'submit' | 'register' | 'edit') {
  const payload: Record<string, unknown> = {
    driveRef: v.driveRef.trim(),
    title: v.title.trim(),
    description: v.description.trim(),
    department: v.department,
    semester: Number(v.semester),
    subject: v.subject.trim(),
    subjectCode: v.subjectCode.trim() || undefined,
    academicYear: v.academicYear.trim() || undefined,
    resourceType: v.resourceType,
    unit: v.unit.trim() || undefined,
    keywords: v.keywords
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean),
  };
  if (mode === 'submit') payload.contributorNote = v.contributorNote.trim() || undefined;
  return payload;
}

interface ResourceFormProps {
  mode: 'submit' | 'register' | 'edit';
  initial?: Partial<ResourceFormValues>;
  errors?: Record<string, string>;
  busy?: boolean;
  submitLabel: string;
  onSubmit(values: ResourceFormValues): void;
  onCancel?(): void;
  driveHint?: React.ReactNode;
}

export function ResourceForm({ mode, initial, errors = {}, busy, submitLabel, onSubmit, onCancel, driveHint }: ResourceFormProps) {
  const [v, setV] = useState<ResourceFormValues>({ ...EMPTY, ...initial });
  const set = <K extends keyof ResourceFormValues>(k: K, value: ResourceFormValues[K]) => setV((p) => ({ ...p, [k]: value }));

  const subjectSuggestions = useMemo(
    () =>
      SUBJECTS.filter(
        (s) => s.semester === Number(v.semester) && (v.department === 'common' || s.branchId === v.department || s.yearId === 'first-year')
      ),
    [v.semester, v.department]
  );

  const pickSubject = (name: string) => {
    const match = SUBJECTS.find((s) => s.name.toLowerCase() === name.toLowerCase());
    setV((p) => ({ ...p, subject: name, subjectCode: match && !p.subjectCode ? match.code : p.subjectCode }));
  };

  const id = (k: string) => `rf-${mode}-${k}`;

  return (
    <form
      className="space-y-5"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(v);
      }}
    >
      <Field
        label="Google Drive link or file ID"
        htmlFor={id('driveRef')}
        required
        error={errors.driveRef}
        hint={
          driveHint ?? 'Paste the share link of a single file (drive.google.com or docs.google.com). Set sharing to “Anyone with the link can view”.'
        }
      >
        <Input
          id={id('driveRef')}
          value={v.driveRef}
          onChange={(e) => set('driveRef', e.target.value)}
          placeholder="https://drive.google.com/file/d/…/view"
          icon={<Link2 className="h-4 w-4" />}
          inputMode="url"
          autoComplete="off"
        />
      </Field>

      <Field label="Title" htmlFor={id('title')} required error={errors.title}>
        <Input id={id('title')} value={v.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Engineering Physics endsem paper" maxLength={200} />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="Resource type" htmlFor={id('type')} required error={errors.resourceType}>
          <Select id={id('type')} value={v.resourceType} onChange={(e) => set('resourceType', e.target.value as ResourceType)}>
            {RESOURCE_TYPES.map((t) => (
              <option key={t} value={t}>{RESOURCE_TYPE_INFO[t].label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Department" htmlFor={id('department')} required error={errors.department}>
          <Select id={id('department')} value={v.department} onChange={(e) => set('department', e.target.value)}>
            {DEPARTMENTS.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Semester" htmlFor={id('semester')} required error={errors.semester}>
          <Select id={id('semester')} value={String(v.semester)} onChange={(e) => set('semester', Number(e.target.value))}>
            {SEMESTERS.map((s) => (
              <option key={s} value={s}>Semester {s}</option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <Field label="Subject" htmlFor={id('subject')} required error={errors.subject}>
            <Input
              id={id('subject')}
              list={id('subjects')}
              value={v.subject}
              onChange={(e) => pickSubject(e.target.value)}
              placeholder="e.g. Engineering Physics"
              maxLength={120}
            />
            <datalist id={id('subjects')}>
              {subjectSuggestions.map((s) => (
                <option key={s.id} value={s.name}>{s.code}</option>
              ))}
            </datalist>
          </Field>
        </div>
        <Field label="Subject code" htmlFor={id('code')} error={errors.subjectCode}>
          <Input id={id('code')} value={v.subjectCode} onChange={(e) => set('subjectCode', e.target.value)} placeholder="e.g. PH11101" maxLength={20} />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="Academic year" htmlFor={id('year')} error={errors.academicYear} hint="e.g. 2024-25">
          <Input id={id('year')} value={v.academicYear} onChange={(e) => set('academicYear', e.target.value)} placeholder="2024-25" maxLength={9} />
        </Field>
        <Field label="Unit" htmlFor={id('unit')} error={errors.unit} hint="If it covers one unit">
          <Input id={id('unit')} value={v.unit} onChange={(e) => set('unit', e.target.value)} placeholder="e.g. 3" maxLength={40} />
        </Field>
        <Field label="Keywords" htmlFor={id('keywords')} error={errors.keywords} hint="Comma separated">
          <Input id={id('keywords')} value={v.keywords} onChange={(e) => set('keywords', e.target.value)} placeholder="endsem, optics" />
        </Field>
      </div>

      <Field label="Description" htmlFor={id('description')} error={errors.description}>
        <Textarea id={id('description')} rows={3} value={v.description} onChange={(e) => set('description', e.target.value)} maxLength={2000} placeholder="What does it cover? Any missing pages?" />
      </Field>

      {mode === 'submit' && (
        <Field label="Note for reviewers" htmlFor={id('note')} error={errors.contributorNote} hint="Optional. Where the file came from, who wrote it, etc.">
          <Textarea id={id('note')} rows={2} value={v.contributorNote} onChange={(e) => set('contributorNote', e.target.value)} maxLength={500} />
        </Field>
      )}

      {errors._ && <p className="text-sm text-rose-600">{errors._}</p>}

      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="submit" variant="primary" isLoading={busy}>{submitLabel}</Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        )}
      </div>
    </form>
  );
}

const DRIVE_ERROR_CODES = ['duplicate_resource', 'unsupported_file_type', 'invalid_drive_reference'];

/** Places an API error next to the field it concerns. */
export function formErrorsFrom(err: unknown): Record<string, string> {
  const e = err as { code?: string; message?: string; fields?: Record<string, string> };
  if (e?.fields) return e.fields;
  const message = e?.message ?? 'Something went wrong';
  if (e?.code && (e.code.startsWith('drive_') || DRIVE_ERROR_CODES.includes(e.code))) return { driveRef: message };
  return { _: message };
}
