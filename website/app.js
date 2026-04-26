// app.js — Jirgah Customer Website Application Logic
// Phase 9: Order Tracking, Closed State, Availability

'use strict';

// ===================== CONFIG =====================
const CONFIG = window.JIRGAH_CONFIG || {
  GAS_URL: '',
  API_KEY: '',
  DELIVERY_FEE: 100,
  CURRENCY: 'Rs.',
  MAX_RETRY_COUNT: 5,
  RETRY_DELAY_MS: 5000,
  RESTAURANT_NAME: 'Jirgah'
};

if (!CONFIG.GAS_URL || !CONFIG.API_KEY) {
  console.error('Missing configuration. Please check config/config.js');
}

const CATEGORIES = [
  'All', 'Bar B Q', 'Rolls', 'Broasts', 'Sandwiches', 'Burgers', 'Parathas',
  'Flavoured Fries', 'Special Mayonatic Fries', 'Pizza Special Flavors',
  'Pizza Traditional Flavors', 'Oven Baked Pasta', 'Extras'
];

const STATUS_STEPS = [
  { key: 'Pending', label: 'Order Received', icon: 'receipt' },
  { key: 'Accepted', label: 'Preparing', icon: 'restaurant' },
  { key: 'Preparing', label: 'Cooking', icon: 'local_fire_department' },
  { key: 'Out for Delivery', label: 'On the way', icon: 'delivery_dining' },
  { key: 'Delivered', label: 'Delivered', icon: 'check_circle' },
];

// ===================== API WRAPPER =====================
async function apiRequest(url, options = {}) {
  try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!data || typeof data !== 'object') {
      throw new Error('Invalid server response');
    }

    if (data.status !== 'success') {
      return { ok: false, message: data.message || 'Request failed', data: null };
    }

    return { ok: true, message: data.message || '', data: data.data || data };
  } catch (err) {
    return { ok: false, message: 'Network error. Please try again.', data: null };
  }
}

// ===================== STATE =====================
const AppState = {
  cart: {
    items: [],
    total: 0,
    itemCount: 0
  },
  ui: {
    cartOpen: false,
    checkoutOpen: false,
    variantModalOpen: false,
    selectedItem: null,
    isSubmitting: false,
    activeCategory: 'All',
    menuLoaded: false
  },
  isOpen: true,
  restaurantName: 'Jirgah'
};

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', async () => {
  hydrateCartFromStorage();
  processFailedOrders();
  renderCategoryTabs();
  
  // Instant render from local menu
  renderMenuGrid(AppState.ui.activeCategory);
  renderCartDrawer();
  updateCartBadge();
  bindEvents();
  
  // Background tasks — do not block UI
  fetchSystemState();
  fetchMenu(); // Syncs live prices + availability in background

  setInterval(() => {
    processFailedOrders();
  }, 60000);

  // Real-time syncing for system state and menu (every 30s)
  setInterval(() => {
    fetchSystemState();
    fetchMenu();
  }, 30000);
});

async function fetchSystemState() {
  if (!CONFIG.GAS_URL) return;
  try {
    const res = await apiRequest(`${CONFIG.GAS_URL}?t=${Date.now()}`);
    if (res.ok && res.data.system) {
      AppState.isOpen = res.data.system.isOpen !== false;
      AppState.restaurantName = res.data.system.restaurantName || 'Jirgah';
      updateClosedBanner();
    }
  } catch (e) {
    console.warn('Failed to fetch system state:', e);
  }
}

function updateClosedBanner() {
  const banner = document.getElementById('closed-banner');
  if (!banner) return;
  
  if (!AppState.isOpen) {
    banner.classList.remove('hidden');
    banner.classList.add('flex');
  } else {
    banner.classList.add('hidden');
    banner.classList.remove('flex');
  }
}

