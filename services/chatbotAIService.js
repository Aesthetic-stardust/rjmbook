/*
  RJMBook — Chatbot AI Service (Google Gemini)
  Grounds responses with live RoomType, Service, and Booking data from MySQL via Sequelize.
*/

import "dotenv/config";
import { RoomType } from "../models/RoomType.js";
import { Service } from "../models/Service.js";
import { Booking } from "../models/Booking.js";
import { Room } from "../models/Room.js";

const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";
const RESORT_CONTEXT_TTL_MS = 2 * 60 * 1000; // 2 minutes
const GEMINI_TIMEOUT_MS = 15000;

let cachedContext = {
  text: null,
  expiresAt: 0,
};

/**
 * Format a RoomType record into concise plain text for the AI system prompt.
 */
function formatRoomTypeLine(rt) {
  const category = rt.category === "cottage" ? "Cottage" : "Room";
  const basePrice = rt.basePricePerNight ? `₱${parseFloat(rt.basePricePerNight).toLocaleString()}` : "N/A";
  const dayPrice = rt.dayPrice ? `, Day (8AM-5PM): ₱${parseFloat(rt.dayPrice).toLocaleString()}` : "";
  const nightPrice = rt.nightPrice ? `, Night (6PM-11PM): ₱${parseFloat(rt.nightPrice).toLocaleString()}` : "";
  const poolFee = rt.poolFeesIncluded ? "Pool fees included" : "Pool fees NOT included";
  const amenities = Array.isArray(rt.amenities) && rt.amenities.length > 0
    ? `Amenities: ${rt.amenities.join(", ")}`
    : "";
  const notes = rt.roomNotes ? `Notes: ${rt.roomNotes}` : "";
  const desc = rt.description ? `Description: ${rt.description}` : "";

  return [
    `- ${rt.name} (${category}) | Max guests: ${rt.maxGuests} | Base rate: ${basePrice}${dayPrice}${nightPrice} | ${poolFee}`,
    desc,
    amenities,
    notes,
  ]
    .filter(Boolean)
    .join(" | ");
}

/**
 * Load live accommodations and services from the database (with short TTL cache).
 */
async function getLiveResortContext() {
  const now = Date.now();
  if (cachedContext.text && now < cachedContext.expiresAt) {
    return cachedContext.text;
  }

  let roomsSection = "No available accommodations listed right now.";
  let servicesSection = "No additional services listed right now.";

  try {
    const roomTypes = await RoomType.findAll({
      where: { isAvailable: true },
      order: [["basePricePerNight", "ASC"]],
    });

    if (roomTypes.length > 0) {
      roomsSection = roomTypes.map(formatRoomTypeLine).join("\n");
    }
  } catch (err) {
    console.error("Chatbot AI context error (RoomType):", err.message);
  }

  try {
    const services = await Service.findAll({
      order: [["price", "ASC"]],
    });

    if (services.length > 0) {
      servicesSection = services
        .map((s) => {
          const price = s.price !== null && s.price !== undefined ? `₱${parseFloat(s.price).toLocaleString()}` : "N/A";
          const duration = s.durationMinutes ? ` (${s.durationMinutes} mins)` : "";
          const category = s.category ? ` [${s.category}]` : "";
          const desc = s.description ? ` — ${s.description}` : "";
          return `- ${s.name}${category}: ${price}${duration}${desc}`;
        })
        .join("\n");
    }
  } catch (err) {
    console.error("Chatbot AI context error (Service):", err.message);
  }

  const contextText = `LIVE RESORT DATABASE (ACCOMMODATIONS & SERVICES):
${roomsSection}

RESORT SERVICES & ENTRANCE FEES (live from database):
${servicesSection}`;

  cachedContext = {
    text: contextText,
    expiresAt: now + RESORT_CONTEXT_TTL_MS,
  };

  return contextText;
}

/**
 * Check if the user message references a specific Booking ID, and if so, fetch it live via Sequelize.
 */
