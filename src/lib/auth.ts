import { supabase, isCorsError, refreshSession } from './supabase';

// ── GOOGLE AUTH ──

export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/`,
    },
  });
  if (error) throw error;
  return data;
};

export const signUpTechnicianWithGoogle = async () => {
  // For technicians, redirect to join page after Google sign-in
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/join`,
      queryParams: {
        role: 'technician'
      }
    },
  });
  if (error) throw error;
  return data;
};

// ── TECHNICIAN AUTH ──

export const signUpTechnician = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
      data: { role: 'technician' }
    },
  });
  if (error) throw error;
  return data;
};

export const signInTechnician = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};

// ── CLIENT AUTH ──

export const signUpClient = async (
  email: string,
  password: string,
  name: string,
  phone: string
) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
      data: {
        role: 'client',
        name,   // ← trigger reads these from user_metadata
        phone
      }
    },
  });
  if (error) throw error;

  // ✅ REMOVED: manual clients insert — trigger handles it automatically
  // This eliminates the 401 race condition entirely

  return data;
};

export const signInClient = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};

// Track concurrent auth requests for debugging
let activeAuthRequests = 0;
const authRequestLog: string[] = [];

// Get recent auth request log (for debugging)
export const getAuthRequestLog = () => [...authRequestLog];

// ── SHARED ──

export const signOut = async () => {
  try {
    // First check if there's an active session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.warn('[SIGNOUT] Session check failed, proceeding with sign-out anyway:', sessionError);
    }

    // Always attempt sign-out, even if session check fails
    // Supabase handles clearing invalid sessions gracefully
    const { error } = await supabase.auth.signOut();

    if (error) {
      // Log the error but don't throw - we want to clear local state anyway
      console.error('[SIGNOUT] Sign-out error:', error);

      // Force clear local storage as fallback
      try {
        localStorage.removeItem('mekh-supabase-auth');
        // Also try to clear any other potential auth keys
        const keys = Object.keys(localStorage).filter(key => key.includes('supabase'));
        keys.forEach(key => localStorage.removeItem(key));
        console.log('[SIGNOUT] Cleared local storage as fallback');
      } catch (storageError) {
        console.error('[SIGNOUT] Failed to clear local storage:', storageError);
      }

      // Still throw the original error so callers can handle it
      throw error;
    }

    console.log('[SIGNOUT] Successfully signed out');
  } catch (error) {
    console.error('[SIGNOUT] Sign-out failed:', error);
    throw error;
  }
};

export const getSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      throw error;
    }
    return session;
  } catch (error: any) {
    throw error;
  }
};

export const getCurrentUser = async () => {
  try {
    // Use getSession instead of getUser to avoid auth.users RLS issues
    // getSession returns the cached session which contains user info
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      // Try to handle CORS errors by attempting a manual refresh
      if (isCorsError(error)) {
        console.warn('[AUTH] CORS error detected, attempting manual token refresh...');
        try {
          await refreshSession();
          // Retry getting session after refresh
          const { data: { session: newSession } } = await supabase.auth.getSession();
          return newSession?.user ?? null;
        } catch (refreshError) {
          console.error('[AUTH] Manual refresh also failed:', refreshError);
        }
      }
      throw error;
    }
    return session?.user ?? null;
  } catch (error: any) {
    console.error('AUTH: getCurrentUser caught error:', error);
    // Provide helpful error message for CORS issues
    if (isCorsError(error)) {
      console.error('[AUTH] CRITICAL: CORS error is preventing authentication.');
      console.error('[AUTH] Please ensure your production domain is added to Supabase project allowed origins.');
    }
    throw error;
  }
};

// Helper to get user ID from session - used internally to avoid getUser() calls
export const getUserIdFromSession = async (): Promise<string | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
};

// Check if the current session is healthy (not expired and valid)
export const isSessionHealthy = async (): Promise<boolean> => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.warn('[SESSION] Session check error:', error);
      return false;
    }

    if (!session) {
      return false;
    }

    // Check if session is expired
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at;

    if (expiresAt && now > expiresAt) {
      console.warn('[SESSION] Session expired');
      return false;
    }

    // Check if access token exists and looks valid
    if (!session.access_token) {
      console.warn('[SESSION] No access token');
      return false;
    }

    return true;
  } catch (error) {
    console.error('[SESSION] Health check failed:', error);
    return false;
  }
};

export const getMyTechnicianProfile = async () => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return null;
    }

    const { data, error } = await supabase
      .from('technicians')
      .select('*, technician_services(*), technician_photos(*), technician_videos(*), technician_payments(*)')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('AUTH DEBUG: getMyTechnicianProfile error:', error);
    }
    return data;
  } catch (err) {
    throw err;
  }
};

export const getMyClientProfile = async () => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return null;
    }

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('AUTH DEBUG: getMyClientProfile error:', error);
    }
    return data;
  } catch (err) {
    throw err;
  }
};

// ── PROFILE COMPLETION FOR GOOGLE USERS ──

export const completeClientProfile = async (name: string, phone: string) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('No user logged in');

  // Get user email from session (use getSession instead of getUser to avoid RLS issues)
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.email) throw new Error('No email found');
  const email = session.user.email;

  // First check if client profile already exists
  const { data: existingClient } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingClient) {
    // Update existing profile
    const { error } = await supabase
      .from('clients')
      .update({
        name,
        phone,
        email,
      })
      .eq('user_id', user.id);
    
    if (error) {
      console.error('AUTH DEBUG: completeClientProfile update error:', error);
      throw error;
    }
  } else {
    // Insert new profile
    const { error } = await supabase
      .from('clients')
      .insert([{
        user_id: user.id,
        name,
        phone,
        email,
      }]);
    
    if (error) {
      console.error('AUTH DEBUG: completeClientProfile insert error:', error);
      throw error;
    }
  }
  
  return true;
};

export const isClientProfileComplete = async () => {
  const profile = await getMyClientProfile();
  if (!profile) return false;
  return !!(profile.name && profile.phone);
};

export const isTechnicianProfileComplete = async () => {
  const profile = await getMyTechnicianProfile();
  if (!profile) return false;
  // Check if all required fields are filled
  return !!(
    profile.first_name &&
    profile.last_name &&
    profile.business_name &&
    profile.phone &&
    profile.experience_years &&
    profile.area
  );
};

// ── PROFILE COMPLETION TRIGGER ──

// Trigger the profile completion modal from anywhere in the app
// This sets a flag in localStorage that App.tsx will pick up
export const triggerProfileCompletion = (userType: 'client' | 'technician') => {
  localStorage.setItem('pendingUserType', userType);
  // Dispatch a custom event so App.tsx can react immediately
  window.dispatchEvent(new CustomEvent('triggerProfileCompletion', { detail: { userType } }));
};
