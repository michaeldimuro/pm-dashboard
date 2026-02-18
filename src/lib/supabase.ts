import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'sb-pm-dashboard-auth',
    flowType: 'pkce',
    storage: window.localStorage,
  },
  global: {
    headers: {
      'X-Client-Info': 'mission-control-dashboard',
    },
  },
});

/**
 * Get auth headers for API calls.
 * Returns null if no valid session exists.
 */
export async function getAuthHeaders(): Promise<Record<string, string> | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return null;
    return {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    };
  } catch {
    return null;
  }
}
