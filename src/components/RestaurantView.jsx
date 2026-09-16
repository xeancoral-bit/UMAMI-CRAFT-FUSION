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
  ToggleRight
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

    socket.on('item-availability-updated', ({ itemName, isAvailable }) => {
      setItemAvailability(prev => ({ ...prev, [itemName]: isAvailable }));
    });

    socket.on('disconnect', () => setSocketConnected(false));

    return () => socket.disconnect();
  }, []);

  // Toggle item 86 / stock availability
  const handleToggleStock = (itemName) => {
    const currentStatus = itemAvailability[itemName] !== false;
    const newStatus = !currentStatus;

    setItemAvailability(prev => ({ ...prev, [itemName]: newStatus }));

    if (socketRef.current && socketConnected) {
      socketRef.current.emit('toggle-item-availability', { itemName, isAvailable: newStatus });
    }

    fetch('/api/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemName, isAvailable: newStatus })
    }).catch(err => console.error("Error toggling stock:", err));
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
  const totalRevenue = orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
  const activeOrders = orders.filter(o => o.status === 'Order Received' || o.status === 'Cooking');
  const readyOrders = orders.filter(o => o.status === 'Order Ready');
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
              🏢
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

        {/* ── 4 KPI Stats in a single row ── */}
        <section className="ops-kpi-row" aria-label="Operations Key Metrics">
          {/* Card 1: Gross Sales */}
          <div className="ops-kpi-card">
            <div className="ops-kpi-icon-circle peach">
              <DollarSign size={24} />
            </div>
            <div className="ops-kpi-content">
              <div className="ops-kpi-value">${totalRevenue.toFixed(2)}</div>
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

          {/* Card 4: Table Occupancy */}
          <div className="ops-kpi-card">
            <div className="ops-kpi-icon-circle mint">
              <Users size={24} />
            </div>
            <div className="ops-kpi-content">
              <div className="ops-kpi-value">{occupancyRate}%</div>
              <div className="ops-kpi-label">TABLE OCCUPANCY</div>
              <div className="ops-occupancy-progress-row">
                <div className="ops-progress-track">
                  <div
                    className="ops-progress-fill"
                    style={{ width: `${occupancyRate}%` }}
                  ></div>
                </div>
                <span className="ops-progress-count">
                  {occupiedTables.length} / {totalTables}
                </span>
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
                      const isReady = order.status === 'Order Ready';
                      const isPreparing = order.status === 'Cooking' || order.status === 'Preparing';
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
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#7B6C5E' }}>
                      {table.capacity} Guests
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
              ))}
            </div>
          </div>
        )}

        {/* ── SUB-VIEW 3: MENU INVENTORY & 86'd ITEMS ── */}
        {activeTab === 'menu' && (
          <div className="ops-panel-card" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#2C2218', margin: 0 }}>
                  Menu Stock & 86 Availability Manager
                </h2>
                <p style={{ fontSize: '13px', color: '#7B6C5E', margin: '4px 0 0' }}>
                  Instantly toggle dishes as In Stock or 86'd (Sold Out). Changes propagate live to Kiosk and Mobile apps.
                </p>
              </div>

              <div style={{ position: 'relative', minWidth: '260px' }}>
                <Search size={16} color="#7B6C5E" style={{ position: 'absolute', left: '14px', top: '11px' }} />
                <input
                  type="text"
                  placeholder="Search dish name..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 14px 9px 38px',
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

            <div>
              {filteredMenuItems.map(item => {
                const inStock = itemAvailability[item.name] !== false;

                return (
                  <div
                    key={item.id || item.name}
                    className="stock-item-row"
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid rgba(226, 215, 200, 0.7)',
                      borderRadius: '14px',
                      padding: '14px 18px',
                      marginBottom: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <span style={{ fontSize: '24px' }}>{item.emoji || '🍽️'}</span>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#2C2218' }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#7B6C5E', marginTop: '2px' }}>
                          {item.category || 'Main'} • ${item.price?.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <button
                      className={`stock-toggle-switch ${inStock ? 'in-stock' : 'sold-out'}`}
                      onClick={() => handleToggleStock(item.name)}
                      title={inStock ? 'Click to 86 (Mark Sold Out)' : 'Click to Restock'}
                    >
                      {inStock ? <ToggleRight size={20} color="#059669" /> : <ToggleLeft size={20} color="#EF4444" />}
                      <span>{inStock ? 'IN STOCK' : '86’D / SOLD OUT'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default RestaurantView;
