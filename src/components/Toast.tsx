import React from 'react';
import { useCart } from '../context/CartContext';
import { CheckCircle2, Info, AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const Toast: React.FC = () => {
  const { toasts, removeToast } = useCart();

  return (
    <div
      id="toast-container"
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto bg-gray-900 text-white rounded-xl p-3 shadow-md border border-gray-800 flex items-start gap-2.5 backdrop-blur-md"
          >
            {toast.image ? (
              <img
                src={toast.image}
                alt={toast.title}
                className="w-10 h-10 rounded-lg object-cover shrink-0 border border-gray-700"
                referrerPolicy="no-referrer"
              />
            ) : toast.type === 'success' ? (
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            ) : toast.type === 'error' ? (
              <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
                <Info className="w-4 h-4" />
              </div>
            )}

            <div className="flex-1 min-w-0 pr-1">
              <p className="font-semibold text-gray-100 text-xs">{toast.title}</p>
              <p className="text-[11px] text-gray-300 line-clamp-2 mt-0.5">{toast.message}</p>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-gray-400 hover:text-white p-0.5 transition-colors rounded-md hover:bg-gray-800"
              aria-label="Close notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
