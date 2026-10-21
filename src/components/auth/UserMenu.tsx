'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, Bookmark, ChevronDown, FileCheck2, LayoutDashboard, LogOut, Settings, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { landingPath, isStaff } from '@/lib/auth/permissions';
import { useAuth } from './AuthProvider';

interface UserMenuProps {
  onSignIn: () => void;
}

export function UserMenu({ onSignIn }: UserMenuProps) {
  const { status, access, signOut, refresh } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (status === 'loading') {
    return <div className="h-9 w-24 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" aria-label="Loading account" />;
  }

  if (status === 'error') {
    return (
      <Button variant="outline" size="sm" onClick={() => void refresh()} title="Account could not be loaded">
        Retry account
      </Button>
    );
  }

  if (status !== 'signed_in' || !access) {
    return (
      <Button variant="outline" size="sm" onClick={onSignIn} className="font-medium">
        Sign In
      </Button>
    );
  }

  const staffPath = isStaff(access) ? landingPath(access) : null;
  const items = [
    { href: '/account', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/account/contributions', label: 'My contributions', icon: FileCheck2 },
    { href: '/account/bookmarks', label: 'Bookmarks', icon: Bookmark },
    { href: '/account/notifications', label: 'Notifications', icon: Bell, badge: access.unreadNotifications },
    { href: '/account/settings', label: 'Profile & preferences', icon: Settings },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/70 py-1 pl-1 pr-2.5 text-sm transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:bg-slate-800 cursor-pointer"
      >
        <span className="relative">
          <Avatar name={access.fullName} email={access.email} src={access.avatarUrl} className="h-8 w-8" />
          {access.unreadNotifications > 0 && (
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" aria-label={`${access.unreadNotifications} unread notifications`} />
          )}
        </span>
        <span className="hidden max-w-[110px] truncate font-medium text-slate-800 dark:text-slate-100 lg:block">
          {access.fullName?.split(' ')[0] ?? 'Account'}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
            <Avatar name={access.fullName} email={access.email} src={access.avatarUrl} className="h-11 w-11" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{access.fullName ?? 'Student'}</p>
              <p className="truncate text-xs text-slate-500">{access.email}</p>
              <Badge variant={access.role === 'student' ? 'neutral' : 'primary'} size="sm" className="mt-1">
                {access.roleName}
              </Badge>
            </div>
          </div>

          {access.status === 'suspended' && (
            <p className="mx-3 mt-3 rounded-lg bg-rose-50 p-2 text-xs text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
              Your account is suspended. You can browse, but contributing is disabled.
            </p>
          )}

          <div className="p-1.5">
            {staffPath && (
              <Link
                role="menuitem"
                href={staffPath}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950/50"
              >
                <ShieldCheck className="h-4 w-4" />
                Admin panel
              </Link>
            )}
            {items.map(({ href, label, icon: Icon, badge }) => (
              <Link
                key={href}
                role="menuitem"
                href={href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Icon className="h-4 w-4 text-slate-400" />
                <span className="flex-1">{label}</span>
                {badge ? <Badge variant="danger" size="sm">{badge}</Badge> : null}
              </Link>
            ))}
          </div>

          <div className="border-t border-slate-100 p-1.5 dark:border-slate-800">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                void signOut();
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
            >
              <LogOut className="h-4 w-4 text-slate-400" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
