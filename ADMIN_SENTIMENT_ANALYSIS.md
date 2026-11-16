*/KM,*
- Helps prioritize improvements

Categories tracked:
- Cleanliness
- Noise
- Service
- Amenities
- Maintenance
- Value
- Food

### 8. **Smart Recommendations**
AI-generated actionable insights:
- **High Priority**: Critical issues affecting guest satisfaction
- **Medium Priority**: Areas needing improvement
- **Low Priority**: Suggestions for excellence

Recommendations based on:
- Sentiment distribution analysis
- Aspect rating thresholds
- Common issue patterns

### 9. **Data Export**
Export all sentiment analysis data as JSON for external analysis or reporting.

## 📊 Accessing the Dashboard

1. **Login to Admin Panel** at `/admin`
2. **Click "Sentiment Analysis"** in the sidebar
3. View comprehensive dashboard with all metrics

## 🔗 API Endpoints

### Get Sentiment Analysis Dashboard
```
GET /admin/sentiment-analysis
```
Returns: Rendered dashboard with all analytics

### Export Sentiment Data
```
GET /admin/sentiment-analysis/export
```
Returns: JSON with all feedback data and metrics

### Get Sentiment Statistics (Feedback API)
```
GET /api/feedback/stats/sentiment
```
Query parameters:
- `startDate`: Start date for analysis
- `endDate`: End date for analysis
- `status`: Feedback status (default: "approved")

Returns: Statistics and aspect ratings

## 🎨 Dashboard Sections

### Metrics Grid
Quick overview of key numbers with color coding:
- 🟢 Positive feedback (green)
- 🔴 Negative feedback (red)
- 🟠 Neutral feedback (orange)
- 🔵 Sentiment score (blue)
- 🟣 Overall rating (purple)

### Period Stats Cards
Side-by-side comparison of recent periods with:
- Total feedback count
- Positive/negative/neutral breakdown
- Average sentiment and rating

### Satisfaction Bars
Visual representation of guest satisfaction levels with:
- Color-coded bars
- Percentages
- Actual counts

### Aspect Cards
Grid of service aspect ratings with:
- Score display (e.g., 4.5/5.0)
- Percentage bar
- Review count

### Trends Section
Weekly trends showing:
- Week date range
- Positive/negative sentiment counts
- Total feedback
- Average sentiment score

### Room Analysis Table
Detailed table with sortable columns:
- Room name
- Total reviews
- Sentiment distribution
- Average scores

### Feedback Cards
Detailed feedback reviews with:
- Guest name and rating
- Sentiment classification
- Full comment text
- Submission date
- Sentiment confidence score

### Issues Section
Ranked list of reported problems with:
- Issue category (clickable/filterable)
- Mention count
- Visual bar chart

### Recommendations Grid
Priority-based action items with:
- Priority level indicator
- Category and message
- Specific actions to take

### Trends Chart
30-day sentiment visualization (requires Chart.js integration)

## 📈 Interpretation Guide

### Sentiment Scores
- **0.8-1.0**: Excellent sentiment (positive)
- **0.6-0.8**: Good sentiment (positive leaning)
- **0.4-0.6**: Neutral sentiment
- **0.2-0.4**: Negative sentiment (negative leaning)
- **0.0-0.2**: Poor sentiment (negative)

### Ratings vs Sentiment
- High ratings (4-5) usually correlate with positive sentiment
- Low ratings (1-2) usually correlate with negative sentiment
- Mismatch indicates mixed feelings or specific issues

### Action Thresholds
- **> 75% positive feedback**: Maintain current standards
- **50-75% positive feedback**: Monitor closely for improvement areas
- **< 50% positive feedback**: Immediate action required

## 🛠️ Technical Details

### Model Data Flow
1. Guest submits feedback via `/api/feedback`
2. Sentiment analysis service processes comment
3. Feedback stored with:
   - Aspect ratings (1-5)
   - Sentiment classification (positive/negative/neutral)
   - Sentiment confidence score (0-1)
   - Status (pending/approved/rejected)

4. Admin views dashboard at `/admin/sentiment-analysis`
5. Controller retrieves approved feedback from database
6. Performs aggregations and calculations
7. Renders view with comprehensive metrics

### Controller Functions

