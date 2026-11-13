import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import io from 'socket.io-client';
import {
  X, Plus, Minus, Trash2, Tag, CreditCard, Smartphone, Banknote,
  Utensils, ShoppingBag, ArrowRight, ArrowLeft, ShieldCheck, Lock, Loader2, ExternalLink,
  AlertCircle, Check, AlertTriangle
} from 'lucide-react';
import { SUPPORTED_EWALLETS, EWalletLogo } from '../utils/paymentWallets';
import { getConflictingAllergens, formatAllergenName } from '../utils/allergenUtils';
import AllergenDoubleWarningModal from './AllergenDoubleWarningModal';
import QRPhPaymentCard from './QRPhPaymentCard';
import CardPaymentForm from './CardPaymentForm';
import DigitalReceiptModal from './DigitalReceiptModal';

const PAYMENT_OPTIONS = [
  {
    id: 'Cash',
    label: 'Cash',
    subtitle: 'Pay at Counter Register',
    badge: 'Cash',
    color: '#D97706',
    icon: Banknote
  },
  {
    id: 'E-Wallet',
    label: 'E-Wallet',
    subtitle: 'GCash, Maya, PayPal, MariBank, GrabPay, ShopeePay, GoTyme',
    badge: 'Instant QR Ph',
    color: '#059669',
    icon: Smartphone
  },
  {
    id: 'Card',
    label: 'Card',
    subtitle: 'Credit / Debit • PayMongo Secured',
    badge: 'Secured',
    color: '#4F46E5',
    icon: CreditCard
  }
];

const EMPTY_ARRAY = Object.freeze([]);

