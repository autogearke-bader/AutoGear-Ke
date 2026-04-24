import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../src/lib/auth';
import { updateMyClientProfile } from '../src/lib/api';
import { Avatar } from '../src/components/Avatar';

const ClientOnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  // Phone validation regex - accepts Kenyan phone formats
  const phoneRegex = /^(\+254|254|0)[1-9]\d{8}$/;

  useEffect(() => {
    const getUserEmail = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          navigate('/auth');
          return;
        }
        
        if (user.email) {
          setEmail(user.email);
          // Pre-fill name from email
          const nameFromEmail = user.email.split('@')[0].replace(/[._]/g, ' ');
          setName(nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1));
        }
      } catch (err) {
        console.error('Error getting user:', err);
        setError('Failed to load user information');
      } finally {
        setLoading(false);
      }
    };

    getUserEmail();
  }, [navigate]);

  const validateForm = (): boolean => {
    if (!name.trim()) {
      setError('Please enter your full name');
      return false;
    }

    if (!phone.trim()) {
      setError('Please enter your WhatsApp phone number');
      return false;
    }

    if (!phoneRegex.test(phone.trim())) {
      setError('Please enter a valid Kenyan phone number (e.g., 0712345678 or +254712345678)');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      await updateMyClientProfile({
        name: name.trim(),
        phone: phone.trim(),
      });

      // Signal Layout to refresh isClient immediately
      window.dispatchEvent(new Event('client-profile-complete'));

      // Mark profile as complete in localStorage
      localStorage.setItem('clientProfileComplete', 'true');

      // Redirect to home
      navigate('/');
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setError(err.message || 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Welcome!</h1>
            <p className="text-slate-400 text-sm">Complete your profile to get started</p>
          </div>
        </div>
      </header>

      {/* Form */}
      <main className="flex-1 px-4 pb-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Avatar placeholder */}
          <div className="flex justify-center mb-4">
            <Avatar
              imageUrl={null}
              name={name || 'User'}
              size="xl"
              className="w-24 h-24"
            />
          </div>

          {/* Email field (read-only) */}
          <div>
            <label className="block text-slate-400 text-xs font-medium mb-2">
              Email Address
            </label>
            <div className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-300 text-sm">
              {email}
            </div>
            <p className="text-slate-500 text-xs mt-1.5">
              Your email is linked to your account
            </p>
          </div>

          {/* Full Name field */}
          <div>
            <label className="block text-slate-400 text-xs font-medium mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>

          {/* WhatsApp Number field */}
          <div>
            <label className="block text-slate-400 text-xs font-medium mb-2">
              WhatsApp Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g., 0712345678 or +254712345678"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
            <p className="text-slate-500 text-xs mt-1.5">
              This number is used to confirm service delivery and invite you to rate your experience.
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Complete Profile</span>
              </>
            )}
          </button>
        </form>

        {/* Skip option note */}
        <p className="text-center text-slate-500 text-xs mt-4">
          You must complete your profile to access all features
        </p>
      </main>
    </div>
  );
};

export default ClientOnboardingPage;