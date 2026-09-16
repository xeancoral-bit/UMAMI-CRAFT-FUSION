import React, { useState, useEffect, useRef } from 'react';
import { Laptop, Tablet, Smartphone, RotateCcw, Sparkles } from 'lucide-react';

/**
 * ResponsiveDeviceMockup
 * Automatically detects the active screen size and orientation to display:
 * - Laptop mockup for desktop / laptop displays
 * - Tablet mockup for tablet displays
 * - Smartphone mockup for mobile displays
 * 
 * Also provides an interactive toolbar to manually preview any device mockup.
 */
export default function DeviceMockup({
  children,
  defaultDevice = 'auto',
  showToolbar = true,
  title = 'System Interface Preview'
}) {
  const [detectedMode, setDetectedMode] = useState('laptop');
  const [selectedDevice, setSelectedDevice] = useState(defaultDevice); // 'auto' | 'laptop' | 'tablet' | 'smartphone'
  const [orientation, setOrientation] = useState('portrait'); // 'portrait' | 'landscape'
  const [phoneTime, setPhoneTime] = useState('12:00');
  const [batteryLevel, setBatteryLevel] = useState(88);
  const [batteryCharging, setBatteryCharging] = useState(false);
  const containerRef = useRef(null);

  // ── Auto-Detect Screen Size & Orientation ──
  useEffect(() => {
    const updateDetection = () => {
      const width = window.innerWidth;
      const isLandscape = window.matchMedia('(orientation: landscape)').matches;
      
      setOrientation(isLandscape ? 'landscape' : 'portrait');

      if (width >= 1024) {
        setDetectedMode('laptop');
      } else if (width >= 768) {
        setDetectedMode('tablet');
      } else {
        setDetectedMode('smartphone');
      }
    };

    updateDetection();
    window.addEventListener('resize', updateDetection);
    return () => window.removeEventListener('resize', updateDetection);
  }, []);

  // ── Live Clock for Smartphone / Tablet status bar ──
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setPhoneTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // ── Battery Status API ──
  useEffect(() => {
    if ('getBattery' in navigator) {
      navigator.getBattery().then(bat => {
        const update = () => {
          setBatteryLevel(Math.round(bat.level * 100));
          setBatteryCharging(bat.charging);
        };
        update();
        bat.addEventListener('levelchange', update);
        bat.addEventListener('chargingchange', update);
        return () => {
          bat.removeEventListener('levelchange', update);
          bat.removeEventListener('chargingchange', update);
        };
      }).catch(() => {});
    }
  }, []);

  const activeDevice = selectedDevice === 'auto' ? detectedMode : selectedDevice;

  // Toggle orientation manually
  const toggleOrientation = () => {
    setOrientation(prev => (prev === 'portrait' ? 'landscape' : 'portrait'));
  };

  return (
    <div className="device-mockup-wrapper" ref={containerRef}>
      {/* ── Control Bar: Mode & Device Switcher ── */}
      {showToolbar && (
        <header className="device-mockup-toolbar" role="toolbar" aria-label={title || "Device mockup controls"}>
          <div className="dmt-left">
            <div className="dmt-indicator">
              <span className="dmt-pulse" />
              <span className="dmt-active-text">
                <span className="dmt-active-prefix-full">Active Display: </span>
                <span className="dmt-active-prefix-short">Display: </span>
                <strong>{activeDevice.toUpperCase()}</strong>
              </span>
              {selectedDevice === 'auto' && (
                <span className="dmt-auto-badge">Auto-Detected</span>
              )}
            </div>
          </div>

          <div className="dmt-center">
            <div className="dmt-segmented-control">
              <button
                type="button"
                className={`dmt-seg-btn ${selectedDevice === 'auto' ? 'active' : ''}`}
                onClick={() => setSelectedDevice('auto')}
                title="Automatically match current device screen size"
              >
                <Sparkles size={13} />
                <span>Auto</span>
              </button>
              <button
                type="button"
                className={`dmt-seg-btn ${selectedDevice === 'laptop' ? 'active' : ''}`}
                onClick={() => setSelectedDevice('laptop')}
                title="Preview Laptop / Desktop Mockup"
              >
                <Laptop size={13} />
                <span>Laptop</span>
              </button>
              <button
                type="button"
                className={`dmt-seg-btn ${selectedDevice === 'tablet' ? 'active' : ''}`}
                onClick={() => setSelectedDevice('tablet')}
                title="Preview Tablet Mockup"
              >
                <Tablet size={13} />
                <span>Tablet</span>
              </button>
              <button
                type="button"
                className={`dmt-seg-btn ${selectedDevice === 'smartphone' ? 'active' : ''}`}
                onClick={() => setSelectedDevice('smartphone')}
                title="Preview Smartphone Mockup"
              >
                <Smartphone size={13} />
                <span>Phone</span>
              </button>
            </div>
          </div>

          <div className="dmt-right">
            {activeDevice !== 'laptop' && (
              <button
                type="button"
                className="dmt-rotate-btn"
                onClick={toggleOrientation}
                title={`Switch to ${orientation === 'portrait' ? 'Landscape' : 'Portrait'} mode`}
              >
                <RotateCcw size={13} />
                <span className="dmt-rotate-full">
                  {orientation === 'portrait' ? 'Rotate Landscape' : 'Rotate Portrait'}
                </span>
                <span className="dmt-rotate-short">
                  {orientation === 'portrait' ? 'Landscape' : 'Portrait'}
                </span>
              </button>
            )}
          </div>
        </header>
      )}

      {/* ── Mockup Stage ── */}
      <div className={`device-stage-container device-type-${activeDevice} orientation-${orientation}`}>

        {/* ═══════════════════════════════════════
            1. LAPTOP MOCKUP
            ═══════════════════════════════════════ */}
        {activeDevice === 'laptop' && (
          <div className="mockup-laptop-unit">
            {/* Top Display Lid */}
            <div className="laptop-display-lid">
              {/* Webcam & Sensor */}
              <div className="laptop-webcam-bar">
                <span className="laptop-webcam-lens" />
                <span className="laptop-webcam-indicator" />
              </div>

              {/* Inner Screen Bezel & Content */}
              <div className="laptop-screen-viewport">
                <div className="mockup-inner-content device-laptop-layout">
                  {children}
                </div>
              </div>
            </div>

            {/* Laptop Base / Deck */}
            <div className="laptop-base-deck">
              <div className="laptop-notch-opening" />
              <div className="laptop-base-surface" />
              <div className="laptop-feet-bar" />
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════
            2. TABLET MOCKUP
            ═══════════════════════════════════════ */}
        {activeDevice === 'tablet' && (
          <div className={`mockup-tablet-unit tablet-${orientation}`}>
            <div className="tablet-frame">
              {/* Front Camera */}
              <div className="tablet-camera-notch">
                <span className="tablet-camera-dot" />
              </div>

              {/* Screen Viewport */}
              <div className="tablet-screen-viewport">
                <div className="mockup-inner-content device-tablet-layout">
                  {children}
                </div>
              </div>

              {/* Home Pill Indicator */}
              <div className="tablet-home-indicator">
                <span className="tablet-home-pill" />
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════
            3. SMARTPHONE MOCKUP
            ═══════════════════════════════════════ */}
        {activeDevice === 'smartphone' && (
          <div className={`mockup-smartphone-unit phone-${orientation}`}>
            <div className="phone-chassis">
              {/* Dynamic Island / Speaker Pill */}
              <div className="phone-dynamic-island">
                <div className="phone-island-pill">
                  <span className="phone-island-camera" />
                  <span className="phone-island-sensor" />
                </div>
              </div>

              {/* Status Bar */}
              <div className="phone-status-bar">
                <span className="phone-sb-time">{phoneTime}</span>
                <div className="phone-sb-icons">
                  {/* Cellular 5G/4G Signal */}
                  <svg width="15" height="11" viewBox="0 0 15 11" fill="currentColor" aria-hidden="true">
                    <rect x="0" y="7" width="3" height="4" rx="0.5" />
                    <rect x="4" y="5" width="3" height="6" rx="0.5" />
                    <rect x="8" y="2" width="3" height="9" rx="0.5" />
                    <rect x="12" y="0" width="3" height="11" rx="0.5" opacity="0.9" />
                  </svg>
                  {/* Wi-Fi */}
                  <svg width="14" height="11" viewBox="0 0 14 11" fill="currentColor" aria-hidden="true">
                    <path d="M7 8.5a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4z"/>
                    <path d="M3.6 6.2C4.6 5.2 5.75 4.7 7 4.7s2.4.5 3.4 1.5l1.1-1.1C10.2 3.8 8.7 3 7 3s-3.2.8-4.5 2.1l1.1 1.1z" opacity="0.85"/>
                    <path d="M.6 3.3C2.1 1.8 4.4.9 7 .9s4.9.9 6.4 2.4l1-1C12.6.5 9.95-.4 7-.4S1.4.5-.4 2.3l1 1z" opacity="0.65"/>
                  </svg>
                  {/* Battery */}
                  <svg width="25" height="12" viewBox="0 0 25 12" fill="none" aria-hidden="true">
                    <rect x="0.5" y="0.5" width="21" height="11" rx="2.5" stroke="currentColor" strokeOpacity="0.7"/>
                    <rect
                      x="2" y="2"
                      width={Math.max(2, Math.round(((batteryLevel ?? 85) / 100) * 18))}
                      height="8"
                      rx="1.5"
                      fill={batteryCharging ? '#10B981' : (batteryLevel !== null && batteryLevel <= 20) ? '#EF4444' : 'currentColor'}
                    />
                    <path d="M23 4v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.6"/>
                  </svg>
                  <span className="phone-sb-pct">{batteryLevel}%</span>
                </div>
              </div>

              {/* Screen Viewport with generous modern phone width */}
              <div className="phone-screen-viewport">
                <div className="mockup-inner-content device-smartphone-layout">
                  {children}
                </div>
              </div>

              {/* Home Swipe Indicator */}
              <div className="phone-home-bar" aria-hidden="true">
                <span className="phone-home-pill" />
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