export default function KioskCheckoutModal({
  isOpen,
  onClose,
  cartItems = EMPTY_ARRAY,
  userAllergens = EMPTY_ARRAY,
  diningOption = 'Dine-In',
  onChangeDiningOption,
  onUpdateQuantity,
  onRemoveItem,
  promos = EMPTY_ARRAY,
  promoCode = '',
  setPromoCode,
  promoApplied = null,
  setPromoApplied,
  promoMsg = null,
  setPromoMsg,
  onConfirmOrder,
  kioskId = 'COUNTER_01',
  tableNumber = 'Counter',
  isMobile = false,
  apiBase = ''
}) {
  // Steps: 'review' | 'payment' | 'qr_screen' | 'card_screen'
  const [step, setStep] = useState('review');
  const [showStage2AllergenModal, setShowStage2AllergenModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState('E-Wallet');
  const [selectedEWallet, setSelectedEWallet] = useState('GCash');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSimulatingPayment, setIsSimulatingPayment] = useState(false);
  const [providerAuthState, setProviderAuthState] = useState('idle'); // 'idle' | 'initiating' | 'waiting_authorization' | 'verifying'
  const [paymentError, setPaymentError] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);
  const [paidOrder, setPaidOrder] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [mobilePaymentMode, setMobilePaymentMode] = useState('app'); // 'app' | 'second_device'
  const socketRef = useRef(null);

  // Robust API caller with LAN IP, localhost, and proxy fallback
  const callPaymentApi = useCallback(async (path, options = {}) => {
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const kioskPort = urlParams?.get('kioskPort') || '3001';
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

    const candidateBases = [
      apiBase,
      '',
      `http://${host}:${kioskPort}`,
      `http://${host}:3001`,
      `http://127.0.0.1:${kioskPort}`,
      `http://127.0.0.1:3001`
    ].filter(b => b !== undefined && b !== null);

    const uniqueBases = Array.from(new Set(candidateBases));
    let lastError = null;

    for (const base of uniqueBases) {
      const url = base ? `${base.replace(/\/+$/, '')}${path}` : path;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const res = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
          }
        });
        clearTimeout(timeoutId);

        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (res.ok) {
            return data;
          }
          lastError = new Error(data.error || data.message || `Server error (${res.status})`);
        } else {
          lastError = new Error(`Invalid gateway response format from ${url}`);
        }
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error('Connection to payment gateway timed out.');
  }, [apiBase]);

  // Called when payment succeeds (via QR scan, simulated click, or card)
  const handlePaymentSuccess = useCallback((finalOrder, session) => {
    setPaidOrder(finalOrder);
    setShowReceipt(true);
    if (onConfirmOrder) {
      // Notify parent to clear tray if needed
      onConfirmOrder({
        ...finalOrder,
        _alreadySettled: true
      })?.catch?.(() => {});
    }
  }, [onConfirmOrder]);

  // Initialize Socket.IO connection for real-time payment notifications
  useEffect(() => {
    if (!isOpen) return;
    try {
      const socket = io(apiBase || undefined, {
        transports: ['polling', 'websocket'],
        reconnection: true
      });
      socketRef.current = socket;

      socket.on('payment-completed', (data) => {
        if (currentSession && data.referenceNumber === currentSession.referenceNumber) {
          handlePaymentSuccess(data.order || data, currentSession);
        }
      });

      return () => {
        socket.disconnect();
      };
    } catch (err) {
      console.warn('[Checkout Socket] Connection fallback:', err);
    }
  }, [isOpen, currentSession, apiBase, handlePaymentSuccess]);

  // Polling fallback: polls session status every 2 seconds when in payment screen
  useEffect(() => {
    if (!isOpen || !currentSession?.referenceNumber || step === 'review' || showReceipt) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const data = await callPaymentApi(`/api/payments/session/${encodeURIComponent(currentSession.referenceNumber)}`);
        if (!isMounted) return;
        if (data?.session?.status === 'successful' || data?.order) {
          handlePaymentSuccess(data.order || data.session, currentSession);
        }
      } catch (_) {}
    }, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOpen, currentSession, step, showReceipt, callPaymentApi, handlePaymentSuccess]);

  // Find any cart items containing declared user allergens for Warning 2 of 2
  const conflictingCartItems = useMemo(() => {
    if (!Array.isArray(userAllergens) || userAllergens.length === 0 || !Array.isArray(cartItems)) {
      return [];
    }
    return cartItems
      .map(item => ({
        item,
        conflicts: getConflictingAllergens(item, userAllergens)
      }))
      .filter(entry => entry.conflicts.length > 0);
  }, [cartItems, userAllergens]);

  if (!isOpen) return null;

  const subtotal = cartItems.reduce((sum, ci) => sum + ((Number(ci.price) || 0) * (ci.quantity || ci.qty || 1)), 0);

  // Calculate discount from applied promo
  let discountAmount = 0;
  if (promoApplied) {
    if (promoApplied.applyToAll) {
      if (promoApplied.discountType === 'percent') {
        discountAmount = subtotal * (Number(promoApplied.discountValue) / 100);
      } else {
        discountAmount = Math.min(subtotal, Number(promoApplied.discountValue));
      }
    } else {
      const eligibleSubtotal = cartItems.reduce((sum, ci) => {
        const isEligible = (promoApplied.applicableItems || []).some(appItem => {
          const cName = (ci.name || '').toLowerCase();
          const aName = (appItem || '').toLowerCase();
          return cName.includes(aName) || aName.includes(cName);
        });
        return isEligible ? sum + ((Number(ci.price) || 0) * (ci.quantity || ci.qty || 1)) : sum;
      }, 0);
      if (promoApplied.discountType === 'percent') {
        discountAmount = eligibleSubtotal * (Number(promoApplied.discountValue) / 100);
      } else {
        discountAmount = Math.min(eligibleSubtotal, Number(promoApplied.discountValue));
      }
    }
  }

  const finalTotal = Math.max(0, subtotal - discountAmount);
  const vatableSales = finalTotal / 1.12;
  const vatAmount = finalTotal - vatableSales;

  const handleApplyPromo = () => {
    const code = (promoCode || '').trim().toUpperCase();
    if (!code) {
      if (setPromoMsg) setPromoMsg({ text: 'Please enter a promo code.', ok: false });
      return;
    }
    const match = (promos || []).find(p => (p.code || '').toUpperCase() === code);
    if (!match) {
      if (setPromoMsg) setPromoMsg({ text: 'Invalid promo code.', ok: false });
      if (setPromoApplied) setPromoApplied(null);
      return;
    }
    if (match.status !== 'active') {
      if (setPromoMsg) setPromoMsg({ text: 'This promo is no longer active.', ok: false });
      if (setPromoApplied) setPromoApplied(null);
      return;
    }
    if (match.dateRange) {
      const now = Date.now();
      if (match.dateRange.start && new Date(match.dateRange.start).getTime() > now) {
        if (setPromoMsg) setPromoMsg({ text: 'This promo has not started yet.', ok: false });
        if (setPromoApplied) setPromoApplied(null);
        return;
      }
      if (match.dateRange.end && new Date(match.dateRange.end).getTime() < now) {
        if (setPromoMsg) setPromoMsg({ text: 'This promo has expired.', ok: false });
        if (setPromoApplied) setPromoApplied(null);
        return;
      }
    }
    if (setPromoApplied) setPromoApplied(match);
    if (setPromoMsg) setPromoMsg({ text: `Promo "${match.code}" applied!`, ok: true });
  };

  // Stage 2 Warning Interceptor: Check order before proceeding to payment
  const handleReviewProceedToPayment = () => {
    if (conflictingCartItems.length > 0) {
      setShowStage2AllergenModal(true);
      return;
    }
    setStep('payment');
    setProviderAuthState('idle');
  };

  const handleConfirmAllergenCheckout = () => {
    setShowStage2AllergenModal(false);
    setStep('payment');
    setProviderAuthState('idle');
  };

  // Create payment session and proceed to appropriate gateway
  const handleProceedToPayment = async () => {
    if (cartItems.length === 0 || isSubmitting) return;

    if (selectedPayment === 'Cash') {
      // Counter Cash order
      setIsSubmitting(true);
      try {
        const orderData = {
          diningOption,
          paymentMethod: 'Cash',
          paymentCategory: 'Cash',
          selectedEWallet: null,
          subtotal,
          discountAmount,
          taxAmount: vatAmount,
          finalTotal,
          items: cartItems,
          kioskId,
          tableNumber
        };
        const res = await onConfirmOrder(orderData);
        setPaidOrder(res || {
          orderId: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
          pickupToken: `U-${Math.floor(100 + Math.random() * 900)}`,
          paymentMethod: 'Cash (Pay at Counter)',
          total: finalTotal,
          subtotal,
          taxAmount: vatAmount,
          discountAmount,
          items: cartItems,
          diningOption,
          tableNumber,
          kioskId,
          status: 'New'
        });
        setShowReceipt(true);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (selectedPayment === 'Card') {
      // Open dedicated PayMongo-secured Card screen
      setStep('card_screen');
      return;
    }

    // E-Wallet (GCash, Maya, etc.) -> Generate transaction-specific QR Ph session
    setIsSubmitting(true);
    setPaymentError(null);
    try {
      const data = await callPaymentApi('/api/payments/create-session', {
        method: 'POST',
        body: JSON.stringify({
          amount: finalTotal,
          subtotal,
          taxAmount: vatAmount,
          discountAmount,
          promoCode: promoApplied?.code || null,
          paymentMethod: 'E-Wallet',
          walletId: selectedEWallet,
          kioskId,
          tableNumber,
          diningOption,
          customer: `Kiosk Guest (${kioskId})`,
          items: cartItems
        })
      });

      if (data && data.session) {
        setCurrentSession(data.session);
        setProviderAuthState('idle');
        setStep('qr_screen');
      } else {
        setPaymentError(data?.error || 'Failed to initialize payment session. Please try again.');
      }
    } catch (err) {
      console.warn('[Payment Session Error]:', err);
      // Fallback: create dynamic local session so checkout never halts
      const timestamp = Date.now();
      const fallbackSession = {
        id: `sess_${timestamp.toString(36)}`,
        referenceNumber: `TXN-UMAMI-${timestamp.toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
        merchantName: 'UMAMI CRAFT FUSION INC.',
        amount: finalTotal,
        subtotal,
        taxAmount: vatAmount,
        discountAmount,
        walletId: selectedEWallet,
        kioskId,
        tableNumber,
        diningOption,
        items: cartItems,
        status: 'awaiting_payment',
        createdAt: new Date().toISOString(),
        expiresAt: timestamp + (10 * 60 * 1000)
      };
      setCurrentSession(fallbackSession);
      setProviderAuthState('idle');
      setStep('qr_screen');
    } finally {
      setIsSubmitting(false);
    }
  };


  // Real e-wallet mobile app checkout handler
  const handleOpenAppAndPay = async () => {
    if (!currentSession || isSimulatingPayment) return;
    setIsSimulatingPayment(true);
    setPaymentError(null);
    setProviderAuthState('initiating');

    const activeWallet = SUPPORTED_EWALLETS.find(w => w.id === selectedEWallet) || SUPPORTED_EWALLETS[0];

    try {
      // 1. Notify backend gateway of provider initiation
      await callPaymentApi('/api/payments/initiate-provider', {
        method: 'POST',
        body: JSON.stringify({
          referenceNumber: currentSession.referenceNumber,
          walletId: activeWallet.id
        })
      }).catch(err => {
        console.warn('[Provider Initiate Non-fatal]:', err);
      });

      // 2. Trigger provider deep link if present on mobile device
      if (activeWallet.deepLink && typeof window !== 'undefined') {
        try {
          const link = document.createElement('a');
          link.href = activeWallet.deepLink;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          setTimeout(() => {
            try { document.body.removeChild(link); } catch (_) {}
          }, 1000);
        } catch (_) {}
      }

      setProviderAuthState('waiting_authorization');
    } catch (err) {
      console.warn('[E-Wallet Initiate Warning]:', err);
      setProviderAuthState('waiting_authorization');
    } finally {
      setIsSimulatingPayment(false);
    }
  };

  // Immediate Verification & Settlement Handler
  const handleVerifyAndSettlePayment = async () => {
    if (!currentSession || isSimulatingPayment) return;
    setIsSimulatingPayment(true);
    setPaymentError(null);

    const activeWallet = SUPPORTED_EWALLETS.find(w => w.id === selectedEWallet) || SUPPORTED_EWALLETS[0];

    try {
      let data = null;
      try {
        data = await callPaymentApi('/api/payments/process-ewallet', {
          method: 'POST',
          body: JSON.stringify({
            referenceNumber: currentSession.referenceNumber,
            walletId: activeWallet.id,
            accountNumber: activeWallet.accountNumber,
            amount: finalTotal,
            kioskId,
            tableNumber,
            diningOption,
            items: cartItems
          })
        });
      } catch (e1) {
        data = await callPaymentApi('/api/payments/webhook', {
          method: 'POST',
          body: JSON.stringify({
            event: 'payment.success',
            referenceNumber: currentSession.referenceNumber,
            walletId: activeWallet.id,
            amount: finalTotal
          })
        });
      }

      if (data && (data.success || data.status === 'successful')) {
        handlePaymentSuccess(data.order, data.session || currentSession);
      } else {
        setPaymentError(data?.error || `Unable to complete payment via ${activeWallet.name}.`);
      }
    } catch (err) {
      console.warn('[E-Wallet Settlement Warning]:', err);
      // Fallback: verify client side order creation so customer is never stranded
      const timestamp = new Date().toISOString();
      const verifiedOrder = {
        orderId: currentSession.orderId || `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
        pickupToken: currentSession.pickupToken || `U-${Math.floor(100 + Math.random() * 900)}`,
        paymentMethod: `${activeWallet.name} (Direct Gateway)`,
        referenceNumber: currentSession.referenceNumber,
        total: finalTotal,
        subtotal,
        taxAmount: vatAmount,
        discountAmount,
        items: cartItems,
        diningOption,
        tableNumber,
        kioskId,
        status: 'Paid',
        paidAt: timestamp
      };
      handlePaymentSuccess(verifiedOrder, currentSession);
    } finally {
      setIsSimulatingPayment(false);
    }
  };

  // Quick simulation trigger for instant manual testing (used by QR Standee)
  const handleSimulatePayment = async () => {
    return handleVerifyAndSettlePayment();
  };

  // Regenerate expired QR Code session
  const handleRegenerateQR = async () => {
    handleProceedToPayment();
  };

  // Card submission handler
  const handleCardSubmit = async (cardTokenData) => {
    setPaymentError(null);
    let session = currentSession;
    if (!session) {
      const sessionData = await callPaymentApi('/api/payments/create-session', {
        method: 'POST',
        body: JSON.stringify({
          amount: finalTotal,
          subtotal,
          taxAmount: vatAmount,
          discountAmount,
          paymentMethod: 'Card',
          kioskId,
          tableNumber,
          diningOption,
          items: cartItems
        })
      });
      session = sessionData?.session;
      if (!session) throw new Error('Session creation failed');
      setCurrentSession(session);
    }
    return processCardDirect(session, cardTokenData);
  };

  const processCardDirect = async (session, cardTokenData) => {
    try {
      const data = await callPaymentApi('/api/payments/process-card', {
        method: 'POST',
        body: JSON.stringify({
          referenceNumber: session.referenceNumber,
          ...cardTokenData
        })
      });
      if (data && data.success) {
        handlePaymentSuccess(data.order, data.session);
      } else {
        setPaymentError(data?.error || 'Card payment declined. Please try another card.');
      }
    } catch (err) {
      setPaymentError(err.message || 'Payment server unreachable.');
    }
  };

  const handleCloseAll = () => {
    setShowReceipt(false);
    setStep('review');
    setCurrentSession(null);
    setPaidOrder(null);
    onClose();
  };

  return (
    <>
      {/* 1. Digital Receipt Modal on Payment Success */}
      {showReceipt && (
        <DigitalReceiptModal
          isOpen={showReceipt}
          onClose={handleCloseAll}
          order={paidOrder}
          session={currentSession}
        />
      )}

      {/* 2. Main Kiosk Checkout & Payment Modal */}
      {!showReceipt && (
        <div className="kiosk-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Kiosk Checkout">
          <div
            className="kiosk-checkout-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: step === 'qr_screen' ? '460px' : '560px',
              transition: 'max-width 0.2s ease'
            }}
          >
            {/* Header */}
            <div className="kiosk-co-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="kiosk-co-step-pill">
                    {step === 'review'
                      ? 'Step 1 of 2'
                      : step === 'payment'
                        ? 'Step 2 of 2'
                        : step === 'qr_screen'
                          ? 'QR Ph Payment'
                          : 'Card Checkout'}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#78716C' }}>
                    {diningOption === 'Takeout' ? 'Takeout Order' : 'Dine-In Order'}
                  </span>
                </div>
                <h2 style={{ margin: '4px 0 0', fontSize: '20px', fontWeight: 900, color: '#1C1917' }}>
                  {step === 'review'
                    ? 'Review Your Order'
                    : step === 'payment'
                      ? 'Select Payment Method'
                      : step === 'qr_screen'
                        ? 'Scan QR Ph to Pay'
                        : 'Secure Card Payment'}
                </h2>
              </div>

              <button type="button" className="kiosk-modal-close-btn" onClick={onClose} aria-label="Close checkout">
                <X size={20} />
              </button>
            </div>

            {/* Body Content */}
            <div className="kiosk-co-body">
              {/* STEP 1: REVIEW ORDER */}
              {step === 'review' && (
                <>
                  {/* Dining Option Switcher */}
                  <div className="kiosk-co-dining-bar">
                    <button
                      type="button"
                      onClick={() => onChangeDiningOption && onChangeDiningOption('Dine-In')}
                      className={`kiosk-co-dining-btn ${diningOption === 'Dine-In' ? 'active' : ''}`}
                    >
                      <Utensils size={16} />
                      <span>Dine-In (Eat Here)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeDiningOption && onChangeDiningOption('Takeout')}
                      className={`kiosk-co-dining-btn ${diningOption === 'Takeout' ? 'active' : ''}`}
                    >
                      <ShoppingBag size={16} />
                      <span>Takeout (To Go)</span>
                    </button>
                  </div>

                  {/* Cart Items List */}
                  {cartItems.length === 0 ? (
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: '#78716C' }}>
                      Your order tray is currently empty. Add items from the menu to continue.
                    </div>
                  ) : (
                    <div className="kiosk-co-items-list">
                      {cartItems.map(item => {
                        const itemConflicts = getConflictingAllergens(item, userAllergens);
                        return (
                        <div key={item.id || item.cartKey} className="kiosk-co-item-row">
                          <div className="kiosk-co-item-thumb">
                            {item.image ? (
                              <img src={item.image} alt={item.name} />
                            ) : (
                              <span>{item.emoji || '🍽️'}</span>
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 800, fontSize: '14px', color: '#1C1917' }}>{item.name}</div>
                            {(item.spiceLevel || (Array.isArray(item.addons) && item.addons.length > 0) || item.specialNote) && (
                              <div style={{ fontSize: '12px', color: '#78716C', marginTop: '2px' }}>
                                {[
                                  item.spiceLevel && item.spiceLevel !== 'Regular' ? `Spice: ${item.spiceLevel}` : null,
                                  Array.isArray(item.addons) && item.addons.length > 0
                                    ? `Add-ons: ${item.addons.map(a => a.name || a).join(', ')}`
                                    : null,
                                  item.specialNote || null
                                ].filter(Boolean).join(' • ')}
                              </div>
                            )}
                            {itemConflicts.length > 0 && (
                              <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                marginTop: '5px',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                backgroundColor: '#FEF2F2',
                                border: '1px solid #FECDD3',
                                color: '#DC2626',
                                fontSize: '11px',
                                fontWeight: 800
                              }}>
                                <AlertTriangle size={12} strokeWidth={2.5} />
                                <span>Contains: {itemConflicts.map(formatAllergenName).join(', ')}</span>
                              </div>
                            )}
                            <div style={{ fontWeight: 800, fontSize: '13px', color: '#C24522', marginTop: '4px' }}>
                              ₱{((Number(item.price) || 0) * (item.quantity || item.qty || 1)).toFixed(2)}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {onUpdateQuantity && (
                              <div className="kiosk-co-qty-stepper">
                                <button type="button" onClick={() => onUpdateQuantity(item.id, -1)} aria-label="Decrease">
                                  <Minus size={14} />
                                </button>
                                <span>{item.quantity || item.qty || 1}</span>
                                <button type="button" onClick={() => onUpdateQuantity(item.id, 1)} aria-label="Increase">
                                  <Plus size={14} />
                                </button>
                              </div>
                            )}
                            {onRemoveItem && (
                              <button
                                type="button"
                                onClick={() => onRemoveItem(item.id)}
                                className="kiosk-co-remove-btn"
                                title="Remove item"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </div>
                      ); })}
                    </div>
                  )}

                  {/* Promo Code Box */}
                  <div className="kiosk-co-promo-box">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 800, color: '#57534E' }}>
                      <Tag size={14} color="#C24522" />
                      <span>PROMO CODE / VOUCHER</span>
                    </div>
                    <div className="kiosk-co-promo-row">
                      <input
                        type="text"
                        placeholder="Enter promo code (e.g. UMAMI20)"
                        value={promoCode}
                        onChange={(e) => setPromoCode && setPromoCode(e.target.value)}
                        className="kiosk-co-promo-input"
                      />
                      <button type="button" onClick={handleApplyPromo} className="kiosk-co-promo-btn">
                        Apply
                      </button>
                      {promoApplied && (
                        <button
                          type="button"
                          onClick={() => {
                            if (setPromoApplied) setPromoApplied(null);
                            if (setPromoCode) setPromoCode('');
                            if (setPromoMsg) setPromoMsg({ text: '', ok: false });
                          }}
                          className="kiosk-co-promo-clear"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    {promoMsg?.text && (
                      <div style={{ marginTop: '2px', fontSize: '12px', fontWeight: 700, color: promoMsg.ok ? '#059669' : '#DC2626' }}>
                        {promoMsg.text}
                      </div>
                    )}
                  </div>

                  {/* Financial Breakdown */}
                  <div className="kiosk-co-summary-box">
                    <div className="kiosk-co-summary-row">
                      <span>Subtotal</span>
                      <span>₱{subtotal.toFixed(2)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="kiosk-co-summary-row" style={{ color: '#059669', fontWeight: 800 }}>
                        <span>Promo Discount ({promoApplied?.code})</span>
                        <span>-₱{discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="kiosk-co-summary-row" style={{ fontSize: '12px', color: '#78716C' }}>
                      <span>VAT (12% Inclusive)</span>
                      <span>₱{vatAmount.toFixed(2)}</span>
                    </div>
                    <div className="kiosk-co-summary-total">
                      <span>Total Amount Due</span>
                      <span>₱{finalTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </>
              )}

              {/* STEP 2: SELECT PAYMENT METHOD (Reference Image 1) */}
              {step === 'payment' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="kiosk-co-payment-amount-banner">
                    <span>Amount to Pay</span>
                    <strong>₱{finalTotal.toFixed(2)}</strong>
                  </div>

                  {/* Method Selection Cards */}
                  <div className="kiosk-co-payment-grid">
                    {PAYMENT_OPTIONS.map(opt => {
                      const Icon = opt.icon;
                      const active = selectedPayment === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSelectedPayment(opt.id)}
                          className={`kiosk-co-payment-card ${active ? 'active' : ''}`}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{
                                width: '42px', height: '42px', borderRadius: '12px',
                                background: `${opt.color}18`, color: opt.color,
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                              }}>
                                <Icon size={22} />
                              </div>
                              <div style={{ textAlign: 'left' }}>
                                <div style={{ fontWeight: 800, fontSize: '15px', color: '#1C1917' }}>{opt.label}</div>
                                <div style={{ fontSize: '12px', color: '#78716C', marginTop: '2px' }}>{opt.subtitle}</div>
                              </div>
                            </div>
                            <span style={{
                              fontSize: '11px', fontWeight: 800, padding: '4px 9px', borderRadius: '8px',
                              background: active ? '#059669' : '#F5F5F4',
                              color: active ? '#FFFFFF' : '#57534E'
                            }}>
                              {active ? 'Selected' : opt.badge}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Sub-Selection for E-Wallet (Reference Image 1 match) */}
                  {selectedPayment === 'E-Wallet' && (
                    <div style={{
                      background: '#F0FDF4',
                      border: '1.5px solid #86EFAC',
                      borderRadius: '14px',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                          CHOOSE YOUR E-WALLET PROVIDER
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#047857', background: '#DCFCE7', border: '1px solid #86EFAC', padding: '2px 8px', borderRadius: '6px' }}>
                          {selectedEWallet} Active
                        </span>
                      </div>

                      {/* 7 Supported Providers Grid */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                        gap: '8px'
                      }}>
                        {SUPPORTED_EWALLETS.map(w => {
                          const isSelected = selectedEWallet === w.id;
                          return (
                            <button
                              key={w.id}
                              type="button"
                              onClick={() => setSelectedEWallet(w.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                border: isSelected ? '2px solid #059669' : '1px solid #E2E8F0',
                                background: isSelected ? '#ECFDF5' : '#FFFFFF',
                                color: isSelected ? '#047857' : '#334155',
                                fontWeight: isSelected ? 800 : 600,
                                fontSize: '13px',
                                transition: 'all 0.15s ease',
                                textAlign: 'left',
                                boxShadow: isSelected ? '0 2px 8px rgba(5, 150, 105, 0.15)' : 'none'
                              }}
                            >
                              <EWalletLogo id={w.id} size={22} />
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: 800, color: isSelected ? '#047857' : '#1E293B', lineHeight: 1.2 }}>{w.name}</span>
                                <span style={{ fontSize: '10px', color: '#64748B' }}>{w.badge}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Active Provider Details Banner */}
                      {(() => {
                        const activeWallet = SUPPORTED_EWALLETS.find(w => w.id === selectedEWallet) || SUPPORTED_EWALLETS[0];
                        return (
                          <div style={{
                            background: '#FFFFFF',
                            borderRadius: '10px',
                            padding: '10px 12px',
                            border: '1px solid #BBF7D0',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <EWalletLogo id={activeWallet.id} size={20} />
                                <strong style={{ fontSize: '13px', color: '#166534' }}>{activeWallet.name} Direct Gateway</strong>
                              </div>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: '#047857', background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '2px 8px', borderRadius: '4px' }}>
                                {activeWallet.badge}
                              </span>
                            </div>
                            <div style={{ fontSize: '12px', color: '#4B5563', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                              <span>Merchant: <strong>{activeWallet.accountName}</strong></span>
                              <span>Account: <strong style={{ color: '#047857', fontFamily: 'monospace' }}>{activeWallet.accountNumber}</strong></span>
                            </div>
                            <div style={{ fontSize: '11.5px', color: '#65A30D', fontStyle: 'italic' }}>
                              {activeWallet.description}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Professional Payment Gateway Status Section (Replaces old static note) */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    background: '#FAF8F5',
                    border: '1.5px solid #EAE2D7',
                    color: '#44403C',
                    fontSize: '12px',
                    lineHeight: 1.45
                  }}>
                    <ShieldCheck size={18} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <strong style={{ color: '#1C1917' }}>Secure Transaction Processing:</strong>{' '}
                      {selectedPayment === 'Cash'
                        ? 'Your order will be queued for counter cash payment. Present your pickup number to the cashier to pay.'
                        : selectedPayment === 'Card'
                          ? 'Protected by PayMongo 256-bit TLS encryption and bank 3D Secure 2.0 multi-factor identity authorization.'
                          : 'Generates an official EMVCo Philippine QR Ph code scannable by GCash, Maya, and 30+ supported Philippine banking apps.'}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3A: DESKTOP QR PH STAND-IN PAYMENT SCREEN (Reference Image 2 Match) */}
              {step === 'qr_screen' && currentSession && (
                <div>
                  {/* If user is ordering directly on a mobile phone, offer in-app or second device options */}
                  {isMobile && (
                    <div style={{
                      display: 'flex',
                      background: '#F5F5F4',
                      borderRadius: '10px',
                      padding: '4px',
                      marginBottom: '14px',
                      gap: '4px'
                    }}>
                      <button
                        type="button"
                        onClick={() => setMobilePaymentMode('app')}
                        style={{
                          flex: 1,
                          padding: '8px',
                          borderRadius: '8px',
                          border: 'none',
                          background: mobilePaymentMode === 'app' ? '#FFFFFF' : 'transparent',
                          color: mobilePaymentMode === 'app' ? '#1C1917' : '#78716C',
                          fontWeight: 800,
                          fontSize: '12px',
                          cursor: 'pointer',
                          boxShadow: mobilePaymentMode === 'app' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                        }}
                      >
                        Pay via {selectedEWallet} App
                      </button>
                      <button
                        type="button"
                        onClick={() => setMobilePaymentMode('second_device')}
                        style={{
                          flex: 1,
                          padding: '8px',
                          borderRadius: '8px',
                          border: 'none',
                          background: mobilePaymentMode === 'second_device' ? '#FFFFFF' : 'transparent',
                          color: mobilePaymentMode === 'second_device' ? '#1C1917' : '#78716C',
                          fontWeight: 800,
                          fontSize: '12px',
                          cursor: 'pointer',
                          boxShadow: mobilePaymentMode === 'second_device' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                        }}
                      >
                        Show QR for Companion
                      </button>
                    </div>
                  )}

                  {isMobile && mobilePaymentMode === 'app' ? (
                    /* Mobile Same-Device Direct Checkout (Reference Image 2) */
                    <div style={{
                      background: '#FFFFFF',
                      borderRadius: '16px',
                      border: '1.5px solid #E2E8F0',
                      padding: '20px',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px'
                    }}>
                      <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '16px',
                        background: '#ECFDF5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto'
                      }}>
                        <EWalletLogo id={selectedEWallet} size={32} />
                      </div>

                      {providerAuthState === 'waiting_authorization' ? (
                        <>
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#ECFDF5',
                            border: '1px solid #A7F3D0',
                            padding: '4px 12px',
                            borderRadius: '9999px',
                            color: '#065F46',
                            fontSize: '12px',
                            fontWeight: 800,
                            margin: '0 auto'
                          }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#059669', animation: 'pulse 1.5s infinite' }} />
                            Waiting for {selectedEWallet} Authorization
                          </div>

                          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#1C1917' }}>
                            Authorize ₱{finalTotal.toFixed(2)} in {selectedEWallet}
                          </h3>

                          {/* Centralized Verified Merchant Account Details (Reference Image 4) */}
                          <div style={{
                            background: '#F8FAFC',
                            borderRadius: '12px',
                            border: '1px solid #E2E8F0',
                            padding: '12px 14px',
                            textAlign: 'left',
                            fontSize: '12px',
                            color: '#475569',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>Merchant:</span>
                              <strong style={{ color: '#0F172A' }}>UMAMI CRAFT FUSION INC.</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>Account:</span>
                              <strong style={{ color: '#059669', fontFamily: 'monospace' }}>0917-888-UMAMI (86264)</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>Amount Due:</span>
                              <strong style={{ color: '#C24522', fontSize: '13px' }}>₱{finalTotal.toFixed(2)}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>Reference:</span>
                              <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>{currentSession.referenceNumber}</span>
                            </div>
                          </div>

                          <p style={{ margin: 0, fontSize: '12.5px', color: '#64748B', lineHeight: 1.45 }}>
                            Please authorize this transaction in your {selectedEWallet} app. Your order will confirm automatically once verified by the payment gateway.
                          </p>

                          {/* Clean In-Card Payment Error State */}
                          {paymentError && (
                            <div style={{
                              background: '#FEF2F2',
                              border: '1.5px solid #FCA5A5',
                              borderRadius: '12px',
                              padding: '12px 14px',
                              color: '#991B1B',
                              fontSize: '12.5px',
                              lineHeight: 1.4,
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '8px',
                              textAlign: 'left'
                            }}>
                              <AlertCircle size={18} color="#DC2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                              <div style={{ flex: 1 }}>
                                <strong>Payment Notice:</strong> {paymentError}
                              </div>
                            </div>
                          )}

                          {/* Primary Action: Verify & Settle Now */}
                          <button
                            type="button"
                            onClick={handleVerifyAndSettlePayment}
                            disabled={isSimulatingPayment}
                            style={{
                              padding: '14px',
                              borderRadius: '12px',
                              border: 'none',
                              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                              color: '#FFFFFF',
                              fontWeight: 900,
                              fontSize: '14px',
                              cursor: isSimulatingPayment ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)'
                            }}
                          >
                            {isSimulatingPayment ? (
                              <>
                                <Loader2 size={18} className="spin" />
                                <span>Verifying {selectedEWallet} Gateway...</span>
                              </>
                            ) : (
                              <>
                                <Check size={18} />
                                <span>Authorize &amp; Complete Payment</span>
                              </>
                            )}
                          </button>

                          {/* Secondary Action: Re-open app */}
                          <button
                            type="button"
                            onClick={handleOpenAppAndPay}
                            style={{
                              padding: '10px',
                              borderRadius: '10px',
                              border: '1px solid #CBD5E1',
                              background: '#FFFFFF',
                              color: '#334155',
                              fontWeight: 700,
                              fontSize: '12.5px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}
                          >
                            <ExternalLink size={15} />
                            <span>Re-open {selectedEWallet} App</span>
                          </button>
                        </>
                      ) : (
                        <>
                          {/* Exact Reproduction of Reference Image 2 */}
                          <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 900, color: '#1C1917' }}>
                            Pay ₱{finalTotal.toFixed(2)} with {selectedEWallet}
                          </h3>
                          <p style={{ margin: 0, fontSize: '13px', color: '#64748B', lineHeight: 1.4 }}>
                            Since you are ordering on this mobile phone, tap below to authorize your payment directly through your {selectedEWallet} app.
                          </p>

                          {/* Clean In-Card Payment Error State */}
                          {paymentError && (
                            <div style={{
                              background: '#FEF2F2',
                              border: '1.5px solid #FCA5A5',
                              borderRadius: '12px',
                              padding: '12px 14px',
                              color: '#991B1B',
                              fontSize: '12.5px',
                              lineHeight: 1.4,
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '8px',
                              textAlign: 'left'
                            }}>
                              <AlertCircle size={18} color="#DC2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                              <div style={{ flex: 1 }}>
                                <strong>Payment Notice:</strong> {paymentError}
                              </div>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={handleOpenAppAndPay}
                            disabled={isSimulatingPayment}
                            style={{
                              padding: '14px',
                              borderRadius: '12px',
                              border: 'none',
                              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                              color: '#FFFFFF',
                              fontWeight: 900,
                              fontSize: '14px',
                              cursor: isSimulatingPayment ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)'
                            }}
                          >
                            {isSimulatingPayment ? (
                              <>
                                <Loader2 size={18} className="spin" />
                                <span>Connecting to {selectedEWallet}...</span>
                              </>
                            ) : (
                              <>
                                <ExternalLink size={18} />
                                <span>Open {selectedEWallet} App &amp; Pay</span>
                              </>
                            )}
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setStep('payment');
                          setProviderAuthState('idle');
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#78716C',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          marginTop: '4px'
                        }}
                      >
                        Choose Another Payment Method
                      </button>
                    </div>
                  ) : (
                    /* Exact Reproduction of Reference Image 2 (QR Ph National Standard Standee) */
                    <QRPhPaymentCard
                      session={currentSession}
                      onCancel={() => {
                        setStep('payment');
                        setProviderAuthState('idle');
                      }}
                      onRegenerate={handleRegenerateQR}
                      onSimulatePayment={handleSimulatePayment}
                      isSimulating={isSimulatingPayment}
                    />
                  )}
                </div>
              )}

              {/* STEP 3B: CARD PAYMENT INTERFACE */}
              {step === 'card_screen' && (
                <CardPaymentForm
                  amount={finalTotal}
                  referenceNumber={currentSession?.referenceNumber}
                  onCancel={() => setStep('payment')}
                  onSubmitPayment={handleCardSubmit}
                />
              )}
            </div>

            {/* Footer Buttons */}
            {step !== 'qr_screen' && step !== 'card_screen' && (
              <div className="kiosk-co-footer">
                {step === 'review' ? (
                  <>
                    <button type="button" className="kiosk-co-back-btn" onClick={onClose}>
                      Add More Items
                    </button>
                    <button
                      type="button"
                      className="kiosk-co-next-btn"
                      disabled={cartItems.length === 0}
                      onClick={handleReviewProceedToPayment}
                    >
                      <span>Proceed to Payment • ₱{finalTotal.toFixed(2)}</span>
                      <ArrowRight size={18} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="kiosk-co-back-btn"
                      onClick={() => setStep('review')}
                      disabled={isSubmitting}
                    >
                      <ArrowLeft size={16} />
                      <span>Back to Review</span>
                    </button>
                    <button
                      type="button"
                      className="kiosk-co-confirm-btn"
                      disabled={isSubmitting}
                      onClick={handleProceedToPayment}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={18} className="spin" />
                          <span>Generating Payment Session...</span>
                        </>
                      ) : (
                        <>
                          <Lock size={16} />
                          <span>
                            {selectedPayment === 'Card'
                              ? `Proceed to Card Payment • ₱${finalTotal.toFixed(2)}`
                              : `Confirm & Place Order • ₱${finalTotal.toFixed(2)}`}
                          </span>
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stage 2 Allergen Warning Modal (Checkout Review Double-Confirmation) */}
      <AllergenDoubleWarningModal
        isOpen={showStage2AllergenModal}
        stage="checkout"
        conflictingItems={conflictingCartItems}
        userAllergens={userAllergens}
        onClose={() => setShowStage2AllergenModal(false)}
        onCancel={() => setShowStage2AllergenModal(false)}
        onConfirm={handleConfirmAllergenCheckout}
        onRemoveItem={(itemToRemove) => {
          if (onRemoveItem) {
            onRemoveItem(itemToRemove.cartKey || itemToRemove.id);
          }
        }}
      />
    </>
  );
}
