# Testing the Sentiment Analysis Dashboard

## 🧪 Quick Testing Guide

### Prerequisites
- Application running (npm start)
- Admin user logged in
- Test data (guest feedback) available

---

## 📋 Test Scenarios

### Scenario 1: View Empty Dashboard
**Goal:** Verify dashboard loads with no data

**Steps:**
1. Go to `/admin/sentiment-analysis`
2. Should see dashboard structure with 0 counts
3. All cards should display "No data available"

**Expected Result:** ✅ Dashboard loads without errors

---

### Scenario 2: Create Test Feedback
**Goal:** Add sample feedback to populate dashboard

**Steps:**

#### Via API (Manual Testing)
```bash
curl -X POST http://localhost:3000/api/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": 1,
    "guestId": 1,
    "rating": 5,
    "comment": "Excellent stay! The room was immaculate and the staff was incredibly helpful. Highly recommend!",
    "roomCleanliness": 5,
    "serviceQuality": 5,
    "foodQuality": 4,
    "amenities": 4,
    "valueForMoney": 5
  }'
```

#### Via Web Form
1. Guest goes to feedback form after checkout
2. Fills out rating and comment
3. Submits form

**Expected Result:** ✅ Feedback created with sentiment analysis

---

### Scenario 3: Approve Feedback
**Goal:** Make feedback visible in dashboard

**Steps:**
1. Go to `/admin/feedback`
2. Find pending feedback
3. Click approve button
4. Status changes to "approved"

**Expected Result:** ✅ Feedback now appears in sentiment dashboard

---

### Scenario 4: View Dashboard with Data
**Goal:** Verify all sections populate correctly

**Steps:**
1. Create 5+ test feedbacks with different sentiments:
   - 3 positive (rating 4-5, positive comments)
   - 1 negative (rating 1-2, negative comments)
   - 1 neutral (rating 3, neutral comments)

2. Go to `/admin/sentiment-analysis`

**Expected Results:**
- ✅ Metrics cards show correct counts
- ✅ Percentages calculate correctly
- ✅ Aspect ratings appear
- ✅ Satisfaction bars display
- ✅ Feedback cards show reviews
- ✅ Trends show distribution

---

### Scenario 5: Test Negative Feedback Handling
**Goal:** Verify common issues detection

**Steps:**
1. Create feedback with negative keywords:
   ```
   "comment": "Room was dirty, found dust on furniture and stains on carpet. Bathroom was not clean."
   ```

2. Create more negative feedback with other issues:
   ```
   "comment": "Service was terrible, staff was rude and unhelpful."
   "comment": "Too noisy at night, couldn't sleep."
   ```

3. Approve all feedback

4. Go to sentiment dashboard

**Expected Results:**
- ✅ "Negative Reviews" count increases
- ✅ "Common Issues" section populated
- ✅ "Cleanliness" appears in top issues
- ✅ "Service" appears in issues
- ✅ Recommendations generated for top issues

---

### Scenario 6: Verify Aspect Ratings
**Goal:** Check aspect calculation accuracy

**Steps:**
1. Create feedback with specific aspect ratings:
   - Rating 5, Cleanliness: 4, Service: 5, Food: 3, Amenities: 4, Value: 5
   - Rating 4, Cleanliness: 3, Service: 4, Food: 4, Amenities: 4, Value: 4
   - Rating 3, Cleanliness: 2, Service: 3, Food: 2, Amenities: 3, Value: 2

2. Go to sentiment dashboard

3. Manually calculate expected averages:
   - Cleanliness: (4+3+2)/3 = 3.0
   - Service: (5+4+3)/3 = 4.0
   - Food: (3+4+2)/3 = 3.0
   - Value: (5+4+2)/3 = 3.67

**Expected Results:**
- ✅ Cleanliness shows 3.0/5
- ✅ Service shows 4.0/5
- ✅ Food shows 3.0/5
- ✅ Value shows 3.67/5
- ✅ Percentages calculated correctly

---

### Scenario 7: Test Period Statistics
**Goal:** Verify 7-day vs 30-day calculations

**Steps:**
1. Create feedback spread across different dates:
   - 2 positive (today)
   - 2 positive + 1 negative (3 days ago)
   - 1 positive (20 days ago)

2. Go to sentiment dashboard

**Expected Results:**
- ✅ Last 7 Days: 4 positive, 1 negative, Avg: 4.0
- ✅ Last 30 Days: 5 positive, 1 negative, Avg: 4.17
- ✅ Total feedback counts correct

---

### Scenario 8: Test Satisfaction Segments
**Goal:** Verify guest segmentation

**Steps:**
1. Create feedback with different sentiment scores:
   - Sentiment score 0.95 (Very Happy)
   - Sentiment score 0.75 (Happy)
   - Sentiment score 0.50 (Neutral)
   - Sentiment score 0.25 (Unhappy)
   - Sentiment score 0.10 (Very Unhappy)

2. Go to dashboard

3. Check satisfaction segment bars

**Expected Results:**
- ✅ Bars populate with 1 in each segment
- ✅ Percentages: 20% each
- ✅ Visual representation correct

---

### Scenario 9: Test Data Export
**Goal:** Verify JSON export functionality

**Steps:**
1. Go to `/admin/sentiment-analysis`
2. Click "📥 Export Data" button
3. JSON file downloads (or displays)

