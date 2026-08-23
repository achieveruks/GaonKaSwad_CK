import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { OwnerLayout } from './OwnerLayout';
import { useNavigation } from '../../context/NavigationContext';
import { useAuth } from '../../context/AuthContext';
import { useProducts } from '../../context/ProductContext';
import { Outlet, DeliveryZone, Product, OutletAbout } from '../../types';
import { CATEGORIES } from '../../data/products';
import { getAboutByOutletId, saveAboutByOutletId } from '../../lib/aboutService';
import {
  getOutlets,
  getDeliveryZones,
  createOutletApi,
  updateOutletApi,
  toggleOutletActiveApi,
  deleteOutletApi,
  isProductServedAtOutlet,
  isProductInStockAtOutlet,
  isProductFeaturedAtOutlet,
  isProductBestsellerAtOutlet,
  isProductChefSpecialAtOutlet,
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
  UtensilsCrossed,
  Sparkles,
  Flame,
  ChefHat,
  PackageCheck,
  PackageX,
  SlidersHorizontal,
  Check,
  Palette,
  BookOpen,
  Image as ImageIcon,
  RotateCcw,
  Heart,
} from 'lucide-react';

interface OutletProductItemState {
  productId: string | number;
  isAssigned: boolean;
  inStock: boolean;
  isFeatured: boolean;
  isBestseller: boolean;
  isChefSpecial: boolean;
}

