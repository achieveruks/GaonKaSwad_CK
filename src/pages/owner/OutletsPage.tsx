import React, { useState, useEffect, useCallback } from 'react';
import { OwnerLayout } from './OwnerLayout';
import { useNavigation } from '../../context/NavigationContext';
import { useAuth } from '../../context/AuthContext';
import { Outlet, DeliveryZone } from '../../types';
import {
  getOutlets,
  getDeliveryZones,
  createOutletApi,
  updateOutletApi,
  toggleOutletActiveApi,
  deleteOutletApi,
} from '../../lib/locationService';
import {
  Store,
  Plus,
  Search,
  MapPin,
  Phone,
  Clock,
  IndianRupee,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Building,
  Layers,
  Filter,
} from 'lucide-react';

export const OutletsPage: React.FC = () => {
  const { goToOwnerDeliveryZones } = useNavigation();
  const { token } = useAuth();

  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCityFilter, setSelectedCityFilter] = useState<string>('all');

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState<Outlet | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [formData, setFormData] = useState<Omit<Outlet, 'id' | 'createdAt' | 'updatedAt'>>({
    name: '',
    city: 'Bangalore',
    state: 'Karnataka',
    address: '',
    phone: '',
    email: '',
    isActive: true,
    minimumOrderValue: 200,
    freeDeliveryThreshold: 499,
    deliveryFee: 40,
    estimatedDeliveryTime: '30-40 mins',
    operatingHours: '11:00 AM - 11:30 PM',
  });

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchOutletsAndZones = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedOutlets, fetchedZones] = await Promise.all([
        getOutlets(true, token || undefined),
        getDeliveryZones(true, token || undefined),
      ]);

      setOutlets(Array.isArray(fetchedOutlets) ? fetchedOutlets : []);
      setZones(Array.isArray(fetchedZones) ? fetchedZones : []);
    } catch (err) {
      console.error('Error fetching outlets:', err);
      setOutlets([]);
      setZones([]);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchOutletsAndZones();
  }, [fetchOutletsAndZones]);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleOpenAddModal = () => {
    setEditingOutlet(null);
    setFormData({
      name: '',
      city: 'Bangalore',
      state: 'Karnataka',
      address: '',
      phone: '9876543210',
      email: 'kitchen@gaonkaswad.com',
      isActive: true,
      minimumOrderValue: 200,
      freeDeliveryThreshold: 499,
      deliveryFee: 40,
      estimatedDeliveryTime: '30-40 mins',
      operatingHours: '11:00 AM - 11:30 PM',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (outlet: Outlet) => {
    setEditingOutlet(outlet);
    setFormData({
      name: outlet.name || '',
      city: outlet.city || 'Bangalore',
      state: outlet.state || 'Karnataka',
      address: outlet.address || '',
      phone: outlet.phone || '',
      email: outlet.email || '',
      isActive: outlet.isActive !== false,
      minimumOrderValue: outlet.minimumOrderValue ?? 200,
      freeDeliveryThreshold: outlet.freeDeliveryThreshold ?? 499,
      deliveryFee: outlet.deliveryFee ?? 40,
      estimatedDeliveryTime: outlet.estimatedDeliveryTime || '30-40 mins',
      operatingHours: outlet.operatingHours || '11:00 AM - 11:30 PM',
      assignedProductIds: outlet.assignedProductIds || [],
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.city.trim() || !formData.address.trim()) {
      showFeedback('error', 'Please fill in required fields (Name, City, Address)');
      return;
    }

    setIsSaving(true);
    try {
      if (editingOutlet) {
        // Update existing
        await updateOutletApi(editingOutlet.id, formData, token || '');
        showFeedback('success', `Outlet "${formData.name}" updated successfully!`);
        setIsModalOpen(false);
        fetchOutletsAndZones();
      } else {
        // Create new
        await createOutletApi(formData, token || '');
        showFeedback('success', `New kitchen outlet "${formData.name}" created!`);
        setIsModalOpen(false);
        fetchOutletsAndZones();
      }
    } catch (err: any) {
      console.error(err);
      showFeedback('error', err.message || 'Error occurred while saving outlet.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (outlet: Outlet) => {
    try {
      const updatedOutlet = await toggleOutletActiveApi(outlet.id, token || '');
      setOutlets((prev) =>
        (Array.isArray(prev) ? prev : []).map((o) =>
          o.id === outlet.id ? updatedOutlet : o
        )
      );
      showFeedback(
        'success',
        `Outlet "${outlet.name}" is now ${updatedOutlet.isActive ? 'Active (Open)' : 'Inactive (Closed)'}`
      );
    } catch (err: any) {
      console.error(err);
      showFeedback('error', err.message || 'Failed to update outlet status.');
    }
  };

  const handleDeleteOutlet = async (id: string) => {
    try {
      await deleteOutletApi(id, token || '');
      showFeedback('success', 'Outlet and associated zones removed.');
      setDeleteConfirmId(null);
      fetchOutletsAndZones();
    } catch (err: any) {
      console.error(err);
      showFeedback('error', err.message || 'Failed to delete outlet.');
    }
  };

  const safeOutlets = Array.isArray(outlets) ? outlets : [];
  const safeZones = Array.isArray(zones) ? zones : [];

  // Derive unique cities
  const cities: string[] = Array.from(
    new Set(safeOutlets.map((o) => o?.city).filter((c): c is string => Boolean(c && typeof c === 'string')))
  );

  // Filter outlets
  const filteredOutlets = safeOutlets.filter((outlet) => {
    const name = outlet?.name || '';
    const address = outlet?.address || '';
    const city = outlet?.city || '';
    const q = (searchQuery || '').toLowerCase().trim();

    const matchesSearch =
      !q ||
      name.toLowerCase().includes(q) ||
      address.toLowerCase().includes(q) ||
      city.toLowerCase().includes(q);

    const matchesCity =
      selectedCityFilter === 'all' ||
      city.toLowerCase() === (selectedCityFilter || '').toLowerCase();

    return matchesSearch && matchesCity;
  });

  const activeCount = safeOutlets.filter((o) => o?.isActive).length;
  const totalPinsCovered = new Set(safeZones.flatMap((z) => z?.pinCodes || [])).size;

  return (
    <OwnerLayout
      activeTab="outlets"
      title="Kitchen Outlets Management"
      subtitle="Manage independent physical kitchen locations across multiple cities with individual operating parameters"
      actions={
        <button
          type="button"
          onClick={handleOpenAddModal}
          className="flex items-center gap-1.5 px-4 py-2 bg-amber-800 hover:bg-amber-900 active:bg-stone-950 text-white rounded-xl font-bold text-xs shadow-2xs transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add New Kitchen Outlet</span>
        </button>
      }
    >
      <div className="space-y-6">
        {/* Toast Notification */}
        {feedbackMsg && (
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedbackMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600" />
              )}
              <span>{feedbackMsg.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackMsg(null)}
              className="text-stone-400 hover:text-stone-700"
            >
              ×
            </button>
          </div>
        )}

        {/* Stats Overview Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
              Total Outlets
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-stone-900 font-heading">
                {safeOutlets.length}
              </span>
              <Store className="w-4 h-4 text-amber-700" />
            </div>
            <p className="text-[11px] text-stone-500 mt-1">Cloud Kitchens</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
              Active Kitchens
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-emerald-700 font-heading">
                {activeCount}
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-[11px] text-stone-500 mt-1">Accepting live orders</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
              Operating Cities
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-stone-900 font-heading">
                {cities.length}
              </span>
              <Building className="w-4 h-4 text-amber-700" />
            </div>
            <p className="text-[11px] text-stone-500 mt-1">{cities.join(', ') || 'None'}</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
              PIN Codes Covered
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-amber-800 font-heading">
                {totalPinsCovered}
              </span>
              <MapPin className="w-4 h-4 text-amber-700" />
            </div>
            <p className="text-[11px] text-stone-500 mt-1">Across {safeZones.length} delivery zones</p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3.5">
          {/* Search Field */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search outlet by name, address, or city..."
              className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:border-amber-700 focus:bg-white text-stone-900"
            />
          </div>

          {/* City Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <span className="text-xs font-semibold text-stone-500 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              <span>City:</span>
            </span>

            <button
              type="button"
              onClick={() => setSelectedCityFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                selectedCityFilter === 'all'
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              All Cities ({safeOutlets.length})
            </button>

            {cities.map((city) => {
              const count = safeOutlets.filter(
                (o) => (o?.city || '').toLowerCase().trim() === (city || '').toLowerCase().trim()
              ).length;
              return (
                <button
                  key={city}
                  type="button"
                  onClick={() => setSelectedCityFilter(city)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                    (selectedCityFilter || '').toLowerCase() === (city || '').toLowerCase()
                      ? 'bg-amber-800 text-white'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  {city} ({count})
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={fetchOutletsAndZones}
            className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg border border-stone-200 transition-colors shrink-0"
            title="Refresh outlets list"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Outlets Grid */}
        {isLoading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-3 border-amber-800 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs font-semibold text-stone-500">Loading kitchen outlets...</p>
          </div>
        ) : filteredOutlets.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-500 mx-auto">
              <Store className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm text-stone-900">No Kitchen Outlets Found</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              {searchQuery
                ? `No outlets match your search "${searchQuery}".`
                : 'Get started by creating your first cloud kitchen outlet location.'}
            </p>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-amber-800 text-white rounded-xl text-xs font-bold"
            >
              Add First Kitchen Outlet
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredOutlets.map((outlet) => {
              const outletZones = safeZones.filter((z) => z.outletId === outlet.id);
              const allPins = outletZones.flatMap((z) => z.pinCodes || []);

              return (
                <div
                  key={outlet.id}
                  className={`bg-white rounded-2xl border transition-all duration-200 p-5 shadow-2xs space-y-4 flex flex-col justify-between ${
                    outlet.isActive
                      ? 'border-stone-200 hover:border-amber-400'
                      : 'border-stone-200 bg-stone-50/60 opacity-85'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header: Name, City Badge, and Status Toggle */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-extrabold text-base text-stone-950 font-heading">
                            {outlet.name}
                          </h3>
                          <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {outlet.city}
                          </span>
                        </div>
                        <p className="text-xs text-stone-600 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span>{outlet.address}</span>
                        </p>
                      </div>

                      {/* Status Toggle Pill */}
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(outlet)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold transition-colors flex items-center gap-1 shrink-0 ${
                          outlet.isActive
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200'
                            : 'bg-rose-100 text-rose-900 border border-rose-300 hover:bg-rose-200'
                        }`}
                        title="Click to toggle status"
                      >
                        {outlet.isActive ? (
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

                    {/* Operational Details Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-stone-50 rounded-xl p-3 border border-stone-200 text-xs">
                      <div>
                        <span className="text-[10px] text-stone-400 block font-semibold">
                          Min. Order
                        </span>
                        <span className="font-bold text-stone-800">
                          ₹{outlet.minimumOrderValue}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-stone-400 block font-semibold">
                          Free Delivery Above
                        </span>
                        <span className="font-bold text-emerald-700">
                          ₹{outlet.freeDeliveryThreshold}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-stone-400 block font-semibold">
                          Delivery Fee
                        </span>
                        <span className="font-bold text-stone-800">
                          ₹{outlet.deliveryFee}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-stone-400 block font-semibold">
                          Est. Time
                        </span>
                        <span className="font-medium text-stone-700">
                          {outlet.estimatedDeliveryTime}
                        </span>
                      </div>

                      <div className="sm:col-span-2">
                        <span className="text-[10px] text-stone-400 block font-semibold">
                          Operating Hours
                        </span>
                        <span className="font-medium text-stone-700 truncate block">
                          {outlet.operatingHours}
                        </span>
                      </div>
                    </div>

                    {/* Contact & Phone */}
                    <div className="flex items-center justify-between text-xs text-stone-500 pt-1">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-stone-400" />
                        <span>+91 {outlet.phone}</span>
                      </div>
                      {outlet.email && <span className="text-[11px]">{outlet.email}</span>}
                    </div>

                    {/* Assigned Zones & PINs Section */}
                    <div className="pt-2 border-t border-stone-100 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-stone-800 flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-amber-700" />
                          <span>Delivery Coverage ({outletZones.length} Zones)</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => goToOwnerDeliveryZones()}
                          className="text-[11px] font-bold text-amber-800 hover:text-amber-950 flex items-center gap-0.5"
                        >
                          <span>Manage Zones</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>

                      {allPins.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {allPins.slice(0, 8).map((pin) => (
                            <span
                              key={pin}
                              className="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-md font-mono text-[10px] font-semibold"
                            >
                              {pin}
                            </span>
                          ))}
                          {allPins.length > 8 && (
                            <span className="px-1.5 py-0.5 bg-stone-100 text-stone-600 rounded-md text-[10px]">
                              +{allPins.length - 8} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-[11px] text-amber-700 italic">
                          No delivery PIN codes assigned yet. Add a zone to start receiving orders.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(outlet)}
                        className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3 text-stone-600" />
                        <span>Edit Details</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(outlet.id)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Outlet"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <span className="text-[10px] text-stone-400 font-mono">
                      ID: {outlet.id}
                    </span>
                  </div>

                  {/* Delete Confirmation Inline Bar */}
                  {deleteConfirmId === outlet.id && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-xs text-rose-900">
                      <p className="font-bold">
                        Are you sure you want to delete &quot;{outlet.name}&quot;?
                      </p>
                      <p className="text-[11px] text-rose-700">
                        This will also remove all assigned delivery zones and disable checkout for this location.
                      </p>
                      <div className="flex gap-2 justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2.5 py-1 bg-white text-stone-700 border border-stone-300 rounded-lg font-semibold text-[11px]"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteOutlet(outlet.id)}
                          className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[11px]"
                        >
                          Confirm Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Add / Edit Outlet Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-5 border-b border-stone-200 flex items-center justify-between sticky top-0 bg-white z-10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800">
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-base text-stone-950 font-heading">
                      {editingOutlet ? 'Edit Kitchen Outlet' : 'Add New Cloud Kitchen Outlet'}
                    </h2>
                    <p className="text-[11px] text-stone-500">
                      {editingOutlet
                        ? `Editing configuration for ${editingOutlet.name}`
                        : 'Register a new physical kitchen location to fulfill orders'}
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
                {/* Basic Details */}
                <div className="space-y-3">
                  <h3 className="font-bold text-xs text-stone-900 uppercase tracking-wider">
                    1. Outlet Identity & Location
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Outlet Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Gaon Ka Swad - Bangalore Indiranagar"
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-700 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        City *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.city || ''}
                        onChange={(e) => {
                          const newCity = e.target.value;
                          let suggestedState = formData.state;
                          const cLower = newCity.toLowerCase();
                          if (cLower.includes('bangalore') || cLower.includes('bengaluru')) suggestedState = 'Karnataka';
                          else if (cLower.includes('bhubaneswar') || cLower.includes('cuttack') || cLower.includes('puri')) suggestedState = 'Odisha';
                          else if (cLower.includes('mumbai') || cLower.includes('pune')) suggestedState = 'Maharashtra';
                          else if (cLower.includes('delhi')) suggestedState = 'Delhi NCR';
                          setFormData({ ...formData, city: newCity, state: suggestedState });
                        }}
                        placeholder="e.g. Bangalore, Bhubaneswar, Mumbai"
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-700 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        State *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.state || ''}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        placeholder="e.g. Karnataka, Odisha, Maharashtra"
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-700 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Contact Phone Number *
                      </label>
                      <input
                        type="tel"
                        required
                        value={formData.phone || ''}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="10-digit mobile number"
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-700 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Kitchen Email
                      </label>
                      <input
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="e.g. kitchen@gaonkaswad.com"
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-700 focus:bg-white"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Physical Kitchen Address & Landmark *
                      </label>
                      <textarea
                        required
                        rows={2}
                        value={formData.address || ''}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="e.g. 100 Feet Road, HAL 2nd Stage, Indiranagar, Bangalore - 560038"
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-700 focus:bg-white resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Operations & Pricing Rules */}
                <div className="space-y-3 pt-3 border-t border-stone-100">
                  <h3 className="font-bold text-xs text-stone-900 uppercase tracking-wider">
                    2. Order & Delivery Rules
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Min. Order Value (₹) *
                      </label>
                      <input
                        type="number"
                        required
                        min={0}
                        value={formData.minimumOrderValue ?? 0}
                        onChange={(e) =>
                          setFormData({ ...formData, minimumOrderValue: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-700 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Free Delivery Above (₹)
                      </label>
                      <input
                        type="number"
                        required
                        min={0}
                        value={formData.freeDeliveryThreshold ?? 0}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            freeDeliveryThreshold: Number(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-700 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Delivery Partner Fee (₹)
                      </label>
                      <input
                        type="number"
                        required
                        min={0}
                        value={formData.deliveryFee ?? 0}
                        onChange={(e) =>
                          setFormData({ ...formData, deliveryFee: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-700 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Est. Delivery Duration
                      </label>
                      <input
                        type="text"
                        value={formData.estimatedDeliveryTime || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, estimatedDeliveryTime: e.target.value })
                        }
                        placeholder="e.g. 30-40 mins"
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-700 focus:bg-white"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Operating Kitchen Hours
                      </label>
                      <input
                        type="text"
                        value={formData.operatingHours || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, operatingHours: e.target.value })
                        }
                        placeholder="e.g. 11:00 AM - 11:30 PM"
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-700 focus:bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Outlet Status */}
                <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-stone-900 block">
                      Kitchen Outlet Active Status
                    </label>
                    <p className="text-[11px] text-stone-500">
                      When active, customers in assigned PIN codes can select and order from this outlet.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
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
                      <span>{editingOutlet ? 'Save Changes' : 'Create Outlet'}</span>
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
