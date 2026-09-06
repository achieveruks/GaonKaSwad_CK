import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Product, Category, ProductOutletConfig } from '../types';
import {
  getProducts,
  getCategories,
  getProductBySlug as apiGetProductBySlug,
  createProduct as apiCreateProduct,
  updateProduct as apiUpdateProduct,
  deleteProduct as apiDeleteProduct,
  toggleProductActive as apiToggleActive,
  toggleProductStock as apiToggleStock,
  updateOutletProductConfig as apiUpdateOutletProductConfig,
  batchUpdateOutletProducts as apiBatchUpdateOutletProducts,
} from '../lib/products';
import { useAuth } from './AuthContext';
import { useLocation } from './LocationContext';
import {
  isProductServedAtOutlet,
  isProductInStockAtOutlet,
  isProductFeaturedAtOutlet,
  isProductBestsellerAtOutlet,
  isProductChefSpecialAtOutlet,
} from '../lib/locationService';

interface ProductContextType {
  products: Product[];
  allProducts: Product[]; // Includes inactive for owner views
  activeProducts: Product[];
  outletProducts: Product[]; // Filtered by current selected outlet
  featuredProducts: Product[];
  bestsellerProducts: Product[];
  newArrivals: Product[];
  chefSignatures: Product[];
  categories: Category[];
  isLoading: boolean;
  error: string | null;
  refreshProducts: () => Promise<void>;
  getProductBySlug: (slug: string) => Product | undefined;
  getProductById: (id: string | number) => Product | undefined;
  isAvailableInCurrentOutlet: (productId: string | number) => boolean;
  isServedInCurrentOutlet: (product: Product) => boolean;
  isInStockInCurrentOutlet: (product: Product) => boolean;
  
  // Owner Actions
  addProduct: (productData: Partial<Product>) => Promise<Product>;
  editProduct: (id: string | number, productData: Partial<Product>) => Promise<Product>;
  removeProduct: (id: string | number) => Promise<boolean>;
  toggleActive: (id: string | number) => Promise<Product>;
  toggleStock: (id: string | number) => Promise<Product>;
  updateOutletProduct: (
    outletId: string,
    productId: string | number,
    config: { inStock?: boolean; isFeatured?: boolean; isBestseller?: boolean; isChefSpecial?: boolean; isAssigned?: boolean }
  ) => Promise<Product>;
  batchUpdateOutletProducts: (
    outletId: string,
    updates: {
      productId: string | number;
      isAssigned?: boolean;
      inStock?: boolean;
      isFeatured?: boolean;
      isBestseller?: boolean;
      isChefSpecial?: boolean;
    }[]
  ) => Promise<Product[]>;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const { selectedLocation } = useLocation();
  const [products, setProducts] = useState<Product[]>([]);
  const [dbCategories, setDbCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProductList = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch products and categories in parallel from database
      const [productsData, categoriesData] = await Promise.all([
        getProducts(isAuthenticated, token || undefined),
        getCategories(),
      ]);
      setProducts(productsData);
      setDbCategories(categoriesData);
    } catch (err: any) {
      console.error('Failed to load products in ProductProvider:', err);
      setError('Could not load products. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    fetchProductList();
  }, [fetchProductList]);

  // Active customer-facing products
  const activeProducts = useMemo(() => {
    return products.filter((p) => p.active !== false);
  }, [products]);

  // Products available/served in currently selected outlet
  const outletProducts = useMemo(() => {
    const activeOutletId = selectedLocation?.outletId;
    if (!activeOutletId) {
      return activeProducts;
    }
    return activeProducts.filter((p) => isProductServedAtOutlet(p, activeOutletId));
  }, [activeProducts, selectedLocation?.outletId]);

  // Featured items (evaluated per selected outlet)
  const featuredProducts = useMemo(() => {
    const activeOutletId = selectedLocation?.outletId;
    return outletProducts.filter((p) => isProductFeaturedAtOutlet(p, activeOutletId));
  }, [outletProducts, selectedLocation?.outletId]);

  // Bestsellers (evaluated per selected outlet)
  const bestsellerProducts = useMemo(() => {
    const activeOutletId = selectedLocation?.outletId;
    return outletProducts.filter((p) => isProductBestsellerAtOutlet(p, activeOutletId));
  }, [outletProducts, selectedLocation?.outletId]);

  // New arrivals (for selected outlet)
  const newArrivals = useMemo(() => {
    return outletProducts.filter((p) => p.newArrival);
  }, [outletProducts]);

  // Chef's special (evaluated per selected outlet)
  const chefSignatures = useMemo(() => {
    const activeOutletId = selectedLocation?.outletId;
    return outletProducts.filter((p) => isProductChefSpecialAtOutlet(p, activeOutletId));
  }, [outletProducts, selectedLocation?.outletId]);