**Expected Results:**
- ✅ JSON structure valid
- ✅ All feedback included
- ✅ All metrics calculated
- ✅ No errors in export

---

### Scenario 10: Test Recommendations
**Goal:** Verify smart recommendations

**Test Cases:**

#### Case A: High Negative Feedback
```javascript
// Create: 8 negative, 2 positive = 80% negative
// Expected: "High priority" recommendation about negative feedback
```

#### Case B: Low Aspect Rating
```javascript
// Cleanliness average: 2.5/5 (50%)
// Expected: "High priority - Room Cleanliness needs attention"
```

#### Case C: High Positive Feedback
```javascript
// Create: 20 positive, 5 negative = 80% positive
// Expected: "Low priority - Keep up the good work"
```

**Expected Results:**
- ✅ Recommendations match scenarios
- ✅ Priority levels correct
- ✅ Actionable messages clear

---

## 🔍 Verification Checklist

### UI Components
- [ ] All metric cards visible
- [ ] Period stats cards show data
- [ ] Satisfaction bars render correctly
- [ ] Aspect rating cards display
- [ ] Weekly trends populated
- [ ] Room analysis table visible
- [ ] Feedback cards show reviews
- [ ] Issues section populated
- [ ] Recommendations section visible

### Data Accuracy
- [ ] Sentiment counts match total
- [ ] Percentages add up to 100%
- [ ] Average scores calculated correctly
- [ ] Ratings between 0-5
- [ ] Sentiment scores between 0-1
- [ ] Dates formatted properly
- [ ] Guest names display

### Functionality
- [ ] Export button works
- [ ] Dashboard loads quickly
- [ ] No console errors
- [ ] Mobile responsive
- [ ] All links functional
- [ ] Data updates when new feedback added

### Error Handling
- [ ] Empty dashboard shows gracefully
- [ ] No feedback shows "No data available"
- [ ] Invalid data handled
- [ ] Database errors caught

---

## 🛠️ Database Query Testing

### Check Feedback Data
```sql
SELECT * FROM Feedbacks WHERE status = 'approved' LIMIT 10;
```

### Check Sentiment Distribution
```sql
SELECT sentiment, COUNT(*) as count 
FROM Feedbacks 
WHERE status = 'approved' 
GROUP BY sentiment;
```

### Check Aspect Ratings Average
```sql
SELECT 
  AVG(roomCleanliness) as avg_cleanliness,
  AVG(serviceQuality) as avg_service,
  AVG(foodQuality) as avg_food,
  AVG(amenities) as avg_amenities,
  AVG(valueForMoney) as avg_value
FROM Feedbacks
WHERE status = 'approved';
```

### Check Room-wise Distribution
```sql
SELECT 
  r.name as room_name,
  COUNT(f.id) as feedback_count,
  AVG(f.rating) as avg_rating,
  SUM(CASE WHEN f.sentiment = 'positive' THEN 1 ELSE 0 END) as positive_count
FROM Feedbacks f
JOIN Bookings b ON f.bookingId = b.id
JOIN Rooms r ON b.roomId = r.id
WHERE f.status = 'approved'
GROUP BY r.id;
```

---

## 📊 Performance Testing

### Load Time
- Dashboard should load in < 2 seconds
- With 1000+ feedback records

### Data Calculations
- Aggregations should complete < 500ms
- Charts render smoothly
- No UI freezing

---

## 🐛 Common Issues & Solutions

### Issue: Dashboard shows 0 feedback
**Solution:**
1. Verify feedback exists in database
2. Check feedback status = "approved"
3. Ensure bookingId and guestId exist
4. Check database connection

### Issue: Incorrect percentages
**Solution:**
1. Verify sentiment counts
2. Check divide helper function
3. Ensure total feedback > 0

### Issue: Missing aspect ratings
**Solution:**
1. Verify aspect ratings submitted
2. Check for null values
3. Ensure valid range 1-5

### Issue: Broken export
**Solution:**
1. Check isAdmin middleware
2. Verify Feedback associations
3. Check JSON serialization

---

## 📋 Test Data Script

```sql
-- Insert test feedback
INSERT INTO Feedbacks (id, bookingId, guestId, rating, comment, sentiment, sentimentScore, roomCleanliness, serviceQuality, foodQuality, amenities, valueForMoney, status, createdAt, updatedAt)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', 1, 1, 5, 'Amazing stay! Everything was perfect.', 'positive', 0.95, 5, 5, 5, 5, 5, 'approved', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440002', 2, 2, 1, 'Terrible experience. Dirty room.', 'negative', 0.15, 1, 2, 1, 1, 1, 'approved', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440003', 3, 3, 3, 'Average stay. Nothing special.', 'neutral', 0.50, 3, 3, 3, 3, 3, 'approved', NOW(), NOW());
```

---

## ✅ Sign-Off Checklist

- [ ] All test scenarios passed
- [ ] UI renders correctly
- [ ] Data calculations accurate
- [ ] No errors in console
- [ ] Database queries working
- [ ] Mobile responsive
- [ ] Performance acceptable
- [ ] Export functionality works
- [ ] Recommendations generated
- [ ] Ready for production

---

**Last Updated:** May 7, 2026
**Status:** Ready for Testing ✅
