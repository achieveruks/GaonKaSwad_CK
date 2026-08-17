import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Search, CheckCircle2, AlertTriangle, X, ArrowRight, Store, ShieldCheck, Sparkles } from 'lucide-react';
import { useLocation } from '../context/LocationContext';
import { useCart } from '../context/CartContext';
import { checkPinCodeOnline } from '../lib/locationService';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LocationModal: React.FC<LocationModalProps> = ({ isOpen, onClose }) => {
  const {
    selectedLocation,
    outlets,
    requestLocationChange,
    allDeliveryZones,
  } = useLocation();
  const { cart } = useCart();

  const [pinInput, setPinInput] = useState(selectedLocation?.pinCode || '');
  const [isChecking, setIsChecking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    outlet: any;
    zone: any;
    pinCode: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleVerifyPin = async (pinToTest?: string) => {
    const pin = (pinToTest || pinInput).trim();
    setErrorMsg(null);
    setSuccessInfo(null);

    if (!/^\d{6}$/.test(pin)) {
      setErrorMsg('Please enter a valid 6-digit Indian PIN code (e.g. 560102 or 751024)');
      return;
    }

    setIsChecking(true);
    try {
      const result = await checkPinCodeOnline(pin);
      if (result.available && result.outlet && result.zone) {
        setSuccessInfo({
          outlet: result.outlet,
          zone: result.zone,
          pinCode: pin,
        });
      } else {
        setErrorMsg(
          result.error ||
            `Delivery is currently not available for PIN ${pin}. We are adding new cloud kitchen locations soon!`
        );
      }
    } catch (err: any) {
      setErrorMsg('Unable to check delivery zone right now. Please try again.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleApplyLocation = () => {
    if (!successInfo) return;
    const hasItems = cart.length > 0;
    requestLocationChange(
      successInfo.pinCode,
      successInfo.outlet,
      successInfo.zone,
      hasItems,
      () => {
        onClose();
      }
    );
  };

  const popularPins = [
    { pin: '560102', area: 'HSR Layout, Bangalore', outlet: 'Bangalore - HSR Sector 2' },
    { pin: '560034', area: 'Koramangala, Bangalore', outlet: 'Bangalore - HSR Sector 2' },
    { pin: '560038', area: 'Indiranagar, Bangalore', outlet: 'Bangalore - Indiranagar 100ft' },
    { pin: '560035', area: 'Sarjapur Road, Bangalore', outlet: 'Bangalore - Sarjapur Main Rd' },
    { pin: '751024', area: 'Patia / KIIT, Bhubaneswar', outlet: 'Bhubaneswar - Patia Infocity' },
    { pin: '751007', area: 'Saheed Nagar, Bhubaneswar', outlet: 'Bhubaneswar - Saheed Nagar' },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', duration: 0.4 }}
          className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden z-10 border border-stone-100"
        >
          {/* Top Banner Accent */}
          <div className="bg-gradient-to-r from-amber-700 via-amber-800 to-stone-900 px-6 py-6 text-white relative">
            <button
              onClick={onClose}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-200 text-xs font-medium mb-2 border border-amber-400/30">
              <MapPin className="w-3.5 h-3.5" />
              Kitchen Outlet Routing
            </div>
            <h3 className="text-xl font-serif font-bold text-amber-50">
              Select Delivery Location
            </h3>
            <p className="text-stone-300 text-xs mt-1 leading-relaxed">
              Enter your 6-digit delivery PIN code to route your order to the nearest Gaon Ka Swad kitchen.
            </p>
          </div>

          <div className="p-6 space-y-5">
            {/* PIN Input Group */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Delivery PIN Code
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <MapPin className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    maxLength={6}
                    value={pinInput}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setPinInput(val);
                      setErrorMsg(null);
                      setSuccessInfo(null);
                    }}
                    placeholder="Enter 6-digit PIN (e.g. 560102)"
                    className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 text-sm font-semibold tracking-wider placeholder:font-normal placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleVerifyPin();
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleVerifyPin()}
                  disabled={isChecking || pinInput.length !== 6}
                  className="px-5 py-3 bg-amber-800 hover:bg-amber-900 disabled:bg-stone-300 text-white font-medium text-sm rounded-xl transition-all shadow-sm flex items-center gap-2"
                >
                  {isChecking ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>Check</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Error State */}
            {errorMsg && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-xs text-red-700">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-800">Delivery Unavailable</p>
                  <p className="mt-0.5 leading-relaxed">{errorMsg}</p>
                </div>
              </div>
            )}

            {/* Success State */}
            {successInfo && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-3"
              >
                <div className="flex items-center gap-2.5 text-emerald-800 font-semibold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <span>Delivering to PIN {successInfo.pinCode}!</span>
                </div>

                <div className="bg-white p-3 rounded-lg border border-emerald-100 space-y-1.5 text-xs text-stone-700">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-stone-500">Assigned Kitchen:</span>
                    <span className="font-bold text-stone-900 flex items-center gap-1">
                      <Store className="w-3.5 h-3.5 text-amber-700" />
                      {successInfo.outlet.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-stone-500">City / State:</span>
                    <span className="text-stone-800">{successInfo.outlet.city}, {successInfo.outlet.state}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-stone-500">Delivery Fee:</span>
                    <span className="text-stone-800 font-medium">₹{successInfo.zone.deliveryFee}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-stone-500">Min. Order Value:</span>
                    <span className="text-stone-800 font-medium">₹{successInfo.zone.minimumOrderValue}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleApplyLocation}
                  className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <span>Confirm & Browse Kitchen Menu</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {/* Quick Demo PIN Shortcuts */}
            <div className="pt-2 border-t border-stone-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  Popular Delivery Areas
                </span>
                <span className="text-[11px] text-amber-800 font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Instant Quick-Fill
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {popularPins.map((item) => (
                  <button
                    key={item.pin}
                    type="button"
                    onClick={() => {
                      setPinInput(item.pin);
                      handleVerifyPin(item.pin);
                    }}
                    className="p-2.5 bg-stone-50 hover:bg-amber-50 hover:border-amber-300 border border-stone-200 rounded-xl text-left transition-all flex flex-col group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-900 group-hover:text-amber-900">
                        {item.pin}
                      </span>
                      <span className="text-[10px] text-stone-500 bg-stone-200/60 px-1.5 py-0.5 rounded group-hover:bg-amber-200/50">
                        {item.area.split(',')[0]}
                      </span>
                    </div>
                    <span className="text-[11px] text-stone-500 mt-1 line-clamp-1 group-hover:text-stone-700">
                      {item.outlet}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
