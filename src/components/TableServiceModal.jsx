import React, { useState, useEffect } from 'react';
import { Bell, Droplets, UtensilsCrossed, UserCheck, X, Check, Clock, AlertCircle } from 'lucide-react';

const SERVICE_CATEGORIES = [
  {
    id: 'Water Refill',
    label: 'Water Refill',
    icon: Droplets,
    color: '#0284c7',
    bg: 'rgba(2, 132, 199, 0.1)',
    border: 'rgba(2, 132, 199, 0.3)',
    desc: 'Ice water or warm water refill for the table'
  },
  {
    id: 'Extra Utensils / Napkins',
    label: 'Extra Utensils / Napkins',
    icon: UtensilsCrossed,
    color: '#d97706',
    bg: 'rgba(217, 119, 6, 0.1)',
    border: 'rgba(217, 119, 6, 0.3)',
    desc: 'Extra bowls, chopsticks, spoons, or napkins'
  },
  {
    id: 'Staff Assistance',
    label: 'Staff Assistance',
    icon: UserCheck,
    color: '#059669',
    bg: 'rgba(5, 150, 105, 0.1)',
    border: 'rgba(5, 150, 105, 0.3)',
    desc: 'Speak with our dining floor team'
  }
];

export default function TableServiceModal({
  isOpen,
  onClose,
  socket,
  tableNumber,
  customerName,
  kioskId,
  sessionId,
  apiBase = ''
}) {
  const [selectedCategory, setSelectedCategory] = useState('Water Refill');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeRequest, setActiveRequest] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  const effectiveTable = tableNumber || (kioskId && kioskId.startsWith('K-') ? kioskId : (kioskId ? `Table ${kioskId}` : 'Table 1'));

  // Fetch active request on mount or open
  useEffect(() => {
    if (!isOpen) return;

    fetch(`${apiBase || ''}/api/service-requests`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const found = data.find(r => 
            String(r.tableNumber).toLowerCase() === String(effectiveTable).toLowerCase() && 
            r.status !== 'Completed'
          );
          if (found) {
            setActiveRequest(found);
            setSelectedCategory(found.category);
          }
        }
      })
      .catch(() => {});
  }, [isOpen, effectiveTable]);

  // Listen to socket updates for this table's requests
  useEffect(() => {
    if (!socket) return;

    const handleUpdated = (req) => {
      if (String(req.tableNumber).toLowerCase() === String(effectiveTable).toLowerCase()) {
        setActiveRequest(req);
        if (req.status === 'Completed') {
          setStatusMessage('Your request has been attended by staff! Thank you.');
          setTimeout(() => {
            setActiveRequest(null);
            setStatusMessage(null);
          }, 3500);
        } else if (req.status === 'Acknowledged') {
          setStatusMessage(`Staff acknowledged your request: on the way to ${effectiveTable}!`);
        }
      }
    };

    socket.on('service-request-updated', handleUpdated);
    return () => {
      socket.off('service-request-updated', handleUpdated);
    };
  }, [socket, effectiveTable]);

  if (!isOpen) return null;

  const handleSubmitRequest = async () => {
    setIsSubmitting(true);
    const payload = {
      tableNumber: effectiveTable,
      customer: customerName || `Guest (${effectiveTable})`,
      category: selectedCategory,
      notes: notes.trim(),
      kioskId,
      sessionId
    };

    try {
      // 1. Emit via socket
      if (socket && socket.connected) {
        socket.emit('request-table-service', payload);
      }

      // 2. Also ensure REST fallback
      const res = await fetch(`${apiBase || ''}/api/service-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data && data.request) {
        setActiveRequest(data.request);
        setStatusMessage(data.isDuplicate ? 'Staff is already notified of this request!' : 'Service assistance request sent to staff!');
      }
    } catch (err) {
      console.error('Failed to submit service request:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.72)',
      backdropFilter: 'blur(5px)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '18px',
        maxWidth: '460px',
        width: '100%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        overflow: 'hidden',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        animation: 'fadeIn 0.2s ease-out'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '18px 20px',
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: '#f59e0b',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Bell size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, letterSpacing: '-0.2px' }}>
                Table Service &amp; Assistance
              </h3>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                {effectiveTable} • Umami Craft Fusion
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div style={{ padding: '20px' }}>
          {/* Active Request Live Banner */}
          {activeRequest && activeRequest.status !== 'Completed' ? (
            <div style={{
              background: activeRequest.status === 'Acknowledged' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(245, 158, 11, 0.1)',
              border: `1.5px solid ${activeRequest.status === 'Acknowledged' ? '#3b82f6' : '#f59e0b'}`,
              borderRadius: '12px',
              padding: '14px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={16} color={activeRequest.status === 'Acknowledged' ? '#3b82f6' : '#f59e0b'} />
                  <span style={{
                    fontWeight: 800,
                    fontSize: '13px',
                    color: activeRequest.status === 'Acknowledged' ? '#1d4ed8' : '#b45309'
                  }}>
                    {activeRequest.status === 'Acknowledged' ? 'Staff On The Way' : 'Request Pending'}
                  </span>
                </div>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  background: activeRequest.status === 'Acknowledged' ? '#3b82f6' : '#f59e0b',
                  color: '#ffffff',
                  padding: '2px 8px',
                  borderRadius: '12px'
                }}>
                  {activeRequest.category}
                </span>
              </div>

              <p style={{ margin: '8px 0 0 0', fontSize: '12.5px', color: '#374151', lineHeight: '1.4' }}>
                {activeRequest.status === 'Acknowledged' 
                  ? `Floor staff has acknowledged your request for ${effectiveTable} and is heading over.`
                  : `Your request has been transmitted to the Administrator & Service Team.`}
              </p>

              {activeRequest.notes && (
                <div style={{ fontSize: '11.5px', color: '#6b7280', marginTop: '6px', fontStyle: 'italic' }}>
                  Note: "{activeRequest.notes}"
                </div>
              )}
            </div>
          ) : null}

          {/* Service Category Buttons */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '8px' }}>
              Select Service Request:
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {SERVICE_CATEGORIES.map(cat => {
                const isSelected = selectedCategory === cat.id;
                const IconComponent = cat.icon;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: isSelected ? `2px solid ${cat.color}` : '1.5px solid #e2e8f0',
                      background: isSelected ? cat.bg : '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: isSelected ? cat.color : '#f1f5f9',
                      color: isSelected ? '#ffffff' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <IconComponent size={18} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '13.5px',
                        fontWeight: 700,
                        color: isSelected ? '#0f172a' : '#334155'
                      }}>
                        {cat.label}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '1px' }}>
                        {cat.desc}
                      </div>
                    </div>

                    {isSelected && (
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: cat.color,
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Notes */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '6px' }}>
              Special Request or Details (Optional):
            </label>
            <input
              type="text"
              placeholder="e.g., Warm water, extra napkins, chopsticks..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={120}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Feedback status notice */}
          {statusMessage && (
            <div style={{
              padding: '8px 12px',
              borderRadius: '8px',
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#065f46',
              fontSize: '12px',
              fontWeight: 600,
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Check size={14} />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '11px 16px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Close
            </button>

            <button
              type="button"
              onClick={handleSubmitRequest}
              disabled={isSubmitting || (activeRequest && activeRequest.status !== 'Completed' && activeRequest.category === selectedCategory)}
              style={{
                flex: 2,
                padding: '11px 18px',
                borderRadius: '10px',
                border: 'none',
                background: (activeRequest && activeRequest.status !== 'Completed' && activeRequest.category === selectedCategory) 
                  ? '#94a3b8' 
                  : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#ffffff',
                fontSize: '13.5px',
                fontWeight: 700,
                cursor: (activeRequest && activeRequest.status !== 'Completed' && activeRequest.category === selectedCategory) ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(217, 119, 6, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Bell size={15} />
              <span>
                {isSubmitting ? 'Sending...' : (
                  (activeRequest && activeRequest.status !== 'Completed' && activeRequest.category === selectedCategory) 
                    ? 'Staff Already Notified' 
                    : 'Call Server Now'
                )}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

