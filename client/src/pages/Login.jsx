import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const navigate = useNavigate();
  const { user, loading, login } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  // Handle auth callback token from URL fragment (#token=...)
  useEffect(() => {
    // Read token from URL fragment to avoid leaking in browser history/server logs
    const hash = window.location.hash;
    const tokenParam = hash?.match(/token=([^&]+)/);
    const tokenFromFragment = tokenParam ? tokenParam[1] : null;
    
    if (tokenFromFragment) {
      setIsLoggingIn(true);
      // Clean the URL by removing the fragment
      window.history.replaceState(null, '', window.location.pathname);
      
      login(tokenFromFragment)
        .then((result) => {
          if (result.needsKeySetup) {
            navigate('/setup-pin', { replace: true });
          } else {
            navigate('/', { replace: true });
          }
        })
        .catch((err) => {
          toast.error('Login failed: ' + err.message);
          setIsLoggingIn(false);
        });
    }
  }, [login, navigate]);

  const handleGoogleLogin = () => {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    window.location.href = `${apiUrl}/api/auth/google`;
  };

  if (loading || isLoggingIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-dark-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="glass-card rounded-2xl p-8 space-y-8 animate-fade-in">
          {/* Logo */}
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/25">
                <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gradient">CloakTalk</h1>
            <p className="text-dark-400 text-sm">
              End-to-end encrypted messaging
            </p>
          </div>

          {/* Google Login Button */}
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 btn-secondary py-3.5 border border-dark-600/50 hover:border-dark-500"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="font-medium">Continue with Google</span>
          </button>

          {/* Features */}
          <div className="space-y-4 pt-4 border-t border-dark-700/50">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-primary-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-dark-200">End-to-End Encrypted</p>
                <p className="text-xs text-dark-400">Messages are encrypted on your device. Even we can't read them.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-primary-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-dark-200">Session Lock</p>
                <p className="text-xs text-dark-400">A 6-digit PIN locks your session. Your private key stays encrypted.</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-dark-500 text-xs mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
