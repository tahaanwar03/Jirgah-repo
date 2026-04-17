// admin/app.js — Jirgah Admin Panel Application Logic
// Phase 9: Order Lifecycle, Tracking, Operational Controls

'use strict';

// ===================== CONFIG =====================
const CONFIG = window.JIRGAH_CONFIG || {
  GAS_URL: '',
  API_KEY: '',
  REFRESH_INTERVAL_MS: 30000,
  ADMIN_PASSWORD: 'admin'
};

if (!CONFIG.GAS_URL || !CONFIG.API_KEY) {
  console.error('Missing configuration. Please check config/config.js');
}

const ORDER_STATUS = {
  ALL: ['Pending', 'Accepted', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'],
  ACTIVE: ['Pending', 'Accepted', 'Preparing', 'Out for Delivery'],
  FLOW: {
    'Pending': ['Accepted', 'Cancelled'],
    'Accepted': ['Preparing', 'Cancelled'],
    'Preparing': ['Out for Delivery', 'Cancelled'],
    'Out for Delivery': ['Delivered'],
    'Delivered': [],
    'Cancelled': []
  }
};

// ===================== STATE =====================
const AdminState = {
  orders: [],
  menu: [],
  filtered: [],
  searchQuery: '',
  activeFilter: 'Active',
  menuSearchQuery: '',
  menuActiveFilter: 'All',
  sortKey: 'newest',
  refreshInterval: null,
  lastFetchTime: null,
  lastUpdated: null,
  knownOrderIds: new Set(),
  freshOrderIds: new Set(),
  expandedOrderId: null,
  charts: { bar: null, doughnut: null },
  currentPage: 1,
  itemsPerPage: 10,
  adminId: 'admin_' + Math.random().toString(36).substr(2, 6),
  lockedOrders: new Map(),
  isOpen: true,
  allowedStatuses: {},
};

// ===================== INIT & AUTH =====================
document.addEventListener('DOMContentLoaded', async () => {
  bindEvents();
  
  if (sessionStorage.getItem('jirgah_admin_auth') === 'true') {
    unlockDashboard();
  } else {
    document.getElementById('login-overlay').style.display = 'flex';
  }
});

async function unlockDashboard() {
  document.getElementById('login-overlay').style.opacity = '0';
  setTimeout(() => document.getElementById('login-overlay').style.display = 'none', 300);
  
  await fetchAndRender();
  checkAndInitializeMenu();
  startAutoRefresh();
}

// ===================== EVENT BINDING =====================
function bindEvents() {
  document.getElementById('login-form').addEventListener('submit', e => {
    e.preventDefault();
    const pw = document.getElementById('admin-password').value;
    if (pw === CONFIG.ADMIN_PASSWORD) {
      sessionStorage.setItem('jirgah_admin_auth', 'true');
      unlockDashboard();
    } else {
      document.getElementById('login-error').classList.remove('hidden');
    }
  });

  document.getElementById('sidebar-nav').addEventListener('click', e => {
    const link = e.target.closest('.nav-link');
    if (!link) return;
    e.preventDefault();
    navigateTo(link.dataset.view);
  });

  document.getElementById('bottom-nav').addEventListener('click', e => {
    const btn = e.target.closest('.bottom-nav-btn');
    if (!btn) return;
    navigateTo(btn.dataset.view);
  });

  document.getElementById('refresh-btn').addEventListener('click', () => {
    fetchAndRender();
    showToast('Data refreshed', 'info');
  });

  let searchTimer;
  const searchEl = document.getElementById('orders-search');
  if (searchEl) {
    searchEl.addEventListener('input', e => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        AdminState.searchQuery = e.target.value.toLowerCase();
        AdminState.currentPage = 1;
        applyFiltersAndRender();
      }, 300);
    });
  }

  document.getElementById('filter-tabs').addEventListener('click', e => {
    const btn = e.target.closest('.filter-tab');
    if (!btn) return;
    AdminState.activeFilter = btn.dataset.filter;
    AdminState.currentPage = 1;
    renderFilterTabs();
    applyFiltersAndRender();
  });

  document.getElementById('sort-select').addEventListener('change', e => {
    AdminState.sortKey = e.target.value;
    AdminState.currentPage = 1;
    applyFiltersAndRender();
  });

  document.getElementById('orders-tbody').addEventListener('click', e => {
    const expandBtn = e.target.closest('.expand-btn');
    const deleteBtn = e.target.closest('.delete-order-btn');
    if (expandBtn) {
      toggleRowExpand(expandBtn.dataset.orderId);
    } else if (deleteBtn) {
      showDeleteConfirm(deleteBtn.dataset.orderId);
    }
  });

  document.getElementById('orders-tbody').addEventListener('change', e => {
    const sel = e.target.closest('.status-select');
    if (!sel) return;
    const { orderId } = sel.dataset;
    const newStatus = sel.value;
    handleStatusUpdate(orderId, newStatus, sel);
  });

  let menuSearchTimer;
  const menuSearchEl = document.getElementById('menu-search');
  if (menuSearchEl) {
    menuSearchEl.addEventListener('input', e => {
      clearTimeout(menuSearchTimer);
      menuSearchTimer = setTimeout(() => {
        AdminState.menuSearchQuery = e.target.value.toLowerCase();
        renderMenuEditor();
      }, 300);
    });
  }

  const menuCatFilter = document.getElementById('menu-category-filter');
  if (menuCatFilter) {
    menuCatFilter.addEventListener('change', e => {
      AdminState.menuActiveFilter = e.target.value;
      renderMenuEditor();
    });
  }

  document.getElementById('delete-cancel-btn').addEventListener('click', closeDeleteConfirm);
  document.getElementById('delete-modal-backdrop').addEventListener('click', closeDeleteConfirm);
  document.getElementById('delete-confirm-btn').addEventListener('click', () => {
    const orderId = document.getElementById('delete-confirm-btn').dataset.orderId;
    if (orderId) handleDeleteOrder(orderId);
  });

  document.getElementById('toggle-open-btn').addEventListener('click', toggleRestaurantOpen);
}

// ===================== NAVIGATION =====================
function navigateTo(view) {
  document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(`view-${view}`);
  if (target) target.classList.add('active');

  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const activeLink = document.querySelector(`.nav-link[data-view="${view}"]`);
  if (activeLink) activeLink.classList.add('active');

  document.querySelectorAll('.bottom-nav-btn').forEach(b => {
    const isActive = b.dataset.view === view;
    b.style.color = isActive ? '#f2ca50' : '#d0c5af';
  });

  const labels = { dashboard: 'Dashboard', orders: 'Orders Management', analytics: 'Analytics', menu: 'Menu Editor' };
  const bc = document.getElementById('top-bar-breadcrumb');
  if (bc) bc.textContent = labels[view] || view;

  if (view === 'analytics') {
    renderAnalytics();
  }
}

