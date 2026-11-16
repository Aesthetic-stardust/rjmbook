/*
  RJMBook — ML-Powered Resort Booking | Naruwan Resort
*/
import express from "express";
import { isAuthenticated } from "../middleware/auth.js";
import { createGuest, findOrCreateGuest, listGuests } from "../controllers/guestController.js";

const router = express.Router();
router.get("/", isAuthenticated, listGuests);
router.post("/", isAuthenticated, createGuest);
router.post("/find-or-create", isAuthenticated, findOrCreateGuest);

export default router;
