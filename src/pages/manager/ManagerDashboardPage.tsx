import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';
import { useProducts } from '../../context/ProductContext';
import { Outlet, DeliveryZone, Product } from '../../types';
import { CATEGORIES } from '../../data/products';
import {
  getOutlets,
  getDeliveryZones,
  updateOutletApi,
  toggleOutletActiveApi,
  createZoneApi,
  updateZoneApi,
  toggleZoneActiveApi,
  deleteZoneApi,
  isProductServedAtOutlet,
  isProductInStockAtOutlet,
  isProductFeaturedAtOutlet,
  isProductBestsellerAtOutlet,
  isProductChefSpecialAtOutlet,
  getProductPortionsLeftAtOutlet,
} from '../../lib/locationService';
import {
  Building2,
  Store,
  MapPin,
  UtensilsCrossed,
  SlidersHorizontal,
  Clock,
  IndianRupee,
  Phone,
  CheckCircle2,
  XCircle,
  LogOut,
  ExternalLink,
  Plus,
  Search,
  Check,
  Sparkles,
  Flame,
  ChefHat,
  PackageCheck,
  PackageX,
  RefreshCw,
  AlertCircle,
  X,
  Edit2,
  Trash2,
  Filter,
  Layers,
  ShoppingBag,
} from 'lucide-react';

import { ManagerOrdersTab } from './ManagerOrdersTab';

interface OutletProductItemState {
  productId: string | number;
  isAssigned: boolean;
  inStock: boolean;
  isFeatured: boolean;
  isBestseller: boolean;
  isChefSpecial: boolean;
  portionsLeft: number | null;
}

