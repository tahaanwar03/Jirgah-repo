// backend/apps-script.js — Jirgah Google Apps Script Backend
// Phase 10: Production Hardening

// ===== CONFIG =====
const BACKEND_CONFIG = {
  API_KEY: "JIRGAH_SECURE_2026"
};
const API_KEY = BACKEND_CONFIG.API_KEY;

// ===== SHEET CONFIG =====
const SHEET_NAMES = {
  ORDERS_MAIN: 'Orders',
  ORDERS_QUEUE: 'Orders_Queue',
  ORDERS_ARCHIVE: 'Orders_Archive',
  MENU: 'Menu',
  LOGS: 'Logs',
  SYSTEM: 'SystemSettings'
};

const COLUMNS = {
  ORDER: ['OrderID', 'Timestamp', 'CustomerName', 'Phone', 'Address', 'Items', 'Total', 'Notes', 'Status', 'LockedBy', 'LockedAt', 'LastUpdated', 'StatusHistory'],
  MENU: ['ID', 'Category', 'Name', 'Description', 'Price', 'Image', 'Badge', 'Variants_JSON', 'Version', 'LastUpdated', 'Available'],
  LOGS: ['Timestamp', 'Type', 'Message'],
  SYSTEM: ['Key', 'Value']
};

const ORDER_STATUS = ['Pending', 'Accepted', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'];

const STATUS_FLOW = {
  'Pending': ['Accepted', 'Cancelled'],
  'Accepted': ['Preparing', 'Cancelled'],
  'Preparing': ['Out for Delivery', 'Cancelled'],
  'Out for Delivery': ['Delivered'],
  'Delivered': [],
  'Cancelled': []
};

const SYSTEM_DEFAULTS = {
  isOpen: 'false',
  restaurantName: 'Jirgah'
};

const CONFIG = {
  ARCHIVE_THRESHOLD: 3000,
  ARCHIVE_BATCH_SIZE: 1000,
  CACHE_TTL: 30,
  RATE_LIMIT_WINDOW: 10,
  RATE_LIMIT_MAX: 5
};

// ===== RESPONSE HELPER =====
function respond(success, message, data = {}) {
  return ContentService.createTextOutput(JSON.stringify({
    status: success ? 'success' : 'error',
    message: message,
    data: data
  })).setMimeType(ContentService.MimeType.JSON);
}

// ===== SAFE JSON PARSING =====
function safeParse(json) {
  try {
    return JSON.parse(json || '[]');
  } catch {
    return [];
  }
}

// ===== COLUMN MAPPER =====
function getColumnMap(sheet) {
  try {
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const map = {};
    headers.forEach((h, i) => { map[h] = i + 1; });
    return map;
  } catch {
    return {};
  }
}

// ===== AUTO-BOOTSTRAP SHEETS =====
function ensureSheetsExist() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  Object.values(SHEET_NAMES).forEach(name => {
    let sheet = ss.getSheetByName(name);
    
    if (!sheet) {
      sheet = ss.insertSheet(name);
    }
    
    let expectedHeaders = [];
    if (name === SHEET_NAMES.ORDERS_MAIN || name === SHEET_NAMES.ORDERS_QUEUE || name === SHEET_NAMES.ORDERS_ARCHIVE) {
      expectedHeaders = COLUMNS.ORDER;
    } else if (name === SHEET_NAMES.MENU) {
      expectedHeaders = COLUMNS.MENU;
    } else if (name === SHEET_NAMES.LOGS) {
      expectedHeaders = COLUMNS.LOGS;
    } else if (name === SHEET_NAMES.SYSTEM) {
      expectedHeaders = COLUMNS.SYSTEM;
    }
    
    if (expectedHeaders.length > 0) {
      const existing = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      expectedHeaders.forEach((col, i) => {
        if (!existing[i] || existing[i] !== col) {
          sheet.getRange(1, i + 1).setValue(col);
        }
      });
    }
  });
  
  // Set number formats for Orders sheets
  ['Orders', 'Orders_Queue', 'Orders_Archive'].forEach(name => {
    const sheet = ss.getSheetByName(name);
    if (sheet) {
      sheet.getRange('A:A').setNumberFormat('@');
      sheet.getRange('B:B').setNumberFormat('yyyy-mm-dd HH:mm:ss');
      sheet.getRange('D:D').setNumberFormat('@');
      sheet.getRange('G:G').setNumberFormat('#,##0.00');
    }
  });
  
  // Menu price format
  const menuSheet = ss.getSheetByName(SHEET_NAMES.MENU);
  if (menuSheet) {
    const col = getColumnMap(menuSheet);
    if (col.Price) {
      menuSheet.getRange(2, col.Price, menuSheet.getLastRow(), 1).setNumberFormat('#,##0.00');
    }
  }
}

