/*
  RJMBook — Sentiment Analysis Controller
  Admin dashboard for sentiment analysis and guest feedback insights
*/

import { Feedback, Booking, Guest, Room, RoomType } from "../models/index.js";
import { Op, Sequelize } from "sequelize";
import PDFDocument from "pdfkit";

/**
 * GET /admin/sentiment-analysis
 * Main sentiment analysis dashboard for admin
 */
export async function sentimentAnalysisDashboard(req, res) {
  try {
    // Get all feedback (auto-approved on submit, so all show up)
    const feedbackInstances = await Feedback.findAll({
      include: [
        { model: Booking, include: [{ model: Room, include: [RoomType] }] },
        { model: Guest, attributes: ["id", "firstName", "lastName", "email"] }
      ],
      order: [["createdAt", "DESC"]]
    });

    // Convert Sequelize instances to plain objects for template rendering
    const feedbacks = feedbackInstances.map(f => f.toJSON());

    // Calculate sentiment statistics
    const totalFeedback = feedbacks.length;
    const positiveCount = feedbacks.filter(f => f.sentiment === "positive").length;
    const negativeCount = feedbacks.filter(f => f.sentiment === "negative").length;
    
    const sentimentStats = {
      total: feedbacks.length,
      positive: positiveCount,
      negative: negativeCount,
      positivePercentage: feedbacks.length > 0 ? Math.round((positiveCount / feedbacks.length) * 100) : 0,
      negativePercentage: feedbacks.length > 0 ? Math.round((negativeCount / feedbacks.length) * 100) : 0
    };

    // Calculate average sentiment score
    const avgSentimentScore = feedbacks.length > 0
      ? (feedbacks.reduce((sum, f) => sum + f.sentimentScore, 0) / feedbacks.length).toFixed(3)
      : 0;

    // Calculate aspect ratings
    const aspectRatings = calculateAspectRatings(feedbacks);

    // Calculate overall rating
    const overallRating = feedbacks.length > 0
      ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(2)
      : 0;

    // Get sentiment trends by date (last 30 days)
    const sentimentTrends = await getSentimentTrends(feedbacks, 30);

    // Build positive and negative feedback lists from phrase-level breakdown
    // Each phrase from sentimentBreakdown becomes its own entry, so a mixed review
    // appears in BOTH positive and negative lists with the relevant phrase text
    const topPositiveFeedback = [];
    const topNegativeFeedback = [];

    for (const f of feedbacks) {
      if (f.sentimentBreakdown && Array.isArray(f.sentimentBreakdown) && f.sentimentBreakdown.length > 0) {
        // Group phrases by sentiment
        const positivePhrases = f.sentimentBreakdown.filter(p => p.sentiment === "positive");
        const negativePhrases = f.sentimentBreakdown.filter(p => p.sentiment === "negative");

        if (positivePhrases.length > 0) {
          topPositiveFeedback.push({
            ...f,
            comment: positivePhrases.map(p => p.phrase).join(". "),
            sentiment: "positive",
            sentimentScore: positivePhrases.reduce((sum, p) => sum + (p.score || 0.5), 0) / positivePhrases.length
          });
        }
        if (negativePhrases.length > 0) {
          topNegativeFeedback.push({
            ...f,
            comment: negativePhrases.map(p => p.phrase).join(". "),
            sentiment: "negative",
            sentimentScore: negativePhrases.reduce((sum, p) => sum + (p.score || 0.5), 0) / negativePhrases.length
          });
        }
      } else {
        // No breakdown available — use overall sentiment
        if (f.sentiment === "positive") {
          topPositiveFeedback.push(f);
        } else {
          topNegativeFeedback.push(f);
        }
      }
    }

    // Sort and limit
    topPositiveFeedback.sort((a, b) => b.sentimentScore - a.sentimentScore);
    topNegativeFeedback.sort((a, b) => a.sentimentScore - b.sentimentScore);

    // Get room-wise sentiment analysis
    const roomSentimentAnalysis = getRoomWiseSentiment(feedbacks);

    // Get guest satisfaction segments
    const satisfactionSegments = getGuestSatisfactionSegments(feedbacks);

    // Calculate sentiment trends by week
    const weeklyTrends = getWeeklyTrends(feedbacks);

    // Calculate recent feedback stats
    const lastSevenDays = getRecentFeedbackStats(feedbacks, 7);
    const lastThirtyDays = getRecentFeedbackStats(feedbacks, 30);

    // Get common issues (negative feedback keywords)
    const commonIssues = extractCommonIssues(topNegativeFeedback);

    // Get recommendations based on analysis
    const recommendations = generateRecommendations(sentimentStats, aspectRatings, commonIssues);

    res.render("admin/sentiment-analysis", {
      title: "Sentiment Analysis Dashboard | RJM Beach Resort",
      sentimentStats,
      avgSentimentScore,
      aspectRatings,
      overallRating,
      sentimentTrends,
      topPositiveFeedback,
      topNegativeFeedback,
      roomSentimentAnalysis,
      satisfactionSegments,
      weeklyTrends,
      lastSevenDays,
      lastThirtyDays,
      commonIssues,
      recommendations,
      totalFeedback,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error("Sentiment analysis dashboard error:", error);
    res.status(500).render("error", {
      message: "Error loading sentiment analysis dashboard",
      error: error.message
    });
  }
}

/**
 * Calculate average ratings for each aspect
 */
function calculateAspectRatings(feedbacks) {
  const aspects = {};

  const aspects_list = [
    { key: "roomCleanliness", label: "Room Cleanliness" },
    { key: "serviceQuality", label: "Service Quality" },
    { key: "foodQuality", label: "Food Quality" },
    { key: "amenities", label: "Amenities" },
    { key: "valueForMoney", label: "Value for Money" }
  ];

  aspects_list.forEach(aspect => {
    const ratings = feedbacks
      .filter(f => f[aspect.key])
      .map(f => f[aspect.key]);

    if (ratings.length > 0) {
      const avg = (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2);
      const percentage = (avg / 5) * 100;
      aspects[aspect.key] = {
        label: aspect.label,
        average: parseFloat(avg),
        percentage: parseFloat(percentage.toFixed(2)),
        count: ratings.length
      };
    }
  });

  return aspects;
}

/**
 * Get sentiment trends over the last N days
 */
function getSentimentTrends(feedbacks, days = 30) {
  const trends = [];
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  for (let i = days - 1; i >= 0; i--) {
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - i);
    startDate.setHours(0, 0, 0, 0);

    const endDay = new Date(startDate);
    endDay.setHours(23, 59, 59, 999);

    const dayFeedbacks = feedbacks.filter(f => {
      const feedbackDate = new Date(f.createdAt);
      return feedbackDate >= startDate && feedbackDate <= endDay;
    });

    const positive = dayFeedbacks.filter(f => f.sentiment === "positive").length;
    const negative = dayFeedbacks.filter(f => f.sentiment === "negative").length;

    trends.push({
      date: startDate.toISOString().split('T')[0],
      positive,
      negative,
      total: dayFeedbacks.length,
      avgScore: dayFeedbacks.length > 0
        ? (dayFeedbacks.reduce((sum, f) => sum + f.sentimentScore, 0) / dayFeedbacks.length).toFixed(2)
        : 0
    });
  }

  return trends;
}

/**
 * Get weekly sentiment trends
 */
function getWeeklyTrends(feedbacks) {
  const weeks = [];
  const now = new Date();

  for (let i = 3; i >= 0; i--) {
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() - (weekEnd.getDay()));
    weekEnd.setDate(weekEnd.getDate() - (i * 7));

    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);

    const weekFeedbacks = feedbacks.filter(f => {
      const feedbackDate = new Date(f.createdAt);
      return feedbackDate >= weekStart && feedbackDate <= weekEnd;
    });

    const positive = weekFeedbacks.filter(f => f.sentiment === "positive").length;
    const negative = weekFeedbacks.filter(f => f.sentiment === "negative").length;

    weeks.push({
      week: `${weekStart.getDate()}/${weekStart.getMonth() + 1} - ${weekEnd.getDate()}/${weekEnd.getMonth() + 1}`,
      positive,
      negative,
      total: weekFeedbacks.length,
      avgScore: weekFeedbacks.length > 0
        ? (weekFeedbacks.reduce((sum, f) => sum + f.sentimentScore, 0) / weekFeedbacks.length).toFixed(2)
        : 0
    });
  }

  return weeks;
}

