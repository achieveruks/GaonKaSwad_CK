import React from 'react';
import {
  Clock,
  ShoppingBag,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Order } from '../../types';
import { OrderCard } from './OrderCard';
import { OrderSkeleton } from './OrderSkeleton';

interface ActiveOrdersBannerProps {
  activeOrders: Order[];
  isLoading: boolean;
  ordersError: string | null;
  onRefreshOrders: () => void;
  onViewDetails: (order: Order) => void;
  onReorder: (order: Order) => void;
  onGoToShop: () => void;
  onGoToOrders: (tab?: 'all' | 'active' | 'delivered' | 'cancelled') => void;
}

export const ActiveOrdersBanner: React.FC<ActiveOrdersBannerProps> = ({
  activeOrders,
  isLoading,
  ordersError,
  onRefreshOrders,
  onViewDetails,
  onReorder,
  onGoToShop,
  onGoToOrders,
}) => {
  const activeCount = activeOrders.length;

  return (
    <div
      id="active-orders-banner"
      className="w-full bg-white rounded-3xl border border-stone-200/90 shadow-xs overflow-hidden transition-all duration-200 hover:border-amber-300/80 hover:shadow-md"
    >
      {/* Top Banner Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 sm:px-6 py-4 bg-gradient-to-r from-stone-50 via-white to-amber-50/30 border-b border-stone-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-amber-100/70 border border-amber-200/60 flex items-center justify-center text-amber-800 shadow-2xs">
            <Clock className="w-4 h-4 text-amber-800" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif font-black text-base text-stone-950">
                Active Orders
              </h3>
              {activeCount > 0 ? (
                <span className="text-xs font-bold text-amber-900 bg-amber-100/90 border border-amber-300/80 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping" />
                  {activeCount} In Progress
                </span>
              ) : (
                <span className="text-xs font-semibold text-stone-500 bg-stone-100/90 border border-stone-200 px-2.5 py-0.5 rounded-full">
                  0 Active
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500 font-medium">
              Live tracking & real-time preparation status from our kitchen
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <button
              type="button"
              onClick={() => onGoToOrders('active')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 hover:text-amber-950 bg-amber-50 hover:bg-amber-100/80 border border-amber-200/80 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
            >
              <span>View Full Tracker</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={onRefreshOrders}
            disabled={isLoading}
            title="Refresh order status"
            className="p-2 rounded-xl text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Refresh orders"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-800' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Main Banner Body */}
      <div className="p-5 sm:p-6">
        {/* Error State */}
        {ordersError && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-center space-y-2">
            <AlertCircle className="w-6 h-6 text-rose-600 mx-auto" />
            <p className="text-xs text-rose-700">{ordersError}</p>
            <button
              type="button"
              onClick={onRefreshOrders}
              className="px-3.5 py-1.5 bg-rose-700 text-white text-xs font-bold rounded-xl hover:bg-rose-800 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" /> Retry Status
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading && !ordersError && <OrderSkeleton />}

        {/* Active Orders Grid (Horizontal full-width arrangement) */}
        {!isLoading && !ordersError && activeCount > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-5">
            {activeOrders.map((ord) => (
              <OrderCard
                key={ord.orderId || ord.id}
                order={ord}
                isActiveOrder={true}
                onViewDetails={onViewDetails}
                onReorder={onReorder}
              />
            ))}
          </div>
        )}

        {/* Empty Active Orders Horizontal Banner State */}
        {!isLoading && !ordersError && activeCount === 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-stone-50/80 via-amber-50/20 to-stone-50/60 border border-stone-100">
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="w-12 h-12 rounded-2xl bg-amber-100/60 border border-amber-200/50 flex items-center justify-center text-amber-800 shrink-0 mx-auto sm:mx-0">
                <ShoppingBag className="w-6 h-6 text-amber-800/80" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-sm font-bold text-stone-900">
                  No active orders in progress right now
                </h4>
                <p className="text-xs text-stone-500 max-w-md">
                  Craving freshly prepared slow-cooked Handi Biryani, clay pot curries, or delicious thalis?
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={onGoToShop}
                className="px-4 py-2.5 bg-gradient-to-r from-amber-800 to-amber-900 hover:from-amber-900 hover:to-stone-900 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                <span>Explore Menu & Order</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
