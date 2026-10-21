'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ShieldCheck, Mail, Lock, Info, GraduationCap } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
  };

  const handleReset = () => {
    setIsSubmitted(false);
    setEmail('');
    setPassword('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleReset}
      title="Student Sign-In"
      description="Access your personalized course bookmarks, solved papers, and peer discussions."
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Milestone 2 Disclaimer Banner */}
        <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/70 dark:border-indigo-900/60 dark:bg-indigo-950/40 p-3.5 text-xs text-indigo-900 dark:text-indigo-200 flex gap-2.5 items-start">
          <Info className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Milestone Notice:</span> Firebase Authentication with official MNNIT GSuite (@mnnit.ac.in) domain verification will be configured in the next phase. This form demonstrates the future sign-in workflow.
          </div>
        </div>

        {isSubmitted ? (
          <div className="py-6 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h4 className="text-base font-semibold text-slate-900 dark:text-white">
              Authentication Preview Received
            </h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
              Simulated verification for <span className="font-medium text-slate-700 dark:text-slate-200">{email || 'student@mnnit.ac.in'}</span>. Real database credentials will connect once Firebase is active.
            </p>
            <Button variant="primary" onClick={handleReset} className="w-full mt-4">
              Return to Platform
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                MNNIT Student Email
              </label>
              <Input
                type="email"
                required
                placeholder="registration_number@mnnit.ac.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="h-4 w-4" />}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Password
              </label>
              <Input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock className="h-4 w-4" />}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                <span>Remember this device</span>
              </label>
              <span className="text-indigo-600 hover:underline cursor-pointer">Forgot password?</span>
            </div>

            <Button type="submit" variant="primary" className="w-full">
              <GraduationCap className="h-4 w-4 mr-2" />
              Sign In with MNNIT GSuite (Demo)
            </Button>

            <p className="text-center text-xs text-slate-400 pt-2">
              By continuing, you agree to Pairprep&apos;s academic honor code and content contribution guidelines.
            </p>
          </form>
        )}
      </div>
    </Modal>
  );
}