// ===== SYSTEM SETTINGS AUTO-INIT =====
function getSystemSetting(key) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAMES.SYSTEM);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAMES.SYSTEM);
    sheet.appendRow(COLUMNS.SYSTEM);
  }
  
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) return data[i][1];
  }
  
  const value = SYSTEM_DEFAULTS[key] || '';
  sheet.appendRow([key, value]);
  return value;
}

function setSystemSetting(key, value) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAMES.SYSTEM);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAMES.SYSTEM);
      sheet.appendRow(COLUMNS.SYSTEM);
    }
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === key) {
        sheet.getRange(i + 1, 2).setValue(value);
        return;
      }
    }
    sheet.appendRow([key, value]);
  } catch (e) {
    logError('SET_SYSTEM_ERROR', key + ': ' + e.message);
  }
}

// ===== LOGGING =====
function logError(type, message) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAMES.LOGS);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAMES.LOGS);
      sheet.appendRow(COLUMNS.LOGS);
    }
    sheet.appendRow([new Date().toISOString(), type, String(message).slice(0, 500)]);
  } catch {}
}

// ===== CACHE =====
function getCache() {
  return CacheService.getScriptCache();
}

function normalizePhone(phone) {
  if (!phone) return '';
  let digits = String(phone).replace(/[^0-9]/g, '');
  if (digits.startsWith('92')) digits = '0' + digits.slice(2);
  if (digits.length > 11) digits = digits.slice(-11);
  return digits;
}

function checkRateLimit(ip) {
  const cache = getCache();
  const key = 'rate_' + (ip || 'unknown');
  const count = Number(cache.get(key)) || 0;
  if (count > CONFIG.RATE_LIMIT_MAX) return { allowed: false, count };
  cache.put(key, String(count + 1), CONFIG.RATE_LIMIT_WINDOW);
  return { allowed: true, count: count + 1 };
}

function checkIdempotency(orderId) {
  const cache = getCache();
  const key = 'idemp_' + orderId;
  if (cache.get(key)) return true;
  cache.put(key, '1', 300);
  return false;
}

// ===== MAP ROWS =====
function mapRows(dataRows, type) {
  if (!dataRows || dataRows.length < 2) return [];
  const headers = dataRows[0];
  const normalizeMap = {
    'Order ID': 'OrderID',
    'Customer Name': 'CustomerName',
    'Order JSON': 'Items'
  };
  return dataRows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      const key = normalizeMap[h] || h.replace(/\s+/g, '');
      obj[key] = row[i];
    });
    return obj;
  });
}

