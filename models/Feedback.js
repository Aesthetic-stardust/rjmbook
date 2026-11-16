/*
  RJMBook — Feedback & Review Model
  Stores guest feedback with sentiment analysis
*/

import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

export const Feedback = sequelize.define("Feedback", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  bookingId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "Bookings",
      key: "id"
    }
  },
  guestId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "Guests",
      key: "id"
    }
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 5 }
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  sentiment: {
    type: DataTypes.ENUM("positive", "negative"),
    defaultValue: "positive"
  },
  sentimentBreakdown: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: "Array of phrase-level sentiment analysis: [{ phrase, sentiment, score }]"
  },
  sentimentScore: {
    type: DataTypes.FLOAT,
    defaultValue: 0.5,
    comment: "Score from 0 (negative) to 1 (positive)"
  },
  roomCleanliness: { type: DataTypes.INTEGER, validate: { min: 1, max: 5 } },
  serviceQuality: { type: DataTypes.INTEGER, validate: { min: 1, max: 5 } },
  foodQuality: { type: DataTypes.INTEGER, validate: { min: 1, max: 5 } },
  amenities: { type: DataTypes.INTEGER, validate: { min: 1, max: 5 } },
  valueForMoney: { type: DataTypes.INTEGER, validate: { min: 1, max: 5 } },
  status: {
    type: DataTypes.ENUM("pending", "approved", "rejected"),
    defaultValue: "pending"
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    onUpdate: DataTypes.NOW
  }
}, {
  tableName: "Feedbacks",
  timestamps: true
});
