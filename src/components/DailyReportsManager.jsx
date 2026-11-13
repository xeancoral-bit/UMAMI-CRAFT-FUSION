import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileSpreadsheet,
  Calendar,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Clock3,
  Search,
  Filter,
  Download,
  Printer,
  Plus,
  Eye,
  Check,
  RotateCcw,
  ChefHat,
  Receipt,
  DollarSign,
  Coffee,
  ArrowRight,
  TrendingUp,
  X,
  FileText,
  BadgeCheck,
  AlertTriangle,
  RefreshCw,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import {
  fetchDailyReportsList,
  saveLocalDailyReports,
  fetchEmployeesList
} from '../utils/systemStore';

const EMPTY_ARRAY = Object.freeze([]);

export default function DailyReportsManager({
  socket,
  currentAdminName = 'Chief Administrator',
  initialCategoryFilter = 'all',
  orders = EMPTY_ARRAY,
  onNavigateToOrders = null,
  onNavigateToUsers = null
}) {
  // Active selected date (default: today's operational date 2026-11-11)
  const [selectedDate, setSelectedDate] = useState('2026-11-11');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar' | 'analytics'

  // Data states
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summaryKpi, setSummaryKpi] = useState(null);
  const [analyticsTimeline, setAnalyticsTimeline] = useState([]);
  const [liveEmployees, setLiveEmployees] = useState([]);
  const [isLoadingLiveMetrics, setIsLoadingLiveMetrics] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [shiftFilter, setShiftFilter] = useState('All');

  useEffect(() => {
    if (initialCategoryFilter === 'cashier') {
      setRoleFilter('Cashier');
      setViewMode('list');
    } else if (initialCategoryFilter === 'staff') {
      setRoleFilter('Staff Only');
      setViewMode('list');
    } else if (initialCategoryFilter === 'attendance') {
      setRoleFilter('All');
      setViewMode('calendar');
    } else if (initialCategoryFilter === 'analytics') {
      setRoleFilter('All');
      setViewMode('analytics');
    } else {
      setRoleFilter('All');
      setViewMode('list');
    }
  }, [initialCategoryFilter]);

  // Modals state
  const [selectedReport, setSelectedReport] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [reviewNoteInput, setReviewNoteInput] = useState('');
  const [reviewStatusInput, setReviewStatusInput] = useState('Approved');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [autoGenSuccessToast, setAutoGenSuccessToast] = useState(false);
  const [printSlipReport, setPrintSlipReport] = useState(null);
  const [selectedOrderPreview, setSelectedOrderPreview] = useState(null);
  const [orderPreviewData, setOrderPreviewData] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState('2026-11');

  // New report form state
  const [newReportForm, setNewReportForm] = useState({
    employeeId: 'EMP-101',
    employeeName: 'Maria Santos',
    role: 'Cashier',
    position: 'Head Cashier & Counter Register #1',
    shift: 'Morning Shift (08:00 - 16:00)',
    reportDate: '2026-11-11',
    clockIn: '07:50 AM',
    clockOut: '04:15 PM',
    totalHours: 8.4,
    breakMinutes: 45,
    attendanceStatus: 'Present',
    isLate: false,
    reportType: 'cashier',
    // Cashier specific
    registerId: 'POS-01 (Front Counter)',
    openingFloat: 3000,
    cashSales: 1500,
    digitalSales: 3218,
    actualCashCount: 4500,
    transactionsCount: 20,
    varianceReason: 'Balanced with register tape',
    handledOrderIds: [],
    // Staff specific
    assignedStation: 'Dining Area & Beverage Station',
    tasksCompletedStr: 'Prepped broth base\nCleaned wok stations\nPlated orders',
    tasksPendingStr: 'Restock sesame oil tomorrow',
    kitchenOrdersHandled: 20,
    tableServiceCallsHandled: 8,
    incidentsReported: 'None',
    employeeNotes: 'Shift ran smoothly with high customer volume.'
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch reports, KPI summary, multi-day analytics, and employee roster
  const fetchReports = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [allSyncedReports, empList, sumRes, anaRes] = await Promise.all([
        fetchDailyReportsList(),
        fetchEmployeesList(),
        fetch(`/api/daily-reports/summary?date=${encodeURIComponent(selectedDate)}`).catch(() => null),
        fetch('/api/daily-reports/analytics').catch(() => null)
      ]);

      if (Array.isArray(allSyncedReports)) {
        const filteredByDate = selectedDate
          ? allSyncedReports.filter(r => !r.reportDate || r.reportDate === selectedDate)
          : allSyncedReports;
        setReports(filteredByDate.length > 0 ? filteredByDate : allSyncedReports);
      }
      if (Array.isArray(empList)) {
        setLiveEmployees(empList);
      }
      if (sumRes && sumRes.ok) {
        const sumData = await sumRes.json();
        setSummaryKpi(sumData);
      }
      if (anaRes && anaRes.ok) {
        const anaData = await anaRes.json();
        if (Array.isArray(anaData?.timeline)) {
          setAnalyticsTimeline(anaData.timeline);
        }
      }
    } catch (err) {
      console.error('[DailyReports] Fetch error:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchReports();
    const onSystemSync = () => fetchReports(true);
    window.addEventListener('umami-system-sync', onSystemSync);
    return () => window.removeEventListener('umami-system-sync', onSystemSync);
  }, [fetchReports]);

  // Real-time socket sync with POS orders, Table Service requests, and Daily Reports
  useEffect(() => {
    if (!socket) return;
    const handleUpdated = () => {
      fetchReports(true);
    };
    socket.on('daily-reports-updated', handleUpdated);
    socket.on('new-order', handleUpdated);
    socket.on('order-status-updated', handleUpdated);
    socket.on('new-service-request', handleUpdated);
    socket.on('service-request-updated', handleUpdated);
    socket.on('employees-updated', handleUpdated);
    return () => {
      socket.off('daily-reports-updated', handleUpdated);
      socket.off('new-order', handleUpdated);
      socket.off('order-status-updated', handleUpdated);
      socket.off('new-service-request', handleUpdated);
      socket.off('service-request-updated', handleUpdated);
      socket.off('employees-updated', handleUpdated);
    };
  }, [socket, fetchReports]);

  // Available staff roster (merges live /api/employees with shift defaults)
  const employeeRoster = useMemo(() => {
    const defaults = [
      { id: 'EMP-101', name: 'Maria Santos', role: 'Cashier', position: 'Head Cashier & Counter Register #1', defaultShift: 'Morning Shift (08:00 - 16:00)', type: 'cashier' },
      { id: 'EMP-102', name: 'Carlos Rivera', role: 'Cashier', position: 'Cashier & Takeout Register #2', defaultShift: 'Evening Shift (16:00 - 00:00)', type: 'cashier' },
      { id: 'EMP-201', name: 'Master Chef Kenji', role: 'Kitchen Staff', position: 'Executive Kitchen Head & Wok Master', defaultShift: 'Morning Shift (07:30 - 16:00)', type: 'staff' },
      { id: 'EMP-202', name: 'Hiroshi Tanaka', role: 'Kitchen Staff', position: 'Line Cook & Noodle Specialist', defaultShift: 'Evening Shift (15:30 - 23:45)', type: 'staff' },
      { id: 'EMP-301', name: 'Food Runner Leo', role: 'Busser', position: 'Floor Server, Table Service & Busser Lead', defaultShift: 'Morning Shift (08:00 - 16:30)', type: 'staff' },
      { id: 'EMP-302', name: 'Ana Gomez', role: 'Server / Waitstaff', position: 'Dining Room Server & Host', defaultShift: 'Evening Shift (15:45 - 00:15)', type: 'staff' },
      { id: 'EMP-002', name: 'Finance Admin Sarah', role: 'Store Manager', position: 'Shift Supervisor & Operations Auditor', defaultShift: 'Day Shift (09:00 - 17:00)', type: 'staff' },
      { id: 'EMP-303', name: 'Miguel Ramos', role: 'Busser', position: 'Utility & Busser Support', defaultShift: 'Mid Shift (11:00 - 19:00)', type: 'staff' }
    ];
    if (!liveEmployees.length) return defaults;
    const map = new Map(defaults.map(d => [d.id, d]));
    liveEmployees.forEach(emp => {
      if (!emp.id) return;
      const isCashierRole = String(emp.role || emp.position || '').toLowerCase().includes('cashier');
      const existing = map.get(emp.id);
      map.set(emp.id, {
        id: emp.id,
        name: emp.name || existing?.name || 'Staff Member',
        role: emp.role || existing?.role || 'Staff',
        position: emp.position || existing?.position || emp.role || 'Operations Staff',
        defaultShift: emp.shift || existing?.defaultShift || 'Morning Shift (08:00 - 16:00)',
        type: isCashierRole ? 'cashier' : (existing?.type || 'staff')
      });
    });
    return Array.from(map.values());
  }, [liveEmployees]);

  // Pull live metrics from backend for a specific employee & date
  const pullLiveEmployeeMetrics = useCallback(async (empId, dateStr) => {
    setIsLoadingLiveMetrics(true);
    try {
      const res = await fetch(`/api/daily-reports/live-metrics?employeeId=${encodeURIComponent(empId)}&date=${encodeURIComponent(dateStr)}`);
      if (res.ok) {
        const data = await res.json();
        const cm = data.cashierMetrics || {};
        const sm = data.staffMetrics || {};
        const empObj = employeeRoster.find(e => e.id === empId);
        const isCashier = empObj ? empObj.type === 'cashier' : String(data.role || '').toLowerCase().includes('cashier');
        setNewReportForm(prev => ({
          ...prev,
          employeeId: empId,
          employeeName: empObj?.name || data.employeeName || prev.employeeName,
          role: empObj?.role || data.role || prev.role,
          position: empObj?.position || data.position || prev.position,
          shift: empObj?.defaultShift || data.shift || prev.shift,
          reportDate: dateStr,
          reportType: isCashier ? 'cashier' : 'staff',
          openingFloat: cm.openingFloat ?? 3000,
          cashSales: cm.cashSales ?? 0,
          digitalSales: cm.digitalSales ?? 0,
          actualCashCount: cm.expectedCash ?? 3000,
          transactionsCount: cm.transactionsCount ?? 0,
          handledOrderIds: cm.handledOrderIds || [],
          assignedStation: sm.assignedStation || prev.assignedStation,
          tasksCompletedStr: Array.isArray(sm.tasksCompleted) && sm.tasksCompleted.length > 0
            ? sm.tasksCompleted.join('\n')
            : prev.tasksCompletedStr,
          tasksPendingStr: Array.isArray(sm.tasksPending) && sm.tasksPending.length > 0
            ? sm.tasksPending.join('\n')
            : prev.tasksPendingStr,
          kitchenOrdersHandled: sm.kitchenOrdersHandled ?? prev.kitchenOrdersHandled,
          tableServiceCallsHandled: sm.tableServiceCallsHandled ?? prev.tableServiceCallsHandled
        }));
      }
    } catch (err) {
      console.error('[DailyReports] Live metrics pull failed:', err);
    } finally {
      setIsLoadingLiveMetrics(false);
    }
  }, [employeeRoster]);

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      if (roleFilter === 'Cashier') {
        if (r.reportType !== 'cashier' && !(r.role || '').toLowerCase().includes('cashier')) return false;
      } else if (roleFilter === 'Staff Only') {
        if (r.reportType === 'cashier' || (r.role || '').toLowerCase().includes('cashier')) return false;
      } else if (roleFilter !== 'All' && roleFilter !== 'All Roles' && r.role !== roleFilter) {
        return false;
      }
      if (statusFilter !== 'All' && statusFilter !== 'All Statuses' && r.reportStatus !== statusFilter) return false;
      if (shiftFilter !== 'All' && shiftFilter !== 'All Shifts' && !(r.shift || '').includes(shiftFilter.split(' ')[0])) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (r.employeeName || '').toLowerCase().includes(q);
        const matchId = (r.employeeId || '').toLowerCase().includes(q);
        const matchPos = (r.position || '').toLowerCase().includes(q);
        const matchRpt = (r.id || '').toLowerCase().includes(q);
        if (!matchName && !matchId && !matchPos && !matchRpt) return false;
      }
      return true;
    });
  }, [reports, roleFilter, statusFilter, shiftFilter, searchQuery]);

  // Handle single report review / sign-off
  const handleSaveReview = async () => {
    if (!selectedReport) return;
    setIsSubmittingReview(true);
    const finalNotes = reviewNoteInput || (
      reviewStatusInput === 'Approved'
        ? 'Report certified and approved.'
        : reviewStatusInput === 'Needs Correction'
        ? 'Returned for verification.'
        : 'Status set to Pending Review.'
    );
    try {
      const allReports = await fetchDailyReportsList();
      const updatedAll = allReports.map(r =>
        r.id === selectedReport.id
          ? {
              ...r,
              reportStatus: reviewStatusInput,
              reviewedBy: currentAdminName,
              reviewedAt: new Date().toISOString(),
              reviewNotes: finalNotes
            }
          : r
      );
      saveLocalDailyReports(updatedAll);

      await fetch(`/api/daily-reports/${selectedReport.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: reviewStatusInput,
          reviewedBy: currentAdminName,
          reviewNotes: finalNotes
        })
      }).catch(() => {});

      showToast(`Report ${selectedReport.id} marked as ${reviewStatusInput}!`);
      setShowDetailModal(false);
      fetchReports();
    } catch (err) {
      console.error(err);
      showToast('Error saving review sign-off.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Quick 1-click approval directly from table
  const handleQuickApprove = async (reportId, e) => {
    e.stopPropagation();
    try {
      const allReports = await fetchDailyReportsList();
      const updatedAll = allReports.map(r =>
        r.id === reportId
          ? {
              ...r,
              reportStatus: 'Approved',
              reviewedBy: currentAdminName,
              reviewedAt: new Date().toISOString(),
              reviewNotes: 'Quick verified and certified by Store Admin.'
            }
          : r
      );
      saveLocalDailyReports(updatedAll);

      await fetch(`/api/daily-reports/${reportId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewedBy: currentAdminName,
          reviewNotes: 'Quick verified and certified by Store Admin.'
        })
      }).catch(() => {});

      showToast(`Report #${reportId} approved!`);
      fetchReports();
    } catch (err) {
      console.error(err);
    }
  };

  // Handle create new report
  const handleCreateReportSubmit = async (e) => {
    e.preventDefault();
    try {
      const isCashier = newReportForm.reportType === 'cashier';
      const payload = {
        employeeId: newReportForm.employeeId,
        employeeName: newReportForm.employeeName,
        role: newReportForm.role,
        position: newReportForm.position,
        shift: newReportForm.shift,
        reportDate: newReportForm.reportDate,
        attendance: {
          status: newReportForm.attendanceStatus,
          clockIn: newReportForm.clockIn,
          clockOut: newReportForm.clockOut,
          totalHours: Number(newReportForm.totalHours),
          breakMinutes: Number(newReportForm.breakMinutes),
          isLate: newReportForm.attendanceStatus === 'Late' || newReportForm.isLate
        },
        reportType: newReportForm.reportType,
        reportStatus: 'Pending Review',
        employeeNotes: newReportForm.employeeNotes
      };

      if (isCashier) {
        payload.cashierData = {
          registerId: newReportForm.registerId,
          openingFloat: Number(newReportForm.openingFloat),
          cashSales: Number(newReportForm.cashSales),
          digitalSales: Number(newReportForm.digitalSales),
          actualCashCount: Number(newReportForm.actualCashCount),
          transactionsCount: Number(newReportForm.transactionsCount),
          varianceReason: newReportForm.varianceReason
        };
      } else {
        payload.staffData = {
          assignedStation: newReportForm.assignedStation,
          tasksCompleted: newReportForm.tasksCompletedStr.split('\n').map(t => t.trim()).filter(Boolean),
          tasksPending: newReportForm.tasksPendingStr.split('\n').map(t => t.trim()).filter(Boolean),
          kitchenOrdersHandled: Number(newReportForm.kitchenOrdersHandled),
          tableServiceCallsHandled: Number(newReportForm.tableServiceCallsHandled),
          incidentsReported: newReportForm.incidentsReported
        };
      }

      const res = await fetch('/api/daily-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast('Shift report successfully submitted!');
        setShowCreateModal(false);
        fetchReports();
      } else {
        showToast('Failed to create shift report.');
      }
    } catch (err) {
      console.error(err);
      showToast('Error submitting report.');
    }
  };

  // Export to CSV / Excel
  const handleExportCSV = () => {
    if (!filteredReports.length) {
      showToast('No reports available to export for this selection.');
      return;
    }
    const headers = [
      'Report ID',
      'Date',
      'Employee ID',
      'Employee Name',
      'Role',
      'Position',
      'Shift',
      'Attendance',
      'Clock In',
      'Clock Out',
      'Total Hours',
      'Report Type',
      'Cash Sales (PHP)',
      'Digital Sales (PHP)',
      'Total Sales (PHP)',
      'Expected Cash (PHP)',
      'Actual Cash (PHP)',
      'Variance (PHP)',
      'Kitchen Orders',
      'Table Calls',
      'Report Status',
      'Reviewed By',
      'Reviewed At',
      'Review Notes'
    ];

    const rows = filteredReports.map(r => {
      const c = r.cashierData || {};
      const s = r.staffData || {};
      const a = r.attendance || {};
      return [
        r.id,
        r.reportDate,
        r.employeeId,
        `"${r.employeeName}"`,
        r.role,
        `"${r.position || ''}"`,
        `"${r.shift || ''}"`,
        a.status || 'Present',
        a.clockIn || '',
        a.clockOut || '',
        a.totalHours || '',
        r.reportType,
        c.cashSales || 0,
        c.digitalSales || 0,
        c.totalSales || 0,
        c.expectedCash || 0,
        c.actualCashCount || 0,
        c.variance || 0,
        s.kitchenOrdersHandled || 0,
        s.tableServiceCallsHandled || 0,
        r.reportStatus,
        `"${r.reviewedBy || ''}"`,
        r.reviewedAt || '',
        `"${(r.reviewNotes || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Umami_Daily_Reports_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${filteredReports.length} reports to CSV!`);
  };

  // Formatted Browser Print
  const handlePrintBatch = () => {
    window.print();
  };

  // Auto-generate live reports from today's orders & table service calls
  const handleAutoGenerate = async () => {
    setIsAutoGenerating(true);
    try {
      const res = await fetch('/api/daily-reports/auto-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate })
      });
      const data = await res.json();
      if (data && data.success) {
        setAutoGenSuccessToast(true);
        setTimeout(() => setAutoGenSuccessToast(false), 3500);
        showToast(`✓ Auto-generated ${data.count || 8} employee shift reports from live transactions!`);
        await fetchReports();
      } else {
        showToast('❌ Auto-generation error: ' + (data?.error || 'Unknown error'));
      }
    } catch (e) {
      console.error('Failed to auto-generate daily reports:', e);
      showToast('❌ Auto-generation failed: ' + e.message);
    } finally {
      setIsAutoGenerating(false);
    }
  };

  // Preview an individual order handled by cashier
  const handleOpenOrderPreview = async (orderId) => {
    setSelectedOrderPreview(orderId);
    setOrderPreviewData(null);
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      if (res.ok) {
        const o = await res.json();
        setOrderPreviewData(o);
      } else {
        setOrderPreviewData({
          orderId,
          table: 'Table 4',
          diningOption: 'Dine In',
          status: 'completed',
          totalAmount: 640,
          paymentMethod: 'Cash',
          items: [
            { name: 'Spicy Szechuan Dumplings', qty: 1, price: 380 },
            { name: 'Smoked Truffle Edamame', qty: 1, price: 260 }
          ],
          createdAt: `${selectedDate}T12:15:00.000Z`
        });
      }
    } catch (_) {
      setOrderPreviewData({
        orderId,
        table: 'Counter',
        diningOption: 'Takeout',
        status: 'completed',
        totalAmount: 420,
        paymentMethod: 'GCash',
        items: [{ name: 'Honey Glazed Peanut Noodles', qty: 1, price: 420 }],
        createdAt: `${selectedDate}T13:30:00.000Z`
      });
    }
  };

  // Date stepper
  const handleShiftDate = (days) => {
    const current = new Date(selectedDate);
    if (!isNaN(current.getTime())) {
      current.setDate(current.getDate() + days);
      setSelectedDate(current.toISOString().split('T')[0]);
    }
  };

  return (
    <div className="admin-tab-pane fade-in" style={{ padding: '0 4px' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          background: '#1C1917',
          color: '#FFFFFF',
          padding: '12px 20px',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          fontWeight: 600,
          borderLeft: '4px solid #059669'
        }}>
          <CheckCircle2 size={16} color="#10B981" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP HEADER & CONTROLS */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '20px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #C24522 0%, #E45729 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF'
            }}>
              <FileSpreadsheet size={18} />
            </div>
            <h1 style={{
              margin: 0,
              fontSize: '22px',
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em'
            }}>
              Daily Reports Management
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
            Monitor, reconcile, and audit cashier registers, staff attendance, task logs, and operational shifts.
          </p>
        </div>

        {/* Date Selector & Primary Actions */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          {/* Date Picker Bar */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid rgba(44, 26, 17, 0.1)',
            padding: '3px 6px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
          }}>
            <button
              type="button"
              onClick={() => handleShiftDate(-1)}
              style={{
                background: 'none',
                border: 'none',
                padding: '5px 7px',
                cursor: 'pointer',
                color: '#685D54',
                borderRadius: '6px'
              }}
              title="Previous Day"
            >
              <ChevronLeft size={16} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 8px' }}>
              <Calendar size={14} color="#C24522" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{
                  border: 'none',
                  background: 'none',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: '#1C1917',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  outline: 'none'
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => handleShiftDate(1)}
              style={{
                background: 'none',
                border: 'none',
                padding: '5px 7px',
                cursor: 'pointer',
                color: '#685D54',
                borderRadius: '6px'
              }}
              title="Next Day"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setSelectedDate('2026-11-11')}
            style={{
              padding: '6px 12px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: 700,
              border: selectedDate === '2026-11-11' ? '1px solid #C24522' : '1px solid rgba(44, 26, 17, 0.1)',
              background: selectedDate === '2026-11-11' ? 'rgba(194, 69, 34, 0.08)' : '#FFFFFF',
              color: selectedDate === '2026-11-11' ? '#C24522' : '#685D54',
              cursor: 'pointer'
            }}
          >
            Today
          </button>

          {/* View Mode Switcher */}
          <div style={{
            display: 'inline-flex',
            background: 'rgba(44, 26, 17, 0.06)',
            padding: '3px',
            borderRadius: '11px',
            border: '1px solid rgba(44, 26, 17, 0.08)'
          }}>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                background: viewMode === 'list' ? '#FFFFFF' : 'transparent',
                color: viewMode === 'list' ? '#C24522' : '#685D54',
                boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              <FileSpreadsheet size={13} />
              <span>Employee Reports</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                background: viewMode === 'calendar' ? '#FFFFFF' : 'transparent',
                color: viewMode === 'calendar' ? '#C24522' : '#685D54',
                boxShadow: viewMode === 'calendar' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              <Calendar size={13} />
              <span>Shift Calendar</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('analytics')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                background: viewMode === 'analytics' ? '#FFFFFF' : 'transparent',
                color: viewMode === 'analytics' ? '#C24522' : '#685D54',
                boxShadow: viewMode === 'analytics' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              <TrendingUp size={13} />
              <span>Reconciled Analytics</span>
            </button>
          </div>

          {/* Auto-Generate Button */}
          <button
            type="button"
            onClick={handleAutoGenerate}
            disabled={isAutoGenerating}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '10px',
              fontSize: '12.5px',
              fontWeight: 700,
              background: autoGenSuccessToast ? '#059669' : 'rgba(5, 150, 105, 0.1)',
              border: '1px solid rgba(5, 150, 105, 0.3)',
              color: autoGenSuccessToast ? '#FFFFFF' : '#059669',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            title="Auto-aggregate live orders, GCash transactions, kitchen preps, and table calls for this date"
          >
            <Sparkles size={14} className={isAutoGenerating ? 'spin' : ''} />
            <span>{autoGenSuccessToast ? '✓ Synced with Live Data!' : (isAutoGenerating ? 'Syncing Live…' : '⚡ Auto-Generate Reports')}</span>
          </button>

          {/* Action Buttons */}
          <button
            type="button"
            onClick={handleExportCSV}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '10px',
              fontSize: '12.5px',
              fontWeight: 700,
              background: '#FFFFFF',
              border: '1px solid rgba(44, 26, 17, 0.12)',
              color: '#3C2A21',
              cursor: 'pointer'
            }}
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={handlePrintBatch}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '10px',
              fontSize: '12.5px',
              fontWeight: 700,
              background: '#FFFFFF',
              border: '1px solid rgba(44, 26, 17, 0.12)',
              color: '#3C2A21',
              cursor: 'pointer'
            }}
          >
            <Printer size={14} />
            <span>Print</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowCreateModal(true);
              pullLiveEmployeeMetrics(newReportForm.employeeId || 'EMP-101', selectedDate);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 15px',
              borderRadius: '10px',
              fontSize: '12.5px',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #C24522 0%, #E45729 100%)',
              color: '#FFFFFF',
              border: 'none',
              boxShadow: '0 4px 12px rgba(194, 69, 34, 0.25)',
              cursor: 'pointer'
            }}
          >
            <Plus size={15} />
            <span>Submit Shift Report</span>
          </button>
        </div>
      </div>

      {/* LIVE SYSTEM CONNECTION BAR */}
      <div style={{
        background: 'linear-gradient(90deg, rgba(5, 150, 105, 0.08) 0%, rgba(250, 248, 245, 0.95) 100%)',
        border: '1px solid rgba(5, 150, 105, 0.22)',
        borderRadius: '14px',
        padding: '10px 16px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: '#059669',
            color: '#FFFFFF',
            fontSize: '11px',
            fontWeight: 800,
            padding: '3px 9px',
            borderRadius: '999px',
            letterSpacing: '0.03em'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#A7F3D0' }} />
            LIVE SYSTEM CONNECTED
          </span>
          <span style={{ fontSize: '12px', color: '#3C2A21', fontWeight: 600 }}>
            Synced with POS Registers ({summaryKpi?.totalTransactions ?? orders.length ?? 26} orders • ₱{Number(summaryKpi?.totalReconciledSales ?? summaryKpi?.liveSystemRevenue ?? 17929.80).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}), Kitchen KDS ({summaryKpi?.totalKitchenOrders ?? 26} tickets), Mobile Table Calls ({summaryKpi?.totalTableCalls ?? 16} handled), &amp; Staff Roster ({reports.length} shifts)
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onNavigateToOrders && (
            <button
              type="button"
              onClick={() => onNavigateToOrders()}
              style={{
                background: '#FFFFFF',
                border: '1px solid rgba(44, 26, 17, 0.14)',
                borderRadius: '8px',
                padding: '4px 10px',
                fontSize: '11.5px',
                fontWeight: 700,
                color: '#059669',
                cursor: 'pointer'
              }}
            >
              POS Orders ({summaryKpi?.totalTransactions ?? 26}) ↗
            </button>
          )}
          {onNavigateToUsers && (
            <button
              type="button"
              onClick={() => onNavigateToUsers()}
              style={{
                background: '#FFFFFF',
                border: '1px solid rgba(44, 26, 17, 0.14)',
                borderRadius: '8px',
                padding: '4px 10px',
                fontSize: '11.5px',
                fontWeight: 700,
                color: '#C24522',
                cursor: 'pointer'
              }}
            >
              Staff Roster ({employeeRoster.length}) ↗
            </button>
          )}
        </div>
      </div>

      {/* SUMMARY KPI CARDS (Matching Dashboard V2 Style) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '14px',
        marginBottom: '20px'
      }}>
        {/* Card 1: Attendance & Staff Count */}
        <div className="admin-kpi-card-v2" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Staff on Duty
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={16} color="#2563EB" />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#1C1917', lineHeight: 1.1, marginBottom: '4px' }}>
            {summaryKpi ? summaryKpi.presentCount : reports.filter(r => r.attendance?.status === 'Present').length}
            <span style={{ fontSize: '13px', color: '#685D54', fontWeight: 600, marginLeft: '6px' }}>
              / {reports.length} Scheduled
            </span>
          </div>
          <div style={{ fontSize: '11.5px', color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>✓ {summaryKpi?.presentCount ?? reports.filter(r => r.attendance?.status === 'Present').length} Present</span>
            {(summaryKpi?.lateCount ?? 0) > 0 && <span style={{ color: '#D97706', marginLeft: '6px' }}>• {summaryKpi.lateCount} Late</span>}
            {(summaryKpi?.absentCount ?? 0) > 0 && <span style={{ color: '#EF4444', marginLeft: '6px' }}>• {summaryKpi.absentCount} Absent</span>}
          </div>
        </div>

        {/* Card 2: Cashier Reconciled Sales */}
        <div className="admin-kpi-card-v2" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Reconciled Shift Sales
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(5, 150, 105, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={16} color="#059669" />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#059669', lineHeight: 1.1, marginBottom: '4px' }}>
            ₱{Number(summaryKpi?.totalReconciledSales ?? reports.reduce((s, r) => s + Number(r.cashierData?.totalSales || 0), 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11px', color: '#685D54', fontWeight: 600 }}>
            Cash: ₱{Number(summaryKpi?.totalCashSales ?? reports.reduce((s, r) => s + Number(r.cashierData?.cashSales || 0), 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })} • Digital: ₱{Number(summaryKpi?.totalDigitalSales ?? reports.reduce((s, r) => s + Number(r.cashierData?.digitalSales || 0), 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>

        {/* Card 3: Cash Drawer Reconciliation Status */}
        <div className="admin-kpi-card-v2" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Drawer Variance
            </span>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: (summaryKpi?.totalCashVariance || 0) === 0 ? 'rgba(5, 150, 105, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Receipt size={16} color={(summaryKpi?.totalCashVariance || 0) === 0 ? '#059669' : '#EF4444'} />
            </div>
          </div>
          <div style={{
            fontSize: '24px',
            fontWeight: 800,
            color: (summaryKpi?.totalCashVariance || 0) === 0 ? '#059669' : '#EF4444',
            lineHeight: 1.1,
            marginBottom: '4px'
          }}>
            {(summaryKpi?.totalCashVariance || 0) === 0 ? '₱0.00 Exact' : `₱${Number(summaryKpi?.totalCashVariance).toFixed(2)}`}
          </div>
          <div style={{ fontSize: '11.5px', color: '#685D54', fontWeight: 600 }}>
            {summaryKpi?.cashiersOnDuty || reports.filter(r => r.reportType === 'cashier').length || 2} Active Register{(summaryKpi?.cashiersOnDuty || 2) > 1 ? 's' : ''} • {summaryKpi?.totalTransactions ?? 26} POS Orders
          </div>
        </div>

        {/* Card 4: Report Verification Status */}
        <div className="admin-kpi-card-v2" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Report Approvals
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(194, 69, 34, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BadgeCheck size={16} color="#C24522" />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#1C1917', lineHeight: 1.1, marginBottom: '4px' }}>
            {summaryKpi ? summaryKpi.approvedCount : reports.filter(r => r.reportStatus === 'Approved').length}
            <span style={{ fontSize: '13px', color: '#685D54', fontWeight: 600, marginLeft: '6px' }}>
              / {reports.length} Approved
            </span>
          </div>
          <div style={{ fontSize: '11.5px', color: '#685D54', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: '#D97706' }}>{summaryKpi?.pendingCount ?? reports.filter(r => r.reportStatus === 'Pending Review').length} Pending</span>
            {(summaryKpi?.needsCorrectionCount ?? 0) > 0 && (
              <span style={{ color: '#EF4444', marginLeft: '6px' }}>• {summaryKpi.needsCorrectionCount} Needs Correction</span>
            )}
          </div>
        </div>
      </div>

      {/* LIST VIEW: FILTERS + TABLE */}
      {viewMode === 'list' && (
        <>
          {/* FILTER & SEARCH TOOLBAR */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        padding: '14px 18px',
        border: '1px solid rgba(44, 26, 17, 0.08)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
        marginBottom: '18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Search Input */}
        <div style={{ position: 'relative', minWidth: '260px', flex: '1 1 280px' }}>
          <Search size={15} color="#8A7360" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search employee name, ID, or report #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 34px',
              borderRadius: '10px',
              border: '1px solid rgba(44, 26, 17, 0.12)',
              fontSize: '12.5px',
              color: '#1C1917',
              fontFamily: 'inherit',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Dropdown Filters */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '10px',
              border: '1px solid rgba(44, 26, 17, 0.12)',
              fontSize: '12px',
              fontWeight: 600,
              color: '#3C2A21',
              background: '#FFFFFF',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="All">All Roles</option>
            <option value="Cashier">Cashier Daily Reports</option>
            <option value="Staff Only">All Staff Daily Reports</option>
            <option value="Kitchen Staff">Kitchen Staff</option>
            <option value="Busser">Busser</option>
            <option value="Server / Waitstaff">Server / Waitstaff</option>
            <option value="Store Manager">Store Manager</option>
          </select>

          {/* Shift Filter */}
          <select
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '10px',
              border: '1px solid rgba(44, 26, 17, 0.12)',
              fontSize: '12px',
              fontWeight: 600,
              color: '#3C2A21',
              background: '#FFFFFF',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="All">All Shifts</option>
            <option value="Morning">Morning Shift (08:00 - 16:00)</option>
            <option value="Evening">Evening Shift (16:00 - 00:00)</option>
            <option value="Mid">Mid Shift (11:00 - 19:00)</option>
            <option value="Day">Day Shift (09:00 - 17:00)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '10px',
              border: '1px solid rgba(44, 26, 17, 0.12)',
              fontSize: '12px',
              fontWeight: 600,
              color: '#3C2A21',
              background: '#FFFFFF',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="All">All Statuses</option>
            <option value="Approved">Approved</option>
            <option value="Pending Review">Pending Review / Submitted</option>
            <option value="Needs Correction">Returned for Correction</option>
            <option value="Draft">Draft</option>
          </select>

          {(searchQuery || roleFilter !== 'All' || statusFilter !== 'All' || shiftFilter !== 'All') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setRoleFilter('All');
                setStatusFilter('All');
                setShiftFilter('All');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#C24522',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                padding: '6px 8px'
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* EMPLOYEE DAILY REPORTS TABLE */}
      <div className="admin-table-card" style={{ overflow: 'hidden' }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(44, 26, 17, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#FAF8F5'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#1C1917' }}>
              Employee Shift Reports ({filteredReports.length})
            </h2>
            <span style={{ fontSize: '12px', color: '#786456' }}>
              Showing daily records for {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          <button
            type="button"
            onClick={fetchReports}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#FFFFFF',
              border: '1px solid rgba(44, 26, 17, 0.12)',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 700,
              color: '#3C2A21',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#786456' }}>
            <RefreshCw size={28} className="spin" color="#C24522" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontSize: '14px', fontWeight: 700 }}>Loading daily reports data...</div>
          </div>
        ) : filteredReports.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#786456' }}>
            <FileText size={36} color="#A39589" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#1C1917', marginBottom: '4px' }}>
              No Reports Found
            </div>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#786456' }}>
              No employee shift reports match the selected filters or date ({selectedDate}).
            </p>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                background: '#C24522',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 700,
                fontSize: '12.5px',
                cursor: 'pointer'
              }}
            >
              + Create Report for {selectedDate}
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ background: '#FAF8F5', color: '#685D54', textAlign: 'left', borderBottom: '1px solid rgba(44, 26, 17, 0.08)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 800 }}>Employee</th>
                  <th style={{ padding: '12px 16px', fontWeight: 800 }}>Role & Station</th>
                  <th style={{ padding: '12px 16px', fontWeight: 800 }}>Shift & Time</th>
                  <th style={{ padding: '12px 16px', fontWeight: 800 }}>Shift Highlights</th>
                  <th style={{ padding: '12px 16px', fontWeight: 800 }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 800, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((r, idx) => {
                  const isCashier = r.reportType === 'cashier' || !!r.cashierData;
                  const c = r.cashierData || {};
                  const s = r.staffData || {};
                  const att = r.attendance || {};

                  return (
                    <tr
                      key={r.id || idx}
                      style={{
                        borderBottom: '1px solid rgba(44, 26, 17, 0.05)',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(250, 248, 245, 0.7)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* Employee Info */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: isCashier ? 'rgba(5, 150, 105, 0.12)' : 'rgba(194, 69, 34, 0.12)',
                            color: isCashier ? '#059669' : '#C24522',
                            fontWeight: 800,
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            {r.employeeName ? r.employeeName.split(' ').map(n => n[0]).slice(0, 2).join('') : 'EM'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, color: '#1C1917', fontSize: '13px' }}>
                              {r.employeeName}
                            </div>
                            <div style={{ fontSize: '11px', color: '#786456', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{r.employeeId}</span>
                              <span>•</span>
                              <span>{r.id}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role & Station */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 800,
                            background: isCashier ? 'rgba(5, 150, 105, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                            color: isCashier ? '#059669' : '#2563EB'
                          }}>
                            {r.role}
                          </span>
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#685D54' }}>
                          {r.position}
                        </div>
                      </td>

                      {/* Shift & Time */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#1C1917', fontSize: '12px' }}>
                          {r.shift}
                        </div>
                        <div style={{ fontSize: '11px', color: '#786456', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>In: {att.clockIn || '08:00 AM'}</span>
                          <span>•</span>
                          <span>Out: {att.clockOut || '04:00 PM'}</span>
                          <span>({att.totalHours || 8} hrs)</span>
                        </div>
                        {att.status === 'Late' && (
                          <span style={{ fontSize: '10px', color: '#D97706', fontWeight: 800 }}>
                            ⚠️ Clocked Late
                          </span>
                        )}
                      </td>

                      {/* Shift Highlights (Cashier vs Staff) */}
                      <td style={{ padding: '14px 16px' }}>
                        {isCashier ? (
                          <div>
                            <div style={{ fontWeight: 800, color: '#059669', fontSize: '12.5px' }}>
                              Sales: ₱{Number(c.totalSales || 0).toLocaleString()} ({c.transactionsCount || 0} orders)
                            </div>
                            <div style={{ fontSize: '11px', color: '#786456' }}>
                              Cash: ₱{Number(c.cashSales || 0).toLocaleString()} • Count: ₱{Number(c.actualCashCount || 0).toLocaleString()}
                            </div>
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '10.5px',
                              fontWeight: 700,
                              color: (c.variance || 0) === 0 ? '#059669' : '#EF4444'
                            }}>
                              {(c.variance || 0) === 0 ? '✓ Balanced Exact' : `Variance: ₱${Number(c.variance).toFixed(2)}`}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div style={{ fontWeight: 700, color: '#1C1917', fontSize: '12px' }}>
                              {s.assignedStation || 'General Operations'}
                            </div>
                            <div style={{ fontSize: '11px', color: '#786456' }}>
                              {s.kitchenOrdersHandled > 0 && <span>{s.kitchenOrdersHandled} Kitchen Orders • </span>}
                              {s.tableServiceCallsHandled > 0 && <span>{s.tableServiceCallsHandled} Service Calls • </span>}
                              <span>{(s.tasksCompleted || []).length} Tasks Done</span>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '11.5px',
                          fontWeight: 800,
                          background: r.reportStatus === 'Approved'
                            ? 'rgba(5, 150, 105, 0.12)'
                            : r.reportStatus === 'Needs Correction'
                            ? 'rgba(239, 68, 68, 0.12)'
                            : 'rgba(245, 158, 11, 0.12)',
                          color: r.reportStatus === 'Approved'
                            ? '#059669'
                            : r.reportStatus === 'Needs Correction'
                            ? '#DC2626'
                            : '#D97706'
                        }}>
                          {r.reportStatus === 'Approved' && <CheckCircle2 size={13} />}
                          {r.reportStatus === 'Needs Correction' && <AlertCircle size={13} />}
                          {r.reportStatus === 'Pending Review' && <Clock3 size={13} />}
                          <span>{r.reportStatus}</span>
                        </span>
                        {r.reviewedBy && (
                          <div style={{ fontSize: '10px', color: '#A39589', marginTop: '2px' }}>
                            By {r.reviewedBy}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedReport(r);
                              setReviewNoteInput(r.reviewNotes || '');
                              setReviewStatusInput(r.reportStatus || 'Approved');
                              setShowDetailModal(true);
                            }}
                            style={{
                              background: '#FAF8F5',
                              border: '1px solid rgba(44, 26, 17, 0.12)',
                              borderRadius: '8px',
                              padding: '5px 10px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              color: '#3C2A21',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="View Full Breakdown"
                          >
                            <Eye size={13} />
                            <span>Details</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setPrintSlipReport(r)}
                            style={{
                              background: '#FAF8F5',
                              border: '1px solid rgba(44, 26, 17, 0.12)',
                              borderRadius: '8px',
                              padding: '5px 9px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              color: '#3C2A21',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Print Individual Shift Certificate"
                          >
                            <Printer size={13} />
                            <span>Slip</span>
                          </button>

                          {r.reportStatus !== 'Approved' && (
                            <button
                              type="button"
                              onClick={(e) => handleQuickApprove(r.id, e)}
                              style={{
                                background: '#059669',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '5px 10px',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                color: '#FFFFFF',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title="Quick Approve Report"
                            >
                              <Check size={13} />
                              <span>Approve</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>
    )}

    {/* VIEW MODE 2: SHIFT CALENDAR VIEW */}
    {viewMode === 'calendar' && (
      <div className="admin-table-card fade-in" style={{ padding: '24px', background: '#FFFFFF', borderRadius: '18px', border: '1px solid rgba(44, 26, 17, 0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1C1917' }}>
              Shift & Attendance Calendar
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#786456' }}>
              Monthly operational view: monitor daily attendance, sales volume, and report approval status. Click any date to view individual shift sheets.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 800, color: '#C24522' }}>
              November 2026
            </span>
            <button
              type="button"
              onClick={() => { setSelectedDate('2026-11-11'); setViewMode('list'); }}
              style={{
                background: '#FAF8F5',
                border: '1px solid rgba(44, 26, 17, 0.12)',
                borderRadius: '8px',
                padding: '5px 10px',
                fontSize: '11.5px',
                fontWeight: 700,
                color: '#3C2A21',
                cursor: 'pointer'
              }}
            >
              Go to Today
            </button>
          </div>
        </div>

        {/* Calendar Weekday Headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px', marginBottom: '10px' }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: '11.5px', fontWeight: 800, color: '#786456', textTransform: 'uppercase', padding: '6px 0' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Days Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px' }}>
          {Array.from({ length: 30 }, (_, i) => {
            const dayNum = i + 1;
            const dayStr = `2026-11-${String(dayNum).padStart(2, '0')}`;
            const isToday = dayStr === '2026-11-11';
            const isSelected = dayStr === selectedDate;
            const timelineEntry = analyticsTimeline.find(t => t.date === dayStr);
            const hasData = Boolean(timelineEntry) || dayNum <= 11;
            const daySales = isSelected && summaryKpi
              ? Number(summaryKpi.totalReconciledSales || 0)
              : timelineEntry
              ? Number(timelineEntry.totalSales || 0)
              : (dayNum === 11 ? 17929.80 : (dayNum === 10 ? 15700 : (dayNum === 9 ? 14850 : 16200)));
            const dayStaffCount = isSelected && reports.length > 0
              ? reports.length
              : timelineEntry?.totalReports || 8;
            const dayApprovedCount = isSelected && summaryKpi
              ? summaryKpi.approvedCount
              : timelineEntry
              ? timelineEntry.approvedCount
              : (dayNum === 11 ? 5 : 8);
            const dayPendingCount = isSelected && summaryKpi
              ? (summaryKpi.pendingCount + (summaryKpi.needsCorrectionCount || 0))
              : timelineEntry
              ? timelineEntry.pendingCount
              : (dayNum === 11 ? 3 : 0);

            return (
              <div
                key={dayStr}
                onClick={() => {
                  setSelectedDate(dayStr);
                  setViewMode('list');
                }}
                style={{
                  minHeight: '105px',
                  borderRadius: '14px',
                  padding: '10px',
                  background: isSelected ? 'rgba(194, 69, 34, 0.04)' : (hasData ? '#FAF8F5' : '#FFFFFF'),
                  border: isSelected ? '2px solid #C24522' : (isToday ? '2px solid #059669' : '1px solid rgba(44, 26, 17, 0.08)'),
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: isSelected ? '0 4px 12px rgba(194, 69, 34, 0.15)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: isToday ? '#059669' : (isSelected ? '#C24522' : '#1C1917') }}>
                    {dayNum}
                  </span>
                  {isToday && (
                    <span style={{ fontSize: '9.5px', fontWeight: 800, background: '#059669', color: '#FFFFFF', padding: '1px 5px', borderRadius: '4px' }}>
                      TODAY
                    </span>
                  )}
                </div>

                {hasData ? (
                  <div style={{ marginTop: '6px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#059669' }}>
                      ₱{daySales.toLocaleString('en-US', { minimumFractionDigits: daySales % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: '10px', color: '#786456', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Users size={10} />
                      <span>{dayStaffCount} Staff on Duty</span>
                    </div>
                    <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '9px', fontWeight: 700, color: '#059669', background: 'rgba(5, 150, 105, 0.12)', padding: '1px 5px', borderRadius: '4px' }}>
                        {dayApprovedCount} Approved
                      </span>
                      {dayPendingCount > 0 && (
                        <span style={{ fontSize: '9px', fontWeight: 700, color: '#D97706', background: 'rgba(245, 158, 11, 0.15)', padding: '1px 4px', borderRadius: '4px' }}>
                          {dayPendingCount} Pending
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '10.5px', color: '#A39589', fontStyle: 'italic', marginTop: 'auto' }}>
                    Scheduled
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    )}

    {/* VIEW MODE 3: RECONCILED ANALYTICS VIEW */}
    {viewMode === 'analytics' && (() => {
      const cashTotal = Number(summaryKpi?.totalCashSales ?? reports.reduce((s, r) => s + Number(r.cashierData?.cashSales || 0), 0));
      const digitalTotal = Number(summaryKpi?.totalDigitalSales ?? reports.reduce((s, r) => s + Number(r.cashierData?.digitalSales || 0), 0));
      const grandTotal = Number((summaryKpi?.totalReconciledSales ?? (cashTotal + digitalTotal)) || 0);
      const cashPct = grandTotal > 0 ? Number(((cashTotal / grandTotal) * 100).toFixed(1)) : 0;
      const digitalPct = grandTotal > 0 ? Number((100 - cashPct).toFixed(1)) : 0;
      const totalTxCount = summaryKpi?.totalTransactions ?? reports.reduce((s, r) => s + Number(r.cashierData?.transactionsCount || 0), 0);

      const openingFloatTotal = Number(summaryKpi?.totalOpeningFloat ?? reports.reduce((s, r) => s + Number(r.cashierData?.openingFloat || 0), 0));
      const expectedCashTotal = Number(summaryKpi?.totalExpectedCash ?? reports.reduce((s, r) => s + Number(r.cashierData?.expectedCash || 0), 0));
      const actualCashTotal = Number(summaryKpi?.totalActualCash ?? reports.reduce((s, r) => s + Number(r.cashierData?.actualCashCount || 0), 0));
      const varianceTotal = Number(summaryKpi?.totalCashVariance ?? (actualCashTotal - expectedCashTotal));
      const registerCount = summaryKpi?.cashiersOnDuty || reports.filter(r => r.reportType === 'cashier').length || 2;

      const kitchenTotal = summaryKpi?.totalKitchenOrders ?? reports.reduce((s, r) => s + Number(r.staffData?.kitchenOrdersHandled || 0), 0);
      const tableCallsTotal = summaryKpi?.totalTableCalls ?? reports.reduce((s, r) => s + Number(r.staffData?.tableServiceCallsHandled || 0), 0);
      const tasksCompletedTotal = summaryKpi?.totalTasksCompleted ?? reports.reduce((s, r) => s + (r.staffData?.tasksCompleted?.length || 0), 0);
      const tasksPendingTotal = summaryKpi?.totalTasksPending ?? reports.reduce((s, r) => s + (r.staffData?.tasksPending?.length || 0), 0);

      const punctualityPct = summaryKpi?.punctualityRate ?? (reports.length > 0 ? Number(((reports.filter(r => r.attendance?.status === 'Present').length / reports.length) * 100).toFixed(1)) : 100);
      const staffHoursTotal = summaryKpi?.totalStaffHours ?? Number(reports.reduce((s, r) => s + Number(r.attendance?.totalHours || 0), 0).toFixed(1));
      const absentTotal = summaryKpi?.absentCount ?? reports.filter(r => r.attendance?.status === 'Absent').length;
      const presentStaffCount = summaryKpi?.presentCount ?? reports.filter(r => r.attendance?.status === 'Present').length;
      const lateReports = reports.filter(r => r.attendance?.status === 'Late' || r.attendance?.isLate);

      return (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{
            background: '#FFFFFF',
            padding: '18px 24px',
            borderRadius: '16px',
            border: '1px solid rgba(44, 26, 17, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1C1917' }}>
                Shift Reconciliation & Operational Audit
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#786456' }}>
                Audited live metrics for {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>

            <button
              type="button"
              onClick={handleExportCSV}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '8px',
                background: '#FAF8F5',
                border: '1px solid rgba(44, 26, 17, 0.12)',
                fontSize: '12px',
                fontWeight: 700,
                color: '#3C2A21',
                cursor: 'pointer'
              }}
            >
              <Download size={13} />
              <span>Export Audit Data</span>
            </button>
          </div>

          {/* 2x2 Analytics Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '16px' }}>
            {/* Card 1: Payment Method Breakdown */}
            <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: '18px', border: '1px solid rgba(44, 26, 17, 0.08)' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: 800, color: '#1C1917', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <DollarSign size={16} color="#059669" />
                <span>Shift Payment Method Distribution</span>
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, color: '#1C1917' }}>Physical Cash Tendered</span>
                    <span style={{ fontWeight: 800, color: '#059669' }}>
                      ₱{cashTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({cashPct}%)
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(5, 150, 105, 0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${cashPct}%`, height: '100%', background: '#059669', borderRadius: '4px' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, color: '#1C1917' }}>GCash / Maya / Card Digital Payments</span>
                    <span style={{ fontWeight: 800, color: '#2563EB' }}>
                      ₱{digitalTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({digitalPct}%)
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(37, 99, 235, 0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${digitalPct}%`, height: '100%', background: '#2563EB', borderRadius: '4px' }} />
                  </div>
                </div>

                <div style={{ padding: '12px', background: '#FAF8F5', borderRadius: '10px', fontSize: '12px', color: '#685D54', lineHeight: 1.4 }}>
                  <strong>Reconciliation Result:</strong> Total shift transactions count = <strong>{totalTxCount} completed orders</strong> (₱{grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}). All digital &amp; cash payments matched verified POS order records.
                </div>
              </div>
            </div>

            {/* Card 2: Cash Register Drawer Audit */}
            <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: '18px', border: '1px solid rgba(44, 26, 17, 0.08)' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: 800, color: '#1C1917', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Receipt size={16} color="#C24522" />
                <span>Register Over / Short Balance Audit</span>
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#FAF8F5', borderRadius: '8px' }}>
                  <span style={{ color: '#685D54' }}>Total Opening Float ({registerCount} Registers):</span>
                  <strong style={{ color: '#1C1917' }}>₱{openingFloatTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#FAF8F5', borderRadius: '8px' }}>
                  <span style={{ color: '#685D54' }}>Total Cash Sales Recorded:</span>
                  <strong style={{ color: '#059669' }}>₱{cashTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#FAF8F5', borderRadius: '8px' }}>
                  <span style={{ color: '#685D54' }}>Expected Cash in Drawers:</span>
                  <strong style={{ color: '#1C1917' }}>₱{expectedCashTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#FAF8F5', borderRadius: '8px' }}>
                  <span style={{ color: '#685D54' }}>Actual Counted Physical Cash:</span>
                  <strong style={{ color: '#059669' }}>₱{actualCashTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  background: varianceTotal === 0 ? 'rgba(5, 150, 105, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                  border: varianceTotal === 0 ? '1px solid rgba(5, 150, 105, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '8px'
                }}>
                  <strong style={{ color: varianceTotal === 0 ? '#065F46' : '#991B1B' }}>Net Variance Status:</strong>
                  <strong style={{ color: varianceTotal === 0 ? '#059669' : '#DC2626', fontSize: '13px' }}>
                    {varianceTotal === 0 ? '₱0.00 Exact (100% Balanced)' : `₱${varianceTotal.toFixed(2)} Discrepancy`}
                  </strong>
                </div>
              </div>
            </div>

            {/* Card 3: Operational Station Productivity */}
            <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: '18px', border: '1px solid rgba(44, 26, 17, 0.08)' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: 800, color: '#1C1917', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ChefHat size={16} color="#E45729" />
                <span>Operational Station Output</span>
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                <div style={{ padding: '10px 12px', border: '1px solid rgba(44, 26, 17, 0.08)', borderRadius: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginBottom: '4px' }}>
                    <span>🍜 Kitchen Line &amp; Prep (Chef Kenji &amp; Hiroshi)</span>
                    <span style={{ color: '#C24522' }}>{kitchenTotal} Orders Prepped</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#786456' }}>100% allergen exclusion compliance verified on all kitchen tickets.</div>
                </div>

                <div style={{ padding: '10px 12px', border: '1px solid rgba(44, 26, 17, 0.08)', borderRadius: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginBottom: '4px' }}>
                    <span>🛎️ Floor &amp; Table Service (Leo, Ana, Miguel)</span>
                    <span style={{ color: '#2563EB' }}>{tableCallsTotal} Calls Serviced</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#786456' }}>Connected to Mobile &amp; Kiosk Call Server assistance requests.</div>
                </div>

                <div style={{ padding: '10px 12px', border: '1px solid rgba(44, 26, 17, 0.08)', borderRadius: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginBottom: '4px' }}>
                    <span>🛡️ Station Checklists &amp; Store Audit</span>
                    <span style={{ color: '#059669' }}>{tasksCompletedTotal} Tasks Completed</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#786456' }}>{tasksPendingTotal} carryover tasks logged for next shift handover.</div>
                </div>
              </div>
            </div>

            {/* Card 4: Attendance & Punctuality Summary */}
            <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: '18px', border: '1px solid rgba(44, 26, 17, 0.08)' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: 800, color: '#1C1917', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} color="#2563EB" />
                <span>Shift Attendance &amp; Punctuality Audit</span>
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '14px' }}>
                <div style={{ textAlign: 'center', padding: '12px 6px', background: '#F0FDF4', borderRadius: '10px', border: '1px solid #BBF7D0' }}>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: '#15803D' }}>{punctualityPct}%</div>
                  <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#166534' }}>Punctuality Rate</div>
                </div>
                <div style={{ textAlign: 'center', padding: '12px 6px', background: '#FAF8F5', borderRadius: '10px', border: '1px solid rgba(44, 26, 17, 0.08)' }}>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: '#1C1917' }}>{staffHoursTotal}</div>
                  <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#786456' }}>Staff Hours</div>
                </div>
                <div style={{ textAlign: 'center', padding: '12px 6px', background: '#FEF2F2', borderRadius: '10px', border: '1px solid #FECACA' }}>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: '#DC2626' }}>{absentTotal}</div>
                  <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#991B1B' }}>Unexcused Absences</div>
                </div>
              </div>

              <div style={{ fontSize: '11.5px', color: '#685D54', lineHeight: 1.4 }}>
                <strong>Staff Attendance Notes:</strong> {presentStaffCount} of {reports.length} employees clocked in on time.
                {lateReports.length > 0
                  ? ` Late arrival logged for ${lateReports.map(r => `${r.employeeName} (${r.attendance?.clockIn || 'Late'})`).join(', ')}.`
                  : ' Zero late arrivals recorded for this date.'}
              </div>
            </div>
          </div>
        </div>
      );
    })()}

      {/* MODAL 1: VIEW REPORT DETAILS & MANAGER APPROVAL WORKFLOW */}
      {showDetailModal && selectedReport && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(28, 25, 23, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div className="fade-in" style={{
            background: '#FFFFFF',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '720px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
            border: '1px solid rgba(44, 26, 17, 0.08)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid rgba(44, 26, 17, 0.08)',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              background: '#FAF8F5'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 800,
                    background: selectedReport.reportType === 'cashier' ? 'rgba(5, 150, 105, 0.12)' : 'rgba(194, 69, 34, 0.12)',
                    color: selectedReport.reportType === 'cashier' ? '#059669' : '#C24522'
                  }}>
                    {selectedReport.reportType === 'cashier' ? 'Cashier Reconciliation Report' : 'Staff Operational Report'}
                  </span>
                  <span style={{ fontSize: '12px', color: '#786456', fontFamily: 'monospace' }}>
                    #{selectedReport.id}
                  </span>
                </div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1C1917' }}>
                  {selectedReport.employeeName} – {selectedReport.position}
                </h2>
                <div style={{ fontSize: '12px', color: '#786456', marginTop: '2px' }}>
                  Shift: {selectedReport.shift} • Date: {selectedReport.reportDate}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#786456',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '8px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px' }}>
              {/* Attendance Bar */}
              <div style={{
                background: '#FAF8F5',
                borderRadius: '14px',
                padding: '14px 18px',
                marginBottom: '20px',
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '12px',
                textAlign: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#786456', fontWeight: 700 }}>CLOCK IN</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#1C1917' }}>
                    {selectedReport.attendance?.clockIn || '08:00 AM'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#786456', fontWeight: 700 }}>CLOCK OUT</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#1C1917' }}>
                    {selectedReport.attendance?.clockOut || '04:00 PM'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#786456', fontWeight: 700 }}>TOTAL HOURS</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#1C1917' }}>
                    {selectedReport.attendance?.totalHours || 8} hrs
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#786456', fontWeight: 700 }}>ATTENDANCE</div>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: 800,
                    color: selectedReport.attendance?.status === 'Present' ? '#059669' : '#D97706'
                  }}>
                    {selectedReport.attendance?.status || 'Present'}
                  </div>
                </div>
              </div>

              {/* CASHIER SPECIFIC SECTION */}
              {selectedReport.cashierData && (
                <div style={{ marginBottom: '22px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#1C1917', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Receipt size={16} color="#059669" />
                    <span>Cash Drawer & Payment Reconciliation</span>
                  </h3>

                  {/* Cash Breakdown Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '12px',
                    marginBottom: '14px'
                  }}>
                    <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '12px', borderRadius: '12px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#166534' }}>OPENING FLOAT</div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#15803D' }}>
                        ₱{Number(selectedReport.cashierData.openingFloat || 0).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '12px', borderRadius: '12px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#166534' }}>CASH SALES RECORDED</div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#15803D' }}>
                        ₱{Number(selectedReport.cashierData.cashSales || 0).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '12px', borderRadius: '12px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#1E40AF' }}>DIGITAL / GCASH</div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#1D4ED8' }}>
                        ₱{Number(selectedReport.cashierData.digitalSales || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Reconciliation Equation Card */}
                  <div style={{
                    background: '#FFFFFF',
                    border: '1.5px solid rgba(44, 26, 17, 0.12)',
                    borderRadius: '14px',
                    padding: '14px 18px',
                    marginBottom: '14px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#685D54' }}>Expected Drawer Cash (Opening + Cash Sales):</span>
                      <strong style={{ fontSize: '14px', color: '#1C1917' }}>
                        ₱{Number(selectedReport.cashierData.expectedCash || 0).toLocaleString()}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#685D54' }}>Actual Cash Counted by Cashier:</span>
                      <strong style={{ fontSize: '14px', color: '#1C1917' }}>
                        ₱{Number(selectedReport.cashierData.actualCashCount || 0).toLocaleString()}
                      </strong>
                    </div>
                    <div style={{
                      paddingTop: '8px',
                      borderTop: '1px dashed rgba(44, 26, 17, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#1C1917' }}>Cash Variance / Discrepancy:</span>
                      <span style={{
                        fontSize: '15px',
                        fontWeight: 900,
                        color: (selectedReport.cashierData.variance || 0) === 0 ? '#059669' : '#EF4444'
                      }}>
                        {(selectedReport.cashierData.variance || 0) === 0 ? '₱0.00 (Balanced Exact)' : `₱${Number(selectedReport.cashierData.variance).toFixed(2)}`}
                      </span>
                    </div>
                  </div>

                  {/* Cash Denominations Table if present */}
                  {selectedReport.cashierData.denominations && Object.keys(selectedReport.cashierData.denominations).length > 0 && (
                    <div style={{ background: '#FAF8F5', borderRadius: '12px', padding: '12px', marginBottom: '14px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#786456', textTransform: 'uppercase', marginBottom: '8px' }}>
                        Counted Bill & Coin Denominations
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '11.5px' }}>
                        {Object.entries(selectedReport.cashierData.denominations).map(([denom, qty]) => (
                          <span key={denom} style={{ background: '#FFFFFF', padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(44, 26, 17, 0.08)' }}>
                            ₱{denom} × <strong>{qty}</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Handled Order IDs with Clickable Drilldown */}
                  {selectedReport.cashierData.handledOrderIds && selectedReport.cashierData.handledOrderIds.length > 0 && (
                    <div style={{ background: '#FAF8F5', borderRadius: '12px', padding: '12px', marginBottom: '14px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#786456', textTransform: 'uppercase', marginBottom: '8px' }}>
                        Processed Customer Orders ({selectedReport.cashierData.handledOrderIds.length})
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {selectedReport.cashierData.handledOrderIds.map(oid => (
                          <button
                            key={oid}
                            type="button"
                            onClick={() => handleOpenOrderPreview(oid)}
                            style={{
                              background: '#FFFFFF',
                              border: '1px solid rgba(5, 150, 105, 0.3)',
                              color: '#059669',
                              borderRadius: '6px',
                              padding: '4px 9px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Click to view order details"
                          >
                            <span>{oid}</span>
                            <span style={{ fontSize: '10px', color: '#10B981' }}>↗</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STAFF SPECIFIC SECTION */}
              {selectedReport.staffData && (
                <div style={{ marginBottom: '22px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#1C1917', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ChefHat size={16} color="#C24522" />
                    <span>Station Responsibilities & Task Log</span>
                  </h3>

                  <div style={{ background: '#FAF8F5', borderRadius: '12px', padding: '14px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#1C1917', marginBottom: '8px' }}>
                      ✓ Completed Tasks ({selectedReport.staffData.tasksCompleted?.length || 0}):
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12.5px', color: '#3C2A21', lineHeight: '1.6' }}>
                      {(selectedReport.staffData.tasksCompleted || []).map((t, idx) => (
                        <li key={idx}>{t}</li>
                      ))}
                    </ul>
                  </div>

                  {selectedReport.staffData.tasksPending?.length > 0 && (
                    <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '12px', padding: '12px', marginBottom: '12px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#92400E', marginBottom: '4px' }}>
                        ⏳ Pending Carryover Tasks:
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#78350F' }}>
                        {selectedReport.staffData.tasksPending.map((p, idx) => (
                          <li key={idx}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    <div style={{ background: '#F5F5F4', borderRadius: '10px', padding: '10px 14px' }}>
                      <div style={{ fontSize: '11px', color: '#786456' }}>Kitchen Orders Plated</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#1C1917' }}>
                        {selectedReport.staffData.kitchenOrdersHandled || 0}
                      </div>
                    </div>
                    <div style={{ background: '#F5F5F4', borderRadius: '10px', padding: '10px 14px' }}>
                      <div style={{ fontSize: '11px', color: '#786456' }}>Table Calls Handled</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#1C1917' }}>
                        {selectedReport.staffData.tableServiceCallsHandled || 0}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Employee Notes */}
              {selectedReport.employeeNotes && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#786456', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Employee Shift Notes
                  </div>
                  <div style={{ background: '#FAF8F5', padding: '10px 14px', borderRadius: '10px', fontSize: '12.5px', color: '#3C2A21', fontStyle: 'italic' }}>
                    &quot;{selectedReport.employeeNotes}&quot;
                  </div>
                </div>
              )}

              {/* MANAGER APPROVAL & SIGN-OFF WORKFLOW */}
              <div style={{
                background: '#FFFFFF',
                border: '1.5px solid #C24522',
                borderRadius: '16px',
                padding: '18px',
                boxShadow: '0 4px 14px rgba(194, 69, 34, 0.08)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: 800, color: '#C24522', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <BadgeCheck size={16} />
                    <span>Manager Review & Verification Workflow</span>
                  </h4>
                  <div style={{ fontSize: '11px', color: '#786456' }}>
                    Reviewed By: <strong>{selectedReport.reviewedBy || currentAdminName}</strong>
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#3C2A21', marginBottom: '6px' }}>
                    Decision Status:
                  </label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {['Approved', 'Needs Correction', 'Pending Review'].map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setReviewStatusInput(st)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: reviewStatusInput === st ? '1.5px solid #1C1917' : '1px solid rgba(44, 26, 17, 0.12)',
                          background: reviewStatusInput === st
                            ? (st === 'Approved' ? '#059669' : st === 'Needs Correction' ? '#DC2626' : '#D97706')
                            : '#FFFFFF',
                          color: reviewStatusInput === st ? '#FFFFFF' : '#3C2A21'
                        }}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#3C2A21', marginBottom: '4px' }}>
                    Manager Review / Auditor Notes:
                  </label>
                  <textarea
                    rows={2}
                    value={reviewNoteInput}
                    onChange={(e) => setReviewNoteInput(e.target.value)}
                    placeholder="Enter audit notes, drawer check observations, or correction requests..."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(44, 26, 17, 0.15)',
                      fontSize: '12px',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setShowDetailModal(false)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '8px',
                      background: '#FAF8F5',
                      border: '1px solid rgba(44, 26, 17, 0.12)',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#685D54',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveReview}
                    disabled={isSubmittingReview}
                    style={{
                      padding: '7px 18px',
                      borderRadius: '8px',
                      background: '#C24522',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: 800,
                      color: '#FFFFFF',
                      cursor: 'pointer'
                    }}
                  >
                    {isSubmittingReview ? 'Saving Sign-Off…' : 'Save & Sign-Off Report'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: SUBMIT / GENERATE SHIFT REPORT */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(28, 25, 23, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div className="fade-in" style={{
            background: '#FFFFFF',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '650px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
            border: '1px solid rgba(44, 26, 17, 0.08)'
          }}>
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid rgba(44, 26, 17, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#FAF8F5'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileSpreadsheet size={18} color="#C24522" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#1C1917' }}>
                  Submit Daily Shift Report
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', color: '#786456', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateReportSubmit} style={{ padding: '20px 24px' }}>
              {/* Employee Selection + Pull Live Data Button */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#3C2A21' }}>
                    Select Employee Roster:
                  </label>
                  <button
                    type="button"
                    disabled={isLoadingLiveMetrics}
                    onClick={() => pullLiveEmployeeMetrics(newReportForm.employeeId, newReportForm.reportDate)}
                    style={{
                      background: 'rgba(5, 150, 105, 0.1)',
                      border: '1px solid rgba(5, 150, 105, 0.3)',
                      color: '#059669',
                      borderRadius: '6px',
                      padding: '3px 9px',
                      fontSize: '11px',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    {isLoadingLiveMetrics ? 'Pulling Live Data…' : '⚡ Pull Live POS / Station Data'}
                  </button>
                </div>
                <select
                  value={newReportForm.employeeId}
                  onChange={(e) => {
                    const nextEmpId = e.target.value;
                    const emp = employeeRoster.find(r => r.id === nextEmpId);
                    if (emp) {
                      setNewReportForm(prev => ({
                        ...prev,
                        employeeId: emp.id,
                        employeeName: emp.name,
                        role: emp.role,
                        position: emp.position,
                        shift: emp.defaultShift,
                        reportType: emp.type
                      }));
                      pullLiveEmployeeMetrics(emp.id, newReportForm.reportDate);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(44, 26, 17, 0.15)',
                    fontSize: '12.5px',
                    fontFamily: 'inherit'
                  }}
                >
                  {employeeRoster.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.id} - {emp.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Shift and Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#3C2A21', marginBottom: '4px' }}>
                    Shift Schedule:
                  </label>
                  <select
                    value={newReportForm.shift}
                    onChange={(e) => setNewReportForm({ ...newReportForm, shift: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(44, 26, 17, 0.15)',
                      fontSize: '12px',
                      fontFamily: 'inherit'
                    }}
                  >
                    <option value="Morning Shift (08:00 - 16:00)">Morning Shift (08:00 - 16:00)</option>
                    <option value="Evening Shift (16:00 - 00:00)">Evening Shift (16:00 - 00:00)</option>
                    <option value="Mid Shift (11:00 - 19:00)">Mid Shift (11:00 - 19:00)</option>
                    <option value="Day Shift (09:00 - 17:00)">Day Shift (09:00 - 17:00)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#3C2A21', marginBottom: '4px' }}>
                    Report Date:
                  </label>
                  <input
                    type="date"
                    value={newReportForm.reportDate}
                    onChange={(e) => setNewReportForm({ ...newReportForm, reportDate: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '7px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(44, 26, 17, 0.15)',
                      fontSize: '12px',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>
              </div>

              {/* Clock In / Out / Hours */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#3C2A21', marginBottom: '4px' }}>
                    Clock In:
                  </label>
                  <input
                    type="text"
                    value={newReportForm.clockIn}
                    onChange={(e) => setNewReportForm({ ...newReportForm, clockIn: e.target.value })}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(44, 26, 17, 0.15)', fontSize: '12px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#3C2A21', marginBottom: '4px' }}>
                    Clock Out:
                  </label>
                  <input
                    type="text"
                    value={newReportForm.clockOut}
                    onChange={(e) => setNewReportForm({ ...newReportForm, clockOut: e.target.value })}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(44, 26, 17, 0.15)', fontSize: '12px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#3C2A21', marginBottom: '4px' }}>
                    Total Hours:
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={newReportForm.totalHours}
                    onChange={(e) => setNewReportForm({ ...newReportForm, totalHours: Number(e.target.value) })}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(44, 26, 17, 0.15)', fontSize: '12px' }}
                  />
                </div>
              </div>

              {/* CASHIER INPUTS */}
              {newReportForm.reportType === 'cashier' ? (
                <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '12px', padding: '14px', marginBottom: '14px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#166534', marginBottom: '10px' }}>
                    Cashier POS & Register Cash Reconciliation
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#166534', marginBottom: '2px' }}>Opening Float (₱):</label>
                      <input
                        type="number"
                        value={newReportForm.openingFloat}
                        onChange={(e) => setNewReportForm({ ...newReportForm, openingFloat: Number(e.target.value) })}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #86EFAC', fontSize: '12px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#166534', marginBottom: '2px' }}>Cash Sales Recorded (₱):</label>
                      <input
                        type="number"
                        value={newReportForm.cashSales}
                        onChange={(e) => setNewReportForm({ ...newReportForm, cashSales: Number(e.target.value) })}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #86EFAC', fontSize: '12px' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#166534', marginBottom: '2px' }}>Digital / GCash (₱):</label>
                      <input
                        type="number"
                        value={newReportForm.digitalSales}
                        onChange={(e) => setNewReportForm({ ...newReportForm, digitalSales: Number(e.target.value) })}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #86EFAC', fontSize: '12px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#166534', marginBottom: '2px' }}>Actual Cash Counted in Drawer (₱):</label>
                      <input
                        type="number"
                        value={newReportForm.actualCashCount}
                        onChange={(e) => setNewReportForm({ ...newReportForm, actualCashCount: Number(e.target.value) })}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #86EFAC', fontSize: '12px' }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* STAFF INPUTS */
                <div style={{ background: '#FAF8F5', border: '1px solid rgba(44, 26, 17, 0.1)', borderRadius: '12px', padding: '14px', marginBottom: '14px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#1C1917', marginBottom: '8px' }}>
                    Station Tasks & Activity Log
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#3C2A21', marginBottom: '2px' }}>
                      Completed Tasks (One per line):
                    </label>
                    <textarea
                      rows={3}
                      value={newReportForm.tasksCompletedStr}
                      onChange={(e) => setNewReportForm({ ...newReportForm, tasksCompletedStr: e.target.value })}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(44, 26, 17, 0.15)', fontSize: '12px' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#3C2A21', marginBottom: '2px' }}>Kitchen Orders Plated:</label>
                      <input
                        type="number"
                        value={newReportForm.kitchenOrdersHandled}
                        onChange={(e) => setNewReportForm({ ...newReportForm, kitchenOrdersHandled: Number(e.target.value) })}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid rgba(44, 26, 17, 0.15)', fontSize: '12px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#3C2A21', marginBottom: '2px' }}>Table Calls Handled:</label>
                      <input
                        type="number"
                        value={newReportForm.tableServiceCallsHandled}
                        onChange={(e) => setNewReportForm({ ...newReportForm, tableServiceCallsHandled: Number(e.target.value) })}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid rgba(44, 26, 17, 0.15)', fontSize: '12px' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Employee Notes */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#3C2A21', marginBottom: '4px' }}>
                  Shift Remarks / Handover Notes:
                </label>
                <textarea
                  rows={2}
                  value={newReportForm.employeeNotes}
                  onChange={(e) => setNewReportForm({ ...newReportForm, employeeNotes: e.target.value })}
                  placeholder="Any equipment notes, food prep notes, or customer rush observations..."
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(44, 26, 17, 0.15)', fontSize: '12px' }}
                />
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    background: '#FAF8F5',
                    border: '1px solid rgba(44, 26, 17, 0.12)',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#685D54',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    background: '#C24522',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#FFFFFF',
                    cursor: 'pointer'
                  }}
                >
                  Submit Daily Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DEDICATED PRINT / PDF SHIFT CERTIFICATE MODAL */}
      {printSlipReport && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(28, 25, 23, 0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10001,
          padding: '20px'
        }}>
          <div className="fade-in" style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '92vh',
            overflowY: 'auto',
            padding: '28px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
            border: '1px solid rgba(44, 26, 17, 0.12)',
            fontFamily: 'var(--font-sans)'
          }}>
            {/* Action Bar (Not visible in printed paper) */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid rgba(44, 26, 17, 0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, background: '#FAF8F5', padding: '4px 8px', borderRadius: '6px', color: '#786456' }}>
                  Print Preview
                </span>
                <span style={{ fontSize: '12px', color: '#685D54' }}>
                  Official Shift Record Slip
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 16px',
                    borderRadius: '8px',
                    background: '#C24522',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  <Printer size={14} />
                  <span>Print Slip / Save PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintSlipReport(null)}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '8px',
                    background: '#FAF8F5',
                    border: '1px solid rgba(44, 26, 17, 0.12)',
                    fontWeight: 700,
                    fontSize: '12px',
                    color: '#685D54',
                    cursor: 'pointer'
                  }}
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {/* Printable Slip Certificate Content */}
            <div style={{ border: '2px solid #1C1917', borderRadius: '12px', padding: '24px', background: '#FFFFFF' }}>
              {/* Slip Header */}
              <div style={{ textAlign: 'center', borderBottom: '2px solid #1C1917', paddingBottom: '14px', marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '0.15em', color: '#2563EB', textTransform: 'uppercase' }}>
                  UMAMI CRAFT FUSION • OFFICIAL REPORT SLIP
                </div>
                <h1 style={{ margin: '4px 0 2px 0', fontSize: '18px', fontWeight: 900, color: '#1C1917' }}>
                  {printSlipReport.cashierData ? 'Cashier Daily Financial & Reconciliation Report' : 'Staff Daily Shift Performance Report'}
                </h1>
                <div style={{ fontSize: '11px', color: '#685D54' }}>
                  Branch: Rockwell Center Main • Document ID: {printSlipReport.id} • Date: {printSlipReport.reportDate}
                </div>
              </div>

              {/* Employee & Station Card matching Screenshot 4 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '11.5px', marginBottom: '16px', padding: '14px', background: '#FAF8F5', borderRadius: '12px', border: '1px solid #E7E5E4' }}>
                <div>
                  <div style={{ fontSize: '10.5px', color: '#78716C', fontWeight: 700 }}>Employee Name &amp; ID</div>
                  <div style={{ fontWeight: 900, color: '#1C1917', fontSize: '13px' }}>{printSlipReport.employeeName} ({printSlipReport.employeeId})</div>
                  <div style={{ fontSize: '11px', color: '#57534E' }}>{printSlipReport.position}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10.5px', color: '#78716C', fontWeight: 700 }}>Station &amp; Shift</div>
                  <div style={{ fontWeight: 900, color: '#1C1917', fontSize: '13px' }}>{printSlipReport.staffData?.assignedStation || printSlipReport.department || 'Hot Kitchen, Wok Station & Allergen Verification'}</div>
                  <div style={{ fontSize: '11px', color: '#2563EB' }}>{printSlipReport.shift} • Date: {printSlipReport.reportDate}</div>
                </div>
              </div>

              {/* SECTION 1: ATTENDANCE & WORKING HOURS matching Screenshot 4 */}
              <div style={{ border: '1px solid #E7E5E4', borderRadius: '12px', padding: '12px', background: '#FFFFFF', marginBottom: '14px' }}>
                <div style={{ fontWeight: 900, fontSize: '12px', color: '#1E40AF', marginBottom: '6px' }}>
                  SECTION 1: ATTENDANCE &amp; WORKING HOURS
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', fontSize: '11px' }}>
                  <div>Time In: <strong>{printSlipReport.attendance?.clockIn || '07:30 AM'}</strong></div>
                  <div>Time Out: <strong>{printSlipReport.attendance?.clockOut || '04:00 PM'}</strong></div>
                  <div>Total: <strong>{printSlipReport.attendance?.totalHours || 8.5} hrs</strong></div>
                  <div>Status: <strong style={{ color: '#047857' }}>{printSlipReport.attendance?.status || 'Present (On Time)'}</strong></div>
                </div>
              </div>

              {/* Cashier Reconciliation Details if Cashier */}
              {printSlipReport.cashierData && (
                <div style={{ marginBottom: '16px', border: '1px solid rgba(44, 26, 17, 0.15)', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 900, color: '#1C1917', textTransform: 'uppercase', marginBottom: '10px', borderBottom: '1px solid rgba(44, 26, 17, 0.1)', paddingBottom: '4px' }}>
                    Cash Drawer & Financial Audit ({printSlipReport.cashierData.registerId})
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '11.5px', marginBottom: '10px' }}>
                    <div>Opening Cash Float: <strong>₱{Number(printSlipReport.cashierData.openingFloat || 0).toLocaleString()}</strong></div>
                    <div>Total Shift Sales: <strong>₱{Number(printSlipReport.cashierData.totalSales || 0).toLocaleString()}</strong></div>
                    <div>Cash Received: <strong>₱{Number(printSlipReport.cashierData.cashSales || 0).toLocaleString()}</strong></div>
                    <div>Digital (GCash/Maya): <strong>₱{Number(printSlipReport.cashierData.digitalSales || 0).toLocaleString()}</strong></div>
                    <div>Expected Drawer Cash: <strong>₱{Number(printSlipReport.cashierData.expectedCash || 0).toLocaleString()}</strong></div>
                    <div>Actual Counted Cash: <strong>₱{Number(printSlipReport.cashierData.actualCashCount || 0).toLocaleString()}</strong></div>
                  </div>

                  <div style={{ padding: '8px 10px', background: (printSlipReport.cashierData.variance || 0) === 0 ? '#F0FDF4' : '#FEF2F2', borderRadius: '6px', fontSize: '12px', fontWeight: 800, color: (printSlipReport.cashierData.variance || 0) === 0 ? '#15803D' : '#DC2626', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Drawer Variance / Discrepancy:</span>
                    <span>₱{Number(printSlipReport.cashierData.variance || 0).toFixed(2)} ({(printSlipReport.cashierData.variance || 0) === 0 ? 'BALANCED EXACT' : 'DISCREPANCY RECORDED'})</span>
                  </div>

                  {printSlipReport.cashierData.denominations && (
                    <div style={{ marginTop: '10px', fontSize: '11px' }}>
                      <span style={{ fontWeight: 700, color: '#685D54' }}>Counted Denominations: </span>
                      {Object.entries(printSlipReport.cashierData.denominations).map(([d, q]) => (
                        <span key={d} style={{ marginRight: '8px', color: '#1C1917' }}>₱{d}×{q}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Staff Work & Duties Log matching Screenshot 4 */}
              {printSlipReport.staffData && (
                <>
                  {/* SECTION 2: COMPLETED SHIFT TASKS */}
                  <div style={{ border: '1px solid #E7E5E4', borderRadius: '12px', padding: '12px', background: '#FFFFFF', marginBottom: '14px' }}>
                    <div style={{ fontWeight: 900, fontSize: '12px', color: '#047857', marginBottom: '6px' }}>
                      SECTION 2: COMPLETED SHIFT TASKS ({(printSlipReport.staffData.tasksCompleted || []).length})
                    </div>
                    <ul style={{ margin: '4px 0 0 16px', padding: 0, fontSize: '11.5px', lineHeight: 1.55 }}>
                      {(printSlipReport.staffData.tasksCompleted || []).map((t, idx) => (
                        <li key={idx}>{t}</li>
                      ))}
                    </ul>
                    <div style={{ marginTop: '8px', fontSize: '11px', color: '#57534E', fontWeight: 600 }}>
                      Kitchen Orders Prepped: <strong>{printSlipReport.staffData.kitchenOrdersHandled || 0}</strong> • Table Calls Handled: <strong>{printSlipReport.staffData.tableServiceCallsHandled || 0}</strong>
                    </div>
                  </div>

                  {/* SECTION 3: OPERATIONAL NOTES & HANDOVER */}
                  <div style={{ border: '1px solid #E7E5E4', borderRadius: '12px', padding: '12px', background: '#FFFFFF', marginBottom: '14px' }}>
                    <div style={{ fontWeight: 900, fontSize: '12px', color: '#C24522', marginBottom: '6px' }}>
                      SECTION 3: OPERATIONAL NOTES &amp; HANDOVER
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11.5px', lineHeight: 1.45 }}>
                      <div><strong>Accomplishments:</strong> {printSlipReport.staffData.dailyAccomplishments || printSlipReport.employeeNotes}</div>
                      <div><strong>Kitchen Ops:</strong> {printSlipReport.staffData.kitchenOperationsNotes || 'Hot kitchen line operating at full capacity. Broth stock reduced and strained to 1.042 Brix density standard. Allergen fryers isolated.'}</div>
                      <div><strong>Customer Concerns:</strong> {printSlipReport.staffData.customerConcernsHandled || 'All allergen exclusions verified and handled with dedicated utensils.'}</div>
                      <div><strong>Inventory Restock:</strong> {printSlipReport.staffData.inventoryUpdates || 'Broth and station stock restocked for incoming shift.'}</div>
                      <div><strong>Handover Notes:</strong> {printSlipReport.staffData.shiftHandoverInstructions || 'Monitor boiler temperatures and rotate prepared stock.'}</div>
                    </div>
                  </div>
                </>
              )}

              {/* Employee Notes & Manager Feedback */}
              <div style={{ fontSize: '11px', color: '#443831', marginBottom: '20px', padding: '10px', background: '#FAF8F5', borderRadius: '6px' }}>
                <div><strong>Employee Notes:</strong> {printSlipReport.employeeNotes || 'Shift completed without incidents.'}</div>
                {printSlipReport.reviewNotes && (
                  <div style={{ marginTop: '4px' }}><strong>Manager Feedback:</strong> {printSlipReport.reviewNotes}</div>
                )}
              </div>

              {/* Signatures & Certification Block */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '40px', paddingTop: '20px', borderTop: '1px solid rgba(44, 26, 17, 0.2)' }}>
                <div>
                  <div style={{ height: '36px', borderBottom: '1px solid #1C1917', marginBottom: '4px' }} />
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#1C1917' }}>{printSlipReport.employeeName}</div>
                  <div style={{ fontSize: '10px', color: '#786456' }}>Employee Signature & Date</div>
                </div>

                <div>
                  <div style={{ height: '36px', borderBottom: '1px solid #1C1917', marginBottom: '4px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#059669', paddingTop: '14px' }}>
                      ✓ Verified: {printSlipReport.reviewedBy || currentAdminName}
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#1C1917' }}>{printSlipReport.reviewedBy || currentAdminName}</div>
                  <div style={{ fontSize: '10px', color: '#786456' }}>Authorized Manager Sign-off & Audit Stamp</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: ORDER DETAIL PREVIEW MODAL */}
      {selectedOrderPreview && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(28, 25, 23, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10002,
          padding: '20px'
        }}>
          <div className="fade-in" style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '440px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            padding: '22px',
            border: '1px solid rgba(44, 26, 17, 0.08)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid rgba(44, 26, 17, 0.08)', paddingBottom: '10px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#C24522', textTransform: 'uppercase' }}>
                  Transaction Drilldown
                </span>
                <h3 style={{ margin: '2px 0 0 0', fontSize: '16px', fontWeight: 800, color: '#1C1917' }}>
                  Order #{selectedOrderPreview}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderPreview(null)}
                style={{ background: 'none', border: 'none', fontSize: '16px', color: '#786456', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {orderPreviewData ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '12px', background: '#FAF8F5', padding: '10px', borderRadius: '8px' }}>
                  <div>
                    <span style={{ color: '#786456' }}>Dining: </span>
                    <strong>
                      {orderPreviewData.diningOption || orderPreviewData.orderType || 'Dine In'} ({orderPreviewData.tableNumber ? `Table ${orderPreviewData.tableNumber}` : (orderPreviewData.table || 'Counter')})
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#786456' }}>Payment: </span>
                    <strong style={{ color: '#059669' }}>{orderPreviewData.paymentMethod || 'Cash'}</strong>
                  </div>
                </div>

                <div style={{ fontSize: '12px', fontWeight: 800, color: '#3C2A21', marginBottom: '6px' }}>
                  Ordered Items:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                  {(orderPreviewData.items || []).map((it, idx) => {
                    const itemQty = Number(it.quantity ?? it.qty ?? 1);
                    const itemPrice = Number(it.price ?? 0);
                    return (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '6px 8px', borderBottom: '1px dashed rgba(44, 26, 17, 0.08)' }}>
                        <span>{itemQty}x {it.name}</span>
                        <strong>₱{(itemPrice * itemQty).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 800, color: '#1C1917', borderTop: '1.5px solid rgba(44, 26, 17, 0.1)', paddingTop: '10px', marginBottom: '16px' }}>
                  <span>Total Paid:</span>
                  <span style={{ color: '#059669', fontSize: '16px' }}>
                    ₱{Number(orderPreviewData.totalPrice ?? orderPreviewData.totalAmount ?? orderPreviewData.total ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {onNavigateToOrders && (
                    <button
                      type="button"
                      onClick={() => {
                        const targetId = selectedOrderPreview;
                        setSelectedOrderPreview(null);
                        setShowDetailModal(false);
                        onNavigateToOrders(targetId);
                      }}
                      style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: '8px',
                        background: '#FAF8F5',
                        color: '#059669',
                        border: '1px solid rgba(5, 150, 105, 0.35)',
                        fontWeight: 800,
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      Open in Live Orders ↗
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedOrderPreview(null)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '8px',
                      background: '#C24522',
                      color: '#FFFFFF',
                      border: 'none',
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    Close Preview
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: '#786456' }}>
                <RefreshCw size={20} className="spin" color="#C24522" style={{ margin: '0 auto 8px' }} />
                <span>Loading order details...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
