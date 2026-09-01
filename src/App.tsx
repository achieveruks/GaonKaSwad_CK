import React from 'react';
import { NavigationProvider, useNavigation } from './context/NavigationContext';
import { CartProvider, useCart } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { ProductProvider } from './context/ProductContext';
import { LocationProvider, useLocation } from './context/LocationContext';
import { CustomerProvider, useCustomer } from './context/CustomerContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { Toast } from './components/Toast';
import { LocationModal } from './components/LocationModal';
import { LocationSwitchModal } from './components/LocationSwitchModal';
import { OtpModal } from './components/OtpModal';

// Customer Pages
import { HomePage } from './pages/HomePage';
import { ShopPage } from './pages/ShopPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { ProfilePage } from './pages/ProfilePage';
import { MyOrdersPage } from './pages/MyOrdersPage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { CategoriesPage } from './pages/CategoriesPage';

// Owner Pages
import { OwnerLoginPage } from './pages/owner/OwnerLoginPage';
import { OwnerDashboardPage } from './pages/owner/OwnerDashboardPage';
import { OwnerProductsPage } from './pages/owner/OwnerProductsPage';
import { OwnerProductFormPage } from './pages/owner/OwnerProductFormPage';
import { OutletsPage } from './pages/owner/OutletsPage';
import { DeliveryZonesPage } from './pages/owner/DeliveryZonesPage';
import { CouponsPage } from './pages/owner/CouponsPage';
import { ManagerDashboardPage } from './pages/manager/ManagerDashboardPage';

const AppContent: React.FC = () => {
  const { currentRoute } = useNavigation();
  const { isLocationModalOpen, setIsLocationModalOpen } = useLocation();
  const { isOtpModalOpen, closeOtpModal, otpModalPhone, otpModalMode, verifyOtp, otpModalOnSuccess } = useCustomer();

  // 1. Outlet Manager Portal Routing
  if (currentRoute.path === '/manager/dashboard') {
    return (
      <>
        <ManagerDashboardPage />
        <Toast />
      </>
    );
  }

  // 2. Owner Portal Routing (Self-contained layout)
  if (currentRoute.path.startsWith('/owner')) {
    switch (currentRoute.path as string) {
      case '/owner':
      case '/owner/login':
        return (
          <>
            <OwnerLoginPage />
            <Toast />
          </>
        );
      case '/owner/dashboard':
        return (
          <>
            <OwnerDashboardPage />
            <Toast />
          </>
        );
      case '/owner/products':
        return (
          <>
            <OwnerProductsPage />
            <Toast />
          </>
        );
      case '/owner/products/new':
        return (
          <>
            <OwnerProductFormPage mode="new" />
            <Toast />
          </>
        );
      case '/owner/products/edit':
        return (
          <>
            <OwnerProductFormPage
              mode="edit"
              productId={(currentRoute as any).productId}
            />
            <Toast />
          </>
        );
      case '/owner/outlets':
      case '/owner/outlets/new':
      case '/owner/outlets/edit':
        return (
          <>
            <OutletsPage />
            <Toast />
          </>
        );
      case '/owner/delivery-zones':
        return (
          <>
            <DeliveryZonesPage />
            <Toast />
          </>
        );
      case '/owner/coupons':
        return (
          <>
            <CouponsPage />
            <Toast />
          </>
        );
      default:
        return (
          <>
            <OwnerDashboardPage />
            <Toast />
          </>
        );
    }
  }

  // 2. Customer Storefront Routing Logic
  const renderCurrentPage = () => {
    switch (currentRoute.path) {
      case '/':
        return <HomePage />;
      case '/shop':
        return <ShopPage />;
      case '/categories':
        return <CategoriesPage />;
      case '/product':
        return <ProductDetailPage slug={currentRoute.slug || 'nizami-royal-dum-mutton-biryani'} />;
      case '/cart':
        return <CartPage />;
      case '/checkout':
        return <CheckoutPage />;
      case '/profile':
        return <ProfilePage />;
      case '/orders':
        return <MyOrdersPage />;
      case '/about':
        return <AboutPage />;
      case '/contact':
        return <ContactPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F9FAFB] text-[#1F2937] selection:bg-orange-600 selection:text-white">
      {/* Sticky Top Navbar */}
      <Navbar />

      {/* Main Page Body */}
      <main className="flex-1">
        {renderCurrentPage()}
      </main>

      {/* Footer */}
      <Footer />

      {/* Cart Drawer Slideout */}
      <CartDrawer />

      {/* Location Modal for Customer Delivery PIN Selector */}
      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
      />

      {/* Location Switch / Cart Conflict Modal */}
      <LocationSwitchModal />

      {/* OTP Verification Modal for Customers */}
      <OtpModal
        isOpen={isOtpModalOpen}
        onClose={closeOtpModal}
        phone={otpModalPhone}
        mode={otpModalMode}
        onVerify={verifyOtp}
        onSuccess={otpModalOnSuccess}
      />

      {/* Dynamic Toast Notifications */}
      <Toast />
    </div>
  );
};

export default function App() {
  return (
    <NavigationProvider>
      <AuthProvider>
        <LocationProvider>
          <ProductProvider>
            <CartProvider>
              <CustomerProvider>
                <AppContent />
              </CustomerProvider>
            </CartProvider>
          </ProductProvider>
        </LocationProvider>
      </AuthProvider>
    </NavigationProvider>
  );
}
