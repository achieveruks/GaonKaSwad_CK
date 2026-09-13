import React, { useState, useEffect, useRef } from 'react';
import { OwnerLayout } from './OwnerLayout';
import { useAuth } from '../../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import {
  triggerSwadCoinsRewardScheduler,
  fetchAdminCustomersWithCoins,
  issueAdminSwadCoins,
  fetchAdminSwadCoinsStats,
  fetchSwadCoinDispatches,
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
import { Coupon, Outlet, SwadCoinDispatch } from '../../types';
import { useNavigation } from '../../context/NavigationContext';
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
  Eye,
  ExternalLink,
} from 'lucide-react';

export const CouponsPage: React.FC = () => {
  const { token } = useAuth();
  const { goToOwnerDashboard } = useNavigation();
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

  // Swad Coins Dispatch Audit History State
  const [dispatchLogs, setDispatchLogs] = useState<SwadCoinDispatch[]>([]);
  const [isLoadingDispatches, setIsLoadingDispatches] = useState(false);
  const [dispatchSearchQuery, setDispatchSearchQuery] = useState('');
  const [dispatchStartDate, setDispatchStartDate] = useState('');
  const [dispatchEndDate, setDispatchEndDate] = useState('');
  const [dispatchTypeFilter, setDispatchTypeFilter] = useState<'ALL' | 'MANUAL' | 'SCHEDULED'>('ALL');
  const [selectedDispatchForOrders, setSelectedDispatchForOrders] = useState<SwadCoinDispatch | null>(null);
  const [batchOrderSearchQuery, setBatchOrderSearchQuery] = useState('');
  const [copiedBatchAll, setCopiedBatchAll] = useState(false);
  const [copiedSingleOrder, setCopiedSingleOrder] = useState<string | null>(null);

  const dispatchStartRef = useRef<HTMLInputElement>(null);
  const dispatchEndRef = useRef<HTMLInputElement>(null);

  const openPicker = (ref: React.RefObject<HTMLInputElement | null>) => {
    if (ref.current) {
      try {
        if (typeof (ref.current as any).showPicker === 'function') {
          (ref.current as any).showPicker();
        } else {
          ref.current.focus();
        }
      } catch (e) {
        ref.current.focus();
      }
    }
  };

  const setPresetRange = (preset: 'today' | '7days' | '30days' | 'clear') => {
    if (preset === 'clear') {
      setDispatchStartDate('');
      setDispatchEndDate('');
      return;
    }
    const now = new Date();
    const toISO = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    const endStr = toISO(now);
    if (preset === 'today') {
      setDispatchStartDate(endStr);
      setDispatchEndDate(endStr);
    } else if (preset === '7days') {
      const start = new Date();
      start.setDate(start.getDate() - 7);
      setDispatchStartDate(toISO(start));
      setDispatchEndDate(endStr);
    } else if (preset === '30days') {
      const start = new Date();
      start.setDate(start.getDate() - 30);
      setDispatchStartDate(toISO(start));
      setDispatchEndDate(endStr);
    }
  };

  const loadDispatchHistory = async () => {
    setIsLoadingDispatches(true);
    try {
      let logs: SwadCoinDispatch[] = [];
      // 1. Try Backend API
      try {
        logs = await fetchSwadCoinDispatches(token || undefined);
      } catch (apiErr) {
        console.warn('API dispatch fetch note, trying direct Supabase fallback:', apiErr);
      }

      // 2. Direct Supabase Query Fallback (if API was empty or failed)
      if ((!logs || logs.length === 0) && isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from('swad_coins_dispatch')
            .select('*')
            .order('run_at', { ascending: false });

          if (!error && Array.isArray(data) && data.length > 0) {
            logs = data.map((d: any) => ({
              id: d.id,
              runAt: d.run_at || new Date().toISOString(),
              run_at: d.run_at,
              runType: (d.run_type || 'MANUAL') as any,
              run_type: d.run_type || 'MANUAL',
              ordersProcessed: Number(d.orders_processed || 0),
              orders_processed: Number(d.orders_processed || 0),
              ordersScanned: Number(d.orders_scanned || 0),
              orders_scanned: Number(d.orders_scanned || 0),
              ordersSkipped: Number(d.orders_skipped || 0),
              orders_skipped: Number(d.orders_skipped || 0),
              coinsIssued: Number(d.coins_issued || 0),
              coins_issued: Number(d.coins_issued || 0),
              syncedCount: Number(d.synced_count || 0),
              synced_count: Number(d.synced_count || 0),
              orderIds: Array.isArray(d.order_ids) ? d.order_ids : [],
              order_ids: Array.isArray(d.order_ids) ? d.order_ids : [],
              status: d.status || 'SUCCESS',
              notes: d.notes || '',
            }));
          }
        } catch (dbErr) {
          console.warn('Direct Supabase dispatch fetch note:', dbErr);
        }
      }

      setDispatchLogs(logs || []);
    } catch (err) {
      console.warn('Failed to fetch swad coin dispatch history:', err);
    } finally {
      setIsLoadingDispatches(false);
    }
  };

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
        loadDispatchHistory();
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
    loadDispatchHistory();
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
                          <code className="break-all">ALTER TABLE public.swad_coin_rewards DISABLE ROW LEVEL SECURITY; ALTER TABLE public.swad_coin_transactions DISABLE ROW LEVEL SECURITY; ALTER TABLE public.swad_coins_dispatch DISABLE ROW LEVEL SECURITY;</code>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(
                                'ALTER TABLE public.swad_coin_rewards DISABLE ROW LEVEL SECURITY;\nALTER TABLE public.swad_coin_transactions DISABLE ROW LEVEL SECURITY;\nALTER TABLE public.swad_coins_dispatch DISABLE ROW LEVEL SECURITY;'
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

            {/* Swad Coins Dispatch Audit History List */}
            <div className="mt-6 pt-6 border-t border-stone-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h4 className="text-sm font-black text-stone-900 flex items-center gap-2">
                    <Coins className="w-4 h-4 text-amber-600" />
                    Reward Dispatch Audit History
                    <span className="text-[11px] font-semibold text-stone-500 px-2 py-0.5 bg-stone-100 rounded-full border border-stone-200">
                      Table: swad_coins_dispatch
                    </span>
                  </h4>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Records every execution where eligible rewards were successfully written to Supabase (count &gt; 0).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadDispatchHistory}
                  disabled={isLoadingDispatches}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-700 hover:text-stone-900 transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDispatches ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {/* Filters: Search, Full-Click Date Range & Run Type */}
              <div className="space-y-2.5 mb-4">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
                  {/* Search */}
                  <div className="lg:col-span-4 relative">
                    <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={dispatchSearchQuery}
                      onChange={(e) => setDispatchSearchQuery(e.target.value)}
                      placeholder="Search by Order ID, batch ID, or notes..."
                      className="w-full pl-9 pr-7 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                    {dispatchSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setDispatchSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Date Range Selector: From & To Full-Clickable inputs */}
                  <div className="lg:col-span-5 flex items-center gap-1.5 bg-stone-50/80 p-1 rounded-xl border border-stone-200">
                    {/* From Date Box */}
                    <div
                      onClick={() => openPicker(dispatchStartRef)}
                      className={`relative flex-1 flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer select-none ${
                        dispatchStartDate
                          ? 'bg-amber-50/90 border-amber-300 text-amber-950 font-bold shadow-2xs'
                          : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
                      }`}
                      title="Click anywhere to select From Date"
                    >
                      <div className="flex items-center gap-1.5 min-w-0 pointer-events-none">
                        <Calendar className={`w-3.5 h-3.5 shrink-0 ${dispatchStartDate ? 'text-amber-700' : 'text-stone-400'}`} />
                        <span className="text-[11px] truncate">
                          {dispatchStartDate ? (
                            <span><span className="text-stone-400 font-normal mr-1">From:</span>{dispatchStartDate}</span>
                          ) : (
                            <span className="text-stone-400">From Date</span>
                          )}
                        </span>
                      </div>
                      <input
                        ref={dispatchStartRef}
                        type="date"
                        value={dispatchStartDate}
                        onChange={(e) => setDispatchStartDate(e.target.value)}
                        className="full-click-date-input"
                        title="Click to select From Date"
                      />
                    </div>

                    <span className="text-xs text-stone-400 font-semibold px-0.5">→</span>

                    {/* To Date Box */}
                    <div
                      onClick={() => openPicker(dispatchEndRef)}
                      className={`relative flex-1 flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer select-none ${
                        dispatchEndDate
                          ? 'bg-amber-50/90 border-amber-300 text-amber-950 font-bold shadow-2xs'
                          : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
                      }`}
                      title="Click anywhere to select To Date"
                    >
                      <div className="flex items-center gap-1.5 min-w-0 pointer-events-none">
                        <Calendar className={`w-3.5 h-3.5 shrink-0 ${dispatchEndDate ? 'text-amber-700' : 'text-stone-400'}`} />
                        <span className="text-[11px] truncate">
                          {dispatchEndDate ? (
                            <span><span className="text-stone-400 font-normal mr-1">To:</span>{dispatchEndDate}</span>
                          ) : (
                            <span className="text-stone-400">To Date</span>
                          )}
                        </span>
                      </div>
                      <input
                        ref={dispatchEndRef}
                        type="date"
                        value={dispatchEndDate}
                        onChange={(e) => setDispatchEndDate(e.target.value)}
                        className="full-click-date-input"
                        title="Click to select To Date"
                      />
                    </div>

                    {/* Clear date range if either is set */}
                    {(dispatchStartDate || dispatchEndDate) && (
                      <button
                        type="button"
                        onClick={() => {
                          setDispatchStartDate('');
                          setDispatchEndDate('');
                        }}
                        title="Clear date range"
                        className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors shrink-0 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Run Type Filter */}
                  <div className="lg:col-span-3">
                    <select
                      value={dispatchTypeFilter}
                      onChange={(e) => setDispatchTypeFilter(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 cursor-pointer"
                    >
                      <option value="ALL">All Run Types</option>
                      <option value="MANUAL">Manual Run</option>
                      <option value="SCHEDULED">Scheduled (Cron)</option>
                    </select>
                  </div>
                </div>

                {/* Quick Date Range Presets */}
                <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                  <span className="text-stone-400 font-medium mr-1">Quick Range:</span>
                  <button
                    type="button"
                    onClick={() => setPresetRange('today')}
                    className="px-2.5 py-1 rounded-lg border border-stone-200 bg-white hover:bg-amber-50 hover:border-amber-300 text-stone-700 hover:text-amber-900 font-semibold transition-colors cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetRange('7days')}
                    className="px-2.5 py-1 rounded-lg border border-stone-200 bg-white hover:bg-amber-50 hover:border-amber-300 text-stone-700 hover:text-amber-900 font-semibold transition-colors cursor-pointer"
                  >
                    Last 7 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetRange('30days')}
                    className="px-2.5 py-1 rounded-lg border border-stone-200 bg-white hover:bg-amber-50 hover:border-amber-300 text-stone-700 hover:text-amber-900 font-semibold transition-colors cursor-pointer"
                  >
                    Last 30 Days
                  </button>
                  {(dispatchStartDate || dispatchEndDate) && (
                    <button
                      type="button"
                      onClick={() => setPresetRange('clear')}
                      className="px-2.5 py-1 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-semibold transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      Reset Dates
                    </button>
                  )}
                </div>
              </div>

              {/* Table / Dispatch Records */}
              {isLoadingDispatches ? (
                <div className="py-10 text-center text-xs text-stone-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
                  Loading dispatch history from database...
                </div>
              ) : (() => {
                const filtered = dispatchLogs.filter((d) => {
                  const runDate = (d.runAt || (d as any).run_at || '').slice(0, 10);
                  if (dispatchStartDate && runDate < dispatchStartDate) {
                    return false;
                  }
                  if (dispatchEndDate && runDate > dispatchEndDate) {
                    return false;
                  }
                  const runType = (d.runType || (d as any).run_type || 'MANUAL').toUpperCase();
                  if (dispatchTypeFilter !== 'ALL' && runType !== dispatchTypeFilter) {
                    return false;
                  }
                  if (dispatchSearchQuery.trim()) {
                    const q = dispatchSearchQuery.toLowerCase().trim();
                    const idMatch = (d.id || '').toLowerCase().includes(q);
                    const notesMatch = (d.notes || '').toLowerCase().includes(q);
                    const orderIds = Array.isArray(d.orderIds)
                      ? d.orderIds
                      : Array.isArray((d as any).order_ids)
                      ? (d as any).order_ids
                      : [];
                    const orderMatch = orderIds.some((oid: string) => String(oid).toLowerCase().includes(q));
                    if (!idMatch && !notesMatch && !orderMatch) {
                      return false;
                    }
                  }
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="py-8 px-4 text-center rounded-2xl bg-stone-50/80 border border-stone-200 text-xs text-stone-500">
                      {dispatchLogs.length === 0 ? (
                        <>
                          <Clock className="w-6 h-6 text-stone-400 mx-auto mb-2" />
                          <p className="font-bold text-stone-700">No dispatch runs recorded yet</p>
                          <p className="text-[11px] text-stone-500 mt-1 max-w-md mx-auto">
                            Dispatches are recorded automatically when the reward scheduler runs (manual or 04:00 AM cron) and writes order rewards to Supabase (written count &gt; 0).
                          </p>
                        </>
                      ) : (
                        <>
                          <Filter className="w-5 h-5 text-stone-400 mx-auto mb-1.5" />
                          <p className="font-bold text-stone-700">No matching dispatch runs found</p>
                          <p className="text-[11px] text-stone-500 mt-0.5">Try clearing the search query or date range filter.</p>
                        </>
                      )}
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-stone-50/90 text-stone-600 font-bold border-b border-stone-200">
                          <th className="py-3 px-3.5">Run Time</th>
                          <th className="py-3 px-3.5">Type</th>
                          <th className="py-3 px-3.5 text-center">Orders Rewarded</th>
                          <th className="py-3 px-3.5 text-center">Coins Issued</th>
                          <th className="py-3 px-3.5 text-center">Supabase Synced</th>
                          <th className="py-3 px-3.5">Rewarded Orders</th>
                          <th className="py-3 px-3.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {filtered.map((log) => {
                          const dateStr = log.runAt || (log as any).run_at || new Date().toISOString();
                          const runType = (log.runType || (log as any).run_type || 'MANUAL').toUpperCase();
                          const ordersCount = log.ordersProcessed ?? (log as any).orders_processed ?? 0;
                          const coinsCount = log.coinsIssued ?? (log as any).coins_issued ?? 0;
                          const syncedCount = log.syncedCount ?? (log as any).synced_count ?? 0;
                          const orderIds: string[] = Array.isArray(log.orderIds)
                            ? log.orderIds
                            : Array.isArray((log as any).order_ids)
                            ? (log as any).order_ids
                            : [];

                          return (
                            <tr key={log.id} className="hover:bg-amber-50/30 transition-colors">
                              <td className="py-3 px-3.5 whitespace-nowrap">
                                <div className="font-bold text-stone-900">
                                  {new Date(dateStr).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </div>
                                <div className="text-[11px] text-stone-400 font-mono">
                                  {new Date(dateStr).toLocaleTimeString('en-IN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                  })}
                                </div>
                              </td>

                              <td className="py-3 px-3.5 whitespace-nowrap">
                                {runType === 'SCHEDULED' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-bold">
                                    <Clock className="w-3 h-3" />
                                    Cron (4 AM)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200 text-[11px] font-bold">
                                    <Play className="w-3 h-3" />
                                    Manual
                                  </span>
                                )}
                              </td>

                              <td className="py-3 px-3.5 text-center whitespace-nowrap font-bold text-stone-800">
                                <span className="inline-block px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 border border-stone-200 font-mono">
                                  {ordersCount}
                                </span>
                              </td>

                              <td className="py-3 px-3.5 text-center whitespace-nowrap">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-bold border border-amber-200 font-mono">
                                  <Coins className="w-3 h-3 text-amber-600" />
                                  +{coinsCount}
                                </span>
                              </td>

                              <td className="py-3 px-3.5 text-center whitespace-nowrap">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 font-mono">
                                  <CheckCircle className="w-3 h-3 text-emerald-600" />
                                  {syncedCount}
                                </span>
                              </td>

                              <td className="py-3 px-3.5">
                                {orderIds.length > 0 ? (
                                  <div className="flex items-center gap-1.5 flex-wrap max-w-sm">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedDispatchForOrders(log)}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition-all shadow-2xs cursor-pointer group"
                                      title="Click to inspect all order IDs in this batch"
                                    >
                                      <Eye className="w-3.5 h-3.5 text-amber-700 group-hover:scale-110 transition-transform" />
                                      <span>{orderIds.length} Order{orderIds.length > 1 ? 's' : ''}</span>
                                    </button>

                                    {orderIds.slice(0, 2).map((oid, idx) => (
                                      <span
                                        key={idx}
                                        className="px-1.5 py-0.5 bg-stone-100 text-stone-700 rounded text-[10px] font-mono border border-stone-200"
                                      >
                                        {oid}
                                      </span>
                                    ))}

                                    {orderIds.length > 2 && (
                                      <button
                                        type="button"
                                        onClick={() => setSelectedDispatchForOrders(log)}
                                        className="px-1.5 py-0.5 bg-stone-200 hover:bg-amber-200 text-stone-700 hover:text-amber-900 rounded text-[10px] font-bold transition-colors cursor-pointer"
                                        title={`Click to view all ${orderIds.length} orders`}
                                      >
                                        +{orderIds.length - 2} more
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-stone-400 italic">None logged</span>
                                )}
                              </td>

                              <td className="py-3 px-3.5 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                    log.status === 'SUCCESS'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-amber-50 text-amber-800 border-amber-200'
                                  }`}
                                >
                                  {log.status === 'SUCCESS' ? 'SUCCESS' : 'PARTIAL'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
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
      {/* 6. Rewarded Orders Batch Detail Modal */}
      {selectedDispatchForOrders && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-stone-200 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center border border-amber-200 shrink-0 mt-0.5">
                  <Coins className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-stone-900 text-base">
                      Rewarded Orders in Batch
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        (selectedDispatchForOrders.runType || (selectedDispatchForOrders as any).run_type) === 'SCHEDULED'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-sky-50 text-sky-700 border-sky-200'
                      }`}
                    >
                      {(selectedDispatchForOrders.runType || (selectedDispatchForOrders as any).run_type) === 'SCHEDULED'
                        ? 'Cron (4 AM)'
                        : 'Manual Run'}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-1">
                    Run on{' '}
                    {new Date(
                      selectedDispatchForOrders.runAt || (selectedDispatchForOrders as any).run_at || ''
                    ).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}{' '}
                    •{' '}
                    <strong className="text-stone-800 font-semibold">
                      {selectedDispatchForOrders.coinsIssued ?? (selectedDispatchForOrders as any).coins_issued ?? 0} Swad Coins
                    </strong>{' '}
                    distributed across{' '}
                    <strong className="text-stone-800 font-semibold">
                      {(selectedDispatchForOrders.orderIds || (selectedDispatchForOrders as any).order_ids || []).length} Orders
                    </strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedDispatchForOrders(null);
                  setBatchOrderSearchQuery('');
                }}
                className="w-8 h-8 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Controls: Search & Copy All */}
            <div className="p-4 bg-stone-50 border-b border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={batchOrderSearchQuery}
                  onChange={(e) => setBatchOrderSearchQuery(e.target.value)}
                  placeholder="Filter order ID in batch (e.g. #00035)..."
                  className="w-full pl-9 pr-7 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
                {batchOrderSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setBatchOrderSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                <span className="text-xs text-stone-500 font-medium whitespace-nowrap">
                  {(() => {
                    const all: string[] =
                      selectedDispatchForOrders.orderIds || (selectedDispatchForOrders as any).order_ids || [];
                    const filtered = all.filter((oid) =>
                      oid.toLowerCase().includes(batchOrderSearchQuery.toLowerCase().trim())
                    );
                    return `${filtered.length} of ${all.length} orders`;
                  })()}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    const all: string[] =
                      selectedDispatchForOrders.orderIds || (selectedDispatchForOrders as any).order_ids || [];
                    navigator.clipboard.writeText(all.join(', '));
                    setCopiedBatchAll(true);
                    setTimeout(() => setCopiedBatchAll(false), 2000);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-stone-100 border border-stone-200 rounded-xl text-xs font-bold text-stone-700 transition-colors shadow-2xs cursor-pointer"
                >
                  {copiedBatchAll ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied All!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-stone-500" />
                      <span>Copy All ({((selectedDispatchForOrders.orderIds || (selectedDispatchForOrders as any).order_ids || []) as string[]).length})</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Modal Orders List / Grid */}
            <div className="p-5 overflow-y-auto max-h-96">
              {(() => {
                const allOrders: string[] =
                  selectedDispatchForOrders.orderIds || (selectedDispatchForOrders as any).order_ids || [];
                const filteredOrders = allOrders.filter((oid) =>
                  oid.toLowerCase().includes(batchOrderSearchQuery.toLowerCase().trim())
                );

                if (filteredOrders.length === 0) {
                  return (
                    <div className="py-12 text-center text-xs text-stone-500">
                      <Search className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                      <p className="font-bold text-stone-700">No matching orders found</p>
                      <p className="text-[11px] text-stone-400 mt-1">Try clearing your search term</p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {filteredOrders.map((orderId, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-2xl bg-stone-50/70 border border-stone-200 hover:border-amber-300 hover:bg-amber-50/20 transition-all group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-6 h-6 rounded-lg bg-stone-200/70 text-stone-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-mono text-xs font-bold text-stone-900 truncate">
                            {orderId}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(orderId);
                              setCopiedSingleOrder(orderId);
                              setTimeout(() => setCopiedSingleOrder(null), 1500);
                            }}
                            title="Copy Order ID"
                            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors cursor-pointer"
                          >
                            {copiedSingleOrder === orderId ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDispatchForOrders(null);
                              goToOwnerDashboard();
                            }}
                            title="View on Owner Orders Dashboard"
                            className="p-1.5 rounded-lg text-stone-400 hover:text-amber-700 hover:bg-amber-100/70 transition-colors cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-stone-200 bg-stone-50/80 flex items-center justify-between rounded-b-3xl">
              <span className="text-[11px] text-stone-500 font-medium">
                Tip: Click the copy icon next to any order ID, or use "Copy All" to export for auditing.
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedDispatchForOrders(null);
                  setBatchOrderSearchQuery('');
                }}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </OwnerLayout>
  );
};
