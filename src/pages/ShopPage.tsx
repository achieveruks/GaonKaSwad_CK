import React, { useState, useEffect, useMemo } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { useProducts } from '../context/ProductContext';
import { CATEGORIES } from '../data/products';
import { ProductCard } from '../components/ProductCard';
import { FilterSidebar } from '../components/FilterSidebar';
import { FilterState, Product } from '../types';
import {
  Search,
  SlidersHorizontal,
  X,
  RotateCcw,
  Sparkles,
  Flame,
  ArrowUpDown,
  Utensils
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ShopPage: React.FC = () => {
  const { currentRoute, goToShop } = useNavigation();
  const { activeProducts } = useProducts();

  // Extract route params if passed
  const initialCategory = currentRoute.path === '/shop' ? currentRoute.category || '' : '';
  const initialSearch = currentRoute.path === '/shop' ? currentRoute.search || '' : '';

  const initialFilters: FilterState = {
    searchQuery: initialSearch,
    category: initialCategory,
    dietary: 'all',
    spiceLevel: '',
    minPrice: 100,
    maxPrice: 800,
    sortBy: 'popular'
  };

  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Sync route updates to filters
  useEffect(() => {
    if (currentRoute.path === '/shop') {
      if (currentRoute.category !== undefined) {
        setFilters((prev) => ({ ...prev, category: currentRoute.category || '' }));
      }
      if (currentRoute.search !== undefined) {
        setFilters((prev) => ({ ...prev, searchQuery: currentRoute.search || '' }));
      }
    }
  }, [currentRoute]);

  const handleResetFilters = () => {
    setFilters({
      searchQuery: '',
      category: '',
      dietary: 'all',
      spiceLevel: '',
      minPrice: 100,
      maxPrice: 800,
      sortBy: 'popular'
    });
  };

  // Filter & Sort computation
  const filteredProducts = useMemo(() => {
    return activeProducts.filter((product) => {
      // 1. Search Query
      if (filters.searchQuery?.trim()) {
        const query = (filters.searchQuery || '').toLowerCase().trim();
        const matchesName = (product?.name || '').toLowerCase().includes(query);
        const matchesDesc = (product?.shortDescription || '').toLowerCase().includes(query);
        const matchesIngredients = (product?.ingredients || []).some((ing) =>
          (ing || '').toLowerCase().includes(query)
        );
        const matchesHindi = product?.hindiName ? product.hindiName.toLowerCase().includes(query) : false;
        if (!matchesName && !matchesDesc && !matchesIngredients && !matchesHindi) {
          return false;
        }
      }

      // 2. Category
      if (filters.category) {
        const catObj = CATEGORIES.find(
          (c) => c.slug === filters.category || c.id === filters.category
        );
        const matchSlugs = catObj ? [catObj.slug, catObj.id] : [filters.category];
        if (!matchSlugs.includes(product.category)) {
          return false;
        }
      }

      // 3. Dietary
      if (filters.dietary === 'veg' && !product.isVeg) return false;
      if (filters.dietary === 'non-veg' && product.isVeg) return false;

      // 4. Spice Level
      if (filters.spiceLevel && product.spiceLevel !== filters.spiceLevel) {
        return false;
      }

      // 5. Price Range
      if (product.price > filters.maxPrice) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      switch (filters.sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'rating':
          return b.rating - a.rating;
        case 'newest':
          return (b.newArrival ? 1 : 0) - (a.newArrival ? 1 : 0);
        case 'popular':
        default:
          return (b.bestseller ? 2 : 0) + b.rating - ((a.bestseller ? 2 : 0) + a.rating);
      }
    });
  }, [filters, activeProducts]);

  // Dynamic category counts map based on active products
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of CATEGORIES) {
      counts[cat.slug] = activeProducts.filter(
        (p) => p.category === cat.slug || p.category === cat.id
      ).length;
    }
    return counts;
  }, [activeProducts]);

  const activeCategoryObj = CATEGORIES.find((c) => c.slug === filters.category);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Header Banner */}
      <div className="relative rounded-2xl overflow-hidden bg-gray-900 text-white p-5 sm:p-6 border border-gray-800 shadow-xs">
        <div className="max-w-2xl space-y-1.5">
          <div className="inline-flex items-center gap-1.5 bg-orange-500/20 text-orange-400 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider">
            <Flame className="w-3 h-3" />
            <span>Cloud Kitchen Menu</span>
          </div>
          <h1 className="font-extrabold text-xl sm:text-3xl text-white">
            {activeCategoryObj ? activeCategoryObj.name : 'Authentic Gourmet Delicacies'}
          </h1>
          <p className="text-xs text-gray-300">
            {activeCategoryObj
              ? activeCategoryObj.tagline
              : 'Browse slow-cooked handi curries, dum biryanis, clay-oven kebabs, and artisanal desserts.'}
          </p>
        </div>
      </div>

      {/* Top Search & Category Pills */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Direct search within shop page */}
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))
              }
              placeholder="Search delicacies, ingredients, or spices..."
              className="w-full pl-9 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 shadow-xs transition-all"
            />
            {filters.searchQuery && (
              <button
                type="button"
                onClick={() => setFilters((prev) => ({ ...prev, searchQuery: '' }))}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Mobile Filter Toggle & Quick Sort */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <button
              type="button"
              onClick={() => setIsMobileFilterOpen(true)}
              className="lg:hidden flex items-center gap-1.5 bg-white border border-gray-200 px-3 py-2 rounded-xl text-xs font-semibold text-gray-800 shadow-xs hover:bg-gray-50"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-orange-600" />
              <span>Filters</span>
              {(filters.category ||
                filters.dietary !== 'all' ||
                filters.spiceLevel ||
                filters.maxPrice < 800) && (
                <span className="w-1.5 h-1.5 rounded-full bg-orange-600" />
              )}
            </button>

            {/* Sort Select */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 hidden sm:inline">Sort:</span>
              <select
                value={filters.sortBy}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    sortBy: e.target.value as FilterState['sortBy']
                  }))
                }
                className="bg-white border border-gray-200 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:border-orange-500 shadow-xs"
              >
                <option value="popular">Most Popular</option>
                <option value="rating">Highest Rated</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="newest">New Arrivals</option>
              </select>
            </div>
          </div>
        </div>

        {/* Quick Category Chips Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setFilters((prev) => ({ ...prev, category: '' }))}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
              filters.category === ''
                ? 'bg-gray-900 text-white shadow-xs'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            All Specialties ({activeProducts.length})
          </button>

          {CATEGORIES.map((cat) => {
            const count = categoryCounts[cat.slug] ?? 0;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setFilters((prev) => ({ ...prev, category: cat.slug }))}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
                  filters.category === cat.slug
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>

        {/* Active Filters Summary Bar */}
        {(filters.searchQuery ||
          filters.category ||
          filters.dietary !== 'all' ||
          filters.spiceLevel ||
          filters.maxPrice < 800) && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-xs text-gray-600">
            <span className="font-semibold text-gray-500">Active:</span>

            {filters.searchQuery && (
              <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-900 px-2 py-0.5 rounded-md border border-orange-200 font-medium text-[11px]">
                &quot;{filters.searchQuery}&quot;
                <X
                  className="w-3 h-3 cursor-pointer hover:text-rose-600"
                  onClick={() => setFilters((prev) => ({ ...prev, searchQuery: '' }))}
                />
              </span>
            )}

            {filters.category && (
              <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-900 px-2 py-0.5 rounded-md border border-orange-200 font-medium text-[11px]">
                {activeCategoryObj?.name}
                <X
                  className="w-3 h-3 cursor-pointer hover:text-rose-600"
                  onClick={() => setFilters((prev) => ({ ...prev, category: '' }))}
                />
              </span>
            )}

            {filters.dietary !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-900 px-2 py-0.5 rounded-md border border-orange-200 font-medium text-[11px]">
                {filters.dietary === 'veg' ? 'Pure Veg' : 'Non-Veg'}
                <X
                  className="w-3 h-3 cursor-pointer hover:text-rose-600"
                  onClick={() => setFilters((prev) => ({ ...prev, dietary: 'all' }))}
                />
              </span>
            )}

            {filters.spiceLevel && (
              <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-900 px-2 py-0.5 rounded-md border border-orange-200 font-medium text-[11px]">
                Spice: {filters.spiceLevel}
                <X
                  className="w-3 h-3 cursor-pointer hover:text-rose-600"
                  onClick={() => setFilters((prev) => ({ ...prev, spiceLevel: '' }))}
                />
              </span>
            )}

            {filters.maxPrice < 800 && (
              <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-900 px-2 py-0.5 rounded-md border border-orange-200 font-medium text-[11px]">
                Under ₹{filters.maxPrice}
                <X
                  className="w-3 h-3 cursor-pointer hover:text-rose-600"
                  onClick={() => setFilters((prev) => ({ ...prev, maxPrice: 800 }))}
                />
              </span>
            )}

            <button
              type="button"
              onClick={handleResetFilters}
              className="text-gray-400 hover:text-rose-600 font-semibold underline text-[11px] ml-1"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Main Content Layout: Sidebar + Product Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Desktop Filter Sidebar (1 col) */}
        <div className="hidden lg:block lg:col-span-1 sticky top-24">
          <FilterSidebar
            filters={filters}
            setFilters={setFilters}
            onReset={handleResetFilters}
            totalResultsCount={filteredProducts.length}
          />
        </div>

        {/* Product Grid Area (3 cols) */}
        <div className="lg:col-span-3">
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-600 mx-auto flex items-center justify-center">
                <Utensils className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-gray-900">
                No delicacies found matching your criteria
              </h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Try widening your price range or clearing active dietary filters to see our full authentic menu.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-5 py-2 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All Filters</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filter Modal */}
      <AnimatePresence>
        {isMobileFilterOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileFilterOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-xs"
            />
            <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="w-screen max-w-sm bg-white shadow-2xl flex flex-col justify-between"
              >
                <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                  <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-orange-600" />
                    <span>Filter Delicacies</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsMobileFilterOpen(false)}
                    className="p-1 text-gray-400 hover:text-gray-700 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  <FilterSidebar
                    filters={filters}
                    setFilters={setFilters}
                    onReset={handleResetFilters}
                    totalResultsCount={filteredProducts.length}
                  />
                </div>

                <div className="p-4 border-t border-gray-200 bg-gray-50">
                  <button
                    type="button"
                    onClick={() => setIsMobileFilterOpen(false)}
                    className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                  >
                    Apply Filters ({filteredProducts.length} results)
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
