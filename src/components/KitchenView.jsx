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

function KitchenView({ onReturnToKiosk }) {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('active'); // 'active' | 'received' | 'cooking' | 'ready' | 'all'
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

    // Load existing orders
    fetch('/api/orders')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setOrders(data);
      })
      .catch(err => console.error("Error loading kitchen orders:", err));
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
      setOrders(prev => {
        const exists = prev.some(o => o.orderId === newOrder.orderId);
        if (exists) return prev;
        return [newOrder, ...prev];
      });
      if (soundEnabled) {
        playChime('new-order');
      }
    });

    socket.on('order-status-updated', ({ orderId, status, updatedAt }) => {
      console.log(`[Kitchen] Order ${orderId} updated to ${status}`);
      setOrders(prev =>
        prev.map(o => (o.orderId === orderId ? { ...o, status, updatedAt } : o))
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

  const handleUpdateStatus = (orderId, newStatus) => {
    // 1. Optimistic UI update
    setOrders(prev =>
      prev.map(o =>
        o.orderId === orderId ? { ...o, status: newStatus, updatedAt: new Date().toISOString() } : o
      )
    );

    if (newStatus === 'Order Ready' && soundEnabled) {
      playChime('ready');
    }

    // 2. Emit via socket
    if (socketRef.current && socketConnected) {
      socketRef.current.emit('update-order-status', { orderId, status: newStatus });
    }

    // 3. Resilient REST API fallback
    fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    }).catch(err => console.error("Error updating order status via API:", err));
  };

  // Helper for elapsed time
  const getElapsedMinutes = (timestamp) => {
    if (!timestamp) return 0;
    const diffMs = Date.now() - new Date(timestamp).getTime();
    return Math.max(0, Math.floor(diffMs / 60000));
  };

  // Filtered orders list
  const filteredOrders = orders.filter(order => {
    if (filter === 'active') return order.status === 'Order Received' || order.status === 'Cooking';
    if (filter === 'received') return order.status === 'Order Received';
    if (filter === 'cooking') return order.status === 'Cooking';
    if (filter === 'ready') return order.status === 'Order Ready';
    return true; // 'all'
  });

  const activeCount = orders.filter(o => o.status === 'Order Received' || o.status === 'Cooking').length;
  const readyCount = orders.filter(o => o.status === 'Order Ready').length;

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
            <span>{socketConnected ? 'KDS Connected' : 'Offline'}</span>
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
            <span className="tab-pill">
              {orders.filter(o => o.status === 'Order Received').length}
            </span>
          </button>
          <button
            className={`kitchen-tab ${filter === 'cooking' ? 'active' : ''}`}
            onClick={() => setFilter('cooking')}
          >
            🍳 Cooking
            <span className="tab-pill">
              {orders.filter(o => o.status === 'Cooking').length}
            </span>
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
            const elapsed = getElapsedMinutes(order.createdAt);
            const isLate = elapsed >= 10 && order.status !== 'Order Ready' && order.status !== 'Completed';
            const items = order.items || (order.item ? [order.item] : []);

            return (
              <div
                key={order.orderId}
                className={`kitchen-ticket-card status-${order.status ? order.status.toLowerCase().replace(/\s+/g, '-') : 'received'} ${isLate ? 'ticket-late' : ''}`}
              >
                {/* Ticket Top Header */}
                <div className="ticket-header">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="ticket-id">{order.orderId}</span>
                      <span className="ticket-kiosk">
                        {order.kioskId && order.kioskId.startsWith('K-') ? `Kiosk #${order.kioskId}` : `Table #${order.kioskId}`}
                      </span>
                    </div>
                    <div className="ticket-time-row">
                      <Clock size={12} />
                      <span>{elapsed === 0 ? 'Just now' : `${elapsed}m ago`}</span>
                      <span>•</span>
                      <span>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span className={`ticket-status-badge badge-${order.status ? order.status.toLowerCase().replace(/\s+/g, '-') : 'received'}`}>
                    {order.status === 'Order Received' && '📋 Received'}
                    {order.status === 'Cooking' && '🍳 Cooking'}
                    {order.status === 'Order Ready' && '🔔 Ready'}
                    {order.status === 'Completed' && '✓ Completed'}
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

                {/* Itemized Order List */}
                <div className="ticket-items-list">
                  {items.map((item, idx) => (
                    <div key={idx} className="ticket-item-row">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="ticket-item-qty">{item.quantity || 1}x</span>
                        <span style={{ fontSize: '18px' }}>{item.emoji || '🍽️'}</span>
                        <div>
                          <div className="ticket-item-name">{item.name}</div>
                          {item.tags && item.tags.length > 0 && (
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                              {item.tags.join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="ticket-item-price">
                        ₱{((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Ticket Footer / Summary */}
                <div className="ticket-footer">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Total Items: <strong>{order.itemCount || items.reduce((s, i) => s + (i.quantity || 1), 0)}</strong>
                    </span>
                    <span style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>
                      ₱{(order.totalPrice || 0).toFixed(2)}
                    </span>
                  </div>

                  {/* Stage Action Buttons */}
                  <div className="ticket-actions">
                    {order.status === 'Order Received' && (
                      <button
                        onClick={() => handleUpdateStatus(order.orderId, 'Cooking')}
                        className="ticket-btn btn-start-cooking"
                      >
                        <Flame size={15} />
                        <span>Start Cooking 🍳</span>
                      </button>
                    )}

                    {order.status === 'Cooking' && (
                      <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                        <button
                          onClick={() => handleUpdateStatus(order.orderId, 'Order Received')}
                          className="ticket-btn btn-back"
                          title="Return to Received"
                        >
                          ↩
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(order.orderId, 'Order Ready')}
                          className="ticket-btn btn-mark-ready"
                          style={{ flex: 1 }}
                        >
                          <BellRing size={15} />
                          <span>Mark Ready 🔔</span>
                        </button>
                      </div>
                    )}

                    {order.status === 'Order Ready' && (
                      <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                        <button
                          onClick={() => handleUpdateStatus(order.orderId, 'Cooking')}
                          className="ticket-btn btn-back"
                          title="Back to Cooking"
                        >
                          🍳
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(order.orderId, 'Completed')}
                          className="ticket-btn btn-complete"
                          style={{ flex: 1 }}
                        >
                          <Check size={15} />
                          <span>Complete & Archive ✓</span>
                        </button>
                      </div>
                    )}

                    {order.status === 'Completed' && (
                      <div style={{ textAlign: 'center', padding: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                        ✓ Order completed & archived
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
