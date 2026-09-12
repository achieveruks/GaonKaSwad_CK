import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Gift,
  Sparkles,
  Coins,
  Clock,
  ShieldCheck,
  PartyPopper,
  CheckCircle2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import {
  SwadCoinRewardItem,
  fetchVaultRewards,
  claimPendingReward,
} from '../../lib/swadCoinService';

interface SwadSurpriseModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerPhone: string;
  customerId?: string;
  pendingRewards: SwadCoinRewardItem[];
  onRewardClaimed: (rewardId: string, claimedAmount: number, newBalance: number) => void;
  currentBalance: number;
}

export const SwadSurpriseModal: React.FC<SwadSurpriseModalProps> = ({
  isOpen,
  onClose,
  customerPhone,
  customerId,
  pendingRewards: initialPendingRewards,
  onRewardClaimed,
  currentBalance,
}) => {
  const [cards, setCards] = useState<SwadCoinRewardItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sessionBalance, setSessionBalance] = useState<number>(currentBalance);

  // Per-card tracking:
  // revealingCardId: currently calling claim API
  // revealedCards: { [cardId]: { amount: number, removing: boolean } }
  const [revealingCardId, setRevealingCardId] = useState<string | null>(null);
  const [revealedCards, setRevealedCards] = useState<Record<string, { amount: number; removing: boolean }>>({});
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setSessionBalance(currentBalance);
  }, [currentBalance]);

  // Load only pending surprise cards
  const loadPendingCards = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchVaultRewards(customerPhone, customerId);
      if (res && Array.isArray(res.pendingRewards)) {
        setCards(res.pendingRewards);
      } else if (initialPendingRewards.length > 0) {
        setCards(initialPendingRewards.filter((r) => r.status === 'PENDING'));
      } else {
        setCards([]);
      }
    } catch (err) {
      console.warn('Error loading surprise cards:', err);
      if (initialPendingRewards.length > 0) {
        setCards(initialPendingRewards.filter((r) => r.status === 'PENDING'));
      }
    } finally {
      setIsLoading(false);
    }
  }, [customerPhone, customerId, initialPendingRewards]);

  useEffect(() => {
    if (isOpen) {
      setRevealingCardId(null);
      setRevealedCards({});
      setCardErrors({});
      loadPendingCards();
    }
  }, [isOpen, loadPendingCards]);

  if (!isOpen) return null;

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.55 },
        colors: ['#f59e0b', '#d97706', '#fbbf24', '#10b981', '#ffffff'],
      });
    } catch {
      // non-blocking
    }
  };

  const handleRevealCard = async (card: SwadCoinRewardItem) => {
    if (revealingCardId || revealedCards[card.id]) return;

    setRevealingCardId(card.id);
    setCardErrors((prev) => ({ ...prev, [card.id]: '' }));

    try {
      const res = await claimPendingReward(card.id, customerPhone, customerId);

      if (res.success) {
        const earned = res.claimedAmount ?? card.coinAmount;
        const newBal = res.newBalance ?? (sessionBalance + earned);

        setRevealingCardId(null);
        setSessionBalance(newBal);
        setRevealedCards((prev) => ({
          ...prev,
          [card.id]: { amount: earned, removing: false },
        }));

        triggerConfetti();

        // Show "Swad Coins credited to your Wallet!" on the card, wait exactly 1 second, then vanish smoothly
        setTimeout(() => {
          // Trigger smooth fade-out / shrink animation
          setRevealedCards((prev) => ({
            ...prev,
            [card.id]: { amount: earned, removing: true },
          }));

          // After exit animation finishes, remove from modal cards and notify parent
          setTimeout(() => {
            setCards((prev) => prev.filter((c) => c.id !== card.id));
            onRewardClaimed(card.id, earned, newBal);
          }, 400);
        }, 1000);
      } else {
        setRevealingCardId(null);
        setCardErrors((prev) => ({
          ...prev,
          [card.id]: res.error || 'Could not reveal card. Please try again.',
        }));
      }
    } catch (err: any) {
      setRevealingCardId(null);
      setCardErrors((prev) => ({
        ...prev,
        [card.id]: err.message || 'Connection issue while revealing.',
      }));
    }
  };

  return (
    <div
      id="modal-swad-vault-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="modal-swad-vault-card"
        className="bg-[#18110a] rounded-3xl max-w-lg w-full border border-amber-500/35 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] relative text-stone-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient background glows */}
        <div className="absolute -right-20 -top-20 w-60 h-60 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-60 h-60 rounded-full bg-orange-600/15 blur-3xl pointer-events-none" />

        {/* Modal Top Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-white/10 relative z-10 bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500/30 via-amber-400/20 to-yellow-500/30 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-inner">
              <Gift className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-wide text-amber-200 font-heading">
                Swad Coin Cards &amp; Surprise Vault
              </h3>
              <p className="text-xs text-amber-100/70">
                Exclusive order cash-back cards &amp; surprise gifts
              </p>
            </div>
          </div>

          <button
            id="btn-close-vault-modal"
            type="button"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Wallet Balance Strip: "Swad Coins: % coins" */}
        <div className="px-5 py-2.5 bg-gradient-to-r from-amber-950/60 via-stone-900/80 to-amber-950/60 border-b border-white/5 flex items-center justify-between text-xs relative z-10">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="text-stone-300 font-medium">Swad Coins:</span>
            <span className="font-extrabold text-amber-300 font-mono text-sm">
              {sessionBalance} coins
            </span>
          </div>

          <div className="text-[11px] text-stone-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>100-Day Validity</span>
          </div>
        </div>

        {/* Rectangular Cards Grid: 2 cards in a row */}
        <div className="p-5 overflow-y-auto flex-1 relative z-10 min-h-[260px]">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {[1, 2].map((n) => (
                <div
                  key={n}
                  className="h-48 rounded-2xl bg-white/5 border border-white/10 animate-pulse"
                />
              ))}
            </div>
          ) : cards.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <AnimatePresence>
                {cards.map((card) => {
                  const isRevealing = revealingCardId === card.id;
                  const revealedInfo = revealedCards[card.id];
                  const isRemoving = revealedInfo?.removing;

                  return (
                    <motion.div
                      key={card.id}
                      id={`vault-card-${card.id}`}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: isRemoving ? 0 : 1, scale: isRemoving ? 0.85 : 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.3 }}
                      className="relative"
                    >
                      {revealedInfo ? (
                        /* ==========================================================
                           REVEALED CONFIRMATION CARD (brief display before removal)
                           ========================================================== */
                        <div className="rounded-2xl p-5 border-2 border-emerald-400/60 bg-gradient-to-br from-stone-900 via-emerald-950/40 to-stone-900 text-center flex flex-col items-center justify-center min-h-[190px] shadow-xl">
                          <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center mb-3 animate-bounce">
                            <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                          </div>
                          <span className="text-xl font-black font-heading text-amber-300 mb-1">
                            +{revealedInfo.amount} Coins
                          </span>
                          <p className="text-xs font-bold text-emerald-300 leading-tight">
                            Swad Coins credited to your Wallet!
                          </p>
                        </div>
                      ) : (
                        /* ==========================================================
                           RECTANGULAR SURPRISE CARD (2 IN A ROW)
                           ========================================================== */
                        <div
                          onClick={() => handleRevealCard(card)}
                          className={`rounded-2xl p-5 border-2 transition-all flex flex-col items-center justify-between text-center select-none cursor-pointer group shadow-lg min-h-[190px] relative overflow-hidden ${
                            isRevealing
                              ? 'bg-gradient-to-b from-amber-900 via-stone-900 to-black border-amber-300 scale-[0.98]'
                              : 'bg-gradient-to-b from-amber-900/70 via-stone-900 to-black hover:from-amber-850 hover:to-stone-900 border-amber-400/50 hover:border-amber-300 hover:shadow-amber-500/20'
                          }`}
                        >
                          {/* Shimmer sweep */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-300/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />

                          {/* Image / Jumping Gift Icon */}
                          <div className="relative mt-1">
                            <div className="absolute inset-0 bg-amber-400/30 rounded-2xl blur-md group-hover:bg-amber-400/50 transition-all" />
                            <div
                              className={`w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 text-stone-950 flex items-center justify-center shadow-md relative ${
                                isRevealing
                                  ? 'animate-spin'
                                  : 'group-hover:scale-110 group-hover:rotate-3 transition-transform animate-pulse'
                              }`}
                            >
                              <Gift className="w-7 h-7 stroke-[2]" />
                            </div>
                          </div>

                          {/* SWAD SURPRISE Label */}
                          <div className="my-2">
                            <h4 className="text-xs font-black tracking-widest text-amber-200 uppercase font-heading">
                              SWAD SURPRISE
                            </h4>
                          </div>

                          {/* Action: Tap to Reveal Button */}
                          <button
                            id={`btn-reveal-card-${card.id}`}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRevealCard(card);
                            }}
                            disabled={isRevealing}
                            className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-stone-950 font-black text-xs shadow-md transition-all transform group-hover:scale-102 active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{isRevealing ? 'Revealing...' : 'Tap to Reveal'}</span>
                          </button>

                          {cardErrors[card.id] && (
                            <p className="text-[10px] font-bold text-rose-400 mt-1.5">
                              {cardErrors[card.id]}
                            </p>
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          ) : (
            /* ==========================================================
               EMPTY STATE: All surprises opened
               ========================================================== */
            <div className="text-center py-10 px-4 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-400/30 text-amber-300 mx-auto flex items-center justify-center">
                <PartyPopper className="w-7 h-7" />
              </div>
              <div className="space-y-1 max-w-xs mx-auto">
                <h4 className="text-sm font-black text-amber-200 font-heading">
                  All Surprises Opened!
                </h4>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Your Swad Coins are credited to your active wallet balance. You can redeem them on your next food order!
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold border border-stone-700 transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer (Kept as is) */}
        <div className="px-5 py-3 bg-black/60 border-t border-white/10 flex items-center justify-between text-[11px] text-stone-400 relative z-10">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>1 Swad Coin = ₹1 Direct Cash Discount</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Up to 10% on food bill</span>
          </div>
        </div>
      </div>
    </div>
  );
};
