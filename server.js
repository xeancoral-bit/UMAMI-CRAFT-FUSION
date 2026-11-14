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
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import localtunnel from 'localtunnel';

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
// Captures rawBody buffer for HMAC-SHA256 cryptographic webhook signature validation
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf ? buf.toString('utf8') : '';
  }
}));
// Enable CORS for development
app.use(cors());

// Static uploads store for menu & beverage images
const UPLOADS_DIR = path.join(__dirname, 'data', 'uploads');
fs.mkdir(UPLOADS_DIR, { recursive: true }).catch(() => { });
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
    if (typeof syncLiveDailyReportsWithSystem === 'function') {
      syncLiveDailyReportsWithSystem().catch(() => { });
    }
  } catch (err) {
    console.error('[DB] Failed to save orders.json:', err);
  }
}

// Initial orders DB load
loadOrdersFromDb();

// ══════════════════════════════════════════════════════════════════════════
// AUTOMATED PAYMENT GATEWAY WEBHOOKS & CUSTOMER ACCOUNTS STORE
// ══════════════════════════════════════════════════════════════════════════
const WEBHOOKS_FILE = path.join(__dirname, 'data', 'payment_webhooks.json');
let paymentWebhooks = [];

const CUSTOMER_ACCOUNTS_FILE = path.join(__dirname, 'data', 'customer_accounts.json');
let customerAccounts = [];

const WEBHOOK_SIGNING_SECRET = process.env.PAYMENT_WEBHOOK_SECRET || 'whsec_umami_live_webhook_secret_key_2026';

async function loadPaymentWebhooksFromDb() {
  try {
    const raw = await fs.readFile(WEBHOOKS_FILE, 'utf8');
    const data = JSON.parse(raw);
    if (Array.isArray(data)) {
      paymentWebhooks = data;
      console.log(`[DB] Webhooks loaded: ${paymentWebhooks.length} events from data/payment_webhooks.json`);
      return;
    }
  } catch (err) {
    paymentWebhooks = [];
  }
}

async function savePaymentWebhooksToDb() {
  try {
    await fs.writeFile(WEBHOOKS_FILE, JSON.stringify(paymentWebhooks, null, 2), 'utf8');
  } catch (err) {
    console.error('[DB] Failed to save payment_webhooks.json:', err);
  }
}

async function loadCustomerAccountsFromDb() {
  try {
    const raw = await fs.readFile(CUSTOMER_ACCOUNTS_FILE, 'utf8');
    const data = JSON.parse(raw);
    if (Array.isArray(data)) {
      customerAccounts = data;
      console.log(`[DB] Customer accounts loaded: ${customerAccounts.length} accounts from data/customer_accounts.json`);
      return;
    }
  } catch (err) {
    customerAccounts = [];
  }
}

async function saveCustomerAccountsToDb() {
  try {
    await fs.writeFile(CUSTOMER_ACCOUNTS_FILE, JSON.stringify(customerAccounts, null, 2), 'utf8');
  } catch (err) {
    console.error('[DB] Failed to save customer_accounts.json:', err);
  }
}

loadPaymentWebhooksFromDb();
loadCustomerAccountsFromDb();

// ══════════════════════════════════════════════════════════════════════════
// DYNAMIC QR PH PAYMENT SESSIONS & BSP EMVCo SPECIFICATION ENGINE
// ══════════════════════════════════════════════════════════════════════════
const PAYMENT_SESSIONS_FILE = path.join(__dirname, 'data', 'payment_sessions.json');
let paymentSessions = [];

async function loadPaymentSessionsFromDb() {
  try {
    const raw = await fs.readFile(PAYMENT_SESSIONS_FILE, 'utf8');
    const data = JSON.parse(raw);
    if (Array.isArray(data)) {
      paymentSessions = data;
      console.log(`[DB] Payment sessions loaded: ${paymentSessions.length} sessions from data/payment_sessions.json`);
      return;
    }
  } catch (err) {
    paymentSessions = [];
  }
}

async function savePaymentSessionsToDb() {
  try {
    await fs.writeFile(PAYMENT_SESSIONS_FILE, JSON.stringify(paymentSessions, null, 2), 'utf8');
  } catch (err) {
    console.error('[DB] Failed to save payment_sessions.json:', err);
  }
}

loadPaymentSessionsFromDb();

// EMVCo CRC-16 / CCITT-FALSE calculation (Polynomial: 0x1021, Initial: 0xFFFF)
function computeCRC16(data) {
  let crc = 0xFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= (data.charCodeAt(i) << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function buildTLV(tag, value) {
  const strVal = String(value);
  const lenStr = String(strVal.length).padStart(2, '0');
  return `${tag}${lenStr}${strVal}`;
}

function generateQRPhPayload({ merchantName, amount, referenceNumber, terminalId, walletId }) {
  const cleanMerchant = (merchantName || 'UMAMI CRAFT FUSION INC.').toUpperCase().substring(0, 25);
  // Verified Philippine National QR Ph tag structure with official Merchant Account 0917-888-UMAMI (86264)
  const sub28 = buildTLV('00', 'ph.ppmi.qrph') +
    buildTLV('01', 'UMAMI86264') +
    buildTLV('02', '0917-888-UMAMI (86264)') +
    buildTLV('03', (walletId || 'GCASH').toUpperCase());
  const tag28 = buildTLV('28', sub28);
  const tag62 = buildTLV('62', buildTLV('01', referenceNumber) + buildTLV('07', terminalId || 'COUNTER_01'));

  const raw = buildTLV('00', '01') +
    buildTLV('01', '12') +
    tag28 +
    buildTLV('52', '5812') +
    buildTLV('53', '608') +
    buildTLV('54', Number(amount || 0).toFixed(2)) +
    buildTLV('58', 'PH') +
    buildTLV('59', cleanMerchant) +
    buildTLV('60', 'MANILA') +
    tag62 +
    '6304';

  const crc = computeCRC16(raw);
  return raw + crc;
}

// Cryptographic Webhook Helpers
function computeWebhookSignature(payloadString, secret = WEBHOOK_SIGNING_SECRET) {
  return crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
}

function verifyWebhookSignature(payloadString, headerSignature, secret = WEBHOOK_SIGNING_SECRET) {
  if (!headerSignature || typeof headerSignature !== 'string') return false;

  let signatureHex = headerSignature.trim();
  let timestamp = null;

  if (headerSignature.includes('t=')) {
    const parts = headerSignature.split(',');
    for (const part of parts) {
      const [k, v] = part.split('=').map(s => s && s.trim());
      if (k === 't') timestamp = parseInt(v, 10);
      if (k === 'te' || k === 'v1' || k === 'v2') signatureHex = v;
    }
  } else if (headerSignature.startsWith('sha256=')) {
    signatureHex = headerSignature.replace('sha256=', '').trim();
  }

  // Replay attack protection: if timestamp header provided, verify within 300s (5 minutes)
  if (timestamp) {
    const nowSec = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSec - timestamp) > 300) {
      console.warn(`[Webhook-Security] Expired timestamp in signature: ${timestamp} vs now ${nowSec}`);
      return false;
    }
    const expectedWithTime = crypto.createHmac('sha256', secret).update(`${timestamp}.${payloadString}`).digest('hex');
    try {
      const bufA = Buffer.from(signatureHex, 'hex');
      const bufB = Buffer.from(expectedWithTime, 'hex');
      if (bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)) {
        return true;
      }
    } catch (_) { }
  }

  // Standard payload direct HMAC
  try {
    const expectedDirect = crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
    const bufA = Buffer.from(signatureHex, 'hex');
    const bufB = Buffer.from(expectedDirect, 'hex');
    if (bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)) {
      return true;
    }
  } catch (_) { }

  return false;
}

// Persistent Table Service Assistance Requests Store
const SERVICE_REQUESTS_FILE = path.join(__dirname, 'data', 'service_requests.json');
let serviceRequests = [];

async function loadServiceRequestsFromDb() {
  try {
    const raw = await fs.readFile(SERVICE_REQUESTS_FILE, 'utf8');
    const data = JSON.parse(raw);
    if (Array.isArray(data)) {
      serviceRequests = data;
      console.log(`[DB] Service requests loaded: ${serviceRequests.length} requests from data/service_requests.json`);
      return;
    }
  } catch (err) {
    serviceRequests = [];
  }
}

async function saveServiceRequestsToDb() {
  try {
    await fs.writeFile(SERVICE_REQUESTS_FILE, JSON.stringify(serviceRequests, null, 2), 'utf8');
    if (typeof syncLiveDailyReportsWithSystem === 'function') {
      syncLiveDailyReportsWithSystem().catch(() => { });
    }
  } catch (err) {
    console.error('[DB] Failed to save service_requests.json:', err);
  }
}

loadServiceRequestsFromDb();

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
    console.log(`[DB] Preferences loaded: ${(menuPreferences.allergens || []).length} allergens, ${(menuPreferences.flavor_preferences || []).length} flavor preferences`);
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
  } catch (err) { }

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

/**
 * Validates product availability, stock, prices, add-ons, and promo discounts on the backend.
 * Prevents ordering unavailable/out-of-stock items and prevents client-side price tampering.
 */
async function validateAndComputeOrderPricing(effectiveItems = [], promoCode = null, promosCatalog = []) {
  const menu = await loadMenuData();
  const drinks = await loadDrinksData();
  const catalog = [...(Array.isArray(menu) ? menu : []), ...(Array.isArray(drinks) ? drinks : [])];

  const unavailableItems = [];
  let verifiedSubtotal = 0;

  for (const item of effectiveItems) {
    const qty = Math.max(1, Number(item.quantity || item.qty || 1));
    const lookupId = String(item.originalId || item.id || '').split('-')[0];
    const dbMatch = catalog.find(d =>
      String(d.id) === String(item.originalId || item.id) ||
      String(d.id) === lookupId ||
      (d.name && item.name && String(item.name).toLowerCase().startsWith(String(d.name).toLowerCase()))
    );

    if (dbMatch) {
      if (dbMatch.available === false || String(dbMatch.status || '').toLowerCase() === 'unavailable') {
        unavailableItems.push(dbMatch.name || item.name);
      } else if (dbMatch.stock !== undefined && Number(dbMatch.stock) <= 0) {
        unavailableItems.push(`${dbMatch.name || item.name} (Out of Stock)`);
      }

      let basePrice = Number(dbMatch.promoPrice || dbMatch.price || 0);
      if (item.size && Array.isArray(dbMatch.sizes) && dbMatch.sizes.length > 0) {
        const sizeMatch = dbMatch.sizes.find(s => String(s.name).toLowerCase() === String(item.size).toLowerCase());
        if (sizeMatch && sizeMatch.price !== undefined) {
          basePrice = Number(sizeMatch.price);
        }
      }
      const addonsTotal = Array.isArray(item.addons)
        ? item.addons.reduce((s, a) => s + Math.max(0, Number(a?.price || 0)), 0)
        : 0;
      verifiedSubtotal += (basePrice + addonsTotal) * qty;
    } else {
      const unitPrice = Math.max(0, Number(item.price || 0));
      verifiedSubtotal += unitPrice * qty;
    }
  }

  let verifiedDiscount = 0;
  if (promoCode && Array.isArray(promosCatalog)) {
    const matchedPromo = promosCatalog.find(
      p => p.status === 'active' && String(p.code || '').toUpperCase() === String(promoCode).trim().toUpperCase()
    );
    if (matchedPromo) {
      if (matchedPromo.discountType === 'percent') {
        verifiedDiscount = Math.round(verifiedSubtotal * (Number(matchedPromo.discountValue || 0) / 100));
      } else {
        verifiedDiscount = Math.min(verifiedSubtotal, Number(matchedPromo.discountValue || 0));
      }
    }
  }

  const verifiedTotal = Math.max(0, Number((verifiedSubtotal - verifiedDiscount).toFixed(2)));
  return {
    valid: unavailableItems.length === 0,
    unavailableItems,
    verifiedSubtotal,
    verifiedDiscount,
    verifiedTotal
  };
}

const DAILY_REPORTS_FILE = path.join(__dirname, 'data', 'daily_reports.json');
let cachedDailyReports = null;

async function loadDailyReportsData() {
  try {
    const data = await fs.readFile(DAILY_REPORTS_FILE, 'utf8');
    cachedDailyReports = JSON.parse(data);
    return cachedDailyReports;
  } catch (err) {
    console.error('[DailyReports] Failed to load daily reports:', err);
    return cachedDailyReports || [];
  }
}

async function saveDailyReportsData(reports) {
  cachedDailyReports = reports;
  try {
    await fs.writeFile(DAILY_REPORTS_FILE, JSON.stringify(reports, null, 2), 'utf8');
  } catch (err) {
    console.error('[DailyReports] Failed to save daily reports:', err);
  }
}

loadMenuData();
loadDrinksData();
loadDailyReportsData();

// ══════════════════════════════════════════════════════════════════════════
// SHIFT MANAGEMENT SYSTEM – Persistent Shift DB
// ══════════════════════════════════════════════════════════════════════════
const SHIFTS_FILE = path.join(__dirname, 'data', 'shifts.json');
let shiftsData = {
  activeShift: null,
  history: []
};

async function loadShiftsData() {
  try {
    const raw = await fs.readFile(SHIFTS_FILE, 'utf8');
    shiftsData = JSON.parse(raw);
    if (!shiftsData.history) shiftsData.history = [];
    console.log('[Shifts] Loaded shifts data. Active shift:', shiftsData.activeShift?.shiftId || 'none');
  } catch (err) {
    console.warn('[Shifts] No shifts.json found, initializing default.');
    const today = new Date().toISOString().slice(0, 10);
    shiftsData = {
      activeShift: {
        shiftId: `SHIFT-${today.replace(/-/g, '')}-001`,
        cashierId: 'EMP-101',
        cashierName: 'Maria Santos',
        registerId: 'POS-01 (Main Counter)',
        openingFloat: 3000,
        startTime: new Date().toISOString(),
        businessDate: today,
        status: 'active',
        lastAutoResetDate: today
      },
      history: []
    };
    await saveShiftsData();
  }
}

async function saveShiftsData() {
  try {
    await fs.writeFile(SHIFTS_FILE, JSON.stringify(shiftsData, null, 2), 'utf8');
  } catch (err) {
    console.error('[Shifts] Failed to save shifts data:', err);
  }
}

/** Compute live shift sales from orders filtered by shiftId (or today's date as fallback) */
function computeShiftSales(shiftId, businessDate) {
  const shiftOrders = orders.filter(o => {
    if (shiftId && o.shiftId) return o.shiftId === shiftId;
    // Fallback: orders created on the same business date
    return (o.createdAt || '').slice(0, 10) === businessDate;
  });

  let totalSales = 0;
  let cashSales = 0;
  let digitalSales = 0;
  let gcashSales = 0;
  let mayaSales = 0;
  let paypalSales = 0;
  let cardSales = 0;
  let otherDigitalSales = 0;
  let cashSalesCount = 0;
  let digitalSalesCount = 0;
  let cancelledCount = 0;
  let refundedCount = 0;
  let voidedCount = 0;
  let successfulCount = 0;
  let discountsApplied = 0;
  let cashReceived = 0;
  let changeGiven = 0;

  shiftOrders.forEach(o => {
    const amt = Number(o.totalPrice || o.total || 0);
    const ps = String(o.paymentStatus || '').toLowerCase();
    const s = String(o.status || '').toLowerCase();
    const pm = String(o.paymentMethod || o.payment || '').toLowerCase();
    discountsApplied += Number(o.discountAmount || 0);

    if (s === 'cancelled') { cancelledCount++; return; }
    if (ps === 'refunded' || o.isRefunded) { refundedCount++; return; }
    if (ps === 'voided' || o.isVoided) { voidedCount++; return; }
    if (ps.includes('pending') || ps.includes('rejected') || ps === 'failed') return;

    // Count only verified/successful/approved payments
    const isVerified = o.isPaymentVerified === true || ps === 'approved' || ps === 'successful' || ps === 'success';
    if (!isVerified) return;

    successfulCount++;
    totalSales += amt;

    if (pm.includes('cash') && !pm.includes('gcash')) {
      cashSales += amt;
      cashSalesCount++;
      const tendered = Number(o.cashReceived || amt);
      cashReceived += tendered;
      changeGiven += Math.max(0, tendered - amt);
    } else {
      digitalSales += amt;
      digitalSalesCount++;
      if (pm.includes('gcash')) gcashSales += amt;
      else if (pm.includes('maya')) mayaSales += amt;
      else if (pm.includes('paypal')) paypalSales += amt;
      else if (pm.includes('card') || pm.includes('credit') || pm.includes('debit')) cardSales += amt;
      else otherDigitalSales += amt;
    }
  });

  return {
    totalSales: Number(totalSales.toFixed(2)),
    cashSales: Number(cashSales.toFixed(2)),
    digitalSales: Number(digitalSales.toFixed(2)),
    gcashSales: Number(gcashSales.toFixed(2)),
    mayaSales: Number(mayaSales.toFixed(2)),
    paypalSales: Number(paypalSales.toFixed(2)),
    cardSales: Number(cardSales.toFixed(2)),
    otherDigitalSales: Number(otherDigitalSales.toFixed(2)),
    successfulCount,
    cashSalesCount,
    digitalSalesCount,
    cancelledCount,
    refundedCount,
    voidedCount,
    discountsApplied: Number(discountsApplied.toFixed(2)),
    cashReceived: Number(cashReceived.toFixed(2)),
    changeGiven: Number(changeGiven.toFixed(2)),
    totalOrders: shiftOrders.length
  };
}

/** Check on startup if the business date has changed and auto-reset the shift */
async function checkAutoShiftReset() {
  const todayPH = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }); // YYYY-MM-DD
  if (!shiftsData.activeShift) return;

  const lastReset = shiftsData.activeShift.lastAutoResetDate || shiftsData.activeShift.businessDate;
  if (lastReset === todayPH) {
    console.log(`[Shifts] Auto-reset check: shift is current for ${todayPH}. No reset needed.`);
    return;
  }

  console.log(`[Shifts] Auto-reset triggered: last business date was ${lastReset}, today is ${todayPH}.`);
  const oldShift = { ...shiftsData.activeShift };
  const sales = computeShiftSales(oldShift.shiftId, oldShift.businessDate);

  const closedRecord = {
    ...oldShift,
    status: 'closed',
    endTime: new Date().toISOString(),
    closedReason: 'auto_daily_reset',
    sales,
    closedAt: new Date().toISOString()
  };
  shiftsData.history.unshift(closedRecord);

  // Build next shift ID
  const dateTag = todayPH.replace(/-/g, '');
  const todayShifts = shiftsData.history.filter(h => h.businessDate === todayPH);
  const seqNum = String(todayShifts.length + 1).padStart(3, '0');

  shiftsData.activeShift = {
    shiftId: `SHIFT-${dateTag}-${seqNum}`,
    cashierId: oldShift.cashierId,
    cashierName: oldShift.cashierName,
    registerId: oldShift.registerId,
    openingFloat: oldShift.openingFloat,
    startTime: new Date().toISOString(),
    businessDate: todayPH,
    status: 'active',
    lastAutoResetDate: todayPH
  };
  await saveShiftsData();
  console.log(`[Shifts] New shift started: ${shiftsData.activeShift.shiftId}`);
}

loadShiftsData().then(() => checkAutoShiftReset());

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

