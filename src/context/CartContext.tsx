import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Product, CartItem, ProductVariant, ProductAddon, Coupon } from '../types';
import { COUPONS } from '../data/products';
import { useLocation } from './LocationContext';
import { isProductAvailableAtOutlet, isProductInStockAtOutlet, getProductPortionsLeftAtOutlet } from '../lib/locationService';

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
  adaptCartForNewOutlet: (newOutletId: string, newOutletName?: string) => {
    removedItems: { name: string; quantity: number; reason: string }[];
    adjustedItems: { name: string; oldQty: number; newQty: number; portionsLeft: number }[];
    keptItemsCount: number;
  };
  
  // Location & Outlet rules
  currentOutletId: string | null;
  minimumOrderValue: number;
  isMinimumOrderMet: boolean;
  minimumOrderShortfall: number;
  amountNeededForMinOrder: number;
  freeDeliveryThreshold: number;
  isFreeDeliveryUnlocked: boolean;
  amountNeededForFreeDelivery: number;
  freeDeliveryProgress: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'gaonkaswad_cart_v1';
const COUPON_STORAGE_KEY = 'gaonkaswad_coupon_v1';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { selectedLocation, currentZone, currentOutlet, setIsLocationModalOpen } = useLocation();

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

    // 2. Check product inStock status and portions left (outlet-specific or global)
    const isInStockHere = isProductInStockAtOutlet(product, selectedLocation.outletId);
    const portionsLeft = getProductPortionsLeftAtOutlet(product, selectedLocation.outletId);

    if (product.inStock === false || !isInStockHere || portionsLeft === 0) {
      showToast(
        'Sold Out / Out of Stock',
        `${product.name} is currently sold out at ${selectedLocation.outletName}. Please check back tomorrow!`,
        'error',
        product.image
      );
      return false;
    }

    // Check existing quantity in cart against portions left
    if (portionsLeft !== null && portionsLeft !== undefined) {
      const existingProductQtyInCart = cart
        .filter((item) => item.product.id === product.id)
        .reduce((sum, item) => sum + item.quantity, 0);

      if (existingProductQtyInCart + quantity > portionsLeft) {
        const availableToAdd = Math.max(0, portionsLeft - existingProductQtyInCart);
        showToast(
          'Portion Limit Reached',
          availableToAdd > 0
            ? `Only ${availableToAdd} more portion${availableToAdd > 1 ? 's' : ''} available to add for ${product.name}.`
            : `All ${portionsLeft} available portions of ${product.name} are already in your cart.`,
          'error',
          product.image
        );
        return false;
      }
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
      const itemToUpdate = prev.find((i) => i.id === cartItemId);
      if (itemToUpdate && delta > 0 && selectedLocation?.outletId) {
        const portionsLeft = getProductPortionsLeftAtOutlet(itemToUpdate.product, selectedLocation.outletId);
        if (portionsLeft !== null && portionsLeft !== undefined) {
          const currentTotalForProduct = prev
            .filter((i) => i.product.id === itemToUpdate.product.id)
            .reduce((sum, i) => sum + i.quantity, 0);

          if (currentTotalForProduct + delta > portionsLeft) {
            showToast(
              'Max Portions Reached',
              `Only ${portionsLeft} portions of ${itemToUpdate.product.name} are available for today.`,
              'info'
            );
            return prev;
          }
        }
      }

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

  /**
   * Adapts the current cart when switching kitchen outlets:
   * 1. Removes items not served or completely sold out in the new outlet
   * 2. Reduces quantities for items exceeding the new outlet's portions left
   * 3. Retains all compatible items
   * 4. Shows clear, friendly notifications to the customer
   */
  const adaptCartForNewOutlet = (newOutletId: string, newOutletName?: string) => {
    const removedItems: { name: string; quantity: number; reason: string }[] = [];
    const adjustedItems: { name: string; oldQty: number; newQty: number; portionsLeft: number }[] = [];

    const updatedCart: CartItem[] = [];

    // Track total allocated portions per product in the new cart to prevent exceeding limits
    const allocatedPerProduct: Record<string, number> = {};

    for (const item of cart) {
      const product = item.product;
      const isServed = isProductAvailableAtOutlet(product, newOutletId);
      const isInStock = isProductInStockAtOutlet(product, newOutletId);
      const portionsLeft = getProductPortionsLeftAtOutlet(product, newOutletId);

      if (!isServed) {
        removedItems.push({
          name: product.name,
          quantity: item.quantity,
          reason: 'Not served at this kitchen outlet',
        });
        continue;
      }

      if (!isInStock || portionsLeft === 0) {
        removedItems.push({
          name: product.name,
          quantity: item.quantity,
          reason: 'Currently sold out for today at this kitchen',
        });
        continue;
      }

      if (portionsLeft !== null && portionsLeft !== undefined) {
        const prodIdStr = String(product.id);
        const alreadyAllocated = allocatedPerProduct[prodIdStr] || 0;
        const remainingAllowed = Math.max(0, portionsLeft - alreadyAllocated);

        if (remainingAllowed <= 0) {
          removedItems.push({
            name: product.name,
            quantity: item.quantity,
            reason: `Limited portions available (Only ${portionsLeft} portions left for today)`,
          });
          continue;
        } else if (item.quantity > remainingAllowed) {
          adjustedItems.push({
            name: product.name,
            oldQty: item.quantity,
            newQty: remainingAllowed,
            portionsLeft,
          });
          allocatedPerProduct[prodIdStr] = alreadyAllocated + remainingAllowed;
          updatedCart.push({
            ...item,
            quantity: remainingAllowed,
          });
        } else {
          allocatedPerProduct[prodIdStr] = alreadyAllocated + item.quantity;
          updatedCart.push(item);
        }
      } else {
        updatedCart.push(item);
      }
    }

    setCart(updatedCart);

    if (removedItems.length > 0 || adjustedItems.length > 0) {
      const kitchenLabel = newOutletName ? ` (${newOutletName})` : '';
      if (removedItems.length > 0 && adjustedItems.length === 0) {
        showToast(
          'Cart Updated for Kitchen',
          `${removedItems.length} item(s) removed as they are not available at the new kitchen${kitchenLabel}.`,
          'info'
        );
      } else if (adjustedItems.length > 0 && removedItems.length === 0) {
        showToast(
          'Portions Adjusted',
          `Quantities for ${adjustedItems.map((a) => a.name).join(', ')} were adjusted to match kitchen portion availability.`,
          'info'
        );
      } else {
        showToast(
          'Cart Synchronized',
          `Cart updated for ${newOutletName || 'new kitchen'}: ${removedItems.length} item(s) removed, ${adjustedItems.length} portion(s) adjusted.`,
          'info'
        );
      }
    }

    return {
      removedItems,
      adjustedItems,
      keptItemsCount: updatedCart.reduce((sum, i) => sum + i.quantity, 0),
    };
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

  // Free delivery threshold from current Outlet (defaults to 499)
  const freeDeliveryThreshold = currentOutlet?.freeDeliveryThreshold ?? (selectedLocation?.freeDeliveryThreshold ?? 499);
  const isFreeDeliveryUnlocked = subtotal > 0 && freeDeliveryThreshold > 0 && subtotal >= freeDeliveryThreshold;
  const amountNeededForFreeDelivery = Math.max(0, freeDeliveryThreshold - subtotal);
  const freeDeliveryProgress = freeDeliveryThreshold > 0 ? Math.min(100, Math.round((subtotal / freeDeliveryThreshold) * 100)) : 100;

  // Delivery fee from selected location's zone (or fallback) - WAIVED (₹0) when free delivery threshold is reached!
  const zoneDeliveryFee = currentZone?.deliveryFee ?? (selectedLocation?.deliveryFee ?? 40);
  const deliveryFee = (subtotal === 0 || isFreeDeliveryUnlocked) ? 0 : zoneDeliveryFee;

  // Minimum order value from Outlet's Order & Delivery Rules (not delivery zone)
  const outletMinOrder = currentOutlet?.minimumOrderValue ?? (selectedLocation?.minimumOrderValue ?? 200);
  const minimumOrderValue = subtotal === 0 ? 0 : outletMinOrder;
  const isMinimumOrderMet = minimumOrderValue === 0 || subtotal >= minimumOrderValue;
  const minimumOrderShortfall = Math.max(0, outletMinOrder - subtotal);

  // Dynamic Packaging Fee from selected Kitchen Outlet's settings
  const dynamicPackagingFee = currentOutlet?.packagingFee ?? (selectedLocation?.packagingFee ?? 25);
  const packagingFee = subtotal === 0 ? 0 : dynamicPackagingFee;

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
        adaptCartForNewOutlet,
        currentOutletId,
        minimumOrderValue: outletMinOrder,
        isMinimumOrderMet,
        minimumOrderShortfall,
        amountNeededForMinOrder: minimumOrderShortfall,
        freeDeliveryThreshold,
        isFreeDeliveryUnlocked,
        amountNeededForFreeDelivery,
        freeDeliveryProgress,
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
