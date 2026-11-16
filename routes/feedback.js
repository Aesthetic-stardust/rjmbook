import express from "express";
import * as feedbackController from "../controllers/feedbackController.js";
import { isAuthenticated, isAdmin } from "../middleware/auth.js";

const router = express.Router();

// Submit feedback — any logged-in user
router.post("/", isAuthenticated, feedbackController.submitFeedback);

// Read feedback — admin only
router.get("/", isAdmin, feedbackController.getAllFeedback);
router.get("/stats/sentiment", isAdmin, feedbackController.getSentimentStats);
router.get("/:id", isAdmin, feedbackController.getFeedbackById);

// Analyze text sentiment — any logged-in user (used in feedback form)
router.post("/analyze", isAuthenticated, feedbackController.analyzeTextSentiment);

// Mutate feedback — admin only
router.put("/:id/status", isAdmin, feedbackController.updateFeedbackStatus);
router.delete("/:id", isAdmin, feedbackController.deleteFeedback);

export default router;
