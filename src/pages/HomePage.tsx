import React from 'react';
import { useNavigation } from '../context/NavigationContext';
import { useCart } from '../context/CartContext';
import { useProducts } from '../context/ProductContext';
import { CATEGORIES } from '../data/products';
import { ProductCard } from '../components/ProductCard';
import { CategoryCard } from '../components/CategoryCard';
import {
  Flame,
  ArrowRight,
  Sparkles,
  Star,
  Clock,
  ShieldCheck,
  Award,
  Truck,
  Heart,
  ChevronRight,
  Tag,
  CheckCircle2,
  Soup,
  Quote
} from 'lucide-react';
import { motion } from 'motion/react';

export const HomePage: React.FC = () => {
  const { goToShop, goToProduct, goToCategories, goToAbout } = useNavigation();
  const { addToCart } = useCart();
  const { activeProducts } = useProducts();

  const bestsellers = activeProducts.filter((p) => p.bestseller).slice(0, 4);
  const chefSignatures = activeProducts.filter((p) => p.chefSpecial).slice(0, 4);
  const newArrivals = activeProducts.filter((p) => p.newArrival).slice(0, 4);

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
              <div className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-800 border border-orange-200 px-3 py-1 rounded-full text-xs font-bold tracking-wide shadow-xs mx-auto lg:mx-0">
                <Flame className="w-3.5 h-3.5 text-orange-600 fill-orange-600" />
                <span>ARTISANAL CLOUD KITCHEN • SLOW-COOKED DUM</span>
              </div>

              {/* Main Headline */}
              <h1 className="font-extrabold text-3xl sm:text-4xl lg:text-5xl text-gray-900 tracking-tight leading-tight">
                Authentic Indian Flavors,{' '}
                <span className="text-orange-600">
                  Slow-Cooked to Perfection
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-xs sm:text-sm text-gray-600 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Experience royal Nizami dum biryanis, 24-hour slow-simmered dal makhani, and smoky clay-oven tandoori grills, delivered piping hot to your doorstep in sealed eco-handis.
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
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
                  <div className="text-left">
                    <p className="font-bold text-xs text-gray-900">4.9 ★ (2.8k+)</p>
                    <p className="text-[10px] text-gray-400">Google & Zomato</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-600 shrink-0" />
                  <div className="text-left">
                    <p className="font-bold text-xs text-gray-900">30–40 Mins</p>
                    <p className="text-[10px] text-gray-400">Express Delivery</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="text-left">
                    <p className="font-bold text-xs text-gray-900">100% Pure</p>
                    <p className="text-[10px] text-gray-400">Desi Ghee Recipe</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right Visual (5 cols) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="lg:col-span-5 relative"
            >
              <div className="relative mx-auto max-w-md lg:max-w-none aspect-4/3 sm:aspect-square rounded-2xl overflow-hidden shadow-lg border border-gray-200 bg-gray-900">
                <img
                  src="https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?q=80&w=1000&auto=format&fit=crop"
                  alt="Authentic Nizami Dum Biryani"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 via-transparent to-transparent" />

                {/* Floating Bottom Card */}
                <div className="absolute bottom-3 left-3 right-3 bg-gray-900/90 backdrop-blur-md rounded-xl p-3 border border-gray-700/60 text-white flex items-center justify-between shadow-md">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-orange-500/20 border border-orange-500/40 text-orange-400 flex items-center justify-center font-bold">
                      <Flame className="w-4 h-4 fill-orange-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-orange-400 uppercase">Today&apos;s Special</p>
                      <h4 className="font-bold text-xs text-white">
                        Nizami Royal Dum Biryani
                      </h4>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-white">₹499</span>
                    <button
                      type="button"
                      onClick={() => goToProduct('nizami-royal-dum-mutton-biryani')}
                      className="block text-[10px] font-semibold text-orange-400 hover:text-orange-300"
                    >
                      View Dish →
                    </button>
                  </div>
                </div>
              </div>
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
          {CATEGORIES.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
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
              Most Ordered Dum Delicacies
            </h2>
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
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* 4. CHEF'S SPECIAL BANNER / SPOTLIGHT */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-2xl overflow-hidden bg-gray-900 text-white p-6 sm:p-10 border border-gray-800 shadow-md">
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-7 space-y-3 text-center lg:text-left">
              <div className="inline-flex items-center gap-1.5 bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider">
                <Flame className="w-3 h-3" />
                Heirloom Clay Pot Special
              </div>

              <h2 className="font-extrabold text-xl sm:text-3xl text-white leading-tight">
                Champaran Ahuna & Nizami Dum Handis
              </h2>

              <p className="text-xs text-gray-300 leading-relaxed max-w-xl">
                Sealed with whole wheat dough and cooked over slow charcoal embers. No artificial enhancers — only cold-pressed mustard oil, whole garlic bulbs, and raw spices.
              </p>

              <div className="pt-1 flex flex-wrap items-center justify-center lg:justify-start gap-3">
                <button
                  type="button"
                  onClick={() => goToShop('slow-cooked-curries')}
                  className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <span>Order Handi Curries</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-1.5 text-xs text-orange-400 font-semibold">
                  <Tag className="w-3.5 h-3.5" />
                  <span>Use code <strong>GAON15</strong> for 15% OFF</span>
                </div>
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

      {/* 5. NEW ARRIVALS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-1.5 text-orange-600 font-bold text-xs uppercase tracking-wider mb-0.5">
              <Award className="w-3.5 h-3.5" />
              <span>Fresh From The Clay Oven</span>
            </div>
            <h2 className="font-extrabold text-xl sm:text-2xl text-gray-900">
              New Seasonal Creations
            </h2>
          </div>
          <button
            type="button"
            onClick={() => goToShop()}
            className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
          >
            <span>View Full Menu</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {newArrivals.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* 6. WHY CHOOSE GAON KA SWAD */}
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

      {/* 7. CUSTOMER REVIEWS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <div className="inline-flex items-center gap-1.5 text-orange-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Quote className="w-3.5 h-3.5" />
            <span>Verified Taste Tests</span>
          </div>
          <h2 className="font-extrabold text-xl sm:text-2xl text-gray-900">
            Loved by 10,000+ Food Connoisseurs
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="flex text-amber-400 gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                ))}
              </div>
              <p className="text-xs text-gray-600 leading-relaxed italic">
                &quot;The Nizami Mutton Dum Biryani was incredible. You could actually smell the saffron and cardamom when cracking the dough seal. Unmatched taste!&quot;
              </p>
            </div>
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between mt-3">
              <div>
                <p className="font-bold text-xs text-gray-900">Rohit Malhotra</p>
                <p className="text-[10px] text-gray-400">Bandra, Mumbai</p>
              </div>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-semibold border border-emerald-200">
                Verified Order
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="flex text-amber-400 gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                ))}
              </div>
              <p className="text-xs text-gray-600 leading-relaxed italic">
                &quot;As a vegetarian, finding rich authentic Dal Makhani without excessive creaminess is rare. Gaon Ka Swad slow-cooked dal is 10/10 perfection.&quot;
              </p>
            </div>
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between mt-3">
              <div>
                <p className="font-bold text-xs text-gray-900">Pooja Hegde</p>
                <p className="text-[10px] text-gray-400">Indiranagar, Bengaluru</p>
              </div>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-semibold border border-emerald-200">
                Verified Order
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="flex text-amber-400 gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                ))}
              </div>
              <p className="text-xs text-gray-600 leading-relaxed italic">
                &quot;Hot delivery in under 35 minutes! The garlic naan stayed soft and the butter chicken had real clay oven char. Will order every weekend.&quot;
              </p>
            </div>
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between mt-3">
              <div>
                <p className="font-bold text-xs text-gray-900">Vikram Seth</p>
                <p className="text-[10px] text-gray-400">Connaught Place, Delhi</p>
              </div>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-semibold border border-emerald-200">
                Verified Order
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 8. PROMO CALLOUT / QUICK ORDER BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-orange-600 rounded-2xl p-6 sm:p-10 text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="space-y-1.5 text-center sm:text-left">
            <h3 className="font-extrabold text-xl sm:text-2xl">
              Ready to Taste Authentic Royal Recipes?
            </h3>
            <p className="text-xs text-orange-100 max-w-md">
              Order now and get 15% off with code <strong>GAON15</strong> + Free insulated express delivery.
            </p>
          </div>

          <button
            type="button"
            onClick={() => goToShop()}
            className="px-6 py-3 bg-gray-900 hover:bg-black text-white rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 shrink-0 hover:scale-102"
          >
            <span>Order Delicacies Now</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>
    </div>
  );
};
