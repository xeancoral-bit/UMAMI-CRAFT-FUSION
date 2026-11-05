import React, { useState, useEffect, useRef } from 'react';
import { Laptop, Tablet, Smartphone, RotateCcw, Sparkles, Zap, X, BellRing, Battery } from 'lucide-react';

/**
 * ResponsiveDeviceMockup
 * Automatically detects the active screen size and orientation to display:
 * - Laptop mockup for desktop / laptop displays
 * - Tablet mockup for tablet displays
 * - Smartphone mockup for mobile displays
 * 
 * Also provides an interactive toolbar to manually preview any device mockup,
 * and live customer phone battery synchronization.
 */
export default function DeviceMockup({
  children,
  defaultDevice = 'auto',
  showToolbar = true,
  isBuzzing = false,
  title = 'System Interface Preview',
  deviceBattery = null,
  isCharging = null,
  onBatteryChange = null
}) {
  const [detectedMode, setDetectedMode] = useState('laptop');
  const [selectedDevice, setSelectedDevice] = useState(defaultDevice); // 'auto' | 'laptop' | 'tablet' | 'smartphone'
  const [orientation, setOrientation] = useState('portrait'); // 'portrait' | 'landscape'
  const [phoneTime, setPhoneTime] = useState('12:00');
  
  // Real or calibrated customer phone battery percentage
  const [batteryLevel, setBatteryLevel] = useState(() => {
    if (typeof deviceBattery === 'number' && !isNaN(deviceBattery)) return deviceBattery;
    try {
      const saved = localStorage.getItem('synapse_device_battery');
      if (saved) return parseInt(saved, 10);
    } catch (_) {}
    return 88;
  });
  const [batteryCharging, setBatteryCharging] = useState(() => {
    if (typeof isCharging === 'boolean') return isCharging;
    try {
      return localStorage.getItem('synapse_device_charging') === 'true';
    } catch (_) {}
    return false;
  });
  const [isBatteryApiAvailable, setIsBatteryApiAvailable] = useState(false);
  const [showBatteryPopover, setShowBatteryPopover] = useState(false);

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

  // ── Battery Status API: Auto-detect real device hardware battery where supported ──
  useEffect(() => {
    let batObj = null;
    let handleLevel = null;
    let handleCharging = null;

    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      navigator.getBattery().then(bat => {
        batObj = bat;
        setIsBatteryApiAvailable(true);
        const update = () => {
          const lvl = Math.round(bat.level * 100);
          const chg = Boolean(bat.charging);
          setBatteryLevel(lvl);
          setBatteryCharging(chg);
          try {
            localStorage.setItem('synapse_device_battery', String(lvl));
            localStorage.setItem('synapse_device_charging', String(chg));
          } catch (_) {}
          if (onBatteryChange) {
            onBatteryChange({ level: lvl, charging: chg });
          }
        };
        update();
        handleLevel = update;
        handleCharging = update;
        bat.addEventListener('levelchange', handleLevel);
        bat.addEventListener('chargingchange', handleCharging);
      }).catch(err => {
        console.warn('[DeviceMockup] Battery API unavailable/denied:', err);
      });
    }

    return () => {
      if (batObj) {
        if (handleLevel) batObj.removeEventListener('levelchange', handleLevel);
        if (handleCharging) batObj.removeEventListener('chargingchange', handleCharging);
      }
    };
  }, []);

  // ── Sync external props when provided ──
  useEffect(() => {
    if (typeof deviceBattery === 'number' && !isNaN(deviceBattery)) {
      setBatteryLevel(deviceBattery);
    }
  }, [deviceBattery]);

  useEffect(() => {
    if (typeof isCharging === 'boolean') {
      setBatteryCharging(isCharging);
    }
  }, [isCharging]);

  // Handle manual battery calibration from popover
  const handleManualBatteryUpdate = (newLevel, newCharging = batteryCharging) => {
    const clamped = Math.max(1, Math.min(100, Math.round(newLevel)));
    setBatteryLevel(clamped);
    setBatteryCharging(newCharging);
    try {
      localStorage.setItem('synapse_device_battery', String(clamped));
      localStorage.setItem('synapse_device_charging', String(newCharging));
    } catch (_) {}
    if (onBatteryChange) {
      onBatteryChange({ level: clamped, charging: newCharging });
    }
  };

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

        {/* --- Direct Web Presentation (No Laptop Chassis / Bezel) --- */}
        {activeDevice === 'laptop' && (
          <div className="mv-webapp-viewport device-laptop-layout" style={{ position: 'relative', width: '100%', maxWidth: '980px' }}>
            <div className="mockup-inner-content device-laptop-layout">
              {children}
            </div>
          </div>
        )}

        {/* --- Tablet Mockup --- */}
        {activeDevice === 'tablet' && (
          <div className={`mockup-tablet-unit tablet-${orientation} ${isBuzzing ? 'gadget-buzzing' : ''}`} style={{ position: 'relative' }}>
            {isBuzzing && (
              <div className="gadget-buzzer-beacon">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <BellRing size={15} />
                  <span>TABLET BUZZING — ORDER READY!</span>
                </span>
              </div>
            )}
            <div className="tablet-frame">
              {/* Front Camera */}
              <div className="tablet-camera-notch">
                <span className="tablet-camera-dot" style={isBuzzing ? { background: '#ef4444', boxShadow: '0 0 10px #ef4444' } : {}} />
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

        {/* --- Smartphone Mockup --- */}
        {activeDevice === 'smartphone' && (
          <div className={`mockup-smartphone-unit phone-${orientation} ${isBuzzing ? 'gadget-buzzing' : ''}`} style={{ position: 'relative' }}>
            {isBuzzing && (
              <div className="gadget-buzzer-beacon">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <BellRing size={15} />
                  <span>PHONE BUZZING — ORDER READY!</span>
                </span>
              </div>
            )}
            <div className="phone-chassis">
              {/* Dynamic Island / Speaker Pill */}
              <div className="phone-dynamic-island">
                <div className="phone-island-pill">
                  <span className="phone-island-camera" />
                  <span className="phone-island-sensor" style={isBuzzing ? { background: '#ef4444', boxShadow: '0 0 10px #ef4444' } : {}} />
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
                  {/* Battery with Tap-to-Calibrate and Live Status */}
                  <div
                    className="phone-sb-battery-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowBatteryPopover(prev => !prev);
                    }}
                    role="button"
                    tabIndex={0}
                    title="Tap to calibrate / match customer phone battery"
                    aria-label={`Battery ${batteryLevel}%, ${batteryCharging ? 'charging' : 'not charging'}. Tap to calibrate.`}
                  >
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
                    {batteryCharging && (
                      <span className="phone-sb-charging-bolt" title="Charging" style={{ display: 'inline-flex', alignItems: 'center' }}>
                        <Zap size={11} />
                      </span>
                    )}
                    <span className="phone-sb-pct">{batteryLevel}%</span>
                  </div>
                </div>
              </div>

              {/* Battery Calibration & Mirroring Popover */}
              {showBatteryPopover && (
                <div className="phone-battery-popover" onClick={e => e.stopPropagation()}>
                  <div className="pbp-header">
                    <div className="pbp-title-row">
                      <Battery size={16} className="pbp-icon" />
                      <strong className="pbp-title">Mirror Customer Battery</strong>
                    </div>
                    <button
                      type="button"
                      className="pbp-close-btn"
                      onClick={() => setShowBatteryPopover(false)}
                      aria-label="Close battery settings"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  <p className="pbp-desc">
                    {isBatteryApiAvailable 
                      ? 'Auto-detecting live from connected phone hardware.' 
                      : 'Set percentage to match the customer’s phone.'}
                  </p>

                  <div className="pbp-level-display">
                    <span className="pbp-level-num">{batteryLevel}%</span>
                    <button
                      type="button"
                      className={`pbp-charging-toggle ${batteryCharging ? 'active' : ''}`}
                      onClick={() => handleManualBatteryUpdate(batteryLevel, !batteryCharging)}
                    >
                      {batteryCharging ? 'Charging (Plugged In)' : 'On Battery'}
                    </button>
                  </div>

                  <div className="pbp-slider-row">
                    <span className="pbp-slider-label">1%</span>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={batteryLevel}
                      onChange={(e) => handleManualBatteryUpdate(Number(e.target.value))}
                      className="pbp-slider"
                    />
                    <span className="pbp-slider-label">100%</span>
                  </div>

                  <div className="pbp-presets">
                    {[100, 90, 88, 75, 50, 25].map(pct => (
                      <button
                        key={pct}
                        type="button"
                        className={`pbp-preset-chip ${batteryLevel === pct ? 'selected' : ''}`}
                        onClick={() => handleManualBatteryUpdate(pct)}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="pbp-done-btn"
                    onClick={() => setShowBatteryPopover(false)}
                  >
                    ✓ Done / Synchronized
                  </button>
                </div>
              )}

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
