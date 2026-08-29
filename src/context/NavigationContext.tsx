import React, { createContext, useContext, useState, useEffect } from 'react';

export type AppRoute =
  | { path: '/' }
  | { path: '/shop'; category?: string; search?: string }
  | { path: '/categories' }
  | { path: '/product'; slug: string }
  | { path: '/cart' }
  | { path: '/checkout' }
  | { path: '/profile' }
  | { path: '/about' }
  | { path: '/contact' }
  | { path: '/order-success'; orderId: string }
  | { path: '/owner/login' }
  | { path: '/owner/dashboard' }
  | { path: '/owner/products' }
  | { path: '/owner/products/new' }
  | { path: '/owner/products/edit'; productId: string | number }
  | { path: '/owner/outlets' }
  | { path: '/owner/outlets/new' }
  | { path: '/owner/outlets/edit'; outletId: string }
  | { path: '/owner/delivery-zones' }
  | { path: '/manager/dashboard' };

interface NavigationContextType {
  currentRoute: AppRoute;
  navigate: (route: AppRoute) => void;
  goToHome: () => void;
  goToShop: (category?: string, search?: string) => void;
  goToProduct: (slug: string) => void;
  goToCart: () => void;
  goToCheckout: () => void;
  goToProfile: () => void;
  goToAbout: () => void;
  goToContact: () => void;
  goToCategories: () => void;
  goToOrderSuccess: (orderId: string) => void;
  goToOwnerLogin: () => void;
  goToOwnerDashboard: () => void;
  goToOwnerProducts: () => void;
  goToOwnerAddProduct: () => void;
  goToOwnerEditProduct: (productId: string | number) => void;
  goToOwnerOutlets: () => void;
  goToOwnerAddOutlet: () => void;
  goToOwnerEditOutlet: (outletId: string) => void;
  goToOwnerDeliveryZones: () => void;
  goToManagerDashboard: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

// Helper to parse route from URL hash
function parseHash(hash: string): AppRoute {
  const cleanHash = hash.replace(/^#\/?/, '');
  if (!cleanHash || cleanHash === '') return { path: '/' };

  const [main, queryString] = cleanHash.split('?');
  const params = new URLSearchParams(queryString || '');

  // Owner Routes
  if (main === 'owner/login' || main === 'owner-login') {
    return { path: '/owner/login' };
  }
  if (main === 'owner/dashboard' || main === 'owner-dashboard') {
    return { path: '/owner/dashboard' };
  }
  if (main === 'owner/products/new' || main === 'owner-products-new') {
    return { path: '/owner/products/new' };
  }
  if (main.startsWith('owner/products/edit/')) {
    const productId = main.replace('owner/products/edit/', '');
    return { path: '/owner/products/edit', productId };
  }
  if (main.startsWith('owner/products/') && main.endsWith('/edit')) {
    const parts = main.split('/');
    const productId = parts[2];
    return { path: '/owner/products/edit', productId };
  }
  if (main === 'owner/products' || main === 'owner-products') {
    return { path: '/owner/products' };
  }

  // Multi-Outlet Owner Routes
  if (main === 'owner/outlets/new' || main === 'owner-outlets-new') {
    return { path: '/owner/outlets/new' };
  }
  if (main.startsWith('owner/outlets/edit/')) {
    const outletId = main.replace('owner/outlets/edit/', '');
    return { path: '/owner/outlets/edit', outletId };
  }
  if (main === 'owner/outlets' || main === 'owner-outlets') {
    return { path: '/owner/outlets' };
  }
  if (main === 'owner/delivery-zones' || main === 'owner-delivery-zones') {
    return { path: '/owner/delivery-zones' };
  }

  // Outlet Manager Routes
  if (main === 'manager/dashboard' || main === 'manager-dashboard' || main === 'manager') {
    return { path: '/manager/dashboard' };
  }

  // Customer Routes
  if (main === 'shop') {
    return {
      path: '/shop',
      category: params.get('category') || undefined,
      search: params.get('search') || undefined,
    };
  }

  if (main === 'categories') {
    return { path: '/categories' };
  }

  if (main.startsWith('product/')) {
    const slug = main.replace('product/', '');
    return { path: '/product', slug };
  }

  if (main === 'cart') return { path: '/cart' };
  if (main === 'checkout') return { path: '/checkout' };
  if (main === 'profile') return { path: '/profile' };
  if (main === 'about') return { path: '/about' };
  if (main === 'contact') return { path: '/contact' };

  if (main.startsWith('order-success/')) {
    const orderId = main.replace('order-success/', '');
    return { path: '/order-success', orderId };
  }

  return { path: '/' };
}

function routeToHash(route: AppRoute): string {
  switch (route.path) {
    case '/':
      return '#/';
    case '/shop': {
      const params = new URLSearchParams();
      if (route.category) params.set('category', route.category);
      if (route.search) params.set('search', route.search);
      const str = params.toString();
      return str ? `#/shop?${str}` : '#/shop';
    }
    case '/categories':
      return '#/categories';
    case '/product':
      return `#/product/${route.slug}`;
    case '/cart':
      return '#/cart';
    case '/checkout':
      return '#/checkout';
    case '/profile':
      return '#/profile';
    case '/about':
      return '#/about';
    case '/contact':
      return '#/contact';
    case '/order-success':
      return `#/order-success/${route.orderId}`;
    case '/owner/login':
      return '#/owner/login';
    case '/owner/dashboard':
      return '#/owner/dashboard';
    case '/owner/products':
      return '#/owner/products';
    case '/owner/products/new':
      return '#/owner/products/new';
    case '/owner/products/edit':
      return `#/owner/products/edit/${route.productId}`;
    case '/owner/outlets':
      return '#/owner/outlets';
    case '/owner/outlets/new':
      return '#/owner/outlets/new';
    case '/owner/outlets/edit':
      return `#/owner/outlets/edit/${route.outletId}`;
    case '/owner/delivery-zones':
      return '#/owner/delivery-zones';
    case '/manager/dashboard':
      return '#/manager/dashboard';
    default:
      return '#/';
  }
}

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      return parseHash(window.location.hash);
    }
    return { path: '/contact' };
  });

  useEffect(() => {
    const handleHashChange = () => {
      const newRoute = parseHash(window.location.hash);
      setCurrentRoute(newRoute);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (route: AppRoute) => {
    setCurrentRoute(route);
    const hash = routeToHash(route);
    if (window.location.hash !== hash) {
      window.location.hash = hash;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToHome = () => navigate({ path: '/' });
  const goToShop = (category?: string, search?: string) =>
    navigate({ path: '/shop', category, search });
  const goToProduct = (slug: string) => navigate({ path: '/product', slug });
  const goToCart = () => navigate({ path: '/cart' });
  const goToCheckout = () => navigate({ path: '/checkout' });
  const goToProfile = () => navigate({ path: '/profile' });
  const goToAbout = () => navigate({ path: '/about' });
  const goToContact = () => navigate({ path: '/contact' });
  const goToCategories = () => navigate({ path: '/categories' });
  const goToOrderSuccess = (orderId: string) =>
    navigate({ path: '/order-success', orderId });
  const goToOwnerLogin = () => navigate({ path: '/owner/login' });
  const goToOwnerDashboard = () => navigate({ path: '/owner/dashboard' });
  const goToOwnerProducts = () => navigate({ path: '/owner/products' });
  const goToOwnerAddProduct = () => navigate({ path: '/owner/products/new' });
  const goToOwnerEditProduct = (productId: string | number) =>
    navigate({ path: '/owner/products/edit', productId });
  const goToOwnerOutlets = () => navigate({ path: '/owner/outlets' });
  const goToOwnerAddOutlet = () => navigate({ path: '/owner/outlets/new' });
  const goToOwnerEditOutlet = (outletId: string) =>
    navigate({ path: '/owner/outlets/edit', outletId });
  const goToOwnerDeliveryZones = () => navigate({ path: '/owner/delivery-zones' });
  const goToManagerDashboard = () => navigate({ path: '/manager/dashboard' });

  return (
    <NavigationContext.Provider
      value={{
        currentRoute,
        navigate,
        goToHome,
        goToShop,
        goToProduct,
        goToCart,
        goToCheckout,
        goToProfile,
        goToAbout,
        goToContact,
        goToCategories,
        goToOrderSuccess,
        goToOwnerLogin,
        goToOwnerDashboard,
        goToOwnerProducts,
        goToOwnerAddProduct,
        goToOwnerEditProduct,
        goToOwnerOutlets,
        goToOwnerAddOutlet,
        goToOwnerEditOutlet,
        goToOwnerDeliveryZones,
        goToManagerDashboard,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
