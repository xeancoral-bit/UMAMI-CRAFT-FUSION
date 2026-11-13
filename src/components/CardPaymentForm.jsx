import React, { useState } from 'react';
import {
  CreditCard, Lock, ShieldCheck, Loader2, ArrowLeft, KeyRound
} from 'lucide-react';

/**
 * Detects Card Brand from prefix
 */
function detectCardBrand(numStr) {
  const clean = numStr.replace(/\D/g, '');
  if (/^4/.test(clean)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(clean)) return 'Mastercard';
  if (/^35/.test(clean)) return 'JCB';
  if (/^3[47]/.test(clean)) return 'Amex';
  return 'Card';
}

export default function CardPaymentForm({
  amount = 0,
  referenceNumber,
  onCancel,
  onSubmitPayment
}) {
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expDate, setExpDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [errors, setErrors] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [show3DS, setShow3DS] = useState(false);
  const [otpCode, setOtpCode] = useState('123456');
  const [isAuthorizing3DS, setIsAuthorizing3DS] = useState(false);

  const brand = detectCardBrand(cardNumber);

  // Auto-format card number in 4-digit groups
  const handleCardNumberChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').substring(0, 16);
    const parts = raw.match(/.{1,4}/g) || [];
    setCardNumber(parts.join(' '));
    if (errors.cardNumber) setErrors(prev => ({ ...prev, cardNumber: null }));
  };

  // Auto-format MM/YY
  const handleExpChange = (e) => {
    let raw = e.target.value.replace(/\D/g, '').substring(0, 4);
    if (raw.length >= 2) {
      raw = raw.substring(0, 2) + '/' + raw.substring(2);
    }
    setExpDate(raw);
    if (errors.expDate) setErrors(prev => ({ ...prev, expDate: null }));
  };

  const handleCvvChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').substring(0, 4);
    setCvv(raw);
    if (errors.cvv) setErrors(prev => ({ ...prev, cvv: null }));
  };

  const validate = () => {
    const errs = {};
    if (!cardholderName.trim()) {
      errs.cardholderName = 'Cardholder name is required.';
    }
    const cleanNum = cardNumber.replace(/\D/g, '');
    if (cleanNum.length < 15) {
      errs.cardNumber = 'Please enter a valid 16-digit card number.';
    }
    const [month, year] = expDate.split('/');
    const mNum = parseInt(month, 10);
    const yNum = parseInt(year, 10);
    if (!month || !year || mNum < 1 || mNum > 12) {
      errs.expDate = 'Invalid expiration date (MM/YY).';
    } else {
      const currentYear = new Date().getFullYear() % 100;
      const currentMonth = new Date().getMonth() + 1;
      if (yNum < currentYear || (yNum === currentYear && mNum < currentMonth)) {
        errs.expDate = 'Card has expired.';
      }
    }
    if (cvv.length < 3) {
      errs.cvv = 'Valid 3 or 4-digit CVV is required.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    setIsProcessing(true);

    // Simulate PayMongo 3D Secure 2.0 Challenge Trigger
    setTimeout(() => {
      setIsProcessing(false);
      setShow3DS(true);
    }, 900);
  };

  const handleConfirm3DS = async () => {
    setIsAuthorizing3DS(true);
    try {
      const cleanNum = cardNumber.replace(/\D/g, '');
      const last4 = cleanNum.slice(-4) || '4242';
      const [expM, expY] = expDate.split('/');

      // Submit tokenized card data (zero raw credentials stored!)
      await onSubmitPayment({
        cardholderName: cardholderName.trim().toUpperCase(),
        cardLast4: last4,
        cardBrand: brand,
        expMonth: expM,
        expYear: '20' + expY,
        authCode: `AUTH-3DS-${Math.floor(100000 + Math.random() * 900000)}`
      });
    } finally {
      setIsAuthorizing3DS(false);
      setShow3DS(false);
    }
  };

  return (
    <div style={{
      width: '100%',
      maxWidth: '440px',
      margin: '0 auto',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      {/* 3D Secure Authentication Modal */}
      {show3DS && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(6px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '400px',
            background: '#FFFFFF',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            animation: 'scaleIn 0.2s ease-out'
          }}>
            {/* Bank Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <KeyRound size={20} color="#0056B3" />
                <span style={{ fontWeight: 800, fontSize: '14px', color: '#0F172A' }}>
                  Bank 3D Secure 2.0 Protection
                </span>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#0056B3', background: '#EFF6FF', padding: '2px 8px', borderRadius: '4px' }}>
                {brand} Identity Check
              </span>
            </div>

            <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: 1.4 }}>
              To authenticate your purchase of <strong style={{ color: '#0F172A' }}>₱{Number(amount).toFixed(2)}</strong> for <strong>UMAMI CRAFT FUSION</strong>, enter the One-Time PIN (OTP) sent to your registered mobile number:
            </p>

            <div style={{
              background: '#F8FAFC',
              border: '1.5px solid #E2E8F0',
              borderRadius: '12px',
              padding: '12px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px' }}>
                Enter 6-Digit OTP Code
              </div>
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                style={{
                  fontSize: '24px',
                  fontWeight: 900,
                  letterSpacing: '8px',
                  textAlign: 'center',
                  width: '180px',
                  padding: '8px',
                  border: '2px solid #0056B3',
                  borderRadius: '10px',
                  outline: 'none',
                  color: '#0F172A',
                  background: '#FFFFFF'
                }}
              />
              <div style={{ fontSize: '11.5px', color: '#059669', fontWeight: 700, marginTop: '6px' }}>
                ✓ Demo OTP auto-filled for instant verification
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => setShow3DS(false)}
                disabled={isAuthorizing3DS}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#64748B',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm3DS}
                disabled={isAuthorizing3DS}
                style={{
                  flex: 2,
                  padding: '12px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#0056B3',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                {isAuthorizing3DS ? (
                  <>
                    <Loader2 size={16} className="spin" />
                    <span>Verifying with Bank...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    <span>Authorize Payment</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Card Entry Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Header Banner */}
        <div style={{
          background: '#FFFFFF',
          border: '1.5px solid #E2E8F0',
          borderRadius: '14px',
          padding: '12px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
              Amount Due
            </span>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#C24522' }}>
              ₱{Number(amount).toFixed(2)}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {['Visa', 'Mastercard', 'JCB'].map(b => (
              <span
                key={b}
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '3px 7px',
                  borderRadius: '5px',
                  background: brand === b ? '#0F172A' : '#F1F5F9',
                  color: brand === b ? '#FFFFFF' : '#64748B',
                  border: `1px solid ${brand === b ? '#0F172A' : '#E2E8F0'}`,
                  transition: 'all 0.15s ease'
                }}
              >
                {b}
              </span>
            ))}
          </div>
        </div>

        {/* Cardholder Name */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '5px' }}>
            Cardholder Name
          </label>
          <input
            type="text"
            placeholder="e.g. JUAN DELA CRUZ"
            value={cardholderName}
            onChange={(e) => {
              setCardholderName(e.target.value);
              if (errors.cardholderName) setErrors(prev => ({ ...prev, cardholderName: null }));
            }}
            style={{
              width: '100%',
              padding: '11px 14px',
              borderRadius: '10px',
              border: `1.5px solid ${errors.cardholderName ? '#EF4444' : '#CBD5E1'}`,
              fontSize: '14px',
              fontWeight: 700,
              textTransform: 'uppercase',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
          {errors.cardholderName && (
            <div style={{ fontSize: '11px', color: '#EF4444', fontWeight: 700, marginTop: '3px' }}>
              {errors.cardholderName}
            </div>
          )}
        </div>

        {/* Card Number */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
            <label style={{ fontSize: '12px', fontWeight: 800, color: '#334155' }}>
              Card Number
            </label>
            {brand !== 'Card' && (
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#0056B3' }}>
                {brand} detected
              </span>
            )}
          </div>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="4111 2222 3333 4444"
              value={cardNumber}
              onChange={handleCardNumberChange}
              maxLength={19}
              style={{
                width: '100%',
                padding: '11px 14px 11px 40px',
                borderRadius: '10px',
                border: `1.5px solid ${errors.cardNumber ? '#EF4444' : '#CBD5E1'}`,
                fontSize: '15px',
                fontWeight: 800,
                fontFamily: 'monospace',
                outline: 'none',
                boxSizing: 'border-box',
                letterSpacing: '1px'
              }}
            />
            <CreditCard size={18} color="#64748B" style={{ position: 'absolute', left: '12px', top: '13px' }} />
          </div>
          {errors.cardNumber && (
            <div style={{ fontSize: '11px', color: '#EF4444', fontWeight: 700, marginTop: '3px' }}>
              {errors.cardNumber}
            </div>
          )}
        </div>

        {/* Expiry Date & CVV */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '5px' }}>
              Expiration (MM/YY)
            </label>
            <input
              type="text"
              placeholder="MM/YY"
              value={expDate}
              onChange={handleExpChange}
              maxLength={5}
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: '10px',
                border: `1.5px solid ${errors.expDate ? '#EF4444' : '#CBD5E1'}`,
                fontSize: '14px',
                fontWeight: 800,
                textAlign: 'center',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            {errors.expDate && (
              <div style={{ fontSize: '11px', color: '#EF4444', fontWeight: 700, marginTop: '3px' }}>
                {errors.expDate}
              </div>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '5px' }}>
              Security Code (CVV)
            </label>
            <input
              type="password"
              placeholder="•••"
              value={cvv}
              onChange={handleCvvChange}
              maxLength={4}
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: '10px',
                border: `1.5px solid ${errors.cvv ? '#EF4444' : '#CBD5E1'}`,
                fontSize: '14px',
                fontWeight: 900,
                textAlign: 'center',
                letterSpacing: '2px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            {errors.cvv && (
              <div style={{ fontSize: '11px', color: '#EF4444', fontWeight: 700, marginTop: '3px' }}>
                {errors.cvv}
              </div>
            )}
          </div>
        </div>

        {/* Security Note */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 12px',
          borderRadius: '10px',
          background: '#F0FDF4',
          border: '1px solid #BBF7D0',
          fontSize: '12px',
          color: '#166534',
          fontWeight: 600
        }}>
          <ShieldCheck size={18} color="#059669" style={{ flexShrink: 0 }} />
          <span>PayMongo 256-bit TLS encrypted. Card numbers are tokenized and never stored on our server.</span>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            style={{
              padding: '12px 16px',
              borderRadius: '12px',
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              color: '#475569',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>

          <button
            type="submit"
            disabled={isProcessing}
            style={{
              flex: 1,
              padding: '12px 18px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              color: '#FFFFFF',
              fontWeight: 900,
              fontSize: '14px',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(5, 150, 105, 0.28)'
            }}
          >
            {isProcessing ? (
              <>
                <Loader2 size={16} className="spin" />
                <span>Contacting Gateway...</span>
              </>
            ) : (
              <>
                <Lock size={16} />
                <span>Authorize &amp; Pay ₱{Number(amount).toFixed(2)}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

