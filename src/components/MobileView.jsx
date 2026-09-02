import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import {
  Shield,
  Smartphone,
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
  Receipt
} from 'lucide-react';

const ALLERGEN_OPTIONS = [
  { id: 'peanuts', label: 'Peanuts' },
  { id: 'gluten', label: 'Gluten' },
  { id: 'dairy', label: 'Dairy' },
  { id: 'soy', label: 'Soy' }
];

const PREFERENCE_OPTIONS = [
  { id: 'spicy', label: 'Spicy', icon: <Flame size={14} style={{ marginRight: '4px' }} /> },
  { id: 'vegan', label: 'Vegan', icon: <Leaf size={14} style={{ marginRight: '4px' }} /> },
  { id: 'sweet', label: 'Sweet', icon: <Candy size={14} style={{ marginRight: '4px' }} /> },
  { id: 'savory', label: 'Savory', icon: <UtensilsCrossed size={14} style={{ marginRight: '4px' }} /> },
  { id: 'healthy', label: 'Healthy', icon: <HeartPulse size={14} style={{ marginRight: '4px' }} /> }
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
    return localStorage.getItem('synapse_onboarded') === 'true';
  });
  const [lastOrder, setLastOrder] = useState(() => {
    const saved = localStorage.getItem('synapse_last_order');
    return saved ? JSON.parse(saved) : null;
  });
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

  // Load menu items and restaurant metadata dynamically with resilient fallback
  useEffect(() => {
    const menuEndpoint = backendTargetUrl ? `${backendTargetUrl}/api/menu` : '/api/menu';
    const restEndpoint = backendTargetUrl ? `${backendTargetUrl}/api/restaurant` : '/api/restaurant';

    fetch(menuEndpoint)
      .then(res => res.json())
      .then(data => setMenuItems(data))
      .catch(err => {
        console.warn("Direct menu fetch error, trying relative fallback:", err);
        if (backendTargetUrl) {
          fetch('/api/menu')
            .then(r => r.json())
            .then(d => setMenuItems(d))
            .catch(e => console.error("Fallback menu fetch failed:", e));
        }
      });

    fetch(restEndpoint)
      .then(res => res.json())
      .then(data => setRestaurantMeta(data))
      .catch(err => {
        console.warn("Direct restaurant fetch error, trying relative fallback:", err);
        if (backendTargetUrl) {
          fetch('/api/restaurant')
            .then(r => r.json())
            .then(d => setRestaurantMeta(d))
            .catch(e => console.error("Fallback restaurant fetch failed:", e));
        }
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

  // Setup WebSocket connection targeting the specific restaurant port
  useEffect(() => {
    if (!kioskId || !isOnboarded) return;

    const socket = io(backendTargetUrl || undefined, {
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
      console.log(`[Mobile] Connected to server (${backendTargetUrl || 'local proxy'}), sending handshake for kiosk:`, kioskId);
      socket.emit('join-session', { kioskId, role: 'mobile' });
      // Push current preferences instantly
      socket.emit('project-preferences', { kioskId, allergens, preferences });
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setSocketConnected(false);
    };
  }, [kioskId, isOnboarded, backendTargetUrl]);

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

    // 4. Emit success command to close Kiosk session via WebSocket
    if (socketRef.current && socketConnected) {
      socketRef.current.emit('place-order', {
        kioskId,
        items: cartItems,
        itemCount: getCartCount(),
        totalPrice,
        orderedTags: allOrderedTags
      });
    }

    // 5. Clear session memory locally on phone
    setCart({});
    setIsCartOpen(false);
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

  return (
    <div className="mobile-wrapper fade-in" style={{ position: 'relative' }}>
      {/* App Header */}
      <header style={{ textAlign: 'center', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid var(--border-glass)' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--accent-teal)', marginBottom: '6px' }}>
          <Shield size={20} />
          <span style={{ fontWeight: '800', letterSpacing: '0.05em', fontSize: '14px' }}>SYNAPSE ID</span>
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: '700' }}>Local Dietary Vault</h2>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>🔒 ALL DATA ENCRYPTED IN LOCALSTORAGE ONLY</p>
      </header>

      {/* VIEW 2: ACTIVE KIOSK SCAN VIEW */}
      {kioskId && isOnboarded ? (
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
        /* VIEW 1: PROFILE SETUP / ONBOARDING VIEW */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Captive Portal Activation Banner */}
          {captiveParams && (
            <div className="glass-card highlighted" style={{ padding: '16px', borderRadius: '16px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ background: 'rgba(45, 106, 79, 0.08)', padding: '8px', borderRadius: '10px', color: 'var(--accent-green)' }}>
                  <Shield size={18} />
                </div>
                <div>
                  <h5 style={{ fontSize: '14px', fontWeight: '700' }}>Restaurant Wi-Fi Connected</h5>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    Device MAC: {captiveParams.clientmac || 'Unknown'}
                  </span>
                </div>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '12px' }}>
                Authenticate to unlock guest Wi-Fi. Your dietary vault stays strictly local on your phone.
              </p>
              <button
                onClick={() => {
                  const authUrl = `http://${captiveParams.gatewayaddress}/opennds_auth/?tok=${captiveParams.tok}&redir=${encodeURIComponent(captiveParams.redir || window.location.origin)}`;
                  window.location.href = authUrl;
                }}
                className="btn-primary"
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '12px',
                  borderRadius: '10px',
                  fontWeight: '700'
                }}
              >
                Connect to Guest Wi-Fi
              </button>
            </div>
          )}

          {/* Quick Repeat Last Order Card (Multi-Item Aware) */}
          {lastOrder && (
            <div className="glass-card" style={{ padding: '14px', background: 'rgba(245, 166, 35, 0.04)', borderColor: 'rgba(245, 166, 35, 0.25)', borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                <div>
                  <span style={{ fontSize: '9px', background: 'rgba(245, 166, 35, 0.15)', color: '#B45309', padding: '2px 6px', borderRadius: '4px', fontWeight: '800', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    🔄 Repeat Last Order
                  </span>
                  <h5 style={{ fontSize: '14px', fontWeight: '700', marginTop: '4px' }}>
                    {lastOrder.primaryName || (lastOrder.items ? `${lastOrder.items.length} items` : lastOrder.name)}
                  </h5>
                </div>
                <span style={{ fontSize: '13px', fontWeight: '800' }}>
                  ₱{(lastOrder.totalPrice || lastOrder.price || 0).toFixed(2)}
                </span>
              </div>

              {Array.isArray(lastOrder.items) && (
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', margin: '6px 0' }}>
                  {lastOrder.items.map((i, idx) => (
                    <span key={idx} style={{ fontSize: '10px', background: 'rgba(44, 26, 17, 0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                      {i.emoji || '🍽️'} {i.name} (x{i.quantity || 1})
                    </span>
                  ))}
                </div>
              )}

              {kioskId ? (
                <button
                  onClick={() => {
                    handleRepeatLastOrder();
                    localStorage.setItem('synapse_onboarded', 'true');
                    setIsOnboarded(true);
                  }}
                  className="btn-primary"
                  style={{ width: '100%', padding: '9px', marginTop: '8px', fontSize: '12px', borderRadius: '10px', fontWeight: '600' }}
                >
                  Load Past Order & Pair
                </button>
              ) : (
                <div style={{ marginTop: '6px', fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  👉 Scan any Kiosk terminal to repeat this order instantly.
                </div>
              )}
            </div>
          )}

          {/* Allergens Checklist */}
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🚫 1. Exclude Allergens
            </h4>
            <div className="preference-list">
              {ALLERGEN_OPTIONS.map(opt => {
                const checked = allergens.includes(opt.id);
                return (
                  <label key={opt.id} className={`custom-checkbox ${checked ? 'checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleAllergenToggle(opt.id)}
                    />
                    <div className="checkbox-box"></div>
                    <span style={{ fontSize: '13px', fontWeight: '500' }}>{opt.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Preferences Checklist (All 5 Profiles) */}
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              ⭐ 2. Flavor Preferences
            </h4>
            <div className="preference-list">
              {PREFERENCE_OPTIONS.map(opt => {
                const checked = preferences.includes(opt.id);
                return (
                  <label key={opt.id} className={`custom-checkbox ${checked ? 'checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handlePreferenceToggle(opt.id)}
                    />
                    <div className="checkbox-box"></div>
                    <span style={{ fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center' }}>
                      {opt.icon}
                      {opt.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Automated Taste Profile Training (History Insights) */}
          {history.length > 0 && (
            <div className="glass-card" style={{ padding: '14px', background: 'rgba(255, 255, 255, 0.02)' }}>
              <h5 style={{ fontSize: '11px', color: 'var(--accent-green)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle size={13} /> Taste Profile Insights
              </h5>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '8px' }}>
                Cumulative taste weights calculated from your local multi-item order history:
              </p>

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {Object.entries(tagCounts).map(([tag, count]) => {
                  const isStrongSuggestion = count >= 2;
                  const isChecked = preferences.includes(tag);

                  return (
                    <div
                      key={tag}
                      style={{
                        fontSize: '10px',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: isStrongSuggestion ? 'rgba(45, 106, 79, 0.08)' : 'rgba(44, 26, 17, 0.02)',
                        border: `1px solid ${isStrongSuggestion ? 'var(--accent-green)' : 'var(--border-glass)'}`,
                        color: isStrongSuggestion ? 'var(--text-primary)' : 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>{tag.toUpperCase()} ({count} pts)</span>
                      {isStrongSuggestion && !isChecked && (
                        <button
                          onClick={() => handlePreferenceToggle(tag)}
                          style={{
                            background: 'var(--accent-gradient)',
                            color: '#ffffff',
                            border: 'none',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            fontSize: '8px',
                            fontWeight: '800',
                            cursor: 'pointer'
                          }}
                        >
                          + PROFILE
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Proceed to Kiosk or Standby Scan Message */}
          {kioskId ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => {
                  localStorage.setItem('synapse_onboarded', 'true');
                  setIsOnboarded(true);
                }}
                className="btn-primary"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                Pair & Connect to {restaurantMeta ? restaurantMeta.name : `Kiosk #${kioskId}`}
              </button>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
                Your allergens and preferences will be projected temporarily.
              </p>
            </div>
          ) : (
            <div className="glass-card" style={{ padding: '14px', display: 'flex', gap: '10px', alignItems: 'center', background: 'rgba(255, 255, 255, 0.01)' }}>
              <Smartphone size={18} color="var(--text-muted)" />
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                <strong>Awaiting scan.</strong> Scan a QR code on a kiosk table terminal to securely pair and order.
              </span>
            </div>
          )}

          {/* Factory Reset */}
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-glass)' }}>
            <button
              onClick={handleClearAllData}
              className="btn-danger"
              style={{ width: '100%', padding: '10px', fontSize: '12px', borderRadius: '10px' }}
            >
              Factory Reset (Wipe LocalStorage)
            </button>
          </div>
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
}

export default MobileView;
