// config/config.js — Jirgah Configuration
// Edit this file to customize your deployment

window.JIRGAH_CONFIG = {
  // ===== DEPLOYMENT =====
  // Your deployed Google Apps Script URL
  GAS_URL: "https://script.google.com/macros/s/AKfycbyw0McGtKrrApb0YURZHapoiZ8Qq_-iRXmmV0H5o55zc8BEOZR-LURW5Dgm8-zRsMQ5/exec",
  
  // Must match backend API_KEY (keep as-is unless you changed it in apps-script.js)
  API_KEY: "JIRGAH_SECURE_2026",

  // ===== BRANDING =====
  RESTAURANT_NAME: "Jirgah",
  RESTAURANT_TAGLINE: "The Royal Heritage of Peshawar",
  
  // ===== PRICING =====
  DELIVERY_FEE: 100,
  CURRENCY: "Rs.",
  CURRENCY_SYMBOL: "₨",

  // ===== ADMIN SECURITY =====
  // Simple password (not hashed for easy owner use)
  ADMIN_PASSWORD: "admin",

  // ===== POLLING SETTINGS =====
  POLL_INTERVAL_MS: 30000,

  // ===== RETRY SETTINGS =====
  MAX_RETRY_COUNT: 5,
  RETRY_DELAY_MS: 5000,

  // ===== ORDER SETTINGS =====
  DEFAULT_ORDER_STATUS: "Pending",

  // ===== UI SETTINGS =====
  ITEMS_PER_PAGE: 10,
  TOAST_DURATION_MS: 4500,
};

// Validation helper
function validateJirgahConfig() {
  const REQUIRED = ["GAS_URL", "API_KEY", "RESTAURANT_NAME", "DELIVERY_FEE", "ADMIN_PASSWORD"];
  const missing = REQUIRED.filter(key => {
    const value = JIRGAH_CONFIG[key];
    return !value || (typeof value === "string" && value.trim() === "") || value === "PASTE_YOUR_GAS_URL_HERE";
  });
  
  if (missing.length > 0) {
    console.error("Jirgah Config Error: Missing or invalid values:", missing.join(", "));
    alert("Configuration Error: Please check config/config.js\nMissing: " + missing.join(", "));
    return false;
  }
  return true;
}

// Auto-validate on load
if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    if (!validateJirgahConfig()) {
      console.error("Jirgah configuration validation failed");
    }
  });
}