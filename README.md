# Umami Craft Fusion — Real-Time Multi-Brand Restaurant Management System

A full-stack restaurant ordering and operations platform supporting multiple restaurant brands with real-time customer ordering (kiosk + mobile), kitchen display systems, floor management, and admin controls—all synchronized via WebSocket.

## 🎯 What This System Does

**For Customers:**
- Order from touchscreen kiosks or mobile devices
- Declare allergens and dietary preferences
- Project preferences from mobile to kiosk display in real-time
- Track order status from confirmation to delivery

**For Kitchen Staff:**
- Real-time order queue with priority sorting
- Item availability ("86") management
- Order status workflow (Order Received → Cooking → Ready → Delivered)

**For Floor/Delivery Staff (Bussers):**
- Claim ready orders for table delivery
- Track table turnover status (Available, Occupied, Needs Bussing)
- Monitor order fulfillment

**For Managers:**
- Item availability override (menu item "86")
- Live order and table status dashboard
- Multi-restaurant brand support (Umami, Bella, Verde)

---

## 🏗️ Architecture Overview

### Multi-Brand Support
The system runs as independent instances per restaurant brand:

| Brand | Backend Port | Frontend Port | Cuisine |
|-------|--------------|---------------|---------|
| **Umami Craft Fusion** | 3001 | 3000 | Asian Craft Fusion |
| **Trattoria Bella** | 3002 | 3010 | Artisan Italian |
| **Verde Garden Kitchen** | 3003 | 3020 | Organic & Gluten-Free |

Each runs its own Express backend + React frontend with isolated order/table state.

### Communication Flow

```
Mobile Client ──WebSocket──┐
                            ├─→ Socket.io Server (Express)
Kiosk Terminal ────────────┤    ├─ In-memory Orders
                            ├─→ Kitchen Display
                      ┌─────┘    ├─ Floor Tables
                      │          └─ Item Availability
Kitchen Display ──────┤
Floor Runner App ─────┘
Manager Dashboard ────────────────────────────────→ REST API + WebSocket
```

**Real-Time Rooms:**
- `kitchen_{restaurantId}` — Kitchen staff receive all orders
- `busser_{restaurantId}` — Bussers see order handoff & table status
- `{kioskId}` — Kiosk receives customer preferences from mobile clients

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
git clone https://github.com/xeancoral-bit/UMAMI-CRAFT-FUSION.git
cd UMAMI-CRAFT-FUSION
npm install
```

### Run Single Restaurant (Development)

```bash
# Umami Craft Fusion (default)
npm run dev:umami

# Trattoria Bella
npm run dev:bella

# Verde Garden Kitchen
npm run dev:verde
```

Backend runs on configured port (3001/3002/3003), frontend on (3000/3010/3020).  
Open browser to `http://localhost:3000` (or respective frontend port).

### Run All Three Restaurants

```bash
npm run dev:suite
```

Opens all six instances (3 backends + 3 frontends) in separate processes with color-coded terminal output.

### Production Build & Deploy

```bash
# Build optimized frontend
npm run build

# Start server (uses environment variables for configuration)
npm start
```

**Environment Variables:**
```bash
PORT=3001                    # Backend port
FRONTEND_PORT=3000          # Frontend dev port (dev only)
RESTAURANT_ID=umami         # Brand: umami, bella, or verde
```

---

## 📱 How to Use Each Interface

### 1. **Kiosk View** (`?view=kiosk`)
Fullscreen ordering terminal with menu browsing and checkout.

- Browse items by category
- View allergens & dietary tags (vegan, spicy, sweet)
- Manage cart with quantity/price
- Place order → receive Order ID & receipt

**Endpoint:** `http://localhost:3000/?view=kiosk`

### 2. **Mobile View** (`?view=mobile&kioskId=KIOSK-1`)
Customer's personal phone to declare allergens and preferences, then project to kiosk.

- Scan QR code at kiosk → redirected to mobile view
- Select allergens (peanuts, dairy, gluten, soy, etc.)
- Set dietary preferences (vegan, spicy, etc.)
- **Project to Kiosk** → real-time broadcast to kiosk display
- Place order from mobile → kiosk receives confirmation

**Endpoint:** `http://localhost:3000/?view=mobile&kioskId=KIOSK-1`

### 3. **Kitchen View** (`?view=kitchen`)
Order fulfillment dashboard for kitchen staff.

- Live order queue sorted by priority (Received → Cooking → Ready)
- Click order to expand details (items, allergens, special requests)
- Update status: **Cooking** → **Order Ready**
- Item availability toggle (86 items out of stock)

**Endpoint:** `http://localhost:3000/?view=kitchen`

### 4. **Busser View** (`?view=busser`)
Floor management and delivery tracking.

- Claim ready orders from kitchen
- Track table turnover (Available → Occupied → Needs Bussing)
- Confirm delivery & clean table status
- Real-time sync with floor layout

**Endpoint:** `http://localhost:3000/?view=busser`

### 5. **Restaurant Manager View** (`?view=restaurant`)
Admin dashboard for operations oversight.

- Toggle item availability (86 items)
- Monitor live order queue
- Track table status across floor
- View order history and metrics

**Endpoint:** `http://localhost:3000/?view=restaurant`

---

## 📂 Project Structure

