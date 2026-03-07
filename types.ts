export interface Category {
  id: number;
  name: string;
  slug: string;
}

export interface Brand {
  id: number;
  name: string;
  slug: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  images: ProductImage[]; // Array of images with alt_text instead of a single string
  hasInstallation: boolean;
  category: 'car' | 'gadget';
  stockStatus?: 'in-stock' | 'limited' | 'out-of-stock';
  isNew?: boolean; // New arrival flag
  videoUrl?: string;
  youtubeUrl?: string;
  tiktokUrl?: string;
  instagramUrl?: string;
  useWhiteBg?: boolean | boolean[]; // New: for transparent assets per image
}

export interface ProductImage {
  image_name: string;
  url?: string;        // Full URL path to the image
  alt_text?: string;
}

export interface ArticleImage {
  image_name: string;
  url?: string;        // Full URL path to the image
  alt_text?: string;
}

export interface Bundle {
  id: string;
  name: string;
  products: string[];
  totalPrice: number;
  originalPrice: number;
  category?: 'car' | 'gadget';
  hasInstallation?: boolean;
}

export interface Article {
  id: number;
  slug: string;
  title: string;
  featured_image: string;    // Database name
  images?: ArticleImage[];   // Array of article images with URL
  content: string;
  excerpt: string;
  meta_description: string;  // Database name
  seo_keywords: string;      // Database name
  category: string;
  category_id?: number;      // New: category ID from categories table
  brand: string;            // Legacy: single brand name
  brand_ids?: number[];     // New: array of brand IDs
  brand_names?: string[];   // New: array of brand names
  related_products: string;  // Comes as a string from DB
  related_bundles: string;   // Comes as a string from DB
  is_published: number;      // 1 or 0
  is_featured_homepage: number;
  is_featured_car: number;
  is_featured_mobile: number;
  published_at: string;      // Database name
  created_at: string;
  updated_at: string;
  // Optional camelCase for backward compatibility
  featuredImage?: string;
  publishedAt?: string;
}

// Blog categories as defined in the requirements
export type BlogCategory = 
  | 'Must-Have daily gadgets'
  | 'The Hybrid & EV guide'
  | 'Interior comfort & upgrades'
  | 'The fast charging hub'
  | 'Smart car tech & security';

// Brand filters as defined in the requirements
export type BlogBrand = 
  | 'All'
  | 'Oraimo'
  | 'Mazda'
  | 'Toyota'
  | 'Apple'
  | 'Samsung'
  | 'GaN'
  | 'JBL'
  | 'Infinix'
  | 'Tecno'
  | 'Pioneer'
  | 'Kenwood'
  | 'Sony'
  | 'Anker'
  | '70mai'
  | 'Xiaomi'
  | 'Huawei';
