/*
  RJMBook — ML-Powered Resort Booking | Naruwan Resort
  Personalized recommendations: room types and services based on guest history and popularity.
*/
import { Booking, RoomType, Service, Room, Guest } from "../../models/index.js";
import { Op } from "sequelize";

/**
 * Get personalized room type recommendations for a guest (or anonymous).
 * Uses: past bookings, similar guests' preferences, and popularity.
 */
export async function getRoomRecommendations(guestId = null, limit = 5) {
  const roomTypes = await RoomType.findAll();
  if (!roomTypes.length) return [];

  const scores = [];

  for (const rt of roomTypes) {
    let score = 0;
    const price = parseFloat(rt.basePricePerNight) || 0;

    const roomIds = (await Room.findAll({ where: { roomTypeId: rt.id }, attributes: ["id"] })).map((r) => r.id);
    const recentBookings = roomIds.length
      ? await Booking.count({
          where: {
            roomId: { [Op.in]: roomIds },
            status: { [Op.not]: "cancelled" },
            checkIn: { [Op.gte]: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) }
          }
        })
      : 0;
    score += Math.min(recentBookings * 2, 20);

    if (guestId && roomIds.length) {
      const guestBookings = await Booking.count({
        where: { guestId, roomId: { [Op.in]: roomIds } }
      });
      score += guestBookings * 15;
    }

    // Slight preference for mid-range price (assume 3000–8000 is "sweet spot")
    if (price >= 3000 && price <= 8000) score += 5;

    scores.push({ roomType: rt, score });
  }

  scores.sort((a, b) => b.score - a.score);
  return scores.slice(0, limit).map((s) => s.roomType);
}

/**
 * Get personalized service recommendations (e.g. spa, tours) for a guest or by popularity.
 */
export async function getServiceRecommendations(guestId = null, limit = 5) {
  const services = await Service.findAll();
  if (!services.length) return [];

  const scores = [];

  const { ServiceBooking } = await import("../../models/index.js");
  for (const svc of services) {
    const count = await ServiceBooking.count({ where: { serviceId: svc.id } });
    const score = Math.min(count * 3, 25);
    scores.push({ service: svc, score });
  }

  scores.sort((a, b) => b.score - a.score);
  return scores.slice(0, limit).map((s) => s.service);
}
