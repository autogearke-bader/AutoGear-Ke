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

import Layout from './components/Layout.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import { getCurrentUser, isClientProfileComplete, isTechnicianProfileComplete } from './src/lib/auth';
import { isClientOnboardingComplete } from './src/lib/api';
import { supabase } from './src/lib/supabase.ts';

const App: React.FC = () => {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
      </BrowserRouter>
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
              setCheckingProfile(false);
              navigate('/join');
              return;
            } else {
              // Store redirect in localStorage for Layout to handle
              localStorage.setItem('redirectToTechnician', 'true');
            }
          } catch (techError) {
            // Profile might not exist yet — redirect to JoinPage
            setCheckingProfile(false);
            navigate('/join');
            return;
          }
        } else {
          // For clients (including Google users without explicit role)
          // Check if onboarding is complete — redirect if not
          try {
            const onboardingComplete = await isClientOnboardingComplete();
            if (!onboardingComplete) {
              setCheckingProfile(false);
              navigate('/onboarding');
              return;
            }
          } catch (onboardingError) {
            // If we can't determine, redirect to onboarding
            setCheckingProfile(false);
            navigate('/onboarding');
            return;
          }
          setCheckingProfile(false);
        }
      } catch (error) {
        // Auth error — could be CSP blocking or network issues
        console.warn('Error checking profile:', error);
      } finally {
        setCheckingProfile(false);
      }
    };

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Delay slightly to allow for profile creation
        setTimeout(checkProfileCompletion, 1000);

        // Check if there's a pending user type to redirect to JoinPage
        const pendingUserType = localStorage.getItem('pendingUserType') as 'client' | 'technician' | null;
        if (pendingUserType === 'technician') {
          localStorage.removeItem('pendingUserType');
          navigate('/join');
        }
      }
    });

    // Listen for manual profile completion trigger events
    const handleProfileCompletionTrigger = (event: Event) => {
      const customEvent = event as CustomEvent<{ userType: 'client' | 'technician' }>;
      const { userType } = customEvent.detail;
      if (userType === 'technician') {
        navigate('/join');
      }
    };
    window.addEventListener('triggerProfileCompletion', handleProfileCompletionTrigger);

    // Initial check
    checkProfileCompletion();

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('triggerProfileCompletion', handleProfileCompletionTrigger);
    };
  }, [navigate]);

  // Don't render anything until we've checked the profile
  if (checkingProfile) {
    return null;
  }

  return (
    <Layout>
      <Suspense
        fallback={
          <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500" />
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<HomePage />} />
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
          <Route path="/admin-portal" element={<AdminPage />} />
          <Route path="/technicianprofile" element={<TechnicianProfilePage />} />
          <Route path="/blogs" element={<BlogPage />} />
          <Route path="/blogs/:slug" element={<ArticleDetailPage />} />
          <Route path="/:service/:location" element={<ServiceLocationPage />} />
        </Routes>
      </Suspense>

      {/* PWA Install Banner */}
      {showInstallBanner && (
        <div className="fixed bottom-20 left-4 right-4 bg-slate-900 border border-blue-600 rounded-2xl p-4 flex items-center gap-3 z-50 shadow-xl">
          <img src="/assets/180.png" className="w-10 h-10 rounded-xl" alt="AutoGear Ke" />
          <div className="flex-1">
            <p className="text-white font-bold text-sm">Install AutoGear Ke</p>
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
    </Layout>
  );
};

export default App;