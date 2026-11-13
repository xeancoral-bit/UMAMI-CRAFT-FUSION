/**
 * Umami Craft Fusion Kiosk & Mobile Dining System
 * Comprehensive Allergen Detection & Double-Warning Safety Utility
 */

export const ALLERGEN_SYNONYMS = {
  dairy: ['dairy', 'milk', 'cheese', 'butter', 'cream', 'whey', 'casein', 'lactose', 'yogurt', 'condensed milk', 'creamer'],
  milk: ['dairy', 'milk', 'cheese', 'butter', 'cream', 'whey', 'casein', 'lactose', 'yogurt', 'condensed milk'],
  peanuts: ['peanut', 'peanuts', 'groundnut', 'arachis', 'peanut butter', 'peanut oil'],
  peanut: ['peanut', 'peanuts', 'groundnut', 'arachis', 'peanut butter', 'peanut oil'],
  shellfish: ['shellfish', 'shrimp', 'prawn', 'crab', 'lobster', 'crawfish', 'scallop', 'clam', 'mussel', 'oyster', 'squid', 'octopus', 'crustacean', 'mollusc'],
  crustaceans: ['crustacean', 'crustaceans', 'shrimp', 'prawn', 'crab', 'lobster'],
  gluten: ['gluten', 'wheat', 'barley', 'rye', 'malt', 'flour', 'bread', 'noodle', 'dumpling wrapper'],
  wheat: ['wheat', 'gluten', 'flour', 'bread', 'noodle', 'farina', 'semolina', 'spelt'],
  eggs: ['egg', 'eggs', 'egg white', 'egg yolk', 'mayo', 'mayonnaise', 'meringue', 'albumin', 'ajitama'],
  egg: ['egg', 'eggs', 'egg white', 'egg yolk', 'mayo', 'mayonnaise', 'meringue', 'albumin', 'ajitama'],
  soy: ['soy', 'soya', 'soybean', 'tofu', 'edamame', 'soy sauce', 'shoyu', 'tamari', 'miso', 'tempeh'],
  soybeans: ['soy', 'soya', 'soybean', 'tofu', 'edamame', 'soy sauce', 'shoyu', 'tamari', 'miso'],
  fish: ['fish', 'salmon', 'tuna', 'cod', 'snapper', 'anchovy', 'bonito', 'dashi', 'fish sauce', 'patis', 'katsuobushi'],
  tree_nuts: ['tree nut', 'tree nuts', 'nut', 'nuts', 'almond', 'walnut', 'cashew', 'pistachio', 'pecan', 'hazelnut', 'macadamia', 'pine nut'],
  nuts: ['tree nut', 'tree nuts', 'nut', 'nuts', 'almond', 'walnut', 'cashew', 'pistachio', 'pecan', 'hazelnut'],
  sesame: ['sesame', 'tahini', 'sesame oil', 'sesame seed'],
  mustard: ['mustard', 'mustard seed', 'dijon'],
  celery: ['celery', 'celeriac'],
  lupin: ['lupin', 'lupine'],
  molluscs: ['mollusc', 'molluscs', 'mollusk', 'squid', 'clam', 'mussel', 'oyster', 'scallop', 'octopus', 'snail'],
  sulphites: ['sulphite', 'sulphites', 'sulfite', 'sulfites', 'sulfur dioxide']
};

/**
 * Extracts and normalizes tokens from a text string or array
 */
function cleanString(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .trim();
}

/**
 * Checks if a user's declared allergen matches an item's allergen tags, ingredients, or description
 * @param {Object} item - Menu item or cart item
 * @param {Array<string>} userAllergens - Array of user-declared allergens
 * @returns {Array<string>} Array of conflicting allergen labels
 */
