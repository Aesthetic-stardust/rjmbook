/*
  RJMBook — ML-Powered Resort Booking | Naruwan Resort
*/
import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

export const Room = sequelize.define("Room", {
  roomNumber: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  roomTypeId: { type: DataTypes.INTEGER, allowNull: false },
  floor: { type: DataTypes.INTEGER },
  viewType: { type: DataTypes.STRING(50) },
  isAvailable: { type: DataTypes.BOOLEAN, defaultValue: true }
});
