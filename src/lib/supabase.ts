import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Debug wrapper for fetch to track what's happening with requests
const debugFetch: typeof fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const shortUrl = url.replace(supabaseUrl || '', '');
  
  console.log(`[Fetch] START: ${shortUrl}`);
  
  // Remove the signal to prevent abort issues (temporary debug measure)
  const cleanInit = init ? { ...init } : {};
  if (cleanInit.signal) {
    console.log(`[Fetch] Signal present on ${shortUrl}, removing to test...`);
    delete cleanInit.signal;
  }
  
  try {
    const response = await fetch(input, cleanInit);
    console.log(`[Fetch] SUCCESS: ${shortUrl} - ${response.status}`);
    return response;
  } catch (error) {
    console.error(`[Fetch] ERROR: ${shortUrl}`, error);
    throw error;
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Storage key prefix to isolate auth data
    storageKey: 'sb-pm-dashboard-auth',
    // Disable auto-refresh on focus (we handle it manually with better logic)
    flowType: 'pkce',
    // Use localStorage explicitly (not automatic detection)
    storage: window.localStorage,
    // Debug mode for better error visibility
    debug: import.meta.env.DEV,
  },
  global: {
    headers: {
      'X-Client-Info': 'mission-control-dashboard',
    },
    // Use our debug fetch wrapper
    fetch: debugFetch,
  },
});

// Helper to get auth headers for API calls
// Automatically refreshes token if expired
// Returns null if no valid session exists or refresh fails
export const getAuthHeaders = async (): Promise<Record<string, string> | null> => {
  try {
    let { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('[Supabase] Error getting session for headers:', error);
      return null;
    }
    
    // No session - try refresh
    if (!session) {
      console.log('[Supabase] No session in getAuthHeaders, attempting refresh');
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !refreshData.session) {
        console.warn('[Supabase] Refresh failed, need to sign in');
        return null;
      }
      
      session = refreshData.session;
    }
    
    if (!session?.access_token) {
      console.warn('[Supabase] No access token available');
      return null;
    }
    
    // Check if token is expired or expiring soon (within 5 seconds)
    const expiresAt = session.expires_at;
    const now = Math.floor(Date.now() / 1000);
    
    if (expiresAt && now >= expiresAt - 5) {
      console.log('[Supabase] Token expired or expiring soon, attempting refresh');
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !refreshData.session) {
        console.error('[Supabase] Token refresh failed:', refreshError);
        return null;
      }
      
      session = refreshData.session;
      console.log('[Supabase] Token refreshed successfully');
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
