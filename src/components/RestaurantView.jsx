import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import {
  Store,
  DollarSign,
  ChefHat,
  Users,
  CheckCircle,
  RefreshCw,
  Utensils,
  Layers,
  Search,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
  Home
} from 'lucide-react';

// Custom SVG Icons matching Image 1 exactly
const ClocheIcon = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 4v2" />
    <circle cx="12" cy="4" r="1.5" />
    <path d="M4 18h16" />
    <path d="M4 18a8 8 0 0 1 16 0" />
    <path d="M3 20h18" />
  </svg>
);

const ChairIcon = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 19v3" />
    <path d="M18 19v3" />
    <path d="M4 11a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-5z" />
    <path d="M6 8V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3" />
  </svg>
);

function RestaurantView({ onReturnToKiosk }) {
  const [restaurantInfo, setRestaurantInfo] = useState({
    id: 'umami',
    name: 'Umami Craft Fusion',
    cuisine: 'Asian Craft Fusion',
    tagline: 'Bowls, Dumplings & Artisanal Street Noodles'
  });
  const [orders, setOrders] = useState([]);
  const [tables, setTables] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [itemAvailability, setItemAvailability] = useState({});
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'floor' | 'menu'
  const [searchFilter, setSearchFilter] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncText, setLastSyncText] = useState('Last synced 2 min ago');
  const socketRef = useRef(null);

  // Load restaurant metadata, all tables, orders, and menu
  const loadData = () => {
    setIsSyncing(true);
    const p1 = fetch('/api/restaurant')
      .then(res => res.json())
      .then(data => { if (data?.name) setRestaurantInfo(data); })
      .catch(() => {});

    const p2 = fetch('/api/orders')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setOrders(data); })
      .catch(() => {});

    const p3 = fetch('/api/tables')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setTables(data); })
      .catch(() => {});

    const p4 = fetch('/api/menu')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setMenuItems(data); })
      .catch(() => {});

    const p5 = fetch('/api/availability')
      .then(res => res.json())
      .then(data => { if (data) setItemAvailability(data); })
      .catch(() => {});

    Promise.allSettled([p1, p2, p3, p4, p5]).then(() => {
      setIsSyncing(false);
      setLastSyncText('Last synced just now');
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  // Socket listener for real-time operations
  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
      socket.emit('join-session', { role: 'restaurant' });
    });

    socket.on('initial-orders', (existing) => {
      if (Array.isArray(existing)) setOrders(existing);
    });

    socket.on('initial-tables', (existing) => {
      if (Array.isArray(existing)) setTables(existing);
    });

    socket.on('initial-availability', (existing) => {
      if (existing) setItemAvailability(existing);
    });

    // Real-time sync when Admin updates menu/inventory
    socket.on('menu-updated', (updatedMenu) => {
      if (Array.isArray(updatedMenu)) setMenuItems(updatedMenu);
    });

    socket.on('new-kitchen-order', (newOrder) => {
      setOrders(prev => [newOrder, ...prev.filter(o => o.orderId !== newOrder.orderId)]);
    });

    socket.on('order-status-updated', (payload) => {
      setOrders(prev =>
        prev.map(o =>
          o.orderId === payload.orderId
            ? { ...o, status: payload.status, busserName: payload.busserName, updatedAt: payload.updatedAt }
            : o
        )
      );
    });

    socket.on('table-status-updated', (updatedTable) => {
      setTables(prev =>
        prev.map(t => (t.tableNumber === updatedTable.tableNumber ? updatedTable : t))
      );
    });

    socket.on('item-availability-updated', ({ itemId, itemName, isAvailable }) => {
      // Update both the legacy availability map AND the menuItems array
      if (itemName) setItemAvailability(prev => ({ ...prev, [itemName]: isAvailable }));
      if (itemId) {
        setMenuItems(prev => prev.map(m =>
          String(m.id) === String(itemId)
            ? { ...m, available: isAvailable, status: isAvailable ? 'Available' : 'Unavailable' }
            : m
        ));
      }
    });

    socket.on('disconnect', () => setSocketConnected(false));

    return () => socket.disconnect();
  }, []);

  // Toggle item 86 / stock availability — uses same Admin endpoint PATCH /api/menu/:id/availability
  const handleToggleStock = (item) => {
    const currentAvailable = item.available !== undefined ? item.available : (itemAvailability[item.name] !== false);
    const newStatus = !currentAvailable;

    // Optimistic update in menuItems array (same source as admin)
    setMenuItems(prev => prev.map(m =>
      String(m.id) === String(item.id)
        ? { ...m, available: newStatus, status: newStatus ? 'Available' : 'Unavailable' }
        : m
    ));
    setItemAvailability(prev => ({ ...prev, [item.name]: newStatus }));

    // Call same endpoint as AdminView
    fetch(`/api/menu/${item.id}/availability`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ available: newStatus })
    }).catch(err => {
      console.error('Error toggling stock:', err);
      // Rollback on error
      setMenuItems(prev => prev.map(m =>
        String(m.id) === String(item.id)
          ? { ...m, available: currentAvailable, status: currentAvailable ? 'Available' : 'Unavailable' }
          : m
      ));
    });
  };

  // Change Table Status
  const handleSetTableStatus = (tableNumber, newStatus) => {
    setTables(prev =>
      prev.map(t => (t.tableNumber === tableNumber ? { ...t, status: newStatus } : t))
    );

    if (socketRef.current && socketConnected) {
      socketRef.current.emit('update-table-status', { tableNumber, status: newStatus });
    }

    fetch(`/api/tables/${tableNumber}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    }).catch(err => console.error("Error setting table status:", err));
  };

  // KPI Calculations
  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total || o.totalPrice || 0), 0);
  const activeOrders = orders.filter(o => o.status !== 'Completed' && o.status !== 'Cancelled');
  const readyOrders = orders.filter(o => o.status === 'Ready' || o.status === 'Order Ready' || o.status === 'Ready for Pickup');
  const completedOrders = orders.filter(o => o.status === 'Completed');
  
  // Tables breakdown
  const occupiedTables = tables.filter(t => t.status === 'Occupied');
  const availableTables = tables.filter(t => t.status === 'Available');
  const busserTables = tables.filter(t => t.status === 'Needs Bussing');
  const totalTables = 25; // 25 tables capacity matching Image 1
  const occupancyRate = totalTables > 0 ? Math.round((occupiedTables.length / totalTables) * 100) : 0;
  const availablePercentage = totalTables > 0 ? Math.round((availableTables.length / totalTables) * 100) : 0;

  // Breakdown subtext
  const entreesCount = activeOrders.reduce((sum, o) => sum + (o.items?.filter(i => i.category === 'Entrees' || !i.category)?.length || 0), 0);
  const appsCount = activeOrders.reduce((sum, o) => sum + (o.items?.filter(i => i.category === 'Appetizers')?.length || 0), 0);
  const busserTablesList = busserTables.map(t => t.tableNumber).join(', ');

  const filteredMenuItems = menuItems.filter(item =>
    item.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    (item.category && item.category.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  return (
    <div className="ops-page-clean">
      {/* ── Main Operations Container ── */}
      <main className="ops-main-clean">
        {/* Top Management Header Bar */}
        <header className="ops-header-card">
          <div className="ops-header-left">
            <div className="ops-hq-icon-box">
              <Store size={22} />
            </div>
            <div>
              <div className="ops-title-row">
                <h1 className="ops-title">
                  {restaurantInfo.name.toUpperCase()} • OPERATIONS PORTAL
                </h1>
                <span className="ops-hq-badge">
                  HQ MANAGER
                </span>
              </div>
              <p className="ops-subtitle">
                {restaurantInfo.cuisine} • Real-time Floor & Inventory Management
              </p>
            </div>
          </div>

          <div className="ops-header-right">
            {onReturnToKiosk && (
              <button
                type="button"
                onClick={onReturnToKiosk}
                className="ops-sync-btn"
                style={{
                  background: 'rgba(217, 75, 43, 0.08)',
                  borderColor: 'rgba(217, 75, 43, 0.35)',
                  color: '#D94B2B',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                title="Return to Smart Kiosk / Home"
              >
                <Home size={14} />
                <span>Exit to Kiosk</span>
              </button>
            )}
            <button
              onClick={loadData}
              className="ops-sync-btn"
              title="Sync Portal Data"
              disabled={isSyncing}
            >
              <RefreshCw size={14} className={isSyncing ? 'ops-spin' : ''} />
              <span>Sync</span>
            </button>
            <div className="ops-sync-status">
              <span className="ops-live-dot"></span>
              <span>{lastSyncText}</span>
            </div>
          </div>
        </header>

        {/* ── 3 KPI Stats in a single row ── */}
        <section className="ops-kpi-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }} aria-label="Operations Key Metrics">
          {/* Card 1: Gross Sales */}
          <div className="ops-kpi-card">
            <div className="ops-kpi-icon-circle peach">
              <span style={{ fontSize: '22px', fontWeight: '800', lineHeight: 1, color: '#D94B2B' }}>₱</span>
            </div>
            <div className="ops-kpi-content">
              <div className="ops-kpi-value">₱{totalRevenue.toFixed(2)}</div>
              <div className="ops-kpi-label">TODAY'S GROSS SALES</div>
              <div className="ops-kpi-subtext sales-trend">
                <span className="trend-arrow">↑</span>
                <span>{totalRevenue > 0 ? '+12%' : '+0%'} vs. yesterday</span>
              </div>
            </div>
          </div>

          {/* Card 2: Active in Kitchen */}
          <div className="ops-kpi-card">
            <div className="ops-kpi-icon-circle amber">
              <ChefHat size={24} />
            </div>
            <div className="ops-kpi-content">
              <div className="ops-kpi-value">{activeOrders.length}</div>
              <div className="ops-kpi-label">ACTIVE IN KITCHEN</div>
              <div className="ops-kpi-subtext">
                {activeOrders.length === 0
                  ? '0 entrées • 0 appetizers'
                  : `${entreesCount} entrées • ${appsCount} appetizers`}
              </div>
            </div>
          </div>

          {/* Card 3: Ready for Busser */}
          <div className="ops-kpi-card">
            <div className="ops-kpi-icon-circle rose">
              <ClocheIcon size={24} />
            </div>
            <div className="ops-kpi-content">
              <div className="ops-kpi-value">{readyOrders.length}</div>
              <div className="ops-kpi-label">READY FOR BUSSER</div>
              <div className="ops-kpi-subtext">
                {busserTables.length === 0
                  ? 'No tables waiting'
                  : `Tables ${busserTablesList}`}
              </div>
            </div>
          </div>
        </section>

        {/* ── Sub-Navigation Tabs ── */}
        <nav className="ops-tabs-nav" aria-label="Portal Navigation">
          <div className="ops-tabs-group">
            <button
              className={`ops-tab-pill ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <Layers size={15} />
              <span>Live Operations</span>
            </button>

            <button
              className={`ops-tab-pill ${activeTab === 'floor' ? 'active' : ''}`}
              onClick={() => setActiveTab('floor')}
            >
              <Store size={15} />
              <span>Floor Plan & Tables</span>
            </button>

            <button
              className={`ops-tab-pill ${activeTab === 'menu' ? 'active' : ''}`}
              onClick={() => setActiveTab('menu')}
            >
              <Utensils size={15} />
              <span>Menu Inventory & 86'd Items</span>
            </button>
          </div>
        </nav>

        {/* ── SUB-VIEW 1: LIVE OPERATIONS (Image 1 Layout) ── */}
        {activeTab === 'overview' && (
          <div className="ops-dual-panel-grid">
            {/* Left Panel: Active Order Pipeline */}
            <div className="ops-panel-card">
              <div className="ops-panel-header">
                <h2 className="ops-panel-title">
                  Active Order Pipeline ({orders.length})
                </h2>
                <div className="ops-live-feed-badge">
                  <span className="ops-live-dot pulsing"></span>
                  <span>Real-time Feed</span>
                </div>
              </div>

              <div className="ops-pipeline-body">
                {orders.length === 0 ? (
                  <div className="ops-pipeline-empty-state">
                    <p className="ops-empty-message">
                      No orders placed yet. Orders from Customer App or Kiosk appear here automatically.
                    </p>
                  </div>
                ) : (
                  <div className="ops-pipeline-order-list">
                    {orders.slice(0, 8).map(order => {
                      const isReady = order.status === 'Ready' || order.status === 'Order Ready' || order.status === 'Ready for Pickup';
                      const isPreparing = order.status === 'Preparing';
                      const isPlating = order.status === 'Plating';

                      let badgeClass = 'kitchen';
                      let statusText = order.status;
                      if (isReady) {
                        badgeClass = 'ready';
                        statusText = 'Order Ready';
                      } else if (isPlating) {
                        badgeClass = 'plating';
                        statusText = 'Plating';
                      } else if (isPreparing) {
                        badgeClass = 'preparing';
                        statusText = 'Preparing';
                      } else {
                        badgeClass = 'kitchen';
                        statusText = 'In Kitchen';
                      }

                      return (
                        <div key={order.orderId} className="ops-pipeline-order-row">
                          <div className="ops-order-table-badge">
                            <span className="badge-tbl-label">Table</span>
                            <span className="badge-tbl-num">{order.tableNumber || 1}</span>
                          </div>

                          <div className="ops-order-id-col">
                            <span className="ops-order-id">#{order.orderId?.slice?.(-4) || '1042'}</span>
                          </div>

                          <div className="ops-order-items-col">
                            {order.items && order.items.length > 0 ? (
                              order.items.slice(0, 2).map((item, idx) => (
                                <div key={idx} className="ops-order-item-line">
                                  {item.quantity || 1} × {item.name}
                                </div>
                              ))
                            ) : (
                              <div className="ops-order-item-line">1 × Artisanal Ramen</div>
                            )}
                          </div>

                          <div className="ops-order-status-col">
                            <span className={`ops-status-badge ${badgeClass}`}>
                              {statusText}
                            </span>
                          </div>

                          <div className="ops-order-meta-col">
                            <div className="ops-order-time">8 min ago</div>
                            <div className="ops-order-count">{order.items?.length || 3} items</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="ops-panel-footer">
                <span className="ops-footer-counter">
                  Showing {Math.min(orders.length, 5)} of {orders.length} active orders
                </span>
                <button className="ops-view-all-link" onClick={() => {}}>
                  View All Orders →
                </button>
              </div>
            </div>

            {/* Right Panel: Floor Quick Glance */}
            <div className="ops-panel-card">
              <div className="ops-panel-header">
                <h2 className="ops-panel-title">
                  Floor Quick Glance
                </h2>
                <span className="ops-total-tables-label">
                  Total Tables: {totalTables}
                </span>
              </div>

              <div className="ops-glance-grid">
                {/* Available Tables */}
                <div
                  className="ops-glance-tile available"
                  onClick={() => setActiveTab('floor')}
                  title="View available tables on floor plan"
                >
                  <div className="tile-content-group">
                    <div className="tile-icon-box mint">
                      <ChairIcon size={22} color="#059669" />
                    </div>
                    <div className="tile-text-info">
                      <div className="tile-number mint">{availableTables.length}</div>
                      <div className="tile-label mint">AVAILABLE TABLES</div>
                      <div className="tile-subtext mint">{availablePercentage}% of total</div>
                    </div>
                  </div>
                  <ChevronRight size={18} className="tile-chevron mint" />
                </div>

                {/* Seated Guests */}
                <div
                  className="ops-glance-tile seated"
                  onClick={() => setActiveTab('floor')}
                  title="View seated tables"
                >
                  <div className="tile-content-group">
                    <div className="tile-icon-box blue">
                      <Users size={22} color="#2563EB" />
                    </div>
                    <div className="tile-text-info">
                      <div className="tile-number blue">{occupiedTables.length}</div>
                      <div className="tile-label blue">SEATED GUESTS</div>
                      <div className="tile-subtext blue">{occupancyRate}% occupancy</div>
                    </div>
                  </div>
                  <ChevronRight size={18} className="tile-chevron blue" />
                </div>

                {/* Awaiting Busser */}
                <div
                  className="ops-glance-tile busser"
                  onClick={() => setActiveTab('floor')}
                  title="View tables awaiting cleaning"
                >
                  <div className="tile-content-group">
                    <div className="tile-icon-box amber">
                      <ClocheIcon size={22} color="#D97706" />
                    </div>
                    <div className="tile-text-info">
                      <div className="tile-number amber">{busserTables.length}</div>
                      <div className="tile-label amber">AWAITING BUSSER</div>
                      <div className="tile-subtext amber">
                        {busserTables.length === 0 ? 'None awaiting' : `Tables ${busserTablesList}`}
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={18} className="tile-chevron amber" />
                </div>

                {/* Orders Served */}
                <div
                  className="ops-glance-tile served"
                  title="Orders served since opening"
                >
                  <div className="tile-content-group">
                    <div className="tile-icon-box rose">
                      <CheckCircle size={22} color="#E11D48" />
                    </div>
                    <div className="tile-text-info">
                      <div className="tile-number rose">{completedOrders.length}</div>
                      <div className="tile-label rose">ORDERS SERVED</div>
                      <div className="tile-subtext rose">Since opening (11:00 AM)</div>
                    </div>
                  </div>
                  <ChevronRight size={18} className="tile-chevron rose" />
                </div>
              </div>

              {/* Bottom Quote Card Banner */}
              <div className="ops-quote-banner-card">
                <p className="ops-quote-text">
                  “Great food. Smoother operations. Happier guests.”
                </p>
                <div className="ops-quote-divider">
                  <span className="ops-quote-line"></span>
                  <span className="ops-quote-brand">UMAMI CRAFT FUSION</span>
                  <span className="ops-quote-line"></span>
                </div>
                <img
                  src="/wave-quote.png"
                  alt=""
                  className="ops-quote-wave-bg"
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── SUB-VIEW 2: FLOOR PLAN & TABLE MAP ── */}
        {activeTab === 'floor' && (
          <div className="ops-panel-card" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#2C2218', margin: 0 }}>
                  Dining Floor Table Map
                </h2>
                <p style={{ fontSize: '13px', color: '#7B6C5E', margin: '4px 0 0' }}>
                  Click table status pills to update occupancy or assign busser cleaning
                </p>
              </div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#E25822', background: '#FFEDE5', padding: '4px 12px', borderRadius: '9999px' }}>
                {tables.length || 0} Tables Total
              </span>
            </div>

            <div className="floor-tables-grid">
              {tables.map(table => (
                <div
                  key={table.tableNumber}
                  className={`floor-table-card status-${table.status.toLowerCase().replace(/\s+/g, '-')}`}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid rgba(226, 215, 200, 0.7)',
                    borderRadius: '16px',
                    padding: '16px',
                    boxShadow: '0 4px 16px rgba(160, 130, 95, 0.04)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#2C2218' }}>
                      Table {table.tableNumber}
                    </span>
                  </div>

                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#5C4E40', marginBottom: '12px' }}>
                    Status: <strong style={{ color: table.status === 'Available' ? '#059669' : (table.status === 'Occupied' ? '#2563EB' : '#D97706') }}>{table.status}</strong>
                  </div>

                  {/* Status action switches */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => handleSetTableStatus(table.tableNumber, 'Available')}
                      style={{
                        flex: 1,
                        padding: '6px 4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        borderRadius: '8px',
                        border: '1px solid rgba(226, 215, 200, 0.7)',
                        background: table.status === 'Available' ? '#059669' : '#FFFFFF',
                        color: table.status === 'Available' ? '#FFFFFF' : '#5C4E40',
                        cursor: 'pointer'
                      }}
                    >
                      Open
                    </button>

                    <button
                      onClick={() => handleSetTableStatus(table.tableNumber, 'Occupied')}
                      style={{
                        flex: 1,
                        padding: '6px 4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        borderRadius: '8px',
                        border: '1px solid rgba(226, 215, 200, 0.7)',
                        background: table.status === 'Occupied' ? '#2563EB' : '#FFFFFF',
                        color: table.status === 'Occupied' ? '#FFFFFF' : '#5C4E40',
                        cursor: 'pointer'
                      }}
                    >
                      Seated
                    </button>

                    <button
                      onClick={() => handleSetTableStatus(table.tableNumber, 'Needs Bussing')}
                      style={{
                        flex: 1,
                        padding: '6px 4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        borderRadius: '8px',
                        border: '1px solid rgba(226, 215, 200, 0.7)',
                        background: table.status === 'Needs Bussing' ? '#D97706' : '#FFFFFF',
                        color: table.status === 'Needs Bussing' ? '#FFFFFF' : '#5C4E40',
                        cursor: 'pointer'
                      }}
                    >
                      Bus
                    </button>
                  </div>
                </div>
              ))}</div>
          </div>
        )}

        {/* ── SUB-VIEW 3: MENU INVENTORY & 86'd ITEMS ── */}
        {activeTab === 'menu' && (() => {
          // Derive availability from menuItems (same source as Admin)
          const inventoryItems = filteredMenuItems.filter(item =>
            item.status !== 'Draft' && item.status !== 'Archived'
          );
          return (
            <div className="ops-panel-card" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#2C2218', margin: 0 }}>
                    Menu Stock & 86 Availability Manager
                  </h2>
                  <p style={{ fontSize: '13px', color: '#7B6C5E', margin: '4px 0 0' }}>
                    Synced with Admin inventory. Toggle 86 or restock — changes propagate live to Kiosk and Mobile apps.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '12px', color: '#7B6C5E', display: 'flex', gap: '12px' }}>
                    <span style={{ color: '#059669', fontWeight: 700 }}>● {inventoryItems.filter(i => i.available !== false).length} In Stock</span>
                    <span style={{ color: '#EF4444', fontWeight: 700 }}>● {inventoryItems.filter(i => i.available === false).length} 86'd</span>
                    <span style={{ color: '#D97706', fontWeight: 700 }}>● {inventoryItems.filter(i => typeof i.stock === 'number' && i.stock <= (i.reorderLevel || 5)).length} Low Stock</span>
                  </div>
                  <div style={{ position: 'relative', minWidth: '240px' }}>
                    <Search size={15} color="#7B6C5E" style={{ position: 'absolute', left: '12px', top: '10px' }} />
                    <input
                      type="text"
                      placeholder="Search dish name or category..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 14px 8px 36px',
                        borderRadius: '9999px',
                        border: '1px solid rgba(226, 215, 200, 0.8)',
                        fontSize: '13px',
                        background: '#FFFFFF',
                        color: '#2C2218',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Table-like header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1.5fr auto',
                gap: '12px',
                padding: '8px 18px',
                fontSize: '11px',
                fontWeight: 800,
                color: '#9B8B7E',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                borderBottom: '1px solid rgba(226, 215, 200, 0.8)',
                marginBottom: '8px'
              }}>
                <span>Product</span>
                <span>Category & SKU</span>
                <span>Stock Level</span>
                <span style={{ textAlign: 'right' }}>Status</span>
              </div>

              <div>
                {inventoryItems.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#9B8B7E', fontSize: '14px' }}>
                    No menu items match your search.
                  </div>
                ) : inventoryItems.map(item => {
                  const inStock = item.available !== false;
                  const stock = typeof item.stock === 'number' ? item.stock : null;
                  const reorderLvl = item.reorderLevel || 5;
                  const maxStock = Math.max(stock || 0, reorderLvl * 4, 100);
                  const stockPct = stock !== null ? Math.min(100, Math.round((stock / maxStock) * 100)) : null;
                  const isLow = stock !== null && stock <= reorderLvl;
                  const isOut = stock !== null && stock === 0;

                  return (
                    <div
                      key={item.id || item.name}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1fr 1.5fr auto',
                        gap: '12px',
                        alignItems: 'center',
                        background: '#FFFFFF',
                        border: `1px solid ${isOut ? 'rgba(239,68,68,0.25)' : isLow ? 'rgba(217,119,6,0.25)' : 'rgba(226, 215, 200, 0.7)'}`,
                        borderRadius: '14px',
                        padding: '12px 18px',
                        marginBottom: '8px',
                        transition: 'box-shadow 0.15s'
                      }}
                    >
                      {/* Product image + name */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '10px',
                          overflow: 'hidden',
                          flexShrink: 0,
                          background: '#F5EFE8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
                            />
                          ) : null}
                          <span style={{ fontSize: '22px', display: item.image ? 'none' : 'flex' }}>{item.emoji || '🍽️'}</span>
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '14px', fontWeight: 800, color: '#2C2218', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.name}
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#7B6C5E', marginTop: '2px' }}>
                            ₱{item.promoPrice ? (
                              <><s style={{ opacity: 0.5, marginRight: '4px' }}>{item.price?.toFixed(2)}</s><span style={{ color: '#D94B2B', fontWeight: 700 }}>{Number(item.promoPrice).toFixed(2)}</span></>
                            ) : item.price?.toFixed(2)}
                          </div>
                        </div>
                      </div>

                      {/* Category & SKU */}
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#5C4E40' }}>{item.category || '—'}</div>
                        {item.sku && <div style={{ fontSize: '10.5px', color: '#9B8B7E', marginTop: '2px', fontFamily: 'monospace' }}>SKU: {item.sku}</div>}
                      </div>

                      {/* Stock level */}
                      <div>
                        {stock !== null ? (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: isOut ? '#EF4444' : isLow ? '#D97706' : '#2C2218', marginBottom: '4px' }}>
                              <span>{stock} units</span>
                              <span style={{ color: '#9B8B7E', fontWeight: 500 }}>min {reorderLvl}</span>
                            </div>
                            <div style={{ height: '6px', borderRadius: '9999px', background: '#F0E8DF', overflow: 'hidden' }}>
                              <div style={{
                                height: '100%',
                                width: `${stockPct}%`,
                                borderRadius: '9999px',
                                background: isOut ? '#EF4444' : isLow ? '#D97706' : '#059669',
                                transition: 'width 0.4s ease'
                              }} />
                            </div>
                            {isLow && !isOut && (
                              <div style={{ fontSize: '10px', color: '#D97706', fontWeight: 700, marginTop: '3px' }}>⚠ Low — reorder soon</div>
                            )}
                            {isOut && (
                              <div style={{ fontSize: '10px', color: '#EF4444', fontWeight: 700, marginTop: '3px' }}>✕ Out of stock</div>
                            )}
                          </>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#9B8B7E' }}>—</span>
                        )}
                      </div>

                      {/* Toggle button */}
                      <button
                        className={`stock-toggle-switch ${inStock ? 'in-stock' : 'sold-out'}`}
                        onClick={() => handleToggleStock(item)}
                        title={inStock ? 'Click to 86 (Mark Sold Out)' : 'Click to Restock'}
                        style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                      >
                        {inStock ? <ToggleRight size={18} color="#059669" /> : <ToggleLeft size={18} color="#EF4444" />}
                        <span style={{ fontSize: '12px' }}>{inStock ? 'IN STOCK' : '86\'D'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </main>
    </div>
  );
}

export default RestaurantView;
