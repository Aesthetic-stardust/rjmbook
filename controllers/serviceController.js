/*
  RJMBook — ML-Powered Resort Booking | Naruwan Resort
*/
import { Service } from "../models/index.js";
import { getServiceRecommendations } from "../services/ml/recommendationEngine.js";

export async function listServices(req, res) {
  try {
    const guestId = req.query.guestId ? parseInt(req.query.guestId, 10) : null;
    const recommended = await getServiceRecommendations(guestId, 6);
    const all = await Service.findAll({ order: [["category", "ASC"], ["name", "ASC"]] });
    res.render("services/list", {
      title: "Resort Services | RJM Beach Resort",
      services: all,
      recommendedIds: recommended.map((s) => s.id)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function apiServices(req, res) {
  try {
    const services = await Service.findAll();
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
