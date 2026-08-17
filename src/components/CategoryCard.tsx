import React from 'react';
import { Category } from '../types';
import { useNavigation } from '../context/NavigationContext';
import { Flame, Soup, Utensils, Wheat, Sparkles, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

interface CategoryCardProps {
  category: Category;
  isActive?: boolean;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({ category, isActive = false }) => {
  const { goToShop } = useNavigation();

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Flame':
        return <Flame className="w-5 h-5 text-amber-500" />;
      case 'Soup':
        return <Soup className="w-5 h-5 text-orange-500" />;
      case 'Utensils':
        return <Utensils className="w-5 h-5 text-red-500" />;
      case 'Wheat':
        return <Wheat className="w-5 h-5 text-yellow-500" />;
      case 'Sparkles':
      default:
        return <Sparkles className="w-5 h-5 text-amber-400" />;
    }
  };

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.15 }}
      onClick={() => goToShop(category.slug)}
      className={`group relative overflow-hidden rounded-xl cursor-pointer border transition-all duration-200 ${
        isActive
          ? 'border-orange-600 shadow-md ring-2 ring-orange-600/20'
          : 'border-gray-200 hover:border-orange-500/80 hover:shadow-md bg-white'
      }`}
    >
      <div className="relative aspect-16/10 w-full overflow-hidden bg-gray-100">
        <img
          src={category.image}
          alt={category.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950/85 via-gray-950/40 to-black/10" />

        {/* Floating Category Icon */}
        <div className="absolute top-2.5 left-2.5 w-8 h-8 rounded-lg bg-gray-900/80 backdrop-blur-md border border-gray-700/50 flex items-center justify-center shadow-md">
          {getIcon(category.iconName)}
        </div>

        {/* Items Pill */}
        <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-gray-950/70 backdrop-blur-xs text-[10px] font-semibold text-gray-200">
          {category.itemCount} items
        </div>

        {/* Content bottom */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5">
          <h4 className="font-heading font-bold text-white text-sm sm:text-base group-hover:text-orange-400 transition-colors flex items-center justify-between">
            <span>{category.name}</span>
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-orange-400 group-hover:translate-x-0.5 transition-all" />
          </h4>
          <p className="text-[11px] text-gray-300 line-clamp-1 mt-0.5">
            {category.tagline}
          </p>
        </div>
      </div>
    </motion.div>
  );
};
