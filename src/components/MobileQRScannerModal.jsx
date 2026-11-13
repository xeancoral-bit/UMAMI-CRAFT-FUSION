import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera, Zap, ZapOff, X, AlertCircle, CheckCircle2, ShieldCheck, Loader2
} from 'lucide-react';
import { SUPPORTED_EWALLETS, EWalletLogo } from '../utils/paymentWallets';

/**
 * Parses Reference Number from EMVCo QR Ph string or direct text
 */
function extractReferenceFromQR(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const str = raw.trim();

  // 1. Direct TXN-UMAMI- match
  const directMatch = str.match(/TXN-UMAMI-[A-Za-z0-9_-]+/i);
  if (directMatch) return directMatch[0].toUpperCase();

  // 2. URL parameter match (e.g. ?ref=TXN-... or /pay/TXN-...)
  const urlMatch = str.match(/ref=([A-Za-z0-9_-]+)/i) || str.match(/\/pay\/([A-Za-z0-9_-]+)/i);
  if (urlMatch) return urlMatch[1].toUpperCase();

  // 3. EMVCo Tag 62 subtag 01 match
  // 62xx...01xxREF...
  const tag62Index = str.indexOf('62');
  if (tag62Index !== -1) {
    const after62 = str.substring(tag62Index + 4);
    const sub01Match = after62.match(/01\d{2}([A-Za-z0-9_-]+)/);
    if (sub01Match) return sub01Match[1].toUpperCase();
  }

  return str.length > 5 ? str : null;
}

