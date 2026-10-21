'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, User as UserIcon, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { authErrorMessage, useAuth } from './AuthProvider';
import { NotConfigured } from './RequireAuth';

/** Only allow same-site relative redirects after sign-in. */
function safeNext(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/login') || next.startsWith('/register')) {
    return '/dashboard';
  }
  return next;
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1S8.7 5.8 12 5.8c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 6.7 2.3 2.4 6.6 2.4 12s4.3 9.7 9.6 9.7c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  );
}

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const { configured, signIn, signUp, signInWithGoogle, resetPassword } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const next = safeNext(params.get('next'));

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!configured) return <NotConfigured />;

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    setBusy(true);
    try {
      await fn();
      router.replace(next);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'register' && password.length < 8) {
      setError('Use a password with at least 8 characters.');
      return;
    }
    run(() => (mode === 'login' ? signIn(email.trim(), password) : signUp(name.trim(), email.trim(), password)));
  };

  const onReset = async () => {
    if (!email.trim()) {
      setError('Enter your email address first, then choose “Forgot password”.');
      return;
    }
    try {
      await resetPassword(email.trim());
      toast('If an account exists for that email, a reset link is on its way.', 'success');
    } catch (err) {
      setError(authErrorMessage(err));
    }
  };

  const other = mode === 'login' ? '/register' : '/login';
  const otherQs = params.get('next') ? `?next=${encodeURIComponent(next)}` : '';

  return (
    <div className="mx-auto w-full max-w-md px-4 py-12">
      <Card className="p-6 sm:p-8 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {mode === 'login' ? 'Sign in to PairPrep' : 'Create your account'}
          </h1>
          <p className="text-sm text-slate-500">
            {mode === 'login'
              ? 'You only need an account to submit resources or review them. Browsing is open to everyone.'
              : 'Accounts let you submit resources and follow their review.'}
          </p>
        </div>

        {error && (
          <div role="alert" className="flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> {error}
          </div>
        )}

        <Button variant="outline" className="w-full" disabled={busy} onClick={() => run(signInWithGoogle)}>
          <GoogleIcon /> Continue with Google
        </Button>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" /> or with email <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
        </div>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {mode === 'register' && (
            <Field label="Name" htmlFor="name">
              <Input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} icon={<UserIcon className="h-4 w-4" />} maxLength={80} />
            </Field>
          )}
          <Field label="Email" htmlFor="email" required>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} icon={<Mail className="h-4 w-4" />} />
          </Field>
          <Field label="Password" htmlFor="password" required hint={mode === 'register' ? 'At least 8 characters.' : undefined}>
            <Input
              id="password"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock className="h-4 w-4" />}
            />
          </Field>
          {mode === 'login' && (
            <button type="button" onClick={onReset} className="text-xs text-indigo-600 hover:underline cursor-pointer">
              Forgot password?
            </button>
          )}
          <Button type="submit" variant="primary" className="w-full" isLoading={busy}>
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </Button>
        </form>

        <p className="text-center text-sm text-slate-500">
          {mode === 'login' ? 'New to PairPrep?' : 'Already have an account?'}{' '}
          <Link href={`${other}${otherQs}`} className="font-medium text-indigo-600 hover:underline">
            {mode === 'login' ? 'Create an account' : 'Sign in'}
          </Link>
        </p>
      </Card>
    </div>
  );
}
