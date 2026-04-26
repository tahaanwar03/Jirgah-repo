// config/config.example.js — Jirgah Central Configuration Template
// Rename this file to 'config.js' and fill in your details

window.JIRGAH_CONFIG = {
  // ===== DEPLOYMENT =====
  // Your deployed Google Apps Script URL (Paste your URL here)
  GAS_URL: "",
  
  // Must match backend API_KEY (keep as-is unless you changed it in apps-script.js)
  API_KEY: "JIRGAH_SECURE_2026",

  // ===== RESTAURANT INFO =====
  DELIVERY_FEE: 100,
  CURRENCY: "Rs.",
  CURRENCY_SYMBOL: "₨",

  // ===== ADMIN SECURITY =====
  // ⚠️ CHANGE THIS before going live! Use something only the owner knows.
  ADMIN_PASSWORD: "changeme",

  // ===== POLLING SETTINGS =====
  // Auto-refresh interval for the Admin dashboard (30 seconds)
  REFRESH_INTERVAL_MS: 30000,
  
  // Max retries for failed customer orders before giving up
  MAX_RETRY_COUNT: 5,
  // Delay between retries in milliseconds (5 seconds)
  RETRY_DELAY_MS: 5000
};
