'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CALENDAR_VERIFICATION_REPORT } from '@/data/academicCalendarData';
import {
  Info,
} from 'lucide-react';

interface VerificationReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VerificationReportModal({ isOpen, onClose }: VerificationReportModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Academic Calendar Verification Report"
      description="Detailed cross-examination report against MNNIT Allahabad Official Source PDF (Pages 1 & 2)."
      maxWidth="2xl"
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/70 dark:border-indigo-900/60 dark:bg-indigo-950/40 p-3.5 text-xs text-indigo-900 dark:text-indigo-200 flex gap-2.5">
          <Info className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <p>
            All 68 events and dates across Odd Semester (2026-27), Even Semester (2026-27), and Transition have been checked against the official scan. The items below highlight specific observations, typographical artifacts, and visual boundary interpretations.
          </p>
        </div>

        <div className="space-y-3">
          {CALENDAR_VERIFICATION_REPORT.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 p-4 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {item.item}
                </span>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline">Page {item.page}</Badge>
                  <Badge
                    variant={item.confidence === 'High' ? 'success' : 'warning'}
                  >
                    {item.confidence} Confidence
                  </Badge>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Observed Text in Source:
                </span>
                <span className="font-mono text-indigo-600 dark:text-indigo-300 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 block mt-0.5">
                  &ldquo;{item.observedText}&rdquo;
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  System Interpretation & Handling:
                </span>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed mt-0.5">
                  {item.interpretation}
                </p>
              </div>

              <div className="text-[11px] text-amber-700 dark:text-amber-400 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                <strong>Audit Note:</strong> {item.reasonForNote}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close Report
          </Button>
        </div>
      </div>
    </Modal>
  );
}
