import React, { useState } from 'react';
import {
  X, Plus, Minus, Trash2, Tag, CheckCircle2, CreditCard, Smartphone, Banknote,
  Utensils, ShoppingBag, ArrowRight, ArrowLeft, ShieldCheck, Lock, Loader2, Sparkles
} from 'lucide-react';
import { SUPPORTED_EWALLETS, EWalletLogo } from '../utils/paymentWallets';

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
    badge: 'Instant QR',
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

export default function KioskCheckoutModal({
  isOpen,
  onClose,
  cartItems = [],
  diningOption,
  onChangeDiningOption,
  onUpdateQuantity,
  onRemoveItem,
  promos = [],
  promoCode,
  setPromoCode,
  promoApplied,
  setPromoApplied,
  promoMsg,
  setPromoMsg,
  onConfirmOrder
}) {
  const [step, setStep] = useState('review'); // 'review' | 'payment'
  const [selectedPayment, setSelectedPayment] = useState('E-Wallet');
  const [selectedEWallet, setSelectedEWallet] = useState('GCash');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const subtotal = cartItems.reduce((sum, ci) => sum + ((Number(ci.price) || 0) * (ci.quantity || 1)), 0);

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
        return isEligible ? sum + ((Number(ci.price) || 0) * (ci.quantity || 1)) : sum;
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
      setPromoMsg({ text: 'Please enter a promo code.', ok: false });
      return;
    }
    const match = (promos || []).find(p => (p.code || '').toUpperCase() === code);
    if (!match) {
      setPromoMsg({ text: 'Invalid promo code.', ok: false });
      setPromoApplied(null);
      return;
    }
    if (match.status !== 'active') {
      setPromoMsg({ text: 'This promo is no longer active.', ok: false });
      setPromoApplied(null);
      return;
    }
    if (match.dateRange) {
      const now = Date.now();
      if (match.dateRange.start && new Date(match.dateRange.start).getTime() > now) {
        setPromoMsg({ text: 'This promo has not started yet.', ok: false });
        setPromoApplied(null);
        return;
      }
      if (match.dateRange.end && new Date(match.dateRange.end).getTime() < now) {
        setPromoMsg({ text: 'This promo has expired.', ok: false });
        setPromoApplied(null);
        return;
      }
    }
    setPromoApplied(match);
    setPromoMsg({ text: `Promo "${match.code}" applied!`, ok: true });
  };

  const handlePlaceFinalOrder = async () => {
    if (cartItems.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const effectivePayment = selectedPayment === 'E-Wallet' ? selectedEWallet : selectedPayment;
      await onConfirmOrder({
        diningOption,
        paymentMethod: effectivePayment,
        paymentCategory: selectedPayment,
        selectedEWallet: selectedPayment === 'E-Wallet' ? selectedEWallet : null,
        subtotal,
        discountAmount,
        taxAmount: vatAmount,
        finalTotal
      });
      setStep('review');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="kiosk-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Kiosk Checkout">
      <div className="kiosk-checkout-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="kiosk-co-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="kiosk-co-step-pill">
                Step {step === 'review' ? '1 of 2' : '2 of 2'}
              </span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#78716C' }}>
                {diningOption === 'Takeout' ? 'Takeout Order' : 'Dine-In Order'}
              </span>
            </div>
            <h2 style={{ margin: '4px 0 0', fontSize: '20px', fontWeight: 900, color: '#1C1917' }}>
              {step === 'review' ? 'Review Your Order' : 'Select Payment Method'}
            </h2>
          </div>

          <button type="button" className="kiosk-modal-close-btn" onClick={onClose} aria-label="Close checkout">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="kiosk-co-body">
          {step === 'review' ? (
            <>
              {/* Dining Option Switcher */}
              <div className="kiosk-co-dining-bar">
                <button
                  type="button"
                  onClick={() => onChangeDiningOption('Dine-In')}
                  className={`kiosk-co-dining-btn ${diningOption === 'Dine-In' ? 'active' : ''}`}
                >
                  <Utensils size={16} />
                  <span>Dine-In (Eat Here)</span>
                </button>
                <button
                  type="button"
                  onClick={() => onChangeDiningOption('Takeout')}
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
                  {cartItems.map(item => (
                    <div key={item.id} className="kiosk-co-item-row">
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
                        <div style={{ fontWeight: 800, fontSize: '13px', color: '#C24522', marginTop: '4px' }}>
                          ₱{((Number(item.price) || 0) * (item.quantity || 1)).toFixed(2)}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="kiosk-co-qty-stepper">
                          <button type="button" onClick={() => onUpdateQuantity(item.id, -1)} aria-label="Decrease">
                            <Minus size={14} />
                          </button>
                          <span>{item.quantity || 1}</span>
                          <button type="button" onClick={() => onUpdateQuantity(item.id, 1)} aria-label="Increase">
                            <Plus size={14} />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.id)}
                          className="kiosk-co-remove-btn"
                          title="Remove item"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Promo Code Box */}
              <div className="kiosk-co-promo-box">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '12px', fontWeight: 800, color: '#57534E' }}>
                  <Tag size={14} color="#C24522" />
                  <span>PROMO CODE / VOUCHER</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Enter promo code (e.g. UMAMI20)"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    className="kiosk-co-promo-input"
                  />
                  <button type="button" onClick={handleApplyPromo} className="kiosk-co-promo-btn">
                    Apply
                  </button>
                  {promoApplied && (
                    <button
                      type="button"
                      onClick={() => { setPromoApplied(null); setPromoCode(''); setPromoMsg({ text: '', ok: false }); }}
                      className="kiosk-co-promo-clear"
                    >
                      Clear
                    </button>
                  )}
                </div>
                {promoMsg?.text && (
                  <div style={{ marginTop: '6px', fontSize: '12px', fontWeight: 700, color: promoMsg.ok ? '#059669' : '#DC2626' }}>
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
          ) : (
            /* Step 2: Payment Method Selection */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="kiosk-co-payment-amount-banner">
                <span>Amount to Pay</span>
                <strong>₱{finalTotal.toFixed(2)}</strong>
              </div>

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

              {/* Sub-Selection for E-Wallet (Visible only when E-Wallet is chosen) */}
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
                      Choose Your E-Wallet Provider
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#047857', background: '#DCFCE7', border: '1px solid #86EFAC', padding: '2px 8px', borderRadius: '6px' }}>
                      {selectedEWallet} Active
                    </span>
                  </div>

                  {/* Multiple Supported E-Wallets Grid */}
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

                  {/* Active Wallet Details Banner */}
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

              <div className="kiosk-co-webhook-note">
                <ShieldCheck size={18} color="#059669" />
                <div>
                  <strong>Automated Payment Verification:</strong>{' '}
                  {selectedPayment === 'Cash'
                    ? 'Your order will be queued for counter payment. Present your Order Number to the cashier.'
                    : 'Digital payments are verified automatically in real time via HMAC-SHA256 gateway webhooks — no manual approval wait.'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
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
                onClick={() => setStep('payment')}
              >
                <span>Proceed to Payment • ₱{finalTotal.toFixed(2)}</span>
                <ArrowRight size={18} />
              </button>
            </>
          ) : (
            <>
              <button type="button" className="kiosk-co-back-btn" onClick={() => setStep('review')} disabled={isSubmitting}>
                <ArrowLeft size={16} />
                <span>Back to Review</span>
              </button>
              <button
                type="button"
                className="kiosk-co-confirm-btn"
                disabled={isSubmitting}
                onClick={handlePlaceFinalOrder}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="spin" />
                    <span>Processing Order...</span>
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    <span>Confirm &amp; Place Order • ₱{finalTotal.toFixed(2)}</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
