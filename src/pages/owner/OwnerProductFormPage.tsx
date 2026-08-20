import React, { useState, useEffect } from 'react';
import { OwnerLayout } from './OwnerLayout';
import { useProducts } from '../../context/ProductContext';
import { useNavigation } from '../../context/NavigationContext';
import { useAuth } from '../../context/AuthContext';
import { CATEGORIES } from '../../data/products';
import { Product, Outlet, ProductOutletConfig } from '../../types';
import { getOutlets } from '../../lib/locationService';
import { getCulinaryHighlights, CATEGORY_CULINARY_DEFAULTS, normalizeCategorySlug } from '../../utils/culinaryHighlights';
import {
  ArrowLeft,
  Save,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Flame,
  Clock,
  Users,
  FlameKindling,
  Info,
  Layers,
  Store,
  MapPin,
  PackageCheck,
  PackageX,
  Lock,
  Unlock,
} from 'lucide-react';

interface OwnerProductFormPageProps {
  mode: 'new' | 'edit';
  productId?: string | number;
}

const SAMPLE_FOOD_IMAGES = [
  { label: 'Biryani Handi', url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?q=80&w=800&auto=format&fit=crop' },
  { label: 'Butter Chicken / Paneer', url: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?q=80&w=800&auto=format&fit=crop' },
  { label: 'Tandoori Tikka', url: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?q=80&w=800&auto=format&fit=crop' },
  { label: 'Tandoori Naan', url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?q=80&w=800&auto=format&fit=crop' },
  { label: 'Gulab Jamun / Dessert', url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?q=80&w=800&auto=format&fit=crop' },
  { label: 'Dal Makhani Bowl', url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=800&auto=format&fit=crop' },
];

export const OwnerProductFormPage: React.FC<OwnerProductFormPageProps> = ({
  mode,
  productId,
}) => {
  const { allProducts, addProduct, editProduct } = useProducts();
  const { goToOwnerProducts } = useNavigation();
  const { token } = useAuth();

  // Outlets List
  const [availableOutlets, setAvailableOutlets] = useState<Outlet[]>([]);
  const [loadingOutlets, setLoadingOutlets] = useState(true);

  // Form State
  const [name, setName] = useState('');
  const [hindiName, setHindiName] = useState('');
  const [slug, setSlug] = useState('');
  const [isSlugUnlocked, setIsSlugUnlocked] = useState(mode === 'new');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[0]?.slug || 'dum-biryanis');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  // Custom Culinary Story & Highlights State
  const [story, setStory] = useState('');
  const [culinaryTitle, setCulinaryTitle] = useState('');
  const [cookingMethodTitle, setCookingMethodTitle] = useState('');
  const [cookingMethodDesc, setCookingMethodDesc] = useState('');
  const [aromaTitle, setAromaTitle] = useState('');
  const [aromaDesc, setAromaDesc] = useState('');

  const [price, setPrice] = useState<string>('');
  const [originalPrice, setOriginalPrice] = useState<string>('');
  const [image, setImage] = useState('https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?q=80&w=800&auto=format&fit=crop');
  const [isVeg, setIsVeg] = useState(true);
  const [isJainFriendly, setIsJainFriendly] = useState(false);
  const [spiceLevel, setSpiceLevel] = useState<'Mild' | 'Medium' | 'Spicy' | 'Extra Spicy'>('Medium');
  const [prepTimeMinutes, setPrepTimeMinutes] = useState<number>(30);
  const [serves, setServes] = useState('Serves 1-2');
  const [calories, setCalories] = useState<string>('');
  const [active, setActive] = useState(true);
  const [ingredientsText, setIngredientsText] = useState('Pure Cow Ghee, Heirloom Spices, Saffron, Fresh Ingredients');

  // Outlet assignment state: Record<outletId, { isAssigned: boolean; inStock: boolean; isFeatured: boolean; isBestseller: boolean; isChefSpecial: boolean }>
  const [outletConfigs, setOutletConfigs] = useState<
    Record<string, { isAssigned: boolean; inStock: boolean; isFeatured: boolean; isBestseller: boolean; isChefSpecial: boolean }>
  >({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch Outlets
  useEffect(() => {
    const fetchAllOutlets = async () => {
      setLoadingOutlets(true);
      try {
        const list = await getOutlets(true, token || undefined);
        setAvailableOutlets(list);
      } catch (err) {
        console.error('Failed to load outlets:', err);
      } finally {
        setLoadingOutlets(false);
      }
    };
    fetchAllOutlets();
  }, [token]);

  // Auto-generate slug when creating a new product (unless manually customized)
  const handleNameChange = (val: string) => {
    setName(val);
    if (mode === 'new' && !slugManuallyEdited) {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setSlug(generated);
    }
  };

  // Populate data in edit mode or set default outlet selections in new mode
  useEffect(() => {
    if (availableOutlets.length === 0) return;

    if (mode === 'edit' && productId) {
      const found = allProducts.find((p) => String(p.id) === String(productId));
      if (found) {
        setName(found.name);
        setHindiName(found.hindiName || '');
        setSlug(found.slug);
        const matchedCat = CATEGORIES.find(
          (c) => c.slug === found.category || c.id === found.category
        );
        setCategory(matchedCat ? matchedCat.slug : found.category);
        setShortDescription(found.shortDescription || '');
        setDescription(found.description || '');
        setStory(found.story || '');
        setCulinaryTitle(found.culinaryTitle || '');
        setCookingMethodTitle(found.cookingMethodTitle || '');
        setCookingMethodDesc(found.cookingMethodDesc || '');
        setAromaTitle(found.aromaTitle || '');
        setAromaDesc(found.aromaDesc || '');
        setPrice(String(found.price));
        setOriginalPrice(found.originalPrice ? String(found.originalPrice) : '');
        setImage(found.image || '');
        setIsVeg(found.isVeg !== false);
        setIsJainFriendly(!!found.isJainFriendly);
        setSpiceLevel(found.spiceLevel || 'Medium');
        setPrepTimeMinutes(found.prepTimeMinutes || 30);
        setServes(found.serves || 'Serves 1-2');
        setCalories(found.calories ? String(found.calories) : '');
        setActive(found.active !== false);
        setIngredientsText(
          Array.isArray(found.ingredients)
            ? found.ingredients.join(', ')
            : 'Pure Cow Ghee, Heirloom Spices, Fresh Ingredients'
        );

        // Map outlet configs
        const configs: Record<string, { isAssigned: boolean; inStock: boolean; isFeatured: boolean; isBestseller: boolean; isChefSpecial: boolean }> = {};
        availableOutlets.forEach((o) => {
          if (Array.isArray(found.outlets)) {
            const oc = found.outlets.find((item) => item.outletId === o.id);
            configs[o.id] = {
              isAssigned: !!oc,
              inStock: oc ? oc.inStock !== false : true,
              isFeatured: oc ? !!oc.isFeatured : false,
              isBestseller: oc ? !!oc.isBestseller : false,
              isChefSpecial: oc ? !!oc.isChefSpecial : false,
            };
          } else if (Array.isArray(found.outletIds)) {
            const isAssigned = found.outletIds.includes(o.id);
            configs[o.id] = {
              isAssigned,
              inStock: found.inStock !== false,
              isFeatured: !!found.featured,
              isBestseller: !!found.bestseller,
              isChefSpecial: false,
            };
          } else {
            // Default assigned
            configs[o.id] = {
              isAssigned: true,
              inStock: found.inStock !== false,
              isFeatured: !!found.featured,
              isBestseller: !!found.bestseller,
              isChefSpecial: false,
            };
          }
        });
        setOutletConfigs(configs);
      } else {
        setErrorMessage('Product not found in current inventory.');
      }
    } else if (mode === 'new') {
      // In new mode, default select all active outlets as in stock
      setOutletConfigs((prev) => {
        if (Object.keys(prev).length > 0) return prev;
        const initial: Record<string, { isAssigned: boolean; inStock: boolean; isFeatured: boolean; isBestseller: boolean; isChefSpecial: boolean }> = {};
        availableOutlets.forEach((o) => {
          initial[o.id] = {
            isAssigned: o.isActive !== false,
            inStock: true,
            isFeatured: false,
            isBestseller: false,
            isChefSpecial: false,
          };
        });
        return initial;
      });
    }
  }, [mode, productId, allProducts, availableOutlets]);

  const toggleOutletAssignment = (outletId: string) => {
    setOutletConfigs((prev) => ({
      ...prev,
      [outletId]: {
        ...(prev[outletId] || { inStock: true, isFeatured: false, isBestseller: false, isChefSpecial: false }),
        isAssigned: !prev[outletId]?.isAssigned,
      },
    }));
  };

  const updateOutletField = (outletId: string, field: 'inStock' | 'isFeatured' | 'isBestseller' | 'isChefSpecial', val: boolean) => {
    setOutletConfigs((prev) => ({
      ...prev,
      [outletId]: {
        ...(prev[outletId] || { isAssigned: true, inStock: true, isFeatured: false, isBestseller: false, isChefSpecial: false }),
        [field]: val,
      },
    }));
  };

  const selectAllOutlets = (assigned: boolean) => {
    setOutletConfigs((prev) => {
      const next = { ...prev };
      availableOutlets.forEach((o) => {
        const existing = prev[o.id];
        if (assigned) {
          // Select all: select all outlets below without changing ribbon selections
          next[o.id] = {
            isAssigned: true,
            inStock: existing !== undefined ? existing.inStock : true,
            isFeatured: existing ? !!existing.isFeatured : false,
            isBestseller: existing ? !!existing.isBestseller : false,
            isChefSpecial: existing ? !!existing.isChefSpecial : false,
          };
        } else {
          // Clear all: uncheck all checkboxes (outlet + ribbon checkboxes) and mark out of stock
          next[o.id] = {
            isAssigned: false,
            inStock: false,
            isFeatured: false,
            isBestseller: false,
            isChefSpecial: false,
          };
        }
      });
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validation
    if (!name.trim()) {
      setErrorMessage('Please provide a dish name.');
      return;
    }

    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      setErrorMessage('Please provide a valid price greater than 0.');
      return;
    }

    if (!category) {
      setErrorMessage('Please select a category.');
      return;
    }

    if (!description.trim()) {
      setErrorMessage('Please provide a dish description.');
      return;
    }

    if (!image.trim()) {
      setErrorMessage('Please provide a product image URL.');
      return;
    }

    const ingredients = ingredientsText
      .split(',')
      .map((i) => i.trim())
      .filter(Boolean);

    // Build outlets array
    const assignedOutletsList: ProductOutletConfig[] = availableOutlets
      .filter((o) => outletConfigs[o.id]?.isAssigned)
      .map((o) => ({
        outletId: o.id,
        inStock: outletConfigs[o.id]?.inStock !== false,
        isFeatured: !!outletConfigs[o.id]?.isFeatured,
        isBestseller: !!outletConfigs[o.id]?.isBestseller,
        isChefSpecial: !!outletConfigs[o.id]?.isChefSpecial,
      }));

    if (assignedOutletsList.length === 0) {
      setErrorMessage('Please assign this dish to at least one kitchen outlet.');
      return;
    }

    const assignedOutletIds = assignedOutletsList.map((o) => o.outletId);

    const productPayload: Partial<Product> = {
      name: name.trim(),
      hindiName: hindiName.trim() || undefined,
      slug: slug.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      category,
      shortDescription: shortDescription.trim() || description.slice(0, 100),
      description: description.trim(),
      story: story.trim() || undefined,
      culinaryTitle: culinaryTitle.trim() || undefined,
      cookingMethodTitle: cookingMethodTitle.trim() || undefined,
      cookingMethodDesc: cookingMethodDesc.trim() || undefined,
      aromaTitle: aromaTitle.trim() || undefined,
      aromaDesc: aromaDesc.trim() || undefined,
      price: numPrice,
      originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
      image: image.trim(),
      galleryImages: [image.trim()],
      isVeg,
      isJainFriendly,
      spiceLevel,
      prepTimeMinutes: Number(prepTimeMinutes) || 30,
      serves: serves.trim() || 'Serves 1-2',
      calories: calories ? parseInt(calories, 10) : undefined,
      active,
      inStock: assignedOutletsList.some((o) => o.inStock),
      outlets: assignedOutletsList,
      outletIds: assignedOutletIds,
      ingredients: ingredients.length > 0 ? ingredients : ['Pure Cow Ghee', 'Heirloom Spices'],
    };

    setIsSubmitting(true);
    try {
      if (mode === 'new') {
        const created = await addProduct(productPayload);
        setSuccessMessage(`"${created.name}" has been successfully added to the menu!`);
        setTimeout(() => {
          goToOwnerProducts();
        }, 1200);
      } else if (mode === 'edit' && productId) {
        const updated = await editProduct(productId, productPayload);
        setSuccessMessage(`"${updated.name}" has been updated successfully.`);
        setTimeout(() => {
          goToOwnerProducts();
        }, 1200);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while saving the product.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <OwnerLayout
      activeTab={mode === 'new' ? 'new-product' : 'edit-product'}
      title={mode === 'new' ? 'Add New Menu Item' : `Edit Item: ${name || 'Product'}`}
      subtitle={
        mode === 'new'
          ? 'Fill in the dish details below to assign to kitchen outlets and publish to the live menu.'
          : 'Update pricing, descriptions, outlet stock availability, or merchandising flags.'
      }
      actions={
        <button
          type="button"
          onClick={goToOwnerProducts}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl border border-gray-200 shadow-2xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Products</span>
        </button>
      }
    >
      {/* Alert Messages */}
      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
          <div>
            <p className="font-bold">Cannot Save Product</p>
            <p className="text-[11px] text-rose-700 mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-emerald-800 text-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
          <div>
            <p className="font-bold">Success!</p>
            <p className="text-[11px] text-emerald-700 mt-0.5">{successMessage}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Primary Product Information (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Section 1: Basic Information */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-2xs space-y-4">
              <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-orange-600" />
                <span>Basic Details</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Dish Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Dish Name (English) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Nizami Royal Dum Mutton Biryani"
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-medium focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>

                {/* Hindi Name */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Hindi Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={hindiName}
                    onChange={(e) => setHindiName(e.target.value)}
                    placeholder="e.g. निज़ामी दम मटन बिरयानी"
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-medium focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>

                {/* URL Slug */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-gray-700">
                      URL Identifier (Slug) <span className="text-rose-500">*</span>
                    </label>
                    {mode === 'edit' && (
                      <button
                        type="button"
                        onClick={() => setIsSlugUnlocked((prev) => !prev)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:text-orange-700 transition-colors"
                      >
                        {isSlugUnlocked ? (
                          <>
                            <Lock className="w-3 h-3 text-gray-500" />
                            <span className="text-gray-600">Lock</span>
                          </>
                        ) : (
                          <>
                            <Unlock className="w-3 h-3 text-orange-600" />
                            <span>Unlock / Edit</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      disabled={mode === 'edit' && !isSlugUnlocked}
                      value={slug}
                      onChange={(e) => {
                        setSlug(e.target.value);
                        if (mode === 'new') setSlugManuallyEdited(true);
                      }}
                      placeholder="nizami-royal-dum-mutton-biryani"
                      className={`w-full px-3.5 py-2 border rounded-xl text-xs font-mono transition-colors ${
                        mode === 'edit' && !isSlugUnlocked
                          ? 'bg-gray-100/90 text-gray-500 border-gray-200 cursor-not-allowed select-none'
                          : 'bg-gray-50 text-gray-900 border-gray-200 focus:outline-none focus:border-orange-500 focus:bg-white'
                      }`}
                    />
                    {mode === 'edit' && !isSlugUnlocked && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                        <Lock className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>

                  {/* Helper hint and warning notices */}
                  {mode === 'new' ? (
                    <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">
                      Creates the clean web address for customers & SEO (e.g., <span className="font-mono text-orange-700 font-semibold">/#/product/{slug || 'dish-slug'}</span>). Auto-generates from the dish name, editable freely before saving.
                    </p>
                  ) : !isSlugUnlocked ? (
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-1.5">
                      <Lock className="w-3 h-3 text-gray-400 shrink-0" />
                      <span>Slug is locked to prevent broken links for customer bookmarks and shared links.</span>
                    </div>
                  ) : (
                    <div className="flex items-start gap-1.5 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2 mt-1.5 leading-relaxed">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>Warning:</strong> Changing this URL slug may break existing customer bookmarks, printed QR codes, or links shared on WhatsApp/social media.
                      </span>
                    </div>
                  )}
                </div>

                {/* Category Selector */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Menu Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-medium focus:outline-none focus:border-orange-500 focus:bg-white"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.slug || cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Short Description */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    One-line Teaser (Short Description)
                  </label>
                  <input
                    type="text"
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    placeholder="Slow-cooked tender lamb with long-grain basmati and aged saffron."
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-medium focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>

                {/* Full Description */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Full Description <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Elaborate on the heritage, texture, slow cooking, and authentic Indian roots of this dish..."
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-medium focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Kitchen Outlets Assignment (Many-to-Many with stock/badges) */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                    <Store className="w-4 h-4 text-orange-600" />
                    <span>Assigned Kitchen Outlets & Availability</span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Tick the kitchen outlets that serve this dish. You can also configure individual outlet stock and featured ribbons.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => selectAllOutlets(true)}
                    className="text-orange-600 hover:text-orange-700 font-bold"
                  >
                    Select All
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={() => selectAllOutlets(false)}
                    className="text-gray-500 hover:text-gray-700 font-medium"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {loadingOutlets ? (
                <div className="p-4 text-center text-xs text-gray-500">Loading outlets...</div>
              ) : availableOutlets.length === 0 ? (
                <div className="p-4 bg-amber-50 rounded-xl text-xs text-amber-900">
                  No kitchen outlets found. Please add outlets from the Outlets menu first.
                </div>
              ) : (
                <div className="space-y-3">
                  {availableOutlets.map((outlet) => {
                    const cfg = outletConfigs[outlet.id] || {
                      isAssigned: false,
                      inStock: true,
                      isFeatured: false,
                      isBestseller: false,
                    };

                    return (
                      <div
                        key={outlet.id}
                        className={`p-3.5 rounded-xl border transition-all ${
                          cfg.isAssigned
                            ? 'border-orange-300 bg-orange-50/30'
                            : 'border-gray-200 bg-gray-50/50 opacity-70'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          {/* Checkbox & Outlet Name */}
                          <label className="flex items-center gap-2.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={cfg.isAssigned}
                              onChange={() => toggleOutletAssignment(outlet.id)}
                              className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-gray-300"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-gray-900">
                                  {outlet.name}
                                </span>
                                <span className="px-1.5 py-0.5 bg-gray-100 text-gray-700 text-[10px] font-semibold rounded">
                                  {outlet.city}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-500 flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-gray-400" />
                                <span>{outlet.address}</span>
                              </p>
                            </div>
                          </label>

                          {/* Per-Outlet Controls (Active when assigned) */}
                          {cfg.isAssigned && (
                            <div className="flex items-center gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-200/80">
                              {/* Stock status toggle */}
                              <button
                                type="button"
                                onClick={() => updateOutletField(outlet.id, 'inStock', !cfg.inStock)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                                  cfg.inStock
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                                }`}
                              >
                                {cfg.inStock ? (
                                  <>
                                    <PackageCheck className="w-3 h-3 text-emerald-700" />
                                    <span>In Stock</span>
                                  </>
                                ) : (
                                  <>
                                    <PackageX className="w-3 h-3 text-amber-700" />
                                    <span>Out of Stock</span>
                                  </>
                                )}
                              </button>

                              {/* Featured checkbox */}
                              <label className="flex items-center gap-1 text-[11px] font-semibold text-gray-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={cfg.isFeatured}
                                  onChange={(e) => updateOutletField(outlet.id, 'isFeatured', e.target.checked)}
                                  className="w-3.5 h-3.5 rounded text-purple-600 focus:ring-purple-500 border-gray-300"
                                />
                                <span className="text-purple-900">Featured</span>
                              </label>

                              {/* Bestseller checkbox */}
                              <label className="flex items-center gap-1 text-[11px] font-semibold text-gray-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={cfg.isBestseller}
                                  onChange={(e) => updateOutletField(outlet.id, 'isBestseller', e.target.checked)}
                                  className="w-3.5 h-3.5 rounded text-orange-600 focus:ring-orange-500 border-gray-300"
                                />
                                <span className="text-orange-900">Bestseller</span>
                              </label>

                              {/* Chef's Special checkbox */}
                              <label className="flex items-center gap-1 text-[11px] font-semibold text-gray-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={cfg.isChefSpecial}
                                  onChange={(e) => updateOutletField(outlet.id, 'isChefSpecial', e.target.checked)}
                                  className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500 border-gray-300"
                                />
                                <span className="text-amber-900">Chef Special</span>
                              </label>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section 3: Pricing & Portions */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-2xs space-y-4">
              <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                <span>Pricing & Kitchen Preparation</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Selling Price */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Selling Price (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="1"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="499"
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-bold focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>

                {/* Original Price */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Original Price / MRP (₹) (Optional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(e.target.value)}
                    placeholder="549"
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-medium focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>

                {/* Prep Time */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Kitchen Prep Time (Minutes)
                  </label>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    value={prepTimeMinutes}
                    onChange={(e) => setPrepTimeMinutes(Number(e.target.value))}
                    placeholder="30"
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-medium focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>

                {/* Serves */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Serving Size
                  </label>
                  <input
                    type="text"
                    value={serves}
                    onChange={(e) => setServes(e.target.value)}
                    placeholder="Serves 1-2"
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-medium focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>

                {/* Spice Level */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Spice Level
                  </label>
                  <select
                    value={spiceLevel}
                    onChange={(e) => setSpiceLevel(e.target.value as any)}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-medium focus:outline-none focus:border-orange-500 focus:bg-white"
                  >
                    <option value="Mild">Mild</option>
                    <option value="Medium">Medium</option>
                    <option value="Spicy">Spicy</option>
                    <option value="Extra Spicy">Extra Spicy</option>
                  </select>
                </div>

                {/* Calories */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Calories (kcal)
                  </label>
                  <input
                    type="number"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    placeholder="e.g. 620"
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-medium focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Ingredients */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Key Ingredients (Comma Separated)
                </label>
                <input
                  type="text"
                  value={ingredientsText}
                  onChange={(e) => setIngredientsText(e.target.value)}
                  placeholder="Pure Cow Ghee, Kashmiri Saffron, Daawat Basmati, Green Cardamom, Star Anise"
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-medium focus:outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Image, Badges & Availability (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Section 4: Product Image */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs space-y-4">
              <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-orange-600" />
                <span>Product Image</span>
              </h3>

              {/* Image Preview */}
              <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                {image ? (
                  <img
                    src={image}
                    alt="Preview"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as any).src =
                        'https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=800&auto=format&fit=crop';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                    <ImageIcon className="w-8 h-8 mb-1" />
                    <span className="text-[10px]">No image provided</span>
                  </div>
                )}
              </div>

              {/* Image URL Input */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Image URL <span className="text-rose-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-medium focus:outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>

              {/* Quick Sample Image Presets */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Quick Image Presets:
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {SAMPLE_FOOD_IMAGES.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setImage(preset.url)}
                      className="text-left px-2 py-1 bg-gray-50 hover:bg-orange-50 hover:text-orange-900 border border-gray-200 rounded-lg text-[10px] text-gray-700 truncate transition-colors cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 5: Store Visibility & Dietary */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs space-y-4">
              <h3 className="font-extrabold text-sm text-gray-900">
                Storefront & Dietary
              </h3>

              <div className="space-y-3">
                {/* Active / Inactive Switch */}
                <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50/50 cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-gray-300"
                  />
                  <div>
                    <span className="font-bold text-xs text-gray-900">Storefront Active (Visible)</span>
                    <p className="text-[11px] text-gray-500">
                      When inactive, this dish is completely hidden from customer menus across all outlets.
                    </p>
                  </div>
                </label>

                {/* Veg / Non-Veg */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isVeg}
                    onChange={(e) => setIsVeg(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300"
                  />
                  <span className="font-semibold text-xs text-gray-900">100% Pure Vegetarian Dish</span>
                </label>

                {/* Jain Friendly */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isJainFriendly}
                    onChange={(e) => setIsJainFriendly(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300"
                  />
                  <span className="font-semibold text-xs text-gray-900">Jain Friendly (No Onion/Garlic option)</span>
                </label>
              </div>
            </div>

            {/* Save & Submit Button Card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs space-y-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? 'Saving Item...'
                    : mode === 'new'
                    ? 'Publish Dish to Menu'
                    : 'Save Changes'}
                </span>
              </button>

              <button
                type="button"
                onClick={goToOwnerProducts}
                className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors text-center cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </form>
    </OwnerLayout>
  );
};
