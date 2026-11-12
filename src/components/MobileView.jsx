import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { io } from 'socket.io-client';
import { getAllergens, getFlavorPreferences, subscribePreferences } from '../utils/preferencesService';
import PesoReceipt from './PesoReceipt';
import TableServiceModal from './TableServiceModal';
import KioskProductModal from './KioskProductModal';
import KioskCheckoutModal from './KioskCheckoutModal';
import AllergyVerificationModal from './AllergyVerificationModal';
import {
  Shield,
  CheckCircle,
  XCircle,
  Flame,
  Leaf,
  Candy,
  UtensilsCrossed,
  HeartPulse,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  X,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Receipt,
  Bell,
  BellRing,
  Settings,
  ExternalLink,
  Volume2,
  VolumeX,
  Coffee,
  Sparkles,
  Package,
  Shuffle,
  ChefHat,
  Search,
  Tag,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Truck,
  Lock,
  Save,
  AlertTriangle,
  Wheat,
  Milk,
  ShieldAlert,
  Info,
  Utensils,
  ShoppingBag,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

// Play a rich 4-note ready fanfare chime
function playReadyChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const notes = [
      { freq: 523.25, start: 0,    dur: 0.18 }, // C5
      { freq: 659.25, start: 0.2,  dur: 0.18 }, // E5
      { freq: 783.99, start: 0.4,  dur: 0.18 }, // G5
      { freq: 1046.5, start: 0.6,  dur: 0.35 }, // C6  (held)
      { freq: 783.99, start: 1.0,  dur: 0.18 }, // G5
      { freq: 1046.5, start: 1.2,  dur: 0.5  }, // C6  (final)
    ];

    notes.forEach(({ freq, start, dur }) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.28, ctx.currentTime + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.05);
    });
  } catch (e) {
    console.warn('Mobile ready chime audio playback failed:', e);
  }
}

// Haptic vibration pulse patterns
const VIBRATE_READY = [
  300, 100,   // buzz — pause
  300, 100,   // buzz — pause
  600, 200,   // long buzz — pause
  300, 100,   // buzz — pause
  300          // final buzz
];
const VIBRATE_REMINDER = [200, 80, 200, 80, 400];

function doVibrate(pattern) {
  if (!navigator.vibrate) return;
  try { navigator.vibrate(pattern); } catch (_) {}
}

function getAllergenIcon(id, size = 15) {
  switch (String(id).toLowerCase()) {
    case 'peanuts':
    case 'nuts':
      return <ShieldAlert size={size} color="#ef4444" />;
    case 'gluten':
    case 'wheat':
      return <Wheat size={size} color="#f59e0b" />;
    case 'dairy':
    case 'milk':
      return <Milk size={size} color="#3b82f6" />;
    case 'soy':
      return <Leaf size={size} color="#10b981" />;
    default:
      return <AlertTriangle size={size} color="#ef4444" />;
  }
}

function getPreferenceIcon(id, size = 15) {
  switch (String(id).toLowerCase()) {
    case 'spicy':
      return <Flame size={size} color="#ea580c" />;
    case 'vegan':
      return <Leaf size={size} color="#16a34a" />;
    case 'sweet':
      return <Candy size={size} color="#ec4899" />;
    case 'savory':
      return <UtensilsCrossed size={size} color="#d97706" />;
    case 'healthy':
      return <HeartPulse size={size} color="#059669" />;
    default:
      return <Sparkles size={size} color="#6366f1" />;
  }
}

const ALLERGEN_OPTIONS = [
  { id: 'peanuts', label: 'Peanuts', icon: <ShieldAlert size={15} color="#ef4444" /> },
  { id: 'gluten',  label: 'Gluten',  icon: <Wheat size={15} color="#f59e0b" /> },
  { id: 'dairy',   label: 'Dairy',   icon: <Milk size={15} color="#3b82f6" /> },
  { id: 'soy',     label: 'Soy',     icon: <Leaf size={15} color="#10b981" /> }
];

const PREFERENCE_OPTIONS = [
  { id: 'spicy',   label: 'Spicy',   icon: <Flame size={15} color="#ea580c" /> },
  { id: 'vegan',   label: 'Vegan',   icon: <Leaf size={15} color="#16a34a" /> },
  { id: 'sweet',   label: 'Sweet',   icon: <Candy size={15} color="#ec4899" /> },
  { id: 'savory',  label: 'Savory',  icon: <UtensilsCrossed size={15} color="#d97706" /> },
  { id: 'healthy', label: 'Healthy', icon: <HeartPulse size={15} color="#059669" /> }
];

// Default Drinks Catalog (used if none in localStorage)
const DEFAULT_DRINKS = [
  {
    id: 'DRK-001',
    name: 'Matcha Boba Milk Tea',
    category: 'Drinks & Boba',
    price: 140,
    description: 'Ceremonial grade Uji matcha with brown sugar boba pearls and fresh organic milk.',
    allergens: ['dairy'],
    tags: ['sweet', 'drinks'],
    emoji: '🧋',
    image: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'DRK-002',
    name: 'Iced Taro Milk Tea',
    category: 'Drinks & Boba',
    price: 135,
    description: 'Creamy purple taro with silky whole milk and slow-cooked chewy tapioca pearls.',
    allergens: ['dairy'],
    tags: ['sweet', 'drinks'],
    emoji: '🧋',
    image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'DRK-003',
    name: 'Thai Iced Tea',
    category: 'Drinks & Boba',
    price: 130,
    description: 'Traditional spiced Ceylon black tea infused with star anise and sweet condensed milk.',
    allergens: ['dairy'],
    tags: ['sweet', 'drinks'],
    emoji: '🧋',
    image: 'https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'DRK-004',
    name: 'Fresh Mango Shake',
    category: 'Drinks & Boba',
    price: 120,
    description: 'Fresh ripe Philippine mangoes blended smoothly with crushed crystal ice.',
    allergens: [],
    tags: ['vegan', 'sweet', 'healthy', 'drinks'],
    emoji: '🥭',
    image: 'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'DRK-005',
    name: 'Calamansi Iced Tea',
    category: 'Drinks & Boba',
    price: 95,
    description: 'House-brewed Ceylon tea with freshly squeezed calamansi citrus and wild honey.',
    allergens: [],
    tags: ['vegan', 'healthy', 'drinks'],
    emoji: '🍋',
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'DRK-006',
    name: 'Bottled Mineral Water',
    category: 'Drinks & Boba',
    price: 35,
    description: 'Pure chilled drinking mineral water (500ml).',
    allergens: [],
    tags: ['healthy', 'drinks'],
    emoji: '💧',
    image: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=600&q=80'
  }
];

// Default Combos & Value Meals Catalog
const DEFAULT_COMBOS = [
  {
    id: 'CMB-101',
    name: 'Ultimate Teriyaki Feast Combo',
    main: 'Chicken Teriyaki Rice Bowl',
    side: 'Pork & Chive Gyoza',
    drink: 'Matcha Boba Milk Tea',
    originalPrice: 480,
    promoPrice: 399,
    description: 'Chicken Teriyaki Rice Bowl + Pork & Chive Gyoza + Matcha Boba Milk Tea',
    allergens: ['gluten', 'dairy'],
    tags: ['savory', 'combo'],
    emoji: '🍱',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'CMB-102',
    name: 'Szechuan Dumpling Duo',
    main: 'Spicy Szechuan Dumplings',
    side: 'Egg Fried Rice',
    drink: 'Thai Iced Milk Tea',
    originalPrice: 450,
    promoPrice: 349,
    description: 'Spicy Szechuan Dumplings + Egg Fried Rice + Thai Iced Milk Tea',
    allergens: ['gluten', 'dairy', 'soy'],
    tags: ['spicy', 'combo'],
    emoji: '🍱',
    image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'CMB-103',
    name: 'Thai Curry Comfort Set',
    main: 'Thai Green Curry Bowl',
    side: 'Jasmine Rice',
    drink: 'Calamansi Iced Tea',
    originalPrice: 420,
    promoPrice: 349,
    description: 'Thai Green Curry Bowl + Jasmine Rice + Calamansi Iced Tea',
    allergens: [],
    tags: ['vegan', 'spicy', 'combo'],
    emoji: '🍛',
    image: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'CMB-104',
    name: 'Mango Dessert Treat',
    main: 'Mango Sticky Rice',
    side: 'Crispy Tofu Bites',
    drink: 'Fresh Mango Shake',
    originalPrice: 320,
    promoPrice: 249,
    description: 'Mango Sticky Rice + Crispy Tofu Bites + Fresh Mango Shake',
    allergens: ['soy'],
    tags: ['sweet', 'vegan', 'combo'],
    emoji: '🥭',
    image: 'https://images.unsplash.com/photo-1562440499-64c9a111f713?auto=format&fit=crop&w=600&q=80'
  }
];

// Default Mix & Match Deals
const DEFAULT_MIX_MATCH = [
  {
    id: 'MIX-01',
    name: 'Craft Bowl + Side + Drink Deal',
    description: 'Pick any Rice Bowl/Noodles + 1 Crispy Dimsum + 1 Cold Beverage',
    price: 429.00,
    originalPrice: 560.00,
    badge: 'Save ₱131',
    allergens: [],
    tags: ['popular', 'savory'],
    emoji: '🥢',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'MIX-02',
    name: 'Artisan Ramen & Gyoza Pair Set',
    description: 'Hand-pulled noodle specialty paired with crispy dumplings and dipping sauce.',
    price: 389.00,
    originalPrice: 490.00,
    badge: 'Save ₱101',
    allergens: ['gluten'],
    tags: ['spicy'],
    emoji: '🍜',
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'MIX-03',
    name: 'Twin Boba & Dessert Feast',
    description: 'Any 2 specialty iced milk teas or fruit shakes + Mango Sticky Rice dessert.',
    price: 319.00,
    originalPrice: 420.00,
    badge: 'Save ₱101',
    allergens: [],
    tags: ['sweet'],
    emoji: '🍧',
    image: 'https://images.unsplash.com/photo-1562440499-64c9a111f713?auto=format&fit=crop&w=600&q=80'
  }
];


