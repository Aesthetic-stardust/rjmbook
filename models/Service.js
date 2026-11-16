/*
  RJMBook — ML-Powered Resort Booking | Naruwan Resort
*/
import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

export const Service = sequelize.define("Service", {
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  category: { type: DataTypes.STRING(50) },
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  durationMinutes: { type: DataTypes.INTEGER }
});
