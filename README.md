# 🚗 Mekh - Kenya's Premier Automotive Services Marketplace

> **Professional automotive services marketplace connecting car owners with verified technicians across Kenya**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Latest-3ECF8E)](https://supabase.com/)
[![PWA](https://img.shields.io/badge/PWA-Enabled-5A0FC8)](https://web.dev/progressive-web-apps/)
[![Vitest](https://img.shields.io/badge/Vitest-4.0-729B1B)](https://vitest.dev/)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Configuration](#-environment-configuration)
- [Development](#-development)
- [Deployment](#-deployment)
- [Architecture](#-architecture)
- [Security](#-security)
- [Testing](#-testing)
- [Contributing](#-contributing)

---

## 🎯 Overview

Mekh is a modern Progressive Web Application (PWA) that revolutionizes how Kenyans find and book automotive services. The platform connects car owners with verified technicians specializing in:

### Service Categories

#### 🎨 Body & Exterior
- **Window Tinting** - Chameleon, Ceramic, 3M, Llumar, Local tints
- **Car Wrapping** - Full wraps, partial wraps, custom designs
- **PPF Installation** - Paint protection film
- **Ceramic Coating** - Professional ceramic coating services
- **Car Buffing** - Paint correction and polishing
- **Headlight Restoration** - Restore clarity to foggy headlights
- **Chrome Deleting** - Blackout chrome trim
- **Rim Customization** - Custom wheel finishes

#### 🔌 Car Electricals & Security
- **Car Audio Systems** - Premium sound installations
- **Security Systems** - Alarms, immobilizers, tracking
- **Key Programming** - Remote key and transponder programming
- **ECU Tuning** - Engine control unit modifications
- **Lighting Upgrades** - LED, HID, custom lighting

#### ⚙️ Mechanical & Repair
- **Engine Diagnostics** - Computer diagnostics and troubleshooting
- **Brake Services** - Brake pads, rotors, fluid replacement
- **Suspension Work** - Shocks, struts, alignment
- **Tire Services** - Mounting, balancing, rotation
- **Oil Changes & Maintenance** - Regular service intervals

#### ✨ Interior & Detailing
- **Car Detailing** - Interior & exterior deep cleaning
- **Upholstery Work** - Seat repairs and replacements
- **Carpet Cleaning** - Deep cleaning and stain removal
- **Interior Trim** - Dashboard and panel customization

**Live Platform**: [https://mekh.app](https://mekh.app)

---

## ✨ Features

### 🔍 For Clients (Car Owners)

#### Discovery & Search
- **Smart Search** - Search by service, location, or service variants (e.g., "Ceramic Tint in Karen")
- **Location-Based** - Find technicians near you with geolocation
- **Service Variants** - Search specific variants like "3M Tint" or "Full Vehicle Wrap"
- **Category Filters** - Browse by Body & Exterior, Electricals, Mechanical, Interior
- **Top Rated** - Discover highly-rated technicians
- **Mobile Service** - Filter technicians who come to you

#### Booking & Communication
- **Direct Booking** - Book services through the platform
- **WhatsApp Integration** - Instant contact via WhatsApp
- **Booking Management** - Track all your bookings in one place
- **Review System** - Leave reviews after service completion
- **Service History** - View past bookings and services

#### User Experience
- **PWA Support** - Install as mobile app (iOS & Android)
- **Offline Mode** - Graceful offline handling with user-friendly messages
- **Dark Mode** - System-aware theme switching
- **Responsive Design** - Optimized for mobile, tablet, and desktop
- **Fast Loading** - Optimized images via Cloudinary CDN

### 🔧 For Technicians

#### Profile Management
- **Professional Profiles** - Showcase your business with photos and videos
- **Portfolio Gallery** - Upload work samples (photos & TikTok/YouTube/Instagram videos)
- **Service Listings** - Define services with pricing and variants (e.g., "Ceramic Tint - KES 8,000-18,000")
- **Service Categories** - Organize services by Body & Exterior, Electricals, Mechanical, Interior
- **Business Hours** - Set availability schedule including "Available on Request" for Sundays
- **Location Settings** - Mobile service, fixed location, or both
- **Google Maps Integration** - Link your business location

#### Lead Management
- **Lead Dashboard** - Manage incoming booking requests
- **Status Tracking** - Update lead status (pending, job_done, not_converted)
- **Client Communication** - Direct WhatsApp integration with automatic lead tracking
- **Performance Metrics** - Track ratings and reviews
- **Email Notifications** - Receive lead notifications via email

#### Verification & Trust
- **Profile Verification** - Admin-approved profiles (pending, live, suspended)
- **Review System** - Build reputation through client reviews (admin-moderated)
- **Rating Display** - Showcase your average rating and review count
- **Service Variants** - Offer specific service options with pricing (e.g., "3M Tint", "Full Vehicle Wrap")

### 👨‍💼 For Administrators

#### Content Management
- **Technician Approval** - Review and approve new technicians (pending → live → suspended)
- **Article Management** - Create SEO-optimized blog articles with:
  - Rich text editor (Quill)
  - Internal links for SEO
  - Author bio sections
  - FAQs with structured data
  - Key takeaways
  - Term definitions
- **Review Moderation** - Approve/decline client reviews with admin notes
- **User Management** - Manage clients and technicians
- **Lead Oversight** - View all booking requests and confirm job completion

#### Platform Oversight
- **Analytics Dashboard** - Monitor platform metrics (technicians, leads, reviews)
- **Lead Management** - Admin confirmation required before review requests sent
- **Content Moderation** - Ensure quality standards
- **System Health** - Monitor platform performance
- **Email Notifications** - Automated review request emails via Supabase Edge Functions

### 🌐 Platform Features

#### Performance & SEO
- **SEO Optimized** - Meta tags, structured data, sitemap
- **AI Bot Friendly** - Allows GPTBot, Claude, Perplexity, Gemini crawling
- **Fast Loading** - Code splitting, lazy loading, image optimization
- **CDN Delivery** - Cloudinary for images, Supabase for data

#### Security & Privacy
- **Secure Authentication** - Supabase Auth with JWT tokens
- **Row Level Security** - Database-level access control
- **Content Security Policy** - XSS protection
- **Privacy-First** - WhatsApp numbers only for confirmed bookings

#### Developer Experience
- **TypeScript** - Full type safety
- **Modern React** - React 19 with hooks and concurrent features
- **Hot Module Replacement** - Instant dev updates
- **Testing Suite** - Vitest for unit and property-based testing

---

## 🛠 Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19.0.3 | UI framework with concurrent features |
| **TypeScript** | 5.8.2 | Type-safe JavaScript |
| **Vite** | 6.2.0 | Build tool and dev server |
| **React Router** | 7.11.0 | Client-side routing with lazy loading |
| **Tailwind CSS** | 4.1.18 | Utility-first CSS framework |
| **React Helmet Async** | 2.0.5 | SEO meta tag management |
| **Quill** | 2.0.3 | Rich text editor for blog articles |
| **React Quill** | 2.0.0 | React wrapper for Quill editor |
| **Leaflet** | 1.9.4 | Interactive maps for technician locations |
| **DOMPurify** | 3.3.1 | XSS protection for user-generated content |
| **UUID** | 13.0.0 | Unique identifier generation |

### Backend & Services

| Service | Purpose |
|---------|---------|
| **Supabase** | PostgreSQL database with Row Level Security (RLS) |
| **Supabase Auth** | JWT-based authentication with Google OAuth |
| **Supabase Edge Functions** | Serverless functions for email notifications and TikTok thumbnails |
| **Cloudinary** | Image optimization, transformation, and CDN delivery |
| **Nominatim** | OpenStreetMap geocoding for location services |
| **Resend** | Email delivery service for review notifications |

### Development Tools

| Tool | Purpose |
|------|---------|
| **Vitest** | Unit testing and property-based testing framework |
| **Fast-check** | Property-based testing library for edge case discovery |
| **Rollup Visualizer** | Bundle size analysis and optimization |
| **CSpell** | Spell checking for code and documentation |
| **Vite PWA Plugin** | Service worker generation with Workbox |

### PWA & Performance

| Feature | Implementation |
|---------|---------------|
| **Service Worker** | Vite PWA plugin with Workbox strategies |
| **Offline Support** | Custom offline fallback UI with error boundary |
| **Image Optimization** | Cloudinary automatic format (WebP/AVIF) with responsive sizing |
| **Code Splitting** | Dynamic imports for routes and heavy components |
| **Lazy Loading** | React.lazy for page components and maps |
| **Caching Strategy** | NetworkFirst for assets, NetworkOnly for API calls |
| **Update Prompt** | User-friendly PWA update notifications |

---

## 📁 Project Structure

```
AutoGearKe/
├── 📄 Configuration Files
│   ├── .env                          # Environment variables (Supabase, Cloudinary)
│   ├── .gitignore                    # Git ignore rules
│   ├── package.json                  # Dependencies and scripts
│   ├── tsconfig.json                 # TypeScript configuration
│   ├── vite.config.ts                # Vite build configuration with PWA
│   ├── vitest.config.ts              # Testing configuration
│   └── cspell.json                   # Spell checker config
│
├── 📱 Entry Points
│   ├── index.html                    # HTML template with CSP headers
│   ├── index.tsx                     # React entry point with HelmetProvider
│   └── App.tsx                       # Main app with routing, auth, PWA logic
│
├── 📦 Core Files
│   ├── types.ts                      # TypeScript type definitions (Technician, Lead, Review, etc.)
│   └── constants.ts                  # App constants and config
│
├── 🎨 Assets
│   ├── assets/                       # Static assets (icons, images, logos)
│   └── public/                       # PWA assets
│       ├── manifest.json             # PWA manifest with shortcuts
│       ├── sw.js                     # Service worker
│       ├── robots.txt                # SEO crawler rules (allows AI bots)
│       ├── _headers                  # Netlify headers config (CSP, security)
│       └── _redirects                # Netlify redirects
│
├── 🧩 Components
│   ├── components/                   # Shared components (root)
│   │   ├── ArticleCard.tsx           # Blog article card with SEO
│   │   ├── ErrorBoundary.tsx         # React error boundary with offline detection
│   │   ├── Footer.tsx                # Site footer with links
│   │   ├── Header.tsx                # Navigation header with auth state
│   │   ├── Layout.tsx                # Main layout wrapper with auth listener
│   │   ├── QuillEditor.tsx           # Rich text editor for admin
│   │   ├── ThemeContext.tsx          # Dark mode context provider
│   │   ├── ThemeToggle.tsx           # Dark mode toggle button
│   │   ├── TechnicianSidebar.tsx     # Technician profile sidebar
│   │   ├── GuestBottomNav.tsx        # Guest navigation (mobile)
│   │   ├── ClientBottomNav.tsx       # Client navigation (mobile)
│   │   └── TechnicianBottomNav.tsx   # Technician navigation (mobile)
│   │
│   └── src/components/               # Feature components
│       ├── Avatar.tsx                # User avatar component with Cloudinary
│       ├── BookingModal.tsx          # Booking request modal with geolocation
│       ├── BusinessHoursEditor.tsx   # Business hours manager with "Available on Request"
│       ├── LazyMap.tsx               # Lazy-loaded Leaflet map wrapper
│       ├── LocationBanner.tsx        # Location selection banner
│       ├── OfflineFallback.tsx       # Offline mode UI with retry
│       ├── ProfileCompletionModal.tsx # Profile completion prompt
│       ├── Skeleton.tsx              # Loading skeleton components
│       ├── TechnicianCard.tsx        # Technician listing card with WhatsApp tracking
│       ├── TechnicianMap.tsx         # Interactive map for technician locations
│       └── UpdatePrompt.tsx          # PWA update notification
│
├── 📄 Pages
│   ├── pages/                        # Page components (lazy-loaded)
│   │   ├── AuthPage.tsx              # Login/Register with Google OAuth
│   │   ├── AuthCallback.tsx          # OAuth callback handler
│   │   ├── JoinPage.tsx              # Technician registration with Cloudinary upload
│   │   ├── AdminPage.tsx             # Admin dashboard (technicians, leads, reviews, articles)
│   │   ├── BlogPage.tsx              # Blog listing with SEO
│   │   ├── ArticleDetailPage.tsx     # Article detail view with structured data
│   │   ├── TechnicianProfilePage.tsx # Technician profile with reviews and portfolio
│   │   ├── TechnicianDashboardPage.tsx # Technician dashboard (leads, profile, services)
│   │   ├── NearbyTechniciansPage.tsx # Nearby technicians with geolocation
│   │   ├── ClientProfilePage.tsx     # Client profile management
│   │   ├── ClientOnboardingPage.tsx  # Client setup (name, phone)
│   │   ├── BookingsPage.tsx          # Booking management with soft delete
│   │   ├── ServiceLocationPage.tsx   # Service location pages (SEO)
│   │   ├── ContactPage.tsx           # Contact form
│   │   ├── AboutPage.tsx             # About page
│   │   ├── TermsPage.tsx             # Terms of service
│   │   ├── PrivacyPolicyPage.tsx     # Privacy policy
│   │   ├── MenuPage.tsx              # Menu page (client)
│   │   ├── GuestMenuPage.tsx         # Guest menu
│   │   ├── TechnicianMenuPage.tsx    # Technician menu
│   │   └── NotFoundPage.tsx          # 404 page
│   │
│   └── src/page/                     # Additional pages
│       └── HomePage.tsx              # Main landing page with search and filters
│
├── 🔧 Libraries & Utilities
│   └── src/lib/
│       ├── api.ts                    # Backend API calls (1044 lines)
│       │                             # - Client profile management
│       │                             # - Public reads (technicians, articles)
│       │                             # - Client leads/bookings with soft delete
│       │                             # - Technician leads and notifications
│       │                             # - Technician profile updates
│       │                             # - Services and service variants
│       │                             # - Reviews with admin approval workflow
│       │                             # - Cloudinary upload
│       │                             # - Admin functions (leads, reviews)
│       │                             # - TikTok thumbnail fetching
│       ├── auth.ts                   # Supabase authentication
│       │                             # - Google OAuth (client & technician)
│       │                             # - Email/password auth
│       │                             # - Session management with CORS handling
│       │                             # - Profile completion checks
│       ├── supabase.ts               # Supabase client with CORS error handling
│       ├── cloudinary.ts             # Image optimization helpers
│       │                             # - profileThumb (120x120 face-cropped)
│       │                             # - cardCover (600x380)
│       │                             # - fullImage (1200x800)
│       └── location.ts               # Geolocation services with Nominatim
│
├── 💾 Database
│   ├── migrations/                   # Database migrations (41 files)
│   │   ├── 001_update_technician_schema.sql # Initial schema
│   │   ├── 015_review_approval_workflow.sql # Review moderation
│   │   ├── 022_add_business_hours.sql       # Business hours
│   │   ├── 023_add_service_variants.sql     # Service variants
│   │   ├── 032_add_rating_columns_to_technicians.sql # Rating system
│   │   ├── 033_add_booking_cleanup_function.sql # Automatic cleanup
│   │   ├── 035_add_article_key_takeaways_definitions.sql # Article enhancements
│   │   ├── 041_add_service_categories.sql   # Service categories
│   │   └── ... (33 more migrations)
│   │
│   └── supabase/                     # Supabase Edge Functions
│       └── functions/
│           ├── send-lead-notification/      # Email notifications for leads
│           ├── send-review-email/           # Email notifications for reviews
│           └── get-tiktok-thumbnail/        # TikTok thumbnail fetching
│
├── 🎨 Styles
│   └── src/
│       └── index.css                 # Global Tailwind styles with custom utilities
│
├── 🔨 Scripts
│   └── scripts/
│       ├── generate-sitemap.js       # SEO sitemap generator
│       └── verify-rating-trigger.js  # Database trigger verification
│
├── 🌐 Sitemap Worker
│   └── sitemap worker/
│       ├── sitemap-worker.js         # Cloudflare Worker for dynamic sitemap
│       └── wrangler.toml             # Cloudflare Worker config
│
└── 📚 Documentation
    └── README.md                     # This file
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Supabase Account** (free tier available)
- **Cloudinary Account** (free tier available)
- **Git** for version control

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/mekh.git
cd mekh/AutoGearKe

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`

---

## 🔐 Environment Configuration

### Required Environment Variables

Create a `.env` file in the `AutoGearKe/` directory:

```env
# Supabase Configuration
# Get from: https://app.supabase.com/project/_/settings/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Cloudinary Configuration  
# Get from: https://cloudinary.com/console
VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name
VITE_CLOUDINARY_UPLOAD_PRESET=your-unsigned-upload-preset

# Nominatim (OpenStreetMap) - No API key required
# Used for geocoding and reverse geocoding
VITE_NOMINATIM_URL=https://nominatim.openstreetmap.org
```

### Setting Up External Services

#### 1. Supabase Setup

1. Create a project at [https://supabase.com](https://supabase.com)
2. Go to **Settings → API** and copy:
   - Project URL → `VITE_SUPABASE_URL`
   - anon/public key → `VITE_SUPABASE_ANON_KEY`
3. Go to **Authentication → Providers** and enable:
   - Email (for technician registration)
   - Google OAuth (for client sign-in)
4. Add your production domain to **Authentication → URL Configuration → Site URL**
5. Run all migrations in order from `migrations/` folder:

```sql
-- Run in Supabase SQL Editor
-- Start with 001_update_technician_schema.sql
-- End with 041_add_service_categories.sql
-- Each migration builds on the previous one
```

6. Set up Edge Functions:
   - Deploy `send-lead-notification` for email notifications
   - Deploy `send-review-email` for review request emails
   - Deploy `get-tiktok-thumbnail` for TikTok video thumbnails

#### 2. Cloudinary Setup

1. Create account at [https://cloudinary.com](https://cloudinary.com)
2. Go to **Settings → Upload**
3. Create upload preset:
   - Name: `mekh_unsigned` (or your choice)
   - Signing Mode: **Unsigned**
   - Folder: `mekh`
   - Allowed formats: `jpg, png, webp, avif`
4. Copy **Cloud Name** and **Upload Preset** to `.env`

#### 3. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable **Google+ API**
4. Go to **Credentials → Create Credentials → OAuth 2.0 Client ID**
5. Add authorized redirect URIs:
   - `https://your-project.supabase.co/auth/v1/callback`
   - `http://localhost:3000/auth/callback` (for development)
6. Copy **Client ID** and **Client Secret** to Supabase:
   - Go to **Authentication → Providers → Google**
   - Paste credentials and enable

#### 4. Database Schema

The platform uses 41 migrations to set up:

**Core Features:**
- User authentication (clients, technicians, admins)
- Technician profiles with services and variants
- Booking/lead management system with WhatsApp tracking
- Review and rating system with admin approval
- Article/blog management with SEO enhancements
- Business hours scheduling with "Available on Request"
- Geolocation data with latitude/longitude

**Key Tables:**
- `technicians` - Business profiles with status (pending/live/suspended)
- `technician_services` - Services with categories and pricing
- `service_variants` - Service variants (e.g., "3M Tint", "Full Wrap")
- `technician_photos` - Portfolio photos with alt text
- `technician_videos` - TikTok/YouTube/Instagram videos
- `business_hours` - Weekly schedule with special Sunday handling
- `clients` - Client profiles with contact info
- `leads` - Booking requests with status tracking
- `reviews` - Client reviews with admin moderation
- `articles` - Blog articles with SEO metadata
- `notifications` - Real-time notifications

**Security:**
- Row Level Security (RLS) on all tables
- `is_admin()` function for admin access
- Triggers for automatic rating calculation
- Functions for client profile upsert and booking cleanup

---

## 💻 Development

### Available Scripts

```bash
# Development
npm run dev              # Start dev server (localhost:3000)
npm run build            # Production build
npm run preview          # Preview production build

# Testing
npm run test             # Run tests once
npm run test:watch       # Run tests in watch mode
npm run test:ui          # Open Vitest UI

# Utilities
npm run sitemap          # Generate sitemap.xml
npm run clean            # Clean build artifacts
npm run clean:build      # Clean and rebuild
npm run analyze          # Analyze bundle size
```

### Development Workflow

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Follow TypeScript best practices
   - Use existing components when possible
   - Add types for new data structures

3. **Test Changes**
   ```bash
   npm run test
   npm run dev  # Manual testing
   ```

4. **Build & Verify**
   ```bash
   npm run build
   npm run preview
   ```

5. **Commit & Push**
   ```bash
   git add .
   git commit -m "feat: your feature description"
   git push origin feature/your-feature-name
   ```

### Code Style Guidelines

- **TypeScript**: Use strict mode, define interfaces for all data
- **React**: Functional components with hooks
- **Styling**: Tailwind CSS utility classes
- **Naming**: camelCase for variables, PascalCase for components
- **Files**: One component per file, co-locate related files

---

## 🌐 Deployment

### Build for Production

```bash
# Create optimized production build
npm run build

# Output will be in dist/ folder
# dist/
# ├── index.html
# ├── assets/
# │   ├── index-[hash].js          (~60 KB)
# │   ├── vendor-react-[hash].js   (~188 KB)
# │   ├── vendor-supabase-[hash].js (~166 KB)
# │   ├── vendor-router-[hash].js  (~60 KB)
# │   ├── vendor-leaflet-[hash].js (~149 KB - lazy)
# │   ├── AdminPage-[hash].js      (~232 KB - lazy)
# │   └── ...
# ├── manifest.json
# ├── sw.js (service worker)
# └── robots.txt
```

### Deployment Platforms

#### Netlify (Recommended - Currently Used)

The project is configured for Netlify with:
- `_headers` file for security headers (CSP, X-Frame-Options, etc.)
- `_redirects` file for SPA routing
- Automatic HTTPS
- CDN distribution
- Continuous deployment from Git

**Build Settings:**
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**Environment Variables to Set:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_CLOUDINARY_CLOUD_NAME`
- `VITE_CLOUDINARY_UPLOAD_PRESET`
- `VITE_NOMINATIM_URL`

#### Vercel

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

#### Cloudflare Pages

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### Custom Server (VPS/Docker)

```bash
# Build the app
npm run build

# Serve dist/ folder with any static server
# Example with serve:
npx serve -s dist -l 3000

# Or with nginx:
# Copy dist/ to /var/www/html
# Configure nginx to serve index.html for all routes
```

### Post-Deployment Checklist

- [ ] Verify environment variables are set correctly
- [ ] Test Google OAuth login flow
- [ ] Verify Cloudinary image uploads work
- [ ] Test PWA installation on mobile devices
- [ ] Check service worker caching behavior
- [ ] Verify SEO meta tags and structured data
- [ ] Test offline mode functionality
- [ ] Verify Supabase RLS policies are working
- [ ] Check admin dashboard access
- [ ] Test email notifications (lead, review)
- [ ] Verify sitemap generation
- [ ] Test WhatsApp lead tracking
- [ ] Check performance metrics (Lighthouse)

### Monitoring & Analytics

**Recommended Tools:**
- **Sentry**: Error tracking and performance monitoring
- **Google Analytics**: User behavior and traffic analysis
- **Supabase Dashboard**: Database queries and API usage
- **Cloudinary Dashboard**: Image delivery and bandwidth
- **Lighthouse CI**: Automated performance testing

---

## 🏗 Architecture

### Application Flow

```
┌─────────────────────────────────────────────────────────────┐
│                         User Access                          │
│              (Browser / PWA / Mobile Device)                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    React Application                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   HomePage   │  │  Auth Pages  │  │ Profile Pages│      │
│  │  (Search &   │  │  (Google     │  │ (Client &    │      │
│  │   Filters)   │  │   OAuth)     │  │  Technician) │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Technician   │  │   Booking    │  │    Admin     │      │
│  │   Profile    │  │  Management  │  │  Dashboard   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Layer (src/lib/)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   api.ts     │  │   auth.ts    │  │ cloudinary.ts│      │
│  │ (1044 lines) │  │ (Session &   │  │ (Image CDN)  │      │
│  │              │  │  OAuth)      │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │ location.ts  │  │ supabase.ts  │                         │
│  │ (Geocoding)  │  │ (Client)     │                         │
│  └──────────────┘  └──────────────┘                         │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┬──────────────────┐
         ▼                               ▼                  ▼
┌──────────────────┐          ┌──────────────────┐  ┌──────────────┐
│    Supabase      │          │    Cloudinary    │  │  Nominatim   │
│  - PostgreSQL    │          │  - Image CDN     │  │  - Geocoding │
│  - Auth (JWT)    │          │  - Optimization  │  │  - Reverse   │
│  - RLS Policies  │          │  - Transforms    │  │    Lookup    │
│  - Edge Functions│          └──────────────────┘  └──────────────┘
│    * Lead Email  │
│    * Review Email│
│    * TikTok API  │
└──────────────────┘
```

### Database Schema (41 Migrations)

#### Core Tables
- **technicians** - Technician profiles with business info, location, status
- **technician_services** - Services offered with pricing and categories
- **service_variants** - Service variants (e.g., "3M Tint", "Full Wrap")
- **technician_photos** - Portfolio photos with captions and alt text
- **technician_videos** - TikTok/YouTube/Instagram videos with thumbnails
- **technician_payments** - Accepted payment methods
- **business_hours** - Weekly schedule with "Available on Request" option

#### User Tables
- **clients** - Client profiles with name, phone, email
- **leads** - Booking requests with status tracking and WhatsApp tracking
- **reviews** - Client reviews with admin approval workflow
- **notifications** - Notifications for technicians and clients

#### Content Tables
- **articles** - Blog articles with SEO metadata, FAQs, key takeaways
- **services** - Global service catalog

#### Key Features
- **Row Level Security (RLS)** - Database-level access control
- **Triggers** - Automatic rating calculation, client profile creation
- **Functions** - Cleanup old bookings, upsert client profiles
- **Indexes** - Optimized queries for technician search

### Data Flow

1. **User Action** → Component event handler (e.g., search, book, review)
2. **API Call** → `src/lib/api.ts` or `src/lib/auth.ts` with type-safe parameters
3. **Supabase** → Database query with Row Level Security (RLS) enforcement
4. **Response** → Update React state with TypeScript types
5. **Re-render** → UI updates with optimistic updates where appropriate

### State Management

- **Local State**: React useState for component-level state
- **Context**: ThemeContext for dark mode preference
- **Auth State**: Supabase auth state listener in Layout.tsx
- **Server State**: Direct Supabase queries (no Redux/Zustand needed)
- **Form State**: Controlled components with validation
- **Cache**: Service worker caches for offline support

### Routing Strategy

- **Lazy Loading**: All pages loaded on-demand with React.lazy
- **Code Splitting**: Automatic via Vite with manual chunks
  - vendor-react.js (~188 KB)
  - vendor-supabase.js (~166 KB)
  - vendor-router.js (~60 KB)
  - vendor-leaflet.js (~149 KB) - maps only
  - AdminPage.js (~232 KB) - admin only
- **Prefetching**: Service worker caches routes after first visit
- **Protected Routes**: Auth check in Layout component with redirects
- **SEO Routes**: Service location pages for SEO (/services/:service/:location)

---

## 🔒 Security

### Authentication & Authorization

- **Supabase Auth**: JWT-based authentication with automatic token refresh
- **Google OAuth**: Seamless sign-in with Google accounts
- **Row Level Security (RLS)**: Database-level access control for all tables
- **Role-Based Access**: Client, Technician, Admin roles with distinct permissions
- **Session Management**: Automatic token refresh with CORS error handling
- **Profile Completion**: Enforced onboarding for new users

### Data Protection

- **Input Sanitization**: DOMPurify for user-generated content (reviews, articles)
- **XSS Prevention**: Content Security Policy headers in production
- **SQL Injection**: Parameterized queries via Supabase client
- **CORS**: Configured in Supabase dashboard for allowed origins
- **Environment Variables**: Client-side vars prefixed with VITE_ only
- **Secrets Management**: Server-only secrets never exposed to client

### Privacy

- **WhatsApp Privacy**: Phone numbers only shared after booking confirmation
- **Email Privacy**: Not displayed publicly on profiles
- **Location Privacy**: Approximate location only (area, not exact address)
- **GDPR Compliance**: Data deletion on request via admin
- **Review Moderation**: Admin approval required before reviews go live
- **Soft Deletes**: Bookings hidden from client view after 2 days

### Security Headers

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://esm.sh; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://*.supabase.co https://res.cloudinary.com https://api.cloudinary.com https://nominatim.openstreetmap.org; frame-src 'self' https://www.youtube.com https://www.tiktok.com;
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(self), camera=(), microphone=()
```

### RLS Policies

- **Technicians**: Can view/update own profile, services, photos, videos
- **Clients**: Can view own bookings, submit reviews for completed jobs
- **Admins**: Full access to all tables with is_admin() function
- **Public**: Read-only access to live technicians, approved reviews, published articles

---

## 🧪 Testing

### Test Structure

```
AutoGearKe/
├── vitest.config.ts              # Test configuration
└── src/
    └── __tests__/                # Test files (to be created)
        ├── components/           # Component tests
        ├── lib/                  # API and utility tests
        └── pages/                # Page integration tests
```

### Running Tests

```bash
# Run all tests once
npm run test

# Watch mode for development
npm run test:watch

# UI mode with visual test runner
npm run test:ui

# Coverage report
npm run test -- --coverage
```

### Testing Strategy

#### Unit Tests
- Individual functions and components
- API calls with mocked Supabase client
- Auth flows with session management
- Utility functions (slugify, geocoding)

#### Property-Based Tests (Fast-check)
- Edge case discovery for search filters
- Service variant pricing validation
- Rating calculation accuracy
- Input validation (phone numbers, emails)

#### Integration Tests
- Complete user flows (sign up → profile → booking)
- Admin workflows (approve technician → approve review)
- WhatsApp lead tracking
- Review submission and approval

#### E2E Tests (Planned)
- Critical user journeys
- Payment flows
- Mobile PWA installation
- Offline functionality

### Test Coverage Goals

- **API Layer**: 80%+ coverage for critical paths
- **Auth**: 90%+ coverage for security-critical code
- **Components**: 70%+ coverage for reusable components
- **Pages**: 60%+ coverage for page-level logic

---

## 📊 Performance Optimizations

### Image Optimization

```typescript
// Automatic WebP/AVIF conversion with Cloudinary
import { profileThumb, cardCover, fullImage } from './lib/cloudinary';

// 120x120 face-cropped avatar (g_face, c_thumb)
const avatar = profileThumb(user.avatarUrl);

// 600x380 cover image for cards (c_fill)
const cover = cardCover(technician.coverPhoto);

// 1200x800 full-size image for detail pages
const full = fullImage(technician.profileImage);
```

### Code Splitting

- **Route-based**: Each page is a separate chunk loaded on-demand
- **Vendor splitting**: React, Supabase, Router in separate bundles
- **Dynamic imports**: Heavy components (maps, admin) loaded on-demand
- **Lazy components**: React.lazy for all page components

### Caching Strategy

#### Service Worker (Workbox)
- **Static Assets**: NetworkFirst strategy (7 days cache)
- **API Calls**: NetworkOnly (no caching for fresh data)
- **Images**: CacheFirst with Cloudinary CDN (30 days)
- **Fonts**: CacheFirst with Google Fonts (1 year)
- **Auth**: NetworkOnly (bypass service worker for CORS)

#### Browser Cache
- **Immutable Assets**: Long-term caching with content hashes
- **HTML**: No cache (always fresh)
- **Manifest**: No cache (PWA updates)

### Bundle Size

```
vendor-react.js      ~188 KB (React + React DOM)
vendor-supabase.js   ~166 KB (Supabase client)
vendor-router.js     ~60 KB  (React Router)
vendor-leaflet.js    ~149 KB (Leaflet maps - lazy loaded)
AdminPage.js         ~232 KB (Admin dashboard - lazy loaded)
index.js             ~60 KB  (App code)
```

### Performance Metrics

- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1
- **Lighthouse Score**: 90+ (Performance, Accessibility, Best Practices, SEO)

---

---

## 🐛 Troubleshooting

### Common Issues

#### CORS Errors with Supabase

**Symptom**: `Failed to fetch` or CORS errors in console

**Solution**:
1. Add your domain to Supabase **Authentication → URL Configuration**
2. Check that `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct
3. The app includes automatic CORS error detection and session refresh
4. Service worker bypasses auth requests to prevent CORS issues

#### PWA Not Installing

**Symptom**: Install prompt doesn't appear

**Solution**:
1. Ensure you're using HTTPS (required for PWA)
2. Check that `manifest.json` is accessible
3. Verify service worker is registered (check DevTools → Application)
4. Clear browser cache and reload
5. Check that user hasn't dismissed the prompt (stored in localStorage)

#### Images Not Loading

**Symptom**: Broken images or slow loading

**Solution**:
1. Verify `VITE_CLOUDINARY_CLOUD_NAME` is correct
2. Check Cloudinary upload preset is set to "Unsigned"
3. Ensure images are in the correct folder (`mekh/`)
4. Check browser console for 404 errors
5. Verify Cloudinary CDN is not blocked by firewall

#### Google OAuth Not Working

**Symptom**: OAuth redirect fails or shows error

**Solution**:
1. Verify redirect URI in Google Cloud Console matches Supabase callback URL
2. Check that Google OAuth is enabled in Supabase **Authentication → Providers**
3. Ensure Client ID and Secret are correct
4. Add your domain to authorized origins in Google Cloud Console
5. Clear browser cookies and try again

#### Database RLS Errors

**Symptom**: `new row violates row-level security policy` or 401 errors

**Solution**:
1. Verify user is authenticated (check `supabase.auth.getSession()`)
2. Check RLS policies in Supabase dashboard
3. Ensure `is_admin()` function exists for admin access
4. Verify user role in `auth.users` metadata
5. Check that triggers are enabled (e.g., client profile creation)

#### Service Worker Caching Issues

**Symptom**: Old content showing after deployment

**Solution**:
1. Update service worker version in `vite.config.ts`
2. Clear browser cache and service worker
3. Use "Update on reload" in DevTools → Application → Service Workers
4. Check that `skipWaiting` is enabled in Workbox config
5. Verify cache names are unique per version

### Development Issues

#### Hot Module Replacement Not Working

```bash
# Clear Vite cache
npm run clean

# Restart dev server
npm run dev
```

#### TypeScript Errors

```bash
# Regenerate TypeScript build info
rm tsconfig.tsbuildinfo

# Restart TypeScript server in VS Code
# Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"
```

#### Build Failures

```bash
# Clean and rebuild
npm run clean:build

# Check for missing dependencies
npm install

# Verify Node version (18+ required)
node --version
```

### Getting Help

- **GitHub Issues**: Report bugs and feature requests
- **Supabase Discord**: Database and auth questions
- **Stack Overflow**: Tag questions with `react`, `vite`, `supabase`
- **Documentation**: Check official docs for React, Vite, Supabase

---

## 🤝 Contributing

### Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/mekh.git`
3. Create a feature branch: `git checkout -b feature/your-feature-name`
4. Install dependencies: `npm install`
5. Set up `.env` file with your credentials
6. Start dev server: `npm run dev`
7. Make your changes
8. Write/update tests: `npm run test`
9. Build and verify: `npm run build && npm run preview`
10. Submit a pull request

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: Add new feature
fix: Bug fix
docs: Documentation update
style: Code style changes (formatting, semicolons)
refactor: Code refactoring without behavior change
test: Test updates
chore: Build/config changes
perf: Performance improvements
```

**Examples:**
```bash
git commit -m "feat: add service variant search"
git commit -m "fix: resolve CORS error in auth flow"
git commit -m "docs: update README with deployment guide"
```

### Pull Request Process

1. **Update Documentation**: Update README if needed
2. **Add Tests**: Write tests for new features
3. **Ensure Tests Pass**: Run `npm run test` and fix failures
4. **Check TypeScript**: Run `npm run build` and fix errors
5. **Update CHANGELOG**: Add entry to CHANGELOG.md (if exists)
6. **Request Review**: Tag maintainers for review
7. **Address Feedback**: Make requested changes
8. **Squash Commits**: Clean up commit history before merge

### Code Style Guidelines

- **TypeScript**: Use strict mode, define interfaces for all data
- **React**: Functional components with hooks (no class components)
- **Styling**: Tailwind CSS utility classes (avoid custom CSS)
- **Naming**: 
  - camelCase for variables and functions
  - PascalCase for components and types
  - UPPER_CASE for constants
- **Files**: One component per file, co-locate related files
- **Imports**: Group imports (React, libraries, local)
- **Comments**: Use JSDoc for functions, inline comments for complex logic

### Testing Guidelines

- Write unit tests for new utility functions
- Write property-based tests for edge cases
- Write integration tests for API calls
- Aim for 70%+ code coverage
- Mock external dependencies (Supabase, Cloudinary)

---

---

## 🎯 Key Technical Highlights

### Advanced Search & Filtering
- **Service Variant Search**: Search for specific variants like "3M Tint" or "Ceramic Tint"
- **Category Fallback**: If exact matches < 4, show related services from same category
- **Location-Based**: Find technicians in specific areas with fallback to nearby areas
- **Smart Filtering**: Client-side filtering for exact service and variant matching

### Real-Time Features
- **WhatsApp Lead Tracking**: Automatic lead creation when WhatsApp button clicked
- **Live Notifications**: Real-time notifications for technicians and clients
- **Status Updates**: Real-time lead status updates (pending → job_done → review)
- **Rating Calculation**: Automatic rating updates via database triggers

### Admin Workflow
- **Review Moderation**: Three-state workflow (pending → approved/declined)
- **Technician Approval**: Three-state workflow (pending → live/suspended)
- **Lead Confirmation**: Admin must confirm job completion before review request
- **Content Management**: Rich text editor for blog articles with SEO enhancements

### PWA Features
- **Install Prompt**: Custom install banner for mobile devices
- **Offline Support**: Graceful offline handling with retry mechanism
- **Update Notifications**: User-friendly PWA update prompts
- **Orientation Lock**: Portrait mode lock in standalone mode
- **Shortcuts**: Quick actions in PWA manifest (Book, Find, Bookings)

### SEO Optimization
- **Dynamic Sitemap**: Cloudflare Worker generates sitemap from Supabase
- **Structured Data**: JSON-LD for articles, technicians, reviews
- **Meta Tags**: Dynamic meta tags with React Helmet Async
- **Internal Links**: Article cross-linking for SEO
- **AI Bot Friendly**: Allows GPTBot, Claude, Perplexity, Gemini crawling

### Image Optimization
- **Cloudinary CDN**: Global image delivery with automatic format selection
- **Responsive Images**: Multiple sizes for different viewports
- **Face Detection**: Automatic face-cropped avatars (g_face, c_thumb)
- **Lazy Loading**: Images loaded on-demand with intersection observer
- **WebP/AVIF**: Automatic format conversion for modern browsers

### Security Features
- **Row Level Security**: Database-level access control for all tables
- **CORS Handling**: Automatic CORS error detection and session refresh
- **CSP Headers**: Content Security Policy for XSS protection
- **Input Sanitization**: DOMPurify for user-generated content
- **Soft Deletes**: Bookings hidden from client view after 2 days

### Developer Experience
- **TypeScript**: Full type safety with strict mode
- **Hot Module Replacement**: Instant dev updates with Vite
- **Bundle Analysis**: Rollup visualizer for bundle size optimization
- **Property-Based Testing**: Fast-check for edge case discovery
- **Migration System**: 41 database migrations with version control

---

## 📝 Recent Updates

### January 2026
- ✅ Enhanced search to include service variants (e.g., "3M Tint", "Full Wrap")
- ✅ Added offline mode with user-friendly fallback UI
- ✅ Updated robots.txt to allow AI bot crawling (GPTBot, Claude, Perplexity, Gemini)
- ✅ Fixed TypeScript errors in HomePage and App.tsx
- ✅ Improved error boundary for offline detection and chunk loading errors
- ✅ Added automatic booking cleanup (2-day soft delete)
- ✅ Implemented review approval workflow with admin moderation
- ✅ Added business hours with "Available on Request" for Sundays
- ✅ Enhanced article management with FAQs, key takeaways, and definitions

### December 2025
- ✅ Migrated from PHP/MySQL to Supabase (PostgreSQL)
- ✅ Implemented PWA with service worker and offline support
- ✅ Added Cloudinary image optimization with responsive transforms
- ✅ Enhanced SEO with structured data and dynamic sitemap
- ✅ Added dark mode support with system preference detection
- ✅ Implemented Google OAuth for seamless sign-in
- ✅ Added service categories (Body & Exterior, Electricals, Mechanical, Interior)
- ✅ Implemented WhatsApp lead tracking
- ✅ Added TikTok video thumbnail fetching via Edge Function

### November 2025
- ✅ Initial React + TypeScript migration
- ✅ Set up Vite build system
- ✅ Implemented Tailwind CSS styling
- ✅ Created component library
- ✅ Set up Supabase authentication

---

## 📞 Support & Contact

- **Website**: [https://mekh.app](https://mekh.app)
- **Location**: Nairobi, Kenya
- **Email**: Available on website contact page
- **WhatsApp**: Contact via platform

---

## 📜 License

**Proprietary** - All rights reserved © 2026 Mekh

This software and associated documentation files are proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

---

## 🙏 Acknowledgments

- **Supabase** - Backend infrastructure and authentication
- **Cloudinary** - Image optimization and CDN
- **Tailwind CSS** - Utility-first CSS framework
- **React Team** - Frontend framework
- **Vite Team** - Build tooling and dev server
- **Vitest Team** - Testing framework
- **OpenStreetMap** - Geocoding services via Nominatim
- **Fast-check** - Property-based testing library

---

## 🗺️ Roadmap

### Q1 2026
- [ ] Mobile app (React Native)
- [ ] Push notifications for leads and reviews
- [ ] In-app messaging between clients and technicians
- [ ] Payment integration (M-Pesa, card payments)
- [ ] Advanced analytics dashboard for technicians

### Q2 2026
- [ ] Multi-language support (Swahili, English)
- [ ] Video consultations
- [ ] Service packages and bundles
- [ ] Loyalty program for repeat clients
- [ ] Technician certification badges

### Q3 2026
- [ ] Franchise management system
- [ ] API for third-party integrations
- [ ] Mobile app for technicians
- [ ] Advanced search filters (price range, availability)
- [ ] Service booking calendar

### Future
- [ ] AI-powered service recommendations
- [ ] Augmented reality for car visualization
- [ ] Blockchain-based review verification
- [ ] Integration with car dealerships
- [ ] Expansion to other East African countries

---

<div align="center">

**Built with ❤️ in Nairobi, Kenya**

*Connecting car owners with professional automotive technicians*

[Website](https://mekh.app) • [Blog](https://mekh.app/blogs) • [Contact](https://mekh.app/contact)

</div>
