import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../src/lib/supabase';
import { getMyTechnicianProfile, signOut } from '../src/lib/auth';
import { Technician } from '../types';

const TechnicianMenuPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [technician, setTechnician] = useState<Technician | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchTechnicianProfile = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);
        
        const technicianProfile = await getMyTechnicianProfile();
        setTechnician(technicianProfile);
      } catch (error) {
        console.error('Error fetching technician profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTechnicianProfile();
  }, []);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  const fullName = technician ? `${technician.first_name} ${technician.last_name}` : 'Technician';
  const businessName = technician?.business_name || 'My Business';
  const displayEmail = technician?.email || user?.email || '';

  // Determine which nav item is active based on URL
  const getNotificationLink = () => '/technician-dashboard?tab=notifications';

  const getSettingsLink = () => '/technician-dashboard?tab=settings';

  const getProfileLink = () => '/technician-dashboard?tab=profile';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 pb-24 md:pb-8">
      {/* Profile Card */}
      <div className="bg-slate-900 p-6 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-sky-500 flex items-center justify-center text-white text-xl font-bold overflow-hidden">
            {technician?.profile_image ? (
              <img 
                src={technician.profile_image} 
                alt={fullName}
                className="w-full h-full object-cover"
              />
            ) : (
              getInitials(technician?.first_name || '', technician?.last_name || '')
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-white">{businessName}</h2>
            <p className="text-slate-200 font-medium">{fullName}</p>
            <p className="text-slate-400 text-sm">{displayEmail}</p>
          </div>
          <div className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${technician?.status === 'live' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
            <span className="text-xs text-slate-500 capitalize">{technician?.status || 'pending'}</span>
          </div>
        </div>
      </div>

      {/* My Account Section */}
      <div className="p-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">My Account</h3>
        <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
          <Link 
            to={getProfileLink()} 
            className="flex items-center gap-3 p-4 border-b border-slate-800 hover:bg-slate-800/50 transition-colors"
          >
            <svg className="w-5 h-5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-slate-200">Profile</span>
          </Link>
          <Link 
            to={getNotificationLink()} 
            className="flex items-center gap-3 p-4 border-b border-slate-800 hover:bg-slate-800/50 transition-colors"
          >
            <svg className="w-5 h-5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="text-slate-200">Notifications</span>
          </Link>
          <Link 
            to={getSettingsLink()} 
            className="flex items-center gap-3 p-4 hover:bg-slate-800/50 transition-colors"
          >
            <svg className="w-5 h-5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-slate-200">Settings</span>
          </Link>
        </div>
      </div>

      {/* Explore Section */}
      <div className="p-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Explore</h3>
        <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
          <Link 
            to="/blogs" 
            className="flex items-center gap-3 p-4 border-b border-slate-800 hover:bg-slate-800/50 transition-colors"
          >
            <svg className="w-5 h-5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            <span className="text-slate-200">Insights</span>
          </Link>
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
            className="flex items-center gap-3 p-4 hover:bg-slate-800/50 transition-colors"
          >
            <svg className="w-5 h-5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="text-slate-200">Contact Us</span>
          </Link>
        </div>
      </div>

      {/* Legal Section */}
      <div className="p-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Legal</h3>
        <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
          <Link 
            to="/privacy" 
            className="flex items-center gap-3 p-4 border-b border-slate-800 hover:bg-slate-800/50 transition-colors"
          >
            <svg className="w-5 h-5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="text-slate-200">Privacy Policy</span>
          </Link>
          <Link 
            to="/terms" 
            className="flex items-center gap-3 p-4 hover:bg-slate-800/50 transition-colors"
          >
            <svg className="w-5 h-5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-slate-200">Terms & Conditions</span>
          </Link>
        </div>
      </div>

      {/* Sign Out Button - Positioned at bottom */}
      <div className="p-4 mt-auto">
        <button 
          onClick={handleSignOut}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>
      </div>

      {/* Bottom Navigation for Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 flex md:hidden bg-slate-900 border-t border-slate-800 p-3 justify-around z-50" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <Link to="/technician-dashboard" className="flex flex-col items-center text-slate-300 hover:text-white transition-colors">
          <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
          </svg>
          <span className="text-xs font-medium">Home</span>
        </Link>
        <Link to="/technician-dashboard?tab=bookings" className="flex flex-col items-center text-slate-300 hover:text-white transition-colors">
          <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>
          </svg>
          <span className="text-xs font-medium">Leads</span>
        </Link>
        <Link to="/technician-dashboard?tab=services" className="flex flex-col items-center text-slate-300 hover:text-white transition-colors">
          <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
            <path d="M21.71 3.29l-1-1a1 1 0 00-1.42 0l-16 16a1 1 0 000 1.42l1 1a1 1 0 001.42 0l2.29-2.29V20a1 1 0 001 1h1a1 1 0 001-1v-1.59l.29-.29a1 1 0 000-1.42l-2.3-2.3 1.7-1.7 2.29 2.29a1 1 0 001.42 0l1-1a1 1 0 000-1.42l-1-1z"/>
          </svg>
          <span className="text-xs font-medium">Services</span>
        </Link>
        <Link to="/technician-menu" className="flex flex-col items-center text-sky-500 transition-colors">
          <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
          </svg>
          <span className="text-xs font-medium">Menu</span>
        </Link>
      </nav>
    </div>
  );
};

export default TechnicianMenuPage;
