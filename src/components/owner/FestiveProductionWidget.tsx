import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FestiveEvent, FestiveProductionItemSummary, Outlet } from '../../types';
import { getFestiveProductionSummary, updateFestiveProductStock } from '../../lib/festiveService';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import {
  ChefHat,
  RefreshCw,
  Printer,
  ArrowRightLeft,
  EyeOff,
  Eye,
  Check,
  AlertCircle,
  Gift,
  CheckCircle2,
} from 'lucide-react';

interface FestiveProductionWidgetProps {
  events: FestiveEvent[];
  outlets: Outlet[];
  token?: string | null;
  lockedOutletId?: string;
  onPrintSheet?: (event: FestiveEvent) => void;
  onProductsChanged?: () => void;
}

export const FestiveProductionWidget: React.FC<FestiveProductionWidgetProps> = ({
  events,
  outlets,
  token,
  lockedOutletId,
  onPrintSheet,
  onProductsChanged,
}) => {
  const scopedEvents = useMemo(() => {
    if (lockedOutletId) {
      return events.filter(
        (ev) => Array.isArray(ev.outletIds) && ev.outletIds.includes(lockedOutletId)
      );
    }
    return events;
  }, [events, lockedOutletId]);

  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [summary, setSummary] = useState<{
    totalBookedUnits: number;
    totalExtraBuffer: number;
    totalKitchenPrep: number;
    specialPackagingUnits: number;
    items: FestiveProductionItemSummary[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  // Per-row buffer drafts and action loading
  const [bufferDrafts, setBufferDrafts] = useState<Record<string, string>>({});
  const [savingProductId, setSavingProductId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Default to first active event (or first event overall)
  useEffect(() => {
    if (scopedEvents.length === 0) {
      setSelectedEventId('');
      setSummary(null);
      return;
    }
    const stillValid = scopedEvents.some((ev) => ev.id === selectedEventId);
    if (!stillValid) {
      const preferred = scopedEvents.find((ev) => ev.status === 'active') || scopedEvents[0];
      setSelectedEventId(preferred.id);
    }
  }, [scopedEvents, selectedEventId]);

  const selectedEvent = useMemo(
    () => scopedEvents.find((ev) => ev.id === selectedEventId) || null,
    [scopedEvents, selectedEventId]
  );

  const activeOutletId = lockedOutletId || selectedEvent?.outletIds?.[0] || '';

  const loadSummary = useCallback(
    async (silent = false) => {
      if (!selectedEvent || !activeOutletId) return;
      if (!silent) setIsLoading(true);
      setError(null);
      try {
        const res = await getFestiveProductionSummary(
          activeOutletId,
          selectedEvent.id,
          token || undefined
        );
        const items = res.items || [];
        const totalBookedUnits = res.totalBookedUnits ?? 0;
        const totalExtraBuffer =
          res.totalExtraBuffer ?? items.reduce((sum, it) => sum + (it.extraPlanned || 0), 0);
        const totalKitchenPrep = res.totalKitchenPrep ?? totalBookedUnits + totalExtraBuffer;
        const specialPackagingUnits =
          res.specialPackagingUnits ??
          items.reduce((sum, it) => sum + (it.specialPackaging ? it.confirmedBookings : 0), 0);

        setSummary({
          totalBookedUnits,
          totalExtraBuffer,
          totalKitchenPrep,
          specialPackagingUnits,
          items,
        });

        setBufferDrafts((prev) => {
          const next: Record<string, string> = {};
          items.forEach((it) => {
            next[it.productId] =
              prev[it.productId] !== undefined && savingProductId === it.productId
                ? prev[it.productId]
                : String(it.extraPlanned ?? 0);
          });
          return next;
        });

        setLastSyncedAt(new Date());
      } catch (err: any) {
        setError(err?.message || 'Unable to load live production summary.');
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [selectedEvent, token, savingProductId]
  );

  useEffect(() => {
    if (selectedEvent && activeOutletId) {
      loadSummary(false);
    }
  }, [selectedEvent?.id, activeOutletId]);

  // Supabase Realtime updates for pre-book orders & products (filtered & debounced)
  useEffect(() => {
    if (!selectedEvent || !activeOutletId || !isSupabaseConfigured()) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (document.visibilityState === 'visible') {
          loadSummary(true);
        }
      }, 800);
    };

    const channel = supabase
      .channel(`utsav-live-prod:${activeOutletId}:${selectedEvent.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `outlet_id=eq.${activeOutletId}` } as any,
        (payload: any) => {
          const row = payload?.new || payload?.old;
          if (row && row.order_type !== 'prebook' && !row.festive_event_id) {
            return;
          }
          scheduleRefresh();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'products' },
        () => {
          scheduleRefresh();
        }
      )
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [selectedEvent?.id, activeOutletId, loadSummary]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleSaveBuffer = async (item: FestiveProductionItemSummary) => {
    if (!selectedEvent) return;
    const raw = bufferDrafts[item.productId] ?? String(item.extraPlanned ?? 0);
    const parsed = Math.max(0, Math.floor(Number(raw)));
    if (isNaN(parsed)) {
      showToast('error', 'Enter a valid non-negative integer for buffer portions.');
      return;
    }

    setSavingProductId(item.productId);
    try {
      await updateFestiveProductStock(
        activeOutletId,
        selectedEvent.id,
        item.productId,
        { action: 'update_buffer', extraPlanned: parsed },
        token || undefined
      );
      showToast('success', `Updated buffer for "${item.productName}" to ${parsed} portions.`);
      await loadSummary(true);
      onProductsChanged?.();
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to update buffer portions.');
    } finally {
      setSavingProductId(null);
    }
  };

  const handleConvertToNormal = async (item: FestiveProductionItemSummary) => {
    if (!selectedEvent) return;
    const draftVal = bufferDrafts[item.productId];
    const extraPortions =
      draftVal !== undefined && draftVal !== '' && !isNaN(Number(draftVal))
        ? Math.max(0, Math.floor(Number(draftVal)))
        : item.extraPlanned;

    setSavingProductId(item.productId);
    try {
      await updateFestiveProductStock(
        activeOutletId,
        selectedEvent.id,
        item.productId,
        { action: 'convert_to_normal', extraPlanned: extraPortions },
        token || undefined
      );
      showToast(
        'success',
        `"${item.productName}" switched to Normal Menu (${extraPortions} unbooked portions open; ${item.confirmedBookings} pre-booked remain reserved).`
      );
      await loadSummary(true);
      onProductsChanged?.();
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to convert surplus stock to normal listing.');
    } finally {
      setSavingProductId(null);
    }
  };

  const handleToggleListing = async (item: FestiveProductionItemSummary) => {
    if (!selectedEvent) return;
    const nextAction = item.inStock === false ? 'relist' : 'delist';
    setSavingProductId(item.productId);
    try {
      await updateFestiveProductStock(
        activeOutletId,
        selectedEvent.id,
        item.productId,
        { action: nextAction },
        token || undefined
      );
      showToast(
        'success',
        nextAction === 'delist'
          ? `"${item.productName}" delisted from storefront at this outlet (existing pre-bookings preserved).`
          : `"${item.productName}" relisted as in stock at this outlet.`
      );
      await loadSummary(true);
      onProductsChanged?.();
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to update listing status.');
    } finally {
      setSavingProductId(null);
    }
  };

  const getOutletLabel = (outletId: string) => {
    const found = outlets.find((o) => o.id === outletId);
    return found ? `${found.name} · ${found.city}` : outletId;
  };

  const formatFestDate = (dateStr?: string) => {
    if (!dateStr) return '—';
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

  if (scopedEvents.length === 0) {
    return null;
  }

  return (
    <section className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
      {/* Header Row */}
      <div className="px-5 py-4 border-b border-stone-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-stone-50/60">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-800 text-white flex items-center justify-center shrink-0">
            <ChefHat className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-sm text-stone-900 font-heading">
                Live Production Planning
              </h3>
              <span className="text-[11px] font-semibold text-emerald-700">
                Realtime
              </span>
              {lastSyncedAt && (
                <span className="text-[11px] text-stone-400 tabular-nums">
                  · Synced {lastSyncedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              )}
            </div>
            {selectedEvent && (
              <p className="text-xs text-stone-500 mt-0.5">
                {getOutletLabel(activeOutletId)} · Delivery {formatFestDate(selectedEvent.festivalDate)}
              </p>
            )}
          </div>
        </div>

        {/* Event Selector + Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="px-3 py-1.5 bg-white border border-stone-200 rounded-xl text-xs font-semibold text-stone-800 focus:outline-none focus:border-amber-800 cursor-pointer"
          >
            {scopedEvents.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name} ({ev.status})
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => loadSummary(false)}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {selectedEvent && (
            <button
              type="button"
              onClick={() => (onPrintSheet ? onPrintSheet(selectedEvent) : window.print())}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Sheet</span>
            </button>
          )}
        </div>
      </div>

      {/* Inline Feedback */}
      {feedback && (
        <div
          className={`mx-5 mt-4 px-3.5 py-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* KPI Strip */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-stone-200 border-b border-stone-200">
          <div className="px-5 py-3.5">
            <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
              Confirmed Pre-Booked
            </span>
            <span className="text-xl font-black text-amber-800 tabular-nums mt-0.5 block">
              {summary.totalBookedUnits}
            </span>
          </div>
          <div className="px-5 py-3.5">
            <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
              Extra Planned Buffer
            </span>
            <span className="text-xl font-black text-emerald-700 tabular-nums mt-0.5 block">
              {summary.totalExtraBuffer}
            </span>
          </div>
          <div className="px-5 py-3.5">
            <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
              Total To Cook
            </span>
            <span className="text-xl font-black text-stone-900 tabular-nums mt-0.5 block">
              {summary.totalKitchenPrep}
            </span>
          </div>
          <div className="px-5 py-3.5">
            <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
              Special Gift Boxes
            </span>
            <span className="text-xl font-black text-stone-800 tabular-nums mt-0.5 block">
              {summary.specialPackagingUnits}
            </span>
          </div>
        </div>
      )}

      {/* Table / Error / Empty */}
      {error ? (
        <div className="p-5">
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      ) : isLoading && !summary ? (
        <div className="py-10 text-center text-xs text-stone-500">
          Loading real-time kitchen prep quantities...
        </div>
      ) : summary && summary.items.length === 0 ? (
        <div className="py-8 px-5 text-center text-xs text-stone-500">
          No dishes assigned to this festival collection for the selected outlet yet.
        </div>
      ) : summary ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-stone-50 text-[11px] font-bold text-stone-500 uppercase tracking-wider border-b border-stone-200">
                <th className="py-3 px-5">Festive Dish</th>
                <th className="py-3 px-3">Mode & Packaging</th>
                <th className="py-3 px-3 text-right">Confirmed</th>
                <th className="py-3 px-3 text-right">Extra Buffer</th>
                <th className="py-3 px-3 text-right">Total Prep</th>
                <th className="py-3 px-5 text-right">Kitchen Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {summary.items.map((item) => {
                const isRowBusy = savingProductId === item.productId;
                const draftValue = bufferDrafts[item.productId] ?? String(item.extraPlanned ?? 0);
                const bufferChanged = Number(draftValue) !== Number(item.extraPlanned ?? 0);

                return (
                  <tr key={item.productId} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-2.5">
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.productName}
                            referrerPolicy="no-referrer"
                            className="w-9 h-9 rounded-lg object-cover border border-stone-200 shrink-0"
                          />
                        )}
                        <div>
                          <span className="font-bold text-stone-900 block">{item.productName}</span>
                          <span className="text-[11px] text-stone-500 tabular-nums">
                            ₹{item.price.toLocaleString('en-IN')}
                            {item.maxBookingQuantity ? ` · Cap ${item.maxBookingQuantity}` : ''}
                            {item.inStock === false ? ' · Delisted' : ''}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex flex-col gap-1 items-start">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            item.availabilityMode === 'prebook_only'
                              ? 'bg-amber-50 text-amber-900 border-amber-200'
                              : 'bg-stone-100 text-stone-700 border-stone-200'
                          }`}
                        >
                          {item.availabilityMode === 'prebook_only' ? 'Pre-book Only' : 'Normal Menu'}
                        </span>
                        {item.specialPackaging && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-stone-600">
                            <Gift className="w-3 h-3 text-amber-700" />
                            <span>Gift Box</span>
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-right font-extrabold text-amber-800 tabular-nums text-sm">
                      {item.confirmedBookings}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <input
                          type="number"
                          min={0}
                          value={draftValue}
                          onChange={(e) =>
                            setBufferDrafts((prev) => ({
                              ...prev,
                              [item.productId]: e.target.value,
                            }))
                          }
                          disabled={isRowBusy}
                          className="w-16 px-2 py-1 text-right bg-white border border-stone-200 rounded-lg text-xs font-semibold text-stone-900 tabular-nums focus:outline-none focus:border-amber-800"
                          aria-label={`Extra planned buffer for ${item.productName}`}
                        />
                        {bufferChanged && (
                          <button
                            type="button"
                            onClick={() => handleSaveBuffer(item)}
                            disabled={isRowBusy}
                            className="p-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-lg cursor-pointer disabled:opacity-50"
                            title="Save buffer portions"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-right font-black text-stone-900 tabular-nums text-sm">
                      {item.totalPreparation}
                    </td>

                    <td className="py-3 px-5 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5 flex-wrap">
                        {item.availabilityMode === 'prebook_only' && (
                          <button
                            type="button"
                            onClick={() => handleConvertToNormal(item)}
                            disabled={isRowBusy}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
                            title="Switch remaining buffer portions to normal on-demand ordering while preserving confirmed pre-bookings"
                          >
                            <ArrowRightLeft className="w-3 h-3" />
                            <span>Convert Surplus</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleToggleListing(item)}
                          disabled={isRowBusy}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer disabled:opacity-50 ${
                            item.inStock === false
                              ? 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200'
                              : 'bg-white hover:bg-rose-50 text-stone-600 hover:text-rose-700 border-stone-200'
                          }`}
                          title={
                            item.inStock === false
                              ? 'Relist dish for ordering at this outlet'
                              : 'Delist dish from ordering at this outlet'
                          }
                        >
                          {item.inStock === false ? (
                            <>
                              <Eye className="w-3 h-3" />
                              <span>Relist</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3 h-3" />
                              <span>Delist</span>
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
};
