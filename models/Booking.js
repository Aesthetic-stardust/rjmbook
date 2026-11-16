/*
  RJMBook — ML-Powered Resort Booking | Naruwan Resort
*/
import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

export const Booking = sequelize.define("Booking", {
  checkIn: { type: DataTypes.DATEONLY, allowNull: false },
  checkOut: { type: DataTypes.DATEONLY, allowNull: false },
  adults: { type: DataTypes.INTEGER, defaultValue: 1 },
  children: { type: DataTypes.INTEGER, defaultValue: 0 },
  totalAmount: { type: DataTypes.DECIMAL(10, 2) },
  status: {
    type: DataTypes.ENUM("pending", "confirmed", "checked_in", "checked_out", "cancelled"),
    defaultValue: "pending"
  },
  specialRequests: { type: DataTypes.TEXT },
  cancellationReason: { type: DataTypes.TEXT },
  earlyCheckoutDate: { type: DataTypes.DATEONLY, allowNull: true },
  roomNotes: { type: DataTypes.TEXT, comment: "Notes about room booking (e.g., pool fees included, Lanyo combo, etc.)" },
  rateType: { type: DataTypes.ENUM("day", "night", "full"), allowNull: true, comment: "For cottages: day, night, or full day+night rate" },
  paymentStatus: {
    type: DataTypes.ENUM("unpaid", "paid", "failed", "refunded"),
    defaultValue: "unpaid"
  },
  transactionId: { type: DataTypes.STRING, allowNull: true },
  paymentUrl: { type: DataTypes.STRING, allowNull: true },
  downPaymentPercent: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null, comment: "Percentage of total charged at booking: 0, 50, or 100" },
  downPaymentAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: true, defaultValue: null, comment: "Actual amount due at booking based on downPaymentPercent" }
});
