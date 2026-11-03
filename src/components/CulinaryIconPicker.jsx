import React, { useState, useMemo } from 'react';
import { Search, X, Check, Sparkles, BookOpen, Utensils } from 'lucide-react';
import { CULINARY_CATEGORIES, CULINARY_ICONS, filterCulinaryIcons } from '../utils/culinaryIconLibrary';

export default function CulinaryIconPicker({
  selectedEmoji,
  onSelect,
  defaultCategory = 'all',
  title = 'Culinary Icon & Emoji Library',
  subtitle = 'Choose a realistic, formal culinary symbol for menu cataloging & safety.'
}) {
  const [activeCategory, setActiveCategory] = useState(defaultCategory);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredIcons = useMemo(() => {
    return filterCulinaryIcons(searchQuery, activeCategory);
  }, [searchQuery, activeCategory]);

  const activeItem = useMemo(() => {
    return CULINARY_ICONS.find(i => i.emoji === selectedEmoji) || filteredIcons[0] || null;
  }, [selectedEmoji, filteredIcons]);

  return (
    <div className="culinary-picker-container" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Header Info */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Utensils size={16} color="#C24522" />
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1F2937' }}>{title}</h4>
          </div>
          {subtitle && (
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#6B7280' }}>{subtitle}</p>
          )}
        </div>
        <span style={{ fontSize: '11px', background: '#F3F4F6', color: '#4B5563', padding: '3px 8px', borderRadius: '9999px', fontWeight: 600 }}>
          {filteredIcons.length} available
        </span>
      </div>

      {/* Search Bar */}
      <div style={{ position: 'relative' }}>
        <Search size={15} color="#9CA3AF" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by ingredient, allergen, flavor, dish..."
          style={{
            width: '100%',
            padding: '9px 36px 9px 36px',
            borderRadius: '10px',
            border: '1.5px solid #E5E7EB',
            fontSize: '13px',
            background: '#FFFFFF',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.15s ease'
          }}
          onFocus={(e) => { e.target.style.borderColor = '#C24522'; }}
          onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; }}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#9CA3AF',
              padding: '2px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Category Pills */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'thin' }}>
        {CULINARY_CATEGORIES.map(cat => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              style={{
                padding: '5px 12px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: isActive ? 700 : 500,
                border: isActive ? '1.5px solid #C24522' : '1px solid #E5E7EB',
                background: isActive ? '#FDF3EB' : '#FFFFFF',
                color: isActive ? '#C24522' : '#4B5563',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.12s ease'
              }}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Grid of Icons */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))',
          gap: '8px',
          maxHeight: '190px',
          overflowY: 'auto',
          padding: '8px',
          background: '#F9FAFB',
          borderRadius: '12px',
          border: '1px solid #E5E7EB'
        }}
      >
        {filteredIcons.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: '24px', textAlign: 'center', color: '#6B7280', fontSize: '13px' }}>
            No culinary icons matching "{searchQuery}"
          </div>
        ) : (
          filteredIcons.map(item => {
            const isSelected = selectedEmoji === item.emoji;
            return (
              <button
                key={item.emoji}
                type="button"
                onClick={() => onSelect(item.emoji, item)}
                title={`${item.name} • ${item.description}`}
                style={{
                  height: '44px',
                  borderRadius: '10px',
                  border: isSelected ? '2px solid #C24522' : '1px solid #E5E7EB',
                  background: isSelected ? '#FDF3EB' : '#FFFFFF',
                  fontSize: '22px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.1s ease',
                  boxShadow: isSelected ? '0 2px 6px rgba(194, 69, 34, 0.2)' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = '#C24522';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = '#E5E7EB';
                    e.currentTarget.style.transform = 'scale(1)';
                  }
                }}
              >
                {item.emoji}
              </button>
            );
          })
        )}
      </div>

      {/* Active Selection Details Preview */}
      {activeItem && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 14px',
            background: '#FDF3EB',
            borderRadius: '12px',
            border: '1px solid #F6D6C6'
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              background: '#FFFFFF',
              border: '1.5px solid #F5C4A1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '26px',
              flexShrink: 0
            }}
          >
            {activeItem.emoji}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#2A1A0F' }}>
                {activeItem.name}
              </span>
              <span style={{ fontSize: '10px', textTransform: 'uppercase', background: 'rgba(194, 69, 34, 0.12)', color: '#C24522', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                {activeItem.category.replace('_', ' ')}
              </span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeItem.description}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
