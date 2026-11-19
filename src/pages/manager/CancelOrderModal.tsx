import React, { useState, useEffect, useRef } from 'react';
import { X, AlertTriangle, AlertCircle, IndianRupee, ShieldCheck } from 'lucide-react';
import { Order } from '../../types';
import { formatDisplayOrderId } from '../../lib/supabaseService';

export type RefundPaymentMode = 'upi' | 'bank_transfer' | 'cash' | 'gateway_ref';

export interface CancelRefundPayload {
  cancellationReason: string;
  refundAmount: number;
  refundMethod: RefundPaymentMode;
  refundReference?: string;
  refundedAt: string;
  payoutDestination?: string;
  refundNotes?: string;
  idempotencyKey: string;
}

interface CancelOrderModalProps {
  order: Order;
  isOpen: boolean;
  staffLabel?: string;
  onClose: () => void;
  onConfirmCancel: (orderId: string, reason: string) => Promise<void>;
  onConfirmCancelWithRefund?: (orderId: string, payload: CancelRefundPayload) => Promise<void>;
}

const PRESET_REASONS = [
  'Outlet unable to deliver / Unavoidable circumstance',
  'Item / Ingredient out of stock',
  'Kitchen at peak capacity / Heavy backlog',
  'Customer requested cancellation via call',
  'Delivery address outside serviceable radius',
  'Customer unreachable / Invalid phone number',
  'Outlet closing early for maintenance',
  'Other operational issue',
];

const REFUND_MODES: Array<{
  id: RefundPaymentMode;
  label: string;
  refLabel: string;
  refPlaceholder: string;
  destLabel: string;
  destPlaceholder: string;
  requiresRef: boolean;
}> = [
  {
    id: 'upi',
    label: 'UPI',
    refLabel: 'UPI UTR / Transaction Ref *',
    refPlaceholder: 'e.g. 431982041122',
    destLabel: 'Customer UPI ID / Phone (Optional)',
    destPlaceholder: 'e.g. customer@okicici or 98XXXXXX10',
    requiresRef: true,
  },
  {
    id: 'bank_transfer',
    label: 'Bank Transfer',
    refLabel: 'IMPS / NEFT / RTGS Ref *',
    refPlaceholder: 'e.g. IMPS9021847123',
    destLabel: 'Account Holder / Last 4 Digits (Optional)',
    destPlaceholder: 'e.g. A/c ending 4821',
    requiresRef: true,
  },
  {
    id: 'cash',
    label: 'Cash',
    refLabel: 'Cash Voucher / Receipt No. (Optional)',
    refPlaceholder: 'e.g. VCH-104 (if issued)',
    destLabel: 'Handed Over To (Optional)',
    destPlaceholder: 'e.g. Customer at outlet counter',
    requiresRef: false,
  },
  {
    id: 'gateway_ref',
    label: 'Gateway Ref',
    refLabel: 'Gateway Refund ID *',
    refPlaceholder: 'e.g. rfnd_P9xK2mQw18...',
    destLabel: 'Original Gateway Payment ID (Optional)',
    destPlaceholder: 'e.g. pay_P9wA10...',
    requiresRef: true,
  },
];

