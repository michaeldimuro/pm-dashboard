import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User as SupabaseUser, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  session: Session | null;
  loading: boolean;
  authError: string | null;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  checkSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth timeout duration in milliseconds
const AUTH_TIMEOUT_MS = 8000;
// Session check interval (5 minutes)
const SESSION_CHECK_INTERVAL_MS = 5 * 60 * 1000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const sessionCheckInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const isInitialized = useRef(false);

  const clearAuthState = useCallback(() => {
    console.log('[Auth] Clearing auth state');
    setSession(null);
    setSupabaseUser(null);
    setUser(null);
    setAuthError(null);
  }, []);

  const clearStorageAndState = useCallback(() => {
    console.log('[Auth] Clearing storage and state');
    // Clear Supabase-specific keys instead of all localStorage
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key === 'supabase_project')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    sessionStorage.clear();
    clearAuthState();
  }, [clearAuthState]);

  const fetchUserProfile = useCallback(async (userId: string): Promise<User | null> => {
    try {
      console.log('[Auth] Fetching user profile for:', userId);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[Auth] Error fetching user profile:', error);
        return null;
      }
      
      console.log('[Auth] User profile loaded:', data?.email);
      return data;
    } catch (err) {
      console.error('[Auth] Exception fetching user profile:', err);
      return null;
    }
  }, []);

  // Check if current session is valid and refresh if needed
  const checkSession = useCallback(async (): Promise<boolean> => {
    try {
      console.log('[Auth] Checking session validity...');
      
      // Add timeout to prevent hanging
      const getSessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise<{ data: { session: null }, error: Error }>((resolve) =>
        setTimeout(() => {
          console.warn('[Auth] Session check timed out');
          resolve({ data: { session: null }, error: new Error('Session check timed out') });
        }, 5000)
      );
      
      const { data: { session: currentSession }, error } = await Promise.race([getSessionPromise, timeoutPromise]);
      
      if (error) {
        console.error('[Auth] Session check error:', error);
        // Don't clear storage on timeout - might be temporary network issue
        if (error.message !== 'Session check timed out') {
          clearStorageAndState();
        }
        return false;
      }
      
      if (!currentSession) {
        console.log('[Auth] No active session');
        clearAuthState();
        return false;
      }
      
      // Check if token is expired or about to expire (within 60 seconds)
      const expiresAt = currentSession.expires_at;
      const now = Math.floor(Date.now() / 1000);
      const isExpired = expiresAt ? now >= expiresAt : false;
      const isNearExpiry = expiresAt ? (expiresAt - now) < 60 : false;
      
      if (isExpired || isNearExpiry) {
        console.log('[Auth] Session expired or near expiry, attempting refresh...');
        
        const refreshPromise = supabase.auth.refreshSession();
        const refreshTimeoutPromise = new Promise<{ data: { session: null }, error: Error }>((resolve) =>
          setTimeout(() => {
            console.warn('[Auth] Session refresh timed out');
            resolve({ data: { session: null }, error: new Error('Session refresh timed out') });
          }, 5000)
        );
        
        const { data: refreshData, error: refreshError } = await Promise.race([refreshPromise, refreshTimeoutPromise]);
        
        if (refreshError || !refreshData.session) {
          console.error('[Auth] Session refresh failed:', refreshError);
          clearStorageAndState();
          return false;
        }
        
        console.log('[Auth] Session refreshed successfully');
        setSession(refreshData.session);
        setSupabaseUser(refreshData.session.user);
        return true;
      }
      
      console.log('[Auth] Session is valid');
      return true;
    } catch (err) {
      console.error('[Auth] Exception during session check:', err);
      // Don't clear storage on exception - might be temporary
      return false;
    }
  }, [clearAuthState, clearStorageAndState]);

  // Periodic session check
  useEffect(() => {
    if (session) {
      // Start periodic session check
      sessionCheckInterval.current = setInterval(async () => {
        const isValid = await checkSession();
        if (!isValid) {
          console.log('[Auth] Periodic check found invalid session');
        }
      }, SESSION_CHECK_INTERVAL_MS);
    }
    
    return () => {
      if (sessionCheckInterval.current) {
        clearInterval(sessionCheckInterval.current);
        sessionCheckInterval.current = null;
      }
    };
  }, [session, checkSession]);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const initializeAuth = async () => {
      console.log('[Auth] Initializing auth...');
      
      // Safeguard: Project URL mismatch detection
      const currentProject = import.meta.env.VITE_SUPABASE_URL;
      const storedProject = localStorage.getItem('supabase_project');
      
      if (storedProject && storedProject !== currentProject) {
        console.warn('[Auth] Supabase project URL changed, clearing stored auth data');
        clearStorageAndState();
      }
      localStorage.setItem('supabase_project', currentProject);

      try {
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Auth session timeout')), AUTH_TIMEOUT_MS)
        );

        const { data: { session: initialSession }, error } = await Promise.race([sessionPromise, timeoutPromise]);
        
        if (error) {
          console.error('[Auth] Get session error:', error);
          clearStorageAndState();
          setLoading(false);
          return;
        }
        
        if (initialSession) {
          console.log('[Auth] Found existing session');
          setSession(initialSession);
          setSupabaseUser(initialSession.user);
          
          const profile = await fetchUserProfile(initialSession.user.id);
          setUser(profile);
        } else {
          console.log('[Auth] No existing session');
        }
      } catch (error) {
        console.error('[Auth] Auth initialization failed:', error);
        clearStorageAndState();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('[Auth] Auth state changed:', event);
        
        switch (event) {
          case 'SIGNED_IN':
            console.log('[Auth] User signed in');
            setSession(newSession);
            setSupabaseUser(newSession?.user ?? null);
            if (newSession?.user) {
              const profile = await fetchUserProfile(newSession.user.id);
              setUser(profile);
            }
            break;
            
          case 'SIGNED_OUT':
            console.log('[Auth] User signed out');
            clearAuthState();
            break;
            
          case 'TOKEN_REFRESHED':
            console.log('[Auth] Token refreshed');
            setSession(newSession);
            setSupabaseUser(newSession?.user ?? null);
            break;
            
          case 'USER_UPDATED':
            console.log('[Auth] User updated');
            setSession(newSession);
            setSupabaseUser(newSession?.user ?? null);
            if (newSession?.user) {
              const profile = await fetchUserProfile(newSession.user.id);
              setUser(profile);
            }
            break;
            
          default:
            // Handle other events
            if (newSession) {
              setSession(newSession);
              setSupabaseUser(newSession.user);
            }
        }
        
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
      if (sessionCheckInterval.current) {
        clearInterval(sessionCheckInterval.current);
      }
    };
  }, [fetchUserProfile, clearAuthState, clearStorageAndState]);

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    console.log('[Auth] Attempting sign in for:', email);
    setAuthError(null);
    
    try {
      // Add timeout wrapper for the sign in call
      const signInPromise = supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Sign in request timed out')), AUTH_TIMEOUT_MS)
      );
      
      const { data, error } = await Promise.race([signInPromise, timeoutPromise]);
      
      if (error) {
        console.error('[Auth] Sign in error:', error);
        const errorMessage = getAuthErrorMessage(error);
        setAuthError(errorMessage);
        return { success: false, error: errorMessage };
      }
      
      if (!data.session || !data.user) {
        const errorMessage = 'Sign in failed - no session returned';
        console.error('[Auth]', errorMessage);
        setAuthError(errorMessage);
        return { success: false, error: errorMessage };
      }
      
      console.log('[Auth] Sign in successful, setting session');
      
      // Immediately set session and user
      setSession(data.session);
      setSupabaseUser(data.user);
      
      // Fetch user profile with timeout (don't block login if it fails)
      try {
        const profilePromise = fetchUserProfile(data.user.id);
        const profileTimeout = new Promise<null>((resolve) =>
          setTimeout(() => {
            console.warn('[Auth] Profile fetch timed out, continuing without profile');
            resolve(null);
          }, 5000)
        );
        
        const profile = await Promise.race([profilePromise, profileTimeout]);
        
        if (!profile) {
          console.warn('[Auth] User profile not found or timed out, but auth succeeded');
          // Still allow login even if profile fetch fails - user might be new
        }
        
        setUser(profile);
        console.log('[Auth] Sign in complete, user:', profile?.email || data.user.email);
      } catch (profileErr) {
        console.error('[Auth] Profile fetch error (non-blocking):', profileErr);
        // Don't fail login if profile fetch fails
      }
      
      return { success: true };
    } catch (err) {
      console.error('[Auth] Sign in exception:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setAuthError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    console.log('[Auth] Signing out...');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[Auth] Sign out error:', error);
      }
    } finally {
      // Always clear state even if signOut API fails
      clearStorageAndState();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        supabaseUser,
        session,
        loading,
        authError,
        signIn,
        signUp,
        signOut,
        checkSession,
      }}
    >
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

// Helper to get user-friendly error messages
function getAuthErrorMessage(error: AuthError): string {
  const message = error.message.toLowerCase();
  
  if (message.includes('invalid login credentials') || message.includes('invalid email or password')) {
    return 'Invalid login details. Please check your email and password.';
  }
  if (message.includes('email not confirmed')) {
    return 'Please verify your email address before signing in.';
  }
  if (message.includes('too many requests') || message.includes('rate limit')) {
    return 'Too many login attempts. Please wait a moment and try again.';
  }
  if (message.includes('network') || message.includes('fetch')) {
    return 'Network error. Please check your connection and try again.';
  }
  
  return error.message || 'Failed to sign in. Please try again.';
}
