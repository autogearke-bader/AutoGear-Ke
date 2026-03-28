import { supabase } from './supabase';
import { getCurrentUser, getUserIdFromSession, getMyClientProfile } from './auth';

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT PROFILE MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Update the current client's profile with name and phone.
 * Used for client onboarding and profile updates.
 */
export const updateMyClientProfile = async (updates: { name?: string; phone?: string }) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  // Check if client profile exists
  const { data: existingClient } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingClient) {
    // Update existing profile
    const { error } = await supabase
      .from('clients')
      .update(updates)
      .eq('user_id', user.id);

    if (error) throw error;
  } else {
    // Get session for email
    const { data: { session } } = await supabase.auth.getSession();
    const email = session?.user?.email;

    // Insert new profile
    const { error } = await supabase
      .from('clients')
      .insert([{
        user_id: user.id,
        name: updates.name || '',
        phone: updates.phone || '',
        ...(email ? { email } : {}),
      }]);

    if (error) throw error;
  }

  return true;
};

/**
 * Check if client onboarding is complete.
 * Returns true if client has both name and phone filled.
 */
export const isClientOnboardingComplete = async (): Promise<boolean> => {
  try {
    const profile = await getMyClientProfile();
    if (!profile) return false;
    // Check if both name and phone are present
    return !!(profile.name && profile.phone && profile.name.trim() !== '' && profile.phone.trim() !== '');
  } catch {
    return false;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC READS (no auth required)
// ─────────────────────────────────────────────────────────────────────────────

/** Fetch all live technicians (with services, photos, payments). */
export const getPublicTechnicians = async () => {
  const { data, error } = await supabase
    .from('technicians')
    .select('*, technician_services(*), technician_photos(*), technician_videos(*), technician_payments(*)')
    .eq('status', 'live')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
};

/** Fetch all technicians (including non-live) — used by admin / dashboard. */
export const getTechnicians = async () => {
  const { data, error } = await supabase
    .from('technicians')
    .select('*, technician_services(*), technician_photos(*), technician_videos(*), technician_payments(*)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
};

/**
 * Fetch a single live technician by slug (for public profile page).
 * Returns the technician with services, photos, payments, and reviews.
 */
export const getPublicTechnicianBySlug = async (slug: string) => {
  const { data, error } = await supabase
    .from('technicians')
    .select(`
      *,
      technician_services(*),
      technician_photos(*),
      technician_videos(*),
      technician_payments(*),
      reviews(*)
    `)
    .eq('slug', slug)
    .eq('status', 'live')
    .single();

  if (error) throw error;
  return data;
};

/**
 * Fetch business hours for a technician.
 * Returns array of business_hours records.
 */
export const getTechnicianBusinessHours = async (technicianId: string) => {
  const { data, error } = await supabase
    .from('business_hours')
    .select('*')
    .eq('technician_id', technicianId)
    .order('day_of_week', { ascending: true });

  if (error) throw error;
  return data ?? [];
};

/** Fetch published articles. */
export const getPublicArticles = async () => {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
};

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT LEADS / BOOKINGS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a WhatsApp lead record for a technician.
 * Called when a visitor clicks the WhatsApp button on a TechnicianCard.
 * Auth is optional — anonymous visitors can still generate leads.
 */
export const createWhatsAppLead = async (
  technicianId: string,
  serviceName: string
): Promise<void> => {
  // Attempt to resolve the current client (may be null for anonymous users)
  const userId = await getUserIdFromSession().catch(() => null);

  let clientId: string | null = null;
  if (userId) {
    const { data: clientRow } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    clientId = clientRow?.id ?? null;
  }

  const payload: Record<string, any> = {
    technician_id: technicianId,
    service_requested: serviceName,
    source: 'whatsapp',
    status: 'pending',
  };

  if (clientId) payload.client_id = clientId;

  const { error } = await supabase.from('leads').insert([payload]);
  if (error) throw error;
};

/**
 * Fetch all leads that belong to the currently-logged-in client.
 * An optional `userId` param is accepted for backwards-compatibility (ignored —
 * we always derive the user from the active session).
 */
export const getMyClientLeads = async (_userId?: string) => {
  const userId = await getUserIdFromSession();
  if (!userId) return [];

  // Get the client row first so we can filter leads by client_id
  const { data: clientRow } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!clientRow) return [];

  const { data, error } = await supabase
    .from('leads')
    .select('*, technicians(business_name, slug, profile_image)')
    .eq('client_id', clientRow.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
};

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Placeholder — clients don't currently have a dedicated notifications table.
 * Returns an empty array so callers don't break.
 */
export const getMyClientNotifications = async (): Promise<any[]> => {
  return [];
};

// ─────────────────────────────────────────────────────────────────────────────
// TECHNICIAN LEADS
// ─────────────────────────────────────────────────────────────────────────────

/** Fetch all leads directed at the current technician. */
export const getMyLeads = async () => {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data: tech } = await supabase
    .from('technicians')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!tech) return [];

  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('technician_id', tech.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
};

/** Update the status of a lead (technician action). */
export const updateLeadStatus = async (
  leadId: string,
  status: 'pending' | 'contacted' | 'job_done' | 'no_response'
) => {
  const { error } = await supabase
    .from('leads')
    .update({ status })
    .eq('id', leadId);

  if (error) throw error;
};

// ─────────────────────────────────────────────────────────────────────────────
// TECHNICIAN NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────

/** Fetch all notifications for the current technician. */
export const getMyNotifications = async () => {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data: tech } = await supabase
    .from('technicians')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!tech) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('technician_id', tech.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
};

/** Mark a single notification as read. */
export const markNotificationRead = async (notificationId: string) => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) throw error;
};

