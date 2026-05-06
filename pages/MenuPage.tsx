import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../src/lib/supabase';
import { getMyClientProfile, signOut, triggerProfileCompletion } from '../src/lib/auth';
import { Client } from '../types';

const MenuPage: React.FC = () => {
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const fetchClientProfile = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);
        
        const clientProfile = await getMyClientProfile();
        setClient(clientProfile);
      } catch (error) {
        console.error('Error fetching client profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClientProfile();
  }, []);

  const handleSignOut = async () => {
    if (signingOut) return; // Prevent multiple clicks

    setSigningOut(true);
    try {
      // Check session health first
      const { isSessionHealthy } = await import('../src/lib/auth');
      const healthy = await isSessionHealthy();

      if (!healthy) {
        console.log('Session unhealthy, proceeding with sign-out anyway');
      }

      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      // Even if sign-out fails, navigate away to force a clean state
      // This ensures the button always works by clearing the UI state
      console.log('Sign-out failed, but navigating away to reset state');
      navigate('/');
    } finally {
      setSigningOut(false);
    }
  };

  // Handle "Become a Technician" click - user is already authenticated, trigger profile completion
  const handleBecomeTechnician = (e: React.MouseEvent) => {
    e.preventDefault();
    triggerProfileCompletion('technician');
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  const displayName = client?.name || user?.user_metadata?.name || 'User';
  const displayEmail = client?.email || user?.email || '';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 pb-24">
      {/* Profile Card */}
      <div className="bg-blue-500 p-6 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-blue-500 text-xl font-bold">
            {displayName ? getInitials(displayName) : 'U'}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-white">{displayName}</h2>
            <p className="text-[#ffff] text-sm">{displayEmail}</p>
          </div>
        </div>
      </div>

      {/* My Account Section */}
      <div className="p-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-blue-500 mb-3">My Account</h3>
        <div className="rounded-lg border border-blue-500 overflow-hidden">
          <Link 
            to="/profile" 
            className="flex items-center gap-3 p-4 border-b border-blue-500 hover:bg-blue-300 transition-colors"
          >
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="text-blue-500">Notifications</span>
          </Link>
          <Link 
            to="/profile" 
            className="flex items-center gap-3 p-4 border-b border-blue-500 hover:bg-blue-300 transition-colors"
          >
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span className="text-blue-500">Edit Profile</span>
          </Link>
          <button 
            onClick={handleBecomeTechnician}
            className="flex items-center gap-3 p-4 bg-blue-500 hover:bg-blue-600 transition-colors w-full text-left"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
            </svg>
            <div className="flex flex-col">
              <span className="text-slate-200">Become a technician</span>
            </div>
          </button>
        </div>
      </div>

      {/* Mekh Section */}
      <div className="p-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-blue-500 mb-3">Mekh</h3>
        <div className="rounded-lg border border-blue-500 overflow-hidden">
          <Link 
            to="/about" 
            className="flex items-center gap-3 p-4 border-b border-blue-500 hover:bg-blue-300 transition-colors"
          >
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-blue-500">About Us</span>
          </Link>
          <Link 
            to="/contact" 
            className="flex items-center gap-3 p-4 bg-blue-500 hover:bg-blue-600 transition-colors"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="text-[#ffff]">Contact Us</span>
          </Link>
        </div>
      </div>

      {/* Legal Section */}
      <div className="p-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-blue-500 mb-3">Legal</h3>
        <div className="rounded-lg border border-blue-500 overflow-hidden">
          <Link 
            to="/terms" 
            className="flex items-center gap-3 p-4 border-b border-blue-600 hover:bg-blue-300 transition-colors"
          >
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-blue-500">Terms & Conditions</span>
          </Link>
          <Link 
            to="/privacy" 
            className="flex items-center gap-3 p-4 bg-blue-500 hover:bg-blue-600 transition-colors"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="text-[#ffff]">Privacy Policy</span>
          </Link>
        </div>
      </div>

      {/* Sign Out Button */}
      <div className="p-4">
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white font-bold py-4 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {signingOut ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
              Signing Out...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </>
          )}
        </button>
      </div>

      {/* Bottom Navigation - Menu tab highlighted */}
      <nav className="fixed bottom-0 left-0 right-0 flex md:hidden bg-slate-900 border-t border-slate-800 p-3 justify-around z-50" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <Link to="/" className="flex flex-col items-center text-slate-300 hover:text-white transition-colors">
          <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
          </svg>
          <span className="text-xs font-medium">Home</span>
        </Link>
        <Link to="/bookings" className="flex flex-col items-center text-slate-300 hover:text-white transition-colors">
          <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/>
          </svg>
          <span className="text-xs font-medium">Bookings</span>
        </Link>
        <Link to="/blogs" className="flex flex-col items-center text-slate-300 hover:text-white transition-colors">
          <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
          </svg>
          <span className="text-xs font-medium">Insights</span>
        </Link>
        <Link to="/menu" className="flex flex-col items-center text-sky-500 transition-colors">
          <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
          </svg>
          <span className="text-xs font-medium">Menu</span>
        </Link>
      </nav>
    </div>
  );
};

export default MenuPage;
