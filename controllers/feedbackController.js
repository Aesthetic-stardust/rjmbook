/*
  RJMBook — Feedback Controller
  Handles guest feedback and sentiment analysis
*/

import { Feedback, Booking, Guest } from "../models/index.js";
import SentimentAnalysisService from "../services/ml/sentimentAnalysis.js";
import { Op } from "sequelize";

const sentimentService = new SentimentAnalysisService();

/**
 * Submit new feedback (POST /api/feedback)
 */
export const submitFeedback = async (req, res) => {
  try {
    const {
      bookingId,
      guestId,
      rating,
      comment,
      roomCleanliness,
      serviceQuality,
      foodQuality,
      amenities,
      valueForMoney
    } = req.body;

    // Validate required fields with strict type checking
    if (!bookingId || !guestId || !rating || !comment) {
      console.warn('Feedback validation failed:', { bookingId, guestId, rating, comment });
      return res.status(400).json({
        success: false,
        message: "Missing required fields: bookingId, guestId, rating, comment"
      });
    }

    // Validate types
    const bookingIdNum = parseInt(bookingId);
    const guestIdNum = parseInt(guestId);
    const ratingNum = parseInt(rating);
    
    if (isNaN(bookingIdNum) || isNaN(guestIdNum) || isNaN(ratingNum)) {
      return res.status(400).json({
        success: false,
        message: "Invalid data types: bookingId, guestId, and rating must be numbers"
      });
    }

    // Validate booking and guest exist
    const booking = await Booking.findByPk(bookingIdNum);
    const guest = await Guest.findByPk(guestIdNum);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }
    
    if (!guest) {
      return res.status(404).json({
        success: false,
        message: "Guest not found"
      });
    }

    // Analyze sentiment
    const feedbackData = {
      comment,
      rating: ratingNum,
      roomCleanliness,
      serviceQuality,
      foodQuality,
      amenities,
      valueForMoney
    };

    console.log('Starting sentiment analysis for feedback...', { bookingIdNum, guestIdNum });
    let sentimentAnalysis;
    try {
      // Add a timeout to sentiment analysis to prevent hanging
      const analysisPromise = sentimentService.analyzeFeedback(feedbackData);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Sentiment analysis timeout after 10 seconds')), 10000)
      );
      
      sentimentAnalysis = await Promise.race([analysisPromise, timeoutPromise]);
      console.log('Sentiment analysis completed:', sentimentAnalysis);
    } catch (sentimentError) {
      console.error('Error during sentiment analysis (using fallback):', sentimentError.message);
      // Provide a default sentiment analysis if it fails or times out
      sentimentAnalysis = {
        textSentiment: ratingNum >= 3 ? 'positive' : 'negative',
        combinedSentiment: ratingNum >= 3 ? 'positive' : 'negative',
        combinedScore: (ratingNum - 1) / 4,
        sentimentBreakdown: [],
        method: 'fallback-due-to-error'
      };
      console.log('Using fallback sentiment analysis:', sentimentAnalysis);
    }

    // Create feedback record
    console.log('Creating feedback record in database...');
    let feedback;
    try {
      feedback = await Feedback.create({
        bookingId: bookingIdNum,
        guestId: guestIdNum,
        rating: ratingNum,
        comment,
        roomCleanliness,
        serviceQuality,
        foodQuality,
        amenities,
        valueForMoney,
        sentiment: sentimentAnalysis.combinedSentiment,
        sentimentScore: sentimentAnalysis.combinedScore,
        sentimentBreakdown: sentimentAnalysis.sentimentBreakdown,
        status: "approved"   // auto-approved — flows directly to sentiment dashboard
      });
      console.log('Feedback record created successfully:', { feedbackId: feedback.id });
    } catch (dbError) {
      console.error('Database error creating feedback:', dbError);
      console.error('DB error message:', dbError.message);
      throw dbError;
    }

    console.log('Sending success response...');
    const responseData = {
      success: true,
      message: "Feedback submitted successfully",
      feedback: {
        id: feedback.id,
        rating: feedback.rating,
        sentiment: feedback.sentiment,
        sentimentScore: feedback.sentimentScore,
        status: feedback.status
      },
      analysis: sentimentAnalysis
    };
    console.log('Response data:', responseData);
    res.json(responseData);
    console.log('Response sent successfully');
  } catch (error) {
    console.error("Feedback submission error:", error);
    console.error("Error type:", error.constructor.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    
    // Determine appropriate status code
    let statusCode = 500;
    let errorMessage = "Error submitting feedback";
    
    if (error.message && error.message.includes('Booking not found')) {
      statusCode = 404;
      errorMessage = "Booking not found";
    } else if (error.message && error.message.includes('Guest not found')) {
      statusCode = 404;
      errorMessage = "Guest not found";
    }
    
    console.log(`Sending error response with status ${statusCode}:`, errorMessage);
    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: error.message
    });
  }
};

/**
 * Get all feedback (GET /api/feedback)
 */
