import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CreditCard, ShieldCheck, CheckCircle2, XCircle, Clock, AlertTriangle,
  RefreshCw, Copy, Check, Terminal, Send, ArrowRight, Zap, Lock,
  FileText, Activity, Users, Award, Sparkles, ExternalLink
} from 'lucide-react';

const EMPTY_ARRAY = Object.freeze([]);

export default function PaymentWebhookManager({
  socket,
  orders = EMPTY_ARRAY,
  currentAdminName = 'Chief Administrator'
}) {
  const [activeTab, setActiveTab] = useState('feed'); // 'feed' | 'simulator' | 'memberships' | 'config'
  const [webhookLogs, setWebhookLogs] = useState([]);
  const [customerAccounts, setCustomerAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  // Simulation Form State
  const [simGateway, setSimGateway] = useState('gcash'); // 'gcash' | 'maya' | 'paymongo' | 'card'
  const [simStatus, setSimStatus] = useState('successful'); // 'successful' | 'pending' | 'failed' | 'invalid_sig' | 'amount_mismatch'
  const [simOrderId, setSimOrderId] = useState('');
  const [simAmount, setSimAmount] = useState('');
  const [simCustomerName, setSimCustomerName] = useState('Juan Dela Cruz');
  const [simPlan, setSimPlan] = useState('Umami VIP Gourmet Club');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchWebhookData = useCallback(async () => {
    setLoading(true);
    try {
      const [logsRes, custRes] = await Promise.all([
        fetch('/api/webhooks/logs').catch(() => null),
        fetch('/api/customer-accounts').catch(() => null)
      ]);

      if (logsRes && logsRes.ok) {
        const logsData = await logsRes.json();
        if (Array.isArray(logsData)) setWebhookLogs(logsData);
      }
      if (custRes && custRes.ok) {
        const custData = await custRes.json();
        if (Array.isArray(custData)) setCustomerAccounts(custData);
      }
    } catch (err) {
      console.error('[PaymentWebhookManager] Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWebhookData();
  }, [fetchWebhookData]);

  // Socket listener for real-time webhook updates
  useEffect(() => {
    if (!socket) return;
    const handleWebhookReceived = (logItem) => {
      setWebhookLogs(prev => [logItem, ...prev.filter(l => l.id !== logItem.id)]);
      showToast(`Automated Webhook received: ${logItem.gateway} - ${logItem.status}`, logItem.status === 'Successful' ? 'success' : 'warn');
    };
    const handleMembershipUpdated = () => {
      fetch('/api/customer-accounts')
        .then(r => r.json())
        .then(data => { if (Array.isArray(data)) setCustomerAccounts(data); })
        .catch(() => {});
    };

    socket.on('webhook-payment-received', handleWebhookReceived);
    socket.on('customer-membership-updated', handleMembershipUpdated);
    return () => {
      socket.off('webhook-payment-received', handleWebhookReceived);
      socket.off('customer-membership-updated', handleMembershipUpdated);
    };
  }, [socket]);

  // Metrics
  const metrics = useMemo(() => {
    const total = webhookLogs.length;
    const successful = webhookLogs.filter(l => l.status === 'Successful').length;
    const pending = webhookLogs.filter(l => l.status === 'Pending').length;
    const failed = webhookLogs.filter(l => l.status === 'Failed' || l.status === 'Amount Mismatch Flagged' || l.status === 'Signature Verification Failed').length;
    const activated = customerAccounts.filter(c => c.membershipStatus === 'Active').length;
    return { total, successful, pending, failed, activated };
  }, [webhookLogs, customerAccounts]);

  // Default target order for simulator
  useEffect(() => {
    if (orders && orders.length > 0 && !simOrderId) {
      const pendingOrd = orders.find(o => o.status === 'Pending Payment' || o.paymentStatus === 'Pending' || o.paymentStatus === 'Pending Verification') || orders[0];
      if (pendingOrd) {
        setSimOrderId(pendingOrd.orderId || pendingOrd.id);
        setSimAmount(String(pendingOrd.totalPrice || pendingOrd.total || 708));
        setSimCustomerName(pendingOrd.customer || 'Juan Dela Cruz');
      }
    }
  }, [orders, simOrderId]);

  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'secret') {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } else {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
    showToast('Copied to clipboard!');
  };

  const handleRunSimulation = async (e) => {
    if (e) e.preventDefault();
    setIsSimulating(true);
    setSimulationResult(null);

    try {
      const payload = {
        gateway: simGateway,
        scenario: simStatus,
        orderId: simOrderId.trim() || 'ORD-3145',
        amount: Number(simAmount) || 708,
        currency: 'PHP',
        customerName: simCustomerName.trim() || 'Juan Dela Cruz',
        servicePlan: simPlan,
        actorName: currentAdminName
      };

      const res = await fetch('/api/webhooks/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setSimulationResult(data);

      if (res.ok) {
        showToast(`Simulation processed: ${data.status} (HTTP ${data.statusCode})`, data.status === 'Successful' ? 'success' : 'warn');
        fetchWebhookData();
      } else {
        showToast(data.error || 'Simulation returned an error', 'error');
      }
    } catch (err) {
      showToast('Network error triggering simulation.', 'error');
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minHeight: '80vh' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 99999,
          background: toast.type === 'error' ? '#991B1B' : toast.type === 'warn' ? '#D97706' : '#059669',
          color: '#FFFFFF', padding: '0.85rem 1.25rem', borderRadius: '12px',
          boxShadow: '0 12px 30px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: '10px',
          fontWeight: 700, fontSize: '0.88rem'
        }}>
          {toast.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1C1917 0%, #292524 100%)',
        borderRadius: '18px', padding: '1.5rem 2rem', color: '#FFFFFF',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem',
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{
              padding: '3px 10px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 900,
              background: 'rgba(5, 150, 105, 0.25)', color: '#34D399', border: '1px solid rgba(52, 211, 153, 0.4)',
              display: 'flex', alignItems: 'center', gap: '5px'
            }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' }} />
              AUTOMATED WEBHOOK GATEWAY ACTIVE
            </span>
            <span style={{ fontSize: '0.75rem', color: '#A8A29E', fontWeight: 600 }}>
              Zero Manual Verification • Real-Time Cryptographic Settlement
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: '1.55rem', fontWeight: 900, letterSpacing: '-0.02em' }}>
            Automated Payment Webhook &amp; Gateway Verification System
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#D6D3D1', maxWidth: '780px' }}>
            Payment gateways (GCash, Maya, PayMongo, Stripe, Card) automatically notify this system via signed webhooks.
            The system verifies cryptographic signatures, confirms order amount and currency, updates transaction status in real time,
            dispatches kitchen tickets, and activates customer subscriptions/memberships automatically.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={fetchWebhookData}
            style={{
              padding: '0.6rem 1.1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.18)',
              background: 'rgba(255,255,255,0.08)', color: '#FFFFFF', fontWeight: 700, fontSize: '0.82rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <RefreshCw size={14} /> Refresh Logs
          </button>
          <button
            onClick={() => setActiveTab('simulator')}
            style={{
              padding: '0.6rem 1.25rem', borderRadius: '10px', border: 'none',
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: '#FFFFFF',
              fontWeight: 800, fontSize: '0.84rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px',
              boxShadow: '0 4px 14px rgba(5, 150, 105, 0.35)'
            }}
          >
            <Zap size={15} /> Test Webhook Simulator
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        {[
          { label: 'Total Webhooks Received', value: metrics.total, sub: 'Idempotency & Replay Shield Active', icon: <Activity size={18} color="#2563EB" />, color: '#1C1917', bg: '#FFFFFF' },
          { label: 'Automated Success Settlements', value: metrics.successful, sub: '100% Automated • Sent to Kitchen', icon: <CheckCircle2 size={18} color="#059669" />, color: '#059669', bg: '#F0FDF4' },
          { label: 'Pending Settlement Webhooks', value: metrics.pending, sub: 'Awaiting Gateway Confirmation', icon: <Clock size={18} color="#D97706" />, color: '#D97706', bg: '#FFFBEB' },
          { label: 'Fraud / Mismatch Blocked', value: metrics.failed, sub: 'Protected by HMAC-SHA256', icon: <ShieldCheck size={18} color="#DC2626" />, color: '#DC2626', bg: '#FEF2F2' },
          { label: 'Active Subscriptions & Members', value: metrics.activated, sub: 'VIP Perks & Points Auto-Credited', icon: <Award size={18} color="#7C3AED" />, color: '#7C3AED', bg: '#FAF5FF' }
        ].map((kpi, idx) => (
          <div key={idx} style={{ background: kpi.bg, borderRadius: '14px', padding: '1.15rem 1.3rem', border: '1px solid #E7E5E4' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#78716C', textTransform: 'uppercase' }}>{kpi.label}</span>
              {kpi.icon}
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 900, color: kpi.color, marginTop: '6px' }}>{kpi.value}</div>
            <div style={{ fontSize: '0.72rem', color: '#57534E', marginTop: '4px', fontWeight: 600 }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #E7E5E4', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
        {[
          { id: 'feed', label: 'Live Webhook Audit Feed', icon: <FileText size={16} />, badge: webhookLogs.length },
          { id: 'simulator', label: 'Interactive Webhook Simulator & Testing', icon: <Terminal size={16} />, badge: 'Live Test' },
          { id: 'memberships', label: 'Customer Accounts & Activated Memberships', icon: <Users size={16} />, badge: customerAccounts.length },
          { id: 'config', label: 'Gateway Configuration & Security Specs', icon: <Lock size={16} />, badge: 'HMAC-SHA256' }
        ].map(tab => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0.65rem 1.15rem', borderRadius: '10px', border: 'none',
                background: active ? '#1C1917' : 'transparent',
                color: active ? '#FFFFFF' : '#57534E',
                fontWeight: active ? 800 : 600, fontSize: '0.84rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '7px', transition: 'all 0.15s'
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span style={{
                  padding: '2px 7px', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 800,
                  background: active ? 'rgba(255,255,255,0.22)' : '#F3F4F6',
                  color: active ? '#FFFFFF' : '#4B5563'
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: LIVE WEBHOOK AUDIT FEED */}
      {activeTab === 'feed' && (
        <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E7E5E4', overflow: 'hidden' }}>
          <div style={{ padding: '1.15rem 1.4rem', borderBottom: '1px solid #E7E5E4', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900 }}>Automated Webhook Transaction Audit Feed</h2>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#78716C' }}>
                Every webhook from GCash, Maya, PayMongo, or Stripe is cryptographically validated and settled in real time without human intervention.
              </p>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px #10B981' }} />
              Live WebSocket Synchronization Active
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#FAF8F5', borderBottom: '1px solid #E7E5E4', textAlign: 'left', color: '#78716C' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 800 }}>Event ID</th>
                  <th style={{ padding: '10px 14px', fontWeight: 800 }}>Gateway / Method</th>
                  <th style={{ padding: '10px 14px', fontWeight: 800 }}>Order ID</th>
                  <th style={{ padding: '10px 14px', fontWeight: 800 }}>Customer</th>
                  <th style={{ padding: '10px 14px', fontWeight: 800 }}>Amount &amp; Currency</th>
                  <th style={{ padding: '10px 14px', fontWeight: 800 }}>Signature Check</th>
                  <th style={{ padding: '10px 14px', fontWeight: 800 }}>Payment Status</th>
                  <th style={{ padding: '10px 14px', fontWeight: 800 }}>Service / Membership</th>
                  <th style={{ padding: '10px 14px', fontWeight: 800 }}>Settled Time</th>
                  <th style={{ padding: '10px 14px', fontWeight: 800, textAlign: 'center' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {webhookLogs.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ padding: '2.5rem', textAlign: 'center', color: '#78716C' }}>
                      No webhook transactions logged yet. Use the simulator tab to test the automated webhook settlement!
                    </td>
                  </tr>
                ) : (
                  webhookLogs.map(log => {
                    const isSuccess = log.status === 'Successful';
                    const isPending = log.status === 'Pending';
                    const isFailed = !isSuccess && !isPending;
                    return (
                      <tr key={log.id} style={{ borderBottom: '1px solid #F5F5F4' }}>
                        <td style={{ padding: '11px 14px', fontWeight: 800, fontFamily: 'monospace', color: '#1C1917' }}>
                          {log.eventId || log.id}
                        </td>
                        <td style={{ padding: '11px 14px', fontWeight: 700 }}>
                          <span style={{
                            padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem',
                            background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE'
                          }}>
                            {log.gateway || 'PayMongo'}
                          </span>
                        </td>
                        <td style={{ padding: '11px 14px', fontWeight: 800, color: '#C24522' }}>
                          #{log.orderId || 'N/A'}
                        </td>
                        <td style={{ padding: '11px 14px', fontWeight: 600, color: '#44403C' }}>
                          {log.customer || 'Walk-In Customer'}
                        </td>
                        <td style={{ padding: '11px 14px', fontWeight: 800, color: '#1C1917' }}>
                          ₱{Number(log.amount || 0).toFixed(2)} <span style={{ fontSize: '0.72rem', color: '#78716C' }}>{log.currency || 'PHP'}</span>
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          {log.signatureVerified ? (
                            <span style={{ color: '#059669', fontWeight: 800, fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle2 size={13} /> Valid HMAC
                            </span>
                          ) : (
                            <span style={{ color: '#DC2626', fontWeight: 800, fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <XCircle size={13} /> Failed / Tampered
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <span style={{
                            padding: '3px 9px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 800,
                            background: isSuccess ? '#ECFDF5' : isPending ? '#FFFBEB' : '#FEF2F2',
                            color: isSuccess ? '#047857' : isPending ? '#B45309' : '#B91C1C',
                            border: `1px solid ${isSuccess ? '#A7F3D0' : isPending ? '#FDE68A' : '#FECACA'}`
                          }}>
                            {log.status}
                          </span>
                        </td>
                        <td style={{ padding: '11px 14px', fontSize: '0.75rem' }}>
                          {log.serviceActivated ? (
                            <span style={{ color: '#7C3AED', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Sparkles size={13} /> {log.activatedPlan || 'Active VIP'}
                            </span>
                          ) : (
                            <span style={{ color: '#A8A29E', fontWeight: 600 }}>Unactivated</span>
                          )}
                        </td>
                        <td style={{ padding: '11px 14px', color: '#78716C', fontSize: '0.75rem' }}>
                          {log.processedAt ? new Date(log.processedAt).toLocaleTimeString() : new Date().toLocaleTimeString()}
                        </td>
                        <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                          <button
                            onClick={() => setSelectedLog(log)}
                            style={{
                              padding: '4px 10px', borderRadius: '6px', border: '1px solid #D6D3D1',
                              background: '#FAF8F5', color: '#44403C', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer'
                            }}
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: INTERACTIVE WEBHOOK SIMULATOR & TESTING */}
      {activeTab === 'simulator' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Simulator Form */}
          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '1.5rem', border: '1px solid #E7E5E4' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ padding: '2px 8px', borderRadius: '6px', background: '#EFF6FF', color: '#1D4ED8', fontSize: '0.72rem', fontWeight: 800 }}>
                PAYMENT GATEWAY SIMULATION TESTBED
              </span>
            </div>
            <h2 style={{ margin: '0 0 6px', fontSize: '1.25rem', fontWeight: 900 }}>Simulate Incoming Gateway Webhook</h2>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.82rem', color: '#78716C', lineHeight: 1.45 }}>
              Trigger an automated webhook with real HMAC-SHA256 cryptography to test automatic order verification,
              amount validation, duplicate protection, and customer subscription activation in real time.
            </p>

            <form onSubmit={handleRunSimulation} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 800, color: '#44403C', display: 'block', marginBottom: '4px' }}>
                    Payment Gateway Source
                  </label>
                  <select
                    value={simGateway}
                    onChange={(e) => setSimGateway(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '0.84rem', fontWeight: 700 }}
                  >
                    <option value="gcash">GCash (PayMongo / Direct)</option>
                    <option value="maya">Maya Digital Wallet</option>
                    <option value="paymongo">PayMongo Webhook Standard</option>
                    <option value="card">Visa / Mastercard Online</option>
                    <option value="stripe">Stripe Checkout Gateway</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 800, color: '#44403C', display: 'block', marginBottom: '4px' }}>
                    Gateway Scenario / Result
                  </label>
                  <select
                    value={simStatus}
                    onChange={(e) => setSimStatus(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '0.84rem', fontWeight: 700 }}
                  >
                    <option value="successful">Payment Succeeded (Automated Approval)</option>
                    <option value="pending">Payment Pending Settlement</option>
                    <option value="failed">Payment Failed / Expired</option>
                    <option value="invalid_sig">Tampered / Invalid Signature (Security Test)</option>
                    <option value="amount_mismatch">Amount Mismatch (Fraud Protection Test)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 800, color: '#44403C', display: 'block', marginBottom: '4px' }}>
                    Target Order ID
                  </label>
                  <input
                    type="text"
                    required
                    value={simOrderId}
                    onChange={(e) => setSimOrderId(e.target.value)}
                    placeholder="e.g. ORD-3145"
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '0.84rem', fontWeight: 700 }}
                  />
                  {orders.length > 0 && (
                    <div style={{ fontSize: '0.7rem', color: '#78716C', marginTop: '3px' }}>
                      Active: {orders.slice(0, 3).map(o => o.orderId || o.id).join(', ')}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 800, color: '#44403C', display: 'block', marginBottom: '4px' }}>
                    Amount (PHP)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={simAmount}
                    onChange={(e) => setSimAmount(e.target.value)}
                    placeholder="708.00"
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '0.84rem', fontWeight: 700 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 800, color: '#44403C', display: 'block', marginBottom: '4px' }}>
                    Customer / Member Name
                  </label>
                  <input
                    type="text"
                    value={simCustomerName}
                    onChange={(e) => setSimCustomerName(e.target.value)}
                    placeholder="Juan Dela Cruz"
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 800, color: '#44403C', display: 'block', marginBottom: '4px' }}>
                    Subscription / Service to Activate
                  </label>
                  <input
                    type="text"
                    value={simPlan}
                    onChange={(e) => setSimPlan(e.target.value)}
                    placeholder="Umami VIP Gourmet Club"
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '0.5rem', display: 'flex', gap: '10px' }}>
                <button
                  type="submit"
                  disabled={isSimulating}
                  style={{
                    flex: 1, padding: '0.75rem 1.25rem', borderRadius: '10px', border: 'none',
                    background: 'linear-gradient(135deg, #C24522 0%, #A33314 100%)', color: '#FFFFFF',
                    fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', gap: '8px',
                    boxShadow: '0 4px 14px rgba(194, 69, 34, 0.35)'
                  }}
                >
                  <Send size={15} />
                  <span>{isSimulating ? 'Computing HMAC & Dispatching...' : 'Dispatch Webhook Event'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Simulation Output / Inspector */}
          <div style={{ background: '#1C1917', borderRadius: '16px', padding: '1.5rem', color: '#FFFFFF', border: '1px solid #292524' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Terminal size={16} color="#10B981" />
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#10B981', textTransform: 'uppercase' }}>
                  Gateway Response Console
                </span>
              </div>
              {simulationResult && (
                <span style={{
                  padding: '2px 8px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 800,
                  background: simulationResult.statusCode === 200 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  color: simulationResult.statusCode === 200 ? '#34D399' : '#F87171'
                }}>
                  HTTP {simulationResult.statusCode}
                </span>
              )}
            </div>

            {simulationResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{
                  padding: '12px', borderRadius: '10px',
                  background: simulationResult.status === 'Successful' ? 'rgba(5, 150, 105, 0.15)' : 'rgba(220, 38, 38, 0.15)',
                  border: `1px solid ${simulationResult.status === 'Successful' ? 'rgba(5, 150, 105, 0.35)' : 'rgba(220, 38, 38, 0.35)'}`
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#A8A29E' }}>VERIFICATION STATUS</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 900, color: simulationResult.status === 'Successful' ? '#34D399' : '#F87171', marginTop: '2px' }}>
                    {simulationResult.status}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#D6D3D1', marginTop: '4px' }}>
                    {simulationResult.details}
                  </div>
                </div>

                <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '6px', color: '#D6D3D1' }}>
                  <div><strong>Event ID:</strong> <span style={{ fontFamily: 'monospace', color: '#6EE7B7' }}>{simulationResult.eventId}</span></div>
                  <div><strong>Signature Check:</strong> <span style={{ color: simulationResult.signatureVerified ? '#34D399' : '#F87171' }}>{simulationResult.signatureVerified ? '✓ Valid HMAC-SHA256 Match' : '✗ Invalid / Rejected'}</span></div>
                  <div><strong>Amount Validation:</strong> <span style={{ color: simulationResult.amountMatched ? '#34D399' : '#F87171' }}>{simulationResult.amountMatched ? '✓ Amount Matches Order Total' : '✗ Mismatch / Flagged'}</span></div>
                  <div><strong>Kitchen Dispatched:</strong> <span style={{ color: simulationResult.orderSentToKitchen ? '#34D399' : '#9CA3AF' }}>{simulationResult.orderSentToKitchen ? '✓ Sent to Kitchen Display System' : 'None (Payment not verified)'}</span></div>
                  <div><strong>Service Activated:</strong> <span style={{ color: simulationResult.serviceActivated ? '#A78BFA' : '#9CA3AF' }}>{simulationResult.serviceActivated ? `✓ ${simulationResult.activatedPlan}` : 'None'}</span></div>
                  <div><strong>Execution Time:</strong> {simulationResult.executionTimeMs}ms</div>
                </div>

                <div style={{ marginTop: '8px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginBottom: '4px' }}>RAW WEBHOOK PAYLOAD</div>
                  <pre style={{
                    padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)',
                    fontSize: '0.7rem', color: '#A7F3D0', overflowX: 'auto', margin: 0
                  }}>
                    {JSON.stringify(simulationResult.payload, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#78716C', fontSize: '0.82rem' }}>
                Ready to dispatch. Select a scenario on the left and click "Dispatch Webhook Event" to test the automated pipeline.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CUSTOMER ACCOUNTS & ACTIVATED MEMBERSHIPS */}
      {activeTab === 'memberships' && (
        <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E7E5E4', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #E7E5E4' }}>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900 }}>Customer Accounts, Memberships &amp; Activated Services</h2>
            <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#78716C' }}>
              Upon verified webhook confirmation, memberships, dining passes, and loyalty points are activated automatically on customer accounts.
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#FAF8F5', borderBottom: '1px solid #E7E5E4', textAlign: 'left', color: '#78716C' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 800 }}>Account ID</th>
                  <th style={{ padding: '10px 14px', fontWeight: 800 }}>Customer Name</th>
                  <th style={{ padding: '10px 14px', fontWeight: 800 }}>Contact Info</th>
                  <th style={{ padding: '10px 14px', fontWeight: 800 }}>Membership Tier</th>
                  <th style={{ padding: '10px 14px', fontWeight: 800 }}>Status</th>
                  <th style={{ padding: '10px 14px', fontWeight: 800 }}>Points Balance</th>
                  <th style={{ padding: '10px 14px', fontWeight: 800 }}>Activated At</th>
                  <th style={{ padding: '10px 14px', fontWeight: 800 }}>Expires At</th>
                </tr>
              </thead>
              <tbody>
                {customerAccounts.map(cust => (
                  <tr key={cust.id} style={{ borderBottom: '1px solid #F5F5F4' }}>
                    <td style={{ padding: '11px 14px', fontWeight: 800, fontFamily: 'monospace' }}>{cust.id}</td>
                    <td style={{ padding: '11px 14px', fontWeight: 800, color: '#1C1917' }}>{cust.name}</td>
                    <td style={{ padding: '11px 14px', color: '#57534E' }}>
                      <div>{cust.email}</div>
                      <div style={{ fontSize: '0.72rem', color: '#78716C' }}>{cust.phone}</div>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800,
                        background: '#FAF5FF', color: '#7C3AED', border: '1px solid #E9D5FF'
                      }}>
                        {cust.membershipTier}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{
                        padding: '3px 9px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 800,
                        background: cust.membershipStatus === 'Active' ? '#ECFDF5' : '#FEF2F2',
                        color: cust.membershipStatus === 'Active' ? '#047857' : '#B91C1C'
                      }}>
                        {cust.membershipStatus}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px', fontWeight: 900, color: '#059669' }}>
                      ★ {cust.pointsBalance || 0} pts
                    </td>
                    <td style={{ padding: '11px 14px', color: '#78716C', fontSize: '0.75rem' }}>
                      {cust.activatedAt ? new Date(cust.activatedAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td style={{ padding: '11px 14px', color: '#78716C', fontSize: '0.75rem' }}>
                      {cust.expiresAt ? new Date(cust.expiresAt).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: GATEWAY CONFIGURATION & SECURITY SPECS */}
      {activeTab === 'config' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '1.5rem', border: '1px solid #E7E5E4', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900 }}>Gateway Webhook Endpoints</h3>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#78716C' }}>
              Configure your payment provider dashboard (PayMongo, GCash Developer Portal, Maya Business, Stripe) to post webhook notifications to these endpoints.
            </p>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#44403C' }}>Primary Universal Webhook URL</label>
              <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                <input
                  type="text"
                  readOnly
                  value="http://localhost:3001/api/webhooks/payment"
                  style={{ flex: 1, padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #D6D3D1', background: '#FAF8F5', fontFamily: 'monospace', fontSize: '0.8rem' }}
                />
                <button
                  type="button"
                  onClick={() => handleCopy('http://localhost:3001/api/webhooks/payment', 'url')}
                  style={{ padding: '0.55rem 0.9rem', borderRadius: '8px', border: '1px solid #D6D3D1', background: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 700 }}
                >
                  {copiedUrl ? <Check size={14} color="#059669" /> : <Copy size={14} />} Copy
                </button>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#44403C' }}>PayMongo Dedicated Webhook URL</label>
              <input
                type="text"
                readOnly
                value="http://localhost:3001/api/webhooks/paymongo"
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #D6D3D1', background: '#FAF8F5', fontFamily: 'monospace', fontSize: '0.8rem', marginTop: '4px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#44403C' }}>Signing Secret (HMAC-SHA256)</label>
              <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                <input
                  type="password"
                  readOnly
                  value="whsec_umami_live_webhook_secret_key_2026"
                  style={{ flex: 1, padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #D6D3D1', background: '#FAF8F5', fontFamily: 'monospace', fontSize: '0.8rem' }}
                />
                <button
                  type="button"
                  onClick={() => handleCopy('whsec_umami_live_webhook_secret_key_2026', 'secret')}
                  style={{ padding: '0.55rem 0.9rem', borderRadius: '8px', border: '1px solid #D6D3D1', background: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 700 }}
                >
                  {copiedSecret ? <Check size={14} color="#059669" /> : <Copy size={14} />} Copy
                </button>
              </div>
              <span style={{ fontSize: '0.7rem', color: '#78716C', marginTop: '3px', display: 'block' }}>
                Environment variable: <code style={{ color: '#C24522' }}>PAYMENT_WEBHOOK_SECRET</code>
              </span>
            </div>
          </div>

          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '1.5rem', border: '1px solid #E7E5E4', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900 }}>Automated Verification Specifications</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.82rem' }}>
              <div style={{ padding: '10px 12px', borderRadius: '10px', background: '#FAF8F5', border: '1px solid #E7E5E4' }}>
                <strong style={{ color: '#059669' }}>1. Cryptographic Signature Validation</strong>
                <p style={{ margin: '3px 0 0', color: '#57534E', fontSize: '0.78rem' }}>
                  Every incoming request header (<code style={{ color: '#C24522' }}>x-signature</code>, <code style={{ color: '#C24522' }}>paymongo-signature</code>, or <code style={{ color: '#C24522' }}>stripe-signature</code>) is validated using HMAC-SHA256 with constant-time equality checks (<code style={{ color: '#C24522' }}>timingSafeEqual</code>).
                </p>
              </div>

              <div style={{ padding: '10px 12px', borderRadius: '10px', background: '#FAF8F5', border: '1px solid #E7E5E4' }}>
                <strong style={{ color: '#2563EB' }}>2. Replay Attack &amp; Idempotency Protection</strong>
                <p style={{ margin: '3px 0 0', color: '#57534E', fontSize: '0.78rem' }}>
                  Requests with timestamps older than 5 minutes are discarded. Duplicate event IDs return idempotent 200 OK responses without duplicate processing or double kitchen tickets.
                </p>
              </div>

              <div style={{ padding: '10px 12px', borderRadius: '10px', background: '#FAF8F5', border: '1px solid #E7E5E4' }}>
                <strong style={{ color: '#D97706' }}>3. Currency &amp; Exact Amount Match</strong>
                <p style={{ margin: '3px 0 0', color: '#57534E', fontSize: '0.78rem' }}>
                  The webhook settlement amount is checked against the database order total. If an underpayment or tampered amount is detected, the transaction is marked as <code style={{ color: '#DC2626' }}>Amount Mismatch Flagged</code> and frozen.
                </p>
              </div>

              <div style={{ padding: '10px 12px', borderRadius: '10px', background: '#FAF8F5', border: '1px solid #E7E5E4' }}>
                <strong style={{ color: '#7C3AED' }}>4. Instant Real-Time Sync &amp; Service Activation</strong>
                <p style={{ margin: '3px 0 0', color: '#57534E', fontSize: '0.78rem' }}>
                  Successful payments immediately emit <code style={{ color: '#C24522' }}>new-kitchen-order</code> to kitchen displays, update customer tracking, credit loyalty points, and activate customer subscription services.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Log Detail Modal */}
      {selectedLog && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem'
        }}>
          <div style={{
            background: '#FFFFFF', borderRadius: '18px', width: '100%', maxWidth: '600px',
            padding: '1.5rem', border: '1px solid #E7E5E4', maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900 }}>
                Webhook Transaction: {selectedLog.id}
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#78716C' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem' }}>
              <div><strong>Gateway:</strong> {selectedLog.gateway}</div>
              <div><strong>Event ID:</strong> <span style={{ fontFamily: 'monospace' }}>{selectedLog.eventId}</span></div>
              <div><strong>Order ID:</strong> #{selectedLog.orderId}</div>
              <div><strong>Transaction Ref:</strong> {selectedLog.transactionReference || 'N/A'}</div>
              <div><strong>Amount:</strong> ₱{Number(selectedLog.amount || 0).toFixed(2)} {selectedLog.currency}</div>
              <div><strong>Status:</strong> <span style={{ fontWeight: 800, color: selectedLog.status === 'Successful' ? '#059669' : '#DC2626' }}>{selectedLog.status}</span></div>
              <div><strong>Signature Verified:</strong> {selectedLog.signatureVerified ? '✓ Valid HMAC-SHA256' : '✗ Failed'}</div>
              <div><strong>Service / Membership:</strong> {selectedLog.activatedPlan || 'None'}</div>
              <div><strong>Audit Details:</strong> {selectedLog.details}</div>
              <div style={{ marginTop: '8px' }}>
                <strong>Details:</strong>
                <pre style={{ padding: '10px', borderRadius: '8px', background: '#FAF8F5', border: '1px solid #E7E5E4', fontSize: '0.74rem', overflowX: 'auto', marginTop: '4px' }}>
                  {JSON.stringify(selectedLog, null, 2)}
                </pre>
              </div>
            </div>

            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedLog(null)}
                style={{ padding: '0.55rem 1.2rem', borderRadius: '8px', border: 'none', background: '#1C1917', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

