import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyClientProfile, signOut, getCurrentUser } from '../src/lib/auth';
import { Avatar } from '../src/components/Avatar';
import { profileFull } from '../src/lib/cloudinary';

const ClientProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<any>(null);
  const [email, setEmail] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          navigate('/');
          return;
        }

        const role = user.user_metadata?.role;
        // Allow access if user is explicitly a client, or if they're not a technician/admin
        // (handles Google OAuth users and other auth methods that don't set explicit role)
        if (role === 'technician' || role === 'admin') {
          navigate('/');
          return;
        }

        setEmail(user.email || '');
        
        const profile = await getMyClientProfile();
        if (profile) {
          setClient(profile);
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-20">
      {/* Header */}
      <header className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center"
            aria-label="Go back"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-white">Profile</h1>
        </div>

        {/* Avatar & Basic Info */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center">
          <Avatar
            imageUrl={client?.profile_image ? profileFull(client.profile_image) : null}
            name={client?.name || 'User'}
            size="xl"
            className="mx-auto mb-3"
          />
          <h2 className="text-lg font-bold text-white mb-1">
            {client?.name || 'Your Name'}
          </h2>
          <p className="text-slate-400 text-sm">{email}</p>
        </div>
      </header>

      {/* Profile Info - Read Only */}
      <section className="px-4 pb-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4">
            Profile Information
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-slate-400 text-xs font-medium mb-1.5">
                Name
              </label>
              <div className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white text-sm">
                {client?.name || 'Not set'}
              </div>
            </div>

            <div>
              <label className="block text-slate-400 text-xs font-medium mb-1.5">
                Phone
              </label>
              <div className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white text-sm">
                {client?.phone || 'Not set'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sign Out */}
      <section className="px-4">
        <button
          onClick={handleSignOut}
          className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-red-400 text-sm font-black uppercase tracking-widest py-3 rounded-xl transition-all"
        >
          Sign Out
        </button>
      </section>
    </div>
  );
};

export default ClientProfilePage;