  // Dynamic Categories from Supabase DB with live item counts for selected outlet
  const categories = useMemo(() => {
    // If dbCategories loaded from database, calculate counts
    if (dbCategories.length > 0) {
      return dbCategories.map((cat) => {
        const count = outletProducts.filter((p) => p.category === cat.id || p.category === cat.slug).length;
        return {
          ...cat,
          itemCount: count,
        };
      });
    }

    // Fallback: dynamically construct categories from distinct product categories in DB
    const uniqueCategoryIds = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
    return uniqueCategoryIds.map((catId) => {
      const name = catId.charAt(0).toUpperCase() + catId.slice(1).replace(/-/g, ' ');
      const count = outletProducts.filter((p) => p.category === catId).length;
      return {
        id: catId,
        name,
        slug: catId,
        tagline: `Authentic traditional ${name.toLowerCase()}`,
        image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?q=80&w=800&auto=format&fit=crop',
        iconName: 'Utensils',
        itemCount: count,
      };
    });
  }, [dbCategories, products, outletProducts]);

  const isAvailableInCurrentOutlet = useCallback(
    (productId: string | number): boolean => {
      const activeOutletId = selectedLocation?.outletId;
      if (!activeOutletId) return true;
      const product = products.find((p) => String(p.id) === String(productId));
      if (!product) return false;
      return isProductServedAtOutlet(product, activeOutletId);
    },
    [products, selectedLocation?.outletId]
  );

  const isServedInCurrentOutlet = useCallback(
    (product: Product): boolean => {
      const activeOutletId = selectedLocation?.outletId;
      if (!activeOutletId) return true;
      return isProductServedAtOutlet(product, activeOutletId);
    },
    [selectedLocation?.outletId]
  );

  const isInStockInCurrentOutlet = useCallback(
    (product: Product): boolean => {
      const activeOutletId = selectedLocation?.outletId;
      return isProductInStockAtOutlet(product, activeOutletId);
    },
    [selectedLocation?.outletId]
  );

  const getProductBySlug = useCallback(
    (slug?: string): Product | undefined => {
      if (!slug) return undefined;
      const cleanSlug = slug.toLowerCase().trim();
      return (products || []).find((p) => (p?.slug || '').toLowerCase() === cleanSlug);
    },
    [products]
  );

  const getProductById = useCallback(
    (id: string | number): Product | undefined => {
      const idStr = String(id);
      return products.find((p) => String(p.id) === idStr);
    },
    [products]
  );

  // --- Owner Operations ---

  const addProduct = async (productData: Partial<Product>): Promise<Product> => {
    if (!token) throw new Error('Authentication required');
    const newProduct = await apiCreateProduct(productData, token);
    await fetchProductList();
    return newProduct;
  };

  const editProduct = async (id: string | number, productData: Partial<Product>): Promise<Product> => {
    if (!token) throw new Error('Authentication required');
    const updated = await apiUpdateProduct(id, productData, token);
    await fetchProductList();
    return updated;
  };

  const removeProduct = async (id: string | number): Promise<boolean> => {
    if (!token) throw new Error('Authentication required');
    const success = await apiDeleteProduct(id, token);
    if (success) {
      setProducts((prev) => prev.filter((p) => String(p.id) !== String(id)));
    }
    return success;
  };

  const toggleActive = async (id: string | number): Promise<Product> => {
    if (!token) throw new Error('Authentication required');
    const updated = await apiToggleActive(id, token);
    setProducts((prev) =>
      prev.map((p) => (String(p.id) === String(id) ? updated : p))
    );
    return updated;
  };

  const toggleStock = async (id: string | number): Promise<Product> => {
    if (!token) throw new Error('Authentication required');
    const updated = await apiToggleStock(id, token);
    setProducts((prev) =>
      prev.map((p) => (String(p.id) === String(id) ? updated : p))
    );
    return updated;
  };

  const updateOutletProduct = async (
    outletId: string,
    productId: string | number,
    config: { inStock?: boolean; isFeatured?: boolean; isBestseller?: boolean; isChefSpecial?: boolean; isAssigned?: boolean }
  ): Promise<Product> => {
    if (!token) throw new Error('Authentication required');
    const updated = await apiUpdateOutletProductConfig(outletId, productId, config, token);
    setProducts((prev) =>
      prev.map((p) => (String(p.id) === String(productId) ? updated : p))
    );
    return updated;
  };

  const batchUpdateOutletProducts = async (
    outletId: string,
    updates: {
      productId: string | number;
      isAssigned?: boolean;
      inStock?: boolean;
      isFeatured?: boolean;
      isBestseller?: boolean;
      isChefSpecial?: boolean;
    }[]
  ): Promise<Product[]> => {
    if (!token) throw new Error('Authentication required');
    const updatedList = await apiBatchUpdateOutletProducts(outletId, updates, token);
    setProducts(updatedList);
    return updatedList;
  };

  return (
    <ProductContext.Provider
      value={{
        products,
        allProducts: products,
        activeProducts,
        outletProducts,
        featuredProducts,
        bestsellerProducts,
        newArrivals,
        chefSignatures,
        categories,
        isLoading,
        error,
        refreshProducts: fetchProductList,
        getProductBySlug,
        getProductById,
        isAvailableInCurrentOutlet,
        isServedInCurrentOutlet,
        isInStockInCurrentOutlet,
        addProduct,
        editProduct,
        removeProduct,
        toggleActive,
        toggleStock,
        updateOutletProduct,
        batchUpdateOutletProducts,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
};
