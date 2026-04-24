# Mekh - Kenya's Best Car Technicians & Accessories Marketplace

A modern, responsive web application for Automotive professional car services marketplace in Kenya. Built with React, TypeScript, and Vite for the frontend, with Supabase for authentication, user management, and database.

## 🚗 Features

### For Customers
- **Technician Marketplace**: Find professional car service technicians (tinting, wrapping, PPF, ceramic coating, detailing)
- **Browse Services**: View technician profiles, portfolios, pricing, and reviews
- **Client Booking**: Book appointments with verified technicians
- **Article Blog**: Read articles about car care, new products, and service guides


### For Technicians
- **Join as Technician**: Professional registration with portfolio, services, and pricing
- **Portfolio Management**: Upload work samples and project photos
- **Service Listings**: Define services offered with pricing
- **Profile Verification**: Build credibility with customer reviews

### For Administrators
- **Admin Panel**: Secure admin interface for managing all content
- **Article Management**: Create and manage blog articles with rich text editor (Quill)


### Platform Features
- **Responsive Design**: Mobile-first design optimized for all devices
- **Dark Mode**: Built-in theme toggle for better user experience
- **SEO Optimized**: Meta tags and structured data for search engines
- **WhatsApp Integration**: Direct contact buttons for customer inquiries
- **Google Authentication**: Gmail login for quick sign-up/sign-in
- **Privacy-First**: WhatsApp numbers used only for booking confirmations
- **PWA Support**: Progressive web app capabilities with service worker

## 🛠 Tech Stack

### Frontend (Mekh/)
- **React 19** - Modern React with hooks and concurrent features
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and development server
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework

### Backend & Services
- **Supabase** - Database, Authentication, and User Management
- **Cloudinary** - Image optimization and CDN delivery

## 📁 Project Structure

```
Mekh/
├── Mekh/                      # React Frontend Application
│   ├── .env                         # Environment configuration
│   ├── .gitignore                   # Git ignore rules
│   ├── index.html                   # HTML template with CSP
│   ├── index.tsx                    # React entry point
│   ├── App.tsx                      # Main app component with routing
│   ├── constants.ts                 # App constants and config
│   ├── types.ts                     # TypeScript type definitions
│   ├── metadata.json               # PWA metadata
│   ├── package.json                 # NPM dependencies
│   ├── tsconfig.json                 # TypeScript configuration
│   ├── vite.config.ts               # Vite build configuration
│   ├── vitest.config.ts             # Vitest testing configuration
│   │
│   ├── assets/                      # Static assets
│   │   ├── apple-touch-icon.png
│   │   ├── favicon.ico
│   │   ├── favicon-32.png
│   │   ├── favicon-48.png
│   │   ├── favicon-64.png
│   │   └── mekh.png
│   │
│   ├── components/                  # Shared components (root level)
│   │   ├── ArticleCard.tsx          # Blog article card
│   │   ├── CategoryFilter.tsx       # Product category filter
│   │   ├── ErrorBoundary.tsx        # React error boundary
│   │   ├── FloatingWhatsApp.tsx     # WhatsApp float button
│   │   ├── Footer.tsx               # Site footer
│   │   ├── Header.tsx               # Site header/navigation
│   │   ├── Layout.tsx               # Main layout wrapper
│   │   ├── MobileBottomNav.tsx      # Mobile bottom navigation
│   │   ├── QuillEditor.tsx          # Rich text editor wrapper
│   │   ├── ThemeContext.tsx         # Dark mode context
│   │   └── ThemeToggle.tsx          # Theme switcher
│   │
│   ├── pages/                       # Page components (root level)
│   │   ├── AdminPage.tsx            # Admin dashboard (comprehensive)
│   │   ├── ArticleDetailPage.tsx    # Blog article detail
│   │   ├── BlogPage.tsx             # Blog listing page
│   │   ├── HomePage.tsx             # Landing page
│   │   ├── JoinPage.tsx             # Technician registration
│   │   └── TechnicianProfilePage.tsx # Technician profile view
│   │
│   ├── src/                         # Source files (organized by function)
│   │   ├── index.css                # Global styles
│   │   │
│   │   ├── components/              # Feature-specific components
│   │   │   ├── AuthModal.tsx        # Login/Register modal
│   │   │   ├── Avatar.tsx           # User/Technician avatar
│   │   │   ├── BookingModal.tsx     # Booking request modal
│   │   │   ├── LocationBanner.tsx   # Location selection banner
│   │   │   ├── ProfileCompletionModal.tsx # Profile setup wizard
│   │   │   ├── TechnicianCard.tsx    # Technician listing card
│   │   │   └── TechnicianMap.tsx    # Map showing technician locations
│   │   │
│   │   ├── lib/                     # Library & API integrations
│   │   │   ├── api.ts               # Backend API calls
│   │   │   ├── auth.ts              # Supabase authentication
│   │   │   ├── cloudinary.ts        # Image optimization utilities
│   │   │   ├── location.ts          # Geolocation services
│   │   │   └── supabase.ts          # Supabase client
│   │   │
│   │   └── pages/                   # Additional pages (src level)
│   │       └── HomePage.tsx         # Additional home page variant
│   │
│   ├── public/                      # PWA public assets
│   │   ├── manifest.json            # PWA manifest
│   │   └── sw.js                     # Service worker
│   │
│   └── docs/                        # Documentation
│       └── ADMIN_PAGE_README.md     # Admin panel documentation
│

└── README.md                        # This file
```

