import React, { useState, useEffect, useRef } from 'react';
import { useCustomer } from '../context/CustomerContext';
import { Customer, CustomerAddress } from '../types';
import { X, ShieldCheck, Sparkles, CheckCircle2, ArrowRight, Phone, RefreshCw, User, Mail, ArrowLeft, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface OtpModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  phone?: string;
  mode?: 'signin' | 'create_account' | 'verify_review' | 'direct_otp' | 'signin_otp';
  onVerify?: (phone: string, otp: string, extraData?: { fullName?: string; email?: string }) => Promise<any>;
  onSuccess?: (customer: Customer | null, address: CustomerAddress | null) => void;
}

export const OtpModal: React.FC<OtpModalProps> = ({
  isOpen: propIsOpen,
  onClose: propOnClose,
  phone: propPhone,
  mode: propMode,
  onSuccess: propOnSuccess,
}) => {
  const context = useCustomer();

  const isModalOpen = propIsOpen !== undefined ? propIsOpen : context.isOtpModalOpen;
  const modalPhone = propPhone !== undefined ? propPhone : context.otpModalPhone;
  const modalMode = propMode !== undefined ? propMode : context.otpModalMode;

  const handleClose = () => {
    if (propOnClose) {
      propOnClose();
    } else {
      context.closeOtpModal();
    }
  };

  // View state: 'signin' | 'signup' | 'otp'
  const [view, setView] = useState<'signin' | 'signup' | 'otp'>('signin');
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);

  const [error, setError] = useState<string | null>(null);
  const [infoNotice, setInfoNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [verifiedName, setVerifiedName] = useState('');
  const [resendTimer, setResendTimer] = useState(30);

  const firstInputRef = useRef<HTMLInputElement | null>(null);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Initialize or reset form whenever modal opens or mode changes
  useEffect(() => {
    if (isModalOpen) {
      const cleanPhone = (modalPhone || '').replace(/\D/g, '').slice(-10);
      setPhone(cleanPhone);
      setFullName(context.customer?.fullName || '');
      setEmail(context.customer?.email || '');
      setOtp(['', '', '', '', '', '']);
      setError(null);
      setInfoNotice(null);
      setIsSuccess(false);
      setVerifiedName('');
      setResendTimer(30);

      if (modalMode === 'create_account') {
        setView('signup');
        setTimeout(() => {
          firstInputRef.current?.focus();
        }, 100);
      } else if (modalMode === 'direct_otp' || modalMode === 'signin_otp') {
        setView('otp');
        setInfoNotice(`A 6-digit OTP code has been sent via SMS to +91 ${cleanPhone}.`);
        setTimeout(() => {
          otpInputRefs.current[0]?.focus();
        }, 150);
      } else {
        setView('signin');
        setTimeout(() => {
          firstInputRef.current?.focus();
        }, 100);
      }
    }
  }, [isModalOpen, modalPhone, modalMode, context.customer]);

  // Timer countdown for OTP resend
  useEffect(() => {
    let interval: any;
    if (isModalOpen && view === 'otp' && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isModalOpen, view, resendTimer]);

  if (!isModalOpen) return null;

  // 1. Sign In Submit: checks if customer exists in server
  const handleSignInSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setInfoNotice(null);

    const normPhone = phone.replace(/\D/g, '').slice(-10);
    if (!normPhone || normPhone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsLoading(true);

    try {
      // Check customer existence in server
      const lookupResult = await context.lookupCustomer(normPhone);

      setIsLoading(false);

      if (!lookupResult.exists) {
        // Customer does not exist in server: Switch to SignUp interface with pre-filled phone
        setView('signup');
        setInfoNotice(`No account found for +91 ${normPhone}. Please enter your details below to create an account.`);
      } else {
        // Customer exists: Proceed to OTP interface
        setView('otp');
        setOtp(['', '', '', '', '', '']);
        setResendTimer(30);
        setTimeout(() => {
          otpInputRefs.current[0]?.focus();
        }, 150);
      }
    } catch (err: any) {
      setIsLoading(false);
      setError('Unable to verify mobile number. Please check your internet connection.');
    }
  };

  // 2. Sign Up Submit: registers details and moves to OTP
  const handleSignUpSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setInfoNotice(null);

    const trimmedName = fullName.trim();
    const normPhone = phone.replace(/\D/g, '').slice(-10);

    if (!trimmedName) {
      setError('Please enter your full name.');
      return;
    }

    if (!normPhone || normPhone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);

    try {
      // Transition to OTP screen with pre-filled mobile number
      setIsLoading(false);
      setView('otp');
      setOtp(['', '', '', '', '', '']);
      setResendTimer(30);
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 150);
    } catch (err: any) {
      setIsLoading(false);
      setError('Unable to proceed. Please try again.');
    }
  };

  // 3. OTP verification handling
  const handleOtpChange = (index: number, val: string) => {
    const cleanVal = val.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = cleanVal;
    setOtp(newOtp);
    setError(null);

    if (cleanVal && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pasted[i] || '';
    }
    setOtp(newOtp);

    const nextIdx = Math.min(pasted.length, 5);
    otpInputRefs.current[nextIdx]?.focus();
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const fullOtp = otp.join('');
    const normPhone = phone.replace(/\D/g, '').slice(-10);

    if (!normPhone || normPhone.length !== 10) {
      setError('Please provide a valid 10-digit mobile number.');
      return;
    }

    if (fullOtp.length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await context.verifyOtp(normPhone, fullOtp, {
      fullName: fullName.trim() || undefined,
      email: email.trim() || undefined,
    });

    setIsLoading(false);

    if (!result.success) {
      setError(result.error || 'Invalid verification code. Please try again.');
      return;
    }

    const cName = result.customer?.fullName || fullName.trim() || 'Customer';
    setVerifiedName(cName);
    setIsSuccess(true);

    const callback = propOnSuccess || context.otpModalOnSuccess;
    if (callback) {
      callback(result.customer || null, result.defaultAddress || null);
    }

    setTimeout(() => {
      handleClose();
    }, 1800);
  };

  const handleResendOtp = async () => {
    setError(null);
    setResendTimer(30);
    const normPhone = phone.replace(/\D/g, '').slice(-10);
    if (normPhone) {
      await context.sendOtp(normPhone);
      setInfoNotice('A new 6-digit verification code has been sent to your mobile number.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
      onClick={(e) => {
        // Dismiss popup when user clicks outside the modal box
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-md overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition-colors z-10"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="bg-amber-900 text-white px-6 pt-6 pb-5 text-left relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-28 h-28 bg-amber-600/20 rounded-full blur-xl" />
          
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 bg-amber-800 text-amber-200 text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" /> Secure Authentication
            </span>
            {view === 'signup' && (
              <span className="inline-flex items-center gap-1 bg-emerald-600 text-white text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                <Sparkles className="w-3 h-3" /> Welcome Benefit
              </span>
            )}
          </div>

          <h3 className="text-xl font-bold font-heading text-white">
            {view === 'signin' && 'Sign In to Your Account'}
            {view === 'signup' && 'Create Customer Account'}
            {view === 'otp' && 'Enter 6-Digit OTP'}
          </h3>

          <p className="text-xs text-amber-200/90 mt-1 leading-relaxed">
            {view === 'signin' && 'Enter your mobile number to sign in & access saved preferences.'}
            {view === 'signup' && 'Register your details to enjoy instant 10% welcome savings & faster checkout.'}
            {view === 'otp' && `We've sent a 6-digit verification code to +91 ${phone || 'your mobile'}.`}
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Info Notice */}
          {infoNotice && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-left">
              {infoNotice}
            </div>
          )}

          {/* Error Notice */}
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-left">
              {error}
            </div>
          )}

          {/* Success Notice */}
          {isSuccess && (
            <div className="py-5 px-4 text-center space-y-2.5 bg-amber-50/80 border border-amber-200 rounded-2xl animate-in fade-in zoom-in duration-300">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs uppercase tracking-widest font-extrabold text-amber-700">
                  Welcome
                </p>
                <h3 className="text-2xl sm:text-3xl font-black text-amber-950 tracking-tight font-heading">
                  {verifiedName || fullName.trim() || context.customer?.fullName || 'Customer'}
                </h3>
              </div>
              <p className="text-xs text-stone-600 font-medium">
                Signed in successfully. Preparing your kitchen menu...
              </p>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW 1: SIGN IN (Mobile Number -> "Send me OTP")                           */}
          {/* ========================================================================= */}
          {view === 'signin' && (
            <form onSubmit={handleSignInSendOtp} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Mobile Number
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3 flex items-center gap-1 text-xs font-bold text-stone-600">
                    <Phone className="w-3.5 h-3.5 text-amber-800" />
                    <span>+91</span>
                  </div>
                  <input
                    ref={firstInputRef}
                    type="tel"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit mobile number"
                    className="w-full pl-16 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-semibold text-stone-900 focus:outline-none focus:border-amber-600 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || phone.length !== 10}
                className={`w-full py-3 px-4 rounded-xl font-bold text-sm text-white transition-all flex items-center justify-center gap-2 shadow-xs ${
                  isLoading || phone.length !== 10
                    ? 'bg-stone-400 cursor-not-allowed'
                    : 'bg-amber-800 hover:bg-amber-900 active:scale-[0.99]'
                }`}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Checking account...</span>
                  </>
                ) : (
                  <>
                    <span>Send me OTP</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Option to Switch to Sign Up */}
              <div className="pt-2 text-center border-t border-stone-100">
                <p className="text-xs text-stone-600">
                  New Customer?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setInfoNotice(null);
                      setView('signup');
                    }}
                    className="font-bold text-amber-800 hover:text-amber-900 underline transition-colors"
                  >
                    Create account
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* ========================================================================= */}
          {/* VIEW 2: SIGN UP (Full Name, Phone, Email -> "Create Account")             */}
          {/* ========================================================================= */}
          {view === 'signup' && (
            <form onSubmit={handleSignUpSubmit} className="space-y-3.5 text-left">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Full Name <span className="text-rose-600">*</span>
                </label>
                <div className="relative flex items-center">
                  <User className="w-4 h-4 absolute left-3 text-stone-400" />
                  <input
                    ref={firstInputRef}
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium text-stone-900 focus:outline-none focus:border-amber-600 focus:bg-white"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Mobile Number <span className="text-rose-600">*</span>
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3 flex items-center gap-1 text-xs font-bold text-stone-600">
                    <Phone className="w-3.5 h-3.5 text-amber-800" />
                    <span>+91</span>
                  </div>
                  <input
                    type="tel"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit mobile number"
                    className="w-full pl-16 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium text-stone-900 focus:outline-none focus:border-amber-600 focus:bg-white"
                  />
                </div>
              </div>

              {/* Email (Optional) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                    Email Address
                  </label>
                  <span className="text-[11px] text-stone-400 font-medium">(Optional)</span>
                </div>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 absolute left-3 text-stone-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium text-stone-900 focus:outline-none focus:border-amber-600 focus:bg-white"
                  />
                </div>
              </div>

              <p className="text-[11px] text-stone-500 leading-tight">
                Delivery address will be requested conveniently during checkout.
              </p>

              <button
                type="submit"
                disabled={isLoading || !fullName.trim() || phone.length !== 10}
                className={`w-full py-3 px-4 rounded-xl font-bold text-sm text-white transition-all flex items-center justify-center gap-2 shadow-xs mt-1 ${
                  isLoading || !fullName.trim() || phone.length !== 10
                    ? 'bg-stone-400 cursor-not-allowed'
                    : 'bg-amber-800 hover:bg-amber-900 active:scale-[0.99]'
                }`}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Preparing Account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Option to Switch back to Sign In */}
              <div className="pt-2 text-center border-t border-stone-100">
                <p className="text-xs text-stone-600">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setInfoNotice(null);
                      setView('signin');
                    }}
                    className="font-bold text-amber-800 hover:text-amber-900 underline transition-colors"
                  >
                    Sign In
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* ========================================================================= */}
          {/* VIEW 3: OTP INTERFACE ("Enter 6-Digit OTP")                                */}
          {/* ========================================================================= */}
          {view === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4 text-left">
              {/* Phone display with edit action */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-wider font-bold text-stone-500">
                    Verifying Mobile
                  </div>
                  <div className="text-sm font-bold text-stone-900 font-mono">
                    +91 {phone}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setInfoNotice(null);
                    setView('signin');
                  }}
                  className="text-xs font-bold text-amber-800 hover:text-amber-900 underline flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Change</span>
                </button>
              </div>

              {/* 6 Digit Inputs */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                  Enter 6-Digit OTP
                </label>

                <div
                  className="flex items-center justify-between gap-1.5 sm:gap-2"
                  onPaste={handleOtpPaste}
                >
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (otpInputRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className={`w-11 h-12 sm:w-12 sm:h-14 text-center font-bold text-lg sm:text-xl rounded-xl border transition-all ${
                        digit
                          ? 'border-amber-700 bg-amber-50/50 text-amber-950 ring-2 ring-amber-700/20'
                          : 'border-stone-200 bg-stone-50 text-stone-900 focus:border-amber-600 focus:bg-white'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <button
                type="submit"
                disabled={isLoading || isSuccess || otp.join('').length !== 6}
                className={`w-full py-3 px-4 rounded-xl font-bold text-sm text-white transition-all flex items-center justify-center gap-2 shadow-xs ${
                  isLoading || isSuccess || otp.join('').length !== 6
                    ? 'bg-stone-400 cursor-not-allowed'
                    : 'bg-amber-800 hover:bg-amber-900 active:scale-[0.99]'
                }`}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying OTP...</span>
                  </>
                ) : isSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verified!</span>
                  </>
                ) : (
                  <>
                    <span>Verify & Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Resend OTP */}
              <div className="flex items-center justify-between text-xs text-stone-500 pt-1">
                <span>Didn't receive the SMS code?</span>
                {resendTimer > 0 ? (
                  <span className="font-semibold text-stone-400">Resend in {resendTimer}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    className="font-bold text-amber-800 hover:underline"
                  >
                    Resend OTP
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};
