import React from 'react';
import { CartItem } from '../types';
import { useCart } from '../context/CartContext';
import { useNavigation } from '../context/NavigationContext';
import { QuantitySelector } from './QuantitySelector';
import { Trash2, Flame } from 'lucide-react';

interface CartItemRowProps {
  item: CartItem;
  compact?: boolean;
}

export const CartItemRow: React.FC<CartItemRowProps> = ({ item, compact = false }) => {
  const { updateQuantity, removeFromCart, setIsCartDrawerOpen } = useCart();
  const { goToProduct } = useNavigation();

  const handleProductClick = () => {
    setIsCartDrawerOpen(false);
    goToProduct(item.product.slug);
  };

  return (
    <div className={`flex gap-3 ${compact ? 'py-2.5' : 'py-3.5'} border-b border-gray-100 last:border-0 items-center`}>
      {/* Product Image */}
      <div
        onClick={handleProductClick}
        className={`relative shrink-0 rounded-lg overflow-hidden bg-gray-100 cursor-pointer border border-gray-200 ${
          compact ? 'w-14 h-14' : 'w-16 h-16'
        }`}
      >
        <img
          src={item.product.image}
          alt={item.product.name}
          className="w-full h-full object-cover hover:scale-105 transition-transform"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-1 left-1">
          <span
            className={`inline-flex items-center justify-center w-3.5 h-3.5 bg-white/95 rounded-xs border ${
              item.product.isVeg ? 'border-emerald-600' : 'border-rose-700'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                item.product.isVeg ? 'bg-emerald-600' : 'bg-rose-700'
              }`}
            />
          </span>
        </div>
      </div>

      {/* Item Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1">
          <h4
            onClick={handleProductClick}
            className="font-bold text-xs text-gray-900 uppercase hover:text-orange-600 cursor-pointer line-clamp-1"
          >
            {item.product.name}
          </h4>
          <span className="text-xs font-bold text-gray-900 shrink-0">
            ₹{item.unitPrice * item.quantity}
          </span>
        </div>

        {/* Selected Variant / Portion */}
        {item.selectedVariant && (
          <p className="text-[11px] text-gray-500 font-medium mt-0.5">
            Portion: <span className="text-gray-700">{item.selectedVariant.name}</span>
          </p>
        )}

        {/* Spice Level */}
        {item.selectedSpiceLevel && (
          <div className="flex items-center gap-1 text-[10px] text-gray-500 mt-0.5">
            <Flame className="w-3 h-3 text-orange-500" />
            <span>Spice: {item.selectedSpiceLevel}</span>
          </div>
        )}

        {/* Selected Add-ons */}
        {item.selectedAddons && item.selectedAddons.length > 0 && (
          <p className="text-[10px] text-orange-800 font-medium line-clamp-1 mt-0.5">
            + {item.selectedAddons.map((a) => a.name).join(', ')}
          </p>
        )}

        {/* Price & Quantity Controls */}
        <div className="flex items-center justify-between mt-1.5 pt-1">
          <QuantitySelector
            quantity={item.quantity}
            onDecrease={() => updateQuantity(item.id, -1)}
            onIncrease={() => updateQuantity(item.id, 1)}
            size="sm"
          />

          <button
            type="button"
            onClick={() => removeFromCart(item.id)}
            className="text-[10px] text-red-500 font-bold uppercase hover:text-red-700 transition-colors"
            aria-label="Remove item"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
};