function MobileView({ kioskId, onResetSession }) {
  // --- Dynamic Allergen & Flavor Preferences from Admin ---
  const [dynamicAllergens, setDynamicAllergens] = useState(() => getAllergens());
  const [dynamicFlavors, setDynamicFlavors] = useState(() => getFlavorPreferences());

  useEffect(() => {
    const unsub = subscribePreferences(({ allergens: newAllergens, flavors: newFlavors }) => {
      if (newAllergens) setDynamicAllergens(newAllergens);
      if (newFlavors) setDynamicFlavors(newFlavors);
    }, socketRef.current);
    return () => unsub();
  }, []);

  const activeAllergenOptions = useMemo(() => {
    return (dynamicAllergens || [])
      .filter(item => item.active !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [dynamicAllergens]);

  const activePreferenceOptions = useMemo(() => {
    return (dynamicFlavors || [])
      .filter(item => item.active !== false && String(item.id || '').toLowerCase() !== 'mixmatch' && String(item.label || item.name || '').toLowerCase() !== 'mixmatch')
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [dynamicFlavors]);

  // --- Load localStorage values ---
  const [allergens, setAllergens] = useState(() => {
    const saved = localStorage.getItem('synapse_allergens');
    return saved ? JSON.parse(saved) : [];
  });

  const [preferences, setPreferences] = useState(() => {
    const saved = localStorage.getItem('synapse_preferences');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed.filter(p => String(p).toLowerCase() !== 'mixmatch') : [];
    } catch (_) {
      return [];
    }
  });

  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('synapse_order_history');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed.filter(t => String(t).toLowerCase() !== 'mixmatch') : [];
    } catch (_) {
      return [];
    }
  });

  const [cart, setCart] = useState({}); // { [itemId]: quantity }
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(null); // { code, discountType, discountValue, applicableItems, applyToAll }
  const [promoMsg, setPromoMsg] = useState({ text: '', ok: false });

  // Live Promotions & 5-Second Auto-Rotating Banner State
  const [promos, setPromos] = useState(() => {
    try {
      const saved = localStorage.getItem('umami_promos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return [];
  });
  const [activePromoIndex, setActivePromoIndex] = useState(0);
  const [isPromoPaused, setIsPromoPaused] = useState(false);
  const [promoToast, setPromoToast] = useState(null);
  const [expiredPromoUrlAlert, setExpiredPromoUrlAlert] = useState(null);
  const [promoClock, setPromoClock] = useState(Date.now());

  // Real-time clock tick every 1.5 seconds so reaching expiration immediately hides the banner
  useEffect(() => {
    const timer = setInterval(() => setPromoClock(Date.now()), 1500);
    return () => clearInterval(timer);
  }, []);

  // Helper to determine if a promo is currently active and unexpired
  const isPromoCurrentlyActive = useCallback((p, clockNow = Date.now()) => {
    if (!p) return false;
    if (p.status !== 'active') return false;

    // 1. Scheduled expiration timestamp check
    if (p.expiresAt) {
      const expT = new Date(p.expiresAt).getTime();
      if (!isNaN(expT) && expT <= clockNow) return false;
    }

    // 2. Date range string check (e.g. "Jan 1, 2025 – Dec 31, 2026")
    if (p.dateRange) {
      const parts = String(p.dateRange).split(/–|-|to/i);
      if (parts.length >= 2) {
        const endD = new Date(parts[parts.length - 1].trim());
        if (!isNaN(endD.getTime())) {
          endD.setHours(23, 59, 59, 999);
          if (endD.getTime() <= clockNow) return false;
        }
      }
    }

    // 3. Max redemptions cap check
    if (p.maxRedemptions && p.currentRedemptions !== undefined && p.currentRedemptions >= p.maxRedemptions) {
      return false;
    }

    return true;
  }, []);

  // Filter only strictly ACTIVE and NON-EXPIRED promotions for customer banner displays
  const activePromos = useMemo(() => {
    const now = promoClock;
    return (promos || []).filter(p => {
      if (!isPromoCurrentlyActive(p, now)) return false;
      return !!(p.bannerImage || p.imageUrl || p.image);
    });
  }, [promos, promoClock, isPromoCurrentlyActive]);

  // Synchronously auto-eject any applied promo code if it becomes expired in real time
  useEffect(() => {
    if (!promoApplied) return;
    const now = promoClock;
    const matched = promos.find(p => p.code?.toUpperCase() === promoApplied.code?.toUpperCase());
    const isNowExpired = !matched || !isPromoCurrentlyActive(matched, now);
    if (isNowExpired) {
      setPromoApplied(null);
      setPromoCode('');
      setPromoMsg({
        text: `⚠️ Promo "${promoApplied.name}" [${promoApplied.code}] has expired and was removed.`,
        ok: false
      });
      setExpiredPromoUrlAlert({
        code: promoApplied.code,
        message: `Promotion code "${promoApplied.code}" reached its expiration date and is no longer valid.`
      });
    }
  }, [promos, promoApplied, promoClock, isPromoCurrentlyActive]);

  // Handle URL promo link or scanned QR code on mount / navigation
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const targetCode = params.get('promo') || params.get('code');
    if (!targetCode) return;

    const clean = targetCode.trim().toUpperCase();
    const validateUrlCode = async () => {
      try {
        const res = await fetch(`/api/promos/validate/${encodeURIComponent(clean)}`);
        const data = await res.json();
        if (!res.ok || !data.valid || data.status === 'expired' || data.isRetired) {
          setExpiredPromoUrlAlert({
            code: clean,
            message: data.error || `Scanned promotional link with code "${clean}" has expired and is no longer valid.`
          });
          setPromoApplied(null);
        } else if (data.promo && data.promo.status === 'active') {
          setPromoCode(data.promo.code);
          setPromoToast(`Scanned promo code "${data.promo.code}" applied!`);
          setTimeout(() => setPromoToast(null), 3500);
        }
      } catch (err) {
        const localMatch = promos.find(p => p.code?.toUpperCase() === clean || p.originalCode?.toUpperCase() === clean);
        if (localMatch && (localMatch.status === 'expired' || (localMatch.expiresAt && new Date(localMatch.expiresAt).getTime() <= Date.now()))) {
          setExpiredPromoUrlAlert({
            code: clean,
            message: `Promotion code "${clean}" has expired and is no longer valid.`
          });
        }
      }
    };

    validateUrlCode();
  }, [promos]);

  // Automatically advance to the next active promotion every 5 seconds
  useEffect(() => {
    if (activePromos.length <= 1 || isPromoPaused) return;
    const timer = setInterval(() => {
      setActivePromoIndex(prev => (prev + 1) % activePromos.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [activePromos.length, isPromoPaused]);

  // Handle customer tapping on the promo banner or code pill
  const handleBannerPromoClick = (promo) => {
    if (!promo) return;
    setPromoCode(promo.code);
    if (navigator.clipboard) {
      try { navigator.clipboard.writeText(promo.code); } catch (_) {}
    }
    setPromoToast(`Promo code "${promo.code}" applied!`);
    setTimeout(() => setPromoToast(null), 3000);

    const cartCount = Object.values(cart).reduce((sum, v) => sum + (typeof v === 'object' ? (v?.quantity || 1) : (v || 0)), 0);
    if (cartCount > 0) {
      setIsCartOpen(true);
      try {
        let source = promos;
        if (!source || source.length === 0) {
          source = JSON.parse(localStorage.getItem('umami_promos') || '[]');
        }
        const match = source.find(p => p.code?.toUpperCase() === promo.code.toUpperCase());
        if (match && match.status === 'active') {
          const currentCartList = Object.entries(cart).map(([id, val]) => {
            if (typeof val === 'object' && val !== null) return val;
            const it = allCatalogItems.find(m => String(m.id) === String(id));
            return it ? { ...it, quantity: val } : null;
          }).filter(Boolean);

          if (!match.applyToAll) {
            const applicable = match.applicableItems || [];
            const hasEligibleItem = currentCartList.some(ci => {
              return applicable.some(appItem => {
                const cName = (ci.name || '').toLowerCase();
                const aName = (appItem || '').toLowerCase();
                return cName === aName || cName.startsWith(aName) || aName.startsWith(cName.split(' (')[0]);
              });
            });
            if (!hasEligibleItem) {
              setPromoMsg({
                text: `❌ Promo applies to: ${applicable.join(', ')}. Add an eligible item to your cart!`,
                ok: false
              });
              return;
            }
          }
          setPromoApplied(match);
          const rate = match.discountType === 'percent' ? `${match.discountValue}%` : `₱${match.discountValue}`;
          setPromoMsg({ text: `✅ "${match.name}" applied (${rate} off)!`, ok: true });
        }
      } catch (err) {
        console.warn('Auto apply promo error:', err);
      }
    } else if (promo.applicableItems && promo.applicableItems.length > 0) {
      const firstItem = promo.applicableItems[0];
      const isDrink = drinks.some(d => d.name.toLowerCase() === firstItem.toLowerCase());
      if (isDrink) {
        setSelectedCategory('drinks');
      } else {
        setSelectedCategory('all');
      }
    }
  };

  const [socketConnected, setSocketConnected] = useState(false);
  // Start on the Kiosk Welcome Screen for self-service ordering flow
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(true);
  const [isOnboarded, setIsOnboarded] = useState(false);

  // Toggle visibility (hide / unhide) of Active Dietary Filters section
  const [showDietaryFilters, setShowDietaryFilters] = useState(() => {
    try {
      const saved = localStorage.getItem('synapse_show_dietary_filters');
      return saved !== null ? saved === 'true' : true;
    } catch (_) {
      return true;
    }
  });

  const toggleDietaryFilters = () => {
    setShowDietaryFilters(prev => {
      const next = !prev;
      try {
        localStorage.setItem('synapse_show_dietary_filters', String(next));
      } catch (_) {}
      return next;
    });
  };
  const [lastOrder, setLastOrder] = useState(() => {
    const saved = localStorage.getItem('synapse_last_order');
    return saved ? JSON.parse(saved) : null;
  });
  const [activeOrder, setActiveOrder] = useState(() => {
    try {
      localStorage.removeItem('synapse_active_order');
    } catch (_) {}
    return null;
  });
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showReadyCelebration, setShowReadyCelebration] = useState(false);
  const [isBuzzing, setIsBuzzing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [diningOption, setDiningOption] = useState('Dine-In');
  const [selectedProductForModal, setSelectedProductForModal] = useState(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [notifPermission, setNotifPermission] = useState(
    'Notification' in window ? Notification.permission : 'unavailable'
  );
  const vibReminderRef = useRef(null);
  const buzzerCtxRef = useRef(null);
  const buzzerTimerRef = useRef(null);

  const socketRef = useRef(null);
  const [menuItems, setMenuItems] = useState(() => {
    try {
      const saved = localStorage.getItem('umami_admin_menu');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return [];
  });
  const [drinks, setDrinks] = useState(() => {
    try {
      const saved = localStorage.getItem('umami_drinks');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return DEFAULT_DRINKS;
  });
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedDrinkForModal, setSelectedDrinkForModal] = useState(null);
  const [modalSizeIndex, setModalSizeIndex] = useState(0);
  const [modalSelectedAddons, setModalSelectedAddons] = useState([]);
  const [modalQty, setModalQty] = useState(1);
  const [restaurantMeta, setRestaurantMeta] = useState(null);
  const [captiveParams, setCaptiveParams] = useState(null);

  // Setup effective kiosk identification early so hooks can safely reference it
  const effectiveKioskId = kioskId || (activeOrder ? activeOrder.kioskId : 'COUNTER_01');

  // Extract kioskPort and restaurant parameters from URL to target the correct restaurant instance
  const urlParams = new URLSearchParams(window.location.search);
  const kioskPort = urlParams.get('kioskPort');
  const restaurantParam = (urlParams.get('restaurant') || 'umami').trim().toLowerCase();
  // Always use Vite proxy ('') when running on port 3000, cloud tunnels (loca.lt/https), or matching port to prevent external firewall blocks
  const isTunnelOrHttps = typeof window !== 'undefined' && (window.location.protocol === 'https:' || window.location.hostname.includes('loca.lt'));
  const isViteProxyAvailable = window.location.port === '3000' || !kioskPort || kioskPort === window.location.port || isTunnelOrHttps;
  const backendTargetUrl = isViteProxyAvailable ? '' : `http://${window.location.hostname}:${kioskPort}`;

  // QR Session & Allergy Verification State (scoped to restaurant + kioskId so customer data never leaks)
  const sessionScopeKey = `${restaurantParam}_${effectiveKioskId}`;
  const [qrSession, setQrSession] = useState(null);
  const [showAllergyModal, setShowAllergyModal] = useState(false);
  const [allergyModalError, setAllergyModalError] = useState('');
  const [allergyStatus, setAllergyStatus] = useState('unanswered'); // 'unanswered' | 'allergies_declared' | 'no_allergies_declared'
  const [customAllergens, setCustomAllergens] = useState(() => {
    try {
      const saved = localStorage.getItem(`synapse_custom_allergens_${sessionScopeKey}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [customAllergyInput, setCustomAllergyInput] = useState('');
  const [dietaryConfirmToast, setDietaryConfirmToast] = useState('');

  // Validate QR session on mount and immediately prompt "Do You Have Any Food Allergies?" if unanswered
  useEffect(() => {
    let cancelled = false;
    const validateUrl = backendTargetUrl ? `${backendTargetUrl}/api/qr/validate` : '/api/qr/validate';
    const existingSessionId = sessionStorage.getItem(`qr_session_id_${sessionScopeKey}`) || undefined;

    fetch(validateUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kioskId: effectiveKioskId,
        restaurant: restaurantParam,
        kioskPort: kioskPort || undefined,
        sessionId: existingSessionId
      })
    })
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;
        if (data?.valid && data.session) {
          setQrSession(data.session);
          try {
            sessionStorage.setItem(`qr_session_id_${sessionScopeKey}`, data.session.sessionId);
          } catch (_) {}
          const status = data.session.allergyStatus || 'unanswered';
          setAllergyStatus(status);
          if (status === 'unanswered') {
            setShowAllergyModal(true);
          } else if (status === 'allergies_declared') {
            if (Array.isArray(data.session.allergens)) setAllergens(data.session.allergens);
            if (Array.isArray(data.session.customAllergens)) setCustomAllergens(data.session.customAllergens);
            if (Array.isArray(data.session.preferences)) setPreferences(data.session.preferences);
          }
        } else {
          setAllergyModalError(data?.error || 'Could not validate QR session.');
          setShowAllergyModal(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setShowAllergyModal(true);
        }
      });

    return () => { cancelled = true; };
  }, [backendTargetUrl, effectiveKioskId, kioskPort, restaurantParam, sessionScopeKey]);

  // Step 5A: Customer selects YES, I HAVE ALLERGIES -> open Local Dietary Vault (Image 1)
  const handleAllergyModalYes = async () => {
    setAllergyModalError('');
    setShowAllergyModal(false);
    setShowWelcomeScreen(false);
    setIsOnboarded(false);
  };

  // Step 5B: Customer selects NO, I DON'T HAVE ALLERGIES -> record "No allergies declared" & go to menu
  const handleAllergyModalNo = async () => {
    setAllergyModalError('');
    try {
      const verifyUrl = backendTargetUrl ? `${backendTargetUrl}/api/qr/allergy-verification` : '/api/qr/allergy-verification';
      const res = await fetch(verifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kioskId: effectiveKioskId,
          restaurant: restaurantParam,
          sessionId: qrSession?.sessionId,
          hasAllergies: false,
          allergens: [],
          customAllergens: [],
          preferences
        })
      });
      const data = await res.json();
      if (data?.session) setQrSession(data.session);
    } catch (_) {}

    setAllergens([]);
    setCustomAllergens([]);
    try {
      localStorage.setItem('synapse_allergens', JSON.stringify([]));
      localStorage.setItem(`synapse_custom_allergens_${sessionScopeKey}`, JSON.stringify([]));
    } catch (_) {}

    setAllergyStatus('no_allergies_declared');
    setShowAllergyModal(false);
    setShowWelcomeScreen(false);
    setIsOnboarded(true);
    setDietaryConfirmToast('Recorded: No allergies declared for this dining session.');
    setTimeout(() => setDietaryConfirmToast(''), 4000);
  };

  // Add / Remove Custom Allergies in Local Dietary Vault
  const handleAddCustomAllergy = () => {
    const cleaned = customAllergyInput.trim();
    if (!cleaned) return;
    if (!customAllergens.some(a => a.toLowerCase() === cleaned.toLowerCase())) {
      const next = [...customAllergens, cleaned];
      setCustomAllergens(next);
      try {
        localStorage.setItem(`synapse_custom_allergens_${sessionScopeKey}`, JSON.stringify(next));
      } catch (_) {}
    }
    setCustomAllergyInput('');
  };

  const handleRemoveCustomAllergy = (target) => {
    const next = customAllergens.filter(a => a !== target);
    setCustomAllergens(next);
    try {
      localStorage.setItem(`synapse_custom_allergens_${sessionScopeKey}`, JSON.stringify(next));
    } catch (_) {}
  };

  // Step 7: Save Preferences from Local Dietary Vault to QR session + local storage
  const handleSaveLocalDietaryVault = async () => {
    const totalAllergensSelected = allergens.length + customAllergens.length;
    const hasDeclaredAllergies = totalAllergensSelected > 0;

    try {
      const verifyUrl = backendTargetUrl ? `${backendTargetUrl}/api/qr/allergy-verification` : '/api/qr/allergy-verification';
      const res = await fetch(verifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kioskId: effectiveKioskId,
          restaurant: restaurantParam,
          sessionId: qrSession?.sessionId,
          hasAllergies: hasDeclaredAllergies,
          allergens,
          customAllergens,
          preferences
        })
      });
      const data = await res.json();
      if (data?.session) setQrSession(data.session);
    } catch (_) {}

    try {
      localStorage.setItem('synapse_allergens', JSON.stringify(allergens));
      localStorage.setItem(`synapse_custom_allergens_${sessionScopeKey}`, JSON.stringify(customAllergens));
      localStorage.setItem('synapse_preferences', JSON.stringify(preferences));
      localStorage.setItem('synapse_onboarded', 'true');
    } catch (_) {}

    setAllergyStatus(hasDeclaredAllergies ? 'allergies_declared' : 'no_allergies_declared');
    setShowWelcomeScreen(false);
    setIsOnboarded(true);
    setDietaryConfirmToast(
      hasDeclaredAllergies
        ? `Saved ${totalAllergensSelected} allergen exclusion(s) & ${preferences.length} flavor preference(s).`
        : 'Preferences saved! Enjoy browsing the menu.'
    );
    setTimeout(() => setDietaryConfirmToast(''), 4500);
  };

  // Request notification + vibration permission proactively
  const requestAlertPermissions = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const result = await Notification.requestPermission();
      setNotifPermission(result);
    }
    // Trigger a test vibration so the browser unlocks haptics on mobile
    doVibrate([80, 60, 80]);
  }, []);

  // Stop the reminder vibration interval
  const stopVibReminder = useCallback(() => {
    if (vibReminderRef.current) {
      clearInterval(vibReminderRef.current);
      vibReminderRef.current = null;
    }
    if (navigator.vibrate) {
      try { navigator.vibrate(0); } catch (_) {} // cancel any ongoing vibration
    }
  }, []);

  // Continuous restaurant pager buzzer synthesizer (Web Audio API) + Hardware Vibration
  const startContinuousBuzzer = useCallback(() => {
    setIsBuzzing(true);
    setShowReadyCelebration(true);
    doVibrate([500, 150, 500, 150, 500, 200, 800]);

    if (buzzerTimerRef.current) clearInterval(buzzerTimerRef.current);

    const playBeepBurst = () => {
      // Repeat hardware vibration pattern with each alert cycle
      doVibrate([350, 100, 350]);

      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        if (!buzzerCtxRef.current || buzzerCtxRef.current.state === 'closed') {
          buzzerCtxRef.current = new AudioCtx();
        }
        const ctx = buzzerCtxRef.current;
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        const now = ctx.currentTime;
        // Two high-pitch aggressive buzzer beeps (pager alert tone)
        [0, 0.16, 0.32].forEach(offset => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(920, now + offset);
          osc.frequency.linearRampToValueAtTime(1260, now + offset + 0.08);
          gain.gain.setValueAtTime(0.38, now + offset);
          gain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.11);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + offset);
          osc.stop(now + offset + 0.12);
        });
      } catch (e) {
        console.warn('Buzzer audio failed:', e);
      }
    };

    playBeepBurst();
    buzzerTimerRef.current = setInterval(playBeepBurst, 950);
  }, []);

  const stopContinuousBuzzer = useCallback(() => {
    setIsBuzzing(false);
    if (buzzerTimerRef.current) {
      clearInterval(buzzerTimerRef.current);
      buzzerTimerRef.current = null;
    }
    if (buzzerCtxRef.current) {
      try { buzzerCtxRef.current.close(); } catch (e) {}
      buzzerCtxRef.current = null;
    }
    if (navigator.vibrate) {
      try { navigator.vibrate(0); } catch (e) {}
    }
    stopVibReminder();
  }, [stopVibReminder]);

  // Full-strength ORDER READY alert: buzzer + chime + vibration + browser notification
  const triggerReadyAlert = useCallback((order) => {
    startContinuousBuzzer();
    playReadyChime();

    // Browser push notification
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const n = new Notification('🔔 Your Order is Ready for Pickup!', {
          body: `Order #${order.orderId || ''} at ${restaurantMeta ? restaurantMeta.name : 'Umami Craft Fusion'} is freshly prepared and waiting for you.`,
          icon: '/favicon.svg',
          badge: '/favicon.svg',
          tag: `order-ready-${order.orderId}`,
          renotify: true,
          requireInteraction: true,
          silent: false
        });
        n.onclick = () => { window.focus(); n.close(); };
      } catch (e) {
        console.warn('Notification error:', e);
      }
    }

    if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen').catch(() => {});
    }
  }, [restaurantMeta, startContinuousBuzzer]);

  // Load menu items, drinks, and restaurant metadata dynamically with resilient fallback
  useEffect(() => {
    const restQuery = `?restaurant=${encodeURIComponent(restaurantParam)}`;
    const menuEndpoint = backendTargetUrl ? `${backendTargetUrl}/api/menu${restQuery}` : `/api/menu${restQuery}`;
    const drinksEndpoint = backendTargetUrl ? `${backendTargetUrl}/api/drinks${restQuery}` : `/api/drinks${restQuery}`;
    const restEndpoint = backendTargetUrl ? `${backendTargetUrl}/api/restaurant${restQuery}` : `/api/restaurant${restQuery}`;

    fetch(menuEndpoint)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMenuItems(data);
          localStorage.setItem('umami_admin_menu', JSON.stringify(data));
        }
      })
      .catch(err => {
        console.warn("Direct menu fetch error, trying relative fallback:", err);
        fetch('/api/menu')
          .then(r => r.json())
          .then(d => {
            if (Array.isArray(d)) {
              setMenuItems(d);
              localStorage.setItem('umami_admin_menu', JSON.stringify(d));
            }
          })
          .catch(e => console.error("Fallback menu fetch failed:", e));
      });

    fetch(drinksEndpoint)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setDrinks(data);
          localStorage.setItem('umami_drinks', JSON.stringify(data));
        }
      })
      .catch(err => {
        fetch('/api/drinks')
          .then(r => r.json())
          .then(d => {
            if (Array.isArray(d)) {
              setDrinks(d);
              localStorage.setItem('umami_drinks', JSON.stringify(d));
            }
          })
          .catch(e => console.error("Fallback drinks fetch failed:", e));
      });

    fetch(restEndpoint)
      .then(res => res.json())
      .then(data => setRestaurantMeta(data))
      .catch(err => {
        console.warn("Direct restaurant fetch error, trying relative fallback:", err);
        fetch('/api/restaurant')
          .then(r => r.json())
          .then(d => setRestaurantMeta(d))
          .catch(e => console.error("Fallback restaurant fetch failed:", e));
      });

    const promosEndpoint = backendTargetUrl ? `${backendTargetUrl}/api/promos` : '/api/promos';
    const fetchPromos = () => {
      fetch(promosEndpoint)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setPromos(data);
            try { localStorage.setItem('umami_promos', JSON.stringify(data)); } catch (_) {}
          }
        })
        .catch(() => {
          fetch('/api/promos')
            .then(r => r.json())
            .then(d => {
              if (Array.isArray(d)) {
                setPromos(d);
                try { localStorage.setItem('umami_promos', JSON.stringify(d)); } catch (_) {}
              }
            })
            .catch(() => {});
        });
    };

    fetchPromos();
    const promoSyncInterval = setInterval(fetchPromos, 3000);

    const handleCatalogSync = () => {
      try {
        const m = localStorage.getItem('umami_admin_menu');
        if (m) setMenuItems(JSON.parse(m));
        const d = localStorage.getItem('umami_drinks');
        if (d) setDrinks(JSON.parse(d));
        const p = localStorage.getItem('umami_promos');
        if (p) setPromos(JSON.parse(p));
      } catch (_) {}
    };

    window.addEventListener('umami_catalog_updated', handleCatalogSync);
    window.addEventListener('storage', handleCatalogSync);

    return () => {
      clearInterval(promoSyncInterval);
      window.removeEventListener('umami_catalog_updated', handleCatalogSync);
      window.removeEventListener('storage', handleCatalogSync);
    };
  }, [backendTargetUrl]);

  // Check for OpenNDS captive portal parameters in URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tok = params.get('tok');
    const gatewayaddress = params.get('gatewayaddress');
    const clientmac = params.get('clientmac');
    const redir = params.get('redir');

    if (tok && gatewayaddress) {
      setCaptiveParams({ tok, gatewayaddress, clientmac, redir });
    }
  }, []);

  // Remove any legacy 'mixmatch' entry from preferences and history
  useEffect(() => {
    setPreferences(prev => {
      const cleaned = prev.filter(p => String(p).toLowerCase() !== 'mixmatch');
      return cleaned.length !== prev.length ? cleaned : prev;
    });
    setHistory(prev => {
      const cleaned = prev.filter(t => String(t).toLowerCase() !== 'mixmatch');
      if (cleaned.length !== prev.length) {
        try { localStorage.setItem('synapse_order_history', JSON.stringify(cleaned)); } catch (_) {}
        return cleaned;
      }
      return prev;
    });
  }, []);

  // Sync state to localStorage on changes
  useEffect(() => {
    localStorage.setItem('synapse_allergens', JSON.stringify(allergens));
  }, [allergens]);

  useEffect(() => {
    localStorage.setItem('synapse_preferences', JSON.stringify(preferences));
  }, [preferences]);

  useEffect(() => {
    if (isOnboarded) {
      localStorage.setItem('synapse_onboarded', 'true');
    }
  }, [isOnboarded]);

  // When scanning a new kiosk session, if the previous order was already completed or ready, clear it
  useEffect(() => {
    if (kioskId && activeOrder && activeOrder.kioskId && activeOrder.kioskId !== kioskId) {
      if (activeOrder.status === 'Completed' || activeOrder.status === 'Order Ready') {
        localStorage.removeItem('synapse_active_order');
        setActiveOrder(null);
      }
    }
  }, [kioskId, activeOrder]);

  // Setup WebSocket connection targeting the specific restaurant port
  useEffect(() => {
    const socket = io(backendTargetUrl || undefined, {
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000
    });
    socketRef.current = socket;

      socket.on('connect', () => {
      setSocketConnected(true);
      console.log(`[Mobile] Connected to server (${backendTargetUrl || 'local proxy'}), joining session:`, effectiveKioskId);
      socket.emit('join-session', { kioskId: effectiveKioskId, role: 'mobile' });
      
      // Push current preferences if onboarded
      if (isOnboarded && effectiveKioskId) {
        socket.emit('project-preferences', { kioskId: effectiveKioskId, allergens, preferences });
      }
    });

    socket.on('order-confirmed', (confirmedOrder) => {
      console.log("[Mobile] Order confirmed by backend:", confirmedOrder);
      setActiveOrder(confirmedOrder);
      localStorage.setItem('synapse_active_order', JSON.stringify(confirmedOrder));
    });

    socket.on('order-status-updated', (data) => {
      console.log("[Mobile] Received order status update:", data);
      const isReadyStatus = data.status === 'Ready for Pickup' || data.status === 'Order Ready' || data.status === 'Ready';
      
      setActiveOrder(prev => {
        if (!prev) {
          // If no active order in state but this matches what's stored, restore it
          const stored = JSON.parse(localStorage.getItem('synapse_active_order') || 'null');
          const matchesStored = stored && ((stored.orderId && (stored.orderId === data.orderId || stored.orderId === data.id)) ||
                                           (stored.id && (stored.id === data.orderId || stored.id === data.id)));
          if (matchesStored) {
            const up = { ...stored, status: data.status, isBuzzing: isReadyStatus, busserName: data.busserName || stored.busserName, updatedAt: data.updatedAt };
            localStorage.setItem('synapse_active_order', JSON.stringify(up));
            if (isReadyStatus) triggerReadyAlert(up);
            return up;
          }
          return null;
        }

        const isMatch = (prev.orderId && (prev.orderId === data.orderId || prev.orderId === data.id)) ||
                        (prev.id && (prev.id === data.orderId || prev.id === data.id)) ||
                        (prev.kioskId && prev.kioskId === data.kioskId);

        if (isMatch) {
          const updated = { ...prev, status: data.status, isBuzzing: isReadyStatus, busserName: data.busserName || prev.busserName, updatedAt: data.updatedAt };
          localStorage.setItem('synapse_active_order', JSON.stringify(updated));

          if (isReadyStatus) {
            triggerReadyAlert(updated);
          }
          if (data.status === 'Out for Delivery') {
            if (navigator.vibrate) {
              try { navigator.vibrate([100, 50, 100]); } catch(e) {}
            }
          }
          return updated;
        }
        return prev;
      });
    });

    socket.on('initial-menu', (data) => {
      if (Array.isArray(data)) {
        setMenuItems(data);
        localStorage.setItem('umami_admin_menu', JSON.stringify(data));
      }
    });

    socket.on('menu-updated', (data) => {
      if (Array.isArray(data)) {
        setMenuItems(data);
        localStorage.setItem('umami_admin_menu', JSON.stringify(data));
      }
    });

    socket.on('initial-drinks', (data) => {
      if (Array.isArray(data)) {
        setDrinks(data);
        localStorage.setItem('umami_drinks', JSON.stringify(data));
      }
    });

    socket.on('drinks-updated', (data) => {
      if (Array.isArray(data)) {
        setDrinks(data);
        localStorage.setItem('umami_drinks', JSON.stringify(data));
      }
    });

    socket.on('promos-updated', (data) => {
      if (Array.isArray(data)) {
        setPromos(data);
        try { localStorage.setItem('umami_promos', JSON.stringify(data)); } catch (_) {}
      }
    });

    socket.on('initial-promos', (data) => {
      if (Array.isArray(data)) {
        setPromos(data);
        try { localStorage.setItem('umami_promos', JSON.stringify(data)); } catch (_) {}
      }
    });

    socket.on('item-availability-updated', (data) => {
      if (data && data.itemId) {
        setMenuItems(prev => prev.map(m => String(m.id) === String(data.itemId) ? { ...m, available: data.isAvailable, status: data.isAvailable ? 'Available' : 'Unavailable' } : m));
      }
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setSocketConnected(false);
    };
  }, [effectiveKioskId, isOnboarded, backendTargetUrl, triggerReadyAlert]);

  // Listen for local buzzer alerts and storage events across tabs
  useEffect(() => {
    const handleBuzzerTrigger = (e) => {
      console.log("[MobileView] Received buzzer alert event:", e.detail);
      const stored = JSON.parse(localStorage.getItem('synapse_active_order') || 'null') || {};
      triggerReadyAlert(stored);
      setActiveOrder(prev => {
        if (!prev) {
          return stored ? { ...stored, status: 'Ready for Pickup', isBuzzing: true } : null;
        }
        return { ...prev, status: 'Ready for Pickup', isBuzzing: true };
      });
    };

    const handleStorageEvent = (e) => {
      if (e.key === 'synapse_gadget_buzz' || e.key === 'synapse_active_order') {
        try {
          const active = JSON.parse(localStorage.getItem('synapse_active_order') || 'null');
          if (active) {
            const isReady = active.status === 'Ready for Pickup' || active.status === 'Order Ready' || active.status === 'Ready' || active.isBuzzing;
            if (isReady) {
              triggerReadyAlert(active);
              setActiveOrder(active);
            }
          }
        } catch (_) {}
      }
    };

    window.addEventListener('synapse_buzzer_alert', handleBuzzerTrigger);
    window.addEventListener('storage', handleStorageEvent);
    return () => {
      window.removeEventListener('synapse_buzzer_alert', handleBuzzerTrigger);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [triggerReadyAlert]);

  // Clean up vibration & buzzer on unmount
  useEffect(() => {
    return () => {
      stopVibReminder();
      stopContinuousBuzzer();
    };
  }, [stopVibReminder, stopContinuousBuzzer]);

  // Instantly push preferences to the socket room whenever preferences or allergens change
  useEffect(() => {
    if (socketRef.current && socketConnected && effectiveKioskId && isOnboarded) {
      console.log("[Mobile] Live pushing updated preferences to Kiosk:", { allergens, preferences });
      socketRef.current.emit('project-preferences', {
        kioskId: effectiveKioskId,
        allergens,
        preferences
      });
    }
  }, [allergens, preferences, socketConnected, effectiveKioskId, isOnboarded]);

  // Toggle handlers
  const handleAllergenToggle = (id) => {
    setAllergens(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handlePreferenceToggle = (id) => {
    setPreferences(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Combined Catalog: Food + Drinks + Combos + Mix & Match Deals
  const allCatalogItems = useMemo(() => {
    // 1. Food items (filter out drafts and archived products)
    const foods = (menuItems || [])
      .filter(item => !item.archived && item.status !== 'Draft' && item.status !== 'Archived')
      .map(item => {
        const isAvail = item.available !== undefined ? item.available : (item.status === 'Available');
        const stockLevel = item.stock !== undefined ? Number(item.stock) : 25;
        const allergensList = Array.isArray(item.allergens)
          ? item.allergens
          : (typeof item.allergens === 'string' && item.allergens !== 'None'
              ? item.allergens.toLowerCase().split(',').map(s => s.trim()).filter(Boolean)
              : []);
        const tagsList = Array.isArray(item.tags)
          ? item.tags
          : (typeof item.tags === 'string'
              ? item.tags.toLowerCase().split(',').map(s => s.trim()).filter(Boolean)
              : []);

        return {
          ...item,
          id: String(item.id),
          name: item.name,
          category: item.category || 'Appetizers',
          catalogType: 'food',
          price: Number(item.price) || 0,
          promoPrice: item.promoPrice && Number(item.promoPrice) > 0 ? Number(item.promoPrice) : null,
          available: isAvail && stockLevel > 0,
          isExplicitlyUnavailable: !isAvail,
          isOutOfStock: stockLevel <= 0,
          stock: stockLevel,
          allergens: allergensList,
          tags: tagsList,
          image: item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
          emoji: item.emoji || '🍽️'
        };
      });

    // 2. Drinks from drinks state (filter out drafts/archived)
    const rawDrinks = (drinks && drinks.length > 0) ? drinks : DEFAULT_DRINKS;
    const formattedDrinks = rawDrinks
      .filter(d => !d.archived && d.status !== 'Draft' && d.status !== 'Archived')
      .map(d => {
        const sizes = Array.isArray(d.sizes) && d.sizes.length > 0
          ? d.sizes
          : [{ name: 'Small', volume: '355 ml', price: d.price || 75, stock: 25 }];
        const basePrice = sizes[0].price;
        const isAvail = d.available !== undefined ? d.available : (d.status !== 'Unavailable');
        const allOutOfStock = sizes.every(s => (s.stock !== undefined && s.stock <= 0));
        const totalStock = sizes.reduce((sum, s) => sum + (s.stock || 0), 0);

        const allergensList = Array.isArray(d.allergens)
          ? d.allergens
          : (d.category === 'Milk Tea' ? ['dairy'] : []);
        const tagsList = Array.isArray(d.tags)
          ? d.tags
          : ['drinks', ...(d.category === 'Milk Tea' ? ['sweet'] : ['healthy'])];

        return {
          id: String(d.id || `DRK-${d.name.replace(/\s+/g, '')}`),
          sku: d.sku || d.id,
          name: d.name,
          description: d.description || 'Chilled refreshing artisanal beverage.',
          price: basePrice,
          promoPrice: d.promoPrice && Number(d.promoPrice) > 0 ? Number(d.promoPrice) : null,
          available: isAvail && !allOutOfStock,
          isExplicitlyUnavailable: !isAvail,
          isOutOfStock: allOutOfStock,
          stock: totalStock,
          sizes: sizes,
          addons: Array.isArray(d.addons) ? d.addons : (typeof d.addons === 'string' && d.addons ? d.addons.split(',').map(s => s.trim()) : []),
          allergens: allergensList,
          tags: tagsList,
          category: 'Drinks & Boba',
          drinkCategory: d.category || 'Beverage',
          catalogType: 'drink',
          emoji: d.emoji || '🧋',
          image: d.image || 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80'
        };
      });

    // 3. Combos from localStorage 'umami_combos' or default
    let storedCombos = [];
    try {
      const raw = localStorage.getItem('umami_combos');
      if (raw) storedCombos = JSON.parse(raw);
    } catch (e) {}
    if (!storedCombos || storedCombos.length === 0) {
      storedCombos = DEFAULT_COMBOS;
    }
    const formattedCombos = storedCombos.map(c => ({
      id: c.id || `CMB-${c.name.replace(/\s+/g, '')}`,
      name: c.name,
      description: `${c.main || 'Rice Bowl'} + ${c.side || 'Appetizer'} + ${c.drink || 'Drink'}`,
      price: Number(c.promoPrice) || Number(c.originalPrice) || 349,
      originalPrice: Number(c.originalPrice) || 450,
      available: true,
      allergens: c.allergens || ['gluten'],
      tags: ['combo', 'savory'],
      category: 'Combos & Value Meals',
      catalogType: 'combo',
      emoji: c.emoji || '🍱',
      image: c.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'
    }));

    // 4. Mix & Match Deals
    const mixMatchDeals = DEFAULT_MIX_MATCH.map(m => ({
      ...m,
      available: true,
      category: 'Mix & Match Deals',
      catalogType: 'mixmatch',
      allergens: m.allergens || [],
      tags: m.tags || []
    }));

    return [...foods, ...formattedDrinks, ...formattedCombos, ...mixMatchDeals];
  }, [menuItems, drinks]);

  // Helper to check if an item belongs to a category tab
  const matchesCategoryTab = useCallback((item, tabId) => {
    const catLower = String(item.category || '').toLowerCase();
    if (tabId === 'all') return true;
    if (tabId === 'appetizers') {
      return ['appetizers', 'starters'].includes(catLower);
    }
    if (tabId === 'mains') {
      return ['rice bowls', 'bowls & mains', 'mains', 'meals', 'burgers', 'chicken'].includes(catLower);
    }
    if (tabId === 'dimsum') {
      return ['dimsum & bites', 'dim sum & bites', 'dim sum', 'desserts', 'snacks', 'add-ons'].includes(catLower);
    }
    if (tabId === 'noodles') {
      return ['noodles', 'ramen'].includes(catLower);
    }
    if (tabId === 'drinks') {
      return item.catalogType === 'drink' || catLower === 'drinks & boba' || catLower === 'drinks';
    }
    if (tabId === 'combos') {
      return item.catalogType === 'combo' || catLower === 'combos & value meals' || catLower === 'combos';
    }
    if (tabId === 'mixmatch') {
      return item.catalogType === 'mixmatch' || catLower === 'mix & match deals' || catLower === 'mix & match';
    }
    return catLower === String(tabId || '').toLowerCase();
  }, []);

  // Filter items based on user excluded allergens (standard + custom), chosen category, and search query
  const safeItems = useMemo(() => {
    return allCatalogItems.filter(item => {
      // 1. Exclude if item contains any standard or custom allergen selected by user
      const hasStandardAllergen = item.allergens && item.allergens.some(a => allergens.includes(a));
      if (hasStandardAllergen) return false;

      if (customAllergens.length > 0) {
        const ingBlob = [
          ...(Array.isArray(item.allergens) ? item.allergens : []),
          item.ingredients || '',
          ...(Array.isArray(item.ingredientsList) ? item.ingredientsList.map(r => r.name || '') : [])
        ].join(' ').toLowerCase();
        const hasCustomMatch = customAllergens.some(ca => ingBlob.includes(ca.toLowerCase()));
        if (hasCustomMatch) return false;
      }

      // 2. Filter by category tab
      if (!matchesCategoryTab(item, selectedCategory)) return false;

      // 3. Search query filter (name, description, category, ingredients)
      if (catalogSearch && catalogSearch.trim()) {
        const q = catalogSearch.toLowerCase().trim();
        const inName = (item.name || '').toLowerCase().includes(q);
        const inDesc = (item.description || '').toLowerCase().includes(q);
        const inCat = (item.category || '').toLowerCase().includes(q);
        const inIng = (item.ingredients || '').toLowerCase().includes(q);
        const inIngList = Array.isArray(item.ingredientsList) && item.ingredientsList.some(ing => (ing.name || '').toLowerCase().includes(q));
        if (!inName && !inDesc && !inCat && !inIng && !inIngList) return false;
      }

      return true;
    });
  }, [allCatalogItems, allergens, selectedCategory, catalogSearch, matchesCategoryTab]);

  // Cart Helper Methods supporting both standard and customized items
  const handleAddToCart = (item, customDetails = null) => {
    if (!item.available && !customDetails) return;
    if (customDetails) {
      const addonSignature = (customDetails.addons || []).map(a => a.name || a).sort().join('|');
      const cartKey = `${item.id}-${customDetails.sizeName || 'std'}-${customDetails.spiceLevel || 'reg'}-${addonSignature}-${customDetails.specialNote || ''}`;
      setCart(prev => {
        const existing = prev[cartKey];
        const newQty = (existing?.quantity || 0) + (customDetails.qty || 1);
        const sizeLabel = customDetails.sizeName && customDetails.sizeName !== 'Standard Serving'
          ? ` (${customDetails.sizeName})`
          : '';
        return {
          ...prev,
          [cartKey]: {
            ...item,
            id: cartKey,
            originalId: item.id,
            name: `${item.name}${sizeLabel}`,
            price: customDetails.price,
            size: customDetails.sizeName,
            volume: customDetails.volume,
            spiceLevel: customDetails.spiceLevel || null,
            addons: customDetails.addons || [],
            specialNote: customDetails.specialNote || '',
            quantity: newQty
          }
        };
      });
    } else {
      setCart(prev => {
        const current = typeof prev[item.id] === 'number' ? prev[item.id] : (prev[item.id]?.quantity || 0);
        return {
          ...prev,
          [item.id]: current + 1
        };
      });
    }
  };

  const handleUpdateQuantity = (itemId, delta) => {
    setCart(prev => {
      const current = typeof prev[itemId] === 'number' ? prev[itemId] : (prev[itemId]?.quantity || 0);
      const next = current + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      if (typeof prev[itemId] === 'object') {
        return {
          ...prev,
          [itemId]: { ...prev[itemId], quantity: next }
        };
      }
      return { ...prev, [itemId]: next };
    });
  };

  const handleRemoveFromCart = (itemId) => {
    setCart(prev => {
      const copy = { ...prev };
      delete copy[itemId];
      return copy;
    });
  };

  const getCartItems = () => {
    return Object.entries(cart)
      .map(([id, val]) => {
        if (typeof val === 'object' && val !== null) {
          return val;
        }
        const item = allCatalogItems.find(m => String(m.id) === String(id));
        return item ? { ...item, quantity: val } : null;
      })
      .filter(Boolean);
  };

  const getCartTotal = () => {
    return getCartItems().reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
  };

  const getCartCount = () => {
    return getCartItems().reduce((sum, item) => sum + (item.quantity || 1), 0);
  };

  // Factory reset: clear all local storage
  const handleClearAllData = () => {
    localStorage.clear();
    setAllergens([]);
    setPreferences([]);
    setHistory([]);
    setCart({});
    setIsCartOpen(false);
    setIsOnboarded(false);
    setLastOrder(null);
    alert("Profile and order history reset to factory defaults.");
  };

  // Place multi-item order flow
  const handlePlaceOrder = (checkoutOpts = null) => {
    const cartItems = getCartItems();
    if (cartItems.length === 0) {
      alert("Please add at least one dish to your order.");
      return;
    }

    const chosenDiningOption = checkoutOpts?.diningOption || diningOption || 'Dine-In';
    const chosenPayment = checkoutOpts?.paymentMethod || 'GCash';
    const DIGITAL_WALLETS = ['gcash', 'maya', 'paypal', 'maribank', 'grab', 'shopee', 'gotyme', 'card', 'e-wallet'];
    const isDigitalPayment = DIGITAL_WALLETS.some(w => chosenPayment.toLowerCase().includes(w));

    // 1. Update local user history with ordered food item tags (cumulative weighting by quantity)
    const newHistory = [...history];
    const allOrderedTags = [];
    let totalPrice = 0;
    let discountAmount = 0;

    cartItems.forEach(cartItem => {
      totalPrice += cartItem.price * cartItem.quantity;
      for (let i = 0; i < cartItem.quantity; i++) {
        cartItem.tags.forEach(tag => {
          newHistory.push(tag);
          allOrderedTags.push(tag);
        });
      }
    });

    // Apply promo discount
    if (promoApplied) {
      const eligibleItems = promoApplied.applyToAll
        ? cartItems
        : cartItems.filter(ci => {
            return (promoApplied.applicableItems || []).some(appItem => {
              const cName = (ci.name || '').toLowerCase();
              const aName = (appItem || '').toLowerCase();
              return cName === aName || cName.startsWith(aName) || aName.startsWith(cName.split(' (')[0]);
            });
          });
      const eligibleSubtotal = eligibleItems.reduce((s, ci) => s + ci.price * ci.quantity, 0);
      if (promoApplied.discountType === 'percent') {
        discountAmount = Math.round(eligibleSubtotal * promoApplied.discountValue / 100);
      } else {
        discountAmount = Math.min(promoApplied.discountValue, eligibleSubtotal);
      }
      totalPrice = Math.max(0, totalPrice - discountAmount);

      // Redeem promo on backend server
      try {
        const redeemEndpoint = backendTargetUrl ? `${backendTargetUrl}/api/promos/redeem` : '/api/promos/redeem';
        fetch(redeemEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            promoCode: promoApplied.code,
            orderId: `ORD-${Date.now().toString().slice(-4)}`,
            discountAmount: discountAmount || 0
          })
        }).catch(err => console.warn('Redeem API fallback:', err));
      } catch (_) {}
    }

    localStorage.setItem('synapse_order_history', JSON.stringify(newHistory));
    setHistory(newHistory);

    // 2. Update active preferences based on ordered tags if not already present
    const validStandardTags = ['spicy', 'vegan', 'sweet', 'savory', 'healthy'];
    const newPreferences = [...preferences];
    let prefUpdated = false;
    allOrderedTags.forEach(tag => {
      if (validStandardTags.includes(tag) && !newPreferences.includes(tag)) {
        newPreferences.push(tag);
        prefUpdated = true;
      }
    });

    if (prefUpdated) {
      localStorage.setItem('synapse_preferences', JSON.stringify(newPreferences));
      setPreferences(newPreferences);
    }

    // 3. Store this order for quick repeat ordering
    const lastOrderPayload = {
      items: cartItems,
      itemCount: getCartCount(),
      totalPrice,
      primaryName: cartItems.length === 1 ? cartItems[0].name : `${cartItems[0].name} + ${cartItems.length - 1} more`,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('synapse_last_order', JSON.stringify(lastOrderPayload));
    setLastOrder(lastOrderPayload);

    // 4. Request notification permission early if default
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    const detectClientDevice = () => {
      const w = window.innerWidth;
      const ua = navigator.userAgent || '';
      if (/iPad|Tablet/i.test(ua) || (w >= 768 && w < 1024)) return 'Tablet';
      if (/Mobi|Android|iPhone/i.test(ua) || w < 768) return 'Mobile';
      return 'Desktop';
    };
    const currentDeviceType = detectClientDevice();

    const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const scannedTableParam = urlParams.get('tableId') || urlParams.get('table') || 'T-01';
    const effectiveTableNum = scannedTableParam.startsWith('T-')
      ? `Table ${scannedTableParam.replace('T-', '').replace(/^0+/, '')}`
      : scannedTableParam;

    const newActiveOrder = {
      orderId,
      kioskId: kioskId || 'MOBILE_01',
      tableNumber: effectiveTableNum,
      tableId: scannedTableParam,
      location: effectiveTableNum,
      customer: 'Kiosk Guest',
      diningOption: chosenDiningOption,
      payment: chosenPayment,
      paymentStatus: isDigitalPayment ? 'Pending' : 'Pending Counter Payment',
      isPaymentVerified: false,
      items: cartItems,
      itemCount: getCartCount(),
      totalPrice,
      total: totalPrice,
      discountAmount: discountAmount || 0,
      promoCode: promoApplied ? promoApplied.code : null,
      orderedTags: allOrderedTags,
      allergens,
      status: isDigitalPayment ? 'Pending Payment' : 'New',
      gadgetType: 'Customer Device',
      device: currentDeviceType,
      platform: currentDeviceType,
      createdAt: new Date().toISOString()
    };

    setActiveOrder(newActiveOrder);
    localStorage.setItem('synapse_active_order', JSON.stringify(newActiveOrder));

    // Also persist into umami_orders so KitchenView picks it up instantly
    try {
      const stored = JSON.parse(localStorage.getItem('umami_orders') || '[]');
      const updatedList = [newActiveOrder, ...stored.filter(o => o.orderId !== orderId)];
      localStorage.setItem('umami_orders', JSON.stringify(updatedList));
      window.dispatchEvent(new CustomEvent('umami_new_order', { detail: newActiveOrder }));
    } catch (e) {}

    // 5. Emit order to backend and kitchen
    if (socketRef.current && socketConnected) {
      socketRef.current.emit('place-order', {
        orderId,
        kioskId: kioskId || 'MOBILE_01',
        customer: 'Kiosk Guest',
        diningOption: chosenDiningOption,
        tableNumber: effectiveTableNum,
        tableId: scannedTableParam,
        location: effectiveTableNum,
        payment: chosenPayment,
        paymentStatus: isDigitalPayment ? 'Pending' : 'Pending Counter Payment',
        isPaymentVerified: false,
        device: currentDeviceType,
        platform: currentDeviceType,
        items: cartItems,
        itemCount: getCartCount(),
        totalPrice,
        orderedTags: allOrderedTags,
        allergens
      });
    }

    // For digital payments, trigger automated gateway webhook verification
    if (isDigitalPayment) {
      setTimeout(() => {
        fetch('/api/webhooks/simulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scenario: 'success',
            orderId,
            amount: totalPrice,
            gateway: chosenPayment.toLowerCase().includes('card') ? 'card' :
              chosenPayment.toLowerCase().includes('maya') ? 'maya' :
              chosenPayment.toLowerCase().includes('paypal') ? 'paypal' :
              chosenPayment.toLowerCase().includes('maribank') ? 'maribank' :
              chosenPayment.toLowerCase().includes('grab') ? 'grabpay' :
              chosenPayment.toLowerCase().includes('shopee') ? 'shopeepay' :
              chosenPayment.toLowerCase().includes('gotyme') ? 'gotyme' : 'gcash',
            paymentMethod: chosenPayment
          })
        }).catch(() => {});
      }, 1200);
    }

    // 6. Clear cart and promo locally
    setCart({});
    setPromoCode('');
    setPromoApplied(null);
    setPromoMsg({ text: '', ok: false });
    setIsCartOpen(false);
    setIsCheckoutOpen(false);
  };

  // Dismiss / complete active order session
  const handleDismissOrder = () => {
    stopContinuousBuzzer();
    stopVibReminder();            // cancel repeating haptic reminder
    localStorage.removeItem('synapse_active_order');
    setActiveOrder(null);
    setShowReadyCelebration(false);
    if (typeof onResetSession === 'function') {
      onResetSession();
    }
  };

  // Repeat Last Order handler
  const handleRepeatLastOrder = () => {
    if (!lastOrder) return;
    const newCart = {};
    if (Array.isArray(lastOrder.items) && lastOrder.items.length > 0) {
      lastOrder.items.forEach(item => {
        newCart[item.id] = item.quantity || 1;
      });
    } else if (lastOrder.id) {
      newCart[lastOrder.id] = 1;
    }
    setCart(newCart);
    setIsCartOpen(true);
  };

  // Simple taste profiling analytics
  const tagCounts = history.reduce((acc, tag) => {
    if (String(tag).toLowerCase() === 'mixmatch') return acc;
    acc[tag] = (acc[tag] || 0) + 1;
    return acc;
  }, {});

  const cartItemsList = getCartItems();
  const totalCartCount = getCartCount();
  const totalCartPrice = getCartTotal();

  // 5-Second Cycling Customer-Facing Promotional Banner Carousel Component
  const renderPromoBannerCarousel = () => {
    const expiredAlertElement = expiredPromoUrlAlert ? (
      <div
        id="expired-link-alert-banner"
        style={{
          background: '#fef2f2',
          border: '1.5px solid #fecaca',
          borderRadius: '14px',
          padding: '12px 14px',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 2px 8px rgba(220, 38, 38, 0.08)'
        }}
      >
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: '#fee2e2',
          color: '#dc2626',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <XCircle size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#991b1b' }}>
            Promotion Code Expired
          </div>
          <div style={{ fontSize: '11px', color: '#b91c1c', marginTop: '2px', lineHeight: 1.3 }}>
            {expiredPromoUrlAlert.message || `Code "${expiredPromoUrlAlert.code}" is no longer valid.`}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setExpiredPromoUrlAlert(null)}
          style={{ background: 'none', border: 'none', color: '#991b1b', cursor: 'pointer', padding: '4px' }}
        >
          <X size={16} />
        </button>
      </div>
    ) : null;

    if (!activePromos || activePromos.length === 0) return expiredAlertElement;
    const currentPromo = activePromos[activePromoIndex % activePromos.length];
    if (!currentPromo) return expiredAlertElement;

    const discountBadge = currentPromo.discountType === 'percent'
      ? `${currentPromo.discountValue}% OFF`
      : `₱${currentPromo.discountValue} OFF`;

    const bannerImgSrc = currentPromo.bannerImage || currentPromo.imageUrl || currentPromo.image || '/ramen_promo_banner.png';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        {expiredAlertElement}
        <div
          className="customer-promo-carousel"
        onMouseEnter={() => setIsPromoPaused(true)}
        onMouseLeave={() => setIsPromoPaused(false)}
        onTouchStart={() => setIsPromoPaused(true)}
        onTouchEnd={() => setIsPromoPaused(false)}
        style={{
          position: 'relative',
          borderRadius: '16px',
          overflow: 'hidden',
          marginBottom: '14px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.22)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          background: currentPromo.bannerBg || '#1c1917',
          transition: 'all 0.4s ease'
        }}
      >
        {/* Background Banner Image with Ambient Depth */}
        <div style={{ position: 'relative', width: '100%', height: '145px', overflow: 'hidden' }}>
          <img
            src={bannerImgSrc}
            alt={currentPromo.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              transition: 'transform 0.6s ease'
            }}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/ramen_promo_banner.png';
            }}
          />
          {/* Deep Multi-layer Gradient Overlay for Razor-Sharp Readability */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(15,23,42,0.3) 0%, rgba(15,23,42,0.7) 50%, rgba(15,23,42,0.96) 100%)'
            }}
          />

          {/* Top Row Badges */}
          <div
            style={{
              position: 'absolute',
              top: '10px',
              left: '12px',
              right: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              zIndex: 2
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                padding: '3px 9px',
                borderRadius: '999px',
                fontSize: '10px',
                fontWeight: '800',
                color: '#fff',
                letterSpacing: '0.04em'
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#f97316',
                  display: 'inline-block',
                  boxShadow: '0 0 6px #f97316'
                }}
              />
              <span>SPECIAL PROMO</span>
            </div>

            <div
              style={{
                background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)',
                color: '#ffffff',
                fontWeight: '900',
                fontSize: '12px',
                padding: '4px 10px',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(220, 38, 38, 0.4)',
                letterSpacing: '0.03em',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Sparkles size={11} />
              <span>{discountBadge}</span>
            </div>
          </div>

          {/* Bottom Title & Tap-to-Apply Action */}
          <div
            style={{
              position: 'absolute',
              bottom: '12px',
              left: '12px',
              right: '12px',
              zIndex: 2
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '8px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4
                  style={{
                    margin: 0,
                    fontSize: '15px',
                    fontWeight: '800',
                    color: '#ffffff',
                    lineHeight: '1.2',
                    textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {currentPromo.bannerTitle || currentPromo.name}
                </h4>
                <p
                  style={{
                    margin: '3px 0 0 0',
                    fontSize: '11px',
                    color: 'rgba(255, 255, 255, 0.85)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    textShadow: '0 1px 3px rgba(0,0,0,0.8)'
                  }}
                >
                  {currentPromo.applyToAll
                    ? '✨ Valid on all dishes & drinks'
                    : `🎯 Applies to: ${(currentPromo.applicableItems || []).join(', ')}`}
                </p>
              </div>

              {/* Tap to Apply Promo Code Pill */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleBannerPromoClick(currentPromo);
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  color: '#991b1b',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: '0 3px 10px rgba(0,0,0,0.3)',
                  flexShrink: 0,
                  transition: 'transform 0.15s ease'
                }}
                title={`Apply promo code ${currentPromo.code}`}
              >
                <Tag size={12} />
                <span>{currentPromo.code}</span>
              </button>
            </div>
          </div>

          {/* Navigation Arrows for Multiple Active Promos */}
          {activePromos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActivePromoIndex((prev) => (prev - 1 + activePromos.length) % activePromos.length);
                }}
                style={{
                  position: 'absolute',
                  left: '6px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(0, 0, 0, 0.45)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#fff',
                  borderRadius: '50%',
                  width: '26px',
                  height: '26px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 3,
                  padding: 0
                }}
                aria-label="Previous promotion"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActivePromoIndex((prev) => (prev + 1) % activePromos.length);
                }}
                style={{
                  position: 'absolute',
                  right: '6px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(0, 0, 0, 0.45)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#fff',
                  borderRadius: '50%',
                  width: '26px',
                  height: '26px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 3,
                  padding: 0
                }}
                aria-label="Next promotion"
              >
                <ChevronRight size={14} />
              </button>
            </>
          )}
        </div>

        {/* 5-Second Carousel Indicator Dots */}
        {activePromos.length > 1 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 0',
              background: 'rgba(15, 23, 42, 0.95)'
            }}
          >
            {activePromos.map((p, idx) => {
              const isActive = (activePromoIndex % activePromos.length) === idx;
              return (
                <button
                  key={p.id || idx}
                  type="button"
                  onClick={() => setActivePromoIndex(idx)}
                  style={{
                    height: '5px',
                    width: isActive ? '22px' : '6px',
                    borderRadius: '999px',
                    background: isActive ? '#f97316' : 'rgba(255, 255, 255, 0.3)',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  title={`Promotion: ${p.name || p.code}`}
                />
              );
            })}
          </div>
        )}
        </div>
      </div>
    );
  };

  // The inner phone content (shared between desktop phone frame and plain mobile wrapper)
  const phoneContent = (
    <div className="mobile-wrapper fade-in" style={{ position: 'relative' }}>
      {/* Toast Notification when Promo is Copied/Applied */}
      {promoToast && (
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '16px',
            right: '16px',
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.95)',
            color: '#ffffff',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(249, 115, 22, 0.5)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            padding: '10px 16px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={16} color="#f97316" />
            <span>{promoToast}</span>
          </div>
          <button
            onClick={() => setPromoToast(null)}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', padding: '2px' }}
          >
            <X size={14} />
          </button>
        </div>
      )}
      {/* Universal Coaster Pager Buzzer Overlay whenever isBuzzing is active */}
      {isBuzzing && (
        <div className="coaster-pager-overlay">
          <div className="coaster-pager-card">
            <div className="coaster-pager-leds">
              <span className="pager-led-dot red-blink"></span>
              <span className="pager-led-dot red-blink"></span>
              <span className="pager-led-dot red-blink"></span>
              <span className="pager-led-dot red-blink"></span>
            </div>
            
            <div className="coaster-pager-circle">
              <span className="coaster-pager-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BellRing size={36} color="#dc2626" />
              </span>
              <div className="coaster-pager-num">
                {activeOrder ? `#${activeOrder.orderId}` : 'ORDER READY'}
              </div>
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#1f2937', margin: '0 0 6px 0' }}>
              Gadget Buzzer Active!
            </h3>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 16px 0', lineHeight: 1.5 }}>
              Your order is ready at the counter! Pick up your food &amp; drinks now.
            </p>

            <button
              onClick={() => {
                stopContinuousBuzzer();
                setShowReadyCelebration(false);
              }}
              style={{
                width: '100%',
                padding: '12px 20px',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)'
              }}
            >
              <VolumeX size={16} />
              <span>Silence Buzzer &amp; Claim Order</span>
            </button>
          </div>
        </div>
      )}

      {/* App Header — shown only on tracking / menu views, not on onboarding */}
      {(activeOrder || (kioskId && isOnboarded)) && (
        <header style={{ textAlign: 'center', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid var(--border-glass)' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--accent-teal)', marginBottom: '6px' }}>
            <Shield size={20} />
            <span style={{ fontWeight: '800', letterSpacing: '0.05em', fontSize: '14px' }}>UMAMI CRAFT FUSION ID</span>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: '700' }}>Local Dietary Vault</h2>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>🔒 ALL DATA ENCRYPTED IN LOCALSTORAGE ONLY</p>
        </header>
      )}

      {/* VIEW 3: LIVE ORDER TRACKING SCREEN WITH 3-STEP PROGRESS BAR */}
      {activeOrder ? (
        <div className="order-tracker-view fade-in">
          {/* Tracking Header */}
          <div className="glass-card" style={{ padding: '16px', marginBottom: '16px', background: 'rgba(45, 106, 79, 0.04)', borderColor: 'rgba(45, 106, 79, 0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--accent-green)', fontWeight: '700', letterSpacing: '0.05em' }}>
                  {restaurantMeta ? `${restaurantMeta.name} • Live Tracker` : 'Kitchen Live Tracker'}
                </span>
                <h3 style={{ fontSize: '18px', fontWeight: '800', marginTop: '2px' }}>
                  Order #{activeOrder.orderId}
                </h3>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {activeOrder.kioskId && activeOrder.kioskId.startsWith('K-') ? `Kiosk #${activeOrder.kioskId}` : `Table #${activeOrder.kioskId}`} • Placed {new Date(activeOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowServiceModal(true)}
                  title="Call Server / Request Table Service Assistance"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '5px 10px',
                    borderRadius: '20px',
                    background: 'rgba(245, 158, 11, 0.15)',
                    border: '1.5px solid rgba(245, 158, 11, 0.5)',
                    color: '#d97706',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Bell size={12} color="#d97706" />
                  <span>Call Server</span>
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className={`pulse-indicator ${socketConnected ? 'active' : 'disconnected'}`}></span>
                  <span style={{ fontSize: '11px', color: socketConnected ? 'var(--text-secondary)' : 'var(--accent-danger)', fontWeight: '600' }}>
                    {socketConnected ? 'Live' : 'Connecting'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Proactive Notification Permission Banner */}
          {notifPermission !== 'granted' && notifPermission !== 'unavailable' && (
            <div
              onClick={requestAlertPermissions}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                background: 'var(--brand-gradient)',
                borderRadius: '16px', padding: '12px 16px', marginBottom: '14px',
                cursor: 'pointer', boxShadow: 'var(--glow-brand)',
                color: 'white'
              }}
            >
              <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '50%', padding: '8px', flexShrink: 0 }}>
                <Bell size={18} color="white" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: '13px', color: 'white' }}>Enable Ready Alert Haptics</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.9)', marginTop: '2px' }}>
                  Tap to allow phone vibration so we alert you the second your food is ready.
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <BellRing size={20} color="white" />
              </div>
            </div>
          )}

          {/* Foodpanda-Style Live Tracking Stepper Card */}
          <div className="fp-tracking-card" style={{ marginBottom: '16px' }}>
            <div className="fp-tracking-header">
              <div>
                <div className="fp-tracking-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={16} color="var(--primary-orange)" />
                  <span>Live Order Tracking</span>
                </div>
                <div className="fp-tracking-subtitle">
                  Order #{activeOrder.orderId} • {restaurantMeta?.name || 'Restaurant'}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700 }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: socketConnected ? 'var(--accent-green)' : '#EF4444', display: 'inline-block', boxShadow: socketConnected ? '0 0 8px rgba(16,185,129,0.5)' : 'none' }}></span>
                <span style={{ color: socketConnected ? 'var(--accent-green)' : '#EF4444' }}>
                  {socketConnected ? 'Live' : 'Connecting...'}
                </span>
              </div>
            </div>

            {/* 4-Step Foodpanda Stepper */}
            <div className="fp-stepper-container">
              <div className="fp-stepper-line-bg"></div>
              <div className="fp-stepper-line-fill" style={{
                width:
                  (activeOrder.status === 'Out for Delivery' || activeOrder.status === 'Delivered' || activeOrder.status === 'Completed') ? 'calc(100% - 60px)' :
                  (activeOrder.status === 'Order Ready' || activeOrder.status === 'Ready for Pickup' || activeOrder.status === 'Ready') ? 'calc(66% - 20px)' :
                  (activeOrder.status === 'Preparing') ? 'calc(33% - 20px)' : '0%'
              }}></div>

              {/* Step 1: Order Placed */}
              <div className={`fp-step-item completed`}>
                <div className="fp-step-circle">✓</div>
                <span className="fp-step-label">Order Placed</span>
              </div>

              {/* Step 2: Preparing */}
              <div className={`fp-step-item ${(activeOrder.status === 'Preparing') ? 'active' : (activeOrder.status === 'Order Ready' || activeOrder.status === 'Ready for Pickup' || activeOrder.status === 'Ready' || activeOrder.status === 'Out for Delivery' || activeOrder.status === 'Completed' ? 'completed' : '')}`}>
                <div className="fp-step-circle"><ChefHat size={14} /></div>
                <span className="fp-step-label">Preparing</span>
              </div>

              {/* Step 3: Order Ready */}
              <div className={`fp-step-item ${(activeOrder.status === 'Order Ready' || activeOrder.status === 'Ready for Pickup' || activeOrder.status === 'Ready') ? 'active' : (activeOrder.status === 'Out for Delivery' || activeOrder.status === 'Completed' ? 'completed' : '')}`}>
                <div className="fp-step-circle"><Bell size={14} /></div>
                <span className="fp-step-label">Ready</span>
              </div>

              {/* Step 4: Delivered */}
              <div className={`fp-step-item ${activeOrder.status === 'Out for Delivery' ? 'active' : (activeOrder.status === 'Completed' ? 'completed' : '')}`}>
                <div className="fp-step-circle"><Truck size={14} /></div>
                <span className="fp-step-label">Delivered</span>
              </div>
            </div>

            {/* Dynamic Status Detail */}
            <div className={`order-status-message-box status-${activeOrder.status ? activeOrder.status.toLowerCase().replace(/\s+/g, '-') : 'received'}`} style={{ marginTop: '16px' }}>
              {(activeOrder.status === 'Order Received' || activeOrder.status === 'New') && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Receipt size={24} color="var(--text-secondary)" />
                  <div>
                    <h5 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>Order Received by Kitchen</h5>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Your meal has been forwarded to the chefs and placed in the preparation queue.
                    </p>
                  </div>
                </div>
              )}

              {(activeOrder.status === 'Preparing') && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <ChefHat size={24} color="#B45309" />
                  <div>
                    <h5 style={{ fontSize: '14px', fontWeight: '800', color: '#B45309' }}>Chefs Are Preparing Your Meal!</h5>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Your personalized order is being prepared in the kitchen right now. Almost there!
                    </p>
                  </div>
                </div>
              )}

              {(activeOrder.status === 'Order Ready' || activeOrder.status === 'Ready for Pickup' || activeOrder.status === 'Ready') && (
                <div className="fp-busser-alert-banner">
                  <BellRing size={24} color="var(--primary-orange)" />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '14px' }}>Order Ready for Pickup!</div>
                    <div style={{ fontSize: '12px', opacity: 0.85, marginTop: '2px' }}>
                      Your food is freshly prepared and waiting at the counter. Please collect your tray!
                    </div>
                  </div>
                </div>
              )}

              {activeOrder.status === 'Out for Delivery' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '12px', padding: '14px' }}>
                  <Truck size={24} color="var(--accent-blue)" />
                  <div>
                    <h5 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--accent-blue)' }}>
                      Food Runner On the Way!
                      {activeOrder.busserName && <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-secondary)', marginLeft: '6px' }}>({activeOrder.busserName})</span>}
                    </h5>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Your order is being delivered to your table right now. Look out for your runner!
                    </p>
                  </div>
                </div>
              )}

              {activeOrder.status === 'Completed' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '12px', padding: '14px' }}>
                  <CheckCircle size={24} color="var(--accent-green)" />
                  <div>
                    <h5 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--accent-green)' }}>Order Delivered & Completed!</h5>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Enjoy your meal! Thank you for dining with us.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>


          {/* Itemized Order Receipt Details */}
          <div className="glass-card" style={{ padding: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--border-glass)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <PesoReceipt size={16} color="var(--text-muted)" />
                <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Receipt Details
                </span>
              </div>
              <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--accent-red)' }}>
                ₱{(activeOrder.totalPrice || 0).toFixed(2)}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
              {(activeOrder.items || (activeOrder.item ? [activeOrder.item] : [])).map((item, idx) => {
                const itemImg = item.image || allCatalogItems.find(m => String(m.id) === String(item.originalId || item.id))?.image;
                return (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: '700', color: 'var(--text-primary)', minWidth: '18px' }}>{item.quantity || 1}x</span>
                      <div style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        flexShrink: 0,
                        background: 'rgba(0,0,0,0.04)',
                        border: '1px solid rgba(0,0,0,0.06)'
                      }}>
                        {itemImg ? (
                          <img
                            src={itemImg}
                            alt={item.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={e => { e.currentTarget.style.display = 'none'; }}
                          />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(217, 75, 43, 0.08)', color: 'var(--brand-primary, #D94B2B)' }}>
                            <UtensilsCrossed size={12} />
                          </div>
                        )}
                      </div>
                      <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{item.name}</span>
                    </div>
                    <span style={{ fontWeight: '700' }}>
                      ₱{((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>

            {activeOrder.allergens && activeOrder.allergens.length > 0 && (
              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed var(--border-glass)', fontSize: '11px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>⚠️ Excluded allergens:</span>
                <strong>{activeOrder.allergens.map(a => a.toUpperCase()).join(', ')}</strong>
              </div>
            )}
          </div>

          {/* Full-Screen Ready Celebration Overlay */}
          {showReadyCelebration && (
            <div style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(10, 5, 20, 0.92)',
              backdropFilter: 'blur(12px)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              animation: 'fade-in 0.3s ease'
            }}>
              {/* Pulsing ring */}
              <div style={{ position: 'relative', marginBottom: '28px' }}>
                <div style={{
                  width: '120px', height: '120px', borderRadius: '50%',
                  background: 'var(--brand-gradient)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 0 0 rgba(228,87,41,0.7)',
                  animation: 'vibrate-ring 0.6s ease-in-out 3, pulse-ring 2.5s ease-in-out 0.6s infinite'
                }}>
                  <BellRing size={52} color="#fff" />
                </div>
              </div>

              <h2 style={{
                fontSize: '28px', fontWeight: 900, color: 'white',
                textAlign: 'center', marginBottom: '10px', letterSpacing: '-0.5px'
              }}>
                Your Meal is Ready!
              </h2>
              <p style={{
                fontSize: '15px', color: 'rgba(255,255,255,0.75)',
                textAlign: 'center', lineHeight: '1.6',
                maxWidth: '280px', marginBottom: '8px'
              }}>
                Order <strong style={{ color: 'white' }}>#{activeOrder.orderId}</strong><br/>
                is freshly prepared and waiting for you.
              </p>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '36px', textAlign: 'center' }}>
                {restaurantMeta?.name || 'Our kitchen'} • Ready at the counter
              </p>

              <button
                onClick={() => {
                  stopVibReminder();
                  setShowReadyCelebration(false);
                }}
                style={{
                  background: 'var(--brand-gradient)',
                  color: 'white', border: 'none', borderRadius: '18px',
                  padding: '18px 48px', fontSize: '16px', fontWeight: 800,
                  cursor: 'pointer', letterSpacing: '0.3px',
                  boxShadow: '0 8px 32px rgba(228,87,41,0.4)',
                  width: '100%', maxWidth: '320px',
                  marginBottom: '14px'
                }}
              >
                I'm On My Way
              </button>

              <button
                onClick={() => setShowReadyCelebration(false)}
                style={{
                  background: 'transparent', color: 'rgba(255,255,255,0.5)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '12px', padding: '12px 32px',
                  fontSize: '13px', cursor: 'pointer'
                }}
              >
                Dismiss — Keep Tracking
              </button>
            </div>
          )}

          {/* Persistent Ready Banner (visible below modal when not in celebration mode) */}
          {(activeOrder.status === 'Order Ready' || activeOrder.status === 'Ready for Pickup' || activeOrder.status === 'Ready') && !showReadyCelebration && (
            <div
              onClick={() => setShowReadyCelebration(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                background: 'var(--brand-gradient)',
                borderRadius: '16px', padding: '14px 16px', marginBottom: '16px',
                cursor: 'pointer', boxShadow: '0 4px 20px rgba(228,87,41,0.4)',
                animation: 'pulse-ring 1.8s ease-in-out infinite'
              }}
            >
              <BellRing size={22} color="white" style={{ flexShrink: 0, animation: 'bell-shake 0.5s ease-in-out infinite' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 900, fontSize: '14px', color: 'white' }}>Your Order is Ready!</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)', marginTop: '2px' }}>
                  Tap to view — please collect from the counter
                </div>
              </div>
              <ChevronUp size={20} color="white" />
            </div>
          )}


          {/* Action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
            {(activeOrder.status === 'Order Ready' || activeOrder.status === 'Ready for Pickup' || activeOrder.status === 'Ready' || activeOrder.status === 'Completed') ? (
              <button
                onClick={handleDismissOrder}
                className="btn-primary"
                style={{ width: '100%', padding: '14px', borderRadius: '12px', fontSize: '14px', fontWeight: '800' }}
              >
                ✓ Finish & Clear Order
              </button>
            ) : (
              <button
                onClick={handleDismissOrder}
                className="btn-secondary"
                style={{ width: '100%', padding: '10px', borderRadius: '10px', fontSize: '12px' }}
              >
                Close Tracking & Return
              </button>
            )}
          </div>
        </div>
      ) : isOnboarded ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
          <div className="glass-card mv-menu-header-bar">
            <div className="mv-menu-header-inner">
              <div className="mv-menu-header-info">
                <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--accent-green)', fontWeight: '700', letterSpacing: '0.05em' }}>
                  {restaurantMeta ? `${restaurantMeta.cuisine} • Ordering Live` : 'Personalized Dining Live'}
                </span>
                <h4 style={{ fontSize: '15px', fontWeight: '700', margin: '2px 0 0 0' }}>
                  {restaurantMeta ? restaurantMeta.name : 'Umami Craft Fusion'}
                </h4>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', marginBottom: 0 }}>
                  {kioskId ? `Terminal #${kioskId}` : 'Guest Express Ordering • Table 04'}
                </p>
              </div>
              <div className="mv-menu-header-controls">
                <button
                  type="button"
                  onClick={() => setDiningOption(prev => (prev === 'Dine-In' ? 'Takeout' : 'Dine-In'))}
                  style={{
                    background: 'rgba(5, 150, 105, 0.1)',
                    border: '1.5px solid rgba(5, 150, 105, 0.35)',
                    color: '#059669',
                    padding: '5px 10px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    whiteSpace: 'nowrap'
                  }}
                  title="Tap to switch between Dine-In and Takeout"
                >
                  {diningOption === 'Takeout' ? <ShoppingBag size={12} /> : <Utensils size={12} />}
                  <span>{diningOption}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowServiceModal(true)}
                  style={{
                    background: 'rgba(245, 158, 11, 0.15)',
                    border: '1.5px solid rgba(245, 158, 11, 0.5)',
                    color: '#d97706',
                    padding: '5px 10px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    whiteSpace: 'nowrap'
                  }}
                  title="Call Server / Request Table Service Assistance"
                >
                  <Bell size={12} color="#d97706" />
                  <span>Call Server</span>
                </button>
                <button
                  onClick={() => {
                    setShowWelcomeScreen(false);
                    setIsOnboarded(false);
                  }}
                  style={{
                    background: 'rgba(228, 87, 41, 0.1)',
                    border: '1px solid rgba(228, 87, 41, 0.3)',
                    color: '#C24522',
                    padding: '5px 10px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    whiteSpace: 'nowrap'
                  }}
                  title="Adjust Dietary Allergens & Preferences"
                >
                  <Settings size={12} />
                  <span>Edit Diet</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowWelcomeScreen(true);
                    setIsOnboarded(false);
                  }}
                  style={{
                    background: 'rgba(28, 25, 23, 0.06)',
                    border: '1px solid rgba(28, 25, 23, 0.16)',
                    color: '#44403C',
                    padding: '5px 10px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                  title="Return to Kiosk Welcome Screen"
                >
                  Start Over
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                  <span className={`pulse-indicator ${socketConnected ? 'active' : 'disconnected'}`}></span>
                  <span style={{ fontSize: '11px', color: socketConnected ? 'var(--text-secondary)' : 'var(--accent-danger)' }}>
                    {socketConnected ? 'Live' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Edit settings in connected view (with Hide & Unhide Toggle) */}
          <div className="mv-dietary-filters-panel" style={{ background: 'rgba(255, 255, 255, 0.65)', border: '1px solid rgba(220, 200, 180, 0.45)', borderRadius: '14px', padding: '10px 12px', transition: 'all 0.2s ease' }}>
            <div
              onClick={toggleDietaryFilters}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                userSelect: 'none',
                padding: '2px 0',
                gap: '8px'
              }}
              role="button"
              tabIndex={0}
              title={showDietaryFilters ? 'Tap to hide dietary filters' : 'Tap to unhide dietary filters'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flexWrap: 'wrap' }}>
                <h5 style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', margin: 0, letterSpacing: '0.04em' }}>
                  Active Dietary Filters (Syncs Live)
                </h5>
                {(allergens.length > 0 || preferences.filter(p => String(p).toLowerCase() !== 'mixmatch').length > 0) && (
                  <span style={{
                    fontSize: '10px',
                    fontWeight: '800',
                    padding: '2px 7px',
                    borderRadius: '999px',
                    background: 'rgba(217, 75, 43, 0.12)',
                    color: 'var(--brand-primary, #D94B2B)',
                    whiteSpace: 'nowrap'
                  }}>
                    {allergens.length + preferences.filter(p => String(p).toLowerCase() !== 'mixmatch').length} active
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleDietaryFilters();
                }}
                style={{
                  background: showDietaryFilters ? 'rgba(44, 26, 17, 0.05)' : 'rgba(217, 75, 43, 0.1)',
                  border: `1px solid ${showDietaryFilters ? 'rgba(44, 26, 17, 0.12)' : 'rgba(217, 75, 43, 0.25)'}`,
                  color: showDietaryFilters ? 'var(--text-secondary)' : 'var(--brand-primary, #D94B2B)',
                  padding: '4px 10px',
                  borderRadius: '999px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                {showDietaryFilters ? (
                  <>
                    <EyeOff size={12} />
                    <span>Hide</span>
                    <ChevronUp size={13} />
                  </>
                ) : (
                  <>
                    <Eye size={12} />
                    <span>Unhide</span>
                    <ChevronDown size={13} />
                  </>
                )}
              </button>
            </div>

            {/* When Unhidden: Render Full Allergen and Flavor Filter Buttons */}
            {showDietaryFilters ? (
              <div style={{ marginTop: '10px', animation: 'fadeIn 0.2s ease-out' }}>
                {/* Allergen Filters */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  {activeAllergenOptions.map(opt => {
                    const checked = allergens.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleAllergenToggle(opt.id)}
                        style={{
                          fontSize: '11px',
                          padding: '5px 10px',
                          borderRadius: '8px',
                          background: checked ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-surface-elevated)',
                          color: checked ? '#fca5a5' : 'var(--text-secondary)',
                          border: `1px solid ${checked ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-glass)'}`,
                          fontWeight: '600',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {opt.image ? (
                          <img src={opt.image} alt={opt.label} style={{ width: '13px', height: '13px', objectFit: 'contain', borderRadius: '3px' }} />
                        ) : (
                          <span>{opt.emoji}</span>
                        )}
                        Excl. {opt.label}
                      </button>
                    );
                  })}
                </div>

                {/* Flavor Preferences */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {activePreferenceOptions.map(opt => {
                    const checked = preferences.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        onClick={() => handlePreferenceToggle(opt.id)}
                        style={{
                          fontSize: '11px',
                          padding: '5px 10px',
                          borderRadius: '8px',
                          background: checked ? 'rgba(45, 106, 79, 0.12)' : 'var(--bg-surface-elevated)',
                          color: checked ? 'var(--accent-green)' : 'var(--text-secondary)',
                          border: `1px solid ${checked ? 'rgba(45, 106, 79, 0.25)' : 'var(--border-glass)'}`,
                          fontWeight: '600',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {opt.image ? (
                          <img src={opt.image} alt={opt.label} style={{ width: '13px', height: '13px', objectFit: 'contain', borderRadius: '3px' }} />
                        ) : (
                          <span>{opt.emoji}</span>
                        )}
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (allergens.length > 0 || preferences.filter(p => String(p).toLowerCase() !== 'mixmatch').length > 0) ? (
              /* When Hidden but filters are active: Show a clean compact 1-line summary */
              <div 
                onClick={toggleDietaryFilters}
                style={{ 
                  marginTop: '6px', 
                  fontSize: '11px', 
                  color: 'var(--text-secondary)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  flexWrap: 'wrap', 
                  cursor: 'pointer' 
                }}
              >
                <span style={{ color: 'var(--text-muted)' }}>Filtering for:</span>
                {allergens.map(a => (
                  <span key={a} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '700' }}>
                    Excl. {a}
                  </span>
                ))}
                {preferences.filter(p => String(p).toLowerCase() !== 'mixmatch').map(p => (
                  <span key={p} style={{ background: 'rgba(45, 106, 79, 0.1)', color: '#059669', padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '700' }}>
                    {p}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          {/* 5-Second Auto-Cycling Promotional Banner Carousel */}
          {renderPromoBannerCarousel()}

          {/* Kiosk Self-Service Ordering Workspace: Left Category Rail + Main Product Grid */}
          <div className="mv-kiosk-workspace">
            {/* Category Tabs: All, Appetizers, Bowls & Mains, Dim Sum & Bites, Noodles, Drinks & Boba, Combos, Mix & Match */}
            <div className="mv-cat-tabs-scroll mv-kiosk-cat-rail">
            {[
              { id: 'all', label: 'All Items', icon: '🍽️' },
              { id: 'appetizers', label: 'Appetizers', icon: '🥟' },
              { id: 'mains', label: 'Bowls & Mains', icon: '🍚' },
              { id: 'dimsum', label: 'Dim Sum & Bites', icon: '🥢' },
              { id: 'noodles', label: 'Noodles', icon: '🍜' },
              { id: 'drinks', label: 'Drinks & Boba', icon: '🧋' },
              { id: 'combos', label: 'Combos', icon: '🍱' },
              { id: 'mixmatch', label: 'Mix & Match', icon: '✨' }
            ].map(tab => {
              const catCount = allCatalogItems.filter(item => {
                const hasExcludedAllergen = item.allergens && item.allergens.some(a => allergens.includes(a));
                return !hasExcludedAllergen && matchesCategoryTab(item, tab.id);
              }).length;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategory(tab.id)}
                  className={`mv-cat-tab-btn ${selectedCategory === tab.id ? 'active' : ''}`}
                >
                  <span style={{ marginRight: '5px' }}>{tab.icon}</span>
                  <span>{tab.label}</span>
                  <span style={{
                    marginLeft: '6px',
                    fontSize: '10px',
                    fontWeight: 800,
                    opacity: selectedCategory === tab.id ? 0.95 : 0.65,
                    background: selectedCategory === tab.id ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.06)',
                    padding: '1px 6px',
                    borderRadius: '999px'
                  }}>
                    {catCount}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Ordering Panel */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Catalog Search & Live Filtering */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '10px',
              background: 'var(--bg-surface-elevated)',
              borderRadius: '10px',
              padding: '7px 12px',
              border: '1px solid var(--border-glass)'
            }}>
              <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Search food, drinks, or ingredients..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: '12px',
                  color: 'var(--text-primary)',
                  width: '100%'
                }}
              />
              {catalogSearch && (
                <button
                  type="button"
                  onClick={() => setCatalogSearch('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}
                  title="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h5 style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>
                Safe Catalog ({safeItems.length} available)
              </h5>
              {totalCartCount > 0 && (
                <span style={{ fontSize: '11px', color: 'var(--accent-red)', fontWeight: '700' }}>
                  {totalCartCount} in cart (₱{totalCartPrice.toFixed(2)})
                </span>
              )}
            </div>

            <div className="mv-safe-catalog-list mv-kiosk-grid" style={{ overflowY: 'auto', paddingRight: '4px', marginBottom: '16px' }}>
              {safeItems.map(item => {
                // Count total quantity in cart for this item (including customized variants)
                const qtyInCart = Object.values(cart).reduce((sum, val) => {
                  if (typeof val === 'object' && val !== null) {
                    return (String(val.originalId || val.id) === String(item.id)) ? sum + (val.quantity || 1) : sum;
                  }
                  return sum;
                }, 0) + (typeof cart[item.id] === 'number' ? cart[item.id] : 0);

                const isMatch = preferences.some(p => item.tags && item.tags.includes(p));
                const matchCount = item.tags ? item.tags.filter(p => preferences.includes(p)).length : 0;
                const isUnavailable = !item.available || item.isExplicitlyUnavailable;
                const isOutOfStock = item.isOutOfStock || (item.stock !== undefined && item.stock <= 0);
                const isDrink = item.catalogType === 'drink';
                const hasMultipleSizes = isDrink && item.sizes && item.sizes.length > 0;
                const isDisabled = isUnavailable || isOutOfStock;

                return (
                  <div
                    key={item.id}
                    className={`mv-kiosk-card ${qtyInCart > 0 ? 'in-cart' : ''} ${isDisabled ? 'disabled' : ''}`}
                    onClick={() => {
                      if (!isDisabled) setSelectedProductForModal(item);
                    }}
                    role="button"
                    tabIndex={isDisabled ? -1 : 0}
                    onKeyDown={(e) => {
                      if (!isDisabled && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        setSelectedProductForModal(item);
                      }
                    }}
                  >
                    {/* Card Top: High-Res Food Photography + Status Badges */}
                    <div className="mv-kiosk-card-img-wrap">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="mv-kiosk-card-img"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div className="mv-kiosk-card-emoji-fallback" style={{ display: item.image ? 'none' : 'flex' }}>
                        {item.emoji || '🍽️'}
                      </div>

                      {/* Top Left Badges */}
                      <div className="mv-kiosk-card-badges-top">
                        {item.category && (
                          <span className="mv-kiosk-cat-pill">
                            {item.drinkCategory || item.category}
                          </span>
                        )}
                        {item.promoPrice && (
                          <span className="mv-kiosk-promo-pill">PROMO</span>
                        )}
                        {item.badge && (
                          <span className="mv-kiosk-save-pill">{item.badge}</span>
                        )}
                      </div>

                      {/* Top Right Match / Quantity Badge */}
                      {qtyInCart > 0 ? (
                        <div className="mv-kiosk-qty-badge">{qtyInCart} in order</div>
                      ) : isMatch ? (
                        <div className="mv-kiosk-match-badge">MATCH +{matchCount}</div>
                      ) : null}

                      {/* Prep Time / Stock Indicator */}
                      {isUnavailable ? (
                        <div className="mv-kiosk-unavailable-overlay">Unavailable</div>
                      ) : isOutOfStock ? (
                        <div className="mv-kiosk-unavailable-overlay">Out of Stock</div>
                      ) : item.prepTime ? (
                        <div className="mv-kiosk-prep-pill">⏱ {item.prepTime}</div>
                      ) : null}
                    </div>

                    {/* Card Body: Title, Description, Tags, Allergens */}
                    <div className="mv-kiosk-card-body">
                      <h6 className="mv-kiosk-card-title">{item.name}</h6>
                      <p className="mv-kiosk-card-desc">
                        {item.description || 'Crafted fresh to order with authentic Umami Craft Fusion ingredients.'}
                      </p>

                      {/* Flavor & Allergen Indicators */}
                      <div className="mv-kiosk-card-tags">
                        {item.tags && item.tags.slice(0, 3).map(tag => (
                          <span key={tag} className={`badge ${preferences.includes(tag) ? 'badge-recommend' : 'badge-tag'}`} style={{ fontSize: '9.5px', padding: '2px 7px' }}>
                            {tag}
                          </span>
                        ))}
                        {Array.isArray(item.allergens) && item.allergens.length > 0 && (
                          <span style={{ fontSize: '9.5px', padding: '2px 7px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.08)', color: '#dc2626', fontWeight: 700, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                            Contains: {item.allergens.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Footer: Price + Touchscreen Customize/Add CTA */}
                    <div className="mv-kiosk-card-footer">
                      <div>
                        {item.promoPrice ? (
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                            <span style={{ fontWeight: 900, fontSize: '16px', color: '#e11d48' }}>
                              ₱{Number(item.promoPrice).toFixed(2)}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                              ₱{Number(item.price).toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <div style={{ fontWeight: 900, fontSize: '16px', color: 'var(--text-primary)' }}>
                            ₱{Number(item.price || 0).toFixed(2)}
                          </div>
                        )}
                        {hasMultipleSizes && (
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            {item.sizes.length} sizes available
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={isDisabled}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isDisabled) setSelectedProductForModal(item);
                        }}
                        className={`mv-kiosk-add-btn ${qtyInCart > 0 ? 'added' : ''}`}
                      >
                        <Plus size={14} />
                        <span>{isDisabled ? 'Unavailable' : qtyInCart > 0 ? 'Customize / Add' : 'Select & Add'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}

              {safeItems.length === 0 && (
                <div style={{ gridColumn: '1 / -1', padding: '36px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px', background: 'var(--bg-surface)', borderRadius: '16px', border: '1px dashed var(--border-glass)' }}>
                  No items found matching your active filter criteria. Try switching categories or clearing your search.
                </div>
              )}
            </div>

            {/* Sticky Floating Bottom Kiosk Order Summary Bar */}
            {totalCartCount > 0 && (
              <div className="cart-floating-bar mv-kiosk-cart-bar" onClick={() => setIsCheckoutOpen(true)} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: '#ffffff', color: '#C24522', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '15px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                    {totalCartCount}
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#ffffff' }}>
                      Review Order &amp; Checkout ({diningOption})
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.88)' }}>
                      {cartItemsList.length} unique {cartItemsList.length === 1 ? 'item' : 'items'} • Tap to customize or pay
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCart({});
                      setPromoApplied(null);
                      setPromoCode('');
                    }}
                    style={{
                      background: 'rgba(0,0,0,0.22)',
                      border: '1px solid rgba(255,255,255,0.3)',
                      color: '#ffffff',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                    title="Clear current order"
                  >
                    Clear
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.18)', padding: '7px 14px', borderRadius: '10px' }}>
                    <span style={{ fontSize: '17px', fontWeight: '900', color: '#ffffff' }}>
                      ₱{totalCartPrice.toFixed(2)}
                    </span>
                    <ArrowRight size={18} color="#ffffff" />
                  </div>
                </div>
              </div>
            )}
          </div>
          </div>
        </div>
      ) : showWelcomeScreen ? (
        /* --- Step 1: Self-Service Kiosk Welcome Screen --- */
        <div className="mv-kiosk-welcome">
          <div className="mv-kw-hero-banner">
            <img
              src="https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=1200&q=80"
              alt={restaurantMeta?.name || 'Umami Craft Fusion'}
              className="mv-kw-hero-img"
            />
            <div className="mv-kw-hero-overlay">
              <div className="mv-kw-brand-pill">
                <Sparkles size={13} />
                <span>{restaurantMeta?.cuisine || 'Asian Craft Fusion'} • Self-Service Kiosk</span>
              </div>
              <h2 className="mv-kw-title">{restaurantMeta?.name || 'Umami Craft Fusion'}</h2>
              <p className="mv-kw-subtitle">
                {restaurantMeta?.tagline || 'Handcrafted Bowls, Artisanal Dumplings & Street Noodles'}
              </p>
              <div className="mv-kw-terminal-tag">
                <span>Terminal #{effectiveKioskId}</span>
                <span>•</span>
                <span>{socketConnected ? 'Live Kitchen Sync Active' : 'Connecting...'}</span>
              </div>
            </div>
          </div>

          <div className="mv-kw-dining-section">
            <div className="mv-kw-section-label">STEP 1 • CHOOSE YOUR DINING PREFERENCE</div>
            <div className="mv-kw-dining-grid">
              <button
                type="button"
                className={`mv-kw-dining-card ${diningOption === 'Dine-In' ? 'active' : ''}`}
                onClick={() => setDiningOption('Dine-In')}
              >
                <div className="mv-kw-dining-icon">
                  <Utensils size={28} />
                </div>
                <div className="mv-kw-dining-text">
                  <strong>Dine-In</strong>
                  <span>Enjoy freshly prepared meals at your table</span>
                </div>
                {diningOption === 'Dine-In' && <CheckCircle size={20} color="#C24522" />}
              </button>

              <button
                type="button"
                className={`mv-kw-dining-card ${diningOption === 'Takeout' ? 'active' : ''}`}
                onClick={() => setDiningOption('Takeout')}
              >
                <div className="mv-kw-dining-icon">
                  <ShoppingBag size={28} />
                </div>
                <div className="mv-kw-dining-text">
                  <strong>Takeout</strong>
                  <span>Packed fresh and sealed to go</span>
                </div>
                {diningOption === 'Takeout' && <CheckCircle size={20} color="#C24522" />}
              </button>
            </div>
          </div>

          <div className="mv-kw-actions">
            <button
              type="button"
              className="mv-kw-start-btn"
              onClick={() => {
                setShowWelcomeScreen(false);
                setIsOnboarded(true);
              }}
            >
              <span>Tap to Start Order ({diningOption})</span>
              <ArrowRight size={20} />
            </button>

            <button
              type="button"
              className="mv-kw-diet-btn"
              onClick={() => {
                setShowWelcomeScreen(false);
                setIsOnboarded(false);
              }}
            >
              <ShieldCheck size={17} />
              <span>
                Customize Dietary &amp; Allergen Filters
                {(allergens.length > 0 || preferences.length > 0) ? ` (${allergens.length + preferences.length} active)` : ' (Optional)'}
              </span>
            </button>
          </div>
        </div>
      ) : (
        /* --- View 1: Onboarding Screen --- */
        <div className="mvault-root">

          {/* ── Decorative corner: ensō brush + kanji ── */}
          <div className="mvault-deco-corner" aria-hidden="true">
            <div className="mvault-enso" />
            <div className="mvault-kanji">旨味</div>
            <div className="mvault-deco-tag">GOOD<br/>FOOD<br/>BETTER<br/>DAYS</div>
          </div>

          {/* ── Hero Header ── */}
          <div className="mvault-hero">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div className="mvault-badge">
                <Shield size={15} strokeWidth={2.5} color="#059669" />
                <span>UMAMI CRAFT FUSION ID</span>
              </div>
            </div>
            <h1 className="mvault-title">
              Local <span className="mvault-title-accent">Dietary Vault</span>
            </h1>
            <p className="mvault-subtitle" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Lock size={12} />
              <span>ALL DATA SAVED IN LOCAL STORAGE ONLY</span>
            </p>
            <div className="mvault-divider-herb" style={{ margin: '10px 0', borderBottom: '1px solid var(--border-subtle)' }} />
            <p className="mvault-tagline">Your preferences. A better dining experience.</p>
          </div>

          {/* ── Captive Portal Activation Banner (if present) ── */}
          {captiveParams && (
            <div className="glass-card highlighted" style={{ padding: '14px', borderRadius: '14px', marginBottom: '4px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '6px' }}>
                <div style={{ background: 'rgba(16,185,129,0.1)', padding: '7px', borderRadius: '9px', color: 'var(--accent-green)' }}>
                  <Shield size={16} />
                </div>
                <div>
                  <h5 style={{ fontSize: '13px', fontWeight: '700' }}>Restaurant Wi-Fi Connected</h5>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Device MAC: {captiveParams.clientmac || 'Unknown'}</span>
                </div>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '10px' }}>
                Authenticate to unlock guest Wi-Fi. Your dietary vault stays strictly local on your phone.
              </p>
              <button
                onClick={() => {
                  const authUrl = `http://${captiveParams.gatewayaddress}/opennds_auth/?tok=${captiveParams.tok}&redir=${encodeURIComponent(captiveParams.redir || window.location.origin)}`;
                  window.location.href = authUrl;
                }}
                className="btn-primary"
                style={{ width: '100%', padding: '9px', fontSize: '12px', borderRadius: '10px', fontWeight: '700' }}
              >
                Connect to Guest Wi-Fi
              </button>
            </div>
          )}

          {/* ── Quick Repeat Last Order (Hidden per user request) ── */}

          {/* 5-Second Auto-Cycling Promotional Banner Carousel */}
          {renderPromoBannerCarousel()}

          {/* --- Responsive Sections Grid: Allergens & Preferences --- */}
          <div className="mvault-sections-container">
            {/* --- Section 1: Exclude Allergens --- */}
            <div className="mvault-section">
              <div className="mvault-section-header" style={{ justifyContent: 'space-between', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="mvault-section-num">1</div>
                  <div>
                    <div className="mvault-section-title">Exclude Allergens</div>
                    <div className="mvault-section-sub">STAY SAFE. EAT CONFIDENTLY.</div>
                  </div>
                </div>
                {(allergens.length + customAllergens.length) > 0 && (
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: '#DC2626',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    padding: '3px 9px',
                    borderRadius: '999px'
                  }}>
                    {allergens.length + customAllergens.length} selected
                  </span>
                )}
              </div>
              <div className="mvault-checklist">
                {activeAllergenOptions.map(opt => {
                  const checked = allergens.includes(opt.id);
                  return (
                    <label key={opt.id} className={`mvault-check-row${checked ? ' checked' : ''}`}>
                      <input type="checkbox" checked={checked} onChange={() => handleAllergenToggle(opt.id)} />
                      <span className="mvault-check-box" aria-hidden="true" />
                      {(opt.image_url || opt.image) ? (
                        <span className="mvault-check-emoji mvault-check-img-wrap">
                          <img src={opt.image_url || opt.image} alt={opt.name || opt.label} className="mvault-custom-icon-img" />
                        </span>
                      ) : (
                        <span className="mvault-check-emoji">{opt.emoji || '🥜'}</span>
                      )}
                      <span className="mvault-check-label">{opt.name || opt.label}</span>
                    </label>
                  );
                })}
              </div>

              {/* Optional Custom Allergy Input */}
              <div className="mvault-custom-allergy-box">
                <label className="mvault-custom-allergy-label">Other Allergy / Ingredient to Exclude (Optional)</label>
                <div className="mvault-custom-allergy-row">
                  <input
                    type="text"
                    placeholder="e.g. MSG, Kiwi, Mustard..."
                    value={customAllergyInput}
                    onChange={(e) => setCustomAllergyInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomAllergy();
                      }
                    }}
                    className="mvault-custom-allergy-input"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomAllergy}
                    className="mvault-custom-allergy-add-btn"
                  >
                    + Add
                  </button>
                </div>
                {customAllergens.length > 0 && (
                  <div className="mvault-custom-allergy-chips">
                    {customAllergens.map(ca => (
                      <span key={ca} className="mvault-custom-allergy-chip">
                        <span>Excl. {ca}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomAllergy(ca)}
                          aria-label={`Remove ${ca}`}
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* --- Section 2: Flavor Preferences --- */}
            <div className="mvault-section">
              <div className="mvault-section-header">
                <div className="mvault-section-num mvault-section-num--amber">2</div>
                <div>
                  <div className="mvault-section-title">Flavor Preferences</div>
                  <div className="mvault-section-sub">MAKE IT YOURS.</div>
                </div>
              </div>
              <div className="mvault-checklist">
                {activePreferenceOptions.map(opt => {
                  const checked = preferences.includes(opt.id);
                  return (
                    <label key={opt.id} className={`mvault-check-row${checked ? ' checked' : ''}`}>
                      <input type="checkbox" checked={checked} onChange={() => handlePreferenceToggle(opt.id)} />
                      <span className="mvault-check-box" aria-hidden="true" />
                      {(opt.image_url || opt.image) ? (
                        <span className="mvault-check-emoji mvault-check-img-wrap">
                          <img src={opt.image_url || opt.image} alt={opt.name || opt.label} className="mvault-custom-icon-img" />
                        </span>
                      ) : (
                        <span className="mvault-check-emoji">{opt.emoji || '🔥'}</span>
                      )}
                      <span className="mvault-check-label">{opt.name || opt.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Taste Profile History Insights (collapsed) ── */}
          {history.length > 0 && (
            <div className="glass-card" style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.02)' }}>
              <h5 style={{ fontSize: '10px', color: 'var(--accent-green)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle size={12} /> Taste Profile Insights
              </h5>
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                {Object.entries(tagCounts).map(([tag, count]) => {
                  const isStrong = count >= 2;
                  const isChecked = preferences.includes(tag);
                  return (
                    <div key={tag} style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '5px', background: isStrong ? 'rgba(45,106,79,0.08)' : 'rgba(44,26,17,0.02)', border: `1px solid ${isStrong ? 'var(--accent-green)' : 'var(--border-glass)'}`, color: isStrong ? 'var(--text-primary)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span>{tag.toUpperCase()} ({count})</span>
                      {isStrong && !isChecked && (
                        <button onClick={() => handlePreferenceToggle(tag)} style={{ background: 'var(--accent-gradient)', color: '#fff', border: 'none', padding: '1px 5px', borderRadius: '3px', fontSize: '8px', fontWeight: '800', cursor: 'pointer' }}>+ PROFILE</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Privacy Trust Bar ── */}
          <div className="mvault-privacy-bar">
            <div className="mvault-privacy-left">
              <Shield size={18} color="#059669" strokeWidth={2.5} />
              <div>
                <div className="mvault-privacy-bold">Your data stays on this device.</div>
                <div className="mvault-privacy-sub">No account, no cloud, no app needed.</div>
              </div>
            </div>
            <div className="mvault-privacy-right">PRIVATE • SECURE • JUST FOR YOU</div>
          </div>

          {/* ── Primary CTA ── */}
          <div className="mvault-cta-group">
            <button
              type="button"
              onClick={handleSaveLocalDietaryVault}
              className="mvault-save-btn"
            >
              <Save size={16} />
              <span>Save Preferences</span>
              <span className="mvault-save-arrow">›</span>
            </button>
            <button
              type="button"
              onClick={() => {
                localStorage.setItem('synapse_onboarded', 'true');
                setShowWelcomeScreen(false);
                setIsOnboarded(true);
                if (typeof onResetSession === 'function') onResetSession();
              }}
              className="mvault-later-btn"
            >
              Maybe Later
            </button>
          </div>

          {/* ── Factory Reset (subtle) ── */}
          <div style={{ textAlign: 'center', paddingBottom: '8px' }}>
            <button onClick={handleClearAllData} style={{ background: 'none', border: 'none', fontSize: '11px', color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }}>
              Reset profile &amp; clear all data
            </button>
          </div>

          {/* ── "Taste Meets Technology" watermark ── */}
          <div className="mvault-watermark" aria-hidden="true">Taste<br/>Meets<br/>Technology</div>

        </div>
      )}

      {/* Cart Drawer Modal */}
      {isCartOpen && (
        <div className="cart-drawer-overlay" onClick={() => setIsCartOpen(false)}>
          <div className="cart-drawer-content" onClick={e => e.stopPropagation()}>
            <div className="cart-drawer-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingCart size={20} color="var(--accent-red)" />
                <h4 style={{ fontSize: '16px', fontWeight: '800' }}>Your Order Cart</h4>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} color="var(--text-muted)" />
              </button>
            </div>

            {cartItemsList.length > 0 ? (
              <>
                <div className="cart-items-scroll">
                  {cartItemsList.map(item => {
                    const itemImg = item.image || allCatalogItems.find(m => String(m.id) === String(item.originalId || item.id))?.image;
                    return (
                      <div key={item.id} className="cart-item-row" style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        background: '#ffffff',
                        borderRadius: '14px',
                        border: '1px solid rgba(44, 26, 17, 0.08)',
                        boxShadow: '0 2px 8px rgba(44, 26, 17, 0.03)',
                        gap: '12px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                          <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '10px',
                            overflow: 'hidden',
                            flexShrink: 0,
                            background: 'rgba(228, 87, 41, 0.05)',
                            border: '1px solid rgba(44, 26, 17, 0.08)',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                            position: 'relative'
                          }}>
                            {itemImg ? (
                              <img
                                src={itemImg}
                                alt={item.name}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                  display: 'block'
                                }}
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div style={{
                              display: itemImg ? 'none' : 'flex',
                              width: '100%',
                              height: '100%',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: 'rgba(217, 75, 43, 0.08)',
                              color: 'var(--brand-primary, #D94B2B)'
                            }}>
                              <UtensilsCrossed size={16} />
                            </div>
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontWeight: '700',
                              fontSize: '13px',
                              color: 'var(--text-primary)',
                              lineHeight: 1.3,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }} title={item.name}>
                              {item.name}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '500' }}>
                              ₱{item.price.toFixed(2)} each
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                          <div className="qty-stepper">
                            <button
                              type="button"
                              className="qty-btn"
                              onClick={() => handleUpdateQuantity(item.id, -1)}
                              aria-label="Decrease quantity"
                            >
                              <Minus size={11} />
                            </button>
                            <span className="qty-count">{item.quantity}</span>
                            <button
                              type="button"
                              className="qty-btn"
                              onClick={() => handleUpdateQuantity(item.id, 1)}
                              aria-label="Increase quantity"
                            >
                              <Plus size={11} />
                            </button>
                          </div>

                          <span style={{ fontWeight: '800', fontSize: '13px', minWidth: '60px', textAlign: 'right', color: 'var(--text-primary)' }}>
                            ₱{(item.price * item.quantity).toFixed(2)}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleRemoveFromCart(item.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--accent-danger, #dc2626)',
                              cursor: 'pointer',
                              padding: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="Remove item"
                            aria-label="Remove item"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '16px', marginTop: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
                    <span>Total Items:</span>
                    <span>{totalCartCount} items</span>
                  </div>

                  {/* Promo Code Input & Verification */}
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="text"
                        placeholder="Enter promo code (e.g. UMAMI20)"
                        value={promoCode}
                        onChange={e => {
                          setPromoCode(e.target.value.toUpperCase().replace(/\s/g, ''));
                          if (promoApplied) { setPromoApplied(null); setPromoMsg({ text: '', ok: false }); }
                        }}
                        style={{
                          flex: 1, padding: '9px 12px', borderRadius: '10px',
                          border: promoMsg.ok ? '1.5px solid #059669' : promoMsg.text ? '1.5px solid #dc2626' : '1.5px solid var(--border-glass)',
                          background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)',
                          fontSize: '13px', fontFamily: 'monospace', fontWeight: '700', letterSpacing: '1px',
                          outline: 'none'
                        }}
                        disabled={!!promoApplied}
                      />
                      {promoApplied ? (
                        <button
                          onClick={() => { setPromoApplied(null); setPromoCode(''); setPromoMsg({ text: '', ok: false }); }}
                          style={{ padding: '9px 14px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', color: '#dc2626', border: '1.5px solid rgba(239,68,68,0.25)', fontSize: '12px', fontWeight: '700', cursor: 'pointer', flexShrink: 0 }}
                        >Remove</button>
                      ) : (
                        <button
                          onClick={() => {
                            const codeToTry = promoCode.trim().toUpperCase();
                            if (!codeToTry) return;
                            try {
                              let source = promos;
                              if (!source || source.length === 0) {
                                source = JSON.parse(localStorage.getItem('umami_promos') || '[]');
                              }

                              // Check if code was permanently retired
                              const isRetired = source.some(p =>
                                (Array.isArray(p.retiredCodes) && p.retiredCodes.includes(codeToTry)) ||
                                (p.originalCode?.toUpperCase() === codeToTry && p.code?.toUpperCase() !== codeToTry)
                              );
                              if (isRetired) {
                                setPromoMsg({ text: `❌ Promotion code "${codeToTry}" has expired and cannot be reused.`, ok: false });
                                return;
                              }

                              const match = source.find(p => p.code?.toUpperCase() === codeToTry);
                              if (!match) {
                                setPromoMsg({ text: `❌ Invalid promo code "${codeToTry}". Please check the code.`, ok: false });
                                return;
                              }

                              // Check status and expiration date/time
                              const isExp = match.status === 'expired' || (match.expiresAt && new Date(match.expiresAt).getTime() <= Date.now());
                              if (isExp) {
                                setPromoMsg({ text: `❌ Promotion code "${codeToTry}" has reached its expiration date and is no longer valid.`, ok: false });
                                return;
                              }

                              // 1. Status verification
                              if (match.status !== 'active') {
                                setPromoMsg({ text: `❌ Promotion "${match.name}" is currently ${match.status}.`, ok: false });
                                return;
                              }

                              // 2. Validity period verification
                              if (match.dateRange) {
                                const parts = match.dateRange.split(/–|-|to/i);
                                if (parts.length === 2) {
                                  const start = new Date(parts[0].trim());
                                  const end = new Date(parts[1].trim());
                                  const now = new Date();
                                  if (!isNaN(start.getTime()) && now < start) {
                                    setPromoMsg({ text: `❌ Promotion starts on ${parts[0].trim()}.`, ok: false });
                                    return;
                                  }
                                  if (!isNaN(end.getTime())) {
                                    end.setHours(23, 59, 59, 999);
                                    if (now > end) {
                                      setPromoMsg({ text: `❌ Promotion expired on ${parts[1].trim()}.`, ok: false });
                                      return;
                                    }
                                  }
                                }
                              }

                              // 3. Redemption & usage limits
                              const maxRed = Number(match.maxRedemptions) || 500;
                              const currentRed = Number(match.currentRedemptions) || Number(match.timesRedeemed) || 0;
                              if (currentRed >= maxRed) {
                                setPromoMsg({ text: `❌ Promotion has reached its maximum redemption limit (${maxRed}).`, ok: false });
                                return;
                              }

                              // 4. Eligible items verification (food & drinks with size variations)
                              if (!match.applyToAll) {
                                const applicable = match.applicableItems || [];
                                const hasEligibleItem = cartItemsList.some(ci => {
                                  return applicable.some(appItem => {
                                    const cName = (ci.name || '').toLowerCase();
                                    const aName = (appItem || '').toLowerCase();
                                    return cName === aName || cName.startsWith(aName) || aName.startsWith(cName.split(' (')[0]);
                                  });
                                });

                                if (!hasEligibleItem) {
                                  setPromoMsg({
                                    text: `❌ Promo only applies to: ${applicable.join(', ')}. Add an eligible item to your cart!`,
                                    ok: false
                                  });
                                  return;
                                }
                              }

                              setPromoApplied(match);
                              setPromoCode(match.code);
                              const rate = match.discountType === 'percent' ? `${match.discountValue}%` : `₱${match.discountValue}`;
                              setPromoMsg({ text: `✅ "${match.name}" applied (${rate} off)!`, ok: true });
                            } catch (_) {
                              setPromoMsg({ text: '❌ Could not validate promo code.', ok: false });
                            }
                          }}
                          style={{ padding: '9px 14px', borderRadius: '10px', background: 'var(--brand-gradient)', color: '#fff', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer', flexShrink: 0 }}
                        >Apply</button>
                      )}
                    </div>
                    {promoMsg.text && (
                      <p style={{ fontSize: '11px', marginTop: '5px', color: promoMsg.ok ? '#059669' : '#dc2626', fontWeight: '700', lineHeight: 1.3 }}>
                        {promoMsg.text}
                      </p>
                    )}
                  </div>

                  {/* --- Financial Summary Breakdown --- */}
                  {(() => {
                    let disc = 0;
                    if (promoApplied) {
                      const eligibleItems = promoApplied.applyToAll
                        ? cartItemsList
                        : cartItemsList.filter(ci => {
                            return (promoApplied.applicableItems || []).some(appItem => {
                              const cName = (ci.name || '').toLowerCase();
                              const aName = (appItem || '').toLowerCase();
                              return cName === aName || cName.startsWith(aName) || aName.startsWith(cName.split(' (')[0]);
                            });
                          });
                      const eligibleSubtotal = eligibleItems.reduce((s, ci) => s + ci.price * ci.quantity, 0);
                      disc = promoApplied.discountType === 'percent'
                        ? Math.round(eligibleSubtotal * promoApplied.discountValue / 100)
                        : Math.min(promoApplied.discountValue, eligibleSubtotal);
                    }
                    const finalPayable = Math.max(0, totalCartPrice - disc);

                    return (
                      <div style={{ background: 'var(--bg-surface-elevated)', borderRadius: '12px', padding: '12px 14px', marginBottom: '14px', border: '1px solid var(--border-glass)' }}>
                        {/* Subtotal */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                          <span>Subtotal:</span>
                          <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>₱{totalCartPrice.toFixed(2)}</span>
                        </div>

                        {/* Promo Discount line */}
                        {promoApplied && (
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '12.5px',
                            color: '#059669',
                            fontWeight: '700',
                            marginBottom: '6px',
                            background: 'rgba(5, 150, 105, 0.08)',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            alignItems: 'center'
                          }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <Tag size={13} />
                              <span>Promo ({promoApplied.code}):</span>
                              <span style={{ fontSize: '10.5px', background: 'rgba(5, 150, 105, 0.15)', padding: '1px 6px', borderRadius: '4px' }}>
                                {promoApplied.discountType === 'percent' ? `-${promoApplied.discountValue}%` : `-₱${promoApplied.discountValue}`}
                              </span>
                            </span>
                            <span>−₱{disc.toFixed(2)}</span>
                          </div>
                        )}

                        {/* Order Total / Final Amount to Pay */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          paddingTop: '8px',
                          borderTop: '1px dashed var(--border-glass)',
                          marginTop: '4px'
                        }}>
                          <div>
                            <span style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>Final Amount to Pay:</span>
                            {promoApplied && (
                              <div style={{ fontSize: '10.5px', color: '#059669', fontWeight: '700' }}>
                                You saved ₱{disc.toFixed(2)}!
                              </div>
                            )}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            {promoApplied && (
                              <div style={{ color: '#9ca3af', fontSize: '12px', fontWeight: '600', textDecoration: 'line-through' }}>
                                ₱{totalCartPrice.toFixed(2)}
                              </div>
                            )}
                            <div style={{ color: 'var(--accent-red)', fontSize: '20px', fontWeight: '900', lineHeight: 1.1 }}>
                              ₱{finalPayable.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <button
                    onClick={handlePlaceOrder}
                    className="btn-primary"
                    style={{
                      width: '100%',
                      padding: '14px',
                      borderRadius: '14px',
                      fontSize: '15px',
                      fontWeight: '800',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <PesoReceipt size={18} />
                    Confirm &amp; Place Order
                  </button>
                </div>
              </>
            ) : (
              <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                <ShoppingCart size={36} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Your order cart is currently empty.</p>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="btn-secondary"
                  style={{ marginTop: '16px', padding: '8px 16px', fontSize: '12px', borderRadius: '8px' }}
                >
                  Browse Menu
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Drink Size Selection & Customization Modal */}
      {selectedDrinkForModal && (
        <div
          className="drink-size-modal-backdrop"
          onClick={() => setSelectedDrinkForModal(null)}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1050,
            padding: '16px'
          }}
        >
          <div
            className="drink-size-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-glass)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '380px',
              maxHeight: '90%',
              overflowY: 'auto',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{
              padding: '14px 18px',
              borderBottom: '1px solid var(--border-glass)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  flexShrink: 0,
                  border: '1px solid rgba(44, 26, 17, 0.08)',
                  background: 'rgba(228, 87, 41, 0.05)'
                }}>
                  {selectedDrinkForModal.image ? (
                    <img
                      src={selectedDrinkForModal.image}
                      alt={selectedDrinkForModal.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={e => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-primary)' }}>
                      <Coffee size={16} />
                    </div>
                  )}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>{selectedDrinkForModal.name}</h4>
                  <span style={{ fontSize: '10px', color: 'var(--accent-red)', fontWeight: 700, textTransform: 'uppercase' }}>
                    {selectedDrinkForModal.drinkCategory || 'Beverage'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDrinkForModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '16px 18px' }}>
              {selectedDrinkForModal.image && (
                <div style={{ width: '100%', height: '130px', borderRadius: '10px', overflow: 'hidden', marginBottom: '12px' }}>
                  <img
                    src={selectedDrinkForModal.image}
                    alt={selectedDrinkForModal.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              )}
              <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.4 }}>
                {selectedDrinkForModal.description}
              </p>

              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.04em' }}>
                  Choose Your Size *
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(selectedDrinkForModal.sizes || []).map((sz, idx) => {
                    const isSelected = modalSizeIndex === idx;
                    const isOut = (sz.stock !== undefined && sz.stock <= 0);
                    return (
                      <div
                        key={sz.name}
                        onClick={() => !isOut && setModalSizeIndex(idx)}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: `1.5px solid ${isSelected ? 'var(--accent-red)' : 'var(--border-glass)'}`,
                          background: isSelected ? 'rgba(228, 87, 41, 0.08)' : 'var(--bg-surface-elevated)',
                          cursor: isOut ? 'not-allowed' : 'pointer',
                          opacity: isOut ? 0.45 : 1,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input
                            type="radio"
                            name="drinkSize"
                            checked={isSelected}
                            disabled={isOut}
                            onChange={() => setModalSizeIndex(idx)}
                            style={{ accentColor: 'var(--accent-red)', cursor: isOut ? 'not-allowed' : 'pointer' }}
                          />
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700 }}>
                              {sz.name} <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>({sz.volume})</span>
                            </div>
                            <div style={{ fontSize: '10px', color: isOut ? '#ef4444' : ((sz.stock ?? 20) <= 5 ? '#f59e0b' : '#10b981'), fontWeight: 600 }}>
                              {isOut ? 'Out of Stock' : ((sz.stock ?? 20) <= 5 ? `Low Stock (${sz.stock} left)` : 'In Stock')}
                            </div>
                          </div>
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: isSelected ? 'var(--accent-red)' : 'inherit' }}>
                          ₱{Number(sz.price).toFixed(2)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedDrinkForModal.addons && selectedDrinkForModal.addons.length > 0 && (
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.04em' }}>
                    Customizations &amp; Add-ons
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {selectedDrinkForModal.addons.map(addon => {
                      const checked = modalSelectedAddons.includes(addon);
                      return (
                        <button
                          key={addon}
                          type="button"
                          onClick={() => {
                            setModalSelectedAddons(prev => prev.includes(addon) ? prev.filter(a => a !== addon) : [...prev, addon]);
                          }}
                          style={{
                            fontSize: '11px',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: `1px solid ${checked ? 'var(--accent-red)' : 'var(--border-glass)'}`,
                            background: checked ? 'rgba(228, 87, 41, 0.12)' : 'var(--bg-surface-elevated)',
                            color: checked ? 'var(--accent-red)' : 'var(--text-secondary)',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          {checked ? '✓ ' : '+ '}{addon}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity Stepper + Add to Cart CTA */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-glass)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setModalQty(q => Math.max(1, q - 1))}
                    style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-surface-elevated)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Minus size={12} />
                  </button>
                  <span style={{ fontWeight: 800, fontSize: '14px', minWidth: '22px', textAlign: 'center' }}>{modalQty}</span>
                  <button
                    type="button"
                    onClick={() => setModalQty(q => q + 1)}
                    style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-surface-elevated)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Plus size={12} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const sizesList = selectedDrinkForModal.sizes || [];
                    const sz = sizesList[modalSizeIndex] || sizesList[0] || { name: 'Standard', volume: '500 ml', price: selectedDrinkForModal.price };
                    handleAddToCart(selectedDrinkForModal, {
                      sizeName: sz.name,
                      volume: sz.volume,
                      price: Number(sz.price),
                      addons: modalSelectedAddons,
                      qty: modalQty
                    });
                    setSelectedDrinkForModal(null);
                  }}
                  style={{
                    padding: '10px 18px',
                    background: 'var(--accent-red)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(228,87,41,0.3)'
                  }}
                >
                  Add to Order • ₱{(((selectedDrinkForModal.sizes || [])[modalSizeIndex]?.price || selectedDrinkForModal.price) * modalQty).toFixed(2)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ── Customer Showcase View: Displays within the responsive Device Mockup ──
  return (
    <div className="mv-hero-page">
      {/* Decorative background elements */}
      <div className="mv-hero-bg-sun" aria-hidden="true" />
      <div className="mv-hero-bg-mountains" aria-hidden="true">
        <svg viewBox="0 0 900 400" preserveAspectRatio="xMidYMid slice" className="mv-mountain-svg">
          <path d="M0 400 L100 260 L220 340 L360 180 L480 300 L600 150 L720 280 L840 200 L900 260 L900 400Z" fill="rgba(180,140,110,0.08)" />
          <path d="M0 400 L150 300 L300 380 L450 240 L580 330 L700 200 L820 300 L900 240 L900 400Z" fill="rgba(180,140,110,0.06)" />
        </svg>
      </div>
      {/* Left bamboo deco */}
      <div className="mv-hero-bamboo-left" aria-hidden="true">
        <svg viewBox="0 0 120 500" fill="none" className="mv-bamboo-svg">
          <line x1="40" y1="0" x2="40" y2="500" stroke="rgba(100,130,80,0.18)" strokeWidth="8" strokeLinecap="round"/>
          <line x1="70" y1="60" x2="70" y2="500" stroke="rgba(100,130,80,0.12)" strokeWidth="6" strokeLinecap="round"/>
          {[80,160,240,320,400].map(y => <line key={y} x1="20" y1={y} x2="58" y2={y-20} stroke="rgba(100,130,80,0.2)" strokeWidth="3" strokeLinecap="round" />)}
          {[120,200,280,360,440].map(y => <line key={y} x1="52" y1={y} x2="88" y2={y-22} stroke="rgba(100,130,80,0.15)" strokeWidth="2.5" strokeLinecap="round" />)}
        </svg>
      </div>
      {/* Right cloud wave */}
      <div className="mv-hero-wave-right" aria-hidden="true">
        <svg viewBox="0 0 200 200" fill="none" className="mv-wave-svg">
          {[30,70,110,150].map((y,i) => (
            <path key={i} d={`M10 ${y} Q40 ${y-18} 70 ${y} Q100 ${y+18} 130 ${y} Q160 ${y-18} 190 ${y}`}
              stroke="rgba(180,130,100,0.18)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
          ))}
        </svg>
      </div>

      {/* ── Top Hero Header Showcase ── */}
      <header className="mv-hero-header-banner">
        <h1 className="mv-hero-headline">
          Personalized Ordering & <span className="mv-hero-accent">Dietary Safety</span>
        </h1>
        <p className="mv-hero-tagline">
          Your preferences. A better dining experience.
        </p>
        <div style={{ marginTop: '10px', display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {kioskId && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(5, 150, 105, 0.12)', border: '1px solid rgba(5, 150, 105, 0.35)', padding: '5px 16px', borderRadius: '9999px', fontSize: '12px', fontWeight: '700', color: '#059669' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', display: 'inline-block', boxShadow: '0 0 6px #10B981' }}></span>
              <span>Live Paired to Kiosk Terminal #{kioskId}</span>
            </div>
          )}
          <button
            type="button"
            className="kiosk-pill-btn"
            onClick={() => setShowServiceModal(true)}
            title="Call Server / Request Table Service Assistance"
            style={{
              cursor: 'pointer',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1.5px solid rgba(245, 158, 11, 0.5)',
              color: '#d97706',
              fontWeight: 800,
              gap: '6px',
              padding: '5px 16px',
              borderRadius: '9999px',
              display: 'inline-flex',
              alignItems: 'center',
              fontSize: '12px'
            }}
          >
            <Bell size={13} color="#d97706" />
            <span style={{ color: '#d97706' }}>Call Server</span>
          </button>
        </div>
      </header>

      {/* ── Direct Web Application Viewport (No Laptop or Simulated Device Presentation) ── */}
      <div className="mv-webapp-wrapper">
        {dietaryConfirmToast && (
          <div className="mv-dietary-toast" role="status">
            <ShieldCheck size={16} />
            <span>{dietaryConfirmToast}</span>
          </div>
        )}
        {isBuzzing && (
          <div className="gadget-buzzer-beacon" style={{ marginBottom: '14px', width: '100%', maxWidth: '980px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <BellRing size={16} />
              <span>ORDER READY — BUZZER ACTIVE! PICK UP AT COUNTER</span>
            </span>
          </div>
        )}
        <div className="mv-webapp-viewport">
          {phoneContent}
        </div>
      </div>

      {/* Mandatory Post-QR Scan Allergy Verification Pop-up */}
      <AllergyVerificationModal
        isOpen={showAllergyModal}
        kioskId={effectiveKioskId}
        restaurantName={restaurantMeta?.name || 'Umami Craft Fusion'}
        onSelectYes={handleAllergyModalYes}
        onSelectNo={handleAllergyModalNo}
        errorMsg={allergyModalError}
      />

      {/* Table Service & Assistance Call Modal */}
      <TableServiceModal
        isOpen={showServiceModal}
        onClose={() => setShowServiceModal(false)}
        socket={socketRef.current}
        tableNumber={activeOrder?.tableNumber || (kioskId && !kioskId.startsWith('K-') ? `Table ${kioskId}` : 'Table 1')}
        customerName={activeOrder?.customer || 'Mobile Guest'}
        kioskId={kioskId}
        sessionId={activeOrder?.orderId || null}
        apiBase={backendTargetUrl}
      />

      {/* Product Details, Verified Ingredients & Customization Modal */}
      <KioskProductModal
        item={selectedProductForModal}
        isOpen={Boolean(selectedProductForModal)}
        onClose={() => setSelectedProductForModal(null)}
        onAddToCart={handleAddToCart}
        userAllergens={[...allergens, ...customAllergens]}
      />

      {/* Interactive Kiosk Order Review & Payment Checkout Modal */}
      <KioskCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cartItems={cartItemsList}
        diningOption={diningOption}
        onChangeDiningOption={setDiningOption}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveFromCart}
        promos={promos}
        promoCode={promoCode}
        setPromoCode={setPromoCode}
        promoApplied={promoApplied}
        setPromoApplied={setPromoApplied}
        promoMsg={promoMsg}
        setPromoMsg={setPromoMsg}
        onConfirmOrder={handlePlaceOrder}
      />
    </div>
  );
}

export default MobileView;
