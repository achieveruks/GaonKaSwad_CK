import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { OwnerLayout } from './OwnerLayout';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';
import { useProducts } from '../../context/ProductContext';
import { FestiveEvent, Outlet, FestiveProductionItemSummary, Product } from '../../types';
import { getOutlets } from '../../lib/locationService';
import {
  getFestiveEvents,
  createFestiveEvent,
  updateFestiveEvent,
  deleteFestiveEvent,
  getFestiveProductionSummary,
} from '../../lib/festiveService';
import { FestiveProductionWidget } from '../../components/owner/FestiveProductionWidget';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import {
  Sparkles,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  Store,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  UtensilsCrossed,
  Printer,
  ChevronRight,
  X,
  ExternalLink,
  ChefHat,
  Package,
  Layers,
  Flame,
  Info,
  CalendarDays,
  IndianRupee,
  ShoppingBag,
} from 'lucide-react';

const FESTIVE_IMAGE_PRESETS = [
  {
    label: 'Diwali Lights & Sweets',
    url: 'https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?q=80&w=1200&auto=format&fit=crop',
  },
  {
    label: 'Royal Dum Feast',
    url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?q=80&w=1200&auto=format&fit=crop',
  },
  {
    label: 'Festive Mithai & Desserts',
    url: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?q=80&w=1200&auto=format&fit=crop',
  },
  {
    label: 'Holi Colors & Flavours',
    url: 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?q=80&w=1200&auto=format&fit=crop',
  },
  {
    label: 'Heirloom Clay Pot Cooking',
    url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=1200&auto=format&fit=crop',
  },
];

