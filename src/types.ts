export interface Outlet {
  id: string;
  name: string;
  city: string;
  state?: string;
  address: string;
  phone?: string;
  email?: string;
  latitude?: number;
  longitude?: number;
  isActive: boolean;
  minimumOrderValue?: number;
  freeDeliveryThreshold?: number;
  packagingFee?: number;
  avgCookingTime?: string;
  deliveryFee?: number;
  estimatedDeliveryTime?: string;
  operatingHours?: string;
  assignedProductIds?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface DeliveryZone {
  id: string;
  name?: string;
  outletId: string;
  pinCodes: string[];
  deliveryFee: number;
  minimumOrderValue?: number;
  estimatedDeliveryTime?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserLocationState {
  pinCode: string;
  outletId: string;
  outletName: string;
  cityName: string;
  stateName?: string;
  address?: string;
  deliveryFee: number;
  minimumOrderValue?: number;
  freeDeliveryThreshold?: number;
  packagingFee?: number;
}

export interface ProductVariant {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  serves: string;
  weight: string;
}

export interface ProductAddon {
  id: string;
  name: string;
  price: number;
  isVeg: boolean;
}

export interface Review {
  id: string;
  userName: string;
  userLocation: string;
  rating: number;
  date: string;
  comment: string;
  verified: boolean;
}

export interface ProductOutletConfig {
  outletId: string;
  inStock: boolean;
  isFeatured?: boolean;
  isBestseller?: boolean;
}

export interface Product {
  id: number | string;
  name: string;
  hindiName?: string;
  slug: string;
  shortDescription: string;
  description: string;
  story?: string;
  culinaryTitle?: string;
  cookingMethodTitle?: string;
  cookingMethodDesc?: string;
  aromaTitle?: string;
  aromaDesc?: string;
  price: number;
  originalPrice?: number;
  category: string;
  rating?: number;
  reviewsCount?: number;
  image: string;
  galleryImages?: string[];
  isVeg: boolean;
  isJainFriendly?: boolean;
  spiceLevel?: 'Mild' | 'Medium' | 'Spicy' | 'Extra Spicy';
  prepTimeMinutes?: number;
  serves?: string;
  calories?: number;
  featured?: boolean; // Legacy/fallback compatibility
  bestseller?: boolean; // Legacy/fallback compatibility
  newArrival?: boolean;
  chefSpecial?: boolean;
  active?: boolean;
  inStock?: boolean; // Legacy/fallback compatibility
  outletIds?: string[]; // Legacy/quick lookup compatibility
  outlets: ProductOutletConfig[]; // Source of truth for per-outlet stock, featured, and bestseller
  variants?: ProductVariant[];
  addons?: ProductAddon[];
  ingredients?: string[];
  allergens?: string[];
  reviewsList?: Review[];
}

export interface OwnerUser {
  email: string;
  role: 'owner' | 'admin';
  name?: string;
}

export interface DashboardStats {
  totalProducts: number;
  activeProducts: number;
  outOfStockProducts: number;
  featuredProducts: number;
  bestsellerProducts: number;
  totalOutlets?: number;
  activeOutlets?: number;
  totalZones?: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  image: string;
  itemCount: number;
  iconName: string;
}

export interface CartItem {
  id: string; // generated unique id (productId + variantId + addons)
  product: Product;
  selectedVariant?: ProductVariant;
  selectedSpiceLevel?: string;
  selectedAddons?: ProductAddon[];
  quantity: number;
  unitPrice: number;
}

export interface Coupon {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderValue: number;
  description: string;
}

export interface CheckoutFormData {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  deliverySlot: 'immediate' | 'lunch' | 'dinner' | 'custom';
  deliveryNotes?: string;
  paymentMethod: 'cod' | 'upi' | 'card' | 'netbanking';
  includeCutlery: boolean;
}

export interface Order {
  id?: string;
  orderId: string;
  outletId: string;
  outletName?: string;
  deliveryPinCode: string;
  createdAt: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  packagingFee: number;
  gst: number;
  total: number;
  couponCode?: string;
  customerDetails: CheckoutFormData;
  status:
    | 'pending'
    | 'confirmed'
    | 'preparing'
    | 'out_for_delivery'
    | 'delivered'
    | 'cancelled'
    | 'Received'
    | 'Preparing in Kitchen'
    | 'Out for Delivery'
    | 'Delivered';
  estimatedDeliveryMinutes?: number;
}

export interface FilterState {
  searchQuery: string;
  category: string;
  dietary: 'all' | 'veg' | 'non-veg';
  spiceLevel: string;
  minPrice: number;
  maxPrice: number;
  sortBy: 'popular' | 'price-low' | 'price-high' | 'rating' | 'newest';
}