async function fetchMenu() {
  if (!CONFIG.GAS_URL) return;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await apiRequest(`${CONFIG.GAS_URL}?t=${Date.now()}`, { signal: controller.signal });
    clearTimeout(timeout);
    
    if (res.ok && res.data.menu && res.data.menu.length > 0) {
      const serverVersion = String(res.data.menuVersion || '0');
      const localVersion  = localStorage.getItem('jirgah_menu_version') || '0';

      // Always build and apply the live menu from the server.
      // Version is only used to decide whether to update localStorage cache.
      const liveMenu = res.data.menu.map(item => ({
        id: item.ID,
        category: item.Category,
        name: item.Name,
        description: item.Description,
        price: parseFloat(item.Price),
        image: item.Image,
        badge: item.Badge,
        available: item.Available !== false && item.Available !== 'false',
        variants: (() => { try { return JSON.parse(item.Variants_JSON || '[]'); } catch { return []; } })()
      }));

      const menuChanged = serverVersion !== localVersion;

      window.LIVE_MENU = liveMenu;
      AppState.ui.menuLoaded = true;

      if (menuChanged) {
        localStorage.setItem('jirgah_menu_version', serverVersion);
        localStorage.setItem('jirgah_live_menu', JSON.stringify(liveMenu));
        console.log(`[Menu] Updated to v${serverVersion} (was v${localVersion}).`);
      }
      
      // Always re-render if it changed OR if this is the first successful load
      if (menuChanged || !window.hasRenderedLive) {
        window.hasRenderedLive = true;
        renderMenuGrid(AppState.ui.activeCategory);
      }
    } else {
      // Server returned no menu — try localStorage fallback
      const cachedMenu = localStorage.getItem('jirgah_live_menu');
      if (cachedMenu && !window.LIVE_MENU) {
        window.LIVE_MENU = JSON.parse(cachedMenu);
        AppState.ui.menuLoaded = true;
        renderMenuGrid(AppState.ui.activeCategory);
        console.warn('[Menu] Server empty — using cached menu.');
      }
    }
    
    if (res.ok && res.data.system) {
      AppState.isOpen = res.data.system.isOpen !== false;
      AppState.restaurantName = res.data.system.restaurantName || 'Jirgah';
      updateClosedBanner();
    }
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      console.warn('[Menu] Fetch timed out — using local fallback.');
    } else {
      console.error('[Menu] fetchMenu failed:', err);
    }
    // On any error, use localStorage fallback if we don't have a live menu yet
    if (!window.LIVE_MENU) {
      const cachedMenu = localStorage.getItem('jirgah_live_menu');
      if (cachedMenu) {
        window.LIVE_MENU = JSON.parse(cachedMenu);
        AppState.ui.menuLoaded = true;
        renderMenuGrid(AppState.ui.activeCategory);
      }
    }
  }
}

// ===================== EVENT BINDING =====================
function bindEvents() {
  document.getElementById('cart-btn').addEventListener('click', openCartDrawer);
  document.getElementById('cart-close-btn').addEventListener('click', closeCartDrawer);
  document.getElementById('cart-overlay').addEventListener('click', closeCartDrawer);

  document.getElementById('checkout-btn').addEventListener('click', openCheckout);
  document.getElementById('modal-close-btn').addEventListener('click', closeCheckout);
  document.getElementById('modal-backdrop').addEventListener('click', closeCheckout);

  document.getElementById('checkout-form').addEventListener('submit', handleFormSubmit);

  ['field-name', 'field-phone', 'field-address'].forEach(id => {
    document.getElementById(id).addEventListener('focus', () => clearFieldError(id));
  });

  document.getElementById('new-order-btn').addEventListener('click', resetForNewOrder);

  document.getElementById('cart-items-list').addEventListener('click', handleCartInteraction);

  document.getElementById('category-tabs').addEventListener('click', handleCategoryClick);

  document.addEventListener('click', handleMenuClick);

  document.getElementById('track-order-btn').addEventListener('click', handleTrackOrderSubmit);
  document.getElementById('track-form').addEventListener('submit', e => {
    e.preventDefault();
    handleTrackOrderSubmit();
  });
  document.getElementById('close-tracking-btn').addEventListener('click', closeTrackingModal);
}

// ===================== CATEGORY TABS =====================
function renderCategoryTabs() {
  const container = document.getElementById('category-tabs');
  container.innerHTML = CATEGORIES.map(cat => {
    const active = cat === AppState.ui.activeCategory;
    return `<button
      data-category="${cat}"
      class="category-tab px-6 py-2 rounded-full font-label text-sm whitespace-nowrap transition-all duration-200 ${active
        ? 'bg-primary text-on-primary font-bold'
        : 'bg-surface-container-highest text-on-surface-variant hover:text-primary'
      }">
      ${cat}
    </button>`;
  }).join('');
}

function handleCategoryClick(e) {
  const btn = e.target.closest('.category-tab');
  if (!btn) return;
  AppState.ui.activeCategory = btn.dataset.category;
  renderCategoryTabs();
  renderMenuGrid(AppState.ui.activeCategory);
}

