import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import KioskView from './components/KioskView';
import MobileView from './components/MobileView';
import KitchenView from './components/KitchenView';
import BusserView from './components/BusserView';
import RestaurantView from './components/RestaurantView';
import AdminView from './components/AdminView';
import CashierDashboard from './components/CashierDashboard';
import StaffDashboard from './components/StaffDashboard';
import AdminLoginModal from './components/AdminLoginModal';
import AdminSecurityModal from './components/AdminSecurityModal';
import AccessDeniedView from './components/AccessDeniedView';
import NavBar from './components/NavBar';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  const [kioskId, setKioskId] = useState(null);
  const [currentView, setCurrentView] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    if (viewParam) {
      try {
        sessionStorage.setItem('umami_active_view', viewParam);
        sessionStorage.setItem('umami_active_search', window.location.search);
      } catch (_) {}
      return viewParam;
    }

    // Attempt restoration from sessionStorage / localStorage if query parameters were absent
    try {
      const storedView = sessionStorage.getItem('umami_active_view') || localStorage.getItem('umami_active_view');
      const storedSearch = sessionStorage.getItem('umami_active_search') || localStorage.getItem('umami_active_search');
      if (storedView) {
        const queryToRestore = storedSearch && storedSearch.includes('view=') ? storedSearch : `?view=${storedView}`;
        window.history.replaceState({}, '', `${window.location.pathname}${queryToRestore}`);
        return storedView;
      }
    } catch (_) {}

    return 'kiosk';
  });
  const [restaurantInfo, setRestaurantInfo] = useState({
    id: 'umami',
    name: 'Umami Craft Fusion',
    cuisine: 'Asian Craft Fusion',
    tagline: 'Bowls, Dumplings & Artisanal Street Noodles'
  });
  const [menuCatalog, setMenuCatalog] = useState([]);
  const [drinksCatalog, setDrinksCatalog] = useState([]);
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);
  const [readyOrdersCount, setReadyOrdersCount] = useState(0);
  const [socketConnected, setSocketConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem('umami_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    try {
      return Boolean(sessionStorage.getItem('umami_auth_user'));
    } catch {
      return false;
    }
  });
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);
  const [showAdminSecurityModal, setShowAdminSecurityModal] = useState(false);
  const socketRef = useRef(null);

  // Load restaurant metadata, menu, and drinks
  useEffect(() => {
    fetch('/api/restaurant')
      .then(res => res.json())
      .then(data => { if (data?.name) setRestaurantInfo(prev => ({ ...prev, ...data })); })
      .catch(() => {});

    fetch('/api/menu')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setMenuCatalog(data); })
      .catch(() => {});

    fetch('/api/drinks')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setDrinksCatalog(data); })
      .catch(() => {});
  }, []);

  // Global socket for live badge counts in NavBar and live catalog sync
  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    // Listen for order updates to keep badge counts current
    const refreshCounts = (orders) => {
      setActiveOrdersCount(orders.filter(o => ['New', 'Order Received', 'Preparing', 'Ready', 'Order Ready', 'Ready for Pickup'].includes(o.status)).length);
      setReadyOrdersCount(orders.filter(o => o.status === 'Ready for Pickup' || o.status === 'Order Ready' || o.status === 'Ready').length);
    };

    socket.on('initial-orders', (orders) => {
      if (Array.isArray(orders)) refreshCounts(orders);
    });

    socket.on('new-kitchen-order', () => {
      fetch('/api/orders').then(r => r.json()).then(data => {
        if (Array.isArray(data)) refreshCounts(data);
      }).catch(() => {});
    });

    socket.on('order-status-updated', () => {
      fetch('/api/orders').then(r => r.json()).then(data => {
        if (Array.isArray(data)) refreshCounts(data);
      }).catch(() => {});
    });

    socket.on('menu-updated', (items) => {
      if (Array.isArray(items)) setMenuCatalog(items);
    });

    socket.on('drinks-updated', (items) => {
      if (Array.isArray(items)) setDrinksCatalog(items);
    });

    // Invalidate admin session across tabs/devices if credentials were updated or locked
    socket.on('admin-session-invalidated', (data) => {
      setIsAdminAuthenticated(false);
      setCurrentUser(null);
      try { sessionStorage.removeItem('umami_auth_user'); } catch {}
      setShowAdminSecurityModal(false);
      const url = new URL(window.location.href);
      url.searchParams.set('view', 'kiosk');
      window.history.pushState({}, '', url.toString());
      setCurrentView('kiosk');
      if (data?.message) {
        alert(data.message);
      }
    });

    return () => socket.disconnect();
  }, []);

  // Check URL parameters & maintain reliable route state
  useEffect(() => {
    const handleUrlCheck = () => {
      const params = new URLSearchParams(window.location.search);
      const id = params.get('kioskId');
      const viewParam = params.get('view');
      setKioskId(id);

      if (viewParam) {
        setCurrentView(viewParam);
        try {
          sessionStorage.setItem('umami_active_view', viewParam);
          sessionStorage.setItem('umami_active_search', window.location.search);
        } catch (_) {}
        if (viewParam === 'admin' && !isAdminAuthenticated) {
          setShowAdminLoginModal(true);
        }
      } else {
        // Fall back to stored active session route if available before defaulting
        try {
          const storedView = sessionStorage.getItem('umami_active_view') || localStorage.getItem('umami_active_view');
          const storedSearch = sessionStorage.getItem('umami_active_search') || localStorage.getItem('umami_active_search');
          if (storedView) {
            setCurrentView(storedView);
            const query = storedSearch && storedSearch.includes('view=') ? storedSearch : `?view=${storedView}`;
            window.history.replaceState({}, '', `${window.location.pathname}${query}`);
            return;
          }
        } catch (_) {}
        setCurrentView('kiosk');
      }
    };

    handleUrlCheck();
    window.addEventListener('popstate', handleUrlCheck);
    return () => window.removeEventListener('popstate', handleUrlCheck);
  }, [isAdminAuthenticated]);

  const handleResetSession = () => {
    // Preserve active view and query parameters so page refreshes never unexpectedly redirect
    const params = new URLSearchParams(window.location.search);
    params.delete('orderId');
    params.delete('ref');
    if (!params.get('view')) {
      params.set('view', currentView || 'kiosk');
    }
    const newSearch = params.toString() ? `?${params.toString()}` : `?view=${currentView || 'kiosk'}`;
    window.history.replaceState({}, document.title, `${window.location.pathname}${newSearch}`);
    try {
      sessionStorage.setItem('umami_active_search', newSearch);
    } catch (_) {}
  };

  const handleSelectView = (view) => {
    if (view === 'admin' && !isAdminAuthenticated) {
      setShowAdminLoginModal(true);
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set('view', view);
    if (['kitchen', 'busser', 'restaurant', 'admin'].includes(view)) {
      url.searchParams.delete('kioskId');
      setKioskId(null);
    }
    window.history.pushState({}, '', url.toString());
    setCurrentView(view);
    try {
      sessionStorage.setItem('umami_active_view', view);
      sessionStorage.setItem('umami_active_search', url.search);
    } catch (_) {}
  };

  const handleAdminAuthSuccess = (user) => {
    setIsAdminAuthenticated(true);
    setCurrentUser(user || null);
    try {
      sessionStorage.setItem('umami_auth_user', JSON.stringify(user || null));
    } catch {}
    setShowAdminLoginModal(false);
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'admin');
    window.history.pushState({}, '', url.toString());
    setCurrentView('admin');
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    setCurrentUser(null);
    try { sessionStorage.removeItem('umami_auth_user'); } catch {}
    setShowAdminSecurityModal(false);
    handleSelectView('kiosk');
  };

  const handleAdminLock = () => {
    setIsAdminAuthenticated(false);
    setCurrentUser(null);
    try { sessionStorage.removeItem('umami_auth_user'); } catch {}
    setShowAdminSecurityModal(false);
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'kiosk');
    window.history.pushState({}, '', url.toString());
    setCurrentView('kiosk');
  };

  const renderAuthenticatedPortal = () => {
    const accountType = String(currentUser?.accountType || '').toLowerCase();
    const roleLower = String(currentUser?.role || '').toLowerCase();

    if (accountType === 'cashier' || (!accountType && roleLower.includes('cashier'))) {
      return (
        <CashierDashboard
          currentUser={currentUser}
          onLogout={handleAdminLogout}
          onLock={handleAdminLock}
          onLockSession={handleAdminLock}
          onReturnToKiosk={() => handleSelectView('kiosk')}
          socketConnected={socketConnected}
          socket={socketRef.current}
          menuCatalog={menuCatalog}
          drinksCatalog={drinksCatalog}
        />
      );
    }

    if (accountType === 'staff' || (!accountType && !roleLower.includes('admin') && !roleLower.includes('manager'))) {
      return (
        <StaffDashboard
          currentUser={currentUser}
          onLogout={handleAdminLogout}
          onLock={handleAdminLock}
          onLockSession={handleAdminLock}
          onNavigateModule={handleSelectView}
          onReturnToKiosk={() => handleSelectView('kiosk')}
          socketConnected={socketConnected}
          socket={socketRef.current}
        />
      );
    }

    return (
      <AdminView
        onLogout={handleAdminLogout}
        onOpenSecurity={() => setShowAdminSecurityModal(true)}
        onReturnToKiosk={() => handleSelectView('kiosk')}
        socketConnected={socketConnected}
        socket={socketRef.current}
        currentUser={currentUser}
      />
    );
  };

  return (
    <div className="app-container">
      <NavBar
        currentView={currentView}
        onSelectView={handleSelectView}
        restaurantInfo={restaurantInfo}
        activeOrdersCount={activeOrdersCount}
        readyOrdersCount={readyOrdersCount}
        socketConnected={socketConnected}
        isAdminAuthenticated={isAdminAuthenticated}
        currentUser={currentUser}
        onOpenAdminSecurity={() => setShowAdminSecurityModal(true)}
      />

      <AdminLoginModal
        isOpen={showAdminLoginModal}
        onClose={() => setShowAdminLoginModal(false)}
        onLoginSuccess={handleAdminAuthSuccess}
      />

      <AdminSecurityModal
        isOpen={showAdminSecurityModal}
        onClose={() => setShowAdminSecurityModal(false)}
        onLockSession={handleAdminLock}
        onPasswordChanged={() => {}}
      />

      <ErrorBoundary onRetry={() => window.location.reload()}>
        {currentView === 'mobile' && (
          <MobileView kioskId={kioskId} onResetSession={handleResetSession} />
        )}

        {currentView === 'kiosk' && (
          <KioskView initialKioskId={kioskId} onOpenKitchen={() => handleSelectView('kitchen')} />
        )}

        {currentView === 'kitchen' && (
          <KitchenView onReturnToKiosk={() => handleSelectView('kiosk')} />
        )}

        {currentView === 'busser' && (
          <BusserView onReturnToHome={() => handleSelectView('kiosk')} />
        )}

        {currentView === 'restaurant' && (
          <RestaurantView onReturnToKiosk={() => handleSelectView('kiosk')} />
        )}

        {currentView === 'admin' && (
          isAdminAuthenticated ? (
            renderAuthenticatedPortal()
          ) : (
            <AccessDeniedView
              onReturn={() => handleSelectView('kiosk')}
              onRequestLogin={() => setShowAdminLoginModal(true)}
            />
          )
        )}
      </ErrorBoundary>
    </div>
  );
}

export default App;
