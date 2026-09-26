import React, { useState, useEffect, useMemo } from 'react';
import { OwnerLayout } from './OwnerLayout';
import { useProducts } from '../../context/ProductContext';
import { useNavigation } from '../../context/NavigationContext';
import { useAuth } from '../../context/AuthContext';
import { getDashboardStats } from '../../lib/products';
import { DashboardStats, Product, Outlet, DeliveryZone, Order } from '../../types';
import { getOutlets, getDeliveryZones } from '../../lib/locationService';
import { fetchSupabaseOrders } from '../../lib/supabaseService';
import { CloudDatabaseStatus } from '../../components/CloudDatabaseStatus';
import {
  UtensilsCrossed,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Flame,
  Layers,
  Edit2,
  Eye,
  EyeOff,
  RefreshCw,
  Store,
  MapPin,
  Building,
  ShoppingBag,
  IndianRupee,
  Clock,
  Calendar,
  ChevronDown,
  X,
  Filter,
} from 'lucide-react';

type DatePreset = 'all' | 'today' | '7d' | '30d' | 'custom';

export const OwnerDashboardPage: React.FC = () => {
  const { allProducts, toggleActive, refreshProducts } = useProducts();
  const { token } = useAuth();
  const {
    goToOwnerProducts,
    goToOwnerEditProduct,
    goToOwnerOutlets,
    goToOwnerDeliveryZones,
  } = useNavigation();

  // Compute live product stats directly from catalog state as reliable baseline
  const activeProdsCount = allProducts.filter((p) => p.active !== false).length;
  const outOfStockCount = allProducts.filter((p) => {
    if (p.inStock === false) return true;
    if (Array.isArray(p.outlets) && p.outlets.length > 0) {
      return p.outlets.some((o) => o.inStock === false || o.portionsLeft === 0);
    }
    return false;
  }).length;

  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: allProducts.length,
    activeProducts: activeProdsCount,
    outOfStockProducts: outOfStockCount,
    featuredProducts: allProducts.filter((p) => p.featured && p.active !== false).length,
    bestsellerProducts: allProducts.filter((p) => p.bestseller && p.active !== false).length,
  });

  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | number | null>(null);

  // Raw orders list stored for live in-client date filtering
  const [rawOrders, setRawOrders] = useState<Order[]>([]);

  // Date Filter State
  const [dateFilterPreset, setDateFilterPreset] = useState<DatePreset>('all');
  const [customStartDate, setCustomStartDate] = useState<string>(''); // YYYY-MM-DD
  const [customEndDate, setCustomEndDate] = useState<string>(''); // YYYY-MM-DD

  // Sync stats, outlets, and orders
  const loadDashboardData = async () => {
    setLoadingStats(true);
    try {
      // 1. Backend or catalog stats
      if (token) {
        try {
          const data = await getDashboardStats(token);
          if (data && data.totalProducts > 0) {
            setStats(data);
          } else {
            setStats({
              totalProducts: allProducts.length,
              activeProducts: allProducts.filter((p) => p.active !== false).length,
              outOfStockProducts: outOfStockCount,
              featuredProducts: allProducts.filter((p) => p.featured && p.active !== false).length,
              bestsellerProducts: allProducts.filter((p) => p.bestseller && p.active !== false).length,
            });
          }
        } catch {
          // fallback handled by local computation
        }
      }

      // 2. Fetch Outlets & Delivery Zones
      const [fetchedOutlets, fetchedZones] = await Promise.all([
        getOutlets(true, token || undefined),
        getDeliveryZones(true, token || undefined),
      ]);
      setOutlets(Array.isArray(fetchedOutlets) ? fetchedOutlets : []);
      setZones(Array.isArray(fetchedZones) ? fetchedZones : []);

      // 3. Fetch Orders for Order & Revenue performance
      let loadedOrders: Order[] = [];
      try {
        const supaOrders = await fetchSupabaseOrders();
        if (Array.isArray(supaOrders) && supaOrders.length > 0) {
          loadedOrders = supaOrders;
        } else {
          const res = await fetch('/api/orders');
          if (res.ok) {
            const j = await res.json();
            if (j.success && Array.isArray(j.orders)) {
              loadedOrders = j.orders;
            }
          }
        }
      } catch (orderErr) {
        console.warn('Dashboard orders fetch notice:', orderErr);
      }

      setRawOrders(loadedOrders);
    } catch (err) {
      console.warn('Using computed stats fallback:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [token, allProducts.length]);

  // Helpers for date filtering identical to OutletsPage
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDaysAgoStr = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Format YYYY-MM-DD to DD/MM/YYYY for UI display
  const formatToDDMMYYYY = (isoStr: string): string => {
    if (!isoStr) return '';
    const parts = isoStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return isoStr;
  };

  const handleSetFilter = (preset: 'all' | 'today' | '7d' | '30d') => {
    setDateFilterPreset(preset);
    if (preset === 'all') {
      setCustomStartDate('');
      setCustomEndDate('');
    } else if (preset === 'today') {
      const today = getTodayStr();
      setCustomStartDate(today);
      setCustomEndDate(today);
    } else if (preset === '7d') {
      setCustomStartDate(getDaysAgoStr(7));
      setCustomEndDate(getTodayStr());
    } else if (preset === '30d') {
      setCustomStartDate(getDaysAgoStr(30));
      setCustomEndDate(getTodayStr());
    }
  };

  const handleDateChange = (type: 'start' | 'end', value: string) => {
    setDateFilterPreset('custom');
    if (type === 'start') {
      setCustomStartDate(value);
    } else {
      setCustomEndDate(value);
    }
  };

  const triggerDatePicker = (e: React.MouseEvent<HTMLDivElement>) => {
    const input = e.currentTarget.querySelector('input[type="date"]') as HTMLInputElement | null;
    if (input && typeof input.showPicker === 'function') {
      try {
        input.showPicker();
      } catch {
        input.focus();
      }
    }
  };

  const isOrderInDateRange = (
    rawCreatedAt: string | undefined,
    startDate?: string,
    endDate?: string
  ) => {
    if (!startDate && !endDate) return true;
    if (!rawCreatedAt) return false;
    try {
      const d = new Date(rawCreatedAt);
      if (isNaN(d.getTime())) return false;
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const orderDateStr = `${year}-${month}-${day}`;

      if (startDate && orderDateStr < startDate) return false;
      if (endDate && orderDateStr > endDate) return false;
      return true;
    } catch {
      return false;
    }
  };

  // Filtered orders & revenue calculation
  const filteredMetrics = useMemo(() => {
    let orderCount = 0;
    let deliveredCount = 0;
    let deliveredRevenue = 0;
    let inProcessCount = 0;
    let inProcessRevenue = 0;
    let cancelledCount = 0;
    let cancelledRevenue = 0;
    let grossRevenue = 0;
    let avgOrderValue = 0;

    rawOrders.forEach((o) => {
      const rawDateStr = o.createdAt || o.placedAt;
      if (!isOrderInDateRange(rawDateStr, customStartDate, customEndDate)) {
        return;
      }

      orderCount++;
      const st = String(o.status || o.orderStatus || '').toLowerCase();
      const total = Number(o.total || 0);

      if (st === 'cancelled') {
        cancelledCount++;
        cancelledRevenue += total;
      } else if (st === 'delivered') {
        deliveredCount++;
        deliveredRevenue += total;
        grossRevenue += total;
      } else {
        // InProcess: not delivered and not cancelled (pending, confirmed, preparing, ready, out for delivery)
        inProcessCount++;
        inProcessRevenue += total;
        grossRevenue += total;
      }
    });

    const validRevenueOrders = deliveredCount + inProcessCount;
    if (validRevenueOrders > 0) {
      avgOrderValue = Math.round(grossRevenue / validRevenueOrders);
    }

    return {
      orderCount,
      validOrderCount: validRevenueOrders,
      deliveredCount,
      deliveredRevenue,
      inProcessCount,
      inProcessRevenue,
      cancelledCount,
      cancelledRevenue,
      grossRevenue,
      avgOrderValue,
      isFiltered: Boolean(customStartDate || customEndDate || dateFilterPreset !== 'all'),
    };
  }, [rawOrders, customStartDate, customEndDate, dateFilterPreset]);

  const handleToggleActive = async (id: string | number) => {
    setActionLoadingId(id);
    try {
      await toggleActive(id);
    } catch (err) {
      console.error('Failed to toggle active status:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const safeOutlets = Array.isArray(outlets) ? outlets : [];
  const safeZones = Array.isArray(zones) ? zones : [];
  const recentProducts = allProducts.slice(0, 6);
  const activeOutlets = safeOutlets.filter((o) => o.isActive).length;
  const uniqueCities = Array.from(new Set(safeOutlets.map((o) => o.city).filter(Boolean)));
  const totalPinsCovered = new Set(safeZones.flatMap((z) => z.pinCodes || [])).size;

  // Real catalog product counts
  const liveTotalDishes = allProducts.length || stats.totalProducts || 0;
  const liveActiveDishes = allProducts.length > 0 ? activeProdsCount : stats.activeProducts;
  const liveOutOfStock = allProducts.length > 0 ? outOfStockCount : stats.outOfStockProducts;

  return (
    <OwnerLayout
      activeTab="dashboard"
      title="Owner Dashboard"
      subtitle="Overview of cloud kitchen live catalog, order volume, revenue, and store operations."
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              refreshProducts();
              loadDashboardData();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl border border-gray-200 shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-gray-500 ${loadingStats ? 'animate-spin' : ''}`} />
            <span>Sync Dashboard</span>
          </button>
        </div>
      }
    >
      {/* Supabase Cloud Database Status & Migration Tool */}
      <CloudDatabaseStatus />

      {/* 1. Metric Cards Grid: All 3 blocks in One horizontal row (1 & 2 half width, 3 alone half width for desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3.5 items-stretch">
        {/* Block 1: Kitchen Outlets & Coverage (Operational footprint) */}
        <div
          onClick={goToOwnerOutlets}
          className="col-span-1 md:col-span-1 lg:col-span-3 bg-white rounded-2xl border border-gray-200 p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between hover:border-amber-300 transition-colors cursor-pointer group"
          title="Click to view Kitchen Outlets & Delivery Zones"
        >
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Outlets & Coverage
              </span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Store className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-900 leading-tight">
                {safeOutlets.length}
              </span>
              <span className="text-[11px] text-amber-700 font-semibold truncate">
                {activeOutlets} active • {uniqueCities.length} {uniqueCities.length === 1 ? 'city' : 'cities'}
              </span>
            </div>
          </div>
          <div className="pt-2 mt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 font-medium">
            <span className="flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
              <span className="truncate">{totalPinsCovered} PINs in {safeZones.length} zones</span>
            </span>
            <ArrowRight className="w-3 h-3 text-gray-400 group-hover:text-amber-800 transition-colors shrink-0" />
          </div>
        </div>

        {/* Block 2: Live Menu Dishes & Stock Status (Inventory health) */}
        <div
          onClick={goToOwnerProducts}
          className="col-span-1 md:col-span-1 lg:col-span-3 bg-white rounded-2xl border border-gray-200 p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between hover:border-blue-300 transition-colors cursor-pointer group"
          title="Click to manage Menu Dishes & Inventory Stock"
        >
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Menu & Stock Status
              </span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <UtensilsCrossed className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-gray-900 leading-tight">
                {liveTotalDishes}
              </span>
              <span className="text-[11px] text-blue-700 font-semibold truncate">
                {liveActiveDishes} active dishes
              </span>
            </div>
          </div>
          <div className="pt-2 mt-2 border-t border-gray-100 flex items-center justify-between text-[11px] font-medium">
            {liveOutOfStock > 0 ? (
              <span className="flex items-center gap-1 text-rose-600 font-semibold truncate">
                <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                <span className="truncate">{liveOutOfStock} out of stock</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-600 font-semibold truncate">
                <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                <span className="truncate">All items in stock</span>
              </span>
            )}
            <ArrowRight className="w-3 h-3 text-gray-400 group-hover:text-blue-700 transition-colors shrink-0" />
          </div>
        </div>

        {/* Block 3: Orders & Revenue - Compact with One-Liner Date Filter */}
        <div className="col-span-1 md:col-span-2 lg:col-span-6 bg-white rounded-2xl border border-gray-200 p-3 sm:p-3.5 shadow-2xs flex flex-col justify-between space-y-2">
          {/* Header Row: Title & Avg Order Badge on Left, One-Liner Date Filter on Right */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-1.5 border-b border-gray-100">
            {/* Title & Icon & Avg Order Badge */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-3.5 h-3.5" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                  Orders & Revenue
                </span>
                {filteredMetrics.isFiltered && (
                  <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded-full uppercase">
                    Filtered
                  </span>
                )}
              </div>
            </div>

            {/* All filter options in One Liner (right top) */}
            <div className="flex items-center gap-1 text-[10px] flex-nowrap overflow-x-auto sm:overflow-visible justify-end">
              {/* Preset Buttons */}
              <div className="inline-flex items-center bg-stone-200/80 p-0.5 rounded-lg text-[9px] font-bold gap-0.5 shrink-0">
                {(['all', 'today', '7d', '30d'] as const).map((preset) => {
                  const labelMap = { all: 'All', today: 'Today', '7d': '7D', '30d': '30D' };
                  const isSelected = dateFilterPreset === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleSetFilter(preset)}
                      className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-800 text-white shadow-2xs font-extrabold'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      {labelMap[preset]}
                    </button>
                  );
                })}
              </div>

              {/* Start Date */}
              <div
                onClick={triggerDatePicker}
                className={`relative flex items-center justify-between px-1.5 py-0.5 rounded-md border text-[10px] font-mono cursor-pointer transition-all shrink-0 ${
                  customStartDate
                    ? 'bg-amber-50 border-amber-300 text-amber-950 font-bold'
                    : 'bg-white border-stone-200 text-stone-500 hover:border-amber-400'
                }`}
                title="Click anywhere to select Start Date (dd/mm/yyyy)"
              >
                <span className="truncate max-w-[68px]">
                  {customStartDate ? formatToDDMMYYYY(customStartDate) : 'From Date'}
                </span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => handleDateChange('start', e.target.value)}
                  className="full-click-date-input"
                  title="Click to select Start Date"
                />
              </div>

              <span className="text-stone-400 text-[10px] font-bold shrink-0">→</span>

              {/* End Date */}
              <div
                onClick={triggerDatePicker}
                className={`relative flex items-center justify-between px-1.5 py-0.5 rounded-md border text-[10px] font-mono cursor-pointer transition-all shrink-0 ${
                  customEndDate
                    ? 'bg-amber-50 border-amber-300 text-amber-950 font-bold'
                    : 'bg-white border-stone-200 text-stone-500 hover:border-amber-400'
                }`}
                title="Click anywhere to select End Date (dd/mm/yyyy)"
              >
                <span className="truncate max-w-[68px]">
                  {customEndDate ? formatToDDMMYYYY(customEndDate) : 'To Date'}
                </span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => handleDateChange('end', e.target.value)}
                  className="full-click-date-input"
                  title="Click to select End Date"
                />
              </div>

              {/* Reset / Clear button */}
              {(customStartDate || customEndDate) && (
                <button
                  type="button"
                  onClick={() => handleSetFilter('all')}
                  className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-md transition-colors shrink-0 cursor-pointer"
                  title="Clear date filter (show all)"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* 4-Column Stat Display: Revenue, Delivered, In Process, Cancelled */}
          <div className="grid grid-cols-4 gap-1.5 text-center divide-x divide-gray-100 py-1">
            {/* 1. Revenue: Valid Revenue, below value: (n) active orders */}
            <div className="px-1">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight block">
                Revenue
              </span>
              <span className="text-xs sm:text-sm font-black text-stone-900 block leading-tight mt-0.5">
                ₹{filteredMetrics.grossRevenue.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] font-medium text-stone-500 block leading-tight mt-0.5">
                {filteredMetrics.validOrderCount} {filteredMetrics.validOrderCount === 1 ? 'order' : 'orders'}
              </span>
            </div>

            {/* 2. Delivered: Delivered Revenue, below value: (n) orders */}
            <div className="px-1">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-tight block">
                Delivered
              </span>
              <span className="text-xs sm:text-sm font-black text-emerald-700 block leading-tight mt-0.5">
                ₹{filteredMetrics.deliveredRevenue.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] font-medium text-emerald-700 block leading-tight mt-0.5">
                {filteredMetrics.deliveredCount} {filteredMetrics.deliveredCount === 1 ? 'order' : 'orders'}
              </span>
            </div>

            {/* 3. In Process: Not delivered not cancelled, below value: (n) orders */}
            <div className="px-1">
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-tight block">
                In Process
              </span>
              <span className="text-xs sm:text-sm font-black text-amber-800 block leading-tight mt-0.5">
                ₹{filteredMetrics.inProcessRevenue.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] font-medium text-amber-700 block leading-tight mt-0.5">
                {filteredMetrics.inProcessCount} {filteredMetrics.inProcessCount === 1 ? 'order' : 'orders'}
              </span>
            </div>

            {/* 4. Cancelled: Cancelled amount, below value: (n) orders */}
            <div className="px-1">
              <span className="text-[10px] font-bold text-rose-600 uppercase tracking-tight block">
                Cancelled
              </span>
              <span className="text-xs sm:text-sm font-black text-rose-600 block leading-tight mt-0.5">
                ₹{filteredMetrics.cancelledRevenue.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] font-medium text-rose-600 block leading-tight mt-0.5">
                {filteredMetrics.cancelledCount} {filteredMetrics.cancelledCount === 1 ? 'order' : 'orders'}
              </span>
            </div>
          </div>

          {/* Footer Line: Avg Order Value info & Date Filter status */}
          <div className="pt-1.5 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-500 font-medium">
            <div className="flex items-center gap-1.5 text-blue-900">
              <span className="text-gray-500">Avg Order Value (AOV):</span>
              <span className="font-extrabold text-blue-950">₹{filteredMetrics.avgOrderValue.toLocaleString('en-IN')} / order</span>
            </div>
            <span className="text-gray-400">
              {filteredMetrics.isFiltered
                ? customStartDate && customEndDate
                  ? `${formatToDDMMYYYY(customStartDate)} - ${formatToDDMMYYYY(customEndDate)}`
                  : 'Filtered'
                : 'All-time ledger'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Quick Action Banners */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Outlets Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs space-y-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-gray-900">Manage Kitchen Outlets</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Add new cloud kitchen outlets across Bangalore, Bhubaneswar, and other cities.
            </p>
          </div>
          <button
            type="button"
            onClick={goToOwnerOutlets}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <span>View All {outlets.length} Outlets</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Delivery Zones Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs space-y-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-gray-900">Delivery Zones & PINs</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Map serviceable 6-digit PIN codes, minimum order values, and delivery charges.
            </p>
          </div>
          <button
            type="button"
            onClick={goToOwnerDeliveryZones}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <span>Configure Zones ({zones.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Menu Catalog Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs space-y-3">
          <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-gray-900">Menu Dish Catalog</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Add new dishes, customize culinary stories, adjust prices, or toggle active status.
            </p>
          </div>
          <button
            type="button"
            onClick={goToOwnerProducts}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <span>Manage Catalog ({allProducts.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3. Recent Products Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-extrabold text-base text-gray-900">
              Recent Menu Items
            </h2>
            <p className="text-xs text-gray-500">
              Quickly toggle stock availability and store visibility.
            </p>
          </div>
          <button
            type="button"
            onClick={goToOwnerProducts}
            className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
          >
            <span>View All</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Table on Desktop */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                <th className="py-3 px-4">Dish</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Price</th>
                <th className="py-3 px-3">Served Outlets</th>
                <th className="py-3 px-3">Store Visibility</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {recentProducts.map((product) => {
                const isItemLoading = actionLoadingId === product.id;
                const outletCount = product.outlets ? product.outlets.length : safeOutlets.length;
                const assignedNames = (product.outlets || []).map((o) => {
                  const match = safeOutlets.find((out) => out.id === o.outletId);
                  return match ? match.city || match.name : o.outletId;
                }).join(', ');

                return (
                  <tr key={product.id} className="hover:bg-gray-50/70 transition-colors">
                    {/* Dish name & thumb */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.image}
                          alt={product.name}
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-lg object-cover border border-gray-200 shrink-0"
                        />
                        <div>
                          <p className="font-bold text-gray-900">{product.name}</p>
                          <p className="text-[10px] text-gray-400 font-mono">/{product.slug}</p>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-3">
                      <span className="inline-block bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded capitalize">
                        {product.category}
                      </span>
                    </td>

                    {/* Price */}
                    <td className="py-3 px-3">
                      <div className="font-bold text-gray-900">₹{product.price}</div>
                      {product.originalPrice && (
                        <div className="text-[10px] text-gray-400 line-through">
                          ₹{product.originalPrice}
                        </div>
                      )}
                    </td>

                    {/* Served Outlets (Count) */}
                    <td className="py-3 px-3">
                      <span
                        title={assignedNames || `${outletCount} outlets`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold rounded-md"
                      >
                        ({outletCount}) {outletCount === 1 ? 'outlet' : 'outlets'}
                      </span>
                    </td>

                    {/* Active toggle */}
                    <td className="py-3 px-3">
                      <button
                        type="button"
                        disabled={isItemLoading}
                        onClick={() => handleToggleActive(product.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors cursor-pointer ${
                          product.active !== false
                            ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                            : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                        }`}
                        title="Click to toggle Store Visibility"
                      >
                        {product.active !== false ? (
                          <>
                            <Eye className="w-3 h-3 text-blue-600" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3 text-gray-500" />
                            <span>Inactive</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => goToOwnerEditProduct(product.id)}
                        className="inline-flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-semibold px-2 py-1 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="sm:hidden divide-y divide-gray-100">
          {recentProducts.map((product) => {
            const outletCount = product.outlets ? product.outlets.length : safeOutlets.length;
            const assignedNames = (product.outlets || []).map((o) => {
              const match = safeOutlets.find((out) => out.id === o.outletId);
              return match ? match.city || match.name : o.outletId;
            }).join(', ');

            return (
              <div key={product.id} className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <img
                    src={product.image}
                    alt={product.name}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-lg object-cover border border-gray-200 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-xs truncate">{product.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-gray-500 capitalize">{product.category}</span>
                      <span
                        title={assignedNames || `${outletCount} outlets`}
                        className="text-[10px] bg-amber-50 text-amber-900 border border-amber-200 px-1.5 py-0.2 rounded font-semibold"
                      >
                        ({outletCount}) {outletCount === 1 ? 'outlet' : 'outlets'}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-gray-900 mt-0.5">₹{product.price}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => goToOwnerEditProduct(product.id)}
                    className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(product.id)}
                    className={`w-full py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 border cursor-pointer ${
                      product.active !== false
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-gray-100 text-gray-600 border-gray-200'
                    }`}
                  >
                    {product.active !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>{product.active !== false ? 'Active in Catalog' : 'Hidden / Inactive'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </OwnerLayout>
  );
};

