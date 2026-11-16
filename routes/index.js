/*
  RJMBook — ML-Powered Resort Booking | Naruwan Resort
  XianFire Framework — Mindoro State University
*/
import express from "express";
import { homePage } from "../controllers/homeController.js";
import { logout, simpleLoginPage, simpleLogin, registerPage, register, googleCallback } from "../controllers/authController.js";
import bookings from "./bookings.js";
import rooms, { cottagesRouter } from "./rooms.js";
import guests from "./guests.js";
import analytics from "./analytics.js";
import advancedAnalytics from "./advancedAnalytics.js";
import admin from "./admin.js";
import staff from "./staff.js";
import auth from "./auth.js";
import chatbot from "./chatbot.js";
import reports from "./reports.js";
import feedback from "./feedback.js";
import account from "./account.js";
import passport from "../config/passport.js";
// import chats from "./chats.js";

const router = express.Router();

// Direct auth routes for convenience
router.get("/login", simpleLoginPage);
router.post("/login", simpleLogin);
router.get("/register", registerPage);
router.post("/register", register);

// ── Google OAuth ──
router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
router.get(
  "/auth/google/callback",
  (req, res, next) => {
    passport.authenticate("google", { session: false }, async (err, user, info) => {
      if (err) {
        console.error("❌ Passport error:", err);
        return res.redirect("/login?error=oauth_failed");
      }
      if (!user) {
        console.error("❌ No user from Google:", info);
        return res.redirect("/login?error=google_failed");
      }

      // Write directly to the existing session (no regenerate — not supported well by connect-session-sequelize)
      req.session.userId    = user.id;
      req.session.userEmail = user.email;
      req.session.userName  = user.name;
      req.session.role      = user.role;

      req.session.save((saveErr) => {
        if (saveErr) {
          console.error("❌ Session save error:", saveErr);
          return res.redirect("/login?error=oauth_failed");
        }
        const redirect = user.role === "admin" ? "/admin" : user.role === "staff" ? "/staff" : "/";
        res.redirect(redirect);
      });
    })(req, res, next);
  }
);

// Logout route
router.get("/logout", logout);

router.get("/", homePage);
router.use("/auth", auth);
router.use("/admin", admin);
router.use("/staff", staff);
router.use("/bookings", bookings);
router.use("/rooms", rooms);
router.use("/cottages", cottagesRouter());
router.use("/guests", guests);
router.use("/dashboard", analytics);
router.use("/api/advanced-analytics", advancedAnalytics);
router.use("/api/reports", reports);
router.use("/api/chatbot", chatbot);
router.use("/api/feedback", feedback);
router.use("/account", account);
// router.use("/chats", chats);

export default router;
