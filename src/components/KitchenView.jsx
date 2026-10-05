import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  Flame,
  BellRing,
  AlertTriangle,
  ArrowLeft,
  Volume2,
  VolumeX,
  Receipt,
  Utensils,
  Check,
  Calendar,
  Monitor,
  Smartphone,
  Tablet,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

function playChime(type = 'new-order') {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === 'new-order') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now); // A4
      osc.frequency.setValueAtTime(659.25, now + 0.12); // E5
      osc.frequency.setValueAtTime(880, now + 0.24); // A5
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.6);
    } else if (type === 'ready') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.15); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.3); // G5
      osc.frequency.setValueAtTime(1046.50, now + 0.45); // C6
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.9);
    }
  } catch (e) {
    console.warn("Kitchen chime audio playback failed:", e);
  }
}

function normalizeKitchenStatus(status) {
  if (!status) return 'New';
  if (status === 'Order Received') return 'New';
  if (status === 'Cooking') return 'Ready for Pickup';
  if (status === 'Order Ready' || status === 'Ready') return 'Ready for Pickup';
  return status;
}

// Accurate detection of device or platform used (Desktop, Tablet, or Mobile)
function getOrderDeviceInfo(order) {
  if (!order) return { type: 'Mobile', label: 'Mobile', Icon: Smartphone };

  // 1. Explicit properties on the order record
  const explicit = (
    order.device ||
    order.platform ||
    order.deviceType ||
    order.gadgetType ||
    order.sourcePlatform ||
    ''
  ).trim();

  if (explicit) {
    const lower = explicit.toLowerCase();
    if (lower === 'desktop' || lower.includes('laptop') || lower.includes('pc') || lower.includes('workstation')) {
      return { type: 'Desktop', label: 'Desktop', Icon: Monitor };
    }
    if (lower === 'tablet' || lower.includes('ipad') || lower.includes('tab')) {
      return { type: 'Tablet', label: 'Tablet', Icon: Tablet };
    }
    if (lower === 'mobile' || lower.includes('phone') || lower.includes('smartphone') || lower.includes('customer device')) {
      return { type: 'Mobile', label: 'Mobile', Icon: Smartphone };
    }
  }

  // 2. Customer string cues
  const cust = (order.customer || '').toLowerCase();
  if (cust.includes('mobile') || cust.includes('phone') || cust.includes('app diner')) {
    return { type: 'Mobile', label: 'Mobile', Icon: Smartphone };
  }
  if (cust.includes('tablet') || cust.includes('ipad')) {
    return { type: 'Tablet', label: 'Tablet', Icon: Tablet };
  }
  if (cust.includes('desktop') || cust.includes('pc') || cust.includes('terminal')) {
    return { type: 'Desktop', label: 'Desktop', Icon: Monitor };
  }

  // 3. Status history update metadata
  if (Array.isArray(order.statusHistory) && order.statusHistory.length > 0) {
    const origin = (order.statusHistory[0].updatedBy || '').toLowerCase();
    if (origin.includes('customer app') || origin.includes('mobile')) {
      return { type: 'Mobile', label: 'Mobile', Icon: Smartphone };
    }
    if (origin.includes('tablet')) {
      return { type: 'Tablet', label: 'Tablet', Icon: Tablet };
    }
    if (origin.includes('kiosk') && !order.kioskId?.startsWith('T-')) {
      return { type: 'Desktop', label: 'Desktop', Icon: Monitor };
    }
  }

  // 4. Kiosk / Terminal / Table identification
  const kiosk = String(order.kioskId || '').toUpperCase();
  const loc = String(order.location || '').toLowerCase();

  // Mobile QR session tokens: 6-character alphanumeric (e.g. 44KE0S) or containing MOBILE
  if (kiosk.includes('MOBILE') || /^[A-Z0-9]{6}$/.test(kiosk)) {
    return { type: 'Mobile', label: 'Mobile', Icon: Smartphone };
  }

  // Table ordering tablets (T-1, T-2, T-3, T-5, T-8 or location containing Table)
  if (kiosk.startsWith('T-') || loc.includes('table')) {
    return { type: 'Tablet', label: 'Tablet', Icon: Tablet };
  }

  // Self-ordering kiosks or counter POS workstations
  if (kiosk.startsWith('K-') || kiosk === 'COUNTER' || loc.includes('kiosk') || loc.includes('counter')) {
    return { type: 'Desktop', label: 'Desktop', Icon: Monitor };
  }

  return { type: 'Mobile', label: 'Mobile', Icon: Smartphone };
}

