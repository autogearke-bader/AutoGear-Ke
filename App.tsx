import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

// Lazy load heavy pages for better initial load performance
const HomePage = lazy(() => import('@/src/page/HomePage.tsx'));
const AuthPage = lazy(() => import('./pages/AuthPage.tsx'));
const JoinPage = lazy(() => import('./pages/JoinPage.tsx'));
const AdminPage = lazy(() => import('./pages/AdminPage.tsx'));
const BlogPage = lazy(() => import('./pages/BlogPage.tsx'));
const ArticleDetailPage = lazy(() => import('./pages/ArticleDetailPage.tsx'));
const TechnicianProfilePage = lazy(() => import('./pages/TechnicianProfilePage.tsx'));
const TechnicianDashboardPage = lazy(() => import('./pages/TechnicianDashboardPage.tsx'));
const ClientProfilePage = lazy(() => import('./pages/ClientProfilePage.tsx'));
const ClientOnboardingPage = lazy(() => import('./pages/ClientOnboardingPage.tsx'));
const BookingsPage = lazy(() => import('./pages/BookingsPage.tsx'));
const ContactPage = lazy(() => import('./pages/ContactPage.tsx'));
const TermsPage = lazy(() => import('./pages/TermsPage.tsx'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage.tsx'));
const AboutPage = lazy(() => import('./pages/AboutPage.tsx'));
const MenuPage = lazy(() => import('./pages/MenuPage.tsx'));
const GuestMenuPage = lazy(() => import('./pages/GuestMenuPage.tsx'));
const TechnicianMenuPage = lazy(() => import('./pages/TechnicianMenuPage.tsx'));
const ServiceLocationPage = lazy(() => import('./pages/ServiceLocationPage.tsx'));
const AuthCallback = lazy(() => import('./pages/AuthCallback.tsx'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.tsx'));

import Layout from './components/Layout.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import { UpdatePrompt } from './src/components/UpdatePrompt';
import { getCurrentUser, isClientProfileComplete, isTechnicianProfileComplete } from './src/lib/auth';
import { isClientOnboardingComplete } from './src/lib/api';
import { supabase } from './src/lib/supabase.ts';

const App: React.FC = () => {
  return (
    <HelmetProvider>
      <ErrorBoundary>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </ErrorBoundary>
    </HelmetProvider>
  );
};

const AppContent: React.FC = () => {
  const [checkingProfile, setCheckingProfile] = useState(true);
  const navigate = useNavigate();

  // ── PWA state (must be declared before any useEffect or JSX that references them) ──
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  // handleInstall declared as a const so JSX can reference it
  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setShowInstallBanner(false);
    }
    setInstallPrompt(null);
  };

  // ── PWA: capture install prompt ──
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      // Don't show again if user already dismissed it
      if (localStorage.getItem('pwaInstallDismissed')) return;
      setInstallPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // ── PWA: lock orientation to portrait (standalone mode only) ──
  useEffect(() => {
    const lockOrientation = async () => {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        try {
          // Cast to any — .lock() is a real browser API but not in TS's default lib types
          await (window.screen.orientation as any).lock('portrait');
        } catch (err) {
          console.warn('Orientation lock not supported:', err);
        }
      }
    };
    lockOrientation();
  }, []);

  // ── Auth: check profile completion after sign-in ──
  useEffect(() => {
    const checkProfileCompletion = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          setCheckingProfile(false);
          return;
        }

        // Check for pending user type from localStorage (set during registration)
        const pendingUserType = localStorage.getItem('pendingUserType') as 'client' | 'technician' | null;

        // If there's a pending user type for technician, redirect to JoinPage
        if (pendingUserType === 'technician') {
          localStorage.removeItem('pendingUserType');
          setCheckingProfile(false);
          navigate('/join');
          return;
        }

        // Check user metadata to determine type
        const userRole = user.user_metadata?.role;

        // Skip profile completion for admins — they don't need to complete a profile
        if (userRole === 'admin') {
          setCheckingProfile(false);
          return;
        }

        if (userRole === 'technician') {
          // Check if technician profile is complete
          try {
            const isComplete = await isTechnicianProfileComplete();
            if (!isComplete) {
              navigate('/join');
              return;
            } else {
              // Store redirect in localStorage for Layout to handle
              localStorage.setItem('redirectToTechnician', 'true');
            }
          } catch (techError) {
            // Profile might not exist yet — redirect to JoinPage
            navigate('/join');
            return;
          }
        } else {
          // For clients (including Google users without explicit role)
          // Check if onboarding is complete — redirect if not
          try {
            const onboardingComplete = await isClientOnboardingComplete();
            if (!onboardingComplete) {
              navigate('/onboarding');
              return;
            }
          } catch (onboardingError) {
            // If we can't determine, redirect to onboarding
            navigate('/onboarding');
            return;
          }
        }
      } catch (error) {
        // Auth error — could be CSP blocking or network issues
        console.warn('Error checking profile:', error);
      } finally {
        setCheckingProfile(false);
      }
    };

    // ✅ REMOVED: onAuthStateChange from here — Layout.tsx handles it
    // ✅ REMOVED: triggerProfileCompletion event listener — causes duplicate navigation
    // Only run once on mount — Layout.tsx handles ongoing auth state
    checkProfileCompletion();
  }, []); // ← empty deps, no navigate dependency needed

  // Show a loading skeleton until auth check completes (prevents blank screen on slow connections)
  if (checkingProfile) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500" />
      </div>
    );
  }

  return (
    <Layout>
      <Suspense
        fallback={
          <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500" />
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/technicians" element={<Navigate to="/" replace />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/join" element={<JoinPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/technician/:slug" element={<TechnicianProfilePage />} />
          <Route path="/technician-dashboard" element={<TechnicianDashboardPage />} />
          <Route path="/client-dashboard" element={<Navigate to="/" replace />} />
          <Route path="/profile" element={<ClientProfilePage />} />
          <Route path="/onboarding" element={<ClientOnboardingPage />} />
          <Route path="/bookings" element={<BookingsPage />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/guest-menu" element={<GuestMenuPage />} />
          <Route path="/technician-menu" element={<TechnicianMenuPage />} />
           <Route path="/ag-internal-2026" element={<AdminPage />} />
          <Route path="/technicianprofile" element={<TechnicianProfilePage />} />
          <Route path="/blogs" element={<BlogPage />} />
          <Route path="/blogs/:slug" element={<ArticleDetailPage />} />
          <Route path="/services/:service/:location" element={<ServiceLocationPage />} />
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>

      {/* PWA Install Banner - Only show on mobile devices */}
      {showInstallBanner && (
        <div className="fixed bottom-20 left-4 right-4 bg-slate-900 border border-blue-600 rounded-2xl p-4 flex items-center gap-3 z-50 shadow-xl md:hidden">
          <img src="/assets/180.png" className="w-10 h-10 rounded-xl" alt="Mekh" />
          <div className="flex-1">
            <p className="text-blue-500 font-bold text-sm">Install Mekh</p>
            <p className="text-slate-400 text-xs">Add to your home screen for quick access</p>
          </div>
          <button
            onClick={handleInstall}
            className="bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-full"
          >
            Install
          </button>
          <button
            onClick={() => {
              localStorage.setItem('pwaInstallDismissed', 'true');
              setShowInstallBanner(false);
            }}
            className="text-slate-500 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      <UpdatePrompt />
    </Layout>
  );
};

export default App;