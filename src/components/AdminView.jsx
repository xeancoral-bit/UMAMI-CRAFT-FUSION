import React, { useState, useEffect, useMemo, useRef } from 'react';
import { io } from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';
import MenuPreferencesManager from './MenuPreferencesManager';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Layers,
  Wine,
  Gift,
  Sparkles,
  Tag,
  ShoppingBag,
  ChefHat,
  QrCode,
  PackageCheck,
  BarChart3,
  Users,
  History,
  Settings,
  LogOut,
  Lock,
  Plus,
  Edit,
  Trash2,
  Archive,
  RefreshCcw,
  RotateCcw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  Eye,
  Download,
  Printer,
  ShieldCheck,
  DollarSign,
  TrendingUp,
  BarChart2,
  ShoppingCart,
  PieChart,
  User,
  Tv,
  FileText,
  Flame,
  Clock,
  Check,
  X,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Loader2,
  Info,
  Calendar,
  Sliders,
  Copy,
  ArrowUpDown,
  Image as ImageIcon,
  Play,
  LayoutGrid,
  Coins,
  Zap,
  Ban,
  List,
  Package,
  Megaphone,
  Pause,
  Lightbulb,
  MapPin,
  AlertCircle,
  ArrowRight,
  MoreVertical,
  MoreHorizontal,
  BellRing,
  Volume2,
  VolumeX,
  ExternalLink,
  Radio,
  Upload
} from 'lucide-react';

export default function AdminView({ onLogout, onOpenSecurity, onReturnToKiosk, socketConnected, socket }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [menuItems, setMenuItems] = useState(() => {
    try {
      const saved = localStorage.getItem('umami_admin_menu');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 6) return parsed;
      }
    } catch {}
    return [
      { id: '101', sku: 'APP-001', name: 'Spicy Szechuan Dumplings', category: 'Appetizers', price: 380, promoPrice: '', available: true, stock: 25, reorderLevel: 5, lastUpdated: 'Oct 26, 2024 10:24 AM', image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=600&q=80', description: 'Pork dumplings in a fiery chili oil broth and toasted sesame.', allergens: 'Soy, Gluten', prepTime: '10 mins', sizes: 'Standard', addons: '', subcategory: 'Signature', ingredients: 'Pork, chili oil, sesame' },
      { id: '102', sku: 'APP-002', name: 'Smoked Truffle Edamame', category: 'Appetizers', price: 250, promoPrice: '', available: true, stock: 25, reorderLevel: 5, lastUpdated: 'Oct 26, 2024 10:24 AM', image: 'https://images.unsplash.com/photo-1622205313162-be1d5712a43f?auto=format&fit=crop&w=600&q=80', description: 'Steamed edamame tossed in white truffle oil and smoked sea salt.', allergens: 'Soy', prepTime: '5 mins', sizes: 'Standard', addons: '', subcategory: 'Signature', ingredients: 'Edamame, truffle oil, sea salt' },
      { id: '103', sku: 'NDL-001', name: 'Honey Glazed Peanut Noodles', category: 'Noodles', price: 420, promoPrice: '', available: true, stock: 25, reorderLevel: 5, lastUpdated: 'Oct 26, 2024 10:24 AM', image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80', description: 'Warm noodles tossed in a sweet peanut butter sauce with soy glaze.', allergens: 'Peanuts, Soy, Gluten', prepTime: '12 mins', sizes: 'Standard', addons: '', subcategory: 'Signature', ingredients: 'Noodles, peanut butter, soy sauce' },
      { id: '104', sku: 'APP-003', name: 'Crispy Five-Spice Tofu Bites', category: 'Appetizers', price: 320, promoPrice: '', available: true, stock: 25, reorderLevel: 5, lastUpdated: 'Oct 26, 2024 10:24 AM', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80', description: 'Crisp tofu tossed in spicy five-spice pepper seasoning.', allergens: 'Soy', prepTime: '10 mins', sizes: 'Standard', addons: '', subcategory: 'Signature', ingredients: 'Tofu, five-spice, pepper' },
      { id: '105', sku: 'RCB-001', name: 'Thai Coconut Curry Bowl', category: 'Rice Bowls', price: 490, promoPrice: '', available: true, stock: 25, reorderLevel: 10, lastUpdated: 'Oct 26, 2024 10:24 AM', image: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?auto=format&fit=crop&w=600&q=80', description: 'Aromatic red curry with coconut milk, lemongrass, jasmine rice, and vegetables.', allergens: 'None', prepTime: '15 mins', sizes: 'Standard', addons: '', subcategory: 'Signature', ingredients: 'Coconut milk, red curry paste, jasmine rice' },
      { id: '106', sku: 'DES-001', name: 'Mango Sticky Rice', category: 'Desserts', price: 280, promoPrice: '', available: true, stock: 25, reorderLevel: 5, lastUpdated: 'Oct 26, 2024 10:24 AM', image: 'https://images.unsplash.com/photo-1562440499-64c9a111f713?auto=format&fit=crop&w=600&q=80', description: 'Sweet glutinous rice cooked in coconut cream, served with fresh mango slices.', allergens: 'None', prepTime: '8 mins', sizes: 'Standard', addons: '', subcategory: 'Signature', ingredients: 'Glutinous rice, coconut cream, fresh mango' },
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('umami_admin_menu', JSON.stringify(menuItems));
    } catch {}
  }, [menuItems]);
  const [categories, setCategories] = useState(() => {
    try {
      const saved = localStorage.getItem('umami_categories');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { id: 'cat-1', name: 'Appetizers', icon: '🥟', active: true },
      { id: 'cat-2', name: 'Noodles', icon: '🍜', active: true },
      { id: 'cat-3', name: 'Rice Bowls', icon: '🍚', active: true },
      { id: 'cat-4', name: 'Desserts', icon: '🍦', active: true },
      { id: 'cat-5', name: 'Meals', icon: '🍱', active: true },
      { id: 'cat-6', name: 'Burgers', icon: '🍔', active: true },
      { id: 'cat-7', name: 'Chicken', icon: '🍗', active: true },
      { id: 'cat-8', name: 'Snacks', icon: '🍟', active: true },
      { id: 'cat-9', name: 'Add-ons', icon: '🥗', active: true },
      { id: 'cat-10', name: 'Drinks', icon: '🧋', active: true },
    ];
  });

  // Sync categories to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('umami_categories', JSON.stringify(categories));
    } catch {}
  }, [categories]);

  const [orders, setOrders] = useState(() => {
    try {
      const saved = localStorage.getItem('umami_orders');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 6) return parsed;
      }
    } catch {}
    return [
      {
        id: 'ORD-1043',
        time: '2:28 PM',
        timeAgo: '6 min ago',
        waitTime: '12 min',
        isWaitAlert: true,
        stripeColor: '#ef4444',
        customer: 'Maria Santos',
        orderType: 'Dine-In',
        location: 'Table 5',
        tableId: 'Table 5',
        items: [
          { name: 'Chicken Teriyaki Bowl', qty: 2, price: 180, image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=150&q=80' },
          { name: 'Matcha Iced Latte', qty: 1, price: 90, image: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=150&q=80' }
        ],
        note: 'No onions, please.',
        isAllergy: false,
        payment: 'Cash',
        total: 450.00,
        status: 'New',
        nextStatus: 'Confirm Order'
      },
      {
        id: 'ORD-1042',
        time: '2:27 PM',
        timeAgo: '7 min ago',
        waitTime: '7 min',
        isWaitAlert: false,
        stripeColor: '#3b82f6',
        customer: 'John Dela Cruz',
        orderType: 'Take-Out',
        location: 'Kiosk #2',
        tableId: 'Kiosk #2',
        items: [
          { name: 'Beef Ramen', qty: 1, price: 340, image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=150&q=80' },
          { name: 'Gyoza (6 pcs)', qty: 1, price: 180, image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=150&q=80' }
        ],
        note: 'Extra chili sauce',
        isAllergy: false,
        payment: 'GCash',
        total: 520.00,
        status: 'Confirmed',
        nextStatus: 'Start Preparing'
      },
      {
        id: 'ORD-1041',
        time: '2:24 PM',
        timeAgo: '10 min ago',
        waitTime: '10 min',
        isWaitAlert: false,
        stripeColor: '#f59e0b',
        customer: 'Anna Reyes',
        orderType: 'Dine-In',
        location: 'Table 3',
        tableId: 'Table 3',
        items: [
          { name: 'Salmon Sushi Platter', qty: 1, price: 560, image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=150&q=80' },
          { name: 'Miso Soup', qty: 1, price: 120, image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=150&q=80' }
        ],
        note: 'Allergic to nuts',
        isAllergy: true,
        payment: 'Card',
        total: 680.00,
        status: 'Preparing',
        nextStatus: 'Ready for Pickup'
      },
      {
        id: 'ORD-1040',
        time: '2:20 PM',
        timeAgo: '14 min ago',
        waitTime: '14 min',
        isWaitAlert: true,
        stripeColor: '#10b981',
        customer: 'Miguel Tan',
        orderType: 'Take-Out',
        location: 'Kiosk #1',
        tableId: 'Kiosk #1',
        items: [
          { name: 'Karaage Chicken', qty: 1, price: 230, image: 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=150&q=80' },
          { name: 'Japanese Fried Rice', qty: 1, price: 160, image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=150&q=80' }
        ],
        note: 'Extra gravy',
        isAllergy: false,
        payment: 'Maya',
        total: 390.00,
        status: 'Ready for Pickup',
        nextStatus: 'Complete Order'
      },
      {
        id: 'ORD-1039',
        time: '2:18 PM',
        timeAgo: '16 min ago',
        waitTime: '16 min',
        isWaitAlert: false,
        stripeColor: '#10b981',
        customer: 'Christine Lim',
        orderType: 'Dine-In',
        location: 'Table 8',
        tableId: 'Table 8',
        items: [
          { name: 'Tempura Platter', qty: 1, price: 340, image: 'https://images.unsplash.com/photo-1581184953963-d15972933db1?auto=format&fit=crop&w=150&q=80' },
          { name: 'Iced Thai Milk Tea', qty: 2, price: 180, image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=150&q=80' }
        ],
        note: 'Less ice',
        isAllergy: false,
        payment: 'Cash',
        total: 520.00,
        status: 'Ready',
        nextStatus: 'Mark as Completed'
      },
      {
        id: 'ORD-1038',
        time: '2:15 PM',
        timeAgo: '19 min ago',
        waitTime: '19 min',
        isWaitAlert: false,
        stripeColor: '#059669',
        customer: 'Kevin Castillo',
        orderType: 'Dine-In',
        location: 'Table 1',
        tableId: 'Table 1',
        items: [
          { name: 'Umami Burger', qty: 1, price: 290, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=150&q=80' },
          { name: 'Truffle Fries', qty: 1, price: 140, image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=150&q=80' }
        ],
        note: 'Birthday celebration 🎉',
        isAllergy: false,
        payment: 'Card',
        total: 430.00,
        status: 'Completed',
        nextStatus: 'Completed'
      }
    ];
  });

  // Sync orders with localStorage
  useEffect(() => {
    try {
      localStorage.setItem('umami_orders', JSON.stringify(orders));
    } catch {}
  }, [orders]);

  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('All');
  const [orderTypeFilter, setOrderTypeFilter] = useState('All');
  const [orderPaymentFilter, setOrderPaymentFilter] = useState('All');
  const [orderDateFilter, setOrderDateFilter] = useState('All');
  const [orderSortBy, setOrderSortBy] = useState('newest');
  const [kdsFilter, setKdsFilter] = useState('active');
  const [viewingOrder, setViewingOrder] = useState(null);
  const [printingOrder, setPrintingOrder] = useState(null);
  const [orderMoreMenuId, setOrderMoreMenuId] = useState(null);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [auditLogs, setAuditLogs] = useState([
    {
      id: 'LOG-1001',
      action: 'Admin Authentication •',
      details: 'Chief Administrator logged into Admin Panel',
      timestamp: '02:10:13 AM',
      type: 'auth'
    },
    {
      id: 'LOG-1002',
      action: 'Menu Item Updated',
      details: 'Updated "Spicy Szechuan Dumplings" price from ₱350 to ₱380',
      timestamp: '01:24:56 AM',
      type: 'menu'
    },
    {
      id: 'LOG-1003',
      action: 'Inventory Alert',
      details: 'Low stock detected: Thai Basil (2 units remaining)',
      timestamp: '12:18:03 AM',
      type: 'inventory'
    },
    {
      id: 'LOG-1004',
      action: 'New Order Received',
      details: 'Order #1028 • Dine In • ₱490',
      timestamp: '11:45:27 PM',
      type: 'order'
    },
    {
      id: 'LOG-1005',
      action: 'User Role Updated',
      details: 'Updated user role for juan.dela@umami.com to Manager',
      timestamp: '10:32:11 PM',
      type: 'user'
    },
    {
      id: 'LOG-1006',
      action: 'Admin Authentication •',
      details: 'User maria.santos@umami.com logged out',
      timestamp: '08:17:36 PM',
      type: 'logout'
    }
  ]);
  const [promos, setPromos] = useState(() => {
    try {
      const saved = localStorage.getItem('umami_promos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return [];
  });

  // Keep umami_promos in sync with localStorage and load from /api/promos
  useEffect(() => {
    fetch('/api/promos')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setPromos(data);
          try { localStorage.setItem('umami_promos', JSON.stringify(data)); } catch (_) {}
        }
      })
      .catch(err => console.warn('Direct promo fetch error:', err));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('umami_promos', JSON.stringify(promos));
    } catch {}
  }, [promos]);

  const [promoSearch, setPromoSearch] = useState('');
  const [promoStatusFilter, setPromoStatusFilter] = useState('All');
  const [promoTypeFilter, setPromoTypeFilter] = useState('All');
  const [promoDateFilter, setPromoDateFilter] = useState('All');
  const [promoSortBy, setPromoSortBy] = useState('newest');
  const [chartMetric, setChartMetric] = useState('Redemptions');
  const [editingPromo, setEditingPromo] = useState(null);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [previewPromo, setPreviewPromo] = useState(null);
  const [showExpiredArchive, setShowExpiredArchive] = useState(false);
  const [expiredSearch, setExpiredSearch] = useState('');
  const [restoringPromo, setRestoringPromo] = useState(null);
  const [restoreForm, setRestoreForm] = useState({
    newCode: '',
    newExpiresAt: '',
    restoredBy: 'admin@umamicraft.com'
  });
  const [showPromoQrModal, setShowPromoQrModal] = useState(null);

  const [formPromo, setFormPromo] = useState({
    name: '',
    code: '',
    discountType: 'percent',
    discountValue: 15,
    applicableItems: [],
    applyToAll: false,
    dateRange: 'Jan 1, 2025 – Dec 31, 2026',
    expiresAt: '2026-12-31T23:59',
    associatedItem: 'All Menu Items',
    associatedTable: 'All Tables (Storewide)',
    maxRedemptions: 500,
    status: 'active',
    type: 'discount',
    bannerImage: '/ramen_promo_banner.png',
    bannerTitle: '',
    bannerHighlight: '',
    bannerSubtitle: ''
  });
  const promoImageInputRef = useRef(null);
  const [promoItemTab, setPromoItemTab] = useState('food'); // 'food' | 'drinks'

  // Helper to generate a new unique promo code for restoration or creation
  const generateUniqueRestoreCode = (baseCode = 'PROMO') => {
    const cleanBase = (baseCode || 'PROMO').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7) || 'PROMO';
    const rand = Math.floor(10 + Math.random() * 90);
    const candidate = `${cleanBase}${rand}`;
    const isConflict = promos.some(p =>
      p.code?.toUpperCase() === candidate ||
      p.originalCode?.toUpperCase() === candidate ||
      (Array.isArray(p.retiredCodes) && p.retiredCodes.map(c => c.toUpperCase()).includes(candidate))
    );
    if (!isConflict) return candidate;
    return `${cleanBase}${Date.now().toString().slice(-3)}`;
  };

  const handleOpenRestoreModal = (promo) => {
    const suggestedCode = generateUniqueRestoreCode(promo.originalCode || promo.code);
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const year = futureDate.getFullYear();
    const month = String(futureDate.getMonth() + 1).padStart(2, '0');
    const day = String(futureDate.getDate()).padStart(2, '0');
    const hours = String(futureDate.getHours()).padStart(2, '0');
    const minutes = String(futureDate.getMinutes()).padStart(2, '0');
    const localIso = `${year}-${month}-${day}T${hours}:${minutes}`;

    setRestoringPromo(promo);
    setRestoreForm({
      newCode: suggestedCode,
      newExpiresAt: localIso,
      restoredBy: 'admin@umamicraft.com'
    });
  };

  const handleConfirmRestore = async (e) => {
    e.preventDefault();
    if (!restoringPromo) return;
    const cleanNewCode = restoreForm.newCode.trim().toUpperCase().replace(/\s/g, '');
    if (!cleanNewCode) {
      showNotify('A new unique promo code is required.', 'error');
      return;
    }
    const oldCode = (restoringPromo.code || '').trim().toUpperCase();
    if (cleanNewCode === oldCode || (restoringPromo.originalCode && cleanNewCode === restoringPromo.originalCode.toUpperCase())) {
      showNotify(`Cannot reuse expired code "${oldCode}". A new unique code must be generated!`, 'error');
      return;
    }
    const expDate = new Date(restoreForm.newExpiresAt);
    if (isNaN(expDate.getTime()) || expDate.getTime() <= Date.now()) {
      showNotify('New expiration date must be in the future!', 'error');
      return;
    }

    try {
      const res = await fetch('/api/promos/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promoId: restoringPromo.id,
          newCode: cleanNewCode,
          newExpiresAt: expDate.toISOString(),
          newDateRange: `Restored – ${expDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
          restoredBy: restoreForm.restoredBy || 'admin@umamicraft.com'
        })
      });
      const data = await res.json();
      if (data.success) {
        showNotify(`Campaign "${restoringPromo.name}" restored with new code "${cleanNewCode}"!`, 'success');
        addAuditLog('Promo Restored', `Restored "${restoringPromo.name}" (Old: ${restoringPromo.originalCode || oldCode}, New: ${cleanNewCode}) by ${restoreForm.restoredBy || 'admin@umamicraft.com'}`);
        setRestoringPromo(null);
      } else {
        showNotify(data.error || 'Failed to restore promotion', 'error');
      }
    } catch (err) {
      showNotify('Restoration error: ' + err.message, 'error');
    }
  };

  const handleExpirePromo = async (promo) => {
    if (window.confirm(`Are you sure you want to expire promo "${promo.name}" [${promo.code}] immediately? It will be removed from customer displays and moved to the archive.`)) {
      const updatedPromos = promos.map(p => p.id === promo.id ? { ...p, status: 'expired', expiredAt: Date.now() } : p);
      setPromos(updatedPromos);
      try { localStorage.setItem('umami_promos', JSON.stringify(updatedPromos)); } catch (_) {}
      window.dispatchEvent(new CustomEvent('umami_catalog_updated'));

      try {
        const res = await fetch(`/api/promos/expire/${promo.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'Manually expired by administrator' })
        });
        const data = await res.json();
        if (data.success) {
          if (Array.isArray(data.promos)) {
            setPromos(data.promos);
            try { localStorage.setItem('umami_promos', JSON.stringify(data.promos)); } catch (_) {}
            window.dispatchEvent(new CustomEvent('umami_catalog_updated'));
          }
          showNotify(`Campaign "${promo.name}" is now Expired and moved to archive.`, 'warning');
          addAuditLog('Promo Expired', `Expired "${promo.name}" [${promo.code}]`);
        } else {
          showNotify(data.error || 'Failed to expire promo', 'error');
        }
      } catch (err) {
        showNotify('Failed to expire promo: ' + err.message, 'error');
      }
    }
  };
  const [qrTables, setQrTables] = useState(() => {
    try {
      const saved = localStorage.getItem('umami_qr_tables');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return [
      { id: 'T-01', name: 'Table 1 - Main Floor', status: 'active', scannedCount: 142, lastScanned: '10 mins ago' },
      { id: 'T-02', name: 'Table 2 - Window Side', status: 'active', scannedCount: 98, lastScanned: '2 mins ago' },
      { id: 'T-03', name: 'Table 3 - Booth A', status: 'active', scannedCount: 215, lastScanned: 'Just now' },
      { id: 'T-04', name: 'Table 4 - Booth B', status: 'active', scannedCount: 88, lastScanned: '1 hour ago' },
      { id: 'T-05', name: 'Table 5 - Patio Garden', status: 'active', scannedCount: 45, lastScanned: 'Yesterday' },
      { id: 'T-VIP', name: 'VIP Lounge Table 1', status: 'active', scannedCount: 310, lastScanned: '5 mins ago' },
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('umami_qr_tables', JSON.stringify(qrTables));
    } catch (_) {}
  }, [qrTables]);

  const [qrBaseUrl, setQrBaseUrl] = useState(() => {
    try {
      const saved = localStorage.getItem('umami_qr_base_url');
      if (saved) return saved;
    } catch (_) {}
    return 'http://192.168.1.16:3000/?view=mobile&kioskId=RT62AL&kioskPort=3001&restaurant=umami';
  });

  useEffect(() => {
    try {
      localStorage.setItem('umami_qr_base_url', qrBaseUrl);
    } catch (_) {}
  }, [qrBaseUrl]);

  const [showAddQrModal, setShowAddQrModal] = useState(false);
  const [newTableData, setNewTableData] = useState({
    name: '',
    id: '',
    section: 'Main Floor'
  });

  const getTableQrUrl = (tbl) => {
    const base = (qrBaseUrl || '').trim() || 'http://192.168.1.16:3000/?view=mobile&kioskId=RT62AL&kioskPort=3001&restaurant=umami';
    const separator = base.includes('?') ? '&' : '?';
    const tokenParam = tbl.token ? `&t=${tbl.token}` : '';
    return `${base}${separator}tableId=${encodeURIComponent(tbl.id)}${tokenParam}`;
  };

  const handleDownloadQR = (tbl) => {
    const svgEl = document.getElementById(`qr-svg-${tbl.id}`);
    if (!svgEl) {
      showNotify('QR element not found for download', 'error');
      return;
    }
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width + 48;
      canvas.height = img.height + 92;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 24, 20);
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(tbl.name, canvas.width / 2, img.height + 48);
      ctx.fillStyle = '#C24522';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(`Table ID: ${tbl.id} • Umami Craft Fusion`, canvas.width / 2, img.height + 68);

      const a = document.createElement('a');
      a.download = `QR_${tbl.id}_${tbl.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
      showNotify(`Downloaded QR Code for ${tbl.name}!`);
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handlePrintQR = (tbl) => {
    const svgEl = document.getElementById(`qr-svg-${tbl.id}`);
    const svgHtml = svgEl ? svgEl.outerHTML : '';
    const targetUrl = getTableQrUrl(tbl);
    const printWindow = window.open('', '_blank', 'width=650,height=750');
    if (!printWindow) {
      showNotify('Please allow pop-ups to print table QR.', 'error');
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print QR Tent - ${tbl.name}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: #f9fafb;
              padding: 24px;
            }
            .table-tent {
              background: #ffffff;
              border: 3px dashed #C24522;
              border-radius: 24px;
              padding: 40px 32px;
              text-align: center;
              max-width: 400px;
              box-shadow: 0 10px 30px rgba(0,0,0,0.06);
            }
            .logo-badge {
              display: inline-block;
              background: #C24522;
              color: #ffffff;
              font-size: 11px;
              font-weight: 800;
              letter-spacing: 2px;
              padding: 6px 16px;
              border-radius: 999px;
              text-transform: uppercase;
              margin-bottom: 14px;
            }
            .title {
              font-size: 24px;
              font-weight: 800;
              color: #111827;
              margin: 0 0 6px;
            }
            .sub {
              font-size: 13px;
              color: #6b7280;
              margin: 0 0 24px;
            }
            .qr-box {
              background: #FAF5EE;
              padding: 20px;
              border-radius: 18px;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              margin-bottom: 20px;
              border: 1px solid #ebdcd0;
            }
            .table-title {
              font-size: 20px;
              font-weight: 800;
              color: #C24522;
              margin: 0 0 4px;
            }
            .table-id {
              font-size: 13px;
              color: #4b5563;
              font-weight: 600;
              margin: 0 0 18px;
            }
            .instructions {
              font-size: 12.5px;
              color: #374151;
              line-height: 1.45;
              background: #fdf8f4;
              padding: 12px 16px;
              border-radius: 12px;
              border: 1px solid #fed7aa;
            }
            .url-note {
              font-size: 10px;
              color: #9ca3af;
              margin-top: 14px;
              word-break: break-all;
            }
            @media print {
              body { background: #ffffff; padding: 0; }
              .table-tent { box-shadow: none; border-color: #C24522; margin: auto; }
            }
          </style>
        </head>
        <body>
          <div class="table-tent">
            <div class="logo-badge">UMAMI CRAFT FUSION</div>
            <h1 class="title">Scan to Dine</h1>
            <p class="sub">Personalized Allergen-Safe Mobile Ordering</p>
            <div class="qr-box">
              ${svgHtml}
            </div>
            <div class="table-title">${tbl.name}</div>
            <div class="table-id">Table ID: ${tbl.id}</div>
            <div class="instructions">
              Point your smartphone camera at this code to view the menu, set allergen preferences, and order directly to this table.
            </div>
            <div class="url-note">${targetUrl}</div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 350);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    showNotify(`Opened print tent for ${tbl.name}!`);
  };

  const handleRegenerateQR = (tblId) => {
    const newToken = Math.random().toString(36).substring(2, 8).toUpperCase();
    setQrTables(prev => prev.map(tbl => {
      if (tbl.id === tblId) {
        return {
          ...tbl,
          token: newToken,
          lastScanned: 'Just now'
        };
      }
      return tbl;
    }));
    showNotify(`Regenerated QR token for ${tblId}!`);
  };

  const handleCreateNewQrTable = (e) => {
    e.preventDefault();
    const name = newTableData.name.trim();
    if (!name) {
      showNotify('Please enter a table name.', 'error');
      return;
    }
    const nextNum = qrTables.length + 1;
    const assignedId = (newTableData.id.trim() || `T-${String(nextNum).padStart(2, '0')}`).toUpperCase();
    
    const exists = qrTables.some(t => t.id.toLowerCase() === assignedId.toLowerCase());
    if (exists) {
      showNotify(`Table ID "${assignedId}" already exists! Choose a unique ID.`, 'error');
      return;
    }

    const newTable = {
      id: assignedId,
      name: name,
      section: newTableData.section || 'Main Floor',
      status: 'active',
      scannedCount: 0,
      lastScanned: 'Never',
      token: Math.random().toString(36).substring(2, 8).toUpperCase(),
      createdAt: new Date().toISOString()
    };

    setQrTables(prev => [...prev, newTable]);
    setShowAddQrModal(false);
    setNewTableData({ name: '', id: '', section: 'Main Floor' });
    showNotify(`Table QR created successfully for ${name} (${assignedId})!`);
  };

  const handleDeleteQrTable = (tblId) => {
    if (window.confirm(`Delete QR code for table ${tblId}?`)) {
      setQrTables(prev => prev.filter(t => t.id !== tblId));
      showNotify(`Table ${tblId} QR code removed.`);
    }
  };

  const [combos, setCombos] = useState(() => {
    try {
      const saved = localStorage.getItem('umami_combos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 4) return parsed;
      }
    } catch {}
    return [
      {
        id: 'CMB-101',
        name: 'Ultimate Teriyaki Feast Combo',
        main: 'Chicken Teriyaki Rice Bowl',
        side: 'Pork & Chive Gyoza',
        drink: 'Matcha Boba Milk Tea',
        originalPrice: 480,
        promoPrice: 399,
        image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
        status: 'active',
        dateRange: 'Jan 1, 2024 – Dec 31, 2024'
      },
      {
        id: 'CMB-102',
        name: 'Szechuan Dumpling Duo',
        main: 'Spicy Szechuan Dumplings',
        side: 'Egg Fried Rice',
        drink: 'Thai Iced Milk Tea',
        originalPrice: 450,
        promoPrice: 349,
        image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=600&q=80',
        status: 'active',
        dateRange: 'Jan 15, 2024 – Dec 31, 2024'
      },
      {
        id: 'CMB-103',
        name: 'Thai Curry Comfort Set',
        main: 'Thai Green Curry Chicken',
        side: 'Jasmine Rice',
        drink: 'Lemongrass Iced Tea',
        originalPrice: 420,
        promoPrice: 349,
        image: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?auto=format&fit=crop&w=600&q=80',
        status: 'scheduled',
        dateRange: 'Mar 1, 2025 – Jun 30, 2025'
      },
      {
        id: 'CMB-104',
        name: 'Mango Dessert Treat',
        main: 'Mango Sticky Rice',
        side: 'Coconut Ice Cream',
        drink: 'Mango Shake',
        originalPrice: 320,
        promoPrice: 249,
        image: 'https://images.unsplash.com/photo-1562440499-64c9a111f713?auto=format&fit=crop&w=600&q=80',
        status: 'active',
        dateRange: 'Jan 1, 2024 – Dec 31, 2024'
      }
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('umami_combos', JSON.stringify(combos));
    } catch {}
  }, [combos]);

  const [comboSearch, setComboSearch] = useState('');
  const [comboStatusFilter, setComboStatusFilter] = useState('All');
  const [comboDateFilter, setComboDateFilter] = useState('All');
  const [comboSortBy, setComboSortBy] = useState('newest');
  const [showComboModal, setShowComboModal] = useState(false);
  const [editingCombo, setEditingCombo] = useState(null);
  const [previewCombo, setPreviewCombo] = useState(null);
  const [formCombo, setFormCombo] = useState({
    id: '',
    name: '',
    main: 'Chicken Teriyaki Rice Bowl',
    side: 'Pork & Chive Gyoza',
    drink: 'Matcha Boba Milk Tea',
    originalPrice: 480,
    promoPrice: 399,
    status: 'active',
    dateRange: 'Jan 1, 2024 – Dec 31, 2024',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'
  });

  const [mixMatchRules, setMixMatchRules] = useState(() => {
    try {
      const saved = localStorage.getItem('umami_mixmatch');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 3) {
          const sanitized = JSON.parse(
            JSON.stringify(parsed)
              .replaceAll('photo-1558857563-b37cf0087799', 'photo-1536256263959-770b48d82b0a')
              .replaceAll('photo-1558857563-b37cf53f7c19', 'photo-1536256263959-770b48d82b0a')
              .replaceAll('photo-1558857563-b37cf5a0f12c', 'photo-1536256263959-770b48d82b0a')
              .replaceAll('photo-1558857563-b37fcda2374d', 'photo-1536256263959-770b48d82b0a')
          );
          try {
            localStorage.setItem('umami_mixmatch', JSON.stringify(sanitized));
          } catch {}
          return sanitized;
        }
      }
    } catch {}
    return [
      {
        id: 'MM-1',
        name: 'Craft Bowl + Side + Drink Deal',
        subtitle: 'Craft your perfect meal with our signature favorites!',
        price: 349,
        status: 'active',
        dateRange: 'Jan 1, 2024 – Dec 31, 2024',
        mainOptions: [
          { name: 'Chicken Teriyaki Rice Bowl', price: 220, image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80' },
          { name: 'Spicy Ramen Bowl', price: 240, image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80' }
        ],
        sideOptions: [
          { name: 'Pork & Chive Gyoza', price: 90, image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=600&q=80' },
          { name: 'Crispy Chicken Wings', price: 120, image: 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=600&q=80' }
        ],
        drinkOptions: [
          { name: 'Matcha Boba Milk Tea', price: 120, image: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80' },
          { name: 'Iced Taro Milk Tea', price: 110, image: 'https://images.unsplash.com/photo-1556881286-fc6915169721?auto=format&fit=crop&w=600&q=80' }
        ]
      },
      {
        id: 'MM-2',
        name: 'Ramen + Gyoza + Drink Set',
        subtitle: 'A classic combination for ramen lovers.',
        price: 299,
        status: 'scheduled',
        dateRange: 'Mar 1, 2024 – May 31, 2024',
        image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80',
        mainOptions: [
          { name: 'Spicy Szechuan Ramen', price: 240, image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80' },
          { name: 'Tonkotsu Classic', price: 250, image: 'https://images.unsplash.com/photo-1552611052-33e04de081de?auto=format&fit=crop&w=600&q=80' }
        ],
        sideOptions: [
          { name: 'Pork & Chive Gyoza', price: 90, image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=600&q=80' }
        ],
        drinkOptions: [
          { name: 'Iced Green Tea', price: 90, image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80' }
        ]
      },
      {
        id: 'MM-3',
        name: 'Chicken Feast Bundle',
        subtitle: 'Crispy, flavorful, and refreshing.',
        price: 319,
        status: 'active',
        dateRange: 'Jan 1, 2024 – Dec 31, 2024',
        image: 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=600&q=80',
        mainOptions: [
          { name: 'Crispy Karaage Rice Bowl', price: 230, image: 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=600&q=80' }
        ],
        sideOptions: [
          { name: 'Crinkle Cut Fries', price: 95, image: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=600&q=80' }
        ],
        drinkOptions: [
          { name: 'House Lemonade', price: 95, image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80' }
        ]
      }
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('umami_mixmatch', JSON.stringify(mixMatchRules));
    } catch {}
  }, [mixMatchRules]);

  const [mixMatchSearch, setMixMatchSearch] = useState('');
  const [mixMatchStatusFilter, setMixMatchStatusFilter] = useState('All');
  const [mixMatchSortBy, setMixMatchSortBy] = useState('latest');
  const [mixMatchView, setMixMatchView] = useState('card');
  const [selectedMainIdx, setSelectedMainIdx] = useState(0);
  const [selectedSideIdx, setSelectedSideIdx] = useState(0);
  const [selectedDrinkIdx, setSelectedDrinkIdx] = useState(0);
  const [editingMixMatch, setEditingMixMatch] = useState(null);

  const [staffUsers, setStaffUsers] = useState([
    { id: 'U-1', name: 'Chief Admin', email: 'admin@umamicraft.com', role: 'Super Admin', status: 'active' },
    { id: 'U-2', name: 'Master Chef Kenji', email: 'kitchen@umamicraft.com', role: 'Kitchen Staff', status: 'active' },
    { id: 'U-3', name: 'Food Runner Leo', email: 'busser@umamicraft.com', role: 'Busser', status: 'active' },
    { id: 'U-4', name: 'Cashier Sarah', email: 'cashier@umamicraft.com', role: 'Cashier', status: 'active' },
  ]);

  // Modals state
  const [showItemModal, setShowItemModal] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');
  const [menuSortBy, setMenuSortBy] = useState('name-asc');
  const [menuPage, setMenuPage] = useState(1);
  const MENU_PAGE_SIZE = 8;
  const [notification, setNotification] = useState(null);
  const [availDropdownOpen, setAvailDropdownOpen] = useState(false);
  const [showDrinkModal, setShowDrinkModal] = useState(false);
  const [drinkAvailDropdownOpen, setDrinkAvailDropdownOpen] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formCategory, setFormCategory] = useState({
    name: '',
    icon: '🍽️'
  });
  const [showMixMatchModal, setShowMixMatchModal] = useState(false);
  const [formMixMatch, setFormMixMatch] = useState({
    name: '',
    subtitle: '',
    price: 349,
    status: 'active',
    dateRange: 'Jan 1, 2024 – Dec 31, 2024',
    selectedMain: ['Chicken Teriyaki Rice Bowl', 'Spicy Ramen Bowl'],
    selectedSide: ['Pork & Chive Gyoza', 'Crispy Chicken Wings'],
    selectedDrinks: ['Matcha Boba Milk Tea', 'Iced Taro Milk Tea']
  });
  const [drinks, setDrinks] = useState(() => {
    try {
      const saved = localStorage.getItem('umami_drinks');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 6) {
          const sanitized = JSON.parse(
            JSON.stringify(parsed)
              .replaceAll('photo-1558857563-b37cf5a0f12c', 'photo-1576092768241-dec231879fc3')
              .replaceAll('photo-1558857563-b37cf0087799', 'photo-1536256263959-770b48d82b0a')
              .replaceAll('photo-1558857563-b37cf53f7c19', 'photo-1536256263959-770b48d82b0a')
          );
          try {
            localStorage.setItem('umami_drinks', JSON.stringify(sanitized));
          } catch {}
          return sanitized;
        }
      }
    } catch {}
    return [
      {
        id: 'DRK-001',
        sku: 'DRK-001',
        name: 'Matcha Boba Milk Tea',
        image: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=400&q=80',
        status: 'Available',
        available: true,
        category: 'Milk Tea',
        description: 'Premium Japanese matcha with fresh milk and chewy tapioca pearls.',
        addons: ['Extra Pearls', 'Less Ice'],
        sizes: [
          { name: 'Small', volume: '355 ml', price: 75, stock: 25 },
          { name: 'Medium', volume: '500 ml', price: 85, stock: 18 },
          { name: 'Large', volume: '700 ml', price: 95, stock: 12 }
        ]
      },
      {
        id: 'DRK-002',
        sku: 'DRK-002',
        name: 'Iced Taro Milk Tea',
        image: 'https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?auto=format&fit=crop&w=400&q=80',
        status: 'Available',
        available: true,
        category: 'Milk Tea',
        description: 'Sweet and creamy taro flavor with tapioca pearls.',
        addons: ['Extra Pearls', 'Less Ice'],
        sizes: [
          { name: 'Small', volume: '355 ml', price: 70, stock: 30 },
          { name: 'Medium', volume: '500 ml', price: 80, stock: 20 },
          { name: 'Large', volume: '700 ml', price: 90, stock: 15 }
        ]
      },
      {
        id: 'DRK-003',
        sku: 'DRK-003',
        name: 'Thai Iced Milk Tea',
        image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=400&q=80',
        status: 'Available',
        available: true,
        category: 'Milk Tea',
        description: 'Authentic Thai tea blend with creamy milk and a bold flavor.',
        addons: ['Less Ice', 'Extra Pearls'],
        sizes: [
          { name: 'Small', volume: '355 ml', price: 70, stock: 28 },
          { name: 'Medium', volume: '500 ml', price: 80, stock: 16 },
          { name: 'Large', volume: '700 ml', price: 90, stock: 10 }
        ]
      },
      {
        id: 'DRK-004',
        sku: 'DRK-004',
        name: 'Mango Shake',
        image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=400&q=80',
        status: 'Available',
        available: true,
        category: 'Fruit Shake',
        description: 'Refreshing real mangoes blended to perfection.',
        addons: ['Add Whipped Cream'],
        sizes: [
          { name: 'Small', volume: '355 ml', price: 85, stock: 22 },
          { name: 'Medium', volume: '500 ml', price: 95, stock: 14 },
          { name: 'Large', volume: '700 ml', price: 105, stock: 8 }
        ]
      },
      {
        id: 'DRK-005',
        sku: 'DRK-005',
        name: 'Calamansi Iced Tea',
        image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=400&q=80',
        status: 'Low Stock',
        available: true,
        category: 'Iced Tea',
        description: 'Refreshing calamansi with brewed black tea.',
        addons: ['Less Ice'],
        sizes: [
          { name: 'Small', volume: '355 ml', price: 60, stock: 6 },
          { name: 'Medium', volume: '500 ml', price: 70, stock: 4 },
          { name: 'Large', volume: '700 ml', price: 80, stock: 3 }
        ]
      },
      {
        id: 'DRK-006',
        sku: 'DRK-006',
        name: 'Bottled Water',
        image: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=400&q=80',
        status: 'Available',
        available: true,
        category: 'Bottled Drinks',
        description: 'Purified drinking water.',
        addons: ['Chilled'],
        sizes: [
          { name: 'Small', volume: '350 ml', price: 30, stock: 50 },
          { name: 'Medium', volume: '500 ml', price: 35, stock: 40 },
          { name: 'Large', volume: '1000 ml', price: 55, stock: 25 }
        ]
      }
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('umami_drinks', JSON.stringify(drinks));
    } catch {}
  }, [drinks]);

  const [drinkSearch, setDrinkSearch] = useState('');
  const [drinkCategoryFilter, setDrinkCategoryFilter] = useState('All');
  const [drinkAvailFilter, setDrinkAvailFilter] = useState('All');
  const [drinkStockFilter, setDrinkStockFilter] = useState('All');
  const [drinkSortBy, setDrinkSortBy] = useState('name-asc');
  const [showSizePresetsModal, setShowSizePresetsModal] = useState(false);
  const [viewingDrink, setViewingDrink] = useState(null);
  const [editingDrink, setEditingDrink] = useState(null);
  const [drinkRowsPerPage, setDrinkRowsPerPage] = useState(12);

  const handleDrinkStockChange = (drinkId, sizeName, delta) => {
    let targetDrink = null;
    const updatedDrinks = drinks.map(d => {
      if (d.id === drinkId) {
        const updatedSizes = d.sizes.map(s => {
          if (s.name === sizeName) {
            const nextStock = Math.max(0, (s.stock || 0) + delta);
            return { ...s, stock: nextStock };
          }
          return s;
        });
        const anyLow = updatedSizes.some(s => s.stock <= 6 && s.stock > 0);
        const allOut = updatedSizes.every(s => s.stock === 0);
        let newStatus = d.status;
        if (allOut) newStatus = 'Unavailable';
        else if (anyLow) newStatus = 'Low Stock';
        else if (d.available) newStatus = 'Available';

        targetDrink = { ...d, sizes: updatedSizes, status: newStatus };
        return targetDrink;
      }
      return d;
    });
    setDrinks(updatedDrinks);
    localStorage.setItem('umami_drinks', JSON.stringify(updatedDrinks));
    fetch(`/api/drinks/${drinkId}/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sizeName, delta })
    }).catch(err => console.warn('Failed to sync drink stock to API:', err));
    window.dispatchEvent(new CustomEvent('umami_catalog_updated'));
    if (targetDrink) {
      addAuditLog('Drink Stock Adjusted', `Adjusted "${targetDrink.name}" (${sizeName}) by ${delta > 0 ? `+${delta}` : delta}`);
    }
  };

  const handleToggleDrinkAvailable = (drinkId) => {
    let nextAvail = true;
    const updatedDrinks = drinks.map(d => {
      if (d.id === drinkId) {
        nextAvail = !d.available;
        const anyLow = d.sizes.some(s => s.stock <= 6 && s.stock > 0);
        const newStatus = nextAvail ? (anyLow ? 'Low Stock' : 'Available') : 'Unavailable';
        addAuditLog('Drink Availability Toggled', `"${d.name}" marked as ${nextAvail ? 'Available' : 'Unavailable'}`);
        return { ...d, available: nextAvail, status: newStatus };
      }
      return d;
    });
    setDrinks(updatedDrinks);
    localStorage.setItem('umami_drinks', JSON.stringify(updatedDrinks));
    fetch(`/api/drinks/${drinkId}/availability`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ available: nextAvail })
    }).catch(err => console.warn('Failed to sync drink availability to API:', err));
    window.dispatchEvent(new CustomEvent('umami_catalog_updated'));
  };

  const handleDuplicateDrink = (drink) => {
    const newId = `DRK-00${drinks.length + 1}`;
    const newDrink = {
      ...drink,
      id: newId,
      sku: newId,
      name: `${drink.name} (Copy)`
    };
    const updatedDrinks = [newDrink, ...drinks];
    setDrinks(updatedDrinks);
    localStorage.setItem('umami_drinks', JSON.stringify(updatedDrinks));
    fetch('/api/drinks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newDrink)
    }).catch(err => console.warn('Failed to sync duplicated drink to API:', err));
    window.dispatchEvent(new CustomEvent('umami_catalog_updated'));
    addAuditLog('Drink Duplicated', `Duplicated "${drink.name}" as "${newDrink.name}"`);
    showNotify(`"${drink.name}" duplicated successfully!`);
  };

  const handleArchiveDrink = (drinkId, name) => {
    if (window.confirm(`Are you sure you want to archive "${name}"?`)) {
      const updatedDrinks = drinks.filter(d => d.id !== drinkId);
      setDrinks(updatedDrinks);
      localStorage.setItem('umami_drinks', JSON.stringify(updatedDrinks));
      fetch(`/api/drinks/${drinkId}`, { method: 'DELETE' }).catch(err => console.warn('Failed to sync drink archive to API:', err));
      window.dispatchEvent(new CustomEvent('umami_catalog_updated'));
      addAuditLog('Drink Archived', `Archived beverage "${name}" (#${drinkId})`);
      showNotify(`"${name}" has been archived.`, 'warning');
    }
  };

  const handleDeleteDrink = (drinkId, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      const updatedDrinks = drinks.filter(d => d.id !== drinkId);
      setDrinks(updatedDrinks);
      localStorage.setItem('umami_drinks', JSON.stringify(updatedDrinks));
      fetch(`/api/drinks/${drinkId}`, { method: 'DELETE' }).catch(err => console.warn('Failed to sync drink deletion to API:', err));
      window.dispatchEvent(new CustomEvent('umami_catalog_updated'));
      addAuditLog('Drink Deleted', `Deleted beverage "${name}" (#${drinkId})`);
      showNotify(`"${name}" has been deleted.`, 'warning');
    }
  };

  const [formDrink, setFormDrink] = useState({
    id: '',
    name: '',
    image: '',
    description: '',
    category: 'Milk Tea',
    price: 75,
    available: true,
    addons: '',
    sizes: [
      { name: 'Small', volume: '355 ml', price: 75, stock: 25 },
      { name: 'Medium', volume: '500 ml', price: 85, stock: 18 },
      { name: 'Large', volume: '700 ml', price: 95, stock: 12 }
    ]
  });

  // Form State for Products
  const [formProduct, setFormProduct] = useState({
    id: '',
    name: '',
    image: '',
    description: '',
    category: 'Rice Bowls',
    subcategory: 'Signature',
    price: 240,
    promoPrice: '',
    available: true,
    ingredients: 'Chicken, Teriyaki Sauce, Jasmine Rice, Sesame',
    allergens: 'Soy, Sesame',
    prepTime: '10 mins',
    stock: 25,
    sizes: 'Standard',
    addons: 'Extra Sauce (+₱20), Soft Boiled Egg (+₱30)'
  });

  // Sync promos to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('umami_promos', JSON.stringify(promos));
  }, [promos]);

  // Unified Inventory & Stock Controls State (Connected to Menu Management & Drinks)
  const [inventorySubTab, setInventorySubTab] = useState('stock'); // 'stock', 'history', 'waste'
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState('All');
  const [inventoryStatusFilter, setInventoryStatusFilter] = useState('All');
  const [inventorySortBy, setInventorySortBy] = useState('name-asc');
  const [inventoryPage, setInventoryPage] = useState(1);
  const [selectedInventoryIds, setSelectedInventoryIds] = useState(new Set());
  const [bulkAction, setBulkAction] = useState('');
  const [quickRestockAmounts, setQuickRestockAmounts] = useState({});
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [formStockItem, setFormStockItem] = useState({
    type: 'menu', // 'menu' or 'drink'
    name: '',
    category: 'Appetizers',
    sku: '',
    price: 250,
    stock: 25,
    reorderLevel: 5,
    image: ''
  });

  const [stockActivities, setStockActivities] = useState(() => {
    try {
      const saved = localStorage.getItem('umami_stock_activities');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      { id: 1, time: 'Oct 26, 2024 10:24 AM', product: 'Spicy Szechuan Dumplings', type: 'Stock Checked', quantity: 0, notes: 'Inventory verified', user: 'System' },
      { id: 2, time: 'Oct 25, 2024 09:18 AM', product: 'Thai Coconut Curry Bowl', type: 'Stock Checked', quantity: 0, notes: 'Daily inventory check', user: 'Manager' },
      { id: 3, time: 'Oct 26, 2024 08:45 AM', product: 'Mango Sticky Rice', type: 'Stock Checked', quantity: 0, notes: 'Inventory verified', user: 'System' },
      { id: 4, time: 'Oct 25, 2024 07:32 PM', product: 'Smoked Truffle Edamame', type: 'Stock Checked', quantity: 0, notes: 'End of day check', user: 'Manager' },
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('umami_stock_activities', JSON.stringify(stockActivities));
    } catch {}
  }, [stockActivities]);

  const [wasteLogs, setWasteLogs] = useState([
    { id: 'W-1', time: 'Oct 24, 2024 04:15 PM', item: 'Thai Coconut Curry Bowl', qty: 2, reason: 'Dropped in prep', user: 'Chef Kenji', cost: '₱980.00' },
    { id: 'W-2', time: 'Oct 23, 2024 09:30 PM', item: 'Spicy Szechuan Dumplings', qty: 3, reason: 'Expired / Leftover batch', user: 'Manager', cost: '₱1,140.00' }
  ]);

  // Derived unified inventory combining BOTH Menu Management and Drinks & Sizes Management
  const allInventoryItems = useMemo(() => {
    const foodItems = menuItems.map(item => {
      const stock = item.stock !== undefined ? Number(item.stock) : 25;
      const reorderLevel = item.reorderLevel !== undefined ? Number(item.reorderLevel) : (item.category === 'Rice Bowls' ? 10 : 5);
      const isOut = stock === 0 || item.available === false;
      const isLow = !isOut && stock <= reorderLevel;
      const status = isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock';
      const baseline = Math.max(stock, 25);
      const stockLevelPercent = Math.min(100, Math.round((stock / baseline) * 100));

      return {
        id: `MENU-${item.id}`,
        rawId: item.id,
        source: 'menu',
        name: item.name,
        category: item.category || 'Appetizers',
        sku: item.sku || `APP-${item.id}`,
        stock: stock,
        reorderLevel: reorderLevel,
        stockLevelPercent: stockLevelPercent,
        status: status,
        lastUpdated: item.lastUpdated || 'Oct 26, 2024 10:24 AM',
        image: item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
        rawItem: item
      };
    });

    const beverageItems = drinks.map(drink => {
      const totalStock = drink.sizes && drink.sizes.length > 0
        ? drink.sizes.reduce((sum, s) => sum + (s.stock || 0), 0)
        : (drink.stock !== undefined ? Number(drink.stock) : 25);
      const reorderLevel = drink.reorderLevel !== undefined ? Number(drink.reorderLevel) : 10;
      const isOut = totalStock === 0 || drink.available === false;
      const isLow = !isOut && totalStock <= reorderLevel;
      const status = isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock';
      const baseline = Math.max(totalStock, 30);
      const stockLevelPercent = Math.min(100, Math.round((totalStock / baseline) * 100));

      return {
        id: `DRK-${drink.id}`,
        rawId: drink.id,
        source: 'drink',
        name: drink.name,
        category: drink.category || 'Drinks',
        sku: drink.sku || drink.id,
        stock: totalStock,
        reorderLevel: reorderLevel,
        stockLevelPercent: stockLevelPercent,
        status: status,
        lastUpdated: drink.lastUpdated || 'Oct 26, 2024 10:24 AM',
        image: drink.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80',
        rawItem: drink
      };
    });

    return [...foodItems, ...beverageItems];
  }, [menuItems, drinks]);

  const filteredInventoryItems = useMemo(() => {
    return allInventoryItems.filter(item => {
      const matchesSearch = !inventorySearch.trim() ||
        item.name.toLowerCase().includes(inventorySearch.toLowerCase()) ||
        item.sku.toLowerCase().includes(inventorySearch.toLowerCase());

      const matchesCategory = inventoryCategoryFilter === 'All' ||
        item.category.toLowerCase() === inventoryCategoryFilter.toLowerCase() ||
        (inventoryCategoryFilter === 'Food' && item.source === 'menu') ||
        (inventoryCategoryFilter === 'Drinks' && item.source === 'drink');

      const matchesStatus = inventoryStatusFilter === 'All' || item.status === inventoryStatusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    }).sort((a, b) => {
      if (inventorySortBy === 'name-asc') return a.name.localeCompare(b.name);
      if (inventorySortBy === 'name-desc') return b.name.localeCompare(a.name);
      if (inventorySortBy === 'stock-desc') return b.stock - a.stock;
      if (inventorySortBy === 'stock-asc') return a.stock - b.stock;
      if (inventorySortBy === 'sku') return a.sku.localeCompare(b.sku);
      return 0;
    });
  }, [allInventoryItems, inventorySearch, inventoryCategoryFilter, inventoryStatusFilter, inventorySortBy]);

  const handleRestockInventory = (item, amount) => {
    const qty = Number(amount) || 20;
    const nowStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    if (item.source === 'menu') {
      setMenuItems(prev => prev.map(m => {
        if (m.id === item.rawId) {
          return {
            ...m,
            stock: (m.stock !== undefined ? Number(m.stock) : 25) + qty,
            available: true,
            lastUpdated: nowStr
          };
        }
        return m;
      }));
    } else if (item.source === 'drink') {
      setDrinks(prev => prev.map(d => {
        if (d.id === item.rawId) {
          const perSize = Math.ceil(qty / (d.sizes?.length || 1));
          const updatedSizes = d.sizes ? d.sizes.map(s => ({ ...s, stock: (s.stock || 0) + perSize })) : [];
          return {
            ...d,
            sizes: updatedSizes,
            available: true,
            status: 'Available',
            lastUpdated: nowStr
          };
        }
        return d;
      }));
    }

    setStockActivities(prev => [
      {
        id: Date.now(),
        time: nowStr,
        product: item.name,
        type: 'Quick Restock',
        quantity: `+${qty}`,
        notes: `Restocked +${qty} units via Inventory Controls`,
        user: 'Manager'
      },
      ...prev
    ]);

    addAuditLog('Inventory Restocked', `Restocked +${qty} units to "${item.name}"`);
    showNotify(`Added +${qty} units to ${item.name}!`);
  };

  const handleStepperChange = (id, delta) => {
    setQuickRestockAmounts(prev => {
      const current = prev[id] !== undefined ? prev[id] : 20;
      return { ...prev, [id]: Math.max(5, current + delta) };
    });
  };

  const handleApplyBulkAction = () => {
    if (!bulkAction || selectedInventoryIds.size === 0) {
      alert('Please select products and an action to apply.');
      return;
    }
    const selectedList = allInventoryItems.filter(i => selectedInventoryIds.has(i.id));

    if (bulkAction === 'restock20') {
      selectedList.forEach(item => handleRestockInventory(item, 20));
      showNotify(`Restocked +20 units for ${selectedList.length} products`);
    } else if (bulkAction === 'markInStock') {
      setMenuItems(prev => prev.map(m => selectedInventoryIds.has(`MENU-${m.id}`) ? { ...m, available: true } : m));
      setDrinks(prev => prev.map(d => selectedInventoryIds.has(`DRK-${d.id}`) ? { ...d, available: true, status: 'Available' } : d));
      showNotify(`Marked ${selectedList.length} products as In Stock`);
    } else if (bulkAction === 'markLowStock') {
      setMenuItems(prev => prev.map(m => selectedInventoryIds.has(`MENU-${m.id}`) ? { ...m, stock: m.reorderLevel || 5 } : m));
      showNotify(`Updated ${selectedList.length} products to Low Stock`);
    }
    setSelectedInventoryIds(new Set());
    setBulkAction('');
  };

  const handleExportInventory = () => {
    const csvContent = "data:text/csv;charset=utf-8," +
      ["SKU,Product Name,Category,Current Stock,Reorder Level,Status,Last Updated"]
        .concat(allInventoryItems.map(i => `"${i.sku}","${i.name}","${i.category}",${i.stock},${i.reorderLevel},"${i.status}","${i.lastUpdated}"`))
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `umami_inventory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotify('Inventory exported successfully!');
  };

  // Auto-expire promos older than 2 days
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setPromos(prev => prev.map(p => {
        if (p.status === 'active' && now - p.createdAt > 2 * 24 * 60 * 60 * 1000) {
          return { ...p, status: 'expired' };
        }
        return p;
      }));
    }, 60_000); // check every minute
    return () => clearInterval(interval);
  }, []);

  // Fetch live menu, orders, inventory from backend
  useEffect(() => {
    fetch('/api/menu')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const enhanced = data.map(item => ({
            ...item,
            image: item.image || (
              String(item.id) === '101' ? 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=600&q=80' :
              String(item.id) === '102' ? 'https://images.unsplash.com/photo-1622205313162-be1d5712a43f?auto=format&fit=crop&w=600&q=80' :
              String(item.id) === '103' ? 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80' :
              String(item.id) === '104' ? 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80' :
              String(item.id) === '105' ? 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?auto=format&fit=crop&w=600&q=80' :
              String(item.id) === '106' ? 'https://images.unsplash.com/photo-1562440499-64c9a111f713?auto=format&fit=crop&w=600&q=80' :
              'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'
            )
          }));
          setMenuItems(enhanced);
        }
      })
      .catch(() => {});

    // Initial fetch from persistent database
    fetch('/api/orders')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data) && data.length > 0) setOrders(data); })
      .catch(() => {});
  }, []);

  // ══════════════════════════════════════════════════════════════════════════
  // REAL-TIME KITCHEN & ADMIN LIVE SYNC (Socket.io bidirectional integration)
  // ══════════════════════════════════════════════════════════════════════════
  const [internalSocketConnected, setInternalSocketConnected] = useState(socketConnected || false);
  const activeSocketRef = useRef(socket || null);

  useEffect(() => {
    let localSocket = socket;
    let didCreate = false;
    if (!localSocket) {
      localSocket = io();
      didCreate = true;
    }
    activeSocketRef.current = localSocket;

    const onConnect = () => {
      setInternalSocketConnected(true);
      localSocket.emit('join-session', { role: 'admin' });
      console.log('[Admin] Connected to Socket server & joined admin session room');
    };

    const onDisconnect = () => {
      setInternalSocketConnected(false);
      console.log('[Admin] Disconnected from Socket server');
    };

    if (localSocket.connected) {
      onConnect();
    } else {
      localSocket.on('connect', onConnect);
    }
    localSocket.on('disconnect', onDisconnect);

    const onInitialOrders = (data) => {
      if (Array.isArray(data) && data.length > 0) {
        setOrders(data);
      }
    };

    const onNewOrder = (newOrder) => {
      const newId = newOrder.orderId || newOrder.id;
      setOrders(prev => {
        const exists = prev.some(o => (o.orderId || o.id) === newId);
        if (exists) return prev.map(o => (o.orderId || o.id) === newId ? { ...o, ...newOrder } : o);
        return [newOrder, ...prev];
      });
      addAuditLog('New Order Received', `Order #${newId} placed (${newOrder.customer || 'Guest'}, ${newOrder.orderType || 'Dine-In'})`);
      showNotify(`Live Alert: Order #${newId} arrived in queue!`, 'info');
    };

    const onStatusUpdated = (payload) => {
      const ordId = payload.orderId || payload.id;
      const newStatus = payload.status;
      setOrders(prev =>
        prev.map(o => {
          if ((o.orderId || o.id) === ordId) {
            return {
              ...o,
              status: newStatus,
              nextStatus: payload.nextStatus || o.nextStatus,
              stripeColor: payload.stripeColor || o.stripeColor,
              updatedAt: payload.updatedAt || new Date().toISOString(),
              statusHistory: payload.statusHistory || o.statusHistory
            };
          }
          return o;
        })
      );
      addAuditLog('Order Status Synced', `Order #${ordId} status synchronized to ${newStatus}`);
    };

    const onMenuUpdated = (data) => {
      if (Array.isArray(data)) {
        setMenuItems(data);
        localStorage.setItem('umami_admin_menu', JSON.stringify(data));
      }
    };

    const onDrinksUpdated = (data) => {
      if (Array.isArray(data)) {
        setDrinks(data);
        localStorage.setItem('umami_drinks', JSON.stringify(data));
      }
    };

    const onPromosUpdated = (data) => {
      if (Array.isArray(data)) {
        setPromos(data);
        try { localStorage.setItem('umami_promos', JSON.stringify(data)); } catch (_) {}
      }
    };

    localSocket.on('initial-orders', onInitialOrders);
    localSocket.on('new-kitchen-order', onNewOrder);
    localSocket.on('new-order', onNewOrder);
    localSocket.on('order-status-updated', onStatusUpdated);
    localSocket.on('initial-menu', onMenuUpdated);
    localSocket.on('menu-updated', onMenuUpdated);
    localSocket.on('initial-drinks', onDrinksUpdated);
    localSocket.on('drinks-updated', onDrinksUpdated);
    localSocket.on('initial-promos', onPromosUpdated);
    localSocket.on('promos-updated', onPromosUpdated);

    // Initial fetch from backend API
    fetch('/api/menu')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setMenuItems(data);
          localStorage.setItem('umami_admin_menu', JSON.stringify(data));
        }
      })
      .catch(() => {});

    fetch('/api/drinks')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setDrinks(data);
          localStorage.setItem('umami_drinks', JSON.stringify(data));
        }
      })
      .catch(() => {});

    const handleLocalCatalogSync = () => {
      try {
        const m = localStorage.getItem('umami_admin_menu');
        if (m) setMenuItems(JSON.parse(m));
        const d = localStorage.getItem('umami_drinks');
        if (d) setDrinks(JSON.parse(d));
        const o = localStorage.getItem('umami_orders');
        if (o) setOrders(JSON.parse(o));
      } catch (_) {}
    };

    const handleCustomNewOrder = (e) => {
      if (e?.detail) {
        const newOrd = e.detail;
        const newId = newOrd.orderId || newOrd.id;
        setOrders(prev => {
          const exists = prev.some(o => (o.orderId || o.id) === newId);
          if (exists) return prev.map(o => (o.orderId || o.id) === newId ? { ...o, ...newOrd } : o);
          return [newOrd, ...prev];
        });
      }
    };

    window.addEventListener('umami_catalog_updated', handleLocalCatalogSync);
    window.addEventListener('storage', handleLocalCatalogSync);
    window.addEventListener('umami_new_order', handleCustomNewOrder);

    return () => {
      localSocket.off('connect', onConnect);
      localSocket.off('disconnect', onDisconnect);
      localSocket.off('initial-orders', onInitialOrders);
      localSocket.off('new-kitchen-order', onNewOrder);
      localSocket.off('new-order', onNewOrder);
      localSocket.off('order-status-updated', onStatusUpdated);
      localSocket.off('initial-menu', onMenuUpdated);
      localSocket.off('menu-updated', onMenuUpdated);
      localSocket.off('initial-drinks', onDrinksUpdated);
      localSocket.off('drinks-updated', onDrinksUpdated);
      localSocket.off('initial-promos', onPromosUpdated);
      localSocket.off('promos-updated', onPromosUpdated);
      window.removeEventListener('umami_catalog_updated', handleLocalCatalogSync);
      window.removeEventListener('storage', handleLocalCatalogSync);
      window.removeEventListener('umami_new_order', handleCustomNewOrder);
      if (didCreate) {
        localSocket.disconnect();
      }
    };
  }, [socket]);

  const showNotify = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Dedicated Image Uploader to Server API with Base64 Fallback
  const handleUploadImageFile = async (file, onSuccess) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showNotify('Image file size too large (max 10MB)', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      // Immediately set preview for instantaneous UI feedback
      onSuccess(dataUrl);
      try {
        const res = await fetch('/api/upload-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: dataUrl, filename: file.name })
        });
        const json = await res.json();
        if (json.success && json.url) {
          onSuccess(json.url);
          showNotify(`"${file.name}" uploaded and saved!`, 'success');
        }
      } catch (err) {
        console.warn('Fallback: image kept in memory/dataUrl:', err);
        showNotify(`Image attached from device!`);
      }
    };
    reader.readAsDataURL(file);
  };

  const addAuditLog = (action, details) => {
    const newLog = {
      id: `LOG-${Date.now().toString().slice(-4)}`,
      user: 'Chief Admin (admin@umamicraft.com)',
      action,
      details,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // Image verification check
  const verifyImageMatch = (name, imgUrl) => {
    if (!imgUrl || imgUrl.trim() === '') {
      return { valid: false, reason: 'Please upload or specify an image for this item.' };
    }
    return { valid: true, reason: 'Image verified and ready.' };
  };

  // Category CRUD Handlers
  const handleSaveCategory = (e) => {
    if (e) e.preventDefault();
    const trimmedName = formCategory.name.trim();
    if (!trimmedName) {
      showNotify('Category name is required!', 'error');
      return;
    }

    if (editingCategory) {
      const oldName = editingCategory.name;
      setCategories(prev => prev.map(c => c.id === editingCategory.id ? { ...c, name: trimmedName, icon: formCategory.icon || '🍽️' } : c));
      
      // Keep existing menu items in sync with renamed category
      if (oldName !== trimmedName) {
        setMenuItems(prev => prev.map(item => item.category === oldName ? { ...item, category: trimmedName } : item));
        if (formProduct.category === oldName) {
          setFormProduct(prev => ({ ...prev, category: trimmedName }));
        }
      }
      addAuditLog('Category Renamed', `Renamed category "${oldName}" to "${trimmedName}"`);
      showNotify(`Category renamed to "${trimmedName}" successfully!`);
    } else {
      if (categories.some(c => c.name.toLowerCase() === trimmedName.toLowerCase())) {
        showNotify(`Category "${trimmedName}" already exists!`, 'error');
        return;
      }
      const newCat = {
        id: `cat-${Date.now()}`,
        name: trimmedName,
        icon: formCategory.icon || '🍽️',
        active: true
      };
      setCategories(prev => [...prev, newCat]);
      addAuditLog('Category Created', `Added new category "${trimmedName}"`);
      showNotify(`Category "${trimmedName}" created successfully!`);
    }

    setShowCategoryModal(false);
    setEditingCategory(null);
    setFormCategory({ name: '', icon: '🍽️' });
  };

  const handleToggleArchiveCategory = (cat) => {
    const nextActive = !cat.active;
    setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, active: nextActive } : c));
    addAuditLog('Category Status Changed', `Category "${cat.name}" marked as ${nextActive ? 'Active' : 'Archived'}`);
    showNotify(`Category "${cat.name}" ${nextActive ? 'restored' : 'archived'}!`, nextActive ? 'success' : 'warning');
  };

  // Save product CRUD
  const handleSaveProduct = (e) => {
    e.preventDefault();
    const imgCheck = verifyImageMatch(formProduct.name, formProduct.image);
    if (!imgCheck.valid) {
      showNotify(imgCheck.reason, 'error');
      return;
    }

    if (editingItem) {
      // Update existing item
      const updatedItem = {
        ...editingItem,
        ...formProduct,
        id: editingItem.id,
        image: formProduct.image || editingItem.image,
        status: formProduct.available ? 'Available' : 'Unavailable'
      };
      const updatedList = menuItems.map(item => String(item.id) === String(editingItem.id) ? updatedItem : item);
      setMenuItems(updatedList);
      try {
        localStorage.setItem('umami_admin_menu', JSON.stringify(updatedList));
      } catch (e) {
        console.warn('localStorage quota note:', e);
      }
      fetch(`/api/menu/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedItem)
      }).catch(err => console.warn('Failed to sync product update to API:', err));
      window.dispatchEvent(new CustomEvent('umami_catalog_updated'));
      addAuditLog('Product Updated', `Updated menu product #${editingItem.id} "${formProduct.name}"`);
      showNotify(`Product "${formProduct.name}" updated successfully!`);
    } else {
      // Add new item
      const newId = `PRD-${Date.now().toString().slice(-4)}`;
      const newItem = { ...formProduct, id: newId, status: formProduct.available ? 'Available' : 'Unavailable' };
      const updatedList = [newItem, ...menuItems];
      setMenuItems(updatedList);
      try {
        localStorage.setItem('umami_admin_menu', JSON.stringify(updatedList));
      } catch (e) {
        console.warn('localStorage quota note:', e);
      }
      fetch('/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      }).catch(err => console.warn('Failed to sync new product to API:', err));
      window.dispatchEvent(new CustomEvent('umami_catalog_updated'));
      addAuditLog('Product Created', `Added new menu product #${newId} "${formProduct.name}"`);
      showNotify(`New product "${formProduct.name}" created and published live!`);
    }

    setShowItemModal(false);
    setPreviewItem(null);
    setEditingItem(null);
  };

  const handleDeleteProduct = (id, name) => {
    if (window.confirm(`Are you sure you want to archive and remove "${name}" from the system?`)) {
      const updated = menuItems.filter(item => item.id !== id);
      setMenuItems(updated);
      localStorage.setItem('umami_admin_menu', JSON.stringify(updated));
      fetch(`/api/menu/${id}`, { method: 'DELETE' }).catch(err => console.warn('Failed to sync archive to API:', err));
      window.dispatchEvent(new CustomEvent('umami_catalog_updated'));
      addAuditLog('Product Archived', `Archived product #${id} "${name}"`);
      showNotify(`Product "${name}" removed.`, 'warning');
    }
  };

  const handleToggleAvailability = (id, currentStatus) => {
    const next = !currentStatus;
    const updated = menuItems.map(item => {
      if (item.id === id) {
        addAuditLog('Availability Changed', `Product #${id} marked as ${next ? 'Available' : 'Unavailable'}`);
        return { ...item, available: next, status: next ? 'Available' : 'Unavailable' };
      }
      return item;
    });
    setMenuItems(updated);
    localStorage.setItem('umami_admin_menu', JSON.stringify(updated));
    fetch(`/api/menu/${id}/availability`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ available: next })
    }).catch(err => console.warn('Failed to sync availability to API:', err));
    window.dispatchEvent(new CustomEvent('umami_catalog_updated'));
    showNotify(`Product availability updated live.`);
  };

  // Synchronized status update (Admin <-> Kitchen <-> Customer)
  const handleOrderStatusUpdate = (orderId, newActionOrStatus) => {
    setUpdatingOrderId(orderId);
    let targetStatus = newActionOrStatus;
    let newNextStatus = newActionOrStatus;
    let newStripe = '#3b82f6';

    if (newActionOrStatus === 'Confirm Order' || newActionOrStatus === 'New') {
      targetStatus = 'New';
      newNextStatus = 'Start Preparing';
      newStripe = '#2563eb';
    } else if (newActionOrStatus === 'Start Preparing' || newActionOrStatus === 'Preparing') {
      targetStatus = 'Preparing';
      newNextStatus = 'Ready for Pickup';
      newStripe = '#b45309';
    } else if (newActionOrStatus === 'Start Cooking' || newActionOrStatus === 'Move to Cooking' || newActionOrStatus === 'Cooking' || newActionOrStatus === 'Mark as Ready' || newActionOrStatus === 'Ready for Pickup' || newActionOrStatus === 'Ready') {
      targetStatus = 'Ready for Pickup';
      newNextStatus = 'Complete Order';
      newStripe = '#15803d';
    } else if (newActionOrStatus === 'Complete Order' || newActionOrStatus === 'Mark as Completed' || newActionOrStatus === 'Completed') {
      targetStatus = 'Completed';
      newNextStatus = 'Completed';
      newStripe = '#059669';
    } else if (newActionOrStatus === 'Cancel Order' || newActionOrStatus === 'Cancelled') {
      targetStatus = 'Cancelled';
      newNextStatus = 'Cancelled';
      newStripe = '#ef4444';
    }

    setOrders(prev => prev.map(ord => {
      if ((ord.id || ord.orderId) === orderId) {
        const history = Array.isArray(ord.statusHistory) ? [...ord.statusHistory] : [];
        history.push({
          status: targetStatus,
          timestamp: new Date().toISOString(),
          updatedBy: 'Admin (Orders Dashboard)',
          note: `Status advanced to ${targetStatus}`
        });
        return {
          ...ord,
          status: targetStatus,
          nextStatus: newNextStatus,
          stripeColor: newStripe,
          updatedAt: new Date().toISOString(),
          statusHistory: history
        };
      }
      return ord;
    }));

    // Broadcast through socket to kitchen module
    if (activeSocketRef.current) {
      activeSocketRef.current.emit('update-order-status', {
        orderId,
        status: targetStatus,
        updatedBy: 'Admin (Orders Dashboard)'
      });
    }

    // Persist via REST API fallback
    fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: targetStatus, updatedBy: 'Admin (Orders Dashboard)' })
    }).catch(err => console.error("Error updating order status via API:", err));

    // Sync to localStorage for instant cross-tab & local customer gadget buzzer and vibration
    try {
      const stored = JSON.parse(localStorage.getItem('umami_orders') || '[]');
      const updatedList = stored.map(o => ((o.orderId || o.id) === orderId ? { ...o, status: targetStatus, updatedAt: new Date().toISOString() } : o));
      localStorage.setItem('umami_orders', JSON.stringify(updatedList));

      const active = JSON.parse(localStorage.getItem('synapse_active_order') || 'null');
      if (active && ((active.orderId || active.id) === orderId || !active.orderId)) {
        const isReady = targetStatus === 'Ready for Pickup' || targetStatus === 'Ready';
        const updatedActive = { ...active, status: targetStatus, isBuzzing: isReady, updatedAt: new Date().toISOString() };
        localStorage.setItem('synapse_active_order', JSON.stringify(updatedActive));
      }

      if (targetStatus === 'Ready for Pickup' || targetStatus === 'Ready') {
        localStorage.setItem('synapse_gadget_buzz', JSON.stringify({ orderId, timestamp: Date.now() }));
        window.dispatchEvent(new CustomEvent('synapse_buzzer_alert', { detail: { orderId } }));
      }
    } catch (e) {}

    addAuditLog('Order Status Changed', `Order #${orderId} status changed to ${targetStatus}`);
    showNotify(`Order #${orderId} updated to ${targetStatus}`);
    setTimeout(() => {
      setUpdatingOrderId(null);
    }, 300);
  };

  const handleAdminStatusCorrection = (orderId, currentStatus) => {
    const validStatuses = ['New', 'Preparing', 'Ready for Pickup', 'Completed', 'Cancelled'];
    const chosen = window.prompt(
      `[ADMIN OVERRIDE] Manual Status Correction for Order #${orderId}\nCurrent Status: ${currentStatus}\n\nEnter target status exactly:\nNew, Preparing, Ready for Pickup, Completed, Cancelled`,
      currentStatus
    );
    if (!chosen) return;
    const trimmed = chosen.trim();
    if (!validStatuses.includes(trimmed)) {
      alert(`Invalid status "${trimmed}". Must be one of: ${validStatuses.join(', ')}`);
      return;
    }
    handleOrderStatusUpdate(orderId, trimmed);
  };

  const handleCancelOrder = (orderId) => {
    if (window.confirm(`Are you sure you want to cancel order #${orderId}?`)) {
      setOrders(prev => prev.map(ord => (ord.id || ord.orderId) === orderId ? { ...ord, status: 'Cancelled', nextStatus: 'Cancelled', stripeColor: '#ef4444', updatedAt: new Date().toISOString() } : ord));
      
      if (activeSocketRef.current) {
        activeSocketRef.current.emit('update-order-status', {
          orderId,
          status: 'Cancelled',
          updatedBy: 'Admin (Orders Dashboard)',
          note: 'Cancelled by administrator'
        });
      }

      fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Cancelled by administrator', cancelledBy: 'Chief Administrator' })
      }).catch(err => console.error("Error cancelling order via API:", err));

      addAuditLog('Order Cancelled', `Order #${orderId} was cancelled by administrator.`);
      showNotify(`Order #${orderId} has been cancelled.`, 'warning');
    }
  };

  const handleExportOrders = () => {
    const csvRows = [
      ['Order ID', 'Customer', 'Type', 'Location', 'Time', 'Items', 'Payment', 'Total (PHP)', 'Status', 'Notes'],
      ...orders.map(o => [
        o.id,
        `"${o.customer || ''}"`,
        o.orderType || '',
        o.location || '',
        `"${o.time || ''} (${o.timeAgo || ''})"`,
        `"${(o.items || []).map(i => `${i.qty}x ${i.name}`).join('; ')}"`,
        o.payment || '',
        (o.total || 0).toFixed(2),
        o.status || '',
        `"${o.note || ''}"`
      ])
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(r => r.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `umami_orders_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotify('Orders exported to CSV successfully!');
  };

  const handlePrintOrder = (ord) => {
    setPrintingOrder(ord);
  };

  // Combo Handlers
  const handleSaveCombo = (e) => {
    if (e) e.preventDefault();
    const trimmedName = formCombo.name.trim();
    if (!trimmedName) {
      showNotify('Combo name is required!', 'error');
      return;
    }
    const origPrice = Number(formCombo.originalPrice) || 0;
    const pPrice = Number(formCombo.promoPrice) || origPrice;

    if (editingCombo) {
      setCombos(prev => prev.map(c => c.id === editingCombo.id ? {
        ...c,
        ...formCombo,
        name: trimmedName,
        originalPrice: origPrice,
        promoPrice: pPrice
      } : c));
      addAuditLog('Combo Updated', `Updated combo "${trimmedName}"`);
      showNotify(`Combo "${trimmedName}" updated successfully!`);
    } else {
      const newCombo = {
        ...formCombo,
        id: `CMB-${Date.now().toString().slice(-4)}`,
        name: trimmedName,
        originalPrice: origPrice,
        promoPrice: pPrice
      };
      setCombos(prev => [newCombo, ...prev]);
      addAuditLog('Combo Created', `Created new combo "${trimmedName}"`);
      showNotify(`New combo "${trimmedName}" published live!`);
    }
    setShowComboModal(false);
    setEditingCombo(null);
  };

  const handleDuplicateCombo = (combo) => {
    const dup = {
      ...combo,
      id: `CMB-${Date.now().toString().slice(-4)}`,
      name: `${combo.name} (Copy)`
    };
    setCombos(prev => [...prev, dup]);
    addAuditLog('Combo Duplicated', `Duplicated combo "${combo.name}"`);
    showNotify(`Duplicated "${combo.name}" successfully!`);
  };

  const handleArchiveCombo = (id, name) => {
    setCombos(prev => prev.map(c => {
      if (c.id === id) {
        const nextStatus = c.status === 'expired' ? 'active' : 'expired';
        return { ...c, status: nextStatus };
      }
      return c;
    }));
    addAuditLog('Combo Status Changed', `Toggled status for "${name}"`);
    showNotify(`Status updated for "${name}"`, 'warning');
  };

  const handleEditCombo = (combo) => {
    setEditingCombo(combo);
    setFormCombo({ ...combo });
    setShowComboModal(true);
  };

  const handleViewCombo = (combo) => {
    setPreviewCombo(combo);
  };

  // Filtered combos
  const filteredCombos = combos.filter(c => {
    const q = comboSearch.toLowerCase();
    const matchesSearch = !q ||
      c.name.toLowerCase().includes(q) ||
      (c.main && c.main.toLowerCase().includes(q)) ||
      (c.side && c.side.toLowerCase().includes(q)) ||
      (c.drink && c.drink.toLowerCase().includes(q));
    const matchesStatus = comboStatusFilter === 'All' || c.status.toLowerCase() === comboStatusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    if (comboSortBy === 'price-asc') return a.promoPrice - b.promoPrice;
    if (comboSortBy === 'price-desc') return b.promoPrice - a.promoPrice;
    return 0;
  });

  // Mix & Match Handlers
  const handleSaveMixMatch = (e) => {
    if (e) e.preventDefault();
    const trimmedName = formMixMatch.name.trim();
    if (!trimmedName) {
      showNotify('Bundle name is required!', 'error');
      return;
    }
    const bundlePrice = Number(formMixMatch.price) || 349;
    if (editingMixMatch) {
      setMixMatchRules(prev => prev.map(r => r.id === editingMixMatch.id ? {
        ...r,
        name: trimmedName,
        subtitle: formMixMatch.subtitle || r.subtitle || 'Craft your perfect meal with our signature favorites!',
        price: bundlePrice,
        status: formMixMatch.status || 'active',
        dateRange: formMixMatch.dateRange || 'Jan 1, 2024 – Dec 31, 2024',
        mainOptions: Array.isArray(formMixMatch.selectedMain) ? formMixMatch.selectedMain.map(m => typeof m === 'string' ? { name: m, price: 220, image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80' } : m) : r.mainOptions,
        sideOptions: Array.isArray(formMixMatch.selectedSide) ? formMixMatch.selectedSide.map(s => typeof s === 'string' ? { name: s, price: 90, image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=600&q=80' } : s) : r.sideOptions,
        drinkOptions: Array.isArray(formMixMatch.selectedDrinks) ? formMixMatch.selectedDrinks.map(d => typeof d === 'string' ? { name: d, price: 120, image: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80' } : d) : r.drinkOptions,
      } : r));
      addAuditLog('Mix & Match Updated', `Updated bundle "${trimmedName}"`);
      showNotify(`Bundle "${trimmedName}" updated successfully!`);
    } else {
      const newBundle = {
        id: `MM-${Date.now().toString().slice(-4)}`,
        name: trimmedName,
        subtitle: formMixMatch.subtitle || 'Craft your perfect meal with our signature favorites!',
        price: bundlePrice,
        status: formMixMatch.status || 'active',
        dateRange: formMixMatch.dateRange || 'Jan 1, 2024 – Dec 31, 2024',
        mainOptions: formMixMatch.selectedMain && formMixMatch.selectedMain.length > 0
          ? formMixMatch.selectedMain.map(m => typeof m === 'string' ? { name: m, price: 220, image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80' } : m)
          : [
              { name: 'Chicken Teriyaki Rice Bowl', price: 220, image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80' },
              { name: 'Spicy Ramen Bowl', price: 240, image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80' }
            ],
        sideOptions: formMixMatch.selectedSide && formMixMatch.selectedSide.length > 0
          ? formMixMatch.selectedSide.map(s => typeof s === 'string' ? { name: s, price: 90, image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=600&q=80' } : s)
          : [
              { name: 'Pork & Chive Gyoza', price: 90, image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=600&q=80' },
              { name: 'Crispy Chicken Wings', price: 120, image: 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=600&q=80' }
            ],
        drinkOptions: formMixMatch.selectedDrinks && formMixMatch.selectedDrinks.length > 0
          ? formMixMatch.selectedDrinks.map(d => typeof d === 'string' ? { name: d, price: 120, image: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80' } : d)
          : [
              { name: 'Matcha Boba Milk Tea', price: 120, image: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80' },
              { name: 'Iced Taro Milk Tea', price: 110, image: 'https://images.unsplash.com/photo-1556881286-fc6915169721?auto=format&fit=crop&w=600&q=80' }
            ]
      };
      setMixMatchRules(prev => [newBundle, ...prev]);
      addAuditLog('Mix & Match Created', `Created bundle "${trimmedName}"`);
      showNotify(`New bundle "${trimmedName}" published live!`);
    }
    setShowMixMatchModal(false);
    setEditingMixMatch(null);
  };

  const handleDuplicateMixMatch = (bundle) => {
    const dup = {
      ...bundle,
      id: `MM-${Date.now().toString().slice(-4)}`,
      name: `${bundle.name} (Copy)`
    };
    setMixMatchRules(prev => [...prev, dup]);
    addAuditLog('Mix & Match Duplicated', `Duplicated "${bundle.name}"`);
    showNotify(`Duplicated "${bundle.name}" successfully!`);
  };

  const handleToggleDisableMixMatch = (id, name) => {
    setMixMatchRules(prev => prev.map(r => {
      if (r.id === id) {
        const nextStatus = r.status === 'disabled' ? 'active' : 'disabled';
        return { ...r, status: nextStatus };
      }
      return r;
    }));
    addAuditLog('Mix & Match Status Changed', `Toggled status for "${name}"`);
    showNotify(`Status updated for "${name}"`, 'warning');
  };

  const handleDeleteMixMatch = (id, name) => {
    if (window.confirm(`Are you sure you want to delete bundle "${name}"?`)) {
      setMixMatchRules(prev => prev.filter(r => r.id !== id));
      addAuditLog('Mix & Match Deleted', `Deleted bundle "${name}"`);
      showNotify(`Bundle "${name}" deleted.`, 'warning');
    }
  };

  const handleEditMixMatch = (bundle) => {
    setEditingMixMatch(bundle);
    setFormMixMatch({
      name: bundle.name,
      subtitle: bundle.subtitle || '',
      price: bundle.price,
      status: bundle.status || 'active',
      dateRange: bundle.dateRange || 'Jan 1, 2024 – Dec 31, 2024',
      selectedMain: (bundle.mainOptions || []).map(m => typeof m === 'string' ? m : m.name),
      selectedSide: (bundle.sideOptions || []).map(s => typeof s === 'string' ? s : s.name),
      selectedDrinks: (bundle.drinkOptions || []).map(d => typeof d === 'string' ? d : d.name)
    });
    setShowMixMatchModal(true);
  };

  // Filtered Mix & Match rules
  const filteredMixMatchRules = mixMatchRules.filter(r => {
    const q = mixMatchSearch.toLowerCase();
    const matchesSearch = !q || r.name.toLowerCase().includes(q) || (r.subtitle && r.subtitle.toLowerCase().includes(q));
    const matchesStatus = mixMatchStatusFilter === 'All' || r.status?.toLowerCase() === mixMatchStatusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    if (mixMatchSortBy === 'price-asc') return a.price - b.price;
    if (mixMatchSortBy === 'price-desc') return b.price - a.price;
    return 0;
  });

  const totalBundleOptionsCount = mixMatchRules.reduce((acc, r) => {
    return acc + (r.mainOptions?.length || 0) + (r.sideOptions?.length || 0) + (r.drinkOptions?.length || 0);
  }, 0);

  const avgBundlePrice = mixMatchRules.length > 0
    ? Math.round(mixMatchRules.reduce((acc, r) => acc + (r.price || 0), 0) / mixMatchRules.length)
    : 329;

  // Promo Handlers
  const handleDuplicatePromo = async (promo) => {
    const dup = {
      ...promo,
      id: `PR-${Date.now().toString().slice(-4)}`,
      name: `${promo.name} (Copy)`,
      code: `${promo.code || 'PROMO'}_COPY`,
      currentRedemptions: 0,
      createdAt: Date.now()
    };
    setPromos(prev => [...prev, dup]);
    try {
      await fetch('/api/promos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dup)
      });
    } catch (_) {}
    addAuditLog('Promo Duplicated', `Duplicated "${promo.name}"`);
    showNotify(`Duplicated "${promo.name}" successfully!`);
  };

  const handleToggleStatusPromo = async (id, name, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'draft' : 'active';
    setPromos(prev => prev.map(p => p.id === id ? { ...p, status: nextStatus } : p));
    try {
      await fetch(`/api/promos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
    } catch (_) {}
    addAuditLog('Promo Status Changed', `Changed status of "${name}" to ${nextStatus}`);
    showNotify(`Campaign "${name}" is now ${nextStatus === 'active' ? 'Active' : 'Paused/Draft'}`);
  };

  const handleArchivePromo = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete promotion "${name}"?`)) {
      setPromos(prev => prev.filter(p => p.id !== id));
      try {
        await fetch(`/api/promos/${id}`, { method: 'DELETE' });
      } catch (_) {}
      addAuditLog('Promo Deleted', `Deleted promotion "${name}"`);
      showNotify(`Promotion "${name}" deleted.`, 'warning');
    }
  };

  const handleEditPromo = (promo) => {
    setEditingPromo(promo);
    setFormPromo({
      name: promo.name,
      code: promo.code || '',
      discountType: promo.discountType || 'percent',
      discountValue: promo.discountValue || 15,
      applicableItems: promo.applicableItems || [],
      applyToAll: !!promo.applyToAll,
      dateRange: promo.dateRange || 'Jan 1, 2025 – Dec 31, 2026',
      expiresAt: promo.expiresAt ? new Date(promo.expiresAt).toISOString().slice(0, 16) : '2026-12-31T23:59',
      associatedItem: promo.associatedItem || (promo.applyToAll ? 'All Menu Items' : promo.applicableItems?.join(', ') || 'All Menu Items'),
      associatedTable: promo.associatedTable || 'All Tables (Storewide)',
      maxRedemptions: promo.maxRedemptions || 500,
      status: promo.status || 'active',
      type: promo.type || 'discount',
      bannerImage: promo.bannerImage || '/ramen_promo_banner.png',
      bannerTitle: promo.bannerTitle || promo.name,
      bannerHighlight: promo.bannerHighlight || (promo.discountType === 'percent' ? `${promo.discountValue}% OFF` : `₱${promo.discountValue} OFF`),
      bannerSubtitle: promo.bannerSubtitle || ''
    });
    setShowPromoModal(true);
  };

  // Filtered promos (active list hides expired promos by default)
  const filteredPromos = promos.filter(p => {
    const q = promoSearch.toLowerCase();
    const matchesSearch = !q || p.name.toLowerCase().includes(q) || (p.code && p.code.toLowerCase().includes(q)) || (p.description && p.description.toLowerCase().includes(q));
    const isExpired = p.status === 'expired' || (p.expiresAt && new Date(p.expiresAt).getTime() <= Date.now());
    let matchesStatus = true;
    if (promoStatusFilter === 'All') {
      matchesStatus = !isExpired; // Active campaigns list strictly hides expired records
    } else if (promoStatusFilter.toLowerCase() === 'expired') {
      matchesStatus = isExpired;
    } else {
      matchesStatus = !isExpired && p.status?.toLowerCase() === promoStatusFilter.toLowerCase();
    }
    const matchesType = promoTypeFilter === 'All' || p.type?.toLowerCase() === promoTypeFilter.toLowerCase();
    return matchesSearch && matchesStatus && matchesType;
  }).sort((a, b) => {
    if (promoSortBy === 'redemptions-desc') return (b.currentRedemptions || 0) - (a.currentRedemptions || 0);
    if (promoSortBy === 'name-asc') return a.name.localeCompare(b.name);
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  // Filtered menu list
  const filteredMenuItems = (() => {
    let list = menuItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            String(item.id).toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCat = selectedCategoryFilter === 'All' || item.category === selectedCategoryFilter;
      const matchesStatus = selectedStatusFilter === 'All' ||
        (selectedStatusFilter === 'Available' && item.available) ||
        (selectedStatusFilter === 'Unavailable' && !item.available);
      return matchesSearch && matchesCat && matchesStatus;
    });
    // Sort
    if (menuSortBy === 'name-asc') list = [...list].sort((a,b) => a.name.localeCompare(b.name));
    if (menuSortBy === 'name-desc') list = [...list].sort((a,b) => b.name.localeCompare(a.name));
    if (menuSortBy === 'price-asc') list = [...list].sort((a,b) => a.price - b.price);
    if (menuSortBy === 'price-desc') list = [...list].sort((a,b) => b.price - a.price);
    return list;
  })();

  const menuTotalPages = Math.ceil(filteredMenuItems.length / MENU_PAGE_SIZE);
  const pagedMenuItems = filteredMenuItems.slice((menuPage - 1) * MENU_PAGE_SIZE, menuPage * MENU_PAGE_SIZE);

  // Category chip colors map
  const catChipColors = {
    'Appetizers':   { bg: '#fff0e6', color: '#c05a1f', border: '#f5c4a1' },
    'Noodles':      { bg: '#f0e8ff', color: '#6c2eb9', border: '#c9aaee' },
    'Rice Bowls':   { bg: '#e8f8ee', color: '#1a7a44', border: '#94d9b0' },
    'Desserts':     { bg: '#fce8f4', color: '#b01b6a', border: '#e9aad4' },
    'Drinks':       { bg: '#e8f2ff', color: '#1a5db0', border: '#99c0f0' },
    'Meals':        { bg: '#fff8e6', color: '#a05c00', border: '#f0d080' },
    'Burgers':      { bg: '#fff3e0', color: '#bf360c', border: '#ffcc80' },
    'Chicken':      { bg: '#fdf3e8', color: '#e65100', border: '#ffcc80' },
    'Snacks':       { bg: '#f3fde8', color: '#33691e', border: '#c5e1a5' },
    'Dumplings':    { bg: '#fef9e7', color: '#827717', border: '#f9e8a0' },
    'Add-ons':      { bg: '#f3e5f5', color: '#6a1b9a', border: '#ce93d8' },
  };

  // Calculate Live Metrics (Interconnected with Orders, Menu, Drinks & Inventory)
  const validRevenueOrders = useMemo(() => orders.filter(o => o.status !== 'Cancelled'), [orders]);
  const totalRevenue = useMemo(() => validRevenueOrders.reduce((acc, o) => acc + (Number(o.total ?? o.totalPrice ?? 0)), 0), [validRevenueOrders]);
  const totalOrdersCount = orders.length;
  const completedOrdersCount = useMemo(() => orders.filter(o => o.status === 'Completed').length, [orders]);
  const cancelledOrdersCount = useMemo(() => orders.filter(o => o.status === 'Cancelled').length, [orders]);
  const preparingOrdersCount = useMemo(() => orders.filter(o => ['Preparing', 'Cooking', 'In Progress'].includes(o.status)).length, [orders]);
  const pendingOrdersCount = useMemo(() => orders.filter(o => ['New', 'Confirmed', 'Pending', 'Order Received'].includes(o.status) || (o.status !== 'Completed' && o.status !== 'Cancelled' && !['Preparing', 'Cooking', 'In Progress'].includes(o.status))).length, [orders]);
  const totalActiveOrdersCount = useMemo(() => orders.filter(o => o.status !== 'Completed' && o.status !== 'Cancelled').length, [orders]);

  // Live Menu Availability
  const availableMenuItemsCount = useMemo(() => menuItems.filter(m => m.available !== false && (m.stock === undefined || Number(m.stock) > 0)).length, [menuItems]);
  const totalMenuItemsCount = menuItems.length;
  const unavailableMenuItemsCount = Math.max(0, totalMenuItemsCount - availableMenuItemsCount);

  // Live Unified Inventory Restock Alerts
  const lowStockItemsList = useMemo(() => allInventoryItems.filter(i => i.status === 'Low Stock'), [allInventoryItems]);
  const outOfStockItemsList = useMemo(() => allInventoryItems.filter(i => i.status === 'Out of Stock'), [allInventoryItems]);
  const restockAlertsCount = lowStockItemsList.length + outOfStockItemsList.length;
  const lowStockCount = restockAlertsCount;
  const outOfStockCount = outOfStockItemsList.length;

  // Last 7 days dynamic date labels
  const trendDays = useMemo(() => {
    const list = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      list.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    }
    return list;
  }, []);

  return (
    <div className="admin-root fade-in">
      {/* Toast Notification */}
      {notification && (
        <div className={`admin-toast admin-toast-${notification.type}`}>
          {notification.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Admin Top App Bar */}
      <header className="admin-app-bar">
        <div className="admin-brand-wrap">
          <div className="admin-logo-icon" style={{ background: '#C24522', borderRadius: '50%', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none' }}>
            <UtensilsCrossed size={20} color="#FFFFFF" />
          </div>
          <div>
            <h2 className="admin-app-title">UMAMI CRAFT FUSION • ADMIN PANEL</h2>
            <span className="admin-app-sub">Enterprise Management & Real-Time Sync System</span>
          </div>
        </div>

        <div className="admin-top-right">
          <div className="admin-sync-badge">
            <span
              className={`admin-pulse-dot ${internalSocketConnected ? 'active' : 'disconnected'}`}
              style={{
                background: internalSocketConnected ? '#10b981' : '#ef4444',
                boxShadow: internalSocketConnected ? '0 0 8px #10b981' : '0 0 8px #ef4444'
              }}
            />
            <span>{internalSocketConnected ? 'Database Live Sync' : 'Offline / Reconnecting'}</span>
          </div>

          <button type="button" className="admin-top-btn" onClick={onReturnToKiosk} title="Return to Kiosk Interface">
            <Tv size={15} />
            <span>Kiosk View</span>
          </button>

          <button
            type="button"
            className="admin-lock-btn"
            onClick={onOpenSecurity}
            title="Lock Admin Panel & Password Security"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#FAF5EE',
              color: '#C24522',
              border: '1px solid rgba(228, 87, 41, 0.35)',
              borderRadius: '10px',
              padding: '6px 14px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Lock size={14} />
            <span>Lock</span>
          </button>

          <button type="button" className="admin-logout-btn" onClick={onLogout} title="Log Out Administrator">
            <LogOut size={15} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Admin Layout: Sidebar + Content */}
      <div className="admin-body">
        {/* Sidebar Navigation */}
        <aside className="admin-sidebar">
          <div className="admin-sidebar-section-title">ADMINISTRATION SECTIONS</div>

          <nav className="admin-nav-list">
            <button className={`admin-nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
              <LayoutDashboard size={17} />
              <span>Dashboard Overview</span>
            </button>

            <button className={`admin-nav-item ${activeTab === 'menu' ? 'active' : ''}`} onClick={() => setActiveTab('menu')}>
              <UtensilsCrossed size={17} />
              <span>Menu Management</span>
            </button>

            <button className={`admin-nav-item ${activeTab === 'categories' ? 'active' : ''}`} onClick={() => setActiveTab('categories')}>
              <Layers size={17} />
              <span>Categories</span>
            </button>

            <button className={`admin-nav-item ${activeTab === 'preferences' ? 'active' : ''}`} onClick={() => setActiveTab('preferences')}>
              <Sliders size={17} />
              <span>Menu Preferences</span>
            </button>

            <button className={`admin-nav-item ${activeTab === 'drinks' ? 'active' : ''}`} onClick={() => setActiveTab('drinks')}>
              <Wine size={17} />
              <span>Drinks and Sizes</span>
            </button>

            <button className={`admin-nav-item ${activeTab === 'combos' ? 'active' : ''}`} onClick={() => setActiveTab('combos')}>
              <Gift size={17} />
              <span>Combos and Value Meals</span>
            </button>

            <button className={`admin-nav-item ${activeTab === 'mixmatch' ? 'active' : ''}`} onClick={() => setActiveTab('mixmatch')}>
              <Sparkles size={17} />
              <span>Mix & Match</span>
            </button>

            <button className={`admin-nav-item ${activeTab === 'promos' ? 'active' : ''}`} onClick={() => setActiveTab('promos')}>
              <Tag size={17} />
              <span>Promotions & Discounts</span>
            </button>

            <button className={`admin-nav-item ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
              <ShoppingBag size={17} />
              <span>Orders</span>
            </button>

            <button className={`admin-nav-item ${activeTab === 'kitchen' ? 'active' : ''}`} onClick={() => setActiveTab('kitchen')}>
              <ChefHat size={17} />
              <span>Kitchen Status</span>
            </button>

            <button className={`admin-nav-item ${activeTab === 'qrmenu' ? 'active' : ''}`} onClick={() => setActiveTab('qrmenu')}>
              <QrCode size={17} />
              <span>QR Menu Management</span>
            </button>

            <button className={`admin-nav-item ${activeTab === 'inventory' ? 'active' : ''}`} onClick={() => setActiveTab('inventory')}>
              <PackageCheck size={17} />
              <span>Inventory</span>
              {lowStockCount > 0 && <span className="admin-nav-badge admin-badge-warn">{lowStockCount}</span>}
            </button>

            <button className={`admin-nav-item ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
              <BarChart3 size={17} />
              <span>Sales and Analytics</span>
            </button>

            <button className={`admin-nav-item ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
              <Users size={17} />
              <span>User and Role Mgmt</span>
            </button>

            <button className={`admin-nav-item ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}>
              <History size={17} />
              <span>Activity Logs</span>
            </button>

            <button className={`admin-nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
              <Settings size={17} />
              <span>System Settings</span>
            </button>
          </nav>

          {/* Subtle footer watermark */}
          <div style={{ marginTop: 'auto', padding: '28px 20px 18px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', color: '#a39589', fontSize: '13px', lineHeight: '1.35' }}>
              Great Food<br />
              Brings People Together
            </div>
            <svg style={{ position: 'absolute', right: '-8px', bottom: '-8px', width: '80px', height: '80px', opacity: 0.16, pointerEvents: 'none' }} viewBox="0 0 100 100">
              <path d="M0,50 Q25,25 50,50 T100,50 M0,70 Q25,45 50,70 T100,70 M0,90 Q25,65 50,90 T100,90" fill="none" stroke="#8a7360" strokeWidth="3" />
            </svg>
          </div>
        </aside>

        {/* Workspace Main Area */}
        <main className="admin-content">
          {/* TAB 1: DASHBOARD OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="admin-tab-pane fade-in">
              <div className="admin-pane-header">
                <div>
                  <h1 className="admin-pane-title">Dashboard Overview</h1>
                  <p className="admin-pane-sub">Real-time performance, revenue statistics, and live inventory metrics.</p>
                </div>
                <div className="admin-date-pill">
                  <Calendar size={14} />
                  <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>

              {/* Top KPI Cards Grid */}
              <div className="admin-kpi-grid">
                {/* 1. Daily Revenue */}
                <div
                  className="admin-kpi-card-v2"
                  onClick={() => setActiveTab('analytics')}
                  style={{ cursor: 'pointer' }}
                  title="Click to view Sales and Analytics"
                >
                  <div className="admin-kpi-icon-box" style={{ background: '#e6f7ef' }}>
                    <BarChart2 size={22} color="#10b981" />
                  </div>
                  <div className="admin-kpi-main-v2">
                    <span className="admin-kpi-label-v2">Daily Revenue</span>
                    <div className="admin-kpi-val-v2">
                      ₱{totalRevenue.toLocaleString('en-US', { minimumFractionDigits: totalRevenue % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}
                    </div>
                    <span className="admin-kpi-trend-v2" style={{ color: totalRevenue > 0 ? '#10b981' : '#6b7280' }}>
                      {totalRevenue > 0 ? '↑ +14.2% from yesterday' : 'No sales recorded yet'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '34px', marginLeft: 'auto' }}>
                    <div style={{ width: '4px', height: totalRevenue > 0 ? '14px' : '6px', borderRadius: '2px', background: '#a7f3d0' }} />
                    <div style={{ width: '4px', height: totalRevenue > 0 ? '22px' : '8px', borderRadius: '2px', background: '#6ee7b7' }} />
                    <div style={{ width: '4px', height: totalRevenue > 0 ? '32px' : '12px', borderRadius: '2px', background: '#6ee7b7' }} />
                    <div style={{ width: '4px', height: totalRevenue > 0 ? '20px' : '8px', borderRadius: '2px', background: '#a7f3d0' }} />
                    <div style={{ width: '4px', height: totalRevenue > 0 ? '34px' : '14px', borderRadius: '2px', background: '#34d399' }} />
                  </div>
                </div>

                {/* 2. Total Orders Today */}
                <div
                  className="admin-kpi-card-v2"
                  onClick={() => setActiveTab('orders')}
                  style={{ cursor: 'pointer' }}
                  title="Click to view Orders management"
                >
                  <div className="admin-kpi-icon-box" style={{ background: '#ffede6' }}>
                    <ShoppingCart size={22} color="#e45729" />
                  </div>
                  <div className="admin-kpi-main-v2">
                    <span className="admin-kpi-label-v2">Total Orders Today</span>
                    <div className="admin-kpi-val-v2">{totalOrdersCount}</div>
                    <span className="admin-kpi-subtext-v2">
                      {totalActiveOrdersCount} Pending | {completedOrdersCount} Completed
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '34px', marginLeft: 'auto' }}>
                    <div style={{ width: '4px', height: totalOrdersCount > 0 ? '16px' : '6px', borderRadius: '2px', background: '#fed7aa' }} />
                    <div style={{ width: '4px', height: totalOrdersCount > 0 ? '28px' : '10px', borderRadius: '2px', background: '#fca5a5' }} />
                    <div style={{ width: '4px', height: totalOrdersCount > 0 ? '20px' : '8px', borderRadius: '2px', background: '#fed7aa' }} />
                    <div style={{ width: '4px', height: totalOrdersCount > 0 ? '34px' : '14px', borderRadius: '2px', background: '#fb923c' }} />
                    <div style={{ width: '4px', height: totalOrdersCount > 0 ? '30px' : '12px', borderRadius: '2px', background: '#f87171' }} />
                  </div>
                </div>

                {/* 3. Available Menu Items */}
                <div
                  className="admin-kpi-card-v2"
                  onClick={() => setActiveTab('menu')}
                  style={{ cursor: 'pointer' }}
                  title="Click to manage Menu Items"
                >
                  <div className="admin-kpi-icon-box" style={{ background: '#eff6ff' }}>
                    <UtensilsCrossed size={22} color="#3b82f6" />
                  </div>
                  <div className="admin-kpi-main-v2">
                    <span className="admin-kpi-label-v2">Available Menu Items</span>
                    <div className="admin-kpi-val-v2">{availableMenuItemsCount} / {totalMenuItemsCount}</div>
                    <span className="admin-kpi-subtext-v2" style={{ color: unavailableMenuItemsCount > 0 ? '#ef4444' : '#059669', fontWeight: '600' }}>
                      {unavailableMenuItemsCount > 0
                        ? `${unavailableMenuItemsCount} Item${unavailableMenuItemsCount > 1 ? 's' : ''} Currently Unavailable`
                        : 'All items currently available'}
                    </span>
                  </div>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 'auto', flexShrink: 0 }}>
                    <FileText size={18} color="#3b82f6" />
                  </div>
                </div>

                {/* 4. Low Stock Alerts */}
                <div
                  className="admin-kpi-card-v2"
                  onClick={() => {
                    setActiveTab('inventory');
                    if (restockAlertsCount > 0) {
                      setInventoryStatusFilter(lowStockItemsList.length > 0 ? 'Low Stock' : 'Out of Stock');
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                  title="Click to view Inventory and restock items"
                >
                  <div className="admin-kpi-icon-box" style={{ background: restockAlertsCount > 0 ? '#fffbeb' : '#e6f7ef' }}>
                    <AlertTriangle size={22} color={restockAlertsCount > 0 ? '#f59e0b' : '#10b981'} />
                  </div>
                  <div className="admin-kpi-main-v2">
                    <span className="admin-kpi-label-v2">Low Stock Alerts</span>
                    <div className="admin-kpi-val-v2">{restockAlertsCount}</div>
                    <span
                      className="admin-kpi-subtext-v2"
                      style={{
                        color: restockAlertsCount > 0 ? '#ef4444' : '#059669',
                        fontWeight: '700'
                      }}
                    >
                      {restockAlertsCount > 0 ? `${restockAlertsCount} Requires Restocking` : '✓ All Stocks Sufficient'}
                    </span>
                  </div>
                  <ChevronRight size={20} color="#9ca3af" style={{ marginLeft: 'auto', flexShrink: 0 }} />
                </div>
              </div>

              {/* Middle Row: Revenue Trend & Order Status Today Charts */}
              <div className="admin-charts-grid-v2">
                {/* 1. Revenue Trend (Last 7 Days) */}
                <div className="admin-chart-card-v2">
                  <div className="admin-card-header-v2">
                    <h3 className="admin-card-title-v2">
                      <BarChart2 size={18} color="#e45729" />
                      <span>Revenue Trend (Last 7 Days)</span>
                    </h3>
                    <button type="button" className="admin-card-filter-select">
                      Last 7 Days ▾
                    </button>
                  </div>

                  {/* Responsive Line & Area SVG Chart */}
                  <div style={{ width: '100%', height: '175px', position: 'relative' }}>
                    <svg viewBox="0 0 540 170" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                      <defs>
                        <linearGradient id="revTrendGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#e45729" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#e45729" stopOpacity="0.01" />
                        </linearGradient>
                      </defs>

                      {/* Horizontal dashed guide grid lines */}
                      <line x1="55" y1="20" x2="525" y2="20" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                      <line x1="55" y1="65" x2="525" y2="65" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                      <line x1="55" y1="110" x2="525" y2="110" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                      <line x1="55" y1="150" x2="525" y2="150" stroke="#e2e8f0" strokeWidth="1" />

                      {/* Y-axis labels */}
                      <text x="45" y="24" textAnchor="end" fill="#9ca3af" fontSize="11" fontWeight="500">₱3,000</text>
                      <text x="45" y="69" textAnchor="end" fill="#9ca3af" fontSize="11" fontWeight="500">₱2,000</text>
                      <text x="45" y="114" textAnchor="end" fill="#9ca3af" fontSize="11" fontWeight="500">₱1,000</text>
                      <text x="45" y="154" textAnchor="end" fill="#9ca3af" fontSize="11" fontWeight="500">₱0</text>

                      {/* Area Fill */}
                      <path
                        d="M 65,124 L 140,106 L 216,92 L 292,80 L 368,62 L 444,74 L 518,36 L 518,150 L 65,150 Z"
                        fill="url(#revTrendGrad)"
                      />

                      {/* Trend Line */}
                      <polyline
                        points="65,124 140,106 216,92 292,80 368,62 444,74 518,36"
                        fill="none"
                        stroke="#e45729"
                        strokeWidth="2.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Dots on line nodes */}
                      {[
                        { x: 65, y: 124, date: trendDays[0] || 'Day 1' },
                        { x: 140, y: 106, date: trendDays[1] || 'Day 2' },
                        { x: 216, y: 92, date: trendDays[2] || 'Day 3' },
                        { x: 292, y: 80, date: trendDays[3] || 'Day 4' },
                        { x: 368, y: 62, date: trendDays[4] || 'Day 5' },
                        { x: 444, y: 74, date: trendDays[5] || 'Day 6' },
                        { x: 518, y: 36, date: trendDays[6] || 'Today' }
                      ].map((pt, idx) => (
                        <g key={idx}>
                          <circle cx={pt.x} cy={pt.y} r="4.5" fill="#e45729" stroke="#ffffff" strokeWidth="2" />
                          <text x={pt.x} y="167" textAnchor="middle" fill="#9ca3af" fontSize="11" fontWeight="500">
                            {pt.date}
                          </text>
                        </g>
                      ))}
                    </svg>
                  </div>
                </div>

                {/* 2. Order Status Today */}
                <div className="admin-chart-card-v2">
                  <div className="admin-card-header-v2">
                    <h3 className="admin-card-title-v2">
                      <Clock size={18} color="#e45729" />
                      <span>Order Status Today</span>
                    </h3>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', height: '175px', padding: '0 8px' }}>
                    {/* SVG Donut */}
                    <div style={{ position: 'relative', width: '145px', height: '145px', flexShrink: 0 }}>
                      <svg viewBox="0 0 160 160" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                        {/* Background track circle */}
                        <circle cx="80" cy="80" r="52" fill="none" stroke="#f1f5f9" strokeWidth="18" />

                        {(() => {
                          const circumference = 326.73;
                          const safeTotal = Math.max(totalOrdersCount, 1);
                          const compDash = (completedOrdersCount / safeTotal) * circumference;
                          const prepDash = (preparingOrdersCount / safeTotal) * circumference;
                          const pendDash = (pendingOrdersCount / safeTotal) * circumference;
                          const cancDash = (cancelledOrdersCount / safeTotal) * circumference;

                          return (
                            <>
                              {compDash > 0 && (
                                <circle
                                  cx="80" cy="80" r="52" fill="none"
                                  stroke="#10b981" strokeWidth="18"
                                  strokeDasharray={`${compDash} ${circumference}`}
                                  strokeDashoffset="0"
                                />
                              )}
                              {prepDash > 0 && (
                                <circle
                                  cx="80" cy="80" r="52" fill="none"
                                  stroke="#3b82f6" strokeWidth="18"
                                  strokeDasharray={`${prepDash} ${circumference}`}
                                  strokeDashoffset={`-${compDash}`}
                                />
                              )}
                              {pendDash > 0 && (
                                <circle
                                  cx="80" cy="80" r="52" fill="none"
                                  stroke="#f59e0b" strokeWidth="18"
                                  strokeDasharray={`${pendDash} ${circumference}`}
                                  strokeDashoffset={`-${compDash + prepDash}`}
                                />
                              )}
                              {cancDash > 0 && (
                                <circle
                                  cx="80" cy="80" r="52" fill="none"
                                  stroke="#ef4444" strokeWidth="18"
                                  strokeDasharray={`${cancDash} ${circumference}`}
                                  strokeDashoffset={`-${compDash + prepDash + pendDash}`}
                                />
                              )}
                            </>
                          );
                        })()}
                      </svg>

                      {/* Center hole text */}
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '24px', fontWeight: '800', color: '#111827', lineHeight: 1 }}>{totalOrdersCount}</span>
                        <span style={{ fontSize: '11.5px', color: '#6b7280', fontWeight: '500', marginTop: '2px' }}>Orders</span>
                      </div>
                    </div>

                    {/* Breakdown List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, minWidth: '150px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12.5px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                          <span style={{ color: '#374151', fontWeight: '500' }}>Completed</span>
                        </div>
                        <div style={{ display: 'flex', gap: '14px' }}>
                          <strong style={{ color: '#111827', width: '22px', textAlign: 'right' }}>{completedOrdersCount}</strong>
                          <span style={{ color: '#6b7280', width: '46px', textAlign: 'right' }}>
                            {totalOrdersCount > 0 ? ((completedOrdersCount / totalOrdersCount) * 100).toFixed(1) : '0.0'}%
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12.5px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                          <span style={{ color: '#374151', fontWeight: '500' }}>Pending</span>
                        </div>
                        <div style={{ display: 'flex', gap: '14px' }}>
                          <strong style={{ color: '#111827', width: '22px', textAlign: 'right' }}>{pendingOrdersCount}</strong>
                          <span style={{ color: '#6b7280', width: '46px', textAlign: 'right' }}>
                            {totalOrdersCount > 0 ? ((pendingOrdersCount / totalOrdersCount) * 100).toFixed(1) : '0.0'}%
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12.5px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />
                          <span style={{ color: '#374151', fontWeight: '500' }}>Preparing</span>
                        </div>
                        <div style={{ display: 'flex', gap: '14px' }}>
                          <strong style={{ color: '#111827', width: '22px', textAlign: 'right' }}>{preparingOrdersCount}</strong>
                          <span style={{ color: '#6b7280', width: '46px', textAlign: 'right' }}>
                            {totalOrdersCount > 0 ? ((preparingOrdersCount / totalOrdersCount) * 100).toFixed(1) : '0.0'}%
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12.5px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                          <span style={{ color: '#374151', fontWeight: '500' }}>Cancelled</span>
                        </div>
                        <div style={{ display: 'flex', gap: '14px' }}>
                          <strong style={{ color: '#111827', width: '22px', textAlign: 'right' }}>{cancelledOrdersCount}</strong>
                          <span style={{ color: '#6b7280', width: '46px', textAlign: 'right' }}>
                            {totalOrdersCount > 0 ? ((cancelledOrdersCount / totalOrdersCount) * 100).toFixed(1) : '0.0'}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Row: Best Selling Products & Recent Activity Audit Trail */}
              <div className="admin-dual-grid" style={{ marginTop: '20px' }}>
                {/* 1. Best Selling Products */}
                <div className="admin-panel-card" style={{ padding: '20px' }}>
                  <div className="admin-card-header-v2">
                    <h3 className="admin-card-title-v2">
                      <Flame size={18} color="#e45729" />
                      <span>Best Selling Products</span>
                    </h3>
                    <button type="button" className="admin-view-all-btn" onClick={() => setActiveTab('menu')}>
                      View All
                    </button>
                  </div>

                  <div className="admin-bestsellers-list">
                    {[
                      { rank: '#1', name: 'Spicy Szechuan Dumplings', price: 380, sold: '85 sold', img: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=160&q=80' },
                      { rank: '#2', name: 'Smoked Truffle Edamame', price: 250, sold: '73 sold', img: 'https://images.unsplash.com/photo-1622205313162-be1d5712a43f?auto=format&fit=crop&w=160&q=80' },
                      { rank: '#3', name: 'Honey Glazed Peanut Noodles', price: 420, sold: '61 sold', img: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=160&q=80' },
                      { rank: '#4', name: 'Crispy Five-Spice Tofu Bites', price: 320, sold: '49 sold', img: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=160&q=80' },
                      { rank: '#5', name: 'Thai Coconut Curry Bowl', price: 490, sold: '37 sold', img: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?auto=format&fit=crop&w=160&q=80' },
                    ].map((item, idx) => (
                      <div key={idx} className="admin-bs-item" style={{ background: '#FAF5EE', borderRadius: '12px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '800', color: '#e45729', width: '22px' }}>{item.rank}</span>
                        <img
                          src={item.img}
                          alt={item.name}
                          style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
                          onError={(e) => {
                            e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=160&q=80';
                          }}
                        />
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: '#1f2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>
                          <span style={{ fontSize: '11.5px', color: '#6b7280' }}>₱{item.price}</span>
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#059669', background: '#e6f7ef', padding: '4px 10px', borderRadius: '999px', flexShrink: 0 }}>
                          {item.sold}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Recent Activity Audit Trail */}
                <div className="admin-panel-card" style={{ padding: '20px' }}>
                  <div className="admin-card-header-v2">
                    <h3 className="admin-card-title-v2">
                      <History size={18} color="#e45729" />
                      <span>Recent Activity Audit Trail</span>
                    </h3>
                    <button type="button" className="admin-view-all-btn" onClick={() => setActiveTab('logs')}>
                      View All
                    </button>
                  </div>

                  <div className="admin-activity-stream" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {auditLogs.slice(0, 6).map((log, idx) => {
                      // Specific badge styling per activity type
                      let iconEl = <User size={16} color="#10b981" />;
                      let bg = '#ecfdf5';

                      if (log.type === 'menu' || idx === 1) {
                        iconEl = <Edit size={16} color="#3b82f6" />;
                        bg = '#eff6ff';
                      } else if (log.type === 'inventory' || idx === 2) {
                        iconEl = <PackageCheck size={16} color="#f59e0b" />;
                        bg = '#fffbeb';
                      } else if (log.type === 'order' || idx === 3) {
                        iconEl = <ShoppingCart size={16} color="#0d9488" />;
                        bg = '#f0fdfa';
                      } else if (log.type === 'user' || idx === 4) {
                        iconEl = <Users size={16} color="#3b82f6" />;
                        bg = '#eff6ff';
                      } else if (log.type === 'logout' || idx === 5) {
                        iconEl = <LogOut size={16} color="#ef4444" />;
                        bg = '#fef2f2';
                      }

                      return (
                        <div key={log.id || idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div className="admin-act-icon-wrap" style={{ background: bg }}>
                            {iconEl}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#1f2937' }}>
                              {log.action}
                            </div>
                            <div style={{ fontSize: '11.5px', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {log.details}
                            </div>
                          </div>
                          <span style={{ fontSize: '11px', color: '#9ca3af', flexShrink: 0, fontWeight: '500' }}>
                            {log.timestamp}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MENU MANAGEMENT */}
          {activeTab === 'menu' && (
            <div className="admin-tab-pane fade-in">
              <div className="admin-pane-header">
                <div>
                  <h1 className="admin-pane-title">Menu Management</h1>
                  <p className="admin-pane-sub">Add, update, publish, archive, and manage food product records with mandatory image verification.</p>
                </div>
                <button
                  type="button"
                  className="admin-btn-primary"
                  onClick={() => {
                    setEditingItem(null);
                    setFormProduct({
                      id: '',
                      name: '',
                      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
                      description: '',
                      category: categories[0]?.name || 'Appetizers',
                      subcategory: 'Signature',
                      price: 260,
                      promoPrice: '',
                      available: true,
                      ingredients: 'Fresh ingredients, house secret sauce',
                      allergens: 'None',
                      prepTime: '12 mins',
                      stock: 30,
                      sizes: 'Standard',
                      addons: 'Extra Topping (+₱30)'
                    });
                    setShowItemModal(true);
                  }}
                >
                  <Plus size={16} />
                  <span>Add New Product</span>
                </button>
              </div>

              {/* KPI Stat Cards */}
              <div className="menu-kpi-row">
                <div className="menu-kpi-card">
                  <div className="menu-kpi-icon" style={{ background: '#fff3e8' }}>
                    <UtensilsCrossed size={22} color="#c05a1f" />
                  </div>
                  <div className="menu-kpi-info">
                    <div className="menu-kpi-label">Total Products</div>
                    <div className="menu-kpi-value">{menuItems.length}</div>
                    <div className="menu-kpi-sub">All menu items</div>
                  </div>
                </div>
                <div className="menu-kpi-card">
                  <div className="menu-kpi-icon" style={{ background: '#e8f8ee' }}>
                    <CheckCircle size={22} color="#1a7a44" />
                  </div>
                  <div className="menu-kpi-info">
                    <div className="menu-kpi-label">Available Products</div>
                    <div className="menu-kpi-value" style={{ color: '#1a7a44' }}>{menuItems.filter(m => m.available).length}</div>
                    <div className="menu-kpi-sub">Ready for orders</div>
                  </div>
                </div>
                <div className="menu-kpi-card">
                  <div className="menu-kpi-icon" style={{ background: '#fff8e6' }}>
                    <AlertTriangle size={22} color="#c07a00" />
                  </div>
                  <div className="menu-kpi-info">
                    <div className="menu-kpi-label">Low Stock</div>
                    <div className="menu-kpi-value" style={{ color: '#c07a00' }}>{menuItems.filter(m => (m.stock ?? 20) <= 5 && (m.stock ?? 20) > 0).length}</div>
                    <div className="menu-kpi-sub">5 units or less</div>
                  </div>
                </div>
                <div className="menu-kpi-card">
                  <div className="menu-kpi-icon" style={{ background: '#fde8e8' }}>
                    <XCircle size={22} color="#c0351a" />
                  </div>
                  <div className="menu-kpi-info">
                    <div className="menu-kpi-label">Unavailable Products</div>
                    <div className="menu-kpi-value" style={{ color: '#c0351a' }}>{menuItems.filter(m => !m.available).length}</div>
                    <div className="menu-kpi-sub">Not visible to customers</div>
                  </div>
                </div>
              </div>

              {/* Filter & Search Toolbar */}
              <div className="admin-toolbar-row menu-toolbar-v2">
                <div className="admin-search-wrap" style={{ flex: 1, minWidth: 0 }}>
                  <Search size={16} className="admin-search-icon" />
                  <input
                    type="text"
                    className="admin-search-input"
                    placeholder="Search food by name, category, or ID..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setMenuPage(1); }}
                  />
                </div>

                <div className="menu-toolbar-selects">
                  <select
                    className="admin-select menu-filter-sel"
                    value={selectedCategoryFilter}
                    onChange={(e) => { setSelectedCategoryFilter(e.target.value); setMenuPage(1); }}
                  >
                    <option value="All">All Categories</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.name}>
                        {c.icon ? `${c.icon} ` : ''}{c.name}
                      </option>
                    ))}
                  </select>

                  <select
                    className="admin-select menu-filter-sel"
                    value={selectedStatusFilter}
                    onChange={(e) => { setSelectedStatusFilter(e.target.value); setMenuPage(1); }}
                  >
                    <option value="All">All Statuses</option>
                    <option value="Available">Available</option>
                    <option value="Unavailable">Unavailable</option>
                  </select>

                  <select
                    className="admin-select menu-filter-sel"
                    value={menuSortBy}
                    onChange={(e) => setMenuSortBy(e.target.value)}
                  >
                    <option value="name-asc">Sort by: Name A–Z</option>
                    <option value="name-desc">Sort by: Name Z–A</option>
                    <option value="price-asc">Sort by: Price Low–High</option>
                    <option value="price-desc">Sort by: Price High–Low</option>
                  </select>
                </div>
              </div>

              {/* Menu Table */}
              <div className="admin-table-card">
                <table className="admin-table menu-table-v2">
                  <thead>
                    <tr>
                      <th style={{ width: '35%' }}>Product</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Stock</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedMenuItems.length === 0 && (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#999' }}>No products found.</td></tr>
                    )}
                    {pagedMenuItems.map(item => {
                      const chipStyle = catChipColors[item.category] || { bg: '#f5f5f5', color: '#555', border: '#ddd' };
                      return (
                        <tr key={item.id} className="menu-table-row">
                          <td>
                            <div className="admin-prod-cell">
                              <img
                                src={item.image}
                                alt={item.name}
                                className="menu-prod-thumb-v2"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';
                                }}
                              />
                              <div>
                                <div className="admin-prod-name">{item.name}</div>
                                <div className="admin-prod-id">ID: #{item.id}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="menu-cat-chip-v2" style={{ background: chipStyle.bg, color: chipStyle.color, border: `1px solid ${chipStyle.border}` }}>
                              {item.category}
                            </span>
                          </td>
                          <td>
                            <span className="menu-price-v2">P{item.price}</span>
                            {item.promoPrice && <span className="admin-price-promo" style={{ marginLeft: '6px' }}>P{item.promoPrice}</span>}
                          </td>
                          <td>
                            <span className={`admin-stock-badge ${(item.stock ?? 20) <= 5 ? 'low' : ''}`}>
                              {item.stock ?? 25} units
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="menu-status-dot-btn"
                              onClick={() => handleToggleAvailability(item.id, item.available)}
                              title="Click to toggle availability"
                            >
                              <span className={`menu-status-dot ${item.available ? 'dot-available' : 'dot-unavailable'}`} />
                              <span className={item.available ? 'menu-status-avail' : 'menu-status-unavail'}>
                                {item.available ? 'Available' : 'Unavailable'}
                              </span>
                            </button>
                          </td>
                          <td>
                            <div className="menu-action-row">
                              <button type="button" className="menu-act-btn" title="Preview" onClick={() => setPreviewItem(item)}>
                                <Eye size={15} />
                              </button>
                              <button type="button" className="menu-act-btn" title="Edit" onClick={() => { setEditingItem(item); setFormProduct({ ...item }); setShowItemModal(true); }}>
                                <Edit size={15} />
                              </button>
                              <button type="button" className="menu-act-btn" title="Toggle Availability" onClick={() => handleToggleAvailability(item.id, item.available)}>
                                <Calendar size={15} />
                              </button>
                              <button type="button" className="menu-act-btn menu-act-del" title="Archive" onClick={() => handleDeleteProduct(item.id, item.name)}>
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Pagination Footer */}
                <div className="menu-pagination-bar">
                  <span className="menu-page-info">
                    Showing {filteredMenuItems.length === 0 ? 0 : (menuPage - 1) * MENU_PAGE_SIZE + 1}–{Math.min(menuPage * MENU_PAGE_SIZE, filteredMenuItems.length)} of {filteredMenuItems.length} products
                  </span>
                  <div className="menu-page-controls">
                    <button
                      type="button"
                      className="menu-page-btn"
                      disabled={menuPage <= 1}
                      onClick={() => setMenuPage(p => Math.max(1, p - 1))}
                    >‹</button>
                    {Array.from({ length: menuTotalPages }, (_, i) => i + 1).map(pg => (
                      <button
                        key={pg}
                        type="button"
                        className={`menu-page-btn ${menuPage === pg ? 'active' : ''}`}
                        onClick={() => setMenuPage(pg)}
                      >{pg}</button>
                    ))}
                    <button
                      type="button"
                      className="menu-page-btn"
                      disabled={menuPage >= menuTotalPages}
                      onClick={() => setMenuPage(p => Math.min(menuTotalPages, p + 1))}
                    >›</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CATEGORIES */}
          {activeTab === 'categories' && (
            <div className="admin-tab-pane fade-in">
              <div className="admin-pane-header">
                <div>
                  <h1 className="admin-pane-title">Category Management</h1>
                  <p className="admin-pane-sub">Create, rename, arrange, enable, disable, and archive food categories.</p>
                </div>
                <button
                  type="button"
                  className="admin-btn-primary"
                  onClick={() => {
                    setEditingCategory(null);
                    setFormCategory({ name: '', icon: '🍽️' });
                    setShowCategoryModal(true);
                  }}
                >
                  <Plus size={16} />
                  <span>Add Category</span>
                </button>
              </div>

              <div className="admin-grid-cards">
                {categories.map(cat => {
                  const itemCount = menuItems.filter(m => m.category === cat.name).length;
                  const isArchived = cat.active === false;
                  return (
                    <div
                      key={cat.id}
                      className="admin-cat-card"
                      style={{
                        opacity: isArchived ? 0.6 : 1,
                        position: 'relative',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {isArchived && (
                        <span style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          background: '#f1f1f1',
                          color: '#777',
                          fontSize: '11px',
                          fontWeight: '600',
                          padding: '2px 8px',
                          borderRadius: '12px'
                        }}>
                          Archived
                        </span>
                      )}
                      <span className="admin-cat-icon">{cat.icon}</span>
                      <h3 className="admin-cat-title">{cat.name}</h3>
                      <span className="admin-cat-count">{itemCount} Items</span>
                      <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="admin-btn-sm"
                          onClick={() => {
                            setEditingCategory(cat);
                            setFormCategory({ name: cat.name, icon: cat.icon });
                            setShowCategoryModal(true);
                          }}
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          className={`admin-btn-sm ${isArchived ? 'primary' : 'secondary'}`}
                          onClick={() => handleToggleArchiveCategory(cat)}
                        >
                          {isArchived ? 'Restore' : 'Archive'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB: MENU PREFERENCES */}
          {activeTab === 'preferences' && (
            <MenuPreferencesManager socket={socket} onLogActivity={addAuditLog} />
          )}

          {/* TAB 4: DRINKS AND SIZES */}
          {activeTab === 'drinks' && (
            <div className="admin-tab-pane fade-in">
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.4px' }}>
                    Drinks &amp; Sizes Management
                  </h1>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0 0' }}>
                    Configure Small, Medium, and Large sizes with corresponding prices, stock, and images.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setShowSizePresetsModal(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      background: '#ffffff',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#374151',
                      cursor: 'pointer',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                    }}
                  >
                    <Settings size={15} color="#e45729" />
                    <span>Manage Size Presets</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingDrink(null);
                      setFormDrink({
                        id: `DRK-00${drinks.length + 1}`,
                        sku: `DRK-00${drinks.length + 1}`,
                        name: '',
                        image: '',
                        description: '',
                        category: 'Milk Tea',
                        price: 75,
                        available: true,
                        addons: 'Extra Pearls, Less Ice',
                        sizes: [
                          { name: 'Small', volume: '355 ml', price: 70, stock: 25 },
                          { name: 'Medium', volume: '500 ml', price: 80, stock: 15 },
                          { name: 'Large', volume: '700 ml', price: 90, stock: 10 }
                        ]
                      });
                      setShowDrinkModal(true);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 18px',
                      background: '#e45729',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#ffffff',
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(228, 87, 41, 0.25)'
                    }}
                  >
                    <Plus size={16} />
                    <span>Add Drink</span>
                  </button>
                </div>
              </div>

              {/* 5 Top KPI Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, minmax(0, 1fr)) 1.35fr',
                gap: '14px',
                marginBottom: '18px'
              }}>
                {/* 1. Total Drinks */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '14px',
                  padding: '16px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: '#ffedd5',
                    border: '1px solid #fed7aa',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Wine size={22} color="#c2410c" />
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Total Drinks</div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: '#111827', lineHeight: 1.1, margin: '2px 0' }}>
                      {drinks.length}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>Beverages in menu</div>
                  </div>
                </div>

                {/* 2. Available */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '14px',
                  padding: '16px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: '#f0fdf4',
                    border: '1px solid #dcfce7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <CheckCircle size={22} color="#16a34a" />
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Available</div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: '#111827', lineHeight: 1.1, margin: '2px 0' }}>
                      {drinks.filter(d => d.available && d.status !== 'Unavailable').length}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>Ready for orders</div>
                  </div>
                </div>

                {/* 3. Low Stock */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '14px',
                  padding: '16px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: '#fffbeb',
                    border: '1px solid #fef3c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <AlertTriangle size={22} color="#d97706" />
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Low Stock</div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: '#111827', lineHeight: 1.1, margin: '2px 0' }}>
                      {drinks.filter(d => d.status === 'Low Stock' || d.sizes.some(s => s.stock <= 6 && s.stock > 0)).length}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>Needs restocking</div>
                  </div>
                </div>

                {/* 4. Unavailable */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '14px',
                  padding: '16px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: '#fef2f2',
                    border: '1px solid #fee2e2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <XCircle size={22} color="#dc2626" />
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Unavailable</div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: '#111827', lineHeight: 1.1, margin: '2px 0' }}>
                      {drinks.filter(d => !d.available || d.status === 'Unavailable').length}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>Not available for orders</div>
                  </div>
                </div>

                {/* 5. Size Pricing Overview (Bar Chart) */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '14px',
                  padding: '14px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#111827' }}>Size Pricing Overview</div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                    {/* Legend on left */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fed7aa', display: 'inline-block' }} />
                        <span style={{ color: '#6b7280' }}>Small</span>
                        <strong style={{ color: '#111827' }}>Avg ₱60</strong>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fb923c', display: 'inline-block' }} />
                        <span style={{ color: '#6b7280' }}>Medium</span>
                        <strong style={{ color: '#111827' }}>Avg ₱75</strong>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ea580c', display: 'inline-block' }} />
                        <span style={{ color: '#6b7280' }}>Large</span>
                        <strong style={{ color: '#111827' }}>Avg ₱90</strong>
                      </div>
                    </div>

                    {/* Bars on right */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', height: '62px' }}>
                      {/* Bar 1: Small */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#4b5563', marginBottom: '2px' }}>₱60</span>
                        <div style={{ width: '22px', height: '32px', background: '#fed7aa', borderRadius: '4px 4px 0 0' }} />
                        <span style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>Small</span>
                      </div>

                      {/* Bar 2: Medium */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#4b5563', marginBottom: '2px' }}>₱75</span>
                        <div style={{ width: '22px', height: '44px', background: '#fb923c', borderRadius: '4px 4px 0 0' }} />
                        <span style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>Medium</span>
                      </div>

                      {/* Bar 3: Large */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#4b5563', marginBottom: '2px' }}>₱90</span>
                        <div style={{ width: '22px', height: '56px', background: '#ea580c', borderRadius: '4px 4px 0 0' }} />
                        <span style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>Large</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Filter & Search Bar */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '8px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '18px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                flexWrap: 'wrap'
              }}>
                {/* Search input */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
                  <Search size={16} color="#9ca3af" />
                  <input
                    type="text"
                    placeholder="Search drinks by name, SKU, or description..."
                    value={drinkSearch}
                    onChange={(e) => setDrinkSearch(e.target.value)}
                    style={{
                      border: 'none',
                      outline: 'none',
                      fontSize: '13px',
                      color: '#1f2937',
                      width: '100%',
                      background: 'transparent'
                    }}
                  />
                </div>

                {/* Categories Dropdown */}
                <select
                  value={drinkCategoryFilter}
                  onChange={(e) => setDrinkCategoryFilter(e.target.value)}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '7px 12px',
                    fontSize: '12.5px',
                    color: '#374151',
                    background: '#fff',
                    cursor: 'pointer',
                    fontWeight: 500,
                    outline: 'none'
                  }}
                >
                  <option value="All">All Categories</option>
                  <option value="Milk Tea">Milk Tea</option>
                  <option value="Fruit Shake">Fruit Shake</option>
                  <option value="Iced Tea">Iced Tea</option>
                  <option value="Bottled Drinks">Bottled Drinks</option>
                </select>

                {/* Availability Dropdown */}
                <select
                  value={drinkAvailFilter}
                  onChange={(e) => setDrinkAvailFilter(e.target.value)}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '7px 12px',
                    fontSize: '12.5px',
                    color: '#374151',
                    background: '#fff',
                    cursor: 'pointer',
                    fontWeight: 500,
                    outline: 'none'
                  }}
                >
                  <option value="All">All Availability</option>
                  <option value="Available">Available</option>
                  <option value="Low Stock">Low Stock</option>
                  <option value="Unavailable">Unavailable</option>
                </select>

                {/* Stock Levels Dropdown */}
                <select
                  value={drinkStockFilter}
                  onChange={(e) => setDrinkStockFilter(e.target.value)}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '7px 12px',
                    fontSize: '12.5px',
                    color: '#374151',
                    background: '#fff',
                    cursor: 'pointer',
                    fontWeight: 500,
                    outline: 'none'
                  }}
                >
                  <option value="All">All Stock Levels</option>
                  <option value="In Stock">In Stock (&gt;6)</option>
                  <option value="Low Stock">Low Stock (≤6)</option>
                  <option value="Out of Stock">Out of Stock (0)</option>
                </select>

                {/* Sort Dropdown */}
                <select
                  value={drinkSortBy}
                  onChange={(e) => setDrinkSortBy(e.target.value)}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '7px 12px',
                    fontSize: '12.5px',
                    color: '#374151',
                    background: '#fff',
                    cursor: 'pointer',
                    fontWeight: 500,
                    outline: 'none'
                  }}
                >
                  <option value="name-asc">Sort by: Name A-Z</option>
                  <option value="name-desc">Sort by: Name Z-A</option>
                  <option value="price-low">Sort by: Price Low-High</option>
                  <option value="price-high">Sort by: Price High-Low</option>
                  <option value="stock-low">Sort by: Stock Low-High</option>
                </select>

                {/* Item counter */}
                <span style={{ fontSize: '12.5px', color: '#6b7280', paddingLeft: '4px' }}>
                  Showing {
                    drinks.filter(d => {
                      const q = drinkSearch.toLowerCase().trim();
                      const matchesSearch = !q ||
                        d.name.toLowerCase().includes(q) ||
                        d.sku.toLowerCase().includes(q) ||
                        (d.description && d.description.toLowerCase().includes(q));
                      const matchesCat = drinkCategoryFilter === 'All' || d.category === drinkCategoryFilter;
                      const matchesAvail = drinkAvailFilter === 'All' || d.status === drinkAvailFilter;
                      return matchesSearch && matchesCat && matchesAvail;
                    }).length
                  } of {drinks.length} drinks
                </span>
              </div>

              {/* 3x2 Grid of Drink Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px',
                marginBottom: '18px'
              }}>
                {drinks
                  .filter(d => {
                    const q = drinkSearch.toLowerCase().trim();
                    const matchesSearch = !q ||
                      d.name.toLowerCase().includes(q) ||
                      d.sku.toLowerCase().includes(q) ||
                      (d.description && d.description.toLowerCase().includes(q));
                    const matchesCat = drinkCategoryFilter === 'All' || d.category === drinkCategoryFilter;
                    const matchesAvail = drinkAvailFilter === 'All' || d.status === drinkAvailFilter;
                    const matchesStock = drinkStockFilter === 'All' ||
                      (drinkStockFilter === 'Low Stock' && (d.status === 'Low Stock' || d.sizes.some(s => s.stock <= 6))) ||
                      (drinkStockFilter === 'In Stock' && d.sizes.every(s => s.stock > 6)) ||
                      (drinkStockFilter === 'Out of Stock' && d.sizes.every(s => s.stock === 0));
                    return matchesSearch && matchesCat && matchesAvail && matchesStock;
                  })
                  .sort((a, b) => {
                    if (drinkSortBy === 'name-desc') return b.name.localeCompare(a.name);
                    if (drinkSortBy === 'price-low') return (a.sizes[0]?.price || 0) - (b.sizes[0]?.price || 0);
                    if (drinkSortBy === 'price-high') return (b.sizes[0]?.price || 0) - (a.sizes[0]?.price || 0);
                    if (drinkSortBy === 'stock-low') return (a.sizes[0]?.stock || 0) - (b.sizes[0]?.stock || 0);
                    return a.name.localeCompare(b.name);
                  })
                  .map(drink => (
                    <div
                      key={drink.id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '14px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {/* Top Info row: image + details */}
                      <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                        <img
                          src={drink.image}
                          alt={drink.name}
                          style={{
                            width: '92px',
                            height: '92px',
                            borderRadius: '10px',
                            objectFit: 'cover',
                            border: '1px solid #e5e7eb',
                            flexShrink: 0
                          }}
                          onError={(e) => {
                            e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80';
                          }}
                        />

                        <div style={{ flex: 1, minWidth: 0 }}>
                          {/* Title & Status Toggle */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                            <h3 style={{
                              margin: 0,
                              fontSize: '14.5px',
                              fontWeight: 800,
                              color: '#111827',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {drink.name}
                            </h3>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                              <span style={{
                                background: drink.status === 'Available' ? '#ecfdf5' : drink.status === 'Low Stock' ? '#fffbeb' : '#fef2f2',
                                border: drink.status === 'Available' ? '1px solid #a7f3d0' : drink.status === 'Low Stock' ? '1px solid #fde68a' : '1px solid #fecaca',
                                color: drink.status === 'Available' ? '#059669' : drink.status === 'Low Stock' ? '#d97706' : '#dc2626',
                                borderRadius: '999px',
                                padding: '1.5px 7px',
                                fontSize: '10.5px',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <span style={{
                                  width: '5px',
                                  height: '5px',
                                  borderRadius: '50%',
                                  background: drink.status === 'Available' ? '#059669' : drink.status === 'Low Stock' ? '#d97706' : '#dc2626'
                                }} />
                                <span>{drink.status}</span>
                              </span>

                              {/* Interactive toggle switch */}
                              <div
                                onClick={() => handleToggleDrinkAvailable(drink.id)}
                                title="Toggle Drink Availability"
                                style={{
                                  width: '32px',
                                  height: '18px',
                                  borderRadius: '999px',
                                  background: drink.available ? (drink.status === 'Low Stock' ? '#f59e0b' : '#10b981') : '#d1d5db',
                                  cursor: 'pointer',
                                  position: 'relative',
                                  transition: 'background 0.2s ease',
                                  flexShrink: 0
                                }}
                              >
                                <div style={{
                                  width: '14px',
                                  height: '14px',
                                  borderRadius: '50%',
                                  background: '#ffffff',
                                  position: 'absolute',
                                  top: '2px',
                                  left: drink.available ? '16px' : '2px',
                                  transition: 'left 0.2s ease',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                                }} />
                              </div>
                            </div>
                          </div>

                          {/* SKU */}
                          <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>
                            SKU: {drink.sku}
                          </div>

                          {/* Subcategory Tag */}
                          <div style={{ marginBottom: '4px' }}>
                            <span style={{
                              background: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              color: '#1d4ed8',
                              borderRadius: '4px',
                              padding: '1px 6px',
                              fontSize: '10.5px',
                              fontWeight: 600,
                              display: 'inline-block'
                            }}>
                              {drink.category}
                            </span>
                          </div>

                          {/* Description */}
                          <p style={{
                            margin: '3px 0 5px',
                            fontSize: '11px',
                            color: '#6b7280',
                            lineHeight: 1.35,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}>
                            {drink.description}
                          </p>

                          {/* Addon / Tag Pills */}
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {drink.addons && drink.addons.map((addon, aIdx) => (
                              <span
                                key={aIdx}
                                style={{
                                  background: '#f0f9ff',
                                  border: '1px solid #e0f2fe',
                                  color: '#0284c7',
                                  borderRadius: '4px',
                                  padding: '1px 6px',
                                  fontSize: '10.5px',
                                  fontWeight: 500
                                }}
                              >
                                {addon}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Sizes & Stock Table */}
                      <div style={{
                        border: '1px solid #f3f4f6',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        background: '#fafafa'
                      }}>
                        {drink.sizes.map((sz, szIdx) => (
                          <div
                            key={szIdx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '6px 10px',
                              borderBottom: szIdx < drink.sizes.length - 1 ? '1px solid #f0f0f0' : 'none',
                              background: '#ffffff'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '12px', fontWeight: 600, color: '#374151', minWidth: '46px' }}>
                                {sz.name}
                              </span>
                              <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                                {sz.volume}
                              </span>
                            </div>

                            <strong style={{ fontSize: '12.5px', fontWeight: 800, color: '#111827' }}>
                              ₱{sz.price}
                            </strong>

                            {/* Stock Stepper */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <button
                                type="button"
                                onClick={() => handleDrinkStockChange(drink.id, sz.name, -1)}
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '4px',
                                  border: '1px solid #e5e7eb',
                                  background: '#f9fafb',
                                  color: '#4b5563',
                                  fontSize: '13px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  lineHeight: 1
                                }}
                              >
                                -
                              </button>

                              <span style={{
                                minWidth: '30px',
                                height: '24px',
                                border: '1px solid #e5e7eb',
                                borderRadius: '4px',
                                background: '#ffffff',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                color: sz.stock <= 6 ? '#d97706' : '#111827',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                {sz.stock}
                              </span>

                              <button
                                type="button"
                                onClick={() => handleDrinkStockChange(drink.id, sz.name, 1)}
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '4px',
                                  border: '1px solid #e5e7eb',
                                  background: '#f9fafb',
                                  color: '#4b5563',
                                  fontSize: '13px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  lineHeight: 1
                                }}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Card Footer Actions */}
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: 'auto', paddingTop: '4px' }}>
                        <button
                          type="button"
                          onClick={() => setViewingDrink(drink)}
                          title="View Drink Details"
                          style={{
                            flex: 1,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            padding: '5px 6px',
                            background: '#ffffff',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#374151',
                            cursor: 'pointer'
                          }}
                        >
                          <Eye size={12} color="#6b7280" />
                          <span>View</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingDrink(drink);
                            setFormDrink({
                              id: drink.id,
                              sku: drink.sku,
                              name: drink.name,
                              image: drink.image,
                              description: drink.description,
                              category: drink.category,
                              price: drink.sizes[0]?.price || 75,
                              available: drink.available,
                              addons: drink.addons?.join(', ') || '',
                              sizes: [...drink.sizes]
                            });
                            setShowDrinkModal(true);
                          }}
                          title="Edit Drink"
                          style={{
                            flex: 1,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            padding: '5px 6px',
                            background: '#ffffff',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#374151',
                            cursor: 'pointer'
                          }}
                        >
                          <Edit size={12} color="#6b7280" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteDrink(drink.id, drink.name)}
                          title="Delete Drink"
                          style={{
                            flex: 1,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            padding: '5px 6px',
                            background: '#ffffff',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#374151',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={12} color="#dc2626" />
                          <span>Delete</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleArchiveDrink(drink.id, drink.name)}
                          title="Archive Drink"
                          style={{
                            flex: 1,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            padding: '5px 6px',
                            background: '#ffffff',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#374151',
                            cursor: 'pointer'
                          }}
                        >
                          <Archive size={12} color="#6b7280" />
                          <span>Archive</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setViewingDrink(drink)}
                          title="More Options"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '5px 8px',
                            background: '#ffffff',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '11px',
                            color: '#374151',
                            cursor: 'pointer'
                          }}
                        >
                          <MoreHorizontal size={13} color="#6b7280" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Bottom Info Banner & Pagination */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                marginTop: '10px'
              }}>
                {/* Info Callout */}
                <div style={{
                  background: '#eff6ff',
                  border: '1px solid #dbeafe',
                  borderRadius: '10px',
                  padding: '9px 14px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#1e40af',
                  fontSize: '12.5px'
                }}>
                  <Info size={16} color="#3b82f6" />
                  <span>Prices and stock are managed independently for each size.</span>
                </div>

                {/* Pagination Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: '#4b5563' }}>
                    <span>Rows per page:</span>
                    <select
                      value={drinkRowsPerPage}
                      onChange={(e) => setDrinkRowsPerPage(Number(e.target.value))}
                      style={{
                        padding: '4px 8px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '12px',
                        background: '#ffffff',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="6">6</option>
                      <option value="12">12</option>
                      <option value="24">24</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      type="button"
                      disabled
                      style={{
                        width: '28px',
                        height: '28px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        background: '#ffffff',
                        color: '#9ca3af',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'not-allowed'
                      }}
                    >
                      <ChevronLeft size={14} />
                    </button>

                    <button
                      type="button"
                      style={{
                        width: '28px',
                        height: '28px',
                        border: 'none',
                        borderRadius: '6px',
                        background: '#e45729',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'default',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      1
                    </button>

                    <button
                      type="button"
                      disabled
                      style={{
                        width: '28px',
                        height: '28px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        background: '#ffffff',
                        color: '#9ca3af',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'not-allowed'
                      }}
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: COMBOS & VALUE MEALS */}
          {activeTab === 'combos' && (
            <div className="admin-tab-pane fade-in">
              {/* Header */}
              <div className="admin-pane-header" style={{ marginBottom: '20px' }}>
                <div>
                  <h1 className="admin-pane-title">Combos &amp; Value Meals</h1>
                  <p className="admin-pane-sub">Assemble value bundles with matched food images, prices, and validity dates.</p>
                </div>
                <button
                  type="button"
                  className="admin-btn-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: '#c05a1f',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 18px',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(192, 90, 31, 0.25)',
                    transition: 'all 0.15s ease'
                  }}
                  onClick={() => {
                    setEditingCombo(null);
                    setFormCombo({
                      id: '',
                      name: '',
                      main: 'Chicken Teriyaki Rice Bowl',
                      side: 'Pork & Chive Gyoza',
                      drink: 'Matcha Boba Milk Tea',
                      originalPrice: 480,
                      promoPrice: 399,
                      status: 'active',
                      dateRange: 'Jan 1, 2024 – Dec 31, 2024',
                      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'
                    });
                    setShowComboModal(true);
                  }}
                >
                  <Plus size={16} />
                  <span>Create New Combo</span>
                </button>
              </div>

              {/* 4 Top KPI Stat Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '16px',
                marginBottom: '20px'
              }}>
                {/* 1. Total Combos */}
                <div style={{
                  background: '#FFFFFF',
                  border: '1px solid #f0e6dd',
                  borderRadius: '14px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
                }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: '#ffedea',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Gift size={22} color="#dc2626" />
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>Total Combos</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#111827', lineHeight: 1.15 }}>{combos.length}</div>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>All combo meals</div>
                  </div>
                </div>

                {/* 2. Active Combos */}
                <div style={{
                  background: '#FFFFFF',
                  border: '1px solid #f0e6dd',
                  borderRadius: '14px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
                }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: '#ecfdf5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <CheckCircle size={22} color="#10b981" />
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>Active Combos</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#111827', lineHeight: 1.15 }}>
                      {combos.filter(c => c.status === 'active').length}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>Currently available</div>
                  </div>
                </div>

                {/* 3. Scheduled */}
                <div style={{
                  background: '#FFFFFF',
                  border: '1px solid #f0e6dd',
                  borderRadius: '14px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
                }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: '#fffbeb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Calendar size={22} color="#f59e0b" />
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>Scheduled</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#111827', lineHeight: 1.15 }}>
                      {combos.filter(c => c.status === 'scheduled').length}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>Activates soon</div>
                  </div>
                </div>

                {/* 4. Expired */}
                <div style={{
                  background: '#FFFFFF',
                  border: '1px solid #f0e6dd',
                  borderRadius: '14px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
                }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: '#fef2f2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Clock size={22} color="#ef4444" />
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>Expired</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#111827', lineHeight: 1.15 }}>
                      {combos.filter(c => c.status === 'expired').length}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>No expired combos</div>
                  </div>
                </div>
              </div>

              {/* Search & Filter Toolbar */}
              <div style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                marginBottom: '20px',
                flexWrap: 'wrap'
              }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
                  <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                  <input
                    type="text"
                    placeholder="Search combos by name, item, or keyword..."
                    value={comboSearch}
                    onChange={e => setComboSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 38px',
                      borderRadius: '10px',
                      border: '1px solid #e5e7eb',
                      fontSize: '13px',
                      outline: 'none',
                      background: '#fff',
                      color: '#111827',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <select
                  value={comboStatusFilter}
                  onChange={e => setComboStatusFilter(e.target.value)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #e5e7eb',
                    fontSize: '13px',
                    color: '#374151',
                    background: '#fff',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value="All">All Status</option>
                  <option value="active">Active</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="expired">Expired</option>
                </select>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #e5e7eb',
                  fontSize: '13px',
                  color: '#374151',
                  background: '#fff',
                  cursor: 'pointer'
                }}>
                  <Calendar size={15} color="#6b7280" />
                  <span>All Dates</span>
                </div>

                <div style={{ position: 'relative' }}>
                  <select
                    value={comboSortBy}
                    onChange={e => setComboSortBy(e.target.value)}
                    style={{
                      padding: '10px 14px 10px 32px',
                      borderRadius: '10px',
                      border: '1px solid #e5e7eb',
                      fontSize: '13px',
                      color: '#374151',
                      background: '#fff',
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                  >
                    <option value="newest">Sort by: Newest First</option>
                    <option value="price-asc">Sort by: Price Low to High</option>
                    <option value="price-desc">Sort by: Price High to Low</option>
                  </select>
                  <ArrowUpDown size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280', pointerEvents: 'none' }} />
                </div>
              </div>

              {/* Combos Grid */}
              <div className="admin-combos-grid">
                {filteredCombos.map(c => {
                  const savings = (c.originalPrice || 0) - (c.promoPrice || 0);
                  const isActive = c.status === 'active';
                  const isScheduled = c.status === 'scheduled';
                  return (
                    <div key={c.id} className="admin-combo-card-v2">
                      <div className="admin-combo-card-img-wrap">
                        <img src={c.image} alt={c.name} className="admin-combo-card-img" />
                        <div className="admin-combo-status-badge">
                          <span style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: isActive ? '#10b981' : isScheduled ? '#f59e0b' : '#ef4444',
                            display: 'inline-block'
                          }} />
                          <span style={{
                            color: isActive ? '#059669' : isScheduled ? '#d97706' : '#dc2626',
                            fontSize: '11px',
                            fontWeight: 700
                          }}>
                            {isActive ? 'Active' : isScheduled ? 'Scheduled' : 'Expired'}
                          </span>
                        </div>
                      </div>

                      <div className="admin-combo-body">
                        <h3 style={{
                          margin: '0 0 6px',
                          fontSize: '15px',
                          fontWeight: 700,
                          color: '#111827',
                          lineHeight: 1.3
                        }}>
                          {c.name}
                        </h3>

                        <div style={{
                          fontSize: '11.5px',
                          color: '#6b7280',
                          lineHeight: 1.45,
                          marginBottom: '12px',
                          minHeight: '34px'
                        }}>
                          <div>Main: {c.main}</div>
                          <div>Side: {c.side} • Drink: {c.drink}</div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                          <span style={{ textDecoration: 'line-through', color: '#9ca3af', fontSize: '13px', fontWeight: 500 }}>
                            ₱{c.originalPrice}
                          </span>
                          <span style={{ fontSize: '20px', fontWeight: 800, color: '#059669' }}>
                            ₱{c.promoPrice}
                          </span>
                          {savings > 0 && (
                            <span style={{
                              background: '#ecfdf5',
                              color: '#059669',
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '999px',
                              border: '1px solid #a7f3d0'
                            }}>
                              Save ₱{savings}
                            </span>
                          )}
                        </div>

                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '11px',
                          color: '#6b7280',
                          marginBottom: '14px'
                        }}>
                          <Calendar size={13} color="#9ca3af" />
                          <span>{c.dateRange || 'Jan 1, 2024 – Dec 31, 2024'}</span>
                        </div>

                        <div style={{ display: 'flex', gap: '6px', marginTop: 'auto' }}>
                          <button
                            type="button"
                            className="admin-combo-btn"
                            onClick={() => handleViewCombo(c)}
                            title="View Combo"
                          >
                            <Eye size={12} />
                            <span>View</span>
                          </button>
                          <button
                            type="button"
                            className="admin-combo-btn"
                            onClick={() => handleEditCombo(c)}
                            title="Edit Combo"
                          >
                            <Edit size={12} />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            className="admin-combo-btn"
                            onClick={() => handleDuplicateCombo(c)}
                            title="Duplicate Combo"
                          >
                            <Copy size={12} />
                            <span>Duplicate</span>
                          </button>
                          <button
                            type="button"
                            className="admin-combo-btn archive"
                            onClick={() => handleArchiveCombo(c.id, c.name)}
                            title="Archive Combo"
                          >
                            <Archive size={12} />
                            <span>Archive</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer Pagination */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '24px',
                paddingTop: '16px',
                borderTop: '1px solid #f0e6dd'
              }}>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>
                  Showing {filteredCombos.length} of {combos.length} combos
                </span>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button
                    type="button"
                    disabled
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      background: '#fff',
                      color: '#9ca3af',
                      fontSize: '12px',
                      cursor: 'not-allowed'
                    }}
                  >
                    <ChevronLeft size={14} />
                    <span>Previous</span>
                  </button>
                  <button
                    type="button"
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: '#c05a1f',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 700,
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    1
                  </button>
                  <button
                    type="button"
                    disabled
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      background: '#fff',
                      color: '#9ca3af',
                      fontSize: '12px',
                      cursor: 'not-allowed'
                    }}
                  >
                    <span>Next</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: MIX & MATCH */}
          {activeTab === 'mixmatch' && (() => {
            const featuredBundle = filteredMixMatchRules.find(r => r.id === 'MM-1') || filteredMixMatchRules[0] || mixMatchRules[0];
            const otherBundles = filteredMixMatchRules.filter(r => r.id !== featuredBundle?.id);

            const selMain = featuredBundle?.mainOptions?.[selectedMainIdx] || featuredBundle?.mainOptions?.[0] || { name: 'Chicken Teriyaki Rice Bowl', price: 220, image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80' };
            const selSide = featuredBundle?.sideOptions?.[selectedSideIdx] || featuredBundle?.sideOptions?.[0] || { name: 'Pork & Chive Gyoza', price: 90, image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=600&q=80' };
            const selDrink = featuredBundle?.drinkOptions?.[selectedDrinkIdx] || featuredBundle?.drinkOptions?.[0] || { name: 'Matcha Boba Milk Tea', price: 120, image: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80' };

            const regTotal = (selMain.price || 0) + (selSide.price || 0) + (selDrink.price || 0);
            const bPrice = featuredBundle?.price || 349;
            const savings = Math.max(0, regTotal - bPrice);
            const savingsPct = regTotal > 0 ? Math.round((savings / regTotal) * 100) : 0;

            return (
              <div className="admin-tab-pane fade-in">
                {/* Header */}
                <div className="admin-pane-header" style={{ marginBottom: '20px' }}>
                  <div>
                    <h1 className="admin-pane-title">Mix &amp; Match Configuration</h1>
                    <p className="admin-pane-sub">Guided bundle selections (1 Main + 1 Side + 1 Drink) with real-time price calculations.</p>
                  </div>
                  <button
                    type="button"
                    className="admin-btn-primary"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: '#c05a1f',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px 18px',
                      fontWeight: 700,
                      fontSize: '14px',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(192, 90, 31, 0.25)',
                      transition: 'all 0.15s ease'
                    }}
                    onClick={() => {
                      setEditingMixMatch(null);
                      setFormMixMatch({
                        name: '',
                        subtitle: '',
                        price: 349,
                        status: 'active',
                        dateRange: 'Jan 1, 2024 – Dec 31, 2024',
                        selectedMain: ['Chicken Teriyaki Rice Bowl', 'Spicy Ramen Bowl'],
                        selectedSide: ['Pork & Chive Gyoza', 'Crispy Chicken Wings'],
                        selectedDrinks: ['Matcha Boba Milk Tea', 'Iced Taro Milk Tea']
                      });
                      setShowMixMatchModal(true);
                    }}
                  >
                    <Plus size={16} />
                    <span>Add Mix &amp; Match</span>
                  </button>
                </div>

                {/* 4 Top KPI Stat Cards */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '16px',
                  marginBottom: '20px'
                }}>
                  {/* 1. Total Bundles */}
                  <div style={{
                    background: '#FFFFFF',
                    border: '1px solid #f0e6dd',
                    borderRadius: '14px',
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
                  }}>
                    <div style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      background: '#ffedea',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Package size={22} color="#dc2626" />
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>Total Bundles</div>
                      <div style={{ fontSize: '24px', fontWeight: 800, color: '#111827', lineHeight: 1.15 }}>{mixMatchRules.length}</div>
                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>All bundle configurations</div>
                    </div>
                  </div>

                  {/* 2. Active Bundles */}
                  <div style={{
                    background: '#FFFFFF',
                    border: '1px solid #f0e6dd',
                    borderRadius: '14px',
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
                  }}>
                    <div style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      background: '#ecfdf5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Play size={20} color="#10b981" fill="#10b981" />
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>Active Bundles</div>
                      <div style={{ fontSize: '24px', fontWeight: 800, color: '#111827', lineHeight: 1.15 }}>
                        {mixMatchRules.filter(r => r.status === 'active').length}
                      </div>
                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>Currently active</div>
                    </div>
                  </div>

                  {/* 3. Total Options */}
                  <div style={{
                    background: '#FFFFFF',
                    border: '1px solid #f0e6dd',
                    borderRadius: '14px',
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
                  }}>
                    <div style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      background: '#f3e8ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <LayoutGrid size={22} color="#9333ea" />
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>Total Options</div>
                      <div style={{ fontSize: '24px', fontWeight: 800, color: '#111827', lineHeight: 1.15 }}>{totalBundleOptionsCount}</div>
                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>Menu items across all bundles</div>
                    </div>
                  </div>

                  {/* 4. Average Bundle Price */}
                  <div style={{
                    background: '#FFFFFF',
                    border: '1px solid #f0e6dd',
                    borderRadius: '14px',
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
                  }}>
                    <div style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      background: '#fef3c7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Coins size={22} color="#d97706" />
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>Average Bundle Price</div>
                      <div style={{ fontSize: '24px', fontWeight: 800, color: '#111827', lineHeight: 1.15 }}>₱{avgBundlePrice}</div>
                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>Across all bundles</div>
                    </div>
                  </div>
                </div>

                {/* Toolbar */}
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'center',
                  marginBottom: '20px',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input
                      type="text"
                      placeholder="Search bundles by name..."
                      value={mixMatchSearch}
                      onChange={e => setMixMatchSearch(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px 10px 38px',
                        borderRadius: '10px',
                        border: '1px solid #e5e7eb',
                        fontSize: '13px',
                        outline: 'none',
                        background: '#fff',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <select
                    value={mixMatchStatusFilter}
                    onChange={e => setMixMatchStatusFilter(e.target.value)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #e5e7eb',
                      fontSize: '13px',
                      color: '#374151',
                      background: '#fff',
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                  >
                    <option value="All">All Status</option>
                    <option value="active">Active</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="disabled">Disabled</option>
                  </select>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>Sort by</span>
                    <select
                      value={mixMatchSortBy}
                      onChange={e => setMixMatchSortBy(e.target.value)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1px solid #e5e7eb',
                        fontSize: '13px',
                        color: '#374151',
                        background: '#fff',
                        cursor: 'pointer',
                        outline: 'none'
                      }}
                    >
                      <option value="latest">Latest First</option>
                      <option value="price-asc">Price Low to High</option>
                      <option value="price-desc">Price High to Low</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
                    <button
                      type="button"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: 'none',
                        background: mixMatchView === 'card' ? '#c05a1f' : '#ffffff',
                        color: mixMatchView === 'card' ? '#ffffff' : '#4b5563',
                        fontWeight: 600,
                        fontSize: '12px',
                        cursor: 'pointer',
                        boxShadow: mixMatchView === 'card' ? '0 2px 6px rgba(192, 90, 31, 0.2)' : '0 1px 3px rgba(0,0,0,0.05)'
                      }}
                      onClick={() => setMixMatchView('card')}
                    >
                      <LayoutGrid size={14} />
                      <span>Card View</span>
                    </button>
                    <button
                      type="button"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        background: mixMatchView === 'list' ? '#c05a1f' : '#ffffff',
                        color: mixMatchView === 'list' ? '#ffffff' : '#4b5563',
                        fontWeight: 600,
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                      onClick={() => setMixMatchView('list')}
                    >
                      <List size={14} />
                      <span>List View</span>
                    </button>
                  </div>
                </div>

                {/* Featured Expanded Bundle Card */}
                {featuredBundle && (
                  <div className="admin-mm-featured-card">
                    {/* Featured Top Row */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '18px',
                      flexWrap: 'wrap',
                      gap: '12px',
                      boxSizing: 'border-box',
                      width: '100%',
                      minWidth: 0
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#111827' }}>
                            {featuredBundle.name}
                          </h2>
                          <span style={{
                            background: '#ecfdf5',
                            color: '#059669',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 9px',
                            borderRadius: '999px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981' }} />
                            Active
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                          <span style={{ fontSize: '14px', color: '#6b7280' }}>Bundle Price</span>
                          <span style={{ fontSize: '22px', fontWeight: 800, color: '#e45729' }}>₱{featuredBundle.price}</span>
                        </div>
                      </div>

                      <div style={{ textAlign: 'left', minWidth: '220px', flex: '1 1 auto' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#4b5563', fontWeight: 600 }}>
                          <Calendar size={13} color="#6b7280" />
                          <span>Valid {featuredBundle.dateRange || 'Jan 1, 2024 – Dec 31, 2024'}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '3px' }}>
                          {featuredBundle.subtitle || 'Craft your perfect meal with our signature favorites!'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button type="button" className="admin-combo-btn" onClick={() => showNotify(`Viewing ${featuredBundle.name}`)}>
                          <Eye size={12} />
                          <span>View</span>
                        </button>
                        <button type="button" className="admin-combo-btn" onClick={() => handleEditMixMatch(featuredBundle)}>
                          <Edit size={12} />
                          <span>Edit</span>
                        </button>
                        <button type="button" className="admin-combo-btn" onClick={() => handleToggleDisableMixMatch(featuredBundle.id, featuredBundle.name)}>
                          <Ban size={12} />
                          <span>{featuredBundle.status === 'disabled' ? 'Enable' : 'Disable'}</span>
                        </button>
                        <button type="button" className="admin-combo-btn archive" onClick={() => handleDeleteMixMatch(featuredBundle.id, featuredBundle.name)}>
                          <Trash2 size={12} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>

                    {/* Interactive Selection Flow + Preview Box */}
                    <div className="admin-mm-interactive-grid">
                      {/* Left: 3 steps with arrows */}
                      <div className="admin-mm-steps-row">
                        {/* Step 1: Main */}
                        <div className="admin-mm-step-panel">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                            <span style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              background: '#e45729',
                              color: '#fff',
                              fontSize: '11px',
                              fontWeight: 800,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>1</span>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>1. Main Meal Options</span>
                          </div>
                          <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '12px', marginLeft: '28px' }}>Choose 1 main dish</div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0, width: '100%' }}>
                            {(featuredBundle.mainOptions || []).map((m, idx) => {
                              const isSelected = selectedMainIdx === idx;
                              return (
                                <div
                                  key={idx}
                                  onClick={() => setSelectedMainIdx(idx)}
                                  className="admin-mm-option-item"
                                  style={{
                                    border: isSelected ? '1.5px solid #e45729' : '1px solid #e5e7eb',
                                    boxShadow: isSelected ? '0 2px 6px rgba(228, 87, 41, 0.12)' : 'none'
                                  }}
                                >
                                  <div style={{
                                    width: '16px',
                                    height: '16px',
                                    borderRadius: '50%',
                                    border: isSelected ? '5px solid #e45729' : '2px solid #d1d5db',
                                    background: '#fff',
                                    flexShrink: 0
                                  }} />
                                  <img
                                    src={m.image}
                                    alt={m.name}
                                    onError={(e) => {
                                      e.currentTarget.onerror = null;
                                      e.currentTarget.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';
                                    }}
                                    style={{ width: '42px', height: '42px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
                                  />
                                  <div className="admin-mm-option-text">
                                    <div className="admin-mm-option-title">{m.name}</div>
                                    <div className="admin-mm-option-price">₱{m.price}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="admin-mm-chevron">
                          <ChevronRight size={18} />
                        </div>

                        {/* Step 2: Side */}
                        <div className="admin-mm-step-panel">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                            <span style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              background: '#e45729',
                              color: '#fff',
                              fontSize: '11px',
                              fontWeight: 800,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>2</span>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>2. Side Dish Options</span>
                          </div>
                          <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '12px', marginLeft: '28px' }}>Choose 1 side dish</div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0, width: '100%' }}>
                            {(featuredBundle.sideOptions || []).map((s, idx) => {
                              const isSelected = selectedSideIdx === idx;
                              return (
                                <div
                                  key={idx}
                                  onClick={() => setSelectedSideIdx(idx)}
                                  className="admin-mm-option-item"
                                  style={{
                                    border: isSelected ? '1.5px solid #e45729' : '1px solid #e5e7eb',
                                    boxShadow: isSelected ? '0 2px 6px rgba(228, 87, 41, 0.12)' : 'none'
                                  }}
                                >
                                  <div style={{
                                    width: '16px',
                                    height: '16px',
                                    borderRadius: '50%',
                                    border: isSelected ? '5px solid #e45729' : '2px solid #d1d5db',
                                    background: '#fff',
                                    flexShrink: 0
                                  }} />
                                  <img
                                    src={s.image}
                                    alt={s.name}
                                    onError={(e) => {
                                      e.currentTarget.onerror = null;
                                      e.currentTarget.src = 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=600&q=80';
                                    }}
                                    style={{ width: '42px', height: '42px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
                                  />
                                  <div className="admin-mm-option-text">
                                    <div className="admin-mm-option-title">{s.name}</div>
                                    <div className="admin-mm-option-price">₱{s.price}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="admin-mm-chevron">
                          <ChevronRight size={18} />
                        </div>

                        {/* Step 3: Drink */}
                        <div className="admin-mm-step-panel">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                            <span style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              background: '#e45729',
                              color: '#fff',
                              fontSize: '11px',
                              fontWeight: 800,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>3</span>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>3. Drink Options</span>
                          </div>
                          <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '12px', marginLeft: '28px' }}>Choose 1 drink</div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0, width: '100%' }}>
                            {(featuredBundle.drinkOptions || []).map((d, idx) => {
                              const isSelected = selectedDrinkIdx === idx;
                              return (
                                <div
                                  key={idx}
                                  onClick={() => setSelectedDrinkIdx(idx)}
                                  className="admin-mm-option-item"
                                  style={{
                                    border: isSelected ? '1.5px solid #e45729' : '1px solid #e5e7eb',
                                    boxShadow: isSelected ? '0 2px 6px rgba(228, 87, 41, 0.12)' : 'none'
                                  }}
                                >
                                  <div style={{
                                    width: '16px',
                                    height: '16px',
                                    borderRadius: '50%',
                                    border: isSelected ? '5px solid #e45729' : '2px solid #d1d5db',
                                    background: '#fff',
                                    flexShrink: 0
                                  }} />
                                  <img
                                    src={d.image}
                                    alt={d.name}
                                    onError={(e) => {
                                      e.currentTarget.onerror = null;
                                      e.currentTarget.src = 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80';
                                    }}
                                    style={{ width: '42px', height: '42px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
                                  />
                                  <div className="admin-mm-option-text">
                                    <div className="admin-mm-option-title">{d.name}</div>
                                    <div className="admin-mm-option-price">₱{d.price}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Right/Bottom: Bundle Preview Box */}
                      <div className="admin-mm-preview-panel">
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <div style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              background: '#e45729',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              flexShrink: 0
                            }}>
                              🍴
                            </div>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>
                              Bundle Preview (Sample Selection)
                            </span>
                          </div>

                          {/* 3 food icons with + */}
                          <div className="admin-mm-preview-food-grid">
                            <div className="admin-mm-preview-food-item">
                              <img
                                src={selMain.image}
                                alt={selMain.name}
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';
                                }}
                                className="admin-mm-preview-food-img"
                              />
                              <div className="admin-mm-preview-food-name">
                                {selMain.name.split(' ')[0]} {selMain.name.split(' ')[1] || ''}
                              </div>
                              <div className="admin-mm-preview-food-price">₱{selMain.price}</div>
                            </div>

                            <span style={{ color: '#9ca3af', fontWeight: 700, fontSize: '14px', flexShrink: 0 }}>+</span>

                            <div className="admin-mm-preview-food-item">
                              <img
                                src={selSide.image}
                                alt={selSide.name}
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=600&q=80';
                                }}
                                className="admin-mm-preview-food-img"
                              />
                              <div className="admin-mm-preview-food-name">
                                {selSide.name.split(' ')[0]} {selSide.name.split(' ')[1] || ''}
                              </div>
                              <div className="admin-mm-preview-food-price">₱{selSide.price}</div>
                            </div>

                            <span style={{ color: '#9ca3af', fontWeight: 700, fontSize: '14px', flexShrink: 0 }}>+</span>

                            <div className="admin-mm-preview-food-item">
                              <img
                                src={selDrink.image}
                                alt={selDrink.name}
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80';
                                }}
                                className="admin-mm-preview-food-img"
                              />
                              <div className="admin-mm-preview-food-name">
                                {selDrink.name.split(' ')[0]} {selDrink.name.split(' ')[1] || ''}
                              </div>
                              <div className="admin-mm-preview-food-price">₱{selDrink.price}</div>
                            </div>
                          </div>
                        </div>

                        <div>
                          {/* Calculations */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>
                            <span>Regular Total</span>
                            <span style={{ textDecoration: 'line-through', fontWeight: 600 }}>₱{regTotal}</span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>Bundle Price</span>
                            <span style={{ fontSize: '20px', fontWeight: 800, color: '#e45729' }}>₱{bPrice}</span>
                          </div>

                          <div style={{
                            background: '#ecfdf5',
                            border: '1px solid #a7f3d0',
                            borderRadius: '8px',
                            padding: '6px 10px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '10px'
                          }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#059669' }}>Customer Savings</span>
                            <span style={{ fontSize: '12px', fontWeight: 800, color: '#059669' }}>₱{savings} ({savingsPct}% OFF)</span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10.5px', color: '#059669' }}>
                            <Zap size={12} color="#10b981" style={{ flexShrink: 0 }} />
                            <span>Real-time price calculation based on selected items</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Secondary Collapsed Bundle Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {otherBundles.map(bundle => {
                    const isScheduled = bundle.status === 'scheduled';
                    const isActive = bundle.status === 'active';
                    return (
                      <div
                        key={bundle.id}
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid #f0e6dd',
                          borderRadius: '14px',
                          padding: '14px 20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.02)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: '320px' }}>
                          <img
                            src={bundle.image || 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80'}
                            alt={bundle.name}
                            style={{ width: '64px', height: '48px', borderRadius: '10px', objectFit: 'cover' }}
                          />
                          <div>
                            <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>{bundle.name}</div>
                            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{bundle.subtitle}</div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                          <span style={{
                            background: isScheduled ? '#fffbeb' : '#ecfdf5',
                            color: isScheduled ? '#d97706' : '#059669',
                            border: isScheduled ? '1px solid #fde68a' : '1px solid #a7f3d0',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: '999px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            {isScheduled ? <Clock size={11} /> : <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981' }} />}
                            {isScheduled ? 'Scheduled' : 'Active'}
                          </span>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#6b7280' }}>
                            <Calendar size={13} color="#9ca3af" />
                            <span>{bundle.dateRange || 'Jan 1, 2024 – Dec 31, 2024'}</span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                            <span style={{ fontSize: '12px', color: '#6b7280' }}>Bundle Price</span>
                            <span style={{ fontSize: '18px', fontWeight: 800, color: '#e45729' }}>₱{bundle.price}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button type="button" className="admin-combo-btn" onClick={() => showNotify(`Viewing ${bundle.name}`)}>
                            <Eye size={12} />
                            <span>View</span>
                          </button>
                          <button type="button" className="admin-combo-btn" onClick={() => handleEditMixMatch(bundle)}>
                            <Edit size={12} />
                            <span>Edit</span>
                          </button>
                          <button type="button" className="admin-combo-btn" onClick={() => handleToggleDisableMixMatch(bundle.id, bundle.name)}>
                            <Ban size={12} />
                            <span>{bundle.status === 'disabled' ? 'Enable' : 'Disable'}</span>
                          </button>
                          <button type="button" className="admin-combo-btn archive" onClick={() => handleDeleteMixMatch(bundle.id, bundle.name)}>
                            <Trash2 size={12} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer Pagination */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '24px',
                  paddingTop: '16px',
                  borderTop: '1px solid #f0e6dd'
                }}>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>
                    Showing 1 to {filteredMixMatchRules.length} of {mixMatchRules.length} bundles
                  </span>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button
                      type="button"
                      disabled
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        background: '#fff',
                        color: '#9ca3af',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'not-allowed'
                      }}
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      type="button"
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: '#c05a1f',
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: 700,
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      1
                    </button>
                    <button
                      type="button"
                      disabled
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        background: '#fff',
                        color: '#9ca3af',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'not-allowed'
                      }}
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* TAB 7: PROMOTIONS AND DISCOUNTS */}
          {activeTab === 'promos' && (() => {
            const isPromoActive = (p) => p.status === 'active' && (!p.expiresAt || new Date(p.expiresAt).getTime() > Date.now());
            const isPromoExpired = (p) => p.status === 'expired' || (p.expiresAt && new Date(p.expiresAt).getTime() <= Date.now());
            const activePromosCount = promos.filter(isPromoActive).length;
            const scheduledPromosCount = promos.filter(p => p.status === 'scheduled').length;
            const expiredPromosList = promos.filter(isPromoExpired);
            const expiredPromosCount = expiredPromosList.length;
            const totalRedemptions = promos.reduce((sum, p) => sum + (p.currentRedemptions || 0), 0);
            const revenueImpact = promos.reduce((sum, p) => sum + (p.currentRedemptions || 0) * (p.discountValue || 0), 0);

            return (
              <div className="admin-tab-pane fade-in" style={{ maxWidth: '100%', paddingBottom: '40px' }}>
                {/* Header */}
                <div className="admin-pane-header" style={{ marginBottom: '20px' }}>
                  <div>
                    <h1 className="admin-pane-title">Promotions &amp; Discounts</h1>
                    <p className="admin-pane-sub">Active marketing campaigns, seasonal discounts, and voucher rules.</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      type="button"
                      id="btn-expired-codes-archive"
                      onClick={() => setShowExpiredArchive(true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 16px',
                        borderRadius: '10px',
                        border: '1.5px solid #fecaca',
                        background: '#fff1f2',
                        color: '#be123c',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: '0 1px 3px rgba(190, 18, 60, 0.08)'
                      }}
                      title="Open Expired Codes Archive (Admin Only)"
                    >
                      <Archive size={16} />
                      <span>Expired Codes</span>
                      {expiredPromosCount > 0 && (
                        <span style={{
                          background: '#be123c',
                          color: '#ffffff',
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '1px 8px',
                          borderRadius: '999px',
                          marginLeft: '2px'
                        }}>
                          {expiredPromosCount}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      className="admin-btn-primary"
                      onClick={() => {
                        setEditingPromo(null);
                        setFormPromo({
                          name: '',
                          code: '',
                          discountType: 'percent',
                          discountValue: 15,
                          applicableItems: [],
                          applyToAll: false,
                          targetLabel: '',
                          dateRange: 'Jan 1, 2025 – Dec 31, 2026',
                          expiresAt: '2026-12-31T23:59',
                          associatedItem: 'All Menu Items',
                          associatedTable: 'All Tables (Storewide)',
                          maxRedemptions: 500,
                          status: 'active',
                          type: 'discount'
                        });
                        setShowPromoModal(true);
                      }}
                    >
                      <Plus size={16} />
                      <span>Add Promo</span>
                    </button>
                  </div>
                </div>

                {/* 4 Top KPI Stat Cards */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                  gap: '16px',
                  marginBottom: '20px'
                }}>
                  {/* Active Campaigns */}
                  <div style={{
                    background: '#ffffff',
                    borderRadius: '14px',
                    border: '1px solid #e5e7eb',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                  }}>
                    <div style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      background: '#d1fae5',
                      color: '#059669',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Megaphone size={22} />
                    </div>
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#4b5563', marginBottom: '2px' }}>Active Campaigns</div>
                      <div style={{ fontSize: '26px', fontWeight: 800, color: '#111827', lineHeight: 1.1 }}>{activePromosCount}</div>
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                        {promos.length === 0 ? '0 campaigns active' : `out of ${promos.length} total campaign${promos.length === 1 ? '' : 's'}`}
                      </div>
                    </div>
                  </div>

                  {/* Scheduled Campaigns */}
                  <div style={{
                    background: '#ffffff',
                    borderRadius: '14px',
                    border: '1px solid #e5e7eb',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                  }}>
                    <div style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      background: '#fef3c7',
                      color: '#d97706',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Calendar size={22} />
                    </div>
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#4b5563', marginBottom: '2px' }}>Scheduled Campaigns</div>
                      <div style={{ fontSize: '26px', fontWeight: 800, color: '#111827', lineHeight: 1.1 }}>{scheduledPromosCount}</div>
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>upcoming promotions</div>
                    </div>
                  </div>

                  {/* Total Redemptions */}
                  <div style={{
                    background: '#ffffff',
                    borderRadius: '14px',
                    border: '1px solid #e5e7eb',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                  }}>
                    <div style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      background: '#e0f2fe',
                      color: '#0284c7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Users size={22} />
                    </div>
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#4b5563', marginBottom: '2px' }}>Total Redemptions</div>
                      <div style={{ fontSize: '26px', fontWeight: 800, color: '#111827', lineHeight: 1.1 }}>{totalRedemptions}</div>
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>across all campaigns</div>
                    </div>
                  </div>

                  {/* Revenue Impact */}
                  <div style={{
                    background: '#ffffff',
                    borderRadius: '14px',
                    border: '1px solid #e5e7eb',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                  }}>
                    <div style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      background: '#d1fae5',
                      color: '#059669',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <BarChart2 size={22} />
                    </div>
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#4b5563', marginBottom: '2px' }}>Revenue Impact</div>
                      <div style={{ fontSize: '26px', fontWeight: 800, color: '#111827', lineHeight: 1.1 }}>₱{revenueImpact.toLocaleString()}</div>
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>attributed to promotions</div>
                    </div>
                  </div>
                </div>

                {/* Filters Toolbar */}
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'center',
                  marginBottom: '20px',
                  flexWrap: 'wrap'
                }}>
                  {/* Search */}
                  <div style={{ position: 'relative', flex: '2 1 280px', minWidth: '220px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input
                      type="text"
                      placeholder="Search promotions (name, code, or description)..."
                      value={promoSearch}
                      onChange={e => setPromoSearch(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px 9px 36px',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        background: '#ffffff',
                        fontSize: '13px',
                        color: '#111827',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Status Filter */}
                  <select
                    value={promoStatusFilter}
                    onChange={e => setPromoStatusFilter(e.target.value)}
                    style={{
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      background: '#ffffff',
                      fontSize: '13px',
                      color: '#374151',
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                  >
                    <option value="All">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="draft">Draft</option>
                    <option value="expired">Expired</option>
                  </select>

                  {/* Type Filter */}
                  <select
                    value={promoTypeFilter}
                    onChange={e => setPromoTypeFilter(e.target.value)}
                    style={{
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      background: '#ffffff',
                      fontSize: '13px',
                      color: '#374151',
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                  >
                    <option value="All">All Promotion Types</option>
                    <option value="discount">Discounts</option>
                    <option value="combo">Combos</option>
                    <option value="bogo">BOGO</option>
                    <option value="voucher">Vouchers</option>
                  </select>

                  {/* Date Filter */}
                  <div style={{ position: 'relative' }}>
                    <select
                      value={promoDateFilter}
                      onChange={e => setPromoDateFilter(e.target.value)}
                      style={{
                        padding: '9px 14px 9px 34px',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        background: '#ffffff',
                        fontSize: '13px',
                        color: '#374151',
                        cursor: 'pointer',
                        outline: 'none'
                      }}
                    >
                      <option value="All">All Dates</option>
                      <option value="Active Now">Active Now</option>
                      <option value="This Month">This Month</option>
                      <option value="Q1 2025">Q1 2025</option>
                    </select>
                    <Calendar size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280', pointerEvents: 'none' }} />
                  </div>

                  {/* Sort By */}
                  <select
                    value={promoSortBy}
                    onChange={e => setPromoSortBy(e.target.value)}
                    style={{
                      padding: '9px 14px',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      background: '#ffffff',
                      fontSize: '13px',
                      color: '#374151',
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                  >
                    <option value="newest">Sort by: Newest First</option>
                    <option value="redemptions-desc">Sort by: Most Redemptions</option>
                    <option value="name-asc">Sort by: Name (A-Z)</option>
                  </select>
                </div>

                {/* Main 2-Column Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) 330px',
                  gap: '20px',
                  alignItems: 'start'
                }}>
                  {/* Left Column: Campaigns List */}
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#4b5563', marginBottom: '12px' }}>
                      {filteredPromos.length} campaign{filteredPromos.length === 1 ? '' : 's'} found
                    </div>

                    {promos.length === 0 ? (
                      <div style={{
                        background: '#ffffff',
                        borderRadius: '14px',
                        border: '1px dashed #d1d5db',
                        padding: '48px 24px',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                      }}>
                        <div style={{
                          width: '54px',
                          height: '54px',
                          borderRadius: '14px',
                          background: '#fff5ee',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: '14px',
                          color: '#c24522'
                        }}>
                          <Tag size={26} />
                        </div>
                        <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 800, color: '#1f2937' }}>
                          No Promotions &amp; Discounts Yet
                        </h3>
                        <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#6b7280', maxWidth: '380px', lineHeight: 1.4 }}>
                          Create active marketing campaigns, seasonal discounts, meal combo specials, or customer voucher rules to drive more sales.
                        </p>
                        <button
                          type="button"
                          className="admin-btn-primary"
                          onClick={() => {
                            setEditingPromo(null);
                            setFormPromo({
                              name: '',
                              code: '',
                              discountType: 'percent',
                              discountValue: 15,
                              applicableItems: [],
                              applyToAll: false,
                              targetLabel: '',
                              dateRange: 'Jan 1, 2025 – Dec 31, 2025',
                              maxRedemptions: 500,
                              status: 'active',
                              type: 'discount'
                            });
                            setShowPromoModal(true);
                          }}
                        >
                          <Plus size={16} />
                          <span>Create Your First Promo</span>
                        </button>
                      </div>
                    ) : filteredPromos.length === 0 ? (
                      <div style={{
                        background: '#ffffff',
                        borderRadius: '12px',
                        border: '1px solid #e5e7eb',
                        padding: '40px',
                        textAlign: 'center',
                        color: '#6b7280'
                      }}>
                        <p style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 600 }}>No promotions found matching your filter.</p>
                        <button
                          type="button"
                          className="admin-btn-secondary"
                          onClick={() => {
                            setPromoSearch('');
                            setPromoStatusFilter('All');
                            setPromoTypeFilter('All');
                            setPromoDateFilter('All');
                          }}
                        >
                          Reset Filters
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {filteredPromos.map(promo => {
                          const redPct = promo.maxRedemptions
                            ? Math.min(100, Math.round(((promo.currentRedemptions || 0) / promo.maxRedemptions) * 100))
                            : 0;

                          return (
                            <div
                              key={promo.id}
                              style={{
                                background: '#ffffff',
                                borderRadius: '14px',
                                border: '1px solid #e5e7eb',
                                padding: '14px 18px',
                                display: 'flex',
                                gap: '16px',
                                alignItems: 'center',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                                boxSizing: 'border-box',
                                overflow: 'hidden',
                                width: '100%'
                              }}
                            >
                              {/* Graphic Poster Banner */}
                              <div
                                style={{
                                  width: '155px',
                                  height: '94px',
                                  borderRadius: '10px',
                                  overflow: 'hidden',
                                  position: 'relative',
                                  background: promo.bannerBg || '#1e1b18',
                                  color: '#ffffff',
                                  flexShrink: 0,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'center',
                                  padding: '10px 12px',
                                  boxSizing: 'border-box'
                                }}
                              >
                                {promo.bannerImage && (
                                  <img
                                    src={promo.bannerImage}
                                    alt=""
                                    style={{
                                      position: 'absolute',
                                      right: '-10px',
                                      top: 0,
                                      bottom: 0,
                                      width: '65%',
                                      height: '100%',
                                      objectFit: 'cover',
                                      opacity: 0.9,
                                      pointerEvents: 'none'
                                    }}
                                  />
                                )}
                                <div
                                  style={{
                                    position: 'absolute',
                                    inset: 0,
                                    background: `linear-gradient(to right, ${promo.bannerBg || '#1e1b18'} 45%, rgba(0,0,0,0.2) 75%, transparent 100%)`,
                                    pointerEvents: 'none'
                                  }}
                                />
                                <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', maxWidth: '85px' }}>
                                  {promo.icon === '🎓' && <span style={{ fontSize: '13px', marginBottom: '2px' }}>🎓</span>}
                                  <span style={{ fontSize: '10.5px', fontWeight: 900, lineHeight: 1.05, textTransform: 'uppercase', letterSpacing: '-0.3px', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                                    {promo.bannerTitle || promo.name}
                                  </span>
                                  {promo.bannerHighlight && (
                                    <span
                                      style={{
                                        fontSize: '13px',
                                        fontWeight: 900,
                                        color: '#fde047',
                                        marginTop: '2px',
                                        lineHeight: 1.1,
                                        textShadow: '0 1px 3px rgba(0,0,0,0.7)'
                                      }}
                                    >
                                      {promo.bannerHighlight}
                                    </span>
                                  )}
                                  {promo.bannerSubtitle && (
                                    <span
                                      style={{
                                        fontSize: '8px',
                                        fontWeight: 700,
                                        marginTop: '3px',
                                        padding: '1px 4px',
                                        background: 'rgba(255,255,255,0.2)',
                                        borderRadius: '3px',
                                        width: 'fit-content'
                                      }}
                                    >
                                      {promo.bannerSubtitle}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Details & Target Labels */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                                  <span style={{ fontSize: '14px' }}>{promo.icon || '🎉'}</span>
                                  <h3 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800, color: '#111827' }}>
                                    {promo.name}
                                  </h3>
                                </div>
                                <p style={{ fontSize: '12px', color: '#4b5563', margin: '0 0 7px', lineHeight: 1.35 }}>
                                  {promo.description}
                                </p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' }}>
                                  <span
                                    style={{
                                      background: '#fff1f0',
                                      color: '#e05638',
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      padding: '2px 8px',
                                      borderRadius: '5px',
                                      border: '1px solid #ffd4cb'
                                    }}
                                  >
                                    {promo.discountLabel || (promo.discountType === 'percent' ? `${promo.discountValue}% Off` : `₱${promo.discountValue} Off`)}
                                  </span>
                                  <span
                                    style={{
                                      background: '#f3f4f6',
                                      color: '#4b5563',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      padding: '2px 8px',
                                      borderRadius: '5px'
                                    }}
                                  >
                                    {promo.targetLabel || (promo.applyToAll ? 'All Menu Items' : promo.applicableItems?.join(', ') || 'Selected Items')}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', color: '#6b7280' }}>
                                  <Calendar size={12} style={{ color: '#9ca3af' }} />
                                  <span>{promo.dateRange || 'Ongoing Campaign'}</span>
                                </div>
                              </div>

                              {/* Status and Redemptions Progress */}
                              <div style={{ width: '135px', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
                                {promo.status === 'active' && (
                                  <span
                                    style={{
                                      background: '#ecfdf5',
                                      color: '#059669',
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      padding: '3px 9px',
                                      borderRadius: '999px',
                                      border: '1px solid #a7f3d0',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                  >
                                    ✦ Active Campaign
                                  </span>
                                )}
                                {promo.status === 'scheduled' && (
                                  <span
                                    style={{
                                      background: '#fffbeb',
                                      color: '#d97706',
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      padding: '3px 9px',
                                      borderRadius: '999px',
                                      border: '1px solid #fde68a',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                  >
                                    ● Scheduled
                                  </span>
                                )}
                                {promo.status === 'draft' && (
                                  <span
                                    style={{
                                      background: '#f3f4f6',
                                      color: '#6b7280',
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      padding: '3px 9px',
                                      borderRadius: '999px',
                                      border: '1px solid #e5e7eb',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                  >
                                    🕒 Draft
                                  </span>
                                )}
                                {promo.status === 'expired' && (
                                  <span
                                    style={{
                                      background: '#fef2f2',
                                      color: '#dc2626',
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      padding: '3px 9px',
                                      borderRadius: '999px',
                                      border: '1px solid #fecaca',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                  >
                                    ✖ Expired
                                  </span>
                                )}

                                <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#374151' }}>
                                  {promo.currentRedemptions || 0} / {promo.maxRedemptions || 500} redemptions
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                                  <div style={{ flex: 1, height: '6px', background: '#e5e7eb', borderRadius: '999px', overflow: 'hidden' }}>
                                    <div
                                      style={{
                                        width: `${redPct}%`,
                                        height: '100%',
                                        background: '#10b981',
                                        borderRadius: '999px'
                                      }}
                                    />
                                  </div>
                                  <span style={{ fontSize: '10.5px', fontWeight: 600, color: '#6b7280', width: '24px', textAlign: 'right' }}>
                                    {redPct}%
                                  </span>
                                </div>
                              </div>

                              {/* Action Buttons: 145px width, overflow hidden, fully self-contained inside card */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '145px', flexShrink: 0, boxSizing: 'border-box' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                                  <button
                                    type="button"
                                    onClick={() => setPreviewPromo(promo)}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '4px',
                                      padding: '5px 4px',
                                      borderRadius: '6px',
                                      border: '1px solid #d1d5db',
                                      background: '#ffffff',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      color: '#374151',
                                      cursor: 'pointer',
                                      boxSizing: 'border-box',
                                      overflow: 'hidden',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    <Eye size={12} style={{ flexShrink: 0 }} />
                                    <span>View</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleEditPromo(promo)}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '4px',
                                      padding: '5px 4px',
                                      borderRadius: '6px',
                                      border: '1px solid #d1d5db',
                                      background: '#ffffff',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      color: '#374151',
                                      cursor: 'pointer',
                                      boxSizing: 'border-box',
                                      overflow: 'hidden',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    <Edit size={12} style={{ flexShrink: 0 }} />
                                    <span>Edit</span>
                                  </button>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleDuplicatePromo(promo)}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '4px',
                                      padding: '5px 4px',
                                      borderRadius: '6px',
                                      border: '1px solid #d1d5db',
                                      background: '#ffffff',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      color: '#374151',
                                      cursor: 'pointer',
                                      boxSizing: 'border-box',
                                      overflow: 'hidden',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    <Copy size={12} style={{ flexShrink: 0 }} />
                                    <span>Duplicate</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setShowPromoQrModal(promo)}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '4px',
                                      padding: '5px 4px',
                                      borderRadius: '6px',
                                      border: '1px solid #fed7aa',
                                      background: '#fff7ed',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      color: '#c2410c',
                                      cursor: 'pointer',
                                      boxSizing: 'border-box',
                                      overflow: 'hidden',
                                      whiteSpace: 'nowrap'
                                    }}
                                    title="View QR Code & Test Link"
                                  >
                                    <QrCode size={12} style={{ flexShrink: 0 }} />
                                    <span>QR Link</span>
                                  </button>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                                  {promo.status === 'active' ? (
                                    <button
                                      type="button"
                                      onClick={() => handleToggleStatusPromo(promo.id, promo.name, promo.status)}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '4px',
                                        padding: '5px 4px',
                                        borderRadius: '6px',
                                        border: '1px solid #d1d5db',
                                        background: '#ffffff',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        color: '#374151',
                                        cursor: 'pointer',
                                        boxSizing: 'border-box',
                                        overflow: 'hidden',
                                        whiteSpace: 'nowrap'
                                      }}
                                    >
                                      <Pause size={12} style={{ flexShrink: 0 }} />
                                      <span>Pause</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleToggleStatusPromo(promo.id, promo.name, promo.status)}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '4px',
                                        padding: '5px 4px',
                                        borderRadius: '6px',
                                        border: '1px solid #d1d5db',
                                        background: '#ffffff',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        color: '#374151',
                                        cursor: 'pointer',
                                        boxSizing: 'border-box',
                                        overflow: 'hidden',
                                        whiteSpace: 'nowrap'
                                      }}
                                    >
                                      <Play size={12} style={{ flexShrink: 0 }} />
                                      <span>Activate</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleExpirePromo(promo)}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '4px',
                                      padding: '5px 4px',
                                      borderRadius: '6px',
                                      border: '1px solid #fecaca',
                                      background: '#fef2f2',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      color: '#dc2626',
                                      cursor: 'pointer',
                                      boxSizing: 'border-box',
                                      overflow: 'hidden',
                                      whiteSpace: 'nowrap'
                                    }}
                                    title="Mark this promo as Expired immediately"
                                  >
                                    <XCircle size={12} style={{ flexShrink: 0 }} />
                                    <span>Expire</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Widgets */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Campaign Performance Bar Chart Widget */}
                    <div
                      style={{
                        background: '#ffffff',
                        borderRadius: '14px',
                        border: '1px solid #e5e7eb',
                        padding: '16px 18px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <BarChart2 size={16} style={{ color: '#059669' }} />
                          <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: 700, color: '#111827' }}>
                            Campaign Performance
                          </h4>
                        </div>
                        <select
                          value={chartMetric}
                          onChange={e => setChartMetric(e.target.value)}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            border: '1px solid #e5e7eb',
                            background: '#ffffff',
                            fontSize: '11px',
                            color: '#4b5563',
                            cursor: 'pointer',
                            outline: 'none'
                          }}
                        >
                          <option value="Redemptions">Redemptions</option>
                          <option value="Revenue">Revenue (₱)</option>
                        </select>
                      </div>

                      {/* Bar Chart Container */}
                      <div style={{ position: 'relative', height: '145px', marginTop: '10px' }}>
                        {/* Y-axis guidelines and labels */}
                        {[
                          { val: '200', top: '0%' },
                          { val: '150', top: '25%' },
                          { val: '100', top: '50%' },
                          { val: '50', top: '75%' },
                          { val: '0', top: '100%' }
                        ].map(g => (
                          <div key={g.val} style={{ position: 'absolute', top: g.top, left: 0, right: 0, display: 'flex', alignItems: 'center' }}>
                            <span style={{ fontSize: '10px', color: '#9ca3af', width: '22px', textAlign: 'right', marginRight: '8px', lineHeight: 1 }}>
                              {g.val}
                            </span>
                            <div style={{ flex: 1, borderTop: '1px dashed #e5e7eb' }} />
                          </div>
                        ))}

                        {/* 4 Bars */}
                        <div style={{ position: 'absolute', left: '32px', right: '8px', top: 0, bottom: 0, display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end' }}>
                          {(promos.length > 0 ? promos.slice(0, 4) : [
                            { id: 'b1', name: 'Grand Opening', currentRedemptions: 0 },
                            { id: 'b2', name: 'Weekend Combo', currentRedemptions: 0 },
                            { id: 'b3', name: 'Buy 1 Get 1', currentRedemptions: 0 },
                            { id: 'b4', name: 'Voucher', currentRedemptions: 0 }
                          ]).map((pItem) => {
                            const val = chartMetric === 'Revenue'
                              ? (pItem.currentRedemptions || 0) * (pItem.discountValue || 50)
                              : (pItem.currentRedemptions || 0);
                            const barHeight = Math.min(115, Math.max(val > 0 ? 8 : 2, (val / 200) * 115));

                            return (
                              <div key={pItem.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '42px' }}>
                                <span style={{ fontSize: '10.5px', fontWeight: 800, color: val > 0 ? '#1f2937' : '#9ca3af', marginBottom: '3px' }}>
                                  {val}
                                </span>
                                <div
                                  style={{
                                    width: '32px',
                                    height: `${barHeight}px`,
                                    background: val > 0 ? '#ea580c' : '#d1d5db',
                                    borderRadius: '4px 4px 0 0'
                                  }}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* X-axis labels below baseline */}
                      <div style={{ marginLeft: '32px', marginRight: '8px', marginTop: '6px', display: 'flex', justifyContent: 'space-around' }}>
                        {(promos.length > 0 ? promos.slice(0, 4) : [
                          { id: 'b1', name: 'Grand Opening' },
                          { id: 'b2', name: 'Weekend Combo' },
                          { id: 'b3', name: 'Buy 1 Get 1' },
                          { id: 'b4', name: 'Voucher' }
                        ]).map((pItem) => (
                          <div key={pItem.id} style={{ width: '48px', textAlign: 'center', fontSize: '9.5px', color: '#6b7280', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {pItem.name}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Drive More Sales Widget */}
                    <div
                      style={{
                        background: '#fffdf5',
                        borderRadius: '14px',
                        border: '1px solid #fef08a',
                        padding: '14px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '20px', lineHeight: 1 }}>💡</span>
                        <div>
                          <h4 style={{ margin: '0 0 3px', fontSize: '13px', fontWeight: 800, color: '#78350f' }}>
                            Drive More Sales
                          </h4>
                          <p style={{ margin: 0, fontSize: '11px', color: '#854d0e', lineHeight: 1.35 }}>
                            Create seasonal promos, limited-time offers, and special vouchers to keep customers coming back.
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="admin-btn-primary"
                          style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '8px' }}
                          onClick={() => {
                            setEditingPromo(null);
                            setFormPromo({
                              name: '',
                              code: '',
                              discountType: 'percent',
                              discountValue: 15,
                              applicableItems: [],
                              applyToAll: false,
                              targetLabel: '',
                              dateRange: 'Jan 1, 2025 – Dec 31, 2025',
                              maxRedemptions: 500,
                              status: 'active',
                              type: 'discount'
                            });
                            setShowPromoModal(true);
                          }}
                        >
                          <Plus size={14} />
                          <span>Add Promo</span>
                        </button>
                      </div>
                    </div>

                    {/* Quick Tips Widget */}
                    <div
                      style={{
                        background: '#ffffff',
                        borderRadius: '14px',
                        border: '1px solid #e5e7eb',
                        padding: '16px 18px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        <FileText size={16} style={{ color: '#4b5563' }} />
                        <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: 700, color: '#111827' }}>
                          Quick Tips
                        </h4>
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '11.5px', color: '#4b5563', lineHeight: 1.65 }}>
                        <li>Use eye-catching visuals for better engagement.</li>
                        <li>Set a clear redemption limit to drive urgency.</li>
                        <li>Monitor performance and adjust based on results.</li>
                        <li>Promote your campaigns on in-store and digital channels.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* TAB 8: ORDERS */}
          {activeTab === 'orders' && (
            <div className="admin-tab-pane fade-in">
              {/* Header with Live indicator & Export */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.4px' }}>
                    Orders Dashboard
                  </h1>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0 0' }}>
                    Live customer order queue, status updates, table assignments, and customer notes.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#374151', fontWeight: 500 }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                    <span>Last updated: Oct 26, 2024 2:34 PM</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#6b7280' }}>
                    <RefreshCcw size={13} color="#9ca3af" />
                    <span>Auto-refresh every 30s</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleExportOrders}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 14px',
                      background: '#ffffff',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      color: '#1f2937',
                      cursor: 'pointer',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <FileText size={14} color="#4b5563" />
                    <span>Export Orders</span>
                  </button>
                </div>
              </div>

              {/* 5 Top KPI Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, minmax(0, 1fr)) 1.35fr',
                gap: '14px',
                marginBottom: '18px'
              }}>
                {/* 1. New Orders */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '14px',
                  padding: '16px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: '#eff6ff',
                    border: '1px solid #dbeafe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <FileText size={22} color="#2563eb" />
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>New Orders</div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: '#111827', lineHeight: 1.1, margin: '2px 0' }}>
                      {orders.filter(o => o.status === 'New' || o.status === 'Received').length}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>Awaiting kitchen prep</div>
                  </div>
                </div>

                {/* 2. Preparing */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '14px',
                  padding: '16px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: '#fff7ed',
                    border: '1px solid #ffedd5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <ChefHat size={22} color="#ea580c" />
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Preparing</div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: '#111827', lineHeight: 1.1, margin: '2px 0' }}>
                      {orders.filter(o => o.status === 'Preparing' || o.status === 'Confirmed').length}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>In preparation</div>
                  </div>
                </div>

                {/* 3. Ready for Pickup */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '14px',
                  padding: '16px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: '#f0fdf4',
                    border: '1px solid #dcfce7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Sparkles size={22} color="#16a34a" />
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Ready for Pickup</div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: '#111827', lineHeight: 1.1, margin: '2px 0' }}>
                      {orders.filter(o => o.status === 'Ready' || o.status === 'Ready for Pickup').length}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>Ready to serve / call</div>
                  </div>
                </div>

                {/* 4. Completed Today */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '14px',
                  padding: '16px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: '#f3f4f6',
                    border: '1px solid #e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <CheckCircle size={22} color="#374151" />
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Completed</div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: '#111827', lineHeight: 1.1, margin: '2px 0' }}>
                      {orders.filter(o => o.status === 'Completed').length}
                    </div>
                    <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>Fulfilled orders</div>
                  </div>
                </div>

                {/* 5. Order Flow (Live) */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '14px',
                  padding: '16px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>Order Flow (Live)</span>
                    <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>● Live Queue</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                    {/* Step 1: New */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '50%',
                        background: '#dbeafe',
                        color: '#1d4ed8',
                        fontSize: '13px',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {orders.filter(o => o.status === 'New' || o.status === 'Received').length}
                      </div>
                      <span style={{ fontSize: '11px', color: '#4b5563', fontWeight: 600, marginTop: '4px' }}>New</span>
                    </div>

                    <ArrowRight size={14} color="#9ca3af" />

                    {/* Step 2: Preparing */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '50%',
                        background: '#fef3c7',
                        color: '#b45309',
                        fontSize: '13px',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {orders.filter(o => o.status === 'Preparing' || o.status === 'Confirmed').length}
                      </div>
                      <span style={{ fontSize: '11px', color: '#4b5563', fontWeight: 600, marginTop: '4px' }}>Prep</span>
                    </div>

                    <ArrowRight size={14} color="#9ca3af" />

                    {/* Step 3: Ready */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '50%',
                        background: '#dcfce7',
                        color: '#15803d',
                        fontSize: '13px',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {orders.filter(o => o.status === 'Ready' || o.status === 'Ready for Pickup').length}
                      </div>
                      <span style={{ fontSize: '11px', color: '#4b5563', fontWeight: 600, marginTop: '4px' }}>Ready</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Filter & Search Bar */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '8px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '16px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                flexWrap: 'wrap'
              }}>
                {/* Search input */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
                  <Search size={16} color="#9ca3af" />
                  <input
                    type="text"
                    placeholder="Search by Order ID or customer name..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    style={{
                      border: 'none',
                      outline: 'none',
                      fontSize: '13px',
                      color: '#1f2937',
                      width: '100%',
                      background: 'transparent'
                    }}
                  />
                </div>

                {/* Status Dropdown */}
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '7px 12px',
                    fontSize: '12.5px',
                    color: '#374151',
                    background: '#fff',
                    cursor: 'pointer',
                    fontWeight: 500,
                    outline: 'none'
                  }}
                >
                  <option value="All">All Statuses</option>
                  <option value="New">New / Received</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Preparing">Preparing</option>
                  <option value="Ready">Ready for Pickup</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>

                {/* Order Type Dropdown */}
                <select
                  value={orderTypeFilter}
                  onChange={(e) => setOrderTypeFilter(e.target.value)}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '7px 12px',
                    fontSize: '12.5px',
                    color: '#374151',
                    background: '#fff',
                    cursor: 'pointer',
                    fontWeight: 500,
                    outline: 'none'
                  }}
                >
                  <option value="All">All Order Types</option>
                  <option value="Dine-In">Dine-In</option>
                  <option value="Take-Out">Take-Out</option>
                </select>

                {/* Payments Dropdown */}
                <select
                  value={orderPaymentFilter}
                  onChange={(e) => setOrderPaymentFilter(e.target.value)}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '7px 12px',
                    fontSize: '12.5px',
                    color: '#374151',
                    background: '#fff',
                    cursor: 'pointer',
                    fontWeight: 500,
                    outline: 'none'
                  }}
                >
                  <option value="All">All Payments</option>
                  <option value="Cash">Cash</option>
                  <option value="GCash">GCash</option>
                  <option value="Card">Card</option>
                  <option value="Maya">Maya</option>
                </select>

                {/* Date Dropdown */}
                <select
                  value={orderDateFilter}
                  onChange={(e) => setOrderDateFilter(e.target.value)}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '7px 12px',
                    fontSize: '12.5px',
                    color: '#374151',
                    background: '#fff',
                    cursor: 'pointer',
                    fontWeight: 500,
                    outline: 'none'
                  }}
                >
                  <option value="All">All Dates / Today</option>
                  <option value="Today (Oct 26, 2024)">Today (Oct 26, 2024)</option>
                  <option value="Yesterday">Yesterday</option>
                  <option value="Last 7 Days">Last 7 Days</option>
                  <option value="This Month">This Month</option>
                </select>

                {/* Sort Dropdown */}
                <select
                  value={orderSortBy}
                  onChange={(e) => setOrderSortBy(e.target.value)}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '7px 12px',
                    fontSize: '12.5px',
                    color: '#374151',
                    background: '#fff',
                    cursor: 'pointer',
                    fontWeight: 500,
                    outline: 'none'
                  }}
                >
                  <option value="newest">⇅ Newest First</option>
                  <option value="oldest">⇅ Oldest First</option>
                  <option value="highest">⇅ Highest Amount</option>
                  <option value="lowest">⇅ Lowest Amount</option>
                </select>
              </div>

              {/* Rich Orders Table */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '14px',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                      <th style={{ padding: '12px 14px 12px 18px', fontSize: '12px', fontWeight: 700, color: '#4b5563' }}>Order ID & Time</th>
                      <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 700, color: '#4b5563' }}>Customer / Order Type / Location</th>
                      <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 700, color: '#4b5563' }}>Items & Details</th>
                      <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 700, color: '#4b5563' }}>Payment</th>
                      <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 700, color: '#4b5563' }}>Total</th>
                      <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 700, color: '#4b5563' }}>Status</th>
                      <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 700, color: '#4b5563' }}>Update Status</th>
                      <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 700, color: '#4b5563', textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders
                      .filter(ord => {
                        const q = orderSearch.toLowerCase().trim();
                        const matchesSearch = !q ||
                          ord.id.toLowerCase().includes(q) ||
                          (ord.customer && ord.customer.toLowerCase().includes(q)) ||
                          (ord.location && ord.location.toLowerCase().includes(q)) ||
                          (ord.items && ord.items.some(it => it.name.toLowerCase().includes(q)));

                        const matchesStatus = orderStatusFilter === 'All' ||
                          ord.status.toLowerCase() === orderStatusFilter.toLowerCase() ||
                          (orderStatusFilter === 'New' && (ord.status === 'New' || ord.status === 'Received')) ||
                          (orderStatusFilter === 'Ready' && (ord.status === 'Ready' || ord.status === 'Ready for Pickup'));
                        const matchesType = orderTypeFilter === 'All' || ord.orderType.toLowerCase() === orderTypeFilter.toLowerCase();
                        const matchesPayment = orderPaymentFilter === 'All' || ord.payment.toLowerCase() === orderPaymentFilter.toLowerCase();
                        return matchesSearch && matchesStatus && matchesType && matchesPayment;
                      })
                      .sort((a, b) => {
                        if (orderSortBy === 'oldest') return (a.id || '').localeCompare(b.id || '');
                        if (orderSortBy === 'highest') return (b.total || 0) - (a.total || 0);
                        if (orderSortBy === 'lowest') return (a.total || 0) - (b.total || 0);
                        return (b.id || '').localeCompare(a.id || '');
                      })
                      .map(ord => (
                        <tr
                          key={ord.id}
                          style={{
                            borderBottom: '1px solid #f3f4f6',
                            transition: 'background 0.15s ease'
                          }}
                        >
                          {/* 1. Order ID & Time */}
                          <td style={{ position: 'relative', padding: '14px 14px 14px 18px', verticalAlign: 'middle' }}>
                            <div style={{
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              bottom: 0,
                              width: '4px',
                              background: ord.stripeColor || '#3b82f6'
                            }} />
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                              <div>
                                <div style={{ fontWeight: 800, fontSize: '13.5px', color: '#111827' }}>#{ord.id}</div>
                                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{ord.time} ({ord.timeAgo})</div>
                              </div>
                              {ord.isWaitAlert ? (
                                <span style={{
                                  background: '#fee2e2',
                                  border: '1px solid #fecaca',
                                  borderRadius: '999px',
                                  padding: '2px 8px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  flexShrink: 0
                                }}>
                                  <span style={{
                                    width: '13px',
                                    height: '13px',
                                    borderRadius: '50%',
                                    background: '#dc2626',
                                    color: '#fff',
                                    fontSize: '9px',
                                    fontWeight: 900,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}>!</span>
                                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626' }}>{ord.waitTime}</span>
                                </span>
                              ) : (
                                <span style={{
                                  background: '#f3f4f6',
                                  borderRadius: '999px',
                                  padding: '2px 8px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  color: '#4b5563',
                                  flexShrink: 0
                                }}>
                                  {ord.waitTime}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 2. Customer / Order Type / Location */}
                          <td style={{ padding: '14px 14px', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#111827', marginBottom: '6px' }}>
                              <User size={13} color="#6b7280" />
                              <span>{ord.customer}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span style={{
                                background: ord.orderType === 'Dine-In' ? '#fff7ed' : '#eff6ff',
                                border: ord.orderType === 'Dine-In' ? '1px solid #fed7aa' : '1px solid #bfdbfe',
                                color: ord.orderType === 'Dine-In' ? '#ea580c' : '#2563eb',
                                borderRadius: '6px',
                                padding: '2px 7px',
                                fontSize: '11px',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                {ord.orderType === 'Dine-In' ? <UtensilsCrossed size={10} /> : <ShoppingBag size={10} />}
                                <span>{ord.orderType}</span>
                              </span>

                              <span style={{
                                background: '#f9fafb',
                                border: '1px solid #e5e7eb',
                                color: '#4b5563',
                                borderRadius: '6px',
                                padding: '2px 7px',
                                fontSize: '11px',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <MapPin size={10} color="#6b7280" />
                                <span>{ord.location}</span>
                              </span>
                            </div>
                          </td>

                          {/* 3. Items & Details */}
                          <td style={{ padding: '14px 14px', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                {ord.items && ord.items.map((it, idx) => (
                                  <img
                                    key={idx}
                                    src={it.image}
                                    alt={it.name}
                                    style={{
                                      width: '36px',
                                      height: '36px',
                                      borderRadius: '6px',
                                      objectFit: 'cover',
                                      border: '1px solid #e5e7eb'
                                    }}
                                    onError={(e) => {
                                      e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=150&q=80';
                                    }}
                                  />
                                ))}
                              </div>
                              <div>
                                {ord.items && ord.items.map((it, idx) => (
                                  <div key={idx} style={{ fontSize: '12px', fontWeight: 500, color: '#1f2937', lineHeight: 1.4 }}>
                                    {it.qty} × {it.name}
                                  </div>
                                ))}

                                {ord.note && (
                                  ord.isAllergy ? (
                                    <div style={{
                                      background: '#fef2f2',
                                      border: '1px solid #fecaca',
                                      color: '#dc2626',
                                      borderRadius: '6px',
                                      padding: '2px 8px',
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      marginTop: '5px'
                                    }}>
                                      <AlertTriangle size={11} color="#dc2626" />
                                      <span>{ord.note}</span>
                                    </div>
                                  ) : (
                                    <div style={{
                                      background: '#f3f4f6',
                                      border: '1px solid #e5e7eb',
                                      color: '#4b5563',
                                      borderRadius: '6px',
                                      padding: '2px 8px',
                                      fontSize: '11px',
                                      fontWeight: 500,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      marginTop: '5px'
                                    }}>
                                      <FileText size={10} color="#6b7280" />
                                      <span>{ord.note}</span>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 4. Payment */}
                          <td style={{ padding: '14px 14px', verticalAlign: 'middle' }}>
                            <span style={{
                              background: ord.payment === 'Cash' ? '#ecfdf5' :
                                          ord.payment === 'GCash' ? '#eff6ff' :
                                          ord.payment === 'Card' ? '#faf5ff' : '#f0fdf4',
                              border: ord.payment === 'Cash' ? '1px solid #a7f3d0' :
                                      ord.payment === 'GCash' ? '1px solid #bfdbfe' :
                                      ord.payment === 'Card' ? '1px solid #e9d5ff' : '1px solid #6ee7b7',
                              color: ord.payment === 'Cash' ? '#059669' :
                                     ord.payment === 'GCash' ? '#1d4ed8' :
                                     ord.payment === 'Card' ? '#7e22ce' : '#047857',
                              borderRadius: '999px',
                              padding: '3px 10px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px'
                            }}>
                              <span style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: ord.payment === 'Cash' ? '#059669' :
                                            ord.payment === 'GCash' ? '#1d4ed8' :
                                            ord.payment === 'Card' ? '#7e22ce' : '#047857'
                              }} />
                              <span>{ord.payment}</span>
                            </span>
                          </td>

                          {/* 5. Total */}
                          <td style={{ padding: '14px 14px', verticalAlign: 'middle' }}>
                            <strong style={{ fontSize: '13.5px', fontWeight: 800, color: '#111827' }}>
                              ₱{Number(ord.total || 0).toFixed(2)}
                            </strong>
                          </td>

                          {/* 6. Status */}
                          <td style={{ padding: '14px 14px', verticalAlign: 'middle' }}>
                            {(() => {
                              let bg = '#eff6ff', color = '#1d4ed8', border = '#bfdbfe';
                              if (ord.status === 'Confirmed') { bg = '#f0f9ff'; color = '#0284c7'; border = '#bae6fd'; }
                              else if (ord.status === 'Preparing') { bg = '#fffbeb'; color = '#b45309'; border = '#fde68a'; }
                              else if (ord.status === 'Cooking') { bg = '#fff7ed'; color = '#c2410c'; border = '#fed7aa'; }
                              else if (ord.status === 'Ready' || ord.status === 'Ready for Pickup') { bg = '#ecfdf5'; color = '#059669'; border = '#a7f3d0'; }
                              else if (ord.status === 'Completed') { bg = '#ecfdf5'; color = '#059669'; border = '#a7f3d0'; }
                              else if (ord.status === 'Cancelled') { bg = '#fef2f2'; color = '#dc2626'; border = '#fecaca'; }
                              return (
                                <span style={{
                                  background: bg,
                                  border: `1px solid ${border}`,
                                  color: color,
                                  borderRadius: '999px',
                                  padding: '3px 10px',
                                  fontSize: '11.5px',
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px'
                                }}>
                                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: color }} />
                                  <span>{ord.status}</span>
                                </span>
                              );
                            })()}
                          </td>

                          {/* 7. Update Status (Strict Sequential Workflow) */}
                          <td style={{ padding: '14px 14px', verticalAlign: 'middle', minWidth: '160px' }}>
                            {(() => {
                              const isCompleted = ord.status === 'Completed';
                              const isCancelled = ord.status === 'Cancelled';
                              const isUpdating = updatingOrderId === ord.id;

                              let nextActionText = 'Start Preparing';
                              let targetNextStatus = 'Preparing';
                              let btnBg = '#ffffff';
                              let btnBorder = '#d1d5db';
                              let btnColor = '#374151';
                              let hoverBg = '#f9fafb';

                              if (ord.status === 'New' || ord.status === 'Received') {
                                nextActionText = 'Start Preparing';
                                targetNextStatus = 'Preparing';
                                hoverBg = '#fff7ed';
                              } else if (ord.status === 'Preparing' || ord.status === 'Confirmed') {
                                nextActionText = 'Ready for Pickup';
                                targetNextStatus = 'Ready for Pickup';
                                hoverBg = '#ecfdf5';
                              } else if (ord.status === 'Cooking') {
                                nextActionText = 'Ready for Pickup';
                                targetNextStatus = 'Ready for Pickup';
                                hoverBg = '#ecfdf5';
                              } else if (ord.status === 'Ready' || ord.status === 'Ready for Pickup') {
                                nextActionText = 'Complete Order';
                                targetNextStatus = 'Completed';
                                hoverBg = '#dcfce7';
                              }

                              if (isCompleted) {
                                return (
                                  <div
                                    style={{
                                      width: '100%',
                                      padding: '6px 12px',
                                      fontSize: '12px',
                                      fontWeight: 600,
                                      color: '#9ca3af',
                                      background: '#f9fafb',
                                      border: '1px solid #d1d5db',
                                      borderRadius: '7px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      userSelect: 'none',
                                      boxSizing: 'border-box'
                                    }}
                                  >
                                    <span>Completed</span>
                                    <ChevronDown size={14} color="#9ca3af" />
                                  </div>
                                );
                              }

                              if (isCancelled) {
                                return (
                                  <div
                                    style={{
                                      width: '100%',
                                      padding: '6px 12px',
                                      fontSize: '12px',
                                      fontWeight: 600,
                                      color: '#dc2626',
                                      background: '#fef2f2',
                                      border: '1px solid #fecaca',
                                      borderRadius: '7px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      userSelect: 'none',
                                      boxSizing: 'border-box'
                                    }}
                                  >
                                    <span>Cancelled</span>
                                    <X size={13} color="#dc2626" />
                                  </div>
                                );
                              }

                              return (
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => handleOrderStatusUpdate(ord.id, targetNextStatus)}
                                  title={`Click to advance: ${ord.status} → ${targetNextStatus}`}
                                  style={{
                                    width: '100%',
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    color: btnColor,
                                    background: btnBg,
                                    border: `1px solid ${btnBorder}`,
                                    borderRadius: '7px',
                                    cursor: isUpdating ? 'wait' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                                    transition: 'all 0.15s ease',
                                    boxSizing: 'border-box'
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!isUpdating) e.currentTarget.style.background = hoverBg;
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!isUpdating) e.currentTarget.style.background = btnBg;
                                  }}
                                >
                                  <span>{isUpdating ? 'Updating...' : nextActionText}</span>
                                  {isUpdating ? (
                                    <Loader2 size={13} color="#6b7280" className="animate-spin" />
                                  ) : (
                                    <ChevronDown size={14} color="#6b7280" />
                                  )}
                                </button>
                              );
                            })()}
                          </td>

                          {/* 8. Actions */}
                          <td style={{ padding: '14px 14px', verticalAlign: 'middle', textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => setViewingOrder(ord)}
                                title="View Order Details"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '5px 10px',
                                  background: '#ffffff',
                                  border: '1px solid #d1d5db',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  color: '#374151',
                                  cursor: 'pointer'
                                }}
                              >
                                <Eye size={12} color="#4b5563" />
                                <span>View</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handlePrintOrder(ord)}
                                title="Print Receipt / Ticket"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  padding: '5px 8px',
                                  background: '#ffffff',
                                  border: '1px solid #d1d5db',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  color: '#374151',
                                  cursor: 'pointer'
                                }}
                              >
                                <Printer size={13} color="#4b5563" />
                              </button>

                              {ord.status === 'Completed' ? (
                                <div style={{ position: 'relative', display: 'inline-block' }}>
                                  <button
                                    type="button"
                                    onClick={() => setOrderMoreMenuId(orderMoreMenuId === ord.id ? null : ord.id)}
                                    title="More Options"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '5px 9px',
                                      background: '#ffffff',
                                      border: '1px solid #d1d5db',
                                      borderRadius: '6px',
                                      fontSize: '12px',
                                      fontWeight: 600,
                                      color: '#374151',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <MoreVertical size={13} color="#4b5563" />
                                    <span>More</span>
                                  </button>
                                  {orderMoreMenuId === ord.id && (
                                    <div style={{
                                      position: 'absolute',
                                      right: 0,
                                      top: '100%',
                                      marginTop: '4px',
                                      background: '#fff',
                                      border: '1px solid #e5e7eb',
                                      borderRadius: '8px',
                                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                                      zIndex: 30,
                                      minWidth: '160px',
                                      padding: '4px',
                                      textAlign: 'left'
                                    }}>
                                      <button
                                        type="button"
                                        onClick={() => { setViewingOrder(ord); setOrderMoreMenuId(null); }}
                                        style={{ width: '100%', padding: '6px 10px', fontSize: '12px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', borderRadius: '4px' }}
                                      >
                                        View Full Audit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => { handlePrintOrder(ord); setOrderMoreMenuId(null); }}
                                        style={{ width: '100%', padding: '6px 10px', fontSize: '12px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', borderRadius: '4px' }}
                                      >
                                        Reprint Receipt
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => { setOrderMoreMenuId(null); handleAdminStatusCorrection(ord.id, ord.status); }}
                                        style={{ width: '100%', padding: '6px 10px', fontSize: '12px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', color: '#b45309' }}
                                      >
                                        Admin Correction...
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleCancelOrder(ord.id)}
                                    title="Cancel Order"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '5px 10px',
                                      background: '#ffffff',
                                      border: '1px solid #fecaca',
                                      borderRadius: '6px',
                                      fontSize: '12px',
                                      fontWeight: 600,
                                      color: '#ef4444',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <X size={12} color="#ef4444" />
                                    <span>Cancel</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>

                {/* Table Footer with Pagination */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 18px',
                  background: '#ffffff',
                  borderTop: '1px solid #f3f4f6'
                }}>
                  <div style={{ fontSize: '12.5px', color: '#6b7280' }}>
                    Showing 1–6 of 6 orders
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      disabled
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '5px 10px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        background: '#ffffff',
                        color: '#9ca3af',
                        fontSize: '12px',
                        cursor: 'not-allowed'
                      }}
                    >
                      <ChevronLeft size={13} />
                      <span>Previous</span>
                    </button>

                    <button
                      type="button"
                      style={{
                        padding: '5px 12px',
                        background: '#e45729',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'default'
                      }}
                    >
                      1
                    </button>

                    <button
                      type="button"
                      disabled
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '5px 10px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        background: '#ffffff',
                        color: '#9ca3af',
                        fontSize: '12px',
                        cursor: 'not-allowed'
                      }}
                    >
                      <span>Next</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: KITCHEN STATUS */}
          {activeTab === 'kitchen' && (() => {
            const activeQueue = orders.filter(o => o.status !== 'Completed' && o.status !== 'Cancelled');
            const newCount = orders.filter(o => o.status === 'New' || o.status === 'Received').length;
            const prepCount = orders.filter(o => o.status === 'Preparing' || o.status === 'Confirmed').length;
            const readyCount = orders.filter(o => o.status === 'Ready' || o.status === 'Ready for Pickup' || o.status === 'Cooking').length;
            const completedCount = orders.filter(o => o.status === 'Completed').length;

            const filteredKdsOrders = orders.filter(ord => {
              if (kdsFilter === 'active') return ord.status !== 'Completed' && ord.status !== 'Cancelled';
              if (kdsFilter === 'new') return ord.status === 'New' || ord.status === 'Received';
              if (kdsFilter === 'preparing') return ord.status === 'Preparing' || ord.status === 'Confirmed';
              if (kdsFilter === 'ready') return ord.status === 'Ready' || ord.status === 'Ready for Pickup' || ord.status === 'Cooking';
              if (kdsFilter === 'completed') return ord.status === 'Completed';
              return true; // 'all'
            });

            return (
              <div className="admin-tab-pane fade-in">
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <ChefHat size={26} color="#ea580c" />
                      <span>Kitchen Display System (KDS Live Mirror)</span>
                    </h1>
                    <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0 0' }}>
                      Real-time bidirectional synchronization with Kitchen Module line cooks, timers, allergen callouts, and customer buzzer paging.
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <span style={{
                      background: internalSocketConnected ? '#ecfdf5' : '#fef2f2',
                      border: internalSocketConnected ? '1px solid #a7f3d0' : '1px solid #fecaca',
                      color: internalSocketConnected ? '#059669' : '#dc2626',
                      borderRadius: '999px',
                      padding: '5px 14px',
                      fontSize: '12px',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '7px'
                    }}>
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: internalSocketConnected ? '#10b981' : '#ef4444'
                      }} />
                      <span>{internalSocketConnected ? 'KDS Connected • Live Sync Active' : 'Offline / Reconnecting'}</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => window.open('/?view=kitchen', '_blank')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '7px 14px',
                        background: '#ffffff',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        color: '#1f2937',
                        cursor: 'pointer',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <ExternalLink size={14} color="#ea580c" />
                      <span>Open Kitchen KDS</span>
                    </button>
                  </div>
                </div>

                {/* Metrics Bar */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                  gap: '12px',
                  marginBottom: '18px'
                }}>
                  <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '14px 16px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                    <div style={{ fontSize: '11.5px', color: '#6b7280', fontWeight: 600 }}>Active Queue</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: '2px 0' }}>{activeQueue.length}</div>
                    <div style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 600 }}>Kitchen line total</div>
                  </div>

                  <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '14px 16px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                    <div style={{ fontSize: '11.5px', color: '#6b7280', fontWeight: 600 }}>New / Received</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#2563eb', margin: '2px 0' }}>{newCount}</div>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>Awaiting prep start</div>
                  </div>

                  <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '14px 16px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                    <div style={{ fontSize: '11.5px', color: '#6b7280', fontWeight: 600 }}>Preparing</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#d97706', margin: '2px 0' }}>{prepCount}</div>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>Prep station</div>
                  </div>

                  <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '14px 16px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                    <div style={{ fontSize: '11.5px', color: '#6b7280', fontWeight: 600 }}>Ready for Pickup</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#059669', margin: '2px 0' }}>{readyCount}</div>
                    <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>Pass counter / buzzer</div>
                  </div>

                  <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '14px 16px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                    <div style={{ fontSize: '11.5px', color: '#6b7280', fontWeight: 600 }}>Completed</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#374151', margin: '2px 0' }}>{completedCount}</div>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>Fulfilled orders</div>
                  </div>
                </div>

                {/* Filter Pills */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', flexWrap: 'wrap' }}>
                  {[
                    { id: 'active', label: `Active Queue (${activeQueue.length})` },
                    { id: 'new', label: `New / Received (${newCount})` },
                    { id: 'preparing', label: `Preparing (${prepCount})` },
                    { id: 'ready', label: `Ready for Pickup (${readyCount})` },
                    { id: 'completed', label: `Completed (${completedCount})` },
                    { id: 'all', label: `All Tickets (${orders.length})` }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setKdsFilter(tab.id)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        border: kdsFilter === tab.id ? '1px solid #111827' : '1px solid #e5e7eb',
                        background: kdsFilter === tab.id ? '#111827' : '#ffffff',
                        color: kdsFilter === tab.id ? '#ffffff' : '#4b5563',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Ticket Cards Grid */}
                {filteredKdsOrders.length === 0 ? (
                  <div style={{
                    background: '#ffffff',
                    border: '1px dashed #d1d5db',
                    borderRadius: '16px',
                    padding: '48px 24px',
                    textAlign: 'center',
                    color: '#6b7280'
                  }}>
                    <ChefHat size={44} color="#9ca3af" style={{ margin: '0 auto 12px' }} />
                    <h3 style={{ margin: '0 0 6px', fontSize: '17px', color: '#111827' }}>No tickets found in this queue view</h3>
                    <p style={{ margin: 0, fontSize: '13px' }}>The kitchen display queue is clear for the selected status.</p>
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                    gap: '16px'
                  }}>
                    {filteredKdsOrders.map(ticket => {
                      const isReady = ticket.status === 'Ready' || ticket.status === 'Ready for Pickup';
                      const isPrep = ticket.status === 'Preparing' || ticket.status === 'Confirmed';
                      const isNew = ticket.status === 'New' || ticket.status === 'Received';
                      const isDone = ticket.status === 'Completed';

                      let accentColor = '#3b82f6';
                      if (isPrep) accentColor = '#f59e0b';
                      if (isReady) accentColor = '#10b981';
                      if (isDone) accentColor = '#6b7280';

                      return (
                        <div
                          key={ticket.id}
                          style={{
                            background: '#ffffff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '16px',
                            overflow: 'hidden',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.04)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            position: 'relative'
                          }}
                        >
                          {/* Top accent bar */}
                          <div style={{ height: '5px', background: accentColor, width: '100%' }} />

                          <div style={{ padding: '16px 18px 14px' }}>
                            {/* Header row */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '17px', fontWeight: 800, color: '#111827' }}>#{ticket.id}</span>
                                  <span style={{
                                    background: ticket.orderType === 'Dine-In' ? '#fff7ed' : '#eff6ff',
                                    border: ticket.orderType === 'Dine-In' ? '1px solid #ffedd5' : '1px solid #dbeafe',
                                    color: ticket.orderType === 'Dine-In' ? '#c2410c' : '#1d4ed8',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    borderRadius: '6px',
                                    padding: '2px 8px'
                                  }}>
                                    {ticket.orderType || 'Dine-In'} • {ticket.location || ticket.tableId || 'Table'}
                                  </span>
                                </div>
                                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                                  Guest: <strong style={{ color: '#374151' }}>{ticket.customer || 'Guest Customer'}</strong>
                                </div>
                              </div>

                              {/* Elapsed timer badge */}
                              <div style={{
                                background: ticket.isWaitAlert ? '#fee2e2' : '#f3f4f6',
                                border: ticket.isWaitAlert ? '1px solid #fecaca' : '1px solid #e5e7eb',
                                color: ticket.isWaitAlert ? '#dc2626' : '#4b5563',
                                borderRadius: '999px',
                                padding: '3px 10px',
                                fontSize: '11px',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <Clock size={11} color={ticket.isWaitAlert ? '#dc2626' : '#6b7280'} />
                                <span>{ticket.waitTime || ticket.timeAgo || '5m'}</span>
                              </div>
                            </div>

                            {/* Allergen alert banner */}
                            {(ticket.isAllergy || (ticket.note && ticket.note.toLowerCase().includes('allerg'))) && (
                              <div style={{
                                background: '#fef2f2',
                                border: '1px solid #fecaca',
                                borderRadius: '8px',
                                padding: '6px 10px',
                                marginBottom: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                color: '#dc2626',
                                fontSize: '11.5px',
                                fontWeight: 700
                              }}>
                                <AlertTriangle size={13} color="#dc2626" flexShrink={0} />
                                <span>{ticket.note || 'ALLERGY ALERT: Special kitchen precautions required'}</span>
                              </div>
                            )}

                            {/* Non-allergy note */}
                            {ticket.note && !ticket.isAllergy && !ticket.note.toLowerCase().includes('allerg') && (
                              <div style={{
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                padding: '6px 10px',
                                marginBottom: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                color: '#475569',
                                fontSize: '11.5px'
                              }}>
                                <FileText size={12} color="#64748b" flexShrink={0} />
                                <span>Note: {ticket.note}</span>
                              </div>
                            )}

                            {/* Items List */}
                            <div style={{ background: '#f9fafb', borderRadius: '10px', padding: '10px 12px', marginBottom: '12px' }}>
                              <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>
                                Ordered Items ({ticket.items?.length || 0})
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {(ticket.items || []).map((it, idx) => (
                                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px', gap: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                                      <span style={{ fontWeight: 800, color: '#ea580c', minWidth: '18px' }}>{it.qty || 1}×</span>
                                      {it.image ? (
                                        <img
                                          src={it.image}
                                          alt={it.name}
                                          style={{ width: '34px', height: '34px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0, border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                                          onError={(e) => { e.target.style.display = 'none'; }}
                                        />
                                      ) : (
                                        <span style={{ fontSize: '16px', flexShrink: 0 }}>{it.emoji || '🍽️'}</span>
                                      )}
                                      <div style={{ minWidth: 0, flex: 1 }}>
                                        <div style={{ fontWeight: 700, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.name}</div>
                                        {it.notes && (
                                          <div style={{ fontSize: '10.5px', color: '#ea580c', fontWeight: 500 }}>
                                            ↳ {it.notes}
                                          </div>
                                        )}
                                        {it.customizations && Array.isArray(it.customizations) && (
                                          <div style={{ fontSize: '10.5px', color: '#6b7280' }}>
                                            ↳ {it.customizations.join(', ')}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>
                                      ₱{Number((it.price || 0) * (it.qty || 1)).toFixed(0)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Stepper Bar */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '10px 0 14px 0', padding: '0 4px' }}>
                              {[
                                { name: 'New', active: isNew || isPrep || isReady || isDone },
                                { name: 'Prep', active: isPrep || isReady || isDone },
                                { name: 'Ready', active: isReady || isDone },
                                { name: 'Done', active: isDone }
                              ].map((step, sIdx) => (
                                <div key={sIdx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{
                                    width: '10px',
                                    height: '10px',
                                    borderRadius: '50%',
                                    background: step.active ? accentColor : '#e5e7eb',
                                    display: 'inline-block'
                                  }} />
                                  <span style={{ fontSize: '10.5px', fontWeight: step.active ? 700 : 500, color: step.active ? '#111827' : '#9ca3af' }}>
                                    {step.name}
                                  </span>
                                  {sIdx < 3 && <div style={{ width: '12px', height: '1px', background: '#e5e7eb', margin: '0 2px' }} />}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Footer Actions */}
                          <div style={{
                            padding: '12px 18px',
                            background: '#fafafa',
                            borderTop: '1px solid #f3f4f6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px'
                          }}>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => setViewingOrder(ticket)}
                                title="View Full Order & History"
                                style={{
                                  padding: '6px 10px',
                                  background: '#ffffff',
                                  border: '1px solid #d1d5db',
                                  borderRadius: '6px',
                                  fontSize: '11.5px',
                                  fontWeight: 600,
                                  color: '#374151',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <Eye size={12} />
                                <span>Details</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handlePrintOrder(ticket)}
                                title="Print Ticket"
                                style={{
                                  padding: '6px 9px',
                                  background: '#ffffff',
                                  border: '1px solid #d1d5db',
                                  borderRadius: '6px',
                                  fontSize: '11.5px',
                                  color: '#374151',
                                  cursor: 'pointer'
                                }}
                              >
                                <Printer size={12} />
                              </button>
                            </div>

                            {/* Live View Status Indicator (Display Only - No Buttons) */}
                            <div>
                              <span style={{
                                padding: '5px 12px',
                                background: isReady ? '#ecfdf5' :
                                            isPrep ? '#fffbeb' :
                                            isDone ? '#f3f4f6' : '#eff6ff',
                                border: isReady ? '1px solid #a7f3d0' :
                                        isPrep ? '1px solid #fde68a' :
                                        isDone ? '1px solid #e5e7eb' : '1px solid #bfdbfe',
                                borderRadius: '999px',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                color: isReady ? '#059669' :
                                       isPrep ? '#b45309' :
                                       isDone ? '#374151' : '#1d4ed8',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px'
                              }}>
                                <span style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  background: isReady ? '#10b981' :
                                              isPrep ? '#f59e0b' :
                                              isDone ? '#6b7280' : '#3b82f6'
                                }} />
                                <span>{ticket.status}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* TAB 10: QR MENU MANAGEMENT */}
          {activeTab === 'qrmenu' && (
            <div className="admin-tab-pane fade-in">
              <div className="admin-pane-header">
                <div>
                  <h1 className="admin-pane-title">QR Menu &amp; Table Management</h1>
                  <p className="admin-pane-sub">Generate, download, print, activate, and regenerate live table QR codes.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const nextNum = qrTables.length + 1;
                      setNewTableData({
                        name: `Table ${nextNum} - Main Floor`,
                        id: `T-${String(nextNum).padStart(2, '0')}`,
                        section: 'Main Floor'
                      });
                      setShowAddQrModal(true);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '7px',
                      padding: '10px 18px',
                      background: '#C24522',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(194, 69, 34, 0.25)'
                    }}
                  >
                    <Plus size={16} />
                    <span>Add Table QR</span>
                  </button>
                </div>
              </div>

              {/* Destination URL Connection Bar */}
              <div style={{
                background: '#FAF5EE',
                border: '1px solid #ebdcd0',
                borderRadius: '14px',
                padding: '12px 18px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: '#ffede6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <QrCode size={20} color="#C24522" />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#1f2937' }}>
                      QR Destination: Umami Craft Fusion - Real-Time Personalized Dining
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#8a7360', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {qrBaseUrl}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <a
                    href={qrBaseUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      background: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#374151',
                      textDecoration: 'none'
                    }}
                    title="Test Open Mobile Dining in New Tab"
                  >
                    <ExternalLink size={13} />
                    <span>Test Link</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      const next = prompt('Edit Mobile App Base URL:', qrBaseUrl);
                      if (next && next.trim()) {
                        setQrBaseUrl(next.trim());
                        showNotify('Base QR URL updated!');
                      }
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      background: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#374151',
                      cursor: 'pointer'
                    }}
                  >
                    <Edit size={13} />
                    <span>Edit URL</span>
                  </button>
                </div>
              </div>

              {/* Table QR Cards Grid */}
              <div className="admin-grid-cards">
                {qrTables.map(tbl => {
                  const qrUrl = getTableQrUrl(tbl);
                  return (
                    <div key={tbl.id} className="admin-panel-card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                      {/* Active/Inactive badge */}
                      <span style={{
                        position: 'absolute',
                        top: '14px',
                        right: '14px',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '999px',
                        background: tbl.status === 'inactive' ? '#fee2e2' : '#e6f7ef',
                        color: tbl.status === 'inactive' ? '#ef4444' : '#059669'
                      }}>
                        {tbl.status === 'inactive' ? 'Inactive' : 'Active'}
                      </span>

                      {/* Real Scannable Brand QR Code */}
                      <div style={{
                        background: '#FAF5EE',
                        padding: '16px',
                        borderRadius: '16px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '12px',
                        border: '1px solid #ebdcd0',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                      }}>
                        <QRCodeSVG
                          id={`qr-svg-${tbl.id}`}
                          value={qrUrl}
                          size={110}
                          fgColor="#C24522"
                          bgColor="#FAF5EE"
                          level="M"
                          includeMargin={false}
                        />
                      </div>

                      <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 700, color: '#111827' }}>{tbl.name}</h3>
                      <p style={{ fontSize: '12px', color: '#666', margin: '0 0 6px' }}>
                        Table ID: <strong style={{ color: '#C24522' }}>{tbl.id}</strong> • Scanned {tbl.scannedCount} times
                      </p>
                      <div
                        style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '14px', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        title={qrUrl}
                      >
                        🔗 {qrUrl}
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginTop: 'auto', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => handleDownloadQR(tbl)}
                          className="admin-btn-sm"
                          style={{ cursor: 'pointer' }}
                          title="Download PNG QR image"
                        >
                          <Download size={13} />
                          <span>Download</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePrintQR(tbl)}
                          className="admin-btn-sm secondary"
                          style={{ cursor: 'pointer' }}
                          title="Print Table Tent Sticker"
                        >
                          <Printer size={13} />
                          <span>Print QR</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRegenerateQR(tbl.id)}
                          className="admin-btn-sm secondary"
                          style={{ cursor: 'pointer' }}
                          title="Regenerate QR Token"
                        >
                          <RefreshCcw size={13} />
                        </button>

                        <a
                          href={qrUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="admin-btn-sm secondary"
                          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: '#4b5563' }}
                          title="Open Destination URL in New Tab"
                        >
                          <ExternalLink size={13} />
                        </a>

                        <button
                          type="button"
                          onClick={() => handleDeleteQrTable(tbl.id)}
                          className="admin-btn-sm secondary"
                          style={{ cursor: 'pointer', color: '#ef4444' }}
                          title="Delete Table QR"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Add Table QR dashed card in grid */}
                <div
                  onClick={() => {
                    const nextNum = qrTables.length + 1;
                    setNewTableData({
                      name: `Table ${nextNum} - Main Floor`,
                      id: `T-${String(nextNum).padStart(2, '0')}`,
                      section: 'Main Floor'
                    });
                    setShowAddQrModal(true);
                  }}
                  className="admin-panel-card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px dashed #d1d5db',
                    borderRadius: '16px',
                    background: '#FAF5EE',
                    cursor: 'pointer',
                    minHeight: '260px',
                    padding: '24px 16px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    background: '#ffede6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '12px'
                  }}>
                    <Plus size={26} color="#C24522" />
                  </div>
                  <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 800, color: '#1f2937' }}>Add Table QR</h4>
                  <p style={{ margin: 0, fontSize: '12px', color: '#6b7280', textAlign: 'center', maxWidth: '200px' }}>
                    Generate a new table QR code instantly connected to Mobile Ordering
                  </p>
                </div>
              </div>

              {/* Add Table QR Modal */}
              {showAddQrModal && (() => {
                const previewId = (newTableData.id.trim() || `T-${String(qrTables.length + 1).padStart(2, '0')}`).toUpperCase();
                const previewUrl = `${(qrBaseUrl || '').trim() || 'http://192.168.1.16:3000/?view=mobile&kioskId=RT62AL&kioskPort=3001&restaurant=umami'}&tableId=${encodeURIComponent(previewId)}`;

                return (
                  <div className="staff-pin-backdrop" style={{ zIndex: 100095 }} onClick={() => setShowAddQrModal(false)}>
                    <div
                      className="admin-modal-card"
                      onClick={e => e.stopPropagation()}
                      style={{ maxWidth: '520px', borderRadius: '20px', padding: 0, overflow: 'hidden' }}
                    >
                      <div style={{
                        padding: '18px 24px',
                        background: '#C24522',
                        color: '#ffffff',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <QrCode size={20} color="#ffffff" />
                          <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#ffffff' }}>
                            Generate New Table QR Code
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowAddQrModal(false)}
                          style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#ffffff', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <form onSubmit={handleCreateNewQrTable} style={{ padding: '24px' }}>
                        {/* Live Preview Box */}
                        <div style={{
                          background: '#FAF5EE',
                          border: '1px solid #ebdcd0',
                          borderRadius: '16px',
                          padding: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px',
                          marginBottom: '20px'
                        }}>
                          <div style={{
                            background: '#ffffff',
                            padding: '10px',
                            borderRadius: '12px',
                            border: '1px solid #e5e7eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <QRCodeSVG
                              value={previewUrl}
                              size={84}
                              fgColor="#C24522"
                              bgColor="#ffffff"
                              level="M"
                            />
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: '11px', fontWeight: 800, color: '#C24522', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Live QR Preview</div>
                            <div style={{ fontSize: '15px', fontWeight: 800, color: '#111827', margin: '2px 0' }}>{newTableData.name || 'New Table'}</div>
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>Table ID: <strong>{previewId}</strong> • {newTableData.section}</div>
                            <div style={{ fontSize: '10px', color: '#9ca3af', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '4px' }}>
                              {previewUrl}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '22px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                              Table Name / Label *
                            </label>
                            <input
                              type="text"
                              required
                              value={newTableData.name}
                              onChange={e => setNewTableData(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="e.g. Table 6 - Patio Booth"
                              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box' }}
                            />
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                                Table ID *
                              </label>
                              <input
                                type="text"
                                required
                                value={newTableData.id}
                                onChange={e => setNewTableData(prev => ({ ...prev, id: e.target.value.toUpperCase() }))}
                                placeholder="e.g. T-06"
                                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box' }}
                              />
                            </div>

                            <div>
                              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                                Area / Section
                              </label>
                              <select
                                value={newTableData.section}
                                onChange={e => setNewTableData(prev => ({ ...prev, section: e.target.value }))}
                                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', background: '#fff', boxSizing: 'border-box' }}
                              >
                                <option value="Main Floor">Main Floor</option>
                                <option value="Window Side">Window Side</option>
                                <option value="Booth A">Booth A</option>
                                <option value="Booth B">Booth B</option>
                                <option value="Patio Garden">Patio Garden</option>
                                <option value="VIP Lounge">VIP Lounge</option>
                                <option value="Bar Counter">Bar Counter</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => setShowAddQrModal(false)}
                            style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#ffffff', fontSize: '13px', fontWeight: 600, color: '#4b5563', cursor: 'pointer' }}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: '#C24522', fontSize: '13px', fontWeight: 700, color: '#ffffff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 6px rgba(194, 69, 34, 0.3)' }}
                          >
                            <QrCode size={15} />
                            <span>Generate Table QR Code</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 11: INVENTORY & STOCK CONTROLS */}
          {activeTab === 'inventory' && (() => {
            const totalInventoryCount = filteredInventoryItems.length;
            const inStockCount = filteredInventoryItems.filter(i => i.status === 'In Stock').length;
            const lowStockCount = filteredInventoryItems.filter(i => i.status === 'Low Stock').length;
            const outStockCount = filteredInventoryItems.filter(i => i.status === 'Out of Stock').length;
            const inStockPct = totalInventoryCount > 0 ? Math.round((inStockCount / totalInventoryCount) * 100) : 100;
            const lowStockPct = totalInventoryCount > 0 ? Math.round((lowStockCount / totalInventoryCount) * 100) : 0;
            const outStockPct = totalInventoryCount > 0 ? Math.round((outStockCount / totalInventoryCount) * 100) : 0;

            const INVENTORY_PAGE_SIZE = 6;
            const totalPages = Math.ceil(totalInventoryCount / INVENTORY_PAGE_SIZE) || 1;
            const safePage = Math.min(inventoryPage, totalPages);
            const paginatedItems = filteredInventoryItems.slice((safePage - 1) * INVENTORY_PAGE_SIZE, safePage * INVENTORY_PAGE_SIZE);

            const allSelected = paginatedItems.length > 0 && paginatedItems.every(i => selectedInventoryIds.has(i.id));

            const toggleSelectAll = () => {
              if (allSelected) {
                const next = new Set(selectedInventoryIds);
                paginatedItems.forEach(i => next.delete(i.id));
                setSelectedInventoryIds(next);
              } else {
                const next = new Set(selectedInventoryIds);
                paginatedItems.forEach(i => next.add(i.id));
                setSelectedInventoryIds(next);
              }
            };

            const toggleSelectItem = (id) => {
              const next = new Set(selectedInventoryIds);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              setSelectedInventoryIds(next);
            };

            return (
              <div className="admin-tab-pane fade-in">
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px', flexWrap: 'wrap', gap: '14px' }}>
                  <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.3px' }}>
                      Inventory &amp; Stock Controls
                    </h1>
                    <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0 0' }}>
                      Automatic stock deduction, low-stock alerts, waste logs, and restocking controls.
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setShowAddStockModal(true)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        background: '#e45729',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#ffffff',
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(228, 87, 41, 0.25)'
                      }}
                    >
                      <Plus size={16} />
                      <span>Add Stock Item</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleExportInventory}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        background: '#ffffff',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#374151',
                        cursor: 'pointer',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                      }}
                    >
                      <Download size={15} color="#4b5563" />
                      <span>Export Inventory</span>
                    </button>
                  </div>
                </div>

                {/* 5 Top KPI Cards */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, minmax(0, 1fr)) 1.35fr',
                  gap: '14px',
                  marginBottom: '16px'
                }}>
                  {/* 1. Total Products */}
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '14px',
                    padding: '16px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                  }}>
                    <div style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      background: '#eff6ff',
                      border: '1px solid #dbeafe',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Package size={22} color="#2563eb" />
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Total Products</div>
                      <div style={{ fontSize: '26px', fontWeight: 800, color: '#111827', lineHeight: 1.1, margin: '2px 0' }}>
                        {totalInventoryCount}
                      </div>
                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>Across all categories</div>
                    </div>
                  </div>

                  {/* 2. In Stock */}
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '14px',
                    padding: '16px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                  }}>
                    <div style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      background: '#f0fdf4',
                      border: '1px solid #dcfce7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <CheckCircle size={22} color="#16a34a" />
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>In Stock</div>
                      <div style={{ fontSize: '26px', fontWeight: 800, color: '#111827', lineHeight: 1.1, margin: '2px 0' }}>
                        {inStockCount}
                      </div>
                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>{inStockPct}% of products</div>
                    </div>
                  </div>

                  {/* 3. Low Stock */}
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '14px',
                    padding: '16px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                  }}>
                    <div style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      background: '#fffbeb',
                      border: '1px solid #fef3c7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <AlertTriangle size={22} color="#d97706" />
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Low Stock</div>
                      <div style={{ fontSize: '26px', fontWeight: 800, color: '#111827', lineHeight: 1.1, margin: '2px 0' }}>
                        {lowStockCount}
                      </div>
                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>Below reorder level</div>
                    </div>
                  </div>

                  {/* 4. Out of Stock */}
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '14px',
                    padding: '16px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                  }}>
                    <div style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      background: '#fef2f2',
                      border: '1px solid #fee2e2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <XCircle size={22} color="#dc2626" />
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Out of Stock</div>
                      <div style={{ fontSize: '26px', fontWeight: 800, color: '#111827', lineHeight: 1.1, margin: '2px 0' }}>
                        {outStockCount}
                      </div>
                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>Requires immediate attention</div>
                    </div>
                  </div>

                  {/* 5. Inventory Health Card */}
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '14px',
                    padding: '14px 18px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#111827' }}>Inventory Health</span>
                      <Info size={13} color="#9ca3af" />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '4px' }}>
                      {/* Donut chart */}
                      <div style={{ position: 'relative', width: '66px', height: '66px', flexShrink: 0 }}>
                        <svg width="66" height="66" viewBox="0 0 36 36">
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="#f3f4f6"
                            strokeWidth="3.8"
                          />
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="#059669"
                            strokeWidth="3.8"
                            strokeDasharray={`${inStockPct}, 100`}
                            strokeLinecap="round"
                          />
                          <text x="18" y="21" textAnchor="middle" fontSize="8" fontWeight="800" fill="#111827">
                            {inStockPct}%
                          </text>
                        </svg>
                      </div>

                      {/* Legend details */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#111827' }}>
                          {inStockPct === 100 ? 'Healthy Inventory' : inStockPct >= 70 ? 'Moderate Inventory' : 'Attention Needed'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
                          {inStockPct === 100 ? 'All products are in stock' : `${lowStockCount + outStockCount} items need attention`}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '10.5px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669' }} />
                            <span style={{ color: '#4b5563' }}>In Stock:</span>
                            <strong style={{ color: '#111827' }}>{inStockCount} ({inStockPct}%)</strong>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b' }} />
                            <span style={{ color: '#4b5563' }}>Low Stock:</span>
                            <strong style={{ color: '#111827' }}>{lowStockCount} ({lowStockPct}%)</strong>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }} />
                            <span style={{ color: '#4b5563' }}>Out of Stock:</span>
                            <strong style={{ color: '#111827' }}>{outStockCount} ({outStockPct}%)</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sub-tabs & Stock Notice Row */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '14px',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}>
                  {/* Left Tabs */}
                  <div style={{ display: 'inline-flex', background: '#f3f4f6', borderRadius: '8px', padding: '3px' }}>
                    <button
                      type="button"
                      onClick={() => setInventorySubTab('stock')}
                      style={{
                        padding: '6px 14px',
                        background: inventorySubTab === 'stock' ? '#ffffff' : 'transparent',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12.5px',
                        fontWeight: inventorySubTab === 'stock' ? 700 : 500,
                        color: inventorySubTab === 'stock' ? '#111827' : '#6b7280',
                        cursor: 'pointer',
                        boxShadow: inventorySubTab === 'stock' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      Product Stock
                    </button>

                    <button
                      type="button"
                      onClick={() => setInventorySubTab('history')}
                      style={{
                        padding: '6px 14px',
                        background: inventorySubTab === 'history' ? '#ffffff' : 'transparent',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12.5px',
                        fontWeight: inventorySubTab === 'history' ? 700 : 500,
                        color: inventorySubTab === 'history' ? '#111827' : '#6b7280',
                        cursor: 'pointer',
                        boxShadow: inventorySubTab === 'history' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      Restock History
                    </button>

                    <button
                      type="button"
                      onClick={() => setInventorySubTab('waste')}
                      style={{
                        padding: '6px 14px',
                        background: inventorySubTab === 'waste' ? '#ffffff' : 'transparent',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12.5px',
                        fontWeight: inventorySubTab === 'waste' ? 700 : 500,
                        color: inventorySubTab === 'waste' ? '#111827' : '#6b7280',
                        cursor: 'pointer',
                        boxShadow: inventorySubTab === 'waste' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      Waste Logs
                    </button>
                  </div>

                  {/* Right Notice */}
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#2563eb', fontSize: '12px' }}>
                    <Info size={14} color="#2563eb" />
                    <span>Stock automatically deducts when an order is confirmed.</span>
                  </div>
                </div>

                {/* Filters & Search Toolbar */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '14px',
                  flexWrap: 'wrap'
                }}>
                  {/* Search */}
                  <div style={{
                    flex: '1.6',
                    minWidth: '220px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '6px 12px'
                  }}>
                    <Search size={15} color="#9ca3af" />
                    <input
                      type="text"
                      value={inventorySearch}
                      onChange={(e) => {
                        setInventorySearch(e.target.value);
                        setInventoryPage(1);
                      }}
                      placeholder="Search products by name or SKU..."
                      style={{
                        border: 'none',
                        background: 'transparent',
                        outline: 'none',
                        fontSize: '12.5px',
                        width: '100%',
                        color: '#111827'
                      }}
                    />
                  </div>

                  {/* Category Filter */}
                  <select
                    value={inventoryCategoryFilter}
                    onChange={(e) => {
                      setInventoryCategoryFilter(e.target.value);
                      setInventoryPage(1);
                    }}
                    style={{
                      padding: '6px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '12.5px',
                      background: '#ffffff',
                      color: '#374151',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="All">All Categories</option>
                    <option value="Food">Food Menu</option>
                    <option value="Drinks">Drinks &amp; Beverages</option>
                    <option value="Appetizers">Appetizers</option>
                    <option value="Noodles">Noodles</option>
                    <option value="Rice Bowls">Rice Bowls</option>
                    <option value="Desserts">Desserts</option>
                    <option value="Milk Tea">Milk Tea</option>
                    <option value="Fruit Shake">Fruit Shake</option>
                    <option value="Iced Tea">Iced Tea</option>
                    <option value="Bottled Drinks">Bottled Drinks</option>
                  </select>

                  {/* Stock Status Filter */}
                  <select
                    value={inventoryStatusFilter}
                    onChange={(e) => {
                      setInventoryStatusFilter(e.target.value);
                      setInventoryPage(1);
                    }}
                    style={{
                      padding: '6px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '12.5px',
                      background: '#ffffff',
                      color: '#374151',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="All">All Stock Status</option>
                    <option value="In Stock">In Stock</option>
                    <option value="Low Stock">Low Stock</option>
                    <option value="Out of Stock">Out of Stock</option>
                  </select>

                  {/* Sort By Filter */}
                  <select
                    value={inventorySortBy}
                    onChange={(e) => setInventorySortBy(e.target.value)}
                    style={{
                      padding: '6px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '12.5px',
                      background: '#ffffff',
                      color: '#374151',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="name-asc">Sort by: Product Name</option>
                    <option value="stock-desc">Sort by: Stock (High to Low)</option>
                    <option value="stock-asc">Sort by: Stock (Low to High)</option>
                    <option value="sku">Sort by: SKU</option>
                  </select>
                </div>

                {/* Sub-Tab 1: Product Stock Table */}
                {inventorySubTab === 'stock' && (
                  <>
                    <div style={{
                      background: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '14px',
                      overflow: 'hidden',
                      marginBottom: '16px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                    }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>
                            <th style={{ padding: '12px 14px', width: '38px', textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={toggleSelectAll}
                                style={{ cursor: 'pointer', accentColor: '#e45729' }}
                              />
                            </th>
                            <th style={{ padding: '12px 14px' }}>Product Name</th>
                            <th style={{ padding: '12px 14px' }}>Category</th>
                            <th style={{ padding: '12px 14px' }}>Current Stock</th>
                            <th style={{ padding: '12px 14px' }}>Reorder Level</th>
                            <th style={{ padding: '12px 14px' }}>Stock Level</th>
                            <th style={{ padding: '12px 14px' }}>Status</th>
                            <th style={{ padding: '12px 14px' }}>Last Updated</th>
                            <th style={{ padding: '12px 14px', textAlign: 'center' }}>Quick Restock</th>
                            <th style={{ padding: '12px 14px', textAlign: 'center', width: '50px' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedItems.length === 0 ? (
                            <tr>
                              <td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: '#9ca3af', fontSize: '13px' }}>
                                No products found matching your search or filters.
                              </td>
                            </tr>
                          ) : (
                            paginatedItems.map((item) => {
                              const isSelected = selectedInventoryIds.has(item.id);
                              const stepperVal = quickRestockAmounts[item.id] !== undefined ? quickRestockAmounts[item.id] : 20;

                              return (
                                <tr
                                  key={item.id}
                                  style={{
                                    borderBottom: '1px solid #f3f4f6',
                                    background: isSelected ? '#fff7ed' : '#ffffff',
                                    transition: 'background 0.15s ease'
                                  }}
                                >
                                  {/* Checkbox */}
                                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleSelectItem(item.id)}
                                      style={{ cursor: 'pointer', accentColor: '#e45729' }}
                                    />
                                  </td>

                                  {/* Product Name + Image + SKU */}
                                  <td style={{ padding: '12px 14px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <img
                                        src={item.image}
                                        alt={item.name}
                                        style={{
                                          width: '38px',
                                          height: '38px',
                                          borderRadius: '8px',
                                          objectFit: 'cover',
                                          border: '1px solid #e5e7eb',
                                          flexShrink: 0
                                        }}
                                        onError={(e) => {
                                          e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80';
                                        }}
                                      />
                                      <div>
                                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#111827' }}>
                                          {item.name}
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#6b7280' }}>
                                          SKU: {item.sku}
                                        </div>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Category */}
                                  <td style={{ padding: '12px 14px', fontSize: '12.5px', color: '#374151' }}>
                                    {item.category}
                                  </td>

                                  {/* Current Stock */}
                                  <td style={{ padding: '12px 14px', fontSize: '12.5px', fontWeight: 700, color: '#111827' }}>
                                    {item.stock} units
                                  </td>

                                  {/* Reorder Level */}
                                  <td style={{ padding: '12px 14px', fontSize: '12px', color: '#4b5563' }}>
                                    {item.reorderLevel} units
                                  </td>

                                  {/* Stock Level Bar */}
                                  <td style={{ padding: '12px 14px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <div style={{
                                        width: '74px',
                                        height: '6px',
                                        background: '#e5e7eb',
                                        borderRadius: '999px',
                                        overflow: 'hidden'
                                      }}>
                                        <div style={{
                                          width: `${Math.min(100, item.stockLevelPercent)}%`,
                                          height: '100%',
                                          background: item.status === 'In Stock' ? '#059669' : item.status === 'Low Stock' ? '#f59e0b' : '#ef4444',
                                          borderRadius: '999px'
                                        }} />
                                      </div>
                                      <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#4b5563' }}>
                                        {item.stockLevelPercent}%
                                      </span>
                                    </div>
                                  </td>

                                  {/* Status */}
                                  <td style={{ padding: '12px 14px' }}>
                                    <span style={{
                                      display: 'inline-block',
                                      padding: '3px 9px',
                                      borderRadius: '999px',
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      background: item.status === 'In Stock' ? '#ecfdf5' : item.status === 'Low Stock' ? '#fffbeb' : '#fef2f2',
                                      border: item.status === 'In Stock' ? '1px solid #a7f3d0' : item.status === 'Low Stock' ? '1px solid #fde68a' : '1px solid #fecaca',
                                      color: item.status === 'In Stock' ? '#059669' : item.status === 'Low Stock' ? '#d97706' : '#dc2626'
                                    }}>
                                      {item.status}
                                    </span>
                                  </td>

                                  {/* Last Updated */}
                                  <td style={{ padding: '12px 14px', fontSize: '11.5px', color: '#6b7280' }}>
                                    {item.lastUpdated}
                                  </td>

                                  {/* Quick Restock Stepper & Button */}
                                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                      {/* Stepper */}
                                      <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid #e5e7eb', borderRadius: '6px', overflow: 'hidden', background: '#ffffff' }}>
                                        <button
                                          type="button"
                                          onClick={() => handleStepperChange(item.id, -5)}
                                          style={{
                                            width: '24px',
                                            height: '26px',
                                            border: 'none',
                                            background: '#f9fafb',
                                            color: '#4b5563',
                                            fontSize: '13px',
                                            fontWeight: 700,
                                            cursor: 'pointer'
                                          }}
                                        >
                                          -
                                        </button>
                                        <span style={{
                                          minWidth: '28px',
                                          textAlign: 'center',
                                          fontSize: '12px',
                                          fontWeight: 700,
                                          color: '#111827'
                                        }}>
                                          {stepperVal}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleStepperChange(item.id, 5)}
                                          style={{
                                            width: '24px',
                                            height: '26px',
                                            border: 'none',
                                            background: '#f9fafb',
                                            color: '#4b5563',
                                            fontSize: '13px',
                                            fontWeight: 700,
                                            cursor: 'pointer'
                                          }}
                                        >
                                          +
                                        </button>
                                      </div>

                                      {/* Restock Button */}
                                      <button
                                        type="button"
                                        onClick={() => handleRestockInventory(item, stepperVal)}
                                        style={{
                                          padding: '5px 14px',
                                          background: '#e45729',
                                          border: 'none',
                                          borderRadius: '6px',
                                          fontSize: '12px',
                                          fontWeight: 700,
                                          color: '#ffffff',
                                          cursor: 'pointer',
                                          boxShadow: '0 1px 3px rgba(228, 87, 41, 0.2)'
                                        }}
                                      >
                                        Restock
                                      </button>
                                    </div>
                                  </td>

                                  {/* Actions */}
                                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        showNotify(`Product "${item.name}" details: Stock ${item.stock}, Reorder level ${item.reorderLevel}`);
                                      }}
                                      style={{
                                        width: '28px',
                                        height: '28px',
                                        background: '#ffffff',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        color: '#6b7280'
                                      }}
                                    >
                                      <MoreHorizontal size={14} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>

                      {/* Bulk actions & Pagination bar */}
                      <div style={{
                        padding: '12px 16px',
                        background: '#ffffff',
                        borderTop: '1px solid #e5e7eb',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '12px'
                      }}>
                        {/* Bulk actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '12.5px', color: '#4b5563' }}>Bulk actions:</span>
                          <select
                            value={bulkAction}
                            onChange={(e) => setBulkAction(e.target.value)}
                            style={{
                              padding: '5px 10px',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              fontSize: '12px',
                              background: '#ffffff',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="">Select action</option>
                            <option value="restock20">Restock +20</option>
                            <option value="markInStock">Mark In Stock</option>
                            <option value="markLowStock">Mark Low Stock</option>
                          </select>
                          <button
                            type="button"
                            onClick={handleApplyBulkAction}
                            style={{
                              padding: '5px 14px',
                              background: '#f3f4f6',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#374151',
                              cursor: 'pointer'
                            }}
                          >
                            Apply
                          </button>
                        </div>

                        {/* Showing count */}
                        <div style={{ fontSize: '12.5px', color: '#6b7280' }}>
                          Showing {totalInventoryCount === 0 ? '0' : `1-${Math.min(totalInventoryCount, 6)}`} of {totalInventoryCount} products
                        </div>

                        {/* Pagination */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            type="button"
                            disabled={safePage <= 1}
                            onClick={() => setInventoryPage(p => Math.max(1, p - 1))}
                            style={{
                              width: '28px',
                              height: '28px',
                              border: '1px solid #e5e7eb',
                              borderRadius: '6px',
                              background: '#ffffff',
                              color: safePage <= 1 ? '#d1d5db' : '#4b5563',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: safePage <= 1 ? 'not-allowed' : 'pointer'
                            }}
                          >
                            <ChevronLeft size={14} />
                          </button>

                          <button
                            type="button"
                            style={{
                              width: '28px',
                              height: '28px',
                              border: 'none',
                              borderRadius: '6px',
                              background: '#e45729',
                              color: '#ffffff',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'default',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            {safePage}
                          </button>

                          <button
                            type="button"
                            disabled={safePage >= totalPages}
                            onClick={() => setInventoryPage(p => Math.min(totalPages, p + 1))}
                            style={{
                              width: '28px',
                              height: '28px',
                              border: '1px solid #e5e7eb',
                              borderRadius: '6px',
                              background: '#ffffff',
                              color: safePage >= totalPages ? '#d1d5db' : '#4b5563',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: safePage >= totalPages ? 'not-allowed' : 'pointer'
                            }}
                          >
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Dual Bottom Section: Recent Stock Activity & Stock Level Distribution */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1.6fr 1fr',
                      gap: '16px'
                    }}>
                      {/* Left: Recent Stock Activity */}
                      <div style={{
                        background: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '14px',
                        padding: '18px 20px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#111827' }}>
                            Recent Stock Activity
                          </h3>
                          <button
                            type="button"
                            onClick={() => setInventorySubTab('history')}
                            style={{
                              background: 'none',
                              border: 'none',
                              fontSize: '12.5px',
                              color: '#e45729',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            View All
                          </button>
                        </div>

                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid #e5e7eb', fontSize: '11.5px', color: '#6b7280' }}>
                              <th style={{ padding: '8px 6px' }}>Time</th>
                              <th style={{ padding: '8px 6px' }}>Product</th>
                              <th style={{ padding: '8px 6px' }}>Type</th>
                              <th style={{ padding: '8px 6px' }}>Quantity</th>
                              <th style={{ padding: '8px 6px' }}>Notes</th>
                              <th style={{ padding: '8px 6px' }}>User</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stockActivities.slice(0, 4).map((act, idx) => (
                              <tr key={act.id || idx} style={{ borderBottom: '1px solid #f3f4f6', fontSize: '12px' }}>
                                <td style={{ padding: '10px 6px', color: '#6b7280' }}>{act.time}</td>
                                <td style={{ padding: '10px 6px', fontWeight: 600, color: '#111827' }}>{act.product}</td>
                                <td style={{ padding: '10px 6px' }}>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#2563eb', fontWeight: 600 }}>
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2563eb' }} />
                                    {act.type}
                                  </span>
                                </td>
                                <td style={{ padding: '10px 6px', color: '#4b5563' }}>{act.quantity}</td>
                                <td style={{ padding: '10px 6px', color: '#6b7280' }}>{act.notes}</td>
                                <td style={{ padding: '10px 6px', color: '#4b5563', fontWeight: 600 }}>{act.user}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Right: Stock Level Distribution */}
                      <div style={{
                        background: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '14px',
                        padding: '18px 20px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#111827' }}>
                            Stock Level Distribution
                          </h3>
                          <Info size={13} color="#9ca3af" />
                        </div>

                        {/* Donut & Legend */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', margin: '14px 0' }}>
                          <div style={{ position: 'relative', width: '84px', height: '84px' }}>
                            <svg width="84" height="84" viewBox="0 0 36 36">
                              <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="#f3f4f6"
                                strokeWidth="3.8"
                              />
                              <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="#059669"
                                strokeWidth="3.8"
                                strokeDasharray={`${inStockPct}, 100`}
                                strokeLinecap="round"
                              />
                              <text x="18" y="18" textAnchor="middle" fontSize="9" fontWeight="800" fill="#111827">
                                {totalInventoryCount}
                              </text>
                              <text x="18" y="24" textAnchor="middle" fontSize="3.5" fill="#6b7280">
                                Products
                              </text>
                            </svg>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#059669' }} />
                              <span style={{ color: '#4b5563' }}>In Stock</span>
                              <strong style={{ color: '#111827', marginLeft: 'auto' }}>{inStockCount} ({inStockPct}%)</strong>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
                              <span style={{ color: '#4b5563' }}>Low Stock</span>
                              <strong style={{ color: '#111827', marginLeft: 'auto' }}>{lowStockCount} ({lowStockPct}%)</strong>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                              <span style={{ color: '#4b5563' }}>Out of Stock</span>
                              <strong style={{ color: '#111827', marginLeft: 'auto' }}>{outStockCount} ({outStockPct}%)</strong>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Banner */}
                        <div style={{
                          background: inStockPct === 100 ? '#ecfdf5' : '#fffbeb',
                          border: inStockPct === 100 ? '1px solid #a7f3d0' : '1px solid #fde68a',
                          borderRadius: '10px',
                          padding: '10px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px'
                        }}>
                          <CheckCircle size={18} color={inStockPct === 100 ? '#059669' : '#d97706'} />
                          <div>
                            <div style={{ fontSize: '12.5px', fontWeight: 700, color: inStockPct === 100 ? '#065f46' : '#92400e' }}>
                              {inStockPct === 100 ? 'Great! All products are in stock.' : 'Attention: some items are low on stock.'}
                            </div>
                            <div style={{ fontSize: '11px', color: inStockPct === 100 ? '#047857' : '#b45309' }}>
                              {inStockPct === 100 ? 'Your inventory levels are healthy.' : 'Consider restocking low items before next shift.'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Sub-Tab 2: Restock History */}
                {inventorySubTab === 'history' && (
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '14px',
                    padding: '20px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                  }}>
                    <h3 style={{ margin: '0 0 14px 0', fontSize: '16px', fontWeight: 800, color: '#111827' }}>
                      Complete Restock History
                    </h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontSize: '12px', color: '#6b7280' }}>
                          <th style={{ padding: '10px 12px' }}>Date &amp; Time</th>
                          <th style={{ padding: '10px 12px' }}>Product</th>
                          <th style={{ padding: '10px 12px' }}>Event Type</th>
                          <th style={{ padding: '10px 12px' }}>Units Added</th>
                          <th style={{ padding: '10px 12px' }}>Restocked By</th>
                          <th style={{ padding: '10px 12px' }}>Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stockActivities.map((act) => (
                          <tr key={act.id} style={{ borderBottom: '1px solid #f3f4f6', fontSize: '12.5px' }}>
                            <td style={{ padding: '10px 12px', color: '#6b7280' }}>{act.time}</td>
                            <td style={{ padding: '10px 12px', fontWeight: 700, color: '#111827' }}>{act.product}</td>
                            <td style={{ padding: '10px 12px' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#2563eb', fontWeight: 600 }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2563eb' }} />
                                {act.type}
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px', fontWeight: 700, color: '#059669' }}>{act.quantity}</td>
                            <td style={{ padding: '10px 12px', color: '#374151' }}>{act.user}</td>
                            <td style={{ padding: '10px 12px', color: '#6b7280' }}>{act.notes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Sub-Tab 3: Waste Logs */}
                {inventorySubTab === 'waste' && (
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '14px',
                    padding: '20px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#111827' }}>
                        Spoilage &amp; Waste Logs
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          const item = prompt('Enter item name for waste record:');
                          if (item) {
                            const qty = prompt('Enter wasted units:') || '1';
                            const reason = prompt('Enter reason (e.g. dropped, expired):') || 'Damaged';
                            const newWaste = {
                              id: `W-${Date.now()}`,
                              time: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                              item,
                              qty: Number(qty),
                              reason,
                              user: 'Staff',
                              cost: `₱${(Number(qty) * 200).toFixed(2)}`
                            };
                            setWasteLogs(prev => [newWaste, ...prev]);
                            showNotify(`Waste record added for "${item}"`);
                          }
                        }}
                        style={{
                          padding: '6px 14px',
                          background: '#dc2626',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        + Log Spoilage
                      </button>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontSize: '12px', color: '#6b7280' }}>
                          <th style={{ padding: '10px 12px' }}>Timestamp</th>
                          <th style={{ padding: '10px 12px' }}>Item Wasted</th>
                          <th style={{ padding: '10px 12px' }}>Quantity</th>
                          <th style={{ padding: '10px 12px' }}>Reason</th>
                          <th style={{ padding: '10px 12px' }}>Reported By</th>
                          <th style={{ padding: '10px 12px' }}>Cost Impact</th>
                        </tr>
                      </thead>
                      <tbody>
                        {wasteLogs.map((log) => (
                          <tr key={log.id} style={{ borderBottom: '1px solid #f3f4f6', fontSize: '12.5px' }}>
                            <td style={{ padding: '10px 12px', color: '#6b7280' }}>{log.time}</td>
                            <td style={{ padding: '10px 12px', fontWeight: 700, color: '#111827' }}>{log.item}</td>
                            <td style={{ padding: '10px 12px', fontWeight: 700, color: '#dc2626' }}>{log.qty} units</td>
                            <td style={{ padding: '10px 12px', color: '#4b5563' }}>{log.reason}</td>
                            <td style={{ padding: '10px 12px', color: '#374151' }}>{log.user}</td>
                            <td style={{ padding: '10px 12px', fontWeight: 700, color: '#991b1b' }}>{log.cost}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })()}

          {/* TAB 12: SALES & ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="admin-tab-pane fade-in">
              <div className="admin-pane-header">
                <div>
                  <h1 className="admin-pane-title">Sales & Analytics Reports</h1>
                  <p className="admin-pane-sub">Daily, weekly, and monthly revenue summaries, product performance, and reports export.</p>
                </div>
                <button type="button" className="admin-btn-primary" onClick={() => showNotify('Downloading Sales Report PDF/CSV...')}>
                  <Download size={15} /> Export Report
                </button>
              </div>

              <div className="admin-kpi-grid">
                <div className="admin-kpi-card">
                  <span className="admin-kpi-label">This Week's Revenue</span>
                  <div className="admin-kpi-val">₱42,850</div>
                </div>
                <div className="admin-kpi-card">
                  <span className="admin-kpi-label">This Month's Revenue</span>
                  <div className="admin-kpi-val">₱184,200</div>
                </div>
                <div className="admin-kpi-card">
                  <span className="admin-kpi-label">Average Order Value</span>
                  <div className="admin-kpi-val">₱425</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 13: USER & ROLE MANAGEMENT */}
          {activeTab === 'users' && (
            <div className="admin-tab-pane fade-in">
              <div className="admin-pane-header">
                <div>
                  <h1 className="admin-pane-title">User & Role Management</h1>
                  <p className="admin-pane-sub">Manage staff accounts, kitchen permissions, and administrator credentials.</p>
                </div>
              </div>

              <div className="admin-table-card">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Staff Name</th>
                      <th>Email Account</th>
                      <th>Assigned Role</th>
                      <th>Account Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffUsers.map(usr => (
                      <tr key={usr.id}>
                        <td><strong>{usr.name}</strong></td>
                        <td>{usr.email}</td>
                        <td><span className="admin-cat-chip">{usr.role}</span></td>
                        <td><span className="admin-status-toggle active">Active</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 14: ACTIVITY LOGS */}
          {activeTab === 'logs' && (
            <div className="admin-tab-pane fade-in">
              <div className="admin-pane-header">
                <div>
                  <h1 className="admin-pane-title">Activity Audit Trail</h1>
                  <p className="admin-pane-sub">Immutable security log of product creation, price updates, stock changes, and system events.</p>
                </div>
              </div>

              <div className="admin-table-card">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Log ID</th>
                      <th>Timestamp</th>
                      <th>Responsible User</th>
                      <th>Action</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map(log => (
                      <tr key={log.id}>
                        <td><code>{log.id}</code></td>
                        <td>{log.timestamp}</td>
                        <td>{log.user}</td>
                        <td><span className="admin-cat-chip">{log.action}</span></td>
                        <td>{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 15: SYSTEM SETTINGS */}
          {activeTab === 'settings' && (
            <div className="admin-tab-pane fade-in">
              <div className="admin-pane-header">
                <div>
                  <h1 className="admin-pane-title">System Settings</h1>
                  <p className="admin-pane-sub">Configure restaurant metadata, currency, tax rates, operational rules, and backend ports.</p>
                </div>
              </div>

              <div className="admin-panel-card" style={{ maxWidth: '600px' }}>
                <div className="admin-input-group">
                  <label className="admin-input-label">Restaurant Name</label>
                  <input type="text" className="admin-input-field" defaultValue="Umami Craft Fusion" />
                </div>

                <div className="admin-input-group">
                  <label className="admin-input-label">Cuisine & Tagline</label>
                  <input type="text" className="admin-input-field" defaultValue="Asian Craft Fusion • Bowls, Dumplings & Artisanal Noodles" />
                </div>

                <div className="admin-input-group">
                  <label className="admin-input-label">Default Currency Symbol</label>
                  <input type="text" className="admin-input-field" defaultValue="₱ (PHP)" />
                </div>

                <button type="button" className="admin-btn-primary" onClick={() => showNotify('System Settings Saved.')}>
                  Save Settings
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* PRODUCT CREATE / EDIT MODAL WITH LIVE PREVIEW */}
      {showItemModal && (
        <div className="staff-pin-backdrop" onClick={() => setShowItemModal(false)}>
          <div className="admin-modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>{editingItem ? 'Edit Food Product' : 'Add New Food Product'}</h2>
              <button type="button" className="staff-pin-close" onClick={() => setShowItemModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="admin-form-grid">
              {/* Form Fields */}
              <div className="admin-form-left">
                <div className="admin-input-group">
                  <label className="admin-input-label">Food Product Name *</label>
                  <input
                    type="text"
                    className="admin-input-field"
                    value={formProduct.name}
                    onChange={(e) => setFormProduct({ ...formProduct, name: e.target.value })}
                    required
                    placeholder="e.g. Chicken Teriyaki Rice Bowl"
                  />
                </div>

                <div className="admin-input-group">
                  <label className="admin-input-label">Food Image Upload & Source *</label>
                  
                  {/* File Upload Button & URL Input */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <label className="admin-btn-primary" style={{ cursor: 'pointer', flex: 1, justifyContent: 'center', fontSize: '12px', padding: '8px 12px' }}>
                      <ImageIcon size={15} />
                      <span>Upload Image File from Device</span>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files && e.target.files[0];
                          if (file) {
                            handleUploadImageFile(file, (imgUrl) => {
                              setFormProduct(prev => ({ ...prev, image: imgUrl }));
                            });
                          }
                        }}
                      />
                    </label>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      className="admin-input-field"
                      value={formProduct.image}
                      onChange={(e) => setFormProduct(prev => ({ ...prev, image: e.target.value }))}
                      required
                      placeholder="Image URL or uploaded file data..."
                    />
                    {formProduct.image && (
                      <button
                        type="button"
                        className="admin-btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '12px', whiteSpace: 'nowrap' }}
                        onClick={() => setFormProduct(prev => ({ ...prev, image: '' }))}
                        title="Clear image"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Preset High-Res Food Image Options */}
                  <div style={{ marginTop: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#786456' }}>Or pick a sample food image:</span>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                      {[
                        { label: '🍚 Rice Bowl', url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80' },
                        { label: '🍜 Spicy Ramen', url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80' },
                        { label: '🥟 Dumplings', url: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=600&q=80' },
                        { label: '🌱 Edamame', url: 'https://images.unsplash.com/photo-1622205313162-be1d5712a43f?auto=format&fit=crop&w=600&q=80' },
                        { label: '🍗 Teriyaki', url: 'https://images.unsplash.com/photo-1617093727343-374698b1b08d?auto=format&fit=crop&w=600&q=80' },
                        { label: '🥭 Mango Sticky Rice', url: 'https://images.unsplash.com/photo-1562440499-64c9a111f713?auto=format&fit=crop&w=600&q=80' }
                      ].map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="admin-btn-sm"
                          style={{ fontSize: '10.5px', padding: '3px 8px' }}
                          onClick={() => setFormProduct(prev => ({ ...prev, image: preset.url }))}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="admin-input-group">
                  <label className="admin-input-label">Description *</label>
                  <textarea
                    className="admin-input-field"
                    rows="3"
                    value={formProduct.description}
                    onChange={(e) => setFormProduct({ ...formProduct, description: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="admin-input-group">
                    <label className="admin-input-label">Category *</label>
                    <select
                      className="admin-select"
                      value={formProduct.category}
                      onChange={(e) => setFormProduct({ ...formProduct, category: e.target.value })}
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.name}>
                          {c.icon ? `${c.icon} ` : ''}{c.name}{c.active === false ? ' (Archived)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="admin-input-group">
                    <label className="admin-input-label">Regular Price (₱) *</label>
                    <input
                      type="number"
                      className="admin-input-field"
                      value={formProduct.price}
                      onChange={(e) => setFormProduct({ ...formProduct, price: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="admin-input-group">
                    <label className="admin-input-label">Stock Quantity *</label>
                    <input
                      type="number"
                      className="admin-input-field"
                      value={formProduct.stock}
                      onChange={(e) => setFormProduct({ ...formProduct, stock: parseInt(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="admin-input-group">
                    <label className="admin-input-label">Prep Time</label>
                    <input
                      type="text"
                      className="admin-input-field"
                      value={formProduct.prepTime}
                      onChange={(e) => setFormProduct({ ...formProduct, prepTime: e.target.value })}
                    />
                  </div>
                </div>

                {/* Availability Status Dropdown */}
                <div className="admin-input-group" style={{ position: 'relative' }}>
                  <label className="admin-input-label">Availability Status *</label>
                  {/* Custom Dropdown Trigger */}
                  <button
                    type="button"
                    className="avail-dropdown-trigger"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '10px 14px',
                      border: availDropdownOpen ? '2px solid #C24522' : '1.5px solid #e0d6cc',
                      borderRadius: availDropdownOpen ? '8px 8px 0 0' : '8px',
                      background: '#fff',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: formProduct.available ? '#1a1a1a' : '#1a1a1a',
                      boxSizing: 'border-box',
                    }}
                    onClick={() => setAvailDropdownOpen(o => !o)}
                  >
                    <span>{formProduct.available ? 'Available' : 'Unavailable'}</span>
                    <svg
                      width="16" height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      style={{ transform: availDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.18s', color: '#888', flexShrink: 0 }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {/* Dropdown List */}
                  {availDropdownOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        border: '2px solid #C24522',
                        borderTop: 'none',
                        borderRadius: '0 0 8px 8px',
                        background: '#fff',
                        zIndex: 999,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                      }}
                    >
                      {/* Available option */}
                      <button
                        type="button"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          width: '100%',
                          padding: '10px 14px',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '14px',
                          color: '#1a1a1a',
                          textAlign: 'left',
                        }}
                        onClick={() => { setFormProduct({ ...formProduct, available: true }); setAvailDropdownOpen(false); }}
                      >
                        <span>Available</span>
                        {formProduct.available && <Check size={16} color="#C24522" />}
                      </button>

                      {/* Unavailable option */}
                      <button
                        type="button"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          width: '100%',
                          padding: '10px 14px',
                          background: !formProduct.available ? '#fff5f5' : 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '14px',
                          color: !formProduct.available ? '#C24522' : '#1a1a1a',
                          fontWeight: !formProduct.available ? '600' : '400',
                          textAlign: 'left',
                        }}
                        onClick={() => { setFormProduct({ ...formProduct, available: false }); setAvailDropdownOpen(false); }}
                      >
                        <span>Unavailable</span>
                        {!formProduct.available && <Check size={16} color="#C24522" />}
                      </button>
                    </div>
                  )}

                  <p style={{ fontSize: '11px', color: '#999', marginTop: '6px', marginBottom: 0 }}>
                    {formProduct.available
                      ? '✅ Customers can see and order this product.'
                      : '🚫 Product is hidden from customer menu.'}
                  </p>
                </div>
              </div>

              {/* Live Preview Panel */}
              <div className="admin-form-right">
                <div className="admin-live-preview-box">
                  <div className="admin-lp-badge">
                    <Eye size={13} /> Live Customer Menu Card Preview
                  </div>

                  <div className="admin-preview-card">
                    <img
                      src={formProduct.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'}
                      alt={formProduct.name}
                      className="admin-preview-img"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';
                      }}
                    />
                    <div className="admin-preview-body">
                      <span className="admin-cat-chip">{formProduct.category}</span>
                      <h4 className="admin-preview-name">{formProduct.name || 'Product Name'}</h4>
                      <p className="admin-preview-desc">{formProduct.description || 'Product description will appear here.'}</p>
                      <div className="admin-preview-price-row">
                        <span className="admin-price-main">₱{formProduct.price || 0}</span>
                        <span className="admin-cat-chip" style={{ background: formProduct.available ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)', color: formProduct.available ? '#059669' : '#EF4444' }}>
                          {formProduct.available ? 'Available' : 'Unavailable'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Verification Warning Check */}
                  {(() => {
                    const check = verifyImageMatch(formProduct.name, formProduct.image);
                    return (
                      <div className={`admin-verify-callout ${check.valid ? 'valid' : 'invalid'}`}>
                        {check.valid ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                        <span>{check.reason}</span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="admin-modal-footer">
                <button type="button" className="staff-pin-cancel-btn" onClick={() => setShowItemModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="staff-pin-submit-btn">
                  <CheckCircle size={16} />
                  <span>{editingItem ? 'Update & Publish' : 'Publish Product Live'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MIX & MATCH CREATE MODAL */}
      {showMixMatchModal && (() => {
        const foodItems = menuItems.filter(m =>
          m.category !== 'Drinks' &&
          !m.name.toLowerCase().includes('tea') &&
          !m.name.toLowerCase().includes('drink')
        );
        const drinkItems = menuItems.filter(m =>
          m.category === 'Drinks' ||
          m.name.toLowerCase().includes('tea') ||
          m.name.toLowerCase().includes('drink')
        );

        const toggleItem = (field, name) => {
          setFormMixMatch(prev => ({
            ...prev,
            [field]: prev[field].includes(name)
              ? prev[field].filter(x => x !== name)
              : [...prev[field], name]
          }));
        };

        return (
          <div className="staff-pin-backdrop" onClick={() => setShowMixMatchModal(false)}>
            <div className="admin-modal-large" onClick={e => e.stopPropagation()} style={{ maxWidth: '780px' }}>
              <div className="admin-modal-header">
                <h2>Create Mix &amp; Match Bundle</h2>
                <button type="button" className="staff-pin-close" onClick={() => setShowMixMatchModal(false)}>
                  <X size={18} />
                </button>
              </div>

              <form
                onSubmit={e => {
                  e.preventDefault();
                  if (!formMixMatch.name.trim()) { showNotify('Bundle name is required!', 'error'); return; }
                  if (formMixMatch.selectedMain.length === 0) { showNotify('Select at least one Main Meal option.', 'error'); return; }
                  if (formMixMatch.selectedSide.length === 0) { showNotify('Select at least one Side Dish option.', 'error'); return; }
                  if (formMixMatch.selectedDrinks.length === 0) { showNotify('Select at least one Drink option.', 'error'); return; }
                  const newRule = {
                    id: `MM-${Date.now().toString().slice(-4)}`,
                    name: formMixMatch.name.trim(),
                    price: formMixMatch.price,
                    mainOptions: formMixMatch.selectedMain,
                    sideOptions: formMixMatch.selectedSide,
                    drinkOptions: formMixMatch.selectedDrinks,
                    status: 'active'
                  };
                  setMixMatchRules(prev => [...prev, newRule]);
                  addAuditLog('Mix & Match Created', `New bundle "${newRule.name}" at ₱${newRule.price}`);
                  showNotify(`Mix & Match "${newRule.name}" created successfully!`);
                  setShowMixMatchModal(false);
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: '0' }}
              >
                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', maxHeight: '62vh' }}>

                  {/* Bundle Name & Price */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: '12px' }}>
                    <div className="admin-input-group" style={{ margin: 0 }}>
                      <label className="admin-input-label">Bundle Name *</label>
                      <input
                        type="text"
                        className="admin-input-field"
                        placeholder="e.g. Craft Bowl + Side + Drink Deal"
                        value={formMixMatch.name}
                        onChange={e => setFormMixMatch({ ...formMixMatch, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="admin-input-group" style={{ margin: 0 }}>
                      <label className="admin-input-label">Bundle Price (₱) *</label>
                      <input
                        type="number"
                        className="admin-input-field"
                        value={formMixMatch.price}
                        onChange={e => setFormMixMatch({ ...formMixMatch, price: parseFloat(e.target.value) || 0 })}
                        required
                      />
                    </div>
                  </div>

                  {/* Three Columns */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>

                    {/* 1. Main Meal */}
                    <div style={{ background: '#F9F6F0', borderRadius: '12px', padding: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                        <span style={{ fontSize: '15px' }}>🍽️</span>
                        <strong style={{ fontSize: '13px', color: '#3a2a1a' }}>1. Main Meal Options</strong>
                      </div>
                      {foodItems.length === 0 && (
                        <p style={{ fontSize: '12px', color: '#999', fontStyle: 'italic' }}>No food items yet. Add via Menu Management.</p>
                      )}
                      {foodItems.map(item => (
                        <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', cursor: 'pointer', fontSize: '12.5px', color: '#444' }}>
                          <input
                            type="checkbox"
                            checked={formMixMatch.selectedMain.includes(item.name)}
                            onChange={() => toggleItem('selectedMain', item.name)}
                            style={{ accentColor: '#C24522', width: '14px', height: '14px', flexShrink: 0 }}
                          />
                          <span>{item.name}</span>
                          <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#C24522', fontWeight: '600', flexShrink: 0 }}>₱{item.price}</span>
                        </label>
                      ))}
                    </div>

                    {/* 2. Side Dish */}
                    <div style={{ background: '#F9F6F0', borderRadius: '12px', padding: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                        <span style={{ fontSize: '15px' }}>🥗</span>
                        <strong style={{ fontSize: '13px', color: '#3a2a1a' }}>2. Side Dish Options</strong>
                      </div>
                      {foodItems.length === 0 && (
                        <p style={{ fontSize: '12px', color: '#999', fontStyle: 'italic' }}>No food items yet. Add via Menu Management.</p>
                      )}
                      {foodItems.map(item => (
                        <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', cursor: 'pointer', fontSize: '12.5px', color: '#444' }}>
                          <input
                            type="checkbox"
                            checked={formMixMatch.selectedSide.includes(item.name)}
                            onChange={() => toggleItem('selectedSide', item.name)}
                            style={{ accentColor: '#C24522', width: '14px', height: '14px', flexShrink: 0 }}
                          />
                          <span>{item.name}</span>
                          <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#C24522', fontWeight: '600', flexShrink: 0 }}>₱{item.price}</span>
                        </label>
                      ))}
                    </div>

                    {/* 3. Drink Options */}
                    <div style={{ background: '#F9F6F0', borderRadius: '12px', padding: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                        <span style={{ fontSize: '15px' }}>🧋</span>
                        <strong style={{ fontSize: '13px', color: '#3a2a1a' }}>3. Drink Options</strong>
                      </div>
                      {drinkItems.length === 0 && (
                        <p style={{ fontSize: '12px', color: '#999', fontStyle: 'italic' }}>No drinks yet. Add via Drinks &amp; Sizes Management.</p>
                      )}
                      {drinkItems.map(item => (
                        <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', cursor: 'pointer', fontSize: '12.5px', color: '#444' }}>
                          <input
                            type="checkbox"
                            checked={formMixMatch.selectedDrinks.includes(item.name)}
                            onChange={() => toggleItem('selectedDrinks', item.name)}
                            style={{ accentColor: '#C24522', width: '14px', height: '14px', flexShrink: 0 }}
                          />
                          <span>{item.name}</span>
                          <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#C24522', fontWeight: '600', flexShrink: 0 }}>₱{item.price}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Live Summary Preview */}
                  {(formMixMatch.selectedMain.length > 0 || formMixMatch.selectedSide.length > 0 || formMixMatch.selectedDrinks.length > 0) && (
                    <div style={{ background: '#fff8f0', border: '1.5px solid #f5c4a1', borderRadius: '10px', padding: '14px' }}>
                      <strong style={{ fontSize: '12px', color: '#C24522', display: 'block', marginBottom: '8px' }}>📋 Bundle Preview</strong>
                      <p style={{ fontSize: '12px', color: '#3a2a1a', margin: 0 }}>
                        <strong>{formMixMatch.name || 'Bundle Name'}</strong> • Bundle Price ₱{formMixMatch.price}
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginTop: '8px' }}>
                        <div>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: '#786456' }}>Main Meals:</span>
                          <ul style={{ margin: '2px 0 0', paddingLeft: '14px', fontSize: '11px', color: '#555' }}>
                            {formMixMatch.selectedMain.map((m, i) => <li key={i}>{m}</li>)}
                          </ul>
                        </div>
                        <div>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: '#786456' }}>Side Dishes:</span>
                          <ul style={{ margin: '2px 0 0', paddingLeft: '14px', fontSize: '11px', color: '#555' }}>
                            {formMixMatch.selectedSide.map((s, i) => <li key={i}>{s}</li>)}
                          </ul>
                        </div>
                        <div>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: '#786456' }}>Drinks:</span>
                          <ul style={{ margin: '2px 0 0', paddingLeft: '14px', fontSize: '11px', color: '#555' }}>
                            {formMixMatch.selectedDrinks.map((d, i) => <li key={i}>{d}</li>)}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Buttons */}
                <div className="admin-modal-footer">
                  <button type="button" className="staff-pin-cancel-btn" onClick={() => setShowMixMatchModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="staff-pin-submit-btn">
                    <CheckCircle size={16} />
                    <span>Create Bundle</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* CREATE / EDIT PROMO MODAL */}
      {showPromoModal && (
        <div className="staff-pin-backdrop" onClick={() => { setShowPromoModal(false); setEditingPromo(null); }}>
          <div className="admin-modal-large" onClick={e => e.stopPropagation()} style={{ maxWidth: '680px' }}>
            <div className="admin-modal-header">
              <h2>{editingPromo ? 'Edit Promotion Campaign' : 'Create New Promo'}</h2>
              <button type="button" className="staff-pin-close" onClick={() => { setShowPromoModal(false); setEditingPromo(null); }}>
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={async e => {
                e.preventDefault();
                if (!formPromo.name.trim()) { showNotify('Promo name is required!', 'error'); return; }
                if (!formPromo.code.trim()) { showNotify('Promo code is required!', 'error'); return; }
                if (!formPromo.applyToAll && formPromo.applicableItems.length === 0) {
                  showNotify('Select at least one food or drink item, or enable "Apply to all".', 'error'); return;
                }
                // Check for duplicate code
                if (!editingPromo && promos.some(p => p.code.toUpperCase() === formPromo.code.toUpperCase() && p.status === 'active')) {
                  showNotify(`Promo code "${formPromo.code.toUpperCase()}" already exists!`, 'error'); return;
                }

                const promoPayload = {
                  id: editingPromo ? editingPromo.id : `PR-${Date.now().toString().slice(-4)}`,
                  name: formPromo.name.trim(),
                  code: formPromo.code.trim().toUpperCase(),
                  icon: formPromo.icon || '🎉',
                  description: formPromo.description || `Applies ${formPromo.discountType === 'percent' ? `${formPromo.discountValue}% discount` : `₱${formPromo.discountValue} discount`} to ${formPromo.applyToAll ? 'all menu items' : 'selected items'}.`,
                  discountLabel: formPromo.discountType === 'percent' ? `${formPromo.discountValue}% Off (Automatic)` : `₱${formPromo.discountValue} Off`,
                  targetLabel: formPromo.applyToAll ? 'All Menu Items' : (formPromo.applicableItems.length > 0 ? formPromo.applicableItems.slice(0, 2).join(', ') : 'Selected Items'),
                  dateRange: formPromo.dateRange || 'Jan 1, 2025 – Dec 31, 2026',
                  maxRedemptions: Number(formPromo.maxRedemptions) || 500,
                  currentRedemptions: editingPromo ? (editingPromo.currentRedemptions || 0) : 0,
                  status: formPromo.status || 'active',
                  type: formPromo.type || 'discount',
                  bannerTitle: formPromo.bannerTitle?.trim() || formPromo.name.trim().toUpperCase().slice(0, 26),
                  bannerHighlight: formPromo.bannerHighlight?.trim() || (formPromo.discountType === 'percent' ? `${formPromo.discountValue}% OFF` : `₱${formPromo.discountValue} OFF`),
                  bannerSubtitle: formPromo.bannerSubtitle?.trim() || (formPromo.applyToAll ? 'Applies to Entire Order' : `${formPromo.applicableItems.length} Eligible Items`),
                  bannerImage: formPromo.bannerImage || '/ramen_promo_banner.png',
                  bannerBg: formPromo.bannerBg || '#8c2411',
                  discountType: formPromo.discountType,
                  discountValue: formPromo.discountValue,
                  applicableItems: formPromo.applyToAll ? [] : formPromo.applicableItems,
                  applyToAll: !!formPromo.applyToAll,
                  expiresAt: formPromo.expiresAt ? new Date(formPromo.expiresAt).toISOString() : new Date(Date.now() + 30*24*60*60*1000).toISOString(),
                  associatedItem: formPromo.associatedItem || (formPromo.applyToAll ? 'All Menu Items' : formPromo.applicableItems?.join(', ') || 'All Menu Items'),
                  associatedTable: formPromo.associatedTable || 'All Tables (Storewide)',
                  originalCode: editingPromo ? (editingPromo.originalCode || formPromo.code.trim().toUpperCase()) : formPromo.code.trim().toUpperCase(),
                  retiredCodes: editingPromo?.retiredCodes || [],
                  createdAt: editingPromo ? editingPromo.createdAt : Date.now(),
                };

                if (editingPromo) {
                  const updated = promos.map(p => p.id === editingPromo.id ? promoPayload : p);
                  setPromos(updated);
                  try { localStorage.setItem('umami_promos', JSON.stringify(updated)); } catch (_) {}
                  window.dispatchEvent(new CustomEvent('umami_catalog_updated'));

                  try {
                    await fetch(`/api/promos/${editingPromo.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(promoPayload)
                    });
                  } catch (err) {
                    console.warn('Failed to update promo on server:', err);
                  }
                  addAuditLog('Promo Updated', `Updated "${promoPayload.name}" [${promoPayload.code}]`);
                  showNotify(`Campaign "${promoPayload.name}" updated successfully!`);
                  setShowPromoModal(false);
                  setEditingPromo(null);
                  return;
                }

                const updated = [...promos, promoPayload];
                setPromos(updated);
                try { localStorage.setItem('umami_promos', JSON.stringify(updated)); } catch (_) {}
                window.dispatchEvent(new CustomEvent('umami_catalog_updated'));

                try {
                  await fetch('/api/promos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(promoPayload)
                  });
                } catch (err) {
                  console.warn('Failed to create promo on server:', err);
                }
                addAuditLog('Promo Created', `New promo "${promoPayload.name}" [${promoPayload.code}]`);
                showNotify(`Promo "${promoPayload.name}" is now live for customers!`);
                setShowPromoModal(false);
                setEditingPromo(null);
              }}
              style={{ display: 'flex', flexDirection: 'column' }}
            >
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', maxHeight: '68vh' }}>

                {/* Name + Code */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="admin-input-group" style={{ margin: 0 }}>
                    <label className="admin-input-label">Campaign Name *</label>
                    <input type="text" className="admin-input-field" placeholder="e.g. Grand Opening 15% OFF Special"
                      value={formPromo.name} onChange={e => setFormPromo({ ...formPromo, name: e.target.value })} required />
                  </div>
                  <div className="admin-input-group" style={{ margin: 0 }}>
                    <label className="admin-input-label">Promo Code *</label>
                    <input type="text" className="admin-input-field" placeholder="e.g. GRAND15"
                      value={formPromo.code}
                      onChange={e => setFormPromo({ ...formPromo, code: e.target.value.toUpperCase().replace(/\s/g, '') })}
                      required style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: '1px' }} />
                  </div>
                </div>

                {/* Discount Type + Value */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="admin-input-group" style={{ margin: 0 }}>
                    <label className="admin-input-label">Discount Type *</label>
                    <select className="admin-select" value={formPromo.discountType}
                      onChange={e => setFormPromo({ ...formPromo, discountType: e.target.value })}>
                      <option value="percent">Percentage (%) Off</option>
                      <option value="fixed">Fixed Amount (₱) Off</option>
                    </select>
                  </div>
                  <div className="admin-input-group" style={{ margin: 0 }}>
                    <label className="admin-input-label">
                      Discount Value * {formPromo.discountType === 'percent' ? '(%)' : '(₱)'}
                    </label>
                    <input type="number" className="admin-input-field" min="1" max={formPromo.discountType === 'percent' ? 100 : undefined}
                      value={formPromo.discountValue}
                      onChange={e => setFormPromo({ ...formPromo, discountValue: parseFloat(e.target.value) || 0 })}
                      required />
                  </div>
                </div>

                {/* Validity Dates & Max Redemptions */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="admin-input-group" style={{ margin: 0 }}>
                    <label className="admin-input-label">Validity Dates</label>
                    <input
                      type="text"
                      className="admin-input-field"
                      placeholder="e.g. Jan 1, 2025 – Dec 31, 2026"
                      value={formPromo.dateRange || ''}
                      onChange={e => setFormPromo({ ...formPromo, dateRange: e.target.value })}
                    />
                  </div>
                  <div className="admin-input-group" style={{ margin: 0 }}>
                    <label className="admin-input-label">Max Redemptions Limit</label>
                    <input
                      type="number"
                      className="admin-input-field"
                      min="1"
                      placeholder="500"
                      value={formPromo.maxRedemptions || 500}
                      onChange={e => setFormPromo({ ...formPromo, maxRedemptions: Number(e.target.value) })}
                    />
                  </div>
                </div>

                {/* Expiration Date & Time + Associated Item & Table */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="admin-input-group" style={{ margin: 0 }}>
                    <label className="admin-input-label">Expiration Date &amp; Time *</label>
                    <input
                      type="datetime-local"
                      className="admin-input-field"
                      value={formPromo.expiresAt || ''}
                      onChange={e => setFormPromo({ ...formPromo, expiresAt: e.target.value })}
                      required
                    />
                  </div>
                  <div className="admin-input-group" style={{ margin: 0 }}>
                    <label className="admin-input-label">Associated Item</label>
                    <input
                      type="text"
                      className="admin-input-field"
                      placeholder="e.g. Artisanal Drinks or All Menu Items"
                      value={formPromo.associatedItem || ''}
                      onChange={e => setFormPromo({ ...formPromo, associatedItem: e.target.value })}
                    />
                  </div>
                </div>

                <div className="admin-input-group" style={{ margin: 0 }}>
                  <label className="admin-input-label">Associated Table / Kiosk Zone</label>
                  <input
                    type="text"
                    className="admin-input-field"
                    placeholder="e.g. All Tables (Storewide) or Table 1 - Main Floor"
                    value={formPromo.associatedTable || ''}
                    onChange={e => setFormPromo({ ...formPromo, associatedTable: e.target.value })}
                  />
                </div>

                {/* Status & Promotion Type */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="admin-input-group" style={{ margin: 0 }}>
                    <label className="admin-input-label">Initial Status</label>
                    <select
                      className="admin-select"
                      value={formPromo.status || 'active'}
                      onChange={e => setFormPromo({ ...formPromo, status: e.target.value })}
                    >
                      <option value="active">Active (Visible in Customer Banner)</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="draft">Draft (Hidden)</option>
                    </select>
                  </div>
                  <div className="admin-input-group" style={{ margin: 0 }}>
                    <label className="admin-input-label">Campaign Type</label>
                    <select
                      className="admin-select"
                      value={formPromo.type || 'discount'}
                      onChange={e => setFormPromo({ ...formPromo, type: e.target.value })}
                    >
                      <option value="discount">Standard Discount</option>
                      <option value="combo">Combo Saver</option>
                      <option value="bogo">Buy 1 Get 1 (BOGO)</option>
                      <option value="voucher">Special Voucher</option>
                    </select>
                  </div>
                </div>

                {/* ══ SECTION: PROMOTIONAL IMAGE UPLOAD & ITEM MATCHING ══ */}
                <div style={{
                  background: 'linear-gradient(135deg, #fffbf5 0%, #fff7ed 100%)',
                  border: '1.5px solid #fed7aa',
                  borderRadius: '14px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '16px' }}>📸</span>
                      <strong style={{ fontSize: '13.5px', color: '#7c2d12' }}>
                        Customer Banner Promotional Image *
                      </strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        // Auto-match image from first selected food or drink
                        let matchedImg = '';
                        if (formPromo.applicableItems && formPromo.applicableItems.length > 0) {
                          const targetName = formPromo.applicableItems[0];
                          const foodMatch = menuItems.find(m => m.name === targetName || (targetName && targetName.includes(m.name)));
                          if (foodMatch && foodMatch.image) matchedImg = foodMatch.image;
                          if (!matchedImg) {
                            const drinkMatch = drinks.find(d => d.name === targetName || (targetName && targetName.includes(d.name)));
                            if (drinkMatch && drinkMatch.image) matchedImg = drinkMatch.image;
                          }
                        }
                        if (!matchedImg) {
                          matchedImg = '/ramen_promo_banner.png';
                        }
                        setFormPromo(prev => ({ ...prev, bannerImage: matchedImg }));
                        showNotify('Auto-matched promotional image from selected item!');
                      }}
                      style={{
                        background: '#ea580c',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '5px 10px',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <Sparkles size={13} />
                      <span>⚡ Auto-Match from Item</span>
                    </button>
                  </div>

                  {/* Image Preview & Upload Controls */}
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                    <div style={{
                      width: '100px',
                      height: '80px',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      border: '1.5px solid #fdba74',
                      background: '#1c1917',
                      flexShrink: 0,
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {formPromo.bannerImage ? (
                        <img
                          src={formPromo.bannerImage}
                          alt="Promo banner preview"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <span style={{ fontSize: '11px', color: '#9ca3af' }}>No Image</span>
                      )}
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="file"
                          ref={promoImageInputRef}
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={async e => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = async () => {
                              const dataUrl = reader.result;
                              setFormPromo(prev => ({ ...prev, bannerImage: dataUrl }));
                              try {
                                const res = await fetch('/api/upload-image', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ dataUrl, filename: file.name })
                                });
                                const data = await res.json();
                                if (data.success && data.url) {
                                  setFormPromo(prev => ({ ...prev, bannerImage: data.url }));
                                  showNotify('Promotional banner image uploaded successfully!');
                                }
                              } catch (err) {
                                console.warn('Image upload fallback to dataUrl:', err);
                              }
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => promoImageInputRef.current?.click()}
                          style={{
                            flex: 1,
                            padding: '7px 12px',
                            background: '#ffffff',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#374151',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                          }}
                        >
                          <Upload size={13} />
                          <span>Upload Image File...</span>
                        </button>
                      </div>

                      {/* Direct URL input */}
                      <input
                        type="text"
                        className="admin-input-field"
                        placeholder="Or enter image URL (e.g. /ramen_promo_banner.png)"
                        value={formPromo.bannerImage || ''}
                        onChange={e => setFormPromo({ ...formPromo, bannerImage: e.target.value })}
                        style={{ margin: 0, fontSize: '11.5px', padding: '6px 10px' }}
                      />
                    </div>
                  </div>

                  {/* Preset Quick Chips */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', color: '#9a3412', fontWeight: '700' }}>Presets:</span>
                    {[
                      { label: '🍜 Japanese Ramen Banner', img: '/ramen_promo_banner.png' },
                      { label: '🥟 Szechuan Dumplings', img: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=600&q=80' },
                      { label: '🍜 Peanut Noodles', img: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80' },
                      { label: '🥭 Mango Shake', img: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80' },
                      { label: '🧋 Matcha Boba', img: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80' }
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setFormPromo({ ...formPromo, bannerImage: preset.img })}
                        style={{
                          background: formPromo.bannerImage === preset.img ? '#fed7aa' : '#ffffff',
                          border: `1px solid ${formPromo.bannerImage === preset.img ? '#ea580c' : '#e5e7eb'}`,
                          color: '#431407',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '10.5px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Apply to all toggle */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: '#3a2a1a', fontWeight: '500' }}>
                  <input type="checkbox" checked={formPromo.applyToAll}
                    onChange={e => setFormPromo({ ...formPromo, applyToAll: e.target.checked, applicableItems: [] })}
                    style={{ accentColor: '#C24522', width: '15px', height: '15px' }} />
                  Apply discount to ALL menu items (Food &amp; Drinks)
                </label>

                {/* Item selection with Food & Drinks tabs */}
                {!formPromo.applyToAll && (
                  <div style={{ background: '#F9F6F0', borderRadius: '12px', padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <strong style={{ fontSize: '13px', color: '#3a2a1a' }}>
                        🍽️ Select Items This Promo Applies To *
                      </strong>
                      {/* Tabs between Food and Drinks */}
                      <div style={{ display: 'flex', gap: '4px', background: '#ede8df', padding: '2px', borderRadius: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setPromoItemTab('food')}
                          style={{
                            padding: '3px 9px',
                            borderRadius: '6px',
                            border: 'none',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            background: promoItemTab === 'food' ? '#ffffff' : 'transparent',
                            color: promoItemTab === 'food' ? '#C24522' : '#6b7280',
                            boxShadow: promoItemTab === 'food' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none'
                          }}
                        >
                          🍜 Food Items ({menuItems.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setPromoItemTab('drinks')}
                          style={{
                            padding: '3px 9px',
                            borderRadius: '6px',
                            border: 'none',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            background: promoItemTab === 'drinks' ? '#ffffff' : 'transparent',
                            color: promoItemTab === 'drinks' ? '#C24522' : '#6b7280',
                            boxShadow: promoItemTab === 'drinks' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none'
                          }}
                        >
                          🧋 Drinks &amp; Boba ({drinks.length})
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px 14px', maxHeight: '170px', overflowY: 'auto' }}>
                      {(promoItemTab === 'food' ? menuItems : drinks).map(item => {
                        const isChecked = formPromo.applicableItems.includes(item.name);
                        return (
                          <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: '#374151', padding: '4px 6px', borderRadius: '6px', background: isChecked ? 'rgba(194,69,34,0.07)' : 'transparent' }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                const list = isChecked
                                  ? formPromo.applicableItems.filter(n => n !== item.name)
                                  : [...formPromo.applicableItems, item.name];
                                // If first item checked and no custom image uploaded yet, auto-assign image
                                const autoImg = (!isChecked && (!formPromo.bannerImage || formPromo.bannerImage === '/ramen_promo_banner.png'))
                                  ? (item.image || formPromo.bannerImage)
                                  : formPromo.bannerImage;
                                setFormPromo({ ...formPromo, applicableItems: list, bannerImage: autoImg });
                              }}
                              style={{ accentColor: '#C24522', width: '13px', height: '13px', flexShrink: 0 }}
                            />
                            {item.image && (
                              <img src={item.image} alt="" style={{ width: '22px', height: '22px', borderRadius: '4px', objectFit: 'cover', flexShrink: 0 }} />
                            )}
                            <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>
                            <span style={{ fontSize: '11px', color: '#C24522', fontWeight: '700', flexShrink: 0 }}>
                              ₱{item.price || (item.sizes && item.sizes[0]?.price) || '0'}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ══ LIVE CUSTOMER 5-SECOND CAROUSEL PREVIEW ══ */}
                <div style={{
                  background: '#ffffff',
                  border: '1.5px solid #fed7aa',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: '800', color: '#c24522' }}>
                      <span>✦</span>
                      <span>Customer-Facing 5s Carousel Banner Preview</span>
                    </div>
                    <span style={{ fontSize: '10.5px', color: '#9ca3af' }}>Cycles every 5 seconds</span>
                  </div>

                  {/* Banner Card Mockup */}
                  <div style={{
                    width: '100%',
                    height: '92px',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    position: 'relative',
                    background: '#1a0b06',
                    display: 'flex',
                    alignItems: 'center',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}>
                    {formPromo.bannerImage && (
                      <img
                        src={formPromo.bannerImage}
                        alt=""
                        style={{
                          position: 'absolute',
                          right: 0,
                          top: 0,
                          width: '55%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    )}
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(to right, #1a0b06 48%, rgba(26,11,6,0.85) 65%, rgba(26,11,6,0.2) 100%)',
                    }} />

                    <div style={{ position: 'relative', zIndex: 2, padding: '10px 14px', maxWidth: '60%' }}>
                      <div style={{
                        display: 'inline-block',
                        background: '#ea580c',
                        color: '#ffffff',
                        fontSize: '9px',
                        fontWeight: '900',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        marginBottom: '4px',
                        letterSpacing: '0.5px'
                      }}>
                        {formPromo.discountType === 'percent' ? `${formPromo.discountValue}% OFF` : `₱${formPromo.discountValue} OFF`}
                      </div>
                      <div style={{ color: '#ffffff', fontSize: '12px', fontWeight: '800', lineHeight: 1.2, textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
                        {formPromo.name || 'Grand Opening Promo'}
                      </div>
                      <div style={{ color: '#fde047', fontSize: '10px', fontWeight: '700', marginTop: '2px', fontFamily: 'monospace' }}>
                        Code: {formPromo.code || 'CODE'} • Tap to Apply
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              <div className="admin-modal-footer">
                <button type="button" className="staff-pin-cancel-btn" onClick={() => { setShowPromoModal(false); setEditingPromo(null); }}>Cancel</button>
                <button type="submit" className="staff-pin-submit-btn">
                  <CheckCircle size={16} />
                  <span>{editingPromo ? 'Update Campaign' : 'Publish Promo Live'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PROMOTION PREVIEW MODAL */}
      {previewPromo && (
        <div className="staff-pin-backdrop" style={{ zIndex: 100060 }} onClick={() => setPreviewPromo(null)}>
          <div className="admin-modal-small" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px', padding: 0, overflow: 'hidden' }}>
            <div style={{ position: 'relative', width: '100%', height: '170px', background: previewPromo.bannerBg || '#1e1b18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {previewPromo.bannerImage && (
                <img src={previewPromo.bannerImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />
              )}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 80%)' }} />
              <div style={{ position: 'absolute', bottom: '12px', left: '16px', color: '#fff' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: '#fde047' }}>
                  {previewPromo.bannerHighlight || 'PROMOTION'}
                </span>
                <h2 style={{ margin: '2px 0 0', fontSize: '18px', fontWeight: 800, color: '#fff' }}>{previewPromo.name}</h2>
              </div>
              <button
                type="button"
                className="staff-pin-close"
                style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(255,255,255,0.9)', borderRadius: '50%', padding: '6px' }}
                onClick={() => setPreviewPromo(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <code style={{ background: '#f0ece6', padding: '3px 10px', borderRadius: '6px', fontSize: '13px', fontWeight: 800, color: '#c24522' }}>
                  {previewPromo.code}
                </code>
                <span className="admin-cat-chip" style={{
                  background: previewPromo.status === 'active' ? '#ecfdf5' : '#fffbeb',
                  color: previewPromo.status === 'active' ? '#059669' : '#d97706',
                  fontWeight: 700
                }}>
                  ● {previewPromo.status.toUpperCase()}
                </span>
              </div>
              <p style={{ fontSize: '13px', color: '#4b5563', margin: '0 0 14px', lineHeight: 1.4 }}>
                {previewPromo.description}
              </p>
              <div style={{ background: '#faf6f0', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px', fontSize: '12.5px', color: '#4b5563' }}>
                <div style={{ marginBottom: '5px' }}><strong>Validity:</strong> {previewPromo.dateRange}</div>
                <div style={{ marginBottom: '5px' }}><strong>Discount:</strong> {previewPromo.discountLabel}</div>
                <div style={{ marginBottom: '5px' }}><strong>Target:</strong> {previewPromo.targetLabel || (previewPromo.applyToAll ? 'All Menu Items' : previewPromo.applicableItems?.join(', ') || 'Selected Items')}</div>
                <div><strong>Redemptions:</strong> {previewPromo.currentRedemptions || 0} / {previewPromo.maxRedemptions || 500} ({Math.round(((previewPromo.currentRedemptions || 0) / (previewPromo.maxRedemptions || 1)) * 100)}%)</div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="admin-btn-primary"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => {
                    const toEdit = previewPromo;
                    setPreviewPromo(null);
                    handleEditPromo(toEdit);
                  }}
                >
                  <Edit size={14} />
                  <span>Edit Campaign</span>
                </button>
                <button
                  type="button"
                  className="staff-pin-cancel-btn"
                  onClick={() => setPreviewPromo(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ EXPIRED CODES ADMIN ARCHIVE MODAL ══ */}
      {showExpiredArchive && (() => {
        const isExpiredCheck = (p) => p.status === 'expired' || (p.expiresAt && new Date(p.expiresAt).getTime() <= Date.now());
        const expiredRecords = promos.filter(isExpiredCheck).filter(p => {
          if (!expiredSearch) return true;
          const s = expiredSearch.toLowerCase();
          return (
            p.name?.toLowerCase().includes(s) ||
            p.code?.toLowerCase().includes(s) ||
            p.originalCode?.toLowerCase().includes(s) ||
            p.associatedItem?.toLowerCase().includes(s) ||
            p.associatedTable?.toLowerCase().includes(s)
          );
        });

        return (
          <div className="staff-pin-backdrop" style={{ zIndex: 100070 }} onClick={() => setShowExpiredArchive(false)}>
            <div
              className="admin-modal-small"
              onClick={e => e.stopPropagation()}
              style={{
                maxWidth: '920px',
                width: '95vw',
                maxHeight: '88vh',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: '16px',
                overflow: 'hidden',
                padding: 0
              }}
            >
              {/* Header */}
              <div style={{
                padding: '20px 24px',
                background: 'linear-gradient(135deg, #1c1917 0%, #292524 100%)',
                color: '#fff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#f87171',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Archive size={22} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#fff' }}>Expired Codes Archive</h2>
                      <span style={{
                        background: '#dc2626',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '999px'
                      }}>
                        {expiredRecords.length} Expired
                      </span>
                      <span style={{
                        background: 'rgba(255,255,255,0.15)',
                        color: '#f5f5f4',
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px'
                      }}>
                        Admin Only
                      </span>
                    </div>
                    <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#a8a29e' }}>
                      Expired campaigns &amp; invalid codes. Hidden from customer apps, menus, and kiosks.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="staff-pin-close"
                  style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: '50%', padding: '6px' }}
                  onClick={() => setShowExpiredArchive(false)}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Sub-header / Search */}
              <div style={{ padding: '14px 24px', background: '#fafaf9', borderBottom: '1px solid #e7e5e4', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#78716c' }} />
                  <input
                    type="text"
                    placeholder="Search expired archive by code, name, item, or table..."
                    value={expiredSearch}
                    onChange={e => setExpiredSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 34px',
                      borderRadius: '8px',
                      border: '1px solid #d6d3d1',
                      fontSize: '13px',
                      background: '#fff',
                      outline: 'none'
                    }}
                  />
                </div>
                {expiredSearch && (
                  <button
                    type="button"
                    onClick={() => setExpiredSearch('')}
                    style={{ padding: '6px 10px', fontSize: '12px', color: '#57534e', background: '#e7e5e4', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Content Body */}
              <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, maxHeight: '58vh' }}>
                {expiredRecords.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 20px', color: '#78716c' }}>
                    <div style={{ fontSize: '36px', marginBottom: '8px' }}>📂</div>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#44403c', margin: '0 0 4px' }}>
                      {expiredSearch ? 'No matching expired records found' : 'No Expired Promotional Codes'}
                    </h3>
                    <p style={{ fontSize: '12.5px', color: '#a8a29e', margin: 0 }}>
                      When a campaign reaches its expiration date or is manually expired, it will automatically appear here.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {expiredRecords.map(rec => {
                      const origCode = rec.originalCode || rec.code;
                      const hasRetiredHistory = Array.isArray(rec.retiredCodes) && rec.retiredCodes.length > 0;
                      const expDateStr = rec.expiresAt
                        ? new Date(rec.expiresAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : (rec.expiredAt ? new Date(rec.expiredAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Expired');
                      const createdDateStr = rec.createdAt
                        ? new Date(rec.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : 'Pre-existing';

                      return (
                        <div
                          key={rec.id}
                          style={{
                            background: '#ffffff',
                            borderRadius: '12px',
                            border: '1.5px solid #fee2e2',
                            padding: '16px 18px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            boxShadow: '0 2px 6px rgba(239, 68, 68, 0.04)',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {/* Banner thumbnail */}
                          <div style={{
                            width: '64px',
                            height: '56px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            background: '#292524',
                            flexShrink: 0,
                            position: 'relative'
                          }}>
                            {rec.bannerImage ? (
                              <img src={rec.bannerImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.65, filter: 'grayscale(60%)' }} />
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#a8a29e', fontSize: '10px' }}>No Img</div>
                            )}
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(239,68,68,0.25)' }} />
                          </div>

                          {/* Record Info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                              <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800, color: '#1c1917' }}>
                                {rec.name}
                              </h4>
                              <span style={{
                                background: '#fef2f2',
                                color: '#b91c1c',
                                border: '1px solid #fecaca',
                                fontSize: '10.5px',
                                fontWeight: 800,
                                padding: '2px 7px',
                                borderRadius: '4px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}>
                                ✖ Expired
                              </span>
                            </div>

                            {/* Metadata Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', marginTop: '6px' }}>
                              <div>
                                <div style={{ fontSize: '11px', color: '#78716c', fontWeight: 600 }}>Original Code (Retired)</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                  <code style={{
                                    textDecoration: 'line-through',
                                    color: '#b91c1c',
                                    background: '#fff1f2',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontWeight: 800,
                                    fontSize: '12px'
                                  }}>
                                    {origCode}
                                  </code>
                                  {hasRetiredHistory && rec.retiredCodes.length > 1 && (
                                    <span style={{ fontSize: '10px', color: '#a8a29e' }} title={`Retired history: ${rec.retiredCodes.join(', ')}`}>
                                      ({rec.retiredCodes.length} retired)
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div>
                                <div style={{ fontSize: '11px', color: '#78716c', fontWeight: 600 }}>Associated Item / Table</div>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#44403c', marginTop: '2px' }}>
                                  <span>{rec.associatedItem || (rec.applyToAll ? 'All Menu Items' : rec.applicableItems?.join(', ') || 'All Items')}</span>
                                  <span style={{ color: '#a8a29e', margin: '0 4px' }}>•</span>
                                  <span style={{ color: '#0369a1' }}>{rec.associatedTable || 'Storewide'}</span>
                                </div>
                              </div>

                              <div>
                                <div style={{ fontSize: '11px', color: '#78716c', fontWeight: 600 }}>Created Date</div>
                                <div style={{ fontSize: '12px', color: '#44403c', marginTop: '2px' }}>{createdDateStr}</div>
                              </div>

                              <div>
                                <div style={{ fontSize: '11px', color: '#78716c', fontWeight: 600 }}>Expiration Date &amp; Time</div>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#dc2626', marginTop: '2px' }}>{expDateStr}</div>
                              </div>
                            </div>

                            {/* Restoration History Log (if any) */}
                            {rec.restoredAt && (
                              <div style={{ marginTop: '8px', fontSize: '11px', color: '#059669', background: '#ecfdf5', padding: '3px 8px', borderRadius: '4px', display: 'inline-block' }}>
                                ↺ Previously restored by <strong>{rec.restoredBy || 'Administrator'}</strong> on {new Date(rec.restoredAt).toLocaleDateString()}
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
                            <button
                              type="button"
                              onClick={() => handleOpenRestoreModal(rec)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 14px',
                                borderRadius: '8px',
                                border: '1px solid #10b981',
                                background: '#10b981',
                                color: '#ffffff',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)'
                              }}
                            >
                              <RotateCcw size={14} />
                              <span>Restore Code</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleArchivePromo(rec.id, rec.name)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                padding: '5px 10px',
                                borderRadius: '6px',
                                border: '1px solid #e7e5e4',
                                background: '#f5f5f4',
                                color: '#78716c',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              <Trash2 size={12} />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{ padding: '14px 24px', background: '#fafaf9', borderTop: '1px solid #e7e5e4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#78716c' }}>
                  Restoring generates a brand new code; the expired code remains permanently inactive.
                </span>
                <button
                  type="button"
                  className="staff-pin-cancel-btn"
                  onClick={() => setShowExpiredArchive(false)}
                >
                  Close Archive
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══ RESTORE PROMO MODAL ══ */}
      {restoringPromo && (
        <div className="staff-pin-backdrop" style={{ zIndex: 100080 }} onClick={() => setRestoringPromo(null)}>
          <div className="admin-modal-small" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', borderRadius: '16px', overflow: 'hidden', padding: 0 }}>
            <div style={{
              padding: '20px 24px',
              background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)',
              color: '#fff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <RotateCcw size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#fff' }}>Restore Promotion Record</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#a7f3d0' }}>
                    Re-activates campaign with a required new unique code &amp; expiration date.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="staff-pin-close"
                style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: '50%', padding: '5px' }}
                onClick={() => setRestoringPromo(null)}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmRestore} style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Target Campaign Banner */}
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px 14px' }}>
                  <div style={{ fontSize: '11px', color: '#166534', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Campaign to Restore
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#14532d', marginTop: '2px' }}>
                    {restoringPromo.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#15803d', marginTop: '3px' }}>
                    {restoringPromo.discountLabel} • {restoringPromo.associatedItem || 'All Menu Items'} ({restoringPromo.associatedTable || 'Storewide'})
                  </div>
                </div>

                {/* Old Code Notice */}
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <AlertTriangle size={18} color="#dc2626" style={{ flexShrink: 0 }} />
                  <div style={{ fontSize: '12px', color: '#991b1b', lineHeight: 1.35 }}>
                    Old Code: <strong style={{ textDecoration: 'line-through', fontFamily: 'monospace' }}>{restoringPromo.originalCode || restoringPromo.code}</strong> (Expired &amp; Permanently Retired). It can never be reused.
                  </div>
                </div>

                {/* New Unique Code Generator */}
                <div className="admin-input-group" style={{ margin: 0 }}>
                  <label className="admin-input-label">New Unique Promotion Code *</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      className="admin-input-field"
                      placeholder="e.g. MANGO82"
                      value={restoreForm.newCode}
                      onChange={e => setRestoreForm(prev => ({ ...prev, newCode: e.target.value.toUpperCase().replace(/\s/g, '') }))}
                      required
                      style={{ fontFamily: 'monospace', fontWeight: 800, letterSpacing: '1px', fontSize: '14px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setRestoreForm(prev => ({ ...prev, newCode: generateUniqueRestoreCode(restoringPromo.originalCode || restoringPromo.code) }))}
                      style={{
                        padding: '8px 12px',
                        background: '#f3f4f6',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#374151',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Generate another unique code"
                    >
                      <Sparkles size={13} />
                      <span>Generate</span>
                    </button>
                  </div>
                  <span style={{ fontSize: '11px', color: '#6b7280', marginTop: '3px' }}>
                    Must be unique and not match any active or previously retired codes.
                  </span>
                </div>

                {/* New Expiration Date & Time */}
                <div className="admin-input-group" style={{ margin: 0 }}>
                  <label className="admin-input-label">New Expiration Date &amp; Time *</label>
                  <input
                    type="datetime-local"
                    className="admin-input-field"
                    value={restoreForm.newExpiresAt}
                    onChange={e => setRestoreForm(prev => ({ ...prev, newExpiresAt: e.target.value }))}
                    required
                  />
                  <span style={{ fontSize: '11px', color: '#6b7280', marginTop: '3px' }}>
                    Must be in the future. The promotion will automatically expire when this date/time is reached.
                  </span>
                </div>

                {/* Restored By Admin */}
                <div className="admin-input-group" style={{ margin: 0 }}>
                  <label className="admin-input-label">Restored By (Administrator Name / Email)</label>
                  <input
                    type="text"
                    className="admin-input-field"
                    value={restoreForm.restoredBy}
                    onChange={e => setRestoreForm(prev => ({ ...prev, restoredBy: e.target.value }))}
                    placeholder="admin@umamicraft.com"
                    required
                  />
                </div>
              </div>

              <div className="admin-modal-footer" style={{ padding: '14px 24px', background: '#fafaf9', borderTop: '1px solid #e7e5e4' }}>
                <button type="button" className="staff-pin-cancel-btn" onClick={() => setRestoringPromo(null)}>Cancel</button>
                <button
                  type="submit"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '9px 18px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#059669',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  <RotateCcw size={15} />
                  <span>Confirm &amp; Restore Campaign</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ PROMO QR CODE & TEST LINK MODAL ══ */}
      {showPromoQrModal && (() => {
        const isExp = showPromoQrModal.status === 'expired' || (showPromoQrModal.expiresAt && new Date(showPromoQrModal.expiresAt).getTime() <= Date.now());
        const promoUrl = `${window.location.origin}/?view=mobile&promo=${encodeURIComponent(showPromoQrModal.code)}`;

        return (
          <div className="staff-pin-backdrop" style={{ zIndex: 100090 }} onClick={() => setShowPromoQrModal(null)}>
            <div className="admin-modal-small" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', borderRadius: '16px', overflow: 'hidden', padding: 0 }}>
              <div style={{
                padding: '18px 22px',
                background: isExp ? 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)' : 'linear-gradient(135deg, #1c1917 0%, #292524 100%)',
                color: '#fff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <QrCode size={20} />
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#fff' }}>
                    {isExp ? 'Expired Promotion QR Link' : 'Promotional QR & Direct Link'}
                  </h3>
                </div>
                <button
                  type="button"
                  className="staff-pin-close"
                  style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: '50%', padding: '5px' }}
                  onClick={() => setShowPromoQrModal(null)}
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  padding: '14px',
                  background: '#ffffff',
                  borderRadius: '16px',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
                  border: isExp ? '2px dashed #f87171' : '1px solid #e5e7eb',
                  position: 'relative'
                }}>
                  <QRCodeSVG value={promoUrl} size={180} level="H" includeMargin={false} />
                  {isExp && (
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(254, 242, 242, 0.88)',
                      borderRadius: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      color: '#b91c1c'
                    }}>
                      <XCircle size={32} />
                      <strong style={{ fontSize: '13px', fontWeight: 800 }}>CODE EXPIRED</strong>
                      <span style={{ fontSize: '11px', textAlign: 'center', padding: '0 12px' }}>Link &amp; QR are deactivated</span>
                    </div>
                  )}
                </div>

                <div style={{ textAlign: 'center', width: '100%' }}>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#111827' }}>{showPromoQrModal.name}</div>
                  <div style={{ marginTop: '4px' }}>
                    <code style={{
                      background: isExp ? '#fee2e2' : '#fef3c7',
                      color: isExp ? '#991b1b' : '#b45309',
                      padding: '3px 10px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: 800,
                      textDecoration: isExp ? 'line-through' : 'none'
                    }}>
                      {showPromoQrModal.code}
                    </code>
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px' }}>
                    {isExp ? 'This promo has expired and scanning will show the expired alert.' : `Valid until ${showPromoQrModal.expiresAt ? new Date(showPromoQrModal.expiresAt).toLocaleDateString() : 'Dec 31, 2026'}`}
                  </div>
                </div>

                <div style={{ width: '100%', background: '#f9fafb', borderRadius: '8px', padding: '8px 12px', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="text"
                    readOnly
                    value={promoUrl}
                    style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '11px', color: '#4b5563', outline: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        navigator.clipboard.writeText(promoUrl);
                        showNotify('Promotional link copied to clipboard!');
                      } catch (_) {}
                    }}
                    style={{
                      padding: '4px 8px',
                      background: '#ffffff',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Copy
                  </button>
                  <a
                    href={promoUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      padding: '4px 8px',
                      background: '#ea580c',
                      color: '#fff',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      textDecoration: 'none'
                    }}
                  >
                    Test Open
                  </a>
                </div>
              </div>

              <div style={{ padding: '12px 20px', background: '#fafaf9', borderTop: '1px solid #e7e5e4', display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" className="staff-pin-cancel-btn" onClick={() => setShowPromoQrModal(null)}>Close</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* LIVE PREVIEW ONLY MODAL */}

      {previewItem && (
        <div className="staff-pin-backdrop" onClick={() => setPreviewItem(null)}>
          <div className="admin-modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="admin-preview-card" style={{ margin: 0 }}>
              <img src={previewItem.image} alt={previewItem.name} className="admin-preview-img" style={{ height: '220px' }} />
              <div className="admin-preview-body" style={{ padding: '20px' }}>
                <span className="admin-cat-chip">{previewItem.category}</span>
                <h3 style={{ margin: '8px 0 4px', fontSize: '20px' }}>{previewItem.name}</h3>
                <p style={{ fontSize: '13px', color: '#666', lineHeight: '1.4' }}>{previewItem.description}</p>
                <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '22px', fontWeight: '800', color: '#C24522' }}>₱{previewItem.price}</span>
                  <span className="admin-cat-chip" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669' }}>
                    In Stock ({previewItem.stock ?? 25} units)
                  </span>
                </div>
              </div>
            </div>
            <button type="button" className="admin-btn-primary" style={{ width: '100%', marginTop: '14px' }} onClick={() => setPreviewItem(null)}>
              Close Live Preview
            </button>
          </div>
        </div>
      )}

      {/* CATEGORY MODAL (ADD / RENAME) */}
      {showCategoryModal && (
        <div className="staff-pin-backdrop" style={{ zIndex: 100050 }} onClick={() => setShowCategoryModal(false)}>
          <div className="admin-modal-small" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', padding: '24px' }}>
            <div className="admin-modal-header" style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#2a1a0f' }}>
                {editingCategory ? 'Rename Category' : 'Add New Food Category'}
              </h2>
              <button type="button" className="staff-pin-close" onClick={() => setShowCategoryModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="admin-input-group" style={{ margin: 0 }}>
                <label className="admin-input-label">Category Name *</label>
                <input
                  type="text"
                  className="admin-input-field"
                  placeholder="e.g. Ramen, Sushi, BBQ Bowls..."
                  value={formCategory.name}
                  onChange={e => setFormCategory({ ...formCategory, name: e.target.value })}
                  autoFocus
                  required
                />
              </div>

              <div className="admin-input-group" style={{ margin: 0 }}>
                <label className="admin-input-label">Category Icon / Emoji</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '26px', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff5ee', borderRadius: '8px', border: '1.5px solid #f5c4a1', flexShrink: 0 }}>
                    {formCategory.icon || '🍽️'}
                  </span>
                  <input
                    type="text"
                    className="admin-input-field"
                    style={{ width: '80px', textAlign: 'center', fontSize: '18px' }}
                    value={formCategory.icon}
                    onChange={e => setFormCategory({ ...formCategory, icon: e.target.value })}
                    maxLength={4}
                  />
                  <span style={{ fontSize: '12px', color: '#777' }}>Or pick one below:</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '110px', overflowY: 'auto', padding: '8px', background: '#faf8f5', borderRadius: '8px', border: '1px solid #f0e6dd' }}>
                  {['🍽️','🥟','🍜','🍚','🍦','🍱','🍔','🍗','🍟','🥗','🧋','🥩','🍣','🍕','🌮','🥪','🥘','🍲','🫔','🥞','🥤','☕','🧁','🍢','🍤','🧇','🌭','🍙'].map((emoji, idx) => (
                    <button
                      key={idx}
                      type="button"
                      style={{
                        background: formCategory.icon === emoji ? '#c05a1f' : '#ffffff',
                        color: formCategory.icon === emoji ? '#ffffff' : '#333333',
                        border: formCategory.icon === emoji ? '1.5px solid #c05a1f' : '1px solid #e2d9d0',
                        borderRadius: '6px',
                        padding: '6px',
                        fontSize: '18px',
                        cursor: 'pointer',
                        lineHeight: 1,
                        transition: 'all 0.1s ease'
                      }}
                      onClick={() => setFormCategory({ ...formCategory, icon: emoji })}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="admin-modal-footer" style={{ marginTop: '8px', paddingTop: '14px', borderTop: '1px solid #eee' }}>
                <button type="button" className="staff-pin-cancel-btn" onClick={() => setShowCategoryModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="staff-pin-submit-btn">
                  <CheckCircle size={16} />
                  <span>{editingCategory ? 'Update Category' : 'Save & Connect'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMBO PREVIEW MODAL */}
      {previewCombo && (
        <div className="staff-pin-backdrop" style={{ zIndex: 100060 }} onClick={() => setPreviewCombo(null)}>
          <div className="admin-modal-small" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px', padding: '0', overflow: 'hidden' }}>
            <div style={{ position: 'relative', width: '100%', height: '200px' }}>
              <img src={previewCombo.image} alt={previewCombo.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button
                type="button"
                className="staff-pin-close"
                style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(255,255,255,0.9)', borderRadius: '50%', padding: '6px' }}
                onClick={() => setPreviewCombo(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span className="admin-cat-chip" style={{
                  background: previewCombo.status === 'active' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                  color: previewCombo.status === 'active' ? '#059669' : '#d97706',
                  fontWeight: 700
                }}>
                  ● {previewCombo.status === 'active' ? 'Active' : previewCombo.status === 'scheduled' ? 'Scheduled' : 'Expired'}
                </span>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>{previewCombo.dateRange}</span>
              </div>
              <h3 style={{ margin: '0 0 10px', fontSize: '20px', fontWeight: 800, color: '#111827' }}>{previewCombo.name}</h3>
              <div style={{ background: '#faf6f0', borderRadius: '10px', padding: '12px 14px', marginBottom: '14px', fontSize: '13px', color: '#4b5563' }}>
                <div style={{ marginBottom: '4px' }}><strong>Main:</strong> {previewCombo.main}</div>
                <div style={{ marginBottom: '4px' }}><strong>Side:</strong> {previewCombo.side}</div>
                <div><strong>Drink:</strong> {previewCombo.drink}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <span style={{ textDecoration: 'line-through', color: '#9ca3af', fontSize: '16px' }}>₱{previewCombo.originalPrice}</span>
                <span style={{ fontSize: '24px', fontWeight: 800, color: '#059669' }}>₱{previewCombo.promoPrice}</span>
                <span style={{ background: '#ecfdf5', color: '#059669', fontSize: '12px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px', border: '1px solid #a7f3d0' }}>
                  Save ₱{previewCombo.originalPrice - previewCombo.promoPrice}
                </span>
              </div>
              <button type="button" className="admin-btn-primary" style={{ width: '100%' }} onClick={() => setPreviewCombo(null)}>
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT COMBO MODAL */}
      {showComboModal && (
        <div className="staff-pin-backdrop" style={{ zIndex: 100050 }} onClick={() => setShowComboModal(false)}>
          <div className="admin-modal-small" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="admin-modal-header" style={{ marginBottom: '18px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#2a1a0f' }}>
                {editingCombo ? 'Edit Combo Meal' : 'Create New Combo Meal'}
              </h2>
              <button type="button" className="staff-pin-close" onClick={() => setShowComboModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCombo} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="admin-input-group" style={{ margin: 0 }}>
                <label className="admin-input-label">Combo Name *</label>
                <input
                  type="text"
                  className="admin-input-field"
                  placeholder="e.g. Ultimate Teriyaki Feast Combo"
                  value={formCombo.name}
                  onChange={e => setFormCombo({ ...formCombo, name: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="admin-input-group" style={{ margin: 0 }}>
                  <label className="admin-input-label">Original Price (₱) *</label>
                  <input
                    type="number"
                    className="admin-input-field"
                    value={formCombo.originalPrice}
                    onChange={e => setFormCombo({ ...formCombo, originalPrice: Number(e.target.value) })}
                    min="1"
                    required
                  />
                </div>
                <div className="admin-input-group" style={{ margin: 0 }}>
                  <label className="admin-input-label">Promo Price (₱) *</label>
                  <input
                    type="number"
                    className="admin-input-field"
                    value={formCombo.promoPrice}
                    onChange={e => setFormCombo({ ...formCombo, promoPrice: Number(e.target.value) })}
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="admin-input-group" style={{ margin: 0 }}>
                <label className="admin-input-label">Main Dish *</label>
                <input
                  type="text"
                  className="admin-input-field"
                  placeholder="e.g. Chicken Teriyaki Rice Bowl"
                  value={formCombo.main}
                  onChange={e => setFormCombo({ ...formCombo, main: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="admin-input-group" style={{ margin: 0 }}>
                  <label className="admin-input-label">Side Dish *</label>
                  <input
                    type="text"
                    className="admin-input-field"
                    placeholder="e.g. Pork & Chive Gyoza"
                    value={formCombo.side}
                    onChange={e => setFormCombo({ ...formCombo, side: e.target.value })}
                    required
                  />
                </div>
                <div className="admin-input-group" style={{ margin: 0 }}>
                  <label className="admin-input-label">Drink *</label>
                  <input
                    type="text"
                    className="admin-input-field"
                    placeholder="e.g. Matcha Boba Milk Tea"
                    value={formCombo.drink}
                    onChange={e => setFormCombo({ ...formCombo, drink: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="admin-input-group" style={{ margin: 0 }}>
                  <label className="admin-input-label">Status</label>
                  <select
                    className="admin-input-field"
                    value={formCombo.status}
                    onChange={e => setFormCombo({ ...formCombo, status: e.target.value })}
                  >
                    <option value="active">Active</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
                <div className="admin-input-group" style={{ margin: 0 }}>
                  <label className="admin-input-label">Validity Dates</label>
                  <input
                    type="text"
                    className="admin-input-field"
                    placeholder="e.g. Jan 1, 2024 – Dec 31, 2024"
                    value={formCombo.dateRange}
                    onChange={e => setFormCombo({ ...formCombo, dateRange: e.target.value })}
                  />
                </div>
              </div>

              <div className="admin-input-group" style={{ margin: 0 }}>
                <label className="admin-input-label">Image URL</label>
                <input
                  type="url"
                  className="admin-input-field"
                  placeholder="https://..."
                  value={formCombo.image}
                  onChange={e => setFormCombo({ ...formCombo, image: e.target.value })}
                />
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                  {[
                    { label: 'Feast', url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80' },
                    { label: 'Dumplings', url: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=600&q=80' },
                    { label: 'Curry', url: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?auto=format&fit=crop&w=600&q=80' },
                    { label: 'Mango', url: 'https://images.unsplash.com/photo-1562440499-64c9a111f713?auto=format&fit=crop&w=600&q=80' },
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      style={{
                        padding: '4px 8px',
                        fontSize: '11px',
                        borderRadius: '6px',
                        border: '1px solid #e5e7eb',
                        background: formCombo.image === preset.url ? '#c05a1f' : '#fff',
                        color: formCombo.image === preset.url ? '#fff' : '#4b5563',
                        cursor: 'pointer'
                      }}
                      onClick={() => setFormCombo({ ...formCombo, image: preset.url })}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="admin-modal-footer" style={{ marginTop: '8px', paddingTop: '14px', borderTop: '1px solid #eee' }}>
                <button type="button" className="staff-pin-cancel-btn" onClick={() => setShowComboModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="staff-pin-submit-btn">
                  <CheckCircle size={16} />
                  <span>{editingCombo ? 'Update Combo' : 'Save & Publish Combo'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MIX & MATCH MODAL */}
      {showMixMatchModal && (
        <div className="staff-pin-backdrop" style={{ zIndex: 100050 }} onClick={() => setShowMixMatchModal(false)}>
          <div className="admin-modal-small" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="admin-modal-header" style={{ marginBottom: '18px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#2a1a0f' }}>
                {editingMixMatch ? 'Edit Mix & Match Bundle' : 'Create Mix & Match Bundle'}
              </h2>
              <button type="button" className="staff-pin-close" onClick={() => setShowMixMatchModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveMixMatch} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="admin-input-group" style={{ margin: 0 }}>
                <label className="admin-input-label">Bundle Name *</label>
                <input
                  type="text"
                  className="admin-input-field"
                  placeholder="e.g. Craft Bowl + Side + Drink Deal"
                  value={formMixMatch.name}
                  onChange={e => setFormMixMatch({ ...formMixMatch, name: e.target.value })}
                  required
                />
              </div>

              <div className="admin-input-group" style={{ margin: 0 }}>
                <label className="admin-input-label">Subtitle / Description</label>
                <input
                  type="text"
                  className="admin-input-field"
                  placeholder="e.g. Craft your perfect meal with our signature favorites!"
                  value={formMixMatch.subtitle}
                  onChange={e => setFormMixMatch({ ...formMixMatch, subtitle: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="admin-input-group" style={{ margin: 0 }}>
                  <label className="admin-input-label">Bundle Price (₱) *</label>
                  <input
                    type="number"
                    className="admin-input-field"
                    value={formMixMatch.price}
                    onChange={e => setFormMixMatch({ ...formMixMatch, price: Number(e.target.value) })}
                    min="1"
                    required
                  />
                </div>
                <div className="admin-input-group" style={{ margin: 0 }}>
                  <label className="admin-input-label">Status</label>
                  <select
                    className="admin-input-field"
                    value={formMixMatch.status}
                    onChange={e => setFormMixMatch({ ...formMixMatch, status: e.target.value })}
                  >
                    <option value="active">Active</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
              </div>

              <div className="admin-input-group" style={{ margin: 0 }}>
                <label className="admin-input-label">Validity Dates</label>
                <input
                  type="text"
                  className="admin-input-field"
                  placeholder="e.g. Jan 1, 2024 – Dec 31, 2024"
                  value={formMixMatch.dateRange}
                  onChange={e => setFormMixMatch({ ...formMixMatch, dateRange: e.target.value })}
                />
              </div>

              {/* Main meal selection */}
              <div style={{ background: '#faf6f0', borderRadius: '10px', padding: '12px', border: '1px solid #f0e6dd' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '8px' }}>
                  1. Main Meal Options ({formMixMatch.selectedMain?.length || 0} selected)
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '100px', overflowY: 'auto' }}>
                  {menuItems.filter(i => i.category !== 'Drinks' && i.category !== 'Desserts').map(item => {
                    const isSel = formMixMatch.selectedMain?.includes(item.name);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          border: isSel ? '1.5px solid #c05a1f' : '1px solid #d1d5db',
                          background: isSel ? '#c05a1f' : '#fff',
                          color: isSel ? '#fff' : '#374151',
                          cursor: 'pointer'
                        }}
                        onClick={() => {
                          const next = isSel
                            ? formMixMatch.selectedMain.filter(n => n !== item.name)
                            : [...(formMixMatch.selectedMain || []), item.name];
                          setFormMixMatch({ ...formMixMatch, selectedMain: next });
                        }}
                      >
                        {item.name} (₱{item.price})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Side dish selection */}
              <div style={{ background: '#faf6f0', borderRadius: '10px', padding: '12px', border: '1px solid #f0e6dd' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '8px' }}>
                  2. Side Dish Options ({formMixMatch.selectedSide?.length || 0} selected)
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '100px', overflowY: 'auto' }}>
                  {menuItems.filter(i => i.category === 'Appetizers' || i.category === 'Snacks' || i.category === 'Dumplings').concat([
                    { id: 'side-gyoza', name: 'Pork & Chive Gyoza', price: 90 },
                    { id: 'side-wings', name: 'Crispy Chicken Wings', price: 120 },
                    { id: 'side-fries', name: 'Crinkle Cut Fries', price: 95 }
                  ]).filter((v, i, a) => a.findIndex(t => t.name === v.name) === i).map(item => {
                    const isSel = formMixMatch.selectedSide?.includes(item.name);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          border: isSel ? '1.5px solid #c05a1f' : '1px solid #d1d5db',
                          background: isSel ? '#c05a1f' : '#fff',
                          color: isSel ? '#fff' : '#374151',
                          cursor: 'pointer'
                        }}
                        onClick={() => {
                          const next = isSel
                            ? formMixMatch.selectedSide.filter(n => n !== item.name)
                            : [...(formMixMatch.selectedSide || []), item.name];
                          setFormMixMatch({ ...formMixMatch, selectedSide: next });
                        }}
                      >
                        {item.name} (₱{item.price})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Drink options */}
              <div style={{ background: '#faf6f0', borderRadius: '10px', padding: '12px', border: '1px solid #f0e6dd' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '8px' }}>
                  3. Drink Options ({formMixMatch.selectedDrinks?.length || 0} selected)
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '100px', overflowY: 'auto' }}>
                  {menuItems.filter(i => i.category === 'Drinks').concat([
                    { id: 'dr-matcha', name: 'Matcha Boba Milk Tea', price: 120 },
                    { id: 'dr-taro', name: 'Iced Taro Milk Tea', price: 110 },
                    { id: 'dr-lemon', name: 'House Lemonade', price: 95 },
                    { id: 'dr-greentea', name: 'Iced Green Tea', price: 90 }
                  ]).filter((v, i, a) => a.findIndex(t => t.name === v.name) === i).map(drink => {
                    const isSel = formMixMatch.selectedDrinks?.includes(drink.name);
                    return (
                      <button
                        key={drink.id}
                        type="button"
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          border: isSel ? '1.5px solid #c05a1f' : '1px solid #d1d5db',
                          background: isSel ? '#c05a1f' : '#fff',
                          color: isSel ? '#fff' : '#374151',
                          cursor: 'pointer'
                        }}
                        onClick={() => {
                          const next = isSel
                            ? formMixMatch.selectedDrinks.filter(n => n !== drink.name)
                            : [...(formMixMatch.selectedDrinks || []), drink.name];
                          setFormMixMatch({ ...formMixMatch, selectedDrinks: next });
                        }}
                      >
                        {drink.name} (₱{drink.price})
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="admin-modal-footer" style={{ marginTop: '8px', paddingTop: '14px', borderTop: '1px solid #eee' }}>
                <button type="button" className="staff-pin-cancel-btn" onClick={() => setShowMixMatchModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="staff-pin-submit-btn">
                  <CheckCircle size={16} />
                  <span>{editingMixMatch ? 'Update Bundle' : 'Save & Publish Bundle'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ORDER DETAILS MODAL */}
      {viewingOrder && (
        <div className="admin-modal-backdrop" onClick={() => setViewingOrder(null)}>
          <div
            className="admin-modal-card fade-in"
            style={{ maxWidth: '620px', width: '90%', padding: '24px', borderRadius: '16px', background: '#fff' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #f3f4f6' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#111827', margin: 0 }}>
                    Order #{viewingOrder.id}
                  </h2>
                  <span style={{
                    padding: '3px 10px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: 700,
                    background: viewingOrder.status === 'Completed' ? '#ecfdf5' : '#eff6ff',
                    color: viewingOrder.status === 'Completed' ? '#059669' : '#1d4ed8',
                    border: viewingOrder.status === 'Completed' ? '1px solid #a7f3d0' : '1px solid #bfdbfe'
                  }}>
                    {viewingOrder.status}
                  </span>
                </div>
                <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#6b7280' }}>
                  Placed on {viewingOrder.time} ({viewingOrder.timeAgo}) • Wait time: {viewingOrder.waitTime}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setViewingOrder(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Customer & Location Details Card */}
            <div style={{
              background: '#fafaf9',
              borderRadius: '10px',
              padding: '12px 16px',
              marginBottom: '16px',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px',
              border: '1px solid #f0eee9'
            }}>
              <div>
                <span style={{ fontSize: '11px', color: '#78716c', display: 'block', fontWeight: 600 }}>Customer</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#1c1917' }}>{viewingOrder.customer}</span>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#78716c', display: 'block', fontWeight: 600 }}>Order Type & Table</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#1c1917' }}>
                  {viewingOrder.orderType} • {viewingOrder.location}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#78716c', display: 'block', fontWeight: 600 }}>Payment Method</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#1c1917' }}>{viewingOrder.payment} (Paid)</span>
              </div>
            </div>

            {/* Allergen Warning Banner if present */}
            {viewingOrder.isAllergy && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '10px 14px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#dc2626'
              }}>
                <AlertTriangle size={16} />
                <span style={{ fontSize: '12.5px', fontWeight: 700 }}>
                  ALLERGEN WARNING: {viewingOrder.note}
                </span>
              </div>
            )}

            {/* Items Table */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                Order Items ({viewingOrder.items?.length || 0})
              </div>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                {viewingOrder.items && viewingOrder.items.map((it, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderBottom: idx < viewingOrder.items.length - 1 ? '1px solid #f3f4f6' : 'none',
                      background: idx % 2 === 0 ? '#ffffff' : '#fafafa'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img
                        src={it.image}
                        alt={it.name}
                        style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #e5e7eb' }}
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=150&q=80';
                        }}
                      />
                      <div>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827', display: 'block' }}>
                          {it.name}
                        </span>
                        <span style={{ fontSize: '11px', color: '#6b7280' }}>
                          ₱{it.price} each × {it.qty}
                        </span>
                      </div>
                    </div>
                    <strong style={{ fontSize: '13.5px', color: '#111827' }}>
                      ₱{(it.price * it.qty).toFixed(2)}
                    </strong>
                  </div>
                ))}
              </div>
            </div>

            {/* Special Instructions / Notes */}
            {viewingOrder.note && !viewingOrder.isAllergy && (
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '10px 14px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <FileText size={14} color="#64748b" />
                <span style={{ fontSize: '12px', color: '#334155' }}>
                  <strong>Customer Note:</strong> {viewingOrder.note}
                </span>
              </div>
            )}

            {/* Total summary */}
            <div style={{
              background: '#fafaf9',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '18px',
              border: '1px solid #f0eee9'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                <span>Subtotal</span>
                <span>₱{(viewingOrder.total * 0.88).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>
                <span>VAT (12% Included)</span>
                <span>₱{(viewingOrder.total * 0.12).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 800, color: '#111827', paddingTop: '6px', borderTop: '1px solid #e5e7eb' }}>
                <span>Grand Total</span>
                <span style={{ color: '#e45729' }}>₱{viewingOrder.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Footer Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => { handlePrintOrder(viewingOrder); setViewingOrder(null); }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  background: '#ffffff',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#374151',
                  cursor: 'pointer'
                }}
              >
                <Printer size={14} />
                <span>Print Receipt</span>
              </button>

              <button
                type="button"
                onClick={() => setViewingOrder(null)}
                style={{
                  padding: '8px 16px',
                  background: '#e45729',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT PRINT PREVIEW MODAL */}
      {printingOrder && (
        <div className="admin-modal-backdrop" onClick={() => setPrintingOrder(null)}>
          <div
            className="admin-modal-card fade-in"
            style={{ maxWidth: '420px', width: '90%', padding: '24px', borderRadius: '14px', background: '#fff' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center', paddingBottom: '14px', borderBottom: '1px dashed #d1d5db', marginBottom: '14px' }}>
              <h3 style={{ margin: '0 0 2px', fontSize: '18px', fontWeight: 800 }}>UMAMI CRAFT FUSION</h3>
              <p style={{ margin: 0, fontSize: '11px', color: '#6b7280' }}>ASIAN CRAFT FUSION DINING</p>
              <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#9ca3af' }}>RECEIPT • #{printingOrder.id}</p>
            </div>

            <div style={{ fontSize: '11.5px', color: '#374151', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span>Date & Time:</span>
                <strong>{printingOrder.time}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span>Customer:</span>
                <strong>{printingOrder.customer}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span>Location:</span>
                <strong>{printingOrder.location} ({printingOrder.orderType})</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Payment:</span>
                <strong>{printingOrder.payment}</strong>
              </div>
            </div>

            <div style={{ borderTop: '1px dashed #d1d5db', borderBottom: '1px dashed #d1d5db', padding: '10px 0', marginBottom: '12px' }}>
              {printingOrder.items && printingOrder.items.map((it, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span>{it.qty}x {it.name}</span>
                  <strong>₱{(it.price * it.qty).toFixed(2)}</strong>
                </div>
              ))}
            </div>

            <div style={{ fontSize: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 800, color: '#111827' }}>
                <span>TOTAL DUE:</span>
                <span>₱{printingOrder.total.toFixed(2)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setPrintingOrder(null)}
                style={{
                  flex: 1,
                  padding: '8px',
                  background: '#f3f4f6',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => { window.print(); setPrintingOrder(null); }}
                style={{
                  flex: 1,
                  padding: '8px',
                  background: '#16a34a',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                Print Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SIZE PRESETS */}
      {showSizePresetsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.55)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '560px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            overflow: 'hidden',
            animation: 'fadeIn 0.2s ease'
          }}>
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#fcfbf9'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#111827' }}>
                  Manage Size Presets
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '12.5px', color: '#6b7280' }}>
                  Configure standard volume metrics and defaults for beverage offerings.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSizePresetsModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  color: '#9ca3af',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '20px 24px', maxHeight: '65vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { name: 'Small', volume: '355 ml', flOz: '12 fl oz', desc: 'Standard single serve portion' },
                  { name: 'Medium', volume: '500 ml', flOz: '16.9 fl oz', desc: 'Most popular regular serving' },
                  { name: 'Large', volume: '700 ml', flOz: '23.6 fl oz', desc: 'Upsized beverage size' },
                  { name: 'Pitcher / XL', volume: '1000 ml', flOz: '33.8 fl oz', desc: 'Sharing pitcher portion' }
                ].map((preset, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      background: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: '10px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ fontSize: '14px', color: '#111827' }}>{preset.name}</strong>
                        <span style={{ fontSize: '11.5px', color: '#059669', background: '#ecfdf5', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                          {preset.volume}
                        </span>
                        <span style={{ fontSize: '11px', color: '#6b7280' }}>({preset.flOz})</span>
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#6b7280', marginTop: '2px' }}>{preset.desc}</div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>Active</span>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{
                marginTop: '16px',
                padding: '12px',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#1e40af'
              }}>
                💡 Presets define the standard metric options available when configuring drinks. Prices and stock remain independent per drink.
              </div>
            </div>

            <div style={{
              padding: '14px 24px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              background: '#f9fafb'
            }}>
              <button
                type="button"
                onClick={() => setShowSizePresetsModal(false)}
                style={{
                  padding: '8px 18px',
                  background: '#ffffff',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#374151',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  showNotify('Size presets saved successfully!');
                  setShowSizePresetsModal(false);
                }}
                style={{
                  padding: '8px 18px',
                  background: '#e45729',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                Save Presets
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT DRINK */}
      {showDrinkModal && (
        <div className="staff-pin-backdrop" onClick={() => setShowDrinkModal(false)}>
          <div className="admin-modal-large" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '860px' }}>
            <div className="admin-modal-header">
              <div>
                <h2>{editingDrink ? 'Edit Beverage & Pricing' : 'Add New Beverage'}</h2>
                <p style={{ margin: '2px 0 0 0', fontSize: '12.5px', color: '#6b7280' }}>
                  Define beverage image, custom add-ons, and size-specific pricing & stock.
                </p>
              </div>
              <button type="button" className="staff-pin-close" onClick={() => setShowDrinkModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!formDrink.name.trim()) {
                  showNotify('Please enter a drink name.', 'error');
                  return;
                }
                const addonArr = formDrink.addons
                  ? (Array.isArray(formDrink.addons) ? formDrink.addons : formDrink.addons.split(',').map(s => s.trim()).filter(Boolean))
                  : [];

                const totalStock = formDrink.sizes ? formDrink.sizes.reduce((acc, s) => acc + (s.stock || 0), 0) : 0;
                const anyLow = formDrink.sizes ? formDrink.sizes.some(s => s.stock <= 6 && s.stock > 0) : false;
                const allOut = formDrink.sizes ? formDrink.sizes.every(s => s.stock === 0) : false;
                const status = allOut ? 'Unavailable' : anyLow ? 'Low Stock' : 'Available';

                if (editingDrink) {
                  const updatedDrink = {
                    ...editingDrink,
                    name: formDrink.name,
                    category: formDrink.category,
                    sku: formDrink.sku || formDrink.id,
                    image: formDrink.image || editingDrink.image,
                    description: formDrink.description,
                    addons: addonArr,
                    sizes: formDrink.sizes,
                    status: status
                  };
                  const updatedDrinks = drinks.map(d => String(d.id) === String(editingDrink.id) ? updatedDrink : d);
                  setDrinks(updatedDrinks);
                  try {
                    localStorage.setItem('umami_drinks', JSON.stringify(updatedDrinks));
                  } catch (e) {
                    console.warn('localStorage quota note:', e);
                  }
                  fetch(`/api/drinks/${editingDrink.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedDrink)
                  }).catch(err => console.warn('Failed to sync drink edit to API:', err));
                  window.dispatchEvent(new CustomEvent('umami_catalog_updated'));
                  addAuditLog('Drink Updated', `Updated beverage "${formDrink.name}"`);
                  showNotify(`"${formDrink.name}" updated successfully!`);
                } else {
                  const newId = formDrink.sku || `DRK-00${drinks.length + 1}`;
                  const newBeverage = {
                    id: newId,
                    sku: newId,
                    name: formDrink.name,
                    image: formDrink.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80',
                    status: status,
                    available: true,
                    category: formDrink.category,
                    description: formDrink.description,
                    addons: addonArr,
                    sizes: formDrink.sizes
                  };
                  const updatedDrinks = [newBeverage, ...drinks];
                  setDrinks(updatedDrinks);
                  try {
                    localStorage.setItem('umami_drinks', JSON.stringify(updatedDrinks));
                  } catch (e) {
                    console.warn('localStorage quota note:', e);
                  }
                  fetch('/api/drinks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newBeverage)
                  }).catch(err => console.warn('Failed to sync new drink to API:', err));
                  window.dispatchEvent(new CustomEvent('umami_catalog_updated'));
                  addAuditLog('Drink Created', `Added new beverage "${newBeverage.name}"`);
                  showNotify(`"${newBeverage.name}" added to drinks!`);
                }
                setShowDrinkModal(false);
              }}
              className="admin-form-grid"
            >
              {/* Form Left Side */}
              <div className="admin-form-left">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="admin-input-group">
                    <label className="admin-input-label">Drink Name *</label>
                    <input
                      type="text"
                      className="admin-input-field"
                      value={formDrink.name}
                      onChange={(e) => setFormDrink({ ...formDrink, name: e.target.value })}
                      required
                      placeholder="e.g. Matcha Boba Milk Tea"
                    />
                  </div>

                  <div className="admin-input-group">
                    <label className="admin-input-label">Category *</label>
                    <select
                      className="admin-select"
                      value={formDrink.category}
                      onChange={(e) => setFormDrink({ ...formDrink, category: e.target.value })}
                    >
                      <option value="Milk Tea">Milk Tea</option>
                      <option value="Fruit Shake">Fruit Shake</option>
                      <option value="Iced Tea">Iced Tea</option>
                      <option value="Bottled Drinks">Bottled Drinks</option>
                      <option value="Hot Coffee">Hot Coffee</option>
                      <option value="Mocktails">Mocktails</option>
                    </select>
                  </div>
                </div>

                <div className="admin-input-group">
                  <label className="admin-input-label">SKU Code</label>
                  <input
                    type="text"
                    className="admin-input-field"
                    value={formDrink.sku || formDrink.id}
                    onChange={(e) => setFormDrink({ ...formDrink, sku: e.target.value })}
                    placeholder="DRK-00X"
                  />
                </div>

                {/* Beverage Image Upload & Source */}
                <div className="admin-input-group">
                  <label className="admin-input-label">Beverage Image Upload &amp; Source *</label>

                  {/* File Upload Button & URL input */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <label className="admin-btn-primary" style={{ cursor: 'pointer', flex: 1, justifyContent: 'center', fontSize: '12px', padding: '8px 12px' }}>
                      <ImageIcon size={15} />
                      <span>Upload Image File from Device</span>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files && e.target.files[0];
                          if (file) {
                            handleUploadImageFile(file, (imgUrl) => {
                              setFormDrink(prev => ({ ...prev, image: imgUrl }));
                            });
                          }
                        }}
                      />
                    </label>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      className="admin-input-field"
                      value={formDrink.image}
                      onChange={(e) => setFormDrink(prev => ({ ...prev, image: e.target.value }))}
                      required
                      placeholder="Image URL or uploaded file data..."
                    />
                    {formDrink.image && (
                      <button
                        type="button"
                        className="admin-btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '12px', whiteSpace: 'nowrap' }}
                        onClick={() => setFormDrink(prev => ({ ...prev, image: '' }))}
                        title="Clear image"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Preset Sample Drink Images */}
                  <div style={{ marginTop: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#786456' }}>Or pick a sample drink image:</span>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                      {[
                        { label: '🧋 Boba Tea', url: 'https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=600&q=80' },
                        { label: '🍵 Matcha', url: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80' },
                        { label: '🥤 Iced Tea', url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80' },
                        { label: '🥭 Mango Shake', url: 'https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=600&q=80' },
                        { label: '🧃 Lemonade', url: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?auto=format&fit=crop&w=600&q=80' },
                        { label: '☕ Coffee', url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80' },
                      ].map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="admin-btn-sm"
                          style={{ fontSize: '10.5px', padding: '3px 8px' }}
                          onClick={() => setFormDrink(prev => ({ ...prev, image: preset.url }))}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="admin-input-group">
                  <label className="admin-input-label">Description *</label>
                  <textarea
                    className="admin-input-field"
                    rows="2"
                    value={formDrink.description}
                    onChange={(e) => setFormDrink({ ...formDrink, description: e.target.value })}
                    required
                    placeholder="Describe the beverage ingredients and notes..."
                  />
                </div>

                <div className="admin-input-group">
                  <label className="admin-input-label">Add-on Options (comma separated)</label>
                  <input
                    type="text"
                    className="admin-input-field"
                    value={typeof formDrink.addons === 'string' ? formDrink.addons : (formDrink.addons?.join(', ') || '')}
                    onChange={(e) => setFormDrink({ ...formDrink, addons: e.target.value })}
                    placeholder="e.g. Extra Pearls, Less Ice, Grass Jelly"
                  />
                </div>

                {/* Sizes Grid */}
                <div style={{ marginTop: '14px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#111827', marginBottom: '8px' }}>
                    Sizes, Volumes, Pricing &amp; Stock
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {formDrink.sizes && formDrink.sizes.map((sz, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1.2fr 1fr 1fr 1fr',
                          gap: '8px',
                          alignItems: 'center',
                          padding: '8px 12px',
                          background: '#f9fafb',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600 }}>Size</div>
                          <input
                            type="text"
                            value={sz.name}
                            onChange={(e) => {
                              const newSizes = [...formDrink.sizes];
                              newSizes[idx].name = e.target.value;
                              setFormDrink({ ...formDrink, sizes: newSizes });
                            }}
                            style={{
                              width: '100%',
                              padding: '4px 8px',
                              border: '1px solid #d1d5db',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 700
                            }}
                          />
                        </div>

                        <div>
                          <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600 }}>Volume</div>
                          <input
                            type="text"
                            value={sz.volume}
                            onChange={(e) => {
                              const newSizes = [...formDrink.sizes];
                              newSizes[idx].volume = e.target.value;
                              setFormDrink({ ...formDrink, sizes: newSizes });
                            }}
                            style={{
                              width: '100%',
                              padding: '4px 8px',
                              border: '1px solid #d1d5db',
                              borderRadius: '4px',
                              fontSize: '12px'
                            }}
                          />
                        </div>

                        <div>
                          <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600 }}>Price (₱)</div>
                          <input
                            type="number"
                            value={sz.price}
                            onChange={(e) => {
                              const newSizes = [...formDrink.sizes];
                              newSizes[idx].price = Number(e.target.value);
                              setFormDrink({ ...formDrink, sizes: newSizes });
                            }}
                            style={{
                              width: '100%',
                              padding: '4px 8px',
                              border: '1px solid #d1d5db',
                              borderRadius: '4px',
                              fontSize: '12px'
                            }}
                          />
                        </div>

                        <div>
                          <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600 }}>Stock</div>
                          <input
                            type="number"
                            value={sz.stock}
                            onChange={(e) => {
                              const newSizes = [...formDrink.sizes];
                              newSizes[idx].stock = Number(e.target.value);
                              setFormDrink({ ...formDrink, sizes: newSizes });
                            }}
                            style={{
                              width: '100%',
                              padding: '4px 8px',
                              border: '1px solid #d1d5db',
                              borderRadius: '4px',
                              fontSize: '12px'
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Form Right Side: Live Customer Menu Card Preview */}
              <div className="admin-form-right">
                <div className="admin-live-preview-box">
                  <div className="admin-lp-badge">
                    <Eye size={13} /> Live Customer Beverage Preview
                  </div>

                  <div className="admin-preview-card">
                    <img
                      src={formDrink.image || 'https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=600&q=80'}
                      alt={formDrink.name}
                      className="admin-preview-img"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=600&q=80';
                      }}
                    />
                    <div className="admin-preview-body">
                      <span className="admin-cat-chip">{formDrink.category}</span>
                      <h4 className="admin-preview-name">{formDrink.name || 'Beverage Name'}</h4>
                      <p className="admin-preview-desc">{formDrink.description || 'Beverage notes and details will appear here.'}</p>
                      
                      {/* Sizes & Pricing display */}
                      {formDrink.sizes && formDrink.sizes.length > 0 && (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', margin: '6px 0' }}>
                          {formDrink.sizes.map((s, i) => (
                            <span key={i} style={{ fontSize: '11px', background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px', color: '#4b5563', fontWeight: 600 }}>
                              {s.name}: ₱{s.price} ({s.stock} in stock)
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="admin-preview-price-row">
                        <span className="admin-price-main">
                          ₱{formDrink.sizes && formDrink.sizes[0] ? formDrink.sizes[0].price : (formDrink.price || 0)}
                        </span>
                        <span className="admin-cat-chip" style={{ background: formDrink.available !== false ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)', color: formDrink.available !== false ? '#059669' : '#EF4444' }}>
                          {formDrink.available !== false ? 'Available' : 'Unavailable'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Verification Callout */}
                  <div className={`admin-verify-callout ${formDrink.image && formDrink.image.trim() !== '' ? 'valid' : 'invalid'}`}>
                    {formDrink.image && formDrink.image.trim() !== '' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                    <span>{formDrink.image && formDrink.image.trim() !== '' ? 'Beverage photo attached and ready.' : 'Beverage photo missing — select or upload one.'}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="admin-modal-footer">
                <button type="button" className="staff-pin-cancel-btn" onClick={() => setShowDrinkModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="staff-pin-submit-btn">
                  <CheckCircle size={16} />
                  <span>{editingDrink ? 'Save Changes' : 'Create Drink'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIEW DRINK DETAILS */}
      {viewingDrink && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.55)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            overflow: 'hidden',
            animation: 'fadeIn 0.2s ease'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#fcfbf9'
            }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#111827' }}>
                Beverage Details
              </h3>
              <button
                type="button"
                onClick={() => setViewingDrink(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '18px',
                  color: '#9ca3af',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', alignItems: 'center' }}>
                <img
                  src={viewingDrink.image}
                  alt={viewingDrink.name}
                  style={{
                    width: '90px',
                    height: '90px',
                    borderRadius: '12px',
                    objectFit: 'cover',
                    border: '1px solid #e5e7eb'
                  }}
                />
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>{viewingDrink.sku}</div>
                  <h4 style={{ margin: '2px 0 6px 0', fontSize: '18px', fontWeight: 800, color: '#111827' }}>
                    {viewingDrink.name}
                  </h4>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <span style={{ fontSize: '11px', background: '#f3f4f6', color: '#374151', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                      {viewingDrink.category}
                    </span>
                    <span style={{
                      fontSize: '11px',
                      background: viewingDrink.status === 'Available' ? '#ecfdf5' : viewingDrink.status === 'Low Stock' ? '#fffbeb' : '#fef2f2',
                      color: viewingDrink.status === 'Available' ? '#059669' : viewingDrink.status === 'Low Stock' ? '#d97706' : '#dc2626',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontWeight: 700
                    }}>
                      {viewingDrink.status}
                    </span>
                  </div>
                </div>
              </div>

              <p style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.5, margin: '0 0 16px 0' }}>
                {viewingDrink.description}
              </p>

              {viewingDrink.addons && viewingDrink.addons.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                    Available Customizations:
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {viewingDrink.addons.map((a, i) => (
                      <span key={i} style={{ fontSize: '11.5px', background: '#eff6ff', color: '#2563eb', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#111827', marginBottom: '8px' }}>
                Size &amp; Stock Breakdown
              </div>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                {viewingDrink.sizes.map((s, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      background: idx % 2 === 0 ? '#ffffff' : '#f9fafb',
                      borderBottom: idx === viewingDrink.sizes.length - 1 ? 'none' : '1px solid #e5e7eb',
                      fontSize: '12.5px'
                    }}
                  >
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <strong>{s.name}</strong>
                      <span style={{ color: '#6b7280', fontSize: '11.5px' }}>({s.volume})</span>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, color: '#111827' }}>₱{s.price}</span>
                      <span style={{ color: s.stock <= 6 ? '#d97706' : '#059669', fontWeight: 700 }}>
                        {s.stock} in stock
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'flex-end',
              background: '#f9fafb'
            }}>
              <button
                type="button"
                onClick={() => setViewingDrink(null)}
                style={{
                  padding: '7px 18px',
                  background: '#111827',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD STOCK ITEM (Connected to Menu Management & Drinks) */}
      {showAddStockModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.55)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '560px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            overflow: 'hidden',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              padding: '18px 22px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#fcfbf9'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#111827' }}>
                  Add Stock Item
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                  Connects seamlessly to Menu Management or Drinks &amp; Sizes Management.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddStockModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  color: '#9ca3af',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '20px 22px', overflowY: 'auto', flex: 1 }}>
              {/* Type selection */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                  Item Destination
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setFormStockItem({ ...formStockItem, type: 'menu', category: 'Appetizers' })}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: formStockItem.type === 'menu' ? '2px solid #e45729' : '1px solid #d1d5db',
                      background: formStockItem.type === 'menu' ? '#fff7ed' : '#ffffff',
                      color: formStockItem.type === 'menu' ? '#c2410c' : '#374151',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    🍽️ Food Menu Item
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormStockItem({ ...formStockItem, type: 'drink', category: 'Milk Tea' })}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: formStockItem.type === 'drink' ? '2px solid #e45729' : '1px solid #d1d5db',
                      background: formStockItem.type === 'drink' ? '#fff7ed' : '#ffffff',
                      color: formStockItem.type === 'drink' ? '#c2410c' : '#374151',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    🧋 Drink / Beverage
                  </button>
                </div>
              </div>

              {/* Name & Category */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                    Item Name *
                  </label>
                  <input
                    type="text"
                    value={formStockItem.name}
                    onChange={(e) => setFormStockItem({ ...formStockItem, name: e.target.value })}
                    placeholder={formStockItem.type === 'menu' ? 'e.g. Crispy Karaage Bowl' : 'e.g. Jasmine Green Milk Tea'}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '13px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                    Category
                  </label>
                  <select
                    value={formStockItem.category}
                    onChange={(e) => setFormStockItem({ ...formStockItem, category: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '13px',
                      background: '#ffffff',
                      boxSizing: 'border-box'
                    }}
                  >
                    {formStockItem.type === 'menu' ? (
                      <>
                        <option value="Appetizers">Appetizers</option>
                        <option value="Noodles">Noodles</option>
                        <option value="Rice Bowls">Rice Bowls</option>
                        <option value="Desserts">Desserts</option>
                        <option value="Meals">Meals</option>
                        <option value="Snacks">Snacks</option>
                      </>
                    ) : (
                      <>
                        <option value="Milk Tea">Milk Tea</option>
                        <option value="Fruit Shake">Fruit Shake</option>
                        <option value="Iced Tea">Iced Tea</option>
                        <option value="Bottled Drinks">Bottled Drinks</option>
                        <option value="Hot Coffee">Hot Coffee</option>
                        <option value="Mocktails">Mocktails</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* SKU & Price */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                    SKU Code
                  </label>
                  <input
                    type="text"
                    value={formStockItem.sku}
                    onChange={(e) => setFormStockItem({ ...formStockItem, sku: e.target.value })}
                    placeholder={formStockItem.type === 'menu' ? 'e.g. APP-004' : 'e.g. DRK-007'}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '13px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                    Base Price (₱)
                  </label>
                  <input
                    type="number"
                    value={formStockItem.price}
                    onChange={(e) => setFormStockItem({ ...formStockItem, price: Number(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '13px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Stock & Reorder Level */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                    Initial Stock Units
                  </label>
                  <input
                    type="number"
                    value={formStockItem.stock}
                    onChange={(e) => setFormStockItem({ ...formStockItem, stock: Number(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '13px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                    Reorder Threshold
                  </label>
                  <input
                    type="number"
                    value={formStockItem.reorderLevel}
                    onChange={(e) => setFormStockItem({ ...formStockItem, reorderLevel: Number(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '13px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Image URL */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                  Image URL
                </label>
                <input
                  type="text"
                  value={formStockItem.image}
                  onChange={(e) => setFormStockItem({ ...formStockItem, image: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{
                padding: '10px 14px',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#1e40af'
              }}>
                🔗 This item will automatically appear in <strong>{formStockItem.type === 'menu' ? 'Menu Management' : 'Drinks & Sizes Management'}</strong> and inventory stock deduction will be active immediately.
              </div>
            </div>

            <div style={{
              padding: '14px 22px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              background: '#f9fafb'
            }}>
              <button
                type="button"
                onClick={() => setShowAddStockModal(false)}
                style={{
                  padding: '8px 16px',
                  background: '#ffffff',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#374151',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!formStockItem.name.trim()) {
                    alert('Please provide an item name.');
                    return;
                  }
                  const nowStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                  const finalSku = formStockItem.sku.trim() || (formStockItem.type === 'menu' ? `APP-00${menuItems.length + 1}` : `DRK-00${drinks.length + 1}`);

                  if (formStockItem.type === 'menu') {
                    const newItem = {
                      id: `PRD-${Date.now().toString().slice(-4)}`,
                      sku: finalSku,
                      name: formStockItem.name,
                      category: formStockItem.category,
                      price: formStockItem.price || 250,
                      promoPrice: '',
                      available: true,
                      stock: Number(formStockItem.stock) || 25,
                      reorderLevel: Number(formStockItem.reorderLevel) || 5,
                      lastUpdated: nowStr,
                      image: formStockItem.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
                      description: 'Added via Inventory & Stock Controls.',
                      allergens: 'None',
                      prepTime: '10 mins',
                      sizes: 'Standard',
                      addons: '',
                      subcategory: 'Signature'
                    };
                    setMenuItems([newItem, ...menuItems]);
                    addAuditLog('Product Created (Inventory)', `Added menu item "${formStockItem.name}" (#${finalSku})`);
                    showNotify(`"${formStockItem.name}" posted to Inventory and Menu Management!`);
                  } else {
                    const initialStock = Number(formStockItem.stock) || 30;
                    const newDrink = {
                      id: finalSku,
                      sku: finalSku,
                      name: formStockItem.name,
                      image: formStockItem.image || 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=400&q=80',
                      status: 'Available',
                      available: true,
                      category: formStockItem.category,
                      description: 'Added via Inventory & Stock Controls.',
                      addons: ['Less Ice', 'Extra Pearls'],
                      reorderLevel: Number(formStockItem.reorderLevel) || 10,
                      lastUpdated: nowStr,
                      sizes: [
                        { name: 'Small', volume: '355 ml', price: Math.round((formStockItem.price || 75) * 0.9), stock: Math.round(initialStock * 0.4) },
                        { name: 'Medium', volume: '500 ml', price: formStockItem.price || 75, stock: Math.round(initialStock * 0.35) },
                        { name: 'Large', volume: '700 ml', price: Math.round((formStockItem.price || 75) * 1.15), stock: Math.round(initialStock * 0.25) }
                      ]
                    };
                    setDrinks(prev => [newDrink, ...prev]);
                    addAuditLog('Drink Created (Inventory)', `Added beverage "${formStockItem.name}" (#${finalSku})`);
                    showNotify(`"${formStockItem.name}" posted to Inventory and Drinks & Sizes!`);
                  }

                  setStockActivities(prev => [
                    {
                      id: Date.now(),
                      time: nowStr,
                      product: formStockItem.name,
                      type: 'Initial Stock',
                      quantity: `+${formStockItem.stock || 25}`,
                      notes: 'Item created and initial stock registered',
                      user: 'Manager'
                    },
                    ...prev
                  ]);

                  setShowAddStockModal(false);
                }}
                style={{
                  padding: '8px 20px',
                  background: '#e45729',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                Create &amp; Add Stock
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL: VIEW ORDER DETAILS WITH AUDIT HISTORY */}
      {viewingOrder && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#fcfbf9'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#111827' }}>
                  Order #{viewingOrder.id}
                </h3>
                <span style={{
                  padding: '3px 10px',
                  borderRadius: '999px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  background: viewingOrder.status === 'Ready' || viewingOrder.status === 'Ready for Pickup' ? '#ecfdf5' :
                              viewingOrder.status === 'Preparing' ? '#fffbeb' :
                              viewingOrder.status === 'Completed' ? '#ecfdf5' :
                              viewingOrder.status === 'Cancelled' ? '#fef2f2' : '#eff6ff',
                  color: viewingOrder.status === 'Ready' || viewingOrder.status === 'Ready for Pickup' ? '#059669' :
                         viewingOrder.status === 'Preparing' ? '#b45309' :
                         viewingOrder.status === 'Completed' ? '#059669' :
                         viewingOrder.status === 'Cancelled' ? '#dc2626' : '#1d4ed8',
                  border: viewingOrder.status === 'Ready' || viewingOrder.status === 'Ready for Pickup' ? '1px solid #a7f3d0' :
                          viewingOrder.status === 'Preparing' ? '1px solid #fde68a' :
                          viewingOrder.status === 'Completed' ? '1px solid #a7f3d0' :
                          viewingOrder.status === 'Cancelled' ? '1px solid #fecaca' : '1px solid #bfdbfe'
                }}>
                  {viewingOrder.status}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setViewingOrder(null)}
                style={{ background: 'none', border: 'none', fontSize: '20px', color: '#9ca3af', cursor: 'pointer', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
              {/* Customer & Location Strip */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '12px',
                background: '#f9fafb',
                border: '1px solid #f3f4f6',
                borderRadius: '12px',
                padding: '12px 16px',
                marginBottom: '16px'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600 }}>Customer</div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#111827' }}>{viewingOrder.customer || 'Guest Customer'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600 }}>Dining Type</div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#111827' }}>{viewingOrder.orderType || 'Dine-In'} ({viewingOrder.location || viewingOrder.tableId || 'Table'})</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600 }}>Order Time</div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#111827' }}>{viewingOrder.time || 'Today'} ({viewingOrder.timeAgo || 'Just now'})</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600 }}>Payment</div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#059669' }}>{viewingOrder.payment || 'Cash'} • ₱{Number(viewingOrder.total || 0).toFixed(2)}</div>
                </div>
              </div>

              {/* Allergen & Special Instructions */}
              {(viewingOrder.isAllergy || viewingOrder.note) && (
                <div style={{
                  background: viewingOrder.isAllergy ? '#fef2f2' : '#eff6ff',
                  border: viewingOrder.isAllergy ? '1px solid #fecaca' : '1px solid #bfdbfe',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px'
                }}>
                  {viewingOrder.isAllergy ? <AlertTriangle size={16} color="#dc2626" style={{ marginTop: '2px' }} /> : <Info size={16} color="#2563eb" style={{ marginTop: '2px' }} />}
                  <div>
                    <strong style={{ fontSize: '12.5px', color: viewingOrder.isAllergy ? '#dc2626' : '#1e40af' }}>
                      {viewingOrder.isAllergy ? 'Dietary & Allergen Alert' : 'Customer Note'}
                    </strong>
                    <div style={{ fontSize: '12px', color: viewingOrder.isAllergy ? '#b91c1c' : '#1d4ed8', marginTop: '2px' }}>
                      {viewingOrder.note || 'Allergen alert flagged for kitchen preparation.'}
                    </div>
                  </div>
                </div>
              )}

              {/* Items List */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px' }}>
                  Ordered Items ({viewingOrder.items?.length || 0})
                </div>
                <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
                  {(viewingOrder.items || []).map((it, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '10px 14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: idx % 2 === 0 ? '#ffffff' : '#f9fafb',
                        borderBottom: idx === viewingOrder.items.length - 1 ? 'none' : '1px solid #f3f4f6'
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 800, color: '#111827', marginRight: '8px', fontSize: '13px' }}>{it.qty || 1}×</span>
                        <span style={{ fontWeight: 600, color: '#1f2937', fontSize: '13px' }}>{it.name}</span>
                        {it.notes && (
                          <div style={{ fontSize: '11.5px', color: '#ea580c', fontWeight: 500, marginTop: '2px' }}>
                            ↳ {it.notes}
                          </div>
                        )}
                        {it.customizations && Array.isArray(it.customizations) && (
                          <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                            ↳ {it.customizations.join(', ')}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>
                        ₱{Number((it.price || 0) * (it.qty || 1)).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status History & Audit Trail */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '10px' }}>
                  Status History &amp; Audit Trail (Live Synchronized)
                </div>
                <div style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  background: '#ffffff'
                }}>
                  {viewingOrder.statusHistory && viewingOrder.statusHistory.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {viewingOrder.statusHistory.map((step, sIdx) => (
                        <div key={sIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '20px' }}>
                            <span style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              background: sIdx === viewingOrder.statusHistory.length - 1 ? '#ea580c' : '#10b981',
                              marginTop: '4px'
                            }} />
                            {sIdx < viewingOrder.statusHistory.length - 1 && (
                              <div style={{ width: '2px', height: '24px', background: '#e5e7eb', marginTop: '4px' }} />
                            )}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <strong style={{ fontSize: '13px', color: '#111827' }}>{step.status}</strong>
                              <span style={{ fontSize: '11px', color: '#6b7280' }}>
                                {step.timestamp ? new Date(step.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Logged'}
                              </span>
                            </div>
                            <div style={{ fontSize: '11.5px', color: '#4b5563', marginTop: '2px' }}>
                              By: <strong>{step.updatedBy || 'Staff'}</strong> {step.note ? `• ${step.note}` : ''}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#6b7280' }}>
                      <CheckCircle size={14} color="#10b981" />
                      <span>Order received and logged in system. Additional updates will append here in real-time.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 24px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f9fafb'
            }}>
              <button
                type="button"
                onClick={() => handlePrintOrder(viewingOrder)}
                style={{
                  padding: '7px 14px',
                  background: '#ffffff',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#374151',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Printer size={13} />
                <span>Print Ticket</span>
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setViewingOrder(null)}
                  style={{
                    padding: '7px 16px',
                    background: '#111827',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    color: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PRINT TICKET / RECEIPT */}
      {printingOrder && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '380px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '24px 20px', fontFamily: 'monospace', color: '#111827', background: '#fff' }}>
              <div style={{ textAlign: 'center', marginBottom: '14px', borderBottom: '1px dashed #9ca3af', paddingBottom: '12px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 900, letterSpacing: '1px' }}>UMAMI CRAFT FUSION</h2>
                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>Real-Time Personalized Dining</div>
                <div style={{ fontSize: '12px', fontWeight: 700, marginTop: '8px' }}>KITCHEN ORDER TICKET</div>
              </div>

              <div style={{ fontSize: '12px', marginBottom: '10px' }}>
                <div><strong>TICKET #{printingOrder.id}</strong></div>
                <div>Type: {printingOrder.orderType || 'Dine-In'} ({printingOrder.location || printingOrder.tableId || 'Table'})</div>
                <div>Customer: {printingOrder.customer || 'Guest'}</div>
                <div>Time: {printingOrder.time || new Date().toLocaleTimeString()}</div>
              </div>

              <div style={{ borderTop: '1px dashed #d1d5db', borderBottom: '1px dashed #d1d5db', padding: '8px 0', margin: '10px 0' }}>
                {(printingOrder.items || []).map((it, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span>{it.qty || 1}x {it.name}</span>
                    <span>₱{Number((it.price || 0) * (it.qty || 1)).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 900, margin: '8px 0' }}>
                <span>TOTAL</span>
                <span>₱{Number(printingOrder.total || 0).toFixed(2)}</span>
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280', textAlign: 'center', marginTop: '12px' }}>
                Paid via {printingOrder.payment || 'Cash'} • Status: {printingOrder.status}
              </div>
            </div>

            <div style={{ padding: '12px 16px', background: '#f3f4f6', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setPrintingOrder(null)}
                style={{ padding: '6px 12px', background: '#fff', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                  setPrintingOrder(null);
                }}
                style={{ padding: '6px 14px', background: '#111827', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                Print Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
