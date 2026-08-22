import React, { useState, useEffect } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { useLocation } from '../context/LocationContext';
import { OutletAbout } from '../types';
import { getAboutByOutletId } from '../lib/aboutService';
import {
  Flame,
  ShieldCheck,
  Award,
  Heart,
  Sparkles,
  ArrowRight,
  MapPin,
} from 'lucide-react';

/**
 * Clean UI Loading Skeleton for the dynamic About Page
 */
const AboutPageSkeleton: React.FC = () => {
  return (
    <div className="space-y-12 sm:space-y-16 pb-16 animate-pulse">
      {/* 1. Hero Banner Skeleton */}
      <section className="bg-stone-100/70 border-b border-stone-200 py-12 sm:py-16 text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 flex flex-col items-center">
          <div className="h-6 w-56 bg-stone-200 rounded-full" />
          <div className="h-10 w-3/4 max-w-xl bg-stone-300 rounded-xl" />
          <div className="h-4 w-full max-w-lg bg-stone-200 rounded-md" />
          <div className="h-4 w-2/3 max-w-md bg-stone-200 rounded-md" />
          <div className="h-5 w-44 bg-stone-200 rounded-full mt-2" />
        </div>
      </section>

      {/* 2. Story & Image Skeleton */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-6 space-y-4">
            <div className="h-5 w-28 bg-stone-200 rounded-full" />
            <div className="h-8 w-4/5 bg-stone-300 rounded-xl" />
            <div className="space-y-2 pt-2">
              <div className="h-4 w-full bg-stone-200 rounded-md" />
              <div className="h-4 w-11/12 bg-stone-200 rounded-md" />
              <div className="h-4 w-4/5 bg-stone-200 rounded-md" />
            </div>
            <div className="grid grid-cols-2 gap-3 pt-3">
              <div className="h-20 bg-stone-100 border border-stone-200 rounded-xl" />
              <div className="h-20 bg-stone-100 border border-stone-200 rounded-xl" />
            </div>
          </div>
          <div className="lg:col-span-6">
            <div className="aspect-4/3 rounded-2xl bg-stone-200 border border-stone-300" />
          </div>
        </div>
      </section>

      {/* 3. Static Core Pillars Placeholder */}
      <section className="bg-stone-900 text-white py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
            <div className="h-4 w-32 bg-stone-700 mx-auto rounded-full" />
            <div className="h-8 w-64 bg-stone-700 mx-auto rounded-xl" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-5 rounded-xl bg-stone-800/80 border border-stone-700 h-44" />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export const AboutPage: React.FC = () => {
  const { goToShop } = useNavigation();
  const { currentOutlet } = useLocation();

  const [aboutData, setAboutData] = useState<OutletAbout | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const outletId = currentOutlet?.id || 'blr-hsr';

    setIsLoading(true);
    getAboutByOutletId(outletId)
      .then((data) => {
        if (isMounted) {
          setAboutData(data);
        }
      })
      .catch((err) => {
        console.warn('Failed to load about data from database for outlet:', err);
        if (isMounted) {
          setAboutData(null);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentOutlet?.id]);

  // If loading data from database, display skeleton
  if (isLoading) {
    return <AboutPageSkeleton />;
  }

  // Format description into paragraphs if it contains newlines
  const renderStoryParagraphs = (text?: string) => {
    if (!text) return null;
    const paragraphs = text.split('\n\n').filter((p) => p.trim().length > 0);
    return paragraphs.map((para, idx) => (
      <p key={idx} className="text-xs text-stone-600 leading-relaxed">
        {para}
      </p>
    ));
  };

  const heroFireLine = aboutData?.heroFireLine || (currentOutlet ? `ARTISANAL CLOUD KITCHEN • ${currentOutlet.name.toUpperCase()}` : 'ARTISANAL CLOUD KITCHEN • GAON KA SWAD');
  const heroHeader = aboutData?.heroHeader || currentOutlet?.heroHeader || 'Crafting Authentic Culinary Memories, One Handi at a Time';
  const heroDescription =
    aboutData?.heroDescription ||
    currentOutlet?.heroDescription ||
    'Experience royal dum biryanis, 24-hour slow-simmered dal makhani, and smoky clay-oven tandoori grills, delivered piping hot to your doorstep in sealed eco-handis.';

  const storyLine = aboutData?.storyLine || 'WHO WE ARE';
  const storyTitle = aboutData?.storyTitle || 'A Modern Cloud Kitchen with Heirloom Roots';
  const storyHighlight1Title = aboutData?.storyHighlight1Title || '100% Pure Desi Ghee';
  const storyHighlight1Desc = aboutData?.storyHighlight1Description || 'Pure Desi Ghee & Raw Spices';
  const storyHighlight2Title = aboutData?.storyHighlight2Title || '24 Hrs Slow-Simmered';
  const storyHighlight2Desc = aboutData?.storyHighlight2Description || 'Slow-Simmered Dal Bukhara';
  const outletImage =
    aboutData?.outletImage ||
    'https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=1000&auto=format&fit=crop';

  return (
    <div className="space-y-12 sm:space-y-16 pb-16">
      {/* 1. Hero Banner */}
      <section className="relative overflow-hidden bg-stone-50 border-b border-stone-200 py-12 sm:py-16 text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
          <div className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-900 border border-orange-200 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            <Flame className="w-3.5 h-3.5 text-orange-600 fill-orange-600 shrink-0" />
            <span>{heroFireLine}</span>
          </div>

          <h1 className="font-extrabold text-2xl sm:text-4xl text-stone-950 tracking-tight leading-tight">
            {heroHeader}
          </h1>

          <p className="text-xs sm:text-sm text-stone-600 max-w-2xl mx-auto leading-relaxed">
            {heroDescription}
          </p>

          {currentOutlet && (
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-stone-500 bg-white/80 border border-stone-200 px-3 py-0.5 rounded-full mt-2">
              <MapPin className="w-3 h-3 text-amber-700" />
              <span>Viewing story for: <strong>{currentOutlet.name}</strong> ({currentOutlet.city})</span>
            </div>
          )}
        </div>
      </section>

      {/* 2. Who We Are & Our Story */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-6 space-y-4">
            <div className="inline-flex items-center gap-1.5 text-orange-600 font-bold text-xs uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>{storyLine}</span>
            </div>

            <h2 className="font-extrabold text-xl sm:text-3xl text-stone-900 leading-tight">
              {storyTitle}
            </h2>

            <div className="space-y-3">
              {aboutData?.storyDescription ? (
                renderStoryParagraphs(aboutData.storyDescription)
              ) : (
                <p className="text-xs text-stone-600 leading-relaxed">
                  Gaon Ka Swad was founded with a singular conviction: genuine taste cannot be rushed. In a world of 10-minute industrial microwave prep, we chose the path of slow-simmered handis, 24-hour charcoal embers, whole stone-ground spices, and pure cow desi ghee.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200">
                <h4 className="font-extrabold text-base sm:text-lg text-orange-600">{storyHighlight1Title}</h4>
                <p className="text-xs text-stone-600 mt-0.5 font-medium">{storyHighlight1Desc}</p>
              </div>
              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200">
                <h4 className="font-extrabold text-base sm:text-lg text-orange-600">{storyHighlight2Title}</h4>
                <p className="text-xs text-stone-600 mt-0.5 font-medium">{storyHighlight2Desc}</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 relative">
            <div className="aspect-4/3 sm:aspect-4/3 rounded-2xl overflow-hidden shadow-xs border border-stone-200 bg-stone-900">
              <img
                src={outletImage}
                alt={storyTitle || 'Authentic Indian Kitchen'}
                className="w-full h-full object-cover transition-opacity duration-300"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=1000&auto=format&fit=crop';
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 3. Our Mission & Values */}
      <section className="bg-stone-900 text-white py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
            <span className="text-orange-400 font-bold text-xs uppercase tracking-wider">
              Our Core Philosophy
            </span>
            <h2 className="font-extrabold text-xl sm:text-3xl text-white">
              The 4 Pillars of Gaon Ka Swad
            </h2>
            <p className="text-xs text-stone-400">
              Strict culinary standards that define every single order we dispatch.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl bg-stone-800/80 border border-stone-700 space-y-2.5">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center font-bold">
                <Flame className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-white">
                1. Slow Dum Technique
              </h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                Clay pots sealed with dough traps aromatic steam, cooking meat and rice in their natural juices.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-stone-800/80 border border-stone-700 space-y-2.5">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-white">
                2. 100% Segregated Lines
              </h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                Separate kitchens, utensils, and chefs for pure vegetarian and non-vegetarian dishes.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-stone-800/80 border border-stone-700 space-y-2.5">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-white">
                3. Zero Shortcuts
              </h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                No MSG, no artificial colors, no premade frozen bases. Everything is prepped daily from raw scratch.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-stone-800/80 border border-stone-700 space-y-2.5">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center font-bold">
                <Heart className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-white">
                4. Insulated Delivery
              </h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                High-grade thermal packaging ensures your food arrives piping hot as if straight out of the clay tandoor.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Meet The Master Chefs & Kitchen Story */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="max-w-2xl space-y-1.5">
            <span className="text-orange-600 font-bold text-xs uppercase tracking-wider">
              The Culinary Guild
            </span>
            <h2 className="font-extrabold text-xl sm:text-2xl text-stone-900">
              Guided by Master Khansamas
            </h2>
            <p className="text-xs text-stone-600">
              Our executive chefs bring over 45 combined years of heritage cooking experience from royal Mughal, Awadhi, and Kashmiri kitchens.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
              <h4 className="font-bold text-sm text-stone-900">Ustad Imran Qureshi</h4>
              <p className="text-xs text-orange-600 font-semibold">Master Dum Specialist (Awadh)</p>
              <p className="text-xs text-stone-500 leading-relaxed">
                Specializes in sealing dum handis, saffron balance, and royal Nizami yakhni preparations.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
              <h4 className="font-bold text-sm text-stone-900">Chef Harpreet Bhatia</h4>
              <p className="text-xs text-orange-600 font-semibold">Head Tandoor & Charcoal Pit</p>
              <p className="text-xs text-stone-500 leading-relaxed">
                Master of bhatti marinades, clay oven heat regulation, and artisanal multilayered breads.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
              <h4 className="font-bold text-sm text-stone-900">Chef Rameshwar Tiwari</h4>
              <p className="text-xs text-orange-600 font-semibold">Slow Gravies & Mithai Artisan</p>
              <p className="text-xs text-stone-500 leading-relaxed">
                Oversees our 24-hour slow-cooked Dal Bukhara, Shahi Paneer, and pure mawa gulab jamuns.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-stone-600">
              Want to taste the difference of true slow-cooked culinary craft?
            </p>
            <button
              type="button"
              onClick={() => goToShop()}
              className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>Explore Our Menu</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