// ===================== MENU RENDERING =====================
function renderMenuGrid(category) {
  const container = document.getElementById('menu-container');
  let html = '';

  const currentMenu = AppState.ui.menuLoaded ? window.LIVE_MENU : MENU;
  const catsToRender = category === 'All' ? CATEGORIES.filter(c => c !== 'All') : [category];

  catsToRender.forEach(cat => {
    const items = currentMenu.filter(i => i.category === cat);
    if (items.length === 0) return;

    if (category === 'All') {
      html += `<h2 class="font-serif text-3xl font-bold text-[#d4af37] mt-16 mb-8 border-b border-white/10 pb-4">${cat}</h2>`;
    }

    html += `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">`;
    html += items.map((item, idx) => {
      const offset = (category !== 'All' && idx % 3 === 1) ? 'lg:translate-y-8' : '';
      const isAvailable = item.available !== false;
      return `
      <div class="group relative bg-surface-container-low rounded-lg overflow-hidden transition-all duration-500 hover:shadow-[0_20px_40px_rgba(0,0,0,0.6)] ${offset} ${!isAvailable ? 'opacity-60' : ''}">
        <div class="aspect-[4/3] overflow-hidden relative">
          <img alt="${item.name}" loading="lazy"
            class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${!isAvailable ? 'grayscale' : ''}"
            src="${item.image}"/>
          ${item.badge ? `<div class="absolute top-4 left-4">
            <span class="px-3 py-1 bg-secondary-container text-on-secondary-container text-[10px] font-bold rounded-full uppercase tracking-tighter">${item.badge}</span>
          </div>` : ''}
          ${!isAvailable ? `<div class="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span class="px-4 py-2 bg-red-500/90 text-white text-sm font-bold rounded-lg">Unavailable</span>
          </div>` : ''}
        </div>
        <div class="p-6 md:p-8">
          <div class="flex flex-col mb-4">
            <div class="flex justify-between items-start">
              <h3 class="font-serif text-xl md:text-2xl font-bold text-on-surface group-hover:text-primary transition-colors">${item.name}</h3>
              <span class="text-primary font-bold font-label whitespace-nowrap ml-2">
                ${item.variants && item.variants.length > 0 ? `From ${CONFIG.CURRENCY} ${item.variants[0].price}` : `${CONFIG.CURRENCY} ${item.price}`}
              </span>
            </div>
          </div>
          <p class="text-on-surface-variant text-sm mb-6 leading-relaxed line-clamp-2">${item.description || ''}</p>
          <button
            data-item-id="${item.id}"
            ${!isAvailable ? 'disabled' : ''}
            class="add-to-cart-btn w-full py-3 rounded-xl border border-primary/20 text-primary font-label font-bold text-sm hover:bg-primary hover:text-on-primary transition-all duration-300 flex items-center justify-center gap-2 active:scale-95 ${!isAvailable ? 'opacity-50 cursor-not-allowed' : ''}"
            ${!isAvailable ? 'onclick="showToast(\'This item is currently unavailable\', \'warning\'); return;"' : ''}>
            <span class="material-symbols-outlined text-sm">${isAvailable ? 'add' : 'block'}</span>
            ${isAvailable ? 'Add to Cart' : 'Unavailable'}
          </button>
        </div>
      </div>`;
    }).join('');
    html += `</div>`;
  });

  if (html === '') {
    container.innerHTML = `<div class="text-center py-24 text-on-surface-variant font-body italic">No dishes found.</div>`;
  } else {
    container.innerHTML = html;
  }
}

function handleMenuClick(e) {
  const btn = e.target.closest('.add-to-cart-btn');
  if (!btn || btn.disabled) return;
  const currentMenu = AppState.ui.menuLoaded ? window.LIVE_MENU : MENU;
  const item = currentMenu.find(i => i.id === btn.dataset.itemId);
  if (!item) return;

  openAddToCartModal(item);
}

// ===================== ADD TO CART MODAL LOGIC =====================
let modalState = {
  item: null,
  variantIdx: 0,
  qty: 1
};

