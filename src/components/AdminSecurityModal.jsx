import React, { useState, useEffect } from 'react';
import {
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  X,
  ShieldCheck,
  Hash,
  Sparkles,
  Delete,
  Shield
} from 'lucide-react';

export default function AdminSecurityModal({
  isOpen,
  onClose,
  onLockSession,
  onPasswordChanged // kept for prop compatibility
}) {
  const [activeTab, setActiveTab] = useState('change-pin'); // 'change-pin' | 'lock-session'
  
  // PIN management state
  const [pinLength, setPinLength] = useState(9);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Active field for touch numpad: 'current' | 'new' | 'confirm'
  const [focusedField, setFocusedField] = useState('new');

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [adminMeta, setAdminMeta] = useState({
    name: 'Chief Administrator',
    email: 'admin@umamicraft.com',
    role: 'Super Admin'
  });

  // Fetch current PIN length & admin identity on modal open
  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setSuccess('');
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');

    // Fetch live PIN config from backend
    fetch('/api/admin/pin')
      .then(res => res.json())
      .then(data => {
        if (data && data.length) {
          setPinLength(data.length);
        } else {
          const savedLength = localStorage.getItem('umami_pin_length');
          if (savedLength) setPinLength(parseInt(savedLength, 10));
        }
      })
      .catch(() => {
        const savedLength = localStorage.getItem('umami_pin_length');
        if (savedLength) setPinLength(parseInt(savedLength, 10));
      });

    // Fetch admin metadata
    fetch('/api/admin/auth-status')
      .then(res => res.json())
      .then(data => {
        if (data && data.email) {
          setAdminMeta(data);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLengthSelect = (len) => {
    setPinLength(len);
    setError('');
    // Trim newPin and confirmPin if they exceed new length
    if (newPin.length > len) setNewPin(newPin.slice(0, len));
    if (confirmPin.length > len) setConfirmPin(confirmPin.slice(0, len));
  };

  const handleNumpadInput = (digit) => {
    setError('');
    if (focusedField === 'current') {
      if (currentPin.length < 12) setCurrentPin(prev => prev + digit);
    } else if (focusedField === 'new') {
      if (newPin.length < pinLength) setNewPin(prev => prev + digit);
    } else if (focusedField === 'confirm') {
      if (confirmPin.length < pinLength) setConfirmPin(prev => prev + digit);
    }
  };

  const handleNumpadBackspace = () => {
    setError('');
    if (focusedField === 'current') {
      setCurrentPin(prev => prev.slice(0, -1));
    } else if (focusedField === 'new') {
      setNewPin(prev => prev.slice(0, -1));
    } else if (focusedField === 'confirm') {
      setConfirmPin(prev => prev.slice(0, -1));
    }
  };

  const handleNumpadClear = () => {
    setError('');
    if (focusedField === 'current') setCurrentPin('');
    else if (focusedField === 'new') setNewPin('');
    else if (focusedField === 'confirm') setConfirmPin('');
  };

  const handleSavePin = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentPin.trim()) {
      setError('Please enter your current numeric security PIN.');
      return;
    }

    if (!/^\d+$/.test(currentPin)) {
      setError('Current PIN must contain only numeric digits.');
      return;
    }

    if (!/^\d+$/.test(newPin)) {
      setError('New PIN must contain only numeric digits (0-9).');
      return;
    }

    if (newPin.length !== pinLength) {
      setError(`New PIN must be exactly ${pinLength} digits long.`);
      return;
    }

    if (newPin !== confirmPin) {
      setError('Confirmation PIN does not match the new PIN.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/admin/change-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPin: currentPin.trim(),
          newPin: newPin.trim(),
          confirmPin: confirmPin.trim(),
          pinLength
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update security PIN.');
      }

      // Persist locally for instant client-side fallback
      localStorage.setItem('umami_admin_pin', newPin.trim());
      localStorage.setItem('umami_pin_length', String(pinLength));
      window.dispatchEvent(new CustomEvent('umami_pin_updated', {
        detail: { length: pinLength, pin: newPin.trim() }
      }));

      setSuccess(`Security PIN successfully updated to ${pinLength} digits! The unlock screen will now display exactly ${pinLength} indicator circles.`);
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');

      setTimeout(() => {
        setSuccess('');
      }, 5000);
    } catch (err) {
      setError(err.message || 'An error occurred while updating the PIN.');
    } finally {
      setLoading(false);
    }
  };

  const handleImmediateLock = () => {
    fetch('/api/admin/lock-session', { method: 'POST' }).catch(() => {});
    onLockSession();
    onClose();
  };

  return (
    <div className="staff-pin-backdrop" onClick={onClose} style={{ zIndex: 110000 }}>
      <div
        className="staff-pin-modal admin-security-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '560px',
          width: '95vw',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '24px 28px',
          borderRadius: '24px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.45)',
          background: '#ffffff',
          position: 'relative'
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          className="staff-pin-close"
          onClick={onClose}
          aria-label="Close"
          style={{ top: '20px', right: '20px' }}
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '18px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(228, 87, 41, 0.15), rgba(194, 69, 34, 0.25))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(228, 87, 41, 0.3)',
              flexShrink: 0
            }}
          >
            <KeyRound size={24} color="#C24522" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#1f2937' }}>
                Admin PIN / Passcode Management
              </h2>
              <span
                style={{
                  background: '#EEF2FF',
                  color: '#4F46E5',
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  letterSpacing: '0.4px'
                }}
              >
                NUMERIC ONLY
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6B7280', lineHeight: 1.4 }}>
              Update the terminal unlock passcode and choose the exact number of digits. Account passwords and email credentials are not modified.
            </p>
          </div>
        </div>

        {/* Authorized Admin Identity Pill */}
        <div
          style={{
            background: '#F9FAFB',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            padding: '10px 14px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={16} color="#10B981" />
            <div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#1F2937' }}>
                {adminMeta.name}
              </span>
              <span style={{ fontSize: '12px', color: '#6B7280', marginLeft: '6px' }}>
                ({adminMeta.email})
              </span>
            </div>
          </div>
          <span
            style={{
              background: '#F3F4F6',
              color: '#374151',
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '6px'
            }}
          >
            Terminal Lock Control
          </span>
        </div>

        {/* Tab Selection */}
        <div
          style={{
            display: 'flex',
            background: '#F3F4F6',
            borderRadius: '12px',
            padding: '4px',
            marginBottom: '18px'
          }}
        >
          <button
            type="button"
            onClick={() => { setActiveTab('change-pin'); setError(''); setSuccess(''); }}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              background: activeTab === 'change-pin' ? '#ffffff' : 'transparent',
              color: activeTab === 'change-pin' ? '#C24522' : '#6B7280',
              boxShadow: activeTab === 'change-pin' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            <KeyRound size={15} />
            <span>Change Security PIN</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('lock-session'); setError(''); setSuccess(''); }}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              background: activeTab === 'lock-session' ? '#ffffff' : 'transparent',
              color: activeTab === 'lock-session' ? '#C24522' : '#6B7280',
              boxShadow: activeTab === 'lock-session' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            <Lock size={15} />
            <span>Lock Admin Panel</span>
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#FEE2E2',
              color: '#B91C1C',
              padding: '10px 14px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: 600,
              marginBottom: '16px',
              border: '1px solid #FCA5A5'
            }}
          >
            <AlertTriangle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#D1FAE5',
              color: '#065F46',
              padding: '10px 14px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: 600,
              marginBottom: '16px',
              border: '1px solid #6EE7B7'
            }}
          >
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{success}</span>
          </div>
        )}

        {/* TAB 1: CHANGE NUMERIC SECURITY PIN */}
        {activeTab === 'change-pin' && (
          <form onSubmit={handleSavePin}>
            {/* Step 1: Select Exact Number of Digits */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#374151' }}>
                  1. Select PIN Length (Number of Digits) <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <span style={{ fontSize: '11px', color: '#6B7280' }}>
                  Current active: <strong>{pinLength} digits</strong>
                </span>
              </div>

              {/* Length Preset Chips */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '8px' }}>
                {[
                  { len: 4, label: '4 Digits', sub: 'Quick Pin' },
                  { len: 6, label: '6 Digits', sub: 'Standard' },
                  { len: 8, label: '8 Digits', sub: 'High Security' },
                  { len: 9, label: '9 Digits', sub: 'Extended' }
                ].map(item => {
                  const isSel = pinLength === item.len;
                  return (
                    <button
                      key={item.len}
                      type="button"
                      onClick={() => handleLengthSelect(item.len)}
                      style={{
                        padding: '8px 4px',
                        borderRadius: '10px',
                        border: isSel ? '2px solid #C24522' : '1px solid #D1D5DB',
                        background: isSel ? '#FFF7ED' : '#FFFFFF',
                        color: isSel ? '#C24522' : '#374151',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ fontSize: '13px', fontWeight: 800 }}>{item.label}</div>
                      <div style={{ fontSize: '10px', color: isSel ? '#EA580C' : '#9CA3AF', marginTop: '1px' }}>
                        {item.sub}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Custom length stepper */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 12px',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '8px'
              }}>
                <span style={{ fontSize: '12px', color: '#475569', fontWeight: 500 }}>
                  Or custom length (4 to 12 digits):
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    disabled={pinLength <= 4}
                    onClick={() => handleLengthSelect(Math.max(4, pinLength - 1))}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      background: '#FFF',
                      cursor: pinLength <= 4 ? 'not-allowed' : 'pointer',
                      fontWeight: 800
                    }}
                  >
                    -
                  </button>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#1E293B', minWidth: '20px', textAlign: 'center' }}>
                    {pinLength}
                  </span>
                  <button
                    type="button"
                    disabled={pinLength >= 12}
                    onClick={() => handleLengthSelect(Math.min(12, pinLength + 1))}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      background: '#FFF',
                      cursor: pinLength >= 12 ? 'not-allowed' : 'pointer',
                      fontWeight: 800
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Live Indicator Preview Banner */}
            <div style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '14px',
              padding: '12px 16px',
              marginBottom: '18px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                Unlock Screen Preview ({pinLength} Indicator Circles)
              </div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                {/* Reference Image 3 layout: capsule pill with exact number of circles */}
                <div className="staff-pin-dots" style={{ margin: 0, padding: '10px 20px', minHeight: '38px' }}>
                  {[...Array(pinLength)].map((_, i) => (
                    <span
                      key={i}
                      className={`staff-pin-dot ${i < newPin.length ? 'filled' : ''}`}
                    />
                  ))}
                </div>
              </div>
              <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '6px' }}>
                {newPin.length > 0 ? `${newPin.length} of ${pinLength} digits entered` : `Displays exactly ${pinLength} circles on staff terminal`}
              </div>
            </div>

            {/* Step 2: Current PIN Field */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151' }}>
                  Current PIN Passcode <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <span style={{ fontSize: '11px', color: '#9CA3AF' }}>Default is 123456789</span>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showCurrent ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={currentPin}
                  onFocus={() => setFocusedField('current')}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setCurrentPin(val);
                    setError('');
                  }}
                  placeholder="Enter current numeric passcode"
                  style={{
                    width: '100%',
                    padding: '9px 40px 9px 12px',
                    borderRadius: '10px',
                    border: focusedField === 'current' ? '1.5px solid #C24522' : '1px solid #D1D5DB',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    letterSpacing: showCurrent ? 'normal' : '2px'
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#9CA3AF',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Step 3: New PIN Field */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151' }}>
                  New Numeric PIN ({pinLength} Digits) <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <span style={{ fontSize: '11px', color: newPin.length === pinLength ? '#10B981' : '#EA580C', fontWeight: 600 }}>
                  {newPin.length} / {pinLength} digits
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNew ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={pinLength}
                  value={newPin}
                  onFocus={() => setFocusedField('new')}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, pinLength);
                    setNewPin(val);
                    setError('');
                  }}
                  placeholder={`Enter exactly ${pinLength} numeric digits`}
                  style={{
                    width: '100%',
                    padding: '9px 40px 9px 12px',
                    borderRadius: '10px',
                    border: focusedField === 'new' ? '1.5px solid #C24522' : '1px solid #D1D5DB',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    letterSpacing: showNew ? 'normal' : '2px'
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#9CA3AF',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Step 4: Confirm New PIN Field */}
            <div style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151' }}>
                  Confirm New PIN ({pinLength} Digits) <span style={{ color: '#EF4444' }}>*</span>
                </label>
                {confirmPin.length > 0 && (
                  <span style={{ fontSize: '11px', color: confirmPin === newPin && confirmPin.length === pinLength ? '#10B981' : '#EF4444', fontWeight: 600 }}>
                    {confirmPin === newPin && confirmPin.length === pinLength ? '✓ PIN Matches' : 'Must match new PIN'}
                  </span>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={pinLength}
                  value={confirmPin}
                  onFocus={() => setFocusedField('confirm')}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, pinLength);
                    setConfirmPin(val);
                    setError('');
                  }}
                  placeholder={`Repeat the ${pinLength}-digit PIN`}
                  style={{
                    width: '100%',
                    padding: '9px 40px 9px 12px',
                    borderRadius: '10px',
                    border: focusedField === 'confirm' ? '1.5px solid #C24522' : '1px solid #D1D5DB',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    letterSpacing: showConfirm ? 'normal' : '2px'
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#9CA3AF',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Quick Touch Numpad */}
            <div style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '10px 14px',
              marginBottom: '18px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>
                  Touch Keypad (Entering for: <strong>{focusedField === 'current' ? 'Current PIN' : focusedField === 'new' ? 'New PIN' : 'Confirm PIN'}</strong>)
                </span>
                <span style={{ fontSize: '10.5px', color: '#94A3B8' }}>Click or type on keyboard</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleNumpadInput(d)}
                    style={{
                      height: '36px',
                      background: '#FFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      fontSize: '15px',
                      fontWeight: 700,
                      color: '#1E293B',
                      cursor: 'pointer'
                    }}
                  >
                    {d}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleNumpadClear}
                  style={{
                    height: '36px',
                    background: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#64748B',
                    cursor: 'pointer'
                  }}
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => handleNumpadInput('0')}
                  style={{
                    height: '36px',
                    background: '#FFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: 700,
                    color: '#1E293B',
                    cursor: 'pointer'
                  }}
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleNumpadBackspace}
                  style={{
                    height: '36px',
                    background: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: '#64748B',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ⌫
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '9px 18px',
                  borderRadius: '10px',
                  border: '1px solid #D1D5DB',
                  background: '#FFFFFF',
                  color: '#374151',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading || newPin.length !== pinLength || newPin !== confirmPin || !currentPin}
                style={{
                  padding: '9px 22px',
                  borderRadius: '10px',
                  border: 'none',
                  background: (loading || newPin.length !== pinLength || newPin !== confirmPin || !currentPin)
                    ? '#9CA3AF'
                    : 'var(--brand-gradient)',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: (loading || newPin.length !== pinLength || newPin !== confirmPin || !currentPin)
                    ? 'not-allowed'
                    : 'pointer',
                  boxShadow: (loading || newPin.length !== pinLength || newPin !== confirmPin || !currentPin)
                    ? 'none'
                    : '0 4px 12px rgba(217, 75, 43, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {loading ? (
                  <span>Updating PIN...</span>
                ) : (
                  <>
                    <KeyRound size={15} />
                    <span>Save {pinLength}-Digit PIN</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: LOCK SESSION */}
        {activeTab === 'lock-session' && (
          <div style={{ padding: '8px 0' }}>
            <div
              style={{
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: '14px',
                padding: '16px',
                marginBottom: '20px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <Lock size={20} color="#DC2626" />
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#991B1B' }}>
                  Lock Admin Workspace
                </h4>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#7F1D1D', lineHeight: 1.5 }}>
                Immediately closes the administrative interface and returns to the guest kiosk screen. Unlocking requires entering the <strong>{pinLength}-digit security passcode</strong>.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '9px 18px',
                  borderRadius: '10px',
                  border: '1px solid #D1D5DB',
                  background: '#FFFFFF',
                  color: '#374151',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImmediateLock}
                style={{
                  padding: '9px 22px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#DC2626',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.35)'
                }}
              >
                <Lock size={15} />
                <span>Lock Session Now</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
