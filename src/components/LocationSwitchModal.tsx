import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, ArrowRight, Store, X, RefreshCw, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useLocation } from '../context/LocationContext';
import { useCart } from '../context/CartContext';

export const LocationSwitchModal: React.FC = () => {
  const {
    isSwitchConfirmOpen,
    pendingLocation,
    confirmLocationSwitch,
    cancelLocationSwitch,
    selectedLocation,
  } = useLocation();
  const { cart, adaptCartForNewOutlet, clearCart } = useCart();

  const currentOutletName = selectedLocation?.outletName || 'Current Kitchen';
  const newOutletName = pendingLocation?.outlet?.name || 'New Kitchen';
  const newOutletId = pendingLocation?.outlet?.id || '';

  // Smart preview of what will happen to the cart
  const cartPreview = React.useMemo(() => {
    if (!pendingLocation || !newOutletId) return { unAvailableCount: 0, availableCount: cart.length };
    
    let unAvailableCount = 0;
    let availableCount = 0;

    for (const item of cart) {
      const prod = item.product;
      const isServed = prod.outlets?.some((o) => o.outletId === newOutletId) ||
        prod.outletIds?.includes(newOutletId) ||
        (!prod.outlets?.length && !prod.outletIds?.length);
      
      const config = prod.outlets?.find((o) => o.outletId === newOutletId);
      const isSoldOut = config?.inStock === false || config?.portionsLeft === 0;

      if (!isServed || isSoldOut) {
        unAvailableCount += item.quantity;
      } else {
        availableCount += item.quantity;
      }
    }

    return { unAvailableCount, availableCount };
  }, [pendingLocation, newOutletId, cart]);

  const handleSmartSwitch = () => {
    confirmLocationSwitch(() => {
      if (newOutletId) {
        adaptCartForNewOutlet(newOutletId, newOutletName);
      }
    });
  };

  const handleClearAndSwitch = () => {
    confirmLocationSwitch(() => {
      clearCart();
    });
  };

  return (
    <AnimatePresence>
      {isSwitchConfirmOpen && pendingLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-stone-900/70 backdrop-blur-sm"
            onClick={cancelLocationSwitch}
          />

          {/* Dialog Window */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.35 }}
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden z-10 border border-stone-100 p-6 space-y-5"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0">
                <Store className="w-6 h-6 text-amber-800" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-serif font-bold text-stone-900">
                  Switch Kitchen Outlet?
                </h3>
                <p className="text-stone-600 text-xs mt-1 leading-relaxed">
                  Your delivery address or PIN requires routing to <strong className="text-stone-900">{newOutletName}</strong>.
                </p>
              </div>
              <button
                onClick={cancelLocationSwitch}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Routing Comparison Card */}
            <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-700 space-y-2">
              <div className="flex items-center justify-between text-stone-500">
                <span>Current Kitchen:</span>
                <span className="font-semibold text-stone-800">{currentOutletName}</span>
              </div>
              <div className="flex items-center justify-between text-amber-900">
                <span>New Kitchen:</span>
                <span className="font-bold flex items-center gap-1">
                  <Store className="w-3.5 h-3.5" />
                  {newOutletName} (PIN {pendingLocation.pinCode})
                </span>
              </div>
            </div>

            {/* Cart Safety Check Summary */}
            <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/70 text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <RefreshCw className="w-4 h-4 text-amber-800 shrink-0" />
                <span>Automatic Cart Compatibility Check</span>
              </div>
              <p className="text-stone-600 text-[11px] leading-relaxed">
                We will preserve all items that are available at the new kitchen. Any unavailable dish will be safely removed and portions will be synced automatically.
              </p>
              {cartPreview.unAvailableCount > 0 ? (
                <div className="pt-1.5 border-t border-amber-200/80 flex items-center gap-1.5 text-amber-950 font-medium text-[11px]">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>
                    Note: Approximately {cartPreview.unAvailableCount} item(s) are not available at {newOutletName} and will be removed.
                  </span>
                </div>
              ) : (
                <div className="pt-1.5 border-t border-emerald-200 flex items-center gap-1.5 text-emerald-800 font-semibold text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Great news! All items in your cart are available at {newOutletName}.</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={cancelLocationSwitch}
                className="py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium text-xs rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAndSwitch}
                className="py-2.5 px-3 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 font-medium text-xs rounded-xl transition-all"
              >
                Clear Cart & Switch
              </button>
              <button
                type="button"
                onClick={handleSmartSwitch}
                className="flex-1 py-2.5 px-4 bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                <span>Switch & Keep Available Items</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

