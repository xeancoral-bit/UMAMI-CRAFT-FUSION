/**
 * preferencesService.js
 * Centralized client-side service for dynamic Menu Preferences (Exclude Allergens & Flavor Preferences).
 * Communicates with backend REST APIs and Socket.io live sync.
 */

export const DEFAULT_ALLERGENS = [
  {
    id: 'peanuts',
    name: 'Peanuts',
    label: 'Peanuts',
    description: 'Groundnuts and peanut-derived ingredients or oils',
    icon_type: 'emoji',
    emoji: '🥜',
    image_url: '',
    image: '',
    status: 'Active',
    active: true,
    display_order: 1,
    order: 1
  },
  {
    id: 'gluten',
    name: 'Gluten',
    label: 'Gluten',
    description: 'Wheat, barley, rye, and flour-based batters',
    icon_type: 'emoji',
    emoji: '🌾',
    image_url: '',
    image: '',
    status: 'Active',
    active: true,
    display_order: 2,
    order: 2
  },
  {
    id: 'dairy',
    name: 'Dairy',
    label: 'Dairy',
    description: 'Milk, butter, cream, cheese, and milk solids',
    icon_type: 'emoji',
    emoji: '🥛',
    image_url: '',
    image: '',
    status: 'Active',
    active: true,
    display_order: 3,
    order: 3
  },
  {
    id: 'soy',
    name: 'Soy',
    label: 'Soy',
    description: 'Soy sauce, soybean oil, edamame, and tofu',
    icon_type: 'emoji',
    emoji: '🫘',
    image_url: '',
    image: '',
    status: 'Active',
    active: true,
    display_order: 4,
    order: 4
  }
];

export const DEFAULT_FLAVORS = [
  {
    id: 'spicy',
    name: 'Spicy',
    label: 'Spicy',
    description: 'Chili heat, fiery peppercorn, and spicy broth',
    icon_type: 'emoji',
    emoji: '🔥',
    image_url: '',
    image: '',
    status: 'Active',
    active: true,
    display_order: 1,
    order: 1
  },
  {
    id: 'vegan',
    name: 'Vegan',
    label: 'Vegan',
    description: '100% plant-based, zero animal products or dairy',
    icon_type: 'emoji',
    emoji: '🌿',
    image_url: '',
    image: '',
    status: 'Active',
    active: true,
    display_order: 2,
    order: 2
  },
  {
    id: 'sweet',
    name: 'Sweet',
    label: 'Sweet',
    description: 'Honey glaze, caramel, brown sugar, or sweet balance',
    icon_type: 'emoji',
    emoji: '🍬',
    image_url: '',
    image: '',
    status: 'Active',
    active: true,
    display_order: 3,
    order: 3
  },
  {
    id: 'savory',
    name: 'Savory',
    label: 'Savory',
    description: 'Rich umami, deep broths, soy, and roasted notes',
    icon_type: 'emoji',
    emoji: '🍴',
    image_url: '',
    image: '',
    status: 'Active',
    active: true,
    display_order: 4,
    order: 4
  },
  {
    id: 'healthy',
    name: 'Healthy',
    label: 'Healthy',
    description: 'Nutrient-rich, low-sodium, steamed, or wholesome',
    icon_type: 'emoji',
    emoji: '💚',
    image_url: '',
    image: '',
    status: 'Active',
    active: true,
    display_order: 5,
    order: 5
  }
];

const STORAGE_KEY_ALLERGENS = 'umami_menu_allergens';
const STORAGE_KEY_FLAVORS = 'umami_menu_flavors';
export const EVENT_PREFERENCES_UPDATED = 'umami:preferences-updated';

function normalizeItem(item) {
  const isAct = item.status ? item.status.toLowerCase() === 'active' : (item.active !== false);
  const statusStr = isAct ? 'Active' : 'Inactive';
  const orderNum = item.display_order !== undefined ? parseInt(item.display_order, 10) : (item.order || 1);
  return {
    ...item,
    name: item.name || item.label || '',
    label: item.label || item.name || '',
    status: statusStr,
    active: isAct,
    display_order: orderNum,
    order: orderNum,
    icon_type: item.icon_type || (item.image || item.image_url ? 'image' : 'emoji'),
    image: item.image || item.image_url || '',
    image_url: item.image_url || item.image || '',
    emoji: item.emoji || ''
  };
}

