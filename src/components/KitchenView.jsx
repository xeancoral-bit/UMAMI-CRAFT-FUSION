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
  Check
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
  if (status === 'Order Ready' || status === 'Ready') return 'Ready for Pickup';
  return status;
}

function KitchenView({ onReturnToKiosk }) {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('active'); // 'active' | 'received' | 'preparing' | 'cooking' | 'ready' | 'all'
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [restaurantInfo, setRestaurantInfo] = useState({
    name: 'Restaurant Kitchen',
    cuisine: 'Culinary Station',
    backendPort: 3001
  });
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef(null);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
    if (filter === 'active') return ['New', 'Preparing', 'Cooking', 'Ready for Pickup', 'Out for Delivery'].includes(s);
    if (filter === 'received') return s === 'New';
    if (filter === 'preparing') return s === 'Preparing';
    if (filter === 'cooking') return s === 'Cooking';
    if (filter === 'ready') return s === 'Ready for Pickup';
    return true; // 'all'
  });

  const activeCount = orders.filter(o => ['New', 'Preparing', 'Cooking', 'Ready for Pickup', 'Out for Delivery'].includes(getNorm(o))).length;
  const receivedCount = orders.filter(o => getNorm(o) === 'New').length;
  const preparingCount = orders.filter(o => getNorm(o) === 'Preparing').length;
  const cookingCount = orders.filter(o => getNorm(o) === 'Cooking').length;
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
            className={`kitchen-tab ${filter === 'cooking' ? 'active' : ''}`}
            onClick={() => setFilter('cooking')}
          >
            🍳 Cooking
            {cookingCount > 0 && <span className="tab-pill">{cookingCount}</span>}
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
            const items = order.items || (order.item ? [order.item] : []);

            return (
              <div
                key={ordId}
                className={`kitchen-ticket-card status-${normStatus.toLowerCase().replace(/\s+/g, '-')} ${isLate ? 'ticket-late' : ''}`}
              >
                {/* Ticket Top Header */}
                <div className="ticket-header">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                    </div>
                    <div className="ticket-time-row">
                      <Clock size={12} />
                      <span style={{ color: isLate ? '#ef4444' : 'inherit', fontWeight: isLate ? 800 : 500 }}>
                        {elapsed === 0 ? 'Just now' : `${elapsed}m ago`} {isLate ? '⚠️ LATE' : ''}
                      </span>
                      <span>•</span>
                      <span>{order.customer || 'Guest'}</span>
                      <span>•</span>
                      <span>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span className={`ticket-status-badge badge-${normStatus.toLowerCase().replace(/\s+/g, '-')}`}>
                    {normStatus === 'New' && '📋 Received'}
                    {normStatus === 'Preparing' && '👨‍🍳 Preparing'}
                    {normStatus === 'Cooking' && '🍳 Cooking'}
                    {normStatus === 'Ready for Pickup' && '🔔 Ready for Pickup'}
                    {normStatus === 'Out for Delivery' && `🏃 Runner: ${order.busserName || 'Dispatched'}`}
                    {normStatus === 'Completed' && '✓ Completed'}
                    {normStatus === 'Cancelled' && '✕ Cancelled'}
                  </span>
                </div>

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

                {/* Special customer note */}
                {order.note && (
                  <div style={{
                    margin: '8px 12px 0',
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
                  {items.map((item, idx) => (
                    <div key={idx} className="ticket-item-row">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="ticket-item-qty">{item.quantity || item.qty || 1}x</span>
                        <span style={{ fontSize: '18px' }}>{item.emoji || '🍽️'}</span>
                        <div>
                          <div className="ticket-item-name">{item.name}</div>
                          {item.customizations && item.customizations.length > 0 && (
                            <div style={{ fontSize: '10.5px', color: '#f59e0b', fontWeight: 600 }}>
                              {item.customizations.join(' • ')}
                            </div>
                          )}
                          {item.tags && item.tags.length > 0 && (
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                              {item.tags.join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="ticket-item-price">
                        ${((item.price || 0) * (item.quantity || item.qty || 1)).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Ticket Footer / Summary */}
                <div className="ticket-footer">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Items: <strong>{order.itemCount || items.reduce((s, i) => s + (i.quantity || i.qty || 1), 0)}</strong>
                      {order.payment && <span style={{ marginLeft: '8px', padding: '2px 6px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', fontSize: '11px' }}>💳 {order.payment}</span>}
                    </span>
                    <span style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>
                      ${(order.totalPrice || order.total || 0).toFixed(2)}
                    </span>
                  </div>

                  {/* Interactive Next Stage Action Buttons */}
                  <div className="ticket-actions" style={{ marginTop: '4px', width: '100%' }}>
                    {(normStatus === 'New' || normStatus === 'Received') && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(order.orderId || order.id, 'Preparing')}
                        className="ticket-btn btn-start-cooking"
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
                          onClick={() => handleUpdateStatus(order.orderId || order.id, 'Cooking')}
                          className="ticket-btn btn-start-cooking"
                          style={{ flex: 1 }}
                        >
                          <Flame size={15} />
                          <span>Start Cooking 🍳</span>
                        </button>
                      </div>
                    )}

                    {normStatus === 'Cooking' && (
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
                          onClick={() => handleUpdateStatus(order.orderId || order.id, 'Ready for Pickup')}
                          className="ticket-btn btn-mark-ready"
                          style={{ flex: 1 }}
                        >
                          <BellRing size={15} />
                          <span>Mark Ready 🔔</span>
                        </button>
                      </div>
                    )}

                    {normStatus === 'Ready for Pickup' && (
                      <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
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