/** Mark all notifications for the current technician as read. */
export const markAllNotificationsRead = async () => {
  const user = await getCurrentUser();
  if (!user) return;

  const { data: tech } = await supabase
    .from('technicians')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!tech) return;

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('technician_id', tech.id)
    .eq('is_read', false);

  if (error) throw error;
};

/** Delete a single notification. */
export const deleteNotification = async (notificationId: string) => {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);

  if (error) throw error;
};

// ─────────────────────────────────────────────────────────────────────────────
// TECHNICIAN PROFILE UPDATES
// ─────────────────────────────────────────────────────────────────────────────

/** Update the current technician's core profile fields. */
export const updateMyProfile = async (updates: Record<string, any>) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('technicians')
    .update(updates)
    .eq('user_id', user.id);

  if (error) throw error;
};

/** Replace the current technician's services. */
export const updateMyServices = async (
  services: { id?: string; service_name: string; price?: number | null; negotiable: boolean }[]
) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const { data: tech } = await supabase
    .from('technicians')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!tech) throw new Error('Technician profile not found');

  // Delete existing services then re-insert
  const { error: deleteError } = await supabase
    .from('technician_services')
    .delete()
    .eq('technician_id', tech.id);

  if (deleteError) throw deleteError;

  if (services.length > 0) {
    const rows = services.map((s) => ({
      technician_id: tech.id,
      service_name: s.service_name,
      price: s.price ?? null,
      negotiable: s.negotiable,
    }));

    const { error: insertError } = await supabase
      .from('technician_services')
      .insert(rows);

    if (insertError) throw insertError;
  }
};

/** Replace the current technician's portfolio photos. */
export const updateMyPhotos = async (
  photos: { id?: string; photo_url: string; caption?: string; alt_text?: string }[]
) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const { data: tech } = await supabase
    .from('technicians')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!tech) throw new Error('Technician profile not found');

  // Upsert photos: insert new ones, update existing ones
  const rows = photos.map((p, i) => ({
    ...(p.id ? { id: p.id } : {}),
    technician_id: tech.id,
    photo_url: p.photo_url,
    caption: p.caption ?? '',
    alt_text: p.alt_text ?? '',
    sort_order: i,
  }));

  // Delete all then re-insert (simplest strategy)
  const { error: deleteError } = await supabase
    .from('technician_photos')
    .delete()
    .eq('technician_id', tech.id);

  if (deleteError) throw deleteError;

  if (rows.length > 0) {
    const cleanRows = rows.map(({ id: _id, ...r }) => r); // strip id for insert
    const { error: insertError } = await supabase
      .from('technician_photos')
      .insert(cleanRows);

    if (insertError) throw insertError;
  }
};

/** Replace the current technician's payment methods. */
export const updateMyPayments = async (methods: string[]) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const { data: tech } = await supabase
    .from('technicians')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!tech) throw new Error('Technician profile not found');

  const { error: deleteError } = await supabase
    .from('technician_payments')
    .delete()
    .eq('technician_id', tech.id);

  if (deleteError) throw deleteError;

  if (methods.length > 0) {
    const rows = methods.map((method) => ({ technician_id: tech.id, method }));
    const { error: insertError } = await supabase
      .from('technician_payments')
      .insert(rows);

    if (insertError) throw insertError;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// REVIEWS
// ─────────────────────────────────────────────────────────────────────────────

/** Submit a review for a technician. */
export const submitReview = async (
  technicianId: string,
  rating: number,
  comment: string,
  wouldReBook: 'yes' | 'no',
  leadId?: string
) => {
  const userId = await getUserIdFromSession();

  // Try to get the client's name for the review
  let clientName = 'Anonymous';
  if (userId) {
    const { data: clientRow } = await supabase
      .from('clients')
      .select('name')
      .eq('user_id', userId)
      .maybeSingle();
    if (clientRow?.name) clientName = clientRow.name;
  }

  const reviewPayload: Record<string, any> = {
    technician_id: technicianId,
    client_name: clientName,
    rating,
    comment,
    would_rebook: wouldReBook,
    is_visible: true,
  };

  if (leadId) reviewPayload.lead_id = leadId;

  const { error } = await supabase.from('reviews').insert([reviewPayload]);
  if (error) throw error;
};

/**
 * Check if a client can review a technician.
 * Returns true if:
 * 1. The client has a completed lead (job_done) with the technician
 * 2. The client hasn't already reviewed this technician
 */
export const canClientReviewTechnician = async (
  technicianId: string,
  userId: string
): Promise<boolean> => {
  // First get the client record for this user
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!client) return false;

  // Check if client has a completed lead with this technician
  const { data: completedLead } = await supabase
    .from('leads')
    .select('id')
    .eq('technician_id', technicianId)
    .eq('client_id', client.id)
    .eq('status', 'job_done')
    .maybeSingle();

  if (!completedLead) return false;

  // Check if client has already reviewed this technician
  const { data: existingReview } = await supabase
    .from('reviews')
    .select('id')
    .eq('technician_id', technicianId)
    .eq('lead_id', completedLead.id)
    .maybeSingle();

  // Can review if there's a completed lead and no existing review
  return !existingReview;
};

