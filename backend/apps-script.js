// backend/apps-script.js — Jirgah Google Apps Script Backend
// Phase 9: Order Lifecycle, Tracking, Operational Controls

// ===== CONFIG =====
const BACKEND_CONFIG = {
  API_KEY: "JIRGAH_SECURE_2026"
};

const API_KEY = BACKEND_CONFIG.API_KEY;

const SHEET_NAMES = {
  ORDERS_MAIN: 'Orders',
  ORDERS_QUEUE: 'Orders_Queue',
  ORDERS_ARCHIVE: 'Orders_Archive',
  MENU: 'Menu',
  LOGS: 'Logs',
  SYSTEM: 'SystemSettings'
};

const ORDER_STATUS = [
  'Pending',
  'Accepted',
  'Preparing',
  'Out for Delivery',
  'Delivered',
  'Cancelled'
];

const STATUS_FLOW = {
  'Pending': ['Accepted', 'Cancelled'],
  'Accepted': ['Preparing', 'Cancelled'],
  'Preparing': ['Out for Delivery', 'Cancelled'],
  'Out for Delivery': ['Delivered'],
  'Delivered': [],
  'Cancelled': []
};

const COLUMNS = {
  ORDER: ['OrderID', 'Timestamp', 'CustomerName', 'Phone', 'Address', 'Items', 'Total', 'Notes', 'Status', 'LockedBy', 'LockedAt', 'LastUpdated', 'StatusHistory'],
  MENU: ['ID', 'Category', 'Name', 'Description', 'Price', 'Image', 'Badge', 'Variants_JSON', 'Version', 'LastUpdated', 'Available'],
  SYSTEM: ['Key', 'Value']
};

const COL_INDEX = {
  ORDER_ID: 1,
  TIMESTAMP: 2,
  CUSTOMER_NAME: 3,
  PHONE: 4,
  ADDRESS: 5,
  ITEMS: 6,
  TOTAL: 7,
  NOTES: 8,
  STATUS: 9,
  LOCKED_BY: 10,
  LOCKED_AT: 11,
  LAST_UPDATED: 12,
  STATUS_HISTORY: 13
};

const ARCHIVE_THRESHOLD = 3000;
const ARCHIVE_BATCH_SIZE = 1000;
const CACHE_TTL = 30;
const RATE_LIMIT_WINDOW = 10;
const RATE_LIMIT_MAX = 5;

function ensureSheetsExist() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (!ss.getSheetByName(SHEET_NAMES.ORDERS_MAIN)) {
    const sheet = ss.insertSheet(SHEET_NAMES.ORDERS_MAIN);
    sheet.appendRow(COLUMNS.ORDER);
    sheet.getRange('A:A').setNumberFormat('@');
    sheet.getRange('B:B').setNumberFormat('yyyy-mm-dd HH:mm:ss');
    sheet.getRange('D:D').setNumberFormat('@');
    sheet.getRange('G:G').setNumberFormat('#,##0.00');
  } else {
    const sheet = ss.getSheetByName(SHEET_NAMES.ORDERS_MAIN);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (headers.length < COLUMNS.ORDER.length) {
      const missingCols = COLUMNS.ORDER.filter((col, idx) => !headers.includes(col));
      missingCols.forEach((col, i) => {
        sheet.getRange(1, headers.length + i + 1).setValue(col);
      });
    }
  }
  
  if (!ss.getSheetByName(SHEET_NAMES.ORDERS_QUEUE)) {
    const sheet = ss.insertSheet(SHEET_NAMES.ORDERS_QUEUE);
    sheet.appendRow(COLUMNS.ORDER);
    sheet.getRange('A:A').setNumberFormat('@');
    sheet.getRange('B:B').setNumberFormat('yyyy-mm-dd HH:mm:ss');
    sheet.getRange('D:D').setNumberFormat('@');
    sheet.getRange('G:G').setNumberFormat('#,##0.00');
  }
  
  if (!ss.getSheetByName(SHEET_NAMES.ORDERS_ARCHIVE)) {
    const sheet = ss.insertSheet(SHEET_NAMES.ORDERS_ARCHIVE);
    sheet.appendRow(COLUMNS.ORDER);
    sheet.getRange('A:A').setNumberFormat('@');
    sheet.getRange('B:B').setNumberFormat('yyyy-mm-dd HH:mm:ss');
    sheet.getRange('D:D').setNumberFormat('@');
    sheet.getRange('G:G').setNumberFormat('#,##0.00');
  }
  
  if (!ss.getSheetByName(SHEET_NAMES.MENU)) {
    const sheet = ss.insertSheet(SHEET_NAMES.MENU);
    sheet.appendRow(COLUMNS.MENU);
    sheet.getRange('E:E').setNumberFormat('#,##0.00');
  } else {
    const sheet = ss.getSheetByName(SHEET_NAMES.MENU);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (!headers.includes('Available')) {
      sheet.getRange(1, headers.length + 1).setValue('Available');
    }
  }
  
  if (!ss.getSheetByName(SHEET_NAMES.LOGS)) {
    const sheet = ss.insertSheet(SHEET_NAMES.LOGS);
    sheet.appendRow(['Timestamp', 'Type', 'Message', 'Payload']);
    sheet.getRange('A:A').setNumberFormat('yyyy-mm-dd HH:mm:ss');
  }
  
  if (!ss.getSheetByName(SHEET_NAMES.SYSTEM)) {
    const sheet = ss.insertSheet(SHEET_NAMES.SYSTEM);
    sheet.appendRow(COLUMNS.SYSTEM);
    sheet.appendRow(['isOpen', 'true']);
    sheet.appendRow(['restaurantName', 'Jirgah']);
  }
}

