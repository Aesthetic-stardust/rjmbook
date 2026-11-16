/*
  RJMBook — ML-Powered Resort Booking | Naruwan Resort
  XianFire Framework — Mindoro State University
*/
import { sequelize } from "./models/db.js";
import {
  User,
  RoomType,
  Room,
  Guest,
  Booking,
  Service,
  ServiceBooking,
  OccupancySnapshot
} from "./models/index.js";
import inquirer from "inquirer";

const { createDb } = await inquirer.prompt([
  { type: "confirm", name: "createDb", message: "Database 'narubook' may not exist. Create it?", default: true }
]);

if (createDb) {
  await sequelize.query("CREATE DATABASE IF NOT EXISTS narubook;");
  console.log("✅ Database created (if it did not exist)");
}

try {
  await sequelize.authenticate();
  console.log("✅ Connected to MySQL database!");
  await sequelize.sync({ force: true });
  console.log("✅ Tables created for all models!");
} catch (err) {
  console.error("❌ Migration failed:", err);
} finally {
  process.exit();
}
