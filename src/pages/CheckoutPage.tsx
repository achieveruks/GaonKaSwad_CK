import React, { useState, useEffect, useMemo } from 'react';
import { useCart } from '../context/CartContext';
import { useNavigation } from '../context/NavigationContext';
import { useLocation } from '../context/LocationContext';
import { useCustomer } from '../context/CustomerContext';
import { CheckoutFormData, Order } from '../types';
import { computeScheduledIsoTimestamp, formatScheduledAt } from '../utils/dateUtils';
import {
  getProductPortionsLeftAtOutlet,
  doesOutletDeliverToPinCode,
  findOutletDeliveringToPinCode,
  getOutletById,
} from '../lib/locationService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getNextSequentialOrderId, createSupabaseOrder } from '../lib/supabaseService';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  Truck,
  ShieldCheck,
  CreditCard,
  QrCode,
  Banknote,
  Building2,
  ShoppingBag,
  ArrowRight,
  Clock,
  MapPin,
  Sparkles,
  Printer,
  ChevronRight,
  PhoneCall,
  Utensils,
  Store,
  AlertCircle,
  UserCheck,
  Lock,
  Gift,
  Check,
  UserPlus,
  RefreshCw,
  Tag,
  AlertTriangle,
  Info,
  PackageCheck,
  Navigation,
  Edit3,
  Plus,
  RotateCcw,
  Zap,
  Home,
  Briefcase,
  Bookmark,
  Trash2,
  Calendar,
  Sun,
  Moon,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ScheduleTimeSlot {
  id: string;
  timeRange: string;
  category: 'Lunch' | 'Evening Dining' | 'Dinner';
  categoryLabel: string;
  label: string;
  description: string;
  isPopular?: boolean;
}

const SCHEDULE_TIME_SLOTS: ScheduleTimeSlot[] = [
  // Lunch Slots
  {
    id: 'lunch-1',
    timeRange: '12:30 PM – 1:30 PM',
    category: 'Lunch',
    categoryLabel: 'lunch delivery',
    label: 'Early Lunch',
    description: 'Fresh noon meal dispatch',
  },
  {
    id: 'lunch-2',
    timeRange: '1:30 PM – 2:30 PM',
    category: 'Lunch',
    categoryLabel: 'lunch delivery',
    label: 'Prime Lunch',
    description: 'Hot clay pot arrival',
    isPopular: true,
  },
  {
    id: 'lunch-3',
    timeRange: '2:30 PM – 3:30 PM',
    category: 'Lunch',
    categoryLabel: 'lunch delivery',
    label: 'Late Lunch',
    description: 'Post-afternoon feast',
  },
  // Evening & Dinner Slots
  {
    id: 'dinner-1',
    timeRange: '7:00 PM – 8:00 PM',
    category: 'Evening Dining',
    categoryLabel: 'evening delivery',
    label: 'Early Dinner',
    description: 'Sunset kitchen cooking',
  },
  {
    id: 'dinner-2',
    timeRange: '8:00 PM – 9:00 PM',
    category: 'Evening Dining',
    categoryLabel: 'evening delivery',
    label: 'Evening Dining',
    description: 'Prime evening family feast',
    isPopular: true,
  },
  {
    id: 'dinner-3',
    timeRange: '9:00 PM – 10:00 PM',
    category: 'Dinner',
    categoryLabel: 'dinner delivery',
    label: 'Late Dinner',
    description: 'Night dining dispatch',
  },
  {
    id: 'dinner-4',
    timeRange: '10:00 PM – 10:30 PM',
    category: 'Dinner',
    categoryLabel: 'dinner delivery',
    label: 'Late Night Dum',
    description: 'Midnight celebration',
  },
];

