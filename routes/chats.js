import express from "express";
import { chatsPage, getMessages, sendMessage } from "../controllers/chatController.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

// Chats routes
router.get("/", isAuthenticated, chatsPage);
router.get("/:conversationId/messages", isAuthenticated, getMessages);
router.post("/:conversationId/messages", isAuthenticated, sendMessage);

export default router;
