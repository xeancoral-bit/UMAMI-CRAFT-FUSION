import React from 'react';
import { ShieldAlert, Lock, ArrowLeft, KeyRound } from 'lucide-react';

export default function AccessDeniedView({ onReturn, onRequestLogin }) {
  return (
    <div className="access-denied-container fade-in">
      <div className="access-denied-card">
        <div className="access-denied-icon-wrap">
          <ShieldAlert size={42} color="#DC2626" />
        </div>

        <span className="access-denied-badge">RESTRICTED SECTION</span>

        <h2 className="access-denied-title">Access Denied • Unauthorized User</h2>

        <p className="access-denied-message">
          You do not have administrative privileges to access the <strong>Admin Panel</strong>.
          Customers, kitchen staff, bussers, and unauthorized accounts are restricted from accessing system settings, financial analytics, and user role management.
        </p>

        <div className="access-denied-info-box">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#991B1B', fontWeight: '700', fontSize: '13px', marginBottom: '4px' }}>
            <Lock size={15} />
            <span>Security Log Notice</span>
          </div>
          <p style={{ fontSize: '12px', color: '#7F1D1D', margin: 0 }}>
            If you are an authorized Administrator, please verify your credentials using the Admin Login page.
          </p>
        </div>

        <div className="access-denied-actions">
          <button type="button" className="ad-btn-secondary" onClick={onReturn}>
            <ArrowLeft size={16} />
            <span>Return to Kiosk / App</span>
          </button>
          
          <button type="button" className="ad-btn-primary" onClick={onRequestLogin}>
            <KeyRound size={16} />
            <span>Administrator Login</span>
          </button>
        </div>
      </div>
    </div>
  );
}