function openAddToCartModal(item) {
  modalState.item = item;
  modalState.variantIdx = 0;
  modalState.qty = 1;

  document.getElementById('variant-name').textContent = item.name;
  document.getElementById('variant-desc').textContent = item.description || '';
  document.getElementById('variant-image').style.backgroundImage = `url('${item.image}')`;
  document.getElementById('modal-qty').textContent = '1';

  const section = document.getElementById('variant-section');
  if (item.variants && item.variants.length > 0) {
    section.classList.remove('hidden');
    const optsContainer = document.getElementById('variant-options');
    optsContainer.innerHTML = item.variants.map((v, idx) => `
      <button onclick="selectVariant(${idx})" class="variant-opt w-full p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-primary/30 transition-all flex justify-between items-center group active:scale-[0.98]">
        <div class="flex items-center gap-3">
          <div class="w-5 h-5 rounded-full border-2 border-primary/30 flex items-center justify-center transition-colors ${idx === 0 ? 'border-primary' : ''}">
            <div class="w-2.5 h-2.5 rounded-full bg-primary transition-opacity ${idx === 0 ? '' : 'opacity-0'}"></div>
          </div>
          <span class="text-on-surface font-headline font-semibold tracking-wide">${v.size}</span>
        </div>
        <span class="text-primary font-bold font-label">${CONFIG.CURRENCY} ${v.price.toLocaleString()}</span>
      </button>
    `).join('');
    selectVariant(0);
  } else {
    section.classList.add('hidden');
    updateModalActionBtn();
  }

  document.getElementById('variant-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function selectVariant(idx) {
  modalState.variantIdx = idx;
  const opts = document.querySelectorAll('.variant-opt');
  opts.forEach((opt, i) => {
    const dot = opt.querySelector('.bg-primary');
    const ring = opt.querySelector('.w-5.h-5');
    if (i === idx) {
      opt.classList.add('border-primary/50', 'bg-primary/5');
      ring.classList.add('border-primary');
      dot.classList.remove('opacity-0');
    } else {
      opt.classList.remove('border-primary/50', 'bg-primary/5');
      ring.classList.remove('border-primary');
      dot.classList.add('opacity-0');
    }
  });
  updateModalActionBtn();
}

function updateModalQty(delta) {
  modalState.qty += delta;
  if (modalState.qty < 1) modalState.qty = 1;
  document.getElementById('modal-qty').textContent = modalState.qty;
  updateModalActionBtn();
}

function updateModalActionBtn() {
  const item = modalState.item;
  const price = (item.variants && item.variants.length > 0)
    ? item.variants[modalState.variantIdx].price
    : item.price;
  const total = price * modalState.qty;

  const btn = document.getElementById('confirm-variant-btn');
  btn.textContent = `Add to Cart - ${CONFIG.CURRENCY} ${total.toLocaleString()}`;
  btn.onclick = () => {
    const variant = item.variants ? item.variants[modalState.variantIdx] : null;
    addToCart(item, variant, modalState.qty);
    closeVariantModal();
  };
}

function closeVariantModal() {
  document.getElementById('variant-modal').classList.add('hidden');
  if (!AppState.ui.cartOpen && !AppState.ui.checkoutOpen) {
    document.body.style.overflow = '';
  }
}

// ===================== CART LOGIC =====================
function addToCart(item, variant = null, qty = 1) {
  const cartId = variant ? `${item.id}-${variant.size}` : item.id;
  const itemName = variant ? `${item.name} (${variant.size})` : item.name;
  const itemPrice = variant ? variant.price : item.price;

  const existing = AppState.cart.items.find(i => i.cartId === cartId);
  if (existing) {
    existing.qty += qty;
  } else {
    AppState.cart.items.push({
      cartId: cartId,
      id: item.id,
      name: itemName,
      price: itemPrice,
      qty: qty,
      image: item.image,
      variant: variant ? variant.size : null
    });
  }
  recalculateCart();
  persistCartToStorage();
  renderCartDrawer();
  updateCartBadge(true);
  showToast(`${itemName} added`, 'success');
}

function removeFromCart(cartId) {
  AppState.cart.items = AppState.cart.items.filter(i => i.cartId !== cartId);
  recalculateCart();
  persistCartToStorage();
  renderCartDrawer();
  updateCartBadge();
}

function updateQty(cartId, direction) {
  const item = AppState.cart.items.find(i => i.cartId === cartId);
  if (!item) return;
  if (direction === 'dec' && item.qty === 1) {
    removeFromCart(cartId);
    return;
  }
  item.qty += direction === 'inc' ? 1 : -1;
  recalculateCart();
  persistCartToStorage();
  renderCartDrawer();
  updateCartBadge();
}

function recalculateCart() {
  const rawTotal = AppState.cart.items.reduce((sum, i) => sum + (i.price * i.qty), 0);
  // Prevent floating-point precision issues (e.g., 0.30000000004)
  AppState.cart.total = Math.round(rawTotal * 100) / 100;
  AppState.cart.itemCount = AppState.cart.items.reduce((sum, i) => sum + i.qty, 0);
}

function renderCartDrawer() {
  const list = document.getElementById('cart-items-list');
  const subtotalEl = document.getElementById('cart-subtotal');
  const totalEl = document.getElementById('cart-total-display');

  if (AppState.cart.items.length === 0) {
    list.innerHTML = `
      <div class="flex flex-col items-center justify-center h-full text-center space-y-4 py-16">
        <span class="material-symbols-outlined text-6xl text-outline-variant/30">shopping_basket</span>
        <p class="text-on-surface-variant font-body italic">Your manuscript is currently blank.</p>
        <button onclick="closeCartDrawer();document.getElementById('menu').scrollIntoView({behavior:'smooth'})"
          class="px-8 py-3 bg-surface-container-highest text-primary font-label font-bold rounded-xl active:scale-95 transition-all">
          Explore Menu
        </button>
      </div>`;
  } else {
    list.innerHTML = AppState.cart.items.map(item => `
      <div class="flex items-center gap-4 bg-surface-container-low p-4 rounded-xl border border-outline-variant/10">
        <div class="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
          <img src="${item.image}" alt="${item.name}" class="w-full h-full object-cover"/>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex justify-between items-start gap-2">
            <h4 class="font-headline text-[#e5e2e1] text-sm truncate">${item.name}</h4>
            <span class="text-primary font-bold text-sm whitespace-nowrap">${CONFIG.CURRENCY} ${(item.price * item.qty).toLocaleString()}</span>
          </div>
          <p class="text-xs text-on-surface-variant mt-0.5">${CONFIG.CURRENCY} ${item.price.toLocaleString()} each</p>
          <div class="flex items-center mt-3 gap-3">
            <button data-action="dec" data-cart-id="${item.cartId}" aria-label="Decrease quantity"
              class="qty-btn w-7 h-7 rounded-full border border-outline-variant flex items-center justify-center text-on-surface-variant hover:border-primary hover:text-primary transition-all active:scale-90">
              <span class="material-symbols-outlined text-xs">remove</span>
            </button>
            <span class="text-sm font-bold w-4 text-center">${item.qty}</span>
            <button data-action="inc" data-cart-id="${item.cartId}" aria-label="Increase quantity"
              class="qty-btn w-7 h-7 rounded-full border border-outline-variant flex items-center justify-center text-on-surface-variant hover:border-primary hover:text-primary transition-all active:scale-90">
              <span class="material-symbols-outlined text-xs">add</span>
            </button>
            <button data-action="remove" data-cart-id="${item.cartId}" aria-label="Remove item"
              class="qty-btn ml-auto p-1 text-outline hover:text-error transition-colors active:scale-90">
              <span class="material-symbols-outlined text-sm">delete_outline</span>
            </button>
          </div>
        </div>
      </div>`).join('');
  }

  const subtotal = AppState.cart.total;
  const total = subtotal + CONFIG.DELIVERY_FEE;
  if (subtotalEl) subtotalEl.textContent = `${CONFIG.CURRENCY} ${subtotal.toLocaleString()}`;
  if (totalEl) totalEl.textContent = `${CONFIG.CURRENCY} ${total.toLocaleString()}`;

  const orderBtnText = document.getElementById('order-btn-text');
  if (orderBtnText) orderBtnText.textContent = `Place Order (${CONFIG.CURRENCY} ${total.toLocaleString()})`;
}

function handleCartInteraction(e) {
  const btn = e.target.closest('.qty-btn');
  if (!btn) return;
  const { action, cartId } = btn.dataset;
  if (action === 'inc') updateQty(cartId, 'inc');
  else if (action === 'dec') updateQty(cartId, 'dec');
  else if (action === 'remove') removeFromCart(cartId);
}

// ===================== CART BADGE =====================
function updateCartBadge(animate = false) {
  const badge = document.getElementById('cart-badge');
  const count = AppState.cart.itemCount;
  if (count === 0) {
    badge.style.display = 'none';
  } else {
    badge.style.display = 'flex';
    badge.textContent = count > 99 ? '99+' : count;
    if (animate) {
      badge.classList.remove('badge-pulse');
      void badge.offsetWidth;
      badge.classList.add('badge-pulse');
    }
  }
}

// ===================== CART DRAWER OPEN/CLOSE =====================
function openCartDrawer() {
  AppState.ui.cartOpen = true;
  document.getElementById('cart-drawer').classList.add('cart-drawer-open');
  document.getElementById('cart-drawer').style.pointerEvents = 'all';
  document.body.style.overflow = 'hidden';
}

function closeCartDrawer() {
  AppState.ui.cartOpen = false;
  document.getElementById('cart-drawer').classList.remove('cart-drawer-open');
  document.getElementById('cart-drawer').style.pointerEvents = 'none';
  document.body.style.overflow = '';
}

// ===================== CHECKOUT =====================
function openCheckout() {
  if (!AppState.isOpen) {
    showToast('Restaurant is currently closed', 'warning');
    return;
  }
  if (AppState.cart.items.length === 0) {
    showToast('Your cart is empty — add items first', 'warning');
    return;
  }
  closeCartDrawer();
  const modal = document.getElementById('checkout-modal');
  modal.style.removeProperty('display');
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  AppState.ui.checkoutOpen = true;
}

function closeCheckout() {
  const modal = document.getElementById('checkout-modal');
  modal.style.display = 'none';
  document.body.style.overflow = '';
  AppState.ui.checkoutOpen = false;
  clearAllErrors();
}

// ===================== FORM VALIDATION =====================
function validateForm() {
  let valid = true;
  clearAllErrors();

  const name    = document.getElementById('field-name').value.trim();
  const phone   = document.getElementById('field-phone').value.trim();
  const address = document.getElementById('field-address').value.trim();

  if (!name) {
    showFieldError('field-name', 'error-name');
    valid = false;
  }

  if (!phone) {
    showFieldError('field-phone', 'error-phone', 'Phone number is required');
    valid = false;
  } else if (!/^[0-9+\-]+$/.test(phone)) {
    showFieldError('field-phone', 'error-phone', 'Only digits, + and - are allowed');
    valid = false;
  } else if (phone.replace(/[+\-]/g, '').length < 7) {
    showFieldError('field-phone', 'error-phone', 'Phone number is too short');
    valid = false;
  }

  if (!address || address.length < 10) {
    showFieldError('field-address', 'error-address', 'Please enter a more detailed address');
    valid = false;
  }

  if (!valid) {
    const firstError = document.querySelector('input.error, textarea.error');
    if (firstError) firstError.focus();
  }
  return valid;
}

function showFieldError(fieldId, errorId, message) {
  document.getElementById(fieldId).classList.add('error');
  const el = document.getElementById(errorId);
  if (!el) return;
  if (message) el.textContent = message;
  el.classList.remove('hidden');
}

function clearFieldError(fieldId) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  field.classList.remove('error');
  const errorId = 'error-' + fieldId.replace('field-', '');
  const errorEl = document.getElementById(errorId);
  if (errorEl) errorEl.classList.add('hidden');
}

