import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';
import { isSupabaseConfigured } from '../../lib/supabase';
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
  Sparkles,
  Flame,
  Database,
  Crown,
  Building2,
  Info,
} from 'lucide-react';

export const OwnerLoginPage: React.FC = () => {
  const { isAuthenticated, isLoading, login } = useAuth();
  const { goToOwnerDashboard, goToHome } = useNavigation();

  const [email, setEmail] = useState('achieveruks@gmail.com');
  const [password, setPassword] = useState('gaonkaswaD1!');
  const [selectedRole, setSelectedRole] = useState<UserRole>('owner');
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
      const result = await login(email.trim(), password, selectedRole);
      if (result.success) {
        goToOwnerDashboard();
      } else {
        setErrorMessage(result.error || 'Invalid credentials. Please verify your Supabase email and password.');
      }
    } catch (err: any) {
      setErrorMessage('A network error occurred connecting to Supabase Auth.');
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
    setSelectedRole('owner');
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const result = await login('achieveruks@gmail.com', 'gaonkaswaD1!', 'owner');
      if (result.success) {
        goToOwnerDashboard();
      } else {
        setErrorMessage(result.error || 'Invalid Supabase credentials.');
      }
    } catch (err) {
      setErrorMessage('Failed to connect to Supabase authentication.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasSupabase = isSupabaseConfigured();

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
          Owner & Staff Portal Sign In
        </h2>
        <p className="mt-1 text-center text-xs text-stone-500 max-w-xs mx-auto">
          Authorized access only. Sign in with your Supabase credentials to manage kitchen outlets, PIN zones, and live orders.
        </p>
      </div>

      {/* Login Card */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-7 px-6 sm:px-8 shadow-sm sm:rounded-2xl border border-stone-200 space-y-5">
          {/* Supabase 1-Click Login Helper */}
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                Quick Owner Sign In
              </span>
              <span className="text-[10px] bg-amber-200/70 text-amber-950 font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                <Database className="w-3 h-3" />
                {hasSupabase ? 'Supabase Auth' : 'Database Offline'}
              </span>
            </div>
            <p className="text-[11px] text-amber-800 leading-tight">
              Pre-filled with master owner account (<code className="font-mono font-bold">achieveruks@gmail.com</code>).
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
            {/* Account Role Selector */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                Select Account Role
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRole('owner')}
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
                    Full multi-outlet master control
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole('outlet_manager')}
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
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-stone-700">
                  Email Address
                </label>
                <button
                  type="button"
                  onClick={() => handleFillDemo('achieveruks@gmail.com', 'gaonkaswaD1!')}
                  className="text-[10px] text-amber-800 hover:underline font-semibold cursor-pointer"
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
                  className="text-[10px] text-amber-800 hover:underline font-semibold cursor-pointer"
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

            {/* Provisioning Info Banner */}
            <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200/70 text-[11px] text-stone-600 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-stone-500 shrink-0 mt-0.5" />
              <p className="text-[10.5px] leading-tight">
                Staff accounts and roles are provisioned by the Administrator directly in Supabase Dashboard.
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
                    <span>Verifying with Supabase...</span>
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
              <span>Row-Level Security & Role-Based Access</span>
            </div>
            <p className="text-[10px] text-stone-500 leading-normal">
              Protected by PostgreSQL Row Level Security (RLS). Outlet managers only see data for their assigned kitchen branch, while master owner has full cross-city oversight.
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



