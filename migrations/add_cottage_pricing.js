/*
  RJMBook — Add Cottage Pricing
  Adds dayPrice and nightPrice to RoomType for cottage day/night rate support
*/

import { DataTypes } from "sequelize";
import { sequelize } from "../models/db.js";

export async function up() {
  const transaction = await sequelize.transaction();
  try {
    // Add columns to RoomType
    await sequelize.getQueryInterface().addColumn(
      "RoomTypes",
      "dayPrice",
      {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: "Day rate (8AM - 5PM) for cottages"
      },
      { transaction }
    );

    await sequelize.getQueryInterface().addColumn(
      "RoomTypes",
      "nightPrice",
      {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: "Night rate (6PM - 11PM) for cottages"
      },
      { transaction }
    );

    await transaction.commit();
    console.log("✅ Migration successful: Added dayPrice and nightPrice columns to RoomTypes");
  } catch (err) {
    await transaction.rollback();
    console.error("❌ Migration failed:", err);
    throw err;
  }
}

export async function down() {
  const transaction = await sequelize.transaction();
  try {
    await sequelize.getQueryInterface().removeColumn("RoomTypes", "dayPrice", { transaction });
    await sequelize.getQueryInterface().removeColumn("RoomTypes", "nightPrice", { transaction });
    await transaction.commit();
    console.log("✅ Rollback successful: Removed dayPrice and nightPrice columns");
  } catch (err) {
    await transaction.rollback();
    console.error("❌ Rollback failed:", err);
    throw err;
  }
}
