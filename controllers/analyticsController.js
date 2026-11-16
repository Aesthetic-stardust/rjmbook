/*
  RJMBook — ML-Powered Resort Booking | Naruwan Resort
  Data-driven dashboard: occupancy forecast and KPIs.
*/
import { Booking, Room, OccupancySnapshot, RoomType, Service, ServiceBooking } from "../models/index.js";
import { forecastOccupancy, recordOccupancySnapshot } from "../services/ml/occupancyForecast.js";
import { getRoomRecommendations, getServiceRecommendations } from "../services/ml/recommendationEngine.js";
import { Op, Sequelize } from "sequelize";

export async function dashboard(req, res) {
  try {
    // Get filter parameters
    const rangeParam = req.query.range || "14";
    const range = rangeParam === "all" ? "all" : parseInt(rangeParam) || 14;
    const roomTypeFilter = req.query.roomType || "";
    const statusFilter   = req.query.status   || "";

    // Calculate date range for status counts
    const endDate   = new Date();
    const startDate = new Date();
    if (range !== "all") {
      startDate.setDate(startDate.getDate() - range);
    } else {
      startDate.setFullYear(2000); // effectively "all time"
    }

    // Get all room types for filter dropdown
    const roomTypes  = await RoomType.findAll();
    const totalRooms = await Room.count();
    const today      = new Date().toISOString().slice(0, 10);

    // ── Occupancy today ──
    // Count rooms that have an active booking: checkIn <= today < effectiveCheckOut
    const occupiedBookings = await Booking.findAll({
      where: {
        status: { [Op.in]: ["confirmed", "checked_in"] },
        checkIn: { [Op.lte]: today },
        checkOut: { [Op.gt]: today }
      },
      raw: true
    });

    // Also include checked_out bookings that had an early checkout after today
    const earlyCheckoutActive = await Booking.findAll({
      where: {
        status: "checked_out",
        checkIn: { [Op.lte]: today },
        earlyCheckoutDate: { [Op.gt]: today }
      },
      raw: true
    });

    const occupiedToday  = occupiedBookings.length + earlyCheckoutActive.length;
    const occupancyRate  = totalRooms ? Math.round((occupiedToday / totalRooms) * 10000) / 100 : 0;

    // ── Booking status counts (filtered by date range) ──
    const bookingWhere = {
      createdAt: { [Op.gte]: startDate, [Op.lte]: endDate }
    };

    const [
      pendingBookings,
      confirmedBookings,
      checkedInBookings,
      checkedOutBookings,
      cancelledBookings
    ] = await Promise.all([
      Booking.count({ where: { ...bookingWhere, status: "pending"     } }),
      Booking.count({ where: { ...bookingWhere, status: "confirmed"   } }),
      Booking.count({ where: { ...bookingWhere, status: "checked_in"  } }),
      Booking.count({ where: { ...bookingWhere, status: "checked_out" } }),
      Booking.count({ where: { ...bookingWhere, status: "cancelled"   } }),
    ]);

    // If the date-filtered window returns all zeros, fall back to all-time counts
    // so the charts always have something meaningful to show
    const totalFiltered = pendingBookings + confirmedBookings + checkedInBookings + checkedOutBookings + cancelledBookings;
    let displayPending, displayConfirmed, displayCheckedIn, displayCheckedOut, displayCancelled;

    if (totalFiltered === 0) {
      [displayPending, displayConfirmed, displayCheckedIn, displayCheckedOut, displayCancelled] = await Promise.all([
        Booking.count({ where: { status: "pending"     } }),
        Booking.count({ where: { status: "confirmed"   } }),
        Booking.count({ where: { status: "checked_in"  } }),
        Booking.count({ where: { status: "checked_out" } }),
        Booking.count({ where: { status: "cancelled"   } }),
      ]);
    } else {
      displayPending    = pendingBookings;
      displayConfirmed  = confirmedBookings;
      displayCheckedIn  = checkedInBookings;
      displayCheckedOut = checkedOutBookings;
      displayCancelled  = cancelledBookings;
    }

    // ── Occupancy Forecast ──
    // Auto-seed OccupancySnapshot from booking history if the table is empty
    const snapshotCount = await OccupancySnapshot.count();
    if (snapshotCount === 0) {
      // Backfill the last 30 days of snapshots from booking data
      for (let d = 29; d >= 0; d--) {
        const snapDate = new Date();
        snapDate.setDate(snapDate.getDate() - d);
        try { await recordOccupancySnapshot(snapDate); } catch (_) { /* ignore */ }
      }
    }

    let forecastResult = { forecast: [], trend: "insufficient_data", message: "" };
    try {
      forecastResult = await forecastOccupancy(14);
    } catch (e) {
      forecastResult.message = e.message;
    }

    // ── Room Type Performance ──
    // Query actual booking counts per room type (last 180 days)
    const since180 = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const allRoomTypes = await RoomType.findAll({ raw: true });
    const roomTypePerf = [];
    const cottageTypePerf = [];

    for (const rt of allRoomTypes) {
      const roomIds = (await Room.findAll({ where: { roomTypeId: rt.id }, attributes: ["id"], raw: true })).map(r => r.id);
      const bookingCount = roomIds.length
        ? await Booking.count({
            where: {
              roomId: { [Op.in]: roomIds },
              status: { [Op.not]: "cancelled" },
              checkIn: { [Op.gte]: since180 }
            }
          })
        : 0;
      if (bookingCount > 0) {
        // Separate rooms and cottages based on category
        if (rt.category === "cottage") {
          cottageTypePerf.push({ id: rt.id, name: rt.name, bookingCount });
        } else {
          roomTypePerf.push({ id: rt.id, name: rt.name, bookingCount });
        }
      }
    }
    roomTypePerf.sort((a, b) => b.bookingCount - a.bookingCount);
    cottageTypePerf.sort((a, b) => b.bookingCount - a.bookingCount);
    const topRoomRecommendations = roomTypePerf.slice(0, 8);
    const topCottageRecommendations = cottageTypePerf.slice(0, 8);

    // Service recommendations (keep as-is, not shown in charts)
    const topServiceRecommendations = await getServiceRecommendations(null, 5);

    res.render("analytics/dashboard", {
      title: "Dashboard | RJMBook",
      totalRooms,
      occupiedToday,
      occupancyRate,
      pendingBookings:    displayPending,
      confirmedBookings:  displayConfirmed,
      checkedInBookings:  displayCheckedIn,
      checkedOutBookings: displayCheckedOut,
      cancelledBookings:  displayCancelled,
      forecast:           forecastResult.forecast,
      trend:              forecastResult.trend,
      forecastMessage:    forecastResult.message,
      topRoomRecommendations,
      topCottageRecommendations,
      topServiceRecommendations,
      roomTypes,
      selectedRange:      rangeParam
    });
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
}

export async function apiForecast(req, res) {
  try {
    const days = parseInt(req.query.days, 10) || 14;
    const result = await forecastOccupancy(days);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function apiRecordSnapshot(req, res) {
  try {
    const result = await recordOccupancySnapshot();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function apiRecommendRooms(req, res) {
  try {
    const guestId = req.query.guestId ? parseInt(req.query.guestId, 10) : null;
    const limit = parseInt(req.query.limit, 10) || 6;
    const rooms = await getRoomRecommendations(guestId, limit);
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function apiRecommendServices(req, res) {
  try {
    const guestId = req.query.guestId ? parseInt(req.query.guestId, 10) : null;
    const limit = parseInt(req.query.limit, 10) || 6;
    const services = await getServiceRecommendations(guestId, limit);
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
