'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ResourceItem } from '@/types';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { Select } from '@/components/ui/Select';

interface ReportResourceModalProps {
  resource: ResourceItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ReportResourceModal({
  resource,
  isOpen,
  onClose,
}: ReportResourceModalProps) {
  const [reason, setReason] = useState('broken-file');
  const [details, setDetails] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!resource) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const handleReset = () => {
    setSubmitted(false);
    setDetails('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleReset}
      title="Report Resource Issue"
      description={`Flagging: "${resource.title}"`}
      maxWidth="md"
    >
      {submitted ? (
        <div className="text-center py-6 space-y-3">
          <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
            <CheckCircle className="h-6 w-6" />
          </div>
          <h4 className="font-semibold text-slate-900 dark:text-white">
            Report Logged for Moderator Review
          </h4>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Thank you for keeping Pairprep accurate and high quality. The admin team will review this file in the moderation queue.
          </p>
          <Button variant="primary" onClick={handleReset} className="w-full mt-4">
            Done
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 p-3 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <span>
              Your report helps community moderators remove corrupted PDFs or incorrect syllabus materials.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1.5">
              Reason for Report
            </label>
            <Select value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="broken-file">File is corrupted or cannot open</option>
              <option value="wrong-subject">Categorized under wrong Subject or Semester</option>
              <option value="poor-quality">Illegible handwriting or poor scan quality</option>
              <option value="outdated-syllabus">Outdated MNNIT syllabus / incorrect questions</option>
              <option value="copyright">Copyright or proprietary content concern</option>
              <option value="other">Other issue</option>
            </Select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1.5">
              Additional Details (Optional)
            </label>
            <textarea
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="e.g. Page 4 is missing formulas, or this is for 2018 syllabus..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex gap-2.5 pt-2">
            <Button type="submit" variant="danger" className="flex-1">
              Submit Report (Demo)
            </Button>
            <Button type="button" variant="outline" onClick={handleReset}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