export const getAllFeedback = async (req, res) => {
  try {
    const { status, sentiment, guestId, limit = 50, offset = 0 } = req.query;
    const where = {};

    if (status) where.status = status;
    if (sentiment) where.sentiment = sentiment;
    if (guestId) where.guestId = guestId;

    const feedbacks = await Feedback.findAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["createdAt", "DESC"]],
      include: [
        { model: Booking, attributes: ["id", "checkIn", "checkOut", "totalAmount"] },
        { model: Guest, attributes: ["id", "firstName", "lastName", "email"] }
      ]
    });

    const total = await Feedback.count({ where });

    res.json({
      success: true,
      data: feedbacks,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error("Error fetching feedback:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching feedback",
      error: error.message
    });
  }
};

/**
 * Get feedback by ID (GET /api/feedback/:id)
 */
export const getFeedbackById = async (req, res) => {
  try {
    const feedback = await Feedback.findByPk(req.params.id, {
      include: [
        { model: Booking, attributes: ["id", "checkIn", "checkOut", "totalAmount"] },
        { model: Guest, attributes: ["id", "firstName", "lastName", "email"] }
      ]
    });

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: "Feedback not found"
      });
    }

    res.json({ success: true, data: feedback });
  } catch (error) {
    console.error("Error fetching feedback:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching feedback",
      error: error.message
    });
  }
};

/**
 * Update feedback status (PUT /api/feedback/:id/approve)
 */
export const updateFeedbackStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be: pending, approved, or rejected"
      });
    }

    const feedback = await Feedback.findByPk(req.params.id);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: "Feedback not found"
      });
    }

    feedback.status = status;
    await feedback.save();

    res.json({
      success: true,
      message: "Feedback status updated",
      data: feedback
    });
  } catch (error) {
    console.error("Error updating feedback:", error);
    res.status(500).json({
      success: false,
      message: "Error updating feedback",
      error: error.message
    });
  }
};

/**
 * Get sentiment statistics (GET /api/feedback/stats/sentiment)
 */
export const getSentimentStats = async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;
    const where = {};
    
    if (status) where.status = status;

    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const feedbacks = await Feedback.findAll({ where });

    const stats = sentimentService.calculateSentimentStats(feedbacks);

    // Calculate aspect ratings
    const aspects = {
      cleanliness: null,
      service: null,
      food: null,
      amenities: null,
      valueForMoney: null,
      overallRating: null
    };

    if (feedbacks.length > 0) {
      const cleanlinessScores = feedbacks
        .filter(f => f.roomCleanliness)
        .map(f => f.roomCleanliness);
      if (cleanlinessScores.length > 0) {
        aspects.cleanliness = (cleanlinessScores.reduce((a, b) => a + b, 0) / cleanlinessScores.length).toFixed(2);
      }

      const serviceScores = feedbacks
        .filter(f => f.serviceQuality)
        .map(f => f.serviceQuality);
      if (serviceScores.length > 0) {
        aspects.service = (serviceScores.reduce((a, b) => a + b, 0) / serviceScores.length).toFixed(2);
      }

      const foodScores = feedbacks.filter(f => f.foodQuality).map(f => f.foodQuality);
      if (foodScores.length > 0) {
        aspects.food = (foodScores.reduce((a, b) => a + b, 0) / foodScores.length).toFixed(2);
      }

      const amenitiesScores = feedbacks.filter(f => f.amenities).map(f => f.amenities);
      if (amenitiesScores.length > 0) {
        aspects.amenities = (amenitiesScores.reduce((a, b) => a + b, 0) / amenitiesScores.length).toFixed(2);
      }

      const valueScores = feedbacks.filter(f => f.valueForMoney).map(f => f.valueForMoney);
      if (valueScores.length > 0) {
        aspects.valueForMoney = (valueScores.reduce((a, b) => a + b, 0) / valueScores.length).toFixed(2);
      }

      const ratings = feedbacks.map(f => f.rating);
      if (ratings.length > 0) {
        aspects.overallRating = (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2);
      }
    }

    res.json({
      success: true,
      stats,
      aspectRatings: aspects,
      period: { startDate, endDate },
      feedbackCount: feedbacks.length
    });
  } catch (error) {
    console.error("Error calculating sentiment stats:", error);
    res.status(500).json({
      success: false,
      message: "Error calculating sentiment stats",
      error: error.message
    });
  }
};

/**
 * Analyze text sentiment (POST /api/feedback/analyze)
 */
export const analyzeTextSentiment = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Text is required"
      });
    }

    const analysis = await sentimentService.analyzeSentiment(text);

    res.json({
      success: true,
      text,
      analysis
    });
  } catch (error) {
    console.error("Error analyzing sentiment:", error);
    res.status(500).json({
      success: false,
      message: "Error analyzing sentiment",
      error: error.message
    });
  }
};

/**
 * Delete feedback (DELETE /api/feedback/:id)
 */
export const deleteFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findByPk(req.params.id);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: "Feedback not found"
      });
    }

    await feedback.destroy();

    res.json({
      success: true,
      message: "Feedback deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting feedback:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting feedback",
      error: error.message
    });
  }
};
