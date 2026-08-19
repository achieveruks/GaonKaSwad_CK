import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useNavigation } from '../context/NavigationContext';
import { useLocation } from '../context/LocationContext';
import { CheckoutFormData, Order } from '../types';
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
} from 'lucide-react';
import { motion } from 'motion/react';

export const CheckoutPage: React.FC = () => {
  const {
    cart,
    subtotal,
    discount,
    deliveryFee,
    packagingFee,
    gst,
    total,
    appliedCoupon,
    includeCutlery,
    specialInstructions,
    clearCart,
  } = useCart();

  const { goToHome, goToShop } = useNavigation();
  const { selectedLocation, setIsLocationModalOpen } = useLocation();

  // Form State
  const [formData, setFormData] = useState<CheckoutFormData>({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    landmark: '',
    city: selectedLocation?.cityName || '',
    state: selectedLocation?.stateName || '',
    pincode: selectedLocation ? selectedLocation.pinCode : '',
    deliverySlot: 'immediate',
    deliveryNotes: specialInstructions || '',
    paymentMethod: 'upi',
    includeCutlery,
  });

  // Validation State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Sync with selected location
  useEffect(() => {
    if (selectedLocation) {
      setFormData((prev) => ({
        ...prev,
        pincode: selectedLocation.pinCode || prev.pincode,
        city: selectedLocation.cityName || prev.city,
        state: selectedLocation.stateName || prev.state,
      }));
    }
  }, [selectedLocation]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [orderStage, setOrderStage] = useState<
    'Received' | 'Preparing in Kitchen' | 'Out for Delivery' | 'Delivered'
  >('Received');

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
    const fieldsToValidate = ['fullName', 'phone', 'email', 'address', 'city', 'state', 'pincode'];
    
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
        origin: { y: 0.6 }
      });

      // Advance stage simulator every 6 seconds for delightful live feedback
      const timer1 = setTimeout(() => setOrderStage('Preparing in Kitchen'), 3500);
      const timer2 = setTimeout(() => setOrderStage('Out for Delivery'), 9000);

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

    setIsSubmitting(true);

    const randomOrderNum = Math.floor(100000 + Math.random() * 900000);
    const newOrder: Order = {
      orderId: `GKSWAD-${randomOrderNum}`,
      outletId: selectedLocation?.outletId || 'outlet-1',
      outletName: selectedLocation?.outletName || 'Gaon Ka Swad - Bangalore Indiranagar',
      deliveryPinCode: selectedLocation?.pinCode || formData.pincode,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      items: [...cart],
      subtotal,
      discount,
      deliveryFee,
      packagingFee,
      gst,
      total,
      couponCode: appliedCoupon ? appliedCoupon.code : undefined,
      customerDetails: { ...formData },
      status: 'Received',
      estimatedDeliveryMinutes: 35,
    };

    try {
      await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder),
      });
    } catch {
      // Continue gracefully in demo
    }

    setPlacedOrder(newOrder);
    setIsSubmitting(false);
    clearCart();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // If order was already placed, show the success tracking screen
  if (placedOrder) {
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
              <span>Order Successfully Placed</span>
            </div>
            <h1 className="font-extrabold text-xl sm:text-3xl text-gray-900">
              Thank You for Your Order!
            </h1>
            <p className="text-xs text-gray-600 max-w-md mx-auto">
              Our master chefs have received your handi request and are preparing your fresh delicacies.
            </p>
          </div>

          {/* Order ID Pill */}
          <div className="inline-block bg-gray-900 text-gray-100 rounded-xl px-5 py-2.5 border border-gray-800">
            <span className="text-[10px] text-gray-400 block font-medium">Your Order ID</span>
            <span className="font-mono font-bold text-base text-orange-400">
              {placedOrder.orderId}
            </span>
          </div>

          {/* Live Order Tracker Stepper */}
          <div className="pt-6 border-t border-gray-100 max-w-2xl mx-auto">
            <div className="text-left mb-3">
              <h3 className="font-bold text-sm text-gray-900">
                Live Kitchen Tracker
              </h3>
              <p className="text-xs text-gray-500">
                Estimated Delivery: ~{placedOrder.estimatedDeliveryMinutes} mins
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
                    orderStage === 'Out for Delivery' || orderStage === 'Delivered'
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                </div>
                <p className="text-xs font-bold text-gray-900">On The Way</p>
                <p className="text-[10px] text-gray-400">Insulated Box</p>
              </div>

              {/* Step 4 */}
              <div className="space-y-1">
                <div
                  className={`w-8 h-8 rounded-full mx-auto flex items-center justify-center font-bold text-xs transition-colors ${
                    orderStage === 'Delivered'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  🎉
                </div>
                <p className="text-xs font-bold text-gray-900">Delivered</p>
                <p className="text-[10px] text-gray-400">Enjoy Feast</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Invoice & Order Summary Details */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-200">
            <h3 className="font-bold text-sm text-gray-900">
              Delivery Invoice Summary
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

          {/* Delivery Address Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-stone-600 bg-stone-50 rounded-xl p-3.5 border border-stone-200">
            <div>
              <p className="font-bold text-stone-900 mb-1">Delivering To:</p>
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
            </div>

            <div>
              <p className="font-bold text-stone-900 mb-1">Fulfillment Kitchen & Slot:</p>
              <p className="text-amber-800 font-bold flex items-center gap-1">
                <Store className="w-3.5 h-3.5" />
                <span>{placedOrder.outletName || 'Gaon Ka Swad Kitchen'}</span>
              </p>
              <p className="capitalize mt-1">
                Method: <strong>{placedOrder.customerDetails.paymentMethod.toUpperCase()}</strong> (Demo Test)
              </p>
              <p className="capitalize">
                Slot: <strong>{placedOrder.customerDetails.deliverySlot}</strong>
              </p>
              <p>
                Cutlery:{' '}
                <strong>
                  {placedOrder.customerDetails.includeCutlery ? 'Included' : 'Eco Friendly (No Cutlery)'}
                </strong>
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
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-10 h-10 rounded-lg object-cover border border-gray-200"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h5 className="font-bold text-gray-900">{item.product.name}</h5>
                      <p className="text-gray-500 text-[10px]">
                        Qty: {item.quantity} {item.selectedVariant ? `• ${item.selectedVariant.name}` : ''}
                      </p>
                    </div>
                  </div>
                  <span className="font-bold text-gray-900">
                    ₹{item.unitPrice * item.quantity}
                  </span>
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
                <span>Discount ({placedOrder.couponCode})</span>
                <span>- ₹{placedOrder.discount}</span>
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
              <span className="font-extrabold text-orange-600 text-sm">
                ₹{placedOrder.total}
              </span>
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
        <h2 className="font-bold text-lg text-gray-900">
          Your Cart is Empty
        </h2>
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
            Review your delivery details and choose payment method for hot & fresh delivery.
          </p>
        </div>

        {selectedLocation && (
          <div className="flex items-center gap-2 p-2 px-3 bg-amber-50 border border-amber-200 rounded-xl text-xs">
            <Store className="w-4 h-4 text-amber-800 shrink-0" />
            <div>
              <span className="font-bold text-stone-900 block">{selectedLocation.outletName}</span>
              <span className="text-[11px] text-stone-500">Delivering to PIN {selectedLocation.pinCode}</span>
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

      <form onSubmit={handleSubmitOrder} noValidate id="checkout-form">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Form Details (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* 1. Customer Contact Details */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-3">
              <h3 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-orange-600 text-white text-[10px] flex items-center justify-center">
                  1
                </span>
                <span>Contact Details</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Full Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    onBlur={() => handleBlur('fullName')}
                    placeholder="e.g. Rahul Sharma"
                    className={`w-full px-3 py-2 bg-gray-50 border rounded-xl text-xs sm:text-sm focus:outline-none transition-colors ${
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
                      value={formData.phone}
                      onChange={handleChange}
                      onBlur={() => handleBlur('phone')}
                      placeholder="10-digit mobile number"
                      className={`w-full pl-10 pr-3 py-2 bg-gray-50 border rounded-xl text-xs sm:text-sm focus:outline-none transition-colors ${
                        touched.phone && errors.phone
                          ? 'border-rose-500 bg-rose-50/40 focus:border-rose-600 text-rose-950'
                          : 'border-gray-200 focus:border-orange-500 focus:bg-white text-gray-900'
                      }`}
                    />
                  </div>
                  {touched.phone && errors.phone && (
                    <p className="mt-1 text-[11px] text-rose-600 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.phone}</span>
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700">
                      Email Address <span className="text-stone-400 font-normal">(Optional)</span>
                    </label>
                    <span className="text-[10px] text-stone-400">For digital invoice & order tracking</span>
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={() => handleBlur('email')}
                    placeholder="e.g. name@example.com (optional)"
                    className={`w-full px-3 py-2 bg-gray-50 border rounded-xl text-xs sm:text-sm focus:outline-none transition-colors ${
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
              </div>
            </div>

            {/* 2. Delivery Address */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-3">
              <h3 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-orange-600 text-white text-[10px] flex items-center justify-center">
                  2
                </span>
                <span>Delivery Address & Slot</span>
              </h3>

              <div className="space-y-3">
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
                      placeholder="e.g. Bangalore"
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
                      State <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      name="state"
                      placeholder="e.g. Karnataka"
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

                {/* Delivery Slot Choice */}
                <div className="pt-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Delivery Speed & Slot
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <label
                      className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                        formData.deliverySlot === 'immediate'
                          ? 'border-orange-600 bg-orange-50/70 ring-1 ring-orange-600/30'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="deliverySlot"
                        value="immediate"
                        checked={formData.deliverySlot === 'immediate'}
                        onChange={handleChange}
                        className="accent-orange-600"
                      />
                      <div>
                        <p className="text-xs font-bold text-gray-900 flex items-center gap-1">
                          <Truck className="w-3.5 h-3.5 text-orange-600" />
                          Express 30–40 Mins
                        </p>
                        <p className="text-[10px] text-gray-500">Piping hot oven delivery</p>
                      </div>
                    </label>

                    <label
                      className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                        formData.deliverySlot === 'dinner'
                          ? 'border-orange-600 bg-orange-50/70 ring-1 ring-orange-600/30'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="deliverySlot"
                        value="dinner"
                        checked={formData.deliverySlot === 'dinner'}
                        onChange={handleChange}
                        className="accent-orange-600"
                      />
                      <div>
                        <p className="text-xs font-bold text-gray-900 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-gray-700" />
                          Scheduled Slot
                        </p>
                        <p className="text-[10px] text-gray-500">Deliver between 8:00 - 9:00 PM</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Payment Method */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-orange-600 text-white text-[10px] flex items-center justify-center">
                    3
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
                    <span>Discount ({appliedCoupon?.code})</span>
                    <span>- ₹{discount}</span>
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
                    {deliveryFee === 0 ? (
                      <span className="text-emerald-600 font-bold">FREE</span>
                    ) : (
                      `₹${deliveryFee}`
                    )}
                  </span>
                </div>

                <div className="pt-2.5 border-t border-gray-200 flex justify-between items-baseline text-xs font-bold text-gray-900">
                  <span>Final Amount</span>
                  <span className="font-extrabold text-xl text-orange-600">
                    ₹{total}
                  </span>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                id="place-order-submit-btn"
                disabled={isSubmitting}
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 disabled:opacity-75 text-white rounded-xl font-bold text-xs sm:text-sm shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Sending to Kitchen...</span>
                ) : (
                  <>
                    <span>Place Order (₹{total})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              <p className="text-center text-[10px] text-gray-400">
                By placing your order, you agree to Gaon Ka Swad terms & gourmet delivery policy.
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
