/*
  RJMBook Chatbot Controller
  Handles AI-powered responses (Google Gemini + live DB context) with deterministic
  multi-step flows for room recommendations and booking status lookups, plus rule-based fallback.
*/

import { Op } from "sequelize";
import { Room } from "../models/Room.js";
import { RoomType } from "../models/RoomType.js";
import { Service } from "../models/Service.js";
import { Booking } from "../models/Booking.js";
import { Guest } from "../models/Guest.js";
import { generateGeminiReply, getLoggedInUserBookings } from "../services/chatbotAIService.js";

// Store conversation state per user (in-memory for simplicity, can be moved to Redis/DB)
const conversationStates = new Map();
const STATE_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_HISTORY_TURNS = 10;
const MAX_MESSAGE_LENGTH = 1000;

// Conversation state structure
const createState = () => ({
  step: "initial",
  data: {
    groupSize: null,
    budget: null,
    preferredCategory: null,
  },
  history: [],
  lastActivity: Date.now(),
});

function pruneExpiredStates() {
  const cutoff = Date.now() - STATE_TTL_MS;
  for (const [key, state] of conversationStates.entries()) {
    if (state.lastActivity < cutoff) {
      conversationStates.delete(key);
    }
  }
}

function appendHistory(state, role, text) {
  if (!text) return;
  state.history.push({ role, text, timestamp: new Date().toISOString() });
  if (state.history.length > MAX_HISTORY_TURNS) {
    state.history = state.history.slice(-MAX_HISTORY_TURNS);
  }
}

// Chatbot response handler
export const sendMessage = async (req, res) => {
  try {
    const { message, userId: rawUserId } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Message cannot be empty" });
    }

    const trimmedMessage = message.trim();
    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        error: "Message is too long",
        message: `Please keep your message under ${MAX_MESSAGE_LENGTH} characters.`,
      });
    }

    pruneExpiredStates();

    const userId =
      (typeof rawUserId === "string" && rawUserId.trim()) ||
      (req.session?.userId ? `session_${req.session.userId}` : req.ip || "anonymous");

    const lowerMessage = trimmedMessage.toLowerCase();

    // Capture logged-in user session info so the bot can identify them automatically
    const sessionContext = {
      userId: req.session?.userId || null,
      userName: req.session?.userName || null,
      userEmail: req.session?.userEmail || null,
      role: req.session?.role || null,
    };

    // Get or create conversation state
    const state = conversationStates.get(userId) || createState();
    state.lastActivity = Date.now();

    const botResponse = await generateResponse(trimmedMessage, lowerMessage, userId, state, sessionContext);

    // Save history if conversation wasn't just cleared
    if (conversationStates.has(userId) || state.step !== "initial" || state.history.length > 0 || botResponse) {
      appendHistory(state, "user", trimmedMessage);
      appendHistory(state, "model", botResponse);
      conversationStates.set(userId, state);
    }

    res.json({
      success: true,
      message: botResponse,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Chatbot error:", error);
    res.status(500).json({
      error: "Failed to process message",
      message: "Sorry, I encountered an error. Please try again.",
    });
  }
};

// Fallback formatter for logged-in users when Gemini is unavailable
async function formatUserBookingsFallback(sessionContext) {
  const info = await getLoggedInUserBookings(sessionContext);
  if (!info) return null;

  if (!info.bookings || info.bookings.length === 0) {
    return `👋 Hi **${info.userName}**! You don't have any bookings on record yet.\n\nYou can reserve a room or cottage anytime at /bookings/book.`;
  }

  const lines = info.bookings.map((b) => {
    const roomName = b.Room?.RoomType?.name || b.Room?.roomNumber || "Accommodation";
    const total = b.totalAmount ? `₱${parseFloat(b.totalAmount).toLocaleString()}` : "N/A";
    return `• **Booking #${b.id}** (${roomName}) — Status: **${b.status}** | Payment: **${b.paymentStatus}** | ${b.checkIn} to ${b.checkOut} | ${total}`;
  });

  return `📋 **Hi ${info.userName}, here are your recent bookings:**\n\n${lines.join("\n")}\n\nNeed help with any reservation? Contact us at **+63 919 378 9570**.`;
}

