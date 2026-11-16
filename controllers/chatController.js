// Chats Controller
import { Booking } from "../models/Booking.js";
import { User } from "../models/userModel.js";
import { Guest } from "../models/Guest.js";
import { Chat } from "../models/Chat.js";

export const chatsPage = async (req, res) => {
  try {
    const sessionUserId = req.session.userId;
    const sessionRole = req.session.role;

    if (!sessionUserId) {
      return res.redirect("/login");
    }

    // Get current user info
    const user = await User.findByPk(sessionUserId);

    if (!user) {
      return res.redirect("/login");
    }

    // If admin, get list of guests with active bookings
    let guests = [];
    if (sessionRole === "admin") {
      guests = await Guest.findAll({
        include: [
          {
            model: Booking,
            where: { status: "confirmed" },
            required: false,
          },
        ],
        limit: 20,
      });
    }

    res.render("chats/index", {
      sessionUserId,
      sessionRole,
      sessionUserName: user.name,
      guests: guests.map((g) => ({
        id: g.id,
        name: g.name,
        email: g.email,
        room:
          g.Bookings && g.Bookings.length > 0
            ? g.Bookings[0].roomId
            : "Unknown",
      })),
    });
  } catch (error) {
    console.error("Error loading chats page:", error);
    res.status(500).render("error", { error: error.message });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const sessionUserId = req.session.userId;
    const sessionRole = req.session.role;

    if (!sessionUserId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    let messages = [];

    if (sessionRole === "admin") {
      // Admin: Get messages from specific guest
      messages = await Chat.findAll({
        where: {
          receiverId: conversationId,
        },
        order: [["createdAt", "ASC"]],
        limit: 50,
      });
    } else {
      // User: Get messages from admin or to admin
      messages = await Chat.findAll({
        where: {
          receiverId: sessionUserId,
        },
        order: [["createdAt", "ASC"]],
        limit: 50,
      });
    }

    res.json({
      success: true,
      messages: messages.map((m) => ({
        id: m.id,
        senderId: m.senderId,
        senderRole: m.senderRole,
        message: m.message,
        createdAt: m.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error getting messages:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { conversationId, message } = req.body;
    const sessionUserId = req.session.userId;
    const sessionRole = req.session.role;

    if (!message || !conversationId) {
      return res.status(400).json({
        success: false,
        error: "Message and conversation ID required",
      });
    }

    if (!sessionUserId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    // Save message to database
    const newMessage = await Chat.create({
      senderId: sessionUserId,
      senderRole: sessionRole,
      receiverId: conversationId,
      message: message,
      isRead: false,
    });

    res.json({
      success: true,
      message: {
        id: newMessage.id,
        senderId: newMessage.senderId,
        senderRole: newMessage.senderRole,
        message: newMessage.message,
        createdAt: newMessage.createdAt,
      },
    });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