function toLocalDateTimeInputValue(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export const CancelOrderModal: React.FC<CancelOrderModalProps> = ({
  order,
  isOpen,
  staffLabel = 'Outlet Staff',
  onClose,
  onConfirmCancel,
  onConfirmCancelWithRefund,
}) => {
  const isPrebook =
    order.orderType === 'prebook' ||
    (order as any).order_type === 'prebook' ||
    order.deliveryType === 'pb-scheduled' ||
    (order as any).delivery_type === 'pb-scheduled' ||
    Boolean(order.festiveEventId || (order as any).festive_event_id);

  const totalAmount = Number(order.total || 0);
  const rawPayStatus = String(
    order.paymentStatus ?? (order as any).payment_status ?? ''
  )
    .toLowerCase()
    .trim();
  const isPaidOrPartialStatus = ['paid', 'partially_paid', 'partial', 'advance_paid'].includes(rawPayStatus);
  const explicitPaid = Number(order.paidAmount ?? (order as any).paid_amount ?? 0);
  const paidAmount =
    explicitPaid > 0
      ? explicitPaid
      : isPaidOrPartialStatus
        ? isPrebook && order.paymentPlan === 'advance_25'
          ? Number(order.advanceAmount || 0)
          : totalAmount
        : 0;
  const balanceAmount = Number(
    order.balanceAmount ?? (order as any).balance_amount ?? Math.max(0, totalAmount - paidAmount)
  );
  const needsRefund =
    paidAmount > 0 &&
    (isPaidOrPartialStatus || isPrebook || explicitPaid > 0) &&
    typeof onConfirmCancelWithRefund === 'function';

  const [selectedReason, setSelectedReason] = useState<string>(
    isPrebook ? PRESET_REASONS[0] : PRESET_REASONS[1]
  );
  const [customReason, setCustomReason] = useState<string>('');
  const [refundMode, setRefundMode] = useState<RefundPaymentMode>('upi');
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [refundReference, setRefundReference] = useState<string>('');
  const [refundedAt, setRefundedAt] = useState<string>(() => toLocalDateTimeInputValue());
  const [payoutDestination, setPayoutDestination] = useState<string>('');
  const [refundNotes, setRefundNotes] = useState<string>('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const idempotencyKeyRef = useRef<string>('');

  const targetOrderId = order.orderId || order.id || '';

  useEffect(() => {
    if (!isOpen) return;
    setSelectedReason(isPrebook ? PRESET_REASONS[0] : PRESET_REASONS[1]);
    setCustomReason('');
    setRefundMode('upi');
    setRefundAmount(
      paidAmount > 0 ? (Number.isInteger(paidAmount) ? String(paidAmount) : paidAmount.toFixed(2)) : '0'
    );
    setRefundReference('');
    setRefundedAt(toLocalDateTimeInputValue(new Date()));
    setPayoutDestination(
      order.customerDetails?.phone ? `+91 ${order.customerDetails.phone}` : ''
    );
    setRefundNotes('');
    setSubmitError(null);
    idempotencyKeyRef.current = `cancel_ref_${targetOrderId}_${Date.now()}`;
  }, [isOpen, targetOrderId, isPrebook, paidAmount, order.customerDetails?.phone]);

  if (!isOpen) return null;

  const activeModeConfig = REFUND_MODES.find((m) => m.id === refundMode) || REFUND_MODES[0];
  const parsedAmount = Number(refundAmount);
  const retainedAmount =
    Number.isFinite(parsedAmount) && parsedAmount > 0
      ? Math.max(0, Number((paidAmount - parsedAmount).toFixed(2)))
      : paidAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setSubmitError(null);

    const finalReason =
      selectedReason === 'Other operational issue' ? customReason.trim() : selectedReason;

    if (!finalReason) {
      setSubmitError('Please specify the cancellation reason.');
      return;
    }

    if (needsRefund) {
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        setSubmitError('Please enter a valid refund amount greater than ₹0.');
        return;
      }
      if (parsedAmount > paidAmount) {
        setSubmitError(`Refund amount cannot exceed paid amount of ₹${paidAmount}.`);
        return;
      }
      const cleanRef = refundReference.trim();
      if (activeModeConfig.requiresRef && cleanRef.length < 3) {
        setSubmitError(
          `Please enter a valid ${activeModeConfig.refLabel.replace(' *', '')} before recording this ${activeModeConfig.label} refund.`
        );
        return;
      }
      const parsedDate = new Date(refundedAt);
      if (!refundedAt || isNaN(parsedDate.getTime())) {
        setSubmitError('Please enter a valid refund date and time.');
        return;
      }

      setIsSubmitting(true);
      try {
        await onConfirmCancelWithRefund!(targetOrderId, {
          cancellationReason: finalReason,
          refundAmount: Number(parsedAmount.toFixed(2)),
          refundMethod: refundMode,
          refundReference: cleanRef || undefined,
          refundedAt: parsedDate.toISOString(),
          payoutDestination: payoutDestination.trim() || undefined,
          refundNotes: refundNotes.trim() || undefined,
          idempotencyKey: idempotencyKeyRef.current,
        });
      } catch (err: any) {
        setSubmitError(err?.message || 'Failed to record refund and cancel order.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirmCancel(targetOrderId, finalReason);
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to cancel order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div
        className={`bg-white rounded-2xl border border-stone-200 shadow-2xl w-full max-h-[92vh] flex flex-col overflow-hidden ${
          needsRefund ? 'max-w-xl' : 'max-w-md'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-rose-50 border-b border-rose-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-700 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-stone-900 text-sm">
                {needsRefund
                  ? isPrebook
                    ? 'Cancel Pre-book & Record Advance Refund'
                    : 'Cancel Order & Record Refund'
                  : 'Cancel Order'}
              </h3>
              <p className="text-[11px] text-stone-600 font-mono">
                {formatDisplayOrderId(targetOrderId)}
                {order.festivalName ? ` · ${order.festivalName}` : ''}
                {order.customerDetails?.fullName ? ` · ${order.customerDetails.fullName}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg hover:bg-rose-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content & Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
            {submitError && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2 font-semibold leading-relaxed"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            {needsRefund && (
              <div className="bg-amber-50/80 border border-amber-200 rounded-xl px-4 py-3 grid grid-cols-3 gap-2 tabular-nums">
                <div>
                  <span className="text-[10px] font-semibold text-stone-500 block">Order Total</span>
                  <span className="font-mono font-bold text-stone-900 text-sm">
                    ₹{totalAmount.toFixed(0)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-amber-800 block">
                    {isPrebook ? 'Advance Paid' : 'Amount Paid'}
                  </span>
                  <span className="font-mono font-extrabold text-amber-950 text-sm">
                    ₹{paidAmount.toFixed(0)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-semibold text-stone-500 block">
                    {balanceAmount > 0 ? 'Balance Voided' : 'Refundable Cap'}
                  </span>
                  <span className="font-mono font-bold text-stone-700 text-sm">
                    {balanceAmount > 0 ? `₹${balanceAmount.toFixed(0)} → ₹0` : `₹${paidAmount.toFixed(0)}`}
                  </span>
                </div>
              </div>
            )}

            {/* Step 1: Cancellation Reason */}
            <div className="space-y-2">
              <label className="block font-bold text-stone-800">
                {needsRefund ? '1. Cancellation Reason' : 'Select Cancellation Reason'}
              </label>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {PRESET_REASONS.map((reason) => (
                  <label
                    key={reason}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                      selectedReason === reason
                        ? 'bg-rose-50/70 border-rose-300 text-stone-900 font-bold'
                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="cancellationReason"
                      value={reason}
                      disabled={isSubmitting}
                      checked={selectedReason === reason}
                      onChange={() => {
                        setSelectedReason(reason);
                        if (submitError) setSubmitError(null);
                      }}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>

              {selectedReason === 'Other operational issue' && (
                <div className="pt-1">
                  <textarea
                    required
                    rows={2}
                    disabled={isSubmitting}
                    value={customReason}
                    onChange={(e) => {
                      setCustomReason(e.target.value);
                      if (submitError) setSubmitError(null);
                    }}
                    placeholder="Explain the specific operational reason for records..."
                    className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl focus:outline-none focus:border-rose-500 disabled:opacity-60"
                  />
                </div>
              )}
            </div>

            {/* Step 2: Structured Refund Payout Configuration (paid / partially paid orders) */}
            {needsRefund && (
              <div className="pt-4 border-t border-stone-200 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900">
                    2. Refund Payout Details (Set Before Recording)
                  </span>
                  <span className="text-[11px] font-medium text-stone-500">
                    Ledger Audit Required
                  </span>
                </div>

                {/* Mode of Payment */}
                <div>
                  <label className="block font-semibold text-stone-700 mb-1.5">
                    Mode of Payment
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {REFUND_MODES.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => {
                          setRefundMode(m.id);
                          if (submitError) setSubmitError(null);
                        }}
                        className={`py-2 px-2.5 rounded-xl font-bold text-[11px] border transition-colors cursor-pointer whitespace-nowrap disabled:opacity-60 ${
                          refundMode === m.id
                            ? 'bg-stone-900 text-white border-stone-900'
                            : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount & Refund Date/Time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      Refund Amount (₹)
                    </label>
                    <div className="relative">
                      <IndianRupee className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="number"
                        min={1}
                        max={paidAmount}
                        step="any"
                        required
                        disabled={isSubmitting}
                        value={refundAmount}
                        onChange={(e) => {
                          setRefundAmount(e.target.value);
                          if (submitError) setSubmitError(null);
                        }}
                        className="w-full pl-8 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm font-mono font-bold text-stone-900 tabular-nums focus:outline-none focus:border-stone-900 focus:bg-white disabled:opacity-60"
                      />
                    </div>
                    <p className="text-[11px] mt-1 font-medium tabular-nums text-stone-500">
                      {retainedAmount <= 0
                        ? isPrebook
                          ? 'Full advance return (100%)'
                          : 'Full refund (100%)'
                        : `Partial refund · ₹${retainedAmount.toFixed(0)} retained`}
                    </p>
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      Refund Date &amp; Time
                    </label>
                    <input
                      type="datetime-local"
                      required
                      disabled={isSubmitting}
                      value={refundedAt}
                      onChange={(e) => {
                        setRefundedAt(e.target.value);
                        if (submitError) setSubmitError(null);
                      }}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono text-stone-900 focus:outline-none focus:border-stone-900 focus:bg-white disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* Transaction Reference & Payout Destination */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      {activeModeConfig.refLabel}
                    </label>
                    <input
                      type="text"
                      required={activeModeConfig.requiresRef}
                      disabled={isSubmitting}
                      value={refundReference}
                      onChange={(e) => {
                        setRefundReference(e.target.value);
                        if (submitError) setSubmitError(null);
                      }}
                      placeholder={activeModeConfig.refPlaceholder}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono text-stone-900 focus:outline-none focus:border-stone-900 focus:bg-white disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      {activeModeConfig.destLabel}
                    </label>
                    <input
                      type="text"
                      disabled={isSubmitting}
                      value={payoutDestination}
                      onChange={(e) => setPayoutDestination(e.target.value)}
                      placeholder={activeModeConfig.destPlaceholder}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-stone-900 focus:bg-white disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* Remarks & Staff Attribution */}
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Refund Notes / Remarks (Optional)
                  </label>
                  <input
                    type="text"
                    disabled={isSubmitting}
                    value={refundNotes}
                    onChange={(e) => setRefundNotes(e.target.value)}
                    placeholder="e.g. Informed customer over call & refunded immediately"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-stone-900 focus:bg-white disabled:opacity-60"
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-stone-600 bg-stone-50 px-3 py-2 rounded-xl border border-stone-200">
                  <span className="flex items-center gap-1.5 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    Processed By: <strong className="text-stone-900">{staffLabel}</strong>
                  </span>
                  <span className="font-mono text-stone-500">Swad Coins auto-refunded if used</span>
                </div>

                {/* Pre-Submit Audit Preview Strip */}
                <div className="px-3.5 py-2.5 rounded-xl bg-stone-900 text-stone-100 flex flex-wrap items-center justify-between gap-2 text-[11px] tabular-nums">
                  <span className="font-semibold text-stone-300">Audit Preview:</span>
                  <span className="font-mono font-bold text-white">
                    {activeModeConfig.label} · ₹
                    {Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount.toFixed(0) : '0'} ·{' '}
                    Ref: {refundReference.trim() || (refundMode === 'cash' ? 'Cash Counter' : 'Pending Ref')}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Footer Action Buttons */}
          <div className="px-6 py-3.5 bg-stone-50 border-t border-stone-200 flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-700 hover:bg-rose-800 text-white transition-colors disabled:opacity-60 flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              {isSubmitting
                ? needsRefund
                  ? 'Recording Refund & Cancelling...'
                  : 'Cancelling...'
                : needsRefund
                  ? `Refund ₹${Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount.toFixed(0) : paidAmount.toFixed(0)} & Cancel Order`
                  : 'Confirm Order Cancellation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
