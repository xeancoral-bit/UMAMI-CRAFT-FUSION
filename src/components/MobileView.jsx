import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import {
  Shield,
  CheckCircle,
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
  Receipt,
  Bell,
  BellRing
} from 'lucide-react';
import DeviceMockup from './DeviceMockup';

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

const ALLERGEN_OPTIONS = [
  { id: 'peanuts', label: 'Peanuts', emoji: '🥜' },
  { id: 'gluten',  label: 'Gluten',  emoji: '🌾' },
  { id: 'dairy',   label: 'Dairy',   emoji: '🥛' },
  { id: 'soy',     label: 'Soy',     emoji: '🫘' }
];

const PREFERENCE_OPTIONS = [
  { id: 'spicy',   label: 'Spicy',   emoji: '🔥', icon: <Flame size={14} style={{ marginRight: '4px' }} /> },
  { id: 'vegan',   label: 'Vegan',   emoji: '🌿', icon: <Leaf size={14} style={{ marginRight: '4px' }} /> },
  { id: 'sweet',   label: 'Sweet',   emoji: '🍬', icon: <Candy size={14} style={{ marginRight: '4px' }} /> },
  { id: 'savory',  label: 'Savory',  emoji: '🍴', icon: <UtensilsCrossed size={14} style={{ marginRight: '4px' }} /> },
  { id: 'healthy', label: 'Healthy', emoji: '💚', icon: <HeartPulse size={14} style={{ marginRight: '4px' }} /> }
];