export const CheckoutPage: React.FC = () => {
  const {
    cart,
    subtotal,
    discount,
    deliveryFee,
    packagingFee,
    gst,
    appliedCoupon,
    includeCutlery,
    specialInstructions,
    clearCart,
    adaptCartForNewOutlet,
  } = useCart();

  const { goToHome, goToShop, goToProfile } = useNavigation();
  const {
    selectedLocation,
    outlets,
    deliveryZones,
    currentOutlet,
    setIsLocationModalOpen,
    requestLocationChange,
  } = useLocation();
  const {
    customer,
    defaultAddress,
    savedAddresses,
    isCustomerLoggedIn,
    isWelcomeDiscountEligible,
    lookupCustomer,
    openOtpModal,
    sendOtp,
    saveProfile,
    fetchCustomerAddresses,
    saveNewAddress,
    updateAddress,
    deleteAddress,
    setDefaultDeliveryAddress,
  } = useCustomer();

  // Delivery vs Self-Pickup Mode
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery');
  const [isSelfPickup, setIsSelfPickup] = useState(false);

  // Next 10 Days Calculation for Scheduled Slot
  const next10Days = useMemo(() => {
    const days: Array<{
      dateStr: string;
      dayName: string;
      dayNumber: number;
      monthName: string;
      formatted: string;
      isToday: boolean;
      isTomorrow: boolean;
    }> = [];
    const today = new Date();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 0; i < 10; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dayName = dayNames[d.getDay()];
      const dayNumber = d.getDate();
      const monthName = monthNames[d.getMonth()];
      const year = d.getFullYear();
      const monthPadded = String(d.getMonth() + 1).padStart(2, '0');
      const dayPadded = String(dayNumber).padStart(2, '0');
      const dateStr = `${year}-${monthPadded}-${dayPadded}`;
      const formatted = `${dayName}, ${dayNumber} ${monthName}`;

      days.push({
        dateStr,
        dayName,
        dayNumber,
        monthName,
        formatted,
        isToday: i === 0,
        isTomorrow: i === 1,
      });
    }
    return days;
  }, []);

  const defaultScheduleDate = next10Days[0]?.formatted || 'Today';
  const defaultScheduleDateStr = next10Days[0]?.dateStr || '';
  const defaultScheduleTime = '8:00 PM – 9:00 PM';
  const defaultScheduleCategory = 'evening delivery';

  // Schedule Slot Modal & Selected Values State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedScheduleDate, setSelectedScheduleDate] = useState(defaultScheduleDate);
  const [selectedScheduleDateStr, setSelectedScheduleDateStr] = useState(defaultScheduleDateStr);
  const [selectedScheduleTime, setSelectedScheduleTime] = useState(defaultScheduleTime);
  const [selectedScheduleCategory, setSelectedScheduleCategory] = useState(defaultScheduleCategory);

  // Modal temporary selection state
  const [modalScheduleDate, setModalScheduleDate] = useState(defaultScheduleDate);
  const [modalScheduleDateStr, setModalScheduleDateStr] = useState(defaultScheduleDateStr);
  const [modalScheduleTime, setModalScheduleTime] = useState(defaultScheduleTime);
  const [modalScheduleCategory, setModalScheduleCategory] = useState(defaultScheduleCategory);

  // Form State
  const [formData, setFormData] = useState<CheckoutFormData>({
    fullName: customer?.fullName || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    address: defaultAddress?.fullAddress || '',
    landmark: defaultAddress?.landmark || '',
    city: defaultAddress?.city || '',
    state: defaultAddress?.state || '',
    pincode: defaultAddress?.pincode || '',
    deliveryType: 'immediate',
    scheduledAt: undefined,
    scheduledDate: defaultScheduleDate,
    scheduledTimeSlot: defaultScheduleTime,
    scheduledSlotCategory: defaultScheduleCategory,
    scheduledSlotLabel: `Scheduled for ${defaultScheduleCategory} (Delivery between ${defaultScheduleTime} on ${defaultScheduleDate})`,
    deliveryNotes: specialInstructions || '',
    paymentMethod: 'upi',
    includeCutlery,
    createAccount: !isCustomerLoggedIn, // default checked for new users to get 10% welcome discount
    marketingConsent: true,
    isPhoneVerified: !!isCustomerLoggedIn,
    orderType: 'delivery',
    isSelfPickup: false,
  });

  const handleOpenScheduleModal = () => {
    setModalScheduleDate(selectedScheduleDate || defaultScheduleDate);
    setModalScheduleDateStr(selectedScheduleDateStr || defaultScheduleDateStr);
    setModalScheduleTime(selectedScheduleTime || defaultScheduleTime);
    setModalScheduleCategory(selectedScheduleCategory || defaultScheduleCategory);
    setIsScheduleModalOpen(true);
  };

  const handleConfirmScheduleSlot = () => {
    setSelectedScheduleDate(modalScheduleDate);
    setSelectedScheduleDateStr(modalScheduleDateStr);
    setSelectedScheduleTime(modalScheduleTime);
    setSelectedScheduleCategory(modalScheduleCategory);

    const slotLabel = `Scheduled for ${modalScheduleCategory} (Delivery between ${modalScheduleTime} on ${modalScheduleDate})`;
    const isoTimestamp = computeScheduledIsoTimestamp(modalScheduleDateStr || modalScheduleDate, modalScheduleTime);

    setFormData((prev) => ({
      ...prev,
      deliveryType: 'scheduled',
      scheduledAt: isoTimestamp || undefined,
      scheduledDate: modalScheduleDate,
      scheduledTimeSlot: modalScheduleTime,
      scheduledSlotCategory: modalScheduleCategory,
      scheduledSlotLabel: slotLabel,
    }));

    setIsScheduleModalOpen(false);
  };

  const scheduledSlotSummaryText = useMemo(() => {
    if (formData.scheduledSlotLabel) {
      return formData.scheduledSlotLabel;
    }
    return `Scheduled for ${selectedScheduleCategory} (Delivery between ${selectedScheduleTime} on ${selectedScheduleDate})`;
  }, [formData.scheduledSlotLabel, selectedScheduleCategory, selectedScheduleTime, selectedScheduleDate]);

  // Keep isSelfPickup in sync with orderType
  const handleToggleSelfPickup = (checked: boolean) => {
    setIsSelfPickup(checked);
    setOrderType(checked ? 'pickup' : 'delivery');
    setFormData((prev) => ({
      ...prev,
      orderType: checked ? 'pickup' : 'delivery',
      isSelfPickup: checked,
    }));
  };

  // Returning customer detection state
  const [returningCustomerFound, setReturningCustomerFound] = useState<{
    name: string;
    phone: string;
    hasAddress: boolean;
    addressData?: any;
    welcomeEligible: boolean;
  } | null>(null);
  const [isLookingUpPhone, setIsLookingUpPhone] = useState(false);

  // Validation State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Address Presentation States (Card vs Edit vs Custom Address)
  const [isCustomAddressMode, setIsCustomAddressMode] = useState(false);
  const [isEditingSavedAddress, setIsEditingSavedAddress] = useState(false);
  const [isAddressSwitchModalOpen, setIsAddressSwitchModalOpen] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(defaultAddress?.id || null);

  // Address Label and Tag State for adding/editing addresses
  const [addressLabelType, setAddressLabelType] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [customAddressTagline, setCustomAddressTagline] = useState('');
  const [shouldSaveAddressToAccount, setShouldSaveAddressToAccount] = useState(true);
  const [isSavingAddressInProgress, setIsSavingAddressInProgress] = useState(false);

  // Active saved address resolution
  const activeSavedAddress = useMemo(() => {
    if (selectedAddressId && Array.isArray(savedAddresses) && savedAddresses.length > 0) {
      const match = savedAddresses.find((a) => a.id === selectedAddressId);
      if (match) return match;
    }
    if (formData.address && Array.isArray(savedAddresses) && savedAddresses.length > 0) {
      const matchByContent = savedAddresses.find(
        (a) => a.fullAddress === formData.address && a.pincode === formData.pincode
      );
      if (matchByContent) return matchByContent;
    }
    if (isCustomerLoggedIn) {
      return defaultAddress || (savedAddresses.length > 0 ? savedAddresses[0] : null);
    }
    return returningCustomerFound?.addressData || defaultAddress || null;
  }, [selectedAddressId, savedAddresses, formData.address, formData.pincode, isCustomerLoggedIn, defaultAddress, returningCustomerFound]);

  const hasSavedAddress = Boolean(
    activeSavedAddress &&
      activeSavedAddress.fullAddress &&
      activeSavedAddress.fullAddress.trim().length > 0 &&
      activeSavedAddress.pincode
  );

  // Unique list of saved addresses for Switch Address modal directly from database
  const modalAddresses = useMemo(() => {
    if (Array.isArray(savedAddresses) && savedAddresses.length > 0) {
      return savedAddresses;
    }
    if (activeSavedAddress) {
      return [activeSavedAddress];
    }
    return [];
  }, [savedAddresses, activeSavedAddress]);

  // Address Handler Actions
  const handleStartEditAddress = () => {
    setIsEditingSavedAddress(true);
    setIsCustomAddressMode(false);
    setIsAddressSwitchModalOpen(false);
    const currentLabel = activeSavedAddress?.addressLabel || 'Home';
    if (currentLabel === 'Home' || currentLabel === 'Work') {
      setAddressLabelType(currentLabel);
      setCustomAddressTagline('');
    } else {
      setAddressLabelType('Other');
      setCustomAddressTagline(currentLabel);
    }
  };

  const handleStartNewAddress = () => {
    setIsCustomAddressMode(true);
    setIsEditingSavedAddress(false);
    setIsAddressSwitchModalOpen(false);
    setAddressLabelType('Home');
    setCustomAddressTagline('');
    setFormData((prev) => ({
      ...prev,
      address: '',
      landmark: '',
      city: 'Bhubaneswar',
      state: 'Odisha',
      pincode: '',
    }));
  };

  const handleSelectSavedAddress = (addr: any) => {
    if (!addr) return;
    if (addr.id) {
      setSelectedAddressId(addr.id);
    }
    setDefaultDeliveryAddress(addr);
    if (returningCustomerFound) {
      setReturningCustomerFound((prev) => prev ? { ...prev, addressData: addr } : null);
    }
    const label = addr.addressLabel || 'Home';
    if (label.toLowerCase() === 'home') {
      setAddressLabelType('Home');
      setCustomAddressTagline('');
    } else if (label.toLowerCase() === 'work') {
      setAddressLabelType('Work');
      setCustomAddressTagline('');
    } else {
      setAddressLabelType('Other');
      setCustomAddressTagline(label);
    }
    setFormData((prev) => ({
      ...prev,
      address: addr.fullAddress || '',
      landmark: addr.landmark || '',
      city: addr.city || 'Bhubaneswar',
      state: addr.state || 'Odisha',
      pincode: addr.pincode || '',
    }));
    setIsCustomAddressMode(false);
    setIsEditingSavedAddress(false);
    setIsAddressSwitchModalOpen(false);
  };

  const [isSyncingAddresses, setIsSyncingAddresses] = useState(false);

  const handleRefreshAddressesFromDB = async () => {
    const targetCustId = customer?.id || returningCustomerFound?.addressData?.customerId;
    const targetPhone = customer?.phone || formData.phone;
    if (!targetCustId && !targetPhone) return;

    setIsSyncingAddresses(true);
    try {
      await fetchCustomerAddresses(targetCustId, targetPhone);
    } finally {
      setIsSyncingAddresses(false);
    }
  };

  const handleSaveEditedAddress = async () => {
    const addressErr = validateField('address', formData.address);
    const cityErr = validateField('city', formData.city);
    const stateErr = validateField('state', formData.state);
    const pinErr = validateField('pincode', formData.pincode);

    if (addressErr || cityErr || stateErr || pinErr) {
      setTouched((prev) => ({ ...prev, address: true, city: true, state: true, pincode: true }));
      setErrors((prev) => ({
        ...prev,
        address: addressErr,
        city: cityErr,
        state: stateErr,
        pincode: pinErr,
      }));
      return;
    }

    const effectiveLabel =
      addressLabelType === 'Other'
        ? customAddressTagline.trim() || 'Other'
        : addressLabelType;

    setIsSavingAddressInProgress(true);
    try {
      if (activeSavedAddress?.id) {
        await updateAddress(activeSavedAddress.id, {
          addressLabel: effectiveLabel,
          fullAddress: formData.address.trim(),
          landmark: formData.landmark?.trim() || '',
          city: formData.city.trim(),
          state: formData.state.trim(),
          pincode: formData.pincode.trim(),
        });
      }
    } catch (e) {
      console.warn('Update address error:', e);
    } finally {
      setIsSavingAddressInProgress(false);
      setIsEditingSavedAddress(false);
    }
  };

  const handleSaveNewAddress = async () => {
    const addressErr = validateField('address', formData.address);
    const cityErr = validateField('city', formData.city);
    const stateErr = validateField('state', formData.state);
    const pinErr = validateField('pincode', formData.pincode);

    // Also check if phone is available so we can link the address in Supabase
    const rawPhone = (formData.phone || customer?.phone || '').replace(/\D/g, '').slice(-10);
    const phoneErr = rawPhone.length !== 10 ? 'Please enter a valid 10-digit mobile number to save your address' : undefined;

    if (addressErr || cityErr || stateErr || pinErr || (!customer && phoneErr)) {
      setTouched((prev) => ({ ...prev, address: true, city: true, state: true, pincode: true, phone: true }));
      setErrors((prev) => ({
        ...prev,
        address: addressErr,
        city: cityErr,
        state: stateErr,
        pincode: pinErr,
        phone: !customer ? phoneErr : prev.phone,
      }));
      return;
    }

    const effectiveLabel =
      addressLabelType === 'Other'
        ? customAddressTagline.trim() || 'Other'
        : addressLabelType;

    setIsSavingAddressInProgress(true);
    try {
      const targetCustId = customer?.id || returningCustomerFound?.addressData?.customerId;
      const targetPhone = customer?.phone || formData.phone || rawPhone;
      
      const newAddrData = {
        addressLabel: effectiveLabel,
        fullAddress: formData.address.trim(),
        landmark: formData.landmark?.trim() || '',
        city: formData.city.trim(),
        state: formData.state.trim(),
        pincode: formData.pincode.trim(),
        isDefault: true,
      };

      const saved = await saveNewAddress(
        newAddrData,
        targetCustId,
        targetPhone
      );

      if (saved) {
        if (saved.id) {
          setSelectedAddressId(saved.id);
        }
        setDefaultDeliveryAddress(saved);
        setFormData((prev) => ({
          ...prev,
          address: saved.fullAddress || prev.address,
          landmark: saved.landmark || prev.landmark,
          city: saved.city || prev.city,
          state: saved.state || prev.state,
          pincode: saved.pincode || prev.pincode,
        }));
      }
    } catch (e) {
      console.warn('Save new address error:', e);
    } finally {
      setIsSavingAddressInProgress(false);
      setIsCustomAddressMode(false);
    }
  };

  // Sync if customer logs in or defaultAddress is loaded
  useEffect(() => {
    if (customer) {
      setFormData((prev) => {
        const hasAddress = !!(prev.address && prev.address.trim().length > 0);
        return {
          ...prev,
          fullName: customer.fullName || prev.fullName || '',
          email: customer.email || prev.email || '',
          phone: customer.phone || prev.phone,
          address: hasAddress ? prev.address : (defaultAddress?.fullAddress || ''),
          landmark: hasAddress ? prev.landmark : (defaultAddress?.landmark || ''),
          city: hasAddress ? prev.city : (defaultAddress?.city || 'Bhubaneswar'),
          state: hasAddress ? prev.state : (defaultAddress?.state || 'Odisha'),
          pincode: hasAddress ? prev.pincode : (defaultAddress?.pincode || ''),
          createAccount: false,
          isPhoneVerified: true,
        };
      });
      if (defaultAddress?.id && !selectedAddressId) {
        setSelectedAddressId(defaultAddress.id);
      }
    }
  }, [customer, defaultAddress, selectedAddressId]);

  // Dynamic Returning Customer Phone Lookup
  useEffect(() => {
    const cleanPhone = formData.phone.replace(/\D/g, '').slice(0, 10);
    if (cleanPhone.length === 10 && !isCustomerLoggedIn) {
      let isMounted = true;
      setIsLookingUpPhone(true);
      lookupCustomer(cleanPhone).then((res) => {
        if (!isMounted) return;
        setIsLookingUpPhone(false);
        if (res.exists && res.customer) {
          setReturningCustomerFound({
            name: res.customer.fullName,
            phone: res.customer.phone,
            hasAddress: !!res.defaultAddress,
            addressData: res.defaultAddress,
            welcomeEligible: !!res.welcomeDiscountEligible,
          });
          if (res.customer.id || res.customer.phone) {
            fetchCustomerAddresses(res.customer.id, res.customer.phone);
          }
          setFormData((prev) => ({
            ...prev,
            fullName: res.customer.fullName || prev.fullName,
            email: res.customer.email || prev.email,
            address: res.defaultAddress?.fullAddress || prev.address,
            landmark: res.defaultAddress?.landmark || prev.landmark,
            city: res.defaultAddress?.city || prev.city,
            state: res.defaultAddress?.state || prev.state,
            pincode: res.defaultAddress?.pincode || prev.pincode,
            createAccount: false,
          }));
        } else {
          // If 10-digit mobile number is not found in server:
          // Clear all profile and address data
          setReturningCustomerFound(null);
          setFormData((prev) => ({
            ...prev,
            fullName: '',
            email: '',
            address: '',
            landmark: '',
            pincode: '',
            isPhoneVerified: false,
            createAccount: false,
          }));
        }
      });
      return () => {
        isMounted = false;
      };
    } else {
      setReturningCustomerFound(null);
    }
  }, [formData.phone, isCustomerLoggedIn]);

  // PIN Code & Kitchen Delivery Zone Verification
  const enteredPin = (formData.pincode || '').trim();
  const isPinComplete = enteredPin.length === 6 && /^\d{6}$/.test(enteredPin);

  const pinServiceability = useMemo(() => {
    if (!isPinComplete) {
      return { status: 'INCOMPLETE_PIN' as const, pinCode: enteredPin };
    }

    const currentOutletId = selectedLocation?.outletId || currentOutlet?.id;
    const isServedByCurrentKitchen = doesOutletDeliverToPinCode(
      currentOutletId,
      enteredPin,
      deliveryZones
    );

    if (isServedByCurrentKitchen) {
      return {
        status: 'SERVICED_BY_CURRENT' as const,
        pinCode: enteredPin,
        outletName: selectedLocation?.outletName || currentOutlet?.name || 'Assigned Kitchen',
      };
    }

    // Check if another active kitchen outlet delivers to this customer PIN
    const alt = findOutletDeliveringToPinCode(enteredPin, outlets, deliveryZones);
    if (alt) {
      return {
        status: 'SERVICED_BY_OTHER' as const,
        pinCode: enteredPin,
        currentOutletName: selectedLocation?.outletName || currentOutlet?.name || 'Selected Kitchen',
        altOutlet: alt.outlet,
        altZone: alt.zone,
      };
    }

    // Not serviced by ANY kitchen
    return {
      status: 'NOT_SERVICED' as const,
      pinCode: enteredPin,
    };
  }, [
    enteredPin,
    isPinComplete,
    selectedLocation?.outletId,
    selectedLocation?.outletName,
    currentOutlet?.id,
    currentOutlet?.name,
    deliveryZones,
    outlets,
  ]);

  // Handle switching to the kitchen that delivers to customer's PIN
  const handleSwitchToAltKitchen = (altOutlet: any, altZone: any) => {
    requestLocationChange(enteredPin, altOutlet, altZone, cart.length > 0, () => {
      adaptCartForNewOutlet(altOutlet.id, altOutlet.name);
    });
  };

  // 10% Welcome Discount Calculation
  // 10% extra discount (capping 50/-) after all discounts
  const remainingSubtotalAfterCoupon = Math.max(0, subtotal - discount);
  const willApplyWelcomeDiscount =
    (formData.createAccount || isCustomerLoggedIn) &&
    isWelcomeDiscountEligible &&
    (!returningCustomerFound || returningCustomerFound.welcomeEligible);

  const welcomeDiscountAmount = willApplyWelcomeDiscount
    ? Math.min(50, Math.round(remainingSubtotalAfterCoupon * 0.1))
    : 0;

  // Delivery fee is ₹0 for Self-Pickup / Takeaway
  const effectiveDeliveryFee = isSelfPickup || orderType === 'pickup' ? 0 : deliveryFee;

  const effectiveTotal = Math.max(
    0,
    subtotal - discount - welcomeDiscountAmount + packagingFee + gst + effectiveDeliveryFee
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ==========================================================================
  // EXTENSIBLE "PLACE ORDER" VALIDATION ENGINE & FLAG
  // ==========================================================================
  // Allows adding extra checks easily while ensuring strict outlet-PIN rules.
  // Rule:
  // - Self-Pickup is ALWAYS permitted from any outlet (regardless of PIN/address).
  // - Doorstep Delivery is ONLY permitted if the customer's PIN is serviced by
  //   the currently selected kitchen outlet.
  // ==========================================================================
  const placeOrderValidation = useMemo(() => {
    // Check 1: Cart non-empty
    if (cart.length === 0) {
      return {
        canPlaceOrder: false,
        reason: 'Your cart is empty. Please add items to order.',
        buttonLabel: 'Cart is Empty',
        actionRequired: null,
      };
    }

    // Check 2: Submission in progress
    if (isSubmitting) {
      return {
        canPlaceOrder: false,
        reason: 'Placing order, please wait...',
        buttonLabel: 'Sending to Kitchen...',
        actionRequired: null,
      };
    }

    // Check 3: Registered customer phone found on server but user is NOT authenticated yet
    if (!isCustomerLoggedIn && returningCustomerFound !== null) {
      return {
        canPlaceOrder: false,
        reason: `Please sign in with OTP to verify your account (${returningCustomerFound.name}) and place your order.`,
        buttonLabel: 'Sign In to Place Order',
        actionRequired: 'SIGN_IN_REQUIRED' as const,
      };
    }

    // Check 4: Address being edited or newly added (Doorstep Delivery mode only)
    if (!isSelfPickup && orderType === 'delivery') {
      if (isEditingSavedAddress) {
        return {
          canPlaceOrder: false,
          reason: 'Please click "Save Changes & Deliver Here" or "Cancel" before placing your order.',
          buttonLabel: 'Save Address Changes to Proceed',
          actionRequired: 'SAVE_EDITED_ADDRESS' as const,
        };
      }

      if (isCustomAddressMode) {
        return {
          canPlaceOrder: false,
          reason: 'Please click "Save & Deliver Here" to confirm your delivery address before placing order.',
          buttonLabel: 'Save / Confirm Delivery Address',
          actionRequired: 'SAVE_NEW_ADDRESS' as const,
        };
      }
    }

    // Check 5: Delivery Mode validations (Outlet cannot deliver outside its zone)
    if (!isSelfPickup && orderType === 'delivery') {
      // 5a. Incomplete PIN
      if (!isPinComplete) {
        return {
          canPlaceOrder: false,
          reason: 'Please enter a valid 6-digit delivery PIN code.',
          buttonLabel: 'Enter 6-Digit PIN Code',
          actionRequired: 'ENTER_PIN' as const,
        };
      }

      // 5b. PIN is serviced by a DIFFERENT active outlet
      if (pinServiceability.status === 'SERVICED_BY_OTHER') {
        const altName = pinServiceability.altOutlet?.name || 'another kitchen';
        return {
          canPlaceOrder: false,
          reason: `PIN ${enteredPin} is serviced by ${altName}, not your active outlet (${pinServiceability.currentOutletName}). Please switch outlet or choose Self-Pickup.`,
          buttonLabel: 'Switch Outlet or Choose Pickup',
          actionRequired: 'SWITCH_OUTLET_OR_PICKUP' as const,
        };
      }

      // 5c. PIN is NOT serviced by ANY outlet (outside delivery coverage)
      if (pinServiceability.status === 'NOT_SERVICED') {
        return {
          canPlaceOrder: false,
          reason: `Doorstep delivery is unavailable for PIN ${enteredPin}. Please switch to Self-Pickup.`,
          buttonLabel: 'Delivery Unavailable for PIN',
          actionRequired: 'SWITCH_TO_PICKUP' as const,
        };
      }

      // 5d. Guarantee PIN is served by current outlet
      if (pinServiceability.status !== 'SERVICED_BY_CURRENT') {
        return {
          canPlaceOrder: false,
          reason: 'The entered delivery address PIN is not serviceable by the selected kitchen.',
          buttonLabel: 'Delivery Unavailable',
          actionRequired: 'SERVICEABILITY_MISMATCH' as const,
        };
      }
    }

    // All validation checks passed successfully!
    return {
      canPlaceOrder: true,
      reason: null,
      buttonLabel: isSelfPickup
        ? `Confirm Pickup Order (₹${effectiveTotal})`
        : `Place Order (₹${effectiveTotal})`,
      actionRequired: null,
    };
  }, [
    cart.length,
    isSubmitting,
    isCustomerLoggedIn,
    returningCustomerFound,
    isSelfPickup,
    orderType,
    isEditingSavedAddress,
    isCustomAddressMode,
    isPinComplete,
    enteredPin,
    pinServiceability,
    effectiveTotal,
  ]);

  // Main flag for enabling/disabling "Place Order" button (extensible for future checks)
  const isPlaceOrderEnabled = placeOrderValidation.canPlaceOrder;

  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [orderStage, setOrderStage] = useState<
    'Received' | 'Preparing in Kitchen' | 'Out for Delivery' | 'Ready for Pickup' | 'Picked Up' | 'Delivered'
  >('Received');

  // Real-time synchronization of placed order status across devices
  useEffect(() => {
    if (!placedOrder) return;

    if (placedOrder.status) {
      setOrderStage(placedOrder.status as any);
    }

    if (!isSupabaseConfigured()) return;

    const channel = supabase
      .channel(`order-live-${placedOrder.id || placedOrder.orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          if (payload.new) {
            const updated = payload.new;
            if (
              (placedOrder.id && updated.id === placedOrder.id) ||
              (placedOrder.orderId && updated.order_id === placedOrder.orderId)
            ) {
              if (updated.status) {
                setOrderStage(updated.status as any);
                setPlacedOrder((prev) => (prev ? { ...prev, status: updated.status } : null));
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [placedOrder?.id, placedOrder?.orderId]);

  // Form Validation Logic
  const validateField = (name: string, value: string): string => {
    const trimmed = (value || '').trim();

    if (name === 'fullName') {
      if (!trimmed) return 'Please enter your full name';
      if (/^\d+$/.test(trimmed)) return 'Full name cannot be numbers only. Please enter a valid name';
      if (!/[a-zA-Z]/.test(trimmed)) return 'Full name must contain letters (e.g. Rahul Sharma)';
      if (!/^[a-zA-Z\s.'-]+$/.test(trimmed)) return 'Full name should only contain letters and standard spacing';
      if (trimmed.replace(/[^a-zA-Z]/g, '').length < 2) return 'Please enter at least 2 letters for your name';
      return '';
    }

    if (name === 'phone') {
      if (!trimmed) return 'Please enter your 10-digit mobile number';
      const cleanDigits = trimmed.replace(/\D/g, '');
      if (cleanDigits.length !== 10) return 'Mobile number must be exactly 10 digits (e.g. 9876543210)';
      if (!/^[6-9]\d{9}$/.test(cleanDigits)) return 'Please enter a valid 10-digit Indian mobile number';
      return '';
    }

    if (name === 'email') {
      if (!trimmed) return ''; // Email is optional
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmed)) return 'Please enter a valid email address (e.g. name@example.com)';
      return '';
    }

    if (name === 'address') {
      if (!trimmed) return 'Please enter your complete delivery address';
      if (trimmed.length < 5) return 'Please enter a detailed delivery address (minimum 5 characters)';
      return '';
    }

    if (name === 'city') {
      if (!trimmed) return 'Please enter your city';
      return '';
    }

    if (name === 'state') {
      if (!trimmed) return 'Please enter your state';
      return '';
    }

    if (name === 'pincode') {
      if (!trimmed) return 'Please enter your 6-digit PIN code';
      if (!/^\d{6}$/.test(trimmed)) return 'Please enter a valid 6-digit PIN code';
      return '';
    }

    return '';
  };

  const validateAll = (data: CheckoutFormData): Record<string, string> => {
    const errs: Record<string, string> = {};
    const fieldsToValidate = isSelfPickup
      ? ['fullName', 'phone', 'email']
      : ['fullName', 'phone', 'email', 'address', 'city', 'state', 'pincode'];

    for (const f of fieldsToValidate) {
      const err = validateField(f, (data as any)[f]);
      if (err) errs[f] = err;
    }
    return errs;
  };

  // Launch confetti on order success
  useEffect(() => {
    if (placedOrder) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      const isPickup = placedOrder.orderType === 'pickup' || placedOrder.isSelfPickup;

      const timer1 = setTimeout(() => setOrderStage('Preparing in Kitchen'), 3500);
      const timer2 = setTimeout(() => {
        setOrderStage(isPickup ? 'Ready for Pickup' : 'Out for Delivery');
      }, 9000);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [placedOrder]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    let nextValue: any = value;
    if (type === 'checkbox') {
      nextValue = (e.target as HTMLInputElement).checked;
    } else if (name === 'phone') {
      nextValue = value.replace(/\D/g, '').slice(0, 10);
    } else if (name === 'pincode') {
      nextValue = value.replace(/\D/g, '').slice(0, 6);
    }

    const nextForm = { ...formData, [name]: nextValue };
    if (name === 'phone' && nextValue !== formData.phone) {
      nextForm.isPhoneVerified = false;
    }
    setFormData(nextForm);

    if (touched[name]) {
      const err = validateField(name, nextValue);
      setErrors((prev) => ({ ...prev, [name]: err }));
    }
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const err = validateField(field, (formData as any)[field]);
    setErrors((prev) => ({ ...prev, [field]: err }));
  };

  const handlePrefillReturningCustomer = () => {
    if (!returningCustomerFound) return;
    setFormData((prev) => ({
      ...prev,
      fullName: returningCustomerFound.name || prev.fullName,
      address: returningCustomerFound.addressData?.fullAddress || prev.address,
      landmark: returningCustomerFound.addressData?.landmark || prev.landmark,
      city: returningCustomerFound.addressData?.city || prev.city,
      state: returningCustomerFound.addressData?.state || prev.state,
      pincode: returningCustomerFound.addressData?.pincode || prev.pincode,
    }));
  };

  const handleTriggerOtpVerification = async () => {
    const cleanPhone = formData.phone.replace(/\D/g, '').slice(0, 10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      setTouched((prev) => ({ ...prev, phone: true }));
      setErrors((prev) => ({ ...prev, phone: 'Please enter 10-digit mobile number first' }));
      return;
    }
    // Send OTP immediately so user sees the 6-digit OTP verification screen directly
    try {
      await sendOtp(cleanPhone);
    } catch (e) {
      console.warn('sendOtp failed:', e);
    }
    openOtpModal(cleanPhone, 'direct_otp', (cust, addr) => {
      if (cust) {
        setFormData((prev) => ({
          ...prev,
          fullName: cust.fullName || prev.fullName,
          email: cust.email || prev.email || '',
          phone: cust.phone,
          address: addr?.fullAddress || prev.address || '',
          landmark: addr?.landmark || prev.landmark || '',
          city: addr?.city || prev.city,
          state: addr?.state || prev.state,
          pincode: addr?.pincode || prev.pincode,
          isPhoneVerified: true,
          createAccount: false,
        }));
      } else {
        setFormData((prev) => ({ ...prev, isPhoneVerified: true }));
      }
    });
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateAll(formData);
    setErrors(validationErrors);
    setTouched({
      fullName: true,
      phone: true,
      email: true,
      address: true,
      city: true,
      state: true,
      pincode: true,
    });

    if (Object.keys(validationErrors).length > 0) {
      const firstKey = Object.keys(validationErrors)[0];
      const el = document.querySelector(`[name="${firstKey}"]`) as HTMLElement;
      if (el) {
        el.focus();
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    if (cart.length === 0) return;

    // Check Place Order enablement & Serviceability Rules
    if (!isPlaceOrderEnabled) {
      if (placeOrderValidation.reason) {
        alert(placeOrderValidation.reason);
      }
      return;
    }

    // Portion & Stock Inventory Verification before placement
    const currentOutletId = selectedLocation?.outletId;
    const inventoryErrors: string[] = [];

    for (const item of cart) {
      const portionsLeft = getProductPortionsLeftAtOutlet(item.product, currentOutletId);
      if (portionsLeft !== null && portionsLeft !== undefined) {
        if (portionsLeft <= 0) {
          inventoryErrors.push(`"${item.product.name}" is currently sold out at this outlet.`);
        } else if (item.quantity > portionsLeft) {
          inventoryErrors.push(
            `Only ${portionsLeft} portions left for "${item.product.name}" (you have ${item.quantity} in your cart).`
          );
        }
      }
    }

    if (inventoryErrors.length > 0) {
      alert(inventoryErrors.join('\n\n'));
      return;
    }

    setIsSubmitting(true);

    let nextOrderId = '';
    try {
      nextOrderId = await getNextSequentialOrderId();
    } catch {
      nextOrderId = `GKSWAD-#001`;
    }

    const cleanCustomerPin = (formData.pincode || '').trim();

    const newOrder: Order = {
      orderId: nextOrderId,
      customerId: customer?.id,
      addressId: defaultAddress?.id,
      isGuestCheckout: !isCustomerLoggedIn && !formData.createAccount,
      outletId: selectedLocation?.outletId || currentOutlet?.id || 'outlet-1',
      outletName: selectedLocation?.outletName || currentOutlet?.name || 'Gaon Ka Swad Kitchen',
      deliveryPinCode: isSelfPickup
        ? (currentOutlet?.pinCode || selectedLocation?.pinCode || cleanCustomerPin)
        : cleanCustomerPin,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      items: [...cart],
      subtotal,
      discount,
      welcomeDiscountAmount,
      isWelcomeDiscountApplied: willApplyWelcomeDiscount && welcomeDiscountAmount > 0,
      deliveryFee: effectiveDeliveryFee,
      packagingFee,
      gst,
      total: effectiveTotal,
      couponCode: appliedCoupon ? appliedCoupon.code : undefined,
      customerDetails: {
        ...formData,
        orderType: isSelfPickup ? 'pickup' : 'delivery',
        isSelfPickup,
      },
      orderType: isSelfPickup ? 'pickup' : 'delivery',
      isSelfPickup,
      kitchenAddress:
        currentOutlet?.address ||
        `${selectedLocation?.outletName || 'Gaon Ka Swad Kitchen Facility'}, Main Commercial Hub`,
      deliveryAddressSnapshot: {
        fullAddress: isSelfPickup
          ? `Self-Pickup from ${currentOutlet?.name || selectedLocation?.outletName || 'Kitchen'}`
          : (formData.address || ''),
        landmark: formData.landmark || '',
        city: formData.city || 'Bhubaneswar',
        state: formData.state || 'Odisha',
        pincode: isSelfPickup
          ? (currentOutlet?.pinCode || selectedLocation?.pinCode || cleanCustomerPin)
          : cleanCustomerPin,
      },
      status: 'Received',
      estimatedDeliveryMinutes: isSelfPickup ? 25 : 35,
    };

    // Automatically persist customer profile and address for 1-click future reorders
    let resolvedCustId = customer?.id;
    let resolvedAddrId = activeSavedAddress?.id || defaultAddress?.id;

    if (formData.phone && (!isSelfPickup ? formData.address : true)) {
      try {
        const profRes = await saveProfile({
          phone: formData.phone,
          fullName: formData.fullName,
          email: formData.email || undefined,
          marketingConsent: formData.marketingConsent,
          address: !isSelfPickup
            ? {
                addressLabel: activeSavedAddress?.addressLabel || 'Home',
                fullAddress: formData.address,
                landmark: formData.landmark || undefined,
                city: formData.city,
                state: formData.state,
                pincode: formData.pincode,
                isDefault: true,
              }
            : undefined,
        });
        if (profRes?.customer?.id) {
          resolvedCustId = profRes.customer.id;
          newOrder.customerId = profRes.customer.id;
        }
        if (profRes?.address?.id) {
          resolvedAddrId = profRes.address.id;
          newOrder.addressId = profRes.address.id;
        }
      } catch (err) {
        console.warn('Customer address auto-persist notice:', err);
      }
    }

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newOrder,
          customerId: resolvedCustId || newOrder.customerId,
          addressId: resolvedAddrId || newOrder.addressId,
        }),
      });
      const data = await res.json();
      if (data.success && data.order) {
        setPlacedOrder(data.order);
      } else {
        setPlacedOrder(newOrder);
      }
    } catch {
      setPlacedOrder(newOrder);
    }

    setIsSubmitting(false);
    clearCart();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // If order was already placed, show the success tracking screen
  if (placedOrder) {
    const isOrderPickup = placedOrder.orderType === 'pickup' || placedOrder.isSelfPickup;

    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6">
        {/* Success Header */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-8 shadow-xs text-center space-y-3"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
              <Sparkles className="w-3 h-3" />
              <span>
                {isOrderPickup ? 'Pickup Order Confirmed' : 'Order Successfully Placed'}
              </span>
            </div>
            <h1 className="font-extrabold text-xl sm:text-3xl text-gray-900">
              {isOrderPickup ? 'Self-Pickup Order Confirmed!' : 'Thank You for Your Order!'}
            </h1>
            <p className="text-xs text-gray-600 max-w-md mx-auto">
              {isOrderPickup
                ? 'Our master chefs are preparing your handi delicacies. Your order will be packed for pickup shortly.'
                : 'Our master chefs have received your handi request and are preparing your fresh delicacies.'}
            </p>
          </div>

          {/* Order ID Pill */}
          <div className="inline-block bg-gray-900 text-gray-100 rounded-xl px-5 py-2.5 border border-gray-800">
            <span className="text-[10px] text-gray-400 block font-medium">Your Order ID</span>
            <span className="font-mono font-bold text-base text-orange-400">
              {placedOrder.orderId}
            </span>
          </div>

          {/* Account Creation Status Banner */}
          {placedOrder.customerDetails?.createAccount && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 max-w-md mx-auto text-xs text-amber-900 flex items-center gap-2 text-left">
              <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>Account Created!</strong> Your profile is saved for 1-click reorders and 10% welcome discount was applied.
              </span>
            </div>
          )}

          {/* Live Order Tracker Stepper */}
          <div className="pt-6 border-t border-gray-100 max-w-2xl mx-auto">
            <div className="text-left mb-3">
              <h3 className="font-bold text-sm text-gray-900">Live Kitchen Tracker</h3>
              <p className="text-xs text-gray-500">
                {isOrderPickup
                  ? `Estimated Ready Time: ~${placedOrder.estimatedDeliveryMinutes || 25} mins`
                  : `Estimated Delivery: ~${placedOrder.estimatedDeliveryMinutes || 35} mins`}
              </p>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center">
              {/* Step 1 */}
              <div className="space-y-1">
                <div className="w-8 h-8 rounded-full mx-auto flex items-center justify-center font-bold text-xs bg-emerald-600 text-white shadow-xs">
                  ✓
                </div>
                <p className="text-xs font-bold text-gray-900">Received</p>
                <p className="text-[10px] text-gray-400">{placedOrder.createdAt}</p>
              </div>

              {/* Step 2 */}
              <div className="space-y-1">
                <div
                  className={`w-8 h-8 rounded-full mx-auto flex items-center justify-center font-bold text-xs transition-colors ${
                    orderStage === 'Preparing in Kitchen' ||
                    orderStage === 'Out for Delivery' ||
                    orderStage === 'Ready for Pickup' ||
                    orderStage === 'Picked Up' ||
                    orderStage === 'Delivered'
                      ? 'bg-orange-600 text-white shadow-xs animate-pulse'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  <Utensils className="w-3.5 h-3.5" />
                </div>
                <p className="text-xs font-bold text-gray-900">In Kitchen</p>
                <p className="text-[10px] text-gray-400">Slow Dum</p>
              </div>

              {/* Step 3 */}
              <div className="space-y-1">
                <div
                  className={`w-8 h-8 rounded-full mx-auto flex items-center justify-center font-bold text-xs transition-colors ${
                    orderStage === 'Out for Delivery' ||
                    orderStage === 'Ready for Pickup' ||
                    orderStage === 'Picked Up' ||
                    orderStage === 'Delivered'
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {isOrderPickup ? (
                    <ShoppingBag className="w-3.5 h-3.5" />
                  ) : (
                    <Truck className="w-3.5 h-3.5" />
                  )}
                </div>
                <p className="text-xs font-bold text-gray-900">
                  {isOrderPickup ? 'Ready at Counter' : 'On The Way'}
                </p>
                <p className="text-[10px] text-gray-400">
                  {isOrderPickup ? 'Packed Hot' : 'Insulated Box'}
                </p>
              </div>

              {/* Step 4 */}
              <div className="space-y-1">
                <div
                  className={`w-8 h-8 rounded-full mx-auto flex items-center justify-center font-bold text-xs transition-colors ${
                    orderStage === 'Delivered' || orderStage === 'Picked Up'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  🎉
                </div>
                <p className="text-xs font-bold text-gray-900">
                  {isOrderPickup ? 'Picked Up' : 'Delivered'}
                </p>
                <p className="text-[10px] text-gray-400">Enjoy Feast</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Invoice & Order Summary Details */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-200">
            <h3 className="font-bold text-sm text-gray-900">
              {isOrderPickup ? 'Self-Pickup Invoice Summary' : 'Delivery Invoice Summary'}
            </h3>
            <button
              type="button"
              onClick={() => window.print()}
              className="text-xs font-semibold text-gray-600 hover:text-gray-900 flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <Printer className="w-3 h-3" />
              <span>Print Invoice</span>
            </button>
          </div>

          {/* Fulfillment & Address Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-stone-600 bg-stone-50 rounded-xl p-3.5 border border-stone-200">
            <div>
              {isOrderPickup ? (
                <>
                  <p className="font-bold text-stone-900 mb-1 flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-amber-800" />
                    <span>Pickup Location & Kitchen Contact:</span>
                  </p>
                  <p className="font-semibold text-stone-800">{placedOrder.outletName}</p>
                  <p className="text-stone-600">{placedOrder.kitchenAddress || 'Kitchen Main Counter'}</p>
                  <p className="mt-1.5 font-bold text-amber-900">
                    Customer: {placedOrder.customerDetails.fullName} (📞 +91 {placedOrder.customerDetails.phone})
                  </p>
                </>
              ) : (
                <>
                  <p className="font-bold text-stone-900 mb-1">
                    Delivering To (Immutable Snapshot):
                  </p>
                  <p className="font-semibold text-stone-800">{placedOrder.customerDetails.fullName}</p>
                  <p>{placedOrder.customerDetails.address}</p>
                  {placedOrder.customerDetails.landmark && (
                    <p>Landmark: {placedOrder.customerDetails.landmark}</p>
                  )}
                  <p>
                    {placedOrder.customerDetails.city}, {placedOrder.customerDetails.state} -{' '}
                    {placedOrder.customerDetails.pincode}
                  </p>
                  <p className="mt-1">📞 +91 {placedOrder.customerDetails.phone}</p>
                </>
              )}
            </div>

            <div>
              <p className="font-bold text-stone-900 mb-1">Order Details & Mode:</p>
              <p className="text-amber-800 font-bold flex items-center gap-1">
                <span className="capitalize">
                  Fulfillment: <strong>{isOrderPickup ? 'Self-Pickup / Takeaway' : 'Doorstep Delivery'}</strong>
                </span>
              </p>
              <p className="capitalize mt-1">
                Method: <strong>{placedOrder.customerDetails.paymentMethod.toUpperCase()}</strong> (Demo Test)
              </p>
              <p className="mt-1">
                Delivery Type:{' '}
                <strong>
                  {placedOrder.deliveryType === 'scheduled' ||
                  placedOrder.customerDetails.deliveryType === 'scheduled'
                    ? placedOrder.customerDetails.scheduledSlotLabel ||
                      formatScheduledAt(placedOrder.scheduledAt || placedOrder.customerDetails.scheduledAt)
                    : 'Express Delivery (30–40 Mins)'}
                </strong>
              </p>
              <p>
                Customer Type:{' '}
                <strong>{placedOrder.isGuestCheckout ? 'Guest Checkout' : 'Registered Member'}</strong>
              </p>
            </div>
          </div>

          {/* Ordered items list */}
          <div className="space-y-2">
            <h4 className="font-bold text-[10px] text-gray-800 uppercase tracking-wider">
              Dishes in this Order ({placedOrder.items.length})
            </h4>
            <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
              {placedOrder.items.map((item, idx) => (
                <div key={idx} className="p-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={(item as any).image || item.product?.image}
                      alt={(item as any).name || item.product?.name}
                      className="w-10 h-10 rounded-lg object-cover border border-gray-200"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h5 className="font-bold text-gray-900">{(item as any).name || item.product?.name}</h5>
                      <p className="text-gray-500 text-[10px]">
                        Qty: {item.quantity} {item.selectedVariant ? `• ${item.selectedVariant.name}` : ''}
                      </p>
                    </div>
                  </div>
                  <span className="font-bold text-gray-900">₹{item.unitPrice * item.quantity}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Total Breakdown */}
          <div className="pt-2 space-y-1 text-xs text-gray-600 max-w-xs ml-auto">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-semibold text-gray-900">₹{placedOrder.subtotal}</span>
            </div>
            {placedOrder.discount > 0 && (
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Coupon Discount ({placedOrder.couponCode})</span>
                <span>- ₹{placedOrder.discount}</span>
              </div>
            )}
            {(placedOrder.welcomeDiscountAmount || 0) > 0 && (
              <div className="flex justify-between text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded">
                <span>🎉 10% Welcome Discount</span>
                <span>- ₹{placedOrder.welcomeDiscountAmount}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Packaging Fee</span>
              <span>₹{placedOrder.packagingFee}</span>
            </div>
            <div className="flex justify-between">
              <span>GST (5%)</span>
              <span>₹{placedOrder.gst}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Fee</span>
              <span>
                {placedOrder.deliveryFee === 0 ? (
                  <span className="text-emerald-600 font-bold">FREE</span>
                ) : (
                  `₹${placedOrder.deliveryFee}`
                )}
              </span>
            </div>
            <div className="pt-2 border-t border-gray-200 flex justify-between font-bold text-gray-900 text-xs">
              <span>Total Paid</span>
              <span className="font-extrabold text-orange-600 text-sm">₹{placedOrder.total}</span>
            </div>
          </div>

          {/* Next Steps CTA */}
          <div className="pt-3 flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={() => goToShop()}
              className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs transition-colors text-center"
            >
              Order Another Dish
            </button>
            <button
              type="button"
              onClick={goToHome}
              className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold text-xs transition-colors text-center"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If cart is empty and no order placed
  if (cart.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-3">
        <h2 className="font-bold text-lg text-gray-900">Your Cart is Empty</h2>
        <p className="text-xs text-gray-500">
          Please add items to your cart before proceeding to checkout.
        </p>
        <button
          type="button"
          onClick={() => goToShop()}
          className="px-5 py-2 bg-orange-600 text-white rounded-xl font-bold text-xs"
        >
          Browse Menu
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Checkout Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-extrabold text-xl sm:text-2xl text-stone-950 font-heading">
            Complete Your Order
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Guest checkout is enabled by default. Create an account for 10% welcome discount & saved addresses.
          </p>
        </div>

        {selectedLocation && (
          <div className="flex items-center gap-2 p-2 px-3 bg-amber-50 border border-amber-200 rounded-xl text-xs">
            <Store className="w-4 h-4 text-amber-800 shrink-0" />
            <div>
              <span className="font-bold text-stone-900 block">{selectedLocation.outletName}</span>
              <span className="text-[11px] text-stone-500">
                Delivering to PIN {selectedLocation.pinCode}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsLocationModalOpen(true)}
              className="text-[10px] font-bold text-amber-800 underline ml-2 hover:text-amber-950"
            >
              Change
            </button>
          </div>
        )}
      </div>

      {/* Returning Customer Recognition Banner */}
      {returningCustomerFound && !isCustomerLoggedIn && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-300/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-800 text-white flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-stone-900 flex items-center gap-1.5">
                <span>Welcome back, {returningCustomerFound.name}!</span>
                <span className="bg-amber-200/80 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded">
                  Saved Account Found
                </span>
              </h4>
              <p className="text-xs text-stone-600 mt-0.5">
                Your saved profile info and delivery address will be automatically fetched once you sign in.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTriggerOtpVerification}
              className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Sign In Now</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* Logged in Customer Welcome Pill */}
      {isCustomerLoggedIn && customer && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-center justify-between text-xs text-emerald-900">
          <div className="flex items-center gap-2.5">
            <UserCheck className="w-4 h-4 text-emerald-700" />
            <span>
              Signed in as <strong>{customer.fullName}</strong> (+91 {customer.phone})
            </span>
          </div>
          <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full text-[11px]">
            Saved Profile Active
          </span>
        </div>
      )}

      <form onSubmit={handleSubmitOrder} noValidate id="checkout-form">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Form Details (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* 1. Customer Contact Details */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-orange-600 text-white text-[10px] flex items-center justify-center">
                    1
                  </span>
                  <span>Contact Information</span>
                </h3>
                {!isCustomerLoggedIn && (
                  <span className="text-[11px] font-semibold text-stone-500">
                    Guest Checkout Enabled
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Phone Number <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500">
                      +91
                    </span>
                    <input
                      type="tel"
                      name="phone"
                      maxLength={10}
                      disabled={isCustomerLoggedIn}
                      value={formData.phone}
                      onChange={handleChange}
                      onBlur={() => handleBlur('phone')}
                      placeholder="10-digit mobile number"
                      className={`w-full pl-10 pr-9 py-2 bg-gray-50 border rounded-xl text-xs sm:text-sm focus:outline-none transition-colors disabled:bg-stone-100 disabled:text-stone-700 disabled:cursor-not-allowed disabled:border-stone-200 disabled:select-none ${
                        touched.phone && errors.phone
                          ? 'border-rose-500 bg-rose-50/40 focus:border-rose-600 text-rose-950'
                          : 'border-gray-200 focus:border-orange-500 focus:bg-white text-gray-900'
                      }`}
                    />
                    {isLookingUpPhone && (
                      <RefreshCw className="w-3.5 h-3.5 text-stone-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                    )}
                  </div>
                  {touched.phone && errors.phone && (
                    <p className="mt-1 text-[11px] text-rose-600 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.phone}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Full Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    disabled={isCustomerLoggedIn || !!returningCustomerFound}
                    value={formData.fullName}
                    onChange={handleChange}
                    onBlur={() => handleBlur('fullName')}
                    placeholder="e.g. Rahul Sharma"
                    className={`w-full px-3 py-2 bg-gray-50 border rounded-xl text-xs sm:text-sm focus:outline-none transition-colors disabled:bg-stone-100 disabled:text-stone-700 disabled:cursor-not-allowed disabled:border-stone-200 disabled:select-none ${
                      touched.fullName && errors.fullName
                        ? 'border-rose-500 bg-rose-50/40 focus:border-rose-600 text-rose-950'
                        : 'border-gray-200 focus:border-orange-500 focus:bg-white text-gray-900'
                    }`}
                  />
                  {touched.fullName && errors.fullName && (
                    <p className="mt-1 text-[11px] text-rose-600 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.fullName}</span>
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700">
                      Email Address <span className="text-stone-400 font-normal">(Optional)</span>
                    </label>
                    <span className="text-[10px] text-stone-400">
                      For digital tax invoice & live updates
                    </span>
                  </div>
                  <input
                    type="email"
                    name="email"
                    disabled={isCustomerLoggedIn || !!returningCustomerFound}
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={() => handleBlur('email')}
                    placeholder="e.g. name@example.com (optional)"
                    className={`w-full px-3 py-2 bg-gray-50 border rounded-xl text-xs sm:text-sm focus:outline-none transition-colors disabled:bg-stone-100 disabled:text-stone-700 disabled:cursor-not-allowed disabled:border-stone-200 disabled:select-none ${
                      touched.email && errors.email
                        ? 'border-rose-500 bg-rose-50/40 focus:border-rose-600 text-rose-950'
                        : 'border-gray-200 focus:border-orange-500 focus:bg-white text-gray-900'
                    }`}
                  />
                  {touched.email && errors.email && (
                    <p className="mt-1 text-[11px] text-rose-600 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.email}</span>
                    </p>
                  )}
                </div>

                {(isCustomerLoggedIn || returningCustomerFound) && (
                  <div className="sm:col-span-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-stone-700">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-amber-800 shrink-0" />
                      <span>
                        {isCustomerLoggedIn ? (
                          <>You can edit this (personal info) in Profile page.</>
                        ) : (
                          <>
                            Saved details for <strong>{returningCustomerFound?.name}</strong> found. You can edit this (personal info) in Profile page after signing in.
                          </>
                        )}
                      </span>
                    </div>
                    {isCustomerLoggedIn ? (
                      <button
                        type="button"
                        onClick={goToProfile}
                        className="text-xs font-bold text-amber-900 bg-white hover:bg-amber-100/60 border border-amber-300 px-3 py-1 rounded-lg transition-colors cursor-pointer shrink-0 self-start sm:self-auto shadow-2xs"
                      >
                        Edit in Profile →
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleTriggerOtpVerification}
                        className="text-xs font-bold text-white bg-amber-800 hover:bg-amber-900 px-3 py-1 rounded-lg transition-colors cursor-pointer shrink-0 self-start sm:self-auto shadow-2xs flex items-center gap-1"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Sign In Now</span>
                      </button>
                    )}
                  </div>
                )}

                {/* When 10-digit mobile number is not found on server & not logged in */}
                {!isCustomerLoggedIn && !returningCustomerFound && formData.phone.length === 10 && (
                  <div className="sm:col-span-2">
                    {!formData.isPhoneVerified ? (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-stone-700">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-amber-800 shrink-0" />
                          <span>
                            Verify mobile number <strong>+91 {formData.phone}</strong> via OTP to secure order
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleTriggerOtpVerification}
                          className="text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 self-start sm:self-auto shadow-2xs flex items-center gap-1.5"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Verify Mobile Number</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200/90 rounded-xl text-xs text-emerald-900 font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Mobile Number (+91 {formData.phone}) verified via OTP</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Optional Account Creation & Welcome Discount Box - ONLY shown for new customers not found on server */}
              {!isCustomerLoggedIn && !returningCustomerFound && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-2.5">
                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-amber-200/90 bg-amber-50/60 hover:bg-amber-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      name="createAccount"
                      checked={!!formData.createAccount}
                      onChange={handleChange}
                      className="accent-amber-800 w-4 h-4 mt-0.5 rounded"
                    />
                    <div className="text-xs">
                      <p className="font-bold text-stone-900 flex items-center gap-1.5">
                        <Gift className="w-4 h-4 text-amber-800 shrink-0" />
                        <span>Create account & apply 10% Welcome Discount (Save up to ₹50)</span>
                      </p>
                      <p className="text-[11px] text-stone-600 mt-0.5 leading-relaxed">
                        Saves your address for 1-click reorders and unlocks verified food reviews.
                      </p>
                    </div>
                  </label>

                  {/* Phone OTP Verification Helper */}
                  {formData.createAccount && (
                    <div className="flex items-center justify-between bg-white border border-stone-200 rounded-xl p-2.5 px-3 text-xs">
                      <div className="flex items-center gap-2">
                        {formData.isPhoneVerified ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Mobile Number Verified
                          </span>
                        ) : (
                          <span className="text-stone-600 text-[11px]">
                            Verify mobile number to confirm account
                          </span>
                        )}
                      </div>

                      {!formData.isPhoneVerified && (
                        <button
                          type="button"
                          onClick={handleTriggerOtpVerification}
                          className="px-2.5 py-1 bg-amber-800 hover:bg-amber-900 text-white font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <span>Verify via OTP</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Marketing Consent */}
                  <label className="flex items-center gap-2 px-1 text-[11px] text-stone-600 cursor-pointer">
                    <input
                      type="checkbox"
                      name="marketingConsent"
                      checked={!!formData.marketingConsent}
                      onChange={handleChange}
                      className="accent-amber-800 w-3.5 h-3.5 rounded"
                    />
                    <span>
                      Send me weekend handi chef specials & festive discount coupons on SMS/WhatsApp.
                    </span>
                  </label>
                </div>
              )}
            </div>

            {/* 2. Delivery Address & Fulfillment Method */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-orange-600 text-white text-[10px] flex items-center justify-center font-bold">
                    2
                  </span>
                  <span>Fulfillment & Delivery Details</span>
                </h3>

                {/* Fulfillment Mode Switcher Tabs */}
                <div className="inline-flex p-1 bg-stone-100 rounded-xl border border-stone-200 text-xs">
                  <button
                    type="button"
                    onClick={() => handleToggleSelfPickup(false)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      !isSelfPickup
                        ? 'bg-white text-stone-900 shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5 text-orange-600" />
                    <span>Doorstep Delivery</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleSelfPickup(true)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelfPickup
                        ? 'bg-amber-800 text-white shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Self-Pickup / Takeaway (FREE)</span>
                  </button>
                </div>
              </div>

              {/* Self-Pickup Info Card */}
              {isSelfPickup ? (
                <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-800 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Store className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-stone-900">
                          {currentOutlet?.name || selectedLocation?.outletName || 'Gaon Ka Swad Kitchen'}
                        </h4>
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                          Zero Delivery Fee
                        </span>
                      </div>
                      <p className="text-xs text-stone-700 mt-1 flex items-start gap-1">
                        <MapPin className="w-3.5 h-3.5 text-amber-800 shrink-0 mt-0.5" />
                        <span>
                          {currentOutlet?.address || 'Gaon Ka Swad Kitchen Facility, Main Commercial Hub'}
                          {currentOutlet?.city ? `, ${currentOutlet.city}` : ''}
                        </span>
                      </p>
                      {currentOutlet?.phone && (
                        <p className="text-xs text-stone-600 mt-1 flex items-center gap-1">
                          <PhoneCall className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                          <span>Kitchen Contact: <strong>{currentOutlet.phone}</strong></span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-amber-200/70 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-stone-600 gap-2">
                    <span className="flex items-center gap-1.5 text-amber-900 font-medium">
                      <Clock className="w-3.5 h-3.5 text-amber-800" />
                      Estimated Preparation Time: <strong>~25–30 mins</strong>
                    </span>
                    <span className="text-stone-500">
                      You will receive an SMS/WhatsApp when your clay pot is packed and ready.
                    </span>
                  </div>
                </div>
              ) : (
                /* Doorstep Delivery Section */
                <div className="space-y-4">
                  {/* CASE A: Saved Address Available & in View/Card Mode */}
                  {hasSavedAddress && !isCustomAddressMode && !isEditingSavedAddress ? (
                    <div className="p-4 bg-amber-50/60 border border-amber-200/90 rounded-2xl space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-amber-800 text-white flex items-center justify-center shrink-0 shadow-2xs">
                            {activeSavedAddress?.addressLabel?.toLowerCase() === 'home' ? (
                              <Home className="w-4 h-4" />
                            ) : activeSavedAddress?.addressLabel?.toLowerCase() === 'work' ? (
                              <Briefcase className="w-4 h-4" />
                            ) : (
                              <Bookmark className="w-4 h-4" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-xs sm:text-sm text-stone-900 flex items-center gap-1.5">
                                <span>{activeSavedAddress?.addressLabel || 'Primary Delivery Address'}</span>
                              </h4>
                              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Deliver to this address</span>
                              </span>
                            </div>

                            <p className="text-xs text-stone-800 mt-1 font-medium leading-relaxed">
                              {formData.address || activeSavedAddress?.fullAddress}
                            </p>
                            {(formData.landmark || activeSavedAddress?.landmark) && (
                              <p className="text-[11px] text-stone-600 mt-0.5">
                                Landmark: {formData.landmark || activeSavedAddress?.landmark}
                              </p>
                            )}
                            <p className="text-[11px] text-stone-700 font-mono mt-0.5">
                              {formData.city || activeSavedAddress?.city || 'Bhubaneswar'}, {formData.state || activeSavedAddress?.state || 'Odisha'} - {formData.pincode || activeSavedAddress?.pincode}
                            </p>
                          </div>
                        </div>

                        {/* Top right hyperlink: Switch Address */}
                        <button
                          type="button"
                          onClick={() => {
                            const targetId = customer?.id || returningCustomerFound?.addressData?.customerId;
                            const targetPhone = customer?.phone || formData.phone;
                            if (targetId || targetPhone) {
                              fetchCustomerAddresses(targetId, targetPhone);
                            }
                            setIsAddressSwitchModalOpen(true);
                          }}
                          className="text-xs font-bold text-amber-900 hover:text-amber-950 underline cursor-pointer shrink-0 py-1"
                        >
                          Switch Address
                        </button>
                      </div>

                      {/* Actions: Deliver to different address OR edit this address */}
                      <div className="pt-2 border-t border-amber-200/70 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={handleStartEditAddress}
                            className="px-3 py-1.5 bg-white border border-stone-300 hover:bg-stone-50 text-stone-800 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-amber-800" />
                            <span>Edit this Address</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleStartNewAddress}
                            className="px-3 py-1.5 bg-white border border-stone-300 hover:bg-stone-50 text-stone-800 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                          >
                            <Plus className="w-3.5 h-3.5 text-amber-800" />
                            <span>+ Add New Address</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* CASE B: Address Input Form (for New Address, Editing Saved Address, or Guests) */
                    <div className="space-y-3">
                      {/* Context Banner if entering new address */}
                      {isCustomAddressMode && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 text-stone-800">
                            <Plus className="w-4 h-4 text-amber-800 shrink-0" />
                            <span>
                              Adding a <strong>new delivery address</strong> for this order.
                            </span>
                          </div>
                          {activeSavedAddress && (
                            <button
                              type="button"
                              onClick={() => {
                                setIsCustomAddressMode(false);
                                setIsEditingSavedAddress(false);
                                setFormData((prev) => ({
                                  ...prev,
                                  address: activeSavedAddress.fullAddress || '',
                                  landmark: activeSavedAddress.landmark || '',
                                  city: activeSavedAddress.city || prev.city,
                                  state: activeSavedAddress.state || prev.state,
                                  pincode: activeSavedAddress.pincode || prev.pincode,
                                }));
                              }}
                              className="text-xs font-bold text-amber-900 hover:text-amber-950 underline flex items-center gap-1 cursor-pointer self-start sm:self-auto"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Cancel & Use Saved Address</span>
                            </button>
                          )}
                        </div>
                      )}

                      {/* Context Banner if editing saved address */}
                      {isEditingSavedAddress && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 text-stone-800">
                            <Edit3 className="w-4 h-4 text-amber-800 shrink-0" />
                            <span>Editing delivery address. Save changes when done.</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditingSavedAddress(false);
                              if (activeSavedAddress) {
                                setFormData((prev) => ({
                                  ...prev,
                                  address: activeSavedAddress.fullAddress || '',
                                  landmark: activeSavedAddress.landmark || '',
                                  city: activeSavedAddress.city || prev.city,
                                  state: activeSavedAddress.state || prev.state,
                                  pincode: activeSavedAddress.pincode || prev.pincode,
                                }));
                              }
                            }}
                            className="text-xs font-bold text-stone-600 hover:text-stone-900 underline cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      )}

                      {/* Address Label Selector (Home, Work, Other) */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                          Address Tag / Label <span className="text-rose-600">*</span>
                        </label>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <button
                            type="button"
                            onClick={() => setAddressLabelType('Home')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                              addressLabelType === 'Home'
                                ? 'bg-amber-800 text-white shadow-2xs'
                                : 'bg-gray-100 hover:bg-gray-200 text-stone-700'
                            }`}
                          >
                            <Home className="w-3.5 h-3.5" />
                            <span>Home</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setAddressLabelType('Work')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                              addressLabelType === 'Work'
                                ? 'bg-amber-800 text-white shadow-2xs'
                                : 'bg-gray-100 hover:bg-gray-200 text-stone-700'
                            }`}
                          >
                            <Briefcase className="w-3.5 h-3.5" />
                            <span>Work</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setAddressLabelType('Other')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                              addressLabelType === 'Other'
                                ? 'bg-amber-800 text-white shadow-2xs'
                                : 'bg-gray-100 hover:bg-gray-200 text-stone-700'
                            }`}
                          >
                            <Bookmark className="w-3.5 h-3.5" />
                            <span>Other</span>
                          </button>
                        </div>

                        {addressLabelType === 'Other' && (
                          <div className="mt-1">
                            <input
                              type="text"
                              value={customAddressTagline}
                              onChange={(e) => setCustomAddressTagline(e.target.value)}
                              placeholder="e.g. Mom's House, Farmhouse, Guest House, Office 2"
                              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-amber-800 focus:bg-white text-gray-900"
                            />
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Complete Address (Flat / House No / Building / Street) <span className="text-rose-600">*</span>
                        </label>
                        <input
                          type="text"
                          name="address"
                          value={formData.address}
                          onChange={handleChange}
                          onBlur={() => handleBlur('address')}
                          placeholder="e.g. Flat 301, Silver Heights, MG Road"
                          className={`w-full px-3 py-2 bg-gray-50 border rounded-xl text-xs sm:text-sm focus:outline-none transition-colors ${
                            touched.address && errors.address
                              ? 'border-rose-500 bg-rose-50/40 focus:border-rose-600 text-rose-950'
                              : 'border-gray-200 focus:border-orange-500 focus:bg-white text-gray-900'
                          }`}
                        />
                        {touched.address && errors.address && (
                          <p className="mt-1 text-[11px] text-rose-600 font-medium flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{errors.address}</span>
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Landmark <span className="text-stone-400 font-normal">(Optional)</span>
                        </label>
                        <input
                          type="text"
                          name="landmark"
                          value={formData.landmark}
                          onChange={handleChange}
                          placeholder="e.g. Near Metro Station / Behind Mall"
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-orange-500 focus:bg-white"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2.5">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            City <span className="text-rose-600">*</span>
                          </label>
                          <input
                            type="text"
                            name="city"
                            placeholder="e.g. Bhubaneswar"
                            value={formData.city}
                            onChange={handleChange}
                            onBlur={() => handleBlur('city')}
                            className={`w-full px-3 py-2 bg-gray-50 border rounded-xl text-xs sm:text-sm focus:outline-none transition-colors ${
                              touched.city && errors.city
                                ? 'border-rose-500 bg-rose-50/40 focus:border-rose-600 text-rose-950'
                                : 'border-gray-200 focus:border-orange-500 focus:bg-white text-gray-900'
                            }`}
                          />
                          {touched.city && errors.city && (
                            <p className="mt-1 text-[10px] text-rose-600 font-medium">{errors.city}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            State (Odisha) <span className="text-rose-600">*</span>
                          </label>
                          <input
                            type="text"
                            name="state"
                            placeholder="Odisha"
                            value={formData.state}
                            onChange={handleChange}
                            onBlur={() => handleBlur('state')}
                            className={`w-full px-3 py-2 bg-gray-50 border rounded-xl text-xs sm:text-sm focus:outline-none transition-colors ${
                              touched.state && errors.state
                                ? 'border-rose-500 bg-rose-50/40 focus:border-rose-600 text-rose-950'
                                : 'border-gray-200 focus:border-orange-500 focus:bg-white text-gray-900'
                            }`}
                          />
                          {touched.state && errors.state && (
                            <p className="mt-1 text-[10px] text-rose-600 font-medium">{errors.state}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            PIN Code <span className="text-rose-600">*</span>
                          </label>
                          <input
                            type="text"
                            name="pincode"
                            maxLength={6}
                            placeholder="e.g. 751024"
                            value={formData.pincode}
                            onChange={handleChange}
                            onBlur={() => handleBlur('pincode')}
                            className={`w-full px-3 py-2 bg-gray-50 border rounded-xl text-xs sm:text-sm focus:outline-none transition-colors ${
                              touched.pincode && errors.pincode
                                ? 'border-rose-500 bg-rose-50/40 focus:border-rose-600 text-rose-950'
                                : 'border-gray-200 focus:border-orange-500 focus:bg-white text-gray-900'
                            }`}
                          />
                          {touched.pincode && errors.pincode && (
                            <p className="mt-1 text-[10px] text-rose-600 font-medium">{errors.pincode}</p>
                          )}
                        </div>
                      </div>

                      {/* Save address checkbox when adding new address & logged in */}
                      {isCustomAddressMode && isCustomerLoggedIn && (
                        <label className="flex items-center gap-2 p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl cursor-pointer">
                          <input
                            type="checkbox"
                            checked={shouldSaveAddressToAccount}
                            onChange={(e) => setShouldSaveAddressToAccount(e.target.checked)}
                            className="rounded text-amber-800 focus:ring-amber-800"
                          />
                          <span className="text-xs text-stone-800 font-medium">
                            Save this address to my account as{' '}
                            <strong>
                              {addressLabelType === 'Other' ? customAddressTagline.trim() || 'Other' : addressLabelType}
                            </strong>
                          </span>
                        </label>
                      )}

                      {/* Action buttons for Edit vs New address */}
                      {isEditingSavedAddress && (
                        <div className="pt-2 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setIsEditingSavedAddress(false)}
                            className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveEditedAddress}
                            disabled={isSavingAddressInProgress}
                            className="px-4 py-1.5 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{isSavingAddressInProgress ? 'Saving...' : 'Save Changes & Deliver Here'}</span>
                          </button>
                        </div>
                      )}

                      {isCustomAddressMode && (
                        <div className="pt-2 flex items-center justify-end gap-2">
                          {activeSavedAddress && (
                            <button
                              type="button"
                              onClick={() => {
                                setIsCustomAddressMode(false);
                                setFormData((prev) => ({
                                  ...prev,
                                  address: activeSavedAddress.fullAddress || '',
                                  landmark: activeSavedAddress.landmark || '',
                                  city: activeSavedAddress.city || prev.city,
                                  state: activeSavedAddress.state || prev.state,
                                  pincode: activeSavedAddress.pincode || prev.pincode,
                                }));
                              }}
                              className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={handleSaveNewAddress}
                            disabled={isSavingAddressInProgress}
                            className="px-4 py-1.5 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{isSavingAddressInProgress ? 'Saving...' : 'Save & Deliver Here'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Dynamic PIN Code Serviceability & Outlet Verification Banner */}
                  {isPinComplete && (
                    <div className="pt-1">
                      {/* Case 1: Serviced by currently selected Kitchen */}
                      {pinServiceability.status === 'SERVICED_BY_CURRENT' && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>
                              Delivering to PIN <strong>{pinServiceability.pinCode}</strong> from{' '}
                              <strong>{pinServiceability.outletName}</strong> (Est. 30–40 mins).
                            </span>
                          </div>
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full shrink-0">
                            Kitchen Match
                          </span>
                        </div>
                      )}

                      {/* Case 2: Serviced by a different Kitchen Outlet */}
                      {pinServiceability.status === 'SERVICED_BY_OTHER' && (
                        <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 space-y-2.5 shadow-xs">
                          <div className="flex items-start gap-2.5">
                            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold text-stone-900">
                                Kitchen Routing Notice for PIN {pinServiceability.pinCode}
                              </p>
                              <p className="text-[11px] text-stone-700 mt-0.5 leading-relaxed">
                                Your delivery PIN is serviced by{' '}
                                <strong className="text-amber-900 font-semibold">
                                  {pinServiceability.altOutlet.name}
                                </strong>
                                , not your currently active kitchen (
                                {pinServiceability.currentOutletName}).
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-200/80">
                            <button
                              type="button"
                              onClick={() =>
                                handleSwitchToAltKitchen(
                                  pinServiceability.altOutlet,
                                  pinServiceability.altZone
                                )
                              }
                              className="px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-lg transition-colors flex items-center gap-1 text-xs shadow-xs cursor-pointer"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Switch to {pinServiceability.altOutlet.name}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleSelfPickup(true)}
                              className="px-3 py-1.5 bg-white border border-stone-300 hover:bg-stone-50 text-stone-800 font-medium rounded-lg transition-colors text-xs cursor-pointer"
                            >
                              Switch to Self-Pickup
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Case 3: Not serviced by ANY Kitchen Outlet */}
                      {pinServiceability.status === 'NOT_SERVICED' && (
                        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-950 space-y-2.5">
                          <div className="flex items-start gap-2.5">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold text-rose-900">
                                Delivery Unavailable for PIN {pinServiceability.pinCode}
                              </p>
                              <p className="text-[11px] text-rose-800 mt-0.5 leading-relaxed">
                                We currently do not have delivery partner coverage for this PIN code.
                              </p>
                            </div>
                          </div>

                          <div className="p-2.5 bg-white border border-rose-200 rounded-lg space-y-2">
                            <p className="text-[11px] font-bold text-stone-900">How you can still enjoy our delicacies:</p>
                            
                            <label className="flex items-start gap-2 text-stone-800 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isSelfPickup}
                                onChange={(e) => handleToggleSelfPickup(e.target.checked)}
                                className="accent-amber-800 w-4 h-4 mt-0.5 rounded"
                              />
                              <div className="text-[11px]">
                                <span className="font-bold text-amber-900">
                                  I will take care of delivery by contacting outlet (Self-Pickup / Takeaway)
                                </span>
                                <p className="text-stone-500 mt-0.5">
                                  Pickup directly from {selectedLocation?.outletName || 'our kitchen'} or arrange your own pickup partner (Dunzo / Rapido / Porter). Delivery fee is waived (₹0).
                                </p>
                              </div>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 3. Dedicated Delivery Speed & Slot Banner */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-orange-600 text-white text-[10px] flex items-center justify-center font-bold">
                    3
                  </span>
                  <span>Delivery Speed & Slot</span>
                </h3>
                <span className="text-[11px] text-stone-500 flex items-center gap-1 font-medium">
                  <Clock className="w-3.5 h-3.5 text-orange-600" />
                  <span>Fresh Handi Dispatch</span>
                </span>
              </div>

              {isSelfPickup ? (
                <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-xs text-stone-800">
                  <div className="flex items-center gap-2.5">
                    <Store className="w-4 h-4 text-amber-800 shrink-0" />
                    <div>
                      <p className="font-bold text-stone-900">Takeaway / Self-Pickup Readiness</p>
                      <p className="text-[11px] text-stone-600 mt-0.5">
                        Estimated kitchen preparation time is <strong>~25–30 mins</strong>.
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold bg-amber-100 text-amber-900 px-2.5 py-1 rounded-lg shrink-0">
                    Instant Preparation
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <label
                      className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                        formData.deliveryType === 'immediate'
                          ? 'border-orange-600 bg-orange-50/70 ring-1 ring-orange-600/30'
                          : 'border-gray-200 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="deliveryType"
                        value="immediate"
                        checked={formData.deliveryType === 'immediate'}
                        onChange={() => {
                          setFormData((prev) => ({
                            ...prev,
                            deliveryType: 'immediate',
                            scheduledAt: undefined,
                          }));
                        }}
                        className="accent-orange-600 mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-orange-600 fill-orange-500 shrink-0" />
                            <span>Express Delivery</span>
                          </p>
                          <span className="text-[10px] font-extrabold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full shrink-0">
                            30–40 Mins
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">
                          Piping hot dum-cooked clay pot dispatched right away from the live kitchen.
                        </p>
                      </div>
                    </label>

                    <div
                      onClick={handleOpenScheduleModal}
                      className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                        formData.deliveryType === 'scheduled'
                          ? 'border-orange-600 bg-orange-50/70 ring-1 ring-orange-600/30'
                          : 'border-gray-200 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="deliveryType"
                        value="scheduled"
                        checked={formData.deliveryType === 'scheduled'}
                        onChange={handleOpenScheduleModal}
                        className="accent-orange-600 mt-0.5 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-800 shrink-0" />
                            <span>Scheduled Slot</span>
                          </p>
                          <div className="flex items-center gap-1.5">
                            {formData.deliveryType === 'scheduled' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenScheduleModal();
                                }}
                                className="text-[10px] font-bold text-amber-900 underline hover:text-amber-950 cursor-pointer"
                              >
                                Change Slot
                              </button>
                            )}
                            <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full shrink-0">
                              Next 10 Days
                            </span>
                          </div>
                        </div>
                        <p className="text-[11px] text-gray-700 mt-1 leading-relaxed font-medium">
                          {scheduledSlotSummaryText}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Cooking / Delivery Instructions */}
                  <div className="pt-2 border-t border-gray-100">
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Cooking or Delivery Instructions <span className="text-stone-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      name="deliveryNotes"
                      value={formData.deliveryNotes}
                      onChange={handleChange}
                      placeholder="e.g. Ring doorbell, leave at security gate, make gravies mild spicy"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-orange-500 focus:bg-white text-gray-900 transition-colors"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 4. Payment Method */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-orange-600 text-white text-[10px] flex items-center justify-center font-bold">
                    4
                  </span>
                  <span>Payment Method (Demo Mode)</span>
                </h3>
                <span className="text-[10px] bg-gray-100 text-gray-600 font-semibold px-2 py-0.5 rounded">
                  No actual charge
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <label
                  className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                    formData.paymentMethod === 'upi'
                      ? 'border-orange-600 bg-orange-50/70 ring-1 ring-orange-600/30'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="upi"
                    checked={formData.paymentMethod === 'upi'}
                    onChange={handleChange}
                    className="accent-orange-600"
                  />
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-orange-600" />
                    <div>
                      <p className="text-xs font-bold text-gray-900">UPI / QR Code</p>
                      <p className="text-[10px] text-gray-500">GPay, PhonePe, Paytm</p>
                    </div>
                  </div>
                </label>

                <label
                  className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                    formData.paymentMethod === 'cod'
                      ? 'border-orange-600 bg-orange-50/70 ring-1 ring-orange-600/30'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                    checked={formData.paymentMethod === 'cod'}
                    onChange={handleChange}
                    className="accent-orange-600"
                  />
                  <div className="flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-emerald-600" />
                    <div>
                      <p className="text-xs font-bold text-gray-900">Cash on Delivery</p>
                      <p className="text-[10px] text-gray-500">Pay cash/UPI upon delivery</p>
                    </div>
                  </div>
                </label>

                <label
                  className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                    formData.paymentMethod === 'card'
                      ? 'border-orange-600 bg-orange-50/70 ring-1 ring-orange-600/30'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="card"
                    checked={formData.paymentMethod === 'card'}
                    onChange={handleChange}
                    className="accent-orange-600"
                  />
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    <div>
                      <p className="text-xs font-bold text-gray-900">Credit / Debit Card</p>
                      <p className="text-[10px] text-gray-500">Visa, Mastercard, RuPay</p>
                    </div>
                  </div>
                </label>

                <label
                  className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                    formData.paymentMethod === 'netbanking'
                      ? 'border-orange-600 bg-orange-50/70 ring-1 ring-orange-600/30'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="netbanking"
                    checked={formData.paymentMethod === 'netbanking'}
                    onChange={handleChange}
                    className="accent-orange-600"
                  />
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-purple-600" />
                    <div>
                      <p className="text-xs font-bold text-gray-900">Net Banking</p>
                      <p className="text-[10px] text-gray-500">All major Indian banks</p>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary & Place Order CTA (5 cols) */}
          <div className="lg:col-span-5 space-y-4 sticky top-20">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-gray-900 pb-2.5 border-b border-gray-100 flex items-center justify-between">
                <span>Order Summary</span>
                <span className="text-xs font-normal text-gray-500">
                  {cart.reduce((s, i) => s + i.quantity, 0)} Items
                </span>
              </h3>

              {/* Items preview list */}
              <div className="max-h-56 overflow-y-auto divide-y divide-gray-100 pr-1">
                {cart.map((item) => (
                  <div key={item.id} className="py-2 flex items-center justify-between gap-2.5 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="w-9 h-9 rounded-lg object-cover border border-gray-200 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 truncate">{item.product.name}</p>
                        <p className="text-[10px] text-gray-500">
                          {item.quantity}x • {item.selectedVariant ? item.selectedVariant.name : 'Standard'}
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-gray-900 shrink-0">
                      ₹{item.unitPrice * item.quantity}
                    </span>
                  </div>
                ))}
              </div>

              {/* Pricing breakdown */}
              <div className="pt-2 border-t border-gray-100 space-y-1.5 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Item Subtotal</span>
                  <span className="font-semibold text-gray-900">₹{subtotal}</span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Coupon Discount ({appliedCoupon?.code})</span>
                    <span>- ₹{discount}</span>
                  </div>
                )}

                {/* 10% Welcome Discount Row */}
                {welcomeDiscountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold bg-emerald-50/80 px-2 py-1 rounded-lg border border-emerald-200">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3 h-3 text-emerald-600" />
                      <span>10% Welcome Discount (Max ₹50)</span>
                    </span>
                    <span>- ₹{welcomeDiscountAmount}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Eco Packaging</span>
                  <span>₹{packagingFee}</span>
                </div>

                <div className="flex justify-between">
                  <span>GST (5%)</span>
                  <span>₹{gst}</span>
                </div>

                <div className="flex justify-between">
                  <span>Delivery Partner Fee</span>
                  <span>
                    {isSelfPickup ? (
                      <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded text-[11px]">
                        FREE (Self-Pickup)
                      </span>
                    ) : effectiveDeliveryFee === 0 ? (
                      <span className="text-emerald-600 font-bold">FREE</span>
                    ) : (
                      `₹${effectiveDeliveryFee}`
                    )}
                  </span>
                </div>

                <div className="pt-2.5 border-t border-gray-200 flex justify-between items-baseline text-xs font-bold text-gray-900">
                  <span>Final Amount</span>
                  <span className="font-extrabold text-xl text-orange-600">
                    ₹{effectiveTotal}
                  </span>
                </div>
              </div>

              {placeOrderValidation.actionRequired === 'SIGN_IN_REQUIRED' ? (
                <button
                  type="button"
                  onClick={handleTriggerOtpVerification}
                  id="place-order-submit-btn"
                  className="w-full py-3 rounded-xl font-bold text-xs sm:text-sm shadow-xs transition-colors flex items-center justify-center gap-2 bg-amber-800 hover:bg-amber-900 active:bg-amber-950 text-white cursor-pointer"
                >
                  <Lock className="w-4 h-4 text-amber-200" />
                  <span>Sign In with OTP to Place Order</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : placeOrderValidation.actionRequired === 'SAVE_EDITED_ADDRESS' ? (
                <button
                  type="button"
                  onClick={handleSaveEditedAddress}
                  id="place-order-submit-btn"
                  className="w-full py-3 rounded-xl font-bold text-xs sm:text-sm shadow-xs transition-colors flex items-center justify-center gap-2 bg-amber-800 hover:bg-amber-900 active:bg-amber-950 text-white cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Address Changes to Proceed</span>
                </button>
              ) : placeOrderValidation.actionRequired === 'SAVE_NEW_ADDRESS' ? (
                <button
                  type="button"
                  onClick={handleSaveNewAddress}
                  id="place-order-submit-btn"
                  className="w-full py-3 rounded-xl font-bold text-xs sm:text-sm shadow-xs transition-colors flex items-center justify-center gap-2 bg-amber-800 hover:bg-amber-900 active:bg-amber-950 text-white cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Save & Confirm Address to Proceed</span>
                </button>
              ) : (
                <button
                  type="submit"
                  id="place-order-submit-btn"
                  disabled={!isPlaceOrderEnabled}
                  className={`w-full py-3 rounded-xl font-bold text-xs sm:text-sm shadow-xs transition-colors flex items-center justify-center gap-1.5 ${
                    isPlaceOrderEnabled
                      ? 'bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white cursor-pointer'
                      : 'bg-stone-300 text-stone-600 cursor-not-allowed opacity-75'
                  }`}
                >
                  {isSubmitting ? (
                    <span>Sending to Kitchen...</span>
                  ) : !isPlaceOrderEnabled ? (
                    <span>{placeOrderValidation.buttonLabel}</span>
                  ) : (
                    <>
                      <span>{placeOrderValidation.buttonLabel}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              )}

              <p className="text-center text-[10px] text-gray-400">
                By placing your order, you agree to Gaon Ka Swad terms & gourmet delivery policy.
              </p>
            </div>
          </div>
        </div>
      </form>

      {/* Switch Address Modal Popup */}
      <AnimatePresence>
        {isAddressSwitchModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="px-5 py-4 bg-stone-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-800 flex items-center justify-center text-white shrink-0 shadow-2xs">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">Select Delivery Address</h3>
                    <p className="text-[11px] text-stone-300">Fetched live from database</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleRefreshAddressesFromDB}
                    disabled={isSyncingAddresses}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-stone-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                    title="Refresh fresh from database"
                    aria-label="Refresh addresses from database"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncingAddresses ? 'animate-spin text-amber-400' : ''}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddressSwitchModalOpen(false)}
                    className="w-8 h-8 rounded-full hover:bg-white/10 text-stone-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modal Body - Address List */}
              <div className="p-5 overflow-y-auto space-y-3 flex-1">
                {isSyncingAddresses ? (
                  <div className="text-center py-8 px-4 bg-stone-50 rounded-xl border border-stone-200">
                    <RefreshCw className="w-6 h-6 text-amber-800 animate-spin mx-auto mb-2" />
                    <p className="text-xs font-bold text-stone-800">Fetching addresses from database...</p>
                  </div>
                ) : modalAddresses && modalAddresses.length > 0 ? (
                  modalAddresses.map((addr) => {
                    const isSelected =
                      (Boolean(addr.id) && (addr.id === selectedAddressId || addr.id === activeSavedAddress?.id)) ||
                      (addr.fullAddress === formData.address && addr.pincode === formData.pincode);
                    const label = addr.addressLabel || 'Home';
                    const isHome = label.toLowerCase() === 'home';
                    const isWork = label.toLowerCase() === 'work';

                    return (
                      <div
                        key={addr.id || `${addr.fullAddress}-${addr.pincode}`}
                        onClick={() => handleSelectSavedAddress(addr)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                          isSelected
                            ? 'border-amber-800 bg-amber-50/70 shadow-2xs ring-1 ring-amber-800/40'
                            : 'border-stone-200 bg-white hover:border-amber-400 hover:bg-stone-50/80'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                isSelected ? 'bg-amber-800 text-white' : 'bg-stone-100 text-stone-700'
                              }`}
                            >
                              {isHome ? (
                                <Home className="w-4 h-4" />
                              ) : isWork ? (
                                <Briefcase className="w-4 h-4" />
                              ) : (
                                <Bookmark className="w-4 h-4" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-xs text-stone-900">{label}</span>
                                {addr.isDefault && (
                                  <span className="text-[10px] font-bold bg-stone-200 text-stone-800 px-2 py-0.5 rounded-full">
                                    Default
                                  </span>
                                )}
                                {isSelected && (
                                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    Selected
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-stone-800 mt-1 font-medium leading-relaxed">
                                {addr.fullAddress}
                              </p>
                              {addr.landmark && (
                                <p className="text-[11px] text-stone-600 mt-0.5">
                                  Landmark: {addr.landmark}
                                </p>
                              )}
                              <p className="text-[11px] text-stone-600 font-mono mt-0.5">
                                {addr.city || 'Bhubaneswar'}, {addr.state || 'Odisha'} - {addr.pincode}
                              </p>
                            </div>
                          </div>

                          {!isSelected && (
                            <div className="flex items-center shrink-0 self-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectSavedAddress(addr);
                                }}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer bg-stone-100 text-stone-700 hover:bg-amber-800 hover:text-white"
                              >
                                Deliver Here
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6 px-4 bg-stone-50 rounded-xl border border-stone-200">
                    <MapPin className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                    <p className="text-xs font-bold text-stone-800">No saved addresses found in database</p>
                    <p className="text-[11px] text-stone-500 mt-1">
                      Add a new delivery address to save it to your account.
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddressSwitchModalOpen(false)}
                  className="px-4 py-2 bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleStartNewAddress}
                  className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add New Address</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCHEDULED DELIVERY SLOT POPUP MODAL (NEXT 10 DAYS + TIME SLOTS)           */}
        {/* ========================================================================= */}
        {isScheduleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-md sm:max-w-lg w-full overflow-hidden flex flex-col max-h-[88vh]"
            >
              {/* Modal Header */}
              <div className="p-3 sm:p-3.5 border-b border-stone-100 flex items-center justify-between bg-amber-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-800 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs sm:text-sm text-stone-900 flex items-center gap-1.5">
                      <span>Choose Delivery Date & Time Slot</span>
                      <span className="text-[9px] font-extrabold bg-amber-200/80 text-amber-900 px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                        Next 10 Days
                      </span>
                    </h3>
                    <p className="text-[11px] text-stone-600 flex items-center flex-wrap gap-1 mt-0.5">
                      <span>Fresh food dispatch,</span>
                      <span className="font-semibold text-amber-900 bg-amber-100/90 border border-amber-300/80 px-1.5 py-0.5 rounded text-[10px] tracking-wide inline-flex items-center gap-1 shadow-2xs">
                        <Sparkles className="w-2.5 h-2.5 text-amber-700 shrink-0" />
                        scheduled at your convenience.
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-3 sm:p-4 overflow-y-auto space-y-4 flex-1">
                {/* Step 1: Date Selection */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-stone-900 flex items-center gap-1.5 uppercase tracking-wider">
                      <span className="w-3.5 h-3.5 rounded-full bg-amber-800 text-white text-[8px] flex items-center justify-center font-bold">1</span>
                      <span>Select Date (Next 10 Days)</span>
                    </label>
                    <span className="text-[10px] font-semibold text-amber-900">
                      Selected: <strong>{modalScheduleDate}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-1.5">
                    {next10Days.map((day) => {
                      const isSelected = modalScheduleDate === day.formatted;
                      return (
                        <button
                          key={day.dateStr}
                          type="button"
                          onClick={() => {
                            setModalScheduleDate(day.formatted);
                            setModalScheduleDateStr(day.dateStr);
                          }}
                          className={`p-1.5 sm:p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center relative cursor-pointer ${
                            isSelected
                              ? 'border-amber-800 bg-amber-50/90 ring-1.5 ring-amber-800 text-amber-950 shadow-2xs'
                              : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50 text-stone-700'
                          }`}
                        >
                          {day.isToday && (
                            <span className="text-[8px] font-extrabold uppercase bg-orange-600 text-white px-1 py-0.2 rounded-full absolute -top-1.5 leading-none">
                              Today
                            </span>
                          )}
                          {day.isTomorrow && (
                            <span className="text-[8px] font-bold uppercase bg-stone-700 text-white px-1 py-0.2 rounded-full absolute -top-1.5 leading-none">
                              Tmrw
                            </span>
                          )}
                          <span className="text-[9px] font-bold tracking-wider uppercase opacity-75 leading-none">
                            {day.dayName}
                          </span>
                          <span className="text-sm sm:text-base font-black my-0.5 leading-none">
                            {day.dayNumber}
                          </span>
                          <span className="text-[9px] font-semibold opacity-80 uppercase leading-none">
                            {day.monthName}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Step 2: Time Slot Selection */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-stone-900 flex items-center gap-1.5 uppercase tracking-wider">
                      <span className="w-3.5 h-3.5 rounded-full bg-amber-800 text-white text-[8px] flex items-center justify-center font-bold">2</span>
                      <span>Select Preferred Time Slot</span>
                    </label>
                    <span className="text-[10px] font-semibold text-amber-900">
                      {modalScheduleTime}
                    </span>
                  </div>

                  {/* Lunch Group */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1 text-[11px] font-bold text-stone-700">
                      <Sun className="w-3 h-3 text-amber-600" />
                      <span>Lunch Dining (12:30 PM – 3:30 PM)</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {SCHEDULE_TIME_SLOTS.filter((s) => s.category === 'Lunch').map((slot) => {
                        const isSelected = modalScheduleTime === slot.timeRange;
                        return (
                          <button
                            key={slot.id}
                            type="button"
                            onClick={() => {
                              setModalScheduleTime(slot.timeRange);
                              setModalScheduleCategory(slot.categoryLabel);
                            }}
                            className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                              isSelected
                                ? 'border-amber-800 bg-amber-50/90 ring-1.5 ring-amber-800 text-amber-950 shadow-2xs'
                                : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50 text-stone-700'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <span className="text-[11px] font-bold leading-tight">{slot.label}</span>
                              {isSelected ? (
                                <CheckCircle2 className="w-3 h-3 text-amber-800 shrink-0" />
                              ) : slot.isPopular ? (
                                <span className="text-[8px] font-bold bg-amber-100 text-amber-900 px-1 py-0.2 rounded">
                                  Top
                                </span>
                              ) : null}
                            </div>
                            <p className="text-[10px] font-mono font-bold text-stone-900">
                              {slot.timeRange}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Evening & Dinner Group */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1 text-[11px] font-bold text-stone-700">
                      <Moon className="w-3 h-3 text-indigo-700" />
                      <span>Evening Dining & Dinner (7:00 PM – 10:30 PM)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {SCHEDULE_TIME_SLOTS.filter((s) => s.category !== 'Lunch').map((slot) => {
                        const isSelected = modalScheduleTime === slot.timeRange;
                        return (
                          <button
                            key={slot.id}
                            type="button"
                            onClick={() => {
                              setModalScheduleTime(slot.timeRange);
                              setModalScheduleCategory(slot.categoryLabel);
                            }}
                            className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                              isSelected
                                ? 'border-amber-800 bg-amber-50/90 ring-1.5 ring-amber-800 text-amber-950 shadow-2xs'
                                : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50 text-stone-700'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1">
                                <span className="text-[11px] font-bold text-stone-900">{slot.label}</span>
                                {slot.isPopular && (
                                  <span className="text-[8px] font-extrabold bg-orange-100 text-orange-800 px-1 py-0.2 rounded-full">
                                    ★ Popular
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] font-mono font-bold text-stone-900 mt-0.2">
                                {slot.timeRange}
                              </p>
                              <p className="text-[9px] text-stone-500 truncate">{slot.description}</p>
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-amber-800 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Live Slot Summary Message Preview */}
                <div className="p-2.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300/80 rounded-xl flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-800 shrink-0 mt-0.5" />
                  <div className="text-[11px] leading-tight">
                    <p className="font-bold text-stone-900">
                      Scheduled for {modalScheduleCategory} (Delivery between {modalScheduleTime} on {modalScheduleDate})
                    </p>
                    <p className="text-[10px] text-stone-600 mt-0.5">
                      Kitchen will cook your order fresh and aim to deliver it hot right within this window.
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-3.5 py-1.5 bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmScheduleSlot}
                  className="px-5 py-1.5 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Done (Confirm Slot)</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
