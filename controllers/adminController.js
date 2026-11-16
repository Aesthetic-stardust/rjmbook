import { Booking, Room, RoomType, Guest, User, Feedback, PaymentSetting } from "../models/index.js";
import { Op, fn, col } from "sequelize";

export async function adminDashboard(req, res) {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const totalRooms = await Room.count();

    // All bookings with associations
    const allBookings = await Booking.findAll({
      include: [
        { model: Room, include: [RoomType] },
        { model: Guest }
      ]
    });

    // Active bookings (confirmed or checked_in)
    const activeBookings = allBookings.filter(b =>
      b.status === 'confirmed' || b.status === 'checked_in'
    ).length;

    // Pending approvals
    const pendingBookings = allBookings.filter(b => b.status === 'pending').length;

    // Currently checked in
    const checkedInCount = allBookings.filter(b => b.status === 'checked_in').length;

    // Occupancy rate (rooms occupied today)
    let occupancyRate = 0;
    if (totalRooms > 0) {
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      const bookedToday = allBookings.filter(b => {
        const ci = new Date(b.checkIn); ci.setHours(0,0,0,0);
        const co = new Date(b.earlyCheckoutDate || b.checkOut); co.setHours(0,0,0,0);
        return (b.status === 'confirmed' || b.status === 'checked_in') &&
               ci <= todayDate && todayDate < co;
      }).length;
      occupancyRate = Math.round((bookedToday / totalRooms) * 100);
    }

    const totalGuests = await Guest.count();

    // Today's arrivals (check-in = today, status confirmed or pending)
    const todayArrivals = allBookings
      .filter(b => b.checkIn === today && (b.status === 'confirmed' || b.status === 'pending'))
      .map(b => b.toJSON());

    // Today's departures (check-out = today, status checked_in)
    const todayDepartures = allBookings
      .filter(b => b.checkOut === today && b.status === 'checked_in')
      .map(b => b.toJSON());

    // Recent bookings (last 8)
    const recentBookings = [...allBookings]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 8)
      .map(b => b.toJSON());

    // Feedback summary
    const allFeedback = await Feedback.findAll();
    const totalFeedback    = allFeedback.length;
    const positiveFeedback = allFeedback.filter(f => f.sentiment === 'positive').length;
    const negativeFeedback = allFeedback.filter(f => f.sentiment === 'negative').length;
    const neutralFeedback  = allFeedback.filter(f => f.sentiment === 'neutral').length;

    // Average guest rating
    const ratings = allFeedback.filter(f => f.rating).map(f => f.rating);
    const avgRating = ratings.length > 0
      ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
      : null;

    res.render("admin/index", {
      title: "Admin Dashboard | RJMBook",
      today,
      totalRooms,
      activeBookings,
      pendingBookings,
      checkedInCount,
      occupancyRate,
      totalGuests,
      todayArrivals,
      todayDepartures,
      recentBookings,
      totalFeedback,
      positiveFeedback,
      negativeFeedback,
      neutralFeedback,
      avgRating
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.render("admin/index", {
      title: "Admin Dashboard | RJMBook",
      today: new Date().toISOString().slice(0, 10),
      totalRooms: 0, activeBookings: 0, pendingBookings: 0,
      checkedInCount: 0, occupancyRate: 0, totalGuests: 0,
      todayArrivals: [], todayDepartures: [], recentBookings: [],
      totalFeedback: 0, positiveFeedback: 0, negativeFeedback: 0,
      neutralFeedback: 0, avgRating: null
    });
  }
}

export async function adminReports(req, res) {
  res.render("admin/reports", { 
    title: "Generate Reports | RJMBook"
  });
}

