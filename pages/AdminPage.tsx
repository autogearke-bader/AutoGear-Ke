import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../src/lib/supabase';
import { adminUpdateLeadStatus, sendReviewNotificationToClient, adminGetPendingReviews, adminApproveReview, adminDeclineReview, adminRevokeReview, getTikTokThumbnail } from '../src/lib/api';
import QuillEditor from '../components/QuillEditor';

// ─── Constants ────────────────────────────────────────────────────────────────
const SESSION_TIMEOUT  = 60 * 60 * 1000; // 1 hour
const MAX_ATTEMPTS     = 5;
const LOCKOUT_DURATION = 60_000;          // 1 minute
// Security: Admin email should be configured via environment variable
// This prevents the admin email from being exposed in client-side code
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'admin@autogearke.com';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const slug = (s: string) =>
  s.toLowerCase().trim()
   .replace(/[''"`]/g, '')
   .replace(/[^a-z0-9\s-]/g, '')
   .replace(/\s+/g, '-')
   .replace(/-+/g, '-')
   .replace(/^-|-$/g, '');

/** Upload raw file to Cloudinary. No client-side compression — Cloudinary handles it. */
const uploadToCloudinary = async (file: File, folder: string): Promise<string> => {
  const fd = new FormData();
  fd.append('file',           file);
  fd.append('upload_preset',  import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
  fd.append('folder',         folder);
  const res  = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: fd });
  if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
  const data = await res.json();
  if (!data.secure_url) throw new Error(data.error?.message ?? 'Cloudinary upload failed');
  return data.secure_url as string;
};

/** Apply on-the-fly Cloudinary transformation to an already-stored URL */
const cx = (url: string, params: string) =>
  url?.includes('cloudinary.com') ? url.replace('/upload/', `/upload/${params}/`) : url ?? '';

// ─── Types ────────────────────────────────────────────────────────────────────
type StatusMsg = { message: string; type: 'success' | 'error' | 'warning' };

interface UserStats {
  totalUsers: number;
  totalClients: number;
  totalTechnicians: number;
  newUsersThisMonth: number;
  newUsersLastMonth: number;
  newClientsThisMonth: number;
  newTechniciansThisMonth: number;
}

interface Article {
  id: string; title: string; slug: string; excerpt: string; content: string;
  images: { url: string; alt: string }[];
  meta_description: string; keywords: string;
  is_published: boolean; created_at: string;
}

interface Technician {
  id: string; first_name: string; last_name: string;
  business_name: string; slug: string; phone: string;
  county: string; area: string;
  status: 'pending' | 'live' | 'suspended';
  profile_image: string | null;
  created_at: string;
  // derived
  leads_count: number; avg_rating: number; services_count: number;
}

interface Lead {
  id: string; client_name: string; client_phone: string;
  service_requested: string; client_location: string;
  status: 'pending' | 'contacted' | 'job_done' | 'no_response';
  is_whatsapp_lead: boolean;
  created_at: string;
  technicians?: { business_name: string; first_name: string; last_name: string };
}

interface Review {
  id: string; client_name: string; rating: number;
  would_rebook: 'yes' | 'no' | null; comment: string;
  is_visible: boolean; created_at: string;
  status: 'pending' | 'approved' | 'declined';  // Added for review approval workflow
  client_id: string | null;  // Added for review approval workflow
  admin_notes: string;  // Added for review approval workflow
  approved_by: string | null;  // Added for review approval workflow
  updated_at: string;  // Added for review approval workflow
  technicians?: { business_name: string; first_name: string; last_name: string; slug: string };
}

interface TechnicianPhoto {
  id: string; photo_url: string; caption: string; service: string;
}

interface TechnicianVideo {
  id: string; platform: string; video_url: string; video_id: string; service: string;
}

// Helper to get video embed URL for inline playback
const getVideoEmbedUrl = (video: TechnicianVideo): string => {
  if (video.platform === 'youtube') {
    return `https://www.youtube.com/embed/${video.video_id}`;
  } else if (video.platform === 'tiktok') {
    return `https://www.tiktok.com/embed/v2/${video.video_id}`;
  } else if (video.platform === 'instagram') {
    return `https://www.instagram.com/p/${video.video_id}/embed`;
  }
  return '';
};

interface UserStats {
  totalUsers: number;
  totalClients: number;
  totalTechnicians: number;
  newUsersThisMonth: number;
  newUsersLastMonth: number;
  newClientsThisMonth: number;
  newTechniciansThisMonth: number;
}

// ─── Component ────────────────────────────────────────────────────────────────
const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const articleImgRef = useRef<HTMLInputElement>(null);

  // ── Auth ───────────────────────────────────────────────────
  const [isAuthorized,   setIsAuthorized]   = useState(false);
  const [emailInput,     setEmailInput]     = useState('');
  const [passwordInput,  setPasswordInput]  = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLockedOut,    setIsLockedOut]    = useState(false);
  const [lockoutTimer,   setLockoutTimer]   = useState(0);

  // ── UI ─────────────────────────────────────────────────────
  const [activeTab,  setActiveTab]  = useState<'technicians'|'leads'|'reviews'|'article'|'stats'>('technicians');
  const [status,     setStatus]     = useState<StatusMsg | null>(null);
  const [isSaving,   setIsSaving]   = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Technicians ────────────────────────────────────────────
  const [technicians,  setTechnicians]  = useState<Technician[]>([]);
  const [techLoading,  setTechLoading]  = useState(false);
  const [techFilter,   setTechFilter]   = useState<'all'|'pending'|'live'|'suspended'>('all');
  const [techSearch,   setTechSearch]   = useState('');
  const [pendingTechPhotos, setPendingTechPhotos] = useState<Record<string, TechnicianPhoto[]>>({});
  const [pendingTechVideos, setPendingTechVideos] = useState<Record<string, TechnicianVideo[]>>({});
  const [pendingTechThumbnails, setPendingTechThumbnails] = useState<Record<string, Record<string, string>>>({});
  const [pendingTechServices, setPendingTechServices] = useState<Record<string, any[]>>({});
  const [selectedPendingTech, setSelectedPendingTech] = useState<Technician | null>(null);
  const [selectedLiveTech, setSelectedLiveTech] = useState<Technician | null>(null);
  const [liveTechPhotos, setLiveTechPhotos] = useState<TechnicianPhoto[]>([]);
  const [liveTechVideos, setLiveTechVideos] = useState<TechnicianVideo[]>([]);
  const [liveTechServices, setLiveTechServices] = useState<any[]>([]);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [techToReject, setTechToReject] = useState<string | null>(null);

  // ── Leads ──────────────────────────────────────────────────
  const [leads,          setLeads]          = useState<Lead[]>([]);
  const [leadsLoading,   setLeadsLoading]   = useState(false);
  const [leadsFilterTech,setLeadsFilterTech]= useState('');
  const [leadsDateFrom,  setLeadsDateFrom]  = useState('');
  const [leadsDateTo,    setLeadsDateTo]    = useState('');
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);

  // ── Reviews ────────────────────────────────────────────────
  const [reviews,       setReviews]       = useState<Review[]>([]);
  const [reviewsLoading,setReviewsLoading]= useState(false);
  const [reviewsFilter, setReviewsFilter] = useState<'all'|'pending'|'approved'|'declined'>('pending');
  const [reviewActionInProgress, setReviewActionInProgress] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  // ── Statistics ──────────────────────────────────────────────
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [activeUsers, setActiveUsers] = useState<number>(0);
  const [activeUsersLoading, setActiveUsersLoading] = useState(false);

  // ── Articles ───────────────────────────────────────────────
  const [localArticles,      setLocalArticles]      = useState<Article[]>([]);
  const [editingArticleId,   setEditingArticleId]   = useState<string|null>(null);
  const [selectedArticleIds, setSelectedArticleIds] = useState<string[]>([]);
  const [articleSearch,      setArticleSearch]      = useState('');

  // Article form
  const [articleTitle,         setArticleTitle]         = useState('');
  const [articleContent,       setArticleContent]       = useState('');
  const [articleExcerpt,       setArticleExcerpt]       = useState('');
  const [articleImages,        setArticleImages]        = useState<{url:string;alt:string}[]>([]);
  const [articleMetaDesc,      setArticleMetaDesc]      = useState('');
  const [altTextError,         setAltTextError]         = useState<string | null>(null);
  const [articleIsPublished,   setArticleIsPublished]   = useState(true);
  const [articleImgUploading,  setArticleImgUploading]  = useState(false);

  // ════════════════════════════════════════════════
  // EFFECTS
  // ════════════════════════════════════════════════

  // Noindex admin
  useEffect(() => {
    const prev = document.title;
    document.title = 'Admin | Mekh';
    let m = document.querySelector('meta[name="robots"]') as HTMLMetaElement;
    if (!m) { m = document.createElement('meta'); m.setAttribute('name','robots'); document.head.appendChild(m); }
    m.setAttribute('content','noindex, nofollow');
    return () => { document.title = prev; };
  }, []);

  // Lockout countdown
  useEffect(() => {
    if (!isLockedOut) return;
    const t = window.setInterval(() => setLockoutTimer(p => {
      if (p <= 1000) { setIsLockedOut(false); setFailedAttempts(0); clearInterval(t); return 0; }
      return p - 1000;
    }), 1000);
    return () => clearInterval(t);
  }, [isLockedOut]);

  // Session restore
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        console.log('Session user email:', session.user.email);
        console.log('Expected admin email:', ADMIN_EMAIL);
        console.log('Email match:', session.user.email === ADMIN_EMAIL);
        console.log('User role:', session.user.user_metadata?.role);
      }
      // Check email directly for RLS compatibility
      if (session?.user?.email === ADMIN_EMAIL) {
        console.log('Admin access granted');
        setIsAuthorized(true);
      } else {
        console.warn('Not admin email - access denied');
      }
    }).catch(err => console.error('Session check error:', err));
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setIsAuthorized(s?.user?.email === ADMIN_EMAIL);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Refetch data when authorization changes
  useEffect(() => {
    if (!isAuthorized) return;
    console.log('Admin authorized, fetching data...');
    refreshData();
  }, [isAuthorized]);

  // Session timeout
  useEffect(() => {
    if (!isAuthorized) return;
    const t = setTimeout(handleLogout, SESSION_TIMEOUT);
    return () => clearTimeout(t);
  }, [isAuthorized]);

  // Auto-clear status
  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(null), 5000);
    return () => clearTimeout(t);
  }, [status]);

  // Auto-refresh active users every 30 seconds when on stats tab
  useEffect(() => {
    if (activeTab !== 'stats') return;
    const interval = setInterval(() => {
      fetchActiveUsers();
    }, 30000);
    return () => clearInterval(interval);
  }, [activeTab]);

  // ════════════════════════════════════════════════
  // AUTH
  // ════════════════════════════════════════════════

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLockedOut) return;
    
    // Trim and normalize email
    const normalizedEmail = emailInput.trim().toLowerCase();
    const adminEmailNormalized = ADMIN_EMAIL.toLowerCase();
    
    // First check if the email matches the allowed admin email
    if (normalizedEmail !== adminEmailNormalized) {
      console.warn('Email mismatch:', { input: normalizedEmail, expected: adminEmailNormalized });
      const n = failedAttempts + 1;
      setFailedAttempts(n);
      setPasswordInput('');
      if (n >= MAX_ATTEMPTS) { setIsLockedOut(true); setLockoutTimer(LOCKOUT_DURATION); }
      setStatus({ message: 'Invalid credentials.', type: 'error' });
      return;
    }
    
    console.log('Attempting login with email:', normalizedEmail);
    
    const { data, error } = await supabase.auth.signInWithPassword({ email: emailInput.trim(), password: passwordInput });
    
    if (error) {
      console.error('Supabase auth error:', error.message, error);
      const n = failedAttempts + 1;
      setFailedAttempts(n);
      setPasswordInput('');
      if (n >= MAX_ATTEMPTS) { setIsLockedOut(true); setLockoutTimer(LOCKOUT_DURATION); }
      setStatus({ message: `Error: ${error.message}`, type: 'error' });
      return;
    }
    
    console.log('Auth successful, user metadata:', data.user?.user_metadata);
    
    // Check for admin role in user_metadata
    const userRole = data.user?.user_metadata?.role;
    if (userRole !== 'admin') {
      console.warn('User role is not admin:', userRole, 'Full metadata:', data.user?.user_metadata);
      await supabase.auth.signOut();
      const n = failedAttempts + 1;
      setFailedAttempts(n);
      setPasswordInput('');
      if (n >= MAX_ATTEMPTS) { setIsLockedOut(true); setLockoutTimer(LOCKOUT_DURATION); }
      setStatus({ message: `Access denied: Admin role required. Current role: ${userRole || 'none'}`, type: 'error' });
      return;
    }
    
    setIsAuthorized(true);
    setEmailInput(''); setPasswordInput(''); setFailedAttempts(0);
    refreshData();
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error during sign out:', err);
    }
    // Navigate BEFORE updating state to ensure navigation completes
    navigate('/');
    // Then update auth state
    setIsAuthorized(false);
  };

  // ════════════════════════════════════════════════
  // DATA FETCHING
  // ════════════════════════════════════════════════

  const fetchTechnicians = async () => {
    setTechLoading(true);
    try {
      console.log('Fetching technicians (including pending)...');
      const { data, error } = await supabase
        .from('technicians')
        .select('*, technician_services(id, service_name, price), leads(id), reviews(rating), technician_photos(id, photo_url, caption, service), technician_videos(id, platform, video_url, video_id, service)')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching technicians:', error.code, error.message);
        setStatus({ message: `Failed to load technicians: ${error.message}`, type: 'error' });
        setTechLoading(false);
        return;
      }
      
      if (!data) {
        console.warn('No data returned from technicians query');
        setTechLoading(false);
        return;
      }
      
      console.log(`Fetched ${data.length} technicians, ${data.filter((t: any) => t.status === 'pending').length} pending`);
      // Store photos, videos, and services for pending technicians
      const photos: Record<string, TechnicianPhoto[]> = {};
      const videos: Record<string, TechnicianVideo[]> = {};
      const services: Record<string, any[]> = {};
      const thumbnails: Record<string, Record<string, string>> = {};
      
      data.forEach((t: any) => {
        if (t.status === 'pending') {
          photos[t.id] = t.technician_photos || [];
          videos[t.id] = t.technician_videos || [];
          services[t.id] = t.technician_services || [];
        }
      });
      
      setPendingTechPhotos(photos);
      setPendingTechVideos(videos);
      setPendingTechServices(services);
      
      // Fetch TikTok thumbnails
      const fetchThumbnails = async () => {
        const allThumbnails: Record<string, Record<string, string>> = {};
        for (const t of data) {
          if (t.status === 'pending' && t.technician_videos) {
            allThumbnails[t.id] = {};
            for (const video of t.technician_videos) {
              if (video.platform === 'tiktok') {
                if (video.thumbnail_url) {
                  // Use the cached value — no network call needed
                  allThumbnails[t.id][video.id] = video.thumbnail_url;
                } else {
                  // Fallback: fetch live (for videos added before this update)
                  const thumb = await getTikTokThumbnail(video.video_url);
                  if (thumb) allThumbnails[t.id][video.id] = thumb;
                }
              }
            }
          }
        }
        setPendingTechThumbnails(allThumbnails);
      };
      fetchThumbnails();
      
      setTechnicians(data.map((t: any) => ({
        ...t,
        leads_count:    t.leads?.length ?? 0,
        services_count: t.technician_services?.length ?? 0,
        avg_rating: t.reviews?.length
          ? +(t.reviews.reduce((s: number, r: any) => s + r.rating, 0) / t.reviews.length).toFixed(1)
          : 0,
      })));
      console.log('Technicians loaded successfully');
    } catch (err) {
      console.error('Unexpected error fetching technicians:', err);
      setStatus({ message: 'An unexpected error occurred while loading technicians', type: 'error' });
    } finally {
      setTechLoading(false);
    }
  };

  const fetchUserStats = async () => {
    setStatsLoading(true);
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();
    
    // Fetch all counts
    const [clientsResult, techniciansResult] = await Promise.all([
      supabase.from('clients').select('id, created_at', { count: 'exact', head: false }),
      supabase.from('technicians').select('id, created_at', { count: 'exact', head: false })
    ]);
    
    const clients = clientsResult.data || [];
    const technicians = techniciansResult.data || [];
    
    // Calculate new users this month
    const newClientsThisMonth = clients.filter((c: any) => new Date(c.created_at) >= new Date(firstDayOfMonth)).length;
    const newTechniciansThisMonth = technicians.filter((t: any) => new Date(t.created_at) >= new Date(firstDayOfMonth)).length;
    
    // Calculate new users last month
    const newClientsLastMonth = clients.filter((c: any) => {
      const date = new Date(c.created_at);
      return date >= new Date(firstDayOfLastMonth) && date <= new Date(lastDayOfLastMonth);
    }).length;
    const newTechniciansLastMonth = technicians.filter((t: any) => {
      const date = new Date(t.created_at);
      return date >= new Date(firstDayOfLastMonth) && date <= new Date(lastDayOfLastMonth);
    }).length;
    
    // Total is clients + technicians (technicians are also users)
    const totalUsers = clients.length + technicians.length;
    const totalClients = clients.length;
    const totalTechnicians = technicians.length;
    
    setUserStats({
      totalUsers,
      totalClients,
      totalTechnicians,
      newUsersThisMonth: newClientsThisMonth + newTechniciansThisMonth,
      newUsersLastMonth: newClientsLastMonth + newTechniciansLastMonth,
      newClientsThisMonth,
      newTechniciansThisMonth
    });
    setStatsLoading(false);
  };

  const fetchActiveUsers = async () => {
    setActiveUsersLoading(true);
    try {
      // Call the database function to get active users count
      const { data, error } = await supabase.rpc('get_active_users_count');
      if (!error && data) {
        setActiveUsers(data);
      } else {
        // If function doesn't exist yet, show 0
        console.log('Active users function not available - run migration 018');
        setActiveUsers(0);
      }
    } catch (err) {
      console.log('Error fetching active users:', err);
      setActiveUsers(0);
    }
    setActiveUsersLoading(false);
  };

  const fetchLeads = async () => {
    setLeadsLoading(true);
    const { data } = await supabase
      .from('leads').select('*, technicians(business_name, first_name, last_name)')
      .order('created_at', { ascending: false });
    if (data) setLeads(data);
    setLeadsLoading(false);
  };

  const deleteLeads = async (ids: string[]) => {
    if (!window.confirm(`Delete ${ids.length} lead${ids.length !== 1 ? 's' : ''}? This cannot be undone.`)) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('leads').delete().in('id', ids);
      if (!error) {
        setLeads(p => p.filter(l => !ids.includes(l.id)));
        setSelectedLeadIds([]);
        setStatus({ message: `${ids.length} lead${ids.length !== 1 ? 's' : ''} deleted.`, type: 'success' });
      } else {
        setStatus({ message: `Failed to delete leads: ${error.message}`, type: 'error' });
      }
    } catch (err) {
      setStatus({ message: 'Failed to delete leads.', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchReviews = async () => {
    setReviewsLoading(true);
    try {
      // Fetch all reviews (admin has full access)
      const { data } = await supabase
        .from('reviews')
        .select('*, technicians(id, business_name, first_name, last_name, slug)')
        .order('created_at', { ascending: false });
      if (data) setReviews(data);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setReviewsLoading(false);
    }
  };

  // Filter reviews based on reviewsFilter
  const filteredReviews = reviewsFilter === 'all' 
    ? reviews 
    : reviews.filter(r => r.status === reviewsFilter);

  // Approve a review
  const handleApproveReview = async (reviewId: string) => {
    setReviewActionInProgress(reviewId);
    try {
      const notes = adminNotes[reviewId] || '';
      await adminApproveReview(reviewId, notes);
      setStatus({ message: 'Review approved successfully!', type: 'success' });
      setAdminNotes(prev => ({ ...prev, [reviewId]: '' }));
      fetchReviews();
    } catch (error) {
      console.error('Error approving review:', error);
      setStatus({ message: 'Failed to approve review. Please try again.', type: 'error' });
    } finally {
      setReviewActionInProgress(null);
    }
  };

  // Decline a review
  const handleDeclineReview = async (reviewId: string) => {
    if (!window.confirm('Decline this review? It will be hidden from public view.')) return;

    setReviewActionInProgress(reviewId);
    try {
      const notes = adminNotes[reviewId] || 'Declined by admin';
      await adminDeclineReview(reviewId, notes);
      setStatus({ message: 'Review declined.', type: 'success' });
      setAdminNotes(prev => ({ ...prev, [reviewId]: '' }));
      fetchReviews();
    } catch (error) {
      console.error('Error declining review:', error);
      setStatus({ message: 'Failed to decline review. Please try again.', type: 'error' });
    } finally {
      setReviewActionInProgress(null);
    }
  };

  // Revoke an approved review
  const handleRevokeReview = async (reviewId: string) => {
    if (!window.confirm('Revoke this approved review? It will be hidden from public view but remain approved.')) return;

    setReviewActionInProgress(reviewId);
    try {
      const notes = adminNotes[reviewId] || 'Revoked by admin';
      await adminRevokeReview(reviewId, notes);
      setStatus({ message: 'Review revoked and hidden from public view.', type: 'success' });
      setAdminNotes(prev => ({ ...prev, [reviewId]: '' }));
      fetchReviews();
    } catch (error) {
      console.error('Error revoking review:', error);
      setStatus({ message: 'Failed to revoke review. Please try again.', type: 'error' });
    } finally {
      setReviewActionInProgress(null);
    }
  };

  const fetchArticles = async () => {
    const { data } = await supabase
      .from('articles').select('*')
      .order('created_at', { ascending: false });
    if (data) setLocalArticles(data);
  };

  const fetchMeta = async () => {
    // Meta data fetching removed - categories and brands not needed
  };

  const refreshData = () => Promise.all([fetchTechnicians(), fetchLeads(), fetchReviews(), fetchArticles(), fetchMeta(), fetchUserStats()]);

  // ════════════════════════════════════════════════
  // TECHNICIAN ACTIONS
  // ════════════════════════════════════════════════

  const approveTechnician = async (id: string) => {
    try {
      const { error } = await supabase.from('technicians').update({ status: 'live' }).eq('id', id);
      if (error) {
        console.error('Approve technician error:', error);
        setStatus({ message: `Failed to approve: ${error.message}`, type: 'error' });
        return;
      }
      // Create notification for technician
      const { error: notifError } = await supabase.from('notifications').insert([{
        technician_id: id, type: 'profile_approved',
        message: 'Your profile has been approved and is now live on Mekh. Share your link and start getting clients!',
      }]);
      if (notifError) {
        console.error('Notification error:', notifError);
        // Continue anyway - the approval still worked
      }
      fetchTechnicians();
      setStatus({ message: 'Technician approved and notified.', type: 'success' });
    } catch (err) {
      console.error('Unexpected error approving technician:', err);
      setStatus({ message: 'An unexpected error occurred.', type: 'error' });
    }
  };

  const suspendTechnician = async (id: string) => {
    if (!window.confirm('Suspend this technician? Their profile will be hidden from clients.')) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('technicians').update({ status: 'suspended' }).eq('id', id);
      if (error) {
        console.error('Suspend technician error:', error);
        setStatus({
          message: `Failed to suspend technician: ${error.message}. If this persists, check browser console (F12) for details.`,
          type: 'error'
        });
        return;
      }
      fetchTechnicians();
      setStatus({ message: 'Technician suspended successfully.', type: 'success' });
    } catch (err) {
      console.error('Unexpected error suspending technician:', err);
      setStatus({
        message: `Unexpected error: ${err instanceof Error ? err.message : 'Unknown error'}. Check console (F12) for details.`,
        type: 'error'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const rejectTechnician = async () => {
    if (!techToReject || !rejectionReason.trim()) {
      setStatus({ message: 'Please provide a rejection reason.', type: 'error' });
      return;
    }
    
    const { error } = await supabase.from('technicians').update({ status: 'suspended' }).eq('id', techToReject);
    if (!error) {
      await supabase.from('notifications').insert([{
        technician_id: techToReject,
        type: 'profile_rejected',
        message: `Your profile has been rejected. Reason: ${rejectionReason.trim()}. Please update your profile and resubmit for review.`,
      }]);
      fetchTechnicians();
      setStatus({ message: 'Technician rejected and notified.', type: 'success' });
    }
    setShowRejectModal(false);
    setTechToReject(null);
    setRejectionReason('');
  };

  const openRejectModal = (techId: string) => {
    setTechToReject(techId);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const viewPendingTechContent = async (tech: Technician) => {
    // Photos and videos are already loaded in state
    setSelectedPendingTech(tech);
  };

  const viewLiveTechDetails = async (tech: Technician) => {
    // For approved technicians, navigate to their public profile page
    window.open(`/technician/${tech.slug}`, '_blank');
  };

  const reactivateTechnician = async (id: string) => {
    const { error } = await supabase.from('technicians').update({ status: 'live' }).eq('id', id);
    if (!error) { fetchTechnicians(); setStatus({ message: 'Technician reactivated.', type: 'success' }); }
  };

  const deleteTechnician = async (id: string, name: string) => {
    if (!window.confirm(`Permanently delete "${name}" and all their data? This cannot be undone.`)) return;
    setIsDeleting(true);
    const { error } = await supabase.from('technicians').delete().eq('id', id);
    if (!error) { fetchTechnicians(); setStatus({ message: 'Technician deleted.', type: 'success' }); }
    setIsDeleting(false);
  };

  // ════════════════════════════════════════════════
  // LEAD ACTIONS
  // ════════════════════════════════════════════════

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    try {
      // Use adminUpdateLeadStatus which sets admin_confirmed_job_done when status is job_done
      const updatedLead = await adminUpdateLeadStatus(leadId, newStatus as any);
      setLeads(p => p.map(l => l.id === leadId ? { ...l, status: newStatus as any, admin_confirmed_job_done: true } : l));
      
      // If admin confirms job as done, send review notification to client
      if (newStatus === 'job_done') {
        try {
          await sendReviewNotificationToClient(leadId);
        } catch (e) {
          console.error('Failed to send review notification:', e);
        }
      }
    } catch (err) {
      console.error('Failed to update lead status:', err);
    }
  };

  const exportLeadsCSV = () => {
    const rows = filteredLeads.map(l => [
      new Date(l.created_at).toLocaleDateString('en-KE'),
      l.client_name, l.client_phone, l.service_requested,
      l.client_location ?? '', l.technicians?.business_name ?? '', l.status,
    ]);
    const csv = [['Date','Client','Phone','Service','Location','Technician','Status'], ...rows]
      .map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
      download: `mekh-leads-${new Date().toISOString().split('T')[0]}.csv`,
    });
    a.click();
  };

  // ════════════════════════════════════════════════
  // REVIEW ACTIONS
  // ════════════════════════════════════════════════

  const toggleReviewVisibility = async (id: string, current: boolean) => {
    const { error } = await supabase.from('reviews').update({ is_visible: !current }).eq('id', id);
    if (!error) {
      setReviews(p => p.map(r => r.id === id ? { ...r, is_visible: !current } : r));
      setStatus({ message: `Review ${!current ? 'made visible' : 'hidden'}.`, type: 'success' });
    }
  };

  const deleteReview = async (id: string) => {
    if (!window.confirm('Permanently delete this review?')) return;
    setIsDeleting(true);
    const { error } = await supabase.from('reviews').delete().eq('id', id);
    if (!error) { setReviews(p => p.filter(r => r.id !== id)); setStatus({ message: 'Review deleted.', type: 'success' }); }
    setIsDeleting(false);
  };

  // ════════════════════════════════════════════════
  // ARTICLE ACTIONS
  // ════════════════════════════════════════════════

  const resetArticleForm = () => {
    setEditingArticleId(null); setArticleTitle(''); setArticleContent('');
    setArticleExcerpt('');     setArticleImages([]); 
    setArticleMetaDesc(''); setAltTextError(null);
    setArticleIsPublished(true);
  };

  const handleEditArticle = (a: Article) => {
    setEditingArticleId(a.id); setArticleTitle(a.title); setArticleContent(a.content ?? '');
    setArticleExcerpt(a.excerpt ?? ''); setArticleImages(a.images ?? []);
    setArticleMetaDesc(a.meta_description ?? ''); setAltTextError(null);
    setArticleIsPublished(a.is_published);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleArticleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setArticleImgUploading(true);
    try {
      const url = await uploadToCloudinary(file, 'articles');
      setArticleImages(p => [...p, { url, alt: articleTitle || file.name }]);
    } catch { setStatus({ message: 'Image upload failed.', type: 'error' }); }
    finally {
      setArticleImgUploading(false);
      if (articleImgRef.current) articleImgRef.current.value = '';
    }
  };

  const handleSaveArticle = async (e: React.FormEvent) => {
    console.log('handleSaveArticle called, isSaving:', isSaving, 'articleIsPublished:', articleIsPublished);
    e.preventDefault();
    if (!articleTitle.trim()) {
      setStatus({ message: 'Title is required.', type: 'error' });
      return;
    }

    // Validate alt text
    const missingAltText = articleImages.some(img => !img.alt.trim());
    if (missingAltText) {
      setAltTextError('Please add alt text for all images before publishing');
      return;
    }
    setAltTextError(null);

    // Validate image URLs
    const invalidImages = articleImages.filter(img => !img.url.includes('cloudinary.com'));
    if (invalidImages.length > 0) {
      setStatus({ message: 'One or more images have invalid URLs. Please re-upload them.', type: 'error' });
      return;
    }

    // Wake up Supabase instance before the actual write
    setStatus({ message: 'Connecting...', type: 'warning' });
    await supabase.from('articles').select('id').limit(1);
    setStatus(null);

    setIsSaving(true);

    try {
      const payload = {
        title:            articleTitle.trim(),
        slug:             slug(articleTitle.trim()),
        excerpt:          articleExcerpt.trim(),
        content:          articleContent,
        images:           articleImages,
        meta_description: articleMetaDesc.trim(),
        keywords:         '',
        is_published:     articleIsPublished,
        updated_at:       new Date().toISOString(),
      };

      console.log('AdminPage: ARTICLE_SAVE_START', payload);

      // Direct await with timeout to prevent infinite hanging
      const savePromise = editingArticleId
        ? supabase.from('articles').update(payload).eq('id', editingArticleId)
        : supabase.from('articles').insert([payload]);

      console.log('About to execute savePromise');

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out after 30 seconds')), 30000)
      );

      const { error } = await Promise.race([savePromise, timeoutPromise]) as any;

      console.log('Save promise resolved, error:', error);

      if (error) {
        console.error('AdminPage: ARTICLE_SAVE_ERROR', error);
        if (error.code === '42501' || error.message?.includes('row-level security')) {
          setStatus({ message: 'Permission denied. Please log out and log back in.', type: 'error' });
        } else if (error.code === '23505') {
          setStatus({ message: 'This title already exists. Try a slightly different title.', type: 'error' });
        } else {
          setStatus({ message: `Failed to save: ${error.message || 'Unknown error'}`, type: 'error' });
        }
      } else {
        console.log('AdminPage: ARTICLE_SAVE_SUCCESS');
        setStatus({ message: `Article "${articleTitle}" ${editingArticleId ? 'updated' : 'created'}.`, type: 'success' });
        resetArticleForm();
        fetchArticles();
      }
    } catch (err) {
      console.error('AdminPage: Article save unexpected error:', err);
      setStatus({ message: `Unexpected error: ${err instanceof Error ? err.message : 'Unknown'}`, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteArticle = async (id: string, title: string) => {
    if (!window.confirm(`Delete "${title}"? Cannot be undone.`)) return;
    setIsDeleting(false); // Reset any stuck state first
    setIsSaving(false);   // Reset any stuck save state
    setIsDeleting(true);
    try {
      console.log('AdminPage: ARTICLE_DELETE_START - ID:', id);
      const { error } = await supabase.from('articles').delete().eq('id', id);
      if (error) {
        console.error('AdminPage: ARTICLE_DELETE_ERROR:', error);
        if (error.code === '42501') {
          setStatus({ message: 'Permission denied (RLS). Please log out and log back in.', type: 'error' });
        } else if (error.message?.includes('row-level security')) {
          setStatus({ message: 'Permission denied: You may not have admin access.', type: 'error' });
        } else {
          setStatus({ message: `Failed to delete article: ${error.message}. Check console (F12) for details.`, type: 'error' });
        }
        return; // Exit early on error to prevent further processing
      } else {
        console.log('AdminPage: ARTICLE_DELETE_SUCCESS');
        if (editingArticleId === id) resetArticleForm();
        await fetchArticles(); // Wait for articles to refresh
        setStatus({ message: 'Article deleted successfully.', type: 'success' });
      }
    } catch (err) {
      console.error('AdminPage: Article delete unexpected error:', err);
      const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
      setStatus({ message: `Failed to delete article: ${errorMsg}. Check console (F12) for details.`, type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkArticleDelete = async () => {
    if (!selectedArticleIds.length) return;
    if (!window.confirm(`Delete ${selectedArticleIds.length} articles? Cannot be undone.`)) return;
    if (window.prompt('Type "DELETE ALL" to confirm:') !== 'DELETE ALL') { setStatus({ message: 'Cancelled.', type: 'error' }); return; }
    setIsDeleting(true);
    try {
      console.log('AdminPage: BULK_ARTICLE_DELETE_START - IDs:', selectedArticleIds);
      const { error } = await supabase.from('articles').delete().in('id', selectedArticleIds);
      if (error) {
        console.error('AdminPage: BULK_ARTICLE_DELETE_ERROR:', error);
        if (error.code === '42501') {
          setStatus({ message: 'Permission denied (RLS). Please log out and log back in.', type: 'error' });
        } else if (error.message?.includes('row-level security')) {
          setStatus({ message: 'Permission denied: You may not have admin access.', type: 'error' });
        } else {
          setStatus({ message: `Failed to delete articles: ${error.message}`, type: 'error' });
        }
      } else {
        console.log('AdminPage: BULK_ARTICLE_DELETE_SUCCESS');
        setSelectedArticleIds([]);
        fetchArticles();
        setStatus({ message: `${selectedArticleIds.length} articles deleted.`, type: 'success' });
      }
    } catch (err) {
      console.error('AdminPage: Bulk article delete unexpected error:', err);
      const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
      setStatus({ message: `Failed to delete articles: ${errorMsg}`, type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const exportBackup = () => {
    const payload = { exported_at: new Date().toISOString(), platform: 'Mekh Marketplace', technicians, leads, reviews, articles: localArticles };
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })),
      download: `mekh-backup-${new Date().toISOString().split('T')[0]}.json`,
    });
    a.click();
  };

  // ════════════════════════════════════════════════
  // DERIVED VALUES
  // ════════════════════════════════════════════════

  const pendingCount = technicians.filter(t => t.status === 'pending').length;

  const filteredTechnicians = technicians.filter(t => {
    if (techFilter !== 'all' && t.status !== techFilter) return false;
    if (techSearch) {
      const q = techSearch.toLowerCase();
      return t.business_name.toLowerCase().includes(q) || t.phone.includes(q);
    }
    return true;
  });

  const filteredLeads = leads.filter(l => {
    if (leadsFilterTech && l.technicians?.business_name !== leadsFilterTech) return false;
    if (leadsDateFrom && new Date(l.created_at) < new Date(leadsDateFrom)) return false;
    if (leadsDateTo   && new Date(l.created_at) > new Date(leadsDateTo))   return false;
    return true;
  });

  const filteredArticles = localArticles.filter(a =>
    !articleSearch || a.title.toLowerCase().includes(articleSearch.toLowerCase())
  );

  const thisMonth = new Date(); thisMonth.setDate(1); thisMonth.setHours(0,0,0,0);
  const leadsThisMonth = leads.filter(l => new Date(l.created_at) >= thisMonth).length;
  const uniqueTechNames = [...new Set(leads.map(l => l.technicians?.business_name).filter(Boolean))];
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });

  // ════════════════════════════════════════════════
  // LOGIN SCREEN
  // ════════════════════════════════════════════════

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-blue-600/10 border border-blue-600/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-black text-white uppercase tracking-widest">Command Center</h1>
            <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest mt-1">Mekh Admin</p>
          </div>

          {/* Attempt progress bar */}
          {failedAttempts > 0 && (
            <div className="h-0.5 bg-slate-800 rounded-full mb-6 overflow-hidden">
              <div className="h-full bg-red-500 transition-all" style={{ width: `${(failedAttempts / MAX_ATTEMPTS) * 100}%` }} />
            </div>
          )}

          {status && (
            <div className={`mb-4 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center ${status.type === 'error' ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'}`}>
              {status.message}
            </div>
          )}
          {isLockedOut && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-[10px] font-black uppercase tracking-widest text-center">
              Locked — {Math.ceil(lockoutTimer / 1000)}s remaining
            </div>
          )}
          {failedAttempts > 0 && !isLockedOut && (
            <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-400 text-[10px] font-black uppercase tracking-widest text-center">
              {MAX_ATTEMPTS - failedAttempts} attempt{MAX_ATTEMPTS - failedAttempts !== 1 ? 's' : ''} remaining
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <input type="email" value={emailInput} onChange={e => setEmailInput(e.target.value)} placeholder="Admin email" required disabled={isLockedOut}
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 text-white outline-none focus:border-blue-500 transition-all disabled:opacity-40" />
            <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} placeholder="Password" required disabled={isLockedOut}
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 text-white outline-none focus:border-blue-500 transition-all disabled:opacity-40" />
            <button type="submit" disabled={isLockedOut}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-[11px] transition-all active:scale-95">
              {isLockedOut ? `Locked (${Math.ceil(lockoutTimer / 1000)}s)` : 'Unlock Terminal'}
            </button>
          </form>
          <div className="mt-8 text-center">
            <Link to="/" className="text-slate-600 hover:text-slate-400 text-[10px] font-black uppercase tracking-widest transition-colors">← Return to Site</Link>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════
  // MAIN ADMIN UI
  // ════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-slate-950">
      <input ref={articleImgRef} type="file" accept="image/*" onChange={handleArticleImageUpload} className="hidden" title="Upload article image" aria-label="Upload article image" />

      {/* ── Header ────────────────────────────────────── */}
      <div className="border-b border-slate-800 px-6 py-5 sticky top-0 bg-slate-950 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-white uppercase tracking-tighter">Command Center</h1>
            <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
              Mekh Marketplace
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={exportBackup}
              className="bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-500/20 transition-all">
              Backup
            </button>
            <button onClick={handleLogout} className="text-red-500 font-black text-[10px] uppercase tracking-widest hover:underline">
              Log Out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Status banner */}
        {status && (
          <div className={`mb-6 p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 ${
            status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : status.type === 'warning' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
            {isDeleting && <svg className="w-4 h-4 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
            {status.message}
          </div>
        )}

        {/* ── Tab Navigation ────────────────────────────── */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden mb-8">
          <div className="flex border-b border-slate-800 flex-wrap">
            {(['technicians','leads','reviews','article','stats'] as const).map(tab => (
              <button key={tab} onClick={() => { setActiveTab(tab); if (tab === 'stats') { fetchUserStats(); fetchActiveUsers(); }}}
                className={`flex-1 py-5 font-black text-[11px] uppercase tracking-widest transition-all relative whitespace-nowrap px-2 ${activeTab === tab ? 'text-blue-400 bg-slate-950/40 border-b-2 border-blue-600' : 'text-slate-600 hover:text-slate-400'}`}>
                {tab === 'article' ? 'Blog' : tab === 'stats' ? 'Stats' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === 'technicians' && pendingCount > 0 && (
                  <span className="ml-1.5 bg-amber-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded-full align-middle">{pendingCount}</span>
                )}
              </button>
            ))}
          </div>

          {/* ════════════════════════════════════════════
              TECHNICIANS TAB
          ════════════════════════════════════════════ */}
          {activeTab === 'technicians' && (
            <div className="p-6">
              {/* Stats row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {([
                  ['all',       'Total',     technicians.length,                                  'text-white'],
                  ['pending',   'Pending',   pendingCount,                                        'text-amber-400'],
                  ['live',      'Live',      technicians.filter(t=>t.status==='live').length,      'text-emerald-400'],
                  ['suspended', 'Suspended', technicians.filter(t=>t.status==='suspended').length, 'text-red-400'],
                ] as const).map(([f, label, count, color]) => (
                  <button key={f} onClick={() => setTechFilter(f as typeof techFilter)}
                    className={`p-4 rounded-2xl border text-center transition-all ${techFilter === f ? 'bg-blue-600/10 border-blue-600/30' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}>
                    <p className={`text-2xl font-black ${color}`}>{count}</p>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">{label}</p>
                  </button>
                ))}
              </div>

              {/* Debug & Refresh */}
              <div className="flex items-center gap-3 mb-6">
                <button 
                  onClick={() => { console.log('Manually refreshing data...'); refreshData(); }}
                  disabled={techLoading}
                  className="bg-blue-600/10 hover:bg-blue-600/20 disabled:opacity-50 text-blue-400 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-500/20 transition-all">
                  {techLoading ? '⟳ Refreshing...' : '⟳ Refresh'}
                </button>
                <p className="text-slate-500 text-[10px]">Having trouble seeing pending technicians? Click refresh or check browser console (F12) for errors.</p>
              </div>

              {/* Search */}
              <input value={techSearch} onChange={e => setTechSearch(e.target.value)} placeholder="Search by business name or phone…"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500 mb-6 transition-all" />

              {techLoading ? (
                <div className="text-center py-16 text-slate-600 font-black uppercase tracking-widest text-[11px]">Loading…</div>
              ) : filteredTechnicians.length === 0 ? (
                <div className="text-center py-16 text-slate-600 font-black uppercase tracking-widest text-[11px]">No technicians found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[900px]">
                    <thead>
                      <tr className="border-b border-slate-800">
                        {['Technician','Phone','Location','Services','Leads','Rating','Status','Joined','Actions'].map(h => (
                          <th key={h} className="pb-3 pr-4 text-[9px] font-black uppercase tracking-widest text-slate-600 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900">
                      {filteredTechnicians.map(t => (
                        <tr key={t.id} className="hover:bg-slate-900/40 transition-colors">
                          {/* Avatar + name */}
                          <td className="py-4 pr-4">
                            <div className="flex items-center gap-3">
                              {t.profile_image
                                ? <img src={cx(t.profile_image,'w_40,h_40,c_fill,g_face,q_auto,f_auto')} alt={t.business_name} className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-slate-800" />
                                : <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0 text-blue-400 font-black text-sm border border-blue-600/20">{t.business_name.charAt(0).toUpperCase()}</div>
                              }
                              <div className="min-w-0">
                                <p className="text-white font-bold text-sm truncate max-w-[160px]">{t.business_name}</p>
                                <p className="text-slate-500 text-[10px]">{t.first_name} {t.last_name}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 pr-4 text-slate-400 text-sm whitespace-nowrap">{t.phone}</td>
                          <td className="py-4 pr-4">
                            <p className="text-slate-300 text-sm">{t.county}</p>
                            <p className="text-slate-600 text-[10px]">{t.area}</p>
                          </td>
                          <td className="py-4 pr-4"><span className="bg-slate-800 text-slate-300 px-2 py-1 rounded-lg text-[10px] font-bold">{t.services_count}</span></td>
                          <td className="py-4 pr-4"><span className="bg-slate-800 text-slate-300 px-2 py-1 rounded-lg text-[10px] font-bold">{t.leads_count}</span></td>
                          <td className="py-4 pr-4 text-amber-400 text-sm whitespace-nowrap">{t.avg_rating > 0 ? `★ ${t.avg_rating}` : '—'}</td>
                          <td className="py-4 pr-4">
                            <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${
                              t.status === 'live'      ? 'bg-emerald-500/10 text-emerald-400' :
                              t.status === 'pending'   ? 'bg-amber-500/10   text-amber-400'   :
                                                         'bg-red-500/10     text-red-400'}`}>
                              {t.status}
                            </span>
                          </td>
                          <td className="py-4 pr-4 text-slate-600 text-[10px] whitespace-nowrap">{formatDate(t.created_at)}</td>
                          <td className="py-4">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {t.status === 'pending' && <>
                                <button onClick={() => approveTechnician(t.id)} className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap">✓ Approve</button>
                                <button onClick={() => viewPendingTechContent(t)} className="bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap">👁 View</button>
                                <button onClick={() => openRejectModal(t.id)} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap">✗ Reject</button>
                              </>}
                              {t.status === 'live' && <>
                                <button onClick={() => viewLiveTechDetails(t)} className="bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap">👁 View</button>
                                <button onClick={() => suspendTechnician(t.id)} className="bg-slate-800 hover:bg-red-500/10 text-slate-500 hover:text-red-400 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all">Suspend</button>
                              </>}
                              {t.status === 'suspended' && <>
                                <button onClick={() => reactivateTechnician(t.id)} className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all">Reactivate</button>
                                <button onClick={() => deleteTechnician(t.id, t.business_name)} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all">Delete</button>
                              </>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════
              LEADS TAB
          ════════════════════════════════════════════ */}
          {activeTab === 'leads' && (
            <div className="p-6">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                  ['Total Leads',   leads.length,                                     'text-white'],
                  ['This Month',    leadsThisMonth,                                   'text-blue-400'],
                  ['Job Done',      leads.filter(l=>l.status==='job_done').length,     'text-emerald-400'],
                  ['Pending',       leads.filter(l=>l.status==='pending').length,      'text-amber-400'],
                ].map(([label, count, color]) => (
                  <div key={label as string} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center">
                    <p className={`text-2xl font-black ${color}`}>{count}</p>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">{label}</p>
                  </div>
                ))}
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-3 mb-6">
                <select value={leadsFilterTech} onChange={e => setLeadsFilterTech(e.target.value)} aria-label="Filter by technician"
                  className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500">
                  <option value="">All Technicians</option>
                  {uniqueTechNames.map(n => <option key={n as string} value={n as string}>{n}</option>)}
                </select>
                <input type="date" value={leadsDateFrom} onChange={e => setLeadsDateFrom(e.target.value)} aria-label="Date from" className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500" />
                <input type="date" value={leadsDateTo}   onChange={e => setLeadsDateTo(e.target.value)} aria-label="Date to" className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500" />
                <button onClick={exportLeadsCSV} className="bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-500/20 transition-all">Export CSV</button>
                {selectedLeadIds.length > 0 ? (
                  <button onClick={() => deleteLeads(selectedLeadIds)} disabled={isDeleting}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-500/20 transition-all disabled:opacity-50">
                    🗑 Delete {selectedLeadIds.length}
                  </button>
                ) : (
                  <button onClick={() => {
                    try {
                      setLeadsFilterTech('');
                      setLeadsDateFrom('');
                      setLeadsDateTo('');
                      console.log('Leads filters cleared successfully');
                    } catch (err) {
                      console.error('Error clearing leads filters:', err);
                      setStatus({ message: 'Failed to clear filters.', type: 'error' });
                    }
                  }} className="bg-slate-800 hover:bg-slate-700 text-slate-400 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Clear</button>
                )}
              </div>

              {/* Select All Checkbox */}
              {filteredLeads.length > 0 && (
                <label className="flex items-center gap-2 mb-4 cursor-pointer">
                  <input type="checkbox"
                    checked={selectedLeadIds.length === filteredLeads.length && filteredLeads.length > 0}
                    onChange={() => setSelectedLeadIds(selectedLeadIds.length === filteredLeads.length ? [] : filteredLeads.map(l => l.id))}
                    className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-blue-600" />
                  <span className="text-slate-600 text-[10px] font-black uppercase tracking-widest">Select All</span>
                </label>
              )}

              {leadsLoading ? (
                <div className="text-center py-16 text-slate-600 font-black uppercase tracking-widest text-[11px]">Loading…</div>
              ) : filteredLeads.length === 0 ? (
                <div className="text-center py-16 text-slate-600 font-black uppercase tracking-widest text-[11px]">No leads yet</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[900px]">
                    <thead>
                      <tr className="border-b border-slate-800">
                        {['Select','Date','Client','Phone','Service','Location','Technician','Source','Status'].map(h => (
                          <th key={h} className="pb-3 pr-4 text-[9px] font-black uppercase tracking-widest text-slate-600 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900">
                      {filteredLeads.map(l => (
                        <tr key={l.id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="py-3 pr-4">
                            <input type="checkbox" checked={selectedLeadIds.includes(l.id)} aria-label={`Select lead ${l.id}`}
                              onChange={() => setSelectedLeadIds(p => p.includes(l.id) ? p.filter(id => id !== l.id) : [...p, l.id])}
                              className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-blue-600" />
                          </td>
                          <td className="py-3 pr-4 text-slate-500 text-[10px] whitespace-nowrap">{formatDate(l.created_at)}</td>
                          <td className="py-3 pr-4 text-slate-200 text-sm font-semibold">{l.client_name}</td>
                          <td className="py-3 pr-4">
                            <a href={`https://wa.me/254${l.client_phone.replace(/^0/,'')}`} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline text-sm whitespace-nowrap">{l.client_phone}</a>
                          </td>
                          <td className="py-3 pr-4 text-slate-400 text-sm">{l.service_requested}</td>
                          <td className="py-3 pr-4 text-slate-500 text-sm">{l.client_location || '—'}</td>
                          <td className="py-3 pr-4 text-slate-400 text-sm">
                            {l.technicians?.business_name || '—'}
                            {l.technicians?.first_name && l.technicians?.last_name && (
                              <span className="text-slate-500 text-xs block">
                                ({l.technicians.first_name} {l.technicians.last_name})
                              </span>
                            )}
                          </td>
                          <td className="py-3">
                            {l.is_whatsapp_lead ? (
                              <span className="inline-flex items-center gap-1 text-green-400 text-xs">
                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
                                </svg>
                                WhatsApp
                              </span>
                            ) : (
                              <span className="text-slate-500 text-xs">Booking</span>
                            )}
                          </td>
                          <td className="py-3">
                            <select value={l.status} onChange={e => updateLeadStatus(l.id, e.target.value)} aria-label={`Update status for lead ${l.id}`}
                              className={`bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-[10px] font-black uppercase outline-none transition-all ${
                                l.status === 'job_done'    ? 'text-emerald-400' :
                                l.status === 'contacted'   ? 'text-blue-400'    :
                                l.status === 'no_response' ? 'text-red-400'     : 'text-slate-400'}`}>
                              <option value="pending">Pending</option>
                              <option value="contacted">Contacted</option>
                              <option value="job_done">Job Done</option>
                              <option value="no_response">No Response</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════
              REVIEWS TAB
          ════════════════════════════════════════════ */}
          {activeTab === 'reviews' && (
            <div className="p-6">
              {/* Filter tabs */}
              <div className="flex gap-2 mb-6">
                {(['pending', 'approved', 'declined', 'all'] as const).map(filter => (
                  <button
                    key={filter}
                    onClick={() => setReviewsFilter(filter)}
                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      reviewsFilter === filter
                        ? filter === 'pending' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : filter === 'approved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : filter === 'declined' ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                    }`}
                  >
                    {filter === 'all' ? 'All Reviews' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                    {filter !== 'all' && (
                      <span className="ml-2">({reviews.filter(r => r.status === filter).length})</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                {[['Total', reviews.length, 'text-white'], 
                  ['Pending', reviews.filter(r => r.status === 'pending').length, 'text-amber-400'],
                  ['Approved', reviews.filter(r => r.status === 'approved' && r.is_visible).length, 'text-emerald-400'],
                  ['Hidden', reviews.filter(r => r.status === 'approved' && !r.is_visible).length, 'text-orange-400'],
                  ['Declined', reviews.filter(r => r.status === 'declined').length, 'text-red-400'
                ]].map(([label, count, color]) => (
                  <div key={label as string} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center">
                    <p className={`text-2xl font-black ${color}`}>{count as number}</p>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">{label as string}</p>
                  </div>
                ))}
              </div>

              {/* Rating breakdown */}
              {reviews.length > 0 && (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 mb-6">
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-4">Rating Breakdown</p>
                  {[5,4,3,2,1].map(star => {
                    const count = reviews.filter(r => r.rating === star).length;
                    const pct   = reviews.length ? (count / reviews.length) * 100 : 0;
                    return (
                      <div key={star} className="flex items-center gap-3 mb-2">
                        <span className="text-amber-400 text-[11px] font-bold w-6 text-right">{star}★</span>
                        <div className="flex-1 bg-slate-800 rounded-full h-2">
                          <div className="bg-amber-400 h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-slate-500 text-[10px] font-bold w-6">{count}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {reviewsLoading ? (
                <div className="text-center py-16 text-slate-600 font-black uppercase tracking-widest text-[11px]">Loading…</div>
              ) : (
                <>
                  {reviews.length > 0 && (
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 mb-6">
                      <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-4">Rating Breakdown</p>
                      {[5,4,3,2,1].map(star => {
                        const count = reviews.filter(r => r.rating === star).length;
                        const pct   = reviews.length ? (count / reviews.length) * 100 : 0;
                        return (
                          <div key={star} className="flex items-center gap-3 mb-2">
                            <span className="text-amber-400 text-[11px] font-bold w-6 text-right">{star}★</span>
                            <div className="flex-1 bg-slate-800 rounded-full h-2">
                              <div className="bg-amber-400 h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-slate-500 text-[10px] font-bold w-6">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {reviewsLoading ? (
                <div className="text-center py-16 text-slate-600 font-black uppercase tracking-widest text-[11px]">Loading…</div>
              ) : filteredReviews.length === 0 ? (
                <div className="text-center py-16 text-slate-600 font-black uppercase tracking-widest text-[11px]">
                  {reviewsFilter === 'pending' ? 'No pending reviews to approve' : `No ${reviewsFilter} reviews`}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[1100px]">
                    <thead>
                      <tr className="border-b border-slate-800">
                        {['Date','Technician','Client','Rating','Status','Comment','Actions'].map(h => (
                          <th key={h} className="pb-3 pr-4 text-[9px] font-black uppercase tracking-widest text-slate-600 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900">
                      {filteredReviews.map(r => (
                        <tr key={r.id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="py-3 pr-4 text-slate-500 text-[10px] whitespace-nowrap">{formatDate(r.created_at)}</td>
                          <td className="py-3 pr-4 text-slate-300 text-sm">
                            <Link to={`/technician/${r.technicians?.slug}`} className="hover:text-blue-400 transition-colors">
                              {r.technicians?.business_name || r.technicians?.first_name + ' ' + r.technicians?.last_name || '—'}
                            </Link>
                          </td>
                          <td className="py-3 pr-4 text-slate-400 text-sm">{r.client_name}</td>
                          <td className="py-3 pr-4 text-amber-400 text-sm font-bold whitespace-nowrap">{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</td>
                          <td className="py-3 pr-4">
                            <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase ${
                              r.status === 'pending' ? 'bg-amber-500/10 text-amber-400'
                              : r.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-red-500/10 text-red-400'
                            }`}>
                              {r.status || 'pending'}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-slate-400 text-sm max-w-xs truncate">{r.comment || '—'}</td>
                          <td className="py-3 pr-4">
                            <div className="flex flex-col gap-2">
                              {r.status === 'pending' && (
                                <>
                                  <input
                                    type="text"
                                    placeholder="Admin notes (optional)"
                                    value={adminNotes[r.id] || ''}
                                    onChange={(e) => setAdminNotes(prev => ({ ...prev, [r.id]: e.target.value }))}
                                    className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-[10px] text-white placeholder-slate-500 w-32"
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleApproveReview(r.id)}
                                      disabled={reviewActionInProgress === r.id}
                                      className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all disabled:opacity-50"
                                    >
                                      {reviewActionInProgress === r.id ? '...' : '✓ Approve'}
                                    </button>
                                    <button
                                      onClick={() => handleDeclineReview(r.id)}
                                      disabled={reviewActionInProgress === r.id}
                                      className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all disabled:opacity-50"
                                    >
                                      {reviewActionInProgress === r.id ? '...' : '✗ Decline'}
                                    </button>
                                  </div>
                                </>
                              )}
                              {r.status === 'approved' && r.is_visible && (
                                <button
                                  onClick={() => handleRevokeReview(r.id)}
                                  disabled={reviewActionInProgress === r.id}
                                  className="bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all disabled:opacity-50"
                                >
                                  Revoke
                                </button>
                              )}
                              {r.status === 'approved' && !r.is_visible && (
                                <button
                                  onClick={() => handleApproveReview(r.id)}
                                  disabled={reviewActionInProgress === r.id}
                                  className="bg-slate-800 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all disabled:opacity-50"
                                >
                                  Restore
                                </button>
                              )}
                              {r.status === 'declined' && (
                                <button
                                  onClick={() => handleApproveReview(r.id)}
                                  disabled={reviewActionInProgress === r.id}
                                  className="bg-slate-800 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all disabled:opacity-50"
                                >
                                  Restore
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════
              BLOG / ARTICLE TAB
          ════════════════════════════════════════════ */}
          {activeTab === 'article' && (
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* ── Article form ──────────────────────── */}
                <div className="lg:col-span-7">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-white font-black text-[11px] uppercase tracking-widest flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${editingArticleId ? 'bg-amber-500' : 'bg-blue-500'}`} />
                      {editingArticleId ? 'Editing Article' : 'New Article'}
                    </h2>
                    {editingArticleId && (
                      <button onClick={resetArticleForm} className="text-blue-400 text-[10px] font-black uppercase tracking-widest hover:underline">Cancel Edit</button>
                    )}
                  </div>

                  <form onSubmit={handleSaveArticle} className="space-y-6">
                    {/* Title */}
                    <div>
                      <label className="block text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">Title *</label>
                      <input value={articleTitle} onChange={e => setArticleTitle(e.target.value)} required placeholder="Article title…"
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white outline-none focus:border-blue-500 transition-all" />
                    </div>

                    {/* Images — Cloudinary with Required Alt Text */}
                    <div>
                      <label className="block text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">
                        Images <span className="text-slate-700 normal-case font-normal tracking-normal">· Stored in Cloudinary <code>articles/</code></span>
                      </label>
                      {altTextError && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-3">
                          <p className="text-red-400 text-[10px] font-bold">{altTextError}</p>
                        </div>
                      )}
                      {articleImages.length > 0 && (
                        <div className="grid grid-cols-3 gap-3 mb-3">
                          {articleImages.map((img, idx) => (
                            <div key={idx} className="relative group">
                              <img src={cx(img.url, 'w_200,h_150,c_fill,q_auto,f_auto')} alt={img.alt}
                                className="w-full h-24 object-cover rounded-xl border border-slate-800" loading="lazy" />
                              <button type="button" onClick={() => setArticleImages(p => p.filter((_,i) => i !== idx))}
                                className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity font-black">✕</button>
                              <input 
                                value={img.alt} 
                                onChange={e => setArticleImages(p => p.map((im,i) => i===idx ? {...im, alt: e.target.value} : im))}
                                placeholder="Ceramic coating being applied to a Toyota Prado in Nairobi" 
                                className={`w-full bg-slate-900 rounded-lg px-2 py-1 text-[10px] text-white outline-none mt-1 font-medium border ${
                                  !img.alt.trim() ? 'border-red-500/50 bg-red-500/5' : 'border-slate-800'
                                }`} />
                              {!img.alt.trim() && <p className="text-[9px] text-red-400 mt-1 font-bold">Required for SEO</p>}
                            </div>
                          ))}
                        </div>
                      )}
                      <button type="button" onClick={() => articleImgRef.current?.click()} disabled={articleImgUploading}
                        className="w-full border-2 border-dashed border-slate-800 hover:border-blue-600 rounded-2xl p-4 text-slate-600 hover:text-blue-400 transition-all text-[11px] font-black uppercase tracking-widest">
                        {articleImgUploading ? '⏳ Uploading…' : '+ Upload Image'}
                      </button>
                    </div>

                    {/* Excerpt */}
                    <div>
                      <label className="block text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">Excerpt</label>
                      <textarea value={articleExcerpt} onChange={e => setArticleExcerpt(e.target.value)} rows={3} placeholder="Short description for article cards…"
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white outline-none focus:border-blue-500 resize-none" />
                    </div>

                    {/* Rich text */}
                    <div>
                      <label className="block text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">Article Content</label>
                      <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
                        <QuillEditor value={articleContent} onChange={setArticleContent} className="bg-slate-950" />
                      </div>
                    </div>

                    {/* SEO */}
                    <div className="pt-6 border-t border-slate-800 space-y-4">
                      <h3 className="text-white font-black text-[10px] uppercase tracking-widest">SEO & Metadata</h3>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">Meta Description</label>
                        <textarea value={articleMetaDesc} onChange={e => setArticleMetaDesc(e.target.value)} rows={2} placeholder="150–160 characters for search engines…"
                          className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-white outline-none focus:border-blue-500 resize-none" />
                        <p className={`text-[10px] mt-1 ${articleMetaDesc.length > 160 ? 'text-red-400' : 'text-slate-600'}`}>{articleMetaDesc.length}/160</p>
                      </div>

                    </div>

                    {/* Published toggle */}
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => { console.log('Publish toggle clicked, current:', articleIsPublished); setArticleIsPublished(p => !p); }} aria-label={articleIsPublished ? 'Unpublish article' : 'Publish article'}
                        className={`relative w-12 h-6 rounded-full transition-colors ${articleIsPublished ? 'bg-blue-600' : 'bg-slate-700'}`}>
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${articleIsPublished ? 'left-7' : 'left-1'}`} />
                      </button>
                      <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                        {articleIsPublished ? 'Published — visible on blog' : 'Draft — hidden from public'}
                      </span>
                    </div>

                    <button type="submit" disabled={isSaving}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-[11px] transition-all">
                      {isSaving ? 'Saving…' : editingArticleId ? 'Update Article' : 'Publish Article'}
                    </button>
                  </form>
                </div>

                {/* ── Article list ──────────────────────── */}
                <div className="lg:col-span-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-black text-[10px] uppercase tracking-widest">{localArticles.length} Articles</h3>
                    {selectedArticleIds.length > 0 && (
                      <button onClick={handleBulkArticleDelete} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all">
                        🗑 Delete {selectedArticleIds.length}
                      </button>
                    )}
                  </div>

                  <input value={articleSearch} onChange={e => setArticleSearch(e.target.value)} placeholder="Search articles…"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500 mb-3 transition-all" />

                  <label className="flex items-center gap-2 mb-4 cursor-pointer">
                    <input type="checkbox"
                      checked={selectedArticleIds.length === localArticles.length && localArticles.length > 0}
                      onChange={() => setSelectedArticleIds(selectedArticleIds.length === localArticles.length ? [] : localArticles.map(a => a.id))}
                      className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-blue-600" />
                    <span className="text-slate-600 text-[10px] font-black uppercase tracking-widest">Select All</span>
                  </label>

                  <div className="space-y-3 max-h-[680px] overflow-y-auto pr-1">
                    {filteredArticles.length === 0 ? (
                      <div className="text-center py-10 text-slate-600 text-[11px] font-black uppercase tracking-widest">No articles yet</div>
                    ) : filteredArticles.map(article => (
                      <div key={article.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition-colors">
                        <div className="flex items-start gap-3">
                          <input type="checkbox" checked={selectedArticleIds.includes(article.id)} aria-label={`Select article ${article.id}`}
                            onChange={() => setSelectedArticleIds(p => p.includes(article.id) ? p.filter(id => id !== article.id) : [...p, article.id])}
                            className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-blue-600 mt-0.5 flex-shrink-0" />
                          {article.images?.[0]?.url && (
                            <img src={cx(article.images[0].url, 'w_60,h_60,c_fill,q_auto,f_auto')} alt={article.images[0].alt}
                              className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-slate-800" loading="lazy" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-bold text-sm truncate">{article.title}</p>
                            {article.excerpt && <p className="text-slate-500 text-[10px] mt-0.5 line-clamp-1">{article.excerpt}</p>}
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${article.is_published ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                                {article.is_published ? 'Live' : 'Draft'}
                              </span>
                              <span className="text-slate-700 text-[9px] ml-auto">{formatDate(article.created_at)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3 pt-3 border-t border-slate-900">
                          <button onClick={() => handleEditArticle(article)}
                            className="flex-1 bg-slate-800 hover:bg-blue-600/10 hover:text-blue-400 text-slate-400 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                            Edit
                          </button>
                          <button onClick={() => deleteArticle(article.id, article.title)}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all">
                            🗑
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════
              STATISTICS TAB
          ════════════════════════════════════════════ */}
          {activeTab === 'stats' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white font-black text-[11px] uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  User Registration Statistics
                </h2>
                <button onClick={fetchUserStats} disabled={statsLoading}
                  className="bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-500/20 transition-all disabled:opacity-50">
                  {statsLoading ? '↻ Loading...' : '↻ Refresh'}
                </button>
              </div>

              {statsLoading ? (
                <div className="text-center py-16 text-slate-600 font-black uppercase tracking-widest text-[11px]">Loading statistics...</div>
              ) : userStats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                  {/* Active Users - Real-time */}
                  <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-2xl p-6 text-center relative overflow-hidden">
                    <div className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <p className="text-4xl font-black text-purple-400">{activeUsersLoading ? '...' : activeUsers}</p>
                    <p className="text-purple-300 text-[10px] font-black uppercase tracking-widest mt-2">Active Now</p>
                    <p className="text-slate-500 text-[8px] mt-1">Last 5 minutes</p>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 text-center">
                    <p className="text-4xl font-black text-white">{userStats.totalUsers}</p>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-2">Total Registered</p>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 text-center">
                    <p className="text-4xl font-black text-blue-400">{userStats.totalClients}</p>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-2">Total Clients</p>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 text-center">
                    <p className="text-4xl font-black text-emerald-400">{userStats.totalTechnicians}</p>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-2">Technicians</p>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 text-center">
                    <p className="text-4xl font-black text-amber-400">{userStats.newUsersThisMonth}</p>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-2">New This Month</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 text-slate-600 font-black uppercase tracking-widest text-[11px]">No data available</div>
              )}

              {/* Breakdown section */}
              {userStats && (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6">
                  <h3 className="text-white font-black text-[10px] uppercase tracking-widest mb-4">Registration Breakdown</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-900/50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-400 text-[10px] font-black uppercase">New Clients This Month</span>
                        <span className="text-blue-400 font-black text-lg">{userStats.newClientsThisMonth}</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2">
                        <div className="bg-blue-400 h-2 rounded-full" style={{ width: userStats.totalClients > 0 ? `${(userStats.newClientsThisMonth / userStats.totalClients) * 100}%` : '0%' }} />
                      </div>
                    </div>
                    <div className="bg-slate-900/50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-400 text-[10px] font-black uppercase">New Technicians This Month</span>
                        <span className="text-emerald-400 font-black text-lg">{userStats.newTechniciansThisMonth}</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2">
                        <div className="bg-emerald-400 h-2 rounded-full" style={{ width: userStats.totalTechnicians > 0 ? `${(userStats.newTechniciansThisMonth / userStats.totalTechnicians) * 100}%` : '0%' }} />
                      </div>
                    </div>
                    <div className="bg-slate-900/50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-400 text-[10px] font-black uppercase">New Users Last Month</span>
                        <span className="text-amber-400 font-black text-lg">{userStats.newUsersLastMonth}</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2">
                        <div className="bg-amber-400 h-2 rounded-full" style={{ width: userStats.totalUsers > 0 ? `${(userStats.newUsersLastMonth / userStats.totalUsers) * 100}%` : '0%' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          MODALS
      ═══════════════════════════════════════════════ */}

      {/* Pending Technician Content View Modal */}
      {selectedPendingTech && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSelectedPendingTech(null)}>
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-6 flex items-center justify-between">
              <div>
                <h2 className="text-white font-black text-lg uppercase tracking-widest">{selectedPendingTech.business_name}</h2>
                <p className="text-yellow-500 text-[10px] font-black uppercase mt-1">Pending Technician - Awaiting Approval</p>
              </div>
              <button onClick={() => setSelectedPendingTech(null)} className="text-slate-500 hover:text-white text-2xl font-black">✕</button>
            </div>
            <div className="p-6">
              {/* Personal Information */}
              <div className="mb-8">
                <h3 className="text-white font-black text-[11px] uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800">
                    <p className="text-slate-500 text-[9px] font-black uppercase mb-1">First Name</p>
                    <p className="text-white font-bold text-sm">{(selectedPendingTech as any).first_name || 'N/A'}</p>
                  </div>
                  <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800">
                    <p className="text-slate-500 text-[9px] font-black uppercase mb-1">Last Name</p>
                    <p className="text-white font-bold text-sm">{(selectedPendingTech as any).last_name || 'N/A'}</p>
                  </div>
                  <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800">
                    <p className="text-slate-500 text-[9px] font-black uppercase mb-1">WhatsApp Number</p>
                    <p className="text-white font-bold text-sm">{selectedPendingTech.phone || 'N/A'}</p>
                  </div>
                  <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800">
                    <p className="text-slate-500 text-[9px] font-black uppercase mb-1">Email</p>
                    <p className="text-white font-bold text-xs break-all">{(selectedPendingTech as any).email || 'N/A'}</p>
                  </div>
                  <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800">
                    <p className="text-slate-500 text-[9px] font-black uppercase mb-1">Years of Experience</p>
                    <p className="text-white font-bold text-sm">{(selectedPendingTech as any).experience_years || 'N/A'}</p>
                  </div>
                  <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800">
                    <p className="text-slate-500 text-[9px] font-black uppercase mb-1">Service Type</p>
                    <p className="text-white font-bold text-sm capitalize">
                      {(selectedPendingTech as any).mobile_service === 'both' ? 'Mobile & Studio' : 
                       (selectedPendingTech as any).mobile_service === 'yes' ? 'Mobile Only' : 
                       (selectedPendingTech as any).mobile_service === 'no' ? 'Studio Only' : 'N/A'}
                    </p>
                  </div>
                  <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800">
                    <p className="text-slate-500 text-[9px] font-black uppercase mb-1">Location</p>
                    <p className="text-white font-bold text-sm">{(selectedPendingTech as any).area || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Professional Bio */}
              {(selectedPendingTech as any).bio && (
                <div className="mb-8">
                  <h3 className="text-white font-black text-[11px] uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    Professional Bio
                  </h3>
                  <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800">
                    <p className="text-slate-300 text-sm leading-relaxed">{(selectedPendingTech as any).bio}</p>
                  </div>
                </div>
              )}

              {/* Services & Pricing */}
              <div className="mb-8">
                <h3 className="text-white font-black text-[11px] uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Services & Pricing ({pendingTechServices[selectedPendingTech.id]?.length || 0})
                </h3>
                {pendingTechServices[selectedPendingTech.id]?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {pendingTechServices[selectedPendingTech.id].map((service: any) => (
                      <div key={service.id} className="bg-slate-950 rounded-2xl p-4 border border-slate-800 flex justify-between items-center">
                        <div>
                          <p className="text-white font-bold text-sm">{service.service_name || service.service}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-emerald-400 font-black text-lg">
                            {service.price ? `KES ${parseInt(service.price).toLocaleString()}` : 'Contact'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-600 text-[10px] font-black uppercase">No services added yet</p>
                )}
              </div>

              {/* Pricing Notes */}
              {(selectedPendingTech as any).pricing_notes && (
                <div className="mb-8">
                  <h3 className="text-white font-black text-[11px] uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                    Pricing Notes
                  </h3>
                  <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800">
                    <p className="text-slate-300 text-sm">{(selectedPendingTech as any).pricing_notes}</p>
                  </div>
                </div>
              )}

              {/* Photos */}
              <div className="mb-8">
                <h3 className="text-white font-black text-[11px] uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-sky-500" />
                  Portfolio Photos ({pendingTechPhotos[selectedPendingTech.id]?.length || 0})
                </h3>
                {pendingTechPhotos[selectedPendingTech.id]?.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {pendingTechPhotos[selectedPendingTech.id].map((photo: TechnicianPhoto) => (
                      <div key={photo.id} className="bg-slate-950 rounded-2xl overflow-hidden border border-slate-800">
                        <img src={cx(photo.photo_url, 'w_300,h_200,c_fill,q_auto,f_auto')} alt={photo.caption}
                          className="w-full h-40 object-cover" loading="lazy" />
                        <div className="p-3">
                          <p className="text-slate-400 text-[10px] font-bold">{photo.service || 'General'}</p>
                          {photo.caption && <p className="text-slate-600 text-[9px] mt-1 line-clamp-2">{photo.caption}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-600 text-[10px] font-black uppercase">No photos uploaded</p>
                )}
              </div>

              {/* Videos */}
              <div className="mb-6">
                <h3 className="text-white font-black text-[11px] uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Videos ({pendingTechVideos[selectedPendingTech.id]?.length || 0})
                </h3>
                {pendingTechVideos[selectedPendingTech.id]?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pendingTechVideos[selectedPendingTech.id].map((video: TechnicianVideo) => (
                      <div key={video.id} className="bg-slate-950 rounded-2xl overflow-hidden border border-slate-800">
                        {/* Video container */}
                        <div className="relative w-full aspect-[9/16] max-h-[320px] mx-auto">
                          {video.platform === 'tiktok' ? (
                            // TikTok: Show thumbnail with play button, click opens in new tab
                            <a 
                              href={video.video_url} 
                              target="_blank" 
                              rel="noreferrer"
                              className="absolute inset-0 group"
                            >
                              {pendingTechThumbnails[selectedPendingTech.id]?.[video.id] ? (
                                <img 
                                  src={pendingTechThumbnails[selectedPendingTech.id][video.id]} 
                                  alt={video.service || 'TikTok video'}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                                  <span className="text-slate-500 text-[10px]">Loading thumbnail...</span>
                                </div>
                              )}
                              {/* Play button overlay */}
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                                <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                  <svg className="w-6 h-6 text-black ml-1" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z"/>
                                  </svg>
                                </div>
                              </div>
                            </a>
                          ) : (
                            // YouTube/Instagram: Inline embed
                            <iframe
                              src={getVideoEmbedUrl(video)}
                              title={video.service || 'Video'}
                              className="absolute top-0 left-0 w-full h-full"
                              frameBorder="0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                              allowFullScreen
                            />
                          )}
                        </div>
                        <div className="p-3">
                          <p className="text-slate-400 text-[10px] font-bold">{video.service || 'General'}</p>
                          <p className="text-slate-600 text-[9px] mt-1 capitalize">{video.platform}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-600 text-[10px] font-black uppercase">No videos uploaded</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <button onClick={() => { approveTechnician(selectedPendingTech.id); setSelectedPendingTech(null); }}
                  className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                  ✓ Approve This Technician
                </button>
                <button onClick={() => { openRejectModal(selectedPendingTech.id); setSelectedPendingTech(null); }}
                  className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                  ✗ Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Technician Detailed View Modal */}
      {selectedLiveTech && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSelectedLiveTech(null)}>
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-6 flex items-center justify-between">
              <div>
                <h2 className="text-white font-black text-xl uppercase tracking-widest">{selectedLiveTech.business_name}</h2>
                <p className="text-blue-400 text-[10px] font-black uppercase mt-1">Live Technician Details</p>
              </div>
              <div className="flex items-center gap-3">
                <a href={`/technician/${selectedLiveTech.slug}`} target="_blank" rel="noreferrer" 
                  className="bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all">
                  View Public Profile →
                </a>
                <button onClick={() => setSelectedLiveTech(null)} className="text-slate-500 hover:text-white text-2xl font-black">✕</button>
              </div>
            </div>
            <div className="p-6">
              {/* Personal Details */}
              <div className="mb-8">
                <h3 className="text-white font-black text-[11px] uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800">
                    <p className="text-slate-500 text-[9px] font-black uppercase mb-1">First Name</p>
                    <p className="text-white font-bold text-sm">{(selectedLiveTech as any).first_name || 'N/A'}</p>
                  </div>
                  <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800">
                    <p className="text-slate-500 text-[9px] font-black uppercase mb-1">Last Name</p>
                    <p className="text-white font-bold text-sm">{(selectedLiveTech as any).last_name || 'N/A'}</p>
                  </div>
                  <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800">
                    <p className="text-slate-500 text-[9px] font-black uppercase mb-1">WhatsApp Number</p>
                    <p className="text-white font-bold text-sm">{selectedLiveTech.phone || 'N/A'}</p>
                  </div>
                  <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800">
                    <p className="text-slate-500 text-[9px] font-black uppercase mb-1">Years of Experience</p>
                    <p className="text-white font-bold text-sm">{(selectedLiveTech as any).experience_years || 'N/A'}</p>
                  </div>
                  <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800">
                    <p className="text-slate-500 text-[9px] font-black uppercase mb-1">Service Type</p>
                    <p className="text-white font-bold text-sm capitalize">
                      {(selectedLiveTech as any).mobile_service === 'both' ? 'Mobile & Studio' : 
                       (selectedLiveTech as any).mobile_service === 'yes' ? 'Mobile Only' : 
                       (selectedLiveTech as any).mobile_service === 'no' ? 'Studio Only' : 'N/A'}
                    </p>
                  </div>
                  <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800">
                    <p className="text-slate-500 text-[9px] font-black uppercase mb-1">Location</p>
                    <p className="text-white font-bold text-sm">{(selectedLiveTech as any).area}{(selectedLiveTech as any).county ? `, ${(selectedLiveTech as any).county}` : ''}</p>
                  </div>
                </div>
              </div>

              {/* Professional Bio */}
              {(selectedLiveTech as any).bio && (
                <div className="mb-8">
                  <h3 className="text-white font-black text-[11px] uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    Professional Bio
                  </h3>
                  <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800">
                    <p className="text-slate-300 text-sm leading-relaxed">{(selectedLiveTech as any).bio}</p>
                  </div>
                </div>
              )}

              {/* Services & Pricing */}
              <div className="mb-8">
                <h3 className="text-white font-black text-[11px] uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Services & Pricing ({liveTechServices.length})
                </h3>
                {liveTechServices.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {liveTechServices.map((service: any) => (
                      <div key={service.id} className="bg-slate-950 rounded-2xl p-4 border border-slate-800 flex justify-between items-center">
                        <div>
                          <p className="text-white font-bold text-sm">{service.service_name || service.service}</p>
                          <p className="text-slate-500 text-[10px] uppercase">{service.category || 'General'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-emerald-400 font-black text-lg">
                            KES {service.price ? parseInt(service.price).toLocaleString() : 'N/A'}
                          </p>
                          {service.description && <p className="text-slate-500 text-[9px] mt-1 max-w-[150px]">{service.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-600 text-[10px] font-black uppercase">No services listed</p>
                )}
              </div>

              {/* Photos */}
              <div className="mb-8">
                <h3 className="text-white font-black text-[11px] uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Portfolio Photos ({liveTechPhotos.length})
                </h3>
                {liveTechPhotos.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {liveTechPhotos.map((photo: any) => (
                      <div key={photo.id} className="bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
                        <img src={cx(photo.photo_url, 'w_300,h_200,c_fill,q_auto,f_auto')} alt={photo.caption}
                          className="w-full h-32 object-cover" loading="lazy" />
                        <div className="p-2">
                          <p className="text-slate-400 text-[9px] font-bold">{photo.service || 'General'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-600 text-[10px] font-black uppercase">No photos uploaded</p>
                )}
              </div>

              {/* Videos */}
              <div className="mb-6">
                <h3 className="text-white font-black text-[11px] uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Video Content ({liveTechVideos.length})
                </h3>
                {liveTechVideos.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {liveTechVideos.map((video: any) => (
                      <div key={video.id} className="bg-slate-950 rounded-2xl overflow-hidden border border-slate-800">
                        <div className="relative w-full aspect-[9/16] max-h-[240px] mx-auto">
                          {video.platform === 'tiktok' ? (
                            <a href={video.video_url} target="_blank" rel="noreferrer" className="absolute inset-0 group">
                              <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                                <span className="text-slate-500 text-[10px]">TikTok Video</span>
                              </div>
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                                <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                                  <svg className="w-5 h-5 text-black ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                </div>
                              </div>
                            </a>
                          ) : (
                            <iframe src={video.video_url?.replace('watch?v=', 'embed/')} title={video.service}
                              className="absolute top-0 left-0 w-full h-full" frameBorder="0" allowFullScreen />
                          )}
                        </div>
                        <div className="p-3">
                          <p className="text-slate-400 text-[10px] font-bold">{video.service || 'General'}</p>
                          <p className="text-slate-600 text-[9px] mt-1 capitalize">{video.platform}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-600 text-[10px] font-black uppercase">No videos uploaded</p>
                )}
              </div>

              {/* Stats Summary */}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-800">
                <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 text-center">
                  <p className="text-2xl font-black text-blue-400">{selectedLiveTech.leads_count || 0}</p>
                  <p className="text-slate-500 text-[8px] font-black uppercase">Total Leads</p>
                </div>
                <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 text-center">
                  <p className="text-2xl font-black text-emerald-400">{selectedLiveTech.avg_rating || 0}</p>
                  <p className="text-slate-500 text-[8px] font-black uppercase">Avg Rating</p>
                </div>
                <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 text-center">
                  <p className="text-2xl font-black text-amber-400">{selectedLiveTech.services_count || 0}</p>
                  <p className="text-slate-500 text-[8px] font-black uppercase">Services</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowRejectModal(false)}>
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-800">
              <h2 className="text-white font-black text-lg uppercase tracking-widest">Reject Technician</h2>
              <p className="text-slate-500 text-[10px] font-black uppercase mt-1">Provide a reason for rejection</p>
            </div>
            <div className="p-6">
              <label className="block text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">
                Rejection Reason <span className="text-red-400">*</span>
              </label>
              <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}
                placeholder="Enter detailed reason for rejection (e.g., poor photo quality, incomplete profile, invalid video links, etc.)"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white outline-none focus:border-red-500 transition-all h-32 resize-none"
              />
              <p className="text-slate-600 text-[9px] mt-2">This reason will be sent to the technician's notification inbox.</p>
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button onClick={() => setShowRejectModal(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-400 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                Cancel
              </button>
              <button onClick={rejectTechnician}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                Reject & Notify
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminPage;