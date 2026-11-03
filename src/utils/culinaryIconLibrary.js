/**
 * culinaryIconLibrary.js
 * Comprehensive, realistic, and formal culinary icon & emoji library
 * for Asian Craft Fusion dining, allergens, flavors, and menu cataloging.
 */

export const CULINARY_CATEGORIES = [
  { id: 'all', label: 'All Icons' },
  { id: 'allergens', label: 'Allergens & Dietary' },
  { id: 'flavors', label: 'Flavor Profiles' },
  { id: 'noodles_rice', label: 'Noodles & Rice' },
  { id: 'dimsum_appetizers', label: 'Dim Sum & Small Plates' },
  { id: 'meat_seafood', label: 'Proteins & Seafood' },
  { id: 'greens_veggies', label: 'Vegetables & Broths' },
  { id: 'beverages', label: 'Beverages & Boba' },
  { id: 'desserts', label: 'Artisanal Desserts' }
];

export const CULINARY_ICONS = [
  // ── ALLERGENS & DIETARY ──
  {
    emoji: '🥜',
    name: 'Peanuts & Groundnuts',
    category: 'allergens',
    description: 'Groundnuts, crushed peanuts, peanut oils, satay & dipping sauces',
    keywords: ['peanut', 'peanuts', 'groundnut', 'satay', 'allergen', 'nut']
  },
  {
    emoji: '🌾',
    name: 'Gluten & Wheat Cereals',
    category: 'allergens',
    description: 'Wheat, barley, rye, flour batters, ramen noodles, breading & crusts',
    keywords: ['gluten', 'wheat', 'flour', 'barley', 'rye', 'noodle', 'allergen']
  },
  {
    emoji: '🥛',
    name: 'Dairy & Milk Solids',
    category: 'allergens',
    description: 'Fresh milk, cream, butter, cheese, milk teas & condensed dairy bases',
    keywords: ['dairy', 'milk', 'cheese', 'butter', 'cream', 'lactose', 'allergen']
  },
  {
    emoji: '🫘',
    name: 'Soybeans & Tofu',
    category: 'allergens',
    description: 'Soy sauce, edamame, soybean oil, fermented paste, miso & bean curd',
    keywords: ['soy', 'soybean', 'tofu', 'edamame', 'miso', 'shoyu', 'allergen']
  },
  {
    emoji: '🦐',
    name: 'Shellfish & Crustaceans',
    category: 'allergens',
    description: 'Shrimp, prawns, crab, lobster, dried seafood flakes & shrimp paste',
    keywords: ['shellfish', 'crustacean', 'shrimp', 'prawn', 'crab', 'lobster', 'allergen']
  },
  {
    emoji: '🥚',
    name: 'Eggs & Egg Products',
    category: 'allergens',
    description: 'Whole eggs, ajitsuke tamago, egg wash, fried rice binders & custards',
    keywords: ['egg', 'eggs', 'tamago', 'yolk', 'albumin', 'allergen']
  },
  {
    emoji: '🐟',
    name: 'Finfish & Seafood',
    category: 'allergens',
    description: 'Salmon, tuna, dashi fish broth, bonito flakes & fish sauce',
    keywords: ['fish', 'seafood', 'salmon', 'tuna', 'bonito', 'dashi', 'allergen']
  },
  {
    emoji: '🌰',
    name: 'Tree Nuts',
    category: 'allergens',
    description: 'Cashews, walnuts, almonds, chestnuts & pistachio toppings',
    keywords: ['tree nut', 'treenut', 'cashew', 'walnut', 'almond', 'chestnut', 'allergen']
  },
  {
    emoji: '🌱',
    name: 'Sesame Seeds & Oils',
    category: 'allergens',
    description: 'Toasted sesame seeds, roasted sesame oil, tahini & gomashio',
    keywords: ['sesame', 'seed', 'goma', 'oil', 'allergen']
  },
  {
    emoji: '🧄',
    name: 'Garlic & Alliums',
    category: 'allergens',
    description: 'Garlic cloves, scallions, shallots, leeks & chive aromatics',
    keywords: ['garlic', 'allium', 'onion', 'shallot', 'scallion', 'chive', 'allergen']
  },
  {
    emoji: '🧅',
    name: 'Onions & Shallots',
    category: 'allergens',
    description: 'Red onion, yellow onion, crispy fried shallots & bulb alliums',
    keywords: ['onion', 'shallot', 'allium', 'allergen']
  },
  {
    emoji: '🦀',
    name: 'Crab & Softshell',
    category: 'allergens',
    description: 'Real crab meat, blue crab broth & soft-shell tempura',
    keywords: ['crab', 'crustacean', 'seafood', 'allergen']
  },
  {
    emoji: '🦪',
    name: 'Mollusks & Oysters',
    category: 'allergens',
    description: 'Oysters, clams, mussels, oyster sauce & mollusk extract',
    keywords: ['oyster', 'mollusk', 'clam', 'mussel', 'seafood', 'allergen']
  },

  // ── FLAVOR PROFILES ──
  {
    emoji: '🔥',
    name: 'Spicy & Piquant',
    category: 'flavors',
    description: 'Sichuan peppercorn, chili crisp, fiery bird’s eye chili & sriracha heat',
    keywords: ['spicy', 'hot', 'chili', 'pepper', 'sichuan', 'flavor', 'fire']
  },
  {
    emoji: '🌿',
    name: 'Vegan & Plant-Based',
    category: 'flavors',
    description: '100% plant-derived, zero animal broth, wholesome vegetables & herbs',
    keywords: ['vegan', 'plant', 'herb', 'vegetarian', 'clean', 'flavor']
  },
  {
    emoji: '🍬',
    name: 'Sweet & Glazed',
    category: 'flavors',
    description: 'Honey reduction, mirin glaze, caramelized brown sugar & sweet teriyaki',
    keywords: ['sweet', 'honey', 'mirin', 'sugar', 'glaze', 'caramel', 'flavor']
  },
  {
    emoji: '🍴',
    name: 'Savory & Deep Umami',
    category: 'flavors',
    description: 'Rich dashi broth, aged soy sauce, roasted aromatics & savory depth',
    keywords: ['savory', 'umami', 'rich', 'dashi', 'flavor', 'deep']
  },
  {
    emoji: '💚',
    name: 'Healthy & Wholesome',
    category: 'flavors',
    description: 'Low-sodium, steamed, nutrient-dense ingredients with balanced wellness',
    keywords: ['healthy', 'wellness', 'steamed', 'low sodium', 'diet', 'flavor']
  },
  {
    emoji: '🌶️',
    name: 'Hot Chili Pepper',
    category: 'flavors',
    description: 'Fresh red chilies, serrano slices, and spicy pepper infusions',
    keywords: ['chili', 'pepper', 'spicy', 'hot', 'seasoning']
  },
  {
    emoji: '🍋',
    name: 'Citrus, Tart & Tangy',
    category: 'flavors',
    description: 'Fresh calamansi, yuzu citrus, rice vinegar & tangy tamarind notes',
    keywords: ['citrus', 'lemon', 'lime', 'calamansi', 'yuzu', 'tangy', 'sour']
  },
  {
    emoji: '🪵',
    name: 'Smoky & Charred',
    category: 'flavors',
    description: 'Bincho-tan charcoal grill, wood smoke, charred wok hei essence',
    keywords: ['smoky', 'smoke', 'charred', 'wood', 'wok hei', 'grilled']
  },
  {
    emoji: '🧂',
    name: 'Sea Salt & Brine',
    category: 'flavors',
    description: 'Maldon flake sea salt, seasoned mineral salt & savory brine balance',
    keywords: ['salt', 'brine', 'mineral', 'seasoning', 'flavor']
  },
  {
    emoji: '🥑',
    name: 'Rich & Creamy',
    category: 'flavors',
    description: 'Silky avocado, sesame puree, coconut milk & velvety texture',
    keywords: ['creamy', 'avocado', 'rich', 'silky', 'velvet']
  },
  {
    emoji: '🥢',
    name: 'Crispy & Golden Crunch',
    category: 'flavors',
    description: 'Golden panko breading, crispy tempura crackle & crunchy textures',
    keywords: ['crispy', 'crunchy', 'tempura', 'panko', 'fried']
  },

  // ── NOODLES & RICE ──
  {
    emoji: '🍜',
    name: 'Ramen & Hand-Pulled Noodles',
    category: 'noodles_rice',
    description: 'Artisanal wheat noodles, rich slow-simmered broth, chashu & menma',
    keywords: ['ramen', 'noodle', 'noodles', 'soup', 'broth', 'soba', 'udon']
  },
  {
    emoji: '🍚',
    name: 'Steamed Jasmine Rice Bowl',
    category: 'noodles_rice',
    description: 'Fluffy fragrant steamed jasmine rice, furikake seasoning & rice bases',
    keywords: ['rice', 'steamed', 'jasmine', 'bowl', 'donburi', 'white rice']
  },
  {
    emoji: '🍱',
    name: 'Bento Box & Rice Sets',
    category: 'noodles_rice',
    description: 'Balanced meal sets with protein, seasoned rice, pickles & side gyoza',
    keywords: ['bento', 'box', 'combo', 'set', 'meal', 'lunch']
  },
  {
    emoji: '🍛',
    name: 'Japanese Curry Rice',
    category: 'noodles_rice',
    description: 'Rich spiced golden curry gravy over steamed rice with root vegetables',
    keywords: ['curry', 'rice', 'spiced', 'kare', 'gravy']
  },
  {
    emoji: '🍙',
    name: 'Onigiri Rice Triangles',
    category: 'noodles_rice',
    description: 'Hand-pressed seasoned rice ball wrapped in crisp nori seaweed',
    keywords: ['onigiri', 'rice', 'nori', 'snack', 'triangle']
  },
  {
    emoji: '🥡',
    name: 'Takeout Noodle Box',
    category: 'noodles_rice',
    description: 'Wok-tossed street noodles packaged fresh for fast dine-in or takeout',
    keywords: ['takeout', 'noodle', 'box', 'wok', 'fried noodles']
  },

  // ── DIM SUM & SMALL PLATES ──
  {
    emoji: '🥟',
    name: 'Dumplings & Gyoza',
    category: 'dimsum_appetizers',
    description: 'Pan-seared pork & chive gyoza, steamed wontons, szechuan dumplings',
    keywords: ['dumpling', 'gyoza', 'wonton', 'dim sum', 'appetizer', 'pork']
  },
  {
    emoji: '🍢',
    name: 'Yakitori & Skewers',
    category: 'dimsum_appetizers',
    description: 'Charcoal-grilled chicken skewers, glazed tsukune & seasoned bites',
    keywords: ['yakitori', 'skewer', 'kebab', 'grill', 'street food', 'bites']
  },
  {
    emoji: '🍤',
    name: 'Crispy Ebi Tempura',
    category: 'dimsum_appetizers',
    description: 'Crispy golden battered tiger prawns with tensuyu dipping sauce',
    keywords: ['tempura', 'prawn', 'shrimp', 'crispy', 'appetizer', 'ebi']
  },
  {
    emoji: '🫔',
    name: 'Spring Rolls & Lumpia',
    category: 'dimsum_appetizers',
    description: 'Golden fried vegetable spring rolls, fresh summer rolls with mint',
    keywords: ['spring roll', 'lumpia', 'roll', 'crispy', 'appetizer']
  },
  {
    emoji: '🫛',
    name: 'Edamame Pods',
    category: 'dimsum_appetizers',
    description: 'Steamed organic edamame with truffle oil, sea salt, or spicy garlic',
    keywords: ['edamame', 'soy', 'pod', 'appetizer', 'steamed']
  },
  {
    emoji: '🍗',
    name: 'Crispy Asian Chicken Wings',
    category: 'dimsum_appetizers',
    description: 'Twice-fried chicken wings tossed in soy garlic or sweet chili glaze',
    keywords: ['wing', 'wings', 'chicken', 'crispy', 'fried', 'appetizer']
  },
  {
    emoji: '🍘',
    name: 'Rice Crackers & Senbei',
    category: 'dimsum_appetizers',
    description: 'Traditional roasted rice crisps with savory soy glaze and nori',
    keywords: ['cracker', 'senbei', 'crisp', 'appetizer', 'snack']
  },

  // ── PROTEINS & SEAFOOD ──
  {
    emoji: '🥩',
    name: 'Wagyu & Prime Beef',
    category: 'meat_seafood',
    description: 'Marbled prime beef cuts, teriyaki sirloin, bulgogi & tender brisket',
    keywords: ['beef', 'wagyu', 'steak', 'meat', 'protein', 'teriyaki']
  },
  {
    emoji: '🍖',
    name: 'Braised Pork Chashu & Ribs',
    category: 'meat_seafood',
    description: 'Melt-in-mouth slow-braised pork belly, ribs & tender loin cuts',
    keywords: ['pork', 'chashu', 'belly', 'ribs', 'meat', 'protein']
  },
  {
    emoji: '🍣',
    name: 'Sushi & Fresh Sashimi',
    category: 'meat_seafood',
    description: 'Grade-A raw salmon, ahi tuna, nigiri & artisanal maki rolls',
    keywords: ['sushi', 'sashimi', 'salmon', 'tuna', 'nigiri', 'maki']
  },
  {
    emoji: '🥓',
    name: 'Smoked Bacon & Pork Strips',
    category: 'meat_seafood',
    description: 'Crispy hardwood smoked bacon bits and savory cured strips',
    keywords: ['bacon', 'pork', 'crisp', 'smoked', 'topping']
  },

  // ── VEGETABLES & BROTHS ──
  {
    emoji: '🥗',
    name: 'Asian Sesame Salad Greens',
    category: 'greens_veggies',
    description: 'Mixed baby greens, cabbage slaw, ginger dressing & crispy wontons',
    keywords: ['salad', 'greens', 'lettuce', 'slaw', 'healthy', 'vegetable']
  },
  {
    emoji: '🍄',
    name: 'Shiitake & Enoki Mushrooms',
    category: 'greens_veggies',
    description: 'Fresh earthy shiitake, enoki clusters, king oyster & wood ear fungi',
    keywords: ['mushroom', 'shiitake', 'enoki', 'fungi', 'vegetable']
  },
  {
    emoji: '🥦',
    name: 'Steamed Broccoli & Greens',
    category: 'greens_veggies',
    description: 'Tender steamed broccoli florets, bok choy & garlic greens',
    keywords: ['broccoli', 'bok choy', 'greens', 'steamed', 'vegetable']
  },
  {
    emoji: '🍲',
    name: 'Simmered Hot Pot & Broths',
    category: 'greens_veggies',
    description: 'Slow-cooked dashi broth, miso soup, herbal hot pot & fragrant stews',
    keywords: ['soup', 'broth', 'hot pot', 'stew', 'dashi', 'miso']
  },
  {
    emoji: '🥣',
    name: 'Congee & Grain Bowls',
    category: 'greens_veggies',
    description: 'Comforting savory rice porridge with century egg, scallions & ginger',
    keywords: ['congee', 'porridge', 'bowl', 'soup', 'comfort food']
  },
  {
    emoji: '🌽',
    name: 'Sweet Corn Niblets',
    category: 'greens_veggies',
    description: 'Buttered sweet yellow corn, roasted kernels & ramen toppings',
    keywords: ['corn', 'vegetable', 'topping', 'sweet']
  },
  {
    emoji: '🥑',
    name: 'Fresh Avocado Slices',
    category: 'greens_veggies',
    description: 'Fresh creamy hass avocado, sushi grade additions & poke bowls',
    keywords: ['avocado', 'vegetable', 'creamy', 'healthy']
  },

  // ── BEVERAGES & BOBA ──
  {
    emoji: '🧋',
    name: 'Artisanal Boba Milk Tea',
    category: 'beverages',
    description: 'Slow-cooked brown sugar tapioca pearls with fresh milk tea infusion',
    keywords: ['boba', 'bubble tea', 'milk tea', 'tapioca', 'drink', 'beverage']
  },
  {
    emoji: '🍵',
    name: 'Uji Ceremonial Matcha & Green Tea',
    category: 'beverages',
    description: 'Whisked Japanese green tea, ceremonial grade matcha & sencha brews',
    keywords: ['matcha', 'green tea', 'tea', 'sencha', 'drink', 'beverage']
  },
  {
    emoji: '🥭',
    name: 'Fresh Fruit Smoothies & Mango Shakes',
    category: 'beverages',
    description: 'Blended ripe Philippine mangoes, crushed ice & tropical nectars',
    keywords: ['mango', 'shake', 'smoothie', 'fruit', 'drink', 'tropical']
  },
  {
    emoji: '🥤',
    name: 'Chilled Iced Drinks & Sodas',
    category: 'beverages',
    description: 'Iced house blends, artisanal sodas & cold fountain beverages',
    keywords: ['soda', 'drink', 'cold', 'iced', 'beverage', 'cup']
  },
  {
    emoji: '💧',
    name: 'Pure Spring & Mineral Water',
    category: 'beverages',
    description: 'Naturally purified chilled mineral water, alkaline & sparkling bottles',
    keywords: ['water', 'mineral', 'pure', 'bottle', 'drink', 'hydration']
  },
  {
    emoji: '☕',
    name: 'Vietnamese & Artisanal Brewed Coffee',
    category: 'beverages',
    description: 'Dark roast drip coffee with sweetened condensed milk & cold brews',
    keywords: ['coffee', 'espresso', 'vietnamese', 'brew', 'caffeine', 'drink']
  },
  {
    emoji: '🫖',
    name: 'Jasmine & Oolong Hot Teapot',
    category: 'beverages',
    description: 'Steeped loose-leaf jasmine blossoms, high-mountain oolong & herbal teas',
    keywords: ['teapot', 'tea', 'jasmine', 'oolong', 'hot', 'beverage']
  },

  // ── ARTISANAL DESSERTS ──
  {
    emoji: '🍧',
    name: 'Shaved Ice & Halo-Halo',
    category: 'desserts',
    description: 'Finely shaved crystal ice topped with sweet milk, jellies & ube',
    keywords: ['shaved ice', 'halo halo', 'kakigori', 'ice', 'dessert', 'sweet']
  },
  {
    emoji: '🍨',
    name: 'Matcha & Ube Ice Cream',
    category: 'desserts',
    description: 'Creamy artisanal scoops of ceremonial matcha, black sesame or ube',
    keywords: ['ice cream', 'scoop', 'matcha', 'dessert', 'cold', 'sweet']
  },
  {
    emoji: '🥞',
    name: 'Soufflé Pancakes & Pastries',
    category: 'desserts',
    description: 'Fluffy Japanese soufflé pancakes dusted with powdered sugar & syrup',
    keywords: ['pancake', 'souffle', 'pastry', 'dessert', 'sweet']
  },
  {
    emoji: '🧁',
    name: 'Sweet Mochi Cupcakes & Pastries',
    category: 'desserts',
    description: 'Chewy glutinous rice cakes, red bean pastries & baked sweet treats',
    keywords: ['cupcake', 'mochi', 'pastry', 'cake', 'sweet', 'dessert']
  },
  {
    emoji: '🍓',
    name: 'Fresh Strawberries & Fruit Medley',
    category: 'desserts',
    description: 'Fresh sliced ripe strawberries, lychee & seasonal sweet fruit cups',
    keywords: ['strawberry', 'fruit', 'berry', 'fresh', 'dessert']
  },
  {
    emoji: '🍯',
    name: 'Wild Honey & Syrups',
    category: 'desserts',
    description: 'Pure wild forest honey, brown sugar syrup & sweet dessert drizzles',
    keywords: ['honey', 'syrup', 'sweet', 'drizzle', 'dessert']
  }
];

/**
 * Filter icons by category and search keyword
 */
export function filterCulinaryIcons(query = '', category = 'all') {
  const q = (query || '').trim().toLowerCase();
  return CULINARY_ICONS.filter(item => {
    // Category match
    if (category && category !== 'all' && item.category !== category) {
      return false;
    }
    // Search match
    if (!q) return true;
    return (
      item.emoji.includes(q) ||
      item.name.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.keywords.some(k => k.includes(q))
    );
  });
}

/**
 * Get presets for allergens
 */
export function getAllergenPresets() {
  return CULINARY_ICONS.filter(i => i.category === 'allergens');
}

/**
 * Get presets for flavor profiles
 */
export function getFlavorPresets() {
  return CULINARY_ICONS.filter(i => i.category === 'flavors');
}

/**
 * Get presets for menu food categories
 */
export function getFoodCategoryPresets() {
  return CULINARY_ICONS.filter(i => ['noodles_rice', 'dimsum_appetizers', 'meat_seafood', 'greens_veggies', 'beverages', 'desserts'].includes(i.category));
}
