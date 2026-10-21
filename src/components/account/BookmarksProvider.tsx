'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

interface BookmarksContextValue {
  ready: boolean;
  isBookmarked: (resourceId: string) => boolean;
  /** Returns an error message, or null on success. Optimistic, rolled back on failure. */
  toggle: (resourceId: string) => Promise<string | null>;
  ids: ReadonlySet<string>;
}

const BookmarksContext = createContext<BookmarksContextValue | null>(null);

export function useBookmarks(): BookmarksContextValue {
  const ctx = useContext(BookmarksContext);
  if (!ctx) throw new Error('useBookmarks must be used inside <BookmarksProvider>');
  return ctx;
}

/** Bookmarks live in the database (Row Level Security: own rows only), so they follow the student across devices. */
export function BookmarksProvider({ children }: { children: React.ReactNode }) {
  const { status, access } = useAuth();
  const userId = status === 'signed_in' ? access?.userId : null;
  const [state, setState] = useState<{ userId: string | null; ids: Set<string> }>({ userId: null, ids: new Set() });

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void getBrowserClient()
      .from('bookmarks')
      .select('resource_id')
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error('[bookmarks] load failed:', error.message);
          return;
        }
        setState({ userId, ids: new Set((data ?? []).map((r) => r.resource_id as string)) });
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Ignore bookmarks that belong to a previous account (e.g. right after switching users).
  const ids = useMemo<ReadonlySet<string>>(() => (state.userId === userId && userId ? state.ids : new Set()), [state, userId]);

  const toggle = useCallback(
    async (resourceId: string) => {
      if (!userId) return 'Sign in to save bookmarks.';
      const supabase = getBrowserClient();
      const had = ids.has(resourceId);
      const apply = (add: boolean) =>
        setState((prev) => {
          const next = new Set(prev.userId === userId ? prev.ids : []);
          if (add) next.add(resourceId);
          else next.delete(resourceId);
          return { userId, ids: next };
        });

      apply(!had);
      const { error } = had
        ? await supabase.from('bookmarks').delete().eq('resource_id', resourceId).eq('user_id', userId)
        : await supabase.from('bookmarks').insert({ resource_id: resourceId, user_id: userId });
      if (error) {
        apply(had); // roll back
        console.error('[bookmarks] toggle failed:', error.message);
        return error.code === '23505' ? null : 'Could not update your bookmark. Please try again.';
      }
      return null;
    },
    [ids, userId],
  );

  const value = useMemo<BookmarksContextValue>(
    () => ({ ready: Boolean(userId) && state.userId === userId, isBookmarked: (id) => ids.has(id), toggle, ids }),
    [ids, state.userId, toggle, userId],
  );
  return <BookmarksContext.Provider value={value}>{children}</BookmarksContext.Provider>;
}
