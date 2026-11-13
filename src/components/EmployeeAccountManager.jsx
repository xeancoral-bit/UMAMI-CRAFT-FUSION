import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Users, UserPlus, Shield, CreditCard, ChefHat, Search, Edit2, Key, Power,
  CheckCircle2, XCircle, Clock, Mail, Phone, Activity, Lock, AlertCircle,
  RefreshCw, Trash2, Eye, X, Check, Building2, UserCheck
} from 'lucide-react';
import {
  fetchEmployeesList,
  saveLocalEmployees,
  fetchAuditLogsList,
  appendLocalAuditLog
} from '../utils/systemStore';

const ROLE_OPTIONS_BY_TYPE = {
  admin: ['Administrator', 'Store Manager'],
  cashier: ['Head Cashier', 'Cashier'],
  staff: ['Kitchen Staff', 'Server / Waitstaff', 'Busser']
};

const PERMISSION_CATALOG = {
  admin: [
    { id: 'all', label: 'Full Enterprise System Oversight' },
    { id: 'manage_accounts', label: 'Employee Account & Role Management' },
    { id: 'manage_reports', label: 'Daily Reports Approval & Audit' },
    { id: 'manage_menu', label: 'Menu, Categories, Combos & Pricing' },
    { id: 'manage_inventory', label: 'Inventory & Stock Control' },
    { id: 'manage_orders', label: 'Order & Payment Verification' },
    { id: 'system_settings', label: 'Security & System Settings' }
  ],
  cashier: [
    { id: 'pos_orders', label: 'POS Order Creation & Counter Checkout' },
    { id: 'payment_processing', label: 'Cash & Digital Payment Processing' },
    { id: 'receipt_generation', label: 'Official Thermal Receipt Printing' },
    { id: 'order_status_view', label: 'Active Order Status Updates' },
    { id: 'discounts_promos', label: 'Apply Authorized Promo Discounts' },
    { id: 'refunds_voids', label: 'Record Refunds & Void Transactions' },
    { id: 'cashier_daily_report', label: 'Cashier Daily Report & Cash Reconciliation' }
  ],
  staff: [
    { id: 'assigned_tasks', label: 'Assigned Shift Tasks & Checklists' },
    { id: 'kitchen_prep', label: 'Kitchen Order Preparation & Status Updates' },
    { id: 'table_service', label: 'Table Service & Guest Assistance Calls' },
    { id: 'allergen_verification', label: 'Allergen Safety & Station Verification' },
    { id: 'activity_logs', label: 'Operational Activity Recording' },
    { id: 'staff_daily_report', label: 'Staff Daily Report Submission' }
  ]
};