// ===================== DATA FETCHING =====================
async function fetchOrders() {
  if (!CONFIG.GAS_URL) {
    AdminState.orders = SAMPLE_ORDERS || [];
    return;
  }
  try {
    let url = `${CONFIG.GAS_URL}?t=${Date.now()}`;
    if (AdminState.lastUpdated && AdminState.orders.length > 0) {
      url += `&lastUpdated=${encodeURIComponent(AdminState.lastUpdated)}`;
    }
    
    const res = await fetch(url);
    const raw = await res.json();
    
    function normalizeOrder(o) {
      return {
        OrderID:      o.OrderID      || o['Order ID']      || '',
        Timestamp:    o.Timestamp    || '',
        CustomerName: o.CustomerName || o['Customer Name'] || '',
        Phone:        String(o.Phone || '').replace(/^'+/, ''),
        Address:      o.Address      || '',
        Items:        o.Items        || o['Order JSON']    || '[]',
        Total:        o.Total        || 0,
        Notes:        o.Notes        || '',
        Status:       o.Status       || 'Pending',
        LockedBy:     o.LockedBy     || '',
        LockedAt:     o.LockedAt     || '',
        StatusHistory: o.StatusHistory || '[]',
      };
    }

    AdminState.orders = (raw.orders || []).map(normalizeOrder);
    AdminState.menu   = raw.menu    || [];
    AdminState.lastUpdated = raw.lastUpdated || AdminState.lastUpdated;
    
    if (raw.system) {
      AdminState.isOpen = raw.system.isOpen !== false;
      updateOpenCloseUI();
    }

    const newIds = AdminState.orders.filter(o => !AdminState.knownOrderIds.has(o.OrderID));
    if (AdminState.knownOrderIds.size > 0 && newIds.length > 0) {
      showToast(`${newIds.length} new order${newIds.length > 1 ? 's' : ''} received!`, 'info');
      document.getElementById('notif-dot').style.display = 'block';
      
      try {
        new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg').play().catch(() => {});
      } catch (e) {}
      
      newIds.forEach(o => AdminState.freshOrderIds.add(o.OrderID));
      setTimeout(() => {
        newIds.forEach(o => AdminState.freshOrderIds.delete(o.OrderID));
        renderOrdersTable();
      }, 10000);
    }
    AdminState.orders.forEach(o => AdminState.knownOrderIds.add(o.OrderID));
    AdminState.lastFetchTime = new Date();
    
    await fetchAllowedStatuses();

  } catch (err) {
    console.error('fetchOrders failed:', err);
    if (AdminState.orders.length === 0) {
      AdminState.orders = SAMPLE_ORDERS || [];
    }
  }
}

async function fetchAllowedStatuses() {
  if (!CONFIG.GAS_URL) return;
  for (const order of AdminState.orders.slice(0, 50)) {
    try {
      const res = await fetch(CONFIG.GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'getAllowedStatuses',
          apiKey: CONFIG.API_KEY,
          orderId: order.OrderID
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        AdminState.allowedStatuses[order.OrderID] = data.allowedNext;
      }
    } catch (e) {}
  }
}

async function fetchAndRender() {
  await fetchOrders();
  applyFiltersAndRender();
  renderDashboard();
  renderMenuEditor();
  renderSystemStatusBar();
}

// ===================== SYSTEM STATUS BAR =====================
function renderSystemStatusBar() {
  const el = document.getElementById('system-status-bar');
  if (!el) return;
  
  const queueDelay = '~1 min';
  el.innerHTML = `
    <div class="flex items-center gap-6 text-xs text-on-surface-variant">
      <span class="flex items-center gap-1">
        <span class="material-symbols-outlined text-sm">sync</span>
        Last Sync: ${AdminState.lastFetchTime ? AdminState.lastFetchTime.toLocaleTimeString('en-PK') : '—'}
      </span>
      <span class="flex items-center gap-1">
        <span class="material-symbols-outlined text-sm">inventory_2</span>
        Orders: ${AdminState.orders.length}
      </span>
      <span class="flex items-center gap-1">
        <span class="material-symbols-outlined text-sm">schedule</span>
        Queue: ${queueDelay}
      </span>
    </div>
  `;
}

// ===================== OPEN/CLOSE TOGGLE =====================
async function toggleRestaurantOpen() {
  const newState = !AdminState.isOpen;
  const btn = document.getElementById('toggle-open-btn');
  
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined animate-spin">progress_activity</span>';
  }

  try {
    const res = await fetch(CONFIG.GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'setSystem',
        apiKey: CONFIG.API_KEY,
        key: 'isOpen',
        value: newState
      })
    });
    const data = await res.json();
    if (data.status === 'success') {
      AdminState.isOpen = data.isOpen;
      updateOpenCloseUI();
      showToast(newState ? 'Restaurant is now OPEN' : 'Restaurant is now CLOSED', newState ? 'success' : 'warning');
    }
  } catch (err) {
    showToast('Failed to update status', 'error');
  }

  if (btn) {
    btn.disabled = false;
  }
}

function updateOpenCloseUI() {
  const btn = document.getElementById('toggle-open-btn');
  if (btn) {
    if (AdminState.isOpen) {
      btn.className = 'px-4 py-2 bg-green-500/20 text-green-400 font-bold text-sm rounded-lg hover:bg-green-500/30 transition-all flex items-center gap-2';
      btn.innerHTML = '<span class="material-symbols-outlined text-sm">lock_open</span> Open';
    } else {
      btn.className = 'px-4 py-2 bg-red-500/20 text-red-400 font-bold text-sm rounded-lg hover:bg-red-500/30 transition-all flex items-center gap-2';
      btn.innerHTML = '<span class="material-symbols-outlined text-sm">lock</span> Closed';
    }
  }
}

// ===================== AUTO-REFRESH =====================
function startAutoRefresh() {
  if (AdminState.refreshInterval) return;
  AdminState.refreshInterval = setInterval(fetchAndRender, CONFIG.REFRESH_INTERVAL_MS);
}

function stopAutoRefresh() {
  clearInterval(AdminState.refreshInterval);
  AdminState.refreshInterval = null;
}

// ===================== FILTERING & SORTING =====================
function applyFiltersAndRender() {
  let result = [...AdminState.orders];

  if (AdminState.activeFilter === 'Active') {
    result = result.filter(o => ORDER_STATUS.ACTIVE.includes(o.Status));
  } else if (AdminState.activeFilter !== 'All') {
    result = result.filter(o => o.Status === AdminState.activeFilter);
  }

  if (AdminState.searchQuery) {
    result = result.filter(o =>
      (o.OrderID || '').toLowerCase().includes(AdminState.searchQuery) ||
      (o.CustomerName || '').toLowerCase().includes(AdminState.searchQuery) ||
      (o.Phone || '').includes(AdminState.searchQuery)
    );
  }

  result.sort((a, b) => {
    if (AdminState.sortKey === 'newest') return new Date(b.Timestamp) - new Date(a.Timestamp);
    if (AdminState.sortKey === 'oldest') return new Date(a.Timestamp) - new Date(b.Timestamp);
    if (AdminState.sortKey === 'highest') return Number(b.Total) - Number(a.Total);
    if (AdminState.sortKey === 'lowest') return Number(a.Total) - Number(b.Total);
    return 0;
  });

  AdminState.filtered = result;
  renderOrdersTable();
}