// ─────────────────────────────────────────────────────────────────────────────
// CLOUDINARY UPLOAD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upload a file to Cloudinary via its unsigned upload API.
 * Returns the secure URL of the uploaded image.
 */
export const uploadToCloudinary = async (
  file: File,
  folder: string = 'technicians/profiles'
): Promise<string> => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error(
      'Cloudinary is not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.'
    );
  }

  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', uploadPreset);
  fd.append('folder', folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: 'POST', body: fd }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloudinary upload failed: ${res.status} ${text}`);
  }

  const json = await res.json();
  return json.secure_url as string;
};

// ─────────────────────────────────────────────────────────────────────────────
// SLUG HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Generate a URL-safe slug from a string. */
const slugify = (text: string): string =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

/**
 * Generate a unique slug for a technician's business name.
 * Appends a numeric suffix if the base slug is already taken.
 */
export const generateUniqueSlug = async (businessName: string): Promise<string> => {
  const base = slugify(businessName) || 'technician';
  let candidate = base;
  let suffix = 1;

  while (true) {
    const { data } = await supabase
      .from('technicians')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle();

    if (!data) return candidate;

    candidate = `${base}-${suffix}`;
    suffix++;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — LEADS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Update a lead's status (admin action).
 * Also sets admin_confirmed_job_done when status is 'job_done'.
 */
export const adminUpdateLeadStatus = async (
  leadId: string,
  status: 'pending' | 'contacted' | 'job_done' | 'no_response'
) => {
  const payload: Record<string, any> = { status };
  if (status === 'job_done') payload.admin_confirmed_job_done = true;

  const { data, error } = await supabase
    .from('leads')
    .update(payload)
    .eq('id', leadId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * When admin marks a job as done, insert a notification for the client
 * so they are prompted to leave a review.
 */
export const sendReviewNotificationToClient = async (leadId: string): Promise<void> => {
  // Fetch the lead to get client_id and technician info
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('client_id, technician_id, technicians(business_name)')
    .eq('id', leadId)
    .maybeSingle();

  if (leadError || !lead?.client_id) return; // Silently skip if no client linked

  const businessName = (lead as any).technicians?.business_name ?? 'your technician';

  await supabase.from('notifications').insert([{
    client_id: lead.client_id,
    technician_id: lead.technician_id,
    type: 'review_request',
    message: `How was your experience with ${businessName}? Please leave a review to help other customers!`,
    lead_id: leadId,
  }]);
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — REVIEWS
// ─────────────────────────────────────────────────────────────────────────────

/** Fetch all reviews that are pending admin approval. */
export const adminGetPendingReviews = async () => {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, technicians(id, business_name, first_name, last_name, slug)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
};

/** Approve a review (mark as approved + visible). */
export const adminApproveReview = async (
  reviewId: string,
  adminNotes: string = ''
): Promise<void> => {
  const { error } = await supabase
    .from('reviews')
    .update({
      status: 'approved',
      is_visible: true,
      admin_notes: adminNotes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reviewId);

  if (error) throw error;
};

/** Decline a review (mark as declined + hidden). */
export const adminDeclineReview = async (
  reviewId: string,
  adminNotes: string = 'Declined by admin'
): Promise<void> => {
  const { error } = await supabase
    .from('reviews')
    .update({
      status: 'declined',
      is_visible: false,
      admin_notes: adminNotes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reviewId);

  if (error) throw error;
};

// ─────────────────────────────────────────────────────────────────────────────
// TIKTOK HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch a TikTok video thumbnail URL via oEmbed API.
 * Returns null if the fetch fails (network error, video private, etc.).
 */
export const getTikTokThumbnail = async (videoUrl: string): Promise<string | null> => {
  try {
    const endpoint = `https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`;
    const res = await fetch(endpoint);
    if (!res.ok) return null;
    const json = await res.json();
    return (json.thumbnail_url as string) ?? null;
  } catch {
    return null;
  }
};
