import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Trash2, ArrowRight, Store, X } from 'lucide-react';
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
  const { clearCart, cart } = useCart();

  const currentOutletName = selectedLocation?.outletName || 'Current Kitchen';
  const newOutletName = pendingLocation?.outlet?.name || 'New Kitchen';

  const handleConfirm = () => {
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
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden z-10 border border-stone-100 p-6 space-y-5"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-amber-700" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-serif font-bold text-stone-900">
                  Change Kitchen Outlet?
                </h3>
                <p className="text-stone-600 text-xs mt-1 leading-relaxed">
                  You have <strong className="text-stone-900">{cart.length} item{cart.length > 1 ? 's' : ''}</strong> in your cart from <span className="text-amber-800 font-semibold">{currentOutletName}</span>.
                </p>
              </div>
              <button
                onClick={cancelLocationSwitch}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-700 space-y-2">
              <div className="flex items-center justify-between text-stone-500">
                <span>Current Outlet:</span>
                <span className="font-semibold text-stone-800">{currentOutletName}</span>
              </div>
              <div className="flex items-center justify-between text-amber-900">
                <span>New Outlet:</span>
                <span className="font-bold flex items-center gap-1">
                  <Store className="w-3.5 h-3.5" />
                  {newOutletName} (PIN {pendingLocation.pinCode})
                </span>
              </div>
              <p className="text-[11px] text-stone-500 pt-1 border-t border-stone-200">
                Each order is prepared and dispatched from a single kitchen outlet to guarantee authentic clay pot freshness.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={cancelLocationSwitch}
                className="flex-1 py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium text-xs rounded-xl transition-all"
              >
                Keep Cart & Location
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 py-2.5 px-4 bg-amber-800 hover:bg-amber-900 text-white font-medium text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Change & Clear Cart</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