// ===================== FILTER TABS =====================
function renderFilterTabs() {
  const counts = {
    Active: AdminState.orders.filter(o => ORDER_STATUS.ACTIVE.includes(o.Status)).length,
    Delivered: AdminState.orders.filter(o => o.Status === 'Delivered').length,
    Cancelled: AdminState.orders.filter(o => o.Status === 'Cancelled').length,
    All: AdminState.orders.length
  };

  const tabs = [
    { key: 'Active', label: 'Active' },
    { key: 'Delivered', label: 'Delivered' },
    { key: 'Cancelled', label: 'Cancelled' },
    { key: 'All', label: 'All' }
  ];

  document.querySelectorAll('.filter-tab').forEach(tab => {
    const key = tab.dataset.filter;
    const isActive = key === AdminState.activeFilter;
    const count = counts[key] || 0;
    tab.className = `filter-tab flex-1 text-xs font-label font-bold py-2 rounded-lg transition-colors cursor-pointer ${
      isActive
        ? 'bg-primary text-on-primary shadow-lg'
        : 'text-on-surface-variant hover:text-on-surface'
    }`;
    tab.innerHTML = `${key} <span class="ml-1 opacity-70">(${count})</span>`;
  });
}

// ===================== DASHBOARD =====================
function renderDashboard() {
  const orders = AdminState.orders;
  const kpis = computeKPIs(orders);

  const kpiGrid = document.getElementById('kpi-grid');
  kpiGrid.innerHTML = `
    <div class="col-span-1 sm:col-span-2 bg-[#1c1b1b] rounded-xl p-6 relative overflow-hidden flex flex-col justify-between border-l-4 border-primary hover:bg-[#201f1f] transition-all duration-300">
      <div class="flex justify-between items-start mb-3">
        <div>
          <p class="text-[10px] uppercase tracking-[0.2em] text-[#d4af37] font-semibold mb-1">Total Net Revenue</p>
          <h2 class="text-4xl font-headline font-bold text-on-background">Rs. ${kpis.revenue.toLocaleString()}</h2>
        </div>
        <div class="p-3 bg-primary/10 rounded-full text-primary">
          <span class="material-symbols-outlined text-3xl">payments</span>
        </div>
      </div>
      <p class="text-xs text-on-surface-variant italic">Reflecting Delivered Orders Only</p>
    </div>
    <div class="bg-surface-container-low rounded-xl p-6 flex flex-col gap-4 border border-white/5">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center text-[#d4af37]">
          <span class="material-symbols-outlined">shopping_bag</span>
        </div>
        <p class="text-xs uppercase tracking-widest text-on-surface-variant font-medium">Total Orders</p>
      </div>
      <h3 class="text-3xl font-headline font-semibold text-on-background">${kpis.totalOrders.toLocaleString()}</h3>
    </div>
    <div class="bg-surface-container-low rounded-xl p-6 flex flex-col gap-4 border border-white/5">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary">
          <span class="material-symbols-outlined">pending_actions</span>
        </div>
        <p class="text-xs uppercase tracking-widest text-on-surface-variant font-medium">Active</p>
      </div>
      <h3 class="text-3xl font-headline font-semibold text-on-background">${kpis.active}</h3>
    </div>`;

  const insightGrid = document.getElementById('insight-grid');
  insightGrid.innerHTML = `
    <div class="bg-[#1c1b1b] rounded-xl p-5 flex items-center gap-5 border border-white/5">
      <div class="w-14 h-14 rounded-full bg-surface-container-highest flex items-center justify-center text-[#d4af37] flex-shrink-0">
        <span class="material-symbols-outlined text-2xl">task_alt</span>
      </div>
      <div>
        <p class="text-[10px] uppercase tracking-widest text-[#d4af37] mb-1">Delivered</p>
        <h4 class="text-2xl font-headline font-bold text-on-background">${kpis.delivered}</h4>
        <p class="text-xs text-on-surface-variant italic">${kpis.totalOrders > 0 ? Math.round(kpis.delivered/kpis.totalOrders*100) : 0}% success rate</p>
      </div>
    </div>
    <div class="bg-[#1c1b1b] rounded-xl p-5 flex items-center gap-5 border border-white/5">
      <div class="w-14 h-14 rounded-full bg-surface-container-highest flex items-center justify-center text-error flex-shrink-0">
        <span class="material-symbols-outlined text-2xl">cancel</span>
      </div>
      <div>
        <p class="text-[10px] uppercase tracking-widest text-error mb-1">Cancelled</p>
        <h4 class="text-2xl font-headline font-bold text-on-background">${kpis.cancelled}</h4>
        <p class="text-xs text-on-surface-variant italic">${kpis.totalOrders > 0 ? Math.round(kpis.cancelled/kpis.totalOrders*100) : 0}% of total</p>
      </div>
    </div>`;

  renderRecentOrdersTable();
  renderDashSyncStatus();
  renderFilterTabs();
}

function renderDashSyncStatus() {
  const el = document.getElementById('dash-sync-status');
  if (el && AdminState.lastFetchTime) {
    el.textContent = `Last synced: ${AdminState.lastFetchTime.toLocaleTimeString('en-PK')}`;
  }
}

function renderRecentOrdersTable() {
  const tbody = document.getElementById('recent-orders-tbody');
  const recent = [...AdminState.orders]
    .filter(o => ORDER_STATUS.ACTIVE.includes(o.Status))
    .sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp))
    .slice(0, 5);

  if (recent.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-12 text-center text-on-surface-variant italic font-body">No active orders</td></tr>`;
    return;
  }

  tbody.innerHTML = recent.map(o => {
    const badgeClass = statusBadgeClass(o.Status);
    const initials = getInitials(o.CustomerName);
    return `<tr class="hover:bg-white/[0.02] transition-colors">
      <td class="px-6 py-4 font-mono text-xs text-primary">${o.OrderID}</td>
      <td class="px-6 py-4">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-[10px] font-bold text-[#d4af37]">${initials}</div>
          <span class="text-sm font-medium">${o.CustomerName}</span>
        </div>
      </td>
      <td class="px-6 py-4 text-xs text-on-surface-variant hidden md:table-cell">${truncate(o.Address, 35)}</td>
      <td class="px-6 py-4 text-sm font-semibold">Rs. ${Number(o.Total).toLocaleString()}</td>
      <td class="px-6 py-4"><span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${badgeClass}">${o.Status}</span></td>
      <td class="px-6 py-4 text-xs text-on-surface-variant italic hidden lg:table-cell">${timeAgo(o.Timestamp)}</td>
    </tr>`;
  }).join('');
}

