import { Product } from '../types';

export interface CulinaryHighlightInfo {
  heading: string;
  story: string;
  highlight1: {
    title: string;
    description: string;
  };
  highlight2: {
    title: string;
    description: string;
  };
}

export const CATEGORY_CULINARY_DEFAULTS: Record<string, CulinaryHighlightInfo> = {
  'dum-biryanis': {
    heading: 'Heirloom Dum Cooking Ritual',
    story: 'Prepared according to classic Awadhi and Hyderabadi dum techniques. Long-grain aged basmati rice and marinated cuts are layered in earthenware and sealed with dough, allowing the ingredients to cook in their own trapped fragrant steam over gentle charcoal embers.',
    highlight1: {
      title: 'Handi Dum Cooking',
      description: 'Slow-simmered in genuine sealed clay earthenware to naturally regulate moisture, preserve succulent textures, and deliver signature earthy undertones.',
    },
    highlight2: {
      title: 'Saffron-Kewra Aromatics',
      description: 'Infused with royal Kashmiri saffron, stone-ground garam masala, pure desi ghee, and fragrant kewra dew for regal aroma and grain separation.',
    },
  },
  'slow-cooked-curries': {
    heading: 'Slow-Simmered Bhunai Technique',
    story: 'Cooked with patient slow-fire reduction (Bhunai), roasting whole spices in cold-pressed oils and pure desi ghee until the masalas release their deepest aromatic essential oils and develop a rich, complex gravy texture.',
    highlight1: {
      title: 'Slow Simmering (Bhunai)',
      description: 'Simmered gently on low heat for hours so sun-ripened tomatoes, roasted onions, and whole spices meld together into an intensely flavorful base.',
    },
    highlight2: {
      title: 'Churned Desi Makhan / Makhani Gravy',
      description: 'Finished with authentic churned white butter (makhan), velvety cashew paste, and sun-dried kasoori methi for a silky, rich finish.',
    },
  },
  'tandoor-starters': {
    heading: 'Live Charcoal Clay Tandoor Craft',
    story: 'Marinated in authentic rustic spices and skewered over roaring natural hardwood charcoal in traditional clay tandoor ovens at intense temperatures exceeding 400°C for mouthwatering smokiness and juicy tenderness.',
    highlight1: {
      title: 'Live Charcoal Clay Tandoor',
      description: 'Direct high-heat charcoal searing seals in natural juices while imparting that irresistible authentic tandoori char and smoky essence.',
    },
    highlight2: {
      title: 'Mustard-Yogurt Marinade',
      description: 'Double-marinated in artisanal cold-pressed mustard oil, thick hung curd, Kashmiri deghi mirch, and hand-pounded spices for deep flavor penetration.',
    },
  },
  'breads-accompaniments': {
    heading: 'Traditional Clay Oven Baking',
    story: 'Hand-stretched dough slapped directly against the flaming clay walls of our traditional tandoor, blistering instantly to create fluffy, airy pockets and a delicately crisp golden crust.',
    highlight1: {
      title: 'Clay Oven Wall Baking',
      description: 'High-temperature radiant heat from unglazed clay walls bakes the bread in seconds, producing soft, airy inner layers and crisp bubbles.',
    },
    highlight2: {
      title: 'Pure Desi Ghee Wash',
      description: 'Brushed generously right out of the tandoor with golden clarified butter (desi ghee), garlic butter, or fresh garden herbs.',
    },
  },
  'desserts-beverages': {
    heading: 'Artisanal Confectionery & Beverage Craft',
    story: 'Crafted with time-honored Indian halwai traditions using full-cream farm milk slowly reduced in heavy kadhais, unrefined sweeteners, and aromatic botanical infusions for pure heritage indulgence.',
    highlight1: {
      title: 'Slow Reduced Khoya / Earthen Matka',
      description: 'Cooked down patiently over low heat in earthen pots to achieve natural thick dairy texture without artificial stabilizers or synthetic colors.',
    },
    highlight2: {
      title: 'Rose Cardamom Infusion',
      description: 'Delicately scented with organic Damascus rose water, green cardamom seeds, saffron strands, and crushed roasted pistachios.',
    },
  },
};

// Fallback for general categories
const GENERAL_CULINARY_DEFAULT: CulinaryHighlightInfo = {
  heading: 'Traditional Kitchen Craft & Heirloom Methods',
  story: 'Prepared according to classic heirloom culinary techniques, simmered gently over slow wood embers to ensure every ingredient absorbs rich aromatics.',
  highlight1: {
    title: 'Traditional Preparation',
    description: 'Cooked in authentic traditional cookware to naturally preserve flavors, textures, and deliver signature wholesome taste.',
  },
  highlight2: {
    title: 'Pure Farm-Fresh Ingredients',
    description: 'Crafted with fresh whole spices, stone-ground masalas, and pure desi ghee with no artificial preservatives.',
  },
};

export function normalizeCategorySlug(rawCategory?: string): string {
  if (!rawCategory) return 'dum-biryanis';
  const c = rawCategory.toLowerCase().trim();
  if (c.includes('biryani') || c === 'dum-biryanis') return 'dum-biryanis';
  if (c.includes('curry') || c.includes('curries') || c === 'slow-cooked-curries') return 'slow-cooked-curries';
  if (c.includes('starter') || c.includes('tandoor') || c.includes('kebab') || c === 'tandoor-starters') return 'tandoor-starters';
  if (c.includes('bread') || c.includes('roti') || c.includes('naan') || c === 'breads-accompaniments') return 'breads-accompaniments';
  if (c.includes('dessert') || c.includes('sweet') || c.includes('drink') || c.includes('beverage') || c === 'desserts-beverages') return 'desserts-beverages';
  return c;
}

/**
 * Returns Category-Smart highlights with Owner custom override support.
 * If Option B fields are provided by owner, they override the Option A defaults.
 */
export function getCulinaryHighlights(product?: Partial<Product> | null): CulinaryHighlightInfo {
  if (!product) return GENERAL_CULINARY_DEFAULT;

  const normalizedCat = normalizeCategorySlug(product.category);
  const baseDefaults = CATEGORY_CULINARY_DEFAULTS[normalizedCat] || GENERAL_CULINARY_DEFAULT;

  return {
    heading: product.culinaryTitle?.trim() || baseDefaults.heading,
    story: product.story?.trim() || baseDefaults.story,
    highlight1: {
      title: product.cookingMethodTitle?.trim() || baseDefaults.highlight1.title,
      description: product.cookingMethodDesc?.trim() || baseDefaults.highlight1.description,
    },
    highlight2: {
      title: product.aromaTitle?.trim() || baseDefaults.highlight2.title,
      description: product.aromaDesc?.trim() || baseDefaults.highlight2.description,
    },
  };
}
