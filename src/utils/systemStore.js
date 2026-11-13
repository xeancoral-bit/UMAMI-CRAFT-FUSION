import seedEmployees from '../../data/employees.json';
import seedStaffTasks from '../../data/staff_tasks.json';
import seedAuditLogs from '../../data/audit_logs.json';
import seedDailyReports from '../../data/daily_reports.json';

const EMP_STORAGE_KEY = 'umami_employees_store_v1';
const TASKS_STORAGE_KEY = 'umami_staff_tasks_store_v1';
const LOGS_STORAGE_KEY = 'umami_audit_logs_store_v1';
const REPORTS_STORAGE_KEY = 'umami_daily_reports_store_v1';

function readLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return Array.isArray(fallback) ? [...fallback] : fallback;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(fallback) && (!Array.isArray(parsed) || parsed.length === 0)) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return [...fallback];
    }
    return parsed;
  } catch {
    return Array.isArray(fallback) ? [...fallback] : fallback;
  }
}

function writeLocal(key, data, skipEvent = false) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    if (!skipEvent) {
      window.dispatchEvent(new CustomEvent('umami-system-sync', { detail: { key } }));
    }
  } catch {}
}

export function getLocalEmployees() {
  const local = readLocal(EMP_STORAGE_KEY, seedEmployees);
  // Ensure all seed employees exist if not explicitly deleted
  const byId = new Map();
  for (const emp of seedEmployees) {
    byId.set(emp.id, { ...emp });
  }
  for (const emp of local) {
    if (emp && emp.id) {
      const seedMatch = byId.get(emp.id) || {};
      byId.set(emp.id, {
        ...seedMatch,
        ...emp,
        password: emp.password || seedMatch.password || 'staff123'
      });
    }
  }
  return Array.from(byId.values());
}

export function saveLocalEmployees(list, skipEvent = false) {
  writeLocal(EMP_STORAGE_KEY, list, skipEvent);
  return list;
}

export async function fetchEmployeesList() {
  const localList = getLocalEmployees();
  try {
    const res = await fetch('/api/employees');
    if (res.ok) {
      const apiList = await res.json();
      if (Array.isArray(apiList) && apiList.length > 0) {
        // Merge passwords from local store so client-side fallback auth always has passwords
        const localMap = new Map(localList.map(e => [e.id, e]));
        const merged = apiList.map(emp => ({
          ...(localMap.get(emp.id) || {}),
          ...emp,
          password: emp.password || localMap.get(emp.id)?.password || (emp.accountType === 'admin' ? 'admin123' : emp.accountType === 'cashier' ? 'cashier123' : 'staff123')
        }));
        // Also keep any newly created local employees if backend hadn't restarted yet
        for (const loc of localList) {
          if (!merged.some(m => m.id === loc.id)) {
            merged.push(loc);
          }
        }
        saveLocalEmployees(merged, true);
        return merged;
      }
    }
  } catch {}
  return localList;
}

export function getLocalAuditLogs() {
  return readLocal(LOGS_STORAGE_KEY, seedAuditLogs);
}

export function appendLocalAuditLog(entry) {
  const logs = getLocalAuditLogs();
  const newEntry = {
    id: entry.id || `LOG-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`,
    timestamp: entry.timestamp || new Date().toISOString(),
    actorId: entry.actorId || 'SYSTEM',
    actorName: entry.actorName || 'System User',
    actorRole: entry.actorRole || 'Staff',
    accountType: entry.accountType || 'staff',
    category: entry.category || 'Operations',
    action: entry.action || 'System Activity',
    target: entry.target || 'System',
    details: entry.details || '',
    status: entry.status || 'Success'
  };
  const updated = [newEntry, ...logs].slice(0, 500);
  writeLocal(LOGS_STORAGE_KEY, updated);
  // Best-effort sync to backend if available
  fetch('/api/audit-logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newEntry)
  }).catch(() => {});
  return newEntry;
}

