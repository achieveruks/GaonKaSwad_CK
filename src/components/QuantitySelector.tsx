import React from 'react';
import { Minus, Plus } from 'lucide-react';

interface QuantitySelectorProps {
  quantity: number;
  onDecrease: () => void;
  onIncrease: () => void;
  size?: 'sm' | 'md' | 'lg';
  min?: number;
  max?: number;
}

export const QuantitySelector: React.FC<QuantitySelectorProps> = ({
  quantity,
  onDecrease,
  onIncrease,
  size = 'md',
  min = 1,
  max = 99
}) => {
  const sizeClasses = {
    sm: 'h-7 px-1.5 text-xs gap-1',
    md: 'h-8 px-2.5 text-xs gap-2',
    lg: 'h-10 px-3.5 text-sm gap-2.5'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4'
  };

  return (
    <div
      className={`inline-flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg font-medium text-gray-800 select-none ${sizeClasses[size]}`}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (quantity > min) onDecrease();
        }}
        disabled={quantity <= min}
        className={`text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-95`}
        aria-label="Decrease quantity"
      >
        <Minus className={iconSizes[size]} />
      </button>

      <span className="font-bold px-1 text-center min-w-[18px]">{quantity}</span>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (quantity < max) onIncrease();
        }}
        disabled={quantity >= max}
        className={`text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-95`}
        aria-label="Increase quantity"
      >
        <Plus className={iconSizes[size]} />
      </button>
    </div>
  );
};
