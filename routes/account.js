/*
  RJMBook — Account Routes
  Profile editing and password change for all authenticated roles.
*/
import express from "express";
import { isAdminOrGuest } from "../middleware/auth.js";
import { accountPage, updateProfile, changePassword } from "../controllers/accountController.js";

const router = express.Router();

router.get("/",         isAdminOrGuest, accountPage);
router.post("/profile", isAdminOrGuest, updateProfile);
router.post("/password", isAdminOrGuest, changePassword);

export default router;
