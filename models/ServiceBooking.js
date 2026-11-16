/*
  RJMBook — ML-Powered Resort Booking | Naruwan Resort
*/
import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

export const ServiceBooking = sequelize.define("ServiceBooking", {
  scheduledAt: { type: DataTypes.DATE },
  quantity: { type: DataTypes.INTEGER, defaultValue: 1 },
  notes: { type: DataTypes.TEXT }
});
