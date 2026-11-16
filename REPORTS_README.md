# RJMBook Printing Report Features

## Overview

The RJMBook resort management system now includes comprehensive PDF report generation features. Generate professional reports for analytics, bookings, guests, revenue, occupancy, customer segments, and anomalies with custom date ranges.

## Features

✅ **7 Report Types Available**
- Analytics Dashboard Report
- Booking Report
- Guest Report
- Revenue Report
- Occupancy Report
- Customer Segments Report
- Anomalies Report

✅ **Custom Date Ranges** - Filter reports by start and end dates
✅ **Professional PDF Formatting** - Publication-ready reports with styling
✅ **API Access** - Generate reports programmatically
✅ **Admin Dashboard UI** - User-friendly web interface for report generation
✅ **Real-time PDF Download** - Direct download or view in browser

## Access Report Generator

### Via Admin Dashboard
1. Login as admin
2. Navigate to **Admin Panel** → **Generate Reports**
3. Select date range (optional)
4. Choose report type
5. Click "Generate PDF"
6. Download or view PDF

**URL**: `http://localhost:3000/admin/reports`

## API Endpoints

All endpoints require authentication and return a JSON response with PDF download link.

### Generate Analytics Dashboard Report
```
GET /api/reports/analytics-dashboard?startDate=2026-01-01&endDate=2026-12-31
```
**Response**:
```json
{
  "success": true,
  "message": "Analytics Dashboard Report generated successfully",
  "data": {
    "success": true,
    "filepath": "/path/to/analytics-dashboard-1234567890.pdf",
    "filename": "analytics-dashboard-1234567890.pdf",
    "url": "/reports/analytics-dashboard-1234567890.pdf"
  }
}
```

### Generate Booking Report
```
GET /api/reports/booking?startDate=2026-01-01&endDate=2026-12-31
```

### Generate Guest Report
```
GET /api/reports/guest?startDate=2026-01-01&endDate=2026-12-31
```

### Generate Revenue Report
```
GET /api/reports/revenue?startDate=2026-01-01&endDate=2026-12-31
```

### Generate Occupancy Report
```
GET /api/reports/occupancy?startDate=2026-01-01&endDate=2026-12-31
```

### Generate Customer Segments Report
```
GET /api/reports/customer-segments
```

### Generate Anomalies Report
```
GET /api/reports/anomalies?startDate=2026-01-01&endDate=2026-12-31
```

## cURL Examples

### Test Analytics Dashboard Report
```bash
curl http://localhost:3000/api/reports/analytics-dashboard
```

### Test Booking Report with Date Range
```bash
curl "http://localhost:3000/api/reports/booking?startDate=2026-01-01&endDate=2026-12-31"
```

### Test Revenue Report
```bash
curl http://localhost:3000/api/reports/revenue
```

### Test Guest Report
```bash
curl http://localhost:3000/api/reports/guest
```

### Test Occupancy Report
```bash
curl http://localhost:3000/api/reports/occupancy
```

### Test Customer Segments Report
```bash
curl http://localhost:3000/api/reports/customer-segments
```

### Test Anomalies Report
```bash
curl http://localhost:3000/api/reports/anomalies
```

## Report Details

### 1. Analytics Dashboard Report
**Contents**:
- Key Performance Indicators (KPIs)
- Occupancy rate
- Total & average revenue
- Revenue per available room (RevPAR)
- Guest behavior analysis
- Booking conversion rate

**Use Case**: Executive summaries, strategic planning

---

### 2. Booking Report
**Contents**:
- Complete list of all bookings
- Guest names and contact info
- Room assignments
- Check-in/check-out dates
- Booking status
- Booking prices

**Use Case**: Booking verification, guest management

---

### 3. Guest Report
**Contents**:
- Guest directory
- Contact information (email, phone)
- Booking history per guest
- Member since date

**Use Case**: Guest relationship management, marketing

---