function getSystemSetting(key) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAMES.SYSTEM);
    if (!sheet) return null;
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === key) {
        return data[i][1];
      }
    }
    return null;
  } catch (e) {
    return null;
  }
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
    logError('setSystemSetting failed', { key, value, error: e.toString() }, 'ERROR');
  }
}

function logError(message, payload, type = 'ERROR') {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let logSheet = ss.getSheetByName(SHEET_NAMES.LOGS);
    if (!logSheet) {
      logSheet = ss.insertSheet(SHEET_NAMES.LOGS);
      logSheet.appendRow(['Timestamp', 'Type', 'Message', 'Payload']);
    }
    logSheet.appendRow([
      new Date().toISOString(),
      type,
      message,
      JSON.stringify(payload || {}).substring(0, 500)
    ]);
  } catch (e) {
    console.error('Logging failed:', e);
  }
}

function getCache() {
  return CacheService.getScriptCache();
}

function normalizePhone(phone) {
  if (!phone) return '';
  let digits = String(phone).replace(/[^0-9]/g, '');
  
  if (digits.startsWith('92')) {
    digits = '0' + digits.slice(2);
  }
  
  if (digits.length > 11) {
    digits = digits.slice(-11);
  }
  
  return digits;
}

function checkRateLimit(ip) {
  const cache = getCache();
  const key = 'rate_' + (ip || 'unknown');
  const count = Number(cache.get(key)) || 0;
  
  if (count > RATE_LIMIT_MAX) {
    return { allowed: false, count };
  }
  
  cache.put(key, String(count + 1), RATE_LIMIT_WINDOW);
  return { allowed: true, count: count + 1 };
}

function checkIdempotency(orderId) {
  const cache = getCache();
  const key = 'idemp_' + orderId;
  const existing = cache.get(key);
  
  if (existing) {
    return true;
  }
  
  cache.put(key, '1', 300);
  return false;
}

