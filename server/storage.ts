import fs from 'fs';
import path from 'path';
import { Product, Outlet, OutletAbout, DeliveryZone, Order, OrderItem, CleanOrderItem, DashboardStats, Customer, CustomerAddress } from '../src/types';
import { PRODUCTS as INITIAL_PRODUCTS } from '../src/data/products';
import { INITIAL_OUTLETS, INITIAL_DELIVERY_ZONES } from '../src/data/outlets';

/**
 * Clean Architecture Database Serializer for Order Items
 * Produces a flat, minimal JSONB object with zero duplicate keys, zero ephemeral React IDs, and no nested master catalog copies.
 */
export function serializeOrderItemForDb(it: any): CleanOrderItem {
  const p = it.product || {};
  const productId = String(it.productId || p.id || it.id || '');
  const name = String(it.name || p.name || 'Authentic Delicacy');
  const hindiName = it.hindiName || p.hindiName || undefined;
  const image = String(it.image || p.image || '');
  const isVeg = it.isVeg !== undefined ? Boolean(it.isVeg) : (p.isVeg !== undefined ? Boolean(p.isVeg) : true);
  const quantity = Math.max(1, Number(it.quantity) || 1);
  const unitPrice = Number(it.unitPrice || it.price || p.price || 0);
  const totalPrice = Number(it.totalPrice || unitPrice * quantity);

  const selectedVariant = it.selectedVariant
    ? {
        id: String(it.selectedVariant.id || ''),
        name: String(it.selectedVariant.name || ''),
        weight: it.selectedVariant.weight || undefined,
        serves: it.selectedVariant.serves || undefined,
        price: Number(it.selectedVariant.price || unitPrice),
      }
    : undefined;

  const selectedAddons = Array.isArray(it.selectedAddons) && it.selectedAddons.length > 0
    ? it.selectedAddons.map((ad: any) => ({
        id: String(ad.id || ''),
        name: String(ad.name || ''),
        price: Number(ad.price || 0),
        isVeg: Boolean(ad.isVeg ?? true),
      }))
    : [];

  const cleanItem: CleanOrderItem = {
    productId,
    name,
    image,
    isVeg,
    quantity,
    unitPrice,
    totalPrice,
  };

  if (hindiName) cleanItem.hindiName = hindiName;
  if (selectedVariant) cleanItem.selectedVariant = selectedVariant;
  if (it.selectedSpiceLevel) cleanItem.selectedSpiceLevel = it.selectedSpiceLevel;
  cleanItem.selectedAddons = selectedAddons;

  return cleanItem;
}

/**
 * In-Memory Deserializer
 * Injects lightweight getters/shims for UI components that look for item.product or item.id
 */
export function deserializeOrderItem(it: any): OrderItem {
  const p = it.product || {};
  const productId = String(it.productId || p.id || it.id || '');
  const name = String(it.name || p.name || 'Authentic Delicacy');
  const hindiName = it.hindiName || p.hindiName || undefined;
  const image = String(it.image || p.image || '');
  const isVeg = it.isVeg !== undefined ? Boolean(it.isVeg) : (p.isVeg !== undefined ? Boolean(p.isVeg) : true);
  const quantity = Math.max(1, Number(it.quantity) || 1);
  const unitPrice = Number(it.unitPrice || it.price || p.price || 0);
  const totalPrice = Number(it.totalPrice || unitPrice * quantity);

  const selectedVariant = it.selectedVariant
    ? {
        id: String(it.selectedVariant.id || ''),
        name: String(it.selectedVariant.name || ''),
        weight: it.selectedVariant.weight || undefined,
        serves: it.selectedVariant.serves || undefined,
        price: Number(it.selectedVariant.price || unitPrice),
        originalPrice: it.selectedVariant.originalPrice ? Number(it.selectedVariant.originalPrice) : undefined,
      }
    : undefined;

  const selectedAddons = Array.isArray(it.selectedAddons)
    ? it.selectedAddons.map((ad: any) => ({
        id: String(ad.id || ''),
        name: String(ad.name || ''),
        price: Number(ad.price || 0),
        isVeg: Boolean(ad.isVeg ?? true),
      }))
    : [];

  return {
    productId,
    name,
    hindiName,
    image,
    isVeg,
    quantity,
    unitPrice,
    price: unitPrice,
    totalPrice,
    selectedVariant,
    selectedAddons,
    selectedSpiceLevel: it.selectedSpiceLevel || undefined,
    id: it.id || `${productId}_${selectedVariant?.id || 'std'}`,
    product: {
      id: productId,
      name,
      hindiName,
      image,
      isVeg,
      price: unitPrice,
    },
  };
}

