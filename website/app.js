// app.js — Jirgah Customer Website Application Logic
// Implements: Cart, Checkout, Order Submission, Toast, Feedback
// Per implementation_plan.md.resolved §1–§8

'use strict';

// ===================== CONFIG =====================
const CONFIG = {
  GAS_URL: 'https://script.google.com/macros/s/AKfycbyvcqmG61-nZ8iU8b4u5M3riIPcI-X50-s90a1TjjOT2NfHDOJlVjw_V7EXJZWHp9-M9A/exec', // TODO: paste your deployed Google Apps Script URL here
  API_KEY: 'JIRGAH_SECURE_2026', // Must match backend string
  DELIVERY_FEE: 100,
  CURRENCY: 'Rs.',
};

const CATEGORIES = [
  'All', 'Bar B Q', 'Rolls', 'Broasts', 'Sandwiches', 'Burgers', 'Parathas',
  'Flavoured Fries', 'Special Mayonatic Fries', 'Pizza Special Flavors',
  'Pizza Traditional Flavors', 'Oven Baked Pasta', 'Extras'
];

// ===================== STATE =====================
const AppState = {
  cart: {
    items: [],    // [{ id, name, price, qty, image, variant }]
    total: 0,     // subtotal (no delivery fee)
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
  }
};

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', async () => {
  hydrateCartFromStorage();
  processFailedOrders(); // Run background retry queue immediately
  renderCategoryTabs();
  
  // 1. Initial Instant Render (using local menu.js or storage)
  renderMenuGrid(AppState.ui.activeCategory);
  renderCartDrawer();
  updateCartBadge();
  bindEvents();
  
  // 2. Background Sync (don't "await" so user is never blocked)
  fetchMenu();
});

async function fetchMenu() {
  if (!CONFIG.GAS_URL) return;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000); // 15s max for GAS cold start
  try {
    const res = await fetch(`${CONFIG.GAS_URL}?t=${Date.now()}`, { signal: controller.signal });
    clearTimeout(timeout);
    const data = await res.json();
    if (data.status === 'success' && data.menu && data.menu.length > 0) {
      window.LIVE_MENU = data.menu.map(item => ({
        id: item.ID,
        category: item.Category,
        name: item.Name,
        description: item.Description,
        price: parseFloat(item.Price),
        image: item.Image,
        badge: item.Badge,
        variants: (() => { try { return JSON.parse(item.Variants_JSON || '[]'); } catch { return []; } })()
      }));
      AppState.ui.menuLoaded = true;
      
      // 3. Silent Update: Re-render the menu grid now that fresh prices are here
      console.log('Menu updated from Sheet.');
      renderMenuGrid(AppState.ui.activeCategory);
    } else {
      console.warn('Live menu empty or unavailable — using local menu.');
    }
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      console.warn('fetchMenu timed out — using local menu as fallback.');
    } else {
      console.error('fetchMenu failed:', err);
    }
  }
}

// ===================== EVENT BINDING =====================
function bindEvents() {
  // Cart open/close
  document.getElementById('cart-btn').addEventListener('click', openCartDrawer);
  document.getElementById('cart-close-btn').addEventListener('click', closeCartDrawer);
  document.getElementById('cart-overlay').addEventListener('click', closeCartDrawer);

  // Checkout open/close
  document.getElementById('checkout-btn').addEventListener('click', openCheckout);
  document.getElementById('modal-close-btn').addEventListener('click', closeCheckout);
  document.getElementById('modal-backdrop').addEventListener('click', closeCheckout);

  // Form submission
  document.getElementById('checkout-form').addEventListener('submit', handleFormSubmit);

  // Clear errors on focus
  ['field-name', 'field-phone', 'field-address'].forEach(id => {
    document.getElementById(id).addEventListener('focus', () => clearFieldError(id));
  });

  // New order
  document.getElementById('new-order-btn').addEventListener('click', resetForNewOrder);

  // Event delegation: cart item interactions
  document.getElementById('cart-items-list').addEventListener('click', handleCartInteraction);

  // Category tab clicks (delegated)
  document.getElementById('category-tabs').addEventListener('click', handleCategoryClick);

  // Menu container: Add to Cart (delegated — must be on document since container is re-rendered)
  document.addEventListener('click', handleMenuClick);
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

  // Use live menu if loaded, otherwise fallback to static MENU
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
      return `
      <div class="group relative bg-surface-container-low rounded-lg overflow-hidden transition-all duration-500 hover:shadow-[0_20px_40px_rgba(0,0,0,0.6)] ${offset}">
        <div class="aspect-[4/3] overflow-hidden relative">
          <img alt="${item.name}" loading="lazy"
            class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            src="${item.image}"/>
          ${item.badge ? `<div class="absolute top-4 left-4">
            <span class="px-3 py-1 bg-secondary-container text-on-secondary-container text-[10px] font-bold rounded-full uppercase tracking-tighter">${item.badge}</span>
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
            class="add-to-cart-btn w-full py-3 rounded-xl border border-primary/20 text-primary font-label font-bold text-sm hover:bg-primary hover:text-on-primary transition-all duration-300 flex items-center justify-center gap-2 active:scale-95">
            <span class="material-symbols-outlined text-sm">add</span>
            Add to Cart
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
  if (!btn) return;
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
  showToast(`${itemName} added ✓`, 'success');
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
  AppState.cart.total = AppState.cart.items.reduce((sum, i) => sum + (i.price * i.qty), 0);
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

  // Update place order button total
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
      void badge.offsetWidth; // reflow
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
  // Reset form errors
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

  // Phone: must be non-empty and contain only digits, +, -
  if (!phone) {
    showFieldError('field-phone', 'error-phone', 'Phone number is required');
    valid = false;
  } else if (!/^[0-9+\-]+$/.test(phone)) {
    showFieldError('field-phone', 'error-phone', 'Only digits, + and - are allowed (no spaces)');
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
    Total: total,          // number — includes delivery fee
    Notes: formData.get('notes').trim() || '',
    Status: 'Pending'
  };
}