function mapRows(dataRows) {
  const headers = dataRows[0];
  const normalizeMap = {
    'Order ID': 'OrderID',
    'Customer Name': 'CustomerName',
    'Order JSON': 'Items',
    'StatusHistory': 'StatusHistory'
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

function mapRowToOrder(row) {
  return {
    OrderID: row[0] || '',
    Timestamp: row[1] || '',
    CustomerName: row[2] || '',
    Phone: String(row[3] || '').replace(/^'+/, ''),
    Address: row[4] || '',
    Items: row[5] || '[]',
    Total: row[6] || 0,
    Notes: row[7] || '',
    Status: row[8] || 'Pending',
    LockedBy: row[9] || '',
    LockedAt: row[10] || '',
    LastUpdated: row[11] || '',
    StatusHistory: row[12] || '[]'
  };
}

function createJsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  ensureSheetsExist();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const params = e.parameter || {};
  
  try {
    if (params.orderId && params.phone) {
      return handleTrackOrder(params);
    }

    const cache = getCache();
    const lastUpdated = params.lastUpdated;
    let cacheKey = 'orders_all';
    
    const isOpenSetting = getSystemSetting('isOpen');
    const restaurantName = getSystemSetting('restaurantName') || 'Jirgah';
    const isOpen = isOpenSetting === null ? false : isOpenSetting !== 'false';
    
    if (lastUpdated) {
      cacheKey = 'orders_since_' + lastUpdated;
      const cached = cache.get(cacheKey);
      if (cached) {
        const response = JSON.parse(cached);
        response.system = { isOpen, restaurantName };
        return createJsonResponse(response);
      }
    } else {
      const cached = cache.get('orders_all');
      if (cached) {
        const response = JSON.parse(cached);
        response.system = { isOpen, restaurantName };
        return createJsonResponse(response);
      }
    }

    const ordersSheet = ss.getSheetByName(SHEET_NAMES.ORDERS_MAIN);
    const menuSheet = ss.getSheetByName(SHEET_NAMES.MENU);

    let ordersData = ordersSheet.getDataRange().getValues();
    if (lastUpdated) {
      const filterDate = new Date(lastUpdated);
      ordersData = [ordersData[0]].concat(
        ordersData.slice(1).filter(row => {
          const lastUpd = row[COL_INDEX.LAST_UPDATED - 1];
          return lastUpd && new Date(lastUpd) > filterDate;
        })
      );
    }

    const menuData = menuSheet.getDataRange().getValues();
    const ordersArr = ordersData.length > 1 ? mapRows(ordersData) : [];
    const menuArr = menuData.length > 1 ? mapRows(menuData) : [];

    let menuVersion = cache.get('menu_version') || '0';
    const menuItem = menuData.length > 1 ? menuData[1] : null;
    if (menuItem && menuItem[8]) {
      menuVersion = String(menuItem[8]);
    }

    const response = {
      status: 'success',
      orders: ordersArr,
      menu: menuArr,
      menuVersion: menuVersion,
      lastUpdated: new Date().toISOString(),
      system: { isOpen, restaurantName }
    };

    const cacheTtl = lastUpdated ? 10 : CACHE_TTL;
    cache.put(cacheKey, JSON.stringify(response), cacheTtl);

    return createJsonResponse(response);
  } catch (err) {
    logError('doGet failed', { error: err.toString(), params: e.parameter }, 'ERROR');
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

function handleTrackOrder(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAMES.ORDERS_MAIN);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const storedPhone = normalizePhone(String(row[3] || '').replace(/^'+/, ''));
      const inputPhone = normalizePhone(params.phone);
      
      if (row[0] === params.orderId && storedPhone === inputPhone) {
        const order = mapRowToOrder(row);
        let statusHistory = [];
        try {
          statusHistory = JSON.parse(order.StatusHistory || '[]');
        } catch (e) {
          statusHistory = [];
        }
        
        let itemCount = 0;
        try {
          const items = JSON.parse(order.Items || '[]');
          itemCount = Array.isArray(items) ? items.length : 0;
        } catch (e) {
          itemCount = 0;
        }
        
        if (statusHistory.length === 0 && order.Status !== 'Pending') {
          statusHistory = [{ status: 'Pending', time: order.Timestamp }];
          if (order.Status !== 'Pending') {
            statusHistory.push({ status: order.Status, time: order.LastUpdated || order.Timestamp });
          }
        }
        
        return createJsonResponse({
          status: 'success',
          order: {
            OrderID: order.OrderID,
            Status: order.Status,
            StatusHistory: statusHistory,
            CustomerName: order.CustomerName,
            Total: order.Total,
            Timestamp: order.Timestamp,
            itemCount: itemCount
          }
        });
      }
    }

    return createJsonResponse({ status: 'not_found', message: 'Order not found' });
  } catch (err) {
    logError('handleTrackOrder failed', { error: err.toString() }, 'ERROR');
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

function doPost(e) {
  ensureSheetsExist();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  try {
    const rawData = e.postData ? e.postData.contents : '{}';
    const body = JSON.parse(rawData);

    if (body.apiKey !== API_KEY) {
      return createJsonResponse({ status: 'error', message: 'Invalid API Key' });
    }

    const ip = body.ip || 'unknown';
    const rateCheck = checkRateLimit(ip);
    if (!rateCheck.allowed) {
      logError('Rate limit exceeded', { ip, count: rateCheck.count }, 'WARNING');
      return createJsonResponse({ 
        status: 'error', 
        message: 'Too many requests. Please wait before trying again.' 
      });
    }

    if (body.action === 'updateStatus') {
      return handleUpdateStatus(ss, body);
    }

    if (body.action === 'deleteOrder') {
      return handleDeleteOrder(ss, body);
    }

    if (body.action === 'updateMenu') {
      return handleUpdateMenu(ss, body);
    }

    if (body.action === 'initMenu' && Array.isArray(body.items)) {
      return handleInitMenu(ss, body);
    }

    if (body.action === 'acquireLock') {
      return handleAcquireLock(ss, body);
    }

    if (body.action === 'releaseLock') {
      return handleReleaseLock(ss, body);
    }
    
    if (body.action === 'setSystem') {
      return handleSetSystem(ss, body);
    }
    
    if (body.action === 'toggleAvailability') {
      return handleToggleAvailability(ss, body);
    }

    if (body.action === 'getAllowedStatuses') {
      return handleGetAllowedStatuses(ss, body);
    }

    return handleCreateOrder(ss, body);
    
  } catch (err) {
    logError('doPost failed', { error: err.toString() }, 'ERROR');
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

function handleCreateOrder(ss, body) {
  if (!body.OrderID) {
    return createJsonResponse({ status: 'error', message: 'OrderID is required' });
  }
  
  const isOpen = getSystemSetting('isOpen');
  if (isOpen === 'false') {
    return createJsonResponse({ 
      status: 'error', 
      message: 'Restaurant is currently closed. Orders are not being accepted.' 
    });
  }

  if (checkIdempotency(body.OrderID)) {
    return createJsonResponse({ 
      status: 'success', 
      message: 'Duplicate order ignored', 
      orderId: body.OrderID 
    });
  }

  const queueSheet = ss.getSheetByName(SHEET_NAMES.ORDERS_QUEUE);
  const now = new Date().toISOString();
  const initialHistory = JSON.stringify([{ status: 'Pending', time: now }]);

  queueSheet.appendRow([
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
    initialHistory
  ]);

  return createJsonResponse({ status: 'success', orderId: body.OrderID });
}

function handleUpdateStatus(ss, body) {
  if (!ORDER_STATUS.includes(body.status)) {
    return createJsonResponse({ 
      status: 'error', 
      message: 'Invalid status. Allowed: ' + ORDER_STATUS.join(', ') 
    });
  }

  const sheet = ss.getSheetByName(SHEET_NAMES.ORDERS_MAIN);
  const data = sheet.getDataRange().getValues();
  let updated = false;

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === body.orderId) {
      const currentStatus = data[i][COL_INDEX.STATUS - 1];
      
      if (body.status !== currentStatus && !ORDER_STATUS.includes(body.status)) {
        return createJsonResponse({ 
          status: 'error', 
          message: 'Invalid status.' 
        });
      }
      
      if (body.status !== currentStatus) {
        const allowedNext = STATUS_FLOW[currentStatus] || [];
        
        if (!allowedNext.includes(body.status)) {
          return createJsonResponse({ 
            status: 'error', 
            message: `Cannot change from "${currentStatus}" to "${body.status}". Allowed: ${allowedNext.join(', ') || 'none'}`
          });
        }
      }
      
      const now = new Date().toISOString();
      sheet.getRange(i + 1, COL_INDEX.STATUS).setValue(body.status);
      sheet.getRange(i + 1, COL_INDEX.LAST_UPDATED).setValue(now);
      
      let history = [];
      try {
        history = JSON.parse(data[i][COL_INDEX.STATUS_HISTORY - 1] || '[]');
      } catch (e) {
        history = [];
      }
      history.push({ status: body.status, time: now });
      sheet.getRange(i + 1, COL_INDEX.STATUS_HISTORY).setValue(JSON.stringify(history));
      
      updated = true;
      break;
    }
  }

  getCache().remove('orders_all');

  return createJsonResponse({ status: updated ? 'success' : 'error' });
}

function handleGetAllowedStatuses(ss, body) {
  const sheet = ss.getSheetByName(SHEET_NAMES.ORDERS_MAIN);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === body.orderId) {
      const currentStatus = data[i][8];
      const allowedNext = STATUS_FLOW[currentStatus] || [];
      return createJsonResponse({ 
        status: 'success', 
        currentStatus: currentStatus,
        allowedNext: allowedNext,
        allStatuses: ORDER_STATUS
      });
    }
  }

  return createJsonResponse({ status: 'error', message: 'Order not found' });
}

function handleDeleteOrder(ss, body) {
  const sheet = ss.getSheetByName(SHEET_NAMES.ORDERS_MAIN);
  const data = sheet.getDataRange().getValues();
  let deleted = false;

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === body.orderId) {
      sheet.deleteRow(i + 1);
      deleted = true;
      break;
    }
  }

  getCache().remove('orders_all');

  return createJsonResponse({ status: deleted ? 'success' : 'error' });
}

function handleUpdateMenu(ss, body) {
  const sheet = ss.getSheetByName(SHEET_NAMES.MENU);
  const data = sheet.getDataRange().getValues();
  let rowIndex = -1;

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === body.ID) {
      rowIndex = i + 1;
      break;
    }
  }

  const version = new Date().getTime();
  const now = new Date().toISOString();
  const available = body.Available !== undefined ? body.Available : true;
  const rowValues = [
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
    sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }

  getCache().remove('orders_all');
  getCache().put('menu_version', String(version), 300);

  return createJsonResponse({ status: 'success', version: version });
}