function clearAllErrors() {
  ['field-name', 'field-phone', 'field-address'].forEach(id => clearFieldError(id));
}

// ===================== ORDER BUILDING =====================
function generateOrderId() {
  const date = new Date();
  const yyyymmdd = date.toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `JR-${yyyymmdd}-${suffix}`;
}

function buildOrder(formData) {
  const total = AppState.cart.total + CONFIG.DELIVERY_FEE;
  return {
    OrderID: generateOrderId(),
    Timestamp: new Date().toISOString(),
    CustomerName: formData.get('name').trim(),
    Phone: formData.get('phone').trim(),
    Address: formData.get('address').trim(),
    Items: JSON.stringify(
      AppState.cart.items.map(i => ({
        name: i.name,
        qty: i.qty,
        price: i.price,
        variant: i.variant || null,
        subtotal: i.price * i.qty
      }))
    ),
    Total: total,
    Notes: formData.get('notes').trim() || '',
    Status: 'Pending'
  };
}

// ===================== FORM SUBMIT & RETRY QUEUE =====================
async function handleFormSubmit(e) {
  e.preventDefault();
  if (AppState.ui.isSubmitting) return;
  if (!validateForm()) return;

  if (!AppState.isOpen) {
    showToast('Restaurant is currently closed. Please try again later.', 'warning');
    return;
  }

  const formData = new FormData(document.getElementById('checkout-form'));
  const order = buildOrder(formData);
  order.apiKey = CONFIG.API_KEY;

  setLoadingState(true);

  if (!CONFIG.GAS_URL) {
    await new Promise(r => setTimeout(r, 1000));
    onOrderSuccess(order.OrderID);
    setLoadingState(false);
    return;
  }

  try {
    const res = await apiRequest(CONFIG.GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(order)
    });

    if (res.ok) {
      onOrderSuccess(order.OrderID);
    } else {
      if (res.message === 'Network error. Please try again.') {
        queueFailedOrder(order);
        onOrderSuccess(order.OrderID);
        showToast('Order saved! Will finish syncing when online.', 'info');
      } else {
        showToast('Error: ' + res.message, 'error');
      }
    }
  } catch (err) {
    console.error('Order submission crashed:', err);
    showToast('An unexpected error occurred.', 'error');
  } finally {
    setLoadingState(false);
  }
}

