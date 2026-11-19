import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';
import { ChangePasswordModal } from '../../components/owner/ChangePasswordModal';
import {
  LayoutDashboard,
  UtensilsCrossed,
  PlusCircle,
  LogOut,
  Store,
  MapPin,
  Menu,
  X,
  Lock,
  ShieldCheck,
  Building2,
  Database,
  TicketPercent,
  KeyRound,
  Sparkles,
} from 'lucide-react';

interface OwnerLayoutProps {
  children: React.ReactNode;
  activeTab: 'dashboard' | 'products' | 'new-product' | 'edit-product' | 'outlets' | 'delivery-zones' | 'coupons' | 'utsav-specials';
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
    goToOwnerCoupons,
    goToOwnerUtsavSpecials,
    goToOwnerLogin,
    goToManagerDashboard,
    goToHome,
  } = useNavigation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  // Protected Route Guard & Manager Redirect
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        goToOwnerLogin();
      } else {
        const role = ownerUser?.role || profile?.role;
        if (role === 'outlet_manager') {
          goToManagerDashboard();
        } else if (role !== 'owner') {
          // Block customers or unassigned roles from Owner portal
          goToOwnerLogin();
        }
      }
    }
  }, [isAuthenticated, isLoading, ownerUser, profile, goToOwnerLogin, goToManagerDashboard]);

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

  const role = ownerUser?.role || profile?.role;
  if (!isAuthenticated || role !== 'owner') {
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
  const isProductsActive =
    activeTab === 'products' || activeTab === 'edit-product' || activeTab === 'new-product';

  const navItems: Array<{
    key: string;
    id: string;
    label: string;
    compactSuffix?: string;
    icon: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
  }> = [
    {
      key: 'dashboard',
      id: 'owner-nav-dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />,
      isActive: activeTab === 'dashboard',
      onClick: goToOwnerDashboard,
    },
    {
      key: 'products',
      id: 'owner-nav-products',
      label: 'Menu Products',
      icon: <UtensilsCrossed className="w-3.5 h-3.5 shrink-0" />,
      isActive: isProductsActive,
      onClick: goToOwnerProducts,
    },
    {
      key: 'outlets',
      id: 'owner-nav-outlets',
      label: 'Kitchen Outlets',
      icon: <Building2 className="w-3.5 h-3.5 shrink-0" />,
      isActive: activeTab === 'outlets',
      onClick: goToOwnerOutlets,
    },
    {
      key: 'delivery-zones',
      id: 'owner-nav-delivery-zones',
      label: 'Delivery Zones',
      compactSuffix: ' & PINs',
      icon: <MapPin className="w-3.5 h-3.5 shrink-0" />,
      isActive: activeTab === 'delivery-zones',
      onClick: goToOwnerDeliveryZones,
    },
    {
      key: 'coupons',
      id: 'owner-nav-coupons',
      label: 'Offers',
      compactSuffix: ' & Coupons',
      icon: <TicketPercent className="w-3.5 h-3.5 shrink-0" />,
      isActive: activeTab === 'coupons',
      onClick: goToOwnerCoupons,
    },
    {
      key: 'utsav-specials',
      id: 'owner-nav-utsav',
      label: 'Utsav Specials',
      icon: <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />,
      isActive: activeTab === 'utsav-specials',
      onClick: goToOwnerUtsavSpecials,
    },
  ];

  const mobileNavItems: Array<{
    key: string;
    label: string;
    icon: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
  }> = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
      isActive: activeTab === 'dashboard',
      onClick: goToOwnerDashboard,
    },
    {
      key: 'products',
      label: 'Menu Products',
      icon: <UtensilsCrossed className="w-4 h-4 shrink-0" />,
      isActive: isProductsActive,
      onClick: goToOwnerProducts,
    },
    {
      key: 'outlets',
      label: 'Kitchen Outlets',
      icon: <Building2 className="w-4 h-4 shrink-0" />,
      isActive: activeTab === 'outlets',
      onClick: goToOwnerOutlets,
    },
    {
      key: 'delivery-zones',
      label: 'Delivery Zones & PINs',
      icon: <MapPin className="w-4 h-4 shrink-0" />,
      isActive: activeTab === 'delivery-zones',
      onClick: goToOwnerDeliveryZones,
    },
    {
      key: 'coupons',
      label: 'Promotional Offers',
      icon: <TicketPercent className="w-4 h-4 shrink-0" />,
      isActive: activeTab === 'coupons',
      onClick: goToOwnerCoupons,
    },
    {
      key: 'utsav-specials',
      label: 'Utsav Specials',
      icon: <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />,
      isActive: activeTab === 'utsav-specials',
      onClick: goToOwnerUtsavSpecials,
    },
  ];

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col font-sans">
      {/* Top Owner Navigation Header */}
      <header className="bg-stone-900 text-white border-b border-stone-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3 h-16">
            {/* Brand Logo & Portal Badge */}
            <button
              type="button"
              onClick={goToOwnerDashboard}
              className="flex items-center gap-2.5 group text-left cursor-pointer shrink-0 min-w-0"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-800 flex items-center justify-center text-white font-black text-sm shadow-2xs group-hover:bg-amber-700 transition-colors shrink-0">
                S
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-nowrap">
                  <span className="font-extrabold text-sm tracking-tight text-white font-heading whitespace-nowrap">
                    Swad Click
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase border whitespace-nowrap shrink-0 ${
                      isOwner
                        ? 'bg-amber-950 text-amber-400 border-amber-800'
                        : 'bg-blue-950 text-blue-400 border-blue-800'
                    }`}
                  >
                    {isOwner ? 'Owner' : 'Manager'}
                  </span>
                </div>
                <p className="text-[10px] text-stone-400 truncate max-w-[190px]">
                  Multi-Outlet Cloud Kitchen Control
                </p>
              </div>
            </button>

            {/* Desktop Navigation Options (xl+): Single-row segmented bar without scrollbar */}
            <nav className="hidden xl:flex items-center gap-0.5 2xl:gap-1 bg-stone-800/70 p-1 rounded-xl border border-stone-800 shrink-0">
              {navItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  id={item.id}
                  onClick={item.onClick}
                  className={`flex items-center gap-1.5 px-2 2xl:px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    item.isActive
                      ? 'bg-amber-800 text-white shadow-2xs'
                      : 'text-stone-300 hover:text-white hover:bg-stone-800'
                  }`}
                >
                  {item.icon}
                  <span>
                    {item.label}
                    {item.compactSuffix && (
                      <span className="hidden 2xl:inline">{item.compactSuffix}</span>
                    )}
                  </span>
                </button>
              ))}
            </nav>

            {/* Right Controls (Tablet & Desktop): View Live Storefront, User, Password & Logout */}
            <div className="hidden md:flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={goToHome}
                className="flex items-center justify-center text-xs text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 px-2.5 py-1.5 rounded-lg border border-stone-700 transition-colors cursor-pointer shrink-0"
                title="View Live Storefront"
                aria-label="View Live Storefront"
              >
                <Store className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              </button>

              <div className="h-4 w-px bg-stone-800" />

              <div className="flex items-center gap-2 text-xs text-stone-300">
                <div
                  className="flex flex-col text-right min-w-0 max-w-[115px] 2xl:max-w-[140px]"
                  title={ownerUser?.email || ownerUser?.name || ''}
                >
                  <span className="text-[11px] font-medium text-stone-200 truncate">
                    {ownerUser?.name || ownerUser?.email || 'achieveruks@gmail.com'}
                  </span>
                  <span className="text-[9px] text-stone-400 flex items-center justify-end gap-1 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span>Supabase Auth</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsChangePasswordOpen(true)}
                  className="flex items-center gap-1.5 text-xs text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 px-2.5 py-1.5 rounded-lg border border-stone-700 transition-colors cursor-pointer whitespace-nowrap"
                  title="Change account password"
                  aria-label="Change Password"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="xl:hidden">Change Password</span>
                </button>
                <button
                  type="button"
                  id="owner-logout-btn"
                  onClick={handleLogout}
                  className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 px-2.5 py-1.5 rounded-lg border border-rose-900/50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" />
                  <span>Logout</span>
                </button>
              </div>
            </div>

            {/* Mobile Menu Toggle (< md) */}
            <div className="flex md:hidden items-center shrink-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className="p-2 text-stone-300 hover:text-white hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Tablet / Compact Desktop Secondary Nav Strip (md..xl): No scrollbar */}
          <nav className="hidden md:flex xl:hidden items-center gap-1.5 py-2 border-t border-stone-800/80 flex-wrap">
            {mobileNavItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={item.onClick}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  item.isActive
                    ? 'bg-amber-800 text-white shadow-2xs'
                    : 'text-stone-300 hover:text-white hover:bg-stone-800'
                }`}
              >
                {item.key === 'utsav-specials' ? (
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                ) : item.key === 'dashboard' ? (
                  <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
                ) : item.key === 'products' ? (
                  <UtensilsCrossed className="w-3.5 h-3.5 shrink-0" />
                ) : item.key === 'outlets' ? (
                  <Building2 className="w-3.5 h-3.5 shrink-0" />
                ) : item.key === 'delivery-zones' ? (
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <TicketPercent className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Mobile Dropdown Menu (< md) */}
          {mobileMenuOpen && (
            <div className="md:hidden py-3 border-t border-stone-800 space-y-1.5">
              {mobileNavItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    item.onClick();
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                    item.isActive ? 'bg-amber-800 text-white' : 'text-stone-300 hover:bg-stone-800'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}

              <div className="pt-2 mt-2 border-t border-stone-800 space-y-1.5">
                <div className="px-3 py-1 text-[11px] text-stone-400 truncate">
                  Signed in as {ownerUser?.name || ownerUser?.email || 'achieveruks@gmail.com'} ({userRole})
                </div>

                <button
                  type="button"
                  onClick={() => {
                    goToHome();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-stone-300 hover:bg-stone-800 cursor-pointer"
                >
                  <Store className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>View Live Storefront</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsChangePasswordOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-amber-300 hover:bg-stone-800 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Change Password</span>
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-950/40 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
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

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </div>
  );
};

