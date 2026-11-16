/*
  RJMBook — ML-Powered Resort Booking | Naruwan Resort
*/
import { Guest, Booking } from "../models/index.js";

export async function createGuest(req, res) {
  try {
    const { firstName, lastName, email, phone } = req.body;
    if (!firstName || !lastName || !email) {
      return res.status(400).json({ error: "First name, last name, and email are required" });
    }
    const guest = await Guest.create({ firstName, lastName, email, phone: phone || null });
    res.status(201).json(guest);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function findOrCreateGuest(req, res) {
  try {
    const { email, firstName, lastName, phone } = req.body;
    let guest = await Guest.findOne({ where: { email } });
    if (!guest && firstName && lastName) {
      guest = await Guest.create({ firstName, lastName, email, phone: phone || null });
    }
    if (!guest) return res.status(404).json({ error: "Guest not found" });
    res.json(guest);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function listGuests(req, res) {
  try {
    const guests = await Guest.findAll({
      order: [["lastName", "ASC"]],
      include: [{ model: Booking, attributes: ["id", "checkIn", "checkOut", "status"] }]
    });
    res.render("guests/list", { title: "Guests | RJMBook", guests: guests.map(g => g.toJSON()) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
