/*
  RJMBook — ML-Powered Resort Booking | Naruwan Resort
*/
import express from "express";
import { isAuthenticated } from "../middleware/auth.js";
import { listServices, apiServices } from "../controllers/serviceController.js";

const router = express.Router();
router.get("/", isAuthenticated, listServices);
router.get("/api", isAuthenticated, apiServices);

export default router;
