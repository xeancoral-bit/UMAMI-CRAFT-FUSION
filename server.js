import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import os from 'os';
import crypto from 'crypto';
import dgram from 'dgram';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse CLI arguments (e.g. node server.js --port 3002 --restaurant bella --frontend 5174)
const cliArgs = process.argv.slice(2);
function getCliArg(flag, defaultVal) {
  const idx = cliArgs.indexOf(flag);
  return idx !== -1 && cliArgs[idx + 1] ? cliArgs[idx + 1] : defaultVal;
}

const app = express();
const PORT = parseInt(getCliArg('--port', process.env.PORT || 3001), 10);
const FRONTEND_PORT = parseInt(getCliArg('--frontend', process.env.FRONTEND_PORT || 3000), 10);
const MOBILE_FRONTEND_PORT = parseInt(getCliArg('--mobile-frontend', process.env.MOBILE_FRONTEND_PORT || FRONTEND_PORT), 10);
const RESTAURANT_ID = getCliArg('--restaurant', process.env.RESTAURANT_ID || 'umami');

const RESTAURANTS = {
  umami: {
    id: 'umami',
    name: 'Umami Craft Fusion',
    cuisine: 'Asian Craft Fusion',
    tagline: 'Bowls, Dumplings & Artisanal Street Noodles',
    accentColor: '#E45729',
    currencySymbol: '₱',
    menuFile: 'umami.json'
  },
  bella: {
    id: 'bella',
    name: 'Trattoria Bella',
    cuisine: 'Artisan Italian',
    tagline: 'Handmade Pastas & Wood-Fired Neapolitan Classics',
    accentColor: '#B45309',
    menuFile: 'bella.json'
  },
  verde: {
    id: 'verde',
    name: 'Verde Garden Kitchen',
    cuisine: 'Organic & 100% Gluten-Free',
    tagline: 'Superfood Bowls, Cold-Pressed Juices & Plant Kitchen',
    accentColor: '#2D6A4F',
    menuFile: 'verde.json'
  }
};

const activeRestaurant = RESTAURANTS[RESTAURANT_ID] || RESTAURANTS.umami;


// Enable JSON body parsing for API requests (10MB for icon/image uploads)
app.use(express.json({ limit: '10mb' }));
// Enable CORS for development
app.use(cors());

// Static uploads store for menu & beverage images
const UPLOADS_DIR = path.join(__dirname, 'data', 'uploads');
fs.mkdir(UPLOADS_DIR, { recursive: true }).catch(() => {});
app.use('/api/uploads', express.static(UPLOADS_DIR));

// Orders store & Database File Path
const ORDERS_FILE = path.join(__dirname, 'data', 'orders.json');
let orders = [];

// Asynchronously load orders from data/orders.json
async function loadOrdersFromDb() {
  try {
    const raw = await fs.readFile(ORDERS_FILE, 'utf8');
    const data = JSON.parse(raw);
    if (Array.isArray(data)) {
      orders = data;
      console.log(`[DB] Orders loaded: ${orders.length} orders from data/orders.json`);
      return;
    }
  } catch (err) {
    console.warn('[DB] Could not load orders.json:', err.message);
  }
}

async function saveOrdersToDb() {
  try {
    await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf8');
  } catch (err) {
    console.error('[DB] Failed to save orders.json:', err);
  }
}

// Initial orders DB load
loadOrdersFromDb();

// In-memory restaurant floor tables state (10 tables)
const restaurantTables = [
  { tableNumber: 1, capacity: 2, status: 'Available', orderId: null, lastBussed: new Date().toISOString() },
  { tableNumber: 2, capacity: 4, status: 'Occupied', orderId: null, lastBussed: new Date().toISOString() },
  { tableNumber: 3, capacity: 4, status: 'Needs Bussing', orderId: null, lastBussed: new Date(Date.now() - 15 * 60000).toISOString() },
  { tableNumber: 4, capacity: 6, status: 'Available', orderId: null, lastBussed: new Date().toISOString() },
  { tableNumber: 5, capacity: 2, status: 'Occupied', orderId: null, lastBussed: new Date().toISOString() },
  { tableNumber: 6, capacity: 4, status: 'Needs Bussing', orderId: null, lastBussed: new Date(Date.now() - 25 * 60000).toISOString() },
  { tableNumber: 7, capacity: 8, status: 'Available', orderId: null, lastBussed: new Date().toISOString() },
  { tableNumber: 8, capacity: 4, status: 'Available', orderId: null, lastBussed: new Date().toISOString() },
  { tableNumber: 9, capacity: 2, status: 'Needs Bussing', orderId: null, lastBussed: new Date(Date.now() - 8 * 60000).toISOString() },
  { tableNumber: 10, capacity: 6, status: 'Available', orderId: null, lastBussed: new Date().toISOString() }
];

// Menu item 86 / availability override store
const itemAvailability = {};

// Menu Preferences store & Database File Path
const PREFERENCES_FILE = path.join(__dirname, 'data', 'preferences.json');
let menuPreferences = {
  allergens: [],
  flavor_preferences: []
};

// Asynchronously load preferences from data/preferences.json
async function loadPreferencesFromDb() {
  try {
    const raw = await fs.readFile(PREFERENCES_FILE, 'utf8');
    const data = JSON.parse(raw);
    if (data && Array.isArray(data.allergens)) {
      menuPreferences.allergens = data.allergens;
    }
    if (data && (Array.isArray(data.flavor_preferences) || Array.isArray(data.flavors))) {
      menuPreferences.flavor_preferences = data.flavor_preferences || data.flavors;
      menuPreferences.flavors = menuPreferences.flavor_preferences;
    }
    console.log(`[DB] Preferences loaded: ${menuPreferences.allergens.length} allergens, ${menuPreferences.flavor_preferences.length} flavor preferences`);
  } catch (err) {
    console.warn('[DB] Could not load preferences.json, using memory defaults:', err.message);
  }
}

async function savePreferencesToDb() {
  try {
    const payload = {
      allergens: menuPreferences.allergens || [],
      flavor_preferences: menuPreferences.flavor_preferences || menuPreferences.flavors || []
    };
    await fs.writeFile(PREFERENCES_FILE, JSON.stringify(payload, null, 2), 'utf8');
  } catch (err) {
    console.error('[DB] Failed to save preferences.json:', err);
  }
}

// Initial DB load
loadPreferencesFromDb();

// ══════════════════════════════════════════════════════════════════════════
// SECURE ADMIN AUTHENTICATION & PASSWORD STORAGE (PBKDF2 HASHING)
// ══════════════════════════════════════════════════════════════════════════
const AUTH_FILE = path.join(__dirname, 'data', 'admin_auth.json');

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

let adminAuthData = {
  email: 'admin@umamicraft.com',
  name: 'Chief Administrator',
  role: 'Super Admin',
  salt: '',
  hash: '',
  session_token: '',
  updated_at: ''
};

async function initAdminAuth() {
  try {
    const raw = await fs.readFile(AUTH_FILE, 'utf8');
    adminAuthData = JSON.parse(raw);
    console.log('[Auth] Admin credentials loaded from data/admin_auth.json');
  } catch (err) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPassword('admin123', salt);
    adminAuthData = {
      email: 'admin@umamicraft.com',
      name: 'Chief Administrator',
      role: 'Super Admin',
      salt,
      hash,
      session_token: crypto.randomBytes(32).toString('hex'),
      updated_at: new Date().toISOString()
    };
    await fs.writeFile(AUTH_FILE, JSON.stringify(adminAuthData, null, 2), 'utf8');
    console.log('[Auth] Initialized default admin credentials with secure salt/hash.');
  }
}

initAdminAuth();

// ══════════════════════════════════════════════════════════════════════════
// ADMIN NUMERIC PIN / PASSCODE STORAGE (ISOLATED FROM ACCOUNT CREDENTIALS)
// ══════════════════════════════════════════════════════════════════════════
const PIN_FILE = path.join(__dirname, 'data', 'admin_pin.json');

let adminPinData = {
  pin: '123456789',
  length: 9,
  updated_at: new Date().toISOString()
};

async function initAdminPin() {
  try {
    const raw = await fs.readFile(PIN_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && parsed.pin) {
      adminPinData = {
        pin: String(parsed.pin),
        length: parseInt(parsed.length || parsed.pin.length, 10),
        updated_at: parsed.updated_at || new Date().toISOString()
      };
      console.log(`[PIN] Loaded admin PIN (${adminPinData.length} digits) from data/admin_pin.json`);
      return;
    }
  } catch (err) {}

  await fs.writeFile(PIN_FILE, JSON.stringify(adminPinData, null, 2), 'utf8');
  console.log('[PIN] Initialized default admin PIN (9 digits) in data/admin_pin.json');
}

initAdminPin();

// ══════════════════════════════════════════════════════════════════════════
// MENU & DRINKS PERSISTENT DATA SYSTEM
// ══════════════════════════════════════════════════════════════════════════
const MENU_FILE = path.join(__dirname, 'data', 'menus', 'umami.json');
const DRINKS_FILE = path.join(__dirname, 'data', 'drinks.json');

let cachedMenu = null;
let cachedDrinks = null;

async function loadMenuData() {
  try {
    const data = await fs.readFile(MENU_FILE, 'utf8');
    cachedMenu = JSON.parse(data);
    return cachedMenu;
  } catch (err) {
    console.error('[Menu] Failed to load menu:', err);
    return cachedMenu || [];
  }
}

async function saveMenuData(menuList) {
  cachedMenu = menuList;
  try {
    await fs.writeFile(MENU_FILE, JSON.stringify(menuList, null, 2), 'utf8');
  } catch (err) {
    console.error('[Menu] Failed to save menu:', err);
  }
}

async function loadDrinksData() {
  try {
    const data = await fs.readFile(DRINKS_FILE, 'utf8');
    cachedDrinks = JSON.parse(data);
    return cachedDrinks;
  } catch (err) {
    console.error('[Drinks] Failed to load drinks:', err);
    return cachedDrinks || [];
  }
}

async function saveDrinksData(drinksList) {
  cachedDrinks = drinksList;
  try {
    await fs.writeFile(DRINKS_FILE, JSON.stringify(drinksList, null, 2), 'utf8');
  } catch (err) {
    console.error('[Drinks] Failed to save drinks:', err);
  }
}

loadMenuData();
loadDrinksData();

// Menu & Drinks API endpoints
app.get('/api/menu', async (req, res) => {
  if (!cachedMenu) await loadMenuData();
  res.json(cachedMenu || []);
});

app.get('/api/drinks', async (req, res) => {
  if (!cachedDrinks) await loadDrinksData();
  res.json(cachedDrinks || []);
});

// Serve static assets in production
app.use(express.static(path.join(__dirname, 'dist')));

const server = createServer(app);

// Initialize Socket.io with permissive CORS for local dev environment
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Active phone battery mirroring cache { [kioskId]: { batteryLevel, isCharging, updatedAt } }
const sessionBatteries = {};

