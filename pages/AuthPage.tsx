import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { signInClient, signUpClient, signInWithGoogle, getCurrentUser } from '../src/lib/auth';

interface AuthPageProps {
  onAuthSuccess?: () => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get redirect message from location state if available
  const redirectMessage = location.state?.redirectMessage as string | undefined;
  
  // Check if there's a return URL to redirect to after auth
  const returnTo = location.state?.returnTo as string | undefined;

  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [view, setView] = useState<'signin' | 'signup' | 'check-email'>('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);

  // Sign In form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Sign Up form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  const resetForms = () => {
    setError('');
    setEmail('');
    setPassword('');
    setName('');
    setPhone('');
    setSignupEmail('');
    setSignupPassword('');
  };

  const handleTabChange = (tab: 'signin' | 'signup') => {
    setActiveTab(tab);
    setView(tab);
    resetForms();
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signInClient(email, password);
      onAuthSuccess?.();
      // Redirect to return URL or home
      navigate(returnTo || '/');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // For clients, allow signup without name/phone - they'll complete profile later
    try {
      await signUpClient(signupEmail, signupPassword, '', '');
      // Show check email view for email confirmation
      setView('check-email');
    } catch (err: any) {
      setError(err.message || 'Failed to create account. Email may already be in use.');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelect = async (role: 'client' | 'technician') => {
    try {
      const user = await getCurrentUser();
      if (user) {
        // Update user role in metadata
        const { supabase } = await import('../src/lib/supabase');
        await supabase.auth.updateUser({ data: { role, profile_complete: false } });
        
        // Trigger profile completion modal via localStorage
        localStorage.setItem('showProfileCompletion', 'true');
        localStorage.setItem('pendingUserType', role);
        
        onAuthSuccess?.();
        navigate(returnTo || '/');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to select role');
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    setError('');
    try {
      const { supabase } = await import('../src/lib/supabase');
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: signupEmail,
      });
      if (resendError) {
        setError(resendError.message);
      } else {
        setError('');
        // Show success message briefly
        alert('Confirmation email resent! Please check your inbox.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resend email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 py-8 px-4">
      <Helmet>
        <title>{activeTab === 'signin' ? 'Sign In | Mekh' : 'Join Mekh | Create Your Account Today | Mekh'}</title>
        <meta name="description" content={activeTab === 'signin'
          ? 'Sign in to your Mekh account to book car services.'
          : 'Create a Mekh account to book car services from Kenya\'s best technicians.'
        } />
      </Helmet>

      <div className="max-w-md mx-auto">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <h1 className="text-2xl font-black text-white uppercase tracking-tight mb-2">
              Mekh
            </h1>
          </Link>
          <p className="text-slate-400">
            {activeTab === 'signin' 
              ? 'Sign in to your account' 
              : 'Create your account'
            }
          </p>
        </div>

        {/* Redirect Message */}
        {redirectMessage && (
          <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400 text-sm text-center">
            {redirectMessage}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Sign In Form */}
        {activeTab === 'signin' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-base"
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showSignInPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-base pr-12"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignInPassword(!showSignInPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                  >
                    {showSignInPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-2.803m5.596-3.488A3.375 3.375 0 1115.75 12m0 0H21m-3-9l-6 6m0 0l-6 6" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 text-base"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            {/* Inline toggle to create account */}
            <div className="mt-4 text-center text-sm text-slate-400">
              Don't have an account?{' '}
              <button
                onClick={() => handleTabChange('signup')}
                className="text-blue-400 hover:text-blue-300 font-medium"
              >
                create account
              </button>
            </div>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-slate-900 text-slate-500">or</span>
              </div>
            </div>

            {/* Google Sign In */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3 bg-white hover:bg-gray-100 text-slate-800 font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-base"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
          </div>
        )}

        {/* Sign Up Form */}
        {activeTab === 'signup' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Email *</label>
                <input
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-base"
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Password *</label>
                <div className="relative">
                  <input
                    type={showSignUpPassword ? 'text' : 'password'}
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-base pr-12"
                    placeholder="Min 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                  >
                    {showSignUpPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-2.803m5.596-3.488A3.375 3.375 0 1115.75 12m0 0H21m-3-9l-6 6m0 0l-6 6" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                You can add your name and phone after creating your account.
              </p>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 text-base"
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>

            {/* Inline toggle to sign in */}
            <div className="mt-4 text-center text-sm text-slate-400">
              Already have an account?{' '}
              <button
                onClick={() => handleTabChange('signin')}
                className="text-blue-400 hover:text-blue-300 font-medium"
              >
                sign in
              </button>
            </div>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-slate-900 text-slate-500">or</span>
              </div>
            </div>

            {/* Google Sign Up */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3 bg-white hover:bg-gray-100 text-slate-800 font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-base"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
          </div>
        )}

        {/* Check Email View */}
        {view === 'check-email' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Check your email</h2>
              <p className="text-slate-400 text-sm max-w-sm mx-auto">
                We've sent a confirmation link to <strong className="text-white">{signupEmail}</strong>. 
                Click the link to activate your Mekh account.
              </p>
              <p className="text-slate-500 text-xs mt-4">
                Didn't receive it? Check your spam folder or{' '}
                <button className="text-blue-400 hover:underline" onClick={handleResend}>
                  resend the email
                </button>
              </p>
              <button
                onClick={() => handleTabChange('signin')}
                className="mt-6 text-blue-400 hover:text-blue-300 text-sm font-medium"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        )}

        {/* Role Selection Modal */}
        {showRoleSelection && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-2">Choose Your Role</h2>
              <p className="text-slate-400 text-sm mb-6">
                How would you like to use Mekh?
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => handleRoleSelect('client')}
                  className="w-full p-4 bg-slate-800 border border-slate-700 hover:border-blue-500 rounded-xl text-left transition-colors"
                >
                  <div className="font-bold text-white">I'm a Client</div>
                  <div className="text-slate-400 text-sm">Looking to book car services</div>
                </button>
                <button
                  onClick={() => handleRoleSelect('technician')}
                  className="w-full p-4 bg-slate-800 border border-slate-700 hover:border-blue-500 rounded-xl text-left transition-colors"
                >
                  <div className="font-bold text-white">I'm a Technician</div>
                  <div className="text-slate-400 text-sm">Offering car services</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Back to Home */}
        <div className="mt-8 text-center">
          <Link 
            to="/" 
            className="text-slate-500 hover:text-slate-400 text-sm"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
