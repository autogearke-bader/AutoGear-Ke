import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../src/lib/supabase';

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // ✅ exchangeCodeForSession handles BOTH:
        // - Email confirmation links (?code=xxx)
        // - OAuth callbacks (Google, etc.)
        const { data, error } = await supabase.auth.exchangeCodeForSession(
          window.location.href
        );

        if (error) {
          console.error('Auth callback error:', error);
          // Send back to auth with a readable error
          navigate(`/auth?error=${encodeURIComponent(error.message)}`);
          return;
        }

        if (data.session) {
          const role = data.session.user.user_metadata?.role;

          if (role === 'technician') {
            navigate('/join');
          } else {
            // ✅ Small delay so Layout's onAuthStateChange can fire first
            setTimeout(() => navigate('/'), 100);
          }
        } else {
          navigate('/auth');
        }
      } catch (err: any) {
        console.error('Unexpected callback error:', err);
        navigate('/auth?error=unexpected_error');
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400 text-sm">Confirming your account...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