function mapOrderRow(row, col) {
  return {
    OrderID: row[col.OrderID] || '',
    Timestamp: row[col.Timestamp] || '',
    CustomerName: row[col.CustomerName] || '',
    Phone: String(row[col.Phone] || '').replace(/^'+/, ''),
    Address: row[col.Address] || '',
    Items: row[col.Items] || '[]',
    Total: row[col.Total] || 0,
    Notes: row[col.Notes] || '',
    Status: row[col.Status] || 'Pending',
    LockedBy: row[col.LockedBy] || '',
    LockedAt: row[col.LockedAt] || '',
    LastUpdated: row[col.LastUpdated] || '',
    StatusHistory: row[col.StatusHistory] || '[]'
  };
}

// ===== ORDER TRACKING =====
function handleTrackOrder(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAMES.ORDERS_MAIN);
    const col = getColumnMap(sheet);
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const storedPhone = normalizePhone(String(row[col.Phone - 1] || '').replace(/^'+/, ''));
      const inputPhone = normalizePhone(params.phone);
      
      if (row[col.OrderID - 1] === params.orderId && storedPhone === inputPhone) {
        const order = mapOrderRow(row, col);
        let statusHistory = safeParse(order.StatusHistory);
        
        if (statusHistory.length === 0 && order.Status !== 'Pending') {
          statusHistory = [{ status: 'Pending', time: order.Timestamp }];
          if (order.Status !== 'Pending') {
            statusHistory.push({ status: order.Status, time: order.LastUpdated || order.Timestamp });
          }
        }
        
        const items = safeParse(order.Items);
        
        return respond(true, 'Order found', {
          order: {
            OrderID: order.OrderID,
            Status: order.Status,
            StatusHistory: statusHistory,
            CustomerName: order.CustomerName,
            Total: order.Total,
            Timestamp: order.Timestamp,
            LastUpdated: order.LastUpdated,
            itemCount: items.length
          }
        });
      }
    }
    return respond(false, 'Order not found');
  } catch (err) {
    logError('TRACK_ERROR', err.message);
    return respond(false, 'Server error');
  }
}

// ===== ORDER OPERATIONS =====
function handleCreateOrder(ss, body) {
  if (!body.OrderID || !body.CustomerName || !body.Phone) {
    return respond(false, 'Missing required fields: OrderID, CustomerName, Phone');
  }
  
  if (checkIdempotency(body.OrderID)) {
    return respond(true, 'Duplicate order ignored', { orderId: body.OrderID });
  }
  
  const isOpen = getSystemSetting('isOpen');
  if (isOpen === 'false') {
    return respond(false, 'Restaurant is currently closed');
  }
  
  const queueSheet = ss.getSheetByName(SHEET_NAMES.ORDERS_QUEUE);
  const col = getColumnMap(queueSheet);
  const now = new Date().toISOString();
  const history = JSON.stringify([{ status: 'Pending', time: now }]);
  
  const row = [
    body.OrderID || '',
    body.Timestamp || now,
    body.CustomerName || '',
    body.Phone ? "'" + body.Phone : '',
    body.Address || '',
    body.Items || '[]',
    body.Total || 0,
    body.Notes || '',
    'Pending',
    '',
    '',
    now,
    history
  ];
  
  if (col.OrderID) {
    const nextRow = queueSheet.getLastRow() + 1;
    row.forEach((val, i) => {
      const colIdx = Object.values(col)[i];
      if (colIdx) queueSheet.getRange(nextRow, colIdx).setValue(val);
    });
  } else {
    queueSheet.appendRow(row);
  }
  
  return respond(true, 'Order created', { orderId: body.OrderID });
}

function handleUpdateStatus(ss, body) {
  if (!ORDER_STATUS.includes(body.status)) {
    return respond(false, 'Invalid status');
  }
  
  const sheet = ss.getSheetByName(SHEET_NAMES.ORDERS_MAIN);
  const col = getColumnMap(sheet);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][col.OrderID - 1] === body.orderId) {
      const currentStatus = data[i][col.Status - 1];
      
      if (body.status !== currentStatus) {
        const allowedNext = STATUS_FLOW[currentStatus] || [];
        if (!allowedNext.includes(body.status)) {
          return respond(false, `Cannot change from "${currentStatus}" to "${body.status}"`);
        }
        
        const now = new Date().toISOString();
        sheet.getRange(i + 1, col.Status).setValue(body.status);
        sheet.getRange(i + 1, col.LastUpdated).setValue(now);
        
        let history = safeParse(data[i][col.StatusHistory - 1]);
        history.push({ status: body.status, time: now });
        sheet.getRange(i + 1, col.StatusHistory).setValue(JSON.stringify(history));
      }
      
      getCache().remove('orders_all');
      return respond(true, 'Status updated');
    }
  }
  
  return respond(false, 'Order not found');
}

