/**
 * Swad Coins Loyalty Client Service
 * Connects customer frontend to Swad Coin balance, pending rewards, and claims.
 */

export const STORAGE_KEY_CUSTOMER_TOKEN = 'swadclick_customer_token_v1';

export function getStoredCustomerToken(): string | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const token = window.localStorage.getItem(STORAGE_KEY_CUSTOMER_TOKEN);
    if (!token || token === 'null' || token === 'undefined') return null;
    return token;
  } catch {
    return null;
  }
}

export function setStoredCustomerToken(token: string | null | undefined): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    if (token && typeof token === 'string' && token !== 'null' && token !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY_CUSTOMER_TOKEN, token);
    } else {
      window.localStorage.removeItem(STORAGE_KEY_CUSTOMER_TOKEN);
    }
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

export function getCustomerAuthHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...(extra || {}) };
  const token = getStoredCustomerToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function fetchWithCustomerAuth(url: string, init: RequestInit = {}): Promise<Response> {
  const token = getStoredCustomerToken();
  const baseHeaders: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) {
    baseHeaders['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...init,
    credentials: 'same-origin',
    headers: baseHeaders,
  });

  // If a stored Bearer token was rejected (e.g. expired/rotated), clear it and retry once via HttpOnly cookie
  if (res.status === 401 && token) {
    setStoredCustomerToken(null);
    const cookieOnlyHeaders = { ...(init.headers as Record<string, string> | undefined) };
    return fetch(url, {
      ...init,
      credentials: 'same-origin',
      headers: cookieOnlyHeaders,
    });
  }

  return res;
}

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
  unauthorized?: boolean;
}

export async function fetchVaultRewards(_phone?: string, _customerId?: string): Promise<SwadCoinVaultResult> {
  try {
    const res = await fetchWithCustomerAuth('/api/swad-coins/rewards/vault');
    if (res.status === 401) {
      return { cards: [], pendingRewards: [], claimedRewards: [], totalCards: 0, unauthorized: true };
    }
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

export async function fetchSwadCoinBalanceWithStatus(
  _phone?: string,
  _customerId?: string
): Promise<{ balance: number; unauthorized: boolean }> {
  try {
    const res = await fetchWithCustomerAuth('/api/swad-coins/balance');
    if (res.status === 401) {
      return { balance: 0, unauthorized: true };
    }
    if (!res.ok) return { balance: 0, unauthorized: false };
    const data = await res.json();
    if (data.success && typeof data.balance === 'number') {
      return { balance: data.balance, unauthorized: false };
    }
    return { balance: 0, unauthorized: false };
  } catch (err) {
    console.warn('Failed to fetch Swad Coin balance:', err);
    return { balance: 0, unauthorized: false };
  }
}

export async function fetchSwadCoinBalance(_phone?: string, _customerId?: string): Promise<number> {
  const { balance } = await fetchSwadCoinBalanceWithStatus(_phone, _customerId);
  return balance;
}

export async function fetchPendingRewardsWithStatus(
  _phone?: string,
  _customerId?: string
): Promise<{ rewards: SwadCoinRewardItem[]; unauthorized: boolean }> {
  try {
    const res = await fetchWithCustomerAuth('/api/swad-coins/rewards/pending');
    if (res.status === 401) {
      return { rewards: [], unauthorized: true };
    }
    if (!res.ok) return { rewards: [], unauthorized: false };
    const data = await res.json();
    if (data.success && Array.isArray(data.rewards)) {
      return { rewards: data.rewards, unauthorized: false };
    }
    return { rewards: [], unauthorized: false };
  } catch (err) {
    console.warn('Failed to fetch pending Swad Coin rewards:', err);
    return { rewards: [], unauthorized: false };
  }
}

export async function fetchPendingRewards(_phone?: string, _customerId?: string): Promise<SwadCoinRewardItem[]> {
  const { rewards } = await fetchPendingRewardsWithStatus(_phone, _customerId);
  return rewards;
}

export async function claimPendingReward(
  rewardId: string,
  _phone?: string,
  _customerId?: string
): Promise<{ success: boolean; message?: string; claimedAmount?: number; newBalance?: number; error?: string; unauthorized?: boolean }> {
  try {
    const res = await fetchWithCustomerAuth(`/api/swad-coins/rewards/${encodeURIComponent(rewardId)}/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      return {
        success: false,
        unauthorized: true,
        error: data.error || 'Please verify your mobile number to unlock this reward.',
      };
    }
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
    const res = await fetchWithCustomerAuth('/api/swad-coins/transactions');
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
