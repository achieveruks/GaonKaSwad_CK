import React, { useState, useEffect } from 'react';
import {
  X,
  Star,
  CheckCircle2,
  AlertCircle,
  Loader2,
  UtensilsCrossed,
  ShieldCheck,
  Clock,
  Edit3,
  Sparkles,
} from 'lucide-react';
import { Order } from '../../types';
import { useCustomer } from '../../context/CustomerContext';

interface OrderReviewModalProps {
  order: Order;
  onClose: () => void;
  onSuccess?: () => void;
}

export const OrderReviewModal: React.FC<OrderReviewModalProps> = ({
  order,
  onClose,
  onSuccess,
}) => {
  const { customer } = useCustomer();
  const [loadingEligible, setLoadingEligible] = useState(true);
  const [reviewData, setReviewData] = useState<any>(null);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number>(0);
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isEditingExisting, setIsEditingExisting] = useState<boolean>(false);

  // Load reviewable items from API
  const fetchReviewableItems = async (preserveIdx?: number) => {
    setLoadingEligible(true);
    setError(null);
    try {
      const orderIdentifier = order.orderId || order.id;
      const custId = customer?.id || (order as any).customer_id || '';
      const custPhone = customer?.phone || (order as any).customerDetails?.phone || '';
      
      const res = await fetch(
        `/api/orders/${encodeURIComponent(orderIdentifier)}/reviewable-items?customerId=${encodeURIComponent(
          custId
        )}&customerPhone=${encodeURIComponent(custPhone)}&_t=${Date.now()}`
      );
      const data = await res.json();
      if (data.success) {
        setReviewData(data);
        
        if (preserveIdx !== undefined && data.items && data.items[preserveIdx]) {
          setSelectedItemIndex(preserveIdx);
          const current = data.items[preserveIdx];
          if (current.reviewed) {
            setRating(current.rating || 5);
            setReviewText(current.reviewText || '');
          }
        } else {
          // Default to the first unreviewed item if available
          const firstUnreviewedIdx = data.items?.findIndex((it: any) => !it.reviewed);
          if (firstUnreviewedIdx !== -1 && firstUnreviewedIdx !== undefined) {
            setSelectedItemIndex(firstUnreviewedIdx);
            setRating(5);
            setReviewText('');
            setIsEditingExisting(false);
          } else if (data.items && data.items.length > 0) {
            setSelectedItemIndex(0);
            if (data.items[0].reviewed) {
              setRating(data.items[0].rating || 5);
              setReviewText(data.items[0].reviewText || '');
              setIsEditingExisting(false);
            }
          }
        }
      } else {
        setError(data.error || 'Failed to fetch reviewable dishes for this order.');
      }
    } catch (err: any) {
      console.warn('Reviewable items fetch error:', err);
      setError(err.message || 'Unable to check review status.');
    } finally {
      setLoadingEligible(false);
    }
  };

  useEffect(() => {
    fetchReviewableItems();
  }, [order.id, order.orderId]);

  const currentItem = reviewData?.items?.[selectedItemIndex];

  // Switch selected item
  const handleSelectItem = (idx: number) => {
    setSelectedItemIndex(idx);
    setError(null);
    setSuccessMessage(null);
    const item = reviewData?.items?.[idx];
    if (item?.reviewed) {
      setRating(item.rating || 5);
      setReviewText(item.reviewText || '');
      setIsEditingExisting(false);
    } else {
      setRating(5);
      setReviewText('');
      setIsEditingExisting(false);
    }
  };

  // Submit or update verified review
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentItem) return;

    if (rating < 1 || rating > 5) {
      setError('Please select a star rating between 1 and 5.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const custName = customer?.fullName || customer?.name || (order as any).customerDetails?.name || 'Verified Customer';
    const custPhone = customer?.phone || (order as any).customerDetails?.phone || '';
    const custId = customer?.id || (order as any).customer_id || undefined;

    try {
      if (currentItem.reviewed && currentItem.reviewId) {
        // Update existing review (within 7-day window)
        const res = await fetch(`/api/product-reviews/${encodeURIComponent(currentItem.reviewId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rating,
            reviewText: reviewText.trim(),
            customerId: custId,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to update review.');
        }
        setSuccessMessage(`Review updated successfully! Thank you for your feedback.`);
        setIsEditingExisting(false);
        await fetchReviewableItems(selectedItemIndex);
        if (onSuccess) onSuccess();
      } else {
        // Create new verified review
        const res = await fetch('/api/product-reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderItemId: currentItem.orderItemId,
            orderId: order.orderId || order.id,
            productId: currentItem.productId,
            rating,
            reviewText: reviewText.trim(),
            customerId: custId,
            customerName: custName,
            customerPhone: custPhone,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to submit review.');
        }

        setSuccessMessage(`Thank you! Your verified rating for ${currentItem.productName} has been submitted.`);
        await fetchReviewableItems();
        if (onSuccess) onSuccess();

        // Move to next unrated item if any
        if (reviewData?.items) {
          const nextUnreviewedIdx = reviewData.items.findIndex(
            (it: any, idx: number) => idx !== selectedItemIndex && !it.reviewed
          );
          if (nextUnreviewedIdx !== -1) {
            setTimeout(() => {
              handleSelectItem(nextUnreviewedIdx);
              setSuccessMessage(null);
            }, 1400);
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred while saving your review.');
    } finally {
      setSubmitting(false);
    }
  };

  const isOrderDelivered = reviewData ? reviewData.isDelivered : (order.orderStatus === 'delivered' || order.status === 'delivered');
  const isExpired = reviewData?.isExpired;
  const remainingDays = reviewData?.remainingDays ?? 7;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-amber-950 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-bold text-lg text-amber-100">
                  {isExpired ? 'Food Ratings & Reviews' : 'Rate Your Food'}
                </h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-400/20 text-amber-200 px-2 py-0.5 rounded-full border border-amber-400/30">
                  <ShieldCheck className="w-3 h-3 text-amber-300" /> Verified Purchase
                </span>
              </div>
              <p className="text-xs text-amber-200/80">Order #{order.orderId || order.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {loadingEligible ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-stone-500">
              <Loader2 className="w-6 h-6 animate-spin text-amber-700" />
              <p className="text-xs font-medium">Checking order delivery & review status...</p>
            </div>
          ) : !isOrderDelivered ? (
            /* Order Not Delivered Yet */
            <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
                <Clock className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-stone-900 text-sm">Rating Unlocks Upon Delivery</h4>
              <p className="text-xs text-stone-600 leading-relaxed max-w-sm mx-auto">
                To guarantee 100% verified authentic food reviews, dishes can be rated once your order has been safely delivered to your doorstep.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-xs font-semibold bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            /* Active 7-day verified rating flow OR Expired Read-Only View */
            <>
              {/* Top Countdown Banner (Only shown when window is still active) */}
              {!isExpired && (
                <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-xl flex items-center justify-between text-xs text-amber-950">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
                    <span className="font-semibold">
                      {reviewData?.isFullyReviewed
                        ? 'All dishes reviewed! You can edit anytime within the 7-day window.'
                        : `Verified Purchase: ${remainingDays} ${remainingDays === 1 ? 'day' : 'days'} left to rate`}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md shrink-0">
                    7-Day Window
                  </span>
                </div>
              )}

              {/* Dish Selector Tabs */}
              {reviewData?.items && reviewData.items.length > 1 && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-2">
                    Dishes in this Order
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {reviewData.items.map((item: any, idx: number) => {
                      const isSelected = selectedItemIndex === idx;
                      const isReviewed = item.reviewed;
                      return (
                        <button
                          key={item.orderItemId || idx}
                          type="button"
                          onClick={() => handleSelectItem(idx)}
                          className={`text-xs px-3 py-2 rounded-xl border font-medium flex items-center gap-1.5 transition-all ${
                            isSelected
                              ? 'border-amber-700 bg-amber-50 text-amber-950 font-bold shadow-xs'
                              : isReviewed
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-300'
                              : 'border-stone-200 bg-stone-50 text-stone-700 hover:border-stone-300'
                          }`}
                        >
                          {isReviewed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                          <span className="truncate max-w-[140px]">{item.productName}</span>
                          {isReviewed && (
                            <span className="inline-flex items-center text-[10px] text-amber-700 font-bold ml-0.5">
                              ★{item.rating}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Selected Dish Card */}
              {currentItem && (
                <div className="bg-stone-50 rounded-xl p-3.5 border border-stone-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                      <UtensilsCrossed className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-stone-900 text-sm">{currentItem.productName}</h4>
                      <p className="text-xs text-stone-500">
                        {currentItem.variantName ? `${currentItem.variantName} • ` : ''}Qty: {currentItem.quantity}
                      </p>
                    </div>
                  </div>
                  {currentItem.reviewed ? (
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Reviewed ({currentItem.rating}★)
                      </span>
                    </div>
                  ) : isExpired ? (
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-stone-500 bg-stone-200/80 px-2.5 py-1 rounded-full">
                        Not Rated
                      </span>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Feedback messages */}
              {successMessage && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{successMessage}</span>
                </div>
              )}

              {error && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              {/* Form or Read-Only State */}
              {isExpired ? (
                /* EXPIRED: Read-Only View of Dishes & Ratings */
                <div className="space-y-4">
                  {currentItem?.reviewed ? (
                    <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-5 h-5 ${
                                s <= (currentItem.rating || 5)
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-stone-300'
                              }`}
                            />
                          ))}
                          <span className="font-bold text-xs text-stone-800 ml-1.5">
                            {currentItem.rating} of 5 Stars
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/90 px-2.5 py-1 rounded-full">
                          Verified Rating
                        </span>
                      </div>

                      {currentItem.reviewText ? (
                        <p className="text-xs text-stone-700 bg-white p-3 rounded-xl border border-stone-200/80 italic leading-relaxed">
                          "{currentItem.reviewText}"
                        </p>
                      ) : (
                        <p className="text-xs text-stone-500 italic">No additional written text was submitted.</p>
                      )}
                    </div>
                  ) : (
                    /* Not reviewed before expiration */
                    <div className="p-5 bg-stone-50 border border-stone-200 rounded-2xl text-center space-y-2">
                      <div className="w-10 h-10 rounded-full bg-stone-200 text-stone-500 flex items-center justify-center mx-auto">
                        <Clock className="w-5 h-5" />
                      </div>
                      <h5 className="font-bold text-stone-800 text-xs">No Review Submitted</h5>
                      <p className="text-xs text-stone-500 max-w-xs mx-auto">
                        This dish was not rated during the active review window.
                      </p>
                    </div>
                  )}

                  {/* Expired notice banner placed strictly at the bottom */}
                  <div className="p-3.5 bg-stone-100/90 border border-stone-200 rounded-xl flex items-start gap-2.5 text-xs text-stone-600">
                    <Clock className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      Verified reviews can be submitted or edited within 7 days of delivery. The 7-day period for this order has now ended.
                    </p>
                  </div>

                  {/* Close button at the bottom */}
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-5 py-2 text-xs font-semibold bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : currentItem && (!currentItem.reviewed || isEditingExisting) ? (
                /* ACTIVE: Review / Edit Form */
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Star Rating */}
                  <div className="text-center py-2 bg-stone-50/50 rounded-xl border border-stone-100">
                    <label className="block text-xs font-semibold text-stone-700 mb-2">
                      How was the taste, aroma & quality of this dish?
                    </label>
                    <div className="flex items-center justify-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const isFilled = (hoverRating || rating) >= star;
                        return (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="p-1 focus:outline-none transition-transform hover:scale-115"
                          >
                            <Star
                              className={`w-8 h-8 ${
                                isFilled
                                  ? 'text-amber-400 fill-amber-400 drop-shadow-xs'
                                  : 'text-stone-300'
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-stone-600 mt-2 font-medium">
                      {rating === 5 && '🌟 5/5 — Shahi Swad / Exceptional'}
                      {rating === 4 && '👍 4/5 — Delicious & Authentic'}
                      {rating === 3 && '👌 3/5 — Good & Satisfying'}
                      {rating === 2 && '👎 2/5 — Needs Improvement'}
                      {rating === 1 && '⚠️ 1/5 — Not Satisfied'}
                    </p>
                  </div>

                  {/* Comment input */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-stone-700">
                        Taste Review / Feedback (Optional)
                      </label>
                      <span className="text-[10px] text-stone-400">
                        {reviewText.length}/500 chars
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      maxLength={500}
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      placeholder="Share what you loved about the spices, aroma, tenderness, and presentation..."
                      className="w-full px-3.5 py-2.5 text-xs bg-white border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-stone-900 placeholder:text-stone-400 leading-relaxed"
                    />
                  </div>

                  {/* Submit Actions */}
                  <div className="flex items-center justify-between gap-3 pt-2">
                    {currentItem.reviewed && isEditingExisting ? (
                      <button
                        type="button"
                        onClick={() => setIsEditingExisting(false)}
                        className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 transition-colors"
                      >
                        Cancel Edit
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 transition-colors"
                      >
                        Close
                      </button>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-amber-700 to-amber-800 text-white hover:from-amber-800 hover:to-amber-900 transition-all shadow-md shadow-amber-900/10 disabled:opacity-60 flex items-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                        </>
                      ) : currentItem.reviewed ? (
                        'Update Review'
                      ) : (
                        'Submit Verified Review'
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                /* ACTIVE: Already Reviewed State Display with Edit Button */
                <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-5 h-5 ${
                            s <= (currentItem.rating || 5)
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-stone-300'
                          }`}
                        />
                      ))}
                      <span className="font-bold text-xs text-stone-800 ml-1.5">
                        {currentItem.rating} of 5 Stars
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsEditingExisting(true)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-amber-900 bg-amber-100/80 hover:bg-amber-200/80 px-3 py-1.5 rounded-xl transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Edit Review
                    </button>
                  </div>

                  {currentItem.reviewText ? (
                    <p className="text-xs text-stone-700 bg-white p-3 rounded-xl border border-stone-200/80 italic leading-relaxed">
                      "{currentItem.reviewText}"
                    </p>
                  ) : (
                    <p className="text-xs text-stone-500 italic">No additional written text.</p>
                  )}

                  <div className="flex items-center justify-between pt-1 text-[11px] text-stone-500">
                    <span>Reviewed by you</span>
                    <button
                      type="button"
                      onClick={onClose}
                      className="font-semibold text-stone-700 hover:text-stone-900"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