export async function adminReservations(req, res) {
  try {
    const PAGE_SIZE = 15;

    // ── Sort params ──
    const sortBy    = req.query.sortBy    || 'checkIn';
    const sortOrder = req.query.sortOrder || 'DESC';
    const sortFieldMap = { id: 'id', guestName: 'Guest.firstName', checkIn: 'checkIn', checkOut: 'checkOut' };
    const sortField    = sortFieldMap[sortBy] || 'checkIn';
    const validSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // ── Year / month filter params ──
    const now          = new Date();
    const filterYear   = parseInt(req.query.year)  || null;
    const filterMonth  = parseInt(req.query.month) || null;  // 1-based (1 = Jan)
    const activeTab    = req.query.tab || 'active'; // active | cancelled | archive

    // ── Page params (per-tab) ──
    const activePage    = Math.max(1, parseInt(req.query.activePage)    || 1);
    const cancelledPage = Math.max(1, parseInt(req.query.cancelledPage) || 1);
    const archivePage   = Math.max(1, parseInt(req.query.archivePage)   || 1);

    // ── Build date-range WHERE clause ──
    function buildDateWhere() {
      if (!filterYear && !filterMonth) return {};
      if (filterYear && filterMonth) {
        const start = new Date(filterYear, filterMonth - 1, 1);
        const end   = new Date(filterYear, filterMonth, 0, 23, 59, 59); // last day of month
        return { checkIn: { [Op.between]: [start, end] } };
      }
      if (filterYear) {
        const start = new Date(filterYear, 0, 1);
        const end   = new Date(filterYear, 11, 31, 23, 59, 59);
        return { checkIn: { [Op.between]: [start, end] } };
      }
      // month without year → current year
      const year  = now.getFullYear();
      const start = new Date(year, filterMonth - 1, 1);
      const end   = new Date(year, filterMonth, 0, 23, 59, 59);
      return { checkIn: { [Op.between]: [start, end] } };
    }
    const dateWhere = buildDateWhere();

    // ── Active bookings with pagination ──
    const activeWhere = { status: { [Op.in]: ['pending', 'confirmed', 'checked_in'] }, ...dateWhere };
    const { count: activeTotal, rows: activeRows } = await Booking.findAndCountAll({
      where: activeWhere,
      order: [[sortField, validSortOrder]],
      limit: PAGE_SIZE,
      offset: (activePage - 1) * PAGE_SIZE,
      include: [{ model: Room, include: [RoomType] }, { model: Guest }],
      distinct: true
    });

    // ── Cancelled bookings with pagination ──
    const cancelledWhere = { status: 'cancelled', ...dateWhere };
    const { count: cancelledTotal, rows: cancelledRows } = await Booking.findAndCountAll({
      where: cancelledWhere,
      order: [['updatedAt', 'DESC']],
      limit: PAGE_SIZE,
      offset: (cancelledPage - 1) * PAGE_SIZE,
      include: [{ model: Room, include: [RoomType] }, { model: Guest }],
      distinct: true
    });

    // ── Archive (checked_out) bookings with pagination ──
    const archiveWhere = { status: 'checked_out', ...dateWhere };
    const { count: archiveTotal, rows: archiveRows } = await Booking.findAndCountAll({
      where: archiveWhere,
      order: [['checkOut', 'DESC']],
      limit: PAGE_SIZE,
      offset: (archivePage - 1) * PAGE_SIZE,
      include: [{ model: Room, include: [RoomType] }, { model: Guest }],
      distinct: true
    });

    const plainBookings      = activeRows.map(b => b.toJSON());
    const completedBookings  = archiveRows.map(b => b.toJSON());
    const cancelledBookings  = cancelledRows.map(b => b.toJSON());

    // ── Counts for stat cards (unfiltered totals) ──
    const confirmedCount = plainBookings.filter(b => b.status === 'confirmed').length;
    const pendingCount   = plainBookings.filter(b => b.status === 'pending').length;

    // ── Pagination helpers ──
    function makePagination(total, currentPage) {
      const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
      return {
        total,
        page:       currentPage,
        totalPages,
        hasPrev:    currentPage > 1,
        hasNext:    currentPage < totalPages,
        prevPage:   currentPage - 1,
        nextPage:   currentPage + 1,
        pages: Array.from({ length: totalPages }, (_, i) => ({
          num:     i + 1,
          isCurrent: i + 1 === currentPage
        }))
      };
    }

    // ── Available years for the year-filter dropdown ──
    const [minRow] = await Booking.findAll({ attributes: [[fn('MIN', col('checkIn')), 'minDate']], raw: true });
    const minYear  = minRow && minRow.minDate ? new Date(minRow.minDate).getFullYear() : now.getFullYear();
    const years    = Array.from({ length: now.getFullYear() - minYear + 1 }, (_, i) => minYear + i).reverse();

    res.render("admin/reservations", {
      title: "Reservations Management | RJMBook",
      bookings:          plainBookings,
      completedBookings,
      cancelledBookings,
      // stat card totals (full counts, not page-sliced)
      totalBookings:   activeTotal,
      confirmedCount,
      pendingCount,
      cancelledCount:  cancelledTotal,
      completedCount:  archiveTotal,
      // pagination objects
      activePagination:    makePagination(activeTotal,    activePage),
      cancelledPagination: makePagination(cancelledTotal, cancelledPage),
      archivePagination:   makePagination(archiveTotal,   archivePage),
      // filter state
      filterYear:  filterYear  || '',
      filterMonth: filterMonth || '',
      activeTab,
      years,
      currentSort: { sortBy, sortOrder: validSortOrder }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
}

export async function adminFeedback(req, res) {
  try {
    const feedbacks = await Feedback.findAll({
      order: [["createdAt", "DESC"]],
      include: [
        { model: Booking },
        { model: Guest }
      ]
    });

    // Calculate counts by status
    const totalFeedback = feedbacks.length;
    const pendingCount = feedbacks.filter(f => f.status === 'pending').length;
    const approvedCount = feedbacks.filter(f => f.status === 'approved').length;
    const rejectedCount = feedbacks.filter(f => f.status === 'rejected').length;

    // Calculate sentiment counts
    const positiveCount = feedbacks.filter(f => f.sentiment === 'positive').length;
    const negativeCount = feedbacks.filter(f => f.sentiment === 'negative').length;
    const neutralCount = feedbacks.filter(f => f.sentiment === 'neutral').length;

    res.render("admin/feedback", { 
      title: "Guest Feedback & Sentiment Analysis | RJMBook",
      feedbacks: feedbacks.map(f => f.toJSON()),
      totalFeedback,
      pendingCount,
      approvedCount,
      rejectedCount,
      positiveCount,
      negativeCount,
      neutralCount
    });
  } catch (err) {
    console.error("Feedback error:", err);
    res.render("admin/feedback", { 
      title: "Guest Feedback & Sentiment Analysis | RJMBook",
      feedbacks: [],
      totalFeedback: 0,
      pendingCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
      positiveCount: 0,
      negativeCount: 0,
      neutralCount: 0
    });
  }
}

export async function adminRoomAvailability(req, res) {
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

    res.render("admin/room-availability", {
      title: "Room Availability | Admin Panel",
      rooms: roomsWithStatus,
      totalRooms,
      occupiedCount,
      availableCount,
      today
    });
  } catch (err) {
    console.error("[adminRoomAvailability]", err);
    res.status(500).send(err.message);
  }
}

// ── Payment Settings ──────────────────────────────────────────────────────────

export async function getPaymentSettings(req, res) {
  try {
    // Always use row id=1 — create it with defaults if missing
    const [setting] = await PaymentSetting.findOrCreate({
      where: { id: 1 },
      defaults: { downPaymentPercent: 100 }
    });
    res.render("admin/payment-settings", {
      title: "Payment Settings | RJMBook",
      setting: setting.toJSON(),
      saved: req.query.saved === "1"
    });
  } catch (err) {
    console.error("[getPaymentSettings]", err);
    res.status(500).send(err.message);
  }
}

export async function updatePaymentSettings(req, res) {
  try {
    const pct = parseInt(req.body.downPaymentPercent, 10);
    if (![0, 50, 100].includes(pct)) {
      return res.status(400).send("Invalid percentage. Must be 0, 50, or 100.");
    }
    await PaymentSetting.update(
      { downPaymentPercent: pct },
      { where: { id: 1 } }
    );
    res.redirect("/admin/payment-settings?saved=1");
  } catch (err) {
    console.error("[updatePaymentSettings]", err);
    res.status(500).send(err.message);
  }
}