// Clean and formal formatting of record time (e.g., "11:14 PM")
function formatOrderTime(dateVal) {
  if (!dateVal) return '--:--';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

// Clean and formal formatting of record date (e.g., "Sep 21, 2026")
function formatOrderDate(dateVal) {
  if (!dateVal) return '--- --, ----';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '--- --, ----';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

// Comprehensive parser for item-level customization, variants, add-ons and instructions
function getItemDetails(item) {
  if (!item) return { name: '', qty: 1, variant: null, addons: [], instructions: [], tags: [], price: 0, lineTotal: 0 };

  const qty = item.quantity || item.qty || 1;
  const name = item.name || 'Unnamed Dish';

  // 1. Variant or Size
  let variant = item.selectedSize ||
    item.size ||
    item.selectedVariant ||
    item.variant ||
    (typeof item.sizes === 'string' && item.sizes.trim().toLowerCase() !== 'standard' ? item.sizes.trim() : null);

  if (!variant && name) {
    const match = name.match(/\(([^)]+)\)/);
    if (match && match[1]) {
      variant = match[1].trim();
    }
  }

  const parseList = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) {
      return val
        .map(v => (typeof v === 'object' && v ? (v.name || v.label || JSON.stringify(v)) : String(v).trim()))
        .filter(Boolean);
    }
    if (typeof val === 'string' && val.trim()) {
      return val.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
  };

  // 2. Add-ons
  const addons = [
    ...parseList(item.addons),
    ...parseList(item.addOns),
    ...parseList(item.selectedAddons),
    ...parseList(item.extra)
  ];

  // 3. Special Instructions
  const instructions = [
    ...parseList(item.specialInstructions),
    ...parseList(item.instructions),
    ...parseList(item.specialInstruction),
    ...parseList(item.notes),
    ...parseList(item.note)
  ];

  // 4. Customizations array categorization
  if (Array.isArray(item.customizations)) {
    item.customizations.forEach(c => {
      if (typeof c === 'string' && c.trim()) {
        const trimmed = c.trim();
        const lower = trimmed.toLowerCase();
        // If variant not yet extracted and this is a size/variant string
        if (!variant && (lower.startsWith('size:') || lower.startsWith('variant:') || lower === 'large' || lower === 'medium' || lower === 'regular' || lower === 'small')) {
          variant = trimmed.includes(':') ? trimmed.split(':')[1].trim() : trimmed;
          return;
        }
        // If it's an add-on
        if (
          lower.startsWith('+') ||
          lower.includes('+₱') ||
          lower.startsWith('extra ') ||
          lower.startsWith('add ') ||
          lower.includes('boba') ||
          lower.includes('pudding') ||
          lower.includes('jelly') ||
          lower.includes('topping')
        ) {
          if (!addons.some(a => a.toLowerCase() === lower)) {
            addons.push(trimmed);
          }
        } else {
          // It's a preparation instruction
          if (
            (!variant || lower !== variant.toLowerCase()) &&
            !instructions.some(i => i.toLowerCase() === lower) &&
            !addons.some(a => a.toLowerCase() === lower)
          ) {
            instructions.push(trimmed);
          }
        }
      }
    });
  }

  // 5. Tags
  const tags = Array.isArray(item.tags)
    ? item.tags
    : (typeof item.tags === 'string' && item.tags.trim() ? [item.tags.trim()] : []);

  // 6. Price
  const price = typeof item.price === 'number' ? item.price : (parseFloat(item.price) || 0);

  return {
    name,
    qty,
    variant,
    addons,
    instructions,
    tags,
    price,
    lineTotal: price * qty
  };
}

