import React, { useState, useEffect, useCallback } from 'react';
import { OwnerLayout } from './OwnerLayout';
import { useNavigation } from '../../context/NavigationContext';
import { useAuth } from '../../context/AuthContext';
import { Outlet, DeliveryZone } from '../../types';
import {
  getOutlets,
  getDeliveryZones,
  createZoneApi,
  updateZoneApi,
  toggleZoneActiveApi,
  deleteZoneApi,
} from '../../lib/locationService';
import {
  MapPin,
  Plus,
  Search,
  Store,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  RefreshCw,
  AlertCircle,
  Clock,
  IndianRupee,
  Layers,
  Filter,
  AlertTriangle,
} from 'lucide-react';

export const DeliveryZonesPage: React.FC = () => {
  const { goToOwnerOutlets } = useNavigation();
  const { token } = useAuth();

  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOutletFilter, setSelectedOutletFilter] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{
    type: 'success' | 'error';
    text: string;
    action?: { label: string; onClick: () => void };
  } | null>(null);
  const [autoTransferConflicts, setAutoTransferConflicts] = useState(false);

  // Form State
  const [formOutletId, setFormOutletId] = useState('');
  const [formName, setFormName] = useState('');
  const [formPinInput, setFormPinInput] = useState('');
  const [formPins, setFormPins] = useState<string[]>([]);
  const [formMinOrder, setFormMinOrder] = useState<number>(200);
  const [formDeliveryFee, setFormDeliveryFee] = useState<number>(40);
  const [formEstTime, setFormEstTime] = useState<string>('30-40 mins');
  const [formIsActive, setFormIsActive] = useState<boolean>(true);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedZones, fetchedOutlets] = await Promise.all([
        getDeliveryZones(true, token || undefined),
        getOutlets(true, token || undefined),
      ]);

      setZones(Array.isArray(fetchedZones) ? fetchedZones : []);
      setOutlets(Array.isArray(fetchedOutlets) ? fetchedOutlets : []);
    } catch (err) {
      console.error('Error fetching delivery zones:', err);
      setZones([]);
      setOutlets([]);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const showFeedback = (
    type: 'success' | 'error',
    text: string,
    action?: { label: string; onClick: () => void }
  ) => {
    setFeedbackMsg({ type, text, action });
    if (!action) {
      setTimeout(() => setFeedbackMsg(null), 5000);
    }
  };

  const handleOpenAddModal = () => {
    setEditingZone(null);
    setAutoTransferConflicts(false);
    const safeO = Array.isArray(outlets) ? outlets : [];
    const defaultOutlet = safeO.find((o) => o.isActive) || safeO[0];
    setFormOutletId(defaultOutlet ? defaultOutlet.id : '');
    setFormName('');
    setFormPinInput('');
    setFormPins([]);
    setFormMinOrder(defaultOutlet?.minimumOrderValue ?? 200);
    setFormDeliveryFee(defaultOutlet?.deliveryFee ?? 40);
    setFormEstTime(defaultOutlet?.estimatedDeliveryTime || '30-40 mins');
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (zone: DeliveryZone) => {
    setEditingZone(zone);
    setAutoTransferConflicts(false);
    setFormOutletId(zone.outletId || '');
    setFormName(zone.name || '');
    setFormPinInput('');
    setFormPins([...(zone.pinCodes || [])]);
    setFormMinOrder(zone.minimumOrderValue ?? 200);
    setFormDeliveryFee(zone.deliveryFee ?? 40);
    setFormEstTime(zone.estimatedDeliveryTime || '30-40 mins');
    setFormIsActive(zone.isActive !== false);
    setIsModalOpen(true);
  };

  // Process PIN input (comma, space, or enter separated)
  const handleAddPinsFromInput = () => {
    if (!formPinInput.trim()) return;
    const tokens = formPinInput
      .split(/[\s,]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const validTokens: string[] = [];
    tokens.forEach((pin) => {
      // 6-digit regex
      if (/^\d{6}$/.test(pin)) {
        if (!formPins.includes(pin)) {
          validTokens.push(pin);
        }
      }
    });

    if (validTokens.length > 0) {
      setFormPins((prev) => [...prev, ...validTokens]);
      setFormPinInput('');
    } else {
      showFeedback('error', 'Please enter valid 6-digit Indian PIN codes (e.g. 560038).');
    }
  };

  const handleRemovePin = (pinToRemove: string) => {
    setFormPins((prev) => prev.filter((p) => p !== pinToRemove));
  };

  // Check for PIN overlap across other active zones
  const getOverlappingPins = (pinsToCheck: string[], currentZoneId?: string) => {
    const conflicts: { pin: string; zoneName: string; outletName: string }[] = [];
    const safeZ = Array.isArray(zones) ? zones : [];
    const safeO = Array.isArray(outlets) ? outlets : [];
    safeZ.forEach((z) => {
      if (String(z.id).trim() === String(currentZoneId || '').trim() || !z.isActive) return;
      (pinsToCheck || []).forEach((pin) => {
        if ((z.pinCodes || []).includes(pin)) {
          const outlet = safeO.find((o) => o.id === z.outletId);
          conflicts.push({
            pin,
            zoneName: z.name,
            outletName: outlet ? outlet.name : z.outletId,
          });
        }
      });
    });
    return conflicts;
  };

  const conflicts = getOverlappingPins(formPins, editingZone?.id);

  const handleRemoveConflictingPins = () => {
    const conflictPinSet = new Set(conflicts.map((c) => c.pin));
    setFormPins((prev) => prev.filter((p) => !conflictPinSet.has(p)));
    setAutoTransferConflicts(false);
    showFeedback('success', 'Conflicting PIN codes removed.');
  };

  const handleFormSubmit = async (e?: React.FormEvent, forceTransfer = false) => {
    if (e) e.preventDefault();
    if (!formName.trim() || !formOutletId) {
      showFeedback('error', 'Please provide a zone name and select an outlet.');
      return;
    }

    if (formPins.length === 0) {
      showFeedback('error', 'Please add at least one valid 6-digit PIN code to this zone.');
      return;
    }

    setIsSaving(true);
    const shouldTransfer = forceTransfer || autoTransferConflicts;
    const payload = {
      outletId: formOutletId,
      name: formName.trim(),
      pinCodes: formPins,
      minimumOrderValue: formMinOrder,
      deliveryFee: formDeliveryFee,
      estimatedDeliveryTime: formEstTime,
      isActive: formIsActive,
      transferConflicts: shouldTransfer,
    };

    try {
      if (editingZone) {
        await updateZoneApi(editingZone.id, payload, token || '');
        showFeedback('success', `Zone "${formName}" updated successfully!`);
        setIsModalOpen(false);
        fetchData();
      } else {
        await createZoneApi(payload, token || '');
        showFeedback('success', `New delivery zone "${formName}" created!`);
        setIsModalOpen(false);
        fetchData();
      }
    } catch (err: any) {
      console.error('Save zone error:', err);
      const errMsg = err.message || 'Error occurred while saving zone.';
      if (errMsg.includes('already assigned to') || conflicts.length > 0) {
        showFeedback('error', errMsg, {
          label: '⚡ Transfer PIN(s) to this Outlet & Save',
          onClick: () => handleFormSubmit(undefined, true),
        });
      } else {
        showFeedback('error', errMsg);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleZoneStatus = async (zone: DeliveryZone) => {
    try {
      if (token) {
        await toggleZoneActiveApi(zone.id, token);
      }
      const updated = !zone.isActive;
      setZones((prev) =>
        (Array.isArray(prev) ? prev : []).map((z) =>
          z.id === zone.id ? { ...z, isActive: updated } : z
        )
      );
      showFeedback(
        'success',
        `Zone "${zone.name}" is now ${updated ? 'Active' : 'Inactive'}`
      );
    } catch (err: any) {
      console.error(err);
      showFeedback('error', err.message || 'Failed to update zone status.');
    }
  };

  const handleDeleteZone = async (id: string) => {
    try {
      await deleteZoneApi(id, token || '');
      showFeedback('success', 'Delivery zone removed.');
      setDeleteConfirmId(null);
      fetchData();
    } catch (err: any) {
      console.error(err);
      showFeedback('error', err.message || 'Failed to delete zone.');
    }
  };

  const safeZones = Array.isArray(zones) ? zones : [];
  const safeOutlets = Array.isArray(outlets) ? outlets : [];

  // Filtering
  const filteredZones = safeZones.filter((zone) => {
    const matchesOutlet =
      selectedOutletFilter === 'all' || zone?.outletId === selectedOutletFilter;

    const zName = zone?.name || '';
    const q = (searchQuery || '').toLowerCase().trim();
    const outletName = safeOutlets.find((o) => o?.id === zone?.outletId)?.name || '';

    const matchesSearch =
      !q ||
      zName.toLowerCase().includes(q) ||
      (zone?.pinCodes || []).some((pin) => (pin || '').includes(searchQuery || '')) ||
      outletName.toLowerCase().includes(q);

    return matchesOutlet && matchesSearch;
  });

  const totalPins = new Set(safeZones.flatMap((z) => z.pinCodes || [])).size;
  const activeZonesCount = safeZones.filter((z) => z.isActive).length;

  return (
    <OwnerLayout
      activeTab="delivery-zones"
      title="Delivery Zones & PIN Codes"
      subtitle="Map customer 6-digit postal PIN codes to specific kitchen outlets for location-based delivery eligibility"
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToOwnerOutlets}
            className="flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl font-bold text-xs transition-colors"
          >
            <Store className="w-3.5 h-3.5 text-stone-600" />
            <span>Manage Outlets</span>
          </button>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-800 hover:bg-amber-900 active:bg-stone-950 text-white rounded-xl font-bold text-xs shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Delivery Zone</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Toast Notification */}
        {feedbackMsg && (
          <div
            className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-semibold ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedbackMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedbackMsg.text}</span>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              {feedbackMsg.action && (
                <button
                  type="button"
                  onClick={feedbackMsg.action.onClick}
                  className="px-3 py-1 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  {feedbackMsg.action.label}
                </button>
              )}
              <button
                type="button"
                onClick={() => setFeedbackMsg(null)}
                className="text-stone-400 hover:text-stone-700 px-1 py-0.5 text-base leading-none"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
              Total Delivery Zones
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-stone-900 font-heading">
                {zones.length}
              </span>
              <Layers className="w-4 h-4 text-amber-700" />
            </div>
            <p className="text-[11px] text-stone-500 mt-1">Configured service areas</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
              Active Zones
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-emerald-700 font-heading">
                {activeZonesCount}
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-[11px] text-stone-500 mt-1">Eligible for live ordering</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
              Total PIN Codes
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-amber-800 font-heading">
                {totalPins}
              </span>
              <MapPin className="w-4 h-4 text-amber-700" />
            </div>
            <p className="text-[11px] text-stone-500 mt-1">Unique serviceable PINs</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
              Associated Outlets
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-stone-900 font-heading">
                {safeOutlets.length}
              </span>
              <Store className="w-4 h-4 text-amber-700" />
            </div>
            <p className="text-[11px] text-stone-500 mt-1">Fulfillment hubs</p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3.5">
          {/* Search by PIN or Zone Name */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by PIN code (e.g. 560038), Zone name, or Outlet..."
              className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:border-amber-700 focus:bg-white text-stone-900"
            />
          </div>

          {/* Outlet Filter Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-stone-500 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              <span>Outlet:</span>
            </span>

            <select
              value={selectedOutletFilter}
              onChange={(e) => setSelectedOutletFilter(e.target.value)}
              className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-700 font-semibold"
            >
              <option value="all">All Outlets ({safeZones.length} Zones)</option>
              {safeOutlets.map((outlet) => {
                const count = safeZones.filter((z) => z.outletId === outlet.id).length;
                return (
                  <option key={outlet.id} value={outlet.id}>
                    {outlet.name} ({count} zones)
                  </option>
                );
              })}
            </select>

            <button
              type="button"
              onClick={fetchData}
              className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg border border-stone-200 transition-colors"
              title="Refresh zones"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Zones List Grid */}
        {isLoading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-3 border-amber-800 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs font-semibold text-stone-500">Loading delivery zones...</p>
          </div>
        ) : filteredZones.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-500 mx-auto">
              <MapPin className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm text-stone-900">No Delivery Zones Found</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              {searchQuery
                ? `No delivery zones match "${searchQuery}".`
                : 'Map postal PIN codes to your cloud kitchen outlets by creating a zone.'}
            </p>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-amber-800 text-white rounded-xl text-xs font-bold"
            >
              Create First Delivery Zone
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredZones.map((zone) => {
              const assignedOutlet = outlets.find((o) => o.id === zone.outletId);

              return (
                <div
                  key={zone.id}
                  className={`bg-white rounded-2xl border transition-all duration-200 p-4.5 shadow-2xs space-y-3.5 flex flex-col justify-between ${
                    zone.isActive
                      ? 'border-stone-200 hover:border-amber-400'
                      : 'border-stone-200 bg-stone-50/60 opacity-80'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Top Header: Zone Name & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-extrabold text-sm text-stone-950 font-heading">
                          {zone.name}
                        </h3>
                        <p className="text-[11px] text-amber-900 font-bold flex items-center gap-1 mt-0.5">
                          <Store className="w-3 h-3 text-amber-700 shrink-0" />
                          <span>{assignedOutlet ? assignedOutlet.name : 'Unassigned Outlet'}</span>
                        </p>
                        {assignedOutlet && (
                          <span className="text-[10px] text-stone-400 block font-medium">
                            City: {assignedOutlet.city}
                          </span>
                        )}
                      </div>

                      {/* Active Status Pill */}
                      <button
                        type="button"
                        onClick={() => handleToggleZoneStatus(zone)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold transition-colors flex items-center gap-1 shrink-0 ${
                          zone.isActive
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200'
                            : 'bg-rose-100 text-rose-900 border border-rose-300 hover:bg-rose-200'
                        }`}
                        title="Toggle Zone Active Status"
                      >
                        {zone.isActive ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                            <span>ACTIVE</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-rose-700" />
                            <span>INACTIVE</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Zone Rules Metrics */}
                    <div className="grid grid-cols-3 gap-2 bg-stone-50 rounded-xl p-2.5 border border-stone-200 text-[11px]">
                      <div>
                        <span className="text-[9px] text-stone-400 block font-semibold">Min. Order</span>
                        <span className="font-bold text-stone-800">
                          ₹{zone.minimumOrderValue ?? assignedOutlet?.minimumOrderValue ?? 200}
                        </span>
                      </div>

                      <div>
                        <span className="text-[9px] text-stone-400 block font-semibold">Fee</span>
                        <span className="font-bold text-stone-800">
                          ₹{zone.deliveryFee ?? assignedOutlet?.deliveryFee ?? 40}
                        </span>
                      </div>

                      <div>
                        <span className="text-[9px] text-stone-400 block font-semibold">Est. Time</span>
                        <span className="font-semibold text-stone-700 truncate block">
                          {zone.estimatedDeliveryTime || assignedOutlet?.estimatedDeliveryTime || '30-40m'}
                        </span>
                      </div>
                    </div>

                    {/* PIN Codes List */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-stone-700 flex items-center gap-1 text-[11px]">
                          <MapPin className="w-3 h-3 text-amber-700" />
                          <span>Serviceable PIN Codes ({zone.pinCodes.length})</span>
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-amber-50/50 border border-amber-100 rounded-xl">
                        {zone.pinCodes.map((pin) => (
                          <span
                            key={pin}
                            className="px-2 py-0.5 bg-white text-stone-900 border border-amber-200 rounded-md font-mono text-[11px] font-bold shadow-2xs"
                          >
                            {pin}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(zone)}
                        className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3 text-stone-600" />
                        <span>Edit Zone</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(zone.id)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Zone"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <span className="text-[10px] text-stone-400 font-mono">
                      ID: {zone.id}
                    </span>
                  </div>

                  {/* Delete confirmation inline */}
                  {deleteConfirmId === zone.id && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-xs text-rose-900">
                      <p className="font-bold">Delete &quot;{zone.name}&quot;?</p>
                      <p className="text-[10px] text-rose-700">
                        Customers in these PIN codes will no longer be mapped to {assignedOutlet?.name}.
                      </p>
                      <div className="flex gap-2 justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2 py-1 bg-white text-stone-700 border border-stone-300 rounded-lg font-semibold text-[10px]"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteZone(zone.id)}
                          className="px-2.5 py-1 bg-rose-600 text-white rounded-lg font-bold text-[10px]"
                        >
                          Confirm
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Add / Edit Zone Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-5 border-b border-stone-200 flex items-center justify-between sticky top-0 bg-white z-10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-base text-stone-950 font-heading">
                      {editingZone ? 'Edit Delivery Zone' : 'Create Delivery Zone'}
                    </h2>
                    <p className="text-[11px] text-stone-500">
                      Map postal PIN codes to a cloud kitchen outlet
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="p-5 space-y-4">
                {/* 1. Outlet Selection & Zone Name */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Assigned Kitchen Outlet *
                    </label>
                    <select
                      required
                      value={formOutletId}
                      onChange={(e) => setFormOutletId(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 font-semibold focus:outline-none focus:border-amber-700 focus:bg-white"
                    >
                      <option value="" disabled>
                        Select Kitchen Outlet
                      </option>
                      {outlets.map((outlet) => (
                        <option key={outlet.id} value={outlet.id}>
                          {outlet.name} ({outlet.city}) {outlet.isActive ? '' : '[INACTIVE]'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Zone Name / Area Identifier *
                    </label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Bangalore East (Indiranagar / Domlur / Koramangala)"
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-700 focus:bg-white"
                    />
                  </div>
                </div>

                {/* 2. PIN Codes Entry */}
                <div className="space-y-2 pt-3 border-t border-stone-100">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-stone-900">
                      Serviceable 6-Digit PIN Codes ({formPins.length}) *
                    </label>
                    <span className="text-[10px] text-stone-400">
                      Type PIN and press Add (or separate by comma)
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formPinInput}
                      onChange={(e) => setFormPinInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddPinsFromInput();
                        }
                      }}
                      placeholder="e.g. 560038, 560008, 560071"
                      className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-700 font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleAddPinsFromInput}
                      className="px-4 py-2 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-colors"
                    >
                      Add PIN(s)
                    </button>
                  </div>

                  {/* Added PINs Chips */}
                  {formPins.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 p-3 bg-stone-50 border border-stone-200 rounded-xl max-h-32 overflow-y-auto">
                      {formPins.map((pin) => (
                        <span
                          key={pin}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-950 border border-amber-300 rounded-lg text-xs font-mono font-bold"
                        >
                          <span>{pin}</span>
                          <button
                            type="button"
                            onClick={() => handleRemovePin(pin)}
                            className="text-amber-800 hover:text-rose-600 font-black text-xs leading-none"
                            title="Remove PIN"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 bg-stone-50 border border-dashed border-stone-300 rounded-xl text-center text-xs text-stone-500">
                      No PIN codes added yet. Enter 6-digit postal codes above to map delivery eligibility.
                    </div>
                  )}

                  {/* Overlap Warning Box */}
                  {conflicts.length > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-amber-900">
                          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                          <span>PIN Code Overlap Notice</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveConflictingPins}
                          className="text-[11px] text-rose-700 hover:text-rose-900 font-bold underline cursor-pointer"
                        >
                          Remove {conflicts.length} overlapping PIN(s)
                        </button>
                      </div>
                      <p className="text-[11px] text-amber-900">
                        The following PIN codes are already mapped to another active kitchen zone:
                      </p>
                      <div className="space-y-0.5 pt-0.5 max-h-24 overflow-y-auto">
                        {conflicts.map((c, idx) => (
                          <div key={idx} className="text-[10px] font-mono text-amber-800">
                            • <strong>PIN {c.pin}</strong> in zone &quot;{c.zoneName}&quot; ({c.outletName})
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between gap-2">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={autoTransferConflicts}
                            onChange={(e) => setAutoTransferConflicts(e.target.checked)}
                            className="w-4 h-4 accent-amber-800 rounded cursor-pointer"
                          />
                          <span className="text-[11px] font-bold text-amber-950">
                            ⚡ Reassign & transfer these PINs to this outlet upon saving
                          </span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Zone Specific Overrides */}
                <div className="space-y-3 pt-3 border-t border-stone-100">
                  <h3 className="font-bold text-xs text-stone-900 uppercase tracking-wider">
                    3. Delivery Parameters for this Zone
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Min. Order (₹)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={formMinOrder}
                        onChange={(e) => setFormMinOrder(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-700"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Delivery Fee (₹)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={formDeliveryFee}
                        onChange={(e) => setFormDeliveryFee(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-700"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Est. Time
                      </label>
                      <input
                        type="text"
                        value={formEstTime}
                        onChange={(e) => setFormEstTime(e.target.value)}
                        placeholder="30-40 mins"
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-700"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Active Switch */}
                <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-stone-900 block">
                      Zone Active Status
                    </label>
                    <p className="text-[11px] text-stone-500">
                      When enabled, customer address checks against these PIN codes will route orders to the assigned outlet.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="w-5 h-5 accent-amber-800 rounded cursor-pointer"
                  />
                </div>

                {/* Modal Actions */}
                <div className="pt-4 border-t border-stone-200 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold text-xs transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 bg-amber-800 hover:bg-amber-900 active:bg-stone-950 text-white rounded-xl font-bold text-xs shadow-2xs transition-colors flex items-center gap-1.5 disabled:bg-stone-400"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>{editingZone ? 'Save Zone Changes' : 'Create Zone'}</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </OwnerLayout>
  );
};
