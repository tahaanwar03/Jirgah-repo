# Jirgah Ordering System — Setup Guide

This guide will help you set up your restaurant ordering system in under 15 minutes.

No technical knowledge is required.

You will set up:

*   Customer ordering website
*   Admin dashboard
*   Order storage system (Google Sheets)

---

## What You Received

You should have a folder named `jirgah/` containing:

*   `/website` → Customer website
*   `/admin` → Admin dashboard
*   `/backend` → Google Apps Script file
*   `/config` → Configuration file

---

## Step 1 — Create Database

1.  Go to [Google Sheets](https://sheets.google.com).
2.  Create a new sheet.
3.  Name it exactly: `Jirgah_Orders`.

*(Keep it dead simple. You do not need to add any columns or headers—the system will do this automatically!)*

---

## Step 2 — Setup Backend

1.  Open your `Jirgah_Orders` Google Sheet.
2.  Click on the top menu: **Extensions** → **Apps Script**.
3.  Delete all existing code in the editor that appears.
4.  Copy all the text from the `backend/apps-script.js` file in your folder, and paste it into the Apps Script editor.
5.  Click **Deploy** (top right) → **New Deployment**.
6.  Choose the following settings:
    *   **Type:** Web App (click the gear icon to select this)
    *   **Execute as:** Me
    *   **Who has access:** Anyone
7.  Click **Deploy**. You may be asked to authorize access; click "Review Permissions", select your Google account, click "Advanced", and proceed.
8.  Copy the **Web App URL** provided at the end of the deployment. 

*(This URL is your `GAS_URL` for the next step).*

---

## Step 3 — Configure System

1.  Open the file: `config/config.js` (you can open this in Notepad, TextEdit, or any code editor).
2.  Update the following values:
    *   `GAS_URL` → Paste the Apps Script URL you copied in Step 2.
    *   `API_KEY` → Keep as is (or change to a secure password of your choice).
    *   `RESTAURANT_NAME` → Your restaurant's name.
    *   `DELIVERY_FEE` → Your standard delivery charge.
    *   `ADMIN_PASSWORD` → The password you will use to log into the admin dashboard.

Save the file when you are done.

---

## Step 4 — Deploy Website

You can publish this easily for free using GitHub Pages:

1.  Upload the entire project folder to a repository on GitHub.
2.  Go to the repository **Settings** → **Pages**.
3.  Under "Build and deployment", select:
    *   **Branch:** `main`
    *   **Folder:** `/root`
4.  Click **Save**.

Your customer website will be live at:
`https://yourusername.github.io/repository-name/website/`

---

## Step 5 — Admin Panel

Your admin dashboard will be live at:
`https://yourusername.github.io/repository-name/admin/`

1.  Open the link.
2.  Login using the `ADMIN_PASSWORD` you set in Step 3.

---

## Step 6 — Test Your System

*(Do not skip this step!)*

1.  Open your customer website.
2.  Place a test order.
3.  Open your Admin Panel.
4.  Confirm the order appears.
5.  Change the order status to "Accepted".

If this works → your system is ready for real customers!

---

## Daily Usage

*   Keep the Admin Panel open on a tablet or computer during business hours.
*   Update order statuses as they progress in the kitchen to keep customers informed.
*   Use the **Backup Now** button (at the bottom of the Analytics page) daily to create safe snapshots of your data.

---

## Important Notes

*   **Do not delete your Google Sheet.**
*   **Do not change the names of the columns in the Google Sheet.**
*   Keep your `API_KEY` private.
*   Change your `ADMIN_PASSWORD` after initial setup if someone else set this up for you.

---

## Troubleshooting

**Orders not showing up in Admin Panel:**
→ Check that the `GAS_URL` in `config/config.js` exactly matches the deployment URL from Step 2.

**Website not loading or showing errors:**
→ Check your GitHub Pages deployment settings.

**Admin Panel won't let me log in:**
→ Double-check the `ADMIN_PASSWORD` in `config/config.js`. Note: if you enter it wrong 3 times, you will be locked out for 30 seconds.