/**
 * Get recent feedback statistics
 */
function getRecentFeedbackStats(feedbacks, days) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const recentFeedbacks = feedbacks.filter(f => new Date(f.createdAt) >= cutoffDate);

  return {
    total: recentFeedbacks.length,
    positive: recentFeedbacks.filter(f => f.sentiment === "positive").length,
    negative: recentFeedbacks.filter(f => f.sentiment === "negative").length,
    averageScore: recentFeedbacks.length > 0
      ? (recentFeedbacks.reduce((sum, f) => sum + f.sentimentScore, 0) / recentFeedbacks.length).toFixed(2)
      : 0,
    avgRating: recentFeedbacks.length > 0
      ? (recentFeedbacks.reduce((sum, f) => sum + f.rating, 0) / recentFeedbacks.length).toFixed(2)
      : 0
  };
}

/**
 * Get room-wise sentiment analysis
 */
function getRoomWiseSentiment(feedbacks) {
  const roomSentiment = {};

  feedbacks.forEach(f => {
    if (f.Booking && f.Booking.Room) {
      const roomId = f.Booking.Room.id;
      const roomName = f.Booking.Room.name || `Room ${roomId}`;

      if (!roomSentiment[roomId]) {
        roomSentiment[roomId] = {
          roomId,
          roomType: f.Booking?.Room?.RoomType?.name || `Room ${roomId}`,
          total: 0,
          positive: 0,
          negative: 0,
          averageScore: 0,
          totalScore: 0,
          feedbacks: []
        };
      }

      roomSentiment[roomId].feedbacks.push(f);
      roomSentiment[roomId].total++;
      roomSentiment[roomId].totalScore += f.sentimentScore;
      
      if (f.sentiment === "positive") roomSentiment[roomId].positive++;
      else if (f.sentiment === "negative") roomSentiment[roomId].negative++;
    }
  });

  // Calculate averages
  Object.keys(roomSentiment).forEach(roomId => {
    const room = roomSentiment[roomId];
    const scores = room.feedbacks.map(f => f.sentimentScore);
    const ratings = room.feedbacks.map(f => f.rating);

    room.avgScore = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2);
    room.avgRating = (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2);
  });

  return Object.values(roomSentiment).sort((a, b) => b.count - a.count);
}

