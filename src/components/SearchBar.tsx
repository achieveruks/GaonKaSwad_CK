import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Flame, Star, ArrowRight } from 'lucide-react';
import { PRODUCTS } from '../data/products';
import { useNavigation } from '../context/NavigationContext';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const trimmed = (query || '').trim().toLowerCase();

  const matchingProducts: Product[] = trimmed
    ? PRODUCTS.filter(
        (p) =>
          (p?.name || '').toLowerCase().includes(trimmed) ||
          (p?.shortDescription || '').toLowerCase().includes(trimmed) ||
          (p?.ingredients || []).some((ing) => (ing || '').toLowerCase().includes(trimmed)) ||
          (p?.category || '').toLowerCase().includes(trimmed)
      ).slice(0, 5)
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
      <form onSubmit={handleSubmit} className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
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
          className="w-full pl-9 pr-8 py-2 bg-gray-100 hover:bg-gray-100 focus:bg-white text-gray-900 placeholder:text-gray-400 text-xs sm:text-sm rounded-full border border-transparent focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </form>

      {/* Autocomplete Dropdown */}
      {isOpen && query.trim().length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50 max-h-96 overflow-y-auto">
          {matchingProducts.length > 0 ? (
            <div>
              <div className="p-2.5 bg-gray-50 border-b border-gray-100 text-[11px] font-semibold text-gray-500 flex items-center justify-between">
                <span>Matching Delicacies ({matchingProducts.length})</span>
                <span className="text-gray-400">Press Enter to see all</span>
              </div>
              <div className="divide-y divide-gray-100">
                {matchingProducts.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handleSelectProduct(p.slug)}
                    className="p-3 hover:bg-orange-50/60 transition-colors cursor-pointer flex items-center gap-3"
                  >
                    <img
                      src={p.image}
                      alt={p.name}
                      className="w-11 h-11 rounded-lg object-cover border border-gray-200 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            p.isVeg ? 'bg-emerald-600' : 'bg-rose-700'
                          }`}
                        />
                        <h4 className="font-semibold text-xs text-gray-900 truncate">
                          {p.name}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                        <span className="font-bold text-orange-600">₹{p.price}</span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5 text-orange-500">
                          <Star className="w-3 h-3 fill-amber-400" />
                          {p.rating}
                        </span>
                        <span>•</span>
                        <span className="capitalize">{p.spiceLevel}</span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 shrink-0" />
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={handleSubmit}
                className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 text-center text-xs font-semibold text-orange-700 border-t border-gray-100 transition-colors flex items-center justify-center gap-1.5"
              >
                <span>View all results for &quot;{query}&quot;</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">
              <p className="text-xs">No delicacies found matching &quot;{query}&quot;</p>
              <p className="text-[11px] text-gray-400 mt-1">
                Try searching for biryani, butter chicken, dal makhani, or naan.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
