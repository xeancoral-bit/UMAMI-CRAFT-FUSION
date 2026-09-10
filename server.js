import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import os from 'os';


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
    accentColor: '#D9383A',
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


// Enable JSON body parsing for API requests
app.use(express.json());
// Enable CORS for development
app.use(cors());

// In-memory orders store for this restaurant instance
const orders = [];

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

  // Device joins a session room based on kioskId or kitchen role
  socket.on('join-session', ({ kioskId, role }) => {
    if (kioskId) {
      socket.join(kioskId);
      socket.kioskId = kioskId;
    }
    socket.role = role;
    if (role === 'kitchen') {
      const kitchenRoom = `kitchen_${RESTAURANT_ID}`;
      socket.join(kitchenRoom);
      console.log(`[Socket] Kitchen terminal ${socket.id} joined ${kitchenRoom}`);
      // Send current active orders on join
      socket.emit('initial-orders', orders);
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

  // Mobile device places an order
  socket.on('place-order', (orderPayload) => {
    const { kioskId, item, items, itemCount, totalPrice, orderedTags, allergens } = orderPayload || {};
    const effectiveItems = items && items.length > 0 ? items : (item ? [item] : []);
    const effectiveCount = itemCount || effectiveItems.reduce((sum, i) => sum + (i.quantity || 1), 0);
    const effectiveTotal = totalPrice !== undefined ? totalPrice : effectiveItems.reduce((sum, i) => sum + (i.price * (i.quantity || 1)), 0);
    const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder = {
      orderId,
      kioskId: kioskId || 'COUNTER',
      restaurantId: RESTAURANT_ID,
      item: item || effectiveItems[0],
      items: effectiveItems,
      itemCount: effectiveCount,
      totalPrice: effectiveTotal,
      orderedTags: orderedTags || [],
      allergens: allergens || [],
      status: 'Order Received',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    orders.unshift(newOrder);
    
    console.log(`[Socket] Order ${orderId} placed in Room ${kioskId}:`, {
      itemCount: effectiveCount,
      totalPrice: effectiveTotal,
      items: effectiveItems.map(i => `${i.name} (x${i.quantity || 1})`),
      orderedTags
    });

    // 1. Confirm to the ordering customer with the orderId and tracking details
    socket.emit('order-confirmed', newOrder);
    
    // 2. Broadcast order completion with multi-item receipt data to the Kiosk
    if (kioskId) {
      socket.to(kioskId).emit('order-placed', newOrder);
    }

    // 3. Forward the order to the restaurant's kitchen display in real-time
    io.to(`kitchen_${RESTAURANT_ID}`).emit('new-kitchen-order', newOrder);
    io.emit('new-kitchen-order', newOrder);
  });

  // Kitchen or server updates order status ('Cooking', 'Order Ready', 'Completed')
  socket.on('update-order-status', ({ orderId, status }) => {
    const order = orders.find(o => o.orderId === orderId);
    if (order) {
      order.status = status;
      order.updatedAt = new Date().toISOString();
      console.log(`[Socket] Order ${orderId} status updated to: ${status}`);

      const statusPayload = {
        orderId,
        kioskId: order.kioskId,
        status,
        updatedAt: order.updatedAt
      };

      // Notify all relevant listeners (customer phone, kitchen display, kiosk)
      if (order.kioskId) {
        io.to(order.kioskId).emit('order-status-updated', statusPayload);
      }
      io.to(`kitchen_${RESTAURANT_ID}`).emit('order-status-updated', statusPayload);
      io.emit('order-status-updated', statusPayload);
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

// Kitchen orders list endpoint
app.get('/api/orders', (req, res) => {
  res.json(orders);
});

// Update order status endpoint
app.patch('/api/orders/:orderId/status', (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;
  const order = orders.find(o => o.orderId === orderId);

  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  order.status = status;
  order.updatedAt = new Date().toISOString();

  const statusPayload = {
    orderId,
    kioskId: order.kioskId,
    status,
    updatedAt: order.updatedAt
  };

  if (order.kioskId) {
    io.to(order.kioskId).emit('order-status-updated', statusPayload);
  }
  io.to(`kitchen_${RESTAURANT_ID}`).emit('order-status-updated', statusPayload);
  io.emit('order-status-updated', statusPayload);

  res.json(order);
});

// Menu JSON endpoint (representing future restaurant app integration)
app.get('/api/menu', async (req, res) => {
  try {
    const menuPath = path.join(__dirname, 'data', 'menus', activeRestaurant.menuFile);
    const menuData = await fs.readFile(menuPath, 'utf8');
    res.json(JSON.parse(menuData));
  } catch (error) {
    console.error(`Error reading ${activeRestaurant.menuFile}:`, error);
    res.status(500).json({ error: 'Failed to load menu items' });
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