// ===================== ORDERS TABLE =====================
function renderOrdersTable() {
  const tbody = document.getElementById('orders-tbody');
  const { filtered, currentPage, itemsPerPage } = AdminState;
  const start = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(start, start + itemsPerPage);

  if (paginated.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="p-12 text-center text-on-surface-variant italic font-body">No orders match your filters.</td></tr>`;
    renderPagination();
    renderOrdersCount();
    return;
  }

  tbody.innerHTML = paginated.map(o => {
    const items = parseItems(o.Items);
    const itemsPreview = items.map(i => `${i.name} x${i.qty}`).join(', ');
    const badgeClass = statusBadgeClass(o.Status);
    const isExpanded = AdminState.expandedOrderId === o.OrderID;
    const expandedHtml = isExpanded ? buildExpandedRow(o, items) : '';
    const highlightClass = AdminState.freshOrderIds.has(o.OrderID) ? 'bg-primary/20 animate-pulse' : 'hover:bg-surface-container-high/30';
    const allowedNext = (AdminState.allowedStatuses[o.OrderID] || ORDER_STATUS.FLOW[o.Status] || []).filter(s => s !== o.Status);

    const statusOptions = allowedNext.length > 0
      ? allowedNext.map(s => `<option value="${s}">${s}</option>`).join('')
      : '';

    return `
    <tr class="transition-colors border-l-4 ${statusBorderClass(o.Status)} ${isExpanded ? 'bg-surface-container-high/20' : ''} ${highlightClass}">
      <td class="p-4 text-center">
        <button class="expand-btn text-on-surface-variant hover:text-primary transition-colors active:scale-90" data-order-id="${o.OrderID}" aria-label="Expand order">
          <span class="material-symbols-outlined text-xl">${isExpanded ? 'expand_less' : 'expand_more'}</span>
        </button>
      </td>
      <td class="p-4 font-mono text-sm text-primary">${o.OrderID}</td>
      <td class="p-4 text-sm text-on-surface-variant hidden md:table-cell">${formatTime(o.Timestamp)}</td>
      <td class="p-4">
        <div class="flex flex-col">
          <span class="text-sm font-semibold text-on-surface">${o.CustomerName}</span>
          <span class="text-xs text-on-surface-variant">${o.Phone}</span>
        </div>
      </td>
      <td class="p-4 text-sm text-on-surface-variant italic truncate max-w-[180px] hidden lg:table-cell">${truncate(itemsPreview, 50)}</td>
      <td class="p-4 text-sm font-bold">Rs. ${Number(o.Total).toLocaleString()}</td>
      <td class="p-4">
        <select data-order-id="${o.OrderID}"
          class="status-select w-full border-none rounded-lg px-2 py-1.5 text-xs font-bold focus:ring-0 cursor-pointer appearance-none ${statusSelectClass(o.Status)}"
          aria-label="Update status"
          ${allowedNext.length === 0 ? 'disabled' : ''}>
          <option value="${o.Status}" selected>${o.Status}</option>
          ${statusOptions}
        </select>
        ${allowedNext.length === 0 ? `<p class="text-[10px] text-on-surface-variant mt-1 opacity-70">No transitions available</p>` : ''}
      </td>
      <td class="p-4 text-center">
        <div class="flex items-center justify-center gap-1">
          <button class="expand-btn w-8 h-8 rounded-full flex items-center justify-center hover:bg-primary/20 text-on-surface-variant hover:text-primary transition-all"
            data-order-id="${o.OrderID}" aria-label="View details">
            <span class="material-symbols-outlined text-lg">visibility</span>
          </button>
          <button class="delete-order-btn w-8 h-8 rounded-full flex items-center justify-center hover:bg-error-container/30 text-on-surface-variant hover:text-error transition-all"
            data-order-id="${o.OrderID}" aria-label="Delete order">
            <span class="material-symbols-outlined text-lg">delete_outline</span>
          </button>
        </div>
      </td>
    </tr>
    ${expandedHtml}`;
  }).join('');

  renderPagination();
  renderOrdersCount();
}

function buildExpandedRow(o, items) {
  let statusHistory = [];
  try {
    statusHistory = JSON.parse(o.StatusHistory || '[]');
  } catch (e) {
    statusHistory = [];
  }

  const historyHtml = statusHistory.length > 0
    ? `<div class="mt-4 pt-4 border-t border-white/10">
        <h5 class="text-xs uppercase tracking-widest text-on-surface-variant/60 mb-2">Order Timeline</h5>
        <div class="space-y-2">
          ${statusHistory.map(h => `
            <div class="flex items-center gap-3 text-xs">
              <span class="w-2 h-2 rounded-full ${statusBadgeDot(h.status)}"></span>
              <span class="font-medium">${h.status}</span>
              <span class="text-on-surface-variant">${formatTime(h.time)}</span>
            </div>
          `).join('')}
        </div>
      </div>`
    : '';

  return `
  <tr class="expanded-row open bg-surface-container-highest/10">
    <td colspan="8" class="p-6 md:p-8">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div class="lg:col-span-2">
          <h4 class="font-headline font-bold text-lg text-primary mb-4 flex items-center gap-2">
            <span class="material-symbols-outlined text-xl">restaurant_menu</span> Order Details
          </h4>
          <div class="bg-background/40 rounded-xl overflow-hidden border border-white/5">
            <table class="w-full text-left">
              <thead>
                <tr class="text-[10px] uppercase tracking-widest text-on-surface-variant/60 border-b border-white/5">
                  <th class="px-4 py-3">Item</th>
                  <th class="px-4 py-3 text-center">Qty</th>
                  <th class="px-4 py-3 text-right">Price</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/5">
                ${items.map(i => `
                <tr>
                  <td class="px-4 py-3 text-sm text-on-surface">${i.name}</td>
                  <td class="px-4 py-3 text-sm text-on-surface text-center">${i.qty}</td>
                  <td class="px-4 py-3 text-sm text-on-surface text-right">Rs. ${(i.price * i.qty).toLocaleString()}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
          ${historyHtml}
        </div>
        <div class="flex flex-col gap-5">
          <div>
            <h4 class="font-headline font-bold text-lg text-primary mb-4 flex items-center gap-2">
              <span class="material-symbols-outlined text-xl">person</span> Customer Info
            </h4>
            <div class="bg-background/40 p-4 rounded-xl border border-white/5 space-y-3">
              <div>
                <span class="text-[10px] uppercase tracking-widest text-on-surface-variant/60 block">Phone</span>
                <span class="text-sm text-on-surface">${o.Phone}</span>
              </div>
              <div>
                <span class="text-[10px] uppercase tracking-widest text-on-surface-variant/60 block">Delivery Address</span>
                <span class="text-sm text-on-surface leading-relaxed">${o.Address}</span>
              </div>
              ${o.Notes ? `<div>
                <span class="text-[10px] uppercase tracking-widest text-on-surface-variant/60 block">Special Instructions</span>
                <span class="text-sm text-on-surface italic">"${o.Notes}"</span>
              </div>` : ''}
            </div>
          </div>
          <div class="bg-primary/5 p-4 rounded-xl border border-primary/10">
            <div class="flex justify-between items-center mb-2">
              <span class="text-sm text-on-surface-variant">Subtotal</span>
              <span class="text-sm text-on-surface">Rs. ${(Number(o.Total) - 100).toLocaleString()}</span>
            </div>
            <div class="flex justify-between items-center mb-3">
              <span class="text-sm text-on-surface-variant">Delivery Fee</span>
              <span class="text-sm text-on-surface">Rs. 100</span>
            </div>
            <div class="border-t border-primary/20 pt-3 flex justify-between">
              <span class="font-bold text-on-surface">Total</span>
              <span class="font-bold text-primary text-lg">Rs. ${Number(o.Total).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </td>
  </tr>`;
}

function statusBadgeDot(status) {
  if (status === 'Delivered') return 'bg-green-400';
  if (status === 'Cancelled') return 'bg-red-400';
  if (status === 'Out for Delivery') return 'bg-blue-400';
  if (status === 'Preparing') return 'bg-orange-400';
  if (status === 'Accepted') return 'bg-yellow-400';
  return 'bg-gray-400';
}

function toggleRowExpand(orderId) {
  if (AdminState.expandedOrderId === orderId) {
    AdminState.expandedOrderId = null;
  } else {
    AdminState.expandedOrderId = orderId;
  }
  renderOrdersTable();
}

function renderOrdersCount() {
  const el = document.getElementById('orders-count-label');
  if (el) {
    const { filtered, currentPage, itemsPerPage } = AdminState;
    const start = Math.min((currentPage - 1) * itemsPerPage + 1, filtered.length);
    const end = Math.min(currentPage * itemsPerPage, filtered.length);
    el.textContent = filtered.length === 0
      ? 'No orders found'
      : `Showing ${start}–${end} of ${filtered.length} orders`;
  }
}

function renderPagination() {
  const container = document.getElementById('pagination-controls');
  const total = AdminState.filtered.length;
  const pages = Math.ceil(total / AdminState.itemsPerPage);
  const curr = AdminState.currentPage;
  if (pages <= 1) { container.innerHTML = ''; return; }

  let html = `<button onclick="changePage(${curr-1})" ${curr===1?'disabled':''} class="p-2 rounded-lg bg-surface-container-low text-on-surface-variant hover:text-primary transition-colors disabled:opacity-40">
    <span class="material-symbols-outlined text-lg">chevron_left</span>
  </button>`;
  for (let p = 1; p <= pages; p++) {
    html += `<button onclick="changePage(${p})" class="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${p===curr ? 'bg-primary text-on-primary' : 'hover:bg-surface-container-low text-on-surface-variant'}">${p}</button>`;
  }
  html += `<button onclick="changePage(${curr+1})" ${curr===pages?'disabled':''} class="p-2 rounded-lg bg-surface-container-low text-on-surface-variant hover:text-primary transition-colors disabled:opacity-40">
    <span class="material-symbols-outlined text-lg">chevron_right</span>
  </button>`;
  container.innerHTML = html;
}

function changePage(p) {
  const pages = Math.ceil(AdminState.filtered.length / AdminState.itemsPerPage);
  if (p < 1 || p > pages) return;
  AdminState.currentPage = p;
  renderOrdersTable();
}

// ===================== STATUS UPDATE =====================
async function acquireOrderLock(orderId) {
  if (!CONFIG.GAS_URL) return true;
  try {
    const res = await fetch(CONFIG.GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ 
        action: 'acquireLock', 
        apiKey: CONFIG.API_KEY, 
        orderId,
        adminId: AdminState.adminId 
      })
    });
    const data = await res.json();
    if (data.status === 'locked') {
      return false;
    }
    return data.status === 'success';
  } catch (e) {
    console.warn('Lock acquire failed:', e);
    return true;
  }
}

