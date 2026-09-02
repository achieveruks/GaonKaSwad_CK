import React, { useRef } from 'react';
import {
  X,
  Printer,
  Clock,
  MapPin,
  Phone,
  User,
  ShoppingBag,
  IndianRupee,
  Utensils,
  CheckCircle2,
  AlertCircle,
  Truck,
  Bike,
  Flame,
  FileText,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { Order } from '../../types';
import { formatScheduledAt } from '../../utils/dateUtils';
import { resolveOrderOutletInfo } from '../../lib/locationService';

interface ManagerOrderDetailsModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  outletName?: string;
}

export const ManagerOrderDetailsModal: React.FC<ManagerOrderDetailsModalProps> = ({
  order,
  isOpen,
  onClose,
  outletName = 'Gaon Ka Swad Kitchen',
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !order) return null;

  const resolvedOutlet = resolveOrderOutletInfo(order);
  const activeBranchName = order.outletName || resolvedOutlet.outletName || outletName;
  const isPickup = !!(order.isSelfPickup || order.orderType === 'pickup');
  const rawStatus = ((order as any).order_status || order.orderStatus || order.status || 'received').toLowerCase().trim();
  const displayStatus =
    rawStatus === 'received'
      ? 'Received'
      : rawStatus === 'confirmed'
      ? 'Confirmed'
      : rawStatus === 'preparing' || rawStatus === 'in kitchen' || rawStatus === 'preparing in kitchen'
      ? 'Preparing in Kitchen'
      : rawStatus === 'ready'
      ? 'Ready'
      : rawStatus === 'ready_for_pickup' || rawStatus === 'ready for pickup'
      ? 'Ready for Pickup'
      : rawStatus === 'ready_for_dispatch' || rawStatus === 'ready for dispatch'
      ? 'Ready for Dispatch'
      : rawStatus === 'out_for_delivery' || rawStatus === 'out for delivery'
      ? 'Out for Delivery'
      : rawStatus === 'delivered'
      ? 'Delivered'
      : rawStatus === 'picked_up' || rawStatus === 'picked up'
      ? 'Picked Up'
      : rawStatus === 'cancelled'
      ? 'Cancelled'
      : rawStatus.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-stone-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-800/40 border border-amber-600/40 flex items-center justify-center text-amber-400">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm text-white tracking-wide">
                  Order Details & Kitchen Ticket
                </h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isPickup
                      ? 'bg-purple-900/80 text-purple-200 border border-purple-700'
                      : 'bg-emerald-900/80 text-emerald-200 border border-emerald-700'
                  }`}
                >
                  {isPickup ? 'Self-Pickup' : 'Home Delivery'}
                </span>
              </div>
              <p className="text-xs text-stone-400 font-mono">
                Order ID: {order.orderId || order.id}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-amber-700 hover:bg-amber-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print KOT</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Printable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1" ref={printAreaRef}>
          {/* Scheduled Order Attention Banner */}
          {(order.deliveryType === 'scheduled' || order.customerDetails?.deliveryType === 'scheduled') && (
            <div className="bg-gradient-to-r from-amber-100 via-amber-50 to-orange-50 rounded-xl border-2 border-amber-400 p-4 flex items-center justify-between gap-3 text-amber-950 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-900 text-amber-100 flex items-center justify-center shrink-0 shadow-xs">
                  <Calendar className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-amber-300 text-amber-950 px-2 py-0.5 rounded border border-amber-400">
                      Scheduled Delivery Booking
                    </span>
                  </div>
                  <p className="text-sm font-black text-amber-950 mt-0.5 font-mono">
                    Target Window: {order.customerDetails?.scheduledSlotLabel || formatScheduledAt(order.scheduledAt || order.customerDetails?.scheduledAt)}
                  </p>
                  <p className="text-[11px] text-amber-900 font-medium">
                    Please cook fresh and prepare dispatch in time for this specific slot.
                  </p>
                </div>
              </div>
              {order.customerDetails?.scheduledTimeSlot && (
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider block">Slot Time</span>
                  <span className="inline-block px-3 py-1 bg-amber-900 text-white font-mono font-bold text-xs rounded-lg shadow-xs">
                    {order.customerDetails.scheduledTimeSlot}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Printable KOT Header */}
          <div className="bg-amber-50/60 rounded-xl border border-amber-200/80 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-amber-200">
              <div>
                <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">
                  Kitchen Branch
                </span>
                <h4 className="font-black text-stone-900 text-base">{activeBranchName}</h4>
              </div>
              <div className="sm:text-right">
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                  Placed Timestamp
                </span>
                <span className="text-xs font-bold text-stone-800 font-mono">
                  {formatDateTime(order.placedAt || order.createdAt)}
                </span>
              </div>
            </div>

            {/* Quick Summary Meta */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-stone-500 font-semibold block">STATUS</span>
                <span className="font-extrabold text-stone-900 uppercase">
                  {displayStatus}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-stone-500 font-semibold block">PAYMENT</span>
                <span className="font-bold text-stone-800">
                  {(order.customerDetails?.paymentMethod as string) !== 'cod' ? 'Online Paid' : 'Cash on Delivery (COD)'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-stone-500 font-semibold block">DELIVERY TYPE</span>
                <span className="font-bold text-stone-800 capitalize">
                  {order.deliveryType === 'scheduled' || order.customerDetails?.deliveryType === 'scheduled'
                    ? 'Scheduled'
                    : 'Immediate'}
                </span>
                {(order.deliveryType === 'scheduled' || order.customerDetails?.deliveryType === 'scheduled') && (
                  <span className="text-[10px] text-amber-900 font-semibold block mt-0.5 leading-tight">
                    {order.customerDetails?.scheduledSlotLabel ||
                      formatScheduledAt(order.scheduledAt || order.customerDetails?.scheduledAt)}
                  </span>
                )}
              </div>
              <div>
                <span className="text-[10px] text-stone-500 font-semibold block">TOTAL BILL</span>
                <span className="font-extrabold text-emerald-800 text-sm">
                  ₹{order.total || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Customer & Address Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-stone-50 rounded-xl border border-stone-200 p-4 space-y-2">
              <div className="flex items-center gap-1.5 text-stone-700 font-bold text-xs pb-1 border-b border-stone-200">
                <User className="w-3.5 h-3.5 text-amber-800" />
                <span>Customer Information</span>
              </div>
              <div className="text-xs space-y-1">
                <p className="font-bold text-stone-900">{order.customerDetails?.fullName || 'Walk-in Customer'}</p>
                <p className="text-stone-600 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-stone-400" />
                  <a href={`tel:${order.customerDetails?.phone}`} className="text-amber-800 hover:underline font-mono">
                    +91 {order.customerDetails?.phone || '—'}
                  </a>
                </p>
                {order.customerDetails?.email && (
                  <p className="text-stone-500 text-[11px]">{order.customerDetails.email}</p>
                )}
              </div>
            </div>

            <div className="bg-stone-50 rounded-xl border border-stone-200 p-4 space-y-2">
              <div className="flex items-center gap-1.5 text-stone-700 font-bold text-xs pb-1 border-b border-stone-200">
                <MapPin className="w-3.5 h-3.5 text-amber-800" />
                <span>{isPickup ? 'Pickup Location' : 'Delivery Address'}</span>
              </div>
              <div className="text-xs space-y-1">
                {isPickup ? (
                  <p className="font-medium text-purple-900">
                    Self-Pickup directly from kitchen counter ({activeBranchName})
                    {resolvedOutlet.kitchenAddress && (
                      <span className="block text-stone-600 font-normal text-[11px] mt-0.5">
                        {resolvedOutlet.kitchenAddress}, {resolvedOutlet.city}
                      </span>
                    )}
                  </p>
                ) : (
                  <>
                    <p className="font-medium text-stone-800">
                      {order.deliveryAddressSnapshot?.fullAddress || order.customerDetails?.address || '—'}
                    </p>
                    <p className="text-stone-500 text-[11px]">
                      {order.deliveryAddressSnapshot?.city || order.customerDetails?.city || 'Bhubaneswar'},{' '}
                      {order.deliveryAddressSnapshot?.state || order.customerDetails?.state || 'Odisha'} -{' '}
                      <span className="font-mono font-bold text-stone-800">
                        {order.deliveryPinCode || order.customerDetails?.pincode || '—'}
                      </span>
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Kitchen / Delivery Special Instructions */}
          {(order.customerDetails?.deliveryNotes || order.deliveryNotes) && (
            <div className="bg-amber-100/70 border border-amber-300 rounded-xl p-3.5 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
              <div>
                <span className="text-[11px] font-bold text-amber-950 uppercase tracking-wider block">
                  Customer Cooking / Delivery Instructions
                </span>
                <p className="text-xs font-semibold text-amber-900 mt-0.5">
                  "{order.customerDetails?.deliveryNotes || order.deliveryNotes}"
                </p>
              </div>
            </div>
          )}

          {/* Order Items Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-stone-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-amber-800" />
                <span>Ordered Items ({order.items?.length || 0})</span>
              </h4>
            </div>

            <div className="border border-stone-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-100 text-stone-700 font-bold border-b border-stone-200">
                    <th className="py-2.5 px-3">Item & Specifications</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {order.items?.map((item: any, idx) => {
                    const isVegItem = item.isVeg ?? item.product?.isVeg ?? true;
                    const itemName = item.name ?? item.product?.name ?? 'Item';
                    const itemHindiName = item.hindiName ?? item.product?.hindiName;
                    const itemVariant = item.selectedVariant ?? item.variant;
                    const itemSpice = item.selectedSpiceLevel ?? item.spiceLevel;
                    const itemAddons = item.selectedAddons ?? item.addons;
                    const unitPrice = item.unitPrice ?? item.price ?? item.product?.price ?? 0;

                    return (
                      <tr key={idx} className="hover:bg-stone-50/70">
                        <td className="py-2.5 px-3">
                          <div className="flex items-start gap-2">
                            <span
                              className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 mt-0.5 ${
                                isVegItem
                                  ? 'border-emerald-600 text-emerald-600'
                                  : 'border-rose-600 text-rose-600'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isVegItem ? 'bg-emerald-600' : 'bg-rose-600'
                                }`}
                              />
                            </span>
                            <div>
                              <p className="font-extrabold text-stone-900">
                                {itemName}
                                {itemHindiName && (
                                  <span className="ml-1.5 text-stone-500 font-normal text-[11px]">
                                    ({itemHindiName})
                                  </span>
                                )}
                              </p>
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                {itemVariant && (
                                  <span className="px-1.5 py-0.2 bg-stone-100 text-stone-700 rounded text-[10px] font-medium border border-stone-200">
                                    {itemVariant.name}
                                  </span>
                                )}
                                {itemSpice && (
                                  <span className="px-1.5 py-0.2 bg-amber-50 text-amber-800 rounded text-[10px] font-medium border border-amber-200 flex items-center gap-0.5">
                                    <Flame className="w-2.5 h-2.5 text-amber-600" />
                                    <span>{itemSpice}</span>
                                  </span>
                                )}
                                {itemAddons && itemAddons.length > 0 && (
                                  <span className="text-[10px] text-stone-500">
                                    + {itemAddons.map((a: any) => `${a.name} (₹${a.price})`).join(', ')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-extrabold text-stone-900">
                          {item.quantity}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-stone-600 font-mono">
                          ₹{unitPrice}
                        </td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-stone-900 font-mono">
                          ₹{unitPrice * item.quantity}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pricing Calculation Summary */}
          <div className="bg-stone-50 rounded-xl border border-stone-200 p-4 space-y-2">
            <div className="flex justify-between text-xs text-stone-600">
              <span>Item Subtotal:</span>
              <span className="font-mono">₹{order.subtotal || 0}</span>
            </div>
            {Boolean(order.discount && order.discount > 0) && (
              <div className="flex justify-between text-xs text-emerald-700 font-medium">
                <span>Discount {order.couponCode ? `(${order.couponCode})` : ''}:</span>
                <span className="font-mono">-₹{order.discount}</span>
              </div>
            )}
            <div className="flex justify-between text-xs text-stone-600">
              <span>Packaging Charge:</span>
              <span className="font-mono">₹{order.packagingFee || 0}</span>
            </div>
            {!isPickup && (
              <div className="flex justify-between text-xs text-stone-600">
                <span>Delivery Charge:</span>
                <span className="font-mono">
                  {order.deliveryFee === 0 ? 'FREE' : `₹${order.deliveryFee}`}
                </span>
              </div>
            )}
            <div className="flex justify-between text-xs text-stone-600">
              <span>GST (5%):</span>
              <span className="font-mono">₹{order.gst || 0}</span>
            </div>
            <div className="pt-2 border-t border-stone-200 flex justify-between text-sm font-extrabold text-stone-950">
              <span>Grand Total:</span>
              <span className="font-mono text-base text-amber-900">₹{order.total || 0}</span>
            </div>
          </div>

          {/* Detailed Timestamps Audit History */}
          <div className="space-y-2">
            <h4 className="font-extrabold text-stone-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-800" />
              <span>Order Lifecycle & Operational Timestamps</span>
            </h4>

            <div className="bg-stone-50 rounded-xl border border-stone-200 p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-stone-200/60">
                <span className="text-stone-500 font-medium">1. Placed At:</span>
                <span className="font-mono font-bold text-stone-900">
                  {formatDateTime(order.placedAt || order.createdAt)}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-stone-200/60">
                <span className="text-stone-500 font-medium">2. Confirmed At:</span>
                <span className={`font-mono font-bold ${order.confirmedAt ? 'text-blue-700' : 'text-stone-400'}`}>
                  {formatDateTime(order.confirmedAt)}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-stone-200/60">
                <span className="text-stone-500 font-medium">3. Preparing At:</span>
                <span className={`font-mono font-bold ${order.preparingAt ? 'text-amber-700' : 'text-stone-400'}`}>
                  {formatDateTime(order.preparingAt)}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-stone-200/60">
                <span className="text-stone-500 font-medium">4. Ready & Packed:</span>
                <span className={`font-mono font-bold ${order.readyAt ? 'text-purple-700' : 'text-stone-400'}`}>
                  {formatDateTime(order.readyAt)}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-stone-200/60">
                <span className="text-stone-500 font-medium">5. Out for Delivery:</span>
                <span className={`font-mono font-bold ${order.outForDeliveryAt ? 'text-cyan-700' : 'text-stone-400'}`}>
                  {formatDateTime(order.outForDeliveryAt)}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-stone-200/60">
                <span className="text-stone-500 font-medium">6. Delivered At:</span>
                <span className={`font-mono font-bold ${order.deliveredAt ? 'text-emerald-700' : 'text-stone-400'}`}>
                  {formatDateTime(order.deliveredAt)}
                </span>
              </div>

              {order.cancelledAt && (
                <div className="col-span-full bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-xs text-rose-900 mt-1">
                  <div className="flex justify-between font-bold">
                    <span>Cancelled At:</span>
                    <span className="font-mono">{formatDateTime(order.cancelledAt)}</span>
                  </div>
                  {order.cancellationReason && (
                    <p className="text-[11px] text-rose-700 mt-0.5">
                      Reason: {order.cancellationReason}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-stone-100 border-t border-stone-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-stone-500">
            Press Print KOT to generate standard kitchen ticket slips.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-800 hover:bg-stone-900 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};
