import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  CheckCircle2, Printer, ArrowRight, Utensils, ShieldCheck,
  Receipt, Clock, Smartphone, Sparkles
} from 'lucide-react';

export default function DigitalReceiptModal({
  isOpen,
  onClose,
  order,
  session
}) {
  if (!isOpen) return null;

  const orderId = order?.orderId || order?.id || session?.orderId || 'ORD-UMAMI';
  const pickupToken = order?.pickupToken || session?.pickupToken || 'U-100';
  const refNum = order?.referenceNumber || session?.referenceNumber || 'TXN-UMAMI-DEMO';
  const items = order?.items || session?.items || [];
  const diningOption = order?.diningOption || order?.orderType || session?.diningOption || 'Dine-In';
  const tableNumber = order?.tableNumber || session?.tableNumber || 'Counter';
  const kioskId = order?.kioskId || session?.kioskId || 'COUNTER_01';
  const total = Number(order?.totalPrice || order?.total || session?.amount || 0);
  const subtotal = Number(order?.subtotal || session?.subtotal || total);
  const taxAmount = Number(order?.taxAmount || session?.taxAmount || (total - (total / 1.12)));
  const discountAmount = Number(order?.discountAmount || session?.discountAmount || 0);
  const paymentMethod = order?.paymentMethod || order?.payment || session?.walletId || session?.paymentMethod || 'E-Wallet';
  const timestamp = order?.verifiedAt || session?.paidAt || new Date().toISOString();
  const dateFormatted = new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="kiosk-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Digital Receipt"
      style={{ zIndex: 1200 }}
    >
      <div
        className="kiosk-checkout-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '480px', maxHeight: '92vh', overflowY: 'auto' }}
      >
        {/* Success Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
          color: '#FFFFFF',
          padding: '24px 20px',
          textAlign: 'center',
          borderRadius: '20px 20px 0 0',
          position: 'relative'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 10px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.15)'
          }}>
            <CheckCircle2 size={36} color="#FFFFFF" strokeWidth={2.5} />
          </div>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 900, letterSpacing: '-0.02em' }}>
            Payment Successful!
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', opacity: 0.9 }}>
            Your meal has been sent to the kitchen and is being freshly prepared.
          </p>

          {/* Pickup Token Callout */}
          <div style={{
            marginTop: '14px',
            background: '#FFFFFF',
            color: '#1C1917',
            borderRadius: '14px',
            padding: '10px 16px',
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#78716C', textTransform: 'uppercase' }}>
              Pickup Token Number
            </span>
            <span style={{ fontSize: '28px', fontWeight: 900, color: '#C24522', letterSpacing: '1px' }}>
              {pickupToken}
            </span>
          </div>
        </div>

        {/* Receipt Paper View */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Restaurant Header */}
          <div style={{ textAlign: 'center', borderBottom: '1.5px dashed #D6D3D1', paddingBottom: '12px' }}>
            <div style={{ fontSize: '16px', fontWeight: 900, color: '#1C1917', letterSpacing: '0.04em' }}>
              UMAMI CRAFT FUSION INC.
            </div>
            <div style={{ fontSize: '11.5px', color: '#78716C', marginTop: '2px' }}>
              Smart Self-Service Kiosk • Terminal #{kioskId}
            </div>
            <div style={{ fontSize: '11px', color: '#78716C', marginTop: '2px' }}>
              {dateFormatted} • {diningOption} ({tableNumber})
            </div>
            <div style={{ fontSize: '11.5px', fontFamily: 'monospace', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
              Order ID: #{orderId}
            </div>
          </div>

          {/* Purchased Items List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
            {items.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '13px' }}>
                <div style={{ flex: 1, paddingRight: '8px' }}>
                  <div style={{ fontWeight: 800, color: '#1C1917' }}>
                    {item.quantity || item.qty || 1}x {item.name}
                  </div>
                  {(item.customizations?.length > 0 || item.spiceLevel) && (
                    <div style={{ fontSize: '11px', color: '#78716C', marginTop: '1px' }}>
                      {[item.spiceLevel, ...(item.customizations || [])].filter(Boolean).join(' • ')}
                    </div>
                  )}
                </div>
                <div style={{ fontWeight: 800, color: '#1C1917' }}>
                  ₱{((Number(item.price) || 0) * (item.quantity || item.qty || 1)).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          {/* Financial Breakdown */}
          <div style={{ borderTop: '1px solid #E7E5E4', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12.5px', color: '#57534E' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Subtotal</span>
              <span>₱{subtotal.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669', fontWeight: 700 }}>
                <span>Promo Discount</span>
                <span>-₱{discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#78716C' }}>
              <span>VAT (12% Inclusive)</span>
              <span>₱{taxAmount.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 900, color: '#1C1917', borderTop: '1.5px dashed #D6D3D1', paddingTop: '8px', marginTop: '4px' }}>
              <span>Total Amount Paid</span>
              <span style={{ color: '#C24522' }}>₱{total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method & Gateway Details */}
          <div style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '10px 12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                Payment Method &amp; Reference
              </div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
                {paymentMethod}
              </div>
              <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#64748B' }}>
                {refNum}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                borderRadius: '6px',
                background: '#ECFDF5',
                color: '#047857',
                border: '1px solid #A7F3D0',
                fontSize: '11px',
                fontWeight: 800
              }}>
                <ShieldCheck size={13} />
                <span>PAID</span>
              </span>
            </div>
          </div>

          {/* Kitchen KDS Dispatch Notification */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 12px',
            borderRadius: '10px',
            background: '#FFF5F2',
            border: '1px solid #FED7AA',
            fontSize: '12px',
            color: '#9A3412',
            fontWeight: 700
          }}>
            <Utensils size={16} color="#C24522" style={{ flexShrink: 0 }} />
            <span>Order dispatched to Kitchen Display System (KDS). Please watch the overhead order status screen.</span>
          </div>

          {/* Small Verification QR for Counter Scanning */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '6px 0' }}>
            <QRCodeSVG value={`https://umami.local/order/${orderId}?token=${pickupToken}`} size={64} level="M" />
            <div style={{ fontSize: '11px', color: '#78716C', maxWidth: '200px' }}>
              Present this pickup QR or your token <strong>{pickupToken}</strong> at the counter when called.
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1.5px solid #D6D3D1',
                background: '#FFFFFF',
                color: '#1C1917',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Printer size={16} />
              <span>Print Receipt</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px 18px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #C24522 0%, #A23617 100%)',
                color: '#FFFFFF',
                fontWeight: 900,
                fontSize: '13.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 4px 14px rgba(194, 69, 34, 0.25)'
              }}
            >
              <span>Start New Order</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

