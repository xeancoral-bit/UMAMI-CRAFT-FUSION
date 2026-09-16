import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import {
  Footprints,
  BellRing,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  VolumeX,
  RefreshCw,
  UserCheck,
  Check,
  Coffee
} from 'lucide-react';

function playBusserAlert() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.setValueAtTime(880, now + 0.12); // A5
    osc.frequency.setValueAtTime(1174.66, now + 0.24); // D6
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.7);
  } catch (e) {
    console.warn("Busser chime failed:", e);
  }
}

function BusserView({ onReturnToHome: _onReturnToHome }) {
  const [busserName, setBusserName] = useState(() => {
    return localStorage.getItem('synapse_busser_name') || 'Runner Jordan';
  });
  const [isOnDuty, setIsOnDuty] = useState(true);
  const [orders, setOrders] = useState([]);
  const [tables, setTables] = useState([]);
  const [activeTab, setActiveTab] = useState('deliveries'); // 'deliveries' | 'tables'
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef(null);

  // Save busser name
  useEffect(() => {
    localStorage.setItem('synapse_busser_name', busserName);
  }, [busserName]);

  // Load orders and tables via REST
  const refreshData = () => {
    fetch('/api/orders')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setOrders(data);
      })
      .catch(err => console.error("Error fetching orders:", err));

    fetch('/api/tables')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setTables(data);
      })
      .catch(err => console.error("Error fetching tables:", err));
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Socket connection for busser role
  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
      socket.emit('join-session', { role: 'busser' });
    });

    socket.on('initial-orders', (existing) => {
      if (Array.isArray(existing)) setOrders(existing);
    });

    socket.on('initial-tables', (existing) => {
      if (Array.isArray(existing)) setTables(existing);
    });

    socket.on('new-kitchen-order', (newOrder) => {
      setOrders(prev => {
        const exists = prev.some(o => o.orderId === newOrder.orderId);
        if (exists) return prev;
        return [newOrder, ...prev];
      });
    });

    socket.on('order-status-updated', (payload) => {
      setOrders(prev =>
        prev.map(o =>
          o.orderId === payload.orderId
            ? { ...o, status: payload.status, busserName: payload.busserName, updatedAt: payload.updatedAt }
            : o
        )
      );

      if (payload.status === 'Order Ready' && soundEnabled) {
        playBusserAlert();
      }
    });

    socket.on('table-status-updated', (updatedTable) => {
      setTables(prev =>
        prev.map(t => (t.tableNumber === updatedTable.tableNumber ? updatedTable : t))
      );
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    return () => socket.disconnect();
  }, [soundEnabled]);

  // Handle claiming order
  const handleClaimOrder = (orderId) => {
    // 1. Optimistic update
    setOrders(prev =>
      prev.map(o =>
        o.orderId === orderId
          ? { ...o, status: 'Out for Delivery', busserName, updatedAt: new Date().toISOString() }
          : o
      )
    );

    // 2. Socket emit
    if (socketRef.current && socketConnected) {
      socketRef.current.emit('claim-order', { orderId, busserName });
    }

    // 3. REST fallback
    fetch(`/api/orders/${orderId}/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ busserName })
    }).catch(err => console.error("Error claiming order:", err));
  };

  // Handle marking order delivered
  const handleCompleteDelivery = (orderId) => {
    const completedStatus = 'Completed';
    setOrders(prev =>
      prev.map(o =>
        o.orderId === orderId
          ? { ...o, status: completedStatus, updatedAt: new Date().toISOString() }
          : o
      )
    );

    if (socketRef.current && socketConnected) {
      socketRef.current.emit('update-order-status', { orderId, status: completedStatus, busserName });
    }

    fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: completedStatus })
    }).catch(err => console.error("Error updating order status:", err));
  };

  // Handle table cleaning / bussing
  const handleCleanTable = (tableNumber) => {
    const newStatus = 'Available';
    setTables(prev =>
      prev.map(t => (t.tableNumber === tableNumber ? { ...t, status: newStatus, lastBussed: new Date().toISOString() } : t))
    );

    if (socketRef.current && socketConnected) {
      socketRef.current.emit('update-table-status', { tableNumber, status: newStatus });
    }

    fetch(`/api/tables/${tableNumber}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    }).catch(err => console.error("Error updating table status:", err));
  };

  // Filter orders
  const readyOrders = orders.filter(o => o.status === 'Order Ready');
  const myTransitOrders = orders.filter(o => o.status === 'Out for Delivery' && o.busserName === busserName);
  const tablesNeedingBussing = tables.filter(t => t.status === 'Needs Bussing');

  const getElapsedMinutes = (timestamp) => {
    if (!timestamp) return 0;
    const diff = Date.now() - new Date(timestamp).getTime();
    return Math.max(0, Math.floor(diff / 60000));
  };

  return (
    <div className="busser-dashboard fade-in">
      {/* Top Profile & Station Header */}
      <div className="busser-header-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="fp-logo-badge" style={{ width: '48px', height: '48px', borderRadius: '14px', fontSize: '24px' }}>
            🏃
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                BUSSER & RUNNER STATION
              </h1>
              <span style={{ fontSize: '11px', background: 'var(--panda-pink)', color: '#fff', padding: '2px 8px', borderRadius: '9999px', fontWeight: 800 }}>
                FOODPANDA FLEET
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Assigned Staff:</span>
              <input
                type="text"
                value={busserName}
                onChange={(e) => setBusserName(e.target.value)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  border: '1px solid var(--border-glass)',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  background: 'var(--bg-surface-elevated)'
                }}
                title="Change Busser / Runner Name"
              />
            </div>
          </div>
        </div>

        {/* Right Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            className={`busser-duty-toggle ${isOnDuty ? 'active' : ''}`}
            onClick={() => setIsOnDuty(!isOnDuty)}
            title="Toggle On Duty / Standby"
          >
            <UserCheck size={16} />
            <span>{isOnDuty ? 'On Duty' : 'On Break'}</span>
          </button>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="fp-nav-pill"
            style={{ border: '1px solid var(--border-glass)', padding: '8px 14px' }}
            title={soundEnabled ? 'Mute Chimes' : 'Enable Audio'}
          >
            {soundEnabled ? <Volume2 size={16} color="var(--panda-pink)" /> : <VolumeX size={16} color="var(--text-muted)" />}
            <span style={{ fontSize: '13px' }}>{soundEnabled ? 'Chime ON' : 'Muted'}</span>
          </button>

          <button
            onClick={refreshData}
            className="fp-nav-pill"
            style={{ border: '1px solid var(--border-glass)', padding: '8px 12px' }}
            title="Refresh Data"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Primary Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <button
          className={`fp-nav-pill ${activeTab === 'deliveries' ? 'active' : ''}`}
          onClick={() => setActiveTab('deliveries')}
          style={{ fontSize: '14px', padding: '10px 22px' }}
        >
          <BellRing size={16} />
          <span>Order Dispatch & Deliveries</span>
          {readyOrders.length > 0 && (
            <span className="fp-badge-count">{readyOrders.length} READY</span>
          )}
        </button>

        <button
          className={`fp-nav-pill ${activeTab === 'tables' ? 'active' : ''}`}
          onClick={() => setActiveTab('tables')}
          style={{ fontSize: '14px', padding: '10px 22px' }}
        >
          <Coffee size={16} />
          <span>Floor Table Bussing</span>
          {tablesNeedingBussing.length > 0 && (
            <span className="fp-badge-count" style={{ background: 'var(--accent-yellow)', color: '#fff' }}>
              {tablesNeedingBussing.length} DIRTY
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: DELIVERIES & READY ORDERS */}
      {activeTab === 'deliveries' && (
        <>
          {/* SECTION A: READY FOR DISPATCH */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>🔔</span>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Ready for Dispatch ({readyOrders.length})
                </h2>
              </div>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Kitchen completed prep • Awaiting runner pickup
              </span>
            </div>

            {readyOrders.length === 0 ? (
              <div className="glass-card" style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <CheckCircle2 size={36} color="var(--accent-green)" style={{ margin: '0 auto 12px' }} />
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  All Ready Orders Dispatched!
                </h3>
                <p style={{ fontSize: '13px', marginTop: '4px' }}>
                  No pending orders waiting for pickup at the pass. Kitchen will chime when a new dish is ready.
                </p>
              </div>
            ) : (
              <div className="busser-grid">
                {readyOrders.map(order => {
                  const elapsed = getElapsedMinutes(order.updatedAt || order.createdAt);
                  const items = order.items || (order.item ? [order.item] : []);

                  return (
                    <div key={order.orderId} className="busser-card ready-for-dispatch fade-in">
                      <div>
                        <div className="busser-card-header">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="busser-table-badge">
                              {order.tableNumber ? `Table #${order.tableNumber}` : (order.kioskId ? `Kiosk ${order.kioskId}` : 'Counter')}
                            </span>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>
                              #{order.orderId}
                            </span>
                          </div>
                          <div className="busser-ready-pill">
                            <BellRing size={12} />
                            <span>READY {elapsed > 0 ? `(${elapsed}m ago)` : 'NOW'}</span>
                          </div>
                        </div>

                        {/* Allergen Warning Strip */}
                        {order.allergens && order.allergens.length > 0 && (
                          <div style={{
                            background: '#FEE2E2',
                            border: '1px solid #FCA5A5',
                            borderRadius: '8px',
                            padding: '8px 10px',
                            marginBottom: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '12px',
                            color: '#991B1B',
                            fontWeight: 700
                          }}>
                            <AlertTriangle size={14} />
                            <span>ALLERGY: Exclude {order.allergens.join(', ').toUpperCase()}</span>
                          </div>
                        )}

                        {/* Items list */}
                        <div className="busser-item-list">
                          {items.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>
                                <strong style={{ color: 'var(--panda-pink)' }}>{item.quantity || 1}x</strong> {item.emoji || '🍽️'} {item.name}
                              </span>
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                ${(item.price * (item.quantity || 1)).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        className="busser-action-btn busser-claim-btn"
                        onClick={() => handleClaimOrder(order.orderId)}
                        disabled={!isOnDuty}
                      >
                        <Footprints size={18} />
                        <span>Accept & Deliver Order</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION B: MY ACTIVE DELIVERIES */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span style={{ fontSize: '20px' }}>🏃</span>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                My Active Deliveries ({myTransitOrders.length})
              </h2>
            </div>

            {myTransitOrders.length === 0 ? (
              <div className="glass-card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                You have no orders currently in transit. Accept an order above to begin delivery.
              </div>
            ) : (
              <div className="busser-grid">
                {myTransitOrders.map(order => {
                  const items = order.items || (order.item ? [order.item] : []);

                  return (
                    <div key={order.orderId} className="busser-card in-transit fade-in">
                      <div>
                        <div className="busser-card-header">
                          <span className="busser-table-badge" style={{ background: 'var(--accent-blue)' }}>
                            {order.tableNumber ? `Delivering to Table #${order.tableNumber}` : `Delivering to ${order.kioskId}`}
                          </span>
                          <div className="busser-transit-pill">
                            <Footprints size={12} />
                            <span>IN TRANSIT</span>
                          </div>
                        </div>

                        <div className="busser-item-list">
                          {items.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>
                                <strong>{item.quantity || 1}x</strong> {item.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        className="busser-action-btn busser-complete-btn"
                        onClick={() => handleCompleteDelivery(order.orderId)}
                      >
                        <CheckCircle2 size={18} />
                        <span>Mark Delivered to Guest</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* TAB 2: FLOOR TABLE BUSSING */}
      {activeTab === 'tables' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Dining Room Table Status
              </h2>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Busser turnover monitoring • Clear and sanitize tables for incoming guests
              </span>
            </div>

            <div style={{ display: 'flex', gap: '12px', fontSize: '12px', fontWeight: 700 }}>
              <span style={{ color: 'var(--accent-green)' }}>● Available</span>
              <span style={{ color: 'var(--accent-blue)' }}>● Occupied</span>
              <span style={{ color: 'var(--accent-yellow)' }}>● Needs Bussing</span>
            </div>
          </div>

          <div className="floor-tables-grid">
            {tables.map(table => {
              const needsBussing = table.status === 'Needs Bussing';
              const occupied = table.status === 'Occupied';

              return (
                <div
                  key={table.tableNumber}
                  className={`floor-table-card status-${table.status.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                      Table {table.tableNumber}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>
                      {table.capacity} Seats
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700 }}>
                    <span style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: needsBussing ? 'var(--accent-yellow)' : (occupied ? 'var(--accent-blue)' : 'var(--accent-green)')
                    }}></span>
                    <span>{table.status}</span>
                  </div>

                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Last Bussed: {new Date(table.lastBussed).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>

                  {needsBussing && (
                    <button
                      className="table-clean-btn"
                      onClick={() => handleCleanTable(table.tableNumber)}
                      style={{ marginTop: '8px' }}
                    >
                      <Check size={14} />
                      <span>Mark Clean & Bussed</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default BusserView;
