/*
  RJMBook — ML-Powered Resort Booking | Naruwan Resort
  Seed: room types, rooms, services, and users for Naruwan Resort.
*/
import bcrypt from "bcrypt";
import {
  sequelize,
  User,
  RoomType,
  Room,
  Service
} from "./models/index.js";

async function seed() {
  try {
    await sequelize.authenticate();

    // Check if users exist
    const users = await User.findAll();
    if (users.length > 0) {
      console.log("⏭ Seed already run (users exist). Skip or run migrate to reset.");
      process.exit(0);
      return;
    }

    // Admin password: read from env or fail loudly
    const adminPassword = process.env.ADMIN_SEED_PASSWORD;
    if (!adminPassword) {
      console.error("❌ Set ADMIN_SEED_PASSWORD in your .env before running this script.");
      process.exit(1);
    }
    const hashedAdminPassword = await bcrypt.hash(adminPassword, 12);

    await User.bulkCreate([
      { name: "Admin", email: "admin@rjmbookadmin.com", password: hashedAdminPassword, role: "admin" }
    ]);

    console.log("✅ Admin user created: admin@rjmbookadmin.com");

    const roomTypes = await RoomType.findAll();
    if (roomTypes.length > 0) {
      console.log("⏭ Room types already exist.");
      process.exit(0);
      return;
    }

    // Create room types for Naruwan Resort
    const [std1, std2, std3, stdFan, familyRoom, functionHall, eventPlace, wholeResort, cottage1, cottage2, cottage3] = await RoomType.bulkCreate(
      [
        // ── Rooms ──
        {
          name: "Standard 1",
          description: "Air-conditioned standard room for up to 3 guests. Includes private bathroom and pool access.",
          basePricePerNight: 1800,
          maxGuests: 3,
          amenities: ["AC", "Private bathroom", "Pool access", "WiFi"],
          category: "room",
          poolFeesIncluded: true,
          roomNotes: "Pool fees included in room price."
        },
        {
          name: "Standard 2",
          description: "Air-conditioned standard room for up to 3 guests. Includes private bathroom and pool access.",
          basePricePerNight: 1800,
          maxGuests: 3,
          amenities: ["AC", "Private bathroom", "Pool access", "WiFi"],
          category: "room",
          poolFeesIncluded: true,
          roomNotes: "Pool fees included in room price."
        },
        {
          name: "Standard 3",
          description: "Air-conditioned standard room for up to 3 guests. Includes private bathroom and pool access.",
          basePricePerNight: 1800,
          maxGuests: 3,
          amenities: ["AC", "Private bathroom", "Pool access", "WiFi"],
          category: "room",
          poolFeesIncluded: true,
          roomNotes: "Pool fees included in room price."
        },
        {
          name: "Standard Fan",
          description: "Fan-cooled standard room for up to 3 guests. Includes private bathroom and pool access.",
          basePricePerNight: 1200,
          maxGuests: 3,
          amenities: ["Electric fan", "Private bathroom", "Pool access", "WiFi"],
          category: "room",
          poolFeesIncluded: true,
          roomNotes: "Pool fees included in room price."
        },
        {
          name: "Family Room",
          description: "Spacious family room suitable for larger groups. Includes all amenities and pool access.",
          basePricePerNight: 4500,
          maxGuests: 10,
          amenities: ["AC", "Private bathroom", "Pool access", "WiFi", "TV", "Kitchen area"],
          category: "room",
          poolFeesIncluded: true,
          roomNotes: "Pool fees included in room price."
        },
        {
          name: "Function Hall 1",
          description: "Versatile function hall ideal for events, reunions, and celebrations.",
          basePricePerNight: 1500,
          maxGuests: 50,
          amenities: ["Tables", "Chairs", "Basic amenities", "Sound system"],
          category: "room",
          poolFeesIncluded: false,
          roomNotes: "⚠️ Pool fees NOT INCLUDED — must be arranged separately."
        },
        {
          name: "Event Place",
          description: "Large dedicated event space for big gatherings and celebrations. Advance booking required.",
          basePricePerNight: 15000,
          maxGuests: 200,
          amenities: ["Event space", "Tables", "Chairs", "Sound system", "Stage area"],
          category: "room",
          poolFeesIncluded: false,
          roomNotes: "⚠️ Pool fees NOT INCLUDED. Requires advance booking."
        },
        {
          name: "Whole Resort",
          description: "Exclusive full-resort reservation. Enjoy the entire property for your event or celebration.",
          basePricePerNight: 50000,
          maxGuests: 500,
          amenities: ["All rooms", "All cottages", "Pool", "Function hall", "Event place", "Full resort access"],
          category: "room",
          poolFeesIncluded: true,
          roomNotes: "Includes all rooms, cottages, and resort facilities."
        },
        // ── Cottages ──
        {
          name: "Cottage 1",
          description: "Cozy outdoor cottage perfect for small groups enjoying the poolside. Rate covers 24 hours.",
          basePricePerNight: 500,
          maxGuests: 10,
          amenities: ["Tables", "Seating", "Basic shelter", "Poolside access"],
          category: "cottage",
          poolFeesIncluded: false,
          roomNotes: "⚠️ Entrance fees are NOT included and must be paid separately."
        },
        {
          name: "Cottage 2",
          description: "Cozy outdoor cottage perfect for small groups enjoying the poolside. Rate covers 24 hours.",
          basePricePerNight: 500,
          maxGuests: 10,
          amenities: ["Tables", "Seating", "Basic shelter", "Poolside access"],
          category: "cottage",
          poolFeesIncluded: false,
          roomNotes: "⚠️ Entrance fees are NOT included and must be paid separately."
        },
        {
          name: "Cottage 3",
          description: "Cozy outdoor cottage perfect for small groups enjoying the poolside. Rate covers 24 hours.",
          basePricePerNight: 500,
          maxGuests: 10,
          amenities: ["Tables", "Seating", "Basic shelter", "Poolside access"],
          category: "cottage",
          poolFeesIncluded: false,
          roomNotes: "⚠️ Entrance fees are NOT included and must be paid separately."
        }
      ],
      { validate: true }
    );

    await Room.bulkCreate([
      { roomNumber: "STD-1",           roomTypeId: std1.id,         floor: 1, viewType: "Standard",    isAvailable: true },
      { roomNumber: "STD-2",           roomTypeId: std2.id,         floor: 1, viewType: "Standard",    isAvailable: true },
      { roomNumber: "STD-3",           roomTypeId: std3.id,         floor: 1, viewType: "Standard",    isAvailable: true },
      { roomNumber: "STD-FAN-1",       roomTypeId: stdFan.id,       floor: 1, viewType: "Standard",    isAvailable: true },
      { roomNumber: "FAMILY-1",        roomTypeId: familyRoom.id,   floor: 1, viewType: "Premium",     isAvailable: true },
      { roomNumber: "FUNC-HALL-1",     roomTypeId: functionHall.id, floor: 0, viewType: "Event Space", isAvailable: true },
      { roomNumber: "EVENT-PLACE-1",   roomTypeId: eventPlace.id,   floor: 0, viewType: "Event Space", isAvailable: true },
      { roomNumber: "WHOLE-RESORT",    roomTypeId: wholeResort.id,  floor: 0, viewType: "Full Resort", isAvailable: true },
      // Cottages
      { roomNumber: "COTTAGE-1",       roomTypeId: cottage1.id,     floor: 0, viewType: "Outdoor",     isAvailable: true },
      { roomNumber: "COTTAGE-2",       roomTypeId: cottage2.id,     floor: 0, viewType: "Outdoor",     isAvailable: true },
      { roomNumber: "COTTAGE-3",       roomTypeId: cottage3.id,     floor: 0, viewType: "Outdoor",     isAvailable: true }
    ]);

    await Service.bulkCreate([
      { name: "Adult/Matanda Entrance", description: "11 years old and up | Day: ₱100 | Night: ₱150", category: "Entrance Fee", price: 150, durationMinutes: null },
      { name: "Kids/Bata Entrance", description: "3-10 years old | Day: ₱80 | Night: ₱120", category: "Entrance Fee", price: 120, durationMinutes: null },
      { name: "Infant and Toddler", description: "0 month - 2 years old | FREE", category: "Entrance Fee", price: 0, durationMinutes: null },
      { name: "Electric Fan", description: "Rental for air circulation", category: "Electricity Charge", price: 150, durationMinutes: null },
      { name: "Rice Cooker", description: "Available for guest use", category: "Electricity Charge", price: 100, durationMinutes: null },
      { name: "Speaker (Small/Big)", description: "Bluetooth/Not | Availability upon request", category: "Electricity Charge", price: 150, durationMinutes: null }
    ]);

    console.log("✅ Seed complete: users, room types, rooms, cottages, and services created.");
  } catch (err) {
    console.error("❌ Seed failed:", err);
  } finally {
    process.exit();
  }
}

seed();
