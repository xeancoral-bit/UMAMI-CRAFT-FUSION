import React, { useState, useEffect, useCallback } from 'react';
import {
  Smartphone,
  Monitor,
  ChefHat,
  Footprints,
  Store,
  Lock,
  X,
  KeyRound,
  ShieldCheck
} from 'lucide-react';

function NavBar({
  currentView,
  onSelectView,
  restaurantInfo,
  activeOrdersCount = 0,
  readyOrdersCount = 0,
  socketConnected = true,
  isAdminAuthenticated = false,
  currentUser = null,
  onOpenAdminSecurity
}) {
  // Always start LOCKED — PIN required every session unless already authenticated
  const [isUnlocked, setIsUnlocked] = useState(isAdminAuthenticated);
  const [showPinModal, setShowPinModal] = useState(false);

  useEffect(() => {
    if (isAdminAuthenticated) {
      setIsUnlocked(true);
    }
  }, [isAdminAuthenticated]);
  const [pinLength, setPinLength] = useState(() => {
    const saved = localStorage.getItem('umami_pin_length');
    return saved ? parseInt(saved, 10) : 9;
  });
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Fetch current PIN length and listen for real-time updates
  useEffect(() => {
    fetch('/api/admin/pin')
      .then(res => res.json())
      .then(data => {
        if (data && data.length) {
          setPinLength(data.length);
          localStorage.setItem('umami_pin_length', String(data.length));
        }
      })
      .catch(() => {});

    const handlePinUpdated = (e) => {
      if (e?.detail?.length) {
        setPinLength(e.detail.length);
      }
    };

    const handleStorageChange = (e) => {
      if (e.key === 'umami_pin_length' && e.newValue) {
        setPinLength(parseInt(e.newValue, 10));
      }
    };

    const handleKeyDown = (e) => {
      if ((e.altKey && e.key.toLowerCase() === 'l') || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'l')) {
        e.preventDefault();
        setShowPinModal(prev => !prev);
      }
    };

    window.addEventListener('umami_pin_updated', handlePinUpdated);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('umami_pin_updated', handlePinUpdated);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const submitPin = useCallback(async (codeToVerify) => {
    const target = (codeToVerify !== undefined ? codeToVerify : pinInput).trim();
    if (!target) return;

    setIsVerifying(true);

    // 1. Instant check against locally saved PIN (or default 123456789)
    const localSavedPin = localStorage.getItem('umami_admin_pin') || '123456789';
    if (target === localSavedPin) {
      setIsUnlocked(true);
      setShowPinModal(false);
      setPinInput('');
      setPinError('');
      setIsVerifying(false);
      return;
    }

    // 2. Validate against server API
    try {
      const response = await fetch('/api/admin/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: target })
      });
      const data = await response.json();

      if (response.ok && data.valid) {
        setIsUnlocked(true);
        setShowPinModal(false);
        setPinInput('');
        setPinError('');
        if (data.length) {
          setPinLength(data.length);
          localStorage.setItem('umami_pin_length', String(data.length));
        }
        setIsVerifying(false);
        return;
      }
    } catch (err) {}

    // 3. Fallback check for default 123456789
    if (target === '123456789') {
      setIsUnlocked(true);
      setShowPinModal(false);
      setPinInput('');
      setPinError('');
      setIsVerifying(false);
      return;
    }

    // Invalid PIN
    setPinError('Invalid Passcode. Access restricted.');
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
    setPinInput('');
    setIsVerifying(false);
  }, [pinInput]);

  // Keyboard listener when PIN modal is open
  useEffect(() => {
    if (!showPinModal) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowPinModal(false);
        setPinInput('');
        setPinError('');
      } else if (e.key === 'Enter') {
        submitPin(pinInput);
      } else if (e.key === 'Backspace') {
        setPinInput((prev) => prev.slice(0, -1));
        setPinError('');
      } else if (/^[0-9]$/.test(e.key)) {
        if (pinInput.length < pinLength) {
          setPinInput((prev) => {
            const next = prev + e.key;
            // Auto check when exact number of digits is reached
            if (next.length === pinLength) {
              setTimeout(() => submitPin(next), 90);
            }
            return next;
          });
          setPinError('');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPinModal, pinInput, pinLength, submitPin]);

  const handleLock = () => {
    if (currentView === 'admin' || isAdminAuthenticated) {
      if (onOpenAdminSecurity) {
        onOpenAdminSecurity();
        return;
      }
    }
    setIsUnlocked(false);
  };

  const handleNumpadPress = (val) => {
    if (pinInput.length < pinLength) {
      const next = pinInput + val;
      setPinInput(next);
      setPinError('');
      if (next.length === pinLength) {
        setTimeout(() => submitPin(next), 100);
      }
    }
  };

  const handleBackspace = () => {
    setPinInput((prev) => prev.slice(0, -1));
    setPinError('');
  };

  const handleClear = () => {
    setPinInput('');
    setPinError('');
  };

  // Render the Security PIN Modal
  const renderPinModal = () => (
    <div className="staff-pin-backdrop" onClick={() => setShowPinModal(false)}>
      <div
        className={`staff-pin-modal ${isShaking ? 'shake-animation' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="staff-pin-close"
          onClick={() => {
            setShowPinModal(false);
            setPinInput('');
            setPinError('');
          }}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="staff-pin-header">
          <div className="staff-pin-icon-wrap">
            <KeyRound size={26} color="#D94B2B" />
          </div>
          <h3 className="staff-pin-title">Staff &amp; Admin Access</h3>
          <p className="staff-pin-subtitle">
            Enter the {pinLength}-digit security passcode to unlock management modules.
          </p>
        </div>

        {/* PIN Dots / Display - Dynamically displays exact number of circles */}
        <div className="staff-pin-display-wrap">
          <div className="staff-pin-dots">
            {[...Array(pinLength)].map((_, i) => (
              <span
                key={i}
                className={`staff-pin-dot ${i < pinInput.length ? 'filled' : ''}`}
              />
            ))}
          </div>
          {pinError && <div className="staff-pin-error">{pinError}</div>}
        </div>

        {/* Numeric On-Screen Touch Pad */}
        <div className="staff-numpad-grid">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              className="staff-numpad-btn"
              onClick={() => handleNumpadPress(digit)}
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            className="staff-numpad-btn staff-numpad-fn"
            onClick={handleClear}
            title="Clear"
          >
            C
          </button>
          <button
            type="button"
            className="staff-numpad-btn"
            onClick={() => handleNumpadPress('0')}
          >
            0
          </button>
          <button
            type="button"
            className="staff-numpad-btn staff-numpad-fn"
            onClick={handleBackspace}
            title="Backspace"
          >
            ⌫
          </button>
        </div>

        {/* Submit & Cancel Actions */}
        <div className="staff-pin-actions">
          <button
            type="button"
            className="staff-pin-cancel-btn"
            onClick={() => {
              setShowPinModal(false);
              setPinInput('');
              setPinError('');
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="staff-pin-submit-btn"
            onClick={() => submitPin()}
            disabled={pinInput.length !== pinLength || isVerifying}
          >
            <ShieldCheck size={16} />
            <span>{isVerifying ? 'Verifying...' : 'Unlock'}</span>
          </button>
        </div>
      </div>
    </div>
  );

  // If LOCKED: Render discrete lock button on staff views (hide only on customer mobile app)
  if (!isUnlocked) {
    if (currentView === 'mobile') {
      return showPinModal ? renderPinModal() : null;
    }

    return (
      <>
        <div className="staff-locked-trigger-container">
          <button
            type="button"
            className="staff-lock-icon-trigger"
            onClick={() => {
              setShowPinModal(true);
              setPinError('');
              setPinInput('');
            }}
            title="Staff & Admin Access (Lock Active)"
            aria-label="Staff & Admin Access"
          >
            <Lock size={18} />
          </button>
        </div>
        {showPinModal && renderPinModal()}
      </>
    );
  }

  // If UNLOCKED: Render full navigation bar with smooth slide-in and Re-lock control
  return (
    <>
      <header className="fp-navbar slide-left-in fade-in">
        {/* Brand & Restaurant Profile */}
        <div className="fp-brand-container" onClick={() => onSelectView('kiosk')}>
          <div className="fp-logo-badge" title="Umami Craft Fusion">
            <img src="/brand-logo.png" alt="Umami Craft Fusion" className="fp-brand-logo-img" />
          </div>
          <div className="fp-brand-info">
            <div className="fp-brand-name">
              <span>{restaurantInfo?.name || 'Umami Craft Fusion'}</span>
              <span className="fp-enterprise-badge">
                ENTERPRISE
              </span>
            </div>
            <span className="fp-brand-tag">
              {restaurantInfo?.cuisine || 'Asian Craft Fusion'}
            </span>
          </div>
        </div>

        {/* Module Navigation Tabs */}
        <nav className="fp-nav-tabs" aria-label="System Modules">
          <button
            className={`fp-nav-pill ${currentView === 'mobile' ? 'active' : ''}`}
            onClick={() => onSelectView('mobile')}
            title="Customer Mobile Ordering Experience"
          >
            <Smartphone size={15} />
            <span>Customer App</span>
          </button>

          <button
            className={`fp-nav-pill ${currentView === 'kiosk' ? 'active' : ''}`}
            onClick={() => onSelectView('kiosk')}
            title="In-Store Smart Ordering Kiosk"
          >
            <Monitor size={15} />
            <span>Smart Kiosk</span>
          </button>

          <button
            className={`fp-nav-pill ${currentView === 'kitchen' ? 'active' : ''}`}
            onClick={() => onSelectView('kitchen')}
            title="Kitchen Display System (KDS)"
          >
            <ChefHat size={15} />
            <span>Kitchen Module</span>
            {activeOrdersCount > 0 && (
              <span className="fp-badge-count">{activeOrdersCount}</span>
            )}
          </button>

          <button
            className={`fp-nav-pill ${currentView === 'busser' ? 'active' : ''}`}
            onClick={() => onSelectView('busser')}
            title="Food Runner & Table Busser Station"
          >
            <Footprints size={15} />
            <span>Become a Busser</span>
            {readyOrdersCount > 0 && (
              <span className="fp-badge-count" style={{ background: '#EF4444', color: '#fff' }}>
                {readyOrdersCount} READY
              </span>
            )}
          </button>

          <button
            className={`fp-nav-pill ${currentView === 'restaurant' ? 'active' : ''}`}
            onClick={() => onSelectView('restaurant')}
            title="Restaurant Management & Floor Operations"
          >
            <Store size={15} />
            <span>Restaurant Module</span>
          </button>

          <button
            className={`fp-nav-pill ${currentView === 'admin' ? 'active' : ''}`}
            onClick={() => onSelectView('admin')}
            title="Role-Based Dashboard Portal (Administrator, Cashier, Staff)"
          >
            <ShieldCheck size={15} />
            <span>
              {isAdminAuthenticated && currentUser?.accountType === 'staff'
                ? 'Staff Dashboard'
                : isAdminAuthenticated && currentUser?.accountType === 'cashier'
                ? 'Cashier POS'
                : 'Admin Panel'}
            </span>
          </button>
        </nav>

        {/* Live System Connectivity Badge + Lock / Slide-away button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="fp-nav-status-badge">
            {socketConnected ? (
              <>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-green)', boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)' }}></div>
                <span>Live Sync</span>
              </>
            ) : (
              <>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444' }}></div>
                <span>Connecting...</span>
              </>
            )}
          </div>

          {/* Re-Lock / Slide Left to Hide button */}
          <button
            type="button"
            className="staff-relock-btn"
            onClick={handleLock}
            title={
              currentView === 'admin' || isAdminAuthenticated
                ? 'Admin Panel Security & Password Management'
                : 'Lock & Hide Staff Navigation Bar'
            }
          >
            <Lock size={13} />
            <span>Lock</span>
          </button>
        </div>
      </header>
    </>
  );
}

export default NavBar;
