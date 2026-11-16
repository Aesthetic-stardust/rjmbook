import express from "express";
import { isAdmin } from "../middleware/auth.js";
import { adminDashboard, adminReservations, adminReports, adminRoomAvailability, getPaymentSettings, updatePaymentSettings } from "../controllers/adminController.js";
import { adminRoomManagement, adminCottageManagement } from "../controllers/roomController.js";
import { sentimentAnalysisDashboard, exportSentimentData } from "../controllers/sentimentAnalysisController.js";
import { listStaff, createStaff, updateStaff, deleteStaff } from "../controllers/staffManagementController.js";
import { getAuditLogs, getSessionLogs } from "../controllers/auditLogController.js";
import { RoomType } from "../models/index.js";

const router = express.Router();

router.get("/",            isAdmin, adminDashboard);
router.get("/reservations", isAdmin, adminReservations);
router.get("/reports",      isAdmin, adminReports);
router.get("/room-availability", isAdmin, adminRoomAvailability);
router.get("/payment-settings",  isAdmin, getPaymentSettings);
router.post("/payment-settings", isAdmin, updatePaymentSettings);
router.get("/reservation-calendar", isAdmin, async (req, res) => {
  try {
    const { Op } = await import("sequelize");
    const { Booking, Room, RoomType, Guest } = await import("../models/index.js");
    const { start, end, category } = req.query;
    
    // Default to current month if no dates provided
    const today = new Date();
    const defaultStart = start || new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    const defaultEnd = end || new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);
    
    // Build query for bookings
    const bookingWhere = {
      status: { [Op.notIn]: ["cancelled"] },
      [Op.or]: [
        { checkIn: { [Op.between]: [defaultStart, defaultEnd] } },
        { checkOut: { [Op.between]: [defaultStart, defaultEnd] } },
        { [Op.and]: [{ checkIn: { [Op.lte]: defaultStart } }, { checkOut: { [Op.gte]: defaultEnd } }] }
      ]
    };
    
    // Filter by room category if provided
    const roomTypeWhere = {};
    if (category && (category === 'room' || category === 'cottage')) {
      roomTypeWhere.category = category;
    }
    
    const bookings = await Booking.findAll({
      where: bookingWhere,
      include: [
        { 
          model: Room, 
          include: [{ model: RoomType, where: Object.keys(roomTypeWhere).length > 0 ? roomTypeWhere : {}, required: Object.keys(roomTypeWhere).length > 0 }]
        },
        { model: Guest }
      ],
      order: [["checkIn", "ASC"]]
    });
    
    // Get all room types for filter dropdown
    const roomTypes = await RoomType.findAll({
      where: { category: { [Op.in]: ['room', 'cottage'] } },
      order: [['category', 'ASC'], ['name', 'ASC']]
    });
    
    // Group bookings by date
    const bookingsByDate = {};
    bookings.forEach(booking => {
      const bookingData = booking.toJSON();
      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);
      
      // Iterate through each day of the booking
      for (let d = new Date(checkIn); d < checkOut; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().slice(0, 10);
        if (!bookingsByDate[dateStr]) {
          bookingsByDate[dateStr] = [];
        }
        bookingsByDate[dateStr].push(bookingData);
      }
    });
    
    res.render("admin/reservation-calendar", {
      title: "Reservation Calendar | Naruwan Resort",
      bookings: bookings.map(b => b.toJSON()),
      bookingsByDate: JSON.stringify(bookingsByDate),
      roomTypes,
      selectedCategory: category || '',
      startDate: defaultStart,
      endDate: defaultEnd,
      today: today.toISOString().slice(0, 10),
      sessionUserName: req.session.userName
    });
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});
router.get("/rooms",        isAdmin, adminRoomManagement);
router.get("/cottages",     isAdmin, adminCottageManagement);
router.get("/sentiment-analysis",        isAdmin, sentimentAnalysisDashboard);
router.get("/sentiment-analysis/export", isAdmin, exportSentimentData);

// Walk-in booking form (admin creates booking on behalf of guest)
router.get("/book", isAdmin, async (req, res) => {
  try {
    const { Op } = await import("sequelize");
    const allRoomTypes = await RoomType.findAll({
      where: { isAvailable: true },
      raw: true
    });
    
    const rooms = allRoomTypes.filter(rt => rt.category === 'room');
    const cottages = allRoomTypes.filter(rt => rt.category === 'cottage');
    
    res.render("admin/booking-form", {
      title: "Walk-in Booking | Admin",
      rooms,
      cottages
    });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Staff management
router.get("/staff",          isAdmin, listStaff);
router.post("/staff",         isAdmin, createStaff);
router.put("/staff/:id",      isAdmin, updateStaff);
router.delete("/staff/:id",   isAdmin, deleteStaff);

// Security — Audit & Session logs
router.get("/audit-logs",   isAdmin, getAuditLogs);
router.get("/session-logs", isAdmin, getSessionLogs);

export default router;
