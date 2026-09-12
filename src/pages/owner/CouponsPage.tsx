import React, { useState, useEffect } from 'react';
import { OwnerLayout } from './OwnerLayout';
import { useAuth } from '../../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import {
  triggerSwadCoinsRewardScheduler,
  fetchAdminCustomersWithCoins,
  issueAdminSwadCoins,
  fetchAdminSwadCoinsStats,
  AdminCustomerCoinRecord,
  AdminSwadCoinsStats,
} from '../../lib/products';
import {
  fetchCouponsFromCloud,
  saveCouponToCloud,
  deleteCouponFromCloud,
  fetchCouponStatsFromCloud,
} from '../../lib/supabaseService';
import { getOutlets } from '../../lib/locationService';
import { Coupon, Outlet } from '../../types';
import {
  TicketPercent,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  Check,
  Edit2,
  Trash2,
  TrendingUp,
  Users,
  Percent,
  RefreshCw,
  AlertCircle,
  Calendar,
  IndianRupee,
  Lock,
  Globe,
  Store,
  Coins,
  Gift,
  Play,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  X,
  UserCheck,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

export const CouponsPage: React.FC = () => {
  const { token } = useAuth();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [couponRedemptionsMap, setCouponRedemptionsMap] = useState<Record<string, { count: number; totalDiscount: number }>>({});
  const [stats, setStats] = useState<{ totalCoupons: number; activeCoupons: number; totalRedemptions: number; totalDiscountGiven: number }>({
    totalCoupons: 0,
    activeCoupons: 0,
    totalRedemptions: 0,
    totalDiscountGiven: 0,
  });
  const [swadCoinsStats, setSwadCoinsStats] = useState<AdminSwadCoinsStats>({
    totalIssued: 0,
    pending: 0,
    claimed: 0,
    redeemed: 0,
    grossRedeemed: 0,
    refunded: 0,
    expired: 0,
    inCirculation: 0,
  });
  const [isLoadingSwadCoinsStats, setIsLoadingSwadCoinsStats] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'expired'>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState<Partial<Coupon>>({
    code: '',
    title: '',
    description: '',
    discountType: 'percentage',
    discountValue: 10,
    maxDiscountAmount: 100,
    minOrderValue: 0,
    applicableOutlets: [],
    usageLimitTotal: undefined,
    usageLimitPerUser: 1,
    requiresLogin: false,
    isFirstOrderOnly: false,
    isActive: true,
    isPublic: true,
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Sub-Tab & Swad Coins Reward Scheduler State
  const [activeSubTab, setActiveSubTab] = useState<'coupons' | 'swad-coins'>('coupons');
  const [isRunningScheduler, setIsRunningScheduler] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [schedulerResult, setSchedulerResult] = useState<{
    type: 'success' | 'error';
    message: string;
    summary?: {
      totalEligible: number;
      created: number;
      skippedAlreadyRewarded: number;
      failed: number;
      syncedToSupabase?: number;
      alreadyInSupabase?: number;
      rlsBlocked?: boolean;
    };
  } | null>(null);

  const handleRunRewardScheduler = async () => {
    setIsRunningScheduler(true);
    setSchedulerResult(null);
    try {
      const res = await triggerSwadCoinsRewardScheduler(token || undefined);
      if (res.success) {
        setSchedulerResult({
          type: 'success',
          message: res.message || 'Swad Coin rewards calculated successfully.',
          summary: res.summary,
        });
        loadSwadCoinsStats();
      } else {
        setSchedulerResult({
          type: 'error',
          message: res.error || 'Failed to trigger scheduler.',
        });
      }
    } catch (err: any) {
      setSchedulerResult({
        type: 'error',
        message: err.message || 'Failed to connect to reward scheduler.',
      });
    } finally {
      setIsRunningScheduler(false);
    }
  };

  // Issue Swad Coins Modal State
  const [isIssueCoinsModalOpen, setIsIssueCoinsModalOpen] = useState(false);
  const [customersList, setCustomersList] = useState<AdminCustomerCoinRecord[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<AdminCustomerCoinRecord | null>(null);
  const [issueAmount, setIssueAmount] = useState<number | string>(100);
  const [issueReason, setIssueReason] = useState('Goodwill compensation');
  const [isSubmittingIssueCoins, setIsSubmittingIssueCoins] = useState(false);
  const [issueCoinsStatus, setIssueCoinsStatus] = useState<{
    type: 'success' | 'error';
    message: string;
    details?: {
      previousBalance: number;
      newBalance: number;
      addedAmount: number;
      customerId: string;
      customerName?: string;
      customerPhone?: string;
      reason: string;
      transactionId?: string;
    };
  } | null>(null);

  const loadCustomersForCoins = async () => {
    setIsLoadingCustomers(true);
    try {
      let list: AdminCustomerCoinRecord[] = [];

      // 1. Fetch directly from Supabase customers table
      if (isSupabaseConfigured()) {
        try {
          const { data: supaCust, error } = await supabase
            .from('customers')
            .select('id, phone, full_name, email, swad_coin_balance, created_at')
            .order('created_at', { ascending: false });

          if (!error && supaCust && supaCust.length > 0) {
            list = supaCust.map((sc: any) => ({
              id: sc.id,
              phone: sc.phone || '',
              fullName: sc.full_name || 'Customer',
              email: sc.email || '',
              swadCoinBalance: Number(sc.swad_coin_balance || 0),
              createdAt: sc.created_at || new Date().toISOString(),
            }));
          }
        } catch (supaErr) {
          console.warn('Supabase customers query warning:', supaErr);
        }
      }

      // 2. Fallback to API if client query returned empty
      if (list.length === 0) {
        const apiList = await fetchAdminCustomersWithCoins(token || undefined);
        list = apiList || [];
      }

      // 3. Filter out any memory dummy IDs and strictly deduplicate by id & phone
      const deduped: AdminCustomerCoinRecord[] = [];
      const seenIds = new Set<string>();
      const seenPhones = new Set<string>();

      for (const item of list) {
        const idKey = item.id?.trim();
        const phoneKey = item.phone?.replace(/\D/g, '').slice(-10);

        if (idKey && seenIds.has(idKey)) continue;
        if (phoneKey && seenPhones.has(phoneKey)) continue;

        if (idKey) seenIds.add(idKey);
        if (phoneKey) seenPhones.add(phoneKey);
        deduped.push(item);
      }

      setCustomersList(deduped);
      // If customer is already selected, update their balance to latest
      if (selectedCustomer) {
        const found = deduped.find((c) => c.id === selectedCustomer.id || c.phone === selectedCustomer.phone);
        if (found) setSelectedCustomer(found);
      }
    } catch (err: any) {
      console.error('Failed to load customers for swad coins:', err);
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  const handleOpenIssueCoinsModal = () => {
    setIsIssueCoinsModalOpen(true);
    setIssueCoinsStatus(null);
    setCustomerSearchQuery('');
    setIssueAmount(100);
    setIssueReason('Goodwill compensation');
    loadCustomersForCoins();
  };

  const handleIssueCoinsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      setIssueCoinsStatus({ type: 'error', message: 'Please select a customer first to verify their account.' });
      return;
    }
    const cleanAmount = Math.floor(Number(issueAmount));
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      setIssueCoinsStatus({ type: 'error', message: 'Please enter a valid amount of Swad Coins greater than 0.' });
      return;
    }
    if (!issueReason.trim()) {
      setIssueCoinsStatus({ type: 'error', message: 'Please provide a reason or select a preset justification.' });
      return;
    }

    setIsSubmittingIssueCoins(true);
    setIssueCoinsStatus(null);

    try {
      const res = await issueAdminSwadCoins(
        {
          customerIdOrPhone: selectedCustomer.id || selectedCustomer.phone,
          amount: cleanAmount,
          reason: issueReason.trim(),
        },
        token || undefined
      );

      if (res.success) {
        const previousBalance = selectedCustomer.swadCoinBalance || 0;
        const newBalance = res.newBalance;

        // Update selected customer
        const updatedCust: AdminCustomerCoinRecord = {
          ...selectedCustomer,
          swadCoinBalance: newBalance,
        };
        setSelectedCustomer(updatedCust);

        // Update list
        setCustomersList((prev) =>
          prev.map((c) =>
            c.id === selectedCustomer.id || (c.phone && c.phone === selectedCustomer.phone)
              ? { ...c, swadCoinBalance: newBalance }
              : c
          )
        );

        setIssueCoinsStatus({
          type: 'success',
          message: `Successfully credited +${cleanAmount} Swad Coins!`,
          details: {
            previousBalance,
            newBalance,
            addedAmount: cleanAmount,
            customerId: res.customerId || selectedCustomer.id,
            customerName: res.customerName || selectedCustomer.fullName,
            customerPhone: res.customerPhone || selectedCustomer.phone,
            reason: issueReason.trim(),
            transactionId: res.transaction?.id,
          },
        });
        loadSwadCoinsStats();
      } else {
        setIssueCoinsStatus({
          type: 'error',
          message: res.message || 'Failed to issue Swad Coins.',
        });
      }
    } catch (err: any) {
      setIssueCoinsStatus({
        type: 'error',
        message: err.message || 'Failed to issue Swad Coins. Please check your credentials.',
      });
    } finally {
      setIsSubmittingIssueCoins(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [cpns, rawStats, ots] = await Promise.all([
        fetchCouponsFromCloud(),
        fetchCouponStatsFromCloud(),
        getOutlets(),
      ]);
      setCoupons(cpns || []);
      setCouponRedemptionsMap(rawStats || {});
      setOutlets(ots || []);

      let totalRedemptions = 0;
      let totalDiscountGiven = 0;
      if (rawStats && typeof rawStats === 'object') {
        Object.values(rawStats).forEach((item: any) => {
          totalRedemptions += Number(item.count || 0);
          totalDiscountGiven += Number(item.totalDiscount || 0);
        });
      }

      const now = new Date();
      const activeCoupons = (cpns || []).filter((c) => {
        if (!c.isActive) return false;
        if (c.validFrom && new Date(c.validFrom) > now) return false;
        if (c.validUntil && new Date(c.validUntil) < now) return false;
        return true;
      }).length;

      setStats({
        totalCoupons: (cpns || []).length,
        activeCoupons,
        totalRedemptions,
        totalDiscountGiven,
      });
    } catch (err) {
      console.error('Failed to load coupons:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSwadCoinsStats = async () => {
    setIsLoadingSwadCoinsStats(true);
    try {
      // 1. Try Backend API endpoint
      try {
        const res = await fetchAdminSwadCoinsStats(token || undefined);
        if (res) {
          setSwadCoinsStats(res);
          return;
        }
      } catch (apiErr) {
        console.warn('API Swad Coins stats note, checking direct database:', apiErr);
      }

      // 2. Direct Supabase Query Fallback
      if (isSupabaseConfigured()) {
        const [
          { data: rewards },
          { data: txs },
          { data: custs }
        ] = await Promise.all([
          supabase.from('swad_coin_rewards').select('status, coin_amount'),
          supabase.from('swad_coin_transactions').select('type, amount'),
          supabase.from('customers').select('swad_coin_balance'),
        ]);

        let pendingRewards = 0;
        let claimedRewards = 0;
        let expiredRewards = 0;

        for (const r of rewards || []) {
          const amt = Number(r.coin_amount) || 0;
          const st = String(r.status || '').toUpperCase();
          if (st === 'PENDING') pendingRewards += amt;
          else if (st === 'CLAIMED') claimedRewards += amt;
          else if (st === 'EXPIRED') expiredRewards += amt;
        }

        let earnTx = 0;
        let adminCreditTx = 0;
        let adminDebitTx = 0;
        let redeemTx = 0;
        let refundTx = 0;

        for (const t of txs || []) {
          const amt = Number(t.amount) || 0;
          const type = String(t.type || '').toUpperCase();
          if (type === 'EARN') earnTx += amt;
          else if (type === 'ADMIN_CREDIT') adminCreditTx += amt;
          else if (type === 'ADMIN_DEBIT') adminDebitTx += Math.abs(amt);
          else if (type === 'REDEEM') redeemTx += Math.abs(amt);
          else if (type === 'REFUND') refundTx += Math.abs(amt);
        }

        let inCirculation = 0;
        for (const c of custs || []) {
          inCirculation += Number(c.swad_coin_balance) || 0;
        }
        if (inCirculation === 0 && (earnTx > 0 || adminCreditTx > 0)) {
          inCirculation = Math.max(0, (earnTx + adminCreditTx + refundTx) - (redeemTx + adminDebitTx));
        }

        // Formula 1: TOTAL ISSUED = all coin_amount from swad_coin_rewards (PENDING + Claimed) + ADMIN_CREDIT from swad_coin_transactions
        const totalIssued = (pendingRewards + claimedRewards) + adminCreditTx;

        // Formula 2: PENDING = from swad_coin_rewards (PENDING)
        const pending = pendingRewards;

        // Formula 3: CLAIMED = from swad_coin_transactions (EARN + ADMIN_CREDIT) - ADMIN_DEBIT
        const claimed = (earnTx + adminCreditTx) - adminDebitTx;

        // Formula 4: REDEEMED (NET) = REDEEM minus REFUND from swad_coin_transactions
        const netRedeemed = Math.max(0, redeemTx - refundTx);

        const expired = expiredRewards;

        setSwadCoinsStats({
          totalIssued,
          pending,
          claimed,
          redeemed: netRedeemed,
          grossRedeemed: redeemTx,
          refunded: refundTx,
          expired,
          inCirculation,
        });
      }
    } catch (err) {
      console.error('Failed to load Swad Coins stats:', err);
    } finally {
      setIsLoadingSwadCoinsStats(false);
    }
  };

  useEffect(() => {
    loadData();
    loadSwadCoinsStats();
  }, []);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleOpenCreateModal = () => {
    setEditingCoupon(null);
    setFormData({
      code: '',
      title: '',
      description: '',
      discountType: 'percentage',
      discountValue: 10,
      maxDiscountAmount: 100,
      minOrderValue: 199,
      applicableOutlets: [],
      usageLimitTotal: undefined,
      usageLimitPerUser: 1,
      requiresLogin: false,
      isFirstOrderOnly: false,
      isActive: true,
      isPublic: true,
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (coupon: Coupon) => {
    const rawType = coupon.discountType || (coupon as any).discount_type;
    const normalizedType: 'percentage' | 'fixed' =
      rawType === 'fixed' || rawType === 'flat' ? 'fixed' : 'percentage';

    setEditingCoupon(coupon);
    setFormData({
      ...coupon,
      title: coupon.title || coupon.name || coupon.code,
      description: coupon.description || '',
      discountType: normalizedType,
      discountValue: Number(coupon.discountValue ?? (coupon as any).discount_value ?? 0),
      minOrderValue: Number(coupon.minOrderValue ?? (coupon as any).minimum_order_value ?? (coupon as any).min_order_value ?? 0),
      maxDiscountAmount: coupon.maxDiscountAmount ?? (coupon as any).max_discount_amount ?? undefined,
      applicableOutlets: coupon.applicableOutlets || coupon.outletIds || (coupon as any).outlet_ids || [],
      usageLimitPerUser: coupon.usageLimitPerUser ?? (coupon as any).usage_limit_per_user ?? 1,
      isFirstOrderOnly: coupon.isFirstOrderOnly ?? (coupon.userEligibility === 'first_order' || (coupon as any).user_eligibility === 'first_order'),
      validFrom: coupon.validFrom ? coupon.validFrom.split('T')[0] : '',
      validUntil: coupon.validUntil ? coupon.validUntil.split('T')[0] : '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleToggleActive = async (coupon: Coupon) => {
    const updated = { ...coupon, isActive: !coupon.isActive };
    const res = await saveCouponToCloud(updated);
    if (res.success) {
      setCoupons((prev) => prev.map((c) => (c.id === coupon.id || c.code === coupon.code ? updated : c)));
      await loadData();
    }
  };

  const handleDelete = async (couponId?: string, couponCode?: string) => {
    const targetId = couponId || '';
    const res = await deleteCouponFromCloud(targetId, couponCode);
    if (res.success) {
      setCoupons((prev) => prev.filter((c) => c.id !== targetId && (!couponCode || c.code !== couponCode)));
      await loadData();
    }
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanCode = (formData.code || '').trim().toUpperCase();
    if (!cleanCode) {
      setFormError('Coupon code is required');
      return;
    }
    if (!/^[A-Z0-9_-]{3,20}$/.test(cleanCode)) {
      setFormError('Coupon code must be 3-20 uppercase alphanumeric characters (e.g., WELCOME10, FESTIVE50)');
      return;
    }
    if (!formData.title?.trim()) {
      setFormError('Coupon title is required');
      return;
    }
    if (!formData.discountValue || formData.discountValue <= 0) {
      setFormError('Discount value must be greater than 0');
      return;
    }
    if (formData.discountType === 'percentage' && formData.discountValue > 100) {
      setFormError('Percentage discount cannot exceed 100%');
      return;
    }

    setSaving(true);
    const couponToSave: Coupon = {
      id: editingCoupon ? editingCoupon.id : `cpn-${cleanCode.toLowerCase()}-${Date.now().toString(36)}`,
      code: cleanCode,
      title: formData.title.trim(),
      description: formData.description?.trim(),
      discountType: formData.discountType || 'percentage',
      discountValue: Number(formData.discountValue),
      maxDiscountAmount: formData.maxDiscountAmount ? Number(formData.maxDiscountAmount) : undefined,
      minOrderValue: formData.minOrderValue ? Number(formData.minOrderValue) : 0,
      applicableOutlets: formData.applicableOutlets || [],
      usageLimitTotal: formData.usageLimitTotal ? Number(formData.usageLimitTotal) : undefined,
      usageLimitPerUser: formData.usageLimitPerUser ? Number(formData.usageLimitPerUser) : 1,
      requiresLogin: !!formData.requiresLogin,
      isFirstOrderOnly: !!formData.isFirstOrderOnly,
      isActive: formData.isActive !== false,
      isPublic: formData.isPublic !== false,
      validFrom: formData.validFrom ? `${formData.validFrom}T00:00:00Z` : undefined,
      validUntil: formData.validUntil ? `${formData.validUntil}T23:59:59Z` : undefined,
      usedCount: editingCoupon ? editingCoupon.usedCount : 0,
      createdAt: editingCoupon?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const res = await saveCouponToCloud(couponToSave);
    setSaving(false);

    if (res.success) {
      setIsModalOpen(false);
      await loadData();
    } else {
      setFormError(res.error || 'Failed to save coupon');
    }
  };

  const isCouponExpired = (coupon: Coupon) => {
    if (!coupon.validUntil) return false;
    return new Date(coupon.validUntil) < new Date();
  };

  const filteredCoupons = coupons.filter((c) => {
    const matchesSearch =
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const expired = isCouponExpired(c);

    if (statusFilter === 'active') {
      return matchesSearch && c.isActive && !expired;
    }
    if (statusFilter === 'inactive') {
      return matchesSearch && !c.isActive;
    }
    if (statusFilter === 'expired') {
      return matchesSearch && expired;
    }
    return matchesSearch;
  });

  return (
    <OwnerLayout
      activeTab="coupons"
      title="Promotional Offers"
      subtitle="Manage promotional coupon campaigns, discount incentives, and automated Swad Coins customer loyalty rewards."
    >
      {/* 1. Quick Stats Banner (Dual Stacked: 4 Coupons Boxes + 4 Swad Coins Boxes) */}
      <div className="space-y-4">
        {/* Row 1: 4 Coupon Blocks */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <TicketPercent className="w-3.5 h-3.5 text-amber-800" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-stone-600">
              Coupon Campaigns Overview
            </span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
              <div className="flex items-center justify-between text-stone-500 text-xs font-semibold mb-1">
                <span>Active Coupons</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <TicketPercent className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-stone-900 tracking-tight">{stats.activeCoupons || 0}</p>
              <p className="text-[11px] text-stone-400 mt-0.5">out of {stats.totalCoupons || 0} total campaigns</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
              <div className="flex items-center justify-between text-stone-500 text-xs font-semibold mb-1">
                <span>Total Redemptions</span>
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-stone-900 tracking-tight">{stats.totalRedemptions || 0}</p>
              <p className="text-[11px] text-stone-400 mt-0.5">orders placed with promo</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
              <div className="flex items-center justify-between text-stone-500 text-xs font-semibold mb-1">
                <span>Total Savings Granted</span>
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                  <IndianRupee className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-stone-900 tracking-tight">₹{(stats.totalDiscountGiven || 0).toLocaleString('en-IN')}</p>
              <p className="text-[11px] text-stone-400 mt-0.5">customer discounts claimed</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
              <div className="flex items-center justify-between text-stone-500 text-xs font-semibold mb-1">
                <span>Avg. Discount / Order</span>
                <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-stone-900 tracking-tight">
                ₹{stats.totalRedemptions > 0 ? Math.round((stats.totalDiscountGiven || 0) / stats.totalRedemptions) : 0}
              </p>
              <p className="text-[11px] text-stone-400 mt-0.5">promotional incentive value</p>
            </div>
          </div>
        </div>

        {/* Row 2: 4 Swad Coins Blocks */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-amber-700" />
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-stone-600">
                Swad Coins Loyalty Rewards
              </span>
            </div>
            {isLoadingSwadCoinsStats && (
              <span className="text-[10px] text-stone-400 animate-pulse font-medium">Syncing stats...</span>
            )}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Box 1: TOTAL ISSUED */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
              <div className="flex items-center justify-between text-stone-500 text-xs font-semibold mb-1">
                <span className="uppercase tracking-wider text-[11px] font-bold text-stone-600">TOTAL ISSUED</span>
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center">
                  <Coins className="w-4 h-4 text-amber-700" />
                </div>
              </div>
              <p className="text-2xl font-black text-stone-900 tracking-tight">
                {swadCoinsStats.totalIssued.toLocaleString('en-IN')}
                <span className="text-xs font-bold text-amber-700 ml-1">Coins</span>
              </p>
              <p className="text-[11px] text-stone-400 mt-0.5">Rewards + admin credits</p>
            </div>

            {/* Box 2: PENDING */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
              <div className="flex items-center justify-between text-stone-500 text-xs font-semibold mb-1">
                <span className="uppercase tracking-wider text-[11px] font-bold text-stone-600">PENDING</span>
                <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-700 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-stone-900 tracking-tight">
                {swadCoinsStats.pending.toLocaleString('en-IN')}
                <span className="text-xs font-bold text-amber-700 ml-1">Coins</span>
              </p>
              <p className="text-[11px] text-stone-400 mt-0.5">Awaiting customer claim</p>
            </div>

            {/* Box 3: CLAIMED (<n> Expired below in small font) */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
              <div className="flex items-center justify-between text-stone-500 text-xs font-semibold mb-1">
                <span className="uppercase tracking-wider text-[11px] font-bold text-stone-600">CLAIMED</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-stone-900 tracking-tight">
                {swadCoinsStats.claimed.toLocaleString('en-IN')}
                <span className="text-xs font-bold text-amber-700 ml-1">Coins</span>
              </p>
              <p className="text-[11px] text-stone-400 mt-0.5">
                <span className="font-semibold text-stone-500">{swadCoinsStats.expired.toLocaleString('en-IN')}</span> Expired
              </p>
            </div>

            {/* Box 4: REDEEMED (<n> in Circulation [<n> refunded]) */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
              <div className="flex items-center justify-between text-stone-500 text-xs font-semibold mb-1">
                <span className="uppercase tracking-wider text-[11px] font-bold text-stone-600">REDEEMED</span>
                <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                </div>
              </div>
              <p className="text-2xl font-black text-stone-900 tracking-tight">
                {swadCoinsStats.redeemed.toLocaleString('en-IN')}
                <span className="text-xs font-bold text-amber-700 ml-1">Coins</span>
              </p>
              <p className="text-[11px] text-stone-400 mt-0.5">
                <span className="font-semibold text-stone-500">{swadCoinsStats.inCirculation.toLocaleString('en-IN')}</span> in Circulation
                {(swadCoinsStats.refunded ?? 0) > 0 && (
                  <span className="text-stone-500 font-medium ml-1">[{swadCoinsStats.refunded?.toLocaleString('en-IN')} refunded]</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Sub Tabs: Coupons & Promotional Offers vs Swad Coins */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('coupons')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeSubTab === 'coupons'
                ? 'bg-amber-800 text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
            }`}
          >
            <TicketPercent className="w-4 h-4" />
            <span>Coupons &amp; Promotional Offers</span>
            <span
              className={`ml-1 text-[11px] px-2 py-0.5 rounded-full font-bold ${
                activeSubTab === 'coupons'
                  ? 'bg-amber-900/80 text-amber-100'
                  : 'bg-stone-200 text-stone-600'
              }`}
            >
              {coupons.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('swad-coins')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeSubTab === 'swad-coins'
                ? 'bg-amber-800 text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
            }`}
          >
            <Coins className={`w-4 h-4 ${activeSubTab === 'swad-coins' ? 'text-amber-200' : 'text-amber-600'}`} />
            <span>Swad Coins</span>
          </button>
        </div>

        {activeSubTab === 'coupons' && (
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-800 hover:bg-amber-900 active:bg-amber-950 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Coupon</span>
          </button>
        )}

        {activeSubTab === 'swad-coins' && (
          <button
            type="button"
            onClick={handleOpenIssueCoinsModal}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 hover:from-amber-800 hover:to-amber-950 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs shrink-0 self-start sm:self-auto"
          >
            <Coins className="w-4 h-4 text-amber-300" />
            <span>+ Issue Swad Coins</span>
          </button>
        )}
      </div>

      {activeSubTab === 'coupons' && (
        <>
          {/* 3. Search & Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search by code, name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:border-amber-700 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {(['all', 'active', 'inactive', 'expired'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors capitalize cursor-pointer ${
                statusFilter === filter
                  ? 'bg-amber-800 text-white'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
            >
              {filter === 'all' ? 'All Coupons' : filter}
            </button>
          ))}
          <button
            type="button"
            onClick={loadData}
            className="p-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 transition-colors cursor-pointer"
            title="Refresh coupons"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 3. Coupon Cards Grid */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
          <div className="w-8 h-8 border-3 border-amber-800 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-stone-600">Loading coupons database...</p>
        </div>
      ) : filteredCoupons.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 bg-amber-50 text-amber-800 rounded-2xl flex items-center justify-center mx-auto">
            <TicketPercent className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-stone-900 text-sm">No coupons found</h3>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search query or status filter.'
                : 'Get started by creating your first promotional discount coupon or loading the default campaigns.'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-800 text-white rounded-xl text-xs font-bold hover:bg-amber-900 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Coupon</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCoupons.map((coupon, idx) => {
            const expired = isCouponExpired(coupon);
            const itemKey = coupon.id || coupon.code || `coupon-${idx}`;
            return (
              <div
                key={itemKey}
                className={`bg-white rounded-2xl border transition-all flex flex-col justify-between overflow-hidden relative shadow-2xs hover:shadow-sm ${
                  expired
                    ? 'border-stone-200 opacity-75'
                    : coupon.isActive
                    ? 'border-amber-200/80 ring-1 ring-amber-700/10'
                    : 'border-stone-200'
                }`}
              >
                {/* Top Badge & Code */}
                <div className="p-4 sm:p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="px-3 py-1 bg-amber-50 border border-amber-300/80 rounded-lg flex items-center gap-1.5 font-mono font-black text-amber-950 text-sm tracking-wider">
                        <span>{coupon.code}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(coupon.code)}
                          className="text-amber-800 hover:text-amber-950 transition-colors cursor-pointer"
                          title="Copy Code"
                        >
                          {copiedCode === coupon.code ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {coupon.isPublic ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-0.5">
                          <Globe className="w-2.5 h-2.5" />
                          Public
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200 flex items-center gap-0.5">
                          <Lock className="w-2.5 h-2.5" />
                          Secret
                        </span>
                      )}
                    </div>

                    {/* Status Pill */}
                    <div>
                      {expired ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          Expired
                        </span>
                      ) : coupon.isActive ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Active
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200 flex items-center gap-1">
                          <XCircle className="w-2.5 h-2.5" />
                          Disabled
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h4 className="font-bold text-stone-900 text-sm line-clamp-1">{coupon.title}</h4>
                    {coupon.description && (
                      <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">{coupon.description}</p>
                    )}
                  </div>

                  {/* Benefit Banner */}
                  <div className="bg-stone-50 rounded-xl p-3 border border-stone-200/60 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-stone-600">Discount Benefit:</span>
                      <span className="font-black text-amber-900">
                        {coupon.discountType === 'percentage'
                          ? `${coupon.discountValue}% OFF`
                          : `₹${coupon.discountValue} FLAT OFF`}
                      </span>
                    </div>

                    {coupon.discountType === 'percentage' && coupon.maxDiscountAmount && (
                      <div className="flex items-center justify-between text-[11px] text-stone-500">
                        <span>Max Cap:</span>
                        <span className="font-semibold text-stone-700">₹{coupon.maxDiscountAmount}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-stone-500">
                      <span>Min Order Value:</span>
                      <span className="font-semibold text-stone-700">
                        {coupon.minOrderValue && coupon.minOrderValue > 0 ? `₹${coupon.minOrderValue}` : 'No Minimum'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-stone-500">
                      <span>Per-User Limit:</span>
                      <span className="font-semibold text-stone-700">
                        {coupon.usageLimitPerUser ? `${coupon.usageLimitPerUser} per user` : 'Unlimited'}
                      </span>
                    </div>
                  </div>

                  {/* Restrictions & Outlets */}
                  <div className="flex flex-wrap gap-1 text-[10px] font-semibold text-stone-600">
                    {coupon.requiresLogin && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                        Login Required
                      </span>
                    )}
                    {coupon.isFirstOrderOnly && (
                      <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200">
                        1st Order Only
                      </span>
                    )}
                    {coupon.applicableOutlets && coupon.applicableOutlets.length > 0 ? (
                      <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-0.5">
                        <Store className="w-2.5 h-2.5" />
                        {coupon.applicableOutlets.length} Specific Outlet(s)
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                        All Kitchens
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(coupon)}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        coupon.isActive
                          ? 'bg-stone-200 hover:bg-stone-300 text-stone-700'
                          : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                      }`}
                    >
                      {coupon.isActive ? 'Disable' : 'Enable'}
                    </button>
                    <span className="text-[10px] text-stone-500">
                      Redeemed: <strong>{coupon.usedCount || 0}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(coupon)}
                      className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
                      title="Edit Coupon"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(coupon.id, coupon.code)}
                      className="p-1.5 text-rose-600 hover:text-rose-900 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete Coupon"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
        </>
      )}

      {/* Swad Coins Loyalty Reward Engine Content (In-Page View) */}
      {activeSubTab === 'swad-coins' && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-50 via-orange-50/60 to-white px-6 py-5 border-b border-amber-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
                <Coins className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-stone-900">Swad Coins Loyalty Engine</h3>
                <p className="text-xs text-stone-500">Automated cash-back rewards for delivered customer orders</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100/80 text-amber-900 border border-amber-200">
                <Clock className="w-3.5 h-3.5 text-amber-700" />
                Automated Cron: Daily 04:00 AM
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100/80 text-emerald-900 border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                100-Day Expiry
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-orange-100/80 text-orange-900 border border-orange-200">
                <Gift className="w-3.5 h-3.5 text-orange-700" />
                1.0% – 2.0% Cash-Back
              </span>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5">
            {/* Explanatory Info Card */}
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 text-xs text-stone-600 leading-relaxed space-y-2">
              <p className="font-semibold text-stone-800 text-sm">How the Scheduler Works:</p>
              <ul className="list-disc list-inside space-y-1.5 text-stone-600 pl-1">
                <li>Scans all delivered customer orders and calculates a surprise loyalty cash-back reward (1.0% to 2.0% of food value).</li>
                <li><strong>Idempotent &amp; Safe:</strong> Orders that have already received rewards are skipped automatically. It will never reward the same order twice.</li>
                <li>Synchronizes generated rewards with the cloud database for customer unlock in the food app.</li>
              </ul>
            </div>

            {/* Run Scheduler Action Button */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleRunRewardScheduler}
                disabled={isRunningScheduler}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 hover:from-amber-800 hover:to-amber-950 text-white text-xs font-extrabold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-60"
              >
                <Play className={`w-4 h-4 fill-current ${isRunningScheduler ? 'animate-spin' : ''}`} />
                <span>{isRunningScheduler ? 'Executing Scheduler & Syncing...' : 'Run Daily Rewards Now'}</span>
              </button>

              <span className="text-xs text-stone-400">
                Calculates cashback rewards for delivered orders and synchronizes with customer coin balances
              </span>
            </div>

            {/* Result Feedback Banner */}
            {schedulerResult && (
              <div
                className={`p-5 rounded-xl text-xs border flex items-start justify-between gap-3 ${
                  schedulerResult.type === 'success'
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950 shadow-2xs'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                <div className="flex items-start gap-3 w-full">
                  {schedulerResult.type === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-2.5 w-full">
                    <p className="font-bold text-sm">{schedulerResult.message}</p>
                    {schedulerResult.summary && (
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 font-bold border border-emerald-300">
                          ✨ {schedulerResult.summary.created} New Reward{schedulerResult.summary.created === 1 ? '' : 's'} Generated
                        </span>
                        {typeof schedulerResult.summary.syncedToSupabase === 'number' && (
                          <span className="px-2.5 py-1 rounded-lg bg-sky-100 text-sky-900 font-bold border border-sky-300">
                            ☁️ {schedulerResult.summary.syncedToSupabase} Written to Supabase
                          </span>
                        )}
                        {typeof schedulerResult.summary.alreadyInSupabase === 'number' && schedulerResult.summary.alreadyInSupabase > 0 && (
                          <span className="px-2.5 py-1 rounded-lg bg-stone-100 text-stone-700 font-semibold border border-stone-200">
                            ☁️ {schedulerResult.summary.alreadyInSupabase} Already in Supabase
                          </span>
                        )}
                        <span className="px-2.5 py-1 rounded-lg bg-stone-100 text-stone-700 font-semibold border border-stone-200">
                          ⏭️ {schedulerResult.summary.skippedAlreadyRewarded} Skipped (Already Rewarded)
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-stone-100 text-stone-700 font-semibold border border-stone-200">
                          📦 {schedulerResult.summary.totalEligible} Total Delivered Checked
                        </span>
                        {schedulerResult.summary.failed > 0 && (
                          <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-900 font-bold border border-rose-300">
                            ⚠️ {schedulerResult.summary.failed} Failed
                          </span>
                        )}
                      </div>
                    )}

                    {schedulerResult.summary?.rlsBlocked && (
                      <div className="mt-3 p-3.5 rounded-xl bg-amber-100/80 border border-amber-300 text-amber-950 text-xs space-y-2">
                        <p className="font-bold flex items-center gap-1.5 text-amber-900">
                          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                          Supabase Row-Level Security (RLS) is active on swad_coin tables
                        </p>
                        <p className="text-amber-800">
                          The rewards are safely saved in local storage. To permit direct inserts into your Supabase cloud tables, paste this 2-line query into your <strong>Supabase Dashboard &gt; SQL Editor</strong>:
                        </p>
                        <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-white/90 font-mono text-[11px] text-amber-950 border border-amber-300">
                          <code className="break-all">ALTER TABLE public.swad_coin_rewards DISABLE ROW LEVEL SECURITY; ALTER TABLE public.swad_coin_transactions DISABLE ROW LEVEL SECURITY;</code>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(
                                'ALTER TABLE public.swad_coin_rewards DISABLE ROW LEVEL SECURITY;\nALTER TABLE public.swad_coin_transactions DISABLE ROW LEVEL SECURITY;'
                              );
                              setCopiedSql(true);
                              setTimeout(() => setCopiedSql(false), 2000);
                            }}
                            className="px-2.5 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded font-sans font-bold text-xs transition-colors shrink-0 cursor-pointer flex items-center gap-1"
                          >
                            {copiedSql ? (
                              <>
                                <Check className="w-3.5 h-3.5" /> Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" /> Copy SQL
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSchedulerResult(null)}
                  className="text-stone-400 hover:text-stone-600 text-xs font-bold px-2 py-1 rounded-lg hover:bg-black/5 transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Create / Edit Coupon Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col my-auto">
            {/* Modal Header */}
            <div className="p-5 border-b border-stone-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center border border-amber-200">
                  <TicketPercent className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-stone-900 text-base">
                    {editingCoupon ? 'Edit Coupon Campaign' : 'Create Promotional Coupon'}
                  </h3>
                  <p className="text-[11px] text-stone-500">Configure discount parameters and eligibility rules.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveCoupon} className="p-5 overflow-y-auto space-y-4 flex-1">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Code & Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Coupon Code <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. WELCOME10, GAON15"
                    value={formData.code || ''}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-bold text-stone-900 focus:bg-white focus:outline-none focus:border-amber-700 uppercase"
                  />
                  <p className="text-[10px] text-stone-400 mt-0.5">Uppercase characters without spaces.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Display Title <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Flat 15% Off All Biryanis"
                    value={formData.title || ''}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:border-amber-700"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Get 15% discount up to ₹150 on min order of ₹299"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:border-amber-700"
                />
              </div>

              {/* Discount Type & Value */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Discount Type</label>
                  <select
                    value={formData.discountType === 'fixed' ? 'fixed' : 'percentage'}
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value as 'percentage' | 'fixed' })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 focus:bg-white focus:outline-none focus:border-amber-700"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Flat Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Discount Value <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={formData.discountType === 'percentage' ? 100 : 10000}
                    value={formData.discountValue || ''}
                    onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:bg-white focus:outline-none focus:border-amber-700"
                  />
                  <p className="text-[10px] text-stone-400 mt-0.5">
                    {formData.discountType === 'percentage' ? '% off subtotal' : '₹ flat discount'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Max Cap (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="No limit"
                    disabled={formData.discountType === 'fixed'}
                    value={formData.maxDiscountAmount || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxDiscountAmount: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:bg-white focus:outline-none focus:border-amber-700 disabled:opacity-50"
                  />
                  <p className="text-[10px] text-stone-400 mt-0.5">Applies to percentage discounts</p>
                </div>
              </div>

              {/* Order Rules: Min Order Value & Per-User Limit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Min Order Value (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0 for no minimum"
                    value={formData.minOrderValue || ''}
                    onChange={(e) => setFormData({ ...formData, minOrderValue: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:bg-white focus:outline-none focus:border-amber-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Usage Limit Per User</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="1 for single use"
                    value={formData.usageLimitPerUser || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        usageLimitPerUser: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:bg-white focus:outline-none focus:border-amber-700"
                  />
                </div>
              </div>

              {/* Validity Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Valid From</label>
                  <input
                    type="date"
                    value={formData.validFrom || ''}
                    onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:border-amber-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Valid Until (Expiry)</label>
                  <input
                    type="date"
                    value={formData.validUntil || ''}
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:border-amber-700"
                  />
                </div>
              </div>

              {/* Flags & Checkboxes */}
              <div className="space-y-2 pt-2 border-t border-stone-200">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-stone-800">
                  <input
                    type="checkbox"
                    checked={formData.requiresLogin || false}
                    onChange={(e) => setFormData({ ...formData, requiresLogin: e.target.checked })}
                    className="rounded text-amber-800 focus:ring-amber-700"
                  />
                  <span>Requires Customer Phone / Login verification</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-stone-800">
                  <input
                    type="checkbox"
                    checked={formData.isFirstOrderOnly || false}
                    onChange={(e) => setFormData({ ...formData, isFirstOrderOnly: e.target.checked })}
                    className="rounded text-amber-800 focus:ring-amber-700"
                  />
                  <span>First Order / Welcome Offer only</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-stone-800">
                  <input
                    type="checkbox"
                    checked={formData.isPublic !== false}
                    onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                    className="rounded text-amber-800 focus:ring-amber-700"
                  />
                  <span>Publicly visible in Checkout Offers banner</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-stone-800">
                  <input
                    type="checkbox"
                    checked={formData.isActive !== false}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded text-amber-800 focus:ring-amber-700"
                  />
                  <span>Active Campaign (accepting redemptions)</span>
                </label>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-stone-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-amber-800 hover:bg-amber-900 active:bg-amber-950 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {saving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>{editingCoupon ? 'Update Campaign' : 'Save & Publish'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Issue Swad Coins Modal (Admin Credit / Goodwill) */}
      {isIssueCoinsModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col my-auto overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-800 flex items-center justify-center border border-amber-200 shadow-2xs">
                  <Coins className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="font-extrabold text-stone-900 text-base flex items-center gap-2">
                    <span>Issue Swad Coins</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-200 uppercase tracking-wider">
                      Admin Credit
                    </span>
                  </h3>
                  <p className="text-xs text-stone-500">Goodwill compensation, complaints, and customer retention</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsIssueCoinsModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-stone-200/70 text-stone-400 hover:text-stone-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {issueCoinsStatus?.type === 'success' ? (
                /* Success Confirmation View */
                <div className="space-y-4 py-2">
                  <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-3 shadow-2xs">
                    <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-sm">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span>{issueCoinsStatus.message}</span>
                    </div>

                    <div className="bg-white/80 p-4 rounded-xl border border-emerald-200/70 space-y-2 text-xs">
                      <div className="flex justify-between items-center py-1 border-b border-emerald-100">
                        <span className="text-stone-500">Customer:</span>
                        <span className="font-bold text-stone-900">
                          {issueCoinsStatus.details?.customerName} ({issueCoinsStatus.details?.customerPhone})
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-emerald-100">
                        <span className="text-stone-500">Verified Customer ID:</span>
                        <span className="font-mono text-[11px] text-emerald-800 font-semibold bg-emerald-100/60 px-1.5 py-0.5 rounded">
                          {issueCoinsStatus.details?.customerId}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-emerald-100">
                        <span className="text-stone-500">Balance Transition:</span>
                        <span className="font-black text-emerald-900 flex items-center gap-1.5">
                          <span className="line-through text-stone-400">{issueCoinsStatus.details?.previousBalance}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700 font-extrabold text-sm">{issueCoinsStatus.details?.newBalance} Coins</span>
                          <span className="text-[10px] text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full font-bold">
                            +{issueCoinsStatus.details?.addedAmount}
                          </span>
                        </span>
                      </div>
                      <div className="flex justify-between items-start py-1">
                        <span className="text-stone-500">Reason / Note:</span>
                        <span className="font-medium text-stone-800 text-right max-w-[220px]">
                          {issueCoinsStatus.details?.reason}
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-emerald-700/90 leading-tight">
                      Recorded as an <strong className="font-bold">ADMIN_CREDIT</strong> transaction row in <code className="font-mono bg-emerald-100/70 px-1 py-0.5 rounded">swad_coin_transactions</code> with authenticated admin credentials.
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIssueCoinsStatus(null);
                        setSelectedCustomer(null);
                        setCustomerSearchQuery('');
                        setIssueAmount(100);
                        setIssueReason('Goodwill compensation');
                        loadCustomersForCoins();
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-stone-100 hover:bg-stone-200 text-stone-800 transition-colors cursor-pointer"
                    >
                      Credit Another Customer
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsIssueCoinsModalOpen(false)}
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-800 hover:bg-amber-900 text-white transition-colors cursor-pointer shadow-xs"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                /* Form Mode */
                <form onSubmit={handleIssueCoinsSubmit} className="space-y-4">
                  {/* Step 1: Customer Search & Selection */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-extrabold text-stone-800 uppercase tracking-wider">
                      Customer
                    </label>

                    {selectedCustomer ? (
                      <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200 flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-stone-900 text-sm">
                              {selectedCustomer.fullName || 'Customer'}
                            </span>
                            <span className="text-xs font-semibold text-stone-600">
                              ({selectedCustomer.phone})
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-amber-900">
                            <ShieldCheck className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                            <span className="font-bold">Customer ID:</span>
                            <span className="font-mono text-[10px] bg-white/90 px-1.5 py-0.5 rounded border border-amber-200/80 break-all">
                              {selectedCustomer.id}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded-full shrink-0">
                              Verified
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedCustomer(null)}
                          className="text-xs font-bold text-amber-800 hover:text-amber-950 underline cursor-pointer shrink-0 mt-1"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                          <input
                            type="text"
                            placeholder="Search customer by name, phone, or customer_id..."
                            value={customerSearchQuery}
                            onChange={(e) => setCustomerSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-8 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:border-amber-700 transition-colors"
                          />
                          {isLoadingCustomers && (
                            <RefreshCw className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-stone-400" />
                          )}
                        </div>

                        {/* Customer list results */}
                        <div className="max-h-44 overflow-y-auto border border-stone-200 rounded-xl bg-stone-50/50 divide-y divide-stone-100 text-xs">
                          {isLoadingCustomers ? (
                            <div className="p-4 text-center text-stone-400 text-xs flex items-center justify-center gap-2">
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-700" />
                              <span>Loading customers...</span>
                            </div>
                          ) : (
                            (() => {
                              const filtered = customersList.filter((c) => {
                                const q = customerSearchQuery.toLowerCase().trim();
                                if (!q) return true;
                                return (
                                  c.fullName?.toLowerCase().includes(q) ||
                                  c.phone?.toLowerCase().includes(q) ||
                                  c.id?.toLowerCase().includes(q) ||
                                  c.email?.toLowerCase().includes(q)
                                );
                              });

                              if (filtered.length === 0) {
                                return (
                                  <div className="p-4 text-center text-stone-400">
                                    No customers found matching &quot;{customerSearchQuery}&quot;.
                                  </div>
                                );
                              }

                              return filtered.slice(0, 15).map((cust) => (
                                <button
                                  key={cust.id || cust.phone}
                                  type="button"
                                  onClick={() => setSelectedCustomer(cust)}
                                  className="w-full px-3.5 py-2.5 text-left hover:bg-amber-50/80 flex items-center justify-between gap-3 transition-colors cursor-pointer group"
                                >
                                  <div className="min-w-0">
                                    <div className="font-bold text-stone-900 group-hover:text-amber-900 truncate">
                                      {cust.fullName || 'Customer'}
                                      <span className="ml-1.5 text-stone-500 font-normal">({cust.phone})</span>
                                    </div>
                                    <div className="text-[10px] text-stone-400 font-mono truncate">
                                      ID: {cust.id}
                                    </div>
                                  </div>
                                  <div className="shrink-0 text-right">
                                    <span className="inline-flex items-center gap-1 font-extrabold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-full text-[11px]">
                                      <Coins className="w-3 h-3 text-amber-600" />
                                      {cust.swadCoinBalance || 0}
                                    </span>
                                  </div>
                                </button>
                              ));
                            })()
                          )}
                        </div>
                        <p className="text-[10px] text-stone-400 italic">
                          Tip: Click any customer above to verify their customer_id and current balance before issuing coins.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Step 2: Current Balance Display */}
                  <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                        Current Balance
                      </span>
                      <span className="text-xl font-black text-stone-900">
                        {selectedCustomer ? selectedCustomer.swadCoinBalance || 0 : '—'}
                        <span className="text-xs font-semibold text-stone-500 ml-1">Coins</span>
                      </span>
                    </div>
                    {selectedCustomer && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100/70 border border-amber-200/80 rounded-xl text-amber-900 text-xs font-bold">
                        <Coins className="w-3.5 h-3.5 text-amber-700" />
                        <span>Verified Account</span>
                      </div>
                    )}
                  </div>

                  {/* Step 3: Swad Coins to add Input */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-extrabold text-stone-800 uppercase tracking-wider">
                        Swad Coins to add
                      </label>
                      <div className="flex items-center gap-1">
                        {[50, 100, 200, 500].map((quickVal) => (
                          <button
                            key={quickVal}
                            type="button"
                            onClick={() => setIssueAmount(quickVal)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors cursor-pointer ${
                              Number(issueAmount) === quickVal
                                ? 'bg-amber-800 text-white'
                                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                            }`}
                          >
                            +{quickVal}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="relative">
                      <Coins className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-amber-600" />
                      <input
                        type="number"
                        min="1"
                        step="1"
                        required
                        value={issueAmount}
                        onChange={(e) => setIssueAmount(e.target.value)}
                        placeholder="100"
                        className="w-full pl-9 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-black text-stone-900 focus:bg-white focus:outline-none focus:border-amber-700 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Step 4: Preview (Current / After) - Positioned below Swad Coins to add */}
                  {selectedCustomer && (
                    <div className="p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200/80 flex items-center justify-between shadow-2xs">
                      <div>
                        <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                          Preview (Current / After)
                        </span>
                        <div className="text-xs text-stone-500">
                          {selectedCustomer.fullName || 'Customer'}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-amber-900 flex items-center justify-end gap-2">
                          <span className="text-stone-500 font-bold">{Number(selectedCustomer.swadCoinBalance || 0)}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-stone-400" />
                          <span className="text-emerald-700 font-extrabold text-base">
                            {Number(selectedCustomer.swadCoinBalance || 0) + Math.max(0, Math.floor(Number(issueAmount) || 0))} Coins
                          </span>
                          <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md font-bold">
                            +{Math.max(0, Math.floor(Number(issueAmount) || 0))}
                          </span>
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Step 4: Reason / Description */}
                  <div className="space-y-2">
                    <label className="text-xs font-extrabold text-stone-800 uppercase tracking-wider block">
                      Reason
                    </label>

                    {/* Preset reason pills */}
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        'Goodwill compensation',
                        'Complaint resolution',
                        'Delayed delivery compensation',
                        'Customer retention',
                        'Special occasion',
                        'Service recovery',
                        'Promotional bonus',
                      ].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setIssueReason(preset)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                            issueReason === preset
                              ? 'bg-amber-800 text-white shadow-2xs'
                              : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>

                    <textarea
                      rows={2}
                      required
                      value={issueReason}
                      onChange={(e) => setIssueReason(e.target.value)}
                      placeholder="e.g. Goodwill compensation for delayed delivery..."
                      className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:border-amber-700 transition-colors resize-none"
                    />
                    <p className="text-[10px] text-stone-400 italic">
                      Backend securely records: admin_id, customer_id, type ADMIN_CREDIT, amount, reason, and timestamp.
                    </p>
                  </div>

                  {/* Error display */}
                  {issueCoinsStatus?.type === 'error' && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>{issueCoinsStatus.message}</span>
                    </div>
                  )}

                  {/* Modal Footer */}
                  <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsIssueCoinsModalOpen(false)}
                      className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingIssueCoins || !selectedCustomer || !issueAmount || Number(issueAmount) <= 0}
                      className="px-6 py-2.5 bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 hover:from-amber-800 hover:to-amber-950 active:bg-amber-950 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-2"
                    >
                      {isSubmittingIssueCoins ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Adding Swad Coins...</span>
                        </>
                      ) : (
                        <>
                          <Coins className="w-4 h-4 text-amber-300" />
                          <span>Add Swad Coins</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </OwnerLayout>
  );
};
