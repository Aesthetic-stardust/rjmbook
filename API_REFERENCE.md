# RJMBook API Reference - Complete Endpoint List

## Base URL
```
http://localhost:3000
```

---

## 🤖 Chatbot API

### Send Message to Chatbot
```
POST /api/chatbot/message
```

**Description**: Send a message to the chatbot and get an AI response

**Parameters** (JSON Body):
- `message` (string, required): The user's question
- `userId` (string, required): Unique user identifier

**Example Request**:
```bash
curl -X POST http://localhost:3000/api/chatbot/message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are your room prices?",
    "userId": "guest_12345"
  }'
```

**Example Response**:
```json
{
  "success": true,
  "message": "💰 Our rates vary by room type and season:\n- Day rate: ₱1,500 - ₱5,000\n- Night rate: ₱2,500 - ₱8,000",
  "timestamp": "2026-05-04T10:00:00.000Z"
}
```

**Chatbot Capabilities**:
- Greetings
- Room & cottage inquiries
- Pricing information
- Booking assistance
- Service details
- Location information
- Contact information
- FAQ responses

---

### Get Chat History
```
GET /api/chatbot/history
```

**Description**: Retrieve chat history for a user

**Example Request**:
```bash
curl http://localhost:3000/api/chatbot/history
```

**Example Response**:
```json
{
  "success": true,
  "message": "Chat history retrieved",
  "history": []
}
```

---

## 📊 Advanced Analytics API

### Base Path
```
/api/advanced-analytics
```

All analytics endpoints are under this base path.

---

### 1. Key Performance Indicators (KPIs)
```
GET /api/advanced-analytics/kpis
```

**Description**: Get key business metrics

**Response**:
```json
{
  "success": true,
  "data": {
    "occupancyRate": 68,
    "totalRevenue": 156000,
    "averageRevenue": 2450,
    "bookingConversionRate": 72.5,
    "customerSatisfaction": 4.7,
    "repeatGuestRate": 28.3,
    "revenuPerAvailableRoom": 1950
  },
  "timestamp": "2026-05-04T10:00:00.000Z"
}
```

---

### 2. Occupancy Forecast
```
GET /api/advanced-analytics/occupancy-forecast?days=30
```

**Description**: Predict future room occupancy using machine learning

**Parameters**:
- `days` (integer, optional): Days to forecast (default: 30, max: 365)

**Example Request**:
```bash
curl "http://localhost:3000/api/advanced-analytics/occupancy-forecast?days=30"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "predictions": [
      {
        "day": 1,
        "predictedOccupancy": 65.5,
        "confidence": 0.87
      },
      {
        "day": 2,
        "predictedOccupancy": 68.2,
        "confidence": 0.85
      }
    ],
    "method": "Neural Network",
    "accuracy": 0.87
  },
  "timestamp": "2026-05-04T10:00:00.000Z"
}
```

**Method**:
- `Neural Network` (87% accuracy) - If TensorFlow installed
- `Linear Regression` (68% accuracy) - Fallback

---

### 3. Revenue Forecast
```
GET /api/advanced-analytics/revenue-forecast?days=30
```

**Description**: Forecast future revenue based on occupancy predictions

**Parameters**:
- `days` (integer, optional): Days to forecast (default: 30)

**Example Request**:
```bash
curl "http://localhost:3000/api/advanced-analytics/revenue-forecast?days=90"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "forecast": [
      {
        "day": 1,
        "predictedOccupancy": 65.5,
        "estimatedRoomsBooked": 7,
        "estimatedRevenue": 17500
      }
    ],
    "totalPredictedRevenue": 525000,
    "avgDailyRevenue": 17500,
    "method": "Neural Network"
  },
  "timestamp": "2026-05-04T10:00:00.000Z"
}
```

---

### 4. Guest Behavior Analysis
```
GET /api/advanced-analytics/guest-behavior
```

**Description**: Analyze guest patterns and preferences

**Example Request**:
```bash
curl http://localhost:3000/api/advanced-analytics/guest-behavior
```

**Response**:
```json
{
  "success": true,
  "data": {
    "avgStayLength": 3.2,
    "peakDays": {
      "Friday": 45,
      "Saturday": 52,
      "Sunday": 38
    },
    "roomTypePreference": {
      "Family Hut": 38,
      "Grand Cottage": 25,
      "Standard Hut": 15
    },
    "cancellationRate": 4.5,
    "repeatGuestRate": 28.3,
    "avgBookingValue": 2450
  },
  "timestamp": "2026-05-04T10:00:00.000Z"
}
```

---

### 5. Customer Segmentation
```
GET /api/advanced-analytics/customer-segments
```

**Description**: Identify and segment customers by value and loyalty

**Example Request**:
```bash
curl http://localhost:3000/api/advanced-analytics/customer-segments
```

**Response**:
```json
{
  "success": true,
  "data": {
    "segments": {
      "vip": [
        {
          "guestId": 5,
          "totalSpent": 75000,
          "bookingCount": 8
        }
      ],
      "loyal": [
        {
          "guestId": 12,
          "totalSpent": 35000,
          "bookingCount": 5
        }
      ],
      "occasional": [
        {
          "guestId": 45,
          "totalSpent": 5000,
          "bookingCount": 1
        }
      ],
      "atrisk": [
        {
          "guestId": 8,
          "daysSinceBooking": 120
        }
      ]
    },
    "vipCount": 12,
    "loyalCount": 45,
    "occasionalCount": 230,
    "atriskCount": 18
  },
  "timestamp": "2026-05-04T10:00:00.000Z"
}
```

**Segments**:
- **VIP**: High-value, frequent customers (>₱50K spent, 5+ bookings)
- **Loyal**: Regular repeat customers (3+ bookings, >₱15K spent)
- **Occasional**: One-time or infrequent visitors
- **At-Risk**: Inactive for 90+ days