function queueFailedOrder(order) {
  try {
    let queue = [];
    try {
      queue = JSON.parse(localStorage.getItem('jirgah_failed_orders') || '[]');
    } catch {
      localStorage.removeItem('jirgah_failed_orders'); // Clear corrupted data
    }
    queue.push(order);
    localStorage.setItem('jirgah_failed_orders', JSON.stringify(queue));
  } catch (e) {
    console.warn('Queue error (LocalStorage might be full):', e);
  }
}

async function processFailedOrders() {
  if (!CONFIG.GAS_URL) return;
  
  let queue = [];
  try {
    queue = JSON.parse(localStorage.getItem('jirgah_failed_orders') || '[]');
  } catch (e) { 
    localStorage.removeItem('jirgah_failed_orders');
    return; 
  }
  
  if (!Array.isArray(queue) || queue.length === 0) return;

  console.log(`Processing ${queue.length} failed order(s) in background...`);
  
  const stillFailed = [];
  
  for (const order of queue) {
    order.retryCount = (order.retryCount || 0) + 1;
    
    if (order.retryCount > CONFIG.MAX_RETRY_COUNT) {
      console.error(`Dropping order ${order.OrderID} after ${CONFIG.MAX_RETRY_COUNT} failed retries.`);
      continue;
    }
    
    try {
      const res = await apiRequest(CONFIG.GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(order)
      });
      
      if (!res.ok && res.message !== 'Duplicate order ignored') {
        throw new Error(res.message || 'Retry failed');
      }
      console.log(`Queued order ${order.OrderID} successfully synced`);
    } catch (e) {
      console.warn(`Retry ${order.retryCount}/${CONFIG.MAX_RETRY_COUNT} failed for ${order.OrderID}`, e);
      stillFailed.push(order);
    }
  }
  
  try {
    if (stillFailed.length > 0) {
      localStorage.setItem('jirgah_failed_orders', JSON.stringify(stillFailed));
      setTimeout(processFailedOrders, CONFIG.RETRY_DELAY_MS);
    } else {
      localStorage.removeItem('jirgah_failed_orders');
    }
  } catch (e) {
    console.error('Failed to update retry queue in LocalStorage:', e);
  }
}

