import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const initializationAttempted = useRef(false);
  const refreshTimeoutRef = useRef<number | null>(null);

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

  // Check if a session is valid (not expired)
  const isSessionValid = useCallback((sess: Session | null): boolean => {
    if (!sess?.expires_at) return false;
    
    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = sess.expires_at - now;
    
    // Consider valid if expires in more than 30 seconds
    return timeUntilExpiry > 30;
  }, []);

  // Clear only Supabase auth data from localStorage
  const clearAuthStorage = useCallback(() => {
    console.log('[Auth] Clearing auth storage');
    const authKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('sb-') || key.includes('supabase')
    );
    authKeys.forEach(key => localStorage.removeItem(key));
    sessionStorage.clear();
  }, []);

  // Schedule proactive token refresh
  const scheduleTokenRefresh = useCallback((sess: Session) => {
    // Clear existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }

    if (!sess.expires_at) return;

    const now = Math.floor(Date.now() / 1000);
    const expiresIn = sess.expires_at - now;
    
    // Refresh 2 minutes before expiry (or immediately if already expired/expiring soon)
    const refreshIn = Math.max(0, (expiresIn - 120) * 1000);
    
    console.log(`[Auth] Scheduling token refresh in ${Math.floor(refreshIn / 1000)}s (token expires in ${expiresIn}s)`);

    refreshTimeoutRef.current = setTimeout(async () => {
      console.log('[Auth] Proactive token refresh triggered');
      
      try {
        const { data, error } = await supabase.auth.refreshSession();
        
        if (error) {
          console.error('[Auth] Proactive refresh failed:', error);
          // If refresh fails, user needs to sign in again
          setSession(null);
          setSupabaseUser(null);
          setUser(null);
          clearAuthStorage();
        } else if (data.session) {
          console.log('[Auth] Token refreshed successfully');
          setSession(data.session);
          // Schedule next refresh
          scheduleTokenRefresh(data.session);
        }
      } catch (err) {
        console.error('[Auth] Proactive refresh exception:', err);
        setSession(null);
        setSupabaseUser(null);
        setUser(null);
        clearAuthStorage();
      }
    }, refreshIn);
  }, [clearAuthStorage]);

  // Initialize: check for existing session with intelligent retry
  useEffect(() => {
    // Only initialize once
    if (initializationAttempted.current) return;
    initializationAttempted.current = true;

    const initialize = async () => {
      console.log('[Auth] Initializing auth context...');
      
      try {
        // Attempt 1: Get current session
        let { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        console.log('[Auth] Initial session check:', {
          hasSession: !!currentSession,
          isValid: isSessionValid(currentSession),
          error: error?.message,
        });

        // If session exists but is expired or invalid, try refresh
        if (currentSession && !isSessionValid(currentSession)) {
          console.log('[Auth] Session exists but expired/expiring, attempting refresh...');
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (!refreshError && refreshData.session) {
            currentSession = refreshData.session;
            error = null;
            console.log('[Auth] Session refreshed successfully on init');
          } else {
            console.warn('[Auth] Session refresh failed:', refreshError?.message);
            currentSession = null;
          }
        }
        
        // If no session found, try refresh (in case there's a valid refresh token)
        if (!currentSession && !error) {
          console.log('[Auth] No session found, attempting refresh from stored token...');
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (!refreshError && refreshData.session) {
            currentSession = refreshData.session;
            console.log('[Auth] Session recovered via refresh token');
          } else {
            console.log('[Auth] No refresh token available or refresh failed');
          }
        }
        
        // Handle authentication error (invalid/expired tokens)
        if (error?.message?.includes('refresh_token_not_found') || 
            error?.message?.includes('invalid') ||
            error?.status === 401) {
          console.warn('[Auth] Auth error detected, clearing storage:', error.message);
          clearAuthStorage();
          setLoading(false);
          return;
        }
        
        // If still no valid session after all attempts, clear and finish
        if (!currentSession || !isSessionValid(currentSession)) {
          console.log('[Auth] No valid session available after initialization');
          clearAuthStorage();
          setSession(null);
          setSupabaseUser(null);
          setUser(null);
          setLoading(false);
          return;
        }
        
        // Valid session established!
        console.log('[Auth] Valid session established');
        setSession(currentSession);
        setSupabaseUser(currentSession.user);
        
        // Fetch user profile (non-blocking - system works even if this fails)
        try {
          const profile = await fetchUserProfile(currentSession.user.id);
          if (profile) {
            setUser(profile);
          } else {
            console.warn('[Auth] No user profile found in database, creating from auth user');
            // Fallback: create basic user object from Supabase auth user
            setUser({
              id: currentSession.user.id,
              email: currentSession.user.email || '',
              full_name: currentSession.user.user_metadata?.full_name || 
                        currentSession.user.email?.split('@')[0] || 
                        'User',
              created_at: currentSession.user.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString(),
            } as User);
          }
        } catch (err) {
          console.error('[Auth] Profile fetch failed, using fallback:', err);
          // Even if profile fetch fails, create fallback user so app doesn't hang
          setUser({
            id: currentSession.user.id,
            email: currentSession.user.email || '',
            full_name: currentSession.user.user_metadata?.full_name || 
                      currentSession.user.email?.split('@')[0] || 
                      'User',
            created_at: currentSession.user.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as User);
        }
        
        // Schedule proactive refresh
        scheduleTokenRefresh(currentSession);
        
        setLoading(false);
        
      } catch (err) {
        console.error('[Auth] Initialization exception:', err);
        clearAuthStorage();
        setSession(null);
        setSupabaseUser(null);
        setUser(null);
        setLoading(false);
      }
    };

    initialize();

    // Cleanup on unmount
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [isSessionValid, fetchUserProfile, scheduleTokenRefresh, clearAuthStorage]);

  // Listen for auth state changes
  useEffect(() => {
    console.log('[Auth] Setting up auth state listener');
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('[Auth] Auth state change:', event, { hasSession: !!newSession });
        
        if (event === 'SIGNED_OUT') {
          console.log('[Auth] User signed out');
          setSession(null);
          setSupabaseUser(null);
          setUser(null);
          if (refreshTimeoutRef.current) {
            clearTimeout(refreshTimeoutRef.current);
            refreshTimeoutRef.current = null;
          }
        } else if (event === 'TOKEN_REFRESHED' && newSession) {
          console.log('[Auth] Token refreshed via auth listener');
          setSession(newSession);
          setSupabaseUser(newSession.user);
          // Reschedule next refresh
          scheduleTokenRefresh(newSession);
          // Update user profile on refresh (keep data fresh, but don't block)
          try {
            const profile = await fetchUserProfile(newSession.user.id);
            if (profile) setUser(profile);
          } catch (err) {
            console.warn('[Auth] Profile fetch failed on refresh:', err);
          }
        } else if (event === 'SIGNED_IN' && newSession) {
          console.log('[Auth] User signed in');
          setSession(newSession);
          setSupabaseUser(newSession.user);
          // Fetch profile or create fallback
          try {
            const profile = await fetchUserProfile(newSession.user.id);
            if (profile) {
              setUser(profile);
            } else {
              setUser({
                id: newSession.user.id,
                email: newSession.user.email || '',
                full_name: newSession.user.user_metadata?.full_name || 
                          newSession.user.email?.split('@')[0] || 
                          'User',
                created_at: newSession.user.created_at || new Date().toISOString(),
                updated_at: new Date().toISOString(),
              } as User);
            }
          } catch (err) {
            console.error('[Auth] Profile fetch failed on sign in:', err);
            setUser({
              id: newSession.user.id,
              email: newSession.user.email || '',
              full_name: newSession.user.user_metadata?.full_name || 
                        newSession.user.email?.split('@')[0] || 
                        'User',
              created_at: newSession.user.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString(),
            } as User);
          }
          scheduleTokenRefresh(newSession);
        } else if (!newSession) {
          console.log('[Auth] No session in auth state change');
          setSession(null);
          setSupabaseUser(null);
          setUser(null);
        }
      }
    );

    return () => {
      console.log('[Auth] Cleaning up auth state listener');
      subscription.unsubscribe();
    };
  }, [fetchUserProfile, scheduleTokenRefresh]);

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('[Auth] Sign in attempt for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        console.error('[Auth] Sign in error:', error.message);
        return { success: false, error: error.message };
      }
      
      if (!data.session || !data.user) {
        console.error('[Auth] Sign in returned no session');
        return { success: false, error: 'No session returned' };
      }

      console.log('[Auth] Sign in successful');
      
      // State will be updated by onAuthStateChange listener
      // But set immediately for faster UI response
      setSession(data.session);
      setSupabaseUser(data.user);
      
      // Fetch profile or create fallback
      try {
        const profile = await fetchUserProfile(data.user.id);
        if (profile) {
          setUser(profile);
        } else {
          console.warn('[Auth] No profile found on sign in, creating fallback');
          setUser({
            id: data.user.id,
            email: data.user.email || '',
            full_name: data.user.user_metadata?.full_name || 
                      data.user.email?.split('@')[0] || 
                      'User',
            created_at: data.user.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as User);
        }
      } catch (err) {
        console.error('[Auth] Profile fetch error on sign in:', err);
        setUser({
          id: data.user.id,
          email: data.user.email || '',
          full_name: data.user.user_metadata?.full_name || 
                    data.user.email?.split('@')[0] || 
                    'User',
          created_at: data.user.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as User);
      }
      
      // Schedule refresh
      scheduleTokenRefresh(data.session);

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign in failed';
      console.error('[Auth] Sign in exception:', message);
      return { success: false, error: message };
    }
  };

  const signOut = async () => {
    try {
      console.log('[Auth] Signing out...');
      
      // Cancel any pending refresh
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
      
      await supabase.auth.signOut();
      clearAuthStorage();
      
    } catch (err) {
      console.error('[Auth] Sign out error:', err);
      // Still clear state even if API call fails
      clearAuthStorage();
    }
    
    // Always clear state
    setSession(null);
    setSupabaseUser(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, supabaseUser, session, loading, signIn, signOut }}>
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