/**
 * Get guest satisfaction segments
 */
function getGuestSatisfactionSegments(feedbacks) {
  const segments = {
    veryHappy: feedbacks.filter(f => f.sentimentScore >= 0.8).length,
    happy: feedbacks.filter(f => f.sentimentScore >= 0.6 && f.sentimentScore < 0.8).length,
    neutral: feedbacks.filter(f => f.sentimentScore >= 0.4 && f.sentimentScore < 0.6).length,
    unhappy: feedbacks.filter(f => f.sentimentScore >= 0.2 && f.sentimentScore < 0.4).length,
    veryUnhappy: feedbacks.filter(f => f.sentimentScore < 0.2).length
  };

  return segments;
}

/**
 * Extract common issues from negative feedback
 */
function extractCommonIssues(negativeComments) {
  const issues = {};

  const keywords = {
    "cleanliness": ["dirty", "clean", "dust", "stain", "mess", "messy"],
    "noise": ["noise", "noisy", "loud", "quiet"],
    "service": ["service", "staff", "rude", "unhelpful", "slow"],
    "amenities": ["amenity", "amenities", "broken", "facility", "facilities"],
    "maintenance": ["broken", "damaged", "maintenance", "repair", "leaky", "ac", "wifi"],
    "value": ["expensive", "overpriced", "worth", "value"],
    "food": ["food", "taste", "fresh", "cold", "hot", "quality"]
  };

  negativeComments.forEach(feedback => {
    const comment = (feedback.comment || "").toLowerCase();
    Object.keys(keywords).forEach(category => {
      const categoryKeywords = keywords[category];
      if (categoryKeywords.some(kw => comment.includes(kw))) {
        issues[category] = (issues[category] || 0) + 1;
      }
    });
  });

  return Object.entries(issues)
    .sort((a, b) => b[1] - a[1])
    .map(([issue, count]) => ({ issue, count }));
}

/**
 * Generate recommendations based on analysis
 */
