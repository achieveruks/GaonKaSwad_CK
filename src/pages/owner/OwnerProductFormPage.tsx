import React, { useState, useEffect } from 'react';
import { OwnerLayout } from './OwnerLayout';
import { useProducts } from '../../context/ProductContext';
import { useNavigation } from '../../context/NavigationContext';
import { CATEGORIES } from '../../data/products';
import { Product } from '../../types';
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

  // Form State
  const [name, setName] = useState('');
  const [hindiName, setHindiName] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]?.slug || 'dum-biryanis');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  // Option B: Custom Culinary Story & Highlights State
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
  const [featured, setFeatured] = useState(false);
  const [bestseller, setBestseller] = useState(false);
  const [newArrival, setNewArrival] = useState(true);
  const [chefSpecial, setChefSpecial] = useState(false);
  const [active, setActive] = useState(true);
  const [inStock, setInStock] = useState(true);
  const [ingredientsText, setIngredientsText] = useState('Pure Cow Ghee, Heirloom Spices, Saffron, Fresh Ingredients');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Auto-generate slug when creating a new product
  const handleNameChange = (val: string) => {
    setName(val);
    if (mode === 'new') {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setSlug(generated);
    }
  };

  // Populate data in edit mode
  useEffect(() => {
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
        setFeatured(!!found.featured);
        setBestseller(!!found.bestseller);
        setNewArrival(!!found.newArrival);
        setChefSpecial(!!found.chefSpecial);
        setActive(found.active !== false);
        setInStock(found.inStock !== false);
        setIngredientsText(
          Array.isArray(found.ingredients)
            ? found.ingredients.join(', ')
            : 'Pure Cow Ghee, Heirloom Spices, Fresh Ingredients'
        );
      } else {
        setErrorMessage('Product not found in current inventory.');
      }
    }
  }, [mode, productId, allProducts]);

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
      featured,
      bestseller,
      newArrival,
      chefSpecial,
      active,
      inStock,
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
          ? 'Fill in the dish details below to publish directly to the live customer menu.'
          : 'Update pricing, descriptions, stock availability, or merchandising flags.'
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
                    placeholder="e.g. निज़ामी मटन बिरयानी"
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-medium focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>

                {/* Slug */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    URL Slug <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="nizami-mutton-biryani"
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-mono focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-medium focus:outline-none focus:border-orange-500 focus:bg-white cursor-pointer"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.slug} value={cat.slug}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Short Description */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Short Tagline / Catchphrase
                  </label>
                  <input
                    type="text"
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    placeholder="e.g. Fragrant aged Daawat basmati layered with succulent tender goat meat"
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-medium focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>

                {/* Full Description */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Detailed Culinary Description <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe how the dish is cooked, authentic village techniques, hand-pounded spices, and flavor notes..."
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-medium focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Culinary Story & Cooking Method (Option B Custom Override) */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-orange-600 shrink-0" />
                  <h3 className="font-extrabold text-sm text-gray-900">
                    Culinary Story & Cooking Highlights (Option B)
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-orange-700 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200/60 w-fit">
                  Optional • Category Defaults (Option A) apply if empty
                </span>
              </div>

              {/* Notice & Rule summary */}
              <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/70 text-xs text-amber-950 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold">
                  <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>How Culinary Story display works:</span>
                </div>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  <strong>Option A (Default):</strong> If these fields are left empty, the storefront automatically displays authentic category-smart highlights (e.g. <em>Handi Dum Cooking & Saffron-Kewra</em> for Biryanis, <em>Slow Simmering & Desi Makhan</em> for Curries, <em>Live Charcoal Tandoor</em> for Starters).
                </p>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  <strong>Option B (Custom):</strong> If you fill in your own custom culinary story or technique below, it will override the category default.
                </p>
              </div>

              {/* Category Default Preview Box */}
              {(() => {
                const normCat = normalizeCategorySlug(category);
                const defaults = CATEGORY_CULINARY_DEFAULTS[normCat];
                if (!defaults) return null;
                return (
                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-600 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-gray-700">
                      <span>Default for selected category ({normCat}):</span>
                      <span className="text-gray-500 font-normal">{defaults.heading}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 italic bg-white p-2.5 rounded-lg border border-gray-100">
                      "{defaults.story}"
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="bg-white p-2 rounded-lg border border-gray-100">
                        <span className="font-bold text-gray-800">Box 1: </span>
                        <span className="text-gray-600">{defaults.highlight1.title}</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-gray-100">
                        <span className="font-bold text-gray-800">Box 2: </span>
                        <span className="text-gray-600">{defaults.highlight2.title}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-4 pt-1">
                {/* Story / Chef's Note */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Custom Culinary Story / Chef's Note (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={story}
                    onChange={(e) => setStory(e.target.value)}
                    placeholder="Enter custom heritage story or cooking ritual (overrides category default)..."
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-medium focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>

                {/* Custom Heading */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Custom Story Heading (Optional)
                  </label>
                  <input
                    type="text"
                    value={culinaryTitle}
                    onChange={(e) => setCulinaryTitle(e.target.value)}
                    placeholder="e.g. 70-Year-Old Old Delhi Daryaganj Recipe"
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-medium focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>

                {/* Custom Highlights Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Highlight 1 */}
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                    <label className="block text-xs font-bold text-gray-800">
                      Custom Highlight Box 1 (Optional)
                    </label>
                    <input
                      type="text"
                      value={cookingMethodTitle}
                      onChange={(e) => setCookingMethodTitle(e.target.value)}
                      placeholder="Title: e.g. Sigdi Charcoal Cooking"
                      className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 font-medium focus:outline-none focus:border-orange-500"
                    />
                    <textarea
                      rows={2}
                      value={cookingMethodDesc}
                      onChange={(e) => setCookingMethodDesc(e.target.value)}
                      placeholder="Description: e.g. Slow simmered on copper sigdi embers..."
                      className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 font-medium focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  {/* Highlight 2 */}
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                    <label className="block text-xs font-bold text-gray-800">
                      Custom Highlight Box 2 (Optional)
                    </label>
                    <input
                      type="text"
                      value={aromaTitle}
                      onChange={(e) => setAromaTitle(e.target.value)}
                      placeholder="Title: e.g. Kashmiri Mongra Saffron"
                      className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 font-medium focus:outline-none focus:border-orange-500"
                    />
                    <textarea
                      rows={2}
                      value={aromaDesc}
                      onChange={(e) => setAromaDesc(e.target.value)}
                      placeholder="Description: e.g. Steeped in warm milk for rich golden tint..."
                      className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 font-medium focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>
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
            {/* Section 3: Product Image */}
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

            {/* Section 4: Visibility & Stock Status */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs space-y-4">
              <h3 className="font-extrabold text-sm text-gray-900">
                Inventory & Store Status
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
                    <span className="font-bold text-xs text-gray-900">Active (Visible in Store)</span>
                    <p className="text-[11px] text-gray-500">
                      When inactive, this dish is hidden from customer browsing and search.
                    </p>
                  </div>
                </label>

                {/* In Stock / Out of Stock Switch */}
                <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50/50 cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={inStock}
                    onChange={(e) => setInStock(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-gray-300"
                  />
                  <div>
                    <span className="font-bold text-xs text-gray-900">In Stock (Available for Orders)</span>
                    <p className="text-[11px] text-gray-500">
                      If unchecked, displays "Out of Stock" and disables the Add to Cart button.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Section 5: Merchandising Badges & Dietary */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs space-y-4">
              <h3 className="font-extrabold text-sm text-gray-900">
                Merchandising & Dietary
              </h3>

              <div className="space-y-2.5 text-xs text-gray-700">
                {/* Veg / Non-Veg */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isVeg}
                    onChange={(e) => setIsVeg(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300"
                  />
                  <span className="font-semibold text-gray-900">100% Pure Vegetarian Dish</span>
                </label>

                {/* Jain Friendly */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isJainFriendly}
                    onChange={(e) => setIsJainFriendly(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300"
                  />
                  <span className="font-semibold text-gray-900">Jain Friendly (No Onion/Garlic option)</span>
                </label>

                {/* Featured */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={featured}
                    onChange={(e) => setFeatured(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-gray-300"
                  />
                  <span className="font-semibold text-gray-900">Featured (Homepage Showcase)</span>
                </label>

                {/* Bestseller */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bestseller}
                    onChange={(e) => setBestseller(e.target.checked)}
                    className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-gray-300"
                  />
                  <span className="font-semibold text-gray-900">Bestseller Ribbon</span>
                </label>

                {/* Chef Special */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={chefSpecial}
                    onChange={(e) => setChefSpecial(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-gray-300"
                  />
                  <span className="font-semibold text-gray-900">Chef's Signature Recipe</span>
                </label>

                {/* New Arrival */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newArrival}
                    onChange={(e) => setNewArrival(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="font-semibold text-gray-900">New Arrival Tag</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Actions Bottom Bar */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <button
            type="button"
            onClick={goToOwnerProducts}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Cancel & Return
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving to Database...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>{mode === 'new' ? 'Save & Publish Dish' : 'Update Dish Changes'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </OwnerLayout>
  );
};
