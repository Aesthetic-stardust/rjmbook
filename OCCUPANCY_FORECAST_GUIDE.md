# Occupancy Forecast Guide

## Why is the Occupancy Forecast Not Showing Data?

The occupancy forecast feature uses **Machine Learning (ML)** to predict future room occupancy based on historical data. If no data is showing, it's because the system doesn't have enough historical occupancy snapshots to make predictions.

## Root Causes

### 1. **Insufficient Historical Data**
The ML forecast algorithm requires **at least 7 days** of occupancy data to generate predictions. Without this minimum threshold, the system displays:
> "Not enough historical data yet. Add bookings and use 'Record snapshot' to build prediction history."

### 2. **Empty OccupancySnapshot Table**
The `OccupancySnapshot` table stores daily occupancy rates (how many rooms were occupied each day). This table needs to be populated with historical data for the ML algorithm to analyze trends and make predictions.

### 3. **Seed Data Doesn't Include Snapshots**
When you run `seed.js` or `seed-demo-data.js`, it creates:
- ✅ Rooms and room types
- ✅ Guest users and profiles
- ✅ Bookings (past and future)
- ✅ Feedback and notifications
- ❌ **Occupancy snapshots** (missing!)

The bookings exist in the database, but the ML system needs the snapshots to work.

---

## Solutions

### Option 1: Run the Updated Seed Script (Recommended)

The `seed-demo-data.js` file has been updated to automatically backfill occupancy snapshots.

```bash
node seed-demo-data.js
```

This will:
1. Create all demo data (users, bookings, feedback)
2. **Automatically backfill 90 days of occupancy snapshots**
3. Enable the ML forecast immediately

### Option 2: Run the Backfill Script Manually

If you already have bookings in your database, run the dedicated backfill script:

```bash
node backfill-occupancy-snapshots.js
```

This script:
- Analyzes your existing bookings
- Creates daily occupancy snapshots for the last 90 days
- Calculates occupancy rates for each day
- Enables the ML forecast feature

### Option 3: Use the API Endpoint

You can manually trigger snapshot recording via the API:

```bash
# Record today's snapshot
curl http://localhost:3000/api/analytics/record-snapshot

# Or visit in browser
http://localhost:3000/api/analytics/record-snapshot
```

**Note:** This only records today's snapshot. You need at least 7 days of data for forecasting.

---

## How the Occupancy Forecast Works

### Data Collection
1. **Daily Snapshots**: The system records how many rooms are occupied each day
2. **Historical Analysis**: Looks back at the last 90 days of occupancy data
3. **Pattern Recognition**: Identifies trends (increasing, decreasing, stable)

### ML Algorithm
- Uses **Linear Regression** to analyze historical patterns
- Predicts occupancy rates for the next 14 days
- Accounts for:
  - Confirmed bookings
  - Checked-in guests
  - Early checkouts
  - Cancellation patterns

### Output
The forecast displays:
- **Date**: Each of the next 14 days
- **Predicted Occupancy Rate**: Percentage (0-100%)
- **Trend**: Overall direction (increasing/decreasing)
- **Visual Chart**: Line graph showing the prediction

---

## Verification Steps

After running the backfill script, verify the forecast is working:

### 1. Check Snapshot Count
```bash
# In your database client or via API
SELECT COUNT(*) FROM OccupancySnapshots;
```
Should return at least 7 (preferably 30-90 for better predictions)

### 2. View Analytics Dashboard
1. Login as admin
2. Navigate to **Analytics** → **Dashboard**
3. Scroll to **Occupancy Forecast** section
4. You should see a line chart with 14-day predictions

### 3. Check the Trend
The dashboard will show:
- **Trend: increasing** - Occupancy is expected to rise
- **Trend: decreasing** - Occupancy is expected to fall
- **Trend: insufficient_data** - Need more snapshots

---

## Maintaining the Forecast

### Daily Snapshot Recording
For production use, set up a **daily cron job** to record snapshots automatically:

```javascript
// Example: Run daily at midnight
// In your server startup or cron configuration
import cron from 'node-cron';
import { recordOccupancySnapshot } from './services/ml/occupancyForecast.js';

// Run every day at 00:00 (midnight)
cron.schedule('0 0 * * *', async () => {
  console.log('Recording daily occupancy snapshot...');
  await recordOccupancySnapshot();
});
```

### Automatic Recording on Booking Events
The system already records snapshots when:
- ✅ New booking is created
- ✅ Guest checks in
- ✅ Guest checks out
- ✅ Booking is cancelled

This is handled in `bookingController.js`:
```javascript
await recordOccupancySnapshot(checkInDate);
```

---

## Business Value

Once the forecast is working, it provides:

### 1. **Predictive Planning**
- Anticipate busy vs. slow periods
- Plan staff schedules in advance
- Optimize resource allocation

### 2. **Revenue Optimization**
- Implement dynamic pricing based on predicted demand
- Launch promotions during low-occupancy periods
- Maximize rates during high-demand periods

### 3. **Operational Efficiency**
- Schedule maintenance during predicted low occupancy
- Order supplies based on expected guest count
- Reduce waste and overstocking

### 4. **Strategic Decision Making**
- Identify seasonal trends
- Evaluate marketing campaign effectiveness
- Make data-driven business decisions

---

## Troubleshooting

### "Insufficient data" message persists
- **Check**: Do you have at least 7 occupancy snapshots?
- **Solution**: Run `backfill-occupancy-snapshots.js`

### Forecast shows flat line (no variation)
- **Cause**: Not enough booking variation in historical data
- **Solution**: Add more diverse bookings or wait for real booking data to accumulate

### Forecast predictions seem inaccurate
- **Cause**: Limited historical data (only 7-14 days)
- **Solution**: Collect 30-90 days of data for better predictions
- **Note**: ML accuracy improves with more data over time

### Snapshots not recording automatically
- **Check**: Is the booking controller calling `recordOccupancySnapshot()`?
- **Check**: Are there any errors in the server logs?
- **Solution**: Verify the import statement and function call in `bookingController.js`

---

## Summary

**To fix the missing occupancy forecast:**

1. ✅ Run `node seed-demo-data.js` (includes automatic backfill)
   
   **OR**

2. ✅ Run `node backfill-occupancy-snapshots.js` (manual backfill)

3. ✅ Refresh the Analytics Dashboard

4. ✅ Verify the forecast chart appears with 14-day predictions

The forecast will now work and continue to improve as more booking data accumulates over time!
