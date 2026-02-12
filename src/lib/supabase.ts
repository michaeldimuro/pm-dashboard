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
    // Storage key prefix to isolate auth data
    storageKey: 'sb-pm-dashboard-auth',
  },
});

// Helper to get auth headers for API calls
// Returns null if no valid session exists
export const getAuthHeaders = async (): Promise<Record<string, string> | null> => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('[Supabase] Error getting session for headers:', error);
      return null;
    }
    
    if (!session?.access_token) {
      console.warn('[Supabase] No access token available');
      return null;
    }
    
    // Check if token is expired
    const expiresAt = session.expires_at;
    const now = Math.floor(Date.now() / 1000);
    
    if (expiresAt && now >= expiresAt) {
      console.log('[Supabase] Token expired, attempting refresh');
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !refreshData.session) {
        console.error('[Supabase] Token refresh failed:', refreshError);
        return null;
      }
      
      return {
        Authorization: `Bearer ${refreshData.session.access_token}`,
        'Content-Type': 'application/json',
      };
    }
    
    return {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    };
  } catch (err) {
    console.error('[Supabase] Exception getting auth headers:', err);
    return null;
  }
};

// Helper to check if user is authenticated
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    return !error && !!session;
  } catch {
    return false;
  }
};
