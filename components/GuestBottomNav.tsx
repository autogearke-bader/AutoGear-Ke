import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

// Extend Navigator interface for PWA standalone mode
declare global {
  interface Navigator {
    standalone?: boolean;
  }
}

const GuestBottomNav: React.FC = () => {
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

  const isActive = (path: string) => location.pathname === path;

  const activeClass = "text-sky-500 transition-colors";
  const inactiveClass = "text-slate-300 hover:text-white transition-colors";

  // Handle home button click with refresh
  const handleHomeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (location.pathname === '/') {
      // Already on home page, trigger a refresh by navigating with state
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
      <Link to="/" onClick={handleHomeClick} className={`flex flex-col items-center ${isActive('/') && !isActive('/blogs') ? activeClass : inactiveClass}`}>
        <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
        </svg>
        <span className="text-xs font-medium">Home</span>
      </Link>
      <Link to="/blogs" className={`flex flex-col items-center ${isActive('/blogs') ? activeClass : inactiveClass}`}>
        <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
        </svg>
        <span className="text-xs font-medium">Insights</span>
      </Link>
      <Link to="/guest-menu" className={`flex flex-col items-center ${isActive('/guest-menu') ? activeClass : inactiveClass}`}>
        <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
        </svg>
        <span className="text-xs font-medium">Menu</span>
      </Link>
    </nav>
    ) : null
  );
};

export default GuestBottomNav;
