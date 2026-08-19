import fs from 'fs';
import path from 'path';
import { Product, Outlet, DeliveryZone, Order, DashboardStats } from '../src/types';
import { PRODUCTS as INITIAL_PRODUCTS } from '../src/data/products';
import { INITIAL_OUTLETS, INITIAL_DELIVERY_ZONES } from '../src/data/outlets';

const DATA_DIR = path.join(process.cwd(), 'data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products_store.json');
const OUTLETS_FILE = path.join(DATA_DIR, 'outlets_store.json');
const ZONES_FILE = path.join(DATA_DIR, 'zones_store.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders_store.json');

const ALL_INITIAL_OUTLET_IDS = INITIAL_OUTLETS.map((o) => o.id);

class AppStorage {
  private products: Product[] = [];
  private outlets: Outlet[] = [];
  private zones: DeliveryZone[] = [];
  private orders: Order[] = [];
  private isInitialized = false;

  constructor() {
    this.init();
  }

  private init() {
    if (this.isInitialized) return;

    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      // 1. Initialize Outlets
      if (fs.existsSync(OUTLETS_FILE)) {
        const raw = fs.readFileSync(OUTLETS_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.outlets = parsed.map((o: any) => ({
            ...o,
            packagingFee: o.packagingFee !== undefined ? Number(o.packagingFee) : 25,
            avgCookingTime: o.avgCookingTime || o.estimatedDeliveryTime || '25-35 mins',
            heroFireLine: o.heroFireLine || 'ARTISANAL CLOUD KITCHEN • SLOW-COOKED DUM',
            heroHeader: o.heroHeader || 'Authentic Indian Flavors, Slow-Cooked to Perfection',
            heroDescription:
              o.heroDescription ||
              'Experience royal dum biryanis, 24-hour slow-simmered dal makhani, and smoky clay-oven tandoori grills, delivered piping hot to your doorstep in sealed eco-handis.',
            trustBadgeRating: o.trustBadgeRating || '4.9 ★ (2.8k+)',
            trustBadgeRatingSub: o.trustBadgeRatingSub || 'Google & Zomato',
            trustBadgeUsp: o.trustBadgeUsp || '100% Pure',
            trustBadgeUspSub: o.trustBadgeUspSub || 'Desi Ghee Recipe',
          }));
        } else {
          this.outlets = [...INITIAL_OUTLETS];
          this.saveOutlets();
        }
      } else {
        this.outlets = [...INITIAL_OUTLETS];
        this.saveOutlets();
      }

      // 2. Initialize Delivery Zones
      if (fs.existsSync(ZONES_FILE)) {
        const raw = fs.readFileSync(ZONES_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.zones = parsed;
        } else {
          this.zones = [...INITIAL_DELIVERY_ZONES];
          this.saveZones();
        }
      } else {
        this.zones = [...INITIAL_DELIVERY_ZONES];
        this.saveZones();
      }

      // 3. Initialize Products
      const activeOutletIds = this.outlets.map((o) => o.id);
      const normalizeProductOutlets = (p: any): Product => {
        let outlets: any[] = [];
        if (Array.isArray(p.outlets)) {
          outlets = p.outlets.map((o: any) =>
            typeof o === 'string'
              ? { outletId: o, inStock: p.inStock !== false, isFeatured: !!p.featured, isBestseller: !!p.bestseller }
              : {
                  outletId: o.outletId || o.id,
                  inStock: o.inStock !== false,
                  isFeatured: !!o.isFeatured,
                  isBestseller: !!o.isBestseller,
                }
          );
        } else if (Array.isArray(p.outletIds)) {
          outlets = p.outletIds.map((oid: string) => ({
            outletId: oid,
            inStock: p.inStock !== false,
            isFeatured: !!p.featured,
            isBestseller: !!p.bestseller,
          }));
        } else {
          outlets = activeOutletIds.map((oid) => ({
            outletId: oid,
            inStock: p.inStock !== false,
            isFeatured: !!p.featured,
            isBestseller: !!p.bestseller,
          }));
        }

        const outletIds = outlets.map((o) => o.outletId);

        return {
          ...p,
          active: p.active !== false,
          inStock: p.inStock !== false,
          outlets,
          outletIds,
        };
      };

      if (fs.existsSync(PRODUCTS_FILE)) {
        const raw = fs.readFileSync(PRODUCTS_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.products = parsed.map(normalizeProductOutlets);
        } else {
          this.products = INITIAL_PRODUCTS.map(normalizeProductOutlets);
          this.saveProducts();
        }
      } else {
        this.products = INITIAL_PRODUCTS.map(normalizeProductOutlets);
        this.saveProducts();
      }

      // 4. Initialize Orders
      if (fs.existsSync(ORDERS_FILE)) {
        const raw = fs.readFileSync(ORDERS_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.orders = parsed;
        }
      }

      this.isInitialized = true;
    } catch (err) {
      console.warn('Storage init fallback:', err);
      this.outlets = [...INITIAL_OUTLETS];
      this.zones = [...INITIAL_DELIVERY_ZONES];
      const activeIds = ALL_INITIAL_OUTLET_IDS;
      this.products = INITIAL_PRODUCTS.map((p) => ({
        ...p,
        active: p.active !== false,
        inStock: p.inStock !== false,
        outlets: activeIds.map((oid) => ({
          outletId: oid,
          inStock: true,
          isFeatured: !!p.featured,
          isBestseller: !!p.bestseller,
        })),
        outletIds: activeIds,
      }));
      this.isInitialized = true;
    }
  }

  private saveProducts() {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(this.products, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write products to disk:', err);
    }
  }

  private saveOutlets() {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(OUTLETS_FILE, JSON.stringify(this.outlets, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write outlets to disk:', err);
    }
  }

  private saveZones() {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(ZONES_FILE, JSON.stringify(this.zones, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write delivery zones to disk:', err);
    }
  }

  private saveOrders() {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(ORDERS_FILE, JSON.stringify(this.orders, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write orders to disk:', err);
    }
  }

  // =====================
  // PRODUCTS METHODS
  // =====================

  public getAllProducts(includeInactive = false, outletId?: string): Product[] {
    this.init();
    let list = this.products;
    if (!includeInactive) {
      list = list.filter((p) => p.active !== false);
    }
    if (outletId) {
      list = list.filter((p) => {
        if (p.outlets && Array.isArray(p.outlets) && p.outlets.length > 0) {
          return p.outlets.some((o) => o.outletId === outletId);
        }
        if (p.outletIds && Array.isArray(p.outletIds) && p.outletIds.length > 0) {
          return p.outletIds.includes(outletId);
        }
        return true;
      });
    }
    return list;
  }

  public getProductById(id: string | number): Product | undefined {
    this.init();
    const idStr = String(id);
    return this.products.find((p) => String(p.id) === idStr);
  }

  public getProductBySlug(slug?: string): Product | undefined {
    this.init();
    if (!slug) return undefined;
    const cleanSlug = slug.toLowerCase().trim();
    return this.products.find((p) => (p?.slug || '').toLowerCase() === cleanSlug);
  }

  public createProduct(data: Partial<Product>): Product {
    this.init();

    if (!data.name || !data.name.trim()) {
      throw new Error('Product name is required');
    }
    if (data.price === undefined || isNaN(Number(data.price)) || Number(data.price) <= 0) {
      throw new Error('Valid positive price is required');
    }
    if (!data.category) {
      throw new Error('Category is required');
    }

    let baseSlug = (data.slug || data.name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    if (!baseSlug) baseSlug = 'product';

    let uniqueSlug = baseSlug;
    let counter = 1;
    while (this.products.some((p) => p.slug === uniqueSlug)) {
      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    const maxNumId = this.products.reduce((max, p) => {
      const num = typeof p.id === 'number' ? p.id : parseInt(String(p.id).replace(/\D/g, ''), 10);
      return !isNaN(num) && num > max ? num : max;
    }, 100);
    const newId = maxNumId + 1;

    // Process outlets configuration
    const activeOutletIds = this.outlets.filter((o) => o.isActive).map((o) => o.id);
    let outletsConfig: any[] = [];

    if (Array.isArray(data.outlets) && data.outlets.length > 0) {
      outletsConfig = data.outlets.map((o: any) =>
        typeof o === 'string'
          ? { outletId: o, inStock: true, isFeatured: false, isBestseller: false }
          : {
              outletId: o.outletId,
              inStock: o.inStock !== false,
              isFeatured: !!o.isFeatured,
              isBestseller: !!o.isBestseller,
            }
      );
    } else if (Array.isArray(data.outletIds) && data.outletIds.length > 0) {
      outletsConfig = data.outletIds.map((oid) => ({
        outletId: oid,
        inStock: data.inStock !== false,
        isFeatured: !!data.featured,
        isBestseller: !!data.bestseller,
      }));
    } else {
      outletsConfig = activeOutletIds.map((oid) => ({
        outletId: oid,
        inStock: true,
        isFeatured: false,
        isBestseller: false,
      }));
    }

    const assignedOutletIds = outletsConfig.map((o) => o.outletId);

    const newProduct: Product = {
      id: newId,
      name: data.name.trim(),
      hindiName: data.hindiName?.trim() || undefined,
      slug: uniqueSlug,
      shortDescription: data.shortDescription?.trim() || data.description?.slice(0, 100) || '',
      description: data.description?.trim() || '',
      story: data.story?.trim() || undefined,
      culinaryTitle: data.culinaryTitle?.trim() || undefined,
      cookingMethodTitle: data.cookingMethodTitle?.trim() || undefined,
      cookingMethodDesc: data.cookingMethodDesc?.trim() || undefined,
      aromaTitle: data.aromaTitle?.trim() || undefined,
      aromaDesc: data.aromaDesc?.trim() || undefined,
      price: Number(data.price),
      originalPrice: data.originalPrice ? Number(data.originalPrice) : undefined,
      category: data.category,
      rating: data.rating ? Number(data.rating) : 4.8,
      reviewsCount: data.reviewsCount ? Number(data.reviewsCount) : 1,
      image: data.image?.trim() || 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=800&auto=format&fit=crop',
      galleryImages: data.galleryImages && data.galleryImages.length > 0 ? data.galleryImages : [data.image || 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=800&auto=format&fit=crop'],
      isVeg: data.isVeg !== false,
      isJainFriendly: !!data.isJainFriendly,
      spiceLevel: data.spiceLevel || 'Medium',
      prepTimeMinutes: data.prepTimeMinutes ? Number(data.prepTimeMinutes) : 30,
      serves: data.serves?.trim() || 'Serves 1-2',
      calories: data.calories ? Number(data.calories) : undefined,
      featured: !!data.featured,
      bestseller: !!data.bestseller,
      newArrival: data.newArrival !== undefined ? !!data.newArrival : true,
      chefSpecial: !!data.chefSpecial,
      active: data.active !== false,
      inStock: data.inStock !== false,
      outlets: outletsConfig,
      outletIds: assignedOutletIds,
      ingredients: Array.isArray(data.ingredients) && data.ingredients.length > 0
        ? data.ingredients
        : ['Pure Cow Ghee', 'Heirloom Spices', 'Fresh Ingredients'],
      allergens: data.allergens || [],
      variants: data.variants || [],
      addons: data.addons || [],
      reviewsList: data.reviewsList || [],
    };

    this.products.unshift(newProduct);
    this.saveProducts();
    return newProduct;
  }

  public updateProduct(id: string | number, data: Partial<Product>): Product | null {
    this.init();
    const idStr = String(id);
    const index = this.products.findIndex((p) => String(p.id) === idStr);
    if (index === -1) return null;

    const existing = this.products[index];

    if (data.slug && data.slug !== existing.slug) {
      const cleanSlug = data.slug.toLowerCase().trim();
      const duplicate = this.products.find(
        (p) => String(p.id) !== idStr && p.slug.toLowerCase() === cleanSlug
      );
      if (duplicate) {
        throw new Error(`Slug "${data.slug}" is already in use by another product`);
      }
    }

    let updatedOutlets = existing.outlets ? [...existing.outlets] : [];
    if (data.outlets !== undefined) {
      updatedOutlets = data.outlets.map((o: any) =>
        typeof o === 'string'
          ? { outletId: o, inStock: true, isFeatured: false, isBestseller: false }
          : {
              outletId: o.outletId,
              inStock: o.inStock !== false,
              isFeatured: !!o.isFeatured,
              isBestseller: !!o.isBestseller,
            }
      );
    } else if (data.outletIds !== undefined) {
      // Retain configurations for kept outletIds, add new defaults if added
      updatedOutlets = data.outletIds.map((oid) => {
        const prev = existing.outlets?.find((o) => o.outletId === oid);
        return prev || { outletId: oid, inStock: true, isFeatured: false, isBestseller: false };
      });
    }

    const updatedOutletIds = updatedOutlets.map((o) => o.outletId);

    const updated: Product = {
      ...existing,
      ...data,
      id: existing.id,
      name: data.name !== undefined ? data.name.trim() : existing.name,
      slug: data.slug !== undefined ? data.slug.toLowerCase().trim() : existing.slug,
      price: data.price !== undefined ? Number(data.price) : existing.price,
      originalPrice: data.originalPrice !== undefined ? (data.originalPrice ? Number(data.originalPrice) : undefined) : existing.originalPrice,
      category: data.category !== undefined ? data.category : existing.category,
      active: data.active !== undefined ? !!data.active : existing.active !== false,
      inStock: data.inStock !== undefined ? !!data.inStock : existing.inStock !== false,
      featured: data.featured !== undefined ? !!data.featured : existing.featured,
      bestseller: data.bestseller !== undefined ? !!data.bestseller : existing.bestseller,
      outlets: updatedOutlets,
      outletIds: updatedOutletIds,
      image: data.image !== undefined ? data.image.trim() : existing.image,
      description: data.description !== undefined ? data.description.trim() : existing.description,
      shortDescription: data.shortDescription !== undefined ? data.shortDescription.trim() : existing.shortDescription,
      story: data.story !== undefined ? (data.story ? data.story.trim() : undefined) : existing.story,
      culinaryTitle: data.culinaryTitle !== undefined ? (data.culinaryTitle ? data.culinaryTitle.trim() : undefined) : existing.culinaryTitle,
      cookingMethodTitle: data.cookingMethodTitle !== undefined ? (data.cookingMethodTitle ? data.cookingMethodTitle.trim() : undefined) : existing.cookingMethodTitle,
      cookingMethodDesc: data.cookingMethodDesc !== undefined ? (data.cookingMethodDesc ? data.cookingMethodDesc.trim() : undefined) : existing.cookingMethodDesc,
      aromaTitle: data.aromaTitle !== undefined ? (data.aromaTitle ? data.aromaTitle.trim() : undefined) : existing.aromaTitle,
      aromaDesc: data.aromaDesc !== undefined ? (data.aromaDesc ? data.aromaDesc.trim() : undefined) : existing.aromaDesc,
    };

    this.products[index] = updated;
    this.saveProducts();
    return updated;
  }

  public updateOutletProductConfig(
    outletId: string,
    productId: string | number,
    config: { inStock?: boolean; isFeatured?: boolean; isBestseller?: boolean; isAssigned?: boolean; assigned?: boolean }
  ): Product | null {
    this.init();
    const idStr = String(productId);
    const index = this.products.findIndex((p) => String(p.id) === idStr);
    if (index === -1) return null;

    const product = this.products[index];
    let outlets = Array.isArray(product.outlets) ? [...product.outlets] : [];

    const isAssigned = config.isAssigned !== undefined ? config.isAssigned : config.assigned;
    if (isAssigned === false) {
      outlets = outlets.filter((o) => o.outletId !== outletId);
    } else {
      const existingIdx = outlets.findIndex((o) => o.outletId === outletId);
      if (existingIdx >= 0) {
        outlets[existingIdx] = {
          ...outlets[existingIdx],
          inStock: config.inStock !== undefined ? config.inStock : outlets[existingIdx].inStock,
          isFeatured: config.isFeatured !== undefined ? config.isFeatured : outlets[existingIdx].isFeatured,
          isBestseller: config.isBestseller !== undefined ? config.isBestseller : outlets[existingIdx].isBestseller,
        };
      } else {
        outlets.push({
          outletId,
          inStock: config.inStock !== undefined ? config.inStock : true,
          isFeatured: !!config.isFeatured,
          isBestseller: !!config.isBestseller,
        });
      }
    }

    const outletIds = outlets.map((o) => o.outletId);
    this.products[index] = {
      ...product,
      outlets,
      outletIds,
    };

    this.saveProducts();
    return this.products[index];
  }

  public batchUpdateOutletProducts(
    outletId: string,
    updates: {
      productId: string | number;
      isAssigned?: boolean;
      inStock?: boolean;
      isFeatured?: boolean;
      isBestseller?: boolean;
    }[]
  ): Product[] {
    this.init();
    updates.forEach((item) => {
      this.updateOutletProductConfig(outletId, item.productId, {
        isAssigned: item.isAssigned,
        inStock: item.inStock,
        isFeatured: item.isFeatured,
        isBestseller: item.isBestseller,
      });
    });

    this.saveProducts();
    return this.getAllProducts(true);
  }

  public deleteProduct(id: string | number): boolean {
    this.init();
    const idStr = String(id);
    const initialLen = this.products.length;
    this.products = this.products.filter((p) => String(p.id) !== idStr);
    const deleted = this.products.length < initialLen;
    if (deleted) {
      this.saveProducts();
    }
    return deleted;
  }

  public toggleProductActive(id: string | number): Product | null {
    this.init();
    const product = this.getProductById(id);
    if (!product) return null;
    return this.updateProduct(id, { active: product.active === false });
  }

  public toggleProductStock(id: string | number): Product | null {
    this.init();
    const product = this.getProductById(id);
    if (!product) return null;
    return this.updateProduct(id, { inStock: product.inStock === false });
  }

  // =====================
  // OUTLETS METHODS
  // =====================

  public getAllOutlets(includeInactive = false): Outlet[] {
    this.init();
    if (includeInactive) return [...this.outlets];
    return this.outlets.filter((o) => o.isActive);
  }

  public getOutletById(id: string): Outlet | undefined {
    this.init();
    return this.outlets.find((o) => o.id === id);
  }

  public getOutletsByCity(city?: string): Outlet[] {
    this.init();
    if (!city) return [];
    const cleanCity = city.toLowerCase().trim();
    return this.outlets.filter((o) => (o?.city || '').toLowerCase().trim() === cleanCity && o?.isActive);
  }

  public createOutlet(data: Partial<Outlet>): Outlet {
    this.init();

    if (!data.name || !data.name.trim()) throw new Error('Outlet name is required');
    if (!data.city || !data.city.trim()) throw new Error('City is required');

    const cleanCity = data.city.trim();
    let cleanState = (data.state || '').trim();
    if (!cleanState) {
      const cityLower = cleanCity.toLowerCase();
      if (cityLower.includes('bangalore') || cityLower.includes('bengaluru') || cityLower.includes('mysore') || cityLower.includes('mangalore')) {
        cleanState = 'Karnataka';
      } else if (cityLower.includes('bhubaneswar') || cityLower.includes('cuttack') || cityLower.includes('puri') || cityLower.includes('odisha')) {
        cleanState = 'Odisha';
      } else if (cityLower.includes('mumbai') || cityLower.includes('pune') || cityLower.includes('nagpur') || cityLower.includes('maharashtra')) {
        cleanState = 'Maharashtra';
      } else if (cityLower.includes('delhi') || cityLower.includes('noida') || cityLower.includes('gurgaon') || cityLower.includes('gurugram')) {
        cleanState = 'Delhi NCR';
      } else if (cityLower.includes('hyderabad')) {
        cleanState = 'Telangana';
      } else if (cityLower.includes('chennai')) {
        cleanState = 'Tamil Nadu';
      } else if (cityLower.includes('kolkata')) {
        cleanState = 'West Bengal';
      } else {
        cleanState = cleanCity;
      }
    }

    if (!data.address || !data.address.trim()) throw new Error('Address is required');

    // Generate unique slug id e.g. "blr-sarjapur"
    let baseId = (data.id || `${cleanCity.slice(0, 3).toLowerCase()}-${data.name.replace(/gaon ka swad/gi, '').trim().toLowerCase()}`)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    if (!baseId) baseId = `outlet-${Date.now()}`;

    let uniqueId = baseId;
    let counter = 1;
    while (this.outlets.some((o) => o.id === uniqueId)) {
      uniqueId = `${baseId}-${counter}`;
      counter++;
    }

    const newOutlet: Outlet = {
      id: uniqueId,
      name: data.name.trim(),
      city: cleanCity,
      state: cleanState,
      address: data.address.trim(),
      phone: data.phone?.trim() || undefined,
      email: data.email?.trim() || undefined,
      minimumOrderValue: data.minimumOrderValue !== undefined ? Math.max(0, Number(data.minimumOrderValue)) : 200,
      freeDeliveryThreshold: data.freeDeliveryThreshold !== undefined ? Math.max(0, Number(data.freeDeliveryThreshold)) : 499,
      packagingFee: data.packagingFee !== undefined ? Math.max(0, Number(data.packagingFee)) : 25,
      avgCookingTime: data.avgCookingTime?.trim() || data.estimatedDeliveryTime?.trim() || '25-35 mins',
      operatingHours: data.operatingHours?.trim() || '11:00 AM - 11:30 PM',
      latitude: data.latitude ? Number(data.latitude) : undefined,
      longitude: data.longitude ? Number(data.longitude) : undefined,
      isActive: data.isActive !== false,
    };

    this.outlets.push(newOutlet);
    this.saveOutlets();

    // Auto-create a default delivery zone for the new outlet if none exists
    const existingZone = this.zones.find((z) => z.outletId === newOutlet.id);
    if (!existingZone) {
      const newZone: DeliveryZone = {
        id: `zone-${newOutlet.id}`,
        outletId: newOutlet.id,
        pinCodes: [],
        deliveryFee: 40,
        isActive: true,
      };
      this.zones.push(newZone);
      this.saveZones();
    }

    // Auto-assign existing products to this new outlet if requested or keep products accessible
    this.products = this.products.map((p) => ({
      ...p,
      outletIds: p.outletIds ? [...new Set([...p.outletIds, newOutlet.id])] : [newOutlet.id],
    }));
    this.saveProducts();

    return newOutlet;
  }

  public updateOutlet(id: string, data: Partial<Outlet>): Outlet | null {
    this.init();
    const index = this.outlets.findIndex((o) => o.id === id);
    if (index === -1) return null;

    const existing = this.outlets[index];
    const updated: Outlet = {
      ...existing,
      ...data,
      id: existing.id, // ID remains immutable
      name: data.name !== undefined ? data.name.trim() : existing.name,
      city: data.city !== undefined ? data.city.trim() : existing.city,
      state: data.state !== undefined ? data.state.trim() : existing.state,
      address: data.address !== undefined ? data.address.trim() : existing.address,
      phone: data.phone !== undefined ? data.phone.trim() : existing.phone,
      email: data.email !== undefined ? data.email.trim() : existing.email,
      minimumOrderValue: data.minimumOrderValue !== undefined ? Math.max(0, Number(data.minimumOrderValue)) : existing.minimumOrderValue,
      freeDeliveryThreshold: data.freeDeliveryThreshold !== undefined ? Math.max(0, Number(data.freeDeliveryThreshold)) : existing.freeDeliveryThreshold,
      packagingFee: data.packagingFee !== undefined ? Math.max(0, Number(data.packagingFee)) : (existing.packagingFee ?? 25),
      avgCookingTime: data.avgCookingTime !== undefined ? data.avgCookingTime.trim() : (existing.avgCookingTime || existing.estimatedDeliveryTime || '25-35 mins'),
      operatingHours: data.operatingHours !== undefined ? data.operatingHours.trim() : existing.operatingHours,
      assignedProductIds: data.assignedProductIds !== undefined ? data.assignedProductIds : existing.assignedProductIds,
      latitude: data.latitude !== undefined ? (data.latitude ? Number(data.latitude) : undefined) : existing.latitude,
      longitude: data.longitude !== undefined ? (data.longitude ? Number(data.longitude) : undefined) : existing.longitude,
      isActive: data.isActive !== undefined ? !!data.isActive : existing.isActive,
    };

    this.outlets[index] = updated;
    this.saveOutlets();
    return updated;
  }

  public toggleOutletActive(id: string): Outlet | null {
    this.init();
    const outlet = this.getOutletById(id);
    if (!outlet) return null;
    return this.updateOutlet(id, { isActive: !outlet.isActive });
  }

  // Delete outlet and cleanup associated delivery zones and product assignments
  public deleteOutlet(id: string): boolean {
    this.init();
    const index = this.outlets.findIndex((o) => o.id === id);
    if (index === -1) return false;

    this.outlets.splice(index, 1);
    this.saveOutlets();

    // Also remove associated zones
    this.zones = this.zones.filter((z) => z.outletId !== id);
    this.saveZones();

    // Remove from products outletIds
    this.products = this.products.map((p) => ({
      ...p,
      outletIds: Array.isArray(p.outletIds) ? p.outletIds.filter((oid) => oid !== id) : [],
    }));
    this.saveProducts();

    return true;
  }

  // Soft delete / deactivate outlet to preserve order history
  public deactivateOutlet(id: string): Outlet | null {
    return this.updateOutlet(id, { isActive: false });
  }

  // =====================
  // DELIVERY ZONES METHODS
  // =====================

  public getAllZones(includeInactive = false): DeliveryZone[] {
    this.init();
    if (includeInactive) return [...this.zones];
    return this.zones.filter((z) => z.isActive);
  }

  public getZoneById(id: string): DeliveryZone | undefined {
    this.init();
    return this.zones.find((z) => z.id === id);
  }

  public getZoneByOutletId(outletId: string): DeliveryZone | undefined {
    this.init();
    return this.zones.find((z) => z.outletId === outletId);
  }

  public getZonesByOutletId(outletId: string): DeliveryZone[] {
    this.init();
    return this.zones.filter((z) => z.outletId === outletId);
  }

  public getDeliveryZoneByPinCode(pinCode: string): DeliveryZone | undefined {
    this.init();
    const cleanPin = pinCode.trim();
    if (!cleanPin) return undefined;
    return this.zones.find((z) => z.isActive && z.pinCodes.includes(cleanPin));
  }

  public getOutletForPinCode(pinCode: string): Outlet | undefined {
    this.init();
    const zone = this.getDeliveryZoneByPinCode(pinCode);
    if (!zone) return undefined;
    const outlet = this.getOutletById(zone.outletId);
    if (!outlet || !outlet.isActive) return undefined;
    return outlet;
  }

  /**
   * Validate duplicate active PIN codes
   * Rule 8: A PIN code should normally belong to only one active outlet delivery zone.
   * If already used in another active zone, return error specifying existing outlet name.
   */
  public checkPinConflict(pinCode: string, excludeZoneId?: string): { conflict: boolean; outletName?: string; existingZoneId?: string } {
    this.init();
    const cleanPin = pinCode.trim();
    const exclude = excludeZoneId ? String(excludeZoneId).trim() : null;
    for (const zone of this.zones) {
      if ((exclude && String(zone.id).trim() === exclude) || !zone.isActive) continue;
      if (zone.pinCodes.includes(cleanPin)) {
        const outlet = this.getOutletById(zone.outletId);
        return {
          conflict: true,
          outletName: outlet?.name || `Outlet (${zone.outletId})`,
          existingZoneId: zone.id,
        };
      }
    }
    return { conflict: false };
  }

  public removePinFromAllZones(pin: string, excludeZoneId?: string): void {
    this.init();
    const cleanPin = pin.trim();
    const exclude = excludeZoneId ? String(excludeZoneId).trim() : null;
    let modified = false;
    for (let i = 0; i < this.zones.length; i++) {
      if (exclude && String(this.zones[i].id).trim() === exclude) continue;
      if (this.zones[i].pinCodes.includes(cleanPin)) {
        this.zones[i] = {
          ...this.zones[i],
          pinCodes: this.zones[i].pinCodes.filter((p) => p !== cleanPin),
        };
        modified = true;
      }
    }
    if (modified) {
      this.saveZones();
    }
  }

  public createZone(data: Partial<DeliveryZone> & { transferConflicts?: boolean }): DeliveryZone {
    this.init();

    if (!data.outletId) throw new Error('Outlet ID is required for delivery zone');

    const cleanPins = Array.isArray(data.pinCodes)
      ? data.pinCodes.map((p) => String(p).trim()).filter((p) => /^\d{6}$/.test(p))
      : [];

    // Check duplicate PIN codes across other active delivery zones
    for (const pin of cleanPins) {
      const check = this.checkPinConflict(pin);
      if (check.conflict) {
        if (data.transferConflicts) {
          this.removePinFromAllZones(pin);
        } else {
          throw new Error(
            `This PIN code (${pin}) is already assigned to: ${check.outletName}. Please remove it from the existing delivery zone before assigning it to another outlet.`
          );
        }
      }
    }

    const newZone: DeliveryZone = {
      id: data.id || `zone-${data.outletId}-${Date.now().toString(36)}`,
      outletId: data.outletId,
      pinCodes: Array.from(new Set(cleanPins)),
      deliveryFee: data.deliveryFee !== undefined ? Math.max(0, Number(data.deliveryFee)) : 40,
      minimumOrderValue: data.minimumOrderValue !== undefined ? Math.max(0, Number(data.minimumOrderValue)) : 199,
      isActive: data.isActive !== false,
    };

    this.zones.push(newZone);
    this.saveZones();
    return newZone;
  }

  public updateZone(id: string, data: Partial<DeliveryZone> & { transferConflicts?: boolean }): DeliveryZone | null {
    this.init();
    const index = this.zones.findIndex((z) => z.id === id);
    if (index === -1) return null;

    const existing = this.zones[index];

    let cleanPins = existing.pinCodes;
    if (data.pinCodes !== undefined) {
      cleanPins = Array.from(
        new Set(
          data.pinCodes
            .map((p) => String(p).trim())
            .filter((p) => /^\d{6}$/.test(p))
        )
      );

      // Check conflict for any new pins
      for (const pin of cleanPins) {
        const check = this.checkPinConflict(pin, id);
        if (check.conflict) {
          if (data.transferConflicts) {
            this.removePinFromAllZones(pin, id);
          } else {
            throw new Error(
              `This PIN code (${pin}) is already assigned to: ${check.outletName}. Please remove it from the existing delivery zone before assigning it to another outlet.`
            );
          }
        }
      }
    }

    const updated: DeliveryZone = {
      ...existing,
      ...data,
      id: existing.id,
      outletId: data.outletId !== undefined ? data.outletId : existing.outletId,
      pinCodes: cleanPins,
      deliveryFee: data.deliveryFee !== undefined ? Math.max(0, Number(data.deliveryFee)) : existing.deliveryFee,
      minimumOrderValue: data.minimumOrderValue !== undefined ? Math.max(0, Number(data.minimumOrderValue)) : existing.minimumOrderValue,
      isActive: data.isActive !== undefined ? !!data.isActive : existing.isActive,
    };

    this.zones[index] = updated;
    this.saveZones();
    return updated;
  }

  public toggleZoneActive(id: string): DeliveryZone | null {
    this.init();
    const index = this.zones.findIndex((z) => z.id === id);
    if (index === -1) return null;

    const current = this.zones[index];
    const willBeActive = !current.isActive;

    // If activating, verify that its PINs do not conflict with other active zones
    if (willBeActive) {
      for (const pin of current.pinCodes) {
        const check = this.checkPinConflict(pin, id);
        if (check.conflict) {
          throw new Error(
            `Cannot activate zone. PIN code ${pin} is already served by active zone in: ${check.outletName}`
          );
        }
      }
    }

    this.zones[index] = {
      ...current,
      isActive: willBeActive,
    };
    this.saveZones();
    return this.zones[index];
  }

  public deleteZone(id: string): boolean {
    this.init();
    const initialLen = this.zones.length;
    this.zones = this.zones.filter((z) => z.id !== id);
    const deleted = this.zones.length < initialLen;
    if (deleted) {
      this.saveZones();
    }
    return deleted;
  }

  // =====================
  // ORDERS METHODS
  // =====================

  public getAllOrders(): Order[] {
    this.init();
    return [...this.orders];
  }

  public getOrdersByOutlet(outletId: string): Order[] {
    this.init();
    return this.orders.filter((o) => o.outletId === outletId);
  }

  public getOrderById(orderId: string): Order | undefined {
    this.init();
    return this.orders.find((o) => o.orderId === orderId || o.id === orderId);
  }

  public createOrder(orderData: Partial<Order>): Order {
    this.init();

    if (!orderData.outletId) {
      throw new Error('Order must be assigned to an active kitchen outlet.');
    }
    if (!orderData.deliveryPinCode) {
      throw new Error('Delivery PIN code is required for the order.');
    }

    const outlet = this.getOutletById(orderData.outletId);

    const newOrder: Order = {
      orderId: orderData.orderId || `GKS-${Date.now().toString().slice(-6)}`,
      outletId: orderData.outletId,
      outletName: outlet?.name || 'Gaon Ka Swad Kitchen',
      deliveryPinCode: orderData.deliveryPinCode,
      createdAt: orderData.createdAt || new Date().toISOString(),
      items: orderData.items || [],
      subtotal: orderData.subtotal || 0,
      discount: orderData.discount || 0,
      deliveryFee: orderData.deliveryFee || 0,
      packagingFee: orderData.packagingFee || 0,
      gst: orderData.gst || 0,
      total: orderData.total || 0,
      couponCode: orderData.couponCode,
      customerDetails: orderData.customerDetails || {
        fullName: 'Customer',
        email: '',
        phone: '',
        address: '',
        city: outlet?.city || 'Bangalore',
        state: outlet?.state || 'Karnataka',
        pincode: orderData.deliveryPinCode,
        deliverySlot: 'immediate',
        paymentMethod: 'cod',
        includeCutlery: true,
      },
      status: orderData.status || 'Received',
      estimatedDeliveryMinutes: orderData.estimatedDeliveryMinutes || 35,
    };

    this.orders.unshift(newOrder);
    this.saveOrders();
    return newOrder;
  }

  // =====================
  // STATS
  // =====================

  public getStats(): DashboardStats {
    this.init();
    const totalProducts = this.products.length;
    const activeProducts = this.products.filter((p) => p.active !== false).length;
    const outOfStockProducts = this.products.filter((p) => {
      if (p.outlets && p.outlets.length > 0) {
        return p.outlets.every((o) => o.inStock === false);
      }
      return p.inStock === false;
    }).length;
    const featuredProducts = this.products.filter((p) => {
      if (p.active === false) return false;
      if (p.outlets && p.outlets.length > 0) {
        return p.outlets.some((o) => o.isFeatured);
      }
      return !!p.featured;
    }).length;
    const bestsellerProducts = this.products.filter((p) => {
      if (p.active === false) return false;
      if (p.outlets && p.outlets.length > 0) {
        return p.outlets.some((o) => o.isBestseller);
      }
      return !!p.bestseller;
    }).length;

    const totalOutlets = this.outlets.length;
    const activeOutlets = this.outlets.filter((o) => o.isActive).length;
    const totalZones = this.zones.length;

    return {
      totalProducts,
      activeProducts,
      outOfStockProducts,
      featuredProducts,
      bestsellerProducts,
      totalOutlets,
      activeOutlets,
      totalZones,
    };
  }
}

export const productStorage = new AppStorage();
