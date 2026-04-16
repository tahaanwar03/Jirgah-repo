# Phase 8 — Google Apps Script Trigger Setup

After deploying the updated `apps-script.js`, you must manually create time-driven triggers in the Google Apps Script editor.

## Required Triggers

### 1. Order Queue Processor
Processes orders from `Orders_Queue` sheet and moves them to `Orders_Main`.

**Function:** `processOrderQueue`
**Frequency:** Every 1 minute

### 2. Archive Old Orders
Archives orders older than 3000 rows to `Orders_Archive` sheet.

**Function:** `archiveOldOrders`
**Frequency:** Daily (midnight recommended)

### 3. Cleanup Old Locks
Releases stale edit locks that were never released.

**Function:** `cleanupOldLocks`
**Frequency:** Every 5 minutes

---

## Setup Steps

1. Open your Google Apps Script project
2. Click on the clock icon (Triggers) in the left sidebar
3. Click "+ Add Trigger" for each function below

### Trigger 1: processOrderQueue

| Setting | Value |
|---------|-------|
| Function | `processOrderQueue` |
| Deployment | Head |
| Source | Time-driven |
| Type | Minutes timer |
| Interval | Every minute |

### Trigger 2: archiveOldOrders

| Setting | Value |
|---------|-------|
| Function | `archiveOldOrders` |
| Deployment | Head |
| Source | Time-driven |
| Type | Day timer |
| Time | 12:00 AM - 1:00 AM |

### Trigger 3: cleanupOldLocks

| Setting | Value |
|---------|-------|
| Function | `cleanupOldLocks` |
| Deployment | Head |
| Source | Time-driven |
| Type | Minutes timer |
| Interval | Every 5 minutes |

---

## Verification

After setup, verify by checking:
1. `Orders_Queue` sheet empties within 2 minutes after placing an order
2. `Orders_Main` row count stays under 3500 rows over time
3. `Logs` sheet shows entries from each function

---

## Troubleshooting

**Queue not processing?**
- Check `Logs` sheet for errors
- Verify trigger is active in the Triggers dashboard
- Test function manually by running it from the editor

**Orders not archiving?**
- Archive only triggers when row count exceeds 3000
- Archive runs daily, so wait until next scheduled run
- Manually run `archiveOldOrders()` from editor to test

**Rate limiting too aggressive?**
- Adjust `RATE_LIMIT_MAX` (default: 5 requests per 10 seconds)
- Adjust `RATE_LIMIT_WINDOW` (default: 10 seconds)
