import React, { useState, useMemo } from 'react';
import { OwnerLayout } from './OwnerLayout';
import { useProducts } from '../../context/ProductContext';
import { useNavigation } from '../../context/NavigationContext';
import { CATEGORIES } from '../../data/products';
import { Product } from '../../types';
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
} from 'lucide-react';

export const OwnerProductsPage: React.FC = () => {
  const { allProducts, removeProduct, toggleActive, toggleStock, refreshProducts, isLoading } = useProducts();
  const { goToOwnerAddProduct, goToOwnerEditProduct } = useNavigation();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedStock, setSelectedStock] = useState<'all' | 'inStock' | 'outOfStock'>('all');

  // Deletion modal state
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);

  // Toggle button loading
  const [actionLoadingId, setActionLoadingId] = useState<string | number | null>(null);

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

      // Active status
      if (selectedStatus === 'active' && product.active === false) return false;
      if (selectedStatus === 'inactive' && product.active !== false) return false;

      // Stock status
      if (selectedStock === 'inStock' && product.inStock === false) return false;
      if (selectedStock === 'outOfStock' && product.inStock !== false) return false;

      return true;
    });
  }, [allProducts, searchQuery, selectedCategory, selectedStatus, selectedStock]);

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

  const handleToggleStock = async (id: string | number) => {
    setActionLoadingId(id);
    try {
      await toggleStock(id);
      showNotification('Product stock status updated');
    } catch (err: any) {
      setActionErrorMessage(err.message || 'Failed to update stock status');
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

  return (
    <OwnerLayout
      activeTab="products"
      title="Product Catalog & Inventory"
      subtitle={`Manage all ${allProducts.length} dishes in your cloud kitchen database.`}
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
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 font-medium focus:outline-none focus:border-orange-500 focus:bg-white cursor-pointer"
            >
              <option value="all">All Categories ({allProducts.length})</option>
              {CATEGORIES.map((cat) => {
                const count = allProducts.filter(
                  (p) => p.category === cat.slug || p.category === cat.id
                ).length;
                return (
                  <option key={cat.slug} value={cat.slug}>
                    {cat.name} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Visibility Status Filter */}
          <div className="sm:col-span-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 font-medium focus:outline-none focus:border-orange-500 focus:bg-white"
            >
              <option value="all">Visibility: All</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          {/* Stock Status Filter */}
          <div className="sm:col-span-2">
            <select
              value={selectedStock}
              onChange={(e) => setSelectedStock(e.target.value as any)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 font-medium focus:outline-none focus:border-orange-500 focus:bg-white"
            >
              <option value="all">Stock: All</option>
              <option value="inStock">In Stock Only</option>
              <option value="outOfStock">Out of Stock Only</option>
            </select>
          </div>
        </div>

        {/* Filter Summary */}
        <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1 border-t border-gray-100">
          <span>
            Showing <strong className="text-gray-900">{filteredProducts.length}</strong> of {allProducts.length} products
          </span>
          {(searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all' || selectedStock !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedStatus('all');
                setSelectedStock('all');
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
                    <th className="py-3.5 px-3">Stock Status</th>
                    <th className="py-3.5 px-3">Store Visibility</th>
                    <th className="py-3.5 px-3">Badges</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {filteredProducts.map((product) => {
                    const isItemLoading = actionLoadingId === product.id;
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

                        {/* In Stock toggle */}
                        <td className="py-3.5 px-3">
                          <button
                            type="button"
                            disabled={isItemLoading}
                            onClick={() => handleToggleStock(product.id)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors cursor-pointer ${
                              product.inStock !== false
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                            }`}
                            title="Click to toggle In Stock / Out of Stock"
                          >
                            {product.inStock !== false ? (
                              <>
                                <PackageCheck className="w-3 h-3 text-emerald-600" />
                                <span>In Stock</span>
                              </>
                            ) : (
                              <>
                                <PackageX className="w-3 h-3 text-amber-600" />
                                <span>Out of Stock</span>
                              </>
                            )}
                          </button>
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

                        {/* Badges */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-1 flex-wrap">
                            {product.featured && (
                              <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[9px] font-bold px-1.5 py-0.2 rounded flex items-center gap-0.5">
                                <Sparkles className="w-2.5 h-2.5" />
                                Featured
                              </span>
                            )}
                            {product.bestseller && (
                              <span className="bg-orange-50 text-orange-700 border border-orange-200 text-[9px] font-bold px-1.5 py-0.2 rounded flex items-center gap-0.5">
                                <Flame className="w-2.5 h-2.5" />
                                Bestseller
                              </span>
                            )}
                            {!product.featured && !product.bestseller && (
                              <span className="text-[10px] text-gray-400">—</span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => goToOwnerEditProduct(product.id)}
                              className="p-1.5 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit product"
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
              {filteredProducts.map((product) => (
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

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleToggleStock(product.id)}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 border ${
                        product.inStock !== false
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {product.inStock !== false ? <PackageCheck className="w-3 h-3" /> : <PackageX className="w-3 h-3" />}
                      <span>{product.inStock !== false ? 'In Stock' : 'Out of Stock'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleActive(product.id)}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 border ${
                        product.active !== false
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-gray-100 text-gray-600 border-gray-200'
                      }`}
                    >
                      {product.active !== false ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      <span>{product.active !== false ? 'Active' : 'Inactive'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 3. Delete Confirmation Modal */}
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