/**
 * Load allergens from localStorage (fast sync)
 */
export function getAllergens() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ALLERGENS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(normalizeItem).sort((a, b) => a.display_order - b.display_order);
      }
    }
  } catch (err) {
    console.warn('[preferencesService] Error loading local allergens:', err);
  }
  return DEFAULT_ALLERGENS.map(normalizeItem);
}

/**
 * Load flavor preferences from localStorage (fast sync)
 */
export function getFlavorPreferences() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FLAVORS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(normalizeItem).sort((a, b) => a.display_order - b.display_order);
      }
    }
  } catch (err) {
    console.warn('[preferencesService] Error loading local flavors:', err);
  }
  return DEFAULT_FLAVORS.map(normalizeItem);
}

/**
 * Save allergens and notify
 */
export function saveAllergens(allergens, socket = null) {
  const normalized = (allergens || []).map((it, idx) => normalizeItem({
    ...it,
    display_order: idx + 1,
    order: idx + 1
  }));
  try {
    localStorage.setItem(STORAGE_KEY_ALLERGENS, JSON.stringify(normalized));
    broadcastLocalUpdate({ allergens: normalized });
  } catch (e) {
    console.error('[preferencesService] Error saving allergens:', e);
  }
  return normalized;
}

/**
 * Save flavor preferences and notify
 */
export function saveFlavorPreferences(flavors, socket = null) {
  const normalized = (flavors || []).map((it, idx) => normalizeItem({
    ...it,
    display_order: idx + 1,
    order: idx + 1
  }));
  try {
    localStorage.setItem(STORAGE_KEY_FLAVORS, JSON.stringify(normalized));
    broadcastLocalUpdate({ flavors: normalized });
  } catch (e) {
    console.error('[preferencesService] Error saving flavors:', e);
  }
  return normalized;
}

/**
 * Broadcast update event across window
 */
function broadcastLocalUpdate(payload) {
  try {
    window.dispatchEvent(new CustomEvent(EVENT_PREFERENCES_UPDATED, { detail: payload }));
  } catch (_) {}
}

/**
 * API Call: Add Allergen
 */
export async function apiAddAllergen(data, socket = null) {
  const res = await fetch('/api/admin/preferences/allergens', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Failed to add allergen');
  }
  return json;
}

/**
 * API Call: Update Allergen
 */
export async function apiUpdateAllergen(id, data, socket = null) {
  const res = await fetch(`/api/admin/preferences/allergens/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Failed to update allergen');
  }
  return json;
}

/**
 * API Call: Delete Allergen
 */
export async function apiDeleteAllergen(id, socket = null) {
  const res = await fetch(`/api/admin/preferences/allergens/${id}`, {
    method: 'DELETE'
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Failed to delete allergen');
  }
  return json;
}

/**
 * API Call: Add Flavor Preference
 */
export async function apiAddFlavor(data, socket = null) {
  const res = await fetch('/api/admin/preferences/flavor-preferences', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Failed to add flavor preference');
  }
  return json;
}

/**
 * API Call: Update Flavor Preference
 */
export async function apiUpdateFlavor(id, data, socket = null) {
  const res = await fetch(`/api/admin/preferences/flavor-preferences/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Failed to update flavor preference');
  }
  return json;
}

/**
 * API Call: Delete Flavor Preference
 */
export async function apiDeleteFlavor(id, socket = null) {
  const res = await fetch(`/api/admin/preferences/flavor-preferences/${id}`, {
    method: 'DELETE'
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Failed to delete flavor preference');
  }
  return json;
}

/**
 * API Call: Reorder items
 */
export async function apiReorderPreferences(type, items, socket = null) {
  const res = await fetch('/api/admin/preferences/reorder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, items })
  });
  return res.json();
}

