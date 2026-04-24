import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const GuestMenuPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = (path: string) => location.pathname === path;

  // Handle "Join as Technician" click - redirect to auth page with technician context
  const handleJoinAsTechnician = async (e: React.MouseEvent) => {
    e.preventDefault();
    // Set technician context in localStorage before redirecting to auth page
    localStorage.setItem('authRedirectToTechnician', 'true');
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 pb-24">
      {/* Mekh Section */}
      <div className="p-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Mekh</h3>
        <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
          <Link 
            to="/about" 
            className="flex items-center gap-3 p-4 border-b border-slate-800 hover:bg-slate-800/50 transition-colors"
          >
            <svg className="w-5 h-5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-slate-200">About Us</span>
          </Link>
          <Link 
            to="/contact" 
            className="flex items-center gap-3 p-4 border-b border-slate-800 hover:bg-slate-800/50 transition-colors"
          >
            <svg className="w-5 h-5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="text-slate-200">Contact Us</span>
          </Link>
          <button 
            onClick={handleJoinAsTechnician}
            className="flex items-center gap-3 p-4 border-b border-slate-800 hover:bg-slate-800/50 transition-colors w-full text-left"
          >
            <svg className="w-5 h-5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            <span className="text-slate-200">Join as Technician</span>
          </button>
        </div>
      </div>

      {/* Legal Section */}
      <div className="p-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Legal</h3>
        <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
          <Link 
            to="/terms" 
            className="flex items-center gap-3 p-4 border-b border-slate-800 hover:bg-slate-800/50 transition-colors"
          >
            <svg className="w-5 h-5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-slate-200">Terms & Conditions</span>
          </Link>
          <Link 
            to="/privacy" 
            className="flex items-center gap-3 p-4 hover:bg-slate-800/50 transition-colors"
          >
            <svg className="w-5 h-5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="text-slate-200">Privacy Policy</span>
          </Link>
        </div>
      </div>

      {/* Sign In / Sign Up Section */}
      <div className="p-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Account</h3>
        <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
          <Link 
            to="/auth" 
            className="flex items-center gap-3 p-4 border-b border-slate-800 hover:bg-slate-800/50 transition-colors"
          >
            <svg className="w-5 h-5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            <span className="text-slate-200">Sign In / Sign Up</span>
          </Link>
        </div>
      </div>

      {/* Bottom Navigation - Menu tab highlighted */}
      <nav className="fixed bottom-0 left-0 right-0 flex md:hidden bg-slate-900 border-t border-slate-800 p-3 justify-around z-50" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <Link to="/" className="flex flex-col items-center text-slate-300 hover:text-white transition-colors">
          <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
          </svg>
          <span className="text-xs font-medium">Home</span>
        </Link>
        <Link to="/blogs" className="flex flex-col items-center text-slate-300 hover:text-white transition-colors">
          <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
          </svg>
          <span className="text-xs font-medium">Insights</span>
        </Link>
        <Link to="/guest-menu" className="flex flex-col items-center text-sky-500 transition-colors">
          <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
          </svg>
          <span className="text-xs font-medium">Menu</span>
        </Link>
      </nav>
    </div>
  );
};

export default GuestMenuPage;