export const sanitizeOrderItem = serializeOrderItemForDb;

const DATA_DIR = path.join(process.cwd(), 'data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products_store.json');
const OUTLETS_FILE = path.join(DATA_DIR, 'outlets_store.json');
const ZONES_FILE = path.join(DATA_DIR, 'zones_store.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders_store.json');
const CUSTOMERS_FILE = path.join(DATA_DIR, 'customers_store.json');
const CUSTOMER_ADDRESSES_FILE = path.join(DATA_DIR, 'customer_addresses_store.json');

export function normalizePhone(rawPhone?: string): string {
  if (!rawPhone) return '';
  const digits = rawPhone.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

const ALL_INITIAL_OUTLET_IDS = INITIAL_OUTLETS.map((o) => o.id);

function safeReadJson<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, 'utf-8').trim();
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed !== undefined && parsed !== null ? parsed : fallback;
  } catch (e) {
    console.warn(`Warning: Could not parse ${filePath}, using fallback.`, e);
    return fallback;
  }
}

class AppStorage {
  private products: Product[] = [];
  private outlets: Outlet[] = [];
  private abouts: OutletAbout[] = [];
  private zones: DeliveryZone[] = [];
  private orders: Order[] = [];
  private customers: Customer[] = [];
  private customerAddresses: CustomerAddress[] = [];
  private isInitialized = false;

  constructor() {
    this.init();
  }

