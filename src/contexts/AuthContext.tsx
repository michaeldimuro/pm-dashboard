import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Create a minimal User from Supabase session metadata.
 * Used as an immediate fallback while the full profile loads from the database.
 */
function userFromSession(session: Session): User {
  const u = session.user;
  return {
    id: u.id,
    email: u.email || '',
    full_name: u.user_metadata?.full_name || u.email?.split('@')[0] || 'User',
    created_at: u.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as User;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const profileFetchedFor = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    /**
     * Fetch the full user profile from the database.
     * Runs in background — doesn't block auth or loading state.
     * Deduplicated per user ID to avoid redundant calls on token refresh.
     */
    const fetchProfile = (userId: string) => {
      if (profileFetchedFor.current === userId) return;
      profileFetchedFor.current = userId;

      supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
        .then(({ data, error }) => {
          if (!error && mounted && data) setUser(data);
        });
    };

    /**
     * Process a session from any source (init, sign-in, refresh, sign-out).
     * Single handler ensures consistent state regardless of the trigger.
     */
    const processSession = (newSession: Session | null) => {
      if (!mounted) return;
      setSession(newSession);
      if (newSession) {
        setUser(userFromSession(newSession));
        fetchProfile(newSession.user.id);
      } else {
        setUser(null);
        profileFetchedFor.current = null;
      }
    };

    // 1. Read cached session from localStorage (fast, no network call).
    //    This sets the initial state so protected routes render immediately
    //    for users with a cached session, without waiting for network validation.
    supabase.auth.getSession()
      .then(({ data: { session: cached } }) => {
        if (mounted) {
          processSession(cached);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    // 2. Listen for auth events (sign-in, sign-out, token refresh).
    //    Supabase auto-refreshes tokens via autoRefreshToken: true.
    //    This listener keeps our React state in sync with the Supabase client.
    //
    //    Key events:
    //    - SIGNED_IN: user just logged in (or session restored)
    //    - TOKEN_REFRESHED: access token was refreshed automatically
    //    - SIGNED_OUT: user signed out or refresh token expired
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!mounted) return;
        processSession(newSession);
        // Ensure loading is cleared if getSession hasn't resolved yet
        setLoading(false);
      }
    );

    // 3. Safety net: never stay on loading screen forever.
    //    If getSession() hangs or the Supabase client stalls, this guarantees
    //    the app becomes interactive (showing either the dashboard or login).
    const timeout = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 5000);

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { success: false, error: error.message };
      // onAuthStateChange listener handles setting session/user state.
      // The calling component should keep its loading spinner until the
      // auth state change triggers a redirect via PublicRoute.
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Sign in failed' };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Best effort — clear local state regardless of API result
    }
    setSession(null);
    setUser(null);
    profileFetchedFor.current = null;
    // Remove any stale auth data from storage
    Object.keys(localStorage)
      .filter(k => k.startsWith('sb-') || k.includes('supabase'))
      .forEach(k => localStorage.removeItem(k));
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
