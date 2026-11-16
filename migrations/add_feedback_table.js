/*
  RJMBook Migration — Add Feedback table with sentiment analysis
  Run: node migrate.js
*/

import { sequelize } from "../models/db.js";
import { DataTypes } from "sequelize";

export async function up() {
  const transaction = await sequelize.transaction();
  try {
    // Create Feedbacks table
    await sequelize.getQueryInterface().createTable("Feedbacks", {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      bookingId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "Bookings",
          key: "id"
        },
        onDelete: "CASCADE"
      },
      guestId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "Guests",
          key: "id"
        },
        onDelete: "CASCADE"
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
        type: DataTypes.ENUM("positive", "negative", "neutral"),
        defaultValue: "neutral"
      },
      sentimentScore: {
        type: DataTypes.FLOAT,
        defaultValue: 0.5,
        comment: "Score from 0 (negative) to 1 (positive)"
      },
      roomCleanliness: { 
        type: DataTypes.INTEGER, 
        validate: { min: 1, max: 5 },
        allowNull: true 
      },
      serviceQuality: { 
        type: DataTypes.INTEGER, 
        validate: { min: 1, max: 5 },
        allowNull: true 
      },
      foodQuality: { 
        type: DataTypes.INTEGER, 
        validate: { min: 1, max: 5 },
        allowNull: true 
      },
      amenities: { 
        type: DataTypes.INTEGER, 
        validate: { min: 1, max: 5 },
        allowNull: true 
      },
      valueForMoney: { 
        type: DataTypes.INTEGER, 
        validate: { min: 1, max: 5 },
        allowNull: true 
      },
      status: {
        type: DataTypes.ENUM("pending", "approved", "rejected"),
        defaultValue: "pending"
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
        onUpdate: DataTypes.NOW
      }
    }, { transaction });

    console.log("✅ Feedbacks table created successfully");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await transaction.commit();
  }
}

export async function down() {
  const transaction = await sequelize.transaction();
  try {
    await sequelize.getQueryInterface().dropTable("Feedbacks", { transaction });
    console.log("✅ Feedbacks table dropped");
  } catch (error) {
    console.error("❌ Rollback failed:", error);
    throw error;
  } finally {
    await transaction.commit();
  }
}
