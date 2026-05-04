import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { signOut } from '../src/lib/auth';
import { profileThumb } from '../src/lib/cloudinary';
import { Technician } from '../types';

// Extend Navigator interface for PWA standalone mode
declare global {
  interface Navigator {
    standalone?: boolean;
  }
}

interface TechnicianSidebarProps {
  technician: Technician | null;
}

const TechnicianSidebar: React.FC<TechnicianSidebarProps> = ({ technician }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isPWA, setIsPWA] = useState(false);
  
  useEffect(() => {
    // Check if running in PWA standalone mode
    const checkPWA = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isTab = window.matchMedia('(display-mode: tabbed)').matches;
      const isIOSStandalone = (window.navigator as Navigator).standalone === true;
      setIsPWA(isStandalone || isTab || isIOSStandalone);
    };
    checkPWA();
    window.matchMedia('(display-mode: standalone)').addEventListener('change', checkPWA);
  }, []);

  const isActive = (path: string) => location.pathname === path || location.search.includes(path);

  const activeClass = "bg-sky-500/20 text-blue-500 border-r-2 border-sky-500";
  const inactiveClass = "text-blue-500 hover:bg-slate-800/50 hover:text-white";

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Get initials for avatar
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const fullName = technician ? `${technician.first_name} ${technician.last_name}` : 'Technician';
  const businessName = technician?.business_name || 'My Business';

  return (
    <aside className="hidden sm:flex flex-col w-64 bg-slate-900 border-r border-slate-800 sticky top-16 h-[calc(100vh-4rem)] overflow-hidden">
      {/* Profile Section */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-[#ffff] font-bold overflow-hidden">
            {technician?.profile_image ? (
              <img 
                src={profileThumb(technician.profile_image)} 
                alt={fullName}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              getInitials(technician?.first_name || '', technician?.last_name || '')
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-blue-500 truncate">{businessName}</h3>
            <p className="text-sm text-slate-400 truncate">{fullName}</p>
            <div className="flex items-center gap-1 mt-1">
              <span className={`w-2 h-2 rounded-full ${technician?.status === 'live' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
              <span className="text-xs text-slate-500 capitalize">{technician?.status || 'pending'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="py-4">
        <Link 
          to="/" 
          className={`flex items-center gap-3 px-4 py-3 transition-colors ${isActive('/') && location.pathname === '/' ? activeClass : inactiveClass}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span>Home</span>
        </Link>

        <Link 
          to="/technician-dashboard?tab=profile" 
          className={`flex items-center gap-3 px-4 py-3 transition-colors ${isActive('tab=profile') ? activeClass : inactiveClass}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>Profile</span>
        </Link>

        <Link 
          to="/technician-dashboard?tab=bookings" 
          className={`flex items-center gap-3 px-4 py-3 transition-colors ${isActive('tab=bookings') ? activeClass : inactiveClass}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>Leads</span>
        </Link>

        <Link 
          to="/technician-dashboard?tab=services" 
          className={`flex items-center gap-3 px-4 py-3 transition-colors ${isActive('tab=services') ? activeClass : inactiveClass}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>Services</span>
        </Link>

        <Link 
          to="/technician-dashboard?tab=notifications" 
          className={`flex items-center gap-3 px-4 py-3 transition-colors ${isActive('tab=notifications') ? activeClass : inactiveClass}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span>Notifications</span>
        </Link>

        <Link 
          to="/technician-dashboard?tab=settings" 
          className={`flex items-center gap-3 px-4 py-3 transition-colors ${isActive('tab=settings') ? activeClass : inactiveClass}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>Settings</span>
        </Link>
      </nav>

      {/* Sign Out Button - Pinned at bottom */}
      <div className="p-6 border-t border-slate-800">
        <button 
          onClick={handleSignOut}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default TechnicianSidebar;
