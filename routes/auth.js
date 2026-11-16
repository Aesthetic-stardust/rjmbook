import express from "express";
import { 
  simpleLoginPage,
  simpleLogin,
  registerPage,
  register,
  logout
} from "../controllers/authController.js";

const router = express.Router();

// Simple unified login page and handler
router.get("/", simpleLoginPage);
router.post("/", simpleLogin);

// Register page and handler
router.get("/register", registerPage);
router.post("/register", register);

// Logout handler
router.get("/logout", logout);

export default router;
