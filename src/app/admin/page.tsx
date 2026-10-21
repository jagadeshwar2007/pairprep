'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SUBJECTS, BRANCHES, MNNIT_SUBJECTS_VALIDATION_REPORT } from '@/data/academicData';
import {
  ShieldAlert,
  Upload,
  FileCheck2,
  Check,
  X,
  Clock,
  Calendar,
  AlertCircle,
  Database,
} from 'lucide-react';

export default function AdminPreviewDashboard() {
  const [activeTab, setActiveTab] = useState<'queue' | 'bulk' | 'catalog' | 'contributors' | 'calendar'>('queue');
  const [pendingSubmissions, setPendingSubmissions] = useState([
    {
      id: 'sub-1',
      title: 'CS13101 AVL Tree Rotations & Deletions Tutorial',
      author: 'Aakash Verma (Reg. 20234012)',
      branch: 'CSE',
      semester: 3,
      category: 'Study Notes',
      fileType: 'PDF (3.4 MB)',
      timeAgo: '2 hours ago',
      status: 'pending',
    },
    {
      id: 'sub-2',
      title: 'ME13101 Thermodynamics 2024 Midsem Question Paper',
      author: 'Priya Sharma (Reg. 20235088)',
      branch: 'ME',
      semester: 3,
      category: 'Midsem Papers',
      fileType: 'PDF (1.8 MB)',
      timeAgo: '4 hours ago',
      status: 'pending',
    },
    {
      id: 'sub-3',
      title: 'CS15101 Banker Algorithm & Deadlock Avoidance Code Lab',
      author: 'Rohan Gupta (Reg. 20224110)',
      branch: 'CSE',
      semester: 5,
      category: 'Lab Materials',
      fileType: 'ZIP (5.1 MB)',
      timeAgo: '1 day ago',
      status: 'pending',
    },
  ]);

  const handleApprove = (id: string) => {
    setPendingSubmissions((prev) => prev.filter((item) => item.id !== id));
  };

  const handleReject = (id: string) => {
    setPendingSubmissions((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Security Warning Notice */}
      <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 dark:border-amber-700/60 dark:bg-amber-950/40 p-4 text-xs text-amber-900 dark:text-amber-200 flex gap-3 items-start">
        <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-sm">
            Administrative Prototype & Architecture Preview
          </p>
          <p className="leading-relaxed">
            This route is unlinked from public navigation. Real authentication, Google Cloud IAM, and server-side RBAC (Role-Based Access Control) will secure this endpoint in Milestone 2. No claims of security are made for this prototype interface.
          </p>
        </div>
      </div>

      {/* Admin Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            <span>Pairprep Operations</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">
            Academic Content Administration
          </h1>
          <p className="text-sm text-slate-500">
            Submission moderation, bulk imports, catalog verification, and contributor management.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setActiveTab('bulk')}>
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            Bulk CSV Import
          </Button>
          <Button variant="primary" size="sm" onClick={() => setActiveTab('queue')}>
            <FileCheck2 className="h-3.5 w-3.5 mr-1.5" />
            Pending Queue ({pendingSubmissions.length})
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <span className="text-[11px] font-semibold uppercase text-slate-400 block">
            Pending Submissions
          </span>
          <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
            {pendingSubmissions.length}
          </div>
          <span className="text-[11px] text-slate-500">Awaiting peer review</span>
        </Card>
        <Card className="p-4">
          <span className="text-[11px] font-semibold uppercase text-slate-400 block">
            Catalogued Subjects
          </span>
          <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">
            {SUBJECTS.length}
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">{BRANCHES.length} MNNIT Branches</span>
        </Card>
        <Card className="p-4">
          <span className="text-[11px] font-semibold uppercase text-slate-400 block">
            Reported Files
          </span>
          <div className="text-3xl font-black text-amber-500 mt-1">
            0
          </div>
          <span className="text-[11px] text-slate-500">All links verified healthy</span>
        </Card>
        <Card className="p-4">
          <span className="text-[11px] font-semibold uppercase text-slate-400 block">
            Student Contributors
          </span>
          <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">
            18
          </div>
          <span className="text-[11px] text-slate-500">MNNIT batches 2022-26</span>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'queue'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Review Submissions Queue ({pendingSubmissions.length})
        </button>
        <button
          onClick={() => setActiveTab('bulk')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'bulk'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Bulk Import & Ingestion
        </button>
        <button
          onClick={() => setActiveTab('catalog')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'catalog'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Subject & Branch Registry
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'calendar'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Official Academic Calendar (2026–27)
        </button>
      </div>

      {/* Tab Content: Submission Queue */}
      {activeTab === 'queue' && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Pending Submissions Awaiting Approval
            </h3>
            <span className="text-xs text-slate-400">
              Check syllabus alignment before publishing
            </span>
          </div>

          {pendingSubmissions.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {pendingSubmissions.map((sub) => (
                <div
                  key={sub.id}
                  className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="primary">{sub.category}</Badge>
                      <Badge variant="neutral">{sub.branch} Sem {sub.semester}</Badge>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {sub.timeAgo}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {sub.title}
                    </h4>

                    <p className="text-xs text-slate-500">
                      Submitted by: <strong className="text-slate-700 dark:text-slate-300">{sub.author}</strong> • {sub.fileType}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleApprove(sub.id)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <Check className="h-3.5 w-3.5 mr-1" /> Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReject(sub.id)}
                      className="hover:text-rose-600 hover:border-rose-300"
                    >
                      <X className="h-3.5 w-3.5 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-sm text-slate-500">
              Queue is empty! All submitted student materials have been reviewed.
            </div>
          )}
        </Card>
      )}

      {/* Tab Content: Bulk Import Mockup */}
      {activeTab === 'bulk' && (
        <Card className="p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Bulk Courseware & PYQ Ingestion (CSV / JSON)
          </h3>
          <p className="text-xs text-slate-500">
            For academic convenors to batch-upload 5-year question papers and textbook syllabi from departmental zip archives.
          </p>

          <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 text-center space-y-3">
            <Upload className="h-8 w-8 mx-auto text-indigo-500" />
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Upload Manifest CSV or ZIP archive
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Schema: `subject_code, exam_type, year, semester, storage_path`
              </p>
            </div>
            <Button variant="outline" size="sm">
              Select Batch Manifest File (Demo)
            </Button>
          </div>
        </Card>
      )}

      {/* Tab Content: Registry / Curriculum Audit */}
      {activeTab === 'catalog' && (
        <Card className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Database className="h-4 w-4 text-indigo-500" />
                MNNIT B.Tech Curriculum Dataset Audit & Verification Report
              </h3>
              <p className="text-xs text-slate-500">
                Source of truth: <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">data/mnnit_btech_subjects.csv</code> (Official Institute Curriculum Scheme)
              </p>
            </div>
            <Badge variant="success">Validated 446 Records</Badge>
          </div>

          {/* Audit Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800">
              <span className="text-slate-400 block font-medium">Total Subjects</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white mt-0.5 block">
                {MNNIT_SUBJECTS_VALIDATION_REPORT.totalRecords}
              </span>
              <span className="text-[11px] text-emerald-600 font-semibold">100% Unique Keys</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800">
              <span className="text-slate-400 block font-medium">B.Tech Branches</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white mt-0.5 block">
                {BRANCHES.length}
              </span>
              <span className="text-[11px] text-indigo-600 font-semibold">All Engineering Depts</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800">
              <span className="text-slate-400 block font-medium">Missing Course Codes</span>
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5 block">
                {MNNIT_SUBJECTS_VALIDATION_REPORT.missingCourseCodesCount}
              </span>
              <span className="text-[11px] text-slate-500">Electives & audit courses preserved</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800">
              <span className="text-slate-400 block font-medium">Flagged Code Notes</span>
              <span className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5 block">
                {MNNIT_SUBJECTS_VALIDATION_REPORT.questionableCourseCodesCount}
              </span>
              <span className="text-[11px] text-slate-500">Retained as printed in PDF</span>
            </div>
          </div>

          {/* Questionable course codes audit section */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Flagged Questionable Course Codes (Preserved As-Is From Institute Source)
            </h4>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs">
              {MNNIT_SUBJECTS_VALIDATION_REPORT.questionableCodeSamples.map((item, idx) => (
                <div key={idx} className="p-3 bg-amber-50/40 dark:bg-amber-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300 mr-2 bg-indigo-50 dark:bg-indigo-900/50 px-1.5 py-0.5 rounded">
                      {item.courseCode}
                    </span>
                    <strong className="text-slate-900 dark:text-white">{item.title}</strong>
                    <span className="text-slate-500 ml-2">({item.branch} • Sem {item.semester} • Order #{item.order})</span>
                  </div>
                  <div className="text-amber-900 dark:text-amber-300 font-medium bg-amber-100 dark:bg-amber-900/50 px-2.5 py-1 rounded-md text-[11px]">
                    Note: {item.note}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Department Breakdown */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Branch & Semester Catalog Overview
            </h4>
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3">Branch Name</th>
                    <th className="p-3">Code</th>
                    <th className="p-3">Semesters Available</th>
                    <th className="p-3">Total Subjects</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {BRANCHES.map((b) => {
                    const count = SUBJECTS.filter((s) => s.branchId === b.id).length;
                    const isIncomplete = MNNIT_SUBJECTS_VALIDATION_REPORT.branchesWithIncompleteSemesters.some(
                      (item) => item.branch.toLowerCase().includes(b.id) || item.branch === b.name
                    );

                    return (
                      <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-medium text-slate-900 dark:text-white">
                          {b.name}
                        </td>
                        <td className="p-3 font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                          {b.code}
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">
                          Sem {b.semesters.join(', ')}
                        </td>
                        <td className="p-3 font-semibold text-slate-900 dark:text-white">
                          {count}
                        </td>
                        <td className="p-3">
                          {isIncomplete ? (
                            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200">
                              Sem 7-8 pending institute upload
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200">
                              Complete (Sem 1–8)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {/* Tab Content: Academic Calendar Admin */}
      {activeTab === 'calendar' && (
        <Card className="p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="h-4 w-4 text-indigo-500" />
                MNNIT Academic Calendar Administration & Publishing
              </h3>
              <p className="text-xs text-slate-500">
                Current active schedule: Session 2026–27 (Extracted from 2-page Dean Academic official document).
              </p>
            </div>
            <Badge variant="success">Active & Published</Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 space-y-1">
              <span className="font-bold text-slate-900 dark:text-white block">
                Odd Semester (Page 2)
              </span>
              <p className="text-slate-500">
                July 9 – Dec 31, 2026 • 77 Teaching Days (Others)
              </p>
              <span className="text-[11px] text-emerald-600 font-medium block">
                35 Events Extracted & Verified
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 space-y-1">
              <span className="font-bold text-slate-900 dark:text-white block">
                Even Semester (Page 1)
              </span>
              <p className="text-slate-500">
                Jan 1 – June 30, 2027 • 71 Teaching Days
              </p>
              <span className="text-[11px] text-emerald-600 font-medium block">
                29 Events Extracted & Verified
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 space-y-1">
              <span className="font-bold text-slate-900 dark:text-white block">
                July 2027 Transition (Page 1)
              </span>
              <p className="text-slate-500">
                Bridge to 2027-28 Session • Summer Vacation End & Reg
              </p>
              <span className="text-[11px] text-indigo-600 font-medium block">
                4 Events Extracted & Verified
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/30 p-3.5 text-xs text-amber-900 dark:text-amber-200 space-y-1">
            <p className="font-bold">Access Control & Security Policy:</p>
            <p className="leading-relaxed text-[11px]">
              Only authorized Dean (Academic) administrators with verified `@mnnit.ac.in` administrative credentials will be permitted to push revised calendar addenda, reschedule midsems, or modify declared holidays once Milestone 2 Firebase RBAC is active.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
