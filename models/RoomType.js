/*
  RJMBook — ML-Powered Resort Booking | Naruwan Resort
*/
import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

export const RoomType = sequelize.define("RoomType", {
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  basePricePerNight: { type: DataTypes.DECIMAL(10, 2), allowNull: false, comment: "Price per day (24 hours)" },
  maxGuests: { type: DataTypes.INTEGER, allowNull: false },
  amenities: { type: DataTypes.JSON, defaultValue: [] },
  imageUrl: { type: DataTypes.STRING },
  category: { type: DataTypes.ENUM('room', 'cottage'), defaultValue: 'room' },
  isAvailable: { type: DataTypes.BOOLEAN, defaultValue: true },
  unavailableReason: { type: DataTypes.STRING(255) },
  linkedRoomId: { type: DataTypes.INTEGER, allowNull: true, comment: "ID of linked room (e.g., Lanyo 1 linked with Lanyo 2)" },
  poolFeesIncluded: { type: DataTypes.BOOLEAN, defaultValue: true, comment: "Whether pool fees are included in room price" },
  roomNotes: { type: DataTypes.TEXT, comment: "Notes about the room (e.g., pool fees details)" },
  dayPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: true, comment: "Day rate (8AM - 5PM) for cottages" },
  nightPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: true, comment: "Night rate (6PM - 11PM) for cottages" }
});