function generateRecommendations(sentimentStats, aspectRatings, commonIssues) {
  const recommendations = [];

  // Check overall sentiment
  if (sentimentStats.negative.count > sentimentStats.positive.count * 0.2) {
    recommendations.push({
      priority: "high",
      category: "Overall Satisfaction",
      message: `You have ${sentimentStats.negative.percentage}% negative feedback. Consider addressing common complaints.`,
      action: "Review common issues and implement improvements"
    });
  }

  // Check aspect ratings
  Object.entries(aspectRatings).forEach(([key, aspect]) => {
    if (aspect.average < 3.5) {
      recommendations.push({
        priority: "high",
        category: "Service Quality",
        message: `${aspect.label} has an average rating of ${aspect.average}/5. This needs attention.`,
        action: `Improve ${aspect.label.toLowerCase()}`
      });
    } else if (aspect.average < 4.0) {
      recommendations.push({
        priority: "medium",
        category: "Service Quality",
        message: `${aspect.label} could be improved (currently ${aspect.average}/5).`,
        action: `Enhance ${aspect.label.toLowerCase()}`
      });
    }
  });

  // Check common issues
  if (commonIssues.length > 0) {
    const topIssue = commonIssues[0];
    recommendations.push({
      priority: "high",
      category: "Common Issues",
      message: `"${topIssue.issue}" is the most frequently reported issue (${topIssue.count} mentions).`,
      action: `Address ${topIssue.issue} issues immediately`
    });
  }

  // Positive recommendation
  if (sentimentStats.positive.percentage > 70) {
    recommendations.push({
      priority: "low",
      category: "Great Work",
      message: `Excellent! ${sentimentStats.positive.percentage}% of guests are happy. Keep up the good work!`,
      action: "Maintain current standards and share best practices"
    });
  }

  return recommendations;
}

/**
 * GET /api/admin/sentiment/export
 * Export sentiment analysis data as JSON
 */