function handleDeleteOrder(ss, body) {
  const sheet = ss.getSheetByName(SHEET_NAMES.ORDERS_MAIN);
  const col = getColumnMap(sheet);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][col.OrderID - 1] === body.orderId) {
      sheet.deleteRow(i + 1);
      getCache().remove('orders_all');
      return respond(true, 'Order deleted');
    }
  }
  return respond(false, 'Order not found');
}

function handleUpdateMenu(ss, body) {
  const sheet = ss.getSheetByName(SHEET_NAMES.MENU);
  const col = getColumnMap(sheet);
  const data = sheet.getDataRange().getValues();
  let rowIndex = -1;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][col.ID - 1] === body.ID) {
      rowIndex = i + 1;
      break;
    }
  }
  
  const version = new Date().getTime();
  const now = new Date().toISOString();
  const available = body.Available !== undefined ? body.Available : true;
  
  const rowData = [
    body.ID || '',
    body.Category || '',
    body.Name || '',
    body.Description || '',
    body.Price || 0,
    body.Image || '',
    body.Badge || '',
    body.Variants_JSON || '[]',
    version,
    now,
    available
  ];
  
  if (rowIndex !== -1) {
    rowData.forEach((val, i) => {
      const colIdx = Object.values(col)[i];
      if (colIdx) sheet.getRange(rowIndex, colIdx).setValue(val);
    });
  } else {
    sheet.appendRow(rowData);
  }
  
  getCache().remove('orders_all');
  getCache().put('menu_version', String(version), 300);
  
  return respond(true, 'Menu updated', { version });
}

function handleInitMenu(ss, body) {
  const sheet = ss.getSheetByName(SHEET_NAMES.MENU);
  const col = getColumnMap(sheet);
  
  if (sheet.getLastRow() > 1) {
    const lastRow = sheet.getLastRow();
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
  }
  
  const version = new Date().getTime();
  const now = new Date().toISOString();
  
  const newRows = body.items.map(item => [
    item.ID || '',
    item.Category || '',
    item.Name || '',
    item.Description || '',
    item.Price || 0,
    item.Image || '',
    item.Badge || '',
    item.Variants_JSON || '[]',
    version,
    now,
    true
  ]);
  
  if (newRows.length > 0) {
    sheet.getRange(2, 1, newRows.length, newRows[0].length).setValues(newRows);
  }
  
  getCache().put('menu_version', String(version), 300);
  getCache().remove('orders_all');
  
  return respond(true, 'Menu initialized', { version });
}

function handleToggleAvailability(ss, body) {
  const sheet = ss.getSheetByName(SHEET_NAMES.MENU);
  const col = getColumnMap(sheet);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][col.ID - 1] === body.ID) {
      const currentValue = data[i][col.Available - 1];
      const newValue = currentValue !== true && currentValue !== 'true';
      sheet.getRange(i + 1, col.Available).setValue(newValue);
      getCache().remove('orders_all');
      return respond(true, 'Availability toggled', { available: newValue });
    }
  }
  return respond(false, 'Item not found');
}

function handleSetSystem(ss, body) {
  if (body.key === 'isOpen') {
    setSystemSetting('isOpen', body.value ? 'true' : 'false');
    getCache().remove('orders_all');
    return respond(true, 'System updated', { isOpen: body.value });
  }
  setSystemSetting(body.key, body.value);
  return respond(true, 'System updated');
}