/**
 * Reset to factory defaults
 */
export function resetPreferencesToDefault(socket = null) {
  localStorage.removeItem(STORAGE_KEY_ALLERGENS);
  localStorage.removeItem(STORAGE_KEY_FLAVORS);
  const allergens = DEFAULT_ALLERGENS.map(normalizeItem);
  const flavors = DEFAULT_FLAVORS.map(normalizeItem);
  localStorage.setItem(STORAGE_KEY_ALLERGENS, JSON.stringify(allergens));
  localStorage.setItem(STORAGE_KEY_FLAVORS, JSON.stringify(flavors));
  broadcastLocalUpdate({ allergens, flavors });

  if (socket && typeof socket.emit === 'function') {
    socket.emit('update-menu-preferences', { allergens, flavors });
  }

  fetch('/api/preferences', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ allergens, flavors })
  }).catch(() => {});

  return { allergens, flavors };
}

/**
 * Central Subscription Hook: connects to REST API, Socket.io, and LocalStorage
 */
export function subscribePreferences(callback, socket = null) {
  const handleLocalEvent = (e) => {
    const detail = e.detail || {};
    const allergens = detail.allergens ? detail.allergens.map(normalizeItem) : getAllergens();
    const flavors = detail.flavors ? detail.flavors.map(normalizeItem) : getFlavorPreferences();
    callback({ allergens, flavors });
  };

  const handleStorageEvent = (e) => {
    if (e.key === STORAGE_KEY_ALLERGENS || e.key === STORAGE_KEY_FLAVORS) {
      callback({ allergens: getAllergens(), flavors: getFlavorPreferences() });
    }
  };

  window.addEventListener(EVENT_PREFERENCES_UPDATED, handleLocalEvent);
  window.addEventListener('storage', handleStorageEvent);

  let socketHandler = null;
  if (socket && typeof socket.on === 'function') {
    socketHandler = (data) => {
      if (data?.allergens && Array.isArray(data.allergens)) {
        const normA = data.allergens.map(normalizeItem);
        localStorage.setItem(STORAGE_KEY_ALLERGENS, JSON.stringify(normA));
      }
      const rawF = data?.flavor_preferences || data?.flavors;
      if (rawF && Array.isArray(rawF)) {
        const normF = rawF.map(normalizeItem);
        localStorage.setItem(STORAGE_KEY_FLAVORS, JSON.stringify(normF));
      }
      callback({
        allergens: getAllergens(),
        flavors: getFlavorPreferences()
      });
    };
    socket.on('menu-preferences-updated', socketHandler);
    socket.on('initial-menu-preferences', socketHandler);
  }

  // Initial fetch from backend REST API
  fetch('/api/preferences')
    .then(r => r.json())
    .then(data => {
      if (data && (Array.isArray(data.allergens) || Array.isArray(data.flavor_preferences) || Array.isArray(data.flavors))) {
        if (Array.isArray(data.allergens) && data.allergens.length > 0) {
          const normA = data.allergens.map(normalizeItem);
          localStorage.setItem(STORAGE_KEY_ALLERGENS, JSON.stringify(normA));
        }
        const rawF = data.flavor_preferences || data.flavors;
        if (Array.isArray(rawF) && rawF.length > 0) {
          const normF = rawF.map(normalizeItem);
          localStorage.setItem(STORAGE_KEY_FLAVORS, JSON.stringify(normF));
        }
        callback({
          allergens: getAllergens(),
          flavors: getFlavorPreferences()
        });
      }
    })
    .catch(() => {});

  return () => {
    window.removeEventListener(EVENT_PREFERENCES_UPDATED, handleLocalEvent);
    window.removeEventListener('storage', handleStorageEvent);
    if (socket && socketHandler && typeof socket.off === 'function') {
      socket.off('menu-preferences-updated', socketHandler);
      socket.off('initial-menu-preferences', socketHandler);
    }
  };
}