export function getConflictingAllergens(item, userAllergens = []) {
  if (!item || !Array.isArray(userAllergens) || userAllergens.length === 0) {
    return [];
  }

  // 1. Gather all item allergen tags
  const rawItemAllergens = Array.isArray(item.allergens)
    ? item.allergens
    : (typeof item.allergens === 'string' ? item.allergens.split(',') : []);

  const normalizedItemAllergens = rawItemAllergens
    .map(a => cleanString(a))
    .filter(Boolean);

  // 2. Gather ingredients & searchable text from item
  const rawIngredients = typeof item.ingredients === 'string' ? item.ingredients : '';
  const ingredientsListStr = Array.isArray(item.ingredientsList)
    ? item.ingredientsList.map(i => (typeof i === 'object' && i !== null ? (i.name || '') : String(i))).join(' ')
    : '';
  const itemName = typeof item.name === 'string' ? item.name : '';
  const itemDesc = typeof item.description === 'string' ? item.description : '';
  const itemTags = Array.isArray(item.tags) ? item.tags.join(' ') : '';

  const fullItemCorpus = cleanString(
    `${normalizedItemAllergens.join(' ')} ${rawIngredients} ${ingredientsListStr} ${itemName} ${itemDesc} ${itemTags}`
  );

  const matchedAllergens = [];

  userAllergens.forEach(rawUserAllergen => {
    if (!rawUserAllergen) return;
    const userAllergenClean = cleanString(rawUserAllergen);
    if (!userAllergenClean) return;

    // Direct check against item allergens
    const directTagMatch = normalizedItemAllergens.some(ia => {
      if (ia === userAllergenClean) return true;
      const iaStem = ia.replace(/s$/, '');
      const uaStem = userAllergenClean.replace(/s$/, '');
      if (iaStem === uaStem) return true;
      return false;
    });

    if (directTagMatch) {
      if (!matchedAllergens.includes(rawUserAllergen)) {
        matchedAllergens.push(rawUserAllergen);
      }
      return;
    }

    // Synonym check (e.g. dairy -> milk/cheese, shellfish -> shrimp/crab)
    const normalizedKey = userAllergenClean.replace(/\s+/g, '_').replace(/s$/, '');
    const synonyms = ALLERGEN_SYNONYMS[userAllergenClean] ||
      ALLERGEN_SYNONYMS[userAllergenClean.replace(/s$/, '')] ||
      ALLERGEN_SYNONYMS[normalizedKey] ||
      [userAllergenClean];

    let hasSynonymMatch = false;

    // Check if any item allergen tag matches a synonym
    for (const syn of synonyms) {
      const synClean = cleanString(syn);
      if (normalizedItemAllergens.some(ia => ia === synClean || ia.includes(synClean) || synClean.includes(ia))) {
        hasSynonymMatch = true;
        break;
      }
    }

    // Check if full item text contains the allergen or any synonyms as whole words
    if (!hasSynonymMatch) {
      for (const syn of synonyms) {
        const synClean = cleanString(syn);
        if (!synClean || synClean.length < 3) continue;
        const wordRegex = new RegExp(`(^|\\s|\\b)${synClean}(\\b|s?\\b|\\s|$)`, 'i');
        if (wordRegex.test(fullItemCorpus)) {
          hasSynonymMatch = true;
          break;
        }
      }
    }

    // Direct check for custom allergens (e.g., "garlic", "onion", "chili", "msg")
    if (!hasSynonymMatch) {
      const userWordRegex = new RegExp(`(^|\\s|\\b)${userAllergenClean}(\\b|s?\\b|\\s|$)`, 'i');
      if (userWordRegex.test(fullItemCorpus)) {
        hasSynonymMatch = true;
      }
    }

    if (hasSynonymMatch && !matchedAllergens.includes(rawUserAllergen)) {
      matchedAllergens.push(rawUserAllergen);
    }
  });

  return matchedAllergens;
}

/**
 * Capitalizes string nicely for badges and alerts
 */
export function formatAllergenName(str) {
  if (!str) return '';
  return String(str)
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

