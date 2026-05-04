import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

// Extend Navigator interface for PWA standalone mode
declare global {
  interface Navigator {
    standalone?: boolean;
  }
}

const TechnicianBottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
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

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Show nav when at top of page
      if (currentScrollY < 10) {
        setIsVisible(true);
        setLastScrollY(currentScrollY);
        return;
      }
      
      // Hide nav when scrolling down, show when scrolling up
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path);

  const activeClass = "text-blue-500 transition-colors";
  const inactiveClass = "text-gray-500 hover:text-white transition-colors";

  // Handle home button click with refresh
  const handleHomeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (location.pathname === '/') {
      // Already on home page, trigger a refresh by reloading
      window.location.reload();
    } else {
      // Navigate to home page
      navigate('/');
    }
  };

  // Show on mobile only (< 640px / sm breakpoint) OR in PWA standalone mode on mobile
  const showNav = !window.matchMedia('(min-width: 640px)').matches || (isPWA && !window.matchMedia('(min-width: 640px)').matches);

  return (
    showNav ? (
    <nav className={`fixed bottom-0 left-0 right-0 flex sm:hidden bg-slate-900 border-t border-slate-800 p-3 justify-around z-50 rounded-t-lg transition-transform duration-300 ${isVisible ? 'translate-y-0' : 'translate-y-full'} ${!isVisible ? 'pointer-events-none' : ''}`} style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
      <Link to="/" onClick={handleHomeClick} className={`flex flex-col items-center ${location.pathname === '/' ? activeClass : inactiveClass}`}>
        <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
        </svg>
        <span className="text-xs font-medium">Home</span>
      </Link>
      <Link to="/technician-dashboard?tab=bookings" className={`flex flex-col items-center ${isActive('/bookings') || isActive('/technician-dashboard') && location.search.includes('tab=bookings') ? activeClass : inactiveClass}`}>
        <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/>
        </svg>
        <span className="text-xs font-medium">Leads</span>
      </Link>
      <Link to="/technician-dashboard?tab=services" className={`flex flex-col items-center ${location.search.includes('tab=services') ? activeClass : inactiveClass}`}>
        <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
          <path d="M21.71 3.29l-1-1a1 1 0 00-1.42 0l-16 16a1 1 0 000 1.42l1 1a1 1 0 001.42 0l2.29-2.29V20a1 1 0 001 1h1a1 1 0 001-1v-1.59l.29-.29a1 1 0 000-1.42l-2.3-2.3 1.7-1.7 2.29 2.29a1 1 0 001.42 0l1-1a1 1 0 000-1.42l-1-1zM8 14a3 3 0 110-6 3 3 0 010 6zm6.5-4.5h-4v1.5h4v-1.5zm-2 5.5h-1v-1h1v1zm4.5-2.5h-3v-1.5h3V12zm0 2.5h-3v-1.5h3V14.5z"/>
        </svg>
        <span className="text-xs font-medium">Services</span>
      </Link>
      <Link to="/technician-menu" className={`flex flex-col items-center ${isActive('/technician-menu') ? activeClass : inactiveClass}`}>
        <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
        </svg>
        <span className="text-xs font-medium">Menu</span>
      </Link>
    </nav>
    ) : null
  );
};

export default TechnicianBottomNav;
