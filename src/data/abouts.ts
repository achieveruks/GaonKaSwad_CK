import { OutletAbout } from '../types';

export const DEFAULT_OUTLET_ABOUT: Omit<OutletAbout, 'id' | 'createdAt' | 'updatedAt'> = {
  outletId: '',
  heroFireLine: 'THE HERITAGE BEHIND GAON KA SWAD',
  heroHeader: 'Crafting Authentic Culinary Memories, One Handi at a Time',
  heroDescription:
    'Born out of a deep reverence for forgotten village recipes and slow-cooking traditions, Gaon Ka Swad brings the soulful tastes of rustic Indian households straight to modern dining tables.',
  storyLine: 'WHO WE ARE',
  storyTitle: 'A Modern Cloud Kitchen with Heirloom Roots',
  storyDescription:
    'Gaon Ka Swad was founded with a singular conviction: genuine taste cannot be rushed. In a world of 10-minute industrial microwave prep, we chose the path of slow-simmered handis, 24-hour charcoal embers, whole stone-ground spices, and pure cow desi ghee.\n\nEvery recipe in our menu traces back to traditional culinary masters — from Awadhi royal khansamas to old Delhi dhabas and Champaran clay pot braisers. We do not use chemical preservatives, artificial food coloring, or pre-packaged spice pastes.',
  storyHighlight1Title: '100% Pure Desi Ghee',
  storyHighlight1Description: 'Pure Desi Ghee & Raw Spices',
  storyHighlight2Title: '24 Hrs Slow-Simmered',
  storyHighlight2Description: 'Slow-Simmered Dal Bukhara',
  outletImage: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=1000&auto=format&fit=crop',
};

