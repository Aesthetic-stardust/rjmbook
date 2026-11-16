/*
  RJMBook — ML-Powered Resort Booking | Naruwan Resort
*/
import express from "express";
import { isAuthenticated } from "../middleware/auth.js";
import { Booking, Guest, Room, RoomType } from "../models/index.js";
import { Op } from "sequelize";
import {
  bookingForm,
  checkAvailability,
  createBooking,
  showBooking,
  listBookings,
  updateBooking,
  customerReservations,
  reservationHistory,
  deleteBooking,
  handleMayaWebhook
} from "../controllers/bookingController.js";

const router = express.Router();
router.get("/reservations", isAuthenticated, reservationHistory);
router.get("/history", isAuthenticated, (req, res) => res.redirect("/bookings/reservations"));
router.get("/my-reservations", isAuthenticated, (req, res) => res.redirect("/bookings/reservations"));

// Webhook route - public access so Maya can ping it
router.post("/webhook/maya", handleMayaWebhook);

// Feedback form for a booking
router.get("/:bookingId/feedback", isAuthenticated, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.session.userId;
    
    const booking = await Booking.findByPk(bookingId, {
      include: [Guest]
    });

    if (!booking) {
      return res.status(404).render("bookings/feedback", {
        title: "Feedback",
        error: "Booking not found",
        bookingId: null,
        guestId: null
      });
    }

    // Fetch reservation history data for the background
    let guests = await Guest.findAll({ where: { userId } });

    let currentReservations = [];
    let pastReservations = [];

    if (guests && guests.length > 0) {
      const guestIds = guests.map(g => g.id);
      
      currentReservations = await Booking.findAll({
        where: {
          guestId: { [Op.in]: guestIds },
          status: { [Op.in]: ["pending", "confirmed"] }
        },
        include: [
          { model: Room, include: [RoomType] },
          { model: Guest }
        ],
        order: [["checkIn", "ASC"]]
      });

      pastReservations = await Booking.findAll({
        where: {
          guestId: { [Op.in]: guestIds },
          status: { [Op.in]: ["completed", "early_checkout", "cancelled", "checked_out"] }
        },
        include: [
          { model: Room, include: [RoomType] },
          { model: Guest }
        ],
        order: [["checkIn", "DESC"]]
      });
    }

    // Calculate nights for each booking
    currentReservations.forEach(b => {
      b.nights = Math.ceil((new Date(b.checkOut) - new Date(b.checkIn)) / (24 * 60 * 60 * 1000));
    });

    pastReservations.forEach(b => {
      b.nights = Math.ceil((new Date(b.checkOut) - new Date(b.checkIn)) / (24 * 60 * 60 * 1000));
    });

    res.render("bookings/feedback", {
      title: "Share Your Experience",
      bookingId: booking.id,
      guestId: booking.guestId,
      booking: booking,
      currentReservations,
      pastReservations,
      userName: req.session.userName
    });
  } catch (error) {
    console.error("Error loading feedback form:", error);
    res.status(500).render("bookings/feedback", {
      title: "Feedback",
      error: "Error loading form",
      bookingId: null,
      guestId: null,
      currentReservations: [],
      pastReservations: [],
      userName: ""
    });
  }
});

router.get("/book", isAuthenticated, bookingForm);
router.get("/availability", isAuthenticated, checkAvailability);
router.get("/:id", isAuthenticated, showBooking);
router.get("/", isAuthenticated, listBookings);
router.post("/", isAuthenticated, createBooking);
router.patch("/:id", isAuthenticated, updateBooking);
router.delete("/:id", isAuthenticated, deleteBooking);

export default router;