export async function fetchAuditLogsList() {
  const localLogs = getLocalAuditLogs();
  try {
    const res = await fetch('/api/audit-logs');
    if (res.ok) {
      const apiLogs = await res.json();
      if (Array.isArray(apiLogs) && apiLogs.length > 0) {
        const seen = new Set(apiLogs.map(l => l.id));
        const combined = [...apiLogs, ...localLogs.filter(l => !seen.has(l.id))]
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .slice(0, 500);
        writeLocal(LOGS_STORAGE_KEY, combined, true);
        return combined;
      }
    }
  } catch {}
  return localLogs;
}

export function getLocalStaffTasks() {
  return readLocal(TASKS_STORAGE_KEY, seedStaffTasks);
}

export function saveLocalStaffTasks(tasks, skipEvent = false) {
  writeLocal(TASKS_STORAGE_KEY, tasks, skipEvent);
  return tasks;
}

export async function fetchStaffTasksList() {
  const localTasks = getLocalStaffTasks();
  try {
    const res = await fetch('/api/staff-tasks');
    if (res.ok) {
      const apiTasks = await res.json();
      if (Array.isArray(apiTasks) && apiTasks.length > 0) {
        const seen = new Set(apiTasks.map(t => t.id));
        const merged = [...apiTasks, ...localTasks.filter(t => !seen.has(t.id))];
        saveLocalStaffTasks(merged, true);
        return merged;
      }
    }
  } catch {}
  return localTasks;
}

export function getLocalDailyReports() {
  return readLocal(REPORTS_STORAGE_KEY, seedDailyReports);
}

export function saveLocalDailyReports(reports, skipEvent = false) {
  writeLocal(REPORTS_STORAGE_KEY, reports, skipEvent);
  return reports;
}

export async function fetchDailyReportsList() {
  const localReports = getLocalDailyReports();
  try {
    const res = await fetch('/api/daily-reports');
    if (res.ok) {
      const apiReports = await res.json();
      if (Array.isArray(apiReports)) {
        const byId = new Map();
        for (const r of localReports) byId.set(r.id, r);
        for (const r of apiReports) byId.set(r.id, r);
        const merged = Array.from(byId.values()).sort(
          (a, b) => new Date(b.submittedAt || b.reportDate) - new Date(a.submittedAt || a.reportDate)
        );
        saveLocalDailyReports(merged, true);
        return merged;
      }
    }
  } catch {}
  return localReports;
}

/**
 * Unified Role-Based Account Login (Admin, Cashier, Staff).
 * Authenticates via backend `/api/admin/login` first, and seamlessly falls back
 * to the synchronized employee database if the backend server process hasn't
 * been restarted yet.
 */
