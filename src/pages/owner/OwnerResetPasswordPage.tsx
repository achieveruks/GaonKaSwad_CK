import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useNavigation } from '../../context/NavigationContext';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Flame,
  ShieldCheck,
} from 'lucide-react';

export const OwnerResetPasswordPage: React.FC = () => {
  const { goToOwnerLogin, goToHome } = useNavigation();

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  // Check Supabase recovery session on page mount
  useEffect(() => {
    let isMounted = true;

    async function checkRecoverySession() {
      if (!isSupabaseConfigured()) {
        if (isMounted) setIsSessionLoading(false);
        return;
      }

      try {
        // 1. Check for URL hash errors (e.g. expired or invalid recovery token)
        if (typeof window !== 'undefined' && window.location.hash.includes('error=')) {
          const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
          const desc = hashParams.get('error_description');
          if (desc && isMounted) {
            setErrorMessage(decodeURIComponent(desc.replace(/\+/g, ' ')));
          }
        }

        // 2. Handle PKCE code exchange if present in search params (?code=...)
        if (typeof window !== 'undefined' && window.location.search.includes('code=')) {
          const searchParams = new URLSearchParams(window.location.search);
          const code = searchParams.get('code');
          if (code) {
            try {
              const { data: codeData } = await supabase.auth.exchangeCodeForSession(code);
              if (codeData?.session?.user?.email && isMounted) {
                setEmail(codeData.session.user.email);
              }
            } catch (cErr) {
              console.warn('Code exchange warning:', cErr);
            }
          }
        }

        // 3. Check existing active session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email && isMounted) {
          setEmail(session.user.email);
        } else {
          // Fallback check user
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.email && isMounted) {
            setEmail(user.email);
          }
        }
      } catch (err) {
        console.warn('Session check warning:', err);
      } finally {
        if (isMounted) setIsSessionLoading(false);
      }
    }

    checkRecoverySession();

    // Listen for auth state change (e.g. PASSWORD_RECOVERY event)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user?.email && isMounted) {
        setEmail(session.user.email);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isSupabaseConfigured()) {
      setErrorMessage('Database connection is not configured.');
      return;
    }

    if (!newPassword) {
      setErrorMessage('Please enter your new password.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error('Password reset error:', error.message);
        setErrorMessage(error.message || 'Failed to update password.');
        return;
      }

      console.log('Password updated');
      setIsSuccess(true);
    } catch (err: any) {
      console.error('Password update exception:', err);
      setErrorMessage('An unexpected error occurred while updating your password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 font-sans">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <button
          type="button"
          onClick={goToHome}
          className="inline-flex items-center gap-2.5 group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-800 flex items-center justify-center text-white font-black text-lg shadow-sm group-hover:bg-amber-700 transition-colors">
            <Flame className="w-5 h-5 fill-white text-white" />
          </div>
          <div className="text-left">
            <span className="font-extrabold text-xl text-stone-900 tracking-tight font-heading">
              Swad Click
            </span>
            <span className="block text-[10px] text-amber-800 font-bold uppercase tracking-wider">
              Cloud Kitchen Network
            </span>
          </div>
        </button>
        <h2 className="mt-4 text-center text-lg font-bold text-stone-900 tracking-tight">
          Reset Password
        </h2>
        <p className="mt-1 text-center text-xs text-stone-500 max-w-xs mx-auto">
          Create a new password for your account to regain access.
        </p>
      </div>

      {/* Main Card */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-7 px-6 sm:px-8 shadow-sm sm:rounded-2xl border border-stone-200 space-y-5">
          {isSuccess ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-lg text-stone-900">
                  Password updated successfully.
                </h3>
                <p className="text-xs text-stone-600 max-w-xs mx-auto leading-relaxed">
                  Your password has been changed. You can now use your new password to log in to the portal.
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={goToOwnerLogin}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <span>Go to Login</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <div>
                    <p className="font-semibold">Reset Failed</p>
                    <p className="text-[11px] text-rose-700 mt-0.5">{errorMessage}</p>
                  </div>
                </div>
              )}

              {/* Disabled Email Field */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Account Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    disabled
                    value={email || (isSessionLoading ? 'Retrieving account...' : 'Authenticated User')}
                    className="w-full pl-9 pr-3 py-2 bg-stone-100/80 border border-stone-200 rounded-xl text-xs text-stone-600 font-medium cursor-not-allowed select-none"
                    placeholder="email@outlet.com"
                  />
                </div>
                <p className="text-[10px] text-stone-400 mt-1">
                  Email associated with this verified recovery link.
                </p>
              </div>

              {/* New Password Field */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setErrorMessage(null);
                    }}
                    placeholder="Enter new password"
                    className="w-full pl-9 pr-10 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 font-medium placeholder:text-stone-400 focus:outline-none focus:border-amber-800 focus:bg-white transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setErrorMessage(null);
                    }}
                    placeholder="Confirm new password"
                    className="w-full pl-9 pr-10 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 font-medium placeholder:text-stone-400 focus:outline-none focus:border-amber-800 focus:bg-white transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <span>Update Password</span>
                  )}
                </button>
              </div>

              <div className="text-center pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={goToOwnerLogin}
                  className="text-xs text-stone-500 hover:text-stone-900 font-medium transition-colors cursor-pointer"
                >
                  Cancel and Return to Login
                </button>
              </div>
            </form>
          )}

          {/* Security footnote */}
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 text-[11px] text-stone-500 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="text-[10px] text-stone-500 leading-normal">
              Password updates are encrypted and verified through secure authentication protocols.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
