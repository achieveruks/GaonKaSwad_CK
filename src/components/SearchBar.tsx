import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Star, ArrowRight } from 'lucide-react';
import { useNavigation } from '../context/NavigationContext';
import { useProducts } from '../context/ProductContext';
import { Product } from '../types';

interface SearchBarProps {
  placeholder?: string;
  autoFocus?: boolean;
  onClose?: () => void;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Search biryani, curries, tandoori, naan, desserts...',
  autoFocus = false,
  onClose,
  className = ''
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { goToProduct, goToShop } = useNavigation();
  const { outletProducts, allProducts } = useProducts();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const availableProducts = outletProducts && outletProducts.length > 0 ? outletProducts : allProducts;
  const trimmed = (query || '').trim().toLowerCase();

  const matchingProducts: Product[] = trimmed
    ? availableProducts
        .filter(
          (p) =>
            (p?.name || '').toLowerCase().includes(trimmed) ||
            (p?.shortDescription || '').toLowerCase().includes(trimmed) ||
            (p?.ingredients || []).some((ing) => (ing || '').toLowerCase().includes(trimmed)) ||
            (p?.category || '').toLowerCase().includes(trimmed)
        )
        .slice(0, 6)
    : [];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setIsOpen(false);
      if (onClose) onClose();
      goToShop(undefined, query.trim());
    }
  };

  const handleSelectProduct = (slug: string) => {
    setIsOpen(false);
    setQuery('');
    if (onClose) onClose();
    goToProduct(slug);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <form onSubmit={handleSubmit} className="relative w-full">
        <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full pl-9 pr-9 py-2 bg-stone-100 hover:bg-stone-100/90 focus:bg-white text-stone-900 placeholder:text-stone-400 text-xs sm:text-sm rounded-full border border-stone-200/80 focus:border-amber-700 focus:ring-2 focus:ring-amber-600/20 outline-none transition-all shadow-2xs"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-0.5 rounded-full"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </form>

      {/* Autocomplete Dropdown Overlay */}
      {isOpen && query.trim().length > 0 && (
        <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-2xl border border-stone-200/90 overflow-hidden z-50 max-h-[65vh] sm:max-h-[24rem] md:max-h-[28rem] overflow-y-auto w-full min-w-full sm:min-w-[320px] md:min-w-[440px] max-w-[calc(100vw-1.5rem)]">
          {matchingProducts.length > 0 ? (
            <div>
              <div className="px-4 py-2.5 bg-stone-50 border-b border-stone-100 text-xs font-semibold text-stone-600 flex items-center justify-between">
                <span>Matching Delicacies ({matchingProducts.length})</span>
                <span className="text-[11px] text-stone-400 hidden sm:inline">Press Enter for all</span>
              </div>
              <div className="divide-y divide-stone-100">
                {matchingProducts.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handleSelectProduct(p.slug)}
                    className="p-3 sm:p-3.5 hover:bg-amber-50/60 transition-colors cursor-pointer flex items-center gap-3 group"
                  >
                    <img
                      src={p.image}
                      alt={p.name}
                      className="w-12 h-12 rounded-xl object-cover border border-stone-200 shrink-0 group-hover:scale-105 transition-transform"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            p.isVeg ? 'bg-emerald-600' : 'bg-rose-700'
                          }`}
                          title={p.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                        />
                        <h4 className="font-bold text-xs sm:text-sm text-stone-900 truncate">
                          {p.name}
                        </h4>
                      </div>
                      <div className="flex items-center flex-wrap gap-2 text-xs text-stone-500 mt-1">
                        <span className="font-extrabold text-amber-900">₹{p.price}</span>
                        <span className="text-stone-300">•</span>
                        <span className="flex items-center gap-0.5 text-amber-700 font-semibold">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                          {p.rating}
                        </span>
                        <span className="text-stone-300">•</span>
                        <span className="capitalize text-[11px] text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded font-medium">
                          {p.spiceLevel}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-amber-800 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={handleSubmit}
                className="w-full py-3 bg-stone-50 hover:bg-amber-50 text-center text-xs font-bold text-amber-800 border-t border-stone-100 transition-colors flex items-center justify-center gap-1.5 group cursor-pointer"
              >
                <span>View all results for &quot;{query}&quot;</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          ) : (
            <div className="p-7 text-center text-stone-500">
              <p className="text-sm font-semibold text-stone-800">No delicacies found</p>
              <p className="text-xs text-stone-500 mt-1">
                No dishes matching &quot;{query}&quot; at this outlet. Try searching for biryani, thali, or curry.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

