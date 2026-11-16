/*
  RJMBook — ML-Powered Resort Booking | Naruwan Resort
*/
import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

export const Notification = sequelize.define("Notification", {
  bookingId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "Bookings",
      key: "id"
    }
  },
  type: {
    type: DataTypes.ENUM("pending", "confirmed", "checked_in", "checked_out", "cancelled"),
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
});
