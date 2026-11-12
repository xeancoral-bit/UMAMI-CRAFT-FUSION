import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ChefHat, CheckSquare, Utensils, Bell, Activity, FileText, Plus, CheckCircle2,
  AlertTriangle, Play, Check, Send, Save, LogOut,
  Lock, ShieldAlert, Store, Footprints, RefreshCw
} from 'lucide-react';
import {
  fetchStaffTasksList,
  saveLocalStaffTasks,
  fetchAuditLogsList,
  appendLocalAuditLog,
  fetchDailyReportsList,
  saveLocalDailyReports
} from '../utils/systemStore';

export default function StaffDashboard({
  socket,
  currentUser,
  onLogout,
  onLock,
  onLockSession,
  onNavigateModule
}) {
  const [activeSection, setActiveSection] = useState('tasks'); // 'tasks' | 'kitchen' | 'table-service' | 'activity' | 'daily-report'
  const [tasks, setTasks] = useState([]);
  const [orders, setOrders] = useState([]);
  const [serviceRequests, setServiceRequests] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [myReports, setMyReports] = useState([]);
  const [toast, setToast] = useState(null);

  // Task Filters & New Task Modal
  const [taskStatusFilter, setTaskStatusFilter] = useState('All');
  const [taskScopeFilter, setTaskScopeFilter] = useState('all'); // 'mine' | 'all'
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('Kitchen Prep');
  const [newTaskPriority, setNewTaskPriority] = useState('High');

  // Staff Daily Report State
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [clockIn, setClockIn] = useState('07:30 AM');
  const [clockOut, setClockOut] = useState('04:00 PM');
  const [incidentsReported, setIncidentsReported] = useState('None. All allergen isolation protocols and station sanitation checks completed.');
  const [staffRemarks, setStaffRemarks] = useState('All assigned station prep, kitchen tickets, and floor assistance requests handled on schedule.');
  const [submittingReport, setSubmittingReport] = useState(false);

  const employeeId = currentUser?.employeeId || currentUser?.id || 'EMP-201';
  const employeeName = currentUser?.name || 'Master Chef Kenji';
  const employeeRole = currentUser?.role || 'Kitchen Staff';
  const assignedStation = currentUser?.department || currentUser?.station || 'Kitchen & Allergen Station';
  const shiftSchedule = currentUser?.shift || 'Morning Shift (07:30 AM - 04:00 PM)';
  const handleLockAction = onLockSession || onLock;

  const showToastMsg = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchStaffData = useCallback(async () => {
    try {
      const [tskData, logData, rptData] = await Promise.all([
        fetchStaffTasksList(),
        fetchAuditLogsList(),
        fetchDailyReportsList()
      ]);
      if (Array.isArray(tskData)) setTasks(tskData);
      if (Array.isArray(logData)) setAuditLogs(logData);
      if (Array.isArray(rptData)) {
        setMyReports(rptData.filter(r => r.reportType === 'staff' || r.employeeId === employeeId));
      }

      const [ordRes, srvRes] = await Promise.all([
        fetch('/api/orders').catch(() => null),
        fetch('/api/service-requests').catch(() => null)
      ]);
      if (ordRes && ordRes.ok) {
        const ordData = await ordRes.json();
        if (Array.isArray(ordData)) setOrders(ordData);
      }
      if (srvRes && srvRes.ok) {
        const srvData = await srvRes.json();
        if (Array.isArray(srvData)) setServiceRequests(srvData);
      }
    } catch (err) {
      console.error('[StaffDashboard] Failed to load data:', err);
    }
  }, [employeeId]);

  useEffect(() => {
    fetchStaffData();
    const onSystemSync = () => fetchStaffData();
    window.addEventListener('umami-system-sync', onSystemSync);
    return () => window.removeEventListener('umami-system-sync', onSystemSync);
  }, [fetchStaffData]);

  useEffect(() => {
    if (!socket) return;
    const onTasksUpdated = (list) => {
      if (Array.isArray(list)) {
        setTasks(list);
        saveLocalStaffTasks(list);
      }
    };
    const onNewOrder = (newOrd) => {
      setOrders(prev => [newOrd, ...prev.filter(o => (o.orderId || o.id) !== (newOrd.orderId || newOrd.id))]);
    };
    const onOrderStatus = (payload) => {
      const updated = payload?.order || payload;
      if (!updated) return;
      const targetId = updated.orderId || updated.id;
      setOrders(prev => prev.map(o => ((o.orderId || o.id) === targetId ? { ...o, ...updated } : o)));
    };
    const onNewServiceReq = (reqItem) => {
      setServiceRequests(prev => [reqItem, ...prev.filter(r => r.id !== reqItem.id)]);
    };
    const onServiceReqUpdated = (reqItem) => {
      setServiceRequests(prev => prev.map(r => (r.id === reqItem.id ? reqItem : r)));
    };
    const onReportsUpdated = (allReports) => {
      if (Array.isArray(allReports)) {
        saveLocalDailyReports(allReports);
        setMyReports(allReports.filter(r => r.reportType === 'staff' || r.employeeId === employeeId));
      }
    };

    socket.on('staff-tasks-updated', onTasksUpdated);
    socket.on('new-order', onNewOrder);
    socket.on('new-kitchen-order', onNewOrder);
    socket.on('order-status-updated', onOrderStatus);
    socket.on('new-service-request', onNewServiceReq);
    socket.on('service-request-updated', onServiceReqUpdated);
    socket.on('daily-reports-updated', onReportsUpdated);
    return () => {
      socket.off('staff-tasks-updated', onTasksUpdated);
      socket.off('new-order', onNewOrder);
      socket.off('new-kitchen-order', onNewOrder);
      socket.off('order-status-updated', onOrderStatus);
      socket.off('new-service-request', onNewServiceReq);
      socket.off('service-request-updated', onServiceReqUpdated);
      socket.off('daily-reports-updated', onReportsUpdated);
    };
  }, [socket, employeeId]);

  const handleUpdateTaskStatus = async (task, nextStatus) => {
    const nowIso = new Date().toISOString();
    const updatedTasks = tasks.map(t =>
      t.id === task.id
        ? { ...t, status: nextStatus, completedAt: nextStatus === 'Completed' ? nowIso : null }
        : t
    );
    setTasks(updatedTasks);
    saveLocalStaffTasks(updatedTasks);

    const logItem = appendLocalAuditLog({
      actorId: employeeId,
      actorName: employeeName,
      actorRole: employeeRole,
      accountType: 'staff',
      category: 'Staff Operations',
      action: `Task Status Updated (${nextStatus})`,
      target: `${task.id} (${task.title})`,
      details: `${employeeName} updated task "${task.title}" to ${nextStatus}.`,
      status: 'Success'
    });
    setAuditLogs(prev => [logItem, ...prev]);

    try {
      const res = await fetch(`/api/staff-tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus,
          actorId: employeeId,
          actorName: employeeName
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.tasks)) {
          setTasks(data.tasks);
          saveLocalStaffTasks(data.tasks);
        }
      }
    } catch {}
    showToastMsg(`Task "${task.title}" marked as ${nextStatus}.`);
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const newTaskObj = {
      id: `TSK-${Date.now().toString().slice(-4)}`,
      employeeId,
      employeeName,
      role: employeeRole,
      department: assignedStation,
      station: assignedStation,
      title: newTaskTitle.trim(),
      description: newTaskDesc.trim() || 'Operational duty logged during active shift.',
      category: newTaskCategory,
      priority: newTaskPriority,
      status: 'Pending',
      shift: shiftSchedule,
      assignedAt: new Date().toISOString(),
      completedAt: null
    };

    const nextList = [newTaskObj, ...tasks];
    setTasks(nextList);
    saveLocalStaffTasks(nextList);
    setShowAddTaskModal(false);
    setNewTaskTitle('');
    setNewTaskDesc('');

    const logItem = appendLocalAuditLog({
      actorId: employeeId,
      actorName: employeeName,
      actorRole: employeeRole,
      accountType: 'staff',
      category: 'Staff Operations',
      action: 'Shift Task Logged',
      target: `${newTaskObj.id} (${newTaskObj.title})`,
      details: `${employeeName} logged new shift task "${newTaskObj.title}" [${newTaskObj.priority}].`,
      status: 'Success'
    });
    setAuditLogs(prev => [logItem, ...prev]);

    try {
      const res = await fetch('/api/staff-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTaskObj)
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.tasks)) {
          setTasks(data.tasks);
          saveLocalStaffTasks(data.tasks);
        }
      }
    } catch {}
    showToastMsg(`Added new operational task: "${newTaskObj.title}".`);
  };

  const handleUpdateKitchenOrder = async (order, nextStatus) => {
    const id = order.orderId || order.id;
    try {
      const res = await fetch(`/api/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus,
          updatedBy: `${employeeName} (${employeeRole})`
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setOrders(prev => prev.map(o => ((o.orderId || o.id) === id ? updated : o)));
      } else {
        setOrders(prev => prev.map(o => ((o.orderId || o.id) === id ? { ...o, status: nextStatus } : o)));
      }
      const logItem = appendLocalAuditLog({
        actorId: employeeId,
        actorName: employeeName,
        actorRole: employeeRole,
        accountType: 'staff',
        category: 'Kitchen & Order Prep',
        action: `Order Status Updated (${nextStatus})`,
        target: `Order #${id}`,
        details: `${employeeName} updated Order #${id} (${order.tableNumber || 'Counter'}) to "${nextStatus}".`,
        status: 'Success'
      });
      setAuditLogs(prev => [logItem, ...prev]);
      showToastMsg(`Order #${id} updated to "${nextStatus}".`);
    } catch {
      showToastMsg('Failed to update kitchen order status.', 'error');
    }
  };

  const handleUpdateServiceRequest = async (reqItem, nextStatus) => {
    try {
      const res = await fetch(`/api/service-requests/${reqItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus,
          staffName: `${employeeName} (${employeeRole})`
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.request) {
        setServiceRequests(prev => prev.map(r => (r.id === reqItem.id ? data.request : r)));
      } else {
        setServiceRequests(prev => prev.map(r => (r.id === reqItem.id ? { ...r, status: nextStatus, attendedBy: employeeName } : r)));
      }
      const logItem = appendLocalAuditLog({
        actorId: employeeId,
        actorName: employeeName,
        actorRole: employeeRole,
        accountType: 'staff',
        category: 'Table Service',
        action: `Table Call ${nextStatus}`,
        target: `${reqItem.tableNumber} (${reqItem.category})`,
        details: `${employeeName} marked ${reqItem.tableNumber} assistance request (${reqItem.category}) as ${nextStatus}.`,
        status: 'Success'
      });
      setAuditLogs(prev => [logItem, ...prev]);
      showToastMsg(`Table assistance request ${reqItem.id} marked as ${nextStatus}.`);
    } catch {
      showToastMsg('Failed to update service request.', 'error');
    }
  };

  // Live Staff Daily Report Metrics Computed from Actual Records
  const liveStaffMetrics = useMemo(() => {
    const myTasks = tasks.filter(t => t.employeeId === employeeId);
    const activePool = taskScopeFilter === 'mine' && myTasks.length > 0 ? myTasks : (myTasks.length > 0 ? myTasks : tasks);

    const completedTasks = activePool.filter(t => t.status === 'Completed');
    const inProgressTasks = activePool.filter(t => t.status === 'In Progress');
    const pendingTasks = activePool.filter(t => t.status === 'Pending');
    const cancelledTasks = activePool.filter(t => t.status === 'Cancelled');

    const preppedOrdersCount = orders.filter(o =>
      ['Preparing', 'Ready for Pickup', 'Out for Delivery', 'Completed', 'Order Ready', 'Ready'].includes(o.status)
    ).length;

    const handledTableCallsCount = serviceRequests.filter(r =>
      r.status === 'Completed' || r.status === 'Acknowledged'
    ).length;

    return {
      totalAssigned: activePool.length,
      completedCount: completedTasks.length,
      inProgressCount: inProgressTasks.length,
      pendingCount: pendingTasks.length + inProgressTasks.length,
      cancelledCount: cancelledTasks.length,
      completedTitles: completedTasks.map(t => t.title),
      pendingTitles: [...inProgressTasks, ...pendingTasks].map(t => t.title),
      preppedOrdersCount: preppedOrdersCount || orders.length,
      handledTableCallsCount: handledTableCallsCount || serviceRequests.length
    };
  }, [tasks, orders, serviceRequests, employeeId, taskScopeFilter]);

  const handleSubmitStaffReport = async (targetStatus = 'Pending Review') => {
    setSubmittingReport(true);
    try {
      const payload = {
        id: `RPT-STF-${Date.now().toString().slice(-5)}`,
        reportDate,
        employeeId,
        employeeName,
        role: employeeRole,
        position: currentUser?.position || 'Operations Staff',
        shift: shiftSchedule,
        attendance: {
          status: 'Present',
          clockIn,
          clockOut,
          totalHours: 8.5,
          breakMinutes: 45,
          isLate: false
        },
        reportType: 'staff',
        reportStatus: targetStatus,
        employeeNotes: staffRemarks,
        submittedAt: new Date().toISOString(),
        staffData: {
          assignedStation,
          totalAssignedTasks: liveStaffMetrics.totalAssigned,
          tasksCompleted: liveStaffMetrics.completedTitles,
          tasksPending: liveStaffMetrics.pendingTitles,
          kitchenOrdersHandled: liveStaffMetrics.preppedOrdersCount,
          tableServiceCallsHandled: liveStaffMetrics.handledTableCallsCount,
          incidentsReported
        }
      };

      // Always persist to synchronized local store immediately
      const existingReports = await fetchDailyReportsList();
      const existingIdx = existingReports.findIndex(
        r => r.employeeId === employeeId && r.reportDate === reportDate
      );
      let savedReport = payload;
      let nextReports;
      if (existingIdx !== -1) {
        savedReport = { ...existingReports[existingIdx], ...payload, id: existingReports[existingIdx].id };
        nextReports = [...existingReports];
        nextReports[existingIdx] = savedReport;
      } else {
        nextReports = [savedReport, ...existingReports];
      }
      saveLocalDailyReports(nextReports);
      setMyReports(nextReports.filter(r => r.reportType === 'staff' || r.employeeId === employeeId));

      // Also post to backend API
      try {
        const res = await fetch('/api/daily-reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.report) savedReport = data.report;
        }
      } catch {}

      const logItem = appendLocalAuditLog({
        actorId: employeeId,
        actorName: employeeName,
        actorRole: employeeRole,
        accountType: 'staff',
        category: 'Daily Reports',
        action: targetStatus === 'Draft' ? 'Staff Daily Report Draft Saved' : 'Staff Daily Report Submitted',
        target: `${savedReport.id} (${reportDate})`,
        details: `${employeeName} (${employeeRole}) ${targetStatus === 'Draft' ? 'saved a draft' : 'submitted'} Staff Daily Report (${liveStaffMetrics.completedCount} completed tasks, ${liveStaffMetrics.preppedOrdersCount} orders prepped).`,
        status: 'Success'
      });
      setAuditLogs(prev => [logItem, ...prev]);

      showToastMsg(
        targetStatus === 'Draft'
          ? `Staff Daily Report saved as Draft (${savedReport.id}).`
          : `Staff Daily Report (${savedReport.id}) submitted to Administrator for review!`
      );
    } catch {
      showToastMsg('Error submitting Staff Daily Report.', 'error');
    } finally {
      setSubmittingReport(false);
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (taskScopeFilter === 'mine' && t.employeeId !== employeeId) return false;
      if (taskStatusFilter !== 'All' && t.status !== taskStatusFilter) return false;
      return true;
    });
  }, [tasks, taskStatusFilter, taskScopeFilter, employeeId]);

  return (
    <div style={{ minHeight: '100vh', background: '#FAF8F5', color: '#1C1917', display: 'flex', flexDirection: 'column' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '24px', zIndex: 9999,
          background: toast.type === 'error' ? '#991B1B' : '#1E40AF',
          color: '#FFFFFF', padding: '0.85rem 1.25rem', borderRadius: '12px',
          boxShadow: '0 12px 30px rgba(0,0,0,0.18)', display: 'flex', alignItems: 'center', gap: '10px',
          fontWeight: 700, fontSize: '0.88rem'
        }}>
          {toast.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Staff Header Bar */}
      <header style={{
        background: '#FFFFFF', borderBottom: '1px solid #E7E5E4', padding: '0.9rem 1.75rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem',
        position: 'sticky', top: 0, zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', color: '#FFFFFF',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900,
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
          }}>
            <ChefHat size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 900, fontSize: '1.05rem', color: '#1C1917', letterSpacing: '-0.02em' }}>
                UMAMI CRAFT FUSION • STAFF OPERATIONS DASHBOARD
              </span>
              <span style={{
                padding: '2px 9px', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 800,
                background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE'
              }}>
                STAFF ACCOUNT ({employeeRole.toUpperCase()})
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#78716C', fontWeight: 600 }}>
              Logged In: <strong>{employeeName}</strong> ({employeeId}) • Station: {assignedStation} • {shiftSchedule}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
          <div style={{
            padding: '0.45rem 0.9rem', borderRadius: '999px', background: '#EFF6FF',
            border: '1px solid #BFDBFE', color: '#1D4ED8', fontSize: '0.76rem', fontWeight: 800,
            display: 'flex', alignItems: 'center', gap: '6px'
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563EB' }} />
            {liveStaffMetrics.completedCount}/{liveStaffMetrics.totalAssigned} Tasks Done • {liveStaffMetrics.preppedOrdersCount} Orders Prepped
          </div>

          {onNavigateModule && (
            <>
              <button
                type="button"
                onClick={() => onNavigateModule('kitchen')}
                style={{
                  padding: '0.45rem 0.85rem', borderRadius: '10px', border: '1px solid #E7E5E4',
                  background: '#FAF8F5', color: '#1C1917', fontWeight: 700, fontSize: '0.76rem',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px'
                }}
                title="Open Full Kitchen Display System (KDS)"
              >
                <ChefHat size={14} color="#C24522" /> Kitchen KDS
              </button>
              <button
                type="button"
                onClick={() => onNavigateModule('busser')}
                style={{
                  padding: '0.45rem 0.85rem', borderRadius: '10px', border: '1px solid #E7E5E4',
                  background: '#FAF8F5', color: '#1C1917', fontWeight: 700, fontSize: '0.76rem',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px'
                }}
                title="Open Food Runner & Busser View"
              >
                <Footprints size={14} color="#059669" /> Busser View
              </button>
              <button
                type="button"
                onClick={() => onNavigateModule('restaurant')}
                style={{
                  padding: '0.45rem 0.85rem', borderRadius: '10px', border: '1px solid #E7E5E4',
                  background: '#FAF8F5', color: '#1C1917', fontWeight: 700, fontSize: '0.76rem',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px'
                }}
                title="Open Restaurant Floor Operations"
              >
                <Store size={14} color="#2563EB" /> Floor Ops
              </button>
            </>
          )}

          <button
            type="button"
            onClick={fetchStaffData}
            style={{
              padding: '0.45rem 0.75rem', borderRadius: '10px', border: '1px solid #E7E5E4',
              background: '#FFFFFF', color: '#44403C', fontWeight: 700, fontSize: '0.76rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px'
            }}
            title="Sync Latest Station Data"
          >
            <RefreshCw size={13} /> Sync
          </button>

          {handleLockAction && (
            <button
              type="button"
              onClick={handleLockAction}
              style={{
                padding: '0.5rem 0.95rem', borderRadius: '10px', border: '1px solid #FED7AA',
                background: '#FFF7ED', color: '#C24522', fontWeight: 700, fontSize: '0.8rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <Lock size={14} /> Lock
            </button>
          )}
          <button
            type="button"
            onClick={onLogout}
            style={{
              padding: '0.5rem 0.95rem', borderRadius: '10px', border: '1px solid #FECACA',
              background: '#FEF2F2', color: '#B91C1C', fontWeight: 700, fontSize: '0.8rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </header>

      {/* Main Layout: Dedicated Staff Sidebar + Active Operational Workspace */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <aside style={{
          width: '265px', background: '#FFFFFF', borderRight: '1px solid #E7E5E4',
          padding: '1.25rem 0.85rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flexShrink: 0
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ padding: '0 0.75rem 0.5rem', fontSize: '0.7rem', fontWeight: 800, color: '#A8A29E', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Staff Shift Responsibilities
            </div>
            {[
              { id: 'tasks', label: 'Assigned Tasks & Checklist', icon: <CheckSquare size={18} />, badge: `${liveStaffMetrics.completedCount}/${liveStaffMetrics.totalAssigned}` },
              { id: 'kitchen', label: 'Order Prep & Kitchen Queue', icon: <Utensils size={18} />, badge: orders.filter(o => o.status === 'New' || o.status === 'Preparing').length || orders.length || null },
              { id: 'table-service', label: 'Table Service & Guest Calls', icon: <Bell size={18} />, badge: serviceRequests.filter(r => r.status !== 'Completed').length || null },
              { id: 'activity', label: 'Shift Activity Records', icon: <Activity size={18} />, badge: auditLogs.length },
              { id: 'daily-report', label: 'Staff Daily Report', icon: <FileText size={18} />, badge: 'Submit' }
            ].map(item => {
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  style={{
                    width: '100%', padding: '0.75rem 0.9rem', borderRadius: '12px', border: 'none',
                    background: active ? 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' : 'transparent',
                    color: active ? '#FFFFFF' : '#44403C',
                    fontWeight: active ? 800 : 600, fontSize: '0.85rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left',
                    transition: 'all 0.15s'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {item.icon}
                    {item.label}
                  </span>
                  {item.badge !== null && item.badge !== undefined && (
                    <span style={{
                      padding: '2px 7px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 800,
                      background: active ? 'rgba(255,255,255,0.22)' : '#EFF6FF',
                      color: active ? '#FFFFFF' : '#1D4ED8'
                    }}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div style={{
            background: '#FAF8F5', borderRadius: '14px', padding: '1rem',
            border: '1px solid #E7E5E4', marginTop: '1.5rem'
          }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#78716C', textTransform: 'uppercase' }}>
              Active Staff Profile
            </div>
            <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#1C1917', marginTop: '4px' }}>
              {employeeName}
            </div>
            <div style={{ fontSize: '0.76rem', color: '#57534E', marginTop: '2px' }}>
              {employeeId} • {assignedStation}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 700, marginTop: '6px' }}>
              ✓ Connected to Live Kitchen &amp; Admin Daily Reports
            </div>
          </div>
        </aside>

        {/* Main Content Workspace */}
        <main style={{ flex: 1, padding: '1.5rem 2rem', overflowY: 'auto' }}>
          {/* SECTION 1: ASSIGNED TASKS & SHIFT CHECKLIST */}
          {activeSection === 'tasks' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Summary Strip */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.9rem' }}>
                {[
                  { label: 'Assigned Shift Tasks', value: liveStaffMetrics.totalAssigned, color: '#1C1917', bg: '#FFFFFF' },
                  { label: 'Completed Tasks', value: liveStaffMetrics.completedCount, color: '#059669', bg: '#ECFDF5' },
                  { label: 'In Progress / Pending', value: liveStaffMetrics.pendingCount, color: '#2563EB', bg: '#EFF6FF' },
                  { label: 'Kitchen Orders Handled', value: liveStaffMetrics.preppedOrdersCount, color: '#C24522', bg: '#FFF7ED' }
                ].map((stat, i) => (
                  <div key={i} style={{ background: stat.bg, borderRadius: '14px', padding: '1rem 1.2rem', border: '1px solid #E7E5E4' }}>
                    <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#78716C', textTransform: 'uppercase' }}>{stat.label}</div>
                    <div style={{ fontSize: '1.55rem', fontWeight: 900, color: stat.color, marginTop: '4px' }}>{stat.value}</div>
                  </div>
                ))}
              </div>

              <div style={{
                background: '#FFFFFF', borderRadius: '16px', padding: '1.25rem 1.5rem',
                border: '1px solid #E7E5E4', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem'
              }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900 }}>Assigned Tasks &amp; Shift Operations Checklist</h2>
                  <p style={{ margin: '2px 0 0', fontSize: '0.84rem', color: '#78716C' }}>
                    Update your task progress in real time. All task updates automatically sync to your Staff Daily Report and Admin Panel.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ display: 'flex', background: '#FAF8F5', padding: '3px', borderRadius: '10px', border: '1px solid #E7E5E4' }}>
                    <button
                      type="button"
                      onClick={() => setTaskScopeFilter('all')}
                      style={{
                        padding: '0.4rem 0.75rem', borderRadius: '8px', border: 'none',
                        background: taskScopeFilter === 'all' ? '#1C1917' : 'transparent',
                        color: taskScopeFilter === 'all' ? '#FFFFFF' : '#57534E',
                        fontWeight: 700, fontSize: '0.76rem', cursor: 'pointer'
                      }}
                    >
                      All Station Tasks ({tasks.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaskScopeFilter('mine')}
                      style={{
                        padding: '0.4rem 0.75rem', borderRadius: '8px', border: 'none',
                        background: taskScopeFilter === 'mine' ? '#1C1917' : 'transparent',
                        color: taskScopeFilter === 'mine' ? '#FFFFFF' : '#57534E',
                        fontWeight: 700, fontSize: '0.76rem', cursor: 'pointer'
                      }}
                    >
                      My Tasks ({tasks.filter(t => t.employeeId === employeeId).length})
                    </button>
                  </div>

                  {['All', 'Pending', 'In Progress', 'Completed'].map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setTaskStatusFilter(st)}
                      style={{
                        padding: '0.5rem 0.9rem', borderRadius: '10px',
                        border: taskStatusFilter === st ? '1px solid #2563EB' : '1px solid #E7E5E4',
                        background: taskStatusFilter === st ? '#2563EB' : '#FAF8F5',
                        color: taskStatusFilter === st ? '#FFFFFF' : '#44403C',
                        fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer'
                      }}
                    >
                      {st}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setShowAddTaskModal(true)}
                    style={{
                      padding: '0.5rem 1rem', borderRadius: '10px', border: 'none',
                      background: '#C24522', color: '#FFFFFF', fontWeight: 800, fontSize: '0.8rem',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px'
                    }}
                  >
                    <Plus size={15} /> Log Shift Task
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
                {filteredTasks.map(task => {
                  const isDone = task.status === 'Completed';
                  const isProg = task.status === 'In Progress';
                  return (
                    <div
                      key={task.id}
                      style={{
                        background: '#FFFFFF', borderRadius: '16px', padding: '1.2rem',
                        border: isDone ? '1px solid #A7F3D0' : isProg ? '2px solid #2563EB' : '1px solid #E7E5E4',
                        display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.85rem'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#78716C' }}>
                            {task.id} • {task.category} • {task.priority || 'Normal'} Priority
                          </span>
                          <span style={{
                            padding: '3px 9px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 800,
                            background: isDone ? '#ECFDF5' : isProg ? '#EFF6FF' : '#FFF7ED',
                            color: isDone ? '#047857' : isProg ? '#1D4ED8' : '#C24522'
                          }}>
                            {task.status}
                          </span>
                        </div>
                        <h3 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 800, color: '#1C1917' }}>{task.title}</h3>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: '#57534E', lineHeight: 1.45 }}>{task.description}</p>
                        <div style={{ fontSize: '0.75rem', color: '#78716C', marginTop: '8px' }}>
                          Assigned to: <strong>{task.employeeName}</strong> ({task.station || task.department})
                        </div>
                      </div>

                      <div style={{ borderTop: '1px solid #F5F5F4', paddingTop: '0.75rem', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {task.status !== 'In Progress' && task.status !== 'Completed' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateTaskStatus(task, 'In Progress')}
                            style={{ flex: 1, padding: '7px 10px', borderRadius: '8px', border: 'none', background: '#2563EB', color: '#FFFFFF', fontWeight: 800, fontSize: '0.76rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                          >
                            <Play size={13} /> Start Task
                          </button>
                        )}
                        {task.status !== 'Completed' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateTaskStatus(task, 'Completed')}
                            style={{ flex: 1, padding: '7px 10px', borderRadius: '8px', border: 'none', background: '#059669', color: '#FFFFFF', fontWeight: 800, fontSize: '0.76rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                          >
                            <Check size={14} /> Mark Completed
                          </button>
                        )}
                        {task.status === 'Completed' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateTaskStatus(task, 'Pending')}
                            style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #D6D3D1', background: '#FAF8F5', color: '#57534E', fontWeight: 700, fontSize: '0.74rem', cursor: 'pointer' }}
                          >
                            Reopen Task
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 2: ORDER PREPARATION & KITCHEN STATUS */}
          {activeSection === 'kitchen' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '1.25rem 1.5rem', border: '1px solid #E7E5E4', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900 }}>Kitchen Order Preparation &amp; Allergen Safety Queue</h2>
                  <p style={{ margin: '2px 0 0', fontSize: '0.84rem', color: '#78716C' }}>
                    Connected live to Smart Kiosk, Mobile App, Cashier POS, and Kitchen Display System (KDS).
                  </p>
                </div>
                {onNavigateModule && (
                  <button
                    type="button"
                    onClick={() => onNavigateModule('kitchen')}
                    style={{
                      padding: '0.55rem 1rem', borderRadius: '10px', border: 'none',
                      background: '#C24522', color: '#FFFFFF', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer'
                    }}
                  >
                    Open Full Screen KDS
                  </button>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: '1rem' }}>
                {orders
                  .filter(o => o.status !== 'Cancelled')
                  .slice(0, 24)
                  .map(order => {
                    const id = order.orderId || order.id;
                    const hasAllergens = Array.isArray(order.allergens) && order.allergens.length > 0;
                    return (
                      <div
                        key={id}
                        style={{
                          background: '#FFFFFF', borderRadius: '16px', padding: '1.15rem',
                          border: hasAllergens ? '2px solid #DC2626' : '1px solid #E7E5E4',
                          display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.85rem'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 900, fontSize: '1.05rem' }}>#{id} • {order.tableNumber || 'Counter'}</span>
                            <span style={{
                              padding: '3px 9px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 800,
                              background: order.status === 'Completed' ? '#ECFDF5' : order.status === 'Ready for Pickup' ? '#EFF6FF' : '#FFF7ED',
                              color: order.status === 'Completed' ? '#047857' : order.status === 'Ready for Pickup' ? '#1D4ED8' : '#C24522'
                            }}>
                              {order.status}
                            </span>
                          </div>
                          {hasAllergens && (
                            <div style={{ marginTop: '6px', padding: '5px 9px', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <ShieldAlert size={14} /> ALLERGEN EXCLUSION: {order.allergens.join(', ')}
                            </div>
                          )}
                          <div style={{ marginTop: '0.65rem', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            {(order.items || []).map((it, idx) => (
                              <div key={idx} style={{ padding: '6px 8px', borderRadius: '8px', background: '#FAF8F5', fontWeight: 700, fontSize: '0.84rem' }}>
                                {it.quantity || it.qty || 1}x {it.name}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          {(order.status === 'New' || order.status === 'Order Received' || order.status === 'Pending') && (
                            <button type="button" onClick={() => handleUpdateKitchenOrder(order, 'Preparing')} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: '#D97706', color: '#FFFFFF', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer' }}>
                              Start Preparing
                            </button>
                          )}
                          {order.status === 'Preparing' && (
                            <button type="button" onClick={() => handleUpdateKitchenOrder(order, 'Ready for Pickup')} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: '#2563EB', color: '#FFFFFF', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer' }}>
                              Mark Ready for Pickup
                            </button>
                          )}
                          {(order.status === 'Ready for Pickup' || order.status === 'Order Ready' || order.status === 'Ready') && (
                            <button type="button" onClick={() => handleUpdateKitchenOrder(order, 'Completed')} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: '#059669', color: '#FFFFFF', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer' }}>
                              Mark Served / Completed
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* SECTION 3: TABLE SERVICE & CUSTOMER REQUESTS */}
          {activeSection === 'table-service' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '1.25rem 1.5rem', border: '1px solid #E7E5E4' }}>
                <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900 }}>Table Service &amp; Customer Assistance Requests</h2>
                <p style={{ margin: '2px 0 0', fontSize: '0.84rem', color: '#78716C' }}>
                  Respond to live table calls, water/condiment refills, and guest assistance requests across the dining floor.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                {serviceRequests.length === 0 ? (
                  <div style={{ padding: '2rem', background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E7E5E4', color: '#78716C' }}>
                    No active table service requests right now.
                  </div>
                ) : (
                  serviceRequests.map(reqItem => (
                    <div key={reqItem.id} style={{ background: '#FFFFFF', borderRadius: '16px', padding: '1.15rem', border: '1px solid #E7E5E4', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.85rem' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 900, fontSize: '1rem', color: '#C24522' }}>{reqItem.tableNumber}</span>
                          <span style={{
                            padding: '3px 9px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 800,
                            background: reqItem.status === 'Completed' ? '#ECFDF5' : '#FFF7ED',
                            color: reqItem.status === 'Completed' ? '#047857' : '#C24522'
                          }}>
                            {reqItem.status}
                          </span>
                        </div>
                        <div style={{ fontWeight: 800, fontSize: '0.92rem', marginTop: '6px' }}>{reqItem.category}</div>
                        {reqItem.notes && <div style={{ fontSize: '0.8rem', color: '#57534E', marginTop: '4px' }}>Note: "{reqItem.notes}"</div>}
                        <div style={{ fontSize: '0.74rem', color: '#78716C', marginTop: '6px' }}>
                          Attended by: {reqItem.attendedBy || 'Unassigned'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        {reqItem.status === 'Pending' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateServiceRequest(reqItem, 'Acknowledged')}
                            style={{ flex: 1, padding: '7px', borderRadius: '8px', border: 'none', background: '#2563EB', color: '#FFFFFF', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer' }}
                          >
                            Acknowledge Call
                          </button>
                        )}
                        {reqItem.status !== 'Completed' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateServiceRequest(reqItem, 'Completed')}
                            style={{ flex: 1, padding: '7px', borderRadius: '8px', border: 'none', background: '#059669', color: '#FFFFFF', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer' }}
                          >
                            Mark Resolved
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* SECTION 4: OPERATIONAL ACTIVITY RECORDS */}
          {activeSection === 'activity' && (
            <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '1.4rem', border: '1px solid #E7E5E4' }}>
              <h2 style={{ margin: '0 0 4px', fontSize: '1.25rem', fontWeight: 900 }}>Shift Operational Activity Records</h2>
              <p style={{ margin: '0 0 1.2rem', fontSize: '0.84rem', color: '#78716C' }}>
                Chronological log of tasks, kitchen order updates, and table service actions recorded during your shift.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {auditLogs.slice(0, 35).map(log => (
                  <div key={log.id} style={{ padding: '0.85rem 1rem', borderRadius: '12px', background: '#FAF8F5', border: '1px solid #E7E5E4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.86rem', color: '#1C1917' }}>{log.action} • <span style={{ color: '#2563EB' }}>{log.target}</span></div>
                      <div style={{ fontSize: '0.78rem', color: '#57534E', marginTop: '2px' }}>{log.details}</div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#78716C', whiteSpace: 'nowrap' }}>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 5: STAFF DAILY REPORT */}
          {activeSection === 'daily-report' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{
                background: '#FFFFFF', borderRadius: '18px', padding: '1.4rem 1.75rem',
                border: '1px solid #E7E5E4', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem'
              }}>
                <div>
                  <span style={{
                    background: '#EFF6FF', color: '#1D4ED8', padding: '3px 10px', borderRadius: '999px',
                    fontSize: '0.72rem', fontWeight: 800, border: '1px solid #BFDBFE'
                  }}>
                    AUTOMATIC SHIFT ACTIVITY COMPILATION
                  </span>
                  <h2 style={{ margin: '6px 0 2px', fontSize: '1.4rem', fontWeight: 900 }}>
                    Staff Daily Report &amp; Shift Performance Summary
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: '#78716C' }}>
                    Automatically compiled from your completed tasks, pending responsibilities, kitchen orders prepared, and table service calls.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <input
                    type="date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    style={{ padding: '0.55rem 0.85rem', borderRadius: '10px', border: '1px solid #D6D3D1', fontWeight: 700, fontSize: '0.84rem' }}
                  />
                  <button
                    type="button"
                    disabled={submittingReport}
                    onClick={() => handleSubmitStaffReport('Draft')}
                    style={{
                      padding: '0.6rem 1.1rem', borderRadius: '10px', border: '1px solid #D6D3D1',
                      background: '#FFFFFF', color: '#44403C', fontWeight: 800, fontSize: '0.83rem',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                    }}
                  >
                    <Save size={15} /> Save Draft
                  </button>
                  <button
                    type="button"
                    disabled={submittingReport}
                    onClick={() => handleSubmitStaffReport('Pending Review')}
                    style={{
                      padding: '0.6rem 1.25rem', borderRadius: '10px', border: 'none',
                      background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', color: '#FFFFFF',
                      fontWeight: 800, fontSize: '0.84rem', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '7px',
                      boxShadow: '0 4px 14px rgba(37, 99, 235, 0.28)'
                    }}
                  >
                    <Send size={15} /> Submit Report to Administrator
                  </button>
                </div>
              </div>

              {/* Live Staff KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                {[
                  { label: 'Total Assigned Tasks', value: liveStaffMetrics.totalAssigned, sub: `Station: ${assignedStation}`, color: '#1C1917' },
                  { label: 'Completed Shift Tasks', value: liveStaffMetrics.completedCount, sub: 'Verified with timestamps', color: '#059669' },
                  { label: 'Pending / In-Progress Tasks', value: liveStaffMetrics.pendingCount, sub: 'Carried to handover notes', color: '#D97706' },
                  { label: 'Orders Prepared / Assisted', value: liveStaffMetrics.preppedOrdersCount, sub: 'Kitchen & floor fulfillment', color: '#2563EB' },
                  { label: 'Table Service Calls Handled', value: liveStaffMetrics.handledTableCallsCount, sub: 'Guest assistance resolved', color: '#C24522' }
                ].map((kpi, idx) => (
                  <div key={idx} style={{ background: '#FFFFFF', borderRadius: '14px', padding: '1.1rem 1.25rem', border: '1px solid #E7E5E4' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#78716C' }}>{kpi.label}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: kpi.color, marginTop: '4px' }}>{kpi.value}</div>
                    <div style={{ fontSize: '0.72rem', color: '#57534E', marginTop: '4px', fontWeight: 600 }}>{kpi.sub}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '1.4rem', border: '1px solid #E7E5E4', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900 }}>1. Attendance, Completed Tasks &amp; Shift Notes</h3>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#44403C' }}>Time In</label>
                      <input type="text" value={clockIn} onChange={(e) => setClockIn(e.target.value)} style={{ width: '100%', padding: '0.5rem 0.7rem', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '0.82rem', marginTop: '3px' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#44403C' }}>Time Out</label>
                      <input type="text" value={clockOut} onChange={(e) => setClockOut(e.target.value)} style={{ width: '100%', padding: '0.5rem 0.7rem', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '0.82rem', marginTop: '3px' }} />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.76rem', fontWeight: 800, color: '#047857' }}>
                      Completed Tasks Automatically Attached ({liveStaffMetrics.completedTitles.length})
                    </label>
                    <ul style={{ margin: '6px 0 0', paddingLeft: '1.2rem', fontSize: '0.8rem', color: '#1C1917' }}>
                      {liveStaffMetrics.completedTitles.map((t, i) => (
                        <li key={i} style={{ marginBottom: '3px' }}>{t}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#44403C' }}>Safety / Allergen / Operational Incidents</label>
                    <input
                      type="text"
                      value={incidentsReported}
                      onChange={(e) => setIncidentsReported(e.target.value)}
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '10px', border: '1px solid #D6D3D1', fontSize: '0.83rem', marginTop: '4px' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#44403C' }}>Staff Handover Remarks for Administrator</label>
                    <textarea
                      rows={3}
                      value={staffRemarks}
                      onChange={(e) => setStaffRemarks(e.target.value)}
                      style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '10px', border: '1px solid #D6D3D1', fontSize: '0.83rem', marginTop: '4px' }}
                    />
                  </div>
                </div>

                {/* Right: Submitted Staff Reports History */}
                <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '1.4rem', border: '1px solid #E7E5E4', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900 }}>
                    2. Submitted Staff Daily Reports &amp; Admin Feedback
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '420px', overflowY: 'auto' }}>
                    {myReports.map(rpt => (
                      <div key={rpt.id} style={{ padding: '1rem', borderRadius: '12px', border: '1px solid #E7E5E4', background: '#FAF8F5' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontWeight: 900, fontSize: '0.9rem' }}>{rpt.id}</span>
                            <span style={{ marginLeft: '8px', fontSize: '0.78rem', color: '#78716C' }}>{rpt.reportDate} • {rpt.employeeName} ({rpt.role})</span>
                          </div>
                          <span style={{
                            padding: '3px 9px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 800,
                            background: rpt.reportStatus === 'Approved' ? '#ECFDF5' : rpt.reportStatus === 'Needs Correction' ? '#FEF2F2' : '#EFF6FF',
                            color: rpt.reportStatus === 'Approved' ? '#047857' : rpt.reportStatus === 'Needs Correction' ? '#B91C1C' : '#1D4ED8'
                          }}>
                            {rpt.reportStatus}
                          </span>
                        </div>
                        {rpt.staffData && (
                          <div style={{ fontSize: '0.78rem', color: '#44403C', marginTop: '6px' }}>
                            Completed Tasks: <strong>{(rpt.staffData.tasksCompleted || []).length}</strong> • Kitchen Orders: <strong>{rpt.staffData.kitchenOrdersHandled || 0}</strong> • Table Calls: <strong>{rpt.staffData.tableServiceCallsHandled || 0}</strong>
                          </div>
                        )}
                        {rpt.reviewNotes && (
                          <div style={{ marginTop: '8px', padding: '6px 10px', borderRadius: '8px', background: '#FFFFFF', border: '1px solid #E7E5E4', fontSize: '0.76rem', color: '#44403C' }}>
                            <strong>Admin Review ({rpt.reviewedBy || 'Administrator'}):</strong> {rpt.reviewNotes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modal: Log New Operational Task */}
      {showAddTaskModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(28, 25, 23, 0.58)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9200, padding: '1rem'
        }}>
          <div style={{ background: '#FFFFFF', borderRadius: '18px', width: '100%', maxWidth: '460px', padding: '1.5rem', border: '1px solid #E7E5E4' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', fontWeight: 900 }}>Log New Operational Shift Task</h3>
            <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700 }}>Task Title *</label>
                <input
                  type="text"
                  required
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g. Sanitize Allergen Prep Station #2"
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '0.84rem', marginTop: '3px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700 }}>Task Description / Details</label>
                <textarea
                  rows={3}
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  placeholder="Describe preparation or service steps..."
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '0.84rem', marginTop: '3px' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700 }}>Category</label>
                  <select value={newTaskCategory} onChange={(e) => setNewTaskCategory(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '0.83rem', marginTop: '3px' }}>
                    <option value="Kitchen Prep">Kitchen Prep</option>
                    <option value="Safety & Hygiene">Safety & Hygiene</option>
                    <option value="Table Service">Table Service</option>
                    <option value="Sanitation">Sanitation</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700 }}>Priority</label>
                  <select value={newTaskPriority} onChange={(e) => setNewTaskPriority(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '0.83rem', marginTop: '3px' }}>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowAddTaskModal(false)} style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: '1px solid #D6D3D1', background: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '0.55rem 1.2rem', borderRadius: '8px', border: 'none', background: '#2563EB', color: '#FFFFFF', fontWeight: 800, cursor: 'pointer' }}>
                  Add Task to Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
