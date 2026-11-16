/*
  RJMBook Chatbot Routes
*/

import express from "express";
import { sendMessage, getChatHistory } from "../controllers/chatbotController.js";

const router = express.Router();

// Chatbot is publicly accessible — no login required
router.post("/message", sendMessage);
router.get("/history", getChatHistory);

export default router;
