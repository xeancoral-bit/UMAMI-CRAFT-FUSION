import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, AlertTriangle, X, KeyRound } from 'lucide-react';
import { authenticateRoleBasedAccount } from '../utils/systemStore';

export default function AdminLoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const performLogin = async (loginIdentifier, loginPassword) => {
    setError('');
    if (!loginIdentifier.trim() || !loginPassword.trim()) {
      setError('Please provide both account username/email and password.');
      return;
    }

    setLoading(true);
    try {
      const user = await authenticateRoleBasedAccount(loginIdentifier, loginPassword);
      setLoading(false);
      onLoginSuccess(user);
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Access Denied: Invalid account credentials.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await performLogin(email, password);
  };

  const handleDemoFill = () => {
    setEmail('admin@umamicraft.com');
    setPassword('admin123');
    setError('');
  };

  const handleCashierFill = () => {
    setEmail('cashier.maria@umamicraft.com');
    setPassword('cashier123');
    setError('');
  };

  const handleStaffFill = () => {
    setEmail('kitchen@umamicraft.com');
    setPassword('staff123');
    setError('');
  };

  return (
    <div className="staff-pin-backdrop" onClick={onClose}>
      <div className="staff-pin-modal admin-login-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '470px' }}>
        <button type="button" className="staff-pin-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <div className="staff-pin-header" style={{ marginBottom: '20px' }}>
          <div className="staff-pin-icon-wrap" style={{ background: 'rgba(228, 87, 41, 0.12)', border: '1px solid rgba(228, 87, 41, 0.3)' }}>
            <ShieldCheck size={28} color="#C24522" />
          </div>
          <h3 className="staff-pin-title" style={{ fontSize: '20px' }}>Role-Based Account Login</h3>
          <p className="staff-pin-subtitle">
            Dedicated Portals for Administrator, Cashier &amp; Staff Accounts.
          </p>
        </div>

        {error && (
          <div className="admin-login-error">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="admin-input-group">
            <label className="admin-input-label">Username, Email, or Employee ID</label>
            <div className="admin-input-wrap">
              <Mail size={16} className="admin-input-icon" />
              <input
                type="text"
                className="admin-input-field"
                placeholder="admin, cashier.maria, or kitchen@umamicraft.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                required
              />
            </div>
          </div>

          <div className="admin-input-group">
            <label className="admin-input-label">Account Password</label>
            <div className="admin-input-wrap">
              <Lock size={16} className="admin-input-icon" />
              <input
                type="password"
                className="admin-input-field"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                required
              />
            </div>
          </div>

          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#8A817C', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
              Quick Demo Credentials (Click to Fill):
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              <div
                className="admin-demo-box"
                onClick={handleDemoFill}
                style={{ margin: 0, cursor: 'pointer', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '3px' }}
                title="Click to auto-fill Administrator credentials"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <KeyRound size={12} color="#C24522" />
                  <span style={{ fontSize: '11px', fontWeight: '800', color: '#C24522' }}>Admin Panel</span>
                </div>
                <span style={{ fontSize: '10px', color: '#555', fontFamily: 'monospace' }}>admin / admin123</span>
              </div>

              <div
                className="admin-demo-box"
                onClick={handleCashierFill}
                style={{ margin: 0, cursor: 'pointer', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '3px', background: 'rgba(5, 150, 105, 0.08)', borderColor: 'rgba(5, 150, 105, 0.25)' }}
                title="Click to auto-fill Cashier POS & Daily Report credentials"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <KeyRound size={12} color="#059669" />
                  <span style={{ fontSize: '11px', fontWeight: '800', color: '#059669' }}>Cashier POS</span>
                </div>
                <span style={{ fontSize: '10px', color: '#059669', fontFamily: 'monospace' }}>cashier.maria</span>
              </div>

              <div
                className="admin-demo-box"
                onClick={handleStaffFill}
                style={{ margin: 0, cursor: 'pointer', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '3px', background: 'rgba(37, 99, 235, 0.08)', borderColor: 'rgba(37, 99, 235, 0.25)' }}
                title="Click to auto-fill Staff Operations & Daily Report credentials"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <KeyRound size={12} color="#2563EB" />
                  <span style={{ fontSize: '11px', fontWeight: '800', color: '#2563EB' }}>Staff Portal</span>
                </div>
                <span style={{ fontSize: '10px', color: '#2563EB', fontFamily: 'monospace' }}>staff.kenji</span>
              </div>
            </div>
          </div>

          <div className="staff-pin-actions" style={{ marginTop: '22px' }}>
            <button type="button" className="staff-pin-cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="staff-pin-submit-btn" disabled={loading}>
              <ShieldCheck size={16} />
              <span>{loading ? 'Verifying...' : 'Sign In to Portal'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
