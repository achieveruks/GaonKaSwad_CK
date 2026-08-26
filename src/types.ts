export interface Outlet {
  id: string;
  name: string;
  city: string;
  state?: string;
  address: string;
  fssaiLicId?: number; // Strictly numeric 14-digit FSSAI License ID
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
  heroFireLine?: string;
  heroHeader?: string;
  heroDescription?: string;
  trustBadgeRating?: string;
  trustBadgeRatingSub?: string;
  trustBadgeUsp?: string;
  trustBadgeUspSub?: string;
  assignedProductIds?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface OutletAbout {
  id?: string;
  outletId: string;
  heroFireLine?: string;
  heroHeader?: string;
  heroDescription?: string;
  storyLine?: string;
  storyTitle?: string;
  storyDescription?: string;
  storyHighlight1Title?: string;
  storyHighlight1Description?: string;
  storyHighlight2Title?: string;
  storyHighlight2Description?: string;
  outletImage?: string;
  // Section 4 Experience / Values Fields (Mapped to exp_* in DB)
  expLine?: string;
  expHeader?: string;
  expDescription?: string;
  expCard1Title?: string;
  expCard1Header?: string;
  expCard1Description?: string;
  expCard2Title?: string;
  expCard2Header?: string;
  expCard2Description?: string;
  expCard3Title?: string;
  expCard3Header?: string;
  expCard3Description?: string;
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
  isChefSpecial?: boolean;
  portionsLeft?: number | null; // null/undefined = unlimited, 0 = sold out, >0 = portions remaining
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

export type UserRole = 'owner' | 'outlet_manager' | 'customer';

export interface Profile {
  id: string;
  role: UserRole;
  outletId?: string;
  assignedOutletIds?: string[];
  fullName?: string;
  phone?: string;
  email?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OwnerUser {
  id?: string;
  email: string;
  role: UserRole | 'admin';
  name?: string;
  outletId?: string;
  assignedOutletIds?: string[];
  isSupabaseAuth?: boolean;
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

export interface Customer {
  id: string;
  phone: string;
  fullName: string;
  email?: string;
  isActive?: boolean;
  marketingConsent?: boolean;
  welcomeDiscountUsed?: boolean;
  welcomeDiscountUsedAt?: string;
  lastOrderAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerAddress {
  id: string;
  customerId: string;
  addressLabel?: string;
  fullAddress: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
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
  createAccount?: boolean;
  marketingConsent?: boolean;
  isOtpVerified?: boolean;
  orderType?: 'delivery' | 'pickup';
  isSelfPickup?: boolean;
}

export interface OrderItem {
  productId: string;
  name: string;
  hindiName?: string;
  image: string;
  isVeg: boolean;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  selectedVariant?: {
    id: string;
    name: string;
    weight?: string;
    serves?: string;
    price?: number;
    originalPrice?: number;
  };
  selectedSpiceLevel?: string;
  selectedAddons?: Array<{
    id: string;
    name: string;
    price: number;
    isVeg?: boolean;
  }>;
  // UI In-Memory Compatibility fields (optional, populated when reading for legacy components)
  id?: string;
  price?: number;
  product?: Partial<Product>;
}

export type CleanOrderItem = Omit<OrderItem, 'id' | 'price' | 'product'>;

export interface Order {
  id?: string;
  orderId: string;
  customerId?: string;
  addressId?: string;
  isGuestCheckout?: boolean;
  outletId: string;
  outletName?: string;
  orderType?: 'delivery' | 'pickup';
  isSelfPickup?: boolean;
  kitchenAddress?: string;
  deliveryPinCode: string;
  createdAt: string;
  items: Array<OrderItem | CartItem>;
  subtotal: number;
  discount: number;
  welcomeDiscountAmount?: number;
  isWelcomeDiscountApplied?: boolean;
  deliveryFee: number;
  packagingFee: number;
  gst: number;
  total: number;
  couponCode?: string;
  customerDetails: CheckoutFormData;
  deliveryAddressSnapshot?: {
    fullAddress: string;
    landmark?: string;
    city: string;
    state: string;
    pincode: string;
  };
  status:
    | 'pending'
    | 'confirmed'
    | 'preparing'
    | 'ready'
    | 'out_for_delivery'
    | 'delivered'
    | 'cancelled'
    | 'Received'
    | 'Confirmed'
    | 'Preparing'
    | 'Preparing in Kitchen'
    | 'Ready'
    | 'Ready for Pickup'
    | 'Out for Delivery'
    | 'Picked Up'
    | 'Delivered'
    | 'Cancelled';
  orderStatus?: string;
  placedAt?: string;
  confirmedAt?: string;
  preparingAt?: string;
  readyAt?: string;
  outForDeliveryAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
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
