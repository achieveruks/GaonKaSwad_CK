import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';
import { UserRole } from '../../types';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  ArrowLeft,
  Flame,
  Crown,
  Building2,
  Info,
  CheckCircle2,
  KeyRound,
} from 'lucide-react';

export const OwnerLoginPage: React.FC = () => {
  const { isAuthenticated, isLoading, login, ownerUser, profile } = useAuth();
  const { goToOwnerDashboard, goToManagerDashboard, goToHome } = useNavigation();

  const [authMode, setAuthMode] = useState<'login' | 'forgot_password'>('login');

  // Login Form State - starts clean with no hardcoded prefilled credentials
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('owner');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Forgot Password Form State
  const [resetEmail, setResetEmail] = useState('');
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  const [resetErrorMessage, setResetErrorMessage] = useState<string | null>(null);

  // If already authenticated and not loading, redirect to dashboard based on verified staff role
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const role = ownerUser?.role || profile?.role;
      if (role === 'outlet_manager') {
        goToManagerDashboard();
      } else if (role === 'owner') {
        goToOwnerDashboard();
      }
    }
  }, [isAuthenticated, isLoading, ownerUser, profile, goToOwnerDashboard, goToManagerDashboard]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please provide both email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await login(email.trim(), password, selectedRole);
      if (result.success) {
        const verifiedRole = ownerUser?.role || profile?.role || selectedRole;
        if (verifiedRole === 'outlet_manager') {
          goToManagerDashboard();
        } else if (verifiedRole === 'owner') {
          goToOwnerDashboard();
        } else {
          setErrorMessage('Access Denied: Customer accounts are not authorized to enter the staff portal.');
        }
      } else {
        setErrorMessage(result.error || 'Invalid credentials. Please verify your email and password.');
      }
    } catch (err: any) {
      setErrorMessage('A network error occurred while connecting to authentication service.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMessage(null);
  };

  const handleSendResetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetErrorMessage(null);

    const cleanEmail = resetEmail.trim();
    if (!cleanEmail) {
      setResetErrorMessage('Please enter your email address.');
      return;
    }

    if (!isSupabaseConfigured()) {
      setResetErrorMessage('Database connection is not configured.');
      return;
    }

    setIsResetSubmitting(true);
    try {
      // Explicitly target production domain https://swadclick.com/owner/reset-password
      const isLocalhost =
        typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      const redirectUrl = isLocalhost
        ? `${window.location.origin}/owner/reset-password`
        : 'https://swadclick.com/owner/reset-password';

      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: redirectUrl,
      });

      if (error) {
        console.error('Password reset request error:', error.message);
      }

      // Safe wording recommended for security: does not reveal whether the email exists
      setResetSuccessMessage(
        'If an account exists for this email, a password reset link has been sent. Please check your inbox.'
      );
    } catch (err: any) {
      console.error('Password reset request exception:', err);
      setResetSuccessMessage(
        'If an account exists for this email, a password reset link has been sent. Please check your inbox.'
      );
    } finally {
      setIsResetSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 font-sans">
      {/* Top Brand Link */}
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
          {authMode === 'login' ? 'Owner & Staff Portal Sign In' : 'Reset Your Password'}
        </h2>
        <p className="mt-1 text-center text-xs text-stone-500 max-w-xs mx-auto">
          {authMode === 'login'
            ? 'Authorized access only. Sign in with your registered staff credentials.'
            : 'Enter your registered email address to receive a secure recovery link.'}
        </p>
      </div>

      {/* Card Container */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-7 px-6 sm:px-8 shadow-sm sm:rounded-2xl border border-stone-200 space-y-5">
          {authMode === 'login' ? (
            <>
              {errorMessage && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <div>
                    <p className="font-semibold">Authentication Failed</p>
                    <p className="text-[11px] text-rose-700 mt-0.5">{errorMessage}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Account Role Selector */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    Select Account Role
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleRoleChange('owner')}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                        selectedRole === 'owner'
                          ? 'border-amber-800 bg-amber-50/60 ring-1 ring-amber-800 text-stone-900'
                          : 'border-stone-200 bg-stone-50/80 text-stone-600 hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <Crown className={`w-3.5 h-3.5 ${selectedRole === 'owner' ? 'text-amber-800' : 'text-stone-400'}`} />
                        <span>Owner / Admin</span>
                      </div>
                      <div className="text-[10px] text-stone-500 font-normal mt-0.5">
                        Multi-outlet master control
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRoleChange('outlet_manager')}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                        selectedRole === 'outlet_manager'
                          ? 'border-amber-800 bg-amber-50/60 ring-1 ring-amber-800 text-stone-900'
                          : 'border-stone-200 bg-stone-50/80 text-stone-600 hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <Building2 className={`w-3.5 h-3.5 ${selectedRole === 'outlet_manager' ? 'text-amber-800' : 'text-stone-400'}`} />
                        <span>Outlet Manager</span>
                      </div>
                      <div className="text-[10px] text-stone-500 font-normal mt-0.5">
                        Branch kitchen live orders
                      </div>
                    </button>
                  </div>
                </div>

                {/* Email Field */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setErrorMessage(null);
                      }}
                      placeholder={selectedRole === 'outlet_manager' ? 'manager@outlet.com' : 'owner@swadclick.com'}
                      className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 font-medium placeholder:text-stone-400 focus:outline-none focus:border-amber-800 focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-stone-700">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('forgot_password');
                        setResetEmail(email || '');
                        setResetSuccessMessage(null);
                        setResetErrorMessage(null);
                      }}
                      className="text-[11px] text-amber-800 hover:text-amber-900 hover:underline font-semibold cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setErrorMessage(null);
                      }}
                      placeholder="Enter password"
                      className="w-full pl-9 pr-10 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 font-medium placeholder:text-stone-400 focus:outline-none focus:border-amber-800 focus:bg-white transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Provisioning Info Banner without Supabase wording */}
                <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200/70 text-[11px] text-stone-600 flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 text-stone-500 shrink-0 mt-0.5" />
                  <p className="text-[10.5px] leading-tight">
                    Staff accounts and roles are provisioned by the System Administrator.
                  </p>
                </div>

                {/* Submit Button */}
                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Signing In...</span>
                      </>
                    ) : (
                      <>
                        <span>Login</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          ) : (
            /* Forgot Password View */
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-stone-100">
                <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                  <KeyRound className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-stone-900">Forgot Password</h3>
                  <p className="text-[11px] text-stone-500">We will email you a recovery link</p>
                </div>
              </div>

              {resetSuccessMessage ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs space-y-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <p className="leading-relaxed font-medium">{resetSuccessMessage}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setResetSuccessMessage(null);
                      setResetErrorMessage(null);
                    }}
                    className="w-full py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    Return to Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSendResetLink} className="space-y-4">
                  {resetErrorMessage && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-800 text-xs">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <p className="text-[11px]">{resetErrorMessage}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Enter your email address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        required
                        value={resetEmail}
                        onChange={(e) => {
                          setResetEmail(e.target.value);
                          setResetErrorMessage(null);
                        }}
                        placeholder="manager@outlet.com"
                        className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 font-medium placeholder:text-stone-400 focus:outline-none focus:border-amber-800 focus:bg-white transition-colors"
                      />
                    </div>
                  </div>

                  <div className="pt-1 space-y-2">
                    <button
                      type="submit"
                      disabled={isResetSubmitting}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {isResetSubmitting ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Sending Link...</span>
                        </>
                      ) : (
                        <span>Send Reset Link</span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('login');
                        setResetErrorMessage(null);
                      }}
                      className="w-full py-2 text-stone-600 hover:text-stone-900 text-xs font-medium transition-colors cursor-pointer"
                    >
                      Back to Sign In
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Security Notice */}
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 text-[11px] text-stone-500 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-stone-700">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Row-Level Security & Role-Based Access</span>
            </div>
            <p className="text-[10px] text-stone-500 leading-normal">
              Protected by PostgreSQL Row Level Security. Outlet managers only access their assigned kitchen branch, while master administrators oversee cross-city operations.
            </p>
          </div>

          {/* Back Link */}
          <div className="text-center pt-2 border-t border-stone-100">
            <button
              type="button"
              onClick={goToHome}
              className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Storefront</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