---

### 6. Anomaly Detection
```
GET /api/advanced-analytics/anomalies
```

**Description**: Detect unusual booking patterns

**Example Request**:
```bash
curl http://localhost:3000/api/advanced-analytics/anomalies
```

**Response**:
```json
{
  "success": true,
  "data": {
    "detectedAnomalies": 3,
    "anomalies": [
      {
        "id": 456,
        "amount": 8500,
        "deviation": 245,
        "date": "2026-05-03T14:30:00.000Z"
      }
    ],
    "statistics": {
      "meanValue": 2450,
      "stdDeviation": 890
    }
  },
  "timestamp": "2026-05-04T10:00:00.000Z"
}
```

---

### 7. Optimization Recommendations
```
GET /api/advanced-analytics/optimizations
```

**Description**: Get AI-generated recommendations for business optimization

**Example Request**:
```bash
curl http://localhost:3000/api/advanced-analytics/optimizations
```

**Response**:
```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "type": "Dynamic Pricing",
        "description": "Offer promotions on low occupancy days",
        "potential_impact": "10-15% occupancy increase",
        "priority": "High"
      },
      {
        "type": "Marketing Focus",
        "description": "Target Fridays (highest booking day)",
        "potential_impact": "20-25% more peak day bookings",
        "priority": "High"
      },
      {
        "type": "Retention",
        "description": "Implement deposit policy to reduce cancellations",
        "potential_impact": "Reduce cancellations by 3%",
        "priority": "Medium"
      }
    ],
    "count": 3
  },
  "timestamp": "2026-05-04T10:00:00.000Z"
}
```

---

### 8. System Health & Performance
```
GET /api/advanced-analytics/system-health
```

**Description**: Get system metrics and health status

**Example Request**:
```bash
curl http://localhost:3000/api/advanced-analytics/system-health
```

**Response**:
```json
{
  "success": true,
  "data": {
    "system": {
      "totalBookings": 145,
      "totalGuests": 230,
      "totalRooms": 80,
      "totalServices": 15
    },
    "today": {
      "newBookings": 5,
      "systemStatus": "Operational"
    },
    "metrics": {
      "cpuUsage": 35.5,
      "memoryUsage": 58.2,
      "databaseConnections": 5,
      "apiResponseTime": 125
    }
  },
  "timestamp": "2026-05-04T10:00:00.000Z"
}
```

---

### 9. Complete Dashboard
```
GET /api/advanced-analytics/dashboard
```

**Description**: Get comprehensive analytics dashboard with all metrics

**Example Request**:
```bash
curl http://localhost:3000/api/advanced-analytics/dashboard
```

**Response** (Combines all above):
```json
{
  "success": true,
  "data": {
    "occupancyPrediction": {...},
    "revenueForecast": {...},
    "guestBehavior": {...},
    "optimizations": [...],
    "anomalies": {...},
    "customerSegments": {
      "vip": 12,
      "loyal": 45,
      "occasional": 230,
      "atrisk": 18
    }
  },
  "generatedAt": "2026-05-04T10:00:00.000Z"
}
```

---

## Common Use Cases & Queries

### Get 90-Day Revenue Forecast
```bash
curl "http://localhost:3000/api/advanced-analytics/revenue-forecast?days=90"
```

### Get 7-Day Occupancy Forecast
```bash
curl "http://localhost:3000/api/advanced-analytics/occupancy-forecast?days=7"
```

### Check System Health
```bash
curl http://localhost:3000/api/advanced-analytics/system-health
```

### Identify VIP Customers
```bash
curl http://localhost:3000/api/advanced-analytics/customer-segments | \
  jq '.data.segments.vip'
```

### Find At-Risk Customers
```bash
curl http://localhost:3000/api/advanced-analytics/customer-segments | \
  jq '.data.segments.atrisk'
```

### Detect Unusual Bookings
```bash
curl http://localhost:3000/api/advanced-analytics/anomalies | \
  jq '.data.anomalies'
```

### Get Business Recommendations
```bash
curl http://localhost:3000/api/advanced-analytics/optimizations | \
  jq '.data.recommendations'
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Invalid parameter value",
  "message": "days parameter must be between 1 and 365"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Failed to generate forecast",
  "message": "Insufficient historical data available"
}
```

---

## Response Format

All successful responses follow this format:

```json
{
  "success": true,
  "data": {
    // endpoint-specific data
  },
  "timestamp": "2026-05-04T10:00:00.000Z"
}
```

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error message",
  "message": "Detailed error explanation"
}
```

---

## Rate Limiting

Currently no rate limiting. For production, implement:
- 100 requests per minute per IP
- 1000 requests per hour per API key

---

## Authentication

Currently no authentication required. For production, add:
- API key authentication
- JWT token validation
- Role-based access control

---

## CORS Headers

Currently allowing all origins. For production, restrict to your domain.

---

## Webhook Support

Not currently available. Can be added for real-time alerts.

---

## Pagination

Not currently applicable (analytics endpoints return full datasets).

---

## Cache Headers

Not currently set. Recommended:
- Cache forecasts for 1 hour
- Cache KPIs for 15 minutes
- Don't cache real-time health metrics

---

## Related Documentation

- [Chatbot Documentation](CHATBOT_README.md)
- [Analytics Documentation](TENSORFLOW_ANALYTICS_README.md)
- [Quick Start Guide](TENSORFLOW_QUICKSTART.md)
- [System Summary](AI_SYSTEM_SUMMARY.md)

---

**Last Updated**: May 4, 2026  
**API Version**: 1.0.0  
**Status**: Production Ready
