import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import os from 'os';
import crypto from 'crypto';


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

io.on('connection', (socket) => {
  console.log(`[Socket] User connected: ${socket.id}`);

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
      if (status === 'Order Ready' || status === 'Ready') normalizedStatus = 'Ready for Pickup';

      // Determine next status and stripe color
      let nextStatus = 'Completed';
      let stripeColor = '#3b82f6';
      if (normalizedStatus === 'New') {
        nextStatus = 'Start Preparing';
        stripeColor = '#2563eb';
      } else if (normalizedStatus === 'Preparing') {
        nextStatus = 'Move to Cooking';
        stripeColor = '#b45309';
      } else if (normalizedStatus === 'Cooking') {
        nextStatus = 'Mark as Ready';
        stripeColor = '#c2410c';
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

// Helper to detect current LAN IPv4 address on active Wi-Fi / Ethernet interface
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  const candidates = [];

  for (const [name, ifaceList] of Object.entries(interfaces)) {
    if (!ifaceList) continue;
    for (const iface of ifaceList) {
      if (iface.family === 'IPv4' && !iface.internal && !iface.address.startsWith('127.') && !iface.address.startsWith('169.254.')) {
        const lowerName = name.toLowerCase();
        let priority = 1;
        if (lowerName.includes('wi-fi') || lowerName.includes('wifi') || lowerName.includes('wireless') || lowerName.includes('wlan')) {
          priority = 10;
        } else if (lowerName.includes('ethernet') || lowerName.includes('eth') || lowerName.includes('en0')) {
          priority = 8;
        } else if (lowerName.includes('vethernet') || lowerName.includes('virtual') || lowerName.includes('docker') || lowerName.includes('wsl')) {
          priority = 0;
        }
        candidates.push({ address: iface.address, priority });
      }
    }
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => b.priority - a.priority);
    return candidates[0].address;
  }

  return 'localhost';
}

// Restaurant profile metadata endpoint
app.get('/api/restaurant', (req, res) => {
  res.json({
    ...activeRestaurant,
    backendPort: PORT,
    frontendPort: FRONTEND_PORT,
    mobileFrontendPort: MOBILE_FRONTEND_PORT
  });
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
app.get('/api/network-info', (req, res) => {
  const lanIp = getLocalIpAddress();
  res.json({
    ip: lanIp,
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
  if (status === 'Order Ready' || status === 'Ready') normalizedStatus = 'Ready for Pickup';

  let nextStatus = 'Completed';
  let stripeColor = '#3b82f6';
  if (normalizedStatus === 'New') {
    nextStatus = 'Start Preparing';
    stripeColor = '#2563eb';
  } else if (normalizedStatus === 'Preparing') {
    nextStatus = 'Move to Cooking';
    stripeColor = '#b45309';
  } else if (normalizedStatus === 'Cooking') {
    nextStatus = 'Mark as Ready';
    stripeColor = '#c2410c';
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
app.get('/api/preferences/allergens', (req, res) => {
  const activeAllergens = (menuPreferences.allergens || [])
    .filter(a => (a.status || (a.active ? 'Active' : 'Inactive')).toLowerCase() === 'active')
    .sort((a, b) => (a.display_order || a.order || 0) - (b.display_order || b.order || 0));
  res.json(activeAllergens);
});

// GET /api/preferences/flavor-preferences - Active flavor preferences sorted by display_order
app.get('/api/preferences/flavor-preferences', (req, res) => {
  const list = menuPreferences.flavor_preferences || menuPreferences.flavors || [];
  const activeFlavors = list
    .filter(f => (f.status || (f.active ? 'Active' : 'Inactive')).toLowerCase() === 'active')
    .sort((a, b) => (a.display_order || a.order || 0) - (b.display_order || b.order || 0));
  res.json(activeFlavors);
});

// GET /api/preferences - Combined active preferences
app.get('/api/preferences', (req, res) => {
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
app.get('/api/admin/preferences/allergens', (req, res) => {
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
// PROMOTIONS & DISCOUNTS ENDPOINTS (JSON Database + Realtime Sync)
// ══════════════════════════════════════════════════════════════════════════
const PROMOS_FILE = path.join(__dirname, 'data', 'promos.json');
let promosList = [];

async function loadPromosFromDb() {
  try {
    const raw = await fs.readFile(PROMOS_FILE, 'utf8');
    const data = JSON.parse(raw);
    if (Array.isArray(data)) {
      promosList = data;
      console.log(`[DB] Promos loaded: ${promosList.length} promotions from data/promos.json`);
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

// GET /api/promos - Retrieve all promotions
app.get('/api/promos', (req, res) => {
  res.json(promosList);
});

// POST /api/promos - Create new promotion
app.post('/api/promos', async (req, res) => {
  try {
    const p = req.body || {};
    if (!p.name || !p.code) {
      return res.status(400).json({ error: 'Promo name and code are required.' });
    }
    const cleanCode = p.code.trim().toUpperCase().replace(/\s/g, '');
    const newPromo = {
      id: p.id || `PR-${Date.now().toString().slice(-4)}`,
      name: p.name.trim(),
      code: cleanCode,
      discountType: p.discountType || 'percent',
      discountValue: Number(p.discountValue) || 15,
      discountLabel: p.discountLabel || (p.discountType === 'percent' ? `${p.discountValue}% Off (Automatic)` : `₱${p.discountValue} Off`),
      targetLabel: p.targetLabel || (p.applyToAll ? 'All Menu Items' : (p.applicableItems && p.applicableItems.length > 0 ? p.applicableItems.slice(0, 2).join(', ') : 'Selected Items')),
      dateRange: p.dateRange || 'Jan 1, 2025 – Dec 31, 2026',
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
      createdAt: p.createdAt || Date.now()
    };

    const existingIdx = promosList.findIndex(x => x.id === newPromo.id || x.code === newPromo.code);
    if (existingIdx !== -1) {
      promosList[existingIdx] = newPromo;
    } else {
      promosList.push(newPromo);
    }

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
    const { id } = req.params;
    const updates = req.body || {};
    const idx = promosList.findIndex(p => p.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Promotion not found' });
    }

    promosList[idx] = {
      ...promosList[idx],
      ...updates,
      id,
      code: updates.code ? updates.code.trim().toUpperCase().replace(/\s/g, '') : promosList[idx].code,
      updatedAt: Date.now()
    };

    await savePromosToDb();
    io.emit('promos-updated', promosList);
    res.json({ success: true, promo: promosList[idx], promos: promosList });
  } catch (err) {
    console.error('[Promos] Error updating promo:', err);
    res.status(500).json({ error: 'Failed to update promotion' });
  }
});

// DELETE /api/promos/:id - Delete promotion
app.delete('/api/promos/:id', async (req, res) => {
  try {
    const { id } = req.params;
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
    const { promoCode, orderId, discountAmount } = req.body || {};
    if (!promoCode) {
      return res.status(400).json({ error: 'Promo code required' });
    }
    const cleanCode = promoCode.trim().toUpperCase();
    const promo = promosList.find(p => p.code === cleanCode);
    if (!promo) {
      return res.status(404).json({ error: 'Promotion code not found' });
    }

    if (promo.status !== 'active') {
      return res.status(400).json({ error: `Promotion is ${promo.status}, cannot be redeemed.` });
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
  console.log(`  [${activeRestaurant.name}] Backend running on port ${PORT}`);
  console.log(`  Cuisine: ${activeRestaurant.cuisine}`);
  console.log(`  WebSocket Server ready for client connections`);
  console.log(`==================================================`);
});
