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

export async function fetchVaultRewards(phone: string, customerId?: string): Promise<SwadCoinVaultResult> {
  if (!phone && !customerId) {
    return { cards: [], pendingRewards: [], claimedRewards: [], totalCards: 0 };
  }
  try {
    const params = new URLSearchParams();
    if (phone) params.append('phone', phone);
    if (customerId) params.append('customerId', customerId);

    const res = await fetch(`/api/swad-coins/rewards/vault?${params.toString()}`);
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

export async function fetchSwadCoinBalance(phone: string, customerId?: string): Promise<number> {
  if (!phone && !customerId) return 0;
  try {
    const params = new URLSearchParams();
    if (phone) params.append('phone', phone);
    if (customerId) params.append('customerId', customerId);

    const res = await fetch(`/api/swad-coins/balance?${params.toString()}`);
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

export async function fetchPendingRewards(phone: string, customerId?: string): Promise<SwadCoinRewardItem[]> {
  if (!phone && !customerId) return [];
  try {
    const params = new URLSearchParams();
    if (phone) params.append('phone', phone);
    if (customerId) params.append('customerId', customerId);

    const res = await fetch(`/api/swad-coins/rewards/pending?${params.toString()}`);
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
  phone: string,
  customerId?: string
): Promise<{ success: boolean; message?: string; claimedAmount?: number; newBalance?: number; error?: string }> {
  try {
    const res = await fetch(`/api/swad-coins/rewards/${encodeURIComponent(rewardId)}/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone, customerId }),
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

export async function fetchSwadCoinTransactions(phone: string, customerId?: string): Promise<SwadCoinTransactionItem[]> {
  if (!phone && !customerId) return [];
  try {
    const params = new URLSearchParams();
    if (phone) params.append('phone', phone);
    if (customerId) params.append('customerId', customerId);

    const res = await fetch(`/api/swad-coins/transactions?${params.toString()}`);
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
