import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { io } from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';
import PesoReceipt from './PesoReceipt';
import TableServiceModal from './TableServiceModal';
import KioskCheckoutModal from './KioskCheckoutModal';
import AllergenDoubleWarningModal from './AllergenDoubleWarningModal';
import { getConflictingAllergens } from '../utils/allergenUtils';
import { Bell } from 'lucide-react';
import {
  Monitor,
  Smartphone,
  ShieldCheck,
  Clock,
  EyeOff,
  AlertTriangle,
  Receipt,
  Leaf,
  Zap,
  Settings,
  ChevronRight,
  Play,
  Store,
  Sparkles,
  Tag,
  Utensils,
  CheckCircle2,
  Wifi,
  Radio,
  RefreshCw,
  Signal,
  Globe,
  Search,
  Plus,
  Minus,
  ShoppingBag,
  X,
  ChevronDown,
  ChevronUp,
  Info,
  Check,
  Trash2,
  CreditCard,
  Banknote,
  SlidersHorizontal,
  ChefHat
} from 'lucide-react';
import { SUPPORTED_EWALLETS, EWalletLogo } from '../utils/paymentWallets';

function generateKioskId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function KioskView({ onOpenKitchen, initialKioskId }) {
  const [kioskId, setKioskId] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paramId = urlParams.get('kioskId');
    return initialKioskId || paramId || generateKioskId();
  });

  useEffect(() => {
    if (initialKioskId) {
      setKioskId(initialKioskId);
    }
  }, [initialKioskId]);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [state, setState] = useState(() => {
    try {
      const savedReceipt = sessionStorage.getItem('umami_kiosk_receipt');
      if (savedReceipt) return 'success';
    } catch (_) {}
    return 'standby'; // 'standby' | 'connected' | 'success'
  });
  const [allergens, setAllergens] = useState([]);
  const [preferences, setPreferences] = useState([]);
  const [orderedItem, setOrderedItem] = useState(null);
  const [orderReceipt, setOrderReceipt] = useState(() => {
    try {
      const savedReceipt = sessionStorage.getItem('umami_kiosk_receipt');
      if (savedReceipt) return JSON.parse(savedReceipt);
    } catch (_) {}
    return null;
  });
  const [timeLeft, setTimeLeft] = useState(90);
  const [socketConnected, setSocketConnected] = useState(false);
  const [customerBattery, setCustomerBattery] = useState(null);

  const socketRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  const [masterMenu, setMasterMenu] = useState([]);
  const [drinksMenu, setDrinksMenu] = useState([]);
  const [categoriesDb, setCategoriesDb] = useState([]);
  const [combosDb, setCombosDb] = useState([]);
  const [mixMatchDb, setMixMatchDb] = useState([]);
  const [availableAllergens, setAvailableAllergens] = useState([]);
  const [availablePreferences, setAvailablePreferences] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All Items');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDietaryFilters, setShowDietaryFilters] = useState(false);
  const [isDirectKioskMode, setIsDirectKioskMode] = useState(false);

  // Interactive Product Details Modal State
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productQty, setProductQty] = useState(1);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [selectedSpiceOrSugar, setSelectedSpiceOrSugar] = useState('Original');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [kioskStage1Warning, setKioskStage1Warning] = useState(null); // { item, conflicts, executeAdd }

  // Touchscreen Kiosk Cart & Checkout State
  const [kioskCart, setKioskCart] = useState([]);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState('summary'); // 'summary' | 'payment'
  const [checkoutPromoCode, setCheckoutPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoStatusMsg, setPromoStatusMsg] = useState({ text: '', ok: false });
  const [diningOption, setDiningOption] = useState('Dine-In');
  const [guestName, setGuestName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('E-Wallet');
  const [selectedEWallet, setSelectedEWallet] = useState('GCash');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [lanIp, setLanIp] = useState(null);
  const [wifiInfo, setWifiInfo] = useState({
    ssid: '',
    wifiConnected: false,
    signal: '',
    interfaceName: '',
    band: '',
    isDynamic: true
  });
  const [networkSyncNotice, setNetworkSyncNotice] = useState(null);
  const [isRefreshingNetwork, setIsRefreshingNetwork] = useState(false);
  const [tunnelUrl, setTunnelUrl] = useState('');
  const [tunnelPassword, setTunnelPassword] = useState('');
  const [tunnelStatus, setTunnelStatus] = useState('connecting'); // 'connecting' | 'connected' | 'disconnected'
  const [isTunnelStarting, setIsTunnelStarting] = useState(false);
  const [connectionMode, setConnectionMode] = useState('local'); // 'local' (Same Wi-Fi, default) | 'cloud' (Universal Any-Wi-Fi)
  const [copiedPin, setCopiedPin] = useState(false);
  const [refreshSuccessToast, setRefreshSuccessToast] = useState(false);
  const [customHost, setCustomHost] = useState(() => {
    try {
      const saved = (localStorage.getItem('umami_kiosk_custom_host') || '').trim();
      // Purge any stale private LAN IP stored previously so dynamic Wi-Fi detection always takes precedence
      if (/^192\.168\.|^10\.|^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(saved)) {
        localStorage.removeItem('umami_kiosk_custom_host');
        return '';
      }
      return saved;
    } catch (_) {
      return '';
    }
  });

  useEffect(() => {
    try {
      if (customHost) localStorage.setItem('umami_kiosk_custom_host', customHost);
      else localStorage.removeItem('umami_kiosk_custom_host');
    } catch (_) { }
  }, [customHost]);
  const [showIpConfig, setShowIpConfig] = useState(false);
  const [firewallFixMsg, setFirewallFixMsg] = useState(null);
  const [isFixingFirewall, setIsFixingFirewall] = useState(false);
  const [restaurantInfo, setRestaurantInfo] = useState({
    id: 'umami',
    name: 'Umami Craft Fusion',
    cuisine: 'Zero-Retention Smart Menu Terminal',
    tagline: 'A dining experience tailored to your profile.',
    backendPort: 3001,
    frontendPort: 3000
  });

  // Active Promotions for Kiosk Terminal Display
  const [promos, setPromos] = useState([]);
  const [activePromoIndex, setActivePromoIndex] = useState(0);
  const [kioskPromoClock, setKioskPromoClock] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setKioskPromoClock(Date.now()), 1500);
    return () => clearInterval(timer);
  }, []);

  // Helper to determine if a promo is currently active and unexpired
  const isPromoCurrentlyActive = (p, clockNow = Date.now()) => {
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
  };

  // Poll for promo updates every 3 seconds and sync with localStorage
  useEffect(() => {
    const fetchPromos = () => {
      fetch('/api/promos')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setPromos(data);
            try { localStorage.setItem('umami_promos', JSON.stringify(data)); } catch (_) { }
          }
        })
        .catch(() => { });
    };

    fetchPromos();
    const pollInterval = setInterval(fetchPromos, 3000);

    const handleStorageSync = (e) => {
      if (!e || e.key === 'umami_promos') {
        try {
          const saved = localStorage.getItem('umami_promos');
          if (saved) setPromos(JSON.parse(saved));
        } catch (_) { }
      }
    };
    window.addEventListener('storage', handleStorageSync);
    window.addEventListener('umami_catalog_updated', handleStorageSync);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('storage', handleStorageSync);
      window.removeEventListener('umami_catalog_updated', handleStorageSync);
    };
  }, []);

  const activePromos = useMemo(() => {
    const now = kioskPromoClock;
    return (promos || []).filter(p => {
      if (!isPromoCurrentlyActive(p, now)) return false;
      return !!(p.bannerImage || p.imageUrl || p.image);
    });
  }, [promos, kioskPromoClock]);

  // 5-second smooth promo cycling timer
  useEffect(() => {
    if (activePromos.length <= 1) return;
    const t = setInterval(() => {
      setActivePromoIndex(prev => (prev + 1) % activePromos.length);
    }, 5000);
    return () => clearInterval(t);
  }, [activePromos.length]);

  // Load restaurant metadata and menu
  useEffect(() => {
    fetch('/api/restaurant')
      .then(res => res.json())
      .then(data => {
        if (data && data.name) {
          setRestaurantInfo(prev => ({ ...prev, ...data }));
        }
      })
      .catch(err => console.error("Error fetching restaurant info:", err));

    fetch('/api/menu')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length) setMasterMenu(data);
      })
      .catch(err => {
        console.error("Error loading menu:", err);
        try {
          const saved = JSON.parse(localStorage.getItem('umami_admin_menu') || '[]');
          if (saved.length) setMasterMenu(saved);
        } catch { }
      });

    fetch('/api/drinks')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length) setDrinksMenu(data);
      })
      .catch(err => {
        console.error("Error loading drinks:", err);
        try {
          const saved = JSON.parse(localStorage.getItem('umami_drinks') || '[]');
          if (saved.length) setDrinksMenu(saved);
        } catch { }
      });

    fetch('/api/categories')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setCategoriesDb(data); })
      .catch(() => { });

    fetch('/api/combos')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setCombosDb(data); })
      .catch(() => { });

    fetch('/api/mixmatch')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setMixMatchDb(data); })
      .catch(() => { });

    fetch('/api/preferences')
      .then(res => res.json())
      .then(data => {
        if (data?.allergens) setAvailableAllergens(data.allergens);
        if (data?.flavorPreferences) setAvailablePreferences(data.flavorPreferences);
      })
      .catch(() => { });
  }, []);

  // Fetch dynamic Wi-Fi & LAN IP with optional forced re-detection
  const fetchNetworkInfo = (forceRefresh = false) => {
    fetch(`/api/network-info${forceRefresh ? '?refresh=true' : ''}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.ip && data.ip !== 'localhost') {
          setLanIp(data.ip);
        }
        if (data && data.tunnelUrl !== undefined) {
          setTunnelUrl(data.tunnelUrl || '');
        }
        if (data && data.tunnelPassword) {
          setTunnelPassword(data.tunnelPassword);
        }
        if (data && data.tunnelStatus) {
          setTunnelStatus(data.tunnelStatus);
        } else if (data && data.tunnelUrl) {
          setTunnelStatus('connected');
        }
        if (data) {
          setWifiInfo({
            ssid: data.ssid || '',
            wifiConnected: !!data.wifiConnected,
            signal: data.signal || '',
            interfaceName: data.interfaceName || '',
            band: data.band || '',
            isDynamic: true
          });
        }
        if (data && data.restaurant) {
          setRestaurantInfo(prev => ({
            ...prev,
            ...data.restaurant,
            backendPort: data.backendPort || data.restaurant.backendPort || prev.backendPort,
            frontendPort: data.port || data.restaurant.frontendPort || prev.frontendPort,
            mobileFrontendPort: data.mobileFrontendPort || data.restaurant.mobileFrontendPort || prev.mobileFrontendPort
          }));
        }
      })
      .catch(err => console.error('[Kiosk] Error fetching network info:', err));
  };

  const handleStartTunnel = async () => {
    setIsTunnelStarting(true);
    setTunnelStatus('connecting');
    try {
      const res = await fetch('/api/tunnel/start', { method: 'POST' });
      const data = await res.json();
      if (data && data.url) {
        setTunnelUrl(data.url);
        setTunnelStatus('connected');
        if (data.password) setTunnelPassword(data.password);
      } else if (data && data.status) {
        setTunnelStatus(data.status);
      }
    } catch (e) {
      console.error("[Kiosk] Failed to start tunnel:", e);
      setTunnelStatus('disconnected');
    } finally {
      setIsTunnelStarting(false);
    }
  };

  const handleStopTunnel = async () => {
    try {
      await fetch('/api/tunnel/stop', { method: 'POST' });
      setTunnelUrl('');
      setTunnelPassword('');
      setTunnelStatus('disconnected');
    } catch (e) {
      console.error("[Kiosk] Failed to stop tunnel:", e);
    }
  };

  const handleFixFirewall = async () => {
    setIsFixingFirewall(true);
    setFirewallFixMsg(null);
    try {
      const res = await fetch('/api/network/fix-firewall', { method: 'POST' });
      const data = await res.json();
      if (data && data.success) {
        setFirewallFixMsg({ type: 'success', text: 'Windows Firewall rule for ports 3000-3020 successfully added/active!' });
      } else {
        setFirewallFixMsg({ type: 'error', text: data?.details || 'Please right-click allow-firewall.bat and run as Administrator.' });
      }
    } catch (err) {
      setFirewallFixMsg({ type: 'error', text: 'Failed to apply rule: ' + err.message });
    } finally {
      setIsFixingFirewall(false);
      setTimeout(() => setFirewallFixMsg(null), 6000);
    }
  };

  const handleRefreshConnection = () => {
    setIsRefreshingNetwork(true);
    if (socketRef.current) {
      socketRef.current.emit('request-network-refresh');
    }
    fetchNetworkInfo(true);
    if (connectionMode === 'cloud' && !tunnelUrl) {
      handleStartTunnel();
    }
    setRefreshSuccessToast(true);
    setTimeout(() => {
      setIsRefreshingNetwork(false);
      setTimeout(() => setRefreshSuccessToast(false), 2400);
    }, 700);
  };

  const handleForceRedetect = () => {
    handleRefreshConnection();
  };

  useEffect(() => {
    fetchNetworkInfo(true); // Initial live Wi-Fi & LAN IP detection on mount
    // Verify cloud tunnel in the background so both Local Wi-Fi and Cloud modes stay ready
    fetch('/api/tunnel')
      .then(res => res.json())
      .then(d => {
        if (d && d.url && !d.url.includes('loca.lt')) {
          setTunnelUrl(d.url);
          if (d.password) setTunnelPassword(d.password);
        } else {
          handleStartTunnel();
        }
      })
      .catch(() => {
        handleStartTunnel();
      });

    const ipRefreshInterval = setInterval(() => fetchNetworkInfo(false), 3000); // Poll every 3s to keep Wi-Fi & IP synced
    // Re-detect immediately when the computer reconnects, switches Wi-Fi, or the kiosk tab regains focus
    const onNetworkEvent = () => fetchNetworkInfo(true);
    const onVisibility = () => { if (document.visibilityState === 'visible') fetchNetworkInfo(true); };
    window.addEventListener('online', onNetworkEvent);
    window.addEventListener('focus', onNetworkEvent);
    document.addEventListener('visibilitychange', onVisibility);
    const conn = navigator.connection;
    if (conn && conn.addEventListener) conn.addEventListener('change', onNetworkEvent);
    return () => {
      clearInterval(ipRefreshInterval);
      window.removeEventListener('online', onNetworkEvent);
      window.removeEventListener('focus', onNetworkEvent);
      document.removeEventListener('visibilitychange', onVisibility);
      if (conn && conn.removeEventListener) conn.removeEventListener('change', onNetworkEvent);
    };
  }, []);

  // Initialize Socket.io Connection
  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
      console.log("[Kiosk] Connected to socket server");
      socket.emit('join-session', { kioskId, role: 'kiosk' });
    });

    // Auto-update LAN IP, Wi-Fi network, and QR code whenever the network changes in real time
    socket.on('network-ip-changed', (data) => {
      if (data && data.ip && data.ip !== 'localhost') {
        console.log('[Kiosk] Dynamic Wi-Fi updated via socket:', data.ip, data.ssid);
        setLanIp(data.ip);
      }
      if (data && data.tunnelUrl !== undefined) {
        setTunnelUrl(data.tunnelUrl || '');
      }
      if (data && data.tunnelPassword) {
        setTunnelPassword(data.tunnelPassword);
      }
      if (data) {
        setWifiInfo({
          ssid: data.ssid || '',
          wifiConnected: !!data.wifiConnected,
          signal: data.signal || '',
          interfaceName: data.interfaceName || '',
          band: data.band || '',
          isDynamic: true
        });

        // Flash live sync notice toast so operators visually see dynamic network lock update
        if (data.ip && data.ip !== 'localhost') {
          setNetworkSyncNotice({
            ip: data.ip,
            ssid: data.ssid || 'Wi-Fi Network',
            signal: data.signal || '',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          });
          setTimeout(() => setNetworkSyncNotice(null), 4500);
        }

        setRestaurantInfo(prev => ({
          ...prev,
          backendPort: data.backendPort || prev.backendPort,
          frontendPort: data.port || prev.frontendPort,
          mobileFrontendPort: data.mobileFrontendPort || prev.mobileFrontendPort
        }));
      }
    });

    socket.on('tunnel-url-changed', (data) => {
      setTunnelUrl(data?.url || '');
      if (data?.password) setTunnelPassword(data.password);
      if (data?.url) setTunnelStatus('connected');
      console.log('[Kiosk] Cloud tunnel updated via socket:', data?.url);
    });

    socket.on('tunnel-status-changed', (data) => {
      if (data) {
        setTunnelStatus(data.status || 'disconnected');
        if (data.url) setTunnelUrl(data.url);
        if (data.password) setTunnelPassword(data.password);
        console.log('[Kiosk] Cloud tunnel status via socket:', data.status, data.url);
      }
    });
    socket.on('disconnect', () => {
      setSocketConnected(false);
      console.log("[Kiosk] Disconnected from socket server");
    });

    socket.on('promos-updated', (data) => {
      if (Array.isArray(data)) {
        setPromos(data);
        try { localStorage.setItem('umami_promos', JSON.stringify(data)); } catch (_) { }
      }
    });

    socket.on('initial-menu', (data) => {
      if (Array.isArray(data)) setMasterMenu(data);
    });

    socket.on('menu-updated', (data) => {
      if (Array.isArray(data)) setMasterMenu(data);
    });

    socket.on('initial-drinks', (data) => {
      if (Array.isArray(data)) setDrinksMenu(data);
    });

    socket.on('drinks-updated', (data) => {
      if (Array.isArray(data)) setDrinksMenu(data);
    });

    socket.on('categories-updated', (data) => {
      if (Array.isArray(data)) setCategoriesDb(data);
    });

    socket.on('combos-updated', (data) => {
      if (Array.isArray(data)) setCombosDb(data);
    });

    socket.on('mixmatch-updated', (data) => {
      if (Array.isArray(data)) setMixMatchDb(data);
    });

    socket.on('preferences-updated', (data) => {
      if (data?.allergens) setAvailableAllergens(data.allergens);
      if (data?.flavorPreferences) setAvailablePreferences(data.flavorPreferences);
    });

    // Listen for client handshake (preference projection)
    socket.on('preferences-projected', (data) => {
      console.log("[Kiosk] Received client preferences:", data);
      setAllergens(data.allergens || []);
      setPreferences(data.preferences || []);
      setState('connected');
      setTimeLeft(90); // Reset countdown to 90s
    });

    // Listen for multi-item order confirmation
    socket.on('order-placed', (data) => {
      console.log("[Kiosk] Order placed received:", data);
      const items = data.items || (data.item ? [data.item] : []);
      const count = data.itemCount || items.reduce((s, i) => s + (i.quantity || 1), 0);
      const total = data.totalPrice !== undefined ? data.totalPrice : items.reduce((s, i) => s + (i.price * (i.quantity || 1)), 0);

      const receiptObj = {
        orderId: data.orderId || data.id,
        items,
        itemCount: count,
        totalPrice: total,
        payment: data.payment,
        paymentStatus: data.paymentStatus,
        status: data.status,
        orderedTags: data.orderedTags || []
      };
      setOrderedItem(data.item || items[0]);
      setOrderReceipt(receiptObj);
      try {
        sessionStorage.setItem('umami_kiosk_receipt', JSON.stringify(receiptObj));
      } catch (_) {}
      setState('success');
    });

    socket.on('order-status-updated', (data) => {
      setOrderReceipt(prev => {
        if (!prev) return null;
        if (prev.orderId && (prev.orderId === data.orderId || prev.orderId === data.id)) {
          return {
            ...prev,
            status: data.status,
            paymentStatus: data.paymentStatus || prev.paymentStatus
          };
        }
        return prev;
      });
    });

    // Listen for mobile client disconnection
    socket.on('device-battery-synced', (data) => {
      if (data && typeof data.batteryLevel === 'number') {
        setCustomerBattery(data);
      }
    });

    socket.on('mobile-disconnected', () => {
      console.log("[Kiosk] Mobile companion disconnected. Resetting state.");
      handleReset();
    });

    return () => {
      socket.disconnect();
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [kioskId]);

  // Handle room join when kioskId changes
  useEffect(() => {
    if (socketRef.current && socketConnected) {
      socketRef.current.emit('join-session', { kioskId, role: 'kiosk' });
    }
  }, [kioskId, socketConnected]);

  // 90-Second Inactivity Countdown Timer (for mobile-paired sessions)
  useEffect(() => {
    if (state === 'connected' && !isDirectKioskMode) {
      countdownIntervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current);
            handleReset(); // Wipe memory and reset to standby
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    }

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [state, isDirectKioskMode]);

  // Success screen auto-reset after 10 seconds
  useEffect(() => {
    if (state === 'success') {
      const resetTimeout = setTimeout(() => {
        handleReset();
      }, 10000);
      return () => clearTimeout(resetTimeout);
    }
  }, [state]);

  const handleReset = () => {
    // 1. Wipe all active session variables in memory (zero-retention)
    setAllergens([]);
    setPreferences([]);
    setOrderedItem(null);
    setCustomerBattery(null);
    setOrderReceipt(null);
    try {
      sessionStorage.removeItem('umami_kiosk_receipt');
    } catch (_) {}
    setTimeLeft(90);
    setIsDirectKioskMode(false);
    setKioskCart([]);
    setSelectedProduct(null);
    setShowCheckoutModal(false);
    setSearchQuery('');
    setSelectedCategory('All Items');

    // 2. Generate a brand new kioskId for the next customer
    const newId = generateKioskId();
    setKioskId(newId);

    // 3. Revert to standby state
    setState('standby');
  };

  // Generate mobile scanner URL pointing to universal public tunnel or auto-detected dynamic LAN IP
  const isLoopback = !window.location.hostname || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const currentFrontendPort = window.location.port || restaurantInfo.frontendPort || '3000';
  const mobileTargetPort = window.location.port || restaurantInfo.mobileFrontendPort || currentFrontendPort;
  const currentBackendPort = restaurantInfo.backendPort || (currentFrontendPort === '3010' ? 3002 : (currentFrontendPort === '3020' ? 3003 : 3001));

  // Safeguard: detect if customHost holds a stale local IP from a previous Wi-Fi connection (e.g. 192.168.1.59 vs 192.168.1.18)
  const isCustomLocalIp = customHost && /^192\.168\.|^10\.|^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(customHost.trim());
  const effectiveCustomHost = (isCustomLocalIp && lanIp && customHost.trim() !== lanIp)
    ? '' // Discard outdated local IP from a different network/DHCP lease
    : customHost.trim();

  let clientUrl = '';
  let displayUrl = '';
  let isQrReady = true;

  if (connectionMode === 'cloud') {
    const effectiveCloud = (effectiveCustomHost && (effectiveCustomHost.startsWith('http://') || effectiveCustomHost.startsWith('https://')))
      ? effectiveCustomHost
      : tunnelUrl;

    if (effectiveCloud && (effectiveCloud.startsWith('http://') || effectiveCloud.startsWith('https://'))) {
      const cleanHost = effectiveCloud.replace(/\/$/, '');
      clientUrl = `${cleanHost}/?view=mobile&kioskId=${kioskId}&kioskPort=${currentBackendPort}&restaurant=${restaurantInfo.id || 'umami'}`;
      displayUrl = cleanHost;
      isQrReady = true;
    } else {
      clientUrl = '';
      displayUrl = (isTunnelStarting || tunnelStatus === 'connecting') ? 'Connecting Cloud Tunnel…' : 'Cloud Tunnel Offline';
      isQrReady = false;
    }
  } else {
    // Local Wi-Fi Mode: STRICTLY prioritize live dynamically detected LAN IP from active Wi-Fi interface
    const validLocalOverride = (effectiveCustomHost && !effectiveCustomHost.startsWith('http')) ? effectiveCustomHost : '';
    const resolvedLocalHost = (lanIp && lanIp !== 'localhost' && lanIp !== '127.0.0.1')
      ? lanIp
      : (validLocalOverride || (!isLoopback && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' ? window.location.hostname : ''));

    if (resolvedLocalHost) {
      displayUrl = `${resolvedLocalHost}:${mobileTargetPort}`;
      clientUrl = `http://${displayUrl}/?view=mobile&kioskId=${kioskId}&kioskPort=${currentBackendPort}&restaurant=${restaurantInfo.id || 'umami'}`;
      isQrReady = true;
    } else {
      displayUrl = 'Detecting Wi-Fi IP…';
      clientUrl = '';
      isQrReady = false;
    }
  }

  // Helper: Normalize item availability from database
  const isItemAvailableInDb = (item) => {
    if (!item) return false;
    if (item.available === false) return false;
    const st = String(item.status || '').toLowerCase();
    if (st === 'unavailable' || st === 'archived' || st === 'draft' || st === 'inactive' || st === 'out of stock') return false;
    if (typeof item.stock === 'number' && item.stock <= 0) return false;
    return true;
  };

  // Helper: Parse ingredients list from DB (handles both ingredientsList array and ingredients string)
  const getItemIngredientsList = (item) => {
    if (!item) return [];
    if (Array.isArray(item.ingredientsList) && item.ingredientsList.length > 0) {
      return item.ingredientsList.map(ing =>
        typeof ing === 'string'
          ? { name: ing, quantity: '', unit: '' }
          : { name: ing.name || '', quantity: ing.quantity || '', unit: ing.unit || '' }
      ).filter(i => i.name);
    }
    if (typeof item.ingredients === 'string' && item.ingredients.trim()) {
      return item.ingredients.split(',').map(part => ({
        name: part.trim(),
        quantity: '',
        unit: ''
      })).filter(i => i.name);
    }
    return [];
  };

  // Helper: Parse item add-ons from DB + curated culinary add-ons
  const getItemAddonsOptions = (item) => {
    if (!item) return [];
    const customAddons = [];
    if (Array.isArray(item.addonsList) && item.addonsList.length > 0) {
      item.addonsList.forEach(a => customAddons.push({ name: a.name || a, price: Number(a.price || 25) }));
    } else if (typeof item.addons === 'string' && item.addons.trim()) {
      item.addons.split(',').forEach(part => {
        const clean = part.trim();
        if (clean) customAddons.push({ name: clean, price: 25 });
      });
    }
    if (customAddons.length > 0) return customAddons;
    if (item.isDrink) {
      return [
        { name: 'Extra Brown Sugar Boba Pearls', price: 30 },
        { name: 'Cheese Cream Foam', price: 35 },
        { name: 'Crystal Nata Jelly', price: 25 },
        { name: 'Less Ice / Reduced Sugar', price: 0 }
      ];
    }
    return [
      { name: 'Extra Sichuan Chili Crisp', price: 25 },
      { name: 'Soft-Boiled Ajitsuke Egg', price: 45 },
      { name: 'Toasted Sesame & Scallions', price: 15 },
      { name: 'Steamed Jasmine Rice Side', price: 40 }
    ];
  };

  // Formatting & Combining Menu Items, Drinks, Combos, and Mix & Match from DB
  const formattedFoods = useMemo(() => {
    return (masterMenu || []).filter(isItemAvailableInDb).map(item => ({
      ...item,
      id: item.id || item.sku,
      sku: item.sku || item.id,
      price: Number(item.promoPrice || item.price || 0),
      originalPrice: item.promoPrice ? Number(item.price || 0) : null,
      category: item.category || 'Bowls & Mains',
      allergens: Array.isArray(item.allergens) ? item.allergens : [],
      tags: Array.isArray(item.tags) ? item.tags : [],
      ingredients: item.ingredients || '',
      ingredientsList: Array.isArray(item.ingredientsList) ? item.ingredientsList : [],
      catalogType: 'food'
    }));
  }, [masterMenu]);

  const formattedDrinks = useMemo(() => {
    return (drinksMenu || []).filter(isItemAvailableInDb).map(d => {
      const basePrice = typeof d.price === 'number' && d.price > 0
        ? d.price
        : (d.sizes && d.sizes[0] && d.sizes[0].price ? Number(d.sizes[0].price) : 75);

      let itemAllergens = Array.isArray(d.allergens) ? [...d.allergens] : [];
      if (!itemAllergens.length && (d.category?.toLowerCase().includes('milk') || d.name?.toLowerCase().includes('milk') || d.name?.toLowerCase().includes('taro'))) {
        itemAllergens = ['dairy'];
      }

      let tags = Array.isArray(d.tags) ? [...d.tags] : [];
      if (!tags.includes('sweet')) tags.push('sweet');
      if (!tags.includes('drinks')) tags.push('drinks');

      return {
        ...d,
        id: d.id || d.sku,
        sku: d.sku || d.id,
        name: d.name,
        category: d.category || 'Drinks & Boba',
        price: basePrice,
        image: d.image || 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80',
        description: d.description || `${d.name} crafted fresh with artisanal ingredients.`,
        ingredients: d.ingredients || 'Brewed Artisanal Tea Leaves, Fresh Milk / Fruit Puree, Cane Sugar Syrup, Filtered Ice',
        ingredientsList: Array.isArray(d.ingredientsList) ? d.ingredientsList : [],
        allergens: itemAllergens,
        tags,
        emoji: d.emoji || '🧋',
        isDrink: true,
        sizes: Array.isArray(d.sizes) ? d.sizes : [],
        catalogType: 'drink'
      };
    });
  }, [drinksMenu]);

  const formattedCombos = useMemo(() => {
    return (combosDb || [])
      .filter(c => String(c.status || 'active').toLowerCase() === 'active')
      .map(c => ({
        ...c,
        id: c.id,
        name: c.name,
        category: 'Combos',
        price: Number(c.promoPrice || c.originalPrice || 0),
        originalPrice: c.originalPrice ? Number(c.originalPrice) : null,
        image: c.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
        description: c.description || `Includes ${[c.main, c.side, c.drink].filter(Boolean).join(' + ')}`,
        ingredients: c.ingredients || [c.main, c.side, c.drink].filter(Boolean).join(', '),
        allergens: Array.isArray(c.allergens) ? c.allergens : [],
        tags: Array.isArray(c.tags) ? c.tags : ['savory', 'combo'],
        emoji: '🍱',
        catalogType: 'combo'
      }));
  }, [combosDb]);

  const formattedMixMatch = useMemo(() => {
    return (mixMatchDb || [])
      .filter(m => m.active !== false && String(m.status || 'active').toLowerCase() === 'active')
      .map(m => ({
        ...m,
        id: m.id,
        name: m.name,
        category: 'Mix & Match',
        price: Number(m.price || 399),
        originalPrice: m.originalPrice ? Number(m.originalPrice) : null,
        image: m.image || 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80',
        description: m.description || 'Customizable craft bundle.',
        ingredients: m.ingredients || 'Customizable Main, Appetizer & Beverage selection',
        allergens: Array.isArray(m.allergens) ? m.allergens : [],
        tags: Array.isArray(m.tags) ? m.tags : ['savory', 'mixmatch'],
        emoji: '✨',
        catalogType: 'mixmatch'
      }));
  }, [mixMatchDb]);

  // Combine full catalog: food items + drinks + combos + mix & match
  const fullCatalog = useMemo(() => {
    return [...formattedFoods, ...formattedDrinks, ...formattedCombos, ...formattedMixMatch];
  }, [formattedFoods, formattedDrinks, formattedCombos, formattedMixMatch]);

  // Helper: Map item to standardized Kiosk category tab
  const matchesKioskCategory = (item, tabName) => {
    if (tabName === 'All Items' || tabName === 'All') return true;
    const cat = String(item.category || '').toLowerCase();
    const tab = tabName.toLowerCase();
    if (tab === 'appetizers') {
      return ['appetizers', 'starters', 'sides'].includes(cat);
    }
    if (tab === 'bowls & mains') {
      return ['bowls & mains', 'rice bowls', 'mains', 'meals', 'burgers', 'chicken'].includes(cat);
    }
    if (tab === 'dimsum & bites' || tab === 'dim sum & bites') {
      return ['dimsum & bites', 'dim sum & bites', 'snacks', 'desserts', 'add-ons'].includes(cat);
    }
    if (tab === 'drinks & boba') {
      return item.isDrink || cat.includes('drink') || cat.includes('boba') || cat.includes('tea') || cat.includes('beverage');
    }
    if (tab === 'combos') {
      return item.catalogType === 'combo' || cat === 'combos';
    }
    if (tab === 'mix & match') {
      return item.catalogType === 'mixmatch' || cat.includes('mix');
    }
    return cat === tab;
  };

  // Filtering and Sorting Menu Items
  // 1. Filter out items containing user allergens
  const filteredMenu = useMemo(() => {
    return fullCatalog.filter(item => {
      const itemAllergens = Array.isArray(item.allergens) ? item.allergens : [];
      return !itemAllergens.some(allergen => allergens.map(a => a.toLowerCase()).includes(allergen.toLowerCase()));
    });
  }, [fullCatalog, allergens]);

  // 2. Count match score for preferences to sort/highlight
  const getMatchCount = useCallback((item) => {
    const itemTags = Array.isArray(item.tags) ? item.tags.map(t => t.toLowerCase()) : [];
    return itemTags.filter(tag => preferences.map(p => p.toLowerCase()).includes(tag)).length;
  }, [preferences]);

  // 3. Category tabs (matching screenshot + database categories)
  const categoriesList = useMemo(() => {
    const baseTabs = [
      'All Items',
      'Appetizers',
      'Bowls & Mains',
      'Dim Sum & Bites',
      'Noodles',
      'Drinks & Boba',
      'Combos',
      'Mix & Match'
    ];
    // Include any extra custom active categories added in Admin
    (categoriesDb || []).filter(c => c.active !== false).forEach(c => {
      if (c.name && !baseTabs.some(b => b.toLowerCase() === c.name.toLowerCase())) {
        baseTabs.push(c.name);
      }
    });
    return baseTabs;
  }, [categoriesDb]);

  const getCategoryIcon = (catName) => {
    const c = String(catName || '').toLowerCase();
    if (c.includes('all')) return '🍽️';
    if (c.includes('appetizer')) return '🥟';
    if (c.includes('bowl') || c.includes('main')) return '🍚';
    if (c.includes('dim') || c.includes('bite')) return '🥢';
    if (c.includes('noodle')) return '🍜';
    if (c.includes('drink') || c.includes('boba')) return '🧋';
    if (c.includes('combo')) return '🍱';
    if (c.includes('mix')) return '✨';
    return '🍲';
  };

  const categoryFilteredMenu = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return filteredMenu.filter(item => {
      if (!matchesKioskCategory(item, selectedCategory)) return false;
      if (!q) return true;
      const inName = String(item.name || '').toLowerCase().includes(q);
      const inDesc = String(item.description || '').toLowerCase().includes(q);
      const inIng = String(item.ingredients || '').toLowerCase().includes(q);
      const inCat = String(item.category || '').toLowerCase().includes(q);
      const inTags = (item.tags || []).some(t => String(t).toLowerCase().includes(q));
      return inName || inDesc || inIng || inCat || inTags;
    });
  }, [filteredMenu, selectedCategory, searchQuery]);

  // 4. Sort so that items matching the most preferences appear first
  const sortedMenu = useMemo(() => {
    return [...categoryFilteredMenu].sort((a, b) => {
      const scoreA = getMatchCount(a);
      const scoreB = getMatchCount(b);
      return scoreB - scoreA;
    });
  }, [categoryFilteredMenu, getMatchCount]);

  // Interactive Product Modal & Cart Helpers
  const openProductDetails = (item) => {
    setSelectedProduct(item);
    setProductQty(1);
    setSelectedSize(item.sizes && item.sizes.length > 0 ? item.sizes[0] : null);
    setSelectedAddons([]);
    setSelectedSpiceOrSugar(item.isDrink ? '100% Sugar • Regular Ice' : 'Original');
    setSpecialInstructions('');
  };

  const toggleAddon = (addon) => {
    setSelectedAddons(prev =>
      prev.some(a => a.name === addon.name)
        ? prev.filter(a => a.name !== addon.name)
        : [...prev, addon]
    );
  };

  const modalUnitPrice = useMemo(() => {
    if (!selectedProduct) return 0;
    const base = selectedSize ? Number(selectedSize.price || selectedProduct.price || 0) : Number(selectedProduct.price || 0);
    const addonsSum = selectedAddons.reduce((s, a) => s + Number(a.price || 0), 0);
    return base + addonsSum;
  }, [selectedProduct, selectedSize, selectedAddons]);

  const commitAddToCartFromModal = () => {
    if (!selectedProduct) return;
    const prefLabel = selectedProduct.isDrink ? `Prep: ${selectedSpiceOrSugar}` : (selectedSpiceOrSugar !== 'Original' ? `Spice: ${selectedSpiceOrSugar}` : '');
    const cartKey = `${selectedProduct.id}__${selectedSize ? selectedSize.label || selectedSize.name : 'std'}__${selectedSpiceOrSugar}__${selectedAddons.map(a => a.name).sort().join('|')}__${specialInstructions.trim()}`;
    setKioskCart(prev => {
      const existing = prev.find(c => c.cartKey === cartKey);
      if (existing) {
        return prev.map(c => c.cartKey === cartKey ? { ...c, quantity: c.quantity + productQty } : c);
      }
      return [
        ...prev,
        {
          cartKey,
          id: selectedProduct.id,
          name: selectedProduct.name,
          image: selectedProduct.image,
          emoji: selectedProduct.emoji || '🍽️',
          category: selectedProduct.category,
          price: modalUnitPrice,
          quantity: productQty,
          size: selectedSize ? (selectedSize.label || selectedSize.name) : null,
          addons: selectedAddons,
          specialInstructions: specialInstructions.trim(),
          tags: selectedProduct.tags || [],
          allergens: Array.isArray(selectedProduct.allergens) ? selectedProduct.allergens : [],
          ingredients: selectedProduct.ingredients || '',
          customizations: [
            ...(selectedSize ? [`Size: ${selectedSize.label || selectedSize.name}`] : []),
            ...(prefLabel ? [prefLabel] : []),
            ...selectedAddons.map(a => `+ ${a.name} (₱${a.price})`),
            ...(specialInstructions.trim() ? [`Note: ${specialInstructions.trim()}`] : [])
          ]
        }
      ];
    });
    setSelectedProduct(null);
    setKioskStage1Warning(null);
  };

  const handleAddToCartFromModal = () => {
    if (!selectedProduct) return;
    const conflicts = getConflictingAllergens(selectedProduct, allergens);
    if (conflicts.length > 0) {
      setKioskStage1Warning({
        item: selectedProduct,
        conflicts,
        executeAdd: () => commitAddToCartFromModal()
      });
      return;
    }
    commitAddToCartFromModal();
  };

  const commitQuickAddToCart = (item) => {
    const firstSize = item.sizes && item.sizes.length > 0 ? item.sizes[0] : null;
    const unitPrice = firstSize ? Number(firstSize.price || item.price || 0) : Number(item.price || 0);
    const cartKey = `${item.id}__${firstSize ? (firstSize.label || firstSize.name) : 'std'}____`;
    setKioskCart(prev => {
      const existing = prev.find(c => c.cartKey === cartKey);
      if (existing) {
        return prev.map(c => c.cartKey === cartKey ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [
        ...prev,
        {
          cartKey,
          id: item.id,
          name: item.name,
          image: item.image,
          emoji: item.emoji || '🍽️',
          category: item.category,
          price: unitPrice,
          quantity: 1,
          size: firstSize ? (firstSize.label || firstSize.name) : null,
          addons: [],
          specialInstructions: '',
          tags: item.tags || [],
          allergens: Array.isArray(item.allergens) ? item.allergens : [],
          ingredients: item.ingredients || '',
          customizations: firstSize ? [`Size: ${firstSize.label || firstSize.name}`] : []
        }
      ];
    });
    setKioskStage1Warning(null);
  };

  const handleQuickAddToCart = (e, item) => {
    e.stopPropagation();
    const conflicts = getConflictingAllergens(item, allergens);
    if (conflicts.length > 0) {
      setKioskStage1Warning({
        item,
        conflicts,
        executeAdd: () => commitQuickAddToCart(item)
      });
      return;
    }
    commitQuickAddToCart(item);
  };

  const kioskCartSubtotal = useMemo(() => {
    return kioskCart.reduce((sum, item) => sum + (Number(item.price || 0) * (item.quantity || 1)), 0);
  }, [kioskCart]);

  const kioskCartCount = useMemo(() => {
    return kioskCart.reduce((sum, item) => sum + (item.quantity || 1), 0);
  }, [kioskCart]);

  const kioskDiscountAmount = useMemo(() => {
    if (!appliedPromo) return 0;
    if (appliedPromo.discountType === 'percentage' || appliedPromo.type === 'percentage') {
      return Math.round((kioskCartSubtotal * Number(appliedPromo.discountValue || appliedPromo.value || 0)) / 100);
    }
    return Math.min(kioskCartSubtotal, Number(appliedPromo.discountValue || appliedPromo.value || 0));
  }, [appliedPromo, kioskCartSubtotal]);

  const kioskCartTotal = Math.max(0, kioskCartSubtotal - kioskDiscountAmount);
  const kioskVatAmount = Math.round((kioskCartTotal / 1.12) * 0.12 * 100) / 100;
  const kioskVatableSales = Math.round((kioskCartTotal - kioskVatAmount) * 100) / 100;

  const handleApplyCheckoutPromo = async (codeOverride) => {
    const code = String(codeOverride || checkoutPromoCode || '').trim().toUpperCase();
    if (!code) {
      setPromoStatusMsg({ text: 'Enter a promo code first.', ok: false });
      return;
    }
    try {
      const res = await fetch(`/api/promos/validate/${encodeURIComponent(code)}`);
      const data = await res.json();
      if (res.ok && data?.promo) {
        setAppliedPromo(data.promo);
        setCheckoutPromoCode(code);
        setPromoStatusMsg({ text: `Applied ${code}: ${data.promo.bannerTitle || data.promo.name}!`, ok: true });
      } else {
        setAppliedPromo(null);
        setPromoStatusMsg({ text: data?.error || 'Promo code is invalid or expired.', ok: false });
      }
    } catch {
      setPromoStatusMsg({ text: 'Unable to validate promo right now.', ok: false });
    }
  };

  const handleSubmitKioskOrder = async (modalOrderData = null) => {
    const effectiveCart = (modalOrderData?.items && modalOrderData.items.length > 0) ? modalOrderData.items : kioskCart;
    if (effectiveCart.length === 0 || isSubmittingOrder) return;
    setIsSubmittingOrder(true);
    const orderId = modalOrderData?.orderId || `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const allOrderedTags = Array.from(new Set(effectiveCart.flatMap(i => i.tags || [])));
    const chosenPayment = modalOrderData?.paymentMethod || (paymentMethod === 'E-Wallet' ? selectedEWallet : paymentMethod);
    const isCashImmediate = chosenPayment === 'Cash';
    const isAlreadySettled = Boolean(modalOrderData?._alreadySettled);
    const effectiveTotal = modalOrderData?.finalTotal !== undefined ? modalOrderData.finalTotal : kioskCartTotal;

    const payload = {
      orderId,
      kioskId,
      customer: modalOrderData?.customer || guestName.trim() || `Kiosk Guest (${kioskId})`,
      diningOption: modalOrderData?.diningOption || diningOption,
      orderType: modalOrderData?.diningOption || diningOption,
      tableNumber: `Kiosk ${kioskId}`,
      location: `Kiosk ${kioskId}`,
      payment: chosenPayment,
      paymentMethod: chosenPayment,
      paymentCategory: modalOrderData?.paymentCategory || paymentMethod,
      selectedEWallet: modalOrderData?.selectedEWallet || (paymentMethod === 'E-Wallet' ? selectedEWallet : null),
      paymentStatus: (isCashImmediate || isAlreadySettled) ? 'Approved' : 'Pending',
      isPaymentVerified: isCashImmediate || isAlreadySettled,
      status: (isCashImmediate || isAlreadySettled) ? 'New' : 'Pending Payment Verification',
      device: 'Kiosk Touchscreen',
      platform: 'Kiosk Touchscreen',
      items: effectiveCart.map(c => ({
        id: c.id,
        name: c.size ? `${c.name} (${c.size})` : c.name,
        quantity: c.quantity || c.qty || 1,
        qty: c.quantity || c.qty || 1,
        price: c.price,
        image: c.image,
        emoji: c.emoji,
        tags: c.tags,
        customizations: c.customizations
      })),
      itemCount: effectiveCart.reduce((sum, c) => sum + (c.quantity || c.qty || 1), 0),
      totalPrice: effectiveTotal,
      total: effectiveTotal,
      subtotal: modalOrderData?.subtotal !== undefined ? modalOrderData.subtotal : kioskCartSubtotal,
      discountAmount: modalOrderData?.discountAmount !== undefined ? modalOrderData.discountAmount : kioskDiscountAmount,
      taxAmount: modalOrderData?.taxAmount !== undefined ? modalOrderData.taxAmount : (effectiveTotal - (effectiveTotal / 1.12)),
      orderedTags: allOrderedTags,
      allergens
    };

    if (socketRef.current && socketConnected) {
      socketRef.current.emit('place-order', payload);
    }

    setOrderedItem(payload.items[0]);
    const receiptObj = {
      orderId,
      pickupToken: modalOrderData?.pickupToken || `U-${Math.floor(100 + Math.random() * 900)}`,
      items: payload.items,
      itemCount: payload.itemCount,
      totalPrice: effectiveTotal,
      payment: chosenPayment,
      paymentStatus: payload.paymentStatus,
      status: payload.status,
      orderedTags: allOrderedTags
    };
    setOrderReceipt(receiptObj);
    try {
      sessionStorage.setItem('umami_kiosk_receipt', JSON.stringify(receiptObj));
    } catch (_) {}
    setKioskCart([]);
    setAppliedPromo(null);
    setCheckoutPromoCode('');
    setShowCheckoutModal(false);
    setIsSubmittingOrder(false);
    setState('success');
    return payload;
  };

  // Extract combined unique tags from receipt items
  const combinedReceiptTags = orderReceipt && orderReceipt.items
    ? Array.from(new Set(orderReceipt.items.flatMap(i => i.tags || [])))
    : [];

  return (
    <div className="kiosk-container fade-in">
      {/* Kiosk Header */}
      <header className="kiosk-header">
        <div className="kiosk-header-top-row">
          <div className="kiosk-header-brand">
            <img
              src="/brand-logo.png"
              alt="Umami Craft Fusion"
              className="kiosk-brand-logo"
            />
            <div className="kiosk-brand-text">
              <h1 className="kiosk-brand-title">
                {restaurantInfo.name.toUpperCase()}
              </h1>
              <span className="kiosk-brand-subtitle">
                {restaurantInfo.cuisine.toUpperCase()} • SMART TERMINAL
              </span>
            </div>
          </div>

          <button
            onClick={() => setShowIpConfig(prev => !prev)}
            className="kiosk-pill-settings"
            title="Kiosk Settings & Network Configuration"
          >
            <Settings size={16} />
          </button>
        </div>

        <div className="kiosk-header-actions">
          {/* Dynamic Wi-Fi Status Pill */}
          <div
            className="kiosk-pill-btn kiosk-pill-wifi"
            onClick={() => setShowIpConfig(prev => !prev)}
            title="Dynamic Wi-Fi & Real-Time Sync Status (Click to inspect)"
            style={{ cursor: 'pointer' }}
          >
            <div className={`pulse-indicator ${wifiInfo.wifiConnected || lanIp ? 'active' : 'warning'}`}></div>
            <Wifi size={13} color={wifiInfo.wifiConnected || lanIp ? '#059669' : '#D97706'} />
            <span className="kiosk-pill-label">
              {wifiInfo.ssid ? `Wi-Fi: ${wifiInfo.ssid}` : (lanIp ? `IP: ${lanIp}` : 'Detecting Wi-Fi…')}
            </span>
          </div>

          {/* Real-Time Sync Status Pill */}
          <div
            className="kiosk-pill-btn kiosk-pill-sync"
            title="Real-Time Socket & Network Synchronization Status"
          >
            <div className={`pulse-indicator ${socketConnected ? 'active' : 'disconnected'}`}></div>
            <span className="kiosk-pill-label">
              Real-Time Sync: {socketConnected ? 'Active' : 'Offline'}
            </span>
          </div>

          <div className="kiosk-pill-btn kiosk-pill-id">
            <Monitor size={14} color="#059669" className="kiosk-pill-icon" />
            <span className="kiosk-pill-label">
              Kiosk #{kioskId}
            </span>
            <ChevronRight size={13} color="#059669" className="kiosk-pill-chevron" />
          </div>

          <button
            onClick={() => setShowIpConfig(prev => !prev)}
            className="kiosk-pill-settings kiosk-pill-settings-desktop"
            title="Kiosk Settings & Network Configuration"
          >
            <Settings size={16} />
          </button>
        </div>
      </header>

      {/* Dynamic Network Synchronization Notification Toast */}
      {networkSyncNotice && (
        <div className="dynamic-network-sync-toast slide-down">
          <div className="sync-toast-icon">
            <Wifi size={14} color="#ffffff" />
          </div>
          <div className="sync-toast-content">
            <span className="sync-toast-title">Dynamic Wi-Fi Synchronized</span>
            <span className="sync-toast-details">
              SSID: <strong>{networkSyncNotice.ssid || 'Wi-Fi Network'}</strong> • IP: <strong>{networkSyncNotice.ip}</strong>
            </span>
          </div>
          <span className="sync-toast-time">{networkSyncNotice.time}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>

        {/* STATE A: STANDBY VIEW */}
        {state === 'standby' && (
          <div className="kiosk-hero-layout slide-up">
            {/* Left Column: Headline, Features, Simulation Card */}
            <div>
              <div style={{
                fontSize: '11px',
                fontWeight: '800',
                letterSpacing: '0.22em',
                color: '#A07255',
                textTransform: 'uppercase',
                marginBottom: '10px'
              }}>
                GOOD FOOD. A SMARTER WAY.
              </div>

              <div style={{ fontSize: '46px', fontWeight: 800, lineHeight: 1.12, letterSpacing: '-0.02em', color: '#1C1917' }}>
                Bowls, Dumplings &amp;
              </div>
              <div style={{ fontSize: '46px', fontWeight: 800, lineHeight: 1.12, letterSpacing: '-0.02em', color: '#C24522', marginBottom: '16px' }}>
                Artisanal Street Noodles
              </div>

              <p style={{
                color: '#6E645A',
                fontSize: '15px',
                marginBottom: '24px',
                maxWidth: '540px',
                fontWeight: '400',
                lineHeight: '1.6'
              }}>
                Scan the QR code with your phone. Select your dietary needs in private, and project a safe, custom menu here instantly. Zero logs, zero database.
              </p>

              {/* 4 Feature Badges in Row */}
              <div className="kiosk-feature-row">
                <div className="kiosk-feature-chip">
                  <div className="kiosk-feature-icon-circle" style={{ background: 'rgba(228, 87, 41, 0.12)' }}>
                    <ShieldCheck size={18} color="#C24522" />
                  </div>
                  <div>
                    <div className="kiosk-feature-chip-title">Privacy-First</div>
                    <div className="kiosk-feature-chip-desc">Your data stays on your device</div>
                  </div>
                </div>

                <div className="kiosk-feature-chip">
                  <div className="kiosk-feature-icon-circle" style={{ background: 'rgba(16, 185, 129, 0.12)' }}>
                    <Leaf size={18} color="#059669" />
                  </div>
                  <div>
                    <div className="kiosk-feature-chip-title">Dietary Friendly</div>
                    <div className="kiosk-feature-chip-desc">Allergies &amp; preferences</div>
                  </div>
                </div>

                <div className="kiosk-feature-chip">
                  <div className="kiosk-feature-icon-circle" style={{ background: 'rgba(245, 158, 11, 0.15)' }}>
                    <Zap size={18} color="#D97706" />
                  </div>
                  <div>
                    <div className="kiosk-feature-chip-title">Instant Results</div>
                    <div className="kiosk-feature-chip-desc">Personalized menu in seconds</div>
                  </div>
                </div>

                <div className="kiosk-feature-chip">
                  <div className="kiosk-feature-icon-circle" style={{ background: 'rgba(59, 130, 246, 0.12)' }}>
                    <Smartphone size={18} color="#2563EB" />
                  </div>
                  <div>
                    <div className="kiosk-feature-chip-title">No App Needed</div>
                    <div className="kiosk-feature-chip-desc">Just scan &amp; go</div>
                  </div>
                </div>
              </div>

              {/* 5-Second Auto-Cycling Promotional Banner on Kiosk Terminal */}
              {activePromos.length > 0 && (() => {
                const currentPromo = activePromos[activePromoIndex % activePromos.length];
                if (!currentPromo) return null;
                const discountBadge = currentPromo.discountType === 'percent'
                  ? `${currentPromo.discountValue}% OFF`
                  : `₱${currentPromo.discountValue} OFF`;
                const bannerImg = currentPromo.bannerImage || currentPromo.imageUrl || currentPromo.image || '/ramen_promo_banner.png';

                return (
                  <div
                    style={{
                      borderRadius: '20px',
                      overflow: 'hidden',
                      marginBottom: '20px',
                      boxShadow: '0 8px 24px rgba(44, 26, 17, 0.08)',
                      border: '1.5px solid rgba(194, 69, 34, 0.25)',
                      background: currentPromo.bannerBg || '#1c1917',
                      position: 'relative'
                    }}
                  >
                    <div style={{ position: 'relative', height: '140px', width: '100%', overflow: 'hidden' }}>
                      <img
                        src={bannerImg}
                        alt={currentPromo.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/ramen_promo_banner.png';
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'linear-gradient(180deg, rgba(28,25,23,0.3) 0%, rgba(28,25,23,0.7) 45%, rgba(28,25,23,0.96) 100%)'
                        }}
                      />

                      {/* Header Badge */}
                      <div style={{ position: 'absolute', top: '10px', left: '12px', right: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.2)', padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, color: '#fff', letterSpacing: '0.04em' }}>
                          SPECIAL OFFERS
                        </span>
                        <span style={{ background: 'linear-gradient(135deg, #f97316, #dc2626)', color: '#fff', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Sparkles size={11} />
                          {discountBadge}
                        </span>
                      </div>

                      {/* Title & Code */}
                      <div style={{ position: 'absolute', bottom: '10px', left: '12px', right: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div>
                          <div style={{ color: '#fff', fontSize: '15px', fontWeight: 800 }}>
                            {currentPromo.bannerTitle || currentPromo.name}
                          </div>
                          <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '11px', marginTop: '2px' }}>
                            {currentPromo.applyToAll ? 'Applies storewide to all menu items' : `Applies to: ${(currentPromo.applicableItems || []).join(', ')}`}
                          </div>
                        </div>
                        <div style={{ background: '#ffffff', color: '#C24522', padding: '5px 12px', borderRadius: '8px', fontWeight: 800, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                          <Tag size={12} />
                          <span>CODE: {currentPromo.code}</span>
                        </div>
                      </div>
                    </div>

                    {/* Indicator Dots */}
                    {activePromos.length > 1 && (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', padding: '5px 0', background: 'rgba(28,25,23,0.98)' }}>
                        {activePromos.map((p, idx) => {
                          const isActive = (activePromoIndex % activePromos.length) === idx;
                          return (
                            <div
                              key={p.id || idx}
                              style={{
                                height: '4px',
                                width: isActive ? '18px' : '6px',
                                borderRadius: '999px',
                                background: isActive ? '#f97316' : 'rgba(255,255,255,0.25)',
                                transition: 'all 0.3s ease'
                              }}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Single-Screen Simulation Tool Card */}
              <div className="kiosk-sim-card">
                <img
                  src="/phone-mockup.png"
                  alt="Phone Scanner Simulation"
                  style={{ width: '74px', height: '90px', objectFit: 'contain', flexShrink: 0 }}
                />
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontWeight: '700', marginBottom: '4px', fontSize: '15px', color: '#1C1917' }}>
                    Single-Screen Simulation Tool
                  </h4>
                  <p style={{ color: '#746A60', fontSize: '12px', lineHeight: '1.4', marginBottom: '10px' }}>
                    Testing on a single device? Click below to launch a simulated mobile scanner window side-by-side.
                  </p>
                  <a
                    href={clientUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="kiosk-sim-btn"
                  >
                    <Play size={12} fill="#ffffff" />
                    <span>Simulate Mobile Scan</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Center Column: Polished QR Code Card with Dynamic Wi-Fi & Live Sync */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div className="kiosk-qr-card">
                <div className="qr-top-pill">
                  <Smartphone size={13} color="#C24522" />
                  <span>SCAN TO START</span>
                </div>

                <div style={{ background: '#ffffff', padding: '12px', borderRadius: '20px', boxShadow: '0 4px 14px rgba(44, 26, 17, 0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '219px', minHeight: '219px', boxSizing: 'border-box' }}>
                  {isQrReady && clientUrl ? (
                    <QRCodeSVG value={clientUrl} size={195} level="H" includeMargin={false} />
                  ) : (
                    <div style={{
                      width: '195px',
                      height: '195px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#FAF8F5',
                      borderRadius: '16px',
                      border: '1.5px dashed rgba(245, 158, 11, 0.4)',
                      padding: '12px',
                      textAlign: 'center',
                      boxSizing: 'border-box'
                    }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'rgba(245, 158, 11, 0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '8px'
                      }}>
                        <RefreshCw size={20} className="spin" color="#D97706" />
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#B45309', marginBottom: '3px' }}>
                        {connectionMode === 'cloud'
                          ? (isTunnelStarting || tunnelStatus === 'connecting' ? 'Connecting Tunnel…' : 'Tunnel Offline')
                          : 'Detecting Wi-Fi IP…'}
                      </div>
                      <div style={{ fontSize: '10px', color: '#786456', lineHeight: 1.3, marginBottom: '8px' }}>
                        {connectionMode === 'cloud'
                          ? (isTunnelStarting || tunnelStatus === 'connecting'
                              ? 'Generating Any-Wi-Fi HTTPS URL. Or tap Local Wi-Fi below.'
                              : 'Could not reach cloud tunnel. Switch to Local Wi-Fi.')
                          : `Identifying active IP address on ${wifiInfo.ssid || 'Wi-Fi network'}…`}
                      </div>
                      {connectionMode === 'cloud' ? (
                        <button
                          type="button"
                          onClick={() => setConnectionMode('local')}
                          style={{
                            background: '#2563EB',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '3px 8px',
                            fontSize: '10px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Use Local Wi-Fi
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleRefreshConnection}
                          style={{
                            background: '#059669',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '3px 8px',
                            fontSize: '10px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Re-detect IP
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="qr-divider">
                  <span>Scan to Personalize</span>
                </div>

                <div style={{ fontSize: '12px', color: '#685D54', marginBottom: '4px' }}>
                  Kiosk ID: <strong style={{ color: '#1C1917' }}>{kioskId}</strong>
                </div>

                {/* Connection Mode Selector Tabs (Universal Any-Wi-Fi vs Local LAN) */}
                <div style={{
                  display: 'inline-flex',
                  background: 'rgba(44, 26, 17, 0.05)',
                  padding: '3px',
                  borderRadius: '16px',
                  marginBottom: '8px',
                  gap: '3px'
                }}>
                  <button
                    type="button"
                    onClick={() => {
                      setConnectionMode('cloud');
                      if (!tunnelUrl && !isTunnelStarting) handleStartTunnel();
                    }}
                    style={{
                      border: 'none',
                      borderRadius: '13px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: connectionMode === 'cloud' ? '#059669' : 'transparent',
                      color: connectionMode === 'cloud' ? '#ffffff' : '#685D54',
                      boxShadow: connectionMode === 'cloud' ? '0 2px 6px rgba(5,150,105,0.25)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Globe size={11} />
                    <span>Any-Wi-Fi (Cloud)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConnectionMode('local');
                      fetchNetworkInfo(true);
                    }}
                    style={{
                      border: 'none',
                      borderRadius: '13px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: connectionMode === 'local' ? '#2563eb' : 'transparent',
                      color: connectionMode === 'local' ? '#ffffff' : '#685D54',
                      boxShadow: connectionMode === 'local' ? '0 2px 6px rgba(37,99,235,0.25)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Wifi size={11} />
                    <span>Local Wi-Fi</span>
                  </button>
                </div>

                <div style={{ marginBottom: '6px' }}>
                  {connectionMode === 'cloud' ? (
                    isQrReady && displayUrl ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '3px 9px',
                          borderRadius: '12px',
                          background: 'rgba(5, 150, 105, 0.12)',
                          border: '1px solid rgba(5, 150, 105, 0.25)',
                          fontSize: '11px',
                          fontWeight: 800,
                          color: '#059669'
                        }}>
                          <Globe size={13} color="#059669" />
                          <span>Universal Cloud Mode (Works Anywhere)</span>
                        </div>
                        {tunnelPassword && (
                          <div
                            onClick={() => {
                              if (navigator.clipboard) {
                                navigator.clipboard.writeText(tunnelPassword);
                                setCopiedPin(true);
                                setTimeout(() => setCopiedPin(false), 2000);
                              }
                            }}
                            title="If loca.lt asks for an IP password on your phone, click to copy this PIN"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '8px',
                              background: 'rgba(5, 150, 105, 0.08)',
                              border: '1px dashed #059669',
                              fontSize: '10.5px',
                              fontWeight: 700,
                              color: '#065f46',
                              cursor: 'pointer'
                            }}
                          >
                            <span>PIN if asked: <code style={{ color: '#047857' }}>{tunnelPassword}</code></span>
                            <span style={{ fontSize: '9px', color: '#059669' }}>({copiedPin ? 'Copied!' : 'Copy'})</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '3px 9px',
                        borderRadius: '12px',
                        background: 'rgba(245, 158, 11, 0.12)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#b45309'
                      }}>
                        <RefreshCw size={11} className="spin" color="#b45309" />
                        <span>{isTunnelStarting || tunnelStatus === 'connecting' ? 'Connecting Cloud Tunnel…' : 'Cloud Tunnel Offline'}</span>
                      </div>
                    )
                  ) : (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '3px 9px',
                      borderRadius: '12px',
                      background: 'rgba(59, 130, 246, 0.12)',
                      border: '1px solid rgba(59, 130, 246, 0.25)',
                      fontSize: '11px',
                      fontWeight: 800,
                      color: '#2563eb'
                    }}>
                      <Wifi size={13} color="#2563eb" />
                      <span>Dynamic Wi-Fi: {wifiInfo.ssid || 'Local LAN'}</span>
                    </div>
                  )}
                </div>

                <div style={{ fontSize: '11.5px', color: '#685D54', marginBottom: '8px', wordBreak: 'break-all' }}>
                  URL:{' '}
                  {clientUrl ? (
                    <a
                      href={clientUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#059669', fontWeight: 700, textDecoration: 'none' }}
                      title="Open Mobile Personalizer on Local Wi-Fi"
                    >
                      {displayUrl}
                    </a>
                  ) : (
                    <span style={{ color: (connectionMode === 'cloud' && !isQrReady) ? '#D97706' : '#059669', fontWeight: 700 }}>
                      {displayUrl}
                    </span>
                  )}
                </div>

                {connectionMode === 'local' && (
                  <div style={{ fontSize: '10.5px', color: '#8A7F76', marginBottom: '8px', lineHeight: 1.4 }}>
                    Connect your phone to Wi-Fi <strong style={{ color: '#2563eb' }}>{wifiInfo.ssid || 'same network'}</strong> and turn off mobile data before scanning.
                  </div>
                )}

                {/* Live Functional Refresh Connection Button */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                  <button
                    type="button"
                    onClick={handleRefreshConnection}
                    disabled={isRefreshingNetwork}
                    style={{
                      background: refreshSuccessToast ? '#059669' : 'rgba(44, 26, 17, 0.06)',
                      color: refreshSuccessToast ? '#ffffff' : '#3C2A21',
                      border: '1px solid rgba(44, 26, 17, 0.12)',
                      borderRadius: '8px',
                      padding: '4px 12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      transition: 'all 0.2s ease'
                    }}
                    title="Re-detect network IP, refresh cloud tunnel, and update QR code"
                  >
                    <RefreshCw size={12} className={isRefreshingNetwork ? 'spin' : ''} />
                    <span>{refreshSuccessToast ? '✓ Connection Refreshed!' : (isRefreshingNetwork ? 'Checking Network…' : 'Refresh Connection')}</span>
                  </button>
                </div>

                <button
                  onClick={() => setShowIpConfig(prev => !prev)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontWeight: '600'
                  }}
                >
                  <Settings size={12} />
                  <span>{showIpConfig ? '▲ Hide Settings' : 'Change IP / Troubleshooting'}</span>
                </button>

                {showIpConfig && (
                  <div className="fade-in" style={{
                    background: 'var(--bg-surface-elevated)',
                    padding: '12px 14px',
                    borderRadius: '14px',
                    border: '1px solid var(--border-glass)',
                    marginTop: '10px',
                    width: '100%',
                    textAlign: 'left'
                  }}>
                    {/* Universal Cloud Tunnel Section for ANY Wi-Fi / Mobile Data */}
                    <div style={{
                      background: 'rgba(5, 150, 105, 0.08)',
                      border: '1.5px solid rgba(5, 150, 105, 0.3)',
                      borderRadius: '10px',
                      padding: '10px',
                      marginBottom: '10px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Globe size={14} color="#059669" />
                          <span style={{ fontSize: '11px', fontWeight: 800, color: '#059669' }}>
                            Universal Any-Wi-Fi Mode
                          </span>
                        </div>
                        {tunnelUrl ? (
                          <button
                            onClick={handleStopTunnel}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ef4444',
                              fontSize: '10px',
                              fontWeight: 800,
                              cursor: 'pointer'
                            }}
                          >
                            ✕ Stop Tunnel
                          </button>
                        ) : (
                          <button
                            onClick={handleStartTunnel}
                            disabled={isTunnelStarting}
                            style={{
                              background: '#059669',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '4px 8px',
                              fontSize: '10.5px',
                              fontWeight: 800,
                              cursor: 'pointer'
                            }}
                          >
                            {isTunnelStarting ? 'Starting…' : '🌐 Enable Cloud Tunnel'}
                          </button>
                        )}
                      </div>
                      <p style={{ margin: 0, fontSize: '10px', color: '#065f46', lineHeight: 1.35 }}>
                        {tunnelUrl ? (
                          <>Public Cloud Tunnel Active! Customers on <strong>ANY Wi-Fi</strong>, 4G, or 5G can scan and access without router isolation issues.</>
                        ) : (
                          <>If phones get <strong>ERR_ADDRESS_UNREACHABLE</strong>, click &quot;Enable Cloud Tunnel&quot; so the QR code works on <strong>ANY Wi-Fi or Cellular Data</strong>.</>
                        )}
                      </p>
                    </div>

                    {/* Live Dynamic Status Grid */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{
                          width: '7px', height: '7px', borderRadius: '50%',
                          background: lanIp ? '#10b981' : '#f59e0b',
                          flexShrink: 0
                        }} />
                        <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                          Dynamic Local Wi-Fi
                        </span>
                      </div>
                      <button
                        onClick={handleForceRedetect}
                        disabled={isRefreshingNetwork}
                        style={{
                          background: 'rgba(5, 150, 105, 0.1)',
                          border: '1px solid rgba(5, 150, 105, 0.25)',
                          color: '#059669',
                          borderRadius: '6px',
                          padding: '3px 7px',
                          fontSize: '10px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <RefreshCw size={10} className={isRefreshingNetwork ? 'spin' : ''} />
                        <span>{isRefreshingNetwork ? 'Scanning…' : 'Re-detect'}</span>
                      </button>
                    </div>

                    <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px', color: '#443831' }}>
                      <div>Wi-Fi SSID: <strong style={{ color: '#1C1917' }}>{wifiInfo.ssid || 'Auto-Sync / Local LAN'}</strong> {wifiInfo.signal && <span style={{ color: '#059669' }}>({wifiInfo.signal})</span>}</div>
                      <div>Active IP: <strong style={{ color: '#059669', fontFamily: 'monospace' }}>{lanIp || 'Detecting…'}</strong></div>
                      <div>Adapter: <span style={{ color: '#786456' }}>{wifiInfo.interfaceName || 'Wi-Fi'}</span></div>
                      <div>Mode: <span style={{ color: '#059669', fontWeight: 600 }}>Dynamic Real-Time Lock</span></div>
                    </div>

                    <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                      Custom Public URL / Host Override:
                    </label>
                    <input
                      type="text"
                      value={customHost}
                      placeholder={tunnelUrl || (lanIp ? `Auto Dynamic: ${lanIp}` : 'https://xxx.loca.lt or 192.168.x.x')}
                      onChange={(e) => setCustomHost(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-glass)',
                        fontSize: '11px',
                        marginBottom: '6px',
                        fontFamily: 'var(--font-sans)',
                        background: '#ffffff',
                        color: 'var(--text-primary)'
                      }}
                    />
                    {customHost && (
                      <button
                        onClick={() => setCustomHost('')}
                        style={{ fontSize: '10px', color: '#C24522', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '700', padding: '0 0 4px 0' }}
                      >
                        ✕ Clear override — return to Dynamic Auto ({lanIp})
                      </button>
                    )}
                    <div style={{ marginTop: '10px', padding: '10px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', fontSize: '11px', color: '#991B1B', lineHeight: '1.45' }}>
                      <strong style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '13px' }}>🛠️</span> Troubleshooting Phone Scanner &quot;Site Can&apos;t Be Reached&quot;:
                      </strong>
                      <div style={{ marginBottom: '4px' }}>
                        <strong>1. Wi-Fi Connection:</strong> Ensure your phone is connected to <strong>&quot;{wifiInfo.ssid || 'the same Wi-Fi as this kiosk'}&quot;</strong>.
                      </div>
                      <div style={{ marginBottom: '4px' }}>
                        <strong>2. Turn OFF Mobile Cellular Data:</strong> Disable 4G/5G on your phone. Mobile browsers often send 192.168.x.x requests through cellular carrier antennas instead of local Wi-Fi, triggering <code>ERR_ADDRESS_UNREACHABLE</code>.
                      </div>
                      <div style={{ marginBottom: '6px' }}>
                        <strong>3. Windows Defender Firewall:</strong> Allow inbound connections on ports 3000 &amp; 3001.
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={handleFixFirewall}
                          disabled={isFixingFirewall}
                          style={{
                            background: '#C24522',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            fontSize: '10px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          {isFixingFirewall ? 'Opening Firewall…' : '🔥 Auto-Open Windows Firewall (Ports 3000-3020)'}
                        </button>
                        <a
                          href={clientUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: '#2563EB',
                            textDecoration: 'underline',
                            fontSize: '10px',
                            fontWeight: 600
                          }}
                        >
                          Test Mobile Link in Browser
                        </a>
                      </div>
                      {firewallFixMsg && (
                        <div style={{
                          marginTop: '6px',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          background: firewallFixMsg.type === 'success' ? '#ECFDF5' : '#FFF1F2',
                          color: firewallFixMsg.type === 'success' ? '#065F46' : '#9F1239',
                          fontSize: '10px',
                          fontWeight: 600
                        }}>
                          {firewallFixMsg.text}
                        </div>
                      )}
                      <div style={{ marginTop: '6px', fontSize: '10px', color: '#6B7280' }}>
                        <strong>4. Router AP Isolation:</strong> If phone still cannot connect, router has &quot;AP Isolation&quot; enabled. Switch to <strong>&quot;Any-Wi-Fi (Cloud)&quot;</strong> above for instant universal access.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Artisanal Ramen Artwork Showcase */}
            <div className="kiosk-ramen-showcase">
              <img
                src="/ramen-art.png"
                alt="Umami Artisanal Ramen"
                className="kiosk-ramen-img"
              />
            </div>
          </div>
        )}

        {/* STATE B: COMMERCIAL SELF-SERVICE KIOSK TERMINAL (McDonald's / Jollibee / Chowking Flow) */}
        {state === 'connected' && (
          <div className="slide-up" style={{ width: '100%', paddingBottom: '24px' }}>
            <div className="kiosk-terminal-shell">
              {/* 1. Commercial Kiosk Top Navigation Bar */}
              <div className="kiosk-terminal-topbar">
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                  <div style={{
                    width: '46px', height: '46px', borderRadius: '14px',
                    background: 'linear-gradient(135deg, #D94B2B 0%, #C24522 100%)',
                    color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '22px', boxShadow: '0 6px 16px rgba(194, 69, 34, 0.25)'
                  }}>
                    🍜
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#059669', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      SELF-SERVICE ORDERING KIOSK &bull; {kioskId}
                    </div>
                    <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#1C1917', letterSpacing: '-0.01em' }}>
                      {restaurantInfo.name || 'Umami Craft Fusion'}
                    </h2>
                  </div>

                  {/* Dining Mode Quick Toggle (Dine-In / Takeout) */}
                  <div style={{
                    display: 'inline-flex', background: '#F5EFE6', padding: '4px',
                    borderRadius: '12px', border: '1px solid #EAE2D7', marginLeft: '8px'
                  }}>
                    {['Dine-In', 'Takeout'].map(mode => {
                      const active = diningOption === mode;
                      return (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setDiningOption(mode)}
                          style={{
                            padding: '8px 14px', borderRadius: '9px', border: 'none',
                            background: active ? '#FFFFFF' : 'transparent',
                            color: active ? '#C24522' : '#78716C',
                            fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer',
                            boxShadow: active ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                            display: 'inline-flex', alignItems: 'center', gap: '5px', transition: 'all 0.15s'
                          }}
                        >
                          {mode === 'Dine-In' ? <Utensils size={13} /> : <ShoppingBag size={13} />}
                          <span>{mode}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Topbar Action Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {!isDirectKioskMode && (
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: '5px',
                      padding: '8px 12px', borderRadius: '999px',
                      background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)',
                      color: '#B45309', fontSize: '0.8rem', fontWeight: 800
                    }}>
                      <Clock size={14} />
                      <span>{timeLeft}s</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowDietaryFilters(prev => !prev)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      padding: '10px 15px', borderRadius: '12px',
                      background: allergens.length > 0 ? '#FEF2F2' : '#FFF5F2',
                      border: allergens.length > 0 ? '1.5px solid #DC2626' : '1.5px solid rgba(194, 69, 34, 0.3)',
                      color: allergens.length > 0 ? '#DC2626' : '#C24522',
                      fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer'
                    }}
                  >
                    <ShieldCheck size={15} />
                    <span>Dietary Safety {allergens.length > 0 ? `(${allergens.length} Excluded)` : '& Diet'}</span>
                    {showDietaryFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowServiceModal(true)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      padding: '10px 15px', borderRadius: '12px',
                      background: '#FEF3C7', border: '1px solid #FDE68A',
                      color: '#B45309', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer'
                    }}
                  >
                    <Bell size={15} />
                    <span>Call Server</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleReset}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      padding: '10px 14px', borderRadius: '12px',
                      background: '#FAF6F0', border: '1px solid #E7E5E4',
                      color: '#44403C', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer'
                    }}
                    title="Return to Welcome / QR Pairing Screen"
                  >
                    <Smartphone size={15} />
                    <span>Welcome / QR</span>
                  </button>
                </div>
              </div>

              {/* 2. Collapsible Dietary Safety & Allergen Filter Drawer */}
              {(showDietaryFilters || allergens.length > 0 || preferences.length > 0) && (
                <div style={{ background: '#FAF8F5', borderBottom: '1px solid #EAE2D7', padding: '12px 24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.73rem', fontWeight: 800, color: '#57534E', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        DIETARY SAFETY FILTERS:
                      </span>
                      {allergens.length > 0 ? (
                        allergens.map(a => (
                          <span key={a} style={{ padding: '3px 10px', borderRadius: '999px', background: '#FEE2E2', color: '#B91C1C', fontSize: '0.72rem', fontWeight: 800, textTransform: 'capitalize' }}>
                            No {a}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700 }}>
                          All Menu Items Shown (No Allergens Excluded)
                        </span>
                      )}
                      {preferences.map(p => (
                        <span key={p} style={{ padding: '3px 10px', borderRadius: '999px', background: '#FFEDD5', color: '#C24522', fontSize: '0.72rem', fontWeight: 800, textTransform: 'capitalize' }}>
                          &#9733; {p}
                        </span>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDietaryFilters(prev => !prev)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                        padding: '5px 12px', borderRadius: '999px',
                        background: '#FFFFFF', border: '1px solid rgba(194, 69, 34, 0.25)',
                        color: '#C24522', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer'
                      }}
                    >
                      <span>{showDietaryFilters ? 'Close Filters' : 'Customize Diet'}</span>
                      {showDietaryFilters ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  </div>

                  {showDietaryFilters && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #EAE2D7', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#78716C', textTransform: 'uppercase', marginBottom: '8px' }}>
                          Exclude Allergens (Automatically Hides Unsafe Items):
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {(availableAllergens.length > 0 ? availableAllergens : [
                            { id: 'peanuts', label: 'Peanuts' },
                            { id: 'dairy', label: 'Dairy' },
                            { id: 'gluten', label: 'Gluten' },
                            { id: 'soy', label: 'Soy' },
                            { id: 'shellfish', label: 'Shellfish' },
                            { id: 'eggs', label: 'Eggs' },
                            { id: 'sesame', label: 'Sesame' },
                            { id: 'tree nuts', label: 'Tree Nuts' }
                          ]).map(al => {
                            const key = (al.id || al.name || al).toLowerCase();
                            const label = al.label || al.name || al;
                            const isExcluded = allergens.map(x => x.toLowerCase()).includes(key);
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() => {
                                  setAllergens(prev =>
                                    isExcluded ? prev.filter(x => x.toLowerCase() !== key) : [...prev, key]
                                  );
                                }}
                                style={{
                                  padding: '7px 14px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                                  border: isExcluded ? '1.5px solid #DC2626' : '1px solid #E7E5E4',
                                  background: isExcluded ? '#FEF2F2' : '#FFFFFF',
                                  color: isExcluded ? '#DC2626' : '#44403C'
                                }}
                              >
                                {isExcluded ? '✕ ' : ''}{label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#78716C', textTransform: 'uppercase', marginBottom: '8px' }}>
                          Highlight Dietary &amp; Flavor Preferences:
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {(availablePreferences.length > 0 ? availablePreferences : [
                            { id: 'spicy', label: 'Spicy' },
                            { id: 'savory', label: 'Savory' },
                            { id: 'sweet', label: 'Sweet' },
                            { id: 'vegan', label: 'Vegan' },
                            { id: 'vegetarian', label: 'Vegetarian' },
                            { id: 'umami', label: 'Umami' }
                          ]).map(pref => {
                            const key = (pref.id || pref.name || pref).toLowerCase();
                            const label = pref.label || pref.name || pref;
                            const isSelected = preferences.map(x => x.toLowerCase()).includes(key);
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() => {
                                  setPreferences(prev =>
                                    isSelected ? prev.filter(x => x.toLowerCase() !== key) : [...prev, key]
                                  );
                                }}
                                style={{
                                  padding: '7px 14px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                                  border: isSelected ? '1.5px solid #C24522' : '1px solid #E7E5E4',
                                  background: isSelected ? '#FFF5F2' : '#FFFFFF',
                                  color: isSelected ? '#C24522' : '#44403C'
                                }}
                              >
                                {isSelected ? '★ ' : ''}{label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 3. Three-Zone Commercial Kiosk Body: Left Category Rail | Center Product Stage | Right Live Order Tray */}
              <div className="kiosk-terminal-body">
                {/* LEFT ZONE: Vertical Category Rail */}
                <aside className="kiosk-category-rail" aria-label="Menu Categories">
                  <div style={{ padding: '4px 6px 8px', fontSize: '0.7rem', fontWeight: 800, color: '#A8A29E', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    MENU CATEGORIES
                  </div>
                  {categoriesList.map(cat => {
                    const isSelected = selectedCategory === cat;
                    const count = filteredMenu.filter(item => matchesKioskCategory(item, cat)).length;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`kiosk-cat-btn ${isSelected ? 'active' : ''}`}
                      >
                        <div className="kiosk-cat-icon">{getCategoryIcon(cat)}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.84rem', fontWeight: 800, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {cat}
                          </div>
                          <div style={{ fontSize: '0.68rem', opacity: isSelected ? 0.9 : 0.65, fontWeight: 700, marginTop: '2px' }}>
                            {count} {count === 1 ? 'item' : 'items'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </aside>

                {/* CENTER ZONE: Promotions + Search + Food Card Grid */}
                <section className="kiosk-catalog-stage">

                  {/* 3. Promotional Banner (Live from /api/promos) */}
                  {activePromos.length > 0 && (() => {
                    const currentPromo = activePromos[activePromoIndex % activePromos.length];
                    const bannerImg = currentPromo.bannerImage || currentPromo.imageUrl || currentPromo.image || '/ramen_promo_banner.png';
                    const discountBadge = currentPromo.discountType === 'percentage' || currentPromo.type === 'percentage'
                      ? `${currentPromo.discountValue || currentPromo.value}% OFF`
                      : `₱${currentPromo.discountValue || currentPromo.value} OFF`;

                    return (
                      <div style={{
                        position: 'relative', borderRadius: '18px', overflow: 'hidden',
                        height: '132px', background: '#1C1917', boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
                      }}>
                        <img
                          src={bannerImg}
                          alt={currentPromo.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: 0.72 }}
                          onError={(e) => { e.target.onerror = null; e.target.src = '/ramen_promo_banner.png'; }}
                        />
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(28,25,23,0.92) 0%, rgba(28,25,23,0.55) 60%, rgba(28,25,23,0.85) 100%)' }} />

                        <div style={{ position: 'absolute', top: '14px', left: '18px', right: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ background: 'rgba(0,0,0,0.75)', border: '1px solid rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.06em' }}>
                            &#10022; SPECIAL PROMO
                          </span>
                          <span style={{ background: 'linear-gradient(135deg, #F97316, #DC2626)', color: '#FFFFFF', padding: '5px 12px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 900 }}>
                            {discountBadge}
                          </span>
                        </div>

                        <div style={{ position: 'absolute', bottom: '14px', left: '18px', right: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '12px' }}>
                          <div>
                            <div style={{ color: '#FFFFFF', fontSize: '1.1rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                              {currentPromo.bannerTitle || currentPromo.name}
                            </div>
                            <div style={{ color: 'rgba(255,255,255,0.82)', fontSize: '0.76rem', marginTop: '2px' }}>
                              {currentPromo.applyToAll ? 'Applies storewide to all safe menu items' : `Applies to: ${(currentPromo.applicableItems || []).join(', ')}`}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleApplyCheckoutPromo(currentPromo.code)}
                            style={{
                              background: '#FFFFFF', color: '#C24522', padding: '7px 14px',
                              borderRadius: '999px', border: 'none', fontWeight: 900, fontSize: '0.78rem',
                              display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer', flexShrink: 0
                            }}
                            title="Tap to apply this promo code to your order"
                          >
                            <Tag size={12} />
                            <span>{currentPromo.code}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* 4. Search Bar & Verified Food Safety Notice */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ position: 'relative' }}>
                      <Search size={18} color="#A8A29E" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search dishes, categories, drinks, or ingredients..."
                        style={{
                          width: '100%', padding: '14px 44px 14px 46px', borderRadius: '14px',
                          border: '1.5px solid #EAE2D7', background: '#FFFFFF',
                          fontSize: '0.94rem', fontWeight: 600, color: '#1C1917', outline: 'none', boxSizing: 'border-box',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                        }}
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: '#F5EFE6', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#57534E' }}
                        >
                          <X size={15} />
                        </button>
                      )}
                    </div>

                    {/* Verified Food Safety & Category Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#1C1917' }}>
                          {selectedCategory}
                        </h3>
                        <span style={{ padding: '2px 10px', borderRadius: '999px', background: '#F5EFE6', color: '#57534E', fontSize: '0.74rem', fontWeight: 800 }}>
                          {sortedMenu.length} Available
                        </span>
                      </div>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 11px', borderRadius: '999px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', fontSize: '0.72rem', fontWeight: 700 }}>
                        <ShieldCheck size={13} color="#059669" />
                        <span>Ingredients &amp; allergens verified by authorized administrators</span>
                      </div>
                    </div>
                  </div>

                  {/* 5. Commercial Kiosk Food Card Grid */}
                  {sortedMenu.length === 0 ? (
                    <div style={{ padding: '48px 24px', textAlign: 'center', background: '#FFFFFF', borderRadius: '20px', border: '1.5px dashed #EAE2D7' }}>
                      <AlertTriangle size={42} color="#D97706" style={{ marginBottom: '12px' }} />
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1C1917', margin: '0 0 6px' }}>
                        No items match your current filter or search.
                      </h3>
                      <p style={{ color: '#78716C', fontSize: '0.86rem', maxWidth: '420px', margin: '0 auto 14px' }}>
                        Try clearing your search, switching to &quot;All Items&quot;, or updating your allergen exclusions in Dietary Safety.
                      </p>
                      <button
                        type="button"
                        onClick={() => { setSearchQuery(''); setSelectedCategory('All Items'); }}
                        style={{ padding: '10px 18px', borderRadius: '12px', border: 'none', background: '#C24522', color: '#FFFFFF', fontWeight: 800, fontSize: '0.84rem', cursor: 'pointer' }}
                      >
                        Reset Filters
                      </button>
                    </div>
                  ) : (
                    <div className="kiosk-food-grid">
                      {sortedMenu.map((item) => {
                        const hasMatch = getMatchCount(item) > 0;
                        const ingPreview = getItemIngredientsList(item).slice(0, 3).map(i => i.name).join(', ');
                        return (
                          <div
                            key={item.id || item.sku || item.name}
                            onClick={() => openProductDetails(item)}
                            className={`kiosk-food-card ${hasMatch ? 'matched' : ''}`}
                          >
                            {/* Large Visual Food Image */}
                            <div className="kiosk-food-card-img-wrap">
                              <img
                                src={item.image}
                                alt={item.name}
                                loading="lazy"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = item.isDrink
                                    ? 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80'
                                    : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';
                                }}
                                className="kiosk-food-card-img"
                              />
                              <span style={{
                                position: 'absolute', top: '10px', left: '10px',
                                background: hasMatch ? '#C24522' : 'rgba(28, 25, 23, 0.78)',
                                color: '#FFFFFF', fontSize: '0.68rem', fontWeight: 800,
                                padding: '4px 10px', borderRadius: '999px', backdropFilter: 'blur(4px)',
                                textTransform: 'uppercase', letterSpacing: '0.04em'
                              }}>
                                {hasMatch ? '★ Best Match' : item.category}
                              </span>
                              {item.originalPrice && Number(item.originalPrice) > Number(item.price) && (
                                <span style={{
                                  position: 'absolute', top: '10px', right: '10px',
                                  background: '#059669', color: '#FFFFFF',
                                  fontSize: '0.68rem', fontWeight: 900, padding: '4px 9px', borderRadius: '999px'
                                }}>
                                  PROMO
                                </span>
                              )}
                            </div>

                            {/* Card Details */}
                            <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', flex: 1, gap: '8px' }}>
                              <div>
                                <div style={{ fontSize: '1.02rem', fontWeight: 900, color: '#1C1917', lineHeight: 1.25, marginBottom: '4px' }}>
                                  {item.name}
                                </div>
                                <p style={{
                                  margin: 0, fontSize: '0.78rem', color: '#78716C', lineHeight: 1.4,
                                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                                }}>
                                  {item.description}
                                </p>
                              </div>

                              {ingPreview && (
                                <div style={{ fontSize: '0.71rem', color: '#57534E', background: '#FAF8F5', padding: '5px 8px', borderRadius: '8px', border: '1px solid #EAE2D7', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  <strong>Key:</strong> {ingPreview}
                                </div>
                              )}

                              {/* Allergen & Tags Row */}
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: 'auto' }}>
                                {(item.allergens || []).length === 0 ? (
                                  <span style={{ padding: '2px 7px', borderRadius: '6px', background: '#ECFDF5', color: '#059669', fontSize: '0.66rem', fontWeight: 800 }}>
                                    ✓ Allergen-Safe
                                  </span>
                                ) : (
                                  <span style={{ padding: '2px 7px', borderRadius: '6px', background: '#FEF2F2', color: '#B91C1C', fontSize: '0.66rem', fontWeight: 700 }}>
                                    Contains: {item.allergens.join(', ')}
                                  </span>
                                )}
                                {(item.tags || []).slice(0, 2).map(tag => (
                                  <span key={tag} style={{ padding: '2px 7px', borderRadius: '6px', background: '#FEF3C7', color: '#B45309', fontSize: '0.66rem', fontWeight: 800, textTransform: 'uppercase' }}>
                                    {tag}
                                  </span>
                                ))}
                              </div>

                              {/* Price + Big Touch Add Button */}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #F5EFE6', marginTop: '4px' }}>
                                <div>
                                  {item.originalPrice && Number(item.originalPrice) > Number(item.price) && (
                                    <div style={{ fontSize: '0.72rem', color: '#A8A29E', textDecoration: 'line-through', fontWeight: 700 }}>
                                      ₱{Number(item.originalPrice).toFixed(2)}
                                    </div>
                                  )}
                                  <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#C24522' }}>
                                    ₱{Number(item.price || 0).toFixed(2)}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => handleQuickAddToCart(e, item)}
                                  style={{
                                    padding: '9px 16px', borderRadius: '12px', border: 'none',
                                    background: 'linear-gradient(135deg, #D94B2B 0%, #C24522 100%)',
                                    color: '#FFFFFF', fontWeight: 800, fontSize: '0.8rem',
                                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px',
                                    boxShadow: '0 4px 12px rgba(194, 69, 34, 0.22)'
                                  }}
                                >
                                  <Plus size={15} />
                                  <span>Add</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* RIGHT ZONE: Persistent Live Order Tray ("My Order" Panel) */}
                <aside className="kiosk-order-tray" aria-label="My Order Summary">
                  <div className="kiosk-tray-header">
                    <div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                        {diningOption.toUpperCase()} ORDER
                      </div>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#1C1917' }}>
                        My Order ({kioskCartCount})
                      </h3>
                    </div>
                    {kioskCart.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setKioskCart([])}
                        style={{ padding: '5px 10px', borderRadius: '8px', border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer' }}
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <div className="kiosk-tray-items">
                    {kioskCart.length === 0 ? (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '32px 16px', color: '#A8A29E' }}>
                        <ShoppingBag size={40} style={{ marginBottom: '12px', opacity: 0.45 }} />
                        <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#57534E', marginBottom: '4px' }}>
                          Your order tray is empty
                        </div>
                        <div style={{ fontSize: '0.78rem', lineHeight: 1.45 }}>
                          Tap any dish to view ingredients, customize add-ons, and add it to your order.
                        </div>
                      </div>
                    ) : (
                      kioskCart.map(item => (
                        <div key={item.cartKey} style={{ padding: '12px', borderRadius: '14px', border: '1px solid #EAE2D7', background: '#FAF8F5', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                          <img
                            src={item.image}
                            alt={item.name}
                            style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }}
                            onError={(e) => { e.target.onerror = null; e.target.src = '/ramen-art.png'; }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1C1917', lineHeight: 1.25 }}>
                              {item.name}
                            </div>
                            {item.customizations && item.customizations.length > 0 && (
                              <div style={{ fontSize: '0.7rem', color: '#78716C', marginTop: '3px', lineHeight: 1.3 }}>
                                {item.customizations.join(' • ')}
                              </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E7E5E4', padding: '2px 4px' }}>
                                <button
                                  type="button"
                                  onClick={() => setKioskCart(prev => prev.map(c => c.cartKey === item.cartKey ? { ...c, quantity: Math.max(1, c.quantity - 1) } : c))}
                                  style={{ width: '24px', height: '24px', border: 'none', background: 'transparent', fontWeight: 900, cursor: 'pointer', color: '#44403C' }}
                                >
                                  -
                                </button>
                                <span style={{ fontSize: '0.8rem', fontWeight: 900, minWidth: '16px', textAlign: 'center' }}>{item.quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => setKioskCart(prev => prev.map(c => c.cartKey === item.cartKey ? { ...c, quantity: c.quantity + 1 } : c))}
                                  style={{ width: '24px', height: '24px', border: 'none', background: 'transparent', fontWeight: 900, cursor: 'pointer', color: '#44403C' }}
                                >
                                  +
                                </button>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '0.86rem', fontWeight: 900, color: '#C24522' }}>
                                  ₱{(item.price * item.quantity).toFixed(2)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setKioskCart(prev => prev.filter(c => c.cartKey !== item.cartKey))}
                                  style={{ border: 'none', background: 'transparent', color: '#DC2626', cursor: 'pointer', padding: '2px' }}
                                  title="Remove item"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="kiosk-tray-footer">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.82rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#57534E' }}>
                        <span>Subtotal</span>
                        <span style={{ fontWeight: 700 }}>₱{kioskCartSubtotal.toFixed(2)}</span>
                      </div>
                      {kioskDiscountAmount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669', fontWeight: 700 }}>
                          <span>Promo ({appliedPromo?.code})</span>
                          <span>-₱{kioskDiscountAmount.toFixed(2)}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#78716C', fontSize: '0.75rem' }}>
                        <span>VATable Sales / 12% VAT</span>
                        <span>₱{kioskVatableSales.toFixed(2)} / ₱{kioskVatAmount.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #EAE2D7', marginTop: '4px' }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#1C1917' }}>Total</span>
                        <span style={{ fontSize: '1.35rem', fontWeight: 900, color: '#C24522' }}>₱{kioskCartTotal.toFixed(2)}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={kioskCartCount === 0}
                      onClick={() => {
                        setCheckoutStep('summary');
                        setShowCheckoutModal(true);
                      }}
                      style={{
                        width: '100%', padding: '15px 18px', borderRadius: '14px', border: 'none',
                        background: kioskCartCount > 0 ? 'linear-gradient(135deg, #D94B2B 0%, #C24522 100%)' : '#E7E5E4',
                        color: kioskCartCount > 0 ? '#FFFFFF' : '#A8A29E',
                        fontWeight: 900, fontSize: '0.95rem', cursor: kioskCartCount > 0 ? 'pointer' : 'not-allowed',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        boxShadow: kioskCartCount > 0 ? '0 8px 22px rgba(194, 69, 34, 0.28)' : 'none'
                      }}
                    >
                      <span>Review &amp; Pay</span>
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </aside>
              </div>
            </div>

            {/* Responsive Sticky Bottom Cart Bar (Tablet / Narrow Screens Only) */}
            {kioskCartCount > 0 && (
              <div
                className="kiosk-mobile-sticky-bar"
                style={{
                  position: 'fixed', bottom: '18px', left: '50%', transform: 'translateX(-50%)',
                  width: 'min(94vw, 680px)', background: '#1C1917', color: '#FFFFFF',
                  borderRadius: '18px', padding: '14px 20px',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.28)',
                  justifyContent: 'space-between', alignItems: 'center', zIndex: 900
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#C24522', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>
                    {kioskCartCount}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#A8A29E', fontWeight: 700 }}>MY ORDER ({diningOption.toUpperCase()})</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900 }}>₱{kioskCartTotal.toFixed(2)}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCheckoutStep('summary');
                    setShowCheckoutModal(true);
                  }}
                  style={{
                    padding: '11px 22px', borderRadius: '12px', border: 'none',
                    background: 'linear-gradient(135deg, #D94B2B 0%, #C24522 100%)',
                    color: '#FFFFFF', fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: '8px'
                  }}
                >
                  <span>Review &amp; Pay</span>
                  <ChevronRight size={17} />
                </button>
              </div>
            )}

            {/* Interactive Product Details & Customization Modal */}
            {selectedProduct && (
              <div
                onClick={() => setSelectedProduct(null)}
                style={{
                  position: 'fixed', inset: 0, background: 'rgba(28, 25, 23, 0.6)',
                  backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '20px', zIndex: 1100
                }}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto',
                    background: '#FFFFFF', borderRadius: '24px', boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
                    position: 'relative'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedProduct(null)}
                    style={{
                      position: 'absolute', top: '14px', right: '14px', zIndex: 10,
                      width: '36px', height: '36px', borderRadius: '50%', border: 'none',
                      background: 'rgba(255,255,255,0.92)', color: '#1C1917', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                    }}
                  >
                    <X size={18} />
                  </button>

                  {/* Product Header Image */}
                  <div style={{ height: '220px', width: '100%', overflow: 'hidden', background: '#FAF6F0', position: 'relative' }}>
                    <img
                      src={selectedProduct.image}
                      alt={selectedProduct.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { e.target.onerror = null; e.target.src = '/ramen-art.png'; }}
                    />
                    <span style={{
                      position: 'absolute', bottom: '12px', left: '16px',
                      background: 'rgba(255,255,255,0.95)', color: '#C24522', padding: '5px 12px',
                      borderRadius: '999px', fontSize: '0.75rem', fontWeight: 800
                    }}>
                      {selectedProduct.category} {selectedProduct.prepTime ? `• ${selectedProduct.prepTime}` : ''}
                    </span>
                  </div>

                  <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <div>
                        <h2 style={{ margin: '0 0 6px', fontSize: '1.4rem', fontWeight: 900, color: '#1C1917' }}>
                          {selectedProduct.name}
                        </h2>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {(selectedProduct.tags || []).map(tag => (
                            <span key={tag} style={{ padding: '3px 9px', borderRadius: '6px', background: '#FEF3C7', color: '#B45309', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#C24522', flexShrink: 0 }}>
                        ₱{Number(selectedProduct.price || 0).toFixed(2)}
                      </div>
                    </div>

                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#57534E', lineHeight: 1.55 }}>
                      {selectedProduct.description}
                    </p>

                    {/* Complete Ingredients List from Database */}
                    <div style={{ background: '#FAF8F5', border: '1px solid #EAE2D7', borderRadius: '14px', padding: '14px' }}>
                      <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#57534E', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ChefHat size={14} color="#C24522" />
                        <span>Complete Ingredients (Database Verified)</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {getItemIngredientsList(selectedProduct).length > 0 ? (
                          getItemIngredientsList(selectedProduct).map((ing, i) => (
                            <span key={i} style={{ padding: '4px 10px', borderRadius: '8px', background: '#FFFFFF', border: '1px solid #E7E5E4', fontSize: '0.78rem', fontWeight: 600, color: '#1C1917' }}>
                              {ing.name}{ing.quantity ? ` (${ing.quantity}${ing.unit ? ' ' + ing.unit : ''})` : ''}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: '#78716C' }}>Prepared fresh with house-curated artisanal ingredients.</span>
                        )}
                      </div>
                    </div>

                    {/* Allergen Information */}
                    <div style={{
                      padding: '12px 14px', borderRadius: '12px',
                      background: (selectedProduct.allergens || []).length > 0 ? '#FEF2F2' : '#ECFDF5',
                      border: (selectedProduct.allergens || []).length > 0 ? '1px solid #FECACA' : '1px solid #A7F3D0',
                      display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.82rem'
                    }}>
                      <ShieldCheck size={18} color={(selectedProduct.allergens || []).length > 0 ? '#DC2626' : '#059669'} style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        {(selectedProduct.allergens || []).length > 0 ? (
                          <div style={{ color: '#991B1B' }}>
                            <strong>Allergen Notice:</strong> Contains <strong style={{ textTransform: 'capitalize' }}>{selectedProduct.allergens.join(', ')}</strong>.
                          </div>
                        ) : (
                          <div style={{ color: '#065F46', fontWeight: 700 }}>
                            No common registered allergens detected in this item.
                          </div>
                        )}
                        <div style={{ fontSize: '0.72rem', color: '#57534E', marginTop: '3px' }}>
                          Ingredient and allergen information is maintained and verified by authorized administrators.
                        </div>
                      </div>
                    </div>

                    {/* Spice Level / Beverage Sugar & Ice Preference */}
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1C1917', marginBottom: '8px' }}>
                        {selectedProduct.isDrink ? 'Sugar & Ice Preference:' : 'Spice & Preparation Level:'}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {(selectedProduct.isDrink
                          ? ['100% Sugar • Regular Ice', '75% Sugar • Less Ice', '50% Sugar • Less Ice', '0% Sugar • No Ice']
                          : ['Original', 'Mild Spice', 'Medium Spice', 'Extra Fiery']
                        ).map(opt => {
                          const active = selectedSpiceOrSugar === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setSelectedSpiceOrSugar(opt)}
                              style={{
                                padding: '8px 14px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                                border: active ? '1.5px solid #C24522' : '1px solid #E7E5E4',
                                background: active ? '#FFF5F2' : '#FFFFFF',
                                color: active ? '#C24522' : '#44403C'
                              }}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Size Variations (if applicable) */}
                    {Array.isArray(selectedProduct.sizes) && selectedProduct.sizes.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1C1917', marginBottom: '8px' }}>
                          Select Size / Option:
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {selectedProduct.sizes.map((sz, idx) => {
                            const label = sz.label || sz.name || `Option ${idx + 1}`;
                            const active = selectedSize && (selectedSize.label || selectedSize.name) === label;
                            return (
                              <button
                                key={label}
                                type="button"
                                onClick={() => setSelectedSize(sz)}
                                style={{
                                  padding: '8px 14px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer',
                                  border: active ? '1.5px solid #C24522' : '1px solid #E7E5E4',
                                  background: active ? '#FFF5F2' : '#FFFFFF',
                                  color: active ? '#C24522' : '#44403C'
                                }}
                              >
                                {label} &bull; ₱{Number(sz.price || selectedProduct.price).toFixed(2)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Add-on Ingredients & Customizations */}
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1C1917', marginBottom: '8px' }}>
                        Add-On Ingredients &amp; Customizations:
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
                        {getItemAddonsOptions(selectedProduct).map(addon => {
                          const checked = selectedAddons.some(a => a.name === addon.name);
                          return (
                            <button
                              key={addon.name}
                              type="button"
                              onClick={() => toggleAddon(addon)}
                              style={{
                                padding: '9px 12px', borderRadius: '10px', textAlign: 'left', cursor: 'pointer',
                                border: checked ? '1.5px solid #059669' : '1px solid #E7E5E4',
                                background: checked ? '#ECFDF5' : '#FAF8F5',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', fontWeight: 700
                              }}
                            >
                              <span style={{ color: '#1C1917' }}>{checked ? '✓ ' : '+ '}{addon.name}</span>
                              <span style={{ color: addon.price > 0 ? '#059669' : '#78716C' }}>
                                {addon.price > 0 ? `+₱${addon.price}` : 'Free'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Special Instructions */}
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1C1917', marginBottom: '6px' }}>
                        Special Instructions (Optional):
                      </div>
                      <textarea
                        rows={2}
                        value={specialInstructions}
                        onChange={(e) => setSpecialInstructions(e.target.value)}
                        placeholder="e.g., Less ice, sauce on the side, extra crispy..."
                        style={{
                          width: '100%', padding: '10px 12px', borderRadius: '10px',
                          border: '1px solid #E7E5E4', background: '#FAF8F5',
                          fontSize: '0.84rem', resize: 'none', boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    {/* Quantity & Add to Order Footer */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', paddingTop: '10px', borderTop: '1px solid #EAE2D7' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#FAF6F0', padding: '6px 12px', borderRadius: '12px', border: '1px solid #EAE2D7' }}>
                        <button
                          type="button"
                          onClick={() => setProductQty(q => Math.max(1, q - 1))}
                          style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Minus size={15} />
                        </button>
                        <span style={{ fontSize: '1rem', fontWeight: 900, minWidth: '22px', textAlign: 'center' }}>{productQty}</span>
                        <button
                          type="button"
                          onClick={() => setProductQty(q => q + 1)}
                          style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Plus size={15} />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddToCartFromModal}
                        style={{
                          flex: 1, padding: '13px 20px', borderRadius: '14px', border: 'none',
                          background: 'linear-gradient(135deg, #D94B2B 0%, #C24522 100%)',
                          color: '#FFFFFF', fontWeight: 900, fontSize: '0.95rem', cursor: 'pointer',
                          boxShadow: '0 6px 18px rgba(194, 69, 34, 0.3)'
                        }}
                      >
                        Add to Order &mdash; ₱{(modalUnitPrice * productQty).toFixed(2)}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Kiosk Cart & Checkout Modal with Official QR Ph Standee & Card Gateway */}
            <KioskCheckoutModal
              isOpen={showCheckoutModal}
              onClose={() => setShowCheckoutModal(false)}
              cartItems={kioskCart}
              userAllergens={allergens}
              diningOption={diningOption}
              onChangeDiningOption={setDiningOption}
              onUpdateQuantity={(id, delta) => {
                setKioskCart(prev => prev.map(c => (c.cartKey === id || c.id === id) ? { ...c, quantity: Math.max(1, c.quantity + delta) } : c));
              }}
              onRemoveItem={(id) => {
                setKioskCart(prev => prev.filter(c => (c.cartKey !== id && c.id !== id)));
              }}
              promos={promos || []}
              promoCode={checkoutPromoCode}
              setPromoCode={setCheckoutPromoCode}
              promoApplied={appliedPromo}
              setPromoApplied={setAppliedPromo}
              promoMsg={promoStatusMsg}
              setPromoMsg={setPromoStatusMsg}
              onConfirmOrder={handleSubmitKioskOrder}
              kioskId={kioskId}
              tableNumber={`Kiosk ${kioskId}`}
              isMobile={false}
            />

            {/* Kiosk Stage 1 Allergen Warning Modal (Item Addition Double-Confirmation) */}
            <AllergenDoubleWarningModal
              isOpen={Boolean(kioskStage1Warning)}
              stage="item_addition"
              item={kioskStage1Warning?.item}
              conflictingAllergens={kioskStage1Warning?.conflicts || []}
              userAllergens={allergens}
              onClose={() => setKioskStage1Warning(null)}
              onCancel={() => setKioskStage1Warning(null)}
              onConfirm={() => {
                if (kioskStage1Warning?.executeAdd) {
                  kioskStage1Warning.executeAdd();
                }
              }}
            />
          </div>
        )}

        {/* STATE C: TRANSACTION SUCCESS RECEIPT SCREEN */}
        {state === 'success' && (
          <div className="slide-up" style={{ maxWidth: '640px', margin: '0 auto', width: '100%' }}>
            <div className="success-checkmark" style={{ marginBottom: '24px' }}>
              <div className="check-icon"></div>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '8px' }}>
                {orderReceipt?.paymentStatus === 'Pending Verification' || orderReceipt?.paymentStatus === 'Pending'
                  ? 'Payment Processing via Gateway Webhook...'
                  : (orderReceipt?.status === 'Preparing'
                    ? 'Kitchen is Preparing Your Meal!'
                    : (orderReceipt?.status === 'Ready for Pickup'
                      ? 'Order Ready for Pickup!'
                      : 'Order Confirmed & Received!'))}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
                {orderReceipt?.paymentStatus === 'Pending Verification' || orderReceipt?.paymentStatus === 'Pending'
                  ? 'Awaiting automated payment gateway confirmation (Webhook). Once confirmed, the kitchen will begin preparing your order.'
                  : 'Your customized meal has been verified and sent to the kitchen.'}
              </p>
            </div>

            {/* Multi-Item Receipt Card */}
            <div className="kiosk-receipt-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <PesoReceipt size={18} color="var(--accent-red)" />
                  <span style={{ fontWeight: '800', letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '13px' }}>
                    Order Summary
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Session #{kioskId}
                </span>
              </div>

              {/* Items List */}
              <div className="kiosk-receipt-items">
                {orderReceipt && orderReceipt.items && orderReceipt.items.length > 0 ? (
                  orderReceipt.items.map((item, idx) => {
                    const itemImg = item.image || (masterMenu.find(m => String(m.id) === String(item.id))?.image) || (drinksMenu.find(d => String(d.id) === String(item.id))?.image);
                    return (
                      <div key={idx} className="kiosk-receipt-row">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            flexShrink: 0,
                            background: 'rgba(0,0,0,0.04)',
                            border: '1px solid rgba(0,0,0,0.08)'
                          }}>
                            {itemImg ? (
                              <img
                                src={itemImg}
                                alt={item.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={e => { e.currentTarget.style.display = 'none'; }}
                              />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c2410c' }}>
                                <Utensils size={14} />
                              </div>
                            )}
                          </div>
                          <div>
                            <span style={{ fontWeight: '600' }}>{item.name}</span>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '6px' }}>
                              (x{item.quantity || 1})
                            </span>
                          </div>
                        </div>
                        <span style={{ fontWeight: '700' }}>
                          ₱{((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="kiosk-receipt-row">
                    <span>{orderedItem?.name || 'Custom Meal'}</span>
                    <span style={{ fontWeight: '700' }}>₱{(orderedItem?.price || 0).toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Total Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', fontSize: '18px', fontWeight: '800' }}>
                <span>Total Amount:</span>
                <span style={{ color: 'var(--brand-primary)' }}>
                  ₱{(orderReceipt?.totalPrice || orderedItem?.price || 0).toFixed(2)}
                </span>
              </div>

              {/* Combined Taste Profile Tags */}
              {combinedReceiptTags.length > 0 && (
                <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-glass)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                    Taste Profile Fingerprint:
                  </span>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {combinedReceiptTags.map(tag => (
                      <span key={tag} className="badge badge-recommend" style={{ fontSize: '10px' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Zero Retention Notification */}
            <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px', justifyContent: 'center', background: 'rgba(16, 185, 129, 0.05)', borderColor: 'rgba(16, 185, 129, 0.2)', borderRadius: '16px' }}>
              <EyeOff size={20} color="var(--accent-success)" />
              <span style={{ fontSize: '13px', color: 'var(--accent-success)', fontWeight: '600' }}>
                Zero-Retention Wipe: Dietary credentials wiped completely from terminal memory.
              </span>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '24px', textAlign: 'center' }}>
              Returning to standby mode in 6s...
            </p>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="kiosk-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: '500' }}>© 2026 Umami Craft Fusion. All rights reserved.</span>
        </div>

        <div style={{ flex: 1, height: '1px', background: 'rgba(226, 214, 200, 0.6)', margin: '0 28px' }}></div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', fontSize: '11px', fontWeight: '700', letterSpacing: '0.06em', color: '#8A7D73' }}>
          <div>FRESH INGREDIENTS</div>
          <div>BOLD FLAVORS</div>
          <div>PERSONALIZED DINING</div>
        </div>
      </footer>
      {/* Table Service & Assistance Call Modal */}
      <TableServiceModal
        isOpen={showServiceModal}
        onClose={() => setShowServiceModal(false)}
        socket={socketRef.current}
        tableNumber={kioskId && !kioskId.startsWith('K-') ? `Table ${kioskId}` : `Kiosk #${kioskId}`}
        customerName={`Kiosk Diner (#${kioskId})`}
        kioskId={kioskId}
      />
    </div>
  );
}

export default KioskView;
