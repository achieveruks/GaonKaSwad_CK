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
  Coins,
} from 'lucide-react';
import { Order } from '../../types';
import { resolveOrderOutletInfo } from '../../lib/locationService';
import { useLocation } from '../../context/LocationContext';

interface OrderDetailsModalProps {
  order: Order;
  onClose: () => void;
  onReorder?: (order: Order) => void;
  onRate?: (order: Order) => void;
  isRated?: boolean;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  order,
  onClose,
  onReorder,
  onRate,
  isRated,
}) => {
  const isOrderRated = isRated ?? order.isRated ?? false;
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

  const { outlets } = useLocation();

  // 4. Resolve Actual Full Outlet Name & Location (e.g. 'Gaon Ka Swad - Khandagiri')
  const resolvedOutlet = resolveOrderOutletInfo(order, outlets);
  const outletDisplayName = resolvedOutlet.outletName;
  const outletPhone =
    resolvedOutlet.phone ||
    (order as any).outletPhone ||
    (order as any).outlet_phone ||
    (order as any).outletContact ||
    '';

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

  const streetAddress = isSelfPickup
    ? (resolvedOutlet.kitchenAddress ? `Kitchen Pickup: ${resolvedOutlet.kitchenAddress}` : `Self-Pickup from ${resolvedOutlet.outletName}`)
    : (order.deliveryAddressSnapshot?.fullAddress ||
      (order.deliveryAddressSnapshot as any)?.street ||
      (order.deliveryAddressSnapshot as any)?.address ||
      order.customerDetails?.address ||
      (order as any).deliveryAddress ||
      '');

  const landmark = isSelfPickup
    ? ''
    : (order.deliveryAddressSnapshot?.landmark ||
      order.customerDetails?.landmark ||
      '');

  const city = isSelfPickup
    ? resolvedOutlet.city
    : (order.deliveryAddressSnapshot?.city ||
      order.customerDetails?.city ||
      'Bhubaneswar');

  const pincode = isSelfPickup
    ? ''
    : (order.deliveryAddressSnapshot?.pincode ||
      order.deliveryPinCode ||
      order.customerDetails?.pincode ||
      '');

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
                {outletPhone && (
                  <p className="text-[11px] text-stone-600 font-medium mt-0.5 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-stone-400" />
                    <a href={`tel:${outletPhone.replace(/\s+/g, '')}`} className="hover:underline font-mono">
                      {outletPhone}
                    </a>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Delivery Address & Customer details */}
          <div className="bg-stone-50/70 rounded-xl p-4 border border-stone-200 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-900 border-b border-stone-200 pb-2">
              {isSelfPickup ? <Store className="w-3.5 h-3.5" /> : <Truck className="w-3.5 h-3.5" />} {isSelfPickup ? 'Pickup Customer Details' : 'Deliver To'}
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

              {/* Standard Delivery Address / Kitchen Pickup Address */}
              <div className="space-y-1">
                <div className="flex items-start gap-1.5 text-stone-700">
                  {isSelfPickup ? (
                    <Store className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  ) : (
                    <MapPin className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5">
                    {isSelfPickup && (
                      <p className="text-[10px] font-bold text-amber-900 uppercase tracking-wider">
                        Kitchen Pickup Address
                      </p>
                    )}
                    <p className="font-semibold text-stone-900 leading-snug">
                      {streetAddress || (isSelfPickup ? 'Kitchen Counter Pickup' : 'Standard Delivery Address')}
                    </p>
                    {landmark && (
                      <p className="text-stone-500 text-xs">Landmark: {landmark}</p>
                    )}
                    {cityPinLine && (
                      <p className="text-stone-700 font-medium text-xs">
                        {cityPinLine}
                      </p>
                    )}
                    {isSelfPickup && outletPhone && (
                      <div className="flex items-center gap-1.5 text-stone-800 font-medium text-xs pt-1.5 border-t border-stone-200/80 mt-1.5">
                        <Phone className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        <span>
                          <span className="text-stone-500 font-normal">Outlet Phone: </span>
                          <a
                            href={`tel:${outletPhone.replace(/\s+/g, '')}`}
                            className="font-bold text-amber-900 hover:underline font-mono"
                          >
                            {outletPhone}
                          </a>
                        </span>
                      </div>
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

            {Number(order.swadCoinDiscountAmount || 0) > 0 && (
              <div className="flex justify-between text-amber-700 font-medium">
                <span className="flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-amber-600" />
                  Swad Coins ({order.swadCoinsUsed || order.swadCoinDiscountAmount} coins)
                </span>
                <span>-₹{Number(order.swadCoinDiscountAmount).toFixed(0)}</span>
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
          {(() => {
            const rawMethod = (
              order.payment_method ||
              order.paymentMethod ||
              order.customerDetails?.paymentMethod ||
              'cod'
            ).toLowerCase().trim();
            const isCOD = rawMethod === 'cod' || rawMethod === 'cash on delivery';
            const methodLabel = isCOD
              ? 'Cash on Delivery'
              : rawMethod === 'upi'
              ? 'UPI'
              : rawMethod === 'card'
              ? 'Credit/Debit Card'
              : rawMethod.toUpperCase();

            const rawPayStatus = (
              order.payment_status ||
              order.paymentStatus ||
              ''
            ).toLowerCase().trim();

            let statusLabel = 'PAID';
            let statusBadge = 'bg-emerald-100 text-emerald-800';

            if (rawPayStatus === 'paid') {
              statusLabel = 'PAID';
              statusBadge = 'bg-emerald-100 text-emerald-800';
            } else if (rawPayStatus === 'pending') {
              if (isDelivered) {
                statusLabel = 'PAID ON DELIVERY';
                statusBadge = 'bg-emerald-100 text-emerald-800';
              } else if (isCOD) {
                statusLabel = 'PENDING ON DELIVERY';
                statusBadge = 'bg-amber-100 text-amber-800';
              } else {
                statusLabel = 'PENDING';
                statusBadge = 'bg-amber-100 text-amber-800';
              }
            } else if (rawPayStatus === 'refunded') {
              statusLabel = 'REFUNDED';
              statusBadge = 'bg-purple-100 text-purple-800';
            } else if (rawPayStatus === 'failed') {
              statusLabel = 'FAILED';
              statusBadge = 'bg-rose-100 text-rose-800';
            } else {
              // Fallback based on delivery & payment method
              if (isDelivered) {
                statusLabel = 'PAID';
                statusBadge = 'bg-emerald-100 text-emerald-800';
              } else if (isCOD) {
                statusLabel = 'PENDING ON DELIVERY';
                statusBadge = 'bg-amber-100 text-amber-800';
              } else {
                statusLabel = 'PENDING';
                statusBadge = 'bg-amber-100 text-amber-800';
              }
            }

            return (
              <div className="bg-stone-50/70 rounded-xl p-4 border border-stone-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-4 h-4 text-stone-500" />
                  <div>
                    <p className="text-stone-500 uppercase tracking-wider font-semibold text-[10px]">Payment Method</p>
                    <p className="font-bold text-stone-900">{methodLabel}</p>
                  </div>
                </div>
                <div>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-[11px] ${statusBadge}`}>
                    <CheckCircle2 className="w-3 h-3" />
                    {statusLabel}
                  </span>
                </div>
              </div>
            );
          })()}
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
                type="button"
                onClick={() => {
                  onClose();
                  onRate(order);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                  isOrderRated
                    ? 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                    : 'text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-200'
                }`}
                title={isOrderRated ? 'Order rated. Click to view or edit review' : 'Rate dishes in this delivered order'}
              >
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                {isOrderRated ? 'Rated' : 'Rate Items'}
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