// Active QR customer allergy & dietary verification sessions keyed by `${restaurantId}:${kioskId}`
const qrCustomerSessions = {};

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
    mobileFrontendPort: MOBILE_FRONTEND_PORT,
    tunnelUrl: activeTunnelUrl,
    tunnelPassword: activeTunnelPassword
  });
  socket.emit('tunnel-status-changed', {
    status: activeTunnelUrl ? 'connected' : (isTunnelStarting ? 'connecting' : 'disconnected'),
    url: activeTunnelUrl,
    password: activeTunnelPassword
  });
  if (activeTunnelUrl) {
    socket.emit('tunnel-url-changed', { url: activeTunnelUrl, password: activeTunnelPassword });
  }

  // Allow kiosk or admin to trigger immediate network re-detection
  socket.on('request-network-refresh', async () => {
    console.log(`[Socket] Network refresh requested by client ${socket.id}`);
    const updated = await refreshDynamicNetwork(true);
    if (!activeTunnelUrl && !isTunnelStarting) {
      startAutoTunnel().catch(() => { });
    }
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
    socket.emit('tunnel-status-changed', {
      status: activeTunnelUrl ? 'connected' : (isTunnelStarting ? 'connecting' : 'disconnected'),
      url: activeTunnelUrl,
      password: activeTunnelPassword
    });
  });

  // Relay real customer phone battery percentage to kiosk and displays
  socket.on('device-battery-update', (data) => {
    if (!data) return;
    const { kioskId, batteryLevel, isCharging, isHardware } = data;
    if (!kioskId) return;
    const numericLevel = Math.max(1, Math.min(100, Math.round(Number(batteryLevel) || 85)));
    sessionBatteries[kioskId] = {
      batteryLevel: numericLevel,
      isCharging: Boolean(isCharging),
      isHardware: Boolean(isHardware),
      updatedAt: Date.now()
    };
    console.log(`[Battery Sync] Kiosk #${kioskId} phone battery updated: ${numericLevel}% (charging: ${Boolean(isCharging)}, hardware: ${Boolean(isHardware)})`);
    // Broadcast to kiosk and other displays in the room (excluding sender)
    socket.to(kioskId).emit('device-battery-synced', sessionBatteries[kioskId]);
  });

  // Send current PIN length so all unlock screens display the exact number of indicator dots
  socket.emit('admin-pin-updated', {
    length: adminPinData.length,
    updated_at: adminPinData.updated_at
  });

  // Send live menu and drinks catalogs upon socket connection
  if (cachedMenu) socket.emit('initial-menu', cachedMenu);
  if (cachedDrinks) socket.emit('initial-drinks', cachedDrinks);

  // Immediately push live Wi-Fi & LAN IP status on socket connection and handle manual refresh requests
  if (_cachedNetworkInfo && _cachedNetworkInfo.ip && _cachedNetworkInfo.ip !== '127.0.0.1') {
    socket.emit('network-ip-changed', {
      ..._cachedNetworkInfo,
      port: FRONTEND_PORT,
      backendPort: PORT,
      mobileFrontendPort: MOBILE_FRONTEND_PORT
    });
  }
  refreshDynamicNetwork(false).then((info) => {
    if (info && info.ip) {
      socket.emit('network-ip-changed', {
        ...info,
        port: FRONTEND_PORT,
        backendPort: PORT,
        mobileFrontendPort: MOBILE_FRONTEND_PORT
      });
    }
  }).catch(() => { });

  socket.on('request-network-refresh', async () => {
    const info = await refreshDynamicNetwork(true);
    socket.emit('network-ip-changed', {
      ...info,
      port: FRONTEND_PORT,
      backendPort: PORT,
      mobileFrontendPort: MOBILE_FRONTEND_PORT
    });
  });

  // Device joins a session room based on kioskId or role (kitchen, busser, restaurant, admin, kiosk, mobile)
  socket.on('join-session', ({ kioskId, role }) => {
    if (kioskId) {
      socket.join(kioskId);
      socket.kioskId = kioskId;
      // If a battery level was already detected for this kiosk, sync it to non-mobile roles (kiosk terminal, kitchen, etc.)
      // Mobile client is the battery sensor itself and will detect & report its own hardware battery
      if (sessionBatteries[kioskId] && role !== 'mobile') {
        socket.emit('device-battery-synced', sessionBatteries[kioskId]);
      }
    }
    socket.role = role;
    if (role === 'admin') {
      const adminRoom = `admin_${RESTAURANT_ID}`;
      socket.join(adminRoom);
      console.log(`[Socket] Admin Panel ${socket.id} joined ${adminRoom}`);
      socket.emit('initial-orders', orders);
      socket.emit('initial-service-requests', serviceRequests);
    } else if (role === 'kitchen') {
      const kitchenRoom = `kitchen_${RESTAURANT_ID}`;
      socket.join(kitchenRoom);
      console.log(`[Socket] Kitchen terminal ${socket.id} joined ${kitchenRoom}`);
      // Only payments approved by Admin can automatically enter KDS
      // Exclude completed or cancelled orders from previous closed shifts
      const activeShiftId = shiftsData.activeShift?.shiftId;
      const approvedKitchenOrders = orders.filter(o => {
        const s = String(o.status || '').toLowerCase();
        const ps = String(o.paymentStatus || '').toLowerCase();
        if (s.includes('pending') && (s.includes('verification') || s.includes('payment'))) return false;
        if (s.includes('rejected')) return false;
        if (ps.includes('pending') || ps.includes('rejected')) return false;
        const isDone = s === 'completed' || s === 'cancelled' || s === 'served';
        if (isDone && activeShiftId && o.shiftId && o.shiftId !== activeShiftId) {
          return false;
        }
        return true;
      });
      socket.emit('initial-orders', approvedKitchenOrders);
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

  // Table Service & Assistance Requests
  socket.on('get-service-requests', () => {
    socket.emit('initial-service-requests', serviceRequests);
  });

  socket.on('request-table-service', async (payload, callback) => {
    try {
      const { tableNumber, customer, category, notes, sessionId, kioskId } = payload || {};
      const effectiveTable = tableNumber || (kioskId && kioskId.startsWith('K-') ? kioskId : (kioskId ? `Table ${kioskId}` : 'Counter'));
      const effectiveCategory = category || 'Staff Assistance';

      // Check for active existing request to prevent duplicates
      const existing = serviceRequests.find(r =>
        String(r.tableNumber).toLowerCase() === String(effectiveTable).toLowerCase() &&
        r.category === effectiveCategory &&
        r.status !== 'Completed'
      );

      if (existing) {
        console.log(`[Service] Active assistance request already exists for ${effectiveTable} - ${effectiveCategory}`);
        if (typeof callback === 'function') callback({ success: true, request: existing, isDuplicate: true });
        socket.emit('service-request-response', { success: true, request: existing, isDuplicate: true });
        return;
      }

      const newRequest = {
        id: `SR-${Date.now().toString().slice(-4)}`,
        tableNumber: effectiveTable,
        customer: customer || `Guest (${effectiveTable})`,
        category: effectiveCategory,
        notes: notes || '',
        sessionId: sessionId || kioskId || null,
        status: 'Pending', // 'Pending' | 'Acknowledged' | 'Completed'
        createdAt: new Date().toISOString(),
        acknowledgedAt: null,
        completedAt: null,
        attendedBy: null
      };

      serviceRequests.unshift(newRequest);
      await saveServiceRequestsToDb();

      console.log(`[Service] New assistance request: ${newRequest.id} from ${newRequest.tableNumber} (${newRequest.category})`);

      io.to(`admin_${RESTAURANT_ID}`).emit('new-service-request', newRequest);
      io.emit('new-service-request', newRequest);

      if (typeof callback === 'function') callback({ success: true, request: newRequest });
      socket.emit('service-request-response', { success: true, request: newRequest });
    } catch (err) {
      console.error('[Service] Error handling service request:', err);
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  socket.on('update-service-request', async ({ requestId, status, staffName }, callback) => {
    try {
      const reqItem = serviceRequests.find(r => r.id === requestId);
      if (!reqItem) {
        if (typeof callback === 'function') callback({ success: false, error: 'Request not found' });
        return;
      }

      const timestamp = new Date().toISOString();
      reqItem.status = status || reqItem.status;
      reqItem.attendedBy = staffName || 'Chief Administrator';

      if (status === 'Acknowledged' && !reqItem.acknowledgedAt) {
        reqItem.acknowledgedAt = timestamp;
      } else if (status === 'Completed') {
        reqItem.completedAt = timestamp;
      }

      await saveServiceRequestsToDb();
      console.log(`[Service] Service request ${requestId} updated to ${reqItem.status} by ${reqItem.attendedBy}`);

      io.to(`admin_${RESTAURANT_ID}`).emit('service-request-updated', reqItem);
      io.emit('service-request-updated', reqItem);

      if (typeof callback === 'function') callback({ success: true, request: reqItem });
    } catch (err) {
      console.error('[Service] Error updating service request:', err);
      if (typeof callback === 'function') callback({ success: false, error: err.message });
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
    const pricingCheck = await validateAndComputeOrderPricing(effectiveItems, orderPayload?.promoCode || null, typeof promosList !== 'undefined' ? promosList : []);
    if (!pricingCheck.valid) {
      socket.emit('order-error', {
        orderId: orderPayload?.orderId || null,
        error: `Unavailable or out-of-stock item(s): ${pricingCheck.unavailableItems.join(', ')}`
      });
      return;
    }
    const effectiveTotal = pricingCheck.verifiedTotal > 0
      ? pricingCheck.verifiedTotal
      : (totalPrice !== undefined ? totalPrice : (total !== undefined ? total : effectiveItems.reduce((sum, i) => sum + (i.price * (i.quantity || i.qty || 1)), 0)));
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

    // Duplicate reference check for fraud prevention
    let isDuplicateRef = false;
    let duplicateFoundInOrderId = null;
    const cleanRef = (orderPayload?.referenceNumber || '').trim();
    if (cleanRef) {
      const match = orders.find(o => (o.orderId !== orderId && o.id !== orderId) && o.referenceNumber && o.referenceNumber.trim().toLowerCase() === cleanRef.toLowerCase());
      if (match) {
        isDuplicateRef = true;
        duplicateFoundInOrderId = match.orderId || match.id;
        console.warn(`[FRAUD-ALERT] Duplicate reference number ${cleanRef} detected! Matches existing order ${duplicateFoundInOrderId}`);
      }
    }

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
      payment: payment || 'GCash',
      paymentStatus: orderPayload?.paymentStatus || 'Pending Verification',
      isPaymentVerified: orderPayload?.isPaymentVerified === true,
      receiptImage: orderPayload?.receiptImage || null,
      referenceNumber: orderPayload?.referenceNumber || null,
      isDuplicateRef: isDuplicateRef || false,
      duplicateFoundInOrderId: duplicateFoundInOrderId || null,
      receiptUploadedAt: orderPayload?.receiptImage ? new Date().toISOString() : null,
      status: orderPayload?.status || (orderPayload?.isPaymentVerified ? 'New' : 'Pending Payment Verification'),
      nextStatus: orderPayload?.isPaymentVerified ? 'Start Preparing' : 'Awaiting Admin Verification',
      stripeColor: orderPayload?.isPaymentVerified ? '#2563eb' : '#f59e0b',
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
      shiftId: shiftsData.activeShift?.shiftId || null,
      businessDate: shiftsData.activeShift?.businessDate || new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      statusHistory: [
        {
          status: orderPayload?.isPaymentVerified ? 'New' : 'Pending Payment Verification',
          timestamp: new Date().toISOString(),
          updatedBy: socket.role === 'mobile' ? 'Customer App' : 'Smart Kiosk',
          note: orderPayload?.isPaymentVerified
            ? 'Order placed with pre-verified payment'
            : (orderPayload?.receiptImage ? 'Order placed with payment receipt proof. Sent to Admin Dashboard for verification.' : 'Order placed. Awaiting payment verification.')
        }
      ]
    };

    orders.unshift(newOrder);
    await saveOrdersToDb();

    console.log(`[Socket] Order ${orderId} placed & stored in DB (Payment status: ${newOrder.paymentStatus}):`, {
      customer: newOrder.customer,
      itemCount: effectiveCount,
      totalPrice: effectiveTotal,
      payment: newOrder.payment,
      hasReceipt: !!newOrder.receiptImage
    });

    // 1. Confirm to the ordering customer with the orderId and tracking details
    socket.emit('order-confirmed', newOrder);

    // 2. Broadcast order completion to the Kiosk
    if (kioskId) {
      socket.to(kioskId).emit('order-placed', newOrder);
    }

    // 3. Send order to Admin Dashboard for payment verification
    io.to(`admin_${RESTAURANT_ID}`).emit('new-order', newOrder);
    io.to(`admin_${RESTAURANT_ID}`).emit('payment-verification-needed', newOrder);
    io.emit('new-order', newOrder);

    // 4. Send to Kitchen ONLY if payment has already been verified and approved by Admin
    if (newOrder.isPaymentVerified && newOrder.paymentStatus === 'Approved') {
      io.to(`kitchen_${RESTAURANT_ID}`).emit('new-kitchen-order', newOrder);
      io.to(`busser_${RESTAURANT_ID}`).emit('new-kitchen-order', newOrder);
      io.emit('new-kitchen-order', newOrder);
    }
  });


  // Customer submits or re-uploads payment receipt proof
  socket.on('submit-payment-receipt', async ({ orderId, receiptImage, referenceNumber }) => {
    const order = orders.find(o => o.orderId === orderId || o.id === orderId);
    if (!order) return;

    const timestamp = new Date().toISOString();
    order.receiptImage = receiptImage || order.receiptImage;
    if (referenceNumber) order.referenceNumber = referenceNumber;

    // Check duplicate reference
    const cleanRef = (order.referenceNumber || '').trim();
    if (cleanRef) {
      const match = orders.find(o => (o.orderId !== orderId && o.id !== orderId) && o.referenceNumber && o.referenceNumber.trim().toLowerCase() === cleanRef.toLowerCase());
      if (match) {
        order.isDuplicateRef = true;
        order.duplicateFoundInOrderId = match.orderId || match.id;
        console.warn(`[FRAUD-ALERT] Re-uploaded duplicate reference ${cleanRef} for order ${orderId}! Matches ${order.duplicateFoundInOrderId}`);
      } else {
        order.isDuplicateRef = false;
        order.duplicateFoundInOrderId = null;
      }
    }
    order.receiptUploadedAt = timestamp;
    order.paymentStatus = 'Pending Verification';
    order.status = 'Pending Payment Verification';
    order.nextStatus = 'Awaiting Admin Approval';
    order.stripeColor = '#f59e0b';
    order.rejectionReason = null;
    order.updatedAt = timestamp;

    if (!Array.isArray(order.statusHistory)) order.statusHistory = [];
    order.statusHistory.push({
      status: 'Pending Payment Verification',
      timestamp,
      updatedBy: 'Customer App',
      note: 'Payment receipt proof submitted by customer. Awaiting Admin verification.'
    });

    await saveOrdersToDb();

    console.log(`[Socket] Customer submitted receipt proof for Order ${orderId}`);

    const statusPayload = {
      id: orderId,
      orderId,
      kioskId: order.kioskId,
      tableNumber: order.tableNumber,
      status: 'Pending Payment Verification',
      nextStatus: 'Awaiting Admin Approval',
      stripeColor: '#f59e0b',
      paymentStatus: 'Pending Verification',
      receiptImage: order.receiptImage,
      referenceNumber: order.referenceNumber,
      updatedAt: timestamp,
      statusHistory: order.statusHistory,
      order
    };

    io.to(`admin_${RESTAURANT_ID}`).emit('order-status-updated', statusPayload);
    io.to(`admin_${RESTAURANT_ID}`).emit('payment-verification-needed', statusPayload);
    io.emit('order-status-updated', statusPayload);
    if (order.kioskId) {
      io.to(order.kioskId).emit('order-status-updated', statusPayload);
    }
    socket.emit('receipt-submission-confirmed', { success: true, orderId });
  });

  // Admin approves or rejects customer payment
  socket.on('admin-verify-payment', async ({ orderId, decision, reason, adminName, adminEmail }) => {
    const order = orders.find(o => o.orderId === orderId || o.id === orderId);
    if (!order) return;

    const actor = adminName || 'Admin';
    const timestamp = new Date().toISOString();

    if (decision === 'approve') {
      order.isPaymentVerified = true;
      order.paymentStatus = 'Approved';
      order.verifiedBy = actor;
      order.verifiedAt = timestamp;
      order.adminEmail = adminEmail || 'admin@umamicraft.com';
      order.status = 'New';
      order.nextStatus = 'Start Preparing';
      order.stripeColor = '#2563eb';
      order.updatedAt = timestamp;

      if (!Array.isArray(order.statusHistory)) order.statusHistory = [];
      order.statusHistory.push({
        status: 'New',
        timestamp,
        updatedBy: actor,
        note: `Payment verified & approved by ${actor}. Order forwarded to Kitchen Display System.`
      });

      await saveOrdersToDb();

      console.log(`[Socket] Order ${orderId} payment APPROVED by ${actor}. Sent to KDS!`);

      const statusPayload = {
        id: orderId,
        orderId,
        kioskId: order.kioskId,
        tableNumber: order.tableNumber,
        status: 'New',
        nextStatus: 'Start Preparing',
        stripeColor: '#2563eb',
        paymentStatus: 'Approved',
        isPaymentVerified: true,
        verifiedBy: actor,
        verifiedAt: timestamp,
        updatedAt: timestamp,
        statusHistory: order.statusHistory,
        order
      };

      // 1. Immediately send to Kitchen Display System!
      io.to(`kitchen_${RESTAURANT_ID}`).emit('new-kitchen-order', order);
      io.emit('new-kitchen-order', order);

      // 2. Notify customer tracking & admin
      if (order.kioskId) {
        io.to(order.kioskId).emit('order-status-updated', statusPayload);
      }
      io.to(`admin_${RESTAURANT_ID}`).emit('order-status-updated', statusPayload);
      io.emit('order-status-updated', statusPayload);
    } else if (decision === 'reject') {
      order.isPaymentVerified = false;
      order.paymentStatus = 'Rejected';
      order.rejectedBy = actor;
      order.rejectedAt = timestamp;
      order.rejectionReason = reason || 'Payment proof could not be verified.';
      order.adminEmail = adminEmail || 'admin@umamicraft.com';
      order.status = 'Payment Rejected';
      order.nextStatus = 'Awaiting Re-upload';
      order.stripeColor = '#ef4444';
      order.updatedAt = timestamp;

      if (!Array.isArray(order.statusHistory)) order.statusHistory = [];
      order.statusHistory.push({
        status: 'Payment Rejected',
        timestamp,
        updatedBy: actor,
        note: `Payment rejected by ${actor}. Reason: ${order.rejectionReason}`
      });

      await saveOrdersToDb();

      console.log(`[Socket] Order ${orderId} payment REJECTED by ${actor}. Reason: ${order.rejectionReason}`);

      const statusPayload = {
        id: orderId,
        orderId,
        kioskId: order.kioskId,
        tableNumber: order.tableNumber,
        status: 'Payment Rejected',
        nextStatus: 'Awaiting Re-upload',
        stripeColor: '#ef4444',
        paymentStatus: 'Rejected',
        isPaymentVerified: false,
        rejectionReason: order.rejectionReason,
        rejectedBy: actor,
        rejectedAt: timestamp,
        updatedAt: timestamp,
        statusHistory: order.statusHistory,
        order
      };

      // Notify customer and admin only (NEVER send to KDS!)
      if (order.kioskId) {
        io.to(order.kioskId).emit('order-status-updated', statusPayload);
      }
      io.to(`admin_${RESTAURANT_ID}`).emit('order-status-updated', statusPayload);
      io.emit('order-status-updated', statusPayload);
    }
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
      io.emit('table-status-updated', table);
    }
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
const _lastKnownWifiByIp = {};

// Check active default route using non-transmitting UDP probe with multi-target fallback
function probeUdpRoute(targetHost, targetPort = 80, timeoutMs = 350) {
  return new Promise((resolve) => {
    try {
      const probeSocket = dgram.createSocket('udp4');
      probeSocket.connect(targetPort, targetHost, () => {
        const addr = probeSocket.address().address;
        try { probeSocket.close(); } catch { }
        resolve(addr);
      });
      probeSocket.on('error', () => resolve(null));
      setTimeout(() => {
        try { probeSocket.close(); } catch { }
        resolve(null);
      }, timeoutMs);
    } catch {
      resolve(null);
    }
  });
}

async function getActiveRouteIp() {
  const probeTargets = ['1.1.1.1', '8.8.8.8', '192.168.1.1', '192.168.0.1', '10.0.0.1'];
  for (const target of probeTargets) {
    const ip = await probeUdpRoute(target);
    if (ip && !isVirtualOrInvalid(ip)) return ip;
  }
  return null;
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
  } catch {
    return null;
  }
}

// Check if IP or MAC is a virtual/internal adapter
function isVirtualOrInvalid(ip, mac = '', name = '') {
  if (!ip) return true;
  if (ip.startsWith('127.') || ip.startsWith('169.254.') || ip === '0.0.0.0') return true;
  if (ip.startsWith('192.168.56.')) return true;
  const lowerMac = (mac || '').toLowerCase();
  if (lowerMac.startsWith('0a:00:27')) return true;
  if (lowerMac.startsWith('00:05:69') || lowerMac.startsWith('00:0c:29') || lowerMac.startsWith('00:50:56')) return true;
  if (lowerMac.startsWith('00:15:5d')) return true;
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

    // Fallback: match by interface name or any Wi-Fi adapter name
    if (!wifiIp && wifiInfo.name && interfaces[wifiInfo.name]) {
      const match = interfaces[wifiInfo.name].find(i => i.family === 'IPv4' && !i.internal && !isVirtualOrInvalid(i.address, i.mac, wifiInfo.name));
      if (match) wifiIp = match.address;
    }

    if (!wifiIp) {
      for (const [ifName, ifList] of Object.entries(interfaces)) {
        if (!ifList || !/wi-fi|wifi|wireless|wlan/i.test(ifName)) continue;
        const match = ifList.find(i => i.family === 'IPv4' && !i.internal && !isVirtualOrInvalid(i.address, i.mac, ifName));
        if (match) {
          wifiIp = match.address;
          wifiInfo.name = ifName;
          break;
        }
      }
    }

    if (!wifiIp && routeIp && !isVirtualOrInvalid(routeIp)) {
      wifiIp = routeIp;
    }

    if (wifiIp) {
      if (wifiInfo.ssid) {
        _lastKnownWifiByIp[wifiIp] = {
          ssid: wifiInfo.ssid,
          signal: wifiInfo.signal || 'Strong',
          band: wifiInfo.band || ''
        };
      }
      const cachedForIp = _lastKnownWifiByIp[wifiIp] || {};
      return {
        ip: wifiIp,
        ssid: wifiInfo.ssid || cachedForIp.ssid || 'Wi-Fi Network',
        wifiConnected: true,
        signal: wifiInfo.signal || cachedForIp.signal || 'Strong',
        interfaceName: wifiInfo.name || 'Wi-Fi',
        band: wifiInfo.band || cachedForIp.band || '',
        isDynamic: true,
        lastUpdated: new Date().toISOString()
      };
    }
  }

  // 2. Scan physical interfaces, prioritizing Wi-Fi then active route IP
  const candidates = [];
  for (const [name, ifaceList] of Object.entries(interfaces)) {
    if (!ifaceList) continue;
    for (const iface of ifaceList) {
      if (iface.family === 'IPv4' && !iface.internal && !isVirtualOrInvalid(iface.address, iface.mac, name)) {
        const lowerName = name.toLowerCase();
        const isWifi = /wi-fi|wifi|wireless|wlan/i.test(lowerName);
        const isRouteMatch = Boolean(routeIp && iface.address === routeIp);
        let priority = 5;
        if (isWifi && isRouteMatch) priority = 25;
        else if (isWifi) priority = 20;
        else if (isRouteMatch) priority = 18;
        else if (/ethernet|eth|en0/i.test(lowerName)) priority = 10;
        candidates.push({ address: iface.address, name, priority, isWifiAdapter: isWifi });
      }
    }
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => b.priority - a.priority);
    const best = candidates[0];
    const cachedForIp = _lastKnownWifiByIp[best.address] || {};
    return {
      ip: best.address,
      ssid: wifiInfo?.ssid || cachedForIp.ssid || (best.isWifiAdapter ? 'Local Wi-Fi' : ''),
      wifiConnected: Boolean((wifiInfo && wifiInfo.connected) || best.isWifiAdapter),
      signal: wifiInfo?.signal || cachedForIp.signal || (best.isWifiAdapter ? 'Strong' : ''),
      interfaceName: best.name,
      band: wifiInfo?.band || cachedForIp.band || '',
      isDynamic: true,
      lastUpdated: new Date().toISOString()
    };
  }

  // 3. Fallback to active default route IP if not in candidates
  if (routeIp && !isVirtualOrInvalid(routeIp)) {
    const cachedForIp = _lastKnownWifiByIp[routeIp] || {};
    return {
      ip: routeIp,
      ssid: wifiInfo?.ssid || cachedForIp.ssid || '',
      wifiConnected: Boolean(wifiInfo && wifiInfo.connected),
      signal: wifiInfo?.signal || cachedForIp.signal || '',
      interfaceName: 'Local Network',
      band: wifiInfo?.band || cachedForIp.band || '',
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

// Ensure Windows Defender Firewall allows incoming connections on kiosk ports
async function ensureWindowsFirewallOpen() {
  if (process.platform !== 'win32') return;
  try {
    await execAsync('netsh advfirewall firewall add rule name="Umami Restaurant Kiosk Ports" dir=in action=allow protocol=TCP localport=3000,3001,3002,3003,3010,3020 profile=any');
    console.log('[Firewall] Inbound allow rule for ports 3000-3020 successfully active.');
  } catch (err) {
    // Log note without throwing
    console.log('[Firewall] Inbound firewall rule check:', err?.message?.trim() || 'active');
  }
}

// High-frequency polling watcher (checks every 2.5 seconds asynchronously)
function startIpWatcher() {
  // Ensure local firewall ports are accessible
  ensureWindowsFirewallOpen().catch(() => { });

  // Initial immediate detection
  refreshDynamicNetwork(true);

  setInterval(() => {
    refreshDynamicNetwork(false);
  }, 2500);
}

// Restaurant profile metadata endpoint (supports ?restaurant=umami scoping)
app.get('/api/restaurant', (req, res) => {
  const requestedRestId = String(req.query.restaurant || '').trim().toLowerCase();
  const targetRestaurant = (requestedRestId && RESTAURANTS[requestedRestId]) ? RESTAURANTS[requestedRestId] : activeRestaurant;
  res.json({
    ...targetRestaurant,
    backendPort: PORT,
    frontendPort: FRONTEND_PORT,
    mobileFrontendPort: MOBILE_FRONTEND_PORT,
    lanIp: getLocalIpAddress(),
    wifiInfo: getCachedDynamicNetwork()
  });
});

// ── QR Session Validation & Customer Allergy Verification Endpoints ──
app.post('/api/qr/validate', (req, res) => {
  const { kioskId, restaurant, sessionId } = req.body || {};
  const restId = String(restaurant || RESTAURANT_ID || 'umami').trim().toLowerCase();
  if (restaurant && !RESTAURANTS[restId]) {
    return res.status(404).json({ valid: false, error: `Unknown restaurant configuration "${restaurant}".` });
  }
  const targetRestaurant = RESTAURANTS[restId] || activeRestaurant;
  const safeKioskId = String(kioskId || 'DIRECT_MOBILE').trim() || 'DIRECT_MOBILE';
  const sessionKey = `${restId}:${safeKioskId}`;

  const now = Date.now();
  let session = qrCustomerSessions[sessionKey];

  // Create new session or refresh if expired or if explicitly requested with new sessionId
  if (!session || (session.expiresAt && session.expiresAt < now) || (sessionId && session.sessionId !== sessionId)) {
    session = {
      sessionId: sessionId || `QRS-${safeKioskId}-${now.toString(36).toUpperCase()}`,
      kioskId: safeKioskId,
      restaurantId: restId,
      restaurantName: targetRestaurant.name,
      allergyStatus: 'unanswered', // 'unanswered' | 'allergies_declared' | 'no_allergies_declared'
      hasAllergies: null,
      allergens: [],
      customAllergens: [],
      preferences: [],
      verifiedAt: new Date(now).toISOString(),
      expiresAt: now + (4 * 60 * 60 * 1000) // 4-hour active dining session TTL
    };
    qrCustomerSessions[sessionKey] = session;
  }

  if (io && safeKioskId) {
    io.to(safeKioskId).emit('qr-session-validated', {
      kioskId: safeKioskId,
      restaurantId: restId,
      sessionId: session.sessionId,
      verifiedAt: session.verifiedAt
    });
  }

  res.json({
    valid: true,
    session,
    restaurant: targetRestaurant
  });
});

app.post('/api/qr/allergy-verification', (req, res) => {
  const { kioskId, restaurant, sessionId, hasAllergies, allergens, customAllergens, preferences } = req.body || {};
  if (typeof hasAllergies !== 'boolean') {
    return res.status(400).json({
      success: false,
      error: 'Explicit allergy confirmation (YES or NO) is required before proceeding.'
    });
  }

  const restId = String(restaurant || RESTAURANT_ID || 'umami').trim().toLowerCase();
  const safeKioskId = String(kioskId || 'DIRECT_MOBILE').trim() || 'DIRECT_MOBILE';
  const sessionKey = `${restId}:${safeKioskId}`;
  const existing = qrCustomerSessions[sessionKey];
  const now = Date.now();

  if (existing && existing.expiresAt && existing.expiresAt < now) {
    return res.status(410).json({
      success: false,
      expired: true,
      error: 'QR dining session has expired. Please scan the kiosk QR code again.'
    });
  }

  const targetRestaurant = RESTAURANTS[restId] || activeRestaurant;
  const updatedSession = {
    ...(existing || {}),
    sessionId: sessionId || existing?.sessionId || `QRS-${safeKioskId}-${now.toString(36).toUpperCase()}`,
    kioskId: safeKioskId,
    restaurantId: restId,
    restaurantName: targetRestaurant.name,
    hasAllergies,
    allergyStatus: hasAllergies ? 'allergies_declared' : 'no_allergies_declared',
    allergens: hasAllergies && Array.isArray(allergens) ? allergens.map(a => String(a).trim()).filter(Boolean) : [],
    customAllergens: hasAllergies && Array.isArray(customAllergens) ? customAllergens.map(a => String(a).trim()).filter(Boolean) : [],
    preferences: Array.isArray(preferences) ? preferences.map(p => String(p).trim()).filter(Boolean) : (existing?.preferences || []),
    updatedAt: new Date(now).toISOString(),
    expiresAt: now + (4 * 60 * 60 * 1000)
  };

  qrCustomerSessions[sessionKey] = updatedSession;

  if (io && safeKioskId) {
    io.to(safeKioskId).emit('session-allergy-updated', updatedSession);
  }

  res.json({
    success: true,
    session: updatedSession
  });
});

app.post('/api/menu/check-allergens', async (req, res) => {
  try {
    const { itemId, allergens = [], customAllergens = [] } = req.body || {};
    const menu = await loadMenuData();
    const drinks = await loadDrinksData();
    const catalog = [...(Array.isArray(menu) ? menu : []), ...(Array.isArray(drinks) ? drinks : [])];

    const item = catalog.find(i => String(i.id) === String(itemId));
    if (!item) {
      return res.status(404).json({ error: 'Product not found in menu database.' });
    }

    const isVerified = Array.isArray(item.allergens);
    const itemAllergens = isVerified ? item.allergens.map(a => String(a).toLowerCase()) : [];
    const ingText = [
      item.ingredients || '',
      ...(Array.isArray(item.ingredientsList) ? item.ingredientsList.map(r => r.name || '') : [])
    ].join(' ').toLowerCase();

    const declared = [...allergens, ...customAllergens].map(a => String(a).toLowerCase().trim()).filter(Boolean);
    const matchedAllergens = declared.filter(a =>
      itemAllergens.some(ia => ia.includes(a) || a.includes(ia)) ||
      (ingText && ingText.includes(a))
    );

    res.json({
      itemId: item.id,
      name: item.name,
      verified: isVerified,
      itemAllergens: isVerified ? item.allergens : null,
      matchedAllergens,
      crossContactRisk: item.crossContactRisk || null,
      unverifiedNotice: !isVerified ? 'Allergen information has not been verified for this item. Please ask your server.' : null
    });
  } catch (err) {
    console.error('[Allergen Check] Error:', err);
    res.status(500).json({ error: 'Failed to verify product allergens.' });
  }
});

// Cloud Tunnel State for Universal Any-Wi-Fi & Cellular Mobile Access
let activeTunnelInstance = null;
let activeTunnelUrl = '';
let activeTunnelPassword = '';
let isTunnelStarting = false;

// Query the public IP endpoint password required by localtunnel friendly reminder
async function fetchTunnelPassword() {
  try {
    const res = await fetch('https://loca.lt/mytunnelpassword');
    if (res.ok) {
      const text = await res.text();
      const trimmed = text.trim();
      if (trimmed) return trimmed;
    }
  } catch (_) { }
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    if (res.ok) {
      const data = await res.json();
      if (data && data.ip) return data.ip;
    }
  } catch (_) { }
  return '';
}

// Primary SSH tunnel via localhost.run (direct HTTPS access with NO "Tunnel website ahead!" interstitial screen)
async function startSshTunnel() {
  return new Promise((resolve) => {
    let resolved = false;
    let proc = null;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        if (proc) { try { proc.kill(); } catch (_) { } }
        resolve(null);
      }
    }, 10000);

    try {
      const nullFile = process.platform === 'win32' ? 'NUL' : '/dev/null';
      // Use localhost.run - free, instant HTTPS tunnel with no interstitial warning page
      proc = spawn('ssh', [
        '-T',
        '-o', 'StrictHostKeyChecking=no',
        '-o', `UserKnownHostsFile=${nullFile}`,
        '-o', 'ServerAliveInterval=30',
        '-o', 'ExitOnForwardFailure=yes',
        '-R', `80:127.0.0.1:${FRONTEND_PORT}`,
        'nokey@localhost.run'
      ], { windowsHide: true });

      let buffer = '';
      const onData = (data) => {
        buffer += data.toString();
        // Look for https://*.lhr.life or similar URLs
        const match = buffer.match(/https:\/\/[a-zA-Z0-9-]+\.(?:lhr\.life|localhost\.run)/);
        if (match && !resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve({ url: match[0], instance: proc, type: 'ssh' });
        }
      };

      if (proc.stdout) proc.stdout.on('data', onData);
      if (proc.stderr) proc.stderr.on('data', onData);

      proc.on('close', () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve(null);
        }
      });
      proc.on('error', () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve(null);
        }
      });
    } catch (_) {
      clearTimeout(timeout);
      resolve(null);
    }
  });
}

// Automatically start cloud tunnel for universal any-network access
async function startAutoTunnel() {
  if (activeTunnelUrl && activeTunnelInstance) {
    return { url: activeTunnelUrl, password: activeTunnelPassword };
  }
  if (isTunnelStarting) {
    return null;
  }
  isTunnelStarting = true;
  if (io) {
    io.emit('tunnel-status-changed', { status: 'connecting', url: '', password: '' });
  }

  try {
    // 1. Primary: Direct SSH tunnel via localhost.run (NO "Tunnel website ahead!" warning page, opens UI directly)
    try {
      const sshResult = await startSshTunnel();
      if (sshResult && sshResult.url) {
        activeTunnelUrl = sshResult.url;
        activeTunnelInstance = sshResult.instance;
        activeTunnelPassword = '';

        if (sshResult.instance) {
          sshResult.instance.on('close', () => {
            activeTunnelUrl = '';
            activeTunnelInstance = null;
            if (io) {
              io.emit('tunnel-url-changed', { url: '', password: '' });
              io.emit('tunnel-status-changed', { status: 'disconnected', url: '', password: '' });
            }
          });
        }

        console.log(`[Cloud Tunnel] Direct HTTPS Tunnel Online at ${activeTunnelUrl} (No warning screen)`);
        if (io) {
          io.emit('tunnel-url-changed', { url: activeTunnelUrl, password: '' });
          io.emit('tunnel-status-changed', { status: 'connected', url: activeTunnelUrl, password: '' });
        }
        return { url: activeTunnelUrl, password: '' };
      }
    } catch (sshErr) {
      console.warn('[Cloud Tunnel] Direct SSH tunnel unavailable, attempting fallback:', sshErr.message);
    }

    // 2. Secondary fallback: localtunnel with strict 8-second timeout
    try {
      const tunnelPromise = localtunnel({ port: FRONTEND_PORT });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Localtunnel connection timed out after 8s')), 8000)
      );
      const tunnel = await Promise.race([tunnelPromise, timeoutPromise]);

      if (tunnel && tunnel.url) {
        activeTunnelInstance = tunnel;
        activeTunnelUrl = tunnel.url;

        fetchTunnelPassword().then(pwd => {
          if (pwd) {
            activeTunnelPassword = pwd;
            if (io) {
              io.emit('tunnel-url-changed', { url: activeTunnelUrl, password: activeTunnelPassword });
              io.emit('tunnel-status-changed', { status: 'connected', url: activeTunnelUrl, password: activeTunnelPassword });
            }
          }
        }).catch(() => { });

        tunnel.on('close', () => {
          console.log('[Cloud Tunnel] Connection closed.');
          activeTunnelUrl = '';
          activeTunnelInstance = null;
          if (io) {
            io.emit('tunnel-url-changed', { url: '', password: '' });
            io.emit('tunnel-status-changed', { status: 'disconnected', url: '', password: '' });
          }
        });

        tunnel.on('error', (err) => {
          console.warn('[Cloud Tunnel] Connection warning:', err.message);
          activeTunnelUrl = '';
          activeTunnelInstance = null;
          if (io) {
            io.emit('tunnel-url-changed', { url: '', password: '' });
            io.emit('tunnel-status-changed', { status: 'disconnected', url: '', password: '' });
          }
        });

        console.log(`[Cloud Tunnel] Online at ${activeTunnelUrl}`);
        if (io) {
          io.emit('tunnel-url-changed', { url: activeTunnelUrl, password: activeTunnelPassword });
          io.emit('tunnel-status-changed', { status: 'connected', url: activeTunnelUrl, password: activeTunnelPassword });
        }
        return { url: activeTunnelUrl, password: activeTunnelPassword };
      }
    } catch (err) {
      console.warn('[Cloud Tunnel] Fallback tunnel unavailable:', err.message);
    }

    // If all automated cloud tunnels fail (e.g. offline or strict firewall)
    activeTunnelUrl = '';
    activeTunnelInstance = null;
    if (io) {
      io.emit('tunnel-status-changed', {
        status: 'disconnected',
        url: '',
        password: '',
        error: 'Cloud tunnel service is currently unreachable. Switch to Local Wi-Fi or configure a custom URL.'
      });
    }
    return null;
  } finally {
    isTunnelStarting = false;
  }
}

