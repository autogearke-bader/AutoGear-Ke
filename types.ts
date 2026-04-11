export interface TechnicianService {
  id: string;
  technician_id: string;
  service_name: string;
  price: number | null;
  negotiable: boolean;
}

export interface Service {
  id: string;
  name: string;
  created_by: string | null;
  created_at: string;
}

export interface TechnicianPhoto {
  id: string;
  technician_id: string;
  photo_url: string;
  service: string;
  caption: string;
  alt_text: string;
  sort_order: number;
}

export interface TechnicianVideo {
  id: string;
  technician_id: string;
  platform: 'tiktok' | 'youtube' | 'instagram';
  video_url: string;
  video_id: string;
  service: string;
  alt_text: string;
  sort_order: number;
  created_at: string;
}

export interface Review {
  id: string;
  technician_id: string;
  lead_id: string | null;
  client_id: string | null;  // Added for review approval workflow
  client_name: string;
  rating: number;
  would_rebook: 'yes' | 'no' | null;
  comment: string;
  is_visible: boolean;
  status: 'pending' | 'approved' | 'declined';  // Added for review approval workflow
  admin_notes: string;  // Added for review approval workflow
  approved_by: string | null;  // Added for review approval workflow
  updated_at: string;  // Added for review approval workflow
  created_at: string;
}

