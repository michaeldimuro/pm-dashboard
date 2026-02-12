import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth timeout duration in milliseconds
const AUTH_TIMEOUT_MS = 5000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      setUser(null);
    } else {
      setUser(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    const initializeAuth = async () => {
      // Safeguard (a): Project URL mismatch detection
      // Clear localStorage if Supabase project URL has changed (e.g., different environment)
      const currentProject = import.meta.env.VITE_SUPABASE_URL;
      const storedProject = localStorage.getItem('supabase_project');
      
      if (storedProject && storedProject !== currentProject) {
        console.warn('Supabase project URL changed, clearing stored auth data');
        localStorage.clear();
        sessionStorage.clear();
      }
      localStorage.setItem('supabase_project', currentProject);

      // Safeguard (b) & (c): Auth timeout protection with try-catch fallback
      try {
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Auth session timeout')), AUTH_TIMEOUT_MS)
        );

        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);
        
        setSession(session);
        setSupabaseUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserProfile(session.user.id);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        // Clear potentially corrupted localStorage data
        localStorage.clear();
        sessionStorage.clear();
        setSession(null);
        setSupabaseUser(null);
        setUser(null);
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setSupabaseUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserProfile(session.user.id);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
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

  // Safeguard (d): Clear storage on logout
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    // Clear all stored auth data to prevent stale/corrupted state
    localStorage.clear();
    sessionStorage.clear();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        supabaseUser,
        session,
        loading,
        signIn,
        signUp,
        signOut,
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