function KitchenView({ onReturnToKiosk }) {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('active'); // 'active' | 'received' | 'preparing' | 'ready' | 'all'
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  // Compact by default: set of expanded card IDs (ORD-XXXX)
  const [expandedOrders, setExpandedOrders] = useState(() => new Set());

  const toggleOrderDetails = (orderId, e) => {
    if (e) {
      e.stopPropagation();
    }
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };
  const [restaurantInfo, setRestaurantInfo] = useState({
    name: 'Restaurant Kitchen',
    cuisine: 'Culinary Station',
    backendPort: 3001
  });
  const [socketConnected, setSocketConnected] = useState(false);
  const [catalogImages, setCatalogImages] = useState({});
  const socketRef = useRef(null);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load menu and drinks catalogs to build an image lookup map by name
  useEffect(() => {
    Promise.all([
      fetch('/api/menu').then(r => r.json()).catch(() => []),
      fetch('/api/drinks').then(r => r.json()).catch(() => [])
    ]).then(([menuData, drinksData]) => {
      const map = {};
      if (Array.isArray(menuData)) {
        menuData.forEach(item => {
          if (item.name && item.image) {
            map[item.name.toLowerCase().trim()] = item.image;
          }
        });
      }
      if (Array.isArray(drinksData)) {
        drinksData.forEach(item => {
          if (item.name && item.image) {
            map[item.name.toLowerCase().trim()] = item.image;
          }
        });
      }
      setCatalogImages(map);
    });
  }, []);

  const getItemImage = (item) => {
    if (item.image && typeof item.image === 'string' && item.image.trim() !== '') {
      return item.image;
    }
    if (item.imageUrl && typeof item.imageUrl === 'string' && item.imageUrl.trim() !== '') {
      return item.imageUrl;
    }
    if (item.name) {
      const cleanName = item.name.toLowerCase().trim();
      if (catalogImages[cleanName]) return catalogImages[cleanName];
      const baseName = cleanName.split('(')[0].trim();
      if (catalogImages[baseName]) return catalogImages[baseName];
    }
    return null;
  };

  // Load restaurant metadata
  useEffect(() => {
    fetch('/api/restaurant')
      .then(res => res.json())
      .then(data => {
        if (data && data.name) setRestaurantInfo(data);
      })
      .catch(err => console.error("Error loading restaurant info:", err));

    // Load existing orders from API and localStorage
    const loadAllOrders = () => {
      let localOrders = [];
      try {
        const stored = localStorage.getItem('umami_orders');
        if (stored) localOrders = JSON.parse(stored);
        const active = localStorage.getItem('synapse_active_order');
        if (active) {
          const parsedActive = JSON.parse(active);
          if (parsedActive && !localOrders.some(o => (o.orderId || o.id) === (parsedActive.orderId || parsedActive.id))) {
            localOrders.unshift(parsedActive);
          }
        }
      } catch (e) {}

      fetch('/api/orders')
        .then(res => res.json())
        .then(data => {
          const apiOrders = Array.isArray(data) ? data : [];
          // Deduplicate and merge API and local orders
          const merged = [...apiOrders];
          localOrders.forEach(lo => {
            const loId = lo.orderId || lo.id;
            const idx = merged.findIndex(m => (m.orderId || m.id) === loId);
            if (idx >= 0) {
              merged[idx] = { ...merged[idx], ...lo };
            } else {
              merged.push(lo);
            }
          });
          setOrders(merged);
        })
        .catch(err => {
          console.error("Error loading kitchen orders:", err);
          if (localOrders.length > 0) setOrders(localOrders);
        });
    };

    loadAllOrders();

    const handleWindowOrderEvent = (e) => {
      console.log("[Kitchen] Received new order event:", e.detail);
      loadAllOrders();
      if (soundEnabled) playChime('new-order');
    };

    window.addEventListener('storage', loadAllOrders);
    window.addEventListener('umami_new_order', handleWindowOrderEvent);

    return () => {
      window.removeEventListener('storage', loadAllOrders);
      window.removeEventListener('umami_new_order', handleWindowOrderEvent);
    };
  }, []);

  // Initialize Socket.io Connection as kitchen role
  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
      console.log("[Kitchen] Connected to kitchen socket server");
      socket.emit('join-session', { role: 'kitchen' });
    });

    socket.on('initial-orders', (existingOrders) => {
      if (Array.isArray(existingOrders)) {
        setOrders(existingOrders);
      }
    });

    socket.on('new-kitchen-order', (newOrder) => {
      console.log("[Kitchen] Received new incoming order:", newOrder);
      const newId = newOrder.orderId || newOrder.id;
      setOrders(prev => {
        const exists = prev.some(o => (o.orderId || o.id) === newId);
        if (exists) return prev.map(o => (o.orderId || o.id) === newId ? { ...o, ...newOrder } : o);
        return [newOrder, ...prev];
      });
      if (soundEnabled) {
        playChime('new-order');
      }
    });

    socket.on('order-status-updated', (payload) => {
      const orderId = payload.orderId || payload.id;
      const newStatus = payload.status;
      console.log(`[Kitchen] Order ${orderId} updated to ${newStatus}`);
      setOrders(prev =>
        prev.map(o => {
          if ((o.orderId || o.id) === orderId) {
            return {
              ...o,
              status: newStatus,
              nextStatus: payload.nextStatus || o.nextStatus,
              stripeColor: payload.stripeColor || o.stripeColor,
              busserName: payload.busserName !== undefined ? payload.busserName : o.busserName,
              updatedAt: payload.updatedAt || new Date().toISOString()
            };
          }
          return o;
        })
      );
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
      console.log("[Kitchen] Disconnected from server");
    });

    return () => {
      socket.disconnect();
    };
  }, [soundEnabled]);

  const handleBuzzGadget = (orderId) => {
    if (soundEnabled) playChime('ready');
    try {
      localStorage.setItem('synapse_gadget_buzz', JSON.stringify({ orderId, timestamp: Date.now() }));
      const active = JSON.parse(localStorage.getItem('synapse_active_order') || 'null');
      if (active && ((active.orderId || active.id) === orderId || !orderId)) {
        localStorage.setItem('synapse_active_order', JSON.stringify({ ...active, status: 'Ready for Pickup', isBuzzing: true }));
      }
      window.dispatchEvent(new CustomEvent('synapse_buzzer_alert', { detail: { orderId } }));
    } catch (e) {}

    if (socketRef.current && socketConnected) {
      socketRef.current.emit('update-order-status', { orderId, status: 'Ready for Pickup', updatedBy: 'Kitchen Staff' });
    }
  };

  const handleUpdateStatus = (orderId, newStatus) => {
    // 1. Optimistic UI update
    setOrders(prev =>
      prev.map(o =>
        (o.orderId || o.id) === orderId ? { ...o, status: newStatus, updatedAt: new Date().toISOString() } : o
      )
    );

    // 2. Sync to localStorage for instant cross-tab communication
    try {
      const stored = JSON.parse(localStorage.getItem('umami_orders') || '[]');
      const updatedList = stored.map(o => (o.orderId || o.id) === orderId ? { ...o, status: newStatus, updatedAt: new Date().toISOString() } : o);
      localStorage.setItem('umami_orders', JSON.stringify(updatedList));

      const active = JSON.parse(localStorage.getItem('synapse_active_order') || 'null');
      if (active && (active.orderId || active.id) === orderId) {
        const updatedActive = { ...active, status: newStatus, isBuzzing: newStatus === 'Ready for Pickup' };
        localStorage.setItem('synapse_active_order', JSON.stringify(updatedActive));
      }

      if (newStatus === 'Ready for Pickup') {
        localStorage.setItem('synapse_gadget_buzz', JSON.stringify({ orderId, timestamp: Date.now() }));
        window.dispatchEvent(new CustomEvent('synapse_buzzer_alert', { detail: { orderId } }));
      }
    } catch (e) {}

    if (newStatus === 'Ready for Pickup' && soundEnabled) {
      playChime('ready');
    }

    // 3. Emit via socket
    if (socketRef.current && socketConnected) {
      socketRef.current.emit('update-order-status', { orderId, status: newStatus, updatedBy: 'Kitchen Staff' });
    }

    // 4. Resilient REST API fallback
    fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, updatedBy: 'Kitchen Staff' })
    }).catch(err => console.error("Error updating order status via API:", err));
  };

  // Helper for elapsed time
  const getElapsedMinutes = (timestamp) => {
    if (!timestamp) return 0;
    const diffMs = Date.now() - new Date(timestamp).getTime();
    return Math.max(0, Math.floor(diffMs / 60000));
  };

  const getNorm = (order) => normalizeKitchenStatus(order.status);

  // Filtered orders list
  const filteredOrders = orders.filter(order => {
    const s = getNorm(order);
    if (filter === 'active') return ['New', 'Preparing', 'Ready for Pickup', 'Out for Delivery'].includes(s);
    if (filter === 'received') return s === 'New';
    if (filter === 'preparing') return s === 'Preparing';
    if (filter === 'ready') return s === 'Ready for Pickup';
    return true; // 'all'
  });

  const activeCount = orders.filter(o => ['New', 'Preparing', 'Ready for Pickup', 'Out for Delivery'].includes(getNorm(o))).length;
  const receivedCount = orders.filter(o => getNorm(o) === 'New').length;
  const preparingCount = orders.filter(o => getNorm(o) === 'Preparing').length;
  const readyCount = orders.filter(o => getNorm(o) === 'Ready for Pickup').length;

  return (
    <div className="kitchen-view-container fade-in">
      {/* Kitchen Top Header */}
      <header className="kitchen-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {onReturnToKiosk && (
            <button
              onClick={onReturnToKiosk}
              className="kitchen-back-btn"
              title="Return to Restaurant Kiosk"
            >
              <ArrowLeft size={16} />
              <span>Kiosk View</span>
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="kitchen-logo-badge">
              <ChefHat size={22} color="#ffffff" />
            </div>
            <div>
              <h1 className="kitchen-title">
                {restaurantInfo.name.toUpperCase()} • KITCHEN MODULE
              </h1>
              <span className="kitchen-subtitle">
                {restaurantInfo.cuisine.toUpperCase()} • REAL-TIME ORDER PREP STATION
              </span>
            </div>
          </div>
        </div>

        {/* Right Status Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="kitchen-clock">
            <Clock size={15} color="var(--text-muted)" />
            <span>{currentTime.toLocaleTimeString()}</span>
          </div>

          <button
            onClick={() => setSoundEnabled(prev => !prev)}
            className={`kitchen-sound-toggle ${soundEnabled ? 'active' : ''}`}
            title={soundEnabled ? 'Mute Kitchen Audio' : 'Unmute Kitchen Audio'}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span>{soundEnabled ? 'Audio ON' : 'Muted'}</span>
          </button>

          <div className="kitchen-socket-badge">
            <div className={`pulse-indicator ${socketConnected ? 'active' : 'disconnected'}`}></div>
            <span>{socketConnected ? 'KDS Connected • Database Live Sync' : 'Offline / Reconnecting'}</span>
          </div>
        </div>
      </header>

      {/* Filter Tabs & Order Statistics */}
      <div className="kitchen-toolbar">
        <div className="kitchen-tabs">
          <button
            className={`kitchen-tab ${filter === 'active' ? 'active' : ''}`}
            onClick={() => setFilter('active')}
          >
            🔥 Active Queue
            {activeCount > 0 && <span className="tab-pill tab-pill-warning">{activeCount}</span>}
          </button>
          <button
            className={`kitchen-tab ${filter === 'received' ? 'active' : ''}`}
            onClick={() => setFilter('received')}
          >
            📋 Received
            {receivedCount > 0 && <span className="tab-pill">{receivedCount}</span>}
          </button>
          <button
            className={`kitchen-tab ${filter === 'preparing' ? 'active' : ''}`}
            onClick={() => setFilter('preparing')}
          >
            👨‍🍳 Preparing
            {preparingCount > 0 && <span className="tab-pill tab-pill-warning">{preparingCount}</span>}
          </button>
          <button
            className={`kitchen-tab ${filter === 'ready' ? 'active' : ''}`}
            onClick={() => setFilter('ready')}
          >
            🔔 Ready for Pickup
            {readyCount > 0 && <span className="tab-pill tab-pill-success">{readyCount}</span>}
          </button>
          <button
            className={`kitchen-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Orders ({orders.length})
          </button>
        </div>

        <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>
          Showing {filteredOrders.length} {filteredOrders.length === 1 ? 'ticket' : 'tickets'}
        </div>
      </div>

      {/* Order Tickets Grid */}
      <main className="kitchen-tickets-grid">
        {filteredOrders.length > 0 ? (
          filteredOrders.map(order => {
            const ordId = order.orderId || order.id;
            const normStatus = getNorm(order);
            const elapsed = getElapsedMinutes(order.createdAt);
            const isLate = elapsed >= 10 && normStatus !== 'Ready for Pickup' && normStatus !== 'Completed';
            const items = (Array.isArray(order.items) && order.items.length > 0) ? order.items : (order.item ? [order.item] : []);
            const isExpanded = expandedOrders.has(ordId);

            return (
              <div
                key={ordId}
                className={`kitchen-ticket-card status-${normStatus.toLowerCase().replace(/\s+/g, '-')} ${isLate ? 'ticket-late' : ''}`}
              >
                {/* Ticket Top Header: ID, Table/Kiosk, Customer & Status */}
                <div className="ticket-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span className="ticket-id">{ordId}</span>
                    <span className="ticket-kiosk">
                      {order.location || (order.tableNumber ? `Table #${order.tableNumber}` : (order.kioskId && order.kioskId.startsWith('K-') ? `Kiosk #${order.kioskId}` : `Table #${order.kioskId}` || 'Counter'))}
                    </span>
                    {order.orderType && (
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: order.orderType === 'Dine-In' ? 'rgba(234, 88, 12, 0.15)' : 'rgba(37, 99, 235, 0.15)',
                        color: order.orderType === 'Dine-In' ? '#ea580c' : '#2563eb',
                        border: order.orderType === 'Dine-In' ? '1px solid rgba(234, 88, 12, 0.3)' : '1px solid rgba(37, 99, 235, 0.3)'
                      }}>
                        {order.orderType}
                      </span>
                    )}
                    {order.customer && order.customer !== 'Guest' && !order.customer.toLowerCase().includes('mobile') && !order.customer.toLowerCase().includes('tablet') && (
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#d1d5db',
                        background: 'rgba(255, 255, 255, 0.05)',
                        padding: '1px 6px',
                        borderRadius: '4px'
                      }}>
                        👤 {order.customer}
                      </span>
                    )}
                  </div>

                  {/* Status Badge */}
                  <span className={`ticket-status-badge badge-${normStatus.toLowerCase().replace(/\s+/g, '-')}`}>
                    {normStatus === 'New' && '📋 Received'}
                    {normStatus === 'Preparing' && '👨‍🍳 Preparing'}
                    {normStatus === 'Ready for Pickup' && '🔔 Ready for Pickup'}
                    {normStatus === 'Out for Delivery' && `🏃 Runner: ${order.busserName || 'Dispatched'}`}
                    {normStatus === 'Completed' && '✓ Completed'}
                    {normStatus === 'Cancelled' && '✕ Cancelled'}
                  </span>
                </div>

                {/* Professional Formal Three-Column Order Information Strip */}
                {(() => {
                  const deviceInfo = getOrderDeviceInfo(order);
                  const DeviceIcon = deviceInfo.Icon;
                  return (
                    <div className="ticket-meta-strip" role="group" aria-label="Order Time, Platform, and Date">
                      {/* Left Column: Time */}
                      <div
                        className="ticket-meta-col ticket-meta-left"
                        title={`Time placed: ${formatOrderTime(order.createdAt)}`}
                      >
                        <Clock size={12} className="ticket-meta-icon" style={{ color: isLate ? '#ef4444' : undefined }} />
                        <span className="ticket-meta-text" style={{ color: isLate ? '#ef4444' : undefined }}>
                          {formatOrderTime(order.createdAt)}
                        </span>
                        {isLate && (
                          <span style={{
                            fontSize: '9px',
                            fontWeight: 800,
                            padding: '1px 4px',
                            borderRadius: '3px',
                            background: 'rgba(239, 68, 68, 0.2)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.35)',
                            marginLeft: '2px'
                          }}>
                            LATE
                          </span>
                        )}
                      </div>

                      {/* Center Column: Device or Platform Used */}
                      <div
                        className={`ticket-meta-col ticket-meta-center device-badge-${deviceInfo.type.toLowerCase()}`}
                        title={`Platform used: ${deviceInfo.label}`}
                      >
                        <DeviceIcon size={12} className="ticket-meta-icon" />
                        <span className="ticket-meta-text">{deviceInfo.label}</span>
                      </div>

                      {/* Right Column: Date */}
                      <div
                        className="ticket-meta-col ticket-meta-right"
                        title={`Date placed: ${formatOrderDate(order.createdAt)}`}
                      >
                        <Calendar size={12} className="ticket-meta-icon" />
                        <span className="ticket-meta-text">{formatOrderDate(order.createdAt)}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Dietary & Allergen Warnings Strip */}
                {((order.allergens && order.allergens.length > 0) || (order.orderedTags && order.orderedTags.length > 0)) && (
                  <div className="ticket-dietary-strip">
                    {order.allergens && order.allergens.length > 0 ? (
                      <div className="ticket-allergen-alert">
                        <AlertTriangle size={13} color="#ef4444" />
                        <span>EXCLUDE: {order.allergens.map(a => a.toUpperCase()).join(', ')}</span>
                      </div>
                    ) : (
                      <div className="ticket-dietary-safe">
                        <CheckCircle2 size={13} color="var(--accent-green)" />
                        <span>Standard Prep (No Allergen Exclusions)</span>
                      </div>
                    )}

                    {order.orderedTags && order.orderedTags.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                        {Array.from(new Set(order.orderedTags)).map(tag => (
                          <span key={tag} className="ticket-dietary-tag">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* View / Hide Order Details Toggle Button */}
                <button
                  type="button"
                  id={`toggle-details-${ordId}`}
                  aria-expanded={isExpanded}
                  aria-controls={`order-details-${ordId}`}
                  aria-label={isExpanded ? `Hide order details for order ${ordId}` : `View order details for order ${ordId}`}
                  onClick={(e) => toggleOrderDetails(ordId, e)}
                  className={`ticket-toggle-details-btn ${isExpanded ? 'is-expanded' : ''}`}
                >
                  <span>{isExpanded ? 'Hide Order Details' : 'View Order Details'}</span>
                  {isExpanded ? (
                    <ChevronUp size={16} className="ticket-toggle-icon" aria-hidden="true" />
                  ) : (
                    <ChevronDown size={16} className="ticket-toggle-icon" aria-hidden="true" />
                  )}
                </button>

                {/* Expandable Order Details Panel */}
                <div
                  id={`order-details-${ordId}`}
                  role="region"
                  aria-labelledby={`toggle-details-${ordId}`}
                  className={`ticket-expandable-details ${isExpanded ? 'is-expanded' : ''}`}
                >
                  <div className="ticket-expandable-inner">
                    {/* Special customer note */}
                    {order.note && (
                      <div style={{
                        margin: '2px 0 10px 0',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: order.isAllergy ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                        border: order.isAllergy ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                        fontSize: '11px',
                        color: order.isAllergy ? '#ef4444' : 'var(--text-muted)',
                        fontWeight: 600
                      }}>
                        💬 Note: {order.note}
                      </div>
                    )}

                    {/* Itemized Order List */}
                    <div className="ticket-items-list">
                      {items.map((item, idx) => {
                        const itemImage = getItemImage(item);
                        const details = getItemDetails(item);

                        return (
                          <div key={idx} className="ticket-item-row">
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1, minWidth: 0 }}>
                              <span className="ticket-item-qty">{details.qty}x</span>

                              {/* Food / Beverage Image Thumbnail with Fallback */}
                              <div className="ticket-item-thumb-container">
                                {itemImage ? (
                                  <img
                                    src={itemImage}
                                    alt={details.name}
                                    className="ticket-item-thumb"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      const fallback = e.target.parentElement.querySelector('.ticket-item-thumb-fallback');
                                      if (fallback) fallback.style.display = 'flex';
                                    }}
                                  />
                                ) : null}
                                <div
                                  className="ticket-item-thumb-fallback"
                                  style={{ display: itemImage ? 'none' : 'flex' }}
                                >
                                  <span>{item.emoji || (item.isDrink ? '🧋' : '🍽️')}</span>
                                </div>
                              </div>

                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div className="ticket-item-name" title={details.name}>{details.name}</div>

                                {/* Selected size or variant */}
                                {details.variant && (
                                  <div className="ticket-item-meta-row variant-badge">
                                    <span className="ticket-item-meta-label">Size / Variant:</span>
                                    <span className="ticket-item-meta-value">{details.variant}</span>
                                  </div>
                                )}

                                {/* Add-ons */}
                                {details.addons.length > 0 && (
                                  <div className="ticket-item-meta-row addons-badge">
                                    <span className="ticket-item-meta-label">Add-ons:</span>
                                    <span className="ticket-item-meta-value">{details.addons.join(' • ')}</span>
                                  </div>
                                )}

                                {/* Special instructions */}
                                {details.instructions.length > 0 && (
                                  <div className="ticket-item-meta-row instructions-box">
                                    <span className="ticket-item-meta-label">Instructions:</span>
                                    <span className="ticket-item-meta-value">{details.instructions.join(' • ')}</span>
                                  </div>
                                )}

                                {/* Dietary Tags */}
                                {details.tags.length > 0 && (
                                  <div className="ticket-item-tags">
                                    {details.tags.map((tag, tIdx) => (
                                      <span key={tIdx} className="ticket-item-tag-pill">
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <span className="ticket-item-price">
                                ₱{details.lineTotal.toFixed(2)}
                              </span>
                              {details.qty > 1 && (
                                <div style={{ fontSize: '10.5px', color: '#9ca3af', marginTop: '2px' }}>
                                  ₱{details.price.toFixed(2)} ea
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Ticket Footer / Summary */}
                <div className="ticket-footer">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Items: <strong>{order.itemCount || items.reduce((s, i) => s + (i.quantity || i.qty || 1), 0)}</strong>
                      {order.payment && <span style={{ marginLeft: '8px', padding: '2px 6px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', fontSize: '11px' }}>💳 {order.payment}</span>}
                    </span>
                    <span style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>
                      ₱{(order.totalPrice || order.total || 0).toFixed(2)}
                    </span>
                  </div>

                  {/* Interactive Next Stage Action Buttons */}
                  <div className="ticket-actions" style={{ marginTop: '4px', width: '100%' }}>
                    {(normStatus === 'New' || normStatus === 'Received') && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(order.orderId || order.id, 'Preparing')}
                        className="ticket-btn btn-start-prep"
                        style={{
                          width: '100%',
                          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                          boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
                        }}
                      >
                        <ChefHat size={15} />
                        <span>Start Preparing 👨‍🍳</span>
                      </button>
                    )}

                    {normStatus === 'Preparing' && (
                      <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(order.orderId || order.id, 'New')}
                          className="ticket-btn btn-back"
                          title="Return to Received"
                        >
                          ↩
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(order.orderId || order.id, 'Ready for Pickup')}
                          className="ticket-btn btn-mark-ready"
                          style={{ flex: 1 }}
                        >
                          <BellRing size={15} />
                          <span>Ready for Pickup 🔔</span>
                        </button>
                      </div>
                    )}

                    {normStatus === 'Ready for Pickup' && (
                      <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(order.orderId || order.id, 'Preparing')}
                          className="ticket-btn btn-back"
                          title="Return to Preparing"
                        >
                          ↩
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBuzzGadget(order.orderId || order.id)}
                          className="ticket-btn btn-back"
                          title="Trigger Customer Pager Alert & Buzzer"
                          style={{ color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.4)', gap: '6px' }}
                        >
                          <BellRing size={14} />
                          <span>Buzz</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(order.orderId || order.id, 'Completed')}
                          className="ticket-btn btn-mark-ready"
                          style={{ flex: 1, background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}
                        >
                          <Check size={15} />
                          <span>Complete Order ✓</span>
                        </button>
                      </div>
                    )}

                    {normStatus === 'Completed' && (
                      <div style={{
                        width: '100%',
                        textAlign: 'center',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        color: '#10b981',
                        fontSize: '12.5px',
                        fontWeight: 700
                      }}>
                        ✓ Order Completed & Served
                      </div>
                    )}

                    {normStatus === 'Cancelled' && (
                      <div style={{
                        width: '100%',
                        textAlign: 'center',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        color: '#ef4444',
                        fontSize: '12.5px',
                        fontWeight: 700
                      }}>
                        ✕ Order Cancelled
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="kitchen-empty-state">
            <Utensils size={48} color="var(--text-muted)" style={{ marginBottom: '16px', opacity: 0.5 }} />
            <h3>No Orders in this Queue</h3>
            <p>
              When customers place orders from their phones or terminals, they will appear here instantly in real-time.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default KitchenView;
