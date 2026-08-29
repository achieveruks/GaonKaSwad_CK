import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Customer, CustomerAddress } from '../types';
import {
  fetchSupabaseCustomerByPhone,
  fetchSupabaseCustomerAddresses,
  insertSupabaseCustomerAddress,
  updateSupabaseCustomerAddress,
  deleteSupabaseCustomerAddress,
  upsertSupabaseCustomer,
  upsertSupabaseCustomerAddress,
} from '../lib/supabaseService';
import { isSupabaseConfigured } from '../lib/supabase';

interface CustomerContextType {
  customer: Customer | null;
  defaultAddress: CustomerAddress | null;
  savedAddresses: CustomerAddress[];
  isCustomerLoggedIn: boolean;
  isWelcomeDiscountEligible: boolean;
  isOtpModalOpen: boolean;
  otpModalPhone: string;
  otpModalMode: 'signin' | 'create_account' | 'verify_review' | 'direct_otp' | 'signin_otp';
  otpModalOnSuccess?: (customer: Customer | null, address: CustomerAddress | null) => void;
  openOtpModal: (
    phone: string,
    mode: 'signin' | 'create_account' | 'verify_review' | 'direct_otp' | 'signin_otp',
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
  fetchCustomerAddresses: (customerId?: string, phone?: string) => Promise<CustomerAddress[]>;
  saveNewAddress: (
    addressData: Partial<CustomerAddress>,
    customerId?: string,
    phone?: string
  ) => Promise<CustomerAddress | null>;
  updateAddress: (
    addressId: string,
    addressData: Partial<CustomerAddress>,
    customerId?: string,
    phone?: string
  ) => Promise<CustomerAddress | null>;
  deleteAddress: (addressId: string, customerId?: string, phone?: string) => Promise<boolean>;
  setAddressAsDefault: (addressId: string, customerId?: string, phone?: string) => Promise<boolean>;
  setDefaultDeliveryAddress: (address: CustomerAddress) => void;
  saveProfile: (data: {
    phone: string;
    fullName?: string;
    email?: string;
    marketingConsent?: boolean;
    address?: Partial<CustomerAddress>;
  }) => Promise<{
    success: boolean;
    customer?: Customer;
    address?: CustomerAddress | null;
    error?: string;
  }>;
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

// Helper to deduplicate address arrays by ID and normalized text
const deduplicateAddresses = (addresses: CustomerAddress[]): CustomerAddress[] => {
  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();
  const result: CustomerAddress[] = [];

  for (const addr of addresses) {
    if (!addr) continue;
    const addrId = String(addr.id || '').trim();
    const key = `${(addr.fullAddress || '').trim().toLowerCase()}|${(addr.pincode || '').trim()}`;

    if (addrId && seenIds.has(addrId)) continue;
    if (key && seenKeys.has(key)) continue;

    if (addrId) seenIds.add(addrId);
    if (key) seenKeys.add(key);
    result.push(addr);
  }
  return result;
};

export const CustomerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customer, setCustomer] = useState<Customer | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CUSTOMER);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Default address is loaded dynamically from database only (no localStorage)
  const [defaultAddress, setDefaultAddress] = useState<CustomerAddress | null>(null);

  // Saved addresses are loaded directly from the database (no caching)
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);

  // Clear any legacy client-side address cache from previous app versions
  useEffect(() => {
    try {
      localStorage.removeItem('gaonkaswad_cust_address_v1');
      localStorage.removeItem('gaonkaswad_cust_all_addresses_v1');
      localStorage.removeItem('gaonkaswad_address_cache');
    } catch {}
  }, []);

  const [isWelcomeDiscountEligible, setIsWelcomeDiscountEligible] = useState<boolean>(() => {
    if (!customer) return true;
    return !customer.welcomeDiscountUsed;
  });

  // Modal State
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [otpModalPhone, setOtpModalPhone] = useState('');
  const [otpModalMode, setOtpModalMode] = useState<'signin' | 'create_account' | 'verify_review' | 'direct_otp' | 'signin_otp'>('signin');
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

  // Load customer addresses directly from database (always fresh, zero client cache)
  const fetchCustomerAddresses = useCallback(async (customerId?: string, phone?: string): Promise<CustomerAddress[]> => {
    const targetCustId = customerId || customer?.id;
    const targetPhone = phone || customer?.phone;

    if (!targetCustId && !targetPhone) {
      setSavedAddresses([]);
      setDefaultAddress(null);
      return [];
    }

    try {
      // 1. Direct Supabase fetch if configured
      if (isSupabaseConfigured()) {
        try {
          let supaCustUuid = targetCustId;
          // If custId is not a UUID, try to resolve via phone first
          if (!supaCustUuid || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(supaCustUuid)) {
            if (targetPhone) {
              const norm = targetPhone.replace(/\D/g, '').slice(-10);
              const { customer: foundCust } = await fetchSupabaseCustomerByPhone(norm);
              if (foundCust?.id) {
                supaCustUuid = foundCust.id;
              }
            }
          }

          if (supaCustUuid && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(supaCustUuid)) {
            const addrs = await fetchSupabaseCustomerAddresses(supaCustUuid);
            const unique = deduplicateAddresses(addrs || []);
            setSavedAddresses(unique);
            if (unique.length > 0) {
              setDefaultAddress((prev) => {
                if (prev?.id) {
                  const match = unique.find((a) => a.id === prev.id);
                  if (match) return match;
                }
                return unique.find((a) => a.isDefault) || unique[0];
              });
            } else {
              setDefaultAddress(null);
            }
            return unique;
          }
        } catch (e) {
          console.warn('Supabase fetchCustomerAddresses warning:', e);
        }
      }

      // 2. Server API query with cache-busting timestamp
      const q = new URLSearchParams();
      if (targetCustId) q.append('customerId', targetCustId);
      if (targetPhone) q.append('phone', targetPhone);
      q.append('_t', Date.now().toString());

      const res = await fetch(`/api/customers/addresses?${q.toString()}`, {
        headers: { 'Cache-Control': 'no-cache' },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.addresses)) {
        const unique = deduplicateAddresses(data.addresses);
        setSavedAddresses(unique);
        if (unique.length > 0) {
          setDefaultAddress((prev) => {
            if (prev?.id) {
              const match = unique.find((a) => a.id === prev.id);
              if (match) return match;
            }
            return unique.find((a) => a.isDefault) || unique[0];
          });
        } else {
          setDefaultAddress(null);
        }
        return unique;
      }
    } catch (err) {
      console.warn('Failed to fetch customer addresses:', err);
    }
    return [];
  }, [customer?.id, customer?.phone]);

  useEffect(() => {
    if (customer?.id || customer?.phone) {
      fetchCustomerAddresses(customer?.id, customer?.phone);
    }
  }, [customer?.id, customer?.phone, fetchCustomerAddresses]);

  const saveNewAddress = async (
    addressData: Partial<CustomerAddress>,
    optCustId?: string,
    optPhone?: string
  ): Promise<CustomerAddress | null> => {
    const custId = optCustId || customer?.id;
    const phone = optPhone || customer?.phone;

    let savedAddr: CustomerAddress | null = null;

    // 1. Direct Supabase insert if configured & customerId is a valid UUID
    if (
      isSupabaseConfigured() &&
      custId &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(custId)
    ) {
      try {
        savedAddr = await insertSupabaseCustomerAddress(custId, addressData);
      } catch (err) {
        console.warn('Direct Supabase saveNewAddress error, falling back to server API:', err);
      }
    }

    // 2. Server API fallback if direct Supabase insert didn't complete
    if (!savedAddr) {
      try {
        const res = await fetch('/api/customers/addresses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId: custId,
            phone,
            address: addressData,
          }),
        });
        const data = await res.json();
        if (data.success && data.address) {
          savedAddr = data.address;
        } else if (data.error) {
          console.warn('Server saveNewAddress error message:', data.error);
        }
      } catch (err) {
        console.warn('Server saveNewAddress network error:', err);
      }
    }

    // 3. Immediately re-fetch all addresses fresh from database
    await fetchCustomerAddresses(custId, phone);

    if (savedAddr && (savedAddr.isDefault || !defaultAddress)) {
      setDefaultAddress(savedAddr);
    }

    return savedAddr;
  };

  const updateAddress = async (
    addressId: string,
    addressData: Partial<CustomerAddress>,
    optCustId?: string,
    optPhone?: string
  ): Promise<CustomerAddress | null> => {
    const custId = optCustId || customer?.id;
    const phone = optPhone || customer?.phone;

    let updatedAddr: CustomerAddress | null = null;

    if (isSupabaseConfigured() && addressId && !addressId.startsWith('addr-')) {
      try {
        updatedAddr = await updateSupabaseCustomerAddress(addressId, addressData);
      } catch (err) {
        console.warn('Direct Supabase updateAddress error:', err);
      }
    }

    if (!updatedAddr) {
      try {
        const res = await fetch(`/api/customers/addresses/${encodeURIComponent(addressId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: addressData }),
        });
        const data = await res.json();
        if (data.success && data.address) {
          updatedAddr = data.address;
        }
      } catch (err) {
        console.warn('Server updateAddress error:', err);
      }
    }

    // Immediately re-fetch fresh state from the database
    await fetchCustomerAddresses(custId, phone);

    if (updatedAddr && defaultAddress?.id === addressId) {
      setDefaultAddress(updatedAddr);
    }

    return updatedAddr;
  };

  const deleteAddress = async (
    addressId: string,
    optCustId?: string,
    optPhone?: string
  ): Promise<boolean> => {
    const custId = optCustId || customer?.id;
    const phone = optPhone || customer?.phone;

    let success = false;

    if (isSupabaseConfigured() && addressId && !addressId.startsWith('addr-')) {
      try {
        success = await deleteSupabaseCustomerAddress(addressId);
      } catch (err) {
        console.warn('Direct Supabase deleteAddress error:', err);
      }
    }

    if (!success) {
      try {
        const res = await fetch(`/api/customers/addresses/${encodeURIComponent(addressId)}`, {
          method: 'DELETE',
        });
        const data = await res.json();
        if (data.success) {
          success = true;
        }
      } catch (err) {
        console.warn('Server deleteAddress error:', err);
      }
    }

    // Always fetch fresh list directly from database after deletion
    await fetchCustomerAddresses(custId, phone);

    return success;
  };

  const setAddressAsDefault = async (
    addressId: string,
    optCustId?: string,
    optPhone?: string
  ): Promise<boolean> => {
    const custId = optCustId || customer?.id;
    const phone = optPhone || customer?.phone;

    try {
      const updated = await updateAddress(addressId, { isDefault: true }, custId, phone);
      if (updated) {
        setDefaultAddress(updated);
        return true;
      }
    } catch (err) {
      console.warn('setAddressAsDefault error:', err);
    }
    return false;
  };

  const setDefaultDeliveryAddress = (address: CustomerAddress) => {
    setDefaultAddress(address);
    setSavedAddresses((prev) =>
      prev.map((a) => ({
        ...a,
        isDefault: a.id === address.id,
      }))
    );
  };

  const openOtpModal = (
    phone: string,
    mode: 'signin' | 'create_account' | 'verify_review' | 'direct_otp' | 'signin_otp',
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

    let directSupaCust: Customer | null = null;
    let directSupaAddr: CustomerAddress | null = null;

    // If Supabase is active, persist directly
    if (isSupabaseConfigured() && normPhone) {
      try {
        const supaCust = await upsertSupabaseCustomer({
          phone: normPhone,
          fullName: data.fullName,
          email: data.email,
          marketingConsent: data.marketingConsent,
        });
        directSupaCust = supaCust;

        if (data.address && data.address.fullAddress && supaCust.id) {
          directSupaAddr = await upsertSupabaseCustomerAddress(supaCust.id, data.address);
        }

        setCustomer(supaCust);
        if (directSupaAddr) {
          setDefaultAddress(directSupaAddr);
          setSavedAddresses((prev) => deduplicateAddresses([directSupaAddr!, ...prev.filter((a) => a.id !== directSupaAddr!.id)]));
        }
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
        return {
          success: false,
          customer: directSupaCust || undefined,
          address: directSupaAddr || null,
          error: resData.error || 'Failed to save customer profile',
        };
      }

      if (resData.customer) {
        setCustomer(resData.customer);
      }
      if (resData.defaultAddress) {
        setDefaultAddress(resData.defaultAddress);
        setSavedAddresses((prev) => deduplicateAddresses([resData.defaultAddress, ...prev.filter((a) => a.id !== resData.defaultAddress.id)]));
      }

      return {
        success: true,
        customer: resData.customer || directSupaCust || undefined,
        address: resData.defaultAddress || directSupaAddr || null,
      };
    } catch (err: any) {
      return {
        success: !!directSupaCust,
        customer: directSupaCust || undefined,
        address: directSupaAddr || null,
        error: err.message || 'Network error saving profile',
      };
    }
  };

  const logoutCustomer = () => {
    setCustomer(null);
    setDefaultAddress(null);
    setSavedAddresses([]);
    setIsWelcomeDiscountEligible(true);
    localStorage.removeItem(STORAGE_KEY_CUSTOMER);
    try {
      localStorage.removeItem('gaonkaswad_cust_address_v1');
      localStorage.removeItem('gaonkaswad_cust_all_addresses_v1');
    } catch {}
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
        savedAddresses,
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
        fetchCustomerAddresses,
        saveNewAddress,
        updateAddress,
        deleteAddress,
        setAddressAsDefault,
        setDefaultDeliveryAddress,
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