function handleGetAllowedStatuses(ss, body) {
  const sheet = ss.getSheetByName(SHEET_NAMES.ORDERS_MAIN);
  const col = getColumnMap(sheet);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][col.OrderID - 1] === body.orderId) {
      const currentStatus = data[i][col.Status - 1];
      const allowedNext = STATUS_FLOW[currentStatus] || [];
      return respond(true, 'Statuses fetched', {
        currentStatus,
        allowedNext,
        allStatuses: ORDER_STATUS
      });
    }
  }
  return respond(false, 'Order not found');
}

function handleAcquireLock(ss, body) {
  const sheet = ss.getSheetByName(SHEET_NAMES.ORDERS_MAIN);
  const col = getColumnMap(sheet);
  const data = sheet.getDataRange().getValues();
  const now = new Date().toISOString();
  const adminId = body.adminId || 'admin';
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][col.OrderID - 1] === body.orderId) {
      const currentLock = data[i][col.LockedBy - 1];
      const lockTime = data[i][col.LockedAt - 1] ? new Date(data[i][col.LockedAt - 1]) : null;
      
      if (currentLock && currentLock !== adminId && lockTime) {
        const lockAge = (Date.now() - lockTime.getTime()) / 1000;
        if (lockAge < 30) {
          return respond(false, 'Order is being edited by another admin', { lockedBy: currentLock });
        }
      }
      
      sheet.getRange(i + 1, col.LockedBy).setValue(adminId);
      sheet.getRange(i + 1, col.LockedAt).setValue(now);
      return respond(true, 'Lock acquired', { lockedBy: adminId });
    }
  }
  return respond(false, 'Order not found');
}

function handleReleaseLock(ss, body) {
  const sheet = ss.getSheetByName(SHEET_NAMES.ORDERS_MAIN);
  const col = getColumnMap(sheet);
  const data = sheet.getDataRange().getValues();
  const adminId = body.adminId || 'admin';
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][col.OrderID - 1] === body.orderId) {
      if (data[i][col.LockedBy - 1] === adminId) {
        sheet.getRange(i + 1, col.LockedBy).setValue('');
        sheet.getRange(i + 1, col.LockedAt).setValue('');
        return respond(true, 'Lock released');
      }
      return respond(false, 'Cannot release lock owned by another admin');
    }
  }
  return respond(false, 'Order not found');
}

// ===== ROUTING =====
function routeRequest(ss, body) {
  const action = body.action;
  
  switch (action) {
    case 'updateStatus':
      return handleUpdateStatus(ss, body);
    case 'deleteOrder':
      return handleDeleteOrder(ss, body);
    case 'updateMenu':
      return handleUpdateMenu(ss, body);
    case 'initMenu':
      return handleInitMenu(ss, body);
    case 'toggleAvailability':
      return handleToggleAvailability(ss, body);
    case 'setSystem':
      return handleSetSystem(ss, body);
    case 'getAllowedStatuses':
      return handleGetAllowedStatuses(ss, body);
    case 'acquireLock':
      return handleAcquireLock(ss, body);
    case 'releaseLock':
      return handleReleaseLock(ss, body);
    default:
      return handleCreateOrder(ss, body);
  }
}

