import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../src/lib/supabase';

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Auth callback error:', error);
        navigate('/auth?error=confirmation_failed');
        return;
      }

      if (session) {
        const role = session.user.user_metadata?.role;

        if (role === 'technician') {
          navigate('/join'); // Continue technician onboarding
        } else {
          navigate('/'); // Send clients to homepage
        }
      } else {
        navigate('/auth');
      }
    };

    handleCallback();
  }, []);

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