export const OwnerUtsavSpecialsPage: React.FC = () => {
  const { token } = useAuth();
  const { goToOwnerProducts, goToOwnerAddProduct, goToShop } = useNavigation();
  const { allProducts, refreshProducts } = useProducts();

  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [selectedOutletId, setSelectedOutletId] = useState<string>('all');
  const [events, setEvents] = useState<FestiveEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'completed'>('all');

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<FestiveEvent | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [formOutletId, setFormOutletId] = useState('');
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formBannerImage, setFormBannerImage] = useState(FESTIVE_IMAGE_PRESETS[0].url);
  const [formFestivalDate, setFormFestivalDate] = useState('');
  const [formBookingStartAt, setFormBookingStartAt] = useState('');
  const [formBookingEndAt, setFormBookingEndAt] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive' | 'completed'>('active');

  // Production Summary Modal
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [selectedEventForSummary, setSelectedEventForSummary] = useState<FestiveEvent | null>(null);
  const [summaryData, setSummaryData] = useState<{
    totalBookedUnits: number;
    items: FestiveProductionItemSummary[];
  } | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Load Outlets & Festive Events
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [allOutlets, allEvents] = await Promise.all([
        getOutlets(),
        getFestiveEvents(selectedOutletId === 'all' ? undefined : selectedOutletId, false, token || undefined),
      ]);
      setOutlets(allOutlets || []);
      setEvents(allEvents || []);
      if (allOutlets && allOutlets.length > 0) {
        setFormOutletId((prev) => prev || allOutlets[0].id);
      }
    } catch (err) {
      console.error('Failed to load festive events:', err);
      setNotification({ type: 'error', text: 'Failed to load festival collections. Please try refreshing.' });
    } finally {
      setIsLoading(false);
    }
  }, [selectedOutletId, token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (selectedOutletId !== 'all' && ev.outletId !== selectedOutletId) {
        return false;
      }
      if (statusFilter !== 'all' && ev.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = ev.name.toLowerCase().includes(query);
        const matchesDesc = (ev.description || '').toLowerCase().includes(query);
        const matchesSlug = ev.slug.toLowerCase().includes(query);
        if (!matchesName && !matchesDesc && !matchesSlug) return false;
      }
      return true;
    });
  }, [events, selectedOutletId, statusFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const totalCollections = events.length;
    const now = new Date();
    const activeBookingWindows = events.filter((ev) => {
      if (ev.status !== 'active') return false;
      const start = new Date(ev.bookingStartAt);
      const end = new Date(ev.bookingEndAt);
      return now >= start && now <= end;
    }).length;

    // Count festive products assigned across allProducts
    const festiveProductsCount = allProducts.filter((p) => p.festiveProduct || p.festiveEventId).length;

    return {
      totalCollections,
      activeBookingWindows,
      festiveProductsCount,
    };
  }, [events, allProducts]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingEvent(null);
    setFormOutletId(outlets[0]?.id || '');
    setFormName('');
    setFormSlug('');
    setFormDescription('Celebrate this festival with our artisanal specials, slow-cooked with heirloom heritage recipes and pure desi ghee.');
    setFormBannerImage(FESTIVE_IMAGE_PRESETS[0].url);
    
    // Default dates: Festival date 7 days from now, booking open now until 2 days before
    const today = new Date();
    const festDate = new Date();
    festDate.setDate(today.getDate() + 7);
    const bookingEndDate = new Date();
    bookingEndDate.setDate(festDate.getDate() - 1);
    bookingEndDate.setHours(21, 0, 0, 0);

    setFormFestivalDate(festDate.toISOString().split('T')[0]);
    setFormBookingStartAt(today.toISOString().slice(0, 16));
    setFormBookingEndAt(bookingEndDate.toISOString().slice(0, 16));
    setFormStatus('active');
    setFormError(null);
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (event: FestiveEvent) => {
    setEditingEvent(event);
    setFormOutletId(event.outletId);
    setFormName(event.name);
    setFormSlug(event.slug);
    setFormDescription(event.description || '');
    setFormBannerImage(event.bannerImage || FESTIVE_IMAGE_PRESETS[0].url);
    setFormFestivalDate(event.festivalDate ? event.festivalDate.split('T')[0] : '');
    setFormBookingStartAt(event.bookingStartAt ? event.bookingStartAt.slice(0, 16) : '');
    setFormBookingEndAt(event.bookingEndAt ? event.bookingEndAt.slice(0, 16) : '');
    setFormStatus(event.status);
    setFormError(null);
    setIsFormModalOpen(true);
  };

  // Name to slug helper
  const handleNameChange = (val: string) => {
    setFormName(val);
    if (!editingEvent) {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setFormSlug(generated);
    }
  };

  // Save Event (Create or Update)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim()) {
      setFormError('Please provide a festival name (e.g. Diwali Utsav 2026).');
      return;
    }
    if (!formOutletId) {
      setFormError('Please select a kitchen outlet.');
      return;
    }
    if (!formFestivalDate) {
      setFormError('Please select the festival delivery date.');
      return;
    }
    if (!formBookingStartAt || !formBookingEndAt) {
      setFormError('Please configure both booking start and closing times.');
      return;
    }

    const startDate = new Date(formBookingStartAt);
    const endDate = new Date(formBookingEndAt);
    if (endDate <= startDate) {
      setFormError('Pre-booking closing date must be later than the booking start date.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<FestiveEvent> = {
        outletId: formOutletId,
        name: formName.trim(),
        slug: formSlug.trim() || formName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: formDescription.trim(),
        bannerImage: formBannerImage.trim(),
        festivalDate: formFestivalDate,
        bookingStartAt: new Date(formBookingStartAt).toISOString(),
        bookingEndAt: new Date(formBookingEndAt).toISOString(),
        status: formStatus,
      };

      if (editingEvent) {
        const updated = await updateFestiveEvent(editingEvent.id, payload, token || undefined);
        setEvents((prev) => prev.map((ev) => (ev.id === updated.id ? updated : ev)));
        setNotification({ type: 'success', text: `Festival collection "${updated.name}" updated successfully!` });
      } else {
        const created = await createFestiveEvent(payload, token || undefined);
        setEvents((prev) => [created, ...prev]);
        setNotification({ type: 'success', text: `Festival collection "${created.name}" created successfully!` });
      }

      setIsFormModalOpen(false);
      await loadData();
    } catch (err: any) {
      console.error('Error saving festive event:', err);
      setFormError(err.message || 'Failed to save festival collection. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Active / Inactive
  const handleToggleStatus = async (event: FestiveEvent) => {
    const nextStatus: 'active' | 'inactive' = event.status === 'active' ? 'inactive' : 'active';
    try {
      const updated = await updateFestiveEvent(event.id, { status: nextStatus }, token || undefined);
      setEvents((prev) => prev.map((ev) => (ev.id === updated.id ? updated : ev)));
      setNotification({
        type: 'success',
        text: `Festival "${event.name}" marked as ${nextStatus.toUpperCase()}.`,
      });
    } catch (err: any) {
      console.error('Toggle status error:', err);
      setNotification({ type: 'error', text: err.message || 'Failed to update festival status.' });
    }
  };

  // Delete Event with safe guard
  const handleDeleteEvent = async (event: FestiveEvent) => {
    const confirmMessage = `Are you sure you want to delete "${event.name}"?\n\nThis collection will be removed permanently. Note: If any confirmed customer bookings exist, deletion will be safely rejected.`;
    if (!window.confirm(confirmMessage)) return;

    try {
      await deleteFestiveEvent(event.id, token || undefined);
      setEvents((prev) => prev.filter((ev) => ev.id !== event.id));
      setNotification({ type: 'success', text: `"${event.name}" has been removed.` });
    } catch (err: any) {
      console.error('Delete festive event error:', err);
      alert(err.message || 'Cannot delete festival collection. Please ensure all bookings are resolved first.');
    }
  };

  // Open Production Summary Modal
  const loadModalSummary = useCallback(
    async (event: FestiveEvent, silent = false) => {
      if (!silent) {
        setIsLoadingSummary(true);
        setSummaryError(null);
      }
      try {
        const data = await getFestiveProductionSummary(event.outletId, event.id, token || undefined);
        setSummaryData({
          totalBookedUnits: data.totalBookedUnits || 0,
          items: data.items || [],
        });
      } catch (err: any) {
        console.error('Error loading production summary:', err);
        if (!silent) {
          setSummaryError(err.message || 'Failed to load production planning summary.');
        }
      } finally {
        if (!silent) {
          setIsLoadingSummary(false);
        }
      }
    },
    [token]
  );

  const handleOpenSummary = async (event: FestiveEvent) => {
    setSelectedEventForSummary(event);
    setIsSummaryModalOpen(true);
    setSummaryData(null);
    await loadModalSummary(event, false);
  };

  useEffect(() => {
    if (!isSummaryModalOpen || !selectedEventForSummary || !isSupabaseConfigured()) return;
    const channel = supabase
      .channel(`utsav-modal-summary:${selectedEventForSummary.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        loadModalSummary(selectedEventForSummary, true);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'products' }, () => {
        loadModalSummary(selectedEventForSummary, true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isSummaryModalOpen, selectedEventForSummary, loadModalSummary]);

  const getOutletName = (outletId: string) => {
    const found = outlets.find((o) => o.id === outletId);
    return found ? found.name : outletId;
  };

  const getBookingWindowStatus = (ev: FestiveEvent) => {
    const now = new Date();
    const start = new Date(ev.bookingStartAt);
    const end = new Date(ev.bookingEndAt);

    if (ev.status === 'completed') {
      return { label: 'Completed', color: 'bg-stone-100 text-stone-600 border-stone-200' };
    }
    if (ev.status === 'inactive') {
      return { label: 'Inactive', color: 'bg-stone-100 text-stone-500 border-stone-200' };
    }
    if (now < start) {
      return { label: 'Pre-booking Upcoming', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    }
    if (now > end) {
      return { label: 'Pre-booking Closed', color: 'bg-rose-50 text-rose-700 border-rose-200' };
    }
    return { label: 'Booking Active Now', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <OwnerLayout
      activeTab="utsav-specials"
      title="Utsav Specials — Festival Collections & Production Planning"
      subtitle="Manage time-bound festival pre-booking events, festive dish menus, and aggregate kitchen preparation sheets."
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 font-sans">
        {/* Notification Alert */}
        {notification && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs font-semibold ${
              notification.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{notification.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="p-1 hover:bg-stone-200/50 rounded-lg cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                Festival Collections
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-800">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-stone-900 font-heading">
                {stats.totalCollections}
              </span>
              <span className="text-[11px] text-stone-400">Total Created</span>
            </div>
          </div>

          <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                Active Booking Windows
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-800">
                <CalendarDays className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-700 font-heading">
                {stats.activeBookingWindows}
              </span>
              <span className="text-[11px] text-stone-400">Accepting Pre-orders</span>
            </div>
          </div>

          <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                Festive Dishes in Menu
              </span>
              <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-200/60 flex items-center justify-center text-orange-800">
                <ChefHat className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-stone-900 font-heading">
                {stats.festiveProductsCount}
              </span>
              <span className="text-[11px] text-stone-400">Assigned Dishes</span>
            </div>
          </div>
        </div>

        {/* Toolbar: Outlets Filter, Search, Action Button */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-2xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            {/* Outlet Selector */}
            <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1.5 text-xs">
              <Store className="w-3.5 h-3.5 text-stone-500 shrink-0" />
              <select
                value={selectedOutletId}
                onChange={(e) => setSelectedOutletId(e.target.value)}
                className="bg-transparent font-semibold text-stone-800 focus:outline-none cursor-pointer pr-2"
              >
                <option value="all">All Kitchen Outlets</option>
                {outlets.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.city})
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1.5 text-xs">
              <Filter className="w-3.5 h-3.5 text-stone-500 shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-transparent font-semibold text-stone-800 focus:outline-none cursor-pointer pr-2"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search festival name or slug..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-amber-800 focus:bg-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadData}
              title="Refresh list"
              className="p-2 border border-stone-200 hover:bg-stone-50 text-stone-600 rounded-xl cursor-pointer transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-800 hover:bg-amber-900 active:bg-amber-950 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Festival Collection</span>
            </button>
          </div>
        </div>

        {/* Inline Real-Time Production Planning Widget */}
        {!isLoading && filteredEvents.length > 0 && (
          <FestiveProductionWidget
            events={filteredEvents}
            outlets={outlets}
            token={token}
            onPrintSheet={handleOpenSummary}
            onProductsChanged={() => {
              refreshProducts();
            }}
          />
        )}

        {/* Collections List */}
        {isLoading ? (
          <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-amber-800 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold text-stone-600">Loading Festival Collections...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-800 border border-amber-200/60 flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">No Festival Collections Found</h3>
              <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
                {searchQuery || statusFilter !== 'all'
                  ? 'No festival collections match your current filter criteria.'
                  : 'Get started by creating your first Utsav Special event (e.g. Diwali Special, Holi Festival, Eid Treats).'}
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Festival Collection</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredEvents.map((ev) => {
              const windowStatus = getBookingWindowStatus(ev);
              const eventProducts = allProducts.filter((p) => p.festiveEventId === ev.id);

              return (
                <div
                  key={ev.id}
                  className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition-shadow flex flex-col"
                >
                  {/* Banner Header Image */}
                  <div className="relative h-40 bg-stone-100 overflow-hidden">
                    <img
                      src={ev.bannerImage || FESTIVE_IMAGE_PRESETS[0].url}
                      alt={ev.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = FESTIVE_IMAGE_PRESETS[0].url;
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/20 to-transparent" />

                    {/* Window Status Badge */}
                    <div className="absolute top-3 left-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-xs backdrop-blur-md ${windowStatus.color}`}
                      >
                        {windowStatus.label}
                      </span>
                    </div>

                    {/* Outlet Tag */}
                    <div className="absolute top-3 right-3">
                      <span className="text-[10px] font-semibold bg-stone-900/80 text-stone-200 px-2 py-0.5 rounded-md backdrop-blur-md flex items-center gap-1 border border-stone-700/60">
                        <Store className="w-3 h-3 text-amber-400" />
                        <span>{getOutletName(ev.outletId)}</span>
                      </span>
                    </div>

                    {/* Festival Name & Date at Bottom of Banner */}
                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <h4 className="text-base font-extrabold tracking-tight font-heading drop-shadow-xs line-clamp-1">
                        {ev.name}
                      </h4>
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-200/90 font-medium mt-0.5">
                        <Calendar className="w-3 h-3 text-amber-300" />
                        <span>Festival Date: {formatDate(ev.festivalDate)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Body Details */}
                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      {ev.description && (
                        <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                          {ev.description}
                        </p>
                      )}

                      {/* Pre-Booking Timing Details */}
                      <div className="mt-3 bg-stone-50 border border-stone-200/80 rounded-xl p-2.5 space-y-1.5 text-[11px]">
                        <div className="flex items-center justify-between text-stone-600">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-stone-400" />
                            <span>Booking Starts:</span>
                          </span>
                          <span className="font-semibold text-stone-800">
                            {formatDateTime(ev.bookingStartAt)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-stone-600">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-rose-500" />
                            <span>Booking Deadline:</span>
                          </span>
                          <span className="font-semibold text-rose-700">
                            {formatDateTime(ev.bookingEndAt)}
                          </span>
                        </div>
                      </div>

                      {/* Associated Products Pill */}
                      <div className="mt-3 flex items-center justify-between text-[11px] text-stone-600">
                        <span className="flex items-center gap-1">
                          <UtensilsCrossed className="w-3.5 h-3.5 text-stone-500" />
                          <span>Assigned Festive Dishes:</span>
                        </span>
                        <span className="font-bold text-stone-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          {eventProducts.length} dishes
                        </span>
                      </div>
                    </div>

                    {/* Actions Toolbar */}
                    <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenSummary(ev)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                          title="View kitchen production planning sheet"
                        >
                          <Printer className="w-3 h-3 text-amber-700" />
                          <span>Production Sheet</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleStatus(ev)}
                          className={`px-2 py-1.5 text-[11px] font-semibold rounded-lg border transition-colors cursor-pointer ${
                            ev.status === 'active'
                              ? 'text-stone-700 bg-stone-50 hover:bg-stone-100 border-stone-200'
                              : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                          }`}
                        >
                          {ev.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(ev)}
                          className="p-1.5 hover:bg-stone-100 text-stone-600 rounded-lg cursor-pointer transition-colors"
                          title="Edit festival collection"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEvent(ev)}
                          className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg cursor-pointer transition-colors"
                          title="Delete collection"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Section 2: Instructions & Kitchen Workflow Callout */}
        <div className="bg-gradient-to-r from-amber-50/70 via-stone-50 to-orange-50/50 border border-amber-200/60 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-800 shrink-0">
              <Info className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-xs text-stone-900 uppercase tracking-wider">
              Utsav Specials Cloud Kitchen Operations Guide
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-stone-600">
            <div className="space-y-1">
              <span className="font-bold text-stone-800">1. Dual Advance Payment</span>
              <p className="text-[11px] leading-relaxed">
                Customers choose between <strong>25% Advance Pre-booking</strong> or <strong>100% Upfront</strong>. The 75% remaining balance is recorded at delivery.
              </p>
            </div>
            <div className="space-y-1">
              <span className="font-bold text-stone-800">2. Production Planning Sheet</span>
              <p className="text-[11px] leading-relaxed">
                Kitchen head chefs can click <strong>Production Sheet</strong> above to view confirmed booked quantities per dish, plan raw ingredients, and add buffer portions.
              </p>
            </div>
            <div className="space-y-1">
              <span className="font-bold text-stone-800">3. Festival-Day Stock Conversion</span>
              <p className="text-[11px] leading-relaxed">
                On the festival delivery day, buffer units automatically switch to normal menu listings for on-demand ordering while pre-booked orders remain reserved.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-xl w-full my-8 overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-800">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-stone-900">
                    {editingEvent ? 'Edit Festival Collection' : 'Create Festival Collection'}
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Configure pre-booking window dates and festival delivery details
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Outlet Selector */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Kitchen Outlet *
                </label>
                <select
                  value={formOutletId}
                  onChange={(e) => setFormOutletId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-800 cursor-pointer"
                  required
                >
                  {outlets.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} — {o.city} ({o.address})
                    </option>
                  ))}
                </select>
              </div>

              {/* Festival Name & Slug */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Festival Event Name *
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Diwali Specials 2026"
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    URL Slug
                  </label>
                  <input
                    type="text"
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                    placeholder="e.g. diwali-specials-2026"
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-800"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Collection Description / Story
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="e.g. Celebrate Diwali with heirloom sweets, handi biryanis, and festive gift boxes..."
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-800 resize-none"
                />
              </div>

              {/* Festival Date (Delivery Day) */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Festival Delivery Date (When orders will be fulfilled) *
                </label>
                <input
                  type="date"
                  value={formFestivalDate}
                  onChange={(e) => setFormFestivalDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-800"
                  required
                />
              </div>

              {/* Booking Window: Start and End */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Pre-Booking Starts *
                  </label>
                  <input
                    type="datetime-local"
                    value={formBookingStartAt}
                    onChange={(e) => setFormBookingStartAt(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-800"
                    required
                  />
                  <p className="text-[10px] text-stone-400 mt-1">When pre-orders open to customers</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Pre-Booking Closes (Deadline) *
                  </label>
                  <input
                    type="datetime-local"
                    value={formBookingEndAt}
                    onChange={(e) => setFormBookingEndAt(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-800"
                    required
                  />
                  <p className="text-[10px] text-stone-400 mt-1">Order freeze deadline for kitchen prep</p>
                </div>
              </div>

              {/* Banner Image URL & Presets */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Banner Image URL
                </label>
                <input
                  type="url"
                  value={formBannerImage}
                  onChange={(e) => setFormBannerImage(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-800"
                />

                {/* Presets */}
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-14 h-10 rounded-lg bg-stone-200 border border-stone-300 overflow-hidden shrink-0">
                    <img
                      src={formBannerImage}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = FESTIVE_IMAGE_PRESETS[0].url;
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {FESTIVE_IMAGE_PRESETS.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setFormBannerImage(p.url)}
                        className="px-2 py-0.5 text-[10px] bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md font-medium cursor-pointer"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['active', 'inactive', 'completed'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setFormStatus(st)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border capitalize transition-colors cursor-pointer ${
                        formStatus === st
                          ? 'bg-amber-800 text-white border-amber-800 shadow-xs'
                          : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-stone-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-amber-800 hover:bg-amber-900 active:bg-amber-950 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingEvent ? 'Save Changes' : 'Create Collection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRODUCTION PLANNING SUMMARY MODAL */}
      {isSummaryModalOpen && selectedEventForSummary && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-3xl w-full my-8 overflow-hidden animate-in fade-in zoom-in-95 print:p-0 print:border-none print:shadow-none">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50/80">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-800 text-white flex items-center justify-center font-bold">
                  <ChefHat className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-stone-900 font-heading">
                    {selectedEventForSummary.name} — Production Planning Sheet
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Outlet: {getOutletName(selectedEventForSummary.outletId)} • Fulfillment Date:{' '}
                    {formatDate(selectedEventForSummary.festivalDate)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 print:hidden">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  title="Print Kitchen Sheet"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Sheet</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsSummaryModalOpen(false)}
                  className="p-1.5 text-stone-400 hover:text-stone-600 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {isLoadingSummary ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-8 h-8 border-3 border-amber-800 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-semibold text-stone-600">Calculating Confirmed Bookings...</p>
                </div>
              ) : summaryError ? (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{summaryError}</span>
                </div>
              ) : summaryData ? (
                <div className="space-y-4">
                  {/* Summary Metric Ribbon */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-stone-50 p-3.5 rounded-xl border border-stone-200 text-center">
                    <div>
                      <span className="text-[10px] font-bold text-stone-500 uppercase">Total Pre-booked</span>
                      <p className="text-xl font-black text-amber-800 font-heading">
                        {summaryData.totalBookedUnits} units
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-stone-500 uppercase">Assigned Dishes</span>
                      <p className="text-xl font-black text-stone-900 font-heading">
                        {summaryData.items.length}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-stone-500 uppercase">Extra Buffer Planned</span>
                      <p className="text-xl font-black text-emerald-700 font-heading">
                        {summaryData.items.reduce((sum, it) => sum + it.extraPlanned, 0)} units
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-stone-500 uppercase">Total Kitchen Prep</span>
                      <p className="text-xl font-black text-stone-900 font-heading">
                        {summaryData.items.reduce((sum, it) => sum + it.totalPreparation, 0)} units
                      </p>
                    </div>
                  </div>

                  {/* Production Items Table */}
                  {summaryData.items.length === 0 ? (
                    <div className="py-8 text-center bg-stone-50 rounded-xl border border-dashed border-stone-300">
                      <p className="text-xs text-stone-500">
                        No dishes currently linked to this festival collection.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setIsSummaryModalOpen(false);
                          goToOwnerProducts();
                        }}
                        className="mt-2 text-xs font-bold text-amber-800 hover:underline"
                      >
                        Assign Dishes to Festival Collection →
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-stone-200 rounded-xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-stone-100 text-stone-700 font-bold uppercase tracking-wider text-[10px] border-b border-stone-200">
                          <tr>
                            <th className="py-2.5 px-3">Dish / Item</th>
                            <th className="py-2.5 px-3">Mode</th>
                            <th className="py-2.5 px-3 text-right">Confirmed Pre-booked</th>
                            <th className="py-2.5 px-3 text-right">Extra Buffer</th>
                            <th className="py-2.5 px-3 text-right font-black text-amber-900">Total Prep</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-200">
                          {summaryData.items.map((item) => (
                            <tr key={item.productId} className="hover:bg-stone-50/60">
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-2.5">
                                  {item.image && (
                                    <img
                                      src={item.image}
                                      alt=""
                                      className="w-8 h-8 rounded-lg object-cover shrink-0 border border-stone-200"
                                    />
                                  )}
                                  <div>
                                    <span className="font-bold text-stone-900">{item.productName}</span>
                                    {item.hindiName && (
                                      <span className="text-[10px] text-stone-500 block">
                                        {item.hindiName}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="py-2.5 px-3">
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                    item.availabilityMode === 'prebook_only'
                                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                      : 'bg-stone-100 text-stone-700'
                                  }`}
                                >
                                  {item.availabilityMode === 'prebook_only' ? 'Pre-book Only' : 'Regular'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-black text-amber-800 text-sm">
                                {item.confirmedBookings}
                              </td>
                              <td className="py-2.5 px-3 text-right font-medium text-stone-600">
                                +{item.extraPlanned}
                              </td>
                              <td className="py-2.5 px-3 text-right font-black text-stone-900 text-sm bg-amber-50/40">
                                {item.totalPreparation}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Operational Notes */}
                  <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl text-[11px] text-amber-900 space-y-1">
                    <p className="font-bold">Chief Kitchen Cook Preparation Advice:</p>
                    <p className="text-stone-600">
                      • Confirmed pre-booked portions must be packaged and sealed with festival gift tags.
                      <br />
                      • Buffer portions can be sold directly on festival day if unbooked.
                      <br />• Raw ingredient requirements (rice, ghee, spices, packaging handis) are based on the Total Prep column.
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-end print:hidden">
              <button
                type="button"
                onClick={() => setIsSummaryModalOpen(false)}
                className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Close Sheet
              </button>
            </div>
          </div>
        </div>
      )}
    </OwnerLayout>
  );
};

