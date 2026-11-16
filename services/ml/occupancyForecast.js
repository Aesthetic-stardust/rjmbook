/*
  RJMBook — ML-Powered Resort Booking | Naruwan Resort
  Predictive analytics: occupancy forecasting using linear regression on historical snapshots.
*/
import { linearRegression, linearRegressionLine } from "simple-statistics";
import { OccupancySnapshot, Room, Booking } from "../../models/index.js";
import { Op } from "sequelize";

/**
 * Build occupancy history from snapshots. If none, derive from bookings.
 */
async function getOccupancyHistory(days = 90) {
  const snapshots = await OccupancySnapshot.findAll({
    where: { date: { [Op.gte]: new Date(Date.now() - days * 24 * 60 * 60 * 1000) } },
    order: [["date", "ASC"]],
    raw: true
  });

  if (snapshots.length >= 7) {
    return snapshots.map((s) => ({
      x: new Date(s.date).getTime(),
      y: parseFloat(s.occupancyRate) || 0
    }));
  }

  // Fallback: compute daily occupancy from bookings accounting for early checkouts
  const totalRooms = await Room.count();
  if (totalRooms === 0) return [];

  const points = [];
  for (let d = days - 1; d >= 0; d--) {
    const date = new Date();
    date.setDate(date.getDate() - d);
    const dateStr = date.toISOString().slice(0, 10);
    
    const bookings = await Booking.findAll({
      where: {
        status: { [Op.in]: ["confirmed", "checked_in", "checked_out"] },
        checkIn: { [Op.lte]: dateStr }
      },
      raw: true
    });
    
    let occupied = 0;
    for (let booking of bookings) {
      const effectiveCheckOut = booking.earlyCheckoutDate || booking.checkOut;
      if (effectiveCheckOut > dateStr) {
        occupied++;
      }
    }
    
    const rate = totalRooms ? (occupied / totalRooms) * 100 : 0;
    points.push({ x: date.getTime(), y: rate });
  }
  return points;
}

/**
 * Forecast occupancy rate for the next N days using linear regression.
 */
export async function forecastOccupancy(forwardDays = 14) {
  const history = await getOccupancyHistory(90);
  if (history.length < 7) {
    return {
      forecast: [],
      trend: "insufficient_data",
      message: "Add more occupancy data or bookings for accurate forecasting."
    };
  }

  const regression = linearRegression(history.map((p) => [p.x, p.y]));
  const line = linearRegressionLine(regression);

  const forecast = [];
  const lastDate = new Date(history[history.length - 1].x);
  for (let i = 1; i <= forwardDays; i++) {
    const d = new Date(lastDate);
    d.setDate(d.getDate() + i);
    const rate = Math.max(0, Math.min(100, line(d.getTime())));
    forecast.push({ date: d.toISOString().slice(0, 10), predictedOccupancyRate: Math.round(rate * 100) / 100 });
  }

  const trend = regression.m >= 0 ? "increasing" : "decreasing";
  return {
    forecast,
    trend,
    slope: regression.m,
    message: `Trend: ${trend}; next ${forwardDays} days forecast generated.`
  };
}

/**
 * Record a daily occupancy snapshot (call via cron or end-of-day job).
 */
export async function recordOccupancySnapshot(date = new Date()) {
  const dateStr = typeof date === "string" ? date : date.toISOString().slice(0, 10);
  const totalRooms = await Room.count();
  
  const bookings = await Booking.findAll({
    where: {
      status: { [Op.in]: ["confirmed", "checked_in", "checked_out"] },
      checkIn: { [Op.lte]: dateStr }
    },
    raw: true
  });
  
  let occupied = 0;
  for (let booking of bookings) {
    const effectiveCheckOut = booking.earlyCheckoutDate || booking.checkOut;
    if (effectiveCheckOut > dateStr) {
      occupied++;
    }
  }
  
  const occupancyRate = totalRooms ? (occupied / totalRooms) * 100 : 0;
  await OccupancySnapshot.upsert({
    date: dateStr,
    totalRooms,
    occupiedRooms: occupied,
    occupancyRate
  });
  return { date: dateStr, totalRooms, occupiedRooms: occupied, occupancyRate };
}
