import React, { useState } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { useCart } from '../context/CartContext';
import { useLocation } from '../context/LocationContext';
import { SearchBar } from './SearchBar';
import {
  ShoppingBag,
  Menu,
  X,
  Search,
  ChevronDown,
  MapPin,
  Clock,
  Sparkles,
  PhoneCall,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CATEGORIES } from '../data/products';

export const Navbar: React.FC = () => {
  const { currentRoute, goToHome, goToShop, goToCategories, goToAbout, goToContact } =
    useNavigation();
  const { totalItemsCount, setIsCartDrawerOpen } = useCart();
  const { selectedLocation, setIsLocationModalOpen, currentOutlet, currentZone } = useLocation();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isCategoriesDropdownOpen, setIsCategoriesDropdownOpen] = useState(false);

  const isActive = (path: string) => currentRoute.path === path;

  // Dynamic kitchen hours from outlet data
  const kitchenHours = currentOutlet?.operatingHours || '11:00 AM - 11:30 PM';

  // Dynamic express delivery from selected delivery zone data (or outlet fallback)
  const deliveryTime =
    currentZone?.estimatedDeliveryTime ||
    currentOutlet?.estimatedDeliveryTime ||
    currentOutlet?.avgCookingTime ||
    '30-40 min';

  // Format second line outlet name beside "G"
  const getOutletSecondLine = () => {
    const rawName = selectedLocation?.outletName || currentOutlet?.name;
    if (!rawName) return 'Select Location';

    const cleaned = rawName
      .replace(/^Gaon\s+Ka\s+Swad\s*[-–:]\s*/i, '')
      .replace(/^Gaon\s+Ka\s+Swad\s*/i, '')
      .replace(/\bOutlet\s+Name\b/gi, '')
      .replace(/\bOutlet\b/gi, '')
      .replace(/\bCloud\s+Kitchen\b/gi, '')
      .trim();

    return cleaned || rawName;
  };

  const outletSecondLine = getOutletSecondLine();

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-stone-200 shadow-xs">
      {/* Top micro-announcement banner */}
      <div className="bg-stone-900 text-stone-300 text-[11px] sm:text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
            <span className="inline-flex items-center gap-1 bg-amber-700 text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-wider text-[10px]">
              <Sparkles className="w-3 h-3" /> Special Offer
            </span>
            <span className="truncate">
              Use code <strong className="text-amber-400 font-bold">GAON15</strong> for 15% OFF • Clay Pot Dum Deliveries
            </span>
          </div>

          <div className="hidden md:flex items-center gap-4 shrink-0 text-stone-400">
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>Kitchen Open: {kitchenHours}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-amber-500" />
              <span>{deliveryTime} Express Delivery</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Nav Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Brand Logo - 2-liner */}
          <div
            onClick={goToHome}
            className="flex items-center gap-2.5 cursor-pointer select-none group shrink-0"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-amber-800 rounded-lg flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-xs group-hover:scale-105 transition-transform shrink-0">
              G
            </div>
            <div className="flex flex-col justify-center leading-tight text-left">
              <span className="font-heading font-bold text-base sm:text-lg text-stone-900 tracking-tight">
                Gaon Ka <span className="text-amber-800">Swad</span>
              </span>
              <span
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                className="text-[12px] sm:text-[13px] italic font-semibold text-amber-700 tracking-wide max-w-[130px] sm:max-w-[200px] truncate block group-hover:text-amber-800 transition-colors"
              >
                {outletSecondLine}
              </span>
            </div>
          </div>

          {/* Location Selector Badge */}
          <button
            type="button"
            id="header-location-button"
            onClick={() => setIsLocationModalOpen(true)}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full border text-xs font-medium transition-all shrink-0 ${
              selectedLocation
                ? 'bg-amber-50/80 hover:bg-amber-100/90 border-amber-200/80 text-stone-900 shadow-2xs'
                : 'bg-amber-100/80 hover:bg-amber-200 border-amber-400 text-amber-950 ring-2 ring-amber-400/30'
            }`}
            title="Click to select or change delivery PIN code"
          >
            <MapPin className="w-3.5 h-3.5 text-amber-800 shrink-0" />
            <div className="text-left hidden xs:block sm:block">
              {selectedLocation ? (
                <div className="flex items-center gap-1">
                  <span className="font-bold text-stone-900">PIN {selectedLocation.pinCode}</span>
                  <span className="text-stone-500 text-[11px] truncate max-w-[100px] md:max-w-[140px]">
                    · {selectedLocation.outletName.replace('Gaon Ka Swad - ', '')}
                  </span>
                </div>
              ) : (
                <span className="font-bold text-amber-950">Select Delivery PIN</span>
              )}
            </div>
            <div className="block xs:hidden sm:hidden text-left font-bold text-xs">
              {selectedLocation ? selectedLocation.pinCode : 'Set PIN'}
            </div>
            <span className="text-[10px] text-amber-800 underline font-semibold ml-0.5">
              Change
            </span>
          </button>

          {/* Desktop Search Bar */}
          <div className="hidden lg:block max-w-xs xl:max-w-sm w-full">
            <SearchBar />
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-1 text-sm font-medium">
            <button
              type="button"
              onClick={goToHome}
              className={`px-3 py-5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                isActive('/')
                  ? 'text-amber-800 border-amber-800 font-semibold'
                  : 'text-stone-600 border-transparent hover:text-stone-900 hover:border-stone-300'
              }`}
            >
              Home
            </button>

            <button
              type="button"
              onClick={() => goToShop()}
              className={`px-3 py-5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                isActive('/shop')
                  ? 'text-amber-800 border-amber-800 font-semibold'
                  : 'text-stone-600 border-transparent hover:text-stone-900 hover:border-stone-300'
              }`}
            >
              Shop
            </button>

            {/* Categories Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setIsCategoriesDropdownOpen(true)}
              onMouseLeave={() => setIsCategoriesDropdownOpen(false)}
            >
              <button
                type="button"
                onClick={goToCategories}
                className={`px-3 py-5 text-sm font-medium transition-colors flex items-center gap-1 border-b-2 -mb-px ${
                  isActive('/categories')
                    ? 'text-amber-800 border-amber-800 font-semibold'
                    : 'text-stone-600 border-transparent hover:text-stone-900 hover:border-stone-300'
                }`}
              >
                <span>Categories</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              <AnimatePresence>
                {isCategoriesDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 w-60 bg-white rounded-xl shadow-xl border border-stone-200 py-2 z-50 overflow-hidden"
                  >
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                      Our Specialties
                    </div>
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setIsCategoriesDropdownOpen(false);
                          goToShop(cat.slug);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs font-medium text-stone-700 hover:text-amber-800 hover:bg-amber-50 transition-colors flex items-center justify-between"
                      >
                        <span>{cat.name}</span>
                        <span className="text-[10px] text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">
                          {cat.itemCount}
                        </span>
                      </button>
                    ))}
                    <div className="border-t border-stone-100 mt-1 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsCategoriesDropdownOpen(false);
                          goToCategories();
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-50 transition-colors"
                      >
                        View All Categories →
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              type="button"
              onClick={goToAbout}
              className={`px-3 py-5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                isActive('/about')
                  ? 'text-amber-800 border-amber-800 font-semibold'
                  : 'text-stone-600 border-transparent hover:text-stone-900 hover:border-stone-300'
              }`}
            >
              About Us
            </button>

            <button
              type="button"
              onClick={goToContact}
              className={`px-3 py-5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                isActive('/contact')
                  ? 'text-amber-800 border-amber-800 font-semibold'
                  : 'text-stone-600 border-transparent hover:text-stone-900 hover:border-stone-300'
              }`}
            >
              Contact
            </button>
          </nav>

          {/* Right Action Icons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile Search Toggle */}
            <button
              type="button"
              onClick={() => setIsSearchExpanded(!isSearchExpanded)}
              className="lg:hidden p-2 text-stone-700 hover:text-stone-900 rounded-full hover:bg-stone-100 transition-colors"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Cart Button */}
            <button
              type="button"
              id="header-cart-button"
              onClick={() => setIsCartDrawerOpen(true)}
              className="relative p-2 bg-stone-100 hover:bg-stone-200 text-stone-900 rounded-full transition-colors flex items-center justify-center select-none"
              aria-label={`Open shopping cart with ${totalItemsCount} items`}
            >
              <ShoppingBag className="w-5 h-5 text-stone-700" />
              {totalItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-800 text-white text-[10px] flex items-center justify-center rounded-full font-bold">
                  {totalItemsCount}
                </span>
              )}
            </button>

            {/* Mobile Menu Hamburger */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-stone-700 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Search Collapsible */}
        <AnimatePresence>
          {isSearchExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="lg:hidden pb-4 overflow-hidden"
            >
              <SearchBar autoFocus onClose={() => setIsSearchExpanded(false)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile Navigation Drawer / Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-stone-200 overflow-hidden"
          >
            <div className="px-4 py-4 space-y-1.5">
              {/* Location info inside mobile menu */}
              <div
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsLocationModalOpen(true);
                }}
                className="p-3 bg-amber-50 rounded-xl border border-amber-200 cursor-pointer flex items-center justify-between mb-3"
              >
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-800 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-stone-900">
                      {selectedLocation ? `PIN ${selectedLocation.pinCode}` : 'Select Delivery PIN'}
                    </div>
                    <div className="text-[11px] text-stone-500 line-clamp-1">
                      {selectedLocation ? selectedLocation.outletName : 'Check kitchen availability'}
                    </div>
                  </div>
                </div>
                <span className="text-xs font-bold text-amber-800 underline">Change</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  goToHome();
                }}
                className={`w-full text-left px-3 py-2 rounded-lg font-semibold text-sm transition-colors ${
                  isActive('/') ? 'bg-amber-50 text-amber-800' : 'text-stone-800 hover:bg-stone-50'
                }`}
              >
                Home
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  goToShop();
                }}
                className={`w-full text-left px-3 py-2 rounded-lg font-semibold text-sm transition-colors ${
                  isActive('/shop') ? 'bg-amber-50 text-amber-800' : 'text-stone-800 hover:bg-stone-50'
                }`}
              >
                Shop
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  goToCategories();
                }}
                className={`w-full text-left px-3 py-2 rounded-lg font-semibold text-sm transition-colors ${
                  isActive('/categories')
                    ? 'bg-amber-50 text-amber-800'
                    : 'text-stone-800 hover:bg-stone-50'
                }`}
              >
                Categories
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  goToAbout();
                }}
                className={`w-full text-left px-3 py-2 rounded-lg font-semibold text-sm transition-colors ${
                  isActive('/about') ? 'bg-amber-50 text-amber-800' : 'text-stone-800 hover:bg-stone-50'
                }`}
              >
                About Us
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  goToContact();
                }}
                className={`w-full text-left px-3 py-2 rounded-lg font-semibold text-sm transition-colors ${
                  isActive('/contact') ? 'bg-amber-50 text-amber-800' : 'text-stone-800 hover:bg-stone-50'
                }`}
              >
                Contact
              </button>

              <div className="pt-3 mt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500 px-2">
                <span>Kitchen Hotline</span>
                <a
                  href="tel:+919876543210"
                  className="font-bold text-amber-800 flex items-center gap-1"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  +91 98765 43210
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
