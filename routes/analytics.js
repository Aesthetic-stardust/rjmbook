/*
  RJMBook — ML-Powered Resort Booking | Naruwan Resort
*/
import express from "express";
import { isAdmin } from "../middleware/auth.js";
import {
  dashboard,
  apiForecast,
  apiRecordSnapshot,
  apiRecommendRooms,
  apiRecommendServices
} from "../controllers/analyticsController.js";

const router = express.Router();
router.get("/", isAdmin, dashboard);
router.get("/api/forecast", isAdmin, apiForecast);
router.post("/api/snapshot", isAdmin, apiRecordSnapshot);
router.get("/api/recommendations/rooms", isAdmin, apiRecommendRooms);
router.get("/api/recommendations/services", isAdmin, apiRecommendServices);

export default router;
