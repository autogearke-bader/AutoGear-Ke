import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { WHATSAPP_NUMBER } from '../constants';

const MobileBottomNav: React.FC = () => {
  const location = useLocation();
  const message = "Hello AutoGear, I'm browsing your website and have a question.";
  const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path);

  const activeClass = "text-sky-500 transition-colors";
  const inactiveClass = "text-slate-300 hover:text-white transition-colors";

  return (
    <nav className="fixed bottom-0 left-0 right-0 flex lg:hidden bg-slate-900 border-t border-slate-800 p-3 justify-around z-50 rounded-t-lg" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
      <Link to="/" className={`flex flex-col items-center ${isActive('/') && !isActive('/car-accessories/') && !isActive('/mobile-accessories/') && !isActive('/blogs') ? activeClass : inactiveClass}`}>
        <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
        </svg>
        <span className="text-xs font-medium">Home</span>
      </Link>
      <Link to="/car-accessories/" className={`flex flex-col items-center ${isActive('/car-accessories/') ? activeClass : inactiveClass}`}>
        <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
        </svg>
        <span className="text-xs font-medium">Car</span>
      </Link>
      <Link to="/mobile-accessories/" className={`flex flex-col items-center ${isActive('/mobile-accessories/') ? activeClass : inactiveClass}`}>
        <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/>
        </svg>
        <span className="text-xs font-medium">Mobile</span>
      </Link>
    </nav>
  );
};

export default MobileBottomNav;
