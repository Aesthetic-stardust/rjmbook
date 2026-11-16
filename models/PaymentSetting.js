/*
  PaymentSetting — global online booking payment policy
  Only one row ever exists (id = 1). Admin updates it from the Payment Settings page.
*/
import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

export const PaymentSetting = sequelize.define("PaymentSetting", {
  downPaymentPercent: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 100,
    comment: "Percentage of total amount charged to online guests at booking: 0, 50, or 100"
  }
});
