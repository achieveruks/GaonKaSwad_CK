import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Outlet, DeliveryZone, UserLocationState } from '../types';
import {
  getOutlets,
  getDeliveryZones,
  getOutletById,
  getDeliveryZoneByPinCode,
  checkPinCodeOnline,
  createOutletApi,
  updateOutletApi,
  toggleOutletActiveApi,
  createZoneApi,
  updateZoneApi,
  deleteZoneApi,
} from '../lib/locationService';
import { useAuth } from './AuthContext';

const LOCATION_STORAGE_KEY = 'gaonkaswad_location_v1';

interface LocationContextType {
  selectedLocation: UserLocationState | null;
  outlets: Outlet[];
  allOutlets: Outlet[]; // Includes inactive for owner
  deliveryZones: DeliveryZone[];
  allDeliveryZones: DeliveryZone[];
  currentOutlet: Outlet | null;
  currentZone: DeliveryZone | null;
  isLoading: boolean;
  
  // UI Modal State
  isLocationModalOpen: boolean;
  setIsLocationModalOpen: (open: boolean) => void;
  
  // Confirmation state for changing location with items in cart
  pendingLocation: {
    pinCode: string;
    outlet: Outlet;
    zone: DeliveryZone;
  } | null;
  isSwitchConfirmOpen: boolean;
  
  // Actions
  requestLocationChange: (
    pinCode: string,
    outlet: Outlet,
    zone: DeliveryZone,
    hasCartItems: boolean,
    onDirectSuccess?: () => void
  ) => void;
  confirmLocationSwitch: (clearCartCallback: () => void) => void;
  cancelLocationSwitch: () => void;
  clearLocation: () => void;
  refreshLocations: () => Promise<void>;
  
