import React, { useState, useEffect, useRef } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { useCart } from '../context/CartContext';
import { useLocation } from '../context/LocationContext';
import { useProducts } from '../context/ProductContext';
import { useCustomer } from '../context/CustomerContext';
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
  User,
  LogOut,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CATEGORIES } from '../data/products';

export const Navbar: React.FC = () => {
  const { currentRoute, goToHome, goToShop, goToCategories, goToAbout, goToContact, goToProfile, goToOrders } =
    useNavigation();
  const { totalItemsCount, setIsCartDrawerOpen } = useCart();
  const { selectedLocation, setIsLocationModalOpen, currentOutlet, currentZone } = useLocation();
  const { outletProducts } = useProducts();
  const { customer, isCustomerLoggedIn, openOtpModal, logoutCustomer } = useCustomer();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isCategoriesDropdownOpen, setIsCategoriesDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const categoriesDropdownRef = useRef<HTMLDivElement>(null);

  // Close user menu and categories dropdown when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setIsUserMenuOpen(false);
      }
      if (categoriesDropdownRef.current && !categoriesDropdownRef.current.contains(target)) {
        setIsCategoriesDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsUserMenuOpen(false);
        setIsCategoriesDropdownOpen(false);
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const isActive = (path: string) => currentRoute.path === path;

  // Dynamic kitchen hours from outlet data
  const kitchenHours = currentOutlet?.operatingHours || '11:00 AM - 11:30 PM';

  // Dynamic express delivery from selected delivery zone data (or outlet fallback)
  const deliveryTime =
    currentZone?.estimatedDeliveryTime ||
    currentOutlet?.estimatedDeliveryTime ||
    currentOutlet?.avgCookingTime ||
    '30-40 min';

  // Extract first name only for compact welcome display
  const customerFirstName = customer?.fullName?.trim()
    ? customer.fullName.trim().split(/\s+/)[0]
    : 'Customer';

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
      <div className="bg-stone-900 text-stone-300 text-[11px] sm:text-xs py-1.5 px-3 sm:px-4">
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
      <div className="max-w-7xl mx-auto px-2.5 sm:px-3 md:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-[3.75rem] sm:min-h-[4rem] md:min-h-[4.25rem] py-1 gap-1.5 sm:gap-2 md:gap-4">
          {/* Brand Logo & Outlet / PIN Header Area */}
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-2.5 shrink-0 min-w-0">
            <div
              onClick={goToHome}
              className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 bg-amber-800 rounded-lg flex items-center justify-center text-white font-bold text-xs sm:text-sm md:text-lg shadow-xs hover:scale-105 transition-transform shrink-0 cursor-pointer select-none"
            >
              G
            </div>
            <div className="flex flex-col justify-center leading-tight text-left min-w-0">
              <div
                onClick={goToHome}
                className="cursor-pointer select-none"
              >
                <span className="font-heading font-bold text-xs sm:text-xs md:text-sm lg:text-base text-stone-900 tracking-tight whitespace-nowrap block">
                  Gaon Ka <span className="text-amber-800">Swad</span>
                </span>
                <span
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  className="text-[9px] sm:text-[10px] md:text-xs italic font-semibold text-amber-700 tracking-wide max-w-[100px] sm:max-w-[120px] md:max-w-[200px] truncate block hover:text-amber-800 transition-colors leading-none"
                >
                  {outletSecondLine}
                </span>
              </div>

              {/* Pin Layout directly below Outlet Name */}
              <button
                type="button"
                id="header-location-button"
                onClick={() => setIsLocationModalOpen(true)}
                className="mt-0.5 flex items-center gap-0.5 sm:gap-1 text-[9px] sm:text-[10px] md:text-[11px] font-semibold text-amber-900 hover:text-amber-950 transition-colors group cursor-pointer w-fit leading-none"
                title="Click to select or change delivery PIN code"
              >
                <MapPin className="w-2.5 h-2.5 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 text-amber-700 group-hover:text-amber-900 shrink-0" />
                <span className="font-bold underline decoration-amber-400 group-hover:decoration-amber-700 underline-offset-2">
                  {selectedLocation ? `PIN ${selectedLocation.pinCode}` : 'Select PIN'}
                </span>
                <span className="text-[8px] sm:text-[9px] md:text-[10px] text-amber-700 font-normal opacity-80">
                  · Change
                </span>
              </button>
            </div>
          </div>

          {/* Search Bar taking remaining space */}
          <div className="hidden sm:block flex-1 min-w-0 max-w-3xl mx-1 sm:mx-2 md:mx-4">
            <SearchBar />
          </div>

          {/* Desktop Navigation Links (Visible on Extra Large/Desktop screens) */}
          <nav className="hidden xl:flex items-center gap-1 text-sm font-medium shrink-0">
            <button
              type="button"
              onClick={goToHome}
              className={`px-2.5 xl:px-3 py-5 text-sm font-medium transition-colors border-b-2 -mb-px ${
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
              className={`px-2.5 xl:px-3 py-5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                isActive('/shop')
                  ? 'text-amber-800 border-amber-800 font-semibold'
                  : 'text-stone-600 border-transparent hover:text-stone-900 hover:border-stone-300'
              }`}
            >
              Shop
            </button>

            {/* Categories Dropdown */}
            <div
              ref={categoriesDropdownRef}
              className="relative"
              onMouseEnter={() => setIsCategoriesDropdownOpen(true)}
              onMouseLeave={() => setIsCategoriesDropdownOpen(false)}
            >
              <button
                type="button"
                onClick={goToCategories}
                className={`px-2.5 xl:px-3 py-5 text-sm font-medium transition-colors flex items-center gap-1 border-b-2 -mb-px ${
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
                    {CATEGORIES.map((cat) => {
                      const count = outletProducts.filter(
                        (p) => p.category === cat.slug || p.category === cat.id
                      ).length;
                      return (
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
                          <span className="text-[10px] text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded font-semibold">
                            {count}
                          </span>
                        </button>
                      );
                    })}
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
              className={`px-2.5 xl:px-3 py-5 text-sm font-medium transition-colors border-b-2 -mb-px ${
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
              className={`px-2.5 xl:px-3 py-5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                isActive('/contact')
                  ? 'text-amber-800 border-amber-800 font-semibold'
                  : 'text-stone-600 border-transparent hover:text-stone-900 hover:border-stone-300'
              }`}
            >
              Contact
            </button>
          </nav>

          {/* Right Action Icons */}
          <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
            {/* Mobile Search Toggle (< sm) */}
            <button
              type="button"
              onClick={() => setIsSearchExpanded(!isSearchExpanded)}
              className="sm:hidden p-1.5 text-stone-700 hover:text-stone-900 rounded-full hover:bg-stone-100 transition-colors"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Customer Account / Sign In Widget */}
            <div className="relative" ref={userMenuRef}>
              {isCustomerLoggedIn && customer ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-1 sm:gap-1.5 py-1 px-1.5 sm:px-2.5 bg-amber-50/90 hover:bg-amber-100/90 text-stone-800 rounded-full text-xs font-semibold transition-all border border-amber-300 shadow-xs max-w-[110px] sm:max-w-[160px]"
                    title={`Logged in as ${customer.fullName || 'Customer'}`}
                  >
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-amber-900 text-amber-50 flex items-center justify-center text-[10px] sm:text-[11px] font-black shrink-0">
                      {customerFirstName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col text-left leading-none min-w-0">
                      <span className="text-[8px] uppercase tracking-wider text-amber-700 font-bold leading-none mb-0.5">
                        Welcome
                      </span>
                      <span className="text-[11px] sm:text-xs font-black text-amber-950 truncate block max-w-[50px] sm:max-w-[90px] leading-tight">
                        {customerFirstName}
                      </span>
                    </div>
                    <ChevronDown className="w-3 h-3 text-amber-800 shrink-0 hidden sm:inline" />
                  </button>

                  <AnimatePresence>
                    {isUserMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-stone-200 py-2 z-50 overflow-hidden"
                      >
                        <div className="px-3.5 py-2.5 border-b border-stone-100 bg-amber-50/50">
                          <p className="text-[10px] uppercase tracking-wider text-amber-700 font-bold leading-none">
                            Welcome
                          </p>
                          <p className="text-sm font-black text-amber-950 truncate mt-1">
                            {customerFirstName}
                          </p>
                          <p className="text-xs text-stone-600 truncate">
                            {customer.fullName}
                          </p>
                          <p className="text-[11px] text-stone-500 font-mono mt-0.5">
                            +91 {customer.phone}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            goToOrders();
                          }}
                          className="w-full text-left px-3.5 py-2.5 text-xs font-bold text-stone-800 hover:bg-amber-50/70 hover:text-amber-900 flex items-center gap-2 transition-colors border-b border-stone-100 cursor-pointer"
                        >
                          <Clock className="w-3.5 h-3.5 text-amber-800" />
                          <span>My Orders</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            goToProfile();
                          }}
                          className="w-full text-left px-3.5 py-2.5 text-xs font-bold text-stone-800 hover:bg-amber-50/70 hover:text-amber-900 flex items-center gap-2 transition-colors border-b border-stone-100 cursor-pointer"
                        >
                          <User className="w-3.5 h-3.5 text-amber-800" />
                          <span>My Profile & Info</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            logoutCustomer();
                          }}
                          className="w-full text-left px-3.5 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Sign Out</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => openOtpModal('', 'signin')}
                  className="flex items-center gap-1 sm:gap-1.5 py-1.5 px-2 sm:px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-full text-xs font-bold transition-colors border border-stone-200"
                >
                  <User className="w-3.5 h-3.5 text-stone-600" />
                  <span className="hidden sm:inline">Sign In</span>
                </button>
              )}
            </div>

            {/* Cart Button */}
            <button
              type="button"
              id="header-cart-button"
              onClick={() => setIsCartDrawerOpen(true)}
              className="relative p-1.5 sm:p-2 bg-stone-100 hover:bg-stone-200 text-stone-900 rounded-full transition-colors flex items-center justify-center select-none"
              aria-label={`Open shopping cart with ${totalItemsCount} items`}
            >
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-stone-700" />
              {totalItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-800 text-white text-[10px] flex items-center justify-center rounded-full font-bold">
                  {totalItemsCount}
                </span>
              )}
            </button>

            {/* Mobile/Tablet Menu Hamburger */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="xl:hidden p-1.5 sm:p-2 text-stone-700 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Search Collapsible (< sm) */}
        <AnimatePresence>
          {isSearchExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="sm:hidden pb-3 relative z-50 overflow-visible"
            >
              <SearchBar autoFocus onClose={() => setIsSearchExpanded(false)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile/Tablet Navigation Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="xl:hidden bg-white border-b border-stone-200 overflow-hidden"
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

              {/* Mobile customer sign-in or account row */}
              <div className="pt-2 pb-1">
                {isCustomerLoggedIn && customer ? (
                  <div className="p-3.5 bg-amber-50/80 rounded-xl border border-amber-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-amber-900 text-amber-50 flex items-center justify-center text-xs font-black shrink-0">
                          {customer.fullName ? customer.fullName.charAt(0).toUpperCase() : 'C'}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] uppercase tracking-wider font-bold text-amber-700 leading-none">
                            Welcome
                          </div>
                          <div className="text-sm font-black text-amber-950 truncate">
                            {customerFirstName}
                          </div>
                          <div className="text-[11px] text-stone-500 font-mono">
                            +91 {customer.phone}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          logoutCustomer();
                        }}
                        className="text-xs font-bold text-rose-600 hover:text-rose-700 underline px-2 py-1 shrink-0"
                      >
                        Sign Out
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-amber-200/60">
                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          goToOrders();
                        }}
                        className="py-2 px-2.5 bg-white hover:bg-amber-100/60 text-amber-900 border border-amber-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Clock className="w-3.5 h-3.5 text-amber-800" />
                        <span>My Orders</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          goToProfile();
                        }}
                        className="py-2 px-2.5 bg-white hover:bg-amber-100/60 text-stone-800 border border-amber-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <User className="w-3.5 h-3.5 text-amber-800" />
                        <span>My Profile</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      openOtpModal('', 'signin');
                    }}
                    className="w-full py-2.5 px-3 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    <User className="w-4 h-4" />
                    <span>Customer Sign In / Sign Up</span>
                  </button>
                )}
              </div>

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