export interface Notification {
  id: string;
  technician_id: string;
  client_id?: string;  // Optional - for client notifications
  type: 'new_lead' | 'new_review' | 'profile_approved' | 'profile_rejected' | 'subscription_reminder' | 'review_request' | 'review_approved';  // Added review_approved
  title?: string;  // Added for review_approved notifications
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface Technician {
  id: string;
  first_name: string;
  last_name: string;
  business_name: string;
  slug: string;
  phone: string;
  email: string;
  bio: string;
  experience_years: string;
  county: string;
  area: string;
  mobile_service: 'yes' | 'no' | 'both';
  instagram: string;
  tiktok_link: string;
  youtube_link: string;
  pricing_notes: string;
  status: 'pending' | 'live' | 'suspended';
  user_id: string;
  profile_image: string | null;   // Cloudinary URL from technicians/profiles/
  cover_photo: string | null;      // Cloudinary URL for cover photo (cards only)
  thumbnail_image: string | null; // Cloudinary URL for clear thumbnail in cards
  technician_services: TechnicianService[];
  technician_photos: TechnicianPhoto[];
  technician_videos: TechnicianVideo[];
  technician_payments: { id: string; method: string }[];
  reviews: Review[];
  avg_rating: number;
  review_count: number;
  created_at: string;
  latitude?: number;  // Optional - for location-based sorting
  longitude?: number; // Optional - for location-based sorting
  google_maps_link?: string;  // Google Maps link entered during registration
  distance?: number;  // Computed distance from user location
  business_hours?: BusinessHours[];  // Business hours schedule
}

export interface Lead {
  id: string;
  technician_id: string;
  client_id: string | null;
  client_name: string;
  client_phone: string;
  service_requested: string;
  vehicle_model: string | null;
  client_location: string;
  client_lat: number | null;
  client_lng: number | null;
  status: 'pending' | 'contacted' | 'job_done' | 'no_response';
  admin_confirmed_job_done: boolean;  // Admin must also confirm job done before review notification
  review_notification_sent: boolean;  // Track if review notification was already sent
  is_whatsapp_lead: boolean;    // True if lead was created via WhatsApp click
  whatsapp_clicked_at: string | null;  // Timestamp when WhatsApp was clicked
  created_at: string;
}

export interface Client {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  email: string;
  created_at: string;
}

export type ServiceCategory =
  | 'all' | 'tinting' | 'wrapping' | 'ppf'
  | 'ceramic' | 'buffing' | 'detailing' | 'tuning' | 'riveting' | 'identity';

export const SERVICE_CATEGORIES: {
  value: ServiceCategory;
  label: string;
  icon: string;
  keywords: string[];
}[] = [
  { value: 'all', label: 'All Services', icon: '', keywords: [] },
  { value: 'tinting', label: 'Window Tinting', icon: '', keywords: ['tinting', 'tint', 'window'] },
  { value: 'wrapping', label: 'Car Wrapping', icon: '', keywords: ['wrapping', 'wrap'] },
  { value: 'ppf', label: 'PPF Installation', icon: '', keywords: ['ppf', 'paint protection', 'film'] },
  { value: 'ceramic', label: 'Ceramic Coating', icon: '', keywords: ['ceramic', 'coating'] },
  { value: 'buffing', label: 'Car Buffing', icon: '', keywords: ['buffing', 'buff', 'polish'] },
  { value: 'detailing', label: 'Car Detailing', icon: '', keywords: ['detailing', 'detail', 'wash'] },
  { value: 'tuning', label: 'Car Tuning', icon: '', keywords: ['tuning', 'tune', 'ecu', 'performance'] },
  { value: 'riveting', label: 'Car Riveting', icon: '', keywords: ['riveting', 'rivet'] },
  {value: 'identity', label: 'Car Identity', icon: '', keywords: ['identity']}
];

export const PAYMENT_METHODS = ['M-Pesa', 'Cash', 'Bank Transfer', 'Airtel Money'];

export const EXPERIENCE_OPTIONS = [
  'Less than 1 year', '1 – 2 years', '3 – 5 years', '5 – 10 years', '10+ years',
];

export const ALL_SERVICES = [
  'Window Tinting', 'Car Wrapping', 'PPF Installation', 'Ceramic Coating',
  'Car Buffing', 'Car Detailing', 'Headlight Restoration', 'Chrome Deleting',
  'Rim Customization', 'Headlight Tinting', 'Car Tuning', 'FaceLifting',
  'Car Riveting', 'Car Identity', 'Chrome Plate Installation', 'Tailight Smoking', 'License plate Installation'
];

// Sub-services for Window Tinting - New predefined list
export const WINDOW_TINT_TYPES = [
  { name: 'Carbon Dyed', minPrice: 3000, maxPrice: 8000 },
  { name: 'Chameleon', minPrice: 5000, maxPrice: 12000 },
  { name: 'Ceramic Tint', minPrice: 8000, maxPrice: 18000 },
  { name: '3M Tint', minPrice: 15000, maxPrice: 35000 },
  { name: 'Metalized Window Tint', minPrice: 10000, maxPrice: 25000 },
];

// Sub-services for Car Wrapping with their typical price ranges
export const CAR_WRAP_TYPES = [
  { name: 'Full Vehicle Wrap', minPrice: 80000, maxPrice: 200000 },
  { name: 'Partial Wrap (Hood, Roof)', minPrice: 25000, maxPrice: 60000 },
  { name: 'Door Wraps', minPrice: 15000, maxPrice: 40000 },
  { name: 'Bumper Wrap', minPrice: 8000, maxPrice: 20000 },
  { name: 'Mirrors Wrap', minPrice: 3000, maxPrice: 8000 },
  { name: 'Interior Trim', minPrice: 5000, maxPrice: 15000 },
];




export interface ArticleImage {
  image_name: string;
  url?: string;
  alt?: string;
}



export interface Article {
  id: number;
  slug: string;
  title: string;
  featured_image: string;
  images?: ArticleImage[];
  content: string;
  excerpt: string;
  meta_description: string;
  keywords: string;
  is_published: number;
  published_at: string;
  created_at: string;
  updated_at: string;
  featuredImage?: string;
  publishedAt?: string;
}

// Admin dashboard types
export interface AdminTechnician {
  id: string;
  first_name: string;
  last_name: string;
  business_name: string;
  slug: string;
  phone: string;
  county: string;
  area: string;
  status: 'pending' | 'live' | 'suspended';
  leads_count: number;
  avg_rating: number;
  review_count: number;
  services_count: number;
  created_at: string;
}

export interface AdminLead {
  id: string;
  client_name: string;
  client_phone: string;
  service_requested: string;
  client_location: string;
  status: 'pending' | 'contacted' | 'job_done' | 'no_response';
  admin_confirmed_job_done: boolean;
  review_notification_sent: boolean;
  is_whatsapp_lead: boolean;
  whatsapp_clicked_at: string | null;
  created_at: string;
  technicians?: { business_name: string; first_name: string; last_name: string; phone: string };
}

// Client notification type
export interface ClientNotification {
  id: string;
  type: 'new_lead' | 'status_update' | 'review_request';
  message: string;
  is_read: boolean;
  created_at: string;
  technician_id?: string;
  lead_id?: string;
}

export interface AdminReview {
  id: string;
  client_name: string;
  rating: number;
  would_rebook: 'yes' | 'no' | null;
  comment: string;
  is_visible: boolean;
  created_at: string;
  technicians?: { business_name: string; first_name: string };
}

// Business hours interface
export interface BusinessHours {
  id: string;
  technician_id: string;
  day_of_week: number;  // 0 = Sunday, 6 = Saturday
  is_open: boolean;
  open_time: string | null;  // HH:MM format
  close_time: string | null;  // HH:MM format
}

// Day of week labels
export const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', shortLabel: 'Sun' },
  { value: 1, label: 'Monday', shortLabel: 'Mon' },
  { value: 2, label: 'Tuesday', shortLabel: 'Tue' },
  { value: 3, label: 'Wednesday', shortLabel: 'Wed' },
  { value: 4, label: 'Thursday', shortLabel: 'Thu' },
  { value: 5, label: 'Friday', shortLabel: 'Fri' },
  { value: 6, label: 'Saturday', shortLabel: 'Sat' },
];
