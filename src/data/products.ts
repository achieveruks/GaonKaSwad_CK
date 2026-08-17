import { Product, Category, Coupon } from '../types';

export const CATEGORIES: Category[] = [
  {
    id: 'biryani',
    name: 'Dum Biryanis & Rice',
    slug: 'dum-biryanis',
    tagline: 'Slow-cooked in sealed handis with saffron & whole spices',
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?q=80&w=800&auto=format&fit=crop',
    itemCount: 4,
    iconName: 'Flame'
  },
  {
    id: 'curries',
    name: 'Slow-Cooked Curries',
    slug: 'slow-cooked-curries',
    tagline: 'Rich, aromatic gravies simmered over slow charcoal',
    image: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?q=80&w=800&auto=format&fit=crop',
    itemCount: 5,
    iconName: 'Soup'
  },
  {
    id: 'starters',
    name: 'Tandoor & Starters',
    slug: 'tandoor-starters',
    tagline: 'Smoky, charred clay oven kebabs & crisp bites',
    image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?q=80&w=800&auto=format&fit=crop',
    itemCount: 4,
    iconName: 'Utensils'
  },
  {
    id: 'breads',
    name: 'Breads & Accompaniments',
    slug: 'breads-accompaniments',
    tagline: 'Freshly baked tandoori naans, rotis & seasoned raitas',
    image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?q=80&w=800&auto=format&fit=crop',
    itemCount: 3,
    iconName: 'Wheat'
  },
  {
    id: 'desserts',
    name: 'Artisanal Desserts & Drinks',
    slug: 'desserts-beverages',
    tagline: 'Traditional sweet confections & chilled royal lassis',
    image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?q=80&w=800&auto=format&fit=crop',
    itemCount: 3,
    iconName: 'Sparkles'
  }
];

