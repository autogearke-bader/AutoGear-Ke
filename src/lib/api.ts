import { supabase } from './supabase';
import { getCurrentUser, getUserIdFromSession, getMyClientProfile } from './auth';

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT PROFILE MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Update the current client's profile with name and phone.
 * Used for client onboarding and profile updates.
 * Uses a server-side function to avoid RLS policy issues.
 */
export const updateMyClientProfile = async (updates: { name?: string; phone?: string }) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  // Get email from session
  const { data: { session } } = await supabase.auth.getSession();
  const email = session?.user?.email;

  // Use the server-side upsert function to avoid RLS recursion issues
  const { error } = await supabase.rpc('upsert_client_profile', {
    p_user_id: user.id,
    p_name: updates.name || '',
    p_phone: updates.phone || '',
    p_email: email || null,
  });

  if (error) throw error;

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
export const getPublicTechnicians = async (filters?: { area?: string; service?: string }) => {
  // Service to category mapping
  const SERVICE_TO_CATEGORY: Record<string, string> = {
    'wrapping': 'body_exterior',
    'wrap': 'body_exterior',
    'ppf': 'body_exterior',
    'ceramic': 'body_exterior',
    'coating': 'body_exterior',
    'buffing': 'body_exterior',
    'buff': 'body_exterior',
    'detailing': 'body_exterior',
    'detail': 'body_exterior',
    'headlight': 'body_exterior',
    'restoration': 'body_exterior',
    'tuning': 'car_electricals_security',
    'tune': 'car_electricals_security',
    'ecu': 'car_electricals_security',
  };

  // First, try to get technicians from the specific area
  let query = supabase
    .from('technicians')
    .select(`
      id, first_name, last_name, business_name, slug, phone, email, bio, experience_years,
      county, area, mobile_service, instagram, tiktok_link, youtube_link, pricing_notes,
      status, user_id, profile_image, cover_photo, thumbnail_image, created_at,
      latitude, longitude, google_maps_link,
      technician_services(
        id, technician_id, service_name, category, price, negotiable, notes,
        service_variants(id, service_id, variant_name, price, is_negotiable)
      ),
      technician_photos(id, technician_id, photo_url, service, caption, alt_text, sort_order),
      technician_videos(id, technician_id, platform, video_url, video_id, service, alt_text, sort_order, created_at, thumbnail_url),
      technician_payments(id, method),
      avg_rating,
      review_count
    `)
    .eq('status', 'live')
    .order('created_at', { ascending: false });

  if (filters?.area) {
    query = query.eq('area', filters.area);
  }

  let { data, error } = await query;
  if (error) throw error;

  let technicians = data ?? [];

  // Client-side filtering for exact service matching
  let exactMatches: any[] = [];
  if (filters?.service) {
    const searchTerm = filters.service.toLowerCase();
    exactMatches = technicians.filter(technician => {
      return technician.technician_services?.some((service: any) => {
        // Check service name
        const serviceMatch = service.service_name?.toLowerCase().includes(searchTerm);

        // Check variant names
        const variantMatch = service.service_variants?.some((variant: any) =>
          variant.variant_name?.toLowerCase().includes(searchTerm)
        );

        return serviceMatch || variantMatch;
      });
    });
  } else {
    exactMatches = technicians;
  }

  // Only limit to 4 technicians when filters are applied
  if (exactMatches.length >= 4 && (filters?.area || filters?.service)) {
    return exactMatches.slice(0, 4);
  }

  // If we have fewer than 4 exact matches, try category-based fallback
  if (filters?.service && exactMatches.length < 4) {
    const remainingSlots = 4 - exactMatches.length;
    const searchTerm = filters.service.toLowerCase();
    
    // Determine the category for this service
    const serviceCategory = SERVICE_TO_CATEGORY[searchTerm] || 'body_exterior';

    // Filter technicians by category (excluding those already in exactMatches)
    const exactMatchIds = new Set(exactMatches.map(t => t.id));
    const categoryMatches = technicians.filter(technician => {
      // Skip if already in exact matches
      if (exactMatchIds.has(technician.id)) return false;

      // Check if technician offers services in the same category
      return technician.technician_services?.some((service: any) => 
        service.category === serviceCategory
      );
    });

    // Combine exact matches with category matches
    technicians = [...exactMatches, ...categoryMatches.slice(0, remainingSlots)];
  } else {
    technicians = exactMatches;
  }

  // If still less than 4 and area was specified, get more from other areas
  if (technicians.length < 4 && filters?.area && filters?.service) {
    const remainingSlots = 4 - technicians.length;
    const searchTerm = filters.service.toLowerCase();
    const serviceCategory = SERVICE_TO_CATEGORY[searchTerm] || 'body_exterior';

    // Query technicians from other areas
    let fallbackQuery = supabase
      .from('technicians')
      .select(`
        *,
        technician_services(
          *,
          service_variants(*)
        ),
        technician_photos(*),
        technician_videos(*),
        technician_payments(*),
        avg_rating,
        review_count
      `)
      .eq('status', 'live')
      .neq('area', filters.area) // Exclude the original area
      .order('created_at', { ascending: false });

    const { data: fallbackData, error: fallbackError } = await fallbackQuery;
    if (fallbackError) throw fallbackError;

    let fallbackTechnicians = fallbackData ?? [];

    // First try exact service matches from other areas
    const fallbackExactMatches = fallbackTechnicians.filter(technician => {
      return technician.technician_services?.some((service: any) => {
        const serviceMatch = service.service_name?.toLowerCase().includes(searchTerm);
        const variantMatch = service.service_variants?.some((variant: any) =>
          variant.variant_name?.toLowerCase().includes(searchTerm)
        );
        return serviceMatch || variantMatch;
      });
    });

    // If not enough exact matches, add category matches
    let fallbackResults = fallbackExactMatches;
    if (fallbackResults.length < remainingSlots) {
      const fallbackExactIds = new Set(fallbackExactMatches.map(t => t.id));
      const fallbackCategoryMatches = fallbackTechnicians.filter(technician => {
        if (fallbackExactIds.has(technician.id)) return false;
        return technician.technician_services?.some((service: any) => 
          service.category === serviceCategory
        );
      });
      fallbackResults = [...fallbackExactMatches, ...fallbackCategoryMatches];
    }

    // Add fallback technicians up to the remaining slots
    technicians = [...technicians, ...fallbackResults.slice(0, remainingSlots)];
  }

  // Only limit to 4 technicians when filters are applied
  if (filters?.area || filters?.service) {
    return technicians.slice(0, 4);
  }
  return technicians;
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
export const getPublicTechnicianBySlug = async (slug: string): Promise<any> => {
  const { data, error } = await supabase
    .from('technicians')
    .select(`
      id, first_name, last_name, business_name, slug, phone, email, bio, experience_years,
      county, area, mobile_service, instagram, tiktok_link, youtube_link, pricing_notes,
      status, user_id, profile_image, cover_photo, thumbnail_image, created_at,
      latitude, longitude, google_maps_link,
      technician_services(
        id, technician_id, service_name, category, price, negotiable, notes,
        service_variants(id, service_id, variant_name, price, is_negotiable)
      ),
      technician_photos(id, technician_id, photo_url, service, caption, alt_text, sort_order),
      technician_videos(id, technician_id, platform, video_url, video_id, service, alt_text, sort_order, created_at, thumbnail_url),
      technician_payments(id, method),
      avg_rating,
      review_count,
      reviews(id, technician_id, lead_id, client_id, client_name, rating, comment, would_rebook, is_visible, status, admin_notes, approved_by, updated_at, created_at)
    `)
    .eq('slug', slug)
    .eq('status', 'live')
    .maybeSingle();          // ← was .single()

  if (error) throw error;
  if (!data) throw new Error('Technician not found');
  return data;
};

/**
 * Fetch business hours for a technician.
 * Returns array of business_hours records.
 */
export const getTechnicianBusinessHours = async (technicianId: string) => {
  const { data, error } = await supabase
    .from('business_hours')
    .select('id, technician_id, day_of_week, is_open, open_time, close_time, available_on_request')
    .eq('technician_id', technicianId)
    .order('day_of_week', { ascending: true });

  if (error) throw error;

  // Ensure available_on_request field exists with default value
  // Temporary workaround: if Sunday is open but has no times, assume it's "available on request"
  return (data ?? []).map(hour => {
    const isSunday = hour.day_of_week === 0;
    const hasNoTimes = !hour.open_time && !hour.close_time;
    const shouldBeAvailableOnRequest = isSunday && hour.is_open && hasNoTimes;

    return {
      ...hour,
      available_on_request: hour.available_on_request ?? (shouldBeAvailableOnRequest ? true : false)
    };
  });
};

/** Fetch published articles. */
export const getPublicArticles = async () => {
  const { data, error } = await supabase
    .from('articles')
    .select('id, slug, title, images, content, excerpt, meta_description, keywords, is_published, created_at, updated_at')
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
    .eq('hidden_from_client', false)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
};

/**
 * Hide a booking/lead from the current client's view (soft delete).
 * Only allows hiding of bookings with status "job_done".
 */
export const deleteBooking = async (leadId: string): Promise<void> => {
  const userId = await getUserIdFromSession();
  if (!userId) throw new Error('Not authenticated');

  // Get the client row to verify ownership
  const { data: clientRow } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!clientRow) throw new Error('Client profile not found');

  // Verify the lead belongs to this client and has eligible status
  const { data: lead } = await supabase
    .from('leads')
    .select('status')
    .eq('id', leadId)
    .eq('client_id', clientRow.id)
    .maybeSingle();

  if (!lead) throw new Error('Booking not found');

  if (lead.status !== 'job_done') {
    throw new Error('Only completed bookings can be removed');
  }

  // Soft delete: hide the booking from client view
  const { error } = await supabase
    .from('leads')
    .update({ hidden_from_client: true })
    .eq('id', leadId);

  if (error) throw error;
};

