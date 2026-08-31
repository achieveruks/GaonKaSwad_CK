import React, { useState, useEffect } from 'react';
import { OwnerLayout } from './OwnerLayout';
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
  Sparkles,
  RefreshCw,
  AlertCircle,
  Calendar,
  IndianRupee,
  Lock,
  Globe,
  Store,
} from 'lucide-react';

export const CouponsPage: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [couponRedemptionsMap, setCouponRedemptionsMap] = useState<Record<string, { count: number; totalDiscount: number }>>({});
  const [stats, setStats] = useState<{ totalCoupons: number; activeCoupons: number; totalRedemptions: number; totalDiscountGiven: number }>({
    totalCoupons: 0,
    activeCoupons: 0,
    totalRedemptions: 0,
    totalDiscountGiven: 0,
  });
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

  useEffect(() => {
    loadData();
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
    if (!window.confirm('Are you sure you want to delete this coupon? This action cannot be undone.')) {
      return;
    }
    const res = await deleteCouponFromCloud(targetId, couponCode);
    if (res.success) {
      setCoupons((prev) => prev.filter((c) => c.id !== targetId && (!couponCode || c.code !== couponCode)));
      await loadData();
    } else {
      alert(res.error || 'Failed to delete coupon');
    }
  };

  const handleSeedDefaults = async () => {
    if (!window.confirm('Add standard promotional coupon presets to database (GAON15, SWAD15, WELCOME50, FEAST100)?')) {
      return;
    }
    setSaving(true);
    const presets: Partial<Coupon>[] = [
      {
        code: 'GAON15',
        title: '15% Off All Orders',
        description: '15% OFF on orders above ₹499',
        discountType: 'percentage',
        discountValue: 15,
        minOrderValue: 499,
        userEligibility: 'all',
        isActive: true,
      },
      {
        code: 'SWAD15',
        title: 'Flat 15% Bihari Special',
        description: '15% OFF on orders above ₹499 (Bihari Special)',
        discountType: 'percentage',
        discountValue: 15,
        minOrderValue: 499,
        userEligibility: 'all',
        isActive: true,
      },
      {
        code: 'WELCOME50',
        title: 'Flat ₹50 First Order',
        description: 'Flat ₹50 OFF on first order (min order ₹299)',
        discountType: 'fixed',
        discountValue: 50,
        minOrderValue: 299,
        userEligibility: 'first_order',
        isActive: true,
      },
      {
        code: 'FEAST100',
        title: 'Party Feast ₹100 Off',
        description: 'Flat ₹100 OFF on party orders above ₹899',
        discountType: 'fixed',
        discountValue: 100,
        minOrderValue: 899,
        userEligibility: 'all',
        isActive: true,
      },
    ];

    for (const preset of presets) {
      await saveCouponToCloud(preset);
    }
    await loadData();
    setSaving(false);
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
      title="Coupons & Promotional Offers"
      subtitle="Create, configure, and monitor discount campaigns, welcome offers, and order incentives."
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSeedDefaults}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-stone-300"
            title="Seed standard promo codes"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Load Default Offers</span>
          </button>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-800 hover:bg-amber-900 active:bg-amber-950 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Coupon</span>
          </button>
        </div>
      }
    >
      {/* 1. Quick Stats Banner */}
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

      {/* 2. Search & Filter Bar */}
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
    </OwnerLayout>
  );
};