export const PRODUCTS: Product[] = [
  {
    id: 1,
    name: 'Nizami Royal Dum Mutton Biryani',
    hindiName: 'निज़ामी दम मटन बिरयानी',
    slug: 'nizami-royal-dum-mutton-biryani',
    shortDescription: 'Tender baby lamb cuts layered with aged long-grain basmati, saffron dew, and caramelized onions.',
    description: 'Our crown jewel dish. Marinated overnight in freshly ground whole spices, organic curd, and Kashmiri red chillies, then layered with aged Dehradun basmati rice and sealed with dough in a heavy clay pot (dum pukht) to retain every ounce of aroma and moisture.',
    story: 'Prepared using an authentic 19th-century royal Nizami family recipe passed down through master khansamas. Simmered over wood embers for 4 hours.',
    price: 499,
    originalPrice: 599,
    category: 'dum-biryanis',
    rating: 4.9,
    reviewsCount: 284,
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?q=80&w=800&auto=format&fit=crop',
    galleryImages: [
      'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1589302168068-964664d93dc0?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?q=80&w=800&auto=format&fit=crop'
    ],
    isVeg: false,
    spiceLevel: 'Medium',
    prepTimeMinutes: 25,
    serves: '1-2 persons',
    calories: 680,
    featured: true,
    bestseller: true,
    newArrival: false,
    chefSpecial: true,
    variants: [
      { id: 'v1-regular', name: 'Regular (Serves 1-2)', price: 499, originalPrice: 599, serves: '1-2 Persons', weight: '650g' },
      { id: 'v1-jumbo', name: 'Handi Feast (Serves 3-4)', price: 949, originalPrice: 1149, serves: '3-4 Persons', weight: '1300g' }
    ],
    addons: [
      { id: 'a1', name: 'Burani Garlic Raita (150ml)', price: 49, isVeg: true },
      { id: 'a2', name: 'Mirchi Ka Salan (150ml)', price: 59, isVeg: true },
      { id: 'a3', name: 'Extra Boiled Egg (2 pcs)', price: 40, isVeg: false }
    ],
    ingredients: ['Tender Goat Lamb', 'Dehradun Basmati Rice', 'Pure Desi Ghee', 'Kashmiri Saffron', 'Fried Onions', 'Cardamom', 'Mace', 'Mint Leaves'],
    allergens: ['Dairy (Ghee, Curd)'],
    reviewsList: [
      { id: 'r1', userName: 'Rohit Malhotra', userLocation: 'Bandra, Mumbai', rating: 5, date: '2 days ago', comment: 'Hands down the most authentic dum biryani delivered hot in clay handi! The lamb was melt-in-mouth tender.', verified: true },
      { id: 'r2', userName: 'Ananya Sharma', userLocation: 'Koramangala, Bengaluru', rating: 5, date: '1 week ago', comment: 'Aromatic, non-greasy, and bursting with flavors. The packaging was immaculate.', verified: true }
    ]
  },
  {
    id: 2,
    name: 'Awadhi Shahi Paneer Dum Biryani',
    hindiName: 'अवधी शाही पनीर दम बिरयानी',
    slug: 'awadhi-shahi-paneer-dum-biryani',
    shortDescription: 'Fresh malai paneer cubes, garden vegetables, and aromatic saffron rice cooked dum style.',
    description: 'Golden spiced malai paneer cubes and garden green peas simmered with whole spices, rose water, and kewra essence. Cooked under traditional steam pressure to achieve unmatched grain separation and delicate herbal fragrance.',
    story: 'Crafted especially for connoisseurs of vegetarian Mughlai cooking who value royal aromas and succulent dairy paneer.',
    price: 389,
    originalPrice: 449,
    category: 'dum-biryanis',
    rating: 4.8,
    reviewsCount: 198,
    image: 'https://images.unsplash.com/photo-1642821373181-696a54913e93?q=80&w=800&auto=format&fit=crop',
    galleryImages: [
      'https://images.unsplash.com/photo-1642821373181-696a54913e93?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?q=80&w=800&auto=format&fit=crop'
    ],
    isVeg: true,
    isJainFriendly: true,
    spiceLevel: 'Mild',
    prepTimeMinutes: 20,
    serves: '1-2 persons',
    calories: 540,
    featured: true,
    bestseller: false,
    newArrival: false,
    chefSpecial: false,
    variants: [
      { id: 'v2-regular', name: 'Regular (Serves 1-2)', price: 389, originalPrice: 449, serves: '1-2 Persons', weight: '600g' },
      { id: 'v2-jumbo', name: 'Jumbo Handi (Serves 3-4)', price: 749, originalPrice: 849, serves: '3-4 Persons', weight: '1200g' }
    ],
    addons: [
      { id: 'a1', name: 'Burani Garlic Raita (150ml)', price: 49, isVeg: true },
      { id: 'a4', name: 'Kachumber Salad', price: 35, isVeg: true }
    ],
    ingredients: ['Artisanal Malai Paneer', 'Basmati Rice', 'Saffron', 'Cashew Paste', 'Kewra Water', 'Green Cardamom', 'Desi Ghee'],
    allergens: ['Dairy (Paneer, Ghee)', 'Tree Nuts (Cashews)'],
    reviewsList: [
      { id: 'r3', userName: 'Pooja Hegde', userLocation: 'Indiranagar, Bengaluru', rating: 5, date: '3 days ago', comment: 'The paneer was silky soft and the rice was cooked to absolute perfection. 10/10!', verified: true }
    ]
  },
  {
    id: 3,
    name: 'Old Delhi Purani Dilli Butter Chicken',
    hindiName: 'पुरानी दिल्ली बटर चिकन',
    slug: 'old-delhi-purani-dilli-butter-chicken',
    shortDescription: 'Clay-oven tandoori chicken chunks simmered in a velvety sun-ripened tomato & butter makhani gravy.',
    description: 'Char-grilled boneless chicken tikka cooked over roaring charcoal, then folded into a silky reduction of ripe tomatoes, churned white makhan, cashew cream, and dried fenugreek leaves (kasoori methi).',
    story: 'Recreated using the classic 1950s Daryaganj recipe with zero synthetic food colors and authentic churned cultured butter.',
    price: 449,
    originalPrice: 529,
    category: 'slow-cooked-curries',
    rating: 4.9,
    reviewsCount: 412,
    image: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?q=80&w=800&auto=format&fit=crop',
    galleryImages: [
      'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?q=80&w=800&auto=format&fit=crop'
    ],
    isVeg: false,
    spiceLevel: 'Medium',
    prepTimeMinutes: 20,
    serves: '2 persons',
    calories: 610,
    featured: true,
    bestseller: true,
    newArrival: false,
    chefSpecial: true,
    variants: [
      { id: 'v3-half', name: 'Regular Portion (500ml)', price: 449, originalPrice: 529, serves: '2 Persons', weight: '500ml' },
      { id: 'v3-full', name: 'Family Feast (900ml)', price: 799, originalPrice: 949, serves: '3-4 Persons', weight: '900ml' }
    ],
    addons: [
      { id: 'b1', name: 'Butter Garlic Naan (1 pc)', price: 65, isVeg: true },
      { id: 'b2', name: 'Laccha Paratha (1 pc)', price: 55, isVeg: true }
    ],
    ingredients: ['Tandoori Boneless Chicken', 'Vine Tomatoes', 'Cultured White Butter', 'Single Cream', 'Cashew Paste', 'Kasoori Methi', 'Degi Mirch'],
    allergens: ['Dairy (Butter, Cream)', 'Tree Nuts (Cashews)'],
    reviewsList: [
      { id: 'r4', userName: 'Vikram Seth', userLocation: 'Connaught Place, Delhi', rating: 5, date: 'Yesterday', comment: 'Tastes exactly like the heritage dhabas of Old Delhi without the excess food coloring. Perfectly balanced richness.', verified: true }
    ]
  },
  {
    id: 4,
    name: 'Slow-Simmered Dal Bukhara Makhani',
    hindiName: 'दाल बुखारा मखनी (२४ घंटे पकी)',
    slug: 'slow-simmered-dal-bukhara-makhani',
    shortDescription: 'Black urad lentils and kidney beans slow-simmered for 24 hours with churned butter & smoked charcoal essence.',
    description: 'Whole black lentils (Urad) and Kashmiri red kidney beans slow-simmered over smoldering charcoal tandoors for 24 hours. Finished with roasted cumin, tomato coulis, hand-churned dairy butter, and artisanal cream.',
    story: 'Prepared using traditional dhungar technique (smoking with live coal and ghee) for that signature earthy woodsmoke note.',
    price: 349,
    originalPrice: 399,
    category: 'slow-cooked-curries',
    rating: 4.9,
    reviewsCount: 340,
    image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=800&auto=format&fit=crop',
    galleryImages: [
      'https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?q=80&w=800&auto=format&fit=crop'
    ],
    isVeg: true,
    spiceLevel: 'Mild',
    prepTimeMinutes: 15,
    serves: '2 persons',
    calories: 490,
    featured: true,
    bestseller: true,
    newArrival: false,
    chefSpecial: false,
    variants: [
      { id: 'v4-reg', name: 'Regular Portion (500ml)', price: 349, originalPrice: 399, serves: '2 Persons', weight: '500ml' },
      { id: 'v4-large', name: 'Family Size (900ml)', price: 629, originalPrice: 699, serves: '3-4 Persons', weight: '900ml' }
    ],
    addons: [
      { id: 'b3', name: 'Chur Chur Naan (1 pc)', price: 75, isVeg: true },
      { id: 'b4', name: 'Jeera Basmati Rice', price: 149, isVeg: true }
    ],
    ingredients: ['Organic Black Urad', 'Rajma Beans', 'Vine Tomatoes', 'Pure Desi Butter', 'Fresh Milk Cream', 'Smoked Ghee', 'Ginger'],
    allergens: ['Dairy (Butter, Cream)'],
    reviewsList: [
      { id: 'r5', userName: 'Meera Nambiar', userLocation: 'Juhu, Mumbai', rating: 5, date: '4 days ago', comment: 'Creamy, deeply flavorful and you can truly taste the 24-hour slow cooking. Pair it with garlic naan!', verified: true }
    ]
  },
  {
    id: 5,
    name: 'Kashmiri Handi Mutton Rogan Josh',
    hindiName: 'कश्मीरी हांडी रोगन जोश',
    slug: 'kashmiri-handi-mutton-rogan-josh',
    shortDescription: 'Tender lamb shanks braised in aromatic Kashmiri spices, ratanjot root, and fennel broth.',
    description: 'An authentic delicacy from the valley of Kashmir. Tender cuts of baby lamb simmered in an aromatic gravy infused with cockscomb flower extract (Ratanjot), powdered dry ginger (Saunth), and mountain fennel.',
    story: 'Prepared strictly without onion or garlic in traditional Kashmiri Pandit style, allowing whole aromatic spices to shine.',
    price: 529,
    originalPrice: 629,
    category: 'slow-cooked-curries',
    rating: 4.8,
    reviewsCount: 165,
    image: 'https://images.unsplash.com/photo-1545247181-516773cae7be?q=80&w=800&auto=format&fit=crop',
    galleryImages: [
      'https://images.unsplash.com/photo-1545247181-516773cae7be?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?q=80&w=800&auto=format&fit=crop'
    ],
    isVeg: false,
    spiceLevel: 'Spicy',
    prepTimeMinutes: 25,
    serves: '2 persons',
    calories: 640,
    featured: false,
    bestseller: false,
    newArrival: true,
    chefSpecial: true,
    variants: [
      { id: 'v5-reg', name: 'Regular Portion (500ml)', price: 529, originalPrice: 629, serves: '2 Persons', weight: '500ml' }
    ],
    addons: [
      { id: 'b2', name: 'Laccha Paratha (2 pcs)', price: 99, isVeg: true },
      { id: 'a1', name: 'Burani Garlic Raita', price: 49, isVeg: true }
    ],
    ingredients: ['Prime Baby Lamb Cuts', 'Kashmiri Chilies', 'Ratanjot', 'Fennel Powder', 'Dry Ginger', 'Asafoetida', 'Mustard Oil'],
    allergens: ['Mustard Oil'],
    reviewsList: [
      { id: 'r6', userName: 'Kunal Kapoor', userLocation: 'Gurugram', rating: 5, date: '1 week ago', comment: 'Authentic ruby red gravy and tender meat. True Kashmiri recipe.', verified: true }
    ]
  },
  {
    id: 6,
    name: 'Charcoal Smoked Paneer Tikka Angara',
    hindiName: 'अंगारा पनीर टिक्का तंदूरी',
    slug: 'charcoal-smoked-paneer-tikka-angara',
    shortDescription: 'Cottage cheese chunks marinated in hung curd, yellow mustard oil, and carom seeds, fire-roasted in clay tandoor.',
    description: 'Thick slabs of fresh dairy paneer soaked in mustard-infused hung curd marinade, crushed ajwain, and dried fenugreek. Skewered with crunchy bell peppers and red onions, then fire-roasted to smoky perfection.',
    price: 329,
    originalPrice: 379,
    category: 'tandoor-starters',
    rating: 4.8,
    reviewsCount: 220,
    image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?q=80&w=800&auto=format&fit=crop',
    galleryImages: [
      'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?q=80&w=800&auto=format&fit=crop'
    ],
    isVeg: true,
    spiceLevel: 'Medium',
    prepTimeMinutes: 18,
    serves: '2 persons',
    calories: 420,
    featured: true,
    bestseller: false,
    newArrival: false,
    chefSpecial: false,
    variants: [
      { id: 'v6-6pcs', name: 'Standard (6 Pieces)', price: 329, originalPrice: 379, serves: '2 Persons', weight: '350g' },
      { id: 'v6-10pcs', name: 'Party Platter (10 Pieces)', price: 499, originalPrice: 579, serves: '3-4 Persons', weight: '600g' }
    ],
    addons: [
      { id: 'a5', name: 'Mint Coriander Chutney (100ml)', price: 29, isVeg: true },
      { id: 'a6', name: 'Sirka Masala Onions', price: 25, isVeg: true }
    ],
    ingredients: ['Fresh Malai Paneer', 'Hung Curd', 'Mustard Oil', 'Ajwain', 'Bell Peppers', 'Chaat Masala', 'Lemon Juice'],
    allergens: ['Dairy (Paneer, Curd)', 'Mustard'],
    reviewsList: [
      { id: 'r7', userName: 'Tanvi Joshi', userLocation: 'Pune', rating: 5, date: '5 days ago', comment: 'Crisp on the edges and soft inside with real smoky flavor. Mint chutney is delicious!', verified: true }
    ]
  },
  {
    id: 7,
    name: 'Bhatti Da Murgh Tandoori (Half/Full)',
    hindiName: 'भट्टी दा मुर्ग तंदूरी',
    slug: 'bhatti-da-murgh-tandoori',
    shortDescription: 'Whole spring chicken marinated in robust Punjabi spices and roasted inside clay tandoor on roaring coals.',
    description: 'Tender bone-in chicken scored deeply and steeped in a double marinade of lemon ginger garlic paste and stone-ground garam masala. Char-grilled in our high-heat clay pit oven for deep caramelized crust.',
    price: 379,
    originalPrice: 429,
    category: 'tandoor-starters',
    rating: 4.9,
    reviewsCount: 310,
    image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?q=80&w=800&auto=format&fit=crop',
    galleryImages: [
      'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?q=80&w=800&auto=format&fit=crop'
    ],
    isVeg: false,
    spiceLevel: 'Spicy',
    prepTimeMinutes: 22,
    serves: '2-3 persons',
    calories: 580,
    featured: false,
    bestseller: true,
    newArrival: false,
    chefSpecial: false,
    variants: [
      { id: 'v7-half', name: 'Half Bird (4 pcs)', price: 379, originalPrice: 429, serves: '2 Persons', weight: '450g' },
      { id: 'v7-full', name: 'Full Bird (8 pcs)', price: 669, originalPrice: 759, serves: '4 Persons', weight: '900g' }
    ],
    addons: [
      { id: 'b1', name: 'Butter Garlic Naan (1 pc)', price: 65, isVeg: true },
      { id: 'a5', name: 'Green Mint Chutney', price: 29, isVeg: true }
    ],
    ingredients: ['Spring Farm Chicken', 'Degi Mirch', 'Hung Curd', 'Ginger Garlic Paste', 'Lemon Juice', 'Kasuri Methi'],
    allergens: ['Dairy (Curd)'],
    reviewsList: [
      { id: 'r8', userName: 'Harpreet Singh', userLocation: 'Chandigarh', rating: 5, date: '3 days ago', comment: 'Juicy, charred and spicy just the way real Punjabi tandoori chicken should be.', verified: true }
    ]
  },
  {
    id: 8,
    name: 'Galouti Kebab with Mughlai Paratha',
    hindiName: 'लखनवी गलौटी कबाब और शीरमाल',
    slug: 'galouti-kebab-with-mughlai-paratha',
    shortDescription: 'Melt-in-your-mouth minced mutton patties infused with 16 royal spices, served with mini ulte tawa parathas.',
    description: 'Fine minced meat tenderized naturally with raw papaya and perfumed with 16 secret Awadhi spices. Pan-seared on a heavy cast iron griddle with desi ghee until crisp on top and feather-soft within.',
    price: 469,
    originalPrice: 539,
    category: 'tandoor-starters',
    rating: 4.9,
    reviewsCount: 188,
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=800&auto=format&fit=crop',
    galleryImages: [
      'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=800&auto=format&fit=crop'
    ],
    isVeg: false,
    spiceLevel: 'Medium',
    prepTimeMinutes: 20,
    serves: '2 persons',
    calories: 520,
    featured: true,
    bestseller: false,
    newArrival: true,
    chefSpecial: true,
    variants: [
      { id: 'v8-4pcs', name: 'Plate of 4 Kebabs + 2 Parathas', price: 469, originalPrice: 539, serves: '2 Persons', weight: '400g' }
    ],
    ingredients: ['Minced Prime Mutton', 'Raw Green Papaya', 'Desi Ghee', 'Potli Masala', 'Rose Petals', 'Mace', 'Saffron'],
    allergens: ['Gluten (Paratha)', 'Dairy (Ghee)'],
    reviewsList: [
      { id: 'r9', userName: 'Aditya Verma', userLocation: 'Lucknow', rating: 5, date: '1 week ago', comment: 'Truly melts the moment you put it in your mouth. Authentic Lucknow heritage flavors.', verified: true }
    ]
  },
  {
    id: 9,
    name: 'Dhaba Style Kadai Paneer Gravy',
    hindiName: 'ढाबा स्टाइल कढ़ाई पनीर',
    slug: 'dhaba-style-kadai-paneer-gravy',
    shortDescription: 'Cottage cheese and crunchy bell peppers tossed in freshly roasted coriander seeds and spicy tomato kadai masala.',
    description: 'Succulent malai paneer batons tossed in an iron wok (kadai) with charred bell peppers, diced onions, crushed coriander seeds, and whole dried Kashmiri red chillies in a semi-dry rich gravy.',
    price: 369,
    originalPrice: 419,
    category: 'slow-cooked-curries',
    rating: 4.7,
    reviewsCount: 205,
    image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?q=80&w=800&auto=format&fit=crop',
    galleryImages: [
      'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?q=80&w=800&auto=format&fit=crop'
    ],
    isVeg: true,
    spiceLevel: 'Spicy',
    prepTimeMinutes: 18,
    serves: '2 persons',
    calories: 460,
    featured: false,
    bestseller: true,
    newArrival: false,
    chefSpecial: false,
    variants: [
      { id: 'v9-500ml', name: 'Regular Portion (500ml)', price: 369, originalPrice: 419, serves: '2 Persons', weight: '500ml' }
    ],
    addons: [
      { id: 'b1', name: 'Butter Garlic Naan', price: 65, isVeg: true },
      { id: 'b5', name: 'Tandoori Roti (2 pcs)', price: 40, isVeg: true }
    ],
    ingredients: ['Fresh Paneer', 'Green & Red Bell Peppers', 'Whole Coriander Seeds', 'Black Peppercorns', 'Tomatoes', 'Ginger', 'Desi Ghee'],
    allergens: ['Dairy (Paneer, Ghee)'],
    reviewsList: [
      { id: 'r10', userName: 'Kavita Iyer', userLocation: 'Chennai', rating: 5, date: '2 days ago', comment: 'The coarse freshly pounded kadai masala gives it an incredible aroma and crunch.', verified: true }
    ]
  },
  {
    id: 10,
    name: 'Hyderabadi Dum Chicken Biryani',
    hindiName: 'हैदराबादी दम चिकन बिरयानी',
    slug: 'hyderabadi-dum-chicken-biryani',
    shortDescription: 'Classic spicy kacchi yakhni chicken layered with fragrant basmati, fried onions, and fresh mint.',
    description: 'Raw marinated chicken cuts seasoned with fiery green chillies, caramelized onions, and crushed spices, steamed in a sealed handi with parboiled saffron basmati rice.',
    price: 419,
    originalPrice: 489,
    category: 'dum-biryanis',
    rating: 4.9,
    reviewsCount: 389,
    image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?q=80&w=800&auto=format&fit=crop',
    galleryImages: [
      'https://images.unsplash.com/photo-1589302168068-964664d93dc0?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?q=80&w=800&auto=format&fit=crop'
    ],
    isVeg: false,
    spiceLevel: 'Spicy',
    prepTimeMinutes: 20,
    serves: '1-2 persons',
    calories: 620,
    featured: true,
    bestseller: true,
    newArrival: false,
    chefSpecial: false,
    variants: [
      { id: 'v10-reg', name: 'Regular (Serves 1-2)', price: 419, originalPrice: 489, serves: '1-2 Persons', weight: '650g' },
      { id: 'v10-jumbo', name: 'Family Handi (Serves 3-4)', price: 799, originalPrice: 919, serves: '3-4 Persons', weight: '1300g' }
    ],
    addons: [
      { id: 'a1', name: 'Burani Garlic Raita', price: 49, isVeg: true },
      { id: 'a2', name: 'Mirchi Ka Salan', price: 59, isVeg: true }
    ],
    ingredients: ['Farm-Fresh Chicken', 'Long Grain Basmati', 'Fresh Mint', 'Coriander', 'Green Chillies', 'Pure Ghee', 'Saffron'],
    allergens: ['Dairy (Ghee, Curd)'],
    reviewsList: [
      { id: 'r11', userName: 'Siddharth Rao', userLocation: 'Hyderabad', rating: 5, date: '4 days ago', comment: 'Authentic Hyderabadi spice punch without any artificial essence. The meat was juicy!', verified: true }
    ]
  },
  {
    id: 11,
    name: 'Artisanal Garlic & Butter Naan Basket (3 Pcs)',
    hindiName: 'लहसुनी बटर नान बास्केट',
    slug: 'artisanal-garlic-butter-naan-basket',
    shortDescription: 'Trio of hand-stretched leavened flatbreads studded with roasted garlic and brushed with cultured butter.',
    description: 'Hand-stretched dough slapped onto the searing walls of a clay tandoor, sprinkled with minced garlic flakes, fresh cilantro, and finished with a generous glaze of melted butter.',
    price: 159,
    originalPrice: 189,
    category: 'breads-accompaniments',
    rating: 4.8,
    reviewsCount: 142,
    image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?q=80&w=800&auto=format&fit=crop',
    galleryImages: [
      'https://images.unsplash.com/photo-1601050690597-df0568f70950?q=80&w=800&auto=format&fit=crop'
    ],
    isVeg: true,
    spiceLevel: 'Mild',
    prepTimeMinutes: 10,
    serves: '2-3 persons',
    calories: 380,
    featured: false,
    bestseller: true,
    newArrival: false,
    chefSpecial: false,
    ingredients: ['Refined Wheat Flour', 'Cultured Milk', 'Roasted Garlic', 'Fresh Coriander', 'Desi Butter', 'Sea Salt'],
    allergens: ['Gluten (Wheat)', 'Dairy (Milk, Butter)'],
    reviewsList: [
      { id: 'r12', userName: 'Nitin Roy', userLocation: 'Kolkata', rating: 5, date: '6 days ago', comment: 'Stays soft and fluffy even upon home delivery. Great garlic flavor.', verified: true }
    ]
  },
  {
    id: 12,
    name: 'Laccha Paratha & Missi Roti Duo',
    hindiName: 'लच्छा पराठा और मिस्सी रोटी',
    slug: 'laccha-paratha-missi-roti-duo',
    shortDescription: 'Crisp multi-layered whole wheat paratha paired with spiced gram flour tandoori roti.',
    description: 'Two artisanal breads: one multi-layered flaky whole wheat spiral laccha paratha, and one Rajasthani gram-flour missi roti seasoned with carom seeds and fenugreek.',
    price: 129,
    originalPrice: 149,
    category: 'breads-accompaniments',
    rating: 4.7,
    reviewsCount: 96,
    image: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?q=80&w=800&auto=format&fit=crop',
    galleryImages: [
      'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?q=80&w=800&auto=format&fit=crop'
    ],
    isVeg: true,
    spiceLevel: 'Mild',
    prepTimeMinutes: 10,
    serves: '2 persons',
    calories: 320,
    featured: false,
    bestseller: false,
    newArrival: false,
    chefSpecial: false,
    ingredients: ['Whole Wheat Atta', 'Gram Flour (Besan)', 'Ajwain', 'Kasuri Methi', 'Desi Ghee'],
    allergens: ['Gluten (Wheat)', 'Dairy (Ghee)'],
    reviewsList: [
      { id: 'r13', userName: 'Shreya Patel', userLocation: 'Ahmedabad', rating: 5, date: '1 week ago', comment: 'Crisp flaky layers and the missi roti is full of flavour.', verified: true }
    ]
  },
  {
    id: 13,
    name: 'Zafrani Shahi Angoori Gulab Jamun (4 Pcs)',
    hindiName: 'ज़फ़रानी शाही अंगूरी गुलाब जामुन',
    slug: 'zafrani-shahi-angoori-gulab-jamun',
    shortDescription: 'Golden khoya dumplings soaked in warm saffron and cardamom infused sugar syrup with pistachio slivers.',
    description: 'Pure buffalo milk mawa (khoya) dumplings fried slowly in pure cow ghee to a rich mahogany finish, then steeped in warm saffron and green cardamom nectar. Garnished with Iranian pistachios and edible silver vark.',
    price: 189,
    originalPrice: 229,
    category: 'desserts-beverages',
    rating: 4.9,
    reviewsCount: 278,
    image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?q=80&w=800&auto=format&fit=crop',
    galleryImages: [
      'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?q=80&w=800&auto=format&fit=crop'
    ],
    isVeg: true,
    spiceLevel: 'Mild',
    prepTimeMinutes: 5,
    serves: '2 persons',
    calories: 390,
    featured: true,
    bestseller: true,
    newArrival: false,
    chefSpecial: true,
    variants: [
      { id: 'v13-4pcs', name: 'Box of 4 Pieces', price: 189, originalPrice: 229, serves: '2 Persons', weight: '200g' },
      { id: 'v13-8pcs', name: 'Family Box (8 Pieces)', price: 349, originalPrice: 429, serves: '4 Persons', weight: '400g' }
    ],
    ingredients: ['Pure Buffalo Mawa', 'Cow Desi Ghee', 'Kashmiri Saffron', 'Green Cardamom', 'Pistachios', 'Rose Water'],
    allergens: ['Dairy (Khoya, Ghee)', 'Tree Nuts (Pistachios)'],
    reviewsList: [
      { id: 'r14', userName: 'Deepak Chawla', userLocation: 'Delhi', rating: 5, date: '3 days ago', comment: 'Melts in the mouth with authentic mawa taste. Not excessively sweet, just sublime.', verified: true }
    ]
  },
  {
    id: 14,
    name: 'Kesar Pista Matka Kulfi (2 Pots)',
    hindiName: 'केसर पिस्ता मटका कुल्फी',
    slug: 'kesar-pista-matka-kulfi',
    shortDescription: 'Traditional dense frozen milk dessert infused with Kashmiri saffron, crushed almonds, and cardamom in clay pots.',
    description: 'Slow-condensed whole milk reduced over low flame for 6 hours until intensely thick and caramelized. Poured into rustic earthen clay pots (matkas) to freeze naturally.',
    price: 199,
    originalPrice: 249,
    category: 'desserts-beverages',
    rating: 4.8,
    reviewsCount: 154,
    image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=800&auto=format&fit=crop',
    galleryImages: [
      'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=800&auto=format&fit=crop'
    ],
    isVeg: true,
    spiceLevel: 'Mild',
    prepTimeMinutes: 5,
    serves: '2 persons',
    calories: 310,
    featured: false,
    bestseller: false,
    newArrival: true,
    chefSpecial: false,
    ingredients: ['Slow Reduced Milk', 'Kashmiri Saffron', 'Pistachios', 'Almonds', 'Cardamom'],
    allergens: ['Dairy (Milk)', 'Tree Nuts (Almonds, Pistachios)'],
    reviewsList: [
      { id: 'r15', userName: 'Aarti Gupta', userLocation: 'Jaipur', rating: 5, date: '5 days ago', comment: 'Dense, rich, and arrived chilled without melting. The earthen pot gives a lovely aroma.', verified: true }
    ]
  },
  {
    id: 15,
    name: 'Royal Kesariya Thandai & Sweet Lassi Combo',
    hindiName: 'शाही केसरिया ठंडाई और लस्सी',
    slug: 'royal-kesariya-thandai-sweet-lassi-combo',
    shortDescription: 'Pair of artisanal chilled coolers made with thick farm yogurt, saffron, rose petals, and crushed dry fruits.',
    description: 'One bottle (300ml) of spiced Kesariya Thandai with fennel and melon seeds, and one bottle (300ml) of thick Malai Sweet Lassi topped with roasted pistachio shavings.',
    price: 179,
    originalPrice: 219,
    category: 'desserts-beverages',
    rating: 4.9,
    reviewsCount: 118,
    image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?q=80&w=800&auto=format&fit=crop',
    galleryImages: [
      'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?q=80&w=800&auto=format&fit=crop'
    ],
    isVeg: true,
    spiceLevel: 'Mild',
    prepTimeMinutes: 5,
    serves: '2 persons',
    calories: 280,
    featured: false,
    bestseller: false,
    newArrival: true,
    chefSpecial: false,
    ingredients: ['Farm Fresh Yogurt', 'Whole Milk', 'Saffron', 'Rose Petals', 'Melon Seeds', 'Pistachios', 'Cardamom'],
    allergens: ['Dairy (Yogurt, Milk)', 'Tree Nuts'],
    reviewsList: [
      { id: 'r16', userName: 'Rajesh Nair', userLocation: 'Kochi', rating: 5, date: '2 days ago', comment: 'Super refreshing and very thick authentic lassi. Perfect companion to spicy biryani.', verified: true }
    ]
  },
  {
    id: 16,
    name: 'Handi Champaran Mutton Ahuna',
    hindiName: 'चंपारण मटन अहुना (मिट्टी की हांडी)',
    slug: 'handi-champaran-mutton-ahuna',
    shortDescription: 'Earthen clay pot slow-cooked mutton with whole garlic bulbs and mustard oil over glowing charcoal embers.',
    description: 'A legendary regional delicacy from Champaran, Bihar. Tender goat meat marinated with whole garlic bulbs, shallots, mustard oil, and whole hand-ground spices, sealed inside an earthen clay pot (Ahuna) and cooked on charcoal.',
    story: 'No water is added; the meat braises gently in its own juices and mustard oil for an unbeatable rustic depth.',
    price: 549,
    originalPrice: 649,
    category: 'slow-cooked-curries',
    rating: 4.9,
    reviewsCount: 195,
    image: 'https://images.unsplash.com/photo-1545247181-516773cae7be?q=80&w=800&auto=format&fit=crop',
    galleryImages: [
      'https://images.unsplash.com/photo-1545247181-516773cae7be?q=80&w=800&auto=format&fit=crop'
    ],
    isVeg: false,
    spiceLevel: 'Spicy',
    prepTimeMinutes: 25,
    serves: '2 persons',
    calories: 660,
    featured: true,
    bestseller: false,
    newArrival: true,
    chefSpecial: true,
    variants: [
      { id: 'v16-reg', name: 'Handi Portion (500g)', price: 549, originalPrice: 649, serves: '2 Persons', weight: '500g' }
    ],
    addons: [
      { id: 'b2', name: 'Laccha Paratha (2 pcs)', price: 99, isVeg: true }
    ],
    ingredients: ['Tender Goat Meat', 'Whole Garlic Heads', 'Cold-Pressed Mustard Oil', 'Shallots', 'Whole Red Chillies', 'Bay Leaves', 'Black Cardamom'],
    allergens: ['Mustard Oil'],
    reviewsList: [
      { id: 'r17', userName: 'Sunil Kumar', userLocation: 'Patna', rating: 5, date: '4 days ago', comment: 'The whole soft garlic cloves and smoky earthenware flavor is out of this world.', verified: true }
    ]
  }
];

export const COUPONS: Coupon[] = [
  {
    code: 'GAON15',
    discountType: 'percentage',
    discountValue: 15,
    minOrderValue: 499,
    description: '15% OFF on orders above ₹499'
  },
  {
    code: 'SWAD15',
    discountType: 'percentage',
    discountValue: 15,
    minOrderValue: 499,
    description: '15% OFF on orders above ₹499'
  },
  {
    code: 'WELCOME50',
    discountType: 'fixed',
    discountValue: 50,
    minOrderValue: 299,
    description: 'Flat ₹50 OFF on first order'
  },
  {
    code: 'FEAST100',
    discountType: 'fixed',
    discountValue: 100,
    minOrderValue: 899,
    description: 'Flat ₹100 OFF on party orders above ₹899'
  }
];
