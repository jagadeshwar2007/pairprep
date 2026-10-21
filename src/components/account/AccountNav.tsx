'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Bookmark, FileCheck2, LayoutDashboard, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth/AuthProvider';

const LINKS = [
  { href: '/account', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/account/contributions', label: 'My contributions', icon: FileCheck2 },
  { href: '/account/bookmarks', label: 'Bookmarks', icon: Bookmark },
  { href: '/account/notifications', label: 'Notifications', icon: Bell },
  { href: '/account/settings', label: 'Profile & preferences', icon: Settings },
];

export function AccountNav() {
  const pathname = usePathname();
  const { access } = useAuth();
  return (
    <nav aria-label="Account" className="-mx-1 flex gap-1 overflow-x-auto border-b border-slate-200 px-1 pb-2 dark:border-slate-800">
      {LINKS.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
            {href === '/account/notifications' && access && access.unreadNotifications > 0 && (
              <span className={cn('rounded-full px-1.5 text-[10px] font-bold', active ? 'bg-white text-indigo-700' : 'bg-rose-500 text-white')}>
                {access.unreadNotifications}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
