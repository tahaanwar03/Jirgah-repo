# AGENTS.md — System Rules & Engineering Guidelines

## 🎯 PURPOSE

This document defines the **rules, constraints, architecture discipline, and behavioral expectations** for all AI agents or developers working on the Jirgah project.

The goal is to ensure:

* Consistency
* Reliability
* Scalability
* Clean architecture
* Zero broken flows

This is a **greenfield build**. No assumptions about prior progress.

---

## 🧠 CORE PRINCIPLES

1. **Production-first mindset**

   * No placeholder logic
   * No pseudo-code
   * Every feature must be functional

2. **Single source of truth**

   * Google Sheets = backend database
   * Frontend reflects backend state

3. **Fail gracefully**

   * Every API call must handle failure
   * UI must never break

4. **Performance over complexity**

   * Prefer vanilla JS over heavy frameworks
   * Avoid unnecessary abstractions

5. **UX is critical**

   * Every action must give feedback
   * No dead clicks
   * No confusion states

---

## 🏗️ SYSTEM ARCHITECTURE

### Components:

1. **Customer Website (Frontend)**

   * Menu browsing
   * Cart system
   * Checkout
   * Order submission

2. **Google Apps Script (Backend)**

   * Receives orders (POST)
   * Stores in Google Sheets
   * Handles status updates

3. **Admin Panel (Frontend Dashboard)**

   * Displays orders
   * Updates status
   * Shows analytics

---

## 📦 DATA CONTRACT (STRICT)

All agents MUST follow this structure exactly:

```
{
  OrderID: string,
  Timestamp: string,
  CustomerName: string,
  Phone: string,
  Address: string,
  Items: string (JSON),
  Total: number,
  Notes: string,
  Status: "Pending" | "Delivered" | "Cancelled"
}
```

### RULES:

* `Items` MUST be JSON.stringified
* `Total` MUST be numeric
* `Status` MUST default to `"Pending"`

---

## 🔐 ORDER ID FORMAT

```
JR-YYYYMMDD-XXXX
```

Rules:

* Unique
* Incremental or random 4-digit suffix
* Generated on frontend before submission

---

## 🌐 API RULES

### GET (Fetch Orders)

* Must accept multiple formats:

  * Array
  * `{ orders: [] }`
  * `{ data: [] }`

### POST (Create Order)

```
POST → Google Apps Script
Body: Order Object
```

### POST (Update Status)

```
{
  action: "updateStatus",
  orderId: string,
  status: string
}
```

---

## ⚠️ ERROR HANDLING RULES

Every API interaction must:

* Use try/catch
* Show user feedback
* Never silently fail

Fallback hierarchy:

1. API success
2. Cached data (if exists)
3. Sample data (dev mode only)

---

## 🧩 UI/UX RULES

### Must:

* Be mobile-first
* Provide immediate feedback
* Use consistent color system
* Maintain spacing hierarchy

### Must NOT:

* Freeze UI during API calls
* Hide critical information
* Require unnecessary clicks

---

## 🛒 CART RULES (WEBSITE)

* Cart must update instantly
* Totals must always be accurate
* Prevent checkout if cart empty
* Quantity changes must re-render totals

---

## 📋 FORM VALIDATION RULES

Required fields:

* Name
* Phone
* Address

Validation:

* No empty values
* Phone must be numeric (basic validation)

---

## 🔄 STATE MANAGEMENT RULES

* Use in-memory state (JS variables)
* Optional: localStorage for persistence
* No global pollution
* Keep functions pure where possible

---

## 📊 ADMIN PANEL RULES

### Orders Table:

* Must support sorting, filtering, search
* Must render efficiently
* Must not re-render unnecessarily

### Status Updates:

* Instant UI update
* Backend sync in parallel
* Fail-safe handling

---

## 📈 ANALYTICS RULES

* Must recalculate on every data refresh
* Charts must be destroyed before re-render
* No memory leaks

---

## 🔁 AUTO REFRESH RULES

* Interval: 30 seconds
* Must not duplicate timers
* Must not interrupt user interaction

---

## 🔔 NOTIFICATIONS RULES

* Toast system required
* Auto-dismiss after ~5 seconds
* Must cover:

  * Success
  * Errors
  * New orders

---

## ⚡ PERFORMANCE RULES

* Avoid full DOM re-renders
* Use minimal event listeners
* Debounce search input

---

## 📱 RESPONSIVENESS RULES

* Mobile-first layout
* Tables must adapt or scroll
* Cart must be usable with one hand

---

## 📂 FILE ORGANIZATION RULES

Strict separation:

```
/website
  index.html
  styles.css
  app.js
  menu.js

/admin
  index.html
  styles.css
  app.js
  sampledata.js
```

---

## 🧪 TESTING REQUIREMENTS

Agents MUST verify:

### Website:

* Add/remove cart items
* Correct totals
* Order submission
* Validation errors

### Admin:

* Data fetch works
* Sorting/filter/search works
* Status updates persist
* Charts render correctly

---

## 🚫 PROHIBITED PRACTICES

* No inline JS in HTML
* No hardcoded backend URLs (must be config-based)
* No blocking UI threads
* No unused code

---

## ✅ DEFINITION OF DONE

A feature is complete ONLY IF:

* Fully functional
* Error-handled
* Responsive
* Tested manually
* Integrated with system

---

## 🧠 FINAL RULE

Agents must think like:

> “This will be used in a real restaurant during peak hours.”

No compromise on reliability or clarity.
