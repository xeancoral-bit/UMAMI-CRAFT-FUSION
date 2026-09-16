import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';
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
  Store
} from 'lucide-react';

function generateKioskId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function KioskView({ onOpenKitchen }) {
  const [kioskId, setKioskId] = useState(generateKioskId());
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
  const [lanIp, setLanIp] = useState(null);
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
      .then(data => setMasterMenu(data))
      .catch(err => console.error("Error loading menu:", err));
  }, []);

  // Fetch host LAN IP for dynamic Wi-Fi QR code generation
  useEffect(() => {
    fetch('/api/network-info')
      .then(res => res.json())
      .then(data => {
        if (data && data.ip && data.ip !== 'localhost') {
          setLanIp(data.ip);
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
      .catch(err => console.error("Error fetching network info:", err));
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

    socket.on('disconnect', () => {
      setSocketConnected(false);
      console.log("[Kiosk] Disconnected from socket server");
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

  // Generate mobile scanner URL pointing to auto-detected LAN IP and specific restaurant socket port
  const targetHost = customHost || lanIp || window.location.hostname || 'localhost';
  const currentFrontendPort = restaurantInfo.frontendPort || window.location.port || '3000';
  const mobileTargetPort = restaurantInfo.mobileFrontendPort || currentFrontendPort;
  const currentBackendPort = restaurantInfo.backendPort || (currentFrontendPort === '3010' ? 3002 : (currentFrontendPort === '3020' ? 3003 : 3001));

  let clientUrl = '';
  if (customHost && (customHost.startsWith('http://') || customHost.startsWith('https://'))) {
    const cleanHost = customHost.replace(/\/$/, '');
    clientUrl = `${cleanHost}/?kioskId=${kioskId}&kioskPort=${currentBackendPort}&restaurant=${restaurantInfo.id || 'umami'}`;
  } else {
    clientUrl = `http://${targetHost}:${mobileTargetPort}/?kioskId=${kioskId}&kioskPort=${currentBackendPort}&restaurant=${restaurantInfo.id || 'umami'}`;
  }

  // Filtering and Sorting Menu Items
  // 1. Filter out items containing user allergens
  const filteredMenu = masterMenu.filter(item => {
    return !item.allergens.some(allergen => allergens.includes(allergen));
  });

  // 2. Count match score for preferences to sort/highlight
  const getMatchCount = (item) => {
    return item.tags.filter(tag => preferences.includes(tag)).length;
  };

  // 3. Sort so that items matching the most preferences appear first
  const sortedMenu = [...filteredMenu].sort((a, b) => {
    const scoreA = getMatchCount(a);
    const scoreB = getMatchCount(b);
    return scoreB - scoreA; // High score first
  });

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
          {onOpenKitchen && (
            <button
              onClick={onOpenKitchen}
              className="kiosk-pill-btn kiosk-pill-kitchen"
              title="Open Kitchen Display System"
            >
              <Store size={14} color="#C24522" className="kiosk-pill-icon" />
              <span className="kiosk-pill-label">Kitchen Display</span>
              <ChevronRight size={13} color="#C24522" className="kiosk-pill-chevron" />
            </button>
          )}

          <div className="kiosk-pill-btn kiosk-pill-port">
            <div className={`pulse-indicator ${socketConnected ? 'active' : 'disconnected'}`}></div>
            <span className="kiosk-pill-label">
              {socketConnected ? `Port : ${currentBackendPort}` : 'Connecting Server...'}
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

            {/* Center Column: Polished QR Code Card */}
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
                    <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                      Custom IP / Host:
                    </label>
                    <input
                      type="text"
                      value={customHost}
                      placeholder={lanIp || '192.168.1.14'}
                      onChange={(e) => setCustomHost(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-glass)',
                        fontSize: '12px',
                        marginBottom: '6px',
                        fontFamily: 'var(--font-sans)',
                        background: '#ffffff',
                        color: 'var(--text-primary)'
                      }}
                    />
                    <p style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: '1.3' }}>
                      💡 Set Wi-Fi to <strong>Private Network</strong> in Windows if phone cannot connect.
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span className="pulse-indicator active"></span>
                  <h3 style={{ fontSize: '20px', fontWeight: '700' }}>Connected to Dining Profile</h3>
                </div>
                
                {/* Active Filters Display */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {allergens.length > 0 ? (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>Excluded Allergens:</span>
                      {allergens.map(a => <span key={a} className="badge badge-allergen">{a}</span>)}
                    </div>
                  ) : (
                    <span style={{ fontSize: '12px', color: 'var(--accent-success)', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      ✓ No Allergens Excluded
                    </span>
                  )}
                  
                  {allergens.length > 0 && preferences.length > 0 && <span style={{ color: 'var(--border-glass)' }}>|</span>}

                  {preferences.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>Highlighted Preferences:</span>
                      {preferences.map(p => <span key={p} className="badge badge-recommend">{p}</span>)}
                    </div>
                  )}
                </div>
              </div>

              {/* Countdown Timer */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '10px 20px', borderRadius: '14px' }}>
                <Clock size={18} color="var(--accent-warning)" />
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--accent-warning)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Session Timeout</div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--accent-warning)' }}>{timeLeft}s</div>
                </div>
              </div>
            </div>

            {/* Menu Grid */}
            <div className="menu-grid">
              {sortedMenu.map((item) => {
                const hasMatch = preferences.some(p => item.tags.includes(p));
                const matchCount = getMatchCount(item);
                
                return (
                  <div 
                    key={item.id} 
                    className={`glass-card ${hasMatch ? 'highlighted' : ''}`}
                    style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden' }}
                  >
                    {hasMatch && (
                      <div style={{ position: 'absolute', top: '0', right: '0', background: 'var(--brand-gradient)', padding: '4px 12px', borderBottomLeftRadius: '12px', fontSize: '11px', fontWeight: '700', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        ★ Recommended Match (+{matchCount})
                      </div>
                    )}
                    
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '28px', marginBottom: '8px' }}>{item.emoji || '🍽️'}</div>
                      <h4 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px', paddingRight: hasMatch ? '120px' : '0' }}>{item.name}</h4>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.5' }}>{item.description}</p>
                    </div>

                    <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)' }}>
                        ₱{item.price.toFixed(2)}
                      </div>
                      
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {item.tags.map(tag => (
                          <span 
                            key={tag} 
                            className={`badge ${preferences.includes(tag) ? 'badge-recommend' : 'badge-tag'}`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}

              {sortedMenu.length === 0 && (
                <div style={{ gridColumn: '1 / -1', padding: '60px', textAlign: 'center' }} className="glass-card">
                  <AlertTriangle size={48} color="var(--accent-warning)" style={{ marginBottom: '16px' }} />
                  <h3>No items match your dietary safety profile.</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '8px' }}>
                    All items on the menu contain one or more of your registered allergens.
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
                  <Receipt size={18} color="var(--accent-red)" />
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
