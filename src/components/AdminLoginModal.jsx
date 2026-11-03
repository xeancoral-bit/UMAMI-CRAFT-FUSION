import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, AlertTriangle, X, KeyRound } from 'lucide-react';

export default function AdminLoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please provide both administrator email and password.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Access Denied: Invalid administrator credentials.');
      }

      setLoading(false);
      onLoginSuccess(data.user || {
        email: email.trim(),
        name: 'Chief Administrator',
        role: 'Super Admin'
      });
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Access Denied: Invalid administrator credentials.');
    }
  };

  const handleDemoFill = () => {
    setEmail('admin@umamicraft.com');
    setPassword('admin123');
    setError('');
  };

  return (
    <div className="staff-pin-backdrop" onClick={onClose}>
      <div className="staff-pin-modal admin-login-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="staff-pin-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <div className="staff-pin-header" style={{ marginBottom: '20px' }}>
          <div className="staff-pin-icon-wrap" style={{ background: 'rgba(228, 87, 41, 0.12)', border: '1px solid rgba(228, 87, 41, 0.3)' }}>
            <ShieldCheck size={28} color="#C24522" />
          </div>
          <h3 className="staff-pin-title" style={{ fontSize: '20px' }}>Admin Panel Authentication</h3>
          <p className="staff-pin-subtitle">
            Secure Administrator Access. Only authorized personnel may proceed.
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
            <label className="admin-input-label">Admin Email</label>
            <div className="admin-input-wrap">
              <Mail size={16} className="admin-input-icon" />
              <input
                type="email"
                className="admin-input-field"
                placeholder="admin@umamicraft.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                required
              />
            </div>
          </div>

          <div className="admin-input-group">
            <label className="admin-input-label">Security Password</label>
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

          <div className="admin-demo-box" onClick={handleDemoFill} title="Click to auto-fill admin credentials">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <KeyRound size={14} color="#C24522" />
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#C24522' }}>Admin Login:</span>
            </div>
            <span style={{ fontSize: '11px', color: '#666', fontFamily: 'monospace' }}>admin@umamicraft.com / admin123</span>
          </div>

          <div className="staff-pin-actions" style={{ marginTop: '22px' }}>
            <button type="button" className="staff-pin-cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="staff-pin-submit-btn" disabled={loading}>
              <ShieldCheck size={16} />
              <span>{loading ? 'Verifying...' : 'Authenticate & Open'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
