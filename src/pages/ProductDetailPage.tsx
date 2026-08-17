import React, { useState } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { useCart } from '../context/CartContext';
import { useProducts } from '../context/ProductContext';
import { useLocation } from '../context/LocationContext';
import { isProductAvailableAtOutlet } from '../lib/locationService';
import { ProductGallery } from '../components/ProductGallery';
import { QuantitySelector } from '../components/QuantitySelector';
import { ProductCard } from '../components/ProductCard';
import { ProductVariant, ProductAddon, Review } from '../types';
import { getCulinaryHighlights } from '../utils/culinaryHighlights';
import {
  Star,
  Clock,
  Flame,
  ShoppingBag,
  Zap,
  Check,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Info,
  Heart,
  Share2,
  Utensils,
  Leaf,
  MessageSquare,
  Truck,
  AlertTriangle,
  MapPin,
  Store,
} from 'lucide-react';

interface ProductDetailPageProps {
  slug: string;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({ slug }) => {
  const { goToHome, goToShop, goToCheckout } = useNavigation();
  const { addToCart, setIsCartDrawerOpen, showToast } = useCart();
  const { allProducts, activeProducts } = useProducts();
  const { selectedLocation, setIsLocationModalOpen } = useLocation();

  const product =
    allProducts.find((p) => p.slug === slug) ||
    activeProducts.find((p) => p.slug === slug) ||
    allProducts[0];

  // Selected variant state
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(
    product?.variants && product.variants.length > 0 ? product.variants[0] : undefined
  );

  // Spice level state
  const [selectedSpiceLevel, setSelectedSpiceLevel] = useState<string>(product?.spiceLevel || 'Medium');

  // Selected add-ons state
  const [selectedAddons, setSelectedAddons] = useState<ProductAddon[]>([]);

  // Quantity state
  const [quantity, setQuantity] = useState(1);

  // Active info tab: 'details' | 'ingredients' | 'reheating' | 'reviews'
  const [activeTab, setActiveTab] = useState<'details' | 'ingredients' | 'reheating' | 'reviews'>('details');

  // Customer Reviews state (allows adding new simulator review)
  const [reviews, setReviews] = useState<Review[]>(product?.reviewsList || []);
  const [newReviewerName, setNewReviewerName] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [isAddingReview, setIsAddingReview] = useState(false);

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Product Not Found</h2>
        <p className="text-xs text-gray-500">The requested delicacy might have been updated or removed.</p>
        <button
          type="button"
          onClick={() => goToShop()}
          className="px-4 py-2 bg-orange-600 text-white text-xs font-bold rounded-xl"
        >
          Browse Full Menu
        </button>
      </div>
    );
  }

  const isItemInStock = product.inStock !== false;

  // Calculate pricing
  const basePrice = selectedVariant ? selectedVariant.price : product.price;
  const originalBasePrice = selectedVariant
    ? selectedVariant.originalPrice
    : product.originalPrice;
  const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0);
  const currentUnitPrice = basePrice + addonsTotal;
  const currentTotalPrice = currentUnitPrice * quantity;

  const discountPercent = originalBasePrice
    ? Math.round(((originalBasePrice - basePrice) / originalBasePrice) * 100)
    : 0;

  const toggleAddon = (addon: ProductAddon) => {
    setSelectedAddons((prev) => {
      const exists = prev.some((a) => a.id === addon.id);
      if (exists) {
        return prev.filter((a) => a.id !== addon.id);
      } else {
        return [...prev, addon];
      }
    });
  };

  const isAvailableAtOutlet = selectedLocation?.outletId
    ? isProductAvailableAtOutlet(product, selectedLocation.outletId)
    : true;

  const handleAddToCart = () => {
    if (!selectedLocation) {
      setIsLocationModalOpen(true);
      return;
    }
    if (!isItemInStock || !isAvailableAtOutlet) return;
    const added = addToCart(product, quantity, selectedVariant, selectedSpiceLevel, selectedAddons);
    if (added) {
      setIsCartDrawerOpen(true);
    }
  };

  const handleBuyNow = () => {
    if (!selectedLocation) {
      setIsLocationModalOpen(true);
      return;
    }
    if (!isItemInStock || !isAvailableAtOutlet) return;
    const added = addToCart(product, quantity, selectedVariant, selectedSpiceLevel, selectedAddons);
    if (added) {
      goToCheckout();
    }
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showToast('Link Copied', 'Product link copied to clipboard!', 'info');
    }
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewerName.trim() || !newReviewComment.trim()) return;

    const newRev: Review = {
      id: `rev-${Date.now()}`,
      userName: newReviewerName.trim(),
      userLocation: 'Verified Customer',
      rating: newReviewRating,
      date: 'Just now',
      comment: newReviewComment.trim(),
      verified: true
    };

    setReviews([newRev, ...reviews]);
    setNewReviewerName('');
    setNewReviewComment('');
    setIsAddingReview(false);
    showToast('Review Submitted', 'Thank you for sharing your experience!', 'success');
  };

  // Related Delicacies
  const relatedProducts = activeProducts.filter(
    (p) => p.id !== product.id && (p.category === product.category || p.bestseller)
  ).slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-8">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-1 text-xs text-gray-500 overflow-x-auto whitespace-nowrap pb-1">
        <button
          type="button"
          onClick={goToHome}
          className="hover:text-orange-600 transition-colors"
        >
          Home
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <button
          type="button"
          onClick={() => goToShop()}
          className="hover:text-orange-600 transition-colors"
        >
          Menu
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <button
          type="button"
          onClick={() => goToShop(product.category)}
          className="hover:text-orange-600 transition-colors capitalize"
        >
          {product.category.replace(/-/g, ' ')}
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <span className="text-gray-900 font-semibold truncate max-w-xs">
          {product.name}
        </span>
      </nav>

      {/* Main Product Hero Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Column: Image Gallery (6 cols) */}
        <div className="lg:col-span-6 lg:sticky lg:top-24">
          <ProductGallery
            images={product.galleryImages}
            productName={product.name}
            isVeg={product.isVeg}
            bestseller={product.bestseller}
            chefSpecial={product.chefSpecial}
            spiceLevel={product.spiceLevel}
          />
        </div>

        {/* Right Column: Product Order Form & Details (6 cols) */}
        <div className="lg:col-span-6 space-y-5">
          {/* Header Info */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2">
                {/* Veg / Non-Veg badge */}
                <span
                  className={`inline-flex items-center justify-center w-4.5 h-4.5 bg-white rounded-md shadow-xs border ${
                    product.isVeg ? 'border-emerald-600' : 'border-rose-700'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      product.isVeg ? 'bg-emerald-600' : 'bg-rose-700'
                    }`}
                  />
                </span>

                <span
                  className={`text-xs font-bold uppercase tracking-wider ${
                    product.isVeg ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {product.isVeg ? '100% Pure Vegetarian' : 'Non-Vegetarian'}
                </span>

                {product.isJainFriendly && (
                  <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200">
                    Jain Available
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleShare}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                title="Share product"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>

            <h1 className="font-extrabold text-xl sm:text-2xl text-gray-900 tracking-tight">
              {product.name}
            </h1>
            {product.hindiName && (
              <p className="text-xs font-medium text-gray-400 mt-0.5">{product.hindiName}</p>
            )}

            {/* Rating and quick stats */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs text-gray-500 mt-2.5 pb-3 border-b border-gray-200">
              <div className="flex items-center gap-1 text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-200">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span>{product.rating}</span>
                <span className="text-gray-400 font-normal">
                  ({reviews.length})
                </span>
              </div>

              <div className="flex items-center gap-1 font-medium text-gray-700">
                <Clock className="w-3.5 h-3.5 text-orange-600" />
                <span>Prep: {product.prepTimeMinutes} mins</span>
              </div>

              <div className="flex items-center gap-1 font-medium text-gray-700">
                <Utensils className="w-3.5 h-3.5 text-orange-600" />
                <span>Serves: {selectedVariant ? selectedVariant.serves : product.serves}</span>
              </div>

              {product.calories && (
                <div className="flex items-center gap-1 text-gray-500">
                  <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{product.calories} kcal</span>
                </div>
              )}
            </div>
          </div>

          {/* Outlet & Delivery Status Card */}
          <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-700 shrink-0" />
              <div>
                {selectedLocation ? (
                  <div>
                    <span className="font-semibold text-stone-900">
                      Delivering to PIN {selectedLocation.pinCode}
                    </span>
                    <span className="text-stone-500 block text-[11px]">
                      Prepared at: {selectedLocation.outletName}
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="font-semibold text-stone-900">
                      Check Delivery to Your Area
                    </span>
                    <span className="text-stone-500 block text-[11px]">
                      Enter PIN code to verify kitchen outlet routing
                    </span>
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsLocationModalOpen(true)}
              className="px-2.5 py-1 bg-white hover:bg-amber-50 border border-stone-300 rounded-lg text-amber-800 font-bold text-xs shadow-2xs transition-colors shrink-0"
            >
              {selectedLocation ? 'Change PIN' : 'Select PIN'}
            </button>
          </div>

          {!isAvailableAtOutlet && selectedLocation && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold text-amber-950">Not Available at Selected Outlet</strong>
                <span>
                  This delicacy is exclusive to specific kitchens and is currently not prepared at{' '}
                  <strong>{selectedLocation.outletName}</strong>.
                </span>
              </div>
            </div>
          )}

          {/* Pricing Box */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 flex items-baseline justify-between">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-extrabold text-2xl text-gray-900">
                  ₹{currentUnitPrice}
                </span>
                {originalBasePrice && (
                  <span className="text-xs text-gray-400 line-through">
                    ₹{originalBasePrice}
                  </span>
                )}
                {discountPercent > 0 && (
                  <span className="px-1.5 py-0.5 bg-rose-600 text-white font-bold text-[10px] rounded">
                    {discountPercent}% OFF
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Taxes included • Sealed oven-fresh thermal packaging
              </p>
            </div>

            <div className="text-right">
              {isItemInStock ? (
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 inline-block">
                  In Stock
                </span>
              ) : (
                <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 inline-block">
                  Out of Stock
                </span>
              )}
            </div>
          </div>

          {/* Short description */}
          <p className="text-xs text-gray-600 leading-relaxed">
            {product.description}
          </p>

          {/* 1. Portion / Variant Selector */}
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                Select Portion Size
              </label>
              <div className="grid grid-cols-2 gap-2">
                {product.variants.map((v) => {
                  const isSelected = selectedVariant?.id === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariant(v)}
                      className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-orange-600 bg-orange-50/60 ring-1 ring-orange-600/30'
                          : 'border-gray-200 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-xs text-gray-900">{v.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-orange-600 shrink-0" />}
                      </div>
                      <div className="flex justify-between items-center mt-1.5 text-xs">
                        <span className="font-extrabold text-orange-900">₹{v.price}</span>
                        <span className="text-[10px] text-gray-500">{v.weight}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Spice Level Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
              Customize Spice Intensity
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {(['Mild', 'Medium', 'Spicy', 'Extra Spicy'] as const).map((spice) => {
                const isSelected = selectedSpiceLevel === spice;
                return (
                  <button
                    key={spice}
                    type="button"
                    onClick={() => setSelectedSpiceLevel(spice)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all text-center flex flex-col items-center gap-0.5 ${
                      isSelected
                        ? 'border-gray-900 bg-gray-900 text-white shadow-xs'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Flame
                      className={`w-3.5 h-3.5 ${
                        spice === 'Extra Spicy'
                          ? 'text-rose-400'
                          : spice === 'Spicy'
                          ? 'text-orange-400'
                          : 'text-amber-400'
                      }`}
                    />
                    <span className="truncate text-[11px]">{spice}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Add-on Accompaniments */}
          {product.addons && product.addons.length > 0 && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                Recommended Accompaniments
              </label>
              <div className="space-y-1.5">
                {product.addons.map((addon) => {
                  const isChecked = selectedAddons.some((a) => a.id === addon.id);
                  return (
                    <div
                      key={addon.id}
                      onClick={() => toggleAddon(addon)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-orange-50/70 border-orange-400'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-3.5 h-3.5 accent-orange-600 rounded cursor-pointer"
                        />
                        <span className="text-xs font-medium text-gray-800">{addon.name}</span>
                      </div>
                      <span className="text-xs font-bold text-orange-900">+₹{addon.price}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity & CTA Buttons */}
          <div className="pt-3 border-t border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Quantity
              </span>
              <QuantitySelector
                quantity={quantity}
                onDecrease={() => setQuantity((q) => Math.max(1, q - 1))}
                onIncrease={() => setQuantity((q) => q + 1)}
                size="md"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                id="product-add-to-cart-btn"
                onClick={handleAddToCart}
                disabled={!isItemInStock || (!isAvailableAtOutlet && !!selectedLocation)}
                className={`py-2.5 px-5 text-white rounded-xl font-bold text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-1.5 ${
                  isItemInStock && (isAvailableAtOutlet || !selectedLocation)
                    ? 'bg-amber-800 hover:bg-amber-900 active:bg-stone-950 cursor-pointer'
                    : 'bg-stone-300 text-stone-500 cursor-not-allowed opacity-75'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>
                  {!isItemInStock
                    ? 'Currently Out of Stock'
                    : !isAvailableAtOutlet && selectedLocation
                    ? 'Unavailable at Outlet'
                    : `Add to Cart (₹${currentTotalPrice})`}
                </span>
              </button>

              <button
                type="button"
                onClick={handleBuyNow}
                disabled={!isItemInStock || (!isAvailableAtOutlet && !!selectedLocation)}
                className={`py-2.5 px-5 text-white rounded-xl font-bold text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-1.5 ${
                  isItemInStock && (isAvailableAtOutlet || !selectedLocation)
                    ? 'bg-stone-900 hover:bg-black active:bg-stone-950 cursor-pointer'
                    : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                }`}
              >
                <Zap
                  className={`w-4 h-4 ${
                    isItemInStock && (isAvailableAtOutlet || !selectedLocation)
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-stone-400'
                  }`}
                />
                <span>
                  {!isItemInStock
                    ? 'Out of Stock'
                    : !isAvailableAtOutlet && selectedLocation
                    ? 'Unavailable'
                    : 'Express Buy Now'}
                </span>
              </button>
            </div>

            {/* Micro delivery promise */}
            <div className="bg-gray-50 rounded-xl p-2.5 border border-gray-200 flex items-center justify-between text-xs text-gray-600">
              <div className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-orange-600" />
                <span>Insulated Handi Delivery in <strong>30-40 mins</strong></span>
              </div>
              <span className="text-emerald-700 font-semibold text-[11px]">Hot & Fresh</span>
            </div>
          </div>
        </div>
      </div>

      {/* Product Details Tabs (Culinary Story, Ingredients, Reheating, Reviews) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs space-y-4">
        {/* Tabs Bar */}
        <div className="flex gap-1.5 border-b border-gray-200 overflow-x-auto scrollbar-none pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'details'
                ? 'bg-orange-50 text-orange-900 border border-orange-200'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Culinary Story & Method
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ingredients')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'ingredients'
                ? 'bg-orange-50 text-orange-900 border border-orange-200'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Ingredients & Allergens
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reheating')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'reheating'
                ? 'bg-orange-50 text-orange-900 border border-orange-200'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Packaging & Serving Tips
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reviews')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'reviews'
                ? 'bg-orange-50 text-orange-900 border border-orange-200'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Reviews ({reviews.length})
          </button>
        </div>

        {/* Tab 1: Details (Dynamic Category Culinary Highlights & Custom Story) */}
        {activeTab === 'details' && (() => {
          const culinary = getCulinaryHighlights(product);
          return (
            <div className="space-y-4 max-w-3xl text-xs text-gray-600 leading-relaxed">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-orange-600 shrink-0" />
                  <h3 className="font-bold text-sm text-gray-900">
                    {culinary.heading}
                  </h3>
                </div>
                <p className="text-gray-700 leading-relaxed text-xs">
                  {culinary.story}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 bg-orange-50/60 rounded-xl border border-orange-200/80">
                  <h4 className="font-bold text-xs text-orange-950 mb-1 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                    <span>{culinary.highlight1.title}</span>
                  </h4>
                  <p className="text-[11px] text-gray-600 leading-normal">
                    {culinary.highlight1.description}
                  </p>
                </div>
                <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/80">
                  <h4 className="font-bold text-xs text-amber-950 mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>{culinary.highlight2.title}</span>
                  </h4>
                  <p className="text-[11px] text-gray-600 leading-normal">
                    {culinary.highlight2.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Tab 2: Ingredients */}
        {activeTab === 'ingredients' && (
          <div className="space-y-3 max-w-3xl">
            <div>
              <h4 className="font-bold text-xs text-gray-800 uppercase tracking-wider mb-1.5">
                Fresh Ingredients Used
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {product.ingredients.map((ing, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 bg-gray-100 text-gray-800 rounded-md text-xs font-medium border border-gray-200"
                  >
                    {ing}
                  </span>
                ))}
              </div>
            </div>

            {product.allergens && product.allergens.length > 0 && (
              <div className="pt-1">
                <h4 className="font-bold text-xs text-gray-800 uppercase tracking-wider mb-1.5">
                  Allergen Advisory
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {product.allergens.map((all, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-rose-50 text-rose-800 rounded-md text-xs font-semibold border border-rose-200"
                    >
                      ⚠️ Contains {all}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Reheating */}
        {activeTab === 'reheating' && (
          <div className="space-y-2.5 max-w-3xl text-xs text-gray-600 leading-relaxed">
            <h4 className="font-bold text-xs text-gray-900 uppercase tracking-wider">
              Optimal Reheating Instructions
            </h4>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                <strong>Microwave:</strong> Remove the lid and microwave on medium heat for 90–120 seconds.
              </li>
              <li>
                <strong>Gas Stove / Tawa (Recommended for Biryani):</strong> Place the closed handi on a hot flat tawa over low flame for 5–7 minutes for perfect steam redistribution.
              </li>
              <li>
                <strong>Breads:</strong> Sprinkle a few drops of water on naan/parathas and warm on a medium-hot pan for 30 seconds per side.
              </li>
            </ul>
          </div>
        )}

        {/* Tab 4: Reviews */}
        {activeTab === 'reviews' && (
          <div className="space-y-4 max-w-3xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-gray-900">
                  Customer Experiences
                </h3>
                <p className="text-xs text-gray-500">
                  {reviews.length} verified ratings • {product.rating} out of 5 stars
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingReview(!isAddingReview)}
                className="px-3 py-1.5 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-xl transition-colors"
              >
                {isAddingReview ? 'Cancel' : 'Write a Review'}
              </button>
            </div>

            {/* Write review form simulator */}
            {isAddingReview && (
              <form
                onSubmit={handleSubmitReview}
                className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-2.5"
              >
                <h4 className="font-bold text-xs text-gray-900">Share Your Food Experience</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Your Name"
                    value={newReviewerName}
                    onChange={(e) => setNewReviewerName(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-orange-500"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 font-medium">Rating:</span>
                    <select
                      value={newReviewRating}
                      onChange={(e) => setNewReviewRating(Number(e.target.value))}
                      className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-orange-500"
                    >
                      <option value={5}>⭐⭐⭐⭐⭐ (5 - Outstanding)</option>
                      <option value={4}>⭐⭐⭐⭐ (4 - Great)</option>
                      <option value={3}>⭐⭐⭐ (3 - Good)</option>
                    </select>
                  </div>
                </div>
                <textarea
                  required
                  rows={2}
                  placeholder="How was the aroma, spice level, and tenderness?"
                  value={newReviewComment}
                  onChange={(e) => setNewReviewComment(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-orange-500 resize-none"
                />
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  Submit Review
                </button>
              </form>
            )}

            {/* Reviews List */}
            <div className="divide-y divide-gray-100 space-y-3">
              {reviews.map((rev) => (
                <div key={rev.id} className="pt-3 first:pt-0 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-gray-900">{rev.userName}</span>
                      <span className="text-[10px] text-gray-400">({rev.userLocation})</span>
                      {rev.verified && (
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded font-semibold border border-emerald-200">
                          Verified
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400">{rev.date}</span>
                  </div>

                  <div className="flex text-amber-400 gap-0.5">
                    {[...Array(rev.rating)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-amber-400" />
                    ))}
                  </div>

                  <p className="text-xs text-gray-600 leading-relaxed">{rev.comment}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Frequently Ordered Together / Related Delicacies */}
      {relatedProducts.length > 0 && (
        <section className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1 text-orange-600 font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Pair It Well</span>
              </div>
              <h2 className="font-extrabold text-lg sm:text-xl text-gray-900">
                Frequently Ordered Together
              </h2>
            </div>
            <button
              type="button"
              onClick={() => goToShop()}
              className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
            >
              <span>See Full Menu</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
