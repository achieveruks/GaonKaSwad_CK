import type { CartItem } from '../types';

export interface SplitChildTotals {
  subtotal: number;
  discount: number;
  swadCoinDiscount: number;
  packagingFee: number;
  deliveryFee: number;
  gst: number;
  total: number;
  advanceAmount: number;
  balanceAmount: number;
  paymentPlan: 'full' | 'advance_25';
}

export interface MixedCheckoutBreakdown {
  orderMode: 'normal' | 'prebook' | 'mixed';
  normalItems: CartItem[];
  prebookItems: CartItem[];
  hasNormal: boolean;
  hasPrebook: boolean;
  isMixed: boolean;
  normalSubtotal: number;
  prebookSubtotal: number;
  combinedSubtotal: number;
  totalCouponDiscount: number;
  totalSwadCoinDiscount: number;
  totalPackagingFee: number;
  totalDeliveryFee: number;
  totalGst: number;
  grandTotal: number;
  prebookPaymentPlan: 'advance_25' | 'full';
  amountDueNow: number;
  balanceDue: number;
  normalChild: SplitChildTotals | null;
  prebookChild: SplitChildTotals | null;
}

const toPaise = (rupees: number): number => Math.round((Number(rupees) || 0) * 100);
const toRupees = (paise: number): number => Number((paise / 100).toFixed(2));

/**
 * Determines whether a cart/order item is an Utsav Pre-book item.
 */
export function isPrebookItem(item: any): boolean {
  if (!item) return false;
  const prod = item.product || item;
  return (
    prod?.availabilityMode === 'prebook_only' ||
    prod?.availability_mode === 'prebook_only' ||
    item?.availabilityMode === 'prebook_only' ||
    item?.availability_mode === 'prebook_only'
  );
}

/**
 * Pure, deterministic integer-paise financial calculation for Normal, Pre-book, and Mixed carts.
 * Shared across Frontend preview (CartContext / CheckoutPage) and Server Checkout API.
 */
