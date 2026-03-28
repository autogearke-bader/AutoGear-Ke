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

  useEffect(() => {
    // Check if user has completed their profile after OAuth sign-in
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
        
        // Skip profile completion for admins - they don't need to complete a profile
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
            // Profile might not exist yet - redirect to JoinPage
            setCheckingProfile(false);
            navigate('/join');
            return;
          }
        } else {
          // For clients (including Google users without explicit role)
          // Check if onboarding is complete - redirect if not
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
        // Auth error - could be CSP blocking or network issues
        console.warn('Error checking profile:', error);
      } finally {
        setCheckingProfile(false);
      }
    };

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
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
      <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500"></div></div>}>
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
    </Layout>
  );
};

export default App;
