import React, { useState } from 'react';
import {
  X,
  Star,
  CheckCircle2,
  AlertCircle,
  Loader2,
  UtensilsCrossed,
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
  const { customer, submitVerifiedReview } = useCustomer();
  const [selectedItem, setSelectedItem] = useState<any>(
    order.items?.[0] || null
  );
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedItemIds, setSubmittedItemIds] = useState<Set<string | number>>(
    new Set()
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    if (rating < 1 || rating > 5) {
      setError('Please select a star rating between 1 and 5.');
      return;
    }
    if (!comment.trim() || comment.trim().length < 5) {
      setError('Please write at least a brief comment about the dish (minimum 5 characters).');
      return;
    }

    setSubmitting(true);
    setError(null);

    const itemId = selectedItem.productId || selectedItem.id || selectedItem.product?.id || 'dish-item';
    const itemName = selectedItem.name || selectedItem.product?.name || 'Authentic Dish';

    try {
      const res = await submitVerifiedReview({
        productId: itemId,
        userName: customer?.name || (order as any).customerDetails?.name || 'Verified Customer',
        userLocation:
          (order as any).deliveryAddressSnapshot?.city ||
          customer?.city ||
          'Gaon Ka Swad Gourmet',
        rating,
        comment: comment.trim(),
        phone: customer?.phone || (order as any).customerDetails?.phone,
        customerId: customer?.id || (order as any).customer_id,
        orderId: order.orderId || order.id,
      });

      if (!res.success) {
        setError(res.error || 'Failed to submit review. Please try again.');
      } else {
        const nextSet = new Set(submittedItemIds);
        nextSet.add(itemId);
        setSubmittedItemIds(nextSet);
        setSuccessMessage(`Thank you! Your verified review for ${itemName} has been published.`);
        setComment('');
        
        // Find next unrated item if any
        const nextUnrated = order.items.find(
          (itm: any) => !nextSet.has(itm.productId || itm.id || itm.product?.id)
        );
        if (nextUnrated) {
          setTimeout(() => {
            setSelectedItem(nextUnrated);
            setSuccessMessage(null);
            setRating(5);
          }, 1800);
        } else {
          if (onSuccess) onSuccess();
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

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
              <h3 className="font-serif font-bold text-lg text-amber-100">Rate Your Experience</h3>
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

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Select item if order has multiple */}
          {order.items && order.items.length > 1 && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
                Select Dish to Review
              </label>
              <div className="flex flex-wrap gap-2">
                {order.items.map((item: any, idx) => {
                  const itemId = item.productId || item.id || item.product?.id || idx;
                  const isSelected =
                    ((selectedItem as any)?.productId || (selectedItem as any)?.id || (selectedItem as any)?.product?.id) === itemId;
                  const isReviewed = submittedItemIds.has(itemId);
                  const itemName = item.name || item.product?.name || 'Dish';

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedItem(item);
                        setError(null);
                        setSuccessMessage(null);
                      }}
                      className={`text-xs px-3 py-2 rounded-xl border font-medium flex items-center gap-1.5 transition-all ${
                        isSelected
                          ? 'border-amber-700 bg-amber-50 text-amber-900 font-semibold shadow-xs'
                          : isReviewed
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          : 'border-stone-200 bg-stone-50 text-stone-700 hover:border-stone-300'
                      }`}
                    >
                      {isReviewed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                      <span className="truncate max-w-[150px]">{itemName}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {selectedItem && (
            <div className="bg-stone-50 rounded-xl p-4 border border-stone-200/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                  <UtensilsCrossed className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-stone-900 text-sm">{selectedItem.name}</h4>
                  <p className="text-xs text-stone-500">
                    {selectedItem.variantName ? `${selectedItem.variantName} • ` : ''}₹{selectedItem.price} × {selectedItem.quantity}
                  </p>
                </div>
              </div>
              {submittedItemIds.has(selectedItem.productId || selectedItem.id) && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Reviewed
                </span>
              )}
            </div>
          )}

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

          {selectedItem && !submittedItemIds.has(selectedItem.productId || selectedItem.id) ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Star Rating */}
              <div className="text-center py-2">
                <label className="block text-xs font-semibold text-stone-600 mb-2">
                  How would you rate the authentic taste and quality?
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
                        className="p-1.5 focus:outline-none transition-transform hover:scale-110"
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
                <p className="text-xs text-stone-500 mt-1.5 font-medium">
                  {rating === 5 && '🌟 Exceptional / Shahi Swad!'}
                  {rating === 4 && '👍 Delicious & Authentic'}
                  {rating === 3 && '👌 Good, satisfies craving'}
                  {rating === 2 && '👎 Needs improvement'}
                  {rating === 1 && '⚠️ Disappointed'}
                </p>
              </div>

              {/* Comment text */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Your Review / Taste Feedback
                </label>
                <textarea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Tell us about the aroma, traditional spices, portion size, and presentation..."
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-stone-900 placeholder:text-stone-400"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 transition-colors"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-amber-700 to-amber-800 text-white hover:from-amber-800 hover:to-amber-900 transition-all shadow-md shadow-amber-900/10 disabled:opacity-60 flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting...
                    </>
                  ) : (
                    'Submit Review'
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-stone-800">
                All feedback submitted for this item!
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-xs font-semibold bg-stone-900 text-white rounded-xl hover:bg-stone-800"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
