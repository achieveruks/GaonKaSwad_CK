/**
 * Swad Coins Loyalty Client Service
 * Connects customer frontend to Swad Coin balance, pending rewards, and claims.
 */

export interface SwadCoinRewardItem {
  id: string;
  orderId?: string;
  coinAmount: number;
  status: 'PENDING' | 'CLAIMED' | 'EXPIRED';
  expiresAt: string;
  claimedAt?: string;
  createdAt: string;
}

export interface SwadCoinTransactionItem {
  id: string;
  type: 'EARN' | 'REDEEM' | 'MANUAL_CREDIT' | 'MANUAL_DEBIT' | 'EXPIRE';
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
}

export interface SwadCoinVaultResult {
  cards: SwadCoinRewardItem[];
  pendingRewards: SwadCoinRewardItem[];
  claimedRewards: SwadCoinRewardItem[];
  totalCards: number;
}

export async function fetchVaultRewards(_phone?: string, _customerId?: string): Promise<SwadCoinVaultResult> {
  try {
    const res = await fetch('/api/swad-coins/rewards/vault', {
      credentials: 'same-origin',
    });
    if (!res.ok) return { cards: [], pendingRewards: [], claimedRewards: [], totalCards: 0 };
    const data = await res.json();
    if (data.success) {
      return {
        cards: Array.isArray(data.cards) ? data.cards : [],
        pendingRewards: Array.isArray(data.pendingRewards) ? data.pendingRewards : [],
        claimedRewards: Array.isArray(data.claimedRewards) ? data.claimedRewards : [],
        totalCards: Number(data.totalCards) || 0,
      };
    }
    return { cards: [], pendingRewards: [], claimedRewards: [], totalCards: 0 };
  } catch (err) {
    console.warn('Failed to fetch Swad Coin vault cards:', err);
    return { cards: [], pendingRewards: [], claimedRewards: [], totalCards: 0 };
  }
}

export async function fetchSwadCoinBalance(_phone?: string, _customerId?: string): Promise<number> {
  try {
    const res = await fetch('/api/swad-coins/balance', {
      credentials: 'same-origin',
    });
    if (!res.ok) return 0;
    const data = await res.json();
    if (data.success && typeof data.balance === 'number') {
      return data.balance;
    }
    return 0;
  } catch (err) {
    console.warn('Failed to fetch Swad Coin balance:', err);
    return 0;
  }
}

export async function fetchPendingRewards(_phone?: string, _customerId?: string): Promise<SwadCoinRewardItem[]> {
  try {
    const res = await fetch('/api/swad-coins/rewards/pending', {
      credentials: 'same-origin',
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (data.success && Array.isArray(data.rewards)) {
      return data.rewards;
    }
    return [];
  } catch (err) {
    console.warn('Failed to fetch pending Swad Coin rewards:', err);
    return [];
  }
}

export async function claimPendingReward(
  rewardId: string,
  _phone?: string,
  _customerId?: string
): Promise<{ success: boolean; message?: string; claimedAmount?: number; newBalance?: number; error?: string }> {
  try {
    const res = await fetch(`/api/swad-coins/rewards/${encodeURIComponent(rewardId)}/claim`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to claim reward.' };
    }

    return {
      success: true,
      message: data.message || 'Reward claimed successfully!',
      claimedAmount: data.claimedAmount,
      newBalance: data.newBalance,
    };
  } catch (err: any) {
    console.error('Error claiming Swad Coin reward:', err);
    return { success: false, error: err.message || 'Network error while claiming reward.' };
  }
}

export async function fetchSwadCoinTransactions(_phone?: string, _customerId?: string): Promise<SwadCoinTransactionItem[]> {
  try {
    const res = await fetch('/api/swad-coins/transactions', {
      credentials: 'same-origin',
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (data.success && Array.isArray(data.transactions)) {
      return data.transactions;
    }
    return [];
  } catch (err) {
    console.warn('Failed to fetch Swad Coin transactions:', err);
    return [];
  }
}
