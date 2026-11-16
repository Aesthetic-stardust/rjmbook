
    /*
    MIT License
    
    Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
    Mindoro State University - Philippines

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
    */
import { Feedback, Guest } from "../models/index.js";

// Avatar gradient palettes cycled per guest
const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#0d9488,#0891b2)",
  "linear-gradient(135deg,#7c3aed,#a855f7)",
  "linear-gradient(135deg,#ea580c,#f97316)",
  "linear-gradient(135deg,#0369a1,#38bdf8)",
  "linear-gradient(135deg,#be185d,#f472b6)",
  "linear-gradient(135deg,#15803d,#4ade80)",
];

/**
 * Build star arrays for Handlebars (which can't do math in templates).
 * Returns { fullStars: [{},{},…], emptyStars: [{},{},…], hasHalf: bool }
 */
function buildStars(rating) {
  const full  = Math.floor(rating);
  const half  = rating - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return {
    fullStars:  Array(full).fill({}),
    hasHalf:    half,
    emptyStars: Array(empty).fill({}),
  };
}

async function fetchTestimonials() {
  const rows = await Feedback.findAll({
    where:   { status: "approved", sentiment: "positive" },
    order:   [["createdAt", "DESC"]],
    limit:   6,
    include: [{ model: Guest, attributes: ["firstName", "lastName"] }],
  });

  // Compute overall average from ALL approved feedback
  const allApproved = await Feedback.findAll({ where: { status: "approved" } });
  const avgRating = allApproved.length
    ? (allApproved.reduce((s, f) => s + f.rating, 0) / allApproved.length).toFixed(1)
    : null;

  const testimonials = rows.map((f, idx) => {
    const first = f.Guest?.firstName || "Guest";
    const last  = f.Guest?.lastName  || "";
    const initials = (first[0] + (last[0] || "")).toUpperCase();
    const displayName = last ? `${first} ${last[0]}.` : first;

    return {
      initials,
      displayName,
      avatarGradient: AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length],
      comment: f.comment,
      rating:  f.rating,
      ...buildStars(f.rating),
    };
  });

  // Build overall star display
  const overallStars = avgRating ? buildStars(parseFloat(avgRating)) : null;

  return { testimonials, avgRating, overallStars, totalReviews: allApproved.length };
}

export const homePage = async (req, res) => {
  // Admins and staff should not be on the public landing page with an active session.
  // Destroy the session and clear res.locals so the nav renders as a public visitor.
  if (req.session && req.session.userId && (req.session.role === 'admin' || req.session.role === 'staff')) {
    req.session.destroy(async (err) => {
      if (err) console.error('Session destroy error on home:', err);
      res.clearCookie('connect.sid');

      // Clear session-related locals so the nav shows public state
      res.locals.sessionUserId   = null;
      res.locals.sessionUserName = null;
      res.locals.sessionRole     = null;
      res.locals.hasBookingUpdates = false;

      let testimonialData = { testimonials: [], avgRating: null, overallStars: null, totalReviews: 0 };
      try { testimonialData = await fetchTestimonials(); } catch (_) {}

      res.render("home", { title: "RJM Beach Resort | RJMBook", ...testimonialData });
    });
    return;
  }

  let testimonialData = { testimonials: [], avgRating: null, overallStars: null, totalReviews: 0 };
  try {
    testimonialData = await fetchTestimonials();
  } catch (err) {
    console.error("Error fetching testimonials for home page:", err.message);
  }

  res.render("home", {
    title: "RJM Beach Resort | RJMBook",
    ...testimonialData,
  });
};