## 🔧 Environment Configuration

### Required Variables (Mekh/.env)

```env
# Supabase Configuration (Database & Auth)
# Get these from your Supabase project dashboard: https://app.supabase.com/project/_/settings/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Cloudinary Configuration (Image Management)
# Get these from your Cloudinary dashboard: https://cloudinary.com/console
# Note: Uses unsigned upload preset (no API key/secret required)
VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name
VITE_CLOUDINARY_UPLOAD_PRESET=your-unsigned-upload-preset

# Nominatim (OpenStreetMap Geocoding) - No API key required
VITE_NOMINATIM_URL=https://nominatim.openstreetmap.org
```

### Setting Up External Services

#### Supabase (Database & Authentication)
1. Create a project at https://supabase.com
2. Go to Settings → API
3. Copy the Project URL and anon key
4. Add to `.env` as shown above
5. Configure your database tables in Supabase dashboard

#### Cloudinary (Images)
1. Create an account at https://cloudinary.com
2. Go to Settings → Upload
3. Add an upload preset (enable "Unsigned" mode)
4. Copy your cloud name and preset name to `.env`

## 🏃‍♂️ Getting Started

```bash
# Navigate to frontend directory
cd Mekh

# Install dependencies
npm install

# Start development server
npm run dev
# App runs at http://localhost:3000

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📱 Pages & Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | HomePage | Landing page with featured content |
| `/blog` | BlogPage | Article listing |
| `/blog/:slug` | ArticleDetailPage | Single article view |
| `/join` | JoinPage | Technician registration |
| `/technician/:id` | TechnicianProfilePage | Technician profile |
| `/admin` | AdminPage | Admin dashboard |

## 🎨 Image Optimization

The project uses Cloudinary for automatic image optimization:

```typescript
// Import from cloudinary.ts
import { profileThumb, cardCover, portfolioFull } from './lib/cloudinary';

// Usage - automatically optimizes for size, format (WebP/AVIF), quality
const optimizedUrl = profileThumb(user.avatarUrl);
```

### Available Optimizations
- `profile_thumb` - 120x120 face-cropped avatar
- `profile_full` - 300x300 face-cropped avatar
- `card_cover` - 600x380 cover image
- `portfolio_thumb` - 400x300 portfolio thumbnail
- `portfolio_full` - 1200x900 full portfolio
- `article_inline` - 900px wide article images
- `article_thumb` - 600x380 article preview
- `cover_banner` - 1400x500 profile banner

## 🔒 Security Features

- **Content Security Policy**: Strict CSP in index.html
- **Supabase Auth**: Secure authentication with JWT tokens
- **Row Level Security**: Database-level access control
- **Input Sanitization**: XSS prevention
- **CORS Protection**: Configured in Supabase

## ♿ Accessibility

The project is committed to WCAG 2.1 AA compliance. Key accessibility features include:

- **Form Labels**: All form inputs have properly associated labels using `htmlFor` and `id` attributes
- **ARIA Labels**: Complex components like disabled inputs and dynamic content include `aria-label` attributes
- **Screen Reader Support**: Hidden labels (`.sr-only`) for visually hidden but accessible labels
- **Keyboard Navigation**: All interactive elements are keyboard accessible
- **Focus Indicators**: Visible focus states on all interactive elements
- **Color Contrast**: High contrast colors meeting WCAG AA standards

### Recent Accessibility Fixes

- Fixed form label associations in TechnicianDashboardPage.tsx
- Added accessible names to all select elements
- Added dynamic IDs for form elements rendered in maps
- Added ARIA labels for status dropdowns and read-only fields

## 🐛 Recent Updates

### March 2026
- Migrated from legacy PHP/MySQL to Supabase
- Fixed TypeScript compilation error in HomePage.tsx
- Added comprehensive AdminPage documentation
- Implemented Cloudinary image optimization
- Added PWA service worker support
- Enhanced SEO with structured data
- **Updated authenticated client navigation header** with responsive design for tablet/desktop
  - Added Home link for authenticated clients
  - Added booking count display to My Bookings link (fetches from backend)
  - Added Become a Technician link for client-to-technician conversion
  - Removed Insights link from authenticated client view
  - Simplified user avatar dropdown to only include Edit Profile and Sign Out

### Features Added
- Technician marketplace with booking
- Rich text article editor (Quill)
- Google OAuth authentication
- Location-based technician search
- Dark mode with theme toggle
- WhatsApp integration for bookings

## 📖 Additional Documentation

- **[Admin Page Guide](./docs/ADMIN_PAGE_README.md)** - Complete guide to the admin command center

## 📞 Support

- **Location**: Nairobi, Kenya
- **WhatsApp**: Contact via website
- **Email**: Available on website

## 📜 License

Proprietary - All rights reserved.

---

*Professional Car Technician Services Marketplace platform in Kenya*
