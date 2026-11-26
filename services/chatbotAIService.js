/*
  RJMBook — Chatbot AI Service (Google Gemini)
  Grounds responses with live RoomType and Service data from MySQL.
*/

import { RoomType } from "../models/RoomType.js";
import { Service } from "../models/Service.js";

const DEFAULT_GEMINI_MODEL = "gemini-flash-latest";
const RESORT_CONTEXT_TTL_MS = 2 * 60 * 1000; // 2 minutes
const GEMINI_TIMEOUT_MS = 12000;

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
  const poolFee = rt.poolFeesIncluded ? "Pool fees included" : "Pool fees not included";
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

  const contextText = `AVAILABLE ACCOMMODATIONS (live from database):
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
 * Build the system instruction for the resort concierge assistant.
 */
async function buildSystemInstruction() {
  const liveData = await getLiveResortContext();

  return `You are the friendly AI booking concierge for RJM Beach Resort (RJMBook / Naruwan Resort).

RESORT INFORMATION:
- Location: Tambong, Barangay Proper Bansud, Bansud, Oriental Mindoro 5210
- Phone: +63 919 378 9570
- Email: rjm.beachresortph@gmail.com
- Standard Check-in: 2:00 PM | Standard Check-out: 12:00 PM (early check-in / late check-out upon request)
- Amenities & Policies: Free Wi-Fi throughout the resort, free spacious parking, pet-friendly (with a small surcharge; inform us during booking), and customizable packages for weddings/events/parties.
- Website paths: Book at /bookings/book, view rooms at /rooms, cottages at /cottages, services at /services.

${liveData}

RESPONSE RULES:
1. Reply naturally in the same language as the guest (English, Tagalog, or Taglish).
2. Be warm, helpful, and concise (under 180 words unless listing options).
3. ONLY quote accommodation names, capacities, rates, amenities, and services from the live database list above. Never invent rooms, prices, or discounts.
4. Format replies using plain text, **bold** for emphasis, and "• " for bullet points. Avoid Markdown tables or headings (#).
5. If a guest asks to check their booking or reservation status, tell them to type "check my booking" and provide their Booking ID so the system can look it up securely.
6. If a question cannot be answered from the facts above (such as exact real-time date availability or custom event quotes), politely advise them to check /bookings/book or contact +63 919 378 9570 / rjm.beachresortph@gmail.com.`;
}

/**
 * Generate a conversational reply using Google Gemini REST API.
 * Returns null if GEMINI_API_KEY is missing or if the request fails, so the caller can fall back to rule-based replies.
 */
export async function generateGeminiReply(userMessage, history = []) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === "your_gemini_api_key") {
    return null;
  }

  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  try {
    const systemInstruction = await buildSystemInstruction();

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
          temperature: 0.4,
          maxOutputTokens: 500,
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
