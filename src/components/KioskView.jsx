import React, { useState, useEffect, useRef, useMemo } from 'react';
import { io } from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';
import PesoReceipt from './PesoReceipt';
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
  Signal
} from 'lucide-react';

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
  const [state, setState] = useState('standby'); // 'standby' | 'connected' | 'success'
  const [allergens, setAllergens] = useState([]);
  const [preferences, setPreferences] = useState([]);
  const [orderedItem, setOrderedItem] = useState(null);
  const [orderReceipt, setOrderReceipt] = useState(null);
  const [timeLeft, setTimeLeft] = useState(90);
  const [socketConnected, setSocketConnected] = useState(false);
  
  const socketRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  const [masterMenu, setMasterMenu] = useState([]);
  const [drinksMenu, setDrinksMenu] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
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
  const [customHost, setCustomHost] = useState('');
  const [showIpConfig, setShowIpConfig] = useState(false);
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

  useEffect(() => {
    fetch('/api/promos')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setPromos(data);
      })
      .catch(() => {});
  }, []);

  const activePromos = useMemo(() => {
    const now = kioskPromoClock;
    return (promos || []).filter(p => {
      if (p.status !== 'active') return false;
      if (p.expiresAt && new Date(p.expiresAt).getTime() <= now) return false;
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
        } catch {}
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
        } catch {}
      });
  }, []);

  // Fetch dynamic Wi-Fi & LAN IP with optional forced re-detection
  const fetchNetworkInfo = (forceRefresh = false) => {
    fetch(`/api/network-info${forceRefresh ? '?refresh=true' : ''}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.ip && data.ip !== 'localhost') {
          setLanIp(data.ip);
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

  const handleForceRedetect = () => {
    setIsRefreshingNetwork(true);
    if (socketRef.current) {
      socketRef.current.emit('request-network-refresh');
    }
    fetchNetworkInfo(true);
    setTimeout(() => setIsRefreshingNetwork(false), 900);
  };

  useEffect(() => {
    fetchNetworkInfo(); // Initial fetch on mount
    const ipRefreshInterval = setInterval(() => fetchNetworkInfo(false), 15000); // Polling backup every 15 s
    return () => clearInterval(ipRefreshInterval);
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
    socket.on('disconnect', () => {
      setSocketConnected(false);
      console.log("[Kiosk] Disconnected from socket server");
    });

    socket.on('promos-updated', (data) => {
      if (Array.isArray(data)) setPromos(data);
    });

    socket.on('initial-menu', (data) => {
      if (Array.isArray(data) && data.length) setMasterMenu(data);
    });

    socket.on('menu-updated', (data) => {
      if (Array.isArray(data) && data.length) setMasterMenu(data);
    });

    socket.on('initial-drinks', (data) => {
      if (Array.isArray(data) && data.length) setDrinksMenu(data);
    });

    socket.on('drinks-updated', (data) => {
      if (Array.isArray(data) && data.length) setDrinksMenu(data);
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
      
      setOrderedItem(data.item || items[0]);
      setOrderReceipt({
        items,
        itemCount: count,
        totalPrice: total,
        orderedTags: data.orderedTags || []
      });
      setState('success');
    });

    // Listen for mobile client disconnection
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

  // 90-Second Inactivity Countdown Timer
  useEffect(() => {
    if (state === 'connected') {
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
  }, [state]);

  // Success screen auto-reset after 6 seconds
  useEffect(() => {
    if (state === 'success') {
      const resetTimeout = setTimeout(() => {
        handleReset();
      }, 6000);
      return () => clearTimeout(resetTimeout);
    }
  }, [state]);

  const handleReset = () => {
    // 1. Wipe all active session variables in memory (zero-retention)
    setAllergens([]);
    setPreferences([]);
    setOrderedItem(null);
    setOrderReceipt(null);
    setTimeLeft(90);
    
    // 2. Generate a brand new kioskId for the next customer
    const newId = generateKioskId();
    setKioskId(newId);
    
    // 3. Revert to standby state
    setState('standby');
  };

  // Generate mobile scanner URL pointing to network-independent public tunnel or auto-detected dynamic LAN IP
  const isLoopback = !window.location.hostname || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  // Use customHost, or active network host IP if accessing externally, or dynamically detected LAN IP
  const targetHost = customHost || (!isLoopback ? window.location.hostname : (lanIp || 'localhost'));
  const currentFrontendPort = restaurantInfo.frontendPort || window.location.port || '3000';
  const mobileTargetPort = restaurantInfo.mobileFrontendPort || currentFrontendPort;
  const currentBackendPort = restaurantInfo.backendPort || (currentFrontendPort === '3010' ? 3002 : (currentFrontendPort === '3020' ? 3003 : 3001));

  let clientUrl = '';
  if (customHost && (customHost.startsWith('http://') || customHost.startsWith('https://'))) {
    const cleanHost = customHost.replace(/\/$/, '');
    clientUrl = `${cleanHost}/?view=mobile&kioskId=${kioskId}&kioskPort=${currentBackendPort}&restaurant=${restaurantInfo.id || 'umami'}`;
  } else {
    clientUrl = `http://${targetHost}:${mobileTargetPort}/?view=mobile&kioskId=${kioskId}&kioskPort=${currentBackendPort}&restaurant=${restaurantInfo.id || 'umami'}`;
  }

  // Formatting & Combining Menu Items and Drinks
  const formattedDrinks = useMemo(() => {
    return (drinksMenu || []).map(d => {
      const price = typeof d.price === 'number' && d.price > 0
        ? d.price
        : (d.sizes && d.sizes[0] && d.sizes[0].price ? d.sizes[0].price : 75);

      let itemAllergens = Array.isArray(d.allergens) ? [...d.allergens] : [];
      if (!itemAllergens.length && (d.category?.toLowerCase().includes('milk') || d.name?.toLowerCase().includes('milk') || d.name?.toLowerCase().includes('taro'))) {
        itemAllergens = ['dairy'];
      }

      let tags = Array.isArray(d.tags) ? [...d.tags] : [];
      if (!tags.includes('sweet')) tags.push('sweet');
      if (!tags.includes('drinks')) tags.push('drinks');

      return {
        id: d.id || d.sku,
        sku: d.sku || d.id,
        name: d.name,
        category: d.category || 'Drinks & Boba',
        price: price,
        image: d.image || 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80',
        description: d.description || `${d.name} crafted fresh with artisanal ingredients.`,
        allergens: itemAllergens,
        tags: tags,
        emoji: d.emoji || '🧋',
        isDrink: true,
        sizes: d.sizes || []
      };
    });
  }, [drinksMenu]);

  // Combine full catalog: food items + drinks
  const fullCatalog = useMemo(() => {
    return [...masterMenu, ...formattedDrinks];
  }, [masterMenu, formattedDrinks]);

  // Filtering and Sorting Menu Items
  // 1. Filter out items containing user allergens
  const filteredMenu = useMemo(() => {
    return fullCatalog.filter(item => {
      const itemAllergens = Array.isArray(item.allergens) ? item.allergens : [];
      return !itemAllergens.some(allergen => allergens.map(a => a.toLowerCase()).includes(allergen.toLowerCase()));
    });
  }, [fullCatalog, allergens]);

  // 2. Count match score for preferences to sort/highlight
  const getMatchCount = (item) => {
    const itemTags = Array.isArray(item.tags) ? item.tags.map(t => t.toLowerCase()) : [];
    return itemTags.filter(tag => preferences.map(p => p.toLowerCase()).includes(tag)).length;
  };

  // 3. Category tabs
  const categoriesList = useMemo(() => {
    const set = new Set();
    filteredMenu.forEach(item => {
      if (item.category) set.add(item.category);
    });
    return ['All', ...Array.from(set)];
  }, [filteredMenu]);

  const categoryFilteredMenu = useMemo(() => {
    if (selectedCategory === 'All') return filteredMenu;
    return filteredMenu.filter(item => item.category === selectedCategory);
  }, [filteredMenu, selectedCategory]);

  // 4. Sort so that items matching the most preferences appear first
  const sortedMenu = useMemo(() => {
    return [...categoryFilteredMenu].sort((a, b) => {
      const scoreA = getMatchCount(a);
      const scoreB = getMatchCount(b);
      return scoreB - scoreA; // High score first
    });
  }, [categoryFilteredMenu, preferences]);

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
                        <span style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.2)', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 800, color: '#fff' }}>
                          🔥 SPECIAL OFFERS • 5S AUTO-ROTATE
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

                <div style={{ background: '#ffffff', padding: '12px', borderRadius: '20px', boxShadow: '0 4px 14px rgba(44, 26, 17, 0.04)' }}>
                  <QRCodeSVG value={clientUrl} size={195} level="H" includeMargin={false} />
                </div>

                <div className="qr-divider">
                  <span>Scan to Personalize</span>
                </div>

                <div style={{ fontSize: '12px', color: '#685D54', marginBottom: '4px' }}>
                  Kiosk ID: <strong style={{ color: '#1C1917' }}>{kioskId}</strong>
                </div>

                <div style={{ fontSize: '12px', color: '#685D54', marginBottom: '10px' }}>
                  URL: <span style={{ color: '#059669', fontWeight: 700 }}>{targetHost}:{mobileTargetPort}</span>
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
                    {/* Live Dynamic Status Grid */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{
                          width: '7px', height: '7px', borderRadius: '50%',
                          background: lanIp ? '#10b981' : '#f59e0b',
                          flexShrink: 0
                        }} />
                        <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                          Dynamic Wi-Fi System
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
                      <div>SSID: <strong style={{ color: '#1C1917' }}>{wifiInfo.ssid || 'Auto-Sync / Local LAN'}</strong> {wifiInfo.signal && <span style={{ color: '#059669' }}>({wifiInfo.signal})</span>}</div>
                      <div>Active IP: <strong style={{ color: '#059669', fontFamily: 'monospace' }}>{lanIp || 'Detecting…'}</strong></div>
                      <div>Adapter: <span style={{ color: '#786456' }}>{wifiInfo.interfaceName || 'Wi-Fi'}</span></div>
                      <div>Mode: <span style={{ color: '#059669', fontWeight: 600 }}>Dynamic Real-Time Lock</span></div>
                    </div>

                    <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                      Override IP / Host (Emergency debug):
                    </label>
                    <input
                      type="text"
                      value={customHost}
                      placeholder={lanIp ? `Leave blank for auto dynamic: ${lanIp}` : '192.168.x.x'}
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
                        ✕ Clear override — return to Dynamic Wi-Fi
                      </button>
                    )}
                    <p style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: '1.3', margin: 0 }}>
                      ⚡ Network Lock auto-detects Wi-Fi router changes. Customers connect to <strong>{wifiInfo.ssid || 'the local Wi-Fi network'}</strong> to scan and order.
                    </p>
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

        {/* STATE B: HANDSHAKE RECEIVED & FILTERED MENU */}
        {state === 'connected' && (
          <div className="slide-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span className="pulse-indicator active"></span>
                  <h3 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                    Connected to Dining Profile
                  </h3>
                </div>
                
                {/* Active Filters Display */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {allergens.length > 0 ? (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>Excluded Allergens:</span>
                      {allergens.map(a => (
                        <span key={a} className="badge badge-allergen" style={{ textTransform: 'capitalize' }}>
                          ✕ {a}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: '12.5px', color: 'var(--accent-success)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <CheckCircle2 size={14} color="var(--accent-success)" />
                      <span>Zero Allergen Exclusions • Full Menu Safe</span>
                    </span>
                  )}
                  
                  {allergens.length > 0 && preferences.length > 0 && <span style={{ color: 'var(--border-glass)' }}>|</span>}

                  {preferences.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>Target Preferences:</span>
                      {preferences.map(p => (
                        <span key={p} className="badge badge-recommend" style={{ textTransform: 'capitalize' }}>
                          ★ {p}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Countdown Timer */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                padding: '10px 20px',
                borderRadius: '14px',
                boxShadow: '0 2px 8px rgba(245, 158, 11, 0.08)'
              }}>
                <Clock size={20} color="var(--accent-warning)" />
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--accent-warning)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Session Timeout</div>
                  <div style={{ fontSize: '17px', fontWeight: '800', color: 'var(--accent-warning)', lineHeight: 1.1 }}>{timeLeft}s</div>
                </div>
              </div>
            </div>

            {/* Category Filter Tabs Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              overflowX: 'auto',
              paddingBottom: '10px',
              marginBottom: '24px',
              scrollbarWidth: 'none'
            }}>
              {categoriesList.map(cat => {
                const isSelected = selectedCategory === cat;
                const count = cat === 'All'
                  ? filteredMenu.length
                  : filteredMenu.filter(m => m.category === cat).length;

                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '7px',
                      padding: '8px 16px',
                      borderRadius: '999px',
                      fontSize: '13px',
                      fontWeight: 700,
                      border: isSelected ? '1.5px solid #e45729' : '1px solid #e5e7eb',
                      background: isSelected ? '#e45729' : '#ffffff',
                      color: isSelected ? '#ffffff' : '#374151',
                      boxShadow: isSelected ? '0 4px 14px rgba(228, 87, 41, 0.28)' : '0 1px 3px rgba(0,0,0,0.04)',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                  >
                    <span>{cat}</span>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '2px 7px',
                      borderRadius: '999px',
                      background: isSelected ? 'rgba(255,255,255,0.25)' : '#f3f4f6',
                      color: isSelected ? '#ffffff' : '#6b7280'
                    }}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Menu & Drinks Grid */}
            <div className="kiosk-menu-grid">
              {sortedMenu.map((item, idx) => {
                const hasMatch = preferences.some(p => (item.tags || []).map(t => t.toLowerCase()).includes(p.toLowerCase()));
                const matchCount = getMatchCount(item);

                return (
                  <div 
                    key={item.id || item.sku || item.name} 
                    className={`kiosk-menu-card ${hasMatch ? 'highlighted' : ''}`}
                    style={{
                      border: hasMatch ? '1.5px solid rgba(228, 87, 41, 0.45)' : '1px solid rgba(0, 0, 0, 0.08)',
                      boxShadow: hasMatch
                        ? '0 10px 28px -4px rgba(228, 87, 41, 0.18), 0 2px 8px rgba(0,0,0,0.04)'
                        : '0 4px 20px -2px rgba(44, 26, 17, 0.06), 0 2px 6px rgba(0,0,0,0.03)',
                      animation: `kioskCardFadeIn 0.4s ease-out ${Math.min(idx * 0.05, 0.5)}s both`
                    }}
                  >
                    {/* Food / Beverage Artwork Showcase */}
                    <div style={{ position: 'relative', width: '100%', height: '175px', overflow: 'hidden', background: '#f8fafc' }}>
                      <img
                        src={item.image}
                        alt={item.name}
                        loading="lazy"
                        className="kiosk-card-img"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = item.isDrink 
                            ? 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80'
                            : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63?auto=format&fit=crop&w=600&q=80';
                        }}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />

                      {/* Gentle Shadow Overlay */}
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.45) 100%)',
                        pointerEvents: 'none'
                      }} />

                      {/* Top Left: Category Badge */}
                      <div style={{
                        position: 'absolute',
                        top: '12px',
                        left: '12px',
                        background: 'rgba(255, 255, 255, 0.94)',
                        backdropFilter: 'blur(8px)',
                        padding: '4px 10px',
                        borderRadius: '999px',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#c2410c',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <span>{item.emoji || (item.isDrink ? '🧋' : '🍽️')}</span>
                        <span>{item.category}</span>
                      </div>

                      {/* Top Right: Recommendation Match Badge */}
                      {hasMatch && (
                        <div style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          background: 'linear-gradient(135deg, #e45729 0%, #c2410c 100%)',
                          color: '#ffffff',
                          padding: '4px 11px',
                          borderRadius: '999px',
                          fontSize: '11px',
                          fontWeight: 800,
                          boxShadow: '0 4px 14px rgba(228, 87, 41, 0.4)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          letterSpacing: '0.02em'
                        }}>
                          <Sparkles size={12} />
                          <span>Match (+{matchCount})</span>
                        </div>
                      )}

                      {/* Bottom Right: High-Visibility Price Badge */}
                      <div style={{
                        position: 'absolute',
                        bottom: '10px',
                        right: '12px',
                        background: 'rgba(17, 24, 39, 0.88)',
                        backdropFilter: 'blur(8px)',
                        color: '#ffffff',
                        padding: '4px 11px',
                        borderRadius: '8px',
                        fontSize: '14.5px',
                        fontWeight: 800,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                        letterSpacing: '0.01em'
                      }}>
                        ₱{Number(item.price || 0).toFixed(2)}
                      </div>
                    </div>

                    {/* Card Content Details */}
                    <div style={{ padding: '16px 18px 18px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <div style={{ marginBottom: '10px' }}>
                        <h4 style={{
                          fontSize: '17px',
                          fontWeight: 800,
                          color: '#1c1917',
                          margin: '0 0 6px 0',
                          lineHeight: 1.3
                        }}>
                          {item.name}
                        </h4>
                        <p style={{
                          color: '#64748b',
                          fontSize: '12.5px',
                          lineHeight: '1.5',
                          margin: 0,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {item.description}
                        </p>
                      </div>

                      {/* Bottom Tags Strip */}
                      <div style={{
                        marginTop: 'auto',
                        paddingTop: '12px',
                        borderTop: '1px solid #f3f4f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px'
                      }}>
                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                          {(item.tags || []).slice(0, 3).map(tag => {
                            const isPref = preferences.map(p => p.toLowerCase()).includes(tag.toLowerCase());
                            return (
                              <span 
                                key={tag} 
                                style={{
                                  fontSize: '10.5px',
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.04em',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  background: isPref ? '#ffedd5' : '#f1f5f9',
                                  color: isPref ? '#c2410c' : '#475569',
                                  border: isPref ? '1px solid #fed7aa' : '1px solid #e2e8f0'
                                }}
                              >
                                {tag}
                              </span>
                            );
                          })}
                        </div>

                        <div style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#10b981',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}>
                          <ShieldCheck size={13} color="#10b981" />
                          <span>Safe</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {sortedMenu.length === 0 && (
                <div style={{ gridColumn: '1 / -1', padding: '60px 24px', textAlign: 'center', background: '#ffffff', borderRadius: '20px', border: '1px solid #e5e7eb' }}>
                  <AlertTriangle size={48} color="var(--accent-warning)" style={{ marginBottom: '16px' }} />
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1f2937', marginBottom: '8px' }}>
                    No items match your dietary safety profile.
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '420px', margin: '0 auto' }}>
                    Items in this category contain one or more of your registered allergens. Try choosing "All" or adjusting your dietary filter.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STATE C: TRANSACTION SUCCESS RECEIPT SCREEN */}
        {state === 'success' && (
          <div className="slide-up" style={{ maxWidth: '640px', margin: '0 auto', width: '100%' }}>
            <div className="success-checkmark" style={{ marginBottom: '24px' }}>
              <div className="check-icon"></div>
            </div>
            
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '8px' }}>Order Confirmed & Received!</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
                Your customized meal is now being prepared by the kitchen team.
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
                  orderReceipt.items.map((item, idx) => (
                    <div key={idx} className="kiosk-receipt-row">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '18px' }}>{item.emoji || '🍽️'}</span>
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
                  ))
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
                        ✨ {tag}
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
          <span style={{ fontSize: '16px' }}>🌿</span>
          <span style={{ fontWeight: '500' }}>© 2026 Umami Craft Fusion. All rights reserved.</span>
        </div>

        <div style={{ flex: 1, height: '1px', background: 'rgba(226, 214, 200, 0.6)', margin: '0 28px' }}></div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', fontSize: '11px', fontWeight: '700', letterSpacing: '0.06em', color: '#8A7D73' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🍜</span>
            <span>FRESH INGREDIENTS</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🍃</span>
            <span>BOLD FLAVORS</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>👥</span>
            <span>A SMARTER DINING EXPERIENCE</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default KioskView;
