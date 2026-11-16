/*
  RJMBook — ML-Powered Resort Booking | Naruwan Resort
  Chat Message Model
*/
import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

export const Chat = sequelize.define("Chat", {
  senderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  senderRole: {
    type: DataTypes.ENUM("admin", "user"),
    allowNull: false,
  },
  receiverId: {
    type: DataTypes.INTEGER,
    allowNull: true, // Null for admin messages (sent to all)
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});
