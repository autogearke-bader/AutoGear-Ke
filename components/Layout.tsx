import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from './Header.tsx';
import Footer from './Footer.tsx';
import ClientBottomNav from './ClientBottomNav.tsx';
import GuestBottomNav from './GuestBottomNav.tsx';
import TechnicianBottomNav from './TechnicianBottomNav.tsx';
import TechnicianSidebar from './TechnicianSidebar.tsx';
import { supabase } from '../src/lib/supabase';
import { getMyTechnicianProfile } from '../src/lib/auth';
import { Technician } from '../types';

declare global {
  interface Navigator {
    standalone?: boolean;
  }
}

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session,      setSession]      = useState<any>(null);
  const [userRole,     setUserRole]     = useState<string | null>(null);
  const [isLoggedIn,   setIsLoggedIn]   = useState<boolean | null>(null);
  const [isTechnician, setIsTechnician] = useState(false);
  const [technician,   setTechnician]   = useState<Technician | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [isPWA,        setIsPWA]        = useState(false);
  const [isClient,     setIsClient]     = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const fetchingProfile = useRef(false);
  const mounted         = useRef(true);

  const checkClient = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsClient(false);
        return;
      }

      const { data: clientProfile } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      setIsClient(!!clientProfile);
    } catch (error) {
      console.error('Layout: Error checking client status:', error);
      setIsClient(false);
    }
  };

  useEffect(() => {
    const checkPWA = () => {
      const isStandalone    = window.matchMedia('(display-mode: standalone)').matches;
      const isTab           = window.matchMedia('(display-mode: tabbed)').matches;
      const isIOSStandalone = (window.navigator as Navigator).standalone === true;
      setIsPWA(isStandalone || isTab || isIOSStandalone);
    };
    checkPWA();
    window.matchMedia('(display-mode: standalone)').addEventListener('change', checkPWA);
  }, []);

  const isTechnicianRoute = location.pathname === '/technician-dashboard' ||
                            location.pathname === '/technician-menu';
  const isMenuPage        = location.pathname === '/menu' ||
                            location.pathname === '/guest-menu';

  const resolveTechnicianProfile = async (role?: string | null, userId?: string) => {
    if (fetchingProfile.current) return;
    fetchingProfile.current = true;
    try {
      const technicianProfile = await getMyTechnicianProfile();
      if (!mounted.current) return;

      if (technicianProfile || role === 'technician') {
        setIsTechnician(true);
        setTechnician(technicianProfile);
        const redirectFlag = localStorage.getItem('redirectToTechnician');
        if (redirectFlag === 'true') {
          localStorage.removeItem('redirectToTechnician');
          navigate('/technician-dashboard?tab=profile');
        }
      } else {
        setIsTechnician(false);
        setTechnician(null);
      }
    } catch (error) {
      console.error('Layout: Error fetching technician profile:', error);
      setIsTechnician(false);
      setTechnician(null);
    } finally {
      fetchingProfile.current = false;
    }
  };

  useEffect(() => {
    mounted.current = true;

    const checkAuth = async () => {
      try {
        // Single getSession call — passed down to Header via props
        const { data: { session: s } } = await supabase.auth.getSession();
        if (!mounted.current) return;

        setSession(s);
        setIsLoggedIn(!!s);

        if (s) {
          // Get role from user_metadata
          let role = s.user.user_metadata?.role ?? null;
          
          // Fallback: If no role in metadata, check if client record exists in database
          if (!role) {
            try {
              const { data: clientProfile } = await supabase
                .from('clients')
                .select('id')
                .eq('user_id', s.user.id)
                .maybeSingle();
              
              if (clientProfile) {
                role = 'client';
              }
             } catch (dbError) {
               // Could not check client table
             }
           }

          setUserRole(role);
          setIsClient(role === 'client');
          await resolveTechnicianProfile(role, s.user.id);
        }
      } catch (error) {
        console.error('Layout: Auth check error:', error);
      } finally {
        if (mounted.current) setLoading(false);
      }
    };

    checkAuth();

    // Listener uses session from event — never calls getSession() again
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        if (!mounted.current) return;

        // Token refresh: update session silently, no profile re-fetch
        if (event === 'TOKEN_REFRESHED') {
          setSession(s);
          setIsLoggedIn(!!s);
          return;
        }

        // ✅ NEW: Ignore INITIAL_SESSION — checkAuth() above already ran on mount
        if (event === 'INITIAL_SESSION') {
          return;
        }

        setSession(s);
        setIsLoggedIn(!!s);

        if (s) {
          // Get role from user_metadata with fallback to database
          let role = s.user.user_metadata?.role ?? null;
          
          // Fallback: If no role in metadata, check if client record exists
          if (!role) {
            try {
              const { data: clientProfile } = await supabase
                .from('clients')
                .select('id')
                .eq('user_id', s.user.id)
                .maybeSingle();
              
              if (clientProfile) {
                role = 'client';
              }
            } catch (dbError) {
              // Silent fail - role remains null
            }
           }

          setUserRole(role);
          setIsClient(role === 'client');
          
          // ✅ Only fetch technician profile on genuine sign-in, not on every event
          if (event === 'SIGNED_IN') {
            await resolveTechnicianProfile(role, s.user.id);
          }
        } else {
          setUserRole(null);
          setIsClient(false);
          setIsTechnician(false);
          setTechnician(null);
        }
      }
    );

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleProfileComplete = () => checkClient();
    window.addEventListener('client-profile-complete', handleProfileComplete);
    return () => window.removeEventListener('client-profile-complete', handleProfileComplete);
  }, []);

  const showTechnicianSidebar =
    isTechnicianRoute &&
    !loading &&
    isTechnician &&
    !isPWA &&
    window.matchMedia('(min-width: 640px)').matches;

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc] text-slate-900 relative">

      {/* Header gets auth state as props — no duplicate auth calls */}
      <Header
        isTechnician={isTechnician}
        technician={technician}
        session={session}
        userRole={userRole}
      />

      {showTechnicianSidebar && (
        <div className="flex">
          <TechnicianSidebar technician={technician} />
          <main className="flex-1 lg:ml-16 min-h-screen pb-20 md:pb-0">
            {children}
          </main>
        </div>
      )}

      {!showTechnicianSidebar && (
        <main className="grow w-full max-w-7xl mx-auto pb-20 lg:pb-0">
          {children}
        </main>
      )}

      {isMenuPage ? null : (
        <div className="sm:hidden">
          {isTechnician && !loading && <TechnicianBottomNav />}
          {!isTechnician && !loading && (
            isLoggedIn ? <ClientBottomNav isClient={isClient} /> : <GuestBottomNav />
          )}
        </div>
      )}

      {!isTechnicianRoute && !showTechnicianSidebar && <Footer />}
    </div>
  );
};

export default Layout;