// ===== ENTRY POINTS =====
function doGet(e) {
  try {
    ensureSheetsExist();
    const params = e.parameter || {};
    
    if (params.orderId && params.phone) {
      return handleTrackOrder(params);
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const cache = getCache();
    
    const isOpenSetting = getSystemSetting('isOpen');
    const restaurantName = getSystemSetting('restaurantName') || 'Jirgah';
    const isOpen = isOpenSetting !== 'true';
    
    const ordersSheet = ss.getSheetByName(SHEET_NAMES.ORDERS_MAIN);
    const menuSheet = ss.getSheetByName(SHEET_NAMES.MENU);
    
    const ordersData = ordersSheet.getDataRange().getValues();
    const menuData = menuSheet.getDataRange().getValues();
    
    const orders = mapRows(ordersData, 'order');
    const menu = mapRows(menuData, 'menu');
    
    let menuVersion = cache.get('menu_version') || '0';
    const menuItem = menuData.length > 1 ? menuData[1] : null;
    if (menuItem) {
      const col = getColumnMap(menuSheet);
      if (menuItem[col.Version - 1]) {
        menuVersion = String(menuItem[col.Version - 1]);
      }
    }
    
    return respond(true, 'Data fetched', {
      orders,
      menu,
      menuVersion,
      lastUpdated: new Date().toISOString(),
      system: { isOpen, restaurantName }
    });
    
  } catch (err) {
    logError('GET_ERROR', err.message);
    return respond(false, 'Server error');
  }
}

function doPost(e) {
  try {
    ensureSheetsExist();
    
    const rawData = e.postData ? e.postData.contents : '{}';
    const body = safeParse(rawData);
    
    if (!body.apiKey || body.apiKey !== API_KEY) {
      return respond(false, 'Unauthorized');
    }
    
    if (!body.action && !body.OrderID) {
      return respond(false, 'Invalid request');
    }
    
    const ip = body.ip || 'unknown';
    const rateCheck = checkRateLimit(ip);
    if (!rateCheck.allowed) {
      logError('RATE_LIMIT', ip + ' exceeded');
      return respond(false, 'Too many requests. Please wait.');
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    return routeRequest(ss, body);
    
  } catch (err) {
    logError('POST_ERROR', err.message);
    return respond(false, 'Server error');
  }
}

// ===== TRIGGER FUNCTIONS =====
function processOrderQueue() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const queue = ss.getSheetByName(SHEET_NAMES.ORDERS_QUEUE);
    const main = ss.getSheetByName(SHEET_NAMES.ORDERS_MAIN);
    const mainCol = getColumnMap(main);
    
    const data = queue.getDataRange().getValues();
    if (data.length <= 1) return;
    
    const rows = data.slice(1);
    let processed = 0;
    
    rows.forEach(row => {
      if (row[mainCol.OrderID - 1]) {
        main.appendRow(row);
        processed++;
      }
    });
    
    if (processed > 0) {
      queue.deleteRows(2, processed);
      logError('QUEUE_PROCESSED', processed + ' orders');
    }
    
    getCache().remove('orders_all');
  } catch (err) {
    logError('QUEUE_ERROR', err.message);
  }
}

function archiveOldOrders() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const main = ss.getSheetByName(SHEET_NAMES.ORDERS_MAIN);
    const archive = ss.getSheetByName(SHEET_NAMES.ORDERS_ARCHIVE);
    
    const data = main.getDataRange().getValues();
    if (data.length <= CONFIG.ARCHIVE_THRESHOLD) return;
    
    const rows = data.slice(1, CONFIG.ARCHIVE_BATCH_SIZE + 1);
    
    rows.forEach(row => {
      if (row[0]) archive.appendRow(row);
    });
    
    main.deleteRows(2, rows.length);
    logError('ARCHIVED', rows.length + ' orders');
    getCache().remove('orders_all');
  } catch (err) {
    logError('ARCHIVE_ERROR', err.message);
  }
}

function cleanupOldLocks() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAMES.ORDERS_MAIN);
    const col = getColumnMap(sheet);
    const data = sheet.getDataRange().getValues();
    const now = Date.now();
    const lockTimeout = 30 * 1000;
    let cleaned = 0;
    
    for (let i = data.length - 1; i >= 1; i--) {
      const lockTime = data[i][col.LockedAt - 1] ? new Date(data[i][col.LockedAt - 1]).getTime() : 0;
      if (lockTime && (now - lockTime) > lockTimeout) {
        sheet.getRange(i + 1, col.LockedBy).setValue('');
        sheet.getRange(i + 1, col.LockedAt).setValue('');
        cleaned++;
      }
    }
    
    if (cleaned > 0) logError('CLEANED_LOCKS', cleaned);
  } catch (err) {
    logError('CLEANUP_ERROR', err.message);
  }
}