#### `sentimentAnalysisDashboard(req, res)`
- Fetches all approved feedback
- Calculates sentiment statistics
- Computes aspect ratings
- Generates sentiment trends
- Identifies common issues
- Creates recommendations
- Renders dashboard

#### `exportSentimentData(req, res)`
- Exports all approved feedback
- Formats data for external analysis
- Returns as JSON

### Helper Functions

#### `calculateAspectRatings(feedbacks)`
Computes average for each aspect with percentages

#### `getSentimentTrends(feedbacks, days)`
Generates daily sentiment data for specified period

#### `getWeeklyTrends(feedbacks)`
Creates weekly sentiment breakdown

#### `getRoomWiseSentiment(feedbacks)`
Analyzes sentiment by room/room type

#### `getGuestSatisfactionSegments(feedbacks)`
Categorizes guests by satisfaction level

#### `extractCommonIssues(negativeComments)`
Identifies keywords in negative feedback

#### `generateRecommendations(...)`
Creates actionable insights based on analysis

## 🔄 Workflow

1. **Guests Submit Feedback** → `/api/feedback`
2. **Sentiment Analysis** → ML model processes comment
3. **Data Stored** → Feedback table with metrics
4. **Admin Reviews** → `/admin/sentiment-analysis`
5. **Takes Action** → Based on insights and recommendations
6. **Monitors Trends** → Tracks improvement over time

## 📊 Metrics Calculation

### Sentiment Score Calculation
Combines:
- Text sentiment analysis (ML model)
- Rating-based score (1-5 mapped to 0-1)
- Keyword analysis (rule-based fallback)
- Weighted average for final score

### Aspect Ratings
Average of numeric ratings for each aspect:
```
Average = Sum of ratings / Count of ratings
Percentage = (Average / 5.0) * 100
```

### Common Issues
Keyword frequency in negative reviews:
```
For each issue category:
  Count mentions in negative comments
Sort by frequency
```

### Recommendations Logic
```
IF negative_percentage > 20%
  → Add overall satisfaction recommendation

FOR each aspect:
  IF average < 3.5
    → High priority improvement
  ELSE IF average < 4.0
    → Medium priority improvement

IF common issues exist
  → Address top issue with high priority

IF positive_percentage > 70%
  → Add maintenance/consistency recommendation
```

## 🎯 Best Practices

### For Data Interpretation
1. Look at both sentiment score and actual rating
2. Compare time periods to identify trends
3. Read actual feedback for context
4. Don't rely solely on aggregate metrics

### For Action Planning
1. Address high-priority issues first
2. Focus on aspect improvements that impact overall rating
3. Acknowledge and maintain positive aspects
4. Set goals for improvement metrics

### For Monitoring
1. Check dashboard weekly
2. Track sentiment trend direction
3. Monitor if recommendations are implemented
4. Adjust strategies based on feedback response

## 🔐 Security Notes

- Admin authentication required (`isAdmin` middleware)
- Only approved feedback is displayed
- Guest privacy is maintained (first name + last name)
- Email addresses not publicly visible

## 🚀 Future Enhancements

- [ ] Real-time sentiment updates
- [ ] Predictive satisfaction scoring
- [ ] Automated guest response system
- [ ] Integration with guest email notifications
- [ ] Mobile app for on-the-go monitoring
- [ ] Advanced NLP for emotion detection
- [ ] Competitor sentiment benchmarking
- [ ] Guest segmentation and targeting

## 📝 Example Dashboard Scenario

**Resort A Dashboard Shows:**
- 150 total approved reviews
- 65% positive (98 reviews)
- 20% negative (30 reviews)
- 15% neutral (22 reviews)
- Overall rating: 4.2/5
- Average sentiment score: 0.72

**Highest Rated Aspect:** Service Quality (4.6/5)
**Lowest Rated Aspect:** Cleanliness (3.8/5)

**Top Issue:** "Dirty rooms" mentioned 8 times
**Top Recommendation:** HIGH PRIORITY - Address room cleanliness (8 mentions)

**Action Plan:**
1. Investigate cleaning procedures
2. Increase housekeeping frequency
3. Implement quality checks
4. Follow up with guests who reported cleanliness issues

---

For more details on sentiment analysis engine, see [SENTIMENT_ANALYSIS_README.md](../SENTIMENT_ANALYSIS_README.md)