async function releaseOrderLock(orderId) {
  if (!CONFIG.GAS_URL) return;
  try {
    await fetch(CONFIG.GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ 
        action: 'releaseLock', 
        apiKey: CONFIG.API_KEY, 
        orderId,
        adminId: AdminState.adminId 
      })
    });
  } catch (e) {
    console.warn('Lock release failed:', e);
  }
}

async function handleStatusUpdate(orderId, newStatus, selectEl) {
  const orderInState = AdminState.orders.find(o => o.OrderID === orderId);
  if (!orderInState) return;
  const oldStatus = orderInState.Status;

  const allowedNext = AdminState.allowedStatuses[orderId] || ORDER_STATUS.FLOW[oldStatus] || [];
  if (!allowedNext.includes(newStatus)) {
    showToast(`Cannot change from "${oldStatus}" to "${newStatus}"`, 'warning');
    selectEl.value = oldStatus;
    return;
  }

  const lockCheck = await acquireOrderLock(orderId);
  if (!lockCheck) {
    showToast('Order is being edited by another admin', 'warning');
    selectEl.value = oldStatus;
    return;
  }

  orderInState.Status = newStatus;
  updateSelectStyle(selectEl, newStatus);

  if (!CONFIG.GAS_URL) {
    showToast(`Order ${orderId} marked as ${newStatus}`, 'success');
    renderDashboard();
    return;
  }

  const payload = { action: 'updateStatus', apiKey: CONFIG.API_KEY, orderId, status: newStatus };
  try {
    const res = await fetch(CONFIG.GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.status !== 'success') throw new Error(data.message || 'API rejected update');
    
    showToast(`Order ${orderId} marked as ${newStatus}`, 'success');
    AdminState.allowedStatuses[orderId] = ORDER_STATUS.FLOW[newStatus] || [];
    renderDashboard();
    renderOrdersTable();
  } catch (err) {
    orderInState.Status = oldStatus;
    selectEl.value = oldStatus;
    updateSelectStyle(selectEl, oldStatus);
    showToast('Status update failed: ' + err.message, 'error');
  } finally {
    releaseOrderLock(orderId);
  }
}

function updateSelectStyle(sel, status) {
  sel.className = `status-select w-full border-none rounded-lg px-2 py-1.5 text-xs font-bold focus:ring-0 cursor-pointer appearance-none ${statusSelectClass(status)}`;
}

