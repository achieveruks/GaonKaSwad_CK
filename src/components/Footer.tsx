import React, { useState } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { useCart } from '../context/CartContext';
import {
  Flame,
  ShieldCheck,
  Award,
  Sparkles,
  MapPin,
  Phone,
  Mail,
  Clock,
  Send,
  Heart,
  UtensilsCrossed
} from 'lucide-react';
import { CATEGORIES } from '../data/products';

export const Footer: React.FC = () => {
  const { goToHome, goToShop, goToCategories, goToAbout, goToContact, goToOwnerLogin } = useNavigation();
  const { showToast } = useCart();
  const [newsletterEmail, setNewsletterEmail] = useState('');

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail || !newsletterEmail.includes('@')) {
      showToast('Invalid Email', 'Please enter a valid email address.', 'error');
      return;
    }
    showToast('Subscribed!', 'Thank you! You will receive secret recipes and weekend discount drops.', 'success');
    setNewsletterEmail('');
  };

  return (
    <footer className="bg-gray-900 text-gray-300 pt-12 pb-10 border-t border-gray-800">
      {/* Top Value Badges Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-gray-800/70 rounded-xl border border-gray-700/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center shrink-0 border border-orange-500/20">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h5 className="font-bold text-xs text-white">Slow-Cooked Dum</h5>
              <p className="text-[11px] text-gray-400">Authentic wood ember handis</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h5 className="font-bold text-xs text-white">100% Hygienic</h5>
              <p className="text-[11px] text-gray-400">Separate Veg & Non-Veg lines</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h5 className="font-bold text-xs text-white">30–40 Mins Express</h5>
              <p className="text-[11px] text-gray-400">Piping hot insulated delivery</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center shrink-0 border border-orange-500/20">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h5 className="font-bold text-xs text-white">Pure Heirloom Taste</h5>
              <p className="text-[11px] text-gray-400">Zero artificial preservatives</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-10 border-b border-gray-800">
          {/* Brand Info (2 cols) */}
          <div className="lg:col-span-2 space-y-3">
            <div
              onClick={goToHome}
              className="flex items-center gap-2.5 cursor-pointer select-none"
            >
              <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center text-white shadow-xs">
                <Flame className="w-5 h-5 fill-white" />
              </div>
              <span className="font-extrabold text-lg text-white tracking-tight">
                Gaon Ka <span className="text-orange-500">Swad</span>
              </span>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed max-w-sm">
              Gaon Ka Swad is a modern artisanal cloud kitchen dedicated to reviving rustic village and royal regional recipes with pure desi ghee and heirloom spices.
            </p>

            <div className="pt-1 flex items-center gap-3 text-gray-400 text-xs">
              <div className="flex items-center gap-1.5 bg-gray-800/80 px-2.5 py-1 rounded-md border border-gray-700 text-[11px]">
                <UtensilsCrossed className="w-3 h-3 text-orange-400" />
                <span>FSSAI Lic. #11523034000189</span>
              </div>
            </div>
          </div>

          {/* Quick Navigation */}
          <div>
            <h4 className="font-bold text-xs text-white uppercase tracking-wider mb-3">
              Explore Menu
            </h4>
            <ul className="space-y-2 text-xs text-gray-400">
              <li>
                <button
                  type="button"
                  onClick={() => goToShop()}
                  className="hover:text-orange-400 transition-colors"
                >
                  All Delicacies
                </button>
              </li>
              {CATEGORIES.slice(0, 4).map((cat) => (
                <li key={cat.id}>
                  <button
                    type="button"
                    onClick={() => goToShop(cat.slug)}
                    className="hover:text-orange-400 transition-colors"
                  >
                    {cat.name}
                  </button>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={goToCategories}
                  className="hover:text-orange-400 transition-colors font-semibold text-orange-400"
                >
                  View All Categories →
                </button>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold text-xs text-white uppercase tracking-wider mb-3">
              Company
            </h4>
            <ul className="space-y-2 text-xs text-gray-400">
              <li>
                <button
                  type="button"
                  onClick={goToAbout}
                  className="hover:text-orange-400 transition-colors"
                >
                  Our Culinary Story
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={goToAbout}
                  className="hover:text-orange-400 transition-colors"
                >
                  5-Star Hygiene Standards
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={goToContact}
                  className="hover:text-orange-400 transition-colors"
                >
                  Kitchen Locations
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={goToContact}
                  className="hover:text-orange-400 transition-colors"
                >
                  Corporate & Party Catering
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={goToContact}
                  className="hover:text-orange-400 transition-colors"
                >
                  Contact & Support
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={goToOwnerLogin}
                  className="hover:text-orange-400 transition-colors"
                >
                  Owner Login
                </button>
              </li>
            </ul>
          </div>

          {/* Newsletter & Direct Order */}
          <div>
            <h4 className="font-bold text-xs text-white uppercase tracking-wider mb-2">
              Secret Weekend Drops
            </h4>
            <p className="text-xs text-gray-400 mb-2.5 leading-relaxed">
              Get member discounts and festive weekend handi specials.
            </p>

            <form onSubmit={handleSubscribe} className="space-y-2">
              <div className="relative">
                <input
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-orange-500"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Subscribe</span>
                <Send className="w-3 h-3" />
              </button>
            </form>
          </div>
        </div>

        {/* Bottom copyright and legal */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} Gaon Ka Swad Cloud Kitchen. All rights reserved.</p>
          <div className="flex items-center gap-3 text-gray-400 text-[11px]">
            <span>Crafted with <Heart className="w-3 h-3 text-rose-500 inline fill-rose-500" /> for food lovers</span>
            <span>•</span>
            <span>Vercel-Ready Architecture</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
