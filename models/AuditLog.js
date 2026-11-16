/*
  RJMBook — Audit Log Model
  Tracks every significant action performed by admin/staff users.
*/
import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

export const AuditLog = sequelize.define("AuditLog", {
  // Who did it
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,   // null = unauthenticated request
    comment: "FK to Users table"
  },
  userName: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: "Snapshot of the user's name at the time of the action"
  },
  role: {
    type: DataTypes.ENUM("admin", "staff", "user", "guest"),
    allowNull: true
  },

  // What they did
  action: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: "Short action code e.g. BOOKING_CONFIRMED, ROOM_UPDATED"
  },
  module: {
    type: DataTypes.STRING(60),
    allowNull: false,
    comment: "Module/feature area e.g. bookings, rooms, staff, auth"
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: "Human-readable summary of what changed"
  },
  targetType: {
    type: DataTypes.STRING(60),
    allowNull: true,
    comment: "Resource type that was affected e.g. Booking, Room, User"
  },
  targetId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: "Primary key of the affected record"
  },
  changes: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: "Before/after snapshot { before: {}, after: {} }"
  },

  // Request context
  ipAddress: {
    type: DataTypes.STRING(45),   // IPv6 max length
    allowNull: true
  },
  userAgent: {
    type: DataTypes.STRING(512),
    allowNull: true
  },
  method: {
    type: DataTypes.STRING(10),
    allowNull: true,
    comment: "HTTP method: GET POST PUT DELETE"
  },
  path: {
    type: DataTypes.STRING(512),
    allowNull: true,
    comment: "Request path"
  },

  // Outcome
  status: {
    type: DataTypes.ENUM("success", "failure", "warning"),
    defaultValue: "success"
  }
});
