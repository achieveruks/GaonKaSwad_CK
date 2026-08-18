import React, { useState, useMemo, useEffect } from 'react';
import { OwnerLayout } from './OwnerLayout';
import { useProducts } from '../../context/ProductContext';
import { useNavigation } from '../../context/NavigationContext';
import { useAuth } from '../../context/AuthContext';
import { CATEGORIES } from '../../data/products';
import { Product, Outlet, ProductOutletConfig } from '../../types';
import { getOutlets } from '../../lib/locationService';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  PackageCheck,
  PackageX,
  Eye,
  EyeOff,
  Sparkles,
  Flame,
  AlertCircle,
  CheckCircle2,
  X,
  RefreshCw,
  Store,
  MapPin,
  Settings2,
  Check,
} from 'lucide-react';

export const OwnerProductsPage: React.FC = () => {
  const {
    allProducts,
    editProduct,
    removeProduct,
    toggleActive,
    refreshProducts,
    updateOutletProduct,
    batchUpdateOutletProducts,
    isLoading,
  } = useProducts();
  const { goToOwnerAddProduct, goToOwnerEditProduct } = useNavigation();
  const { token } = useAuth();

  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loadingOutlets, setLoadingOutlets] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedOutlet, setSelectedOutlet] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Deletion modal state
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);

  // Quick Outlet Stock Edit Modal
  const [productForOutletConfig, setProductForOutletConfig] = useState<Product | null>(null);
  const [quickConfigState, setQuickConfigState] = useState<
    Record<string, { isAssigned: boolean; inStock: boolean; isFeatured: boolean; isBestseller: boolean }>
  >({});
  const [isSavingQuickConfig, setIsSavingQuickConfig] = useState(false);

  // Toggle button loading
  const [actionLoadingId, setActionLoadingId] = useState<string | number | null>(null);

  useEffect(() => {
    const fetchAllOutlets = async () => {
      setLoadingOutlets(true);
      try {
        const list = await getOutlets(true, token || undefined);
        setOutlets(list);
      } catch (err) {
        console.error('Error loading outlets:', err);
      } finally {
        setLoadingOutlets(false);
      }
    };
    fetchAllOutlets();
  }, [token]);

  const getCategoryLabel = (cat: string) => {
    const found = CATEGORIES.find((c) => c.slug === cat || c.id === cat);
    return found ? found.name : cat.replace(/-/g, ' ');
  };

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return allProducts.filter((product) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (product?.name || '').toLowerCase().includes(q);
        const matchesSlug = (product?.slug || '').toLowerCase().includes(q);
        const matchesCategory = (product?.category || '').toLowerCase().includes(q);
        if (!matchesName && !matchesSlug && !matchesCategory) return false;
      }

      // Category matching
      if (selectedCategory !== 'all') {
        const catObj = CATEGORIES.find(
          (c) => c.slug === selectedCategory || c.id === selectedCategory
        );
        const matchSlugs = catObj ? [catObj.slug, catObj.id] : [selectedCategory];
        if (!matchSlugs.includes(product.category)) {
          return false;
        }
      }

      // Outlet matching
      if (selectedOutlet !== 'all') {
        const productOutlets = Array.isArray(product.outlets)
          ? product.outlets.map((o) => o.outletId)
          : Array.isArray(product.outletIds)
          ? product.outletIds
          : [];
        if (!productOutlets.includes(selectedOutlet)) {
          return false;
        }
      }

      // Active status
      if (selectedStatus === 'active' && product.active === false) return false;
      if (selectedStatus === 'inactive' && product.active !== false) return false;

      return true;
    });
  }, [allProducts, searchQuery, selectedCategory, selectedOutlet, selectedStatus]);

  const handleToggleActive = async (id: string | number) => {
    setActionLoadingId(id);
    try {
      await toggleActive(id);
      showNotification('Product visibility status updated');
    } catch (err: any) {
      setActionErrorMessage(err.message || 'Failed to update visibility status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      await removeProduct(productToDelete.id);
      showNotification(`"${productToDelete.name}" was successfully deleted from the menu.`);
      setProductToDelete(null);
    } catch (err: any) {
      setActionErrorMessage(err.message || 'Failed to delete product');
    } finally {
      setIsDeleting(false);
    }
  };

  const showNotification = (msg: string) => {
    setActionSuccessMessage(msg);
    setTimeout(() => {
      setActionSuccessMessage(null);
    }, 4000);
  };

  // Open Quick Outlet Config Modal
  const openQuickOutletConfig = (product: Product) => {
    setProductForOutletConfig(product);
    const configs: Record<string, { isAssigned: boolean; inStock: boolean; isFeatured: boolean; isBestseller: boolean }> = {};
    outlets.forEach((o) => {
      if (Array.isArray(product.outlets)) {
        const oc = product.outlets.find((item) => item.outletId === o.id);
        configs[o.id] = {
          isAssigned: !!oc,
          inStock: oc ? oc.inStock !== false : true,
          isFeatured: oc ? !!oc.isFeatured : false,
          isBestseller: oc ? !!oc.isBestseller : false,
        };
      } else if (Array.isArray(product.outletIds)) {
        const isAssigned = product.outletIds.includes(o.id);
        configs[o.id] = {
          isAssigned,
          inStock: product.inStock !== false,
          isFeatured: !!product.featured,
          isBestseller: !!product.bestseller,
        };
      } else {
        configs[o.id] = {
          isAssigned: true,
          inStock: product.inStock !== false,
          isFeatured: !!product.featured,
          isBestseller: !!product.bestseller,
        };
      }
    });
    setQuickConfigState(configs);
  };

  const saveQuickOutletConfig = async () => {
    if (!productForOutletConfig) return;
    setIsSavingQuickConfig(true);
    try {
      const assignedOutlets: ProductOutletConfig[] = outlets
        .filter((o) => quickConfigState[o.id]?.isAssigned)
        .map((o) => ({
          outletId: o.id,
          inStock: quickConfigState[o.id]?.inStock !== false,
          isFeatured: !!quickConfigState[o.id]?.isFeatured,
          isBestseller: !!quickConfigState[o.id]?.isBestseller,
        }));

      await editProduct(productForOutletConfig.id, {
        outlets: assignedOutlets,
        outletIds: assignedOutlets.map((o) => o.outletId),
      });

      showNotification(`Updated outlet configurations for "${productForOutletConfig.name}"`);
      setProductForOutletConfig(null);
      await refreshProducts();
    } catch (err: any) {
      console.error(err);
      setActionErrorMessage(err.message || 'Failed to update outlet configurations');
    } finally {
      setIsSavingQuickConfig(false);
    }
  };

  // Helper to compute outlet metrics for a product
  const getProductOutletMetrics = (product: Product) => {
    let assignedList: ProductOutletConfig[] = [];
    if (Array.isArray(product.outlets)) {
      assignedList = product.outlets;
    } else if (Array.isArray(product.outletIds)) {
      assignedList = product.outletIds.map((id) => ({
        outletId: id,
        inStock: product.inStock !== false,
        isFeatured: !!product.featured,
        isBestseller: !!product.bestseller,
      }));
    } else {
      assignedList = outlets.map((o) => ({
        outletId: o.id,
        inStock: product.inStock !== false,
        isFeatured: !!product.featured,
        isBestseller: !!product.bestseller,
      }));
    }

    const totalAssigned = assignedList.length;
    const inStockCount = assignedList.filter((o) => o.inStock !== false).length;
    const outOfStockCount = totalAssigned - inStockCount;
    const featuredCount = assignedList.filter((o) => o.isFeatured).length;
    const bestsellerCount = assignedList.filter((o) => o.isBestseller).length;

    return {
      totalAssigned,
      inStockCount,
      outOfStockCount,
      featuredCount,
      bestsellerCount,
      assignedList,
    };
  };

  return (
    <OwnerLayout
      activeTab="products"
      title="Product Catalog & Inventory"
      subtitle={`Manage all ${allProducts.length} dishes across your cloud kitchen network.`}
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refreshProducts()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl border border-gray-200 shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-gray-500 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
          <button
            type="button"
            onClick={goToOwnerAddProduct}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Product</span>
          </button>
        </div>
      }
    >
      {/* Toast / Status banner */}
      {actionSuccessMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-2 text-xs text-emerald-800 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-900"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {actionErrorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-2 text-xs text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionErrorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionErrorMessage(null)}
            className="text-rose-600 hover:text-rose-900"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="sm:col-span-5 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by dish name, slug, or keyword..."
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs placeholder:text-gray-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-colors"
            />
          </div>

          {/* Category Filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 font-medium focus:outline-none focus:border-orange-500 focus:bg-white"
            >
              <option value="all">All Categories ({CATEGORIES.length})</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.slug || cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Outlet Filter */}
          <div className="sm:col-span-2">
            <select
              value={selectedOutlet}
              onChange={(e) => setSelectedOutlet(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 font-medium focus:outline-none focus:border-orange-500 focus:bg-white"
            >
              <option value="all">All Outlets ({outlets.length})</option>
              {outlets.map((outlet) => (
                <option key={outlet.id} value={outlet.id}>
                  {outlet.name} ({outlet.city})
                </option>
              ))}
            </select>
          </div>

          {/* Visibility Status Filter */}
          <div className="sm:col-span-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 font-medium focus:outline-none focus:border-orange-500 focus:bg-white"
            >
              <option value="all">All Visibility</option>
              <option value="active">Active (Visible)</option>
              <option value="inactive">Inactive (Hidden)</option>
            </select>
          </div>
        </div>

        {/* Active Filters Summary */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
          <span>
            Showing <strong className="text-gray-900">{filteredProducts.length}</strong> of{' '}
            {allProducts.length} dishes
          </span>
          {(searchQuery || selectedCategory !== 'all' || selectedOutlet !== 'all' || selectedStatus !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedOutlet('all');
                setSelectedStatus('all');
              }}
              className="text-orange-600 hover:text-orange-700 font-semibold cursor-pointer"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* 2. Products List Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="py-16 text-center space-y-3 px-4">
            <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm text-gray-900">No matching products found</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Try adjusting your search query or filters to find what you are looking for.
            </p>
            <button
              type="button"
              onClick={goToOwnerAddProduct}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Dish</span>
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                    <th className="py-3.5 px-4">Dish</th>
                    <th className="py-3.5 px-3">Category</th>
                    <th className="py-3.5 px-3">Price</th>
                    <th className="py-3.5 px-3">Served In (Kitchen Outlets)</th>
                    <th className="py-3.5 px-3">Store Visibility</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {filteredProducts.map((product) => {
                    const isItemLoading = actionLoadingId === product.id;
                    const metrics = getProductOutletMetrics(product);

                    return (
                      <tr key={product.id} className="hover:bg-gray-50/70 transition-colors">
                        {/* Image & Name & Slug */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={product.image}
                              alt={product.name}
                              referrerPolicy="no-referrer"
                              className="w-12 h-12 rounded-xl object-cover border border-gray-200 shrink-0"
                            />
                            <div className="min-w-0 max-w-xs">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`w-2 h-2 rounded-full shrink-0 ${
                                    product.isVeg ? 'bg-emerald-500' : 'bg-red-500'
                                  }`}
                                />
                                <p className="font-bold text-gray-950 truncate">{product.name}</p>
                              </div>
                              {product.hindiName && (
                                <p className="text-[10px] text-gray-500 font-medium truncate">
                                  {product.hindiName}
                                </p>
                              )}
                              <p className="text-[10px] text-gray-400 font-mono truncate">
                                /{product.slug}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-3">
                          <span className="inline-block bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded">
                            {getCategoryLabel(product.category)}
                          </span>
                        </td>

                        {/* Price */}
                        <td className="py-3.5 px-3">
                          <div className="font-bold text-gray-900">₹{product.price}</div>
                          {product.originalPrice && (
                            <div className="text-[10px] text-gray-400 line-through">
                              ₹{product.originalPrice}
                            </div>
                          )}
                        </td>

                        {/* Served In (Kitchen Outlets & Badges) */}
                        <td className="py-3.5 px-3">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {/* Outlets Served Pill */}
                              <button
                                type="button"
                                onClick={() => openQuickOutletConfig(product)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 transition-colors cursor-pointer"
                                title="Click to view & configure outlet stock"
                              >
                                <Store className="w-3 h-3 text-amber-700" />
                                <span>
                                  {metrics.totalAssigned === outlets.length && outlets.length > 0
                                    ? `All (${metrics.totalAssigned}) Outlets`
                                    : `${metrics.totalAssigned} of ${outlets.length} Outlets`}
                                </span>
                              </button>

                              {/* Out of Stock warning badge if any */}
                              {metrics.outOfStockCount > 0 && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[9px] font-bold">
                                  <PackageX className="w-2.5 h-2.5" />
                                  {metrics.outOfStockCount} Out of Stock
                                </span>
                              )}
                            </div>

                            {/* Badges Breakdown */}
                            <div className="flex items-center gap-1 flex-wrap">
                              {metrics.featuredCount > 0 && (
                                <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                  <Sparkles className="w-2.5 h-2.5" />
                                  {metrics.featuredCount} Featured
                                </span>
                              )}
                              {metrics.bestsellerCount > 0 && (
                                <span className="bg-orange-50 text-orange-700 border border-orange-200 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                  <Flame className="w-2.5 h-2.5" />
                                  {metrics.bestsellerCount} Bestseller
                                </span>
                              )}
                              {metrics.featuredCount === 0 && metrics.bestsellerCount === 0 && (
                                <span className="text-[10px] text-gray-400 italic">No outlet ribbons</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Active toggle */}
                        <td className="py-3.5 px-3">
                          <button
                            type="button"
                            disabled={isItemLoading}
                            onClick={() => handleToggleActive(product.id)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors cursor-pointer ${
                              product.active !== false
                                ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                                : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                            }`}
                            title="Click to toggle Storefront Visibility"
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
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openQuickOutletConfig(product)}
                              className="p-1.5 text-gray-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                              title="Quick manage outlet stock & flags"
                            >
                              <Settings2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => goToOwnerEditProduct(product.id)}
                              className="p-1.5 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit full product details"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setProductToDelete(product)}
                              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete product"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile / Tablet Cards View */}
            <div className="lg:hidden divide-y divide-gray-100">
              {filteredProducts.map((product) => {
                const metrics = getProductOutletMetrics(product);
                return (
                  <div key={product.id} className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <img
                        src={product.image}
                        alt={product.name}
                        referrerPolicy="no-referrer"
                        className="w-16 h-16 rounded-xl object-cover border border-gray-200 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              product.isVeg ? 'bg-emerald-500' : 'bg-red-500'
                            }`}
                          />
                          <h4 className="font-bold text-xs text-gray-900 truncate">{product.name}</h4>
                        </div>
                        <p className="text-[10px] text-gray-500 font-medium">{getCategoryLabel(product.category)}</p>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="font-extrabold text-xs text-gray-950">₹{product.price}</span>
                          {product.originalPrice && (
                            <span className="text-[10px] text-gray-400 line-through">
                              ₹{product.originalPrice}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => goToOwnerEditProduct(product.id)}
                          className="p-2 text-gray-700 hover:text-orange-600 hover:bg-orange-50 rounded-lg"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setProductToDelete(product)}
                          className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Served In Info & Badges */}
                    <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-200 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-gray-700 flex items-center gap-1">
                          <Store className="w-3.5 h-3.5 text-amber-700" />
                          <span>Served In: {metrics.totalAssigned} Outlets</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => openQuickOutletConfig(product)}
                          className="text-[10px] font-bold text-orange-600 hover:text-orange-700"
                        >
                          Edit Stock
                        </button>
                      </div>

                      <div className="flex items-center gap-1 flex-wrap">
                        {metrics.featuredCount > 0 && (
                          <span className="bg-purple-100 text-purple-800 text-[9px] font-bold px-1.5 py-0.5 rounded">
                            {metrics.featuredCount} Featured
                          </span>
                        )}
                        {metrics.bestsellerCount > 0 && (
                          <span className="bg-orange-100 text-orange-800 text-[9px] font-bold px-1.5 py-0.5 rounded">
                            {metrics.bestsellerCount} Bestseller
                          </span>
                        )}
                        {metrics.outOfStockCount > 0 && (
                          <span className="bg-rose-100 text-rose-800 text-[9px] font-bold px-1.5 py-0.5 rounded">
                            {metrics.outOfStockCount} Out of Stock
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(product.id)}
                        className={`w-full py-1.5 px-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 border ${
                          product.active !== false
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}
                      >
                        {product.active !== false ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        <span>{product.active !== false ? 'Storefront: Active' : 'Storefront: Inactive'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* 3. Quick Outlet Configuration Modal */}
      {productForOutletConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-gray-900">
                  Outlet Stock & Ribbons
                </h3>
                <p className="text-xs text-gray-500">{productForOutletConfig.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setProductForOutletConfig(null)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Configure which cloud kitchen outlets serve this dish and toggle instant daily stock status or homepage ribbons.
            </p>

            <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1">
              {outlets.map((outlet) => {
                const cfg = quickConfigState[outlet.id] || {
                  isAssigned: false,
                  inStock: true,
                  isFeatured: false,
                  isBestseller: false,
                };

                return (
                  <div
                    key={outlet.id}
                    className={`p-3 rounded-xl border transition-all ${
                      cfg.isAssigned
                        ? 'border-orange-300 bg-orange-50/25'
                        : 'border-gray-200 bg-gray-50/50 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={cfg.isAssigned}
                          onChange={() => {
                            setQuickConfigState((prev) => ({
                              ...prev,
                              [outlet.id]: {
                                ...(prev[outlet.id] || { inStock: true, isFeatured: false, isBestseller: false }),
                                isAssigned: !prev[outlet.id]?.isAssigned,
                              },
                            }));
                          }}
                          className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-gray-300"
                        />
                        <div>
                          <p className="text-xs font-bold text-gray-900">{outlet.name}</p>
                          <p className="text-[10px] text-gray-500">{outlet.city}</p>
                        </div>
                      </label>

                      {cfg.isAssigned && (
                        <div className="flex items-center gap-2">
                          {/* In Stock toggle */}
                          <button
                            type="button"
                            onClick={() => {
                              setQuickConfigState((prev) => ({
                                ...prev,
                                [outlet.id]: {
                                  ...prev[outlet.id],
                                  inStock: !prev[outlet.id]?.inStock,
                                },
                              }));
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                              cfg.inStock
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : 'bg-amber-100 text-amber-900 border-amber-300'
                            }`}
                          >
                            {cfg.inStock ? 'In Stock' : 'Out of Stock'}
                          </button>

                          {/* Featured toggle */}
                          <button
                            type="button"
                            onClick={() => {
                              setQuickConfigState((prev) => ({
                                ...prev,
                                [outlet.id]: {
                                  ...prev[outlet.id],
                                  isFeatured: !prev[outlet.id]?.isFeatured,
                                },
                              }));
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                              cfg.isFeatured
                                ? 'bg-purple-100 text-purple-800 border-purple-300'
                                : 'bg-gray-100 text-gray-600 border-gray-200'
                            }`}
                          >
                            Featured
                          </button>

                          {/* Bestseller toggle */}
                          <button
                            type="button"
                            onClick={() => {
                              setQuickConfigState((prev) => ({
                                ...prev,
                                [outlet.id]: {
                                  ...prev[outlet.id],
                                  isBestseller: !prev[outlet.id]?.isBestseller,
                                },
                              }));
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                              cfg.isBestseller
                                ? 'bg-orange-100 text-orange-800 border-orange-300'
                                : 'bg-gray-100 text-gray-600 border-gray-200'
                            }`}
                          >
                            Bestseller
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
              <button
                type="button"
                disabled={isSavingQuickConfig}
                onClick={() => setProductForOutletConfig(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingQuickConfig}
                onClick={saveQuickOutletConfig}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {isSavingQuickConfig ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Outlet Settings</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-gray-900">
                  Delete Dish from Menu?
                </h3>
                <p className="text-xs text-gray-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Are you sure you want to delete <strong className="text-gray-900">"{productToDelete.name}"</strong>? It will be removed from your cloud kitchen database and won't appear on the customer storefront or cart.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setProductToDelete(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Dish</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </OwnerLayout>
  );
};
