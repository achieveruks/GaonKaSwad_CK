import React from 'react';
import {
  ShoppingBag,
  ArrowRight,
  Clock,
  Receipt,
  ChevronRight,
} from 'lucide-react';
import { Order } from '../../types';

interface AllMyOrdersOptionsCardProps {
  orders: Order[];
  activeOrders: Order[];
  pastOrders: Order[];
  onGoToOrders: (tab?: 'all' | 'active' | 'delivered' | 'cancelled') => void;
  onSelectOrder?: (order: Order) => void;
}

export const AllMyOrdersOptionsCard: React.FC<AllMyOrdersOptionsCardProps> = ({
  orders,
  activeOrders,
  onGoToOrders,
}) => {
  const activeCount = activeOrders.length;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-stone-200/90 bg-gradient-to-br from-white via-amber-50/25 to-stone-50/70 p-4 sm:p-5 shadow-xs transition-all hover:shadow-md hover:border-amber-300/70 group/banner">
      {/* Subtle Atmospheric Glow */}
      <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-amber-600/5 blur-xl pointer-events-none" />

      <div className="relative flex flex-col gap-3">
        {/* Top Row: "All My Orders" One-Liner Button on Left & Active Orders Pill on Top Right */}
        <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
          {/* Top Left: Clickable One-Liner "All My Orders" Pill */}
          <button
            type="button"
            onClick={() => onGoToOrders('all')}
            className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-800 to-amber-900 hover:from-amber-900 hover:to-stone-900 text-white shadow-2xs hover:shadow-sm transition-all duration-200 cursor-pointer group select-none text-left"
            title="View all your orders"
          >
            <div className="w-6 h-6 rounded-xl bg-white/15 flex items-center justify-center text-amber-200 group-hover:scale-105 transition-transform duration-200">
              <ShoppingBag className="w-3.5 h-3.5" />
            </div>
            <span className="font-serif font-black text-sm tracking-wide text-amber-50 whitespace-nowrap">
              All My Orders
            </span>
            <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-amber-200 group-hover:translate-x-0.5 transition-transform duration-200">
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>

          {/* Top Right: Active Orders Capsule */}
          <button
            type="button"
            onClick={() => onGoToOrders('active')}
            className={`group/btn flex items-center gap-2 px-3.5 py-2 rounded-2xl border transition-all duration-200 cursor-pointer select-none shrink-0 ${
              activeCount > 0
                ? 'bg-amber-500/10 border-amber-300 hover:border-amber-400 hover:bg-amber-500/15 shadow-2xs'
                : 'bg-white/80 hover:bg-white border-stone-200 hover:border-stone-300 shadow-2xs'
            }`}
            title={
              activeCount > 0
                ? `${activeCount} active order(s) in progress — Click to filter active orders`
                : 'No active orders — Click to view orders'
            }
          >
            {activeCount > 0 ? (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-600" />
              </span>
            ) : (
              <Clock className="w-3.5 h-3.5 text-stone-400 group-hover/btn:text-stone-600 transition-colors" />
            )}

            <span
              className={`text-xs font-bold whitespace-nowrap ${
                activeCount > 0 ? 'text-amber-950' : 'text-stone-700'
              }`}
            >
              {activeCount > 0 ? `${activeCount} Active` : '0 Active'}{' '}
              <span
                className={`font-medium ${
                  activeCount > 0 ? 'text-amber-800' : 'text-stone-400'
                }`}
              >
                {activeCount === 1 ? 'Order' : 'Orders'}
              </span>
            </span>

            <ChevronRight
              className={`w-3.5 h-3.5 transition-transform duration-200 group-hover/btn:translate-x-0.5 ${
                activeCount > 0 ? 'text-amber-800' : 'text-stone-400'
              }`}
            />
          </button>
        </div>

        {/* Bottom Row: Full-width One-Liner Description */}
        <div className="w-full pt-1 border-t border-stone-200/50 flex items-center gap-2 text-stone-500 text-xs font-medium">
          <Receipt className="w-3.5 h-3.5 text-amber-700/70 shrink-0" />
          <span className="truncate sm:whitespace-normal">
            Track live orders, reorder dishes, and view invoices
          </span>
        </div>
      </div>
    </div>
  );
};
