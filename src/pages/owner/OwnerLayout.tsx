import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';
import {
  LayoutDashboard,
  UtensilsCrossed,
  PlusCircle,
  LogOut,
  ExternalLink,
  Store,
  MapPin,
  Menu,
  X,
  Lock,
  ShieldCheck,
  Building2,
  Database,
} from 'lucide-react';

interface OwnerLayoutProps {
  children: React.ReactNode;
  activeTab: 'dashboard' | 'products' | 'new-product' | 'edit-product' | 'outlets' | 'delivery-zones';
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const OwnerLayout: React.FC<OwnerLayoutProps> = ({
  children,
  activeTab,
  title,
  subtitle,
  actions,
}) => {
  const { isAuthenticated, isLoading, ownerUser, profile, authProvider, logout } = useAuth();
  const {
    goToOwnerDashboard,
    goToOwnerProducts,
    goToOwnerAddProduct,
    goToOwnerOutlets,
    goToOwnerDeliveryZones,
    goToOwnerLogin,
    goToHome,
  } = useNavigation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  // Protected Route Guard
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      goToOwnerLogin();
    }
  }, [isAuthenticated, isLoading, goToOwnerLogin]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-amber-800 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-stone-600">Verifying Owner Session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4 font-sans">
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-stone-200 shadow-sm max-w-sm w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center mx-auto border border-amber-200/60">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-stone-900 text-base">Owner Sign-In Required</h3>
            <p className="text-xs text-stone-500 mt-1 leading-relaxed">
              You need active kitchen owner credentials to access this dashboard.
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2">
            <button
              type="button"
              onClick={goToOwnerLogin}
              className="w-full py-2.5 bg-amber-800 hover:bg-amber-900 active:bg-amber-950 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              Sign In to Owner Portal
            </button>
            <button
              type="button"
              onClick={goToHome}
              className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Return to Storefront
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    goToOwnerLogin();
  };

  const userRole = ownerUser?.role || profile?.role || 'owner';
  const isOwner = userRole === 'owner';

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col font-sans">
      {/* Top Owner Navigation Header */}
      <header className="bg-stone-900 text-white border-b border-stone-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo & Portal Badge */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={goToOwnerDashboard}
                className="flex items-center gap-2.5 group text-left cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-800 flex items-center justify-center text-white font-black text-sm shadow-2xs group-hover:bg-amber-700 transition-colors">
                  G
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-sm tracking-tight text-white font-heading">
                      Gaon Ka Swad
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase border ${
                      isOwner
                        ? 'bg-amber-950 text-amber-400 border-amber-800'
                        : 'bg-blue-950 text-blue-400 border-blue-800'
                    }`}>
                      {isOwner ? 'Owner' : 'Manager'}
                    </span>
                  </div>
                  <p className="text-[10px] text-stone-400">Multi-Outlet Cloud Kitchen Control</p>
                </div>
              </button>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              <button
                type="button"
                onClick={goToOwnerDashboard}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-amber-800 text-white'
                    : 'text-stone-300 hover:text-white hover:bg-stone-800'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </button>

              <button
                type="button"
                onClick={goToOwnerProducts}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'products' || activeTab === 'edit-product' || activeTab === 'new-product'
                    ? 'bg-amber-800 text-white'
                    : 'text-stone-300 hover:text-white hover:bg-stone-800'
                }`}
              >
                <UtensilsCrossed className="w-3.5 h-3.5" />
                <span>Menu Products</span>
              </button>

              <button
                type="button"
                onClick={goToOwnerOutlets}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'outlets'
                    ? 'bg-amber-800 text-white'
                    : 'text-stone-300 hover:text-white hover:bg-stone-800'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>Kitchen Outlets</span>
              </button>

              <button
                type="button"
                onClick={goToOwnerDeliveryZones}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'delivery-zones'
                    ? 'bg-amber-800 text-white'
                    : 'text-stone-300 hover:text-white hover:bg-stone-800'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Delivery Zones & PINs</span>
              </button>
            </nav>

            {/* Right Controls: User info, View Site, Logout */}
            <div className="hidden md:flex items-center gap-3">
              <button
                type="button"
                onClick={goToHome}
                className="flex items-center gap-1 text-xs text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 px-2.5 py-1.5 rounded-lg border border-stone-700 transition-colors cursor-pointer"
                title="View customer-facing storefront"
              >
                <ExternalLink className="w-3 h-3 text-stone-400" />
                <span>Live Storefront</span>
              </button>

              <div className="h-4 w-px bg-stone-800" />

              <div className="flex items-center gap-2 text-xs text-stone-300">
                <div className="flex flex-col text-right">
                  <span className="text-[11px] font-medium text-stone-200 truncate max-w-[130px]">
                    {ownerUser?.name || ownerUser?.email || 'achieveruks@gmail.com'}
                  </span>
                  <span className="text-[9px] text-stone-400 flex items-center justify-end gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>Supabase Auth</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 px-2.5 py-1.5 rounded-lg border border-rose-900/50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>

            {/* Mobile Menu Toggle Button */}
            <div className="flex md:hidden items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-stone-300 hover:text-white hover:bg-stone-800 rounded-lg"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Dropdown Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-3 border-t border-stone-800 space-y-1.5">
              <button
                type="button"
                onClick={() => {
                  goToOwnerDashboard();
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${
                  activeTab === 'dashboard' ? 'bg-amber-800 text-white' : 'text-stone-300 hover:bg-stone-800'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  goToOwnerProducts();
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${
                  activeTab === 'products' ? 'bg-amber-800 text-white' : 'text-stone-300 hover:bg-stone-800'
                }`}
              >
                <UtensilsCrossed className="w-4 h-4" />
                <span>Menu Products</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  goToOwnerOutlets();
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${
                  activeTab === 'outlets' ? 'bg-amber-800 text-white' : 'text-stone-300 hover:bg-stone-800'
                }`}
              >
                <Store className="w-4 h-4" />
                <span>Kitchen Outlets</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  goToOwnerDeliveryZones();
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${
                  activeTab === 'delivery-zones' ? 'bg-amber-800 text-white' : 'text-stone-300 hover:bg-stone-800'
                }`}
              >
                <MapPin className="w-4 h-4" />
                <span>Delivery Zones & PINs</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  goToHome();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-stone-300 hover:bg-stone-800"
              >
                <ExternalLink className="w-4 h-4" />
                <span>View Live Storefront</span>
              </button>

              <div className="pt-2 border-t border-stone-800 flex items-center justify-between px-3">
                <span className="text-[11px] text-stone-400 truncate">
                  {ownerUser?.email || 'achieveruks@gmail.com'} ({userRole})
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-1 text-xs text-rose-400 py-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Page Title & Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight font-heading">
              {title}
            </h1>
            {subtitle && <p className="text-xs text-stone-500 mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2.5 flex-wrap">{actions}</div>}
        </div>

        {/* Content Body */}
        {children}
      </main>
    </div>
  );
};