io.on('connection', (socket) => {
  console.log(`[Socket] User connected: ${socket.id}`);

  // Push current dynamic network info immediately so the kiosk QR is correct from the first render
  const netInfo = getCachedDynamicNetwork();
  socket.emit('network-ip-changed', {
    ip: netInfo.ip,
    ssid: netInfo.ssid,
    wifiConnected: netInfo.wifiConnected,
    signal: netInfo.signal,
    interfaceName: netInfo.interfaceName,
    band: netInfo.band,
    isDynamic: true,
    port: FRONTEND_PORT,
    backendPort: PORT,
    mobileFrontendPort: MOBILE_FRONTEND_PORT
  });

  // Allow kiosk or admin to trigger immediate network re-detection
  socket.on('request-network-refresh', async () => {
    console.log(`[Socket] Network refresh requested by client ${socket.id}`);
    const updated = await refreshDynamicNetwork(true);
    socket.emit('network-ip-changed', {
      ip: updated.ip,
      ssid: updated.ssid,
      wifiConnected: updated.wifiConnected,
      signal: updated.signal,
      interfaceName: updated.interfaceName,
      band: updated.band,
      isDynamic: true,
      port: FRONTEND_PORT,
      backendPort: PORT,
      mobileFrontendPort: MOBILE_FRONTEND_PORT
    });
  });

  // Relay real customer phone battery percentage to kiosk and mockup displays
  socket.on('device-battery-update', (data) => {
    if (!data) return;
    const { kioskId, batteryLevel, isCharging } = data;
    if (!kioskId) return;
    const numericLevel = Math.max(1, Math.min(100, Math.round(Number(batteryLevel) || 85)));
    sessionBatteries[kioskId] = {
      batteryLevel: numericLevel,
      isCharging: Boolean(isCharging),
      updatedAt: Date.now()
    };
    console.log(`[Battery Sync] Kiosk #${kioskId} phone battery updated: ${numericLevel}% (charging: ${Boolean(isCharging)})`);
    io.to(kioskId).emit('device-battery-synced', sessionBatteries[kioskId]);
  });

  // Send current PIN length so all unlock screens display the exact number of indicator dots
  socket.emit('admin-pin-updated', {
    length: adminPinData.length,
    updated_at: adminPinData.updated_at
  });

  // Send live menu and drinks catalogs upon socket connection
  if (cachedMenu) socket.emit('initial-menu', cachedMenu);
  if (cachedDrinks) socket.emit('initial-drinks', cachedDrinks);

  // Device joins a session room based on kioskId or role (kitchen, busser, restaurant, admin, kiosk, mobile)
  socket.on('join-session', ({ kioskId, role }) => {
    if (kioskId) {
      socket.join(kioskId);
      socket.kioskId = kioskId;
      // If a battery level was already calibrated or detected for this kiosk, sync it immediately
      if (sessionBatteries[kioskId]) {
        socket.emit('device-battery-synced', sessionBatteries[kioskId]);
      }
    }
    socket.role = role;
    if (role === 'admin') {
      const adminRoom = `admin_${RESTAURANT_ID}`;
      socket.join(adminRoom);
      console.log(`[Socket] Admin Panel ${socket.id} joined ${adminRoom}`);
      socket.emit('initial-orders', orders);
    } else if (role === 'kitchen') {
      const kitchenRoom = `kitchen_${RESTAURANT_ID}`;
      socket.join(kitchenRoom);
      console.log(`[Socket] Kitchen terminal ${socket.id} joined ${kitchenRoom}`);
      socket.emit('initial-orders', orders);
    } else if (role === 'busser') {
      const busserRoom = `busser_${RESTAURANT_ID}`;
      socket.join(busserRoom);
      console.log(`[Socket] Busser runner terminal ${socket.id} joined ${busserRoom}`);
      socket.emit('initial-orders', orders);
      socket.emit('initial-tables', restaurantTables);
    } else if (role === 'restaurant') {
      socket.emit('initial-orders', orders);
      socket.emit('initial-tables', restaurantTables);
      socket.emit('initial-availability', itemAvailability);
      console.log(`[Socket] Restaurant Manager terminal ${socket.id} connected`);
    } else {
      console.log(`[Socket] Client ${socket.id} (${role}) joined room: ${kioskId}`);
    }
  });

  // Mobile device projects allergen and preference data
  socket.on('project-preferences', ({ kioskId, allergens, preferences }) => {
    console.log(`[Socket] Projection received for Room ${kioskId}:`, { allergens, preferences });
    
    // Broadcast data to all other clients in the room (specifically the Kiosk)
    socket.to(kioskId).emit('preferences-projected', {
      allergens,
      preferences,
      timestamp: new Date().toISOString()
    });
  });

  // Mobile device or Kiosk places an order
  socket.on('place-order', async (orderPayload) => {
    const { 
      kioskId, 
      item, 
      items, 
      itemCount, 
      totalPrice, 
      total, 
      orderedTags, 
      allergens, 
      diningOption, 
      orderType, 
      tableNumber, 
      customer, 
      payment, 
      note 
    } = orderPayload || {};
    
    const effectiveItems = items && items.length > 0 ? items : (item ? [item] : []);
    const effectiveCount = itemCount || effectiveItems.reduce((sum, i) => sum + (i.quantity || i.qty || 1), 0);
    const effectiveTotal = totalPrice !== undefined ? totalPrice : (total !== undefined ? total : effectiveItems.reduce((sum, i) => sum + (i.price * (i.quantity || i.qty || 1)), 0));
    const orderId = orderPayload?.orderId || orderPayload?.id || `ORD-${Math.floor(1000 + Math.random() * 9000)}`;

    // Check for duplicate order ID
    const existingOrder = orders.find(o => o.orderId === orderId || o.id === orderId);
    if (existingOrder) {
      console.log(`[Socket] Duplicate order detected for ${orderId}, returning existing.`);
      socket.emit('order-confirmed', existingOrder);
      return;
    }

    const effectiveCustomer = customer || (tableNumber ? `Guest (${tableNumber})` : (kioskId && kioskId.startsWith('K-') ? `Kiosk Customer #${kioskId}` : 'Guest Diner'));
    const effectiveType = diningOption || orderType || 'Dine-In';
    const effectiveLocation = tableNumber ? (String(tableNumber).startsWith('Table') ? tableNumber : `Table ${tableNumber}`) : (kioskId || 'Counter');

    const newOrder = {
      id: orderId,
      orderId,
      customer: effectiveCustomer,
      orderType: effectiveType,
      diningOption: effectiveType,
      location: effectiveLocation,
      tableId: effectiveLocation,
      tableNumber: tableNumber || (kioskId && kioskId.startsWith('T-') ? kioskId.replace('T-', '') : (kioskId || 'Counter')),
      kioskId: kioskId || 'COUNTER',
      restaurantId: RESTAURANT_ID,
      item: item || effectiveItems[0],
      items: effectiveItems.map(i => ({
        id: i.id || Math.floor(100 + Math.random() * 900),
        name: i.name,
        qty: i.quantity || i.qty || 1,
        quantity: i.quantity || i.qty || 1,
        price: i.price || 0,
        image: i.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
        emoji: i.emoji || '🍽️',
        tags: i.tags || [],
        customizations: i.customizations || []
      })),
      itemCount: effectiveCount,
      total: effectiveTotal,
      totalPrice: effectiveTotal,
      payment: payment || 'Cash',
      paymentStatus: payment === 'Cash' ? 'Pending Cashier' : 'Paid Online',
      status: 'New',
      nextStatus: 'Start Preparing',
      stripeColor: '#2563eb',
      priority: 'Normal',
      isWaitAlert: false,
      waitTime: '0 min',
      orderedTags: orderedTags || [],
      allergens: allergens || [],
      note: note || (allergens && allergens.length > 0 ? `Exclude: ${allergens.map(a => a.toUpperCase()).join(', ')}` : ''),
      isAllergy: Array.isArray(allergens) && allergens.length > 0,
      busserName: null,
      device: orderPayload?.device || orderPayload?.platform || (socket.role === 'mobile' ? 'Mobile' : 'Desktop'),
      platform: orderPayload?.platform || orderPayload?.device || (socket.role === 'mobile' ? 'Mobile' : 'Desktop'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      statusHistory: [
        {
          status: 'New',
          timestamp: new Date().toISOString(),
          updatedBy: socket.role === 'mobile' ? 'Customer App' : 'Smart Kiosk',
          note: 'Order submitted and routed to kitchen queue'
        }
      ]
    };

    orders.unshift(newOrder);
    await saveOrdersToDb();
    
    console.log(`[Socket] Order ${orderId} placed & stored in DB:`, {
      customer: newOrder.customer,
      itemCount: effectiveCount,
      totalPrice: effectiveTotal,
      items: newOrder.items.map(i => `${i.name} (x${i.qty})`)
    });

    // 1. Confirm to the ordering customer with the orderId and tracking details
    socket.emit('order-confirmed', newOrder);
    
    // 2. Broadcast order completion with multi-item receipt data to the Kiosk
    if (kioskId) {
      socket.to(kioskId).emit('order-placed', newOrder);
    }

    // 3. Forward the order to kitchen, admin, and busser displays in real-time
    io.to(`kitchen_${RESTAURANT_ID}`).emit('new-kitchen-order', newOrder);
    io.to(`admin_${RESTAURANT_ID}`).emit('new-kitchen-order', newOrder);
    io.to(`admin_${RESTAURANT_ID}`).emit('new-order', newOrder);
    io.to(`busser_${RESTAURANT_ID}`).emit('new-kitchen-order', newOrder);
    io.emit('new-kitchen-order', newOrder);
    io.emit('new-order', newOrder);
  });

  // Kitchen, Admin, or Server updates order status
  socket.on('update-order-status', async ({ orderId, status, busserName, updatedBy, note }) => {
    const order = orders.find(o => o.orderId === orderId || o.id === orderId);
    if (order) {
      // Normalize status aliases
      let normalizedStatus = status;
      if (status === 'Order Received') normalizedStatus = 'New';
      if (status === 'Cooking' || status === 'Order Ready' || status === 'Ready') normalizedStatus = 'Ready for Pickup';

      // Determine next status and stripe color
      let nextStatus = 'Completed';
      let stripeColor = '#3b82f6';
      if (normalizedStatus === 'New') {
        nextStatus = 'Start Preparing';
        stripeColor = '#2563eb';
      } else if (normalizedStatus === 'Preparing') {
        nextStatus = 'Mark as Ready';
        stripeColor = '#b45309';
      } else if (normalizedStatus === 'Ready for Pickup') {
        nextStatus = 'Mark as Completed';
        stripeColor = '#15803d';
      } else if (normalizedStatus === 'Completed') {
        nextStatus = 'Completed';
        stripeColor = '#059669';
        if (!order.completedAt) order.completedAt = new Date().toISOString();
      } else if (normalizedStatus === 'Cancelled') {
        nextStatus = 'Cancelled';
        stripeColor = '#ef4444';
      }

      order.status = normalizedStatus;
      order.nextStatus = nextStatus;
      order.stripeColor = stripeColor;
      if (busserName !== undefined) order.busserName = busserName;
      order.updatedAt = new Date().toISOString();

      // Append to status history audit trail
      if (!Array.isArray(order.statusHistory)) {
        order.statusHistory = [];
      }
      const actor = updatedBy || (socket.role === 'kitchen' ? 'Kitchen Staff' : (socket.role === 'admin' ? 'Admin (Orders Dashboard)' : 'Staff'));
      order.statusHistory.push({
        status: normalizedStatus,
        timestamp: order.updatedAt,
        updatedBy: actor,
        note: note || (normalizedStatus === 'Ready for Pickup' ? 'Plated & Ready for pickup' : `Order advanced to ${normalizedStatus}`)
      });

      await saveOrdersToDb();

      console.log(`[Socket] Order ${orderId} status updated to: ${normalizedStatus} by [${actor}]`);

      const statusPayload = {
        id: orderId,
        orderId,
        kioskId: order.kioskId,
        tableNumber: order.tableNumber,
        status: normalizedStatus,
        nextStatus: order.nextStatus,
        stripeColor: order.stripeColor,
        busserName: order.busserName,
        updatedAt: order.updatedAt,
        statusHistory: order.statusHistory,
        order
      };

      // Notify all relevant listeners (customer phone, kitchen display, admin panel, bussers)
      if (order.kioskId) {
        io.to(order.kioskId).emit('order-status-updated', statusPayload);
      }
      io.to(`kitchen_${RESTAURANT_ID}`).emit('order-status-updated', statusPayload);
      io.to(`admin_${RESTAURANT_ID}`).emit('order-status-updated', statusPayload);
      io.to(`busser_${RESTAURANT_ID}`).emit('order-status-updated', statusPayload);
      io.emit('order-status-updated', statusPayload);
    }
  });

  // Busser claims a ready order to deliver to table / counter
  socket.on('claim-order', ({ orderId, busserName }) => {
    const order = orders.find(o => o.orderId === orderId);
    if (order) {
      order.status = 'Out for Delivery';
      order.busserName = busserName || 'Food Runner';
      order.updatedAt = new Date().toISOString();
      console.log(`[Socket] Busser ${order.busserName} claimed order ${orderId} for delivery!`);

      const statusPayload = {
        orderId,
        kioskId: order.kioskId,
        tableNumber: order.tableNumber,
        status: order.status,
        busserName: order.busserName,
        updatedAt: order.updatedAt
      };

      if (order.kioskId) {
        io.to(order.kioskId).emit('order-status-updated', statusPayload);
      }
      io.to(`kitchen_${RESTAURANT_ID}`).emit('order-status-updated', statusPayload);
      io.to(`busser_${RESTAURANT_ID}`).emit('order-status-updated', statusPayload);
      io.emit('order-status-updated', statusPayload);
    }
  });

  // Busser or Staff updates table turnover status (Available, Occupied, Needs Bussing)
  socket.on('update-table-status', ({ tableNumber, status }) => {
    const table = restaurantTables.find(t => t.tableNumber === parseInt(tableNumber, 10));
    if (table) {
      table.status = status;
      if (status === 'Available') {
        table.lastBussed = new Date().toISOString();
      }
      console.log(`[Socket] Table ${tableNumber} status updated to: ${status}`);
      io.emit('table-status-updated', table);
    }
  });

  // Restaurant Admin toggles item 86 / availability
  socket.on('toggle-item-availability', ({ itemName, isAvailable }) => {
    itemAvailability[itemName] = isAvailable;
    console.log(`[Socket] Item [${itemName}] availability set to: ${isAvailable}`);
    io.emit('item-availability-updated', { itemName, isAvailable });
  });

  // Client requests initial menu preferences
  socket.emit('initial-menu-preferences', menuPreferences);

  // Admin updates menu preferences (add/edit/delete/reorder/toggle)
  socket.on('update-menu-preferences', (payload) => {
    if (payload?.allergens && Array.isArray(payload.allergens)) {
      menuPreferences.allergens = payload.allergens;
    }
    if (payload?.flavors && Array.isArray(payload.flavors)) {
      menuPreferences.flavors = payload.flavors;
    }
    console.log(`[Socket] Broadcasted updated menu preferences (Allergens: ${menuPreferences.allergens.length}, Flavors: ${menuPreferences.flavors.length})`);
    io.emit('menu-preferences-updated', menuPreferences);
  });

  // Clean up on disconnect
  socket.on('disconnect', () => {
    console.log(`[Socket] User disconnected: ${socket.id}`);
    if (socket.role === 'mobile' && socket.kioskId) {
      console.log(`[Socket] Mobile client disconnected from Kiosk ${socket.kioskId}. Notifying Kiosk.`);
      socket.to(socket.kioskId).emit('mobile-disconnected');
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════
// DYNAMIC WI-FI & IP DISCOVERY SYSTEM
// Automatically detects active Wi-Fi / LAN IP, SSID, connection state,
// filters out virtual adapters (VirtualBox, VMware, Docker, Hyper-V, WSL),
// and broadcasts live updates whenever the network changes.
// ══════════════════════════════════════════════════════════════════════════

let _cachedNetworkInfo = {
  ip: '127.0.0.1',
  ssid: '',
  wifiConnected: false,
  signal: '',
  interfaceName: '',
  band: '',
  isDynamic: true,
  lastUpdated: new Date().toISOString()
};

let _lastNetworkFingerprint = '';

// Check active default route using non-transmitting UDP probe
function getActiveRouteIp() {
  return new Promise((resolve) => {
    try {
      const probeSocket = dgram.createSocket('udp4');
      probeSocket.connect(80, '1.1.1.1', () => {
        const addr = probeSocket.address().address;
        probeSocket.close();
        resolve(addr);
      });
      probeSocket.on('error', () => resolve(null));
      setTimeout(() => {
        try { probeSocket.close(); } catch (_) {}
        resolve(null);
      }, 500);
    } catch (_) {
      resolve(null);
    }
  });
}

// Windows Wi-Fi interface discovery via netsh wlan
async function getWindowsWifiInfo() {
  try {
    const { stdout } = await execAsync('netsh wlan show interfaces', { timeout: 1500 });
    if (!stdout) return null;
    const res = { connected: false, ssid: '', signal: '', mac: '', name: '', band: '' };
    for (const line of stdout.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('State')) {
        res.connected = trimmed.includes('connected') && !trimmed.includes('disconnected');
      } else if (trimmed.startsWith('SSID') && !trimmed.startsWith('SSID name') && !trimmed.startsWith('BSSID')) {
        const parts = trimmed.split(':');
        if (parts.length > 1) res.ssid = parts.slice(1).join(':').trim();
      } else if (trimmed.startsWith('Signal')) {
        const parts = trimmed.split(':');
        if (parts.length > 1) res.signal = parts[1].trim();
      } else if (trimmed.startsWith('Band')) {
        const parts = trimmed.split(':');
        if (parts.length > 1) res.band = parts[1].trim();
      } else if (trimmed.startsWith('Name')) {
        const parts = trimmed.split(':');
        if (parts.length > 1) res.name = parts[1].trim();
      } else if (trimmed.startsWith('Physical address')) {
        const parts = trimmed.split(':');
        if (parts.length > 1) res.mac = parts.slice(1).join(':').trim().toLowerCase().replace(/-/g, ':');
      }
    }
    return res;
  } catch (_) {
    return null;
  }
}

// Check if IP or MAC is a virtual/internal adapter
function isVirtualOrInvalid(ip, mac = '', name = '') {
  if (!ip) return true;
  if (ip.startsWith('127.') || ip.startsWith('169.254.') || ip === '0.0.0.0') return true;
  // VirtualBox Host-Only Ethernet adapter default subnet
  if (ip.startsWith('192.168.56.')) return true;
  // Common virtual MAC OUI prefixes
  const lowerMac = (mac || '').toLowerCase();
  if (lowerMac.startsWith('0a:00:27')) return true; // VirtualBox
  if (lowerMac.startsWith('00:05:69') || lowerMac.startsWith('00:0c:29') || lowerMac.startsWith('00:50:56')) return true; // VMware
  if (lowerMac.startsWith('00:15:5d')) return true; // Hyper-V
  // Virtual adapter name patterns
  const lowerName = (name || '').toLowerCase();
  if (/vethernet|virtual|wsl|docker|vmnet|loopback|npcap|tap|tun|tailscale|zerotier/i.test(lowerName)) return true;
  return false;
}

// Resolve current dynamic network state across Wi-Fi, Ethernet, and routing tables
async function detectDynamicNetwork() {
  const interfaces = os.networkInterfaces();
  const routeIp = await getActiveRouteIp();
  let wifiInfo = null;

  if (process.platform === 'win32') {
    wifiInfo = await getWindowsWifiInfo();
  }

  // 1. If Wi-Fi is actively connected, find the matching IP
  if (wifiInfo && wifiInfo.connected) {
    let wifiIp = null;
    
    // Attempt exact match by MAC address
    if (wifiInfo.mac) {
      for (const [ifName, ifList] of Object.entries(interfaces)) {
        if (!ifList) continue;
        for (const iface of ifList) {
          if (iface.family === 'IPv4' && !iface.internal) {
            const ifMac = (iface.mac || '').toLowerCase();
            if (ifMac === wifiInfo.mac && !isVirtualOrInvalid(iface.address, ifMac, ifName)) {
              wifiIp = iface.address;
              wifiInfo.name = ifName;
              break;
            }
          }
        }
        if (wifiIp) break;
      }
    }

    // Fallback: match by interface name or default route IP
    if (!wifiIp && wifiInfo.name && interfaces[wifiInfo.name]) {
      const match = interfaces[wifiInfo.name].find(i => i.family === 'IPv4' && !i.internal && !isVirtualOrInvalid(i.address, i.mac, wifiInfo.name));
      if (match) wifiIp = match.address;
    }

    if (!wifiIp && routeIp && !isVirtualOrInvalid(routeIp)) {
      wifiIp = routeIp;
    }

    if (wifiIp) {
      return {
        ip: wifiIp,
        ssid: wifiInfo.ssid || 'Wi-Fi Network',
        wifiConnected: true,
        signal: wifiInfo.signal || 'Strong',
        interfaceName: wifiInfo.name || 'Wi-Fi',
        band: wifiInfo.band || '',
        isDynamic: true,
        lastUpdated: new Date().toISOString()
      };
    }
  }

  // 2. Wi-Fi not connected or couldn't resolve Wi-Fi IP: Check active default route IP
  if (routeIp && !isVirtualOrInvalid(routeIp)) {
    let matchedName = 'Local Network';
    for (const [ifName, ifList] of Object.entries(interfaces)) {
      if (ifList && ifList.some(i => i.address === routeIp)) {
        matchedName = ifName;
        break;
      }
    }
    return {
      ip: routeIp,
      ssid: wifiInfo?.ssid || '',
      wifiConnected: !!(wifiInfo && wifiInfo.connected),
      signal: wifiInfo?.signal || '',
      interfaceName: matchedName,
      band: wifiInfo?.band || '',
      isDynamic: true,
      lastUpdated: new Date().toISOString()
    };
  }

  // 3. Fallback: Scan physical interfaces, prioritizing Wi-Fi then physical Ethernet
  const candidates = [];
  for (const [name, ifaceList] of Object.entries(interfaces)) {
    if (!ifaceList) continue;
    for (const iface of ifaceList) {
      if (iface.family === 'IPv4' && !iface.internal && !isVirtualOrInvalid(iface.address, iface.mac, name)) {
        const lowerName = name.toLowerCase();
        let priority = 5;
        if (/wi-fi|wifi|wireless|wlan/i.test(lowerName)) priority = 10;
        else if (/ethernet|eth|en0/i.test(lowerName)) priority = 7;
        candidates.push({ address: iface.address, name, priority });
      }
    }
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => b.priority - a.priority);
    return {
      ip: candidates[0].address,
      ssid: wifiInfo?.ssid || '',
      wifiConnected: !!(wifiInfo && wifiInfo.connected),
      signal: wifiInfo?.signal || '',
      interfaceName: candidates[0].name,
      band: wifiInfo?.band || '',
      isDynamic: true,
      lastUpdated: new Date().toISOString()
    };
  }

  return {
    ip: 'localhost',
    ssid: '',
    wifiConnected: false,
    signal: '',
    interfaceName: 'Loopback',
    band: '',
    isDynamic: true,
    lastUpdated: new Date().toISOString()
  };
}

// Refresh dynamic network info and broadcast if changed
async function refreshDynamicNetwork(forceBroadcast = false) {
  try {
    const detected = await detectDynamicNetwork();
    const fingerprint = `${detected.ip}__${detected.ssid}__${detected.wifiConnected}__${detected.signal}`;
    
    _cachedNetworkInfo = detected;

    if (fingerprint !== _lastNetworkFingerprint || forceBroadcast) {
      _lastNetworkFingerprint = fingerprint;
      console.log(`[Dynamic Wi-Fi] Network state: SSID="${detected.ssid || 'LAN'}", IP=${detected.ip}, Signal=${detected.signal || 'N/A'}`);
      
      if (io) {
        io.emit('network-ip-changed', {
          ip: detected.ip,
          ssid: detected.ssid,
          wifiConnected: detected.wifiConnected,
          signal: detected.signal,
          interfaceName: detected.interfaceName,
          band: detected.band,
          isDynamic: true,
          port: FRONTEND_PORT,
          backendPort: PORT,
          mobileFrontendPort: MOBILE_FRONTEND_PORT
        });
      }
    }
    return detected;
  } catch (err) {
    console.warn('[Dynamic Wi-Fi] Detection error:', err.message);
    return _cachedNetworkInfo;
  }
}

// Synchronous helper for legacy call sites
function getLocalIpAddress() {
  return _cachedNetworkInfo.ip || 'localhost';
}

function getCachedDynamicNetwork() {
  return _cachedNetworkInfo;
}

// High-frequency polling watcher (checks every 2.5 seconds asynchronously)
function startIpWatcher() {
  // Initial immediate detection
  refreshDynamicNetwork(true);
  
  setInterval(() => {
    refreshDynamicNetwork(false);
  }, 2500);
}

// Restaurant profile metadata endpoint
app.get('/api/restaurant', (req, res) => {
  res.json({
    ...activeRestaurant,
    backendPort: PORT,
    frontendPort: FRONTEND_PORT,
    mobileFrontendPort: MOBILE_FRONTEND_PORT,
    lanIp: getLocalIpAddress(),
    wifiInfo: getCachedDynamicNetwork()
  });
});

// Dynamic Network & Wi-Fi IP discovery endpoint for mobile scanners and kiosks
app.get('/api/network-info', async (req, res) => {
  try {
    const force = req.query.refresh === 'true';
    const info = force ? await refreshDynamicNetwork(true) : getCachedDynamicNetwork();
    res.json({
      ...info,
      port: FRONTEND_PORT,
      backendPort: PORT,
      mobileFrontendPort: MOBILE_FRONTEND_PORT,
      restaurant: activeRestaurant
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve network info', message: err.message });
  }
});

app.post('/api/restaurant', (req, res) => {
  const { name, cuisine, tagline, currencySymbol, taxRate, serviceCharge } = req.body || {};
  if (name) activeRestaurant.name = name;
  if (cuisine) activeRestaurant.cuisine = cuisine;
  if (tagline) activeRestaurant.tagline = tagline;
  if (currencySymbol) activeRestaurant.currencySymbol = currencySymbol;
  if (taxRate !== undefined) activeRestaurant.taxRate = Number(taxRate);
  if (serviceCharge !== undefined) activeRestaurant.serviceCharge = Number(serviceCharge);

  if (io) {
    io.emit('restaurant-updated', {
      ...activeRestaurant,
      backendPort: PORT,
      frontendPort: FRONTEND_PORT,
      mobileFrontendPort: MOBILE_FRONTEND_PORT
    });
  }

  res.json({
    success: true,
    restaurant: {
      ...activeRestaurant,
      backendPort: PORT,
      frontendPort: FRONTEND_PORT,
      mobileFrontendPort: MOBILE_FRONTEND_PORT
    }
  });
});

// Network info endpoint for dynamic Kiosk QR code generation
app.get('/api/network-info', async (req, res) => {
  const isRefresh = req.query.refresh === 'true';
  const info = isRefresh ? await refreshDynamicNetwork(true) : getCachedDynamicNetwork();
  res.json({
    ip: info.ip,
    ssid: info.ssid,
    wifiConnected: info.wifiConnected,
    signal: info.signal,
    interfaceName: info.interfaceName,
    band: info.band,
    isDynamic: true,
    port: FRONTEND_PORT,
    backendPort: PORT,
    mobileFrontendPort: MOBILE_FRONTEND_PORT,
    restaurant: {
      ...activeRestaurant,
      backendPort: PORT,
      frontendPort: FRONTEND_PORT,
      mobileFrontendPort: MOBILE_FRONTEND_PORT
    }
  });
});

// Device battery synchronization endpoints
app.get('/api/device-battery', (req, res) => {
  const kioskId = req.query.kioskId;
  if (kioskId && sessionBatteries[kioskId]) {
    return res.json(sessionBatteries[kioskId]);
  }
  res.json({ batteryLevel: null, isCharging: false });
});

app.post('/api/device-battery', (req, res) => {
  const { kioskId, batteryLevel, isCharging } = req.body || {};
  if (kioskId && batteryLevel !== undefined) {
    const numericLevel = Math.max(1, Math.min(100, Math.round(Number(batteryLevel) || 85)));
    sessionBatteries[kioskId] = {
      batteryLevel: numericLevel,
      isCharging: Boolean(isCharging),
      updatedAt: Date.now()
    };
    io.to(kioskId).emit('device-battery-synced', sessionBatteries[kioskId]);
    return res.json({ success: true, battery: sessionBatteries[kioskId] });
  }
  res.status(400).json({ error: 'Missing kioskId or batteryLevel' });
});

// Kitchen and Admin orders list endpoint
app.get('/api/orders', (req, res) => {
  res.json(orders);
});

// Create new order via REST
app.post('/api/orders', async (req, res) => {
  try {
    const payload = req.body;
    const orderId = payload.orderId || payload.id || `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const effectiveItems = payload.items && payload.items.length > 0 ? payload.items : (payload.item ? [payload.item] : []);
    const effectiveCount = payload.itemCount || effectiveItems.reduce((sum, i) => sum + (i.quantity || i.qty || 1), 0);
    const effectiveTotal = payload.totalPrice !== undefined ? payload.totalPrice : (payload.total !== undefined ? payload.total : effectiveItems.reduce((sum, i) => sum + (i.price * (i.quantity || i.qty || 1)), 0));
    
    const newOrder = {
      id: orderId,
      orderId,
      customer: payload.customer || 'Customer',
      orderType: payload.orderType || payload.diningOption || 'Dine-In',
      diningOption: payload.diningOption || payload.orderType || 'Dine-In',
      location: payload.location || payload.tableNumber ? `Table ${payload.tableNumber}` : 'Counter',
      tableId: payload.tableId || payload.location || 'Counter',
      tableNumber: payload.tableNumber || 'Counter',
      kioskId: payload.kioskId || 'COUNTER',
      restaurantId: RESTAURANT_ID,
      items: effectiveItems.map(i => ({
        id: i.id || Math.floor(100 + Math.random() * 900),
        name: i.name,
        qty: i.quantity || i.qty || 1,
        quantity: i.quantity || i.qty || 1,
        price: i.price || 0,
        image: i.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
        emoji: i.emoji || '🍽️',
        tags: i.tags || [],
        customizations: i.customizations || []
      })),
      itemCount: effectiveCount,
      total: effectiveTotal,
      totalPrice: effectiveTotal,
      payment: payload.payment || 'Cash',
      paymentStatus: payload.paymentStatus || 'Pending Cashier',
      status: payload.status || 'New',
      nextStatus: 'Start Preparing',
      stripeColor: '#2563eb',
      priority: 'Normal',
      isWaitAlert: false,
      waitTime: '0 min',
      orderedTags: payload.orderedTags || [],
      allergens: payload.allergens || [],
      note: payload.note || '',
      isAllergy: Array.isArray(payload.allergens) && payload.allergens.length > 0,
      device: payload.device || payload.platform || 'Desktop',
      platform: payload.platform || payload.device || 'Desktop',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      statusHistory: [
        {
          status: payload.status || 'New',
          timestamp: new Date().toISOString(),
          updatedBy: payload.placedBy || 'REST API',
          note: 'Order placed'
        }
      ]
    };

    orders.unshift(newOrder);
    await saveOrdersToDb();

    io.to(`kitchen_${RESTAURANT_ID}`).emit('new-kitchen-order', newOrder);
    io.to(`admin_${RESTAURANT_ID}`).emit('new-kitchen-order', newOrder);
    io.to(`admin_${RESTAURANT_ID}`).emit('new-order', newOrder);
    io.emit('new-kitchen-order', newOrder);
    io.emit('new-order', newOrder);

    res.status(201).json(newOrder);
  } catch (err) {
    console.error('[API] Error creating order:', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Update order status endpoint
app.patch('/api/orders/:orderId/status', async (req, res) => {
  const { orderId } = req.params;
  const { status, updatedBy, note } = req.body;
  const order = orders.find(o => o.orderId === orderId || o.id === orderId);

  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  // Normalize status aliases
  let normalizedStatus = status;
  if (status === 'Order Received') normalizedStatus = 'New';
  if (status === 'Cooking' || status === 'Order Ready' || status === 'Ready') normalizedStatus = 'Ready for Pickup';

  let nextStatus = 'Completed';
  let stripeColor = '#3b82f6';
  if (normalizedStatus === 'New') {
    nextStatus = 'Start Preparing';
    stripeColor = '#2563eb';
  } else if (normalizedStatus === 'Preparing') {
    nextStatus = 'Mark as Ready';
    stripeColor = '#b45309';
  } else if (normalizedStatus === 'Ready for Pickup') {
    nextStatus = 'Mark as Completed';
    stripeColor = '#15803d';
  } else if (normalizedStatus === 'Completed') {
    nextStatus = 'Completed';
    stripeColor = '#059669';
    if (!order.completedAt) order.completedAt = new Date().toISOString();
  } else if (normalizedStatus === 'Cancelled') {
    nextStatus = 'Cancelled';
    stripeColor = '#ef4444';
  }

  order.status = normalizedStatus;
  order.nextStatus = nextStatus;
  order.stripeColor = stripeColor;
  order.updatedAt = new Date().toISOString();

  if (!Array.isArray(order.statusHistory)) {
    order.statusHistory = [];
  }
  const actor = updatedBy || 'Admin (Orders Dashboard)';
  order.statusHistory.push({
    status: normalizedStatus,
    timestamp: order.updatedAt,
    updatedBy: actor,
    note: note || (normalizedStatus === 'Ready for Pickup' ? 'Order ready for customer pickup' : `Status updated to ${normalizedStatus}`)
  });

  await saveOrdersToDb();

  const statusPayload = {
    id: order.id || order.orderId,
    orderId: order.orderId || order.id,
    kioskId: order.kioskId,
    tableNumber: order.tableNumber,
    status: normalizedStatus,
    nextStatus: order.nextStatus,
    stripeColor: order.stripeColor,
    updatedAt: order.updatedAt,
    statusHistory: order.statusHistory,
    order
  };

  if (order.kioskId) {
    io.to(order.kioskId).emit('order-status-updated', statusPayload);
  }
  io.to(`kitchen_${RESTAURANT_ID}`).emit('order-status-updated', statusPayload);
  io.to(`admin_${RESTAURANT_ID}`).emit('order-status-updated', statusPayload);
  io.emit('order-status-updated', statusPayload);

  res.json(order);
});

// Cancel order endpoint
app.post('/api/orders/:orderId/cancel', async (req, res) => {
  const { orderId } = req.params;
  const { reason, cancelledBy } = req.body;
  const order = orders.find(o => o.orderId === orderId || o.id === orderId);

  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  order.status = 'Cancelled';
  order.nextStatus = 'Cancelled';
  order.stripeColor = '#ef4444';
  order.updatedAt = new Date().toISOString();

  if (!Array.isArray(order.statusHistory)) {
    order.statusHistory = [];
  }
  order.statusHistory.push({
    status: 'Cancelled',
    timestamp: order.updatedAt,
    updatedBy: cancelledBy || 'Administrator',
    note: reason || 'Order cancelled by restaurant manager'
  });

  await saveOrdersToDb();

  const statusPayload = {
    id: order.id || order.orderId,
    orderId: order.orderId || order.id,
    kioskId: order.kioskId,
    tableNumber: order.tableNumber,
    status: 'Cancelled',
    nextStatus: 'Cancelled',
    stripeColor: '#ef4444',
    updatedAt: order.updatedAt,
    statusHistory: order.statusHistory,
    order
  };

  if (order.kioskId) {
    io.to(order.kioskId).emit('order-status-updated', statusPayload);
  }
  io.to(`kitchen_${RESTAURANT_ID}`).emit('order-status-updated', statusPayload);
  io.to(`admin_${RESTAURANT_ID}`).emit('order-status-updated', statusPayload);
  io.emit('order-status-updated', statusPayload);

  res.json(order);
});

// Claim order endpoint for Busser runner
app.post('/api/orders/:orderId/claim', (req, res) => {
  const { orderId } = req.params;
  const { busserName } = req.body;
  const order = orders.find(o => o.orderId === orderId);

  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  order.status = 'Out for Delivery';
  order.busserName = busserName || 'Food Runner';
  order.updatedAt = new Date().toISOString();

  const statusPayload = {
    orderId,
    kioskId: order.kioskId,
    tableNumber: order.tableNumber,
    status: order.status,
    busserName: order.busserName,
    updatedAt: order.updatedAt
  };

  if (order.kioskId) {
    io.to(order.kioskId).emit('order-status-updated', statusPayload);
  }
  io.to(`kitchen_${RESTAURANT_ID}`).emit('order-status-updated', statusPayload);
  io.to(`busser_${RESTAURANT_ID}`).emit('order-status-updated', statusPayload);
  io.emit('order-status-updated', statusPayload);

  res.json(order);
});

// Floor tables endpoint
app.get('/api/tables', (req, res) => {
  res.json(restaurantTables);
});

// Update table turnover status
app.patch('/api/tables/:tableNumber/status', (req, res) => {
  const tableNumber = parseInt(req.params.tableNumber, 10);
  const { status } = req.body;
  const table = restaurantTables.find(t => t.tableNumber === tableNumber);

  if (!table) {
    return res.status(404).json({ error: 'Table not found' });
  }

  table.status = status;
  if (status === 'Available') {
    table.lastBussed = new Date().toISOString();
  }

  io.emit('table-status-updated', table);
  res.json(table);
});

// Item availability 86 store endpoint
app.get('/api/availability', (req, res) => {
  res.json(itemAvailability);
});

// Toggle item availability
app.post('/api/availability', (req, res) => {
  const { itemName, isAvailable } = req.body;
  itemAvailability[itemName] = isAvailable;
  io.emit('item-availability-updated', { itemName, isAvailable });
  res.json({ success: true, itemName, isAvailable });
});

// ══════════════════════════════════════════════════════════════════════════
// CUSTOMER-FACING PREFERENCE ENDPOINTS (Active records only, sorted by order)
// ══════════════════════════════════════════════════════════════════════════

// GET /api/preferences/allergens - Active allergens sorted by display_order
app.get('/api/preferences/allergens', async (req, res) => {
  await loadPreferencesFromDb();
  const activeAllergens = (menuPreferences.allergens || [])
    .filter(a => (a.status || (a.active ? 'Active' : 'Inactive')).toLowerCase() === 'active')
    .sort((a, b) => (a.display_order || a.order || 0) - (b.display_order || b.order || 0));
  res.json(activeAllergens);
});

// GET /api/preferences/flavor-preferences - Active flavor preferences sorted by display_order
app.get('/api/preferences/flavor-preferences', async (req, res) => {
  await loadPreferencesFromDb();
  const list = menuPreferences.flavor_preferences || menuPreferences.flavors || [];
  const activeFlavors = list
    .filter(f => (f.status || (f.active ? 'Active' : 'Inactive')).toLowerCase() === 'active')
    .sort((a, b) => (a.display_order || a.order || 0) - (b.display_order || b.order || 0));
  res.json(activeFlavors);
});

// GET /api/preferences - Combined active preferences
app.get('/api/preferences', async (req, res) => {
  await loadPreferencesFromDb();
  const activeAllergens = (menuPreferences.allergens || [])
    .filter(a => (a.status || (a.active ? 'Active' : 'Inactive')).toLowerCase() === 'active')
    .sort((a, b) => (a.display_order || a.order || 0) - (b.display_order || b.order || 0));
  const list = menuPreferences.flavor_preferences || menuPreferences.flavors || [];
  const activeFlavors = list
    .filter(f => (f.status || (f.active ? 'Active' : 'Inactive')).toLowerCase() === 'active')
    .sort((a, b) => (a.display_order || a.order || 0) - (b.display_order || b.order || 0));
  res.json({
    allergens: activeAllergens,
    flavor_preferences: activeFlavors,
    flavors: activeFlavors
  });
});

// ══════════════════════════════════════════════════════════════════════════
// ADMIN PREFERENCE MANAGEMENT ENDPOINTS (Full CRUD + Reordering + Upload)
// ══════════════════════════════════════════════════════════════════════════

// ── Allergens Admin Endpoints ──

// GET /api/admin/preferences/allergens - All allergens (active & inactive)
app.get('/api/admin/preferences/allergens', async (req, res) => {
  await loadPreferencesFromDb();
  const sorted = [...(menuPreferences.allergens || [])]
    .sort((a, b) => (a.display_order || a.order || 0) - (b.display_order || b.order || 0));
  res.json(sorted);
});

// POST /api/admin/preferences/allergens - Create new allergen with duplicate check
app.post('/api/admin/preferences/allergens', async (req, res) => {
  const { name, description, icon_type, emoji, image_url, status, display_order } = req.body || {};
  const trimmedName = (name || '').trim();

  if (!trimmedName) {
    return res.status(400).json({ error: 'Allergen name is required.' });
  }

  // Duplicate name check (case-insensitive)
  const isDuplicate = (menuPreferences.allergens || []).some(
    a => a.name.toLowerCase().trim() === trimmedName.toLowerCase()
  );
  if (isDuplicate) {
    return res.status(400).json({ error: 'This allergen already exists.' });
  }

  const slug = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `allergen-${Date.now()}`;
  const effectiveId = req.body.id || slug;
  const effectiveStatus = (status || 'Active').toLowerCase() === 'active' ? 'Active' : 'Inactive';
  const effectiveOrder = parseInt(display_order, 10) || (menuPreferences.allergens.length + 1);

  const newAllergen = {
    id: effectiveId,
    name: trimmedName,
    label: trimmedName,
    description: (description || '').trim(),
    icon_type: icon_type === 'image' ? 'image' : 'emoji',
    emoji: icon_type === 'image' ? '' : (emoji || '🥜'),
    image_url: icon_type === 'image' ? (image_url || '') : '',
    image: icon_type === 'image' ? (image_url || '') : '',
    status: effectiveStatus,
    active: effectiveStatus === 'Active',
    display_order: effectiveOrder,
    order: effectiveOrder,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  menuPreferences.allergens.push(newAllergen);
  await savePreferencesToDb();

  io.emit('menu-preferences-updated', {
    allergens: menuPreferences.allergens,
    flavor_preferences: menuPreferences.flavor_preferences || menuPreferences.flavors || []
  });

  res.status(201).json(newAllergen);
});

// PUT /api/admin/preferences/allergens/:id - Update allergen
app.put('/api/admin/preferences/allergens/:id', async (req, res) => {
  const { id } = req.params;
  const allergenIndex = (menuPreferences.allergens || []).findIndex(a => a.id === id);

  if (allergenIndex === -1) {
    return res.status(404).json({ error: 'Allergen not found.' });
  }

  const { name, description, icon_type, emoji, image_url, status, display_order } = req.body || {};
  const trimmedName = (name !== undefined ? name : menuPreferences.allergens[allergenIndex].name).trim();

  // Duplicate name check (excluding current item)
  const isDuplicate = (menuPreferences.allergens || []).some(
    a => a.id !== id && a.name.toLowerCase().trim() === trimmedName.toLowerCase()
  );
  if (isDuplicate) {
    return res.status(400).json({ error: 'This allergen already exists.' });
  }

  const prev = menuPreferences.allergens[allergenIndex];
  const effectiveStatus = status !== undefined ? (status.toLowerCase() === 'active' ? 'Active' : 'Inactive') : prev.status;
  const effectiveOrder = display_order !== undefined ? parseInt(display_order, 10) : prev.display_order;

  const updatedAllergen = {
    ...prev,
    name: trimmedName,
    label: trimmedName,
    description: description !== undefined ? description.trim() : prev.description,
    icon_type: icon_type !== undefined ? icon_type : prev.icon_type,
    emoji: icon_type === 'image' ? '' : (emoji !== undefined ? emoji : prev.emoji),
    image_url: icon_type === 'image' ? (image_url !== undefined ? image_url : prev.image_url) : '',
    image: icon_type === 'image' ? (image_url !== undefined ? image_url : prev.image_url) : '',
    status: effectiveStatus,
    active: effectiveStatus === 'Active',
    display_order: effectiveOrder,
    order: effectiveOrder,
    updated_at: new Date().toISOString()
  };

  menuPreferences.allergens[allergenIndex] = updatedAllergen;
  await savePreferencesToDb();

  io.emit('menu-preferences-updated', {
    allergens: menuPreferences.allergens,
    flavor_preferences: menuPreferences.flavor_preferences || menuPreferences.flavors || []
  });

  res.json(updatedAllergen);
});

// DELETE /api/admin/preferences/allergens/:id - Safe deletion
app.delete('/api/admin/preferences/allergens/:id', async (req, res) => {
  const { id } = req.params;
  const allergen = (menuPreferences.allergens || []).find(a => a.id === id);

  if (!allergen) {
    return res.status(404).json({ error: 'Allergen not found.' });
  }

  menuPreferences.allergens = menuPreferences.allergens.filter(a => a.id !== id);
  // Re-index display orders
  menuPreferences.allergens.forEach((a, idx) => {
    a.display_order = idx + 1;
    a.order = idx + 1;
  });

  await savePreferencesToDb();

  io.emit('menu-preferences-updated', {
    allergens: menuPreferences.allergens,
    flavor_preferences: menuPreferences.flavor_preferences || menuPreferences.flavors || []
  });

  res.json({ success: true, message: `Allergen "${allergen.name}" deleted successfully.` });
});

// ── Flavor Preferences Admin Endpoints ──

// GET /api/admin/preferences/flavor-preferences - All flavor preferences
app.get('/api/admin/preferences/flavor-preferences', (req, res) => {
  const list = menuPreferences.flavor_preferences || menuPreferences.flavors || [];
  const sorted = [...list].sort((a, b) => (a.display_order || a.order || 0) - (b.display_order || b.order || 0));
  res.json(sorted);
});

// POST /api/admin/preferences/flavor-preferences - Create new flavor preference
app.post('/api/admin/preferences/flavor-preferences', async (req, res) => {
  const list = menuPreferences.flavor_preferences || menuPreferences.flavors || [];
  const { name, description, icon_type, emoji, image_url, status, display_order } = req.body || {};
  const trimmedName = (name || '').trim();

  if (!trimmedName) {
    return res.status(400).json({ error: 'Flavor preference name is required.' });
  }

  // Duplicate name check (case-insensitive)
  const isDuplicate = list.some(
    f => f.name.toLowerCase().trim() === trimmedName.toLowerCase()
  );
  if (isDuplicate) {
    return res.status(400).json({ error: 'This preference already exists.' });
  }

  const slug = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `flavor-${Date.now()}`;
  const effectiveId = req.body.id || slug;
  const effectiveStatus = (status || 'Active').toLowerCase() === 'active' ? 'Active' : 'Inactive';
  const effectiveOrder = parseInt(display_order, 10) || (list.length + 1);

  const newFlavor = {
    id: effectiveId,
    name: trimmedName,
    label: trimmedName,
    description: (description || '').trim(),
    icon_type: icon_type === 'image' ? 'image' : 'emoji',
    emoji: icon_type === 'image' ? '' : (emoji || '🔥'),
    image_url: icon_type === 'image' ? (image_url || '') : '',
    image: icon_type === 'image' ? (image_url || '') : '',
    status: effectiveStatus,
    active: effectiveStatus === 'Active',
    display_order: effectiveOrder,
    order: effectiveOrder,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  list.push(newFlavor);
  menuPreferences.flavor_preferences = list;
  menuPreferences.flavors = list;
  await savePreferencesToDb();

  io.emit('menu-preferences-updated', {
    allergens: menuPreferences.allergens,
    flavor_preferences: menuPreferences.flavor_preferences
  });

  res.status(201).json(newFlavor);
});

// PUT /api/admin/preferences/flavor-preferences/:id - Update flavor preference
app.put('/api/admin/preferences/flavor-preferences/:id', async (req, res) => {
  const { id } = req.params;
  const list = menuPreferences.flavor_preferences || menuPreferences.flavors || [];
  const flavorIndex = list.findIndex(f => f.id === id);

  if (flavorIndex === -1) {
    return res.status(404).json({ error: 'Flavor preference not found.' });
  }

  const { name, description, icon_type, emoji, image_url, status, display_order } = req.body || {};
  const trimmedName = (name !== undefined ? name : list[flavorIndex].name).trim();

  // Duplicate name check (excluding current item)
  const isDuplicate = list.some(
    f => f.id !== id && f.name.toLowerCase().trim() === trimmedName.toLowerCase()
  );
  if (isDuplicate) {
    return res.status(400).json({ error: 'This preference already exists.' });
  }

  const prev = list[flavorIndex];
  const effectiveStatus = status !== undefined ? (status.toLowerCase() === 'active' ? 'Active' : 'Inactive') : prev.status;
  const effectiveOrder = display_order !== undefined ? parseInt(display_order, 10) : prev.display_order;

  const updatedFlavor = {
    ...prev,
    name: trimmedName,
    label: trimmedName,
    description: description !== undefined ? description.trim() : prev.description,
    icon_type: icon_type !== undefined ? icon_type : prev.icon_type,
    emoji: icon_type === 'image' ? '' : (emoji !== undefined ? emoji : prev.emoji),
    image_url: icon_type === 'image' ? (image_url !== undefined ? image_url : prev.image_url) : '',
    image: icon_type === 'image' ? (image_url !== undefined ? image_url : prev.image_url) : '',
    status: effectiveStatus,
    active: effectiveStatus === 'Active',
    display_order: effectiveOrder,
    order: effectiveOrder,
    updated_at: new Date().toISOString()
  };

  list[flavorIndex] = updatedFlavor;
  menuPreferences.flavor_preferences = list;
  menuPreferences.flavors = list;
  await savePreferencesToDb();

  io.emit('menu-preferences-updated', {
    allergens: menuPreferences.allergens,
    flavor_preferences: menuPreferences.flavor_preferences
  });

  res.json(updatedFlavor);
});

// DELETE /api/admin/preferences/flavor-preferences/:id - Safe deletion
app.delete('/api/admin/preferences/flavor-preferences/:id', async (req, res) => {
  const { id } = req.params;
  const list = menuPreferences.flavor_preferences || menuPreferences.flavors || [];
  const flavor = list.find(f => f.id === id);

  if (!flavor) {
    return res.status(404).json({ error: 'Flavor preference not found.' });
  }

  const filtered = list.filter(f => f.id !== id);
  // Re-index display orders
  filtered.forEach((f, idx) => {
    f.display_order = idx + 1;
    f.order = idx + 1;
  });

  menuPreferences.flavor_preferences = filtered;
  menuPreferences.flavors = filtered;
  await savePreferencesToDb();

  io.emit('menu-preferences-updated', {
    allergens: menuPreferences.allergens,
    flavor_preferences: menuPreferences.flavor_preferences
  });

  res.json({ success: true, message: `Flavor preference "${flavor.name}" deleted successfully.` });
});

// POST /api/admin/preferences/reorder - Reorder items
app.post('/api/admin/preferences/reorder', async (req, res) => {
  const { type, items } = req.body || {};
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'Invalid items array for reordering.' });
  }

  if (type === 'allergens') {
    const map = new Map(items.map((it, idx) => [it.id, idx + 1]));
    menuPreferences.allergens.forEach(a => {
      if (map.has(a.id)) {
        a.display_order = map.get(a.id);
        a.order = a.display_order;
      }
    });
    menuPreferences.allergens.sort((a, b) => a.display_order - b.display_order);
  } else {
    const list = menuPreferences.flavor_preferences || menuPreferences.flavors || [];
    const map = new Map(items.map((it, idx) => [it.id, idx + 1]));
    list.forEach(f => {
      if (map.has(f.id)) {
        f.display_order = map.get(f.id);
        f.order = f.display_order;
      }
    });
    list.sort((a, b) => a.display_order - b.display_order);
    menuPreferences.flavor_preferences = list;
    menuPreferences.flavors = list;
  }

  await savePreferencesToDb();

  io.emit('menu-preferences-updated', {
    allergens: menuPreferences.allergens,
    flavor_preferences: menuPreferences.flavor_preferences || menuPreferences.flavors || []
  });

  res.json({ success: true, allergens: menuPreferences.allergens, flavor_preferences: menuPreferences.flavor_preferences });
});

// POST /api/admin/upload-icon - Upload image icon with validation
app.post('/api/admin/upload-icon', (req, res) => {
  const { dataUrl, filename } = req.body || {};
  if (!dataUrl) {
    return res.status(400).json({ error: 'No image data provided.' });
  }

  // Validate allowed formats: PNG, JPG, JPEG, WEBP
  const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,/i);
  if (!match && !dataUrl.startsWith('http')) {
    return res.status(400).json({ error: 'Invalid image format. Only PNG, JPG, JPEG, and WEBP are supported.' });
  }

  // Validate size (< 3MB)
  if (dataUrl.length > 4 * 1024 * 1024) {
    return res.status(400).json({ error: 'Image file size too large. Maximum size is 3MB.' });
  }

  res.json({
    success: true,
    image_url: dataUrl,
    filename: filename || 'custom_icon'
  });
});

// POST /api/upload-image - Upload and save product or beverage image
app.post('/api/upload-image', async (req, res) => {
  try {
    const { image, dataUrl, filename } = req.body || {};
    const imgData = image || dataUrl;
    if (!imgData) {
      return res.status(400).json({ error: 'No image data provided.' });
    }

    // Direct external URL passthrough
    if (typeof imgData === 'string' && (imgData.startsWith('http://') || imgData.startsWith('https://') || imgData.startsWith('/api/uploads/'))) {
      return res.json({ success: true, url: imgData, filename: filename || 'external_image' });
    }

    // Base64 data URL saving to disk
    const match = typeof imgData === 'string' && imgData.match(/^data:image\/(png|jpeg|jpg|webp|gif);base64,(.+)$/i);
    if (match) {
      const ext = match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
      const base64Data = match[2];
      const safeName = `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const filePath = path.join(UPLOADS_DIR, safeName);
      await fs.writeFile(filePath, Buffer.from(base64Data, 'base64'));
      console.log(`[Upload] Saved image to ${filePath} as ${safeName}`);
      return res.json({
        success: true,
        url: `/api/uploads/${safeName}`,
        filename: safeName
      });
    }

    return res.status(400).json({ error: 'Invalid or unsupported image data format.' });
  } catch (error) {
    console.error('[Upload] Failed to process image:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// ══════════════════════════════════════════════════════════════════════════
// PROMOTIONS & DISCOUNTS ENDPOINTS (Expiration, Archive, Restoration & Live Sync)
// ══════════════════════════════════════════════════════════════════════════
const PROMOS_FILE = path.join(__dirname, 'data', 'promos.json');
let promosList = [];
const retiredCodesSet = new Set();

// Helper to determine exact expiration timestamp in milliseconds
function getPromoExpiresAt(promo) {
  if (promo.expiresAt) {
    const t = new Date(promo.expiresAt).getTime();
    if (!isNaN(t)) return t;
  }
  if (promo.dateRange) {
    const parts = String(promo.dateRange).split(/–|-|to/i);
    if (parts.length >= 2) {
      const endStr = parts[parts.length - 1].trim();
      const d = new Date(endStr);
      if (!isNaN(d.getTime())) {
        d.setHours(23, 59, 59, 999);
        return d.getTime();
      }
    }
  }
  return null;
}

// Background & On-Demand Automatic Expiration Processor
function checkAndExpirePromos() {
  const now = Date.now();
  let hasChanges = false;

  for (const promo of promosList) {
    // Populate retired codes blacklist
    if (Array.isArray(promo.retiredCodes)) {
      promo.retiredCodes.forEach(c => {
        if (c) retiredCodesSet.add(c.trim().toUpperCase());
      });
    }

    if (promo.status === 'active' || promo.status === 'scheduled') {
      const expTime = getPromoExpiresAt(promo);
      const isTimeExpired = expTime && now >= expTime;
      const isRedemptionsReached = promo.maxRedemptions && promo.currentRedemptions >= promo.maxRedemptions;
      if (isTimeExpired || isRedemptionsReached) {
        promo.status = 'expired';
        promo.expiredAt = promo.expiredAt || now;
        promo.expiredReason = isRedemptionsReached
          ? `Automatic expiration: maximum redemptions limit (${promo.maxRedemptions}) reached`
          : 'Automatic expiration: date and time reached';
        if (!promo.originalCode) {
          promo.originalCode = promo.code;
        }
        retiredCodesSet.add(promo.code.trim().toUpperCase());
        if (promo.originalCode) {
          retiredCodesSet.add(promo.originalCode.trim().toUpperCase());
        }
        hasChanges = true;
        console.log(`[Promos] Auto-expired promo "${promo.name}" [${promo.code}] at ${new Date(now).toISOString()}`);
      }
    } else if (promo.status === 'expired') {
      if (promo.code) retiredCodesSet.add(promo.code.trim().toUpperCase());
      if (promo.originalCode) retiredCodesSet.add(promo.originalCode.trim().toUpperCase());
    }
  }

  if (hasChanges) {
    savePromosToDb();
    io.emit('promos-updated', promosList);
  }
  return hasChanges;
}

async function loadPromosFromDb() {
  try {
    const raw = await fs.readFile(PROMOS_FILE, 'utf8');
    const data = JSON.parse(raw);
    if (Array.isArray(data)) {
      promosList = data;
      console.log(`[DB] Promos loaded: ${promosList.length} promotions from data/promos.json`);
      checkAndExpirePromos();
      return;
    }
  } catch (err) {
    console.warn('[DB] Could not load promos.json:', err.message);
  }
}

async function savePromosToDb() {
  try {
    await fs.writeFile(PROMOS_FILE, JSON.stringify(promosList, null, 2), 'utf8');
  } catch (err) {
    console.error('[DB] Failed to save promos.json:', err);
  }
}

loadPromosFromDb();

// Periodic timer to auto-expire promos while server is running
setInterval(() => {
  try {
    checkAndExpirePromos();
  } catch (err) {
    console.error('[Promos] Error during periodic expiration check:', err);
  }
}, 3000);

// GET /api/promos - Retrieve all promotions (runs expiration check first)
app.get('/api/promos', (req, res) => {
  checkAndExpirePromos();
  res.json(promosList);
});

// GET /api/promos/expired - Retrieve only expired promotions for admin archive
app.get('/api/promos/expired', (req, res) => {
  checkAndExpirePromos();
  const expired = promosList.filter(p => p.status === 'expired');
  res.json(expired);
});

// GET & POST /api/promos/validate/:code - Validate a promo code from a link, QR code, or checkout input
const handleValidatePromo = (req, res) => {
  checkAndExpirePromos();
  const codeParam = (req.params.code || req.body.code || '').trim().toUpperCase();
  if (!codeParam) {
    return res.status(400).json({ valid: false, error: 'Promo code parameter required.' });
  }

  // 1. Check if the code is in the retired/expired codes blacklist
  if (retiredCodesSet.has(codeParam)) {
    const matchedRecord = promosList.find(p =>
      p.code?.toUpperCase() === codeParam ||
      p.originalCode?.toUpperCase() === codeParam ||
      (Array.isArray(p.retiredCodes) && p.retiredCodes.map(c => c.toUpperCase()).includes(codeParam))
    );
    return res.status(400).json({
      valid: false,
      status: 'expired',
      error: `Promotion code "${codeParam}" has reached its expiration date and is no longer valid. Old or expired links and QR codes cannot be reused.`,
      promo: matchedRecord || null
    });
  }

  // 2. Find matching active promo
  const promo = promosList.find(p => p.code?.toUpperCase() === codeParam);
  if (!promo) {
    return res.status(404).json({
      valid: false,
      error: `Promotion code "${codeParam}" was not found.`
    });
  }

  // 3. Check status
  if (promo.status === 'expired') {
    return res.status(400).json({
      valid: false,
      status: 'expired',
      error: `Promotion "${promo.name}" [${codeParam}] has expired and is no longer valid.`,
      promo
    });
  }

  if (promo.status !== 'active') {
    return res.status(400).json({
      valid: false,
      status: promo.status,
      error: `Promotion "${promo.name}" is currently ${promo.status}.`,
      promo
    });
  }

  // 4. Check date expiration
  const expTime = getPromoExpiresAt(promo);
  if (expTime && Date.now() >= expTime) {
    checkAndExpirePromos();
    return res.status(400).json({
      valid: false,
      status: 'expired',
      error: `Promotion code "${codeParam}" has reached its expiration date and is no longer valid.`,
      promo
    });
  }

  return res.json({ valid: true, promo });
};

app.get('/api/promos/validate/:code', handleValidatePromo);
app.post('/api/promos/validate', handleValidatePromo);

// POST /api/promos - Create new promotion
app.post('/api/promos', async (req, res) => {
  try {
    checkAndExpirePromos();
    const p = req.body || {};
    if (!p.name || !p.code) {
      return res.status(400).json({ error: 'Promo name and code are required.' });
    }
    const cleanCode = p.code.trim().toUpperCase().replace(/\s/g, '');

    // Prevent reusing previously retired/expired codes
    if (retiredCodesSet.has(cleanCode)) {
      return res.status(400).json({
        error: `Code "${cleanCode}" was previously used and retired. Expired codes can never be reused. Please provide a new unique code.`
      });
    }

    // Check for collision with existing promos
    const duplicate = promosList.find(x => x.code?.toUpperCase() === cleanCode);
    if (duplicate) {
      return res.status(400).json({
        error: `Promo code "${cleanCode}" is already in use by campaign "${duplicate.name}".`
      });
    }

    const defaultExpiresAt = p.expiresAt
      ? new Date(p.expiresAt).toISOString()
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    const newPromo = {
      id: p.id || `PR-${Date.now().toString().slice(-4)}`,
      name: p.name.trim(),
      code: cleanCode,
      originalCode: cleanCode,
      discountType: p.discountType || 'percent',
      discountValue: Number(p.discountValue) || 15,
      discountLabel: p.discountLabel || (p.discountType === 'percent' ? `${p.discountValue}% Off (Automatic)` : `₱${p.discountValue} Off`),
      targetLabel: p.targetLabel || (p.applyToAll ? 'All Menu Items' : (p.applicableItems && p.applicableItems.length > 0 ? p.applicableItems.slice(0, 2).join(', ') : 'Selected Items')),
      associatedItem: p.associatedItem || (p.applyToAll ? 'All Menu Items' : (p.applicableItems && p.applicableItems.length > 0 ? p.applicableItems.join(', ') : 'Selected Items')),
      associatedTable: p.associatedTable || 'All Tables (Storewide)',
      dateRange: p.dateRange || 'Jan 1, 2025 – Dec 31, 2026',
      expiresAt: defaultExpiresAt,
      maxRedemptions: Number(p.maxRedemptions) || 500,
      currentRedemptions: Number(p.currentRedemptions) || 0,
      status: p.status || 'active',
      type: p.type || 'discount',
      bannerTitle: p.bannerTitle || p.name.trim().toUpperCase().slice(0, 24),
      bannerHighlight: p.bannerHighlight || (p.discountType === 'percent' ? `${p.discountValue}% OFF` : `₱${p.discountValue} OFF`),
      bannerSubtitle: p.bannerSubtitle || '',
      bannerImage: p.bannerImage || '/ramen_promo_banner.png',
      bannerBg: p.bannerBg || '#8c2411',
      applicableItems: Array.isArray(p.applicableItems) ? p.applicableItems : [],
      applyToAll: !!p.applyToAll,
      createdAt: p.createdAt || Date.now(),
      retiredCodes: []
    };

    promosList.push(newPromo);
    await savePromosToDb();
    io.emit('promos-updated', promosList);
    res.json({ success: true, promo: newPromo, promos: promosList });
  } catch (err) {
    console.error('[Promos] Error creating promo:', err);
    res.status(500).json({ error: 'Failed to create promotion' });
  }
});

// PUT /api/promos/:id - Update existing promotion
app.put('/api/promos/:id', async (req, res) => {
  try {
    checkAndExpirePromos();
    const { id } = req.params;
    const updates = req.body || {};
    const idx = promosList.findIndex(p => p.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Promotion not found' });
    }

    if (updates.code) {
      const cleanCode = updates.code.trim().toUpperCase().replace(/\s/g, '');
      if (cleanCode !== promosList[idx].code) {
        if (retiredCodesSet.has(cleanCode)) {
          return res.status(400).json({
            error: `Code "${cleanCode}" was previously used and retired. Expired codes can never be reused.`
          });
        }
        const duplicate = promosList.find(x => x.id !== id && x.code?.toUpperCase() === cleanCode);
        if (duplicate) {
          return res.status(400).json({
            error: `Promo code "${cleanCode}" is already in use by campaign "${duplicate.name}".`
          });
        }
      }
      updates.code = cleanCode;
    }

    promosList[idx] = {
      ...promosList[idx],
      ...updates,
      id,
      updatedAt: Date.now()
    };

    // If updated expiration date is now in the past or status set to expired
    checkAndExpirePromos();

    await savePromosToDb();
    io.emit('promos-updated', promosList);
    res.json({ success: true, promo: promosList[idx], promos: promosList });
  } catch (err) {
    console.error('[Promos] Error updating promo:', err);
    res.status(500).json({ error: 'Failed to update promotion' });
  }
});

// POST /api/promos/expire/:id - Manually mark a promo as Expired
app.post('/api/promos/expire/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const idx = promosList.findIndex(p => p.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Promotion not found' });
    }

    const promo = promosList[idx];
    const oldCode = promo.code.trim().toUpperCase();
    retiredCodesSet.add(oldCode);

    promo.status = 'expired';
    promo.expiredAt = Date.now();
    promo.expiredReason = req.body?.reason || 'Expired by Administrator';
    if (!promo.originalCode) {
      promo.originalCode = oldCode;
    }
    if (!Array.isArray(promo.retiredCodes)) {
      promo.retiredCodes = [];
    }
    if (!promo.retiredCodes.includes(oldCode)) {
      promo.retiredCodes.push(oldCode);
    }

    await savePromosToDb();
    io.emit('promos-updated', promosList);
    console.log(`[Promos] Admin manually expired promo "${promo.name}" [${oldCode}]`);
    res.json({ success: true, message: `Promo "${promo.name}" marked as expired.`, promo, promos: promosList });
  } catch (err) {
    console.error('[Promos] Error expiring promo:', err);
    res.status(500).json({ error: 'Failed to expire promotion' });
  }
});

// POST /api/promos/restore - Restore an expired promo with a new unique code and new expiration date
app.post('/api/promos/restore', async (req, res) => {
  try {
    const { promoId, newCode, newExpiresAt, newDateRange, restoredBy } = req.body || {};
    if (!promoId || !newCode || !newExpiresAt) {
      return res.status(400).json({ error: 'promoId, newCode, and newExpiresAt are required.' });
    }

    const idx = promosList.findIndex(p => p.id === promoId);
    if (idx === -1) {
      return res.status(404).json({ error: 'Promotion record not found.' });
    }

    const promo = promosList[idx];
    if (promo.status !== 'expired') {
      return res.status(400).json({ error: `Promotion "${promo.name}" is not expired (${promo.status}).` });
    }

    // Validate new expiration date is in the future
    const expDate = new Date(newExpiresAt);
    if (isNaN(expDate.getTime()) || expDate.getTime() <= Date.now()) {
      return res.status(400).json({ error: 'New expiration date must be a valid future date and time.' });
    }

    // Validate clean new code
    const cleanNewCode = newCode.trim().toUpperCase().replace(/\s/g, '');
    if (!cleanNewCode) {
      return res.status(400).json({ error: 'A valid new unique code is required.' });
    }

    const oldCode = promo.code.trim().toUpperCase();

    // Enforce that old expired code can NEVER be reused
    if (cleanNewCode === oldCode) {
      return res.status(400).json({
        error: `Cannot reuse old expired code "${oldCode}". A new unique code must be generated.`
      });
    }

    if (promo.originalCode && cleanNewCode === promo.originalCode.toUpperCase()) {
      return res.status(400).json({
        error: `Cannot reuse original expired code "${promo.originalCode}". A new unique code must be generated.`
      });
    }

    if (retiredCodesSet.has(cleanNewCode)) {
      return res.status(400).json({
        error: `Code "${cleanNewCode}" was previously used and retired. Expired codes cannot be reused.`
      });
    }

    // Ensure no collision with another active promo
    const duplicate = promosList.find(x => x.id !== promoId && x.code?.toUpperCase() === cleanNewCode);
    if (duplicate) {
      return res.status(400).json({
        error: `Code "${cleanNewCode}" is already active in campaign "${duplicate.name}".`
      });
    }

    // Permanently retire old code
    retiredCodesSet.add(oldCode);
    if (!promo.originalCode) {
      promo.originalCode = oldCode;
    }
    if (!Array.isArray(promo.retiredCodes)) {
      promo.retiredCodes = [];
    }
    if (!promo.retiredCodes.includes(oldCode)) {
      promo.retiredCodes.push(oldCode);
    }

    // Apply restoration
    promo.code = cleanNewCode;
    promo.status = 'active';
    promo.expiresAt = expDate.toISOString();
    promo.dateRange = newDateRange || `Restored – ${expDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    promo.restoredAt = Date.now();
    promo.restoredBy = (restoredBy || 'Administrator').trim();
    promo.restoredFromCode = oldCode;
    promo.updatedAt = Date.now();

    // Clear expired markers
    delete promo.expiredAt;
    delete promo.expiredReason;

    await savePromosToDb();
    io.emit('promos-updated', promosList);

    console.log(`[Promos] Successfully restored promo "${promo.name}": Old Code "${oldCode}" retired, New Code "${cleanNewCode}" active until ${expDate.toISOString()} by ${promo.restoredBy}`);

    res.json({
      success: true,
      message: `Promotion "${promo.name}" successfully restored! New code "${cleanNewCode}" is now active. Old code "${oldCode}" is permanently retired.`,
      promo,
      promos: promosList
    });
  } catch (err) {
    console.error('[Promos] Error restoring promo:', err);
    res.status(500).json({ error: 'Failed to restore promotion' });
  }
});

// DELETE /api/promos/:id - Delete promotion
app.delete('/api/promos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const promo = promosList.find(p => p.id === id);
    if (promo) {
      if (promo.code) retiredCodesSet.add(promo.code.trim().toUpperCase());
      if (promo.originalCode) retiredCodesSet.add(promo.originalCode.trim().toUpperCase());
    }
    promosList = promosList.filter(p => p.id !== id);
    await savePromosToDb();
    io.emit('promos-updated', promosList);
    res.json({ success: true, promos: promosList });
  } catch (err) {
    console.error('[Promos] Error deleting promo:', err);
    res.status(500).json({ error: 'Failed to delete promotion' });
  }
});

// POST /api/promos/redeem - Redeem promotion code
app.post('/api/promos/redeem', async (req, res) => {
  try {
    checkAndExpirePromos();
    const { promoCode, orderId, discountAmount } = req.body || {};
    if (!promoCode) {
      return res.status(400).json({ error: 'Promo code required' });
    }
    const cleanCode = promoCode.trim().toUpperCase();

    // Check if code was retired or expired
    if (retiredCodesSet.has(cleanCode)) {
      return res.status(400).json({
        error: `Promotion code "${cleanCode}" has expired and is no longer valid. Old codes cannot be redeemed.`
      });
    }

    const promo = promosList.find(p => p.code === cleanCode);
    if (!promo) {
      return res.status(404).json({ error: 'Promotion code not found' });
    }

    if (promo.status === 'expired') {
      return res.status(400).json({ error: `Promotion code "${cleanCode}" has expired and is no longer valid.` });
    }

    if (promo.status !== 'active') {
      return res.status(400).json({ error: `Promotion is ${promo.status}, cannot be redeemed.` });
    }

    // Check date expiration
    const expTime = getPromoExpiresAt(promo);
    if (expTime && Date.now() >= expTime) {
      checkAndExpirePromos();
      return res.status(400).json({ error: `Promotion code "${cleanCode}" has reached its expiration date and is no longer valid.` });
    }

    const maxRedemptions = Number(promo.maxRedemptions) || 500;
    const currentRedemptions = Number(promo.currentRedemptions) || 0;
    if (currentRedemptions >= maxRedemptions) {
      return res.status(400).json({ error: 'Promotion has reached maximum redemption limit.' });
    }

    promo.currentRedemptions = currentRedemptions + 1;
    promo.revenueImpact = (Number(promo.revenueImpact) || 0) + (Number(discountAmount) || 0);
    promo.lastRedeemedAt = Date.now();
    promo.lastOrderId = orderId || null;

    if (promo.currentRedemptions >= maxRedemptions) {
      promo.status = 'expired';
      promo.expiredAt = Date.now();
      promo.expiredReason = 'Maximum redemptions limit reached';
      retiredCodesSet.add(promo.code.toUpperCase());
    }

    await savePromosToDb();
    io.emit('promos-updated', promosList);
    res.json({ success: true, promo, currentRedemptions: promo.currentRedemptions });
  } catch (err) {
    console.error('[Promos] Error redeeming promo:', err);
    res.status(500).json({ error: 'Failed to redeem promotion' });
  }
});

// ══════════════════════════════════════════════════════════════════════════
// ADMIN AUTHENTICATION, PASSWORD MANAGEMENT & SESSION LOCK ENDPOINTS
// ══════════════════════════════════════════════════════════════════════════

// GET /api/admin/auth-status - Status of admin credentials
app.get('/api/admin/auth-status', (req, res) => {
  res.json({
    email: adminAuthData.email,
    name: adminAuthData.name,
    role: adminAuthData.role,
    updated_at: adminAuthData.updated_at,
    has_custom_password: adminAuthData.updated_at !== '2026-09-20T14:00:00.000Z'
  });
});

// POST /api/admin/login - Authenticate admin against stored PBKDF2 hash
app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Please provide both administrator email and password.' });
  }

  if (email.trim().toLowerCase() !== adminAuthData.email.toLowerCase()) {
    return res.status(401).json({ error: 'Access Denied: Invalid administrator email or unauthorized user.' });
  }

  const computedHash = hashPassword(password, adminAuthData.salt);
  if (computedHash !== adminAuthData.hash) {
    return res.status(401).json({ error: 'Access Denied: Incorrect administrator password.' });
  }

  res.json({
    success: true,
    token: adminAuthData.session_token,
    user: {
      email: adminAuthData.email,
      name: adminAuthData.name,
      role: adminAuthData.role
    }
  });
});

// POST /api/admin/change-password - Secure password change with strong validation
app.post('/api/admin/change-password', async (req, res) => {
  const { email, currentPassword, newPassword, confirmPassword, invalidateSessions } = req.body || {};

  if (!currentPassword) {
    return res.status(400).json({ error: 'Current password is required.' });
  }
  if (!newPassword) {
    return res.status(400).json({ error: 'New password is required.' });
  }

  // 1. Validate authorized admin email
  if (email && email.trim().toLowerCase() !== adminAuthData.email.toLowerCase()) {
    return res.status(403).json({ error: 'Unauthorized: Only the authorized admin account can change the Admin Panel password.' });
  }

  // 2. Validate current password
  const currentHash = hashPassword(currentPassword, adminAuthData.salt);
  if (currentHash !== adminAuthData.hash) {
    return res.status(400).json({ error: 'Incorrect current password. Please verify your current credentials.' });
  }

  // 3. Confirm password matching
  if (confirmPassword !== undefined && newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'Confirmation password does not match new password.' });
  }

  // 4. Enforce strong password requirements:
  // - Minimum 8 characters
  // - At least 1 uppercase letter
  // - At least 1 lowercase letter
  // - At least 1 number
  // - At least 1 special character
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
  }
  if (!/[A-Z]/.test(newPassword)) {
    return res.status(400).json({ error: 'Password must contain at least one uppercase letter (A-Z).' });
  }
  if (!/[a-z]/.test(newPassword)) {
    return res.status(400).json({ error: 'Password must contain at least one lowercase letter (a-z).' });
  }
  if (!/[0-9]/.test(newPassword)) {
    return res.status(400).json({ error: 'Password must contain at least one numeric digit (0-9).' });
  }
  if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?~`]/.test(newPassword)) {
    return res.status(400).json({ error: 'Password must contain at least one special character (!@#$%^&* etc.).' });
  }

  if (newPassword === currentPassword) {
    return res.status(400).json({ error: 'New password must be different from the current password.' });
  }

  // 5. Securely hash with cryptographic random salt
  const newSalt = crypto.randomBytes(16).toString('hex');
  const newHash = hashPassword(newPassword, newSalt);
  const newSessionToken = crypto.randomBytes(32).toString('hex');

  adminAuthData.salt = newSalt;
  adminAuthData.hash = newHash;
  adminAuthData.session_token = newSessionToken;
  adminAuthData.updated_at = new Date().toISOString();

  await fs.writeFile(AUTH_FILE, JSON.stringify(adminAuthData, null, 2), 'utf8');
  console.log('[Auth] Admin password successfully updated and securely hashed.');

  // 6. Invalidate existing sessions across other devices/tabs if requested
  if (invalidateSessions) {
    io.emit('admin-session-invalidated', {
      message: 'Admin security credentials updated. Active sessions have been locked.',
      timestamp: adminAuthData.updated_at
    });
  }

  res.json({
    success: true,
    message: 'Admin password successfully updated and securely encrypted.',
    token: newSessionToken,
    updated_at: adminAuthData.updated_at
  });
});

// POST /api/admin/lock-session - Securely locks the session
app.post('/api/admin/lock-session', (req, res) => {
  res.json({
    success: true,
    message: 'Admin session locked successfully.'
  });
});

// ── Admin Numeric PIN / Passcode Management (Isolated from Password) ──

// GET /api/admin/pin - Retrieve current configured PIN length and metadata
app.get('/api/admin/pin', (req, res) => {
  res.json({
    length: adminPinData.length,
    updated_at: adminPinData.updated_at
  });
});

// POST /api/admin/verify-pin - Verify entered PIN
app.post('/api/admin/verify-pin', (req, res) => {
  const { pin } = req.body || {};
  const cleanPin = String(pin || '').trim();

  if (cleanPin === adminPinData.pin) {
    return res.json({
      success: true,
      valid: true,
      length: adminPinData.length,
      message: 'Passcode verified successfully.'
    });
  }

  return res.status(401).json({
    success: false,
    valid: false,
    error: 'Invalid Passcode. Access restricted.'
  });
});

// POST /api/admin/change-pin - Update numeric PIN (ONLY modifies PIN, never touches password)
app.post('/api/admin/change-pin', async (req, res) => {
  const { currentPin, newPin, confirmPin, pinLength } = req.body || {};

  const cleanCurrent = String(currentPin || '').trim();
  const cleanNew = String(newPin || '').trim();
  const cleanConfirm = String(confirmPin || '').trim();
  const targetLength = parseInt(pinLength || cleanNew.length, 10);

  // 1. Validate current PIN
  if (cleanCurrent !== adminPinData.pin) {
    return res.status(400).json({ error: 'Incorrect current PIN. Please verify your current passcode.' });
  }

  // 2. Validate numeric-only
  if (!/^\d+$/.test(cleanNew)) {
    return res.status(400).json({ error: 'PIN must contain only numeric digits (0-9).' });
  }

  // 3. Validate matching confirm
  if (cleanConfirm && cleanNew !== cleanConfirm) {
    return res.status(400).json({ error: 'Confirmation PIN does not match new PIN.' });
  }

  // 4. Validate exact length
  if (cleanNew.length !== targetLength) {
    return res.status(400).json({ error: `New PIN must be exactly ${targetLength} digits.` });
  }

  if (targetLength < 4 || targetLength > 12) {
    return res.status(400).json({ error: 'PIN length must be between 4 and 12 digits.' });
  }

  // 5. Update PIN data without touching adminAuthData
  adminPinData.pin = cleanNew;
  adminPinData.length = targetLength;
  adminPinData.updated_at = new Date().toISOString();

  await fs.writeFile(PIN_FILE, JSON.stringify(adminPinData, null, 2), 'utf8');
  console.log(`[PIN] Admin numeric PIN updated to ${targetLength} digits (isolated from account password).`);

  // 6. Broadcast to all clients (NavBar, Admin, etc.) so unlock circles dynamically adjust in real time
  io.emit('admin-pin-updated', {
    length: targetLength,
    updated_at: adminPinData.updated_at
  });

  res.json({
    success: true,
    message: `Admin PIN successfully updated to ${targetLength} digits.`,
    length: targetLength,
    updated_at: adminPinData.updated_at
  });
});

// List all registered restaurant brands
app.get('/api/restaurants', (req, res) => {
  res.json(Object.values(RESTAURANTS));
});

// Menu JSON endpoint (load from per-restaurant file)
// ══════════════════════════════════════════════════════════════════════════
// MENU MANAGEMENT API (FOOD ITEMS)
// ══════════════════════════════════════════════════════════════════════════

// GET all menu items
app.get('/api/menu', async (req, res) => {
  try {
    const menu = await loadMenuData();
    res.json(menu);
  } catch (error) {
    console.error(`[Menu] Error loading menu items:`, error);
    res.status(500).json({ error: 'Failed to load menu items' });
  }
});

// POST: Add new menu product
app.post('/api/menu', async (req, res) => {
  try {
    const menu = await loadMenuData();
    const newItem = req.body;
    if (!newItem.id) {
      newItem.id = `PRD-${Date.now().toString().slice(-4)}`;
    }
    if (newItem.available === undefined) newItem.available = true;
    if (!newItem.status) newItem.status = newItem.available ? 'Available' : 'Unavailable';
    if (!newItem.stock && newItem.stock !== 0) newItem.stock = 25;
    
    menu.unshift(newItem);
    await saveMenuData(menu);
    io.emit('menu-updated', menu);
    console.log(`[Menu] Created new product: ${newItem.name} (#${newItem.id})`);
    res.json({ success: true, item: newItem, menu });
  } catch (error) {
    console.error('[Menu] Failed to create product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// PUT: Edit existing menu product
app.put('/api/menu/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const menu = await loadMenuData();
    const idx = menu.findIndex(m => String(m.id) === String(id));
    if (idx === -1) {
      const newItem = { ...req.body, id };
      if (newItem.available !== undefined) {
        newItem.status = newItem.available ? 'Available' : 'Unavailable';
      }
      menu.unshift(newItem);
      await saveMenuData(menu);
      io.emit('menu-updated', menu);
      console.log(`[Menu] Upserted product: ${newItem.name} (#${id})`);
      return res.json({ success: true, item: newItem, menu });
    }
    menu[idx] = {
      ...menu[idx],
      ...req.body,
      id: menu[idx].id
    };
    if (menu[idx].available !== undefined) {
      menu[idx].status = menu[idx].available ? 'Available' : 'Unavailable';
    }
    await saveMenuData(menu);
    io.emit('menu-updated', menu);
    console.log(`[Menu] Updated product: ${menu[idx].name} (#${id})`);
    res.json({ success: true, item: menu[idx], menu });
  } catch (error) {
    console.error('[Menu] Failed to update product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// PATCH: Toggle food product availability
app.patch('/api/menu/:id/availability', async (req, res) => {
  try {
    const { id } = req.params;
    const { available } = req.body;
    const menu = await loadMenuData();
    const idx = menu.findIndex(m => String(m.id) === String(id));
    if (idx === -1) {
      return res.status(404).json({ error: `Product #${id} not found` });
    }
    const nextAvailable = available !== undefined ? Boolean(available) : !menu[idx].available;
    menu[idx].available = nextAvailable;
    menu[idx].status = nextAvailable ? 'Available' : 'Unavailable';
    await saveMenuData(menu);
    io.emit('menu-updated', menu);
    io.emit('item-availability-updated', {
      itemId: id,
      itemName: menu[idx].name,
      isAvailable: nextAvailable
    });
    console.log(`[Menu] Toggled availability for #${id} "${menu[idx].name}" -> ${nextAvailable ? 'Available' : 'Unavailable'}`);
    res.json({ success: true, item: menu[idx], menu });
  } catch (error) {
    console.error('[Menu] Failed to toggle availability:', error);
    res.status(500).json({ error: 'Failed to toggle availability' });
  }
});

// DELETE: Archive / remove menu product
app.delete('/api/menu/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let menu = await loadMenuData();
    const item = menu.find(m => String(m.id) === String(id));
    if (!item) {
      return res.status(404).json({ error: `Product #${id} not found` });
    }
    menu = menu.filter(m => String(m.id) !== String(id));
    await saveMenuData(menu);
    io.emit('menu-updated', menu);
    console.log(`[Menu] Archived product #${id} "${item.name}"`);
    res.json({ success: true, archivedItem: item, menu });
  } catch (error) {
    console.error('[Menu] Failed to archive product:', error);
    res.status(500).json({ error: 'Failed to archive product' });
  }
});

// ══════════════════════════════════════════════════════════════════════════
// DRINKS & SIZES MANAGEMENT API
// ══════════════════════════════════════════════════════════════════════════

// GET all drinks with sizes, stock, prices
app.get('/api/drinks', async (req, res) => {
  try {
    const drinks = await loadDrinksData();
    res.json(drinks);
  } catch (error) {
    console.error('[Drinks] Failed to load drinks:', error);
    res.status(500).json({ error: 'Failed to load drinks' });
  }
});

// POST: Add new drink
app.post('/api/drinks', async (req, res) => {
  try {
    const drinks = await loadDrinksData();
    const newDrink = req.body;
    if (!newDrink.id) {
      newDrink.id = `DRK-00${drinks.length + 1}`;
    }
    if (!newDrink.sku) newDrink.sku = newDrink.id;
    if (newDrink.available === undefined) newDrink.available = true;
    if (!newDrink.status) newDrink.status = newDrink.available ? 'Available' : 'Unavailable';
    drinks.unshift(newDrink);
    await saveDrinksData(drinks);
    io.emit('drinks-updated', drinks);
    console.log(`[Drinks] Added new drink: ${newDrink.name} (${newDrink.id})`);
    res.json({ success: true, drink: newDrink, drinks });
  } catch (error) {
    console.error('[Drinks] Failed to create drink:', error);
    res.status(500).json({ error: 'Failed to create drink' });
  }
});

// PUT: Edit existing drink
app.put('/api/drinks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const drinks = await loadDrinksData();
    const idx = drinks.findIndex(d => String(d.id) === String(id));
    if (idx === -1) {
      const newDrink = { ...req.body, id };
      drinks.unshift(newDrink);
      await saveDrinksData(drinks);
      io.emit('drinks-updated', drinks);
      console.log(`[Drinks] Upserted drink: ${newDrink.name} (#${id})`);
      return res.json({ success: true, drink: newDrink, drinks });
    }
    drinks[idx] = {
      ...drinks[idx],
      ...req.body,
      id: drinks[idx].id
    };
    await saveDrinksData(drinks);
    io.emit('drinks-updated', drinks);
    console.log(`[Drinks] Updated drink: ${drinks[idx].name} (#${id})`);
    res.json({ success: true, drink: drinks[idx], drinks });
  } catch (error) {
    console.error('[Drinks] Failed to update drink:', error);
    res.status(500).json({ error: 'Failed to update drink' });
  }
});

// PATCH: Toggle drink availability
app.patch('/api/drinks/:id/availability', async (req, res) => {
  try {
    const { id } = req.params;
    const { available } = req.body;
    const drinks = await loadDrinksData();
    const idx = drinks.findIndex(d => String(d.id) === String(id));
    if (idx === -1) {
      return res.status(404).json({ error: `Drink #${id} not found` });
    }
    const nextAvailable = available !== undefined ? Boolean(available) : !drinks[idx].available;
    drinks[idx].available = nextAvailable;
    const anyLow = (drinks[idx].sizes || []).some(s => s.stock <= 6 && s.stock > 0);
    drinks[idx].status = nextAvailable ? (anyLow ? 'Low Stock' : 'Available') : 'Unavailable';
    await saveDrinksData(drinks);
    io.emit('drinks-updated', drinks);
    console.log(`[Drinks] Toggled availability for #${id} "${drinks[idx].name}" -> ${nextAvailable ? 'Available' : 'Unavailable'}`);
    res.json({ success: true, drink: drinks[idx], drinks });
  } catch (error) {
    console.error('[Drinks] Failed to toggle drink availability:', error);
    res.status(500).json({ error: 'Failed to toggle drink availability' });
  }
});

// PATCH: Update drink size stock (increment/decrement or exact)
app.patch('/api/drinks/:id/stock', async (req, res) => {
  try {
    const { id } = req.params;
    const { sizeName, delta, stock } = req.body;
    const drinks = await loadDrinksData();
    const idx = drinks.findIndex(d => String(d.id) === String(id));
    if (idx === -1) {
      return res.status(404).json({ error: `Drink #${id} not found` });
    }
    if (Array.isArray(drinks[idx].sizes)) {
      drinks[idx].sizes = drinks[idx].sizes.map(s => {
        if (s.name === sizeName) {
          const nextStock = stock !== undefined ? Math.max(0, stock) : Math.max(0, (s.stock || 0) + (delta || 0));
          return { ...s, stock: nextStock };
        }
        return s;
      });
      const anyLow = drinks[idx].sizes.some(s => s.stock <= 6 && s.stock > 0);
      const allOut = drinks[idx].sizes.every(s => s.stock === 0);
      if (allOut) drinks[idx].status = 'Unavailable';
      else if (anyLow) drinks[idx].status = 'Low Stock';
      else if (drinks[idx].available) drinks[idx].status = 'Available';
    }
    await saveDrinksData(drinks);
    io.emit('drinks-updated', drinks);
    console.log(`[Drinks] Updated stock for #${id} "${drinks[idx].name}" [${sizeName}]`);
    res.json({ success: true, drink: drinks[idx], drinks });
  } catch (error) {
    console.error('[Drinks] Failed to update drink stock:', error);
    res.status(500).json({ error: 'Failed to update drink stock' });
  }
});

// DELETE: Archive / remove drink
app.delete('/api/drinks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let drinks = await loadDrinksData();
    const drink = drinks.find(d => String(d.id) === String(id));
    if (!drink) {
      return res.status(404).json({ error: `Drink #${id} not found` });
    }
    drinks = drinks.filter(d => String(d.id) !== String(id));
    await saveDrinksData(drinks);
    io.emit('drinks-updated', drinks);
    console.log(`[Drinks] Archived drink #${id} "${drink.name}"`);
    res.json({ success: true, archivedDrink: drink, drinks });
  } catch (error) {
    console.error('[Drinks] Failed to archive drink:', error);
    res.status(500).json({ error: 'Failed to archive drink' });
  }
});

// Mock OpenNDS captive portal authentication gateway
app.get('/opennds_auth', (req, res) => {
  const { tok, redir } = req.query;
  console.log(`[Captive Portal] Client token ${tok} authorized. Redirecting to ${redir || '/'}`);
  
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Wi-Fi Connected</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            background-color: #FAF8F5;
            color: #2C1A11;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            text-align: center;
          }
          .card {
            background: #FFFFFF;
            border: 1px solid rgba(44, 26, 17, 0.08);
            padding: 2.5rem 2rem;
            border-radius: 24px;
            box-shadow: 0 12px 30px rgba(44, 26, 17, 0.08);
            max-width: 400px;
          }
          .spinner {
            border: 3px solid rgba(44, 26, 17, 0.05);
            border-top: 3px solid #2D6A4F;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 1.5rem auto;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          h1 { color: #2D6A4F; margin-top: 0; font-size: 24px; font-weight: 800; }
          p { color: #5C4E46; font-size: 14px; line-height: 1.5; }
        </style>
        <script>
          setTimeout(() => {
            window.location.href = "${redir || '/'}";
          }, 3000);
        </script>
      </head>
      <body>
        <div class="card">
          <h1>🔒 Wi-Fi Connected</h1>
          <p>Your device is now authenticated on the Restaurant Guest Network.</p>
          <div class="spinner"></div>
          <p>Redirecting you to your destination...</p>
        </div>
      </body>
    </html>
  `);
});

// Fallback to index.html for React routing in production
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`==================================================`);
  startIpWatcher(); // Begin monitoring network interface changes
  console.log(`  [${activeRestaurant.name}] Backend running on port ${PORT}`);
  console.log(`  Cuisine: ${activeRestaurant.cuisine}`);
  console.log(`  WebSocket Server ready for client connections`);
  console.log(`==================================================`);
});
