import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShoppingBag, CreditCard, Receipt, FileSpreadsheet, ClipboardList, Plus, Minus,
  Trash2, CheckCircle2, XCircle, Clock, Search, Printer, DollarSign, Tag,
  RefreshCw, Send, Save, AlertTriangle, LogOut, Lock, Calculator, ArrowRight,
  Utensils, Coffee, Sparkles, Check, X, Banknote, Smartphone, RotateCcw,
  ShieldCheck, Zap
} from 'lucide-react';
import {
  fetchDailyReportsList,
  saveLocalDailyReports,
  appendLocalAuditLog
} from '../utils/systemStore';
import { SUPPORTED_EWALLETS, EWalletLogo } from '../utils/paymentWallets';

const DENOMINATION_VALUES = [1000, 500, 200, 100, 50, 20];

export default function CashierDashboard({
  socket,
  currentUser,
  onLogout,
  onLockSession,
  menuCatalog = [],
  drinksCatalog = []
}) {
  const [activeSection, setActiveSection] = useState('pos'); // 'pos' | 'orders' | 'payments' | 'receipts' | 'daily-report'
  const [orders, setOrders] = useState([]);
  const [webhookLogs, setWebhookLogs] = useState([]);
  const [promos, setPromos] = useState([]);
  const [myReports, setMyReports] = useState([]);
  const [toast, setToast] = useState(null);

  // POS State
  const [posCategory, setPosCategory] = useState('All');
  const [posSearch, setPosSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('Walk-In Guest');
  const [diningOption, setDiningOption] = useState('Dine-In');
  const [tableNumber, setTableNumber] = useState('Table 1');
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [selectedEWallet, setSelectedEWallet] = useState('GCash');
  const [cashTendered, setCashTendered] = useState('');
  const [digitalRefNumber, setDigitalRefNumber] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Receipt Modal State
  const [activeReceiptOrder, setActiveReceiptOrder] = useState(null);

  // Orders & History Filter State
  const [orderStatusFilter, setOrderStatusFilter] = useState('All');
  const [historySearch, setHistorySearch] = useState('');
  const [refundModalOrder, setRefundModalOrder] = useState(null);
  const [refundActionType, setRefundActionType] = useState('refund');
  const [refundReason, setRefundReason] = useState('Customer requested refund / item modification');

  // Cashier Daily Report State
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [openingFloat, setOpeningFloat] = useState(Number(currentUser?.openingFloat || 5000));
  const [denominations, setDenominations] = useState({
    '1000': 8,
    '500': 6,
    '200': 4,
    '100': 5,
    '50': 2,
    '20': 4,
    coins: 0
  });
  const [useManualCashInput, setUseManualCashInput] = useState(true);
  const [manualActualCash, setManualActualCash] = useState('');
  const [clockIn, setClockIn] = useState('08:00 AM');
  const [clockOut, setClockOut] = useState('04:30 PM');
  const [cashierRemarks, setCashierRemarks] = useState('All POS register transactions, cash drawer counts, and digital payment references verified.');
  const [varianceExplanation, setVarianceExplanation] = useState('Register balanced with POS tape.');
  const [submittingReport, setSubmittingReport] = useState(false);

  const showToastMsg = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const employeeId = currentUser?.employeeId || currentUser?.id || 'EMP-101';
  const employeeName = currentUser?.name || 'Maria Santos';
  const registerId = currentUser?.registerId || 'POS-01 (Main Counter)';

  const fetchDashboardData = useCallback(async () => {
    try {
      const [ordRes, prmRes, rptData] = await Promise.all([
        fetch('/api/orders').catch(() => null),
        fetch('/api/promos').catch(() => null),
        fetchDailyReportsList()
      ]);
      if (ordRes && ordRes.ok) {
        const ordData = await ordRes.json();
        if (Array.isArray(ordData)) setOrders(ordData);
      }
      if (prmRes && prmRes.ok) {
        const prmData = await prmRes.json();
        if (Array.isArray(prmData)) setPromos(prmData.filter(p => p.status === 'active'));
      }
      if (Array.isArray(rptData)) {
        setMyReports(rptData.filter(r => r.reportType === 'cashier' || r.employeeId === employeeId));
      }
    } catch (err) {
      console.error('[CashierDashboard] Failed to load data:', err);
    }
  }, [employeeId]);

  useEffect(() => {
    fetchDashboardData();
    const onSystemSync = () => fetchDashboardData();
    window.addEventListener('umami-system-sync', onSystemSync);
    return () => window.removeEventListener('umami-system-sync', onSystemSync);
  }, [fetchDashboardData]);

  useEffect(() => {
    fetch('/api/webhooks/logs')
      .then(res => res.json())
      .then(data => {
        if (data?.logs) setWebhookLogs(data.logs);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onNewOrder = (newOrd) => {
      setOrders(prev => [newOrd, ...prev.filter(o => (o.orderId || o.id) !== (newOrd.orderId || newOrd.id))]);
    };
    const onOrderStatus = (payload) => {
      const updated = payload?.order || payload;
      if (!updated) return;
      const targetId = updated.orderId || updated.id;
      setOrders(prev => prev.map(o => ((o.orderId || o.id) === targetId ? { ...o, ...updated } : o)));
    };
    const onReportsUpdated = (allReports) => {
      if (Array.isArray(allReports)) {
        setMyReports(allReports.filter(r => r.reportType === 'cashier' || r.employeeId === employeeId));
      }
    };
    const onWebhookEvent = (data) => {
      if (data?.log) {
        setWebhookLogs(prev => [data.log, ...prev]);
      }
    };
    socket.on('new-order', onNewOrder);
    socket.on('order-status-updated', onOrderStatus);
    socket.on('daily-reports-updated', onReportsUpdated);
    socket.on('payment-webhook-received', onWebhookEvent);
    return () => {
      socket.off('new-order', onNewOrder);
      socket.off('order-status-updated', onOrderStatus);
      socket.off('daily-reports-updated', onReportsUpdated);
      socket.off('payment-webhook-received', onWebhookEvent);
    };
  }, [socket, employeeId]);

  // Unified POS Catalog (Food + Drinks)
  const combinedCatalog = useMemo(() => {
    const foods = (menuCatalog || []).filter(i => i.available !== false).map(item => ({
      id: `food-${item.id}`,
      rawId: item.id,
      name: item.name,
      category: item.category || 'Main Dishes',
      price: Number(item.price || 320),
      image: item.image,
      emoji: item.emoji || '🍜',
      allergens: item.allergens || []
    }));
    const drinks = (drinksCatalog || []).filter(d => d.available !== false).map(drk => {
      const defSize = Array.isArray(drk.sizes) && drk.sizes.length > 0 ? drk.sizes[0] : { name: 'Regular', price: 140 };
      return {
        id: `drink-${drk.id}`,
        rawId: drk.id,
        name: `${drk.name} (${defSize.name})`,
        category: 'Beverages',
        price: Number(defSize.price || 140),
        image: drk.image,
        emoji: '🧋',
        allergens: []
      };
    });
    return [...foods, ...drinks];
  }, [menuCatalog, drinksCatalog]);

  const categories = useMemo(() => {
    const set = new Set(['All']);
    combinedCatalog.forEach(item => set.add(item.category));
    return Array.from(set);
  }, [combinedCatalog]);

  const filteredCatalog = useMemo(() => {
    return combinedCatalog.filter(item => {
      if (posCategory !== 'All' && item.category !== posCategory) return false;
      if (posSearch.trim()) {
        const q = posSearch.toLowerCase();
        if (!item.name.toLowerCase().includes(q) && !item.category.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [combinedCatalog, posCategory, posSearch]);

  // Cart Calculations
  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) {
        return prev.map(c => (c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateCartQty = (id, delta) => {
    setCart(prev =>
      prev
        .map(c => (c.id === id ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c))
        .filter(c => c.quantity > 0)
    );
  };

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    if (!appliedPromo || subtotal <= 0) return 0;
    if (appliedPromo.discountType === 'percent') {
      return Number(((subtotal * Number(appliedPromo.discountValue || 10)) / 100).toFixed(2));
    }
    return Math.min(subtotal, Number(appliedPromo.discountValue || 50));
  }, [appliedPromo, subtotal]);

  const taxableBase = Math.max(0, subtotal - discountAmount);
  const taxAmount = Number((taxableBase * 0.12).toFixed(2));
  const finalTotal = Number((taxableBase + taxAmount).toFixed(2));

  const numericCashTendered = Number(cashTendered) || 0;
  const changeAmount = paymentMethod === 'Cash' ? Math.max(0, Number((numericCashTendered - finalTotal).toFixed(2))) : 0;

  const handleApplyPromoCode = async () => {
    const clean = promoCodeInput.trim().toUpperCase();
    if (!clean) return;
    try {
      const res = await fetch(`/api/promos/validate/${encodeURIComponent(clean)}`);
      const data = await res.json();
      if (!res.ok || !data.valid) {
        showToastMsg(data.error || 'Invalid or expired promo code.', 'error');
        return;
      }
      setAppliedPromo(data.promo);
      showToastMsg(`Promo "${data.promo.code}" applied (${data.promo.discountLabel})!`);
    } catch (err) {
      showToastMsg('Could not validate promo code.', 'error');
    }
  };

  const handleCreatePosOrder = async () => {
    if (cart.length === 0) {
      showToastMsg('Please select at least one item to create a POS order.', 'error');
      return;
    }
    if (paymentMethod === 'Cash' && numericCashTendered < finalTotal) {
      showToastMsg(`Cash received (₱${numericCashTendered.toFixed(2)}) is less than the order total (₱${finalTotal.toFixed(2)}).`, 'error');
      return;
    }
    if (paymentMethod === 'E-Wallet' && !digitalRefNumber.trim()) {
      showToastMsg(`Please enter the customer's ${selectedEWallet} reference number.`, 'error');
      return;
    }

    const effectivePayment = paymentMethod === 'E-Wallet' ? selectedEWallet : paymentMethod;

    setSubmittingOrder(true);
    try {
      const orderId = `POS-${Math.floor(1000 + Math.random() * 9000)}`;
      const payload = {
        orderId,
        customer: customerName.trim() || 'Walk-In Guest',
        orderType: diningOption,
        diningOption,
        tableNumber: diningOption === 'Dine-In' ? tableNumber : 'Takeout Counter',
        location: diningOption === 'Dine-In' ? tableNumber : 'Takeout Counter',
        kioskId: registerId,
        items: cart.map(c => ({
          id: c.rawId,
          name: c.name,
          quantity: c.quantity,
          qty: c.quantity,
          price: c.price,
          image: c.image,
          emoji: c.emoji
        })),
        itemCount: cart.reduce((s, i) => s + i.quantity, 0),
        subtotal,
        taxAmount,
        discountAmount,
        promoCode: appliedPromo?.code || null,
        total: finalTotal,
        totalPrice: finalTotal,
        payment: effectivePayment,
        paymentMethod: effectivePayment,
        paymentCategory: paymentMethod,
        selectedEWallet: paymentMethod === 'E-Wallet' ? selectedEWallet : null,
        paymentStatus: 'Approved',
        isPaymentVerified: true,
        cashReceived: paymentMethod === 'Cash' ? numericCashTendered : finalTotal,
        changeGiven: paymentMethod === 'Cash' ? changeAmount : 0,
        referenceNumber: paymentMethod !== 'Cash' ? (digitalRefNumber.trim() || `REF-${Date.now().toString().slice(-6)}`) : null,
        cashierId: employeeId,
        cashierName: employeeName,
        status: 'New',
        placedBy: `${employeeName} (Cashier POS)`,
        note: orderNote.trim(),
        device: 'Cashier POS Terminal'
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const created = await res.json();
      if (!res.ok) {
        showToastMsg(created.error || 'Failed to submit POS order.', 'error');
        return;
      }

      if (appliedPromo?.code) {
        fetch('/api/promos/redeem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ promoCode: appliedPromo.code, orderId, discountAmount })
        }).catch(() => {});
      }

      fetch('/api/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorId: employeeId,
          actorName: employeeName,
          actorRole: currentUser?.role || 'Cashier',
          accountType: 'cashier',
          category: 'POS & Payments',
          action: 'POS Order Created & Paid',
          target: `Order #${orderId} (${diningOption} • ${payload.tableNumber})`,
          details: `Processed ${effectivePayment} payment of ₱${finalTotal.toFixed(2)}${paymentMethod === 'Cash' ? ` (Tendered: ₱${numericCashTendered.toFixed(2)}, Change: ₱${changeAmount.toFixed(2)})` : ` (Ref: ${digitalRefNumber.trim() || 'N/A'})`}.`
        })
      }).catch(() => {});

      setOrders(prev => [created, ...prev.filter(o => (o.orderId || o.id) !== (created.orderId || created.id))]);
      setActiveReceiptOrder(created);
      setCart([]);
      setCashTendered('');
      setDigitalRefNumber('');
      setAppliedPromo(null);
      setPromoCodeInput('');
      setOrderNote('');
      showToastMsg(`Order #${orderId} processed & sent to kitchen!`);
    } catch (err) {
      showToastMsg('Network error creating POS order.', 'error');
    } finally {
      setSubmittingOrder(false);
    }
  };

  const handleUpdateOrderStatus = async (order, nextStatus) => {
    const id = order.orderId || order.id;
    try {
      const res = await fetch(`/api/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus,
          updatedBy: `${employeeName} (Cashier POS)`
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setOrders(prev => prev.map(o => ((o.orderId || o.id) === id ? updated : o)));
        showToastMsg(`Order #${id} updated to "${nextStatus}".`);
      }
    } catch (err) {
      showToastMsg('Failed to update order status.', 'error');
    }
  };

  const handleVerifyPayment = async (order, decision) => {
    const id = order.orderId || order.id;
    try {
      const res = await fetch(`/api/admin/orders/${id}/verify-payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          adminName: `${employeeName} (Cashier)`,
          adminEmail: currentUser?.email || 'cashier.maria@umamicraft.com',
          reason: decision === 'reject' ? 'Payment reference could not be verified by Cashier.' : undefined
        })
      });
      const data = await res.json();
      if (res.ok && data.order) {
        setOrders(prev => prev.map(o => ((o.orderId || o.id) === id ? data.order : o)));
        showToastMsg(`Order #${id} payment ${decision === 'approve' ? 'verified & approved' : 'rejected'}.`);
      }
    } catch (err) {
      showToastMsg('Failed to process payment verification.', 'error');
    }
  };

  const handleConfirmRefundOrVoid = async (e) => {
    e.preventDefault();
    if (!refundModalOrder) return;
    const id = refundModalOrder.orderId || refundModalOrder.id;
    try {
      const res = await fetch(`/api/orders/${id}/refund-or-void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: refundActionType,
          reason: refundReason,
          actorName: employeeName,
          actorId: employeeId
        })
      });
      const data = await res.json();
      if (res.ok && data.order) {
        setOrders(prev => prev.map(o => ((o.orderId || o.id) === id ? data.order : o)));
        showToastMsg(`Order #${id} marked as ${refundActionType === 'void' ? 'Voided' : 'Refunded'}.`);
        setRefundModalOrder(null);
      }
    } catch (err) {
      showToastMsg('Failed to process refund/void.', 'error');
    }
  };

  // Live Cashier Daily Report Calculations from Actual Database Orders
  const liveShiftStats = useMemo(() => {
    const dateOrders = orders.filter(o => (o.createdAt || '').slice(0, 10) === reportDate);
    const activePool = dateOrders.length > 0 ? dateOrders : orders;

    let cashSales = 0;
    let digitalSales = 0;
    let gcashSales = 0;
    let cardSales = 0;
    let cashReceived = 0;
    let changeGiven = 0;
    let discountsApplied = 0;
    let refundsCount = 0;
    let refundsAmount = 0;
    let voidsCount = 0;
    let cancelledCount = 0;
    let completedCount = 0;
    const handledOrderIds = [];

    activePool.forEach(o => {
      const amt = Number(o.totalPrice || o.total || 0);
      const disc = Number(o.discountAmount || 0);
      const pMethod = String(o.paymentMethod || o.payment || 'Cash').toLowerCase();
      const s = String(o.status || '').toLowerCase();
      const ps = String(o.paymentStatus || '').toLowerCase();

      handledOrderIds.push(o.orderId || o.id);
      discountsApplied += disc;

      if (s === 'cancelled') cancelledCount++;
      else completedCount++;

      if (ps === 'refunded' || o.isRefunded) {
        refundsCount++;
        refundsAmount += amt;
        return;
      }
      if (ps === 'voided' || o.isVoided) {
        voidsCount++;
        return;
      }
      if (s === 'cancelled' || ps === 'rejected') {
        return;
      }

      if (pMethod.includes('cash') && !pMethod.includes('gcash')) {
        cashSales += amt;
        const tendered = Number(o.cashReceived || amt);
        cashReceived += tendered;
        changeGiven += Math.max(0, tendered - amt);
      } else {
        digitalSales += amt;
        if (
          pMethod.includes('gcash') ||
          pMethod.includes('maya') ||
          pMethod.includes('paypal') ||
          pMethod.includes('maribank') ||
          pMethod.includes('grab') ||
          pMethod.includes('shopee') ||
          pMethod.includes('gotyme') ||
          pMethod.includes('wallet')
        ) {
          gcashSales += amt;
        } else {
          cardSales += amt;
        }
      }
    });

    const totalSales = Number((cashSales + digitalSales).toFixed(2));
    const expectedCash = Number((Number(openingFloat || 0) + cashSales - refundsAmount).toFixed(2));

    const denomTotal = DENOMINATION_VALUES.reduce(
      (sum, val) => sum + val * Number(denominations[String(val)] || 0),
      Number(denominations.coins || 0)
    );

    const effectiveActualCash = useManualCashInput
      ? (manualActualCash !== '' ? Number(manualActualCash) : expectedCash)
      : denomTotal;

    const variance = Number((effectiveActualCash - expectedCash).toFixed(2));
    const varianceStatus = variance === 0 ? 'Balanced' : variance > 0 ? 'Overage' : 'Shortage';

    return {
      transactionsCount: activePool.length,
      completedCount,
      cancelledCount,
      cashSales: Number(cashSales.toFixed(2)),
      digitalSales: Number(digitalSales.toFixed(2)),
      gcashSales: Number(gcashSales.toFixed(2)),
      cardSales: Number(cardSales.toFixed(2)),
      totalSales,
      cashReceived: Number(cashReceived.toFixed(2)),
      changeGiven: Number(changeGiven.toFixed(2)),
      discountsApplied: Number(discountsApplied.toFixed(2)),
      refundsCount,
      refundsAmount: Number(refundsAmount.toFixed(2)),
      voidsCount,
      expectedCash,
      actualCashCount: Number(effectiveActualCash.toFixed(2)),
      variance,
      varianceStatus,
      handledOrderIds
    };
  }, [orders, reportDate, openingFloat, denominations, useManualCashInput, manualActualCash]);

  const handleSubmitCashierReport = async (targetStatus = 'Pending Review') => {
    setSubmittingReport(true);
    try {
      const payload = {
        reportDate,
        employeeId,
        employeeName,
        role: currentUser?.role || 'Cashier',
        position: currentUser?.position || 'POS Cashier & Register Operator',
        shift: currentUser?.shift || 'Morning Shift (08:00 AM - 04:30 PM)',
        attendance: {
          status: 'Present',
          clockIn,
          clockOut,
          totalHours: 8.5,
          breakMinutes: 45,
          isLate: false
        },
        reportType: 'cashier',
        reportStatus: targetStatus,
        employeeNotes: cashierRemarks,
        cashierData: {
          registerId,
          openingFloat: Number(openingFloat || 0),
          cashSales: liveShiftStats.cashSales,
          digitalSales: liveShiftStats.digitalSales,
          gcashSales: liveShiftStats.gcashSales,
          cardSales: liveShiftStats.cardSales,
          totalSales: liveShiftStats.totalSales,
          transactionsCount: liveShiftStats.transactionsCount,
          completedOrdersCount: liveShiftStats.completedCount,
          cancelledOrdersCount: liveShiftStats.cancelledCount,
          discountsApplied: liveShiftStats.discountsApplied,
          cashReceived: liveShiftStats.cashReceived,
          changeGiven: liveShiftStats.changeGiven,
          refundsCount: liveShiftStats.refundsCount,
          refundsAmount: liveShiftStats.refundsAmount,
          voidsCount: liveShiftStats.voidsCount,
          expectedCash: liveShiftStats.expectedCash,
          actualCashCount: liveShiftStats.actualCashCount,
          variance: liveShiftStats.variance,
          varianceStatus: liveShiftStats.varianceStatus,
          varianceReason: varianceExplanation,
          denominations,
          handledOrderIds: liveShiftStats.handledOrderIds
        }
      };

      const existingReports = await fetchDailyReportsList();
      const existingIdx = existingReports.findIndex(
        r => r.employeeId === employeeId && r.reportDate === reportDate
      );
      let savedReport = {
        id: `RPT-CSH-${Date.now().toString().slice(-5)}`,
        submittedAt: new Date().toISOString(),
        ...payload
      };
      let nextReports;
      if (existingIdx !== -1) {
        savedReport = { ...existingReports[existingIdx], ...payload, id: existingReports[existingIdx].id };
        nextReports = [...existingReports];
        nextReports[existingIdx] = savedReport;
      } else {
        nextReports = [savedReport, ...existingReports];
      }
      saveLocalDailyReports(nextReports);
      setMyReports(nextReports.filter(r => r.reportType === 'cashier' || r.employeeId === employeeId));

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

      appendLocalAuditLog({
        actorId: employeeId,
        actorName: employeeName,
        actorRole: currentUser?.role || 'Cashier',
        accountType: 'cashier',
        category: 'Daily Reports',
        action: targetStatus === 'Draft' ? 'Cashier Daily Report Draft Saved' : 'Cashier Daily Report Submitted',
        target: `${savedReport.id} (${reportDate})`,
        details: `${employeeName} submitted Cashier Daily Report (Total Sales: ₱${liveShiftStats.totalSales.toFixed(2)}, Variance: ₱${liveShiftStats.variance.toFixed(2)}).`,
        status: 'Success'
      });

      showToastMsg(
        targetStatus === 'Draft'
          ? `Cashier Daily Report saved as Draft (${savedReport.id}).`
          : `Cashier Daily Report (${savedReport.id}) submitted to Administrator for review!`
      );
    } catch (err) {
      showToastMsg('Network error submitting Cashier Daily Report.', 'error');
    } finally {
      setSubmittingReport(false);
    }
  };

  const handlePrintReceipt = (order) => {
    const win = window.open('', '_blank', 'width=420,height=680');
    if (!win) {
      showToastMsg('Please allow pop-ups to print thermal receipts.', 'error');
      return;
    }
    const itemsHtml = (order.items || [])
      .map(
        i => `
        <tr>
          <td style="padding:4px 0;">${i.quantity || i.qty || 1}x ${i.name}</td>
          <td style="padding:4px 0;text-align:right;">₱${(Number(i.price || 0) * Number(i.quantity || i.qty || 1)).toFixed(2)}</td>
        </tr>`
      )
      .join('');

    win.document.write(`
      <html>
        <head>
          <title>Official Receipt #${order.orderId || order.id}</title>
          <style>
            body { font-family: 'Courier New', monospace; padding: 20px; color: #111; max-width: 340px; margin: 0 auto; }
            h2, h4, p { margin: 4px 0; text-align: center; }
            .divider { border-top: 1px dashed #333; margin: 10px 0; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
            .row { display: flex; justify-content: space-between; font-size: 13px; margin: 4px 0; }
            .total { font-weight: bold; font-size: 16px; }
          </style>
        </head>
        <body>
          <h2>UMAMI CRAFT FUSION</h2>
          <p>Asian Craft Dining & Enterprise POS</p>
          <p>Register: ${registerId}</p>
          <div class="divider"></div>
          <div class="row"><span>Order ID:</span><strong>#${order.orderId || order.id}</strong></div>
          <div class="row"><span>Date:</span><span>${new Date(order.createdAt || Date.now()).toLocaleString()}</span></div>
          <div class="row"><span>Customer:</span><span>${order.customer || 'Guest'}</span></div>
          <div class="row"><span>Dining:</span><span>${order.diningOption || 'Dine-In'} (${order.tableNumber || 'Counter'})</span></div>
          <div class="row"><span>Cashier:</span><span>${order.cashierName || employeeName}</span></div>
          <div class="divider"></div>
          <table>${itemsHtml}</table>
          <div class="divider"></div>
          ${order.discountAmount ? `<div class="row"><span>Discount (${order.promoCode || 'Promo'}):</span><span>-₱${Number(order.discountAmount).toFixed(2)}</span></div>` : ''}
          <div class="row total"><span>TOTAL PAID:</span><span>₱${Number(order.totalPrice || order.total || 0).toFixed(2)}</span></div>
          <div class="row"><span>Payment Method:</span><span>${order.payment || 'Cash'}</span></div>
          ${order.cashReceived ? `<div class="row"><span>Cash Tendered:</span><span>₱${Number(order.cashReceived).toFixed(2)}</span></div>` : ''}
          ${order.changeGiven ? `<div class="row"><span>Change Given:</span><span>₱${Number(order.changeGiven).toFixed(2)}</span></div>` : ''}
          <div class="divider"></div>
          <p>Thank you for dining at Umami Craft Fusion!</p>
          <script>window.onload = () => { window.print(); }</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const pendingVerificationOrders = useMemo(() => {
    return orders.filter(o => {
      const ps = String(o.paymentStatus || '').toLowerCase();
      const s = String(o.status || '').toLowerCase();
      return ps.includes('pending') || s.includes('pending payment');
    });
  }, [orders]);

  return (
    <div style={{ minHeight: '100vh', background: '#FAF8F5', color: '#1C1917', display: 'flex', flexDirection: 'column' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '24px', zIndex: 9999,
          background: toast.type === 'error' ? '#991B1B' : '#065F46',
          color: '#FFFFFF', padding: '0.85rem 1.25rem', borderRadius: '12px',
          boxShadow: '0 12px 30px rgba(0,0,0,0.18)', display: 'flex', alignItems: 'center', gap: '10px',
          fontWeight: 700, fontSize: '0.88rem'
        }}>
          {toast.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Cashier Header Bar */}
      <header style={{
        background: '#FFFFFF', borderBottom: '1px solid #E7E5E4', padding: '0.9rem 1.75rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem',
        position: 'sticky', top: 0, zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: '#FFFFFF',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900,
            boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)'
          }}>
            <CreditCard size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 900, fontSize: '1.05rem', color: '#1C1917', letterSpacing: '-0.02em' }}>
                UMAMI CRAFT FUSION • CASHIER POS TERMINAL
              </span>
              <span style={{
                padding: '2px 9px', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 800,
                background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0'
              }}>
                CASHIER ACCOUNT
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#78716C', fontWeight: 600 }}>
              Operator: <strong>{employeeName}</strong> ({employeeId}) • {registerId} • Opening Float: ₱{Number(openingFloat).toLocaleString()}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            padding: '0.45rem 0.9rem', borderRadius: '999px', background: '#ECFDF5',
            border: '1px solid #A7F3D0', color: '#047857', fontSize: '0.78rem', fontWeight: 800,
            display: 'flex', alignItems: 'center', gap: '6px'
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
            POS Live Sync • ₱{liveShiftStats.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })} Shift Sales
          </div>

          {onLockSession && (
            <button
              onClick={onLockSession}
              style={{
                padding: '0.5rem 0.95rem', borderRadius: '10px', border: '1px solid #FED7AA',
                background: '#FFF7ED', color: '#C24522', fontWeight: 700, fontSize: '0.8rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <Lock size={14} /> Lock Register
            </button>
          )}
          <button
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

      {/* Main Layout: Dedicated Cashier Sidebar + Active Workspace */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Dedicated Cashier Sidebar */}
        <aside style={{
          width: '260px', background: '#FFFFFF', borderRight: '1px solid #E7E5E4',
          padding: '1.25rem 0.85rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flexShrink: 0
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ padding: '0 0.75rem 0.5rem', fontSize: '0.7rem', fontWeight: 800, color: '#A8A29E', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Cashier POS Operations
            </div>
            {[
              { id: 'pos', label: 'POS Terminal (New Order)', icon: <ShoppingBag size={18} />, badge: cart.length > 0 ? cart.reduce((s, i) => s + i.quantity, 0) : null },
              { id: 'orders', label: 'Active Orders & Queue', icon: <ClipboardList size={18} />, badge: orders.filter(o => o.status !== 'Completed' && o.status !== 'Cancelled').length || null },
              { id: 'payments', label: 'Automated Webhooks & Refunds', icon: <CreditCard size={18} />, badge: 'Auto' },
              { id: 'receipts', label: 'Receipts & Shift History', icon: <Receipt size={18} />, badge: null },
              { id: 'daily-report', label: 'Cashier Daily Report', icon: <FileSpreadsheet size={18} />, badge: 'Z-Read' }
            ].map(item => {
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  style={{
                    width: '100%', padding: '0.75rem 0.9rem', borderRadius: '12px', border: 'none',
                    background: active ? 'linear-gradient(135deg, #C24522 0%, #9A3412 100%)' : 'transparent',
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
                  {item.badge && (
                    <span style={{
                      padding: '2px 7px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 800,
                      background: active ? 'rgba(255,255,255,0.22)' : '#FFF7ED',
                      color: active ? '#FFFFFF' : '#C24522'
                    }}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Shift Drawer Quick Card */}
          <div style={{
            background: '#FAF8F5', borderRadius: '14px', padding: '1rem',
            border: '1px solid #E7E5E4', marginTop: '1.5rem'
          }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#78716C', textTransform: 'uppercase' }}>
              Live Register Drawer
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#047857', marginTop: '4px' }}>
              ₱{liveShiftStats.expectedCash.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#57534E', marginTop: '2px' }}>
              Expected Cash (Float + Cash Sales)
            </div>
            <div style={{ borderTop: '1px solid #E7E5E4', marginTop: '8px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
              <span>Cash Sales:</span>
              <strong>₱{liveShiftStats.cashSales.toLocaleString()}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '3px' }}>
              <span>Digital (GCash/Card):</span>
              <strong>₱{liveShiftStats.digitalSales.toLocaleString()}</strong>
            </div>
          </div>
        </aside>

        {/* Main Workspace Content */}
        <main style={{ flex: 1, padding: '1.5rem 2rem', overflowY: 'auto' }}>
          {/* SECTION 1: POS TERMINAL (NEW ORDERS) */}
          {activeSection === 'pos' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 390px', gap: '1.5rem', alignItems: 'start' }}>
              {/* Left: Menu Catalog Grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{
                  background: '#FFFFFF', borderRadius: '16px', padding: '1rem 1.25rem',
                  border: '1px solid #E7E5E4', display: 'flex', flexWrap: 'wrap',
                  justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem'
                }}>
                  <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setPosCategory(cat)}
                        style={{
                          padding: '0.48rem 0.95rem', borderRadius: '999px',
                          border: posCategory === cat ? '1px solid #C24522' : '1px solid #E7E5E4',
                          background: posCategory === cat ? '#C24522' : '#FAF8F5',
                          color: posCategory === cat ? '#FFFFFF' : '#44403C',
                          fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer'
                        }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  <div style={{ position: 'relative', minWidth: '220px' }}>
                    <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#A8A29E' }} />
                    <input
                      type="text"
                      value={posSearch}
                      onChange={(e) => setPosSearch(e.target.value)}
                      placeholder="Search menu item or drink..."
                      style={{
                        width: '100%', padding: '0.5rem 0.75rem 0.5rem 2rem',
                        borderRadius: '10px', border: '1px solid #D6D3D1', fontSize: '0.82rem', background: '#FAF8F5'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.9rem' }}>
                  {filteredCatalog.map(item => {
                    const inCart = cart.find(c => c.id === item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => addToCart(item)}
                        style={{
                          background: '#FFFFFF', borderRadius: '14px', overflow: 'hidden',
                          border: inCart ? '2px solid #C24522' : '1px solid #E7E5E4',
                          cursor: 'pointer', transition: 'all 0.15s',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                        }}
                      >
                        <div>
                          <div style={{ height: '115px', background: '#F5F5F4', position: 'relative', overflow: 'hidden' }}>
                            {item.image ? (
                              <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem' }}>
                                {item.emoji}
                              </div>
                            )}
                            <span style={{
                              position: 'absolute', top: '8px', right: '8px',
                              background: 'rgba(28, 25, 23, 0.82)', color: '#FFFFFF',
                              padding: '3px 8px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 800
                            }}>
                              ₱{item.price.toFixed(2)}
                            </span>
                            {inCart && (
                              <span style={{
                                position: 'absolute', top: '8px', left: '8px',
                                background: '#C24522', color: '#FFFFFF',
                                padding: '3px 8px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 800
                              }}>
                                {inCart.quantity}x in Order
                              </span>
                            )}
                          </div>
                          <div style={{ padding: '0.75rem 0.85rem' }}>
                            <div style={{ fontSize: '0.7rem', color: '#78716C', fontWeight: 700, textTransform: 'uppercase' }}>{item.category}</div>
                            <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1C1917', marginTop: '2px' }}>{item.name}</div>
                          </div>
                        </div>
                        <div style={{ padding: '0 0.85rem 0.75rem' }}>
                          <button
                            type="button"
                            style={{
                              width: '100%', padding: '0.42rem', borderRadius: '8px', border: '1px solid #FED7AA',
                              background: '#FFF7ED', color: '#C24522', fontWeight: 800, fontSize: '0.76rem', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                            }}
                          >
                            <Plus size={14} /> Add to Register
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right: POS Register Ticket & Payment Checkout */}
              <div style={{
                background: '#FFFFFF', borderRadius: '18px', border: '1px solid #E7E5E4',
                boxShadow: '0 8px 24px rgba(0,0,0,0.06)', padding: '1.25rem', position: 'sticky', top: '84px',
                display: 'flex', flexDirection: 'column', gap: '1rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E7E5E4', paddingBottom: '0.75rem' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#1C1917' }}>Current POS Ticket</h3>
                    <span style={{ fontSize: '0.75rem', color: '#78716C' }}>{registerId}</span>
                  </div>
                  {cart.length > 0 && (
                    <button
                      onClick={() => setCart([])}
                      style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', padding: '4px 9px', borderRadius: '8px', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Clear Ticket
                    </button>
                  )}
                </div>

                {/* Guest & Table Selection */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#57534E' }}>Customer Name</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '0.82rem', marginTop: '2px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#57534E' }}>Dining Option</label>
                    <select
                      value={diningOption}
                      onChange={(e) => setDiningOption(e.target.value)}
                      style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '0.82rem', marginTop: '2px' }}
                    >
                      <option value="Dine-In">Dine-In</option>
                      <option value="Take-Out">Take-Out</option>
                    </select>
                  </div>
                </div>

                {diningOption === 'Dine-In' && (
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#57534E' }}>Assign Table</label>
                    <select
                      value={tableNumber}
                      onChange={(e) => setTableNumber(e.target.value)}
                      style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '0.82rem', marginTop: '2px' }}
                    >
                      {Array.from({ length: 15 }, (_, idx) => `Table ${idx + 1}`).map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Cart Items List */}
                <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '2px' }}>
                  {cart.length === 0 ? (
                    <div style={{ padding: '1.75rem 1rem', textAlign: 'center', color: '#A8A29E', background: '#FAF8F5', borderRadius: '12px', fontSize: '0.82rem' }}>
                      Click any dish or beverage on the left to add to the customer order.
                    </div>
                  ) : (
                    cart.map(item => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.55rem 0.7rem', background: '#FAF8F5', borderRadius: '10px', border: '1px solid #E7E5E4' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1C1917' }}>{item.name}</div>
                          <div style={{ fontSize: '0.74rem', color: '#78716C' }}>₱{item.price.toFixed(2)} each</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button onClick={() => updateCartQty(item.id, -1)} style={{ width: '24px', height: '24px', borderRadius: '6px', border: '1px solid #D6D3D1', background: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Minus size={12} />
                          </button>
                          <span style={{ fontWeight: 800, fontSize: '0.84rem', minWidth: '18px', textAlign: 'center' }}>{item.quantity}</span>
                          <button onClick={() => updateCartQty(item.id, 1)} style={{ width: '24px', height: '24px', borderRadius: '6px', border: '1px solid #D6D3D1', background: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Plus size={12} />
                          </button>
                          <span style={{ fontWeight: 800, fontSize: '0.82rem', minWidth: '64px', textAlign: 'right', color: '#1C1917' }}>
                            ₱{(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Promo Discount Input */}
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#57534E' }}>Promo / Discount Code</label>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '3px' }}>
                    <input
                      type="text"
                      value={promoCodeInput}
                      onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                      placeholder="Enter promo code..."
                      style={{ flex: 1, padding: '0.45rem 0.65rem', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '0.8rem' }}
                    />
                    <button
                      type="button"
                      onClick={handleApplyPromoCode}
                      style={{ padding: '0.45rem 0.85rem', borderRadius: '8px', border: '1px solid #C24522', background: '#FFF7ED', color: '#C24522', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer' }}
                    >
                      Apply
                    </button>
                  </div>
                  {promos.length > 0 && !appliedPromo && (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '5px' }}>
                      {promos.slice(0, 3).map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setPromoCodeInput(p.code);
                            setAppliedPromo(p);
                          }}
                          style={{ padding: '2px 7px', borderRadius: '6px', border: '1px dashed #F59E0B', background: '#FFFBEB', color: '#B45309', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                          <Tag size={10} style={{ marginRight: '3px' }} /> {p.code} ({p.discountLabel})
                        </button>
                      ))}
                    </div>
                  )}
                  {appliedPromo && (
                    <div style={{ marginTop: '5px', padding: '5px 8px', borderRadius: '8px', background: '#ECFDF5', border: '1px solid #A7F3D0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#047857', fontWeight: 700 }}>
                      <span>Applied: {appliedPromo.code} (-₱{discountAmount.toFixed(2)})</span>
                      <button onClick={() => setAppliedPromo(null)} style={{ background: 'none', border: 'none', color: '#047857', cursor: 'pointer', fontWeight: 800 }}>×</button>
                    </div>
                  )}
                </div>

                {/* Subtotal, Tax & Total Summary */}
                <div style={{ background: '#FAF8F5', padding: '0.85rem', borderRadius: '12px', border: '1px solid #E7E5E4', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#57534E' }}>
                    <span>Subtotal:</span>
                    <span>₱{subtotal.toFixed(2)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669', fontWeight: 700 }}>
                      <span>Promo Discount:</span>
                      <span>-₱{discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#57534E' }}>
                    <span>12% VAT:</span>
                    <span>₱{taxAmount.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '1.1rem', color: '#1C1917', borderTop: '1px solid #E7E5E4', paddingTop: '6px', marginTop: '4px' }}>
                    <span>FINAL TOTAL:</span>
                    <span style={{ color: '#C24522' }}>₱{finalTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Payment Method & Cash Change Calculator */}
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#44403C', textTransform: 'uppercase' }}>Select Payment Method</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginTop: '5px' }}>
                    {['Cash', 'E-Wallet', 'Card'].map(m => (
                      <button
                        type="button"
                        key={m}
                        onClick={() => setPaymentMethod(m)}
                        style={{
                          padding: '0.5rem', borderRadius: '10px', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem',
                          border: paymentMethod === m ? '2px solid #059669' : '1px solid #D6D3D1',
                          background: paymentMethod === m ? '#ECFDF5' : '#FFFFFF',
                          color: paymentMethod === m ? '#047857' : '#44403C'
                        }}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* E-Wallet Sub-Selection Area (Visible only when E-Wallet is selected) */}
                {paymentMethod === 'E-Wallet' && (
                  <div style={{
                    background: '#F0FDF4',
                    border: '1.5px solid #86EFAC',
                    borderRadius: '12px',
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                        Select E-Wallet / Online Banking
                      </span>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#047857', background: '#DCFCE7', border: '1px solid #86EFAC', padding: '1px 6px', borderRadius: '6px' }}>
                        {selectedEWallet} Active
                      </span>
                    </div>

                    {/* E-Wallet Multiple Online Payment Methods Grid */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(98px, 1fr))',
                      gap: '6px'
                    }}>
                      {SUPPORTED_EWALLETS.map(w => {
                        const isSelected = selectedEWallet === w.id;
                        return (
                          <button
                            key={w.id}
                            type="button"
                            onClick={() => setSelectedEWallet(w.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 8px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              border: isSelected ? '2px solid #059669' : '1px solid #E2E8F0',
                              background: isSelected ? '#ECFDF5' : '#FFFFFF',
                              color: isSelected ? '#047857' : '#44403C',
                              fontWeight: isSelected ? 800 : 600,
                              fontSize: '0.74rem',
                              transition: 'all 0.15s ease',
                              textAlign: 'left'
                            }}
                          >
                            <EWalletLogo id={w.id} size={18} />
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.name}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Selected Wallet Account Information */}
                    {(() => {
                      const activeWallet = SUPPORTED_EWALLETS.find(w => w.id === selectedEWallet) || SUPPORTED_EWALLETS[0];
                      return (
                        <div style={{
                          background: '#FFFFFF',
                          borderRadius: '8px',
                          padding: '8px 10px',
                          border: '1px solid #BBF7D0',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '3px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <EWalletLogo id={activeWallet.id} size={16} />
                              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#166534' }}>{activeWallet.name} Account</span>
                            </div>
                            <span style={{ fontSize: '0.66rem', fontWeight: 700, color: '#047857', background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '1px 6px', borderRadius: '4px' }}>
                              {activeWallet.badge}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#4B5563', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                            <span>Merchant: <strong style={{ color: '#1F2937' }}>{activeWallet.accountName}</strong></span>
                            <span>No: <strong style={{ color: '#047857', fontFamily: 'monospace' }}>{activeWallet.accountNumber}</strong></span>
                          </div>
                          <div style={{ fontSize: '0.67rem', color: '#65A30D', fontStyle: 'italic', marginTop: '1px' }}>
                            {activeWallet.description}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Reference Number Input */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#166534' }}>
                          {selectedEWallet} Reference Number
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const genRef = `${selectedEWallet.toUpperCase().slice(0, 3)}-${Math.floor(10000000 + Math.random() * 90000000)}`;
                            setDigitalRefNumber(genRef);
                            showToastMsg(`Sample ${selectedEWallet} reference generated.`);
                          }}
                          style={{
                            border: 'none', background: 'transparent', color: '#047857',
                            fontSize: '0.66rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline'
                          }}
                        >
                          Auto-Fill Sample Ref
                        </button>
                      </div>
                      <input
                        type="text"
                        value={digitalRefNumber}
                        onChange={(e) => setDigitalRefNumber(e.target.value)}
                        placeholder={`Enter ${selectedEWallet} approval / transaction reference #`}
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.7rem',
                          borderRadius: '8px',
                          border: '1px solid #86EFAC',
                          fontSize: '0.82rem',
                          marginTop: '3px',
                          background: '#FFFFFF',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Cash Payment Details (Hidden when E-Wallet or Card is selected) */}
                {paymentMethod === 'Cash' && (
                  <div style={{ background: '#ECFDF5', padding: '0.75rem', borderRadius: '12px', border: '1px solid #A7F3D0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#065F46' }}>Cash Received (₱)</label>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {[finalTotal, 500, 1000, 2000].map((preset, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setCashTendered(String(Math.ceil(preset)))}
                            style={{ padding: '2px 6px', borderRadius: '6px', border: '1px solid #6EE7B7', background: '#FFFFFF', color: '#047857', fontSize: '0.68rem', fontWeight: 800, cursor: 'pointer' }}
                          >
                            {i === 0 ? 'Exact' : `₱${preset}`}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      type="number"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      placeholder={`Enter cash tendered (min ₱${finalTotal.toFixed(2)})`}
                      style={{ width: '100%', padding: '0.5rem 0.7rem', borderRadius: '8px', border: '1px solid #6EE7B7', fontSize: '0.9rem', fontWeight: 800, boxSizing: 'border-box' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '0.88rem', fontWeight: 900, color: '#065F46' }}>
                      <span>Change Due to Customer:</span>
                      <span style={{ fontSize: '1.05rem' }}>₱{changeAmount.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {/* Card Payment Details (Hidden when Cash or E-Wallet is selected) */}
                {paymentMethod === 'Card' && (
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#44403C' }}>Card Terminal Approval / Auth Code</label>
                    <input
                      type="text"
                      value={digitalRefNumber}
                      onChange={(e) => setDigitalRefNumber(e.target.value)}
                      placeholder="Enter POS terminal card approval code (e.g. AUTH-9821)"
                      style={{ width: '100%', padding: '0.5rem 0.7rem', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '0.82rem', marginTop: '3px', boxSizing: 'border-box' }}
                    />
                  </div>
                )}

                <button
                  type="button"
                  disabled={submittingOrder || cart.length === 0}
                  onClick={handleCreatePosOrder}
                  style={{
                    width: '100%', padding: '0.85rem', borderRadius: '12px', border: 'none',
                    background: cart.length === 0 ? '#D6D3D1' : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    color: '#FFFFFF', fontWeight: 900, fontSize: '0.92rem',
                    cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    boxShadow: cart.length === 0 ? 'none' : '0 6px 18px rgba(5, 150, 105, 0.28)'
                  }}
                >
                  <CheckCircle2 size={18} />
                  {submittingOrder ? 'Processing Transaction...' : `Complete Payment & Print Receipt (₱${finalTotal.toFixed(2)})`}
                </button>
              </div>
            </div>
          )}

          {/* SECTION 2: ACTIVE ORDERS & ORDER PROCESSING */}
          {activeSection === 'orders' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{
                background: '#FFFFFF', borderRadius: '16px', padding: '1.25rem 1.5rem',
                border: '1px solid #E7E5E4', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem'
              }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900 }}>Active Orders & Register Queue</h2>
                  <p style={{ margin: '2px 0 0', fontSize: '0.84rem', color: '#78716C' }}>
                    Monitor and update incoming Kiosk, Mobile, and POS orders in real time.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                  {['All', 'New', 'Preparing', 'Ready for Pickup', 'Completed', 'Cancelled'].map(st => (
                    <button
                      key={st}
                      onClick={() => setOrderStatusFilter(st)}
                      style={{
                        padding: '0.48rem 0.9rem', borderRadius: '10px',
                        border: orderStatusFilter === st ? '1px solid #C24522' : '1px solid #E7E5E4',
                        background: orderStatusFilter === st ? '#C24522' : '#FAF8F5',
                        color: orderStatusFilter === st ? '#FFFFFF' : '#44403C',
                        fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer'
                      }}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                {orders
                  .filter(o => orderStatusFilter === 'All' || o.status === orderStatusFilter)
                  .slice(0, 30)
                  .map(order => {
                    const id = order.orderId || order.id;
                    return (
                      <div key={id} style={{ background: '#FFFFFF', borderRadius: '16px', padding: '1.15rem', border: '1px solid #E7E5E4', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.85rem' }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 900, fontSize: '1rem', color: '#1C1917' }}>#{id}</span>
                            <span style={{
                              padding: '3px 9px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 800,
                              background: order.status === 'Completed' ? '#ECFDF5' : order.status === 'Cancelled' ? '#FEF2F2' : '#FFF7ED',
                              color: order.status === 'Completed' ? '#047857' : order.status === 'Cancelled' ? '#B91C1C' : '#C24522'
                            }}>
                              {order.status}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#57534E', marginTop: '4px' }}>
                            <strong>{order.customer || 'Guest'}</strong> • {order.diningOption || 'Dine-In'} ({order.tableNumber || 'Counter'})
                          </div>
                          <div style={{ marginTop: '0.65rem', borderTop: '1px solid #F5F5F4', paddingTop: '0.55rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {(order.items || []).map((it, idx) => (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                <span>{it.quantity || it.qty || 1}x {it.name}</span>
                                <span style={{ fontWeight: 700 }}>₱{(Number(it.price || 0) * Number(it.quantity || it.qty || 1)).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div style={{ borderTop: '1px solid #E7E5E4', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.76rem', color: '#78716C' }}>{order.payment} • {order.paymentStatus}</span>
                            <span style={{ fontWeight: 900, fontSize: '1rem', color: '#047857' }}>₱{Number(order.totalPrice || order.total || 0).toFixed(2)}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {order.status === 'New' && (
                              <button onClick={() => handleUpdateOrderStatus(order, 'Preparing')} style={{ flex: 1, padding: '6px 10px', borderRadius: '8px', border: 'none', background: '#D97706', color: '#FFFFFF', fontWeight: 800, fontSize: '0.76rem', cursor: 'pointer' }}>
                                Mark Preparing
                              </button>
                            )}
                            {order.status === 'Preparing' && (
                              <button onClick={() => handleUpdateOrderStatus(order, 'Ready for Pickup')} style={{ flex: 1, padding: '6px 10px', borderRadius: '8px', border: 'none', background: '#2563EB', color: '#FFFFFF', fontWeight: 800, fontSize: '0.76rem', cursor: 'pointer' }}>
                                Mark Ready
                              </button>
                            )}
                            {order.status === 'Ready for Pickup' && (
                              <button onClick={() => handleUpdateOrderStatus(order, 'Completed')} style={{ flex: 1, padding: '6px 10px', borderRadius: '8px', border: 'none', background: '#059669', color: '#FFFFFF', fontWeight: 800, fontSize: '0.76rem', cursor: 'pointer' }}>
                                Complete Order
                              </button>
                            )}
                            <button
                              onClick={() => handlePrintReceipt(order)}
                              style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #D6D3D1', background: '#FAF8F5', color: '#1C1917', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Printer size={13} /> Receipt
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* SECTION 3: AUTOMATED WEBHOOKS & REFUNDS / VOIDS */}
          {activeSection === 'payments' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '1.25rem 1.5rem', border: '1px solid #E7E5E4', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900 }}>Automated Gateway Webhooks & Refund Control</h2>
                    <span style={{ background: 'rgba(5, 150, 105, 0.1)', color: '#059669', border: '1px solid rgba(5, 150, 105, 0.25)', fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669' }}></span>
                      Live Webhook Engine Active
                    </span>
                  </div>
                  <p style={{ margin: '3px 0 0', fontSize: '0.84rem', color: '#78716C' }}>
                    Zero manual verification required. Payments (GCash, Maya, Stripe, Card) are cryptographically validated via HMAC-SHA256 webhooks and instantly routed to the kitchen.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/webhooks/simulate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          scenario: 'success',
                          gateway: 'paymongo',
                          paymentMethod: 'gcash'
                        })
                      });
                      const data = await res.json();
                      if (data?.success) {
                        alert(`Webhook Simulation Success!\nOrder: ${data.orderId}\nAmount: ₱${data.amount}\nStatus: Successful`);
                        fetchDashboardData();
                      }
                    } catch (e) {
                      alert('Simulation failed: ' + e.message);
                    }
                  }}
                  style={{
                    padding: '8px 14px', borderRadius: '10px', border: '1px solid #059669',
                    background: '#059669', color: '#FFFFFF', fontWeight: 800, fontSize: '0.78rem',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                  title="Simulate an automated payment gateway webhook notification"
                >
                  <Zap size={14} />
                  Simulate Gateway Webhook
                </button>
              </div>

              {/* Automated Webhook Status Banner */}
              <div style={{ background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.05) 0%, rgba(16, 185, 129, 0.05) 100%)', border: '1px solid rgba(5, 150, 105, 0.2)', borderRadius: '16px', padding: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(5, 150, 105, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#78716C', fontWeight: 700 }}>VERIFICATION MODE</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#059669' }}>100% Automated Webhook</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(37, 99, 235, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
                      <Zap size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#78716C', fontWeight: 700 }}>SIGNATURE SECURITY</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1C1917' }}>HMAC-SHA256 Verified</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(217, 119, 6, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D97706' }}>
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#78716C', fontWeight: 700 }}>SERVICE ACTIVATION</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1C1917' }}>Instant Auto-Dispatch</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(100, 116, 139, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
                      <RotateCcw size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#78716C', fontWeight: 700 }}>REPLAY PROTECTION</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1C1917' }}>Idempotent (300s window)</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Webhook Transactions Feed */}
              <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E7E5E4', overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #E7E5E4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Recent Automated Webhook Transactions ({webhookLogs.length})</h3>
                    <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: '#78716C' }}>Live cryptographically verified transactions processed by payment gateway webhooks.</p>
                  </div>
                  <button
                    onClick={() => {
                      fetch('/api/webhooks/logs')
                        .then(r => r.json())
                        .then(d => { if (d?.logs) setWebhookLogs(d.logs); })
                        .catch(() => {});
                    }}
                    style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #E7E5E4', background: '#FAF8F5', color: '#444', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <RefreshCw size={12} /> Refresh
                  </button>
                </div>
                {webhookLogs.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#78716C', fontSize: '0.84rem' }}>
                    No automated webhook events recorded yet. Ready to receive live PayMongo / GCash / Maya events.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ background: '#FAF8F5', borderBottom: '1px solid #E7E5E4', textAlign: 'left', color: '#78716C' }}>
                          <th style={{ padding: '0.7rem 1rem' }}>Event ID</th>
                          <th style={{ padding: '0.7rem 1rem' }}>Gateway / Channel</th>
                          <th style={{ padding: '0.7rem 1rem' }}>Order Ref</th>
                          <th style={{ padding: '0.7rem 1rem' }}>Amount</th>
                          <th style={{ padding: '0.7rem 1rem' }}>Signature</th>
                          <th style={{ padding: '0.7rem 1rem' }}>Status</th>
                          <th style={{ padding: '0.7rem 1rem' }}>Service Activated</th>
                          <th style={{ padding: '0.7rem 1rem' }}>Timestamp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {webhookLogs.slice(0, 10).map((log, idx) => {
                          const isSuccess = log.paymentStatus === 'Successful';
                          const isPending = log.paymentStatus === 'Pending';
                          return (
                            <tr key={log.eventId || idx} style={{ borderBottom: '1px solid #F5F5F4' }}>
                              <td style={{ padding: '0.7rem 1rem', fontFamily: 'monospace', fontWeight: 700 }}>
                                {log.eventId ? log.eventId.slice(0, 16) + '...' : `EVT-${idx + 1}`}
                              </td>
                              <td style={{ padding: '0.7rem 1rem' }}>
                                <span style={{ fontWeight: 800, textTransform: 'uppercase', color: '#1C1917' }}>{log.gateway || 'Universal'}</span>
                                <span style={{ fontSize: '0.74rem', color: '#78716C', display: 'block' }}>{log.paymentMethod || 'Digital'}</span>
                              </td>
                              <td style={{ padding: '0.7rem 1rem', fontWeight: 700, color: '#C24522' }}>
                                #{log.orderId || 'N/A'}
                              </td>
                              <td style={{ padding: '0.7rem 1rem', fontWeight: 800 }}>
                                ₱{Number(log.amount || 0).toFixed(2)}
                              </td>
                              <td style={{ padding: '0.7rem 1rem' }}>
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '3px',
                                  padding: '2px 7px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800,
                                  background: log.signatureStatus?.includes('Verified') ? 'rgba(5, 150, 105, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                  color: log.signatureStatus?.includes('Verified') ? '#059669' : '#DC2626'
                                }}>
                                  <ShieldCheck size={11} />
                                  {log.signatureStatus?.includes('Verified') ? 'HMAC-SHA256 Valid' : log.signatureStatus || 'Unverified'}
                                </span>
                              </td>
                              <td style={{ padding: '0.7rem 1rem' }}>
                                <span style={{
                                  display: 'inline-block', padding: '3px 8px', borderRadius: '12px', fontSize: '0.74rem', fontWeight: 800,
                                  background: isSuccess ? 'rgba(5, 150, 105, 0.1)' : isPending ? 'rgba(217, 119, 6, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                  color: isSuccess ? '#059669' : isPending ? '#D97706' : '#DC2626'
                                }}>
                                  {log.paymentStatus || 'Successful'}
                                </span>
                              </td>
                              <td style={{ padding: '0.7rem 1rem' }}>
                                <span style={{
                                  padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800,
                                  background: log.serviceActivated ? 'rgba(37, 99, 235, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                                  color: log.serviceActivated ? '#2563EB' : '#64748B'
                                }}>
                                  {log.serviceActivated ? 'Kitchen & Points Active' : 'Not Activated'}
                                </span>
                              </td>
                              <td style={{ padding: '0.7rem 1rem', fontSize: '0.74rem', color: '#78716C' }}>
                                {log.processedAt ? new Date(log.processedAt).toLocaleTimeString() : 'Just now'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Refund / Void Transaction Table */}
              <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E7E5E4', overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #E7E5E4' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Processed Shift Transactions (Refund / Void Control)</h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                    <thead>
                      <tr style={{ background: '#FAF8F5', borderBottom: '1px solid #E7E5E4', textAlign: 'left' }}>
                        <th style={{ padding: '0.75rem 1rem' }}>Order ID</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Customer & Table</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Payment</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Total</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Cashier Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.slice(0, 20).map(o => {
                        const id = o.orderId || o.id;
                        const isCancelled = o.status === 'Cancelled' || o.paymentStatus === 'Refunded' || o.paymentStatus === 'Voided';
                        return (
                          <tr key={id} style={{ borderBottom: '1px solid #F5F5F4' }}>
                            <td style={{ padding: '0.75rem 1rem', fontWeight: 800 }}>#{id}</td>
                            <td style={{ padding: '0.75rem 1rem' }}>{o.customer} • {o.tableNumber || 'Counter'}</td>
                            <td style={{ padding: '0.75rem 1rem' }}>{o.payment}</td>
                            <td style={{ padding: '0.75rem 1rem', fontWeight: 800 }}>₱{Number(o.totalPrice || o.total || 0).toFixed(2)}</td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <span style={{
                                padding: '3px 8px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 800,
                                background: isCancelled ? '#FEF2F2' : '#ECFDF5',
                                color: isCancelled ? '#B91C1C' : '#047857'
                              }}>
                                {o.paymentStatus === 'Refunded' ? 'Refunded' : o.paymentStatus === 'Voided' ? 'Voided' : o.status}
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                              {!isCancelled && (
                                <div style={{ display: 'inline-flex', gap: '6px' }}>
                                  <button
                                    onClick={() => {
                                      setRefundModalOrder(o);
                                      setRefundActionType('refund');
                                    }}
                                    style={{ padding: '4px 9px', borderRadius: '6px', border: '1px solid #FED7AA', background: '#FFF7ED', color: '#C24522', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}
                                  >
                                    Refund
                                  </button>
                                  <button
                                    onClick={() => {
                                      setRefundModalOrder(o);
                                      setRefundActionType('void');
                                    }}
                                    style={{ padding: '4px 9px', borderRadius: '6px', border: '1px solid #FECACA', background: '#FEF2F2', color: '#B91C1C', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}
                                  >
                                    Void
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: RECEIPT GENERATION & TRANSACTION HISTORY */}
          {activeSection === 'receipts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{
                background: '#FFFFFF', borderRadius: '16px', padding: '1.25rem 1.5rem',
                border: '1px solid #E7E5E4', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem'
              }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900 }}>Official Receipt Generation & Shift Transaction History</h2>
                  <p style={{ margin: '2px 0 0', fontSize: '0.84rem', color: '#78716C' }}>
                    View itemized order breakdowns, payment references, cash tendered, and print official thermal receipts.
                  </p>
                </div>
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Search order ID, customer, payment..."
                  style={{ padding: '0.55rem 0.9rem', borderRadius: '10px', border: '1px solid #D6D3D1', fontSize: '0.84rem', minWidth: '250px' }}
                />
              </div>

              <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E7E5E4', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                  <thead>
                    <tr style={{ background: '#FAF8F5', borderBottom: '1px solid #E7E5E4', textAlign: 'left' }}>
                      <th style={{ padding: '0.85rem 1.25rem' }}>Order #</th>
                      <th style={{ padding: '0.85rem 1rem' }}>Date & Time</th>
                      <th style={{ padding: '0.85rem 1rem' }}>Customer / Table</th>
                      <th style={{ padding: '0.85rem 1rem' }}>Items</th>
                      <th style={{ padding: '0.85rem 1rem' }}>Payment</th>
                      <th style={{ padding: '0.85rem 1rem' }}>Total Paid</th>
                      <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Official Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders
                      .filter(o => {
                        if (!historySearch.trim()) return true;
                        const q = historySearch.toLowerCase();
                        return (
                          String(o.orderId || o.id).toLowerCase().includes(q) ||
                          (o.customer || '').toLowerCase().includes(q) ||
                          (o.payment || '').toLowerCase().includes(q)
                        );
                      })
                      .slice(0, 40)
                      .map(order => {
                        const id = order.orderId || order.id;
                        return (
                          <tr key={id} style={{ borderBottom: '1px solid #F5F5F4' }}>
                            <td style={{ padding: '0.85rem 1.25rem', fontWeight: 800 }}>#{id}</td>
                            <td style={{ padding: '0.85rem 1rem', color: '#78716C', fontSize: '0.78rem' }}>
                              {order.createdAt ? new Date(order.createdAt).toLocaleString() : 'Today'}
                            </td>
                            <td style={{ padding: '0.85rem 1rem' }}>
                              <div style={{ fontWeight: 700 }}>{order.customer}</div>
                              <div style={{ fontSize: '0.74rem', color: '#78716C' }}>{order.diningOption} • {order.tableNumber}</div>
                            </td>
                            <td style={{ padding: '0.85rem 1rem', fontSize: '0.79rem' }}>
                              {(order.items || []).map(i => `${i.quantity || i.qty || 1}x ${i.name}`).join(', ')}
                            </td>
                            <td style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>{order.payment}</td>
                            <td style={{ padding: '0.85rem 1rem', fontWeight: 900, color: '#047857' }}>
                              ₱{Number(order.totalPrice || order.total || 0).toFixed(2)}
                            </td>
                            <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>
                              <button
                                onClick={() => handlePrintReceipt(order)}
                                style={{
                                  padding: '6px 12px', borderRadius: '8px', border: '1px solid #C24522',
                                  background: '#FFF7ED', color: '#C24522', fontWeight: 800, fontSize: '0.76rem',
                                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px'
                                }}
                              >
                                <Printer size={13} /> Print Receipt
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECTION 5: CASHIER DAILY REPORT (REAL-TIME RECONCILIATION & SUBMISSION) */}
          {activeSection === 'daily-report' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{
                background: '#FFFFFF', borderRadius: '18px', padding: '1.4rem 1.75rem',
                border: '1px solid #E7E5E4', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem'
              }}>
                <div>
                  <span style={{
                    background: '#ECFDF5', color: '#047857', padding: '3px 10px', borderRadius: '999px',
                    fontSize: '0.72rem', fontWeight: 800, border: '1px solid #A7F3D0'
                  }}>
                    AUTOMATIC DATABASE RECONCILIATION
                  </span>
                  <h2 style={{ margin: '6px 0 2px', fontSize: '1.4rem', fontWeight: 900 }}>
                    Cashier Daily Report & Cash Drawer Reconciliation
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: '#78716C' }}>
                    All transaction counts, cash sales, digital payments, discounts, refunds, and voids are computed directly from actual recorded orders.
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
                    onClick={() => handleSubmitCashierReport('Draft')}
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
                    onClick={() => handleSubmitCashierReport('Pending Review')}
                    style={{
                      padding: '0.6rem 1.25rem', borderRadius: '10px', border: 'none',
                      background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: '#FFFFFF',
                      fontWeight: 800, fontSize: '0.84rem', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '7px',
                      boxShadow: '0 4px 14px rgba(5, 150, 105, 0.28)'
                    }}
                  >
                    <Send size={15} /> Submit Report to Administrator
                  </button>
                </div>
              </div>

              {/* Live Computed Financial KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(195px, 1fr))', gap: '1rem' }}>
                {[
                  { label: 'Total Transactions', value: liveShiftStats.transactionsCount, sub: `${liveShiftStats.completedCount} Completed • ${liveShiftStats.cancelledCount} Cancelled`, color: '#1C1917' },
                  { label: 'Total Completed Sales', value: `₱${liveShiftStats.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, sub: `Discounts: ₱${liveShiftStats.discountsApplied.toFixed(2)}`, color: '#059669' },
                  { label: 'Cash Payments Collected', value: `₱${liveShiftStats.cashSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, sub: `Tendered: ₱${liveShiftStats.cashReceived.toFixed(2)} • Change: ₱${liveShiftStats.changeGiven.toFixed(2)}`, color: '#047857' },
                  { label: 'Digital Payments (GCash/Card)', value: `₱${liveShiftStats.digitalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, sub: `GCash: ₱${liveShiftStats.gcashSales.toFixed(2)} • Card: ₱${liveShiftStats.cardSales.toFixed(2)}`, color: '#2563EB' },
                  { label: 'Refunds & Voided Orders', value: `₱${liveShiftStats.refundsAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, sub: `${liveShiftStats.refundsCount} Refunds • ${liveShiftStats.voidsCount} Voids`, color: '#B91C1C' }
                ].map((kpi, idx) => (
                  <div key={idx} style={{ background: '#FFFFFF', borderRadius: '14px', padding: '1.1rem 1.25rem', border: '1px solid #E7E5E4' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#78716C' }}>{kpi.label}</div>
                    <div style={{ fontSize: '1.45rem', fontWeight: 900, color: kpi.color, marginTop: '4px' }}>{kpi.value}</div>
                    <div style={{ fontSize: '0.72rem', color: '#57534E', marginTop: '4px', fontWeight: 600 }}>{kpi.sub}</div>
                  </div>
                ))}
              </div>

              {/* Cash Drawer Reconciliation & Variance Worksheet */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '1.4rem', border: '1px solid #E7E5E4', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900 }}>1. Cash Drawer Balance & Overage / Shortage Calculator</h3>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                    <div>
                      <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#44403C' }}>Beginning Cash Float (₱)</label>
                      <input
                        type="number"
                        value={openingFloat}
                        onChange={(e) => setOpeningFloat(Number(e.target.value))}
                        style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '10px', border: '1px solid #D6D3D1', fontSize: '0.9rem', fontWeight: 800, marginTop: '4px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#44403C' }}>Expected Ending Cash (₱)</label>
                      <input
                        type="text"
                        readOnly
                        value={`₱${liveShiftStats.expectedCash.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                        style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '10px', border: '1px solid #A7F3D0', background: '#ECFDF5', color: '#047857', fontSize: '0.9rem', fontWeight: 900, marginTop: '4px' }}
                      />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1C1917' }}>Actual Cash Counted in Drawer (₱)</label>
                      <button
                        type="button"
                        onClick={() => {
                          setUseManualCashInput(true);
                          setManualActualCash(String(liveShiftStats.expectedCash));
                        }}
                        style={{ padding: '2px 8px', borderRadius: '6px', border: '1px solid #059669', background: '#ECFDF5', color: '#047857', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }}
                      >
                        Match Expected (₱{liveShiftStats.expectedCash.toFixed(2)})
                      </button>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      value={manualActualCash !== '' ? manualActualCash : liveShiftStats.actualCashCount}
                      onChange={(e) => {
                        setUseManualCashInput(true);
                        setManualActualCash(e.target.value);
                      }}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '2px solid #059669', fontSize: '1rem', fontWeight: 900 }}
                    />
                  </div>

                  {/* Variance Banner */}
                  <div style={{
                    padding: '1rem', borderRadius: '12px',
                    background: liveShiftStats.variance === 0 ? '#ECFDF5' : liveShiftStats.variance > 0 ? '#EFF6FF' : '#FEF2F2',
                    border: `1px solid ${liveShiftStats.variance === 0 ? '#A7F3D0' : liveShiftStats.variance > 0 ? '#BFDBFE' : '#FECACA'}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#57534E' }}>
                        Cash Reconciliation Status
                      </div>
                      <div style={{
                        fontSize: '1.1rem', fontWeight: 900,
                        color: liveShiftStats.variance === 0 ? '#047857' : liveShiftStats.variance > 0 ? '#1D4ED8' : '#B91C1C'
                      }}>
                        {liveShiftStats.varianceStatus} ({liveShiftStats.variance >= 0 ? '+' : ''}₱{liveShiftStats.variance.toFixed(2)})
                      </div>
                    </div>
                    <CheckCircle2 size={26} color={liveShiftStats.variance === 0 ? '#059669' : '#D97706'} />
                  </div>

                  {/* Shift Attendance & Remarks */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#44403C' }}>Clock-In Time</label>
                      <input type="text" value={clockIn} onChange={(e) => setClockIn(e.target.value)} style={{ width: '100%', padding: '0.5rem 0.7rem', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '0.82rem', marginTop: '3px' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#44403C' }}>Clock-Out Time</label>
                      <input type="text" value={clockOut} onChange={(e) => setClockOut(e.target.value)} style={{ width: '100%', padding: '0.5rem 0.7rem', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '0.82rem', marginTop: '3px' }} />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#44403C' }}>Cashier Shift Notes & Remarks for Administrator</label>
                    <textarea
                      rows={3}
                      value={cashierRemarks}
                      onChange={(e) => setCashierRemarks(e.target.value)}
                      style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '10px', border: '1px solid #D6D3D1', fontSize: '0.83rem', marginTop: '4px' }}
                    />
                  </div>
                </div>

                {/* Right: Submitted Cashier Daily Reports & Admin Review Status */}
                <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '1.4rem', border: '1px solid #E7E5E4', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900 }}>
                    2. Submitted Cashier Daily Reports & Admin Feedback
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '420px', overflowY: 'auto' }}>
                    {myReports.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: '#78716C', background: '#FAF8F5', borderRadius: '12px' }}>
                        No Cashier Daily Reports submitted yet.
                      </div>
                    ) : (
                      myReports.map(rpt => (
                        <div key={rpt.id} style={{ padding: '1rem', borderRadius: '12px', border: '1px solid #E7E5E4', background: '#FAF8F5' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <span style={{ fontWeight: 900, fontSize: '0.9rem', color: '#1C1917' }}>{rpt.id}</span>
                              <span style={{ marginLeft: '8px', fontSize: '0.78rem', color: '#78716C' }}>{rpt.reportDate} • {rpt.employeeName}</span>
                            </div>
                            <span style={{
                              padding: '3px 9px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 800,
                              background: rpt.reportStatus === 'Approved' ? '#ECFDF5' : rpt.reportStatus === 'Needs Correction' ? '#FEF2F2' : '#FFF7ED',
                              color: rpt.reportStatus === 'Approved' ? '#047857' : rpt.reportStatus === 'Needs Correction' ? '#B91C1C' : '#C24522'
                            }}>
                              {rpt.reportStatus}
                            </span>
                          </div>
                          {rpt.cashierData && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '8px', fontSize: '0.78rem' }}>
                              <div>Total Sales: <strong>₱{Number(rpt.cashierData.totalSales || 0).toLocaleString()}</strong></div>
                              <div>Expected Cash: <strong>₱{Number(rpt.cashierData.expectedCash || 0).toLocaleString()}</strong></div>
                              <div>Variance: <strong>{rpt.cashierData.varianceStatus} (₱{Number(rpt.cashierData.variance || 0).toFixed(2)})</strong></div>
                            </div>
                          )}
                          {rpt.reviewNotes && (
                            <div style={{ marginTop: '8px', padding: '6px 10px', borderRadius: '8px', background: '#FFFFFF', border: '1px solid #E7E5E4', fontSize: '0.76rem', color: '#44403C' }}>
                              <strong>Admin Review ({rpt.reviewedBy || 'Administrator'}):</strong> {rpt.reviewNotes}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modal: Instant POS Receipt Preview */}
      {activeReceiptOrder && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(28, 25, 23, 0.58)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9200, padding: '1rem'
        }}>
          <div style={{ background: '#FFFFFF', borderRadius: '18px', width: '100%', maxWidth: '400px', padding: '1.5rem', border: '1px solid #E7E5E4' }}>
            <div style={{ textAlign: 'center', borderBottom: '1px dashed #D6D3D1', paddingBottom: '0.85rem' }}>
              <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#1C1917' }}>UMAMI CRAFT FUSION</div>
              <div style={{ fontSize: '0.76rem', color: '#78716C' }}>Official POS Receipt • #{activeReceiptOrder.orderId || activeReceiptOrder.id}</div>
            </div>
            <div style={{ padding: '0.85rem 0', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Customer:</span><strong>{activeReceiptOrder.customer}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Table / Option:</span><span>{activeReceiptOrder.diningOption} ({activeReceiptOrder.tableNumber})</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Cashier:</span><span>{employeeName}</span></div>
            </div>
            <div style={{ borderTop: '1px dashed #D6D3D1', borderBottom: '1px dashed #D6D3D1', padding: '0.65rem 0', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.82rem' }}>
              {(activeReceiptOrder.items || []).map((it, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{it.quantity || it.qty || 1}x {it.name}</span>
                  <strong>₱{(Number(it.price || 0) * Number(it.quantity || it.qty || 1)).toFixed(2)}</strong>
                </div>
              ))}
            </div>
            <div style={{ padding: '0.75rem 0', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '1.05rem', color: '#047857' }}>
                <span>TOTAL PAID ({activeReceiptOrder.payment}):</span>
                <span>₱{Number(activeReceiptOrder.totalPrice || activeReceiptOrder.total || 0).toFixed(2)}</span>
              </div>
              {activeReceiptOrder.cashReceived && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#57534E' }}>
                  <span>Cash Tendered: ₱{Number(activeReceiptOrder.cashReceived).toFixed(2)}</span>
                  <span>Change: ₱{Number(activeReceiptOrder.changeGiven || 0).toFixed(2)}</span>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '0.5rem' }}>
              <button
                onClick={() => handlePrintReceipt(activeReceiptOrder)}
                style={{ flex: 1, padding: '0.65rem', borderRadius: '10px', border: 'none', background: '#C24522', color: '#FFFFFF', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Printer size={15} /> Print Receipt
              </button>
              <button
                onClick={() => setActiveReceiptOrder(null)}
                style={{ padding: '0.65rem 1rem', borderRadius: '10px', border: '1px solid #D6D3D1', background: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Refund or Void Confirmation */}
      {refundModalOrder && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(28, 25, 23, 0.58)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9200, padding: '1rem'
        }}>
          <div style={{ background: '#FFFFFF', borderRadius: '18px', width: '100%', maxWidth: '420px', padding: '1.5rem', border: '1px solid #E7E5E4' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', fontWeight: 900 }}>
              {refundActionType === 'void' ? 'Void Transaction' : 'Process Order Refund'} • #{refundModalOrder.orderId || refundModalOrder.id}
            </h3>
            <p style={{ margin: '0 0 1rem', fontSize: '0.82rem', color: '#78716C' }}>
              Amount: <strong>₱{Number(refundModalOrder.totalPrice || refundModalOrder.total || 0).toFixed(2)}</strong> ({refundModalOrder.payment}). This will update the Cashier Daily Report automatically.
            </p>
            <form onSubmit={handleConfirmRefundOrVoid} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <textarea
                rows={3}
                required
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Enter reason for refund or void..."
                style={{ width: '100%', padding: '0.6rem', borderRadius: '10px', border: '1px solid #D6D3D1', fontSize: '0.84rem' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setRefundModalOrder(null)} style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: '1px solid #D6D3D1', background: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '0.55rem 1.15rem', borderRadius: '8px', border: 'none', background: '#B91C1C', color: '#FFFFFF', fontWeight: 800, cursor: 'pointer' }}>
                  Confirm {refundActionType === 'void' ? 'Void' : 'Refund'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

