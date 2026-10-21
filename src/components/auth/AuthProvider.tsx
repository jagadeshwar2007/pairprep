'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { safeNextPath } from '@/lib/auth/redirects';
import { parseAccess, type Access } from '@/lib/auth/permissions';

export type AuthStatus = 'loading' | 'signed_out' | 'signed_in' | 'error' | 'unconfigured';

interface AuthContextValue {
  status: AuthStatus;
  /** What the server rendered ('loading', or 'unconfigured'); used for hydration renders. */
  initialStatus: AuthStatus;
  /** Role + permissions from the database (my_access). UI hints only; the server re-checks everything. */
  access: Access | null;
  error: string | null;
  /** Email domains students may sign in with. Empty = unrestricted. */
  allowedDomains: string[];
  refresh: () => Promise<void>;
  signInWithGoogle: (next?: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const noopSubscribe = () => () => {};
/** false during server rendering AND the hydration render; true afterwards (React guarantees this ordering). */
const useHydrated = () =>
  useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

/**
 * Auth state for UI. Because React hydrates <Suspense> boundaries lazily (possibly after this
 * provider's effects already moved `status` on from "loading"), every consumer's OWN hydration
 * render must see exactly what the server rendered. useSyncExternalStore gives that guarantee per
 * component: it returns the server snapshot while that component hydrates, then the real state.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  const hydrated = useHydrated();
  return useMemo(
    () => (hydrated ? ctx : { ...ctx, status: ctx.initialStatus, access: null, error: null, allowedDomains: [] }),
    [hydrated, ctx],
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [status, setStatus] = useState<AuthStatus>(configured ? 'loading' : 'unconfigured');
  const [access, setAccess] = useState<Access | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [allowedDomains, setAllowedDomains] = useState<string[]>([]);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    if (!configured) return;
    const supabase = getBrowserClient();
    const { data: sessionData } = await supabase.auth.getSession();
    if (!mounted.current) return;
    if (!sessionData.session) {
      setAccess(null);
      setError(null);
      setStatus('signed_out');
      return;
    }
    const { data, error: rpcError } = await supabase.rpc('my_access');
    if (!mounted.current) return;
    if (rpcError) {
      console.error('[auth] could not load account:', rpcError.message);
      setAccess(null);
      setError('We could not load your account. Check your connection and try again.');
      setStatus('error');
      return;
    }
    const parsed = parseAccess(data);
    setAccess(parsed);
    setError(null);
    setStatus(parsed ? 'signed_in' : 'signed_out');
  }, [configured]);

  useEffect(() => {
    mounted.current = true;
    if (!configured) return;
    const supabase = getBrowserClient();

    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading the session on mount; state is set after the awaited calls resolve
    void load();
    void supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'allowed_email_domains')
      .maybeSingle()
      .then(({ data }) => {
        if (mounted.current && Array.isArray(data?.value)) setAllowedDomains(data.value as string[]);
      });

    // Never await Supabase calls inside this callback (it can deadlock auth); defer instead.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setAccess(null);
        setStatus('signed_out');
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
        setTimeout(() => void load(), 0);
      }
    });

    // Pick up role / suspension / notification changes when the user returns to the tab.
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [configured, load]);

  const signInWithGoogle = useCallback(
    async (next?: string) => {
      if (!configured) return { error: 'The backend is not configured yet.' };
      const redirectTo = new URL('/auth/callback', window.location.origin);
      const safeNext = safeNextPath(next, '');
      if (safeNext) redirectTo.searchParams.set('next', safeNext);

      const { error: oauthError } = await getBrowserClient().auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo.toString(),
          // "hd" only pre-selects the Google account chooser. Enforcement is server-side.
          queryParams: { prompt: 'select_account', ...(allowedDomains.length === 1 ? { hd: allowedDomains[0] } : {}) },
        },
      });
      if (oauthError) {
        console.error('[auth] sign-in failed:', oauthError.message);
        return { error: 'Google sign-in could not be started. Please try again.' };
      }
      return {};
    },
    [configured, allowedDomains],
  );

  const signOut = useCallback(async () => {
    if (configured) {
      const { error: signOutError } = await getBrowserClient().auth.signOut();
      if (signOutError) console.error('[auth] sign-out error:', signOutError.message);
    }
    setAccess(null);
    setStatus(configured ? 'signed_out' : 'unconfigured');
    router.replace('/');
    router.refresh();
  }, [configured, router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      initialStatus: configured ? 'loading' : 'unconfigured',
      access,
      error,
      allowedDomains,
      refresh: load,
      signInWithGoogle,
      signOut,
    }),
    [status, configured, access, error, allowedDomains, load, signInWithGoogle, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