/**
 * Clean up old bookings (older than 2 days with eligible statuses).
 * This function calls the database cleanup function to hide old bookings
 * from client view. Returns the number of bookings cleaned up.
 */
export const cleanupOldBookings = async (): Promise<number> => {
  const { data, error } = await supabase.rpc('cleanup_old_bookings');

  if (error) throw error;
  // The RPC returns an array of objects: [{cleaned_count: number}]
  return data?.[0]?.cleaned_count ?? 0;
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
    .select(`
      *,
      clients!leads_client_id_fkey (
        email
      )
    `)
    .eq('technician_id', tech.id)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Transform data to include client_email
  // Use joined email if available, otherwise fall back to stored email
  return (data ?? []).map(lead => ({
    ...lead,
    client_email: lead.clients?.email || lead.client_email || null
  }));
};

/** Update the status of a lead (technician action). */
export const updateLeadStatus = async (
  leadId: string,
  status: 'pending' | 'job_done' | 'not_converted'
) => {
  const updateData: { status: string; is_archived?: boolean } = { status };
  if (status === 'job_done') {
    updateData.is_archived = true;
  }

  const { error } = await supabase
    .from('leads')
    .update(updateData)
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

// ─────────────────────────────────────────────────────────────────────────────
// SERVICES
// ─────────────────────────────────────────────────────────────────────────────

/** Fetch all available services. */
export const getAllServices = async () => {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data ?? [];
};

/** Add a new service to the global services table. */
export const addService = async (name: string) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('services')
    .insert({
      name: name.trim(),
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

/** Check if a service name already exists. */
export const serviceExists = async (name: string) => {
  const { data, error } = await supabase
    .from('services')
    .select('id')
    .eq('name', name.trim())
    .maybeSingle();

  if (error) throw error;
  return !!data;
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
  leadId?: string,
  clientId?: string
) => {
  const userId = await getUserIdFromSession();
  if (!userId) throw new Error('You must be signed in to submit a review');

  // Use the provided clientId (which should be the auth user ID) or fall back to session user ID
  const finalClientId = clientId || userId;

  // Try to get the client's name for the review
  let clientName = 'Anonymous';
  const { data: clientRow } = await supabase
    .from('clients')
    .select('name')
    .eq('user_id', finalClientId)
    .maybeSingle();
  if (clientRow?.name) clientName = clientRow.name;

  const reviewPayload: Record<string, any> = {
    technician_id: technicianId,
    client_id: finalClientId,
    client_name: clientName,
    rating,
    comment,
    would_rebook: wouldReBook,
    lead_id: leadId || null,
    status: 'pending',        // awaits admin approval (migration 015 workflow)
    is_visible: false,        // shown only after approval
  };

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

/** Revoke an approved review (hide from public without changing status). */
export const adminRevokeReview = async (
  reviewId: string,
  adminNotes: string = 'Revoked by admin'
): Promise<void> => {
  const { error } = await supabase
    .from('reviews')
    .update({
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
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const response = await fetch(`${supabaseUrl}/functions/v1/get-tiktok-thumbnail`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({ video_url: videoUrl }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data?.thumbnail_url || null;
  } catch {
    return null;
  }
};