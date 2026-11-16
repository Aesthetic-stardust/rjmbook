/*
  RJMBook — Staff Routes
*/
import express from "express";
import { isStaff } from "../middleware/auth.js";
import {
  staffDashboard,
  staffReservations,
  staffGuests,
  staffBookingForm,
  staffRoomStatus,
  staffReservationCalendar
} from "../controllers/staffController.js";

const router = express.Router();

router.get("/",            isStaff, staffDashboard);
router.get("/reservations", isStaff, staffReservations);
router.get("/reservation-calendar", isStaff, staffReservationCalendar);
router.get("/guests",       isStaff, staffGuests);
router.get("/book",         isStaff, staffBookingForm);
router.get("/room-status",  isStaff, staffRoomStatus);

export default router;
