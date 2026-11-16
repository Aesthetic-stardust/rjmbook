/*
  RJMBook — Add Room Type Enhancements
  Adds linkedRoomId, poolFeesIncluded, and roomNotes to RoomType
  Adds roomNotes to Booking for tracking room-specific information
*/

import { DataTypes } from "sequelize";
import { sequelize } from "../models/db.js";

export async function up() {
  const transaction = await sequelize.transaction();
  try {
    // Add columns to RoomType
    await sequelize.getQueryInterface().addColumn(
      "RoomTypes",
      "linkedRoomId",
      {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "ID of linked room (e.g., Lanyo 1 linked with Lanyo 2)"
      },
      { transaction }
    );

    await sequelize.getQueryInterface().addColumn(
      "RoomTypes",
      "poolFeesIncluded",
      {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: "Whether pool fees are included in room price"
      },
      { transaction }
    );

    await sequelize.getQueryInterface().addColumn(
      "RoomTypes",
      "roomNotes",
      {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Notes about the room (e.g., pool fees details)"
      },
      { transaction }
    );

    // Add column to Booking
    await sequelize.getQueryInterface().addColumn(
      "Bookings",
      "roomNotes",
      {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Notes about room booking (e.g., pool fees included, Lanyo combo, etc.)"
      },
      { transaction }
    );

    await transaction.commit();
    console.log("✅ Migration: Room type enhancements applied successfully");
  } catch (error) {
    await transaction.rollback();
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

export async function down() {
  const transaction = await sequelize.transaction();
  try {
    // Revert RoomType columns
    await sequelize.getQueryInterface().removeColumn("RoomTypes", "linkedRoomId", { transaction });
    await sequelize.getQueryInterface().removeColumn("RoomTypes", "poolFeesIncluded", { transaction });
    await sequelize.getQueryInterface().removeColumn("RoomTypes", "roomNotes", { transaction });

    // Revert Booking column
    await sequelize.getQueryInterface().removeColumn("Bookings", "roomNotes", { transaction });

    await transaction.commit();
    console.log("✅ Migration rolled back successfully");
  } catch (error) {
    await transaction.rollback();
    console.error("❌ Rollback failed:", error);
    throw error;
  }
}
