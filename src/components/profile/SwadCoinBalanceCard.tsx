import React, { useState, useEffect, useCallback } from 'react';
import {
  Coins,
  Sparkles,
  Gift,
  RefreshCw,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Info,
  ArrowRight,
  Sparkle,
} from 'lucide-react';
import {
  fetchSwadCoinBalance,
  fetchPendingRewards,
  SwadCoinRewardItem,
} from '../../lib/swadCoinService';
import { SwadSurpriseModal } from './SwadSurpriseModal';

interface SwadCoinBalanceCardProps {
  customerPhone: string;
  customerId?: string;
  onBalanceUpdate?: (newBalance: number) => void;
}

export const SwadCoinBalanceCard: React.FC<SwadCoinBalanceCardProps> = ({
  customerPhone,
  customerId,
  onBalanceUpdate,
}) => {
  const [balance, setBalance] = useState<number>(0);
  const [pendingRewards, setPendingRewards] = useState<SwadCoinRewardItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [showInfo, setShowInfo] = useState<boolean>(false);
  const [isSurpriseModalOpen, setIsSurpriseModalOpen] = useState<boolean>(false);

  const loadData = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    try {
      const [b, rewards] = await Promise.all([
        fetchSwadCoinBalance(customerPhone, customerId),
        fetchPendingRewards(customerPhone, customerId),
      ]);
      setBalance(b);
      setPendingRewards(rewards);
      if (onBalanceUpdate) onBalanceUpdate(b);
    } catch (err) {
      console.warn('Error loading Swad Coin data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [customerPhone, customerId, onBalanceUpdate]);

  useEffect(() => {
    if (customerPhone || customerId) {
      loadData();
    }
  }, [customerPhone, customerId, loadData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData(true);
  };

  const handleRewardClaimed = (rewardId: string, claimedAmount: number, newBalance: number) => {
    // 1. Instantly remove claimed reward from pending rewards so the card disappears from Profile
    setPendingRewards((prev) => prev.filter((r) => r.id !== rewardId));
    // 2. Update the balance
    setBalance(newBalance);
    if (onBalanceUpdate) onBalanceUpdate(newBalance);
  };

  return (
    <>
      <div className="rounded-3xl border border-amber-200/90 shadow-sm overflow-hidden bg-gradient-to-br from-amber-900 via-amber-950 to-stone-950 text-white relative">
        {/* Background Decorative Accents */}
        <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-44 h-44 rounded-full bg-amber-600/10 blur-2xl pointer-events-none" />

        {/* Main Content Area */}
        <div className="relative p-6 space-y-5">
          {/* Card Top Row: Label & Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-400/30">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>Swad Coins Loyalty Wallet</span>
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowInfo(!showInfo)}
                className="p-1.5 text-amber-200/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                title="How Swad Coins work"
              >
                <Info className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing || isLoading}
                className="p-1.5 text-amber-200/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                title="Refresh Coin Balance"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Balance Display Block */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-1 pb-2 border-b border-white/10">
            <div>
              <p className="text-xs font-semibold text-amber-200/80 uppercase tracking-wider">
                Available Coin Balance
              </p>
              <div className="flex items-baseline gap-2.5 mt-1">
                {isLoading ? (
                  <div className="h-10 w-32 bg-white/10 animate-pulse rounded-xl" />
                ) : (
                  <>
                    <span className="text-3xl sm:text-4xl font-black font-heading text-amber-300 tracking-tight">
                      {balance}
                    </span>
                    <span className="text-sm font-bold text-amber-100/90">
                      Swad Coins
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="sm:text-right">
              <span className="inline-block px-3 py-1 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold rounded-xl shadow-2xs">
                ≈ ₹{balance} Savings Value
              </span>
              <p className="text-[11px] text-amber-200/70 mt-1">
                1 Coin = ₹1 Cash Discount
              </p>
            </div>
          </div>

          {/* Value Chips: Adjusted with flexible width so full text displays */}
          <div className="flex items-center gap-2 text-[11px] text-amber-100/90">
            <div className="flex-1 min-w-0 flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate sm:whitespace-normal">Redeem up to 10% on food bill</span>
            </div>
            <div className="shrink-0 flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="whitespace-nowrap">100-Day Expiry</span>
            </div>
          </div>

          {/* Info Box (Toggleable) */}
          {showInfo && (
            <div className="p-3.5 rounded-2xl bg-black/40 border border-amber-500/30 text-xs text-amber-100/90 space-y-1.5 animate-in fade-in duration-200">
              <p className="font-bold text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                How to Earn &amp; Spend Swad Coins:
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-200/80">
                <li><strong>A surprise in every Card:</strong> Collect bonus Swad coins automatically after every delivery.</li>
                <li><strong>Checkout Savings:</strong> Apply your coins directly on the cart or checkout page to reduce your total food bill.</li>
                <li><strong>100 Days to Enjoy:</strong> Coins remain active for a full 100 days from the reward creation date.</li>
              </ul>
            </div>
          )}

          {/* ONE-LINER CLICKABLE SWAD SURPRISE BANNER */}
          {pendingRewards.length > 0 && (
            <button
              id="btn-swad-surprises-trigger"
              type="button"
              onClick={() => setIsSurpriseModalOpen(true)}
              className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/25 via-orange-500/20 to-amber-600/25 hover:from-amber-500/35 hover:via-orange-500/30 hover:to-amber-600/35 border-2 border-amber-400/50 hover:border-amber-300 shadow-md transition-all text-left cursor-pointer group relative overflow-hidden"
            >
              {/* Subtle shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-300/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />

              <div className="flex items-center justify-between gap-3 relative z-10">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Jumping/bouncing gift icon */}
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 via-amber-300 to-yellow-400 text-stone-950 flex items-center justify-center shadow-md shrink-0 animate-bounce">
                    <Gift className="w-5 h-5 stroke-[2.2]" />
                  </div>

                  <div className="min-w-0">
                    {/* Top line: {n} Swad Surprises waiting! */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-black font-heading text-amber-200 group-hover:text-amber-100 transition-colors">
                        {pendingRewards.length === 1
                          ? '1 Swad Surprise waiting!'
                          : `${pendingRewards.length} Swad Surprises waiting!`}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400 text-stone-950 shadow-xs animate-pulse">
                        NEW
                      </span>
                    </div>

                    {/* Bottom line: Tap to unlock your surprise loyalty rewards */}
                    <p className="text-xs text-amber-100/80 group-hover:text-amber-100 transition-colors mt-0.5 font-medium">
                      Tap to unlock your surprise loyalty rewards
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-amber-300/80 group-hover:text-amber-200 group-hover:translate-x-1 transition-all">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Swad Surprise Reveal Modal */}
      <SwadSurpriseModal
        isOpen={isSurpriseModalOpen}
        onClose={() => setIsSurpriseModalOpen(false)}
        customerPhone={customerPhone}
        customerId={customerId}
        pendingRewards={pendingRewards}
        onRewardClaimed={handleRewardClaimed}
        currentBalance={balance}
      />
    </>
  );
};

