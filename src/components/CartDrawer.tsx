import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useNavigation } from '../context/NavigationContext';
import { useLocation } from '../context/LocationContext';
import { CartItemRow } from './CartItemRow';
import {
  X,
  ShoppingBag,
  ArrowRight,
  Tag,
  Truck,
  Utensils,
  Check,
  MapPin,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { COUPONS } from '../data/products';

export const CartDrawer: React.FC = () => {
  const {
    cart,
    isCartDrawerOpen,
    setIsCartDrawerOpen,
    totalItemsCount,
    subtotal,
    discount,
    deliveryFee,
    packagingFee,
    gst,
    total,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    includeCutlery,
    setIncludeCutlery,
    clearCart,
    minimumOrderValue,
    isMinimumOrderMet,
    amountNeededForMinOrder,
  } = useCart();

  const { goToCheckout, goToShop, goToCart } = useNavigation();
  const { selectedLocation, setIsLocationModalOpen } = useLocation();
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');

  const freeDeliveryThreshold = 499;
  const amountNeededForFreeDelivery = Math.max(0, freeDeliveryThreshold - subtotal);
  const deliveryProgressPercent = Math.min(100, (subtotal / freeDeliveryThreshold) * 100);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    const res = applyCoupon(couponInput);
    if (!res.success) {
      setCouponError(res.message);
    } else {
      setCouponError('');
      setCouponInput('');
    }
  };

  const handleCheckoutClick = () => {
    if (!selectedLocation) {
      setIsLocationModalOpen(true);
      return;
    }
    if (!isMinimumOrderMet) return;
    setIsCartDrawerOpen(false);
    goToCheckout();
  };

  const handleFullCartClick = () => {
    setIsCartDrawerOpen(false);
    goToCart();
  };

  return (
    <AnimatePresence>
      {isCartDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCartDrawerOpen(false)}
            className="absolute inset-0 bg-stone-950/60 backdrop-blur-2xs transition-opacity"
          />

          {/* Drawer Panel */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between"
            >
              {/* Drawer Header */}
              <div className="p-5 border-b border-stone-200 bg-white">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-base font-bold text-stone-900 flex items-center gap-2 font-heading">
                    <span>Your Order</span>
                    <span className="text-xs font-normal text-stone-500 font-sans">
                      ({totalItemsCount} {totalItemsCount === 1 ? 'Item' : 'Items'})
                    </span>
                  </h2>

                  <div className="flex items-center gap-2">
                    {cart.length > 0 && (
                      <button
                        type="button"
                        onClick={clearCart}
                        className="text-xs text-stone-400 hover:text-rose-600 font-medium px-2 py-1 transition-colors"
                      >
                        Clear
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsCartDrawerOpen(false)}
                      className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
                      aria-label="Close cart"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Outlet Routing Header Box */}
                <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="w-3.5 h-3.5 text-amber-800 shrink-0" />
                    <div className="min-w-0">
                      {selectedLocation ? (
                        <div className="truncate">
                          <span className="font-bold text-stone-900">PIN {selectedLocation.pinCode}</span>
                          <span className="text-stone-500 text-[11px] ml-1 truncate">
                            · {selectedLocation.outletName.replace('Gaon Ka Swad - ', '')}
                          </span>
                        </div>
                      ) : (
                        <span className="font-semibold text-amber-950">Select Delivery PIN</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsLocationModalOpen(true)}
                    className="text-[11px] font-bold text-amber-800 underline hover:text-amber-950 shrink-0 ml-2"
                  >
                    Change
                  </button>
                </div>

                {/* Free Delivery Meter */}
                {cart.length > 0 && (
                  <div className="mt-2.5 pt-2.5 border-t border-stone-100">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="flex items-center gap-1.5 font-medium text-stone-700">
                        <Truck className="w-3.5 h-3.5 text-amber-700" />
                        {amountNeededForFreeDelivery === 0 ? (
                          <span className="text-emerald-700 font-semibold flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600" /> Free Delivery Unlocked!
                          </span>
                        ) : (
                          <span>
                            Add <span className="font-bold text-amber-800">₹{amountNeededForFreeDelivery}</span> more for FREE Delivery
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-stone-400 font-medium">₹499 Goal</span>
                    </div>
                    <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-700 transition-all duration-300 rounded-full"
                        style={{ width: `${deliveryProgressPercent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Drawer Content */}
              {cart.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800 mb-3">
                    <ShoppingBag className="w-8 h-8" />
                  </div>
                  <h4 className="font-heading font-bold text-base text-stone-900 mb-1">
                    Your Cart is Empty
                  </h4>
                  <p className="text-xs text-stone-500 max-w-xs mb-5 leading-relaxed">
                    Explore our royal dum biryanis, slow-simmered curries, and tandoori breads.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCartDrawerOpen(false);
                      goToShop();
                    }}
                    className="px-5 py-2 bg-amber-800 hover:bg-amber-900 active:bg-stone-950 text-white rounded-lg font-semibold text-xs shadow-2xs transition-all flex items-center gap-1.5"
                  >
                    <span>Browse Menu</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                  {/* Cart Items List */}
                  <div className="space-y-1">
                    {cart.map((item) => (
                      <CartItemRow key={item.id} item={item} compact={true} />
                    ))}
                  </div>

                  {/* Cutlery preference */}
                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Utensils className="w-4 h-4 text-stone-600" />
                      <div>
                        <p className="text-xs font-semibold text-stone-800">Include Cutlery & Napkins</p>
                        <p className="text-[10px] text-stone-500">Eco-friendly wooden spoons & tissues</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeCutlery}
                        onChange={(e) => setIncludeCutlery(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4.5 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-amber-700"></div>
                    </label>
                  </div>

                  {/* Promo Code Box */}
                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-3">
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg p-2">
                        <div className="flex items-center gap-2">
                          <Tag className="w-3.5 h-3.5 text-emerald-600" />
                          <div>
                            <span className="font-bold text-xs text-emerald-900 tracking-wider">
                              {appliedCoupon.code}
                            </span>
                            <p className="text-[10px] text-emerald-700">
                              {appliedCoupon.description} (Saved ₹{discount})
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={removeCoupon}
                          className="text-xs font-semibold text-rose-600 hover:text-rose-800 px-2 py-1"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div>
                        <form onSubmit={handleApplyCoupon} className="flex gap-2">
                          <div className="relative flex-1">
                            <Tag className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={couponInput}
                              onChange={(e) => {
                                setCouponInput(e.target.value.toUpperCase());
                                setCouponError('');
                              }}
                              placeholder="Coupon code (e.g. GAON15)"
                              className="w-full pl-7 pr-3 py-1.5 text-xs uppercase bg-white border border-stone-200 rounded-lg focus:outline-none focus:border-amber-700"
                            />
                          </div>
                          <button
                            type="submit"
                            className="px-3 py-1.5 bg-stone-900 hover:bg-black text-white rounded-lg text-xs font-semibold transition-colors"
                          >
                            Apply
                          </button>
                        </form>

                        {couponError && (
                          <p className="text-[11px] text-rose-600 mt-1">{couponError}</p>
                        )}

                        {/* Quick coupon chips */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {COUPONS.map((c) => (
                            <button
                              key={c.code}
                              type="button"
                              onClick={() => {
                                const res = applyCoupon(c.code);
                                if (!res.success) setCouponError(res.message);
                              }}
                              className="text-[10px] bg-amber-50 hover:bg-amber-100 text-amber-900 font-medium px-2 py-0.5 rounded border border-amber-200 transition-colors"
                            >
                              Use <strong>{c.code}</strong>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Drawer Footer / Checkout summary */}
              {cart.length > 0 && (
                <div className="p-5 bg-stone-50 border-t border-stone-200 space-y-3">
                  {/* Minimum Order Value Alert */}
                  {!isMinimumOrderMet && minimumOrderValue > 0 && (
                    <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-2 text-xs text-amber-950">
                      <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Minimum Order: ₹{minimumOrderValue}</span>
                        <p className="text-[11px] text-amber-900">
                          Add <strong>₹{amountNeededForMinOrder}</strong> more to meet the minimum delivery requirement.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Cost breakdown */}
                  <div className="space-y-1.5 text-xs text-stone-500">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-medium text-stone-900">₹{subtotal}</span>
                    </div>

                    {discount > 0 && (
                      <div className="flex justify-between text-emerald-600 font-medium">
                        <span>Discount</span>
                        <span>- ₹{discount}</span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span>Packaging</span>
                      <span className="font-medium text-stone-900">₹{packagingFee}</span>
                    </div>

                    <div className="flex justify-between">
                      <span>GST (5%)</span>
                      <span className="font-medium text-stone-900">₹{gst}</span>
                    </div>

                    <div className="flex justify-between">
                      <span>Delivery Fee</span>
                      <span className="font-medium text-stone-900">
                        {deliveryFee === 0 ? (
                          <span className="text-emerald-600 font-bold">FREE</span>
                        ) : (
                          `₹${deliveryFee}`
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm font-bold text-stone-900 pt-2.5 border-t border-stone-200">
                      <span>Total</span>
                      <span className="text-amber-800 font-bold">₹{total}</span>
                    </div>
                  </div>

                  {/* CTAs */}
                  <button
                    type="button"
                    id="drawer-checkout-btn"
                    onClick={handleCheckoutClick}
                    disabled={!isMinimumOrderMet && minimumOrderValue > 0}
                    className={`w-full font-bold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 ${
                      isMinimumOrderMet || minimumOrderValue === 0
                        ? 'bg-amber-800 text-white hover:bg-amber-900 active:bg-stone-950 cursor-pointer shadow-amber-900/10'
                        : 'bg-stone-300 text-stone-500 cursor-not-allowed'
                    }`}
                  >
                    <span>
                      {!isMinimumOrderMet && minimumOrderValue > 0
                        ? `Min Order ₹${minimumOrderValue} Required`
                        : 'Proceed to Checkout'}
                    </span>
                    {(isMinimumOrderMet || minimumOrderValue === 0) && (
                      <ArrowRight className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleFullCartClick}
                    className="w-full text-center text-xs font-medium text-stone-500 hover:text-stone-800 transition-colors pt-1"
                  >
                    View Full Cart Page
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