  private init() {
    if (this.isInitialized) return;

    this.outlets = INITIAL_OUTLETS.map((o: any) => ({
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

    this.zones = [...INITIAL_DELIVERY_ZONES];
    this.abouts = this.outlets.map((o) => ({
      outletId: o.id,
      heroFireLine: `THE HERITAGE BEHIND GAON KA SWAD • ${o.name.replace(/^Gaon Ka Swad - /i, '').toUpperCase()}`,
      heroHeader: o.heroHeader || `Crafting Authentic Culinary Memories in ${o.city}`,
      heroDescription: o.heroDescription || `Born out of a deep reverence for forgotten village recipes and slow-cooking traditions, our ${o.name} kitchen brings soulful tastes straight to dining tables.`,
      storyLine: `WHO WE ARE • ${o.name.replace(/^Gaon Ka Swad - /i, '').toUpperCase()}`,
      storyTitle: 'A Modern Cloud Kitchen with Heirloom Roots',
      storyDescription: 'Gaon Ka Swad was founded with a singular conviction: genuine taste cannot be rushed. In a world of 10-minute industrial microwave prep, we chose the path of slow-simmered handis, 24-hour charcoal embers, whole stone-ground spices, and pure cow desi ghee.\n\nEvery recipe in our menu traces back to traditional culinary masters. We do not use chemical preservatives, artificial food coloring, or pre-packaged spice pastes.',
      storyHighlight1Title: '100% Pure Desi Ghee',
      storyHighlight1Description: 'Pure Desi Ghee & Raw Spices',
      storyHighlight2Title: '24 Hrs Slow-Simmered',
      storyHighlight2Description: 'Slow-Simmered Dal Bukhara',
      outletImage: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=1000&auto=format&fit=crop',
      expLine: 'THE GAON KA SWAD EXPERIENCE',
      expHeader: 'Food That Feels Like Home',
      expDescription: 'From the way we cook to the way we serve, every detail is designed to make your meal feel a little more special.',
      expCard1Title: '🏠 Familiar Flavours',
      expCard1Header: 'Taste That Feels Like Home',
      expCard1Description: 'Comforting Indian flavours inspired by the food we know, love, and grew up sharing.',
      expCard2Title: '🍽️ Made With Care',
      expCard2Header: 'Every Order Matters',
      expCard2Description: 'We prepare each order with attention to freshness, consistency, and the little details that make a meal memorable.',
      expCard3Title: '❤️ Your Experience',
      expCard3Header: 'We Listen & Improve',
      expCard3Description: 'Your feedback helps us get better. Every rating, review, and suggestion helps shape the Gaon Ka Swad experience.',
    }));

    const activeOutletIds = this.outlets.map((o) => o.id);
    this.products = INITIAL_PRODUCTS.map((p: any) => {
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
      } else {
        outlets = activeOutletIds.map((oid) => ({
          outletId: oid,
          inStock: p.inStock !== false,
          isFeatured: !!p.featured,
          isBestseller: !!p.bestseller,
        }));
      }
      return {
        ...p,
        active: p.active !== false,
        inStock: p.inStock !== false,
        outlets,
        outletIds: outlets.map((o) => o.outletId),
      };
    });

    this.orders = [];
    this.customers = [];
    this.customerAddresses = [];
    this.isInitialized = true;
  }

  private saveCustomers() {}
  private saveCustomerAddresses() {}
  private saveProducts() {}
  private saveOutlets() {}
  private saveZones() {}
  private saveOrders() {}

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
          ? { outletId: o, inStock: true, isFeatured: false, isBestseller: false, isChefSpecial: false, portionsLeft: null }
          : {
              outletId: o.outletId,
              inStock: o.inStock !== false,
              isFeatured: !!o.isFeatured,
              isBestseller: !!o.isBestseller,
              isChefSpecial: !!o.isChefSpecial,
              portionsLeft: o.portionsLeft !== undefined && o.portionsLeft !== null && o.portionsLeft !== '' ? Number(o.portionsLeft) : null,
            }
      );
    } else if (Array.isArray(data.outletIds) && data.outletIds.length > 0) {
      outletsConfig = data.outletIds.map((oid) => ({
        outletId: oid,
        inStock: data.inStock !== false,
        isFeatured: !!data.featured,
        isBestseller: !!data.bestseller,
        isChefSpecial: !!data.chefSpecial,
        portionsLeft: null,
      }));
    } else {
      outletsConfig = activeOutletIds.map((oid) => ({
        outletId: oid,
        inStock: true,
        isFeatured: false,
        isBestseller: false,
        isChefSpecial: false,
        portionsLeft: null,
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
      rating: data.rating !== undefined && data.rating !== null ? Number(data.rating) : 4.8,
      reviewsCount: data.reviewsCount !== undefined && data.reviewsCount !== null ? Number(data.reviewsCount) : (Array.isArray(data.reviewsList) ? data.reviewsList.length : 0),
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
          ? { outletId: o, inStock: true, isFeatured: false, isBestseller: false, isChefSpecial: false, portionsLeft: null }
          : {
              outletId: o.outletId,
              inStock: o.inStock !== false,
              isFeatured: !!o.isFeatured,
              isBestseller: !!o.isBestseller,
              isChefSpecial: !!o.isChefSpecial,
              portionsLeft: o.portionsLeft !== undefined && o.portionsLeft !== null && o.portionsLeft !== '' ? Number(o.portionsLeft) : null,
            }
      );
    } else if (data.outletIds !== undefined) {
      // Retain configurations for kept outletIds, add new defaults if added
      updatedOutlets = data.outletIds.map((oid) => {
        const prev = existing.outlets?.find((o) => o.outletId === oid);
        return prev || { outletId: oid, inStock: true, isFeatured: false, isBestseller: false, isChefSpecial: false, portionsLeft: null };
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
    config: { inStock?: boolean; isFeatured?: boolean; isBestseller?: boolean; isChefSpecial?: boolean; isAssigned?: boolean; assigned?: boolean; portionsLeft?: number | null }
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
          isChefSpecial: config.isChefSpecial !== undefined ? config.isChefSpecial : outlets[existingIdx].isChefSpecial,
          portionsLeft: config.portionsLeft !== undefined ? config.portionsLeft : outlets[existingIdx].portionsLeft,
        };
      } else {
        outlets.push({
          outletId,
          inStock: config.inStock !== undefined ? config.inStock : true,
          isFeatured: !!config.isFeatured,
          isBestseller: !!config.isBestseller,
          isChefSpecial: !!config.isChefSpecial,
          portionsLeft: config.portionsLeft !== undefined ? config.portionsLeft : null,
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
      isChefSpecial?: boolean;
      portionsLeft?: number | null;
    }[]
  ): Product[] {
    this.init();
    updates.forEach((item) => {
      this.updateOutletProductConfig(outletId, item.productId, {
        isAssigned: item.isAssigned,
        inStock: item.inStock,
        isFeatured: item.isFeatured,
        isBestseller: item.isBestseller,
        isChefSpecial: item.isChefSpecial,
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
      fssaiLicId: data.fssaiLicId !== undefined && data.fssaiLicId !== null ? Number(data.fssaiLicId) : 11523034000000,
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
      fssaiLicId: data.fssaiLicId !== undefined && data.fssaiLicId !== null ? Number(data.fssaiLicId) : existing.fssaiLicId,
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
  // ABOUTS (1:1 with Outlets) METHODS
  // =====================

  public getAboutByOutletId(outletId: string): OutletAbout {
    this.init();
    const existing = this.abouts.find((a) => a.outletId === outletId);
    if (existing) return existing;

    const outlet = this.getOutletById(outletId);
    const fallback: OutletAbout = {
      outletId,
      heroFireLine: outlet?.heroFireLine || (outlet ? `THE HERITAGE BEHIND GAON KA SWAD • ${outlet.name.toUpperCase()}` : 'THE HERITAGE BEHIND GAON KA SWAD'),
      heroHeader: outlet?.heroHeader || 'Crafting Authentic Culinary Memories',
      heroDescription: outlet?.heroDescription || 'Born out of a deep reverence for forgotten village recipes and slow-cooking traditions.',
      storyLine: 'WHO WE ARE',
      storyTitle: 'A Modern Cloud Kitchen with Heirloom Roots',
      storyDescription: 'Gaon Ka Swad was founded with a singular conviction: genuine taste cannot be rushed.',
      storyHighlight1Title: '100% Pure Desi Ghee',
      storyHighlight1Description: 'Pure Desi Ghee & Raw Spices',
      storyHighlight2Title: '24 Hrs Slow-Simmered',
      storyHighlight2Description: 'Slow-Simmered Dal Bukhara',
      outletImage: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=1000&auto=format&fit=crop',
      expLine: 'THE GAON KA SWAD EXPERIENCE',
      expHeader: 'Food That Feels Like Home',
      expDescription: 'From the way we cook to the way we serve, every detail is designed to make your meal feel a little more special.',
      expCard1Title: '🏠 Familiar Flavours',
      expCard1Header: 'Taste That Feels Like Home',
      expCard1Description: 'Comforting Indian flavours inspired by the food we know, love, and grew up sharing.',
      expCard2Title: '🍽️ Made With Care',
      expCard2Header: 'Every Order Matters',
      expCard2Description: 'We prepare each order with attention to freshness, consistency, and the little details that make a meal memorable.',
      expCard3Title: '❤️ Your Experience',
      expCard3Header: 'We Listen & Improve',
      expCard3Description: 'Your feedback helps us get better. Every rating, review, and suggestion helps shape the Gaon Ka Swad experience.',
    };
    return fallback;
  }

  public upsertAbout(outletId: string, data: Partial<OutletAbout>): OutletAbout {
    this.init();
    const existingIndex = this.abouts.findIndex((a) => a.outletId === outletId);
    const existing = existingIndex >= 0 ? this.abouts[existingIndex] : this.getAboutByOutletId(outletId);

    const updated: OutletAbout = {
      ...existing,
      ...data,
      outletId,
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      this.abouts[existingIndex] = updated;
    } else {
      this.abouts.push(updated);
    }

    return updated;
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

  public getAllOrders(outletId?: string, status?: string): Order[] {
    this.init();
    let result = [...this.orders];
    if (outletId) {
      result = result.filter((o) => o.outletId === outletId);
    }
    if (status) {
      result = result.filter((o) => (o.status || '').toLowerCase() === status.toLowerCase());
    }
    return result.map((o) => ({
      ...o,
      items: Array.isArray(o.items) ? o.items.map(deserializeOrderItem) : [],
    }));
  }

  public getOrdersByOutlet(outletId: string): Order[] {
    this.init();
    return this.orders
      .filter((o) => o.outletId === outletId)
      .map((o) => ({
        ...o,
        items: Array.isArray(o.items) ? o.items.map(deserializeOrderItem) : [],
      }));
  }

  public getOrderById(orderId: string): Order | undefined {
    this.init();
    const order = this.orders.find((o) => o.orderId === orderId || o.id === orderId);
    if (!order) return undefined;
    return {
      ...order,
      items: Array.isArray(order.items) ? order.items.map(deserializeOrderItem) : [],
    };
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
    const rawPhone = orderData.customerDetails?.phone || '';
    const normPhone = normalizePhone(rawPhone);

    let customerId = orderData.customerId;
    const isGuest = !orderData.customerDetails?.createAccount && !customerId;

    // Address snapshot object
    const addressSnapshot = {
      fullAddress: orderData.customerDetails?.address || '',
      landmark: orderData.customerDetails?.landmark || '',
      city: orderData.customerDetails?.city || outlet?.city || 'Bhubaneswar',
      state: orderData.customerDetails?.state || outlet?.state || 'Odisha',
      pincode: orderData.deliveryPinCode || orderData.customerDetails?.pincode || '',
    };

    // If customer account requested or customer already exists
    let customer: Customer | null = null;
    if (normPhone) {
      customer = this.findCustomerByPhone(normPhone) || null;
      if (!customer && orderData.customerDetails?.createAccount) {
        customer = this.getOrCreateCustomer({
          phone: normPhone,
          fullName: orderData.customerDetails.fullName || 'Valued Customer',
          email: orderData.customerDetails.email || undefined,
          marketingConsent: !!orderData.customerDetails.marketingConsent,
        });
      }

      if (customer) {
        customerId = customer.id;
        // Update customer profile & default address
        this.updateCustomer(customer.id, {
          fullName: orderData.customerDetails?.fullName || customer.fullName,
          email: orderData.customerDetails?.email || customer.email,
          lastOrderAt: new Date().toISOString(),
          marketingConsent: orderData.customerDetails?.marketingConsent !== undefined
            ? !!orderData.customerDetails.marketingConsent
            : customer.marketingConsent,
        });

        // Save / update default address for future prefill
        const savedAddr = this.saveCustomerAddress(customer.id, {
          fullAddress: addressSnapshot.fullAddress,
          landmark: addressSnapshot.landmark,
          city: addressSnapshot.city,
          state: addressSnapshot.state,
          pincode: addressSnapshot.pincode,
          isDefault: true,
        });

        if (savedAddr) {
          orderData.addressId = savedAddr.id;
        }

        // If welcome discount was used in this order, mark it used on the customer
        if (orderData.isWelcomeDiscountApplied) {
          this.markWelcomeDiscountUsed(customer.id);
        }
      }
    }

    // Generate auto-incrementing Order ID (e.g. GKSWAD-#001, GKSWAD-#002, ...)
    let nextSeq = 1;
    for (const o of this.orders) {
      if (o.orderId) {
        const match = o.orderId.match(/GKSWAD-#?(\d+)/i) || o.orderId.match(/GKS-#?(\d+)/i);
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num >= nextSeq) {
            nextSeq = num + 1;
          }
        }
      }
    }
    const formattedOrderId =
      orderData.orderId && orderData.orderId.startsWith('GKSWAD-#')
        ? orderData.orderId
        : `GKSWAD-#${String(nextSeq).padStart(3, '0')}`;

    // Atomically decrement portions in products for this outlet
    if (orderData.items && Array.isArray(orderData.items)) {
      let anyStockChanged = false;
      for (const item of orderData.items) {
        const productId = item.product?.id || (item as any).productId || (item as any).id;
        const qty = Number(item.quantity) || 1;
        if (!productId) continue;

        const prod = this.products.find((p) => String(p.id) === String(productId));
        if (prod && Array.isArray(prod.outlets)) {
          for (const outletCfg of prod.outlets) {
            const oId = outletCfg.outletId;
            if (
              oId === orderData.outletId &&
              outletCfg.portionsLeft !== null &&
              outletCfg.portionsLeft !== undefined
            ) {
              const currentPortions = Number(outletCfg.portionsLeft);
              if (!isNaN(currentPortions)) {
                const nextPortions = Math.max(0, currentPortions - qty);
                outletCfg.portionsLeft = nextPortions;
                if (nextPortions <= 0) {
                  outletCfg.inStock = false;
                }
                anyStockChanged = true;
              }
            }
          }
          if (anyStockChanged) {
            prod.inStock = prod.outlets.some((o) => o.inStock);
          }
        }
      }
      if (anyStockChanged) {
        this.saveProducts();
      }
    }

    const newOrder: Order = {
      orderId: formattedOrderId,
      customerId: customerId || undefined,
      addressId: orderData.addressId || undefined,
      isGuestCheckout: isGuest,
      outletId: orderData.outletId,
      outletName: outlet?.name || 'Gaon Ka Swad Kitchen',
      deliveryPinCode: orderData.deliveryPinCode,
      createdAt: orderData.createdAt || new Date().toISOString(),
      items: Array.isArray(orderData.items) ? orderData.items.map(sanitizeOrderItem) : [],
      subtotal: orderData.subtotal || 0,
      discount: orderData.discount || 0,
      welcomeDiscountAmount: orderData.welcomeDiscountAmount || 0,
      isWelcomeDiscountApplied: !!orderData.isWelcomeDiscountApplied,
      deliveryFee: orderData.deliveryFee || 0,
      packagingFee: orderData.packagingFee || 0,
      gst: orderData.gst || 0,
      total: orderData.total || 0,
      couponCode: orderData.couponCode,
      deliveryType: orderData.deliveryType || 'immediate',
      scheduledAt: orderData.scheduledAt,
      customerDetails: orderData.customerDetails || {
        fullName: 'Customer',
        email: '',
        phone: normPhone,
        address: addressSnapshot.fullAddress,
        city: addressSnapshot.city,
        state: addressSnapshot.state,
        pincode: addressSnapshot.pincode,
        deliveryType: orderData.deliveryType || 'immediate',
        scheduledAt: orderData.scheduledAt,
        paymentMethod: 'cod',
        includeCutlery: true,
      },
      deliveryAddressSnapshot: addressSnapshot,
      status: orderData.status || 'Received',
      orderStatus: 'received',
      placedAt: orderData.placedAt || orderData.createdAt || new Date().toISOString(),
      confirmedAt: undefined,
      preparingAt: undefined,
      readyAt: undefined,
      outForDeliveryAt: undefined,
      deliveredAt: undefined,
      cancelledAt: undefined,
      estimatedDeliveryMinutes: orderData.estimatedDeliveryMinutes || 35,
    };

    this.orders.unshift(newOrder);
    this.saveOrders();
    return newOrder;
  }

  public updateOrderStatus(
    orderId: string,
    status: Order['status'],
    cancellationReason?: string
  ): Order | null {
    this.init();
    const order = this.getOrderById(orderId);
    if (!order) return null;

    const now = new Date().toISOString();
    order.status = status;
    const normalized = (status || '').toLowerCase().trim();

    if (normalized === 'received') {
      order.orderStatus = 'received';
    } else if (normalized === 'confirmed') {
      order.orderStatus = 'confirmed';
      if (!order.confirmedAt) order.confirmedAt = now;
    } else if (normalized === 'preparing' || normalized === 'in kitchen' || normalized === 'preparing in kitchen') {
      order.orderStatus = 'preparing';
      if (!order.preparingAt) order.preparingAt = now;
    } else if (normalized === 'ready' || normalized === 'ready for pickup') {
      order.orderStatus = 'ready';
      if (!order.readyAt) order.readyAt = now;
    } else if (normalized === 'out_for_delivery' || normalized === 'out for delivery') {
      order.orderStatus = 'out_for_delivery';
      if (!order.outForDeliveryAt) order.outForDeliveryAt = now;
    } else if (normalized === 'delivered' || normalized === 'picked up') {
      order.orderStatus = 'delivered';
      if (!order.deliveredAt) order.deliveredAt = now;
    } else if (normalized === 'cancelled') {
      order.orderStatus = 'cancelled';
      order.cancelledAt = now;
      if (cancellationReason) {
        order.cancellationReason = cancellationReason;
      }
    }

    this.saveOrders();
    return order;
  }

  public deleteOrder(orderId: string): boolean {
    this.init();
    const initialLen = this.orders.length;
    this.orders = this.orders.filter((o) => o.orderId !== orderId && o.id !== orderId);
    const deleted = this.orders.length < initialLen;
    if (deleted) {
      this.saveOrders();
    }
    return deleted;
  }

  // =====================
  // CUSTOMER METHODS
  // =====================

  public findCustomerByPhone(rawPhone?: string): Customer | undefined {
    this.init();
    const norm = normalizePhone(rawPhone);
    if (!norm) return undefined;
    return this.customers.find((c) => normalizePhone(c.phone) === norm);
  }

  public findCustomerById(id: string): Customer | undefined {
    this.init();
    return this.customers.find((c) => c.id === id);
  }

  public getOrCreateCustomer(data: { phone: string; fullName?: string; email?: string; marketingConsent?: boolean }): Customer {
    this.init();
    const norm = normalizePhone(data.phone);
    if (!norm) throw new Error('Valid 10-digit phone number is required');

    let existing = this.customers.find((c) => normalizePhone(c.phone) === norm);
    if (existing) {
      if (data.fullName && data.fullName.trim() && data.fullName !== existing.fullName) {
        existing.fullName = data.fullName.trim();
      }
      if (data.email && data.email.trim()) {
        existing.email = data.email.trim();
      }
      if (data.marketingConsent !== undefined) {
        existing.marketingConsent = !!data.marketingConsent;
      }
      existing.updatedAt = new Date().toISOString();
      this.saveCustomers();
      return existing;
    }

    const newCustomer: Customer = {
      id: `cust-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      phone: norm,
      fullName: data.fullName?.trim() || 'Valued Customer',
      email: data.email?.trim() || undefined,
      isActive: true,
      marketingConsent: !!data.marketingConsent,
      welcomeDiscountUsed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.customers.push(newCustomer);
    this.saveCustomers();
    return newCustomer;
  }

  public updateCustomer(id: string, data: Partial<Customer>): Customer | null {
    this.init();
    const index = this.customers.findIndex((c) => c.id === id);
    if (index === -1) return null;

    const existing = this.customers[index];
    const updated: Customer = {
      ...existing,
      ...data,
      id: existing.id,
      phone: data.phone ? normalizePhone(data.phone) : existing.phone,
      updatedAt: new Date().toISOString(),
    };

    this.customers[index] = updated;
    this.saveCustomers();
    return updated;
  }

  public markWelcomeDiscountUsed(customerIdOrPhone: string): void {
    this.init();
    const norm = normalizePhone(customerIdOrPhone);
    const customer = this.customers.find((c) => c.id === customerIdOrPhone || normalizePhone(c.phone) === norm);
    if (customer) {
      customer.welcomeDiscountUsed = true;
      customer.welcomeDiscountUsedAt = new Date().toISOString();
      customer.updatedAt = new Date().toISOString();
      this.saveCustomers();
    }
  }

  public getCustomerDefaultAddress(customerId: string): CustomerAddress | undefined {
    this.init();
    return this.customerAddresses.find((a) => a.customerId === customerId && a.isDefault) ||
      this.customerAddresses.find((a) => a.customerId === customerId);
  }

  public saveCustomerAddress(customerId: string, addressData: Partial<CustomerAddress>): CustomerAddress {
    this.init();
    let existingIndex = this.customerAddresses.findIndex((a) => a.customerId === customerId);
    if (existingIndex >= 0) {
      const updated: CustomerAddress = {
        ...this.customerAddresses[existingIndex],
        ...addressData,
        customerId,
        fullAddress: addressData.fullAddress || this.customerAddresses[existingIndex].fullAddress,
        landmark: addressData.landmark !== undefined ? addressData.landmark : this.customerAddresses[existingIndex].landmark,
        city: addressData.city || this.customerAddresses[existingIndex].city,
        state: addressData.state || this.customerAddresses[existingIndex].state,
        pincode: addressData.pincode || this.customerAddresses[existingIndex].pincode,
        isDefault: true,
        updatedAt: new Date().toISOString(),
      };
      this.customerAddresses[existingIndex] = updated;
      this.saveCustomerAddresses();
      return updated;
    }

    const newAddress: CustomerAddress = {
      id: `addr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      customerId,
      addressLabel: addressData.addressLabel || 'Home',
      fullAddress: addressData.fullAddress || '',
      landmark: addressData.landmark || '',
      city: addressData.city || 'Bhubaneswar',
      state: addressData.state || 'Odisha',
      pincode: addressData.pincode || '',
      isDefault: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.customerAddresses.push(newAddress);
    this.saveCustomerAddresses();
    return newAddress;
  }

  // =====================
  // REVIEWS & VERIFIED PURCHASE ELIGIBILITY
  // =====================

  public checkProductReviewEligibility(phoneOrCustomerId: string, productId: string | number): {
    eligible: boolean;
    orderId?: string;
    deliveredAt?: string;
    message?: string;
  } {
    this.init();
    const norm = normalizePhone(phoneOrCustomerId);
    const prodIdStr = String(productId);

    // Find any delivered order belonging to this customer/phone that contains the product
    const deliveredOrder = this.orders.find((ord) => {
      const isMatchUser =
        (ord.customerId && ord.customerId === phoneOrCustomerId) ||
        (ord.customerDetails?.phone && normalizePhone(ord.customerDetails.phone) === norm);

      if (!isMatchUser) return false;

      // Status check: delivered
      const statusLower = (ord.status || '').toLowerCase();
      const isDelivered = statusLower === 'delivered';
      if (!isDelivered) return false;

      // Check items
      return ord.items && ord.items.some((it) => String(it.id) === prodIdStr);
    });

    if (deliveredOrder) {
      return {
        eligible: true,
        orderId: deliveredOrder.orderId,
        deliveredAt: deliveredOrder.createdAt,
        message: 'Verified Purchase: You are eligible to review this authentic delicacy.',
      };
    }

    return {
      eligible: false,
      message: 'Review eligibility requires at least one delivered order containing this dish.',
    };
  }

  public addVerifiedProductReview(productId: string | number, reviewData: {
    userName: string;
    userLocation?: string;
    rating: number;
    comment: string;
    customerId?: string;
    phone?: string;
    orderId?: string;
  }): { product: Product; review: any } {
    this.init();
    const prod = this.getProductById(productId);
    if (!prod) throw new Error(`Product ${productId} not found`);

    const newReview = {
      id: `rev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      userName: reviewData.userName.trim(),
      userLocation: reviewData.userLocation?.trim() || 'Verified Customer',
      rating: Math.min(5, Math.max(1, Number(reviewData.rating) || 5)),
      comment: reviewData.comment.trim(),
      date: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      verified: true,
      orderId: reviewData.orderId,
    };

    const currentReviews = Array.isArray(prod.reviewsList) ? [...prod.reviewsList] : [];
    currentReviews.unshift(newReview);

    const totalRatings = currentReviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0);
    const avgRating = Number((totalRatings / currentReviews.length).toFixed(1));

    const updated = this.updateProduct(prod.id, {
      reviewsList: currentReviews,
      reviewsCount: currentReviews.length,
      rating: avgRating,
    });

    return { product: updated || prod, review: newReview };
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
