/*
  RJMBook — ML-Powered Resort Booking | Naruwan Resort
  Central model exports and associations.
*/
import { sequelize } from "./db.js";
import { User } from "./userModel.js";
import { RoomType } from "./RoomType.js";
import { Room } from "./Room.js";
import { Guest } from "./Guest.js";
import { Booking } from "./Booking.js";
import { Service } from "./Service.js";
import { ServiceBooking } from "./ServiceBooking.js";
import { OccupancySnapshot } from "./OccupancySnapshot.js";
import { Chat } from "./Chat.js";
import { Notification } from "./Notification.js";
import { Feedback } from "./Feedback.js";
import { AuditLog } from "./AuditLog.js";
import { SessionLog } from "./SessionLog.js";
import { PaymentSetting } from "./PaymentSetting.js";

// RoomType -> Room (one-to-many)
RoomType.hasMany(Room, { foreignKey: "roomTypeId" });
Room.belongsTo(RoomType, { foreignKey: "roomTypeId" });

// Guest -> Booking (one-to-many)
Guest.hasMany(Booking, { foreignKey: "guestId" });
Booking.belongsTo(Guest, { foreignKey: "guestId" });

// Room -> Booking (one-to-many)
Room.hasMany(Booking, { foreignKey: "roomId" });
Booking.belongsTo(Room, { foreignKey: "roomId" });

// Booking <-> Service (many-to-many via ServiceBooking)
Booking.belongsToMany(Service, { through: ServiceBooking, foreignKey: "bookingId" });
Service.belongsToMany(Booking, { through: ServiceBooking, foreignKey: "serviceId" });

// Booking -> Notification (one-to-many)
Booking.hasMany(Notification, { foreignKey: "bookingId" });
Notification.belongsTo(Booking, { foreignKey: "bookingId" });

// User -> Chat (one-to-many)
User.hasMany(Chat, { foreignKey: "senderId", as: "sentChats" });
Chat.belongsTo(User, { foreignKey: "senderId", as: "sender" });

// Booking -> Feedback (one-to-many)
Booking.hasMany(Feedback, { foreignKey: "bookingId" });
Feedback.belongsTo(Booking, { foreignKey: "bookingId" });

// Guest -> Feedback (one-to-many)
Guest.hasMany(Feedback, { foreignKey: "guestId" });
Feedback.belongsTo(Guest, { foreignKey: "guestId" });

// User -> AuditLog (one-to-many)
User.hasMany(AuditLog, { foreignKey: "userId", onDelete: "SET NULL" });
AuditLog.belongsTo(User, { foreignKey: "userId" });

// User -> SessionLog (one-to-many)
User.hasMany(SessionLog, { foreignKey: "userId", onDelete: "SET NULL" });
SessionLog.belongsTo(User, { foreignKey: "userId" });

export {
  sequelize,
  User,
  RoomType,
  Room,
  Guest,
  Booking,
  Service,
  ServiceBooking,
  OccupancySnapshot,
  Chat,
  Notification,
  Feedback,
  AuditLog,
  SessionLog,
  PaymentSetting
};
