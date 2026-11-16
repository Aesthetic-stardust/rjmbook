/*
  RJMBook — Session Log Model
  Records every login, logout, and session expiry event for admin/staff users.
*/
import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

export const SessionLog = sequelize.define("SessionLog", {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: "FK to Users table; null for failed login attempts"
  },
  userName: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: "Snapshot of username at login time"
  },
  role: {
    type: DataTypes.ENUM("admin", "staff", "user", "guest"),
    allowNull: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: "Email used in the login attempt"
  },

  // Event type
  event: {
    type: DataTypes.ENUM("login", "logout", "login_failed", "session_expired", "forced_logout"),
    allowNull: false
  },

  // Request context
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  userAgent: {
    type: DataTypes.STRING(512),
    allowNull: true
  },

  // Session metadata
  sessionId: {
    type: DataTypes.STRING(128),
    allowNull: true,
    comment: "Express session ID"
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: "Session duration in seconds (set on logout/expiry)"
  },
  loggedInAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: "Timestamp of the matching login event"
  },

  // Outcome
  success: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  failureReason: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: "Reason for login failure if applicable"
  }
});
