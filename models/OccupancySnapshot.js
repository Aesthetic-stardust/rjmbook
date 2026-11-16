/*
  RJMBook — ML-Powered Resort Booking | Naruwan Resort
  Used for occupancy forecasting and analytics.
*/
import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

export const OccupancySnapshot = sequelize.define("OccupancySnapshot", {
  date: { type: DataTypes.DATEONLY, allowNull: false },
  totalRooms: { type: DataTypes.INTEGER, allowNull: false },
  occupiedRooms: { type: DataTypes.INTEGER, allowNull: false },
  occupancyRate: { type: DataTypes.DECIMAL(5, 2) }
});