export const INITIAL_OUTLET_ABOUTS: OutletAbout[] = [
  {
    outletId: 'blr-hsr',
    heroFireLine: 'THE HERITAGE BEHIND GAON KA SWAD • HSR LAYOUT',
    heroHeader: 'Crafting Authentic Culinary Memories, One Handi at a Time',
    heroDescription:
      'Born out of a deep reverence for forgotten village recipes and slow-cooking traditions, our HSR Layout kitchen brings the soulful tastes of rustic Indian households straight to South Bangalore dining tables.',
    storyLine: 'WHO WE ARE • HSR KITCHEN',
    storyTitle: 'A Modern Cloud Kitchen with Heirloom Roots',
    storyDescription:
      'Gaon Ka Swad HSR was founded with a singular conviction: genuine taste cannot be rushed. In a world of 10-minute industrial microwave prep, we chose the path of slow-simmered handis, 24-hour charcoal embers, whole stone-ground spices, and pure cow desi ghee.\n\nEvery recipe in our menu traces back to traditional culinary masters — from Awadhi royal khansamas to old Delhi dhabas and Champaran clay pot braisers. We do not use chemical preservatives, artificial food coloring, or pre-packaged spice pastes.',
    storyHighlight1Title: '100% Pure Desi Ghee',
    storyHighlight1Description: 'Pure Desi Ghee & Raw Spices',
    storyHighlight2Title: '24 Hrs Slow-Simmered',
    storyHighlight2Description: 'Slow-Simmered Dal Bukhara',
    outletImage: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=1000&auto=format&fit=crop',
  },
  {
    outletId: 'blr-whitefield',
    heroFireLine: 'THE HERITAGE BEHIND GAON KA SWAD • WHITEFIELD',
    heroHeader: 'Authentic Village Aromas Delivered to Whitefield',
    heroDescription:
      'Bringing authentic clay-pot slow-cooked delicacies, clay-oven tandoori grills, and artisanal dum biryanis to tech corridor homes in Whitefield and ITPL.',
    storyLine: 'WHITEFIELD ARTISANAL CLOUD KITCHEN',
    storyTitle: 'Time-Honored Flavors in Bangalore’s Tech Hub',
    storyDescription:
      'Our Whitefield kitchen preserves the ancient art of slow dum cooking. Prepared in sealed earthen pots over slow flame, each dish carries the warmth and purity of authentic village kitchens.\n\nWe source pure A2 cow ghee and whole hand-ground spices directly from heritage farmers, ensuring zero artificial additives or shortcuts in every preparation.',
    storyHighlight1Title: 'Clay-Pot Handi',
    storyHighlight1Description: 'Natural Terracotta Dum Cooking',
    storyHighlight2Title: 'Zero Preservatives',
    storyHighlight2Description: '100% Pure & Fresh Daily',
    outletImage: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?q=80&w=1000&auto=format&fit=crop',
  },
  {
    outletId: 'blr-indiranagar',
    heroFireLine: 'THE HERITAGE BEHIND GAON KA SWAD • INDIRANAGAR',
    heroHeader: 'Royal Dum Feasts & Timeless Charcoal Hearth Grills',
    heroDescription:
      'Experience the regal culinary traditions of Awadh, Old Delhi, and Punjab, curated by master khansamas and delivered piping hot across Central and East Bangalore.',
    storyLine: 'CENTRAL BANGALORE KITCHEN',
    storyTitle: 'Craftsmanship Rooted in Centuries of Tradition',
    storyDescription:
      'Located in the heart of Indiranagar, our artisanal cloud kitchen crafts authentic dum biryanis, 24-hour slow-simmered dal bukhara, and smoky tandoori kebabs using heirloom copper degs and clay tandoors.\n\nEvery order is packed in food-grade, sealed eco-handis to preserve the pristine royal aroma until it reaches your dining table.',
    storyHighlight1Title: 'Live Charcoal Tandoor',
    storyHighlight1Description: 'Smoky Clay Oven Mastery',
    storyHighlight2Title: 'Awadhi Khansamas',
    storyHighlight2Description: 'Generational Recipe Heritage',
    outletImage: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?q=80&w=1000&auto=format&fit=crop',
  },
  {
    outletId: 'bbsr-patia',
    heroFireLine: 'THE HERITAGE BEHIND GAON KA SWAD • PATIA BHUBANESWAR',
    heroHeader: 'Soulful Rustic Flavors Delivered Across Infocity & Patia',
    heroDescription:
      'From authentic Champaran handi meat to Odisha temple-style dalma and Lucknowi dum biryanis, our Patia kitchen celebrates India’s richest culinary heritage.',
    storyLine: 'BHUBANESWAR ARTISANAL KITCHEN',
    storyTitle: 'A Tribute to Forgotten Kitchen Traditions',
    storyDescription:
      'Gaon Ka Swad Patia brings authentic earthen pot cooking and pure desi ghee recipes to Bhubaneswar. We honor time-tested cooking methods that extract deep natural flavors without artificial enhancers.\n\nOur kitchen strictly enforces hygienic cloud kitchen standards, eco-friendly food packaging, and non-contact delivery across Patia and KIIT Square.',
    storyHighlight1Title: 'Pure Desi Ghee',
    storyHighlight1Description: 'Farm-Fresh Rich Aroma',
    storyHighlight2Title: 'Authentic Handi',
    storyHighlight2Description: 'Slow-Cooked Dum in Sealed Pots',
    outletImage: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=1000&auto=format&fit=crop',
  },
  {
    outletId: 'bbsr-khandagiri',
    heroFireLine: 'THE HERITAGE BEHIND GAON KA SWAD • KHANDAGIRI',
    heroHeader: 'Heirloom Village Recipes for Bhubaneswar Heritage City',
    heroDescription:
      'Savor royal dum curries, slow-simmered lentils, and rustic breads crafted with generational passion in the historical foothills of Khandagiri.',
    storyLine: 'KHANDAGIRI CLOUD KITCHEN',
    storyTitle: 'Honoring India’s Great Culinary Roots',
    storyDescription:
      'Our Khandagiri kitchen is dedicated to preserving the purity and soul of traditional Indian hearths. Using genuine brass degs, earthen handis, and hand-pounded spices, we prepare every dish with reverence and care.\n\nEnjoy piping hot, safe, and nutritious royal feasts in the comfort of your home with our dedicated delivery coverage.',
    storyHighlight1Title: 'Hand-Pounded Spices',
    storyHighlight1Description: 'Stone-Ground Authentic Masalas',
    storyHighlight2Title: 'Eco Handi Delivery',
    storyHighlight2Description: 'Sealed for Freshness & Aroma',
    outletImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1000&auto=format&fit=crop',
  },
];
