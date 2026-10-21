'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/academic/Breadcrumbs';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Notice } from '@/components/ui/Feedback';
import { ACADEMIC_YEARS, BRANCHES, SUBJECTS } from '@/data/academicData';
import { CATEGORY_LABELS } from '@/data/resourcesData';
import { ResourceCategory } from '@/types';
import {
  Upload,
  CheckCircle2,
  FileText,
  AlertCircle,
  Link2,
  X,
} from 'lucide-react';

export default function SubmitResourcePage() {
  const [title, setTitle] = useState('');
  const [academicYear, setAcademicYear] = useState('second-year');
  const [branch, setBranch] = useState('cse');
  const [semester, setSemester] = useState('3');
  const [subject, setSubject] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [category, setCategory] = useState<ResourceCategory>('notes');
  const [externalUrl, setExternalUrl] = useState('');
  const [description, setDescription] = useState('');
  const [contributorName, setContributorName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Available subjects for selected branch and semester strictly matching dataset
  const availableSubjects = SUBJECTS.filter(
    (s) =>
      s.semester === parseInt(semester, 10) &&
      s.branchId === branch
  ).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 25 * 1024 * 1024) {
        setErrors((prev) => ({
          ...prev,
          file: 'File size exceeds 25 MB limit.',
        }));
        return;
      }
      setSelectedFile(file);
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.file;
        return copy;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) {
      newErrors.title = 'Resource title is required.';
    } else if (title.trim().length < 5) {
      newErrors.title = 'Title must be at least 5 characters long.';
    }

    if (!selectedFile && !externalUrl.trim()) {
      newErrors.file =
        'Please upload a file or provide an external drive link.';
    }

    if (externalUrl.trim() && !/^https?:\/\/.+/.test(externalUrl.trim())) {
      newErrors.externalUrl = 'Please enter a valid URL starting with http:// or https://';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitted(true);
  };

  const handleReset = () => {
    setTitle('');
    setDescription('');
    setSelectedFile(null);
    setExternalUrl('');
    setContributorName('');
    setIsSubmitted(false);
    setErrors({});
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <Breadcrumbs items={[{ label: 'Contribute Resource' }]} />

      <div className="space-y-3">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200/50">
          <Upload className="h-3.5 w-3.5" />
          Contribute (preview)
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Submit Academic Resources
        </h1>
        <p className="text-base text-slate-500 max-w-2xl">
          Contribute handwritten lecture summaries, midsem/endsem papers, or lab manuals to support peers across MNNIT Allahabad.
        </p>
      </div>

      <Notice tone="warning" title="Submissions are not saved yet">
        This form checks your input but does not upload or store anything, and there is no review queue behind it.
        It shows how contributing will work once the backend is connected.
      </Notice>

      {isSubmitted ? (
        <Card className="bg-white text-center p-8 sm:p-12 space-y-5 border-emerald-200 dark:border-emerald-900/60">
          <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Form checked. Nothing was submitted.
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              Your entry for &ldquo;<strong>{title}</strong>&rdquo; passed validation, but it was not uploaded or saved anywhere. Submissions open in a later release.
            </p>
          </div>

          <div className="pt-4 flex flex-wrap justify-center gap-3">
            <Button variant="primary" onClick={handleReset}>
              Submit Another Resource
            </Button>
            <Link href="/resources">
              <Button variant="outline">Browse Existing Repositories</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="p-6 sm:p-8 space-y-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
              1. Resource Information
            </h3>

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Resource Title <span className="text-rose-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="e.g. 2024 Endsem Solved Paper or Complete Module 2 Trees Notes"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={errors.title ? 'border-rose-500' : ''}
              />
              {errors.title && (
                <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {errors.title}
                </p>
              )}
            </div>

            {/* Academic Classification Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Academic Year <span className="text-rose-500">*</span>
                </label>
                <Select
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                >
                  {ACADEMIC_YEARS.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.title} ({y.badge})
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Branch <span className="text-rose-500">*</span>
                </label>
                <Select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                >
                  {BRANCHES.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} - {b.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Semester <span className="text-rose-500">*</span>
                </label>
                <Select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                    <option key={num} value={num.toString()}>
                      Semester {num}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Resource Category <span className="text-rose-500">*</span>
                </label>
                <Select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ResourceCategory)}
                >
                  {Object.entries(CATEGORY_LABELS).map(([key, val]) => (
                    <option key={key} value={key}>
                      {val.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Subject Selection */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Subject <span className="text-rose-500">*</span>
              </label>
              {availableSubjects.length > 0 ? (
                <Select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                >
                  {availableSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.courseCode || s.code ? `${s.courseCode || s.code} - ` : ''}{s.title || s.name}
                    </option>
                  ))}
                  <option value="other">Other / Not listed</option>
                </Select>
              ) : (
                <Input
                  type="text"
                  placeholder="Enter Course Code and Name (e.g. CS15101 Operating Systems)"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                />
              )}
            </div>
          </Card>

          {/* 2. File Upload Dropzone */}
          <Card className="p-6 sm:p-8 space-y-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
              2. File Attachment & Links
            </h3>

            <div className="space-y-4">
              {/* Dropzone container */}
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-2xl p-6 text-center transition-colors">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.zip,.ppt,.pptx"
                  onChange={handleFileChange}
                />

                {selectedFile ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-left">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md">
                          {selectedFile.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="file-upload"
                    className="flex flex-col items-center justify-center cursor-pointer space-y-2 py-4"
                  >
                    <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <Upload className="h-6 w-6" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                        Click to upload file
                      </span>{' '}
                      <span className="text-sm text-slate-500">or drag and drop</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      PDF, DOCX, ZIP up to 25 MB
                    </p>
                  </label>
                )}
              </div>

              {errors.file && (
                <p className="text-xs text-rose-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {errors.file}
                </p>
              )}

              {/* External URL */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Or External Resource Link (Google Drive, GitHub, etc.)
                </label>
                <Input
                  type="url"
                  placeholder="https://drive.google.com/file/d/..."
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  icon={<Link2 className="h-4 w-4" />}
                  className={errors.externalUrl ? 'border-rose-500' : ''}
                />
                {errors.externalUrl && (
                  <p className="text-xs text-rose-500 mt-1">
                    {errors.externalUrl}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Description / Topic Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Handwritten notes covering AVL balance factor rotations, Prim algorithm with solved questions..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Contributor Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Contributor Credit (Optional)
                </label>
                <Input
                  type="text"
                  placeholder="Your Name / Registration Number / Batch"
                  value={contributorName}
                  onChange={(e) => setContributorName(e.target.value)}
                />
              </div>
            </div>
          </Card>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link href="/resources">
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </Link>
            <Button variant="primary" type="submit" size="lg">
              Submit Resource for Review
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
