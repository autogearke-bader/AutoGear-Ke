export interface TechnicianService {
  id: string;
  technician_id: string;
  service_name: string;
  category: ServiceCategory;
  price: number | null;
  negotiable: boolean;
  notes: string | null;
}

export interface ServiceVariant {
  id?: string;
  service_id: string;
  variant_name: string;
  price: number | null;
  is_negotiable: boolean;
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
  service_variants?: ServiceVariant[];
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
  client_email: string | null;
  client_phone: string;
  service_requested: string;
  vehicle_model: string | null;
  client_location: string;
  client_lat: number | null;
  client_lng: number | null;
  status: 'pending' | 'job_done' | 'not_converted';
  is_archived: boolean;
  admin_confirmed_job_done: boolean;  // Admin must also confirm job done before review notification
  review_notification_sent: boolean;  // Track if review notification was already sent
  is_whatsapp_lead: boolean;    // True if lead was created via WhatsApp click
  whatsapp_clicked_at: string | null;  // Timestamp when WhatsApp was clicked
  hidden_from_client: boolean;  // Soft delete flag for automatic cleanup
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
  | 'body_exterior'
  | 'car_electricals_security'
  | 'mechanical_repair'
  | 'interior_detailing';

export const SERVICE_CATEGORIES: {
  value: ServiceCategory;
  label: string;
  icon: string;
  keywords: string[];
}[] = [
  {
    value: 'body_exterior',
    label: 'Body & Exterior',
    icon: '',
    keywords: ['painting', 'wrapping', 'tinting', 'ppf', 'ceramic', 'buffing']
  },
  {
    value: 'car_electricals_security',
    label: 'Car Electricals & Security',
    icon: '',
    keywords: ['audio', 'security', 'alarms', 'key programming', 'ecu', 'lighting']
  },
  {
    value: 'mechanical_repair',
    label: 'Mechanical & Repair',
    icon: '',
    keywords: ['engine', 'brakes', 'tyres', 'suspension', 'diagnostics', 'greasing']
  },
  {
    value: 'interior_detailing',
    label: 'Interior & Detailing',
    icon: '',
    keywords: ['upholstery', 'seats', 'carpet', 'detailing', 'cleaning']
  }
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
  { name: 'Chameleon Tint', minPrice: 5000, maxPrice: 12000 },
  { name: 'Ceramic Tint', minPrice: 8000, maxPrice: 18000 },
  { name: '3M Tint', minPrice: 15000, maxPrice: 35000 },
  { name: 'Llumar Tint', minPrice: 12000, maxPrice: 28000 },
  { name: 'Local Tint', minPrice: 2000, maxPrice: 6000 },
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
  alt: string;
  url?: string;
  src?: string;
}



export interface Article {
  id: number;
  slug: string;
  title: string;
  images: ArticleImage[];
  content: string;
  excerpt: string;
  meta_description: string;
  keywords: string;
  is_published: number;
  created_at: string;
  updated_at: string;
  internal_links?: { title: string; url: string }[] | null;  // Add this for internal links
  author_bio?: string | null;  // Add this for author bio
  faqs?: { question: string; answer: string }[] | null;  // Add this for FAQs
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
  status: 'pending' | 'job_done' | 'not_converted';
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
  available_on_request: boolean;
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
