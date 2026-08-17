import React from 'react';
import { FilterState } from '../types';
import { CATEGORIES } from '../data/products';
import { RotateCcw, SlidersHorizontal, Check } from 'lucide-react';

interface FilterSidebarProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  onReset: () => void;
  totalResultsCount: number;
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  filters,
  setFilters,
  onReset,
  totalResultsCount
}) => {
  const spiceOptions = ['All', 'Mild', 'Medium', 'Spicy', 'Extra Spicy'];

  return (
    <aside className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2 font-bold text-gray-900 text-sm">
          <SlidersHorizontal className="w-4 h-4 text-orange-600" />
          <span>Filters & Sort</span>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="text-xs font-semibold text-gray-400 hover:text-orange-600 flex items-center gap-1 transition-colors"
          title="Reset all filters"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* Sort By Section */}
      <div>
        <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-2">
          Sort By
        </label>
        <select
          value={filters.sortBy}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              sortBy: e.target.value as FilterState['sortBy']
            }))
          }
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-800 focus:outline-none focus:border-orange-500"
        >
          <option value="popular">Most Popular</option>
          <option value="rating">Highest Rated</option>
          <option value="price-low">Price: Low to High</option>
          <option value="price-high">Price: High to Low</option>
          <option value="newest">New Arrivals</option>
        </select>
      </div>

      {/* Dietary Preference */}
      <div>
        <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-2">
          Dietary Preference
        </label>
        <div className="grid grid-cols-3 gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200">
          <button
            type="button"
            onClick={() => setFilters((prev) => ({ ...prev, dietary: 'all' }))}
            className={`py-1.5 text-xs font-semibold rounded-md transition-all ${
              filters.dietary === 'all'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilters((prev) => ({ ...prev, dietary: 'veg' }))}
            className={`py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
              filters.dietary === 'veg'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-300 inline-block" />
            Veg
          </button>
          <button
            type="button"
            onClick={() => setFilters((prev) => ({ ...prev, dietary: 'non-veg' }))}
            className={`py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
              filters.dietary === 'non-veg'
                ? 'bg-rose-700 text-white shadow-xs'
                : 'text-rose-700 hover:bg-rose-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-300 inline-block" />
            Non-Veg
          </button>
        </div>
      </div>

      {/* Categories Filter */}
      <div>
        <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-2">
          Categories
        </label>
        <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
          <button
            type="button"
            onClick={() => setFilters((prev) => ({ ...prev, category: '' }))}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
              filters.category === ''
                ? 'bg-orange-50 text-orange-900 font-semibold border border-orange-200'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span>All Categories</span>
            {filters.category === '' && <Check className="w-3.5 h-3.5 text-orange-600" />}
          </button>

          {CATEGORIES.map((cat) => (
            <button
              key={cat.slug}
              type="button"
              onClick={() => setFilters((prev) => ({ ...prev, category: cat.slug }))}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
                filters.category === cat.slug
                  ? 'bg-orange-50 text-orange-900 font-semibold border border-orange-200'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span>{cat.name}</span>
              {filters.category === cat.slug && (
                <Check className="w-3.5 h-3.5 text-orange-600" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Spice Level */}
      <div>
        <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-2">
          Spice Intensity
        </label>
        <div className="flex flex-wrap gap-1.5">
          {spiceOptions.map((spice) => {
            const isSelected =
              spice === 'All' ? !filters.spiceLevel : filters.spiceLevel === spice;
            return (
              <button
                key={spice}
                type="button"
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    spiceLevel: spice === 'All' ? '' : spice
                  }))
                }
                className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                  isSelected
                    ? 'bg-gray-900 text-white border-gray-900 font-semibold'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {spice}
              </button>
            );
          })}
        </div>
      </div>

      {/* Price Range Filter */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
            Max Price
          </label>
          <span className="text-xs font-bold text-orange-600">₹{filters.maxPrice}</span>
        </div>
        <input
          type="range"
          min="100"
          max="800"
          step="50"
          value={filters.maxPrice}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, maxPrice: Number(e.target.value) }))
          }
          className="w-full accent-orange-600 cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
          <span>₹100</span>
          <span>₹800</span>
        </div>
      </div>

      {/* Results pill */}
      <div className="pt-2 text-center text-xs text-gray-500 font-medium">
        Showing <span className="font-bold text-gray-900">{totalResultsCount}</span> delicacies
      </div>
    </aside>
  );
};