export default function MobileQRScannerModal({
  isOpen,
  onClose,
  onPaymentSuccess
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);

  const [cameraState, setCameraState] = useState('requesting'); // requesting | active | denied | unavailable
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [detectedSession, setDetectedSession] = useState(null);
  const [selectedWallet, setSelectedWallet] = useState('GCash');
  const [isConfirming, setIsConfirming] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successData, setSuccessData] = useState(null);
  const [activeSessions, setActiveSessions] = useState([]);

  // Fetch active kiosk sessions for quick detection
  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/payments/active-sessions')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setActiveSessions(data);
      })
      .catch(() => {});
  }, [isOpen]);

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  const handleFoundQR = useCallback(async (rawCode) => {
    const ref = extractReferenceFromQR(rawCode);
    if (!ref) {
      setErrorMsg('Could not detect a valid QR Ph payment code. Please try again.');
      return;
    }

    try {
      setErrorMsg('');
      const res = await fetch(`/api/payments/session/${encodeURIComponent(ref)}`);
      const data = await res.json();
      if (res.ok && data.session) {
        setDetectedSession(data.session);
        setSelectedWallet(data.session.walletId || 'GCash');
      } else {
        setErrorMsg(data.error || 'Transaction reference not found on server.');
      }
    } catch (_) {
      setErrorMsg('Network error connecting to payment gateway.');
    }
  }, []);

  const startScanningLoop = useCallback((stream) => {
    if (!('BarcodeDetector' in window)) return;
    try {
      const barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
      scanIntervalRef.current = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2 || detectedSession) return;
        try {
          const barcodes = await barcodeDetector.detect(videoRef.current);
          if (barcodes && barcodes.length > 0) {
            const rawVal = barcodes[0].rawValue;
            handleFoundQR(rawVal);
          }
        } catch (_) {}
      }, 500);
    } catch (_) {}
  }, [detectedSession, handleFoundQR]);

  // Start Camera Stream
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    setCameraState('requesting');
    setErrorMsg('');
    setDetectedSession(null);
    setSuccessData(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraState('unavailable');
      return;
    }

    let isMounted = true;

    navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    })
      .then(stream => {
        if (!isMounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraState('active');

        // Check torch support
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities ? track.getCapabilities() : {};
        if (capabilities.torch) {
          setTorchAvailable(true);
        }

        // Start scanning loop if BarcodeDetector is available
        startScanningLoop(stream);
      })
      .catch(err => {
        console.warn('[Camera] getUserMedia failed:', err);
        if (isMounted) {
          setCameraState(err.name === 'NotAllowedError' ? 'denied' : 'unavailable');
        }
      });

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [isOpen, startScanningLoop, stopCamera]);

  const toggleTorch = async () => {
    if (!streamRef.current || !torchAvailable) return;
    const track = streamRef.current.getVideoTracks()[0];
    try {
      const nextTorch = !isTorchOn;
      await track.applyConstraints({
        advanced: [{ torch: nextTorch }]
      });
      setIsTorchOn(nextTorch);
    } catch (err) {
      console.warn('[Torch] Failed to toggle flashlight:', err);
    }
  };

  const handleManualLookup = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleFoundQR(manualCode.trim());
  };

  const handleConfirmPayment = async () => {
    if (!detectedSession) return;
    setIsConfirming(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/payments/confirm-qr-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referenceNumber: detectedSession.referenceNumber,
          payerWallet: selectedWallet,
          payerName: 'Mobile Diner (QR Scan)',
          kioskId: detectedSession.kioskId
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessData(data);
        if (onPaymentSuccess) {
          onPaymentSuccess(data);
        }
      } else {
        setErrorMsg(data.error || 'Payment confirmation failed.');
      }
    } catch (err) {
      setErrorMsg('Failed to process payment. Please check your connection.');
    } finally {
      setIsConfirming(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="kiosk-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Mobile QR Scanner"
      style={{ zIndex: 1200 }}
    >
      <div
        className="kiosk-checkout-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '440px',
          maxHeight: '94vh',
          overflowY: 'auto',
          background: '#0F172A',
          color: '#FFFFFF',
          borderRadius: '24px',
          border: '1px solid #334155'
        }}
      >
        {/* Scanner Header */}
        <div style={{
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #1E293B'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Camera size={20} color="#F97316" />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#FFFFFF' }}>
              Scan Kiosk QR Ph Code
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {torchAvailable && cameraState === 'active' && (
              <button
                type="button"
                onClick={toggleTorch}
                style={{
                  background: isTorchOn ? '#F97316' : '#1E293B',
                  border: '1px solid #334155',
                  color: '#FFFFFF',
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Toggle Flashlight"
              >
                {isTorchOn ? <Zap size={16} /> : <ZapOff size={16} />}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#1E293B',
                border: '1px solid #334155',
                color: '#94A3B8',
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Success View */}
        {successData ? (
          <div style={{ padding: '24px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.2)',
              color: '#10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto'
            }}>
              <CheckCircle2 size={40} />
            </div>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 900, color: '#FFFFFF' }}>
              Payment Confirmed!
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#94A3B8' }}>
              Your payment has been verified on the Kiosk terminal. Your order is now in the kitchen!
            </p>

            <div style={{
              background: '#1E293B',
              borderRadius: '14px',
              padding: '14px',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              fontSize: '13px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94A3B8' }}>Pickup Token</span>
                <strong style={{ color: '#F97316', fontSize: '18px' }}>{successData.pickupToken || 'U-101'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94A3B8' }}>Amount Paid</span>
                <strong style={{ color: '#FFFFFF' }}>₱{Number(successData.session?.amount || 0).toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94A3B8' }}>Wallet Used</span>
                <span style={{ color: '#10B981', fontWeight: 700 }}>{selectedWallet}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                marginTop: '10px',
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                border: 'none',
                background: '#F97316',
                color: '#FFFFFF',
                fontWeight: 900,
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Done / Close Scanner
            </button>
          </div>
        ) : detectedSession ? (
          /* Payment Confirmation Bottom Sheet */
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={28} color="#10B981" />
              <div>
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#FFFFFF' }}>
                  QR Ph Code Verified
                </h4>
                <div style={{ fontSize: '12px', color: '#94A3B8' }}>
                  {detectedSession.merchantName || 'UMAMI CRAFT FUSION INC.'}
                </div>
              </div>
            </div>

            {/* Transaction Card */}
            <div style={{
              background: '#1E293B',
              border: '1.5px solid #334155',
              borderRadius: '14px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: '12px', color: '#94A3B8' }}>Payable Total</span>
                <span style={{ fontSize: '24px', fontWeight: 900, color: '#F97316' }}>
                  ₱{Number(detectedSession.amount || 0).toFixed(2)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: '#94A3B8' }}>Order Ref</span>
                <span style={{ fontFamily: 'monospace', color: '#F1F5F9', fontWeight: 700 }}>
                  {detectedSession.referenceNumber}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: '#94A3B8' }}>Kiosk Station</span>
                <span style={{ color: '#F1F5F9', fontWeight: 700 }}>
                  #{detectedSession.kioskId} ({detectedSession.diningOption || 'Dine-In'})
                </span>
              </div>
            </div>

            {/* Select E-Wallet Provider for Payment */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#CBD5E1', marginBottom: '6px' }}>
                Pay Using Your E-Wallet
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(95px, 1fr))', gap: '6px' }}>
                {SUPPORTED_EWALLETS.slice(0, 4).map(w => {
                  const active = selectedWallet === w.id;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setSelectedWallet(w.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px',
                        borderRadius: '8px',
                        border: active ? '2px solid #10B981' : '1px solid #334155',
                        background: active ? '#064E3B' : '#1E293B',
                        color: active ? '#A7F3D0' : '#E2E8F0',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      <EWalletLogo id={w.id} size={16} />
                      <span>{w.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {errorMsg && (
              <div style={{ fontSize: '12px', color: '#EF4444', background: 'rgba(239, 68, 68, 0.1)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                {errorMsg}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setDetectedSession(null)}
                disabled={isConfirming}
                style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid #334155',
                  background: '#1E293B',
                  color: '#94A3B8',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Scan Another
              </button>

              <button
                type="button"
                onClick={handleConfirmPayment}
                disabled={isConfirming}
                style={{
                  flex: 1,
                  padding: '12px 18px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  color: '#FFFFFF',
                  fontWeight: 900,
                  fontSize: '14px',
                  cursor: isConfirming ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
                }}
              >
                {isConfirming ? (
                  <>
                    <Loader2 size={16} className="spin" />
                    <span>Processing Payment...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={18} />
                    <span>Confirm &amp; Pay ₱{Number(detectedSession.amount).toFixed(2)}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Live Camera View & Fallbacks */
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Viewfinder Area */}
            <div style={{
              position: 'relative',
              width: '100%',
              height: '280px',
              background: '#020617',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {cameraState === 'active' ? (
                <>
                  <video
                    ref={videoRef}
                    playsInline
                    autoPlay
                    muted
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />

                  {/* Scanning Reticle Frame */}
                  <div style={{
                    position: 'absolute',
                    width: '200px',
                    height: '200px',
                    border: '2px solid rgba(249, 115, 22, 0.8)',
                    borderRadius: '18px',
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)',
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {/* Animated Scanning Laser */}
                    <div style={{
                      position: 'absolute',
                      width: '100%',
                      height: '2.5px',
                      background: 'linear-gradient(90deg, transparent, #F97316, transparent)',
                      boxShadow: '0 0 8px #F97316',
                      animation: 'scanLaser 2s ease-in-out infinite'
                    }} />
                  </div>
                </>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: '#94A3B8' }}>
                  <AlertCircle size={32} color="#F97316" style={{ margin: '0 auto 8px' }} />
                  <div style={{ fontWeight: 800, color: '#FFFFFF', fontSize: '14px' }}>
                    {cameraState === 'denied' ? 'Camera Access Denied' : 'Camera Unavailable'}
                  </div>
                  <p style={{ fontSize: '12px', margin: '4px 0 0' }}>
                    {cameraState === 'denied'
                      ? 'Please enable camera permissions in your browser or enter the code manually below.'
                      : 'You can enter the reference code or choose an active kiosk session below.'}
                  </p>
                </div>
              )}
            </div>

            {/* Instruction Banner */}
            <div style={{ padding: '12px 18px', background: '#1E293B', fontSize: '12px', color: '#94A3B8', textAlign: 'center' }}>
              Align the <strong>QR Ph Code</strong> displayed on the Kiosk inside the box.
            </div>

            {/* Fallback Section: Manual Code & Active Sessions */}
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Manual Input Form */}
              <form onSubmit={handleManualLookup} style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Enter Ref # (e.g. TXN-UMAMI-...)"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #334155',
                    background: '#1E293B',
                    color: '#FFFFFF',
                    fontSize: '12.5px',
                    outline: 'none'
                  }}
                />
                <button
                  type="submit"
                  style={{
                    padding: '10px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#F97316',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Lookup
                </button>
              </form>

              {/* Quick Pick: Active Kiosk Payment Sessions */}
              {activeSessions.length > 0 && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Active Kiosk Sessions Detected ({activeSessions.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {activeSessions.slice(0, 3).map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleFoundQR(s.referenceNumber)}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 12px',
                          borderRadius: '10px',
                          border: '1px solid #334155',
                          background: '#1E293B',
                          color: '#FFFFFF',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '12.5px', fontWeight: 800 }}>
                            Kiosk #{s.kioskId} • {s.walletId || 'QR Ph'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'monospace' }}>
                            {s.referenceNumber}
                          </div>
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: 900, color: '#F97316' }}>
                          ₱{Number(s.amount).toFixed(2)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {errorMsg && (
                <div style={{ fontSize: '12px', color: '#EF4444', textAlign: 'center' }}>
                  {errorMsg}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