```
UMAMI-CRAFT-FUSION/
├── server.js                 # Express + Socket.io server
├── vite.config.js            # Frontend build config (multi-port support)
├── package.json              # npm scripts & dependencies
├── index.html                # HTML entry point
├── src/
│   ├── App.jsx               # Root router, global socket connection
│   ├── App.css               # Main layout styles
│   ├── index.css             # Component & utility styles (~100KB)
│   ├── main.jsx              # React entry point
│   └── components/
│       ├── KioskView.jsx     # In-restaurant terminal (2.3KB)
│       ├── MobileView.jsx    # Customer mobile experience (3.4KB)
│       ├── KitchenView.jsx   # Kitchen display (1.2KB)
│       ├── BusserView.jsx    # Floor staff dashboard (1.3KB)
│       ├── RestaurantView.jsx# Manager dashboard (1.5KB)
│       ├── NavBar.jsx        # Top navigation & view switcher
│       └── DeviceMockup.jsx  # Device frame/mockup wrapper
├── data/
│   └── menus/
│       ├── umami.json        # Umami Craft Fusion menu items
│       ├── bella.json        # Trattoria Bella menu items
│       └── verde.json        # Verde Garden Kitchen menu items
├── public/                   # Static assets
└── dist/                     # Production build output
```

---

## 🔌 API Endpoints

### REST API

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/restaurant` | Get active restaurant metadata |
| `GET` | `/api/network-info` | Get LAN IP & port info (for QR codes) |
| `GET` | `/api/orders` | List all orders |
| `PATCH` | `/api/orders/{orderId}/status` | Update order status |
| `POST` | `/api/orders/{orderId}/claim` | Busser claims order for delivery |
| `GET` | `/api/tables` | Get floor table layout & status |
| `PATCH` | `/api/tables/{tableNumber}/status` | Update table status |
| `GET` | `/api/availability` | Get item availability state |
| `POST` | `/api/availability` | Toggle item 86 (out of stock) |
| `GET` | `/api/menu` | Load restaurant menu JSON |
| `GET` | `/api/restaurants` | List all restaurant brands |

### WebSocket Events

**Client → Server:**
- `join-session` — Device joins room with role (kiosk, mobile, kitchen, busser, restaurant)
- `place-order` — Customer submits order
- `project-preferences` — Mobile projects allergens to kiosk
- `update-order-status` — Staff updates order (Cooking → Ready)
- `claim-order` — Busser claims ready order
- `update-table-status` — Table turnover status change
- `toggle-item-availability` — Manager 86s an item

**Server → Client:**
- `initial-orders` — On connect, send current order queue
- `initial-tables` — Send floor table state
- `initial-availability` — Send item availability store
- `new-kitchen-order` — Broadcast new order to kitchen/busser
- `order-status-updated` — Status change notification
- `order-placed` — Kiosk receives order confirmation
- `table-status-updated` — Floor layout refresh
- `item-availability-updated` — Item 86 toggle broadcast
- `preferences-projected` — Mobile → Kiosk preference sync

---

## 🛠️ Development

### Available npm Scripts

```bash
npm run dev:frontend        # Vite dev server only
npm run dev:backend         # Node server only
npm run dev                 # Both (concurrently)
npm run dev:umami           # Full Umami instance
npm run dev:bella           # Full Bella instance
npm run dev:verde           # Full Verde instance
npm run dev:suite           # All three in parallel
npm run build               # Production build
npm run lint                # Oxlint
npm run preview             # Preview production build
```

### Hot Module Replacement (HMR)
Vite provides instant HMR for React component changes.

### Linting
```bash
npm run lint
```
Uses Oxlint (configured in `.oxlintrc.json`).

---

## 🎨 Styling & Theme

The system supports per-restaurant theme colors:

```javascript
{
  umami: { accentColor: '#E45729' },    // Orange
  bella: { accentColor: '#B45309' },    // Brown
  verde: { accentColor: '#2D6A4F' }     // Forest Green
}
```

Global styles in `src/index.css` (~100KB) include responsive layouts, component patterns, and accessibility utilities.

---

## 📊 Sample Data

### Menu Items (Umami)
- Smoked Truffle Edamame (¥250)
- Spicy Szechuan Dumplings (¥380)
- Crispy Szechuan Tofu Bites (¥320)
- Thai Coconut Curry Bowl (¥490)
- Molten Chocolate Lava Cake (¥300)

Each item includes:
- Description
- Price (in your currency)
- Allergens (soy, gluten, dairy, peanuts)
- Dietary tags (vegan, spicy, sweet)

### Floor Tables
10 tables with varying capacities (2–8 seats), tracking:
- Table number & capacity
- Status (Available, Occupied, Needs Bussing)
- Last bussed timestamp

---

## 🔐 Security Considerations

**Current:**
- CORS enabled for local dev (`origin: '*'`)
- No authentication (mock system)

**For Production:**
- Implement role-based access control (RBAC)
- Secure WebSocket connection (WSS)
- Add authentication (JWT or OAuth)
- Sanitize user input (allergens, preferences)
- Add rate limiting on API endpoints
- Use persistent database (not in-memory)

---

## 🚧 Known Limitations

- **In-Memory State:** Orders and tables reset on server restart
- **Single Server:** No horizontal scaling; state not shared across instances
- **No Database:** Production use requires PostgreSQL/MongoDB integration
- **No Authentication:** All roles (staff, customer) are publicly accessible
- **Mock Data:** Menu items, tables, and restaurants are hardcoded

---

## 🎓 Learning Resources

- [React 19 Docs](https://react.dev)
- [Vite Guide](https://vite.dev)
- [Express.js](https://expressjs.com)
- [Socket.io Documentation](https://socket.io/docs)
- [Lucide React Icons](https://lucide.dev)

---

## 📝 License

This project is unlicensed. See your organization's guidelines for usage.

---

## 🤝 Contributing

To add a new restaurant brand:

1. Add entry to `RESTAURANTS` object in `server.js`
2. Create menu JSON in `data/menus/{brand}.json`
3. Add dev script in `package.json`
4. Update `.github/workflows` (if applicable)

---

## 📞 Support

For issues, feature requests, or questions, please open a GitHub issue or contact the development team.

---

**Made with ❤️ for seamless restaurant operations**
