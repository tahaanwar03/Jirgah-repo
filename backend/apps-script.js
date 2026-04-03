// backend/apps-script.js — Jirgah Google Apps Script Backend
// Per implementation_plan.md.resolved §2.2

const API_KEY = "JIRGAH_SECURE_2026"; // Must match frontend config

function orderExists(sheet, orderId) {
  if (!orderId) return false;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  const data = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
  return data.includes(orderId);
}

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Ensure "Orders" and "Menu" sheets exist
  if (!ss.getSheetByName('Orders')) {
    const ordersSheet = ss.insertSheet('Orders');
    ordersSheet.appendRow(['OrderID', 'Timestamp', 'CustomerName', 'Phone', 'Address', 'Items', 'Total', 'Notes', 'Status']);
  }
  if (!ss.getSheetByName('Menu')) {
    const menuSheet = ss.insertSheet('Menu');
    menuSheet.appendRow(['ID', 'Category', 'Name', 'Description', 'Price', 'Image', 'Badge', 'Variants_JSON']);
  }

  try {
    const ordersSheet = ss.getSheetByName('Orders');
    const menuSheet = ss.getSheetByName('Menu');

    const ordersData = ordersSheet.getDataRange().getValues();
    const menuData = menuSheet.getDataRange().getValues();

    const ordersArr = ordersData.length > 1 ? mapRows(ordersData) : [];
    const menuArr = menuData.length > 1 ? mapRows(menuData) : [];

    return createJsonResponse({ 
      status: 'success', 
      orders: ordersArr, 
      menu: menuArr 
    });
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

function mapRows(dataRows) {
  const headers = dataRows[0];
  
  // Normalize header names so spaces in the sheet don't break frontend mappings
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

function createJsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  try {
    const rawData = e.postData ? e.postData.contents : '{}';
    const body = JSON.parse(rawData);

    // ACTION: SECURE API KEY
    if (body.apiKey !== API_KEY) {
      return createJsonResponse({ status: 'error', message: 'Invalid API Key' });
    }

    // ACTION: UPDATE ORDER STATUS
    if (body.action === 'updateStatus') {
      const sheet = ss.getSheetByName('Orders');
      const data = sheet.getDataRange().getValues();
      let updated = false;
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === body.orderId) {
          sheet.getRange(i + 1, 9).setValue(body.status); // 9th column = "Status"
          updated = true;
          break;
        }
      }
      return createJsonResponse({ status: updated ? 'success' : 'error' });
    }

    // ACTION: DELETE ORDER
    if (body.action === 'deleteOrder') {
      const sheet = ss.getSheetByName('Orders');
      const data = sheet.getDataRange().getValues();
      let deleted = false;
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === body.orderId) {
          sheet.deleteRow(i + 1);
          deleted = true;
          break;
        }
      }
      return createJsonResponse({ status: deleted ? 'success' : 'error' });
    }

    // ACTION: UPDATE MENU ITEM
    if (body.action === 'updateMenu') {
      const sheet = ss.getSheetByName('Menu');
      const data = sheet.getDataRange().getValues();
      let rowIndex = -1;
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === body.ID) { // Column 1 = ID
          rowIndex = i + 1;
          break;
        }
      }

      const rowValues = [
        body.ID || '', 
        body.Category || '', 
        body.Name || '', 
        body.Description || '', 
        body.Price || 0, 
        body.Image || '', 
        body.Badge || '', 
        body.Variants_JSON || '[]'
      ];

      if (rowIndex !== -1) {
        sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
      } else {
        sheet.appendRow(rowValues);
      }
      return createJsonResponse({ status: 'success' });
    }

    // ACTION: BATCH INIT MENU
    if (body.action === 'initMenu' && Array.isArray(body.items)) {
      const sheet = ss.getSheetByName('Menu');
      // Clear existing menu data except headers
      if (sheet.getLastRow() > 1) {
        sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
      }
      const newRows = body.items.map(item => [
        item.ID || '', 
        item.Category || '', 
        item.Name || '', 
        item.Description || '', 
        item.Price || 0, 
        item.Image || '', 
        item.Badge || '', 
        item.Variants_JSON || '[]'
      ]);
      if (newRows.length > 0) {
        sheet.getRange(2, 1, newRows.length, newRows[0].length).setValues(newRows);
      }
      return createJsonResponse({ status: 'success' });
    }

    // ACTION: CREATE ORDER (DEFAULT)
    const lastOrderTime = CacheService.getScriptCache().get('lastOrderTime');
    if (lastOrderTime && Date.now() - Number(lastOrderTime) < 2000) {
      return createJsonResponse({ status: 'error', message: 'Too many requests' });
    }
    CacheService.getScriptCache().put('lastOrderTime', Date.now().toString(), 5);

    const ordersSheet = ss.getSheetByName('Orders');
    
    if (orderExists(ordersSheet, body.OrderID)) {
      return createJsonResponse({ status: 'success', message: 'Duplicate order ignored', orderId: body.OrderID });
    }

    ordersSheet.appendRow([
      body.OrderID || '', 
      body.Timestamp || '', 
      body.CustomerName || '',
      body.Phone ? "'" + body.Phone : '', 
      body.Address || '',  
      body.Items || '[]',
      body.Total || 0, 
      body.Notes || '', 
      body.Status || 'Pending'
    ]);

    return createJsonResponse({ status: 'success', orderId: body.OrderID });
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}
