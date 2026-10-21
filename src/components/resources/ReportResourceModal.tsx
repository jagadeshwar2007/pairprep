'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Field } from '@/components/ui/Controls';
import { Notice } from '@/components/ui/Feedback';
import { ResourceItem } from '@/types';

interface ReportResourceModalProps {
  resource: ResourceItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ReportResourceModal({ resource, isOpen, onClose }: ReportResourceModalProps) {
  const [reason, setReason] = useState('broken-file');
  const [details, setDetails] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!resource) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Reports are not stored anywhere yet; the backend arrives in a later phase.
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
      title="Report a problem"
      description={`Resource: ${resource.title}`}
      maxWidth="md"
    >
      {submitted ? (
        <div className="space-y-4">
          <Notice tone="warning" title="Reports are not saved yet">
            This form is a preview. Nothing was sent or stored, because moderation is not connected yet.
          </Notice>
          <Button variant="primary" onClick={handleReset} className="w-full">
            Close
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Notice tone="info">
            Reporting is a preview and will not reach a moderator until the backend is connected.
          </Notice>

          <Field label="Reason" htmlFor="report-reason">
            <Select id="report-reason" value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="broken-file">File is corrupted or cannot open</option>
              <option value="wrong-subject">Listed under the wrong subject or semester</option>
              <option value="poor-quality">Illegible or poor scan quality</option>
              <option value="outdated-syllabus">Outdated syllabus or incorrect questions</option>
              <option value="copyright">Copyright concern</option>
              <option value="other">Other</option>
            </Select>
          </Field>

          <Field label="Details (optional)" htmlFor="report-details">
            <textarea
              id="report-details"
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="What is wrong with this file?"
              className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </Field>

          <div className="flex gap-2 pt-1">
            <Button type="submit" variant="primary" className="flex-1">
              Submit (preview)
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
