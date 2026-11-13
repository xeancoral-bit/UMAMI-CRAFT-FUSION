import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Plus, Minus, AlertTriangle, Clock, Sparkles, Flame, Check, Utensils
} from 'lucide-react';
import { getConflictingAllergens } from '../utils/allergenUtils';
import AllergenDoubleWarningModal from './AllergenDoubleWarningModal';

const SPICE_LEVELS = [
  { id: 'Regular', label: 'Regular', badge: 'Standard' },
  { id: 'Mild', label: 'Mild', badge: 'Gentle Heat' },
  { id: 'Medium', label: 'Medium Spicy', badge: 'Balanced' },
  { id: 'Extra Spicy', label: 'Extra Spicy', badge: 'Fiery' }
];

const EMPTY_ARRAY = Object.freeze([]);

export default function KioskProductModal({
  item,
  isOpen,
  onClose,
  onAddToCart,
  userAllergens = EMPTY_ARRAY
}) {
  const [selectedSizeIndex, setSelectedSizeIndex] = useState(0);
  const [selectedSpice, setSelectedSpice] = useState('Regular');
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [customNote, setCustomNote] = useState('');
  const [qty, setQty] = useState(1);
  const [showStage1AllergenModal, setShowStage1AllergenModal] = useState(false);

  useEffect(() => {
    if (isOpen && item) {
      setSelectedSizeIndex(0);
      setSelectedSpice(
        (item.tags || []).some(t => String(t).toLowerCase() === 'spicy') ? 'Medium' : 'Regular'
      );
      setSelectedAddons([]);
      setCustomNote('');
      setQty(1);
      setShowStage1AllergenModal(false);
    }
  }, [isOpen, item]);

  // Parse available sizes from DB item
  const parsedSizes = useMemo(() => {
    if (!item) return [];
    if (Array.isArray(item.sizes) && item.sizes.length > 0) {
      return item.sizes.map(s => ({
        name: s.name || 'Standard',
        volume: s.volume || '',
        price: Number(s.price) || Number(item.promoPrice || item.price || 0),
        stock: s.stock !== undefined ? Number(s.stock) : 25
      }));
    }
    const basePrice = Number(item.promoPrice || item.price || 0);
    if (typeof item.sizes === 'string' && item.sizes.includes(',')) {
      return item.sizes.split(',').map((s, idx) => ({
        name: s.trim(),
        volume: '',
        price: basePrice + (idx * 40),
        stock: item.stock ?? 25
      }));
    }
    return [{
      name: (typeof item.sizes === 'string' && item.sizes.trim()) ? item.sizes.trim() : 'Standard Serving',
      volume: '',
      price: basePrice,
      stock: item.stock ?? 25
    }];
  }, [item]);

  // Parse available add-ons from DB item
  const parsedAddons = useMemo(() => {
    if (!item) return [];
    const raw = item.addons;
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map(a => {
        if (typeof a === 'object' && a !== null) {
          return { name: a.name || String(a), price: Number(a.price) || 25 };
        }
        const str = String(a).trim();
        const match = str.match(/^(.*?)\s*\(\+?₱?(\d+(?:\.\d+)?)\)$/);
        if (match) {
          return { name: match[1].trim(), price: Number(match[2]) };
        }
        return { name: str, price: item.catalogType === 'drink' ? 20 : 30 };
      });
    }
    if (typeof raw === 'string' && raw.trim()) {
      return raw.split(',').map(s => s.trim()).filter(Boolean).map(str => {
        const match = str.match(/^(.*?)\s*\(\+?₱?(\d+(?:\.\d+)?)\)$/);
        if (match) {
          return { name: match[1].trim(), price: Number(match[2]) };
        }
        return { name: str, price: item.catalogType === 'drink' ? 20 : 30 };
      });
    }
    // Sensible defaults for food or drinks if none configured
    if (item.catalogType === 'drink') {
      return [
        { name: 'Black Tapioca Pearls', price: 20 },
        { name: 'Cream Cheese Foam', price: 30 },
        { name: 'Nata de Coco', price: 20 }
      ];
    }
    if (item.catalogType === 'food') {
      return [
        { name: 'Soft-Boiled Ajitama Egg', price: 35 },
        { name: 'Roasted Garlic Chili Oil', price: 20 },
        { name: 'Extra Steamed Jasmine Rice', price: 45 }
      ];
    }
    return [];
  }, [item]);

  // Parse structured ingredients list
  const ingredientsRows = useMemo(() => {
    if (!item) return [];
    if (Array.isArray(item.ingredientsList) && item.ingredientsList.length > 0) {
      return item.ingredientsList.map(ing => ({
        name: ing.name || '',
        qty: ing.quantity ? `${ing.quantity}${ing.unit ? ' ' + ing.unit : ''}` : ''
      }));
    }
    if (typeof item.ingredients === 'string' && item.ingredients.trim()) {
      return item.ingredients.split(',').map(part => {
        const trimmed = part.trim();
        const match = trimmed.match(/^(.*?)\s*\(([^)]+)\)$/);
        if (match) {
          return { name: match[1].trim(), qty: match[2].trim() };
        }
        return { name: trimmed, qty: '' };
      }).filter(r => r.name);
    }
    return [];
  }, [item]);

  const matchingUserAllergens = useMemo(() => {
    return getConflictingAllergens(item, userAllergens);
  }, [item, userAllergens]);

  if (!isOpen || !item) return null;

  const activeSize = parsedSizes[selectedSizeIndex] || parsedSizes[0] || { name: 'Standard', price: Number(item.promoPrice || item.price || 0) };
  const addonsTotal = selectedAddons.reduce((sum, a) => sum + (Number(a.price) || 0), 0);
  const unitPrice = (Number(activeSize.price) || 0) + addonsTotal;
  const totalPrice = unitPrice * qty;

  const itemAllergens = Array.isArray(item.allergens) ? item.allergens : [];
  const isFood = item.catalogType === 'food';

  const toggleAddon = (addonObj) => {
    setSelectedAddons(prev => {
      const exists = prev.some(a => a.name === addonObj.name);
      if (exists) return prev.filter(a => a.name !== addonObj.name);
      return [...prev, addonObj];
    });
  };

  const executeAddToCart = () => {
    const combinedNotes = [
      ...(isFood && selectedSpice !== 'Regular' ? [`Spice: ${selectedSpice}`] : []),
      ...(customNote.trim() ? [customNote.trim()] : [])
    ].join(' • ');

    onAddToCart(item, {
      sizeName: activeSize.name,
      volume: activeSize.volume,
      price: unitPrice,
      baseSizePrice: activeSize.price,
      spiceLevel: isFood ? selectedSpice : null,
      addons: selectedAddons,
      specialNote: combinedNotes,
      qty
    });
    setShowStage1AllergenModal(false);
    onClose();
  };

  const handleConfirmAdd = () => {
    if (matchingUserAllergens.length > 0) {
      setShowStage1AllergenModal(true);
      return;
    }
    executeAddToCart();
  };

  return (
    <div
      className="kiosk-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Customize ${item.name}`}
    >
      <div className="kiosk-product-modal" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button
          type="button"
          className="kiosk-modal-close-btn"
          onClick={onClose}
          aria-label="Close product details"
        >
          <X size={20} />
        </button>

        {/* Scrollable Content */}
        <div className="kiosk-product-modal-body">
          {/* Top Hero Image & Summary */}
          <div className="kiosk-pm-hero">
            <div className="kiosk-pm-image-wrap">
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.name}
                  className="kiosk-pm-image"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <div className="kiosk-pm-emoji-fallback">{item.emoji || '🍽️'}</div>
              )}
              <div className="kiosk-pm-image-badges">
                {item.category && (
                  <span className="kiosk-pm-cat-badge">{item.drinkCategory || item.category}</span>
                )}
                {item.prepTime && (
                  <span className="kiosk-pm-prep-badge">
                    <Clock size={12} />
                    {item.prepTime}
                  </span>
                )}
              </div>
            </div>

            <div className="kiosk-pm-header-info">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2 className="kiosk-pm-title">{item.name}</h2>
                {item.promoPrice && (
                  <span style={{ background: '#E11D48', color: '#fff', fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px' }}>
                    PROMO
                  </span>
                )}
              </div>

              <div className="kiosk-pm-price-row">
                {item.promoPrice && item.price > item.promoPrice && (
                  <span className="kiosk-pm-old-price">₱{Number(item.price).toFixed(2)}</span>
                )}
                <span className="kiosk-pm-price">₱{Number(activeSize.price).toFixed(2)}</span>
              </div>

              <p className="kiosk-pm-desc">
                {item.description || 'Crafted fresh to order with authentic Umami Craft Fusion culinary techniques.'}
              </p>

              {/* Tags */}
              {Array.isArray(item.tags) && item.tags.length > 0 && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                  {item.tags.map(tag => (
                    <span key={tag} className="kiosk-pm-tag">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Allergen Safety Warning if matched */}
          {matchingUserAllergens.length > 0 && (
            <div className="kiosk-pm-allergen-alert">
              <AlertTriangle size={18} />
              <div>
                <strong>Dietary Safety Notice:</strong> This item contains{' '}
                <span style={{ textTransform: 'uppercase' }}>{matchingUserAllergens.join(', ')}</span>{' '}
                which is in your excluded allergens list.
              </div>
            </div>
          )}

          {/* Dedicated Verified Ingredients & Allergens Section */}
          <div className="kiosk-pm-section">
            <div className="kiosk-pm-section-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <Utensils size={15} color="#C24522" />
                <h4>Verified Ingredients &amp; Allergen Profile</h4>
              </div>
            </div>

            {ingredientsRows.length > 0 ? (
              <div className="kiosk-pm-ingredients-grid">
                {ingredientsRows.map((ing, idx) => (
                  <div key={idx} className="kiosk-pm-ingredient-chip">
                    <span className="kiosk-pm-ing-name">{ing.name}</span>
                    {ing.qty && <span className="kiosk-pm-ing-qty">{ing.qty}</span>}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#78716C' }}>
                Standard kitchen recipe ingredients apply. Contact server for detailed breakdown.
              </p>
            )}

            <div className="kiosk-pm-allergen-row">
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#57534E' }}>Contains Allergens:</span>
              {!Array.isArray(item.allergens) ? (
                <span className="kiosk-pm-allergen-pill" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#B45309', border: '1px solid rgba(245, 158, 11, 0.35)' }}>
                  Allergen Info Unverified — Ask Server
                </span>
              ) : itemAllergens.length > 0 ? (
                itemAllergens.map(a => (
                  <span
                    key={a}
                    className={`kiosk-pm-allergen-pill ${userAllergens.includes(a) ? 'danger' : ''}`}
                  >
                    {a}
                  </span>
                ))
              ) : (
                <span className="kiosk-pm-allergen-pill safe">No Listed Allergens (Menu Verified)</span>
              )}
            </div>
            <p className="kiosk-pm-admin-disclaimer">
              Ingredient &amp; allergen records are maintained and verified by authorized administrators.
            </p>
          </div>

          {/* Sizes / Variations */}
          {parsedSizes.length > 1 && (
            <div className="kiosk-pm-section">
              <div className="kiosk-pm-section-header">
                <h4>Select Size / Variation</h4>
                <span className="kiosk-pm-required-pill">Required</span>
              </div>
              <div className="kiosk-pm-options-grid">
                {parsedSizes.map((sz, idx) => {
                  const active = selectedSizeIndex === idx;
                  const outOfStock = sz.stock !== undefined && sz.stock <= 0;
                  return (
                    <button
                      key={sz.name}
                      type="button"
                      disabled={outOfStock}
                      onClick={() => setSelectedSizeIndex(idx)}
                      className={`kiosk-pm-option-btn ${active ? 'active' : ''}`}
                    >
                      <div style={{ fontWeight: 800, fontSize: '14px' }}>{sz.name}</div>
                      {sz.volume && <div style={{ fontSize: '11px', opacity: 0.75 }}>{sz.volume}</div>}
                      <div style={{ fontWeight: 800, fontSize: '13px', color: active ? '#C24522' : '#1C1917', marginTop: '4px' }}>
                        {outOfStock ? 'Out of Stock' : `₱${Number(sz.price).toFixed(2)}`}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Spice Level (for Food items) */}
          {isFood && (
            <div className="kiosk-pm-section">
              <div className="kiosk-pm-section-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Flame size={15} color="#C24522" />
                  <h4>Spice Level Preference</h4>
                </div>
                <span style={{ fontSize: '11px', color: '#78716C', fontWeight: 600 }}>Optional</span>
              </div>
              <div className="kiosk-pm-spice-grid">
                {SPICE_LEVELS.map(sp => {
                  const active = selectedSpice === sp.id;
                  return (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={() => setSelectedSpice(sp.id)}
                      className={`kiosk-pm-spice-btn ${active ? 'active' : ''}`}
                    >
                      <span style={{ fontWeight: 800, fontSize: '13px' }}>{sp.label}</span>
                      <span style={{ fontSize: '10px', opacity: 0.75 }}>{sp.badge}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add-ons / Extra Toppings */}
          {parsedAddons.length > 0 && (
            <div className="kiosk-pm-section">
              <div className="kiosk-pm-section-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={15} color="#059669" />
                  <h4>Optional Add-Ons &amp; Toppings</h4>
                </div>
                <span style={{ fontSize: '11px', color: '#78716C', fontWeight: 600 }}>Tap to add</span>
              </div>
              <div className="kiosk-pm-addons-grid">
                {parsedAddons.map(addon => {
                  const checked = selectedAddons.some(a => a.name === addon.name);
                  return (
                    <button
                      key={addon.name}
                      type="button"
                      onClick={() => toggleAddon(addon)}
                      className={`kiosk-pm-addon-btn ${checked ? 'active' : ''}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={`kiosk-pm-check ${checked ? 'checked' : ''}`}>
                          {checked && <Check size={12} />}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: '13px', textAlign: 'left' }}>{addon.name}</span>
                      </div>
                      <span style={{ fontWeight: 800, fontSize: '12px', color: '#059669' }}>
                        +₱{Number(addon.price).toFixed(2)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Special Kitchen Instructions */}
          <div className="kiosk-pm-section">
            <div className="kiosk-pm-section-header">
              <h4>Special Preparation Requests</h4>
              <span style={{ fontSize: '11px', color: '#78716C', fontWeight: 600 }}>Optional</span>
            </div>
            <input
              type="text"
              className="kiosk-pm-note-input"
              placeholder="Add custom kitchen note (e.g., extra crisp, separate broth)..."
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
            />
          </div>
        </div>

        {/* Sticky Kiosk Bottom Action Bar */}
        <div className="kiosk-product-modal-footer">
          <div className="kiosk-pm-qty-stepper">
            <button
              type="button"
              className="kiosk-pm-qty-btn"
              onClick={() => setQty(q => Math.max(1, q - 1))}
              aria-label="Decrease quantity"
            >
              <Minus size={18} />
            </button>
            <span className="kiosk-pm-qty-val">{qty}</span>
            <button
              type="button"
              className="kiosk-pm-qty-btn"
              onClick={() => setQty(q => q + 1)}
              aria-label="Increase quantity"
            >
              <Plus size={18} />
            </button>
          </div>

          <button
            type="button"
            className="kiosk-pm-add-cta"
            disabled={!item.available}
            onClick={handleConfirmAdd}
          >
            <span>{item.available ? 'Add to Order' : 'Currently Unavailable'}</span>
            <span>₱{totalPrice.toFixed(2)}</span>
          </button>
        </div>
      </div>

      {/* Stage 1 Warning Modal (Item Addition Double-Confirmation) */}
      <AllergenDoubleWarningModal
        isOpen={showStage1AllergenModal}
        stage="item_addition"
        item={item}
        conflictingAllergens={matchingUserAllergens}
        userAllergens={userAllergens}
        onClose={() => setShowStage1AllergenModal(false)}
        onCancel={() => setShowStage1AllergenModal(false)}
        onConfirm={executeAddToCart}
      />
    </div>
  );
}
