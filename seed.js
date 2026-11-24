/*
  RJMBook — ML-Powered Resort Booking | Naruwan Resort
  Seed: room types, rooms, services, and users for Naruwan Resort.
*/
import "dotenv/config";
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
    console.log("✅ Database connected successfully.");

    // 1. Seed admin if no admin exists
    const adminExists = await User.findOne({ where: { role: "admin" } });
    if (!adminExists) {
      const adminPassword = process.env.ADMIN_SEED_PASSWORD || "admin123";
      const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);
      await User.create({
        name: "Admin",
        email: "admin@rjmbookadmin.com",
        password: hashedAdminPassword,
        role: "admin"
      });
      console.log("✅ Admin user created: admin@rjmbookadmin.com");
    } else {
      console.log("⏭ Admin user already exists — skipping.");
    }

    // 1b. Seed default staff if no staff exists
    const staffExists = await User.findOne({ where: { role: "staff" } });
    if (!staffExists) {
      const staffPassword = process.env.STAFF_SEED_PASSWORD || "staff123";
      const hashedStaffPassword = await bcrypt.hash(staffPassword, 10);
      await User.create({
        name: "Resort Staff",
        email: "staff@rjmresort.com",
        password: hashedStaffPassword,
        role: "staff"
      });
      console.log("✅ Staff user created: staff@rjmresort.com");
    } else {
      console.log("⏭ Staff user already exists — skipping.");
    }

    // 2. Seed Room Types
    let roomTypes = await RoomType.findAll();
    if (roomTypes.length === 0) {
      roomTypes = await RoomType.bulkCreate(
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
            dayPrice: 300,
            nightPrice: 400,
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
            dayPrice: 300,
            nightPrice: 400,
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
            dayPrice: 300,
            nightPrice: 400,
            maxGuests: 10,
            amenities: ["Tables", "Seating", "Basic shelter", "Poolside access"],
            category: "cottage",
            poolFeesIncluded: false,
            roomNotes: "⚠️ Entrance fees are NOT included and must be paid separately."
          }
        ],
        { validate: true }
      );
      console.log(`✅ ${roomTypes.length} Room types created successfully.`);
    } else {
      console.log(`⏭ Room types already exist (${roomTypes.length}) — skipping.`);
    }

    // 3. Seed Rooms (physical units)
    const roomsCount = await Room.count();
    if (roomsCount === 0) {
      const getRt = (name) => roomTypes.find((rt) => rt.name === name);
      const std1 = getRt("Standard 1");
      const std2 = getRt("Standard 2");
      const std3 = getRt("Standard 3");
      const stdFan = getRt("Standard Fan");
      const familyRoom = getRt("Family Room");
      const functionHall = getRt("Function Hall 1");
      const eventPlace = getRt("Event Place");
      const wholeResort = getRt("Whole Resort");
      const cottage1 = getRt("Cottage 1");
      const cottage2 = getRt("Cottage 2");
      const cottage3 = getRt("Cottage 3");

      const roomsToCreate = [];
      if (std1) roomsToCreate.push({ roomNumber: "STD-1", roomTypeId: std1.id, floor: 1, viewType: "Standard", isAvailable: true });
      if (std2) roomsToCreate.push({ roomNumber: "STD-2", roomTypeId: std2.id, floor: 1, viewType: "Standard", isAvailable: true });
      if (std3) roomsToCreate.push({ roomNumber: "STD-3", roomTypeId: std3.id, floor: 1, viewType: "Standard", isAvailable: true });
      if (stdFan) roomsToCreate.push({ roomNumber: "STD-FAN-1", roomTypeId: stdFan.id, floor: 1, viewType: "Standard", isAvailable: true });
      if (familyRoom) roomsToCreate.push({ roomNumber: "FAMILY-1", roomTypeId: familyRoom.id, floor: 1, viewType: "Premium", isAvailable: true });
      if (functionHall) roomsToCreate.push({ roomNumber: "FUNC-HALL-1", roomTypeId: functionHall.id, floor: 0, viewType: "Event Space", isAvailable: true });
      if (eventPlace) roomsToCreate.push({ roomNumber: "EVENT-PLACE-1", roomTypeId: eventPlace.id, floor: 0, viewType: "Event Space", isAvailable: true });
      if (wholeResort) roomsToCreate.push({ roomNumber: "WHOLE-RESORT", roomTypeId: wholeResort.id, floor: 0, viewType: "Full Resort", isAvailable: true });
      if (cottage1) roomsToCreate.push({ roomNumber: "COTTAGE-1", roomTypeId: cottage1.id, floor: 0, viewType: "Outdoor", isAvailable: true });
      if (cottage2) roomsToCreate.push({ roomNumber: "COTTAGE-2", roomTypeId: cottage2.id, floor: 0, viewType: "Outdoor", isAvailable: true });
      if (cottage3) roomsToCreate.push({ roomNumber: "COTTAGE-3", roomTypeId: cottage3.id, floor: 0, viewType: "Outdoor", isAvailable: true });

      if (roomsToCreate.length > 0) {
        await Room.bulkCreate(roomsToCreate);
        console.log(`✅ ${roomsToCreate.length} physical rooms created successfully.`);
      }
    } else {
      console.log(`⏭ Physical rooms already exist (${roomsCount}) — skipping.`);
    }

    // 4. Seed Services
    const servicesCount = await Service.count();
    if (servicesCount === 0) {
      await Service.bulkCreate([
        { name: "Adult/Matanda Entrance", description: "11 years old and up | Day: ₱100 | Night: ₱150", category: "Entrance Fee", price: 150, durationMinutes: null },
        { name: "Kids/Bata Entrance", description: "3-10 years old | Day: ₱80 | Night: ₱120", category: "Entrance Fee", price: 120, durationMinutes: null },
        { name: "Infant and Toddler", description: "0 month - 2 years old | FREE", category: "Entrance Fee", price: 0, durationMinutes: null },
        { name: "Electric Fan", description: "Rental for air circulation", category: "Electricity Charge", price: 150, durationMinutes: null },
        { name: "Rice Cooker", description: "Available for guest use", category: "Electricity Charge", price: 100, durationMinutes: null },
        { name: "Speaker (Small/Big)", description: "Bluetooth/Not | Availability upon request", category: "Electricity Charge", price: 150, durationMinutes: null }
      ]);
      console.log("✅ Services created successfully.");
    } else {
      console.log(`⏭ Services already exist (${servicesCount}) — skipping.`);
    }

    console.log("🎉 Seeding completed successfully!");
  } catch (err) {
    console.error("❌ Seed failed:", err);
  } finally {
    process.exit();
  }
}

seed();
