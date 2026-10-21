'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth/AuthProvider';
import { useBookmarks } from '@/components/account/BookmarksProvider';

export function BookmarkButton({ resourceId, className }: { resourceId: string; className?: string }) {
  const { status } = useAuth();
  const { isBookmarked, toggle } = useBookmarks();
  const pathname = usePathname();
  const [error, setError] = useState<string | null>(null);

  if (status !== 'signed_in') {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(pathname)}`}
        title="Sign in to bookmark"
        className={cn('text-slate-400 hover:text-indigo-600 transition-colors', className)}
        aria-label="Sign in to bookmark this resource"
      >
        <Bookmark className="h-4 w-4" />
      </Link>
    );
  }

  const saved = isBookmarked(resourceId);
  return (
    <button
      type="button"
      onClick={async () => setError(await toggle(resourceId))}
      title={error ?? (saved ? 'Remove bookmark' : 'Save bookmark')}
      aria-pressed={saved}
      aria-label={saved ? 'Remove bookmark' : 'Save bookmark'}
      className={cn(
        'transition-colors cursor-pointer',
        error ? 'text-rose-500' : saved ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-indigo-600',
        className,
      )}
    >
      {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
    </button>
  );
}