export const OutletsPage: React.FC = () => {
  const { goToOwnerDeliveryZones } = useNavigation();
  const { token } = useAuth();
  const { allProducts, batchUpdateOutletProducts, refreshProducts } = useProducts();

  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCityFilter, setSelectedCityFilter] = useState<string>('all');

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'details' | 'customisation' | 'menu'>('details');
  const [editingOutlet, setEditingOutlet] = useState<Outlet | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State for Outlet
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
    packagingFee: 25,
    avgCookingTime: '25-35 mins',
    operatingHours: '11:00 AM - 11:30 PM',
    heroFireLine: 'ARTISANAL CLOUD KITCHEN • SLOW-COOKED DUM',
    heroHeader: 'Authentic Indian Flavors, Slow-Cooked to Perfection',
    heroDescription:
      'Experience royal dum biryanis, 24-hour slow-simmered dal makhani, and smoky clay-oven tandoori grills, delivered piping hot to your doorstep in sealed eco-handis.',
  });

  // Form State for About Page Customization (1:1 with Outlets, persisted to Supabase)
  const [aboutFormData, setAboutFormData] = useState<OutletAbout>({
    outletId: '',
    heroFireLine: '',
    heroHeader: '',
    heroDescription: '',
    storyLine: '',
    storyTitle: '',
    storyDescription: '',
    storyHighlight1Title: '',
    storyHighlight1Description: '',
    storyHighlight2Title: '',
    storyHighlight2Description: '',
    outletImage: '',
    expLine: '',
    expHeader: '',
    expDescription: '',
    expCard1Title: '',
    expCard1Header: '',
    expCard1Description: '',
    expCard2Title: '',
    expCard2Header: '',
    expCard2Description: '',
    expCard3Title: '',
    expCard3Header: '',
    expCard3Description: '',
  });

  // Per-outlet menu item states in modal
  const [outletItemStates, setOutletItemStates] = useState<Record<string | number, OutletProductItemState>>({});
  const [modalMenuSearch, setModalMenuSearch] = useState('');
  const [modalMenuCategory, setModalMenuCategory] = useState<string>('all');

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

  // Helper to initialize outlet menu item states when modal opens
  const initOutletItemStates = (outlet: Outlet | null) => {
    const states: Record<string | number, OutletProductItemState> = {};
    const outletId = outlet?.id;
    const assignedIds = Array.isArray(outlet?.assignedProductIds) ? outlet.assignedProductIds.map(String) : [];
    const hasAssignedIds = assignedIds.length > 0;

    allProducts.forEach((p) => {
      if (outletId) {
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
        };
      } else {
        // New outlet defaults: all products assigned & in stock
        states[p.id] = {
          productId: p.id,
          isAssigned: true,
          inStock: true,
          isFeatured: !!p.featured,
          isBestseller: !!p.bestseller,
          isChefSpecial: isProductChefSpecialAtOutlet(p, undefined),
        };
      }
    });

    setOutletItemStates(states);
  };

  const handleOpenAddModal = () => {
    setEditingOutlet(null);
    setActiveModalTab('details');
    setModalMenuSearch('');
    setModalMenuCategory('all');
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
      packagingFee: 25,
      avgCookingTime: '25-35 mins',
      operatingHours: '11:00 AM - 11:30 PM',
      heroFireLine: 'ARTISANAL CLOUD KITCHEN • SLOW-COOKED DUM',
      heroHeader: 'Authentic Indian Flavors, Slow-Cooked to Perfection',
      heroDescription:
        'Experience royal dum biryanis, 24-hour slow-simmered dal makhani, and smoky clay-oven tandoori grills, delivered piping hot to your doorstep in sealed eco-handis.',
      trustBadgeRating: '4.9 ★ (2.8k+)',
      trustBadgeRatingSub: 'Google & Zomato',
      trustBadgeUsp: '100% Pure',
      trustBadgeUspSub: 'Desi Ghee Recipe',
    });
    setAboutFormData({
      outletId: '',
      heroFireLine: '',
      heroHeader: '',
      heroDescription: '',
      storyLine: '',
      storyTitle: '',
      storyDescription: '',
      storyHighlight1Title: '',
      storyHighlight1Description: '',
      storyHighlight2Title: '',
      storyHighlight2Description: '',
      outletImage: '',
      expLine: '',
      expHeader: '',
      expDescription: '',
      expCard1Title: '',
      expCard1Header: '',
      expCard1Description: '',
      expCard2Title: '',
      expCard2Header: '',
      expCard2Description: '',
      expCard3Title: '',
      expCard3Header: '',
      expCard3Description: '',
    });
    initOutletItemStates(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (outlet: Outlet, initialTab: 'details' | 'customisation' | 'menu' = 'details') => {
    setEditingOutlet(outlet);
    setActiveModalTab(initialTab);
    setModalMenuSearch('');
    setModalMenuCategory('all');
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
      packagingFee: outlet.packagingFee ?? 25,
      avgCookingTime: outlet.avgCookingTime || outlet.estimatedDeliveryTime || '25-35 mins',
      operatingHours: outlet.operatingHours || '11:00 AM - 11:30 PM',
      heroFireLine: outlet.heroFireLine || 'ARTISANAL CLOUD KITCHEN • SLOW-COOKED DUM',
      heroHeader: outlet.heroHeader || 'Authentic Indian Flavors, Slow-Cooked to Perfection',
      heroDescription:
        outlet.heroDescription ||
        'Experience royal dum biryanis, 24-hour slow-simmered dal makhani, and smoky clay-oven tandoori grills, delivered piping hot to your doorstep in sealed eco-handis.',
      trustBadgeRating: outlet.trustBadgeRating || '4.9 ★ (2.8k+)',
      trustBadgeRatingSub: outlet.trustBadgeRatingSub || 'Google & Zomato',
      trustBadgeUsp: outlet.trustBadgeUsp || '100% Pure',
      trustBadgeUspSub: outlet.trustBadgeUspSub || 'Desi Ghee Recipe',
      assignedProductIds: outlet.assignedProductIds || [],
    });

    // Populate about page form data from Supabase DB
    setAboutFormData({
      outletId: outlet.id,
      heroFireLine: '',
      heroHeader: '',
      heroDescription: '',
      storyLine: '',
      storyTitle: '',
      storyDescription: '',
      storyHighlight1Title: '',
      storyHighlight1Description: '',
      storyHighlight2Title: '',
      storyHighlight2Description: '',
      outletImage: '',
      expLine: '',
      expHeader: '',
      expDescription: '',
      expCard1Title: '',
      expCard1Header: '',
      expCard1Description: '',
      expCard2Title: '',
      expCard2Header: '',
      expCard2Description: '',
      expCard3Title: '',
      expCard3Header: '',
      expCard3Description: '',
    });
    getAboutByOutletId(outlet.id)
      .then((ab) => {
        if (ab) {
          setAboutFormData(ab);
        }
      })
      .catch((err) => {
        console.warn('Error loading about data from database:', err);
      });

    initOutletItemStates(outlet);
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
      const statesList = Object.values(outletItemStates) as OutletProductItemState[];
      const assignedProductIds = statesList.filter((s) => s.isAssigned).map((s) => s.productId);

      const outletPayload = {
        ...formData,
        assignedProductIds,
      };

      let savedOutlet: Outlet;
      if (editingOutlet) {
        savedOutlet = await updateOutletApi(editingOutlet.id, outletPayload, token || '');
        showFeedback('success', `Outlet "${formData.name}" and page customizations updated successfully!`);
      } else {
        savedOutlet = await createOutletApi(outletPayload, token || '');
        showFeedback('success', `New kitchen outlet "${formData.name}" and page customizations created!`);
      }

      // Save About Page customization to Supabase
      try {
        await saveAboutByOutletId(
          savedOutlet.id,
          {
            ...aboutFormData,
            outletId: savedOutlet.id,
          },
          token || ''
        );
      } catch (aboutErr) {
        console.warn('Failed to save about configuration:', aboutErr);
      }

      // Save dish merchandising & stock configurations if updated
      const updates = statesList.map((item) => ({
        productId: item.productId,
        isAssigned: item.isAssigned,
        inStock: item.inStock,
        isFeatured: item.isFeatured,
        isBestseller: item.isBestseller,
        isChefSpecial: item.isChefSpecial,
      }));

      if (updates.length > 0) {
        await batchUpdateOutletProducts(savedOutlet.id, updates);
      }

      setIsModalOpen(false);
      await Promise.all([fetchOutletsAndZones(), refreshProducts()]);
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

  const getCategoryLabel = (catSlugOrId: string) => {
    const found = CATEGORIES.find((c) => c.slug === catSlugOrId || c.id === catSlugOrId);
    return found ? found.name : catSlugOrId.replace(/-/g, ' ');
  };

  // Derive unique categories available across catalog
  const availableCategories = useMemo(() => {
    const categoryMap = new Map<string, { slug: string; name: string }>();

    // 1. Add standard categories
    CATEGORIES.forEach((cat) => {
      categoryMap.set(cat.slug, { slug: cat.slug, name: cat.name });
    });

    // 2. Detect any custom categories from products
    allProducts.forEach((p) => {
      if (p.category && !categoryMap.has(p.category)) {
        const match = CATEGORIES.find((c) => c.id === p.category || c.slug === p.category);
        if (match) {
          categoryMap.set(match.slug, { slug: match.slug, name: match.name });
        } else {
          categoryMap.set(p.category, {
            slug: p.category,
            name: p.category.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
          });
        }
      }
    });

    return Array.from(categoryMap.values());
  }, [allProducts]);

  // Filter products inside modal Menu tab
  const modalFilteredProducts = useMemo(() => {
    return allProducts.filter((p) => {
      let matchesCategory = modalMenuCategory === 'all';
      if (!matchesCategory) {
        const catObj = CATEGORIES.find(
          (c) => c.slug === modalMenuCategory || c.id === modalMenuCategory
        );
        const matchSlugs = catObj ? [catObj.slug, catObj.id] : [modalMenuCategory];
        matchesCategory = matchSlugs.includes(p.category);
      }

      const q = modalMenuSearch.toLowerCase().trim();
      const matchesSearch = !q || p.name.toLowerCase().includes(q) || (p.slug || '').toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [allProducts, modalMenuCategory, modalMenuSearch]);

  const modalAssignedCount = useMemo(() => {
    const list = Object.values(outletItemStates) as OutletProductItemState[];
    return list.filter((s) => s.isAssigned).length;
  }, [outletItemStates]);

  const modalInStockCount = useMemo(() => {
    const list = Object.values(outletItemStates) as OutletProductItemState[];
    return list.filter((s) => s.isAssigned && s.inStock).length;
  }, [outletItemStates]);

  // Bulk actions inside Modal
  const handleBulkAssignAll = (assign: boolean) => {
    setOutletItemStates((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        next[key] = { ...next[key], isAssigned: assign };
      });
      return next;
    });
  };

  const handleBulkStockAll = (inStock: boolean) => {
    setOutletItemStates((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        if (next[key].isAssigned) {
          next[key] = { ...next[key], inStock };
        }
      });
      return next;
    });
  };

  return (
    <OwnerLayout
      activeTab="outlets"
      title="Kitchen Outlets Management"
      subtitle="Manage independent physical kitchen locations across multiple cities with individual operating parameters and menu catalogs"
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
            className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg border border-stone-200 transition-colors shrink-0 cursor-pointer"
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
              className="px-4 py-2 bg-amber-800 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              Add First Kitchen Outlet
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredOutlets.map((outlet) => {
              const outletZones = safeZones.filter((z) => z.outletId === outlet.id);
              const allPins = outletZones.flatMap((z) => z.pinCodes || []);

              // Product metrics for this outlet
              const servedProducts = allProducts.filter((p) => isProductServedAtOutlet(p, outlet.id));
              const inStockProducts = servedProducts.filter((p) => isProductInStockAtOutlet(p, outlet.id));
              const featuredCount = servedProducts.filter((p) => isProductFeaturedAtOutlet(p, outlet.id)).length;
              const bestsellerCount = servedProducts.filter((p) => isProductBestsellerAtOutlet(p, outlet.id)).length;
              const chefSpecialCount = servedProducts.filter((p) => isProductChefSpecialAtOutlet(p, outlet.id)).length;

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
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold transition-colors flex items-center gap-1 shrink-0 cursor-pointer ${
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
                          ₹{outlet.minimumOrderValue ?? 200}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-stone-400 block font-semibold">
                          Free Delivery Above
                        </span>
                        <span className="font-bold text-emerald-700">
                          ₹{outlet.freeDeliveryThreshold ?? 499}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-stone-400 block font-semibold">
                          Packaging Fee
                        </span>
                        <span className="font-bold text-stone-800">
                          ₹{outlet.packagingFee ?? 25}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-stone-400 block font-semibold">
                          Avg Cooking Time
                        </span>
                        <span className="font-medium text-stone-700">
                          {outlet.avgCookingTime || outlet.estimatedDeliveryTime || '25-35 mins'}
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

                    {/* Menu Availability Card Summary */}
                    <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-900 shrink-0">
                          <UtensilsCrossed className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-stone-900">
                              {servedProducts.length} items
                            </span>
                            <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                              {inStockProducts.length} In Stock
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-600">
                            {featuredCount > 0 && `${featuredCount} Featured • `}
                            {bestsellerCount > 0 && `${bestsellerCount} Bestsellers • `}
                            {chefSpecialCount > 0 && `${chefSpecialCount} Chef's Special • `}
                            {servedProducts.length - inStockProducts.length > 0 && (
                              <span className="text-rose-700 font-semibold">
                                {servedProducts.length - inStockProducts.length} out of stock
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(outlet, 'menu')}
                        className="px-2.5 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
                      >
                        <SlidersHorizontal className="w-3 h-3" />
                        <span>Manage Menu</span>
                      </button>
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
                          className="text-[11px] font-bold text-amber-800 hover:text-amber-950 flex items-center gap-0.5 cursor-pointer"
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
                        onClick={() => handleOpenEditModal(outlet, 'details')}
                        className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3 text-stone-600" />
                        <span>Edit Details</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(outlet.id)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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
                          className="px-2.5 py-1 bg-white text-stone-700 border border-stone-300 rounded-lg font-semibold text-[11px] cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteOutlet(outlet.id)}
                          className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[11px] cursor-pointer"
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

        {/* Add / Edit Outlet & Menu Items Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden">
              {/* Modal Header */}
              <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 shrink-0">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-base text-stone-950 font-heading">
                      {editingOutlet ? `Configure Outlet: ${editingOutlet.name}` : 'Add New Kitchen Outlet'}
                    </h2>
                    <p className="text-[11px] text-stone-500">
                      {editingOutlet
                        ? `Manage location settings and individual dish stock & merchandising for ${editingOutlet.city}`
                        : 'Register a new cloud kitchen location and configure its active menu'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center text-sm font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Tab Navigation */}
              <div className="flex items-center gap-2 px-5 pt-3 border-b border-stone-200 bg-stone-50 shrink-0 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveModalTab('details')}
                  className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    activeModalTab === 'details'
                      ? 'border-amber-800 text-amber-900'
                      : 'border-transparent text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>Outlet Settings & Delivery</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModalTab('customisation')}
                  className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    activeModalTab === 'customisation'
                      ? 'border-amber-800 text-amber-900'
                      : 'border-transparent text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>Page Customisation</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModalTab('menu')}
                  className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    activeModalTab === 'menu'
                      ? 'border-amber-800 text-amber-900'
                      : 'border-transparent text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <UtensilsCrossed className="w-3.5 h-3.5" />
                  <span>Menu & Stock Items ({modalAssignedCount} items)</span>
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto flex flex-col justify-between">
                {activeModalTab === 'details' ? (
                  <div className="p-5 space-y-4">
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
                            Packaging Fee (₹) *
                          </label>
                          <input
                            type="number"
                            required
                            min={0}
                            value={formData.packagingFee ?? 0}
                            onChange={(e) =>
                              setFormData({ ...formData, packagingFee: Number(e.target.value) })
                            }
                            placeholder="e.g. 25"
                            className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-700 focus:bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-stone-700 mb-1">
                            Avg cooking time *
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.avgCookingTime || ''}
                            onChange={(e) =>
                              setFormData({ ...formData, avgCookingTime: e.target.value })
                            }
                            placeholder="e.g. 25-35 mins"
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
                  </div>
                ) : activeModalTab === 'customisation' ? (
                  /* Tab 2: Page Customisation (Homepage Hero + About Page Customization) */
                  <div className="p-5 space-y-6">
                    {/* First Section: Homepage Hero Section Customization */}
                    <div className="bg-stone-50/80 border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-700 shrink-0">
                            <Flame className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="font-bold text-xs text-stone-900 uppercase tracking-wider">
                              1. Homepage Hero Section Customization
                            </h3>
                            <p className="text-[11px] text-stone-500">
                              Customise the hero header, flame pill tag, and trust badges shown on the homepage for this outlet.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 pt-1">
                        <div>
                          <label className="block text-xs font-semibold text-stone-700 mb-1">
                            Hero Flame Tagline (Always uppercase)
                          </label>
                          <input
                            type="text"
                            value={formData.heroFireLine || ''}
                            onChange={(e) =>
                              setFormData({ ...formData, heroFireLine: e.target.value.toUpperCase() })
                            }
                            placeholder="e.g. ARTISANAL CLOUD KITCHEN • SLOW-COOKED DUM"
                            className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-700"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-stone-700 mb-1">
                            Hero Main Headline
                          </label>
                          <input
                            type="text"
                            value={formData.heroHeader || ''}
                            onChange={(e) =>
                              setFormData({ ...formData, heroHeader: e.target.value })
                            }
                            placeholder="e.g. Authentic Indian Flavors, Slow-Cooked to Perfection"
                            className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-700"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-stone-700 mb-1">
                            Hero Subtitle / Description
                          </label>
                          <textarea
                            rows={2}
                            value={formData.heroDescription || ''}
                            onChange={(e) =>
                              setFormData({ ...formData, heroDescription: e.target.value })
                            }
                            placeholder="e.g. Experience royal dum biryanis, 24-hour slow-simmered dal makhani, and smoky clay-oven tandoori grills..."
                            className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-700 resize-none"
                          />
                        </div>

                        {/* Trust Badges Configuration */}
                        <div className="pt-3 border-t border-stone-200/80 space-y-2">
                          <p className="text-[11px] font-bold text-stone-800 uppercase tracking-wide">
                            Trust Badges Bar Customization
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                                Badge 1: Rating Headline
                              </label>
                              <input
                                type="text"
                                value={formData.trustBadgeRating || ''}
                                onChange={(e) =>
                                  setFormData({ ...formData, trustBadgeRating: e.target.value })
                                }
                                placeholder="e.g. 4.9 ★ (2.8k+)"
                                className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-700"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                                Badge 1: Rating Source / Subtext
                              </label>
                              <input
                                type="text"
                                value={formData.trustBadgeRatingSub || ''}
                                onChange={(e) =>
                                  setFormData({ ...formData, trustBadgeRatingSub: e.target.value })
                                }
                                placeholder="e.g. Google & Zomato"
                                className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-700"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                                Badge 3: Quality USP Title
                              </label>
                              <input
                                type="text"
                                value={formData.trustBadgeUsp || ''}
                                onChange={(e) =>
                                  setFormData({ ...formData, trustBadgeUsp: e.target.value })
                                }
                                placeholder="e.g. 100% Pure"
                                className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-700"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                                Badge 3: Quality USP Subtext
                              </label>
                              <input
                                type="text"
                                value={formData.trustBadgeUspSub || ''}
                                onChange={(e) =>
                                  setFormData({ ...formData, trustBadgeUspSub: e.target.value })
                                }
                                placeholder="e.g. Desi Ghee Recipe"
                                className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-700"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Second Section: About Page Customization (Saved to Supabase DB 'abouts' table) */}
                    <div className="bg-stone-50/80 border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-800 shrink-0">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="font-bold text-xs text-stone-900 uppercase tracking-wider">
                              2. About Page Customization
                            </h3>
                            <p className="text-[11px] text-stone-500">
                              Customise the hero, story, and experience sections of the /#/about page when this outlet is selected. Saved to Supabase DB.
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setAboutFormData({
                              outletId: editingOutlet?.id || '',
                              heroFireLine: `THE HERITAGE BEHIND GAON KA SWAD • ${(editingOutlet?.name || 'OUTLET').toUpperCase()}`,
                              heroHeader: `Crafting Authentic Culinary Memories in ${editingOutlet?.city || 'Bangalore'}`,
                              heroDescription: `Born out of a deep reverence for forgotten village recipes and slow-cooking traditions, our ${editingOutlet?.name || 'kitchen'} brings soulful tastes straight to modern dining tables.`,
                              storyLine: 'WHO WE ARE',
                              storyTitle: 'A Modern Cloud Kitchen with Heirloom Roots',
                              storyDescription: 'Gaon Ka Swad was founded with a singular conviction: genuine taste cannot be rushed. We slow-simmer handis, use 24-hour charcoal embers, whole stone-ground spices, and 100% pure cow desi ghee.',
                              storyHighlight1Title: '100% Pure Desi Ghee',
                              storyHighlight1Description: 'Pure Desi Ghee & Raw Spices',
                              storyHighlight2Title: '24 Hrs Slow-Simmered',
                              storyHighlight2Description: 'Slow-Simmered Dal Bukhara',
                              outletImage: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=1000&auto=format&fit=crop',
                              expLine: 'THE GAON KA SWAD EXPERIENCE',
                              expHeader: 'Food That Feels Like Home',
                              expDescription: 'From the way we cook to the way we serve, every detail is designed to make your meal feel a little more special.',
                              expCard1Title: '🏠 Familiar Flavours',
                              expCard1Header: 'Taste That Feels Like Home',
                              expCard1Description: 'Comforting Indian flavours inspired by the food we know, love, and grew up sharing.',
                              expCard2Title: '🍽️ Made With Care',
                              expCard2Header: 'Every Order Matters',
                              expCard2Description: 'We prepare each order with attention to freshness, consistency, and the little details that make a meal memorable.',
                              expCard3Title: '❤️ Your Experience',
                              expCard3Header: 'We Listen & Improve',
                              expCard3Description: 'Your feedback helps us get better. Every rating, review, and suggestion helps shape the Gaon Ka Swad experience.',
                            });
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-stone-600 hover:text-amber-900 bg-white border border-stone-200 rounded-lg hover:bg-stone-100 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                          title="Reset to template defaults"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reset Defaults</span>
                        </button>
                      </div>

                      {/* Section 1: Hero Section Inputs */}
                      <div className="bg-white border border-stone-200 rounded-xl p-3.5 space-y-3">
                        <p className="text-[11px] font-bold text-stone-800 uppercase tracking-wide flex items-center gap-1.5">
                          <Flame className="w-3.5 h-3.5 text-orange-600" />
                          <span>About Page Hero Section</span>
                        </p>

                        <div>
                          <label className="block text-xs font-semibold text-stone-700 mb-1">
                            Hero Fire Line (Tagline Pill)
                          </label>
                          <input
                            type="text"
                            value={aboutFormData.heroFireLine || ''}
                            onChange={(e) =>
                              setAboutFormData({ ...aboutFormData, heroFireLine: e.target.value.toUpperCase() })
                            }
                            placeholder="e.g. THE HERITAGE BEHIND GAON KA SWAD"
                            className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-700 focus:bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-stone-700 mb-1">
                            Hero Header (Main Title)
                          </label>
                          <input
                            type="text"
                            value={aboutFormData.heroHeader || ''}
                            onChange={(e) =>
                              setAboutFormData({ ...aboutFormData, heroHeader: e.target.value })
                            }
                            placeholder="e.g. Crafting Authentic Culinary Memories, One Handi at a Time"
                            className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-700 focus:bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-stone-700 mb-1">
                            Hero Description
                          </label>
                          <textarea
                            rows={2}
                            value={aboutFormData.heroDescription || ''}
                            onChange={(e) =>
                              setAboutFormData({ ...aboutFormData, heroDescription: e.target.value })
                            }
                            placeholder="e.g. Born out of a deep reverence for forgotten village recipes and slow-cooking traditions..."
                            className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-700 focus:bg-white resize-none"
                          />
                        </div>
                      </div>

                      {/* Section 2: Story & Heritage Inputs */}
                      <div className="bg-white border border-stone-200 rounded-xl p-3.5 space-y-3">
                        <p className="text-[11px] font-bold text-stone-800 uppercase tracking-wide flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                          <span>About Page Story & Highlights Section</span>
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-stone-700 mb-1">
                              Story Line (Small Tag)
                            </label>
                            <input
                              type="text"
                              value={aboutFormData.storyLine || ''}
                              onChange={(e) =>
                                setAboutFormData({ ...aboutFormData, storyLine: e.target.value.toUpperCase() })
                              }
                              placeholder="e.g. WHO WE ARE"
                              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-700 focus:bg-white"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-stone-700 mb-1">
                              Story Title
                            </label>
                            <input
                              type="text"
                              value={aboutFormData.storyTitle || ''}
                              onChange={(e) =>
                                setAboutFormData({ ...aboutFormData, storyTitle: e.target.value })
                              }
                              placeholder="e.g. A Modern Cloud Kitchen with Heirloom Roots"
                              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-700 focus:bg-white"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-stone-700 mb-1">
                            Story Description (Separate paragraphs with empty line)
                          </label>
                          <textarea
                            rows={3}
                            value={aboutFormData.storyDescription || ''}
                            onChange={(e) =>
                              setAboutFormData({ ...aboutFormData, storyDescription: e.target.value })
                            }
                            placeholder="Detailed story of the kitchen, chef traditions, and preparation methods..."
                            className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-700 focus:bg-white resize-none"
                          />
                        </div>

                        {/* Story Highlights (Cards) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wide">
                              Story Highlight 1
                            </span>
                            <div>
                              <label className="block text-[11px] font-semibold text-stone-700 mb-0.5">
                                Title (e.g. 100%)
                              </label>
                              <input
                                type="text"
                                value={aboutFormData.storyHighlight1Title || ''}
                                onChange={(e) =>
                                  setAboutFormData({
                                    ...aboutFormData,
                                    storyHighlight1Title: e.target.value,
                                  })
                                }
                                placeholder="e.g. 100%"
                                className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-900 focus:outline-none focus:border-amber-700"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-stone-700 mb-0.5">
                                Description
                              </label>
                              <input
                                type="text"
                                value={aboutFormData.storyHighlight1Description || ''}
                                onChange={(e) =>
                                  setAboutFormData({
                                    ...aboutFormData,
                                    storyHighlight1Description: e.target.value,
                                  })
                                }
                                placeholder="e.g. Pure Desi Ghee & Raw Spices"
                                className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-900 focus:outline-none focus:border-amber-700"
                              />
                            </div>
                          </div>

                          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wide">
                              Story Highlight 2
                            </span>
                            <div>
                              <label className="block text-[11px] font-semibold text-stone-700 mb-0.5">
                                Title (e.g. 24 Hrs)
                              </label>
                              <input
                                type="text"
                                value={aboutFormData.storyHighlight2Title || ''}
                                onChange={(e) =>
                                  setAboutFormData({
                                    ...aboutFormData,
                                    storyHighlight2Title: e.target.value,
                                  })
                                }
                                placeholder="e.g. 24 Hrs"
                                className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-900 focus:outline-none focus:border-amber-700"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-stone-700 mb-0.5">
                                Description
                              </label>
                              <input
                                type="text"
                                value={aboutFormData.storyHighlight2Description || ''}
                                onChange={(e) =>
                                  setAboutFormData({
                                    ...aboutFormData,
                                    storyHighlight2Description: e.target.value,
                                  })
                                }
                                placeholder="e.g. Slow-Simmered Dal Bukhara"
                                className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-900 focus:outline-none focus:border-amber-700"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Outlet Image URL with Thumbnail Preview */}
                        <div className="pt-2">
                          <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
                            <ImageIcon className="w-3.5 h-3.5 text-stone-500" />
                            <span>Kitchen / Outlet Image URL</span>
                          </label>
                          <input
                            type="url"
                            value={aboutFormData.outletImage || ''}
                            onChange={(e) =>
                              setAboutFormData({ ...aboutFormData, outletImage: e.target.value })
                            }
                            placeholder="https://images.unsplash.com/photo-..."
                            className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-700 focus:bg-white"
                          />

                          {/* Image preview & presets */}
                          <div className="flex items-center gap-3 mt-2">
                            <div className="w-16 h-12 rounded-lg bg-stone-200 border border-stone-300 overflow-hidden shrink-0">
                              <img
                                src={aboutFormData.outletImage || 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=1000&auto=format&fit=crop'}
                                alt="Preview"
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    'https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=1000&auto=format&fit=crop';
                                }}
                              />
                            </div>
                            <div className="flex-1 flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setAboutFormData({
                                    ...aboutFormData,
                                    outletImage:
                                      'https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=1000&auto=format&fit=crop',
                                  })
                                }
                                className="px-2 py-0.5 text-[10px] bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md font-medium cursor-pointer"
                              >
                                Heritage Spices
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setAboutFormData({
                                    ...aboutFormData,
                                    outletImage:
                                      'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?q=80&w=1000&auto=format&fit=crop',
                                  })
                                }
                                className="px-2 py-0.5 text-[10px] bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md font-medium cursor-pointer"
                              >
                                Dum Handi
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setAboutFormData({
                                    ...aboutFormData,
                                    outletImage:
                                      'https://images.unsplash.com/photo-1601050690597-df0568f70950?q=80&w=1000&auto=format&fit=crop',
                                  })
                                }
                                className="px-2 py-0.5 text-[10px] bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md font-medium cursor-pointer"
                              >
                                Clay Oven & Breads
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Section 3: Experience & Values Section Inputs (Populates Section 4 on About Page) */}
                      <div className="bg-white border border-stone-200 rounded-xl p-3.5 space-y-3.5">
                        <p className="text-[11px] font-bold text-stone-800 uppercase tracking-wide flex items-center gap-1.5">
                          <Heart className="w-3.5 h-3.5 text-rose-600" />
                          <span>About Page Experience & Values Section (Section 4)</span>
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-stone-700 mb-1">
                              Experience Eyebrow Line
                            </label>
                            <input
                              type="text"
                              value={aboutFormData.expLine || ''}
                              onChange={(e) =>
                                setAboutFormData({ ...aboutFormData, expLine: e.target.value.toUpperCase() })
                              }
                              placeholder="e.g. THE GAON KA SWAD EXPERIENCE"
                              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-700 focus:bg-white"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-stone-700 mb-1">
                              Experience Section Title
                            </label>
                            <input
                              type="text"
                              value={aboutFormData.expHeader || ''}
                              onChange={(e) =>
                                setAboutFormData({ ...aboutFormData, expHeader: e.target.value })
                              }
                              placeholder="e.g. Food That Feels Like Home"
                              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-700 focus:bg-white"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-stone-700 mb-1">
                            Experience Description
                          </label>
                          <textarea
                            rows={2}
                            value={aboutFormData.expDescription || ''}
                            onChange={(e) =>
                              setAboutFormData({ ...aboutFormData, expDescription: e.target.value })
                            }
                            placeholder="e.g. From the way we cook to the way we serve, every detail is designed to make your meal feel a little more special."
                            className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-700 focus:bg-white resize-none"
                          />
                        </div>

                        {/* Experience Cards (3 Cards) */}
                        <div className="space-y-3 pt-1">
                          <p className="text-[11px] font-semibold text-stone-700">Experience Cards (3 Values)</p>
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                            {/* Card 1 */}
                            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                              <span className="text-[10px] font-bold text-orange-800 uppercase tracking-wide">
                                Experience Card 1
                              </span>
                              <div>
                                <label className="block text-[11px] font-semibold text-stone-700 mb-0.5">
                                  Title (e.g. 🏠 Familiar Flavours)
                                </label>
                                <input
                                  type="text"
                                  value={aboutFormData.expCard1Title || ''}
                                  onChange={(e) =>
                                    setAboutFormData({
                                      ...aboutFormData,
                                      expCard1Title: e.target.value,
                                    })
                                  }
                                  placeholder="e.g. 🏠 Familiar Flavours"
                                  className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-900 focus:outline-none focus:border-amber-700"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-stone-700 mb-0.5">
                                  Header / Subtitle
                                </label>
                                <input
                                  type="text"
                                  value={aboutFormData.expCard1Header || ''}
                                  onChange={(e) =>
                                    setAboutFormData({
                                      ...aboutFormData,
                                      expCard1Header: e.target.value,
                                    })
                                  }
                                  placeholder="e.g. Taste That Feels Like Home"
                                  className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-900 focus:outline-none focus:border-amber-700"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-stone-700 mb-0.5">
                                  Description
                                </label>
                                <textarea
                                  rows={2}
                                  value={aboutFormData.expCard1Description || ''}
                                  onChange={(e) =>
                                    setAboutFormData({
                                      ...aboutFormData,
                                      expCard1Description: e.target.value,
                                    })
                                  }
                                  placeholder="Comforting Indian flavours inspired by..."
                                  className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-900 focus:outline-none focus:border-amber-700 resize-none"
                                />
                              </div>
                            </div>

                            {/* Card 2 */}
                            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                              <span className="text-[10px] font-bold text-orange-800 uppercase tracking-wide">
                                Experience Card 2
                              </span>
                              <div>
                                <label className="block text-[11px] font-semibold text-stone-700 mb-0.5">
                                  Title (e.g. 🍽️ Made With Care)
                                </label>
                                <input
                                  type="text"
                                  value={aboutFormData.expCard2Title || ''}
                                  onChange={(e) =>
                                    setAboutFormData({
                                      ...aboutFormData,
                                      expCard2Title: e.target.value,
                                    })
                                  }
                                  placeholder="e.g. 🍽️ Made With Care"
                                  className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-900 focus:outline-none focus:border-amber-700"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-stone-700 mb-0.5">
                                  Header / Subtitle
                                </label>
                                <input
                                  type="text"
                                  value={aboutFormData.expCard2Header || ''}
                                  onChange={(e) =>
                                    setAboutFormData({
                                      ...aboutFormData,
                                      expCard2Header: e.target.value,
                                    })
                                  }
                                  placeholder="e.g. Every Order Matters"
                                  className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-900 focus:outline-none focus:border-amber-700"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-stone-700 mb-0.5">
                                  Description
                                </label>
                                <textarea
                                  rows={2}
                                  value={aboutFormData.expCard2Description || ''}
                                  onChange={(e) =>
                                    setAboutFormData({
                                      ...aboutFormData,
                                      expCard2Description: e.target.value,
                                    })
                                  }
                                  placeholder="We prepare each order with attention to freshness..."
                                  className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-900 focus:outline-none focus:border-amber-700 resize-none"
                                />
                              </div>
                            </div>

                            {/* Card 3 */}
                            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                              <span className="text-[10px] font-bold text-orange-800 uppercase tracking-wide">
                                Experience Card 3
                              </span>
                              <div>
                                <label className="block text-[11px] font-semibold text-stone-700 mb-0.5">
                                  Title (e.g. ❤️ Your Experience)
                                </label>
                                <input
                                  type="text"
                                  value={aboutFormData.expCard3Title || ''}
                                  onChange={(e) =>
                                    setAboutFormData({
                                      ...aboutFormData,
                                      expCard3Title: e.target.value,
                                    })
                                  }
                                  placeholder="e.g. ❤️ Your Experience"
                                  className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-900 focus:outline-none focus:border-amber-700"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-stone-700 mb-0.5">
                                  Header / Subtitle
                                </label>
                                <input
                                  type="text"
                                  value={aboutFormData.expCard3Header || ''}
                                  onChange={(e) =>
                                    setAboutFormData({
                                      ...aboutFormData,
                                      expCard3Header: e.target.value,
                                    })
                                  }
                                  placeholder="e.g. We Listen & Improve"
                                  className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-900 focus:outline-none focus:border-amber-700"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-stone-700 mb-0.5">
                                  Description
                                </label>
                                <textarea
                                  rows={2}
                                  value={aboutFormData.expCard3Description || ''}
                                  onChange={(e) =>
                                    setAboutFormData({
                                      ...aboutFormData,
                                      expCard3Description: e.target.value,
                                    })
                                  }
                                  placeholder="Your feedback helps us get better..."
                                  className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-900 focus:outline-none focus:border-amber-700 resize-none"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Tab 3: Menu & Stock Configuration */
                  <div className="p-5 space-y-4">
                    {/* Header & Quick Action Toolbar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50 p-3.5 rounded-xl border border-stone-200">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-stone-900">
                            {modalAssignedCount} of {allProducts.length} Dishes Assigned
                          </span>
                          <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                            {modalInStockCount} In Stock
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500">
                          Configure whether dishes are prepared at this outlet, their live inventory, and featured badges.
                        </p>
                      </div>

                      {/* Bulk buttons */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleBulkAssignAll(true)}
                          className="px-2.5 py-1 bg-white hover:bg-stone-100 border border-stone-300 text-stone-700 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          Serve All
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBulkAssignAll(false)}
                          className="px-2.5 py-1 bg-white hover:bg-stone-100 border border-stone-300 text-stone-700 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          Clear All
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBulkStockAll(true)}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          All In-Stock
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBulkStockAll(false)}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-800 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          All Out-of-Stock
                        </button>
                      </div>
                    </div>

                    {modalAssignedCount === 0 && (
                      <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-950">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                          <span>
                            No dishes currently assigned to <strong>{editingOutlet?.name || 'this kitchen'}</strong>. Click <strong>Serve All</strong> to make all menu items available, or tick individual dishes below.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleBulkAssignAll(true)}
                          className="px-3 py-1 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-xs font-bold shrink-0 cursor-pointer self-start sm:self-auto"
                        >
                          Serve All ({allProducts.length} items)
                        </button>
                      </div>
                    )}

                    {/* Search & Category Filter */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={modalMenuSearch}
                          onChange={(e) => setModalMenuSearch(e.target.value)}
                          placeholder="Search dish name..."
                          className="w-full pl-8 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-700 focus:bg-white"
                        />
                      </div>

                      <select
                        value={modalMenuCategory}
                        onChange={(e) => setModalMenuCategory(e.target.value)}
                        className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none focus:border-amber-700 font-semibold"
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

                    {/* Dishes List */}
                    <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl max-h-[46vh] overflow-y-auto">
                      {modalFilteredProducts.map((product) => {
                        const itemState = outletItemStates[product.id] || {
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
                            className={`p-3 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              itemState.isAssigned
                                ? 'bg-white hover:bg-stone-50/80'
                                : 'bg-stone-50/50 opacity-60'
                            }`}
                          >
                            {/* Left: Checkbox, Image & Name */}
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={itemState.isAssigned}
                                onChange={(e) => {
                                  setOutletItemStates((prev) => ({
                                    ...prev,
                                    [product.id]: {
                                      ...itemState,
                                      isAssigned: e.target.checked,
                                    },
                                  }));
                                }}
                                className="w-4 h-4 accent-amber-800 rounded cursor-pointer shrink-0"
                                title="Serve at this outlet"
                              />

                              <img
                                src={product.image}
                                alt={product.name}
                                referrerPolicy="no-referrer"
                                className="w-10 h-10 rounded-lg object-cover border border-stone-200 shrink-0"
                              />

                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-xs text-stone-900">
                                    {product.name}
                                  </span>
                                  <span className="text-[10px] text-stone-500 font-mono">
                                    ₹{product.price}
                                  </span>
                                </div>
                                <p className="text-[10px] text-amber-900/70 font-medium">
                                  {getCategoryLabel(product.category)}
                                </p>
                              </div>
                            </div>

                            {/* Right: Stock Status & Merchandising Badges */}
                            {itemState.isAssigned ? (
                              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end pl-7 sm:pl-0">
                                {/* Stock Toggle Pill */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOutletItemStates((prev) => ({
                                      ...prev,
                                      [product.id]: {
                                        ...itemState,
                                        inStock: !itemState.inStock,
                                      },
                                    }));
                                  }}
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold transition-colors flex items-center gap-1 cursor-pointer border ${
                                    itemState.inStock
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                      : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
                                  }`}
                                >
                                  {itemState.inStock ? (
                                    <>
                                      <PackageCheck className="w-3 h-3 text-emerald-600" />
                                      <span>In Stock</span>
                                    </>
                                  ) : (
                                    <>
                                      <PackageX className="w-3 h-3 text-rose-600" />
                                      <span>Out of Stock</span>
                                    </>
                                  )}
                                </button>

                                {/* Featured Toggle */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOutletItemStates((prev) => ({
                                      ...prev,
                                      [product.id]: {
                                        ...itemState,
                                        isFeatured: !itemState.isFeatured,
                                      },
                                    }));
                                  }}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer border ${
                                    itemState.isFeatured
                                      ? 'bg-purple-100 text-purple-950 border-purple-300'
                                      : 'bg-stone-100 text-stone-500 border-stone-200 hover:bg-stone-200'
                                  }`}
                                  title="Toggle Featured on Homepage for this outlet"
                                >
                                  <Sparkles className={`w-3 h-3 ${itemState.isFeatured ? 'text-purple-700' : 'text-stone-400'}`} />
                                  <span>Featured</span>
                                </button>

                                {/* Bestseller Toggle */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOutletItemStates((prev) => ({
                                      ...prev,
                                      [product.id]: {
                                        ...itemState,
                                        isBestseller: !itemState.isBestseller,
                                      },
                                    }));
                                  }}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer border ${
                                    itemState.isBestseller
                                      ? 'bg-orange-100 text-orange-950 border-orange-300'
                                      : 'bg-stone-100 text-stone-500 border-stone-200 hover:bg-stone-200'
                                  }`}
                                  title="Toggle Bestseller Badge for this outlet"
                                >
                                  <Flame className={`w-3 h-3 ${itemState.isBestseller ? 'text-orange-600' : 'text-stone-400'}`} />
                                  <span>Bestseller</span>
                                </button>

                                {/* Chef's Special Toggle */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOutletItemStates((prev) => ({
                                      ...prev,
                                      [product.id]: {
                                        ...itemState,
                                        isChefSpecial: !itemState.isChefSpecial,
                                      },
                                    }));
                                  }}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer border ${
                                    itemState.isChefSpecial
                                      ? 'bg-amber-100 text-amber-950 border-amber-300'
                                      : 'bg-stone-100 text-stone-500 border-stone-200 hover:bg-stone-200'
                                  }`}
                                  title="Toggle Chef's Special Signature for this outlet"
                                >
                                  <ChefHat className={`w-3 h-3 ${itemState.isChefSpecial ? 'text-amber-700' : 'text-stone-400'}`} />
                                  <span>Chef's Special</span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-stone-400 italic pl-7 sm:pl-0">
                                Not served at this outlet
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Modal Footer Actions */}
                <div className="p-4 border-t border-stone-200 bg-white flex items-center justify-between gap-2.5 shrink-0">
                  <div className="text-xs text-stone-500">
                    {activeModalTab === 'menu' && (
                      <span>
                        Configuring <strong>{modalAssignedCount}</strong> active dishes for this kitchen
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-5 py-2 bg-amber-800 hover:bg-amber-900 active:bg-stone-950 text-white rounded-xl font-bold text-xs shadow-2xs transition-colors flex items-center gap-1.5 disabled:bg-stone-400 cursor-pointer"
                    >
                      {isSaving ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Saving Changes...</span>
                        </>
                      ) : (
                        <span>{editingOutlet ? 'Save Outlet & Menu' : 'Create Outlet & Assign Menu'}</span>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </OwnerLayout>
  );
};
