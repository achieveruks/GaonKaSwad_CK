import React, { useState, useEffect, useMemo } from 'react';
import { useCustomer } from '../context/CustomerContext';
import { useNavigation } from '../context/NavigationContext';
import { useCart } from '../context/CartContext';
import { useLocation } from '../context/LocationContext';
import {
  Clock,
  ArrowLeft,
  ShoppingBag,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  User,
  Sparkles,
  Search,
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { isSupabaseConfigured } from '../lib/supabase';
import { fetchSupabaseOrdersByPhone } from '../lib/supabaseService';
import { Order } from '../types';
import { PRODUCTS } from '../data/products';
import { isProductAvailableAtOutlet, isProductInStockAtOutlet } from '../lib/locationService';
import { OrderCard } from '../components/profile/OrderCard';
import { OrderDetailsModal } from '../components/profile/OrderDetailsModal';
import { OrderReviewModal } from '../components/profile/OrderReviewModal';
import { OrderSkeleton } from '../components/profile/OrderSkeleton';

export const MyOrdersPage: React.FC = () => {
  const { customer, isCustomerLoggedIn, openOtpModal } = useCustomer();
  const { goToHome, goToShop, goToProfile } = useNavigation();
  const { addToCart, showToast, setIsCartDrawerOpen } = useCart();
  const { currentOutlet } = useLocation();

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [orderFilter, setOrderFilter] = useState<'all' | 'active' | 'delivered' | 'cancelled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ordersPerPage = 6;

  // Selected Order Modals
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<Order | null>(null);
  const [selectedOrderForReview, setSelectedOrderForReview] = useState<Order | null>(null);

  // Fetch orders when customer phone is available
  const fetchOrders = async () => {
    if (!customer?.phone) return;
    setIsLoadingOrders(true);
    setOrdersError(null);
    try {
      if (isSupabaseConfigured()) {
        const { orders: supaOrders } = await fetchSupabaseOrdersByPhone(customer.phone);
        if (supaOrders && supaOrders.length > 0) {
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
      setOrdersError(err.message || 'Unable to load orders at this moment.');
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (customer?.phone) {
      fetchOrders();
    } else {
      setOrders([]);
    }
  }, [customer?.phone]);

  // Reorder Handler (Outlet aware, verified portion stock, current catalog prices)
  const handleReorder = (orderToReorder: Order) => {
    if (!orderToReorder.items || orderToReorder.items.length === 0) {
      showToast('Reorder Error', 'No dishes found in this order.', 'error');
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
        `Added ${addedCount} dish${addedCount > 1 ? 'es' : ''} from Order #${orderToReorder.orderId || orderToReorder.id} to your cart.`,
        'success'
      );
      setIsCartDrawerOpen(true);
    } else if (addedCount > 0 && unavailableCount > 0) {
      showToast(
        'Reordered Available Dishes',
        `${addedCount} dish(es) added to cart. ${unavailableCount} dish(es) (${unavailableNames.join(', ')}) are currently unavailable at ${currentOutlet?.name || 'this outlet'}.`,
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

  // Filter and split active vs past orders
  const { activeOrders, pastOrders, filteredOrders, totalPages, paginatedOrders } =
    useMemo(() => {
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

      // Filter by status tab
      let list: Order[] = [];
      if (orderFilter === 'all') {
        list = orders;
      } else if (orderFilter === 'active') {
        list = activeList;
      } else if (orderFilter === 'delivered') {
        list = pastList.filter((o) => {
          const st = ((o as any).order_status || o.orderStatus || o.status || '').toLowerCase().trim();
          return st === 'delivered' || st === 'picked up';
        });
      } else if (orderFilter === 'cancelled') {
        list = pastList.filter((o) => {
          const st = ((o as any).order_status || o.orderStatus || o.status || '').toLowerCase().trim();
          return st === 'cancelled';
        });
      }

      // Filter by search query if any (order ID, item name, outlet)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        list = list.filter((ord) => {
          const idMatch = (ord.orderId || ord.id || '').toLowerCase().includes(q);
          const outletMatch = (ord.outletName || '').toLowerCase().includes(q);
          const itemMatch = ord.items?.some((i: any) =>
            (i.name || i.product?.name || '').toLowerCase().includes(q)
          );
          return idMatch || outletMatch || itemMatch;
        });
      }

      const totalPgs = Math.ceil(list.length / ordersPerPage) || 1;
      const startIndex = (currentPage - 1) * ordersPerPage;
      const paginated = list.slice(startIndex, startIndex + ordersPerPage);

      return {
        activeOrders: activeList,
        pastOrders: pastList,
        filteredOrders: list,
        totalPages: totalPgs,
        paginatedOrders: paginated,
      };
    }, [orders, orderFilter, searchQuery, currentPage]);

  return (
    <div className="min-h-screen bg-stone-50/60 pb-20">
      {/* Top Header / Breadcrumb Banner */}
      <div className="bg-white border-b border-stone-200 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-stone-500 mb-1">
                <button
                  type="button"
                  onClick={goToHome}
                  className="hover:text-amber-800 transition-colors"
                >
                  Home
                </button>
                <span>/</span>
                <button
                  type="button"
                  onClick={goToProfile}
                  className="hover:text-amber-800 transition-colors"
                >
                  Profile
                </button>
                <span>/</span>
                <span className="text-amber-800 font-bold">My Orders</span>
              </div>
              <h1 className="font-serif font-black text-2xl sm:text-3xl text-stone-900 tracking-tight flex items-center gap-2.5">
                <span>My Orders</span>
                {orders.length > 0 && (
                  <span className="text-xs font-sans font-bold bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full">
                    {orders.length} {orders.length === 1 ? 'Order' : 'Orders'}
                  </span>
                )}
              </h1>
              <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-2xl">
                Track live orders, download receipts, reorder authentic clay pot specialties, and share dish reviews.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={goToProfile}
                className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Profile</span>
              </button>
              <button
                type="button"
                onClick={fetchOrders}
                disabled={isLoadingOrders || !customer?.phone}
                className="p-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold transition-colors disabled:opacity-50 inline-flex items-center justify-center cursor-pointer shadow-2xs"
                title="Refresh Orders"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingOrders ? 'animate-spin text-amber-800' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* If Not Logged In */}
        {!isCustomerLoggedIn && (
          <div className="bg-white rounded-3xl border border-stone-200 p-8 sm:p-12 text-center shadow-xs space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center mx-auto text-3xl">
              🔐
            </div>
            <div className="max-w-md mx-auto">
              <h3 className="font-serif font-bold text-xl text-stone-900">
                Sign in to view your orders
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 mt-1.5 leading-relaxed">
                Log in with your registered phone number to track active deliveries and view your past orders.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => openOtpModal('', 'signin')}
                className="px-6 py-3 rounded-xl bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-amber-900/10 inline-flex items-center gap-2 cursor-pointer transition-all"
              >
                <User className="w-4 h-4" />
                <span>Sign In with OTP</span>
              </button>
            </div>
          </div>
        )}

        {/* When Logged In */}
        {isCustomerLoggedIn && (
          <>
            {/* Filter & Search Bar */}
            <div className="bg-white rounded-2xl border border-stone-200 p-3 sm:p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
                {[
                  { id: 'all', label: `All Orders (${orders.length})` },
                  { id: 'active', label: `Active (${activeOrders.length})` },
                  { id: 'delivered', label: 'Delivered' },
                  { id: 'cancelled', label: 'Cancelled' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setOrderFilter(tab.id as any);
                      setCurrentPage(1);
                    }}
                    className={`text-xs px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                      orderFilter === tab.id
                        ? 'bg-amber-800 text-white shadow-2xs'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search by Order ID / Dish Name */}
              <div className="relative w-full md:w-64">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search order ID, dish..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:border-amber-800 focus:bg-white transition-all text-stone-800"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-[10px] font-bold text-stone-400 hover:text-stone-600 absolute right-2.5 top-1/2 -translate-y-1/2"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Error Message */}
            {ordersError && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 text-center space-y-3">
                <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
                <div>
                  <h4 className="text-xs font-bold text-rose-900">Failed to load order records</h4>
                  <p className="text-[11px] text-rose-700 mt-0.5">{ordersError}</p>
                </div>
                <button
                  type="button"
                  onClick={fetchOrders}
                  className="px-4 py-1.5 rounded-xl bg-rose-700 text-white text-xs font-bold hover:bg-rose-800 transition-colors shadow-2xs inline-flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Try Again
                </button>
              </div>
            )}

            {/* Loading Skeleton */}
            {isLoadingOrders && !ordersError && (
              <div className="space-y-4">
                <OrderSkeleton />
                <OrderSkeleton />
              </div>
            )}

            {/* Empty State: No Orders placed yet */}
            {!isLoadingOrders && !ordersError && orders.length === 0 && (
              <div className="bg-white rounded-3xl border border-stone-200 p-10 sm:p-14 text-center space-y-4 shadow-xs">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center mx-auto text-3xl">
                  🍽️
                </div>
                <div className="max-w-md mx-auto">
                  <h3 className="font-serif font-bold text-xl text-stone-900">
                    Your plate is waiting
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-600 mt-1.5 leading-relaxed">
                    You haven't placed any orders yet. Discover our slow-cooked handi biryanis, clay pot curries, and regional Indian feasts.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => goToShop()}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-700 to-amber-800 text-white text-xs font-bold uppercase tracking-wider hover:from-amber-800 hover:to-amber-900 shadow-md shadow-amber-900/10 inline-flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Explore Menu</span>
                  </button>
                </div>
              </div>
            )}

            {/* Empty Filter State (e.g. searching or filter tab yields 0) */}
            {!isLoadingOrders &&
              !ordersError &&
              orders.length > 0 &&
              filteredOrders.length === 0 && (
                <div className="bg-white rounded-3xl border border-stone-200 p-8 text-center space-y-3 shadow-xs">
                  <p className="text-xs sm:text-sm text-stone-500 font-medium">
                    No orders match your filter criteria ({orderFilter !== 'all' ? `Filter: ${orderFilter}` : ''}
                    {searchQuery ? `, Search: "${searchQuery}"` : ''}).
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setOrderFilter('all');
                      setSearchQuery('');
                    }}
                    className="text-xs font-bold text-amber-800 hover:text-amber-900 underline cursor-pointer"
                  >
                    Reset filters & view all orders
                  </button>
                </div>
              )}

            {/* Full-Width Order Cards List */}
            {!isLoadingOrders && !ordersError && paginatedOrders.length > 0 && (
              <div className="space-y-4">
                {paginatedOrders.map((ord) => {
                  const isAct =
                    (ord.status || '').toLowerCase() === 'pending' ||
                    (ord.status || '').toLowerCase() === 'pending payment' ||
                    (ord.status || '').toLowerCase() === 'confirmed' ||
                    (ord.status || '').toLowerCase() === 'preparing' ||
                    (ord.status || '').toLowerCase() === 'ready' ||
                    (ord.status || '').toLowerCase() === 'out_for_delivery' ||
                    (ord.status || '').toLowerCase() === 'out for delivery';

                  return (
                    <OrderCard
                      key={ord.orderId || ord.id}
                      order={ord}
                      isActiveOrder={isAct}
                      onViewDetails={(o) => setSelectedOrderForDetails(o)}
                      onReorder={handleReorder}
                      onRate={(o) => setSelectedOrderForReview(o)}
                    />
                  );
                })}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 px-2 text-xs text-stone-600 bg-white rounded-2xl border border-stone-200 p-3 shadow-2xs">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="px-3.5 py-2 rounded-xl border border-stone-200 bg-stone-50 font-bold hover:bg-stone-100 disabled:opacity-40 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Previous
                    </button>
                    <span className="font-semibold text-stone-800">
                      Page <strong className="text-amber-900">{currentPage}</strong> of {totalPages} ({filteredOrders.length} total)
                    </span>
                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="px-3.5 py-2 rounded-xl border border-stone-200 bg-stone-50 font-bold hover:bg-stone-100 disabled:opacity-40 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      Next <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

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