function MobileView({ kioskId, onResetSession }) {
  // --- Load localStorage values ---
  const [allergens, setAllergens] = useState(() => {
    const saved = localStorage.getItem('synapse_allergens');
    return saved ? JSON.parse(saved) : [];
  });

  const [preferences, setPreferences] = useState(() => {
    const saved = localStorage.getItem('synapse_preferences');
    return saved ? JSON.parse(saved) : [];
  });

  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('synapse_order_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [cart, setCart] = useState({}); // { [itemId]: quantity }
  const [isCartOpen, setIsCartOpen] = useState(false);

  const [socketConnected, setSocketConnected] = useState(false);
  const [isOnboarded, setIsOnboarded] = useState(() => {
    const savedOnboarded = localStorage.getItem('synapse_onboarded') === 'true';
    let hasDietaryData = false;
    try {
      const a = localStorage.getItem('synapse_allergens');
      const p = localStorage.getItem('synapse_preferences');
      if ((a && JSON.parse(a).length > 0) || (p && JSON.parse(p).length > 0)) {
        hasDietaryData = true;
      }
    } catch (e) {}
    return savedOnboarded || hasDietaryData;
  });
  const [lastOrder, setLastOrder] = useState(() => {
    const saved = localStorage.getItem('synapse_last_order');
    return saved ? JSON.parse(saved) : null;
  });
  const [activeOrder, setActiveOrder] = useState(() => {
    const saved = localStorage.getItem('synapse_active_order');
    return saved ? JSON.parse(saved) : null;
  });
  const [showReadyCelebration, setShowReadyCelebration] = useState(false);
  const [notifPermission, setNotifPermission] = useState(
    'Notification' in window ? Notification.permission : 'unavailable'
  );
  const vibReminderRef = useRef(null);

  const socketRef = useRef(null);
  const [menuItems, setMenuItems] = useState([]);
  const [restaurantMeta, setRestaurantMeta] = useState(null);
  const [captiveParams, setCaptiveParams] = useState(null);


  // Extract kioskPort parameter from URL to target the correct restaurant instance
  const urlParams = new URLSearchParams(window.location.search);
  const kioskPort = urlParams.get('kioskPort');
  const backendTargetUrl = (kioskPort && kioskPort !== window.location.port)
    ? `http://${window.location.hostname}:${kioskPort}`
    : '';

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

  // Full-strength ORDER READY alert: chime + vibration + browser notification + repeat reminder
  const triggerReadyAlert = useCallback((order) => {
    // 1. Rich audio fanfare
    playReadyChime();

    // 2. Strong haptic burst
    doVibrate(VIBRATE_READY);

    // 3. Browser push notification (works even when tab is backgrounded)
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const n = new Notification('🔔 Your Order is Ready for Pickup!', {
          body: `Order #${order.orderId || ''} at ${restaurantMeta ? restaurantMeta.name : 'the restaurant'} is freshly prepared and waiting for you.`,
          icon: '/favicon.svg',
          badge: '/favicon.svg',
          tag: `order-ready-${order.orderId}`,  // replaces previous duplicate notifications
          renotify: true,
          requireInteraction: true,              // stays on screen until dismissed
          silent: false
        });
        // Bring app into focus when notification tapped
        n.onclick = () => { window.focus(); n.close(); };
      } catch (e) {
        console.warn('Notification error:', e);
      }
    }

    // 4. Screen wake lock — keep display on so customer sees the alert
    if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen').catch(() => {});
    }

    // 5. Repeating vibration reminder every 30 s until acknowledged
    stopVibReminder();
    vibReminderRef.current = setInterval(() => {
      doVibrate(VIBRATE_REMINDER);
    }, 30_000);

    // 6. Show full-screen celebration overlay
    setShowReadyCelebration(true);
  }, [restaurantMeta, stopVibReminder]);

  // Load menu items and restaurant metadata dynamically with resilient fallback
  useEffect(() => {
    const menuEndpoint = backendTargetUrl ? `${backendTargetUrl}/api/menu` : '/api/menu';
    const restEndpoint = backendTargetUrl ? `${backendTargetUrl}/api/restaurant` : '/api/restaurant';

    fetch(menuEndpoint)
      .then(res => res.json())
      .then(data => setMenuItems(data))
      .catch(err => {
        console.warn("Direct menu fetch error, trying relative fallback:", err);
        fetch('/api/menu')
          .then(r => r.json())
          .then(d => setMenuItems(d))
          .catch(e => console.error("Fallback menu fetch failed:", e));
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
  const targetKioskId = kioskId || (activeOrder ? activeOrder.kioskId : null);

  useEffect(() => {
    if (!targetKioskId) return;

    const socket = io(backendTargetUrl || undefined, {
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
      console.log(`[Mobile] Connected to server (${backendTargetUrl || 'local proxy'}), joining session:`, targetKioskId);
      socket.emit('join-session', { kioskId: targetKioskId, role: 'mobile' });
      
      // Push current preferences if onboarded
      if (isOnboarded && kioskId) {
        socket.emit('project-preferences', { kioskId: targetKioskId, allergens, preferences });
      }
    });

    socket.on('order-confirmed', (confirmedOrder) => {
      console.log("[Mobile] Order confirmed by backend:", confirmedOrder);
      setActiveOrder(confirmedOrder);
      localStorage.setItem('synapse_active_order', JSON.stringify(confirmedOrder));
    });

    socket.on('order-status-updated', (data) => {
      console.log("[Mobile] Received order status update:", data);
      setActiveOrder(prev => {
        if (!prev) return null;
        if (prev.orderId === data.orderId || prev.kioskId === data.kioskId) {
          const updated = { ...prev, status: data.status, busserName: data.busserName || prev.busserName, updatedAt: data.updatedAt };
          localStorage.setItem('synapse_active_order', JSON.stringify(updated));

          if (data.status === 'Order Ready') {
            triggerReadyAlert(updated);
          }
          if (data.status === 'Out for Delivery') {
            // Gentle vibration for busser dispatched
            if (navigator.vibrate) {
              try { navigator.vibrate([100, 50, 100]); } catch(e) {}
            }
          }
          return updated;
        }
        return prev;
      });
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setSocketConnected(false);
    };
  }, [targetKioskId, isOnboarded, backendTargetUrl]);

  // Clean up vibration reminder on unmount
  useEffect(() => {
    return () => stopVibReminder();
  }, [stopVibReminder]);

  // Instantly push preferences to the socket room whenever preferences or allergens change
  useEffect(() => {
    if (socketRef.current && socketConnected && kioskId && isOnboarded) {
      console.log("[Mobile] Live pushing updated preferences to Kiosk:", { allergens, preferences });
      socketRef.current.emit('project-preferences', {
        kioskId,
        allergens,
        preferences
      });
    }
  }, [allergens, preferences, socketConnected, kioskId, isOnboarded]);

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

  // Cart Helper Methods
  const handleAddToCart = (item) => {
    setCart(prev => ({
      ...prev,
      [item.id]: (prev[item.id] || 0) + 1
    }));
  };

  const handleUpdateQuantity = (itemId, delta) => {
    setCart(prev => {
      const current = prev[itemId] || 0;
      const next = current + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
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
      .map(([id, qty]) => {
        const item = menuItems.find(m => m.id === parseInt(id, 10));
        return item ? { ...item, quantity: qty } : null;
      })
      .filter(Boolean);
  };

  const getCartTotal = () => {
    return getCartItems().reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const getCartCount = () => {
    return Object.values(cart).reduce((sum, qty) => sum + qty, 0);
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
  const handlePlaceOrder = () => {
    const cartItems = getCartItems();
    if (cartItems.length === 0) {
      alert("Please add at least one dish to your order.");
      return;
    }

    // 1. Update local user history with ordered food item tags (cumulative weighting by quantity)
    const newHistory = [...history];
    const allOrderedTags = [];
    let totalPrice = 0;

    cartItems.forEach(cartItem => {
      totalPrice += cartItem.price * cartItem.quantity;
      for (let i = 0; i < cartItem.quantity; i++) {
        cartItem.tags.forEach(tag => {
          newHistory.push(tag);
          allOrderedTags.push(tag);
        });
      }
    });

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

    const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const newActiveOrder = {
      orderId,
      kioskId: kioskId || 'COUNTER',
      items: cartItems,
      itemCount: getCartCount(),
      totalPrice,
      orderedTags: allOrderedTags,
      allergens,
      status: 'Order Received',
      createdAt: new Date().toISOString()
    };

    setActiveOrder(newActiveOrder);
    localStorage.setItem('synapse_active_order', JSON.stringify(newActiveOrder));

    // 5. Emit order to backend and kitchen
    if (socketRef.current && socketConnected) {
      socketRef.current.emit('place-order', {
        kioskId,
        items: cartItems,
        itemCount: getCartCount(),
        totalPrice,
        orderedTags: allOrderedTags,
        allergens
      });
    }

    // 6. Clear cart locally
    setCart({});
    setIsCartOpen(false);
  };

  // Dismiss / complete active order session
  const handleDismissOrder = () => {
    stopVibReminder();            // cancel repeating haptic reminder
    localStorage.removeItem('synapse_active_order');
    setActiveOrder(null);
    setShowReadyCelebration(false);
    onResetSession();
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

  // Safe foods filtering (Mobile list)
  const safeItems = menuItems.filter(item => {
    return !item.allergens.some(a => allergens.includes(a));
  });

  // Simple taste profiling analytics
  const tagCounts = history.reduce((acc, tag) => {
    acc[tag] = (acc[tag] || 0) + 1;
    return acc;
  }, {});

  const cartItemsList = getCartItems();
  const totalCartCount = getCartCount();
  const totalCartPrice = getCartTotal();

  // The inner phone content (shared between desktop phone frame and plain mobile wrapper)
  const phoneContent = (
    <div className="mobile-wrapper fade-in" style={{ position: 'relative' }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className={`pulse-indicator ${socketConnected ? 'active' : 'disconnected'}`}></span>
                <span style={{ fontSize: '11px', color: socketConnected ? 'var(--text-secondary)' : 'var(--accent-danger)', fontWeight: '600' }}>
                  {socketConnected ? 'Live' : 'Connecting'}
                </span>
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
              <div style={{ fontSize: '20px' }}>🔔</div>
            </div>
          )}

          {/* Foodpanda-Style Live Tracking Stepper Card */}
          <div className="fp-tracking-card" style={{ marginBottom: '16px' }}>
            <div className="fp-tracking-header">
              <div>
                <div className="fp-tracking-title">
                  <span>📍</span> Live Order Tracking
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
                  (activeOrder.status === 'Order Ready') ? 'calc(66% - 20px)' :
                  (activeOrder.status === 'Cooking') ? 'calc(33% - 20px)' : '0%'
              }}></div>

              {/* Step 1: Order Placed */}
              <div className={`fp-step-item completed`}>
                <div className="fp-step-circle">✓</div>
                <span className="fp-step-label">Order Placed</span>
              </div>

              {/* Step 2: Cooking */}
              <div className={`fp-step-item ${activeOrder.status === 'Cooking' ? 'active' : (activeOrder.status === 'Order Ready' || activeOrder.status === 'Out for Delivery' || activeOrder.status === 'Completed' ? 'completed' : '')}`}>
                <div className="fp-step-circle">🍳</div>
                <span className="fp-step-label">Preparing</span>
              </div>

              {/* Step 3: Order Ready / Busser */}
              <div className={`fp-step-item ${activeOrder.status === 'Order Ready' ? 'active' : (activeOrder.status === 'Out for Delivery' || activeOrder.status === 'Completed' ? 'completed' : '')}`}>
                <div className="fp-step-circle">🔔</div>
                <span className="fp-step-label">Ready</span>
              </div>

              {/* Step 4: Delivered */}
              <div className={`fp-step-item ${activeOrder.status === 'Out for Delivery' ? 'active' : (activeOrder.status === 'Completed' ? 'completed' : '')}`}>
                <div className="fp-step-circle">🏃</div>
                <span className="fp-step-label">Delivered</span>
              </div>
            </div>

            {/* Dynamic Status Detail */}
            <div className={`order-status-message-box status-${activeOrder.status ? activeOrder.status.toLowerCase().replace(/\s+/g, '-') : 'received'}`} style={{ marginTop: '16px' }}>
              {activeOrder.status === 'Order Received' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '24px' }}>📋</span>
                  <div>
                    <h5 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>Order Received by Kitchen</h5>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Your meal has been forwarded to the chefs and placed in the preparation queue.
                    </p>
                  </div>
                </div>
              )}

              {activeOrder.status === 'Cooking' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '24px' }}>🍳</span>
                  <div>
                    <h5 style={{ fontSize: '14px', fontWeight: '800', color: '#B45309' }}>Chefs Are Preparing Your Meal!</h5>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Your personalized order is sizzling in the kitchen right now. Almost there!
                    </p>
                  </div>
                </div>
              )}

              {activeOrder.status === 'Order Ready' && (
                <div className="fp-busser-alert-banner">
                  <span style={{ fontSize: '24px' }}>🔔</span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '14px' }}>Order Ready! Busser Being Dispatched</div>
                    <div style={{ fontSize: '12px', opacity: 0.85, marginTop: '2px' }}>
                      Your food is ready at the pass. A food runner will bring it to your table shortly.
                    </div>
                  </div>
                </div>
              )}

              {activeOrder.status === 'Out for Delivery' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '12px', padding: '14px' }}>
                  <span style={{ fontSize: '24px' }}>🏃</span>
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
                  <span style={{ fontSize: '24px' }}>✅</span>
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
                <Receipt size={16} color="var(--text-muted)" />
                <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Receipt Details
                </span>
              </div>
              <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--accent-red)' }}>
                ₱{(activeOrder.totalPrice || 0).toFixed(2)}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
              {(activeOrder.items || (activeOrder.item ? [activeOrder.item] : [])).map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{item.quantity || 1}x</span>
                    <span>{item.emoji || '🍽️'}</span>
                    <span style={{ fontWeight: '500' }}>{item.name}</span>
                  </div>
                  <span style={{ fontWeight: '700' }}>
                    ₱{((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                  </span>
                </div>
              ))}
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
                  fontSize: '52px', boxShadow: '0 0 0 0 rgba(228,87,41,0.7)',
                  animation: 'vibrate-ring 0.6s ease-in-out 3, pulse-ring 2.5s ease-in-out 0.6s infinite'
                }}>
                  🔔
                </div>
              </div>

              <h2 style={{
                fontSize: '28px', fontWeight: 900, color: 'white',
                textAlign: 'center', marginBottom: '10px', letterSpacing: '-0.5px'
              }}>
                Your Meal is Ready! 🍽️
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
                🚶 I'm On My Way!
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
          {activeOrder.status === 'Order Ready' && !showReadyCelebration && (
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
              <div style={{ fontSize: '20px' }}>👆</div>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
            {activeOrder.status === 'Order Ready' || activeOrder.status === 'Completed' ? (
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
      ) : kioskId && isOnboarded ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
          <div className="glass-card" style={{ padding: '14px', background: 'rgba(45, 106, 79, 0.04)', borderColor: 'rgba(45, 106, 79, 0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--accent-green)', fontWeight: '700', letterSpacing: '0.05em' }}>
                  {restaurantMeta ? `${restaurantMeta.cuisine} • Broadcasting` : 'Broadcasting Securely'}
                </span>
                <h4 style={{ fontSize: '15px', fontWeight: '700' }}>
                  {restaurantMeta ? restaurantMeta.name : `Kiosk Session #${kioskId}`}
                </h4>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Terminal ID: #{kioskId} {kioskPort && `• Port :${kioskPort}`}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className={`pulse-indicator ${socketConnected ? 'active' : 'disconnected'}`}></span>
                <span style={{ fontSize: '11px', color: socketConnected ? 'var(--text-secondary)' : 'var(--accent-danger)' }}>
                  {socketConnected ? 'Connected' : 'Offline'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Edit settings in connected view */}
          <div>
            <h5 style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: '700' }}>
              Active Profile Filters (Syncs Live)
            </h5>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
              {ALLERGEN_OPTIONS.map(opt => {
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
                      fontWeight: '600'
                    }}
                  >
                    Excl. {opt.label}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {PREFERENCE_OPTIONS.map(opt => {
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
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ordering Panel */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h5 style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>
                Safe Menu ({safeItems.length} items)
              </h5>
              {totalCartCount > 0 && (
                <span style={{ fontSize: '11px', color: 'var(--accent-red)', fontWeight: '700' }}>
                  {totalCartCount} in cart (₱{totalCartPrice.toFixed(2)})
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '300px', paddingRight: '4px', marginBottom: '12px' }}>
              {safeItems.map(item => {
                const qtyInCart = cart[item.id] || 0;
                const isMatch = preferences.some(p => item.tags.includes(p));
                const matchCount = item.tags.filter(p => preferences.includes(p)).length;

                return (
                  <div
                    key={item.id}
                    style={{
                      padding: '12px',
                      borderRadius: '12px',
                      background: qtyInCart > 0 ? 'rgba(217, 56, 58, 0.05)' : 'var(--bg-surface)',
                      border: `1px solid ${qtyInCart > 0 ? 'var(--accent-red)' : 'var(--border-glass)'}`,
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ paddingRight: '8px', flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '18px' }}>{item.emoji || '🍽️'}</span>
                        <h6 style={{ fontSize: '14px', fontWeight: '700' }}>{item.name}</h6>
                        {isMatch && (
                          <span style={{ fontSize: '9px', background: 'var(--accent-gradient)', color: '#ffffff', padding: '1px 5px', borderRadius: '4px', fontWeight: '700' }}>
                            MATCH (+{matchCount})
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '3px' }}>{item.description}</p>
                      <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                        {item.tags.map(tag => (
                          <span key={tag} className={`badge ${preferences.includes(tag) ? 'badge-recommend' : 'badge-tag'}`} style={{ fontSize: '9px', padding: '2px 6px' }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', minWidth: '90px' }}>
                      <div style={{ fontWeight: '800', fontSize: '14px' }}>
                        ₱{item.price.toFixed(2)}
                      </div>

                      {qtyInCart > 0 ? (
                        <div className="qty-stepper">
                          <button
                            className="qty-btn"
                            onClick={() => handleUpdateQuantity(item.id, -1)}
                            title="Decrease quantity"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="qty-count">{qtyInCart}</span>
                          <button
                            className="qty-btn"
                            onClick={() => handleUpdateQuantity(item.id, 1)}
                            title="Increase quantity"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAddToCart(item)}
                          style={{
                            background: 'var(--bg-surface-elevated)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-glass)',
                            borderRadius: '8px',
                            padding: '5px 10px',
                            fontSize: '11px',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Plus size={12} /> Add
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {safeItems.length === 0 && (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No meals match your active allergen safety filters.
                </div>
              )}
            </div>

            {/* Sticky Floating Bottom Cart Trigger */}
            {totalCartCount > 0 && (
              <div className="cart-floating-bar" onClick={() => setIsCartOpen(true)} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ background: 'var(--accent-gradient)', color: '#ffffff', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '13px' }}>
                    {totalCartCount}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '700' }}>View Cart</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{cartItemsList.length} unique {cartItemsList.length === 1 ? 'item' : 'items'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--accent-red)' }}>
                    ₱{totalCartPrice.toFixed(2)}
                  </span>
                  <ChevronUp size={18} color="var(--accent-red)" />
                </div>
              </div>
            )}

            {/* Actions Footer */}
            <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--border-glass)' }}>
              <button
                onClick={() => setIsCartOpen(true)}
                className="btn-primary"
                disabled={totalCartCount === 0}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: totalCartCount > 0 ? 1 : 0.45,
                  cursor: totalCartCount > 0 ? 'pointer' : 'not-allowed'
                }}
              >
                <ShoppingCart size={16} />
                {totalCartCount > 0 ? `Review Order (${totalCartCount} items • ₱${totalCartPrice.toFixed(2)})` : 'Add items to order'}
              </button>

              <button
                onClick={onResetSession}
                className="btn-secondary"
                style={{ width: '100%', padding: '8px', marginTop: '8px', fontSize: '12px', borderRadius: '10px' }}
              >
                Disconnect Session
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ═══════════════════════════════════════════════════════
           VIEW 1 — PREMIUM ONBOARDING  (matches Image 1 design)
           ═══════════════════════════════════════════════════════ */
        <div className="mvault-root">

          {/* ── Decorative corner: ensō brush + kanji ── */}
          <div className="mvault-deco-corner" aria-hidden="true">
            <div className="mvault-enso" />
            <div className="mvault-kanji">旨味</div>
            <div className="mvault-deco-tag">GOOD<br/>FOOD<br/>BETTER<br/>DAYS</div>
          </div>

          {/* ── Hero Header ── */}
          <div className="mvault-hero">
            <div className="mvault-badge">
              <Shield size={15} strokeWidth={2.5} color="#059669" />
              <span>UMAMI CRAFT FUSION ID</span>
            </div>
            <h1 className="mvault-title">
              Local <span className="mvault-title-accent">Dietary Vault</span>
            </h1>
            <p className="mvault-subtitle">🔒 ALL DATA ENCRYPTED IN LOCAL STORAGE ONLY</p>
            <div className="mvault-divider-herb">⸻ 🌿 ⸻</div>
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

          {/* ── Quick Repeat Last Order ── */}
          {lastOrder && (
            <div className="glass-card" style={{ padding: '12px 14px', background: 'rgba(245,166,35,0.04)', borderColor: 'rgba(245,166,35,0.25)', borderRadius: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                <div>
                  <span style={{ fontSize: '9px', background: 'rgba(245,166,35,0.15)', color: '#B45309', padding: '2px 6px', borderRadius: '4px', fontWeight: '800', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    🔄 Repeat Last Order
                  </span>
                  <h5 style={{ fontSize: '13px', fontWeight: '700', marginTop: '4px' }}>
                    {lastOrder.primaryName || (lastOrder.items ? `${lastOrder.items.length} items` : lastOrder.name)}
                  </h5>
                </div>
                <span style={{ fontSize: '13px', fontWeight: '800' }}>
                  ₱{(lastOrder.totalPrice || lastOrder.price || 0).toFixed(2)}
                </span>
              </div>
              {kioskId && (
                <button
                  onClick={() => { handleRepeatLastOrder(); localStorage.setItem('synapse_onboarded', 'true'); setIsOnboarded(true); }}
                  className="btn-primary"
                  style={{ width: '100%', padding: '8px', marginTop: '8px', fontSize: '12px', borderRadius: '10px', fontWeight: '600' }}
                >
                  Load Past Order &amp; Pair
                </button>
              )}
            </div>
          )}

          {/* ══ RESPONSIVE SECTIONS GRID: Allergens & Preferences ══ */}
          <div className="mvault-sections-container">
            {/* ══ SECTION 1 — Exclude Allergens ══ */}
            <div className="mvault-section">
              <div className="mvault-section-header">
                <div className="mvault-section-num">1</div>
                <div>
                  <div className="mvault-section-title">Exclude Allergens</div>
                  <div className="mvault-section-sub">STAY SAFE. EAT CONFIDENTLY.</div>
                </div>
              </div>
              <div className="mvault-checklist">
                {ALLERGEN_OPTIONS.map(opt => {
                  const checked = allergens.includes(opt.id);
                  return (
                    <label key={opt.id} className={`mvault-check-row${checked ? ' checked' : ''}`}>
                      <input type="checkbox" checked={checked} onChange={() => handleAllergenToggle(opt.id)} />
                      <span className="mvault-check-box" aria-hidden="true" />
                      <span className="mvault-check-emoji">{opt.emoji}</span>
                      <span className="mvault-check-label">{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* ══ SECTION 2 — Flavor Preferences ══ */}
            <div className="mvault-section">
              <div className="mvault-section-header">
                <div className="mvault-section-num mvault-section-num--amber">2</div>
                <div>
                  <div className="mvault-section-title">Flavor Preferences</div>
                  <div className="mvault-section-sub">MAKE IT YOURS.</div>
                </div>
              </div>
              <div className="mvault-checklist">
                {PREFERENCE_OPTIONS.map(opt => {
                  const checked = preferences.includes(opt.id);
                  return (
                    <label key={opt.id} className={`mvault-check-row${checked ? ' checked' : ''}`}>
                      <input type="checkbox" checked={checked} onChange={() => handlePreferenceToggle(opt.id)} />
                      <span className="mvault-check-box" aria-hidden="true" />
                      <span className="mvault-check-emoji">{opt.emoji}</span>
                      <span className="mvault-check-label">{opt.label}</span>
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
            {kioskId ? (
              <button
                onClick={() => { localStorage.setItem('synapse_onboarded', 'true'); setIsOnboarded(true); }}
                className="mvault-save-btn"
              >
                <span>💾</span>
                <span>Save Preferences</span>
                <span className="mvault-save-arrow">›</span>
              </button>
            ) : (
              <button
                onClick={() => { localStorage.setItem('synapse_onboarded', 'true'); setIsOnboarded(true); }}
                className="mvault-save-btn"
              >
                <span>💾</span>
                <span>Save Preferences</span>
                <span className="mvault-save-arrow">›</span>
              </button>
            )}
            <button onClick={onResetSession} className="mvault-later-btn">
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
                  {cartItemsList.map(item => (
                    <div key={item.id} className="cart-item-row">
                      <div style={{ flex: 1, paddingRight: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{item.emoji || '🍽️'}</span>
                          <span style={{ fontWeight: '700', fontSize: '13px' }}>{item.name}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          ₱{item.price.toFixed(2)} each
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="qty-stepper">
                          <button className="qty-btn" onClick={() => handleUpdateQuantity(item.id, -1)}>
                            <Minus size={12} />
                          </button>
                          <span className="qty-count">{item.quantity}</span>
                          <button className="qty-btn" onClick={() => handleUpdateQuantity(item.id, 1)}>
                            <Plus size={12} />
                          </button>
                        </div>
                        <span style={{ fontWeight: '800', fontSize: '13px', minWidth: '60px', textAlign: 'right' }}>
                          ₱{(item.price * item.quantity).toFixed(2)}
                        </span>
                        <button
                          onClick={() => handleRemoveFromCart(item.id)}
                          style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', padding: '2px' }}
                          title="Remove item"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '16px', marginTop: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
                    <span>Total Items:</span>
                    <span>{totalCartCount} items</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '18px', fontWeight: '800' }}>
                    <span>Order Total:</span>
                    <span style={{ color: 'var(--accent-red)' }}>₱{totalCartPrice.toFixed(2)}</span>
                  </div>

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
                    <Receipt size={18} />
                    Confirm & Place Order
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
        <p className="mv-hero-eyebrow">GOOD FOOD • BRIGHTER DAYS</p>
        <h1 className="mv-hero-headline">
          Personalized Dining for a <span className="mv-hero-accent">Brighter Tomorrow</span>
        </h1>
        <p className="mv-hero-tagline">
          Your preferences. A better dining experience.
        </p>
        {kioskId && (
          <div style={{ marginTop: '10px', display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(5, 150, 105, 0.12)', border: '1px solid rgba(5, 150, 105, 0.35)', padding: '5px 16px', borderRadius: '9999px', fontSize: '12px', fontWeight: '700', color: '#059669' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', display: 'inline-block', boxShadow: '0 0 6px #10B981' }}></span>
            <span>Live Paired to Kiosk Terminal #{kioskId}</span>
          </div>
        )}
      </header>

      {/* ── Responsive Device Mockup Showcase ── */}
      <div className="mv-hero-mockup-wrapper">
        <DeviceMockup
          defaultDevice="auto"
          showToolbar={!kioskId}
          title={kioskId ? `Umami Craft Fusion • Kiosk #${kioskId}` : "Umami Craft Fusion Local Dietary Vault"}
        >
          {phoneContent}
        </DeviceMockup>
      </div>
    </div>
  );
}

export default MobileView;