export const ManagerDashboardPage: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading, ownerUser, profile, logout, token } = useAuth();
  const { goToOwnerLogin, goToHome } = useNavigation();
  const {
    allProducts,
    updateOutletProduct,
    batchUpdateOutletProducts,
    refreshProducts,
  } = useProducts();

  // Active Tab: 'orders' (Received orders & live kitchen queue), 'kitchen' (Menu & branch settings), or 'delivery-zones'
  const [activeTab, setActiveTab] = useState<'orders' | 'kitchen' | 'delivery-zones'>('orders');

  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOutletId, setSelectedOutletId] = useState<string>('');

  // Manage Menu Modal State
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [outletItemStates, setOutletItemStates] = useState<Record<string | number, OutletProductItemState>>({});
  const [modalMenuSearch, setModalMenuSearch] = useState('');
  const [modalMenuCategory, setModalMenuCategory] = useState<string>('all');
  const [modalMenuTab, setModalMenuTab] = useState<'menu' | 'specials' | 'availability'>('menu');
  const [isSavingMenu, setIsSavingMenu] = useState(false);

  // Delivery Zones Modal State
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [zoneFormName, setZoneFormName] = useState('');
  const [zoneFormPinInput, setZoneFormPinInput] = useState('');
  const [zoneFormPins, setZoneFormPins] = useState<string[]>([]);
  const [zoneFormFee, setZoneFormFee] = useState<number>(40);
  const [zoneFormEstTime, setZoneFormEstTime] = useState<string>('30-40 mins');
  const [zoneFormIsActive, setZoneFormIsActive] = useState<boolean>(true);
  const [isSavingZone, setIsSavingZone] = useState(false);
  const [zoneSearchQuery, setZoneSearchQuery] = useState('');
  const [deleteZoneId, setDeleteZoneId] = useState<string | null>(null);

  // Edit Outlet Operating Info Modal
  const [isEditOutletModalOpen, setIsEditOutletModalOpen] = useState(false);
  const [outletFormData, setOutletFormData] = useState({
    name: '',
    phone: '',
    address: '',
    operatingHours: '',
    minimumOrderValue: 200,
    freeDeliveryThreshold: 499,
    packagingFee: 25,
    avgCookingTime: '25-35 mins',
  });
  const [isSavingOutlet, setIsSavingOutlet] = useState(false);

  // Toast / Feedback
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // Guard: Protect manager dashboard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      goToOwnerLogin();
    }
  }, [authLoading, isAuthenticated, goToOwnerLogin]);

  // Load Data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedOutlets, fetchedZones] = await Promise.all([
        getOutlets(true, token || undefined),
        getDeliveryZones(true, token || undefined),
      ]);
      const safeO = Array.isArray(fetchedOutlets) ? fetchedOutlets : [];
      const safeZ = Array.isArray(fetchedZones) ? fetchedZones : [];
      setOutlets(safeO);
      setZones(safeZ);

      // Determine manager's outlet
      const assignedOutletId = ownerUser?.outletId || profile?.outletId;
      if (assignedOutletId && safeO.some((o) => o.id === assignedOutletId)) {
        setSelectedOutletId(assignedOutletId);
      } else if (safeO.length > 0) {
        setSelectedOutletId((prev) => (prev && safeO.some((o) => o.id === prev) ? prev : safeO[0].id));
      }
    } catch (err) {
      console.error('Error fetching manager outlet data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token, ownerUser, profile]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Dynamic scoping for the logged-in manager (Single vs. Multiple outlets)
  const managedOutlets = useMemo(() => {
    const userAssignedIds = ownerUser?.assignedOutletIds || profile?.assignedOutletIds;
    const userOutletId = ownerUser?.outletId || profile?.outletId;

    // 1. If manager has an array of assigned outlet IDs
    if (Array.isArray(userAssignedIds) && userAssignedIds.length > 0) {
      const filtered = outlets.filter((o) => userAssignedIds.includes(o.id));
      if (filtered.length > 0) return filtered;
    }

    // 2. If manager has a single assigned outlet ID from DB / auth session
    if (userOutletId) {
      const filtered = outlets.filter((o) => o.id === userOutletId);
      if (filtered.length > 0) return filtered;
    }

    // 3. Fallback: If user is admin/owner or testing with no explicit restriction, show loaded outlets
    return outlets;
  }, [outlets, ownerUser, profile]);

  const currentOutlet = useMemo(() => {
    if (managedOutlets.length === 0) return null;
    const found = managedOutlets.find((o) => o.id === selectedOutletId);
    return found || managedOutlets[0] || null;
  }, [managedOutlets, selectedOutletId]);

  // Keep selectedOutletId valid within managedOutlets
  useEffect(() => {
    if (managedOutlets.length > 0) {
      if (!selectedOutletId || !managedOutlets.some((o) => o.id === selectedOutletId)) {
        setSelectedOutletId(managedOutlets[0].id);
      }
    }
  }, [managedOutlets, selectedOutletId]);

  const currentOutletZones = useMemo(() => {
    if (!currentOutlet) return [];
    return zones.filter((z) => z.outletId === currentOutlet.id);
  }, [zones, currentOutlet]);

  // Handle Logout
  const handleLogout = async () => {
    await logout();
    goToOwnerLogin();
  };

  // Toggle Outlet Active/Inactive
  const handleToggleOutletStatus = async () => {
    if (!currentOutlet) return;
    try {
      if (token) {
        await toggleOutletActiveApi(currentOutlet.id, token);
      }
      const updated = !currentOutlet.isActive;
      setOutlets((prev) =>
        prev.map((o) => (o.id === currentOutlet.id ? { ...o, isActive: updated } : o))
      );
      showFeedback('success', `Outlet is now ${updated ? 'Online & Taking Orders' : 'Offline'}`);
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to toggle status.');
    }
  };

  // Open Edit Outlet Modal
  const handleOpenEditOutlet = () => {
    if (!currentOutlet) return;
    setOutletFormData({
      name: currentOutlet.name || '',
      phone: currentOutlet.phone || '',
      address: currentOutlet.address || '',
      operatingHours: currentOutlet.operatingHours || '11:00 AM - 11:30 PM',
      minimumOrderValue: currentOutlet.minimumOrderValue ?? 200,
      freeDeliveryThreshold: currentOutlet.freeDeliveryThreshold ?? 499,
      packagingFee: currentOutlet.packagingFee ?? 25,
      avgCookingTime: currentOutlet.avgCookingTime || currentOutlet.estimatedDeliveryTime || '25-35 mins',
    });
    setIsEditOutletModalOpen(true);
  };

  const handleSaveOutlet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOutlet) return;
    setIsSavingOutlet(true);
    try {
      await updateOutletApi(
        currentOutlet.id,
        {
          name: outletFormData.name.trim(),
          phone: outletFormData.phone.trim(),
          address: outletFormData.address.trim(),
          operatingHours: outletFormData.operatingHours.trim(),
          minimumOrderValue: Number(outletFormData.minimumOrderValue) || 200,
          freeDeliveryThreshold: Number(outletFormData.freeDeliveryThreshold) || 499,
          packagingFee: Number(outletFormData.packagingFee) || 25,
          avgCookingTime: outletFormData.avgCookingTime.trim(),
        },
        token || undefined
      );

      setOutlets((prev) =>
        prev.map((o) =>
          o.id === currentOutlet.id
            ? {
                ...o,
                name: outletFormData.name.trim(),
                phone: outletFormData.phone.trim(),
                address: outletFormData.address.trim(),
                operatingHours: outletFormData.operatingHours.trim(),
                minimumOrderValue: Number(outletFormData.minimumOrderValue) || 200,
                freeDeliveryThreshold: Number(outletFormData.freeDeliveryThreshold) || 499,
                packagingFee: Number(outletFormData.packagingFee) || 25,
                avgCookingTime: outletFormData.avgCookingTime.trim(),
              }
            : o
        )
      );

      setIsEditOutletModalOpen(false);
      showFeedback('success', 'Outlet operating settings updated successfully!');
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to save outlet details.');
    } finally {
      setIsSavingOutlet(false);
    }
  };

  // Open Manage Menu Modal
  const handleOpenMenuModal = () => {
    if (!currentOutlet) return;
    const states: Record<string | number, OutletProductItemState> = {};
    const outletId = currentOutlet.id;
    const assignedIds = Array.isArray(currentOutlet.assignedProductIds)
      ? currentOutlet.assignedProductIds.map(String)
      : [];
    const hasAssignedIds = assignedIds.length > 0;

    allProducts.forEach((p) => {
      const isAssigned = hasAssignedIds
        ? assignedIds.includes(String(p.id))
        : isProductServedAtOutlet(p, outletId);

      states[p.id] = {
        productId: p.id,
        isAssigned,
        inStock: isProductInStockAtOutlet(p, outletId),
        isFeatured: isProductFeaturedAtOutlet(p, outletId),
        isBestseller: isProductBestsellerAtOutlet(p, outletId),
        isChefSpecial: isProductChefSpecialAtOutlet(p, outletId),
        portionsLeft: getProductPortionsLeftAtOutlet(p, outletId),
      };
    });

    setOutletItemStates(states);
    setModalMenuSearch('');
    setModalMenuCategory('all');
    setModalMenuTab('menu');
    setIsMenuModalOpen(true);
  };

  const handleToggleItemAssigned = (productId: string | number) => {
    setOutletItemStates((prev) => {
      const cur = prev[productId];
      if (!cur) return prev;
      return {
        ...prev,
        [productId]: {
          ...cur,
          isAssigned: !cur.isAssigned,
        },
      };
    });
  };

  const handleSetItemPortions = (productId: string | number, portions: number | null) => {
    setOutletItemStates((prev) => {
      const cur = prev[productId];
      if (!cur) return prev;
      return {
        ...prev,
        [productId]: {
          ...cur,
          portionsLeft: portions,
          // If manager sets portions to 0, mark inStock according to convention or keep inStock
          inStock: portions === 0 ? false : cur.inStock,
        },
      };
    });
  };

  const handleToggleItemProperty = (
    productId: string | number,
    field: 'inStock' | 'isFeatured' | 'isBestseller' | 'isChefSpecial'
  ) => {
    setOutletItemStates((prev) => {
      const cur = prev[productId];
      if (!cur) return prev;
      return {
        ...prev,
        [productId]: {
          ...cur,
          [field]: !cur[field],
        },
      };
    });
  };

  const handleBatchSelectAll = (select: boolean) => {
    setOutletItemStates((prev) => {
      const updated: Record<string | number, OutletProductItemState> = {};
      Object.keys(prev).forEach((key) => {
        updated[key] = {
          ...prev[key],
          isAssigned: select,
        };
      });
      return updated;
    });
  };

  const handleBatchStockAll = (inStock: boolean) => {
    setOutletItemStates((prev) => {
      const updated: Record<string | number, OutletProductItemState> = {};
      Object.keys(prev).forEach((key) => {
        updated[key] = {
          ...prev[key],
          inStock,
        };
      });
      return updated;
    });
  };

  const handleSaveMenu = async () => {
    if (!currentOutlet) return;
    setIsSavingMenu(true);
    try {
      const itemStateList = Object.values(outletItemStates) as OutletProductItemState[];
      const assignedIds = itemStateList
        .filter((s) => s.isAssigned)
        .map((s) => String(s.productId));

      // 1. Update outlet assignedProductIds
      await updateOutletApi(
        currentOutlet.id,
        { assignedProductIds: assignedIds },
        token || undefined
      );

      // 2. Batch update product configs
      const updates = itemStateList.map((s) => ({
        productId: s.productId,
        isAssigned: s.isAssigned,
        inStock: s.inStock,
        isFeatured: s.isFeatured,
        isBestseller: s.isBestseller,
        isChefSpecial: s.isChefSpecial,
        portionsLeft: s.portionsLeft,
      }));

      await batchUpdateOutletProducts(currentOutlet.id, updates);
      await refreshProducts();
      await fetchData();

      setIsMenuModalOpen(false);
      showFeedback('success', `Menu and stock updated for ${currentOutlet.name}!`);
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to update menu.');
    } finally {
      setIsSavingMenu(false);
    }
  };

  // Delivery Zone Helpers
  const handleOpenAddZone = () => {
    if (!currentOutlet) return;
    setEditingZone(null);
    setZoneFormName('');
    setZoneFormPinInput('');
    setZoneFormPins([]);
    setZoneFormFee(40);
    setZoneFormEstTime('30-40 mins');
    setZoneFormIsActive(true);
    setIsZoneModalOpen(true);
  };

  const handleOpenEditZone = (zone: DeliveryZone) => {
    setEditingZone(zone);
    setZoneFormName(zone.name || '');
    setZoneFormPinInput('');
    setZoneFormPins([...(zone.pinCodes || [])]);
    setZoneFormFee(zone.deliveryFee ?? 40);
    setZoneFormEstTime(zone.estimatedDeliveryTime || '30-40 mins');
    setZoneFormIsActive(zone.isActive !== false);
    setIsZoneModalOpen(true);
  };

  const handleAddPinsFromInput = () => {
    if (!zoneFormPinInput.trim()) return;
    const tokens = zoneFormPinInput
      .split(/[\s,]+/)
      .map((t) => t.trim())
      .filter((t) => /^\d{6}$/.test(t));

    const newPins = Array.from(new Set([...zoneFormPins, ...tokens]));
    setZoneFormPins(newPins);
    setZoneFormPinInput('');
  };

  const handleRemovePin = (pin: string) => {
    setZoneFormPins((prev) => prev.filter((p) => p !== pin));
  };

  const handleSaveZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOutlet) return;
    if (zoneFormPins.length === 0) {
      showFeedback('error', 'Please enter at least one valid 6-digit postal PIN code.');
      return;
    }

    setIsSavingZone(true);
    try {
      if (editingZone) {
        await updateZoneApi(
          editingZone.id,
          {
            outletId: currentOutlet.id,
            name: zoneFormName.trim() || `Zone ${currentOutlet.name}`,
            pinCodes: zoneFormPins,
            deliveryFee: Number(zoneFormFee) || 0,
            estimatedDeliveryTime: zoneFormEstTime.trim(),
            isActive: zoneFormIsActive,
          },
          token || undefined
        );
        showFeedback('success', `Zone "${zoneFormName}" updated successfully!`);
      } else {
        await createZoneApi(
          {
            outletId: currentOutlet.id,
            name: zoneFormName.trim() || `${currentOutlet.name} Delivery Area`,
            pinCodes: zoneFormPins,
            deliveryFee: Number(zoneFormFee) || 0,
            estimatedDeliveryTime: zoneFormEstTime.trim(),
            isActive: zoneFormIsActive,
          },
          token || undefined
        );
        showFeedback('success', `New delivery zone created for ${currentOutlet.name}!`);
      }
      setIsZoneModalOpen(false);
      fetchData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to save delivery zone.');
    } finally {
      setIsSavingZone(false);
    }
  };

  const handleToggleZoneActive = async (zone: DeliveryZone) => {
    try {
      if (token) {
        await toggleZoneActiveApi(zone.id, token);
      }
      const updated = !zone.isActive;
      setZones((prev) =>
        prev.map((z) => (z.id === zone.id ? { ...z, isActive: updated } : z))
      );
      showFeedback('success', `Zone "${zone.name}" is now ${updated ? 'Active' : 'Inactive'}`);
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to update zone status.');
    }
  };

  const handleDeleteZone = async (id: string) => {
    try {
      await deleteZoneApi(id, token || '');
      showFeedback('success', 'Delivery zone removed.');
      setDeleteZoneId(null);
      fetchData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to delete zone.');
    }
  };

  // Filtered Products for Manage Menu Modal
  const modalFilteredProducts = useMemo(() => {
    return allProducts.filter((product) => {
      let matchesCategory = modalMenuCategory === 'all';
      if (!matchesCategory) {
        const catObj = CATEGORIES.find(
          (c) => c.slug === modalMenuCategory || c.id === modalMenuCategory
        );
        const matchSlugs = catObj ? [catObj.slug, catObj.id] : [modalMenuCategory];
        matchesCategory = matchSlugs.includes(product.category);
      }

      const q = (modalMenuSearch || '').toLowerCase().trim();
      const matchesSearch =
        !q ||
        product.name.toLowerCase().includes(q) ||
        (product.hindiName && product.hindiName.toLowerCase().includes(q)) ||
        product.category.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [allProducts, modalMenuCategory, modalMenuSearch]);

  const availableCategories = useMemo(() => {
    const categoriesFromProducts = Array.from(new Set(allProducts.map((p) => p.category)));
    return CATEGORIES.filter(
      (c) => categoriesFromProducts.includes(c.slug) || categoriesFromProducts.includes(c.id)
    );
  }, [allProducts]);

  const getCategoryLabel = (cat: string) => {
    const found = CATEGORIES.find((c) => c.slug === cat || c.id === cat);
    return found ? found.name : cat.replace(/-/g, ' ');
  };

  // Outlet stats
  const servedProducts = currentOutlet
    ? allProducts.filter((p) => isProductServedAtOutlet(p, currentOutlet.id))
    : [];
  const inStockProducts = currentOutlet
    ? servedProducts.filter((p) => isProductInStockAtOutlet(p, currentOutlet.id))
    : [];
  const featuredCount = currentOutlet
    ? servedProducts.filter((p) => isProductFeaturedAtOutlet(p, currentOutlet.id)).length
    : 0;
  const bestsellerCount = currentOutlet
    ? servedProducts.filter((p) => isProductBestsellerAtOutlet(p, currentOutlet.id)).length
    : 0;
  const chefSpecialCount = currentOutlet
    ? servedProducts.filter((p) => isProductChefSpecialAtOutlet(p, currentOutlet.id)).length
    : 0;

  const totalPins = currentOutletZones.flatMap((z) => z.pinCodes || []);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-amber-800 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-stone-600">Loading Manager Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-stone-900 text-white border-b border-stone-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo & Manager Badge */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-800 flex items-center justify-center text-white font-black text-sm shadow-2xs">
                G
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm tracking-tight text-white font-heading">
                    Gaon Ka Swad
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded uppercase border bg-blue-950 text-blue-400 border-blue-800">
                    Outlet Manager
                  </span>
                </div>
                <p className="text-[10px] text-stone-400">
                  {currentOutlet ? `Kitchen: ${currentOutlet.name}` : 'Kitchen Branch Portal'}
                </p>
              </div>
            </div>

            {/* Manager Navigation Options: "Kitchen Orders", "Menu & Kitchen", and "Delivery Zones & PINs" */}
            <nav className="flex items-center gap-1.5 overflow-x-auto">
              <button
                type="button"
                id="manager-nav-orders"
                onClick={() => setActiveTab('orders')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'orders'
                    ? 'bg-amber-800 text-white shadow-2xs'
                    : 'text-stone-300 hover:text-white hover:bg-stone-800'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Kitchen Orders</span>
              </button>

              <button
                type="button"
                id="manager-nav-dashboard"
                onClick={() => setActiveTab('kitchen')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'kitchen'
                    ? 'bg-amber-800 text-white shadow-2xs'
                    : 'text-stone-300 hover:text-white hover:bg-stone-800'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>Menu & Kitchen</span>
              </button>

              <button
                type="button"
                id="manager-nav-delivery-zones"
                onClick={() => setActiveTab('delivery-zones')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'delivery-zones'
                    ? 'bg-amber-800 text-white shadow-2xs'
                    : 'text-stone-300 hover:text-white hover:bg-stone-800'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Delivery Zones & PINs</span>
              </button>
            </nav>

            {/* Right Controls: View Live Storefront and Logout */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={goToHome}
                className="hidden sm:flex items-center gap-1 text-xs text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 px-2.5 py-1.5 rounded-lg border border-stone-700 transition-colors cursor-pointer"
                title="View customer-facing storefront"
              >
                <ExternalLink className="w-3 h-3 text-stone-400" />
                <span>Live Storefront</span>
              </button>

              <div className="h-4 w-px bg-stone-800 hidden sm:block" />

              <div className="flex items-center gap-2 text-xs text-stone-300">
                <span className="text-[11px] font-medium text-stone-200 hidden md:inline truncate max-w-[140px]">
                  {ownerUser?.name || ownerUser?.email || 'manager@gaonkaswad.com'}
                </span>
                <button
                  type="button"
                  id="manager-logout-btn"
                  onClick={handleLogout}
                  className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 px-2.5 py-1.5 rounded-lg border border-rose-900/50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Floating Feedback Alert */}
      {feedbackMsg && (
        <div className="fixed top-20 right-4 z-50 animate-bounce">
          <div
            className={`px-4 py-2.5 rounded-xl shadow-lg border text-xs font-bold flex items-center gap-2 ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-900 text-emerald-100 border-emerald-700'
                : 'bg-rose-900 text-rose-100 border-rose-700'
            }`}
          >
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        </div>
      )}

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Branch Switcher (Rendered ONLY when manager is authorized for multiple outlets) */}
        {managedOutlets.length > 1 && (
          <div className="bg-white rounded-xl border border-stone-200 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-800" />
              <span className="text-xs font-bold text-stone-800">Select Kitchen Branch:</span>
            </div>
            <select
              id="manager-outlet-select"
              value={selectedOutletId}
              onChange={(e) => setSelectedOutletId(e.target.value)}
              className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold text-stone-800 focus:outline-none focus:border-amber-700 cursor-pointer"
            >
              {managedOutlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} ({o.city}) {o.isActive ? '• Online' : '• Offline'}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* TAB 0: KITCHEN ORDERS (Live orders, received, prepare, pack, transition, timestamps) */}
        {activeTab === 'orders' && currentOutlet && (
          <ManagerOrdersTab
            currentOutlet={currentOutlet}
            showFeedback={showFeedback}
          />
        )}

        {/* TAB 1: KITCHEN DASHBOARD (Dedicated Single Outlet Card + Live Status + Manage Menu) */}
        {activeTab === 'kitchen' && currentOutlet && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-black text-stone-900 font-heading tracking-tight">
                  Kitchen: {currentOutlet.name}
                </h1>
                <p className="text-xs text-stone-500">
                  Kitchen outlet management, live menu item availability, and operating hours.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchData}
                  className="px-3 py-1.5 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Quick Stats Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
                  Dishes Served
                </span>
                <span className="text-xl font-extrabold text-stone-900 mt-1 block">
                  {servedProducts.length}
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold mt-0.5 block">
                  {inStockProducts.length} In-Stock
                </span>
              </div>

              <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
                  Delivery Zones
                </span>
                <span className="text-xl font-extrabold text-stone-900 mt-1 block">
                  {currentOutletZones.length}
                </span>
                <span className="text-[10px] text-stone-500 font-medium mt-0.5 block">
                  {totalPins.length} PINs Served
                </span>
              </div>

              <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
                  Min. Order Value
                </span>
                <span className="text-xl font-extrabold text-stone-900 mt-1 block">
                  ₹{currentOutlet.minimumOrderValue ?? 200}
                </span>
                <span className="text-[10px] text-stone-500 font-medium mt-0.5 block">
                  Free above ₹{currentOutlet.freeDeliveryThreshold ?? 499}
                </span>
              </div>

              <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
                  Kitchen Status
                </span>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      currentOutlet.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                    }`}
                  />
                  <span className="text-xs font-bold text-stone-900">
                    {currentOutlet.isActive ? 'Accepting Orders' : 'Offline / Closed'}
                  </span>
                </div>
              </div>
            </div>

            {/* The Main Outlet Card */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-stone-100">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-lg font-extrabold text-stone-950 font-heading">
                      {currentOutlet.name}
                    </h2>
                    <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {currentOutlet.city}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span>{currentOutlet.address}</span>
                  </p>
                  <p className="text-xs text-stone-600 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span>+91 {currentOutlet.phone || '9876543210'}</span>
                  </p>
                </div>

                {/* Status Toggle & Edit Action */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleToggleOutletStatus}
                    className={`px-3 py-1.5 rounded-full text-xs font-extrabold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                      currentOutlet.isActive
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200'
                        : 'bg-rose-100 text-rose-900 border border-rose-300 hover:bg-rose-200'
                    }`}
                  >
                    {currentOutlet.isActive ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                        <span>KITCHEN ONLINE</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5 text-rose-700" />
                        <span>KITCHEN OFFLINE</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenEditOutlet}
                    className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-stone-500" />
                    <span>Edit Info</span>
                  </button>
                </div>
              </div>

              {/* Operational Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-stone-50 rounded-xl p-4 border border-stone-200 text-xs">
                <div>
                  <span className="text-[10px] text-stone-400 block font-semibold uppercase">
                    Min. Order Value
                  </span>
                  <span className="font-bold text-stone-900 text-sm mt-0.5 block">
                    ₹{currentOutlet.minimumOrderValue ?? 200}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-stone-400 block font-semibold uppercase">
                    Free Delivery Threshold
                  </span>
                  <span className="font-bold text-emerald-700 text-sm mt-0.5 block">
                    ₹{currentOutlet.freeDeliveryThreshold ?? 499}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-stone-400 block font-semibold uppercase">
                    Packaging Fee
                  </span>
                  <span className="font-bold text-stone-900 text-sm mt-0.5 block">
                    ₹{currentOutlet.packagingFee ?? 25}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-stone-400 block font-semibold uppercase">
                    Avg Cooking / Prep
                  </span>
                  <span className="font-bold text-stone-900 text-sm mt-0.5 block">
                    {currentOutlet.avgCookingTime || currentOutlet.estimatedDeliveryTime || '25-35 mins'}
                  </span>
                </div>

                <div className="col-span-2 sm:col-span-4 pt-2 border-t border-stone-200/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-stone-400" />
                    <span className="font-medium text-stone-700">
                      Operating Hours: <strong className="text-stone-900">{currentOutlet.operatingHours || '11:00 AM - 11:30 PM'}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Menu Management Section */}
              <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-900 shrink-0">
                    <UtensilsCrossed className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-sm text-stone-900">
                        Kitchen Menu Catalog ({servedProducts.length} Items)
                      </h4>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                        {inStockProducts.length} In-Stock
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 mt-0.5">
                      {featuredCount > 0 && `${featuredCount} Featured • `}
                      {bestsellerCount > 0 && `${bestsellerCount} Bestsellers • `}
                      {chefSpecialCount > 0 && `${chefSpecialCount} Chef's Specials`}
                      {servedProducts.length - inStockProducts.length > 0 && (
                        <span className="text-rose-700 font-bold ml-1">
                          ({servedProducts.length - inStockProducts.length} Currently Out of Stock)
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  id="manager-manage-menu-btn"
                  onClick={handleOpenMenuModal}
                  className="w-full sm:w-auto px-4 py-2.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-2xs"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>Manage Menu & Stock</span>
                </button>
              </div>

              {/* Delivery PINs Summary */}
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-700 shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-stone-900">
                      Delivering to {totalPins.length} Postal PIN Codes
                    </h4>
                    <p className="text-[11px] text-stone-500 line-clamp-1">
                      {totalPins.length > 0
                        ? totalPins.slice(0, 8).join(', ') + (totalPins.length > 8 ? '...' : '')
                        : 'No delivery PIN codes assigned yet.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('delivery-zones')}
                  className="text-xs font-bold text-amber-800 hover:text-amber-900 underline cursor-pointer"
                >
                  Manage Zones & PINs →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DELIVERY ZONES & PINS */}
        {activeTab === 'delivery-zones' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-black text-stone-900 font-heading tracking-tight">
                  Delivery Zones & Postal PINs — {currentOutlet?.name}
                </h1>
                <p className="text-xs text-stone-500">
                  Configure customer postal PIN codes mapped to {currentOutlet?.name || 'this kitchen'} for express delivery.
                </p>
              </div>
              <button
                type="button"
                id="manager-add-zone-btn"
                onClick={handleOpenAddZone}
                className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Delivery Zone</span>
              </button>
            </div>

            {/* Search and Filters */}
            <div className="bg-white rounded-xl border border-stone-200 p-3.5 flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={zoneSearchQuery}
                  onChange={(e) => setZoneSearchQuery(e.target.value)}
                  placeholder="Search by zone name or 6-digit PIN code..."
                  className="w-full pl-9 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-amber-700"
                />
              </div>
              {zoneSearchQuery && (
                <button
                  type="button"
                  onClick={() => setZoneSearchQuery('')}
                  className="text-xs text-stone-500 hover:text-stone-800"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Zones Grid */}
            {currentOutletZones.length === 0 ? (
              <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800 mx-auto">
                  <MapPin className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-sm text-stone-900">No Delivery Zones Found</h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  Add delivery zones and 6-digit postal PIN codes to enable ordering for nearby customers.
                </p>
                <button
                  type="button"
                  onClick={handleOpenAddZone}
                  className="px-4 py-2 bg-amber-800 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Add First Delivery Zone
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentOutletZones
                  .filter((zone) => {
                    const q = zoneSearchQuery.toLowerCase().trim();
                    if (!q) return true;
                    return (
                      (zone.name || '').toLowerCase().includes(q) ||
                      (zone.pinCodes || []).some((p) => p.includes(q))
                    );
                  })
                  .map((zone) => (
                    <div
                      key={zone.id}
                      className="bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-extrabold text-sm text-stone-900">
                              {zone.name || 'Standard Delivery Area'}
                            </h3>
                            <p className="text-[11px] text-stone-500">
                              Est. Delivery: <strong>{zone.estimatedDeliveryTime || '30-40 mins'}</strong> • Fee: ₹{zone.deliveryFee ?? 40}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggleZoneActive(zone)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold transition-colors flex items-center gap-1 shrink-0 ${
                              zone.isActive
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                : 'bg-rose-100 text-rose-900 border border-rose-300'
                            }`}
                          >
                            {zone.isActive ? 'ACTIVE' : 'INACTIVE'}
                          </button>
                        </div>

                        {/* PIN Codes Chips */}
                        <div>
                          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1.5">
                            Covered PIN Codes ({(zone.pinCodes || []).length})
                          </span>
                          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                            {(zone.pinCodes || []).map((pin) => (
                              <span
                                key={pin}
                                className="px-2 py-0.5 bg-stone-100 text-stone-800 border border-stone-200 rounded-md text-[11px] font-mono font-bold"
                              >
                                {pin}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditZone(zone)}
                          className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit Zone</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteZone(zone.id)}
                          className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL 1: MANAGE MENU & STOCK MODAL */}
      {isMenuModalOpen && currentOutlet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/60">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base text-stone-900 font-heading">
                    Manage Kitchen Menu & Item Stock
                  </h3>
                  <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold px-2 py-0.2 rounded-full uppercase">
                    {currentOutlet.name}
                  </span>
                </div>
                <p className="text-xs text-stone-500">
                  Select which dishes are served at this branch, toggle daily in-stock availability, and spotlight bestsellers.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMenuModalOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter & Batch Controls Toolbar */}
            <div className="p-4 border-b border-stone-100 bg-white space-y-3">
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                {/* Search Bar */}
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={modalMenuSearch}
                    onChange={(e) => setModalMenuSearch(e.target.value)}
                    placeholder="Search dishes by name..."
                    className="w-full pl-9 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-amber-700 font-medium"
                  />
                </div>

                {/* Category Dropdown */}
                <div className="w-full sm:w-auto shrink-0">
                  <select
                    value={modalMenuCategory}
                    onChange={(e) => setModalMenuCategory(e.target.value)}
                    className="w-full sm:w-auto px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none focus:border-amber-700 font-semibold"
                  >
                    <option value="all">All Categories ({allProducts.length})</option>
                    {availableCategories.map((cat) => {
                      const count = allProducts.filter((p) => {
                        const catObj = CATEGORIES.find(
                          (c) => c.slug === cat.slug || c.id === cat.slug
                        );
                        const matchSlugs = catObj ? [catObj.slug, catObj.id] : [cat.slug];
                        return matchSlugs.includes(p.category);
                      }).length;
                      return (
                        <option key={cat.slug} value={cat.slug}>
                          {cat.name} {count > 0 ? `(${count})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Batch Selection Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => handleBatchSelectAll(true)}
                    className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-lg transition-colors text-[11px]"
                  >
                    Select All Dishes
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBatchSelectAll(false)}
                    className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-lg transition-colors text-[11px]"
                  >
                    Deselect All
                  </button>
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => handleBatchStockAll(true)}
                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold rounded-lg transition-colors text-[11px] flex items-center gap-1"
                  >
                    <PackageCheck className="w-3 h-3 text-emerald-600" />
                    <span>All In-Stock</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBatchStockAll(false)}
                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-semibold rounded-lg transition-colors text-[11px] flex items-center gap-1"
                  >
                    <PackageX className="w-3 h-3 text-rose-600" />
                    <span>All Out-of-Stock</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Products List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-stone-100">
              {modalFilteredProducts.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <UtensilsCrossed className="w-8 h-8 text-stone-300 mx-auto" />
                  <p className="text-xs text-stone-500 font-medium">No dishes match your filter criteria.</p>
                </div>
              ) : (
                modalFilteredProducts.map((product) => {
                  const state = outletItemStates[product.id] || {
                    productId: product.id,
                    isAssigned: false,
                    inStock: true,
                    isFeatured: false,
                    isBestseller: false,
                    isChefSpecial: false,
                  };

                  return (
                    <div
                      key={product.id}
                      className={`pt-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-xl transition-colors ${
                        state.isAssigned
                          ? 'bg-amber-50/40 border border-amber-200/60'
                          : 'bg-stone-50/40 opacity-60'
                      }`}
                    >
                      {/* Left: Checkbox + Dish Info */}
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id={`manager-product-checkbox-${product.id}`}
                          checked={state.isAssigned}
                          onChange={() => handleToggleItemAssigned(product.id)}
                          className="w-4 h-4 rounded text-amber-800 focus:ring-amber-800 cursor-pointer"
                        />
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-stone-100 shrink-0 border border-stone-200">
                          <img
                            src={product.image || product.imageUrl || 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?q=80&w=200'}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-xs text-stone-900">
                              {product.name}
                            </span>
                            <span className="text-xs font-bold text-amber-900">
                              ₹{product.price}
                            </span>
                          </div>
                          <p className="text-[10px] text-amber-900/70 font-medium">
                            {getCategoryLabel(product.category)}
                          </p>
                        </div>
                      </div>

                      {/* Right: Badges, Portion Limit & Stock Controls */}
                      {state.isAssigned && (
                        <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-center">
                          {/* Portion Counter Input */}
                          <div className="flex items-center gap-1 bg-white border border-stone-200 rounded-lg px-2 py-0.5 shadow-2xs">
                            <span className="text-[10px] font-bold text-stone-600 shrink-0">Portions:</span>
                            <input
                              type="number"
                              min="0"
                              max="999"
                              placeholder="∞"
                              value={state.portionsLeft === null || state.portionsLeft === undefined ? '' : state.portionsLeft}
                              onChange={(e) => {
                                const val = e.target.value.trim();
                                handleSetItemPortions(product.id, val === '' ? null : Math.max(0, parseInt(val, 10) || 0));
                              }}
                              className="w-12 text-center text-xs font-extrabold text-stone-900 bg-stone-50 border border-stone-200 rounded px-1 py-0.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                              title="Portions left for today (leave blank for unlimited)"
                            />
                            {state.portionsLeft === 0 ? (
                              <span className="text-[9px] font-extrabold text-rose-700 bg-rose-50 px-1 py-0.2 rounded border border-rose-200">
                                Sold Out
                              </span>
                            ) : state.portionsLeft !== null && state.portionsLeft !== undefined ? (
                              <span className={`text-[9px] font-bold px-1 py-0.2 rounded ${state.portionsLeft <= 5 ? 'text-amber-700 bg-amber-50' : 'text-stone-600'}`}>
                                left
                              </span>
                            ) : (
                              <span className="text-[9px] text-stone-400 font-medium">unlimited</span>
                            )}
                          </div>

                          {/* In Stock Toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggleItemProperty(product.id, 'inStock')}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-colors flex items-center gap-1 cursor-pointer ${
                              state.inStock
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                : 'bg-rose-100 text-rose-900 border border-rose-300'
                            }`}
                          >
                            {state.inStock ? (
                              <>
                                <PackageCheck className="w-3 h-3 text-emerald-700" />
                                <span>In Stock</span>
                              </>
                            ) : (
                              <>
                                <PackageX className="w-3 h-3 text-rose-700" />
                                <span>Out of Stock</span>
                              </>
                            )}
                          </button>

                          {/* Featured Pill */}
                          <button
                            type="button"
                            onClick={() => handleToggleItemProperty(product.id, 'isFeatured')}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                              state.isFeatured
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-stone-100 text-stone-500 border border-stone-200'
                            }`}
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Featured</span>
                          </button>

                          {/* Bestseller Pill */}
                          <button
                            type="button"
                            onClick={() => handleToggleItemProperty(product.id, 'isBestseller')}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                              state.isBestseller
                                ? 'bg-orange-100 text-orange-900 border border-orange-300'
                                : 'bg-stone-100 text-stone-500 border border-stone-200'
                            }`}
                          >
                            <Flame className="w-3 h-3" />
                            <span>Bestseller</span>
                          </button>

                          {/* Chef Special Pill */}
                          <button
                            type="button"
                            onClick={() => handleToggleItemProperty(product.id, 'isChefSpecial')}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                              state.isChefSpecial
                                ? 'bg-purple-100 text-purple-900 border border-purple-300'
                                : 'bg-stone-100 text-stone-500 border border-stone-200'
                            }`}
                          >
                            <ChefHat className="w-3 h-3" />
                            <span>Chef Special</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-stone-100 bg-stone-50 flex items-center justify-between">
              <span className="text-xs text-stone-500">
                {(Object.values(outletItemStates) as OutletProductItemState[]).filter((s) => s.isAssigned).length} dishes selected for {currentOutlet.name}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsMenuModalOpen(false)}
                  className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-xl text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="manager-save-menu-btn"
                  onClick={handleSaveMenu}
                  disabled={isSavingMenu}
                  className="px-5 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs disabled:opacity-60 flex items-center gap-1.5"
                >
                  {isSavingMenu ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Menu Changes</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT OUTLET OPERATING DETAILS MODAL */}
      {isEditOutletModalOpen && currentOutlet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-md w-full overflow-hidden">
            <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50">
              <h3 className="font-extrabold text-sm text-stone-900 font-heading">
                Edit Kitchen Operating Details
              </h3>
              <button
                type="button"
                onClick={() => setIsEditOutletModalOpen(false)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveOutlet} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Outlet Name</label>
                <input
                  type="text"
                  required
                  value={outletFormData.name}
                  onChange={(e) => setOutletFormData({ ...outletFormData, name: e.target.value })}
                  className="w-full px-3 py-1.5 border border-stone-200 rounded-lg focus:outline-none focus:border-amber-700"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  required
                  value={outletFormData.phone}
                  onChange={(e) => setOutletFormData({ ...outletFormData, phone: e.target.value })}
                  className="w-full px-3 py-1.5 border border-stone-200 rounded-lg focus:outline-none focus:border-amber-700"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Address</label>
                <input
                  type="text"
                  required
                  value={outletFormData.address}
                  onChange={(e) => setOutletFormData({ ...outletFormData, address: e.target.value })}
                  className="w-full px-3 py-1.5 border border-stone-200 rounded-lg focus:outline-none focus:border-amber-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Min Order (₹)</label>
                  <input
                    type="number"
                    value={outletFormData.minimumOrderValue}
                    onChange={(e) => setOutletFormData({ ...outletFormData, minimumOrderValue: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-stone-200 rounded-lg focus:outline-none focus:border-amber-700"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Free Delivery (₹)</label>
                  <input
                    type="number"
                    value={outletFormData.freeDeliveryThreshold}
                    onChange={(e) => setOutletFormData({ ...outletFormData, freeDeliveryThreshold: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-stone-200 rounded-lg focus:outline-none focus:border-amber-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Packaging Fee (₹)</label>
                  <input
                    type="number"
                    value={outletFormData.packagingFee}
                    onChange={(e) => setOutletFormData({ ...outletFormData, packagingFee: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-stone-200 rounded-lg focus:outline-none focus:border-amber-700"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Avg Prep Time</label>
                  <input
                    type="text"
                    value={outletFormData.avgCookingTime}
                    onChange={(e) => setOutletFormData({ ...outletFormData, avgCookingTime: e.target.value })}
                    className="w-full px-3 py-1.5 border border-stone-200 rounded-lg focus:outline-none focus:border-amber-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Operating Hours</label>
                <input
                  type="text"
                  value={outletFormData.operatingHours}
                  onChange={(e) => setOutletFormData({ ...outletFormData, operatingHours: e.target.value })}
                  placeholder="e.g. 11:00 AM - 11:30 PM"
                  className="w-full px-3 py-1.5 border border-stone-200 rounded-lg focus:outline-none focus:border-amber-700"
                />
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditOutletModalOpen(false)}
                  className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-lg font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingOutlet}
                  className="px-4 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-lg font-bold disabled:opacity-60"
                >
                  {isSavingOutlet ? 'Saving...' : 'Save Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD/EDIT DELIVERY ZONE MODAL */}
      {isZoneModalOpen && currentOutlet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-md w-full overflow-hidden">
            <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50">
              <h3 className="font-extrabold text-sm text-stone-900 font-heading">
                {editingZone ? 'Edit Delivery Zone' : 'Add Delivery Zone'}
              </h3>
              <button
                type="button"
                onClick={() => setIsZoneModalOpen(false)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveZone} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Zone Name</label>
                <input
                  type="text"
                  required
                  value={zoneFormName}
                  onChange={(e) => setZoneFormName(e.target.value)}
                  placeholder="e.g. Indiranagar & Domlur Central"
                  className="w-full px-3 py-1.5 border border-stone-200 rounded-lg focus:outline-none focus:border-amber-700"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Add 6-Digit PIN Codes (Comma or Space separated)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={zoneFormPinInput}
                    onChange={(e) => setZoneFormPinInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddPinsFromInput();
                      }
                    }}
                    placeholder="e.g. 560038, 560008"
                    className="flex-1 px-3 py-1.5 border border-stone-200 rounded-lg focus:outline-none focus:border-amber-700"
                  />
                  <button
                    type="button"
                    onClick={handleAddPinsFromInput}
                    className="px-3 py-1.5 bg-stone-800 text-white font-bold rounded-lg hover:bg-stone-900"
                  >
                    Add PINs
                  </button>
                </div>

                {/* PIN chips list */}
                {zoneFormPins.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-stone-50 rounded-lg border border-stone-200">
                    {zoneFormPins.map((pin) => (
                      <span
                        key={pin}
                        className="px-2 py-0.5 bg-white border border-stone-200 rounded text-[11px] font-mono font-bold flex items-center gap-1 text-stone-800"
                      >
                        <span>{pin}</span>
                        <button
                          type="button"
                          onClick={() => handleRemovePin(pin)}
                          className="text-stone-400 hover:text-rose-600 font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Delivery Fee (₹)</label>
                  <input
                    type="number"
                    value={zoneFormFee}
                    onChange={(e) => setZoneFormFee(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-stone-200 rounded-lg focus:outline-none focus:border-amber-700"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Est. Delivery Time</label>
                  <input
                    type="text"
                    value={zoneFormEstTime}
                    onChange={(e) => setZoneFormEstTime(e.target.value)}
                    placeholder="30-40 mins"
                    className="w-full px-3 py-1.5 border border-stone-200 rounded-lg focus:outline-none focus:border-amber-700"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsZoneModalOpen(false)}
                  className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-lg font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingZone}
                  className="px-4 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-lg font-bold disabled:opacity-60"
                >
                  {isSavingZone ? 'Saving...' : 'Save Zone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
