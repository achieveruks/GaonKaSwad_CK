import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Product, CartItem, ProductVariant, ProductAddon, Coupon } from '../types';
import { COUPONS } from '../data/products';
import { useLocation } from './LocationContext';
import { isProductAvailableAtOutlet } from '../lib/locationService';

interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'error';
  image?: string;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (
    product: Product,
    quantity?: number,
    variant?: ProductVariant,
    spiceLevel?: string,
    addons?: ProductAddon[]
  ) => boolean;
  updateQuantity: (cartItemId: string, delta: number) => void;
  removeFromCart: (cartItemId: string) => void;
  clearCart: () => void;
  totalItemsCount: number;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  packagingFee: number;
  gst: number;
  total: number;
  appliedCoupon: Coupon | null;
  applyCoupon: (code: string) => { success: boolean; message: string };
  removeCoupon: () => void;
  isCartDrawerOpen: boolean;
  setIsCartDrawerOpen: (open: boolean) => void;
  includeCutlery: boolean;
  setIncludeCutlery: (include: boolean) => void;
  specialInstructions: string;
  setSpecialInstructions: (notes: string) => void;
  toasts: ToastMessage[];
  showToast: (title: string, message: string, type?: 'success' | 'info' | 'error', image?: string) => void;
  removeToast: (id: string) => void;
  
  // Location & Outlet rules
  currentOutletId: string | null;
  minimumOrderValue: number;
  isMinimumOrderMet: boolean;
  minimumOrderShortfall: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'gaonkaswad_cart_v1';