async function getBookingContextIfMentioned(userMessage) {
  if (!userMessage) return null;
  const idMatch = userMessage.match(/(?:booking|reservation|reserba|id|#)\s*#?\s*(\d{1,7})/i);
  if (!idMatch) return null;

  const bookingId = parseInt(idMatch[1], 10);
  if (!bookingId || isNaN(bookingId)) return null;

  try {
    const booking = await Booking.findByPk(bookingId, {
      include: [
        { model: Room, include: [{ model: RoomType, attributes: ["name", "category"] }] }
      ]
    });

    if (!booking) {
      return `[BOOKING LOOKUP RESULT]: Booking ID #${bookingId} was NOT FOUND in the database. Tell the guest politely that Booking #${bookingId} does not exist and ask them to verify their booking confirmation number.`;
    }

    const roomName = booking.Room?.RoomType?.name || booking.Room?.name || "N/A";
    const guestCount = (booking.adults || 0) + (booking.children || 0);

    return `[BOOKING LOOKUP RESULT FOR BOOKING #${bookingId} (live from database)]:
- Status: ${booking.status}
- Payment Status: ${booking.paymentStatus}
- Accommodation: ${roomName}
- Guests: ${guestCount} (${booking.adults || 0} adults, ${booking.children || 0} children)
- Check-in: ${booking.checkIn}
- Check-out: ${booking.checkOut}
- Total Amount: ₱${parseFloat(booking.totalAmount || 0).toLocaleString()}
- Rate Type: ${booking.rateType || "Standard"}
- Special Requests: ${booking.specialRequests || "None"}`;
  } catch (err) {
    console.error("Chatbot AI booking context error:", err.message);
    return null;
  }
}

/**
 * Build the system instruction for the resort concierge assistant.
 */
async function buildSystemInstruction(bookingContext = null) {
  const liveData = await getLiveResortContext();

  let instruction = `You are the friendly, professional, and dedicated customer service AI Concierge for RJM Beach Resort (also known as RJMBook / Naruwan Resort in Bansud, Oriental Mindoro).

STRICT SCOPE & BOUNDARY RESTRICTION (CRITICAL MANDATORY RULE):
You are strictly and exclusively the customer service AI Concierge for RJM Beach Resort. You are NOT a general-purpose AI, NOT a translator, NOT a dictionary, and NOT a general knowledge assistant.

ALLOWED TOPICS (ONLY ANSWER THESE):
1. Inquiries about RJM Beach Resort's actual accommodations: room and cottage names, rates, guest capacities, amenities (AC, Wi-Fi, private bathroom, pool access).
2. Inquiries about RJM Beach Resort's services & fees: entrance fees (day/night, adult/kids), pool fees and pool access, equipment rentals (rice cooker, speaker, electric fan).
3. Inquiries about RJM Beach Resort's policies & logistics: check-in (2:00 PM), check-out (12:00 PM), pet policy, parking, location in Tambong, Bansud, Oriental Mindoro, contact numbers (+63 919 378 9570, rjm.beachresortph@gmail.com).
4. Direct assistance with booking at /bookings/book or looking up an existing booking ID.

FORBIDDEN TOPICS (MUST ALWAYS REFUSE):
1. Language translation, dictionary definitions, grammar, or vocabulary questions (for example: "anong tagalog ng...", "what is the meaning of...", "translate...", "define..."). Even if the word is "available", "room", "resort", or "booking", YOU MUST REFUSE if the user is asking for a translation or definition rather than asking about our resort's actual rooms or services.
2. Homework, math, coding, science, history (e.g. Jose Rizal, Philippine history, world history, national heroes).
3. General advice, politics, recipes, entertainment, other businesses, general trivia, or chit-chat unrelated to the resort.

MANDATORY REFUSAL BEHAVIOR:
- When a user asks ANY forbidden or off-topic question:
  • You MUST IMMEDIATELY and POLITELY DECLINE.
  • NEVER provide the answer, definition, translation, or trivia—not even as a brief explanation, side note, or example.
  • In Tagalog/Taglish (if asked in Tagalog):
    "Pasensya na po, ako po ay nakalaan lamang para sumagot sa mga katanungan tungkol sa RJM Beach Resort (tulad ng ating mga kuwarto, cottages, rates, amenities, at bookings). Paano po kita matutulungan patungkol sa inyong bakasyon o reservation sa ating resort?"
  • In English (if asked in English):
    "I apologize, but I am exclusively dedicated to assisting with inquiries about RJM Beach Resort (such as accommodations, rates, amenities, and reservations). How may I assist you with your stay at RJM Beach Resort today?"

RESORT INFORMATION:
- Location: Tambong, Barangay Proper Bansud, Bansud, Oriental Mindoro 5210
- Phone: +63 919 378 9570
- Email: rjm.beachresortph@gmail.com
- Standard Check-in: 2:00 PM | Standard Check-out: 12:00 PM (early check-in or late check-out upon request)
- Amenities & Policies: Free Wi-Fi throughout the resort, free spacious parking, pet-friendly (with a small surcharge; inform us during booking), and customizable packages for events/weddings/parties.
- Direct booking path: /bookings/book, rooms gallery: /rooms, cottages gallery: /cottages, services: /services.

${liveData}`;

  if (bookingContext) {
    instruction += `\n\n${bookingContext}`;
  }

  instruction += `

RESPONSE RULES:
1. Natural Bilingualism: Fluently reply in the SAME language the guest uses (English, Tagalog, or Taglish). Use warm Filipino hospitality ("po" and "opo" when replying in Tagalog).
2. Strict Grounding: ONLY quote real accommodation names, capacities, rates, pool fees, amenities, and services from the live database list above. NEVER invent or hallucinate rooms, prices, discounts, or policies not in the list.
3. Personalized Recommendations: When guests ask for recommendations (e.g., for X guests or a certain budget), recommend the most suitable room(s) or cottage(s) from the database list above and briefly highlight why they fit.
4. Booking Lookup: If a guest asks about a booking and booking data is shown above, summarize the status accurately. If they ask about a booking without providing an ID, kindly ask them for their Booking ID number (e.g. "#42").
5. Formatting: Use plain text with **bold** for key names/prices and "• " for bullet points. Keep replies concise and easy to read on mobile screens (under 180 words unless giving a detailed breakdown).
6. Booking & Inquiries: Encourage guests to book at /bookings/book. For custom event packages or questions beyond the facts above, invite them to contact us directly at +63 919 378 9570 or rjm.beachresortph@gmail.com.`;

  return instruction;
}

/**
 * Generate a conversational reply using Google Gemini REST API.
 * Returns null if GEMINI_API_KEY is missing or if the request fails, so the caller can fall back to rule-based replies.
 */
export async function generateGeminiReply(userMessage, history = []) {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey || apiKey === "your_gemini_api_key") {
    return null;
  }

  const model = (process.env.GEMINI_MODEL || "").trim() || DEFAULT_GEMINI_MODEL;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  try {
    const bookingContext = await getBookingContextIfMentioned(userMessage);
    const systemInstruction = await buildSystemInstruction(bookingContext);

    const recentHistory = history.slice(-10).map((turn) => ({
      role: turn.role === "model" ? "model" : "user",
      parts: [{ text: turn.text }],
    }));

    const contents = [
      ...recentHistory,
      { role: "user", parts: [{ text: userMessage }] },
    ];

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        contents,
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 600,
        },
      }),
      signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.warn(`Gemini API error (${response.status}): ${errorText.slice(0, 200)}`);
      return null;
    }

    const data = await response.json();
    const replyText = data?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim();

    return replyText || null;
  } catch (error) {
    console.warn("Gemini API request failed, using fallback:", error.message);
    return null;
  }
}

export function clearResortContextCache() {
  cachedContext = { text: null, expiresAt: 0 };
}