export async function exportSentimentData(req, res) {
  try {
    const feedbacks = await Feedback.findAll({
      where: { status: "approved" },
      include: [
        { model: Booking, include: [{ model: Room, include: [RoomType] }] },
        { model: Guest, attributes: ["id", "firstName", "lastName", "email"] }
      ],
      order: [["createdAt", "DESC"]]
    });

    // Calculate statistics
    const totalFeedback = feedbacks.length;
    const positiveCount = feedbacks.filter(f => f.sentiment === "positive").length;
    const negativeCount = feedbacks.filter(f => f.sentiment === "negative").length;
    const neutralCount = feedbacks.filter(f => f.sentiment === "neutral").length;
    const avgScore = feedbacks.length > 0
      ? (feedbacks.reduce((sum, f) => sum + f.sentimentScore, 0) / feedbacks.length).toFixed(3)
      : 0;

    // Create PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      bufferPages: true
    });

    // Set response headers
    const fileName = `sentiment-analysis-report-${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    doc.pipe(res);

    // Title and Header
    doc.fontSize(24).font('Helvetica-Bold').text('SENTIMENT ANALYSIS REPORT', { align: 'center' });
    doc.fontSize(12).font('Helvetica').text('RJM Beach Resort', { align: 'center' });
    doc.moveDown(0.5);

    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-US', { 
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    doc.fontSize(10).font('Helvetica').text(`Report Generated: ${formattedDate}`, { align: 'center' });
    doc.moveDown(1);

    // Divider
    doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);

    // Executive Summary
    doc.fontSize(14).font('Helvetica-Bold').text('EXECUTIVE SUMMARY', { underline: true });
    doc.moveDown(0.5);

    const summaryData = [
      { label: 'Total Feedback Received', value: totalFeedback },
      { label: 'Positive Reviews', value: `${positiveCount} (${((positiveCount/totalFeedback)*100).toFixed(1)}%)` },
      { label: 'Negative Reviews', value: `${negativeCount} (${((negativeCount/totalFeedback)*100).toFixed(1)}%)` },
      { label: 'Neutral Reviews', value: `${neutralCount} (${((neutralCount/totalFeedback)*100).toFixed(1)}%)` },
      { label: 'Average Sentiment Score', value: `${avgScore}/1.0` }
    ];

    doc.fontSize(11).font('Helvetica');
    summaryData.forEach(item => {
      doc.text(`${item.label}: `, { continued: true }).font('Helvetica-Bold').text(item.value);
      doc.font('Helvetica');
    });

    doc.moveDown(1);

    // Sentiment Distribution
    doc.fontSize(14).font('Helvetica-Bold').text('SENTIMENT DISTRIBUTION', { underline: true });
    doc.moveDown(0.5);

    // Bar chart visualization as text
    const maxWidth = 30;
    const positiveBar = Math.round((positiveCount / totalFeedback) * maxWidth);
    const negativeBar = Math.round((negativeCount / totalFeedback) * maxWidth);
    const neutralBar = Math.round((neutralCount / totalFeedback) * maxWidth);

    doc.fontSize(10).font('Helvetica');
    doc.text('Positive: ' + '█'.repeat(positiveBar) + ' ' + ((positiveCount/totalFeedback)*100).toFixed(1) + '%');
    doc.text('Negative: ' + '█'.repeat(negativeBar) + ' ' + ((negativeCount/totalFeedback)*100).toFixed(1) + '%');
    doc.text('Neutral:  ' + '█'.repeat(neutralBar) + ' ' + ((neutralCount/totalFeedback)*100).toFixed(1) + '%');

    doc.moveDown(1);

    // Top Positive Feedback
    doc.fontSize(14).font('Helvetica-Bold').text('TOP POSITIVE FEEDBACK', { underline: true });
    doc.moveDown(0.5);

    const topPositive = feedbacks.filter(f => f.sentiment === "positive").slice(0, 3);
    if (topPositive.length > 0) {
      doc.fontSize(10).font('Helvetica');
      topPositive.forEach((feedback, index) => {
        doc.text(`${index + 1}. "${feedback.comment.substring(0, 120)}..."`, { width: 445 });
        doc.text(`   Guest: ${feedback.Guest.firstName} ${feedback.Guest.lastName} | Rating: ${feedback.rating}/5 | Score: ${feedback.sentimentScore.toFixed(3)}`, { fontSize: 9, textColor: '#666666' });
        doc.moveDown(0.3);
      });
    } else {
      doc.fontSize(10).text('No positive feedback available.');
    }

    doc.moveDown(0.5);

    // Top Negative Feedback
    doc.fontSize(14).font('Helvetica-Bold').text('TOP NEGATIVE FEEDBACK (ACTION REQUIRED)', { underline: true });
    doc.moveDown(0.5);

    const topNegative = feedbacks.filter(f => f.sentiment === "negative").slice(0, 3);
    if (topNegative.length > 0) {
      doc.fontSize(10).font('Helvetica');
      topNegative.forEach((feedback, index) => {
        doc.text(`${index + 1}. "${feedback.comment.substring(0, 120)}..."`, { width: 445 });
        doc.text(`   Guest: ${feedback.Guest.firstName} ${feedback.Guest.lastName} | Rating: ${feedback.rating}/5 | Score: ${feedback.sentimentScore.toFixed(3)}`, { fontSize: 9, textColor: '#666666' });
        doc.moveDown(0.3);
      });
    } else {
      doc.fontSize(10).text('No negative feedback available.');
    }

    doc.moveDown(0.5);

    // Aspect Ratings Summary
    doc.fontSize(14).font('Helvetica-Bold').text('ASPECT RATINGS SUMMARY', { underline: true });
    doc.moveDown(0.5);

    const aspects = {
      'Room Cleanliness': feedbacks.filter(f => f.roomCleanliness).map(f => f.roomCleanliness),
      'Service Quality': feedbacks.filter(f => f.serviceQuality).map(f => f.serviceQuality),
      'Food Quality': feedbacks.filter(f => f.foodQuality).map(f => f.foodQuality),
      'Amenities': feedbacks.filter(f => f.amenities).map(f => f.amenities),
      'Value for Money': feedbacks.filter(f => f.valueForMoney).map(f => f.valueForMoney)
    };

    doc.fontSize(10).font('Helvetica');
    Object.entries(aspects).forEach(([aspect, ratings]) => {
      if (ratings.length > 0) {
        const avgRating = (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2);
        doc.text(`${aspect}: ${avgRating}/5.0`);
      }
    });

    doc.moveDown(1);

    // Footer
    doc.fontSize(9).font('Helvetica').textColor('#999999');
    doc.text('This report was automatically generated by RJMBook Sentiment Analysis System', { align: 'center' });
    doc.text(`© 2026 RJM Beach Resort | Confidential`, { align: 'center' });

    // Finalize PDF
    doc.end();
  } catch (error) {
    console.error("Export sentiment data error:", error);
    res.status(500).json({
      success: false,
      message: "Error exporting sentiment data",
      error: error.message
    });
  }
}
