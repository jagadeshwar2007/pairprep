'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Flag, History, LayoutDashboard, Library, ScrollText, Settings, ShieldCheck, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  '/admin': LayoutDashboard,
  '/admin/moderation': ShieldCheck,
  '/admin/resources': Library,
  '/admin/reports': Flag,
  '/admin/users': Users,
  '/admin/audit': ScrollText,
  '/admin/settings': Settings,
};

export interface AdminNavItem {
  href: string;
  label: string;
}

/** Items are already filtered by the server to what this user may open. */
export function AdminNav({ items }: { items: AdminNavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="-mx-1 flex gap-1 overflow-x-auto border-b border-slate-200 px-1 pb-2 dark:border-slate-800">
      {items.map(({ href, label }) => {
        const Icon = ICONS[href] ?? History;
        const active = href === '/admin' ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
              active ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
