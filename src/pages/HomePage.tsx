import React, { useState, useEffect, useMemo } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { useCart } from '../context/CartContext';
import { useProducts } from '../context/ProductContext';
import { useLocation } from '../context/LocationContext';
import { ProductCard } from '../components/ProductCard';
import { CategoryCard } from '../components/CategoryCard';
import {
  isProductServedAtOutlet,
  isProductInStockAtOutlet,
  isProductFeaturedAtOutlet,
  isProductBestsellerAtOutlet,
  isProductChefSpecialAtOutlet,
  getProductPortionsLeftAtOutlet,
} from '../lib/locationService';
import {
  fetchOutletBestsellerSales,
  OutletProductSale,
  fetchAvailableCouponsForCustomer,
  fetchFeaturedReviews,
  FeaturedReview,
} from '../lib/supabaseService';
import { getAboutByOutletId } from '../lib/aboutService';
import { OutletAbout, Coupon } from '../types';
import {
  Flame,
  ChefHat,
  ArrowRight,
  Sparkles,
  Star,
  Clock,
  ShieldCheck,
  Truck,
  Heart,
  ChevronRight,
  ChevronLeft,
  Tag,
  CheckCircle2,
  Soup,
  Quote
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const HomePage: React.FC = () => {
  const { goToShop, goToProduct, goToCategories, goToAbout } = useNavigation();
  const { addToCart } = useCart();
  const { activeProducts, outletProducts, bestsellerProducts, chefSignatures, categories } = useProducts();
  const { currentZone, currentOutlet, selectedLocation, outlets } = useLocation();

  const deliveryTime =
    currentZone?.estimatedDeliveryTime ||
    currentOutlet?.estimatedDeliveryTime ||
    currentOutlet?.avgCookingTime ||
    '30–40 Mins';

  // Dynamic hero texts from selected outlet with sensible defaults
  const heroFireLine = (
    currentOutlet?.heroFireLine || 'ARTISANAL CLOUD KITCHEN • SLOW-COOKED DUM'
  ).toUpperCase();

  const heroHeader =
    currentOutlet?.heroHeader || 'Authentic Indian Flavors, Slow-Cooked to Perfection';

  // Split heroHeader by comma to display the second part in accent orange
  const headerParts = useMemo(() => {
    if (!heroHeader.includes(',')) {
      return { part1: heroHeader, part2: '' };
    }
    const commaIndex = heroHeader.indexOf(',');
    return {
      part1: heroHeader.slice(0, commaIndex + 1),
      part2: heroHeader.slice(commaIndex + 1).trim(),
    };
  }, [heroHeader]);

  const heroDescription =
    currentOutlet?.heroDescription ||
    'Experience royal dum biryanis, 24-hour slow-simmered dal makhani, and smoky clay-oven tandoori grills, delivered piping hot to your doorstep in sealed eco-handis.';

  const trustBadgeRating = currentOutlet?.trustBadgeRating || '4.9 ★ (2.8k+)';
  const trustBadgeRatingSub = currentOutlet?.trustBadgeRatingSub || 'Google & Zomato';
  const trustBadgeUsp = currentOutlet?.trustBadgeUsp || '100% Pure';
  const trustBadgeUspSub = currentOutlet?.trustBadgeUspSub || 'Desi Ghee Recipe';

  // Outlet-scoped products for the carousel
  const outletId = selectedLocation?.outletId || currentOutlet?.id;

  // Live 30-day historical sales volume data for this specific outlet
  const [outletSalesMap, setOutletSalesMap] = useState<Record<string, OutletProductSale>>({});

  // Outlet About information (story_title, story_description, etc.)
  const [outletAbout, setOutletAbout] = useState<OutletAbout | null>(null);

  // Available coupon code for this outlet
  const [availableCoupon, setAvailableCoupon] = useState<Coupon | null>(null);

  // Database-driven verified customer reviews from product_reviews table
  const [featuredReviews, setFeaturedReviews] = useState<FeaturedReview[]>([]);
  const [reviewsStats, setReviewsStats] = useState<{ averageRating: number; totalCount: number }>({
    averageRating: 4.8,
    totalCount: 0,
  });
  const [isReviewsLoading, setIsReviewsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    if (!outletId) {
      setOutletSalesMap({});
      setOutletAbout(null);
      setAvailableCoupon(null);
      setFeaturedReviews([]);
      setIsReviewsLoading(false);
      return;
    }

    // 1. 30-day sales ranking
    fetchOutletBestsellerSales(outletId, 30)
      .then((map) => {
        if (isMounted) {
          setOutletSalesMap(map);
        }
      })
      .catch((err) => {
        console.warn('Failed to load outlet sales ranking:', err);
      });

    // 2. Fetch About content for this outlet from database
    getAboutByOutletId(outletId)
      .then((about) => {
        if (isMounted) {
          setOutletAbout(about);
        }
      })
      .catch((err) => {
        console.warn('Failed to load outlet about data:', err);
      });

    // 3. Fetch available coupons for this outlet
    fetchAvailableCouponsForCustomer(null, null, undefined, outletId)
      .then((coupons) => {
        if (!isMounted) return;
        if (coupons && coupons.length > 0) {
          // Rank coupons: percentage first, then higher discount value
          const sorted = coupons.slice().sort((a, b) => {
            if (a.discountType === 'percentage' && b.discountType !== 'percentage') return -1;
            if (b.discountType === 'percentage' && a.discountType !== 'percentage') return 1;
            return (b.discountValue || 0) - (a.discountValue || 0);
          });
          setAvailableCoupon(sorted[0]);
        } else {
          setAvailableCoupon(null);
        }
      })
      .catch((err) => {
        console.warn('Failed to fetch available coupons for outlet:', err);
      });

    // 4. Fetch verified customer reviews from Supabase product_reviews table
    setIsReviewsLoading(true);
    fetchFeaturedReviews(outletId, 3)
      .then((res) => {
        if (!isMounted) return;
        setFeaturedReviews(res.reviews || []);
        setReviewsStats(res.stats || { averageRating: 4.8, totalCount: 0 });
        setIsReviewsLoading(false);
      })
      .catch((err) => {
        console.warn('Failed to load featured reviews from database:', err);
        if (isMounted) setIsReviewsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [outletId]);

  const outletAvailableProducts = useMemo(() => {
    return activeProducts.filter((p) => {
      if (!outletId) return p.inStock !== false;
      return isProductServedAtOutlet(p, outletId) && isProductInStockAtOutlet(p, outletId);
    });
  }, [activeProducts, outletId]);

  // Composition rules for Hero Carousel:
  // Primary Selection: Up to 3 bestsellers (sorted by 30-day sales) + up to 2 featured (Max 5)
  // If carousel count < 3, pad with other in-stock items available at this outlet
  const carouselItems = useMemo(() => {
    const bestsellers = outletAvailableProducts
      .filter((p) => (outletId ? isProductBestsellerAtOutlet(p, outletId) : !!p.bestseller) || (outletSalesMap[String(p.id)]?.totalSold || 0) > 0)
      .sort((a, b) => (outletSalesMap[String(b.id)]?.totalSold || 0) - (outletSalesMap[String(a.id)]?.totalSold || 0));

    const featured = outletAvailableProducts.filter((p) => {
      const isBs = outletId ? isProductBestsellerAtOutlet(p, outletId) : !!p.bestseller;
      const isFt = outletId ? isProductFeaturedAtOutlet(p, outletId) : !!p.featured;
      const hasSales = (outletSalesMap[String(p.id)]?.totalSold || 0) > 0;
      return isFt && !isBs && !hasSales;
    });

    const chosenBestsellers = bestsellers.slice(0, 3);
    const chosenFeatured = featured.slice(0, 2);
    let items = [...chosenBestsellers, ...chosenFeatured];

    // If carousel count < 3, pad with other available in-stock items strictly from this outlet
    if (items.length < 3) {
      const existingIds = new Set(items.map((i) => i.id));
      for (const p of outletAvailableProducts) {
        if (!existingIds.has(p.id)) {
          items.push(p);
          existingIds.add(p.id);
          if (items.length >= 3) break;
        }
      }
    }

    return items;
  }, [outletAvailableProducts, outletId, outletSalesMap]);

  // Carousel state and rotation
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    setCurrentSlide(0);
  }, [carouselItems.length, outletId]);

  useEffect(() => {
    if (carouselItems.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselItems.length);
    }, 4500);

    return () => clearInterval(timer);
  }, [carouselItems.length, isPaused]);

  const activeItem = carouselItems[currentSlide] || carouselItems[0];

  // Dynamically rank dishes based on actual historical sales volume for this outlet only (last 30 days)
  const bestsellers = useMemo(() => {
    // Only consider products that are active, served, and in-stock at this specific outlet
    const candidates = outletAvailableProducts.slice();

    // Sort by:
    // 1. Total quantity ordered at this outlet in the last 30 days (highest first)
    // 2. Total order frequency at this outlet in the last 30 days (highest first)
    // 3. Fallback for un-ordered items: outlet-curated bestseller flag or featured flag
    candidates.sort((a, b) => {
      const soldA = outletSalesMap[String(a.id)]?.totalSold || 0;
      const soldB = outletSalesMap[String(b.id)]?.totalSold || 0;

      if (soldA !== soldB) {
        return soldB - soldA; // higher sales volume first
      }

      const countA = outletSalesMap[String(a.id)]?.orderCount || 0;
      const countB = outletSalesMap[String(b.id)]?.orderCount || 0;
      if (countA !== countB) {
        return countB - countA;
      }

      // Tie breaker / fallback: check outlet bestseller override
      const bsA = outletId ? isProductBestsellerAtOutlet(a, outletId) : !!a.bestseller;
      const bsB = outletId ? isProductBestsellerAtOutlet(b, outletId) : !!b.bestseller;
      if (bsA !== bsB) {
        return bsA ? -1 : 1;
      }

      return 0;
    });

    return candidates.slice(0, 4);
  }, [outletAvailableProducts, outletSalesMap, outletId]);

  const chefSpecialItems = chefSignatures.slice(0, 4);

  // Dynamic Heirloom Special banner values from abouts table
  const bannerHeading = outletAbout?.storyTitle || 'Champaran Ahuna & Nizami Dum Handis';

  const bannerDescription = useMemo(() => {
    if (!outletAbout?.storyDescription) {
      return 'Sealed with whole wheat dough and cooked over slow charcoal embers. No artificial enhancers — only cold-pressed mustard oil, whole garlic bulbs, and raw spices.';
    }
    // Take the first concise paragraph for the banner layout
    const firstPara = outletAbout.storyDescription
      .split(/\r?\n\r?\n/)[0]
      .replace(/\r?\n/g, ' ')
      .trim();
    return firstPara || outletAbout.storyDescription;
  }, [outletAbout]);

  // Determine the #1 bestselling category at this outlet based on 30-day historical order sales
  const topBestsellerCategory = useMemo(() => {
    if (!categories || categories.length === 0) return null;

    // Aggregate 30-day sales per category
    const salesByCat: Record<string, number> = {};
    for (const product of outletAvailableProducts) {
      const sold = outletSalesMap[String(product.id)]?.totalSold || 0;
      const cat = product.category;
      if (cat) {
        salesByCat[cat] = (salesByCat[cat] || 0) + sold;
      }
    }

    // Find the category with maximum volume
    let highestCat = null;
    let maxVolume = 0;
    for (const cat of categories) {
      const count = (salesByCat[cat.id] || 0) + (salesByCat[cat.slug] || 0);
      if (count > maxVolume) {
        maxVolume = count;
        highestCat = cat;
      }
    }

    // Fallback 1: Category of the #1 bestseller dish at this outlet
    if (!highestCat && bestsellers.length > 0) {
      const firstBsCat = categories.find(
        (c) => c.id === bestsellers[0].category || c.slug === bestsellers[0].category
      );
      if (firstBsCat) return firstBsCat;
    }

    // Fallback 2: Dum Biryanis or the first category
    return (
      highestCat ||
      categories.find((c) => c.slug === 'dum-biryanis' || c.id === 'biryani') ||
      categories[0]
    );
  }, [categories, outletAvailableProducts, outletSalesMap, bestsellers]);

  // Lookups for reviews mapping (dish thumbnail, dish name, outlet name)
  const productLookup = useMemo(() => {
    const map = new Map<string, any>();
    for (const p of activeProducts) {
      map.set(String(p.id), p);
    }
    return map;
  }, [activeProducts]);

  const outletLookup = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of (outlets || [])) {
      map.set(o.id, o.name);
    }
    return map;
  }, [outlets]);

  const formatReviewDate = (dateStr?: string) => {
    if (!dateStr) return 'Recent';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'Recent';
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return 'Recent';
    }
  };

  return (
    <div className="space-y-12 sm:space-y-16 pb-16">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-white border-b border-gray-200 pt-6 sm:pt-10 pb-10 sm:pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Content (7 cols) */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="lg:col-span-7 space-y-5 text-center lg:text-left"
            >
              {/* Pill badge */}
              <div className="inline-flex max-w-full items-center gap-1.5 bg-orange-50 text-orange-800 border border-orange-200 px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold tracking-wide shadow-xs mx-auto lg:mx-0">
                <Flame className="w-3.5 h-3.5 text-orange-600 fill-orange-600 shrink-0" />
                <span className="truncate">{heroFireLine}</span>
              </div>

              {/* Main Headline */}
              <h1 className="font-extrabold text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-gray-900 tracking-tight leading-tight break-words">
                {headerParts.part1}{' '}
                {headerParts.part2 && (
                  <span className="text-orange-600">
                    {headerParts.part2}
                  </span>
                )}
              </h1>

              {/* Subtitle */}
              <p className="text-xs sm:text-sm text-gray-600 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                {heroDescription}
              </p>

              {/* Dual CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-1">
                <button
                  type="button"
                  id="hero-shop-now-btn"
                  onClick={() => goToShop()}
                  className="w-full sm:w-auto px-6 py-2.5 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
                >
                  <span>Order Now</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={goToCategories}
                  className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-gray-50 border border-gray-300 text-gray-800 font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
                >
                  <span>Explore Menu</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {/* Trust Badges Bar */}
              <div className="pt-4 border-t border-gray-100 grid grid-cols-3 gap-2 sm:gap-4 max-w-md mx-auto lg:mx-0 text-gray-700">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
                  <div className="text-left min-w-0">
                    <p className="font-bold text-[11px] sm:text-xs text-gray-900 truncate">{trustBadgeRating}</p>
                    <p className="text-[9px] sm:text-[10px] text-gray-400 truncate">{trustBadgeRatingSub}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <Clock className="w-4 h-4 text-orange-600 shrink-0" />
                  <div className="text-left min-w-0">
                    <p className="font-bold text-[11px] sm:text-xs text-gray-900 truncate">{deliveryTime}</p>
                    <p className="text-[9px] sm:text-[10px] text-gray-400 truncate">Express Delivery</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="text-left min-w-0">
                    <p className="font-bold text-[11px] sm:text-xs text-gray-900 truncate">{trustBadgeUsp}</p>
                    <p className="text-[9px] sm:text-[10px] text-gray-400 truncate">{trustBadgeUspSub}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right Visual (5 cols) - Interactive Carousel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="lg:col-span-5 relative"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              {activeItem ? (
                <div className="relative mx-auto max-w-md lg:max-w-none aspect-4/3 sm:aspect-square rounded-2xl overflow-hidden shadow-lg border border-gray-200 bg-gray-900 select-none">
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={`${activeItem.id}-${currentSlide}`}
                      src={activeItem.image || activeItem.imageUrl || activeItem.galleryImages?.[0] || 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?q=80&w=1000&auto=format&fit=crop'}
                      alt={activeItem.name}
                      initial={{
                        opacity: 0,
                        scale: currentSlide % 2 === 0 ? 1.0 : 1.15,
                      }}
                      animate={{
                        opacity: 1,
                        scale: currentSlide % 2 === 0 ? 1.15 : 1.0,
                      }}
                      exit={{ opacity: 0 }}
                      transition={{
                        opacity: { duration: 0.5, ease: 'easeInOut' },
                        scale: { duration: 4.5, ease: 'linear' },
                      }}
                      className="w-full h-full object-cover will-change-transform"
                      referrerPolicy="no-referrer"
                    />
                  </AnimatePresence>

                  <div className="absolute inset-0 bg-gradient-to-t from-gray-950/85 via-black/20 to-black/40" />

                  {/* Top Left Carousel Pagination Dots */}
                  {carouselItems.length > 1 && (
                    <div className="absolute top-3 sm:top-3.5 left-3 sm:left-3.5 flex items-center gap-1.5 z-20 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 shadow-sm">
                      {carouselItems.map((item, idx) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentSlide(idx);
                          }}
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            idx === currentSlide
                              ? 'w-5 bg-orange-500'
                              : 'w-1.5 bg-white/50 hover:bg-white/90'
                          }`}
                          title={`Slide ${idx + 1}: ${item.name}`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Top Right Badges: Bestseller / Featured / Chef's Special (All applicable icons, smaller responsive size) & Veg Indicator */}
                  <div className="absolute top-3 sm:top-3.5 right-3 sm:right-3.5 flex items-center gap-1.5 z-20">
                    {/* Bestseller Icon Badge */}
                    {(outletId ? isProductBestsellerAtOutlet(activeItem, outletId) : activeItem.bestseller) && (
                      <div
                        className="w-6 h-6 sm:w-6.5 sm:h-6.5 lg:w-8 lg:h-8 rounded-md lg:rounded-lg bg-orange-600 flex items-center justify-center shadow-md shrink-0"
                        title="Bestseller"
                        aria-label="Bestseller"
                      >
                        <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 text-white fill-white" />
                      </div>
                    )}

                    {/* Featured Dish Icon Badge */}
                    {(outletId ? isProductFeaturedAtOutlet(activeItem, outletId) : activeItem.featured) && (
                      <div
                        className="w-6 h-6 sm:w-6.5 sm:h-6.5 lg:w-8 lg:h-8 rounded-md lg:rounded-lg bg-amber-500 flex items-center justify-center shadow-md shrink-0"
                        title="Featured Dish"
                        aria-label="Featured Dish"
                      >
                        <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 text-stone-950 fill-stone-950" />
                      </div>
                    )}

                    {/* Chef's Special Icon Badge */}
                    {(outletId ? isProductChefSpecialAtOutlet(activeItem, outletId) : isProductChefSpecialAtOutlet(activeItem)) && (
                      <div
                        className="w-6 h-6 sm:w-6.5 sm:h-6.5 lg:w-8 lg:h-8 rounded-md lg:rounded-lg bg-purple-600 flex items-center justify-center shadow-md shrink-0"
                        title="Chef's Special"
                        aria-label="Chef's Special"
                      >
                        <ChefHat className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 text-white" />
                      </div>
                    )}

                    {/* Veg / Non-Veg icon */}
                    <div
                      className={`w-6 h-6 sm:w-6.5 sm:h-6.5 lg:w-8 lg:h-8 rounded-md lg:rounded-lg bg-white border ${
                        activeItem.isVeg ? 'border-emerald-600' : 'border-rose-600'
                      } flex items-center justify-center shadow-md shrink-0`}
                      title={activeItem.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                      aria-label={activeItem.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                    >
                      <span
                        className={`w-2 h-2 sm:w-2.5 sm:h-2.5 lg:w-3 lg:h-3 rounded-full ${
                          activeItem.isVeg ? 'bg-emerald-600' : 'bg-rose-600'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Floating Bottom Card - Only this section is clickable */}
                  {(() => {
                    const activePortions = getProductPortionsLeftAtOutlet(activeItem, outletId);
                    return (
                      <div
                        onClick={() => goToProduct(activeItem.slug)}
                        className="absolute bottom-3 left-3 right-3 bg-stone-900/90 hover:bg-stone-900/95 active:bg-stone-950 backdrop-blur-md rounded-xl p-3 border border-stone-700/60 hover:border-orange-500/50 text-white flex items-center justify-between shadow-md z-20 cursor-pointer transition-all group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <div className="w-9 h-9 rounded-lg bg-orange-500/20 border border-orange-500/40 text-orange-400 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
                            <Flame className="w-4 h-4 fill-orange-400" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-[10px] font-semibold text-orange-400 uppercase tracking-wide">
                                Today&apos;s Special
                              </p>
                              {activePortions !== null && activePortions !== undefined && (
                                activePortions === 0 ? (
                                  <span className="text-[9px] font-bold bg-stone-800 text-stone-300 px-1.5 py-0.2 rounded border border-stone-600">
                                    Sold Out Today
                                  </span>
                                ) : activePortions <= 5 ? (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-amber-500/25 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded animate-pulse">
                                    <Flame className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                                    <span>Only {activePortions} left!</span>
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-medium text-stone-300 bg-stone-800/80 px-1.5 py-0.2 rounded">
                                    {activePortions} portions left
                                  </span>
                                )
                              )}
                            </div>
                            <h4 className="font-bold text-xs text-white truncate max-w-[150px] sm:max-w-[200px] group-hover:text-orange-200 transition-colors">
                              {activeItem.name}
                            </h4>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-sm font-bold text-white block">₹{activeItem.price}</span>
                          <span className="block text-[10px] font-semibold text-orange-400 group-hover:text-orange-300 transition-colors">
                            View Dish →
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : null}
            </motion.div>
          </div>
        </div>
      </section>

      {/* 2. FEATURED CATEGORIES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-1.5 text-orange-600 font-bold text-xs uppercase tracking-wider mb-0.5">
              <Soup className="w-3.5 h-3.5" />
              <span>Curated Menu</span>
            </div>
            <h2 className="font-extrabold text-xl sm:text-2xl text-gray-900">
              Browse by Culinary Specialty
            </h2>
          </div>
          <button
            type="button"
            onClick={goToCategories}
            className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
          >
            <span>View All Categories</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {categories.map((category) => {
            const count = outletProducts.filter(
              (p) => p.category === category.slug || p.category === category.id
            ).length;
            return (
              <CategoryCard
                key={category.id}
                category={category}
                itemCount={count}
              />
            );
          })}
        </div>
      </section>

      {/* 3. BEST SELLING DELICACIES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-1.5 text-orange-600 font-bold text-xs uppercase tracking-wider mb-0.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Customer Favorites</span>
            </div>
            <h2 className="font-extrabold text-xl sm:text-2xl text-gray-900">
              Most Ordered Delicacies
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Dynamically ranked by actual orders at this kitchen over the past 30 days
            </p>
          </div>
          <button
            type="button"
            onClick={() => goToShop()}
            className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
          >
            <span>Explore Full Menu</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {bestsellers.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              soldCount={outletSalesMap[String(product.id)]?.totalSold}
            />
          ))}
        </div>
      </section>

      {/* 4. HEIRLOOM SPECIAL BANNER / SPOTLIGHT */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-2xl overflow-hidden bg-gray-900 text-white p-6 sm:p-10 border border-gray-800 shadow-md">
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-7 space-y-3 text-center lg:text-left">
              <div className="inline-flex items-center gap-1.5 bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider">
                <Flame className="w-3 h-3" />
                Heirloom Special
              </div>

              <h2 className="font-extrabold text-xl sm:text-3xl text-white leading-tight">
                {bannerHeading}
              </h2>

              <p className="text-xs text-gray-300 leading-relaxed max-w-xl">
                {bannerDescription}
              </p>

              <div className="pt-1 flex flex-wrap items-center justify-center lg:justify-start gap-3">
                <button
                  type="button"
                  onClick={() => goToShop(topBestsellerCategory?.slug || topBestsellerCategory?.id)}
                  className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Order {topBestsellerCategory?.name || 'Delicacies'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                {availableCoupon ? (
                  <div className="flex items-center gap-1.5 text-xs text-orange-400 font-semibold bg-orange-500/10 px-3 py-1.5 rounded-lg border border-orange-500/20">
                    <Tag className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Use code <strong className="font-mono text-white tracking-wide">{availableCoupon.code}</strong> for{' '}
                      {availableCoupon.discountType === 'percentage'
                        ? `${availableCoupon.discountValue}% OFF`
                        : `₹${availableCoupon.discountValue} OFF`}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-orange-400 font-semibold">
                    <Tag className="w-3.5 h-3.5 shrink-0" />
                    <span>Use code <strong className="font-mono text-white tracking-wide">SWAD15</strong> for 15% OFF</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right mini card list */}
            <div className="lg:col-span-5 grid grid-cols-2 gap-3">
              {chefSignatures.slice(0, 2).map((item) => (
                <div
                  key={item.id}
                  onClick={() => goToProduct(item.slug)}
                  className="bg-gray-800/90 hover:bg-gray-800 border border-gray-700/80 rounded-xl p-2.5 cursor-pointer transition-all hover:scale-102 group"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full aspect-4/3 rounded-lg object-cover mb-2"
                    referrerPolicy="no-referrer"
                  />
                  <h4 className="font-bold text-xs text-white group-hover:text-orange-400 line-clamp-1">
                    {item.name}
                  </h4>
                  <div className="flex items-center justify-between mt-1 text-xs">
                    <span className="font-bold text-orange-400">₹{item.price}</span>
                    <span className="text-[10px] text-gray-400">{item.serves}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 5. WHY CHOOSE GAON KA SWAD */}
      <section className="bg-gray-100 border-y border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="inline-flex items-center gap-1.5 text-orange-600 font-bold text-xs uppercase tracking-wider mb-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>The Cloud Kitchen Difference</span>
            </div>
            <h2 className="font-extrabold text-xl sm:text-3xl text-gray-900">
              Why Food Lovers Choose Us
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              We prioritize authentic preparation rituals over shortcut instant gravies.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs space-y-2">
              <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold">
                <Flame className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-gray-900">
                100% Traditional Clay Oven & Dum
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Every biryani is dum pukht cooked in individual clay handis with dough seals, trapping all natural aromas and meat juices without artificial moisture.
              </p>
            </div>

            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-gray-900">
                Strict Veg & Non-Veg Segregation
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Dedicated preparation areas, separate cookware, utensils, and fryers for vegetarian and non-vegetarian menus, with certified hygiene protocols.
              </p>
            </div>

            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs space-y-2">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <Truck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-gray-900">
                Multi-Layer Thermal Packaging
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Delivered in insulated leak-proof food-grade containers that preserve oven-fresh heat and texture for up to 60 minutes after dispatch.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. CUSTOMER REVIEWS (DATABASE DRIVEN ONLY) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div className="text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 text-orange-600 font-bold text-xs uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Verified Taste Tests</span>
            </div>
            <h2 className="font-extrabold text-xl sm:text-3xl text-gray-900 tracking-tight">
              Loved by Food Connoisseurs
            </h2>
          </div>
          {reviewsStats.totalCount > 0 && (
            <div className="flex items-center gap-2 bg-amber-50/80 border border-amber-200/80 px-3.5 py-1.5 rounded-full text-xs text-amber-900 font-semibold self-center sm:self-auto">
              <span className="flex items-center gap-1 text-amber-600 font-bold">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                {reviewsStats.averageRating} / 5
              </span>
              <span className="text-amber-300">•</span>
              <span className="text-amber-800 font-medium">
                {reviewsStats.totalCount} verified food reviews
              </span>
            </div>
          )}
        </div>

        {isReviewsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-white rounded-2xl p-6 border border-stone-200/80 shadow-xs animate-pulse space-y-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-stone-200" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3 w-24 bg-stone-200 rounded" />
                    <div className="h-2.5 w-16 bg-stone-100 rounded" />
                  </div>
                </div>
                <div className="h-16 bg-stone-100 rounded-lg" />
                <div className="h-8 bg-stone-100 rounded-lg" />
              </div>
            ))}
          </div>
        ) : featuredReviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {featuredReviews.map((rev) => {
              const matchedProduct = productLookup.get(String(rev.productId));
              const outletName =
                (rev.outletId && outletLookup.get(rev.outletId)) ||
                currentOutlet?.name ||
                'Artisanal Cloud Kitchen';
              const initials = (rev.customerDisplayName || 'Customer')
                .trim()
                .slice(0, 2)
                .toUpperCase();

              return (
                <div
                  key={rev.id}
                  className="bg-white rounded-2xl p-6 border border-stone-200/80 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header: User Avatar, Name, and Verified Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center shrink-0 ring-2 ring-amber-500/20">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-gray-900 truncate">
                            {rev.customerDisplayName || 'Verified Foodie'}
                          </p>
                          <p className="text-[11px] text-stone-500 truncate">
                            {outletName}
                          </p>
                        </div>
                      </div>

                      {rev.isVerifiedPurchase !== false && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 shrink-0">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Verified Order
                        </span>
                      )}
                    </div>

                    {/* Star Rating & Relative Time */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex text-amber-400 gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < rev.rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'fill-stone-200 text-stone-200'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[11px] text-stone-400">
                        {formatReviewDate(rev.reviewedAt || rev.createdAt)}
                      </span>
                    </div>

                    {/* Customer Review Quote */}
                    <p className="text-xs text-stone-600 leading-relaxed italic line-clamp-4">
                      &quot;{rev.reviewText}&quot;
                    </p>
                  </div>

                  {/* Associated Dish Footer Link */}
                  {matchedProduct && (
                    <button
                      type="button"
                      onClick={() => goToProduct(matchedProduct.slug)}
                      className="mt-4 pt-3.5 border-t border-stone-100 flex items-center justify-between gap-2 w-full text-left hover:text-orange-600 transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={matchedProduct.image}
                          alt={matchedProduct.name}
                          className="w-7 h-7 rounded-md object-cover shrink-0 border border-stone-200"
                        />
                        <span className="text-[11px] font-semibold text-stone-700 truncate group-hover:text-orange-600">
                          {matchedProduct.name}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-orange-600 shrink-0 flex items-center gap-0.5">
                        <span>View Dish</span>
                        <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 px-4 bg-white rounded-2xl border border-stone-200/80 shadow-xs max-w-xl mx-auto">
            <Sparkles className="w-7 h-7 text-orange-500 mx-auto mb-2.5" />
            <h3 className="text-stone-800 font-bold text-sm">Be the first to leave a review!</h3>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
              Place an order and share your honest taste feedback to see your review showcased here.
            </p>
            <button
              type="button"
              onClick={() => goToShop()}
              className="mt-4 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>Explore Menu</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
