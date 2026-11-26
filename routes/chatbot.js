/*
  RJMBook Chatbot Routes
*/

import express from "express";
import { rateLimit } from "express-rate-limit";
import { sendMessage, getChatHistory } from "../controllers/chatbotController.js";

const router = express.Router();

const chatbotLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many messages sent. Please wait a few minutes and try again.",
    message: "You're sending messages a bit too fast! Please wait a moment and try again."
  }
});

// Chatbot is publicly accessible — no login required
router.post("/message", chatbotLimiter, sendMessage);
router.get("/history", getChatHistory);

export default router;
