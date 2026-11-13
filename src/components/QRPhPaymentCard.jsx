import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Clock, AlertCircle, RefreshCw, Smartphone,
  Building2, Wallet, QrCode, Copy, Check, ArrowLeft, Loader2
} from 'lucide-react';

/**
 * Official Philippine QR Ph Vector Logo Emblem
 */
export function QRPhLogoEmblem({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Top-Left Bracket (Philippine Blue #0038A8) */}
      <path
        d="M20 44V28C20 23.5817 23.5817 20 28 20H44"
        stroke="#0038A8"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Bottom-Left Bracket (Philippine Blue #0038A8) */}
      <path
        d="M20 56V72C20 76.4183 23.5817 80 28 80H44"
        stroke="#0038A8"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Top-Right Bracket (Philippine Red #CE1126) */}
      <path
        d="M80 44V28C80 23.5817 76.4183 20 72 20H56"
        stroke="#CE1126"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Bottom-Right Bracket (Philippine Red #CE1126) */}
      <path
        d="M80 56V72C80 76.4183 76.4183 80 72 80H56"
        stroke="#CE1126"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Golden Sun Circle (#FCD116) */}
      <circle cx="50" cy="50" r="16" fill="#FCD116" />
    </svg>
  );
}

/**
 * Full QR Ph Header with Official National Branding & Logo
 */
export function QRPhHeader() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <QRPhLogoEmblem size={42} />
        <div style={{ display: 'flex', alignItems: 'baseline', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
          <span style={{ fontSize: '38px', fontWeight: 900, color: '#CE1126', letterSpacing: '-0.03em' }}>QR</span>
          <span style={{ fontSize: '38px', fontWeight: 900, color: '#0038A8', letterSpacing: '-0.03em' }}>Ph</span>
        </div>
      </div>
      <h2 style={{
        margin: '2px 0 0',
        fontSize: '26px',
        fontWeight: 900,
        color: '#0F172A',
        letterSpacing: '0.04em',
        textTransform: 'uppercase'
      }}>
        SCAN NA ALL!
      </h2>
      <div style={{
        background: '#FACC15',
        color: '#0F172A',
        fontSize: '12px',
        fontWeight: 900,
        padding: '3px 18px',
        borderRadius: '9999px',
        letterSpacing: '0.06em',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        NO FEES
      </div>
    </div>
  );
}

/**
 * Desktop QR Ph Standee Component matching Reference Image 2
 */
export default function QRPhPaymentCard({
  session,
  onCancel,
  onRegenerate,
  onSimulatePayment,
  isSimulating = false
}) {
  const [secondsLeft, setSecondsLeft] = useState(session?.remainingSeconds || 600);
  const [copied, setCopied] = useState(false);

  // Live countdown timer
  useEffect(() => {
    if (!session?.expiresAt) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const left = Math.max(0, Math.floor((session.expiresAt - now) / 1000));
      setSecondsLeft(left);
    }, 1000);
    return () => clearInterval(interval);
  }, [session?.expiresAt]);

  const isExpired = secondsLeft <= 0 || session?.status === 'expired';
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const copyRef = () => {
    if (session?.referenceNumber) {
      navigator.clipboard?.writeText?.(session.referenceNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: '100%',
      maxWidth: '440px',
      margin: '0 auto',
      animation: 'fadeIn 0.25s ease-out'
    }}>
      {/* 1. Official QR Ph National Standard Header (Reference Image 2 Top) */}
      <QRPhHeader />

      {/* 2. Official White QR Container Card (Reference Image 2 Center) */}
      <div style={{
        marginTop: '14px',
        width: '100%',
        maxWidth: '350px',
        background: '#FFFFFF',
        border: '2px solid #CBD5E1',
        borderRadius: '24px',
        padding: '20px 18px 16px',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.07)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative'
      }}>
        {/* Merchant Identification */}
        <div style={{
          fontSize: '17px',
          fontWeight: 800,
          color: '#1E293B',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          textAlign: 'center',
          marginBottom: '2px',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          {session?.merchantName || 'UMAMI CRAFT FUSION INC.'}
        </div>
        <div style={{
          fontSize: '12px',
          fontWeight: 700,
          color: '#047857',
          fontFamily: 'monospace',
          marginBottom: '12px',
          letterSpacing: '0.02em'
        }}>
          Account: 0917-888-UMAMI (86264)
        </div>

        {/* Dynamically Generated QR Code with High-Density Error Correction */}
        <div style={{
          position: 'relative',
          padding: '10px',
          background: '#FFFFFF',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {isExpired ? (
            <div style={{
              width: '230px',
              height: '230px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#F8FAFC',
              borderRadius: '16px',
              border: '2px dashed #CBD5E1',
              padding: '16px',
              textAlign: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={38} color="#EA580C" />
              <div style={{ fontWeight: 800, fontSize: '15px', color: '#1E293B' }}>QR Code Expired</div>
              <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
                This transaction timed out for security. Tap below to refresh.
              </p>
              <button
                type="button"
                onClick={onRegenerate}
                style={{
                  marginTop: '6px',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#C24522',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <RefreshCw size={14} />
                <span>Generate New QR</span>
              </button>
            </div>
          ) : (
            <>
              <QRCodeSVG
                value={session?.qrPayload || `https://umami.local/pay/${session?.referenceNumber || 'demo'}`}
                size={230}
                level="H"
                includeMargin={false}
              />
              {/* Centered QR Ph Logo Overlay (Exact Match to Reference Image 2) */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '46px',
                height: '46px',
                background: '#FFFFFF',
                borderRadius: '10px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #FFFFFF'
              }}>
                <QRPhLogoEmblem size={38} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* 3. Official Tagline & 3 App Badges (Reference Image 2 Bottom) */}
      <div style={{
        marginTop: '14px',
        fontSize: '16px',
        fontWeight: 800,
        color: '#1E293B',
        textAlign: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        Basta kaya i-scan, pwede yan!
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '12px',
        marginTop: '10px'
      }}>
        {/* Blue: BANKS */}
        <div style={{
          width: '68px',
          height: '68px',
          borderRadius: '14px',
          background: '#0056B3',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          boxShadow: '0 4px 12px rgba(0, 86, 179, 0.25)'
        }}>
          <Building2 size={24} color="#FFFFFF" strokeWidth={2.2} />
          <span style={{ fontSize: '10px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '0.04em' }}>
            BANKS
          </span>
        </div>

        {/* Red: E-WALLETS */}
        <div style={{
          width: '68px',
          height: '68px',
          borderRadius: '14px',
          background: '#DC2626',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)'
        }}>
          <Wallet size={24} color="#FFFFFF" strokeWidth={2.2} />
          <span style={{ fontSize: '10px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '0.04em' }}>
            E-WALLETS
          </span>
        </div>

        {/* Green: AND MORE */}
        <div style={{
          width: '68px',
          height: '68px',
          borderRadius: '14px',
          background: '#16A34A',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)'
        }}>
          <QrCode size={24} color="#FFFFFF" strokeWidth={2.2} />
          <span style={{ fontSize: '10px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '0.04em' }}>
            AND MORE
          </span>
        </div>
      </div>

      {/* 4. Active Transaction Status & Countdown Bar */}
      <div style={{
        width: '100%',
        marginTop: '16px',
        background: '#FAF8F5',
        border: '1.5px solid #EAE2D7',
        borderRadius: '16px',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        {/* Payable Amount & Live Status */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#78716C', textTransform: 'uppercase' }}>
              Payable Amount
            </div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#C24522' }}>
              ₱{Number(session?.amount || 0).toFixed(2)}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 800,
              background: isExpired ? '#FEF2F2' : '#ECFDF5',
              color: isExpired ? '#DC2626' : '#047857',
              border: `1px solid ${isExpired ? '#FCA5A5' : '#86EFAC'}`
            }}>
              {!isExpired && (
                <span style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: '#10B981',
                  boxShadow: '0 0 6px #10B981'
                }} />
              )}
              {isExpired ? 'Payment Expired' : 'Awaiting Payment'}
            </span>
            {!isExpired && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', color: '#57534E', fontWeight: 700 }}>
                <Clock size={12} color="#C24522" />
                <span>Expires in <strong style={{ color: '#1C1917', fontFamily: 'monospace' }}>{timeFormatted}</strong></span>
              </div>
            )}
          </div>
        </div>

        {/* Transaction Reference Number with Copy */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E7E5E4',
          borderRadius: '10px',
          padding: '8px 12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: '#78716C', textTransform: 'uppercase' }}>
              Transaction Reference
            </span>
            <span style={{ fontSize: '12px', fontWeight: 800, fontFamily: 'monospace', color: '#1C1917' }}>
              {session?.referenceNumber || 'TXN-UMAMI-PENDING'}
            </span>
          </div>
          <button
            type="button"
            onClick={copyRef}
            style={{
              background: copied ? '#ECFDF5' : '#F5F5F4',
              border: '1px solid #E2E8F0',
              borderRadius: '6px',
              padding: '4px 8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              fontWeight: 700,
              color: copied ? '#047857' : '#57534E'
            }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        <p style={{
          margin: 0,
          fontSize: '12px',
          color: '#57534E',
          lineHeight: 1.4,
          textAlign: 'center'
        }}>
          Open your <strong>{session?.walletId || 'GCash or Maya'}</strong> app, tap <strong>Scan QR</strong>, and scan the code above to pay.
        </p>
      </div>

      {/* 5. Quick Simulation & Cancel Actions */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        gap: '8px',
        marginTop: '14px'
      }}>
        {/* Simulate Customer Mobile App Payment (Developer / Testing Control) */}
        <button
          type="button"
          onClick={onSimulatePayment}
          disabled={isSimulating || isExpired}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '12px',
            border: 'none',
            background: isExpired ? '#E2E8F0' : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
            color: '#FFFFFF',
            fontWeight: 800,
            fontSize: '13px',
            cursor: isExpired ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: isExpired ? 'none' : '0 4px 12px rgba(5, 150, 105, 0.25)'
          }}
        >
          {isSimulating ? (
            <>
              <Loader2 size={16} className="spin" />
              <span>Verifying Payment with Gateway...</span>
            </>
          ) : (
            <>
              <Smartphone size={16} />
              <span>Simulate Customer Mobile App Payment</span>
            </>
          )}
        </button>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '10px',
              border: '1px solid #D6D3D1',
              background: '#FFFFFF',
              color: '#57534E',
              fontWeight: 700,
              fontSize: '12.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <ArrowLeft size={14} />
            <span>Change Method</span>
          </button>

          {isExpired && (
            <button
              type="button"
              onClick={onRegenerate}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '10px',
                border: 'none',
                background: '#C24522',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '12.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <RefreshCw size={14} />
              <span>Generate New QR</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