### 4. Revenue Report
**Contents**:
- Total revenue
- Daily revenue breakdown (top 30 days)
- Average booking value
- Revenue per booking
- Period summary

**Use Case**: Financial analysis, revenue tracking

---

### 5. Occupancy Report
**Contents**:
- Total number of rooms
- Average occupancy rate
- Daily occupancy rates (last 30 days)
- Occupancy trends

**Use Case**: Capacity planning, trend analysis

---

### 6. Customer Segments Report
**Contents**:
- **VIP Customers**: High-value, frequent bookers
- **Loyal Customers**: Regular repeat customers
- **Occasional Guests**: One-time or infrequent visitors
- **At-Risk Customers**: Inactive for 90+ days

**Use Case**: Targeted marketing, customer retention

---

### 7. Anomalies Report
**Contents**:
- Unusual booking patterns
- Anomalies detected by ML
- Severity levels (High, Medium, Low)
- Detailed descriptions

**Use Case**: Fraud detection, pattern analysis

## File Storage

Generated PDF reports are stored in:
```
/reports/
```

Reports are named with timestamps:
- `analytics-dashboard-1234567890.pdf`
- `booking-report-1234567890.pdf`
- etc.

Access generated reports via:
```
http://localhost:3000/reports/[filename].pdf
```

## Technical Implementation

### Technologies Used
- **Puppeteer**: HTML to PDF conversion
- **Express.js**: API backend
- **Sequelize**: Database queries
- **TailwindCSS**: Report styling

### File Structure
```
services/
  └── reportService.js          # PDF generation logic
controllers/
  └── reportController.js        # API endpoints
routes/
  └── reports.js                # Route definitions
views/
  └── admin/reports.xian        # Admin UI for reports
```

### ReportService Methods
```javascript
// Generate each report type
generateAnalyticsDashboardReport(startDate, endDate)
generateBookingReport(startDate, endDate)
generateGuestReport(startDate, endDate)
generateRevenueReport(startDate, endDate)
generateOccupancyReport(startDate, endDate)
generateCustomerSegmentsReport()
generateAnomaliesReport(startDate, endDate)

// Internal method for HTML to PDF conversion
htmlToPdf(html, filename)
```

## Date Range Handling

- **Optional**: All date filters are optional
- **Default**: If no dates provided, defaults to last 30/90 days depending on report type
- **Format**: Use ISO format (YYYY-MM-DD)

Examples:
```
/api/reports/revenue?startDate=2026-01-01&endDate=2026-03-31
/api/reports/booking  (uses last 90 days)
```

## Error Handling

If a report fails to generate:
```json
{
  "success": false,
  "error": "Failed to generate report",
  "message": "Error details..."
}
```

## Performance Notes

- First PDF generation may take 5-10 seconds (Puppeteer startup)
- Subsequent reports are faster
- Large datasets (500+ bookings) may take longer
- Reports are generated on-demand, not pre-cached

## Future Enhancements

- ✨ Email report delivery
- ✨ Scheduled report generation
- ✨ CSV/Excel export
- ✨ Report templates customization
- ✨ Multi-language support
- ✨ Advanced filtering options

## Troubleshooting

### PDF Not Generated
1. Check if Puppeteer is installed: `npm list puppeteer`
2. Check console logs for Puppeteer errors
3. Ensure sufficient disk space in `/reports` directory

### Reports Directory Not Found
1. System creates `/reports` directory automatically
2. If permission issues, create manually: `mkdir reports`
3. Ensure write permissions on reports directory

### Date Filter Not Working
1. Use ISO format: YYYY-MM-DD
2. Ensure startDate < endDate
3. Check query parameter spelling

## Security Notes

- Reports require authentication (admin login)
- All endpoints check user authorization
- PDFs are stored with timestamps to prevent access by filename guessing
- Reports contain sensitive business data - handle appropriately

---

**Last Updated**: May 4, 2026
**Version**: 1.0.0
**Status**: Production Ready ✅
