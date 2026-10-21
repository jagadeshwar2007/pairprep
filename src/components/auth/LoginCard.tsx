'use client';

import React from 'react';
import { AlertTriangle, BookmarkCheck, CalendarCheck, GraduationCap, Info, ShieldCheck, Upload } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { GoogleSignInButton } from './GoogleSignInButton';
import { useAuth } from './AuthProvider';

const ERROR_MESSAGES: Record<string, string> = {
  cancelled: 'Sign-in was cancelled. You can try again whenever you are ready.',
  provider_error: 'Google reported a problem while signing you in. Please try again.',
  exchange_failed: 'We could not complete the sign-in (the link may have expired). Please try again.',
  missing_code: 'The sign-in response was incomplete. Please try again.',
  no_profile: 'Your account could not be set up. Please try again, and contact an admin if it keeps happening.',
  suspended: 'This account has been suspended. Contact the Pairprep admins if you think this is a mistake.',
  domain_not_allowed: 'This Google account is not permitted. Please sign in with your college email address.',
  not_configured: 'The backend is not configured yet, so sign-in is unavailable.',
};

const REASON_MESSAGES: Record<string, string> = {
  expired: 'Your session expired. Please sign in again to continue.',
  signin: 'Please sign in to continue.',
};

const PERKS = [
  { icon: Upload, text: 'Contribute notes and papers, reviewed by moderators before they go live' },
  { icon: BookmarkCheck, text: 'Bookmark resources and sync them across devices' },
  { icon: CalendarCheck, text: 'Save your attendance records privately' },
];

interface LoginCardProps {
  error?: string | null;
  reason?: string | null;
  next?: string;
  /** Rendered inside a modal: drop the outer card chrome and heading. */
  compact?: boolean;
}

export function LoginCard({ error, reason, next, compact = false }: LoginCardProps) {
  const { allowedDomains, status, error: authError } = useAuth();
  const message = (error && (ERROR_MESSAGES[error] ?? 'Sign-in failed. Please try again.')) || null;
  const notice = !message && reason ? REASON_MESSAGES[reason] : null;

  const body = (
    <div className="space-y-5">
      {!compact && (
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 text-white shadow-md shadow-indigo-500/20">
            <GraduationCap className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Welcome to Pairprep</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Sign in or create your account in one click.</p>
        </div>
      )}

      {message && (
        <div role="alert" className="flex gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{message}</span>
        </div>
      )}
      {notice && (
        <div role="status" className="flex gap-2.5 rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-900 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-200">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{notice}</span>
        </div>
      )}
      {status === 'error' && authError && (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          {authError}
        </div>
      )}

      <GoogleSignInButton next={next} />

      {allowedDomains.length > 0 && (
        <p className="flex gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
          <span>
            Registration is limited to college accounts:{' '}
            <strong className="font-semibold">{allowedDomains.map((d) => `@${d}`).join(', ')}</strong>
          </span>
        </p>
      )}

      <ul className="space-y-2.5 border-t border-slate-100 pt-4 dark:border-slate-800">
        {PERKS.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
            <Icon className="h-4 w-4 shrink-0 text-indigo-500 mt-0.5" />
            <span>{text}</span>
          </li>
        ))}
      </ul>

      <p className="text-center text-[11px] leading-relaxed text-slate-400">
        We never see or store your Google password. By continuing you agree to Pairprep&apos;s academic honor code and
        content contribution guidelines.
      </p>
    </div>
  );

  if (compact) return body;
  return <Card className="w-full max-w-md p-6 sm:p-8 shadow-lg">{body}</Card>;
}
