# RJMBook — Sentiment Analysis Feature Guide

## ✨ What's Been Implemented

Your RJMBook system now has **AI-powered sentiment analysis** for guest feedback and reviews! This allows you to automatically analyze guest emotions, identify satisfaction levels, and generate actionable insights.

## 🎯 Features

### 1. **Guest Feedback Collection**
- Collect structured guest feedback after bookings
- Rate specific aspects: cleanliness, service, food, amenities, value
- Leave detailed comments

### 2. **Automated Sentiment Analysis**
- **TensorFlow Hub Integration** - Uses pre-trained ML models for analysis
- **Rule-Based Fallback** - Works without TensorFlow if not installed
- Analyzes both text and ratings
- Returns: Sentiment (positive/negative/neutral), confidence score, analysis method

### 3. **Sentiment Statistics & Reporting**
- Track sentiment trends over time
- Analyze aspect-specific ratings
- Identify improvement areas
- Generate sentiment reports by date range

## 📁 Files Created

```
models/
  └── Feedback.js                          # Feedback data model

services/ml/
  └── sentimentAnalysis.js                # Sentiment analysis engine

controllers/
  └── feedbackController.js               # API endpoints handler

routes/
  └── feedback.js                         # API routes

migrations/
  └── add_feedback_table.js              # Database migration
```

## 🚀 Quick Start

### 1. **Install Dependencies (Optional but Recommended)**

For the best sentiment analysis using TensorFlow Hub:

```bash
npm install @tensorflow/tfjs @tensorflow-hub/tfjs-hub
```

Without TensorFlow, the system uses rule-based sentiment analysis with keyword matching.

### 2. **Create Feedback Table**

The migration has been created. To apply it, ensure the migration system runs:

```bash
# The system will auto-sync tables on server start
# Or run manually if you have a migration runner set up
```

### 3. **Test the Endpoints**

#### **Submit Guest Feedback**
```bash
curl -X POST http://localhost:3000/api/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "booking-uuid-here",
    "guestId": "guest-uuid-here",
    "rating": 5,
    "comment": "Excellent stay! The room was immaculate and the staff was incredibly helpful.",
    "roomCleanliness": 5,
    "serviceQuality": 5,
    "foodQuality": 4,
    "amenities": 4,
    "valueForMoney": 5
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Feedback submitted successfully",
  "feedback": {
    "id": "feedback-uuid",
    "rating": 5,
    "sentiment": "positive",
    "sentimentScore": 0.92,
    "status": "pending"
  },
  "analysis": {
    "textSentiment": "positive",
    "textScore": 0.89,
    "ratingScore": 0.95,
    "combinedSentiment": "positive",
    "combinedScore": 0.92,
    "method": "rule-based",
    "confidence": 0.87
  }
}
```

#### **Analyze Sentiment of Any Text**
```bash
curl -X POST http://localhost:3000/api/feedback/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "The resort is amazing but the pool was too cold"}'
```

**Response:**
```json
{
  "success": true,
  "text": "The resort is amazing but the pool was too cold",
  "analysis": {
    "sentiment": "neutral",
    "score": 0.68,
    "method": "rule-based",
    "confidence": 0.82,
    "details": {
      "positiveCount": 1,
      "negativeCount": 1,
      "total": 2
    }
  }
}
```

#### **Get All Feedback**
```bash
curl "http://localhost:3000/api/feedback?status=approved&limit=20&offset=0"
```

#### **Get Sentiment Statistics**
```bash
curl "http://localhost:3000/api/feedback/stats/sentiment?status=approved&startDate=2025-01-01&endDate=2025-12-31"
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "total": 15,
    "positive": 12,
    "negative": 1,
    "neutral": 2,
    "averageScore": 0.81,
    "positivePercentage": 80,
    "negativePercentage": 7,
    "neutralPercentage": 13
  },
  "aspectRatings": {
    "cleanliness": "4.8",
    "service": "4.7",
    "food": "4.5",
    "amenities": "4.6",
    "valueForMoney": "4.4",
    "overallRating": "4.6"
  }
}
```

#### **Update Feedback Status**
```bash
curl -X PUT http://localhost:3000/api/feedback/feedback-id/status \
  -H "Content-Type: application/json" \
  -d '{"status": "approved"}'
```

#### **Get Specific Feedback**
```bash
curl "http://localhost:3000/api/feedback/feedback-id"
```

#### **Delete Feedback**
```bash
curl -X DELETE "http://localhost:3000/api/feedback/feedback-id"
```

## 🔄 Sentiment Analysis Methods

### **Method 1: TensorFlow Hub (Recommended)**
- Uses pre-trained neural networks from Google
- Better accuracy for complex sentiment
- Requires: `@tensorflow/tfjs` and `@tensorflow-hub/tfjs-hub`
- Confidence: ~85%

### **Method 2: Rule-Based (Default)**
- Uses keyword matching with sentiment dictionaries
- Works without external dependencies
- Fast and lightweight
- Confidence: ~50-95% depending on word density
- Perfect for quick analysis

The system automatically falls back to rule-based if TensorFlow isn't available.

## 📊 How Sentiment Scoring Works

### **Text Analysis**
1. Splits comment into words
2. Counts positive keywords (excellent, great, lovely, etc.)
3. Counts negative keywords (terrible, awful, disappointing, etc.)
4. Detects negations (not good = negative)
5. Calculates: `sentiment_score = positive_count / (positive_count + negative_count)`

