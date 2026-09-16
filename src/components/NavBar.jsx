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
  socketConnected = true
}) {
  // Always start LOCKED — PIN required every session
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  const submitPin = useCallback((codeToVerify) => {
    const target = codeToVerify !== undefined ? codeToVerify : pinInput;
    if (target === '123456789') {
      setIsUnlocked(true);
      setShowPinModal(false);
      setPinInput('');
      setPinError('');
    } else {
      setPinError('Invalid Passcode. Access restricted.');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      setPinInput('');
    }
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
        if (pinInput.length < 12) {
          setPinInput((prev) => {
            const next = prev + e.key;
            // Auto check when reaches 9 digits
            if (next.length === 9) {
              setTimeout(() => submitPin(next), 80);
            }
            return next;
          });
          setPinError('');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPinModal, pinInput, submitPin]);

  const handleLock = () => {
    setIsUnlocked(false);
  };

  const handleNumpadPress = (val) => {
    if (pinInput.length < 12) {
      const next = pinInput + val;
      setPinInput(next);
      setPinError('');
      if (next.length === 9) {
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
            <KeyRound size={26} color="#E45729" />
          </div>
          <h3 className="staff-pin-title">Staff & Admin Access</h3>
          <p className="staff-pin-subtitle">
            Enter the 9-digit security passcode to unlock management modules.
          </p>
        </div>

        {/* PIN Dots / Display */}
        <div className="staff-pin-display-wrap">
          <div className="staff-pin-dots">
            {[...Array(9)].map((_, i) => (
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
            disabled={pinInput.length === 0}
          >
            <ShieldCheck size={16} />
            <span>Unlock</span>
          </button>
        </div>
      </div>
    </div>
  );

  // If LOCKED: Only render the discrete icon button (NO logo image, NO module tabs)
  if (!isUnlocked) {
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
            title="Lock & Hide Staff Navigation Bar"
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
