'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Inbox, Upload } from 'lucide-react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { PublicationBadge, VerificationBadge } from '@/components/ui/StatusBadge';
import { Table, Td, Th } from '@/components/ui/Table';
import { api } from '@/lib/api/client';
import { RESOURCE_TYPE_INFO, ROLE_LABELS, departmentLabel } from '@/lib/resources/constants';
import type { PublicationStatus, ResourceType, VerificationStatus } from '@/lib/resources/types';

interface Submission {
  id: string;
  title: string;
  subject: string;
  department: string;
  semester: number;
  resourceType: ResourceType;
  verificationStatus: VerificationStatus;
  publicationStatus: PublicationStatus;
  rejectionReason: string | null;
  createdAt: string;
}

const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { dateStyle: 'medium' });

function Submissions() {
  const { profile } = useAuth();
  const [items, setItems] = useState<Submission[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ items: Submission[] }>('/api/submissions')
      .then((r) => setItems(r.items))
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">My submissions</h1>
          <p className="mt-1 text-sm text-slate-500">
            Signed in as {profile?.displayName} · {profile ? ROLE_LABELS[profile.role] : ''}
          </p>
        </div>
        <div className="flex gap-2">
          {(profile?.role === 'reviewer' || profile?.role === 'admin') && (
            <Link href="/dashboard/reviews">
              <Button variant="outline" size="sm">My reviews</Button>
            </Link>
          )}
          <Link href="/submit">
            <Button variant="primary" size="sm"><Upload className="h-3.5 w-3.5" /> New submission</Button>
          </Link>
        </div>
      </div>

      {error ? (
        <EmptyState tone="error" icon={<AlertTriangle className="h-6 w-6" />} title="Submissions could not be loaded" description={error} />
      ) : items === null ? (
        <Skeleton className="h-48 w-full" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Inbox className="h-6 w-6" />}
          title="You haven't submitted anything yet"
          description="Share a question paper or notes from Google Drive and follow its review here."
          action={
            <Link href="/submit">
              <Button variant="primary" size="sm">Submit a resource</Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <thead>
                <tr>
                  <Th>Resource</Th>
                  <Th>Type</Th>
                  <Th>Review</Th>
                  <Th>Library</Th>
                  <Th>Submitted</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s.id}>
                    <Td>
                      <p className="font-medium text-slate-900 dark:text-white">{s.title}</p>
                      <p className="text-xs text-slate-500">{s.subject} · {departmentLabel(s.department)} · Sem {s.semester}</p>
                      {s.rejectionReason && s.verificationStatus === 'rejected' && (
                        <p className="mt-1 text-xs text-rose-600">Reviewer note: {s.rejectionReason}</p>
                      )}
                    </Td>
                    <Td className="text-xs">{RESOURCE_TYPE_INFO[s.resourceType].shortLabel}</Td>
                    <Td><VerificationBadge status={s.verificationStatus} /></Td>
                    <Td>
                      {s.publicationStatus === 'published' ? (
                        <Link href={`/library/${s.id}`} className="text-xs text-indigo-600 hover:underline">View live</Link>
                      ) : (
                        <PublicationBadge status={s.publicationStatus} />
                      )}
                    </Td>
                    <Td className="text-xs text-slate-500 whitespace-nowrap">{fmt(s.createdAt)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
          <div className="md:hidden space-y-3">
            {items.map((s) => (
              <Card key={s.id} className="p-4 space-y-2">
                <p className="font-medium text-slate-900 dark:text-white">{s.title}</p>
                <p className="text-xs text-slate-500">{s.subject} · Sem {s.semester} · {fmt(s.createdAt)}</p>
                <div className="flex gap-2">
                  <VerificationBadge status={s.verificationStatus} />
                  <PublicationBadge status={s.publicationStatus} />
                </div>
                {s.rejectionReason && s.verificationStatus === 'rejected' && (
                  <p className="text-xs text-rose-600">Reviewer note: {s.rejectionReason}</p>
                )}
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <Submissions />
    </RequireAuth>
  );
}