  // Owner Actions
  addOutlet: (outletData: Partial<Outlet>) => Promise<Outlet>;
  editOutlet: (id: string, outletData: Partial<Outlet>) => Promise<Outlet>;
  toggleOutletActive: (id: string) => Promise<Outlet>;
  addDeliveryZone: (zoneData: Partial<DeliveryZone>) => Promise<DeliveryZone>;
  editDeliveryZone: (id: string, zoneData: Partial<DeliveryZone>) => Promise<DeliveryZone>;
  removeDeliveryZone: (id: string) => Promise<boolean>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Restore customer location from localStorage
  const [selectedLocation, setSelectedLocation] = useState<UserLocationState | null>(() => {
    try {
      const saved = localStorage.getItem(LOCATION_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [pendingLocation, setPendingLocation] = useState<{
    pinCode: string;
    outlet: Outlet;
    zone: DeliveryZone;
  } | null>(null);

  // Load Outlets & Zones from Server/Cache
  const fetchLocationsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedOutlets, fetchedZones] = await Promise.all([
        getOutlets(isAuthenticated, token || undefined),
        getDeliveryZones(isAuthenticated, token || undefined),
      ]);
      setOutlets(Array.isArray(fetchedOutlets) ? fetchedOutlets : []);
      setDeliveryZones(Array.isArray(fetchedZones) ? fetchedZones : []);
    } catch (err) {
      console.error('Failed to fetch outlets & zones:', err);
      setOutlets([]);
      setDeliveryZones([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    fetchLocationsData();
  }, [fetchLocationsData]);

  // Persist selected location to LocalStorage
  useEffect(() => {
    try {
      if (selectedLocation) {
        localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(selectedLocation));
      } else {
        localStorage.removeItem(LOCATION_STORAGE_KEY);
      }
    } catch (e) {
      console.error('Failed to persist location in localStorage:', e);
    }
  }, [selectedLocation]);

  // Active Outlets and Zones
  const safeOutlets = Array.isArray(outlets) ? outlets : [];
  const safeZones = Array.isArray(deliveryZones) ? deliveryZones : [];

  const activeOutlets = useMemo(() => safeOutlets.filter((o) => o.isActive), [safeOutlets]);
  const activeZones = useMemo(() => safeZones.filter((z) => z.isActive), [safeZones]);

  // Current outlet and zone derived from selectedLocation
  const currentOutlet = useMemo(() => {
    if (!selectedLocation?.outletId) return null;
    return getOutletById(selectedLocation.outletId, safeOutlets) || null;
  }, [selectedLocation, safeOutlets]);

  const currentZone = useMemo(() => {
    if (!selectedLocation?.pinCode) return null;
    return getDeliveryZoneByPinCode(selectedLocation.pinCode, safeZones) || null;
  }, [selectedLocation, safeZones]);

  // Handle location selection with outlet switch guard
  const requestLocationChange = useCallback(
    (
      pinCode: string,
      outlet: Outlet,
      zone: DeliveryZone,
      hasCartItems: boolean,
      onDirectSuccess?: () => void
    ) => {
      // If customer already has items from another outlet, ask confirmation before switching!
      if (hasCartItems && selectedLocation && selectedLocation.outletId !== outlet.id) {
        setPendingLocation({ pinCode, outlet, zone });
        return;
      }

      // Direct switch
      setSelectedLocation({
        pinCode,
        outletId: outlet.id,
        outletName: outlet.name,
        cityName: outlet.city,
        stateName: outlet.state,
        address: outlet.address,
        deliveryFee: zone.deliveryFee,
        minimumOrderValue: outlet.minimumOrderValue ?? 200,
        freeDeliveryThreshold: outlet.freeDeliveryThreshold ?? 499,
        packagingFee: outlet.packagingFee ?? 25,
      });
      setIsLocationModalOpen(false);
      setPendingLocation(null);
      if (onDirectSuccess) onDirectSuccess();
    },
    [selectedLocation]
  );

  const confirmLocationSwitch = useCallback(
    (clearCartCallback: () => void) => {
      if (!pendingLocation) return;
      clearCartCallback();
      setSelectedLocation({
        pinCode: pendingLocation.pinCode,
        outletId: pendingLocation.outlet.id,
        outletName: pendingLocation.outlet.name,
        cityName: pendingLocation.outlet.city,
        stateName: pendingLocation.outlet.state,
        address: pendingLocation.outlet.address,
        deliveryFee: pendingLocation.zone.deliveryFee,
        minimumOrderValue: pendingLocation.outlet.minimumOrderValue ?? 200,
        freeDeliveryThreshold: pendingLocation.outlet.freeDeliveryThreshold ?? 499,
        packagingFee: pendingLocation.outlet.packagingFee ?? 25,
      });
      setPendingLocation(null);
      setIsLocationModalOpen(false);
    },
    [pendingLocation]
  );

  const cancelLocationSwitch = useCallback(() => {
    setPendingLocation(null);
  }, []);

  const clearLocation = useCallback(() => {
    setSelectedLocation(null);
  }, []);

  // Owner Actions
  const addOutlet = async (outletData: Partial<Outlet>): Promise<Outlet> => {
    if (!token) throw new Error('Authentication required');
    const created = await createOutletApi(outletData, token);
    await fetchLocationsData();
    return created;
  };

  const editOutlet = async (id: string, outletData: Partial<Outlet>): Promise<Outlet> => {
    if (!token) throw new Error('Authentication required');
    const updated = await updateOutletApi(id, outletData, token);
    await fetchLocationsData();
    return updated;
  };

  const toggleOutletActive = async (id: string): Promise<Outlet> => {
    if (!token) throw new Error('Authentication required');
    const updated = await toggleOutletActiveApi(id, token);
    await fetchLocationsData();
    return updated;
  };

  const addDeliveryZone = async (zoneData: Partial<DeliveryZone>): Promise<DeliveryZone> => {
    if (!token) throw new Error('Authentication required');
    const created = await createZoneApi(zoneData, token);
    await fetchLocationsData();
    return created;
  };

  const editDeliveryZone = async (id: string, zoneData: Partial<DeliveryZone>): Promise<DeliveryZone> => {
    if (!token) throw new Error('Authentication required');
    const updated = await updateZoneApi(id, zoneData, token);
    await fetchLocationsData();
    return updated;
  };

  const removeDeliveryZone = async (id: string): Promise<boolean> => {
    if (!token) throw new Error('Authentication required');
    const deleted = await deleteZoneApi(id, token);
    await fetchLocationsData();
    return deleted;
  };

  return (
    <LocationContext.Provider
      value={{
        selectedLocation,
        outlets: activeOutlets,
        allOutlets: outlets,
        deliveryZones: activeZones,
        allDeliveryZones: deliveryZones,
        currentOutlet,
        currentZone,
        isLoading,
        isLocationModalOpen,
        setIsLocationModalOpen,
        pendingLocation,
        isSwitchConfirmOpen: !!pendingLocation,
        requestLocationChange,
        confirmLocationSwitch,
        cancelLocationSwitch,
        clearLocation,
        refreshLocations: fetchLocationsData,
        addOutlet,
        editOutlet,
        toggleOutletActive,
        addDeliveryZone,
        editDeliveryZone,
        removeDeliveryZone,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};