function handleInitMenu(ss, body) {
  const sheet = ss.getSheetByName(SHEET_NAMES.MENU);
  
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
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

  return createJsonResponse({ status: 'success', version: version });
}

function handleToggleAvailability(ss, body) {
  const sheet = ss.getSheetByName(SHEET_NAMES.MENU);
  const data = sheet.getDataRange().getValues();
  let updated = false;
  let newValue = true;

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === body.ID) {
      const currentValue = data[i][10];
      newValue = currentValue !== true && currentValue !== 'true';
      sheet.getRange(i + 1, 11).setValue(newValue);
      updated = true;
      break;
    }
  }

  getCache().remove('orders_all');

  return createJsonResponse({ status: updated ? 'success' : 'error', available: newValue });
}

function handleSetSystem(ss, body) {
  if (body.key === 'isOpen') {
    setSystemSetting('isOpen', body.value ? 'true' : 'false');
    getCache().remove('orders_all');
    return createJsonResponse({ 
      status: 'success', 
      isOpen: body.value 
    });
  }
  
  setSystemSetting(body.key, body.value);
  return createJsonResponse({ status: 'success' });
}

function handleAcquireLock(ss, body) {
  const sheet = ss.getSheetByName(SHEET_NAMES.ORDERS_MAIN);
  const data = sheet.getDataRange().getValues();
  const now = new Date().toISOString();
  const adminId = body.adminId || 'admin';

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === body.orderId) {
      const currentLock = data[i][COL_INDEX.LOCKED_BY - 1];
      const lockTime = data[i][COL_INDEX.LOCKED_AT - 1] ? new Date(data[i][COL_INDEX.LOCKED_AT - 1]) : null;
      
      if (currentLock && currentLock !== adminId && lockTime) {
        const lockAge = (Date.now() - lockTime.getTime()) / 1000;
        if (lockAge < 30) {
          return createJsonResponse({ 
            status: 'locked', 
            lockedBy: currentLock,
            message: 'Order is being edited by another admin' 
          });
        }
      }

      sheet.getRange(i + 1, COL_INDEX.LOCKED_BY).setValue(adminId);
      sheet.getRange(i + 1, COL_INDEX.LOCKED_AT).setValue(now);
      return createJsonResponse({ status: 'success', lockedBy: adminId });
    }
  }

  return createJsonResponse({ status: 'error', message: 'Order not found' });
}

