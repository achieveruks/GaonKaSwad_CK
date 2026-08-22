import React, { createContext, useContext, useState, useEffect } from 'react';
import { Customer, CustomerAddress } from '../types';
import {
  fetchSupabaseCustomerByPhone,
  upsertSupabaseCustomer,
  upsertSupabaseCustomerAddress,
} from '../lib/supabaseService';
import { isSupabaseConfigured } from '../lib/supabase';

interface CustomerContextType {
  customer: Customer | null;
  defaultAddress: CustomerAddress | null;
  isCustomerLoggedIn: boolean;
  isWelcomeDiscountEligible: boolean;
  isOtpModalOpen: boolean;
  otpModalPhone: string;
  otpModalMode: 'signin' | 'create_account' | 'verify_review';
  otpModalOnSuccess?: (customer: Customer | null, address: CustomerAddress | null) => void;
  openOtpModal: (
    phone: string,
    mode: 'signin' | 'create_account' | 'verify_review',
    onSuccess?: (customer: Customer | null, address: CustomerAddress | null) => void
  ) => void;
  closeOtpModal: () => void;
  sendOtp: (phone: string) => Promise<{ success: boolean; exists: boolean; message?: string; error?: string }>;
  verifyOtp: (
    phone: string,
    otp: string,
    extraData?: { fullName?: string; email?: string }
  ) => Promise<{
    success: boolean;
    error?: string;
    customer?: Customer | null;
    defaultAddress?: CustomerAddress | null;
    welcomeDiscountEligible?: boolean;
    isNewCustomer?: boolean;
  }>;
  lookupCustomer: (phone: string) => Promise<{
    exists: boolean;
    customer?: Customer | null;
    defaultAddress?: CustomerAddress | null;
    welcomeDiscountEligible?: boolean;
  }>;
  saveProfile: (data: {
    phone: string;
    fullName?: string;
    email?: string;
    marketingConsent?: boolean;
    address?: Partial<CustomerAddress>;
  }) => Promise<{ success: boolean; customer?: Customer; error?: string }>;
  logoutCustomer: () => void;
  checkReviewEligibility: (
    productId: string | number,
    phoneOrId?: string
  ) => Promise<{ eligible: boolean; orderId?: string; message?: string }>;
  submitVerifiedReview: (data: {
    productId: string | number;
    userName: string;
    userLocation?: string;
    rating: number;
    comment: string;
    phone?: string;
    customerId?: string;
    orderId?: string;
  }) => Promise<{ success: boolean; message?: string; error?: string; product?: any; review?: any }>;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

const STORAGE_KEY_CUSTOMER = 'gaonkaswad_customer_v1';
const STORAGE_KEY_ADDRESS = 'gaonkaswad_cust_address_v1';

export const CustomerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customer, setCustomer] = useState<Customer | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CUSTOMER);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [defaultAddress, setDefaultAddress] = useState<CustomerAddress | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ADDRESS);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isWelcomeDiscountEligible, setIsWelcomeDiscountEligible] = useState<boolean>(() => {
    if (!customer) return true;
    return !customer.welcomeDiscountUsed;
  });

  // Modal State
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [otpModalPhone, setOtpModalPhone] = useState('');
  const [otpModalMode, setOtpModalMode] = useState<'signin' | 'create_account' | 'verify_review'>('signin');
  const [otpModalCallback, setOtpModalCallback] = useState<
    ((cust: Customer | null, addr: CustomerAddress | null) => void) | undefined
  >(undefined);

  useEffect(() => {
    if (customer) {
      localStorage.setItem(STORAGE_KEY_CUSTOMER, JSON.stringify(customer));
      setIsWelcomeDiscountEligible(!customer.welcomeDiscountUsed);
    } else {
      localStorage.removeItem(STORAGE_KEY_CUSTOMER);
      setIsWelcomeDiscountEligible(true);
    }
  }, [customer]);

  useEffect(() => {
    if (defaultAddress) {
      localStorage.setItem(STORAGE_KEY_ADDRESS, JSON.stringify(defaultAddress));
    } else {
      localStorage.removeItem(STORAGE_KEY_ADDRESS);
    }
  }, [defaultAddress]);

  const openOtpModal = (
    phone: string,
    mode: 'signin' | 'create_account' | 'verify_review',
    onSuccess?: (cust: Customer | null, addr: CustomerAddress | null) => void
  ) => {
    setOtpModalPhone(phone);
    setOtpModalMode(mode);
    setOtpModalCallback(() => onSuccess);
    setIsOtpModalOpen(true);
  };

  const closeOtpModal = () => {
    setIsOtpModalOpen(false);
    setOtpModalCallback(undefined);
  };

  const sendOtp = async (phone: string) => {
    const normPhone = String(phone || '').replace(/\D/g, '').slice(-10);
    if (!normPhone || normPhone.length !== 10) {
      return { success: false, exists: false, error: 'Please enter a valid 10-digit mobile number' };
    }

    try {
      // Check Supabase first if available
      let existsInSupabase = false;
      if (isSupabaseConfigured()) {
        try {
          const { customer } = await fetchSupabaseCustomerByPhone(normPhone);
          if (customer) existsInSupabase = true;
        } catch (e) {
          console.warn('Supabase lookup during sendOtp error:', e);
        }
      }

      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normPhone }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, exists: existsInSupabase, error: data.error || 'Failed to send OTP' };
      }
      return {
        success: true,
        exists: existsInSupabase || !!data.exists,
        message: data.message,
      };
    } catch (err: any) {
      console.error('sendOtp error:', err);
      return { success: false, exists: false, error: err.message || 'Network error sending OTP' };
    }
  };

  const verifyOtp = async (
    phone: string,
    otp: string,
    extraData?: { fullName?: string; email?: string }
  ) => {
    const normPhone = String(phone || '').replace(/\D/g, '').slice(-10);
    const cleanOtp = String(otp || '').trim();

    if (!normPhone || normPhone.length !== 10) {
      return { success: false, error: 'Invalid 10-digit mobile number' };
    }
    if (!cleanOtp || cleanOtp.length !== 6) {
      return { success: false, error: 'Please enter the 6-digit OTP' };
    }

    try {
      // 1. Server-level verification
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normPhone, otp: cleanOtp, ...extraData }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Invalid OTP. Please check the code and try again.',
        };
      }

      let verifiedCustomer: Customer = data.customer;
      let defaultAddr: CustomerAddress | null = data.defaultAddress || null;

      // 2. Direct Supabase Persistence to ensure public.customers entry is recorded
      if (isSupabaseConfigured()) {
        try {
          const supaCust = await upsertSupabaseCustomer({
            phone: normPhone,
            fullName: extraData?.fullName || verifiedCustomer?.fullName || 'Customer',
            email: extraData?.email || verifiedCustomer?.email,
          });
          if (supaCust) {
            verifiedCustomer = { ...verifiedCustomer, ...supaCust };
          }
        } catch (supaErr) {
          console.warn('Supabase customer upsert warning:', supaErr);
        }
      }

      if (verifiedCustomer) {
        setCustomer(verifiedCustomer);
      }
      if (defaultAddr) {
        setDefaultAddress(defaultAddr);
      }
      setIsWelcomeDiscountEligible(data.welcomeDiscountEligible !== false);

      if (otpModalCallback) {
        otpModalCallback(verifiedCustomer, defaultAddr);
      }

      return {
        success: true,
        customer: verifiedCustomer,
        defaultAddress: defaultAddr,
        welcomeDiscountEligible: data.welcomeDiscountEligible !== false,
        isNewCustomer: data.isNewCustomer,
      };
    } catch (err: any) {
      console.error('verifyOtp error:', err);
      return { success: false, error: err.message || 'Network error verifying OTP' };
    }
  };

  const lookupCustomer = async (phone: string) => {
    const normPhone = String(phone || '').replace(/\D/g, '').slice(-10);
    if (!normPhone || normPhone.length !== 10) {
      return { exists: false, customer: null, defaultAddress: null };
    }

    try {
      // Try direct Supabase lookup first
      if (isSupabaseConfigured()) {
        try {
          const { customer, defaultAddress } = await fetchSupabaseCustomerByPhone(normPhone);
          if (customer) {
            return {
              exists: true,
              customer,
              defaultAddress,
              welcomeDiscountEligible: !customer.welcomeDiscountUsed,
            };
          }
        } catch (supaErr) {
          console.warn('Supabase customer lookup exception:', supaErr);
        }
      }

      const res = await fetch(`/api/customers/lookup?phone=${encodeURIComponent(normPhone)}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { exists: false, customer: null, defaultAddress: null };
      }
      return {
        exists: !!data.exists,
        customer: data.customer || null,
        defaultAddress: data.defaultAddress || null,
        welcomeDiscountEligible: data.welcomeDiscountEligible !== false,
      };
    } catch (err) {
      console.error('lookupCustomer error:', err);
      return { exists: false, customer: null, defaultAddress: null };
    }
  };

  const saveProfile = async (data: {
    phone: string;
    fullName?: string;
    email?: string;
    marketingConsent?: boolean;
    address?: Partial<CustomerAddress>;
  }) => {
    const normPhone = String(data.phone || '').replace(/\D/g, '').slice(-10);

    // If Supabase is active, persist directly
    if (isSupabaseConfigured() && normPhone) {
      try {
        const supaCust = await upsertSupabaseCustomer({
          phone: normPhone,
          fullName: data.fullName,
          email: data.email,
          marketingConsent: data.marketingConsent,
        });

        let supaAddr: CustomerAddress | null = null;
        if (data.address && data.address.fullAddress && supaCust.id) {
          supaAddr = await upsertSupabaseCustomerAddress(supaCust.id, data.address);
        }

        setCustomer(supaCust);
        if (supaAddr) setDefaultAddress(supaAddr);
      } catch (err) {
        console.warn('Direct Supabase profile save failed:', err);
      }
    }

    try {
      const res = await fetch('/api/customers/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const resData = await res.json();

      if (!res.ok || !resData.success) {
        return { success: false, error: resData.error || 'Failed to save customer profile' };
      }

      if (resData.customer) {
        setCustomer(resData.customer);
      }
      if (resData.defaultAddress) {
        setDefaultAddress(resData.defaultAddress);
      }

      return { success: true, customer: resData.customer };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error saving profile' };
    }
  };

  const logoutCustomer = () => {
    setCustomer(null);
    setDefaultAddress(null);
    setIsWelcomeDiscountEligible(true);
    localStorage.removeItem(STORAGE_KEY_CUSTOMER);
    localStorage.removeItem(STORAGE_KEY_ADDRESS);
  };

  const checkReviewEligibility = async (productId: string | number, phoneOrId?: string) => {
    try {
      const idToCheck = phoneOrId || customer?.id || customer?.phone;
      if (!idToCheck) {
        return { eligible: false, message: 'Please provide customer mobile number to verify purchase.' };
      }

      const res = await fetch(`/api/reviews/eligibility?productId=${encodeURIComponent(productId)}&phone=${encodeURIComponent(idToCheck)}`);
      const data = await res.json();
      return {
        eligible: !!data.eligible,
        orderId: data.orderId,
        message: data.message,
      };
    } catch (err: any) {
      return { eligible: false, message: 'Error verifying purchase eligibility' };
    }
  };

  const submitVerifiedReview = async (data: {
    productId: string | number;
    userName: string;
    userLocation?: string;
    rating: number;
    comment: string;
    phone?: string;
    customerId?: string;
    orderId?: string;
  }) => {
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          customerId: data.customerId || customer?.id,
          phone: data.phone || customer?.phone,
        }),
      });
      const resData = await res.json();

      if (!res.ok || !resData.success) {
        return { success: false, error: resData.error || 'Failed to submit review' };
      }

      return {
        success: true,
        message: resData.message,
        product: resData.product,
        review: resData.review,
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error submitting review' };
    }
  };

  return (
    <CustomerContext.Provider
      value={{
        customer,
        defaultAddress,
        isCustomerLoggedIn: !!customer,
        isWelcomeDiscountEligible,
        isOtpModalOpen,
        otpModalPhone,
        otpModalMode,
        otpModalOnSuccess: otpModalCallback,
        openOtpModal,
        closeOtpModal,
        sendOtp,
        verifyOtp,
        lookupCustomer,
        saveProfile,
        logoutCustomer,
        checkReviewEligibility,
        submitVerifiedReview,
      }}
    >
      {children}
    </CustomerContext.Provider>
  );
};

export const useCustomer = () => {
  const context = useContext(CustomerContext);
  if (!context) {
    throw new Error('useCustomer must be used within a CustomerProvider');
  }
  return context;
};