// Generate intelligent responses using deterministic flows + Gemini AI + rule fallback
async function generateResponse(rawMessage, message, userId, state, sessionContext = null) {
  // Reset conversation if user types "start over", "restart", or "reset"
  if (message.includes("start over") || message.includes("restart") || message.includes("reset")) {
    state.step = "initial";
    state.data = { groupSize: null, budget: null, preferredCategory: null };
    state.history = [];
    return "🔄 Let's start fresh! What would you like help with? Type 'recommend' to find the perfect room, or ask about rooms, pricing, bookings, or services.";
  }

  // Handle active recommendation conversation flow
  const recommendationSteps = ["asking_preference", "asking_group_size", "asking_group_size_clarify", "asking_budget"];
  if (state.step && recommendationSteps.includes(state.step)) {
    return await handleRecommendationFlow(message, userId, state);
  }

  // Handle active booking status lookup flow
  if (state.step === "asking_booking_id") {
    return await handleBookingStatusFlow(message, state, sessionContext);
  }

  // Room details lookup ("details Family Hut")
  const detailsMatch = rawMessage.match(/^details(?:\s+for|\s+about)?\s+(.+)$/i);
  if (detailsMatch) {
    const detailsReply = await getRoomDetails(detailsMatch[1].trim());
    if (detailsReply) {
      return detailsReply;
    }
  }

  // Booking status inquiry
  const isBookingStatusQuery =
    message.includes("my booking") ||
    message.includes("booking status") ||
    message.includes("check booking") ||
    message.includes("check my booking") ||
    message.includes("reservation status") ||
    message.includes("status of my") ||
    message.includes("booking id") ||
    message.includes("booking number") ||
    message.includes("track booking") ||
    message.includes("track my booking") ||
    message.includes("where is my booking");

  if (isBookingStatusQuery) {
    // Privacy rule: visitors who are NOT signed in cannot check any booking status (even with an ID)
    if (!sessionContext?.userId) {
      state.step = "initial";
      return "🔒 For your privacy and security, I can only check booking statuses when you are signed in to your account.\n\nPlease sign in at /login so I can check your reservations automatically.";
    }

    // Support single-turn lookup if signed-in user explicitly included an ID (ownership verified inside)
    const inlineIdMatch = message.match(/(?:id|#|booking|number)\s*(\d+)/i);
    if (inlineIdMatch) {
      return await handleBookingStatusFlow(message, state, sessionContext);
    }
    // Otherwise fall through to Gemini (or deterministic fallback) which already has their bookings!
  }

  // Start guided recommendation wizard on explicit trigger (or when AI isn't configured)
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY?.trim() && process.env.GEMINI_API_KEY.trim() !== "your_gemini_api_key");
  const isGuidedRecommendTrigger =
    message === "recommend" ||
    message === "find a room" ||
    message === "recommend a room" ||
    (!hasGeminiKey &&
      (message.includes("recommend") ||
        message.includes("suggest") ||
        message.includes("find me") ||
        message.includes("which room") ||
        message.includes("which cottage") ||
        (message.includes("room") && (message.includes("for") || message.includes("need")))));

  if (isGuidedRecommendTrigger) {
    state.step = "asking_preference";
    return `🏠 I'd love to help you find the perfect accommodation!

**What type of accommodation are you looking for?**
• Type **"room"** for hotel rooms
• Type **"cottage"** for cottages/huts
• Type **"any"** if either works`;
  }

  // Primary AI response (Google Gemini grounded with live DB data + logged-in user bookings)
  const aiReply = await generateGeminiReply(rawMessage, state.history, sessionContext);
  if (aiReply) {
    return aiReply;
  }

  // Deterministic fallback for logged-in booking queries
  if (isBookingStatusQuery && sessionContext?.userId) {
    const fallbackBookings = await formatUserBookingsFallback(sessionContext);
    if (fallbackBookings) return fallbackBookings;
  }

  // Fallback to rule-based responses when Gemini is unavailable or unconfigured
  return await generateRuleBasedResponse(message);
}

// Rule-based fallback responses
async function generateRuleBasedResponse(message) {
  // Greeting responses
  if (
    message.includes("hello") ||
    message.includes("hi") ||
    message.includes("hey")
  ) {
    return "👋 Hello! Welcome to RJM Beach Resort. I'm here to help you find the perfect accommodation. Type 'recommend' to get personalized room suggestions, or ask me about rooms, pricing, bookings, and services!";
  }

  // Rooms & Cottages inquiry (enhanced)
  if (
    message.includes("room") ||
    message.includes("cottage") ||
    message.includes("accommodation") ||
    message.includes("available")
  ) {
    try {
      const roomTypes = await RoomType.findAll({
        where: { isAvailable: true },
        order: [["basePricePerNight", "ASC"]],
      });

      if (roomTypes.length > 0) {
        const roomList = roomTypes
          .slice(0, 5)
          .map((r) => `• **${r.name}** - Up to ${r.maxGuests} guests`)
          .join("\n");

        return `🏖️ We have ${roomTypes.length} beautiful accommodations at RJM Beach Resort!\n\n${roomList}\n\nWould you like me to **recommend** the best option for you? Just tell me your group size and budget!`;
      }
    } catch (error) {
      console.error("Error fetching rooms:", error);
    }
    return "🏖️ We offer a variety of cottages ranging from cozy huts to spacious villas. Type 'recommend' to find the perfect one for you!";
  }

  // Pricing inquiry (enhanced with database data)
  if (
    message.includes("price") ||
    message.includes("cost") ||
    message.includes("rate") ||
    message.includes("how much")
  ) {
    try {
      const roomTypes = await RoomType.findAll({
        where: { isAvailable: true },
        order: [["basePricePerNight", "ASC"]],
        limit: 5,
      });

      if (roomTypes.length > 0) {
        const priceList = roomTypes
          .map((r) => `• **${r.name}** - ₱${parseFloat(r.basePricePerNight).toLocaleString()}`)
          .join("\n");

        return `💰 Our rates per accommodation:\n\n${priceList}\n\nWould you like me to **recommend** a room based on your budget?`;
      }
    } catch (error) {
      console.error("Error fetching prices:", error);
    }
    return "💰 Our rates vary by room type and season. Type 'recommend' to find options within your budget!";
  }

  // Booking inquiry
  if (
    message.includes("book") ||
    message.includes("reserve") ||
    message.includes("booking")
  ) {
    return "📅 Great! I can help you book a cottage. To get started:\n\n1. Choose your check-in date\n2. Select room type\n3. Specify number of guests\n\nWould you like me to **recommend** a room first, or visit our booking page?";
  }

  // Services inquiry
  if (
    message.includes("service") ||
    message.includes("facility") ||
    message.includes("amenities") ||
    message.includes("what do you offer")
  ) {
    try {
      const services = await Service.findAll({ limit: 5 });
      const serviceList = services.map((s) => `• ${s.name}`).join("\n");
      return `🎉 Our services include:\n${serviceList}\n\nWould you like more details about any service?`;
    } catch (error) {
      return "🎉 We offer various services including:\n• Entrance Fees (Adult ₱100 day / ₱150 night)\n• Entrance Fees (Kids 3-10 yrs ₱80 day / ₱120 night)\n• Infants & Toddlers (0-2 yrs): FREE\n• Speaker rental: ₱150\n\nWhich service interests you?";
    }
  }

  // Location inquiry
  if (
    message.includes("location") ||
    message.includes("where") ||
    message.includes("address")
  ) {
    return "📍 RJM Beach Resort is located at:\nTambong, Barangay Proper Bansud, Bansud, Oriental Mindoro 5210\n\nWe're right on the beautiful beach! Would you like directions or travel information?";
  }

  // Contact inquiry
  if (
    message.includes("contact") ||
    message.includes("phone") ||
    message.includes("email") ||
    message.includes("call")
  ) {
    return "📞 You can reach us at:\nPhone: +63 919 378 9570\nEmail: rjm.beachresortph@gmail.com\n\nOr simply continue chatting with me for immediate assistance!";
  }

  // FAQ responses
  if (message.includes("check-in") || message.includes("check in")) {
    return "🔑 Standard check-in time is 2:00 PM and check-out is 12:00 PM. Early check-in or late check-out may be available upon request. Would you like to arrange this?";
  }

  if (message.includes("wifi") || message.includes("internet")) {
    return "📶 Yes! Free Wi-Fi is available throughout the resort for all guests.";
  }

  if (message.includes("parking") || message.includes("car")) {
    return "🚗 Free parking is available for all guests. Our spacious parking area can accommodate vehicles of all sizes.";
  }

  if (message.includes("pet") || message.includes("dog") || message.includes("cat")) {
    return "🐾 We're a pet-friendly resort! Pets are welcome with a small surcharge. Please inform us during booking.";
  }

  if (
    message.includes("wedding") ||
    message.includes("event") ||
    message.includes("party")
  ) {
    return "💍 We'd love to host your special event! We can accommodate various celebrations with customizable packages. Contact our event team for details.";
  }

  // Default helpful response
  return "😊 I can help you with:\n\n✓ **Room recommendations** - Type 'recommend'\n✓ **Booking status** - Type 'check my booking'\n✓ Room bookings\n✓ Pricing & availability\n✓ Resort facilities\n✓ Services & amenities\n\nWhat would you like to know?";
}

// Handle the multi-step recommendation conversation
async function handleRecommendationFlow(message, userId, state) {
  // Extract number from message
  const extractNumber = (msg) => {
    const match = msg.match(/\d+/);
    return match ? parseInt(match[0]) : null;
  };

  // Extract budget from message
  const extractBudget = (msg) => {
    const match = msg.match(/(\d[\d,]*)/);
    return match ? parseInt(match[0].replace(/,/g, '')) : null;
  };

  switch (state.step) {
    case 'asking_preference':
      if (message.includes('room') && !message.includes('cottage') && !message.includes('any')) {
        state.data.preferredCategory = 'room';
        state.step = 'asking_group_size';
        return "Got it! Looking for a **room**.\n\n**How many guests will be staying?** (e.g., '2 guests', 'family of 5', '10 people')";
      }
      if (message.includes('cottage') || message.includes('hut')) {
        state.data.preferredCategory = 'cottage';
        state.step = 'asking_group_size';
        return "Got it! Looking for a **cottage**.\n\n**How many guests will be staying?** (e.g., '2 guests', 'family of 5', '10 people')";
      }
      if (message.includes('any') || message.includes('both') || message.includes("doesn't matter") || message.includes('either')) {
        state.data.preferredCategory = null; // No preference
        state.step = 'asking_group_size';
        return "No preference, I'll show you both rooms and cottages!\n\n**How many guests will be staying?** (e.g., '2 guests', 'family of 5', '10 people')";
      }
      return "Please choose: **room**, **cottage**, or **any**?";

    case 'asking_group_size':
      const groupSize = extractNumber(message);
      
      if (groupSize && groupSize > 0) {
        state.data.groupSize = groupSize;
        state.step = 'asking_budget';
        return `Great! **${groupSize} guest${groupSize > 1 ? 's' : ''}** noted.\n\nWhat's your budget? (e.g., '2000', 'around 3000 pesos', 'budget is 5000')`;
      }
      
      // Handle text-based group size
      if (message.includes('solo') || message.includes('alone') || message.includes('1')) {
        state.data.groupSize = 1;
        state.step = 'asking_budget';
        return `Perfect for a solo getaway! What's your budget?\n\n(e.g., '1000', 'around 2000 pesos')`;
      }
      
      if (message.includes('couple') || message.includes('2')) {
        state.data.groupSize = 2;
        state.step = 'asking_budget';
        return `A couple's retreat! What's your budget?\n\n(e.g., '2000', 'around 3000 pesos')`;
      }
      
      if (message.includes('family') || message.includes('group')) {
        state.step = 'asking_group_size_clarify';
        return "How many people exactly? (e.g., 'family of 5', 'group of 10')";
      }
      
      return "I didn't catch that. Please tell me the number of guests (e.g., '2', 'family of 5', '10 people'):";

    case 'asking_group_size_clarify':
      const clarifiedSize = extractNumber(message);
      if (clarifiedSize && clarifiedSize > 0) {
        state.data.groupSize = clarifiedSize;
        state.step = 'asking_budget';
        return `Got it! **${clarifiedSize} guests**.\n\nWhat's your budget?\n\n(e.g., '3000', 'around 5000 pesos', 'budget is 8000')`;
      }
      return "Please provide a specific number (e.g., '5 guests'):";

    case 'asking_budget':
      const budget = extractBudget(message);
      
      if (budget && budget > 0) {
        state.data.budget = budget;
        state.step = 'initial';
        return await generateRecommendations(state.data);
      }
      
      if (message.includes('budget') || message.includes('cheap') || message.includes('affordable')) {
        state.data.budget = 3000;
        state.step = 'initial';
        return await generateRecommendations(state.data);
      }
      
      if (message.includes('no limit') || message.includes('any') || message.includes("doesn't matter")) {
        state.data.budget = 999999;
        state.step = 'initial';
        return await generateRecommendations(state.data);
      }
      
      return "I need a budget to work with. Please tell me your approximate budget (e.g., '3000 pesos', '5000'):";

    default:
      state.step = 'initial';
      return "Let's start over. Type 'recommend' to find the perfect room for you!";
  }
}

// Generate room recommendations based on collected preferences
async function generateRecommendations(data) {
  const { groupSize, budget, preferredCategory } = data;
  
  try {
    // Build where clause
    const whereClause = { isAvailable: true };
    
    // Filter by category if preference specified
    if (preferredCategory) {
      whereClause.category = preferredCategory;
    }
    
    // Fetch room types based on preferences
    const roomTypes = await RoomType.findAll({
      where: whereClause,
      order: [['basePricePerNight', 'ASC']]
    });

    if (roomTypes.length === 0) {
      const categoryText = preferredCategory ? `${preferredCategory}s` : 'accommodations';
      return `😕 Sorry, no ${categoryText} are currently available. Please contact us directly for availability.`;
    }

    // Filter and score rooms based on preferences
    const scoredRooms = roomTypes.map(room => {
      let score = 0;
      let reasons = [];
      let warnings = [];
      
      const relevantPrice = parseFloat(room.basePricePerNight);
      
      // Budget score
      if (relevantPrice <= budget) {
        score += 30;
        reasons.push(`✓ Within budget (₱${relevantPrice.toLocaleString()})`);
      } else if (relevantPrice <= budget * 1.2) {
        score += 15;
        warnings.push(`⚠ Slightly over budget (₱${relevantPrice.toLocaleString()})`);
      } else {
        score -= 20;
        warnings.push(`✗ Over budget (₱${relevantPrice.toLocaleString()})`);
      }
      
      // Capacity score
      if (room.maxGuests >= groupSize) {
        score += 30;
        if (room.maxGuests === groupSize) {
          reasons.push(`✓ Perfect fit for ${groupSize} guests`);
        } else if (room.maxGuests <= groupSize + 2) {
          reasons.push(`✓ Comfortable for ${groupSize} guests (fits ${room.maxGuests})`);
        } else {
          reasons.push(`✓ Spacious for ${groupSize} guests (fits up to ${room.maxGuests})`);
        }
      } else {
        score -= 50;
        warnings.push(`✗ Too small (max ${room.maxGuests} guests, need ${groupSize})`);
      }
      
      // Category bonus
      const category = room.category || 'cottage';
      
      return {
        room,
        score,
        relevantPrice,
        reasons,
        warnings,
        category
      };
    });

    // Sort by score (highest first)
    scoredRooms.sort((a, b) => b.score - a.score);

    // Get top 3 recommendations
    const topRooms = scoredRooms.filter(r => r.score > 0).slice(0, 3);
    
    if (topRooms.length === 0) {
      return `😕 I couldn't find any ${preferredCategory || 'accommodations'} matching your criteria:\n\n• ${groupSize} guests\n• Budget: ₱${budget.toLocaleString()}\n\nTry adjusting your budget or group size. Type 'recommend' to start over.`;
    }

    // Build recommendation message
    let response = `🎯 **Top Recommendations for You**\n\n`;
    
    // Build preference summary
    const categoryText = preferredCategory ? preferredCategory : 'Any';
    response += `📋 Your preferences: ${groupSize} guest${groupSize > 1 ? 's' : ''} | Budget: ₱${budget.toLocaleString()} | Type: ${categoryText}\n\n`;
    
    topRooms.forEach((item, index) => {
      const { room, score, relevantPrice, reasons, warnings } = item;
      const emoji = index === 0 ? '⭐' : index === 1 ? '✨' : '💫';
      const matchLabel = score >= 50 ? 'Best Match!' : score >= 30 ? 'Great Option' : 'Good Choice';
      
      response += `${emoji} **${index + 1}. ${room.name}** ${index === 0 ? `(${matchLabel})` : ''}\n`;
      response += `   📌 ${room.category === 'cottage' ? 'Cottage' : 'Room'} • Up to ${room.maxGuests} guests\n`;
      
      // Show pricing
      let priceInfo = `₱${relevantPrice.toLocaleString()}`;
      response += `   💰 ${priceInfo}\n`;
      
      // Show reasons
      if (reasons.length > 0) {
        response += `   ${reasons.join(' | ')}\n`;
      }
      
      // Show warnings
      if (warnings.length > 0) {
        response += `   ${warnings.join(' | ')}\n`;
      }
      
      // Show amenities
      if (room.amenities && room.amenities.length > 0) {
        const amenityList = room.amenities.slice(0, 4).join(', ');
        response += `   🎁 Amenities: ${amenityList}${room.amenities.length > 4 ? '...' : ''}\n`;
      }
      
      response += `\n`;
    });

    response += `---\n\n`;
    response += `💡 **What would you like to do?**\n`;
    response += `• Type **"details [room name]"** for more info (e.g., "details Family Hut")\n`;
    response += `• Type **"book"** to make a reservation\n`;
    response += `• Type **"restart"** to search with different preferences`;

    return response;

  } catch (error) {
    console.error('Error generating recommendations:', error);
    return "I encountered an error finding recommendations. Please try again or contact us directly.";
  }
}

// Get room details by name (called from generateResponse when user asks for details)
async function getRoomDetails(roomName) {
  try {
    const room = await RoomType.findOne({
      where: { 
        name: { 
          [Op.like]: `%${roomName}%` 
        } 
      }
    });

    if (!room) {
      return null;
    }

    let response = `🏠 **${room.name}**\n\n`;
    response += `📝 ${room.description || 'A comfortable accommodation at RJM Beach Resort.'}\n\n`;
    
    response += `📊 **Details:**\n`;
    response += `• Category: ${room.category === 'cottage' ? 'Cottage' : 'Room'}\n`;
    response += `• Capacity: Up to ${room.maxGuests} guests\n`;
    response += `• Pool fees: ${room.poolFeesIncluded ? 'Included' : 'Not included'}\n\n`;
    
    response += `💰 **Pricing:**\n`;
    response += `• Rate: ₱${parseFloat(room.basePricePerNight).toLocaleString()}\n\n`;
    
    if (room.amenities && room.amenities.length > 0) {
      response += `🎁 **Amenities:**\n`;
      room.amenities.forEach(amenity => {
        response += `• ${amenity}\n`;
      });
      response += `\n`;
    }
    
    if (room.roomNotes) {
      response += `📌 **Notes:** ${room.roomNotes}\n\n`;
    }
    
    response += `Would you like to **book** this room?`;

    return response;
  } catch (error) {
    console.error('Error getting room details:', error);
    return null;
  }
}

// Handle booking status lookup (requires signed-in session and ownership verification)
async function handleBookingStatusFlow(message, state, sessionContext = null) {
  if (!sessionContext?.userId) {
    state.step = 'initial';
    return "🔒 For your privacy and security, please sign in to your account at /login to check your booking status.";
  }

  // Extract booking ID — allow plain numbers or prefixes like "#42", "id 42", "booking 42"
  const idMatch = message.match(/(?:id|#|booking)?\s*(\d+)/i);
  const bookingId = idMatch ? parseInt(idMatch[1]) : null;

  if (!bookingId || bookingId <= 0) {
    return "I couldn't find a booking ID in your message. Please enter just the number from your confirmation (e.g. **42**):";
  }

  try {
    const booking = await Booking.findByPk(bookingId, {
      include: [
        { model: Room, include: [{ model: RoomType, attributes: ['name', 'category'] }] },
        { model: Guest, attributes: ['id', 'userId', 'email'] }
      ]
    });

    if (!booking) {
      state.step = 'initial';
      return `😕 I couldn't find a booking with ID **#${bookingId}** under your account.\n\nIf you need further help, contact us at **+63 919 378 9570**.`;
    }

    // Verify ownership unless staff/admin
    const isStaffOrAdmin = sessionContext.role === 'admin' || sessionContext.role === 'staff';
    if (!isStaffOrAdmin) {
      const ownsByUserId = booking.Guest?.userId && booking.Guest.userId === sessionContext.userId;
      const ownsByEmail = Boolean(
        sessionContext.userEmail &&
        booking.Guest?.email &&
        booking.Guest.email.toLowerCase() === sessionContext.userEmail.toLowerCase()
      );
      if (!ownsByUserId && !ownsByEmail) {
        state.step = 'initial';
        return `🔒 For privacy reasons, I can only share booking statuses for reservations linked to your signed-in account. Booking **#${bookingId}** is not associated with your account.`;
      }
    }

    // Reset state after successful lookup
    state.step = 'initial';

    // Build status label with emoji
    const statusEmoji = {
      pending:      '⏳ Pending',
      confirmed:    '✅ Confirmed',
      checked_in:   '🏨 Checked In',
      checked_out:  '🏁 Checked Out',
      cancelled:    '❌ Cancelled'
    };
    const paymentEmoji = {
      unpaid:   '💳 Unpaid',
      paid:     '✅ Paid',
      failed:   '❌ Payment Failed',
      refunded: '↩️ Refunded'
    };

    const statusLabel  = statusEmoji[booking.status]   || booking.status;
    const paymentLabel = paymentEmoji[booking.paymentStatus] || booking.paymentStatus;

    const checkIn  = new Date(booking.checkIn).toLocaleDateString('en-PH',  { year: 'numeric', month: 'long', day: 'numeric' });
    const checkOut = new Date(booking.checkOut).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });

    const roomName = booking.Room?.RoomType?.name || booking.Room?.name || 'N/A';
    const guestCount = (booking.adults || 0) + (booking.children || 0);
    const totalStr   = booking.totalAmount ? `₱${parseFloat(booking.totalAmount).toLocaleString()}` : 'N/A';

    let response = `📋 **Booking #${bookingId} Summary**\n\n`;
    response += `🏷️ **Status:** ${statusLabel}\n`;
    response += `💰 **Payment:** ${paymentLabel}\n\n`;
    response += `📅 **Check-in:** ${checkIn}\n`;
    response += `📅 **Check-out:** ${checkOut}\n`;
    response += `🏠 **Accommodation:** ${roomName}\n`;
    response += `👥 **Guests:** ${guestCount} (${booking.adults} adult${booking.adults !== 1 ? 's' : ''}${booking.children > 0 ? `, ${booking.children} child${booking.children !== 1 ? 'ren' : ''}` : ''})\n`;
    response += `💵 **Total Amount:** ${totalStr}\n`;

    if (booking.rateType) {
      const rateLabel = { day: 'Day rate (8AM–5PM)', night: 'Night rate (6PM–11PM)', full: 'Full day+night rate' };
      response += `⏰ **Rate Type:** ${rateLabel[booking.rateType] || booking.rateType}\n`;
    }

    if (booking.specialRequests) {
      response += `📝 **Special Requests:** ${booking.specialRequests}\n`;
    }

    if (booking.status === 'cancelled' && booking.cancellationReason) {
      response += `\n⚠️ **Cancellation Reason:** ${booking.cancellationReason}\n`;
    }

    response += `\nNeed help? Call us at **+63 919 378 9570** or email **rjm.beachresortph@gmail.com**.`;

    return response;
  } catch (error) {
    console.error('Booking status lookup error:', error);
    state.step = 'initial';
    return "😔 I ran into an error looking up that booking. Please try again or contact us directly at **+63 919 378 9570**.";
  }
}

// Get chat history (in-memory per userId)
export const getChatHistory = async (req, res) => {
  try {
    const userId = req.query.userId;
    const history = userId ? conversationStates.get(userId)?.history || [] : [];
    res.json({
      success: true,
      message: "Chat history retrieved",
      history,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve chat history" });
  }
};
