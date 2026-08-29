import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  User,
  ShoppingBag,
  IndianRupee,
  Utensils,
  Truck,
  Bike,
  Flame,
  AlertCircle,
  XCircle,
  FileText,
  Printer,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Bell,
  Volume2,
  VolumeX,
  Sparkles,
  Package,
  Layers,
  ArrowRight,
  Eye,
  CheckCheck,
  Calendar,
  Zap,
  Wallet,
  EyeOff,
} from 'lucide-react';
import { Order, Outlet } from '../../types';
import {
  formatScheduledAt,
  formatScheduledShortDate,
  getOrderReceivedTimestamp,
  isOrderMatchingDateFilter,
  OrderDateFilterType,
} from '../../utils/dateUtils';
import { fetchSupabaseOrders, updateSupabaseOrderStatus } from '../../lib/supabaseService';
import { ManagerOrderDetailsModal } from './ManagerOrderDetailsModal';
import { CancelOrderModal } from './CancelOrderModal';

interface ManagerOrdersTabProps {
  currentOutlet: Outlet;
  showFeedback: (type: 'success' | 'error', text: string) => void;
}

type StatusFilter =
  | 'all'
  | 'received'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export const ManagerOrdersTab: React.FC<ManagerOrdersTabProps> = ({
  currentOutlet,
  showFeedback,
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Filters & Search
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [orderTypeFilter, setOrderTypeFilter] = useState<'all' | 'delivery' | 'pickup'>('all');
  const [deliveryTimingFilter, setDeliveryTimingFilter] = useState<'all' | 'immediate' | 'scheduled'>('all');
  const [dateFilter, setDateFilter] = useState<OrderDateFilterType>('all');
  const [singleDate, setSingleDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [rangeStartDate, setRangeStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [rangeEndDate, setRangeEndDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  // Wallet privacy visibility (default: closed)
  const [isWalletOpen, setIsWalletOpen] = useState<boolean>(false);

  // Date picker input refs to trigger calendar popup
  const singleDateInputRef = useRef<HTMLInputElement>(null);
  const rangeStartInputRef = useRef<HTMLInputElement>(null);
  const rangeEndInputRef = useRef<HTMLInputElement>(null);

  const openPicker = (ref: React.RefObject<HTMLInputElement>) => {
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


  // Expanded Cards Map
  const [expandedOrderIds, setExpandedOrderIds] = useState<Record<string, boolean>>({});

  // Modals
  const [selectedDetailsOrder, setSelectedDetailsOrder] = useState<Order | null>(null);
  const [cancelTargetOrder, setCancelTargetOrder] = useState<Order | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Notification Sound
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const previousReceivedCountRef = useRef<number>(0);

  // Play notification chime for incoming received orders
  const playChime = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.55);
    } catch {}
  }, [soundEnabled]);

  // Fetch orders
  const loadOrders = useCallback(
    async (isManualRefresh = false) => {
      if (!currentOutlet) return;
      if (isManualRefresh) setIsRefreshing(true);

      try {
        let fetchedList: Order[] = [];

        // 1. Fetch from Supabase
        try {
          fetchedList = await fetchSupabaseOrders(currentOutlet.id);
        } catch (e) {
          console.warn('Supabase orders fetch notice:', e);
        }

        // 2. Fetch/merge from Express backend API
        try {
          const res = await fetch(`/api/orders?outletId=${currentOutlet.id}`);
          if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.orders)) {
              const existingIds = new Set(fetchedList.map((o) => o.orderId || o.id));
              for (const o of data.orders) {
                if (!existingIds.has(o.orderId || o.id)) {
                  fetchedList.push(o);
                }
              }
            }
          }
        } catch (e) {
          console.warn('API orders fetch notice:', e);
        }

        // Sort descending by placedAt/createdAt (received date)
        fetchedList.sort(
          (a, b) => getOrderReceivedTimestamp(b) - getOrderReceivedTimestamp(a)
        );

        // Check for new received orders to trigger chime
        const currentReceivedCount = fetchedList.filter((o) => {
          const st = (o.status || '').toLowerCase();
          const ost = (o.orderStatus || '').toLowerCase();
          return st === 'received' || ost === 'received' || st === 'pending';
        }).length;

        if (
          !isLoading &&
          currentReceivedCount > previousReceivedCountRef.current &&
          previousReceivedCountRef.current >= 0
        ) {
          playChime();
          showFeedback('success', `🔔 New order received! Total new: ${currentReceivedCount}`);
        }
        previousReceivedCountRef.current = currentReceivedCount;

        setOrders(fetchedList);
      } catch (err) {
        console.error('Error fetching manager orders:', err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [currentOutlet, isLoading, playChime, showFeedback]
  );

  // Initial load and periodic polling (every 15 seconds)
  useEffect(() => {
    loadOrders();
    const interval = setInterval(() => {
      loadOrders();
    }, 15000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  // Handle status update
  const handleStatusTransition = async (
    order: Order,
    newStatus: Order['status'],
    cancellationReason?: string
  ) => {
    const targetId = order.orderId || order.id;
    setUpdatingOrderId(targetId);

    try {
      let isSuccess = false;

      // 1. Update Supabase
      try {
        isSuccess = await updateSupabaseOrderStatus(targetId, newStatus, cancellationReason);
      } catch (e) {
        console.warn('Supabase update notice:', e);
      }

      // 2. Also patch backend API
      try {
        const res = await fetch(`/api/orders/${targetId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: newStatus,
            cancellationReason,
          }),
        });
        if (res.ok) isSuccess = true;
      } catch (e) {
        console.warn('API status patch notice:', e);
      }

      if (isSuccess) {
        showFeedback('success', `Order #${targetId} status updated to "${newStatus}"`);
        await loadOrders();
      } else {
        showFeedback('error', `Failed to update status for order #${targetId}`);
      }
    } catch (err: any) {
      showFeedback('error', err.message || 'Status transition failed');
    } finally {
      setUpdatingOrderId(null);
      setCancelTargetOrder(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleExpand = (id: string) => {
    setExpandedOrderIds((prev) => {
      const current = prev[id] !== undefined ? prev[id] : true;
      return {
        ...prev,
        [id]: !current,
      };
    });
  };

  const handleExpandAll = (expand: boolean) => {
    const newMap: Record<string, boolean> = {};
    filteredOrders.forEach((o) => {
      const id = o.orderId || o.id;
      newMap[id] = expand;
    });
    setExpandedOrderIds(newMap);
  };

  const normalizeStatus = (order: Order): string => {
    const st = (order.status || '').toLowerCase().trim();
    const ost = (order.orderStatus || '').toLowerCase().trim();
    if (st === 'received' || ost === 'received' || st === 'pending') return 'received';
    if (st === 'confirmed' || ost === 'confirmed') return 'confirmed';
    if (
      st === 'preparing' ||
      ost === 'preparing' ||
      st === 'in kitchen' ||
      st === 'preparing in kitchen'
    )
      return 'preparing';
    if (st === 'ready' || ost === 'ready' || st === 'ready for pickup') return 'ready';
    if (st === 'out_for_delivery' || ost === 'out_for_delivery' || st === 'out for delivery')
      return 'out_for_delivery';
    if (st === 'delivered' || ost === 'delivered' || st === 'picked up') return 'delivered';
    if (st === 'cancelled' || ost === 'cancelled') return 'cancelled';
    return 'received';
  };

  const formatRelativeTime = (dateStr?: string) => {
    if (!dateStr) return 'Just now';
    try {
      const now = new Date();
      const past = new Date(dateStr);
      const diffMs = now.getTime() - past.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 1) return 'Just now';
      if (diffMins === 1) return '1 min ago';
      if (diffMins < 60) return `${diffMins} mins ago`;
      const diffHrs = Math.floor(diffMins / 60);
      if (diffHrs === 1) return '1 hr ago';
      if (diffHrs < 24) return `${diffHrs} hrs ago`;
      return past.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatExactTime = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  // Status Counts
  const counts = {
    all: orders.length,
    received: orders.filter((o) => normalizeStatus(o) === 'received').length,
    confirmed: orders.filter((o) => normalizeStatus(o) === 'confirmed').length,
    preparing: orders.filter((o) => normalizeStatus(o) === 'preparing').length,
    ready: orders.filter((o) => normalizeStatus(o) === 'ready').length,
    out_for_delivery: orders.filter((o) => normalizeStatus(o) === 'out_for_delivery').length,
    delivered: orders.filter((o) => normalizeStatus(o) === 'delivered').length,
    cancelled: orders.filter((o) => normalizeStatus(o) === 'cancelled').length,
    immediate: orders.filter(
      (o) => !(o.deliveryType === 'scheduled' || o.customerDetails?.deliveryType === 'scheduled')
    ).length,
    scheduled: orders.filter(
      (o) => o.deliveryType === 'scheduled' || o.customerDetails?.deliveryType === 'scheduled'
    ).length,
  };

  // Filtered and Sorted Orders (always newest on top by received date)
  const filteredOrders = useMemo(() => {
    return orders
      .filter((order) => {
        const normSt = normalizeStatus(order);
        const isScheduled =
          order.deliveryType === 'scheduled' || order.customerDetails?.deliveryType === 'scheduled';

        // Status filter
        if (activeFilter !== 'all' && normSt !== activeFilter) {
          return false;
        }

        // Type filter (delivery vs pickup)
        const isPickup = !!(order.isSelfPickup || order.orderType === 'pickup');
        if (orderTypeFilter === 'delivery' && isPickup) return false;
        if (orderTypeFilter === 'pickup' && !isPickup) return false;

        // Delivery timing filter (immediate vs scheduled)
        if (deliveryTimingFilter === 'immediate' && isScheduled) return false;
        if (deliveryTimingFilter === 'scheduled' && !isScheduled) return false;

        // Received Date filter (Single Date / All Time / This Week / This Month / Date Range)
        if (
          !isOrderMatchingDateFilter(
            order,
            dateFilter,
            singleDate,
            rangeStartDate,
            rangeEndDate
          )
        ) {
          return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchId = (order.orderId || order.id || '').toLowerCase().includes(q);
          const matchName = (order.customerDetails?.fullName || '').toLowerCase().includes(q);
          const matchPhone = (order.customerDetails?.phone || '').includes(q);
          const matchAddress = (order.deliveryAddressSnapshot?.fullAddress || '').toLowerCase().includes(q);
          const matchPin = (order.deliveryPinCode || order.customerDetails?.pincode || '').includes(q);
          const matchItems = order.items?.some((item) => item.name.toLowerCase().includes(q));

          if (!matchId && !matchName && !matchPhone && !matchAddress && !matchPin && !matchItems) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => getOrderReceivedTimestamp(b) - getOrderReceivedTimestamp(a));
  }, [
    orders,
    activeFilter,
    orderTypeFilter,
    deliveryTimingFilter,
    dateFilter,
    singleDate,
    rangeStartDate,
    rangeEndDate,
    searchQuery,
  ]);

  // Total Order Value for orders showing in the list only
  const totalFilteredOrderValue = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  }, [filteredOrders]);

  return (
    <div className="space-y-6">
      {/* Top Banner with Kitchen Controls */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-stone-900 font-heading tracking-tight">
                Kitchen Live Orders & Packing Queue
              </h2>
              {counts.received > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white font-extrabold text-xs animate-pulse shadow-xs">
                  {counts.received} New Received
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Manage incoming orders, prepare kitchen tickets, pack, and transition status seamlessly with audit timestamps.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundEnabled((prev) => !prev)}
              className={`p-2 rounded-xl border text-xs font-bold transition-colors flex items-center gap-1.5 ${
                soundEnabled
                  ? 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                  : 'bg-stone-50 text-stone-400 border-stone-200 hover:bg-stone-100'
              }`}
              title={soundEnabled ? 'Chime sound active for new orders' : 'Chime muted'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-700" /> : <VolumeX className="w-4 h-4" />}
              <span className="hidden sm:inline">{soundEnabled ? 'Audio Chime ON' : 'Muted'}</span>
            </button>

            <button
              type="button"
              onClick={() => loadOrders(true)}
              disabled={isRefreshing}
              className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh Orders'}</span>
            </button>
          </div>
        </div>

        {/* Quick Order Status Metrics Bar with Total Order Value Box */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 mt-5">
          {/* Box 0: Total Order Value / Wallet for orders showing in the list */}
          {!isWalletOpen ? (
            /* Closed State (Default): Centered Wallet Icon with "Open Wallet" label */
            <button
              type="button"
              onClick={() => {
                setIsWalletOpen(true);
                setActiveFilter('all');
              }}
              className="p-3 rounded-xl border text-center transition-all cursor-pointer bg-stone-900 hover:bg-stone-850 text-white border-stone-800 shadow-2xs flex flex-col items-center justify-center gap-1 min-h-[76px] group select-none"
              title="Click to open wallet and view total order value"
            >
              <div className="w-7 h-7 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center text-amber-400 group-hover:scale-110 group-hover:bg-amber-950/80 transition-all shadow-2xs">
                <Wallet className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-black text-amber-300 tracking-wide">
                Open Wallet
              </span>
            </button>
          ) : (
            /* Open State: Visible amount + details with a close button in bottom-right corner */
            <div
              onClick={() => setActiveFilter('all')}
              className={`relative p-3 rounded-xl border text-left transition-all cursor-pointer min-h-[76px] flex flex-col justify-between ${
                activeFilter === 'all'
                  ? 'bg-stone-900 text-white border-stone-950 shadow-md ring-2 ring-amber-400'
                  : 'bg-stone-900/95 hover:bg-stone-900 text-white border-stone-800 shadow-2xs'
              }`}
              title="Total Order Value (Click filter, or click icon to close wallet)"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider block text-amber-400 flex items-center gap-1">
                    <Wallet className="w-3 h-3 text-amber-400" />
                    <span>Order Value</span>
                  </span>
                  <IndianRupee className="w-3.5 h-3.5 text-amber-400 opacity-90" />
                </div>
                <span className="text-xl font-black block mt-0.5 font-mono tracking-tight text-white pr-6 truncate">
                  ₹{totalFilteredOrderValue.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] font-medium block text-stone-300">
                  {filteredOrders.length} {filteredOrders.length === 1 ? 'Order' : 'Orders'} in List
                </span>
              </div>

              {/* Close Wallet Button in bottom-right corner inside the box */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsWalletOpen(false);
                }}
                className="absolute bottom-2 right-2 p-1 rounded-md bg-stone-800 hover:bg-black text-amber-300 hover:text-white border border-stone-700 transition-all cursor-pointer shadow-2xs group"
                title="Close wallet (hide amount)"
              >
                <EyeOff className="w-3 h-3 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setActiveFilter('received')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              activeFilter === 'received'
                ? 'bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-300'
                : 'bg-amber-50/70 hover:bg-amber-100/70 border-amber-200 text-amber-950'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider block opacity-90">
                1. Received
              </span>
              {counts.received > 0 && (
                <span className={`w-2 h-2 rounded-full ${activeFilter === 'received' ? 'bg-white' : 'bg-amber-500'} animate-ping`} />
              )}
            </div>
            <span className="text-xl font-black block mt-1">{counts.received}</span>
            <span className="text-[10px] font-medium block opacity-80">Pending Action</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('confirmed')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              activeFilter === 'confirmed'
                ? 'bg-blue-600 text-white border-blue-700 shadow-md ring-2 ring-blue-300'
                : 'bg-blue-50/60 hover:bg-blue-100/60 border-blue-200 text-blue-950'
            }`}
          >
            <span className="text-[10px] font-extrabold uppercase tracking-wider block opacity-90">
              2. Confirmed
            </span>
            <span className="text-xl font-black block mt-1">{counts.confirmed}</span>
            <span className="text-[10px] font-medium block opacity-80">Accepted</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('preparing')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              activeFilter === 'preparing'
                ? 'bg-amber-600 text-white border-amber-700 shadow-md ring-2 ring-amber-300'
                : 'bg-orange-50/60 hover:bg-orange-100/60 border-orange-200 text-orange-950'
            }`}
          >
            <span className="text-[10px] font-extrabold uppercase tracking-wider block opacity-90">
              3. Preparing
            </span>
            <span className="text-xl font-black block mt-1">{counts.preparing}</span>
            <span className="text-[10px] font-medium block opacity-80">In Kitchen</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('ready')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              activeFilter === 'ready'
                ? 'bg-purple-600 text-white border-purple-700 shadow-md ring-2 ring-purple-300'
                : 'bg-purple-50/60 hover:bg-purple-100/60 border-purple-200 text-purple-950'
            }`}
          >
            <span className="text-[10px] font-extrabold uppercase tracking-wider block opacity-90">
              4. Ready / Packed
            </span>
            <span className="text-xl font-black block mt-1">{counts.ready}</span>
            <span className="text-[10px] font-medium block opacity-80">Ready for Handover</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('out_for_delivery')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              activeFilter === 'out_for_delivery'
                ? 'bg-cyan-700 text-white border-cyan-800 shadow-md ring-2 ring-cyan-300'
                : 'bg-cyan-50/60 hover:bg-cyan-100/60 border-cyan-200 text-cyan-950'
            }`}
          >
            <span className="text-[10px] font-extrabold uppercase tracking-wider block opacity-90">
              5. Out for Delivery
            </span>
            <span className="text-xl font-black block mt-1">{counts.out_for_delivery}</span>
            <span className="text-[10px] font-medium block opacity-80">On the Way</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('delivered')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              activeFilter === 'delivered'
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-300'
                : 'bg-emerald-50/60 hover:bg-emerald-100/60 border-emerald-200 text-emerald-950'
            }`}
          >
            <span className="text-[10px] font-extrabold uppercase tracking-wider block opacity-90">
              6. Delivered
            </span>
            <span className="text-xl font-black block mt-1">{counts.delivered}</span>
            <span className="text-[10px] font-medium block opacity-80">Completed</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('cancelled')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              activeFilter === 'cancelled'
                ? 'bg-rose-700 text-white border-rose-800 shadow-md ring-2 ring-rose-300'
                : 'bg-rose-50/60 hover:bg-rose-100/60 border-rose-200 text-rose-950'
            }`}
          >
            <span className="text-[10px] font-extrabold uppercase tracking-wider block opacity-90">
              Cancelled
            </span>
            <span className="text-xl font-black block mt-1">{counts.cancelled}</span>
            <span className="text-[10px] font-medium block opacity-80">Discarded</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Order ID (#10001), Customer Name, Phone, Address, PIN, or Item..."
              className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-700 focus:bg-white transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Type & Timing Filters */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Delivery Timing Filter (Express vs Scheduled) */}
            <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setDeliveryTimingFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  deliveryTimingFilter === 'all'
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                All ({orders.length})
              </button>
              <button
                type="button"
                onClick={() => setDeliveryTimingFilter('immediate')}
                className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                  deliveryTimingFilter === 'immediate'
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Zap className="w-3 h-3 text-emerald-600" />
                <span>Express ({counts.immediate})</span>
              </button>
              <button
                type="button"
                onClick={() => setDeliveryTimingFilter('scheduled')}
                className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                  deliveryTimingFilter === 'scheduled'
                    ? 'bg-amber-800 text-amber-50 shadow-2xs'
                    : 'text-amber-900 hover:text-amber-950'
                }`}
              >
                <Calendar className="w-3 h-3 text-amber-500" />
                <span>Scheduled ({counts.scheduled})</span>
              </button>
            </div>

            {/* Delivery vs Pickup */}
            <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setOrderTypeFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  orderTypeFilter === 'all' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setOrderTypeFilter('delivery')}
                className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                  orderTypeFilter === 'delivery' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Truck className="w-3 h-3 text-stone-500" />
                <span>Delivery</span>
              </button>
              <button
                type="button"
                onClick={() => setOrderTypeFilter('pickup')}
                className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                  orderTypeFilter === 'pickup' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <ShoppingBag className="w-3 h-3 text-stone-500" />
                <span>Pickup</span>
              </button>
            </div>
          </div>
        </div>

        {/* Status Filter Chips Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold pt-1">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-stone-900 text-white'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
            }`}
          >
            Show All ({orders.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('received')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeFilter === 'received'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
            }`}
          >
            <span>Received</span>
            <span className="px-1.5 py-0.2 bg-white/20 rounded text-[10px]">
              {counts.received}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('confirmed')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeFilter === 'confirmed'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200'
            }`}
          >
            <span>Confirmed</span>
            <span className="px-1.5 py-0.2 bg-white/20 rounded text-[10px]">
              {counts.confirmed}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('preparing')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeFilter === 'preparing'
                ? 'bg-orange-600 text-white'
                : 'bg-orange-50 hover:bg-orange-100 text-orange-900 border border-orange-200'
            }`}
          >
            <span>Preparing in Kitchen</span>
            <span className="px-1.5 py-0.2 bg-white/20 rounded text-[10px]">
              {counts.preparing}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('ready')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeFilter === 'ready'
                ? 'bg-purple-600 text-white'
                : 'bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200'
            }`}
          >
            <span>Ready / Packed</span>
            <span className="px-1.5 py-0.2 bg-white/20 rounded text-[10px]">
              {counts.ready}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('out_for_delivery')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeFilter === 'out_for_delivery'
                ? 'bg-cyan-700 text-white'
                : 'bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border border-cyan-200'
            }`}
          >
            <span>Out for Delivery</span>
            <span className="px-1.5 py-0.2 bg-white/20 rounded text-[10px]">
              {counts.out_for_delivery}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('delivered')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeFilter === 'delivered'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200'
            }`}
          >
            <span>Delivered</span>
            <span className="px-1.5 py-0.2 bg-white/20 rounded text-[10px]">
              {counts.delivered}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('cancelled')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeFilter === 'cancelled'
                ? 'bg-rose-700 text-white'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200'
            }`}
          >
            <span>Cancelled</span>
            <span className="px-1.5 py-0.2 bg-white/20 rounded text-[10px]">
              {counts.cancelled}
            </span>
          </button>
        </div>
      </div>

      {/* Orders List Content */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center shadow-2xs">
          <RefreshCw className="w-8 h-8 text-amber-700 animate-spin mx-auto mb-3" />
          <p className="font-extrabold text-stone-900 text-sm">Loading Kitchen Orders...</p>
          <p className="text-xs text-stone-500 mt-1">
            Fetching active orders and live fulfillment records for {currentOutlet.name}...
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* List Toolbar: Order count & Date Filter & Expand/Collapse All */}
          <div className="bg-white rounded-2xl border border-stone-200 p-3 shadow-2xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
              {/* Left: Showing count and Date Filter */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-extrabold text-stone-900 shrink-0 text-xs">
                  Showing {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'}
                </span>

                <div className="h-4 w-px bg-stone-200 hidden sm:block" />

                {/* Date Filter Options (Date Option First -> All Time -> This Week -> This Month -> Date Range Last) */}
                <div className="flex items-center gap-1.5 flex-wrap bg-stone-100/90 p-1 rounded-xl border border-stone-200/70">
                  {/* 1. Date Option (First - Entire pill clickable to open calendar) */}
                  <div
                    onClick={() => {
                      setDateFilter('custom_date');
                      openPicker(singleDateInputRef);
                    }}
                    className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all cursor-pointer select-none ${
                      dateFilter === 'custom_date'
                        ? 'bg-amber-900 text-white border-amber-950 shadow-2xs'
                        : 'bg-white text-stone-700 border-stone-200 shadow-2xs hover:border-stone-300'
                    }`}
                    title="Click to open calendar"
                  >
                    <Calendar className={`w-3.5 h-3.5 shrink-0 pointer-events-none ${dateFilter === 'custom_date' ? 'text-amber-200' : 'text-stone-500'}`} />
                    <span className={`text-[11px] font-bold shrink-0 pointer-events-none ${dateFilter === 'custom_date' ? 'text-amber-100' : 'text-stone-700'}`}>
                      Date:
                    </span>
                    <span className={`text-[11px] font-bold font-mono px-1.5 py-0.5 rounded pointer-events-none ${
                      dateFilter === 'custom_date' ? 'bg-amber-950/80 text-white' : 'bg-stone-100 text-stone-800'
                    }`}>
                      {(() => {
                        const parts = singleDate.split('-');
                        return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : singleDate;
                      })()}
                    </span>
                    <Calendar className={`w-3.5 h-3.5 shrink-0 pointer-events-none ${dateFilter === 'custom_date' ? 'text-amber-300' : 'text-stone-400'}`} />

                    {/* Transparent native date input overlay covering the entire button */}
                    <input
                      ref={singleDateInputRef}
                      type="date"
                      value={singleDate}
                      tabIndex={-1}
                      onChange={(e) => {
                        if (e.target.value) {
                          setSingleDate(e.target.value);
                          setDateFilter('custom_date');
                        }
                      }}
                      className="full-click-date-input"
                      title="Select date"
                    />
                  </div>

                  {/* 2. All Time */}
                  <button
                    type="button"
                    onClick={() => setDateFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      dateFilter === 'all'
                        ? 'bg-white text-stone-900 shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    All Time
                  </button>

                  {/* 3. This Week */}
                  <button
                    type="button"
                    onClick={() => setDateFilter('this_week')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      dateFilter === 'this_week'
                        ? 'bg-amber-900 text-amber-50 shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    This Week
                  </button>

                  {/* 4. This Month */}
                  <button
                    type="button"
                    onClick={() => setDateFilter('this_month')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      dateFilter === 'this_month'
                        ? 'bg-amber-900 text-amber-50 shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    This Month
                  </button>

                  {/* 5. Date Range Option (Last - Entire from/to pills clickable to open calendar) */}
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all select-none ${
                      dateFilter === 'date_range'
                        ? 'bg-amber-900 text-white border-amber-950 shadow-2xs'
                        : 'bg-white text-stone-700 border-stone-200 shadow-2xs hover:border-stone-300'
                    }`}
                  >
                    <Calendar className={`w-3.5 h-3.5 shrink-0 pointer-events-none ${dateFilter === 'date_range' ? 'text-amber-200' : 'text-stone-500'}`} />
                    <span className={`text-[11px] font-bold shrink-0 pointer-events-none ${dateFilter === 'date_range' ? 'text-amber-100' : 'text-stone-700'}`}>
                      Range:
                    </span>

                    {/* Start Date Pill */}
                    <div
                      onClick={() => {
                        setDateFilter('date_range');
                        openPicker(rangeStartInputRef);
                      }}
                      className={`relative flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer ${
                        dateFilter === 'date_range' ? 'bg-amber-950/80 text-white' : 'bg-stone-100 text-stone-800 hover:bg-stone-200'
                      }`}
                      title="Click to select start date"
                    >
                      <span className="text-[11px] font-bold font-mono pointer-events-none">
                        {(() => {
                          const parts = rangeStartDate.split('-');
                          return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : rangeStartDate;
                        })()}
                      </span>
                      <Calendar className="w-3 h-3 shrink-0 opacity-80 pointer-events-none" />
                      <input
                        ref={rangeStartInputRef}
                        type="date"
                        value={rangeStartDate}
                        tabIndex={-1}
                        onChange={(e) => {
                          if (e.target.value) {
                            setRangeStartDate(e.target.value);
                            setDateFilter('date_range');
                          }
                        }}
                        className="full-click-date-input"
                        title="Range Start Date"
                      />
                    </div>

                    <span className={`text-[11px] font-bold pointer-events-none ${dateFilter === 'date_range' ? 'text-amber-200' : 'text-stone-400'}`}>
                      to
                    </span>

                    {/* End Date Pill */}
                    <div
                      onClick={() => {
                        setDateFilter('date_range');
                        openPicker(rangeEndInputRef);
                      }}
                      className={`relative flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer ${
                        dateFilter === 'date_range' ? 'bg-amber-950/80 text-white' : 'bg-stone-100 text-stone-800 hover:bg-stone-200'
                      }`}
                      title="Click to select end date"
                    >
                      <span className="text-[11px] font-bold font-mono pointer-events-none">
                        {(() => {
                          const parts = rangeEndDate.split('-');
                          return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : rangeEndDate;
                        })()}
                      </span>
                      <Calendar className="w-3 h-3 shrink-0 opacity-80 pointer-events-none" />
                      <input
                        ref={rangeEndInputRef}
                        type="date"
                        value={rangeEndDate}
                        tabIndex={-1}
                        onChange={(e) => {
                          if (e.target.value) {
                            setRangeEndDate(e.target.value);
                            setDateFilter('date_range');
                          }
                        }}
                        className="full-click-date-input"
                        title="Range End Date"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Expand All / Collapse All */}
              {filteredOrders.length > 0 && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleExpandAll(true)}
                    className="px-2.5 py-1 bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                  >
                    Expand All
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExpandAll(false)}
                    className="px-2.5 py-1 bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                  >
                    Collapse All
                  </button>
                </div>
              )}
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center shadow-2xs space-y-3">
              <div className="w-14 h-14 bg-stone-100 rounded-full flex items-center justify-center mx-auto text-stone-400">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-black text-stone-900 text-base">No Orders Found</h3>
                <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
                  {searchQuery
                    ? `No orders matched your search query "${searchQuery}".`
                    : dateFilter !== 'all'
                    ? `There are currently no orders for the selected date period.`
                    : activeFilter !== 'all'
                    ? `There are currently no orders in "${activeFilter.replace(/_/g, ' ')}" status.`
                    : 'No orders placed yet for this kitchen branch.'}
                </p>
              </div>
              {(searchQuery || activeFilter !== 'all' || orderTypeFilter !== 'all' || deliveryTimingFilter !== 'all' || dateFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setActiveFilter('all');
                    setOrderTypeFilter('all');
                    setDeliveryTimingFilter('all');
                    setDateFilter('all');
                  }}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <span>Reset All Filters</span>
                </button>
              )}
            </div>
          ) : (
            filteredOrders.map((order) => {
            const normSt = normalizeStatus(order);
            const isPickup = !!(order.isSelfPickup || order.orderType === 'pickup');
            const targetId = order.orderId || order.id;
            const isExpanded = expandedOrderIds[targetId] !== undefined ? !!expandedOrderIds[targetId] : true;
            const isUpdating = updatingOrderId === targetId;

            // Status Card Background & Accent
            let statusBadge = (
              <span className="px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-full text-xs font-extrabold flex items-center gap-1 animate-pulse">
                <Clock className="w-3 h-3 text-amber-700" />
                <span>Received</span>
              </span>
            );

            if (normSt === 'confirmed') {
              statusBadge = (
                <span className="px-2.5 py-1 bg-blue-100 text-blue-900 border border-blue-300 rounded-full text-xs font-extrabold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-blue-700" />
                  <span>Confirmed</span>
                </span>
              );
            } else if (normSt === 'preparing') {
              statusBadge = (
                <span className="px-2.5 py-1 bg-orange-100 text-orange-900 border border-orange-300 rounded-full text-xs font-extrabold flex items-center gap-1">
                  <Flame className="w-3 h-3 text-orange-700" />
                  <span>In Kitchen</span>
                </span>
              );
            } else if (normSt === 'ready') {
              statusBadge = (
                <span className="px-2.5 py-1 bg-purple-100 text-purple-900 border border-purple-300 rounded-full text-xs font-extrabold flex items-center gap-1">
                  <Package className="w-3 h-3 text-purple-700" />
                  <span>Ready & Packed</span>
                </span>
              );
            } else if (normSt === 'out_for_delivery') {
              statusBadge = (
                <span className="px-2.5 py-1 bg-cyan-100 text-cyan-900 border border-cyan-300 rounded-full text-xs font-extrabold flex items-center gap-1">
                  <Bike className="w-3 h-3 text-cyan-700" />
                  <span>Out for Delivery</span>
                </span>
              );
            } else if (normSt === 'delivered') {
              statusBadge = (
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-full text-xs font-extrabold flex items-center gap-1">
                  <CheckCheck className="w-3 h-3 text-emerald-700" />
                  <span>Delivered</span>
                </span>
              );
            } else if (normSt === 'cancelled') {
              statusBadge = (
                <span className="px-2.5 py-1 bg-rose-100 text-rose-900 border border-rose-300 rounded-full text-xs font-extrabold flex items-center gap-1">
                  <XCircle className="w-3 h-3 text-rose-700" />
                  <span>Cancelled</span>
                </span>
              );
            }

            const isScheduled =
              order.deliveryType === 'scheduled' || order.customerDetails?.deliveryType === 'scheduled';

            return (
              <div
                key={targetId}
                className={`bg-white rounded-2xl border transition-all shadow-2xs overflow-hidden ${
                  normSt === 'received'
                    ? 'border-amber-400 ring-2 ring-amber-100/80'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                {/* Order Top Header Banner (Click to toggle collapse) */}
                <div
                  onClick={() => toggleExpand(targetId)}
                  className="p-4 sm:p-5 bg-stone-50/90 hover:bg-stone-100/70 border-b border-stone-200 text-stone-900 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-black font-mono tracking-tight text-stone-900">
                        {order.orderId || order.id}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(order.orderId || order.id);
                        }}
                        className="p-1 text-stone-400 hover:text-stone-800 rounded transition-colors"
                        title="Copy Order ID"
                      >
                        {copiedId === (order.orderId || order.id) ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Delivery Timing Indicator (Scheduled vs Express) */}
                    {isScheduled ? (
                      <span className="text-[11px] font-black px-3 py-1 rounded-lg bg-amber-900 text-amber-50 border border-amber-950 shadow-xs flex items-center gap-1.5 ring-2 ring-amber-400/60 uppercase tracking-wide">
                        <Calendar className="w-3.5 h-3.5 text-amber-300" />
                        <span>
                          SCHEDULED |{' '}
                          {formatScheduledShortDate(
                            order.scheduledAt || order.customerDetails?.scheduledAt,
                            order.customerDetails?.scheduledDate,
                            order.customerDetails?.scheduledSlotLabel
                          )}
                        </span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                        <Zap className="w-3 h-3 text-emerald-700" />
                        <span>Express (30–40 Mins)</span>
                      </span>
                    )}

                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 ${
                        isPickup
                          ? 'bg-purple-100 text-purple-900 border border-purple-200'
                          : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                      }`}
                    >
                      {isPickup ? <ShoppingBag className="w-3 h-3" /> : <Truck className="w-3 h-3" />}
                      <span>{isPickup ? 'Self-Pickup' : 'Home Delivery'}</span>
                    </span>

                    {order.customerDetails?.paymentMethod && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-stone-200/80 text-stone-800 uppercase">
                        {order.customerDetails.paymentMethod === 'online' ? 'Paid Online' : 'COD'}
                      </span>
                    )}

                    <span className="text-xs text-stone-600 font-medium">
                      Placed {formatRelativeTime(order.placedAt || order.createdAt)} (
                      {formatExactTime(order.placedAt || order.createdAt)})
                    </span>

                    {/* Summary snippets visible when collapsed */}
                    {!isExpanded && (
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-md border bg-white text-stone-700 border-stone-200 flex items-center gap-1.5">
                        <span className="font-extrabold">{order.customerDetails?.fullName || 'Customer'}</span>
                        <span className="text-stone-400">•</span>
                        <span className="text-amber-900 font-black font-mono">₹{order.total || 0}</span>
                        <span className="text-stone-400">•</span>
                        <span className="text-stone-500 font-normal">{order.items?.length || 0} items</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {statusBadge}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDetailsOrder(order);
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                      title="View KOT & Full Order Details"
                    >
                      <Printer className="w-3.5 h-3.5 text-stone-500" />
                      <span className="hidden sm:inline">KOT Slip</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(targetId);
                      }}
                      className="p-1 rounded-lg hover:bg-black/5 text-stone-700 transition-colors"
                      title={isExpanded ? 'Collapse card' : 'Expand card'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Main Order Card Body (Collapsible) */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 space-y-4">
                    {/* Scheduled Delivery Booking Notice Banner */}
                    {isScheduled && (
                      <div className="bg-gradient-to-r from-amber-100 via-amber-50 to-orange-50 border-2 border-amber-400 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                        <div className="flex items-start sm:items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-900 text-amber-100 flex items-center justify-center shrink-0 shadow-xs">
                            <Calendar className="w-5 h-5 text-amber-300" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[11px] font-black uppercase tracking-wider text-amber-950 bg-amber-300/90 px-2 py-0.5 rounded border border-amber-400">
                                Advance Scheduled Booking
                              </span>
                              <span className="text-xs font-black text-amber-950">
                                Target Delivery Slot:{' '}
                                {order.customerDetails?.scheduledSlotLabel ||
                                  formatScheduledAt(order.scheduledAt || order.customerDetails?.scheduledAt)}
                              </span>
                            </div>
                            <p className="text-xs text-amber-900 mt-1 font-medium">
                              ⚡ Kitchen Notice: Timed delivery order. Coordinate cooking to serve fresh right before the scheduled window.
                            </p>
                          </div>
                        </div>
                        {order.customerDetails?.scheduledTimeSlot && (
                          <div className="shrink-0 text-left sm:text-right">
                            <span className="text-[10px] text-amber-800 font-bold block uppercase tracking-wider">
                              Time Window
                            </span>
                            <span className="inline-block px-3 py-1 rounded-lg bg-amber-900 text-white font-mono font-bold text-xs shadow-xs">
                              {order.customerDetails.scheduledTimeSlot}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Customer Information & Delivery Address Bar */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-stone-50/60 rounded-xl p-3.5 border border-stone-200/80 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-stone-800">
                          <User className="w-3.5 h-3.5 text-amber-800" />
                          <span>{order.customerDetails?.fullName || 'Customer'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-stone-600">
                          <Phone className="w-3.5 h-3.5 text-stone-400" />
                          <a
                            href={`tel:${order.customerDetails?.phone}`}
                            className="text-amber-800 font-bold hover:underline font-mono"
                          >
                            +91 {order.customerDetails?.phone || '—'}
                          </a>
                        </div>
                        {isScheduled ? (
                          <div className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md inline-flex items-center gap-1 font-medium mt-0.5">
                            <Clock className="w-3 h-3 text-amber-700 shrink-0" />
                            <span>
                              Scheduled:{' '}
                              {order.customerDetails?.scheduledSlotLabel ||
                                formatScheduledAt(order.scheduledAt || order.customerDetails?.scheduledAt)}
                            </span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-stone-500">
                            Type: <span className="font-semibold capitalize">Immediate (Express)</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-stone-800">
                          <MapPin className="w-3.5 h-3.5 text-amber-800" />
                          <span>{isPickup ? 'Kitchen Counter Pickup' : 'Delivery Address'}</span>
                        </div>
                        {isPickup ? (
                          <p className="text-stone-600 text-[11px]">
                            Customer will pick up order from {currentOutlet.name} ({currentOutlet.address}).
                          </p>
                        ) : (
                          <p className="text-stone-700 text-[11px] leading-relaxed">
                            {order.deliveryAddressSnapshot?.fullAddress || order.customerDetails?.address || '—'}
                            {(order.deliveryPinCode || order.customerDetails?.pincode) && (
                              <span className="font-bold text-stone-900 ml-1 font-mono">
                                (PIN: {order.deliveryPinCode || order.customerDetails?.pincode})
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Special Cooking / Delivery Notes Alert */}
                    {(order.customerDetails?.deliveryNotes || order.deliveryNotes) && (
                      <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-start gap-2.5 text-xs">
                        <AlertCircle className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-amber-950 block">Customer Instructions:</span>
                          <p className="text-amber-900 mt-0.5 font-medium">
                            "{order.customerDetails?.deliveryNotes || order.deliveryNotes}"
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Line Items List */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-stone-500 font-bold uppercase tracking-wider pb-1 border-b border-stone-100">
                        <span>Items to Prepare & Pack ({order.items?.length || 0})</span>
                        <span>Item Total</span>
                      </div>

                      <div className="space-y-2">
                        {order.items?.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-start justify-between gap-3 text-xs py-1.5 border-b border-stone-100/60 last:border-none"
                          >
                            <div className="flex items-start gap-2.5">
                              {/* Veg / Non-Veg Indicator */}
                              <span
                                className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 mt-0.5 ${
                                  item.isVeg
                                    ? 'border-emerald-600 text-emerald-600'
                                    : 'border-rose-600 text-rose-600'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    item.isVeg ? 'bg-emerald-600' : 'bg-rose-600'
                                  }`}
                                />
                              </span>

                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-extrabold text-stone-900">
                                    {item.quantity} × {item.name}
                                  </span>
                                  {item.hindiName && (
                                    <span className="text-stone-400 font-normal text-[11px]">
                                      ({item.hindiName})
                                    </span>
                                  )}
                                </div>

                                {/* Customizations: Variant, Spice, Addons */}
                                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                  {item.variant && (
                                    <span className="px-1.5 py-0.2 bg-stone-100 text-stone-700 rounded text-[10px] font-bold border border-stone-200">
                                      {item.variant.name}
                                    </span>
                                  )}
                                  {item.spiceLevel && (
                                    <span className="px-1.5 py-0.2 bg-amber-50 text-amber-800 rounded text-[10px] font-bold border border-amber-200 flex items-center gap-0.5">
                                      <Flame className="w-2.5 h-2.5 text-amber-600" />
                                      <span>{item.spiceLevel}</span>
                                    </span>
                                  )}
                                  {item.addons && item.addons.length > 0 && (
                                    <span className="text-[10px] text-stone-500 font-medium">
                                      + {item.addons.map((a) => `${a.name} (₹${a.price})`).join(', ')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="font-black text-stone-900 font-mono">
                                ₹{(item.unitPrice || item.price) * item.quantity}
                              </span>
                              <span className="block text-[10px] text-stone-400 font-mono">
                                ₹{item.unitPrice || item.price} each
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Financial Total Footer Bar */}
                    <div className="pt-2 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs bg-stone-50/50 p-3 rounded-xl">
                      <div className="flex items-center gap-3 text-stone-600 flex-wrap">
                        <span>Subtotal: <strong className="text-stone-900 font-mono">₹{order.subtotal || 0}</strong></span>
                        {Boolean(order.discount && order.discount > 0) && (
                          <span className="text-emerald-700">
                            Discount: <strong className="font-mono">-₹{order.discount}</strong>
                          </span>
                        )}
                        <span>Pack: <strong className="text-stone-900 font-mono">₹{order.packagingFee || 0}</strong></span>
                        {!isPickup && (
                          <span>Delivery: <strong className="text-stone-900 font-mono">₹{order.deliveryFee || 0}</strong></span>
                        )}
                        <span>GST (5%): <strong className="text-stone-900 font-mono">₹{order.gst || 0}</strong></span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-stone-500 font-bold uppercase text-[10px]">Grand Total:</span>
                        <span className="text-base font-black text-amber-900 font-mono">
                          ₹{order.total || 0}
                        </span>
                      </div>
                    </div>

                    {/* Collapsible Operational Lifecycle Timestamps Log */}
                    <div className="bg-stone-50 rounded-xl p-3 border border-stone-200 text-xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-stone-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-800" />
                          <span>Action Timestamps Log</span>
                        </span>
                        <span className="text-[10px] text-stone-400">All manager actions recorded</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-[11px]">
                        <div className="bg-white p-2 rounded-lg border border-stone-200">
                          <span className="text-[10px] text-stone-400 block font-semibold">1. Placed</span>
                          <span className="font-mono font-bold text-stone-900">
                            {formatExactTime(order.placedAt || order.createdAt)}
                          </span>
                        </div>

                        <div className="bg-white p-2 rounded-lg border border-stone-200">
                          <span className="text-[10px] text-stone-400 block font-semibold">2. Confirmed</span>
                          <span
                            className={`font-mono font-bold ${
                              order.confirmedAt ? 'text-blue-700' : 'text-stone-300'
                            }`}
                          >
                            {order.confirmedAt ? formatExactTime(order.confirmedAt) : 'Pending'}
                          </span>
                        </div>

                        <div className="bg-white p-2 rounded-lg border border-stone-200">
                          <span className="text-[10px] text-stone-400 block font-semibold">3. Preparing</span>
                          <span
                            className={`font-mono font-bold ${
                              order.preparingAt ? 'text-amber-700' : 'text-stone-300'
                            }`}
                          >
                            {order.preparingAt ? formatExactTime(order.preparingAt) : 'Not started'}
                          </span>
                        </div>

                        <div className="bg-white p-2 rounded-lg border border-stone-200">
                          <span className="text-[10px] text-stone-400 block font-semibold">4. Ready / Packed</span>
                          <span
                            className={`font-mono font-bold ${
                              order.readyAt ? 'text-purple-700' : 'text-stone-300'
                            }`}
                          >
                            {order.readyAt ? formatExactTime(order.readyAt) : 'Not packed'}
                          </span>
                        </div>

                        <div className="bg-white p-2 rounded-lg border border-stone-200">
                          <span className="text-[10px] text-stone-400 block font-semibold">5. Dispatched</span>
                          <span
                            className={`font-mono font-bold ${
                              order.outForDeliveryAt ? 'text-cyan-700' : 'text-stone-300'
                            }`}
                          >
                            {order.outForDeliveryAt ? formatExactTime(order.outForDeliveryAt) : '—'}
                          </span>
                        </div>

                        <div className="bg-white p-2 rounded-lg border border-stone-200">
                          <span className="text-[10px] text-stone-400 block font-semibold">6. Delivered</span>
                          <span
                            className={`font-mono font-bold ${
                              order.deliveredAt ? 'text-emerald-700' : 'text-stone-300'
                            }`}
                          >
                            {order.deliveredAt ? formatExactTime(order.deliveredAt) : '—'}
                          </span>
                        </div>
                      </div>

                      {order.cancelledAt && (
                        <div className="mt-2 p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 text-xs">
                          <div className="flex justify-between font-bold">
                            <span>Cancelled At: {formatExactTime(order.cancelledAt)}</span>
                            {order.cancellationReason && (
                              <span className="font-normal text-rose-700">
                                Reason: {order.cancellationReason}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Operational Status Action Buttons */}
                    <div className="pt-3 border-t border-stone-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedDetailsOrder(order)}
                          className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-stone-600" />
                          <span>Full Details & KOT</span>
                        </button>
                      </div>

                      {/* Sequential Progress Action Button Group */}
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        {/* 1. If Received -> Confirm */}
                        {normSt === 'received' && (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleStatusTransition(order, 'Confirmed')}
                            className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-60 cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>{isUpdating ? 'Updating...' : '✓ Confirm Order'}</span>
                          </button>
                        )}

                        {/* 2. If Confirmed -> Preparing in Kitchen */}
                        {normSt === 'confirmed' && (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleStatusTransition(order, 'Preparing in Kitchen')}
                            className="flex-1 sm:flex-none px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-60 cursor-pointer"
                          >
                            <Flame className="w-4 h-4" />
                            <span>{isUpdating ? 'Updating...' : '👨‍🍳 Send to Kitchen (Preparing)'}</span>
                          </button>
                        )}

                        {/* 3. If Preparing -> Ready / Packed */}
                        {normSt === 'preparing' && (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleStatusTransition(order, 'Ready for Pickup')}
                            className="flex-1 sm:flex-none px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-60 cursor-pointer"
                          >
                            <Package className="w-4 h-4" />
                            <span>{isUpdating ? 'Updating...' : '📦 Mark Ready & Packed'}</span>
                          </button>
                        )}

                        {/* 4. If Ready -> Out for Delivery OR Customer Picked Up */}
                        {normSt === 'ready' && (
                          <>
                            {!isPickup ? (
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => handleStatusTransition(order, 'Out for Delivery')}
                                className="flex-1 sm:flex-none px-4 py-2 bg-cyan-700 hover:bg-cyan-800 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-60 cursor-pointer"
                              >
                                <Bike className="w-4 h-4" />
                                <span>{isUpdating ? 'Updating...' : '🚴 Dispatch (Out for Delivery)'}</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => handleStatusTransition(order, 'Picked Up')}
                                className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-60 cursor-pointer"
                              >
                                <CheckCheck className="w-4 h-4" />
                                <span>{isUpdating ? 'Updating...' : '🛍️ Customer Picked Up'}</span>
                              </button>
                            )}
                          </>
                        )}

                        {/* 5. If Out for Delivery -> Mark Delivered */}
                        {normSt === 'out_for_delivery' && (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleStatusTransition(order, 'Delivered')}
                            className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-60 cursor-pointer"
                          >
                            <CheckCheck className="w-4 h-4" />
                            <span>{isUpdating ? 'Updating...' : '✅ Mark Delivered'}</span>
                          </button>
                        )}

                        {/* Cancel Button (Always available unless already Delivered or Cancelled) */}
                        {normSt !== 'delivered' && normSt !== 'cancelled' && (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => setCancelTargetOrder(order)}
                            className="px-3 py-2 bg-stone-100 hover:bg-rose-50 text-stone-600 hover:text-rose-700 border border-stone-200 hover:border-rose-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                            title="Cancel this order"
                          >
                            <XCircle className="w-3.5 h-3.5 text-rose-500" />
                            <span>Cancel Order</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          }))}
        </div>
      )}

      {/* Cancel Order Reason Modal */}
      {cancelTargetOrder && (
        <CancelOrderModal
          order={cancelTargetOrder}
          isOpen={!!cancelTargetOrder}
          onClose={() => setCancelTargetOrder(null)}
          onConfirmCancel={async (orderId, reason) => {
            await handleStatusTransition(cancelTargetOrder, 'Cancelled', reason);
          }}
        />
      )}

      {/* Full Details & KOT Modal */}
      {selectedDetailsOrder && (
        <ManagerOrderDetailsModal
          order={selectedDetailsOrder}
          isOpen={!!selectedDetailsOrder}
          onClose={() => setSelectedDetailsOrder(null)}
          outletName={currentOutlet.name}
        />
      )}
    </div>
  );
};