// ===================== FORM SUBMIT & RETRY QUEUE =====================
async function handleFormSubmit(e) {
  e.preventDefault();
  if (AppState.ui.isSubmitting) return;
  if (!validateForm()) return;

  const formData = new FormData(document.getElementById('checkout-form'));
  const order = buildOrder(formData);
  // Inject security key
  order.apiKey = CONFIG.API_KEY;

  setLoadingState(true);

  if (!CONFIG.GAS_URL) {
    await new Promise(r => setTimeout(r, 1000));
    onOrderSuccess(order.OrderID);
    setLoadingState(false);
    return;
  }

  try {
    const res = await fetch(CONFIG.GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(order)
    });

    const data = await res.json();
    if (data.status === 'success') {
      onOrderSuccess(order.OrderID);
    } else {
      throw new Error(data.message || 'Server returned an error');
    }
  } catch (err) {
    console.error('Order submission failed natively:', err);
    
    // If it's a network failure or CORS block (e.g., offline), we queue it.
    // If it's a server logic error (e.g. Invalid API Key), we don't queue.
    if (err instanceof TypeError || err.message === 'Failed to fetch') {
      queueFailedOrder(order);
      onOrderSuccess(order.OrderID);
      showToast('Order saved! Will finish syncing when online.', 'info');
    } else {
      showToast('Backend Error: ' + err.message, 'error');
    }
  } finally {
    setLoadingState(false);
  }
}

function queueFailedOrder(order) {
  try {
    const queue = JSON.parse(localStorage.getItem('jirgah_failed_orders') || '[]');
    queue.push(order);
    localStorage.setItem('jirgah_failed_orders', JSON.stringify(queue));
  } catch (e) {
    console.warn('Queue error:', e);
  }
}

async function processFailedOrders() {
  if (!CONFIG.GAS_URL) return;
  
  let queue = [];
  try {
    queue = JSON.parse(localStorage.getItem('jirgah_failed_orders') || '[]');
  } catch (e) { return; }
  
  if (queue.length === 0) return;

  console.log(`Processing ${queue.length} failed order(s) in background...`);
  
  const stillFailed = [];
  
  for (const order of queue) {
    try {
      const res = await fetch(CONFIG.GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(order)
      });
      const data = await res.json();
      if (data.status !== 'success') {
        throw new Error(data.message || 'Retry failed');
      }
      console.log(`Queued order ${order.OrderID} successfully synced`);
    } catch (e) {
      console.warn(`Retry failed for ${order.OrderID}`, e);
      order.retryCount = (order.retryCount || 0) + 1;
      if (order.retryCount <= 5) {
        stillFailed.push(order);
      } else {
        console.error(`Permanently dropping order ${order.OrderID} after 5 failed retries.`);
      }
    }
  }
  
  if (stillFailed.length > 0) {
    localStorage.setItem('jirgah_failed_orders', JSON.stringify(stillFailed));
  } else {
    localStorage.removeItem('jirgah_failed_orders');
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
  showToast('Order placed! 🎉', 'success');
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

// ===================== LOCAL STORAGE =====================
function persistCartToStorage() {
  try {
    localStorage.setItem('jirgah_cart', JSON.stringify(AppState.cart.items));
  } catch (e) { /* ignore storage errors */ }
}

function hydrateCartFromStorage() {
  try {
    const stored = localStorage.getItem('jirgah_cart');
    if (!stored) return;
    const items = JSON.parse(stored);
    // Validate: each item must have required fields
    if (!Array.isArray(items)) return;
    AppState.cart.items = items.filter(i => i.cartId && i.name && i.price && i.qty);
    recalculateCart();
  } catch (e) { /* ignore parse errors */ }
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
    <span class="text-sm font-body flex-1">${message}</span>`;
  container.appendChild(toast);

  // Auto-dismiss after 4500ms
  setTimeout(() => {
    toast.classList.remove('toast-in');
    toast.classList.add('toast-out');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, 4500);
}
