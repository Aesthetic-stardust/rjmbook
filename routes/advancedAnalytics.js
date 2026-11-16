/*
  RJMBook Advanced Analytics Routes
  ML-powered API endpoints for business intelligence
*/

import express from "express";
import { isAdmin } from "../middleware/auth.js";
import {
  occupancyForecast,
  revenueForecast,
  guestBehavior,
  optimizations,
  anomalies,
  customerSegments,
  analyticsDashboard,
  systemHealth,
  kpis
} from "../controllers/advancedAnalyticsController.js";

const router = express.Router();

// All advanced analytics endpoints are admin-only — sensitive business data
router.use(isAdmin);

router.get("/occupancy-forecast", occupancyForecast);
router.get("/revenue-forecast", revenueForecast);
router.get("/guest-behavior", guestBehavior);
router.get("/customer-segments", customerSegments);
router.get("/anomalies", anomalies);
router.get("/optimizations", optimizations);
router.get("/dashboard", analyticsDashboard);
router.get("/system-health", systemHealth);
router.get("/kpis", kpis);

export default router;
