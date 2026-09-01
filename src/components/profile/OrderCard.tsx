import React from 'react';
import {
  Clock,
  MapPin,
  ChevronRight,
  RotateCcw,
  Star,
  Zap,
  Calendar,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { Order } from '../../types';
import { INITIAL_OUTLETS } from '../../data/outlets';

interface OrderCardProps {
  order: Order;
  onViewDetails: (order: Order) => void;
  onReorder: (order: Order) => void;
  onRate?: (order: Order) => void;
  isActiveOrder?: boolean;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onViewDetails,
  onReorder,
  onRate,
  isActiveOrder = false,
}) => {
  const currentStatus =
    (order as any).order_status ||
    order.orderStatus ||
    order.status ||
    'received';
  const normCurrentStatus = (currentStatus || '').toLowerCase().trim();

  const isDelivered =
    normCurrentStatus === 'delivered' || normCurrentStatus === 'picked up';
  const isCancelled =
    normCurrentStatus === 'cancelled';

  // Date formatting
  const orderDate = new Date(order.createdAt || order.timestamp || Date.now());
  const formattedDate = orderDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const formattedTime = orderDate.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  // Scheduled check
  const isScheduled =
    order.deliveryType === 'scheduled' || order.delivery_type === 'scheduled';
  let scheduledTimeDisplay = '';
  if (isScheduled && (order.scheduledAt || order.scheduled_at)) {
    try {
      const sDate = new Date(order.scheduledAt || order.scheduled_at);
      const sDateStr = sDate.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
      });
      const sTimeStr = sDate.toLocaleTimeString('en-IN', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      scheduledTimeDisplay = `${sDateStr} • ${sTimeStr}`;
    } catch (e) {
      scheduledTimeDisplay = 'Scheduled Delivery';
    }
  }

  // Status mapping
  const getStatusBadge = (status: string) => {
    const norm = (status || '').toLowerCase().trim();
    switch (norm) {
      case 'delivered':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          dot: 'bg-emerald-500',
          label: 'Delivered',
        };
      case 'picked_up':
      case 'picked up':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          dot: 'bg-emerald-500',
          label: 'Picked Up',
        };
      case 'out_for_delivery':
      case 'out for delivery':
        return {
          bg: 'bg-blue-50 text-blue-800 border-blue-200',
          dot: 'bg-blue-500 animate-pulse',
          label: 'Out for Delivery',
        };
      case 'preparing':
      case 'preparing in kitchen':
      case 'in kitchen':
        return {
          bg: 'bg-amber-50 text-amber-900 border-amber-300',
          dot: 'bg-amber-500 animate-pulse',
          label: 'Preparing in Kitchen',
        };
      case 'ready':
        return {
          bg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
          dot: 'bg-indigo-500',
          label: 'Ready',
        };
      case 'ready_for_pickup':
      case 'ready for pickup':
        return {
          bg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
          dot: 'bg-indigo-500',
          label: 'Ready for Pickup',
        };
      case 'ready_for_dispatch':
      case 'ready for dispatch':
        return {
          bg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
          dot: 'bg-indigo-500',
          label: 'Ready for Dispatch',
        };
      case 'confirmed':
        return {
          bg: 'bg-teal-50 text-teal-800 border-teal-200',
          dot: 'bg-teal-500',
          label: 'Confirmed',
        };
      case 'cancelled':
        return {
          bg: 'bg-rose-50 text-rose-800 border-rose-200',
          dot: 'bg-rose-500',
          label: 'Cancelled',
        };
      case 'received':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          dot: 'bg-amber-500',
          label: 'Order Received',
        };
      case 'pending':
      case 'pending payment':
      default:
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          dot: 'bg-amber-500',
          label: norm
            ? norm.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
            : 'Order Received',
        };
    }
  };

  const statusBadge = getStatusBadge(currentStatus);
  const items = order.items || [];
  const displayItems = items.slice(0, 2);
  const remainingCount = items.length - displayItems.length;

  // Resolve full outlet name (e.g. 'Gaon Ka Swad - Khandagiri')
  const getOutletDisplayName = () => {
    const rawName = String(order.outletName || (order as any).outlet_name || '').trim();
    const rawId = String(order.outletId || (order as any).outlet_id || '').trim();

    if (rawName) {
      const lower = rawName.toLowerCase();
      if (lower.includes('khandagiri')) return 'Gaon Ka Swad - Khandagiri';
      if (lower.includes('patia')) return 'Gaon Ka Swad - Patia';
      if (lower.includes('hsr')) return 'Gaon Ka Swad - HSR Layout';
      if (lower.includes('whitefield')) return 'Gaon Ka Swad - Whitefield';
      if (lower.includes('indiranagar')) return 'Gaon Ka Swad - Indiranagar';

      const found = INITIAL_OUTLETS.find(
        (o) => o.name.toLowerCase() === lower || o.id.toLowerCase() === lower
      );
      if (found) return found.name;

      if (rawName !== 'Gaon Ka Swad Kitchen' && rawName !== 'Gaon Ka Swad' && rawName !== 'Default Outlet') {
        return rawName.startsWith('Gaon Ka Swad -') ? rawName : `Gaon Ka Swad - ${rawName}`;
      }
    }

    if (rawId) {
      const lowerId = rawId.toLowerCase();
      if (lowerId.includes('khandagiri') || lowerId === 'bbsr-khandagiri') return 'Gaon Ka Swad - Khandagiri';
      if (lowerId.includes('patia') || lowerId === 'bbsr-patia') return 'Gaon Ka Swad - Patia';
      if (lowerId.includes('hsr') || lowerId === 'blr-hsr') return 'Gaon Ka Swad - HSR Layout';
      if (lowerId.includes('whitefield') || lowerId === 'blr-whitefield') return 'Gaon Ka Swad - Whitefield';
      if (lowerId.includes('indiranagar') || lowerId === 'blr-indiranagar') return 'Gaon Ka Swad - Indiranagar';

      const found = INITIAL_OUTLETS.find((o) => o.id === rawId || o.id === `outlet-${rawId}`);
      if (found) return found.name;
    }

    const pin = order.deliveryPinCode || order.deliveryAddressSnapshot?.pincode;
    if (pin) {
      if (['751030', '751019', '751003', '752054', '751028', '751020', '751001', '751002'].includes(String(pin))) {
        return 'Gaon Ka Swad - Khandagiri';
      }
      if (['751024', '751016', '751031'].includes(String(pin))) {
        return 'Gaon Ka Swad - Patia';
      }
      if (['560102', '560103', '560034', '560068'].includes(String(pin))) {
        return 'Gaon Ka Swad - HSR Layout';
      }
      if (['560066', '560067', '560048', '560037'].includes(String(pin))) {
        return 'Gaon Ka Swad - Whitefield';
      }
      if (['560038', '560008', '560075', '560001'].includes(String(pin))) {
        return 'Gaon Ka Swad - Indiranagar';
      }
    }

    return 'Gaon Ka Swad - Khandagiri';
  };
  const resolvedOutletName = getOutletDisplayName();

  return (
    <div
      className={`bg-white rounded-2xl p-5 border transition-all duration-200 shadow-xs hover:shadow-md ${
        isActiveOrder
          ? 'border-amber-400/80 ring-2 ring-amber-400/20 bg-gradient-to-b from-amber-50/30 to-white'
          : 'border-stone-200 hover:border-stone-300'
      }`}
    >
      {/* Active banner if current order is in progress */}
      {isActiveOrder && (
        <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-amber-200/60 text-xs font-bold text-amber-900">
          <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px] bg-amber-500 text-white px-2.5 py-0.5 rounded-full shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            Active Order
          </span>
          <span className="text-amber-800 font-medium">
            Preparing your authentic meal
          </span>
        </div>
      )}

      {/* Top Bar: Order ID, Date, Status */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-stone-900 text-base sm:text-lg">
              #{order.orderId || order.id}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${statusBadge.bg}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
              {statusBadge.label}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-stone-500">
            <span>
              {formattedDate} • {formattedTime}
            </span>
            {resolvedOutletName && (
              <>
                <span>•</span>
                <span className="text-stone-600 font-medium">
                  {resolvedOutletName}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Delivery Type Badge */}
        <div>
          {isScheduled ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-800 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg">
              <Calendar className="w-3 h-3 text-indigo-600" />
              {scheduledTimeDisplay || 'Scheduled'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
              <Zap className="w-3 h-3 text-amber-600" />
              ⚡ Express Delivery
            </span>
          )}
        </div>
      </div>

      {/* Food Items Summary */}
      <div className="my-3.5 pt-3 border-t border-stone-100 space-y-1.5">
        {displayItems.map((rawItem: any, idx) => {
          const itemName = rawItem.name || rawItem.product?.name || 'Dish';
          const itemVariant = rawItem.selectedVariant?.name || rawItem.variantName || rawItem.variant?.name;
          const itemQty = rawItem.quantity || 1;

          return (
            <div key={idx} className="flex items-center justify-between text-xs text-stone-700">
              <span className="font-medium truncate max-w-[280px]">
                {itemQty} × {itemName}
                {itemVariant ? ` (${itemVariant})` : ''}
              </span>
            </div>
          );
        })}
        {remainingCount > 0 && (
          <p className="text-xs font-medium text-amber-800">
            + {remainingCount} more item{remainingCount > 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Footer: Amount & Actions */}
      <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-[10px] text-stone-400 uppercase tracking-wider block font-semibold">
            Total Paid
          </span>
          <span className="text-base font-extrabold text-stone-900 font-serif">
            ₹{Number(order.total || 0).toFixed(0)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isDelivered && onRate && (
            <button
              onClick={() => onRate(order)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors flex items-center gap-1"
            >
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              Rate
            </button>
          )}

          <button
            onClick={() => onViewDetails(order)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors flex items-center gap-1"
          >
            <Eye className="w-3.5 h-3.5" />
            View Details
          </button>

          {!isCancelled && (
            <button
              onClick={() => onReorder(order)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-amber-700 to-amber-800 text-white hover:from-amber-800 hover:to-amber-900 shadow-xs shadow-amber-900/10 transition-all flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Reorder
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
