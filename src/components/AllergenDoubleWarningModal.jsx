import React from 'react';
import {
  AlertTriangle, ShieldAlert, X, ArrowRight, Trash2,
  Info, ShieldCheck
} from 'lucide-react';
import { formatAllergenName } from '../utils/allergenUtils';

const EMPTY_ARRAY = Object.freeze([]);

/**
 * AllergenDoubleWarningModal
 * Handles the two-stage (double confirmation) allergen warning requirement:
 * Stage 1: Item Addition Warning (when adding a dish containing declared allergens to cart/tray)
 * Stage 2: Checkout Warning (when proceeding to payment with conflicting items in cart/tray)
 */
export default function AllergenDoubleWarningModal({
  isOpen,
  stage = 'item_addition', // 'item_addition' (1 of 2) | 'checkout' (2 of 2)
  onClose,
  onConfirm,
  onCancel,
  item = null, // for item_addition stage
  conflictingAllergens = EMPTY_ARRAY, // for item_addition stage
  conflictingItems = EMPTY_ARRAY, // for checkout stage: [{ item, conflicts: [...] }]
  userAllergens = EMPTY_ARRAY,
  onRemoveItem = null // optional quick removal callback for checkout stage
}) {
  if (!isOpen) return null;

  const isStage1 = stage === 'item_addition';

  return (
    <div
      className="kiosk-modal-backdrop allergen-warning-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="allergen-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div
        className="allergen-warning-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: isStage1 ? '480px' : '540px',
          maxHeight: '90vh',
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(220, 38, 38, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'allergenPopIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}
      >
        {/* Header Ribbon */}
        <div
          style={{
            background: isStage1
              ? 'linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)'
              : 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)',
            borderBottom: '1.5px solid #FECDD3',
            padding: '20px 24px 16px',
            position: 'relative'
          }}
        >
          <button
            type="button"
            onClick={onCancel || onClose}
            aria-label="Close dialog"
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              color: '#4B5563',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <X size={18} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '999px',
                backgroundColor: '#DC2626',
                color: '#FFFFFF',
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.04em',
                textTransform: 'uppercase'
              }}
            >
              <AlertTriangle size={13} strokeWidth={2.5} />
              {isStage1 ? 'Warning 1 of 2 • Item Addition' : 'Warning 2 of 2 • Final Order Review'}
            </span>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#991B1B'
              }}
            >
              Health Safety Alert
            </span>
          </div>

          <h2
            id="allergen-modal-title"
            style={{
              margin: '4px 0 6px',
              fontSize: isStage1 ? '1.25rem' : '1.35rem',
              fontWeight: 800,
              color: '#1C1917',
              lineHeight: 1.25
            }}
          >
            {isStage1
              ? 'Allergen Conflict Detected'
              : 'Declared Allergens in Your Order'}
          </h2>

          <p
            style={{
              margin: 0,
              fontSize: '13px',
              color: '#57534E',
              lineHeight: 1.45
            }}
          >
            {isStage1
              ? 'This item contains ingredients matching your declared allergy profile. Please confirm before adding.'
              : 'Your order contains items with ingredients matching your declared allergies. Review before payment.'}
          </p>
        </div>

        {/* Modal Body / Scrollable Content */}
        <div
          style={{
            padding: '20px 24px',
            overflowY: 'auto',
            maxHeight: 'calc(90vh - 230px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          {/* User's Declared Allergens Callout */}
          {userAllergens.length > 0 && (
            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '14px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <ShieldAlert size={18} color="#C24522" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Your Declared Allergies
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                  {userAllergens.map(ua => (
                    <span
                      key={ua}
                      style={{
                        backgroundColor: '#FEF2F2',
                        color: '#DC2626',
                        border: '1px solid #FECDD3',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '6px'
                      }}
                    >
                      {formatAllergenName(ua)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STAGE 1: Single Item Details */}
          {isStage1 && item && (
            <div
              style={{
                backgroundColor: '#FFF5F5',
                border: '1.5px solid #FCA5A5',
                borderRadius: '16px',
                padding: '14px',
                display: 'flex',
                gap: '14px',
                alignItems: 'center'
              }}
            >
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.name}
                  style={{
                    width: '68px',
                    height: '68px',
                    borderRadius: '12px',
                    objectFit: 'cover',
                    flexShrink: 0
                  }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div
                  style={{
                    width: '68px',
                    height: '68px',
                    borderRadius: '12px',
                    backgroundColor: '#FEE2E2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px',
                    flexShrink: 0
                  }}
                >
                  {item.emoji || '🍽️'}
                </div>
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#1C1917', lineHeight: 1.2 }}>
                  {item.name}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#C24522', marginTop: '3px' }}>
                  ₱{Number(item.price || 0).toFixed(2)}
                </div>

                <div style={{ marginTop: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#991B1B', marginBottom: '4px' }}>
                    CONFLICTING ALLERGENS DETECTED:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {conflictingAllergens.map(ca => (
                      <span
                        key={ca}
                        style={{
                          backgroundColor: '#DC2626',
                          color: '#FFFFFF',
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '3px 9px',
                          borderRadius: '6px',
                          boxShadow: '0 1px 2px rgba(220, 38, 38, 0.25)',
                          textTransform: 'uppercase'
                        }}
                      >
                        ⚠️ {formatAllergenName(ca)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 2: Multiple Conflicting Items List */}
          {!isStage1 && conflictingItems.length > 0 && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#991B1B', textTransform: 'uppercase', marginBottom: '8px' }}>
                Unsafe Dishes in Your Order ({conflictingItems.length})
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {conflictingItems.map(({ item: cItem, conflicts }, idx) => (
                  <div
                    key={cItem.cartKey || cItem.id || idx}
                    style={{
                      backgroundColor: '#FFF5F5',
                      border: '1.5px solid #FCA5A5',
                      borderRadius: '14px',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: '#1C1917' }}>
                          {cItem.name}
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>
                          Qty: {cItem.quantity || 1}
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                        {conflicts.map(conf => (
                          <span
                            key={conf}
                            style={{
                              backgroundColor: '#DC2626',
                              color: '#FFFFFF',
                              fontSize: '10px',
                              fontWeight: 800,
                              padding: '2px 7px',
                              borderRadius: '4px',
                              textTransform: 'uppercase'
                            }}
                          >
                            ⚠️ {formatAllergenName(conf)}
                          </span>
                        ))}
                      </div>
                    </div>

                    {onRemoveItem && (
                      <button
                        type="button"
                        onClick={() => onRemoveItem(cItem)}
                        title="Remove this unsafe item from order"
                        style={{
                          backgroundColor: '#FEE2E2',
                          color: '#DC2626',
                          border: '1px solid #FECDD3',
                          padding: '8px 12px',
                          borderRadius: '10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          flexShrink: 0,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <Trash2 size={13} />
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Kitchen Safety & Cross-Contact Disclosure */}
          <div
            style={{
              backgroundColor: '#FEF3C7',
              border: '1px solid #FDE68A',
              borderRadius: '12px',
              padding: '12px 14px',
              display: 'flex',
              gap: '10px'
            }}
          >
            <Info size={18} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '12px', color: '#92400E', lineHeight: 1.45 }}>
              <strong>Restaurant Cross-Contact Advisory:</strong> Dishes are prepared in an active kitchen with shared surfaces, woks, and fryers.
              {isStage1
                ? ' If you have a severe food allergy, we recommend choosing an allergen-free alternative or asking the restaurant staff for an allergy-safe prep.'
                : ' By proceeding to payment with these items, you acknowledge that they contain ingredients matching your declared allergies.'}
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div
          style={{
            padding: '16px 24px 20px',
            backgroundColor: '#FAFAF9',
            borderTop: '1px solid #E7E5E4',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          {/* Primary Action: Cancel / Safe Choice */}
          <button
            type="button"
            onClick={onCancel || onClose}
            style={{
              width: '100%',
              padding: '13px 18px',
              borderRadius: '14px',
              border: 'none',
              backgroundColor: '#059669',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 2px 4px rgba(5, 150, 105, 0.25)',
              transition: 'background-color 0.15s ease'
            }}
          >
            <ShieldCheck size={18} />
            <span>
              {isStage1
                ? 'Cancel & Choose Safe Alternative'
                : 'Review & Remove Unsafe Items'}
            </span>
          </button>

          {/* Secondary Action: Explicit Acknowledgment & Proceed */}
          <button
            type="button"
            onClick={onConfirm}
            style={{
              width: '100%',
              padding: '12px 18px',
              borderRadius: '14px',
              border: '1.5px solid #FCA5A5',
              backgroundColor: '#FFF1F2',
              color: '#B91C1C',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.15s ease'
            }}
          >
            <span>
              {isStage1
                ? 'I Acknowledge Allergen Risk & Add to Order'
                : 'I Confirm Allergen Risk & Proceed to Payment'}
            </span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

