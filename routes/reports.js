/*
  RJMBook Report Routes
  API endpoints for generating PDF reports
*/

import express from "express";
import * as reportController from "../controllers/reportController.js";
import { isAdmin } from "../middleware/auth.js";

const router = express.Router();

// All reports require admin authentication
router.use(isAdmin);

/**
 * Booking Report
 * GET /api/reports/booking?startDate=2026-01-01&endDate=2026-12-31
 */
router.get("/booking", reportController.generateBookingReport);

/**
 * Guest Report
 * GET /api/reports/guest?startDate=2026-01-01&endDate=2026-12-31
 */
router.get("/guest", reportController.generateGuestReport);

/**
 * Revenue Report
 * GET /api/reports/revenue?startDate=2026-01-01&endDate=2026-12-31
 */
router.get("/revenue", reportController.generateRevenueReport);

/**
 * Occupancy Report
 * GET /api/reports/occupancy?startDate=2026-01-01&endDate=2026-12-31
 */
router.get("/occupancy", reportController.generateOccupancyReport);

export default router;
