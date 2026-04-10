import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Security: Only use environment variables for Supabase credentials
// These must be prefixed with VITE_ to be available in the client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate that the environment variables are set
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase environment variables are not set. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  );
}

// Custom fetch with error handling for CORS and network issues
// Security: Only log method and path, never credentials
const customFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  let urlStr = '';
  if (typeof input === 'string') {
    urlStr = input;
  } else if ('url' in input) {
    urlStr = (input as Request).url;
  }
  const method = init?.method || 'GET';
  
  // Security: Only log in development mode
  if (import.meta.env.DEV) {
    console.log(`[SUPABASE FETCH] ${method} ${urlStr}`);
  }
  
  try {
    const response = await fetch(input, init);
    
    // Log CORS-related errors
    if (!response.ok && response.type === 'opaque') {
      console.error('[SUPABASE FETCH] CORS Error or network failure:', {
        url: urlStr,
        status: response.status,
        statusText: response.statusText,
        type: response.type
      });
    }
    
    return response;
  } catch (error) {
    console.error('[SUPABASE FETCH] Network error:', error);
    throw error;
  }
};

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Detect refresh token timeout and re-authenticate
    detectSessionInUrl: true,
    // Storage key prefix to avoid conflicts
    storageKey: 'autogear-supabase-auth',
  },
  global: {
    fetch: customFetch,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  },
});

// Prevent free-tier cold starts by pinging every 3 minutes
setInterval(() => {
  supabase.from('articles').select('id').limit(1).then(() => {});
}, 3 * 60 * 1000);

// Security: Add auth state change listener - only log events in dev mode
supabase.auth.onAuthStateChange((event, session) => {
  if (import.meta.env.DEV) {
    console.log('[SUPABASE AUTH] Event:', event, session ? '(session exists)' : '(no session)');
  }
  
  if (event === 'SIGNED_IN') {
    if (import.meta.env.DEV) console.log('[SUPABASE AUTH] User signed in');
  } else if (event === 'SIGNED_OUT') {
    if (import.meta.env.DEV) console.log('[SUPABASE AUTH] User signed out');
  } else if (event === 'USER_UPDATED') {
    if (import.meta.env.DEV) console.log('[SUPABASE AUTH] User updated');
  } else if (event === 'INITIAL_SESSION') {
    if (import.meta.env.DEV) console.log('[SUPABASE AUTH] Initial session loaded');
  }
});

// Export a function to manually refresh the session with error handling
export const refreshSession = async () => {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      if (import.meta.env.DEV) console.error('[SUPABASE] Manual refresh error:', error.message);
      throw error;
    }
    if (import.meta.env.DEV) console.log('[SUPABASE] Manual refresh success:', !!data.session);
    return data;
  } catch (err: any) {
    if (import.meta.env.DEV) console.error('[SUPABASE] Manual refresh failed:', err.message || err);
    throw err;
  }
};

// Export a function to check if the error is CORS-related
export const isCorsError = (error: any): boolean => {
  if (!error) return false;
  const message = error.message || String(error);
  return (
    message.includes('Failed to fetch') ||
    message.includes('NetworkError') ||
    message.includes('Network request failed') ||
    message.includes('CORS') ||
    message.includes('access-control')
  );
};