function setLoadingState(loading) {
  AppState.ui.isSubmitting = loading;
  const btn = document.getElementById('place-order-btn');
  const icon = document.getElementById('order-btn-icon');
  const text = document.getElementById('order-btn-text');
  btn.disabled = loading;
  if (loading) {
    icon.textContent = 'hourglass_top';
    text.textContent = 'Placing Order...';
  } else {
    const total = AppState.cart.total + CONFIG.DELIVERY_FEE;
    icon.textContent = 'check_circle';
    text.textContent = `Place Order (${CONFIG.CURRENCY} ${total.toLocaleString()})`;
  }
}

function onOrderSuccess(orderId) {
  closeCheckout();
  clearCart();
  showSuccessScreen(orderId);
  showToast('Order placed!', 'success');
}

function clearCart() {
  AppState.cart.items = [];
  recalculateCart();
  persistCartToStorage();
  renderCartDrawer();
  updateCartBadge();
}

function showSuccessScreen(orderId) {
  document.getElementById('success-order-id').textContent = orderId;
  const screen = document.getElementById('success-screen');
  screen.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function resetForNewOrder() {
  const screen = document.getElementById('success-screen');
  screen.style.display = 'none';
  document.body.style.overflow = '';
  document.getElementById('checkout-form').reset();
  document.getElementById('menu').scrollIntoView({ behavior: 'smooth' });
}

// ===================== ORDER TRACKING =====================
let trackingLock = false;

async function handleTrackOrderSubmit() {
  if (trackingLock) return;
  trackingLock = true;
  setTimeout(() => { trackingLock = false; }, 2000);

  const orderIdInput = document.getElementById('track-order-id').value.trim().toUpperCase();
  const phoneInput = document.getElementById('track-phone').value.trim();

  document.getElementById('track-order-id').value = orderIdInput;

  if (!orderIdInput || !phoneInput) {
    showToast('Please enter both Order ID and Phone number', 'warning');
    trackingLock = false;
    return;
  }

  const btn = document.getElementById('track-order-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="material-symbols-outlined animate-spin">progress_activity</span>';

  const orderId = orderIdInput;
  const phone = phoneInput;

  try {
    const res = await apiRequest(`${CONFIG.GAS_URL}?orderId=${encodeURIComponent(orderId)}&phone=${encodeURIComponent(phone)}`);

    if (res.ok && res.data.order) {
      showTrackingResult(res.data.order);
    } else {
      document.getElementById('tracking-result-content').innerHTML = `
        <div class="text-center py-8">
          <span class="material-symbols-outlined text-6xl text-error mb-4">search_off</span>
          <h4 class="text-lg font-bold text-on-surface mb-2">Order Not Found</h4>
          <p class="text-sm text-on-surface-variant">Please check your Order ID and phone number and try again.</p>
        </div>
      `;
      document.getElementById('tracking-result-modal').classList.remove('hidden');
      document.getElementById('tracking-result-modal').style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
  } catch (err) {
    showToast('Failed to track order. Please try again.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="material-symbols-outlined">search</span> Track';
  }
}

function showTrackingResult(order) {
  const modal = document.getElementById('tracking-result-modal');
  const content = document.getElementById('tracking-result-content');

  let historyHtml = '';
  if (order.StatusHistory && order.StatusHistory.length > 0) {
    historyHtml = `
      <div class="mt-6">
        <h4 class="text-sm font-bold text-primary mb-4">Order Timeline</h4>
        <div class="space-y-4">
          ${order.StatusHistory.map((h, idx) => {
            const stepIndex = STATUS_STEPS.findIndex(s => s.key === h.status);
            const isActive = idx === order.StatusHistory.length - 1;
            return `
              <div class="flex items-start gap-4">
                <div class="flex flex-col items-center">
                  <div class="w-8 h-8 rounded-full flex items-center justify-center ${isActive ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-primary'}">
                    <span class="material-symbols-outlined text-sm">${STATUS_STEPS[stepIndex]?.icon || 'check'}</span>
                  </div>
                  ${idx < order.StatusHistory.length - 1 ? '<div class="w-0.5 h-8 bg-primary/30"></div>' : ''}
                </div>
                <div class="flex-1 pb-4">
                  <p class="font-semibold text-sm">${h.status}</p>
                  <p class="text-xs text-on-surface-variant">${formatTrackingTime(h.time)}</p>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  content.innerHTML = `
    <div class="text-center mb-6">
      <div class="w-16 h-16 mx-auto rounded-full flex items-center justify-center ${getStatusBgClass(order.Status)}">
        <span class="material-symbols-outlined text-3xl">${getStatusIcon(order.Status)}</span>
      </div>
      <h3 class="text-xl font-bold mt-4">${esc(order.Status)}</h3>
      <p class="text-sm text-on-surface-variant mt-1">Order #${esc(order.OrderID)}</p>
    </div>
    <div class="bg-surface-container-low rounded-xl p-4 mb-4">
      <div class="flex justify-between items-center">
        <span class="text-sm text-on-surface-variant">Customer</span>
        <span class="text-sm font-semibold">${esc(order.CustomerName)}</span>
      </div>
      <div class="flex justify-between items-center mt-2">
        <span class="text-sm text-on-surface-variant">Total</span>
        <span class="text-sm font-bold text-primary">${CONFIG.CURRENCY} ${Number(order.Total).toLocaleString()}</span>
      </div>
      ${order.itemCount ? `
      <div class="flex justify-between items-center mt-2">
        <span class="text-sm text-on-surface-variant">Items</span>
        <span class="text-sm font-semibold">${order.itemCount} item${order.itemCount > 1 ? 's' : ''}</span>
      </div>
      ` : ''}
    </div>
    ${historyHtml}
    ${order.LastUpdated ? `
    <p class="text-xs text-on-surface-variant/60 text-center mt-4">
      Last updated: ${formatTrackingTime(order.LastUpdated)}
    </p>
    ` : ''}
  `;

  modal.classList.remove('hidden');
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeTrackingModal() {
  const modal = document.getElementById('tracking-result-modal');
  modal.classList.add('hidden');
  modal.style.display = 'none';
  document.body.style.overflow = '';
}

function getStatusBgClass(status) {
  if (status === 'Delivered') return 'bg-green-500/20 text-green-400';
  if (status === 'Cancelled') return 'bg-red-500/20 text-red-400';
  if (status === 'Out for Delivery') return 'bg-blue-500/20 text-blue-400';
  if (status === 'Preparing') return 'bg-orange-500/20 text-orange-400';
  if (status === 'Accepted') return 'bg-yellow-500/20 text-yellow-400';
  return 'bg-surface-container-high text-on-surface-variant';
}

function getStatusIcon(status) {
  if (status === 'Delivered') return 'check_circle';
  if (status === 'Cancelled') return 'cancel';
  if (status === 'Out for Delivery') return 'delivery_dining';
  if (status === 'Preparing') return 'restaurant';
  if (status === 'Accepted') return 'thumb_up';
  return 'receipt';
}

function formatTrackingTime(ts) {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    return d.toLocaleString('en-PK', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch { return ts; }
}

// ===================== LOCAL STORAGE =====================
function persistCartToStorage() {
  try {
    localStorage.setItem('jirgah_cart', JSON.stringify(AppState.cart.items));
  } catch (e) {}
}

function hydrateCartFromStorage() {
  try {
    const stored = localStorage.getItem('jirgah_cart');
    if (!stored) return;
    const items = JSON.parse(stored);
    if (!Array.isArray(items)) return;
    AppState.cart.items = items.filter(i => i.cartId && i.name && i.price && i.qty);
    recalculateCart();
  } catch (e) {}
}

// ===================== TOAST SYSTEM =====================
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const colors = {
    success: 'bg-[#1c1b1b] border-l-4 border-primary text-on-surface',
    error: 'bg-[#1c1b1b] border-l-4 border-error text-on-surface',
    warning: 'bg-[#1c1b1b] border-l-4 border-[#d4af37] text-on-surface',
    info: 'bg-[#1c1b1b] border-l-4 border-[#99907c] text-on-surface',
  };
  const icons = { success: 'check_circle', error: 'error', warning: 'warning', info: 'info' };
  const iconColors = { success: 'text-primary', error: 'text-error', warning: 'text-[#d4af37]', info: 'text-outline' };

  const toast = document.createElement('div');
  toast.className = `toast-in pointer-events-all flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl min-w-[240px] max-w-[340px] ${colors[type] || colors.info}`;
  toast.innerHTML = `
    <span class="material-symbols-outlined text-lg flex-shrink-0 ${iconColors[type]}" style="font-variation-settings:'FILL' 1;">${icons[type]}</span>
    <span class="text-sm font-body flex-1">${esc(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.remove('toast-in');
    toast.classList.add('toast-out');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, 4500);
}

// ===================== SECURITY HELPER =====================
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