function handleReleaseLock(ss, body) {
  const sheet = ss.getSheetByName(SHEET_NAMES.ORDERS_MAIN);
  const data = sheet.getDataRange().getValues();
  const adminId = body.adminId || 'admin';

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === body.orderId) {
      if (data[i][COL_INDEX.LOCKED_BY - 1] === adminId) {
        sheet.getRange(i + 1, COL_INDEX.LOCKED_BY).setValue('');
        sheet.getRange(i + 1, COL_INDEX.LOCKED_AT).setValue('');
        return createJsonResponse({ status: 'success' });
      }
      return createJsonResponse({ 
        status: 'error', 
        message: 'Cannot release lock owned by another admin' 
      });
    }
  }

  return createJsonResponse({ status: 'error', message: 'Order not found' });
}

function processOrderQueue() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const queue = ss.getSheetByName(SHEET_NAMES.ORDERS_QUEUE);
    const main = ss.getSheetByName(SHEET_NAMES.ORDERS_MAIN);

    const data = queue.getDataRange().getValues();
    if (data.length <= 1) return;

    const rowsToProcess = data.slice(1);
    const processed = [];

    rowsToProcess.forEach(row => {
      if (row[0]) {
        main.appendRow(row);
        processed.push(row[0]);
      }
    });

    if (processed.length > 0) {
      queue.deleteRows(2, processed.length);
      logError('Queue processed', { count: processed.length }, 'INFO');
    }

    getCache().remove('orders_all');

  } catch (err) {
    logError('processOrderQueue failed', { error: err.toString() }, 'ERROR');
  }
}

