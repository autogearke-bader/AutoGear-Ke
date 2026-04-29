import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BUSINESS_NAME } from '../constants.ts';
import { signOut, getSession, triggerProfileCompletion } from '../src/lib/auth';
import { getMyClientLeads } from '../src/lib/api';
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
      active ? 'text-blue-500' : 'text-slate-400 hover:text-white'
    }`;

  const isClient  = !!session && userRole === 'client';
  const isTechUser = isTechnician && !!technician;

  // Debug logging for troubleshooting nav visibility issues


  return (
    <header className="border-b border-slate-800 sticky top-0 bg-slate-950/90 backdrop-blur-md z-50">
      <div className="max-w-7xl mx-auto px-0 py-0 md:py-0.5 flex items-center justify-between">

        {/* ── Logo ──────────────────────────────────────── */}
        {(!isTechnician || technician) && (
          <Link to="/" className="text-xl font-black tracking-tighter text-white flex items-center group">
            <div className="relative mr-0 md:mr-4 logo-glow flex items-center justify-center">
              <img
                src="/assets/mekhl.png"
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
              <div className="relative" ref={menuRef}>
                <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2">
                  <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                    {technician?.profile_image ? (
                      <img src={profileThumb(technician.profile_image)} alt="Profile" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      `${technician?.first_name?.charAt(0) || 'T'}${technician?.last_name?.charAt(0) || ''}`
                    )}
                  </div>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-50">
                    <div className="px-4 py-2 border-b border-slate-700">
                      <p className="text-sm text-white font-bold truncate">{technician?.business_name || 'Technician'}</p>
                    </div>
                    <Link to="/technician-dashboard?tab=profile" onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 transition-colors">
                      Edit Profile
                    </Link>
                    <button onClick={handleSignOut}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-slate-800 transition-colors">
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
                      <span className="ml-1 text-blue-400">({bookingCount})</span>
                    )}
                  </Link>
                  <button onClick={handleBecomeTechnician} className={navLink(location.pathname === '/join')}>
                    Become a Technician
                  </button>
                </>
              )}

              {!session && (
                <>
                  <Link to="/blogs" className={navLink(location.pathname.startsWith('/blogs'))}>
                    Insights
                  </Link>
                  <button onClick={handleBecomeTechnician} className="hidden sm:block whitespace-nowrap text-[10px] sm:text-[11px] md:text-[12px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all active:scale-95 hover:underline decoration-2 underline-offset-4">
                    Become a Technician
                  </button>
                </>
              )}

              {session ? (
                <div className="relative" ref={menuRef}>
                  <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2">
                    <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm select-none">
                      {session.user?.user_metadata?.name
                        ? session.user.user_metadata.name.charAt(0).toUpperCase()
                        : 'C'}
                    </div>
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-50">
                      <Link to="/profile" onClick={() => setMenuOpen(false)}
                        className="block px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 transition-colors">
                        Edit Profile
                      </Link>
                      <button onClick={handleSignOut}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-slate-800 transition-colors">
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => navigate('/auth')}
                  className="whitespace-nowrap text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-white hover:bg-slate-800 transition-all bg-slate-900 px-3 py-2.5 md:px-5 md:py-3 rounded-xl border border-slate-700 shadow-xl active:scale-95"
                >
                  Log In
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;