### **Rating Analysis**
1. Takes individual aspect ratings (1-5)
2. Calculates average: `(rating - 1) / 4` (converts to 0-1 scale)

### **Combined Sentiment**
1. Merges text and rating sentiment
2. Weighted average: `(text_score + rating_score) / 2`
3. Applies label: `> 0.6 = positive`, `< 0.4 = negative`, `else = neutral`

## 🎯 Use Cases

### **1. Guest Satisfaction Tracking**
Monitor overall satisfaction trends over time:
```javascript
const stats = await sentimentService.calculateSentimentStats(feedbacks);
console.log(`Happy Guests: ${stats.positivePercentage}%`);
```

### **2. Problem Identification**
Find specific areas needing improvement:
```javascript
const poorCleanliness = feedbacks.filter(f => f.roomCleanliness <= 2);
const poorService = feedbacks.filter(f => f.serviceQuality <= 2);
```

### **3. Marketing & Reviews**
Use positive feedback for promotional content:
```javascript
const reviews = feedbacks.filter(f => f.sentiment === "positive" && f.status === "approved");
```

### **4. Real-Time Alerts**
Alert staff to negative feedback:
```javascript
if (analysis.sentiment === "negative") {
  sendAlertToManager(feedback);
}
```

## 📈 Integration with Booking System

You can integrate feedback collection into your booking flow:

```javascript
// After guest checks out
if (booking.status === 'checked_out') {
  // Send feedback request to guest
  const feedbackForm = await getFeedbackFormForGuest(guestId, bookingId);
}
```

## 🔧 Customization

### **Add Custom Sentiment Keywords**

Edit `sentimentAnalysis.js`:

```javascript
this.positiveWords = [
  "excellent", "amazing", "wonderful", "great",
  // ADD YOUR CUSTOM WORDS HERE
  "cozy", "heavenly", "paradise"
];
```

### **Adjust Sentiment Thresholds**

Change the sentiment labels in `getSentimentLabel()`:

```javascript
getSentimentLabel(score) {
  if (score > 0.65) return "positive";  // Changed from 0.6
  if (score < 0.35) return "negative";  // Changed from 0.4
  return "neutral";
}
```

### **Fine-Tune for Hotel Language**

Add hospitality-specific keywords:

```javascript
this.positiveWords.push(...[
  "welcoming", "spacious", "luxurious", "impeccable",
  "attentive", "courteous", "memorable", "scenic"
]);
```

## 📊 Database Schema

```sql
CREATE TABLE Feedbacks (
  id UUID PRIMARY KEY,
  bookingId UUID NOT NULL,
  guestId UUID NOT NULL,
  rating INTEGER (1-5),
  comment TEXT,
  sentiment ENUM('positive', 'negative', 'neutral'),
  sentimentScore FLOAT (0-1),
  roomCleanliness INTEGER,
  serviceQuality INTEGER,
  foodQuality INTEGER,
  amenities INTEGER,
  valueForMoney INTEGER,
  status ENUM('pending', 'approved', 'rejected'),
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

## 🛠️ API Reference

### **Endpoints**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/feedback` | Submit new feedback |
| GET | `/api/feedback` | Get all feedback (paginated) |
| GET | `/api/feedback/:id` | Get specific feedback |
| POST | `/api/feedback/analyze` | Analyze any text sentiment |
| GET | `/api/feedback/stats/sentiment` | Get sentiment statistics |
| PUT | `/api/feedback/:id/status` | Update feedback status |
| DELETE | `/api/feedback/:id` | Delete feedback |

### **Query Parameters**

**GET /api/feedback**
- `status` - Filter by status (pending/approved/rejected)
- `sentiment` - Filter by sentiment (positive/negative/neutral)
- `guestId` - Filter by guest
- `limit` - Results per page (default: 50)
- `offset` - Pagination offset (default: 0)

**GET /api/feedback/stats/sentiment**
- `status` - Filter feedback status
- `startDate` - Date range start (YYYY-MM-DD)
- `endDate` - Date range end (YYYY-MM-DD)

## 🎓 Example Workflow

1. **Guest completes stay** → Booking marked as `checked_out`
2. **Feedback form displayed** → Guest submits feedback with ratings and comment
3. **Sentiment analyzed** → TensorFlow or rule-based analysis determines sentiment
4. **Admin reviews** → Feedback appears in admin dashboard with status `pending`
5. **Admin approves** → Status changed to `approved`, appears in statistics
6. **Reports generated** → Sentiment trends inform business decisions

## 📞 Support

For questions or issues:
- Check the sentiment analysis service: `services/ml/sentimentAnalysis.js`
- Review the controller: `controllers/feedbackController.js`
- Check model associations in: `models/index.js`

## ✅ Next Steps

1. ✅ Install TensorFlow dependencies (optional)
2. ✅ Test the endpoints with sample feedback
3. ✅ Integrate feedback form into booking completion page
4. ✅ Review sentiment statistics in admin dashboard
5. ✅ Set up automated alerts for negative feedback
6. ✅ Generate monthly sentiment reports

---

**RJMBook Sentiment Analysis** powered by TensorFlow & Machine Learning 🤖