// ===================== DELETE ORDER =====================
function showDeleteConfirm(orderId) {
  document.getElementById('delete-order-id-label').textContent = orderId;
  document.getElementById('delete-confirm-btn').dataset.orderId = orderId;
  const modal = document.getElementById('delete-confirm-modal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeDeleteConfirm() {
  const modal = document.getElementById('delete-confirm-modal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  delete document.getElementById('delete-confirm-btn').dataset.orderId;
}

async function handleDeleteOrder(orderId) {
  closeDeleteConfirm();
  
  const lockCheck = await acquireOrderLock(orderId);
  if (!lockCheck) {
    showToast('Cannot delete — order is being edited', 'warning');
    return;
  }

  AdminState.orders = AdminState.orders.filter(o => o.OrderID !== orderId);
  AdminState.knownOrderIds.delete(orderId);
  delete AdminState.allowedStatuses[orderId];
  applyFiltersAndRender();
  renderDashboard();
  showToast(`Order ${orderId} deleted`, 'success');
  
  if (!CONFIG.GAS_URL) return;
  try {
    const res = await fetch(CONFIG.GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'deleteOrder', apiKey: CONFIG.API_KEY, orderId })
    });
    const data = await res.json();
    if (data.status !== 'success') throw new Error(data.message || 'API rejected delete');
  } catch (err) {
    console.error('Delete sync failed:', err);
    showToast('Deleted locally — Sheet sync failed. ' + err.message, 'warning');
  } finally {
    releaseOrderLock(orderId);
  }
}

// ===================== ANALYTICS =====================
function renderAnalytics() {
  const orders = AdminState.orders;
  const kpis = computeKPIs(orders);

  const deliveryRate = kpis.totalOrders > 0 ? Math.round(kpis.delivered / kpis.totalOrders * 100) : 0;
  const avgOrderValue = kpis.totalOrders > 0 ? Math.round(kpis.revenue / (kpis.delivered || 1)) : 0;

  const kpiGrid = document.getElementById('analytics-kpi-grid');
  kpiGrid.innerHTML = `
    <div class="bg-surface-container-low p-5 rounded-xl border border-outline-variant/5 shadow-xl">
      <div class="flex justify-between items-start mb-2">
        <span class="text-on-surface-variant text-xs font-label uppercase tracking-wider">Delivery Rate</span>
        <span class="material-symbols-outlined text-primary text-lg">local_shipping</span>
      </div>
      <h3 class="text-3xl font-headline font-bold text-on-surface">${deliveryRate}%</h3>
      <div class="w-full bg-surface-variant h-1.5 rounded-full mt-3 overflow-hidden">
        <div class="bg-primary h-full rounded-full" style="width:${deliveryRate}%"></div>
      </div>
    </div>
    <div class="bg-surface-container-low p-5 rounded-xl border border-outline-variant/5 shadow-xl">
      <div class="flex justify-between items-start mb-2">
        <span class="text-on-surface-variant text-xs font-label uppercase tracking-wider">Avg Order Value</span>
        <span class="material-symbols-outlined text-primary text-lg">payments</span>
      </div>
      <h3 class="text-3xl font-headline font-bold text-on-surface">Rs. ${avgOrderValue.toLocaleString()}</h3>
    </div>
    <div class="bg-surface-container-low p-5 rounded-xl border border-outline-variant/5 shadow-xl">
      <div class="flex justify-between items-start mb-2">
        <span class="text-on-surface-variant text-xs font-label uppercase tracking-wider">Active Orders</span>
        <span class="material-symbols-outlined text-primary text-lg">pending_actions</span>
      </div>
      <h3 class="text-3xl font-headline font-bold text-on-surface">${kpis.active}</h3>
    </div>
    <div class="bg-surface-container-low p-5 rounded-xl border border-outline-variant/5 shadow-xl">
      <div class="flex justify-between items-start mb-2">
        <span class="text-on-surface-variant text-xs font-label uppercase tracking-wider">Total Revenue</span>
        <span class="material-symbols-outlined text-primary text-lg">account_balance_wallet</span>
      </div>
      <h3 class="text-3xl font-headline font-bold text-on-surface">Rs. ${kpis.revenue.toLocaleString()}</h3>
    </div>`;

  renderOrdersPerHourChart(orders);
  renderStatusDoughnut(kpis);
  renderTopItems(orders);
}

function renderOrdersPerHourChart(orders) {
  const ctx = document.getElementById('orders-per-hour-chart').getContext('2d');
  if (AdminState.charts.bar) { AdminState.charts.bar.destroy(); AdminState.charts.bar = null; }

  const hourCounts = Array(24).fill(0);
  orders.forEach(o => {
    const h = new Date(o.Timestamp).getHours();
    hourCounts[h]++;
  });
  const labels = ['9a','10a','11a','12p','1p','2p','3p','4p','5p','6p','7p','8p','9p','10p'];
  const data = hourCounts.slice(9, 23);

  AdminState.charts.bar = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: data.map(v => v === Math.max(...data) ? '#f2ca50' : 'rgba(242,202,80,0.25)'),
        borderRadius: 4,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: {
        callbacks: { label: ctx => `${ctx.parsed.y} orders` },
        backgroundColor: '#1c1b1b', titleColor: '#f2ca50', bodyColor: '#d0c5af',
      }},
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#d0c5af', font: { size: 10 } } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#d0c5af', font: { size: 10 }, stepSize: 1 }, beginAtZero: true }
      }
    }
  });
}

function renderStatusDoughnut(kpis) {
  const ctx = document.getElementById('status-doughnut-chart').getContext('2d');
  if (AdminState.charts.doughnut) { AdminState.charts.doughnut.destroy(); AdminState.charts.doughnut = null; }

  const deliveryRate = kpis.totalOrders > 0 ? Math.round(kpis.delivered/kpis.totalOrders*100) : 0;
  document.getElementById('doughnut-center-pct').textContent = `${deliveryRate}%`;

  AdminState.charts.doughnut = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Delivered', 'Active', 'Cancelled'],
      datasets: [{
        data: [kpis.delivered, kpis.active, kpis.cancelled],
        backgroundColor: ['#d4af37', '#99907c', 'rgba(255,180,171,0.6)'],
        borderColor: '#131313',
        borderWidth: 3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '72%',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1c1b1b', titleColor: '#f2ca50', bodyColor: '#d0c5af',
        }
      }
    }
  });

  const legend = document.getElementById('status-legend');
  const legendItems = [
    { label: 'Delivered', count: kpis.delivered, color: '#d4af37' },
    { label: 'Active',   count: kpis.active,    color: '#99907c' },
    { label: 'Cancelled', count: kpis.cancelled,  color: '#ffb4ab' },
  ];
  legend.innerHTML = legendItems.map(item => `
    <div class="flex justify-between items-center">
      <div class="flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-full" style="background:${item.color}"></span>
        <span class="text-sm text-on-surface">${item.label}</span>
      </div>
      <span class="text-sm font-bold">${item.count}</span>
    </div>`).join('');
}

