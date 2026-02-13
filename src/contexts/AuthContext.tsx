import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  session: Session | null;
  loading: boolean;
  authError: string | null;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth timeout durations in milliseconds
const AUTH_TIMEOUT_MS = 15000; // 15 seconds for Supabase response
const UI_TIMEOUT_MS = 30000; // 30 seconds max loading before showing error

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Fetch user profile from database
  const fetchUserProfile = useCallback(async (userId: string): Promise<User | null> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[Auth] Profile fetch error:', error);
        return null;
      }
      return data;
    } catch (err) {
      console.error('[Auth] Profile fetch exception:', err);
      return null;
    }
  }, []);

  // Initialize: check for existing session with timeout protection
  useEffect(() => {
    let uiTimeoutId: ReturnType<typeof setTimeout> | null = null;
    
    const initialize = async () => {
      // UI timeout: If auth takes longer than 30s, show error instead of infinite spinner
      uiTimeoutId = setTimeout(() => {
        console.error('[Auth] UI timeout - stopping spinner');
        setAuthError('Authentication is taking longer than expected. Please refresh the page or try again.');
        setLoading(false);
      }, UI_TIMEOUT_MS);

      // Try to get cached session first (fast path)
      let cachedSession: Session | null = null;
      try {
        const { data } = await supabase.auth.getSession();
        cachedSession = data.session;
      } catch (err) {
        console.error('[Auth] Error getting cached session:', err);
      }

      // Auth timeout protection with retry logic
      let retryCount = 0;
      const maxRetries = 2;
      
      while (retryCount <= maxRetries) {
        try {
          const sessionPromise = supabase.auth.getSession();
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Auth session timeout')), AUTH_TIMEOUT_MS)
          );

          const { data: { session: existingSession }, error } = await Promise.race([
            sessionPromise,
            timeoutPromise
          ]);
          
          // Success! Clear UI timeout
          if (uiTimeoutId) {
            clearTimeout(uiTimeoutId);
            uiTimeoutId = null;
          }
          
          if (error) {
            console.error('[Auth] Session error:', error);
            setLoading(false);
            return;
          }
          
          if (existingSession) {
            setSession(existingSession);
            setSupabaseUser(existingSession.user);
            const profile = await fetchUserProfile(existingSession.user.id);
            setUser(profile);
          }
          
          setAuthError(null);
          setLoading(false);
          return; // Success, exit
          
        } catch (err) {
          console.error(`[Auth] Init attempt ${retryCount + 1} failed:`, err);
          retryCount++;
          
          if (retryCount <= maxRetries) {
            console.log(`[Auth] Retrying (${retryCount}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
          } else {
            // Max retries reached - use cached session as fallback
            console.error('[Auth] All retries failed');
            
            if (uiTimeoutId) {
              clearTimeout(uiTimeoutId);
              uiTimeoutId = null;
            }
            
            if (cachedSession) {
              console.log('[Auth] Using cached session as fallback');
              setSession(cachedSession);
              setSupabaseUser(cachedSession.user);
              const profile = await fetchUserProfile(cachedSession.user.id);
              setUser(profile);
              setAuthError(null);
            } else {
              // No cached session available
              setAuthError('Unable to load authentication. Please refresh the page or sign in again.');
            }
            
            setLoading(false);
          }
        }
      }
    };

    initialize();

    // Listen for auth changes (sign in/out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('[Auth] State change:', event);
        setAuthError(null); // Clear any auth errors on state change
        
        if (event === 'SIGNED_OUT' || !newSession) {
          setSession(null);
          setSupabaseUser(null);
          setUser(null);
        } else if (newSession) {
          setSession(newSession);
          setSupabaseUser(newSession.user);
          // Only fetch profile on SIGNED_IN (not TOKEN_REFRESHED)
          if (event === 'SIGNED_IN') {
            const profile = await fetchUserProfile(newSession.user.id);
            setUser(profile);
          }
        }
      }
    );

    return () => {
      if (uiTimeoutId) clearTimeout(uiTimeoutId);
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      if (!data.session || !data.user) {
        return { success: false, error: 'No session returned' };
      }

      // Set session immediately
      setSession(data.session);
      setSupabaseUser(data.user);
      
      // Fetch and set user profile
      const profile = await fetchUserProfile(data.user.id);
      setUser(profile);
      
      // Clear any auth errors
      setAuthError(null);

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign in failed';
      return { success: false, error: message };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      
      // Clear Supabase auth data (but preserve other localStorage items)
      const authKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('sb-') || key.includes('supabase')
      );
      authKeys.forEach(key => localStorage.removeItem(key));
      sessionStorage.clear();
    } catch (err) {
      console.error('[Auth] Sign out error:', err);
    }
    
    // Always clear state
    setSession(null);
    setSupabaseUser(null);
    setUser(null);
    setAuthError(null);
  };

  return (
    <AuthContext.Provider value={{ user, supabaseUser, session, loading, authError, signIn, signOut }}>
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
