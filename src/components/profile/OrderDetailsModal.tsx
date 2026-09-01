import React from 'react';
import {
  X,
  MapPin,
  Phone,
  User,
  Clock,
  Zap,
  Calendar,
  CreditCard,
  Tag,
  CheckCircle2,
  AlertCircle,
  Truck,
  RotateCcw,
  Star,
  Store,
} from 'lucide-react';
import { Order } from '../../types';
import { INITIAL_OUTLETS } from '../../data/outlets';

interface OrderDetailsModalProps {
  order: Order;
  onClose: () => void;
  onReorder?: (order: Order) => void;
  onRate?: (order: Order) => void;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  order,
  onClose,
  onReorder,
  onRate,
}) => {
  const currentStatus =
    (order as any).order_status ||
    order.orderStatus ||
    order.status ||
    'received';
  const normCurrentStatus = (currentStatus || '').toLowerCase().trim();

  const isDelivered =
    normCurrentStatus === 'delivered' || normCurrentStatus === 'picked up';
  const isCancelledStr =
    normCurrentStatus === 'cancelled';
  const isSelfPickup = order.orderType === 'pickup' || order.isSelfPickup;

  // Format Helper for Indian Date & Time (e.g. 28 Aug 2026 • 4:58 pm)
  const formatDateTime = (dateVal?: string | number | null) => {
    if (!dateVal) return '';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return String(dateVal);
      const dateStr = d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      const timeStr = d.toLocaleTimeString('en-IN', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      return `${dateStr} • ${timeStr}`;
    } catch {
      return String(dateVal);
    }
  };

  // 1. Order Receipt Date (Received At / Placed At)
  const rawReceivedAt =
    order.placedAt ||
    (order as any).placed_at ||
    order.createdAt ||
    (order as any).created_at ||
    (order as any).timestamp ||
    Date.now();
  const formattedReceiptDate = formatDateTime(rawReceivedAt);

  // 2. Scheduled date formatting
  let scheduledDisplay = '';
  if (order.deliveryType === 'scheduled' || order.delivery_type === 'scheduled') {
    const rawScheduled = order.scheduledAt || order.scheduled_at;
    if (rawScheduled) {
      try {
        scheduledDisplay = formatDateTime(rawScheduled);
      } catch (e) {
        scheduledDisplay = 'Scheduled Delivery';
      }
    } else {
      scheduledDisplay = 'Scheduled Delivery';
    }
  }

  // 3. Status Badge and Latest Status Timestamp
  const getStatusInfo = (status: string) => {
    const norm = (status || '').toLowerCase().trim();
    switch (norm) {
      case 'delivered':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          dot: 'bg-emerald-500',
          label: 'Delivered',
          timestamp: order.deliveredAt || (order as any).delivered_at,
        };
      case 'picked_up':
      case 'picked up':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          dot: 'bg-emerald-500',
          label: 'Picked Up',
          timestamp: order.deliveredAt || (order as any).delivered_at,
        };
      case 'out_for_delivery':
      case 'out for delivery':
        return {
          bg: 'bg-blue-50 text-blue-800 border-blue-200',
          dot: 'bg-blue-500 animate-pulse',
          label: 'Out for Delivery',
          timestamp: order.outForDeliveryAt || (order as any).out_for_delivery_at,
        };
      case 'preparing':
      case 'preparing in kitchen':
      case 'in kitchen':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          dot: 'bg-amber-500 animate-pulse',
          label: 'Preparing in Kitchen',
          timestamp: order.preparingAt || (order as any).preparing_at,
        };
      case 'ready':
      case 'ready for pickup':
      case 'ready for dispatch':
      case 'ready_for_pickup':
      case 'ready_for_dispatch':
        return {
          bg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
          dot: 'bg-indigo-500',
          label:
            norm === 'ready_for_pickup' || norm === 'ready for pickup'
              ? 'Ready for Pickup'
              : norm === 'ready_for_dispatch' || norm === 'ready for dispatch'
              ? 'Ready for Dispatch'
              : 'Ready',
          timestamp: order.readyAt || (order as any).ready_at,
        };
      case 'confirmed':
        return {
          bg: 'bg-teal-50 text-teal-800 border-teal-200',
          dot: 'bg-teal-500',
          label: 'Order Confirmed',
          timestamp: order.confirmedAt || (order as any).confirmed_at,
        };
      case 'cancelled':
        return {
          bg: 'bg-rose-50 text-rose-800 border-rose-200',
          dot: 'bg-rose-500',
          label: 'Cancelled',
          timestamp: order.cancelledAt || (order as any).cancelled_at,
        };
      case 'received':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          dot: 'bg-amber-500',
          label: 'Order Received',
          timestamp: rawReceivedAt,
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
          timestamp: rawReceivedAt,
        };
    }
  };

  const statusInfo = getStatusInfo(currentStatus);
  const statusDateTimestamp = statusInfo.timestamp || rawReceivedAt;
  const formattedStatusTime = formatDateTime(statusDateTimestamp);

  // 4. Resolve Actual Full Outlet Name (e.g. 'Gaon Ka Swad - Khandagiri')
  const getOutletDisplayName = () => {
    const rawName = String(order.outletName || (order as any).outlet_name || '').trim();
    const rawId = String(order.outletId || (order as any).outlet_id || '').trim();

    // Check specific name matches
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

    // Check outlet ID matches
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

    // Check delivery pin code or city
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

  const outletDisplayName = getOutletDisplayName();

  // 5. Customer Details & Delivery Address
  const customerName =
    order.customerDetails?.fullName ||
    (order.customerDetails as any)?.name ||
    (order as any).customerName ||
    (order as any).customer_name ||
    (order.deliveryAddressSnapshot as any)?.fullName ||
    'Customer';

  const customerPhone =
    order.customerDetails?.phone ||
    (order as any).customerPhone ||
    (order as any).customer_phone ||
    (order.deliveryAddressSnapshot as any)?.phone ||
    '';

  const streetAddress =
    order.deliveryAddressSnapshot?.fullAddress ||
    (order.deliveryAddressSnapshot as any)?.street ||
    (order.deliveryAddressSnapshot as any)?.address ||
    order.customerDetails?.address ||
    (order as any).deliveryAddress ||
    (isSelfPickup ? 'Self-Pickup from Kitchen Outlet' : '');

  const landmark =
    order.deliveryAddressSnapshot?.landmark ||
    order.customerDetails?.landmark ||
    '';

  const city =
    order.deliveryAddressSnapshot?.city ||
    order.customerDetails?.city ||
    'Bhubaneswar';

  const pincode =
    order.deliveryAddressSnapshot?.pincode ||
    order.deliveryPinCode ||
    order.customerDetails?.pincode ||
    '751028';

  const cityPinLine = [city, pincode].filter(Boolean).join(', ');

  const couponDiscount = Number(order.couponDiscountAmount || order.discount || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-amber-950 p-5 text-white flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-400/20 uppercase tracking-wider">
                Order Receipt
              </span>
              <span className="text-xs text-amber-200/80 font-medium">
                {formattedReceiptDate}
              </span>
            </div>
            <h3 className="font-serif font-bold text-xl text-amber-50 mt-1">
              Order #{order.orderId || order.id}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-stone-800">
          {/* Status, Delivery Mode & Kitchen Outlet Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-stone-50 rounded-xl border border-stone-200/80">
            {/* 1. Status with Date & Time below */}
            <div className="flex items-start gap-2.5">
              <span className={`w-2.5 h-2.5 rounded-full mt-1 ${statusInfo.dot}`} />
              <div>
                <p className="text-xs text-stone-500 uppercase tracking-wider font-medium">Status</p>
                <p className="text-sm font-bold text-stone-900 leading-tight">{statusInfo.label}</p>
                {formattedStatusTime && (
                  <p className="text-[11px] text-stone-500 font-medium mt-0.5">
                    {formattedStatusTime}
                  </p>
                )}
              </div>
            </div>

            {/* 2. Delivery Mode */}
            <div className="flex items-start gap-2 sm:border-l sm:border-stone-200 sm:pl-4">
              {isSelfPickup ? (
                <>
                  <Store className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-stone-500 uppercase tracking-wider font-medium">Delivery Mode</p>
                    <p className="text-xs font-bold text-teal-900 leading-tight">Self-Pickup</p>
                    <p className="text-[11px] text-stone-500 font-medium mt-0.5">Collect from kitchen outlet</p>
                  </div>
                </>
              ) : order.deliveryType === 'scheduled' || order.delivery_type === 'scheduled' ? (
                <>
                  <Calendar className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-stone-500 uppercase tracking-wider font-medium">Delivery Mode</p>
                    <p className="text-xs font-bold text-indigo-900 leading-tight">Scheduled Delivery</p>
                    {scheduledDisplay && (
                      <p className="text-[11px] text-stone-500 font-medium mt-0.5">
                        {scheduledDisplay}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-stone-500 uppercase tracking-wider font-medium">Delivery Mode</p>
                    <p className="text-xs font-bold text-amber-900 leading-tight">⚡ Express Delivery</p>
                    <p className="text-[11px] text-stone-500 font-medium mt-0.5">Instant kitchen dispatch</p>
                  </div>
                </>
              )}
            </div>

            {/* 3. Kitchen Outlet */}
            <div className="flex items-start gap-2 sm:border-l sm:border-stone-200 sm:pl-4">
              <Store className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-stone-500 uppercase tracking-wider font-medium">Kitchen Outlet</p>
                <p className="text-xs font-bold text-stone-900 leading-snug">
                  {outletDisplayName}
                </p>
              </div>
            </div>
          </div>

          {/* Delivery Address & Customer details */}
          <div className="bg-stone-50/70 rounded-xl p-4 border border-stone-200 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-900 border-b border-stone-200 pb-2">
              <Truck className="w-3.5 h-3.5" /> {isSelfPickup ? 'Pickup Customer Details' : 'Deliver To'}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Customer Name & Phone */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-stone-900 text-sm">
                  <User className="w-4 h-4 text-stone-500 shrink-0" />
                  <span>{customerName}</span>
                </div>
                {customerPhone && (
                  <div className="flex items-center gap-1.5 text-stone-600 font-medium pl-5 text-xs">
                    <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span>{customerPhone}</span>
                  </div>
                )}
              </div>

              {/* Standard Delivery Address */}
              <div className="space-y-1">
                <div className="flex items-start gap-1.5 text-stone-700">
                  <MapPin className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-semibold text-stone-900 leading-snug">
                      {streetAddress || 'Standard Delivery Address'}
                    </p>
                    {landmark && (
                      <p className="text-stone-500 text-xs">Landmark: {landmark}</p>
                    )}
                    {cityPinLine && (
                      <p className="text-stone-700 font-medium text-xs">
                        {cityPinLine}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Itemized Bill */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">
              Items Ordered ({order.items?.length || 0})
            </h4>
            <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden bg-white">
              {order.items?.map((rawItem: any, idx) => {
                const itemName = rawItem.name || rawItem.product?.name || 'Dish';
                const itemPrice = Number(rawItem.price || rawItem.unitPrice || rawItem.product?.price || 0);
                const itemQuantity = Number(rawItem.quantity || 1);
                const itemTotal = Number(rawItem.totalPrice || rawItem.total || itemPrice * itemQuantity);
                const itemVariant = rawItem.selectedVariant?.name || rawItem.variantName || rawItem.variant?.name;
                const itemSpice = rawItem.selectedSpiceLevel || rawItem.spiceLevel;
                const isVeg = rawItem.isVeg ?? rawItem.product?.isVeg;

                return (
                  <div
                    key={idx}
                    className="p-3.5 flex items-center justify-between gap-4 text-sm hover:bg-stone-50/50 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-900">{itemName}</span>
                        {isVeg !== undefined && (
                          <span
                            className={`w-3.5 h-3.5 rounded-xs border flex items-center justify-center p-0.5 ${
                              isVeg ? 'border-emerald-600' : 'border-rose-600'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isVeg ? 'bg-emerald-600' : 'bg-rose-600'
                              }`}
                            />
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-stone-500 flex flex-wrap gap-2">
                        {itemVariant && (
                          <span className="bg-stone-100 px-1.5 py-0.5 rounded text-stone-600 font-medium">
                            {itemVariant}
                          </span>
                        )}
                        {itemSpice && (
                          <span className="text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded font-medium">
                            🌶️ {itemSpice}
                          </span>
                        )}
                        <span>
                          ₹{itemPrice} × {itemQuantity}
                        </span>
                      </div>
                    </div>
                    <span className="font-bold text-stone-900 text-sm whitespace-nowrap">
                      ₹{itemTotal}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 space-y-2.5 text-xs">
            <h4 className="font-bold uppercase tracking-wider text-stone-600 border-b border-stone-200 pb-2">
              Price Details
            </h4>
            <div className="flex justify-between text-stone-600">
              <span>Food Subtotal</span>
              <span>₹{Number(order.subtotal || order.total).toFixed(0)}</span>
            </div>

            {couponDiscount > 0 && (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span className="flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" />
                  Coupon ({order.couponCode || 'PROMO'})
                </span>
                <span>-₹{couponDiscount.toFixed(0)}</span>
              </div>
            )}

            {Number(order.deliveryFee || 0) > 0 && (
              <div className="flex justify-between text-stone-600">
                <span>Delivery Fee</span>
                <span>₹{Number(order.deliveryFee).toFixed(0)}</span>
              </div>
            )}

            {Number(order.packagingFee || 0) > 0 && (
              <div className="flex justify-between text-stone-600">
                <span>Packaging & Handling</span>
                <span>₹{Number(order.packagingFee).toFixed(0)}</span>
              </div>
            )}

            {Number(order.gst || 0) > 0 && (
              <div className="flex justify-between text-stone-600">
                <span>Taxes & GST</span>
                <span>₹{Number(order.gst).toFixed(0)}</span>
              </div>
            )}

            <div className="pt-2 border-t border-stone-200 flex justify-between text-sm font-extrabold text-stone-900">
              <span>Grand Total</span>
              <span className="text-amber-900 font-serif text-base">₹{Number(order.total).toFixed(0)}</span>
            </div>
          </div>

          {/* Payment Details */}
          <div className="bg-stone-50/70 rounded-xl p-4 border border-stone-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <CreditCard className="w-4 h-4 text-stone-500" />
              <div>
                <p className="text-stone-500 uppercase tracking-wider font-semibold text-[10px]">Payment Method</p>
                <p className="font-bold text-stone-900">
                  {order.payment_method?.toUpperCase() || (order as any).paymentMethod?.toUpperCase() || (order.customerDetails?.paymentMethod ? order.customerDetails.paymentMethod.toUpperCase() : 'CASH ON DELIVERY')}
                </p>
              </div>
            </div>
            <div>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-[11px] ${
                  order.payment_status === 'paid' || (order as any).paymentStatus === 'paid' || isDelivered
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                {order.payment_status?.toUpperCase() || (order as any).paymentStatus?.toUpperCase() || (order.customerDetails?.paymentMethod === 'cod' ? 'PENDING ON DELIVERY' : 'PAID')}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="bg-stone-100 p-4 border-t border-stone-200 flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 transition-colors"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            {isDelivered && onRate && (
              <button
                onClick={() => {
                  onClose();
                  onRate(order);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 transition-colors flex items-center gap-1.5"
              >
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                Rate Items
              </button>
            )}

            {onReorder && !isCancelledStr && (
              <button
                onClick={() => {
                  onClose();
                  onReorder(order);
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-amber-700 to-amber-800 text-white hover:from-amber-800 hover:to-amber-900 transition-all shadow-md shadow-amber-900/10 flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reorder Items
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