function archiveOldOrders() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const main = ss.getSheetByName(SHEET_NAMES.ORDERS_MAIN);
    const archive = ss.getSheetByName(SHEET_NAMES.ORDERS_ARCHIVE);

    const data = main.getDataRange().getValues();
    if (data.length <= ARCHIVE_THRESHOLD) return;

    const rowsToMove = data.slice(1, ARCHIVE_BATCH_SIZE + 1);
    
    rowsToMove.forEach(row => {
      if (row[0]) {
        archive.appendRow(row);
      }
    });

    main.deleteRows(2, rowsToMove.length);
    logError('Orders archived', { count: rowsToMove.length }, 'INFO');
    getCache().remove('orders_all');

  } catch (err) {
    logError('archiveOldOrders failed', { error: err.toString() }, 'ERROR');
  }
}

function cleanupOldLocks() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAMES.ORDERS_MAIN);
    const data = sheet.getDataRange().getValues();
    const now = Date.now();
    const lockTimeout = 30 * 1000;
    let cleaned = 0;

    for (let i = data.length - 1; i >= 1; i--) {
      const lockTime = data[i][COL_INDEX.LOCKED_AT - 1] ? new Date(data[i][COL_INDEX.LOCKED_AT - 1]).getTime() : 0;
      if (lockTime && (now - lockTime) > lockTimeout) {
        sheet.getRange(i + 1, COL_INDEX.LOCKED_BY).setValue('');
        sheet.getRange(i + 1, COL_INDEX.LOCKED_AT).setValue('');
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logError('Stale locks cleaned', { count: cleaned }, 'INFO');
    }

  } catch (err) {
    logError('cleanupOldLocks failed', { error: err.toString() }, 'ERROR');
  }
}
