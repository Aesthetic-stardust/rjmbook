/*
  RJMBook — ML-Powered Resort Booking | Naruwan Resort
*/
import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

export const Guest = sequelize.define("Guest", {
  firstName: { type: DataTypes.STRING, allowNull: false },
  lastName: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false },
  phone: { type: DataTypes.STRING },
  preferences: { type: DataTypes.JSON, defaultValue: {} },
  userId: { type: DataTypes.INTEGER }
});
