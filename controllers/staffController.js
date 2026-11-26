/*
  RJMBook — Staff Controller
  Handles staff dashboard, reservations management, guest lookup, and walk-in booking.
*/
import { Booking, Room, RoomType, Guest, Notification, Feedback } from "../models/index.js";
import { Op } from "sequelize";

// ── Staff Dashboard ──────────────────────────────────────────────────────────
export async function staffDashboard(req, res) {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const totalRooms = await Room.count();

    // Today's check-ins (confirmed bookings with checkIn = today)
    const todayCheckIns = await Booking.count({
      where: { checkIn: today, status: { [Op.in]: ["confirmed", "pending"] } }
    });

    // Today's check-outs (checked_in bookings with checkOut = today)
    const todayCheckOuts = await Booking.count({
      where: { checkOut: today, status: "checked_in" }
    });

    // Currently occupied (checked_in)
    const currentlyOccupied = await Booking.count({
      where: { status: "checked_in" }
    });

    // Pending approvals
    const pendingCount = await Booking.count({ where: { status: "pending" } });

    // Recent bookings (last 10)
    const recentBookings = await Booking.findAll({
      order: [["createdAt", "DESC"]],
      limit: 10,
      include: [
        { model: Room, include: [RoomType] },
        { model: Guest }
      ]
    });

    // Today's arrivals (full list)
    const todayArrivals = await Booking.findAll({
      where: { checkIn: today, status: { [Op.in]: ["confirmed", "pending"] } },
      include: [
        { model: Room, include: [RoomType] },
        { model: Guest }
      ],
      order: [["checkIn", "ASC"]]
    });

    // Today's departures (full list)
    const todayDepartures = await Booking.findAll({
      where: { checkOut: today, status: "checked_in" },
      include: [
        { model: Room, include: [RoomType] },
        { model: Guest }
      ],
      order: [["checkOut", "ASC"]]
    });

    const occupancyRate = totalRooms > 0 ? Math.round((currentlyOccupied / totalRooms) * 100) : 0;

    res.render("staff/dashboard", {
      title: "Staff Dashboard | RJM Beach Resort",
      staffName: req.session.userName,
      today,
      totalRooms,
      todayCheckIns,
      todayCheckOuts,
      currentlyOccupied,
      pendingCount,
      occupancyRate,
      recentBookings: recentBookings.map(b => b.toJSON()),
      todayArrivals: todayArrivals.map(b => b.toJSON()),
      todayDepartures: todayDepartures.map(b => b.toJSON())
    });
  } catch (err) {
    console.error("[staffDashboard]", err);
    res.status(500).send(err.message);
  }
}

// ── Staff Reservations ───────────────────────────────────────────────────────
export async function staffReservations(req, res) {
  try {
    // Get sort parameters from query
    const sortBy = req.query.sortBy || 'checkIn'; // default sort by checkIn
    const sortOrder = req.query.sortOrder || 'DESC'; // default descending
    
    // Map sort field names to database columns
    const sortFieldMap = {
      'id': 'id',
      'guestName': 'Guest.firstName', // Will sort by first name
      'checkIn': 'checkIn',
      'checkOut': 'checkOut'
    };
    
    // Get the actual sort field, default to checkIn if invalid
    const sortField = sortFieldMap[sortBy] || 'checkIn';
    
    // Validate sort order
    const validSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    const bookings = await Booking.findAll({
      order: [[sortField, validSortOrder]],
      include: [
        { model: Room, include: [RoomType] },
        { model: Guest }
      ]
    });

    const totalBookings  = bookings.length;
    const confirmedCount = bookings.filter(b => b.status === "confirmed").length;
    const pendingCount   = bookings.filter(b => b.status === "pending").length;
    const cancelledCount = bookings.filter(b => b.status === "cancelled").length;
    const completedCount = bookings.filter(b => ["checked_out", "early_checkout"].includes(b.status)).length;
    const checkedInCount = bookings.filter(b => b.status === "checked_in").length;

    res.render("staff/reservations", {
      title: "Reservations | Staff Panel",
      bookings: bookings.map(b => b.toJSON()),
      totalBookings,
      confirmedCount,
      pendingCount,
      cancelledCount,
      completedCount,
      checkedInCount,
      currentSort: { sortBy, sortOrder: validSortOrder }
    });
  } catch (err) {
    console.error("[staffReservations]", err);
    res.status(500).send(err.message);
  }
}

// ── Staff Guests ─────────────────────────────────────────────────────────────
export async function staffGuests(req, res) {
  try {
    const guests = await Guest.findAll({
      order: [["lastName", "ASC"]],
      include: [{ model: Booking, attributes: ["id", "checkIn", "checkOut", "status", "totalAmount"] }]
    });

    res.render("staff/guests", {
      title: "Guest Directory | Staff Panel",
      guests: guests.map(g => g.toJSON())
    });
  } catch (err) {
    console.error("[staffGuests]", err);
    res.status(500).send(err.message);
  }
}

// ── Walk-in Booking Form ─────────────────────────────────────────────────────
export async function staffBookingForm(req, res) {
  try {
    const allRoomTypes = await RoomType.findAll({
      where: {
        category: { [Op.in]: ["room", "cottage"] },
        isAvailable: true
      },
      raw: true
    });
    
    const rooms = allRoomTypes.filter(rt => rt.category === 'room');
    const cottages = allRoomTypes.filter(rt => rt.category === 'cottage');

    res.render("staff/booking-form", {
      title: "Walk-in Booking | Staff Panel",
      rooms,
      cottages
    });
  } catch (err) {
    console.error("[staffBookingForm]", err);
    res.status(500).send(err.message);
  }
}

// ── Room Status Overview ─────────────────────────────────────────────────────
export async function staffRoomStatus(req, res) {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const rooms = await Room.findAll({
      include: [{ model: RoomType }],
      order: [["roomNumber", "ASC"]]
    });

    // Get all active bookings to determine which rooms are occupied
    const activeBookings = await Booking.findAll({
      where: {
        status: { [Op.in]: ["confirmed", "checked_in"] },
        checkIn: { [Op.lte]: today },
        checkOut: { [Op.gt]: today }
      },
      include: [{ model: Guest }]
    });

    const occupiedRoomIds = new Set(activeBookings.map(b => b.roomId));
    const bookingByRoom = {};
    activeBookings.forEach(b => { bookingByRoom[b.roomId] = b; });

    const roomsWithStatus = rooms.map(r => {
      const rj = r.toJSON();
      rj.isOccupied = occupiedRoomIds.has(r.id);
      rj.currentBooking = bookingByRoom[r.id] || null;
      return rj;
    });

    const totalRooms    = rooms.length;
    const occupiedCount = occupiedRoomIds.size;
    const availableCount = totalRooms - occupiedCount;

    res.render("staff/room-status", {
      title: "Room Status | Staff Panel",
      rooms: roomsWithStatus,
      totalRooms,
      occupiedCount,
      availableCount,
      today
    });
  } catch (err) {
    console.error("[staffRoomStatus]", err);
    res.status(500).send(err.message);
  }
}

// ── Staff Reservation Calendar ───────────────────────────────────────────────
export async function staffReservationCalendar(req, res) {
  try {
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
    
    res.render("staff/reservation-calendar", {
      title: "Reservation Calendar | Staff Panel",
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
    console.error("[staffReservationCalendar]", err);
    res.status(500).send(err.message);
  }
}