function renderTopItems(orders) {
  const counts = {};
  orders.forEach(o => {
    const items = parseItems(o.Items);
    items.forEach(i => {
      counts[i.name] = (counts[i.name] || 0) + (i.qty || 1);
    });
  });

  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const max = sorted.length > 0 ? sorted[0][1] : 1;
  const grid = document.getElementById('top-items-grid');

  if (sorted.length === 0) {
    grid.innerHTML = `<div class="col-span-2 text-center text-on-surface-variant italic py-8">No item data available.</div>`;
    return;
  }

  grid.innerHTML = sorted.map(([name, count]) => `
    <div class="flex flex-col gap-2">
      <div class="flex justify-between items-center text-sm">
        <span class="font-medium text-on-surface truncate max-w-[200px]">${name}</span>
        <span class="text-primary font-bold whitespace-nowrap ml-2">${count} Sold</span>
      </div>
      <div class="w-full bg-surface-variant h-2 rounded-full overflow-hidden">
        <div class="h-full bg-primary rounded-full transition-all duration-700" style="width:${Math.round(count/max*100)}%"></div>
      </div>
    </div>`).join('');
}

// ===================== KPI COMPUTATION =====================
function computeKPIs(orders) {
  const delivered = orders.filter(o => o.Status === 'Delivered');
  const active = orders.filter(o => ORDER_STATUS.ACTIVE.includes(o.Status));
  const cancelled = orders.filter(o => o.Status === 'Cancelled');
  const revenue = delivered.reduce((s, o) => s + Number(o.Total), 0);
  return {
    totalOrders: orders.length,
    revenue,
    active: active.length,
    delivered: delivered.length,
    cancelled: cancelled.length,
  };
}

