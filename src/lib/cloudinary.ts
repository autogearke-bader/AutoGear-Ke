// src/lib/cloudinary.ts
// Cloudinary handles all compression, resizing, format conversion, and CDN delivery.
// Images are organised by type in separate folders.
// q_auto  → Cloudinary picks best quality automatically
// f_auto  → Cloudinary picks best format per browser (WebP, AVIF, JPEG)
// w_{n}   → resize to width, height scales proportionally
// c_fill  → crop to exact dimensions
// c_limit → resize down only, never upscale
// g_face  → smart crop focused on detected face (used for profile images)

export type CloudinaryFolder =
  | 'technicians/profiles'
  | 'technicians/portfolio'
  | 'technicians/covers'
  | 'technicians/thumbnails'
  | 'articles'
  | 'clients';

type ImageSize =
  | 'profile_thumb'   // technician grid card avatar
  | 'profile_full'    // technician profile page large avatar
  | 'card_cover'      // technician card in browse grid
  | 'card_thumbnail'  // clear thumbnail for technician cards (no blur)
  | 'portfolio_thumb' // portfolio grid thumbnail
  | 'portfolio_full'  // portfolio lightbox full size
  | 'article_inline'  // image inside article body
  | 'article_thumb'   // article preview card thumbnail
  | 'cover_banner';   // technician profile page cover banner

const SIZE_PARAMS: Record<ImageSize, string> = {
  profile_thumb:   'w_120,h_120,c_fill,g_face,q_auto,f_auto',
  profile_full:    'w_300,h_300,c_fill,g_face,q_auto,f_auto',
  card_cover:      'w_600,h_380,c_fill,q_auto,f_auto',
  card_thumbnail:  'w_400,h_250,c_fill,q_auto,f_auto',
  portfolio_thumb: 'w_400,h_300,c_fill,q_auto,f_auto',
  portfolio_full:  'w_1200,h_900,c_limit,q_auto,f_auto',
  article_inline:  'w_900,q_auto,f_auto',
  article_thumb:   'w_600,h_380,c_fill,q_auto,f_auto',
  cover_banner:    'w_1400,h_500,c_fill,q_auto,f_auto',
};

export const getOptimisedUrl = (url: string, size: ImageSize): string => {
  if (!url || !url.includes('cloudinary.com')) return url;
  return url.replace('/upload/', `/upload/${SIZE_PARAMS[size]}/`);
};

// Named convenience exports — use these everywhere in the UI
export const profileThumb    = (url: string) => getOptimisedUrl(url, 'profile_thumb');
export const profileFull     = (url: string) => getOptimisedUrl(url, 'profile_full');
export const cardCover       = (url: string) => getOptimisedUrl(url, 'card_cover');
export const cardThumbnail    = (url: string) => getOptimisedUrl(url, 'card_thumbnail');
export const portfolioThumb  = (url: string) => getOptimisedUrl(url, 'portfolio_thumb');
export const portfolioFull   = (url: string) => getOptimisedUrl(url, 'portfolio_full');
export const articleInline   = (url: string) => getOptimisedUrl(url, 'article_inline');
export const articleThumb    = (url: string) => getOptimisedUrl(url, 'article_thumb');
export const coverBanner     = (url: string) => getOptimisedUrl(url, 'cover_banner');
