import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useNavigation } from '../context/NavigationContext';
import { useLocation } from '../context/LocationContext';
import { CartItemRow } from '../components/CartItemRow';
import { COUPONS } from '../data/products';
import {
  ShoppingBag,
  ArrowRight,
  ArrowLeft,
  Truck,
  Check,
  Tag,
  Utensils,
  MessageSquare,
  ShieldCheck,
  Trash2,
  MapPin,
  AlertCircle,
} from 'lucide-react';

export const CartPage: React.FC = () => {
  const {
    cart,
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
    specialInstructions,
    setSpecialInstructions,
    clearCart,
    minimumOrderValue,
    isMinimumOrderMet,
    amountNeededForMinOrder,
    freeDeliveryThreshold,
    isFreeDeliveryUnlocked,
    amountNeededForFreeDelivery,
    freeDeliveryProgress,
  } = useCart();

  const { goToShop, goToCheckout } = useNavigation();
  const { selectedLocation, setIsLocationModalOpen } = useLocation();

  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    const res = applyCoupon(couponCode);
    if (!res.success) {
      setCouponError(res.message);
    } else {
      setCouponError('');
      setCouponCode('');
    }
  };

  const handleProceedToCheckout = () => {
    if (!selectedLocation) {
      setIsLocationModalOpen(true);
      return;
    }
    if (!isMinimumOrderMet && minimumOrderValue > 0) return;
    goToCheckout();
  };

  if (cart.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-5">
        <div className="w-20 h-20 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-500 mx-auto">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <div className="space-y-1.5 max-w-sm mx-auto">
          <h2 className="font-extrabold text-xl sm:text-2xl text-stone-900 font-heading">
            Your Cart is Currently Empty
          </h2>
          <p className="text-xs text-stone-500">
            Looks like you haven&apos;t added any delicacies yet. Explore our slow-cooked handis and freshly baked breads!
          </p>
        </div>
        <button
          type="button"
          onClick={() => goToShop()}
          className="px-6 py-2.5 bg-amber-800 hover:bg-amber-900 active:bg-stone-950 text-white rounded-xl font-bold text-xs shadow-2xs transition-colors inline-flex items-center gap-1.5"
        >
          <span>Explore Authentic Menu</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Page Title & Counter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200">
        <div>
          <h1 className="font-extrabold text-xl sm:text-2xl text-stone-950 font-heading">
            Your Order Cart
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            {totalItemsCount} {totalItemsCount === 1 ? 'delicacy' : 'delicacies'} ready to be prepared fresh
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => goToShop()}
            className="text-xs font-semibold text-stone-600 hover:text-stone-900 flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-stone-100"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Add More Items</span>
          </button>

          <button
            type="button"
            onClick={clearCart}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-rose-50 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear Cart</span>
          </button>
        </div>
      </div>

      {/* Outlet Routing & Delivery PIN Bar */}
      <div className="bg-amber-50/80 border border-amber-200/90 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            {selectedLocation ? (
              <div>
                <p className="text-xs font-bold text-stone-900">
                  Delivering to PIN {selectedLocation.pinCode}
                </p>
                <p className="text-[11px] text-stone-600">
                  Prepared & dispatched from <strong>{selectedLocation.outletName}</strong>
                </p>
              </div>
            ) : (
              <div>
                <p className="text-xs font-bold text-amber-950">
                  Set Your Delivery PIN Code
                </p>
                <p className="text-[11px] text-stone-600">
                  Select your area to verify kitchen outlet and minimum order value
                </p>
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsLocationModalOpen(true)}
          className="px-3 py-1.5 bg-white hover:bg-amber-50 border border-amber-300 text-amber-900 font-bold text-xs rounded-lg shadow-2xs transition-colors shrink-0 self-start sm:self-auto"
        >
          {selectedLocation ? 'Change PIN Code' : 'Set PIN Code'}
        </button>
      </div>

      {/* Free Delivery Bar */}
      <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="flex items-center gap-1.5 font-bold text-stone-800">
            <Truck className="w-3.5 h-3.5 text-amber-700" />
            {isFreeDeliveryUnlocked || amountNeededForFreeDelivery === 0 ? (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-600" /> Free Express Doorstep Delivery Unlocked!
              </span>
            ) : (
              <span>
                Add <strong className="text-amber-800 font-extrabold">₹{amountNeededForFreeDelivery}</strong> more to get Free Delivery!
              </span>
            )}
          </span>
          <span className="text-[10px] text-stone-500 font-semibold">₹{freeDeliveryThreshold} Minimum for Free Delivery</span>
        </div>
        <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-700 transition-all duration-500 rounded-full"
            style={{ width: `${freeDeliveryProgress}%` }}
          />
        </div>
      </div>

      {/* Cart Layout: Left Items + Right Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Cart Items List & Instructions (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Items Container */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-2xs divide-y divide-stone-100">
            {cart.map((item) => (
              <CartItemRow key={item.id} item={item} />
            ))}
          </div>

          {/* Cooking Instructions & Cutlery Preferences */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs space-y-3">
            <h3 className="font-bold text-xs text-stone-900 flex items-center gap-1.5 font-heading">
              <MessageSquare className="w-3.5 h-3.5 text-amber-700" />
              <span>Special Cooking Instructions & Preferences</span>
            </h3>

            <textarea
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="e.g. Please make the gravy less spicy, extra onions on side, leave at doorstep with security..."
              rows={2}
              className="w-full p-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-amber-700 resize-none text-stone-800"
            />

            <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Utensils className="w-4 h-4 text-stone-600" />
                <div>
                  <span className="text-xs font-semibold text-stone-800">Include Cutlery & Tissues</span>
                  <p className="text-[10px] text-stone-500">Eco-friendly disposables</p>
                </div>
              </div>

              <input
                type="checkbox"
                checked={includeCutlery}
                onChange={(e) => setIncludeCutlery(e.target.checked)}
                className="w-4 h-4 accent-amber-700 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary & Coupon (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Minimum Order Value Alert */}
          {!isMinimumOrderMet && minimumOrderValue > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-2.5 text-xs text-amber-950 shadow-2xs">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold block">Minimum Order Value Not Met</strong>
                <p className="text-[11px] text-amber-900 mt-0.5">
                  The minimum order requirement for <strong>{selectedLocation?.outletName}</strong> is <strong>₹{minimumOrderValue}</strong>.
                  Please add <strong>₹{amountNeededForMinOrder}</strong> more to place your order.
                </p>
              </div>
            </div>
          )}

          {/* Promo Code Box */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs">
            <h3 className="font-bold text-xs text-stone-900 flex items-center gap-1.5 mb-2 font-heading">
              <Tag className="w-3.5 h-3.5 text-amber-700" />
              <span>Apply Promo Code</span>
            </h3>

            {appliedCoupon ? (
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-emerald-600" />
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
              <form onSubmit={handleApplyCoupon} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value.toUpperCase());
                      setCouponError('');
                    }}
                    placeholder="Enter coupon (e.g. GAON15)"
                    className="flex-1 px-3 py-2 text-xs uppercase bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-amber-700"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    Apply
                  </button>
                </div>
                {couponError && (
                  <p className="text-[10px] text-rose-600">{couponError}</p>
                )}

                {/* Available coupons list */}
                <div className="pt-1">
                  <p className="text-[10px] text-stone-400 font-medium mb-1">Available Offers:</p>
                  <div className="space-y-1">
                    {COUPONS.map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => {
                          const res = applyCoupon(c.code);
                          if (!res.success) setCouponError(res.message);
                        }}
                        className="w-full text-left p-2 rounded-lg bg-amber-50/50 hover:bg-amber-100/70 border border-amber-200/70 transition-colors flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-amber-950">{c.code}</span>
                          <p className="text-[10px] text-stone-500">{c.description}</p>
                        </div>
                        <span className="text-[11px] font-bold text-amber-800">Apply</span>
                      </button>
                    ))}
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* Bill Breakdown Card */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs space-y-3.5">
            <h3 className="font-bold text-sm text-stone-900 pb-2.5 border-b border-stone-100 font-heading">
              Bill Summary
            </h3>

            <div className="space-y-2 text-xs text-stone-600">
              <div className="flex justify-between">
                <span>Item Subtotal ({totalItemsCount} items)</span>
                <span className="font-semibold text-stone-900">₹{subtotal}</span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Coupon Discount</span>
                  <span>- ₹{discount}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Eco Thermal Packaging</span>
                <span>₹{packagingFee}</span>
              </div>

              <div className="flex justify-between">
                <span>Restaurant GST (5%)</span>
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

              <div className="pt-2.5 border-t border-stone-200 flex justify-between items-baseline text-xs font-bold text-stone-900">
                <span>Grand Total</span>
                <span className="font-extrabold text-xl text-amber-800 font-heading">
                  ₹{total}
                </span>
              </div>
            </div>

            {/* Checkout Button */}
            <button
              type="button"
              id="cart-checkout-proceed-btn"
              onClick={handleProceedToCheckout}
              disabled={!isMinimumOrderMet && minimumOrderValue > 0}
              className={`w-full py-3 text-white rounded-xl font-bold text-xs sm:text-sm shadow-2xs transition-colors flex items-center justify-center gap-1.5 ${
                isMinimumOrderMet || minimumOrderValue === 0
                  ? 'bg-amber-800 hover:bg-amber-900 active:bg-stone-950 cursor-pointer'
                  : 'bg-stone-300 text-stone-500 cursor-not-allowed'
              }`}
            >
              <span>
                {!isMinimumOrderMet && minimumOrderValue > 0
                  ? `Min Order ₹${minimumOrderValue} Required`
                  : 'Proceed to Checkout'}
              </span>
              {(isMinimumOrderMet || minimumOrderValue === 0) && (
                <ArrowRight className="w-3.5 h-3.5" />
              )}
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-stone-400 pt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>100% Secure & Thermal Sealed Guarantee</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