export default function EmployeeAccountManager({
  socket,
  initialTab = 'all',
  currentUser,
  onNavigateToReports
}) {
  const [employees, setEmployees] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(initialTab || 'all'); // 'all' | 'admin' | 'cashier' | 'staff' | 'audit'
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [toast, setToast] = useState(null);

  // Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [passwordResetTarget, setPasswordResetTarget] = useState(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [pinUpdateTarget, setPinUpdateTarget] = useState(null);
  const [newPinInput, setNewPinInput] = useState('');
  const [activityTarget, setActivityTarget] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    pin: '2011',
    accountType: 'cashier',
    role: 'Cashier',
    position: 'POS Cashier & Register Operator',
    department: 'POS & Front Counter',
    shift: 'Morning Shift (08:00 AM - 04:30 PM)',
    contact: '+63 917 ',
    status: 'Active',
    registerId: 'POS-01 (Main Counter)',
    openingFloat: 5000,
    permissions: ['pos_orders', 'payment_processing', 'receipt_generation', 'order_status_view', 'cashier_daily_report']
  });

  useEffect(() => {
    if (initialTab) {
      setActiveCategory(initialTab);
    }
  }, [initialTab]);

  const showToastMsg = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const isFetchingRef = useRef(false);

  const fetchAllData = useCallback(async (showSpinner = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (showSpinner) setLoading(true);
    try {
      const [empData, logData] = await Promise.all([
        fetchEmployeesList(),
        fetchAuditLogsList()
      ]);
      if (Array.isArray(empData)) setEmployees(empData);
      if (Array.isArray(logData)) setAuditLogs(logData);
    } catch (err) {
      console.error('[EmployeeAccountManager] Failed to load data:', err);
    } finally {
      if (showSpinner) setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchAllData(true);
    let timer = null;
    const onSystemSync = (e) => {
      const key = e?.detail?.key;
      if (!key || key === 'umami_employees_store_v1' || key === 'umami_audit_logs_store_v1') {
        clearTimeout(timer);
        timer = setTimeout(() => {
          fetchAllData(false);
        }, 300);
      }
    };
    window.addEventListener('umami-system-sync', onSystemSync);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('umami-system-sync', onSystemSync);
    };
  }, [fetchAllData]);

  useEffect(() => {
    if (!socket) return;
    const handleEmployeesUpdated = (updated) => {
      if (Array.isArray(updated)) setEmployees(updated);
    };
    const handleAuditUpdated = (logs) => {
      if (Array.isArray(logs)) setAuditLogs(logs);
    };
    socket.on('employees-updated', handleEmployeesUpdated);
    socket.on('audit-logs-updated', handleAuditUpdated);
    return () => {
      socket.off('employees-updated', handleEmployeesUpdated);
      socket.off('audit-logs-updated', handleAuditUpdated);
    };
  }, [socket]);

  const counts = useMemo(() => {
    const list = Array.isArray(employees) ? employees.filter(Boolean) : [];
    const admin = list.filter(e => e.accountType === 'admin').length;
    const cashier = list.filter(e => e.accountType === 'cashier').length;
    const staff = list.filter(e => e.accountType === 'staff').length;
    const active = list.filter(e => e.status === 'Active').length;
    const inactive = list.filter(e => e.status !== 'Active').length;
    return { all: list.length, admin, cashier, staff, active, inactive };
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      if (activeCategory !== 'all' && activeCategory !== 'audit') {
        if ((emp.accountType || '').toLowerCase() !== activeCategory.toLowerCase()) return false;
      }
      if (statusFilter !== 'All' && (emp.status || 'Active') !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          (emp.name || '').toLowerCase().includes(q) ||
          (emp.username || '').toLowerCase().includes(q) ||
          (emp.email || '').toLowerCase().includes(q) ||
          (emp.id || '').toLowerCase().includes(q) ||
          (emp.role || '').toLowerCase().includes(q) ||
          (emp.department || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [employees, activeCategory, statusFilter, searchQuery]);

  const openCreateModal = (presetType = 'cashier') => {
    const type = presetType === 'all' || presetType === 'audit' ? 'cashier' : presetType;
    const defaultPerms = (PERMISSION_CATALOG[type] || []).map(p => p.id);
    setEditingAccount(null);
    setFormData({
      name: '',
      username: type === 'staff' ? 'staff' : '',
      email: type === 'staff' ? 'staff@umamicraft.com' : '',
      password: type === 'admin' ? 'admin123' : type === 'cashier' ? 'cashier123' : 'staff123',
      pin: type === 'staff' ? String(Math.floor(2000 + Math.random() * 800)) : '1234',
      accountType: type,
      role: ROLE_OPTIONS_BY_TYPE[type][0],
      position: type === 'admin' ? 'Operations Administrator' : type === 'cashier' ? 'POS Cashier & Counter Register' : 'Kitchen & Floor Operations Staff',
      department: type === 'admin' ? 'Executive Management' : type === 'cashier' ? 'POS & Front Counter' : 'Kitchen & Culinary',
      shift: 'Morning Shift (07:30 AM - 04:00 PM)',
      contact: '+63 917 555 0199',
      status: 'Active',
      registerId: type === 'cashier' ? 'POS-01 (Main Counter)' : '',
      openingFloat: type === 'cashier' ? 5000 : 0,
      permissions: defaultPerms
    });
    setShowFormModal(true);
  };

  const openEditModal = (emp) => {
    setEditingAccount(emp);
    setFormData({
      name: emp.name || '',
      username: emp.username || '',
      email: emp.email || '',
      password: '',
      pin: emp.pin || (emp.accountType === 'staff' ? '2011' : '1234'),
      accountType: emp.accountType || 'staff',
      role: emp.role || 'Kitchen Staff',
      position: emp.position || '',
      department: emp.department || '',
      shift: emp.shift || 'Morning Shift (07:30 AM - 04:00 PM)',
      contact: emp.contact || '',
      status: emp.status || 'Active',
      registerId: emp.registerId || 'POS-01 (Main Counter)',
      openingFloat: Number(emp.openingFloat || 5000),
      permissions: Array.isArray(emp.permissions) ? emp.permissions : []
    });
    setShowFormModal(true);
  };

  const handleAccountTypeChange = (nextType) => {
    const defaultPerms = (PERMISSION_CATALOG[nextType] || []).map(p => p.id);
    setFormData(prev => ({
      ...prev,
      accountType: nextType,
      role: ROLE_OPTIONS_BY_TYPE[nextType][0],
      department: nextType === 'admin' ? 'Executive Management' : nextType === 'cashier' ? 'POS & Front Counter' : 'Kitchen & Culinary',
      position: nextType === 'admin' ? 'System Administrator' : nextType === 'cashier' ? 'POS Cashier' : 'Kitchen & Floor Staff',
      permissions: defaultPerms
    }));
  };

  const togglePermission = (permId) => {
    setFormData(prev => {
      const exists = prev.permissions.includes(permId);
      return {
        ...prev,
        permissions: exists ? prev.permissions.filter(p => p !== permId) : [...prev.permissions, permId]
      };
    });
  };

  const handleSaveAccount = async (e) => {
    e.preventDefault();
    const isStaff = formData.accountType === 'staff';
    if (!formData.name.trim()) {
      showToastMsg('Please provide the employee full name.', 'error');
      return;
    }
    if (!isStaff && (!formData.username.trim() && !formData.email.trim())) {
      showToastMsg('Please provide the employee username and login email.', 'error');
      return;
    }

    const actorName = currentUser?.name || 'Chief Administrator';
    const nowIso = new Date().toISOString();

    const normalizedUsername = isStaff
      ? (formData.username.trim() || 'staff')
      : formData.username.trim();
    const normalizedEmail = isStaff
      ? (formData.email.trim() || 'staff@umamicraft.com')
      : formData.email.trim();
    const normalizedPassword = isStaff
      ? 'staff123'
      : (formData.password || (formData.accountType === 'admin' ? 'admin123' : 'cashier123'));
    const normalizedPin = formData.pin ? String(formData.pin).trim() : (editingAccount?.pin || (isStaff ? '2011' : '1234'));

    if (editingAccount) {
      const updatedList = employees.map(emp => {
        if (emp.id !== editingAccount.id) return emp;
        return {
          ...emp,
          ...formData,
          username: normalizedUsername,
          email: normalizedEmail,
          password: isStaff ? (emp.password || 'staff123') : (formData.password ? formData.password : emp.password),
          pin: normalizedPin
        };
      });
      setEmployees(updatedList);
      saveLocalEmployees(updatedList);
      appendLocalAuditLog({
        actorId: currentUser?.id || 'EMP-001',
        actorName,
        actorRole: 'Administrator',
        accountType: 'admin',
        category: 'Account Management',
        action: isStaff ? 'Employee Personnel Record Updated' : 'Employee Account Updated',
        target: `${editingAccount.name} (${editingAccount.id})`,
        details: isStaff
          ? `Updated personnel record, station (${formData.department}), shift (${formData.shift}), and PIN for ${formData.name}.`
          : `Updated role/permissions for ${formData.name} (${formData.role}).`,
        status: 'Success'
      });
    } else {
      const prefix = formData.accountType === 'admin' ? 'EMP-00' : formData.accountType === 'cashier' ? 'EMP-10' : 'EMP-20';
      const newEmp = {
        id: `${prefix}${Math.floor(Math.random() * 89 + 10)}`,
        ...formData,
        username: normalizedUsername,
        email: normalizedEmail,
        password: normalizedPassword,
        pin: normalizedPin,
        createdAt: nowIso,
        lastLogin: null
      };
      const updatedList = [...employees, newEmp];
      setEmployees(updatedList);
      saveLocalEmployees(updatedList);
      appendLocalAuditLog({
        actorId: currentUser?.id || 'EMP-001',
        actorName,
        actorRole: 'Administrator',
        accountType: 'admin',
        category: 'Account Management',
        action: isStaff ? 'Employee Personnel Profile Registered' : 'Employee Account Created',
        target: `${newEmp.name} (${newEmp.id})`,
        details: isStaff
          ? `Registered new employee personnel profile for ${newEmp.name} (${newEmp.position}) under centralized Staff Account.`
          : `Created new ${formData.accountType.toUpperCase()} account for ${newEmp.name} (@${newEmp.username}).`,
        status: 'Success'
      });
    }

    try {
      const url = editingAccount ? `/api/employees/${editingAccount.id}` : '/api/employees';
      const method = editingAccount ? 'PUT' : 'POST';
      const payload = {
        ...formData,
        username: normalizedUsername,
        email: normalizedEmail,
        password: normalizedPassword,
        pin: normalizedPin,
        actorName
      };
      if (editingAccount && !formData.password) {
        delete payload.password;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.employees)) {
          setEmployees(data.employees);
          saveLocalEmployees(data.employees);
        }
      }
    } catch {}

    window.dispatchEvent(new CustomEvent('umami-system-sync'));
    window.dispatchEvent(new Event('storage'));
    if (socket) {
      socket.emit('employees-updated', employees);
      socket.emit('request-network-refresh');
    }

    setShowFormModal(false);
    showToastMsg(
      editingAccount
        ? `Personnel record "${formData.name}" updated successfully.`
        : isStaff
          ? `New employee profile registered for "${formData.name}".`
          : `New ${formData.accountType.toUpperCase()} account created for "${formData.name}".`
    );
  };

  const handleToggleStatus = async (emp) => {
    if (emp.id === 'EMP-001') {
      showToastMsg('Primary Chief Administrator account cannot be deactivated.', 'error');
      return;
    }
    const nextStatus = emp.status === 'Active' ? 'Inactive' : 'Active';
    const updatedList = employees.map(e => (e.id === emp.id ? { ...e, status: nextStatus } : e));
    setEmployees(updatedList);
    saveLocalEmployees(updatedList);
    appendLocalAuditLog({
      actorId: currentUser?.id || 'EMP-001',
      actorName: currentUser?.name || 'Chief Administrator',
      actorRole: 'Administrator',
      accountType: 'admin',
      category: 'Account Management',
      action: `Account ${nextStatus === 'Active' ? 'Activated' : 'Deactivated'}`,
      target: `${emp.name} (${emp.id})`,
      details: `${emp.name} (${emp.role}) status changed to ${nextStatus}.`,
      status: 'Success'
    });

    try {
      const res = await fetch(`/api/employees/${emp.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, actorName: currentUser?.name || 'Chief Administrator' })
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.employees)) {
          setEmployees(data.employees);
          saveLocalEmployees(data.employees);
        }
      }
    } catch {}
    showToastMsg(`${emp.name} (${emp.id}) is now ${nextStatus}.`);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!passwordResetTarget || !newPasswordInput.trim() || newPasswordInput.trim().length < 4) {
      showToastMsg('Please enter a valid new password (minimum 4 characters).', 'error');
      return;
    }
    const updatedList = employees.map(emp =>
      emp.id === passwordResetTarget.id ? { ...emp, password: newPasswordInput.trim() } : emp
    );
    setEmployees(updatedList);
    saveLocalEmployees(updatedList);
    appendLocalAuditLog({
      actorId: currentUser?.id || 'EMP-001',
      actorName: currentUser?.name || 'Chief Administrator',
      actorRole: 'Administrator',
      accountType: 'admin',
      category: 'Security',
      action: 'Employee Password Reset',
      target: `${passwordResetTarget.name} (${passwordResetTarget.id})`,
      details: `Administrator reset password for ${passwordResetTarget.name} (@${passwordResetTarget.username}).`,
      status: 'Success'
    });

    try {
      await fetch(`/api/employees/${passwordResetTarget.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPassword: newPasswordInput.trim(),
          actorName: currentUser?.name || 'Chief Administrator'
        })
      });
    } catch {}
    showToastMsg(`Password reset for ${passwordResetTarget.name} (@${passwordResetTarget.username}).`);
    setPasswordResetTarget(null);
    setNewPasswordInput('');
  };

  const handleUpdatePin = async (e) => {
    e.preventDefault();
    if (!pinUpdateTarget || !newPinInput.trim() || newPinInput.trim().length !== 4) {
      showToastMsg('Please enter a valid 4-digit numeric PIN.', 'error');
      return;
    }
    const cleanPin = newPinInput.trim();
    const updatedList = employees.map(emp =>
      emp.id === pinUpdateTarget.id ? { ...emp, pin: cleanPin } : emp
    );
    setEmployees(updatedList);
    saveLocalEmployees(updatedList);
    appendLocalAuditLog({
      actorId: currentUser?.id || 'EMP-001',
      actorName: currentUser?.name || 'Chief Administrator',
      actorRole: 'Administrator',
      accountType: 'admin',
      category: 'Security',
      action: 'Employee Terminal PIN Updated',
      target: `${pinUpdateTarget.name} (${pinUpdateTarget.id})`,
      details: `Administrator updated workstation verification PIN for ${pinUpdateTarget.name} (${pinUpdateTarget.id}) to ${cleanPin}.`,
      status: 'Success'
    });

    try {
      await fetch(`/api/employees/${pinUpdateTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...pinUpdateTarget,
          pin: cleanPin,
          actorName: currentUser?.name || 'Chief Administrator'
        })
      });
    } catch {}
    showToastMsg(`Updated verification PIN for ${pinUpdateTarget.name} to "${cleanPin}".`);
    setPinUpdateTarget(null);
    setNewPinInput('');
  };

  const handleDeleteAccount = async (emp) => {
    if (emp.id === 'EMP-001') {
      showToastMsg('Primary Chief Administrator account cannot be deleted.', 'error');
      return;
    }
    if (!window.confirm(`Remove employee account "${emp.name}" (${emp.id})?`)) return;
    const updatedList = employees.filter(e => e.id !== emp.id);
    setEmployees(updatedList);
    saveLocalEmployees(updatedList);
    try {
      const res = await fetch(`/api/employees/${emp.id}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.employees)) {
          setEmployees(data.employees);
          saveLocalEmployees(data.employees);
        }
      }
    } catch {}
    showToastMsg(`Account ${emp.name} removed.`);
  };

  const getBadgeStyle = (accountType) => {
    if (accountType === 'admin') {
      return { bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA', label: 'ADMINISTRATOR', icon: <Shield size={12} /> };
    }
    if (accountType === 'cashier') {
      return { bg: '#ECFDF5', color: '#047857', border: '#A7F3D0', label: 'CASHIER POS', icon: <CreditCard size={12} /> };
    }
    return { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE', label: 'OPERATIONS STAFF', icon: <ChefHat size={12} /> };
  };

  const individualLogs = useMemo(() => {
    if (!activityTarget) return [];
    return auditLogs.filter(l =>
      l.actorId === activityTarget.id ||
      (l.actorName || '').toLowerCase() === (activityTarget.name || '').toLowerCase() ||
      (l.target || '').includes(activityTarget.id)
    );
  }, [auditLogs, activityTarget]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '24px', zIndex: 9999,
          background: toast.type === 'error' ? '#991B1B' : '#065F46',
          color: '#FFFFFF', padding: '0.85rem 1.25rem', borderRadius: '12px',
          boxShadow: '0 12px 30px rgba(0,0,0,0.18)', display: 'flex', alignItems: 'center', gap: '10px',
          fontWeight: 700, fontSize: '0.88rem'
        }}>
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div style={{
        background: '#FFFFFF', borderRadius: '18px', padding: '1.5rem 1.75rem',
        border: '1px solid #E7E5E4', boxShadow: '0 2px 10px rgba(28, 25, 23, 0.04)',
        display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span style={{
              background: '#FFF7ED', color: '#C24522', padding: '4px 10px', borderRadius: '999px',
              fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase',
              border: '1px solid #FFEDD5'
            }}>
              Role-Based Access Control (RBAC)
            </span>
            <span style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981' }} />
              Live Database Synced
            </span>
          </div>
          <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: '#1C1917' }}>
            Employee Account & Role Management
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: '#78716C' }}>
            Manage separate Administrator, Cashier, and Staff accounts, role permissions, login credentials, and real-time account activity.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={fetchAllData}
            style={{
              padding: '0.65rem 1rem', borderRadius: '10px', border: '1px solid #E7E5E4',
              background: '#FAF8F5', color: '#44403C', fontWeight: 700, fontSize: '0.84rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <RefreshCw size={15} /> Refresh
          </button>
          <button
            onClick={() => openCreateModal(activeCategory)}
            style={{
              padding: '0.68rem 1.2rem', borderRadius: '10px', border: 'none',
              background: 'linear-gradient(135deg, #C24522 0%, #9A3412 100%)', color: '#FFFFFF',
              fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px',
              boxShadow: '0 4px 14px rgba(194, 69, 34, 0.28)'
            }}
          >
            <UserPlus size={16} /> Add Employee Account
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        {[
          { key: 'all', title: 'Total Registered Accounts', count: counts.all, sub: `${counts.active} Active • ${counts.inactive} Inactive`, color: '#C24522', bg: '#FFF7ED', icon: <Users size={20} color="#C24522" /> },
          { key: 'admin', title: 'Administrator Accounts', count: counts.admin, sub: 'Full Enterprise & Audit Oversight', color: '#B91C1C', bg: '#FEF2F2', icon: <Shield size={20} color="#B91C1C" /> },
          { key: 'cashier', title: 'Cashier POS Accounts', count: counts.cashier, sub: 'POS Terminal, Payments & Receipts', color: '#047857', bg: '#ECFDF5', icon: <CreditCard size={20} color="#047857" /> },
          { key: 'staff', title: 'Operations Staff Accounts', count: counts.staff, sub: 'Kitchen Prep, Table Calls & Tasks', color: '#1D4ED8', bg: '#EFF6FF', icon: <ChefHat size={20} color="#1D4ED8" /> }
        ].map(card => {
          const isSelected = activeCategory === card.key;
          return (
            <div
              key={card.key}
              onClick={() => setActiveCategory(card.key)}
              style={{
                background: '#FFFFFF', borderRadius: '14px', padding: '1.15rem 1.25rem',
                border: isSelected ? `2px solid ${card.color}` : '1px solid #E7E5E4',
                boxShadow: isSelected ? `0 6px 20px ${card.color}18` : '0 2px 6px rgba(0,0,0,0.03)',
                cursor: 'pointer', transition: 'all 0.18s ease', display: 'flex', flexDirection: 'column', gap: '8px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#57534E' }}>{card.title}</span>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {card.icon}
                </div>
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1C1917', lineHeight: 1.1 }}>{card.count}</div>
              <div style={{ fontSize: '0.74rem', color: '#78716C', fontWeight: 600 }}>{card.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Category Navigation Tabs + Search & Filter Bar */}
      <div style={{
        background: '#FFFFFF', borderRadius: '16px', padding: '1.25rem 1.5rem',
        border: '1px solid #E7E5E4', display: 'flex', flexDirection: 'column',
        gap: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
      }}>
        {/* Row 1: Category Navigation Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { id: 'all', label: `All Accounts (${counts.all})` },
            { id: 'admin', label: `Administrator Accounts (${counts.admin})` },
            { id: 'cashier', label: `Cashier Accounts (${counts.cashier})` },
            { id: 'staff', label: `Staff Personnel Directory (${counts.staff})` },
            { id: 'audit', label: `Account Activity & Login Audit (${auditLogs.length})` }
          ].map(tab => {
            const active = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
                style={{
                  padding: '0.55rem 1rem', borderRadius: '10px',
                  border: active ? '1px solid #C24522' : '1px solid #E7E5E4',
                  background: active ? '#C24522' : '#FAF8F5',
                  color: active ? '#FFFFFF' : '#44403C',
                  fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.15s',
                  whiteSpace: 'nowrap'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Centralized Staff Account Informational Banner */}
        {activeCategory === 'staff' && (
          <div style={{
            background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '12px',
            padding: '0.95rem 1.25rem', display: 'flex', alignItems: 'center', gap: '12px'
          }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '10px', background: '#DBEAFE',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <ChefHat size={22} color="#1D4ED8" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, color: '#1E40AF', fontSize: '0.88rem' }}>
                CENTRALIZED &ldquo;ONE STAFF ACCOUNT FOR ALL EMPLOYEES&rdquo; SYSTEM ACTIVE
              </div>
              <div style={{ fontSize: '0.78rem', color: '#1E3A8A', marginTop: '2px', lineHeight: 1.45 }}>
                All culinary, kitchen, busser, and floor staff access the Staff Operations Dashboard through the single authorized Staff Account (<strong>Username: staff</strong> / <strong>Password: staff123</strong>). Individual staff login account creation is disabled. Each employee profile below is an identifiable personnel record synchronized with the Staff Dashboard and terminal PIN verification.
              </div>
            </div>
          </div>
        )}

        {/* Row 2: Search, Status Filter & Action Controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.85rem',
          paddingTop: '0.85rem',
          borderTop: '1px solid #F5F5F4'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flex: '1 1 320px', maxWidth: '100%', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '200px' }}>
              <Search size={15} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#A8A29E' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, @username, ID, role, department..."
                style={{
                  width: '100%', padding: '0.6rem 0.75rem 0.6rem 2.2rem',
                  borderRadius: '10px', border: '1px solid #D6D3D1', fontSize: '0.84rem',
                  background: '#FAF8F5', color: '#1C1917', outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            {activeCategory !== 'audit' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: '0.6rem 0.9rem', borderRadius: '10px', border: '1px solid #D6D3D1',
                  background: '#FAF8F5', color: '#1C1917', fontSize: '0.84rem', fontWeight: 600,
                  cursor: 'pointer', flexShrink: 0
                }}
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active Only</option>
                <option value="Inactive">Inactive Only</option>
              </select>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            <button
              onClick={() => openCreateModal(activeCategory)}
              style={{
                padding: '0.6rem 1.15rem', borderRadius: '10px', border: 'none',
                background: 'linear-gradient(135deg, #C24522 0%, #9A3412 100%)', color: '#FFFFFF',
                fontWeight: 800, fontSize: '0.84rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
                boxShadow: '0 4px 12px rgba(194, 69, 34, 0.22)',
                whiteSpace: 'nowrap'
              }}
            >
              <UserPlus size={15} /> Add Employee Account
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area: Employee Table OR Audit Log Table */}
      {activeCategory === 'audit' ? (
        <div style={{
          background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E7E5E4',
          overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ padding: '1.1rem 1.5rem', borderBottom: '1px solid #E7E5E4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#1C1917' }}>
                Centralized Account & Role Activity Audit Log
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#78716C' }}>
                Every login, POS payment, daily report submission, password reset, and account status change is permanently recorded.
              </p>
            </div>
          </div>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'thin' }}>
            <table style={{ width: '100%', minWidth: '1050px', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ background: '#FAF8F5', borderBottom: '1px solid #E7E5E4', textAlign: 'left' }}>
                  <th style={{ padding: '0.85rem 1.25rem', color: '#57534E', fontWeight: 800, width: '180px', whiteSpace: 'nowrap' }}>Timestamp</th>
                  <th style={{ padding: '0.85rem 1rem', color: '#57534E', fontWeight: 800, width: '180px', whiteSpace: 'nowrap' }}>Employee / Actor</th>
                  <th style={{ padding: '0.85rem 1rem', color: '#57534E', fontWeight: 800, width: '160px', whiteSpace: 'nowrap' }}>Category</th>
                  <th style={{ padding: '0.85rem 1rem', color: '#57534E', fontWeight: 800, width: '200px', whiteSpace: 'nowrap' }}>Action</th>
                  <th style={{ padding: '0.85rem 1rem', color: '#57534E', fontWeight: 800 }}>Target & Details</th>
                  <th style={{ padding: '0.85rem 1rem', color: '#57534E', fontWeight: 800, width: '100px', whiteSpace: 'nowrap' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs
                  .filter(l => {
                    if (!searchQuery.trim()) return true;
                    const q = searchQuery.toLowerCase();
                    return (
                      (l.actorName || '').toLowerCase().includes(q) ||
                      (l.action || '').toLowerCase().includes(q) ||
                      (l.details || '').toLowerCase().includes(q) ||
                      (l.category || '').toLowerCase().includes(q)
                    );
                  })
                  .slice(0, 60)
                  .map(log => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #F5F5F4' }}>
                      <td style={{ padding: '0.85rem 1.25rem', color: '#78716C', whiteSpace: 'nowrap', fontSize: '0.79rem' }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 700, color: '#1C1917' }}>{log.actorName}</div>
                        <div style={{ fontSize: '0.74rem', color: '#78716C' }}>{log.actorId} • {log.actorRole}</div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: '6px', background: '#F5F5F4',
                          color: '#44403C', fontWeight: 700, fontSize: '0.73rem'
                        }}>
                          {log.category}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#1C1917' }}>
                        {log.action}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#44403C' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#C24522' }}>{log.target}</div>
                        <div style={{ fontSize: '0.78rem', color: '#57534E' }}>{log.details}</div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{
                          padding: '3px 9px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 800,
                          background: log.status === 'Success' ? '#ECFDF5' : '#FEF2F2',
                          color: log.status === 'Success' ? '#047857' : '#B91C1C'
                        }}>
                          {log.status || 'Success'}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{
          background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E7E5E4',
          overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%', scrollbarWidth: 'thin' }}>
            <table style={{ width: '100%', minWidth: '1280px', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ background: '#FAF8F5', borderBottom: '1px solid #E7E5E4', textAlign: 'left' }}>
                  <th style={{ padding: '0.9rem 1.25rem', color: '#57534E', fontWeight: 800, width: '240px', minWidth: '230px', whiteSpace: 'nowrap' }}>Employee & ID</th>
                  <th style={{ padding: '0.9rem 1rem', color: '#57534E', fontWeight: 800, width: '210px', minWidth: '200px', whiteSpace: 'nowrap' }}>Username & Login Email</th>
                  <th style={{ padding: '0.9rem 1rem', color: '#57534E', fontWeight: 800, width: '180px', minWidth: '170px', whiteSpace: 'nowrap' }}>Account Type & Role</th>
                  <th style={{ padding: '0.9rem 1rem', color: '#57534E', fontWeight: 800, width: '210px', minWidth: '200px', whiteSpace: 'nowrap' }}>Department / Shift</th>
                  <th style={{ padding: '0.9rem 1rem', color: '#57534E', fontWeight: 800, width: '160px', minWidth: '150px', whiteSpace: 'nowrap' }}>Contact Info</th>
                  <th style={{ padding: '0.9rem 1rem', color: '#57534E', fontWeight: 800, width: '170px', minWidth: '160px', whiteSpace: 'nowrap' }}>Created / Last Login</th>
                  <th style={{ padding: '0.9rem 1rem', color: '#57534E', fontWeight: 800, width: '110px', minWidth: '100px', whiteSpace: 'nowrap' }}>Status</th>
                  <th style={{ padding: '0.9rem 1.25rem', color: '#57534E', fontWeight: 800, width: '280px', minWidth: '270px', textAlign: 'right', whiteSpace: 'nowrap' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '2.5rem', textAlign: 'center', color: '#78716C' }}>
                      Loading employee accounts...
                    </td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '2.5rem', textAlign: 'center', color: '#78716C' }}>
                      No matching employee accounts found.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp, idx) => {
                    const badge = getBadgeStyle(emp.accountType);
                    const isActive = (emp.status || 'Active') === 'Active';
                    return (
                      <tr key={emp.id || emp.username || idx} style={{ borderBottom: '1px solid #F5F5F4', background: isActive ? '#FFFFFF' : '#FAFAFA' }}>
                        <td style={{ padding: '0.95rem 1.25rem', width: '240px', minWidth: '230px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
                              background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.88rem'
                            }}>
                              {(emp.name || 'U').trim().split(/\s+/).map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 800, color: '#1C1917', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>{emp.name}</div>
                              <div style={{ fontSize: '0.75rem', color: '#78716C', fontWeight: 700, whiteSpace: 'nowrap' }}>{emp.id} • {emp.position}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '0.95rem 1rem', width: '210px', minWidth: '200px' }}>
                          {emp.accountType === 'staff' ? (
                            emp.id === 'STAFF-CENTRAL' ? (
                              <div>
                                <div style={{ fontWeight: 800, color: '#1D4ED8', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  <ChefHat size={14} color="#1D4ED8" /> @{emp.username} (Shared)
                                </div>
                                <div style={{ fontSize: '0.74rem', color: '#57534E', marginTop: '2px' }}>
                                  {emp.email}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div style={{ fontWeight: 800, color: '#1D4ED8', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <ChefHat size={13} color="#2563EB" /> Shared Login: @staff
                                </div>
                                <div style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '3px',
                                  background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '2px 8px',
                                  borderRadius: '6px', fontSize: '0.73rem', fontWeight: 800, color: '#1E40AF'
                                }}>
                                  <Key size={11} /> Terminal PIN: <strong>{emp.pin || '2011'}</strong>
                                </div>
                              </div>
                            )
                          ) : (
                            <div>
                              <div style={{ fontWeight: 700, color: '#1C1917', fontFamily: 'monospace', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                                @{emp.username}
                              </div>
                              <div style={{ fontSize: '0.76rem', color: '#57534E', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', whiteSpace: 'nowrap' }}>
                                <Mail size={12} color="#A8A29E" style={{ flexShrink: 0 }} />
                                <span>{emp.email}</span>
                              </div>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.95rem 1rem', width: '180px', minWidth: '170px' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                            padding: '3px 9px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 800,
                            background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`,
                            whiteSpace: 'nowrap'
                          }}>
                            {badge.icon} {badge.label}
                          </span>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#292524', marginTop: '4px', whiteSpace: 'nowrap' }}>
                            {emp.role}
                          </div>
                        </td>
                        <td style={{ padding: '0.95rem 1rem', width: '210px', minWidth: '200px' }}>
                          <div style={{ fontWeight: 600, color: '#1C1917', fontSize: '0.81rem', whiteSpace: 'nowrap' }}>{emp.department}</div>
                          <div style={{ fontSize: '0.74rem', color: '#78716C', marginTop: '2px', whiteSpace: 'nowrap' }}>{emp.shift}</div>
                        </td>
                        <td style={{ padding: '0.95rem 1rem', width: '160px', minWidth: '150px', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#44403C', fontSize: '0.8rem' }}>
                            <Phone size={12} color="#A8A29E" style={{ flexShrink: 0 }} />
                            <span>{emp.contact || 'N/A'}</span>
                          </div>
                          {emp.accountType === 'cashier' && (
                            <div style={{ fontSize: '0.72rem', color: '#047857', fontWeight: 700, marginTop: '3px' }}>
                              Float: ₱{Number(emp.openingFloat || 5000).toLocaleString()}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.95rem 1rem', width: '170px', minWidth: '160px', whiteSpace: 'nowrap', fontSize: '0.76rem', color: '#57534E' }}>
                          <div>Created: <strong>{emp.createdAt ? new Date(emp.createdAt).toLocaleDateString() : 'N/A'}</strong></div>
                          <div style={{ color: '#059669', fontWeight: 600, marginTop: '2px' }}>
                            Last Login: {emp.lastLogin ? new Date(emp.lastLogin).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'}
                          </div>
                        </td>
                        <td style={{ padding: '0.95rem 1rem', width: '110px', minWidth: '100px', whiteSpace: 'nowrap' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                            padding: '4px 10px', borderRadius: '999px', fontSize: '0.74rem', fontWeight: 800,
                            background: isActive ? '#ECFDF5' : '#FEF2F2',
                            color: isActive ? '#047857' : '#B91C1C',
                            border: `1px solid ${isActive ? '#A7F3D0' : '#FECACA'}`
                          }}>
                            {isActive ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                            {emp.status || 'Active'}
                          </span>
                        </td>
                        <td style={{ padding: '0.95rem 1.25rem', width: '280px', minWidth: '270px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', whiteSpace: 'nowrap' }}>
                            <button
                              title="View Individual Account Activity"
                              onClick={() => setActivityTarget(emp)}
                              style={{
                                padding: '6px 9px', borderRadius: '8px', border: '1px solid #E7E5E4',
                                background: '#FAF8F5', color: '#44403C', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.74rem', fontWeight: 700
                              }}
                            >
                              <Activity size={13} /> Activity
                            </button>
                            <button
                              title="Edit Account Details & Role Permissions"
                              onClick={() => openEditModal(emp)}
                              style={{
                                padding: '6px 9px', borderRadius: '8px', border: '1px solid #E7E5E4',
                                background: '#FFFFFF', color: '#1C1917', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.74rem', fontWeight: 700
                              }}
                            >
                              <Edit2 size={13} /> Edit
                            </button>
                            {emp.accountType === 'staff' && emp.id !== 'STAFF-CENTRAL' ? (
                              <button
                                title="Update Terminal Identification PIN"
                                onClick={() => {
                                  setPinUpdateTarget(emp);
                                  setNewPinInput(emp.pin || '2011');
                                }}
                                style={{
                                  padding: '6px 9px', borderRadius: '8px', border: '1px solid #BFDBFE',
                                  background: '#EFF6FF', color: '#1D4ED8', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.74rem', fontWeight: 700
                                }}
                              >
                                <Key size={13} /> Update PIN
                              </button>
                            ) : (
                              <button
                                title="Reset Login Password"
                                onClick={() => {
                                  setPasswordResetTarget(emp);
                                  setNewPasswordInput('');
                                }}
                                style={{
                                  padding: '6px 9px', borderRadius: '8px', border: '1px solid #FED7AA',
                                  background: '#FFF7ED', color: '#C24522', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.74rem', fontWeight: 700
                                }}
                              >
                                <Key size={13} /> Reset PW
                              </button>
                            )}
                            {emp.id !== 'EMP-001' ? (
                              <>
                                <button
                                  title={isActive ? 'Deactivate Account' : 'Activate Account'}
                                  onClick={() => handleToggleStatus(emp)}
                                  style={{
                                    padding: '6px 9px', borderRadius: '8px',
                                    border: `1px solid ${isActive ? '#FECACA' : '#A7F3D0'}`,
                                    background: isActive ? '#FEF2F2' : '#ECFDF5',
                                    color: isActive ? '#B91C1C' : '#047857',
                                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.74rem', fontWeight: 700
                                  }}
                                >
                                  <Power size={13} /> {isActive ? 'Deactivate' : 'Activate'}
                                </button>
                                <button
                                  title="Delete Account"
                                  onClick={() => handleDeleteAccount(emp)}
                                  style={{
                                    padding: '6px', borderRadius: '8px', border: '1px solid #E7E5E4',
                                    background: '#FFFFFF', color: '#EF4444', cursor: 'pointer', display: 'inline-flex', alignItems: 'center'
                                  }}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </>
                            ) : (
                              <span style={{
                                padding: '4px 8px', borderRadius: '6px', background: '#F5F5F4',
                                color: '#78716C', fontSize: '0.7rem', fontWeight: 700, border: '1px solid #E7E5E4'
                              }}>
                                Root Admin
                              </span>
                            )}
                          </div>
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

      {/* Modal: Add / Edit Employee Account */}
      {showFormModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(28, 25, 23, 0.58)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000, padding: '1rem'
        }}>
          <div style={{
            background: '#FFFFFF', borderRadius: '20px', width: '100%', maxWidth: '680px',
            maxHeight: '90vh', overflowY: 'auto', border: '1px solid #E7E5E4',
            boxShadow: '0 24px 48px rgba(0,0,0,0.22)'
          }}>
            <div style={{
              padding: '1.25rem 1.5rem', borderBottom: '1px solid #E7E5E4',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAF8F5'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1C1917' }}>
                  {editingAccount ? `Edit Account • ${editingAccount.name} (${editingAccount.id})` : 'Create New Employee Account'}
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#78716C' }}>
                  Assign account type, login credentials, shift schedule, and role-based dashboard permissions.
                </p>
              </div>
              <button onClick={() => setShowFormModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#78716C' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveAccount} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              {/* Account Type Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#44403C', marginBottom: '6px', textTransform: 'uppercase' }}>
                  1. Select Account Type & Dedicated Dashboard
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
                  {[
                    { id: 'admin', label: 'Administrator', desc: 'Full Admin Panel & Reports Approval', color: '#B91C1C' },
                    { id: 'cashier', label: 'Cashier Account', desc: 'POS Terminal, Payments & Cashier Report', color: '#047857' },
                    { id: 'staff', label: 'Staff Account', desc: 'Tasks, Kitchen Prep, Table Calls & Staff Report', color: '#1D4ED8' }
                  ].map(t => {
                    const selected = formData.accountType === t.id;
                    return (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => handleAccountTypeChange(t.id)}
                        style={{
                          padding: '0.75rem', borderRadius: '12px', textAlign: 'left', cursor: 'pointer',
                          border: selected ? `2px solid ${t.color}` : '1px solid #E7E5E4',
                          background: selected ? `${t.color}0D` : '#FAF8F5'
                        }}
                      >
                        <div style={{ fontWeight: 800, fontSize: '0.84rem', color: selected ? t.color : '#1C1917' }}>{t.label}</div>
                        <div style={{ fontSize: '0.72rem', color: '#78716C', marginTop: '2px' }}>{t.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Personal & Login Credentials */}
              {formData.accountType === 'staff' ? (
                <div style={{ background: '#EFF6FF', padding: '1rem', borderRadius: '12px', border: '1px solid #BFDBFE', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1E40AF', fontSize: '0.82rem', fontWeight: 800 }}>
                    <ChefHat size={16} /> CENTRALIZED ONE STAFF ACCOUNT ACTIVE (SHARED LOGIN: @staff / staff123)
                  </div>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#1E3A8A', lineHeight: 1.4 }}>
                    All staff log into the terminal using the single shared Staff Account credentials. Register this employee&rsquo;s identifiable personnel record and 4-digit workstation verification PIN below.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1E3A8A', marginBottom: '4px' }}>Full Employee Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Master Chef Kenji"
                        style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '10px', border: '1px solid #93C5FD', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1E3A8A', marginBottom: '4px' }}>4-Digit Terminal Verification PIN *</label>
                      <input
                        type="text"
                        required
                        maxLength={4}
                        value={formData.pin || ''}
                        onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '') })}
                        placeholder="e.g. 2011"
                        style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '10px', border: '1px solid #93C5FD', fontSize: '0.85rem', fontWeight: 800, letterSpacing: '2px' }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#44403C', marginBottom: '4px' }}>Full Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Elena Cruz"
                      style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '10px', border: '1px solid #D6D3D1', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#44403C', marginBottom: '4px' }}>Username *</label>
                    <input
                      type="text"
                      required
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="e.g. cashier.elena"
                      style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '10px', border: '1px solid #D6D3D1', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#44403C', marginBottom: '4px' }}>Login Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g. cashier.elena@umamicraft.com"
                      style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '10px', border: '1px solid #D6D3D1', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#44403C', marginBottom: '4px' }}>
                      {editingAccount ? 'New Password (leave blank to keep current)' : 'Initial Login Password *'}
                    </label>
                    <input
                      type="text"
                      required={!editingAccount}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder={editingAccount ? 'Unchanged' : 'Enter password'}
                      style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '10px', border: '1px solid #D6D3D1', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>
              )}

              {/* Role, Position, Department, Shift */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#44403C', marginBottom: '4px' }}>Assigned Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '10px', border: '1px solid #D6D3D1', fontSize: '0.85rem' }}
                  >
                    {(ROLE_OPTIONS_BY_TYPE[formData.accountType] || ['Staff']).map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#44403C', marginBottom: '4px' }}>Job Title / Position</label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '10px', border: '1px solid #D6D3D1', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#44403C', marginBottom: '4px' }}>Station / Department</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '10px', border: '1px solid #D6D3D1', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#44403C', marginBottom: '4px' }}>Assigned Shift Schedule</label>
                  <input
                    type="text"
                    value={formData.shift}
                    onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '10px', border: '1px solid #D6D3D1', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#44403C', marginBottom: '4px' }}>Contact Number</label>
                  <input
                    type="text"
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '10px', border: '1px solid #D6D3D1', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#44403C', marginBottom: '4px' }}>Account Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '10px', border: '1px solid #D6D3D1', fontSize: '0.85rem' }}
                  >
                    <option value="Active">Active (Allowed to Login)</option>
                    <option value="Inactive">Inactive (Login Blocked)</option>
                  </select>
                </div>
              </div>

              {formData.accountType === 'cashier' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem', background: '#ECFDF5', padding: '0.9rem', borderRadius: '12px', border: '1px solid #A7F3D0' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: '#065F46', marginBottom: '4px' }}>Assigned POS Register</label>
                    <input
                      type="text"
                      value={formData.registerId}
                      onChange={(e) => setFormData({ ...formData, registerId: e.target.value })}
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #6EE7B7', fontSize: '0.84rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: '#065F46', marginBottom: '4px' }}>Beginning Cash Float (₱)</label>
                    <input
                      type="number"
                      value={formData.openingFloat}
                      onChange={(e) => setFormData({ ...formData, openingFloat: Number(e.target.value) })}
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #6EE7B7', fontSize: '0.84rem' }}
                    />
                  </div>
                </div>
              )}

              {/* Role Permissions Checkboxes */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#44403C', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Authorized Module Permissions ({formData.accountType.toUpperCase()})
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', background: '#FAF8F5', padding: '0.85rem', borderRadius: '12px', border: '1px solid #E7E5E4' }}>
                  {(PERMISSION_CATALOG[formData.accountType] || []).map(perm => {
                    const checked = formData.permissions.includes(perm.id);
                    return (
                      <label
                        key={perm.id}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 600, color: '#1C1917', cursor: 'pointer' }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePermission(perm.id)}
                          style={{ accentColor: '#C24522' }}
                        />
                        {perm.label}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  style={{ padding: '0.65rem 1.2rem', borderRadius: '10px', border: '1px solid #D6D3D1', background: '#FFFFFF', color: '#44403C', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.65rem 1.4rem', borderRadius: '10px', border: 'none',
                    background: '#C24522', color: '#FFFFFF', fontWeight: 800, cursor: 'pointer'
                  }}
                >
                  {editingAccount ? 'Save Account Changes' : 'Create Employee Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reset Password */}
      {passwordResetTarget && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(28, 25, 23, 0.58)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9100, padding: '1rem'
        }}>
          <div style={{
            background: '#FFFFFF', borderRadius: '18px', width: '100%', maxWidth: '420px',
            padding: '1.5rem', border: '1px solid #E7E5E4', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', fontWeight: 800, color: '#1C1917' }}>
              Reset Password • {passwordResetTarget.name}
            </h3>
            <p style={{ margin: '0 0 1rem', fontSize: '0.82rem', color: '#78716C' }}>
              Assign a new login password for <strong>@{passwordResetTarget.username}</strong> ({passwordResetTarget.role}).
            </p>
            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <input
                type="text"
                required
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                placeholder="Enter new password (e.g. cashier123)"
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid #D6D3D1', fontSize: '0.88rem' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
                <button
                  type="button"
                  onClick={() => setPasswordResetTarget(null)}
                  style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: '1px solid #D6D3D1', background: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '0.55rem 1.15rem', borderRadius: '8px', border: 'none', background: '#C24522', color: '#FFFFFF', fontWeight: 800, cursor: 'pointer' }}
                >
                  Confirm Password Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Update Staff Terminal PIN */}
      {pinUpdateTarget && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(28, 25, 23, 0.58)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9100, padding: '1rem'
        }}>
          <div style={{
            background: '#FFFFFF', borderRadius: '18px', width: '100%', maxWidth: '420px',
            padding: '1.5rem', border: '1px solid #E7E5E4', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Key size={18} color="#1D4ED8" />
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1C1917' }}>
                Update Workstation PIN • {pinUpdateTarget.name}
              </h3>
            </div>
            <p style={{ margin: '0 0 1rem', fontSize: '0.82rem', color: '#78716C', lineHeight: 1.4 }}>
              Set a new 4-digit verification PIN used by <strong>{pinUpdateTarget.name}</strong> ({pinUpdateTarget.id}) to verify their terminal sessions and attendance records.
            </p>
            <form onSubmit={handleUpdatePin} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#44403C', marginBottom: '4px' }}>
                  4-Digit Numeric PIN *
                </label>
                <input
                  type="text"
                  required
                  maxLength={4}
                  autoFocus
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 2011"
                  style={{
                    width: '100%', padding: '0.7rem 0.85rem', borderRadius: '10px',
                    border: '1px solid #93C5FD', fontSize: '1.1rem', fontWeight: 900,
                    letterSpacing: '4px', textAlign: 'center', background: '#EFF6FF', color: '#1E40AF'
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
                <button
                  type="button"
                  onClick={() => setPinUpdateTarget(null)}
                  style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: '1px solid #D6D3D1', background: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '0.55rem 1.15rem', borderRadius: '8px', border: 'none', background: '#1D4ED8', color: '#FFFFFF', fontWeight: 800, cursor: 'pointer' }}
                >
                  Save New PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Individual Account Activity History */}
      {activityTarget && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(28, 25, 23, 0.58)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9100, padding: '1rem'
        }}>
          <div style={{
            background: '#FFFFFF', borderRadius: '18px', width: '100%', maxWidth: '640px',
            maxHeight: '85vh', overflowY: 'auto', padding: '1.5rem', border: '1px solid #E7E5E4'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1C1917' }}>
                  Account Activity History • {activityTarget.name} ({activityTarget.id})
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#78716C' }}>
                  @{activityTarget.username} • {activityTarget.role} • {activityTarget.department}
                </p>
              </div>
              <button onClick={() => setActivityTarget(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#78716C' }}>
                <X size={20} />
              </button>
            </div>

            {individualLogs.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#78716C', background: '#FAF8F5', borderRadius: '12px' }}>
                No recorded activity entries yet for this account.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {individualLogs.map(log => (
                  <div key={log.id} style={{ padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid #E7E5E4', background: '#FAF8F5' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 800, color: '#1C1917', fontSize: '0.85rem' }}>{log.action}</span>
                      <span style={{ fontSize: '0.74rem', color: '#78716C' }}>{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#C24522', fontWeight: 700 }}>{log.target}</div>
                    <div style={{ fontSize: '0.78rem', color: '#57534E', marginTop: '2px' }}>{log.details}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem' }}>
              {onNavigateToReports && (
                <button
                  onClick={() => {
                    const targetRole = activityTarget.accountType;
                    setActivityTarget(null);
                    onNavigateToReports(targetRole);
                  }}
                  style={{
                    padding: '0.55rem 1rem', borderRadius: '8px', border: '1px solid #C24522',
                    background: '#FFF7ED', color: '#C24522', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer'
                  }}
                >
                  View Daily Reports for {activityTarget.name}
                </button>
              )}
              <button
                onClick={() => setActivityTarget(null)}
                style={{ padding: '0.55rem 1.2rem', borderRadius: '8px', border: '1px solid #D6D3D1', background: '#FFFFFF', fontWeight: 700, cursor: 'pointer', marginLeft: 'auto' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

