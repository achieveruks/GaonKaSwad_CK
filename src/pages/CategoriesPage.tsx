import React from 'react';
import { CATEGORIES } from '../data/products';
import { useNavigation } from '../context/NavigationContext';
import { useProducts } from '../context/ProductContext';
import { CategoryCard } from '../components/CategoryCard';
import { ProductCard } from '../components/ProductCard';
import {
  Soup,
  ArrowRight,
  Flame,
  Sparkles
} from 'lucide-react';

export const CategoriesPage: React.FC = () => {
  const { goToShop } = useNavigation();
  const { activeProducts } = useProducts();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="bg-gray-900 text-white rounded-2xl p-5 sm:p-6 border border-gray-800 shadow-xs">
        <div className="max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-1.5 bg-orange-500/20 text-orange-400 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider">
            <Soup className="w-3 h-3" />
            <span>Menu Specialties</span>
          </div>
          <h1 className="font-extrabold text-xl sm:text-3xl text-white">
            Explore Dishes by Specialty
          </h1>
          <p className="text-xs text-gray-300">
            Every dish is made with authentic slow-cooking rituals, authentic earthen cookware, and fresh hand-ground spices.
          </p>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {CATEGORIES.map((category) => {
          const categoryProducts = activeProducts.filter((p) => p.category === category.slug);
          return (
            <div
              key={category.id}
              className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Image Banner */}
                <div className="relative aspect-16/9 overflow-hidden">
                  <img
                    src={category.image}
                    alt={category.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-2.5 left-3.5 right-3.5 text-white">
                    <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">
                      {categoryProducts.length} Delicacies
                    </span>
                    <h3 className="font-bold text-base text-white">
                      {category.name}
                    </h3>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-4 space-y-2.5">
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {category.tagline}
                  </p>

                  {/* Sample item tags */}
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {categoryProducts.slice(0, 3).map((item) => (
                      <span
                        key={item.id}
                        className="text-[10px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded"
                      >
                        {item.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="p-4 pt-0">
                <button
                  type="button"
                  onClick={() => goToShop(category.slug)}
                  className="w-full py-2 bg-gray-50 hover:bg-orange-600 text-gray-800 hover:text-white border border-gray-200 hover:border-orange-600 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>Explore {category.name}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
