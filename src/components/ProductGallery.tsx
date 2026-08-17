import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Flame, ZoomIn } from 'lucide-react';

interface ProductGalleryProps {
  images: string[];
  productName: string;
  isVeg: boolean;
  bestseller?: boolean;
  chefSpecial?: boolean;
  spiceLevel: string;
}

export const ProductGallery: React.FC<ProductGalleryProps> = ({
  images,
  productName,
  isVeg,
  bestseller,
  chefSpecial,
  spiceLevel
}) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  const displayImages = images.length > 0 ? images : ['https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?q=80&w=800&auto=format&fit=crop'];
  const activeImage = displayImages[activeImageIndex] || displayImages[0];

  return (
    <div className="space-y-3.5">
      {/* Main Image Container */}
      <div
        className="relative aspect-4/3 sm:aspect-16/11 w-full rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 shadow-xs cursor-zoom-in group"
        onClick={() => setIsZoomed(!isZoomed)}
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={activeImage}
            src={activeImage}
            alt={`${productName} photo ${activeImageIndex + 1}`}
            initial={{ opacity: 0.4 }}
            animate={{ opacity: 1, scale: isZoomed ? 1.25 : 1 }}
            exit={{ opacity: 0.4 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full object-cover transition-transform duration-300"
            referrerPolicy="no-referrer"
          />
        </AnimatePresence>

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 pointer-events-none">
          {/* Veg / Non-Veg badge */}
          <span
            className={`inline-flex items-center justify-center w-5 h-5 bg-white/95 rounded-md shadow-xs border ${
              isVeg ? 'border-emerald-600' : 'border-rose-700'
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isVeg ? 'bg-emerald-600' : 'bg-rose-700'
              }`}
            />
          </span>

          {bestseller && (
            <span className="px-2 py-0.5 bg-orange-600 text-white font-bold text-[10px] uppercase tracking-wider rounded-md shadow-xs flex items-center gap-1">
              <Sparkles className="w-3 h-3 fill-white" />
              Bestseller
            </span>
          )}

          {chefSpecial && !bestseller && (
            <span className="px-2 py-0.5 bg-gray-900 text-orange-300 font-bold text-[10px] uppercase tracking-wider rounded-md shadow-xs">
              Chef Signature
            </span>
          )}
        </div>

        {/* Zoom Hint */}
        <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 bg-black/70 backdrop-blur-md rounded-md text-white text-[10px] font-medium flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
          <ZoomIn className="w-3 h-3" />
          <span>{isZoomed ? 'Click to reset' : 'Click to zoom'}</span>
        </div>
      </div>

      {/* Thumbnails strip */}
      {displayImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {displayImages.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setActiveImageIndex(idx);
                setIsZoomed(false);
              }}
              className={`relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                activeImageIndex === idx
                  ? 'border-orange-600 ring-2 ring-orange-600/30'
                  : 'border-gray-200 hover:border-orange-300 opacity-75 hover:opacity-100'
              }`}
            >
              <img
                src={img}
                alt={`${productName} thumbnail ${idx + 1}`}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
