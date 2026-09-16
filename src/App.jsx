import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import KioskView from './components/KioskView';
import MobileView from './components/MobileView';
import KitchenView from './components/KitchenView';
import BusserView from './components/BusserView';
import RestaurantView from './components/RestaurantView';
import NavBar from './components/NavBar';

function App() {
  const [kioskId, setKioskId] = useState(null);
  const [currentView, setCurrentView] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('view') || 'kiosk';
  });
  const [restaurantInfo, setRestaurantInfo] = useState({
    id: 'umami',
    name: 'Umami Craft Fusion',
    cuisine: 'Asian Craft Fusion',
    tagline: 'Bowls, Dumplings & Artisanal Street Noodles'
  });
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);
  const [readyOrdersCount, setReadyOrdersCount] = useState(0);
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef(null);

  // Load restaurant metadata
  useEffect(() => {
    fetch('/api/restaurant')
      .then(res => res.json())
      .then(data => { if (data?.name) setRestaurantInfo(prev => ({ ...prev, ...data })); })
      .catch(() => {});
  }, []);

  // Global socket for live badge counts in NavBar
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
      setActiveOrdersCount(orders.filter(o => o.status === 'Order Received' || o.status === 'Cooking').length);
      setReadyOrdersCount(orders.filter(o => o.status === 'Order Ready').length);
    };

    socket.on('initial-orders', (orders) => {
      if (Array.isArray(orders)) refreshCounts(orders);
    });

    socket.on('new-kitchen-order', () => {
      // Refresh count from server
      fetch('/api/orders').then(r => r.json()).then(data => {
        if (Array.isArray(data)) refreshCounts(data);
      }).catch(() => {});
    });

    socket.on('order-status-updated', () => {
      fetch('/api/orders').then(r => r.json()).then(data => {
        if (Array.isArray(data)) refreshCounts(data);
      }).catch(() => {});
    });

    return () => socket.disconnect();
  }, []);

  // Check URL parameters
  useEffect(() => {
    const handleUrlCheck = () => {
      const params = new URLSearchParams(window.location.search);
      const id = params.get('kioskId');
      const viewParam = params.get('view');
      setKioskId(id);
      if (viewParam) {
        setCurrentView(viewParam);
      } else if (id) {
        setCurrentView('mobile');
      }
    };

    handleUrlCheck();
    window.addEventListener('popstate', handleUrlCheck);
    return () => window.removeEventListener('popstate', handleUrlCheck);
  }, []);

  const handleResetSession = () => {
    window.history.pushState({}, document.title, window.location.pathname);
    setKioskId(null);
  };

  const handleSelectView = (view) => {
    const url = new URL(window.location.href);
    url.searchParams.set('view', view);
    // Clear kioskId when switching to staff views
    if (['kitchen', 'busser', 'restaurant'].includes(view)) {
      url.searchParams.delete('kioskId');
      setKioskId(null);
    }
    window.history.pushState({}, '', url.toString());
    setCurrentView(view);
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
      />

      {currentView === 'mobile' && (
        <MobileView kioskId={kioskId} onResetSession={handleResetSession} />
      )}

      {currentView === 'kiosk' && (
        <KioskView onOpenKitchen={() => handleSelectView('kitchen')} />
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
    </div>
  );
}

export default App;

