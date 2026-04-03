# Jirgah — Restaurant Ordering System

## 🧾 OVERVIEW

Jirgah is a complete, lightweight, production-ready restaurant ordering system consisting of:

1. **Customer-Facing Website**
2. **Admin Panel Web App**
3. **Google Sheets Backend (via Apps Script)**

The system is designed to handle **real-time food ordering operations** with minimal infrastructure.

---

## 🎯 OBJECTIVE

To build a fast, reliable, and scalable ordering platform that allows:

* Customers to place orders بسهولة
* Staff to manage orders efficiently
* Owners to track performance and revenue

---

## 🏗️ SYSTEM ARCHITECTURE

```
Customer Website
        ↓
Google Apps Script API
        ↓
Google Sheets (Database)
        ↓
Admin Panel Dashboard
```

---

## 🌐 CUSTOMER WEBSITE

### Purpose:

* Menu browsing
* Cart management
* Order placement

### Key Features:

#### 🍽️ Menu System

* Categorized items (Biryani, Karahi, BBQ, etc.)
* Add-to-cart functionality

#### 🛒 Cart System

* Live updates
* Quantity control
* Auto total calculation

#### 🧾 Checkout

* Customer details form
* Validation
* Notes support

#### 📦 Order Submission

* Sends data to backend
* Generates unique Order ID

#### ✅ Feedback System

* Success screen
* Error handling
* Toast notifications

---

## 📊 ADMIN PANEL WEB APP

### Purpose:

* Operational control center

### Key Features:

#### 📦 Orders Table

* Real-time order viewing
* Sorting, filtering, search
* Expandable order details

#### 🔄 Status Management

* Pending → Delivered → Cancelled
* Instant UI update + backend sync

#### 📊 Dashboard Metrics

* Revenue
* Order counts
* Popular items
* Peak hours

#### 📈 Analytics

* Orders per hour
* Status distribution
* Top-selling items

#### 🔔 Notifications

* New orders alert
* System feedback

---

## 🗄️ BACKEND (GOOGLE APPS SCRIPT)

### Responsibilities:

* Accept new orders (POST)
* Store in Google Sheets
* Handle status updates

### Why this approach:

* No server maintenance
* Free and scalable for MVP
* Easy integration

---

## 📦 DATA STRUCTURE

Each order follows:

```
{
  OrderID: string,
  Timestamp: string,
  CustomerName: string,
  Phone: string,
  Address: string,
  Items: string,
  Total: number,
  Notes: string,
  Status: string
}
```

---

## 📁 PROJECT STRUCTURE

```
/project-root

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

  /backend
    apps-script.js (to be deployed separately)
```

---

## 🚀 BUILD PLAN (A → Z)

### PHASE 1 — FOUNDATION

* Define UI system
* Set up file structure
* Create static layouts

---

### PHASE 2 — WEBSITE DEVELOPMENT

* Build menu UI
* Implement cart logic
* Add checkout flow
* Integrate API submission
* Add validation & feedback

---

### PHASE 3 — BACKEND SETUP

* Create Google Sheet schema
* Write Apps Script:

  * doGet (fetch orders)
  * doPost (create/update)
* Deploy as Web App

---

### PHASE 4 — ADMIN PANEL

* Build dashboard UI
* Implement table rendering
* Add sorting/filter/search
* Add status updates
* Integrate API

---

### PHASE 5 — ANALYTICS

* Implement calculations
* Add Chart.js visualizations
* Optimize performance

---

### PHASE 6 — INTEGRATION

* Connect website → backend
* Connect admin → backend
* Test full flow

---

### PHASE 7 — TESTING

* End-to-end order flow
* Error scenarios
* Mobile responsiveness

---

### PHASE 8 — DEPLOYMENT

* Website → Vercel / Netlify
* Admin panel → secure route
* Backend → Google Apps Script

---

## ⚡ PERFORMANCE GOALS

* Fast load times
* Smooth interactions
* No UI lag
* Efficient DOM updates

---

## 📱 RESPONSIVENESS

* Fully mobile-first
* Touch-friendly interactions
* Adaptive layouts

---

## 🔐 SECURITY CONSIDERATIONS

* No sensitive data stored client-side
* Validate inputs before submission
* Protect Apps Script endpoint (optional improvements)

---

## 🧪 TESTING CHECKLIST

### Website:

* Cart works
* Orders submit correctly
* Validation triggers properly

### Admin:

* Orders load
* Status updates sync
* Charts render
* Auto-refresh works

---

## 🔮 FUTURE IMPROVEMENTS

* Authentication for admin
* Payment gateway integration
* Live order tracking
* Push notifications
* Multi-branch support

---

## 🧠 FINAL NOTE

This system is designed to be:

* Simple to deploy
* Easy to maintain
* Scalable for real-world use

Every component must work seamlessly together to support **real restaurant operations under load**.
