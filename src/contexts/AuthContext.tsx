import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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

  // Initialize: check for existing session
  useEffect(() => {
    const initialize = async () => {
      // Set timeout to prevent indefinite loading spinner
      const timeoutId = setTimeout(() => {
        console.warn('[Auth] Session check timeout, clearing cached auth');
        // Clear any cached auth data on timeout
        const authKeys = Object.keys(localStorage).filter(key => 
          key.startsWith('sb-') || key.includes('supabase')
        );
        authKeys.forEach(key => localStorage.removeItem(key));
        setLoading(false);
      }, 5000); // 5 second timeout

      try {
        let { data: { session: existingSession }, error } = await supabase.auth.getSession();
        
        clearTimeout(timeoutId);
        
        // If session is null but we have a refresh token, attempt refresh
        if (!existingSession && error?.status !== 401) {
          console.log('[Auth] No session found, attempting to refresh...');
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (!refreshError && refreshData.session) {
            existingSession = refreshData.session;
            error = null;
            console.log('[Auth] Token refreshed successfully on init');
          }
        }
        
        if (error) {
          console.error('[Auth] Session error:', error);
          // Clear any cached auth data
          const authKeys = Object.keys(localStorage).filter(key => 
            key.startsWith('sb-') || key.includes('supabase')
          );
          authKeys.forEach(key => localStorage.removeItem(key));
          setLoading(false);
          return;
        }
        
        // If no session after refresh attempt, clear localStorage and let redirect happen
        if (!existingSession) {
          const authKeys = Object.keys(localStorage).filter(key => 
            key.startsWith('sb-') || key.includes('supabase')
          );
          authKeys.forEach(key => localStorage.removeItem(key));
          setLoading(false);
          return;
        }
        
        // Valid session exists
        setSession(existingSession);
        setSupabaseUser(existingSession.user);
        const profile = await fetchUserProfile(existingSession.user.id);
        setUser(profile);
        setLoading(false);
        
      } catch (err) {
        clearTimeout(timeoutId);
        console.error('[Auth] Init error:', err);
        // Clear any cached auth data on error
        const authKeys = Object.keys(localStorage).filter(key => 
          key.startsWith('sb-') || key.includes('supabase')
        );
        authKeys.forEach(key => localStorage.removeItem(key));
        setLoading(false);
      }
    };

    initialize();

    // Listen for auth changes (sign in/out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('[Auth] State change:', event);
        
        if (event === 'SIGNED_OUT' || !newSession) {
          setSession(null);
          setSupabaseUser(null);
          setUser(null);
        } else if (newSession) {
          setSession(newSession);
          setSupabaseUser(newSession.user);
          // Fetch profile on SIGNED_IN and TOKEN_REFRESHED (keep user data fresh)
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            const profile = await fetchUserProfile(newSession.user.id);
            setUser(profile);
          }
        }
      }
    );

    // Set up proactive token refresh (1 minute before expiry)
    const refreshInterval = setInterval(async () => {
      if (!session?.expires_at) return;
      
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = session.expires_at - now;
      
      // Refresh if token expires within 60 seconds
      if (timeUntilExpiry <= 60 && timeUntilExpiry > 0) {
        console.log(`[Auth] Proactive refresh: token expires in ${timeUntilExpiry}s`);
        const { data, error } = await supabase.auth.refreshSession();
        
        if (error) {
          console.warn('[Auth] Proactive refresh failed:', error);
        } else if (data.session) {
          setSession(data.session);
          console.log('[Auth] Proactive refresh successful');
        }
      }
    }, 30000); // Check every 30 seconds

    return () => {
      subscription.unsubscribe();
      clearInterval(refreshInterval);
    };
  }, [fetchUserProfile, session?.expires_at]);

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