export function calculateMixedCheckoutBreakdown(params: {
  items: any[];
  couponDiscountTotal?: number;
  swadCoinDiscountTotal?: number;
  packagingFeeTotal?: number;
  deliveryFeeTotal?: number;
  prebookPaymentPlan?: 'advance_25' | 'full';
}): MixedCheckoutBreakdown {
  const allItems = Array.isArray(params.items) ? params.items : [];
  const normalItems = allItems.filter((it) => !isPrebookItem(it));
  const prebookItems = allItems.filter((it) => isPrebookItem(it));

  const hasNormal = normalItems.length > 0;
  const hasPrebook = prebookItems.length > 0;
  const isMixed = hasNormal && hasPrebook;
  const orderMode: 'normal' | 'prebook' | 'mixed' = isMixed
    ? 'mixed'
    : hasPrebook
      ? 'prebook'
      : 'normal';

  const prebookPlan: 'advance_25' | 'full' = hasPrebook
    ? (params.prebookPaymentPlan === 'advance_25' ? 'advance_25' : 'full')
    : 'full';

  const sumSubtotalPaise = (list: any[]) =>
    list.reduce((acc, it) => {
      const unit = Number(it.unitPrice ?? it.price ?? it.product?.price ?? 0);
      const qty = Math.max(1, Number(it.quantity) || 1);
      return acc + toPaise(unit * qty);
    }, 0);

  const normalSubP = sumSubtotalPaise(normalItems);
  const prebookSubP = sumSubtotalPaise(prebookItems);
  const combinedSubP = normalSubP + prebookSubP;

  // Coupon discount cannot exceed combined food subtotal
  const requestedCouponP = Math.max(0, toPaise(params.couponDiscountTotal || 0));
  const totalCouponP = Math.min(requestedCouponP, combinedSubP);

  // Eligible food after coupon discount
  const eligibleAfterCouponP = Math.max(0, combinedSubP - totalCouponP);
  const requestedCoinsP = Math.max(0, toPaise(params.swadCoinDiscountTotal || 0));
  const totalCoinsP = Math.min(requestedCoinsP, eligibleAfterCouponP);

  // Proportional coupon split (in integer paise, assigning rounding residual to normal)
  let normalCouponP = 0;
  let prebookCouponP = 0;
  if (combinedSubP > 0 && totalCouponP > 0) {
    if (isMixed) {
      normalCouponP = Math.round((totalCouponP * normalSubP) / combinedSubP);
      prebookCouponP = totalCouponP - normalCouponP;
      if (normalCouponP > normalSubP) {
        normalCouponP = normalSubP;
        prebookCouponP = totalCouponP - normalCouponP;
      } else if (prebookCouponP > prebookSubP) {
        prebookCouponP = prebookSubP;
        normalCouponP = totalCouponP - prebookCouponP;
      }
    } else if (hasNormal) {
      normalCouponP = totalCouponP;
    } else {
      prebookCouponP = totalCouponP;
    }
  }

  // Proportional SwadCoin split against post-coupon eligible amounts
  const normalEligibleP = Math.max(0, normalSubP - normalCouponP);
  const prebookEligibleP = Math.max(0, prebookSubP - prebookCouponP);
  const totalEligibleP = normalEligibleP + prebookEligibleP;

  let normalCoinsP = 0;
  let prebookCoinsP = 0;
  if (totalEligibleP > 0 && totalCoinsP > 0) {
    if (isMixed) {
      normalCoinsP = Math.round((totalCoinsP * normalEligibleP) / totalEligibleP);
      prebookCoinsP = totalCoinsP - normalCoinsP;
      if (normalCoinsP > normalEligibleP) {
        normalCoinsP = normalEligibleP;
        prebookCoinsP = totalCoinsP - normalCoinsP;
      } else if (prebookCoinsP > prebookEligibleP) {
        prebookCoinsP = prebookEligibleP;
        normalCoinsP = totalCoinsP - prebookCoinsP;
      }
    } else if (hasNormal) {
      normalCoinsP = totalCoinsP;
    } else {
      prebookCoinsP = totalCoinsP;
    }
  }

  // Packaging fee: charged once on Instant child when Normal items exist; Pre-book carries ₹0 in mixed orders
  const totalPkgP = Math.max(0, toPaise(params.packagingFeeTotal || 0));
  const normalPkgP = hasNormal ? totalPkgP : 0;
  const prebookPkgP = !hasNormal && hasPrebook ? totalPkgP : 0;

  // Delivery charge: charged once per checkout (Normal carries the delivery charge when present; Prebook carries it when Prebook-only)
  const totalDeliveryP = Math.max(0, toPaise(params.deliveryFeeTotal || 0));
  const normalDeliveryP = hasNormal ? totalDeliveryP : 0;
  const prebookDeliveryP = !hasNormal && hasPrebook ? totalDeliveryP : 0;

  // 5% GST calculated on each child's taxable food subtotal (matching existing CheckoutPage formula: Math.round(discountedSubtotal * 0.05))
  const normalGst = hasNormal ? Math.round(toRupees(normalEligibleP) * 0.05) : 0;
  const prebookGst = hasPrebook ? Math.round(toRupees(prebookEligibleP) * 0.05) : 0;
  const normalGstP = toPaise(normalGst);
  const prebookGstP = toPaise(prebookGst);

  const normalTotalP = Math.max(
    0,
    normalSubP - normalCouponP - normalCoinsP + normalPkgP + normalDeliveryP + normalGstP
  );
  const prebookTotalP = Math.max(
    0,
    prebookSubP - prebookCouponP - prebookCoinsP + prebookPkgP + prebookDeliveryP + prebookGstP
  );

  // Pre-book 25% Advance vs 100% Full
  let prebookAdvanceP = prebookTotalP;
  let prebookBalanceP = 0;
  if (hasPrebook && prebookPlan === 'advance_25') {
    // Round in whole rupees to match existing backend/UI expectation cleanly
    const prebookTotalRupees = toRupees(prebookTotalP);
    const advRupees = Math.round(prebookTotalRupees * 0.25);
    prebookAdvanceP = toPaise(advRupees);
    prebookBalanceP = Math.max(0, prebookTotalP - prebookAdvanceP);
  }

  const normalChild: SplitChildTotals | null = hasNormal
    ? {
        subtotal: toRupees(normalSubP),
        discount: toRupees(normalCouponP),
        swadCoinDiscount: toRupees(normalCoinsP),
        packagingFee: toRupees(normalPkgP),
        deliveryFee: toRupees(normalDeliveryP),
        gst: toRupees(normalGstP),
        total: toRupees(normalTotalP),
        advanceAmount: toRupees(normalTotalP),
        balanceAmount: 0,
        paymentPlan: 'full',
      }
    : null;

  const prebookChild: SplitChildTotals | null = hasPrebook
    ? {
        subtotal: toRupees(prebookSubP),
        discount: toRupees(prebookCouponP),
        swadCoinDiscount: toRupees(prebookCoinsP),
        packagingFee: toRupees(prebookPkgP),
        deliveryFee: toRupees(prebookDeliveryP),
        gst: toRupees(prebookGstP),
        total: toRupees(prebookTotalP),
        advanceAmount: toRupees(prebookAdvanceP),
        balanceAmount: toRupees(prebookBalanceP),
        paymentPlan: prebookPlan,
      }
    : null;

  const amountDueNowP = (hasNormal ? normalTotalP : 0) + (hasPrebook ? prebookAdvanceP : 0);
  const balanceDueP = hasPrebook ? prebookBalanceP : 0;
  const grandTotalP = normalTotalP + prebookTotalP;

  return {
    orderMode,
    normalItems,
    prebookItems,
    hasNormal,
    hasPrebook,
    isMixed,
    normalSubtotal: toRupees(normalSubP),
    prebookSubtotal: toRupees(prebookSubP),
    combinedSubtotal: toRupees(combinedSubP),
    totalCouponDiscount: toRupees(totalCouponP),
    totalSwadCoinDiscount: toRupees(totalCoinsP),
    totalPackagingFee: toRupees(totalPkgP),
    totalDeliveryFee: toRupees(totalDeliveryP),
    totalGst: toRupees(normalGstP + prebookGstP),
    grandTotal: toRupees(grandTotalP),
    prebookPaymentPlan: prebookPlan,
    amountDueNow: toRupees(amountDueNowP),
    balanceDue: toRupees(balanceDueP),
    normalChild,
    prebookChild,
  };
}