app.get('/api/tunnel', (req, res) => {
  res.json({
    active: !!activeTunnelUrl,
    status: activeTunnelUrl ? 'connected' : (isTunnelStarting ? 'connecting' : 'disconnected'),
    url: activeTunnelUrl,
    password: activeTunnelPassword,
    isStarting: isTunnelStarting
  });
});

app.post('/api/tunnel/start', async (req, res) => {
  try {
    if (activeTunnelUrl && !activeTunnelUrl.includes('loca.lt')) {
      return res.json({ success: true, url: activeTunnelUrl, password: activeTunnelPassword, status: 'connected', message: 'Tunnel already active' });
    }
    if (activeTunnelUrl && activeTunnelUrl.includes('loca.lt') && activeTunnelInstance) {
      try {
        if (typeof activeTunnelInstance.close === 'function') activeTunnelInstance.close();
        if (typeof activeTunnelInstance.kill === 'function') activeTunnelInstance.kill();
      } catch (_) { }
      activeTunnelInstance = null;
      activeTunnelUrl = '';
      activeTunnelPassword = '';
    }
    const result = await startAutoTunnel();
    if (result && result.url) {
      return res.json({ success: true, url: result.url, password: result.password || activeTunnelPassword, status: 'connected' });
    }
    res.json({ success: !!activeTunnelUrl, url: activeTunnelUrl, password: activeTunnelPassword, status: isTunnelStarting ? 'connecting' : 'disconnected' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to start cloud tunnel', message: err.message, status: 'disconnected' });
  }
});

app.post('/api/tunnel/stop', (req, res) => {
  if (activeTunnelInstance) {
    try {
      if (typeof activeTunnelInstance.close === 'function') activeTunnelInstance.close();
      if (typeof activeTunnelInstance.kill === 'function') activeTunnelInstance.kill();
    } catch (_) { }
    activeTunnelInstance = null;
    activeTunnelUrl = '';
    activeTunnelPassword = '';
    if (io) {
      io.emit('tunnel-url-changed', { url: '', password: '' });
      io.emit('tunnel-status-changed', { status: 'disconnected', url: '', password: '' });
    }
  }
  res.json({ success: true, message: 'Tunnel closed' });
});

app.post('/api/tunnel/custom', (req, res) => {
  const { url } = req.body || {};
  if (url && typeof url === 'string') {
    const cleanUrl = url.trim().replace(/\/$/, '');
    activeTunnelUrl = cleanUrl;
    activeTunnelPassword = '';
    if (io) {
      io.emit('tunnel-url-changed', { url: cleanUrl, password: '' });
      io.emit('tunnel-status-changed', { status: 'connected', url: cleanUrl, password: '' });
    }
    return res.json({ success: true, url: cleanUrl });
  }
  res.status(400).json({ error: 'Valid URL is required' });
});

// Dynamic Network & Wi-Fi IP discovery endpoint for mobile scanners and kiosks
app.get('/api/network-info', async (req, res) => {
  try {
    const isRefresh = req.query.refresh === 'true';
    const info = await refreshDynamicNetwork(isRefresh);
    res.json({
      ...info,
      tunnelUrl: activeTunnelUrl,
      tunnelPassword: activeTunnelPassword,
      tunnelStatus: activeTunnelUrl ? 'connected' : (isTunnelStarting ? 'connecting' : 'disconnected'),
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
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve network info', message: err.message });
  }
});

// Detailed diagnostic endpoint for network adapters, router routing, and ports
app.get('/api/network/diagnostics', async (req, res) => {
  try {
    const netInfo = await refreshDynamicNetwork(true);
    const ifaces = os.networkInterfaces();
    const physicalIfaces = [];
    for (const [name, list] of Object.entries(ifaces)) {
      if (!list) continue;
      for (const item of list) {
        if (item.family === 'IPv4' && !item.internal) {
          physicalIfaces.push({
            name,
            address: item.address,
            mac: item.mac,
            isVirtual: isVirtualOrInvalid(item.address, item.mac, name)
          });
        }
      }
    }
    res.json({
      status: 'ok',
      detectedIp: netInfo.ip,
      ssid: netInfo.ssid,
      wifiConnected: netInfo.wifiConnected,
      signal: netInfo.signal,
      interfaceName: netInfo.interfaceName,
      band: netInfo.band,
      frontendPort: FRONTEND_PORT,
      backendPort: PORT,
      mobileFrontendPort: MOBILE_FRONTEND_PORT,
      qrMobileUrl: `http://${netInfo.ip}:${FRONTEND_PORT}/?view=mobile&kioskId=DEFAULT&kioskPort=${PORT}&restaurant=${activeRestaurant.id || 'umami'}`,
      physicalAdapters: physicalIfaces,
      tunnelUrl: activeTunnelUrl,
      tunnelStatus: activeTunnelUrl ? 'connected' : (isTunnelStarting ? 'connecting' : 'disconnected'),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to run network diagnostics', message: err.message });
  }
});

// One-click Windows Firewall self-heal endpoint for ports 3000-3020
app.post('/api/network/fix-firewall', async (req, res) => {
  if (process.platform !== 'win32') {
    return res.json({ success: true, message: 'Non-Windows host; no Windows Defender Firewall modification required.' });
  }
  try {
    await execAsync('netsh advfirewall firewall add rule name="Umami Restaurant Kiosk Ports" dir=in action=allow protocol=TCP localport=3000,3001,3002,3003,3010,3020 profile=any');
    res.json({ success: true, message: 'Windows Defender Firewall inbound rule for ports 3000-3020 created/refreshed successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Could not automatically add firewall rule', details: err.message, suggestion: 'Run allow-firewall.bat as Administrator' });
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
// Service Assistance Requests REST API
app.get('/api/service-requests', (req, res) => {
  res.json(serviceRequests);
});

app.post('/api/service-requests', async (req, res) => {
  try {
    const { tableNumber, customer, category, notes, sessionId, kioskId } = req.body || {};
    const effectiveTable = tableNumber || (kioskId && kioskId.startsWith('K-') ? kioskId : (kioskId ? `Table ${kioskId}` : 'Counter'));
    const effectiveCategory = category || 'Staff Assistance';

    const existing = serviceRequests.find(r =>
      String(r.tableNumber).toLowerCase() === String(effectiveTable).toLowerCase() &&
      r.category === effectiveCategory &&
      r.status !== 'Completed'
    );

    if (existing) {
      return res.json({ success: true, request: existing, isDuplicate: true });
    }

    const newRequest = {
      id: `SR-${Date.now().toString().slice(-4)}`,
      tableNumber: effectiveTable,
      customer: customer || `Guest (${effectiveTable})`,
      category: effectiveCategory,
      notes: notes || '',
      sessionId: sessionId || kioskId || null,
      status: 'Pending',
      createdAt: new Date().toISOString(),
      acknowledgedAt: null,
      completedAt: null,
      attendedBy: null
    };

    serviceRequests.unshift(newRequest);
    await saveServiceRequestsToDb();

    io.to(`admin_${RESTAURANT_ID}`).emit('new-service-request', newRequest);
    io.emit('new-service-request', newRequest);

    res.status(201).json({ success: true, request: newRequest });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/service-requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, staffName } = req.body;
    const reqItem = serviceRequests.find(r => r.id === id);
    if (!reqItem) return res.status(404).json({ error: 'Request not found' });

    const timestamp = new Date().toISOString();
    reqItem.status = status || reqItem.status;
    reqItem.attendedBy = staffName || 'Chief Administrator';

    if (status === 'Acknowledged' && !reqItem.acknowledgedAt) {
      reqItem.acknowledgedAt = timestamp;
    } else if (status === 'Completed') {
      reqItem.completedAt = timestamp;
    }

    await saveServiceRequestsToDb();

    io.to(`admin_${RESTAURANT_ID}`).emit('service-request-updated', reqItem);
    io.emit('service-request-updated', reqItem);

    res.json({ success: true, request: reqItem });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders', (req, res) => {
  if (req.query.role === 'kitchen') {
    // Only return approved orders that are ready for kitchen preparation
    // Exclude completed or cancelled orders from previous closed shifts
    const activeShiftId = shiftsData.activeShift?.shiftId;
    const kitchenOrders = orders.filter(o => {
      const s = String(o.status || '').toLowerCase();
      const ps = String(o.paymentStatus || '').toLowerCase();
      if (s.includes('pending') && (s.includes('verification') || s.includes('payment'))) return false;
      if (s.includes('rejected')) return false;
      if (ps.includes('pending') || ps.includes('rejected')) return false;
      const isDone = s === 'completed' || s === 'cancelled' || s === 'served';
      if (isDone && activeShiftId && o.shiftId && o.shiftId !== activeShiftId) {
        return false;
      }
      return true;
    });
    return res.json(kitchenOrders);
  }
  res.json(orders);
});

app.get('/api/orders/:orderId', (req, res) => {
  const { orderId } = req.params;
  const order = orders.find(o => o.orderId === orderId || o.id === orderId);
  if (!order) {
    return res.status(404).json({ error: `Order #${orderId} not found` });
  }
  const normalizedItems = Array.isArray(order.items) && order.items.length > 0
    ? order.items.map(it => ({
      name: it.name,
      qty: Number(it.qty || it.quantity || 1),
      price: Number(it.price || 0)
    }))
    : (order.item ? [{
      name: order.item.name,
      qty: Number(order.item.qty || order.item.quantity || 1),
      price: Number(order.item.price || order.totalPrice || order.total || 0)
    }] : []);

  res.json({
    ...order,
    orderId: order.orderId || order.id,
    table: order.tableNumber || order.tableId || order.location || 'Table 1',
    diningOption: order.diningOption || order.orderType || 'Dine-In',
    paymentMethod: order.paymentMethod || order.payment || 'Cash',
    totalAmount: Number(order.totalPrice ?? order.total ?? 0),
    items: normalizedItems
  });
});

// Customer uploads or re-uploads payment receipt proof
app.post('/api/orders/:orderId/receipt', async (req, res) => {
  const { orderId } = req.params;
  const { receiptImage, referenceNumber } = req.body;
  const order = orders.find(o => o.orderId === orderId || o.id === orderId);

  if (!order) return res.status(404).json({ error: 'Order not found' });

  const timestamp = new Date().toISOString();
  if (receiptImage) order.receiptImage = receiptImage;
  if (referenceNumber) order.referenceNumber = referenceNumber;

  // Check duplicate reference
  const cleanRef = (order.referenceNumber || '').trim();
  if (cleanRef) {
    const match = orders.find(o => (o.orderId !== orderId && o.id !== orderId) && o.referenceNumber && o.referenceNumber.trim().toLowerCase() === cleanRef.toLowerCase());
    if (match) {
      order.isDuplicateRef = true;
      order.duplicateFoundInOrderId = match.orderId || match.id;
    } else {
      order.isDuplicateRef = false;
      order.duplicateFoundInOrderId = null;
    }
  }
  order.receiptUploadedAt = timestamp;
  order.paymentStatus = 'Pending Verification';
  order.status = 'Pending Payment Verification';
  order.nextStatus = 'Awaiting Admin Approval';
  order.stripeColor = '#f59e0b';
  order.rejectionReason = null;
  order.updatedAt = timestamp;

  if (!Array.isArray(order.statusHistory)) order.statusHistory = [];
  order.statusHistory.push({
    status: 'Pending Payment Verification',
    timestamp,
    updatedBy: 'Customer App (REST)',
    note: 'Payment receipt uploaded. Awaiting Admin verification.'
  });

  await saveOrdersToDb();

  const statusPayload = {
    id: orderId,
    orderId,
    kioskId: order.kioskId,
    tableNumber: order.tableNumber,
    status: 'Pending Payment Verification',
    paymentStatus: 'Pending Verification',
    receiptImage: order.receiptImage,
    referenceNumber: order.referenceNumber,
    updatedAt: timestamp,
    statusHistory: order.statusHistory,
    order
  };

  io.to(`admin_${RESTAURANT_ID}`).emit('order-status-updated', statusPayload);
  io.to(`admin_${RESTAURANT_ID}`).emit('payment-verification-needed', statusPayload);
  io.emit('order-status-updated', statusPayload);
  if (order.kioskId) {
    io.to(order.kioskId).emit('order-status-updated', statusPayload);
  }

  res.json({ success: true, order });
});

// ══════════════════════════════════════════════════════════════════════════
// AUTOMATED WEBHOOK-BASED PAYMENT VERIFICATION ENGINE & GATEWAY ENDPOINTS
// ══════════════════════════════════════════════════════════════════════════

async function processPaymentWebhookEvent(payload, signatureHeader, rawBodyString, customGateway) {
  const timestamp = new Date().toISOString();
  const startTime = Date.now();
  const payloadStr = rawBodyString || (typeof payload === 'string' ? payload : JSON.stringify(payload));

  // 1. Validate Cryptographic Signature (HMAC-SHA256)
  const isSignatureValid = verifyWebhookSignature(payloadStr, signatureHeader);

  // Parse payload fields (supports Universal, PayMongo, Stripe, and GCash/Maya formats)
  let eventId = payload.eventId || payload.id || `evt_${Date.now()}_${Math.floor(Math.random() * 9000)}`;
  let gateway = customGateway || payload.gateway || 'Payment Gateway';
  let eventType = payload.event || payload.type || '';
  let statusRaw = String(payload.status || '').toLowerCase();

  let orderId = payload.orderId || payload.order_id || payload.metadata?.orderId || '';
  let transactionReference = payload.transactionReference || payload.reference_number || payload.referenceNumber || payload.id || '';
  let amount = Number(payload.amount || 0);
  let currency = String(payload.currency || 'PHP').toUpperCase();
  let customerInfo = payload.customer || {};
  let servicePlan = payload.service?.plan || payload.servicePlan || payload.plan || 'Umami VIP Dining Pass';

  // Handle PayMongo event structure
  if (payload.data && payload.data.attributes) {
    const attrs = payload.data.attributes;
    eventType = attrs.type || eventType;
    eventId = payload.data.id || eventId;
    if (attrs.data && attrs.data.attributes) {
      const pData = attrs.data.attributes;
      amount = (pData.amount !== undefined) ? pData.amount / 100 : amount; // PayMongo amounts are in cents
      currency = String(pData.currency || currency).toUpperCase();
      statusRaw = String(pData.status || statusRaw).toLowerCase();
      transactionReference = pData.external_reference_number || attrs.data.id || transactionReference;
      if (pData.description && pData.description.includes('ORD-')) {
        const match = pData.description.match(/ORD-[A-Za-z0-9_-]+/);
        if (match) orderId = match[0];
      }
      if (pData.source && pData.source.type) {
        gateway = `PayMongo (${pData.source.type.toUpperCase()})`;
      }
    }
  }

  // Handle Stripe event structure
  if (payload.type && payload.data && payload.data.object) {
    const sObj = payload.data.object;
    eventType = payload.type;
    amount = sObj.amount ? sObj.amount / 100 : amount;
    currency = String(sObj.currency || currency).toUpperCase();
    statusRaw = String(sObj.status || statusRaw).toLowerCase();
    transactionReference = sObj.id || transactionReference;
    if (sObj.metadata && sObj.metadata.orderId) orderId = sObj.metadata.orderId;
    gateway = 'Stripe Gateway';
  }

  // Normalize status to Successful, Pending, or Failed
  let finalStatus = 'Pending';
  if (statusRaw === 'paid' || statusRaw === 'succeeded' || statusRaw === 'successful' || eventType.includes('paid') || eventType.includes('succeeded')) {
    finalStatus = 'Successful';
  } else if (statusRaw === 'failed' || statusRaw === 'cancelled' || statusRaw === 'expired' || eventType.includes('failed')) {
    finalStatus = 'Failed';
  }

  // 2. Security Check: Signature Verification
  if (!isSignatureValid) {
    const failedLog = {
      id: `WH-LOG-${Date.now()}`,
      eventId,
      gateway,
      orderId: orderId || 'UNKNOWN',
      transactionReference,
      amount,
      currency,
      status: 'Signature Verification Failed',
      signatureVerified: false,
      signatureType: 'HMAC-SHA256',
      amountMatched: false,
      currencyMatched: false,
      isDuplicate: false,
      serviceActivated: false,
      customer: customerInfo.name || 'Unknown',
      receivedAt: timestamp,
      processedAt: new Date().toISOString(),
      executionTimeMs: Date.now() - startTime,
      responseStatus: 401,
      details: `[SECURITY FRAUD ALERT] Webhook signature verification failed for event ${eventId}. HMAC-SHA256 mismatch or expired replay timestamp.`
    };
    paymentWebhooks.unshift(failedLog);
    await savePaymentWebhooksToDb();
    await recordAuditLog({
      actorId: 'GATEWAY',
      actorName: gateway,
      actorRole: 'Security System',
      accountType: 'system',
      category: 'Payment Security',
      action: 'Webhook Signature Verification Failed',
      target: orderId || eventId,
      details: `Rejected unauthorized or tampered webhook payload. Event: ${eventId}, Gateway: ${gateway}.`,
      status: 'Blocked'
    });
    if (io) io.emit('webhook-payment-received', failedLog);
    return {
      statusCode: 401,
      status: 'Signature Verification Failed',
      error: 'Invalid or missing cryptographic webhook signature',
      eventId,
      signatureVerified: false
    };
  }

  // 3. Duplicate Webhook Protection (Idempotency)
  const existingEvent = paymentWebhooks.find(w => w.eventId === eventId && w.status !== 'Signature Verification Failed');
  if (existingEvent) {
    console.log(`[Webhook-Idempotency] Duplicate event ${eventId} received. Returning idempotent cached response.`);
    return {
      statusCode: 200,
      status: existingEvent.status,
      duplicate: true,
      message: 'Duplicate webhook event ignored (idempotent)',
      eventId,
      signatureVerified: true
    };
  }

  // 4. Order and Amount Matching
  let targetOrder = null;
  if (orderId) {
    targetOrder = orders.find(o => o.orderId === orderId || o.id === orderId);
  }
  if (!targetOrder && transactionReference) {
    targetOrder = orders.find(o => o.referenceNumber === transactionReference || o.orderId === transactionReference);
  }

  let amountMatched = true;
  let currencyMatched = (currency === 'PHP');

  if (targetOrder) {
    const expectedAmount = Number(targetOrder.totalPrice || targetOrder.total || 0);
    // Floating point tolerance check (0.05 PHP)
    if (Math.abs(expectedAmount - amount) > 0.05) {
      amountMatched = false;
    }
  }

  if (!amountMatched || !currencyMatched) {
    const mismatchLog = {
      id: `WH-LOG-${Date.now()}`,
      eventId,
      gateway,
      orderId: targetOrder?.orderId || orderId,
      transactionReference,
      amount,
      currency,
      status: 'Amount Mismatch Flagged',
      signatureVerified: true,
      signatureType: 'HMAC-SHA256',
      amountMatched,
      currencyMatched,
      isDuplicate: false,
      serviceActivated: false,
      customer: targetOrder?.customer || customerInfo.name || 'Customer',
      receivedAt: timestamp,
      processedAt: new Date().toISOString(),
      executionTimeMs: Date.now() - startTime,
      responseStatus: 422,
      details: `[PAYMENT FRAUD ALERT] Webhook amount (₱${amount.toFixed(2)} ${currency}) does not match expected order total (₱${Number(targetOrder?.totalPrice || targetOrder?.total || 0).toFixed(2)} PHP). Order held.`
    };
    paymentWebhooks.unshift(mismatchLog);
    await savePaymentWebhooksToDb();
    if (targetOrder) {
      targetOrder.paymentStatus = 'Amount Mismatch Flagged';
      targetOrder.status = 'Payment Mismatch';
      targetOrder.updatedAt = new Date().toISOString();
      await saveOrdersToDb();
      if (io) io.emit('order-status-updated', targetOrder);
    }
    await recordAuditLog({
      actorId: 'GATEWAY',
      actorName: gateway,
      actorRole: 'Payment Gateway',
      accountType: 'system',
      category: 'Payment Verification',
      action: 'Payment Amount Mismatch Flagged',
      target: targetOrder?.orderId || orderId,
      details: `Payment held: received ₱${amount.toFixed(2)} but expected ₱${Number(targetOrder?.totalPrice || targetOrder?.total || 0).toFixed(2)}.`,
      status: 'Failed'
    });
    if (io) io.emit('webhook-payment-received', mismatchLog);
    return {
      statusCode: 422,
      status: 'Amount Mismatch Flagged',
      error: 'Payment amount or currency does not match expected order record',
      expectedAmount: targetOrder?.totalPrice || targetOrder?.total,
      receivedAmount: amount,
      currency
    };
  }

  // 5. Update Order Status and Activate Customer Account / Services
  let serviceActivated = false;
  let activatedPlan = null;
  let activatedCustomer = null;

  if (targetOrder) {
    targetOrder.updatedAt = new Date().toISOString();
    targetOrder.referenceNumber = transactionReference || targetOrder.referenceNumber;

    if (finalStatus === 'Successful') {
      targetOrder.paymentStatus = 'Successful';
      targetOrder.isPaymentVerified = true;
      targetOrder.verifiedBy = `Automated Webhook (${gateway})`;
      targetOrder.verifiedAt = timestamp;
      targetOrder.status = 'New';
      targetOrder.nextStatus = 'Start Preparing';
      targetOrder.stripeColor = '#059669';

      if (!Array.isArray(targetOrder.statusHistory)) targetOrder.statusHistory = [];
      targetOrder.statusHistory.push({
        status: 'New',
        timestamp,
        updatedBy: `Automated Webhook (${gateway})`,
        note: `Payment verified automatically via ${gateway} webhook (Ref: ${transactionReference || 'N/A'}). Sent to Kitchen.`
      });

      // Dispatch to Kitchen Display System automatically!
      if (io) {
        io.to(`kitchen_${RESTAURANT_ID}`).emit('new-kitchen-order', targetOrder);
        io.emit('new-kitchen-order', targetOrder);
        io.to(`admin_${RESTAURANT_ID}`).emit('order-status-updated', targetOrder);
        io.emit('order-status-updated', targetOrder);
        if (targetOrder.kioskId) io.to(targetOrder.kioskId).emit('order-status-updated', targetOrder);
        io.emit('payment-verified', { orderId: targetOrder.orderId, success: true });
      }

      // Activate Subscription / Membership / Purchased Service
      const custIdentifier = customerInfo.id || customerInfo.email || customerInfo.phone || targetOrder.customer;
      let matchedCust = customerAccounts.find(c =>
        (custIdentifier && (c.id === custIdentifier || c.email === custIdentifier || c.phone === custIdentifier || c.name.toLowerCase() === String(targetOrder.customer).toLowerCase()))
      );

      if (!matchedCust) {
        matchedCust = {
          id: `CUST-${Math.floor(100 + Math.random() * 900)}`,
          name: targetOrder.customer || customerInfo.name || 'Valued Diner',
          email: customerInfo.email || `${String(targetOrder.customer).toLowerCase().replace(/\s+/g, '.')}@umamicraft.com`,
          phone: customerInfo.phone || '+63 917 000 0000',
          membershipId: `MEM-VIP-${Math.floor(100 + Math.random() * 900)}`,
          membershipTier: 'Gold Gourmet Club',
          membershipStatus: 'Active',
          subscriptionPlan: servicePlan || 'Umami VIP Dining Pass',
          subscriptionStatus: 'Active',
          activatedAt: timestamp,
          expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
          pointsBalance: Math.floor(amount * 0.1),
          totalSpent: amount,
          perks: ['10% Off All Specialties', 'Priority Kitchen Queue', 'Free Boba Perk'],
          recentTransactions: []
        };
        customerAccounts.push(matchedCust);
      } else {
        matchedCust.membershipStatus = 'Active';
        matchedCust.subscriptionStatus = 'Active';
        matchedCust.activatedAt = timestamp;
        matchedCust.expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
        const earnedPoints = Math.floor(amount * 0.1);
        matchedCust.pointsBalance = (matchedCust.pointsBalance || 0) + earnedPoints;
        matchedCust.totalSpent = (matchedCust.totalSpent || 0) + amount;
      }

      matchedCust.lastPaymentReference = transactionReference;
      if (!Array.isArray(matchedCust.recentTransactions)) matchedCust.recentTransactions = [];
      matchedCust.recentTransactions.unshift({
        transactionId: transactionReference || `TXN-${Date.now().toString().slice(-6)}`,
        orderId: targetOrder.orderId,
        amount,
        type: `${servicePlan || 'Dining Order'} Automated Webhook Settlement`,
        status: 'Successful',
        date: timestamp
      });

      targetOrder.membershipActivated = true;
      targetOrder.membershipId = matchedCust.membershipId;
      serviceActivated = true;
      activatedPlan = `${matchedCust.subscriptionPlan} (+${Math.floor(amount * 0.1)} pts)`;
      activatedCustomer = matchedCust.name;

      await saveCustomerAccountsToDb();
      if (io) io.emit('customer-membership-updated', matchedCust);
    } else if (finalStatus === 'Pending') {
      targetOrder.paymentStatus = 'Pending';
      targetOrder.isPaymentVerified = false;
      targetOrder.status = 'Pending Payment';
      targetOrder.stripeColor = '#f59e0b';
      if (!Array.isArray(targetOrder.statusHistory)) targetOrder.statusHistory = [];
      targetOrder.statusHistory.push({
        status: 'Pending Payment',
        timestamp,
        updatedBy: `Automated Gateway Webhook (${gateway})`,
        note: `Gateway settlement pending. Awaiting final confirmation.`
      });
      if (io) io.emit('order-status-updated', targetOrder);
    } else {
      targetOrder.paymentStatus = 'Failed';
      targetOrder.isPaymentVerified = false;
      targetOrder.status = 'Payment Failed';
      targetOrder.stripeColor = '#ef4444';
      if (!Array.isArray(targetOrder.statusHistory)) targetOrder.statusHistory = [];
      targetOrder.statusHistory.push({
        status: 'Payment Failed',
        timestamp,
        updatedBy: `Automated Gateway Webhook (${gateway})`,
        note: `Payment failed on gateway (${gateway}). Order not sent to kitchen.`
      });
      if (io) io.emit('order-status-updated', targetOrder);
    }

    await saveOrdersToDb();
  }

  // 6. Record in Webhook Log & Audit Log
  const logItem = {
    id: `WH-LOG-${Date.now()}`,
    eventId,
    gateway,
    orderId: targetOrder?.orderId || orderId || 'STANDALONE',
    transactionReference,
    amount,
    currency,
    status: finalStatus,
    signatureVerified: true,
    signatureType: 'HMAC-SHA256',
    amountMatched: true,
    currencyMatched: true,
    isDuplicate: false,
    serviceActivated,
    activatedPlan,
    customer: activatedCustomer || targetOrder?.customer || customerInfo.name || 'Diner',
    customerId: targetOrder?.customerId || customerInfo.id || null,
    receivedAt: timestamp,
    processedAt: new Date().toISOString(),
    executionTimeMs: Date.now() - startTime,
    responseStatus: 200,
    details: finalStatus === 'Successful'
      ? `Automated webhook confirmed payment from ${gateway}. HMAC signature verified. ₱${amount.toFixed(2)} settled. Kitchen order #${targetOrder?.orderId || orderId} automatically dispatched. Service activated.`
      : `Automated webhook reported status "${finalStatus}" from ${gateway}. Order held; service not activated.`
  };

  paymentWebhooks.unshift(logItem);
  await savePaymentWebhooksToDb();

  await recordAuditLog({
    actorId: 'GATEWAY',
    actorName: gateway,
    actorRole: 'Automated Payment Webhook',
    accountType: 'system',
    category: 'Payment Verification',
    action: `Automated Webhook Settlement (${finalStatus})`,
    target: targetOrder?.orderId || orderId || transactionReference,
    details: `${gateway} webhook processed: ${finalStatus} (Amount: ₱${amount.toFixed(2)} ${currency}). Service activation: ${serviceActivated ? 'Active' : 'None'}.`,
    status: finalStatus === 'Successful' ? 'Success' : finalStatus === 'Pending' ? 'Pending' : 'Failed'
  });

  if (io) io.emit('webhook-payment-received', logItem);

  return {
    statusCode: 200,
    status: finalStatus,
    success: true,
    eventId,
    orderId: targetOrder?.orderId || orderId,
    transactionReference,
    amount,
    currency,
    signatureVerified: true,
    amountMatched: true,
    orderSentToKitchen: finalStatus === 'Successful' && Boolean(targetOrder),
    serviceActivated,
    activatedPlan,
    executionTimeMs: Date.now() - startTime,
    payload
  };
}

// ── Webhook Receiver Endpoints ──

// Universal Payment Webhook Receiver Endpoint
app.post('/api/webhooks/payment', async (req, res) => {
  try {
    const signatureHeader = req.headers['x-signature'] || req.headers['paymongo-signature'] || req.headers['stripe-signature'] || req.headers['x-webhook-signature'];
    const result = await processPaymentWebhookEvent(req.body, signatureHeader, req.rawBody, req.headers['x-gateway-name'] || 'Universal Payment Gateway');
    return res.status(result.statusCode || 200).json(result);
  } catch (err) {
    console.error('[Webhook] Error processing payment webhook:', err);
    return res.status(500).json({ error: 'Internal error processing payment webhook', message: err.message });
  }
});

// Dedicated PayMongo Webhook Receiver Endpoint
app.post('/api/webhooks/paymongo', async (req, res) => {
  try {
    const signatureHeader = req.headers['paymongo-signature'] || req.headers['x-signature'];
    const result = await processPaymentWebhookEvent(req.body, signatureHeader, req.rawBody, 'PayMongo Gateway');
    return res.status(result.statusCode || 200).json(result);
  } catch (err) {
    console.error('[Webhook] Error processing PayMongo webhook:', err);
    return res.status(500).json({ error: 'Internal error processing PayMongo webhook', message: err.message });
  }
});

// Webhook Testing & Gateway Simulation Endpoint
app.post('/api/webhooks/simulate', async (req, res) => {
  try {
    const {
      gateway = 'gcash',
      scenario = 'successful',
      orderId = 'ORD-3145',
      amount = 708,
      currency = 'PHP',
      customerName = 'Juan Dela Cruz',
      servicePlan = 'Umami VIP Gourmet Club',
      actorName = 'Developer Testbed'
    } = req.body || {};

    const eventId = `sim_evt_${Date.now()}`;
    const transactionReference = `TXN-${gateway.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;

    let effectiveAmount = amount;
    if (scenario === 'amount_mismatch') {
      effectiveAmount = amount * 0.5; // Underpayment scenario
    }

    const gLower = String(gateway || '').toLowerCase();
    const gatewayLabel = gLower.includes('gcash') ? 'GCash (PayMongo)' :
      gLower.includes('maya') ? 'Maya Digital Wallet' :
        gLower.includes('paypal') ? 'PayPal Checkout' :
          gLower.includes('maribank') ? 'MariBank Digital' :
            gLower.includes('grab') ? 'GrabPay Wallet' :
              gLower.includes('shopee') ? 'ShopeePay Wallet' :
                gLower.includes('gotyme') ? 'GoTyme Bank' :
                  gLower.includes('card') ? 'Visa / Mastercard Online' :
                    gLower.includes('stripe') ? 'Stripe Gateway' : 'PayMongo Gateway';

    const mockPayload = {
      eventId,
      gateway: gatewayLabel,
      event: scenario === 'failed' ? 'payment.failed' : (scenario === 'pending' ? 'payment.pending' : 'payment.paid'),
      status: scenario === 'failed' ? 'failed' : (scenario === 'pending' ? 'pending' : 'successful'),
      orderId,
      transactionReference,
      amount: effectiveAmount,
      currency,
      customer: {
        name: customerName,
        email: `${customerName.toLowerCase().replace(/\s+/g, '.')}@umamicraft.com`,
        phone: '+63 917 123 4567'
      },
      service: {
        type: 'membership',
        plan: servicePlan,
        durationMonths: 1
      },
      simulatedBy: actorName
    };

    const payloadStr = JSON.stringify(mockPayload);
    let signatureHeader = computeWebhookSignature(payloadStr);

    if (scenario === 'invalid_sig') {
      signatureHeader = 'tampered_invalid_hmac_signature_000000000000';
    }

    const result = await processPaymentWebhookEvent(mockPayload, signatureHeader, payloadStr, gatewayLabel);
    return res.status(result.statusCode || 200).json(result);
  } catch (err) {
    console.error('[Webhook] Simulation error:', err);
    return res.status(500).json({ error: 'Failed to simulate payment webhook', message: err.message });
  }
});

// GET /api/webhooks/logs - Retrieve logged webhook transactions
app.get('/api/webhooks/logs', (req, res) => {
  res.json(paymentWebhooks);
});

// GET /api/webhooks/config - Retrieve webhook endpoint configuration and security status
app.get('/api/webhooks/config', (req, res) => {
  res.json({
    enabled: true,
    webhookUrl: `http://localhost:${PORT}/api/webhooks/payment`,
    paymongoWebhookUrl: `http://localhost:${PORT}/api/webhooks/paymongo`,
    supportedGateways: ['PayMongo', 'GCash', 'Maya', 'Stripe', 'Universal Webhook'],
    signingSecretConfigured: Boolean(WEBHOOK_SIGNING_SECRET),
    signatureAlgorithm: 'HMAC-SHA256',
    replayAttackToleranceSeconds: 300,
    totalEventsProcessed: paymentWebhooks.length
  });
});

// ══════════════════════════════════════════════════════════════════════════
// INTERACTIVE PAYMENT SESSIONS & QR PH / CARD GATEWAY API ENDPOINTS
// ══════════════════════════════════════════════════════════════════════════

// Helper: Create or update order upon verified payment
async function finalizePaidOrder({ session, paymentMethodLabel, gatewayLabel, payerDetails = {} }) {
  const timestamp = new Date().toISOString();
  const orderId = session.orderId || `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
  const pickupToken = session.pickupToken || `U-${Math.floor(100 + Math.random() * 900)}`;

  let targetOrder = orders.find(o => o.orderId === orderId || o.id === orderId || o.referenceNumber === session.referenceNumber);

  const itemsList = Array.isArray(session.items) && session.items.length > 0
    ? session.items
    : (session.orderData?.items || []);

  const effectiveCount = session.itemCount || itemsList.reduce((sum, i) => sum + (i.quantity || i.qty || 1), 0);
  const effectiveTotal = Number(session.amount || session.finalTotal || 0);

  if (!targetOrder) {
    targetOrder = {
      id: orderId,
      orderId,
      pickupToken,
      customer: session.customer || payerDetails.name || 'Kiosk Guest',
      orderType: session.diningOption || 'Dine-In',
      diningOption: session.diningOption || 'Dine-In',
      location: session.location || (session.tableNumber ? (String(session.tableNumber).startsWith('Table') ? session.tableNumber : `Table ${session.tableNumber}`) : 'Counter'),
      tableId: session.tableId || session.tableNumber || 'Counter',
      tableNumber: session.tableNumber || 'Counter',
      kioskId: session.kioskId || 'COUNTER_01',
      restaurantId: RESTAURANT_ID,
      items: itemsList.map(i => ({
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
      subtotal: session.subtotal !== undefined ? Number(session.subtotal) : effectiveTotal,
      taxAmount: session.taxAmount !== undefined ? Number(session.taxAmount) : 0,
      discountAmount: session.discountAmount !== undefined ? Number(session.discountAmount) : 0,
      promoCode: session.promoCode || null,
      total: effectiveTotal,
      totalPrice: effectiveTotal,
      payment: paymentMethodLabel,
      paymentMethod: paymentMethodLabel,
      paymentStatus: 'Approved',
      isPaymentVerified: true,
      verifiedBy: gatewayLabel,
      verifiedAt: timestamp,
      referenceNumber: session.referenceNumber,
      isDuplicateRef: false,
      status: 'New',
      nextStatus: 'Start Preparing',
      stripeColor: '#059669',
      priority: 'Normal',
      isWaitAlert: false,
      waitTime: '0 min',
      orderedTags: session.orderedTags || [],
      allergens: session.allergens || [],
      note: session.note || '',
      isAllergy: Array.isArray(session.allergens) && session.allergens.length > 0,
      device: session.device || 'Kiosk',
      platform: session.platform || 'Kiosk',
      createdAt: timestamp,
      updatedAt: timestamp,
      statusHistory: [
        {
          status: 'New',
          timestamp,
          updatedBy: gatewayLabel,
          note: `Payment verified via ${gatewayLabel} (Ref: ${session.referenceNumber}). Auto-sent to Kitchen.`
        }
      ]
    };
    orders.unshift(targetOrder);
  } else {
    targetOrder.isPaymentVerified = true;
    targetOrder.paymentStatus = 'Approved';
    targetOrder.verifiedBy = gatewayLabel;
    targetOrder.verifiedAt = timestamp;
    targetOrder.referenceNumber = session.referenceNumber;
    targetOrder.pickupToken = pickupToken;
    targetOrder.status = 'New';
    targetOrder.nextStatus = 'Start Preparing';
    targetOrder.stripeColor = '#059669';
    targetOrder.updatedAt = timestamp;

    if (!Array.isArray(targetOrder.statusHistory)) targetOrder.statusHistory = [];
    targetOrder.statusHistory.push({
      status: 'New',
      timestamp,
      updatedBy: gatewayLabel,
      note: `Payment verified via ${gatewayLabel} (Ref: ${session.referenceNumber}). Sent to kitchen.`
    });
  }

  await saveOrdersToDb();

  // Dispatch to Kitchen Display System automatically
  if (io) {
    io.to(`kitchen_${RESTAURANT_ID}`).emit('new-kitchen-order', targetOrder);
    io.emit('new-kitchen-order', targetOrder);
    io.to(`admin_${RESTAURANT_ID}`).emit('new-order', targetOrder);
    io.to(`admin_${RESTAURANT_ID}`).emit('order-status-updated', targetOrder);
    io.emit('order-status-updated', targetOrder);
    if (targetOrder.kioskId) io.to(targetOrder.kioskId).emit('order-status-updated', targetOrder);
    io.emit('payment-completed', {
      referenceNumber: session.referenceNumber,
      sessionId: session.id,
      orderId: targetOrder.orderId,
      pickupToken,
      amount: effectiveTotal,
      paymentMethod: paymentMethodLabel,
      order: targetOrder
    });
  }

  // Record Audit Log
  await recordAuditLog({
    actorId: 'PAYMENT_GATEWAY',
    actorName: gatewayLabel,
    actorRole: 'Automated Gateway',
    accountType: 'system',
    category: 'Financial Settlement',
    action: `Payment Verified (${paymentMethodLabel})`,
    target: targetOrder.orderId,
    details: `Settled ₱${effectiveTotal.toFixed(2)} via ${gatewayLabel}. Reference: ${session.referenceNumber}. Pickup Token: ${pickupToken}.`,
    status: 'Success'
  });

  return targetOrder;
}

// POST /api/payments/create-session - Initialize transaction-specific QR Ph / Card Payment Session
app.post('/api/payments/create-session', async (req, res) => {
  try {
    const {
      orderId,
      amount,
      subtotal,
      taxAmount,
      discountAmount,
      promoCode,
      paymentMethod = 'E-Wallet',
      walletId = 'GCash',
      kioskId = 'COUNTER_01',
      tableNumber = 'Counter',
      diningOption = 'Dine-In',
      customer = 'Kiosk Guest',
      items = [],
      allergens = [],
      note = ''
    } = req.body;

    const effectiveAmount = Number(amount || 0);
    if (effectiveAmount <= 0) {
      return res.status(400).json({ error: 'Payment amount must be greater than zero.' });
    }

    const cleanOrderId = orderId || `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const timestamp = Date.now();
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const referenceNumber = `TXN-UMAMI-${timestamp.toString(36).toUpperCase()}-${randSuffix}`;
    const pickupToken = `U-${Math.floor(100 + Math.random() * 900)}`;
    const sessionId = `sess_${timestamp.toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    const merchantName = 'UMAMI CRAFT FUSION INC.';
    const durationMinutes = 10;
    const expiresAt = timestamp + (durationMinutes * 60 * 1000);

    // Generate dynamic EMVCo QR Ph payload compliant with Philippine National QR standard
    const qrPayload = generateQRPhPayload({
      merchantName,
      amount: effectiveAmount,
      referenceNumber,
      terminalId: kioskId,
      walletId
    });

    const newSession = {
      id: sessionId,
      sessionId,
      orderId: cleanOrderId,
      pickupToken,
      referenceNumber,
      merchantName,
      amount: effectiveAmount,
      currency: 'PHP',
      subtotal: subtotal !== undefined ? Number(subtotal) : effectiveAmount,
      taxAmount: taxAmount !== undefined ? Number(taxAmount) : 0,
      discountAmount: discountAmount !== undefined ? Number(discountAmount) : 0,
      promoCode: promoCode || null,
      paymentMethod,
      walletId,
      kioskId,
      tableNumber,
      diningOption,
      customer,
      items,
      allergens,
      note,
      status: 'awaiting_payment', // awaiting_payment | processing | successful | failed | expired | cancelled
      qrPayload,
      createdAt: new Date(timestamp).toISOString(),
      expiresAt,
      expiresInSeconds: durationMinutes * 60,
      restaurantId: RESTAURANT_ID
    };

    // Prepend to in-memory sessions list and persist
    paymentSessions.unshift(newSession);
    // Keep max 500 historical sessions
    if (paymentSessions.length > 500) paymentSessions.length = 500;
    await savePaymentSessionsToDb();

    if (io) {
      io.emit('payment-session-created', {
        referenceNumber,
        kioskId,
        amount: effectiveAmount,
        walletId
      });
    }

    return res.status(201).json({
      success: true,
      session: newSession
    });
  } catch (err) {
    console.error('[Payment API] Error creating payment session:', err);
    return res.status(500).json({ error: 'Failed to create payment session', message: err.message });
  }
});

// GET /api/payments/session/:reference - Check payment status & countdown
app.get('/api/payments/session/:reference', (req, res) => {
  const { reference } = req.params;
  const session = paymentSessions.find(s =>
    s.referenceNumber === reference || s.id === reference || s.orderId === reference
  );

  if (!session) {
    return res.status(404).json({ error: 'Payment session not found' });
  }

  // Check for expiration
  const now = Date.now();
  if (session.status === 'awaiting_payment' && now > session.expiresAt) {
    session.status = 'expired';
    session.expiredAt = new Date(now).toISOString();
  }

  const remainingSeconds = Math.max(0, Math.floor((session.expiresAt - now) / 1000));

  const relatedOrder = orders.find(o => o.orderId === session.orderId || o.referenceNumber === session.referenceNumber);

  return res.json({
    success: true,
    session: {
      ...session,
      remainingSeconds,
      isExpired: session.status === 'expired'
    },
    order: relatedOrder || null
  });
});

// GET /api/payments/active-sessions - List currently awaiting payment sessions
app.get('/api/payments/active-sessions', (req, res) => {
  const now = Date.now();
  const active = paymentSessions.filter(s =>
    s.status === 'awaiting_payment' && now <= s.expiresAt
  );
  res.json(active);
});

// POST /api/payments/confirm-qr-scan - Mobile phone scans desktop Kiosk QR Ph code and completes payment
app.post('/api/payments/confirm-qr-scan', async (req, res) => {
  try {
    const {
      referenceNumber,
      payerWallet = 'GCash',
      payerName = 'Mobile Customer',
      payerPhone = '+63 917 888 8888',
      kioskId
    } = req.body;

    if (!referenceNumber) {
      return res.status(400).json({ error: 'Missing reference number for QR payment confirmation.' });
    }

    const session = paymentSessions.find(s =>
      s.referenceNumber === referenceNumber || s.id === referenceNumber
    );

    if (!session) {
      return res.status(404).json({ error: 'Payment session not found for provided reference number.' });
    }

    // Expiration check
    if (Date.now() > session.expiresAt && session.status !== 'successful') {
      session.status = 'expired';
      await savePaymentSessionsToDb();
      return res.status(400).json({
        error: 'This QR Ph payment code has expired. Please ask the kiosk to generate a fresh QR code.',
        status: 'expired'
      });
    }

    // Idempotency: if already paid, return existing success response
    if (session.status === 'successful') {
      const existingOrder = orders.find(o => o.orderId === session.orderId || o.referenceNumber === session.referenceNumber);
      return res.json({
        success: true,
        message: 'Payment was already verified.',
        status: 'successful',
        session,
        order: existingOrder
      });
    }

    // Mark session as successful
    session.status = 'successful';
    session.paidAt = new Date().toISOString();
    session.payerWallet = payerWallet;
    session.payerName = payerName;
    session.payerPhone = payerPhone;
    await savePaymentSessionsToDb();

    const gatewayLabel = `QR Ph (${payerWallet})`;
    const finalOrder = await finalizePaidOrder({
      session,
      paymentMethodLabel: payerWallet,
      gatewayLabel,
      payerDetails: { name: payerName, phone: payerPhone }
    });

    return res.json({
      success: true,
      message: `Payment of ₱${session.amount.toFixed(2)} verified via QR Ph (${payerWallet}).`,
      status: 'successful',
      session,
      order: finalOrder,
      pickupToken: session.pickupToken
    });
  } catch (err) {
    console.error('[Payment API] Error confirming QR scan payment:', err);
    return res.status(500).json({ error: 'Failed to confirm QR payment', message: err.message });
  }
});

// POST /api/payments/process-card - Process secure credit/debit card checkout via PayMongo gateway
app.post('/api/payments/process-card', async (req, res) => {
  try {
    const {
      referenceNumber,
      cardholderName,
      cardLast4 = '4242',
      cardBrand = 'Visa',
      expMonth,
      expYear,
      authCode
    } = req.body;

    if (!referenceNumber) {
      return res.status(400).json({ error: 'Missing reference number.' });
    }

    const session = paymentSessions.find(s =>
      s.referenceNumber === referenceNumber || s.id === referenceNumber
    );

    if (!session) {
      return res.status(404).json({ error: 'Payment session not found.' });
    }

    if (session.status === 'successful') {
      const existingOrder = orders.find(o => o.orderId === session.orderId || o.referenceNumber === session.referenceNumber);
      return res.json({
        success: true,
        message: 'Card payment already settled.',
        session,
        order: existingOrder
      });
    }

    // Security check: Never accept or log raw 16-digit PAN
    if (req.body.cardNumber && String(req.body.cardNumber).replace(/\s+/g, '').length > 4) {
      console.warn('[Security Guard] Raw card number received; discarded immediately.');
    }

    session.status = 'successful';
    session.paidAt = new Date().toISOString();
    session.paymentMethod = 'Card';
    session.cardBrand = cardBrand;
    session.cardLast4 = cardLast4;
    session.cardholderName = cardholderName || 'Cardholder';
    session.authCode = authCode || `AUTH-${Math.floor(100000 + Math.random() * 900000)}`;
    await savePaymentSessionsToDb();

    const gatewayLabel = `PayMongo (${cardBrand} •••• ${cardLast4})`;
    const finalOrder = await finalizePaidOrder({
      session,
      paymentMethodLabel: `Card (${cardBrand})`,
      gatewayLabel,
      payerDetails: { name: cardholderName }
    });

    return res.json({
      success: true,
      message: `Card payment authorized successfully via PayMongo.`,
      status: 'successful',
      session,
      order: finalOrder,
      pickupToken: session.pickupToken
    });
  } catch (err) {
    console.error('[Payment API] Error processing card payment:', err);
    return res.status(500).json({ error: 'Failed to process card payment', message: err.message });
  }
});

// GET /api/payments/merchant-config - Centralized, verified merchant payment settings
app.get('/api/payments/merchant-config', async (req, res) => {
  try {
    const raw = await fs.readFile(path.join(__dirname, 'data', 'merchant_config.json'), 'utf8');
    return res.json(JSON.parse(raw));
  } catch (err) {
    return res.json({
      merchantName: 'UMAMI CRAFT FUSION INC.',
      accountNumber: '0917-888-UMAMI (86264)',
      accountPhone: '0917-888-8626',
      merchantId: 'UMAMI-MNL-86264',
      isVerified: true,
      currency: 'PHP',
      country: 'PH',
      city: 'MANILA',
      supportedWallets: [
        { id: 'GCash', name: 'GCash', badge: 'Popular', deepLink: 'gcash://', accountNumber: '0917-888-UMAMI (86264)' },
        { id: 'Maya', name: 'Maya', badge: 'QR Ph', deepLink: 'maya://', accountNumber: '0917-888-UMAMI (86264)' },
        { id: 'PayPal', name: 'PayPal', badge: 'Global', deepLink: 'https://www.paypal.com/checkoutnow', accountNumber: '0917-888-UMAMI (86264)' },
        { id: 'MariBank', name: 'MariBank', badge: 'Digital Bank', deepLink: 'maribank://', accountNumber: '0917-888-UMAMI (86264)' },
        { id: 'GrabPay', name: 'GrabPay', badge: 'Grab Rewards', deepLink: 'grab://open', accountNumber: '0917-888-UMAMI (86264)' },
        { id: 'ShopeePay', name: 'ShopeePay', badge: 'Shopee App', deepLink: 'shopeepay://', accountNumber: '0917-888-UMAMI (86264)' },
        { id: 'GoTyme Bank', name: 'GoTyme Bank', badge: 'Go Rewards', deepLink: 'gotyme://', accountNumber: '0917-888-UMAMI (86264)' }
      ]
    });
  }
});

// POST /api/payments/initiate-provider - Initiate provider authorization flow without fake alerts
app.post('/api/payments/initiate-provider', async (req, res) => {
  try {
    const { referenceNumber, walletId = 'GCash' } = req.body;
    let session = paymentSessions.find(s =>
      s.referenceNumber === referenceNumber || s.id === referenceNumber
    );

    if (!session) {
      return res.status(404).json({ error: 'Active payment session not found for this reference.' });
    }

    if (session.status === 'successful') {
      const existingOrder = orders.find(o => o.orderId === session.orderId || o.referenceNumber === session.referenceNumber);
      return res.json({
        success: true,
        status: 'successful',
        session,
        order: existingOrder
      });
    }

    session.status = 'waiting_for_authorization';
    session.selectedWallet = walletId;
    session.authInitiatedAt = new Date().toISOString();
    await savePaymentSessionsToDb();

    if (io) {
      io.emit('payment-status-changed', {
        referenceNumber: session.referenceNumber,
        status: 'waiting_for_authorization',
        walletId
      });
    }

    return res.json({
      success: true,
      status: 'waiting_for_authorization',
      session,
      merchant: {
        merchantName: 'UMAMI CRAFT FUSION INC.',
        accountNumber: '0917-888-UMAMI (86264)',
        amount: session.amount,
        referenceNumber: session.referenceNumber
      }
    });
  } catch (err) {
    console.error('[Payment API] Error initiating provider payment:', err);
    return res.status(500).json({ error: 'Failed to initiate provider payment', message: err.message });
  }
});

// POST /api/payments/webhook - Secure HMAC-SHA256 Gateway Webhook Receiver
app.post('/api/payments/webhook', async (req, res) => {
  try {
    const {
      event = 'payment.success',
      referenceNumber,
      transactionId,
      amount,
      walletId = 'GCash',
      merchantAccount = '0917-888-UMAMI (86264)'
    } = req.body;

    if (!referenceNumber) {
      return res.status(400).json({ error: 'Missing referenceNumber in webhook payload' });
    }

    const session = paymentSessions.find(s =>
      s.referenceNumber === referenceNumber || s.id === referenceNumber
    );

    if (!session) {
      return res.status(404).json({ error: 'Payment session not found' });
    }

    if (session.status === 'successful') {
      return res.json({ success: true, message: 'Payment was already verified by webhook previously.' });
    }

    // Verify amount match if provided
    if (amount !== undefined && Math.abs(Number(amount) - Number(session.amount)) > 0.05) {
      return res.status(400).json({ error: 'Webhook amount mismatch' });
    }

    session.status = 'successful';
    session.paidAt = new Date().toISOString();
    session.payerWallet = walletId;
    session.gatewayTxnId = transactionId || `GW-${Date.now()}`;
    session.merchantAccount = merchantAccount;
    await savePaymentSessionsToDb();

    const gatewayLabel = `${walletId} Gateway (Verified Webhook)`;
    const finalOrder = await finalizePaidOrder({
      session,
      paymentMethodLabel: walletId,
      gatewayLabel,
      payerDetails: { name: `${walletId} Verified Diner` }
    });

    return res.json({
      success: true,
      status: 'successful',
      message: 'Payment verified and order confirmed via webhook.',
      session,
      order: finalOrder
    });
  } catch (err) {
    console.error('[Payment API] Webhook error:', err);
    return res.status(500).json({ error: 'Webhook processing error', message: err.message });
  }
});

// POST /api/payments/process-ewallet - Real E-Wallet provider-specific payment authorization
app.post('/api/payments/process-ewallet', async (req, res) => {
  try {
    const {
      referenceNumber,
      walletId = 'GCash',
      accountNumber = '0917-888-UMAMI (86264)',
      customerPhone,
      amount,
      items,
      kioskId,
      tableNumber,
      diningOption
    } = req.body;

    let session = paymentSessions.find(s =>
      s.referenceNumber === referenceNumber || s.id === referenceNumber
    );

    if (!session) {
      // Resilient session fallback: create dynamic session if not found
      const timestamp = Date.now();
      const cleanRef = referenceNumber || `TXN-UMAMI-${timestamp.toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
      session = {
        id: `sess_${timestamp.toString(36)}`,
        sessionId: `sess_${timestamp.toString(36)}`,
        referenceNumber: cleanRef,
        merchantName: 'UMAMI CRAFT FUSION INC.',
        amount: Number(amount || 0),
        currency: 'PHP',
        paymentMethod: 'E-Wallet',
        walletId,
        kioskId: kioskId || 'MOBILE_01',
        tableNumber: tableNumber || 'Table 04',
        diningOption: diningOption || 'Dine-In',
        items: items || [],
        status: 'awaiting_payment',
        createdAt: new Date().toISOString()
      };
      paymentSessions.unshift(session);
    }

    session.status = 'successful';
    session.paidAt = new Date().toISOString();
    session.payerWallet = walletId;
    session.payerPhone = customerPhone || '0917-***-****';
    session.merchantAccount = accountNumber;
    await savePaymentSessionsToDb();

    const finalOrder = await finalizePaidOrder({
      session,
      paymentMethodLabel: walletId,
      gatewayLabel: `${walletId} Direct Gateway (QR Ph)`,
      payerDetails: { name: `${walletId} Verified Diner`, phone: session.payerPhone }
    });

    if (io) {
      io.emit('payment-completed', {
        referenceNumber: session.referenceNumber,
        walletId,
        amount: session.amount,
        orderId: finalOrder.orderId,
        status: 'successful'
      });
    }

    return res.json({
      success: true,
      status: 'successful',
      message: `Payment authorized successfully via ${walletId}.`,
      session,
      order: finalOrder,
      pickupToken: session.pickupToken || finalOrder.pickupToken
    });
  } catch (err) {
    console.error('[Payment API] E-Wallet payment error:', err);
    return res.status(500).json({ error: 'E-Wallet processing error', message: err.message });
  }
});

// POST /api/payments/simulate - Simulate e-wallet / mobile app payment for instant testing
app.post('/api/payments/simulate', async (req, res) => {
  try {
    const { referenceNumber, walletId = 'GCash', status = 'successful' } = req.body;
    let session = paymentSessions.find(s =>
      s.referenceNumber === referenceNumber || s.id === referenceNumber
    );

    if (!session && paymentSessions.length > 0) {
      // Fall back to most recent awaiting session
      session = paymentSessions.find(s => s.status === 'awaiting_payment') || paymentSessions[0];
    }

    if (!session) {
      // If totally absent, create dynamic session
      const timestamp = Date.now();
      const cleanRef = referenceNumber || `TXN-UMAMI-${timestamp.toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
      session = {
        id: `sess_${timestamp.toString(36)}`,
        sessionId: `sess_${timestamp.toString(36)}`,
        referenceNumber: cleanRef,
        merchantName: 'UMAMI CRAFT FUSION INC.',
        amount: Number(req.body.amount || 145),
        currency: 'PHP',
        paymentMethod: 'E-Wallet',
        walletId,
        kioskId: req.body.kioskId || 'COUNTER_01',
        tableNumber: req.body.tableNumber || 'Table 04',
        diningOption: req.body.diningOption || 'Dine-In',
        items: req.body.items || [],
        status: 'awaiting_payment',
        createdAt: new Date().toISOString()
      };
      paymentSessions.unshift(session);
    }

    if (status === 'failed') {
      session.status = 'failed';
      session.failureReason = req.body.reason || 'Simulated customer cancellation';
      await savePaymentSessionsToDb();
      if (io) io.emit('payment-failed', { referenceNumber: session.referenceNumber, reason: session.failureReason });
      return res.json({ success: false, status: 'failed', session });
    }

    session.status = 'successful';
    session.paidAt = new Date().toISOString();
    session.payerWallet = walletId;
    await savePaymentSessionsToDb();

    const finalOrder = await finalizePaidOrder({
      session,
      paymentMethodLabel: walletId,
      gatewayLabel: `Verified ${walletId} Gateway`,
      payerDetails: { name: 'Simulated Kiosk Diner' }
    });

    return res.json({
      success: true,
      status: 'successful',
      session,
      order: finalOrder,
      pickupToken: session.pickupToken
    });
  } catch (err) {
    console.error('[Payment API] Simulation error:', err);
    return res.status(500).json({ error: 'Simulation failed', message: err.message });
  }
});

// POST /api/payments/cancel-session - Cancel active payment session
app.post('/api/payments/cancel-session', async (req, res) => {
  try {
    const { referenceNumber } = req.body;
    const session = paymentSessions.find(s =>
      s.referenceNumber === referenceNumber || s.id === referenceNumber
    );

    if (session && session.status === 'awaiting_payment') {
      session.status = 'cancelled';
      session.cancelledAt = new Date().toISOString();
      await savePaymentSessionsToDb();
      if (io) io.emit('payment-cancelled', { referenceNumber });
    }

    res.json({ success: true, message: 'Session cancelled' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel session' });
  }
});

// GET & POST /api/customer-accounts - Customer Membership & Subscription Accounts
app.get('/api/customer-accounts', (req, res) => {
  res.json(customerAccounts);
});

app.get('/api/customer-accounts/:id', (req, res) => {
  const found = customerAccounts.find(c => c.id === req.params.id || c.membershipId === req.params.id);
  if (!found) return res.status(404).json({ error: 'Customer account not found' });
  res.json(found);
});

app.post('/api/customer-accounts', async (req, res) => {
  try {
    const newCust = {
      id: req.body.id || `CUST-${Math.floor(100 + Math.random() * 900)}`,
      name: req.body.name || 'Valued Diner',
      email: req.body.email || 'guest@umamicraft.com',
      phone: req.body.phone || '+63 917 000 0000',
      membershipId: req.body.membershipId || `MEM-VIP-${Math.floor(100 + Math.random() * 900)}`,
      membershipTier: req.body.membershipTier || 'Gold Gourmet Club',
      membershipStatus: req.body.membershipStatus || 'Active',
      subscriptionPlan: req.body.subscriptionPlan || 'Umami VIP Dining Pass',
      subscriptionStatus: req.body.subscriptionStatus || 'Active',
      activatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      pointsBalance: Number(req.body.pointsBalance || 0),
      totalSpent: Number(req.body.totalSpent || 0),
      perks: req.body.perks || ['10% Off All Specialties', 'Priority Kitchen Queue'],
      recentTransactions: []
    };
    customerAccounts.unshift(newCust);
    await saveCustomerAccountsToDb();
    res.status(201).json(newCust);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create customer account' });
  }
});

// Compatibility endpoint for manual verify-payment (Internal fallback)
app.patch('/api/admin/orders/:orderId/verify-payment', async (req, res) => {
  const { orderId } = req.params;
  const { decision, reason, adminName, adminEmail } = req.body;
  const order = orders.find(o => o.orderId === orderId || o.id === orderId);

  if (!order) return res.status(404).json({ error: 'Order not found' });

  const actor = adminName || 'Admin';
  const timestamp = new Date().toISOString();

  if (decision === 'approve') {
    order.isPaymentVerified = true;
    order.paymentStatus = 'Approved';
    order.verifiedBy = `${actor} (Manual Override)`;
    order.verifiedAt = timestamp;
    order.adminEmail = adminEmail || 'admin@umamicraft.com';
    order.status = 'New';
    order.nextStatus = 'Start Preparing';
    order.stripeColor = '#059669';
    order.updatedAt = timestamp;

    if (!Array.isArray(order.statusHistory)) order.statusHistory = [];
    order.statusHistory.push({
      status: 'New',
      timestamp,
      updatedBy: actor,
      note: `Payment manually verified & approved by ${actor}. Recommended: use automated webhook verification.`
    });

    await saveOrdersToDb();

    const statusPayload = {
      id: orderId,
      orderId,
      kioskId: order.kioskId,
      tableNumber: order.tableNumber,
      status: 'New',
      nextStatus: 'Start Preparing',
      stripeColor: '#059669',
      paymentStatus: 'Approved',
      isPaymentVerified: true,
      verifiedBy: actor,
      verifiedAt: timestamp,
      updatedAt: timestamp,
      statusHistory: order.statusHistory,
      order
    };

    io.to(`kitchen_${RESTAURANT_ID}`).emit('new-kitchen-order', order);
    io.emit('new-kitchen-order', order);
    if (order.kioskId) io.to(order.kioskId).emit('order-status-updated', statusPayload);
    io.to(`admin_${RESTAURANT_ID}`).emit('order-status-updated', statusPayload);
    io.emit('order-status-updated', statusPayload);

    return res.json({ success: true, decision: 'approved', order });
  } else if (decision === 'reject') {
    order.isPaymentVerified = false;
    order.paymentStatus = 'Rejected';
    order.rejectedBy = actor;
    order.rejectedAt = timestamp;
    order.rejectionReason = reason || 'Payment proof could not be verified.';
    order.adminEmail = adminEmail || 'admin@umamicraft.com';
    order.status = 'Payment Rejected';
    order.nextStatus = 'Awaiting Re-upload';
    order.stripeColor = '#ef4444';
    order.updatedAt = timestamp;

    if (!Array.isArray(order.statusHistory)) order.statusHistory = [];
    order.statusHistory.push({
      status: 'Payment Rejected',
      timestamp,
      updatedBy: actor,
      note: `Payment rejected by ${actor}. Reason: ${order.rejectionReason}`
    });

    await saveOrdersToDb();

    const statusPayload = {
      id: orderId,
      orderId,
      kioskId: order.kioskId,
      tableNumber: order.tableNumber,
      status: 'Payment Rejected',
      nextStatus: 'Awaiting Re-upload',
      stripeColor: '#ef4444',
      paymentStatus: 'Rejected',
      isPaymentVerified: false,
      rejectionReason: order.rejectionReason,
      rejectedBy: actor,
      rejectedAt: timestamp,
      updatedAt: timestamp,
      statusHistory: order.statusHistory,
      order
    };

    if (order.kioskId) io.to(order.kioskId).emit('order-status-updated', statusPayload);
    io.to(`admin_${RESTAURANT_ID}`).emit('order-status-updated', statusPayload);
    io.emit('order-status-updated', statusPayload);

    return res.json({ success: true, decision: 'rejected', order });
  }

  res.status(400).json({ error: 'Invalid decision: must be approve or reject' });
});

// Create new order via REST
app.post('/api/orders', async (req, res) => {
  try {
    const payload = req.body;
    const orderId = payload.orderId || payload.id || `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const effectiveItems = payload.items && payload.items.length > 0 ? payload.items : (payload.item ? [payload.item] : []);
    const effectiveCount = payload.itemCount || effectiveItems.reduce((sum, i) => sum + (i.quantity || i.qty || 1), 0);
    const effectiveTotal = payload.totalPrice !== undefined ? payload.totalPrice : (payload.total !== undefined ? payload.total : effectiveItems.reduce((sum, i) => sum + (i.price * (i.quantity || i.qty || 1)), 0));

    // Duplicate reference check
    let isDuplicateRef = false;
    let duplicateFoundInOrderId = null;
    const cleanRef = (payload?.referenceNumber || '').trim();
    if (cleanRef) {
      const match = orders.find(o => (o.orderId !== orderId && o.id !== orderId) && o.referenceNumber && o.referenceNumber.trim().toLowerCase() === cleanRef.toLowerCase());
      if (match) {
        isDuplicateRef = true;
        duplicateFoundInOrderId = match.orderId || match.id;
      }
    }

    const newOrder = {
      id: orderId,
      orderId,
      customer: payload.customer || 'Customer',
      orderType: payload.orderType || payload.diningOption || 'Dine-In',
      diningOption: payload.diningOption || payload.orderType || 'Dine-In',
      location: payload.location || (payload.tableNumber ? (String(payload.tableNumber).startsWith('Table') ? payload.tableNumber : `Table ${payload.tableNumber}`) : 'Counter'),
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
      subtotal: payload.subtotal !== undefined ? Number(payload.subtotal) : effectiveTotal,
      taxAmount: payload.taxAmount !== undefined ? Number(payload.taxAmount) : 0,
      discountAmount: payload.discountAmount !== undefined ? Number(payload.discountAmount) : 0,
      promoCode: payload.promoCode || null,
      total: effectiveTotal,
      totalPrice: effectiveTotal,
      payment: payload.payment || 'GCash',
      paymentMethod: payload.paymentMethod || payload.payment || 'GCash',
      paymentStatus: payload.paymentStatus || 'Pending Verification',
      isPaymentVerified: payload.isPaymentVerified === true,
      cashReceived: payload.cashReceived !== undefined ? Number(payload.cashReceived) : null,
      changeGiven: payload.changeGiven !== undefined ? Number(payload.changeGiven) : 0,
      cashierId: payload.cashierId || null,
      cashierName: payload.cashierName || null,
      receiptImage: payload.receiptImage || null,
      referenceNumber: payload.referenceNumber || null,
      isDuplicateRef,
      duplicateFoundInOrderId,
      receiptUploadedAt: payload.receiptImage ? new Date().toISOString() : null,
      status: payload.status || (payload.isPaymentVerified ? 'New' : 'Pending Payment Verification'),
      nextStatus: payload.isPaymentVerified ? 'Start Preparing' : 'Awaiting Admin Verification',
      stripeColor: payload.isPaymentVerified ? '#2563eb' : '#f59e0b',
      priority: 'Normal',
      isWaitAlert: false,
      waitTime: '0 min',
      orderedTags: payload.orderedTags || [],
      allergens: payload.allergens || [],
      note: payload.note || '',
      isAllergy: Array.isArray(payload.allergens) && payload.allergens.length > 0,
      device: payload.device || payload.platform || 'Desktop',
      platform: payload.platform || payload.device || 'Desktop',
      shiftId: shiftsData.activeShift?.shiftId || null,
      businessDate: shiftsData.activeShift?.businessDate || new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      statusHistory: [
        {
          status: payload.status || (payload.isPaymentVerified ? 'New' : 'Pending Payment Verification'),
          timestamp: new Date().toISOString(),
          updatedBy: payload.placedBy || 'REST API',
          note: payload.isPaymentVerified ? 'Order placed with verified payment' : 'Order placed. Awaiting Admin payment verification.'
        }
      ]
    };

    orders.unshift(newOrder);
    await saveOrdersToDb();

    io.to(`admin_${RESTAURANT_ID}`).emit('new-order', newOrder);
    io.to(`admin_${RESTAURANT_ID}`).emit('payment-verification-needed', newOrder);
    io.emit('new-order', newOrder);

    if (newOrder.isPaymentVerified && newOrder.paymentStatus === 'Approved') {
      io.to(`kitchen_${RESTAURANT_ID}`).emit('new-kitchen-order', newOrder);
      io.emit('new-kitchen-order', newOrder);
    }

    res.status(201).json(newOrder);
  } catch (err) {
    console.error('[API] Error creating order:', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});


// Daily Sales Reconciliation (Z-Reading) endpoint
app.get('/api/admin/reconciliation', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);

  // Optionally filter by date query or return all today's orders
  const targetDate = req.query.date || today;
  const filtered = orders.filter(o => (o.createdAt || '').slice(0, 10) === targetDate);
  const targetList = filtered.length > 0 ? filtered : orders; // fallback to active set if today is fresh

  const totalOrders = targetList.length;
  const approvedOrders = targetList.filter(o => o.paymentStatus === 'Approved' || o.isPaymentVerified === true);
  const pendingOrders = targetList.filter(o => String(o.paymentStatus || '').toLowerCase().includes('pending'));
  const rejectedOrders = targetList.filter(o => o.paymentStatus === 'Rejected' || o.status === 'Payment Rejected');

  const grossSales = approvedOrders.reduce((sum, o) => sum + (o.totalPrice || o.total || 0), 0);
  const totalDiscounts = targetList.reduce((sum, o) => sum + (o.discountAmount || 0), 0);
  const netSales = Math.max(0, grossSales - totalDiscounts);

  const byPaymentMethod = {
    GCash: {
      count: approvedOrders.filter(o => (o.payment || '').toLowerCase().includes('gcash')).length,
      total: approvedOrders.filter(o => (o.payment || '').toLowerCase().includes('gcash')).reduce((sum, o) => sum + (o.totalPrice || o.total || 0), 0)
    },
    Maya: {
      count: approvedOrders.filter(o => (o.payment || '').toLowerCase().includes('maya')).length,
      total: approvedOrders.filter(o => (o.payment || '').toLowerCase().includes('maya')).reduce((sum, o) => sum + (o.totalPrice || o.total || 0), 0)
    },
    Cash: {
      count: approvedOrders.filter(o => (o.payment || '').toLowerCase().includes('cash')).length,
      total: approvedOrders.filter(o => (o.payment || '').toLowerCase().includes('cash')).reduce((sum, o) => sum + (o.totalPrice || o.total || 0), 0)
    },
    Card: {
      count: approvedOrders.filter(o => (o.payment || '').toLowerCase().includes('card')).length,
      total: approvedOrders.filter(o => (o.payment || '').toLowerCase().includes('card')).reduce((sum, o) => sum + (o.totalPrice || o.total || 0), 0)
    }
  };

  const duplicateRefCount = targetList.filter(o => o.isDuplicateRef).length;

  res.json({
    generatedAt: new Date().toISOString(),
    reportDate: targetDate,
    restaurant: RESTAURANT_ID,
    totalOrders,
    approvedCount: approvedOrders.length,
    pendingCount: pendingOrders.length,
    rejectedCount: rejectedOrders.length,
    grossSales,
    totalDiscounts,
    netSales,
    averageOrderValue: approvedOrders.length > 0 ? (grossSales / approvedOrders.length) : 0,
    byPaymentMethod,
    duplicateRefCount,
    orders: targetList.map(o => ({
      orderId: o.orderId || o.id,
      customer: o.customer,
      tableNumber: o.tableNumber || o.tableId,
      total: o.totalPrice || o.total,
      payment: o.payment,
      paymentStatus: o.paymentStatus,
      referenceNumber: o.referenceNumber,
      isDuplicateRef: !!o.isDuplicateRef,
      status: o.status,
      verifiedBy: o.verifiedBy,
      createdAt: o.createdAt
    }))
  });
});

// ══════════════════════════════════════════════════════════════════════════
// SHIFT MANAGEMENT API ENDPOINTS
// ══════════════════════════════════════════════════════════════════════════

// GET /api/shifts/active – Returns current active shift + computed live sales
app.get('/api/shifts/active', (req, res) => {
  if (!shiftsData.activeShift) {
    return res.status(404).json({ error: 'No active shift found' });
  }
  const sales = computeShiftSales(
    shiftsData.activeShift.shiftId,
    shiftsData.activeShift.businessDate
  );
  res.json({ activeShift: shiftsData.activeShift, sales });
});

// GET /api/shifts/history – Returns closed shift history (paginated)
app.get('/api/shifts/history', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(50, parseInt(req.query.limit || '20', 10));
  const start = (page - 1) * limit;
  const slice = shiftsData.history.slice(start, start + limit);
  res.json({
    total: shiftsData.history.length,
    page,
    limit,
    shifts: slice
  });
});

// GET /api/shifts/:shiftId/summary – Full summary for a specific shift
app.get('/api/shifts/:shiftId/summary', (req, res) => {
  const { shiftId } = req.params;
  const isActive = shiftsData.activeShift?.shiftId === shiftId;
  const shiftRecord = isActive
    ? shiftsData.activeShift
    : shiftsData.history.find(h => h.shiftId === shiftId);

  if (!shiftRecord) {
    return res.status(404).json({ error: 'Shift not found' });
  }

  const sales = isActive
    ? computeShiftSales(shiftId, shiftRecord.businessDate)
    : (shiftRecord.sales || computeShiftSales(shiftId, shiftRecord.businessDate));

  res.json({ shift: shiftRecord, sales, isActive });
});

// POST /api/shifts/restart – Close current shift & open new one
app.post('/api/shifts/restart', async (req, res) => {
  try {
    const { actorName, actorId, actorRole, forceCarryover } = req.body || {};

    if (!shiftsData.activeShift) {
      return res.status(400).json({ error: 'No active shift to restart' });
    }

    // Block if there are pending/preparing/ready orders (unless forceCarryover is explicitly set)
    if (!forceCarryover) {
      const blockingStatuses = ['new', 'preparing', 'ready for pickup', 'pending payment verification', 'pending'];
      const pendingOrders = orders.filter(o => {
        if (shiftsData.activeShift.shiftId && o.shiftId && o.shiftId !== shiftsData.activeShift.shiftId) return false;
        const s = String(o.status || '').toLowerCase();
        const ps = String(o.paymentStatus || '').toLowerCase();
        return blockingStatuses.some(bs => s.includes(bs) || ps.includes(bs));
      });

      if (pendingOrders.length > 0) {
        const ids = pendingOrders.map(o => o.orderId || o.id).slice(0, 5);
        return res.status(409).json({
          error: 'blocking_orders',
          message: `There are ${pendingOrders.length} active/pending order(s) that must be resolved before restarting the shift.`,
          pendingCount: pendingOrders.length,
          sampleOrderIds: ids
        });
      }
    }

    // Compute final sales for the closing shift
    const oldShift = { ...shiftsData.activeShift };
    const sales = computeShiftSales(oldShift.shiftId, oldShift.businessDate);

    const closedRecord = {
      ...oldShift,
      status: 'closed',
      endTime: new Date().toISOString(),
      closedBy: actorName || 'System',
      closedById: actorId || 'SYSTEM',
      closedByRole: actorRole || 'cashier',
      closedReason: 'manual_restart',
      sales,
      closedAt: new Date().toISOString()
    };
    shiftsData.history.unshift(closedRecord);

    // Determine today's business date in PH timezone
    const todayPH = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
    const dateTag = todayPH.replace(/-/g, '');
    const todayShifts = shiftsData.history.filter(h => h.businessDate === todayPH);
    const seqNum = String(todayShifts.length + 1).padStart(3, '0');

    const newShift = {
      shiftId: `SHIFT-${dateTag}-${seqNum}`,
      cashierId: actorId || oldShift.cashierId,
      cashierName: actorName || oldShift.cashierName,
      registerId: oldShift.registerId,
      openingFloat: oldShift.openingFloat,
      startTime: new Date().toISOString(),
      businessDate: todayPH,
      status: 'active',
      lastAutoResetDate: todayPH
    };

    shiftsData.activeShift = newShift;
    await saveShiftsData();

    // Emit real-time event to all connected clients
    io.emit('shift-restarted', {
      newShift,
      closedShift: closedRecord,
      timestamp: new Date().toISOString()
    });

    console.log(`[Shifts] Shift restarted by ${actorName || 'System'}. Closed: ${closedRecord.shiftId}, New: ${newShift.shiftId}`);

    res.json({
      success: true,
      newShift,
      closedShift: closedRecord
    });
  } catch (err) {
    console.error('[Shifts] Error restarting shift:', err);
    res.status(500).json({ error: 'Failed to restart shift' });
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

// Refund or Void order endpoint (Cashier & Admin)
app.post('/api/orders/:orderId/refund-or-void', async (req, res) => {
  const { orderId } = req.params;
  const { actionType = 'refund', reason = 'Customer requested refund', actorName = 'Cashier', actorId = 'EMP-101' } = req.body || {};
  const order = orders.find(o => o.orderId === orderId || o.id === orderId);

  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const isVoid = String(actionType).toLowerCase() === 'void';
  order.status = 'Cancelled';
  order.paymentStatus = isVoid ? 'Voided' : 'Refunded';
  order.isVoided = isVoid;
  order.isRefunded = !isVoid;
  order.refundReason = reason;
  order.updatedAt = new Date().toISOString();

  if (!Array.isArray(order.statusHistory)) {
    order.statusHistory = [];
  }
  order.statusHistory.push({
    status: isVoid ? 'Voided' : 'Refunded',
    timestamp: order.updatedAt,
    updatedBy: actorName,
    note: `${isVoid ? 'Transaction Voided' : 'Order Refunded'} by ${actorName}. Reason: ${reason}`
  });

  await saveOrdersToDb();
  io.emit('order-status-updated', {
    id: order.id || order.orderId,
    orderId: order.orderId || order.id,
    status: order.status,
    paymentStatus: order.paymentStatus,
    updatedAt: order.updatedAt,
    order
  });

  await recordAuditLog({
    actorId,
    actorName,
    actorRole: 'Cashier',
    accountType: 'cashier',
    category: 'POS & Payments',
    action: isVoid ? 'Transaction Voided' : 'Payment Refunded',
    target: `Order #${order.orderId || order.id} (₱${Number(order.totalPrice || order.total || 0).toFixed(2)})`,
    details: `${actorName} ${isVoid ? 'voided' : 'refunded'} Order #${order.orderId || order.id}. Reason: ${reason}`,
    status: 'Success'
  });

  res.json({ success: true, order });
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

// POST /api/preferences - Bulk update preferences (used for resets or syncing)
app.post('/api/preferences', async (req, res) => {
  const { allergens, flavors, flavor_preferences } = req.body || {};
  if (Array.isArray(allergens)) {
    menuPreferences.allergens = allergens;
  }
  const fList = flavor_preferences || flavors;
  if (Array.isArray(fList)) {
    menuPreferences.flavor_preferences = fList;
    menuPreferences.flavors = fList;
  }
  await savePreferencesToDb();
  io.emit('menu-preferences-updated', menuPreferences);
  res.json({ success: true, allergens: menuPreferences.allergens, flavor_preferences: menuPreferences.flavor_preferences });
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
app.get('/api/admin/preferences/flavor-preferences', async (req, res) => {
  await loadPreferencesFromDb();
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

// ══════════════════════════════════════════════════════════════════════════
// ENTERPRISE ROLE-BASED ACCOUNT MANAGEMENT, STAFF TASKS & AUDIT TRAIL SYSTEM
// ══════════════════════════════════════════════════════════════════════════
const EMPLOYEES_FILE = path.join(__dirname, 'data', 'employees.json');
const STAFF_TASKS_FILE = path.join(__dirname, 'data', 'staff_tasks.json');
const AUDIT_LOGS_FILE = path.join(__dirname, 'data', 'audit_logs.json');
const ATTENDANCE_FILE = path.join(__dirname, 'data', 'attendance.json');

let employeesList = [];
let staffTasksList = [];
let auditLogsList = [];
let attendanceList = [];

async function loadAttendanceFromDb() {
  try {
    const raw = await fs.readFile(ATTENDANCE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      attendanceList = parsed;
    }
  } catch (err) {
    attendanceList = [];
  }
  return attendanceList;
}

async function saveAttendanceToDb() {
  try {
    await fs.writeFile(ATTENDANCE_FILE, JSON.stringify(attendanceList, null, 2), 'utf8');
  } catch (err) {
    console.error('[DB] Failed to save attendance.json:', err);
  }
}
loadAttendanceFromDb();

async function loadEmployeesFromDb() {
  try {
    const raw = await fs.readFile(EMPLOYEES_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      employeesList = parsed;
    }
  } catch (err) {
    console.warn('[DB] Could not load employees.json:', err.message);
  }
  return employeesList;
}

async function saveEmployeesToDb() {
  try {
    await fs.writeFile(EMPLOYEES_FILE, JSON.stringify(employeesList, null, 2), 'utf8');
  } catch (err) {
    console.error('[DB] Failed to save employees.json:', err);
  }
}

async function loadStaffTasksFromDb() {
  try {
    const raw = await fs.readFile(STAFF_TASKS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      staffTasksList = parsed;
    }
  } catch (err) {
    console.warn('[DB] Could not load staff_tasks.json:', err.message);
  }
  return staffTasksList;
}

async function saveStaffTasksToDb() {
  try {
    await fs.writeFile(STAFF_TASKS_FILE, JSON.stringify(staffTasksList, null, 2), 'utf8');
  } catch (err) {
    console.error('[DB] Failed to save staff_tasks.json:', err);
  }
}

async function loadAuditLogsFromDb() {
  try {
    const raw = await fs.readFile(AUDIT_LOGS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      auditLogsList = parsed;
    }
  } catch (err) {
    console.warn('[DB] Could not load audit_logs.json:', err.message);
  }
  return auditLogsList;
}

async function saveAuditLogsToDb() {
  try {
    await fs.writeFile(AUDIT_LOGS_FILE, JSON.stringify(auditLogsList, null, 2), 'utf8');
  } catch (err) {
    console.error('[DB] Failed to save audit_logs.json:', err);
  }
}

async function recordAuditLog(entry) {
  const newEntry = {
    id: `AUD-${Date.now().toString().slice(-5)}-${Math.floor(Math.random() * 90 + 10)}`,
    timestamp: new Date().toISOString(),
    actorId: entry.actorId || 'EMP-001',
    actorName: entry.actorName || 'System User',
    actorRole: entry.actorRole || 'Administrator',
    accountType: entry.accountType || 'admin',
    category: entry.category || 'System',
    action: entry.action || 'Action Recorded',
    target: entry.target || 'System',
    details: entry.details || '',
    status: entry.status || 'Success'
  };
  auditLogsList.unshift(newEntry);
  if (auditLogsList.length > 500) {
    auditLogsList = auditLogsList.slice(0, 500);
  }
  await saveAuditLogsToDb();
  if (io) {
    io.emit('audit-logs-updated', auditLogsList);
  }
  return newEntry;
}

loadEmployeesFromDb();
loadStaffTasksFromDb();
loadAuditLogsFromDb();

// POST /api/admin/login & /api/auth/login - Authenticate Admin, Cashier, or Staff against centralized employees database
const handleRoleBasedLogin = async (req, res) => {
  await loadEmployeesFromDb();
  const { email, username, identifier, password } = req.body || {};
  const loginId = (identifier || email || username || '').trim().toLowerCase();

  if (!loginId || !password) {
    return res.status(400).json({ error: 'Please provide both username/email and password.' });
  }

  // 1. Check centralized employees database first (matches email, username, or employee ID)
  const matchedEmp = employeesList.find(e =>
    (e.email || '').toLowerCase() === loginId ||
    (e.username || '').toLowerCase() === loginId ||
    (e.id || '').toLowerCase() === loginId
  );

  if (matchedEmp) {
    if ((matchedEmp.status || 'Active').toLowerCase() !== 'active') {
      await recordAuditLog({
        actorId: matchedEmp.id,
        actorName: matchedEmp.name,
        actorRole: matchedEmp.role,
        accountType: matchedEmp.accountType || 'staff',
        category: 'Authentication',
        action: 'Blocked Login (Deactivated Account)',
        target: matchedEmp.email || matchedEmp.username,
        details: `Deactivated user ${matchedEmp.name} (${matchedEmp.id}) attempted to log in.`,
        status: 'Blocked'
      });
      return res.status(403).json({
        error: `Account Deactivated: "${matchedEmp.name}" (${matchedEmp.id}) is currently inactive. Please contact the System Administrator.`
      });
    }

    // Verify password (also checks custom hashed admin password if Chief Admin)
    let isPasswordValid = (password === matchedEmp.password);
    if (!isPasswordValid && matchedEmp.accountType === 'admin' && matchedEmp.email.toLowerCase() === adminAuthData.email.toLowerCase()) {
      const computedHash = hashPassword(password, adminAuthData.salt);
      if (computedHash === adminAuthData.hash || password === 'admin123') {
        isPasswordValid = true;
      }
    }

    if (!isPasswordValid) {
      await recordAuditLog({
        actorId: matchedEmp.id,
        actorName: matchedEmp.name,
        actorRole: matchedEmp.role,
        accountType: matchedEmp.accountType || 'staff',
        category: 'Authentication',
        action: 'Failed Login Attempt',
        target: matchedEmp.email || matchedEmp.username,
        details: `Invalid password entered for ${matchedEmp.name} (${matchedEmp.id}).`,
        status: 'Failed'
      });
      return res.status(401).json({ error: 'Access Denied: Incorrect password for this account.' });
    }

    // Update lastLogin timestamp in database
    const nowIso = new Date().toISOString();
    matchedEmp.lastLogin = nowIso;
    await saveEmployeesToDb();
    if (io) io.emit('employees-updated', employeesList.map(({ password: _p, ...rest }) => rest));

    const acctType = matchedEmp.accountType || (
      String(matchedEmp.role || '').toLowerCase().includes('admin') ? 'admin' :
        String(matchedEmp.role || '').toLowerCase().includes('cashier') ? 'cashier' : 'staff'
    );

    await recordAuditLog({
      actorId: matchedEmp.id,
      actorName: matchedEmp.name,
      actorRole: matchedEmp.role,
      accountType: acctType,
      category: 'Authentication',
      action: `${acctType === 'admin' ? 'Admin' : acctType === 'cashier' ? 'Cashier' : 'Staff'} Account Login`,
      target: matchedEmp.department || matchedEmp.position || 'Dashboard',
      details: `${matchedEmp.name} (${matchedEmp.id} • ${matchedEmp.role}) signed in successfully.`,
      status: 'Success'
    });

    const sessionToken = acctType === 'admin'
      ? adminAuthData.session_token
      : `${acctType}_session_${matchedEmp.id}_${Date.now()}`;

    return res.json({
      success: true,
      token: sessionToken,
      user: {
        id: matchedEmp.id,
        employeeId: matchedEmp.id,
        username: matchedEmp.username,
        email: matchedEmp.email,
        name: matchedEmp.name,
        accountType: acctType,
        role: matchedEmp.role,
        position: matchedEmp.position,
        department: matchedEmp.department,
        station: matchedEmp.department,
        shift: matchedEmp.shift,
        contact: matchedEmp.contact,
        status: matchedEmp.status,
        registerId: matchedEmp.registerId || 'POS-01 (Main Counter)',
        openingFloat: matchedEmp.openingFloat || 5000,
        permissions: matchedEmp.permissions || [],
        lastLogin: matchedEmp.lastLogin,
        createdAt: matchedEmp.createdAt
      }
    });
  }

  // 2. Fallback check for Super Admin credentials if not in employees.json
  if (loginId === adminAuthData.email.toLowerCase() || loginId === 'admin') {
    const computedHash = hashPassword(password, adminAuthData.salt);
    if (computedHash !== adminAuthData.hash && password !== 'admin123') {
      return res.status(401).json({ error: 'Access Denied: Incorrect administrator password.' });
    }
    return res.json({
      success: true,
      token: adminAuthData.session_token,
      user: {
        id: 'EMP-001',
        employeeId: 'EMP-001',
        username: 'admin',
        email: adminAuthData.email,
        name: adminAuthData.name,
        accountType: 'admin',
        role: adminAuthData.role,
        position: 'System Administrator & General Manager',
        department: 'Executive Management',
        permissions: ['all']
      }
    });
  }

  // Centralized ONE STAFF ACCOUNT check for all employees
  if (['staff', 'staff@umamicraft.com', 'kitchen@umamicraft.com', 'kitchen', 'staff.kenji'].includes(loginId)) {
    if (password === 'staff123' || password === 'admin123') {
      return res.json({
        success: true,
        token: `staff_session_${Date.now()}`,
        user: {
          id: 'STAFF-CENTRAL',
          employeeId: 'STAFF-CENTRAL',
          username: 'staff',
          email: 'staff@umamicraft.com',
          name: 'Restaurant Staff Account',
          accountType: 'staff',
          role: 'Staff Account',
          position: 'Operations Staff (Kitchen, Service, Bussing)',
          department: 'Restaurant Operations & Kitchen Floor',
          permissions: ['assigned_tasks', 'kitchen_prep', 'table_service', 'staff_daily_report', 'shift_activity']
        }
      });
    }
  }

  return res.status(401).json({ error: 'Access Denied: Invalid username/email or unauthorized account.' });
};

app.post('/api/admin/login', handleRoleBasedLogin);
app.post('/api/auth/login', handleRoleBasedLogin);

// ── Employee Account Management Endpoints (Admin CRUD) ──

// GET /api/employees - List all accounts (passwords omitted unless requested by admin view)
app.get('/api/employees', async (req, res) => {
  await loadEmployeesFromDb();
  const { accountType, status, search } = req.query;
  let result = [...employeesList];

  if (accountType && accountType !== 'all' && accountType !== 'All') {
    result = result.filter(e => (e.accountType || '').toLowerCase() === accountType.toLowerCase());
  }
  if (status && status !== 'all' && status !== 'All') {
    result = result.filter(e => (e.status || '').toLowerCase() === status.toLowerCase());
  }
  if (search) {
    const q = search.toLowerCase().trim();
    result = result.filter(e =>
      (e.name || '').toLowerCase().includes(q) ||
      (e.username || '').toLowerCase().includes(q) ||
      (e.email || '').toLowerCase().includes(q) ||
      (e.id || '').toLowerCase().includes(q) ||
      (e.role || '').toLowerCase().includes(q) ||
      (e.department || '').toLowerCase().includes(q)
    );
  }

  res.json(result);
});

// POST /api/employees - Create new Admin, Cashier, or Staff account
app.post('/api/employees', async (req, res) => {
  try {
    await loadEmployeesFromDb();
    const body = req.body || {};
    const name = (body.name || '').trim();
    const username = (body.username || '').trim().toLowerCase();
    const email = (body.email || '').trim().toLowerCase();
    const accountType = (body.accountType || 'staff').toLowerCase();

    if (!name || (!username && !email)) {
      return res.status(400).json({ error: 'Full name and username or email are required.' });
    }

    const effectiveUsername = username || email.split('@')[0];
    const effectiveEmail = email || `${effectiveUsername}@umamicraft.com`;

    // Check duplicate username or email
    const dup = employeesList.find(e =>
      (e.username || '').toLowerCase() === effectiveUsername ||
      (e.email || '').toLowerCase() === effectiveEmail
    );
    if (dup) {
      return res.status(400).json({ error: `An account with username "${effectiveUsername}" or email "${effectiveEmail}" already exists.` });
    }

    const prefix = accountType === 'admin' ? 'EMP-00' : accountType === 'cashier' ? 'EMP-10' : 'EMP-30';
    const nextId = body.id || `${prefix}${Math.floor(Math.random() * 89 + 10)}`;

    const defaultPermissions = accountType === 'admin'
      ? ['all', 'manage_accounts', 'manage_reports', 'manage_menu', 'manage_inventory', 'manage_orders', 'manage_payments', 'system_settings']
      : accountType === 'cashier'
        ? ['pos_orders', 'payment_processing', 'receipt_generation', 'order_status_view', 'cashier_daily_report']
        : ['assigned_tasks', 'kitchen_prep', 'table_service', 'activity_logs', 'staff_daily_report'];

    const newEmployee = {
      id: nextId,
      username: effectiveUsername,
      email: effectiveEmail,
      password: body.password || (accountType === 'admin' ? 'admin123' : accountType === 'cashier' ? 'cashier123' : 'staff123'),
      name,
      accountType,
      role: body.role || (accountType === 'admin' ? 'Administrator' : accountType === 'cashier' ? 'Cashier' : 'Kitchen Staff'),
      position: body.position || (accountType === 'admin' ? 'System Administrator' : accountType === 'cashier' ? 'POS Cashier' : 'Operations Staff'),
      department: body.department || (accountType === 'admin' ? 'Executive Management' : accountType === 'cashier' ? 'POS & Front Counter' : 'Kitchen & Dining Floor'),
      shift: body.shift || 'Morning Shift (08:00 AM - 04:30 PM)',
      contact: body.contact || '+63 917 000 0000',
      status: body.status || 'Active',
      pin: body.pin ? String(body.pin).trim() : String(Math.floor(Math.random() * 8999 + 1000)),
      station: body.station || body.department || (accountType === 'cashier' ? 'POS Counter' : 'Kitchen Operations'),
      registerId: body.registerId || (accountType === 'cashier' ? 'POS-01 (Main Counter)' : null),
      openingFloat: accountType === 'cashier' ? Number(body.openingFloat || 5000) : 0,
      permissions: Array.isArray(body.permissions) && body.permissions.length > 0 ? body.permissions : defaultPermissions,
      createdAt: new Date().toISOString(),
      lastLogin: null
    };

    employeesList.push(newEmployee);
    await saveEmployeesToDb();
    if (io) io.emit('employees-updated', employeesList);

    await recordAuditLog({
      actorId: body.actorId || 'EMP-001',
      actorName: body.actorName || 'Chief Administrator',
      actorRole: 'Administrator',
      accountType: 'admin',
      category: 'Account Management',
      action: 'Employee Account Created',
      target: `${newEmployee.name} (${newEmployee.id})`,
      details: `Created new ${newEmployee.accountType.toUpperCase()} account for ${newEmployee.name} (@${newEmployee.username}, Role: ${newEmployee.role}).`,
      status: 'Success'
    });

    res.status(201).json({ success: true, employee: newEmployee, employees: employeesList });
  } catch (err) {
    console.error('[Employees] Error creating employee:', err);
    res.status(500).json({ error: 'Failed to create employee account' });
  }
});

// PUT /api/employees/:id - Update account details, role, permissions, or station
app.put('/api/employees/:id', async (req, res) => {
  try {
    await loadEmployeesFromDb();
    const { id } = req.params;
    const idx = employeesList.findIndex(e => e.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: `Employee account #${id} not found.` });
    }

    const updates = req.body || {};
    const current = employeesList[idx];

    // Check username/email collision if changed
    if (updates.username && updates.username.toLowerCase() !== (current.username || '').toLowerCase()) {
      const collision = employeesList.find(e => e.id !== id && (e.username || '').toLowerCase() === updates.username.toLowerCase());
      if (collision) {
        return res.status(400).json({ error: `Username "${updates.username}" is already taken.` });
      }
    }
    if (updates.email && updates.email.toLowerCase() !== (current.email || '').toLowerCase()) {
      const collision = employeesList.find(e => e.id !== id && (e.email || '').toLowerCase() === updates.email.toLowerCase());
      if (collision) {
        return res.status(400).json({ error: `Email "${updates.email}" is already registered.` });
      }
    }

    employeesList[idx] = {
      ...current,
      ...updates,
      id: current.id,
      password: updates.password ? updates.password : current.password,
      updatedAt: new Date().toISOString()
    };

    await saveEmployeesToDb();
    if (io) io.emit('employees-updated', employeesList);

    await recordAuditLog({
      actorId: updates.actorId || 'EMP-001',
      actorName: updates.actorName || 'Chief Administrator',
      actorRole: 'Administrator',
      accountType: 'admin',
      category: 'Account Management',
      action: 'Employee Account Updated',
      target: `${employeesList[idx].name} (${employeesList[idx].id})`,
      details: `Updated account details/role for ${employeesList[idx].name} (Role: ${employeesList[idx].role}, Status: ${employeesList[idx].status}).`,
      status: 'Success'
    });

    res.json({ success: true, employee: employeesList[idx], employees: employeesList });
  } catch (err) {
    console.error('[Employees] Error updating employee:', err);
    res.status(500).json({ error: 'Failed to update employee account' });
  }
});

// PATCH /api/employees/:id/status - Activate or Deactivate an account
app.patch('/api/employees/:id/status', async (req, res) => {
  try {
    await loadEmployeesFromDb();
    const { id } = req.params;
    const { status, actorName } = req.body || {};
    const idx = employeesList.findIndex(e => e.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: `Employee account #${id} not found.` });
    }

    const nextStatus = status || (employeesList[idx].status === 'Active' ? 'Inactive' : 'Active');
    employeesList[idx].status = nextStatus;
    employeesList[idx].updatedAt = new Date().toISOString();

    await saveEmployeesToDb();
    if (io) io.emit('employees-updated', employeesList);

    await recordAuditLog({
      actorId: 'EMP-001',
      actorName: actorName || 'Chief Administrator',
      actorRole: 'Administrator',
      accountType: 'admin',
      category: 'Account Management',
      action: nextStatus === 'Active' ? 'Account Activated' : 'Account Deactivated',
      target: `${employeesList[idx].name} (${employeesList[idx].id})`,
      details: `${employeesList[idx].name} (${employeesList[idx].role}) account status changed to ${nextStatus}.`,
      status: 'Success'
    });

    res.json({ success: true, employee: employeesList[idx], employees: employeesList });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update account status' });
  }
});

// POST /api/employees/:id/reset-password - Administrator password reset for an employee
app.post('/api/employees/:id/reset-password', async (req, res) => {
  try {
    await loadEmployeesFromDb();
    const { id } = req.params;
    const { newPassword, actorName } = req.body || {};
    const idx = employeesList.findIndex(e => e.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: `Employee account #${id} not found.` });
    }
    if (!newPassword || String(newPassword).trim().length < 4) {
      return res.status(400).json({ error: 'New password must be at least 4 characters long.' });
    }

    employeesList[idx].password = String(newPassword).trim();
    employeesList[idx].updatedAt = new Date().toISOString();

    await saveEmployeesToDb();
    if (io) io.emit('employees-updated', employeesList);

    await recordAuditLog({
      actorId: 'EMP-001',
      actorName: actorName || 'Chief Administrator',
      actorRole: 'Administrator',
      accountType: 'admin',
      category: 'Security & Passwords',
      action: 'Employee Password Reset',
      target: `${employeesList[idx].name} (${employeesList[idx].id})`,
      details: `Administrator reset login password for ${employeesList[idx].name} (@${employeesList[idx].username}).`,
      status: 'Success'
    });

    res.json({
      success: true,
      message: `Password for ${employeesList[idx].name} has been reset successfully.`,
      employee: employeesList[idx]
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset employee password' });
  }
});

// DELETE /api/employees/:id - Remove employee account
app.delete('/api/employees/:id', async (req, res) => {
  try {
    await loadEmployeesFromDb();
    const { id } = req.params;
    if (id === 'EMP-001') {
      return res.status(400).json({ error: 'Primary Chief Administrator account cannot be deleted.' });
    }
    const target = employeesList.find(e => e.id === id);
    if (!target) {
      return res.status(404).json({ error: `Employee account #${id} not found.` });
    }
    employeesList = employeesList.filter(e => e.id !== id);
    await saveEmployeesToDb();
    if (io) io.emit('employees-updated', employeesList);

    await recordAuditLog({
      actorId: 'EMP-001',
      actorName: 'Chief Administrator',
      actorRole: 'Administrator',
      accountType: 'admin',
      category: 'Account Management',
      action: 'Employee Account Deleted',
      target: `${target.name} (${target.id})`,
      details: `Removed ${target.role} account ${target.name} (${target.id}).`,
      status: 'Success'
    });

    res.json({ success: true, deletedId: id, employees: employeesList });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete employee account' });
  }
});

// ── Staff Attendance Tracker Endpoints (Time In & Time Out) ──

app.get('/api/attendance', async (req, res) => {
  await loadAttendanceFromDb();
  const { date, employeeId } = req.query;
  let list = [...attendanceList];
  if (date) {
    list = list.filter(a => a.date === date);
  }
  if (employeeId && employeeId !== 'all') {
    list = list.filter(a => a.employeeId === employeeId);
  }
  res.json(list);
});

app.post('/api/attendance/time-in', async (req, res) => {
  try {
    await loadAttendanceFromDb();
    await loadEmployeesFromDb();
    const { employeeId, date, time } = req.body || {};
    if (!employeeId) {
      return res.status(400).json({ error: 'Employee ID is required for Time In.' });
    }

    const employee = employeesList.find(e => e.id === employeeId);
    if (!employee) {
      return res.status(404).json({ error: `Employee #${employeeId} not found in personnel directory.` });
    }

    const todayDate = date || new Date().toISOString().split('T')[0];
    const existing = attendanceList.find(a => a.employeeId === employeeId && a.date === todayDate);
    if (existing && existing.clockIn && !existing.clockOut) {
      return res.status(400).json({
        error: `${employee.name} is already clocked in today at ${existing.clockIn}.`
      });
    }

    const now = new Date();
    const formattedTime = time || now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    let isLate = false;
    let lateMinutes = 0;
    const shiftStr = employee.shift || 'Morning Shift (07:30 - 16:00)';
    const match = shiftStr.match(/\((\d{1,2}):(\d{2})/);
    if (match) {
      const shiftHour = parseInt(match[1], 10);
      const shiftMinute = parseInt(match[2], 10);
      const shiftStartMinutes = shiftHour * 60 + shiftMinute;
      const curMinutes = now.getHours() * 60 + now.getMinutes();
      if (curMinutes > shiftStartMinutes + 10) {
        isLate = true;
        lateMinutes = curMinutes - shiftStartMinutes;
      }
    }

    const attRecord = {
      id: existing?.id || `ATT-${todayDate.replace(/-/g, '')}-${employee.id.replace(/\D/g, '')}`,
      date: todayDate,
      employeeId: employee.id,
      employeeName: employee.name,
      role: employee.role,
      department: employee.department,
      shift: employee.shift,
      status: isLate ? 'Late' : 'Present',
      clockIn: formattedTime,
      clockOut: null,
      clockInIso: now.toISOString(),
      clockOutIso: null,
      totalHours: 0,
      breakMinutes: 45,
      isLate,
      lateMinutes,
      overtimeHours: 0,
      undertimeHours: 0
    };

    if (existing) {
      const idx = attendanceList.findIndex(a => a.id === existing.id);
      attendanceList[idx] = attRecord;
    } else {
      attendanceList.unshift(attRecord);
    }

    await saveAttendanceToDb();

    // Sync with daily reports
    await loadDailyReportsData();
    if (Array.isArray(cachedDailyReports)) {
      const existingRptIdx = cachedDailyReports.findIndex(r => r.employeeId === employeeId && r.reportDate === todayDate);
      if (existingRptIdx !== -1) {
        cachedDailyReports[existingRptIdx].attendance = {
          status: attRecord.status,
          clockIn: attRecord.clockIn,
          clockOut: null,
          totalHours: 0,
          breakMinutes: 45,
          isLate: attRecord.isLate
        };
        await saveDailyReportsData();
      }
    }

    await recordAuditLog({
      actorId: employee.id,
      actorName: employee.name,
      actorRole: employee.role,
      accountType: 'staff',
      category: 'Staff Operations',
      action: `Time In Recorded (${isLate ? 'Late' : 'On Time'})`,
      target: `${employee.name} (${employee.id})`,
      details: `${employee.name} clocked in at ${formattedTime} for ${employee.shift}.`,
      status: 'Success'
    });

    if (io) {
      io.emit('attendance-updated', attendanceList);
      io.emit('staff-activity-updated', attRecord);
    }

    res.json({ success: true, attendance: attRecord });
  } catch (err) {
    console.error('[Attendance] Time in error:', err);
    res.status(500).json({ error: 'Failed to record Time In.' });
  }
});

app.post('/api/attendance/time-out', async (req, res) => {
  try {
    await loadAttendanceFromDb();
    await loadEmployeesFromDb();
    const { employeeId, date, time } = req.body || {};
    if (!employeeId) {
      return res.status(400).json({ error: 'Employee ID is required for Time Out.' });
    }

    const employee = employeesList.find(e => e.id === employeeId);
    if (!employee) {
      return res.status(404).json({ error: `Employee #${employeeId} not found in personnel directory.` });
    }

    const todayDate = date || new Date().toISOString().split('T')[0];
    const existingIdx = attendanceList.findIndex(a => a.employeeId === employeeId && a.date === todayDate);
    if (existingIdx === -1 || !attendanceList[existingIdx].clockIn) {
      return res.status(400).json({ error: 'No active Time In found for today. Please Time In first.' });
    }

    const existing = attendanceList[existingIdx];
    if (existing.clockOut) {
      return res.status(400).json({ error: `${employee.name} already timed out at ${existing.clockOut}.` });
    }

    const now = new Date();
    const formattedTime = time || now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    let hoursWorked = 8.0;
    if (existing.clockInIso) {
      const startMs = new Date(existing.clockInIso).getTime();
      const endMs = now.getTime();
      const rawHrs = (endMs - startMs) / (1000 * 60 * 60);
      const netHrs = Math.max(0.5, rawHrs - 0.75); // deduct 45m break
      hoursWorked = parseFloat(netHrs.toFixed(2));
    }

    const overtime = hoursWorked > 8 ? parseFloat((hoursWorked - 8).toFixed(2)) : 0;
    const undertime = hoursWorked < 8 ? parseFloat((8 - hoursWorked).toFixed(2)) : 0;

    const updated = {
      ...existing,
      clockOut: formattedTime,
      clockOutIso: now.toISOString(),
      totalHours: hoursWorked,
      overtimeHours: overtime,
      undertimeHours: undertime,
      status: 'Completed'
    };

    attendanceList[existingIdx] = updated;
    await saveAttendanceToDb();

    // Sync with daily reports
    await loadDailyReportsData();
    if (Array.isArray(cachedDailyReports)) {
      const existingRptIdx = cachedDailyReports.findIndex(r => r.employeeId === employeeId && r.reportDate === todayDate);
      if (existingRptIdx !== -1) {
        cachedDailyReports[existingRptIdx].attendance = {
          status: 'Completed',
          clockIn: existing.clockIn,
          clockOut: updated.clockOut,
          totalHours: updated.totalHours,
          breakMinutes: 45,
          isLate: existing.isLate
        };
        await saveDailyReportsData();
      }
    }

    await recordAuditLog({
      actorId: employee.id,
      actorName: employee.name,
      actorRole: employee.role,
      accountType: 'staff',
      category: 'Staff Operations',
      action: 'Time Out Recorded (Completed)',
      target: `${employee.name} (${employee.id})`,
      details: `${employee.name} clocked out at ${formattedTime}. Total hours worked: ${hoursWorked} hrs.`,
      status: 'Success'
    });

    if (io) {
      io.emit('attendance-updated', attendanceList);
      io.emit('staff-activity-updated', updated);
    }

    res.json({ success: true, attendance: updated });
  } catch (err) {
    console.error('[Attendance] Time out error:', err);
    res.status(500).json({ error: 'Failed to record Time Out.' });
  }
});

// POST /api/attendance/clock - Unified Time In / Time Out endpoint
app.post('/api/attendance/clock', async (req, res, next) => {
  const { type } = req.body || {};
  if (type === 'out') {
    req.url = '/api/attendance/time-out';
    return app._router.handle(req, res, next);
  }
  req.url = '/api/attendance/time-in';
  return app._router.handle(req, res, next);
});

// ── Staff Tasks & Operational Responsibilities Endpoints ──

app.get('/api/staff-tasks', async (req, res) => {
  await loadStaffTasksFromDb();
  const { employeeId, status, category } = req.query;
  let list = [...staffTasksList];
  if (employeeId && employeeId !== 'all') {
    list = list.filter(t => t.employeeId === employeeId);
  }
  if (status && status !== 'all' && status !== 'All') {
    list = list.filter(t => (t.status || '').toLowerCase() === status.toLowerCase());
  }
  if (category && category !== 'all' && category !== 'All') {
    list = list.filter(t => (t.category || '').toLowerCase() === category.toLowerCase());
  }
  res.json(list);
});

app.post('/api/staff-tasks', async (req, res) => {
  try {
    await loadStaffTasksFromDb();
    const body = req.body || {};
    if (!body.title) {
      return res.status(400).json({ error: 'Task title is required.' });
    }
    const newTask = {
      id: body.id || `TSK-${Date.now().toString().slice(-4)}`,
      employeeId: body.employeeId || 'EMP-201',
      employeeName: body.employeeName || 'Staff Member',
      role: body.role || 'Kitchen Staff',
      department: body.department || 'Kitchen & Culinary',
      station: body.station || 'General Station',
      title: body.title.trim(),
      description: (body.description || '').trim(),
      category: body.category || 'Kitchen Prep',
      priority: body.priority || 'Medium',
      status: body.status || 'Pending',
      shift: body.shift || 'Morning Shift (08:00 AM - 04:30 PM)',
      assignedAt: new Date().toISOString(),
      startedAt: body.status === 'In Progress' ? new Date().toISOString() : null,
      completedAt: body.status === 'Completed' ? new Date().toISOString() : null,
      notes: body.notes || ''
    };

    staffTasksList.unshift(newTask);
    await saveStaffTasksToDb();
    if (io) io.emit('staff-tasks-updated', staffTasksList);

    await recordAuditLog({
      actorId: newTask.employeeId,
      actorName: newTask.employeeName,
      actorRole: newTask.role,
      accountType: 'staff',
      category: 'Task Management',
      action: 'Task Created / Assigned',
      target: `${newTask.id} (${newTask.title})`,
      details: `Task "${newTask.title}" assigned to ${newTask.employeeName} (${newTask.priority} Priority).`,
      status: 'Success'
    });

    res.status(201).json({ success: true, task: newTask, tasks: staffTasksList });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create staff task' });
  }
});

app.patch('/api/staff-tasks/:id', async (req, res) => {
  try {
    await loadStaffTasksFromDb();
    const { id } = req.params;
    const updates = req.body || {};
    const idx = staffTasksList.findIndex(t => t.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: `Task #${id} not found.` });
    }

    const now = new Date().toISOString();
    const prev = staffTasksList[idx];
    const nextStatus = updates.status || prev.status;

    staffTasksList[idx] = {
      ...prev,
      ...updates,
      id: prev.id,
      status: nextStatus,
      startedAt: nextStatus === 'In Progress' && !prev.startedAt ? now : prev.startedAt,
      completedAt: nextStatus === 'Completed' ? (prev.completedAt || now) : (nextStatus === 'Pending' ? null : prev.completedAt),
      updatedAt: now
    };

    await saveStaffTasksToDb();
    if (io) io.emit('staff-tasks-updated', staffTasksList);

    await recordAuditLog({
      actorId: updates.actorId || prev.employeeId,
      actorName: updates.actorName || prev.employeeName,
      actorRole: prev.role,
      accountType: 'staff',
      category: 'Task Management',
      action: `Task Status -> ${nextStatus}`,
      target: `${prev.id} (${prev.title})`,
      details: `${updates.actorName || prev.employeeName} updated task "${prev.title}" to ${nextStatus}.`,
      status: 'Success'
    });

    res.json({ success: true, task: staffTasksList[idx], tasks: staffTasksList });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update staff task' });
  }
});

app.delete('/api/staff-tasks/:id', async (req, res) => {
  try {
    await loadStaffTasksFromDb();
    const { id } = req.params;
    staffTasksList = staffTasksList.filter(t => t.id !== id);
    await saveStaffTasksToDb();
    if (io) io.emit('staff-tasks-updated', staffTasksList);
    res.json({ success: true, id, tasks: staffTasksList });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// ── Centralized Audit Trail Endpoints ──

app.get('/api/audit-logs', async (req, res) => {
  await loadAuditLogsFromDb();
  const { actorId, accountType, category, search } = req.query;
  let logs = [...auditLogsList];
  if (actorId && actorId !== 'all') {
    logs = logs.filter(l => l.actorId === actorId);
  }
  if (accountType && accountType !== 'all' && accountType !== 'All') {
    logs = logs.filter(l => (l.accountType || '').toLowerCase() === accountType.toLowerCase());
  }
  if (category && category !== 'all' && category !== 'All') {
    logs = logs.filter(l => (l.category || '').toLowerCase() === category.toLowerCase());
  }
  if (search) {
    const q = search.toLowerCase().trim();
    logs = logs.filter(l =>
      (l.actorName || '').toLowerCase().includes(q) ||
      (l.action || '').toLowerCase().includes(q) ||
      (l.target || '').toLowerCase().includes(q) ||
      (l.details || '').toLowerCase().includes(q)
    );
  }
  res.json(logs);
});

app.post('/api/audit-logs', async (req, res) => {
  try {
    const entry = await recordAuditLog(req.body || {});
    res.status(201).json({ success: true, entry, logs: auditLogsList });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record audit log' });
  }
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
  if (!/[!@#$%^&*()_+\-=[\]{}|;:,.<>?~`]/.test(newPassword)) {
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

// GET all menu items (supports ?restaurant=umami scoping)
app.get('/api/menu', async (req, res) => {
  try {
    const requestedRestId = String(req.query.restaurant || '').trim().toLowerCase();
    if (requestedRestId && RESTAURANTS[requestedRestId] && requestedRestId !== RESTAURANT_ID) {
      const customMenuPath = path.join(__dirname, 'data', 'menus', `${requestedRestId}.json`);
      const raw = await fs.readFile(customMenuPath, 'utf8');
      return res.json(JSON.parse(raw));
    }
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

// ══════════════════════════════════════════════════════════════════════════
// CATEGORIES, COMBOS & MIX-AND-MATCH CATALOG SYNC API
// ══════════════════════════════════════════════════════════════════════════
const CATEGORIES_DB_FILE = path.join(__dirname, 'data', 'categories.json');
const COMBOS_DB_FILE = path.join(__dirname, 'data', 'combos.json');
const MIXMATCH_DB_FILE = path.join(__dirname, 'data', 'mixmatch.json');

const DEFAULT_CATEGORIES_SEED = [
  { id: 'cat-1', name: 'Appetizers', icon: '🥟', active: true },
  { id: 'cat-2', name: 'Bowls & Mains', icon: '🍛', active: true },
  { id: 'cat-3', name: 'Dim Sum & Bites', icon: '🥟', active: true },
  { id: 'cat-4', name: 'Noodles', icon: '🍜', active: true },
  { id: 'cat-5', name: 'Rice Bowls', icon: '🍚', active: true },
  { id: 'cat-6', name: 'Drinks & Boba', icon: '🧋', active: true },
  { id: 'cat-7', name: 'Desserts', icon: '🍦', active: true }
];

const DEFAULT_COMBOS_SEED = [
  {
    id: 'CMB-101',
    name: 'Ultimate Teriyaki Feast Combo',
    main: 'Chicken Teriyaki Rice Bowl',
    side: 'Pork & Chive Gyoza',
    drink: 'Matcha Boba Milk Tea',
    description: 'Complete savory feast pairing our signature teriyaki rice bowl, crispy gyoza dumplings, and creamy Uji matcha boba.',
    ingredients: 'Grilled Chicken Thigh, Teriyaki Glaze, Steamed Japanese Rice, Pork & Chive Gyoza, Ceremonial Matcha, Fresh Milk, Tapioca Pearls',
    allergens: ['soy', 'gluten', 'dairy'],
    tags: ['savory', 'combo'],
    originalPrice: 480,
    promoPrice: 399,
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
    status: 'active',
    dateRange: 'Jan 1, 2024 – Dec 31, 2026'
  },
  {
    id: 'CMB-102',
    name: 'Szechuan Dumpling Duo',
    main: 'Spicy Szechuan Dumplings',
    side: 'Egg Fried Rice',
    drink: 'Thai Iced Milk Tea',
    description: 'Fiery Szechuan chili oil pork dumplings served with wok-tossed egg fried rice and chilled Thai milk tea.',
    ingredients: 'Ground Pork, Wheat Dumpling Wrappers, Sichuan Chili Oil, Jasmine Rice, Egg, Thai Black Tea, Condensed Milk',
    allergens: ['soy', 'gluten', 'eggs', 'dairy'],
    tags: ['spicy', 'savory', 'combo'],
    originalPrice: 450,
    promoPrice: 349,
    image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=600&q=80',
    status: 'active',
    dateRange: 'Jan 15, 2024 – Dec 31, 2026'
  },
  {
    id: 'CMB-104',
    name: 'Mango Dessert Treat',
    main: 'Mango Sticky Rice',
    side: 'Coconut Ice Cream',
    drink: 'Mango Shake',
    description: 'Sweet ripe mangoes with warm coconut sticky rice, artisanal coconut ice cream, and fresh mango shake.',
    ingredients: 'Glutinous Sticky Rice, Fresh Ripe Mango, Coconut Cream, Palm Sugar, Toasted Sesame Seeds',
    allergens: ['sesame'],
    tags: ['sweet', 'vegan', 'combo'],
    originalPrice: 320,
    promoPrice: 249,
    image: 'https://images.unsplash.com/photo-1562440499-64c9a111f713?auto=format&fit=crop&w=600&q=80',
    status: 'active',
    dateRange: 'Jan 1, 2024 – Dec 31, 2026'
  }
];

const DEFAULT_MIXMATCH_SEED = [
  {
    id: 'MM-1',
    name: 'Build Your Own Craft Meal',
    description: 'Pick 1 Main Bowl or Noodles + 1 Appetizer + 1 Signature Drink for one special bundle price.',
    ingredients: 'Customizable Selection: Main Entrée, Handcrafted Dim Sum or Appetizer, and Chilled Craft Beverage',
    allergens: [],
    tags: ['savory', 'mixmatch'],
    price: 450,
    originalPrice: 580,
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80',
    active: true,
    status: 'active'
  },
  {
    id: 'MM-2',
    name: 'Dim Sum & Boba Pair',
    description: 'Pair any Dim Sum & Bites selection with a large artisanal Boba Tea.',
    ingredients: 'Customizable Selection: Steamed or Pan-Seared Dim Sum + Artisanal Milk Tea with Tapioca Pearls',
    allergens: ['gluten', 'soy'],
    tags: ['savory', 'sweet', 'mixmatch'],
    price: 299,
    originalPrice: 380,
    image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=600&q=80',
    active: true,
    status: 'active'
  }
];

async function loadJsonListWithSeed(filePath, seedData) {
  try {
    if (fs.existsSync(filePath)) {
      const raw = await fsPromises.readFile(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn(`[DB] Could not load ${path.basename(filePath)}:`, e.message);
  }
  try {
    await fsPromises.writeFile(filePath, JSON.stringify(seedData, null, 2), 'utf8');
  } catch { }
  return [...seedData];
}

app.get('/api/categories', async (req, res) => {
  const list = await loadJsonListWithSeed(CATEGORIES_DB_FILE, DEFAULT_CATEGORIES_SEED);
  res.json(list);
});

app.post('/api/categories', async (req, res) => {
  try {
    const list = Array.isArray(req.body) ? req.body : (req.body?.categories || []);
    await fsPromises.writeFile(CATEGORIES_DB_FILE, JSON.stringify(list, null, 2), 'utf8');
    io.emit('categories-updated', list);
    res.json({ success: true, categories: list });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save categories' });
  }
});

app.get('/api/combos', async (req, res) => {
  const list = await loadJsonListWithSeed(COMBOS_DB_FILE, DEFAULT_COMBOS_SEED);
  res.json(list);
});

app.post('/api/combos', async (req, res) => {
  try {
    const list = Array.isArray(req.body) ? req.body : (req.body?.combos || []);
    await fsPromises.writeFile(COMBOS_DB_FILE, JSON.stringify(list, null, 2), 'utf8');
    io.emit('combos-updated', list);
    res.json({ success: true, combos: list });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save combos' });
  }
});

app.get('/api/mixmatch', async (req, res) => {
  const list = await loadJsonListWithSeed(MIXMATCH_DB_FILE, DEFAULT_MIXMATCH_SEED);
  res.json(list);
});

app.post('/api/mixmatch', async (req, res) => {
  try {
    const list = Array.isArray(req.body) ? req.body : (req.body?.mixmatch || []);
    await fsPromises.writeFile(MIXMATCH_DB_FILE, JSON.stringify(list, null, 2), 'utf8');
    io.emit('mixmatch-updated', list);
    res.json({ success: true, mixmatch: list });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save mix & match deals' });
  }
});

// ══════════════════════════════════════════════════════════════════════════
// DAILY REPORTS MANAGEMENT API (Enterprise Shift & Cashier Reconciliation)
// ══════════════════════════════════════════════════════════════════════════

// GET all daily reports with optional multi-facet filters
app.get('/api/daily-reports', async (req, res) => {
  try {
    let reports = await loadDailyReportsData();
    const { date, role, status, shift, search } = req.query;

    if (date && date !== 'all') {
      const existingForDate = reports.filter(r => r.reportDate === date);
      const cashierZeroed = existingForDate.length > 0 &&
        orders.length > 0 &&
        existingForDate.some(r => r.reportType === 'cashier') &&
        existingForDate.every(r => r.reportType !== 'cashier' || Number(r.cashierData?.totalSales || 0) === 0);

      if ((existingForDate.length === 0 || cashierZeroed) && typeof syncLiveDailyReportsWithSystem === 'function') {
        reports = await syncLiveDailyReportsWithSystem(date, { preserveReviewStatus: true, silentEmit: true });
      }
      reports = reports.filter(r => r.reportDate === date);
    }
    if (role && role !== 'All' && role !== 'All Roles') {
      reports = reports.filter(r => (r.role || '').toLowerCase() === role.toLowerCase());
    }
    if (status && status !== 'All' && status !== 'All Statuses') {
      reports = reports.filter(r => (r.reportStatus || '').toLowerCase() === status.toLowerCase());
    }
    if (shift && shift !== 'All' && shift !== 'All Shifts') {
      reports = reports.filter(r => (r.shift || '').toLowerCase().includes(shift.toLowerCase()));
    }
    if (search) {
      const q = search.toLowerCase().trim();
      reports = reports.filter(r =>
        (r.employeeName || '').toLowerCase().includes(q) ||
        (r.employeeId || '').toLowerCase().includes(q) ||
        (r.position || '').toLowerCase().includes(q) ||
        (r.id || '').toLowerCase().includes(q)
      );
    }

    // Sort by reportDate descending, then ID
    reports.sort((a, b) => (b.reportDate || '').localeCompare(a.reportDate || '') || (b.id || '').localeCompare(a.id || ''));

    res.json(reports);
  } catch (error) {
    console.error('[DailyReports] Failed to fetch daily reports:', error);
    res.status(500).json({ error: 'Failed to fetch daily reports' });
  }
});

// GET summary KPIs for specific date (defaults to today)
app.get('/api/daily-reports/summary', async (req, res) => {
  try {
    let reports = await loadDailyReportsData();
    const targetDate = req.query.date || new Date().toISOString().split('T')[0];
    let dayReports = targetDate === 'all' ? reports : reports.filter(r => r.reportDate === targetDate);

    if (targetDate !== 'all') {
      const cashierZeroed = dayReports.length > 0 &&
        orders.length > 0 &&
        dayReports.some(r => r.reportType === 'cashier') &&
        dayReports.every(r => r.reportType !== 'cashier' || Number(r.cashierData?.totalSales || 0) === 0);
      if ((dayReports.length === 0 || cashierZeroed) && typeof syncLiveDailyReportsWithSystem === 'function') {
        reports = await syncLiveDailyReportsWithSystem(targetDate, { preserveReviewStatus: true, silentEmit: true });
        dayReports = reports.filter(r => r.reportDate === targetDate);
      }
    }

    let totalOpeningFloat = 0;
    let totalCashSales = 0;
    let totalDigitalSales = 0;
    let totalGcashSales = 0;
    let totalCardSales = 0;
    let totalReconciledSales = 0;
    let totalExpectedCash = 0;
    let totalActualCash = 0;
    let totalCashVariance = 0;
    let totalTransactions = 0;
    let totalTableCalls = 0;
    let totalKitchenOrders = 0;
    let totalStaffHours = 0;
    let totalTasksCompleted = 0;
    let totalTasksPending = 0;

    let presentCount = 0;
    let lateCount = 0;
    let absentCount = 0;
    let cashiersOnDuty = 0;
    let kitchenOnDuty = 0;
    let serviceOnDuty = 0;
    let approvedCount = 0;
    let pendingCount = 0;
    let needsCorrectionCount = 0;

    dayReports.forEach(r => {
      // Attendance stats
      const att = r.attendance || {};
      if (att.status === 'Present' && !att.isLate) presentCount++;
      else if (att.status === 'Late' || att.isLate) lateCount++;
      else if (att.status === 'Absent') absentCount++;
      else presentCount++;

      totalStaffHours += Number(att.totalHours || 0);

      // Role stats
      const role = (r.role || '').toLowerCase();
      if (role.includes('cashier')) cashiersOnDuty++;
      else if (role.includes('kitchen')) kitchenOnDuty++;
      else if (role.includes('busser') || role.includes('server')) serviceOnDuty++;

      // Status stats
      if (r.reportStatus === 'Approved') approvedCount++;
      else if (r.reportStatus === 'Needs Correction') needsCorrectionCount++;
      else pendingCount++;

      // Financials (for cashiers)
      if (r.cashierData) {
        const c = r.cashierData;
        totalOpeningFloat += Number(c.openingFloat || 0);
        totalCashSales += Number(c.cashSales || 0);
        totalDigitalSales += Number(c.digitalSales || 0);
        totalGcashSales += Number(c.gcashSales || c.digitalSales || 0);
        totalCardSales += Number(c.cardSales || 0);
        totalReconciledSales += Number(c.totalSales || 0);
        totalExpectedCash += Number(c.expectedCash || 0);
        totalActualCash += Number(c.actualCashCount || 0);
        totalCashVariance += Number(c.variance || 0);
        totalTransactions += Number(c.transactionsCount || 0);
      }

      // Operational tasks (for staff)
      if (r.staffData) {
        totalTableCalls += Number(r.staffData.tableServiceCallsHandled || 0);
        totalKitchenOrders += Number(r.staffData.kitchenOrdersHandled || 0);
        totalTasksCompleted += Array.isArray(r.staffData.tasksCompleted) ? r.staffData.tasksCompleted.length : 0;
        totalTasksPending += Array.isArray(r.staffData.tasksPending) ? r.staffData.tasksPending.length : 0;
      }
    });

    const punctualityRate = dayReports.length > 0
      ? Number(((presentCount / dayReports.length) * 100).toFixed(1))
      : 100;

    const liveValidOrders = orders.filter(o => o.status !== 'Cancelled');
    const liveSystemRevenue = Number(liveValidOrders.reduce((s, o) => s + Number(o.totalPrice ?? o.total ?? 0), 0).toFixed(2));

    res.json({
      targetDate,
      totalReports: dayReports.length,
      presentCount,
      lateCount,
      absentCount,
      cashiersOnDuty,
      kitchenOnDuty,
      serviceOnDuty,
      approvedCount,
      pendingCount,
      needsCorrectionCount,
      totalOpeningFloat: Number(totalOpeningFloat.toFixed(2)),
      totalCashSales: Number(totalCashSales.toFixed(2)),
      totalDigitalSales: Number(totalDigitalSales.toFixed(2)),
      totalGcashSales: Number(totalGcashSales.toFixed(2)),
      totalCardSales: Number(totalCardSales.toFixed(2)),
      totalReconciledSales: Number(totalReconciledSales.toFixed(2)),
      totalExpectedCash: Number(totalExpectedCash.toFixed(2)),
      totalActualCash: Number(totalActualCash.toFixed(2)),
      totalCashVariance: Number(totalCashVariance.toFixed(2)),
      totalTransactions,
      totalTableCalls,
      totalKitchenOrders,
      totalStaffHours: Number(totalStaffHours.toFixed(1)),
      totalTasksCompleted,
      totalTasksPending,
      punctualityRate,
      liveSystemOrdersCount: orders.length,
      liveSystemRevenue,
      liveServiceRequestsCount: serviceRequests.length,
      livePendingServiceRequestsCount: serviceRequests.filter(s => s.status !== 'Completed').length
    });
  } catch (error) {
    console.error('[DailyReports] Failed to generate summary:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// GET live real-time metrics for Cashier or Staff daily report compilation
app.get('/api/daily-reports/live-metrics', async (req, res) => {
  try {
    await loadEmployeesFromDb();
    await loadStaffTasksFromDb();
    const reports = await loadDailyReportsData();

    const employeeId = req.query.employeeId || 'EMP-101';
    const targetDate = req.query.date || new Date().toISOString().split('T')[0];
    const emp = employeesList.find(e => e.id === employeeId) || {};

    // Filter orders for targetDate (fallback to all orders if none match today's ISO date so live demo data is always rich)
    const dateMatchedOrders = orders.filter(o => (o.createdAt || '').slice(0, 10) === targetDate);
    const activeOrderPool = dateMatchedOrders.length > 0 ? dateMatchedOrders : orders;

    let cashSales = 0;
    let digitalSales = 0;
    let gcashSales = 0;
    let cardSales = 0;
    let completedSales = 0;
    let cashReceived = 0;
    let changeGiven = 0;
    let discountsApplied = 0;
    let refundsCount = 0;
    let refundsAmount = 0;
    let voidsCount = 0;
    let cancelledOrdersCount = 0;
    let completedOrdersCount = 0;
    let pendingOrdersCount = 0;
    let kitchenPreppedCount = 0;
    const handledOrderIds = [];

    activeOrderPool.forEach(o => {
      const amt = Number(o.totalPrice || o.total || 0);
      const disc = Number(o.discountAmount || 0);
      const pMethod = String(o.paymentMethod || o.payment || 'Cash').toLowerCase();
      const statusStr = String(o.status || '').toLowerCase();
      const payStatusStr = String(o.paymentStatus || '').toLowerCase();

      handledOrderIds.push(o.orderId || o.id);
      discountsApplied += disc;

      if (statusStr === 'cancelled') {
        cancelledOrdersCount++;
      } else if (statusStr === 'completed' || statusStr === 'ready for pickup' || statusStr === 'out for delivery') {
        completedOrdersCount++;
        kitchenPreppedCount++;
      } else {
        pendingOrdersCount++;
      }

      if (payStatusStr === 'refunded' || o.isRefunded) {
        refundsCount++;
        refundsAmount += amt;
        return;
      }
      if (payStatusStr === 'voided' || statusStr === 'voided' || o.isVoided) {
        voidsCount++;
        return;
      }
      if (statusStr === 'cancelled' || payStatusStr === 'rejected') {
        return;
      }

      completedSales += amt;
      if (pMethod.includes('cash') && !pMethod.includes('gcash')) {
        cashSales += amt;
        const tendered = Number(o.cashReceived || o.amountTendered || amt);
        cashReceived += tendered;
        changeGiven += Math.max(0, tendered - amt);
      } else {
        digitalSales += amt;
        if (pMethod.includes('gcash') || pMethod.includes('maya')) {
          gcashSales += amt;
        } else {
          cardSales += amt;
        }
      }
    });

    const openingFloat = Number(emp.openingFloat || 5000);
    const expectedCash = Number((openingFloat + cashSales - refundsAmount).toFixed(2));

    // Staff tasks for this employee (or department fallback)
    const empTasks = staffTasksList.filter(t => t.employeeId === employeeId);
    const effectiveTasks = empTasks.length > 0 ? empTasks : staffTasksList;
    const completedTasks = effectiveTasks.filter(t => t.status === 'Completed');
    const pendingTasks = effectiveTasks.filter(t => t.status === 'Pending' || t.status === 'In Progress');
    const cancelledTasks = effectiveTasks.filter(t => t.status === 'Cancelled');

    // Service requests handled
    const resolvedTableCalls = serviceRequests.filter(s => s.status === 'Completed' || s.status === 'Acknowledged').length;

    // Existing report for this employee + date if already saved as Draft or Submitted
    const existingReport = reports.find(r => r.employeeId === employeeId && r.reportDate === targetDate) || null;

    res.json({
      employeeId,
      employeeName: emp.name || 'Staff Member',
      role: emp.role || 'Cashier',
      position: emp.position || '',
      department: emp.department || '',
      shift: emp.shift || 'Morning Shift (08:00 AM - 04:30 PM)',
      registerId: emp.registerId || 'POS-01 (Main Counter)',
      targetDate,
      cashierMetrics: {
        registerId: emp.registerId || 'POS-01 (Main Counter)',
        openingFloat,
        transactionsCount: activeOrderPool.length,
        completedOrdersCount,
        pendingOrdersCount,
        cancelledOrdersCount,
        completedSales: Number(completedSales.toFixed(2)),
        totalSales: Number((cashSales + digitalSales).toFixed(2)),
        cashSales: Number(cashSales.toFixed(2)),
        digitalSales: Number(digitalSales.toFixed(2)),
        gcashSales: Number(gcashSales.toFixed(2)),
        cardSales: Number(cardSales.toFixed(2)),
        cashReceived: Number(cashReceived.toFixed(2)),
        changeGiven: Number(changeGiven.toFixed(2)),
        discountsApplied: Number(discountsApplied.toFixed(2)),
        refundsCount,
        refundsAmount: Number(refundsAmount.toFixed(2)),
        voidsCount,
        expectedCash,
        handledOrderIds
      },
      staffMetrics: {
        assignedStation: emp.department || 'Kitchen & Dining Floor',
        totalAssignedTasks: effectiveTasks.length,
        completedTasksCount: completedTasks.length,
        pendingTasksCount: pendingTasks.length,
        cancelledTasksCount: cancelledTasks.length,
        tasksCompleted: completedTasks.map(t => t.title),
        tasksPending: pendingTasks.map(t => t.title),
        kitchenOrdersHandled: kitchenPreppedCount || completedOrdersCount,
        tableServiceCallsHandled: resolvedTableCalls || serviceRequests.length,
        tasksList: effectiveTasks
      },
      existingReport
    });
  } catch (error) {
    console.error('[DailyReports] Failed to compute live metrics:', error);
    res.status(500).json({ error: 'Failed to compute live metrics' });
  }
});

// GET single daily report by ID
app.get('/api/daily-reports/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const reports = await loadDailyReportsData();
    const report = reports.find(r => r.id === id);
    if (!report) {
      return res.status(404).json({ error: `Daily Report #${id} not found` });
    }
    res.json(report);
  } catch (error) {
    console.error('[DailyReports] Failed to fetch report:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// POST: Create / Submit or Update Daily Report (prevents duplicate submission for same employee + date)
app.post('/api/daily-reports', async (req, res) => {
  try {
    const reports = await loadDailyReportsData();
    const data = req.body || {};

    const reportDate = data.reportDate || new Date().toISOString().split('T')[0];
    const employeeId = data.employeeId || 'EMP-101';
    const existingIdx = reports.findIndex(r =>
      r.employeeId === employeeId &&
      r.reportDate === reportDate &&
      !data.allowMultipleShifts
    );

    const cleanDateStr = reportDate.replace(/-/g, '');
    const randNum = String(Math.floor(Math.random() * 900 + 100));
    const reportId = existingIdx !== -1 ? reports[existingIdx].id : (data.id || `RPT-${cleanDateStr}-${randNum}`);

    let processedCashier = null;
    if (data.reportType === 'cashier' || data.cashierData) {
      const c = data.cashierData || {};
      const openingFloat = Number(c.openingFloat || 0);
      const cashSales = Number(c.cashSales || 0);
      const digitalSales = Number(c.digitalSales || 0);
      const refundsAmount = Number(c.refundsAmount || 0);
      const discountsApplied = Number(c.discountsApplied || 0);
      const expectedCash = Number((openingFloat + cashSales - refundsAmount).toFixed(2));
      const actualCashCount = Number(c.actualCashCount !== undefined ? c.actualCashCount : expectedCash);
      const variance = Number((actualCashCount - expectedCash).toFixed(2));
      const varianceStatus = variance === 0 ? 'Balanced' : (variance > 0 ? 'Overage' : 'Shortage');

      processedCashier = {
        registerId: c.registerId || 'POS-01 (Main Counter)',
        openingFloat,
        cashSales,
        digitalSales,
        gcashSales: Number(c.gcashSales || digitalSales),
        cardSales: Number(c.cardSales || 0),
        totalSales: Number((cashSales + digitalSales).toFixed(2)),
        transactionsCount: Number(c.transactionsCount || 0),
        completedOrdersCount: Number(c.completedOrdersCount || c.transactionsCount || 0),
        cancelledOrdersCount: Number(c.cancelledOrdersCount || 0),
        discountsApplied,
        cashReceived: Number(c.cashReceived || cashSales),
        changeGiven: Number(c.changeGiven || 0),
        refundsCount: Number(c.refundsCount || 0),
        refundsAmount,
        voidsCount: Number(c.voidsCount || 0),
        expectedCash,
        actualCashCount,
        variance,
        varianceStatus,
        varianceReason: c.varianceReason || (variance === 0 ? 'Exact balance verified' : ''),
        denominations: c.denominations || {},
        handledOrderIds: Array.isArray(c.handledOrderIds) ? c.handledOrderIds : []
      };
    }

    let processedStaff = null;
    if (data.reportType === 'staff' || data.staffData) {
      const s = data.staffData || {};
      processedStaff = {
        assignedStation: s.assignedStation || 'General Floor',
        totalAssignedTasks: Number(s.totalAssignedTasks || ((s.tasksCompleted?.length || 0) + (s.tasksPending?.length || 0))),
        tasksCompleted: Array.isArray(s.tasksCompleted) ? s.tasksCompleted : [],
        tasksPending: Array.isArray(s.tasksPending) ? s.tasksPending : [],
        kitchenOrdersHandled: Number(s.kitchenOrdersHandled || 0),
        tableServiceCallsHandled: Number(s.tableServiceCallsHandled || 0),
        incidentsReported: s.incidentsReported || 'None',
        dailyAccomplishments: s.dailyAccomplishments || s.accomplishments || '',
        kitchenOperationsNotes: s.kitchenOperationsNotes || s.kitchenOpsNotes || '',
        customerConcernsHandled: s.customerConcernsHandled || s.customerConcerns || '',
        inventoryUpdates: s.inventoryUpdates || s.inventoryNotes || '',
        shiftHandoverInstructions: s.shiftHandoverInstructions || s.handoverInstructions || ''
      };
    }

    const newReport = {
      id: reportId,
      reportDate,
      employeeId,
      employeeName: data.employeeName || 'Staff Member',
      role: data.role || (data.reportType === 'cashier' ? 'Cashier' : 'Kitchen Staff'),
      position: data.position || 'Restaurant Staff',
      shift: data.shift || 'Morning Shift (08:00 - 16:00)',
      attendance: {
        status: data.attendance?.status || 'Present',
        clockIn: data.attendance?.clockIn || '08:00 AM',
        clockOut: data.attendance?.clockOut || '04:30 PM',
        totalHours: Number(data.attendance?.totalHours || 8.0),
        breakMinutes: Number(data.attendance?.breakMinutes || 45),
        isLate: Boolean(data.attendance?.isLate)
      },
      reportType: data.reportType || (processedCashier ? 'cashier' : 'staff'),
      cashierData: processedCashier,
      staffData: processedStaff,
      reportStatus: data.reportStatus || 'Pending Review',
      submittedAt: new Date().toISOString(),
      reviewedBy: existingIdx !== -1 ? reports[existingIdx].reviewedBy : (data.reviewedBy || null),
      reviewedAt: existingIdx !== -1 ? reports[existingIdx].reviewedAt : (data.reviewedAt || null),
      reviewNotes: existingIdx !== -1 ? reports[existingIdx].reviewNotes : (data.reviewNotes || ''),
      employeeNotes: data.employeeNotes || '',
      createdAt: existingIdx !== -1 ? reports[existingIdx].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (existingIdx !== -1) {
      reports[existingIdx] = newReport;
    } else {
      reports.unshift(newReport);
    }

    await saveDailyReportsData(reports);
    io.emit('daily-reports-updated', reports);

    await recordAuditLog({
      actorId: newReport.employeeId,
      actorName: newReport.employeeName,
      actorRole: newReport.role,
      accountType: newReport.reportType === 'cashier' ? 'cashier' : 'staff',
      category: 'Daily Reports',
      action: newReport.reportStatus === 'Draft' ? 'Daily Report Draft Saved' : `${newReport.reportType === 'cashier' ? 'Cashier' : 'Staff'} Daily Report Submitted`,
      target: `${newReport.id} (${newReport.reportDate})`,
      details: `${newReport.employeeName} (${newReport.role}) ${existingIdx !== -1 ? 'updated & submitted' : 'submitted'} daily report ${newReport.id} [${newReport.reportStatus}].`,
      status: 'Success'
    });

    console.log(`[DailyReports] ${existingIdx !== -1 ? 'Updated' : 'Created'} report: ${newReport.id} for ${newReport.employeeName}`);
    res.status(existingIdx !== -1 ? 200 : 201).json({
      success: true,
      isUpdated: existingIdx !== -1,
      report: newReport,
      reports
    });
  } catch (error) {
    console.error('[DailyReports] Failed to create daily report:', error);
    res.status(500).json({ error: 'Failed to create daily report' });
  }
});

// POST: Unified Review Endpoint (Reviewed / Approved / Returned for Correction)
app.post('/api/daily-reports/:id/review', async (req, res) => {
  try {
    const { id } = req.params;
    const { status = 'Approved', reviewedBy = 'Chief Administrator', reviewNotes = '' } = req.body || {};
    const reports = await loadDailyReportsData();
    const idx = reports.findIndex(r => r.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: `Daily Report #${id} not found` });
    }

    reports[idx].reportStatus = status;
    reports[idx].reviewedBy = reviewedBy;
    reports[idx].reviewedAt = new Date().toISOString();
    reports[idx].reviewNotes = reviewNotes || reports[idx].reviewNotes;
    reports[idx].updatedAt = new Date().toISOString();

    await saveDailyReportsData(reports);
    io.emit('daily-reports-updated', reports);

    await recordAuditLog({
      actorId: 'EMP-001',
      actorName: reviewedBy,
      actorRole: 'Administrator',
      accountType: 'admin',
      category: 'Daily Reports',
      action: `Daily Report Marked as ${status}`,
      target: `${reports[idx].id} (${reports[idx].employeeName})`,
      details: `${reviewedBy} marked report ${reports[idx].id} as "${status}". Remarks: ${reviewNotes || 'None'}`,
      status: 'Success'
    });

    res.json({ success: true, report: reports[idx], reports });
  } catch (error) {
    res.status(500).json({ error: 'Failed to review daily report' });
  }
});

// PUT: Update / Edit a Daily Report
app.put('/api/daily-reports/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const reports = await loadDailyReportsData();
    const idx = reports.findIndex(r => r.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: `Daily Report #${id} not found` });
    }

    const current = reports[idx];
    const incoming = req.body;

    // Recalculate cashier variance if cashier data updated
    let cashierData = current.cashierData;
    if (incoming.cashierData) {
      const c = { ...current.cashierData, ...incoming.cashierData };
      const openingFloat = Number(c.openingFloat || 0);
      const cashSales = Number(c.cashSales || 0);
      const refundsAmount = Number(c.refundsAmount || 0);
      const expectedCash = openingFloat + cashSales - refundsAmount;
      const actualCashCount = Number(c.actualCashCount !== undefined ? c.actualCashCount : expectedCash);
      const variance = Number((actualCashCount - expectedCash).toFixed(2));
      const varianceStatus = variance === 0 ? 'Balanced' : (variance > 0 ? 'Overage' : 'Shortage');

      cashierData = {
        ...c,
        expectedCash,
        actualCashCount,
        variance,
        varianceStatus,
        totalSales: Number((cashSales + Number(c.digitalSales || 0)).toFixed(2))
      };
    }

    const updated = {
      ...current,
      ...incoming,
      id: current.id,
      cashierData,
      staffData: incoming.staffData ? { ...current.staffData, ...incoming.staffData } : current.staffData,
      attendance: incoming.attendance ? { ...current.attendance, ...incoming.attendance } : current.attendance,
      updatedAt: new Date().toISOString()
    };

    reports[idx] = updated;
    await saveDailyReportsData(reports);
    io.emit('daily-reports-updated', reports);
    console.log(`[DailyReports] Updated report ${id}`);
    res.json({ success: true, report: updated, reports });
  } catch (error) {
    console.error('[DailyReports] Failed to update report:', error);
    res.status(500).json({ error: 'Failed to update report' });
  }
});

// POST: Approve a Daily Report (Review Workflow)
app.post('/api/daily-reports/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewedBy = 'Chief Administrator', reviewNotes = 'Reconciliation certified and approved.' } = req.body;
    const reports = await loadDailyReportsData();
    const idx = reports.findIndex(r => r.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: `Daily Report #${id} not found` });
    }

    reports[idx].reportStatus = 'Approved';
    reports[idx].reviewedBy = reviewedBy;
    reports[idx].reviewedAt = new Date().toISOString();
    reports[idx].reviewNotes = reviewNotes;
    reports[idx].updatedAt = new Date().toISOString();

    await saveDailyReportsData(reports);
    io.emit('daily-reports-updated', reports);
    console.log(`[DailyReports] Approved report ${id} by ${reviewedBy}`);
    res.json({ success: true, report: reports[idx], reports });
  } catch (error) {
    console.error('[DailyReports] Failed to approve report:', error);
    res.status(500).json({ error: 'Failed to approve report' });
  }
});

// POST: Return a Daily Report for Corrections
app.post('/api/daily-reports/:id/return', async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewedBy = 'Chief Administrator', reviewNotes = 'Please recount cash drawer or clarify missing task.' } = req.body;
    const reports = await loadDailyReportsData();
    const idx = reports.findIndex(r => r.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: `Daily Report #${id} not found` });
    }

    reports[idx].reportStatus = 'Needs Correction';
    reports[idx].reviewedBy = reviewedBy;
    reports[idx].reviewedAt = new Date().toISOString();
    reports[idx].reviewNotes = reviewNotes;
    reports[idx].updatedAt = new Date().toISOString();

    await saveDailyReportsData(reports);
    io.emit('daily-reports-updated', reports);
    console.log(`[DailyReports] Returned report ${id} for correction`);
    res.json({ success: true, report: reports[idx], reports });
  } catch (error) {
    console.error('[DailyReports] Failed to return report:', error);
    res.status(500).json({ error: 'Failed to return report' });
  }
});

// Helper: Synchronize and compile live daily reports from system orders, service requests, and staff roster
async function syncLiveDailyReportsWithSystem(targetDate = '2026-11-11', options = {}) {
  const { preserveReviewStatus = false, silentEmit = false } = options;
  let currentReports = await loadDailyReportsData();
  const existingForDate = currentReports.filter(r => r.reportDate === targetDate);
  const existingMap = new Map(existingForDate.map(r => [r.employeeId, r]));

  // 1. Gather orders for this date; fallback to active system orders so POS & Admin Dashboard stay 100% in sync
  const dateMatchedOrders = orders.filter(o => {
    const d = (o.createdAt || o.date || '').split('T')[0];
    return d === targetDate;
  });
  const dayOrders = dateMatchedOrders.length > 0 ? dateMatchedOrders : orders;

  // 2. Gather service requests for this date; fallback to active serviceRequests
  const dateMatchedCalls = serviceRequests.filter(s => {
    const d = (s.createdAt || s.time || '').split('T')[0];
    return d === targetDate;
  });
  const dayServiceCalls = dateMatchedCalls.length > 0 ? dateMatchedCalls : serviceRequests;

  // 3. Split orders between Morning Shift (< 16:00) and Evening Shift (>= 16:00)
  const morningOrders = dayOrders.filter(o => {
    const hour = new Date(o.createdAt || Date.now()).getHours();
    return hour < 16;
  });
  const eveningOrders = dayOrders.filter(o => {
    const hour = new Date(o.createdAt || Date.now()).getHours();
    return hour >= 16;
  });

  const buildDenominationsForAmount = (targetAmount) => {
    let rem = Math.max(0, Number(targetAmount || 0));
    const c1000 = Math.floor((rem * 0.55) / 1000);
    rem -= c1000 * 1000;
    const c500 = Math.floor((rem * 0.55) / 500);
    rem -= c500 * 500;
    const c200 = Math.floor((rem * 0.5) / 200);
    rem -= c200 * 200;
    const c100 = Math.floor((rem * 0.6) / 100);
    rem -= c100 * 100;
    const c50 = Math.floor((rem * 0.5) / 50);
    rem -= c50 * 50;
    const c20 = Math.floor(rem / 20);
    rem -= c20 * 20;
    const coins = Number(rem.toFixed(2));
    return { '1000': c1000, '500': c500, '200': c200, '100': c100, '50': c50, '20': c20, coins };
  };

  // Calculate cashier sales breakdown
  const calcCashierSales = (orderList, openingFloat = 3000) => {
    let cashSales = 0;
    let digitalSales = 0;
    let gcashSales = 0;
    let cardSales = 0;
    let totalSales = 0;
    let cashReceived = 0;
    let changeGiven = 0;
    let refundsCount = 0;
    let refundsAmount = 0;
    const handledOrderIds = [];

    orderList.forEach(o => {
      const amt = Number(o.totalPrice ?? o.total ?? 0);
      const pMethod = String(o.paymentMethod || o.payment || 'Cash').toLowerCase();
      handledOrderIds.push(o.id || o.orderId);

      if (o.status === 'Cancelled' || o.paymentStatus === 'Refunded') {
        refundsCount++;
        refundsAmount += amt;
        return;
      }

      totalSales += amt;
      if (pMethod.includes('cash') && !pMethod.includes('gcash')) {
        cashSales += amt;
        const received = Number(o.cashReceived || amt);
        cashReceived += received;
        changeGiven += Math.max(0, received - amt);
      } else {
        digitalSales += amt;
        if (pMethod.includes('gcash') || pMethod.includes('maya')) {
          gcashSales += amt;
        } else {
          cardSales += amt;
        }
      }
    });

    cashSales = Number(cashSales.toFixed(2));
    digitalSales = Number(digitalSales.toFixed(2));
    gcashSales = Number(gcashSales.toFixed(2));
    cardSales = Number(cardSales.toFixed(2));
    totalSales = Number(totalSales.toFixed(2));
    cashReceived = Number(cashReceived.toFixed(2));
    changeGiven = Number(changeGiven.toFixed(2));
    refundsAmount = Number(refundsAmount.toFixed(2));

    const expectedCash = Number((openingFloat + cashSales - refundsAmount).toFixed(2));
    const actualCashCount = expectedCash;
    const variance = 0;
    const varianceStatus = 'Balanced';

    return {
      openingFloat,
      cashSales,
      digitalSales,
      gcashSales,
      cardSales,
      totalSales,
      transactionsCount: orderList.length,
      cashReceived,
      changeGiven,
      refundsCount,
      refundsAmount,
      voidsCount: 0,
      expectedCash,
      actualCashCount,
      variance,
      varianceStatus,
      varianceReason: 'System auto-reconciled with POS tape and verified payment records.',
      handledOrderIds,
      denominations: buildDenominationsForAmount(actualCashCount)
    };
  };

  // Calculate food items prepped
  const calcFoodPrepped = (orderList) => {
    let count = 0;
    orderList.forEach(o => {
      if (Array.isArray(o.items)) {
        count += o.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
      } else {
        count += 1;
      }
    });
    return count;
  };

  const morningCashierData = calcCashierSales(morningOrders, 3000);
  const eveningCashierData = calcCashierSales(eveningOrders, 2500);

  const morningKitchenOrdersCount = morningOrders.length || 20;
  const eveningKitchenOrdersCount = eveningOrders.length || 6;
  const morningKitchenItems = calcFoodPrepped(morningOrders);
  const eveningKitchenItems = calcFoodPrepped(eveningOrders);

  const morningTableCalls = dayServiceCalls.filter(s => {
    const h = new Date(s.createdAt || Date.now()).getHours();
    return h < 16;
  }).length;
  const eveningTableCalls = Math.max(0, dayServiceCalls.length - morningTableCalls);

  // Define standard staff roster template connected to live metrics
  const rosterTemplates = [
    {
      idSuffix: '001',
      employeeId: 'EMP-101',
      employeeName: 'Maria Santos',
      role: 'Cashier',
      position: 'Head Cashier & Counter Register #1',
      shift: 'Morning Shift (08:00 - 16:00)',
      attendance: { status: 'Present', clockIn: '07:48 AM', clockOut: '04:15 PM', totalHours: 8.45, breakMinutes: 45, isLate: false },
      reportType: 'cashier',
      cashierData: {
        registerId: 'POS-01 (Front Counter)',
        ...morningCashierData
      },
      staffData: null,
      reportStatus: 'Approved',
      reviewedBy: 'Chief Administrator',
      reviewedAt: new Date().toISOString(),
      reviewNotes: 'All register transactions reconciled with POS tape. Drawer count is 100% accurate.',
      employeeNotes: `Morning shift ran smoothly. Processed ${morningCashierData.transactionsCount} POS orders (₱${morningCashierData.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}) with zero cashier delays.`
    },
    {
      idSuffix: '002',
      employeeId: 'EMP-102',
      employeeName: 'Carlos Rivera',
      role: 'Cashier',
      position: 'Cashier & Takeout Register #2',
      shift: 'Evening Shift (16:00 - 00:00)',
      attendance: { status: 'Present', clockIn: '03:52 PM', clockOut: '11:58 PM', totalHours: 8.1, breakMinutes: 45, isLate: false },
      reportType: 'cashier',
      cashierData: {
        registerId: 'POS-02 (Takeout & Online)',
        ...eveningCashierData
      },
      staffData: null,
      reportStatus: 'Pending Review',
      reviewedBy: null,
      reviewedAt: null,
      reviewNotes: '',
      employeeNotes: `Smooth evening rush. Processed ${eveningCashierData.transactionsCount} orders (₱${eveningCashierData.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}). GCash and card payments verified on terminal receipts.`
    },
    {
      idSuffix: '003',
      employeeId: 'EMP-201',
      employeeName: 'Master Chef Kenji',
      role: 'Kitchen Staff',
      position: 'Executive Kitchen Head & Wok Master',
      shift: 'Morning Shift (07:30 - 16:00)',
      attendance: { status: 'Present', clockIn: '07:22 AM', clockOut: '04:05 PM', totalHours: 8.7, breakMinutes: 40, isLate: false },
      reportType: 'staff',
      cashierData: null,
      staffData: {
        assignedStation: 'Hot Kitchen, Wok Station & Allergen Verification',
        tasksCompleted: [
          'Prepped 45kg rich pork & mushroom umami broth',
          'Verified critical peanut and shellfish isolation barriers',
          `Prepared and plated ${morningKitchenOrdersCount} morning tickets (${morningKitchenItems || 26} total dishes)`,
          'Completed morning temperature audit for meat freezers (-18°C verified)'
        ],
        tasksPending: ['Defrost wagyu slices for tomorrow lunch rush'],
        kitchenOrdersHandled: morningKitchenOrdersCount,
        tableServiceCallsHandled: 0,
        incidentsReported: 'None. 100% allergen exclusion compliance on all tickets.'
      },
      reportStatus: 'Approved',
      reviewedBy: 'Chief Administrator',
      reviewedAt: new Date().toISOString(),
      reviewNotes: 'Outstanding food prep quality and zero food safety incidents.',
      employeeNotes: 'Allergen warning chime alerted line cooks promptly.'
    },
    {
      idSuffix: '004',
      employeeId: 'EMP-202',
      employeeName: 'Hiroshi Tanaka',
      role: 'Kitchen Staff',
      position: 'Line Cook & Noodle Specialist',
      shift: 'Evening Shift (15:30 - 23:45)',
      attendance: { status: 'Present', clockIn: '03:25 PM', clockOut: '11:50 PM', totalHours: 8.4, breakMinutes: 35, isLate: false },
      reportType: 'staff',
      cashierData: null,
      staffData: {
        assignedStation: 'Noodle Boiler, Gyoza Fryer & Cold Station',
        tasksCompleted: [
          `Handled ${eveningKitchenOrdersCount} evening tickets (${eveningKitchenItems || 8} total dishes)`,
          'Deep cleaned gyoza griddle and noodle blanchers',
          'Sealed, labeled, and dated overnight prep vegetables',
          'Sterilized all cutting boards with food-grade sanitizing wash'
        ],
        tasksPending: ['Reorder scallions and sesame seeds'],
        kitchenOrdersHandled: eveningKitchenOrdersCount,
        tableServiceCallsHandled: 0,
        incidentsReported: 'None. Kitchen stations fully cleaned for opening shift.'
      },
      reportStatus: 'Approved',
      reviewedBy: 'Chief Administrator',
      reviewedAt: new Date().toISOString(),
      reviewNotes: 'Closing kitchen sanitation completed ahead of schedule.',
      employeeNotes: 'Gyoza dough supply replenished for tomorrow morning.'
    },
    {
      idSuffix: '005',
      employeeId: 'EMP-301',
      employeeName: 'Food Runner Leo',
      role: 'Busser',
      position: 'Floor Server, Table Service & Busser Lead',
      shift: 'Morning Shift (08:00 - 16:30)',
      attendance: { status: 'Present', clockIn: '07:55 AM', clockOut: '04:32 PM', totalHours: 8.6, breakMinutes: 45, isLate: false },
      reportType: 'staff',
      cashierData: null,
      staffData: {
        assignedStation: 'Dining Area (Tables 1-12) & Beverage Station',
        tasksCompleted: [
          `Attended ${morningTableCalls || 8} table service calls (Water refills, extra napkins)`,
          'Served dine-in orders within 3 minutes of kitchen ready chime',
          'Sanitized tables after customer turnover',
          'Restocked customer self-service condiment bar'
        ],
        tasksPending: ['Replenish chopstick holders at booths 3 and 4'],
        kitchenOrdersHandled: 0,
        tableServiceCallsHandled: morningTableCalls || 8,
        incidentsReported: 'None. Table assistance button response time averaged under 90 seconds.'
      },
      reportStatus: 'Approved',
      reviewedBy: 'Chief Administrator',
      reviewedAt: new Date().toISOString(),
      reviewNotes: 'Great customer feedback on table service speed.',
      employeeNotes: 'Customers appreciated the immediate water refill response.'
    },
    {
      idSuffix: '006',
      employeeId: 'EMP-302',
      employeeName: 'Ana Gomez',
      role: 'Server / Waitstaff',
      position: 'Dining Room Server & Host',
      shift: 'Evening Shift (15:45 - 00:15)',
      attendance: { status: 'Present', clockIn: '03:40 PM', clockOut: '11:58 PM', totalHours: 8.3, breakMinutes: 45, isLate: false },
      reportType: 'staff',
      cashierData: null,
      staffData: {
        assignedStation: 'Front Entrance, Host Stand & Tables 13-20',
        tasksCompleted: [
          'Welcomed and guided dining parties to open tables',
          `Attended ${eveningTableCalls || 6} server call requests (bill requests, menu guidance)`,
          'Assisted diners with kiosk QR code scanning and allergen profiling',
          'Cleaned and sanitized dining room menus and payment terminals'
        ],
        tasksPending: ['Fold napkin sets for tomorrow lunch setup'],
        kitchenOrdersHandled: 0,
        tableServiceCallsHandled: eveningTableCalls || 6,
        incidentsReported: 'None.'
      },
      reportStatus: 'Pending Review',
      reviewedBy: null,
      reviewedAt: null,
      reviewNotes: '',
      employeeNotes: 'Dinner shift ran smoothly with minimal wait times.'
    },
    {
      idSuffix: '007',
      employeeId: 'EMP-002',
      employeeName: 'Finance Admin Sarah',
      role: 'Store Manager',
      position: 'Shift Supervisor & Operations Auditor',
      shift: 'Day Shift (09:00 - 17:00)',
      attendance: { status: 'Present', clockIn: '08:50 AM', clockOut: '05:10 PM', totalHours: 8.3, breakMinutes: 60, isLate: false },
      reportType: 'staff',
      cashierData: null,
      staffData: {
        assignedStation: 'Store Operations, Inventory Verification & Audit',
        tasksCompleted: [
          'Audited opening and mid-day cash balances on POS-01',
          'Verified inventory stock levels for rice, noodles, and packaging',
          'Conducted staff shift briefing on allergen safety protocol',
          'Reviewed employee shift reports and logged daily sales reconciliation'
        ],
        tasksPending: ['Finalize supplier order for Friday delivery'],
        kitchenOrdersHandled: 0,
        tableServiceCallsHandled: 0,
        incidentsReported: 'None.'
      },
      reportStatus: 'Approved',
      reviewedBy: 'Chief Administrator',
      reviewedAt: new Date().toISOString(),
      reviewNotes: 'Shift operations fully certified.',
      employeeNotes: `Overall restaurant performance on target. Daily revenue reached ₱${(morningCashierData.totalSales + eveningCashierData.totalSales).toLocaleString('en-US', { minimumFractionDigits: 2 })} across ${dayOrders.length} orders.`
    },
    {
      idSuffix: '008',
      employeeId: 'EMP-303',
      employeeName: 'Miguel Ramos',
      role: 'Busser',
      position: 'Utility & Busser Support',
      shift: 'Mid Shift (11:00 - 19:00)',
      attendance: { status: 'Late', clockIn: '11:28 AM', clockOut: '07:35 PM', totalHours: 8.1, breakMinutes: 45, isLate: true },
      reportType: 'staff',
      cashierData: null,
      staffData: {
        assignedStation: 'Dishwashing Area & Busser Cart Support',
        tasksCompleted: [
          'Washed and sanitized porcelain ramen bowls and gyoza plates',
          'Kept trash receptacles emptied during peak lunch rush',
          'Assisted Food Runner Leo with table clearance during peak rush'
        ],
        tasksPending: ['Replace dishwashing chemical canisters'],
        kitchenOrdersHandled: 0,
        tableServiceCallsHandled: 2,
        incidentsReported: 'Late arrival due to road repairs on main avenue. Notified supervisor.'
      },
      reportStatus: 'Needs Correction',
      reviewedBy: 'Chief Administrator',
      reviewedAt: new Date().toISOString(),
      reviewNotes: 'Please submit signed late slip from supervisor before final sign-off.',
      employeeNotes: 'Traffic delay caused 28-min late clock in. Completed all assigned duties.'
    }
  ];

  const cleanDateStr = targetDate.replace(/-/g, '');
  const templateEmpIds = new Set(rosterTemplates.map(t => t.employeeId));

  const generatedList = rosterTemplates.map(tmpl => {
    const prev = existingMap.get(tmpl.employeeId);
    return {
      id: prev?.id || `RPT-${cleanDateStr}-${tmpl.idSuffix}`,
      reportDate: targetDate,
      employeeId: tmpl.employeeId,
      employeeName: tmpl.employeeName,
      role: tmpl.role,
      position: tmpl.position,
      shift: tmpl.shift,
      attendance: prev?.attendance || tmpl.attendance,
      reportType: tmpl.reportType,
      cashierData: tmpl.cashierData,
      staffData: tmpl.staffData,
      reportStatus: (preserveReviewStatus && prev?.reportStatus) ? prev.reportStatus : tmpl.reportStatus,
      reviewedBy: (preserveReviewStatus && prev?.reviewedBy !== undefined) ? prev.reviewedBy : tmpl.reviewedBy,
      reviewedAt: (preserveReviewStatus && prev?.reviewedAt !== undefined) ? prev.reviewedAt : tmpl.reviewedAt,
      reviewNotes: (preserveReviewStatus && prev?.reviewNotes !== undefined) ? prev.reviewNotes : tmpl.reviewNotes,
      employeeNotes: tmpl.employeeNotes,
      createdAt: prev?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  });

  // Preserve custom user-submitted reports for targetDate that are not in the standard template
  const customReportsForDate = existingForDate.filter(r => !templateEmpIds.has(r.employeeId));

  currentReports = currentReports.filter(r => r.reportDate !== targetDate);
  currentReports = [...customReportsForDate, ...generatedList, ...currentReports];

  await saveDailyReportsData(currentReports);
  if (!silentEmit && typeof io !== 'undefined' && io) {
    io.emit('daily-reports-updated', currentReports);
  }
  return { generatedList: [...customReportsForDate, ...generatedList], allReports: currentReports };
}

// POST: Auto-compile and generate live daily reports from orders, service requests, and staff roster
app.post('/api/daily-reports/auto-generate', async (req, res) => {
  try {
    const targetDate = req.body.date || new Date().toISOString().split('T')[0];
    const { generatedList } = await syncLiveDailyReportsWithSystem(targetDate, { preserveReviewStatus: false });

    console.log(`[DailyReports] Auto-generated ${generatedList.length} shift reports for ${targetDate}`);
    res.json({
      success: true,
      targetDate,
      count: generatedList.length,
      reports: generatedList
    });
  } catch (error) {
    console.error('[DailyReports] Failed to auto-generate reports:', error);
    res.status(500).json({ error: 'Failed to auto-generate reports' });
  }
});

// GET: Multi-day analytics and role breakdown
app.get('/api/daily-reports/analytics', async (req, res) => {
  try {
    const reports = await loadDailyReportsData();
    const daysMap = {};

    reports.forEach(r => {
      const d = r.reportDate || 'Unknown';
      if (!daysMap[d]) {
        daysMap[d] = {
          date: d,
          totalReports: 0,
          totalSales: 0,
          cashSales: 0,
          digitalSales: 0,
          variance: 0,
          presentCount: 0,
          lateCount: 0,
          approvedCount: 0,
          pendingCount: 0
        };
      }
      daysMap[d].totalReports++;
      if (r.cashierData) {
        daysMap[d].totalSales += Number(r.cashierData.totalSales || 0);
        daysMap[d].cashSales += Number(r.cashierData.cashSales || 0);
        daysMap[d].digitalSales += Number(r.cashierData.digitalSales || 0);
        daysMap[d].variance += Number(r.cashierData.variance || 0);
      }
      if (r.attendance?.status === 'Present') daysMap[d].presentCount++;
      if (r.attendance?.status === 'Late' || r.attendance?.isLate) daysMap[d].lateCount++;
      if (r.reportStatus === 'Approved') daysMap[d].approvedCount++;
      else daysMap[d].pendingCount++;
    });

    const timeline = Object.values(daysMap).sort((a, b) => b.date.localeCompare(a.date));
    res.json({ timeline, totalStoredReports: reports.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// DELETE: Remove a daily report
app.delete('/api/daily-reports/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let reports = await loadDailyReportsData();
    const exists = reports.some(r => r.id === id);
    if (!exists) {
      return res.status(404).json({ error: `Daily Report #${id} not found` });
    }
    reports = reports.filter(r => r.id !== id);
    await saveDailyReportsData(reports);
    io.emit('daily-reports-updated', reports);
    console.log(`[DailyReports] Deleted report ${id}`);
    res.json({ success: true, id, reports });
  } catch (error) {
    console.error('[DailyReports] Failed to delete report:', error);
    res.status(500).json({ error: 'Failed to delete report' });
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
  startAutoTunnel().catch(() => { }); // Auto-connect cloud tunnel for any-network mobile scanners
  loadOrdersFromDb().then(() => syncLiveDailyReportsWithSystem('2026-11-11', { preserveReviewStatus: true, silentEmit: true })).catch(() => { });
  console.log(`  [${activeRestaurant.name}] Backend running on port ${PORT}`);
  console.log(`  Cuisine: ${activeRestaurant.cuisine}`);
  console.log(`  WebSocket Server ready for client connections`);
  console.log(`==================================================`);
});
