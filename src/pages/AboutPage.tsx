import React from 'react';
import { useNavigation } from '../context/NavigationContext';
import {
  Flame,
  ShieldCheck,
  Award,
  Heart,
  Users,
  UtensilsCrossed,
  Sparkles,
  ArrowRight,
  Clock,
  CheckCircle2
} from 'lucide-react';

export const AboutPage: React.FC = () => {
  const { goToShop } = useNavigation();

  return (
    <div className="space-y-12 sm:space-y-16 pb-16">
      {/* 1. Hero Banner */}
      <section className="relative overflow-hidden bg-gray-50 border-b border-gray-200 py-12 sm:py-16 text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
          <div className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-900 border border-orange-200 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            <Flame className="w-3.5 h-3.5 text-orange-600 fill-orange-600" />
            <span>The Heritage Behind Gaon Ka Swad</span>
          </div>

          <h1 className="font-extrabold text-2xl sm:text-4xl text-gray-950 tracking-tight leading-tight">
            Crafting Authentic Culinary Memories,{' '}
            <span className="text-orange-600">
              One Handi at a Time
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Born out of a deep reverence for forgotten village recipes and slow-cooking traditions, Gaon Ka Swad brings the soulful tastes of rustic Indian households straight to modern dining tables.
          </p>
        </div>
      </section>

      {/* 2. Who We Are & Our Story */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-6 space-y-4">
            <div className="inline-flex items-center gap-1.5 text-orange-600 font-bold text-xs uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Who We Are</span>
            </div>

            <h2 className="font-extrabold text-xl sm:text-3xl text-gray-900 leading-tight">
              A Modern Cloud Kitchen with Heirloom Roots
            </h2>

            <p className="text-xs text-gray-600 leading-relaxed">
              Gaon Ka Swad was founded with a singular conviction: genuine taste cannot be rushed. In a world of 10-minute industrial microwave prep, we chose the path of slow-simmered handis, 24-hour charcoal embers, whole stone-ground spices, and pure cow desi ghee.
            </p>

            <p className="text-xs text-gray-600 leading-relaxed">
              Every recipe in our menu traces back to traditional culinary masters — from Awadhi royal khansamas to old Delhi dhabas and Champaran clay pot braisers. We do not use chemical preservatives, artificial food coloring, or pre-packaged spice pastes.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                <h4 className="font-extrabold text-xl text-orange-600">100%</h4>
                <p className="text-xs text-gray-600 mt-0.5 font-medium">Pure Desi Ghee & Raw Spices</p>
              </div>
              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                <h4 className="font-extrabold text-xl text-orange-600">24 Hrs</h4>
                <p className="text-xs text-gray-600 mt-0.5 font-medium">Slow-Simmered Dal Bukhara</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 relative">
            <div className="aspect-4/3 sm:aspect-4/3 rounded-2xl overflow-hidden shadow-xs border border-gray-200 bg-gray-900">
              <img
                src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=1000&auto=format&fit=crop"
                alt="Authentic Indian Kitchen Spices"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 3. Our Mission & Values */}
      <section className="bg-gray-900 text-white py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
            <span className="text-orange-400 font-bold text-xs uppercase tracking-wider">
              Our Core Philosophy
            </span>
            <h2 className="font-extrabold text-xl sm:text-3xl text-white">
              The 4 Pillars of Gaon Ka Swad
            </h2>
            <p className="text-xs text-gray-400">
              Strict culinary standards that define every single order we dispatch.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl bg-gray-800/80 border border-gray-700 space-y-2.5">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center font-bold">
                <Flame className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-white">
                1. Slow Dum Technique
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Clay pots sealed with dough traps aromatic steam, cooking meat and rice in their natural juices.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-gray-800/80 border border-gray-700 space-y-2.5">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-white">
                2. 100% Segregated Lines
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Separate kitchens, utensils, and chefs for pure vegetarian and non-vegetarian dishes.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-gray-800/80 border border-gray-700 space-y-2.5">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-white">
                3. Zero Shortcuts
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                No MSG, no artificial colors, no premade frozen bases. Everything is prepped daily from raw scratch.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-gray-800/80 border border-gray-700 space-y-2.5">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center font-bold">
                <Heart className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-white">
                4. Insulated Delivery
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                High-grade thermal packaging ensures your food arrives piping hot as if straight out of the clay tandoor.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Meet The Master Chefs & Kitchen Story */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="max-w-2xl space-y-1.5">
            <span className="text-orange-600 font-bold text-xs uppercase tracking-wider">
              The Culinary Guild
            </span>
            <h2 className="font-extrabold text-xl sm:text-2xl text-gray-900">
              Guided by Master Khansamas
            </h2>
            <p className="text-xs text-gray-600">
              Our executive chefs bring over 45 combined years of heritage cooking experience from royal Mughal, Awadhi, and Kashmiri kitchens.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
              <h4 className="font-bold text-sm text-gray-900">Ustad Imran Qureshi</h4>
              <p className="text-xs text-orange-600 font-semibold">Master Dum Specialist (Awadh)</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                Specializes in sealing dum handis, saffron balance, and royal Nizami yakhni preparations.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
              <h4 className="font-bold text-sm text-gray-900">Chef Harpreet Bhatia</h4>
              <p className="text-xs text-orange-600 font-semibold">Head Tandoor & Charcoal Pit</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                Master of bhatti marinades, clay oven heat regulation, and artisanal multilayered breads.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
              <h4 className="font-bold text-sm text-gray-900">Chef Rameshwar Tiwari</h4>
              <p className="text-xs text-orange-600 font-semibold">Slow Gravies & Mithai Artisan</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                Oversees our 24-hour slow-cooked Dal Bukhara, Shahi Paneer, and pure mawa gulab jamuns.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-gray-600">
              Want to taste the difference of true slow-cooked culinary craft?
            </p>
            <button
              type="button"
              onClick={() => goToShop()}
              className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
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
