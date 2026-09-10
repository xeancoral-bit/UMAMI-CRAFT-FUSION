import React, { useState, useEffect } from 'react';
import KioskView from './components/KioskView';
import MobileView from './components/MobileView';
import KitchenView from './components/KitchenView';

function App() {
  const [kioskId, setKioskId] = useState(null);
  const [isMobileScreen, setIsMobileScreen] = useState(false);
  const [currentView, setCurrentView] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('view') || 'kiosk';
  });

  // Check screen width for mobile layouts
  useEffect(() => {
    const handleResize = () => {
      setIsMobileScreen(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Check URL parameters for active session on load and when the URL changes
  useEffect(() => {
    const handleUrlCheck = () => {
      const params = new URLSearchParams(window.location.search);
      const id = params.get('kioskId');
      const viewParam = params.get('view');
      setKioskId(id);
      if (viewParam) {
        setCurrentView(viewParam);
      }
    };

    handleUrlCheck();
    
    // Listen for history popstate events (e.g. back button)
    window.addEventListener('popstate', handleUrlCheck);
    return () => window.removeEventListener('popstate', handleUrlCheck);
  }, []);

  const handleResetSession = () => {
    // Clear URL query parameters in browser search bar
    window.history.pushState({}, document.title, window.location.pathname);
    setKioskId(null);
  };

  const handleOpenKitchen = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'kitchen');
    window.history.pushState({}, '', url.toString());
    setCurrentView('kitchen');
  };

  const handleReturnToKiosk = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('view');
    window.history.pushState({}, '', url.toString());
    setCurrentView('kiosk');
  };

  return (
    <div className="app-container">
      {kioskId || isMobileScreen ? (
        <MobileView kioskId={kioskId} onResetSession={handleResetSession} />
      ) : currentView === 'kitchen' ? (
        <KitchenView onReturnToKiosk={handleReturnToKiosk} />
      ) : (
        <KioskView onOpenKitchen={handleOpenKitchen} />
      )}
    </div>
  );
}

export default App;
