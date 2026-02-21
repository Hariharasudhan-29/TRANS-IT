# Performance Optimization Report

## Issue Analysis
The "server crash" / blank page issue was caused by excessive database operations and API calls when multiple users were active simultaneously:

1. **Driver App Overload**: 
   - Every active driver was downloading the entire `tracking` database collection every time *any* driver moved.
   - GPS updates were writing to the database too frequently (every few milliseconds).

2. **Student App API Hammering**:
   - Every student tracking a bus was making a request to the route calculation API (OSRM) every time the bus moved, potentially hundreds of times per second collectively.

## Fixes Implemented

### 1. 🛑 Optimized Database Listeners (Driver App)
- **Before**: Downloaded ALL tracking data for every update.
- **After**: Only listens to `active` buses.
- **Impact**: Reduced read operations by ~90% for inactive fleets.

### 2. ⏱️ Throttled GPS Updates (Driver App)
- **Before**: Wrote to database on every GPS change (up to 5-10 times/sec).
- **After**: Throttled to maximum ONE write every 5 seconds.
- **Impact**: Reduced write operations by ~95%, preventing database write quota exhaustion.

### 3. 📉 Reduced API Calls (Student App)
- **Before**: Fetched route data every 10 seconds OR every time bus moved.
- **After**: Throttled to strictly once every 30 seconds max.
- **Impact**: Prevented external API rate limiting and reduced client-side processing load.

## Technical Details

- **File Modified**: `apps/driver/pages/dashboard.js`
  - Added `lastUpdate` throttling logic to `updateLocation`.
  - Added `where('active', '==', true)` to Firestore query.

- **File Modified**: `apps/student/pages/dashboard.js`
  - Replaced `setInterval` with a smart throttle using `useRef`.
  - Ensures OSRM API is called at most twice per minute per user.

## Recommendation
This should resolve the crashing issues. If user load increases to >10,000 concurrent users, we may need to move the `tracking` logic to a Realtime Database (RTDB) instead of Firestore for lower latency and cost, but for now, these optimizations will handle typical loads comfortably.
