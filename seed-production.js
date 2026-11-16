/*
  RJMBook — Production Seed Script
  ─────────────────────────────────────────────────────────────
  Run ONCE after a fresh migrate to populate:
    • Admin account
    • Staff account
    • All room types, rooms, and services

  Requires in .env:
    ADMIN_SEED_PASSWORD=<strong password>
    STAFF_SEED_PASSWORD=<strong password>

  Usage:
    node seed-production.js
*/

import dotenv from "dotenv";
dotenv.config();

import bcrypt from "bcrypt";
import { sequelize } from "./models/db.js";
import { User, RoomType, Room, Service } from "./models/index.js";

// ── Guard: require explicit passwords from env ───────────────
const adminPassword = process.env.ADMIN_SEED_PASSWORD;
const staffPassword = process.env.STAFF_SEED_PASSWORD;

if (!adminPassword || !staffPassword) {
  console.error("❌  Set ADMIN_SEED_PASSWORD and STAFF_SEED_PASSWORD in your .env before running this script.");
  process.exit(1);
}

async function seedProduction() {
  try {
    await sequelize.authenticate();
    console.log("✅ Connected to database\n");

    // ── 1. Users ─────────────────────────────────────────────
    const existingAdmin = await User.findOne({ where: { email: "admin@rjmbookadmin.com" } });
    if (existingAdmin) {
      console.log("⏭  Admin account already exists — skipping user creation.");
    } else {
      const [hashedAdmin, hashedStaff] = await Promise.all([
        bcrypt.hash(adminPassword, 12),
        bcrypt.hash(staffPassword, 12),
      ]);
      await User.bulkCreate([
        { name: "Admin",        email: "admin@rjmbookadmin.com",  password: hashedAdmin,  role: "admin" },
        { name: "Resort Staff", email: "staff@rjmresort.com",  password: hashedStaff,  role: "staff" },
      ]);
      console.log("✅ Admin and Staff accounts created.");
    }

    // ── 2. Room Types ─────────────────────────────────────────
    const existingTypes = await RoomType.count();
    if (existingTypes > 0) {
      console.log("⏭  Room types already exist — skipping.");
    } else {
      const [std1, std2, std3, stdFan, familyRoom, functionHall, eventPlace, wholeResort, cottage1, cottage2, cottage3] =
        await RoomType.bulkCreate([
          // ── Rooms ──
          { name: "Standard 1",      description: "Air-conditioned standard room for up to 3 guests. Includes private bathroom and pool access.",                        basePricePerNight: 1800,  maxGuests: 3,   amenities: ["AC", "Private bathroom", "Pool access", "WiFi"],                                              category: "room",    poolFeesIncluded: true,  roomNotes: "Pool fees included in room price." },
          { name: "Standard 2",      description: "Air-conditioned standard room for up to 3 guests. Includes private bathroom and pool access.",                        basePricePerNight: 1800,  maxGuests: 3,   amenities: ["AC", "Private bathroom", "Pool access", "WiFi"],                                              category: "room",    poolFeesIncluded: true,  roomNotes: "Pool fees included in room price." },
          { name: "Standard 3",      description: "Air-conditioned standard room for up to 3 guests. Includes private bathroom and pool access.",                        basePricePerNight: 1800,  maxGuests: 3,   amenities: ["AC", "Private bathroom", "Pool access", "WiFi"],                                              category: "room",    poolFeesIncluded: true,  roomNotes: "Pool fees included in room price." },
          { name: "Standard Fan",    description: "Fan-cooled standard room for up to 3 guests. Includes private bathroom and pool access.",                             basePricePerNight: 1200,  maxGuests: 3,   amenities: ["Electric fan", "Private bathroom", "Pool access", "WiFi"],                                   category: "room",    poolFeesIncluded: true,  roomNotes: "Pool fees included in room price." },
          { name: "Family Room",     description: "Spacious family room suitable for larger groups. Includes all amenities and pool access.",                             basePricePerNight: 4500,  maxGuests: 10,  amenities: ["AC", "Private bathroom", "Pool access", "WiFi", "TV", "Kitchen area"],                       category: "room",    poolFeesIncluded: true,  roomNotes: "Pool fees included in room price." },
          { name: "Function Hall 1", description: "Versatile function hall ideal for events, reunions, and celebrations.",                                               basePricePerNight: 1500,  maxGuests: 50,  amenities: ["Tables", "Chairs", "Basic amenities", "Sound system"],                                       category: "room",    poolFeesIncluded: false, roomNotes: "⚠️ Pool fees NOT INCLUDED — must be arranged separately." },
          { name: "Event Place",     description: "Large dedicated event space for big gatherings and celebrations. Advance booking required.",                           basePricePerNight: 15000, maxGuests: 200, amenities: ["Event space", "Tables", "Chairs", "Sound system", "Stage area"],                            category: "room",    poolFeesIncluded: false, roomNotes: "⚠️ Pool fees NOT INCLUDED. Requires advance booking." },
          { name: "Whole Resort",    description: "Exclusive full-resort reservation. Enjoy the entire property for your event or celebration.",                          basePricePerNight: 50000, maxGuests: 500, amenities: ["All rooms", "All cottages", "Pool", "Function hall", "Event place", "Full resort access"], category: "room",    poolFeesIncluded: true,  roomNotes: "Includes all rooms, cottages, and resort facilities." },
          // ── Cottages ──
          { name: "Cottage 1",       description: "Cozy outdoor cottage perfect for small groups enjoying the poolside. Rate covers 24 hours.",                          basePricePerNight: 500,   maxGuests: 10,  amenities: ["Tables", "Seating", "Basic shelter", "Poolside access"],                                     category: "cottage", poolFeesIncluded: false, roomNotes: "⚠️ Entrance fees are NOT included and must be paid separately." },
          { name: "Cottage 2",       description: "Cozy outdoor cottage perfect for small groups enjoying the poolside. Rate covers 24 hours.",                          basePricePerNight: 500,   maxGuests: 10,  amenities: ["Tables", "Seating", "Basic shelter", "Poolside access"],                                     category: "cottage", poolFeesIncluded: false, roomNotes: "⚠️ Entrance fees are NOT included and must be paid separately." },
          { name: "Cottage 3",       description: "Cozy outdoor cottage perfect for small groups enjoying the poolside. Rate covers 24 hours.",                          basePricePerNight: 500,   maxGuests: 10,  amenities: ["Tables", "Seating", "Basic shelter", "Poolside access"],                                     category: "cottage", poolFeesIncluded: false, roomNotes: "⚠️ Entrance fees are NOT included and must be paid separately." },
        ]);
      console.log("✅ Room types created.");

      // ── 3. Rooms ────────────────────────────────────────────
      await Room.bulkCreate([
        { roomNumber: "STD-1",         roomTypeId: std1.id,         floor: 1, viewType: "Standard",    isAvailable: true },
        { roomNumber: "STD-2",         roomTypeId: std2.id,         floor: 1, viewType: "Standard",    isAvailable: true },
        { roomNumber: "STD-3",         roomTypeId: std3.id,         floor: 1, viewType: "Standard",    isAvailable: true },
        { roomNumber: "STD-FAN-1",     roomTypeId: stdFan.id,       floor: 1, viewType: "Standard",    isAvailable: true },
        { roomNumber: "FAMILY-1",      roomTypeId: familyRoom.id,   floor: 1, viewType: "Premium",     isAvailable: true },
        { roomNumber: "FUNC-HALL-1",   roomTypeId: functionHall.id, floor: 0, viewType: "Event Space", isAvailable: true },
        { roomNumber: "EVENT-PLACE-1", roomTypeId: eventPlace.id,   floor: 0, viewType: "Event Space", isAvailable: true },
        { roomNumber: "WHOLE-RESORT",  roomTypeId: wholeResort.id,  floor: 0, viewType: "Full Resort", isAvailable: true },
        { roomNumber: "COTTAGE-1",     roomTypeId: cottage1.id,     floor: 0, viewType: "Outdoor",     isAvailable: true },
        { roomNumber: "COTTAGE-2",     roomTypeId: cottage2.id,     floor: 0, viewType: "Outdoor",     isAvailable: true },
        { roomNumber: "COTTAGE-3",     roomTypeId: cottage3.id,     floor: 0, viewType: "Outdoor",     isAvailable: true },
      ]);
      console.log("✅ Rooms created.");
    }

    // ── 4. Services ───────────────────────────────────────────
    const existingServices = await Service.count();
    if (existingServices > 0) {
      console.log("⏭  Services already exist — skipping.");
    } else {
      await Service.bulkCreate([
        { name: "Adult/Matanda Entrance", description: "11 years old and up | Day: ₱100 | Night: ₱150", category: "Entrance Fee",       price: 150, durationMinutes: null },
        { name: "Kids/Bata Entrance",     description: "3-10 years old | Day: ₱80 | Night: ₱120",       category: "Entrance Fee",       price: 120, durationMinutes: null },
        { name: "Infant and Toddler",     description: "0 month - 2 years old | FREE",                  category: "Entrance Fee",       price: 0,   durationMinutes: null },
        { name: "Electric Fan",           description: "Rental for air circulation",                     category: "Electricity Charge", price: 150, durationMinutes: null },
        { name: "Rice Cooker",            description: "Available for guest use",                        category: "Electricity Charge", price: 100, durationMinutes: null },
        { name: "Speaker (Small/Big)",    description: "Bluetooth/Not | Availability upon request",      category: "Electricity Charge", price: 150, durationMinutes: null },
      ]);
      console.log("✅ Services created.");
    }

    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅  Production seed complete!

   Admin : admin@rjmbookadmin.com
   Staff : staff@rjmresort.com

   Rooms, cottages, and services are ready.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
  } catch (err) {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

seedProduction();
