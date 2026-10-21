'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onIdTokenChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { firebaseAuth, isFirebaseConfigured } from '@/lib/firebase/client';
import { api } from '@/lib/api/client';
import type { UserProfile } from '@/lib/resources/types';

interface AuthState {
  configured: boolean;
  loading: boolean;
  user: User | null;
  /** Server-issued profile. `role` here is for display only; the API re-checks it on every call. */
  profile: UserProfile | null;
  profileError: string | null;
  signIn(email: string, password: string): Promise<void>;
  signUp(name: string, email: string, password: string): Promise<void>;
  signInWithGoogle(): Promise<void>;
  resetPassword(email: string): Promise<void>;
  signOut(): Promise<void>;
  refreshProfile(): Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);

  const loadProfile = useCallback(async () => {
    try {
      const { profile } = await api<{ profile: UserProfile }>('/api/me');
      setProfile(profile);
      setProfileError(null);
    } catch (err) {
      setProfile(null);
      setProfileError(err instanceof Error ? err.message : 'Could not load your profile');
    }
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return onIdTokenChanged(firebaseAuth(), async (u) => {
      setUser(u);
      if (u) await loadProfile();
      else setProfile(null);
      setLoading(false);
    });
  }, [loadProfile]);

  const value = useMemo<AuthState>(
    () => ({
      configured: isFirebaseConfigured,
      loading,
      user,
      profile,
      profileError,
      async signIn(email, password) {
        await signInWithEmailAndPassword(firebaseAuth(), email, password);
      },
      async signUp(name, email, password) {
        const cred = await createUserWithEmailAndPassword(firebaseAuth(), email, password);
        if (name) await updateProfile(cred.user, { displayName: name });
        await cred.user.getIdToken(true);
        await loadProfile();
      },
      async signInWithGoogle() {
        await signInWithPopup(firebaseAuth(), new GoogleAuthProvider());
      },
      async resetPassword(email) {
        await sendPasswordResetEmail(firebaseAuth(), email);
      },
      async signOut() {
        await fbSignOut(firebaseAuth());
      },
      refreshProfile: loadProfile,
    }),
    [loading, user, profile, profileError, loadProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** Maps Firebase Auth error codes to plain-language messages. */
export function authErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  const messages: Record<string, string> = {
    'auth/invalid-credential': 'Email or password is incorrect.',
    'auth/wrong-password': 'Email or password is incorrect.',
    'auth/user-not-found': 'Email or password is incorrect.',
    'auth/email-already-in-use': 'An account with this email already exists. Try signing in.',
    'auth/weak-password': 'Use a password with at least 8 characters.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
    'auth/popup-closed-by-user': 'The Google sign-in window was closed before finishing.',
    'auth/network-request-failed': 'Network error. Check your connection.',
  };
  return messages[code] ?? (err instanceof Error ? err.message : 'Something went wrong.');
}
