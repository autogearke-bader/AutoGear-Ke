import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BUSINESS_NAME } from '../constants.ts';
import { signOut, getSession, triggerProfileCompletion } from '../src/lib/auth';
import { getMyClientLeads, getMyNotifications } from '../src/lib/api';
import { supabase } from '../src/lib/supabase';
import { Technician } from '../types';
import { profileThumb } from '../src/lib/cloudinary';

interface HeaderProps {
  isTechnician?: boolean;
  technician?: Technician | null;
  // Auth state passed from Layout — prevents duplicate getSession calls
  session?: any;
  userRole?: string | null;
}

const Header: React.FC<HeaderProps> = ({
  isTechnician = false,
  technician = null,
  session: sessionProp = null,
  userRole: userRoleProp = null,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const menuRef  = useRef<HTMLDivElement>(null);

  // Use props as source of truth — no local auth fetching
  const session  = sessionProp;
  const userRole = userRoleProp;

  const [menuOpen,     setMenuOpen]     = useState(false);
  const [bookingCount, setBookingCount] = useState(0);
  const [unreadCount,  setUnreadCount]  = useState(0);

  const isClient  = !!session && userRole === 'client';
  const isTechUser = isTechnician && !!technician;

  // Fetch booking count for clients — only data fetch Header owns
  useEffect(() => {
    let mounted = true;

    const fetchBookingCount = async () => {
      if (session && userRole === 'client') {
        try {
          const leads = await getMyClientLeads(session.user.id);
          if (!mounted) return;
          setBookingCount(leads?.length || 0);
        } catch (_) { /* silent */ }
      } else {
        setBookingCount(0);
      }
    };

    fetchBookingCount();

    return () => { mounted = false; };
  }, [session, userRole]); // Re-run only when session/role actually changes

  // Fetch unread notification count for technicians
  useEffect(() => {
    let mounted = true;

    const fetchUnreadCount = async () => {
      if (!isTechUser) {
        setUnreadCount(0);
        return;
      }
      try {
        const notifications = await getMyNotifications();
        if (!mounted) return;
        const unread = notifications.filter((n: any) => !n.is_read).length;
        setUnreadCount(unread);
      } catch (_) { /* silent */ }
    };

    // Initial fetch
    fetchUnreadCount();

    // ✅ NEW: Real-time subscription — badge updates instantly when a notification arrives
    let realtimeSubscription: any = null;

    if (isTechUser && technician) {
      realtimeSubscription = supabase
        .channel(`technician-notifications-${technician.id}`)
        .on(
          'postgres_changes',
          {
            event: '*', // INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'notifications',
            filter: `technician_id=eq.${technician.id}`,
          },
          () => {
            // Re-fetch count whenever any notification changes
            if (mounted) fetchUnreadCount();
          }
        )
        .subscribe();
    }

    return () => {
      mounted = false;
      if (realtimeSubscription) {
        supabase.removeChannel(realtimeSubscription);
      }
    };
  }, [isTechUser, technician]); // ← same deps as before

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle "Become a Technician" click
  const handleBecomeTechnician = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!session) {
      navigate('/auth', { state: { redirectMessage: 'Sign in to become a technician' } });
    } else {
      triggerProfileCompletion('technician');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setMenuOpen(false);
    navigate('/');
  };

  const navLink = (active: boolean) =>
    `hidden sm:block whitespace-nowrap text-[10px] sm:text-[11px] md:text-[12px] font-black uppercase tracking-widest transition-all active:scale-95 hover:underline decoration-2 underline-offset-4 ${
      active ? 'text-blue-200' : 'text-white hover:text-blue-100'
    }`;

  // Debug logging for troubleshooting nav visibility issues


  return (
    <header className="border-b border-primary-700 sticky top-0 bg-primary-600 backdrop-blur-md z-50">
      <div className="max-w-7xl mx-auto px-0 py-0 md:py-0.5 flex items-center justify-between">

        {/* ── Logo ──────────────────────────────────────── */}
        {(!isTechnician || technician) && (
          <Link to="/" className="text-xl font-black tracking-tighter text-white flex items-center group">
            <div className="relative mr-0 md:mr-4 logo-glow flex items-center justify-center">
              <img
                src="/assets/mekh.png"
                alt= "Mekh Logo"
                className="h-7 md:h-12 w-auto object-contain transform group-hover:rotate-12 transition-transform duration-500 ease-in-out"
                decoding="async"
                fetchPriority="high"
                onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          </Link>
        )}

        {isTechUser && <div className="flex-1" />}

        {/* ── Right side ────────────────────────────────── */}
        <div className="flex-shrink-0 flex items-center space-x-2 lg:space-x-4">

          {/* ═══ TECHNICIAN HEADER ════════════════════════ */}
          {isTechUser ? (
            <>
              <Link
                to="/technician-dashboard"
                className={navLink(location.pathname === '/technician-dashboard')}
              >
                Dashboard
              </Link>
              <Link
                to="/blogs"
                className={navLink(location.pathname.startsWith('/blogs'))}
              >
                Insights
              </Link>
              {/* Notification bell */}
              <Link to="/technician-dashboard?tab=notifications" className="relative">
                <div className="w-9 h-9 hover:bg-slate-700 rounded-xl flex items-center justify-center transition-all">
                  <svg className="w-4 h-4 text-[#ffff]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 leading-none">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </div>
              </Link>
              <div className="relative" ref={menuRef}>
                <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2">
                  <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-white flex items-center justify-center text-primary-600 font-bold text-sm overflow-hidden">
                    {technician?.profile_image ? (
                      <img src={profileThumb(technician.profile_image)} alt="Profile" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      `${technician?.first_name?.charAt(0) || 'T'}${technician?.last_name?.charAt(0) || ''}`
                    )}
                  </div>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-50">
                    <div className="px-4 py-2 border-b border-gray-200">
                      <p className="text-sm text-gray-900 font-bold truncate">{technician?.business_name || 'Technician'}</p>
                    </div>
                    <Link to="/technician-dashboard?tab=profile" onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-200 transition-colors">
                      Edit Profile
                    </Link>
                    <button onClick={handleSignOut}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-gray-50 transition-colors">
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>

          ) : (

            /* ═══ CLIENT / GUEST HEADER ═══════════════════ */
            <>
              {isClient && (
                <>
                  <Link to="/" className={navLink(location.pathname === '/')}>Home</Link>
                  <Link to="/bookings" className={navLink(location.pathname === '/bookings')}>
                    My Bookings
                    {bookingCount > 0 && (
                      <span className="ml-1 text-white">({bookingCount})</span>
                    )}
                  </Link>
                  <button onClick={handleBecomeTechnician} className={navLink(location.pathname === '/join')}>
                    Become a Technician
                  </button>
                </>
              )}

              {!session && (
                <>
                  <Link to="/" className="hidden md:block whitespace-nowrap text-[10px] sm:text-[11px] md:text-[12px] font-black uppercase tracking-widest transition-all active:scale-95 hover:underline decoration-2 underline-offset-4 text-white hover:text-blue-100">
                    Home
                  </Link>
                  <Link to="/blogs" className={navLink(location.pathname.startsWith('/blogs'))}>
                    Insights
                  </Link>
                  <button onClick={handleBecomeTechnician} className="hidden sm:block whitespace-nowrap text-[10px] sm:text-[11px] md:text-[12px] font-black uppercase tracking-widest text-white hover:text-blue-100 transition-all active:scale-95 hover:underline decoration-2 underline-offset-4">
                    Become a Technician
                  </button>
                </>
              )}

              {session ? (
                <div className="relative" ref={menuRef}>
                  <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2">
                    <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-white flex items-center justify-center text-primary-600 font-bold text-sm select-none">
                      {session.user?.user_metadata?.name
                        ? session.user.user_metadata.name.charAt(0).toUpperCase()
                        : 'C'}
                    </div>
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-50">
                      <Link to="/profile" onClick={() => setMenuOpen(false)}
                        className="block px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-200 transition-colors">
                        Edit Profile
                      </Link>
                      <button onClick={handleSignOut}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-blue-200 transition-colors">
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/auth"
                  className="whitespace-nowrap text-[9px] md:text-[10px] font-black uppercase tracking-widest text-white hover:text-white transition-all bg-primary-600 hover:bg-primary-700 px-3 py-2.5 md:px-5 md:py-3 rounded-xl border border-primary-600 shadow-lg active:scale-95"
                >
                  Log In
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;