export async function authenticateRoleBasedAccount(identifierInput, passwordInput) {
  const loginId = String(identifierInput || '').trim().toLowerCase();
  const password = String(passwordInput || '');

  if (!loginId || !password) {
    throw new Error('Please provide both username/email and password.');
  }

  // 1. Check synchronized employee database first so we know the exact account record
  const employees = await fetchEmployeesList();
  const matchedEmp = employees.find(e =>
    String(e.email || '').toLowerCase() === loginId ||
    String(e.username || '').toLowerCase() === loginId ||
    String(e.id || '').toLowerCase() === loginId
  );

  // Try backend authentication first
  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: loginId,
        username: loginId,
        identifier: loginId,
        password
      })
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok && data?.user) {
      const resolvedType = data.user.accountType || matchedEmp?.accountType || (
        String(data.user.role || '').toLowerCase().includes('admin') ? 'admin' :
        String(data.user.role || '').toLowerCase().includes('cashier') ? 'cashier' : 'staff'
      );
      const finalUser = {
        ...(matchedEmp || {}),
        ...data.user,
        id: data.user.id || matchedEmp?.id || 'EMP-001',
        employeeId: data.user.employeeId || data.user.id || matchedEmp?.id || 'EMP-001',
        accountType: resolvedType
      };

      // Update local employee lastLogin
      if (matchedEmp) {
        matchedEmp.lastLogin = new Date().toISOString();
        saveLocalEmployees(employees);
      }
      return finalUser;
    }

    // If backend explicitly returned 403 Deactivated, honor it immediately
    if (response.status === 403 && data?.error) {
      throw new Error(data.error);
    }
  } catch (err) {
    if (err.message && err.message.startsWith('Account Deactivated:')) {
      throw err;
    }
  }

  // 2. Synchronized Employee Store verification (handles Staff, Cashier, and Admin accounts even if backend wasn't restarted)
  if (matchedEmp) {
    if (String(matchedEmp.status || 'Active').toLowerCase() !== 'active') {
      appendLocalAuditLog({
        actorId: matchedEmp.id,
        actorName: matchedEmp.name,
        actorRole: matchedEmp.role,
        accountType: matchedEmp.accountType || 'staff',
        category: 'Authentication',
        action: 'Blocked Login (Deactivated Account)',
        target: matchedEmp.email || matchedEmp.username,
        details: `Deactivated user ${matchedEmp.name} (${matchedEmp.id}) attempted to log in.`,
        status: 'Blocked'
      });
      throw new Error(
        `Account Deactivated: "${matchedEmp.name}" (${matchedEmp.id}) is currently inactive. Please contact the System Administrator.`
      );
    }

    const expectedPassword = matchedEmp.password || (
      matchedEmp.accountType === 'admin' ? 'admin123' :
      matchedEmp.accountType === 'cashier' ? 'cashier123' : 'staff123'
    );

    if (password !== expectedPassword) {
      appendLocalAuditLog({
        actorId: matchedEmp.id,
        actorName: matchedEmp.name,
        actorRole: matchedEmp.role,
        accountType: matchedEmp.accountType || 'staff',
        category: 'Authentication',
        action: 'Failed Login Attempt',
        target: matchedEmp.email || matchedEmp.username,
        details: `Invalid password entered for ${matchedEmp.name} (${matchedEmp.id}).`,
        status: 'Failed'
      });
      throw new Error('Access Denied: Incorrect password for this account.');
    }

    const acctType = matchedEmp.accountType || (
      String(matchedEmp.role || '').toLowerCase().includes('admin') ? 'admin' :
      String(matchedEmp.role || '').toLowerCase().includes('cashier') ? 'cashier' : 'staff'
    );

    const nowIso = new Date().toISOString();
    matchedEmp.lastLogin = nowIso;
    saveLocalEmployees(employees);

    appendLocalAuditLog({
      actorId: matchedEmp.id,
      actorName: matchedEmp.name,
      actorRole: matchedEmp.role,
      accountType: acctType,
      category: 'Authentication',
      action: `${acctType === 'admin' ? 'Admin' : acctType === 'cashier' ? 'Cashier' : 'Staff'} Account Login`,
      target: matchedEmp.department || matchedEmp.position || 'Dashboard',
      details: `${matchedEmp.name} (${matchedEmp.id} • ${matchedEmp.role}) signed in successfully.`,
      status: 'Success'
    });

    return {
      id: matchedEmp.id,
      employeeId: matchedEmp.id,
      username: matchedEmp.username,
      email: matchedEmp.email,
      name: matchedEmp.name,
      accountType: acctType,
      role: matchedEmp.role,
      position: matchedEmp.position,
      department: matchedEmp.department,
      station: matchedEmp.department,
      shift: matchedEmp.shift,
      contact: matchedEmp.contact,
      status: matchedEmp.status,
      registerId: matchedEmp.registerId || 'POS-01 (Main Counter)',
      openingFloat: matchedEmp.openingFloat || 5000,
      permissions: matchedEmp.permissions || [],
      lastLogin: nowIso,
      createdAt: matchedEmp.createdAt
    };
  }

  throw new Error('Access Denied: Invalid username/email or unauthorized account.');
}

/**
 * Customer Accounts & Membership Subscriptions
 */
export async function fetchCustomerAccountsList() {
  try {
    const res = await fetch('/api/customer-accounts');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.customers)) {
        localStorage.setItem('umami_customer_accounts', JSON.stringify(data.customers));
        return data.customers;
      }
    }
  } catch {}
  try {
    const local = localStorage.getItem('umami_customer_accounts');
    if (local) return JSON.parse(local);
  } catch {}
  return [];
}

/**
 * Payment Webhook Logs
 */
export async function fetchPaymentWebhooksList() {
  try {
    const res = await fetch('/api/webhooks/logs');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.logs)) {
        return data.logs;
      }
    }
  } catch {}
  return [];
}

