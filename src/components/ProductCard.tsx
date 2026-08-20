import React from 'react';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { useNavigation } from '../context/NavigationContext';
import { useLocation } from '../context/LocationContext';
import {
  isProductServedAtOutlet,
  isProductInStockAtOutlet,
  isProductFeaturedAtOutlet,
  isProductBestsellerAtOutlet,
  isProductChefSpecialAtOutlet,
} from '../lib/locationService';
import { Star, Clock, Flame, Plus } from 'lucide-react';
import { motion } from 'motion/react';

interface ProductCardProps {
  product: Product;
  viewMode?: 'grid' | 'list';
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, viewMode = 'grid' }) => {
  const { addToCart, cart, updateQuantity } = useCart();
  const { goToProduct } = useNavigation();
  const { selectedLocation, setIsLocationModalOpen } = useLocation();

  const currentOutletId = selectedLocation?.outletId;
  const isServedHere = isProductServedAtOutlet(product, currentOutletId);
  const isInStockHere = isProductInStockAtOutlet(product, currentOutletId);
  const isFeaturedHere = isProductFeaturedAtOutlet(product, currentOutletId);
  const isBestsellerHere = isProductBestsellerAtOutlet(product, currentOutletId);
  const isChefSpecialHere = isProductChefSpecialAtOutlet(product, currentOutletId);

  // Check if item is already in cart (default variant)
  const cartItemsForProduct = cart.filter((item) => item.product.id === product.id);
  const totalQuantityInCart = cartItemsForProduct.reduce((sum, i) => sum + i.quantity, 0);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedLocation) {
      setIsLocationModalOpen(true);
      return;
    }
    if (!isServedHere || !isInStockHere) return;

    // Pick default variant if variants exist
    const defaultVariant =
      product.variants && product.variants.length > 0
        ? product.variants.find((v) => v.price === product.price) || product.variants[0]
        : undefined;

    addToCart(product, 1, defaultVariant);
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (cartItemsForProduct.length >= 1) {
      updateQuantity(cartItemsForProduct[0].id, 1);
    } else {
      const defaultVariant =
        product.variants && product.variants.length > 0
          ? product.variants.find((v) => v.price === product.price) || product.variants[0]
          : undefined;
      addToCart(product, 1, defaultVariant);
    }
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (cartItemsForProduct.length >= 1) {
      updateQuantity(cartItemsForProduct[cartItemsForProduct.length - 1].id, -1);
    }
  };

  return (
    <motion.div
      id={`product-card-${product.id}`}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.15 }}
      onClick={() => goToProduct(product.slug)}
      className="group bg-white rounded-xl p-3.5 sm:p-4 border border-stone-200 hover:border-amber-700/80 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between cursor-pointer"
    >
      <div>
        {/* Image Container */}
        <div className="relative aspect-4/3 w-full bg-stone-100 rounded-lg overflow-hidden mb-3">
          <img
            src={product.image}
            alt={product.name}
            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out ${
              !isServedHere || !isInStockHere ? 'grayscale-[40%] opacity-85' : ''
            }`}
            referrerPolicy="no-referrer"
            loading="lazy"
          />

          {/* Gradient overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

          {/* Dietary & Badge Top Row */}
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Not Served, Out of Stock or Special Badges */}
              {!isServedHere ? (
                <span className="px-2 py-0.5 bg-stone-800/95 text-stone-300 font-bold text-[10px] uppercase tracking-wider rounded shadow-2xs border border-stone-600">
                  NOT AT OUTLET
                </span>
              ) : !isInStockHere ? (
                <span className="px-2 py-0.5 bg-stone-900/90 text-amber-300 font-bold text-[10px] uppercase tracking-wider rounded shadow-2xs border border-amber-400/40">
                  OUT OF STOCK
                </span>
              ) : isBestsellerHere ? (
                <span className="px-2 py-0.5 bg-emerald-600 text-white font-bold text-[10px] uppercase tracking-wider rounded shadow-2xs">
                  BESTSELLER
                </span>
              ) : isFeaturedHere ? (
                <span className="px-2 py-0.5 bg-amber-700 text-white font-bold text-[10px] uppercase tracking-wider rounded shadow-2xs">
                  FEATURED
                </span>
              ) : isChefSpecialHere ? (
                <span className="px-2 py-0.5 bg-stone-900 text-white font-bold text-[10px] uppercase tracking-wider rounded shadow-2xs">
                  CHEF SPECIAL
                </span>
              ) : product.spiceLevel === 'Spicy' || product.spiceLevel === 'Extra Spicy' ? (
                <span className="px-2 py-0.5 bg-rose-600 text-white font-bold text-[10px] uppercase tracking-wider rounded shadow-2xs">
                  SPICY
                </span>
              ) : null}
            </div>

            {/* Veg / Non-Veg Indicator */}
            <span
              className={`inline-flex items-center justify-center w-4 h-4 bg-white/95 rounded shadow-2xs border ${
                product.isVeg ? 'border-emerald-600' : 'border-rose-700'
              }`}
              title={product.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  product.isVeg ? 'bg-emerald-600' : 'bg-rose-700'
                }`}
              />
            </span>
          </div>

          {/* Bottom image stats pill */}
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[11px] text-white font-medium">
            <span className="px-1.5 py-0.5 bg-stone-950/70 backdrop-blur-2xs rounded flex items-center gap-1 text-[10px]">
              <Clock className="w-3 h-3 text-amber-400" />
              {product.prepTimeMinutes}m
            </span>
            <span className="px-1.5 py-0.5 bg-stone-950/70 backdrop-blur-2xs rounded flex items-center gap-1 text-[10px]">
              <Flame
                className={`w-3 h-3 ${
                  product.spiceLevel === 'Extra Spicy'
                    ? 'text-rose-500'
                    : product.spiceLevel === 'Spicy'
                    ? 'text-amber-500'
                    : 'text-amber-400'
                }`}
              />
              {product.spiceLevel}
            </span>
          </div>
        </div>

        {/* Content Section */}
        <div>
          {/* Header Row: Title & Price */}
          <div className="flex justify-between items-start mb-1 gap-2">
            <h3 className="font-bold text-stone-900 text-sm group-hover:text-amber-800 transition-colors line-clamp-1">
              {product.name}
            </h3>
            <span className="text-amber-800 font-bold text-sm shrink-0">₹{product.price}</span>
          </div>

          {/* Short Description */}
          <p className="text-xs text-stone-500 line-clamp-1 leading-relaxed mb-3">
            {product.shortDescription}
          </p>
        </div>
      </div>

      {/* Footer Row: Rating & + Add Button */}
      <div className="flex items-center justify-between pt-2 border-t border-stone-100">
        <div className="flex items-center gap-1">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span className="text-xs font-bold text-stone-700">{product.rating}</span>
          <span className="text-[10px] text-stone-400">({product.reviewsCount})</span>
        </div>

        {/* Cart Actions */}
        {!isServedHere ? (
          <span className="text-[10px] font-bold text-stone-500 bg-stone-100 border border-stone-200 px-2 py-1 rounded-md">
            Not at Outlet
          </span>
        ) : !isInStockHere ? (
          <span className="text-[10px] font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md">
            Out of Stock
          </span>
        ) : totalQuantityInCart > 0 ? (
          <div
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center bg-amber-50 border border-amber-300 rounded-lg px-2 py-0.5 text-xs font-bold text-amber-950 gap-1.5 shadow-2xs"
          >
            <button
              type="button"
              onClick={handleDecrement}
              className="w-5 h-5 rounded hover:bg-amber-200 text-amber-950 flex items-center justify-center transition-colors"
              aria-label="Decrease"
            >
              -
            </button>
            <span className="font-bold min-w-[14px] text-center">{totalQuantityInCart}</span>
            <button
              type="button"
              onClick={handleIncrement}
              className="w-5 h-5 rounded hover:bg-amber-200 text-amber-950 flex items-center justify-center transition-colors"
              aria-label="Increase"
            >
              +
            </button>
          </div>
        ) : (
          <button
            type="button"
            id={`add-to-cart-btn-${product.id}`}
            onClick={handleQuickAdd}
            className="p-1.5 px-2.5 bg-amber-800 hover:bg-amber-900 active:bg-stone-950 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs flex items-center gap-1"
            aria-label={`Add ${product.name} to cart`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="text-[11px] font-bold">Add</span>
          </button>
        )}
      </div>
    </motion.div>
  );
};