// ===================== TOAST =====================
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const colors = {
    success: 'border-l-4 border-primary',
    error:   'border-l-4 border-error',
    warning: 'border-l-4 border-[#d4af37]',
    info:    'border-l-4 border-outline',
  };
  const icons = { success: 'check_circle', error: 'error', warning: 'warning', info: 'info' };
  const iconColors = { success: 'text-primary', error: 'text-error', warning: 'text-[#d4af37]', info: 'text-outline' };

  const toast = document.createElement('div');
  toast.className = `toast-in pointer-events-all flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl min-w-[240px] max-w-[340px] bg-[#1c1b1b] ${colors[type] || colors.info}`;
  toast.innerHTML = `
    <span class="material-symbols-outlined text-lg flex-shrink-0 ${iconColors[type]}" style="font-variation-settings:'FILL' 1;">${icons[type]}</span>
    <span class="text-sm font-body flex-1">${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.remove('toast-in');
    toast.classList.add('toast-out');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, 4500);
}

// ===================== HELPERS =====================
function statusBadgeClass(status) {
  if (status === 'Delivered') return 'badge-delivered';
  if (status === 'Cancelled') return 'badge-cancelled';
  if (status === 'Preparing') return 'bg-orange-500/20 text-orange-400';
  if (status === 'Out for Delivery') return 'bg-blue-500/20 text-blue-400';
  if (status === 'Accepted') return 'bg-yellow-500/20 text-yellow-400';
  return 'badge-pending';
}

function statusBorderClass(status) {
  if (status === 'Delivered') return 'border-l-[#5a8a6a]';
  if (status === 'Cancelled') return 'border-l-error';
  if (status === 'Preparing') return 'border-l-orange-500';
  if (status === 'Out for Delivery') return 'border-l-blue-500';
  if (status === 'Accepted') return 'border-l-yellow-500';
  return 'border-l-primary';
}

function statusSelectClass(status) {
  if (status === 'Delivered') return 'status-sel-delivered';
  if (status === 'Cancelled') return 'status-sel-cancelled';
  if (status === 'Preparing') return 'bg-orange-500/20 text-orange-400';
  if (status === 'Out for Delivery') return 'bg-blue-500/20 text-blue-400';
  if (status === 'Accepted') return 'bg-yellow-500/20 text-yellow-400';
  return 'status-sel-pending';
}

function parseItems(itemsJson) {
  try { return JSON.parse(itemsJson) || []; }
  catch { return []; }
}

function getInitials(name) {
  if (!name) return '??';
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase();
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

// ===================== MENU EDITOR =====================
function renderMenuEditor() {
  const tbody = document.getElementById('menu-editor-tbody');
  const catFilterEl = document.getElementById('menu-category-filter');
  
  if (!tbody) return;

  if (catFilterEl && catFilterEl.options.length <= 1) {
    const categories = [...new Set(AdminState.menu.map(i => i.Category))].filter(Boolean);
    categories.forEach(c => {
      const opt = document.createElement('option');
      opt.value = opt.textContent = c;
      catFilterEl.appendChild(opt);
    });
  }

  let sourceData = AdminState.menu;
  if (sourceData.length === 0 && typeof MENU !== 'undefined') {
    sourceData = MENU.map(item => ({
      ID: item.id,
      Category: item.category,
      Name: item.name,
      Description: item.description || '',
      Price: item.price || 0,
      Image: item.image || '',
      Badge: item.badge || '',
      Variants_JSON: JSON.stringify(item.variants || []),
      Available: true
    }));
  }

  let items = [...sourceData];
  if (AdminState.menuActiveFilter !== 'All') {
    items = items.filter(i => i.Category === AdminState.menuActiveFilter);
  }
  if (AdminState.menuSearchQuery) {
    items = items.filter(i => 
      (i.Name || '').toLowerCase().includes(AdminState.menuSearchQuery) ||
      (i.Category || '').toLowerCase().includes(AdminState.menuSearchQuery) ||
      (i.Description || '').toLowerCase().includes(AdminState.menuSearchQuery)
    );
  }

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="p-12 text-center text-on-surface-variant italic">No menu items found.</td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(item => {
    const isAvailable = item.Available === true || item.Available === 'true';
    return `
    <tr class="hover:bg-surface-container/50 transition-colors group ${!isAvailable ? 'opacity-50' : ''}" data-item-id="${item.ID}">
      <td class="p-4">
        <div class="flex items-center gap-2">
          <button onclick="toggleItemAvailability('${item.ID}')" class="w-8 h-8 rounded-full flex items-center justify-center transition-all ${isAvailable ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'}">
            <span class="material-symbols-outlined text-sm">${isAvailable ? 'check_circle' : 'cancel'}</span>
          </button>
          <div class="w-12 h-12 rounded-lg bg-cover bg-center border border-white/10 shrink-0" style="background-image: url('${item.Image}')"></div>
        </div>
      </td>
      <td class="p-4">
        <input type="text" class="item-name bg-transparent border-none p-0 text-on-surface font-headline font-bold text-sm w-full focus:ring-0 focus:text-primary transition-colors" value="${item.Name}" placeholder="Name">
        <input type="text" class="item-category bg-transparent border-none p-0 text-primary font-label text-[10px] uppercase tracking-wider w-full focus:ring-0 mt-1" value="${item.Category}" placeholder="Category">
      </td>
      <td class="p-4">
        <div class="flex items-center text-on-surface">
          <span class="text-xs text-on-surface-variant italic mr-1">Rs.</span>
          <input type="number" class="item-price bg-transparent border-none p-0 text-sm font-bold w-full focus:ring-0" value="${item.Price}">
        </div>
      </td>
      <td class="p-4">
        <textarea class="item-desc w-full bg-transparent border border-transparent rounded p-1 text-xs text-on-surface-variant focus:border-white/10 focus:ring-0 resize-y min-h-[40px]" placeholder="Description">${item.Description || ''}</textarea>
        <input type="text" class="item-badge mt-1 bg-transparent border border-transparent rounded p-1 text-[10px] text-secondary font-bold uppercase w-full focus:border-white/10 focus:ring-0" value="${item.Badge || ''}" placeholder="Badge (e.g. NEW)">
      </td>
      <td class="p-4">
        <textarea class="item-variants w-full bg-black/20 border border-white/5 rounded p-2 text-xs font-mono text-outline focus:border-primary/50 focus:text-on-surface focus:ring-0 resize-y min-h-[60px]" placeholder="[]">${item.Variants_JSON || '[]'}</textarea>
      </td>
      <td class="p-4 text-center">
        <span class="px-2 py-1 rounded text-[10px] font-bold uppercase ${isAvailable ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}">
          ${isAvailable ? 'Available' : 'Unavailable'}
        </span>
      </td>
      <td class="p-4 text-center">
        <button onclick="saveMenuItem('${item.ID}')" class="save-btn px-4 py-2 bg-primary/10 text-primary font-bold text-xs rounded-lg hover:bg-primary hover:text-on-primary transition-all active:scale-95 border border-primary/20 opacity-0 group-hover:opacity-100 focus:opacity-100">
          Save
        </button>
      </td>
    </tr>`;
  }).join('');

  tbody.querySelectorAll('input, textarea').forEach(input => {
    input.addEventListener('input', e => {
      const row = e.target.closest('tr');
      const btn = row.querySelector('.save-btn');
      btn.classList.remove('opacity-0', 'group-hover:opacity-100', 'bg-primary/10', 'text-primary');
      btn.classList.add('bg-primary', 'text-on-primary', 'shadow-lg', 'shadow-primary/20');
      btn.textContent = 'Save (Unsaved)';
    });
  });
}

async function toggleItemAvailability(id) {
  if (!CONFIG.GAS_URL) {
    const item = AdminState.menu.find(i => i.ID === id);
    if (item) {
      item.Available = !(item.Available === true || item.Available === 'true');
    }
    renderMenuEditor();
    showToast('Availability toggled', 'info');
    return;
  }

  try {
    const res = await fetch(CONFIG.GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'toggleAvailability',
        apiKey: CONFIG.API_KEY,
        ID: id
      })
    });
    const data = await res.json();
    if (data.status === 'success') {
      const item = AdminState.menu.find(i => i.ID === id);
      if (item) {
        item.Available = data.available;
      }
      renderMenuEditor();
      showToast(data.available ? 'Item now available' : 'Item now unavailable', data.available ? 'success' : 'warning');
    }
  } catch (err) {
    showToast('Failed to toggle availability', 'error');
  }
}

async function saveMenuItem(id) {
  const row = document.querySelector(`tr[data-item-id="${id}"]`);
  if (!row) return;

  const btn = row.querySelector('.save-btn');
  btn.textContent = 'Saving...';
  btn.classList.add('animate-pulse');

  const item = AdminState.menu.find(i => i.ID === id);
  const isAvailable = item ? (item.Available === true || item.Available === 'true') : true;

  const payload = {
    action: 'updateMenu',
    apiKey: CONFIG.API_KEY,
    ID: id,
    Name: row.querySelector('.item-name').value.trim(),
    Category: row.querySelector('.item-category').value.trim(),
    Price: parseFloat(row.querySelector('.item-price').value) || 0,
    Description: row.querySelector('.item-desc').value.trim(),
    Badge: row.querySelector('.item-badge').value.trim(),
    Variants_JSON: row.querySelector('.item-variants').value.trim() || '[]',
    Image: AdminState.menu.find(i => i.ID === id)?.Image || '',
    Available: isAvailable
  };

  try {
    JSON.parse(payload.Variants_JSON);

    const existing = AdminState.menu.find(i => i.ID === id);
    if (existing) {
      Object.assign(existing, payload);
    }

    if (CONFIG.GAS_URL) {
      const res = await fetch(CONFIG.GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.status !== 'success') throw new Error(data.message || 'API rejected menu update');
      
      if (data.version) {
        localStorage.setItem('jirgah_menu_version', String(data.version));
      }
    }

    btn.classList.remove('animate-pulse', 'bg-primary', 'text-on-primary', 'shadow-lg');
    btn.classList.add('bg-primary/10', 'text-primary', 'opacity-0', 'group-hover:opacity-100');
    btn.textContent = 'Save';
    showToast(`${payload.Name} updated successfully`, 'success');

  } catch (err) {
    btn.textContent = 'Error!';
    btn.classList.remove('animate-pulse');
    btn.classList.add('bg-error', 'text-on-error');
    console.error(err);
    showToast('Save failed: ' + err.message, 'error');
  }
}

// ===================== INITIALIZE MENU (FIRST LOAD) =====================
async function checkAndInitializeMenu() {
  if (AdminState.menu.length > 0 || !CONFIG.GAS_URL) return;

  console.log('Initializing Menu in Google Sheets (batch)...');
  showToast('Initializing menu in Sheet...', 'info');

  const payload = {
    action: 'initMenu',
    apiKey: CONFIG.API_KEY,
    items: MENU.map(item => ({
      ID: item.id,
      Category: item.category,
      Name: item.name,
      Description: item.description || '',
      Price: item.price || 0,
      Image: item.image || '',
      Badge: item.badge || '',
      Variants_JSON: JSON.stringify(item.variants || [])
    }))
  };

  try {
    const res = await fetch(CONFIG.GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.status !== 'success') throw new Error(data.message || 'API rejected initMenu');
    
    if (data.version) {
      localStorage.setItem('jirgah_menu_version', String(data.version));
    }
    
    showToast('Menu Sync Complete ✓', 'success');
    setTimeout(fetchAndRender, 3000);
  } catch (e) {
    console.error('Batch menu init failed:', e);
    showToast('Menu sync failed ' + e.message, 'error');
  }
}

function formatTime(ts) {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
  } catch { return '—'; }
}

function timeAgo(ts) {
  if (!ts) return '—';
  const diff = Date.now() - new Date(ts);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}