const COUPON_STORAGE_KEY = 'gaonkaswad_coupon_v1';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { selectedLocation, currentZone, setIsLocationModalOpen } = useLocation();

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(() => {
    try {
      const saved = localStorage.getItem(COUPON_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [includeCutlery, setIncludeCutlery] = useState(true);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Sync with LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      console.error('Failed to save cart to localStorage', e);
    }
  }, [cart]);

  useEffect(() => {
    try {
      if (appliedCoupon) {
        localStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify(appliedCoupon));
      } else {
        localStorage.removeItem(COUPON_STORAGE_KEY);
      }
    } catch (e) {
      console.error('Failed to save coupon to localStorage', e);
    }
  }, [appliedCoupon]);

  const showToast = (
    title: string,
    message: string,
    type: 'success' | 'info' | 'error' = 'success',
    image?: string
  ) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, title, message, type, image }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const currentOutletId = selectedLocation?.outletId || null;

  const addToCart = (
    product: Product,
    quantity = 1,
    variant?: ProductVariant,
    spiceLevel?: string,
    addons: ProductAddon[] = []
  ): boolean => {
    // 1. If location is not selected yet, prompt user to select delivery PIN code first
    if (!selectedLocation || !selectedLocation.outletId) {
      showToast(
        'Delivery Location Needed',
        'Please enter your delivery PIN code to check kitchen outlet availability.',
        'info'
      );
      setIsLocationModalOpen(true);
      return false;
    }

    // 2. Check product inStock status
    if (product.inStock === false) {
      showToast(
        'Out of Stock',
        `${product.name} is currently sold out. Please check back shortly!`,
        'error',
        product.image
      );
      return false;
    }

    // 3. Check product outlet availability
    if (!isProductAvailableAtOutlet(product, selectedLocation.outletId)) {
      showToast(
        'Not Available at Location',
        `${product.name} is not served by ${selectedLocation.outletName}.`,
        'error',
        product.image
      );
      return false;
    }

    const variantId = variant ? variant.id : 'default';
    const addonIds = addons.map((a) => a.id).sort().join('-');
    const spice = spiceLevel || product.spiceLevel;
    const cartItemId = `${product.id}_${variantId}_${spice}_${addonIds}`;

    const addonsPrice = addons.reduce((sum, a) => sum + a.price, 0);
    const basePrice = variant ? variant.price : product.price;
    const unitPrice = basePrice + addonsPrice;

    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === cartItemId);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
        };
        return updated;
      } else {
        const newItem: CartItem = {
          id: cartItemId,
          product,
          selectedVariant: variant,
          selectedSpiceLevel: spice,
          selectedAddons: addons,
          quantity,
          unitPrice,
        };
        return [...prev, newItem];
      }
    });

    showToast(
      'Added to Cart!',
      `${quantity}x ${product.name} ${variant ? `(${variant.name})` : ''}`,
      'success',
      product.image
    );
    return true;
  };

  const updateQuantity = (cartItemId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.id === cartItemId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null);
    });
  };

  const removeFromCart = (cartItemId: string) => {
    const item = cart.find((i) => i.id === cartItemId);
    setCart((prev) => prev.filter((i) => i.id !== cartItemId));
    if (item) {
      showToast('Item Removed', `${item.product.name} removed from your cart`, 'info');
    }
  };

  const clearCart = () => {
    setCart([]);
    setAppliedCoupon(null);
  };

  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  // Validate coupon min order
  useEffect(() => {
    if (appliedCoupon && subtotal < appliedCoupon.minOrderValue) {
      setAppliedCoupon(null);
      showToast(
        'Coupon Removed',
        `Minimum order of ₹${appliedCoupon.minOrderValue} required for ${appliedCoupon.code}`,
        'info'
      );
    }
  }, [subtotal, appliedCoupon]);

  let discount = 0;
  if (appliedCoupon && subtotal >= appliedCoupon.minOrderValue) {
    if (appliedCoupon.discountType === 'percentage') {
      discount = Math.round((subtotal * appliedCoupon.discountValue) / 100);
    } else {
      discount = appliedCoupon.discountValue;
    }
  }

  // Delivery fee from selected location's zone (or fallback)
  const zoneDeliveryFee = currentZone?.deliveryFee ?? (selectedLocation?.deliveryFee ?? 40);
  const deliveryFee = subtotal === 0 ? 0 : zoneDeliveryFee;

  // Minimum order value from zone
  const minimumOrderValue = currentZone?.minimumOrderValue ?? (selectedLocation?.minimumOrderValue ?? 0);
  const isMinimumOrderMet = minimumOrderValue === 0 || subtotal >= minimumOrderValue;
  const minimumOrderShortfall = Math.max(0, minimumOrderValue - subtotal);

  // Packaging fee: ₹29 for insulated eco-friendly packaging
  const packagingFee = subtotal === 0 ? 0 : 29;

  // 5% Restaurant GST
  const gst = subtotal === 0 ? 0 : Math.round((subtotal - discount) * 0.05);

  const total = Math.max(0, subtotal - discount + deliveryFee + packagingFee + gst);

  const applyCoupon = (code: string): { success: boolean; message: string } => {
    const formatted = code.trim().toUpperCase();
    const found = COUPONS.find((c) => c.code === formatted);

    if (!found) {
      return { success: false, message: 'Invalid coupon code. Try GAON15 or WELCOME50.' };
    }

    if (subtotal < found.minOrderValue) {
      return {
        success: false,
        message: `Order must be at least ₹${found.minOrderValue} to apply ${found.code}.`,
      };
    }

    setAppliedCoupon(found);
    showToast('Promo Applied!', `Coupon code ${found.code} applied successfully!`, 'success');
    return { success: true, message: `Coupon ${found.code} applied successfully!` };
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    showToast('Coupon Removed', 'Coupon code has been removed', 'info');
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
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
        isCartDrawerOpen,
        setIsCartDrawerOpen,
        includeCutlery,
        setIncludeCutlery,
        specialInstructions,
        setSpecialInstructions,
        toasts,
        showToast,
        removeToast,
        currentOutletId,
        minimumOrderValue,
        isMinimumOrderMet,
        minimumOrderShortfall,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
