import React, { useState, useEffect, useMemo } from 'react';
import { useCustomer } from '../context/CustomerContext';
import { useNavigation } from '../context/NavigationContext';
import { useCart } from '../context/CartContext';
import { useLocation } from '../context/LocationContext';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Save,
  LogOut,
  ShoppingBag,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Plus,
  AlertCircle,
  Edit2,
  Trash2,
  Home,
  Briefcase,
  Bookmark,
  Check,
  Star,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { isSupabaseConfigured } from '../lib/supabase';
import { fetchSupabaseOrdersByPhone } from '../lib/supabaseService';
import { CustomerAddress, Order, Product } from '../types';
import { PRODUCTS } from '../data/products';
import { isProductAvailableAtOutlet, isProductInStockAtOutlet } from '../lib/locationService';
import { OrderCard } from '../components/profile/OrderCard';
import { OrderDetailsModal } from '../components/profile/OrderDetailsModal';
import { OrderReviewModal } from '../components/profile/OrderReviewModal';
import { OrderSkeleton } from '../components/profile/OrderSkeleton';

export const ProfilePage: React.FC = () => {
  const {
    customer,
    defaultAddress,
    savedAddresses,
    isCustomerLoggedIn,
    saveProfile,
    logoutCustomer,
    openOtpModal,
    fetchCustomerAddresses,
    saveNewAddress,
    updateAddress,
    deleteAddress,
    setAddressAsDefault,
  } = useCustomer();
  const { goToHome, goToShop, goToCheckout, goToOrders } = useNavigation();
  const { addToCart, showToast, setIsCartDrawerOpen } = useCart();
  const { currentOutlet } = useLocation();

  // Profile Form State
  const [fullName, setFullName] = useState(customer?.fullName || '');
  const [email, setEmail] = useState(customer?.email || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [saveProfileSuccess, setSaveProfileSuccess] = useState(false);
  const [saveProfileError, setSaveProfileError] = useState<string | null>(null);

  // Address Modal / Form State
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [addressModalMode, setAddressModalMode] = useState<'add' | 'edit'>('add');
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);

  // Form Fields for Add / Edit Address
  const [formLabel, setFormLabel] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [formCustomLabel, setFormCustomLabel] = useState('');
  const [formFullAddress, setFormFullAddress] = useState('');
  const [formLandmark, setFormLandmark] = useState('');
  const [formCity, setFormCity] = useState('Bhubaneswar');
  const [formState, setFormState] = useState('Odisha');
  const [formPincode, setFormPincode] = useState('');
  const [formIsDefault, setFormIsDefault] = useState(false);

  const [isSubmittingAddress, setIsSubmittingAddress] = useState(false);
  const [addressFormError, setAddressFormError] = useState<string | null>(null);
  const [addressFeedbackMessage, setAddressFeedbackMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Action status states
  const [isSyncingAddresses, setIsSyncingAddresses] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Order History State
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [orderFilter, setOrderFilter] = useState<'all' | 'active' | 'delivered' | 'cancelled'>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ordersPerPage = 5;

  // Selected Order Modals
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<Order | null>(null);
  const [selectedOrderForReview, setSelectedOrderForReview] = useState<Order | null>(null);

  useEffect(() => {
    if (customer) {
      setFullName(customer.fullName || '');
      setEmail(customer.email || '');
    }
  }, [customer]);

  // Load customer addresses from database on mount & customer change
  useEffect(() => {
    if (customer?.id || customer?.phone) {
      fetchCustomerAddresses(customer?.id, customer?.phone);
    }
  }, [customer?.id, customer?.phone, fetchCustomerAddresses]);

  // Load Order History for Customer
  const fetchOrders = async () => {
    if (!customer?.phone) return;
    setIsLoadingOrders(true);
    setOrdersError(null);
    try {
      if (isSupabaseConfigured()) {
        const { orders: supaOrders } = await fetchSupabaseOrdersByPhone(customer.phone);
        if (supaOrders && supaOrders.length > 0) {
          // Sort newest first
          const sorted = [...supaOrders].sort(
            (a, b) =>
              new Date(b.createdAt || (b as any).timestamp || 0).getTime() -
              new Date(a.createdAt || (a as any).timestamp || 0).getTime()
          );
          setOrders(sorted);
          setIsLoadingOrders(false);
          return;
        }
      }

      const res = await fetch(`/api/orders?phone=${encodeURIComponent(customer.phone)}`);
      const data = await res.json();
      if (data.orders) {
        const sorted = [...data.orders].sort(
          (a, b) =>
            new Date(b.createdAt || (b as any).timestamp || 0).getTime() -
            new Date(a.createdAt || (a as any).timestamp || 0).getTime()
        );
        setOrders(sorted);
      } else {
        setOrders([]);
      }
      setIsLoadingOrders(false);
    } catch (err: any) {
      console.warn('Error loading orders:', err);
      setOrdersError(err.message || 'Unable to load your orders.');
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [customer?.phone]);

  // Reorder Handler (Outlet aware, current prices, current stock check)
  const handleReorder = (orderToReorder: Order) => {
    if (!orderToReorder.items || orderToReorder.items.length === 0) {
      showToast('Reorder Error', 'No items found in this order.', 'error');
      return;
    }

    const currentOutletId = currentOutlet?.id || 'blr-hsr';
    let addedCount = 0;
    let unavailableCount = 0;
    const unavailableNames: string[] = [];

    orderToReorder.items.forEach((rawItem: any) => {
      const productId = rawItem.productId || rawItem.id || rawItem.product?.id;
      const itemName = rawItem.name || rawItem.product?.name || 'Dish';
      const itemVariantName = rawItem.selectedVariant?.name || rawItem.variantName || rawItem.variant?.name;
      const itemSpiceLevel = rawItem.selectedSpiceLevel || rawItem.spiceLevel;
      const itemQuantity = Number(rawItem.quantity || 1);

      // Find current product in catalog
      const product = PRODUCTS.find(
        (p) =>
          String(p.id) === String(productId) ||
          p.name.toLowerCase().trim() === itemName.toLowerCase().trim()
      );

      if (!product) {
        unavailableCount += 1;
        unavailableNames.push(itemName);
        return;
      }

      // Check outlet availability & stock
      const isAvailable = isProductAvailableAtOutlet(product, currentOutletId);
      const inStock = isProductInStockAtOutlet(product, currentOutletId);

      if (!isAvailable || !inStock) {
        unavailableCount += 1;
        unavailableNames.push(itemName);
        return;
      }

      // Find variant if item had variant
      const variant = itemVariantName
        ? product.variants?.find((v) => v.name.toLowerCase() === itemVariantName.toLowerCase())
        : undefined;

      const success = addToCart(
        product,
        itemQuantity,
        variant,
        itemSpiceLevel,
        undefined
      );

      if (success) {
        addedCount += 1;
      } else {
        unavailableCount += 1;
        unavailableNames.push(itemName);
      }
    });

    if (addedCount > 0 && unavailableCount === 0) {
      showToast(
        'Items Added to Cart',
        `Added ${addedCount} dish${addedCount > 1 ? 'es' : ''} from Order #${orderToReorder.orderId || orderToReorder.id} to your cart with current outlet pricing.`,
        'success'
      );
      setIsCartDrawerOpen(true);
    } else if (addedCount > 0 && unavailableCount > 0) {
      showToast(
        'Reordered Available Dishes',
        `${addedCount} item(s) added to cart. ${unavailableCount} item(s) (${unavailableNames.join(', ')}) are currently unavailable at ${currentOutlet?.name || 'this outlet'}.`,
        'info'
      );
      setIsCartDrawerOpen(true);
    } else {
      showToast(
        'Items Unavailable',
        `Dishes from this past order are currently not available or out of stock at ${currentOutlet?.name || 'your selected outlet'}.`,
        'error'
      );
    }
  };

  // Active and Past orders separation
  const { activeOrders, pastOrders } = useMemo(() => {
    const activeList: Order[] = [];
    const pastList: Order[] = [];

    orders.forEach((ord) => {
      const st = ((ord as any).order_status || ord.orderStatus || ord.status || '').toLowerCase().trim();
      if (
        st === 'pending' ||
        st === 'pending payment' ||
        st === 'received' ||
        st === 'confirmed' ||
        st === 'preparing' ||
        st === 'ready' ||
        st === 'out_for_delivery' ||
        st === 'out for delivery'
      ) {
        activeList.push(ord);
      } else {
        pastList.push(ord);
      }
    });

    return {
      activeOrders: activeList,
      pastOrders: pastList,
    };
  }, [orders]);

  const showAddressFeedback = (type: 'success' | 'error', text: string) => {
    setAddressFeedbackMessage({ type, text });
    setTimeout(() => {
      setAddressFeedbackMessage(null);
    }, 3500);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer?.phone) return;

    if (!fullName.trim()) {
      setSaveProfileError('Please enter your full name');
      return;
    }

    setIsSavingProfile(true);
    setSaveProfileError(null);
    setSaveProfileSuccess(false);

    try {
      const res = await saveProfile({
        phone: customer.phone,
        fullName: fullName.trim(),
        email: email.trim() || undefined,
      });

      setIsSavingProfile(false);
      if (res.success) {
        setSaveProfileSuccess(true);
        setTimeout(() => setSaveProfileSuccess(false), 3000);
      } else {
        setSaveProfileError(res.error || 'Failed to update profile');
      }
    } catch (err: any) {
      setIsSavingProfile(false);
      setSaveProfileError(err.message || 'An error occurred while saving profile');
    }
  };

  // Open Add Address Modal
  const handleOpenAddAddress = () => {
    setAddressModalMode('add');
    setEditingAddressId(null);
    setFormLabel('Home');
    setFormCustomLabel('');
    setFormFullAddress('');
    setFormLandmark('');
    setFormCity('Bhubaneswar');
    setFormState('Odisha');
    setFormPincode('');
    setFormIsDefault(savedAddresses.length === 0);
    setAddressFormError(null);
    setIsAddressModalOpen(true);
  };

  // Open Edit Address Modal
  const handleOpenEditAddress = (addr: CustomerAddress) => {
    setAddressModalMode('edit');
    setEditingAddressId(addr.id);

    const lbl = addr.addressLabel || 'Home';
    if (lbl.toLowerCase() === 'home') {
      setFormLabel('Home');
      setFormCustomLabel('');
    } else if (lbl.toLowerCase() === 'work') {
      setFormLabel('Work');
      setFormCustomLabel('');
    } else {
      setFormLabel('Other');
      setFormCustomLabel(lbl);
    }

    setFormFullAddress(addr.fullAddress || '');
    setFormLandmark(addr.landmark || '');
    setFormCity(addr.city || 'Bhubaneswar');
    setFormState(addr.state || 'Odisha');
    setFormPincode(addr.pincode || '');
    setFormIsDefault(addr.isDefault === true || defaultAddress?.id === addr.id);
    setAddressFormError(null);
    setIsAddressModalOpen(true);
  };

  // Save Address (Add or Edit)
  const handleSaveAddressForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFullAddress.trim()) {
      setAddressFormError('Please enter complete street address');
      return;
    }
    if (!formCity.trim()) {
      setAddressFormError('Please enter city');
      return;
    }
    if (!formState.trim()) {
      setAddressFormError('Please enter state');
      return;
    }
    const cleanPin = formPincode.replace(/\D/g, '');
    if (cleanPin.length !== 6) {
      setAddressFormError('Please enter a valid 6-digit PIN code');
      return;
    }

    const finalLabel = formLabel === 'Other' ? (formCustomLabel.trim() || 'Other') : formLabel;

    setIsSubmittingAddress(true);
    setAddressFormError(null);

    const payload: Partial<CustomerAddress> = {
      addressLabel: finalLabel,
      fullAddress: formFullAddress.trim(),
      landmark: formLandmark.trim() || undefined,
      city: formCity.trim(),
      state: formState.trim(),
      pincode: cleanPin,
      isDefault: formIsDefault,
    };

    try {
      if (addressModalMode === 'add') {
        const saved = await saveNewAddress(payload, customer?.id, customer?.phone);
        if (saved) {
          showAddressFeedback('success', 'New address saved successfully!');
          setIsAddressModalOpen(false);
        } else {
          setAddressFormError('Failed to save address. Please try again.');
        }
      } else if (editingAddressId) {
        const updated = await updateAddress(editingAddressId, payload, customer?.id, customer?.phone);
        if (updated) {
          showAddressFeedback('success', 'Address updated successfully!');
          setIsAddressModalOpen(false);
        } else {
          setAddressFormError('Failed to update address. Please try again.');
        }
      }
    } catch (err: any) {
      setAddressFormError(err.message || 'Error saving address');
    } finally {
      setIsSubmittingAddress(false);
    }
  };

  // Mark Address as Default
  const handleSetDefaultAddress = async (addr: CustomerAddress) => {
    if (!addr.id) return;
    setActionLoadingId(addr.id);
    try {
      const success = await setAddressAsDefault(addr.id, customer?.id, customer?.phone);
      if (success) {
        showAddressFeedback('success', `"${addr.addressLabel || 'Address'}" is now your default address.`);
      } else {
        showAddressFeedback('error', 'Could not set as default address.');
      }
    } catch (err) {
      showAddressFeedback('error', 'Error setting default address.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Delete Address
  const handleDeleteAddress = async (addressId: string) => {
    if (!addressId) return;
    setDeletingId(addressId);
    try {
      const success = await deleteAddress(addressId, customer?.id, customer?.phone);
      if (success) {
        showAddressFeedback('success', 'Address deleted successfully.');
      } else {
        showAddressFeedback('error', 'Failed to delete address.');
      }
    } catch (err) {
      showAddressFeedback('error', 'Error deleting address.');
    } finally {
      setDeletingId(null);
    }
  };

  // Refresh addresses fresh from database
  const handleRefreshAddresses = async () => {
    if (!customer?.id && !customer?.phone) return;
    setIsSyncingAddresses(true);
    try {
      await fetchCustomerAddresses(customer?.id, customer?.phone);
      showAddressFeedback('success', 'Addresses refreshed from database.');
    } catch (err) {
      showAddressFeedback('error', 'Failed to refresh addresses.');
    } finally {
      setIsSyncingAddresses(false);
    }
  };

  if (!isCustomerLoggedIn || !customer) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white rounded-3xl border border-stone-200 p-8 sm:p-12 text-center max-w-lg mx-auto shadow-xs">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-800">
            <User className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-stone-900 font-heading">
            Sign In to View Profile
          </h2>
          <p className="text-sm text-stone-600 mt-2 leading-relaxed">
            Access your saved delivery addresses, update your contact information, and track all your royal orders in one place.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => openOtpModal('', 'signin')}
              className="w-full sm:w-auto px-6 py-3 bg-amber-800 hover:bg-amber-900 text-white font-bold text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Sign In with Mobile OTP</span>
            </button>
            <button
              type="button"
              onClick={goToHome}
              className="w-full sm:w-auto px-6 py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-sm rounded-xl transition-colors cursor-pointer"
            >
              Return Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Customer Account</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-950 font-heading">
            My Profile & Preferences
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Manage your personal info, saved delivery addresses, and view recent order history.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={goToCheckout}
            className="px-4 py-2.5 bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Go to Checkout</span>
          </button>
          <button
            type="button"
            onClick={logoutCustomer}
            className="px-4 py-2.5 bg-white border border-stone-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-stone-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Global Feedback Banner */}
      <AnimatePresence>
        {addressFeedbackMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs border ${
              addressFeedbackMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {addressFeedbackMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{addressFeedbackMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setAddressFeedbackMessage(null)}
              className="p-1 hover:bg-black/5 rounded-lg cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Personal Information & Saved Addresses (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Personal Information Card */}
          <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-stone-100">
              <h2 className="font-bold text-base text-stone-900 flex items-center gap-2">
                <User className="w-5 h-5 text-amber-800" />
                <span>Personal Information</span>
              </h2>
              <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Verified Account</span>
              </span>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Notification Alerts */}
              <AnimatePresence>
                {saveProfileSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-medium flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>Your profile details have been saved successfully.</span>
                  </motion.div>
                )}

                {saveProfileError && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs font-medium flex items-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
                    <span>{saveProfileError}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Full Name <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      required
                      className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium text-stone-900 focus:outline-none focus:border-amber-700 focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                {/* Mobile Phone (Read-Only) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                      Mobile Number
                    </label>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                      OTP Verified
                    </span>
                  </div>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      value={`+91 ${customer.phone}`}
                      disabled
                      className="w-full pl-9 pr-3 py-2.5 bg-stone-100 border border-stone-200 rounded-xl text-sm font-medium text-stone-600 cursor-not-allowed select-none"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                      Email Address
                    </label>
                    <span className="text-[11px] text-stone-400 font-normal">
                      For digital invoices & order receipts
                    </span>
                  </div>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. name@example.com"
                      className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium text-stone-900 focus:outline-none focus:border-amber-700 focus:bg-white transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={isSavingProfile || !fullName.trim()}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-2 shadow-xs cursor-pointer ${
                    isSavingProfile || !fullName.trim()
                      ? 'bg-stone-400 cursor-not-allowed'
                      : 'bg-amber-800 hover:bg-amber-900 active:scale-[0.99]'
                  }`}
                >
                  {isSavingProfile ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Profile Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* 2. All Saved Delivery Addresses Card */}
          <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-amber-800" />
                <h2 className="font-bold text-base text-stone-900">
                  Saved Delivery Addresses
                </h2>
                <span className="text-xs font-bold bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full">
                  {savedAddresses.length} {savedAddresses.length === 1 ? 'Address' : 'Addresses'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRefreshAddresses}
                  disabled={isSyncingAddresses}
                  title="Refresh addresses from database"
                  className="p-2 rounded-xl text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors cursor-pointer disabled:opacity-50"
                  aria-label="Refresh addresses"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncingAddresses ? 'animate-spin text-amber-800' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={handleOpenAddAddress}
                  className="px-3.5 py-2 bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add New Address</span>
                </button>
              </div>
            </div>

            {/* Address List */}
            {isSyncingAddresses && savedAddresses.length === 0 ? (
              <div className="py-8 text-center text-stone-500 text-xs flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-amber-800" />
                <span>Loading saved addresses...</span>
              </div>
            ) : savedAddresses.length === 0 ? (
              <div className="p-8 bg-stone-50 rounded-2xl border border-dashed border-stone-300 text-center space-y-3">
                <MapPin className="w-10 h-10 text-stone-400 mx-auto" />
                <div>
                  <p className="text-sm font-bold text-stone-800">No saved addresses found</p>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Add your delivery addresses here for lightning-fast checkout.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddAddress}
                  className="px-4 py-2.5 bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Your First Address</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {savedAddresses.map((addr) => {
                  const isDefault = addr.isDefault === true || defaultAddress?.id === addr.id;
                  const label = addr.addressLabel || 'Home';
                  const isHome = label.toLowerCase() === 'home';
                  const isWork = label.toLowerCase() === 'work';
                  const isActionLoading = actionLoadingId === addr.id;
                  const isDeleting = deletingId === addr.id;

                  return (
                    <div
                      key={addr.id || `${addr.fullAddress}-${addr.pincode}`}
                      className={`p-4 rounded-2xl border transition-all duration-200 ${
                        isDefault
                          ? 'border-amber-800/60 bg-amber-50/40 shadow-xs ring-1 ring-amber-800/20'
                          : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/60'
                      } ${isDeleting ? 'opacity-40 pointer-events-none' : ''}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {/* Label Icon */}
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                              isHome
                                ? 'bg-amber-100 text-amber-900'
                                : isWork
                                ? 'bg-blue-100 text-blue-900'
                                : 'bg-stone-100 text-stone-800'
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

                          {/* Address Details */}
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-black text-stone-900 tracking-wide uppercase">
                                {label}
                              </span>
                              {isDefault && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-800 text-white px-2 py-0.5 rounded-full shadow-2xs">
                                  <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
                                  <span>Default Address</span>
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-stone-800 font-medium leading-relaxed break-words">
                              {addr.fullAddress}
                            </p>

                            {addr.landmark && (
                              <p className="text-[11px] text-stone-500 font-medium">
                                <span className="font-semibold text-stone-600">Landmark:</span> {addr.landmark}
                              </p>
                            )}

                            <div className="flex items-center gap-2 text-[11px] text-stone-600 font-medium pt-0.5">
                              <span className="text-stone-900 font-bold">{addr.city}</span>
                              <span>•</span>
                              <span className="text-stone-700">{addr.state || 'Odisha'}</span>
                              <span>•</span>
                              <span className="font-mono font-bold text-amber-900 bg-amber-50/80 px-1.5 py-0.2 rounded border border-amber-200/60">
                                PIN: {addr.pincode}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5 self-end sm:self-start shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100 w-full sm:w-auto justify-end">
                          {/* Mark as Default Button */}
                          {!isDefault && addr.id && (
                            <button
                              type="button"
                              onClick={() => handleSetDefaultAddress(addr)}
                              disabled={isActionLoading}
                              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-amber-100 hover:text-amber-900 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              title="Set this as default delivery address"
                            >
                              {isActionLoading ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-800" />
                              ) : (
                                <Star className="w-3.5 h-3.5 text-stone-500" />
                              )}
                              <span>Set Default</span>
                            </button>
                          )}

                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditAddress(addr)}
                            className="p-2 rounded-xl text-stone-600 hover:text-amber-900 hover:bg-amber-50 transition-colors cursor-pointer"
                            title="Edit Address"
                            aria-label="Edit Address"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button */}
                          {addr.id && (
                            <button
                              type="button"
                              onClick={() => handleDeleteAddress(addr.id)}
                              disabled={isDeleting}
                              className="p-2 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                              title="Delete Address"
                              aria-label="Delete Address"
                            >
                              {isDeleting ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-600" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Order History & Loyalty (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Welcome Discount & Account Status */}
          <div className="bg-gradient-to-br from-amber-800 to-amber-950 text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
            <div className="relative space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-200 bg-amber-900/60 px-2.5 py-1 rounded-full">
                  Royal Member
                </span>
                <Sparkles className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <h3 className="text-lg font-black font-heading">
                  Nizami Biryani Club
                </h3>
                <p className="text-xs text-amber-100/90 mt-0.5">
                  Exclusive culinary offers, 1-click reordering, and authenticated reviews.
                </p>
              </div>
              <div className="pt-2 border-t border-amber-700/50 flex items-center justify-between text-xs">
                <span className="text-amber-200">Registered Phone</span>
                <span className="font-mono font-bold">+91 {customer.phone}</span>
              </div>
            </div>
          </div>

          {/* ACTIVE ORDERS & ALL ORDERS LINK */}
          <div className="space-y-4">
            {/* Active Orders Section */}
            <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <h3 className="font-bold text-base text-stone-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-800" />
                  <span>Active Orders</span>
                </h3>
                {activeOrders.length > 0 ? (
                  <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    {activeOrders.length} In Progress
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-stone-400 bg-stone-100 px-2.5 py-0.5 rounded-full">
                    0 Active
                  </span>
                )}
              </div>

              {/* Error State */}
              {ordersError && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-center space-y-2">
                  <AlertCircle className="w-6 h-6 text-rose-600 mx-auto" />
                  <p className="text-xs text-rose-700">{ordersError}</p>
                  <button
                    type="button"
                    onClick={fetchOrders}
                    className="px-3 py-1 bg-rose-700 text-white text-xs font-bold rounded-lg hover:bg-rose-800 transition-colors inline-flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" /> Retry
                  </button>
                </div>
              )}

              {/* Loading Skeleton */}
              {isLoadingOrders && !ordersError && <OrderSkeleton />}

              {/* Has Active Orders */}
              {!isLoadingOrders && !ordersError && activeOrders.length > 0 && (
                <div className="space-y-3">
                  {activeOrders.map((ord) => (
                    <OrderCard
                      key={ord.orderId || ord.id}
                      order={ord}
                      isActiveOrder={true}
                      onViewDetails={(o) => setSelectedOrderForDetails(o)}
                      onReorder={handleReorder}
                    />
                  ))}
                </div>
              )}

              {/* No Active Orders */}
              {!isLoadingOrders && !ordersError && activeOrders.length === 0 && (
                <div className="py-6 text-center space-y-2 bg-stone-50/70 rounded-2xl border border-stone-100 p-4">
                  <ShoppingBag className="w-8 h-8 text-stone-300 mx-auto" />
                  <h4 className="text-xs font-bold text-stone-800">No active orders in progress</h4>
                  <p className="text-[11px] text-stone-500 max-w-xs mx-auto">
                    Craving delicious slow-cooked biryani or clay pot curries?
                  </p>
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => goToShop()}
                      className="text-xs font-bold text-amber-800 hover:text-amber-900 underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Explore Menu</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* "All My Orders" Hyperlink Card */}
            <div
              onClick={goToOrders}
              className="bg-gradient-to-r from-amber-50/80 via-white to-amber-50/40 rounded-3xl border border-amber-200/80 p-5 shadow-xs hover:border-amber-400 hover:shadow-sm transition-all cursor-pointer group flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-amber-800 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-serif font-bold text-sm sm:text-base text-stone-900 group-hover:text-amber-900 transition-colors">
                      All My Orders
                    </h4>
                    {orders.length > 0 && (
                      <span className="text-[11px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                        {orders.length}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 truncate mt-0.5">
                    View order history, receipts, ratings & 1-click reordering
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-1 text-xs font-bold text-amber-800 group-hover:translate-x-1 transition-transform">
                <span className="hidden sm:inline">View All</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit Address Modal */}
      <AnimatePresence>
        {isAddressModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-stone-200"
            >
              {/* Modal Header */}
              <div className="p-5 bg-gradient-to-r from-amber-800 to-amber-950 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-amber-200">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white">
                      {addressModalMode === 'add' ? 'Add New Delivery Address' : 'Edit Delivery Address'}
                    </h3>
                    <p className="text-xs text-amber-200/80">
                      {addressModalMode === 'add'
                        ? 'Save a new location for food delivery'
                        : 'Update your address details and pincode'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddressModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body Form */}
              <form onSubmit={handleSaveAddressForm} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                {addressFormError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{addressFormError}</span>
                  </div>
                )}

                {/* Address Label Selector */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                    Address Label
                  </label>
                  <div className="flex items-center gap-2">
                    {(['Home', 'Work', 'Other'] as const).map((lbl) => (
                      <button
                        key={lbl}
                        type="button"
                        onClick={() => setFormLabel(lbl)}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-colors cursor-pointer ${
                          formLabel === lbl
                            ? 'bg-amber-800 text-white border-amber-800 shadow-2xs'
                            : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        {lbl === 'Home' && <Home className="w-3.5 h-3.5" />}
                        {lbl === 'Work' && <Briefcase className="w-3.5 h-3.5" />}
                        {lbl === 'Other' && <Bookmark className="w-3.5 h-3.5" />}
                        <span>{lbl}</span>
                      </button>
                    ))}
                  </div>

                  {formLabel === 'Other' && (
                    <div className="mt-2">
                      <input
                        type="text"
                        value={formCustomLabel}
                        onChange={(e) => setFormCustomLabel(e.target.value)}
                        placeholder="e.g. Grandma's House, Farmhouse, Gym"
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:border-amber-700 focus:bg-white"
                      />
                    </div>
                  )}
                </div>

                {/* Complete Address */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Complete Address (Flat / House No, Building, Street, Area) <span className="text-rose-600">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={formFullAddress}
                    onChange={(e) => setFormFullAddress(e.target.value)}
                    placeholder="e.g. Flat 302, Green Valley Apartments, Infocity Road, Patia"
                    required
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-medium text-stone-900 focus:outline-none focus:border-amber-700 focus:bg-white resize-none"
                  />
                </div>

                {/* Landmark */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Landmark (Optional)
                  </label>
                  <input
                    type="text"
                    value={formLandmark}
                    onChange={(e) => setFormLandmark(e.target.value)}
                    placeholder="e.g. Near KIIT University Square"
                    className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-medium text-stone-900 focus:outline-none focus:border-amber-700 focus:bg-white"
                  />
                </div>

                {/* City, State & Pincode Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* City */}
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                      City <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={formCity}
                      onChange={(e) => setFormCity(e.target.value)}
                      placeholder="e.g. Bhubaneswar"
                      required
                      className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-medium text-stone-900 focus:outline-none focus:border-amber-700 focus:bg-white"
                    />
                  </div>

                  {/* State */}
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                      State <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={formState}
                      onChange={(e) => setFormState(e.target.value)}
                      placeholder="e.g. Odisha"
                      required
                      className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-medium text-stone-900 focus:outline-none focus:border-amber-700 focus:bg-white"
                    />
                  </div>

                  {/* PIN Code */}
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                      PIN Code <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={formPincode}
                      onChange={(e) => setFormPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="e.g. 751024"
                      required
                      className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-medium text-stone-900 focus:outline-none focus:border-amber-700 focus:bg-white font-mono"
                    />
                  </div>
                </div>

                {/* Mark as Default Checkbox */}
                <div className="pt-2">
                  <label className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200 hover:border-amber-300 transition-colors cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formIsDefault}
                      onChange={(e) => setFormIsDefault(e.target.checked)}
                      className="w-4 h-4 text-amber-800 rounded border-stone-300 focus:ring-amber-800 cursor-pointer"
                    />
                    <div className="flex-1">
                      <span className="text-xs font-bold text-stone-900 block">
                        Set as Default Delivery Address
                      </span>
                      <span className="text-[11px] text-stone-500 block">
                        This address will be automatically selected during your next order checkout.
                      </span>
                    </div>
                  </label>
                </div>

                {/* Form Buttons */}
                <div className="pt-4 flex items-center justify-end gap-3 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => setIsAddressModalOpen(false)}
                    className="px-4 py-2.5 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingAddress || !formFullAddress.trim() || !formCity.trim() || !formState.trim() || formPincode.length !== 6}
                    className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer ${
                      isSubmittingAddress || !formFullAddress.trim() || !formCity.trim() || !formState.trim() || formPincode.length !== 6
                        ? 'bg-stone-400 cursor-not-allowed'
                        : 'bg-amber-800 hover:bg-amber-900'
                    }`}
                  >
                    {isSubmittingAddress ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving Address...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>{addressModalMode === 'add' ? 'Save Address' : 'Update Address'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Order Details Modal */}
      {selectedOrderForDetails && (
        <OrderDetailsModal
          order={selectedOrderForDetails}
          onClose={() => setSelectedOrderForDetails(null)}
          onReorder={handleReorder}
          onRate={(o) => setSelectedOrderForReview(o)}
        />
      )}

      {/* Verified Product Rating & Review Modal */}
      {selectedOrderForReview && (
        <OrderReviewModal
          order={selectedOrderForReview}
          onClose={() => setSelectedOrderForReview(null)}
          onSuccess={() => {
            showToast('Review Submitted', 'Thank you for your valuable feedback!', 'success');
          }}
        />
      )}
    </div>
  );
};
