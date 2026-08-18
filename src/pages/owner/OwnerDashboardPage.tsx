import React, { useState, useEffect } from 'react';
import { OwnerLayout } from './OwnerLayout';
import { useProducts } from '../../context/ProductContext';
import { useNavigation } from '../../context/NavigationContext';
import { useAuth } from '../../context/AuthContext';
import { getDashboardStats } from '../../lib/products';
import { DashboardStats, Product, Outlet, DeliveryZone } from '../../types';
import { getOutlets, getDeliveryZones } from '../../lib/locationService';
import {
  UtensilsCrossed,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Plus,
  ArrowRight,
  TrendingUp,
  Flame,
  Layers,
  Edit2,
  Eye,
  EyeOff,
  RefreshCw,
  Store,
  MapPin,
  Building,
} from 'lucide-react';

export const OwnerDashboardPage: React.FC = () => {
  const { allProducts, toggleActive, refreshProducts } = useProducts();
  const { token } = useAuth();
  const {
    goToOwnerProducts,
    goToOwnerAddProduct,
    goToOwnerEditProduct,
    goToOwnerOutlets,
    goToOwnerDeliveryZones,
  } = useNavigation();

  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: allProducts.length,
    activeProducts: allProducts.filter((p) => p.active !== false).length,
    outOfStockProducts: allProducts.filter((p) => p.inStock === false).length,
    featuredProducts: allProducts.filter((p) => p.featured && p.active !== false).length,
    bestsellerProducts: allProducts.filter((p) => p.bestseller && p.active !== false).length,
  });
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | number | null>(null);

  // Sync stats and outlet data
  useEffect(() => {
    const fetchStats = async () => {
      setLoadingStats(true);
      try {
        if (token) {
          const data = await getDashboardStats(token);
          setStats(data);
        }
        const [fetchedOutlets, fetchedZones] = await Promise.all([
          getOutlets(true, token || undefined),
          getDeliveryZones(true, token || undefined),
        ]);
        setOutlets(Array.isArray(fetchedOutlets) ? fetchedOutlets : []);
        setZones(Array.isArray(fetchedZones) ? fetchedZones : []);
      } catch (err) {
        console.warn('Using computed stats fallback:', err);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, [token, allProducts]);

  const handleToggleActive = async (id: string | number) => {
    setActionLoadingId(id);
    try {
      await toggleActive(id);
    } catch (err) {
      console.error('Failed to toggle active status:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const safeOutlets = Array.isArray(outlets) ? outlets : [];
  const safeZones = Array.isArray(zones) ? zones : [];
  const recentProducts = allProducts.slice(0, 6);
  const activeOutlets = safeOutlets.filter((o) => o.isActive).length;
  const uniqueCities = Array.from(new Set(safeOutlets.map((o) => o.city)));
  const totalPinsCovered = new Set(safeZones.flatMap((z) => z.pinCodes || [])).size;

  return (
    <OwnerLayout
      activeTab="dashboard"
      title="Owner Dashboard"
      subtitle="Overview of cloud kitchen live catalog, inventory stock, and merchandising."
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refreshProducts()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl border border-gray-200 shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-gray-500 ${loadingStats ? 'animate-spin' : ''}`} />
            <span>Sync Catalog</span>
          </button>
          <button
            type="button"
            onClick={goToOwnerAddProduct}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Product</span>
          </button>
        </div>
      }
    >
      {/* 1. Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Outlets */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Kitchen Outlets
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-900">
              {outlets.length}
            </span>
            <span className="text-[11px] text-amber-700 font-semibold">
              {activeOutlets} active ({uniqueCities.length} {uniqueCities.length === 1 ? 'city' : 'cities'})
            </span>
          </div>
        </div>

        {/* PIN Codes Covered */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              PIN Coverage
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-700">
              {totalPinsCovered}
            </span>
            <span className="text-[11px] text-emerald-600 font-semibold">
              across {zones.length} delivery zones
            </span>
          </div>
        </div>

        {/* Total Dishes */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Menu Dishes
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <UtensilsCrossed className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-gray-950">
              {stats.totalProducts}
            </span>
            <span className="text-[11px] text-gray-500 font-medium">{stats.activeProducts} active</span>
          </div>
        </div>

        {/* Out of Stock Products */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Out of Stock
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-rose-700">
              {stats.outOfStockProducts}
            </span>
            <span className="text-[11px] text-rose-600 font-semibold">Orders paused</span>
          </div>
        </div>
      </div>

      {/* 2. Quick Action Banners */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Outlets Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs space-y-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-gray-900">Manage Kitchen Outlets</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Add new cloud kitchen outlets across Bangalore, Bhubaneswar, and other cities.
            </p>
          </div>
          <button
            type="button"
            onClick={goToOwnerOutlets}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <span>View All {outlets.length} Outlets</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Delivery Zones Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs space-y-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-gray-900">Delivery Zones & PINs</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Map serviceable 6-digit PIN codes, minimum order values, and delivery charges.
            </p>
          </div>
          <button
            type="button"
            onClick={goToOwnerDeliveryZones}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <span>Configure Zones ({zones.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Menu Catalog Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs space-y-3">
          <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-gray-900">Menu Dish Catalog</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Add new dishes, customize culinary stories, adjust prices, or toggle active status.
            </p>
          </div>
          <button
            type="button"
            onClick={goToOwnerProducts}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <span>Manage Catalog ({allProducts.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3. Recent Products Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-extrabold text-base text-gray-900">
              Recent Menu Items
            </h2>
            <p className="text-xs text-gray-500">
              Quickly toggle stock availability and store visibility.
            </p>
          </div>
          <button
            type="button"
            onClick={goToOwnerProducts}
            className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
          >
            <span>View All</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Table on Desktop */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                <th className="py-3 px-4">Dish</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Price</th>
                <th className="py-3 px-3">Served Outlets</th>
                <th className="py-3 px-3">Store Visibility</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {recentProducts.map((product) => {
                const isItemLoading = actionLoadingId === product.id;
                const outletCount = product.outlets ? product.outlets.length : safeOutlets.length;
                const assignedNames = (product.outlets || []).map((o) => {
                  const match = safeOutlets.find((out) => out.id === o.outletId);
                  return match ? match.city || match.name : o.outletId;
                }).join(', ');

                return (
                  <tr key={product.id} className="hover:bg-gray-50/70 transition-colors">
                    {/* Dish name & thumb */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.image}
                          alt={product.name}
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-lg object-cover border border-gray-200 shrink-0"
                        />
                        <div>
                          <p className="font-bold text-gray-900">{product.name}</p>
                          <p className="text-[10px] text-gray-400 font-mono">/{product.slug}</p>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-3">
                      <span className="inline-block bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded capitalize">
                        {product.category}
                      </span>
                    </td>

                    {/* Price */}
                    <td className="py-3 px-3">
                      <div className="font-bold text-gray-900">₹{product.price}</div>
                      {product.originalPrice && (
                        <div className="text-[10px] text-gray-400 line-through">
                          ₹{product.originalPrice}
                        </div>
                      )}
                    </td>

                    {/* Served Outlets (Count) */}
                    <td className="py-3 px-3">
                      <span
                        title={assignedNames || `${outletCount} outlets`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold rounded-md"
                      >
                        ({outletCount}) {outletCount === 1 ? 'outlet' : 'outlets'}
                      </span>
                    </td>

                    {/* Active toggle */}
                    <td className="py-3 px-3">
                      <button
                        type="button"
                        disabled={isItemLoading}
                        onClick={() => handleToggleActive(product.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors cursor-pointer ${
                          product.active !== false
                            ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                            : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                        }`}
                        title="Click to toggle Store Visibility"
                      >
                        {product.active !== false ? (
                          <>
                            <Eye className="w-3 h-3 text-blue-600" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3 text-gray-500" />
                            <span>Inactive</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => goToOwnerEditProduct(product.id)}
                        className="inline-flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-semibold px-2 py-1 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="sm:hidden divide-y divide-gray-100">
          {recentProducts.map((product) => {
            const outletCount = product.outlets ? product.outlets.length : safeOutlets.length;
            const assignedNames = (product.outlets || []).map((o) => {
              const match = safeOutlets.find((out) => out.id === o.outletId);
              return match ? match.city || match.name : o.outletId;
            }).join(', ');

            return (
              <div key={product.id} className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <img
                    src={product.image}
                    alt={product.name}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-lg object-cover border border-gray-200 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-xs truncate">{product.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-gray-500 capitalize">{product.category}</span>
                      <span
                        title={assignedNames || `${outletCount} outlets`}
                        className="text-[10px] bg-amber-50 text-amber-900 border border-amber-200 px-1.5 py-0.2 rounded font-semibold"
                      >
                        ({outletCount}) {outletCount === 1 ? 'outlet' : 'outlets'}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-gray-900 mt-0.5">₹{product.price}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => goToOwnerEditProduct(product.id)}
                    className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(product.id)}
                    className={`w-full py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 border cursor-pointer ${
                      product.active !== false
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-gray-100 text-gray-600 border-gray-200'
                    }`}
                  >
                    {product.active !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>{product.active !== false ? 'Active in Catalog' : 'Hidden / Inactive'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </OwnerLayout>
  );
};
