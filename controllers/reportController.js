/*
  RJMBook Report Controller
  Handles PDF report generation API endpoints
*/

import { reportService } from "../services/reportService.js";

/**
 * GET /api/reports/booking
 * Generate booking report PDF
 */
export async function generateBookingReport(req, res) {
  try {
    const { startDate, endDate } = req.query;
    const result = await reportService.generateBookingReport(startDate, endDate);

    if (result.success) {
      return res.json({
        success: true,
        message: "Booking Report generated successfully",
        data: result
      });
    } else {
      return res.status(500).json({
        success: false,
        error: "Failed to generate report",
        message: result.error
      });
    }
  } catch (error) {
    console.error("Booking report error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate booking report",
      message: error.message
    });
  }
}

/**
 * GET /api/reports/guest
 * Generate guest report PDF
 */
export async function generateGuestReport(req, res) {
  try {
    const { startDate, endDate } = req.query;
    const result = await reportService.generateGuestReport(startDate, endDate);

    if (result.success) {
      return res.json({
        success: true,
        message: "Guest Report generated successfully",
        data: result
      });
    } else {
      return res.status(500).json({
        success: false,
        error: "Failed to generate report",
        message: result.error
      });
    }
  } catch (error) {
    console.error("Guest report error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate guest report",
      message: error.message
    });
  }
}

/**
 * GET /api/reports/revenue
 * Generate revenue report PDF
 */
export async function generateRevenueReport(req, res) {
  try {
    const { startDate, endDate } = req.query;
    const result = await reportService.generateRevenueReport(startDate, endDate);

    if (result.success) {
      return res.json({
        success: true,
        message: "Revenue Report generated successfully",
        data: result
      });
    } else {
      return res.status(500).json({
        success: false,
        error: "Failed to generate report",
        message: result.error
      });
    }
  } catch (error) {
    console.error("Revenue report error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate revenue report",
      message: error.message
    });
  }
}

/**
 * GET /api/reports/occupancy
 * Generate occupancy report PDF
 */
export async function generateOccupancyReport(req, res) {
  try {
    const { startDate, endDate } = req.query;
    const result = await reportService.generateOccupancyReport(startDate, endDate);

    if (result.success) {
      return res.json({
        success: true,
        message: "Occupancy Report generated successfully",
        data: result
      });
    } else {
      return res.status(500).json({
        success: false,
        error: "Failed to generate report",
        message: result.error
      });
    }
  } catch (error) {
    console.error("Occupancy report error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate occupancy report",
      message: error.message
    });
  }
}
