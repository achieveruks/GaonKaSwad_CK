import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  ArrowLeft,
  Sparkles,
  Flame,
} from 'lucide-react';

export const OwnerLoginPage: React.FC = () => {
  const { isAuthenticated, isLoading, login } = useAuth();
  const { goToOwnerDashboard, goToHome } = useNavigation();

  const [email, setEmail] = useState('achieveruks@gmail.com');
  const [password, setPassword] = useState('gaonkaswaD1!');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If already authenticated and not loading, redirect to dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      goToOwnerDashboard();
    }
  }, [isAuthenticated, isLoading, goToOwnerDashboard]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please provide both email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await login(email.trim(), password);
      if (result.success) {
        goToOwnerDashboard();
      } else {
        setErrorMessage(result.error || 'Invalid credentials. Please verify your email and password.');
      }
    } catch (err: any) {
      setErrorMessage('A network error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMessage(null);
  };

  const handleInstantDemoLogin = async () => {
    setEmail('achieveruks@gmail.com');
    setPassword('gaonkaswaD1!');
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const result = await login('achieveruks@gmail.com', 'gaonkaswaD1!');
      if (result.success) {
        goToOwnerDashboard();
      } else {
        setErrorMessage(result.error || 'Invalid demo credentials.');
      }
    } catch (err) {
      setErrorMessage('Failed to connect to authentication server.');
    } finally {
      setIsSubmitting(false);
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
              Gaon Ka Swad
            </span>
            <span className="block text-[10px] text-amber-800 font-bold uppercase tracking-wider">
              Cloud Kitchen Network
            </span>
          </div>
        </button>
        <h2 className="mt-4 text-center text-lg font-bold text-stone-900 tracking-tight">
          Owner Portal Authentication
        </h2>
        <p className="mt-1 text-center text-xs text-stone-500 max-w-xs mx-auto">
          Sign in to manage cloud kitchen outlets, delivery PIN zones, dishes, and live pricing.
        </p>
      </div>

      {/* Login Card */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-7 px-6 sm:px-8 shadow-sm sm:rounded-2xl border border-stone-200 space-y-5">
          {/* Instant 1-Click Login Helper */}
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                Quick Owner Demo Access
              </span>
              <span className="text-[10px] bg-amber-200/70 text-amber-950 font-bold px-1.5 py-0.5 rounded">
                Configured
              </span>
            </div>
            <p className="text-[11px] text-amber-800 leading-tight">
              Pre-configured for kitchen owner access. Click below to sign in instantly.
            </p>
            <button
              type="button"
              onClick={handleInstantDemoLogin}
              disabled={isSubmitting}
              className="w-full py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-60"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>1-Click Sign In (achieveruks@gmail.com)</span>
            </button>
          </div>

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
            {/* Email Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-stone-700">
                  Owner Email
                </label>
                <button
                  type="button"
                  onClick={() => handleFillDemo('achieveruks@gmail.com', 'gaonkaswaD1!')}
                  className="text-[10px] text-amber-800 hover:underline font-semibold"
                >
                  Fill default
                </button>
              </div>
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
                  placeholder="achieveruks@gmail.com"
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
                  onClick={() => handleFillDemo('achieveruks@gmail.com', 'gaonkaswaD1!')}
                  className="text-[10px] text-amber-800 hover:underline font-semibold"
                >
                  Fill pass
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
                  placeholder="••••••••••••"
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
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Security Notice */}
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 text-[11px] text-stone-500 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-stone-700">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Restricted Access Cloud Kitchen Console</span>
            </div>
            <p className="text-[10px] text-stone-500 leading-normal">
              Manage outlets in Bangalore and Bhubaneswar, assign PIN codes, control handi dish stocks, and update live menu pricing.
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

