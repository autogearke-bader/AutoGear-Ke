
import { Product, Bundle } from './types.ts';

export const WHATSAPP_NUMBER = "254112493733";
export const BUSINESS_NAME = "AUTOGEAR KE";
export const TIKTOK_URL = "https://www.tiktok.com/@autogear_ke?_r=1&_t=ZM-92zVNcV4j07";
export const INSTAGRAM_URL = "https://www.instagram.com/autogear_ke?igsh=dWJjMTViZmllemtn";
export const X_URL = "https://x.com/AutogearKe";

export interface Testimonial {
  id: string;
  name: string;
  rating: number;
  text: string;
  carModel: string;
  date: string;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    id: 't1',
    name: 'Kevin Kamau',
    rating: 5,
    text: "The Car Fragrance diffuser is a game changer for my Crown Athlete. It smells premium and the ambient glow perfectly matches my dashboard. Best upgrade yet!",
    carModel: 'Toyota Crown Athlete Owner',
    date: '2 days ago'
  },
  {
    id: 't2',
    name: 'Sarah Waithaka',
    rating: 5,
    text: "Professional installation at their Nairobi workshop. The foot lights are neatly tucked away with no visible wires. Excellent service!",
    carModel: 'Mazda Atenza Owner',
    date: '1 week ago'
  },
  {
    id: 't3',
    name: 'James Osumbi',
    rating: 5,
    text: "Ordered the 5-in-1 charger and got it the same day in Thika. It actually charges super fast even with multiple phones connected.",
    carModel: 'Audi Q7 Owner',
    date: '3 days ago'
  }
];

export const API_BASE_URL = '/api';
export const UPLOADS_URL = '/uploads';

export const CAR_PRODUCTS: Product[] = [];
export const GADGET_PRODUCTS: Product[] = [];
export const BUNDLES: Bundle[] = [];

// Blog Categories as specified in requirements
export const BLOG_CATEGORIES = [
  'Must-Have daily gadgets',
  'The Hybrid & EV guide',
  'Interior comfort & upgrades',
  'The fast charging hub',
  'Smart car tech & security'
];

// Blog Brand Filters as specified in requirements
export const BLOG_BRANDS = [
  'All',
  'Oraimo',
  'Mazda',
  'Toyota',
  'Apple',
  'Samsung',
  'GaN',
  'JBL',
  'Infinix',
  'Tecno',
  'Pioneer',
  'Kenwood',
  'Sony',
  'Anker',
  '70mai',
  'Xiaomi',
  'Huawei'
];

// Blog Page Subtitles
export const BLOG_SUBTITLE = 'Must-Have daily gadgets | The Hybrid & EV guide | Interior comfort & upgrades | The fast charging hub | Smart car tech & security';
